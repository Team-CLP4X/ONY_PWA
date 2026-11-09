import React from "react";
import { TOOLKIT_GUIDES, type ToolkitGuide } from "../data/toolkitContent";
import { useTheme } from "../theme/ThemeContext";

export interface SuggestedToolkitCardProps {
  guideId?: string;
  onOpenGuide: (guideId: string) => void;
  onDismiss: () => void;
  lang?: string;
}

export function SuggestedToolkitCard({
  guideId = "breathing_box",
  onOpenGuide,
  onDismiss,
  lang = "English",
}: SuggestedToolkitCardProps) {
  const { isDark } = useTheme();

  const isBm = lang.includes("Melayu") || lang.includes("bm");
  const isZh = lang.includes("中文") || lang.includes("zh");

  const guide: ToolkitGuide =
    TOOLKIT_GUIDES.find((g) => g.id === guideId) || TOOLKIT_GUIDES[0];

  const title = isBm ? guide.titleBm : isZh ? guide.titleZh : guide.title;
  const summary = isBm ? guide.summaryBm : isZh ? guide.summaryZh : guide.summary;

  return (
    <div
      className="suggested-toolkit-card"
      style={{
        borderRadius: "18px",
        padding: "12px 14px",
        background: isDark
          ? "color-mix(in srgb, var(--theme-primary, #F28C78) 14%, var(--theme-surface, #1e1919))"
          : "var(--theme-surface-elevated, #FFF0EC)",
        border: "1.5px solid color-mix(in srgb, var(--theme-primary, #F28C78) 35%, transparent)",
        boxShadow: "0 4px 14px color-mix(in srgb, var(--theme-primary, #F28C78) 16%, transparent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        margin: "8px 0 12px",
        position: "relative",
      }}
      role="region"
      aria-label="Suggested self-help tool"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "12px",
            background: "var(--theme-primary, #F28C78)",
            color: "#ffffff",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "10.5px", fontWeight: 800, textTransform: "uppercase", color: "var(--theme-primary, #F28C78)" }}>
              ✨ {isBm ? "Dicadangkan untuk Anda" : isZh ? "为您推荐" : "Suggested for you"}
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: "100px",
                background: "var(--theme-surface, #ffffff)",
                color: "var(--theme-text-secondary, #6b645f)",
              }}
            >
              ⏱️ {guide.duration}
            </span>
          </div>

          <strong style={{ fontSize: "13px", fontWeight: 800, color: "var(--theme-text-primary, #2d2424)", display: "block" }}>
            {title}
          </strong>

          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--theme-text-secondary, #6b645f)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {summary}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => onOpenGuide(guide.id)}
          style={{
            padding: "8px 14px",
            borderRadius: "100px",
            border: "none",
            background: "var(--theme-primary, #F28C78)",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 2px 8px color-mix(in srgb, var(--theme-primary, #F28C78) 35%, transparent)",
            minHeight: "36px",
          }}
        >
          {isBm ? "Cuba Alat" : isZh ? "去试试" : "Try Tool"}
        </button>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss recommendation"
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            border: "none",
            background: "transparent",
            color: "var(--theme-text-secondary, #6b645f)",
            fontSize: "16px",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default SuggestedToolkitCard;
