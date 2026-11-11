import React, { useState } from "react";
import { getMoodLegendItems } from "../../data/worldRegions";

export interface GlobeControlsProps {
  viewMode: "globe" | "list";
  discoverable: boolean;
  onToggleViewMode: () => void;
  onResetView: () => void;
  onFindMyNode: () => void;
  onOpenVisibilitySheet: () => void;
  onOpenGuidelines: () => void;
  canReset?: boolean;
  language?: string;
}

export default function GlobeControls({
  viewMode,
  discoverable,
  onToggleViewMode,
  onResetView,
  onFindMyNode,
  onOpenVisibilitySheet,
  onOpenGuidelines,
  canReset = true,
  language = "English",
}: GlobeControlsProps) {
  const [openPopover, setOpenPopover] = useState<"info" | "legend" | null>(null);

  const legendItems = getMoodLegendItems(language);

  const labels = {
    reset:
      language === "Bahasa Melayu"
        ? "Set semula pandangan"
        : language === "中文"
          ? "重置视角"
          : "Reset view",
    findMe:
      language === "Bahasa Melayu"
        ? "Cari nod saya"
        : language === "中文"
          ? "找到我的节点"
          : "Find my node",
    listView:
      language === "Bahasa Melayu"
        ? "Paparan senarai"
        : language === "中文"
          ? "切换列表"
          : "List view",
    globeView:
      language === "Bahasa Melayu"
        ? "Paparan peta"
        : language === "中文"
          ? "返回地图"
          : "Map view",
    infoAria:
      language === "Bahasa Melayu"
        ? "Info privasi & garis panduan"
        : language === "中文"
          ? "隐私说明与社区公约"
          : "Privacy info & guidelines",
    infoTitle:
      language === "Bahasa Melayu"
        ? "Privasi & Garis Panduan"
        : language === "中文"
          ? "匿名隐私与公约"
          : "Privacy & Guidelines",
    infoBody:
      language === "Bahasa Melayu"
        ? "Lokasi digeneralisasikan ke peringkat wilayah/negeri (~25 km). Kawasan dengan kurang daripada 5 ahli digabungkan ke kluster induk."
        : language === "中文"
          ? "位置仅展示为省州/大区范围（约 25 公里），少于 5 人的区域会合并入上级星团以保护匿名。"
          : "Locations are coarsened to broad state regions (~25 km). Areas with fewer than 5 visible people merge into their parent cluster.",
    guidelinesBtn:
      language === "Bahasa Melayu"
        ? "Baca Garis Panduan Komuniti"
        : language === "中文"
          ? "查看社区公约"
          : "Community Guidelines",
    legendBtn:
      language === "Bahasa Melayu"
        ? "Petunjuk"
        : language === "中文"
          ? "图例"
          : "Legend",
    legendTitle:
      language === "Bahasa Melayu"
        ? "Cahaya Emosi"
        : language === "中文"
          ? "心情微光"
          : "Mood Glow",
    visibleChip:
      language === "Bahasa Melayu"
        ? "Kelihatan"
        : language === "中文"
          ? "可见"
          : "Visible",
    hiddenChip:
      language === "Bahasa Melayu"
        ? "Tersembunyi"
        : language === "中文"
          ? "已隐藏"
          : "Hidden",
  };

  return (
    <>
      {/* Single Vertical Stack on Right: Find my node, Reset view, List/Globe, Info */}
      <div className="globe-right-stack" role="toolbar" aria-label="Map controls">
        <button
          type="button"
          className="globe-stack-btn primary-tint"
          onClick={onFindMyNode}
          aria-label={labels.findMe}
          title={labels.findMe}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <circle cx="12" cy="12" r="7" opacity="0.45" />
          </svg>
        </button>

        <button
          type="button"
          className="globe-stack-btn"
          onClick={onResetView}
          disabled={!canReset && viewMode === "globe"}
          aria-label={labels.reset}
          title={labels.reset}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>

        <button
          type="button"
          className={`globe-stack-btn ${viewMode === "list" ? "active" : ""}`}
          onClick={() => {
            setOpenPopover(null);
            onToggleViewMode();
          }}
          aria-pressed={viewMode === "list"}
          aria-label={viewMode === "globe" ? labels.listView : labels.globeView}
          title={viewMode === "globe" ? labels.listView : labels.globeView}
        >
          {viewMode === "globe" ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 0 0 18M12 3a14 14 0 0 1 0 18" />
            </svg>
          )}
        </button>

        <button
          type="button"
          className={`globe-stack-btn ${openPopover === "info" ? "active" : ""}`}
          onClick={() => setOpenPopover((prev) => (prev === "info" ? null : "info"))}
          aria-expanded={openPopover === "info"}
          aria-label={labels.infoAria}
          title={labels.infoAria}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </button>
      </div>

      {/* Info + Guidelines Popover */}
      {openPopover === "info" && (
        <div className="globe-popover right-anchored" role="dialog" aria-label={labels.infoTitle}>
          <div className="globe-popover-head">
            <strong>{labels.infoTitle}</strong>
            <button
              type="button"
              className="globe-icon-mini-btn"
              onClick={() => setOpenPopover(null)}
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p>{labels.infoBody}</p>
          <button
            type="button"
            className="globe-popover-link"
            onClick={() => {
              setOpenPopover(null);
              onOpenGuidelines();
            }}
          >
            {labels.guidelinesBtn} ›
          </button>
        </div>
      )}

      {/* Bottom-left Compact Chips: Visibility ("Visible" / "Hidden") + "Legend" */}
      <div className="globe-bottom-chips">
        <button
          type="button"
          className={`globe-mini-chip ${discoverable ? "is-visible" : "is-hidden"}`}
          onClick={() => {
            setOpenPopover(null);
            onOpenVisibilitySheet();
          }}
          aria-label="Manage node visibility"
        >
          <span className="globe-chip-dot" aria-hidden="true" />
          <span>{discoverable ? labels.visibleChip : labels.hiddenChip}</span>
        </button>

        <button
          type="button"
          className={`globe-mini-chip ${openPopover === "legend" ? "active" : ""}`}
          onClick={() => setOpenPopover((prev) => (prev === "legend" ? null : "legend"))}
          aria-expanded={openPopover === "legend"}
          aria-label={labels.legendTitle}
        >
          <span className="globe-legend-dots-preview" aria-hidden="true">
            <i className="bright" />
            <i className="soft" />
            <i className="dim" />
          </span>
          <span>{labels.legendBtn}</span>
        </button>
      </div>

      {/* Collapsed Legend Popover */}
      {openPopover === "legend" && (
        <div className="globe-popover left-anchored" role="dialog" aria-label={labels.legendTitle}>
          <div className="globe-popover-head">
            <strong>{labels.legendTitle}</strong>
            <button
              type="button"
              className="globe-icon-mini-btn"
              onClick={() => setOpenPopover(null)}
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="globe-legend-grid">
            {legendItems.map((item) => (
              <div key={item.glow} className="globe-legend-row">
                <i className={`globe-legend-dot ${item.glow}`} aria-hidden="true" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
