import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AppLanguage } from "../../i18n/translations";
import {
  SUPPORTIVE_REACTIONS,
  getReactionLabel,
  type PostReactionSummary,
  type SupportiveReactionType,
} from "../../utils/communityPostHelpers";

export interface ReactionPillProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  summary: PostReactionSummary;
  language: AppLanguage;
  onSelect: (reaction: SupportiveReactionType) => void;
  onClose: () => void;
}

export function ReactionPill({
  open,
  anchorEl,
  summary,
  language,
  onSelect,
  onClose,
}: ReactionPillProps) {
  const pillRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 200,
    left: 20,
  });

  const updatePosition = () => {
    if (!anchorEl || typeof window === "undefined") return;
    const rect = anchorEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const pillWidth = pillRef.current?.offsetWidth || Math.min(284, vw - 24);
    const pillHeight = pillRef.current?.offsetHeight || 50;

    // Anchor cleanly right above the reaction button so it never covers upper post body text
    const top = Math.max(12, rect.top - pillHeight - 8);
    const left = Math.max(12, Math.min(rect.left, vw - pillWidth - 12));
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, anchorEl]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!pillRef.current?.contains(target) && !anchorEl?.contains(target)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleScroll = () => onClose();

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open, anchorEl, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={pillRef}
      className="reaction-floating-pill"
      role="menu"
      aria-label={
        language === "Bahasa Melayu"
          ? "Pilih reaksi sokongan"
          : language === "中文"
            ? "选择暖心回应"
            : "Choose supportive reaction"
      }
      style={{
        top: `${pos.top}px`,
        left: `${pos.left}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {SUPPORTIVE_REACTIONS.map((item) => {
        const active = summary.myReaction === item.type;
        const label = getReactionLabel(item.type, language);
        const count = summary.countsByType[item.type] || 0;
        return (
          <button
            key={item.type}
            type="button"
            role="menuitemradio"
            aria-checked={active}
            aria-label={`${label}${count > 0 ? ` (${count})` : ""}`}
            title={label}
            className={`reaction-floating-pill-item ${active ? "active" : ""}`}
            onClick={() => onSelect(item.type)}
          >
            <span className="reaction-floating-emoji" aria-hidden="true">
              {item.emoji}
            </span>
            <span className="reaction-floating-label">{label}</span>
          </button>
        );
      })}
    </div>,
    document.body,
  );
}

export default ReactionPill;
