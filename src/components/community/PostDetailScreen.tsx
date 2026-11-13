import { useEffect, useMemo, useRef, useState } from "react";
import {
  addCommunityCommentReply,
  addCommunityPostComment,
  deleteCommunityCommentReply,
  deleteCommunityPostComment,
  editCommunityCommentReply,
  editCommunityPostComment,
  toggleCommunityCommentLike,
  validateCommunityCommentText,
  type FirestoreCommunityPost,
  type PostCommentRecord,
} from "../../firebase/firestore";
import { useLanguage } from "../../i18n/LanguageContext";
import { formatFriendlyTime, getCategoryLabel } from "../../i18n/translations";
import {
  getCachedPostTranslation,
  translateCommunityPost,
} from "../../services/communityTranslationService";
import {
  OnySpeechSynthesizer,
  formatAudioDuration,
  playSoothingChime,
} from "../../services/voiceService";
import {
  computePostReactionSummary,
  containsCrisisLanguage,
  detectPostLanguage,
  getUserReactionChoice,
  loadSavedPostIds,
  parseAuthorDisplay,
  saveSavedPostIds,
  saveUserReactionChoice,
  type SupportiveReactionType,
} from "../../utils/communityPostHelpers";
import {
  CommentComposer,
  type CommentEditContext,
  type CommentReplyContext,
} from "./CommentComposer";
import { CommentList } from "./CommentList";
import { PostMenu, ReportReasonSheet } from "./PostMenu";
import { ReactionBar } from "./ReactionBar";

export interface PostDetailScreenProps {
  back: () => void;
  post: FirestoreCommunityPost;
  currentUid?: string;
  currentUserName?: string;
  onLikePost?: (postId: string) => void;
  onPostUpdated?: (updated: FirestoreCommunityPost) => void;
  onSavePostToVault?: (post: FirestoreCommunityPost) => void;
  onOpenHelp?: () => void;
  notify: (msg: string) => void;
}

function DetailVoicePlayer({
  audioUrl,
  audioDuration = 25,
  notify,
  language,
}: {
  audioUrl?: string;
  audioDuration?: number;
  notify: (msg: string) => void;
  language: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = () => {
    if (audioUrl) {
      if (!audioRef.current) {
        const audio = new Audio(audioUrl);
        audio.ontimeupdate = () => setCurrentTime(Math.floor(audio.currentTime));
        audio.onended = () => {
          setPlaying(false);
          setCurrentTime(0);
        };
        audio.onerror = () => {
          setPlaying(false);
          notify("Unable to play voice note");
        };
        audioRef.current = audio;
      }
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        audioRef.current
          .play()
          .then(() => setPlaying(true))
          .catch(() => {
            setPlaying(true);
            void playSoothingChime(audioDuration).then(() => setPlaying(false));
          });
      }
    } else if (playing) {
      setPlaying(false);
    } else {
      setPlaying(true);
      void playSoothingChime(audioDuration).then(() => setPlaying(false));
    }
  };

  return (
    <div className="voice-note post-detail-voice-note">
      <button
        type="button"
        className="post-detail-voice-btn"
        onClick={togglePlay}
        aria-label={
          playing
            ? language === "Bahasa Melayu"
              ? "Jeda nota suara"
              : language === "中文"
                ? "暂停语音"
                : "Pause voice note"
            : language === "Bahasa Melayu"
              ? "Main nota suara"
              : language === "中文"
                ? "播放语音"
                : "Play voice note"
        }
      >
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
            <path d="M8 5v14M16 5v14" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
            <polygon points="7,5 19,12 7,19" fill="currentColor" stroke="none" />
          </svg>
        )}
      </button>
      <span className={playing ? "playing" : ""} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <small>
        {playing && currentTime > 0
          ? `${formatAudioDuration(currentTime)} / ${formatAudioDuration(audioDuration)}`
          : formatAudioDuration(audioDuration)}
      </small>
    </div>
  );
}

export function PostDetailScreen({
  back,
  post,
  currentUid = "guest_local_user",
  currentUserName = "ONY Member",
  onLikePost,
  onPostUpdated,
  onSavePostToVault,
  onOpenHelp,
  notify,
}: PostDetailScreenProps) {
  const { t, language } = useLanguage();

  const [submitting, setSubmitting] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<CommentReplyContext | null>(null);
  const [editTarget, setEditTarget] = useState<CommentEditContext | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [lastFailedAction, setLastFailedAction] = useState<
    (() => Promise<boolean>) | null
  >(null);

  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<{
    translatedTitle: string;
    translatedBody: string;
  } | null>(() => getCachedPostTranslation(post.id, language));
  const [isTranslating, setIsTranslating] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(() => loadSavedPostIds());
  const [reactionTick, setReactionTick] = useState(0);

  const commentsEndRef = useRef<HTMLDivElement | null>(null);
  const ttsRef = useRef<OnySpeechSynthesizer | null>(null);

  useEffect(() => {
    const cached = getCachedPostTranslation(post.id, language);
    setTranslatedContent(cached);
    setShowTranslation(false);
  }, [post.id, language]);

  useEffect(() => {
    const synth = OnySpeechSynthesizer.getInstance();
    ttsRef.current = synth;
    synth.setOnStateChange((activeId) => {
      setSpeakingId(activeId);
    });
    return () => {
      synth.stop();
    };
  }, []);

  const cleanUid = currentUid.trim() || "anonymous_user";
  const cleanName = currentUserName.trim() || "ONY Member";

  const authorInfo = useMemo(() => parseAuthorDisplay(post.author), [post.author]);
  const comments: PostCommentRecord[] = Array.isArray(post.comments)
    ? post.comments
    : [];
  const reactionSummary = useMemo(
    () => computePostReactionSummary(post, cleanUid, cleanName),
    [post, cleanUid, cleanName, reactionTick],
  );

  const detectedLanguage = useMemo(
    () => detectPostLanguage(post.title, post.body),
    [post.title, post.body],
  );
  const shouldOfferTranslate = detectedLanguage !== language || showTranslation;

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
            ? "帖子已翻译"
            : "Post translated",
      );
    } catch {
      notify(
        language === "Bahasa Melayu"
          ? "Gagal menterjemah"
          : language === "中文"
            ? "翻译失败，请稍后重试"
            : "Translation failed",
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
          ? "Teks siaran disalin"
          : language === "中文"
            ? "已复制帖子内容"
            : "Post copied",
      );
    } catch {
      notify("Could not copy post");
    }
  };

  const handleSelectReaction = (
    postId: string,
    reaction: SupportiveReactionType,
  ) => {
    const records = Array.isArray(post.likeRecords) ? post.likeRecords : [];
    const alreadyLiked = records.some(
      (rec) =>
        rec.userId === cleanUid ||
        rec.userName.trim().toLowerCase() === cleanName.toLowerCase(),
    );
    const currentReaction =
      getUserReactionChoice(postId, cleanUid) || (alreadyLiked ? "hug" : null);

    if (alreadyLiked && currentReaction === reaction) {
      saveUserReactionChoice(postId, cleanUid, null);
      setReactionTick((n) => n + 1);
      onLikePost?.(postId);
    } else if (alreadyLiked && currentReaction !== reaction) {
      saveUserReactionChoice(postId, cleanUid, reaction);
      setReactionTick((n) => n + 1);
    } else {
      saveUserReactionChoice(postId, cleanUid, reaction);
      setReactionTick((n) => n + 1);
      onLikePost?.(postId);
    }
  };

  const handleSavePost = () => {
    if (savedPostIds.has(post.id)) {
      notify(
        language === "Bahasa Melayu"
          ? "Sudah disimpan dalam Peti Memori"
          : language === "中文"
            ? "已保存在记忆宝库"
            : "Already saved to Memory Vault",
      );
      return;
    }
    setSavedPostIds((prev) => {
      const next = new Set(prev);
      next.add(post.id);
      saveSavedPostIds(next);
      return next;
    });
    if (onSavePostToVault) {
      onSavePostToVault(post);
    } else {
      notify(
        language === "Bahasa Melayu"
          ? "Disimpan ke Peti Memori"
          : language === "中文"
            ? "已保存到记忆宝库"
            : "Saved to Memory Vault",
      );
    }
  };

  const handleToggleTts = (id: string, textToRead: string) => {
    const synth = ttsRef.current || OnySpeechSynthesizer.getInstance();
    ttsRef.current = synth;
    if (speakingId === id) {
      synth.stop();
      setSpeakingId(null);
      return;
    }
    const langCode = language === "Bahasa Melayu" ? "ms" : "en";
    const started = synth.speak(textToRead, id, langCode);
    if (started) setSpeakingId(id);
  };

  const submitTextFlow = async (rawText: string): Promise<boolean> => {
    const check = validateCommunityCommentText(rawText);
    if (!check.valid) {
      setComposerError(
        check.reason ||
          (language === "Bahasa Melayu"
            ? "Komen melanggar garis panduan komuniti."
            : language === "中文"
              ? "内容不符合社区友善守则。"
              : "Comment violates community guidelines."),
      );
      setLastFailedAction(null);
      return false;
    }

    setComposerError(null);
    setSubmitting(true);
    try {
      if (editTarget) {
        const updated =
          editTarget.kind === "comment"
            ? await editCommunityPostComment(post, editTarget.commentId, rawText.trim())
            : await editCommunityCommentReply(
                post,
                editTarget.commentId,
                editTarget.replyId || "",
                rawText.trim(),
              );
        onPostUpdated?.(updated);
        setEditTarget(null);
        setLastFailedAction(null);
        notify(
          language === "Bahasa Melayu"
            ? "Komen dikemas kini"
            : language === "中文"
              ? "评论已更新"
              : "Comment updated",
        );
        return true;
      }

      if (replyTarget) {
        const updated = await addCommunityCommentReply(post, replyTarget.commentId, {
          userId: cleanUid,
          userName: cleanName,
          text: rawText.trim(),
          kind: "text",
        });
        onPostUpdated?.(updated);
        setReplyTarget(null);
        setLastFailedAction(null);
        notify(
          language === "Bahasa Melayu"
            ? "Balasan ditambah"
            : language === "中文"
              ? "回复已添加"
              : "Reply added",
        );
        return true;
      }

      const updated = await addCommunityPostComment(post, {
        userId: cleanUid,
        userName: cleanName,
        text: rawText.trim(),
        kind: "text",
      });
      onPostUpdated?.(updated);
      setLastFailedAction(null);
      window.setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 80);
      notify(
        language === "Bahasa Melayu"
          ? "Komen telah dihantar"
          : language === "中文"
            ? "评论已发布"
            : "Comment posted",
      );
      return true;
    } catch (err: any) {
      setComposerError(err?.message || "Could not post comment.");
      setLastFailedAction(() => () => submitTextFlow(rawText));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const submitVoiceFlow = async (audio: {
    dataUrl: string;
    duration: number;
  }): Promise<boolean> => {
    setComposerError(null);
    setSubmitting(true);
    const caption =
      language === "Bahasa Melayu"
        ? `Nota suara (${formatAudioDuration(audio.duration)})`
        : language === "中文"
          ? `语音评论 (${formatAudioDuration(audio.duration)})`
          : `Voice note (${formatAudioDuration(audio.duration)})`;

    try {
      if (replyTarget) {
        const updated = await addCommunityCommentReply(post, replyTarget.commentId, {
          userId: cleanUid,
          userName: cleanName,
          text: caption,
          kind: "voice",
          audioUrl: audio.dataUrl,
          audioDuration: audio.duration,
        });
        onPostUpdated?.(updated);
        setReplyTarget(null);
        setLastFailedAction(null);
        notify(
          language === "Bahasa Melayu"
            ? "Balasan suara ditambah"
            : language === "中文"
              ? "语音回复已发送"
              : "Voice reply sent",
        );
        return true;
      }

      const updated = await addCommunityPostComment(post, {
        userId: cleanUid,
        userName: cleanName,
        text: caption,
        kind: "voice",
        audioUrl: audio.dataUrl,
        audioDuration: audio.duration,
      });
      onPostUpdated?.(updated);
      setLastFailedAction(null);
      window.setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 80);
      notify(
        language === "Bahasa Melayu"
          ? "Komen suara dihantar"
          : language === "中文"
            ? "语音评论已发布"
            : "Voice comment posted",
      );
      return true;
    } catch (err: any) {
      setComposerError(err?.message || "Could not send voice comment.");
      setLastFailedAction(() => () => submitVoiceFlow(audio));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    try {
      const updated = await toggleCommunityCommentLike(post, commentId, {
        uid: cleanUid,
        name: cleanName,
      });
      onPostUpdated?.(updated);
    } catch {
      notify("Could not update comment like");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const updated = await deleteCommunityPostComment(post, commentId);
      onPostUpdated?.(updated);
      if (editTarget?.commentId === commentId) setEditTarget(null);
      if (replyTarget?.commentId === commentId) setReplyTarget(null);
      notify("Comment deleted");
    } catch {
      notify("Could not delete comment");
    }
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    try {
      const updated = await deleteCommunityCommentReply(post, commentId, replyId);
      onPostUpdated?.(updated);
      if (editTarget?.replyId === replyId) setEditTarget(null);
      notify("Reply deleted");
    } catch {
      notify("Could not delete reply");
    }
  };

  const hasCrisis = containsCrisisLanguage(post.title, post.body);

  return (
    <div className="post-detail-screen">
      {/* Top Bar: Back + Category/Time + Overflow Menu */}
      <header className="post-detail-topbar">
        <button
          type="button"
          className="feed-header-icon-btn"
          onClick={back}
          aria-label={t.common_back || "Back"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="feed-header-svg">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>

        <div className="post-detail-topbar-meta">
          <strong>{getCategoryLabel(post.category, language)}</strong>
          <small>{formatFriendlyTime(post.createdAt, language)}</small>
        </div>

        <PostMenu
          post={post}
          shouldOfferTranslate={shouldOfferTranslate}
          showTranslation={showTranslation}
          hasTranslatedCache={Boolean(translatedContent)}
          isTranslating={isTranslating}
          onToggleTranslation={() => void handleToggleTranslation()}
          onCopyPost={() => void handleCopyPost()}
          onHidePost={back}
          onOpenReportSheet={() => setReportSheetOpen(true)}
        />
      </header>

      {/* Scrollable Post + Comments Content */}
      <div className="post-detail-scroll-area">
        <article className="post-detail-article">
          <div className="post-detail-author-row">
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
                <span>
                  {post.author === "Anonymous"
                    ? t.community_private_identity
                    : t.community_profile_identity}
                </span>
              </div>
            </div>
          </div>

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

          {hasCrisis && (
            <div className="post-crisis-banner" role="region">
              <div className="post-crisis-copy">
                <span aria-hidden="true">🤍</span>
                <span>
                  {language === "Bahasa Melayu"
                    ? "Jika anda sedang bergelut, sokongan sentiasa ada."
                    : language === "中文"
                      ? "如果你现在感到很难熬，这里随时有支持与陪伴。"
                      : "If you're struggling, support is available"}
                </span>
              </div>
              {onOpenHelp && (
                <button
                  type="button"
                  className="post-crisis-link-btn"
                  onClick={onOpenHelp}
                >
                  {language === "Bahasa Melayu"
                    ? "Dapatkan bantuan"
                    : language === "中文"
                      ? "获取支持"
                      : "Get support"}
                </button>
              )}
            </div>
          )}

          <h1 className="post-detail-title">{displayTitle}</h1>
          <p className="post-detail-body">{displayBody}</p>

          {post.media === "voice" && (
            <div className="post-media-block">
              <DetailVoicePlayer
                audioUrl={post.audioUrl}
                audioDuration={post.audioDuration}
                notify={notify}
                language={language}
              />
            </div>
          )}

          {post.media === "image" && (
            <div className="post-image-calming detail">
              <span>{t.community_calm_image}</span>
            </div>
          )}

          <div className="post-detail-reaction-wrap">
            <ReactionBar
              postId={post.id}
              summary={reactionSummary}
              commentCount={comments.length}
              isSaved={savedPostIds.has(post.id)}
              onSelectReaction={handleSelectReaction}
              onOpenComments={() =>
                commentsEndRef.current?.scrollIntoView({ behavior: "smooth" })
              }
              onSavePost={handleSavePost}
              language={language}
            />
          </div>
        </article>

        <section className="post-detail-comments-block">
          <div className="post-detail-comments-head">
            <h3>
              {t.community_comments_title} ({comments.length})
            </h3>
          </div>

          <CommentList
            post={post}
            currentUid={cleanUid}
            currentUserName={cleanName}
            speakingId={speakingId}
            showCrisisBanner={false}
            onToggleTts={handleToggleTts}
            onToggleCommentLike={(cid) => void handleToggleCommentLike(cid)}
            onReply={(cid, userName) => {
              setEditTarget(null);
              setReplyTarget({ commentId: cid, userName });
            }}
            onEditComment={(cid, initialText) => {
              setReplyTarget(null);
              setEditTarget({ kind: "comment", commentId: cid, initialText });
            }}
            onDeleteComment={(cid) => void handleDeleteComment(cid)}
            onEditReply={(cid, rid, initialText) => {
              setReplyTarget(null);
              setEditTarget({
                kind: "reply",
                commentId: cid,
                replyId: rid,
                initialText,
              });
            }}
            onDeleteReply={(cid, rid) => void handleDeleteReply(cid, rid)}
            onOpenHelp={onOpenHelp}
            commentsEndRef={commentsEndRef}
          />
        </section>
      </div>

      {/* Always-visible Pinned CommentComposer (Text + Voice + Reply + Edit) */}
      <CommentComposer
        authorName={cleanName}
        language={language}
        replyTarget={replyTarget}
        editTarget={editTarget}
        submitting={submitting}
        error={composerError}
        canRetry={Boolean(lastFailedAction)}
        onRetry={
          lastFailedAction
            ? () => {
                void lastFailedAction();
              }
            : undefined
        }
        onClearReply={() => setReplyTarget(null)}
        onCancelEdit={() => setEditTarget(null)}
        onClearError={() => {
          setComposerError(null);
          setLastFailedAction(null);
        }}
        onSubmitText={submitTextFlow}
        onSubmitVoice={submitVoiceFlow}
      />

      <ReportReasonSheet
        post={reportSheetOpen ? post : null}
        language={language}
        onClose={() => setReportSheetOpen(false)}
        onConfirmReport={() => {
          notify(
            language === "Bahasa Melayu"
              ? "Terima kasih. Siaran ditandakan untuk semakan moderasi."
              : language === "中文"
                ? "感谢反馈。帖子已提交社区安全团队审核。"
                : "Thank you. Post flagged for moderation review.",
          );
        }}
      />
    </div>
  );
}

export default PostDetailScreen;
