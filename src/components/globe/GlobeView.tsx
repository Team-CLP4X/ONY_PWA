import React, { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "../../theme/ThemeContext";
import {
  COUNTRY_CENTROIDS,
  STATE_BOUNDARIES_GEOJSON,
  STATE_PROVINCES,
  WORLD_BORDERS_110M_GEOJSON,
  WORLD_BORDERS_GEOJSON,
  WORLD_COUNTRIES_110M_GEOJSON,
  WORLD_COUNTRIES_GEOJSON,
  type GlobeClusterDisplayItem,
  type GlobeDisplayItem,
  type GlobeHierarchyLevel,
  type GlobeNodeDisplayItem,
} from "../../data/worldRegions";
import ClusterLayer, { type ProjectedMarker } from "./ClusterLayer";

export interface GlobeCameraTarget {
  lon: number;
  lat: number;
  zoom: number;
  seq: number;
}

export interface GlobeViewProps {
  items: GlobeDisplayItem[];
  hiddenSelf: GlobeNodeDisplayItem | null;
  level: GlobeHierarchyLevel;
  selectedNodeId: number | null;
  cameraTarget: GlobeCameraTarget | null;
  pauseAutoRotate?: boolean;
  loading?: boolean;
  retryNonce?: number;
  language?: string;
  onZoomChange: (zoom: number, center: { lon: number; lat: number }) => void;
  onClusterTap: (cluster: GlobeClusterDisplayItem) => void;
  onNodeTap: (node: GlobeNodeDisplayItem) => void;
  onWebGlError: (reason: string) => void;
}

interface LabelProjection {
  key: string;
  text: string;
  kind: "country" | "state";
  x: number;
  y: number;
}

function parseColorChannels(colorStr: string): [number, number, number] {
  const s = (colorStr || "").trim();
  const hexMatch = /^([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s.startsWith("#") ? s.slice(1) : "");
  if (hexMatch) {
    let h = hexMatch[1];
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  const nums = s.match(/\d+/g);
  if (nums && nums.length >= 3) {
    return [Number(nums[0]), Number(nums[1]), Number(nums[2])];
  }
  return [24, 48, 62];
}

function mixRgb(
  colorA: string,
  colorB: string,
  weightB: number,
  alpha = 1,
): string {
  const [r1, g1, b1] = parseColorChannels(colorA);
  const [r2, g2, b2] = parseColorChannels(colorB);
  const r = Math.round(r1 * (1 - weightB) + r2 * weightB);
  const g = Math.round(g1 * (1 - weightB) + g2 * weightB);
  const b = Math.round(b1 * (1 - weightB) + b2 * weightB);
  return alpha >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function tintOceanColor(bgHex: string, primaryHex: string, isDark: boolean): string {
  const [r, g, b] = parseColorChannels(bgHex);
  const [pr, pg, pb] = parseColorChannels(primaryHex);
  if (isDark) {
    const dr = Math.max(4, Math.min(28, Math.round(r * 0.45 + pr * 0.05 + 4)));
    const dg = Math.max(10, Math.min(44, Math.round(g * 0.52 + pg * 0.08 + 12)));
    const db = Math.max(24, Math.min(68, Math.round(b * 0.72 + pb * 0.1 + 26)));
    return `rgb(${dr}, ${dg}, ${db})`;
  }
  const lr = Math.min(248, Math.round(r * 0.78 + pr * 0.1 + 24));
  const lg = Math.min(250, Math.round(g * 0.8 + pg * 0.1 + 28));
  const lb = Math.min(254, Math.round(b * 0.82 + pb * 0.12 + 34));
  return `rgb(${lr}, ${lg}, ${lb})`;
}

function isHemisphereFront(
  lon: number,
  lat: number,
  centerLon: number,
  centerLat: number,
  zoom: number,
): boolean {
  if (zoom >= 4.2) return true;
  const deg2rad = Math.PI / 180;
  const phi1 = lat * deg2rad;
  const phi2 = centerLat * deg2rad;
  const dLambda = (lon - centerLon) * deg2rad;
  const cosAngle =
    Math.sin(phi1) * Math.sin(phi2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return cosAngle > 0.08;
}

/**
 * Checks library availability separately from WebGL context probing
 * (tries webgl2, then webgl, then experimental-webgl) and logs exact errors.
 */
function detectGlobeCapabilities(): {
  ok: boolean;
  reason?: string;
} {
  if (typeof window === "undefined") {
    return { ok: false, reason: "Non-browser environment" };
  }
  if (!maplibregl || typeof maplibregl.Map !== "function") {
    const msg = "MapLibre GL JS library failed to load.";
    console.error("[ONY Globe]", msg);
    return { ok: false, reason: msg };
  }
  if (!window.WebGLRenderingContext) {
    const msg = "WebGLRenderingContext is unavailable in this browser context.";
    console.error("[ONY Globe]", msg);
    return { ok: false, reason: msg };
  }

  const canvas = document.createElement("canvas");
  const attrs: WebGLContextAttributes = {
    failIfMajorPerformanceCaveat: false,
    antialias: false,
    alpha: true,
  };

  for (const kind of ["webgl2", "webgl", "experimental-webgl"] as const) {
    try {
      const ctx = canvas.getContext(kind, attrs);
      if (ctx) {
        return { ok: true };
      }
    } catch (err) {
      console.error(`[ONY Globe] ${kind} context check threw:`, err);
    }
  }

  const msg = "WebGL2 and WebGL context creation returned null in this environment.";
  console.error("[ONY Globe]", msg);
  return { ok: false, reason: msg };
}

const FEATURED_COUNTRY_NAMES = new Set([
  "Malaysia",
  "Indonesia",
  "Singapore",
  "Thailand",
  "Philippines",
  "Vietnam",
  "Japan",
  "China",
  "South Korea",
  "India",
  "Australia",
  "United Kingdom",
  "France",
  "Germany",
  "United States of America",
  "Canada",
  "Brazil",
  "South Africa",
  "Saudi Arabia",
]);

export default function GlobeView({
  items,
  hiddenSelf,
  level,
  selectedNodeId,
  cameraTarget,
  pauseAutoRotate = false,
  loading = false,
  retryNonce = 0,
  language = "English",
  onZoomChange,
  onClusterTap,
  onNodeTap,
  onWebGlError,
}: GlobeViewProps) {
  const { tokens, isDark } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const itemsRef = useRef(items);
  const hiddenSelfRef = useRef(hiddenSelf);
  const onWebGlErrorRef = useRef(onWebGlError);
  const lastTapRef = useRef<number>(0);

  itemsRef.current = items;
  hiddenSelfRef.current = hiddenSelf;
  onWebGlErrorRef.current = onWebGlError;

  const [projectedMarkers, setProjectedMarkers] = useState<ProjectedMarker[]>([]);
  const [hiddenSelfMarker, setHiddenSelfMarker] = useState<{
    item: GlobeNodeDisplayItem;
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);
  const [labels, setLabels] = useState<LabelProjection[]>([]);
  const [mapReady, setMapReady] = useState(false);
  // Source 0 = Primary 50m 3D Globe + atmosphere; Source 1 = Lightweight 110m retry fallback
  const [sourceTier, setSourceTier] = useState<0 | 1>(0);

  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const paletteColors = useMemo(() => {
    const oceanColor = tintOceanColor(tokens.background, tokens.primary, isDark);
    const skyEdge = mixRgb(oceanColor, tokens.primary, isDark ? 0.22 : 0.14, 1);
    const landColor = isDark
      ? mixRgb(tokens.surfaceElevated, tokens.primary, 0.24, 1)
      : mixRgb(tokens.surface, tokens.surfaceSoft, 0.35, 1);
    const landGlowStroke = isDark
      ? mixRgb(tokens.accent, tokens.primary, 0.5, 0.42)
      : mixRgb(tokens.border, tokens.primary, 0.2, 0.45);
    const borderLine = isDark
      ? mixRgb(tokens.border, tokens.primary, 0.3, 0.38)
      : mixRgb(tokens.border, tokens.textSecondary, 0.25, 0.5);
    const stateBorderLine = isDark
      ? mixRgb(tokens.accent, tokens.textSecondary, 0.4, 0.34)
      : mixRgb(tokens.textSecondary, tokens.border, 0.4, 0.42);

    return {
      oceanColor,
      skyEdge,
      landColor,
      landGlowStroke,
      borderLine,
      stateBorderLine,
    };
  }, [tokens, isDark]);

  const syncProjections = useRef<() => void>(() => {});
  syncProjections.current = () => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el) return;

    const width = el.clientWidth;
    const height = el.clientHeight;
    if (!width || !height) return;

    const center = map.getCenter();
    const zoom = map.getZoom();

    const nextMarkers: ProjectedMarker[] = itemsRef.current.map((item) => {
      const front = isHemisphereFront(item.lon, item.lat, center.lng, center.lat, zoom);
      if (!front) {
        return { item, x: -999, y: -999, visible: false };
      }
      const pt = map.project([item.lon, item.lat]);
      const inside = pt.x >= -28 && pt.x <= width + 28 && pt.y >= -28 && pt.y <= height + 28;
      return { item, x: pt.x, y: pt.y, visible: inside };
    });
    setProjectedMarkers(nextMarkers);

    const hidden = hiddenSelfRef.current;
    if (hidden) {
      const front = isHemisphereFront(hidden.lon, hidden.lat, center.lng, center.lat, zoom);
      if (front) {
        const pt = map.project([hidden.lon, hidden.lat]);
        const inside = pt.x >= -24 && pt.x <= width + 24 && pt.y >= -24 && pt.y <= height + 24;
        setHiddenSelfMarker({ item: hidden, x: pt.x, y: pt.y, visible: inside });
      } else {
        setHiddenSelfMarker(null);
      }
    } else {
      setHiddenSelfMarker(null);
    }

    const nextLabels: LabelProjection[] = [];
    if (zoom < 4.9) {
      for (const c of COUNTRY_CENTROIDS) {
        if (zoom < 2.3 && !FEATURED_COUNTRY_NAMES.has(c.name)) continue;
        if (!isHemisphereFront(c.lon, c.lat, center.lng, center.lat, zoom)) continue;
        const pt = map.project([c.lon, c.lat]);
        if (pt.x < 18 || pt.x > width - 18 || pt.y < 52 || pt.y > height - 48) continue;
        const labelText = c.name === "United States of America" ? "United States" : c.name;
        nextLabels.push({
          key: `lbl_c_${c.id}`,
          text: labelText,
          kind: "country",
          x: pt.x,
          y: pt.y,
        });
      }
    }

    if (zoom >= 3.1) {
      for (const st of STATE_PROVINCES) {
        if (!isHemisphereFront(st.lon, st.lat, center.lng, center.lat, zoom)) continue;
        const pt = map.project([st.lon, st.lat]);
        if (pt.x < 18 || pt.x > width - 18 || pt.y < 52 || pt.y > height - 48) continue;
        nextLabels.push({
          key: `lbl_s_${st.id}`,
          text: st.name,
          kind: "state",
          x: pt.x,
          y: pt.y,
        });
      }
    }

    setLabels(nextLabels);
  };

  const interactionTimestampRef = useRef<number>(0);
  const isUserInteractingRef = useRef<boolean>(false);

  // Reset to primary source whenever user clicks "Try again"
  useEffect(() => {
    setSourceTier(0);
    setMapReady(false);
  }, [retryNonce]);

  // Initialize MapLibre once container has non-zero layout dimensions, with 1 automatic fallback retry
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const capability = detectGlobeCapabilities();
    if (!capability.ok) {
      onWebGlErrorRef.current(capability.reason || "WebGL unavailable");
      return;
    }

    if (typeof window !== "undefined" && maplibreWorkerUrl && typeof maplibregl.setWorkerUrl === "function") {
      try {
        maplibregl.setWorkerUrl(new URL(maplibreWorkerUrl, window.location.origin).href);
      } catch {
        maplibregl.setWorkerUrl(maplibreWorkerUrl);
      }
    }

    let disposed = false;
    let map: maplibregl.Map | null = null;
    let waitResizeObserver: ResizeObserver | null = null;
    let activeResizeObserver: ResizeObserver | null = null;
    let rafInitId = 0;

    const triggerFailureOrRetry = (detail: string, err?: unknown) => {
      if (disposed) return;
      console.error(`[ONY Globe] Source tier ${sourceTier} failed:`, detail, err);
      if (sourceTier === 0) {
        console.warn("[ONY Globe] Retrying once with lightweight 110m fallback style...");
        setSourceTier(1);
      } else {
        onWebGlErrorRef.current(detail);
      }
    };

    const bootMap = () => {
      if (disposed || !containerRef.current) return;
      const el = containerRef.current;
      if (el.clientWidth < 10 || el.clientHeight < 10) return;

      try {
        const useLightweightStyle = sourceTier === 1;
        const styleSpec: maplibregl.StyleSpecification = useLightweightStyle
          ? {
              version: 8,
              projection: { type: "globe" },
              sources: {
                countries: {
                  type: "geojson",
                  data: WORLD_COUNTRIES_110M_GEOJSON as unknown as GeoJSON.GeoJSON,
                },
                "country-borders": {
                  type: "geojson",
                  data: WORLD_BORDERS_110M_GEOJSON as unknown as GeoJSON.GeoJSON,
                },
              },
              layers: [
                {
                  id: "ocean-background",
                  type: "background",
                  paint: { "background-color": paletteColors.oceanColor },
                },
                {
                  id: "countries-fill",
                  type: "fill",
                  source: "countries",
                  paint: { "fill-color": paletteColors.landColor, "fill-opacity": 0.96 },
                },
                {
                  id: "country-borders-line",
                  type: "line",
                  source: "country-borders",
                  paint: { "line-color": paletteColors.borderLine, "line-width": 0.9 },
                },
              ],
            }
          : {
              version: 8,
              projection: { type: "globe" },
              sky: {
                "sky-color": paletteColors.oceanColor,
                "horizon-color": paletteColors.skyEdge,
                "fog-color": paletteColors.oceanColor,
                "sky-horizon-blend": 0.45,
                "horizon-fog-blend": 0.65,
                "atmosphere-blend": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  0,
                  0.85,
                  4.5,
                  0.35,
                  7,
                  0,
                ],
              },
              sources: {
                countries: {
                  type: "geojson",
                  data: WORLD_COUNTRIES_GEOJSON as unknown as GeoJSON.GeoJSON,
                },
                "country-borders": {
                  type: "geojson",
                  data: WORLD_BORDERS_GEOJSON as unknown as GeoJSON.GeoJSON,
                },
                "state-borders": {
                  type: "geojson",
                  data: STATE_BOUNDARIES_GEOJSON as unknown as GeoJSON.GeoJSON,
                },
              },
              layers: [
                {
                  id: "ocean-background",
                  type: "background",
                  paint: { "background-color": paletteColors.oceanColor },
                },
                {
                  id: "countries-fill",
                  type: "fill",
                  source: "countries",
                  paint: { "fill-color": paletteColors.landColor, "fill-opacity": 0.96 },
                },
                {
                  id: "countries-coast-glow",
                  type: "line",
                  source: "countries",
                  paint: {
                    "line-color": paletteColors.landGlowStroke,
                    "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.8, 5, 1.4],
                  },
                },
                {
                  id: "country-borders-line",
                  type: "line",
                  source: "country-borders",
                  paint: {
                    "line-color": paletteColors.borderLine,
                    "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 5, 1.15],
                  },
                },
                {
                  id: "state-borders-line",
                  type: "line",
                  source: "state-borders",
                  minzoom: 2.6,
                  paint: {
                    "line-color": paletteColors.stateBorderLine,
                    "line-width": 1,
                    "line-dasharray": [3, 3],
                    "line-opacity": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      2.6,
                      0,
                      3.5,
                      0.72,
                    ],
                  },
                },
              ],
            };

        map = new maplibregl.Map({
          container: el,
          center: [104.5, 9.5],
          zoom: 1.55,
          minZoom: 0.7,
          maxZoom: 11,
          attributionControl: false,
          dragRotate: true,
          touchZoomRotate: true,
          touchPitch: true,
          doubleClickZoom: true,
          scrollZoom: true,
          canvasContextAttributes: {
            failIfMajorPerformanceCaveat: false,
            antialias: false,
            powerPreference: "default",
          },
          style: styleSpec,
        });
      } catch (err) {
        triggerFailureOrRetry(
          err instanceof Error ? err.message : "MapLibre constructor failed",
          err,
        );
        return;
      }

      mapRef.current = map;

      // Call resize right after layout frame settles
      requestAnimationFrame(() => {
        if (!disposed && map) {
          map.resize();
          syncProjections.current();
        }
      });

      const markInteractionStart = () => {
        isUserInteractingRef.current = true;
        interactionTimestampRef.current = Date.now();
      };
      const markInteractionEnd = () => {
        isUserInteractingRef.current = false;
        interactionTimestampRef.current = Date.now();
      };

      map.on("load", () => {
        if (disposed || !map) return;
        map.resize();
        setMapReady(true);
        syncProjections.current();
      });

      map.on("render", () => {
        syncProjections.current();
      });

      map.on("move", () => {
        if (!map) return;
        const c = map.getCenter();
        onZoomChange(map.getZoom(), { lon: c.lng, lat: c.lat });
      });

      map.on("dragstart", markInteractionStart);
      map.on("zoomstart", markInteractionStart);
      map.on("rotatestart", markInteractionStart);
      map.on("dragend", markInteractionEnd);
      map.on("zoomend", markInteractionEnd);
      map.on("rotateend", markInteractionEnd);

      map.on("webglcontextlost", (ev) => {
        triggerFailureOrRetry("WebGL context lost", ev);
      });

      map.on("error", (ev: { error?: unknown }) => {
        const errObj = ev?.error;
        console.error("[ONY Globe] MapLibre runtime error:", errObj || ev);
        const msg = errObj instanceof Error ? errObj.message : String(errObj || "");
        if (/webgl|worker|shader|context|style/i.test(msg)) {
          triggerFailureOrRetry(msg || "MapLibre error", errObj);
        }
      });

      activeResizeObserver = new ResizeObserver(() => {
        if (!map || disposed) return;
        map.resize();
        syncProjections.current();
      });
      activeResizeObserver.observe(el);
    };

    if (container.clientWidth >= 10 && container.clientHeight >= 10) {
      bootMap();
    } else {
      waitResizeObserver = new ResizeObserver(() => {
        if (disposed || map) return;
        if (container.clientWidth >= 10 && container.clientHeight >= 10) {
          waitResizeObserver?.disconnect();
          waitResizeObserver = null;
          rafInitId = requestAnimationFrame(bootMap);
        }
      });
      waitResizeObserver.observe(container);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(rafInitId);
      waitResizeObserver?.disconnect();
      activeResizeObserver?.disconnect();
      mapRef.current = null;
      if (map) {
        map.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceTier, retryNonce]);

  // Re-apply theme colors dynamically when user changes palette or Light/Dark mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    try {
      if (sourceTier === 0) {
        map.setSky({
          "sky-color": paletteColors.oceanColor,
          "horizon-color": paletteColors.skyEdge,
          "fog-color": paletteColors.oceanColor,
          "sky-horizon-blend": 0.45,
          "horizon-fog-blend": 0.65,
          "atmosphere-blend": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            0.85,
            4.5,
            0.35,
            7,
            0,
          ],
        });
      }
      if (map.getLayer("ocean-background")) {
        map.setPaintProperty("ocean-background", "background-color", paletteColors.oceanColor);
      }
      if (map.getLayer("countries-fill")) {
        map.setPaintProperty("countries-fill", "fill-color", paletteColors.landColor);
      }
      if (map.getLayer("countries-coast-glow")) {
        map.setPaintProperty("countries-coast-glow", "line-color", paletteColors.landGlowStroke);
      }
      if (map.getLayer("country-borders-line")) {
        map.setPaintProperty("country-borders-line", "line-color", paletteColors.borderLine);
      }
      if (map.getLayer("state-borders-line")) {
        map.setPaintProperty("state-borders-line", "line-color", paletteColors.stateBorderLine);
      }
    } catch {
      // Ignore transitional style update errors
    }
  }, [paletteColors, mapReady, sourceTier]);

  useEffect(() => {
    syncProjections.current();
  }, [items, hiddenSelf, level]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !cameraTarget) return;
    interactionTimestampRef.current = Date.now();
    map.flyTo({
      center: [cameraTarget.lon, cameraTarget.lat],
      zoom: cameraTarget.zoom,
      duration: reducedMotion ? 0 : 850,
      essential: true,
    });
  }, [cameraTarget, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const map = mapRef.current;
      const idleMs = Date.now() - interactionTimestampRef.current;
      if (
        map &&
        !pauseAutoRotate &&
        !isUserInteractingRef.current &&
        idleMs > 3500 &&
        map.getZoom() < 2.6
      ) {
        const c = map.getCenter();
        map.setCenter([c.lng + dt * 2.4, c.lat]);
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [reducedMotion, pauseAutoRotate]);

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    interactionTimestampRef.current = Date.now();
    if (e.touches.length > 0 || (e.target as HTMLElement).closest("button")) return;
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      const map = mapRef.current;
      if (map) {
        map.easeTo({
          zoom: Math.min(10, map.getZoom() + 1.3),
          duration: reducedMotion ? 0 : 320,
        });
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  return (
    <div
      className="globe-webgl-wrapper"
      onPointerDown={() => {
        interactionTimestampRef.current = Date.now();
      }}
      onWheel={() => {
        interactionTimestampRef.current = Date.now();
      }}
      onTouchStart={() => {
        interactionTimestampRef.current = Date.now();
      }}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={containerRef}
        className="globe-map-canvas"
        aria-label={
          language === "Bahasa Melayu"
            ? "Glob komuniti interaktif 3D"
            : language === "中文"
              ? "可交互 3D 社区星球"
              : "Interactive 3D community globe"
        }
      />

      <div className="globe-geo-labels" aria-hidden="true">
        {labels.map((lbl) => (
          <span
            key={lbl.key}
            className={`globe-geo-label ${lbl.kind}`}
            style={{
              transform: `translate3d(${lbl.x}px, ${lbl.y}px, 0) translate(-50%, -50%)`,
            }}
          >
            {lbl.text}
          </span>
        ))}
      </div>

      <ClusterLayer
        markers={projectedMarkers}
        hiddenSelfMarker={hiddenSelfMarker}
        selectedNodeId={selectedNodeId}
        reducedMotion={reducedMotion}
        language={language}
        onClusterTap={onClusterTap}
        onNodeTap={onNodeTap}
      />

      {mapReady && !loading && items.length === 0 && (
        <div className="globe-empty-pill" role="status">
          {language === "Bahasa Melayu"
            ? "Tiada ahli kelihatan di kawasan ini lagi"
            : language === "中文"
              ? "该区域暂无人公开微光"
              : "No one is visible in this area yet"}
        </div>
      )}

      {(loading || !mapReady) && (
        <div className="globe-loading-overlay" aria-live="polite">
          <span className="spinner mini" />
          <span>
            {language === "Bahasa Melayu"
              ? "Memuatkan glob komuniti…"
              : language === "中文"
                ? "正在加载 3D 星球…"
                : "Preparing globe…"}
          </span>
        </div>
      )}
    </div>
  );
}
