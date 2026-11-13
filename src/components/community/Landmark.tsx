import type { AppLanguage } from "../../i18n/translations";
import {
  getLandmarkSubtitle,
  getLandmarkTitle,
  type WorldCategoryItem,
  type WorldLandmarkKind,
} from "../../utils/communityPostHelpers";

export interface LandmarkArtProps {
  kind: WorldLandmarkKind;
  categoryName?: string;
  size?: "scene" | "hero" | "mini";
  animated?: boolean;
}

export function LandmarkArt({
  kind,
  categoryName = "",
  size = "scene",
  animated = true,
}: LandmarkArtProps) {
  const strokeSoft = "color-mix(in srgb, var(--theme-text-primary) 26%, transparent)";
  const surface = "var(--theme-surface)";
  const surfaceElevated = "var(--theme-surface-elevated)";
  const surfaceSoft = "var(--theme-surface-soft)";
  const primary = "var(--theme-primary)";
  const primaryDark = "var(--theme-primary-dark, var(--theme-primary))";
  const accent = "var(--theme-accent)";
  const badgeChar = (categoryName.trim()[0] || "✦").toUpperCase();

  return (
    <svg
      viewBox="0 0 96 84"
      className={`world-landmark-svg kind-${kind} size-${size} ${animated ? "is-animated" : ""}`}
      aria-hidden="true"
      fill="none"
    >
      {/* Ground patch ellipse */}
      <ellipse
        cx="48"
        cy="72"
        rx="32"
        ry="7"
        fill="color-mix(in srgb, var(--theme-primary) 14%, var(--theme-surface-soft))"
      />

      {/* 1. CAMPFIRE (Warm Chats / General) */}
      {kind === "campfire" && (
        <g>
          {/* Warm fire halo */}
          <circle
            cx="48"
            cy="44"
            r="26"
            className="anim-lantern-glow"
            fill="color-mix(in srgb, var(--theme-accent) 26%, transparent)"
          />
          {/* Small mossy stones */}
          <ellipse cx="26" cy="65" rx="6" ry="3.8" fill={surfaceSoft} stroke={strokeSoft} strokeWidth="1.5" />
          <ellipse cx="69" cy="65" rx="5.5" ry="3.5" fill={surfaceSoft} stroke={strokeSoft} strokeWidth="1.5" />
          {/* Crossed cozy logs */}
          <rect
            x="27"
            y="59"
            width="42"
            height="8.5"
            rx="4.2"
            transform="rotate(-10 48 63)"
            fill="color-mix(in srgb, var(--theme-primary-dark, var(--theme-primary)) 34%, var(--theme-surface-elevated))"
            stroke={strokeSoft}
            strokeWidth="1.6"
          />
          <rect
            x="27"
            y="60"
            width="42"
            height="8.5"
            rx="4.2"
            transform="rotate(11 48 64)"
            fill="color-mix(in srgb, var(--theme-primary) 26%, var(--theme-surface))"
            stroke={strokeSoft}
            strokeWidth="1.6"
          />
          {/* Kawaii layered flame */}
          <path
            className="anim-fire-flicker"
            d="M48 20c9 9 15 17 15 27a15 15 0 0 1-30 0c0-8 4.5-15 10-20 0 4 2.5 6 4.5 6 0-5 0.5-9.5 0.5-13Z"
            fill="color-mix(in srgb, var(--theme-accent) 68%, var(--theme-primary))"
            stroke={strokeSoft}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            className="anim-fire-flicker"
            d="M48 34c4.5 5 8 10 8 15a8 8 0 0 1-16 0c0-5 3.5-10 8-15Z"
            fill="color-mix(in srgb, var(--theme-surface) 80%, var(--theme-accent))"
          />
          {/* Tiny floating ember sparkles */}
          <circle cx="34" cy="24" r="2" fill={accent} className="anim-twinkle" />
          <circle cx="64" cy="28" r="1.7" fill={primary} className="anim-twinkle" />
        </g>
      )}

      {/* 2. NOTICE BOARD (All / Latest) */}
      {kind === "notice-board" && (
        <g>
          {/* Wooden posts */}
          <rect x="29" y="53" width="5" height="19" rx="2.5" fill={surfaceSoft} stroke={strokeSoft} strokeWidth="1.5" />
          <rect x="62" y="53" width="5" height="19" rx="2.5" fill={surfaceSoft} stroke={strokeSoft} strokeWidth="1.5" />
          {/* Little roof */}
          <path
            d="M15 24c0-3 2-5 5-5h56c3 0 5 2 5 5l-3 5H18l-3-5Z"
            fill="color-mix(in srgb, var(--theme-primary) 34%, var(--theme-surface-soft))"
            stroke={strokeSoft}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Cork frame */}
          <rect x="19" y="28" width="58" height="31" rx="8" fill={surfaceElevated} stroke={strokeSoft} strokeWidth="1.7" />
          {/* Pastel notes pinned inside */}
          <rect x="25" y="34" width="14" height="17" rx="3" fill={surface} stroke={strokeSoft} strokeWidth="1.2" />
          <rect x="42" y="33" width="15" height="14" rx="3" fill="color-mix(in srgb, var(--theme-accent) 28%, var(--theme-surface))" stroke={strokeSoft} strokeWidth="1.2" />
          <rect x="60" y="36" width="12" height="16" rx="3" fill="color-mix(in srgb, var(--theme-primary) 22%, var(--theme-surface))" stroke={strokeSoft} strokeWidth="1.2" />
          <circle cx="32" cy="36" r="2" fill={primary} />
          <circle cx="49" cy="35" r="2" fill={accent} />
          <circle cx="66" cy="38" r="2" fill={primaryDark} />
        </g>
      )}

      {/* 3. LIBRARY (Study) */}
      {kind === "library" && (
        <g>
          {/* Soft nook backdrop glow */}
          <circle cx="48" cy="44" r="24" fill="color-mix(in srgb, var(--theme-primary) 13%, transparent)" />
          {/* Bottom book */}
          <rect x="19" y="53" width="58" height="14" rx="5" fill={surfaceElevated} stroke={strokeSoft} strokeWidth="1.6" />
          <path d="M26 60h38" stroke={primary} strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
          {/* Middle book */}
          <rect x="23" y="39" width="50" height="14" rx="5" fill="color-mix(in srgb, var(--theme-primary) 28%, var(--theme-surface))" stroke={strokeSoft} strokeWidth="1.6" />
          <path d="M30 46h32" stroke={surface} strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
          {/* Top book + cute bookmark ribbon */}
          <rect x="27" y="26" width="42" height="13" rx="4.5" fill="color-mix(in srgb, var(--theme-accent) 40%, var(--theme-surface))" stroke={strokeSoft} strokeWidth="1.6" />
          <path d="M55 26v18l3-2.5 3 2.5V26" fill={primary} stroke={strokeSoft} strokeWidth="1.2" />
          {/* Tiny reading sparkle */}
          <circle cx="71" cy="23" r="2.2" fill={accent} className="anim-twinkle" />
        </g>
      )}

      {/* 4. GARDEN BENCH (Shared Stories / Relationships) */}
      {kind === "garden-bench" && (
        <g>
          {/* Warm mini lamp behind bench */}
          <path d="M71 27v40" stroke={strokeSoft} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="71" cy="25" r="9" fill="color-mix(in srgb, var(--theme-accent) 34%, transparent)" className="anim-lantern-glow" />
          <circle cx="71" cy="25" r="4.2" fill={accent} stroke={strokeSoft} strokeWidth="1.3" />
          {/* Bench legs */}
          <path d="M25 56v14M63 56v14" stroke={strokeSoft} strokeWidth="2.4" strokeLinecap="round" />
          {/* Bench back slats */}
          <rect x="20" y="35" width="48" height="7" rx="3.5" fill="color-mix(in srgb, var(--theme-primary) 30%, var(--theme-surface))" stroke={strokeSoft} strokeWidth="1.5" />
          <rect x="20" y="44" width="48" height="6.5" rx="3.2" fill="color-mix(in srgb, var(--theme-accent) 30%, var(--theme-surface))" stroke={strokeSoft} strokeWidth="1.5" />
          {/* Seat */}
          <rect x="18" y="52" width="52" height="6.5" rx="3.2" fill={surfaceElevated} stroke={strokeSoft} strokeWidth="1.5" />
          {/* Tiny heart blossom beside bench */}
          <circle cx="20" cy="67" r="3.4" fill="color-mix(in srgb, var(--theme-accent) 70%, var(--theme-surface))" className="anim-flower-sway" />
          <circle cx="28" cy="69" r="2.8" fill="color-mix(in srgb, var(--theme-primary) 65%, var(--theme-surface))" className="anim-flower-sway" />
        </g>
      )}

      {/* 5. DESK WITH LAMP (Work) */}
      {kind === "desk-lamp" && (
        <g>
          {/* Lamp light pool */}
          <ellipse cx="48" cy="48" rx="24" ry="18" fill="color-mix(in srgb, var(--theme-accent) 24%, transparent)" className="anim-lantern-glow" />
          {/* Desk surface */}
          <rect x="17" y="53" width="62" height="8" rx="4" fill="color-mix(in srgb, var(--theme-primary) 26%, var(--theme-surface))" stroke={strokeSoft} strokeWidth="1.5" />
          <path d="M24 61v10M72 61v10" stroke={strokeSoft} strokeWidth="2.4" strokeLinecap="round" />
          {/* Cozy lamp arm + rounded shade */}
          <path d="M31 53V36c0-4 3-7 7-7h5" stroke={strokeSoft} strokeWidth="2.2" strokeLinecap="round" />
          <path
            d="M39 29c2-7 8-10 13-10s10 4 11 10H39Z"
            fill="color-mix(in srgb, var(--theme-accent) 55%, var(--theme-surface))"
            stroke={strokeSoft}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Open notebook + tea cup on desk */}
          <rect x="46" y="46" width="18" height="7" rx="2.5" fill={surface} stroke={strokeSoft} strokeWidth="1.3" />
          <rect x="67" y="45" width="7" height="8" rx="2.5" fill={surfaceSoft} stroke={strokeSoft} strokeWidth="1.3" />
        </g>
      )}

      {/* 6. MOON TOWER (Late Nights / Self-care) */}
      {kind === "moon-tower" && (
        <g>
          {/* Ambient twilight glow */}
          <circle cx="48" cy="34" r="26" fill="color-mix(in srgb, var(--theme-primary) 18%, transparent)" className="anim-lantern-glow" />
          {/* Rounded cozy tower body */}
          <path
            d="M35 69V36h26v33H35Z"
            fill={surfaceElevated}
            stroke={strokeSoft}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Observatory dome */}
          <path
            d="M32 36c0-10 7-17 16-17s16 7 16 17H32Z"
            fill="color-mix(in srgb, var(--theme-primary) 38%, var(--theme-surface))"
            stroke={strokeSoft}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Glowing arched window */}
          <rect
            x="43"
            y="45"
            width="10"
            height="14"
            rx="5"
            fill="color-mix(in srgb, var(--theme-accent) 68%, var(--theme-surface))"
            stroke={strokeSoft}
            strokeWidth="1.4"
          />
          {/* Crescent moon above */}
          <path
            d="M68 18a6.5 6.5 0 1 0 7.5 8.5A5.4 5.4 0 0 1 68 18Z"
            fill={accent}
          />
          <circle cx="24" cy="22" r="1.8" fill={accent} className="anim-twinkle" />
          <circle cx="29" cy="14" r="1.4" fill={primary} className="anim-twinkle" />
        </g>
      )}

      {/* 7. FLOWER POND (Small Wins / Motivation) */}
      {kind === "flower-pond" && (
        <g>
          {/* Pond water */}
          <ellipse
            cx="48"
            cy="61"
            rx="29"
            ry="11"
            fill="color-mix(in srgb, var(--theme-primary) 26%, var(--theme-surface-soft))"
            stroke={strokeSoft}
            strokeWidth="1.5"
          />
          <ellipse
            cx="48"
            cy="61"
            rx="19"
            ry="6.5"
            className="anim-ripple"
            stroke={surface}
            strokeWidth="1.4"
            opacity="0.7"
          />
          {/* Lily pads */}
          <ellipse cx="35" cy="60" rx="8" ry="4" fill="color-mix(in srgb, var(--theme-accent) 34%, var(--theme-surface))" stroke={strokeSoft} strokeWidth="1.2" />
          <ellipse cx="62" cy="63" rx="7" ry="3.5" fill="color-mix(in srgb, var(--theme-accent) 34%, var(--theme-surface))" stroke={strokeSoft} strokeWidth="1.2" />
          {/* Cute blooming lotus / sprout */}
          <g className="anim-flower-sway">
            <path d="M48 56V40" stroke={primaryDark} strokeWidth="2.2" strokeLinecap="round" />
            <path d="M48 42c-6-6-10-12-5-16 3 2 5 6 5 16Z" fill="color-mix(in srgb, var(--theme-accent) 62%, var(--theme-surface))" stroke={strokeSoft} strokeWidth="1.2" />
            <path d="M48 42c6-6 10-12 5-16-3 2-5 6-5 16Z" fill="color-mix(in srgb, var(--theme-primary) 54%, var(--theme-surface))" stroke={strokeSoft} strokeWidth="1.2" />
            <circle cx="48" cy="34" r="5" fill={surface} stroke={strokeSoft} strokeWidth="1.3" />
          </g>
        </g>
      )}

      {/* 8. LANTERN (Custom / Fallback Category) */}
      {kind === "lantern" && (
        <g>
          <circle cx="48" cy="40" r="24" fill="color-mix(in srgb, var(--theme-accent) 26%, transparent)" className="anim-lantern-glow" />
          {/* Wooden stand hook */}
          <path d="M27 70V24c0-4 3-7 7-7h14v7" stroke={strokeSoft} strokeWidth="2.4" strokeLinecap="round" />
          {/* Hanging lantern */}
          <rect x="38" y="25" width="20" height="26" rx="10" fill="color-mix(in srgb, var(--theme-accent) 52%, var(--theme-surface))" stroke={strokeSoft} strokeWidth="1.6" />
          <rect x="42" y="22" width="12" height="4" rx="2" fill={surfaceSoft} stroke={strokeSoft} strokeWidth="1.2" />
          <rect x="42" y="50" width="12" height="4" rx="2" fill={surfaceSoft} stroke={strokeSoft} strokeWidth="1.2" />
          <path d="M48 54v8" stroke={primary} strokeWidth="2" strokeLinecap="round" />
          <text
            x="48"
            y="42"
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
            fill="var(--theme-text-primary)"
          >
            {badgeChar}
          </text>
        </g>
      )}
    </svg>
  );
}

export interface LandmarkProps {
  item: WorldCategoryItem;
  language: AppLanguage;
  isHighlighted?: boolean;
  isDimmed?: boolean;
  isZoomingOut?: boolean;
  reducedMotion?: boolean;
  onSelect: (category: string, el: HTMLButtonElement | null) => void;
}

export function Landmark({
  item,
  language,
  isHighlighted = false,
  isDimmed = false,
  isZoomingOut = false,
  reducedMotion = false,
  onSelect,
}: LandmarkProps) {
  const title = getLandmarkTitle(item.category, language);
  const subtitle = getLandmarkSubtitle(item.category, language);

  const postsWord =
    language === "Bahasa Melayu"
      ? "siaran"
      : language === "中文"
        ? "篇"
        : item.postCount === 1
          ? "post"
          : "posts";

  return (
    <button
      type="button"
      className={`world-landmark-btn kind-${item.landmarkKind} ${isHighlighted ? "is-highlighted" : ""} ${isDimmed ? "is-dimmed" : ""} ${isZoomingOut ? "is-zoom-source" : ""}`}
      onClick={(e) => onSelect(item.category, e.currentTarget)}
      aria-label={`${title} — ${subtitle} (${item.postCount} ${postsWord}${item.unseenCount > 0 ? `, ${item.unseenCount} new` : ""})`}
    >
      {isHighlighted && <span className="world-landmark-halo" aria-hidden="true" />}

      <div className="world-landmark-art-wrap">
        <LandmarkArt
          kind={item.landmarkKind}
          categoryName={item.category}
          size="scene"
          animated={!reducedMotion}
        />
        <span className="world-landmark-count-badge" aria-hidden="true">
          {item.unseenCount > 0 && <span className="world-unseen-dot" />}
          <span>{item.postCount}</span>
        </span>
      </div>

      <span className="world-landmark-label-chip">{title}</span>
    </button>
  );
}

export default Landmark;
