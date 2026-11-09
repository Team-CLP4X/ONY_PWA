import React, { useId, useMemo } from "react";
import { useTheme } from "../theme/ThemeContext";

export type CompanionAnimal = "Cat" | "Dog" | "Bunny" | "Bear" | "Fox" | "Panda";
export type CompanionExpression = "idle" | "listening" | "speaking" | "happy" | "comforting";
export type CompanionSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number;

export interface CompanionAvatarProps {
  companion?: string;
  animal?: CompanionAnimal | string;
  size?: CompanionSize;
  large?: boolean; // backwards compatibility with existing large prop
  expression?: CompanionExpression;
  mood?: CompanionExpression;
  showGlow?: boolean;
  interactive?: boolean;
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  title?: string;
  alt?: string;
}

const SIZE_MAP: Record<string, number> = {
  xs: 28,
  sm: 40,
  md: 52,
  lg: 84,
  xl: 140,
  "2xl": 180,
};

// Normalize animal name safely
export function normalizeAnimal(name?: string): CompanionAnimal {
  if (!name) return "Cat";
  const cleaned = name.trim().toLowerCase();
  if (cleaned.includes("dog") || cleaned.includes("anjing")) return "Dog";
  if (cleaned.includes("bunny") || cleaned.includes("rabbit") || cleaned.includes("arnab") || cleaned.includes("兔")) return "Bunny";
  if (cleaned.includes("bear") || cleaned.includes("beruang") || cleaned.includes("熊")) return "Bear";
  if (cleaned.includes("fox") || cleaned.includes("musang") || cleaned.includes("狐")) return "Fox";
  if (cleaned.includes("panda") || cleaned.includes("熊猫")) return "Panda";
  return "Cat";
}

export function CompanionAvatar({
  companion,
  animal,
  size,
  large = false,
  expression,
  mood,
  showGlow,
  interactive = false,
  animated = true,
  className = "",
  style,
  onClick,
  title,
  alt,
}: CompanionAvatarProps) {
  const { isDark } = useTheme();
  const idPrefix = useId().replace(/:/g, "_");

  // Resolve animal type
  const targetAnimal = normalizeAnimal(animal || companion);
  const activeMood: CompanionExpression = expression || mood || "idle";

  // Resolve pixel dimensions
  const pixelSize = useMemo(() => {
    if (typeof size === "number") return size;
    if (typeof size === "string" && SIZE_MAP[size]) return SIZE_MAP[size];
    if (large) return 140;
    return 40;
  }, [size, large]);

  const shouldGlow = showGlow !== undefined ? showGlow : pixelSize >= 84;
  const isMini = pixelSize <= 42;

  // Accessible label
  const accessibleLabel =
    alt ||
    title ||
    `ONY ${targetAnimal} companion mascot (${activeMood} state)`;

  return (
    <div
      role={onClick ? "button" : "img"}
      tabIndex={onClick ? 0 : undefined}
      aria-label={accessibleLabel}
      title={title || accessibleLabel}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`ony-chibi-mascot-wrapper animal-${targetAnimal.toLowerCase()} mood-${activeMood} ${
        interactive ? "interactive-tap" : ""
      } ${animated ? "animated-mascot" : "static-mascot"} ${className}`}
      style={{
        width: pixelSize,
        height: pixelSize,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        userSelect: "none",
        flexShrink: 0,
        ...style,
      }}
    >
      <svg
        viewBox="0 0 160 160"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{
          overflow: "visible",
          display: "block",
        }}
      >
        <defs>
          {/* Subtle Ambient Glow behind Chibi */}
          <radialGradient
            id={`${idPrefix}_glow`}
            cx="50%"
            cy="50%"
            r="50%"
          >
            <stop
              offset="0%"
              stopColor="var(--theme-primary, #F28C78)"
              stopOpacity={isDark ? "0.32" : "0.22"}
            />
            <stop
              offset="65%"
              stopColor="var(--theme-accent, #FAD2C8)"
              stopOpacity={isDark ? "0.15" : "0.10"}
            />
            <stop
              offset="100%"
              stopColor="var(--theme-surface, #FFF9F5)"
              stopOpacity="0"
            />
          </radialGradient>

          {/* Under-plushie soft contact shadow */}
          <radialGradient
            id={`${idPrefix}_contact_shadow`}
            cx="50%"
            cy="50%"
            r="50%"
          >
            <stop
              offset="0%"
              stopColor={isDark ? "#0A0A0E" : "#5A3E36"}
              stopOpacity={isDark ? "0.45" : "0.18"}
            />
            <stop
              offset="80%"
              stopColor={isDark ? "#0A0A0E" : "#5A3E36"}
              stopOpacity={isDark ? "0.12" : "0.04"}
            />
            <stop
              offset="100%"
              stopColor={isDark ? "#0A0A0E" : "#5A3E36"}
              stopOpacity="0"
            />
          </radialGradient>

          {/* Shading Gradients for Animal Bodies */}
          {/* CAT: Warm Peach Cream */}
          <linearGradient id={`${idPrefix}_cat_body`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#FFF2E6" : "#FFF7F0"} />
            <stop offset="60%" stopColor={isDark ? "#F8E0CF" : "#FEECE0"} />
            <stop offset="100%" stopColor={isDark ? "#EED0BA" : "#F7DCC8"} />
          </linearGradient>

          {/* DOG: Warm Caramel and Cream */}
          <linearGradient id={`${idPrefix}_dog_body`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#FCE4CA" : "#FFECCE"} />
            <stop offset="55%" stopColor={isDark ? "#F4CCA4" : "#F6D8B6"} />
            <stop offset="100%" stopColor={isDark ? "#E6B885" : "#E8C297"} />
          </linearGradient>
          <linearGradient id={`${idPrefix}_dog_ear`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#D89A65" : "#DE9E69"} />
            <stop offset="100%" stopColor={isDark ? "#BD7E47" : "#C78750"} />
          </linearGradient>

          {/* BUNNY: Marshmallow White-Pink */}
          <linearGradient id={`${idPrefix}_bunny_body`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#FFFFFF" : "#FFFFFF"} />
            <stop offset="65%" stopColor={isDark ? "#FFF0F4" : "#FFF5F7"} />
            <stop offset="100%" stopColor={isDark ? "#FCE0E8" : "#FEE6ED"} />
          </linearGradient>

          {/* BEAR: Warm Honey Brown */}
          <linearGradient id={`${idPrefix}_bear_body`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#E8BA8E" : "#E2AF7E"} />
            <stop offset="60%" stopColor={isDark ? "#D49E69" : "#CFA070"} />
            <stop offset="100%" stopColor={isDark ? "#BC834C" : "#B88452"} />
          </linearGradient>

          {/* FOX: Warm Soft Orange */}
          <linearGradient id={`${idPrefix}_fox_body`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#FF9A68" : "#FF935E"} />
            <stop offset="65%" stopColor={isDark ? "#F47D47" : "#F2783F"} />
            <stop offset="100%" stopColor={isDark ? "#E0642B" : "#DD5E23"} />
          </linearGradient>

          {/* PANDA: Soft Milk White & Slate Charcoal */}
          <linearGradient id={`${idPrefix}_panda_body`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#FFFFFF" : "#FFFFFF"} />
            <stop offset="65%" stopColor={isDark ? "#F1F1F5" : "#F7F7FA"} />
            <stop offset="100%" stopColor={isDark ? "#DFE0E6" : "#E8E9F0"} />
          </linearGradient>
          <linearGradient id={`${idPrefix}_panda_dark`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#484752" : "#3D3C46"} />
            <stop offset="100%" stopColor={isDark ? "#33313B" : "#2A2932"} />
          </linearGradient>

          {/* Golden Collar Tag Gradient */}
          <linearGradient id={`${idPrefix}_gold_tag`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF2B2" />
            <stop offset="50%" stopColor="#F6C344" />
            <stop offset="100%" stopColor="#D99E18" />
          </linearGradient>
        </defs>

        {/* Ambient Halo Glow */}
        {shouldGlow && (
          <circle
            cx="80"
            cy="84"
            r="72"
            fill={`url(#${idPrefix}_glow)`}
            className="ony-mascot-glow-aura"
          />
        )}

        {/* Contact Shadow Under Mascot */}
        <ellipse
          cx="80"
          cy="147"
          rx="42"
          ry="7.5"
          fill={`url(#${idPrefix}_contact_shadow)`}
          className="ony-mascot-contact-shadow"
        />

        {/* Main Chibi Mascot Character SVG Group */}
        <g className="ony-mascot-plushie-group">
          {/* ANIMAL-SPECIFIC TAIL & BACK DETAILS */}
          {targetAnimal === "Cat" && (
            <path
              d="M 116 126 C 138 122, 146 100, 138 88 C 132 78, 122 84, 126 94 C 128 102, 120 114, 110 120 Z"
              fill={`url(#${idPrefix}_cat_body)`}
              stroke={isDark ? "rgba(255,255,255,0.18)" : "rgba(180,120,90,0.18)"}
              strokeWidth="1.2"
              className="ony-tail-wiggle"
            />
          )}

          {targetAnimal === "Dog" && (
            <path
              d="M 116 125 C 136 120, 144 105, 140 94 C 136 84, 124 88, 128 98 C 130 106, 122 116, 112 120 Z"
              fill={`url(#${idPrefix}_dog_body)`}
              stroke={isDark ? "rgba(255,255,255,0.18)" : "rgba(180,120,90,0.18)"}
              strokeWidth="1.2"
              className="ony-tail-wiggle"
            />
          )}

          {targetAnimal === "Bunny" && (
            <circle
              cx="118"
              cy="126"
              r="11"
              fill={`url(#${idPrefix}_bunny_body)`}
              stroke={isDark ? "rgba(255,255,255,0.18)" : "rgba(220,160,180,0.18)"}
              strokeWidth="1.2"
              className="ony-tail-wiggle"
            />
          )}

          {targetAnimal === "Bear" && (
            <circle
              cx="116"
              cy="125"
              r="8.5"
              fill={`url(#${idPrefix}_bear_body)`}
              stroke={isDark ? "rgba(255,255,255,0.18)" : "rgba(150,90,50,0.18)"}
              strokeWidth="1.2"
            />
          )}

          {targetAnimal === "Fox" && (
            <g className="ony-tail-wiggle">
              <path
                d="M 114 128 C 138 126, 156 102, 148 74 C 143 58, 127 64, 122 78 C 117 92, 112 114, 104 124 Z"
                fill={`url(#${idPrefix}_fox_body)`}
              />
              <path
                d="M 148 74 C 143 58, 127 64, 131 73 C 136 82, 143 82, 148 74 Z"
                fill="#FFF9F5"
              />
            </g>
          )}

          {targetAnimal === "Panda" && (
            <circle
              cx="116"
              cy="124"
              r="8"
              fill={`url(#${idPrefix}_panda_dark)`}
            />
          )}

          {/* EARS (Placed behind head/body) */}
          {targetAnimal === "Cat" && (
            <g className="ony-ears-group">
              {/* Left Cat Ear */}
              <path
                d="M 44 54 C 38 34, 46 18, 58 24 C 67 28, 69 44, 67 52 Z"
                fill={`url(#${idPrefix}_cat_body)`}
                stroke={isDark ? "rgba(255,255,255,0.18)" : "rgba(180,120,90,0.18)"}
                strokeWidth="1.2"
              />
              <path
                d="M 48 48 C 44 36, 48 26, 56 30 C 62 33, 63 43, 61 48 Z"
                fill={isDark ? "#F7B8C6" : "#FBB7C7"}
                opacity="0.85"
              />

              {/* Right Cat Ear */}
              <path
                d="M 116 54 C 122 34, 114 18, 102 24 C 93 28, 91 44, 93 52 Z"
                fill={`url(#${idPrefix}_cat_body)`}
                stroke={isDark ? "rgba(255,255,255,0.18)" : "rgba(180,120,90,0.18)"}
                strokeWidth="1.2"
              />
              <path
                d="M 112 48 C 116 36, 112 26, 104 30 C 98 33, 97 43, 99 48 Z"
                fill={isDark ? "#F7B8C6" : "#FBB7C7"}
                opacity="0.85"
              />
            </g>
          )}

          {targetAnimal === "Dog" && (
            <g className="ony-ears-group">
              {/* Left Floppy Ear */}
              <path
                d="M 46 48 C 30 46, 21 62, 25 84 C 27 95, 38 98, 43 87 C 47 77, 49 59, 49 48 Z"
                fill={`url(#${idPrefix}_dog_ear)`}
                stroke={isDark ? "rgba(255,255,255,0.18)" : "rgba(140,80,40,0.18)"}
                strokeWidth="1.2"
                className="ony-floppy-ear-left"
              />
              {/* Right Floppy Ear */}
              <path
                d="M 114 48 C 130 46, 139 62, 135 84 C 133 95, 122 98, 117 87 C 113 77, 111 59, 111 48 Z"
                fill={`url(#${idPrefix}_dog_ear)`}
                stroke={isDark ? "rgba(255,255,255,0.18)" : "rgba(140,80,40,0.18)"}
                strokeWidth="1.2"
                className="ony-floppy-ear-right"
              />
            </g>
          )}

          {targetAnimal === "Bunny" && (
            <g className="ony-ears-group">
              {/* Left Tall Bunny Ear */}
              <path
                d="M 52 50 C 42 30, 42 6, 56 6 C 68 6, 70 28, 68 50 Z"
                fill={`url(#${idPrefix}_bunny_body)`}
                stroke={isDark ? "rgba(255,255,255,0.18)" : "rgba(220,160,180,0.18)"}
                strokeWidth="1.2"
              />
              <path
                d="M 54 44 C 47 30, 47 13, 56 13 C 64 13, 66 28, 64 44 Z"
                fill={isDark ? "#F8BAC7" : "#FDC4D1"}
                opacity="0.88"
              />

              {/* Right Tall Bunny Ear */}
              <path
                d="M 108 50 C 118 30, 118 6, 104 6 C 92 6, 90 28, 92 50 Z"
                fill={`url(#${idPrefix}_bunny_body)`}
                stroke={isDark ? "rgba(255,255,255,0.18)" : "rgba(220,160,180,0.18)"}
                strokeWidth="1.2"
              />
              <path
                d="M 106 44 C 113 30, 113 13, 104 13 C 96 13, 94 28, 96 44 Z"
                fill={isDark ? "#F8BAC7" : "#FDC4D1"}
                opacity="0.88"
              />
            </g>
          )}

          {targetAnimal === "Bear" && (
            <g className="ony-ears-group">
              {/* Left Round Bear Ear */}
              <circle
                cx="46"
                cy="41"
                r="15"
                fill={`url(#${idPrefix}_bear_body)`}
                stroke={isDark ? "rgba(255,255,255,0.18)" : "rgba(150,90,50,0.18)"}
                strokeWidth="1.2"
              />
              <circle
                cx="47"
                cy="42"
                r="8.5"
                fill={isDark ? "#F8E0CF" : "#FFF1E5"}
                opacity="0.9"
              />

              {/* Right Round Bear Ear */}
              <circle
                cx="114"
                cy="41"
                r="15"
                fill={`url(#${idPrefix}_bear_body)`}
                stroke={isDark ? "rgba(255,255,255,0.18)" : "rgba(150,90,50,0.18)"}
                strokeWidth="1.2"
              />
              <circle
                cx="113"
                cy="42"
                r="8.5"
                fill={isDark ? "#F8E0CF" : "#FFF1E5"}
                opacity="0.9"
              />
            </g>
          )}

          {targetAnimal === "Fox" && (
            <g className="ony-ears-group">
              {/* Left Fox Ear */}
              <path
                d="M 44 54 C 38 34, 46 16, 58 22 C 67 26, 69 44, 67 52 Z"
                fill={`url(#${idPrefix}_fox_body)`}
              />
              <path
                d="M 48 30 C 45 22, 50 18, 56 21 C 58 24, 56 29, 51 31 Z"
                fill="#322E30"
              />
              <path
                d="M 49 48 C 45 36, 50 28, 58 32 C 63 35, 63 44, 61 48 Z"
                fill="#FFF9F5"
                opacity="0.9"
              />

              {/* Right Fox Ear */}
              <path
                d="M 116 54 C 122 34, 114 16, 102 22 C 93 26, 91 44, 93 52 Z"
                fill={`url(#${idPrefix}_fox_body)`}
              />
              <path
                d="M 112 30 C 115 22, 110 18, 104 21 C 102 24, 104 29, 109 31 Z"
                fill="#322E30"
              />
              <path
                d="M 111 48 C 115 36, 110 28, 102 32 C 97 35, 97 44, 99 48 Z"
                fill="#FFF9F5"
                opacity="0.9"
              />
            </g>
          )}

          {targetAnimal === "Panda" && (
            <g className="ony-ears-group">
              {/* Left Panda Ear */}
              <circle
                cx="46"
                cy="41"
                r="16"
                fill={`url(#${idPrefix}_panda_dark)`}
                stroke={isDark ? "rgba(255,255,255,0.18)" : "rgba(30,30,40,0.18)"}
                strokeWidth="1.2"
              />
              {/* Right Panda Ear */}
              <circle
                cx="114"
                cy="41"
                r="16"
                fill={`url(#${idPrefix}_panda_dark)`}
                stroke={isDark ? "rgba(255,255,255,0.18)" : "rgba(30,30,40,0.18)"}
                strokeWidth="1.2"
              />
            </g>
          )}

          {/* MAIN SQUISHY CHIBI PLUSHIE BODY (Shared Proportions) */}
          <path
            d="M 52 46 C 60 42, 100 42, 108 46 C 124 54, 131 74, 129 90 C 127 100, 131 114, 125 127 C 119 139, 103 145, 80 145 C 57 145, 41 139, 35 127 C 29 114, 33 100, 31 90 C 29 74, 36 54, 52 46 Z"
            fill={
              targetAnimal === "Cat"
                ? `url(#${idPrefix}_cat_body)`
                : targetAnimal === "Dog"
                ? `url(#${idPrefix}_dog_body)`
                : targetAnimal === "Bunny"
                ? `url(#${idPrefix}_bunny_body)`
                : targetAnimal === "Bear"
                ? `url(#${idPrefix}_bear_body)`
                : targetAnimal === "Fox"
                ? `url(#${idPrefix}_fox_body)`
                : `url(#${idPrefix}_panda_body)`
            }
            stroke={
              isDark
                ? "rgba(255, 255, 255, 0.16)"
                : targetAnimal === "Fox"
                ? "rgba(180, 70, 30, 0.18)"
                : targetAnimal === "Bear"
                ? "rgba(130, 80, 40, 0.18)"
                : "rgba(160, 120, 100, 0.16)"
            }
            strokeWidth="1.2"
            className="ony-body-plush"
          />

          {/* Subtle Top-Head Specular Highlight for 3D Volume */}
          <ellipse
            cx="78"
            cy="52"
            rx="32"
            ry="7"
            fill="#FFFFFF"
            opacity={isDark ? "0.22" : "0.38"}
          />

          {/* ANIMAL-SPECIFIC CHEST / MUZZLE DETAILS */}
          {targetAnimal === "Cat" && (
            <>
              {/* Soft Tabby Forehead Marks */}
              <path
                d="M 80 48 L 80 56"
                stroke={isDark ? "#D8A381" : "#E2AC8D"}
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <path
                d="M 74 50 L 73 57"
                stroke={isDark ? "#D8A381" : "#E2AC8D"}
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M 86 50 L 87 57"
                stroke={isDark ? "#D8A381" : "#E2AC8D"}
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              {/* Cream tummy patch */}
              <ellipse
                cx="80"
                cy="126"
                rx="22"
                ry="14"
                fill="#FFFDFB"
                opacity={isDark ? "0.45" : "0.65"}
              />
            </>
          )}

          {targetAnimal === "Dog" && (
            <>
              {/* Cream Muzzle & Tummy */}
              <ellipse
                cx="80"
                cy="92"
                rx="18"
                ry="11"
                fill="#FFFDF9"
                opacity={isDark ? "0.85" : "0.95"}
              />
              <ellipse
                cx="80"
                cy="128"
                rx="24"
                ry="13"
                fill="#FFFDF9"
                opacity={isDark ? "0.55" : "0.75"}
              />
            </>
          )}

          {targetAnimal === "Bunny" && (
            <>
              {/* Silky belly highlight */}
              <ellipse
                cx="80"
                cy="126"
                rx="22"
                ry="14"
                fill="#FFFFFF"
                opacity="0.8"
              />
            </>
          )}

          {targetAnimal === "Bear" && (
            <>
              {/* Lighter Honey Muzzle */}
              <ellipse
                cx="80"
                cy="92"
                rx="19"
                ry="12"
                fill={isDark ? "#FCEFE2" : "#FFF3E5"}
                opacity="0.95"
              />
              {/* Lighter belly patch */}
              <ellipse
                cx="80"
                cy="126"
                rx="23"
                ry="14"
                fill={isDark ? "#F5DEC9" : "#FBE2CC"}
                opacity="0.7"
              />
            </>
          )}

          {targetAnimal === "Fox" && (
            <>
              {/* Fluffy Cream Cheeks */}
              <path
                d="M 36 84 C 44 88, 50 94, 56 96 C 48 95, 41 91, 38 86 Z"
                fill="#FFF9F5"
              />
              <path
                d="M 124 84 C 116 88, 110 94, 104 96 C 112 95, 119 91, 122 86 Z"
                fill="#FFF9F5"
              />
              {/* White Chest Bib */}
              <path
                d="M 66 104 C 74 98, 86 98, 94 104 C 90 124, 70 124, 66 104 Z"
                fill="#FFF9F5"
              />
            </>
          )}

          {targetAnimal === "Panda" && (
            <>
              {/* Soft Charcoal Eye Patches (Not harsh black!) */}
              <ellipse
                cx="62"
                cy="82"
                rx="11.5"
                ry="14.5"
                transform="rotate(-20 62 82)"
                fill={`url(#${idPrefix}_panda_dark)`}
              />
              <ellipse
                cx="98"
                cy="82"
                rx="11.5"
                ry="14.5"
                transform="rotate(20 98 82)"
                fill={`url(#${idPrefix}_panda_dark)`}
              />
              {/* Charcoal Vest/Arms on Sides */}
              <path
                d="M 33 110 C 31 122, 38 134, 48 136 C 44 126, 42 118, 44 110 Z"
                fill={`url(#${idPrefix}_panda_dark)`}
              />
              <path
                d="M 127 110 C 129 122, 122 134, 112 136 C 116 126, 118 118, 116 110 Z"
                fill={`url(#${idPrefix}_panda_dark)`}
              />
            </>
          )}

          {/* FACIAL FEATURES */}
          {/* Eyes & Blinks */}
          {activeMood === "happy" ? (
            /* Beaming Smile Eyes (∩ ∩) */
            <g className="ony-happy-eyes">
              <path
                d="M 58 84 Q 64 77 70 84"
                stroke={targetAnimal === "Panda" ? "#FFFFFF" : isDark ? "#EFEAE7" : "#2F2321"}
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 90 84 Q 96 77 102 84"
                stroke={targetAnimal === "Panda" ? "#FFFFFF" : isDark ? "#EFEAE7" : "#2F2321"}
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ) : (
            /* Big Dark Glossy Eyes with Dual Highlights */
            <g className="ony-eyes-group">
              {/* Left Eye */}
              <ellipse
                cx="64"
                cy="82"
                rx="5"
                ry="6"
                fill={targetAnimal === "Panda" ? "#FFFFFF" : isDark ? "#281E1C" : "#2F2321"}
                className="ony-eye-left"
              />
              {/* Left Specular Highlight */}
              <circle
                cx="62"
                cy="80"
                r="2.2"
                fill={targetAnimal === "Panda" ? "#2A2932" : "#FFFFFF"}
              />
              <circle
                cx="65.5"
                cy="84"
                r="0.9"
                fill={targetAnimal === "Panda" ? "#2A2932" : "#FFFFFF"}
              />

              {/* Right Eye */}
              <ellipse
                cx="96"
                cy="82"
                rx="5"
                ry="6"
                fill={targetAnimal === "Panda" ? "#FFFFFF" : isDark ? "#281E1C" : "#2F2321"}
                className="ony-eye-right"
              />
              {/* Right Specular Highlight */}
              <circle
                cx="94"
                cy="80"
                r="2.2"
                fill={targetAnimal === "Panda" ? "#2A2932" : "#FFFFFF"}
              />
              <circle
                cx="97.5"
                cy="84"
                r="0.9"
                fill={targetAnimal === "Panda" ? "#2A2932" : "#FFFFFF"}
              />
            </g>
          )}

          {/* Rosy Theme-Tinted Cheeks (Blush) */}
          <ellipse
            cx="55"
            cy="91"
            rx="8.5"
            ry="5"
            fill="var(--theme-accent, #F6A89E)"
            opacity={
              activeMood === "happy" || activeMood === "comforting"
                ? isDark
                  ? "0.75"
                  : "0.65"
                : isDark
                ? "0.55"
                : "0.45"
            }
            className="ony-cheek-blush"
          />
          <ellipse
            cx="105"
            cy="91"
            rx="8.5"
            ry="5"
            fill="var(--theme-accent, #F6A89E)"
            opacity={
              activeMood === "happy" || activeMood === "comforting"
                ? isDark
                  ? "0.75"
                  : "0.65"
                : isDark
                ? "0.55"
                : "0.45"
            }
            className="ony-cheek-blush"
          />

          {/* Tiny Nose */}
          <path
            d="M 77.5 87 Q 80 85 82.5 87 Q 80 89.5 77.5 87 Z"
            fill={
              targetAnimal === "Cat" || targetAnimal === "Bunny"
                ? isDark
                  ? "#F08FA3"
                  : "#E88297"
                : targetAnimal === "Bear"
                ? "#593320"
                : targetAnimal === "Fox" || targetAnimal === "Panda"
                ? "#2A282A"
                : "#784B34"
            }
          />

          {/* Soft Muzzle / Mouth (W-style or Sweet Smile) */}
          {activeMood === "speaking" ? (
            /* Speaking Gentle Bounce Mouth */
            <path
              d="M 76 91 Q 80 90 84 91 Q 80 97 76 91 Z"
              fill={isDark ? "#F88F9E" : "#E27382"}
              stroke={isDark ? "#3A2B27" : "#5A3830"}
              strokeWidth="1.2"
              className="ony-mouth-speaking"
            />
          ) : activeMood === "happy" ? (
            /* Soft Upcurved Smile */
            <path
              d="M 75 91 Q 80 96 85 91"
              stroke={isDark ? "#4B3632" : "#5A3830"}
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            /* Classic Gentle Chibi 'w' Mouth */
            <path
              d="M 75 91 Q 77.5 93.8 80 91.2 Q 82.5 93.8 85 91"
              stroke={isDark ? "#4B3632" : "#5A3830"}
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
              className="ony-mouth-rest"
            />
          )}

          {/* Chubby Front Paws (Resting gently together on chest) */}
          <g className="ony-front-paws">
            <ellipse
              cx="67"
              cy="121"
              rx="7"
              ry="8.5"
              fill={
                targetAnimal === "Panda"
                  ? `url(#${idPrefix}_panda_dark)`
                  : targetAnimal === "Dog"
                  ? `url(#${idPrefix}_dog_body)`
                  : targetAnimal === "Bear"
                  ? `url(#${idPrefix}_bear_body)`
                  : targetAnimal === "Fox"
                  ? "#FFF9F5"
                  : targetAnimal === "Bunny"
                  ? `url(#${idPrefix}_bunny_body)`
                  : `url(#${idPrefix}_cat_body)`
              }
              stroke={isDark ? "rgba(255,255,255,0.18)" : "rgba(160,110,90,0.18)"}
              strokeWidth="1.1"
            />
            <ellipse
              cx="93"
              cy="121"
              rx="7"
              ry="8.5"
              fill={
                targetAnimal === "Panda"
                  ? `url(#${idPrefix}_panda_dark)`
                  : targetAnimal === "Dog"
                  ? `url(#${idPrefix}_dog_body)`
                  : targetAnimal === "Bear"
                  ? `url(#${idPrefix}_bear_body)`
                  : targetAnimal === "Fox"
                  ? "#FFF9F5"
                  : targetAnimal === "Bunny"
                  ? `url(#${idPrefix}_bunny_body)`
                  : `url(#${idPrefix}_cat_body)`
              }
              stroke={isDark ? "rgba(255,255,255,0.18)" : "rgba(160,110,90,0.18)"}
              strokeWidth="1.1"
            />
          </g>

          {/* THE ONY CHEST CHARM / COLLAR TAG (Off the face!) */}
          {!isMini && (
            <g className="ony-collar-charm-group">
              {/* Theme-colored collar ribbon */}
              <path
                d="M 64 107 Q 80 114 96 107"
                stroke="var(--theme-primary, #F28C78)"
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />

              {/* Hanging Golden Tag / Heart Charm */}
              <circle
                cx="80"
                cy="114"
                r="5.5"
                fill={`url(#${idPrefix}_gold_tag)`}
                stroke="#C28912"
                strokeWidth="0.8"
              />
              {/* Cute tiny ONY engraving or heart */}
              <text
                x="80"
                y="116"
                textAnchor="middle"
                fontSize="4px"
                fontWeight="900"
                fill="#5E3807"
                fontFamily="system-ui, sans-serif"
                letterSpacing="-0.2px"
              >
                ONY
              </text>
            </g>
          )}

          {/* Extra Expression Flairs (Sparkle/Hearts in Happy or Comforting mode) */}
          {activeMood === "happy" && (
            <g className="ony-sparkle-float">
              {/* Heart floating over right cheek */}
              <path
                d="M 112 62 C 112 58, 116 56, 118 58 C 120 56, 124 58, 124 62 C 124 67, 118 71, 118 71 C 118 71, 112 67, 112 62 Z"
                fill="var(--theme-primary, #F28C78)"
                opacity="0.9"
              />
            </g>
          )}

          {activeMood === "comforting" && (
            <g className="ony-comfort-stars">
              {/* Tiny soft star twinkle */}
              <path
                d="M 114 62 L 115.5 65.5 L 119 67 L 115.5 68.5 L 114 72 L 112.5 68.5 L 109 67 L 112.5 65.5 Z"
                fill="var(--theme-accent, #FAD2C8)"
                opacity="0.85"
              />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

export default CompanionAvatar;
