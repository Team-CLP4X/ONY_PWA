import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AppLanguage } from "../../i18n/translations";
import { useTheme } from "../../theme/ThemeContext";
import { ThemedSwitch } from "../common/ThemedSwitch";
import {
  type ChatLibraryConversation,
  type ChatLibraryFolder,
  getFolderAccentHex,
  getLocalizedDefaultFolderName,
  resolveFolderDefaults,
} from "../../utils/chatLibraryHelpers";
import { FolderGlyph, LibUiIcon } from "./FolderGlyph";

export interface ChatOrganizeSheetProps {
  open: boolean;
  /** When single chat is organized, pass chat; when bulk-moving multiple selected chats, pass null + bulkCount */
  chat: ChatLibraryConversation | null;
  bulkCount?: number;
  folders: ChatLibraryFolder[];
  language: AppLanguage;
  onClose: () => void;
  onSaveSingle?: (payload: {
    id: number;
    title: string;
    folderId: number | undefined;
    reportAllowed: boolean;
  }) => void;
  onBulkMove?: (folderId: number | undefined) => void;
  onToggleArchiveSingle?: (chat: ChatLibraryConversation) => void;
  onRequestDeleteSingle?: (chat: ChatLibraryConversation) => void;
}

export function ChatOrganizeSheet({
  open,
  chat,
  bulkCount = 0,
  folders,
  language,
  onClose,
  onSaveSingle,
  onBulkMove,
  onToggleArchiveSingle,
  onRequestDeleteSingle,
}: ChatOrganizeSheetProps) {
  const { isDark } = useTheme();
  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  const isBulk = !chat && bulkCount > 0;
  const [title, setTitle] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | undefined>(undefined);
  const [reportAllowed, setReportAllowed] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (chat) {
      setTitle(chat.title);
      setSelectedFolderId(chat.folderId);
      setReportAllowed(chat.reportAllowed !== false);
    } else {
      setTitle("");
      setSelectedFolderId(undefined);
      setReportAllowed(true);
    }
  }, [open, chat]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const heading = isBulk
    ? isBm
      ? `Pindahkan ${bulkCount} sembang`
      : isZh
        ? `移动 ${bulkCount} 段对话`
        : `Move ${bulkCount} chat${bulkCount === 1 ? "" : "s"}`
    : isBm
      ? "Susun Sembang"
      : isZh
        ? "整理对话"
        : "Organize Chat";

  const handleDone = () => {
    if (isBulk && onBulkMove) {
      onBulkMove(selectedFolderId);
      onClose();
      return;
    }
    if (chat && onSaveSingle) {
      onSaveSingle({
        id: chat.id,
        title: title.trim() || chat.title,
        folderId: selectedFolderId,
        reportAllowed,
      });
      onClose();
    }
  };

  return createPortal(
    <div
      className="chat-library-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      onClick={onClose}
    >
      <div className="chat-library-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="chat-sheet-handle-row" onClick={onClose}>
          <span className="chat-sheet-handle" aria-hidden="true" />
        </div>

        <div className="chat-sheet-header compact">
          <div className="chat-sheet-title-group">
            <h2>{heading}</h2>
          </div>
          <button
            type="button"
            className="chat-sheet-close-btn"
            onClick={onClose}
            aria-label={isBm ? "Tutup" : isZh ? "关闭" : "Close"}
          >
            <LibUiIcon name="close" size={18} />
          </button>
        </div>

        <div className="chat-lib-sheet-body">
          {!isBulk && (
            <div className="chat-lib-field">
              <label htmlFor="chat-organize-title-input">
                {isBm ? "Tajuk perbualan" : isZh ? "对话标题" : "Conversation title"}
              </label>
              <input
                id="chat-organize-title-input"
                className="input"
                type="text"
                maxLength={64}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          )}

          <div className="chat-lib-field">
            <label>
              {isBm ? "Pindahkan ke folder" : isZh ? "移动到文件夹" : "Move to folder"}
            </label>
            <div className="chat-lib-folder-picker-list" role="radiogroup">
              <button
                type="button"
                role="radio"
                aria-checked={selectedFolderId == null}
                className={`chat-lib-folder-pick-row ${selectedFolderId == null ? "active" : ""}`}
                onClick={() => setSelectedFolderId(undefined)}
              >
                <span
                  className="chat-lib-folder-pick-icon"
                  style={{ "--folder-accent": getFolderAccentHex("peach", isDark) } as React.CSSProperties}
                >
                  <FolderGlyph icon="inbox" size={17} />
                </span>
                <span className="chat-lib-folder-pick-name">
                  {isBm ? "Belum Disusun" : isZh ? "未分类" : "Unsorted"}
                </span>
                {selectedFolderId == null && (
                  <span className="chat-lib-folder-pick-check">
                    <LibUiIcon name="check" size={16} />
                  </span>
                )}
              </button>

              {folders.map((folder) => {
                const { color, icon } = resolveFolderDefaults(folder);
                const hex = getFolderAccentHex(color, isDark);
                const active = selectedFolderId === folder.id;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`chat-lib-folder-pick-row ${active ? "active" : ""}`}
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    <span
                      className="chat-lib-folder-pick-icon"
                      style={{ "--folder-accent": hex } as React.CSSProperties}
                    >
                      <FolderGlyph icon={icon} size={17} />
                    </span>
                    <span className="chat-lib-folder-pick-name">
                      {getLocalizedDefaultFolderName(folder, language)}
                    </span>
                    {active && (
                      <span className="chat-lib-folder-pick-check">
                        <LibUiIcon name="check" size={16} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {!isBulk && (
            <div className="chat-lib-consent-box">
              <div className="chat-lib-consent-copy">
                <strong>
                  {isBm
                    ? "Gunakan dalam laporan bulanan"
                    : isZh
                      ? "用于月度反思总结"
                      : "Include in monthly report"}
                </strong>
                <small>
                  {isBm
                    ? "Benarkan tema daripada perbualan ini diringkaskan. Tetapan ini sentiasa di bawah kawalan anda."
                    : isZh
                      ? "允许将此对话的主题纳入您的月度总结（始终仅由您手动控制）。"
                      : "Allow themes from this chat to be summarized. Never changed automatically."}
                </small>
              </div>
              <ThemedSwitch
                checked={reportAllowed}
                onChange={setReportAllowed}
                ariaLabel={
                  isBm
                    ? "Gunakan dalam laporan bulanan"
                    : isZh
                      ? "用于月度反思总结"
                      : "Include in monthly report"
                }
              />
            </div>
          )}

          {!isBulk && chat && (onToggleArchiveSingle || onRequestDeleteSingle) && (
            <div className="chat-lib-quick-danger-row">
              {onToggleArchiveSingle && (
                <button
                  type="button"
                  className="chat-lib-outline-pill"
                  onClick={() => {
                    onToggleArchiveSingle(chat);
                    onClose();
                  }}
                >
                  <LibUiIcon name={chat.archived ? "restore" : "archive"} size={15} />
                  <span>
                    {chat.archived
                      ? isBm
                        ? "Pulihkan"
                        : isZh
                          ? "取消归档"
                          : "Restore"
                      : isBm
                        ? "Arkibkan"
                        : isZh
                          ? "归档对话"
                          : "Archive"}
                  </span>
                </button>
              )}

              {onRequestDeleteSingle && (
                <button
                  type="button"
                  className="chat-lib-outline-pill danger"
                  onClick={() => {
                    onClose();
                    onRequestDeleteSingle(chat);
                  }}
                >
                  <LibUiIcon name="trash" size={15} />
                  <span>{isBm ? "Padam" : isZh ? "删除" : "Delete"}</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="chat-lib-sheet-sticky-footer">
          <button type="button" className="btn btn-primary full" onClick={handleDone}>
            {isBm ? "Selesai" : isZh ? "完成" : "Done"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
