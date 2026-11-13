import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AppLanguage } from "../../i18n/translations";
import {
  getCachedTranslation,
  translateCommunityText,
} from "../../services/communityTranslationService";
import {
  formatInboxMessageTime,
  formatInboxSenderLabel,
  getMyNodeStrings,
  parseMessageTimestamp,
  type InboxMessage,
} from "../../utils/nodeInboxHelpers";
import VoiceMessagePlayer from "./VoiceMessagePlayer";

export interface MessageRowProps {
  message: InboxMessage;
  isUnread: boolean;
  autoTranslate: boolean;
  language: string;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEnterSelectionMode: (id: string) => void;
  onMarkRead: (id: string) => void;
  onToggleUnread: (id: string, nextUnread: boolean) => void;
  onSwipeDelete: (message: InboxMessage) => void;
  onReport?: (id: string) => void;
  onBlockSender: (message: InboxMessage) => void;
  onTranscriptResolved?: (id: string, transcript: string) => void;
  onHeightChange?: () => void;
  notify?: (msg: string) => void;
}

export function MessageRow({
  message,
  isUnread,
  autoTranslate,
  language,
  selectionMode,
  selected,
  onToggleSelect,
  onEnterSelectionMode,
  onMarkRead,
  onToggleUnread,
  onSwipeDelete,
  onReport,
  onBlockSender,
  onTranscriptResolved,
  onHeightChange,
  notify = () => {},
}: MessageRowProps) {
  const strings = getMyNodeStrings(language);
  const appLang = language as AppLanguage;
  const kind = message.kind === "voice" ? "voice" : "text";
  const rawText = message.text || "";

  // Text expansion (3-line clamp)
  const [expanded, setExpanded] = useState(false);
  const [isClampedOverflow, setIsClampedOverflow] = useState(false);
  const textRef = useRef<HTMLParagraphElement | null>(null);

  // Translation state
  const [forceOriginal, setForceOriginal] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(() =>
    kind === "text" && rawText ? getCachedTranslation(rawText, appLang) : null,
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [voiceTranslationState, setVoiceTranslationState] = useState<{
    isTranslated: boolean;
    hasCached: boolean;
  }>({ isTranslated: false, hasCached: false });

  // Reset per-row override when autoTranslate changes
  useEffect(() => {
    setForceOriginal(!autoTranslate);
  }, [autoTranslate]);

  // Background auto-translate for text messages
  useEffect(() => {
    if (kind !== "text" || !rawText) return;
    const cached = getCachedTranslation(rawText, appLang);
    if (cached && cached !== rawText) {
      setTranslatedText(cached);
    }
    if (!autoTranslate) return;

    let active = true;
    void translateCommunityText(rawText, appLang)
      .then((res) => {
        if (!active) return;
        if (res && res !== rawText) {
          setTranslatedText(res);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [autoTranslate, kind, rawText, appLang]);

  const hasDiffTextTranslation = Boolean(
    kind === "text" && translatedText && translatedText !== rawText,
  );
  const showingTextTranslated = Boolean(
    hasDiffTextTranslation && !forceOriginal,
  );
  const displayText = showingTextTranslated && translatedText ? translatedText : rawText;

  // Measure whether clamped text overflows 3 lines
  useLayoutEffect(() => {
    if (kind !== "text" || !textRef.current) {
      setIsClampedOverflow(false);
      return;
    }
    const el = textRef.current;
    if (expanded) {
      // Preserve knowledge that it was expandable while open
      setIsClampedOverflow(true);
      return;
    }
    const overflows = el.scrollHeight > el.clientHeight + 2 || displayText.length > 140;
    setIsClampedOverflow(overflows);
  }, [displayText, expanded, kind, language]);

  // Notify virtualizer when expansion state alters height
  useEffect(() => {
    onHeightChange?.();
  }, [expanded, displayText]);

  // Portaled overflow menu ("...")
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number }>({
    top: 100,
    left: 160,
  });
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!menuOpen || !menuTriggerRef.current) return;
    const rect = menuTriggerRef.current.getBoundingClientRect();
    const menuWidth = 196;
    const estimatedHeight = 228;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - rect.bottom - 12;
    const top =
      spaceBelow < estimatedHeight && rect.top > estimatedHeight + 12
        ? Math.max(8, rect.top - estimatedHeight - 6)
        : Math.min(vh - estimatedHeight - 8, rect.bottom + 6);
    const left = Math.max(10, Math.min(rect.right - menuWidth, vw - menuWidth - 10));
    setMenuCoords({ top, left });
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!menuTriggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuTriggerRef.current?.focus();
      }
    };
    const handleScroll = () => setMenuOpen(false);

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [menuOpen]);

  // Manual translate trigger from menu or globe toggle
  const handleToggleTranslation = async () => {
    if (kind === "voice") {
      setForceOriginal((prev) => !prev);
      return;
    }

    if (showingTextTranslated) {
      setForceOriginal(true);
      return;
    }

    if (translatedText) {
      setForceOriginal(false);
      return;
    }

    setIsTranslating(true);
    try {
      const result = await translateCommunityText(rawText, appLang);
      if (result && result !== rawText) {
        setTranslatedText(result);
        setForceOriginal(false);
      } else {
        notify(
          language === "Bahasa Melayu"
            ? "Mesej sudah dalam bahasa anda"
            : language === "中文"
              ? "当前已是您的界面语言"
              : "Message is already in your language",
        );
      }
    } catch {
      notify(
        language === "Bahasa Melayu"
          ? "Gagal menterjemah teks"
          : language === "中文"
            ? "翻译失败"
            : "Translation failed",
      );
    } finally {
      setIsTranslating(false);
    }
  };

  // Long-press & Horizontal Swipe-left delete gestures
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const gestureRef = useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    mode: "pending" | "swipe" | "cancelled";
    longPressTimer: number | null;
    suppressClick: boolean;
  }>({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    mode: "pending",
    longPressTimer: null,
    suppressClick: false,
  });

  const clearLongPressTimer = () => {
    if (gestureRef.current.longPressTimer !== null) {
      window.clearTimeout(gestureRef.current.longPressTimer);
      gestureRef.current.longPressTimer = null;
    }
  };

  useEffect(() => () => clearLongPressTimer(), []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Do not hijack menu button, interactive buttons, or non-primary mouse buttons
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const targetEl = e.target as HTMLElement;
    if (targetEl.closest("button, a, input")) return;

    clearLongPressTimer();
    gestureRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      mode: "pending",
      longPressTimer: selectionMode
        ? null
        : window.setTimeout(() => {
            if (!gestureRef.current.active || gestureRef.current.mode !== "pending") return;
            gestureRef.current.mode = "cancelled";
            gestureRef.current.suppressClick = true;
            try {
              if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
                navigator.vibrate(14);
              }
            } catch {}
            onEnterSelectionMode(message.id);
          }, 480),
      suppressClick: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g.active || e.pointerId !== g.pointerId) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearLongPressTimer();
    }

    if (g.mode === "cancelled") return;

    if (g.mode === "pending") {
      // Vertical scroll intent -> yield immediately
      if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) {
        g.mode = "cancelled";
        return;
      }
      // Horizontal swipe-left intent (disabled while in multi-select mode)
      if (!selectionMode && dx < -12 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        g.mode = "swipe";
        g.suppressClick = true;
        setIsSwiping(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
      }
    }

    if (g.mode === "swipe") {
      const clamped = Math.max(-132, Math.min(0, dx));
      setSwipeX(clamped);
    }
  };

  const finishPointerGesture = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g.active || e.pointerId !== g.pointerId) return;
    clearLongPressTimer();
    g.active = false;

    if (g.mode === "swipe") {
      setIsSwiping(false);
      if (swipeX <= -88) {
        setSwipeX(-240);
        window.setTimeout(() => {
          setSwipeX(0);
          onSwipeDelete(message);
        }, 120);
      } else {
        setSwipeX(0);
      }
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}
    }
  };

  const handleCardClick = () => {
    if (gestureRef.current.suppressClick) {
      gestureRef.current.suppressClick = false;
      return;
    }
    if (selectionMode) {
      onToggleSelect(message.id);
      return;
    }
    if (isUnread) {
      onMarkRead(message.id);
    }
  };

  const senderLabel = formatInboxSenderLabel(message.senderAnonymous, language);
  const timeLabel = formatInboxMessageTime(parseMessageTimestamp(message.createdAt), language);
  const isShowingTranslation =
    kind === "text" ? showingTextTranslated : voiceTranslationState.isTranslated;
  const canShowTranslationMenuOption =
    kind === "text" || voiceTranslationState.hasCached || voiceTranslationState.isTranslated;

  return (
    <div
      className={`inbox-row-swipe-shell ${selected ? "is-selected" : ""}`}
      data-message-id={message.id}
    >
      {/* Swipe-left reveal backdrop */}
      {!selectionMode && swipeX < -4 && (
        <div className="inbox-swipe-delete-bg" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <span>{strings.deleteAction}</span>
        </div>
      )}

      <article
        className={`inbox-message-card ${isUnread ? "is-unread" : "is-read"} ${
          selected ? "is-selected" : ""
        } ${isSwiping ? "is-swiping" : ""}`}
        style={swipeX !== 0 ? { transform: `translateX(${swipeX}px)` } : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerGesture}
        onPointerCancel={finishPointerGesture}
        onClick={handleCardClick}
        aria-label={`${isUnread ? `${strings.unreadAria}, ` : ""}${senderLabel}, ${timeLabel}`}
      >
        {/* Compact avatar or multi-select checkbox */}
        <div className="inbox-row-leading">
          {selectionMode ? (
            <button
              type="button"
              className={`inbox-select-checkbox ${selected ? "checked" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(message.id);
              }}
              aria-label={selected ? "Deselect message" : "Select message"}
              aria-pressed={selected}
            >
              {selected && (
                <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3.2 8.2 6.5 11.4 12.8 4.8" />
                </svg>
              )}
            </button>
          ) : (
            <div className="inbox-row-avatar" aria-hidden="true">
              {kind === "voice" ? "🎙️" : "🌱"}
            </div>
          )}
        </div>

        {/* Content Column */}
        <div className="inbox-row-main">
          <div className="inbox-row-meta">
            <div className="inbox-row-sender-group">
              {isUnread && (
                <span
                  className="inbox-unread-dot"
                  aria-label={strings.unreadAria}
                  title={strings.unreadAria}
                />
              )}
              <strong className="inbox-row-sender">{senderLabel}</strong>
              <span className="inbox-row-dot-sep" aria-hidden="true">·</span>
              <time className="inbox-row-time">{timeLabel}</time>
            </div>

            <div className="inbox-row-meta-actions">
              {isShowingTranslation && (
                <button
                  type="button"
                  className="inbox-translated-globe-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleToggleTranslation();
                  }}
                  aria-label={strings.translatedToggleAria}
                  title={strings.translatedToggleAria}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 3a14 14 0 0 0 0 18M12 3a14 14 0 0 1 0 18M3.6 9h16.8M3.6 15h16.8" />
                  </svg>
                </button>
              )}

              {!selectionMode && (
                <button
                  ref={menuTriggerRef}
                  type="button"
                  className={`inbox-row-more-btn ${menuOpen ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((prev) => !prev);
                  }}
                  aria-label={strings.messageOptionsAria}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {kind === "text" ? (
            <div className="inbox-row-text-block">
              <p
                ref={textRef}
                className={`inbox-row-body ${expanded ? "is-expanded" : "is-clamped"}`}
              >
                {displayText}
              </p>
              {isClampedOverflow && (
                <button
                  type="button"
                  className="inbox-read-more-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isUnread) onMarkRead(message.id);
                    setExpanded((prev) => !prev);
                  }}
                  aria-expanded={expanded}
                >
                  {expanded ? strings.showLess : strings.readMore}
                </button>
              )}
            </div>
          ) : (
            <VoiceMessagePlayer
              messageId={message.id}
              audioUrl={message.audioUrl}
              audioDuration={message.audioDuration}
              existingCaption={message.text}
              transcription={message.transcription}
              autoTranslate={autoTranslate}
              forceOriginal={forceOriginal}
              language={language}
              onTranscriptResolved={(id, tr) => {
                onTranscriptResolved?.(id, tr);
                onHeightChange?.();
              }}
              onTranslationStateChange={(isTranslated, hasCached) => {
                setVoiceTranslationState({ isTranslated, hasCached });
              }}
              onInteract={() => {
                if (isUnread) onMarkRead(message.id);
              }}
              onToggleForceOriginal={() => setForceOriginal((prev) => !prev)}
              notify={notify}
            />
          )}
        </div>
      </article>

      {menuOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="inbox-portal-menu"
            role="menu"
            style={{ top: `${menuCoords.top}px`, left: `${menuCoords.left}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            {canShowTranslationMenuOption && (
              <button
                type="button"
                role="menuitem"
                className="inbox-portal-menu-item"
                disabled={isTranslating}
                onClick={() => {
                  setMenuOpen(false);
                  void handleToggleTranslation();
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 3a14 14 0 0 0 0 18M12 3a14 14 0 0 1 0 18M3.6 9h16.8M3.6 15h16.8" />
                </svg>
                <span>
                  {isTranslating
                    ? strings.translating
                    : isShowingTranslation
                      ? strings.showOriginal
                      : strings.translateAction}
                </span>
              </button>
            )}

            <button
              type="button"
              role="menuitem"
              className="inbox-portal-menu-item"
              onClick={() => {
                setMenuOpen(false);
                onToggleUnread(message.id, !isUnread);
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5" />
              </svg>
              <span>{isUnread ? strings.markRead : strings.markUnread}</span>
            </button>

            {onReport && (
              <button
                type="button"
                role="menuitem"
                className="inbox-portal-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onReport(message.id);
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
                <span>{strings.report}</span>
              </button>
            )}

            <button
              type="button"
              role="menuitem"
              className="inbox-portal-menu-item"
              onClick={() => {
                setMenuOpen(false);
                onBlockSender(message);
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <line x1="4.9" y1="4.9" x2="19.1" y2="19.1" />
              </svg>
              <span>{strings.blockSender}</span>
            </button>

            <button
              type="button"
              role="menuitem"
              className="inbox-portal-menu-item danger"
              onClick={() => {
                setMenuOpen(false);
                onSwipeDelete(message);
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>{strings.deleteAction}</span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default MessageRow;
