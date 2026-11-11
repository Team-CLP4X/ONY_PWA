import React from "react";
import {
  getLocalizedMoodLabel,
  resolveNodeMoodKey,
  type GlobeClusterDisplayItem,
  type GlobeDisplayItem,
  type GlobeHierarchyLevel,
  type GlobeNodeDisplayItem,
  type GlobeUser,
  type ListCountryGroup,
} from "../../data/worldRegions";

export interface ProjectedMarker {
  item: GlobeDisplayItem;
  x: number;
  y: number;
  visible: boolean;
}

export interface ClusterLayerProps {
  markers: ProjectedMarker[];
  hiddenSelfMarker?: {
    item: GlobeNodeDisplayItem;
    x: number;
    y: number;
    visible: boolean;
  } | null;
  selectedNodeId: number | null;
  reducedMotion: boolean;
  language?: string;
  onClusterTap: (cluster: GlobeClusterDisplayItem) => void;
  onNodeTap: (node: GlobeNodeDisplayItem) => void;
}

export default function ClusterLayer({
  markers,
  hiddenSelfMarker,
  selectedNodeId,
  reducedMotion,
  language = "English",
  onClusterTap,
  onNodeTap,
}: ClusterLayerProps) {
  const youTag =
    language === "Bahasa Melayu" ? "Anda" : language === "中文" ? "您" : "You";

  return (
    <div className="globe-markers-overlay" aria-label="Interactive globe markers">
      {markers.map(({ item, x, y, visible }) => {
        if (!visible) return null;

        if (item.kind === "cluster") {
          const sizeClass =
            item.count >= 15 ? "lg" : item.count >= 5 ? "md" : "sm";
          const ariaLabel =
            language === "Bahasa Melayu"
              ? `${item.label}: ${item.count} ahli boleh ditemui. Ketik untuk zum.`
              : language === "中文"
                ? `${item.label}：${item.count} 位可见成员，轻点放大。`
                : `${item.label}: ${item.count} discoverable ${item.count === 1 ? "person" : "people"}. Tap to zoom in.`;

          return (
            <button
              key={item.key}
              type="button"
              className={`globe-cluster-btn ${sizeClass} ${item.hasMe ? "contains-me" : ""} ${reducedMotion ? "no-motion" : ""}`}
              style={{
                transform: `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onClusterTap(item);
              }}
              aria-label={ariaLabel}
            >
              <span className="globe-cluster-halo" aria-hidden="true" />
              <span className="globe-cluster-core">
                <strong className="tabular-nums">{item.count}</strong>
                <small>{item.label}</small>
              </span>
            </button>
          );
        }

        const isSelected = selectedNodeId === item.user.id;
        const localizedMood = getLocalizedMoodLabel(resolveNodeMoodKey(item.user), language);
        const nodeAria = item.isMe
          ? `${youTag}, ${item.stateName}, ${localizedMood}`
          : `Anonymous member #${item.user.id} in ${item.stateName}, ${localizedMood}`;

        return (
          <button
            key={item.key}
            type="button"
            className={`globe-map-node mood-${item.user.moodGlow} ${item.isMe ? "is-me" : ""} ${isSelected ? "selected" : ""} ${reducedMotion ? "no-motion" : ""}`}
            style={{
              transform: `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onNodeTap(item);
            }}
            aria-label={nodeAria}
          >
            {item.isMe && <span className="globe-node-you-tag">{youTag}</span>}
            <span className="globe-node-pulse" aria-hidden="true" />
            <span className="globe-node-dot" aria-hidden="true" />
          </button>
        );
      })}

      {/* Hidden owner's own private locator pin (never shown or counted for peers) */}
      {hiddenSelfMarker && hiddenSelfMarker.visible && (
        <button
          key={hiddenSelfMarker.item.key}
          type="button"
          className={`globe-map-node is-me is-hidden-self ${selectedNodeId === hiddenSelfMarker.item.user.id ? "selected" : ""} no-motion`}
          style={{
            transform: `translate3d(${hiddenSelfMarker.x}px, ${hiddenSelfMarker.y}px, 0) translate(-50%, -50%)`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onNodeTap(hiddenSelfMarker.item);
          }}
          aria-label={
            language === "Bahasa Melayu"
              ? "Nod anda (Tersembunyi). Ketik untuk butiran."
              : language === "中文"
                ? "您的节点（已隐藏）。轻点查看详情。"
                : "Your node (Hidden). Tap for details."
          }
        >
          <span className="globe-node-you-tag hidden-tag">
            {language === "Bahasa Melayu"
              ? "Anda · Tersembunyi"
              : language === "中文"
                ? "您 · 已隐藏"
                : "You · Hidden"}
          </span>
          <span className="globe-node-dot hidden-dot" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export interface ListViewPanelProps {
  groups: ListCountryGroup[];
  level: GlobeHierarchyLevel;
  focusedCountry: string | null;
  focusedState: string | null;
  hiddenSelfNode: GlobeUser | null;
  hiddenSelfRegion?: { country: string; state: string } | null;
  language?: string;
  onDrillCountry: (group: ListCountryGroup) => void;
  onDrillState: (country: string, stateGroup: ListCountryGroup["states"][number]) => void;
  onSelectNode: (node: GlobeUser, country: string, state: string, isHiddenSelf?: boolean) => void;
}

export function ListViewPanel({
  groups,
  level,
  focusedCountry,
  focusedState,
  hiddenSelfNode,
  hiddenSelfRegion,
  language = "English",
  onDrillCountry,
  onDrillState,
  onSelectNode,
}: ListViewPanelProps) {
  const emptyTitle =
    language === "Bahasa Melayu"
      ? "Tiada ahli kelihatan di kawasan ini lagi"
      : language === "中文"
        ? "该区域暂无人公开微光"
        : "No one is visible in this area yet";

  const activeCountryGroup = focusedCountry
    ? groups.find((g) => g.country === focusedCountry) || null
    : null;

  const activeStateGroup =
    activeCountryGroup && focusedState
      ? activeCountryGroup.states.find((s) => s.state === focusedState) ||
        activeCountryGroup.states[0] ||
        null
      : null;

  // Determine exact hierarchy level to display so List View strictly follows Breadcrumb
  const viewDepth: "countries" | "states" | "nodes" =
    level === "state" && activeCountryGroup && activeStateGroup
      ? "nodes"
      : level !== "world" && activeCountryGroup
        ? "states"
        : "countries";

  const chevronIcon = (
    <svg
      className="globe-list-chevron"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );

  return (
    <div className="globe-list-view" role="region" aria-label="Regions list view">
      {/* Compact flat list container — no nested cards inside cards */}
      {viewDepth === "countries" && (
        <div className="globe-list-flat">
          {hiddenSelfNode && (
            <button
              type="button"
              className="globe-list-row is-hidden-self"
              onClick={() =>
                onSelectNode(
                  hiddenSelfNode,
                  hiddenSelfRegion?.country || "Malaysia",
                  hiddenSelfRegion?.state || "Selangor",
                  true,
                )
              }
            >
              <span className="globe-list-row-left">
                <span className="globe-list-dot-hidden" aria-hidden="true" />
                <span className="globe-list-row-name">
                  {language === "Bahasa Melayu"
                    ? "Anda (Tersembunyi)"
                    : language === "中文"
                      ? "您（已隐藏）"
                      : "You (Hidden)"}
                </span>
              </span>
              <span className="globe-list-row-right">
                <span className="globe-list-row-count">
                  {hiddenSelfRegion?.state || "Selangor"}
                </span>
                {chevronIcon}
              </span>
            </button>
          )}

          {groups.length === 0 ? (
            <div className="globe-empty-state">
              <p>{emptyTitle}</p>
            </div>
          ) : (
            groups.map((group) => (
              <button
                key={group.country}
                type="button"
                className="globe-list-row"
                onClick={() => onDrillCountry(group)}
              >
                <span className="globe-list-row-left">
                  <span className="globe-list-row-name">
                    {group.country}
                    {group.hasMe && (
                      <small className="globe-list-you-badge">
                        {language === "Bahasa Melayu" ? " · Wilayah anda" : language === "中文" ? " · 您的地区" : " · Yours"}
                      </small>
                    )}
                  </span>
                </span>
                <span className="globe-list-row-right">
                  <span className="globe-list-row-count tabular-nums">{group.count}</span>
                  {chevronIcon}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {viewDepth === "states" && activeCountryGroup && (
        <div className="globe-list-flat">
          {activeCountryGroup.states.map((st) => (
            <button
              key={`${activeCountryGroup.country}_${st.state}`}
              type="button"
              className="globe-list-row"
              onClick={() => onDrillState(activeCountryGroup.country, st)}
            >
              <span className="globe-list-row-left">
                <span className="globe-list-row-name">
                  {st.state}
                  {st.hasMe && (
                    <small className="globe-list-you-badge">
                      {language === "Bahasa Melayu" ? " · Anda" : language === "中文" ? " · 您" : " · Yours"}
                    </small>
                  )}
                </span>
              </span>
              <span className="globe-list-row-right">
                <span className="globe-list-row-count tabular-nums">{st.count}</span>
                {chevronIcon}
              </span>
            </button>
          ))}
        </div>
      )}

      {viewDepth === "nodes" && activeCountryGroup && activeStateGroup && (
        <div className="globe-list-flat">
          {activeStateGroup.nodes.map((node) => {
            const isMe = Boolean(node.isMe || node.id === 0);
            const moodText = getLocalizedMoodLabel(resolveNodeMoodKey(node), language);
            return (
              <button
                key={node.id}
                type="button"
                className="globe-list-row"
                onClick={() =>
                  onSelectNode(node, node.resolved.country, node.resolved.state, false)
                }
              >
                <span className="globe-list-row-left">
                  <span
                    className={`anonymous-light mini mood-${node.moodGlow}`}
                    aria-hidden="true"
                  />
                  <span className="globe-list-row-name">
                    {isMe
                      ? language === "Bahasa Melayu"
                        ? "Anda"
                        : language === "中文"
                          ? "您"
                          : "You"
                      : `#${node.id}`}
                    <small className="globe-list-row-sub"> · {moodText}</small>
                  </span>
                </span>
                <span className="globe-list-row-right">
                  {!isMe && !node.acceptsMessages && (
                    <span className="globe-list-row-count">
                      {language === "Bahasa Melayu" ? "Mesej mati" : language === "中文" ? "不接收" : "Muted"}
                    </span>
                  )}
                  {chevronIcon}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
