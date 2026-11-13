import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  FirestoreCommunityPost,
  PostCommentRecord,
} from "../../firebase/firestore";
import { useLanguage } from "../../i18n/LanguageContext";
import { formatFriendlyTime, type AppLanguage } from "../../i18n/translations";
import { transcribeCommunityVoice } from "../../services/communityTranslationService";
import {
  formatAudioDuration,
  playSoothingChime,
} from "../../services/voiceService";
import { containsCrisisLanguage } from "../../utils/communityPostHelpers";

interface CommentVoicePlayerProps {
  itemId: string;
  audioUrl?: string;
  audioDuration?: number;
  existingTranscription?: string;
  fallbackText?: string;
  language: AppLanguage;
}

function CommentVoicePlayer({
  itemId,
  audioUrl,
  audioDuration = 5,
  existingTranscription,
  fallbackText,
  language,
}: CommentVoicePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(
    existingTranscription?.trim() || null,
  );
  const [transcribing, setTranscribing] = useState(false);
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
        audio.onended = () => setPlaying(false);
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
            void playSoothingChime();
            window.setTimeout(() => setPlaying(false), 1800);
          });
      }
    } else {
      if (playing) {
        setPlaying(false);
      } else {
        setPlaying(true);
        void playSoothingChime();
        window.setTimeout(
          () => setPlaying(false),
          Math.min(3500, audioDuration * 450),
        );
      }
    }
  };

  const handleToggleTranscript = async () => {
    if (showTranscript) {
      setShowTranscript(false);
      return;
    }
    setShowTranscript(true);
    if (transcript || transcribing) return;

    setTranscribing(true);
    try {
      const result = await transcribeCommunityVoice({
        messageId: itemId,
        audioUrl,
        audioDuration,
        existingCaption: fallbackText,
        existingTranscription,
      });
      setTranscript(result);
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <div className="comment-voice-block">
      <div className="comment-voice-pill">
        <button
          type="button"
          className={`comment-voice-play-btn ${playing ? "playing" : ""}`}
          onClick={togglePlay}
          aria-label={
            playing
              ? language === "Bahasa Melayu"
                ? "Jeda nota suara"
                : language === "中文"
                  ? "暂停语音"
                  : "Pause voice comment"
              : language === "Bahasa Melayu"
                ? "Main nota suara"
                : language === "中文"
                  ? "播放语音"
                  : "Play voice comment"
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

        <div
          className={`comment-voice-wave ${playing ? "is-playing" : ""}`}
          aria-hidden="true"
        >
          {[8, 14, 18, 12, 16, 10, 15, 9].map((h, i) => (
            <span key={i} style={{ height: `${h}px` }} />
          ))}
        </div>

        <span className="comment-voice-dur">
          {formatAudioDuration(audioDuration || 1)}
        </span>
      </div>

      <button
        type="button"
        className="comment-transcript-link"
        onClick={() => void handleToggleTranscript()}
      >
        {showTranscript
          ? language === "Bahasa Melayu"
            ? "Sembunyi transkrip"
            : language === "中文"
              ? "收起文字记录"
              : "Hide transcript"
          : language === "Bahasa Melayu"
            ? "Lihat transkrip"
            : language === "中文"
              ? "查看文字记录"
              : "View transcript"}
      </button>

      {showTranscript && (
        <p className="comment-transcript-box">
          {transcribing
            ? language === "Bahasa Melayu"
              ? "Mentranskripsi suara…"
              : language === "中文"
                ? "正在转换文字…"
                : "Transcribing voice note…"
            : transcript || fallbackText}
        </p>
      )}
    </div>
  );
}

interface OwnerOverflowMenuProps {
  canEdit: boolean;
  editLabel: string;
  deleteLabel: string;
  ariaLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}

function OwnerOverflowMenu({
  canEdit,
  editLabel,
  deleteLabel,
  ariaLabel,
  onEdit,
  onDelete,
}: OwnerOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: 80,
    left: 160,
  });
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current || typeof window === "undefined") return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuW = 164;
    const estH = (canEdit ? 2 : 1) * 44 + 18;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const top =
      vh - rect.bottom - 10 < estH && rect.top > estH + 10
        ? Math.max(8, rect.top - estH - 4)
        : Math.min(vh - estH - 8, rect.bottom + 4);
    const left = Math.max(10, Math.min(rect.right - menuW, vw - menuW - 10));
    setCoords({ top, left });
  }, [open, canEdit]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!btnRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside, { passive: true });
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`sheet-comment-more-btn ${open ? "is-open" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="comment-more-svg">
          <circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none" />
        </svg>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="ony-portal-menu comment-owner-portal-menu"
            role="menu"
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            {canEdit && (
              <button
                type="button"
                role="menuitem"
                className="ony-portal-menu-item"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
              >
                <span className="ony-portal-menu-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="post-menu-svg">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </span>
                <span className="ony-portal-menu-label">{editLabel}</span>
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              className="ony-portal-menu-item danger"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              <span className="ony-portal-menu-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="post-menu-svg">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
              </span>
              <span className="ony-portal-menu-label">{deleteLabel}</span>
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

export interface CommentListProps {
  post: FirestoreCommunityPost;
  currentUid: string;
  currentUserName: string;
  loadingComments?: boolean;
  speakingId: string | null;
  showCrisisBanner?: boolean;
  onToggleTts: (id: string, textToRead: string) => void;
  onToggleCommentLike: (commentId: string) => void;
  onReply: (commentId: string, userName: string) => void;
  onEditComment: (commentId: string, initialText: string) => void;
  onDeleteComment: (commentId: string) => void;
  onEditReply: (commentId: string, replyId: string, initialText: string) => void;
  onDeleteReply: (commentId: string, replyId: string) => void;
  onOpenHelp?: () => void;
  commentsEndRef?: React.RefObject<HTMLDivElement | null>;
}

export function CommentList({
  post,
  currentUid,
  currentUserName,
  loadingComments = false,
  speakingId,
  showCrisisBanner,
  onToggleTts,
  onToggleCommentLike,
  onReply,
  onEditComment,
  onDeleteComment,
  onEditReply,
  onDeleteReply,
  onOpenHelp,
  commentsEndRef,
}: CommentListProps) {
  const { t, language } = useLanguage();

  const cleanUid = currentUid.trim() || "anonymous_user";
  const cleanName = currentUserName.trim() || "ONY Member";
  const comments: PostCommentRecord[] = Array.isArray(post.comments)
    ? post.comments
    : [];

  const computedCrisis =
    showCrisisBanner ??
    (containsCrisisLanguage(post.title, post.body) ||
      comments.some(
        (c) =>
          containsCrisisLanguage(c.text) ||
          (c.replies || []).some((r) => containsCrisisLanguage(r.text)),
      ));

  const isOwnedByCurrentUser = (recordUserId?: string, recordUserName?: string) => {
    if (recordUserId && recordUserId === cleanUid) return true;
    const normRecord = (recordUserName || "").trim().toLowerCase();
    const normCurrent = cleanName.toLowerCase();
    return (
      Boolean(normRecord) &&
      (normRecord === normCurrent ||
        normRecord === `${normCurrent} · ony profile` ||
        normRecord === "my ony profile")
    );
  };

  const likeLabel =
    language === "Bahasa Melayu" ? "Suka" : language === "中文" ? "暖心" : "Like";
  const replyLabel =
    language === "Bahasa Melayu" ? "Balas" : language === "中文" ? "回复" : "Reply";
  const listenLabel =
    language === "Bahasa Melayu" ? "Dengar" : language === "中文" ? "朗读" : "Listen";
  const stopListenLabel =
    language === "Bahasa Melayu" ? "Henti" : language === "中文" ? "停止" : "Stop";

  const emptyCommentText =
    language === "Bahasa Melayu"
      ? "Belum ada komen lagi. Katakan sesuatu yang lembut."
      : language === "中文"
        ? "还没有评论，来说一句温暖的话吧。"
        : "No comments yet. Say something kind.";

  const ownerMenuAria =
    language === "Bahasa Melayu"
      ? "Pilihan komen anda"
      : language === "中文"
        ? "评论操作菜单"
        : "Comment options";

  return (
    <div className="comment-list-region">
      {computedCrisis && (
        <div className="post-crisis-banner comment-crisis-banner" role="region">
          <div className="post-crisis-copy">
            <span aria-hidden="true">🤍</span>
            <span>
              {language === "Bahasa Melayu"
                ? "Jika anda perlukan teman bercakap sekarang, sokongan tersedia."
                : language === "中文"
                  ? "如果此刻感到沉重，请记得这里随时有即时心理支持。"
                  : "If you need someone right now, gentle support is available."}
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
                  ? "获取帮助"
                  : "Get support"}
            </button>
          )}
        </div>
      )}

      {loadingComments && comments.length === 0 ? (
        <div className="comment-skeleton-list" aria-busy="true">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="comment-skeleton-row">
              <span className="skeleton-circle" />
              <div className="skeleton-lines">
                <span className="skeleton-line w-40" />
                <span className="skeleton-line w-85" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="comment-sheet-empty">
          <span aria-hidden="true">🌱</span>
          <p>{emptyCommentText}</p>
        </div>
      ) : (
        <div className="comment-sheet-list">
          {comments.map((item) => {
            const commentLikeList = Array.isArray(item.likeRecords)
              ? item.likeRecords
              : [];
            const commentLikedByMe = commentLikeList.some(
              (l) =>
                l.userId === cleanUid ||
                l.userName.trim().toLowerCase() === cleanName.toLowerCase(),
            );
            const isMyComment = isOwnedByCurrentUser(item.userId, item.userName);
            const replies = Array.isArray(item.replies) ? item.replies : [];
            const isVoiceComment = item.kind === "voice" || Boolean(item.audioUrl);

            return (
              <div className="sheet-comment-row" key={item.id}>
                <span className="sheet-comment-avatar" aria-hidden="true">
                  {(item.userName[0] || "O").toUpperCase()}
                </span>

                <div className="sheet-comment-card">
                  <div className="sheet-comment-head">
                    <strong className="sheet-comment-author">
                      <span>{item.userName}</span>
                      {isMyComment && (
                        <span className="you-badge">{t.common_you}</span>
                      )}
                    </strong>
                    <div className="sheet-comment-head-right">
                      <small className="sheet-comment-time">
                        {formatFriendlyTime(item.createdAt, language)}
                        {item.updatedAt ? ` · ${t.common_edited}` : ""}
                      </small>
                      {isMyComment && (
                        <OwnerOverflowMenu
                          canEdit={!isVoiceComment}
                          editLabel={t.common_edit}
                          deleteLabel={t.common_delete}
                          ariaLabel={ownerMenuAria}
                          onEdit={() => onEditComment(item.id, item.text)}
                          onDelete={() => onDeleteComment(item.id)}
                        />
                      )}
                    </div>
                  </div>

                  {isVoiceComment ? (
                    <CommentVoicePlayer
                      itemId={item.id}
                      audioUrl={item.audioUrl}
                      audioDuration={item.audioDuration}
                      existingTranscription={item.transcription}
                      fallbackText={item.text}
                      language={language}
                    />
                  ) : (
                    <p className="sheet-comment-text">{item.text}</p>
                  )}

                  {/* Clean compact supportive actions */}
                  <div className="sheet-comment-actions-subtle">
                    <button
                      type="button"
                      className={`sheet-subtle-action ${commentLikedByMe ? "liked" : ""}`}
                      onClick={() => onToggleCommentLike(item.id)}
                      aria-pressed={commentLikedByMe}
                    >
                      <span aria-hidden="true">{commentLikedByMe ? "♥" : "♡"}</span>
                      <span>
                        {likeLabel}
                        {commentLikeList.length > 0 ? ` · ${commentLikeList.length}` : ""}
                      </span>
                    </button>

                    <button
                      type="button"
                      className="sheet-subtle-action"
                      onClick={() => onReply(item.id, item.userName)}
                    >
                      {replyLabel}
                    </button>

                    {!isVoiceComment && (
                      <button
                        type="button"
                        className={`sheet-subtle-action ${speakingId === item.id ? "liked" : ""}`}
                        onClick={() => onToggleTts(item.id, item.text)}
                      >
                        {speakingId === item.id ? stopListenLabel : listenLabel}
                      </button>
                    )}
                  </div>

                  {/* Nested Replies */}
                  {replies.length > 0 && (
                    <div className="sheet-replies-list">
                      {replies.map((rep) => {
                        const isMyReply = isOwnedByCurrentUser(
                          rep.userId,
                          rep.userName,
                        );
                        const isVoiceReply =
                          rep.kind === "voice" || Boolean(rep.audioUrl);

                        return (
                          <div key={rep.id} className="sheet-reply-item">
                            <div className="sheet-comment-head">
                              <strong className="sheet-comment-author">
                                <span>{rep.userName}</span>
                                {isMyReply && (
                                  <span className="you-badge">{t.common_you}</span>
                                )}
                              </strong>
                              <div className="sheet-comment-head-right">
                                <small className="sheet-comment-time">
                                  {formatFriendlyTime(rep.createdAt, language)}
                                  {rep.updatedAt ? ` · ${t.common_edited}` : ""}
                                </small>
                                {isMyReply && (
                                  <OwnerOverflowMenu
                                    canEdit={!isVoiceReply}
                                    editLabel={t.common_edit}
                                    deleteLabel={t.common_delete}
                                    ariaLabel={ownerMenuAria}
                                    onEdit={() =>
                                      onEditReply(item.id, rep.id, rep.text)
                                    }
                                    onDelete={() => onDeleteReply(item.id, rep.id)}
                                  />
                                )}
                              </div>
                            </div>

                            {isVoiceReply ? (
                              <CommentVoicePlayer
                                itemId={rep.id}
                                audioUrl={rep.audioUrl}
                                audioDuration={rep.audioDuration}
                                existingTranscription={rep.transcription}
                                fallbackText={rep.text}
                                language={language}
                              />
                            ) : (
                              <p className="sheet-comment-text">{rep.text}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {commentsEndRef && <div ref={commentsEndRef} />}
        </div>
      )}
    </div>
  );
}

export default CommentList;
