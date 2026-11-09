import React, { useState, useEffect, useRef, useCallback } from "react";
import type {
  ToolkitGuide,
  ToolkitStep,
  FeelingTag,
  MalaysianHelpline,
} from "../data/toolkitContent";
import { useTheme } from "../theme/ThemeContext";

// ==========================================
// 1. DURATION CHIP
// ==========================================
export function DurationChip({
  duration,
  className = "",
}: {
  duration: string;
  className?: string;
}) {
  return (
    <span
      className={`toolkit-duration-chip ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "11px",
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: "100px",
        background: "var(--theme-surface-soft, rgba(0, 0, 0, 0.05))",
        color: "var(--theme-text-secondary, #6b645f)",
        border: "1px solid var(--theme-border, rgba(0, 0, 0, 0.08))",
        whiteSpace: "nowrap",
      }}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span>{duration}</span>
    </span>
  );
}

// ==========================================
// 2. QUICK RELIEF TOOL CARD
// ==========================================
export interface ToolCardProps {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  iconType: "breathe" | "ground" | "sound";
  isActive?: boolean;
  isPlayingSound?: boolean;
  onClick: () => void;
  lang?: string;
}

export function ToolCard({
  title,
  subtitle,
  duration,
  iconType,
  isActive = false,
  isPlayingSound = false,
  onClick,
}: ToolCardProps) {
  const { isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`toolkit-tool-card tool-card-${iconType} ${isActive ? "active" : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "16px 14px",
        borderRadius: "22px",
        border: isActive
          ? "2px solid var(--theme-primary, #F28C78)"
          : "1.5px solid var(--theme-border, rgba(0,0,0,0.08))",
        background: isActive
          ? isDark
            ? "color-mix(in srgb, var(--theme-primary, #F28C78) 18%, var(--theme-surface, #1e1919))"
            : "var(--theme-surface-elevated, #FFF0EC)"
          : isDark
          ? "var(--theme-surface, #1e1919)"
          : "var(--theme-surface, #ffffff)",
        color: "var(--theme-text-primary, #2d2424)",
        cursor: "pointer",
        textAlign: "left",
        position: "relative",
        minHeight: "132px",
        transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        boxShadow: isActive
          ? "0 8px 24px color-mix(in srgb, var(--theme-primary, #F28C78) 25%, transparent)"
          : "0 2px 8px rgba(0,0,0,0.03)",
        overflow: "hidden",
      }}
      aria-label={`${title}: ${subtitle} (${duration})`}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "8px" }}>
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "14px",
            display: "grid",
            placeItems: "center",
            background: isDark
              ? "color-mix(in srgb, var(--theme-primary, #F28C78) 22%, transparent)"
              : "color-mix(in srgb, var(--theme-primary, #F28C78) 14%, white)",
            color: "var(--theme-primary, #F28C78)",
          }}
        >
          {iconType === "breathe" && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
            </svg>
          )}
          {iconType === "ground" && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
          {iconType === "sound" && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </div>

        <DurationChip duration={duration} />
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <strong style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--theme-text-primary, #2d2424)" }}>
            {title}
          </strong>
          {isPlayingSound && (
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 6px #10b981",
              }}
              title="Playing audio"
            />
          )}
        </div>
        <p
          style={{
            margin: "3px 0 0",
            fontSize: "11px",
            color: "var(--theme-text-secondary, #6b645f)",
            lineHeight: 1.35,
          }}
        >
          {subtitle}
        </p>
      </div>
    </button>
  );
}

// ==========================================
// 3. FEELING FILTER CHIPS
// ==========================================
export interface FeelingFilterChipsProps {
  feelings: FeelingTag[];
  selectedFeeling: FeelingTag | "All";
  onSelectFeeling: (feeling: FeelingTag | "All") => void;
  lang?: string;
}

export function FeelingFilterChips({
  feelings,
  selectedFeeling,
  onSelectFeeling,
  lang = "English",
}: FeelingFilterChipsProps) {
  const isBm = lang.includes("Melayu") || lang.includes("bm");
  const isZh = lang.includes("中文") || lang.includes("zh");

  const getFeelingLabel = (f: FeelingTag | "All"): string => {
    if (f === "All") return isBm ? "Semua" : isZh ? "全部" : "All";
    if (f === "Anxious") return isBm ? "Cemas / Bimbang" : isZh ? "焦虑不安" : "Anxious";
    if (f === "Overwhelmed") return isBm ? "Terbeban" : isZh ? "压力过载" : "Overwhelmed";
    if (f === "Low mood") return isBm ? "Murung / Lesu" : isZh ? "低落消沉" : "Low mood";
    if (f === "Can't sleep") return isBm ? "Sukar Tidur" : isZh ? "难以入眠" : "Can't sleep";
    if (f === "Angry") return isBm ? "Marah / Geram" : isZh ? "愤怒烦躁" : "Angry";
    if (f === "Lonely") return isBm ? "Sunyi / Sendirian" : isZh ? "孤独寂寞" : "Lonely";
    return f;
  };

  return (
    <div
      className="toolkit-feelings-scroll"
      role="radiogroup"
      aria-label="Filter guides by how you are feeling"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        overflowX: "auto",
        padding: "4px 2px 8px",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selectedFeeling === "All"}
        onClick={() => onSelectFeeling("All")}
        style={{
          border: selectedFeeling === "All"
            ? "1.5px solid var(--theme-primary, #F28C78)"
            : "1px solid var(--theme-border, rgba(0,0,0,0.1))",
          borderRadius: "100px",
          padding: "7px 14px",
          fontSize: "12px",
          fontWeight: 700,
          background: selectedFeeling === "All"
            ? "var(--theme-primary, #F28C78)"
            : "var(--theme-surface, #ffffff)",
          color: selectedFeeling === "All" ? "#ffffff" : "var(--theme-text-primary, #2d2424)",
          cursor: "pointer",
          whiteSpace: "nowrap",
          minHeight: "44px",
          transition: "all 0.15s ease",
        }}
      >
        {getFeelingLabel("All")}
      </button>

      {feelings.map((feeling) => {
        const isSelected = selectedFeeling === feeling;
        return (
          <button
            key={feeling}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelectFeeling(feeling)}
            style={{
              border: isSelected
                ? "1.5px solid var(--theme-primary, #F28C78)"
                : "1px solid var(--theme-border, rgba(0,0,0,0.1))",
              borderRadius: "100px",
              padding: "7px 14px",
              fontSize: "12px",
              fontWeight: 700,
              background: isSelected
                ? "var(--theme-primary, #F28C78)"
                : "var(--theme-surface, #ffffff)",
              color: isSelected ? "#ffffff" : "var(--theme-text-primary, #2d2424)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              minHeight: "44px",
              transition: "all 0.15s ease",
            }}
          >
            {getFeelingLabel(feeling)}
          </button>
        );
      })}
    </div>
  );
}

// ==========================================
// 4. GUIDE CARD (Consistent Look & Feel)
// ==========================================
export interface GuideCardProps {
  guide: ToolkitGuide;
  onClick: () => void;
  lang?: string;
}

export function GuideCard({ guide, onClick, lang = "English" }: GuideCardProps) {
  const { isDark } = useTheme();
  const isBm = lang.includes("Melayu") || lang.includes("bm");
  const isZh = lang.includes("中文") || lang.includes("zh");

  const title = isBm ? guide.titleBm : isZh ? guide.titleZh : guide.title;
  const summary = isBm ? guide.summaryBm : isZh ? guide.summaryZh : guide.summary;

  return (
    <button
      type="button"
      onClick={onClick}
      className="toolkit-guide-card"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
        padding: "16px 18px",
        borderRadius: "20px",
        border: "1px solid var(--theme-border, rgba(0,0,0,0.08))",
        background: isDark ? "var(--theme-surface, #1e1919)" : "var(--theme-surface, #ffffff)",
        color: "var(--theme-text-primary, #2d2424)",
        cursor: "pointer",
        textAlign: "left",
        minHeight: "78px",
        transition: "transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
      }}
      aria-label={`Open guide: ${title}. ${summary}`}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1, minWidth: 0 }}>
        {/* Guide Icon */}
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            background: isDark
              ? "color-mix(in srgb, var(--theme-accent, #FAD2C8) 20%, transparent)"
              : "color-mix(in srgb, var(--theme-accent, #FAD2C8) 35%, white)",
            color: "var(--theme-primary, #F28C78)",
            marginTop: "2px",
          }}
        >
          {guide.icon === "wind" && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
            </svg>
          )}
          {guide.icon === "eye" && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
          {guide.icon === "checkCircle" && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          )}
          {guide.icon === "moon" && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
          {guide.icon === "edit" && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          )}
          {guide.icon === "alertTriangle" && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
          {guide.icon === "heart" && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          )}
        </div>

        {/* Text Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
            <strong style={{ fontSize: "14px", fontWeight: 800, color: "var(--theme-text-primary, #2d2424)" }}>
              {title}
            </strong>
            <DurationChip duration={guide.duration} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "var(--theme-text-secondary, #6b645f)",
              lineHeight: 1.35,
            }}
          >
            {summary}
          </p>
        </div>
      </div>

      {/* Clear Chevron */}
      <div style={{ color: "var(--theme-text-secondary, #6b645f)", paddingLeft: "4px" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </button>
  );
}

// ==========================================
// 5. INTERACTIVE BREATHING CIRCLE
// ==========================================
export interface BreathingCircleProps {
  onCycleComplete?: (count: number) => void;
  lang?: string;
}

export function BreathingCircle({ onCycleComplete, lang = "English" }: BreathingCircleProps) {
  const { settings, isDark } = useTheme();
  const [phase, setPhase] = useState<"inhale" | "holdIn" | "exhale" | "holdOut">("inhale");
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [cycleCount, setCycleCount] = useState(1);
  const [isRunning, setIsRunning] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const isBm = lang.includes("Melayu") || lang.includes("bm");
  const isZh = lang.includes("中文") || lang.includes("zh");

  // Check reduced motion setting
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(media.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, []);

  // Haptic feedback trigger
  const triggerHaptic = useCallback(() => {
    try {
      const hapticsEnabled = settings.soundHapticsPreferences?.hapticsEnabled ?? true;
      if (hapticsEnabled && typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(40);
      }
    } catch {}
  }, [settings.soundHapticsPreferences]);

  // Phase controller
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        // Transition to next phase
        triggerHaptic();
        if (phase === "inhale") {
          setPhase("holdIn");
          return 4;
        } else if (phase === "holdIn") {
          setPhase("exhale");
          return 4;
        } else if (phase === "exhale") {
          setPhase("holdOut");
          return 4;
        } else {
          setPhase("inhale");
          setCycleCount((c) => {
            const nextCycle = c + 1;
            if (onCycleComplete) onCycleComplete(nextCycle);
            return nextCycle;
          });
          return 4;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, phase, triggerHaptic, onCycleComplete]);

  // Labels
  const getPhaseText = () => {
    if (phase === "inhale") return isBm ? "Tarik Nafas" : isZh ? "吸气" : "Inhale";
    if (phase === "holdIn") return isBm ? "Tahan Nafas" : isZh ? "屏息" : "Hold";
    if (phase === "exhale") return isBm ? "Hembus Nafas" : isZh ? "呼气" : "Exhale";
    return isBm ? "Rehat Sejenak" : isZh ? "平静停顿" : "Pause & Rest";
  };

  const getPhaseInstruction = () => {
    if (phase === "inhale") return isBm ? "Melalui hidung secara perlahan..." : isZh ? "用鼻子缓缓吸入清新空气..." : "Slowly through your nose...";
    if (phase === "holdIn") return isBm ? "Kekalkan ketenangan..." : isZh ? "放松喉咙与肩头，感受静谧..." : "Soft and comfortable hold...";
    if (phase === "exhale") return isBm ? "Lepaskan semua ketegangan..." : isZh ? "用嘴唇轻吐出所有疲惫与紧绷..." : "Gently release all tension...";
    return isBm ? "Bersedia untuk kitaran seterusnya..." : isZh ? "胸腔空灵，准备下一组循环..." : "Empty and calm...";
  };

  // Scale computation for visual circle
  let circleScale = 1;
  if (!prefersReducedMotion) {
    if (phase === "inhale") circleScale = 1.35;
    else if (phase === "holdIn") circleScale = 1.35;
    else if (phase === "exhale") circleScale = 0.95;
    else circleScale = 0.95;
  }

  return (
    <div
      className="toolkit-breathing-interactive"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "220px",
          height: "220px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "12px auto 20px",
        }}
      >
        {/* Soft Background Halo */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "radial-gradient(circle, var(--theme-accent, #FAD2C8) 0%, transparent 70%)",
            opacity: isDark ? 0.35 : 0.45,
            filter: "blur(18px)",
            transform: `scale(${circleScale * 1.1})`,
            transition: prefersReducedMotion ? "none" : "transform 4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />

        {/* Outer Ring */}
        <div
          style={{
            position: "absolute",
            width: "190px",
            height: "190px",
            borderRadius: "50%",
            border: "2px dashed color-mix(in srgb, var(--theme-primary, #F28C78) 40%, transparent)",
            opacity: 0.6,
          }}
        />

        {/* Expanding / Contracting Main Breathing Circle */}
        <div
          style={{
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, var(--theme-surface-elevated, #FFF0EC), var(--theme-primary, #F28C78))",
            boxShadow: "0 14px 40px color-mix(in srgb, var(--theme-primary, #F28C78) 35%, transparent)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            transform: `scale(${circleScale})`,
            transition: prefersReducedMotion ? "opacity 0.5s ease" : "transform 4s cubic-bezier(0.4, 0, 0.2, 1)",
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: "28px", fontWeight: 900, textShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
            {secondsLeft}s
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              textShadow: "0 1px 4px rgba(0,0,0,0.25)",
              marginTop: "2px",
            }}
          >
            {getPhaseText()}
          </span>
        </div>
      </div>

      <p style={{ fontSize: "13px", color: "var(--theme-text-secondary, #6b645f)", margin: "0 0 16px", minHeight: "20px" }}>
        {getPhaseInstruction()}
      </p>

      {/* Cycle Indicator & Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, opacity: 0.75 }}>
          {isBm ? `Kitaran ${cycleCount}` : isZh ? `第 ${cycleCount} 轮循环` : `Cycle ${cycleCount} of 4`}
        </span>

        <button
          type="button"
          onClick={() => setIsRunning(!isRunning)}
          style={{
            border: "1px solid var(--theme-border, rgba(0,0,0,0.12))",
            background: "var(--theme-surface, #ffffff)",
            color: "var(--theme-text-primary, #2d2424)",
            borderRadius: "100px",
            padding: "6px 14px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {isRunning ? (isBm ? "Jeda" : isZh ? "暂停" : "Pause") : (isBm ? "Sambung" : isZh ? "继续" : "Resume")}
        </button>

        <button
          type="button"
          onClick={() => {
            setPhase("inhale");
            setSecondsLeft(4);
            setCycleCount(1);
          }}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--theme-text-secondary, #6b645f)",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {isBm ? "Mula Semula" : isZh ? "重置" : "Restart"}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 6. GUIDED STEP VIEWER (Step-by-Step Mode)
// ==========================================
export interface StepViewerProps {
  steps: ToolkitStep[];
  onComplete: () => void;
  lang?: string;
}

export function StepViewer({ steps, onComplete, lang = "English" }: StepViewerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { isDark } = useTheme();

  const isBm = lang.includes("Melayu") || lang.includes("bm");
  const isZh = lang.includes("中文") || lang.includes("zh");

  const currentStep = steps[currentStepIndex];
  const total = steps.length;
  const isLast = currentStepIndex === total - 1;
  const progressPercent = Math.round(((currentStepIndex + 1) / total) * 100);

  return (
    <div className="toolkit-step-viewer" style={{ width: "100%" }}>
      {/* Progress Bar */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, opacity: 0.7, marginBottom: "6px" }}>
          <span>{isBm ? `Langkah ${currentStepIndex + 1} daripada ${total}` : isZh ? `第 ${currentStepIndex + 1} / ${total} 步` : `Step ${currentStepIndex + 1} of ${total}`}</span>
          <span>{progressPercent}%</span>
        </div>
        <div
          style={{
            width: "100%",
            height: "6px",
            borderRadius: "100px",
            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: "var(--theme-primary, #F28C78)",
              borderRadius: "100px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Step Card */}
      <div
        style={{
          borderRadius: "22px",
          padding: "20px 18px",
          background: isDark ? "var(--theme-surface-elevated, #282121)" : "var(--theme-surface-elevated, #FFF8F5)",
          border: "1.5px solid var(--theme-border, rgba(0,0,0,0.08))",
          minHeight: "160px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "var(--theme-primary, #F28C78)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 800,
                display: "grid",
                placeItems: "center",
              }}
            >
              {currentStep.number}
            </span>
            <strong style={{ fontSize: "15px", fontWeight: 800, color: "var(--theme-text-primary, #2d2424)" }}>
              {currentStep.title}
            </strong>
          </div>

          <p style={{ fontSize: "13.5px", color: "var(--theme-text-primary, #2d2424)", lineHeight: 1.5, margin: "8px 0" }}>
            {currentStep.instruction}
          </p>

          {currentStep.tip && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: "12px",
                background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)",
                fontSize: "12px",
                color: "var(--theme-text-secondary, #6b645f)",
                marginTop: "10px",
              }}
            >
              <span>💡</span>
              <span>{currentStep.tip}</span>
            </div>
          )}
        </div>

        {/* Step Navigation Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginTop: "20px" }}>
          <button
            type="button"
            disabled={currentStepIndex === 0}
            onClick={() => setCurrentStepIndex((i) => Math.max(0, i - 1))}
            style={{
              padding: "10px 18px",
              borderRadius: "100px",
              border: "1px solid var(--theme-border, rgba(0,0,0,0.12))",
              background: "transparent",
              color: "var(--theme-text-primary, inherit)",
              fontSize: "12px",
              fontWeight: 700,
              cursor: currentStepIndex === 0 ? "not-allowed" : "pointer",
              opacity: currentStepIndex === 0 ? 0.35 : 1,
            }}
          >
            {isBm ? "Sebelumnya" : isZh ? "上一步" : "Previous"}
          </button>

          <button
            type="button"
            onClick={() => {
              if (isLast) {
                onComplete();
              } else {
                setCurrentStepIndex((i) => Math.min(total - 1, i + 1));
              }
            }}
            style={{
              padding: "10px 24px",
              borderRadius: "100px",
              border: "none",
              background: "var(--theme-primary, #F28C78)",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 4px 14px color-mix(in srgb, var(--theme-primary, #F28C78) 35%, transparent)",
            }}
          >
            {isLast ? (isBm ? "Selesai Panduan" : isZh ? "完成练习" : "Complete Guide") : (isBm ? "Langkah Seterusnya" : isZh ? "下一步" : "Next Step")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 7. JOURNALING GUIDE STEP (with Memory Vault Save)
// ==========================================
export interface JournalingStepProps {
  guide: ToolkitGuide;
  onSaveToVault?: (text: string, title: string) => Promise<void> | void;
  notify?: (msg: string) => void;
  lang?: string;
}

export function JournalingStep({ guide, onSaveToVault, notify, lang = "English" }: JournalingStepProps) {
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);
  const [journalText, setJournalText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const { isDark } = useTheme();

  const isBm = lang.includes("Melayu") || lang.includes("bm");
  const isZh = lang.includes("中文") || lang.includes("zh");

  const prompts = guide.journalPrompts || [
    {
      id: "p1",
      question: "What is one thought or feeling you need to express today?",
      questionBm: "Apakah satu luahan atau perasaan yang ingin anda kongsikan hari ini?",
      questionZh: "今天内心最想表达的一句话或一种感觉是什么？",
      placeholder: "Write here without judgment...",
    },
  ];

  const currentPrompt = prompts[selectedPromptIndex] || prompts[0];
  const question = isBm ? currentPrompt.questionBm : isZh ? currentPrompt.questionZh : currentPrompt.question;

  const handleSave = async () => {
    if (!journalText.trim()) {
      if (notify) notify(isBm ? "Sila tulis sedikit refleksi sebelum menyimpan" : isZh ? "请先写下一些反思再保存" : "Please write a reflection first");
      return;
    }

    try {
      setIsSaving(true);
      const combinedText = `[${question}]\n\n${journalText.trim()}`;
      if (onSaveToVault) {
        await onSaveToVault(combinedText, guide.title);
      }
      setSavedSuccess(true);
      if (notify) notify(isBm ? "Tersimpan ke Peti Memori & Diari!" : isZh ? "已成功保存到记忆库与私密日记！" : "Saved to Memory Vault & Diary!");
    } catch {
      if (notify) notify(isBm ? "Disimpan secara setempat" : isZh ? "已本地保存" : "Saved locally");
      setSavedSuccess(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="toolkit-journaling-step" style={{ width: "100%" }}>
      {/* Prompt Selectors */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginBottom: "14px", paddingBottom: "4px" }}>
        {prompts.map((p, idx) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setSelectedPromptIndex(idx);
              setSavedSuccess(false);
            }}
            style={{
              padding: "7px 14px",
              borderRadius: "100px",
              border: selectedPromptIndex === idx
                ? "1.5px solid var(--theme-primary, #F28C78)"
                : "1px solid var(--theme-border, rgba(0,0,0,0.1))",
              background: selectedPromptIndex === idx
                ? "var(--theme-surface-elevated, #FFF0EC)"
                : "transparent",
              color: "inherit",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {isBm ? `Dorongan ${idx + 1}` : isZh ? `提示 ${idx + 1}` : `Prompt ${idx + 1}`}
          </button>
        ))}
      </div>

      {/* Active Question Box */}
      <div
        style={{
          borderRadius: "18px",
          padding: "16px",
          background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          border: "1px solid var(--theme-border, rgba(0,0,0,0.08))",
          marginBottom: "12px",
        }}
      >
        <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "var(--theme-primary, #F28C78)", display: "block", marginBottom: "4px" }}>
          {isBm ? "Soalan Refleksi" : isZh ? "温和提示" : "Reflection Prompt"}
        </span>
        <strong style={{ fontSize: "14px", color: "var(--theme-text-primary, #2d2424)", lineHeight: 1.4 }}>
          {question}
        </strong>
      </div>

      {/* Text Area */}
      <div style={{ position: "relative", marginBottom: "14px" }}>
        <textarea
          value={journalText}
          onChange={(e) => {
            setJournalText(e.target.value);
            setSavedSuccess(false);
          }}
          placeholder={currentPrompt.placeholder}
          rows={5}
          style={{
            width: "100%",
            borderRadius: "16px",
            border: "1px solid var(--theme-border, rgba(0,0,0,0.12))",
            background: isDark ? "var(--theme-surface, #1e1919)" : "#ffffff",
            color: "var(--theme-text-primary, #2d2424)",
            padding: "14px",
            fontSize: "13.5px",
            lineHeight: 1.5,
            resize: "vertical",
            boxSizing: "border-box",
            outline: "none",
          }}
        />
        <span style={{ position: "absolute", bottom: "10px", right: "12px", fontSize: "11px", opacity: 0.5 }}>
          {journalText.length} chars
        </span>
      </div>

      {/* Save to Vault Action */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !journalText.trim()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            borderRadius: "100px",
            border: "none",
            background: savedSuccess ? "#10b981" : "var(--theme-primary, #F28C78)",
            color: "#ffffff",
            fontSize: "12.5px",
            fontWeight: 800,
            cursor: !journalText.trim() ? "not-allowed" : "pointer",
            opacity: !journalText.trim() ? 0.6 : 1,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {savedSuccess ? (
            <>
              <span>✓</span>
              <span>{isBm ? "Disimpan dalam Peti Memori" : isZh ? "已存入记忆库" : "Saved to Memory Vault"}</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>{isSaving ? "Saving..." : isBm ? "Simpan ke Peti Memori" : isZh ? "保存至记忆库" : "Save to Memory Vault"}</span>
            </>
          )}
        </button>

        <span style={{ fontSize: "11px", opacity: 0.65 }}>
          🔒 {isBm ? "Sulit & selamat" : isZh ? "私密加密存储" : "Private & safe"}
        </span>
      </div>
    </div>
  );
}

// ==========================================
// 8. CRISIS SUPPORT SECTION (Pinned at bottom)
// ==========================================
export interface CrisisSupportSectionProps {
  helplines: MalaysianHelpline[];
  notify?: (msg: string) => void;
  lang?: string;
  className?: string;
}

export function CrisisSupportSection({
  helplines,
  notify,
  lang = "English",
  className = "",
}: CrisisSupportSectionProps) {
  const { isDark } = useTheme();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isBm = lang.includes("Melayu") || lang.includes("bm");
  const isZh = lang.includes("中文") || lang.includes("zh");

  const handleCopy = (phone: string, id: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(phone);
      }
      setCopiedId(id);
      if (notify) {
        notify(isBm ? `Nombor disalin: ${phone}` : isZh ? `已复制电话号码：${phone}` : `Copied ${phone} to clipboard`);
      }
      setTimeout(() => setCopiedId(null), 2500);
    } catch {}
  };

  return (
    <section
      className={`toolkit-crisis-section ${className}`}
      style={{
        borderRadius: "24px",
        padding: "20px 18px",
        background: isDark
          ? "color-mix(in srgb, #ef4444 14%, var(--theme-surface, #1e1919))"
          : "#FFF5F5",
        border: "1.5px solid color-mix(in srgb, #ef4444 35%, transparent)",
        margin: "24px 0 16px",
      }}
      aria-label="Malaysian crisis helplines and immediate support"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "12px",
            background: "#ef4444",
            color: "#ffffff",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: isDark ? "#FCA5A5" : "#991B1B" }}>
            {isBm ? "Perlukan Bantuan Segera? (Talian Krisis Malaysia)" : isZh ? "需要即时危机帮助？(马来西亚官方求助热线)" : "Need Urgent Help? (Malaysian Helplines)"}
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: "11px", color: isDark ? "#FECACA" : "#7F1D1D", opacity: 0.85 }}>
            {isBm ? "Percuma, sulit & sedia mendengar apabila fikiran terasa terlalu berat" : isZh ? "免费、严格保密且随时守候，陪伴度过艰难时刻" : "Free, confidential, and ready to listen whenever things feel too heavy."}
          </p>
        </div>
      </div>

      {/* Helplines List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {helplines.map((item) => {
          const name = isBm ? item.nameBm : isZh ? item.nameZh : item.name;
          const service = isBm ? item.serviceBm : isZh ? item.serviceZh : item.service;
          const hours = isBm ? item.hoursBm : isZh ? item.hoursZh : item.hours;

          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                padding: "12px 14px",
                borderRadius: "16px",
                background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                border: "1px solid var(--theme-border, rgba(0,0,0,0.08))",
              }}
            >
              <div style={{ flex: 1, minWidth: "180px" }}>
                <strong style={{ fontSize: "13.5px", display: "block", color: "var(--theme-text-primary, #2d2424)" }}>
                  {name}
                </strong>
                <span style={{ fontSize: "11px", color: "var(--theme-text-secondary, #6b645f)", display: "block", marginTop: "2px" }}>
                  {service} · <strong style={{ color: "#ef4444" }}>{hours}</strong>
                </span>
              </div>

              {/* Actions: Tap-to-call & Tap-to-copy */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <a
                  href={`tel:${item.phoneNumber}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "7px 14px",
                    borderRadius: "100px",
                    background: "#ef4444",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 800,
                    textDecoration: "none",
                    minHeight: "44px",
                    boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
                  }}
                  aria-label={`Call ${name} at ${item.displayPhone}`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span>{isBm ? "Dail" : isZh ? "呼叫" : "Call"} {item.displayPhone}</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleCopy(item.displayPhone, item.id)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "100px",
                    border: "1px solid var(--theme-border, rgba(0,0,0,0.12))",
                    background: "var(--theme-surface, #ffffff)",
                    color: "var(--theme-text-primary, #2d2424)",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    minHeight: "44px",
                  }}
                  title="Copy number"
                  aria-label={`Copy ${item.displayPhone}`}
                >
                  {copiedId === item.id ? "✓ Copied" : isBm ? "Salin" : isZh ? "复制" : "Copy"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "12px", fontSize: "10.5px", color: isDark ? "#FECACA" : "#7F1D1D", opacity: 0.8, textAlign: "center" }}>
        {/* Verification notice for user / tester */}
        ℹ️ {isBm ? "Nota Keselamatan: Sila hubungi 999 jika anda berada dalam kecemasan segera." : isZh ? "安全声明：若您或身边人员面临即时危险，请立即拨打 999 呼叫急救。" : "Safety Note: Please call 999 immediately if in active danger or life-threatening crisis."}
      </div>
    </section>
  );
}

// ==========================================
// 9. GUIDE DETAIL SCREEN (Reusable Template)
// ==========================================
export interface GuideDetailScreenProps {
  guide: ToolkitGuide;
  onBack: () => void;
  onTalkToOny: (guideTitle: string) => void;
  onSaveToVault?: (text: string, title: string) => Promise<void> | void;
  helplines: MalaysianHelpline[];
  notify?: (msg: string) => void;
  lang?: string;
}

export function GuideDetailScreen({
  guide,
  onBack,
  onTalkToOny,
  onSaveToVault,
  helplines,
  notify,
  lang = "English",
}: GuideDetailScreenProps) {
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState<"interactive" | "overview">("interactive");
  const [feedbackMood, setFeedbackMood] = useState<"better" | "same" | "worse" | null>(null);
  const [showCrisisDrawer, setShowCrisisDrawer] = useState(false);

  const isBm = lang.includes("Melayu") || lang.includes("bm");
  const isZh = lang.includes("中文") || lang.includes("zh");

  const title = isBm ? guide.titleBm : isZh ? guide.titleZh : guide.title;
  const intro = isBm ? guide.introBm : isZh ? guide.introZh : guide.intro;
  const tags = isBm ? guide.tagsBm : isZh ? guide.tagsZh : guide.tags;

  const handleFeedback = (mood: "better" | "same" | "worse") => {
    setFeedbackMood(mood);

    // Save completion outcome for monthly reflection insights
    try {
      const stored = localStorage.getItem("ony_toolkit_completions");
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        guideId: guide.id,
        guideTitle: guide.title,
        mood,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem("ony_toolkit_completions", JSON.stringify(list));
    } catch {}

    if (mood === "better" && notify) {
      notify(isBm ? "Bagus sekali! Ambil nafas dan teruskan hari anda dengan tenang." : isZh ? "太好了！带着这份轻盈继续生活吧。" : "Wonderful to hear! Carry this gentle feeling forward.");
    }
  };

  return (
    <div
      className="toolkit-detail-page"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: isDark ? "var(--theme-bg, #141010)" : "var(--theme-bg, #FFF9F5)",
        color: "var(--theme-text-primary, #2d2424)",
      }}
    >
      {/* Detail Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid var(--theme-border, rgba(0,0,0,0.08))",
          background: isDark ? "var(--theme-header-bg, #1e1919)" : "var(--theme-header-bg, #ffffff)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Toolkit"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            border: "none",
            background: "transparent",
            color: "var(--theme-text-primary, #2d2424)",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            minHeight: "44px",
            padding: "0 6px",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>{isBm ? "Peralatan" : isZh ? "返回工具箱" : "Toolkit"}</span>
        </button>

        <DurationChip duration={guide.duration} />
      </header>

      {/* Main Detail Body */}
      <div style={{ padding: "16px", flex: 1 }}>
        {/* Title & Tags */}
        <div style={{ marginBottom: "16px" }}>
          <h1 style={{ fontSize: "21px", fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            {title}
          </h1>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
            <span style={{ fontSize: "11px", opacity: 0.65, fontWeight: 700, alignSelf: "center", marginRight: "2px" }}>
              {isBm ? "Sesuai untuk:" : isZh ? "适用场景：" : "Good for:"}
            </span>
            {tags.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: "11px",
                  padding: "3px 9px",
                  borderRadius: "100px",
                  background: isDark ? "rgba(255,255,255,0.08)" : "var(--theme-surface-elevated, #FFF0EC)",
                  color: "var(--theme-primary, #F28C78)",
                  fontWeight: 700,
                }}
              >
                {t}
              </span>
            ))}
          </div>

          <p style={{ fontSize: "13px", color: "var(--theme-text-secondary, #6b645f)", lineHeight: 1.45, margin: 0 }}>
            {intro}
          </p>
        </div>

        {/* Mode Selector for multi-step guides */}
        {guide.type === "steps" && (
          <div
            style={{
              display: "inline-flex",
              padding: "3px",
              borderRadius: "100px",
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              marginBottom: "16px",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("interactive")}
              style={{
                border: "none",
                borderRadius: "100px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 700,
                background: viewMode === "interactive" ? "var(--theme-primary, #F28C78)" : "transparent",
                color: viewMode === "interactive" ? "#ffffff" : "inherit",
                cursor: "pointer",
              }}
            >
              {isBm ? "Panduan Langkah Demi Langkah" : isZh ? "互动式指引" : "Guided Mode"}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("overview")}
              style={{
                border: "none",
                borderRadius: "100px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 700,
                background: viewMode === "overview" ? "var(--theme-primary, #F28C78)" : "transparent",
                color: viewMode === "overview" ? "#ffffff" : "inherit",
                cursor: "pointer",
              }}
            >
              {isBm ? "Semak Semua Langkah" : isZh ? "浏览全步骤" : "All Steps Overview"}
            </button>
          </div>
        )}

        {/* Specialized Guide Interactive Content */}
        {guide.type === "breathing" && (
          <div
            style={{
              borderRadius: "24px",
              background: isDark ? "var(--theme-surface, #1e1919)" : "var(--theme-surface, #ffffff)",
              border: "1px solid var(--theme-border, rgba(0,0,0,0.08))",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <BreathingCircle lang={lang} />
          </div>
        )}

        {guide.type === "journaling" && (
          <div
            style={{
              borderRadius: "24px",
              background: isDark ? "var(--theme-surface, #1e1919)" : "var(--theme-surface, #ffffff)",
              border: "1px solid var(--theme-border, rgba(0,0,0,0.08))",
              padding: "18px",
              marginBottom: "20px",
            }}
          >
            <JournalingStep
              guide={guide}
              onSaveToVault={onSaveToVault}
              notify={notify}
              lang={lang}
            />
          </div>
        )}

        {(guide.type === "steps" || guide.type === "grounding") && (
          <>
            {viewMode === "interactive" ? (
              <div style={{ marginBottom: "20px" }}>
                <StepViewer
                  steps={guide.steps}
                  onComplete={() => {
                    if (notify) notify(isBm ? "Panduan selesai! Bagaimana perasaan anda sekarang?" : isZh ? "练习已完成！您现在感觉如何？" : "Guide completed! How are you feeling now?");
                  }}
                  lang={lang}
                />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                {guide.steps.map((step) => (
                  <div
                    key={step.number}
                    style={{
                      borderRadius: "18px",
                      padding: "14px 16px",
                      background: isDark ? "var(--theme-surface, #1e1919)" : "var(--theme-surface, #ffffff)",
                      border: "1px solid var(--theme-border, rgba(0,0,0,0.08))",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: "var(--theme-primary, #F28C78)",
                          color: "#ffffff",
                          fontSize: "11px",
                          fontWeight: 800,
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        {step.number}
                      </span>
                      <strong style={{ fontSize: "14px", fontWeight: 800 }}>{step.title}</strong>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", lineHeight: 1.45, color: "var(--theme-text-primary, #2d2424)" }}>
                      {step.instruction}
                    </p>
                    {step.tip && (
                      <small style={{ display: "block", marginTop: "6px", color: "var(--theme-text-secondary, #6b645f)", fontSize: "11px" }}>
                        💡 {step.tip}
                      </small>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Real Source Attribution (No fake badges) */}
        {guide.attribution && (
          <div style={{ fontSize: "11px", color: "var(--theme-text-secondary, #6b645f)", opacity: 0.8, marginBottom: "20px" }}>
            📚 <em>{guide.attribution}</em>
          </div>
        )}

        {/* End of Guide: "How do you feel now?" 3-Emoji Check */}
        <section
          style={{
            borderRadius: "22px",
            padding: "18px",
            background: isDark ? "var(--theme-surface-elevated, #241c1c)" : "var(--theme-surface-elevated, #FFF5F2)",
            border: "1.5px solid var(--theme-border, rgba(0,0,0,0.08))",
            textAlign: "center",
            marginBottom: "20px",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--theme-primary, #F28C78)", display: "block", marginBottom: "4px" }}>
            {isBm ? "Daftar Masuk Emosi" : isZh ? "练习成效自测" : "Check-In"}
          </span>
          <h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: 800 }}>
            {isBm ? "Bagaimana perasaan anda sekarang?" : isZh ? "此刻，您的感觉如何？" : "How do you feel now?"}
          </h3>

          <div style={{ display: "flex", justifyContent: "center", gap: "14px" }}>
            <button
              type="button"
              onClick={() => handleFeedback("better")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                padding: "10px 18px",
                borderRadius: "16px",
                border: feedbackMood === "better"
                  ? "2px solid #10b981"
                  : "1px solid var(--theme-border, rgba(0,0,0,0.1))",
                background: feedbackMood === "better" ? (isDark ? "rgba(16, 185, 129, 0.2)" : "#ecfdf5") : "var(--theme-surface, #ffffff)",
                cursor: "pointer",
                minWidth: "72px",
                minHeight: "64px",
              }}
            >
              <span style={{ fontSize: "24px" }}>😊</span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--theme-text-primary, #2d2424)" }}>
                {isBm ? "Lebih Baik" : isZh ? "更轻松了" : "Better"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleFeedback("same")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                padding: "10px 18px",
                borderRadius: "16px",
                border: feedbackMood === "same"
                  ? "2px solid #f59e0b"
                  : "1px solid var(--theme-border, rgba(0,0,0,0.1))",
                background: feedbackMood === "same" ? (isDark ? "rgba(245, 158, 11, 0.2)" : "#fffbeb") : "var(--theme-surface, #ffffff)",
                cursor: "pointer",
                minWidth: "72px",
                minHeight: "64px",
              }}
            >
              <span style={{ fontSize: "24px" }}>😐</span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--theme-text-primary, #2d2424)" }}>
                {isBm ? "Sama Sahaja" : isZh ? "差不多" : "Same"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleFeedback("worse")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                padding: "10px 18px",
                borderRadius: "16px",
                border: feedbackMood === "worse"
                  ? "2px solid #ef4444"
                  : "1px solid var(--theme-border, rgba(0,0,0,0.1))",
                background: feedbackMood === "worse" ? (isDark ? "rgba(239, 68, 68, 0.2)" : "#fef2f2") : "var(--theme-surface, #ffffff)",
                cursor: "pointer",
                minWidth: "72px",
                minHeight: "64px",
              }}
            >
              <span style={{ fontSize: "24px" }}>😔</span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--theme-text-primary, #2d2424)" }}>
                {isBm ? "Lebih Berat" : isZh ? "依然沉重" : "Worse"}
              </span>
            </button>
          </div>

          {/* Gentle supportive assistance if "Worse" is selected */}
          {feedbackMood === "worse" && (
            <div
              style={{
                marginTop: "16px",
                padding: "14px",
                borderRadius: "16px",
                background: isDark ? "rgba(239, 68, 68, 0.12)" : "#FEF2F2",
                border: "1px solid color-mix(in srgb, #ef4444 35%, transparent)",
                textAlign: "left",
              }}
            >
              <strong style={{ fontSize: "13px", color: isDark ? "#FCA5A5" : "#991B1B", display: "block" }}>
                {isBm ? "Tidak mengapa. Ada hari yang terasa lebih berat." : isZh ? "没关系的。有些时刻就是会比平常更沉重一些。" : "It's completely okay. Some days are heavier than others."}
              </strong>
              <p style={{ margin: "4px 0 12px", fontSize: "12px", color: isDark ? "#FECACA" : "#7F1D1D", lineHeight: 1.4 }}>
                {isBm
                  ? "Anda tidak perlu menanggung perasaan ini sendirian. Mari bercakap dengan ONY atau hubungi talian sokongan percuma."
                  : isZh
                  ? "您不必独自一人扛下所有重负。不妨找 ONY 聊聊此刻的心情，或随时联络经过核实的免费热线。"
                  : "You don't have to carry this alone. Talk to ONY about what came up, or connect with a free, confidential helpline."}
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => onTalkToOny(guide.title)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "100px",
                    border: "none",
                    background: "var(--theme-primary, #F28C78)",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  💬 {isBm ? "Bercakap dengan ONY" : isZh ? "找 ONY 倾诉" : "Talk to ONY"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowCrisisDrawer(!showCrisisDrawer)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "100px",
                    border: "1px solid #ef4444",
                    background: "transparent",
                    color: "#ef4444",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  📞 {isBm ? "Lihat Talian Bantuan" : isZh ? "查看危机热线" : "Crisis Support"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Expandable crisis support if triggered */}
        {showCrisisDrawer && (
          <CrisisSupportSection
            helplines={helplines}
            notify={notify}
            lang={lang}
          />
        )}

        {/* Short Disclaimer */}
        <p style={{ fontSize: "11px", color: "var(--theme-text-secondary, #6b645f)", textAlign: "center", margin: "16px 0 24px" }}>
          ℹ️ {isBm ? "Alat bantu diri pendidikan, bukan pengganti rawatan perubatan profesional." : isZh ? "日常心理自助支持工具，不替代专业执业医师诊断或临床治疗。" : "Self-help tool, not a substitute for professional healthcare."}
        </p>
      </div>

      {/* Bottom Sticky Action Buttons */}
      <footer
        style={{
          padding: "14px 16px",
          borderTop: "1px solid var(--theme-border, rgba(0,0,0,0.08))",
          background: isDark ? "var(--theme-surface, #1e1919)" : "#ffffff",
          display: "flex",
          gap: "10px",
          position: "sticky",
          bottom: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "100px",
            border: "1px solid var(--theme-border, rgba(0,0,0,0.12))",
            background: "transparent",
            color: "var(--theme-text-primary, #2d2424)",
            fontSize: "13px",
            fontWeight: 800,
            cursor: "pointer",
            minHeight: "44px",
          }}
        >
          {isBm ? "Selesai" : isZh ? "完成" : "Done"}
        </button>

        <button
          type="button"
          onClick={() => onTalkToOny(guide.title)}
          style={{
            flex: 1.5,
            padding: "12px",
            borderRadius: "100px",
            border: "none",
            background: "var(--theme-primary, #F28C78)",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: 800,
            cursor: "pointer",
            minHeight: "44px",
            boxShadow: "0 4px 14px color-mix(in srgb, var(--theme-primary, #F28C78) 35%, transparent)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <span>💬</span>
          <span>{isBm ? "Bincang dengan ONY" : isZh ? "与 ONY 聊聊此话题" : "Talk to ONY about this"}</span>
        </button>
      </footer>
    </div>
  );
}
