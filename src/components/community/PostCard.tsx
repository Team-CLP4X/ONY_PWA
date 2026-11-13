import { useEffect, useMemo, useRef, useState } from "react";
import type { FirestoreCommunityPost } from "../../firebase/firestore";
import { useLanguage } from "../../i18n/LanguageContext";
import { formatFriendlyTime, getCategoryLabel } from "../../i18n/translations";
import {
  getCachedPostTranslation,
  translateCommunityPost,
} from "../../services/communityTranslationService";
import { SupportiveMessageBubble } from "../SupportiveMessageBubble";
import {
  computePostReactionSummary,
  containsCrisisLanguage,
  detectPostLanguage,
  getCategoryThemeClass,
  parseAuthorDisplay,
  prefersReducedMotion,
  triggerSubtleHaptic,
  type SupportiveReactionType,
} from "../../utils/communityPostHelpers";
import { PostMenu } from "./PostMenu";
import { ReactionBar } from "./ReactionBar";

export interface PostCardProps {
  post: FirestoreCommunityPost;
  variant: "feed" | "list";
  currentUid: string;
  currentUserName: string;
  isSaved: boolean;
  onSelectReaction: (postId: string, reaction: SupportiveReactionType) => void;
  onOpenComments: (postId: string) => void;
  onSaveToVault: (post: FirestoreCommunityPost) => void;
  onReportPost: (post: FirestoreCommunityPost) => void;
  onHidePost: (postId: string) => void;
  onOpenHelp: () => void;
  notify: (msg: string) => void;
}

interface FloatingHeartItem {
  id: number;
  xOffset: number;
}

export function PostCard({
  post,
  variant,
  currentUid,
  currentUserName,
  isSaved,
  onSelectReaction,
  onOpenComments,
  onSaveToVault,
  onReportPost,
  onHidePost,
  onOpenHelp,
  notify,
}: PostCardProps) {
  const { t, language } = useLanguage();

  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<{
    translatedTitle: string;
    translatedBody: string;
  } | null>(() => getCachedPostTranslation(post.id, language));
  const [isTranslating, setIsTranslating] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeartItem[]>([]);

  const lastTapTimeRef = useRef<number>(0);

  // Sync cached translation if language changes
  useEffect(() => {
    const cached = getCachedPostTranslation(post.id, language);
    setTranslatedContent(cached);
    setShowTranslation(false);
  }, [post.id, language]);

  const detectedLanguage = useMemo(
    () => detectPostLanguage(post.title, post.body),
    [post.title, post.body],
  );
  const shouldOfferTranslate = detectedLanguage !== language || showTranslation;
  const hasCrisisKeywords = useMemo(
    () => containsCrisisLanguage(post.title, post.body),
    [post.title, post.body],
  );
  const authorInfo = useMemo(() => parseAuthorDisplay(post.author), [post.author]);
  const reactionSummary = useMemo(
    () => computePostReactionSummary(post, currentUid, currentUserName),
    [post, currentUid, currentUserName],
  );
  const commentCount = Array.isArray(post.comments) ? post.comments.length : 0;
  const categoryClass = getCategoryThemeClass(post.category);

  const displayTitle =
    showTranslation && translatedContent ? translatedContent.translatedTitle : post.title;
  const displayBody =
    showTranslation && translatedContent ? translatedContent.translatedBody : post.body;

  const handleToggleTranslation = async () => {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }
    if (translatedContent) {
      setShowTranslation(true);
      return;
    }
    setIsTranslating(true);
    try {
      const result = await translateCommunityPost(
        { id: post.id, title: post.title, body: post.body },
        language,
      );
      setTranslatedContent(result);
      setShowTranslation(true);
      notify(
        language === "Bahasa Melayu"
          ? "Siaran diterjemahkan ke Bahasa Melayu"
          : language === "中文"
            ? "帖子已翻译为中文"
            : "Post translated to English",
      );
    } catch {
      notify(
        language === "Bahasa Melayu"
          ? "Gagal menterjemah siaran"
          : language === "中文"
            ? "翻译未能完成"
            : "Could not translate post",
      );
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopyPost = async () => {
    const fullText = `${displayTitle}\n\n${displayBody}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullText);
      } else {
        const ta = document.createElement("textarea");
        ta.value = fullText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      notify(
        language === "Bahasa Melayu"
          ? "Teks siaran disalin"
          : language === "中文"
            ? "已复制帖子内容"
            : "Post copied",
      );
    } catch {
      notify(
        language === "Bahasa Melayu"
          ? "Tidak dapat menyalin teks"
          : language === "中文"
            ? "无法复制内容"
            : "Could not copy post",
      );
    }
  };

  const spawnFloatingHearts = () => {
    if (prefersReducedMotion()) return;
    const base = Date.now();
    const items: FloatingHeartItem[] = [
      { id: base + 1, xOffset: -18 },
      { id: base + 2, xOffset: 10 },
      { id: base + 3, xOffset: 28 },
    ];
    setFloatingHearts((prev) => [...prev, ...items]);
    window.setTimeout(() => {
      setFloatingHearts((prev) =>
        prev.filter((h) => !items.some((item) => item.id === h.id)),
      );
    }, 950);
  };

  const sendDoubleTapHug = () => {
    triggerSubtleHaptic(12);
    spawnFloatingHearts();
    if (!reactionSummary.likedByMe) {
      onSelectReaction(post.id, "hug");
    }
  };

  const handleFeedBodyClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea, [role='menu']")) return;

    const now = Date.now();
    if (now - lastTapTimeRef.current < 320) {
      lastTapTimeRef.current = 0;
      sendDoubleTapHug();
    } else {
      lastTapTimeRef.current = now;
    }
  };

  const crisisBannerText =
    language === "Bahasa Melayu"
      ? "Jika anda sedang bergelut, sokongan sentiasa ada."
      : language === "中文"
        ? "如果你现在感到很难熬，这里随时有支持与陪伴。"
        : "If you're struggling, support is available";

  const crisisActionLabel =
    language === "Bahasa Melayu"
      ? "Dapatkan bantuan"
      : language === "中文"
        ? "获取支持资源"
        : "Get support";

  return (
    <article
      className={`ony-post-card ${variant === "feed" ? "is-feed-card" : "is-list-card"} ${categoryClass}`}
      onClick={variant === "feed" ? handleFeedBodyClick : undefined}
      onDoubleClick={variant === "feed" ? sendDoubleTapHug : undefined}
      aria-label={`${displayTitle} by ${post.author}`}
    >
      {/* Ambient faint SVG pattern (non-interactive, theme tinted) */}
      {variant === "feed" && (
        <div className="post-card-ambient-art" aria-hidden="true">
          <svg viewBox="0 0 240 240" fill="none">
            <circle cx="195" cy="48" r="68" stroke="currentColor" strokeWidth="1.2" opacity="0.22" />
            <circle cx="195" cy="48" r="42" stroke="currentColor" strokeWidth="1" opacity="0.16" />
            <path
              d="M170 215c18-32 45-48 72-46-12 25-32 48-72 46Z"
              stroke="currentColor"
              strokeWidth="1.2"
              opacity="0.22"
            />
            <path
              d="M20 198c24-12 46-4 58 18-24 8-44 2-58-18Z"
              stroke="currentColor"
              strokeWidth="1.1"
              opacity="0.16"
            />
          </svg>
        </div>
      )}

      {/* Floating hearts from double-tap */}
      {floatingHearts.length > 0 && (
        <div className="post-floating-hearts" aria-hidden="true">
          {floatingHearts.map((heart) => (
            <span
              key={heart.id}
              className="post-floating-heart"
              style={{ left: `calc(50% + ${heart.xOffset}px)` }}
            >
              🤗
            </span>
          ))}
        </div>
      )}

      {/* Top Author Chip + Viewport-Portal Overflow Menu */}
      <header className="post-card-header">
        <div className="post-author-chip">
          <span className="post-author-avatar" aria-hidden="true">
            {authorInfo.initial}
          </span>
          <div className="post-author-meta">
            <div className="post-author-name-row">
              <strong className="post-author-name">{authorInfo.displayName}</strong>
              {authorInfo.age && (
                <span className="post-author-age">· {authorInfo.age}</span>
              )}
            </div>
            <div className="post-author-subrow">
              <span className="post-category-tag">
                {getCategoryLabel(post.category, language)}
              </span>
              <span aria-hidden="true">·</span>
              <time dateTime={post.createdAt}>
                {formatFriendlyTime(post.createdAt, language)}
              </time>
            </div>
          </div>
        </div>

        <PostMenu
          post={post}
          shouldOfferTranslate={shouldOfferTranslate}
          showTranslation={showTranslation}
          hasTranslatedCache={Boolean(translatedContent)}
          isTranslating={isTranslating}
          onToggleTranslation={() => void handleToggleTranslation()}
          onCopyPost={() => void handleCopyPost()}
          onHidePost={() => onHidePost(post.id)}
          onOpenReportSheet={() => onReportPost(post)}
        />
      </header>

      {/* Translated badge when translated */}
      {showTranslation && (
        <div className="post-translated-indicator">
          <span>🌐</span>
          <span>
            {language === "Bahasa Melayu"
              ? "Diterjemah ke Bahasa Melayu"
              : language === "中文"
                ? "已翻译为中文"
                : "Translated to English"}
          </span>
        </div>
      )}

      {/* Gentle non-censoring safety banner for crisis-related content */}
      {hasCrisisKeywords && (
        <div
          className="post-crisis-banner"
          role="region"
          aria-label={crisisBannerText}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="post-crisis-copy">
            <span className="post-crisis-icon" aria-hidden="true">
              🤍
            </span>
            <span>{crisisBannerText}</span>
          </div>
          <button
            type="button"
            className="post-crisis-link-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenHelp();
            }}
          >
            {crisisActionLabel}
          </button>
        </div>
      )}

      {/* Card Body (independently scrollable inside feed card so long posts don't break snap scroll) */}
      <div
        className={variant === "feed" ? "post-snap-scroll-body" : "post-list-body-wrap"}
        onClick={
          variant === "list"
            ? () => onOpenComments(post.id)
            : undefined
        }
        role={variant === "list" ? "button" : undefined}
        tabIndex={variant === "list" ? 0 : undefined}
        onKeyDown={
          variant === "list"
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenComments(post.id);
                }
              }
            : undefined
        }
      >
        <h3 className="post-card-title">{displayTitle}</h3>
        <p className="post-card-body">{displayBody}</p>

        {post.media === "voice" && (
          <div className="post-media-block" onClick={(e) => e.stopPropagation()}>
            <SupportiveMessageBubble
              id={`post_voice_${post.id}`}
              kind="voice"
              audioUrl={post.audioUrl}
              audioDuration={post.audioDuration}
              text={
                language === "Bahasa Melayu"
                  ? "Nota suara dikongsi bersama komuniti"
                  : language === "中文"
                    ? "分享给社区的语音留言"
                    : "Voice note shared with the community"
              }
              senderAnonymous={post.author}
              timeDisplay={formatFriendlyTime(post.createdAt, language)}
              notify={notify}
            />
          </div>
        )}

        {post.media === "image" && (
          <div className="post-image-calming">
            <span>{t.community_calm_image}</span>
          </div>
        )}
      </div>

      {/* Bottom Supportive Reaction Bar */}
      <footer className="post-card-footer">
        <ReactionBar
          postId={post.id}
          summary={reactionSummary}
          commentCount={commentCount}
          isSaved={isSaved}
          onSelectReaction={onSelectReaction}
          onOpenComments={onOpenComments}
          onSavePost={() => onSaveToVault(post)}
          language={language}
          compact={variant === "list"}
        />
      </footer>
    </article>
  );
}

export default PostCard;
