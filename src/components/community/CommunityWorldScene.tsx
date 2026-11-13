import { useEffect, useMemo, useRef, useState } from "react";
import type { FirestoreCommunityPost } from "../../firebase/firestore";
import {
  formatFriendlyTime,
  getCategoryLabel,
  type AppLanguage,
} from "../../i18n/translations";
import {
  getLandmarkSubtitle,
  getLandmarkTitle,
  getMoodTargetLandmark,
  loadDeskListModePref,
  parseAuthorDisplay,
  prefersReducedMotion,
  saveDeskListModePref,
  triggerSubtleHaptic,
  type MoodChipId,
  type WorldCategoryItem,
} from "../../utils/communityPostHelpers";
import { Landmark, LandmarkArt } from "./Landmark";
import { MoodChips } from "./MoodChips";

export interface CommunityWorldSceneProps {
  categories: WorldCategoryItem[];
  allVisiblePosts: FirestoreCommunityPost[];
  searchOpen: boolean;
  searchQuery: string;
  onToggleSearch: () => void;
  onSearchChange: (value: string) => void;
  onSelectCategory: (category: string) => void;
  onSelectSearchPost: (post: FirestoreCommunityPost) => void;
  onOpenFeedWithSearch: () => void;
  language: AppLanguage;
}

export function CommunityWorldScene({
  categories,
  allVisiblePosts,
  searchOpen,
  searchQuery,
  onToggleSearch,
  onSearchChange,
  onSelectCategory,
  onSelectSearchPost,
  onOpenFeedWithSearch,
  language,
}: CommunityWorldSceneProps) {
  const [listMode, setListMode] = useState<boolean>(() => loadDeskListModePref());
  const [selectedMood, setSelectedMood] = useState<MoodChipId | null>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    prefersReducedMotion(),
  );
  const [zoomingCategory, setZoomingCategory] = useState<string | null>(null);
  const [zoomOrigin, setZoomOrigin] = useState<string>("50% 55%");

  const stageRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const zoomTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      window.setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  }, [searchOpen]);

  useEffect(() => {
    return () => {
      if (zoomTimerRef.current !== null) {
        window.clearTimeout(zoomTimerRef.current);
      }
    };
  }, []);

  const highlightedCategory = useMemo(
    () => getMoodTargetLandmark(selectedMood, categories),
    [selectedMood, categories],
  );

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const searchMatches = useMemo(() => {
    if (!trimmedQuery) return [];
    return allVisiblePosts.filter((p) => {
      const hay = `${p.title} ${p.body} ${p.author} ${p.category}`.toLowerCase();
      return hay.includes(trimmedQuery);
    });
  }, [allVisiblePosts, trimmedQuery]);

  const handleToggleListMode = () => {
    const next = !listMode;
    setListMode(next);
    saveDeskListModePref(next);
    triggerSubtleHaptic(8);
  };

  const handleLandmarkTap = (
    category: string,
    buttonEl: HTMLButtonElement | null,
  ) => {
    triggerSubtleHaptic(10);
    if (reducedMotion || !stageRef.current || !buttonEl) {
      onSelectCategory(category);
      return;
    }

    const stageRect = stageRef.current.getBoundingClientRect();
    const btnRect = buttonEl.getBoundingClientRect();
    const ox = Math.max(
      12,
      Math.min(
        88,
        ((btnRect.left + btnRect.width / 2 - stageRect.left) /
          Math.max(1, stageRect.width)) *
          100,
      ),
    );
    const oy = Math.max(
      14,
      Math.min(
        86,
        ((btnRect.top + btnRect.height / 2 - stageRect.top) /
          Math.max(1, stageRect.height)) *
          100,
      ),
    );

    setZoomOrigin(`${ox.toFixed(1)}% ${oy.toFixed(1)}%`);
    setZoomingCategory(category);

    if (zoomTimerRef.current !== null) {
      window.clearTimeout(zoomTimerRef.current);
    }
    zoomTimerRef.current = window.setTimeout(() => {
      setZoomingCategory(null);
      onSelectCategory(category);
    }, 200);
  };

  const handleSurpriseMe = () => {
    triggerSubtleHaptic(10);
    const populated = categories.filter(
      (c) => c.postCount > 0 && c.category !== "All",
    );
    const pool = populated.length > 0 ? populated : categories;
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    onSelectCategory(pick.category);
  };

  const gardenTitle =
    language === "Bahasa Melayu"
      ? "Taman Komuniti"
      : language === "中文"
        ? "心灵花园"
        : "Community Garden";

  const searchPlaceholder =
    language === "Bahasa Melayu"
      ? "Cari cerita komuniti…"
      : language === "中文"
        ? "搜索社区分享…"
        : "Search community stories…";

  const bottomPrompt =
    language === "Bahasa Melayu"
      ? "Setiap sudut menyimpan satu perbualan."
      : language === "中文"
        ? "每一个角落都藏着温暖对话。"
        : "Every corner holds a conversation.";

  const surpriseLabel =
    language === "Bahasa Melayu"
      ? "Kejutkan saya"
      : language === "中文"
        ? "随机漫步"
        : "Surprise me";

  const listSwitchLabel = listMode
    ? language === "Bahasa Melayu"
      ? "Taman"
      : language === "中文"
        ? "花园"
        : "Garden"
    : language === "Bahasa Melayu"
      ? "Senarai tempat"
      : language === "中文"
        ? "地点列表"
        : "List of places";

  // Split categories across calm upper terrace (<=3), mid meadow (<=3), and foreground/custom rows
  const topRow = categories.slice(0, 3);
  const midRow = categories.slice(3, 6);
  const bottomRow = categories.slice(6);

  return (
    <div className="world-home-shell">
      {/* Clean Header: Title + Search Icon ONLY (no cluttered segmented pills) */}
      <div className="world-top-header">
        <div className="world-title-group">
          <h2 className="world-scene-title">{gardenTitle}</h2>
        </div>

        <button
          type="button"
          className={`world-icon-btn ${searchOpen || trimmedQuery ? "active" : ""}`}
          onClick={onToggleSearch}
          aria-expanded={searchOpen}
          aria-label={
            searchOpen
              ? language === "Bahasa Melayu"
                ? "Tutup carian"
                : language === "中文"
                  ? "关闭搜索"
                  : "Close search"
              : searchPlaceholder
          }
        >
          {searchOpen ? (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="world-bar-svg">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="world-bar-svg">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Expandable Search Field */}
      {searchOpen && (
        <div className="desk-search-expandable">
          <div className="posts-search-field">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="world-bar-svg">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && trimmedQuery) {
                  e.preventDefault();
                  onOpenFeedWithSearch();
                }
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
            {searchQuery && (
              <button
                type="button"
                className="posts-search-clear-btn"
                onClick={() => {
                  onSearchChange("");
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="world-bar-svg">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search Results View OR World Scene + Mood Chips */}
      {trimmedQuery ? (
        <div className="desk-search-results-panel" role="region" aria-live="polite">
          <div className="desk-search-results-head">
            <span>
              {searchMatches.length}{" "}
              {language === "Bahasa Melayu"
                ? "padanan"
                : language === "中文"
                  ? "条匹配分享"
                  : searchMatches.length === 1
                    ? "matching post"
                    : "matching posts"}
            </span>
            {searchMatches.length > 0 && (
              <button
                type="button"
                className="desk-open-feed-link"
                onClick={onOpenFeedWithSearch}
              >
                {language === "Bahasa Melayu"
                  ? "Buka semua ›"
                  : language === "中文"
                    ? "查看全部 ›"
                    : "See all ›"}
              </button>
            )}
          </div>

          {searchMatches.length === 0 ? (
            <div className="desk-search-empty">
              <span aria-hidden="true">🌿</span>
              <p>
                {language === "Bahasa Melayu"
                  ? "Tiada siaran sepadan ditemui."
                  : language === "中文"
                    ? "没有找到相关分享。"
                    : "No matching stories found."}
              </p>
            </div>
          ) : (
            <ul className="desk-search-list">
              {searchMatches.slice(0, 12).map((post) => {
                const author = parseAuthorDisplay(post.author);
                return (
                  <li key={post.id}>
                    <button
                      type="button"
                      className="desk-search-item-btn"
                      onClick={() => onSelectSearchPost(post)}
                    >
                      <div className="desk-search-item-top">
                        <strong>{post.title}</strong>
                        <span className="desk-search-cat-tag">
                          {getCategoryLabel(post.category, language)}
                        </span>
                      </div>
                      <p className="desk-search-item-body">{post.body}</p>
                      <small className="desk-search-item-meta">
                        {author.displayName} ·{" "}
                        {formatFriendlyTime(post.createdAt, language)}
                      </small>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <>
          <MoodChips
            selectedMood={selectedMood}
            onSelectMood={setSelectedMood}
            language={language}
          />

          {listMode ? (
            /* Accessible High-Contrast List of Places */
            <div
              className="desk-accessible-list"
              role="list"
              aria-label={listSwitchLabel}
            >
              {categories.map((item) => {
                const title = getLandmarkTitle(item.category, language);
                const sub = getLandmarkSubtitle(item.category, language);
                const isSuggested =
                  Boolean(highlightedCategory) &&
                  highlightedCategory?.toLowerCase() ===
                    item.category.toLowerCase();

                return (
                  <button
                    key={item.category}
                    type="button"
                    role="listitem"
                    className={`desk-list-row ${isSuggested ? "is-highlighted" : ""}`}
                    onClick={() => {
                      triggerSubtleHaptic(8);
                      onSelectCategory(item.category);
                    }}
                  >
                    <span className="desk-list-thumb" aria-hidden="true">
                      <LandmarkArt
                        kind={item.landmarkKind}
                        categoryName={item.category}
                        size="mini"
                        animated={false}
                      />
                    </span>
                    <span className="desk-list-info">
                      <span className="desk-list-name">{title}</span>
                      <small className="desk-list-sub">
                        {sub} · {item.postCount}{" "}
                        {language === "Bahasa Melayu"
                          ? "siaran"
                          : language === "中文"
                            ? "篇"
                            : item.postCount === 1
                              ? "post"
                              : "posts"}
                      </small>
                    </span>
                    <span className="desk-list-right" aria-hidden="true">
                      {item.unseenCount > 0 && <span className="world-unseen-dot" />}
                      <svg viewBox="0 0 24 24" className="world-bar-svg">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Illustrated Floating Sanctuary Garden Canvas */
            <div
              ref={stageRef}
              className={`world-garden-stage ${zoomingCategory ? "is-zooming" : ""}`}
              style={{ transformOrigin: zoomOrigin }}
            >
              {/* Atmospheric Light/Dark Sky + Meadow Terraces SVG */}
              <div className="world-garden-backdrop" aria-hidden="true">
                <svg
                  viewBox="0 0 360 400"
                  preserveAspectRatio="xMidYMid slice"
                  className="world-garden-svg"
                  fill="none"
                >
                  <defs>
                    <linearGradient id="onyGardenSky" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="color-mix(in srgb, var(--theme-primary) 16%, var(--theme-surface-soft))"
                      />
                      <stop
                        offset="55%"
                        stopColor="color-mix(in srgb, var(--theme-accent) 12%, var(--theme-surface))"
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--theme-surface-elevated)"
                      />
                    </linearGradient>
                    <radialGradient id="onyGardenAurora" cx="62%" cy="18%" r="48%">
                      <stop
                        offset="0%"
                        stopColor="var(--theme-accent)"
                        stopOpacity="0.28"
                      />
                      <stop
                        offset="60%"
                        stopColor="var(--theme-primary)"
                        stopOpacity="0.14"
                      />
                      <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="onyIslandGrass" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="color-mix(in srgb, var(--theme-primary) 18%, var(--theme-surface))"
                      />
                      <stop
                        offset="100%"
                        stopColor="color-mix(in srgb, var(--theme-accent) 12%, var(--theme-surface-elevated))"
                      />
                    </linearGradient>
                  </defs>

                  <rect x="0" y="0" width="360" height="400" fill="url(#onyGardenSky)" />
                  <rect x="0" y="0" width="360" height="220" fill="url(#onyGardenAurora)" />

                  {/* Light-mode clouds & soft sun / Dark-mode moon & twinkling stars */}
                  <g className="world-sky-day">
                    <circle
                      cx="294"
                      cy="44"
                      r="18"
                      fill="color-mix(in srgb, var(--theme-accent) 55%, #fde68a)"
                      opacity="0.72"
                    />
                    <path
                      d="M42 54c0-7 6-12 13-12 3-7 13-9 19-3 6-1 12 4 12 10 4 1 7 5 7 9H40c-4 0-5-4 2-4Z"
                      fill="var(--theme-surface)"
                      opacity="0.78"
                    />
                    <path
                      d="M174 36c0-5 5-9 10-9 2-5 10-7 14-2 5-1 9 3 9 7 3 1 5 4 5 7h-38c-3 0-4-3 0-3Z"
                      fill="var(--theme-surface)"
                      opacity="0.62"
                    />
                  </g>

                  <g className="world-sky-night">
                    <path
                      d="M294 28a13 13 0 1 0 15 17A10.5 10.5 0 0 1 294 28Z"
                      fill="color-mix(in srgb, var(--theme-accent) 65%, #fef3c7)"
                    />
                    <circle cx="48" cy="32" r="1.8" fill="var(--theme-accent)" className="anim-twinkle" />
                    <circle cx="98" cy="48" r="1.4" fill="var(--theme-text-primary)" opacity="0.6" />
                    <circle cx="148" cy="24" r="1.6" fill="var(--theme-accent)" className="anim-twinkle" />
                    <circle cx="212" cy="44" r="1.5" fill="var(--theme-text-primary)" opacity="0.65" />
                    <circle cx="246" cy="20" r="1.7" fill="var(--theme-accent)" className="anim-twinkle" />
                    <circle cx="328" cy="64" r="1.5" fill="var(--theme-text-primary)" opacity="0.55" />
                  </g>

                  {/* Rolling misty hills in background */}
                  <path
                    d="M-10 150c58-34 114-28 172 0 54-26 118-24 208 4v96H-10v-100Z"
                    fill="color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface-soft))"
                  />

                  {/* Main Floating Garden Sanctuary Island */}
                  <path
                    d="M14 148c0-26 32-44 166-44s166 18 166 44v218c0 16-24 26-166 26S14 382 14 366V148Z"
                    fill="url(#onyIslandGrass)"
                    stroke="color-mix(in srgb, var(--theme-border) 80%, transparent)"
                    strokeWidth="2"
                  />

                  {/* Soft stepping stone winding path */}
                  <path
                    d="M84 168c58 26 142 18 190 54s-142 62-186 98 110 38 176 48"
                    stroke="color-mix(in srgb, var(--theme-surface) 72%, var(--theme-border))"
                    strokeWidth="18"
                    strokeLinecap="round"
                    strokeDasharray="2 22"
                    opacity="0.7"
                  />

                  {/* Subtle corner botanical tufts */}
                  <circle cx="34" cy="198" r="9" fill="color-mix(in srgb, var(--theme-primary) 16%, transparent)" />
                  <circle cx="326" cy="226" r="10" fill="color-mix(in srgb, var(--theme-accent) 18%, transparent)" />
                  <circle cx="42" cy="340" r="8" fill="color-mix(in srgb, var(--theme-accent) 16%, transparent)" />

                  {/* Calm floating fireflies */}
                  <circle cx="118" cy="140" r="2.2" fill="var(--theme-accent)" className="world-firefly f1" />
                  <circle cx="248" cy="196" r="2" fill="var(--theme-primary)" className="world-firefly f2" />
                  <circle cx="164" cy="288" r="2.2" fill="var(--theme-accent)" className="world-firefly f3" />
                </svg>
              </div>

              {/* Dynamic Terraced Landmarks Layout (no overlap at 360px or high font scale) */}
              <div className="world-landmarks-scroll">
                <div className="world-terrace-row">
                  {topRow.map((item) => {
                    const isHighlighted =
                      Boolean(highlightedCategory) &&
                      highlightedCategory?.toLowerCase() ===
                        item.category.toLowerCase();
                    const isDimmed =
                      Boolean(highlightedCategory) && !isHighlighted;
                    return (
                      <Landmark
                        key={item.category}
                        item={item}
                        language={language}
                        isHighlighted={isHighlighted}
                        isDimmed={isDimmed}
                        isZoomingOut={zoomingCategory === item.category}
                        reducedMotion={reducedMotion}
                        onSelect={handleLandmarkTap}
                      />
                    );
                  })}
                </div>

                {midRow.length > 0 && (
                  <div className="world-terrace-row is-staggered">
                    {midRow.map((item) => {
                      const isHighlighted =
                        Boolean(highlightedCategory) &&
                        highlightedCategory?.toLowerCase() ===
                          item.category.toLowerCase();
                      const isDimmed =
                        Boolean(highlightedCategory) && !isHighlighted;
                      return (
                        <Landmark
                          key={item.category}
                          item={item}
                          language={language}
                          isHighlighted={isHighlighted}
                          isDimmed={isDimmed}
                          isZoomingOut={zoomingCategory === item.category}
                          reducedMotion={reducedMotion}
                          onSelect={handleLandmarkTap}
                        />
                      );
                    })}
                  </div>
                )}

                {bottomRow.length > 0 && (
                  <div className="world-terrace-row">
                    {bottomRow.map((item) => {
                      const isHighlighted =
                        Boolean(highlightedCategory) &&
                        highlightedCategory?.toLowerCase() ===
                          item.category.toLowerCase();
                      const isDimmed =
                        Boolean(highlightedCategory) && !isHighlighted;
                      return (
                        <Landmark
                          key={item.category}
                          item={item}
                          language={language}
                          isHighlighted={isHighlighted}
                          isDimmed={isDimmed}
                          isZoomingOut={zoomingCategory === item.category}
                          reducedMotion={reducedMotion}
                          onSelect={handleLandmarkTap}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Calm Bottom Invitation Strip: Quote + Accessible Places Switch + "Surprise me" */}
          <div className="world-bottom-cta-card">
            <div className="world-bottom-cta-copy">
              <p className="world-bottom-cta-text">{bottomPrompt}</p>
              <button
                type="button"
                className="world-list-switch-link"
                onClick={handleToggleListMode}
                aria-pressed={listMode}
              >
                {listSwitchLabel}
              </button>
            </div>
            <button
              type="button"
              className="world-surprise-btn"
              onClick={handleSurpriseMe}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="world-bar-svg">
                <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
              </svg>
              <span>{surpriseLabel}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default CommunityWorldScene;
