import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AppLanguage } from "../../i18n/translations";
import type { PostsViewMode } from "../../theme/ThemeContext";
import {
  getLandmarkSubtitle,
  getLandmarkTitle,
  type CategorySortTab,
  type SubtopicFilterId,
  type WorldCategoryItem,
} from "../../utils/communityPostHelpers";
import { LandmarkArt } from "./Landmark";

export interface CategoryHeaderProps {
  selectedCategory: string;
  categories: WorldCategoryItem[];
  filteredCount: number;
  activeSortTab: CategorySortTab;
  subtopicFilter: SubtopicFilterId;
  viewMode: PostsViewMode;
  heroCollapsed: boolean;
  searchOpen: boolean;
  searchQuery: string;
  onBackToGarden: () => void;
  onSelectCategory: (category: string) => void;
  onChangeSortTab: (tab: CategorySortTab) => void;
  onChangeSubtopic: (subtopic: SubtopicFilterId) => void;
  onChangeViewMode: (mode: PostsViewMode) => void;
  onToggleSearch: () => void;
  onSearchChange: (value: string) => void;
  onCreatePost: () => void;
  onRefresh: () => void;
  language: AppLanguage;
}

export function CategoryHeader({
  selectedCategory,
  categories,
  filteredCount,
  activeSortTab,
  subtopicFilter,
  viewMode,
  heroCollapsed,
  searchOpen,
  searchQuery,
  onBackToGarden,
  onSelectCategory,
  onChangeSortTab,
  onChangeSubtopic,
  onChangeViewMode,
  onToggleSearch,
  onSearchChange,
  onCreatePost,
  onRefresh,
  language,
}: CategoryHeaderProps) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [switcherPos, setSwitcherPos] = useState<{
    top: number;
    left: number;
    width: number;
  }>({ top: 76, left: 16, width: 244 });

  const switcherBtnRef = useRef<HTMLButtonElement | null>(null);
  const switcherMenuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (searchOpen) {
      window.setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!switcherOpen && !filterSheetOpen) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        switcherOpen &&
        !switcherBtnRef.current?.contains(target) &&
        !switcherMenuRef.current?.contains(target)
      ) {
        setSwitcherOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSwitcherOpen(false);
        setFilterSheetOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [switcherOpen, filterSheetOpen]);

  const activeItem =
    categories.find(
      (c) => c.category.toLowerCase() === selectedCategory.toLowerCase(),
    ) || categories[0];

  const landmarkTitle = getLandmarkTitle(selectedCategory, language);
  const landmarkSubtitle = getLandmarkSubtitle(selectedCategory, language);

  const openSwitcher = () => {
    setFilterSheetOpen(false);
    if (switcherOpen) {
      setSwitcherOpen(false);
      return;
    }
    if (switcherBtnRef.current && typeof window !== "undefined") {
      const rect = switcherBtnRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const desiredW = Math.min(264, vw - 24);
      const left = Math.max(12, Math.min(rect.left, vw - desiredW - 12));
      setSwitcherPos({
        top: rect.bottom + 6,
        left,
        width: desiredW,
      });
    }
    setSwitcherOpen(true);
  };

  const postsStatLabel =
    language === "Bahasa Melayu"
      ? "siaran"
      : language === "中文"
        ? "篇分享"
        : (activeItem?.postCount ?? filteredCount) === 1
          ? "story"
          : "stories";

  const warmthCount =
    (activeItem?.reactionTotal ?? 0) + (activeItem?.commentTotal ?? 0);

  const warmthStatLabel =
    language === "Bahasa Melayu"
      ? "pelukan & nota"
      : language === "中文"
        ? "次温暖回应"
        : warmthCount === 1
          ? "kind note"
          : "hugs & notes";

  const searchPlaceholder =
    language === "Bahasa Melayu"
      ? "Cari dalam sudut ini…"
      : language === "中文"
        ? "搜索本角落分享…"
        : "Search stories here…";

  const sortTabs: { id: CategorySortTab; label: string }[] = [
    {
      id: "forYou",
      label:
        language === "Bahasa Melayu"
          ? "Untuk Anda"
          : language === "中文"
            ? "为你推荐"
            : "For You",
    },
    {
      id: "latest",
      label:
        language === "Bahasa Melayu"
          ? "Terkini"
          : language === "中文"
            ? "最新"
            : "Latest",
    },
    {
      id: "popular",
      label:
        language === "Bahasa Melayu"
          ? "Popular"
          : language === "中文"
            ? "热门"
            : "Popular",
    },
  ];

  const subtopicOptions: { id: SubtopicFilterId; label: string; desc: string }[] = [
    {
      id: "all",
      label:
        language === "Bahasa Melayu"
          ? "Semua Topik"
          : language === "中文"
            ? "全部主题"
            : "All Topics",
      desc:
        language === "Bahasa Melayu"
          ? "Tunjukkan semua perkongsian di sudut ini"
          : language === "中文"
            ? "展示当前区域的所有分享"
            : "Show every story in this corner",
    },
    {
      id: "voice",
      label:
        language === "Bahasa Melayu"
          ? "Nota Suara"
          : language === "中文"
            ? "语音分享"
            : "Voice Notes",
      desc:
        language === "Bahasa Melayu"
          ? "Siaran dengan rakaman suara lembut"
          : language === "中文"
            ? "带有语音倾诉的分享"
            : "Stories shared with gentle voice recordings",
    },
    {
      id: "quiet",
      label:
        language === "Bahasa Melayu"
          ? "Sudut Tenang"
          : language === "中文"
            ? "安静角落"
            : "Needs Company",
      desc:
        language === "Bahasa Melayu"
          ? "Siaran baharu yang belum banyak balasan"
          : language === "中文"
            ? "刚发布、等待温暖回应的帖子"
            : "Fresh notes waiting for a kind reply",
    },
    {
      id: "discussed",
      label:
        language === "Bahasa Melayu"
          ? "Perbualan Aktif"
          : language === "中文"
            ? "热烈交流"
            : "Active Talks",
      desc:
        language === "Bahasa Melayu"
          ? "Siaran dengan perbincangan komuniti"
          : language === "中文"
            ? "已有较多互动与陪伴讨论的分享"
            : "Posts with ongoing supportive conversations",
    },
  ];

  return (
    <div className="category-header-root">
      {/* 1. Compact Navigation Top Bar */}
      <div className="category-nav-bar">
        <button
          type="button"
          className="feed-header-icon-btn"
          onClick={onBackToGarden}
          aria-label={
            language === "Bahasa Melayu"
              ? "Kembali ke Taman Komuniti"
              : language === "中文"
                ? "返回心灵花园"
                : "Back to Community Garden"
          }
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="feed-header-svg">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>

        <button
          ref={switcherBtnRef}
          type="button"
          className="category-title-switcher"
          onClick={openSwitcher}
          aria-haspopup="menu"
          aria-expanded={switcherOpen}
        >
          {activeItem && (
            <span className="feed-header-mini-art" aria-hidden="true">
              <LandmarkArt
                kind={activeItem.landmarkKind}
                categoryName={activeItem.category}
                size="mini"
                animated={false}
              />
            </span>
          )}
          <span className="category-title-stack">
            <span className="category-title-main">{landmarkTitle}</span>
            <span className="category-title-sub">{filteredCount} {postsStatLabel}</span>
          </span>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="feed-header-chevron">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <div className="feed-header-right">
          <button
            type="button"
            className={`feed-header-icon-btn ${searchOpen || searchQuery ? "active" : ""}`}
            onClick={onToggleSearch}
            aria-expanded={searchOpen}
            aria-label={searchPlaceholder}
          >
            {searchOpen ? (
              <svg viewBox="0 0 24 24" aria-hidden="true" className="feed-header-svg">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true" className="feed-header-svg">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className="feed-header-icon-btn category-plus-btn"
            onClick={onCreatePost}
            aria-label={
              language === "Bahasa Melayu"
                ? `Tulis siaran dalam ${landmarkTitle}`
                : language === "中文"
                  ? `在「${landmarkTitle}」发布分享`
                  : `Create post in ${landmarkTitle}`
            }
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="feed-header-svg">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable Search Bar */}
      {searchOpen && (
        <div className="posts-search-expandable">
          <div className="posts-search-field">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="feed-header-svg">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
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
                <svg viewBox="0 0 24 24" aria-hidden="true" className="feed-header-svg">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Collapsible Compact Hero Banner (< 25% viewport height) */}
      <div className={`category-hero-banner ${heroCollapsed ? "is-collapsed" : ""}`}>
        <div className="category-hero-copy">
          <p className="category-hero-desc">{landmarkSubtitle}</p>
          <div className="category-hero-stats">
            <div className="category-hero-stat">
              <strong>{activeItem?.postCount ?? filteredCount}</strong>
              <span>{postsStatLabel}</span>
            </div>
            <span className="category-hero-stat-sep" aria-hidden="true" />
            <div className="category-hero-stat">
              <strong>{warmthCount}</strong>
              <span>{warmthStatLabel}</span>
            </div>
          </div>
        </div>

        {activeItem && (
          <div className="category-hero-art" aria-hidden="true">
            <LandmarkArt
              kind={activeItem.landmarkKind}
              categoryName={activeItem.category}
              size="hero"
              animated={false}
            />
          </div>
        )}
      </div>

      {/* 3. Slim Tab Row (For You / Latest / Popular) + Sub-topic Filter Icon */}
      <div className="category-tabs-bar">
        <div className="category-sort-tabs" role="tablist" aria-label="Sort posts">
          {sortTabs.map((tab) => {
            const active = activeSortTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`category-sort-tab ${active ? "active" : ""}`}
                onClick={() => onChangeSortTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={`category-filter-trigger ${subtopicFilter !== "all" || filterSheetOpen ? "active" : ""}`}
          onClick={() => setFilterSheetOpen(true)}
          aria-label={
            language === "Bahasa Melayu"
              ? "Tapis topik & paparan"
              : language === "中文"
                ? "筛选主题与浏览模式"
                : "Filter topics & layout"
          }
          title={
            language === "Bahasa Melayu"
              ? "Tapis & paparan"
              : language === "中文"
                ? "筛选"
                : "Filter"
          }
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="feed-header-svg">
            <path d="M4 7h16M7 12h10M10 17h4" />
          </svg>
          {subtopicFilter !== "all" && <span className="filter-active-dot" />}
        </button>
      </div>

      {/* Portal Dropdown: Quick Category Switcher */}
      {switcherOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={switcherMenuRef}
            className="ony-portal-menu category-switcher-portal"
            role="menu"
            style={{
              top: `${switcherPos.top}px`,
              left: `${switcherPos.left}px`,
              width: `${switcherPos.width}px`,
            }}
          >
            {categories.map((catItem) => {
              const isSelected =
                catItem.category.toLowerCase() === selectedCategory.toLowerCase();
              return (
                <button
                  key={catItem.category}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  className={`ony-portal-menu-item ${isSelected ? "is-selected" : ""}`}
                  onClick={() => {
                    setSwitcherOpen(false);
                    onSelectCategory(catItem.category);
                  }}
                >
                  <span className="ony-portal-menu-icon" aria-hidden="true">
                    <LandmarkArt
                      kind={catItem.landmarkKind}
                      categoryName={catItem.category}
                      size="mini"
                      animated={false}
                    />
                  </span>
                  <span className="ony-portal-menu-label">
                    {getLandmarkTitle(catItem.category, language)}
                  </span>
                  <span className="ony-portal-menu-meta">
                    {catItem.unseenCount > 0 && <span className="world-unseen-dot" />}
                    <span>{catItem.postCount}</span>
                  </span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}

      {/* Portal Bottom Sheet: Sub-topic Filter & Layout Switch */}
      {filterSheetOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="report-sheet-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setFilterSheetOpen(false);
            }}
          >
            <div
              className="report-reason-sheet subtopic-filter-sheet"
              role="dialog"
              aria-modal="true"
              aria-label={
                language === "Bahasa Melayu"
                  ? "Tapis & Paparan"
                  : language === "中文"
                    ? "筛选与浏览方式"
                    : "Filter & Layout"
              }
            >
              <div className="comment-sheet-handle" aria-hidden="true" />
              <div className="report-sheet-head">
                <div>
                  <h3>
                    {language === "Bahasa Melayu"
                      ? "Tapis perkongsian"
                      : language === "中文"
                        ? "筛选这个角落"
                        : "Filter this corner"}
                  </h3>
                  <p>
                    {language === "Bahasa Melayu"
                      ? "Pilih jenis nota atau gaya paparan"
                      : language === "中文"
                        ? "按内容类型筛选或切换阅读布局"
                        : "Narrow by story type or switch layout"}
                  </p>
                </div>
                <button
                  type="button"
                  className="comment-sheet-close-btn"
                  onClick={() => setFilterSheetOpen(false)}
                  aria-label="Close"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
                    <path d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              <div className="report-reason-list" role="radiogroup">
                {subtopicOptions.map((opt) => {
                  const active = subtopicFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`report-reason-option ${active ? "active" : ""}`}
                      onClick={() => {
                        onChangeSubtopic(opt.id);
                        setFilterSheetOpen(false);
                      }}
                    >
                      <span className="report-radio-dot" aria-hidden="true" />
                      <span className="subtopic-option-copy">
                        <strong>{opt.label}</strong>
                        <small>{opt.desc}</small>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="subtopic-layout-row">
                <span className="subtopic-layout-label">
                  {language === "Bahasa Melayu"
                    ? "Gaya paparan"
                    : language === "中文"
                      ? "阅读布局"
                      : "Reading layout"}
                </span>
                <div className="subtopic-layout-btns">
                  <button
                    type="button"
                    className={`subtopic-layout-btn ${viewMode === "list" ? "active" : ""}`}
                    onClick={() => {
                      onChangeViewMode("list");
                      setFilterSheetOpen(false);
                    }}
                  >
                    {language === "Bahasa Melayu"
                      ? "Senarai"
                      : language === "中文"
                        ? "列表"
                        : "List"}
                  </button>
                  <button
                    type="button"
                    className={`subtopic-layout-btn ${viewMode === "feed" ? "active" : ""}`}
                    onClick={() => {
                      onChangeViewMode("feed");
                      setFilterSheetOpen(false);
                    }}
                  >
                    {language === "Bahasa Melayu"
                      ? "Kad penuh"
                      : language === "中文"
                        ? "卡片流"
                        : "Focus cards"}
                  </button>
                  <button
                    type="button"
                    className="subtopic-layout-btn"
                    onClick={() => {
                      onRefresh();
                      setFilterSheetOpen(false);
                    }}
                  >
                    {language === "Bahasa Melayu"
                      ? "Segar semula"
                      : language === "中文"
                        ? "刷新"
                        : "Refresh"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default CategoryHeader;
