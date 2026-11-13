import { useEffect, useRef, useState } from "react";
import type { AppLanguage } from "../../i18n/translations";
import {
  getReactionEmoji,
  getReactionLabel,
  triggerSubtleHaptic,
  type PostReactionSummary,
  type SupportiveReactionType,
} from "../../utils/communityPostHelpers";
import { ReactionPill } from "./ReactionPill";

export interface ReactionBarProps {
  postId: string;
  summary: PostReactionSummary;
  commentCount: number;
  isSaved: boolean;
  onSelectReaction: (postId: string, reaction: SupportiveReactionType) => void;
  onOpenComments: (postId: string) => void;
  onSavePost: (postId: string) => void;
  language: AppLanguage;
  compact?: boolean;
}

export function ReactionBar({
  postId,
  summary,
  commentCount,
  isSaved,
  onSelectReaction,
  onOpenComments,
  onSavePost,
  language,
  compact = false,
}: ReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const anchorGroupRef = useRef<HTMLDivElement | null>(null);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => clearLongPressTimer, []);

  const triggerBounceAndHaptic = () => {
    triggerSubtleHaptic(10);
    setBouncing(true);
    window.setTimeout(() => setBouncing(false), 240);
  };

  const primaryType: SupportiveReactionType = summary.myReaction || "hug";
  const primaryEmoji = getReactionEmoji(primaryType);
  const primaryLabel = getReactionLabel(primaryType, language);

  const handlePrimaryPointerDown = () => {
    longPressTriggeredRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      triggerSubtleHaptic(12);
      setPickerOpen(true);
    }, 380);
  };

  const handlePrimaryPointerUp = () => {
    clearLongPressTimer();
  };

  const handlePrimaryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    triggerBounceAndHaptic();
    onSelectReaction(postId, primaryType);
  };

  const handlePickFromPill = (type: SupportiveReactionType) => {
    setPickerOpen(false);
    triggerBounceAndHaptic();
    onSelectReaction(postId, type);
  };

  const commentAria =
    language === "Bahasa Melayu"
      ? `Buka komen, ${commentCount} komen`
      : language === "中文"
        ? `查看评论，共 ${commentCount} 条`
        : `Open comments, ${commentCount} ${commentCount === 1 ? "comment" : "comments"}`;

  const saveLabel = isSaved
    ? language === "Bahasa Melayu"
      ? "Disimpan"
      : language === "中文"
        ? "已存"
        : "Saved"
    : language === "Bahasa Melayu"
      ? "Simpan"
      : language === "中文"
        ? "收藏"
        : "Save";

  const saveAria =
    language === "Bahasa Melayu"
      ? isSaved
        ? "Disimpan ke Peti Memori"
        : "Simpan siaran ke Peti Memori"
      : language === "中文"
        ? isSaved
          ? "已保存到记忆宝库"
          : "保存帖子到记忆宝库"
        : isSaved
          ? "Saved to Memory Vault"
          : "Save post to Memory Vault";

  // Keep reaction display minimal: top 2-3 emojis + total count
  const topReactionEmojis = summary.activeTypes.slice(0, 3).map(getReactionEmoji);

  return (
    <div
      className={`reaction-bar ${compact ? "compact" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      <ReactionPill
        open={pickerOpen}
        anchorEl={anchorGroupRef.current}
        summary={summary}
        language={language}
        onSelect={handlePickFromPill}
        onClose={() => setPickerOpen(false)}
      />

      <div className="reaction-primary-group" ref={anchorGroupRef}>
        <button
          type="button"
          className={`reaction-pill-btn ${summary.likedByMe ? "active" : ""} ${bouncing ? "bouncing" : ""}`}
          onPointerDown={handlePrimaryPointerDown}
          onPointerUp={handlePrimaryPointerUp}
          onPointerCancel={handlePrimaryPointerUp}
          onPointerLeave={handlePrimaryPointerUp}
          onContextMenu={(e) => {
            e.preventDefault();
            setPickerOpen((prev) => !prev);
          }}
          onClick={handlePrimaryClick}
          aria-pressed={summary.likedByMe}
          aria-label={`${primaryLabel}${summary.totalCount > 0 ? `, ${summary.totalCount}` : ""}. ${
            language === "Bahasa Melayu"
              ? "Tekan lama untuk reaksi lain"
              : language === "中文"
                ? "长按可选择更多回应"
                : "Long press for more reactions"
          }`}
        >
          <span className="reaction-emoji-main" aria-hidden="true">
            {topReactionEmojis.length > 1
              ? topReactionEmojis.join("")
              : primaryEmoji}
          </span>
          {!compact && (
            <span className="reaction-label-text">{primaryLabel}</span>
          )}
          {summary.totalCount > 0 && (
            <span className="reaction-total-badge">{summary.totalCount}</span>
          )}
        </button>

        <button
          type="button"
          className={`reaction-more-trigger ${pickerOpen ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setPickerOpen((prev) => !prev);
          }}
          aria-expanded={pickerOpen}
          aria-haspopup="menu"
          aria-label={
            language === "Bahasa Melayu"
              ? "Pilih reaksi sokongan"
              : language === "中文"
                ? "选择其他回应"
                : "Choose supportive reaction"
          }
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="reaction-bar-svg">
            <path d="m7 14 5-5 5 5" />
          </svg>
        </button>
      </div>

      <div className="reaction-secondary-actions">
        <button
          type="button"
          className="reaction-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            onOpenComments(postId);
          }}
          aria-label={commentAria}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="reaction-bar-svg">
            <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4V7a2 2 0 0 1 2-2Z" />
          </svg>
          <span>{commentCount}</span>
        </button>

        <button
          type="button"
          className={`reaction-action-btn ${isSaved ? "saved" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            triggerSubtleHaptic(8);
            onSavePost(postId);
          }}
          aria-pressed={isSaved}
          aria-label={saveAria}
          title={saveAria}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="reaction-bar-svg">
            <path
              d="M6 3h12v18l-6-3.8L6 21V3Z"
              fill={isSaved ? "currentColor" : "none"}
            />
          </svg>
          {!compact && <span>{saveLabel}</span>}
        </button>
      </div>
    </div>
  );
}

export default ReactionBar;
