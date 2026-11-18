import React from "react";
import type { AppLanguage } from "../../i18n/translations";
import type { FolderSuggestionResult } from "../../utils/chatLibraryHelpers";
import { LibUiIcon } from "./FolderGlyph";

export interface SuggestionChipProps {
  suggestion: FolderSuggestionResult;
  language: AppLanguage;
  onAccept: (e: React.MouseEvent) => void;
  onDismiss: (e: React.MouseEvent) => void;
  compact?: boolean;
}

export function SuggestionChip({
  suggestion,
  language,
  onAccept,
  onDismiss,
  compact = false,
}: SuggestionChipProps) {
  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  const label =
    suggestion.kind === "create_folder"
      ? isBm
        ? `Cipta folder "${suggestion.folderName}"?`
        : isZh
          ? `创建「${suggestion.folderName}」文件夹？`
          : `Create folder "${suggestion.folderName}"?`
      : isBm
        ? `Cadangan: ${suggestion.folderName}`
        : isZh
          ? `建议归类：${suggestion.folderName}`
          : `Suggested: ${suggestion.folderName}`;

  const acceptLabel =
    suggestion.kind === "create_folder"
      ? isBm
        ? "Cipta"
        : isZh
          ? "创建"
          : "Create"
      : isBm
        ? "Terima"
        : isZh
          ? "采纳"
          : "Accept";

  return (
    <div
      className={`chat-suggestion-chip ${compact ? "compact" : ""}`}
      onClick={(e) => e.stopPropagation()}
      role="region"
      aria-label={label}
    >
      <span className="chat-suggestion-chip-icon" aria-hidden="true">
        <LibUiIcon name="sparkles" size={14} />
      </span>
      <span className="chat-suggestion-chip-text">{label}</span>
      <button
        type="button"
        className="chat-suggestion-accept"
        onClick={onAccept}
      >
        {acceptLabel}
      </button>
      <button
        type="button"
        className="chat-suggestion-dismiss-btn"
        onClick={onDismiss}
        aria-label={isBm ? "Abaikan cadangan" : isZh ? "忽略建议" : "Dismiss suggestion"}
      >
        <LibUiIcon name="close" size={14} />
      </button>
    </div>
  );
}
