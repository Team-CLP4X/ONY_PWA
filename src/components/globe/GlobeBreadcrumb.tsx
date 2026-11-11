import React from "react";
import type { GlobeHierarchyLevel } from "../../data/worldRegions";

export interface GlobeBreadcrumbProps {
  level: GlobeHierarchyLevel;
  countryName?: string | null;
  stateName?: string | null;
  visibleCount: number;
  language?: string;
  onSelectLevel: (target: "world" | "country") => void;
}

export default function GlobeBreadcrumb({
  level,
  countryName,
  stateName,
  visibleCount,
  language = "English",
  onSelectLevel,
}: GlobeBreadcrumbProps) {
  const worldLabel =
    language === "Bahasa Melayu" ? "Dunia" : language === "中文" ? "全球" : "World";

  const countLabel =
    language === "Bahasa Melayu"
      ? `${visibleCount} orang`
      : language === "中文"
        ? `${visibleCount} 人`
        : `${visibleCount} ${visibleCount === 1 ? "person" : "people"}`;

  return (
    <div className="globe-hud-top" aria-label="Globe location path">
      <div className="globe-breadcrumb-row">
        <nav className="globe-breadcrumb-scroll" aria-label="Region breadcrumb">
          <button
            type="button"
            className={`globe-crumb-btn ${level === "world" ? "active" : ""}`}
            onClick={() => onSelectLevel("world")}
            aria-current={level === "world" ? "location" : undefined}
          >
            {worldLabel}
          </button>

          {countryName && level !== "world" && (
            <>
              <span className="globe-crumb-sep" aria-hidden="true">
                ›
              </span>
              <button
                type="button"
                className={`globe-crumb-btn ${level === "country" ? "active" : ""}`}
                onClick={() => onSelectLevel("country")}
                aria-current={level === "country" ? "location" : undefined}
              >
                {countryName}
              </button>
            </>
          )}

          {stateName && level === "state" && (
            <>
              <span className="globe-crumb-sep" aria-hidden="true">
                ›
              </span>
              <span className="globe-crumb-current" aria-current="location">
                {stateName}
              </span>
            </>
          )}
        </nav>

        <span className="globe-breadcrumb-count tabular-nums" aria-live="polite">
          {countLabel}
        </span>
      </div>
    </div>
  );
}
