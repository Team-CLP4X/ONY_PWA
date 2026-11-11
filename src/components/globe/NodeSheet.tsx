import React, { useState } from "react";
import {
  getLocalizedMoodLabel,
  resolveNodeMoodKey,
  type GlobeUser,
} from "../../data/worldRegions";

export interface NodeSheetProps {
  node: GlobeUser | null;
  countryName?: string;
  stateName?: string;
  isMe: boolean;
  isHiddenSelf?: boolean;
  mySupportCount?: number;
  language?: string;
  onClose: () => void;
  onOpenMyMessages: () => void;
  onOpenVisibilitySetting: () => void;
  onConnect: (node: GlobeUser) => void;
  onReport: (node: GlobeUser) => void;
  onBlock: (node: GlobeUser) => void;
}

export default function NodeSheet({
  node,
  countryName,
  stateName,
  isMe,
  isHiddenSelf = false,
  mySupportCount = 0,
  language = "English",
  onClose,
  onOpenMyMessages,
  onOpenVisibilitySetting,
  onConnect,
  onReport,
  onBlock,
}: NodeSheetProps) {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  if (!node) return null;

  const regionLine =
    stateName && countryName
      ? `${stateName}, ${countryName}`
      : countryName || "Global Region";

  const localizedMood = getLocalizedMoodLabel(resolveNodeMoodKey(node), language);

  const copy = {
    closeAria:
      language === "Bahasa Melayu"
        ? "Tutup"
        : language === "中文"
          ? "关闭"
          : "Close",
    statusVisible:
      language === "Bahasa Melayu"
        ? "Kelihatan"
        : language === "中文"
          ? "可见"
          : "Visible",
    statusHidden:
      language === "Bahasa Melayu"
        ? "Tersembunyi"
        : language === "中文"
          ? "已隐藏"
          : "Hidden",
    peerTag:
      language === "Bahasa Melayu"
        ? `Ahli #${node.id}`
        : language === "中文"
          ? `成员 #${node.id}`
          : `Member #${node.id}`,
    moodPrefix:
      language === "Bahasa Melayu"
        ? "Daftar masuk emosi:"
        : language === "中文"
          ? "心情记录："
          : "Mood check-in:",
    privacyInfoAria:
      language === "Bahasa Melayu"
        ? "Maklumat privasi"
        : language === "中文"
          ? "隐私说明"
          : "Privacy details",
    privacyNote:
      language === "Bahasa Melayu"
        ? "Hanya wilayah luas (~25 km) dan status emosi pilihan dikongsi — tiada nama atau lokasi tepat."
        : language === "中文"
          ? "仅展示模糊大区与心情状态，不保存任何个人昵称或精确位置。"
          : "Only broad regional area (~25 km) and optional mood check-in are shared.",
    viewSupport:
      language === "Bahasa Melayu"
        ? `Lihat Sokongan (${mySupportCount})`
        : language === "中文"
          ? `查看收到的支持 (${mySupportCount})`
          : `View Support Sent to Me (${mySupportCount})`,
    openSetting:
      language === "Bahasa Melayu"
        ? "Buka tetapan"
        : language === "中文"
          ? "打开设置"
          : "Open setting",
    sayHi:
      language === "Bahasa Melayu"
        ? "Hantar nota sokongan"
        : language === "中文"
          ? "发送暖心留言"
          : "Send supportive note",
    messagesOffBtn:
      language === "Bahasa Melayu"
        ? "Mesej dimatikan"
        : language === "中文"
          ? "暂不接收留言"
          : "Not accepting messages",
    reportBtn:
      language === "Bahasa Melayu" ? "Laporkan" : language === "中文" ? "举报" : "Report",
    blockBtn:
      language === "Bahasa Melayu" ? "Sekat" : language === "中文" ? "屏蔽" : "Block",
  };

  return (
    <div className="globe-node-sheet-layer" role="presentation">
      <div
        className="globe-node-sheet"
        role="dialog"
        aria-modal="false"
        aria-label={isMe ? "Your anonymous node" : copy.peerTag}
      >
        <div className="globe-sheet-handle" aria-hidden="true" />

        {/* Row 1: Status pill + region + collapsed (i) + close */}
        <div className="globe-sheet-top-row">
          <div className="globe-sheet-status-group">
            <span className={`anonymous-light mini mood-${node.moodGlow}`} aria-hidden="true" />
            {isMe ? (
              <span
                className={`globe-visibility-pill ${isHiddenSelf ? "is-hidden" : "is-visible"}`}
              >
                {isHiddenSelf ? copy.statusHidden : copy.statusVisible}
              </span>
            ) : (
              <span className="globe-visibility-pill is-peer">{copy.peerTag}</span>
            )}
            <span className="globe-sheet-region">{regionLine}</span>
          </div>

          <div className="globe-sheet-top-icons">
            <button
              type="button"
              className={`globe-sheet-mini-icon ${privacyOpen ? "active" : ""}`}
              onClick={() => setPrivacyOpen((prev) => !prev)}
              aria-expanded={privacyOpen}
              aria-label={copy.privacyInfoAria}
              title={copy.privacyInfoAria}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            </button>

            <button
              type="button"
              className="globe-sheet-mini-icon"
              onClick={onClose}
              aria-label={copy.closeAria}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Collapsed privacy note */}
        {privacyOpen && <p className="globe-sheet-privacy-note">{copy.privacyNote}</p>}

        {/* Row 2: One line for mood check-in */}
        <div className="globe-sheet-mood-line">
          <span>{copy.moodPrefix}</span>
          <strong>{localizedMood}</strong>
        </div>

        {/* Row 3: Primary/Secondary action + small text link */}
        <div className="globe-sheet-compact-actions">
          {isMe ? (
            <>
              <button
                type="button"
                className="btn btn-secondary globe-sheet-compact-btn"
                onClick={onOpenMyMessages}
              >
                {copy.viewSupport}
              </button>
              <button
                type="button"
                className="globe-sheet-text-link"
                onClick={onOpenVisibilitySetting}
              >
                {copy.openSetting}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-primary globe-sheet-compact-btn"
                disabled={!node.acceptsMessages}
                onClick={() => onConnect(node)}
              >
                {node.acceptsMessages ? copy.sayHi : copy.messagesOffBtn}
              </button>
              <div className="globe-sheet-inline-links">
                <button
                  type="button"
                  className="globe-sheet-text-link"
                  onClick={() => onReport(node)}
                >
                  {copy.reportBtn}
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  className="globe-sheet-text-link danger"
                  onClick={() => onBlock(node)}
                >
                  {copy.blockBtn}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
