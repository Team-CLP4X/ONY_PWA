import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FirestoreCommunityPost } from "../../firebase/firestore";
import { getCategoryLabel, type AppLanguage } from "../../i18n/translations";
import type { PostsViewMode } from "../../theme/ThemeContext";
import {
  prefersReducedMotion,
  type SupportiveReactionType,
} from "../../utils/communityPostHelpers";
import { CaughtUpCard } from "./CaughtUpCard";
import { PostCard } from "./PostCard";
import { PostListCard } from "./PostListCard";

export interface PostFeedNavSignal {
  action: "prev" | "next" | "refresh";
  seq: number;
}

export interface PostFeedProps {
  posts: FirestoreCommunityPost[];
  selectedCategory: string;
  viewMode: PostsViewMode;
  loading: boolean;
  hasSearchQuery: boolean;
  currentUid: string;
  currentUserName: string;
  savedPostIds: Set<string>;
  navSignal?: PostFeedNavSignal | null;
  onActiveStateChange?: (state: {
    activeIndex: number;
    canPrev: boolean;
    canNext: boolean;
  }) => void;
  onScrollCollapseChange?: (collapsed: boolean) => void;
  onPostViewed?: (postId: string) => void;
  onOpenPostDetail?: (post: FirestoreCommunityPost) => void;
  onSelectReaction: (postId: string, reaction: SupportiveReactionType) => void;
  onOpenComments: (postId: string) => void;
  onSaveToVault: (post: FirestoreCommunityPost) => void;
  onReportPost: (post: FirestoreCommunityPost) => void;
  onHidePost: (postId: string) => void;
  onOpenHelp: () => void;
  onCreatePost: () => void;
  onResetSearch: () => void;
  onRefresh: () => Promise<void>;
  onLoadMore?: () => void;
  notify: (msg: string) => void;
  language: AppLanguage;
}

const VIRTUAL_OVERSCAN = 3;

export function PostFeed({
  posts,
  selectedCategory,
  viewMode,
  loading,
  hasSearchQuery,
  currentUid,
  currentUserName,
  savedPostIds,
  navSignal,
  onActiveStateChange,
  onScrollCollapseChange,
  onPostViewed,
  onOpenPostDetail,
  onSelectReaction,
  onOpenComments,
  onSaveToVault,
  onReportPost,
  onHidePost,
  onOpenHelp,
  onCreatePost,
  onResetSearch,
  onRefresh,
  onLoadMore,
  notify,
  language,
}: PostFeedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slotHeight, setSlotHeight] = useState(460);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [visibleListCount, setVisibleListCount] = useState(14);
  const [reducedMotion, setReducedMotion] = useState(() => prefersReducedMotion());

  const touchStartYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const lastHandledNavSeqRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || viewMode !== "feed") return;
    const measure = () => {
      const h = el.clientHeight;
      if (h > 120) {
        setSlotHeight(Math.max(260, h - 20));
      }
    };
    measure();
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [viewMode, posts.length]);

  useEffect(() => {
    setActiveIndex(0);
    setVisibleListCount(14);
    onScrollCollapseChange?.(false);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [viewMode, selectedCategory, posts.length === 0, onScrollCollapseChange]);

  const totalItems = posts.length + 1;

  const clampIndex = useCallback(
    (idx: number) => Math.max(0, Math.min(totalItems - 1, idx)),
    [totalItems],
  );

  useEffect(() => {
    onActiveStateChange?.({
      activeIndex,
      canPrev: activeIndex > 0,
      canNext: activeIndex < totalItems - 1,
    });
  }, [activeIndex, totalItems, onActiveStateChange]);

  useEffect(() => {
    if (!onPostViewed || posts.length === 0) return;
    if (viewMode === "feed") {
      const p = posts[activeIndex];
      if (p) onPostViewed(p.id);
    } else {
      posts.slice(0, visibleListCount).forEach((p) => onPostViewed(p.id));
    }
  }, [activeIndex, posts, viewMode, visibleListCount, onPostViewed]);

  useEffect(() => {
    if (posts.length > 0 && activeIndex >= posts.length - 3 && onLoadMore) {
      onLoadMore();
    }
  }, [activeIndex, posts.length, onLoadMore]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    onScrollCollapseChange?.(el.scrollTop > 36);

    if (viewMode === "feed" && slotHeight > 0) {
      const nextIdx = clampIndex(Math.round(el.scrollTop / slotHeight));
      setActiveIndex((prev) => (prev !== nextIdx ? nextIdx : prev));
    } else if (viewMode === "list") {
      if (
        el.scrollTop + el.clientHeight >= el.scrollHeight - 240 &&
        visibleListCount < posts.length
      ) {
        setVisibleListCount((prev) => Math.min(posts.length, prev + 10));
      }
    }
  }, [
    viewMode,
    slotHeight,
    clampIndex,
    visibleListCount,
    posts.length,
    onScrollCollapseChange,
  ]);

  const scrollToIndex = useCallback(
    (targetIdx: number) => {
      const el = containerRef.current;
      const clamped = clampIndex(targetIdx);
      setActiveIndex(clamped);
      if (!el) return;
      el.scrollTo({
        top: clamped * slotHeight,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    },
    [clampIndex, slotHeight, reducedMotion],
  );

  const handleBackToTop = useCallback(() => {
    if (viewMode === "feed") {
      scrollToIndex(0);
    } else if (containerRef.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    }
  }, [viewMode, scrollToIndex, reducedMotion]);

  const triggerRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }, [refreshing, onRefresh]);

  useEffect(() => {
    if (!navSignal || navSignal.seq === lastHandledNavSeqRef.current) return;
    lastHandledNavSeqRef.current = navSignal.seq;
    if (navSignal.action === "prev") {
      scrollToIndex(activeIndex - 1);
    } else if (navSignal.action === "next") {
      scrollToIndex(activeIndex + 1);
    } else if (navSignal.action === "refresh") {
      void triggerRefresh();
    }
  }, [navSignal, activeIndex, scrollToIndex, triggerRefresh]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 4 || refreshing) {
      touchStartYRef.current = null;
      return;
    }
    touchStartYRef.current = e.touches[0].clientY;
    pullingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pullingRef.current || touchStartYRef.current === null) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 4) {
      pullingRef.current = false;
      setPullDistance(0);
      return;
    }
    const delta = e.touches[0].clientY - touchStartYRef.current;
    if (delta > 0) {
      setPullDistance(Math.min(72, Math.round(delta * 0.45)));
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (pullingRef.current && pullDistance >= 48) {
      void triggerRefresh();
    } else {
      setPullDistance(0);
    }
    pullingRef.current = false;
    touchStartYRef.current = null;
  };

  const windowRange = useMemo(() => {
    const start = Math.max(0, activeIndex - VIRTUAL_OVERSCAN);
    const end = Math.min(totalItems - 1, activeIndex + VIRTUAL_OVERSCAN);
    return { start, end };
  }, [activeIndex, totalItems]);

  const refreshLabel = refreshing
    ? language === "Bahasa Melayu"
      ? "Menyegar semula…"
      : language === "中文"
        ? "正在刷新…"
        : "Refreshing…"
    : pullDistance >= 48
      ? language === "Bahasa Melayu"
        ? "Lepaskan untuk muat semula"
        : language === "中文"
          ? "松开即可刷新"
          : "Release to refresh"
      : language === "Bahasa Melayu"
        ? "Tarik untuk muat semula"
        : language === "中文"
          ? "下拉刷新动态"
          : "Pull to refresh";

  if (loading && posts.length === 0) {
    return (
      <div className="post-feed-shell">
        <div
          className="post-feed-skeleton"
          aria-busy="true"
          aria-label={
            language === "Bahasa Melayu"
              ? "Memuatkan siaran komuniti"
              : language === "中文"
                ? "正在加载社区帖子"
                : "Loading community posts"
          }
        >
          <div className="skeleton-head">
            <span className="skeleton-circle" />
            <div className="skeleton-lines">
              <span className="skeleton-line w-40" />
              <span className="skeleton-line w-28" />
            </div>
          </div>
          <span className="skeleton-line w-85 h-lg" />
          <span className="skeleton-line w-100" />
          <span className="skeleton-line w-92" />
          <span className="skeleton-line w-70" />
          <div className="skeleton-footer">
            <span className="skeleton-pill" />
            <span className="skeleton-pill" />
          </div>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    const catLabel = getCategoryLabel(selectedCategory, language);
    const emptyTitle = hasSearchQuery
      ? language === "Bahasa Melayu"
        ? "Tiada siaran sepadan dengan carian anda."
        : language === "中文"
          ? "暂无符合搜索条件的帖子。"
          : "No stories match your search."
      : selectedCategory && selectedCategory !== "All"
        ? language === "Bahasa Melayu"
          ? `Belum ada cerita dalam ${catLabel} lagi. Jadilah yang pertama berkongsi.`
          : language === "中文"
            ? `「${catLabel}」还没有故事，来做第一个分享的人吧。`
            : `No stories here yet. Be the first to share.`
        : language === "Bahasa Melayu"
          ? "Belum ada cerita di sini lagi. Jadilah yang pertama berkongsi."
          : language === "中文"
            ? "这里还没有故事，来做第一个分享的人吧。"
            : "No stories here yet. Be the first to share.";

    const createLabel =
      language === "Bahasa Melayu"
        ? "Tulis cerita"
        : language === "中文"
          ? "写下第一篇分享"
          : "Share a story";

    const resetLabel =
      language === "Bahasa Melayu"
        ? "Kosongkan carian"
        : language === "中文"
          ? "清除搜索"
          : "Clear search";

    return (
      <div className="post-feed-shell">
        <div className="post-feed-empty-state">
          <span className="post-empty-emoji" aria-hidden="true">
            🌱
          </span>
          <h3>{emptyTitle}</h3>
          <div className="post-empty-actions">
            <button
              type="button"
              className="caught-up-btn primary"
              onClick={onCreatePost}
            >
              {createLabel}
            </button>
            {hasSearchQuery && (
              <button
                type="button"
                className="caught-up-btn secondary"
                onClick={onResetSearch}
              >
                {resetLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT LIST VIEW MODE: Clean PostListCard stream matching Screenshot 5
  if (viewMode === "list") {
    const slicedPosts = posts.slice(0, visibleListCount);
    return (
      <div className="post-feed-list-wrap">
        {(pullDistance > 8 || refreshing) && (
          <div
            className="post-pull-refresh-pill"
            style={{
              transform: `translate(-50%, ${Math.min(18, Math.round(pullDistance * 0.25))}px)`,
            }}
            aria-live="polite"
          >
            <span className={refreshing ? "pull-spin" : ""} aria-hidden="true">
              ↻
            </span>
            <span>{refreshLabel}</span>
          </div>
        )}

        <div
          ref={containerRef}
          className="post-list-scroll"
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {slicedPosts.map((post) => (
            <PostListCard
              key={post.id}
              post={post}
              currentUid={currentUid}
              currentUserName={currentUserName}
              isSaved={savedPostIds.has(post.id)}
              onOpenPost={(p) => {
                onPostViewed?.(p.id);
                if (onOpenPostDetail) {
                  onOpenPostDetail(p);
                } else {
                  onOpenComments(p.id);
                }
              }}
              onSelectReaction={onSelectReaction}
              onOpenComments={onOpenComments}
              onSaveToVault={onSaveToVault}
              onReportPost={onReportPost}
              onHidePost={onHidePost}
              notify={notify}
            />
          ))}

          {visibleListCount < posts.length && (
            <button
              type="button"
              className="post-load-more-btn"
              onClick={() =>
                setVisibleListCount((prev) => Math.min(posts.length, prev + 10))
              }
            >
              {language === "Bahasa Melayu"
                ? "Muat lagi siaran"
                : language === "中文"
                  ? "加载更多动态"
                  : "Load more stories"}
            </button>
          )}

          <CaughtUpCard
            variant="list"
            onCreatePost={onCreatePost}
            onBackToTop={handleBackToTop}
            language={language}
          />
        </div>
      </div>
    );
  }

  // FOCUS CARDS (SNAP-SCROLL) VIEW MODE
  const displayPostPos = Math.min(activeIndex + 1, posts.length);
  const edgeText =
    activeIndex < posts.length
      ? `${displayPostPos} / ${posts.length}`
      : language === "Bahasa Melayu"
        ? "Tamat"
        : language === "中文"
          ? "完"
          : "Done";

  const dotCount = Math.min(totalItems, 7);
  const activeDotIndex =
    totalItems <= 7
      ? activeIndex
      : Math.round((activeIndex / Math.max(1, totalItems - 1)) * (dotCount - 1));

  return (
    <div className="post-feed-shell">
      {(pullDistance > 8 || refreshing) && (
        <div
          className="post-pull-refresh-pill"
          style={{
            transform: `translate(-50%, ${Math.min(18, Math.round(pullDistance * 0.25))}px)`,
          }}
          aria-live="polite"
        >
          <span className={refreshing ? "pull-spin" : ""} aria-hidden="true">
            ↻
          </span>
          <span>{refreshLabel}</span>
        </div>
      )}

      <div className="post-edge-counter-pill" aria-live="polite">
        {edgeText}
      </div>

      {totalItems > 1 && (
        <div className="post-edge-dots" aria-hidden="true">
          {Array.from({ length: dotCount }).map((_, idx) => (
            <span
              key={idx}
              className={`post-edge-dot ${idx === activeDotIndex ? "active" : ""}`}
            />
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        className={`post-feed-snap-viewport ${reducedMotion ? "reduced-motion" : ""}`}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "PageDown") {
            e.preventDefault();
            scrollToIndex(activeIndex + 1);
          } else if (e.key === "ArrowUp" || e.key === "PageUp") {
            e.preventDefault();
            scrollToIndex(activeIndex - 1);
          }
        }}
        aria-label={
          language === "Bahasa Melayu"
            ? "Suapan siaran komuniti"
            : language === "中文"
              ? "社区卡片动态流"
              : "Community stories feed"
        }
      >
        {Array.from({ length: totalItems }).map((_, index) => {
          const isRendered =
            index >= windowRange.start && index <= windowRange.end;
          const isCaughtUp = index === posts.length;
          const post = !isCaughtUp ? posts[index] : null;

          return (
            <div
              key={post ? post.id : "caught_up_card"}
              className="post-snap-slot"
              style={{ height: `${slotHeight}px` }}
            >
              {isRendered ? (
                isCaughtUp ? (
                  <CaughtUpCard
                    variant="feed"
                    onCreatePost={onCreatePost}
                    onBackToTop={handleBackToTop}
                    language={language}
                  />
                ) : post ? (
                  <PostCard
                    post={post}
                    variant="feed"
                    currentUid={currentUid}
                    currentUserName={currentUserName}
                    isSaved={savedPostIds.has(post.id)}
                    onSelectReaction={onSelectReaction}
                    onOpenComments={onOpenComments}
                    onSaveToVault={onSaveToVault}
                    onReportPost={onReportPost}
                    onHidePost={onHidePost}
                    onOpenHelp={onOpenHelp}
                    notify={notify}
                  />
                ) : null
              ) : (
                <div className="post-snap-placeholder" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PostFeed;
