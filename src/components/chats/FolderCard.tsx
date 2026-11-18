import React, { useRef, useState } from "react";
import type { AppLanguage } from "../../i18n/translations";
import { useTheme } from "../../theme/ThemeContext";
import {
  type ChatLibraryFolder,
  type VirtualFolderId,
  formatRelativeActivityTime,
  getFolderAccentHex,
  getLocalizedDefaultFolderName,
  resolveFolderDefaults,
} from "../../utils/chatLibraryHelpers";
import { FolderGlyph, LibUiIcon } from "./FolderGlyph";

export interface FolderCardProps {
  id: number | VirtualFolderId;
  folder?: ChatLibraryFolder;
  name: string;
  count: number;
  lastActivityMs: number | null;
  isVirtual?: boolean;
  virtualKind?: VirtualFolderId;
  hasBadgeDot?: boolean;
  language: AppLanguage;
  onOpen: () => void;
  onOpenMenu?: (anchorEl: HTMLElement) => void;
  onDropChatId?: (chatId: number) => void;
}

export function FolderCard({
  id,
  folder,
  name,
  count,
  lastActivityMs,
  isVirtual = false,
  virtualKind,
  hasBadgeDot = false,
  language,
  onOpen,
  onOpenMenu,
  onDropChatId,
}: FolderCardProps) {
  const { isDark } = useTheme();
  const [dragHover, setDragHover] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const movedRef = useRef(false);

  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  const { color, icon } = folder
    ? resolveFolderDefaults(folder)
    : {
        color: virtualKind === "archived" ? "slate" : "peach",
        icon: virtualKind === "archived" ? "archive" : "inbox",
      };

  const accentHex = getFolderAccentHex(color, isDark);
  const displayName = folder ? getLocalizedDefaultFolderName(folder, language) : name;

  const countText =
    count === 1
      ? isBm
        ? "1 sembang"
        : isZh
          ? "1 段对话"
          : "1 chat"
      : isBm
        ? `${count} sembang`
        : isZh
          ? `${count} 段对话`
          : `${count} chats`;

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = () => {
    movedRef.current = false;
    if (!onOpenMenu || isVirtual) return;
    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      if (cardRef.current) {
        onOpenMenu(cardRef.current);
      }
      longPressTimerRef.current = null;
    }, 520);
  };

  return (
    <div
      ref={cardRef}
      className={`chat-folder-card ${isVirtual ? "is-virtual" : ""} ${dragHover ? "is-drop-target" : ""}`}
      style={{ "--folder-accent": accentHex } as React.CSSProperties}
      role="button"
      tabIndex={0}
      aria-label={`${displayName}, ${countText}`}
      onClick={() => {
        if (movedRef.current) return;
        onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={() => {
        movedRef.current = true;
        clearLongPress();
      }}
      onPointerUp={clearLongPress}
      onPointerCancel={clearLongPress}
      onDragOver={(e) => {
        if (virtualKind === "archived" && id === "archived") {
          e.preventDefault();
          setDragHover(true);
        } else if (typeof id === "number" || id === "unsorted") {
          e.preventDefault();
          setDragHover(true);
        }
      }}
      onDragLeave={() => setDragHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragHover(false);
        const raw = e.dataTransfer.getData("text/ony-chat-id");
        const chatId = Number(raw);
        if (!Number.isNaN(chatId) && chatId > 0 && onDropChatId) {
          onDropChatId(chatId);
        }
      }}
    >
      <div className="chat-folder-card-top">
        <span className="chat-folder-glyph-wrap">
          <FolderGlyph icon={icon} size={20} />
          {(hasBadgeDot || folder?.pinned) && (
            <span className="chat-folder-badge-dot" aria-hidden="true" />
          )}
        </span>

        {!isVirtual && onOpenMenu && (
          <button
            type="button"
            className="chat-folder-more-btn"
            aria-label={isBm ? `Pilihan folder ${displayName}` : isZh ? `${displayName} 文件夹选项` : `${displayName} folder options`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenMenu(e.currentTarget);
            }}
          >
            <LibUiIcon name="more" size={16} />
          </button>
        )}
      </div>

      <div className="chat-folder-card-body">
        <strong className="chat-folder-card-name">{displayName}</strong>
        <div className="chat-folder-card-meta">
          <span>{countText}</span>
          {count > 0 && lastActivityMs && (
            <>
              <span aria-hidden="true">·</span>
              <span>{formatRelativeActivityTime(lastActivityMs, language)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
