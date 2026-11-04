import { useState, useRef } from "react";
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
  notify: (msg: string) => void;
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
  notify,
}: SupportiveMessageBubbleProps) {
  const { t, language } = useLanguage();

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
      // Switch back to original
      setShowTranslation(false);
      return;
    }

    if (translatedText) {
      // Instant switch to existing translation
      setShowTranslation(true);
      return;
    }

    // Need to fetch translation
    setIsTranslating(true);
    try {
      const translated = await translateCommunityText(text, language);
      setTranslatedText(translated);
      setShowTranslation(true);
      notify(
        language === "Bahasa Melayu"
          ? `Diterjemah ke Bahasa Melayu`
          : language === "中文"
          ? `已翻译为中文`
          : `Translated to English`,
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
      // Toggle visibility
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
      // Switch back to original voice transcript
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
          ? `Transkripsi diterjemah ke Bahasa Melayu`
          : language === "中文"
          ? `语音内容已翻译为中文`
          : `Voice transcript translated to English`,
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

  return (
    <div className={`support-bubble-row ${isMe ? "me" : "member"}`} key={id}>
      {!isMe && (
        <div className="support-bubble-avatar" aria-hidden="true">
          {kind === "voice" ? "🎙️" : "🌱"}
        </div>
      )}

      <div className="support-bubble-col">
        <div className="support-bubble-meta">
          <strong>
            {isMe
              ? language === "Bahasa Melayu"
                ? "Anda (Tanpa Nama)"
                : language === "中文"
                ? "你 (匿名)"
                : "You (Anonymous)"
              : senderAnonymous ||
                (language === "Bahasa Melayu"
                  ? "Pengembara Tanpa Nama"
                  : language === "中文"
                  ? "匿名旅人"
                  : "Anonymous Traveler")}
          </strong>
          {toYou && (
            <span className="to-you-pill">
              {language === "Bahasa Melayu"
                ? "Kepada Anda"
                : language === "中文"
                ? "写给您"
                : "To You"}
            </span>
          )}
          {timeDisplay && <small>{timeDisplay}</small>}
        </div>

        <div className={`support-bubble ${isMe ? "me" : "member"}`}>
          {kind === "text" ? (
            <div className="support-text-content">
              <p className="support-text-sentence">{displayText}</p>

              {/* Translation Badge & Toggle Actions */}
              <div className="support-translation-controls">
                {showTranslation && (
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
              {/* Voice Audio Player Bar */}
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

              {/* Voice Actions: Fetch Voice Text / View Transcript */}
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

              {/* Expandable Voice Transcript Box with Translation & Switch buttons */}
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
