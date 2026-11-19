import { useEffect, useState } from "react";

export type OfflineMutationKind =
  | "save_user_settings"
  | "save_mood_checkin"
  | "save_toolkit_completion"
  | "save_conversation"
  | "save_journal_entry"
  | "upsert_globe_node";

export interface QueuedOfflineMutation {
  id: string;
  uid: string;
  kind: OfflineMutationKind;
  payload: unknown;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export interface OfflineSyncState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncError: string | null;
}

type FlushHandler = (mutation: QueuedOfflineMutation) => Promise<void>;

const STORAGE_PREFIX = "ony_offline_queue_v1_";
const listeners = new Set<() => void>();
let activeUid: string | null = null;
let registeredHandler: FlushHandler | null = null;
let flushing = false;
let lastSyncError: string | null = null;

function getStorageKey(uid: string): string {
  return `${STORAGE_PREFIX}${uid}`;
}

function readQueue(uid: string): QueuedOfflineMutation[] {
  if (typeof window === "undefined" || !uid) return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(uid: string, items: QueuedOfflineMutation[]): void {
  if (typeof window === "undefined" || !uid) return;
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(getStorageKey(uid));
    } else {
      window.localStorage.setItem(getStorageKey(uid), JSON.stringify(items));
    }
  } catch {
    // Ignore quota errors cleanly
  }
}

function notify(): void {
  listeners.forEach((cb) => cb());
}

export function setOfflineQueueFlushHandler(handler: FlushHandler | null): void {
  registeredHandler = handler;
}

export function setOfflineQueueActiveUid(uid: string | null): void {
  activeUid = uid;
  notify();
  if (uid && typeof navigator !== "undefined" && navigator.onLine) {
    void flushOfflineQueue(uid);
  }
}

export function clearOfflineQueue(uid?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (uid) {
      window.localStorage.removeItem(getStorageKey(uid));
    } else {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    }
  } catch {
    // Ignore storage cleanup errors
  }
  lastSyncError = null;
  notify();
}

export function enqueueOfflineMutation(
  uid: string,
  kind: OfflineMutationKind,
  payload: unknown,
): void {
  if (!uid) return;
  const current = readQueue(uid);
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const next = [
    ...current,
    {
      id,
      uid,
      kind,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
    },
  ].slice(-100);

  writeQueue(uid, next);
  notify();
}

export function getPendingOfflineCount(uid: string | null): number {
  if (!uid) return 0;
  return readQueue(uid).length;
}

export async function flushOfflineQueue(uid?: string | null): Promise<{ flushed: number; remaining: number }> {
  const targetUid = uid ?? activeUid;
  if (!targetUid || !registeredHandler || flushing) {
    return { flushed: 0, remaining: getPendingOfflineCount(targetUid) };
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { flushed: 0, remaining: getPendingOfflineCount(targetUid) };
  }

  const queue = readQueue(targetUid);
  if (queue.length === 0) {
    lastSyncError = null;
    notify();
    return { flushed: 0, remaining: 0 };
  }

  flushing = true;
  lastSyncError = null;
  notify();

  let flushed = 0;
  const remaining: QueuedOfflineMutation[] = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      await registeredHandler(item);
      flushed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      const errCode = (err as { code?: string })?.code || "";
      const isPermissionDenied =
        errCode === "permission-denied" || msg.includes("Missing or insufficient permissions");
      lastSyncError = msg;
      if (isPermissionDenied) {
        // Non-transient Firestore rules denial: drop rather than looping indefinitely
        continue;
      }
      remaining.push({
        ...item,
        attempts: (item.attempts || 0) + 1,
        lastError: msg,
      });
      // Keep remaining queued items in order
      for (let j = i + 1; j < queue.length; j++) {
        remaining.push(queue[j]);
      }
      break;
    }
  }

  writeQueue(targetUid, remaining);
  flushing = false;
  notify();
  return { flushed, remaining: remaining.length };
}

export function useOfflineSyncStatus(uid: string | null): OfflineSyncState & { retrySync: () => Promise<void> } {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState<number>(() => getPendingOfflineCount(uid));
  const [isSyncing, setIsSyncing] = useState<boolean>(flushing);
  const [syncError, setSyncError] = useState<string | null>(lastSyncError);

  useEffect(() => {
    setOfflineQueueActiveUid(uid);
    const syncState = () => {
      setPendingCount(getPendingOfflineCount(uid));
      setIsSyncing(flushing);
      setSyncError(lastSyncError);
    };
    const handleOnline = () => {
      setIsOnline(true);
      void flushOfflineQueue(uid);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    listeners.add(syncState);
    syncState();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      listeners.delete(syncState);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [uid]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncError: syncError,
    retrySync: async () => {
      await flushOfflineQueue(uid);
    },
  };
}
