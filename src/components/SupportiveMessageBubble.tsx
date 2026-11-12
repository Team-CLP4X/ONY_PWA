import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import {
  translateCommunityText,
  transcribeCommunityVoice,
  getCachedTranslation,
  getCachedTranscript,
} from "../services/communityTranslationService";
import { formatAudioDuration, playSoothingChime } from "../services/voiceService";

export interface SupportiveMessageBubbleProps {
  id: string;
  kind: "text" | "voice";
  text?: string;
  audioUrl?: string;
  audioDuration?: number;
  transcription?: string;
  isMe?: boolean;
  senderAnonymous?: string;
  timeDisplay?: string;
  recipientAnonymous?: string;
  toYou?: boolean;
  autoTranslate?: boolean;
  language?: string;
  notify?: (msg: string) => void;
  onReport?: (id: string) => void;
  onDelete?: (id: string) => void;
}

/**
 * Normalizes any sender label so languages are never mixed (e.g. English UI always says "Anonymous Member #607")
 */
function formatSenderLabel(rawSender: string | undefined, isMe: boolean, language: string): string {
  if (isMe) {
    if (language === "Bahasa Melayu") return "Anda (Tanpa Nama)";
    if (language === "中文") return "您 (匿名)";
    return "You (Anonymous)";
  }

  const s = (rawSender || "").trim();
  // Extract number if present: #607, #928, etc.
  const numMatch = /#?(\d+)/.exec(s);
  const idSuffix = numMatch ? `#${numMatch[1]}` : "";

  if (s.toLowerCase().includes("friend") || s.includes("Teman") || s.includes("朋友")) {
    if (language === "Bahasa Melayu") return `Sahabat Tanpa Nama ${idSuffix}`.trim();
    if (language === "中文") return `匿名挚友 ${idSuffix}`.trim();
    return `Anonymous Friend ${idSuffix}`.trim();
  }

  if (language === "Bahasa Melayu") {
    return idSuffix ? `Ahli Tanpa Nama ${idSuffix}` : "Ahli Tanpa Nama";
  }
  if (language === "中文") {
    return idSuffix ? `匿名成员 ${idSuffix}` : "匿名成员";
  }
  return idSuffix ? `Anonymous Member ${idSuffix}` : "Anonymous Member";
}

export function SupportiveMessageBubble({
  id,
  kind,
  text = "",
  audioUrl,
  audioDuration = 8,
  transcription,
  isMe = false,
  senderAnonymous,
  timeDisplay,
  toYou = false,
  autoTranslate = true,
  notify = () => {},
  onReport,
  onDelete,
}: SupportiveMessageBubbleProps) {
  const { t, language } = useLanguage();

  // Menu popup state for Report / Delete
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Text message translation state
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(() =>
    getCachedTranslation(text, language),
  );
  const [isTranslating, setIsTranslating] = useState(false);

  // Voice note playback state
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Voice note transcript & translation state
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcriptText, setTranscriptText] = useState<string | null>(() =>
    getCachedTranscript(id, audioUrl) || transcription || null,
  );
  const [isTranscribing, setIsTranscribing] = useState(false);

  const [showVoiceTranslation, setShowVoiceTranslation] = useState(false);
  const [translatedVoiceText, setTranslatedVoiceText] = useState<string | null>(() =>
    transcriptText ? getCachedTranslation(transcriptText, language) : null,
  );
  const [isTranslatingVoice, setIsTranslatingVoice] = useState(false);

  // Close popup menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [menuOpen]);

  // Handle auto-translation if enabled by user settings
  useEffect(() => {
    if (!autoTranslate || isMe) return;

    if (kind === "text" && text) {
      // Check if text is likely in a different language
      const cached = getCachedTranslation(text, language);
      if (cached) {
        setTranslatedText(cached);
        setShowTranslation(true);
      } else {
        // Auto-fetch translation in background
        let isCurrent = true;
        void translateCommunityText(text, language)
          .then((result) => {
            if (isCurrent && result && result !== text) {
              setTranslatedText(result);
              setShowTranslation(true);
            }
          })
          .catch(() => {});
        return () => {
          isCurrent = false;
        };
      }
    }
  }, [autoTranslate, kind, text, language, isMe]);

  // --- Voice Note Playback ---
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
          notify(
            language === "Bahasa Melayu"
              ? "Tidak dapat memainkan nota suara"
              : language === "中文"
                ? "无法播放语音留言"
                : "Unable to play voice note",
          );
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
            notify(
              language === "Bahasa Melayu"
                ? "Audio disekat oleh pelayar"
                : language === "中文"
                  ? "浏览器拦截了音频播放"
                  : "Audio playback blocked by browser",
            );
          });
      }
    } else {
      // Calming chime fallback
      if (playing) {
        setPlaying(false);
      } else {
        setPlaying(true);
        void playSoothingChime(audioDuration).then(() => setPlaying(false));
      }
    }
  };

  // --- Text Translation Handler ---
  const handleToggleTextTranslation = async () => {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }

    if (translatedText) {
      setShowTranslation(true);
      return;
    }

    setIsTranslating(true);
    try {
      const translated = await translateCommunityText(text, language);
      setTranslatedText(translated);
      setShowTranslation(true);
      notify(
        language === "Bahasa Melayu"
          ? "Diterjemah ke Bahasa Melayu"
          : language === "中文"
            ? "已翻译为中文"
            : "Translated to English",
      );
    } catch {
      notify(
        language === "Bahasa Melayu"
          ? "Gagal menterjemah teks"
          : language === "中文"
            ? "翻译未能完成"
            : "Translation failed",
      );
    } finally {
      setIsTranslating(false);
    }
  };

  // --- Voice Transcription Handler ---
  const handleFetchTranscript = async () => {
    if (showTranscript) {
      setShowTranscript(false);
      return;
    }

    if (transcriptText) {
      setShowTranscript(true);
      return;
    }

    setIsTranscribing(true);
    try {
      const result = await transcribeCommunityVoice({
        messageId: id,
        audioUrl,
        audioDuration,
        existingCaption: text,
        existingTranscription: transcription,
      });
      setTranscriptText(result);
      setShowTranscript(true);
      notify(
        language === "Bahasa Melayu"
          ? "Teks suara berjaya didapatkan"
          : language === "中文"
            ? "已获取语音文字"
            : "Voice text retrieved",
      );
    } catch {
      notify(
        language === "Bahasa Melayu"
          ? "Tidak dapat mendapatkan teks suara"
          : language === "中文"
            ? "未能获取语音文字"
            : "Could not fetch voice text",
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  // --- Voice Transcript Translation Handler ---
  const handleToggleVoiceTranslation = async () => {
    if (!transcriptText) return;

    if (showVoiceTranslation) {
      setShowVoiceTranslation(false);
      return;
    }

    if (translatedVoiceText) {
      setShowVoiceTranslation(true);
      return;
    }

    setIsTranslatingVoice(true);
    try {
      const translated = await translateCommunityText(transcriptText, language);
      setTranslatedVoiceText(translated);
      setShowVoiceTranslation(true);
      notify(
        language === "Bahasa Melayu"
          ? "Transkripsi diterjemah ke Bahasa Melayu"
          : language === "中文"
            ? "语音内容已翻译为中文"
            : "Voice transcript translated to English",
      );
    } catch {
      notify(
        language === "Bahasa Melayu"
          ? "Gagal menterjemah transkripsi suara"
          : language === "中文"
            ? "未能翻译语音转写内容"
            : "Could not translate voice transcript",
      );
    } finally {
      setIsTranslatingVoice(false);
    }
  };

  const displayText = showTranslation && translatedText ? translatedText : text;
  const displayVoiceText =
    showVoiceTranslation && translatedVoiceText ? translatedVoiceText : transcriptText;

  const senderLabel = formatSenderLabel(senderAnonymous, isMe, language);

  return (
    <div className={`support-bubble-row ${isMe ? "me" : "member"}`} key={id}>
      {!isMe && (
        <div className="support-bubble-avatar" aria-hidden="true">
          {kind === "voice" ? "🎙️" : "🌱"}
        </div>
      )}

      <div className="support-bubble-col">
        <div className="support-bubble-meta">
          <strong className="support-bubble-sender">{senderLabel}</strong>
          {timeDisplay && <small>{timeDisplay}</small>}

          {/* Action Menu (...) */}
          {(onReport || onDelete) && (
            <div className="support-bubble-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="support-bubble-more-btn"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Message options"
                title="Message options"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </button>

              {menuOpen && (
                <div className="support-bubble-dropdown" role="menu">
                  {onReport && (
                    <button
                      type="button"
                      className="support-dropdown-item"
                      onClick={() => {
                        setMenuOpen(false);
                        onReport(id);
                      }}
                      role="menuitem"
                    >
                      {language === "Bahasa Melayu" ? "Laporkan" : language === "中文" ? "举报" : "Report"}
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="support-dropdown-item danger"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(id);
                      }}
                      role="menuitem"
                    >
                      {language === "Bahasa Melayu" ? "Padam" : language === "中文" ? "删除" : "Delete"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`support-bubble ${isMe ? "me" : "member"}`}>
          {kind === "text" ? (
            <div className="support-text-content">
              <p className="support-text-sentence">{displayText}</p>

              <div className="support-translation-controls">
                {showTranslation && (
                  <span className="support-translated-badge">
                    <span className="lang-icon">🌐</span>
                    <small>
                      {language === "Bahasa Melayu"
                        ? "Diterjemah"
                        : language === "中文"
                          ? "已翻译"
                          : "Translated"}
                    </small>
                  </span>
                )}

                <button
                  type="button"
                  className={`support-translate-btn ${showTranslation ? "active" : ""}`}
                  onClick={() => void handleToggleTextTranslation()}
                  disabled={isTranslating}
                  aria-label={
                    showTranslation
                      ? t.community_show_original
                      : `${t.community_translate_btn} (${language})`
                  }
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
                  ) : translatedText ? (
                    <>
                      <span className="btn-icon">🌐</span>
                      <span>{t.community_show_translation}</span>
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🌐</span>
                      <span>
                        {t.community_translate_btn} ({language})
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="support-voice-content">
              <div className="voice-note">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={togglePlay}
                  aria-label={playing ? "Pause voice message" : "Play voice message"}
                >
                  <span className="voice-play-icon">{playing ? "⏸" : "▶"}</span>
                </button>
                <span className={playing ? "playing" : ""}>
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

              <div className="support-voice-actions-bar">
                <button
                  type="button"
                  className={`support-transcript-toggle-btn ${showTranscript ? "active" : ""}`}
                  onClick={() => void handleFetchTranscript()}
                  disabled={isTranscribing}
                >
                  {isTranscribing ? (
                    <>
                      <span className="support-spinner mini" />
                      <span>{t.community_transcribing}</span>
                    </>
                  ) : showTranscript ? (
                    <>
                      <span className="btn-icon">📝</span>
                      <span>{t.community_hide_transcript}</span>
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">📝</span>
                      <span>{t.community_fetch_transcript}</span>
                    </>
                  )}
                </button>
              </div>

              {showTranscript && (
                <div className="support-voice-transcript-card">
                  <div className="support-transcript-header">
                    <span className="transcript-tag">
                      <span className="btn-icon">🎙️</span>
                      <strong>{t.community_voice_transcript}</strong>
                    </span>
                    {showVoiceTranslation && (
                      <span className="support-translated-badge">
                        <small>
                          {language === "Bahasa Melayu"
                            ? "Diterjemah"
                            : language === "中文"
                              ? "已翻译"
                              : "Translated"}
                        </small>
                      </span>
                    )}
                  </div>

                  <p className="support-transcript-text">
                    "{displayVoiceText}"
                  </p>

                  <div className="support-transcript-footer">
                    <button
                      type="button"
                      className={`support-translate-btn voice ${showVoiceTranslation ? "active" : ""}`}
                      onClick={() => void handleToggleVoiceTranslation()}
                      disabled={isTranslatingVoice}
                      aria-label={
                        showVoiceTranslation
                          ? t.community_show_original
                          : `${t.community_translate_transcript} (${language})`
                      }
                    >
                      {isTranslatingVoice ? (
                        <>
                          <span className="support-spinner mini" />
                          <span>{t.community_translating}</span>
                        </>
                      ) : showVoiceTranslation ? (
                        <>
                          <span className="btn-icon">↩</span>
                          <span>{t.community_show_original}</span>
                        </>
                      ) : translatedVoiceText ? (
                        <>
                          <span className="btn-icon">🌐</span>
                          <span>{t.community_show_translation}</span>
                        </>
                      ) : (
                        <>
                          <span className="btn-icon">🌐</span>
                          <span>
                            {t.community_translate_transcript} ({language})
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Named alias so both names can be used seamlessly
export const MessageBubble = SupportiveMessageBubble;
export default SupportiveMessageBubble;
