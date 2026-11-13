import { useEffect, useMemo, useState } from "react";
import type { FirestoreCommunityPost } from "../../firebase/firestore";
import { useLanguage } from "../../i18n/LanguageContext";
import { formatFriendlyTime, getCategoryLabel } from "../../i18n/translations";
import {
  getCachedPostTranslation,
  translateCommunityPost,
} from "../../services/communityTranslationService";
import { formatAudioDuration } from "../../services/voiceService";
import {
  computePostReactionSummary,
  detectPostLanguage,
  getCategoryThemeClass,
  getReactionEmoji,
  parseAuthorDisplay,
  resolveWorldLandmarkKind,
  triggerSubtleHaptic,
  type SupportiveReactionType,
} from "../../utils/communityPostHelpers";
import { LandmarkArt } from "./Landmark";
import { PostMenu } from "./PostMenu";

export interface PostListCardProps {
  post: FirestoreCommunityPost;
  currentUid: string;
  currentUserName: string;
  isSaved: boolean;
  onOpenPost: (post: FirestoreCommunityPost) => void;
  onSelectReaction: (postId: string, reaction: SupportiveReactionType) => void;
  onOpenComments: (postId: string) => void;
  onSaveToVault: (post: FirestoreCommunityPost) => void;
  onReportPost: (post: FirestoreCommunityPost) => void;
  onHidePost: (postId: string) => void;
  notify: (msg: string) => void;
}

export function PostListCard({
  post,
  currentUid,
  currentUserName,
  isSaved,
  onOpenPost,
  onSelectReaction,
  onOpenComments,
  onSaveToVault,
  onReportPost,
  onHidePost,
  notify,
}: PostListCardProps) {
  const { language } = useLanguage();

  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<{
    translatedTitle: string;
    translatedBody: string;
  } | null>(() => getCachedPostTranslation(post.id, language));
  const [isTranslating, setIsTranslating] = useState(false);

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
  const authorInfo = useMemo(() => parseAuthorDisplay(post.author), [post.author]);
  const reactionSummary = useMemo(
    () => computePostReactionSummary(post, currentUid, currentUserName),
    [post, currentUid, currentUserName],
  );
  const commentCount = Array.isArray(post.comments) ? post.comments.length : 0;
  const categoryClass = getCategoryThemeClass(post.category);
  const landmarkKind = resolveWorldLandmarkKind(post.category);

  const displayTitle =
    showTranslation && translatedContent
      ? translatedContent.translatedTitle
      : post.title;
  const displayBody =
    showTranslation && translatedContent
      ? translatedContent.translatedBody
      : post.body;

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
          ? "Siaran diterjemahkan"
          : language === "中文"
            ? "已翻译"
            : "Post translated",
      );
    } catch {
      notify(
        language === "Bahasa Melayu"
          ? "Gagal menterjemah"
          : language === "中文"
            ? "翻译失败"
            : "Could not translate",
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
      }
      notify(
        language === "Bahasa Melayu"
          ? "Teks disalin"
          : language === "中文"
            ? "已复制内容"
            : "Post copied",
      );
    } catch {
      notify("Could not copy post");
    }
  };

  const primaryType: SupportiveReactionType = reactionSummary.myReaction || "hug";
  const reactionEmoji = getReactionEmoji(primaryType);
  const isVoice = post.media === "voice" || Boolean(post.audioUrl);
  const isImage = post.media === "image";

  return (
    <article
      className={`post-list-card ${categoryClass}`}
      onClick={() => onOpenPost(post)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenPost(post);
        }
      }}
      aria-label={`${displayTitle} by ${authorInfo.displayName}`}
    >
      {/* 1. Compact Header: Avatar + Author + Time + "..." Menu */}
      <div className="post-list-card-top">
        <div className="post-list-author">
          <span className="post-list-avatar" aria-hidden="true">
            {authorInfo.initial}
          </span>
          <span className="post-list-author-name">{authorInfo.displayName}</span>
          {authorInfo.age && (
            <span className="post-list-author-age">· {authorInfo.age}</span>
          )}
          <span className="post-list-time" aria-hidden="true">
            ·
          </span>
          <time className="post-list-time" dateTime={post.createdAt}>
            {formatFriendlyTime(post.createdAt, language)}
          </time>
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
      </div>

      {/* 2. Middle Content Row: Title + 2-Line Body on Left, Soft Square Visual on Right */}
      <div className="post-list-card-middle">
        <div className="post-list-card-copy">
          <h3 className="post-list-card-title">{displayTitle}</h3>
          <p className="post-list-card-excerpt">{displayBody}</p>
        </div>

        <div className="post-list-thumb" aria-hidden="true">
          {isVoice ? (
            <div className="post-list-thumb-voice">
              <span className="thumb-voice-badge">🎙</span>
              <div className="thumb-voice-bars">
                <span style={{ height: "10px" }} />
                <span style={{ height: "18px" }} />
                <span style={{ height: "13px" }} />
                <span style={{ height: "20px" }} />
                <span style={{ height: "11px" }} />
              </div>
              <small>{formatAudioDuration(post.audioDuration || 25)}</small>
            </div>
          ) : isImage ? (
            <div className="post-list-thumb-scenic">
              <svg viewBox="0 0 80 80" fill="none" className="thumb-scenic-svg">
                <rect width="80" height="80" rx="14" fill="color-mix(in srgb, var(--theme-primary) 16%, var(--theme-surface-soft))" />
                <circle cx="55" cy="24" r="9" fill="color-mix(in srgb, var(--theme-accent) 72%, #fde68a)" />
                <path d="M0 58c18-16 32-16 46-4 11-10 22-10 34 2v24H0V58Z" fill="color-mix(in srgb, var(--theme-primary) 34%, var(--theme-surface))" />
                <path d="M0 66c22-10 48-6 80 4v10H0V66Z" fill="color-mix(in srgb, var(--theme-accent) 26%, var(--theme-surface-elevated))" />
              </svg>
            </div>
          ) : (
            <div className="post-list-thumb-art">
              <LandmarkArt kind={landmarkKind} categoryName={post.category} size="mini" animated={false} />
            </div>
          )}
        </div>
      </div>

      {/* 3. Quiet Footer: Category Tag + Reaction / Comment / Save Bookmark */}
      <div
        className="post-list-card-footer"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="post-list-category-chip">
          {getCategoryLabel(post.category, language)}
        </span>

        <div className="post-list-footer-actions">
          <button
            type="button"
            className={`post-list-meta-btn ${reactionSummary.likedByMe ? "active" : ""}`}
            onClick={() => {
              triggerSubtleHaptic(8);
              onSelectReaction(post.id, primaryType);
            }}
            aria-pressed={reactionSummary.likedByMe}
            aria-label={`React (${reactionSummary.totalCount})`}
          >
            <span aria-hidden="true">{reactionEmoji}</span>
            <span>{reactionSummary.totalCount}</span>
          </button>

          <button
            type="button"
            className="post-list-meta-btn"
            onClick={() => onOpenComments(post.id)}
            aria-label={`Comments (${commentCount})`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="post-list-footer-svg">
              <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4V7a2 2 0 0 1 2-2Z" />
            </svg>
            <span>{commentCount}</span>
          </button>

          <button
            type="button"
            className={`post-list-meta-btn save ${isSaved ? "saved" : ""}`}
            onClick={() => {
              triggerSubtleHaptic(8);
              onSaveToVault(post);
            }}
            aria-pressed={isSaved}
            aria-label={isSaved ? "Saved to Memory Vault" : "Save to Memory Vault"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="post-list-footer-svg">
              <path
                d="M6 3h12v18l-6-3.8L6 21V3Z"
                fill={isSaved ? "currentColor" : "none"}
              />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}

export default PostListCard;
