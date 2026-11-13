import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import {
  formatFriendlyTime,
  getCategoryLabel,
} from "../../i18n/translations";
import {
  OnySpeechSynthesizer,
  formatAudioDuration,
} from "../../services/voiceService";
import {
  computePostReactionSummary,
  containsCrisisLanguage,
  getReactionEmoji,
  parseAuthorDisplay,
} from "../../utils/communityPostHelpers";
import {
  CommentComposer,
  type CommentEditContext,
  type CommentReplyContext,
} from "./CommentComposer";
import { CommentList } from "./CommentList";

export interface CommentSheetProps {
  post: FirestoreCommunityPost | null;
  currentUid: string;
  currentUserName: string;
  loadingComments?: boolean;
  onClose: () => void;
  onPostUpdated: (updated: FirestoreCommunityPost) => void;
  onOpenHelp?: () => void;
  notify: (msg: string) => void;
}

export function CommentSheet({
  post,
  currentUid,
  currentUserName,
  loadingComments = false,
  onClose,
  onPostUpdated,
  onOpenHelp,
  notify,
}: CommentSheetProps) {
  const { t, language } = useLanguage();

  const [submitting, setSubmitting] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<CommentReplyContext | null>(null);
  const [editTarget, setEditTarget] = useState<CommentEditContext | null>(null);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const [isSnippetExpanded, setIsSnippetExpanded] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [lastFailedAction, setLastFailedAction] = useState<
    (() => Promise<boolean>) | null
  >(null);

  const bodyScrollRef = useRef<HTMLDivElement | null>(null);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);
  const ttsRef = useRef<OnySpeechSynthesizer | null>(null);

  useEffect(() => {
    setComposerError(null);
    setReplyTarget(null);
    setEditTarget(null);
    setIsSummaryCollapsed(false);
    setIsSnippetExpanded(false);
    setLastFailedAction(null);
    OnySpeechSynthesizer.getInstance().stop();
    setSpeakingId(null);
  }, [post?.id]);

  useEffect(() => {
    const synth = OnySpeechSynthesizer.getInstance();
    ttsRef.current = synth;
    synth.setOnStateChange((activeId) => {
      setSpeakingId(activeId);
    });

    if (!post) {
      synth.stop();
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      synth.stop();
    };
  }, [post, onClose]);

  const cleanUid = currentUid.trim() || "anonymous_user";
  const cleanName = currentUserName.trim() || "ONY Member";

  const reactionSummary = useMemo(
    () => (post ? computePostReactionSummary(post, cleanUid, cleanName) : null),
    [post, cleanUid, cleanName],
  );

  const comments: PostCommentRecord[] = Array.isArray(post?.comments)
    ? post.comments
    : [];

  const hasCrisisReply = useMemo(() => {
    if (!post) return false;
    if (containsCrisisLanguage(post.title, post.body)) return true;
    return comments.some(
      (c) =>
        containsCrisisLanguage(c.text) ||
        (c.replies || []).some((r) => containsCrisisLanguage(r.text)),
    );
  }, [post, comments]);

  if (!post || typeof document === "undefined") return null;

  const authorInfo = parseAuthorDisplay(post.author);
  const hasLongBody = post.body.length > 95 || post.body.includes("\n");

  const handleScrollComments = () => {
    const el = bodyScrollRef.current;
    if (!el) return;
    const nextCollapsed = el.scrollTop > 22;
    setIsSummaryCollapsed((prev) => (prev !== nextCollapsed ? nextCollapsed : prev));
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
    if (started) {
      setSpeakingId(id);
    }
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
        onPostUpdated(updated);
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
        onPostUpdated(updated);
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
      onPostUpdated(updated);
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
        onPostUpdated(updated);
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
      onPostUpdated(updated);
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

  const handleDeleteComment = async (commentId: string) => {
    try {
      const updated = await deleteCommunityPostComment(post, commentId);
      onPostUpdated(updated);
      if (editTarget?.commentId === commentId) setEditTarget(null);
      if (replyTarget?.commentId === commentId) setReplyTarget(null);
      notify(
        language === "Bahasa Melayu"
          ? "Komen dipadam"
          : language === "中文"
            ? "评论已删除"
            : "Comment deleted",
      );
    } catch {
      notify("Could not delete comment");
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    try {
      const updated = await toggleCommunityCommentLike(post, commentId, {
        uid: cleanUid,
        name: cleanName,
      });
      onPostUpdated(updated);
    } catch {
      notify("Could not update comment like");
    }
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    try {
      const updated = await deleteCommunityCommentReply(post, commentId, replyId);
      onPostUpdated(updated);
      if (editTarget?.replyId === replyId) setEditTarget(null);
      notify(
        language === "Bahasa Melayu"
          ? "Balasan dipadam"
          : language === "中文"
            ? "回复已删除"
            : "Reply deleted",
      );
    } catch {
      notify("Could not delete reply");
    }
  };

  /* Portal directly into document.body so it escapes .main-content's z-index:2 stacking context and sits cleanly above .bottom-nav */
  return createPortal(
    <div
      className="comment-sheet-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="comment-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`${t.community_comments_title}: ${post.title}`}
      >
        <div className="comment-sheet-handle" aria-hidden="true" />

        {/* Collapsible Pinned Post Summary */}
        <header
          className={`comment-sheet-pinned ${isSummaryCollapsed ? "is-collapsed" : ""}`}
        >
          <div className="comment-sheet-pinned-top">
            <div className="comment-sheet-author-pill">
              <span className="comment-sheet-avatar" aria-hidden="true">
                {authorInfo.initial}
              </span>
              <div className="comment-sheet-author-info">
                <strong>
                  {authorInfo.displayName}
                  {authorInfo.age ? ` · ${authorInfo.age}` : ""}
                </strong>
                <small>
                  {getCategoryLabel(post.category, language)} ·{" "}
                  {formatFriendlyTime(post.createdAt, language)}
                </small>
              </div>
            </div>

            <button
              type="button"
              className="comment-sheet-close-btn"
              onClick={onClose}
              aria-label={t.common_close || "Close comments"}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <h3 className="comment-sheet-post-title">{post.title}</h3>

          {!isSummaryCollapsed && (
            <>
              <p
                className={`comment-sheet-post-snippet ${isSnippetExpanded ? "expanded" : ""}`}
              >
                {post.body}
              </p>
              {hasLongBody && (
                <button
                  type="button"
                  className="comment-sheet-show-more-btn"
                  onClick={() => setIsSnippetExpanded((prev) => !prev)}
                >
                  {isSnippetExpanded
                    ? language === "Bahasa Melayu"
                      ? "Tunjuk kurang"
                      : language === "中文"
                        ? "收起内容"
                        : "Show less"
                    : language === "Bahasa Melayu"
                      ? "Lihat lagi"
                      : language === "中文"
                        ? "展开全文"
                        : "Show more"}
                </button>
              )}
              <div className="comment-sheet-summary-meta">
                {reactionSummary && reactionSummary.totalCount > 0 && (
                  <span>
                    {reactionSummary.activeTypes.slice(0, 3).map(getReactionEmoji).join("")}{" "}
                    {reactionSummary.totalCount}
                  </span>
                )}
                <span>
                  💬 {comments.length} {t.community_comments_title}
                </span>
              </div>
            </>
          )}
        </header>

        {/* Scrollable Comments List */}
        <div
          ref={bodyScrollRef}
          className="comment-sheet-body"
          onScroll={handleScrollComments}
        >
          <CommentList
            post={post}
            currentUid={cleanUid}
            currentUserName={cleanName}
            loadingComments={loadingComments}
            speakingId={speakingId}
            showCrisisBanner={hasCrisisReply}
            onToggleTts={handleToggleTts}
            onToggleCommentLike={(commentId) => void handleToggleCommentLike(commentId)}
            onReply={(commentId, userName) => {
              setEditTarget(null);
              setReplyTarget({ commentId, userName });
            }}
            onEditComment={(commentId, initialText) => {
              setReplyTarget(null);
              setEditTarget({ kind: "comment", commentId, initialText });
            }}
            onDeleteComment={(commentId) => void handleDeleteComment(commentId)}
            onEditReply={(commentId, replyId, initialText) => {
              setReplyTarget(null);
              setEditTarget({
                kind: "reply",
                commentId,
                replyId,
                initialText,
              });
            }}
            onDeleteReply={(commentId, replyId) =>
              void handleDeleteReply(commentId, replyId)
            }
            onOpenHelp={
              onOpenHelp
                ? () => {
                    onClose();
                    onOpenHelp();
                  }
                : undefined
            }
            commentsEndRef={commentsEndRef}
          />
        </div>

        {/* Pinned Bottom CommentComposer (Text + Voice + Reply chip + Edit banner) */}
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
      </div>
    </div>,
    document.body,
  );
}

export default CommentSheet;
