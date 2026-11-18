import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AppLanguage } from "../../i18n/translations";
import { useTheme } from "../../theme/ThemeContext";
import {
  type ChatLibraryFolder,
  FOLDER_COLOR_OPTIONS,
  FOLDER_ICON_OPTIONS,
  type FolderColorId,
  type FolderIconId,
  resolveFolderDefaults,
} from "../../utils/chatLibraryHelpers";
import { FolderGlyph, LibUiIcon } from "./FolderGlyph";

export interface FolderSheetProps {
  open: boolean;
  mode: "create" | "edit";
  initialFolder?: ChatLibraryFolder | null;
  language: AppLanguage;
  onClose: () => void;
  onSubmit: (payload: { name: string; color: FolderColorId; icon: FolderIconId }) => void;
}

export function FolderSheet({
  open,
  mode,
  initialFolder,
  language,
  onClose,
  onSubmit,
}: FolderSheetProps) {
  const { isDark } = useTheme();
  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  const [name, setName] = useState("");
  const [color, setColor] = useState<FolderColorId>("ocean");
  const [icon, setIcon] = useState<FolderIconId>("folder");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initialFolder) {
      const defaults = resolveFolderDefaults(initialFolder);
      setName(initialFolder.name);
      setColor(defaults.color as FolderColorId);
      setIcon(defaults.icon as FolderIconId);
    } else {
      setName("");
      setColor("peach");
      setIcon("folder");
    }
  }, [open, mode, initialFolder]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const title =
    mode === "edit"
      ? isBm
        ? "Sesuaikan Folder"
        : isZh
          ? "编辑文件夹"
          : "Customize Folder"
      : isBm
        ? "Folder Baharu"
        : isZh
          ? "新建文件夹"
          : "New Folder";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit({ name: trimmed, color, icon });
    onClose();
  };

  return createPortal(
    <div
      className="chat-library-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className="chat-library-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="chat-sheet-handle-row" onClick={onClose}>
          <span className="chat-sheet-handle" aria-hidden="true" />
        </div>

        <div className="chat-sheet-header compact">
          <div className="chat-sheet-title-group">
            <h2>{title}</h2>
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

        <form className="chat-lib-sheet-body" onSubmit={handleSave}>
          <div className="chat-lib-field">
            <label htmlFor="chat-folder-name-input">
              {isBm ? "Nama folder" : isZh ? "文件夹名称" : "Folder name"}
            </label>
            <input
              id="chat-folder-name-input"
              className="input"
              type="text"
              maxLength={36}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                isBm
                  ? "Contoh: Tidur & Rehat"
                  : isZh
                    ? "例如：睡眠与休息"
                    : "e.g., Sleep, Gratitude, Exams"
              }
            />
          </div>

          <div className="chat-lib-field">
            <label>{isBm ? "Warna folder" : isZh ? "文件夹颜色" : "Folder color"}</label>
            <div className="chat-lib-color-row">
              {FOLDER_COLOR_OPTIONS.map((opt) => {
                const hex = isDark ? opt.darkHex : opt.lightHex;
                const active = color === opt.id;
                const label = isBm ? opt.labelBm : isZh ? opt.labelZh : opt.labelEn;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`chat-lib-color-swatch ${active ? "active" : ""}`}
                    style={{ "--swatch-color": hex } as React.CSSProperties}
                    aria-label={label}
                    aria-pressed={active}
                    onClick={() => setColor(opt.id)}
                  >
                    <span className="chat-lib-color-dot" />
                    {active && <LibUiIcon name="check" size={14} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="chat-lib-field">
            <label>{isBm ? "Ikon" : isZh ? "图标" : "Icon"}</label>
            <div className="chat-lib-icon-grid">
              {FOLDER_ICON_OPTIONS.map((opt) => {
                const active = icon === opt.id;
                const selectedHex =
                  FOLDER_COLOR_OPTIONS.find((c) => c.id === color) || FOLDER_COLOR_OPTIONS[0];
                const hex = isDark ? selectedHex.darkHex : selectedHex.lightHex;
                const label = isBm ? opt.labelBm : isZh ? opt.labelZh : opt.labelEn;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`chat-lib-icon-tile ${active ? "active" : ""}`}
                    style={{ "--folder-accent": hex } as React.CSSProperties}
                    aria-label={label}
                    aria-pressed={active}
                    onClick={() => setIcon(opt.id)}
                  >
                    <FolderGlyph icon={opt.id} size={20} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="chat-lib-sheet-footer-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {isBm ? "Batal" : isZh ? "取消" : "Cancel"}
            </button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
              {mode === "edit"
                ? isBm
                  ? "Simpan"
                  : isZh
                    ? "保存更改"
                    : "Save Changes"
                : isBm
                  ? "Cipta Folder"
                  : isZh
                    ? "创建文件夹"
                    : "Create Folder"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export interface ConfirmDeleteSheetProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteSheet({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDeleteSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="chat-library-sheet-backdrop centered"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div className="chat-library-confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="chat-lib-sheet-footer-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              onConfirm();
              onCancel();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
