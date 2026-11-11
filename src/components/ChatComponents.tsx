import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CompanionAvatar,
  type CompanionAnimal,
  type CompanionExpression,
} from "./CompanionAvatar";
import { FormattedChatMessage } from "./FormattedChatMessage";
import { ContextualVoucherCard } from "./ContextualVoucherCard";
import type {
  ChatSuggestion,
  MarketplaceRecommendation,
  SafetyAction,
} from "../services/contracts";
import type { AppLanguage } from "../i18n/translations";
import { getPersonaDetails } from "../i18n/translations";
import type { ChatViewMode } from "../theme/ThemeContext";

export interface ChatMessageItem {
  from: "ony" | "user";
  text: string;
  voucher?: MarketplaceRecommendation | null;
  vouchers?: MarketplaceRecommendation[];
  copingActivity?: string | null;
  suggestions?: ChatSuggestion[];
  shownSuggestionIds?: string[];
  dismissedVoucher?: boolean;
}

export interface ActiveBreakTimerState {
  id: string;
  label: string;
  secondsLeft: number;
  totalSeconds: number;
  paused: boolean;
}

export type ChatPersonaId = "gentle" | "friendly" | "calm";

export interface PersonaOptionItem {
  id: ChatPersonaId;
  name: string;
  note: string;
  preview: string;
}

export interface ChatMoodEntrySummary {
  emoji: string;
  label: string;
}

export interface ChatStarterCard {
  icon: string;
  label: string;
  prompt: string;
}

/**
 * Lightweight inline SVG icon helper for ChatComponents so it has zero circular dependency on App.tsx
 */
function ChatIcon({ name, className = "" }: { name: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    chat: (
      <>
        <path d="M4 5h16v11H9l-5 4V5Z" />
        <path d="M8 9h8M8 12h5" />
      </>
    ),
    calendarCheck: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="m9 16 2 2 4-4" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1.4" fill="currentColor" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" />
        <circle cx="19" cy="12" r="1.4" fill="currentColor" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    chevronDown: <path d="m6 9 6 6 6-6" />,
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    volume: (
      <>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
      </>
    ),
    volumeOff: (
      <>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </>
    ),
    bell: (
      <>
        <path d="M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3V9ZM10 20h4" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 4 6v5c0 5 3 8 8 10 5-2 8-5 8-10V6l-8-3Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    helpCircle: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    sparkles: (
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    ),
    music: (
      <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    ),
    memory: (
      <>
        <path d="M6 3h12v18l-6-3-6 3V3Z" />
        <path d="M9 8h6M9 12h4" />
      </>
    ),
    toolkit: (
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7h.01" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),
    keyboard: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="3" />
        <line x1="6" y1="8" x2="6.01" y2="8" />
        <line x1="10" y1="8" x2="10.01" y2="8" />
        <line x1="14" y1="8" x2="14.01" y2="8" />
        <line x1="18" y1="8" x2="18.01" y2="8" />
        <line x1="6" y1="12" x2="6.01" y2="12" />
        <line x1="10" y1="12" x2="10.01" y2="12" />
        <line x1="14" y1="12" x2="14.01" y2="12" />
        <line x1="18" y1="12" x2="18.01" y2="12" />
        <line x1="7" y1="16" x2="17" y2="16" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    wind: (
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2" />
    ),
    companionView: (
      <>
        <circle cx="12" cy="9" r="5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
    classicView: (
      <>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <line x1="8" y1="9" x2="16" y2="9" />
        <line x1="8" y1="13" x2="13" y2="13" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    checkCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />,
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
    coffee: (
      <>
        <path d="M17 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
        <line x1="6" y1="2" x2="6" y2="4" />
        <line x1="10" y1="2" x2="10" y2="4" />
        <line x1="14" y1="2" x2="14" y2="4" />
      </>
    ),
    footprints: (
      <>
        <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" />
        <path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z" />
      </>
    ),
    droplet: <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    pause: (
      <>
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
      </>
    ),
    play: <polygon points="6 4 20 12 6 20 6 4" />,
  };

  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.95"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.info}
    </svg>
  );
}

// =============================================================================
// 1. ChatHeader (Clean, uncluttered header with strictly <= 3 icons on right)
// =============================================================================

export interface ChatHeaderProps {
  companion: CompanionAnimal | string;
  companionMood: CompanionExpression;
  language: AppLanguage;
  todayMoodEntry?: ChatMoodEntrySummary | null;
  unreadCount: number;
  onOpenHistory: () => void;
  onOpenMood: () => void;
  onOpenOverflow: () => void;
}

export function ChatHeader({
  companion,
  companionMood,
  language,
  todayMoodEntry,
  unreadCount,
  onOpenHistory,
  onOpenMood,
  onOpenOverflow,
}: ChatHeaderProps) {
  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  const subtitleText = isBm
    ? "Sentiasa ada untuk mendengar"
    : isZh
      ? "随时倾听 · 温柔陪伴"
      : "Always here to listen";

  const historyLabel = isBm
    ? "Sejarah perbualan"
    : isZh
      ? "对话记录"
      : "Conversation history";

  const moodLabel = todayMoodEntry
    ? `${todayMoodEntry.emoji} ${todayMoodEntry.label}`
    : isBm
      ? "Daftar perasaan harian"
      : isZh
        ? "每日心情打卡"
        : "Daily mood check-in";

  const moreLabel = isBm
    ? "Menu pilihan lain"
    : isZh
      ? "更多功能选项"
      : "More chat options";

  return (
    <header className="chat-header-clean" role="banner">
      <div className="chat-header-clean-left">
        <div className="chat-header-avatar-box">
          <CompanionAvatar
            companion={companion}
            size={36}
            mood={companionMood}
            animated
          />
          <span className="chat-header-online-dot" aria-hidden="true" />
        </div>
        <div className="chat-header-titles">
          <span className="chat-header-name">ONY</span>
          <span className="chat-header-subtitle">{subtitleText}</span>
        </div>
      </div>

      <div className="chat-header-clean-right">
        {/* Icon 1: History / Full Conversation Sheet */}
        <button
          type="button"
          className="chat-header-icon-btn"
          onClick={onOpenHistory}
          title={historyLabel}
          aria-label={historyLabel}
        >
          <ChatIcon name="history" />
        </button>

        {/* Icon 2: Mood Reflection Check-in */}
        <button
          type="button"
          className="chat-header-icon-btn"
          onClick={onOpenMood}
          title={moodLabel}
          aria-label={moodLabel}
        >
          {todayMoodEntry ? (
            <span className="chat-header-mood-emoji" aria-hidden="true">
              {todayMoodEntry.emoji}
            </span>
          ) : (
            <>
              <ChatIcon name="calendarCheck" />
              <span className="chat-header-pending-dot" aria-hidden="true" />
            </>
          )}
        </button>

        {/* Icon 3: Overflow "..." Menu */}
        <button
          type="button"
          className="chat-header-icon-btn"
          onClick={onOpenOverflow}
          title={moreLabel}
          aria-label={
            unreadCount > 0
              ? `${moreLabel} (${unreadCount} unread notifications)`
              : moreLabel
          }
          aria-haspopup="dialog"
        >
          <ChatIcon name="more" />
          {unreadCount > 0 && (
            <span className="chat-header-notif-dot" aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
}

// =============================================================================
// 2. ToneChip (Sits cleanly above the input bar, opens Tone Picker sheet)
// =============================================================================

export interface ToneChipProps {
  persona: ChatPersonaId;
  personaOptions: PersonaOptionItem[];
  language: AppLanguage;
  onOpenPicker: () => void;
}

export function getToneEmoji(persona: ChatPersonaId): string {
  if (persona === "gentle") return "🌸";
  if (persona === "friendly") return "💬";
  return "🌿";
}

export function ToneChip({
  persona,
  personaOptions,
  language,
  onOpenPicker,
}: ToneChipProps) {
  const activeOption =
    personaOptions.find((item) => item.id === persona) || personaOptions[0];
  const details = getPersonaDetails(
    persona,
    activeOption?.name || "",
    activeOption?.note || "",
    activeOption?.preview || "",
    language,
  );
  const emoji = getToneEmoji(persona);
  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  const ariaPrefix = isBm
    ? "Nada perbualan"
    : isZh
      ? "当前对话语气"
      : "Response tone";

  return (
    <button
      type="button"
      className="chat-tone-chip"
      onClick={onOpenPicker}
      aria-label={`${ariaPrefix}: ${details.name}. ${
        isBm ? "Ketik untuk tukar" : isZh ? "点击切换" : "Tap to change"
      }`}
      aria-haspopup="dialog"
    >
      <span className="chat-tone-chip-emoji" aria-hidden="true">
        {emoji}
      </span>
      <span className="chat-tone-chip-label">{details.name}</span>
      <ChatIcon name="chevronDown" className="chat-tone-chip-caret" />
    </button>
  );
}

// =============================================================================
// Text Pagination & Safe Typewriter Helpers for SpeechBubble
// =============================================================================

export function paginateBubbleText(text: string, maxChars = 190): string[] {
  const cleaned = (text || "").replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [""];
  if (cleaned.length <= maxChars && !cleaned.includes("\n\n")) {
    return [cleaned];
  }

  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const pages: string[] = [];

  for (const para of paragraphs) {
    if (para.length <= maxChars) {
      const last = pages[pages.length - 1];
      if (last && last.length + para.length + 2 <= maxChars) {
        pages[pages.length - 1] = `${last}\n\n${para}`;
      } else {
        pages.push(para);
      }
      continue;
    }

    // Split long paragraph on sentences (keeping delimiters)
    const sentences = para
      .split(/(?<=[.!?。！？])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (sentences.length <= 1) {
      // Fallback split by words if single long sentence
      const words = para.split(/\s+/);
      let chunk = "";
      for (const word of words) {
        if ((chunk + " " + word).trim().length > maxChars && chunk) {
          pages.push(chunk.trim());
          chunk = word;
        } else {
          chunk = chunk ? `${chunk} ${word}` : word;
        }
      }
      if (chunk.trim()) pages.push(chunk.trim());
      continue;
    }

    let current = "";
    for (const sentence of sentences) {
      if ((current + " " + sentence).trim().length > maxChars && current) {
        pages.push(current.trim());
        current = sentence;
      } else {
        current = current ? `${current} ${sentence}` : sentence;
      }
    }
    if (current.trim()) pages.push(current.trim());
  }

  return pages.length > 0 ? pages : [cleaned];
}

function safeMarkdownSlice(fullText: string, charCount: number): string {
  if (charCount >= fullText.length) return fullText;
  let sliced = fullText.slice(0, charCount);
  // Avoid displaying dangling single '*' or unclosed '**' during typewriter reveal
  const boldMatches = sliced.match(/\*\*/g);
  if (boldMatches && boldMatches.length % 2 === 1) {
    const lastBoldIdx = sliced.lastIndexOf("**");
    if (lastBoldIdx !== -1) {
      sliced = sliced.slice(0, lastBoldIdx) + sliced.slice(lastBoldIdx + 2);
    }
  } else if (sliced.endsWith("*")) {
    sliced = sliced.slice(0, -1);
  }
  return sliced;
}

// =============================================================================
// 3. SpeechBubble (Solid / blurred contrast bubble above/beside companion)
// =============================================================================

export interface SpeechBubbleProps {
  text: string;
  isThinking?: boolean;
  isWelcome?: boolean;
  welcomeGreeting?: string;
  enableTypewriter?: boolean;
  replyInstanceKey?: string;
  isSpeakingTts?: boolean;
  language: AppLanguage;
  onToggleSpeak?: () => void;
  onTypingProgressChange?: (revealing: boolean) => void;
}

export function SpeechBubble({
  text,
  isThinking = false,
  isWelcome = false,
  welcomeGreeting,
  enableTypewriter = false,
  replyInstanceKey = "default",
  isSpeakingTts = false,
  language,
  onToggleSpeak,
  onTypingProgressChange,
}: SpeechBubbleProps) {
  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  const pages = useMemo(() => paginateBubbleText(text, 185), [text]);
  const [pageIdx, setPageIdx] = useState(0);
  const [revealedChars, setRevealedChars] = useState<number>(
    enableTypewriter ? 0 : text.length,
  );
  const [skipped, setSkipped] = useState(!enableTypewriter);

  // Detect user reduced-motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Reset pagination & typewriter when a new bot reply arrives
  useEffect(() => {
    setPageIdx(0);
    if (!enableTypewriter || prefersReducedMotion || isThinking || isWelcome) {
      setSkipped(true);
      setRevealedChars(pages[0]?.length || 0);
      onTypingProgressChange?.(false);
    } else {
      setSkipped(false);
      setRevealedChars(0);
      onTypingProgressChange?.(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyInstanceKey, text, isThinking, isWelcome]);

  const activePageText = pages[Math.min(pageIdx, pages.length - 1)] || "";

  // Lightweight typewriter effect for the currently displayed page
  useEffect(() => {
    if (isThinking || isWelcome || skipped || prefersReducedMotion) {
      setRevealedChars(activePageText.length);
      onTypingProgressChange?.(false);
      return;
    }

    if (revealedChars >= activePageText.length) {
      onTypingProgressChange?.(false);
      return;
    }

    onTypingProgressChange?.(true);
    const step = activePageText.length > 140 ? 3 : 2;
    const timer = window.setTimeout(() => {
      setRevealedChars((prev) => Math.min(activePageText.length, prev + step));
    }, 24);

    return () => window.clearTimeout(timer);
  }, [
    activePageText,
    revealedChars,
    skipped,
    isThinking,
    isWelcome,
    prefersReducedMotion,
    onTypingProgressChange,
  ]);

  const handleSelectPage = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(pages.length - 1, nextIdx));
    setPageIdx(clamped);
    setSkipped(true);
    setRevealedChars(pages[clamped]?.length || 0);
    onTypingProgressChange?.(false);
  };

  const handleSkip = () => {
    setSkipped(true);
    setRevealedChars(activePageText.length);
    onTypingProgressChange?.(false);
  };

  const isStillRevealing =
    !isThinking && !isWelcome && !skipped && revealedChars < activePageText.length;

  const displayedText = isStillRevealing
    ? safeMarkdownSlice(activePageText, revealedChars)
    : activePageText;

  return (
    <div
      className={`speech-bubble-card ${isThinking ? "is-thinking" : ""} ${
        isWelcome ? "is-welcome" : ""
      }`}
      role="status"
      aria-live="polite"
    >
      {isThinking ? (
        <div className="speech-bubble-thinking">
          <div className="speech-bubble-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="speech-bubble-thinking-label">
            {isBm ? "ONY sedang berfikir..." : isZh ? "ONY 正在温柔思考..." : "ONY is reflecting..."}
          </span>
        </div>
      ) : (
        <>
          {isWelcome && welcomeGreeting && (
            <div className="speech-bubble-greeting">{welcomeGreeting}</div>
          )}

          <div className="speech-bubble-body">
            <FormattedChatMessage text={displayedText} isUser={false} />
          </div>

          <div className="speech-bubble-footer">
            <div className="speech-bubble-footer-left">
              {onToggleSpeak && !isWelcome && (
                <button
                  type="button"
                  className={`speech-bubble-tts-btn ${isSpeakingTts ? "speaking" : ""}`}
                  onClick={onToggleSpeak}
                  title={
                    isSpeakingTts
                      ? isBm
                        ? "Hentikan suara"
                        : isZh
                          ? "停止朗读"
                          : "Stop reading aloud"
                      : isBm
                        ? "Dengar suara ONY"
                        : isZh
                          ? "朗读回复"
                          : "Read aloud"
                  }
                  aria-label={
                    isSpeakingTts
                      ? isBm
                        ? "Hentikan suara"
                        : isZh
                          ? "停止朗读"
                          : "Stop reading aloud"
                      : isBm
                        ? "Dengar suara ONY"
                        : isZh
                          ? "朗读回复"
                          : "Read aloud"
                  }
                >
                  <ChatIcon name={isSpeakingTts ? "volumeOff" : "volume"} />
                </button>
              )}

              {isStillRevealing && (
                <button
                  type="button"
                  className="speech-bubble-skip-btn"
                  onClick={handleSkip}
                >
                  {isBm ? "Langkau" : isZh ? "跳过" : "Skip"}
                </button>
              )}
            </div>

            {pages.length > 1 && (
              <div className="speech-bubble-pagination" aria-label="Reply pages">
                <button
                  type="button"
                  className="speech-bubble-page-btn"
                  onClick={() => handleSelectPage(pageIdx - 1)}
                  disabled={pageIdx === 0}
                  aria-label={isBm ? "Halaman sebelumnya" : isZh ? "上一页" : "Previous page"}
                >
                  <ChatIcon name="chevronLeft" />
                </button>
                <span className="speech-bubble-page-indicator">
                  {pageIdx + 1} / {pages.length}
                </span>
                <button
                  type="button"
                  className="speech-bubble-page-btn"
                  onClick={() => handleSelectPage(pageIdx + 1)}
                  disabled={pageIdx >= pages.length - 1}
                  aria-label={isBm ? "Halaman seterusnya" : isZh ? "下一页" : "Next page"}
                >
                  <ChatIcon name="chevronRight" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
      <span className="speech-bubble-tail" aria-hidden="true" />
    </div>
  );
}

// =============================================================================
// 4. CompanionStage (Ambient visual center for Companion Mode)
// =============================================================================

export interface CompanionStageProps {
  companion: CompanionAnimal | string;
  persona: ChatPersonaId;
  messages: ChatMessageItem[];
  typing: boolean;
  isUserTyping: boolean;
  speakingMsgId: string | null;
  keyboardOpen: boolean;
  language: AppLanguage;
  welcomeGreeting: string;
  welcomeQuestion: string;
  starterCards: ChatStarterCard[];
  isLimitReached: boolean;
  recentUserEcho: { id: number; text: string; fading: boolean } | null;
  chatError: string | null;
  failedUserText: string | null;
  safetyContext: boolean;
  serverSafetyAction: SafetyAction;
  memoryContext: boolean;
  savedMemoryId: number | null;
  anxietyContext: boolean;
  studyContext: boolean;
  jobContext: boolean;
  relationshipContext: boolean;
  onSelectStarter: (prompt: string) => void;
  onToggleSpeakMessage: (text: string, id: string) => void;
  onOpenMerchant?: (name: string) => void;
  onDismissVoucher: (msgIndex: number) => void;
  onDismissError: () => void;
  onRetryLastMessage: () => void;
  onNavigate: (screen: string) => void;
  onSaveContextMemory: () => void;
  onUndoContextMemory: () => void;
  onOpenToolkitGuide?: (guideId: string) => void;
  onSendQuickReply: (prompt: string) => void;
  onOpenHistory: () => void;
}

export function CompanionStage({
  companion,
  persona,
  messages,
  typing,
  isUserTyping,
  speakingMsgId,
  keyboardOpen,
  language,
  welcomeGreeting,
  welcomeQuestion,
  starterCards,
  isLimitReached,
  recentUserEcho,
  chatError,
  failedUserText,
  safetyContext,
  serverSafetyAction,
  memoryContext,
  savedMemoryId,
  anxietyContext,
  studyContext,
  jobContext,
  relationshipContext,
  onSelectStarter,
  onToggleSpeakMessage,
  onOpenMerchant,
  onDismissVoucher,
  onDismissError,
  onRetryLastMessage,
  onNavigate,
  onSaveContextMemory,
  onUndoContextMemory,
  onOpenToolkitGuide,
  onSendQuickReply,
  onOpenHistory,
}: CompanionStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageWidth, setStageWidth] = useState(370);
  const [stageHeight, setStageHeight] = useState(440);
  const [isRevealingReply, setIsRevealingReply] = useState(false);
  const [petBounceMood, setPetBounceMood] = useState<CompanionExpression | null>(null);

  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setStageWidth(entry.contentRect.width);
        }
        if (entry.contentRect.height > 0) {
          setStageHeight(entry.contentRect.height);
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute responsive companion size (~60-66% of stage width, gracefully scaled when keyboard opens or container is short)
  const avatarPixelSize = useMemo(() => {
    const targetByWidth = Math.round(stageWidth * 0.62);
    const maxByHeight = Math.round(stageHeight * (keyboardOpen ? 0.36 : 0.44));
    const cap = keyboardOpen ? 132 : 236;
    const floor = keyboardOpen ? 76 : 148;
    return Math.max(floor, Math.min(cap, targetByWidth, maxByHeight));
  }, [stageWidth, stageHeight, keyboardOpen]);

  // Find latest ONY message in the conversation
  const latestOnyIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].from === "ony") return i;
    }
    return -1;
  }, [messages]);

  const latestOnyMsg = latestOnyIndex >= 0 ? messages[latestOnyIndex] : null;
  const latestOnyMsgId = latestOnyIndex >= 0 ? `ony-msg-${latestOnyIndex}` : "ony-welcome";

  // Determine dynamic CompanionExpression based on user input, speech, sentiment & persona
  const computedMood: CompanionExpression = useMemo(() => {
    if (petBounceMood) return petBounceMood;
    if (isRevealingReply || speakingMsgId !== null) return "speaking";
    if (typing) return "comforting";
    if (isUserTyping) return "listening";

    if (latestOnyMsg) {
      const lower = latestOnyMsg.text.toLowerCase();
      if (
        lower.includes("proud") ||
        lower.includes("wonderful") ||
        lower.includes("glad") ||
        lower.includes("happy") ||
        lower.includes("celebrate") ||
        lower.includes("great job") ||
        lower.includes("bangga") ||
        lower.includes("gembira") ||
        lower.includes("开心") ||
        lower.includes("真棒")
      ) {
        return "happy";
      }
      if (
        safetyContext ||
        anxietyContext ||
        persona === "gentle" ||
        lower.includes("breathe") ||
        lower.includes("gentle") ||
        lower.includes("here with you") ||
        lower.includes("tenang") ||
        lower.includes("温柔")
      ) {
        return "comforting";
      }
    }

    if (persona === "friendly") return "happy";
    if (persona === "gentle" || persona === "calm") return "comforting";
    return "idle";
  }, [
    petBounceMood,
    isRevealingReply,
    speakingMsgId,
    typing,
    isUserTyping,
    latestOnyMsg,
    safetyContext,
    anxietyContext,
    persona,
  ]);

  const handleCompanionTap = () => {
    setPetBounceMood("happy");
    window.setTimeout(() => setPetBounceMood(null), 1300);
  };

  const activeVouchers = useMemo(() => {
    if (!latestOnyMsg || latestOnyMsg.dismissedVoucher) return [];
    if (latestOnyMsg.vouchers && latestOnyMsg.vouchers.length > 0) {
      return latestOnyMsg.vouchers;
    }
    return latestOnyMsg.voucher ? [latestOnyMsg.voucher] : [];
  }, [latestOnyMsg]);

  const bubbleText = latestOnyMsg ? latestOnyMsg.text : welcomeQuestion;
  const replyKey = latestOnyMsg
    ? `msg-${latestOnyIndex}-${latestOnyMsg.text.length}`
    : "welcome";

  // Check if there are contextual actions to show below the companion
  const hasContextActions =
    !typing &&
    messages.length > 0 &&
    (safetyContext ||
      serverSafetyAction === "offer_human_support" ||
      memoryContext ||
      jobContext ||
      messages.length > 1);

  return (
    <div
      ref={stageRef}
      className={`companion-stage ${keyboardOpen ? "keyboard-open" : ""}`}
    >
      {/* Subtle theme-tinted ambient backdrop with soft floating circles */}
      <div className="companion-ambient-backdrop" aria-hidden="true">
        <span className="ambient-orb orb-1" />
        <span className="ambient-orb orb-2" />
        <span className="ambient-particle p-1" />
        <span className="ambient-particle p-2" />
        <span className="ambient-particle p-3" />
        <span className="ambient-particle p-4" />
      </div>

      <div className="companion-stage-scroll">
        {/* Top / Upper Speech Bubble */}
        <div className="companion-speech-slot">
          <SpeechBubble
            text={bubbleText}
            isThinking={typing}
            isWelcome={messages.length === 0 && !typing}
            welcomeGreeting={messages.length === 0 ? welcomeGreeting : undefined}
            enableTypewriter={messages.length > 0 && latestOnyIndex === messages.length - 1}
            replyInstanceKey={replyKey}
            isSpeakingTts={speakingMsgId === latestOnyMsgId}
            language={language}
            onToggleSpeak={
              latestOnyMsg
                ? () => onToggleSpeakMessage(latestOnyMsg.text, latestOnyMsgId)
                : undefined
            }
            onTypingProgressChange={setIsRevealingReply}
          />
        </div>

        {/* Visual Center: Soft theme-colored glow + Large Plushie Companion */}
        <div className="companion-centerpiece">
          <div className="companion-center-glow" aria-hidden="true" />
          <CompanionAvatar
            companion={companion}
            size={avatarPixelSize}
            mood={computedMood}
            showGlow
            interactive
            animated
            onClick={handleCompanionTap}
            title={
              isBm
                ? "ONY sentiasa bersama anda"
                : isZh
                  ? "ONY 正在温柔陪伴你"
                  : "ONY is here with you"
            }
          />
          {isUserTyping && !typing && (
            <div className="companion-listening-pill" aria-hidden="true">
              <span className="listening-pulse-dot" />
              <span>
                {isBm ? "Sedang mendengar..." : isZh ? "正在倾听..." : "Listening..."}
              </span>
            </div>
          )}
        </div>

        {/* Transient user message echo bubble (fades & collapses as ONY replies) */}
        {recentUserEcho && (
          <div
            key={recentUserEcho.id}
            className={`companion-user-echo ${recentUserEcho.fading ? "is-fading" : ""}`}
            aria-live="off"
          >
            <div className="companion-user-echo-bubble">
              {recentUserEcho.text}
            </div>
          </div>
        )}

        {/* Error banner with retry */}
        {chatError && !typing && (
          <div className="chat-error-banner companion-stage-error" role="alert">
            <div>
              <ChatIcon name="info" />
              <span>{chatError}</span>
            </div>
            <div className="chat-error-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={onDismissError}
              >
                {isBm ? "Tutup" : isZh ? "关闭" : "Dismiss"}
              </button>
              {failedUserText && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={onRetryLastMessage}
                >
                  {isBm ? "Cuba lagi" : isZh ? "重试" : "Retry"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Welcome Conversation Starters when chat is empty */}
        {messages.length === 0 && !typing && !keyboardOpen && (
          <div className="companion-starters-strip" role="group" aria-label="Suggested starters">
            {starterCards.map((card) => (
              <button
                key={card.prompt}
                type="button"
                className="companion-starter-chip"
                disabled={isLimitReached}
                onClick={() => onSelectStarter(card.prompt)}
              >
                <span className="starter-chip-title">{card.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Contextual actions (safety, memory, breathing, vouchers) below companion */}
        {hasContextActions && (
          <div className="companion-context-strip">
            {safetyContext && (
              <>
                <button
                  type="button"
                  className="companion-ctx-btn danger"
                  onClick={() => onNavigate("safety")}
                >
                  {isBm ? "Dapatkan Bantuan" : isZh ? "获取紧急帮助" : "Get Help"}
                </button>
                <button
                  type="button"
                  className="companion-ctx-btn"
                  onClick={() => onNavigate("professional")}
                >
                  {isBm ? "Cari Sokongan" : isZh ? "寻找专业支持" : "Find Support"}
                </button>
                <button
                  type="button"
                  className="companion-ctx-btn"
                  onClick={() => onNavigate("trusted")}
                >
                  {isBm ? "Hubungi Rakan Dipercayai" : isZh ? "联系信任联系人" : "Trusted Contact"}
                </button>
              </>
            )}

            {!safetyContext && serverSafetyAction === "offer_human_support" && (
              <>
                <button
                  type="button"
                  className="companion-ctx-btn"
                  onClick={() => onNavigate("professional")}
                >
                  {isBm ? "Sokongan Profesional" : isZh ? "寻求专业支持" : "Find Support"}
                </button>
                <button
                  type="button"
                  className="companion-ctx-btn"
                  onClick={() => onNavigate("resources")}
                >
                  {isBm ? "Buka Toolkit" : isZh ? "查看工具箱" : "Open Toolkit"}
                </button>
              </>
            )}

            {!safetyContext && memoryContext && (
              savedMemoryId === null ? (
                <button
                  type="button"
                  className="companion-ctx-btn"
                  onClick={onSaveContextMemory}
                >
                  <ChatIcon name="memory" />
                  <span>
                    {isBm ? "Simpan Memori" : isZh ? "存入记忆宝库" : "Remember this"}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="companion-ctx-btn active"
                  onClick={onUndoContextMemory}
                >
                  <ChatIcon name="check" />
                  <span>
                    {isBm ? "Disimpan · Buat asal" : isZh ? "已保存 · 撤销" : "Saved · Undo"}
                  </span>
                </button>
              )
            )}

            {!safetyContext && jobContext && (
              <button
                type="button"
                className="companion-ctx-btn"
                onClick={() => onNavigate("jobs")}
              >
                <span>{isBm ? "Cari Kerja" : isZh ? "浏览工作机会" : "Find jobs"}</span>
              </button>
            )}

            {messages.length > 1 && (
              <button
                type="button"
                className="companion-ctx-btn subtle"
                onClick={onOpenHistory}
              >
                <ChatIcon name="history" />
                <span>
                  {isBm
                    ? `Lihat ${messages.length} mesej`
                    : isZh
                      ? `查看全部 ${messages.length} 条对话`
                      : `View thread (${messages.length})`}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Contextual Voucher Cards if recommended */}
        {activeVouchers.length > 0 && latestOnyIndex >= 0 && (
          <div className="companion-vouchers-strip">
            {activeVouchers.map((voucherItem, vIdx) => (
              <ContextualVoucherCard
                key={voucherItem.id || voucherItem.merchantName || vIdx}
                voucher={voucherItem}
                language={language}
                onExplore={() => {
                  if (onOpenMerchant) {
                    onOpenMerchant(voucherItem.merchantName);
                  } else {
                    onNavigate("merchant");
                  }
                }}
                onDismiss={() => onDismissVoucher(latestOnyIndex)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// 5. ClassicMessageList (Scrolling full thread used in Classic Mode & History Sheet)
// =============================================================================

export interface ClassicMessageListProps {
  messages: ChatMessageItem[];
  companion: CompanionAnimal | string;
  typing: boolean;
  speakingMsgId: string | null;
  language: AppLanguage;
  chatError?: string | null;
  failedUserText?: string | null;
  safetyContext?: boolean;
  serverSafetyAction?: SafetyAction;
  memoryContext?: boolean;
  savedMemoryId?: number | null;
  anxietyContext?: boolean;
  studyContext?: boolean;
  jobContext?: boolean;
  relationshipContext?: boolean;
  showContextActions?: boolean;
  onToggleSpeakMessage: (text: string, id: string) => void;
  onDismissVoucher: (index: number) => void;
  onOpenMerchant?: (name: string) => void;
  onNavigate: (screen: string) => void;
  onDismissError?: () => void;
  onRetryLastMessage?: () => void;
  onSaveContextMemory?: () => void;
  onUndoContextMemory?: () => void;
  onOpenToolkitGuide?: (guideId: string) => void;
  onSendQuickReply?: (text: string) => void;
  onNotify?: (msg: string) => void;
  messagesEndRef?: React.RefObject<HTMLDivElement | null>;
  labels: {
    dismiss: string;
    retry: string;
    getHelp: string;
    findSupport: string;
    contactTrusted: string;
    viewResources: string;
    rememberThis: string;
    savedVault: string;
    undo: string;
    breathing: string;
    calmingMusic: string;
    studyPlan: string;
    takeBreak: string;
    talkAboutIt: string;
    findJobs: string;
    jobPrefs: string;
    tellMore: string;
    helpReflect: string;
    listenLabel: string;
    stopSpeakingLabel: string;
  };
}

export function ClassicMessageList({
  messages,
  companion,
  typing,
  speakingMsgId,
  language,
  chatError,
  failedUserText,
  safetyContext = false,
  serverSafetyAction = "support",
  memoryContext = false,
  savedMemoryId = null,
  anxietyContext = false,
  studyContext = false,
  jobContext = false,
  relationshipContext = false,
  showContextActions = true,
  onToggleSpeakMessage,
  onDismissVoucher,
  onOpenMerchant,
  onNavigate,
  onDismissError,
  onRetryLastMessage,
  onSaveContextMemory,
  onUndoContextMemory,
  onOpenToolkitGuide,
  onSendQuickReply,
  onNotify,
  messagesEndRef,
  labels,
}: ClassicMessageListProps) {
  return (
    <div className="messages">
      {messages.map((m, i) => (
        <div key={i} className={`message-row ${m.from}`}>
          {m.from === "ony" && (
            <CompanionAvatar companion={companion} size="sm" mood="idle" />
          )}
          <div className="message-col">
            <div className="message">
              <FormattedChatMessage text={m.text} isUser={m.from === "user"} />
            </div>
            {m.from === "ony" && !m.dismissedVoucher && (
              <div
                className="chat-vouchers-container"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  width: "100%",
                  marginTop: "6px",
                }}
              >
                {(m.vouchers && m.vouchers.length > 0
                  ? m.vouchers
                  : m.voucher
                    ? [m.voucher]
                    : []
                ).map((voucherItem, vIdx) => (
                  <ContextualVoucherCard
                    key={voucherItem.id || voucherItem.merchantName || vIdx}
                    voucher={voucherItem}
                    language={language}
                    onExplore={() => {
                      if (onOpenMerchant) {
                        onOpenMerchant(voucherItem.merchantName);
                      } else {
                        onNavigate("merchant");
                      }
                    }}
                    onDismiss={() => onDismissVoucher(i)}
                  />
                ))}
              </div>
            )}
          </div>
          {m.from === "ony" && (
            <button
              type="button"
              className={`tts-btn ${speakingMsgId === `ony-msg-${i}` ? "speaking" : ""}`}
              onClick={() => onToggleSpeakMessage(m.text, `ony-msg-${i}`)}
              title={
                speakingMsgId === `ony-msg-${i}`
                  ? labels.stopSpeakingLabel
                  : labels.listenLabel
              }
              aria-label={
                speakingMsgId === `ony-msg-${i}`
                  ? labels.stopSpeakingLabel
                  : labels.listenLabel
              }
            >
              <ChatIcon
                name={speakingMsgId === `ony-msg-${i}` ? "volumeOff" : "volume"}
              />
            </button>
          )}
        </div>
      ))}

      {typing && (
        <div className="message-row ony">
          <CompanionAvatar companion={companion} size="sm" mood="speaking" />
          <div className="message typing" aria-label="ONY is typing">
            <i />
            <i />
            <i />
          </div>
        </div>
      )}

      {chatError && !typing && (
        <div className="chat-error-banner" role="alert">
          <div>
            <ChatIcon name="info" />
            <span>{chatError}</span>
          </div>
          <div className="chat-error-actions">
            {onDismissError && (
              <button
                type="button"
                className="btn ghost"
                onClick={onDismissError}
              >
                {labels.dismiss}
              </button>
            )}
            {failedUserText && onRetryLastMessage && (
              <button
                type="button"
                className="btn secondary"
                onClick={onRetryLastMessage}
              >
                {labels.retry}
              </button>
            )}
          </div>
        </div>
      )}

      {showContextActions && !typing && (
        <div className="context-actions">
          {safetyContext && (
            <>
              <button
                type="button"
                className="btn danger"
                onClick={() => onNavigate("safety")}
              >
                {labels.getHelp}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => onNavigate("professional")}
              >
                {labels.findSupport}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => onNavigate("trusted")}
              >
                {labels.contactTrusted}
              </button>
            </>
          )}
          {!safetyContext && serverSafetyAction === "offer_human_support" && (
            <>
              <button
                type="button"
                className="btn secondary"
                onClick={() => onNavigate("professional")}
              >
                {labels.findSupport}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => onNavigate("resources")}
              >
                <ChatIcon name="memory" />
                {labels.viewResources}
              </button>
            </>
          )}
          {!safetyContext && memoryContext && onSaveContextMemory && onUndoContextMemory && (
            savedMemoryId === null ? (
              <button
                type="button"
                className="btn secondary"
                onClick={onSaveContextMemory}
              >
                <ChatIcon name="memory" />
                {labels.rememberThis}
              </button>
            ) : (
              <div className="memory-saved">
                <ChatIcon name="check" />
                <span>{labels.savedVault}</span>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={onUndoContextMemory}
                >
                  {labels.undo}
                </button>
              </div>
            )
          )}
          {!safetyContext && jobContext && (
            <>
              <button
                type="button"
                className="btn secondary"
                onClick={() => onNavigate("jobs")}
              >
                {labels.findJobs}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => onNavigate("jobPrefs")}
              >
                {labels.jobPrefs}
              </button>
            </>
          )}
        </div>
      )}

      {messagesEndRef && <div ref={messagesEndRef} className="chat-bottom-spacer" />}
    </div>
  );
}

// =============================================================================
// 6. ChatHistorySheet (Slide-up bottom sheet displaying full active thread)
// =============================================================================

export interface ChatHistorySheetProps {
  open: boolean;
  onClose: () => void;
  messages: ChatMessageItem[];
  companion: CompanionAnimal | string;
  typing: boolean;
  speakingMsgId: string | null;
  language: AppLanguage;
  onToggleSpeakMessage: (text: string, id: string) => void;
  onDismissVoucher: (index: number) => void;
  onOpenMerchant?: (name: string) => void;
  onNavigate: (screen: string) => void;
  onOpenAllSessions: () => void;
  onNewChat: () => void;
  labels: ClassicMessageListProps["labels"];
}

export function ChatHistorySheet({
  open,
  onClose,
  messages,
  companion,
  typing,
  speakingMsgId,
  language,
  onToggleSpeakMessage,
  onDismissVoucher,
  onOpenMerchant,
  onNavigate,
  onOpenAllSessions,
  onNewChat,
  labels,
}: ChatHistorySheetProps) {
  const sheetEndRef = useRef<HTMLDivElement | null>(null);
  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  useEffect(() => {
    if (open) {
      window.setTimeout(() => {
        sheetEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 120);
    }
  }, [open, messages.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="chat-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={
        isBm ? "Sejarah perbualan semasa" : isZh ? "当前完整对话记录" : "Conversation history"
      }
      onClick={onClose}
    >
      <div
        className="chat-history-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chat-sheet-handle-row" onClick={onClose}>
          <span className="chat-sheet-handle" aria-hidden="true" />
        </div>

        <div className="chat-sheet-header">
          <div className="chat-sheet-title-group">
            <h2>
              {isBm ? "Perbualan Semasa" : isZh ? "完整对话记录" : "Conversation Thread"}
            </h2>
            <p>
              {messages.length === 0
                ? isBm
                  ? "Belum ada mesej dalam sesi ini"
                  : isZh
                    ? "本次对话尚未开始"
                    : "No messages in this session yet"
                : isBm
                  ? `${messages.length} mesej bersama ONY`
                  : isZh
                    ? `共 ${messages.length} 条温柔对话`
                    : `${messages.length} message${messages.length === 1 ? "" : "s"} with ONY`}
            </p>
          </div>

          <div className="chat-sheet-header-actions">
            <button
              type="button"
              className="chat-sheet-action-pill"
              onClick={() => {
                onClose();
                onOpenAllSessions();
              }}
            >
              {isBm ? "Semua Sesi" : isZh ? "全部记录" : "Past Chats"}
            </button>
            <button
              type="button"
              className="chat-sheet-close-btn"
              onClick={onClose}
              aria-label={isBm ? "Tutup" : isZh ? "关闭" : "Close"}
            >
              <ChatIcon name="close" />
            </button>
          </div>
        </div>

        <div className="chat-history-sheet-scroll">
          {messages.length === 0 ? (
            <div className="chat-history-empty">
              <CompanionAvatar companion={companion} size="lg" mood="idle" />
              <p>
                {isBm
                  ? "Mulakan luahan anda di ruang sembang — semua mesej anda akan dipaparkan di sini."
                  : isZh
                    ? "发送第一句话后，你与 ONY 的完整对话就会显示在这里。"
                    : "Start sharing with ONY and your full conversation thread will appear here."}
              </p>
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  onClose();
                  onOpenAllSessions();
                }}
              >
                {isBm ? "Lihat Sesi Terdahulu" : isZh ? "浏览历史对话" : "Browse Past Sessions"}
              </button>
            </div>
          ) : (
            <ClassicMessageList
              messages={messages}
              companion={companion}
              typing={typing}
              speakingMsgId={speakingMsgId}
              language={language}
              showContextActions={false}
              onToggleSpeakMessage={onToggleSpeakMessage}
              onDismissVoucher={onDismissVoucher}
              onOpenMerchant={onOpenMerchant}
              onNavigate={(s) => {
                onClose();
                onNavigate(s);
              }}
              messagesEndRef={sheetEndRef}
              labels={labels}
            />
          )}
        </div>

        {messages.length > 0 && (
          <div className="chat-history-sheet-footer">
            <button
              type="button"
              className="chat-sheet-secondary-btn"
              onClick={() => {
                onNewChat();
                onClose();
              }}
            >
              <ChatIcon name="plus" />
              <span>
                {isBm ? "Mulakan Sesi Baru" : isZh ? "开启新对话" : "Start New Chat"}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// 7. SuggestionStrip & ChatInputBar
// =============================================================================

function formatCountdownSeconds(sec: number): string {
  const clamped = Math.max(0, Math.floor(sec));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export interface SuggestionStripProps {
  suggestions: ChatSuggestion[];
  activeTimer: ActiveBreakTimerState | null;
  language: AppLanguage;
  onSelectSuggestion: (suggestion: ChatSuggestion) => void;
  onDismissSuggestion: (suggestionId: string) => void;
  onTogglePauseTimer?: () => void;
  onStopTimer?: () => void;
}

export function SuggestionStrip({
  suggestions,
  activeTimer,
  language,
  onSelectSuggestion,
  onDismissSuggestion,
  onTogglePauseTimer,
  onStopTimer,
}: SuggestionStripProps) {
  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  if (suggestions.length === 0 && !activeTimer) return null;

  return (
    <div
      className="chat-suggestions-strip"
      role="region"
      aria-label={
        isBm ? "Cadangan aktiviti & alat" : isZh ? "贴心建议与小练习" : "Suggested actions"
      }
    >
      {activeTimer && (
        <div className="chat-active-timer-pill" role="status" aria-live="polite">
          <ChatIcon name="clock" className="chat-suggestion-icon" />
          <span className="chat-active-timer-label">
            {activeTimer.label} · <strong>{formatCountdownSeconds(activeTimer.secondsLeft)}</strong>
          </span>
          {onTogglePauseTimer && (
            <button
              type="button"
              className="chat-suggestion-dismiss"
              onClick={onTogglePauseTimer}
              aria-label={
                activeTimer.paused
                  ? isBm
                    ? "Sambung pemasa"
                    : isZh
                      ? "继续计时"
                      : "Resume timer"
                  : isBm
                    ? "Jeda pemasa"
                    : isZh
                      ? "暂停计时"
                      : "Pause timer"
              }
            >
              <ChatIcon name={activeTimer.paused ? "play" : "pause"} />
            </button>
          )}
          {onStopTimer && (
            <button
              type="button"
              className="chat-suggestion-dismiss"
              onClick={onStopTimer}
              aria-label={isBm ? "Henti pemasa" : isZh ? "停止计时" : "Stop timer"}
            >
              <ChatIcon name="close" />
            </button>
          )}
        </div>
      )}

      {suggestions.slice(0, 3).map((item) => {
        const iconName =
          item.icon ||
          (item.type === "toolkit"
            ? "toolkit"
            : item.action === "music"
              ? "music"
              : item.action === "timer"
                ? "clock"
                : item.action === "hydrate"
                  ? "droplet"
                  : "sparkles");

        const badgeText =
          item.type === "toolkit" && item.durationMinutes
            ? `${item.durationMinutes}m`
            : item.action === "timer" && item.durationMinutes
              ? `${item.durationMinutes}m`
              : item.type === "toolkit"
                ? isBm
                  ? "Alat"
                  : isZh
                    ? "工具"
                    : "Tool"
                : null;

        return (
          <div
            key={item.id}
            className={`chat-suggestion-pill type-${item.type}`}
          >
            <button
              type="button"
              className="chat-suggestion-trigger"
              onClick={() => onSelectSuggestion(item)}
            >
              <ChatIcon name={iconName} className="chat-suggestion-icon" />
              <span className="chat-suggestion-label">{item.label}</span>
              {badgeText && <span className="chat-suggestion-meta">{badgeText}</span>}
            </button>
            <button
              type="button"
              className="chat-suggestion-dismiss"
              onClick={(e) => {
                e.stopPropagation();
                onDismissSuggestion(item.id);
              }}
              aria-label={`${isBm ? "Tutup" : isZh ? "关闭" : "Dismiss"} ${item.label}`}
            >
              <ChatIcon name="close" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export interface ChatInputBarProps {
  input: string;
  inputMode: "voice" | "text";
  voiceState: "idle" | "listening" | "recording" | "sent";
  voiceTranscript: string;
  voiceInterim: string;
  voiceVolume: number;
  micNotice: string | null;
  typing: boolean;
  keyboardOpen: boolean;
  isLimitReached: boolean;
  freeUsage: number;
  freeLimit: number;
  persona: ChatPersonaId;
  personaOptions: PersonaOptionItem[];
  language: AppLanguage;
  suggestions: ChatSuggestion[];
  activeTimer: ActiveBreakTimerState | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onOpenTonePicker: () => void;
  onOpenAiDisclaimer: () => void;
  onSelectSuggestion: (suggestion: ChatSuggestion) => void;
  onDismissSuggestion: (suggestionId: string) => void;
  onTogglePauseTimer?: () => void;
  onStopTimer?: () => void;
  onDismissMicNotice: () => void;
  onUsePromptSuggestion: (phrase: string) => void;
  onChangeInput: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDownInput: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocusInput?: () => void;
  onBlurInput?: () => void;
  onSubmitText: (e: React.FormEvent) => void;
  onSwitchToTextMode: () => void;
  onSwitchToVoiceMode: () => void;
  onHandleVoiceTap: () => void;
  onStartVoiceListening: () => void;
  onCancelVoice: () => void;
  onSendVoice: () => void;
  onUpgradePlan: () => void;
  labels: {
    placeholder: string;
    aiNotice: string;
    limitTitle: string;
    limitDesc: string;
    unlockBtn: string;
    voiceModeText: string;
    voiceStart: string;
    voiceStop: string;
    voiceListening: string;
    voiceSent: string;
    voiceTapMic: string;
    voiceSendBtn: string;
    sendButton: string;
    cancel: string;
    promptOverwhelmed: string;
    promptBreathing: string;
    promptTalk: string;
  };
}

export function ChatInputBar({
  input,
  inputMode,
  voiceState,
  voiceTranscript,
  voiceInterim,
  voiceVolume,
  micNotice,
  typing,
  keyboardOpen,
  isLimitReached,
  freeUsage,
  freeLimit,
  persona,
  personaOptions,
  language,
  suggestions,
  activeTimer,
  textareaRef,
  onOpenTonePicker,
  onOpenAiDisclaimer,
  onSelectSuggestion,
  onDismissSuggestion,
  onTogglePauseTimer,
  onStopTimer,
  onDismissMicNotice,
  onUsePromptSuggestion,
  onChangeInput,
  onKeyDownInput,
  onFocusInput,
  onBlurInput,
  onSubmitText,
  onSwitchToTextMode,
  onSwitchToVoiceMode,
  onHandleVoiceTap,
  onStartVoiceListening,
  onCancelVoice,
  onSendVoice,
  onUpgradePlan,
  labels,
}: ChatInputBarProps) {
  const showSuggestionRow = Boolean(activeTimer) || (!typing && !keyboardOpen && suggestions.length > 0);

  return (
    <div className="chat-composer-clean">
      {/* Up to 3 reply-aware suggestions in a horizontal scroll row */}
      {showSuggestionRow && (
        <SuggestionStrip
          suggestions={typing || keyboardOpen ? [] : suggestions}
          activeTimer={activeTimer}
          language={language}
          onSelectSuggestion={onSelectSuggestion}
          onDismissSuggestion={onDismissSuggestion}
          onTogglePauseTimer={onTogglePauseTimer}
          onStopTimer={onStopTimer}
        />
      )}

      {/* ToneChip + single-line AI disclaimer on ONE compact row */}
      <div className="chat-composer-meta-row">
        <ToneChip
          persona={persona}
          personaOptions={personaOptions}
          language={language}
          onOpenPicker={onOpenTonePicker}
        />

        <button
          type="button"
          className="chat-ai-disclaimer-btn"
          onClick={onOpenAiDisclaimer}
          title={labels.aiNotice}
          aria-label={labels.aiNotice}
        >
          <ChatIcon name="info" />
          <span className="chat-ai-disclaimer-text">{labels.aiNotice}</span>
        </button>
      </div>

      {isLimitReached ? (
        <div className="chat-limit-banner">
          <div className="limit-banner-text">
            <strong>
              <ChatIcon name="shield" /> {labels.limitTitle} ({freeUsage}/{freeLimit})
            </strong>
            <p>{labels.limitDesc}</p>
          </div>
          <button
            type="button"
            className="btn primary full upgrade-btn"
            onClick={onUpgradePlan}
          >
            {labels.unlockBtn}
          </button>
        </div>
      ) : (
        <>
          {micNotice && (
            <div className="voice-mic-notice-card">
              <div className="voice-mic-notice-header">
                <ChatIcon name="info" />
                <span>{micNotice}</span>
                <button
                  type="button"
                  className="notice-dismiss-btn"
                  onClick={onDismissMicNotice}
                  aria-label="Dismiss notice"
                >
                  <ChatIcon name="close" />
                </button>
              </div>
              <div className="voice-prompt-chips">
                {[
                  labels.promptOverwhelmed,
                  labels.promptBreathing,
                  labels.promptTalk,
                ].map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => onUsePromptSuggestion(phrase)}
                  >
                    💬 "{phrase}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {inputMode === "voice" || voiceState === "listening" || voiceState === "recording" ? (
            <div className={`chat-input-bar voice-mode state-${voiceState}`}>
              <button
                type="button"
                className="composer-icon-btn keyboard-toggle-btn"
                onClick={onSwitchToTextMode}
                title={labels.voiceModeText}
                aria-label="Switch to typing keyboard"
              >
                <ChatIcon name="keyboard" />
              </button>

              <div
                className="voice-recording-track"
                onClick={() => {
                  if (voiceState === "idle" || voiceState === "sent") {
                    onStartVoiceListening();
                  } else {
                    onHandleVoiceTap();
                  }
                }}
              >
                <button
                  type="button"
                  className={`voice-mic-pill ${
                    voiceState === "listening" || voiceState === "recording" ? "recording" : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onHandleVoiceTap();
                  }}
                  aria-label={
                    voiceState === "listening" ? "Stop and send speech" : "Tap to speak"
                  }
                  title={
                    voiceState === "listening" ? labels.voiceStop : labels.voiceStart
                  }
                >
                  <ChatIcon
                    name={
                      voiceState === "listening" || voiceState === "recording"
                        ? "mic"
                        : voiceState === "sent"
                          ? "check"
                          : "mic"
                    }
                  />
                </button>

                {voiceState === "listening" && (
                  <div className="voice-live-waves mini" aria-hidden="true">
                    <span style={{ height: `${Math.max(4, voiceVolume * 18)}px` }} />
                    <span style={{ height: `${Math.max(6, voiceVolume * 26)}px` }} />
                    <span style={{ height: `${Math.max(5, voiceVolume * 22)}px` }} />
                    <span style={{ height: `${Math.max(8, voiceVolume * 30)}px` }} />
                    <span style={{ height: `${Math.max(4, voiceVolume * 16)}px` }} />
                  </div>
                )}

                <div className="voice-text-stream">
                  {voiceTranscript || voiceInterim ? (
                    <span className="transcript-live">
                      {voiceTranscript}
                      {voiceInterim && (
                        <span className="transcript-interim"> {voiceInterim}</span>
                      )}
                    </span>
                  ) : (
                    <span className="voice-status-hint">
                      {voiceState === "listening"
                        ? labels.voiceListening
                        : voiceState === "sent"
                          ? labels.voiceSent
                          : labels.voiceTapMic}
                    </span>
                  )}
                </div>
              </div>

              <div className="composer-actions">
                <button
                  type="button"
                  className="composer-icon-btn cancel-btn"
                  onClick={onCancelVoice}
                  title={labels.cancel}
                  aria-label={labels.cancel}
                >
                  <ChatIcon name="close" />
                </button>
                <button
                  type="button"
                  className={`composer-icon-btn send-btn ${
                    voiceTranscript.trim() || voiceInterim.trim() ? "ready" : ""
                  }`}
                  disabled={typing || (!voiceTranscript.trim() && !voiceInterim.trim())}
                  onClick={onSendVoice}
                  title={labels.voiceSendBtn}
                  aria-label={labels.voiceSendBtn}
                >
                  <ChatIcon name="send" />
                </button>
              </div>
            </div>
          ) : (
            <form
              className="chat-input-bar text-mode"
              onSubmit={onSubmitText}
              onClick={(e) => {
                if (
                  (e.target as HTMLElement).tagName !== "BUTTON" &&
                  !(e.target as HTMLElement).closest("button")
                ) {
                  textareaRef.current?.focus();
                }
              }}
            >
              <textarea
                ref={textareaRef}
                className="chat-textarea"
                rows={1}
                value={input}
                onChange={onChangeInput}
                onKeyDown={onKeyDownInput}
                onFocus={onFocusInput}
                onBlur={onBlurInput}
                placeholder={labels.placeholder}
                aria-label="Message ONY"
                maxLength={2000}
              />
              <div className="composer-actions">
                <button
                  type="button"
                  className="composer-icon-btn mic-btn"
                  onClick={onSwitchToVoiceMode}
                  title={labels.voiceStart}
                  aria-label={labels.voiceStart}
                  disabled={typing}
                >
                  <ChatIcon name="mic" />
                </button>
                <button
                  type="submit"
                  className={`composer-icon-btn send-btn ${input.trim() ? "ready" : ""}`}
                  disabled={typing || !input.trim()}
                  title={labels.sendButton}
                  aria-label={labels.sendButton}
                >
                  <ChatIcon name="send" />
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// 8. ChatOverflowSheet (More Menu: New Chat, Mode Switch, Voice, Music, Toolkit, Safety, Help)
// =============================================================================

export interface ChatOverflowSheetProps {
  open: boolean;
  onClose: () => void;
  chatViewMode: ChatViewMode;
  onChangeChatViewMode: (mode: ChatViewMode) => void;
  hasMessages: boolean;
  autoSpeak: boolean;
  soundOn: boolean;
  unreadCount: number;
  memoryActive: boolean;
  language: AppLanguage;
  onNewChat: () => void;
  onToggleAutoSpeak: () => void;
  onToggleSound: () => void;
  onOpenMusicModal?: () => void;
  onOpenNotifications: () => void;
  onOpenToolkit: () => void;
  onOpenSafety: () => void;
  onOpenHelp: () => void;
  onOpenMemoryTab: () => void;
}

export function ChatOverflowSheet({
  open,
  onClose,
  chatViewMode,
  onChangeChatViewMode,
  hasMessages,
  autoSpeak,
  soundOn,
  unreadCount,
  memoryActive,
  language,
  onNewChat,
  onToggleAutoSpeak,
  onToggleSound,
  onOpenMusicModal,
  onOpenNotifications,
  onOpenToolkit,
  onOpenSafety,
  onOpenHelp,
  onOpenMemoryTab,
}: ChatOverflowSheetProps) {
  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="chat-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={isBm ? "Pilihan sembang" : isZh ? "对话选项菜单" : "Chat options"}
      onClick={onClose}
    >
      <div
        className="chat-bottom-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chat-sheet-handle-row" onClick={onClose}>
          <span className="chat-sheet-handle" aria-hidden="true" />
        </div>

        <div className="chat-sheet-header compact">
          <div className="chat-sheet-title-group">
            <h2>{isBm ? "Pilihan Sembang" : isZh ? "对话设置与工具" : "Chat Options"}</h2>
          </div>
          <button
            type="button"
            className="chat-sheet-close-btn"
            onClick={onClose}
            aria-label={isBm ? "Tutup" : isZh ? "关闭" : "Close"}
          >
            <ChatIcon name="close" />
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="chat-overflow-mode-box">
          <span className="chat-overflow-section-label">
            {isBm ? "MOD PAPARAN" : isZh ? "显示模式" : "CHAT VIEW MODE"}
          </span>
          <div className="chat-mode-segmented" role="radiogroup" aria-label="Chat view mode">
            <button
              type="button"
              role="radio"
              aria-checked={chatViewMode === "companion"}
              className={`chat-mode-seg-btn ${chatViewMode === "companion" ? "active" : ""}`}
              onClick={() => {
                onChangeChatViewMode("companion");
                onClose();
              }}
            >
              <ChatIcon name="companionView" />
              <span>
                {isBm ? "Paparan Teman" : isZh ? "伴侣模式" : "Companion view"}
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={chatViewMode === "classic"}
              className={`chat-mode-seg-btn ${chatViewMode === "classic" ? "active" : ""}`}
              onClick={() => {
                onChangeChatViewMode("classic");
                onClose();
              }}
            >
              <ChatIcon name="classicView" />
              <span>
                {isBm ? "Sembang Klasik" : isZh ? "经典对话" : "Classic chat"}
              </span>
            </button>
          </div>
        </div>

        {/* Overflow Action Rows */}
        <div className="chat-overflow-list">
          <button
            type="button"
            className="chat-overflow-item"
            disabled={!hasMessages}
            onClick={() => {
              onNewChat();
              onClose();
            }}
          >
            <span className="chat-overflow-icon">
              <ChatIcon name="plus" />
            </span>
            <span className="chat-overflow-texts">
              <strong>{isBm ? "Perbualan Baru" : isZh ? "开启新对话" : "New Chat"}</strong>
              <small>
                {hasMessages
                  ? isBm
                    ? "Mulakan lembaran perbualan baru"
                    : isZh
                      ? "清空当前画面并开启新会话"
                      : "Start a fresh conversation thread"
                  : isBm
                    ? "Anda sudah berada di perbualan baru"
                    : isZh
                      ? "当前已是全新对话"
                      : "Already on a fresh chat"}
              </small>
            </span>
          </button>

          <button
            type="button"
            className="chat-overflow-item"
            onClick={() => {
              onToggleAutoSpeak();
            }}
            aria-pressed={autoSpeak}
          >
            <span className={`chat-overflow-icon ${autoSpeak ? "active" : ""}`}>
              <ChatIcon name={autoSpeak ? "volume" : "volumeOff"} />
            </span>
            <span className="chat-overflow-texts">
              <strong>{isBm ? "Suara Bacaan ONY" : isZh ? "ONY 语音播报" : "ONY Voice Read-Aloud"}</strong>
              <small>
                {autoSpeak
                  ? isBm
                    ? "Aktif · Jawapan akan dibaca secara automatik"
                    : isZh
                      ? "已开启 · 自动朗读 ONY 回复"
                      : "On · Replies are spoken aloud"
                  : isBm
                    ? "Dimatikan · Ketik untuk aktifkan"
                    : isZh
                      ? "已关闭 · 点击开启自动朗读"
                      : "Off · Tap to hear replies aloud"}
              </small>
            </span>
            <span className={`chat-overflow-pill ${autoSpeak ? "on" : ""}`}>
              {autoSpeak ? (isBm ? "Aktif" : isZh ? "开" : "On") : isBm ? "Tutup" : isZh ? "关" : "Off"}
            </span>
          </button>

          <button
            type="button"
            className="chat-overflow-item"
            onClick={() => {
              if (onOpenMusicModal) {
                onClose();
                onOpenMusicModal();
              } else {
                onToggleSound();
              }
            }}
          >
            <span className={`chat-overflow-icon ${soundOn ? "active" : ""}`}>
              <ChatIcon name="music" />
            </span>
            <span className="chat-overflow-texts">
              <strong>{isBm ? "Muzik & Bunyi Tenang" : isZh ? "疗愈舒缓音乐" : "Calming Sounds"}</strong>
              <small>
                {soundOn
                  ? isBm
                    ? "Sedang dimainkan · Ketik untuk tukar trek"
                    : isZh
                      ? "正在播放 · 点击更换曲目"
                      : "Playing · Tap to browse tracks"
                  : isBm
                    ? "432Hz, hujan lembut & ombak laut"
                    : isZh
                      ? "432Hz、雨声与白噪音"
                      : "Ambient frequencies & rain sounds"}
              </small>
            </span>
            <span className={`chat-overflow-pill ${soundOn ? "on" : ""}`}>
              {soundOn ? (isBm ? "Main" : isZh ? "播放中" : "Playing") : isBm ? "Buka" : isZh ? "打开" : "Browse"}
            </span>
          </button>

          <button
            type="button"
            className="chat-overflow-item"
            onClick={() => {
              onClose();
              onOpenNotifications();
            }}
          >
            <span className="chat-overflow-icon">
              <ChatIcon name="bell" />
            </span>
            <span className="chat-overflow-texts">
              <strong>{isBm ? "Notifikasi" : isZh ? "消息通知" : "Notifications"}</strong>
              <small>
                {unreadCount > 0
                  ? isBm
                    ? `${unreadCount} notifikasi belum dibaca`
                    : isZh
                      ? `${unreadCount} 条未读通知`
                      : `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                  : isBm
                    ? "Semua telah dibaca"
                    : isZh
                      ? "暂无未读通知"
                      : "All caught up"}
              </small>
            </span>
            {unreadCount > 0 && <span className="chat-overflow-badge">{unreadCount}</span>}
          </button>

          <button
            type="button"
            className="chat-overflow-item"
            onClick={() => {
              onClose();
              onOpenMemoryTab();
            }}
          >
            <span className={`chat-overflow-icon ${memoryActive ? "active" : ""}`}>
              <ChatIcon name="memory" />
            </span>
            <span className="chat-overflow-texts">
              <strong>{isBm ? "Peti Memori & Diari" : isZh ? "记忆与日记本" : "Memory Vault & Journal"}</strong>
              <small>
                {memoryActive
                  ? isBm
                    ? "Konteks memori aktif"
                    : isZh
                      ? "个性化记忆已开启"
                      : "Active consented context"
                  : isBm
                    ? "Konteks memori dijeda"
                    : isZh
                      ? "个性化记忆已暂停"
                      : "Memory context paused"}
              </small>
            </span>
          </button>

          <button
            type="button"
            className="chat-overflow-item"
            onClick={() => {
              onClose();
              onOpenToolkit();
            }}
          >
            <span className="chat-overflow-icon">
              <ChatIcon name="toolkit" />
            </span>
            <span className="chat-overflow-texts">
              <strong>{isBm ? "Toolkit Bantuan Diri" : isZh ? "自助解压工具箱" : "Wellness Toolkit"}</strong>
              <small>
                {isBm
                  ? "Pernafasan, pembumian & panduan tenang"
                  : isZh
                    ? "呼吸练习、着陆法与情绪指南"
                    : "Breathing, grounding & coping guides"}
              </small>
            </span>
          </button>

          <button
            type="button"
            className="chat-overflow-item"
            onClick={() => {
              onClose();
              onOpenSafety();
            }}
          >
            <span className="chat-overflow-icon">
              <ChatIcon name="shield" />
            </span>
            <span className="chat-overflow-texts">
              <strong>{isBm ? "Protokol Keselamatan" : isZh ? "安全支持协议" : "Safety Protocols"}</strong>
              <small>
                {isBm
                  ? "Talian bantuan krisis & kenalan dipercayai"
                  : isZh
                    ? "危机援助热线与信任联系人"
                    : "Crisis helplines & trusted contacts"}
              </small>
            </span>
          </button>

          <button
            type="button"
            className="chat-overflow-item"
            onClick={() => {
              onClose();
              onOpenHelp();
            }}
          >
            <span className="chat-overflow-icon">
              <ChatIcon name="helpCircle" />
            </span>
            <span className="chat-overflow-texts">
              <strong>{isBm ? "Bantuan & Talian Krisis" : isZh ? "帮助与求助热线" : "Help & Helplines"}</strong>
              <small>
                {isBm
                  ? "Sokongan manusia 24/7 (999 / HEAL 15555)"
                  : isZh
                    ? "24/7 人工心理援助信息"
                    : "24/7 emergency numbers & FAQs"}
              </small>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 9. ChatTonePickerSheet (Bottom Sheet opened by ToneChip)
// =============================================================================

export interface ChatTonePickerSheetProps {
  open: boolean;
  onClose: () => void;
  persona: ChatPersonaId;
  personaOptions: PersonaOptionItem[];
  language: AppLanguage;
  onSelectPersona: (nextPersona: ChatPersonaId) => void;
}

export function ChatTonePickerSheet({
  open,
  onClose,
  persona,
  personaOptions,
  language,
  onSelectPersona,
}: ChatTonePickerSheetProps) {
  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="chat-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={isBm ? "Pilih nada respons" : isZh ? "选择对话语气" : "Choose response tone"}
      onClick={onClose}
    >
      <div className="chat-bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="chat-sheet-handle-row" onClick={onClose}>
          <span className="chat-sheet-handle" aria-hidden="true" />
        </div>

        <div className="chat-sheet-header compact">
          <div className="chat-sheet-title-group">
            <h2>
              {isBm ? "Nada Respons ONY" : isZh ? "选择 ONY 对话语气" : "Conversation Tone"}
            </h2>
            <p>
              {isBm
                ? "Pilih gaya bahasa yang paling selesa untuk anda"
                : isZh
                  ? "选择当下最让您感到舒适的交流方式"
                  : "Pick the style that feels most comforting right now"}
            </p>
          </div>
          <button
            type="button"
            className="chat-sheet-close-btn"
            onClick={onClose}
            aria-label={isBm ? "Tutup" : isZh ? "关闭" : "Close"}
          >
            <ChatIcon name="close" />
          </button>
        </div>

        <div className="chat-tone-picker-list" role="radiogroup">
          {personaOptions.map((opt) => {
            const details = getPersonaDetails(
              opt.id,
              opt.name,
              opt.note,
              opt.preview,
              language,
            );
            const active = persona === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`chat-tone-option-card ${active ? "active" : ""}`}
                onClick={() => {
                  onSelectPersona(opt.id);
                  onClose();
                }}
              >
                <div className="chat-tone-option-top">
                  <span className="chat-tone-option-emoji" aria-hidden="true">
                    {getToneEmoji(opt.id)}
                  </span>
                  <div className="chat-tone-option-title">
                    <strong>{details.name}</strong>
                    <small>{details.note}</small>
                  </div>
                  {active && (
                    <span className="chat-tone-option-check">
                      <ChatIcon name="check" />
                    </span>
                  )}
                </div>
                <p className="chat-tone-option-preview">"{details.preview}"</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 10. AiDisclaimerSheet (Clean modal when tapping the 1-line AI notice)
// =============================================================================

export interface AiDisclaimerSheetProps {
  open: boolean;
  onClose: () => void;
  language: AppLanguage;
  onOpenSafety: () => void;
  onOpenToolkit: () => void;
}

export function AiDisclaimerSheet({
  open,
  onClose,
  language,
  onOpenSafety,
  onOpenToolkit,
}: AiDisclaimerSheetProps) {
  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="chat-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={isBm ? "Maklumat AI ONY" : isZh ? "AI 伴侣说明" : "About ONY AI"}
      onClick={onClose}
    >
      <div className="chat-bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="chat-sheet-handle-row" onClick={onClose}>
          <span className="chat-sheet-handle" aria-hidden="true" />
        </div>

        <div className="chat-sheet-header compact">
          <div className="chat-sheet-title-group">
            <h2>
              {isBm ? "Tentang Sokongan AI ONY" : isZh ? "关于 ONY AI 陪伴说明" : "About ONY Companion AI"}
            </h2>
          </div>
          <button
            type="button"
            className="chat-sheet-close-btn"
            onClick={onClose}
            aria-label={isBm ? "Tutup" : isZh ? "关闭" : "Close"}
          >
            <ChatIcon name="close" />
          </button>
        </div>

        <div className="chat-disclaimer-body">
          <p>
            {isBm
              ? "ONY ialah teman AI untuk sokongan emosi harian dan refleksi kendiri. Respons AI boleh membuat kesilapan dan bukan diagnosis perubatan, psikoterapi, atau rawatan kecemasan."
              : isZh
                ? "ONY 是为您提供日常情绪陪伴与自我反思的 AI 伙伴。AI 回复可能存在误差，不能替代专业医疗诊断、心理治疗或紧急救援服务。"
                : "ONY is an AI companion designed for everyday emotional support and self-reflection. AI responses can be inaccurate and are not medical care, diagnosis, psychotherapy, or emergency treatment."}
          </p>
          <p className="chat-disclaimer-crisis">
            {isBm
              ? "Jika anda berada dalam kecemasan segera, hubungi 999 atau Talian HEAL 15555."
              : isZh
                ? "如遇紧急危机或安全风险，请立即拨打当地急救电话（如 999）或心理危机热线 15555。"
                : "If you are in immediate danger or distress, please call emergency services (999) or Talian HEAL 15555."}
          </p>

          <div className="chat-disclaimer-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                onClose();
                onOpenToolkit();
              }}
            >
              {isBm ? "Buka Toolkit" : isZh ? "打开自助工具箱" : "Open Self-Help Toolkit"}
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                onClose();
                onOpenSafety();
              }}
            >
              {isBm ? "Talian Bantuan" : isZh ? "查看求助热线" : "View Crisis Helplines"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
