import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./config.ts";
import type { FirestoreMerchant } from "../data/merchants.ts";
export type { FirestoreMerchant };

export const OperationType = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LIST: "list",
  GET: "get",
  WRITE: "write",
} as const;

export type OperationType = (typeof OperationType)[keyof typeof OperationType];

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(errInfo.error || "Database operation failed.");
}

export function getDeterministicNodeNumber(uid: string): number {
  const clean = (uid || "").trim();
  if (!clean) return 100001;
  let hash = 2166136261;
  for (let i = 0; i < clean.length; i++) {
    hash ^= clean.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 100000 + ((hash >>> 0) % 900000);
}

export interface UserProfileData {
  displayName: string;
  preferredName?: string;
  email: string;
  phoneNumber?: string;
  bio?: string;
  pronouns?: string;
  ageRange?: string;
  avatarType?: "preset" | "photo";
  presetAvatar?: string;
  avatarUrl?: string;
  subscriptionStatus?: "free" | "payg" | "monthly";
  theme?: string;
  companion?: string;
  persona?: string;
  preferredLanguage?: string;
  conversationStyle?: string;
  responseLength?: string;
  memoryConsent?: string;
  useActiveMemories?: boolean;
  chatViewMode?: "companion" | "classic";
  onboardingCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FirestoreMoodEntry {
  id: string;
  dateKey?: string;
  level: number;
  emoji: string;
  label: string;
  note: string;
  reportAllowed: boolean;
  createdAt: string;
}

export function getLocalDateKey(isoOrDate?: string | Date): string {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const year = validDate.getFullYear();
  const month = String(validDate.getMonth() + 1).padStart(2, "0");
  const day = String(validDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface FirestoreMemory {
  id: string;
  text: string;
  reason: string;
  category: string;
  active: boolean;
  kind?: "text" | "image";
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FirestoreJournalEntry {
  id: string;
  title: string;
  content: string;
  dateKey: string;
  entryDate: string;
  moodEmoji?: string;
  moodLabel?: string;
  photoUrl?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  bookId?: string;
  pageNumber?: number;
}

export interface FirestoreChatFolder {
  id: number;
  name: string;
  color?: string;
  icon?: string;
  pinned?: boolean;
  isDefault?: boolean;
}

export interface FirestoreConversation {
  id: string;
  title: string;
  category: string;
  day: "Today" | "Yesterday";
  messages: { from: "user" | "ony"; text: string }[];
  folderId?: number;
  archived?: boolean;
  reportAllowed?: boolean;
  pinned?: boolean;
  suggestedFolderId?: number;
  suggestedFolderName?: string;
  dismissedSuggestion?: boolean;
  createdAt?: string;
  updatedAt: string;
}

export interface FirestoreGlobeUser {
  id: number;
  ownerUid: string;
  moodGlow: "bright" | "soft" | "dim" | "neutral";
  moodKey?: string;
  moodLabel: string;
  discoverable: boolean;
  acceptsMessages: boolean;
  minLevel: number;
  lon: number;
  lat: number;
  regionName?: string;
  isMe?: boolean;
  updatedAt?: string;
}

export interface PostLikeRecord {
  userId: string;
  userName: string;
  reaction?: string;
  createdAt: string;
}

export interface PostCommentReplyRecord {
  id: string;
  userId: string;
  userName: string;
  kind?: "text" | "voice";
  text: string;
  audioUrl?: string;
  audioDuration?: number;
  transcription?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PostCommentRecord {
  id: string;
  userId: string;
  userName: string;
  kind?: "text" | "voice";
  text: string;
  audioUrl?: string;
  audioDuration?: number;
  transcription?: string;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  likeRecords: PostLikeRecord[];
  replies: PostCommentReplyRecord[];
}

export interface FirestoreCommunityPost {
  id: string;
  author: string;
  authorId: string;
  title: string;
  body: string;
  category: string;
  likes: number;
  likeRecords: PostLikeRecord[];
  comments: PostCommentRecord[];
  media?: "image" | "voice";
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface FirestoreCommunityMessage {
  id: string;
  toUserId: string;
  toUserMood?: string;
  fromUserId: string;
  senderAnonymous: string;
  recipientAnonymous: string;
  kind: "text" | "voice";
  text: string;
  audioUrl?: string;
  audioDuration?: number;
  transcription?: string;
  transcript?: string;
  isRead?: boolean;
  readAt?: string;
  createdAt: string;
}

export interface FirestoreRegisteredAccount {
  uid: string;
  displayName: string;
  email: string;
  emailLower: string;
  phoneNumber?: string;
  updatedAt: string;
}

export interface FirestoreTrustedContactRequest {
  id: string;
  fromUid: string;
  fromName: string;
  fromEmail: string;
  fromEmailLower?: string;
  toUid: string;
  toName: string;
  toEmail: string;
  toEmailLower?: string;
  contactPhone: string;
  relationshipNote?: string;
  requestKind?: "direct_invite" | "invite_link";
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
  respondedAt?: string;
}

export interface FirestoreVoucherClaim {
  id: string;
  merchantId: string;
  merchantName: string;
  offer: string;
  value: string;
  voucherCode: string;
  claimedAt: string;
  status: "claimed" | "redeemed";
}

export interface FirestoreToolkitCompletion {
  id: string;
  toolId: string;
  title: string;
  completedAt: string;
}

function stripUndefinedFields<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      result[k] = v;
    }
  }
  return result;
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        cleaned[k] = stripUndefinedDeep(v);
      }
    }
    return cleaned as T;
  }
  return value;
}

// ==========================================
// User Directory & Profile Operations
// ==========================================

export async function syncRegisteredAccount(account: {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
}): Promise<void> {
  if (!account.uid || !account.email) return;
  const now = new Date().toISOString();
  const cleanEmail = account.email.trim();
  const cleanName = account.displayName.trim() || cleanEmail.split("@")[0] || "ONY Member";
  const cleanPhone = account.phoneNumber ? account.phoneNumber.trim() : undefined;

  try {
    await setDoc(
      doc(db, "userDirectory", account.uid),
      stripUndefinedFields({
        uid: account.uid,
        displayName: cleanName,
        displayNameLower: cleanName.toLowerCase(),
        email: cleanEmail,
        emailLower: cleanEmail.toLowerCase(),
        ...(cleanPhone ? { phoneNumber: cleanPhone } : {}),
        updatedAt: now,
      }),
      { merge: true },
    );
  } catch (err) {
    console.warn("[ONY Directory] Could not sync registered account:", err);
  }
}

export async function createUserProfileDoc(
  uid: string,
  initial: { email: string; displayName: string; phoneNumber?: string },
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, "users", uid);
    const now = new Date().toISOString();
    const cleanPhone = (initial.phoneNumber || "").trim();
    await setDoc(
      userRef,
      {
        displayName: initial.displayName,
        email: initial.email,
        phoneNumber: cleanPhone,
        avatarType: "preset",
        presetAvatar: "bunny",
        subscriptionStatus: "free",
        theme: "peach",
        companion: "Cat",
        persona: "gentle",
        preferredLanguage: "English",
        conversationStyle: "Reflective",
        responseLength: "Balanced",
        memoryConsent: "allow",
        useActiveMemories: true,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );

    await syncRegisteredAccount({
      uid,
      displayName: initial.displayName,
      email: initial.email,
      phoneNumber: cleanPhone,
    });

    // Ensure the new user's own anonymous globe node exists with default private opt-in state
    await ensureOwnGlobeNode(uid, {
      moodGlow: "neutral",
      moodKey: "calm",
      moodLabel: "calm",
      discoverable: false,
      acceptsMessages: true,
    }).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfileData | null> {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;
    return snap.data() as UserProfileData;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfileData>,
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, "users", uid);
    const now = new Date().toISOString();
    await setDoc(
      userRef,
      stripUndefinedFields({
        ...updates,
        updatedAt: now,
      }),
      { merge: true },
    );

    if (updates.displayName || updates.email || updates.phoneNumber !== undefined) {
      const currentSnap = await getDoc(userRef).catch(() => null);
      const data = currentSnap?.exists() ? (currentSnap.data() as Partial<UserProfileData>) : {};
      const email = updates.email || data.email || auth.currentUser?.email || "";
      const displayName = updates.displayName || data.displayName || auth.currentUser?.displayName || "ONY Member";
      if (email) {
        await syncRegisteredAccount({
          uid,
          displayName,
          email,
          phoneNumber: updates.phoneNumber ?? data.phoneNumber,
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================
// User Settings Operations (user_settings/{uid})
// ==========================================

export async function getUserSettingsDoc(uid: string): Promise<Record<string, unknown> | null> {
  const path = `user_settings/${uid}`;
  try {
    const settingsRef = doc(db, "user_settings", uid);
    const snap = await getDoc(settingsRef);
    if (!snap.exists()) return null;
    return snap.data() as Record<string, unknown>;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserSettingsDoc(
  uid: string,
  settings: Record<string, unknown>,
): Promise<void> {
  const path = `user_settings/${uid}`;
  try {
    const settingsRef = doc(db, "user_settings", uid);
    await setDoc(settingsRef, stripUndefinedDeep(settings), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// Mood Check-in Operations
// ==========================================

export async function listMoodEntries(uid: string): Promise<FirestoreMoodEntry[]> {
  const path = `users/${uid}/moodCheckins`;
  try {
    const colRef = collection(db, "users", uid, "moodCheckins");
    const snap = await getDocs(colRef);
    const rawDocs = snap.docs
      .map((d) => {
        const data = d.data() as Omit<FirestoreMoodEntry, "id">;
        const dateKey =
          data.dateKey ||
          (/^\d{4}-\d{2}-\d{2}$/.test(d.id) ? d.id : getLocalDateKey(data.createdAt));
        return {
          id: d.id,
          ...data,
          note: data.note || "",
          reportAllowed: data.reportAllowed ?? true,
          dateKey,
        };
      })
      .sort(
        (a, b) =>
          (b.dateKey || "").localeCompare(a.dateKey || "") ||
          (b.createdAt || "").localeCompare(a.createdAt || ""),
      );

    const byDate = new Map<string, FirestoreMoodEntry>();
    for (const item of rawDocs) {
      const key = item.dateKey || getLocalDateKey(item.createdAt);
      if (!byDate.has(key)) {
        byDate.set(key, item);
      }
    }
    return Array.from(byDate.values())
      .sort(
        (a, b) =>
          (b.dateKey || "").localeCompare(a.dateKey || "") ||
          (b.createdAt || "").localeCompare(a.createdAt || ""),
      )
      .slice(0, 90);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getTodayMoodEntry(uid: string): Promise<FirestoreMoodEntry | null> {
  const todayKey = getLocalDateKey();
  const path = `users/${uid}/moodCheckins/${todayKey}`;
  try {
    const docRef = doc(db, "users", uid, "moodCheckins", todayKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Omit<FirestoreMoodEntry, "id">;
      return {
        id: snap.id,
        ...data,
        note: data.note || "",
        reportAllowed: data.reportAllowed ?? true,
        dateKey: data.dateKey || todayKey,
      };
    }
    const all = await listMoodEntries(uid);
    return all.find((m) => (m.dateKey || getLocalDateKey(m.createdAt)) === todayKey) || null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveMoodEntry(
  uid: string,
  entry: Omit<FirestoreMoodEntry, "id">,
): Promise<string> {
  const dateKey = entry.dateKey || getLocalDateKey(entry.createdAt);
  const path = `users/${uid}/moodCheckins/${dateKey}`;
  try {
    const docRef = doc(db, "users", uid, "moodCheckins", dateKey);
    await setDoc(
      docRef,
      {
        level: entry.level,
        emoji: entry.emoji,
        label: entry.label,
        note: (entry.note || "").slice(0, 500),
        reportAllowed: entry.reportAllowed ?? true,
        createdAt: entry.createdAt || new Date().toISOString(),
        dateKey,
      },
      { merge: true },
    );

    const moodGlow: "bright" | "soft" | "dim" =
      entry.level >= 4 ? "bright" : entry.level === 3 ? "soft" : "dim";
    await ensureOwnGlobeNode(uid, {
      moodLabel: entry.label,
      moodKey: entry.label.toLowerCase(),
      moodGlow,
    }).catch(() => {});

    return dateKey;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateMoodEntry(
  uid: string,
  entryId: string,
  updates: Partial<FirestoreMoodEntry>,
): Promise<void> {
  const path = `users/${uid}/moodCheckins/${entryId}`;
  try {
    const docRef = doc(db, "users", uid, "moodCheckins", entryId);
    await setDoc(docRef, stripUndefinedFields(updates as Record<string, unknown>), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteMoodEntry(uid: string, entryId: string): Promise<void> {
  const path = `users/${uid}/moodCheckins/${entryId}`;
  try {
    const docRef = doc(db, "users", uid, "moodCheckins", entryId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// Memory Vault Operations
// ==========================================

export async function listMemories(uid: string): Promise<FirestoreMemory[]> {
  const path = `users/${uid}/memories`;
  try {
    const colRef = collection(db, "users", uid, "memories");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreMemory, "id">),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveMemory(
  uid: string,
  memory: Omit<FirestoreMemory, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const path = `users/${uid}/memories`;
  try {
    const colRef = collection(db, "users", uid, "memories");
    const newDocRef = doc(colRef);
    const now = new Date().toISOString();
    await setDoc(
      newDocRef,
      stripUndefinedFields({
        ...memory,
        createdAt: now,
        updatedAt: now,
      } as unknown as Record<string, unknown>),
    );
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateMemory(
  uid: string,
  memoryId: string,
  updates: Partial<FirestoreMemory>,
): Promise<void> {
  const path = `users/${uid}/memories/${memoryId}`;
  try {
    const docRef = doc(db, "users", uid, "memories", memoryId);
    await updateDoc(docRef, {
      ...stripUndefinedFields(updates as Record<string, unknown>),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteMemory(uid: string, memoryId: string): Promise<void> {
  const path = `users/${uid}/memories/${memoryId}`;
  try {
    const docRef = doc(db, "users", uid, "memories", memoryId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearAllMemories(uid: string): Promise<void> {
  const path = `users/${uid}/memories`;
  try {
    const colRef = collection(db, "users", uid, "memories");
    const snap = await getDocs(colRef);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// Digital Journal & Diary Operations
// ==========================================

const LOCAL_STORAGE_JOURNAL_PREFIX = "ony_cached_journal_entries_";
const LEGACY_LOCAL_STORAGE_JOURNAL_KEY = "ony_cached_journal_entries";

function getJournalCacheKey(uid?: string | null): string | null {
  const target = uid || auth.currentUser?.uid;
  return target ? `${LOCAL_STORAGE_JOURNAL_PREFIX}${target}` : null;
}

export function clearLocalJournalCache(uid?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (uid) {
      window.localStorage.removeItem(`${LOCAL_STORAGE_JOURNAL_PREFIX}${uid}`);
    } else {
      const toRemove: string[] = [LEGACY_LOCAL_STORAGE_JOURNAL_KEY];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(LOCAL_STORAGE_JOURNAL_PREFIX)) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => window.localStorage.removeItem(k));
    }
  } catch {
    // Ignore storage cleanup error
  }
}

export function loadCachedJournalEntries(uid?: string | null): FirestoreJournalEntry[] {
  if (typeof window === "undefined") return [];
  const key = getJournalCacheKey(uid);
  if (!key) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCachedJournalEntries(entries: FirestoreJournalEntry[], uid?: string | null): void {
  if (typeof window === "undefined") return;
  const key = getJournalCacheKey(uid);
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    // Ignore quota errors
  }
}

export async function listJournalEntries(uid: string): Promise<FirestoreJournalEntry[]> {
  if (!uid) return [];
  const path = `users/${uid}/journalEntries`;
  try {
    const colRef = collection(db, "users", uid, "journalEntries");
    const q = query(colRef, orderBy("entryDate", "desc"));
    const snap = await getDocs(q);
    const loaded = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreJournalEntry, "id">),
    }));
    saveCachedJournalEntries(loaded, uid);
    return loaded;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveJournalEntry(
  uid: string,
  entry: Omit<FirestoreJournalEntry, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<string> {
  const entryId = entry.id || `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const fullEntry: FirestoreJournalEntry = {
    id: entryId,
    title: entry.title || "",
    content: entry.content || "",
    dateKey: entry.dateKey || getLocalDateKey(),
    entryDate: entry.entryDate || now,
    createdAt: now,
    updatedAt: now,
    ...(entry.moodEmoji ? { moodEmoji: entry.moodEmoji } : {}),
    ...(entry.moodLabel ? { moodLabel: entry.moodLabel } : {}),
    ...(entry.photoUrl ? { photoUrl: entry.photoUrl } : {}),
    ...(entry.tags ? { tags: entry.tags } : {}),
    ...(entry.bookId ? { bookId: entry.bookId } : {}),
    ...(typeof entry.pageNumber === "number" ? { pageNumber: entry.pageNumber } : {}),
  };

  const docRef = doc(db, "users", uid, "journalEntries", entryId);
  try {
    await setDoc(docRef, stripUndefinedFields(fullEntry as unknown as Record<string, unknown>));
    const cached = loadCachedJournalEntries(uid);
    saveCachedJournalEntries([fullEntry, ...cached.filter((e) => e.id !== entryId)], uid);
    return entryId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}/journalEntries/${entryId}`);
  }
}

export async function updateJournalEntry(
  uid: string,
  entryId: string,
  updates: Partial<FirestoreJournalEntry>,
): Promise<void> {
  const now = new Date().toISOString();
  const docRef = doc(db, "users", uid, "journalEntries", entryId);
  try {
    await setDoc(
      docRef,
      stripUndefinedFields({ ...(updates as Record<string, unknown>), updatedAt: now }),
      { merge: true },
    );
    const cached = loadCachedJournalEntries(uid);
    saveCachedJournalEntries(
      cached.map((e) => (e.id === entryId ? { ...e, ...updates, updatedAt: now } : e)),
      uid,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/journalEntries/${entryId}`);
  }
}

export async function deleteJournalEntry(uid: string, entryId: string): Promise<void> {
  const docRef = doc(db, "users", uid, "journalEntries", entryId);
  try {
    await deleteDoc(docRef);
    const cached = loadCachedJournalEntries(uid);
    saveCachedJournalEntries(
      cached.filter((e) => e.id !== entryId),
      uid,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}/journalEntries/${entryId}`);
  }
}

export async function syncUserBookshelfData(
  uid: string,
  shelves: unknown[],
  books: unknown[],
): Promise<void> {
  const userRef = doc(db, "users", uid);
  await setDoc(
    userRef,
    {
      journalShelves: shelves,
      journalBooks: books,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function loadUserBookshelfData(
  uid: string,
): Promise<{ shelves?: unknown[]; books?: unknown[] } | null> {
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        shelves: Array.isArray(data.journalShelves) ? data.journalShelves : undefined,
        books: Array.isArray(data.journalBooks) ? data.journalBooks : undefined,
      };
    }
    return null;
  } catch (err) {
    console.warn("[ONY Journal] Bookshelf load notice:", err);
    return null;
  }
}

// ==========================================
// Chat Folders & Conversations
// ==========================================

export async function saveUserChatFolders(
  uid: string,
  folders: FirestoreChatFolder[],
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const cleanFolders = folders.map((f) => stripUndefinedFields(f as unknown as Record<string, unknown>));
    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      { chatFolders: cleanFolders, updatedAt: new Date().toISOString() },
      { merge: true },
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadUserChatFolders(uid: string): Promise<FirestoreChatFolder[] | null> {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.chatFolders) && data.chatFolders.length > 0) {
        return data.chatFolders as FirestoreChatFolder[];
      }
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function listConversations(uid: string): Promise<FirestoreConversation[]> {
  const path = `users/${uid}/conversations`;
  try {
    const colRef = collection(db, "users", uid, "conversations");
    const q = query(colRef, orderBy("updatedAt", "desc"), limit(300));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreConversation, "id">),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveConversation(
  uid: string,
  conversationId: string,
  data: Omit<FirestoreConversation, "id">,
): Promise<void> {
  const path = `users/${uid}/conversations/${conversationId}`;
  try {
    const docRef = doc(db, "users", uid, "conversations", conversationId);
    const cleanMessages = (data.messages || []).map((m) => ({
      from: m.from,
      text: m.text,
    }));
    const payload = stripUndefinedFields({
      ...data,
      messages: cleanMessages,
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteConversation(uid: string, conversationId: string): Promise<void> {
  const path = `users/${uid}/conversations/${conversationId}`;
  try {
    const docRef = doc(db, "users", uid, "conversations", conversationId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// Community Globe Operations (UID-keyed)
// ==========================================

function mapGlobeDocToUser(
  docId: string,
  data: Partial<FirestoreGlobeUser>,
  currentUid: string,
): FirestoreGlobeUser {
  const ownerUid = typeof data.ownerUid === "string" && data.ownerUid.trim() ? data.ownerUid.trim() : docId;
  const numericId =
    typeof data.id === "number" && Number.isFinite(data.id) && data.id > 0
      ? data.id
      : getDeterministicNodeNumber(ownerUid);
  const isMe = Boolean(currentUid && (docId === currentUid || ownerUid === currentUid));

  return {
    id: numericId,
    ownerUid,
    moodGlow: (data.moodGlow as FirestoreGlobeUser["moodGlow"]) || "neutral",
    moodKey: typeof data.moodKey === "string" ? data.moodKey : undefined,
    moodLabel: data.moodLabel || "none",
    discoverable: Boolean(data.discoverable),
    acceptsMessages: data.acceptsMessages !== false,
    minLevel: typeof data.minLevel === "number" ? data.minLevel : 0,
    lon: typeof data.lon === "number" ? data.lon : 101.6869,
    lat: typeof data.lat === "number" ? data.lat : 3.139,
    regionName: typeof data.regionName === "string" ? data.regionName : undefined,
    isMe,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
  };
}

export async function ensureOwnGlobeNode(
  uid: string,
  patch: Partial<FirestoreGlobeUser> = {},
): Promise<FirestoreGlobeUser> {
  const cleanUid = (uid || "").trim();
  if (!cleanUid) {
    throw new Error("Authentication required to initialize community node.");
  }

  const ref = doc(db, "globeUsers", cleanUid);
  const snap = await getDoc(ref).catch(() => null);
  const existing = snap && snap.exists() ? (snap.data() as Partial<FirestoreGlobeUser>) : {};
  const nodeNum = getDeterministicNodeNumber(cleanUid);
  const now = new Date().toISOString();

  const merged: FirestoreGlobeUser = {
    id: typeof existing.id === "number" && existing.id > 0 ? existing.id : nodeNum,
    ownerUid: cleanUid,
    moodGlow: patch.moodGlow || existing.moodGlow || "neutral",
    moodKey: patch.moodKey || existing.moodKey || "calm",
    moodLabel: patch.moodLabel || existing.moodLabel || "calm",
    discoverable:
      typeof patch.discoverable === "boolean"
        ? patch.discoverable
        : typeof existing.discoverable === "boolean"
          ? existing.discoverable
          : false,
    acceptsMessages:
      typeof patch.acceptsMessages === "boolean"
        ? patch.acceptsMessages
        : existing.acceptsMessages !== false,
    minLevel: typeof patch.minLevel === "number" ? patch.minLevel : existing.minLevel ?? 0,
    lon: typeof patch.lon === "number" ? patch.lon : existing.lon ?? 101.6869,
    lat: typeof patch.lat === "number" ? patch.lat : existing.lat ?? 3.139,
    regionName: patch.regionName ?? existing.regionName,
    updatedAt: now,
  };

  await setDoc(ref, stripUndefinedFields(merged as unknown as Record<string, unknown>), { merge: true });
  return { ...merged, isMe: true };
}

export async function listGlobeUsers(myUid?: string): Promise<FirestoreGlobeUser[]> {
  const currentUid = (myUid || auth.currentUser?.uid || "").trim();
  const path = "globeUsers";
  try {
    const colRef = collection(db, "globeUsers");
    const visibleQuery = query(colRef, where("discoverable", "==", true));
    const [visibleSnap, mySnap] = await Promise.all([
      getDocs(visibleQuery),
      currentUid ? getDoc(doc(db, "globeUsers", currentUid)).catch(() => null) : Promise.resolve(null),
    ]);

    const byOwner = new Map<string, FirestoreGlobeUser>();
    for (const d of visibleSnap.docs) {
      const raw = d.data() as Record<string, unknown>;
      if (!raw.recordType && typeof raw.moodGlow === "string" && raw.discoverable === true) {
        const mapped = mapGlobeDocToUser(d.id, raw as Partial<FirestoreGlobeUser>, currentUid);
        byOwner.set(mapped.ownerUid, mapped);
      }
    }

    if (mySnap && mySnap.exists()) {
      const raw = mySnap.data() as Record<string, unknown>;
      if (!raw.recordType && typeof raw.moodGlow === "string") {
        const myNode = mapGlobeDocToUser(mySnap.id, raw as Partial<FirestoreGlobeUser>, currentUid);
        byOwner.set(myNode.ownerUid, { ...myNode, isMe: true });
      }
    }

    return Array.from(byOwner.values()).sort((a, b) => (a.isMe === b.isMe ? a.id - b.id : a.isMe ? -1 : 1));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeVisibleGlobeUsers(
  onUpdate: (users: FirestoreGlobeUser[]) => void,
  myUid?: string,
  onError?: (err: Error) => void,
): () => void {
  const currentUid = (myUid || auth.currentUser?.uid || "").trim();
  if (!currentUid) {
    onUpdate([]);
    return () => {};
  }

  const colRef = collection(db, "globeUsers");
  const visibleQuery = query(colRef, where("discoverable", "==", true));

  let latestPeers: FirestoreGlobeUser[] = [];
  let latestMe: FirestoreGlobeUser | null = null;
  let peersReady = false;

  const emit = () => {
    if (!peersReady && !latestMe) return;
    const byOwner = new Map<string, FirestoreGlobeUser>();
    for (const peer of latestPeers) {
      if (peer.discoverable) {
        byOwner.set(peer.ownerUid, peer);
      }
    }
    if (latestMe) {
      byOwner.set(latestMe.ownerUid, { ...latestMe, isMe: true });
    }
    onUpdate(Array.from(byOwner.values()).sort((a, b) => (a.isMe === b.isMe ? a.id - b.id : a.isMe ? -1 : 1)));
  };

  const unsubPeers = onSnapshot(
    visibleQuery,
    (snap) => {
      peersReady = true;
      latestPeers = snap.docs
        .filter((d) => {
          const raw = d.data() as Record<string, unknown>;
          return !raw.recordType && typeof raw.moodGlow === "string" && raw.discoverable === true;
        })
        .map((d) => mapGlobeDocToUser(d.id, d.data() as Partial<FirestoreGlobeUser>, currentUid));
      emit();
    },
    (err) => {
      console.warn("[ONY Globe] Live peer listener error:", err);
      onError?.(err);
    },
  );

  const unsubMe = onSnapshot(
    doc(db, "globeUsers", currentUid),
    (snap) => {
      if (snap.exists()) {
        const raw = snap.data() as Record<string, unknown>;
        if (!raw.recordType && typeof raw.moodGlow === "string") {
          latestMe = mapGlobeDocToUser(snap.id, raw as Partial<FirestoreGlobeUser>, currentUid);
        }
      }
      emit();
    },
    (err) => {
      console.warn("[ONY Globe] Own node listener error:", err);
      onError?.(err);
    },
  );

  return () => {
    unsubPeers();
    unsubMe();
  };
}

export async function updateGlobeUserNode(
  ownerUid: string,
  patch: Partial<FirestoreGlobeUser>,
): Promise<void> {
  const cleanUid = (ownerUid || auth.currentUser?.uid || "").trim();
  if (!cleanUid) {
    throw new Error("Authentication required to update your community node.");
  }
  const path = `globeUsers/${cleanUid}`;
  try {
    await ensureOwnGlobeNode(cleanUid, patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// Community Guideline & Profanity Validation
// ==========================================

const PROFANITY_WORDS = [
  "fuck",
  "fucking",
  "fucked",
  "fucker",
  "fck",
  "fuk",
  "shit",
  "shitty",
  "bullshit",
  "sht",
  "bitch",
  "bitches",
  "asshole",
  "arsehole",
  "bastard",
  "dick",
  "cock",
  "pussy",
  "cunt",
  "slut",
  "whore",
  "motherfucker",
  "wtf",
  "stfu",
  "idiot",
  "idiotic",
  "stupid",
  "moron",
  "dumbass",
  "jackass",
  "loser",
  "pathetic",
  "worthless",
  "useless",
  "retard",
  "retarded",
  "scumbag",
  "bodoh",
  "babi",
  "sial",
  "celaka",
  "lancau",
  "pukimak",
  "bangang",
  "ampang",
  "mampus",
];

const PROFANITY_PHRASES = [
  "kill yourself",
  "kys",
  "go die",
  "i hate you",
  "you should die",
  "nobody likes you",
  "shut up",
  "screw you",
  "damn you",
  "fuck off",
  "piss off",
  "pergi mati",
  "kepala bapak",
];

export function validateCommunityCommentText(text: string): {
  valid: boolean;
  reason?: string;
  matchedTerm?: string;
} {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return { valid: false, reason: "Please write a message before sending." };
  }

  const normalized = trimmed.toLowerCase();

  for (const phrase of PROFANITY_PHRASES) {
    if (normalized.includes(phrase)) {
      return {
        valid: false,
        matchedTerm: phrase,
        reason: `Community Guideline Violation: Your message contains unkind language ("${phrase}"). Please keep ONY supportive.`,
      };
    }
  }

  const tokens = normalized
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const word of PROFANITY_WORDS) {
    if (tokens.includes(word)) {
      return {
        valid: false,
        matchedTerm: word,
        reason: `Community Guideline Violation: Disrespectful language ("${word}") is not allowed in ONY Community.`,
      };
    }
  }

  return { valid: true };
}

function normalizeLikeRecords(raw: unknown): PostLikeRecord[] {
  if (!Array.isArray(raw)) return [];
  const seenUsers = new Set<string>();
  const list: PostLikeRecord[] = [];
  for (const item of raw) {
    if (item && typeof item === "object") {
      const rec = item as Partial<PostLikeRecord>;
      const userId = String(rec.userId || "").trim();
      if (!userId || seenUsers.has(userId)) continue;
      seenUsers.add(userId);
      list.push({
        userId,
        userName: String(rec.userName || "Community Member").trim(),
        ...(typeof rec.reaction === "string" && rec.reaction.trim() ? { reaction: rec.reaction.trim() } : {}),
        createdAt: String(rec.createdAt || new Date().toISOString()),
      });
    }
  }
  return list;
}

function normalizeCommentReplies(raw: unknown): PostCommentReplyRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item, idx) => {
      const r = item as Partial<PostCommentReplyRecord>;
      return {
        id: String(r.id || `reply_${idx + 1}`),
        userId: String(r.userId || ""),
        userName: String(r.userName || "Community Member"),
        ...(r.kind === "voice" || r.kind === "text" ? { kind: r.kind } : {}),
        text: String(r.text || ""),
        ...(r.audioUrl ? { audioUrl: String(r.audioUrl) } : {}),
        ...(typeof r.audioDuration === "number" ? { audioDuration: r.audioDuration } : {}),
        ...(r.transcription ? { transcription: String(r.transcription) } : {}),
        createdAt: String(r.createdAt || new Date().toISOString()),
        ...(r.updatedAt ? { updatedAt: String(r.updatedAt) } : {}),
      };
    });
}

function normalizePostComments(raw: unknown): PostCommentRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item, idx) => {
      const c = item as Partial<PostCommentRecord>;
      const likeRecords = normalizeLikeRecords(c.likeRecords);
      const replies = normalizeCommentReplies(c.replies);
      return {
        id: String(c.id || `comment_${idx + 1}`),
        userId: String(c.userId || ""),
        userName: String(c.userName || "Community Member"),
        ...(c.kind === "voice" || c.kind === "text" ? { kind: c.kind } : {}),
        text: String(c.text || ""),
        ...(c.audioUrl ? { audioUrl: String(c.audioUrl) } : {}),
        ...(typeof c.audioDuration === "number" ? { audioDuration: c.audioDuration } : {}),
        ...(c.transcription ? { transcription: String(c.transcription) } : {}),
        createdAt: String(c.createdAt || new Date().toISOString()),
        ...(c.updatedAt ? { updatedAt: String(c.updatedAt) } : {}),
        likeRecords,
        likes: likeRecords.length,
        replies,
      };
    });
}

// ==========================================
// Community Posts Operations
// ==========================================

export function deduplicateCommunityPostList(
  posts: FirestoreCommunityPost[],
): FirestoreCommunityPost[] {
  const byId = new Map<string, FirestoreCommunityPost>();
  const orderedIds: string[] = [];

  for (const post of posts) {
    if (!post.id) continue;
    if (!byId.has(post.id)) {
      orderedIds.push(post.id);
    }
    byId.set(post.id, post);
  }

  return orderedIds.map((id) => byId.get(id)!).filter(Boolean);
}

function mapDocToCommunityPost(docId: string, raw: Record<string, unknown>): FirestoreCommunityPost {
  const likeRecords = normalizeLikeRecords(raw.likeRecords);
  const comments = normalizePostComments(raw.comments);
  return {
    id: docId,
    author: String(raw.author || "Anonymous"),
    authorId: String(raw.authorId || ""),
    title: String(raw.title || ""),
    body: String(raw.body || ""),
    category: String(raw.category || "General"),
    likes: likeRecords.length,
    likeRecords,
    comments,
    ...(raw.media === "image" || raw.media === "voice" ? { media: raw.media } : {}),
    ...(raw.imageUrl ? { imageUrl: String(raw.imageUrl) } : {}),
    ...(raw.audioUrl ? { audioUrl: String(raw.audioUrl) } : {}),
    ...(typeof raw.audioDuration === "number" ? { audioDuration: raw.audioDuration } : {}),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    ...(raw.updatedAt ? { updatedAt: String(raw.updatedAt) } : {}),
  };
}

export async function listCommunityPosts(maxCount = 50): Promise<FirestoreCommunityPost[]> {
  const path = "communityPosts";
  try {
    const colRef = collection(db, "communityPosts");
    const q = query(colRef, orderBy("createdAt", "desc"), limit(maxCount));
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => mapDocToCommunityPost(d.id, d.data() as Record<string, unknown>));
    return deduplicateCommunityPostList(results);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeCommunityPosts(
  onUpdate: (posts: FirestoreCommunityPost[]) => void,
  onError?: (err: Error) => void,
  maxCount = 50,
): () => void {
  const q = query(collection(db, "communityPosts"), orderBy("createdAt", "desc"), limit(maxCount));
  return onSnapshot(
    q,
    (snap) => {
      const results = snap.docs.map((d) => mapDocToCommunityPost(d.id, d.data() as Record<string, unknown>));
      onUpdate(deduplicateCommunityPostList(results));
    },
    (err) => {
      console.warn("[ONY Posts] Live feed listener error:", err);
      onError?.(err);
    },
  );
}

export async function createCommunityPost(
  post: Omit<FirestoreCommunityPost, "id">,
  customId?: string,
): Promise<string> {
  const uid = (post.authorId || auth.currentUser?.uid || "").trim();
  if (!uid) {
    throw new Error("You must be signed in to publish a community post.");
  }

  const titleCheck = validateCommunityCommentText(post.title);
  if (!titleCheck.valid) throw new Error(titleCheck.reason || "Invalid post title.");
  const bodyCheck = validateCommunityCommentText(post.body);
  if (!bodyCheck.valid) throw new Error(bodyCheck.reason || "Invalid post body.");

  const path = "communityPosts";
  try {
    const colRef = collection(db, "communityPosts");
    const newDocRef = customId ? doc(db, "communityPosts", customId) : doc(colRef);
    const likeRecords = normalizeLikeRecords(post.likeRecords);
    const comments = normalizePostComments(post.comments);
    const payload = stripUndefinedDeep({
      ...post,
      authorId: uid,
      likes: likeRecords.length,
      likeRecords,
      comments,
      updatedAt: post.createdAt || new Date().toISOString(),
    });
    await setDoc(newDocRef, payload);
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteCommunityPost(postId: string): Promise<void> {
  const path = `communityPosts/${postId}`;
  try {
    await deleteDoc(doc(db, "communityPosts", postId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCommunityPostInteractionState(
  post: FirestoreCommunityPost,
): Promise<FirestoreCommunityPost> {
  const path = `communityPosts/${post.id}`;
  const likeRecords = normalizeLikeRecords(post.likeRecords);
  const comments = normalizePostComments(post.comments);
  const now = new Date().toISOString();
  const updatedPost: FirestoreCommunityPost = {
    ...post,
    likes: likeRecords.length,
    likeRecords,
    comments,
    updatedAt: now,
  };
  try {
    const docRef = doc(db, "communityPosts", String(post.id));
    await updateDoc(
      docRef,
      stripUndefinedDeep({
        likes: updatedPost.likes,
        likeRecords: updatedPost.likeRecords,
        comments: updatedPost.comments,
        updatedAt: now,
      }),
    );
    return updatedPost;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleCommunityPostLike(
  post: FirestoreCommunityPost,
  user: { uid: string; name: string },
  reaction?: string,
): Promise<FirestoreCommunityPost> {
  const cleanUid = (user.uid || auth.currentUser?.uid || "").trim();
  if (!cleanUid) {
    throw new Error("Please sign in to react to community posts.");
  }
  const cleanName = user.name.trim() || "ONY Member";
  const currentLikes = normalizeLikeRecords(post.likeRecords);
  const existing = currentLikes.find((item) => item.userId === cleanUid);

  let nextLikeRecords: PostLikeRecord[];
  if (existing && (!reaction || existing.reaction === reaction)) {
    nextLikeRecords = currentLikes.filter((item) => item.userId !== cleanUid);
  } else if (existing && reaction) {
    nextLikeRecords = currentLikes.map((item) =>
      item.userId === cleanUid
        ? { ...item, reaction, createdAt: new Date().toISOString() }
        : item,
    );
  } else {
    nextLikeRecords = [
      ...currentLikes,
      {
        userId: cleanUid,
        userName: cleanName,
        ...(reaction ? { reaction } : {}),
        createdAt: new Date().toISOString(),
      },
    ];
  }

  return saveCommunityPostInteractionState({
    ...post,
    likes: nextLikeRecords.length,
    likeRecords: nextLikeRecords,
  });
}

export async function addCommunityPostComment(
  post: FirestoreCommunityPost,
  params: {
    userId: string;
    userName: string;
    text: string;
    kind?: "text" | "voice";
    audioUrl?: string;
    audioDuration?: number;
    transcription?: string;
  },
): Promise<FirestoreCommunityPost> {
  const cleanUid = (params.userId || auth.currentUser?.uid || "").trim();
  if (!cleanUid) {
    throw new Error("Please sign in to comment on posts.");
  }

  const isVoice = params.kind === "voice";
  if (isVoice) {
    if (!params.audioUrl) {
      throw new Error("Voice recording audio is missing. Please record again.");
    }
    if (params.transcription?.trim()) {
      const tValidation = validateCommunityCommentText(params.transcription);
      if (!tValidation.valid) {
        throw new Error(tValidation.reason || "Comment violates community guidelines.");
      }
    }
  } else {
    const validation = validateCommunityCommentText(params.text);
    if (!validation.valid) {
      throw new Error(validation.reason || "Comment violates community guidelines.");
    }
  }

  const now = new Date().toISOString();
  const newComment: PostCommentRecord = {
    id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: cleanUid,
    userName: params.userName.trim() || "ONY Member",
    kind: isVoice ? "voice" : "text",
    text: params.text.trim() || (isVoice ? "Voice comment" : ""),
    ...(isVoice && params.audioUrl ? { audioUrl: params.audioUrl } : {}),
    ...(isVoice && typeof params.audioDuration === "number"
      ? { audioDuration: params.audioDuration }
      : {}),
    ...(isVoice && params.transcription ? { transcription: params.transcription } : {}),
    createdAt: now,
    likes: 0,
    likeRecords: [],
    replies: [],
  };

  const nextComments = [...normalizePostComments(post.comments), newComment];
  return saveCommunityPostInteractionState({
    ...post,
    comments: nextComments,
  });
}

export async function editCommunityPostComment(
  post: FirestoreCommunityPost,
  commentId: string,
  newText: string,
): Promise<FirestoreCommunityPost> {
  const validation = validateCommunityCommentText(newText);
  if (!validation.valid) {
    throw new Error(validation.reason || "Comment violates community guidelines.");
  }

  const now = new Date().toISOString();
  const nextComments = normalizePostComments(post.comments).map((c) =>
    c.id === commentId
      ? { ...c, text: newText.trim(), updatedAt: now }
      : c,
  );

  return saveCommunityPostInteractionState({
    ...post,
    comments: nextComments,
  });
}

export async function deleteCommunityPostComment(
  post: FirestoreCommunityPost,
  commentId: string,
): Promise<FirestoreCommunityPost> {
  const nextComments = normalizePostComments(post.comments).filter((c) => c.id !== commentId);
  return saveCommunityPostInteractionState({
    ...post,
    comments: nextComments,
  });
}

export async function toggleCommunityCommentLike(
  post: FirestoreCommunityPost,
  commentId: string,
  user: { uid: string; name: string },
): Promise<FirestoreCommunityPost> {
  const cleanUid = (user.uid || auth.currentUser?.uid || "").trim();
  if (!cleanUid) {
    throw new Error("Please sign in to like comments.");
  }
  const cleanName = user.name.trim() || "ONY Member";

  const nextComments = normalizePostComments(post.comments).map((c) => {
    if (c.id !== commentId) return c;
    const currentLikes = normalizeLikeRecords(c.likeRecords);
    const alreadyLiked = currentLikes.some((item) => item.userId === cleanUid);
    const updatedLikes = alreadyLiked
      ? currentLikes.filter((item) => item.userId !== cleanUid)
      : [
          ...currentLikes,
          {
            userId: cleanUid,
            userName: cleanName,
            createdAt: new Date().toISOString(),
          },
        ];
    return {
      ...c,
      likeRecords: updatedLikes,
      likes: updatedLikes.length,
    };
  });

  return saveCommunityPostInteractionState({
    ...post,
    comments: nextComments,
  });
}

export async function addCommunityCommentReply(
  post: FirestoreCommunityPost,
  commentId: string,
  params: {
    userId: string;
    userName: string;
    text: string;
    kind?: "text" | "voice";
    audioUrl?: string;
    audioDuration?: number;
    transcription?: string;
  },
): Promise<FirestoreCommunityPost> {
  const cleanUid = (params.userId || auth.currentUser?.uid || "").trim();
  if (!cleanUid) {
    throw new Error("Please sign in to reply.");
  }

  const isVoice = params.kind === "voice";
  if (isVoice) {
    if (!params.audioUrl) {
      throw new Error("Voice reply audio is missing. Please record again.");
    }
  } else {
    const validation = validateCommunityCommentText(params.text);
    if (!validation.valid) {
      throw new Error(validation.reason || "Reply violates community guidelines.");
    }
  }

  const now = new Date().toISOString();
  const newReply: PostCommentReplyRecord = {
    id: `reply_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: cleanUid,
    userName: params.userName.trim() || "ONY Member",
    kind: isVoice ? "voice" : "text",
    text: params.text.trim() || (isVoice ? "Voice reply" : ""),
    ...(isVoice && params.audioUrl ? { audioUrl: params.audioUrl } : {}),
    ...(isVoice && typeof params.audioDuration === "number"
      ? { audioDuration: params.audioDuration }
      : {}),
    ...(isVoice && params.transcription ? { transcription: params.transcription } : {}),
    createdAt: now,
  };

  const nextComments = normalizePostComments(post.comments).map((c) =>
    c.id === commentId
      ? {
          ...c,
          replies: [...normalizeCommentReplies(c.replies), newReply],
        }
      : c,
  );

  return saveCommunityPostInteractionState({
    ...post,
    comments: nextComments,
  });
}

export async function editCommunityCommentReply(
  post: FirestoreCommunityPost,
  commentId: string,
  replyId: string,
  newText: string,
): Promise<FirestoreCommunityPost> {
  const validation = validateCommunityCommentText(newText);
  if (!validation.valid) {
    throw new Error(validation.reason || "Reply violates community guidelines.");
  }

  const now = new Date().toISOString();
  const nextComments = normalizePostComments(post.comments).map((c) =>
    c.id === commentId
      ? {
          ...c,
          replies: normalizeCommentReplies(c.replies).map((r) =>
            r.id === replyId
              ? { ...r, text: newText.trim(), updatedAt: now }
              : r,
          ),
        }
      : c,
  );

  return saveCommunityPostInteractionState({
    ...post,
    comments: nextComments,
  });
}

export async function deleteCommunityCommentReply(
  post: FirestoreCommunityPost,
  commentId: string,
  replyId: string,
): Promise<FirestoreCommunityPost> {
  const nextComments = normalizePostComments(post.comments).map((c) =>
    c.id === commentId
      ? {
          ...c,
          replies: normalizeCommentReplies(c.replies).filter((r) => r.id !== replyId),
        }
      : c,
  );

  return saveCommunityPostInteractionState({
    ...post,
    comments: nextComments,
  });
}

export async function updateCommunityPostLikes(
  postId: string,
  newLikes: number,
): Promise<void> {
  const path = `communityPosts/${postId}`;
  try {
    const docRef = doc(db, "communityPosts", postId);
    await updateDoc(docRef, { likes: newLikes });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================
// Owner-Private Community Feed State & Blocks
// ==========================================

export async function listSavedPostIds(uid: string): Promise<string[]> {
  if (!uid) return [];
  const snap = await getDocs(collection(db, "users", uid, "savedPosts"));
  return snap.docs.map((d) => d.id);
}

export async function setPostSavedState(uid: string, postId: string, saved: boolean): Promise<void> {
  const ref = doc(db, "users", uid, "savedPosts", postId);
  if (saved) {
    await setDoc(ref, { postId, savedAt: new Date().toISOString() });
  } else {
    await deleteDoc(ref);
  }
}

export async function listHiddenPostIds(uid: string): Promise<string[]> {
  if (!uid) return [];
  const snap = await getDocs(collection(db, "users", uid, "hiddenPosts"));
  return snap.docs.map((d) => d.id);
}

export async function setPostHiddenState(uid: string, postId: string, hidden: boolean): Promise<void> {
  const ref = doc(db, "users", uid, "hiddenPosts", postId);
  if (hidden) {
    await setDoc(ref, { postId, hiddenAt: new Date().toISOString() });
  } else {
    await deleteDoc(ref);
  }
}

export async function listBlockedUserIds(uid: string): Promise<string[]> {
  if (!uid) return [];
  const snap = await getDocs(collection(db, "users", uid, "blockedUsers"));
  return snap.docs.map((d) => d.id);
}

export async function blockCommunityUser(
  uid: string,
  blockedUid: string,
  reason?: string,
): Promise<void> {
  if (!uid || !blockedUid || uid === blockedUid) return;
  const ref = doc(db, "users", uid, "blockedUsers", blockedUid);
  await setDoc(
    ref,
    stripUndefinedFields({
      blockedUid,
      blockedAt: new Date().toISOString(),
      ...(reason ? { reason: reason.slice(0, 300) } : {}),
    }),
  );
}

export async function unblockCommunityUser(uid: string, blockedUid: string): Promise<void> {
  if (!uid || !blockedUid) return;
  await deleteDoc(doc(db, "users", uid, "blockedUsers", blockedUid));
}

export async function submitModerationReport(params: {
  reporterUid: string;
  targetType: "post" | "comment" | "message" | "node";
  targetId: string;
  targetAuthorId?: string;
  reason: string;
}): Promise<string> {
  const colRef = collection(db, "moderationReports");
  const newRef = doc(colRef);
  await setDoc(
    newRef,
    stripUndefinedFields({
      reporterUid: params.reporterUid,
      targetType: params.targetType,
      targetId: params.targetId,
      targetAuthorId: params.targetAuthorId,
      reason: params.reason.slice(0, 500),
      createdAt: new Date().toISOString(),
    }),
  );
  return newRef.id;
}

export async function submitFeedbackReport(params: {
  userId: string;
  category: string;
  description: string;
  screenshotUrl?: string;
}): Promise<string> {
  const colRef = collection(db, "feedbackReports");
  const newRef = doc(colRef);
  await setDoc(
    newRef,
    stripUndefinedFields({
      userId: params.userId,
      category: params.category.slice(0, 50),
      description: params.description.slice(0, 2000),
      screenshotUrl: params.screenshotUrl,
      createdAt: new Date().toISOString(),
    }),
  );
  return newRef.id;
}

// ==========================================
// Marketplace Merchants & Voucher Claims
// ==========================================

export async function listMerchants(): Promise<FirestoreMerchant[]> {
  const path = "merchants";
  try {
    const colRef = collection(db, "merchants");
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreMerchant, "id">),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function listVoucherClaims(uid: string): Promise<FirestoreVoucherClaim[]> {
  if (!uid) return [];
  const snap = await getDocs(collection(db, "users", uid, "voucherClaims"));
  return snap.docs
    .map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreVoucherClaim, "id">),
    }))
    .sort((a, b) => (b.claimedAt || "").localeCompare(a.claimedAt || ""));
}

export async function claimMarketplaceVoucher(
  uid: string,
  merchant: { id?: string; name: string; offer: string; value: string },
): Promise<FirestoreVoucherClaim> {
  const merchantId = (merchant.id || merchant.name).toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const claimId = `claim_${merchantId}`;
  const existingRef = doc(db, "users", uid, "voucherClaims", claimId);
  const existingSnap = await getDoc(existingRef).catch(() => null);
  if (existingSnap && existingSnap.exists()) {
    return { id: existingSnap.id, ...(existingSnap.data() as Omit<FirestoreVoucherClaim, "id">) };
  }

  const codeSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const shortSlug = merchantId.replace(/_/g, "").slice(0, 4).toUpperCase();
  const claim: FirestoreVoucherClaim = {
    id: claimId,
    merchantId,
    merchantName: merchant.name,
    offer: merchant.offer,
    value: merchant.value,
    voucherCode: `ONY-${shortSlug}-${codeSuffix}`,
    claimedAt: new Date().toISOString(),
    status: "claimed",
  };
  await setDoc(existingRef, claim);
  return claim;
}

// ==========================================
// Toolkit Completions
// ==========================================

export async function listToolkitCompletions(uid: string): Promise<FirestoreToolkitCompletion[]> {
  if (!uid) return [];
  const snap = await getDocs(collection(db, "users", uid, "toolkitCompletions"));
  return snap.docs
    .map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreToolkitCompletion, "id">),
    }))
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));
}

export async function recordToolkitCompletion(
  uid: string,
  toolId: string,
  title: string,
): Promise<string> {
  const colRef = collection(db, "users", uid, "toolkitCompletions");
  const newRef = doc(colRef);
  await setDoc(newRef, {
    toolId,
    title,
    completedAt: new Date().toISOString(),
  });
  return newRef.id;
}

// ==========================================
// Community Support Messages Operations
// ==========================================

function deduplicateCommunityMessages(messages: FirestoreCommunityMessage[]): FirestoreCommunityMessage[] {
  const sorted = [...messages].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const seenIds = new Set<string>();
  const deduped: FirestoreCommunityMessage[] = [];
  for (const msg of sorted) {
    if (!msg.id || seenIds.has(msg.id)) continue;
    seenIds.add(msg.id);
    deduped.push(msg);
  }
  return deduped;
}

export async function listCommunityMessages(
  recipientUid?: string,
): Promise<FirestoreCommunityMessage[]> {
  const targetUid = (recipientUid || auth.currentUser?.uid || "").trim();
  if (!targetUid) return [];

  const path = "communityMessages";
  try {
    const q = query(collection(db, "communityMessages"), where("toUserId", "==", targetUid));
    const snap = await getDocs(q);
    const messages = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreCommunityMessage, "id">),
    }));
    return deduplicateCommunityMessages(messages);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeIncomingCommunityMessages(
  recipientUid: string,
  onUpdate: (messages: FirestoreCommunityMessage[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const cleanUid = recipientUid.trim();
  if (!cleanUid) {
    onUpdate([]);
    return () => {};
  }
  const q = query(collection(db, "communityMessages"), where("toUserId", "==", cleanUid));
  return onSnapshot(
    q,
    (snap) => {
      const msgs = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<FirestoreCommunityMessage, "id">),
      }));
      onUpdate(deduplicateCommunityMessages(msgs));
    },
    (err) => {
      console.warn("[ONY Messages] Inbox listener error:", err);
      onError?.(err);
    },
  );
}

export async function listSentCommunityMessagesToNode(
  fromUid: string,
  toUid: string,
): Promise<FirestoreCommunityMessage[]> {
  if (!fromUid || !toUid) return [];
  const path = "communityMessages";
  try {
    const q = query(collection(db, "communityMessages"), where("fromUserId", "==", fromUid));
    const snap = await getDocs(q);
    const filtered = snap.docs
      .map((d) => ({
        id: d.id,
        ...(d.data() as Omit<FirestoreCommunityMessage, "id">),
      }))
      .filter((m) => m.toUserId === toUid);
    return deduplicateCommunityMessages(filtered);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function markCommunityMessagesRead(
  messageIds: string[],
  isRead = true,
): Promise<void> {
  if (!messageIds.length) return;
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  for (const id of messageIds) {
    batch.update(doc(db, "communityMessages", id), {
      isRead,
      readAt: isRead ? now : null,
    });
  }
  await batch.commit();
}

export async function updateCommunityMessageTranscript(
  messageId: string,
  transcript: string,
): Promise<void> {
  if (!messageId || !transcript.trim()) return;
  await updateDoc(doc(db, "communityMessages", messageId), {
    transcript: transcript.trim().slice(0, 2000),
  });
}

export async function deleteCommunityMessage(messageId: string): Promise<void> {
  const path = `communityMessages/${messageId}`;
  try {
    await deleteDoc(doc(db, "communityMessages", messageId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createCommunityMessage(
  message: Omit<FirestoreCommunityMessage, "id">,
): Promise<string> {
  const fromUid = (message.fromUserId || auth.currentUser?.uid || "").trim();
  if (!fromUid) {
    throw new Error("You must be signed in to send supportive messages.");
  }

  const path = "communityMessages";
  try {
    if (message.toUserId) {
      const recipientRef = doc(db, "globeUsers", String(message.toUserId));
      const recipientSnap = await getDoc(recipientRef).catch(() => null);
      if (recipientSnap && recipientSnap.exists()) {
        const recipientData = recipientSnap.data() as Partial<FirestoreGlobeUser>;
        if (recipientData.acceptsMessages === false) {
          throw new Error(
            "RECIPIENT_MESSAGES_DISABLED: This person is not accepting supportive messages right now.",
          );
        }
      }
    }

    const colRef = collection(db, "communityMessages");
    const newDocRef = doc(colRef);
    await setDoc(
      newDocRef,
      stripUndefinedFields({
        ...message,
        fromUserId: fromUid,
        isRead: false,
      } as unknown as Record<string, unknown>),
    );
    return newDocRef.id;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("RECIPIENT_MESSAGES_DISABLED:")) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ==========================================
// Registered User Directory & Trusted Contact Requests
// ==========================================

export async function findRegisteredAccount(
  emailOrName: string,
): Promise<FirestoreRegisteredAccount | null> {
  const clean = emailOrName.trim().toLowerCase();
  if (!clean) return null;
  const colRef = collection(db, "userDirectory");
  const isEmail = clean.includes("@");
  const q = isEmail
    ? query(colRef, where("emailLower", "==", clean), limit(1))
    : query(colRef, where("displayNameLower", "==", clean), limit(1));

  try {
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    const raw = d.data() as Record<string, unknown>;
    return {
      uid: String(raw.uid || d.id),
      displayName: String(raw.displayName || "ONY Member"),
      email: String(raw.email || ""),
      emailLower: String(raw.emailLower || ""),
      phoneNumber: raw.phoneNumber ? String(raw.phoneNumber) : undefined,
      updatedAt: String(raw.updatedAt || new Date().toISOString()),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "userDirectory");
  }
}

export async function findRegisteredAccountByUid(
  uid: string,
): Promise<FirestoreRegisteredAccount | null> {
  const cleanUid = uid.trim();
  if (!cleanUid) return null;
  try {
    const snap = await getDoc(doc(db, "userDirectory", cleanUid));
    if (!snap.exists()) return null;
    const raw = snap.data() as Record<string, unknown>;
    return {
      uid: String(raw.uid || snap.id),
      displayName: String(raw.displayName || "ONY Member"),
      email: String(raw.email || ""),
      emailLower: String(raw.emailLower || ""),
      phoneNumber: raw.phoneNumber ? String(raw.phoneNumber) : undefined,
      updatedAt: String(raw.updatedAt || new Date().toISOString()),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `userDirectory/${cleanUid}`);
  }
}

export async function sendTrustedContactRequest(params: {
  fromUid: string;
  fromName: string;
  fromEmail: string;
  targetEmailOrName: string;
  contactPhone: string;
  relationshipNote?: string;
}): Promise<FirestoreTrustedContactRequest> {
  const target = await findRegisteredAccount(params.targetEmailOrName);
  if (!target) {
    throw new Error(
      "ACCOUNT_NOT_FOUND: This person does not have a registered account in ONY. Please enter the email of an existing ONY user or share your invite link with them.",
    );
  }

  const senderEmailLower = params.fromEmail.trim().toLowerCase();
  if (
    target.uid === params.fromUid ||
    (senderEmailLower && target.emailLower === senderEmailLower)
  ) {
    throw new Error("SELF_REQUEST: You cannot add your own account as your trusted contact.");
  }

  const requestId = `trusted_req_${params.fromUid}_${target.uid}`;
  const path = `trustedContactRequests/${requestId}`;
  const now = new Date().toISOString();
  const resolvedPhone = params.contactPhone.trim() || target.phoneNumber || "";
  const requestData: FirestoreTrustedContactRequest = {
    id: requestId,
    fromUid: params.fromUid,
    fromName: params.fromName.trim() || "ONY Member",
    fromEmail: senderEmailLower,
    fromEmailLower: senderEmailLower,
    toUid: target.uid,
    toName: target.displayName,
    toEmail: target.email,
    toEmailLower: target.emailLower,
    contactPhone: resolvedPhone,
    relationshipNote: (params.relationshipNote || "").trim(),
    requestKind: "direct_invite",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, "trustedContactRequests", requestId), requestData, { merge: true });
    return requestData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export interface SendInviteLinkRequestParams {
  requesterUid?: string;
  friendUid?: string;
  requesterName?: string;
  friendName?: string;
  requesterEmail?: string;
  friendEmail?: string;
  requesterPhone?: string;
  friendPhone?: string;
  inviterUid: string;
  inviterName?: string;
  inviterEmail?: string;
  relationshipNote?: string;
}

export async function sendTrustedContactRequestViaInviteLink(
  params: SendInviteLinkRequestParams,
): Promise<FirestoreTrustedContactRequest> {
  const resolvedRequesterUid = (
    params.requesterUid ||
    params.friendUid ||
    auth.currentUser?.uid ||
    ""
  ).trim();
  if (!resolvedRequesterUid) {
    throw new Error("AUTH_REQUIRED: Please sign in before accepting a Trusted Contact invite link.");
  }

  const resolvedRequesterName = (
    params.requesterName ||
    params.friendName ||
    auth.currentUser?.displayName ||
    "ONY Friend"
  ).trim();
  const resolvedRequesterEmail = (
    params.requesterEmail ||
    params.friendEmail ||
    auth.currentUser?.email ||
    ""
  )
    .trim()
    .toLowerCase();
  const resolvedRequesterPhone = (
    params.requesterPhone ||
    params.friendPhone ||
    ""
  ).trim();

  const resolvedInviterUid = (params.inviterUid || "").trim();
  let resolvedInviterName = (params.inviterName || "").trim();
  let resolvedInviterEmail = (params.inviterEmail || "").trim().toLowerCase();

  if (!resolvedInviterUid) {
    throw new Error("INVALID_INVITE: Invalid invite link (missing inviter ID).");
  }

  if (!resolvedInviterEmail || !resolvedInviterName) {
    const inviterAcc = await findRegisteredAccountByUid(resolvedInviterUid).catch(() => null);
    if (inviterAcc) {
      if (!resolvedInviterEmail) {
        resolvedInviterEmail = (inviterAcc.emailLower || inviterAcc.email || "").toLowerCase();
      }
      if (!resolvedInviterName) {
        resolvedInviterName = inviterAcc.displayName;
      }
    }
  }

  if (
    resolvedRequesterUid === resolvedInviterUid ||
    (resolvedRequesterEmail && resolvedInviterEmail && resolvedRequesterEmail === resolvedInviterEmail)
  ) {
    throw new Error("SELF_REQUEST: You cannot request to be your own emergency contact.");
  }

  const requestId = `trusted_req_link_${resolvedRequesterUid}_${resolvedInviterUid}`;
  const path = `trustedContactRequests/${requestId}`;
  const now = new Date().toISOString();
  const requestData: FirestoreTrustedContactRequest = {
    id: requestId,
    fromUid: resolvedRequesterUid,
    fromName: resolvedRequesterName,
    fromEmail: resolvedRequesterEmail,
    fromEmailLower: resolvedRequesterEmail,
    toUid: resolvedInviterUid,
    toName: resolvedInviterName || "ONY Member",
    toEmail: resolvedInviterEmail,
    toEmailLower: resolvedInviterEmail,
    contactPhone: resolvedRequesterPhone,
    relationshipNote:
      (params.relationshipNote || "").trim() ||
      "Requested via your shared Trusted Contact invite link.",
    requestKind: "invite_link",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, "trustedContactRequests", requestId), requestData, { merge: true });
    if (resolvedRequesterPhone && resolvedRequesterEmail) {
      await syncRegisteredAccount({
        uid: resolvedRequesterUid,
        displayName: resolvedRequesterName,
        email: resolvedRequesterEmail,
        phoneNumber: resolvedRequesterPhone,
      }).catch(() => {});
    }
    return requestData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function listTrustedContactRequests(
  uid: string,
  email?: string | null,
): Promise<{
  outgoing: FirestoreTrustedContactRequest[];
  incoming: FirestoreTrustedContactRequest[];
}> {
  if (!uid) return { outgoing: [], incoming: [] };
  const path = "trustedContactRequests";
  try {
    const colRef = collection(db, "trustedContactRequests");
    const emailLower = (auth.currentUser?.email || email || "").trim().toLowerCase();

    const primaryQueries = [
      getDocs(query(colRef, where("fromUid", "==", uid))),
      getDocs(query(colRef, where("toUid", "==", uid))),
    ];
    const [fromSnap, toSnap, emailSnap] = await Promise.all([
      primaryQueries[0],
      primaryQueries[1],
      emailLower
        ? getDocs(query(colRef, where("toEmailLower", "==", emailLower))).catch(() => null)
        : Promise.resolve(null),
    ]);
    const snaps = [fromSnap, toSnap, ...(emailSnap ? [emailSnap] : [])];
    const byId = new Map<string, FirestoreTrustedContactRequest>();

    for (const snap of snaps) {
      for (const d of snap.docs) {
        const raw = d.data() as Record<string, unknown>;
        byId.set(d.id, {
          id: d.id,
          fromUid: String(raw.fromUid || ""),
          fromName: String(raw.fromName || "ONY Member"),
          fromEmail: String(raw.fromEmail || ""),
          fromEmailLower: String(raw.fromEmailLower || ""),
          toUid: String(raw.toUid || ""),
          toName: String(raw.toName || "ONY Member"),
          toEmail: String(raw.toEmail || ""),
          toEmailLower: String(raw.toEmailLower || ""),
          contactPhone: String(raw.contactPhone || ""),
          relationshipNote: raw.relationshipNote ? String(raw.relationshipNote) : undefined,
          requestKind: raw.requestKind === "invite_link" ? "invite_link" : "direct_invite",
          status:
            raw.status === "accepted" || raw.status === "rejected"
              ? raw.status
              : "pending",
          createdAt: String(raw.createdAt || new Date().toISOString()),
          updatedAt: String(raw.updatedAt || raw.createdAt || new Date().toISOString()),
          respondedAt: raw.respondedAt ? String(raw.respondedAt) : undefined,
        });
      }
    }

    const allRequests = Array.from(byId.values()).sort((a, b) =>
      (b.updatedAt || "").localeCompare(a.updatedAt || ""),
    );

    const outgoing = allRequests.filter((r) => r.fromUid === uid);
    const incoming = allRequests.filter(
      (r) => r.toUid === uid || (emailLower && (r.toEmailLower || r.toEmail).toLowerCase() === emailLower),
    );

    return { outgoing, incoming };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function respondToTrustedContactRequest(
  requestId: string,
  decision: "accepted" | "rejected",
): Promise<void> {
  const path = `trustedContactRequests/${requestId}`;
  try {
    const now = new Date().toISOString();
    await updateDoc(doc(db, "trustedContactRequests", requestId), {
      status: decision,
      respondedAt: now,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTrustedContactRequest(requestId: string): Promise<void> {
  const path = `trustedContactRequests/${requestId}`;
  try {
    await deleteDoc(doc(db, "trustedContactRequests", requestId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// OWNER-PRIVATE AUDIT LOGS (users/{uid}/auditLogs)
// ============================================================================

export type SystemLogLevel = "info" | "warn" | "error" | "security" | "audit";
export type SystemLogCategory =
  | "auth"
  | "safety"
  | "privacy"
  | "sync"
  | "system"
  | "user_action";

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: SystemLogLevel;
  category: SystemLogCategory;
  action: string;
  message: string;
  userId?: string | null;
  userEmail?: string | null;
  clientInfo?: {
    platform: string;
    userAgent: string;
    version: string;
  };
  metadata?: Record<string, unknown>;
}

export async function writeSystemLog(entry: {
  level: SystemLogLevel;
  category: SystemLogCategory;
  action: string;
  message: string;
  userId?: string | null;
  userEmail?: string | null;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}): Promise<string> {
  const uid = entry.userId || auth.currentUser?.uid;
  const now = entry.timestamp || new Date().toISOString();
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  if (!uid) {
    return logId;
  }

  const payload: SystemLogEntry = {
    id: logId,
    timestamp: now,
    level: entry.level,
    category: entry.category,
    action: entry.action,
    message: entry.message,
    userId: uid,
    userEmail: entry.userEmail || auth.currentUser?.email || null,
    clientInfo: {
      platform: typeof navigator !== "undefined" ? navigator.platform || "web" : "server",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "web-client",
      version: "1.0.0",
    },
    metadata: entry.metadata || {},
  };

  try {
    await setDoc(doc(db, "users", uid, "auditLogs", logId), stripUndefinedDeep(payload));
  } catch (err) {
    console.debug("[ONY Audit] Could not persist user audit log:", err);
  }

  return logId;
}

export async function listSystemLogs(limitCount = 60, uid?: string): Promise<SystemLogEntry[]> {
  const targetUid = uid || auth.currentUser?.uid;
  if (!targetUid) return [];
  try {
    const q = query(
      collection(db, "users", targetUid, "auditLogs"),
      orderBy("timestamp", "desc"),
      limit(limitCount),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const d = docSnap.data() as Partial<SystemLogEntry>;
      return {
        id: docSnap.id,
        timestamp: d.timestamp || new Date().toISOString(),
        level: (d.level as SystemLogLevel) || "info",
        category: (d.category as SystemLogCategory) || "system",
        action: d.action || "EVENT",
        message: d.message || "",
        userId: d.userId || targetUid,
        userEmail: d.userEmail || null,
        clientInfo: d.clientInfo,
        metadata: d.metadata || {},
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${targetUid}/auditLogs`);
  }
}

export function formatLogsAsTextFile(logs: SystemLogEntry[]): string {
  const header = [
    "# ==============================================================================",
    "# ONY Mental Wellness Companion - Personal Account Security & Activity Log",
    `# Exported At: ${new Date().toISOString()}`,
    `# Total Log Records: ${logs.length}`,
    "# ==============================================================================",
    "",
  ].join("\n");

  const lines = logs.map((log) => {
    const metaStr =
      log.metadata && Object.keys(log.metadata).length > 0
        ? ` | metadata=${JSON.stringify(log.metadata)}`
        : "";
    const userStr = log.userEmail ? ` | user=${log.userEmail}` : log.userId ? ` | uid=${log.userId}` : "";
    return `[${log.timestamp}] [${log.level.toUpperCase().padEnd(8)}] [${log.category.toUpperCase().padEnd(10)}] [${log.action}] ${log.message}${userStr}${metaStr}`;
  });

  return header + lines.join("\n") + "\n";
}

export function downloadLogFile(content: string, filename: string, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// FULL ACCOUNT DATA EXPORT & FULL ACCOUNT DELETION
// ============================================================================

export async function exportUserData(uid: string): Promise<Record<string, unknown>> {
  const cleanUid = uid.trim();
  if (!cleanUid) {
    throw new Error("Authentication required to export account data.");
  }

  const [
    profile,
    settings,
    moodCheckins,
    memories,
    journalEntries,
    conversations,
    savedPosts,
    hiddenPosts,
    blockedUsers,
    voucherClaims,
    toolkitCompletions,
    auditLogs,
    shelvesSnap,
    booksSnap,
    inboxMessages,
    sentMessagesSnap,
    authoredPostsSnap,
    globeNodeSnap,
  ] = await Promise.all([
    getUserProfile(cleanUid).catch(() => null),
    getUserSettingsDoc(cleanUid).catch(() => null),
    listMoodEntries(cleanUid).catch(() => []),
    listMemories(cleanUid).catch(() => []),
    listJournalEntries(cleanUid).catch(() => []),
    listConversations(cleanUid).catch(() => []),
    listSavedPostIds(cleanUid).catch(() => []),
    listHiddenPostIds(cleanUid).catch(() => []),
    listBlockedUserIds(cleanUid).catch(() => []),
    listVoucherClaims(cleanUid).catch(() => []),
    listToolkitCompletions(cleanUid).catch(() => []),
    listSystemLogs(200, cleanUid).catch(() => []),
    getDocs(collection(db, "users", cleanUid, "vaultShelves")).catch(() => null),
    getDocs(collection(db, "users", cleanUid, "vaultBooks")).catch(() => null),
    listCommunityMessages(cleanUid).catch(() => []),
    getDocs(query(collection(db, "communityMessages"), where("fromUserId", "==", cleanUid))).catch(() => null),
    getDocs(query(collection(db, "communityPosts"), where("authorId", "==", cleanUid))).catch(() => null),
    getDoc(doc(db, "globeUsers", cleanUid)).catch(() => null),
  ]);

  const vaultShelves = shelvesSnap ? shelvesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
  const vaultBooks = booksSnap ? booksSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
  const vaultPages: Record<string, unknown>[] = [];
  if (booksSnap) {
    for (const bDoc of booksSnap.docs) {
      const pSnap = await getDocs(collection(db, "users", cleanUid, "vaultBooks", bDoc.id, "pages")).catch(() => null);
      if (pSnap) {
        pSnap.docs.forEach((p) => vaultPages.push({ id: p.id, bookId: bDoc.id, ...p.data() }));
      }
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: 2,
    uid: cleanUid,
    profile,
    settings,
    globeNode: globeNodeSnap?.exists() ? globeNodeSnap.data() : null,
    moodCheckins,
    memories,
    journalEntries,
    conversations,
    vault: {
      shelves: vaultShelves,
      books: vaultBooks,
      pages: vaultPages,
    },
    community: {
      authoredPosts: authoredPostsSnap ? authoredPostsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : [],
      savedPostIds: savedPosts,
      hiddenPostIds: hiddenPosts,
      blockedUserIds: blockedUsers,
      receivedSupportMessages: inboxMessages,
      sentSupportMessages: sentMessagesSnap ? sentMessagesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : [],
    },
    voucherClaims,
    toolkitCompletions,
    auditLogs,
  };
}

export async function deleteUserData(uid: string): Promise<void> {
  const cleanUid = uid.trim();
  if (!cleanUid) return;

  // 1. Delete nested vaultBooks/{bookId}/pages/{pageId}
  try {
    const booksSnap = await getDocs(collection(db, "users", cleanUid, "vaultBooks"));
    for (const bDoc of booksSnap.docs) {
      const pagesSnap = await getDocs(collection(db, "users", cleanUid, "vaultBooks", bDoc.id, "pages"));
      for (const pDoc of pagesSnap.docs) {
        await deleteDoc(pDoc.ref);
      }
      await deleteDoc(bDoc.ref);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${cleanUid}/vaultBooks`);
  }

  // 2. Delete flat user subcollections
  const subcollections = [
    "vaultShelves",
    "moodCheckins",
    "memories",
    "journalEntries",
    "conversations",
    "savedPosts",
    "hiddenPosts",
    "blockedUsers",
    "voucherClaims",
    "toolkitCompletions",
    "auditLogs",
  ];
  for (const sub of subcollections) {
    const path = `users/${cleanUid}/${sub}`;
    try {
      const snap = await getDocs(collection(db, "users", cleanUid, sub));
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // 3. Delete authored communityPosts, messages, trustedContactRequests, feedbackReports
  const crossCollectionDeletes: Promise<void>[] = [
    getDocs(query(collection(db, "communityPosts"), where("authorId", "==", cleanUid)))
      .then((snap) => Promise.all(snap.docs.map((d) => deleteDoc(d.ref))).then(() => undefined))
      .catch(() => undefined),
    getDocs(query(collection(db, "communityMessages"), where("fromUserId", "==", cleanUid)))
      .then((snap) => Promise.all(snap.docs.map((d) => deleteDoc(d.ref))).then(() => undefined))
      .catch(() => undefined),
    getDocs(query(collection(db, "communityMessages"), where("toUserId", "==", cleanUid)))
      .then((snap) => Promise.all(snap.docs.map((d) => deleteDoc(d.ref))).then(() => undefined))
      .catch(() => undefined),
    getDocs(query(collection(db, "trustedContactRequests"), where("fromUid", "==", cleanUid)))
      .then((snap) => Promise.all(snap.docs.map((d) => deleteDoc(d.ref))).then(() => undefined))
      .catch(() => undefined),
    getDocs(query(collection(db, "trustedContactRequests"), where("toUid", "==", cleanUid)))
      .then((snap) => Promise.all(snap.docs.map((d) => deleteDoc(d.ref))).then(() => undefined))
      .catch(() => undefined),
    getDocs(query(collection(db, "feedbackReports"), where("userId", "==", cleanUid)))
      .then((snap) => Promise.all(snap.docs.map((d) => deleteDoc(d.ref))).then(() => undefined))
      .catch(() => undefined),
  ];
  await Promise.all(crossCollectionDeletes);

  // 4. Delete top-level user docs
  await Promise.all([
    deleteDoc(doc(db, "user_settings", cleanUid)).catch(() => {}),
    deleteDoc(doc(db, "userDirectory", cleanUid)).catch(() => {}),
    deleteDoc(doc(db, "globeUsers", cleanUid)).catch(() => {}),
    deleteDoc(doc(db, "users", cleanUid)),
  ]);

  clearLocalJournalCache(cleanUid);
}
