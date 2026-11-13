import { useEffect, useRef, useState } from "react";
import {
  getCachedTranscript,
  getCachedTranslation,
  transcribeCommunityVoice,
  translateCommunityText,
} from "../../services/communityTranslationService";
import { formatAudioDuration, playSoothingChime } from "../../services/voiceService";
import type { AppLanguage } from "../../i18n/translations";
import { getMyNodeStrings } from "../../utils/nodeInboxHelpers";

export interface VoiceMessagePlayerProps {
  messageId: string;
  audioUrl?: string;
  audioDuration?: number;
  existingCaption?: string;
  transcription?: string;
  autoTranslate: boolean;
  forceOriginal: boolean;
  language: string;
  onTranscriptResolved?: (messageId: string, transcript: string) => void;
  onTranslationStateChange?: (isTranslated: boolean, hasCachedTranslation: boolean) => void;
  onInteract?: () => void;
  onToggleForceOriginal?: () => void;
  notify?: (msg: string) => void;
}

export function VoiceMessagePlayer({
  messageId,
  audioUrl,
  audioDuration = 8,
  existingCaption,
  transcription,
  autoTranslate,
  forceOriginal,
  language,
  onTranscriptResolved,
  onTranslationStateChange,
  onInteract,
  onToggleForceOriginal,
  notify = () => {},
}: VoiceMessagePlayerProps) {
  const strings = getMyNodeStrings(language);
  const appLang = language as AppLanguage;

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playCancelledRef = useRef(false);

  const [showTranscript, setShowTranscript] = useState(false);
  const [transcriptText, setTranscriptText] = useState<string | null>(() =>
    getCachedTranscript(messageId, audioUrl) || transcription?.trim() || null,
  );
  const [isTranscribing, setIsTranscribing] = useState(false);

  const [translatedTranscript, setTranslatedTranscript] = useState<string | null>(() =>
    transcriptText ? getCachedTranslation(transcriptText, appLang) : null,
  );

  // Sync transcription prop changes
  useEffect(() => {
    const resolved = getCachedTranscript(messageId, audioUrl) || transcription?.trim() || null;
    if (resolved) {
      setTranscriptText(resolved);
      onTranscriptResolved?.(messageId, resolved);
    }
  }, [messageId, audioUrl, transcription]);

  // Cleanup audio element when message changes or unmounts
  useEffect(() => {
    playCancelledRef.current = false;
    return () => {
      playCancelledRef.current = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [messageId, audioUrl]);

  // Auto-translate transcript when available and autoTranslate is active
  useEffect(() => {
    if (!transcriptText) {
      onTranslationStateChange?.(false, false);
      return;
    }

    const cached = getCachedTranslation(transcriptText, appLang);
    if (cached && cached !== transcriptText) {
      setTranslatedTranscript(cached);
    }

    if (!autoTranslate) return;

    let active = true;
    void translateCommunityText(transcriptText, appLang)
      .then((res) => {
        if (!active) return;
        if (res && res !== transcriptText) {
          setTranslatedTranscript(res);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [transcriptText, autoTranslate, appLang]);

  const hasDiffTranslation = Boolean(
    translatedTranscript && transcriptText && translatedTranscript !== transcriptText,
  );
  const showingTranslated = Boolean(
    showTranscript && hasDiffTranslation && !forceOriginal,
  );

  useEffect(() => {
    onTranslationStateChange?.(showingTranslated, hasDiffTranslation);
  }, [showingTranslated, hasDiffTranslation]);

  const togglePlay = () => {
    onInteract?.();
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
      if (playing) {
        playCancelledRef.current = true;
        setPlaying(false);
      } else {
        playCancelledRef.current = false;
        setPlaying(true);
        void playSoothingChime(audioDuration).then(() => {
          if (!playCancelledRef.current) setPlaying(false);
        });
      }
    }
  };

  const handleToggleTranscript = async () => {
    onInteract?.();
    if (showTranscript) {
      setShowTranscript(false);
      return;
    }

    if (transcriptText) {
      setShowTranscript(true);
      onTranscriptResolved?.(messageId, transcriptText);
      return;
    }

    setIsTranscribing(true);
    try {
      const result = await transcribeCommunityVoice({
        messageId,
        audioUrl,
        audioDuration,
        existingCaption,
        existingTranscription: transcription,
      });
      setTranscriptText(result);
      setShowTranscript(true);
      onTranscriptResolved?.(messageId, result);
    } catch {
      notify(
        language === "Bahasa Melayu"
          ? "Tidak dapat mendapatkan transkrip"
          : language === "中文"
            ? "未能获取语音文字"
            : "Could not load transcript",
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const formattedTotal = formatAudioDuration(audioDuration);
  const displayDuration =
    playing && currentTime > 0
      ? `${formatAudioDuration(currentTime)} / ${formattedTotal}`
      : formattedTotal;

  const displayTranscript =
    showingTranslated && translatedTranscript ? translatedTranscript : transcriptText;

  return (
    <div className="inbox-voice-player">
      <div className="inbox-voice-bar">
        <button
          type="button"
          className={`inbox-voice-play-btn ${playing ? "is-playing" : ""}`}
          onClick={togglePlay}
          aria-label={
            playing
              ? `Pause voice message, duration ${formattedTotal}`
              : `Play voice message, duration ${formattedTotal}`
          }
        >
          {playing ? (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1.2" />
              <rect x="14" y="5" width="4" height="14" rx="1.2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </button>

        <div className={`inbox-voice-wave ${playing ? "playing" : ""}`} aria-hidden="true">
          <span style={{ height: "8px" }} />
          <span style={{ height: "16px" }} />
          <span style={{ height: "11px" }} />
          <span style={{ height: "20px" }} />
          <span style={{ height: "13px" }} />
          <span style={{ height: "18px" }} />
          <span style={{ height: "9px" }} />
          <span style={{ height: "15px" }} />
          <span style={{ height: "11px" }} />
        </div>

        <span className="inbox-voice-duration" aria-label={`Voice duration ${formattedTotal}`}>
          {displayDuration}
        </span>

        <button
          type="button"
          className={`inbox-transcript-btn ${showTranscript ? "active" : ""}`}
          onClick={() => void handleToggleTranscript()}
          disabled={isTranscribing}
          aria-expanded={showTranscript}
        >
          {isTranscribing ? strings.transcribing : showTranscript ? strings.hideTranscript : strings.viewTranscript}
        </button>
      </div>

      {showTranscript && displayTranscript && (
        <div className="inbox-transcript-panel">
          <p className="inbox-transcript-copy">
            "{displayTranscript}"
            {hasDiffTranslation && onToggleForceOriginal && (
              <button
                type="button"
                className="inbox-inline-globe-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleForceOriginal();
                }}
                aria-label={strings.translatedToggleAria}
                title={strings.translatedToggleAria}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 3a14 14 0 0 0 0 18M12 3a14 14 0 0 1 0 18M3.6 9h16.8M3.6 15h16.8" />
                </svg>
              </button>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

export default VoiceMessagePlayer;
