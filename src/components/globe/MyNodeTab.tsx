import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FirestoreCommunityMessage } from "../../firebase/firestore";
import { getCachedTranscript } from "../../services/communityTranslationService";
import {
  formatInboxSenderLabel,
  getDateBucketKey,
  getMyNodeStrings,
  getSenderBlockKey,
  isMessageUnread,
  loadAutoTranslatePref,
  loadBlockedSenders,
  loadReadMessageIds,
  loadUnreadOverrideIds,
  parseMessageTimestamp,
  saveAutoTranslatePref,
  saveBlockedSenders,
  saveReadMessageIds,
  saveUnreadOverrideIds,
  type BlockedSenderEntry,
  type DateBucketKey,
  type InboxFilterKind,
  type InboxMessage,
} from "../../utils/nodeInboxHelpers";
import InboxFilterChips from "./InboxFilterChips";
import MessageRow from "./MessageRow";
import NodeHeader from "./NodeHeader";
import NodeSettingsScreen from "./NodeSettingsScreen";

export type NotifyInput =
  | string
  | { text: string; actionLabel?: string; onAction?: () => void };

export interface MyNodeTabProps {
  discoverable: boolean;
  acceptMessages: boolean;
  onSetDiscoverable: (v: boolean) => void;
  onSetAcceptMessages: (v: boolean) => void;
  myMoodEmoji: string;
  myMoodLabel: string;
  myMoodGlow?: string;
  myRegion: { state: string; country: string };
  onUpdateMood?: () => void;
  onLocateOnGlobe: () => void;
  messages: FirestoreCommunityMessage[];
  loadingMessages: boolean;
  messagesError?: string | null;
  onRefreshMessages: () => void;
  onDeleteMessage?: (id: string) => Promise<void> | void;
  onReportMessage?: (id: string) => void;
  detectingLocation?: boolean;
  locationChoice?: "none" | "allowed" | "declined";
  onEnableLocation?: () => void;
  onClearLocation?: () => void;
  onSelectManualArea?: () => void;
  renderAreaPicker?: () => React.ReactNode;
  notify?: (msg: NotifyInput) => void;
  language?: string;
}

type VirtualEntry =
  | {
      type: "header";
      key: string;
      bucket: DateBucketKey;
      label: string;
      count: number;
    }
  | {
      type: "message";
      key: string;
      bucket: DateBucketKey;
      message: InboxMessage;
    };

const PAGE_SIZE = 20;
const OVERSCAN_PX = 360;

export default function MyNodeTab({
  discoverable,
  acceptMessages,
  onSetDiscoverable,
  onSetAcceptMessages,
  myMoodEmoji,
  myMoodLabel,
  myMoodGlow = "soft",
  myRegion,
  onUpdateMood,
  onLocateOnGlobe,
  messages,
  loadingMessages,
  messagesError = null,
  onRefreshMessages,
  onDeleteMessage,
  onReportMessage,
  detectingLocation = false,
  onEnableLocation,
  onSelectManualArea,
  renderAreaPicker,
  notify = () => {},
  language = "English",
}: MyNodeTabProps) {
  const strings = getMyNodeStrings(language);

  // Settings screen state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Auto-translate preference (controlled inside NodeSettingsScreen)
  const [autoTranslate, setAutoTranslate] = useState<boolean>(() => loadAutoTranslatePref());
  const handleToggleAutoTranslate = useCallback(
    (checked: boolean) => {
      setAutoTranslate(checked);
      saveAutoTranslatePref(checked);
      notify(
        checked
          ? language === "中文"
            ? "已开启自动翻译支持留言"
            : language === "Bahasa Melayu"
              ? "Auto-terjemah mesej sokongan diaktifkan"
              : "Auto-translate enabled for community messages"
          : language === "中文"
            ? "已关闭自动翻译，将显示原文"
            : language === "Bahasa Melayu"
              ? "Auto-terjemah dimatikan"
              : "Auto-translate turned off",
      );
    },
    [language, notify],
  );

  // Local read/unread state & blocked senders state
  // TODO: Persist `isRead` & `readAt` directly on `communityMessages/{id}` and `blockedSenderIds` on user/node preferences in Firestore when backend fields are added.
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadMessageIds());
  const [unreadOverrideIds, setUnreadOverrideIds] = useState<Set<string>>(() =>
    loadUnreadOverrideIds(),
  );
  const [blockedSenders, setBlockedSenders] = useState<BlockedSenderEntry[]>(() =>
    loadBlockedSenders(),
  );

  // Transcript cache mirror so search matches live-fetched transcripts too
  const [resolvedTranscripts, setResolvedTranscripts] = useState<Record<string, string>>({});
  const handleTranscriptResolved = useCallback((id: string, transcript: string) => {
    setResolvedTranscripts((prev) => (prev[id] === transcript ? prev : { ...prev, [id]: transcript }));
  }, []);

  // Soft-deleted IDs pending undo snackbar completion
  const [pendingDeletedIds, setPendingDeletedIds] = useState<Set<string>>(() => new Set());
  const deleteTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    return () => {
      deleteTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      deleteTimersRef.current.clear();
    };
  }, []);

  // Toolbar filter & search state
  const [filter, setFilter] = useState<InboxFilterKind>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Multi-select mode
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectionMode = selectedIds.size > 0;

  // Pagination (load 20 at a time with infinite scroll)
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  // Scroll & header collapse
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(460);

  // Pull-to-refresh gesture tracking
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartYRef = useRef<number | null>(null);

  const blockedSenderIdSet = useMemo(
    () => new Set(blockedSenders.map((b) => b.id)),
    [blockedSenders],
  );

  // Active inbox messages excluding blocked senders and pending soft-deletes, newest first
  const activeMessages = useMemo(() => {
    return [...messages]
      .filter((m) => !pendingDeletedIds.has(m.id))
      .filter((m) => !blockedSenderIdSet.has(getSenderBlockKey(m)))
      .sort((a, b) => parseMessageTimestamp(b.createdAt) - parseMessageTimestamp(a.createdAt));
  }, [messages, pendingDeletedIds, blockedSenderIdSet]);

  // Filter counts
  const counts = useMemo(() => {
    let unread = 0;
    let text = 0;
    let voice = 0;
    for (const msg of activeMessages) {
      if (isMessageUnread(msg, readIds, unreadOverrideIds)) unread++;
      if (msg.kind === "voice") voice++;
      else text++;
    }
    return {
      all: activeMessages.length,
      unread,
      text,
      voice,
    };
  }, [activeMessages, readIds, unreadOverrideIds]);

  // Apply filter chip + search query (searching text + transcripts)
  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeMessages.filter((msg) => {
      if (filter === "unread" && !isMessageUnread(msg, readIds, unreadOverrideIds)) return false;
      if (filter === "text" && msg.kind === "voice") return false;
      if (filter === "voice" && msg.kind !== "voice") return false;

      if (q) {
        const transcript =
          resolvedTranscripts[msg.id] ||
          msg.transcription ||
          getCachedTranscript(msg.id, msg.audioUrl) ||
          "";
        const sender = formatInboxSenderLabel(msg.senderAnonymous, language);
        const haystack = `${msg.text || ""} ${transcript} ${sender}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    activeMessages,
    filter,
    searchQuery,
    readIds,
    unreadOverrideIds,
    resolvedTranscripts,
    language,
  ]);

  // Reset pagination when filter or search changes
  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    setScrollTop(0);
    setHeaderCollapsed(false);
  }, [filter, searchQuery]);

  // Paged slice (20 at a time)
  const pagedMessages = useMemo(
    () => filteredMessages.slice(0, visibleLimit),
    [filteredMessages, visibleLimit],
  );
  const hasMorePages = pagedMessages.length < filteredMessages.length;

  const handleLoadMore = useCallback(() => {
    if (!hasMorePages || loadingMore) return;
    setLoadingMore(true);
    window.setTimeout(() => {
      setVisibleLimit((prev) => prev + PAGE_SIZE);
      setLoadingMore(false);
    }, 160);
  }, [hasMorePages, loadingMore]);

  // Flatten date buckets into virtual entries (`Today`, `Yesterday`, `This week`, `Earlier`)
  const virtualEntries = useMemo<VirtualEntry[]>(() => {
    const now = new Date();
    const bucketOrder: DateBucketKey[] = ["today", "yesterday", "thisWeek", "earlier"];
    const bucketLabels: Record<DateBucketKey, string> = {
      today: strings.today,
      yesterday: strings.yesterday,
      thisWeek: strings.thisWeek,
      earlier: strings.earlier,
    };

    const grouped: Record<DateBucketKey, InboxMessage[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: [],
    };

    for (const msg of pagedMessages) {
      const bucket = getDateBucketKey(parseMessageTimestamp(msg.createdAt), now);
      grouped[bucket].push(msg);
    }

    const list: VirtualEntry[] = [];
    for (const b of bucketOrder) {
      const items = grouped[b];
      if (items.length === 0) continue;
      list.push({
        type: "header",
        key: `hdr_${b}`,
        bucket: b,
        label: bucketLabels[b],
        count: items.length,
      });
      for (const msg of items) {
        list.push({
          type: "message",
          key: msg.id,
          bucket: b,
          message: msg,
        });
      }
    }
    return list;
  }, [pagedMessages, strings.today, strings.yesterday, strings.thisWeek, strings.earlier]);

  // Variable-height virtualizer measurements
  const heightsRef = useRef<Map<string, number>>(new Map());
  const [measureVersion, setMeasureVersion] = useState(0);

  const measureItemRef = useCallback(
    (key: string) => (el: HTMLDivElement | null) => {
      if (!el) return;
      const h = Math.ceil(el.getBoundingClientRect().height);
      if (h > 0 && heightsRef.current.get(key) !== h) {
        heightsRef.current.set(key, h);
        setMeasureVersion((v) => v + 1);
      }
    },
    [],
  );

  // Measure viewport container height
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const updateHeight = () => {
      setViewportHeight(container.clientHeight || 460);
    };
    updateHeight();

    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(updateHeight);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Compute virtual window offsets & active sticky date header
  const virtualLayout = useMemo(() => {
    void measureVersion;
    const gapPx = 8;
    const offsets: number[] = [];
    const heights: number[] = [];
    let cursor = 0;

    for (let i = 0; i < virtualEntries.length; i++) {
      const entry = virtualEntries[i];
      const estimated =
        entry.type === "header" ? 30 : entry.message.kind === "voice" ? 112 : 104;
      const h = heightsRef.current.get(entry.key) ?? estimated;
      offsets.push(cursor);
      heights.push(h);
      cursor += h + gapPx;
    }

    const totalHeight = Math.max(0, cursor - (virtualEntries.length > 0 ? gapPx : 0));
    const minY = Math.max(0, scrollTop - OVERSCAN_PX);
    const maxY = scrollTop + viewportHeight + OVERSCAN_PX;

    let startIdx = 0;
    while (
      startIdx < virtualEntries.length &&
      offsets[startIdx] + heights[startIdx] < minY
    ) {
      startIdx++;
    }

    let endIdx = startIdx;
    while (endIdx < virtualEntries.length && offsets[endIdx] <= maxY) {
      endIdx++;
    }

    // Determine currently active sticky bucket at scrollTop
    let activeStickyLabel: string | null = null;
    if (scrollTop > 18 && virtualEntries.length > 0) {
      for (let i = 0; i < virtualEntries.length; i++) {
        if (offsets[i] <= scrollTop + 10) {
          const b = virtualEntries[i].bucket;
          activeStickyLabel =
            b === "today"
              ? strings.today
              : b === "yesterday"
                ? strings.yesterday
                : b === "thisWeek"
                  ? strings.thisWeek
                  : strings.earlier;
        } else {
          break;
        }
      }
    }

    const topSpacer = startIdx < offsets.length ? offsets[startIdx] : 0;
    const lastRenderedBottom =
      endIdx > startIdx ? offsets[endIdx - 1] + heights[endIdx - 1] : topSpacer;
    const bottomSpacer = Math.max(0, totalHeight - lastRenderedBottom);

    return {
      slice: virtualEntries.slice(startIdx, endIdx),
      topSpacer,
      bottomSpacer,
      activeStickyLabel,
    };
  }, [
    virtualEntries,
    scrollTop,
    viewportHeight,
    measureVersion,
    strings.today,
    strings.yesterday,
    strings.thisWeek,
    strings.earlier,
  ]);

  // Read / Unread mutators
  const markMessagesRead = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setReadIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of ids) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      if (!changed) return prev;
      saveReadMessageIds(next);
      return next;
    });
    setUnreadOverrideIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of ids) {
        if (next.delete(id)) changed = true;
      }
      if (!changed) return prev;
      saveUnreadOverrideIds(next);
      return next;
    });
  }, []);

  const handleToggleUnread = useCallback((id: string, nextUnread: boolean) => {
    if (nextUnread) {
      setReadIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        saveReadMessageIds(next);
        return next;
      });
      setUnreadOverrideIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        saveUnreadOverrideIds(next);
        return next;
      });
    } else {
      markMessagesRead([id]);
    }
  }, [markMessagesRead]);

  const handleMarkAllRead = useCallback(() => {
    const allIds = activeMessages.map((m) => m.id);
    markMessagesRead(allIds);
    notify(strings.markedAllReadToast);
  }, [activeMessages, markMessagesRead, notify, strings.markedAllReadToast]);

  // IntersectionObserver: mark unread messages read automatically when scrolled into view
  const dwellTimersRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || typeof IntersectionObserver === "undefined") return;

    const unreadVisibleIds = new Set(
      activeMessages
        .filter((m) => isMessageUnread(m, readIds, unreadOverrideIds))
        .map((m) => m.id),
    );
    if (unreadVisibleIds.size === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const msgId = (entry.target as HTMLElement).dataset.messageId;
          if (!msgId || !unreadVisibleIds.has(msgId)) continue;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            if (!dwellTimersRef.current.has(msgId)) {
              const tId = window.setTimeout(() => {
                dwellTimersRef.current.delete(msgId);
                markMessagesRead([msgId]);
              }, 650);
              dwellTimersRef.current.set(msgId, tId);
            }
          } else {
            const existing = dwellTimersRef.current.get(msgId);
            if (existing !== undefined) {
              window.clearTimeout(existing);
              dwellTimersRef.current.delete(msgId);
            }
          }
        }
      },
      { root: container, threshold: [0.55] },
    );

    const rows = container.querySelectorAll<HTMLElement>("[data-message-id]");
    rows.forEach((row) => observer.observe(row));

    return () => {
      observer.disconnect();
      dwellTimersRef.current.forEach((tId) => window.clearTimeout(tId));
      dwellTimersRef.current.clear();
    };
  }, [activeMessages, readIds, unreadOverrideIds, virtualLayout.slice, markMessagesRead]);

  // Infinite scroll sentinel observer
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const container = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!container || !sentinel || !hasMorePages || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          handleLoadMore();
        }
      },
      { root: container, rootMargin: "120px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMorePages, handleLoadMore]);

  // Soft-delete with Undo snackbar
  const scheduleDeleteWithUndo = useCallback(
    (idsToDelete: string[]) => {
      if (idsToDelete.length === 0) return;

      setPendingDeletedIds((prev) => {
        const next = new Set(prev);
        idsToDelete.forEach((id) => next.add(id));
        return next;
      });
      setSelectedIds((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set(prev);
        idsToDelete.forEach((id) => next.delete(id));
        return next;
      });

      const batchKey = idsToDelete.join(",");
      const timerId = window.setTimeout(() => {
        deleteTimersRef.current.delete(batchKey);
        idsToDelete.forEach((id) => {
          void onDeleteMessage?.(id);
        });
      }, 4600);
      deleteTimersRef.current.set(batchKey, timerId);

      notify({
        text:
          idsToDelete.length === 1
            ? strings.deletedUndo
            : strings.deletedBulkUndo(idsToDelete.length),
        actionLabel: strings.undo,
        onAction: () => {
          const pendingTimer = deleteTimersRef.current.get(batchKey);
          if (pendingTimer !== undefined) {
            window.clearTimeout(pendingTimer);
            deleteTimersRef.current.delete(batchKey);
          }
          setPendingDeletedIds((prev) => {
            const next = new Set(prev);
            idsToDelete.forEach((id) => next.delete(id));
            return next;
          });
        },
      });
    },
    [onDeleteMessage, notify, strings],
  );

  // Delete all messages (from NodeSettingsScreen after confirmation)
  const handleDeleteAllMessages = useCallback(() => {
    const allIds = activeMessages.map((m) => m.id);
    if (allIds.length === 0) return;
    allIds.forEach((id) => {
      void onDeleteMessage?.(id);
    });
    notify(strings.deletedAllToast);
  }, [activeMessages, onDeleteMessage, notify, strings.deletedAllToast]);

  // Block / Unblock sender
  const handleBlockSender = useCallback(
    (msg: InboxMessage) => {
      const key = getSenderBlockKey(msg);
      const label = formatInboxSenderLabel(msg.senderAnonymous, language);
      setBlockedSenders((prev) => {
        if (prev.some((b) => b.id === key)) return prev;
        const next = [
          ...prev,
          { id: key, label, blockedAt: new Date().toISOString() },
        ];
        saveBlockedSenders(next);
        return next;
      });
      notify(strings.senderBlockedToast(label));
    },
    [language, notify, strings],
  );

  const handleUnblockSender = useCallback(
    (senderId: string) => {
      setBlockedSenders((prev) => {
        const target = prev.find((b) => b.id === senderId);
        const next = prev.filter((b) => b.id !== senderId);
        saveBlockedSenders(next);
        if (target) notify(strings.senderUnblockedToast(target.label));
        return next;
      });
    },
    [notify, strings],
  );

  // Selection helpers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const enterSelectionMode = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkMarkRead = useCallback(() => {
    const ids = Array.from(selectedIds);
    markMessagesRead(ids);
    clearSelection();
    notify(strings.markedAllReadToast);
  }, [selectedIds, markMessagesRead, clearSelection, notify, strings.markedAllReadToast]);

  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    clearSelection();
    scheduleDeleteWithUndo(ids);
  }, [selectedIds, clearSelection, scheduleDeleteWithUndo]);

  // Inbox scroll listener
  const handleInboxScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop;
    setScrollTop(y);
    setHeaderCollapsed(y > 28);
  };

  // Pull-to-refresh handlers on inbox top
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop <= 0 && e.touches.length === 1) {
      pullStartYRef.current = e.touches[0].clientY;
    } else {
      pullStartYRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (pullStartYRef.current === null || scrollRef.current?.scrollTop) return;
    const dy = e.touches[0].clientY - pullStartYRef.current;
    if (dy > 0) {
      setPullDistance(Math.min(72, dy * 0.45));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= 48 && !loadingMessages) {
      onRefreshMessages();
    }
    pullStartYRef.current = null;
    setPullDistance(0);
  };

  return (
    <div className="my-node-tab-root">
      {/* 1. Compact Header (always visible, <= 20% viewport height, collapses smoothly on scroll) */}
      <NodeHeader
        discoverable={discoverable}
        myMoodEmoji={myMoodEmoji}
        myMoodLabel={myMoodLabel}
        myMoodGlow={myMoodGlow}
        myRegion={myRegion}
        messageCount={activeMessages.length}
        collapsed={headerCollapsed}
        onUpdateMood={onUpdateMood}
        onLocateOnGlobe={onLocateOnGlobe}
        onOpenSettings={() => setSettingsOpen(true)}
        onExpandHeader={() => {
          setHeaderCollapsed(false);
          scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        }}
        language={language}
      />

      {/* 2. Filter / Search Toolbar OR Multi-Select Action Bar */}
      {selectionMode ? (
        <div className="inbox-selection-bar" role="region" aria-label="Selected messages actions">
          <strong className="inbox-selection-count">
            {strings.selectedCount(selectedIds.size)}
          </strong>
          <div className="inbox-selection-btns">
            <button
              type="button"
              className="inbox-sel-btn"
              onClick={handleBulkMarkRead}
            >
              {strings.markRead}
            </button>
            <button
              type="button"
              className="inbox-sel-btn danger"
              onClick={handleBulkDelete}
            >
              {strings.deleteAction}
            </button>
            <button
              type="button"
              className="inbox-sel-btn subtle"
              onClick={clearSelection}
            >
              {strings.cancel}
            </button>
          </div>
        </div>
      ) : (
        <InboxFilterChips
          filter={filter}
          onChangeFilter={setFilter}
          counts={counts}
          searchOpen={searchOpen}
          searchQuery={searchQuery}
          onToggleSearch={() =>
            setSearchOpen((prev) => {
              if (prev) setSearchQuery("");
              return !prev;
            })
          }
          onChangeSearch={setSearchQuery}
          loading={loadingMessages}
          onRefresh={onRefreshMessages}
          onMarkAllRead={handleMarkAllRead}
          onOpenSettings={() => setSettingsOpen(true)}
          language={language}
        />
      )}

      {/* 3. Scrollable Virtualized Inbox */}
      <div
        ref={scrollRef}
        className="my-node-inbox-scroll"
        onScroll={handleInboxScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        aria-label={strings.inboxTitle}
      >
        {pullDistance > 16 && (
          <div className="inbox-pull-indicator" style={{ height: `${pullDistance}px` }}>
            <span>{strings.pullToRefresh}</span>
          </div>
        )}

        {/* Messages turned off inline banner (when archived messages still exist) */}
        {!acceptMessages && activeMessages.length > 0 && (
          <div className="inbox-paused-banner" role="status">
            <span>{strings.pausedInlineBanner}</span>
            <button
              type="button"
              className="inbox-paused-link-btn"
              onClick={() => setSettingsOpen(true)}
            >
              {strings.openSettings}
            </button>
          </div>
        )}

        {/* Inline refresh error banner when cached messages are visible */}
        {messagesError && activeMessages.length > 0 && (
          <div className="inbox-error-banner" role="alert">
            <span>{messagesError}</span>
            <button type="button" className="inbox-retry-inline" onClick={onRefreshMessages}>
              {strings.retry}
            </button>
          </div>
        )}

        {/* Sticky Active Bucket Header while scrolling virtualized rows */}
        {virtualLayout.activeStickyLabel && filteredMessages.length > 0 && (
          <div className="inbox-sticky-group-bar" aria-hidden="true">
            <span>{virtualLayout.activeStickyLabel}</span>
          </div>
        )}

        {/* Loading skeleton */}
        {loadingMessages && activeMessages.length === 0 && (
          <div className="my-node-skeleton-list" aria-busy="true">
            <div className="support-skeleton" />
            <div className="support-skeleton" />
            <div className="support-skeleton" />
          </div>
        )}

        {/* Full error state when no messages could load */}
        {!loadingMessages && messagesError && activeMessages.length === 0 && (
          <div className="my-node-empty-box" role="alert">
            <h3 className="empty-title">{strings.errorTitle}</h3>
            <p className="empty-desc">{messagesError}</p>
            <button
              type="button"
              className="inbox-empty-cta-btn"
              onClick={onRefreshMessages}
            >
              {strings.retry}
            </button>
          </div>
        )}

        {/* Empty State A: Messages paused & inbox empty */}
        {!loadingMessages &&
          !messagesError &&
          activeMessages.length === 0 &&
          !acceptMessages && (
            <div className="my-node-empty-box">
              <div className="empty-icon-wrap" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                  <line x1="12" y1="2" x2="12" y2="12" />
                </svg>
              </div>
              <h3 className="empty-title">{strings.pausedTitle}</h3>
              <p className="empty-desc">{strings.pausedDesc}</p>
              <button
                type="button"
                className="inbox-empty-cta-btn"
                onClick={() => setSettingsOpen(true)}
              >
                {strings.openNodeSettingsBtn}
              </button>
            </div>
          )}

        {/* Empty State B: No messages received yet */}
        {!loadingMessages &&
          !messagesError &&
          activeMessages.length === 0 &&
          acceptMessages && (
            <div className="my-node-empty-box">
              <div className="empty-icon-wrap" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 className="empty-title">{strings.emptyNoMessagesTitle}</h3>
              <p className="empty-desc">{strings.emptyNoMessagesDesc}</p>
            </div>
          )}

        {/* Empty State C: No results for current filter / search */}
        {!loadingMessages &&
          activeMessages.length > 0 &&
          filteredMessages.length === 0 && (
            <div className="my-node-empty-box">
              <h3 className="empty-title">{strings.emptyNoMatchesTitle}</h3>
              <p className="empty-desc">{strings.emptyNoMatchesDesc}</p>
              <button
                type="button"
                className="inbox-empty-cta-btn secondary"
                onClick={() => {
                  setFilter("all");
                  setSearchQuery("");
                }}
              >
                {strings.clearFilters}
              </button>
            </div>
          )}

        {/* Virtualized Date-Grouped Message List */}
        {filteredMessages.length > 0 && (
          <div className="inbox-virtual-list">
            {virtualLayout.topSpacer > 0 && (
              <div style={{ height: `${virtualLayout.topSpacer}px` }} aria-hidden="true" />
            )}

            {virtualLayout.slice.map((entry) => {
              if (entry.type === "header") {
                return (
                  <div
                    key={entry.key}
                    ref={measureItemRef(entry.key)}
                    className="inbox-date-group-header"
                  >
                    <span>{entry.label}</span>
                    <span className="inbox-date-group-count">({entry.count})</span>
                  </div>
                );
              }

              const msg = entry.message;
              return (
                <div key={entry.key} ref={measureItemRef(entry.key)}>
                  <MessageRow
                    message={msg}
                    isUnread={isMessageUnread(msg, readIds, unreadOverrideIds)}
                    autoTranslate={autoTranslate}
                    language={language}
                    selectionMode={selectionMode}
                    selected={selectedIds.has(msg.id)}
                    onToggleSelect={toggleSelect}
                    onEnterSelectionMode={enterSelectionMode}
                    onMarkRead={(id) => markMessagesRead([id])}
                    onToggleUnread={handleToggleUnread}
                    onSwipeDelete={(targetMsg) => scheduleDeleteWithUndo([targetMsg.id])}
                    onReport={onReportMessage}
                    onBlockSender={handleBlockSender}
                    onTranscriptResolved={handleTranscriptResolved}
                    onHeightChange={() => setMeasureVersion((v) => v + 1)}
                    notify={(m) => notify(m)}
                  />
                </div>
              );
            })}

            {virtualLayout.bottomSpacer > 0 && (
              <div style={{ height: `${virtualLayout.bottomSpacer}px` }} aria-hidden="true" />
            )}

            {/* Infinite scroll sentinel & loading footer */}
            {hasMorePages && (
              <div ref={sentinelRef} className="inbox-load-more-footer">
                {loadingMore ? (
                  <>
                    <span className="support-spinner mini" />
                    <span>{strings.loadingMore}</span>
                  </>
                ) : (
                  <button
                    type="button"
                    className="inbox-load-more-btn"
                    onClick={handleLoadMore}
                  >
                    {strings.loadMoreBtn}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Node Settings Screen (opened via Gear button or Paused CTA) */}
      <NodeSettingsScreen
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        discoverable={discoverable}
        acceptMessages={acceptMessages}
        onSetDiscoverable={onSetDiscoverable}
        onSetAcceptMessages={onSetAcceptMessages}
        autoTranslate={autoTranslate}
        onSetAutoTranslate={handleToggleAutoTranslate}
        myRegion={myRegion}
        detectingLocation={detectingLocation}
        onEnableLocation={onEnableLocation}
        onSelectManualArea={onSelectManualArea}
        renderAreaPicker={renderAreaPicker}
        blockedSenders={blockedSenders}
        onUnblockSender={handleUnblockSender}
        unreadCount={counts.unread}
        totalMessageCount={activeMessages.length}
        onMarkAllRead={handleMarkAllRead}
        onDeleteAllMessages={handleDeleteAllMessages}
        language={language}
      />
    </div>
  );
}
