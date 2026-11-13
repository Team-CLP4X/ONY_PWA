import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import {
  translateCommunityPost,
  getCachedPostTranslation,
} from "../services/communityTranslationService";
import type { FirestoreCommunityPost, PostLikeRecord, PostCommentRecord } from "../firebase/firestore";
import { formatFriendlyTime, getCategoryLabel } from "../i18n/translations";
import { SupportiveMessageBubble } from "./SupportiveMessageBubble";
import { detectPostLanguage } from "../utils/communityPostHelpers";

export interface CommunityPostCardProps {
  post: FirestoreCommunityPost;
  currentUid: string;
  currentUserName: string;
  onOpen: (post: FirestoreCommunityPost) => void;
  onLike?: (postId: string) => void;
  notify: (msg: string) => void;
}

export function CommunityPostCard({
  post,
  currentUid,
  currentUserName,
  onOpen,
  onLike,
  notify,
}: CommunityPostCardProps) {
  const { t, language } = useLanguage();

  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<{
    translatedTitle: string;
    translatedBody: string;
  } | null>(() => getCachedPostTranslation(post.id, language));
  const [isTranslating, setIsTranslating] = useState(false);

  const likeList: PostLikeRecord[] = Array.isArray(post.likeRecords) ? post.likeRecords : [];
  const commentList: PostCommentRecord[] = Array.isArray(post.comments) ? post.comments : [];
  const likedByMe = likeList.some(
    (l) =>
      l.userId === currentUid ||
      l.userName.trim().toLowerCase() === currentUserName.trim().toLowerCase(),
  );

  const detectedLang = detectPostLanguage(post.title, post.body);
  const shouldShowTranslate = detectedLang !== language || showTranslation;

  const handleToggleTranslation = async (e: React.MouseEvent) => {
    e.stopPropagation();

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

  const displayTitle =
    showTranslation && translatedContent ? translatedContent.translatedTitle : post.title;
  const displayBody =
    showTranslation && translatedContent ? translatedContent.translatedBody : post.body;

  return (
    <article className="post-card" key={post.id}>
      <div className="post-meta">
        <span className="mini-avatar">{post.author[0] || "A"}</span>
        <div>
          <strong>{post.author}</strong>
          <small>
            {getCategoryLabel(post.category, language)} ·{" "}
            {formatFriendlyTime(post.createdAt, language)}
          </small>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {shouldShowTranslate && (
            <button
              type="button"
              className={`post-translate-btn ${showTranslation ? "active" : ""}`}
              onClick={handleToggleTranslation}
              disabled={isTranslating}
              title={showTranslation ? t.community_show_original : `${t.community_translate_btn} (${language})`}
              aria-label={showTranslation ? t.community_show_original : `${t.community_translate_btn} (${language})`}
            >
              {isTranslating ? (
                <>
                  <span className="support-spinner mini" />
                  <span>{t.community_translating}</span>
                </>
              ) : showTranslation ? (
                <>
                  <span className="btn-icon">↩</span>
                  <span>{t.community_show_original}</span>
                </>
              ) : translatedContent ? (
                <>
                  <span className="btn-icon">🌐</span>
                  <span>{t.community_show_translation}</span>
                </>
              ) : (
                <>
                  <span className="btn-icon">🌐</span>
                  <span>{t.community_translate_btn}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {showTranslation && (
        <div className="post-translated-badge-row">
          <span className="support-translated-badge">
            <span className="lang-icon">🌐</span>
            <small>
              {language === "Bahasa Melayu"
                ? "Diterjemah ke Bahasa Melayu"
                : language === "中文"
                ? "已翻译为中文"
                : "Translated to English"}
            </small>
          </span>
        </div>
      )}

      <button className="post-open" onClick={() => onOpen(post)}>
        <h3 className="post-card-title">{displayTitle}</h3>
        <p className="post-card-body">{displayBody}</p>
      </button>

      {post.media === "voice" && (
        <div style={{ margin: "10px 0" }}>
          <SupportiveMessageBubble
            id={`post_voice_${post.id}`}
            kind="voice"
            audioUrl={post.audioUrl}
            audioDuration={post.audioDuration}
            text="Voice note shared with the community"
            senderAnonymous={post.author}
            timeDisplay={formatFriendlyTime(post.createdAt, language)}
            notify={notify}
          />
        </div>
      )}

      {post.media === "image" && (
        <div className="post-image">
          <span>{t.community_calm_image}</span>
        </div>
      )}

      <div className="post-actions">
        <button
          type="button"
          className={`post-action-btn ${likedByMe ? "liked" : ""}`}
          onClick={() => onLike && onLike(post.id)}
        >
          <span className="action-icon">♥</span>
          <span>
            {likedByMe
              ? language === "Bahasa Melayu"
                ? "Disukai"
                : language === "中文"
                ? "已赞"
                : "Liked"
              : language === "Bahasa Melayu"
              ? "Suka"
              : language === "中文"
              ? "点赞"
              : "Like"}{" "}
            ({post.likes})
          </span>
        </button>

        <button
          type="button"
          className="post-action-btn"
          onClick={() => onOpen(post)}
        >
          <span className="action-icon">💬</span>
          <span>
            {commentList.length}{" "}
            {language === "Bahasa Melayu"
              ? "komen"
              : language === "中文"
              ? "条评论"
              : commentList.length === 1
              ? "comment"
              : "comments"}
          </span>
        </button>
      </div>
    </article>
  );
}
