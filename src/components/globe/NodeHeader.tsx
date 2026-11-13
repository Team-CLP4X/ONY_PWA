import StatusPill from "../common/StatusPill";
import { formatMessageCountLabel, getMyNodeStrings } from "../../utils/nodeInboxHelpers";

export interface NodeHeaderProps {
  discoverable: boolean;
  myMoodEmoji: string;
  myMoodLabel: string;
  myMoodGlow?: "bright" | "soft" | "dim" | "neutral" | string;
  myRegion: { state: string; country: string };
  messageCount: number;
  collapsed: boolean;
  onUpdateMood?: () => void;
  onLocateOnGlobe: () => void;
  onOpenSettings: () => void;
  onExpandHeader?: () => void;
  language?: string;
}

export function NodeHeader({
  discoverable,
  myMoodEmoji,
  myMoodLabel,
  myMoodGlow = "soft",
  myRegion,
  messageCount,
  collapsed,
  onUpdateMood,
  onLocateOnGlobe,
  onOpenSettings,
  onExpandHeader,
  language = "English",
}: NodeHeaderProps) {
  const strings = getMyNodeStrings(language);
  const regionLabel = myRegion.state
    ? `${myRegion.state}, ${myRegion.country}`
    : myRegion.country || "Earth";

  return (
    <header
      className={`node-header-compact ${collapsed ? "is-collapsed" : ""}`}
      aria-label={strings.myLight}
    >
      {/* Top row: mood emoji + title + status pill + gear button */}
      <div className="node-header-main-row">
        <button
          type="button"
          className={`node-header-mood-btn ${myMoodGlow}`}
          onClick={onUpdateMood}
          disabled={!onUpdateMood}
          aria-label={strings.updateMoodAria}
          title={onUpdateMood ? strings.updateMoodAria : myMoodLabel}
        >
          <span className="node-header-mood-emoji" aria-hidden="true">
            {myMoodEmoji || "🌱"}
          </span>
        </button>

        <div
          className="node-header-identity"
          onClick={collapsed && onExpandHeader ? onExpandHeader : undefined}
          role={collapsed && onExpandHeader ? "button" : undefined}
          tabIndex={collapsed && onExpandHeader ? 0 : undefined}
          onKeyDown={
            collapsed && onExpandHeader
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onExpandHeader();
                  }
                }
              : undefined
          }
          aria-label={collapsed ? strings.expandHeaderAria : undefined}
        >
          <div className="node-header-title-wrap">
            <h1 className="node-header-title">{strings.myLight}</h1>
            <StatusPill
              size="sm"
              variant={discoverable ? "visible" : "hidden"}
              label={discoverable ? strings.visible : strings.hidden}
            />
          </div>
          {!collapsed && (
            <p className="node-header-region">
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
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
              <span>{regionLabel}</span>
            </p>
          )}
        </div>

        <button
          type="button"
          className="node-header-gear-btn"
          onClick={onOpenSettings}
          aria-label={strings.settingsAria}
          title={strings.settingsTitle}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Slim secondary row: mood chip, support count chip, small locate button (collapses when scrolling) */}
      <div className={`node-header-meta-collapse ${collapsed ? "collapsed" : ""}`} aria-hidden={collapsed}>
        <div className="node-header-slim-row">
          <div className="node-header-chips-group">
            <span className="node-header-meta-chip">
              <i className={`mood-dot-mini ${myMoodGlow}`} aria-hidden="true" />
              <span>{myMoodLabel}</span>
            </span>

            <span className="node-header-meta-chip">
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              <span>{formatMessageCountLabel(messageCount, language)}</span>
            </span>
          </div>

          <button
            type="button"
            className="node-header-locate-pill"
            onClick={onLocateOnGlobe}
            aria-label={strings.locateAria}
            tabIndex={collapsed ? -1 : 0}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3a14 14 0 0 0 0 18M12 3a14 14 0 0 1 0 18M3.6 9h16.8M3.6 15h16.8" />
            </svg>
            <span>{strings.locateShort}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default NodeHeader;
