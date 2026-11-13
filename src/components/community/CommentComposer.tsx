import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AppLanguage } from "../../i18n/translations";
import { VoiceRecorder, formatAudioDuration } from "../../services/voiceService";
import {
  prefersReducedMotion,
  triggerSubtleHaptic,
} from "../../utils/communityPostHelpers";

export interface CommentReplyContext {
  commentId: string;
  userName: string;
}

export interface CommentEditContext {
  kind: "comment" | "reply";
  commentId: string;
  replyId?: string;
  initialText: string;
}

export interface CommentComposerProps {
  authorName: string;
  language: AppLanguage;
  replyTarget: CommentReplyContext | null;
  editTarget: CommentEditContext | null;
  submitting: boolean;
  error: string | null;
  canRetry?: boolean;
  onRetry?: () => void;
  onClearReply: () => void;
  onCancelEdit: () => void;
  onClearError: () => void;
  onSubmitText: (text: string) => Promise<boolean>;
  onSubmitVoice: (audio: { dataUrl: string; duration: number }) => Promise<boolean>;
}

const MAX_VOICE_SECONDS = 60;
const SEND_COOLDOWN_MS = 1200;

export function CommentComposer({
  authorName,
  language,
  replyTarget,
  editTarget,
  submitting,
  error,
  canRetry = false,
  onRetry,
  onClearReply,
  onCancelEdit,
  onClearError,
  onSubmitText,
  onSubmitVoice,
}: CommentComposerProps) {
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [text, setText] = useState("");
  const [cooldownActive, setCooldownActive] = useState(false);

  // Voice mode state (reusing VoiceRecorder from voiceService.ts)
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0.18);
  const [recordedAudio, setRecordedAudio] = useState<{
    blob: Blob;
    dataUrl: string;
    duration: number;
  } | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const pointerDownTimeRef = useRef<number>(0);
  const holdModeRef = useRef<boolean>(false);
  const cooldownTimerRef = useRef<number | null>(null);

  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    if (editTarget) {
      setMode("text");
      setText(editTarget.initialText);
      window.setTimeout(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          el.style.height = "auto";
          el.style.height = `${Math.min(el.scrollHeight, 108)}px`;
        }
      }, 40);
    }
  }, [editTarget]);

  useEffect(() => {
    if (replyTarget && mode === "text") {
      window.setTimeout(() => textareaRef.current?.focus(), 40);
    }
  }, [replyTarget, mode]);

  useEffect(() => {
    return () => {
      if (recorderRef.current) recorderRef.current.cancel();
      if (previewAudioRef.current) previewAudioRef.current.pause();
      if (cooldownTimerRef.current !== null) {
        window.clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const startCooldown = () => {
    setCooldownActive(true);
    if (cooldownTimerRef.current !== null) {
      window.clearTimeout(cooldownTimerRef.current);
    }
    cooldownTimerRef.current = window.setTimeout(() => {
      setCooldownActive(false);
    }, SEND_COOLDOWN_MS);
  };

  const cleanupPreviewAudio = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPlayingPreview(false);
  };

  const handleStartRecording = async () => {
    try {
      cleanupPreviewAudio();
      if (!recorderRef.current) {
        recorderRef.current = new VoiceRecorder();
      }
      setMicError(null);
      setRecordedAudio(null);
      setRecordingSeconds(0);
      setRecording(true);
      triggerSubtleHaptic(12);

      await recorderRef.current.start({
        onVolumeChange: (vol) => setVolumeLevel(vol),
        onTimeUpdate: (sec) => setRecordingSeconds(sec),
        maxDurationSeconds: MAX_VOICE_SECONDS,
        onMaxDurationReached: () => {
          void handleStopRecording();
        },
      });
    } catch (err: any) {
      setRecording(false);
      setMicError(
        err?.message ||
          (language === "Bahasa Melayu"
            ? "Mikrofon disekat dalam persekitaran ini. Cuba komen teks."
            : language === "中文"
              ? "当前预览环境无法访问麦克风，请改用文字评论。"
              : "Microphone is unavailable here. You can still leave a text comment."),
      );
    }
  };

  const handleStopRecording = async () => {
    if (!recorderRef.current || !recording) return;
    setRecording(false);
    try {
      const result = await recorderRef.current.stop();
      setRecordedAudio(result);
      triggerSubtleHaptic(8);
    } catch {
      setMicError(
        language === "Bahasa Melayu"
          ? "Gagal menyimpan audio."
          : language === "中文"
            ? "无法保存录音。"
            : "Could not finish recording.",
      );
    }
  };

  const handleDiscardVoice = () => {
    cleanupPreviewAudio();
    if (recording && recorderRef.current) {
      recorderRef.current.cancel();
      setRecording(false);
    }
    setRecordedAudio(null);
    setRecordingSeconds(0);
    setMicError(null);
  };

  const handleTogglePreview = () => {
    if (!recordedAudio) return;
    if (!previewAudioRef.current) {
      const audio = new Audio(recordedAudio.dataUrl);
      audio.onended = () => setIsPlayingPreview(false);
      previewAudioRef.current = audio;
    }
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current
        .play()
        .then(() => setIsPlayingPreview(true))
        .catch(() => setIsPlayingPreview(false));
    }
  };

  const handleTextSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const clean = text.trim();
    if (!clean || submitting || cooldownActive) return;

    const ok = await onSubmitText(clean);
    if (ok) {
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "38px";
      }
      startCooldown();
    }
  };

  const handleVoiceSend = async () => {
    if (!recordedAudio || submitting || cooldownActive) return;
    cleanupPreviewAudio();
    const ok = await onSubmitVoice({
      dataUrl: recordedAudio.dataUrl,
      duration: Math.max(1, recordedAudio.duration || recordingSeconds || 1),
    });
    if (ok) {
      setRecordedAudio(null);
      setRecordingSeconds(0);
      setMode("text");
      startCooldown();
    }
  };

  const switchToVoice = () => {
    if (editTarget) return;
    onClearError();
    setMicError(null);
    setMode("voice");
  };

  const switchToText = () => {
    handleDiscardVoice();
    onClearError();
    setMode("text");
    window.setTimeout(() => textareaRef.current?.focus(), 40);
  };

  const hasText = Boolean(text.trim());

  const writePlaceholder = replyTarget
    ? language === "Bahasa Melayu"
      ? `Balas ${replyTarget.userName} dengan lembut…`
      : language === "中文"
        ? `温柔回复 ${replyTarget.userName}…`
        : `Reply kindly to ${replyTarget.userName}…`
    : editTarget
      ? language === "Bahasa Melayu"
        ? "Kemas kini komen anda…"
        : language === "中文"
          ? "编辑你的评论…"
          : "Edit your comment…"
      : language === "Bahasa Melayu"
        ? "Tulis sesuatu yang baik…"
        : language === "中文"
          ? "写下温暖的话语…"
          : "Write something kind…";

  return (
    <footer className="comment-sheet-composer-wrap">
      {/* Reply / Edit Context Chip */}
      {(replyTarget || editTarget) && (
        <div className="composer-context-banner">
          <span className="composer-context-text">
            {editTarget
              ? language === "Bahasa Melayu"
                ? "Mengedit komen"
                : language === "中文"
                  ? "正在编辑评论"
                  : "Editing comment"
              : language === "Bahasa Melayu"
                ? `Membalas ${replyTarget?.userName}`
                : language === "中文"
                  ? `回复 ${replyTarget?.userName}`
                  : `Replying to ${replyTarget?.userName}`}
          </span>
          <button
            type="button"
            className="composer-context-cancel"
            onClick={() => {
              if (editTarget) {
                setText("");
                onCancelEdit();
              } else {
                onClearReply();
              }
            }}
            aria-label={
              language === "Bahasa Melayu"
                ? "Batal"
                : language === "中文"
                  ? "取消"
                  : "Cancel"
            }
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="composer-mini-svg">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      )}

      {/* Inline Moderation / Network Error + Retry */}
      {(error || micError) && (
        <div className="composer-error-row" role="alert">
          <span className="sheet-inline-error">{error || micError}</span>
          {error && canRetry && onRetry && (
            <button
              type="button"
              className="composer-retry-btn"
              onClick={onRetry}
              disabled={submitting}
            >
              {language === "Bahasa Melayu"
                ? "Cuba lagi"
                : language === "中文"
                  ? "重试"
                  : "Retry"}
            </button>
          )}
        </div>
      )}

      {/* TEXT MODE — Matches ONY Chatbot's rounded .chat-input-bar pill */}
      {mode === "text" ? (
        <form
          className="comment-input-bar"
          onSubmit={handleTextSubmit}
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest("button")) {
              textareaRef.current?.focus();
            }
          }}
        >
          <textarea
            ref={textareaRef}
            className="comment-chat-textarea"
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) onClearError();
              const el = e.target;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 108)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleTextSubmit();
              }
            }}
            placeholder={writePlaceholder}
            aria-label={`${writePlaceholder} (${authorName})`}
            maxLength={1000}
          />

          <div className="comment-bar-actions">
            {!editTarget && (
              <button
                type="button"
                className="comment-bar-icon-btn mic-btn"
                onClick={switchToVoice}
                aria-label={
                  language === "Bahasa Melayu"
                    ? "Rakam komen suara"
                    : language === "中文"
                      ? "切换语音评论"
                      : "Record voice comment"
                }
                title={
                  language === "Bahasa Melayu"
                    ? "Komen suara"
                    : language === "中文"
                      ? "语音评论"
                      : "Voice comment"
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" />
                </svg>
              </button>
            )}

            <button
              type="submit"
              className={`comment-bar-icon-btn send-btn ${hasText ? "ready" : ""}`}
              disabled={!hasText || submitting || cooldownActive}
              aria-label={
                editTarget
                  ? language === "Bahasa Melayu"
                    ? "Simpan perubahan"
                    : language === "中文"
                      ? "保存修改"
                      : "Save comment"
                  : language === "Bahasa Melayu"
                    ? "Hantar komen"
                    : language === "中文"
                      ? "发送评论"
                      : "Send comment"
              }
            >
              {editTarget ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
                  <path d="m5 12 5 5 9-9" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* VOICE RECORDING / PREVIEW MODE — Matches ONY Chatbot's voice-mode pill */
        <div className="comment-input-bar voice-mode">
          {!recordedAudio ? (
            <>
              <button
                type="button"
                className="comment-bar-icon-btn keyboard-toggle-btn"
                onClick={switchToText}
                aria-label={
                  language === "Bahasa Melayu"
                    ? "Kembali ke papan kekunci"
                    : language === "中文"
                      ? "切回文字输入"
                      : "Switch to text keyboard"
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
                  <rect x="3" y="6" width="18" height="12" rx="3" />
                  <path d="M7 10h2M11 10h2M15 10h2M8 14h8" />
                </svg>
              </button>

              <div className="voice-recording-track">
                {recording ? (
                  <>
                    <div
                      className={`voice-live-waves mini ${reducedMotion ? "reduced" : ""}`}
                      aria-hidden="true"
                    >
                      {[0.7, 1.0, 0.8, 1.1, 0.65].map((mult, idx) => (
                        <span
                          key={idx}
                          style={{
                            height: `${Math.max(4, Math.min(22, Math.round(volumeLevel * 24 * mult)))}px`,
                          }}
                        />
                      ))}
                    </div>
                    <strong className="voice-timer-text">
                      {formatAudioDuration(recordingSeconds)} / 01:00
                    </strong>
                  </>
                ) : (
                  <span className="voice-idle-hint">
                    {language === "Bahasa Melayu"
                      ? "Ketik atau tahan · maks 60s"
                      : language === "中文"
                        ? "轻点或长按录音 · 最长 60 秒"
                        : "Tap or hold to record · max 60s"}
                  </span>
                )}
              </div>

              <button
                type="button"
                className={`voice-record-circle-btn ${recording ? "is-recording" : ""}`}
                onPointerDown={() => {
                  pointerDownTimeRef.current = Date.now();
                  holdModeRef.current = false;
                  if (!recording) {
                    holdModeRef.current = true;
                    void handleStartRecording();
                  }
                }}
                onPointerUp={() => {
                  const elapsed = Date.now() - pointerDownTimeRef.current;
                  if (recording && holdModeRef.current && elapsed > 360) {
                    holdModeRef.current = false;
                    void handleStopRecording();
                  }
                }}
                onClick={() => {
                  const elapsed = Date.now() - pointerDownTimeRef.current;
                  if (recording && elapsed < 360 && !holdModeRef.current) {
                    void handleStopRecording();
                  } else if (recording && holdModeRef.current && elapsed < 360) {
                    holdModeRef.current = false;
                  }
                }}
                aria-label={
                  recording
                    ? language === "Bahasa Melayu"
                      ? "Henti merakam"
                      : language === "中文"
                        ? "停止录音"
                        : "Stop recording"
                    : language === "Bahasa Melayu"
                      ? "Mula rakam suara"
                      : language === "中文"
                        ? "开始录音"
                        : "Start voice recording"
                }
              >
                {recording ? (
                  <span className="voice-stop-square" aria-hidden="true" />
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" />
                  </svg>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="comment-bar-icon-btn keyboard-toggle-btn"
                onClick={switchToText}
                aria-label={
                  language === "Bahasa Melayu"
                    ? "Tukar ke teks"
                    : language === "中文"
                      ? "切回文字"
                      : "Switch to text"
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
                  <rect x="3" y="6" width="18" height="12" rx="3" />
                  <path d="M7 10h2M11 10h2M15 10h2M8 14h8" />
                </svg>
              </button>

              <button
                type="button"
                className="voice-preview-play-btn"
                onClick={handleTogglePreview}
                aria-label={
                  isPlayingPreview
                    ? language === "Bahasa Melayu"
                      ? "Jeda pratonton"
                      : language === "中文"
                        ? "暂停试听"
                        : "Pause preview"
                    : language === "Bahasa Melayu"
                      ? "Main pratonton"
                      : language === "中文"
                        ? "试听录音"
                        : "Play preview"
                }
              >
                {isPlayingPreview ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
                    <path d="M8 5v14M16 5v14" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
                    <polygon points="7,5 19,12 7,19" fill="currentColor" stroke="none" />
                  </svg>
                )}
              </button>

              <div className="voice-preview-meta">
                <div className="voice-static-bars" aria-hidden="true">
                  {[8, 14, 18, 11, 16, 9, 13].map((h, i) => (
                    <span key={i} style={{ height: `${h}px` }} />
                  ))}
                </div>
                <span className="voice-timer-text">
                  {formatAudioDuration(recordedAudio.duration || recordingSeconds)}
                </span>
              </div>

              <button
                type="button"
                className="voice-rerecord-btn"
                onClick={handleDiscardVoice}
              >
                {language === "Bahasa Melayu"
                  ? "Ulang"
                  : language === "中文"
                    ? "重录"
                    : "Re-record"}
              </button>

              <button
                type="button"
                className="comment-bar-icon-btn send-btn ready"
                disabled={submitting || cooldownActive}
                onClick={() => void handleVoiceSend()}
                aria-label={
                  language === "Bahasa Melayu"
                    ? "Hantar komen suara"
                    : language === "中文"
                      ? "发送语音评论"
                      : "Send voice comment"
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </footer>
  );
}

export default CommentComposer;
