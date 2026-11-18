import React, { useRef } from "react";
import type { AppLanguage } from "../../i18n/translations";
import type { AutoOrganizeChatsMode } from "../../theme/ThemeContext";
import {
  type ChatLibraryConversation,
  type ChatLibraryFolder,
  evaluateChatFolderSuggestion,
  formatRelativeActivityTime,
  getConversationTimestampMs,
  getLastMessagePreview,
} from "../../utils/chatLibraryHelpers";
import { LibUiIcon } from "./FolderGlyph";
import { SuggestionChip } from "./SuggestionChip";

export interface ChatCardProps {
  chat: ChatLibraryConversation;
  folders: ChatLibraryFolder[];
  language: AppLanguage;
  autoOrganizeChats: AutoOrganizeChatsMode;
  isSelectMode: boolean;
  isSelected: boolean;
  highlightSnippet?: string;
  folderBadgeName?: string;
  compact?: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  onEnterSelectMode: () => void;
  onOpenMenu: () => void;
  onAcceptSuggestion?: () => void;
  onDismissSuggestion?: () => void;
}

export function ChatCard({
  chat,
  folders,
  language,
  autoOrganizeChats,
  isSelectMode,
  isSelected,
  highlightSnippet,
  folderBadgeName,
  compact = false,
  onOpen,
  onToggleSelect,
  onEnterSelectMode,
  onOpenMenu,
  onAcceptSuggestion,
  onDismissSuggestion,
}: ChatCardProps) {
  const longPressTimerRef = useRef<number | null>(null);
  const longPressedRef = useRef(false);
  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  const previewText = highlightSnippet || getLastMessagePreview(chat, language);
  const timeText = formatRelativeActivityTime(getConversationTimestampMs(chat), language);
  const reportIncluded = chat.reportAllowed !== false;

  const suggestion =
    autoOrganizeChats === "suggest"
      ? evaluateChatFolderSuggestion(chat, folders, language)
      : null;

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <div
      className={`chat-lib-card ${compact ? "compact" : ""} ${isSelected ? "selected" : ""}`}
      draggable={!isSelectMode}
      onDragStart={(e) => {
        if (isSelectMode) return;
        e.dataTransfer.setData("text/ony-chat-id", String(chat.id));
        e.dataTransfer.effectAllowed = "move";
      }}
      onPointerDown={() => {
        longPressedRef.current = false;
        if (isSelectMode) return;
        clearLongPress();
        longPressTimerRef.current = window.setTimeout(() => {
          longPressedRef.current = true;
          onEnterSelectMode();
          longPressTimerRef.current = null;
        }, 520);
      }}
      onPointerMove={clearLongPress}
      onPointerUp={clearLongPress}
      onPointerCancel={clearLongPress}
      onClick={() => {
        if (longPressedRef.current) return;
        if (isSelectMode) {
          onToggleSelect();
        } else {
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelectMode ? isSelected : undefined}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (isSelectMode) onToggleSelect();
          else onOpen();
        }
      }}
    >
      <div className="chat-lib-card-main">
        {isSelectMode && (
          <span
            className={`chat-lib-checkbox ${isSelected ? "checked" : ""}`}
            aria-hidden="true"
          >
            {isSelected && <LibUiIcon name="check" size={14} />}
          </span>
        )}

        <div className="chat-lib-card-content">
          <div className="chat-lib-card-top">
            <strong className="chat-lib-card-title">{chat.title}</strong>
            <div className="chat-lib-card-right-meta">
              {reportIncluded && (
                <span
                  className="chat-lib-report-dot-icon"
                  title={
                    isBm
                      ? "Disertakan dalam Refleksi Bulanan"
                      : isZh
                        ? "已授权纳入月度总结"
                        : "Included in Monthly Reflection"
                  }
                  aria-label={
                    isBm
                      ? "Disertakan dalam laporan bulanan"
                      : isZh
                        ? "已纳入月度总结"
                        : "Included in monthly report"
                  }
                >
                  <LibUiIcon name="report" size={13} />
                </span>
              )}
              <span className="chat-lib-card-time">{timeText}</span>
            </div>
          </div>

          <p className="chat-lib-card-preview">{previewText}</p>

          {folderBadgeName && (
            <span className="chat-lib-search-folder-tag">{folderBadgeName}</span>
          )}
        </div>

        {!isSelectMode && (
          <button
            type="button"
            className="chat-lib-card-more"
            aria-label={
              isBm
                ? `Tindakan untuk ${chat.title}`
                : isZh
                  ? `${chat.title} 更多操作`
                  : `Options for ${chat.title}`
            }
            onClick={(e) => {
              e.stopPropagation();
              onOpenMenu();
            }}
          >
            <LibUiIcon name="more" size={16} />
          </button>
        )}
      </div>

      {suggestion && !isSelectMode && onAcceptSuggestion && onDismissSuggestion && (
        <SuggestionChip
          suggestion={suggestion}
          language={language}
          compact
          onAccept={(e) => {
            e.stopPropagation();
            onAcceptSuggestion();
          }}
          onDismiss={(e) => {
            e.stopPropagation();
            onDismissSuggestion();
          }}
        />
      )}
    </div>
  );
}
