import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ThemedSwitch from "../common/ThemedSwitch";
import SettingsCard from "./SettingsCard";
import {
  getMyNodeStrings,
  type BlockedSenderEntry,
} from "../../utils/nodeInboxHelpers";

export interface NodeSettingsScreenProps {
  open: boolean;
  onClose: () => void;
  discoverable: boolean;
  acceptMessages: boolean;
  onSetDiscoverable: (v: boolean) => void;
  onSetAcceptMessages: (v: boolean) => void;
  autoTranslate: boolean;
  onSetAutoTranslate: (v: boolean) => void;
  myRegion: { state: string; country: string };
  detectingLocation?: boolean;
  onEnableLocation?: () => void;
  onSelectManualArea?: () => void;
  renderAreaPicker?: () => React.ReactNode;
  blockedSenders: BlockedSenderEntry[];
  onUnblockSender: (senderId: string) => void;
  unreadCount: number;
  totalMessageCount: number;
  onMarkAllRead: () => void;
  onDeleteAllMessages: () => void;
  language?: string;
}

export function NodeSettingsScreen({
  open,
  onClose,
  discoverable,
  acceptMessages,
  onSetDiscoverable,
  onSetAcceptMessages,
  autoTranslate,
  onSetAutoTranslate,
  myRegion,
  detectingLocation = false,
  onEnableLocation,
  onSelectManualArea,
  renderAreaPicker,
  blockedSenders,
  onUnblockSender,
  unreadCount,
  totalMessageCount,
  onMarkAllRead,
  onDeleteAllMessages,
  language = "English",
}: NodeSettingsScreenProps) {
  const strings = getMyNodeStrings(language);
  const [isEditingArea, setIsEditingArea] = useState(false);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);
  const [showBlockedList, setShowBlockedList] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmDeleteAll(false);
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmDeleteAll) {
          setConfirmDeleteAll(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, confirmDeleteAll, onClose]);

  if (!open || typeof document === "undefined") return null;

  const regionLabel = myRegion.state
    ? `${myRegion.state}, ${myRegion.country}`
    : myRegion.country || "Earth";

  return createPortal(
    <div
      className="node-settings-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={strings.settingsTitle}
    >
      <div className="node-settings-shell">
        <div className="node-settings-topbar">
          <button
            type="button"
            className="node-settings-back-btn"
            onClick={onClose}
            aria-label={strings.backAria}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="node-settings-heading">{strings.settingsTitle}</h1>
          <span className="node-settings-topbar-spacer" aria-hidden="true" />
        </div>

        <div className="node-settings-scroll">
          {/* 1. VISIBILITY */}
          <SettingsCard sectionLabel={strings.sectionVisibility}>
            <div className="node-settings-row-pad">
              <ThemedSwitch
                checked={discoverable}
                onChange={onSetDiscoverable}
                label={strings.appearTitle}
                description={strings.appearDesc}
                onStatusText={strings.appearOnStatus}
                offStatusText={strings.appearOffStatus}
                ariaLabel={strings.appearTitle}
              />
            </div>

            <div className="node-settings-divider" />

            <div className="node-settings-row-pad">
              <ThemedSwitch
                checked={acceptMessages}
                onChange={onSetAcceptMessages}
                label={strings.acceptTitle}
                description={strings.acceptDesc}
                onStatusText={strings.acceptOnStatus}
                offStatusText={strings.acceptOffStatus}
                ariaLabel={strings.acceptTitle}
              />
            </div>
          </SettingsCard>

          {/* 2. LANGUAGE */}
          <SettingsCard sectionLabel={strings.sectionLanguage}>
            <div className="node-settings-row-pad">
              <ThemedSwitch
                checked={autoTranslate}
                onChange={onSetAutoTranslate}
                label={strings.autoTranslateTitle}
                description={strings.autoTranslateDesc}
                ariaLabel={strings.autoTranslateTitle}
              />
            </div>
          </SettingsCard>

          {/* 3. REGION */}
          <SettingsCard sectionLabel={strings.sectionRegion}>
            <div className="node-settings-region-head">
              <div className="node-settings-region-current">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <strong>{regionLabel}</strong>
              </div>

              <button
                type="button"
                className="node-settings-inline-action"
                onClick={() => setIsEditingArea((prev) => !prev)}
              >
                {isEditingArea ? strings.done : strings.changeArea}
              </button>
            </div>

            {isEditingArea && (
              <div className="node-settings-area-editor">
                {detectingLocation ? (
                  <div className="node-settings-detecting">
                    <span className="support-spinner mini" />
                    <span>{strings.detecting}</span>
                  </div>
                ) : (
                  <>
                    <div className="node-settings-area-btns">
                      <button
                        type="button"
                        className="region-btn primary"
                        onClick={() => onEnableLocation?.()}
                      >
                        {strings.useCurrentArea}
                      </button>
                      <button
                        type="button"
                        className="region-btn secondary"
                        onClick={() => onSelectManualArea?.()}
                      >
                        {strings.chooseManual}
                      </button>
                    </div>
                    {renderAreaPicker && renderAreaPicker()}
                  </>
                )}
              </div>
            )}

            <div className="node-settings-divider" />

            <div className="node-settings-privacy-row">
              <p className="node-settings-privacy-text">
                {strings.privacyOneLine}{" "}
                <button
                  type="button"
                  className="node-settings-link-btn"
                  onClick={() => setShowPrivacyDetails((prev) => !prev)}
                  aria-expanded={showPrivacyDetails}
                >
                  {showPrivacyDetails ? strings.hideDetails : strings.learnMore}
                </button>
              </p>
              {showPrivacyDetails && (
                <p className="node-settings-privacy-detail">{strings.privacyDetail}</p>
              )}
            </div>
          </SettingsCard>

          {/* 4. MESSAGES */}
          <SettingsCard sectionLabel={strings.sectionMessages}>
            <button
              type="button"
              className="node-settings-action-row"
              onClick={() => setShowBlockedList((prev) => !prev)}
              aria-expanded={showBlockedList}
            >
              <span className="node-settings-action-label">{strings.blockedSendersTitle}</span>
              <span className="node-settings-action-trailing">
                <span className="node-settings-count-muted">{blockedSenders.length}</span>
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: showBlockedList ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.16s ease",
                  }}
                  aria-hidden="true"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            </button>

            {showBlockedList && (
              <div className="node-settings-blocked-panel">
                {blockedSenders.length === 0 ? (
                  <p className="node-settings-blocked-empty">{strings.noneBlocked}</p>
                ) : (
                  <ul className="node-settings-blocked-list">
                    {blockedSenders.map((entry) => (
                      <li key={entry.id} className="node-settings-blocked-item">
                        <span>{entry.label}</span>
                        <button
                          type="button"
                          className="node-settings-inline-action"
                          onClick={() => onUnblockSender(entry.id)}
                        >
                          {strings.unblock}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="node-settings-divider" />

            <button
              type="button"
              className="node-settings-action-row"
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
            >
              <span className="node-settings-action-label">{strings.markAllRead}</span>
              {unreadCount > 0 && (
                <span className="node-settings-badge">{unreadCount}</span>
              )}
            </button>

            <div className="node-settings-divider" />

            <button
              type="button"
              className="node-settings-action-row danger"
              onClick={() => setConfirmDeleteAll(true)}
              disabled={totalMessageCount === 0}
            >
              <span className="node-settings-action-label">{strings.deleteAllTitle}</span>
            </button>
          </SettingsCard>
        </div>

        {/* Destructive Confirmation Modal */}
        {confirmDeleteAll && (
          <div className="node-settings-confirm-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="delete-all-title">
            <div className="node-settings-confirm-dialog">
              <h3 id="delete-all-title">{strings.deleteAllConfirmTitle}</h3>
              <p>{strings.deleteAllConfirmDesc}</p>
              <div className="node-settings-confirm-actions">
                <button
                  type="button"
                  className="node-confirm-btn secondary"
                  onClick={() => setConfirmDeleteAll(false)}
                >
                  {strings.cancel}
                </button>
                <button
                  type="button"
                  className="node-confirm-btn danger"
                  onClick={() => {
                    setConfirmDeleteAll(false);
                    onDeleteAllMessages();
                  }}
                >
                  {strings.deleteAllConfirmBtn}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default NodeSettingsScreen;
