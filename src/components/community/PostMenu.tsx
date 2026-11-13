import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FirestoreCommunityPost } from "../../firebase/firestore";
import { useLanguage } from "../../i18n/LanguageContext";
import type { AppLanguage } from "../../i18n/translations";
import { COMMUNITY_REPORT_REASONS } from "../../utils/communityPostHelpers";

export interface PostMenuProps {
  post: FirestoreCommunityPost;
  shouldOfferTranslate: boolean;
  showTranslation: boolean;
  hasTranslatedCache: boolean;
  isTranslating: boolean;
  onToggleTranslation: () => void;
  onCopyPost: () => void;
  onHidePost: () => void;
  onOpenReportSheet: () => void;
}

export function PostMenu({
  shouldOfferTranslate,
  showTranslation,
  hasTranslatedCache,
  isTranslating,
  onToggleTranslation,
  onCopyPost,
  onHidePost,
  onOpenReportSheet,
}: PostMenuProps) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: "bottom" | "top" }>({
    top: 80,
    left: 140,
    placement: "bottom",
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const updateMenuPosition = () => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 212;
    const estimatedHeight = (shouldOfferTranslate ? 4 : 3) * 46 + 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceBelow = vh - rect.bottom - 12;
    const placement: "bottom" | "top" =
      spaceBelow < estimatedHeight && rect.top > estimatedHeight + 12
        ? "top"
        : "bottom";

    const top =
      placement === "bottom"
        ? Math.min(vh - estimatedHeight - 8, rect.bottom + 6)
        : Math.max(8, rect.top - estimatedHeight - 6);

    const left = Math.max(
      10,
      Math.min(rect.right - menuWidth, vw - menuWidth - 10),
    );

    setCoords({ top, left, placement });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
  }, [open, shouldOfferTranslate]);

  useEffect(() => {
    if (!open) return;

    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const handleScrollOrResize = () => {
      setOpen(false);
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  const copyLabel =
    language === "Bahasa Melayu"
      ? "Salin teks"
      : language === "中文"
        ? "复制文字"
        : "Copy text";

  const hideLabel =
    language === "Bahasa Melayu"
      ? "Sembunyikan siaran"
      : language === "中文"
        ? "隐藏此帖"
        : "Hide post";

  return (
    <div className="post-overflow-wrap">
      <button
        ref={triggerRef}
        type="button"
        className={`post-overflow-btn ${open ? "is-active" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          language === "Bahasa Melayu"
            ? "Lagi pilihan siaran"
            : language === "中文"
              ? "更多帖子选项"
              : "More post options"
        }
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="post-overflow-svg">
          <circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none" />
        </svg>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className={`ony-portal-menu post-card-portal-menu placement-${coords.placement}`}
            role="menu"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {shouldOfferTranslate && (
              <button
                type="button"
                role="menuitem"
                className="ony-portal-menu-item"
                disabled={isTranslating}
                onClick={() => {
                  setOpen(false);
                  onToggleTranslation();
                }}
              >
                <span className="ony-portal-menu-icon" aria-hidden="true">
                  {showTranslation ? "↩" : "🌐"}
                </span>
                <span className="ony-portal-menu-label">
                  {isTranslating
                    ? t.community_translating
                    : showTranslation
                      ? t.community_show_original
                      : hasTranslatedCache
                        ? t.community_show_translation
                        : t.community_translate_btn}
                </span>
              </button>
            )}

            <button
              type="button"
              role="menuitem"
              className="ony-portal-menu-item"
              onClick={() => {
                setOpen(false);
                onCopyPost();
              }}
            >
              <span className="ony-portal-menu-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="post-menu-svg">
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </span>
              <span className="ony-portal-menu-label">{copyLabel}</span>
            </button>

            <button
              type="button"
              role="menuitem"
              className="ony-portal-menu-item"
              onClick={() => {
                setOpen(false);
                onHidePost();
              }}
            >
              <span className="ony-portal-menu-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="post-menu-svg">
                  <path d="M17.9 17.9A10.9 10.9 0 0 1 12 20c-6 0-10-8-10-8a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A10.6 10.6 0 0 1 12 4c6 0 10 8 10 8a18.5 18.5 0 0 1-2.2 3.2M2 2l20 20" />
                </svg>
              </span>
              <span className="ony-portal-menu-label">{hideLabel}</span>
            </button>

            <div className="ony-portal-menu-divider" role="separator" />

            <button
              type="button"
              role="menuitem"
              className="ony-portal-menu-item danger"
              onClick={() => {
                setOpen(false);
                onOpenReportSheet();
              }}
            >
              <span className="ony-portal-menu-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="post-menu-svg">
                  <path d="M5 3v18M5 4h11l-2 4 2 4H5" />
                </svg>
              </span>
              <span className="ony-portal-menu-label">{t.common_report}</span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

export interface ReportReasonSheetProps {
  post: FirestoreCommunityPost | null;
  language: AppLanguage;
  onClose: () => void;
  onConfirmReport: (post: FirestoreCommunityPost, reason: string) => void;
}

export function ReportReasonSheet({
  post,
  language,
  onClose,
  onConfirmReport,
}: ReportReasonSheetProps) {
  const [selectedReasonId, setSelectedReasonId] = useState<string>(
    COMMUNITY_REPORT_REASONS[0].id,
  );
  const [extraNote, setExtraNote] = useState("");

  useEffect(() => {
    setSelectedReasonId(COMMUNITY_REPORT_REASONS[0].id);
    setExtraNote("");
  }, [post?.id]);

  useEffect(() => {
    if (!post) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [post, onClose]);

  if (!post || typeof document === "undefined") return null;

  const heading =
    language === "Bahasa Melayu"
      ? "Laporkan siaran"
      : language === "中文"
        ? "举报这篇帖子"
        : "Report post";

  const subheading =
    language === "Bahasa Melayu"
      ? "Bantu kami memastikan ONY kekal selamat dan menyokong."
      : language === "中文"
        ? "感谢你帮助大家维护温柔安全的社区空间。"
        : "Help us keep ONY safe, calm, and supportive.";

  const confirmLabel =
    language === "Bahasa Melayu"
      ? "Hantar laporan"
      : language === "中文"
        ? "确认提交举报"
        : "Submit report";

  const cancelLabel =
    language === "Bahasa Melayu"
      ? "Batal"
      : language === "中文"
        ? "取消"
        : "Cancel";

  const getReasonText = (id: string) => {
    const opt =
      COMMUNITY_REPORT_REASONS.find((r) => r.id === id) ||
      COMMUNITY_REPORT_REASONS[0];
    if (language === "Bahasa Melayu") return opt.labelBm;
    if (language === "中文") return opt.labelZh;
    return opt.labelEn;
  };

  const handleConfirm = () => {
    const reasonText = getReasonText(selectedReasonId);
    const fullReason = extraNote.trim()
      ? `${reasonText}: ${extraNote.trim()}`
      : reasonText;
    // TODO: Persist post report payload ({ postId: post.id, reason: fullReason }) to dedicated moderation endpoint when added.
    onConfirmReport(post, fullReason);
    onClose();
  };

  return createPortal(
    <div
      className="report-sheet-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="report-reason-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={heading}
      >
        <div className="comment-sheet-handle" aria-hidden="true" />
        <div className="report-sheet-head">
          <div>
            <h3>{heading}</h3>
            <p>{subheading}</p>
          </div>
          <button
            type="button"
            className="comment-sheet-close-btn"
            onClick={onClose}
            aria-label={cancelLabel}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="report-reason-list" role="radiogroup" aria-label={heading}>
          {COMMUNITY_REPORT_REASONS.map((opt) => {
            const label =
              language === "Bahasa Melayu"
                ? opt.labelBm
                : language === "中文"
                  ? opt.labelZh
                  : opt.labelEn;
            const active = selectedReasonId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`report-reason-option ${active ? "active" : ""}`}
                onClick={() => setSelectedReasonId(opt.id)}
              >
                <span className="report-radio-dot" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <textarea
          className="report-optional-note"
          rows={2}
          maxLength={300}
          value={extraNote}
          onChange={(e) => setExtraNote(e.target.value)}
          placeholder={
            language === "Bahasa Melayu"
              ? "Butiran tambahan (pilihan)…"
              : language === "中文"
                ? "补充说明（可选）…"
                : "Optional note for moderators…"
          }
        />

        <div className="report-sheet-actions">
          <button type="button" className="caught-up-btn secondary" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="caught-up-btn danger"
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default PostMenu;
