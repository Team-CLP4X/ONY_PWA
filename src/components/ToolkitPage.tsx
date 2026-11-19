import React, { useState, useMemo } from "react";
import {
  TOOLKIT_GUIDES,
  MALAYSIAN_CRISIS_HELPLINES,
  type ToolkitGuide,
  type FeelingTag,
} from "../data/toolkitContent";
import {
  ToolCard,
  GuideCard,
  FeelingFilterChips,
  CrisisSupportSection,
  GuideDetailScreen,
} from "./ToolkitComponents";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

export interface ToolkitPageProps {
  back: () => void;
  navigate: (screen: any) => void;
  notify: (msg: string) => void;
  onOpenMusicModal?: () => void;
  isMusicPlaying?: boolean;
  onToggleMusic?: () => void;
  onSaveToVault?: (text: string, title: string) => Promise<void> | void;
  onRecordCompletion?: (
    guideId: string,
    guideTitle: string,
    mood: "better" | "same" | "worse",
  ) => Promise<void> | void;
  onPreloadChatTopic?: (topic: string) => void;
  initialGuideId?: string;
}

const FEELING_OPTIONS: FeelingTag[] = [
  "Anxious",
  "Overwhelmed",
  "Low mood",
  "Can't sleep",
  "Angry",
  "Lonely",
];

export function ToolkitPage({
  back,
  navigate,
  notify,
  onOpenMusicModal,
  isMusicPlaying = false,
  onToggleMusic,
  onSaveToVault,
  onRecordCompletion,
  onPreloadChatTopic,
  initialGuideId,
}: ToolkitPageProps) {
  const { isDark } = useTheme();
  const { language } = useLanguage();

  const isBm = language.includes("Melayu") || language.includes("bm");
  const isZh = language.includes("中文") || language.includes("zh");

  // State
  const [selectedFeeling, setSelectedFeeling] = useState<FeelingTag | "All">("All");
  const [activeGuide, setActiveGuide] = useState<ToolkitGuide | null>(() => {
    if (initialGuideId) {
      return TOOLKIT_GUIDES.find((g) => g.id === initialGuideId) || null;
    }
    return null;
  });

  // Filtered guides based on selected feeling
  const filteredGuides = useMemo(() => {
    if (selectedFeeling === "All") return TOOLKIT_GUIDES;
    return TOOLKIT_GUIDES.filter((g) => g.feelings.includes(selectedFeeling));
  }, [selectedFeeling]);

  // Handlers for Quick Relief Cards
  const handleOpenBreathe = () => {
    const breathingGuide = TOOLKIT_GUIDES.find((g) => g.id === "breathing_box");
    if (breathingGuide) setActiveGuide(breathingGuide);
  };

  const handleOpenGrounding = () => {
    const groundingGuide = TOOLKIT_GUIDES.find((g) => g.id === "grounding_54321");
    if (groundingGuide) setActiveGuide(groundingGuide);
  };

  const handleToggleCalmingSounds = () => {
    if (onToggleMusic) {
      onToggleMusic();
    } else if (onOpenMusicModal) {
      onOpenMusicModal();
    } else {
      notify(isBm ? "Muzik menenangkan aktif" : isZh ? "舒缓音乐已就绪" : "Calming ambience active");
    }
  };

  const handleTalkToOnyAboutGuide = (guideTitle: string) => {
    if (onPreloadChatTopic) {
      onPreloadChatTopic(guideTitle);
    }
    navigate("chat");
  };

  // If a guide detail view is active, render the GuideDetailScreen
  if (activeGuide) {
    return (
      <GuideDetailScreen
        guide={activeGuide}
        onBack={() => setActiveGuide(null)}
        onTalkToOny={handleTalkToOnyAboutGuide}
        onSaveToVault={onSaveToVault}
        onRecordCompletion={onRecordCompletion}
        helplines={MALAYSIAN_CRISIS_HELPLINES}
        notify={notify}
        lang={language}
      />
    );
  }

  return (
    <div
      className="toolkit-page"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: "var(--theme-bg)",
        color: "var(--theme-text-primary)",
      }}
    >
      {/* 1. Page Header with back button */}
      <header
        className="toolkit-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "var(--theme-header-bg)",
          borderBottom: "1px solid var(--theme-border)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={back}
          aria-label="Go back"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            border: "none",
            background: "transparent",
            color: "var(--theme-text-primary)",
            fontSize: "var(--font-button)",
            fontWeight: 800,
            cursor: "pointer",
            minHeight: "44px",
            padding: "0 4px",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>{isBm ? "Kembali" : isZh ? "返回" : "Back"}</span>
        </button>

        <span
          style={{
            fontSize: "calc(15px * var(--font-scale, 1))",
            fontWeight: 900,
            letterSpacing: "-0.01em",
            color: "var(--theme-text-primary)",
          }}
        >
          {isBm ? "Peralatan" : isZh ? "心理工具箱" : "Toolkit"}
        </span>

        <button
          type="button"
          onClick={() => {
            const crisisElem = document.getElementById("toolkit-crisis-bottom");
            if (crisisElem) {
              crisisElem.scrollIntoView({ behavior: "smooth" });
            }
          }}
          style={{
            border: "1px solid var(--theme-danger-border)",
            borderRadius: "100px",
            padding: "5px 10px",
            background: "var(--theme-danger-soft)",
            color: "var(--theme-danger)",
            fontSize: "calc(11px * var(--font-scale, 1))",
            fontWeight: 800,
            cursor: "pointer",
            minHeight: "36px",
          }}
          aria-label="Jump to crisis helplines"
        >
          🚨 {isBm ? "Krisis" : isZh ? "热线" : "Crisis"}
        </button>
      </header>

      {/* Main Toolkit Body */}
      <main className="toolkit-content-pad" style={{ padding: "16px", flex: 1 }}>
        {/* Header Hero Card (Fixing the white-on-white bug!) */}
        <div
          className="toolkit-hero-card"
          style={{
            borderRadius: "24px",
            padding: "18px 20px",
            background: "var(--theme-surface)",
            border: "1.5px solid var(--theme-border)",
            boxShadow: "var(--theme-shadow-sm)",
            marginBottom: "20px",
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              background: "var(--theme-primary)",
              color: "var(--theme-on-primary)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              boxShadow: "var(--theme-shadow-primary)",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>

          <div>
            <h1
              style={{
                margin: "0 0 4px",
                fontSize: "var(--font-heading)",
                fontWeight: 900,
                color: "var(--theme-text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              {isBm ? "Peralatan Kesejahteraan" : isZh ? "心理工具箱" : "Toolkit"}
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "var(--font-body-sm)",
                color: "var(--theme-text-secondary)",
                lineHeight: 1.4,
              }}
            >
              {isBm
                ? "Alat kecil untuk menenangkan fikiran anda sekarang."
                : isZh
                ? "微小而实在的心理自护工具，为当下的身心带来平复。"
                : "Small tools for how you feel right now."}
            </p>
          </div>
        </div>

        {/* 2. Quick Relief Row (Top 3 Large Tappable Cards) */}
        <section style={{ marginBottom: "24px" }}>
          <h2
            style={{
              fontSize: "var(--font-body-sm)",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--theme-primary)",
              margin: "0 0 12px",
            }}
          >
            ⚡ {isBm ? "Kelegaan Pantas" : isZh ? "即刻舒缓" : "Quick Relief"}
          </h2>

          <div
            className="toolkit-quick-relief-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "12px",
            }}
          >
            <ToolCard
              id="quick_breathe"
              title={isBm ? "Bernafas" : isZh ? "静心呼吸" : "Breathe"}
              subtitle={isBm ? "Panduan 1 minit" : isZh ? "1分钟呼吸引导" : "1 min guided breath"}
              duration="1 min"
              iconType="breathe"
              onClick={handleOpenBreathe}
              lang={language}
            />

            <ToolCard
              id="quick_ground"
              title={isBm ? "Pembumian" : isZh ? "身心着陆" : "Ground yourself"}
              subtitle="5-4-3-2-1"
              duration="2 min"
              iconType="ground"
              onClick={handleOpenGrounding}
              lang={language}
            />

            <ToolCard
              id="quick_sounds"
              title={isBm ? "Bunyi Tenang" : isZh ? "疗愈白噪音" : "Calming sounds"}
              subtitle={
                isMusicPlaying
                  ? isBm ? "Sedang dimainkan" : isZh ? "正在播放中" : "Currently playing"
                  : isBm ? "Audio ambien" : isZh ? "432Hz 自然声学" : "Ambient audio"
              }
              duration={isMusicPlaying ? "Active" : "Music"}
              iconType="sound"
              isActive={isMusicPlaying}
              isPlayingSound={isMusicPlaying}
              onClick={handleToggleCalmingSounds}
              lang={language}
            />
          </div>
        </section>

        {/* 3. "How are you feeling?" Chips Filter */}
        <section style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <h2
              style={{
                fontSize: "var(--font-body)",
                fontWeight: 800,
                margin: 0,
                color: "var(--theme-text-primary)",
              }}
            >
              {isBm ? "Bagaimanakah perasaan anda sekarang?" : isZh ? "您此刻的心情是？" : "How are you feeling?"}
            </h2>

            {selectedFeeling !== "All" && (
              <button
                type="button"
                onClick={() => setSelectedFeeling("All")}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "calc(11px * var(--font-scale, 1))",
                  color: "var(--theme-primary)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {isBm ? "Tunjuk Semua" : isZh ? "显示全部" : "Show All"}
              </button>
            )}
          </div>

          <FeelingFilterChips
            feelings={FEELING_OPTIONS}
            selectedFeeling={selectedFeeling}
            onSelectFeeling={setSelectedFeeling}
            lang={language}
          />
        </section>

        {/* 4. Guides List (Consistent card style, no odd selected state) */}
        <section style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h2
              style={{
                fontSize: "var(--font-body-sm)",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--theme-primary)",
                margin: 0,
              }}
            >
              📖 {isBm ? "Panduan Bantuan Diri" : isZh ? "自护指引库" : "Self-Help Guides"}
            </h2>

            <span style={{ fontSize: "calc(11px * var(--font-scale, 1))", opacity: 0.65, fontWeight: 700 }}>
              {filteredGuides.length} {isBm ? "panduan" : isZh ? "个指南" : "guides"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredGuides.map((guide) => (
              <GuideCard
                key={guide.id}
                guide={guide}
                onClick={() => setActiveGuide(guide)}
                lang={language}
              />
            ))}
          </div>
        </section>

        {/* 5. Crisis Support Section pinned at bottom */}
        <div id="toolkit-crisis-bottom">
          <CrisisSupportSection
            helplines={MALAYSIAN_CRISIS_HELPLINES}
            notify={notify}
            lang={language}
          />
        </div>
      </main>
    </div>
  );
}

export default ToolkitPage;
