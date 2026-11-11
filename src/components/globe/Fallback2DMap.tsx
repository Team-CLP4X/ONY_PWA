import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as GeoJSON from "geojson";
import { useTheme } from "../../theme/ThemeContext";
import {
  COUNTRY_CENTROIDS,
  WORLD_COUNTRIES_110M_GEOJSON,
  type GlobeClusterDisplayItem,
  type GlobeDisplayItem,
  type GlobeNodeDisplayItem,
} from "../../data/worldRegions";
import type { GlobeCameraTarget } from "./GlobeView";
import ClusterLayer, { type ProjectedMarker } from "./ClusterLayer";

export interface Fallback2DMapProps {
  items: GlobeDisplayItem[];
  hiddenSelf: GlobeNodeDisplayItem | null;
  selectedNodeId: number | null;
  cameraTarget: GlobeCameraTarget | null;
  fallbackReason?: string | null;
  language?: string;
  onZoomChange: (zoom: number, center: { lon: number; lat: number }) => void;
  onClusterTap: (cluster: GlobeClusterDisplayItem) => void;
  onNodeTap: (node: GlobeNodeDisplayItem) => void;
  onRetry3D: () => void;
}

const WORLD_W = 1000;
const WORLD_H = 520;
const MIN_LAT = -62;
const MAX_LAT = 80;

function lonLatToWorld(lon: number, lat: number): { wx: number; wy: number } {
  const clampedLat = Math.max(MIN_LAT, Math.min(MAX_LAT, lat));
  const wx = ((lon + 180) / 360) * WORLD_W;
  const wy = ((MAX_LAT - clampedLat) / (MAX_LAT - MIN_LAT)) * WORLD_H;
  return { wx, wy };
}

function worldToLonLat(wx: number, wy: number): { lon: number; lat: number } {
  const lon = (wx / WORLD_W) * 360 - 180;
  const lat = MAX_LAT - (wy / WORLD_H) * (MAX_LAT - MIN_LAT);
  return {
    lon: Math.max(-180, Math.min(180, lon)),
    lat: Math.max(MIN_LAT, Math.min(MAX_LAT, lat)),
  };
}

function zoomToScale(zoom: number, containerW: number, containerH: number): number {
  const fitScale = Math.max(containerW / WORLD_W, containerH / WORLD_H);
  // Map Globe zoom ~[0.8 .. 10] smoothly into 2D zoom scale [1x .. 14x]
  return fitScale * Math.pow(1.42, Math.max(0, zoom - 1.1));
}

function scaleToZoom(scale: number, containerW: number, containerH: number): number {
  const fitScale = Math.max(containerW / WORLD_W, containerH / WORLD_H) || 1;
  const ratio = Math.max(1, scale / fitScale);
  return Math.max(0.9, Math.min(10, 1.1 + Math.log(ratio) / Math.log(1.42)));
}

function ringToSvgPath(ring: GeoJSON.Position[]): string {
  if (ring.length === 0) return "";
  let d = "";
  let prevLon = ring[0][0];
  for (let i = 0; i < ring.length; i++) {
    const lon = ring[i][0];
    const lat = ring[i][1];
    const { wx, wy } = lonLatToWorld(lon, lat);
    // Break lines crossing the antimeridian so polygons never stretch across the screen
    const cmd = i === 0 || Math.abs(lon - prevLon) > 180 ? "M" : "L";
    d += `${cmd}${wx.toFixed(1)},${wy.toFixed(1)}`;
    prevLon = lon;
  }
  return `${d}Z`;
}

const COUNTRY_SVG_PATHS: { key: string; d: string }[] = WORLD_COUNTRIES_110M_GEOJSON.features.map(
  (feat, idx) => {
    const polys =
      feat.geometry.type === "Polygon" ? [feat.geometry.coordinates] : feat.geometry.coordinates;
    const d = polys
      .map((poly) => (poly[0] ? ringToSvgPath(poly[0]) : ""))
      .filter(Boolean)
      .join(" ");
    return { key: `${feat.properties.name}_${idx}`, d };
  },
);

export default function Fallback2DMap({
  items,
  hiddenSelf,
  selectedNodeId,
  cameraTarget,
  fallbackReason,
  language = "English",
  onZoomChange,
  onClusterTap,
  onNodeTap,
  onRetry3D,
}: Fallback2DMapProps) {
  const { tokens, isDark } = useTheme();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 360, h: 440 });

  // Center at Southeast Asia / World overview initially
  const [view, setView] = useState<{ centerLon: number; centerLat: number; zoom: number }>({
    centerLon: 104.5,
    centerLat: 9.5,
    zoom: 1.55,
  });

  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startLon: number;
    startLat: number;
  }>({ active: false, startX: 0, startY: 0, startLon: 104.5, startLat: 9.5 });

  const pinchRef = useRef<{
    active: boolean;
    startDist: number;
    startZoom: number;
  }>({ active: false, startDist: 0, startZoom: 1.55 });

  const lastTapRef = useRef(0);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const updateSize = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        setSize({ w: el.clientWidth, h: el.clientHeight });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!cameraTarget) return;
    setView({
      centerLon: cameraTarget.lon,
      centerLat: cameraTarget.lat,
      zoom: cameraTarget.zoom,
    });
    onZoomChange(cameraTarget.zoom, { lon: cameraTarget.lon, lat: cameraTarget.lat });
  }, [cameraTarget, onZoomChange]);

  const scale = useMemo(
    () => zoomToScale(view.zoom, size.w, size.h),
    [view.zoom, size.w, size.h],
  );

  const projectPoint = useCallback(
    (lon: number, lat: number): { x: number; y: number } => {
      const centerWorld = lonLatToWorld(view.centerLon, view.centerLat);
      const ptWorld = lonLatToWorld(lon, lat);
      // Wrap horizontally to closest world copy
      let dx = ptWorld.wx - centerWorld.wx;
      if (dx > WORLD_W / 2) dx -= WORLD_W;
      if (dx < -WORLD_W / 2) dx += WORLD_W;
      const dy = ptWorld.wy - centerWorld.wy;
      return {
        x: size.w / 2 + dx * scale,
        y: size.h / 2 + dy * scale,
      };
    },
    [view.centerLon, view.centerLat, size.w, size.h, scale],
  );

  const projectedMarkers: ProjectedMarker[] = useMemo(
    () =>
      items.map((item) => {
        const pt = projectPoint(item.lon, item.lat);
        const inside = pt.x >= -36 && pt.x <= size.w + 36 && pt.y >= -36 && pt.y <= size.h + 36;
        return { item, x: pt.x, y: pt.y, visible: inside };
      }),
    [items, projectPoint, size.w, size.h],
  );

  const hiddenSelfMarker = useMemo(() => {
    if (!hiddenSelf) return null;
    const pt = projectPoint(hiddenSelf.lon, hiddenSelf.lat);
    const inside = pt.x >= -24 && pt.x <= size.w + 24 && pt.y >= -24 && pt.y <= size.h + 24;
    return { item: hiddenSelf, x: pt.x, y: pt.y, visible: inside };
  }, [hiddenSelf, projectPoint, size.w, size.h]);

  const countryLabels = useMemo(() => {
    if (view.zoom < 1.8) return [];
    const list: { id: string; name: string; x: number; y: number }[] = [];
    for (const c of COUNTRY_CENTROIDS) {
      if (view.zoom < 2.6 && !["Malaysia", "Indonesia", "Thailand", "China", "Japan", "India", "Australia", "United States of America", "United Kingdom", "Brazil"].includes(c.name)) {
        continue;
      }
      const pt = projectPoint(c.lon, c.lat);
      if (pt.x < 24 || pt.x > size.w - 24 || pt.y < 52 || pt.y > size.h - 52) continue;
      list.push({
        id: c.id,
        name: c.name === "United States of America" ? "United States" : c.name,
        x: pt.x,
        y: pt.y,
      });
    }
    return list;
  }, [view.zoom, projectPoint, size.w, size.h]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startLon: view.centerLon,
      startLat: view.centerLat,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || pinchRef.current.active) return;
    const dxPx = e.clientX - dragRef.current.startX;
    const dyPx = e.clientY - dragRef.current.startY;
    const startWorld = lonLatToWorld(dragRef.current.startLon, dragRef.current.startLat);
    let nextWx = startWorld.wx - dxPx / scale;
    while (nextWx < 0) nextWx += WORLD_W;
    while (nextWx >= WORLD_W) nextWx -= WORLD_W;
    const nextWy = Math.max(0, Math.min(WORLD_H, startWorld.wy - dyPx / scale));
    const next = worldToLonLat(nextWx, nextWy);
    setView((prev) => ({ ...prev, centerLon: next.lon, centerLat: next.lat }));
    onZoomChange(view.zoom, next);
  };

  const handlePointerUp = () => {
    dragRef.current.active = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.55 : -0.55;
    setView((prev) => {
      const nextZoom = Math.max(1.0, Math.min(9.5, Number((prev.zoom + delta).toFixed(2))));
      onZoomChange(nextZoom, { lon: prev.centerLon, lat: prev.centerLat });
      return { ...prev, zoom: nextZoom };
    });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      dragRef.current.active = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = {
        active: true,
        startDist: Math.hypot(dx, dy) || 1,
        startZoom: view.zoom,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (pinchRef.current.active && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy) || 1;
      const ratio = dist / pinchRef.current.startDist;
      const baseScale = zoomToScale(pinchRef.current.startZoom, size.w, size.h);
      const nextZoom = Number(scaleToZoom(baseScale * ratio, size.w, size.h).toFixed(2));
      const clampedZoom = Math.max(1.0, Math.min(9.5, nextZoom));
      setView((prev) => {
        onZoomChange(clampedZoom, { lon: prev.centerLon, lat: prev.centerLat });
        return { ...prev, zoom: clampedZoom };
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      pinchRef.current.active = false;
    }
    if (e.touches.length === 0 && !(e.target as HTMLElement).closest("button")) {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        setView((prev) => {
          const nextZoom = Math.min(9.5, Number((prev.zoom + 1.2).toFixed(2)));
          onZoomChange(nextZoom, { lon: prev.centerLon, lat: prev.centerLat });
          return { ...prev, zoom: nextZoom };
        });
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
  };

  const centerWorld = lonLatToWorld(view.centerLon, view.centerLat);
  const offsetX = size.w / 2 - centerWorld.wx * scale;
  const offsetY = size.h / 2 - centerWorld.wy * scale;

  const fallbackCopy = {
    msg:
      language === "Bahasa Melayu"
        ? "Glob 3D tidak disokong di sini — paparan peta 2D"
        : language === "中文"
          ? "当前环境暂不支持 3D 星球，已切换轻量 2D 地图"
          : "3D globe unavailable here — showing 2D map",
    retry:
      language === "Bahasa Melayu"
        ? "Cuba lagi"
        : language === "中文"
          ? "重试 3D"
          : "Try again",
  };

  return (
    <div
      ref={stageRef}
      className="globe-2d-fallback"
      style={{
        background: isDark
          ? `color-mix(in srgb, ${tokens.background} 82%, ${tokens.primary} 18%)`
          : `color-mix(in srgb, ${tokens.background} 86%, ${tokens.primary} 14%)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-label="Interactive 2D community world map"
    >
      {/* Lightweight SVG vector world map */}
      <svg
        className="globe-2d-svg"
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        aria-hidden="true"
      >
        {/* Render three horizontal world wraps (-1, 0, +1) for seamless horizontal panning */}
        {[-1, 0, 1].map((wrapIdx) => (
          <g
            key={wrapIdx}
            transform={`translate(${offsetX + wrapIdx * WORLD_W * scale}, ${offsetY}) scale(${scale})`}
          >
            {/* Subtle latitude grid lines */}
            {[-30, 0, 30, 60].map((lat) => {
              const { wy } = lonLatToWorld(0, lat);
              return (
                <line
                  key={lat}
                  x1={0}
                  y1={wy}
                  x2={WORLD_W}
                  y2={wy}
                  stroke={tokens.border}
                  strokeOpacity={isDark ? 0.28 : 0.35}
                  strokeWidth={0.7 / scale}
                />
              );
            })}
            {COUNTRY_SVG_PATHS.map((c) => (
              <path
                key={c.key}
                d={c.d}
                fill={
                  isDark
                    ? `color-mix(in srgb, ${tokens.surfaceElevated} 76%, ${tokens.primary} 24%)`
                    : tokens.surface
                }
                stroke={tokens.border}
                strokeWidth={0.8 / scale}
              />
            ))}
          </g>
        ))}
      </svg>

      {/* Subtle country labels when zoomed in */}
      <div className="globe-geo-labels" aria-hidden="true">
        {countryLabels.map((lbl) => (
          <span
            key={lbl.id}
            className="globe-geo-label country"
            style={{
              transform: `translate3d(${lbl.x}px, ${lbl.y}px, 0) translate(-50%, -50%)`,
            }}
          >
            {lbl.name}
          </span>
        ))}
      </div>

      <ClusterLayer
        markers={projectedMarkers}
        hiddenSelfMarker={hiddenSelfMarker}
        selectedNodeId={selectedNodeId}
        reducedMotion={false}
        language={language}
        onClusterTap={onClusterTap}
        onNodeTap={onNodeTap}
      />

      {/* Non-blocking status pill with "Try again" button (never forces list view) */}
      <div
        className="globe-2d-notice-pill"
        role="status"
        title={fallbackReason || undefined}
      >
        <span>{fallbackCopy.msg}</span>
        <button type="button" className="globe-2d-retry-btn" onClick={onRetry3D}>
          {fallbackCopy.retry}
        </button>
      </div>
    </div>
  );
}
