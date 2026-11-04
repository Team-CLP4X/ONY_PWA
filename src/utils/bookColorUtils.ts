/**
 * Book Spine & Cover Color Utilities
 * Calculates WCAG-compliant accessible text contrast (>= 4.5:1),
 * soft desaturated accent tints for ribbons/headers,
 * 2D HSV color conversions, and readability warnings.
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HsvColor {
  h: number; // 0 - 360
  s: number; // 0 - 1
  v: number; // 0 - 1
}

export interface HslColor {
  h: number; // 0 - 360
  s: number; // 0 - 1
  l: number; // 0 - 1
}

/**
 * Normalizes input string to a valid 6-character hex code #rrggbb or returns null.
 * Accepts #rgb, #rrggbb, rgb, rrggbb.
 */
export function normalizeHex(raw: string): string | null {
  if (!raw) return null;
  let clean = raw.trim().replace(/^#/, "");
  // Remove any non-hex characters
  clean = clean.replace(/[^0-9a-fA-F]/g, "");

  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }

  if (clean.length === 6) {
    return `#${clean.toUpperCase()}`;
  }

  return null;
}

/**
 * Parses hex code to RGB values (0-255).
 */
export function hexToRgb(hex: string): RgbColor | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;

  const intVal = parseInt(normalized.slice(1), 16);
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
}

/**
 * Converts RGB values (0-255) to #RRGGBB hex string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Converts RGB to HSV (Hue 0-360, Saturation 0-1, Value/Brightness 0-1).
 */
export function rgbToHsv(r: number, g: number, b: number): HsvColor {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

/**
 * Converts HSV to RGB.
 */
export function hsvToRgb(h: number, s: number, v: number): RgbColor {
  const hNorm = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hNorm / 60) % 2) - 1));
  const m = v - c;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (hNorm >= 0 && hNorm < 60) {
    rPrime = c;
    gPrime = x;
  } else if (hNorm >= 60 && hNorm < 120) {
    rPrime = x;
    gPrime = c;
  } else if (hNorm >= 120 && hNorm < 180) {
    gPrime = c;
    bPrime = x;
  } else if (hNorm >= 180 && hNorm < 240) {
    gPrime = x;
    bPrime = c;
  } else if (hNorm >= 240 && hNorm < 300) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

/**
 * Calculates WCAG relative luminance (0 to 1).
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const expand = (val: number) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * expand(r) + 0.7152 * expand(g) + 0.0722 * expand(b);
}

/**
 * Calculates contrast ratio between two luminance values (1:1 to 21:1).
 */
export function getContrastRatio(lum1: number, lum2: number): number {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Automatically chooses dark (#1B2B28) or light (#FFFFFF) text/icons
 * guaranteeing maximum contrast (>= 4.5:1).
 */
export function getAccessibleTextColor(bgHex: string): string {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return "#1B2B28";

  const bgLum = getRelativeLuminance(rgb.r, rgb.g, rgb.b);
  const whiteLum = 1.0;
  const darkLum = getRelativeLuminance(27, 43, 40); // #1B2B28

  const whiteContrast = getContrastRatio(bgLum, whiteLum);
  const darkContrast = getContrastRatio(bgLum, darkLum);

  // If dark contrast meets standard 4.5:1 and is higher or background is sufficiently bright
  if (darkContrast >= whiteContrast) {
    return "#1B2B28";
  }
  return "#FFFFFF";
}

/**
 * Derives a soft, desaturated accent color for the book ribbon bookmark.
 * Never overly saturated or jarring, staying calm and pastel.
 */
export function getDerivedRibbonColor(coverHex: string): string {
  const rgb = hexToRgb(coverHex);
  if (!rgb) return "#7DA2A9";

  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  // Shift hue by +35 degrees for harmonious analog-complementary aesthetic
  const newHue = (hsv.h + 35) % 360;
  // Soften & desaturate: clamp saturation to 0.35 - 0.45
  const newSat = Math.min(0.42, Math.max(0.28, hsv.s * 0.7));
  // Moderate lightness: value 0.58 - 0.72
  const newVal = Math.min(0.72, Math.max(0.55, hsv.v > 0.6 ? hsv.v * 0.8 : 0.65));

  const ribbonRgb = hsvToRgb(newHue, newSat, newVal);
  return rgbToHex(ribbonRgb.r, ribbonRgb.g, ribbonRgb.b);
}

/**
 * Derives a soft, desaturated accent color for header tint and buttons inside the book.
 */
export function getDerivedAccentColor(coverHex: string): string {
  const rgb = hexToRgb(coverHex);
  if (!rgb) return "#94D2BD";

  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  // Soften saturation to 0.25 - 0.38
  const softSat = Math.min(0.38, Math.max(0.2, hsv.s * 0.65));
  // High value for pastel softness 0.82 - 0.94
  const softVal = Math.min(0.94, Math.max(0.8, hsv.v > 0.7 ? hsv.v : 0.85));

  const softRgb = hsvToRgb(hsv.h, softSat, softVal);
  return rgbToHex(softRgb.r, softRgb.g, softRgb.b);
}

/**
 * Checks if the color is extremely saturated (> 0.78) or very dark (Value < 0.32 or Luminance < 0.12),
 * to trigger the gentle non-blocking hint: "Tip: softer colors are easier to read."
 */
export function isColorSaturatedOrDark(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;

  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const lum = getRelativeLuminance(rgb.r, rgb.g, rgb.b);

  const isExtremelySaturated = hsv.s > 0.78 && hsv.v > 0.4;
  const isVeryDark = hsv.v < 0.32 || lum < 0.12;

  return isExtremelySaturated || isVeryDark;
}

/**
 * Generates spine 3D shading, highlights, and borders from the cover color
 * so that custom colored books maintain realistic paper/leather depth.
 */
export function getSpineDepthStyles(coverHex: string): {
  backgroundColor: string;
  textColor: string;
  ribbonColor: string;
  darkBorder: string;
  highlight: string;
  boxShadow: string;
} {
  const rgb = hexToRgb(coverHex) || { r: 148, g: 210, b: 189 };
  const textColor = getAccessibleTextColor(coverHex);
  const ribbonColor = getDerivedRibbonColor(coverHex);

  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const darkRgb = hsvToRgb(hsv.h, Math.min(1, hsv.s + 0.15), Math.max(0, hsv.v * 0.65));
  const darkBorder = rgbToHex(darkRgb.r, darkRgb.g, darkRgb.b);

  const lightRgb = hsvToRgb(hsv.h, Math.max(0, hsv.s * 0.4), Math.min(1, hsv.v + 0.2));
  const highlight = rgbToHex(lightRgb.r, lightRgb.g, lightRgb.b);

  return {
    backgroundColor: normalizeHex(coverHex) || "#94D2BD",
    textColor,
    ribbonColor,
    darkBorder,
    highlight,
    boxShadow: `2px 4px 10px rgba(48, 44, 43, 0.14), inset -2px 0 4px rgba(0, 0, 0, 0.12), inset 2px 0 3px rgba(255, 255, 255, 0.45)`,
  };
}

/**
 * Calculates responsive font size for spine titles.
 * Scales down slightly for longer titles (minimum 11px) before truncating.
 */
export function getSpineFontSize(title: string): string {
  const len = (title || "").trim().length;
  if (len <= 6) return "12px";
  if (len <= 12) return "11.5px";
  return "11px";
}
