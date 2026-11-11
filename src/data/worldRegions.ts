import Supercluster from "supercluster";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type * as GeoJSON from "geojson";
import countries50m from "world-atlas/countries-50m.json";
import countries110m from "world-atlas/countries-110m.json";
import type { FirestoreGlobeUser } from "../firebase/firestore";

export type GlobeUser = FirestoreGlobeUser;

// =========================================================================
// 0. Language-Neutral Mood Keys & Localized Labels
// =========================================================================

export type GlobeMoodKey =
  | "great"
  | "good"
  | "calm"
  | "okay"
  | "low"
  | "difficult"
  | "none";

export function normalizeMoodKey(
  rawLabelOrKey?: string | null,
  level?: number,
  glow?: string,
): GlobeMoodKey {
  if (typeof level === "number") {
    if (level >= 5) return "great";
    if (level === 4) return "good";
    if (level === 3) return "okay";
    if (level === 2) return "low";
    if (level === 1) return "difficult";
  }

  const raw = (rawLabelOrKey || "").trim().toLowerCase();
  if (raw === "great" || raw === "sangat baik" || raw === "极好") return "great";
  if (raw === "good" || raw === "baik" || raw === "不错" || raw === "higher mood") return "good";
  if (raw === "calm" || raw === "tenang" || raw === "平静" || raw === "reflective") return "calm";
  if (
    raw === "okay" ||
    raw === "biasa" ||
    raw === "平稳" ||
    raw === "平静如常" ||
    raw === "steady"
  ) {
    return "okay";
  }
  if (raw === "low" || raw === "rendah" || raw === "低落" || raw === "lower mood") return "low";
  if (
    raw === "difficult" ||
    raw === "very low" ||
    raw === "sukar" ||
    raw === "艰难" ||
    raw === "hard"
  ) {
    return "difficult";
  }
  if (
    raw === "none" ||
    raw === "no check-in" ||
    raw === "no check-in shared" ||
    raw === "tiada rekod" ||
    raw === "未记录" ||
    raw === "未记录心晴"
  ) {
    return "none";
  }

  if (glow === "bright") return "calm";
  if (glow === "soft") return "okay";
  if (glow === "dim") return "low";
  if (glow === "neutral") return "none";
  return "calm";
}

export function resolveNodeMoodKey(
  user: Pick<GlobeUser, "moodKey" | "moodLabel" | "moodGlow">,
): GlobeMoodKey {
  return normalizeMoodKey(user.moodKey || user.moodLabel, undefined, user.moodGlow);
}

export function getLocalizedMoodLabel(moodKey: GlobeMoodKey, language = "English"): string {
  if (language === "Bahasa Melayu") {
    switch (moodKey) {
      case "great":
        return "Sangat Baik";
      case "good":
        return "Baik";
      case "calm":
        return "Tenang";
      case "okay":
        return "Biasa";
      case "low":
        return "Rendah";
      case "difficult":
        return "Sukar";
      case "none":
        return "Tiada rekod";
    }
  }
  if (language === "中文") {
    switch (moodKey) {
      case "great":
        return "极好";
      case "good":
        return "不错";
      case "calm":
        return "平静";
      case "okay":
        return "平稳";
      case "low":
        return "低落";
      case "difficult":
        return "艰难";
      case "none":
        return "未记录";
    }
  }
  switch (moodKey) {
    case "great":
      return "Great";
    case "good":
      return "Good";
    case "calm":
      return "Calm";
    case "okay":
      return "Okay";
    case "low":
      return "Low";
    case "difficult":
      return "Very low";
    case "none":
      return "No check-in";
  }
}

export function getMoodLegendItems(language = "English"): {
  glow: "bright" | "soft" | "dim" | "neutral";
  label: string;
}[] {
  if (language === "Bahasa Melayu") {
    return [
      { glow: "bright", label: "Tenang / Baik" },
      { glow: "soft", label: "Biasa" },
      { glow: "dim", label: "Rendah" },
      { glow: "neutral", label: "Tiada rekod" },
    ];
  }
  if (language === "中文") {
    return [
      { glow: "bright", label: "舒畅 / 平静" },
      { glow: "soft", label: "平稳" },
      { glow: "dim", label: "低落" },
      { glow: "neutral", label: "未记录" },
    ];
  }
  return [
    { glow: "bright", label: "Calm / Good" },
    { glow: "soft", label: "Okay" },
    { glow: "dim", label: "Low" },
    { glow: "neutral", label: "No check-in" },
  ];
}

// =========================================================================
// 1. Types
// =========================================================================

export interface RegionCentroid {
  id: string;
  name: string;
  lon: number;
  lat: number;
  bbox: [number, number, number, number];
  macroRegion: string;
  zoomHint: number;
}

export interface StateProvinceRegion {
  id: string;
  name: string;
  country: string;
  lon: number;
  lat: number;
  spanDeg: number;
}

export interface ResolvedRegion {
  country: string;
  state: string;
  macroRegion: string;
  coarseLat: number;
  coarseLon: number;
  countryLat: number;
  countryLon: number;
  stateLat: number;
  stateLon: number;
}

export type GlobeHierarchyLevel = "world" | "country" | "state";

export interface GlobeClusterDisplayItem {
  kind: "cluster";
  key: string;
  label: string;
  subLabel?: string;
  level: GlobeHierarchyLevel;
  count: number;
  lon: number;
  lat: number;
  targetZoom: number;
  countryName?: string;
  stateName?: string;
  hasMe: boolean;
  mergedSmallRegion: boolean;
}

export interface GlobeNodeDisplayItem {
  kind: "node";
  key: string;
  user: GlobeUser;
  lon: number;
  lat: number;
  countryName: string;
  stateName: string;
  isMe: boolean;
  isHiddenSelf: boolean;
}

export type GlobeDisplayItem = GlobeClusterDisplayItem | GlobeNodeDisplayItem;

export interface ListCountryGroup {
  country: string;
  macroRegion: string;
  count: number;
  lon: number;
  lat: number;
  hasMe: boolean;
  states: {
    state: string;
    count: number;
    lon: number;
    lat: number;
    hasMe: boolean;
    isMergedSmallRegion: boolean;
    nodes: (GlobeUser & { resolved: ResolvedRegion })[];
  }[];
}

// =========================================================================
// 2. Parse Natural Earth 50m (Primary) & 110m (Fallback / 2D Map)
// =========================================================================

type WorldAtlasTopology = Topology<{
  countries: GeometryCollection<{ name?: string }>;
  land?: GeometryCollection;
}>;

const worldTopology50 = countries50m as unknown as WorldAtlasTopology;
const worldTopology110 = countries110m as unknown as WorldAtlasTopology;

const rawCountries50 = topojson.feature(
  worldTopology50,
  worldTopology50.objects.countries,
) as GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, { name?: string }>;

const rawCountries110 = topojson.feature(
  worldTopology110,
  worldTopology110.objects.countries,
) as GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, { name?: string }>;

// Uninhabited, disputed glacial, or tiny remote overseas territories that
// should never be picked as fallback homes for ocean/offshore coordinates.
const EXCLUDED_TERRITORY_NAMES = new Set([
  "Antarctica",
  "Br. Indian Ocean Ter.",
  "Ashmore and Cartier Is.",
  "Heard I. and McDonald Is.",
  "Fr. S. Antarctic Lands",
  "S. Geo. and the Is.",
  "Bouvet I.",
  "Clipperton I.",
  "Pitcairn Is.",
  "Siachen Glacier",
  "U.S. Minor Outlying Is.",
  "Indian Ocean Ter.",
  "Coral Sea Is.",
  "Spratly Is.",
  "Paracel Is.",
  "Wake I.",
  "N. Mariana Is.",
  "Kiribati",
  "Niue",
  "Tokelau",
  "Wallis and Futuna Is.",
  "Norfolk Island",
  "St. Helena",
  "Falkland Is.",
  "Svalbard",
  "Jan Mayen",
  "W. Sahara",
]);

function computeRingBBox(ring: GeoJSON.Position[]): [number, number, number, number] {
  let minLon = 180;
  let minLat = 90;
  let maxLon = -180;
  let maxLat = -90;
  for (const pt of ring) {
    if (pt[0] < minLon) minLon = pt[0];
    if (pt[0] > maxLon) maxLon = pt[0];
    if (pt[1] < minLat) minLat = pt[1];
    if (pt[1] > maxLat) maxLat = pt[1];
  }
  return [minLon, minLat, maxLon, maxLat];
}

function computeFeatureBBox(geom: GeoJSON.Polygon | GeoJSON.MultiPolygon): [number, number, number, number] {
  let minLon = 180;
  let minLat = 90;
  let maxLon = -180;
  let maxLat = -90;

  const polygons = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const poly of polygons) {
    if (!poly[0]) continue;
    const [bMinLon, bMinLat, bMaxLon, bMaxLat] = computeRingBBox(poly[0]);
    if (bMaxLon - bMinLon > 180) continue;
    if (bMinLon < minLon) minLon = bMinLon;
    if (bMaxLon > maxLon) maxLon = bMaxLon;
    if (bMinLat < minLat) minLat = bMinLat;
    if (bMaxLat > maxLat) maxLat = bMaxLat;
  }

  if (minLon > maxLon) {
    return [-180, -60, 180, 75];
  }
  return [minLon, minLat, maxLon, maxLat];
}

function computeFeatureVisualCenter(geom: GeoJSON.Polygon | GeoJSON.MultiPolygon): [number, number] {
  const polygons = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  let bestPoly = polygons[0];
  let bestArea = -1;

  for (const poly of polygons) {
    if (!poly[0] || poly[0].length === 0) continue;
    const [minLon, minLat, maxLon, maxLat] = computeRingBBox(poly[0]);
    if (maxLon - minLon > 180) continue;
    const approxArea = (maxLon - minLon) * (maxLat - minLat);
    if (approxArea > bestArea) {
      bestArea = approxArea;
      bestPoly = poly;
    }
  }

  if (!bestPoly || !bestPoly[0] || bestPoly[0].length === 0) return [101.68, 3.14];
  const [minLon, minLat, maxLon, maxLat] = computeRingBBox(bestPoly[0]);
  return [
    Number(((minLon + maxLon) / 2).toFixed(2)),
    Number(((minLat + maxLat) / 2).toFixed(2)),
  ];
}

function inferMacroRegion(lon: number, lat: number, countryName: string): string {
  const name = countryName.toLowerCase();
  if (
    /malaysia|singapore|indonesia|thailand|vietnam|philippines|brunei|myanmar|cambodia|laos|timor/.test(
      name,
    )
  ) {
    return "Southeast Asia";
  }
  if (/japan|china|korea|taiwan|mongolia|hong kong/.test(name)) {
    return "East Asia";
  }
  if (/india|pakistan|bangladesh|sri lanka|nepal|bhutan|maldives/.test(name)) {
    return "South Asia";
  }
  if (/australia|new zealand|fiji|papua/.test(name)) {
    return "Oceania";
  }
  if (/united states|canada|mexico/.test(name)) {
    return "North America";
  }
  if (/brazil|argentina|chile|colombia|peru|venezuela|ecuador/.test(name)) {
    return "South America";
  }
  if (lon >= 92 && lon <= 145 && lat >= -11 && lat <= 25) return "Southeast Asia";
  if (lon >= 95 && lon <= 150 && lat > 20 && lat <= 55) return "East Asia";
  if (lon >= 60 && lon < 95 && lat >= 5 && lat <= 38) return "South Asia";
  if (lon >= 110 && lat < -11) return "Oceania";
  if (lon < -30 && lat >= 12) return "North America";
  if (lon < -30 && lat < 12) return "South America";
  if (lon >= -25 && lon <= 50 && lat >= 35) return "Europe";
  return "Middle East & Africa";
}

export const WORLD_COUNTRIES_GEOJSON: GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  { name: string; macroRegion: string }
> = {
  type: "FeatureCollection",
  features: rawCountries50.features.map((f, idx) => {
    const name = f.properties?.name || `Region ${idx}`;
    const bbox = computeFeatureBBox(f.geometry);
    const centerLon = (bbox[0] + bbox[2]) / 2;
    const centerLat = (bbox[1] + bbox[3]) / 2;
    return {
      ...f,
      id: f.id ?? idx,
      properties: {
        name,
        macroRegion: inferMacroRegion(centerLon, centerLat, name),
      },
    };
  }),
};

export const WORLD_BORDERS_GEOJSON: GeoJSON.Feature<GeoJSON.MultiLineString> = {
  type: "Feature",
  properties: {},
  geometry: topojson.mesh(
    worldTopology50,
    worldTopology50.objects.countries,
    (a, b) => a !== b,
  ),
};

export const WORLD_COUNTRIES_110M_GEOJSON: GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  { name: string }
> = {
  type: "FeatureCollection",
  features: rawCountries110.features
    .filter((f) => (f.properties?.name || "") !== "Antarctica")
    .map((f, idx) => ({
      ...f,
      id: f.id ?? idx,
      properties: {
        name: f.properties?.name || `Region ${idx}`,
      },
    })),
};

export const WORLD_BORDERS_110M_GEOJSON: GeoJSON.Feature<GeoJSON.MultiLineString> = {
  type: "Feature",
  properties: {},
  geometry: topojson.mesh(
    worldTopology110,
    worldTopology110.objects.countries,
    (a, b) => a !== b,
  ),
};

export const COUNTRY_CENTROIDS: RegionCentroid[] = WORLD_COUNTRIES_GEOJSON.features.map((f, idx) => {
  const name = f.properties.name;
  const bbox = computeFeatureBBox(f.geometry);
  const [lon, lat] = computeFeatureVisualCenter(f.geometry);
  const span = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]);
  const zoomHint = span > 40 ? 3.0 : span > 15 ? 4.0 : span > 5 ? 5.0 : 6.0;
  return {
    id: String(f.id ?? idx),
    name,
    lon,
    lat,
    bbox,
    macroRegion: f.properties.macroRegion,
    zoomHint,
  };
});

export const MACRO_REGION_CENTERS: Record<string, { lon: number; lat: number; zoom: number }> = {
  "Southeast Asia": { lon: 108.5, lat: 4.5, zoom: 3.1 },
  "East Asia": { lon: 118.0, lat: 33.5, zoom: 3.0 },
  "South Asia": { lon: 78.9, lat: 21.0, zoom: 3.2 },
  Oceania: { lon: 136.0, lat: -24.0, zoom: 3.0 },
  Europe: { lon: 12.0, lat: 49.5, zoom: 3.2 },
  "North America": { lon: -98.0, lat: 39.0, zoom: 2.8 },
  "South America": { lon: -60.0, lat: -15.0, zoom: 2.9 },
  "Middle East & Africa": { lon: 28.0, lat: 8.0, zoom: 2.8 },
};

// =========================================================================
// 3. State / Province Regions + Admin-1 Visual Boundaries
// =========================================================================

export const STATE_PROVINCES: StateProvinceRegion[] = [
  // Malaysia (all 13 states & 3 federal territories)
  { id: "my_kl", name: "Kuala Lumpur", country: "Malaysia", lon: 101.6869, lat: 3.139, spanDeg: 0.45 },
  { id: "my_selangor", name: "Selangor", country: "Malaysia", lon: 101.5183, lat: 3.0738, spanDeg: 1.0 },
  { id: "my_putrajaya", name: "Putrajaya", country: "Malaysia", lon: 101.6964, lat: 2.9264, spanDeg: 0.35 },
  { id: "my_penang", name: "Penang", country: "Malaysia", lon: 100.3327, lat: 5.4164, spanDeg: 0.55 },
  { id: "my_johor", name: "Johor", country: "Malaysia", lon: 103.7414, lat: 1.4927, spanDeg: 1.3 },
  { id: "my_perak", name: "Perak", country: "Malaysia", lon: 101.0901, lat: 4.5975, spanDeg: 1.2 },
  { id: "my_n9", name: "Negeri Sembilan", country: "Malaysia", lon: 101.9424, lat: 2.7258, spanDeg: 0.8 },
  { id: "my_melaka", name: "Melaka", country: "Malaysia", lon: 102.2501, lat: 2.1896, spanDeg: 0.55 },
  { id: "my_pahang", name: "Pahang", country: "Malaysia", lon: 103.3256, lat: 3.8077, spanDeg: 1.8 },
  { id: "my_kedah", name: "Kedah", country: "Malaysia", lon: 100.3685, lat: 6.1248, spanDeg: 1.0 },
  { id: "my_kelantan", name: "Kelantan", country: "Malaysia", lon: 102.2381, lat: 6.1254, spanDeg: 1.1 },
  { id: "my_terengganu", name: "Terengganu", country: "Malaysia", lon: 103.1324, lat: 5.3117, spanDeg: 1.1 },
  { id: "my_perlis", name: "Perlis", country: "Malaysia", lon: 100.1986, lat: 6.4414, spanDeg: 0.45 },
  { id: "my_sabah", name: "Sabah", country: "Malaysia", lon: 116.0753, lat: 5.9804, spanDeg: 2.4 },
  { id: "my_sarawak", name: "Sarawak", country: "Malaysia", lon: 110.3592, lat: 1.5533, spanDeg: 3.2 },
  { id: "my_labuan", name: "Labuan", country: "Malaysia", lon: 115.2308, lat: 5.2831, spanDeg: 0.4 },

  // Global & Neighboring Regions
  { id: "sg_central", name: "Central Singapore", country: "Singapore", lon: 103.82, lat: 1.35, spanDeg: 0.45 },
  { id: "id_jakarta", name: "Jakarta", country: "Indonesia", lon: 106.85, lat: -6.2, spanDeg: 1.5 },
  { id: "id_bali", name: "Bali", country: "Indonesia", lon: 115.19, lat: -8.41, spanDeg: 1.4 },
  { id: "id_makassar", name: "South Sulawesi", country: "Indonesia", lon: 119.43, lat: -5.14, spanDeg: 2.5 },
  { id: "th_bangkok", name: "Bangkok", country: "Thailand", lon: 100.5, lat: 13.75, spanDeg: 1.6 },
  { id: "th_chiangmai", name: "Chiang Mai", country: "Thailand", lon: 98.98, lat: 18.79, spanDeg: 1.8 },
  { id: "mm_yangon", name: "Yangon", country: "Myanmar", lon: 96.17, lat: 16.84, spanDeg: 1.8 },
  { id: "ph_manila", name: "Metro Manila", country: "Philippines", lon: 120.98, lat: 14.6, spanDeg: 1.8 },
  { id: "vn_hcmc", name: "Ho Chi Minh Region", country: "Vietnam", lon: 106.66, lat: 10.82, spanDeg: 1.8 },
  { id: "cn_guangdong", name: "Guangdong", country: "China", lon: 113.26, lat: 23.13, spanDeg: 3.0 },
  { id: "cn_hunan", name: "Central China", country: "China", lon: 111.0, lat: 29.5, spanDeg: 4.5 },
  { id: "cn_beijing", name: "Beijing", country: "China", lon: 116.4, lat: 39.9, spanDeg: 2.5 },
  { id: "cn_shanghai", name: "Shanghai", country: "China", lon: 121.47, lat: 31.23, spanDeg: 2.2 },
  { id: "tw_taipei", name: "Northern Taiwan", country: "Taiwan", lon: 121.56, lat: 25.03, spanDeg: 1.4 },
  { id: "jp_kanto", name: "Tokyo · Kanto", country: "Japan", lon: 139.69, lat: 35.68, spanDeg: 2.2 },
  { id: "jp_kansai", name: "Osaka · Kansai", country: "Japan", lon: 135.5, lat: 34.69, spanDeg: 1.8 },
  { id: "kr_seoul", name: "Seoul Capital", country: "South Korea", lon: 126.98, lat: 37.56, spanDeg: 1.6 },
  { id: "in_maharashtra", name: "Maharashtra", country: "India", lon: 72.88, lat: 19.08, spanDeg: 3.5 },
  { id: "in_karnataka", name: "Karnataka", country: "India", lon: 76.9, lat: 13.5, spanDeg: 3.2 },
  { id: "au_nsw", name: "New South Wales", country: "Australia", lon: 151.21, lat: -33.87, spanDeg: 4.0 },
  { id: "au_vic", name: "Victoria", country: "Australia", lon: 144.96, lat: -37.81, spanDeg: 3.0 },
  { id: "au_wa", name: "Western Australia", country: "Australia", lon: 116.0, lat: -31.95, spanDeg: 5.5 },
  { id: "gb_london", name: "Greater London", country: "United Kingdom", lon: -0.12, lat: 51.5, spanDeg: 1.8 },
  { id: "fr_idf", name: "Île-de-France", country: "France", lon: 2.35, lat: 48.85, spanDeg: 2.0 },
  { id: "de_berlin", name: "Berlin", country: "Germany", lon: 13.4, lat: 52.52, spanDeg: 2.0 },
  { id: "us_ca", name: "California", country: "United States of America", lon: -122.42, lat: 37.77, spanDeg: 4.5 },
  { id: "us_ny", name: "New York", country: "United States of America", lon: -74.01, lat: 40.71, spanDeg: 3.0 },
  { id: "ca_on", name: "Ontario", country: "Canada", lon: -79.38, lat: 43.65, spanDeg: 3.5 },
  { id: "br_sp", name: "São Paulo", country: "Brazil", lon: -46.63, lat: -23.55, spanDeg: 3.5 },
];

export const STATE_BOUNDARIES_GEOJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { name: "Perak / Selangor" }, geometry: { type: "LineString", coordinates: [[100.8, 3.7], [101.7, 3.85]] } },
    { type: "Feature", properties: { name: "Selangor / N9" }, geometry: { type: "LineString", coordinates: [[101.4, 2.75], [102.05, 2.95]] } },
    { type: "Feature", properties: { name: "Pahang / Terengganu" }, geometry: { type: "LineString", coordinates: [[102.0, 4.4], [103.4, 4.15]] } },
    { type: "Feature", properties: { name: "Johor / Pahang" }, geometry: { type: "LineString", coordinates: [[102.5, 2.7], [103.75, 2.65]] } },
    { type: "Feature", properties: { name: "Kedah / Perak" }, geometry: { type: "LineString", coordinates: [[100.35, 5.1], [101.35, 5.7]] } },
    { type: "Feature", properties: { name: "Kelantan / Pahang" }, geometry: { type: "LineString", coordinates: [[101.35, 4.7], [102.7, 4.65]] } },
    { type: "Feature", properties: { name: "Sabah / Sarawak" }, geometry: { type: "LineString", coordinates: [[115.2, 4.95], [116.2, 4.1]] } },
    { type: "Feature", properties: { name: "US West / Mountain" }, geometry: { type: "LineString", coordinates: [[-114.6, 32.7], [-114.6, 49.0]] } },
    { type: "Feature", properties: { name: "US Central / East" }, geometry: { type: "LineString", coordinates: [[-87.5, 30.2], [-84.5, 46.5]] } },
    { type: "Feature", properties: { name: "AU WA / Central" }, geometry: { type: "LineString", coordinates: [[129.0, -31.7], [129.0, -14.8]] } },
    { type: "Feature", properties: { name: "AU NSW / VIC" }, geometry: { type: "LineString", coordinates: [[141.0, -34.0], [149.9, -37.5]] } },
    { type: "Feature", properties: { name: "CN North / South" }, geometry: { type: "LineString", coordinates: [[102.0, 32.2], [120.5, 32.2]] } },
    { type: "Feature", properties: { name: "IN North / South" }, geometry: { type: "LineString", coordinates: [[72.5, 20.5], [85.0, 20.5]] } },
  ],
};

// =========================================================================
// 4. Point-in-Polygon & Regional Lookup + Privacy Coarsening
// =========================================================================

function pointInRing(lon: number, lat: number, ring: GeoJSON.Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInCountry(lon: number, lat: number, geom: GeoJSON.Polygon | GeoJSON.MultiPolygon): boolean {
  const polygons = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const poly of polygons) {
    if (poly[0] && pointInRing(lon, lat, poly[0])) {
      let inHole = false;
      for (let h = 1; h < poly.length; h++) {
        if (pointInRing(lon, lat, poly[h])) {
          inHole = true;
          break;
        }
      }
      if (!inHole) return true;
    }
  }
  return false;
}

function distSq(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const dLon = lon1 - lon2;
  const dLat = lat1 - lat2;
  return dLon * dLon + dLat * dLat;
}

function deterministicHash(seed: number | string): number {
  const s = String(seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function normalizeCountryDisplayName(rawName: string): string {
  if (rawName === "United States of America") return "United States";
  return rawName;
}

const COUNTRY_BY_RAW_NAME = new Map<string, RegionCentroid>(
  COUNTRY_CENTROIDS.map((c) => [c.name, c]),
);

const POPULATED_COUNTRY_CENTROIDS = COUNTRY_CENTROIDS.filter(
  (c) => !EXCLUDED_TERRITORY_NAMES.has(c.name),
);

/**
 * Resolves any (lat, lon) into a populated Country + State/Region and snaps
 * coordinates to a coarse regional centroid + deterministic ~25km privacy
 * offset so exact GPS locations or uninhabited ocean territories never show up.
 */
export function resolveAndCoarsenLocation(
  lat: number,
  lon: number,
  seedId: number | string = 0,
): ResolvedRegion {
  // 1. Check exact polygon match against populated countries first
  let matchedCountry: RegionCentroid | null = null;
  for (let i = 0; i < WORLD_COUNTRIES_GEOJSON.features.length; i++) {
    const c = COUNTRY_CENTROIDS[i];
    if (EXCLUDED_TERRITORY_NAMES.has(c.name)) continue;
    const feat = WORLD_COUNTRIES_GEOJSON.features[i];
    if (lon >= c.bbox[0] - 0.35 && lon <= c.bbox[2] + 0.35 && lat >= c.bbox[1] - 0.35 && lat <= c.bbox[3] + 0.35) {
      if (pointInCountry(lon, lat, feat.geometry)) {
        matchedCountry = c;
        break;
      }
    }
  }

  // 2. If coastal/offshore or near a known state/hub, check STATE_PROVINCES proximity
  let nearestStateAny: StateProvinceRegion | null = null;
  let nearestStateAnyDist = Infinity;
  for (const st of STATE_PROVINCES) {
    const d = distSq(lon, lat, st.lon, st.lat);
    if (d < nearestStateAnyDist) {
      nearestStateAnyDist = d;
      nearestStateAny = st;
    }
  }

  // Coastal tolerance: if point wasn't strictly inside a polygon (e.g. Strait of Malacca (3, 101))
  // or lies inside a state's span, adopt that state's country consistently.
  if (!matchedCountry && nearestStateAny && nearestStateAnyDist <= Math.pow(nearestStateAny.spanDeg + 0.85, 2)) {
    matchedCountry = COUNTRY_BY_RAW_NAME.get(nearestStateAny.country) || null;
  }

  // 3. Fallback for legacy open-ocean coordinates: snap to nearest populated regional hub
  // (never to uninhabited territories like British Indian Ocean Territory or Antarctica).
  if (!matchedCountry) {
    if (nearestStateAny) {
      matchedCountry = COUNTRY_BY_RAW_NAME.get(nearestStateAny.country) || null;
    }
    if (!matchedCountry) {
      let bestC = POPULATED_COUNTRY_CENTROIDS[0] || COUNTRY_CENTROIDS[0];
      let bestCDist = Infinity;
      for (const c of POPULATED_COUNTRY_CENTROIDS) {
        const d = distSq(lon, lat, c.lon, c.lat);
        if (d < bestCDist) {
          bestCDist = d;
          bestC = c;
        }
      }
      matchedCountry = bestC;
    }
  }

  // Ensure chosen state STRICTLY belongs to matchedCountry (never mix e.g. Indonesia + Selangor)
  let matchedState: StateProvinceRegion | null = null;
  let matchedStateDist = Infinity;
  for (const st of STATE_PROVINCES) {
    if (st.country !== matchedCountry.name) continue;
    const d = distSq(lon, lat, st.lon, st.lat);
    if (d < matchedStateDist) {
      matchedStateDist = d;
      matchedState = st;
    }
  }

  const countryDisplay = normalizeCountryDisplayName(matchedCountry.name);
  const stateDisplay = matchedState ? matchedState.name : `${countryDisplay} Region`;
  const anchorLon = matchedState ? matchedState.lon : matchedCountry.lon;
  const anchorLat = matchedState ? matchedState.lat : matchedCountry.lat;

  // Coarsen to ~0.22 deg regional grid + gentle deterministic privacy offset
  const angle = deterministicHash(`${seedId}_a`) * Math.PI * 2;
  const radius = 0.12 + deterministicHash(`${seedId}_r`) * 0.18;
  const coarseLon = Number((anchorLon + Math.cos(angle) * radius).toFixed(2));
  const coarseLat = Number(Math.max(-80, Math.min(80, anchorLat + Math.sin(angle) * radius)).toFixed(2));

  return {
    country: countryDisplay,
    state: stateDisplay,
    macroRegion: matchedCountry.macroRegion,
    coarseLat,
    coarseLon,
    countryLat: matchedCountry.lat,
    countryLon: matchedCountry.lon,
    stateLat: anchorLat,
    stateLon: anchorLon,
  };
}

/**
 * Produces strictly coarsened lat/lng for storing in Firestore `globeUsers`
 * from raw browser geolocation or manual area pickers (~0.2 deg / ~25km fuzz).
 */
export function coarsenCoordinates(
  rawLat: number,
  rawLon: number,
  seedId: number | string = 0,
): { lat: number; lon: number; country: string; state: string } {
  const resolved = resolveAndCoarsenLocation(rawLat, rawLon, seedId);
  return {
    lat: resolved.coarseLat,
    lon: resolved.coarseLon,
    country: resolved.country,
    state: resolved.state,
  };
}

// =========================================================================
// 5. Supercluster + 3-Level Privacy Hierarchy (< 5 small-region merge)
// =========================================================================

const SMALL_REGION_MIN_NODES = 5;

export function getHierarchyLevelForZoom(zoom: number): GlobeHierarchyLevel {
  if (zoom < 2.5) return "world";
  if (zoom < 4.8) return "country";
  return "state";
}

interface EnrichedNode {
  user: GlobeUser;
  resolved: ResolvedRegion;
  isMe: boolean;
  isHiddenSelf: boolean;
}

export function enrichGlobeNodes(
  users: GlobeUser[],
  blockedNodeIds: ReadonlySet<number> = new Set(),
): {
  publicNodes: EnrichedNode[];
  hiddenSelfNode: EnrichedNode | null;
} {
  const publicNodes: EnrichedNode[] = [];
  let hiddenSelfNode: EnrichedNode | null = null;

  for (const user of users) {
    if (blockedNodeIds.has(user.id)) continue;
    const isMe = Boolean(user.isMe || user.id === 0);
    const resolved = resolveAndCoarsenLocation(user.lat, user.lon, user.id);

    if (!user.discoverable) {
      if (isMe) {
        hiddenSelfNode = { user, resolved, isMe: true, isHiddenSelf: true };
      }
      continue;
    }

    publicNodes.push({ user, resolved, isMe, isHiddenSelf: false });
  }

  return { publicNodes, hiddenSelfNode };
}

function computeSpreadPosition(
  nodesInGroup: EnrichedNode[],
  index: number,
  centerLon: number,
  centerLat: number,
): { lon: number; lat: number } {
  if (nodesInGroup.length === 1) {
    return {
      lon: nodesInGroup[0].resolved.coarseLon,
      lat: nodesInGroup[0].resolved.coarseLat,
    };
  }
  const goldenAngle = 2.399963229728653;
  const r = 0.22 + Math.sqrt(index + 1) * 0.22;
  const theta = index * goldenAngle;
  return {
    lon: Number((centerLon + Math.cos(theta) * r).toFixed(3)),
    lat: Number(Math.max(-80, Math.min(80, centerLat + Math.sin(theta) * r)).toFixed(3)),
  };
}

export function buildGlobeDisplayItems(
  users: GlobeUser[],
  zoom: number,
  blockedNodeIds: ReadonlySet<number> = new Set(),
  focusedCountry: string | null = null,
): {
  level: GlobeHierarchyLevel;
  items: GlobeDisplayItem[];
  visibleCount: number;
  hiddenSelf: GlobeNodeDisplayItem | null;
} {
  const level = getHierarchyLevelForZoom(zoom);
  const { publicNodes, hiddenSelfNode } = enrichGlobeNodes(users, blockedNodeIds);

  const hiddenSelf: GlobeNodeDisplayItem | null = hiddenSelfNode
    ? {
        kind: "node",
        key: `node_self_hidden_${hiddenSelfNode.user.id}`,
        user: hiddenSelfNode.user,
        lon: hiddenSelfNode.resolved.coarseLon,
        lat: hiddenSelfNode.resolved.coarseLat,
        countryName: hiddenSelfNode.resolved.country,
        stateName: hiddenSelfNode.resolved.state,
        isMe: true,
        isHiddenSelf: true,
      }
    : null;

  if (publicNodes.length === 0) {
    return { level, items: [], visibleCount: 0, hiddenSelf };
  }

  // LEVEL 0 — WORLD: Country clusters, merging < 5-node countries into parent Macro-Region
  if (level === "world") {
    const byCountry = new Map<string, EnrichedNode[]>();
    for (const item of publicNodes) {
      const list = byCountry.get(item.resolved.country) || [];
      list.push(item);
      byCountry.set(item.resolved.country, list);
    }

    const byMacroOverflow = new Map<string, EnrichedNode[]>();
    const countrySeedPoints: GeoJSON.Feature<
      GeoJSON.Point,
      {
        label: string;
        subLabel?: string;
        count: number;
        countryName?: string;
        hasMe: boolean;
        mergedSmallRegion: boolean;
        targetZoom: number;
      }
    >[] = [];

    for (const [country, group] of byCountry.entries()) {
      if (group.length >= SMALL_REGION_MIN_NODES) {
        countrySeedPoints.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [group[0].resolved.countryLon, group[0].resolved.countryLat],
          },
          properties: {
            label: country,
            count: group.length,
            countryName: country,
            hasMe: group.some((g) => g.isMe),
            mergedSmallRegion: false,
            targetZoom: 3.4,
          },
        });
      } else {
        const macro = group[0].resolved.macroRegion;
        const mList = byMacroOverflow.get(macro) || [];
        mList.push(...group);
        byMacroOverflow.set(macro, mList);
      }
    }

    for (const [macro, group] of byMacroOverflow.entries()) {
      const center = MACRO_REGION_CENTERS[macro] || {
        lon: group[0].resolved.countryLon,
        lat: group[0].resolved.countryLat,
        zoom: 3.1,
      };
      const avgLon = group.reduce((s, g) => s + g.resolved.countryLon, 0) / group.length || center.lon;
      const avgLat = group.reduce((s, g) => s + g.resolved.countryLat, 0) / group.length || center.lat;
      countrySeedPoints.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [avgLon, avgLat] },
        properties: {
          label: macro,
          subLabel: "Regional cluster",
          count: group.length,
          hasMe: group.some((g) => g.isMe),
          mergedSmallRegion: group.length < SMALL_REGION_MIN_NODES,
          targetZoom: 3.2,
        },
      });
    }

    type SeedProps = (typeof countrySeedPoints)[number]["properties"];
    interface ClusterAcc {
      count: number;
      hasMe: boolean;
      labels: string[];
      countryName?: string;
      mergedSmallRegion: boolean;
      targetZoom: number;
    }

    const index = new Supercluster<SeedProps, ClusterAcc>({
      radius: 46,
      maxZoom: 3,
      minPoints: 2,
      map: (p) => ({
        count: p.count,
        hasMe: p.hasMe,
        labels: [p.label],
        countryName: p.countryName,
        mergedSmallRegion: p.mergedSmallRegion,
        targetZoom: p.targetZoom,
      }),
      reduce: (acc, props) => {
        acc.count += props.count;
        acc.hasMe = acc.hasMe || props.hasMe;
        if (!acc.labels.includes(props.labels[0])) acc.labels.push(props.labels[0]);
        acc.countryName = undefined;
        acc.mergedSmallRegion = true;
        acc.targetZoom = 3.0;
      },
    });
    index.load(countrySeedPoints);

    type ClusterMetaFields = {
      cluster?: boolean;
      cluster_id?: number;
      point_count?: number;
    };
    const clusters = index.getClusters([-180, -85, 180, 85], Math.max(0, Math.floor(zoom)));
    const items: GlobeClusterDisplayItem[] = clusters.map((feat, idx) => {
      const [lon, lat] = feat.geometry.coordinates;
      const props = feat.properties as SeedProps & Partial<ClusterMetaFields & ClusterAcc>;
      const isSuperCluster = Boolean(props.cluster);
      const count = props.count ?? 1;
      const label = isSuperCluster
        ? props.labels && props.labels.length > 0
          ? props.labels[0]
          : "Global Region"
        : props.label;
      return {
        kind: "cluster",
        key: `world_${idx}_${label}`,
        label,
        subLabel: isSuperCluster ? "Combined region" : props.subLabel,
        level: "world",
        count,
        lon,
        lat,
        targetZoom: props.targetZoom || 3.2,
        countryName: isSuperCluster ? undefined : props.countryName,
        hasMe: Boolean(props.hasMe),
        mergedSmallRegion: Boolean(props.mergedSmallRegion),
      };
    });

    return { level, items, visibleCount: publicNodes.length, hiddenSelf };
  }

  // LEVEL 1 — COUNTRY: State/province clusters; states with < 5 visible nodes merge into Country parent cluster
  if (level === "country") {
    const byCountry = new Map<string, EnrichedNode[]>();
    for (const item of publicNodes) {
      const list = byCountry.get(item.resolved.country) || [];
      list.push(item);
      byCountry.set(item.resolved.country, list);
    }

    const items: GlobeClusterDisplayItem[] = [];

    for (const [country, cNodes] of byCountry.entries()) {
      const byState = new Map<string, EnrichedNode[]>();
      for (const n of cNodes) {
        const list = byState.get(n.resolved.state) || [];
        list.push(n);
        byState.set(n.resolved.state, list);
      }

      const mergedCountryOverflow: EnrichedNode[] = [];
      for (const [state, sNodes] of byState.entries()) {
        if (sNodes.length >= SMALL_REGION_MIN_NODES) {
          items.push({
            kind: "cluster",
            key: `state_cluster_${country}_${state}`,
            label: state,
            subLabel: country,
            level: "country",
            count: sNodes.length,
            lon: sNodes[0].resolved.stateLon,
            lat: sNodes[0].resolved.stateLat,
            targetZoom: 5.5,
            countryName: country,
            stateName: state,
            hasMe: sNodes.some((n) => n.isMe),
            mergedSmallRegion: false,
          });
        } else {
          mergedCountryOverflow.push(...sNodes);
        }
      }

      if (mergedCountryOverflow.length > 0) {
        const avgLon =
          mergedCountryOverflow.reduce((s, n) => s + n.resolved.stateLon, 0) /
          mergedCountryOverflow.length;
        const avgLat =
          mergedCountryOverflow.reduce((s, n) => s + n.resolved.stateLat, 0) /
          mergedCountryOverflow.length;
        items.push({
          kind: "cluster",
          key: `country_parent_${country}`,
          label: country,
          subLabel:
            mergedCountryOverflow.length < SMALL_REGION_MIN_NODES
              ? "Merged region (privacy)"
              : "Regional states",
          level: "country",
          count: mergedCountryOverflow.length,
          lon: Number(avgLon.toFixed(2)),
          lat: Number(avgLat.toFixed(2)),
          targetZoom: 5.4,
          countryName: country,
          hasMe: mergedCountryOverflow.some((n) => n.isMe),
          mergedSmallRegion: mergedCountryOverflow.length < SMALL_REGION_MIN_NODES,
        });
      }
    }

    const visibleCount = focusedCountry
      ? (byCountry.get(focusedCountry)?.length ?? publicNodes.length)
      : publicNodes.length;

    return { level, items, visibleCount, hiddenSelf };
  }

  // LEVEL 2 — STATE / ZOOMED IN: Spread individual anonymous nodes inside coarse region
  const byStateGroup = new Map<string, EnrichedNode[]>();
  for (const n of publicNodes) {
    const key = `${n.resolved.country}::${n.resolved.state}`;
    const list = byStateGroup.get(key) || [];
    list.push(n);
    byStateGroup.set(key, list);
  }

  const pointFeatures: GeoJSON.Feature<
    GeoJSON.Point,
    {
      node: EnrichedNode;
      spreadLon: number;
      spreadLat: number;
    }
  >[] = [];

  for (const group of byStateGroup.values()) {
    const centerLon = group[0].resolved.stateLon;
    const centerLat = group[0].resolved.stateLat;
    group.forEach((node, idx) => {
      const pos = computeSpreadPosition(group, idx, centerLon, centerLat);
      pointFeatures.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [pos.lon, pos.lat] },
        properties: { node, spreadLon: pos.lon, spreadLat: pos.lat },
      });
    });
  }

  type PointProps = (typeof pointFeatures)[number]["properties"];
  interface PointClusterAcc {
    hasMe: boolean;
    countryName: string;
    stateName: string;
  }

  const nodeSupercluster = new Supercluster<PointProps, PointClusterAcc>({
    radius: 34,
    maxZoom: 8,
    minPoints: 2,
    map: (p) => ({
      hasMe: p.node.isMe,
      countryName: p.node.resolved.country,
      stateName: p.node.resolved.state,
    }),
    reduce: (acc, p) => {
      acc.hasMe = acc.hasMe || p.hasMe;
    },
  });
  nodeSupercluster.load(pointFeatures);

  const zInt = Math.max(5, Math.min(12, Math.floor(zoom)));
  const out = nodeSupercluster.getClusters([-180, -85, 180, 85], zInt);

  type LeafClusterMeta = {
    cluster?: boolean;
    cluster_id?: number;
    point_count?: number;
  };
  const items: GlobeDisplayItem[] = out.map((feat, idx) => {
    const [lon, lat] = feat.geometry.coordinates;
    const props = feat.properties as PointProps & Partial<LeafClusterMeta & PointClusterAcc>;
    if (props.cluster) {
      return {
        kind: "cluster",
        key: `leaf_cluster_${props.cluster_id ?? idx}`,
        label: props.stateName || props.countryName || "Nearby",
        subLabel: props.countryName,
        level: "state",
        count: props.point_count || 2,
        lon,
        lat,
        targetZoom: Math.min(10, zoom + 1.8),
        countryName: props.countryName,
        stateName: props.stateName,
        hasMe: Boolean(props.hasMe),
        mergedSmallRegion: false,
      };
    }

    const n = props.node;
    return {
      kind: "node",
      key: `node_${n.user.id}`,
      user: n.user,
      lon,
      lat,
      countryName: n.resolved.country,
      stateName: n.resolved.state,
      isMe: n.isMe,
      isHiddenSelf: false,
    };
  });

  return { level, items, visibleCount: publicNodes.length, hiddenSelf };
}

/**
 * Builds a drill-down Countries > States > Nodes hierarchy sorted with the
 * user's own region first, then by count descending.
 */
export function buildHierarchicalList(
  users: GlobeUser[],
  blockedNodeIds: ReadonlySet<number> = new Set(),
  myCountry?: string | null,
  myState?: string | null,
): ListCountryGroup[] {
  const { publicNodes } = enrichGlobeNodes(users, blockedNodeIds);
  const byCountry = new Map<string, EnrichedNode[]>();

  for (const n of publicNodes) {
    const list = byCountry.get(n.resolved.country) || [];
    list.push(n);
    byCountry.set(n.resolved.country, list);
  }

  const result: ListCountryGroup[] = [];
  for (const [country, nodes] of byCountry.entries()) {
    const byState = new Map<string, EnrichedNode[]>();
    for (const n of nodes) {
      const list = byState.get(n.resolved.state) || [];
      list.push(n);
      byState.set(n.resolved.state, list);
    }

    const states: ListCountryGroup["states"] = [];
    for (const [state, sNodes] of byState.entries()) {
      const sortedNodes = sNodes
        .slice()
        .sort((a, b) => Number(b.isMe) - Number(a.isMe) || a.user.id - b.user.id)
        .map((item) => ({ ...item.user, resolved: item.resolved }));

      states.push({
        state,
        count: sNodes.length,
        lon: sNodes[0].resolved.stateLon,
        lat: sNodes[0].resolved.stateLat,
        hasMe: sNodes.some((item) => item.isMe) || Boolean(myState && state === myState && country === myCountry),
        isMergedSmallRegion: sNodes.length < SMALL_REGION_MIN_NODES,
        nodes: sortedNodes,
      });
    }

    states.sort(
      (a, b) =>
        Number(b.hasMe) - Number(a.hasMe) ||
        b.count - a.count ||
        a.state.localeCompare(b.state),
    );

    const hasMe =
      nodes.some((n) => n.isMe) || Boolean(myCountry && country === myCountry);

    result.push({
      country,
      macroRegion: nodes[0].resolved.macroRegion,
      count: nodes.length,
      lon: nodes[0].resolved.countryLon,
      lat: nodes[0].resolved.countryLat,
      hasMe,
      states,
    });
  }

  return result.sort(
    (a, b) =>
      Number(b.hasMe) - Number(a.hasMe) ||
      b.count - a.count ||
      a.country.localeCompare(b.country),
  );
}
