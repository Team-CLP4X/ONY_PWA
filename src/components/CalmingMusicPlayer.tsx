import { useState } from "react";
import {
  CALMING_TRACKS,
  type CalmingTrack,
  ambientMusicEngine,
} from "../services/ambientMusicEngine";
import type { AppLanguage } from "../i18n/translations";

interface FloatingPlayerProps {
  currentTrack: CalmingTrack;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onOpenModal: () => void;
  onClose: () => void;
  language: AppLanguage | string;
}

export function CalmingMusicFloatingBar({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  onOpenModal,
  onClose,
  language,
}: FloatingPlayerProps) {
  const currentLang = (language as AppLanguage) || "English";

  const title =
    currentLang === "Bahasa Melayu"
      ? currentTrack.titleBm
      : currentLang === "中文"
      ? currentTrack.titleZh
      : currentTrack.title;

  const badge =
    currentLang === "Bahasa Melayu"
      ? currentTrack.badgeBm
      : currentLang === "中文"
      ? currentTrack.badgeZh
      : currentTrack.badge;

  return (
    <div
      className={`calming-music-bar ${isPlaying ? "is-playing" : "is-paused"}`}
      role="region"
      aria-label="Calming audio player"
    >
      {/* Clickable track info opens the track selection modal */}
      <button
        type="button"
        className="calming-bar-info-btn"
        onClick={onOpenModal}
        title={
          currentLang === "Bahasa Melayu"
            ? "Buka senarai muzik menenangkan"
            : currentLang === "中文"
            ? "打开疗愈音乐与声景列表"
            : "Open calming soundscape playlist"
        }
      >
        <div
          className={`calming-disc-avatar ${isPlaying ? "rotating" : ""}`}
          style={{ borderColor: currentTrack.color }}
        >
          <span className="calming-disc-core" style={{ backgroundColor: currentTrack.color }}>
            {isPlaying ? (
              <span className="calming-equalizer-bars" aria-hidden="true">
                <i className="bar b1" />
                <i className="bar b2" />
                <i className="bar b3" />
              </span>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            )}
          </span>
        </div>

        <div className="calming-bar-titles">
          <div className="calming-bar-title-row">
            <span className="calming-bar-track-name">{title}</span>
            <span className="calming-bar-badge" style={{ color: currentTrack.color }}>
              {badge}
            </span>
          </div>
          <span className="calming-bar-status-hint">
            {isPlaying
              ? currentLang === "Bahasa Melayu"
                ? "Menghilangkan kegelisahan · Ketik untuk tukar"
                : currentLang === "中文"
                ? "舒缓神经系统中 · 点击展开曲目"
                : "Calming nervous system · Tap for tracks"
              : currentLang === "Bahasa Melayu"
              ? "Dijeda · Ketik untuk sambung"
              : currentLang === "中文"
              ? "已暂停 · 点击继续播放"
              : "Paused · Tap to resume"}
          </span>
        </div>
      </button>

      {/* Direct Playback Controls */}
      <div className="calming-bar-actions">
        <button
          type="button"
          className="calming-bar-btn nav-btn"
          onClick={onPrev}
          title={currentLang === "Bahasa Melayu" ? "Trek sebelumnya" : currentLang === "中文" ? "上一首" : "Previous track"}
          aria-label="Previous track"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="11 19 2 12 11 5 11 19" />
            <polygon points="22 19 13 12 22 5 22 19" />
          </svg>
        </button>

        <button
          type="button"
          className="calming-bar-btn play-btn"
          onClick={onTogglePlay}
          title={
            isPlaying
              ? currentLang === "Bahasa Melayu"
                ? "Jeda"
                : currentLang === "中文"
                ? "暂停"
                : "Pause"
              : currentLang === "Bahasa Melayu"
              ? "Mainkan"
              : currentLang === "中文"
              ? "播放"
              : "Play"
          }
          aria-label={isPlaying ? "Pause music" : "Play music"}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1.5" />
              <rect x="14" y="4" width="4" height="16" rx="1.5" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          )}
        </button>

        <button
          type="button"
          className="calming-bar-btn nav-btn"
          onClick={onNext}
          title={currentLang === "Bahasa Melayu" ? "Trek seterusnya" : currentLang === "中文" ? "下一首" : "Next track"}
          aria-label="Next track"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="13 19 22 12 13 5 13 19" />
            <polygon points="2 19 11 12 2 5 2 19" />
          </svg>
        </button>

        <button
          type="button"
          className="calming-bar-btn tracks-btn"
          onClick={onOpenModal}
          title={currentLang === "Bahasa Melayu" ? "Pilih senarai" : currentLang === "中文" ? "歌单" : "Soundscape list"}
          aria-label="Soundscape list"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="3" />
            <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="3" />
            <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="3" />
          </svg>
        </button>

        <button
          type="button"
          className="calming-bar-btn close-btn"
          onClick={onClose}
          title={currentLang === "Bahasa Melayu" ? "Tutup muzik" : currentLang === "中文" ? "静音关闭" : "Close player"}
          aria-label="Close audio player"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: CalmingTrack;
  isPlaying: boolean;
  volume: number;
  onSelectTrack: (trackId: string) => void;
  onTogglePlay: () => void;
  onVolumeChange: (vol: number) => void;
  language: AppLanguage | string;
}

export function CalmingMusicModal({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  volume,
  onSelectTrack,
  onTogglePlay,
  onVolumeChange,
  language,
}: ModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const currentLang = (language as AppLanguage) || "English";

  if (!isOpen) return null;

  const categories = [
    {
      id: "all",
      label: currentLang === "Bahasa Melayu" ? "Semua" : currentLang === "中文" ? "全部" : "All",
    },
    {
      id: "anxiety",
      label: currentLang === "Bahasa Melayu" ? "Redakan Gelisah" : currentLang === "中文" ? "焦虑舒缓" : "Anxiety Relief",
    },
    {
      id: "stress",
      label: currentLang === "Bahasa Melayu" ? "Kurangkan Tekanan" : currentLang === "中文" ? "减压清心" : "Stress Relief",
    },
    {
      id: "breathing",
      label: currentLang === "Bahasa Melayu" ? "Irama Nafas" : currentLang === "中文" ? "正念节律" : "Breathing Sync",
    },
    {
      id: "sleep",
      label: currentLang === "Bahasa Melayu" ? "Tidur & Rehat" : currentLang === "中文" ? "助眠安神" : "Sleep & Study",
    },
  ];

  const filteredTracks = CALMING_TRACKS.filter(
    (t) => activeCategory === "all" || t.category === activeCategory
  );

  return (
    <div className="calming-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="calming-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Top grab handle */}
        <div className="calming-modal-handle" />

        {/* Modal Header */}
        <div className="calming-modal-header">
          <div className="calming-modal-header-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </div>
          <div className="calming-modal-title-wrap">
            <h2>
              {currentLang === "Bahasa Melayu"
                ? "Muzik Tenang & Lanskap Bunyi Terapi"
                : currentLang === "中文"
                ? "疗愈音乐与情绪舒缓白噪音"
                : "Calming Music & Therapeutic Soundscapes"}
            </h2>
            <p>
              {currentLang === "Bahasa Melayu"
                ? "Frekuensi akustik, irama pernafasan saraf vagus & kord lembut untuk redakan kegelisahan dan tekanan."
                : currentLang === "中文"
                ? "临床声学频率、迷走神经呼吸调频与暖心和弦，专为舒缓焦虑、深层减压与助眠打造。"
                : "Acoustic frequencies, vagus nerve breathing cycles & warm chords designed for anxiety and stress decompression."}
            </p>
          </div>
          <button
            type="button"
            className="calming-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Master Volume Strip */}
        <div className="calming-volume-strip">
          <button
            type="button"
            className="calming-volume-mute-btn"
            onClick={() => onVolumeChange(volume === 0 ? 55 : 0)}
            title={volume === 0 ? "Unmute" : "Mute"}
          >
            {volume === 0 ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>

          <div className="calming-volume-slider-wrap">
            <div className="calming-volume-label-row">
              <span>{currentLang === "Bahasa Melayu" ? "Kelantangan Bunyi" : currentLang === "中文" ? "主音量调节" : "Master Volume"}</span>
              <strong>{volume}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="calming-volume-slider"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="calming-categories-row">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`calming-category-pill ${activeCategory === cat.id ? "active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Tracks List */}
        <div className="calming-tracks-list">
          {filteredTracks.map((track) => {
            const isThisTrack = currentTrack.id === track.id;
            const isThisPlaying = isThisTrack && isPlaying;

            const trackTitle =
              currentLang === "Bahasa Melayu"
                ? track.titleBm
                : currentLang === "中文"
                ? track.titleZh
                : track.title;

            const trackSubtitle =
              currentLang === "Bahasa Melayu"
                ? track.subtitleBm
                : currentLang === "中文"
                ? track.subtitleZh
                : track.subtitle;

            const trackBadge =
              currentLang === "Bahasa Melayu"
                ? track.badgeBm
                : currentLang === "中文"
                ? track.badgeZh
                : track.badge;

            return (
              <div
                key={track.id}
                className={`calming-track-card ${isThisTrack ? "active" : ""} ${isThisPlaying ? "playing" : ""}`}
                onClick={() => {
                  if (isThisTrack) {
                    onTogglePlay();
                  } else {
                    onSelectTrack(track.id);
                  }
                }}
              >
                <div className="calming-track-left">
                  <div
                    className="calming-track-icon-bubble"
                    style={{ backgroundColor: `${track.color}18`, color: track.color }}
                  >
                    {isThisPlaying ? (
                      <span className="calming-equalizer-bars on-card" aria-hidden="true">
                        <i className="bar b1" style={{ backgroundColor: track.color }} />
                        <i className="bar b2" style={{ backgroundColor: track.color }} />
                        <i className="bar b3" style={{ backgroundColor: track.color }} />
                      </span>
                    ) : (
                      <span className="calming-track-symbol" style={{ color: track.color }}>
                        {track.category === "breathing" ? "🌊" : track.category === "stress" ? "🍃" : track.category === "sleep" ? "🎹" : track.id === "singing_bowls" ? "🔔" : "🌸"}
                      </span>
                    )}
                  </div>

                  <div className="calming-track-text">
                    <div className="calming-track-title-row">
                      <strong>{trackTitle}</strong>
                      <span
                        className="calming-category-badge"
                        style={{
                          backgroundColor: `${track.color}15`,
                          color: track.color,
                          borderColor: `${track.color}35`,
                        }}
                      >
                        {trackBadge}
                      </span>
                    </div>
                    <p className="calming-track-desc">{trackSubtitle}</p>
                    <div className="calming-track-tags">
                      {track.id === "serenity_432" && (
                        <span className="calming-science-tag">432Hz Binaural Drone · Vagus Nerve</span>
                      )}
                      {track.id === "rain_leaves" && (
                        <span className="calming-science-tag">Filtered Pink Noise · Thunder Pings</span>
                      )}
                      {track.id === "ocean_breath" && (
                        <span className="calming-science-tag">0.1Hz Wave Cycle · 5s In / 5s Out</span>
                      )}
                      {track.id === "singing_bowls" && (
                        <span className="calming-science-tag">216Hz/432Hz Partials · Bamboo Chimes</span>
                      )}
                      {track.id === "lofi_piano" && (
                        <span className="calming-science-tag">Maj9 Rhodes Chords · Vinyl Warmth</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="calming-track-action-col">
                  <button
                    type="button"
                    className={`calming-track-play-trigger ${isThisPlaying ? "is-playing" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isThisTrack) {
                        onTogglePlay();
                      } else {
                        onSelectTrack(track.id);
                      }
                    }}
                    aria-label={isThisPlaying ? "Pause this track" : "Play this track"}
                  >
                    {isThisPlaying ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1.5" />
                        <rect x="14" y="4" width="4" height="16" rx="1.5" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="6 4 20 12 6 20 6 4" />
                      </svg>
                    )}
                  </button>
                  <span className="calming-track-status-text">
                    {isThisPlaying
                      ? currentLang === "Bahasa Melayu"
                        ? "Dimainkan"
                        : currentLang === "中文"
                        ? "播放中"
                        : "Playing"
                      : isThisTrack
                      ? currentLang === "Bahasa Melayu"
                        ? "Dipilih"
                        : currentLang === "中文"
                        ? "已选中"
                        : "Selected"
                      : currentLang === "Bahasa Melayu"
                      ? "Pasang"
                      : currentLang === "中文"
                      ? "试听"
                      : "Listen"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Gentle Notice & Offline Guarantee */}
        <div className="calming-modal-footer">
          <div className="calming-modal-footer-notice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              {currentLang === "Bahasa Melayu"
                ? "Disintesis secara masa nyata melalui Web Audio API. 100% peribadi, selamat dan berfungsi sepenuhnya luar talian."
                : currentLang === "中文"
                ? "基于 Web Audio API 实时声波合成，零网络请求与外部依赖，温和守护且完全支持离线收听。"
                : "Real-time acoustic synthesis via Web Audio API. 100% offline-capable, safe, and private."}
            </span>
          </div>

          <button type="button" className="calming-modal-done-btn" onClick={onClose}>
            {currentLang === "Bahasa Melayu" ? "Selesai" : currentLang === "中文" ? "完成" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
