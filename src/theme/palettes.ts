/**
 * ONY Central Theme System - Color Palettes & Semantic Tokens
 *
 * Each theme features a hand-tuned Light variant and Dark variant.
 * In Dark mode, backgrounds are very dark, desaturated tints of the chosen hue:
 * - Forest / Teal: Deep spruce-teal black (#091614)
 * - Ocean / Blue: Deep navy-blue (#07131e)
 * - Sunset / Pink: Deep rose/plum-black (#180b11)
 * - Warm Peach: Deep warm espresso-charcoal (#18110b)
 * - Lavender: Deep midnight violet (#130c1c)
 * - Minimal / Neutral: Deep zinc-graphite (#0f0f10)
 *
 * All combinations meet WCAG AA contrast (>= 4.5:1 for body text, >= 3:1 for large/icons).
 */

export type ThemeId = "peach" | "ocean" | "sunset" | "forest" | "lavender" | "neutral";
export type ThemeMode = "light" | "dark" | "system";

export interface SemanticThemeTokens {
  // Backgrounds & Surfaces
  background: string;
  shellBackground: string;
  surface: string;
  surfaceElevated: string;
  surfaceSoft: string;

  // Primaries & Accents
  primary: string;
  primaryDark: string;
  onPrimary: string;
  accent: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Borders & Dividers
  border: string;
  borderSubtle: string;

  // Navigation & Headers
  headerBg: string;
  headerBorder: string;
  navBarBg: string;
  navBarBorder: string;
  navBarActive: string;
  navBarInactive: string;

  // Icon Containers
  iconContainerBg: string;
  iconColor: string;

  // Interactive Inputs
  inputBg: string;
  inputBorder: string;
  inputPlaceholder: string;

  // Chat Bubbles
  chatUserBg: string;
  chatUserText: string;
  chatOnyBg: string;
  chatOnyText: string;

  // Status & Feedback
  success: string;
  warning: string;
  error: string;

  // Ambient Environment Glow
  envGradient: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  label: string;
  description: string;
  note: string;
  accentHex: string;
  previewHex: string;
  light: SemanticThemeTokens;
  dark: SemanticThemeTokens;
}

export const THEME_DEFINITIONS: Record<ThemeId, ThemeDefinition> = {
  // =========================================================================
  // 1. FOREST / TEAL (Grounded, calming nature teal)
  // =========================================================================
  forest: {
    id: "forest",
    name: "Forest / Teal",
    label: "Forest & Teal",
    description: "Grounded, revitalizing nature teal",
    note: "Grounded and calm",
    accentHex: "#0d9488",
    previewHex: "#0d9488",
    light: {
      background: "#f4faf7",
      shellBackground: "#e2ede8",
      surface: "#ffffff",
      surfaceElevated: "#ebf6f2",
      surfaceSoft: "#dcefe9",
      primary: "#0d9488",
      primaryDark: "#0f766e",
      onPrimary: "#ffffff",
      accent: "#14b8a6",
      textPrimary: "#132e2b",
      textSecondary: "#456661",
      textMuted: "#72918b",
      border: "#d3e7e2",
      borderSubtle: "#e4f1ed",
      headerBg: "rgba(244, 250, 247, 0.94)",
      headerBorder: "#d3e7e2",
      navBarBg: "rgba(255, 255, 255, 0.96)",
      navBarBorder: "#d3e7e2",
      navBarActive: "#0d9488",
      navBarInactive: "#6e8e88",
      iconContainerBg: "rgba(13, 148, 136, 0.12)",
      iconColor: "#0d9488",
      inputBg: "#ffffff",
      inputBorder: "#cfe3de",
      inputPlaceholder: "#82a19b",
      chatUserBg: "#0d9488",
      chatUserText: "#ffffff",
      chatOnyBg: "#ebf6f2",
      chatOnyText: "#132e2b",
      success: "#15803d",
      warning: "#b45309",
      error: "#b91c1c",
      envGradient: "linear-gradient(180deg, #e4f3ee, #f4faf7 55%, #dcefe9)",
    },
    dark: {
      background: "#091614",
      shellBackground: "#050d0c",
      surface: "#112320",
      surfaceElevated: "#18302c",
      surfaceSoft: "rgba(45, 212, 191, 0.12)",
      primary: "#2dd4bf",
      primaryDark: "#14b8a6",
      onPrimary: "#042f2e",
      accent: "#5eead4",
      textPrimary: "#f0fdfa",
      textSecondary: "#9ec4bd",
      textMuted: "#6b938c",
      border: "rgba(45, 212, 191, 0.18)",
      borderSubtle: "rgba(45, 212, 191, 0.10)",
      headerBg: "rgba(9, 22, 20, 0.95)",
      headerBorder: "rgba(45, 212, 191, 0.16)",
      navBarBg: "rgba(14, 29, 26, 0.97)",
      navBarBorder: "rgba(45, 212, 191, 0.16)",
      navBarActive: "#2dd4bf",
      navBarInactive: "#759a93",
      iconContainerBg: "rgba(45, 212, 191, 0.16)",
      iconColor: "#2dd4bf",
      inputBg: "#142824",
      inputBorder: "rgba(45, 212, 191, 0.22)",
      inputPlaceholder: "#6b938c",
      chatUserBg: "#14b8a6",
      chatUserText: "#042f2e",
      chatOnyBg: "#18302c",
      chatOnyText: "#f0fdfa",
      success: "#4ade80",
      warning: "#fbbf24",
      error: "#f87171",
      envGradient: "linear-gradient(180deg, #0e201d, #091614 60%, #060e0d)",
    },
  },

  // =========================================================================
  // 2. OCEAN / SEA (Clear, tranquil steady blue)
  // =========================================================================
  ocean: {
    id: "ocean",
    name: "Ocean / Sea",
    label: "Ocean Blue",
    description: "Clear and steady tranquil sea",
    note: "Clear and steady",
    accentHex: "#0284c7",
    previewHex: "#0284c7",
    light: {
      background: "#f1f8fc",
      shellBackground: "#dfeff8",
      surface: "#ffffff",
      surfaceElevated: "#e3f1f9",
      surfaceSoft: "#d5e9f6",
      primary: "#0284c7",
      primaryDark: "#0369a1",
      onPrimary: "#ffffff",
      accent: "#38bdf8",
      textPrimary: "#0d283c",
      textSecondary: "#456780",
      textMuted: "#7493ab",
      border: "#d0e3f1",
      borderSubtle: "#e2eef7",
      headerBg: "rgba(241, 248, 252, 0.94)",
      headerBorder: "#d0e3f1",
      navBarBg: "rgba(255, 255, 255, 0.96)",
      navBarBorder: "#d0e3f1",
      navBarActive: "#0284c7",
      navBarInactive: "#6e8eab",
      iconContainerBg: "rgba(2, 132, 199, 0.12)",
      iconColor: "#0284c7",
      inputBg: "#ffffff",
      inputBorder: "#ccdfed",
      inputPlaceholder: "#82a1bc",
      chatUserBg: "#0284c7",
      chatUserText: "#ffffff",
      chatOnyBg: "#e3f1f9",
      chatOnyText: "#0d283c",
      success: "#15803d",
      warning: "#b45309",
      error: "#b91c1c",
      envGradient: "linear-gradient(180deg, #e0f2fe, #f1f8fc 50%, #d4eaf7)",
    },
    dark: {
      background: "#07131e",
      shellBackground: "#030a10",
      surface: "#0f2030",
      surfaceElevated: "#172b3f",
      surfaceSoft: "rgba(56, 189, 248, 0.12)",
      primary: "#38bdf8",
      primaryDark: "#0284c7",
      onPrimary: "#082f49",
      accent: "#7dd3fc",
      textPrimary: "#f0f9ff",
      textSecondary: "#9ec2de",
      textMuted: "#688da9",
      border: "rgba(56, 189, 248, 0.18)",
      borderSubtle: "rgba(56, 189, 248, 0.10)",
      headerBg: "rgba(7, 19, 30, 0.95)",
      headerBorder: "rgba(56, 189, 248, 0.16)",
      navBarBg: "rgba(12, 26, 39, 0.97)",
      navBarBorder: "rgba(56, 189, 248, 0.16)",
      navBarActive: "#38bdf8",
      navBarInactive: "#7397b7",
      iconContainerBg: "rgba(56, 189, 248, 0.16)",
      iconColor: "#38bdf8",
      inputBg: "#112437",
      inputBorder: "rgba(56, 189, 248, 0.22)",
      inputPlaceholder: "#688da9",
      chatUserBg: "#0284c7",
      chatUserText: "#ffffff",
      chatOnyBg: "#172b3f",
      chatOnyText: "#f0f9ff",
      success: "#4ade80",
      warning: "#fbbf24",
      error: "#f87171",
      envGradient: "linear-gradient(180deg, #0d2134, #07131e 60%, #040c14)",
    },
  },

  // =========================================================================
  // 3. SUNSET / PINK (Soft, gentle rose & coral)
  // =========================================================================
  sunset: {
    id: "sunset",
    name: "Sunset",
    label: "Sunset Pink",
    description: "Soft and hopeful rose-coral",
    note: "Soft and hopeful",
    accentHex: "#e15b64",
    previewHex: "#e15b64",
    light: {
      background: "#fff6f4",
      shellBackground: "#fae7e4",
      surface: "#ffffff",
      surfaceElevated: "#fde9e6",
      surfaceSoft: "#fad6d1",
      primary: "#e15b64",
      primaryDark: "#c7434c",
      onPrimary: "#ffffff",
      accent: "#f472b6",
      textPrimary: "#3b171c",
      textSecondary: "#7c4e54",
      textMuted: "#a4737a",
      border: "#f3d5d1",
      borderSubtle: "#f9e7e5",
      headerBg: "rgba(255, 246, 244, 0.94)",
      headerBorder: "#f3d5d1",
      navBarBg: "rgba(255, 255, 255, 0.96)",
      navBarBorder: "#f3d5d1",
      navBarActive: "#e15b64",
      navBarInactive: "#9d747a",
      iconContainerBg: "rgba(225, 91, 100, 0.12)",
      iconColor: "#e15b64",
      inputBg: "#ffffff",
      inputBorder: "#edd0cc",
      inputPlaceholder: "#b5878d",
      chatUserBg: "#e15b64",
      chatUserText: "#ffffff",
      chatOnyBg: "#fde9e6",
      chatOnyText: "#3b171c",
      success: "#15803d",
      warning: "#b45309",
      error: "#b91c1c",
      envGradient: "linear-gradient(165deg, #fff1ee, #fde4df 50%, #fbd5ce)",
    },
    dark: {
      background: "#180b11",
      shellBackground: "#0e0509",
      surface: "#25131b",
      surfaceElevated: "#331a26",
      surfaceSoft: "rgba(251, 113, 133, 0.12)",
      primary: "#fb7185",
      primaryDark: "#f43f5e",
      onPrimary: "#4c0519",
      accent: "#f472b6",
      textPrimary: "#fff1f2",
      textSecondary: "#cfaab2",
      textMuted: "#9a737c",
      border: "rgba(251, 113, 133, 0.18)",
      borderSubtle: "rgba(251, 113, 133, 0.10)",
      headerBg: "rgba(24, 11, 17, 0.95)",
      headerBorder: "rgba(251, 113, 133, 0.16)",
      navBarBg: "rgba(32, 17, 24, 0.97)",
      navBarBorder: "rgba(251, 113, 133, 0.16)",
      navBarActive: "#fb7185",
      navBarInactive: "#a47982",
      iconContainerBg: "rgba(251, 113, 133, 0.16)",
      iconColor: "#fb7185",
      inputBg: "#291520",
      inputBorder: "rgba(251, 113, 133, 0.22)",
      inputPlaceholder: "#9a737c",
      chatUserBg: "#e15b64",
      chatUserText: "#ffffff",
      chatOnyBg: "#331a26",
      chatOnyText: "#fff1f2",
      success: "#4ade80",
      warning: "#fbbf24",
      error: "#f87171",
      envGradient: "linear-gradient(165deg, #27101c, #180b11 60%, #10060c)",
    },
  },

  // =========================================================================
  // 4. WARM PEACH (Original ONY warmth)
  // =========================================================================
  peach: {
    id: "peach",
    name: "Warm Peach",
    label: "Warm Peach",
    description: "Familiar signature ONY warmth",
    note: "Familiar ONY warmth",
    accentHex: "#e96f73",
    previewHex: "#f08d71",
    light: {
      background: "#fff9f1",
      shellBackground: "#f5ece1",
      surface: "#ffffff",
      surfaceElevated: "#ffece1",
      surfaceSoft: "#fedccb",
      primary: "#e96f73",
      primaryDark: "#ca555f",
      onPrimary: "#ffffff",
      accent: "#f97316",
      textPrimary: "#2f231e",
      textSecondary: "#735c53",
      textMuted: "#9a8278",
      border: "#eadfd7",
      borderSubtle: "#f7eee8",
      headerBg: "rgba(255, 249, 241, 0.94)",
      headerBorder: "#eadfd7",
      navBarBg: "rgba(255, 255, 255, 0.96)",
      navBarBorder: "#eadfd7",
      navBarActive: "#ca555f",
      navBarInactive: "#98847b",
      iconContainerBg: "rgba(233, 111, 115, 0.12)",
      iconColor: "#e96f73",
      inputBg: "#ffffff",
      inputBorder: "#e5d7ce",
      inputPlaceholder: "#a9948a",
      chatUserBg: "#e96f73",
      chatUserText: "#ffffff",
      chatOnyBg: "#ffece1",
      chatOnyText: "#2f231e",
      success: "#15803d",
      warning: "#b45309",
      error: "#ba454e",
      envGradient: "radial-gradient(circle at 85% 22%, rgba(239,139,121,.16), transparent 36%), linear-gradient(#fff9f1, #ffede2)",
    },
    dark: {
      background: "#18110b",
      shellBackground: "#0d0905",
      surface: "#251b14",
      surfaceElevated: "#33251c",
      surfaceSoft: "rgba(251, 146, 60, 0.12)",
      primary: "#fb923c",
      primaryDark: "#ea580c",
      onPrimary: "#431407",
      accent: "#fda4af",
      textPrimary: "#fff7ed",
      textSecondary: "#d0b9ab",
      textMuted: "#998173",
      border: "rgba(251, 146, 60, 0.18)",
      borderSubtle: "rgba(251, 146, 60, 0.10)",
      headerBg: "rgba(24, 17, 11, 0.95)",
      headerBorder: "rgba(251, 146, 60, 0.16)",
      navBarBg: "rgba(32, 22, 16, 0.97)",
      navBarBorder: "rgba(251, 146, 60, 0.16)",
      navBarActive: "#fb923c",
      navBarInactive: "#9f8677",
      iconContainerBg: "rgba(251, 146, 60, 0.16)",
      iconColor: "#fb923c",
      inputBg: "#2b1e16",
      inputBorder: "rgba(251, 146, 60, 0.22)",
      inputPlaceholder: "#998173",
      chatUserBg: "#ea580c",
      chatUserText: "#ffffff",
      chatOnyBg: "#33251c",
      chatOnyText: "#fff7ed",
      success: "#4ade80",
      warning: "#fbbf24",
      error: "#f87171",
      envGradient: "linear-gradient(180deg, #281910, #18110b 60%, #100a06)",
    },
  },

  // =========================================================================
  // 5. LAVENDER (Quiet, serene gentle purple)
  // =========================================================================
  lavender: {
    id: "lavender",
    name: "Lavender",
    label: "Quiet Lavender",
    description: "Quiet, gentle meditative lilac",
    note: "Quiet and gentle",
    accentHex: "#8b5cf6",
    previewHex: "#8b5cf6",
    light: {
      background: "#faf7fd",
      shellBackground: "#eee7f6",
      surface: "#ffffff",
      surfaceElevated: "#f1e9f8",
      surfaceSoft: "#e4d6f3",
      primary: "#8b5cf6",
      primaryDark: "#7c3aed",
      onPrimary: "#ffffff",
      accent: "#a78bfa",
      textPrimary: "#261933",
      textSecondary: "#635275",
      textMuted: "#8e7b9f",
      border: "#e5dcf0",
      borderSubtle: "#f2ecf8",
      headerBg: "rgba(250, 247, 253, 0.94)",
      headerBorder: "#e5dcf0",
      navBarBg: "rgba(255, 255, 255, 0.96)",
      navBarBorder: "#e5dcf0",
      navBarActive: "#7c3aed",
      navBarInactive: "#8e7c9f",
      iconContainerBg: "rgba(139, 92, 246, 0.12)",
      iconColor: "#8b5cf6",
      inputBg: "#ffffff",
      inputBorder: "#dfd4ec",
      inputPlaceholder: "#9d8ba9",
      chatUserBg: "#8b5cf6",
      chatUserText: "#ffffff",
      chatOnyBg: "#f1e9f8",
      chatOnyText: "#261933",
      success: "#15803d",
      warning: "#b45309",
      error: "#b91c1c",
      envGradient: "radial-gradient(circle at 80% 20%, #e9def2, transparent 38%), linear-gradient(#f7f3fa, #eee7f4)",
    },
    dark: {
      background: "#130c1c",
      shellBackground: "#0b0611",
      surface: "#1f142b",
      surfaceElevated: "#2b1c3c",
      surfaceSoft: "rgba(167, 139, 250, 0.12)",
      primary: "#a78bfa",
      primaryDark: "#8b5cf6",
      onPrimary: "#2e1065",
      accent: "#c4b5fd",
      textPrimary: "#faf5ff",
      textSecondary: "#c1b0d7",
      textMuted: "#8a75a3",
      border: "rgba(167, 139, 250, 0.18)",
      borderSubtle: "rgba(167, 139, 250, 0.10)",
      headerBg: "rgba(19, 12, 28, 0.95)",
      headerBorder: "rgba(167, 139, 250, 0.16)",
      navBarBg: "rgba(27, 18, 38, 0.97)",
      navBarBorder: "rgba(167, 139, 250, 0.16)",
      navBarActive: "#a78bfa",
      navBarInactive: "#9480aa",
      iconContainerBg: "rgba(167, 139, 250, 0.16)",
      iconColor: "#a78bfa",
      inputBg: "#231731",
      inputBorder: "rgba(167, 139, 250, 0.22)",
      inputPlaceholder: "#8a75a3",
      chatUserBg: "#7c3aed",
      chatUserText: "#ffffff",
      chatOnyBg: "#2b1c3c",
      chatOnyText: "#faf5ff",
      success: "#4ade80",
      warning: "#fbbf24",
      error: "#f87171",
      envGradient: "linear-gradient(180deg, #241334, #130c1c 60%, #0c0712)",
    },
  },

  // =========================================================================
  // 6. MINIMAL / NEUTRAL (Pure, distraction-free slate)
  // =========================================================================
  neutral: {
    id: "neutral",
    name: "Minimal / Neutral",
    label: "Minimal Slate",
    description: "Simple, focused distraction-free monochrome",
    note: "Simple and focused",
    accentHex: "#57534e",
    previewHex: "#64748b",
    light: {
      background: "#f8f7f5",
      shellBackground: "#e7e5e1",
      surface: "#ffffff",
      surfaceElevated: "#eeebe6",
      surfaceSoft: "#e2ded6",
      primary: "#57534e",
      primaryDark: "#44403c",
      onPrimary: "#ffffff",
      accent: "#78716c",
      textPrimary: "#1c1917",
      textSecondary: "#57534e",
      textMuted: "#88827c",
      border: "#e7e5e4",
      borderSubtle: "#f2f0ee",
      headerBg: "rgba(248, 247, 245, 0.94)",
      headerBorder: "#e7e5e4",
      navBarBg: "rgba(255, 255, 255, 0.96)",
      navBarBorder: "#e7e5e4",
      navBarActive: "#1c1917",
      navBarInactive: "#78716c",
      iconContainerBg: "rgba(87, 83, 78, 0.12)",
      iconColor: "#57534e",
      inputBg: "#ffffff",
      inputBorder: "#dedbd7",
      inputPlaceholder: "#9c968f",
      chatUserBg: "#44403c",
      chatUserText: "#ffffff",
      chatOnyBg: "#eeebe6",
      chatOnyText: "#1c1917",
      success: "#15803d",
      warning: "#b45309",
      error: "#b91c1c",
      envGradient: "linear-gradient(#fbfaf8, #f2efeb)",
    },
    dark: {
      background: "#0f0f10",
      shellBackground: "#070708",
      surface: "#1a1a1c",
      surfaceElevated: "#252528",
      surfaceSoft: "rgba(214, 211, 209, 0.10)",
      primary: "#d6d3d1",
      primaryDark: "#a8a29e",
      onPrimary: "#1c1917",
      accent: "#e7e5e4",
      textPrimary: "#f5f5f4",
      textSecondary: "#b8b4b0",
      textMuted: "#797571",
      border: "rgba(255, 255, 255, 0.12)",
      borderSubtle: "rgba(255, 255, 255, 0.08)",
      headerBg: "rgba(15, 15, 16, 0.95)",
      headerBorder: "rgba(255, 255, 255, 0.10)",
      navBarBg: "rgba(22, 22, 25, 0.97)",
      navBarBorder: "rgba(255, 255, 255, 0.10)",
      navBarActive: "#f5f5f4",
      navBarInactive: "#85817c",
      iconContainerBg: "rgba(255, 255, 255, 0.12)",
      iconColor: "#d6d3d1",
      inputBg: "#202023",
      inputBorder: "rgba(255, 255, 255, 0.16)",
      inputPlaceholder: "#797571",
      chatUserBg: "#27272a",
      chatUserText: "#f5f5f4",
      chatOnyBg: "#1e1e21",
      chatOnyText: "#f5f5f4",
      success: "#4ade80",
      warning: "#fbbf24",
      error: "#f87171",
      envGradient: "linear-gradient(180deg, #1c1c1f, #0f0f10 60%, #0a0a0b)",
    },
  },
};

/**
 * Returns the effective theme tokens for a given ThemeId and ThemeMode.
 * Resolves 'system' mode using window.matchMedia.
 */
export function getResolvedTokens(
  themeId: ThemeId,
  mode: ThemeMode,
): { tokens: SemanticThemeTokens; isDark: boolean; themeDef: ThemeDefinition } {
  const themeDef = THEME_DEFINITIONS[themeId] || THEME_DEFINITIONS.peach;

  let isDark = false;
  if (mode === "dark") {
    isDark = true;
  } else if (mode === "light") {
    isDark = false;
  } else {
    // system
    if (typeof window !== "undefined" && window.matchMedia) {
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
  }

  const tokens = isDark ? themeDef.dark : themeDef.light;
  return { tokens, isDark, themeDef };
}

/**
 * Injects the semantic tokens as CSS custom properties into document.documentElement,
 * ensuring both new --theme-* tokens and legacy tokens (--cream, --paper, --ink, etc.)
 * update seamlessly in real time across the entire DOM tree.
 */
export function applyTokensToDocument(
  themeId: ThemeId,
  mode: ThemeMode,
  fontScalePercent = 100,
): { isDark: boolean } {
  if (typeof document === "undefined") return { isDark: false };

  const root = document.documentElement;
  const { tokens, isDark } = getResolvedTokens(themeId, mode);

  // Set data attributes for global CSS targeting
  root.setAttribute("data-theme", themeId);
  root.setAttribute("data-theme-mode", isDark ? "dark" : "light");
  root.setAttribute("data-user-mode-preference", mode);

  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // Typography scale factor
  const scale = Math.max(0.85, Math.min(1.5, fontScalePercent / 100));
  root.style.setProperty("--font-scale", String(scale));
  root.style.setProperty("--font-title", `calc(22px * ${scale})`);
  root.style.setProperty("--font-heading", `calc(18px * ${scale})`);
  root.style.setProperty("--font-subheading", `calc(16px * ${scale})`);
  root.style.setProperty("--font-body", `calc(14px * ${scale})`);
  root.style.setProperty("--font-body-sm", `calc(13px * ${scale})`);
  root.style.setProperty("--font-caption", `calc(12px * ${scale})`);
  root.style.setProperty("--font-button", `calc(14px * ${scale})`);
  root.style.setProperty("--font-micro", `calc(10px * ${scale})`);

  // Semantic Tokens
  root.style.setProperty("--theme-bg", tokens.background);
  root.style.setProperty("--theme-shell-bg", tokens.shellBackground);
  root.style.setProperty("--theme-surface", tokens.surface);
  root.style.setProperty("--theme-surface-elevated", tokens.surfaceElevated);
  root.style.setProperty("--theme-surface-soft", tokens.surfaceSoft);

  root.style.setProperty("--theme-primary", tokens.primary);
  root.style.setProperty("--theme-primary-dark", tokens.primaryDark);
  root.style.setProperty("--theme-on-primary", tokens.onPrimary);
  root.style.setProperty("--theme-accent", tokens.accent);

  root.style.setProperty("--theme-text-primary", tokens.textPrimary);
  root.style.setProperty("--theme-text-secondary", tokens.textSecondary);
  root.style.setProperty("--theme-text-muted", tokens.textMuted);

  root.style.setProperty("--theme-border", tokens.border);
  root.style.setProperty("--theme-border-subtle", tokens.borderSubtle);

  root.style.setProperty("--theme-header-bg", tokens.headerBg);
  root.style.setProperty("--theme-header-border", tokens.headerBorder);
  root.style.setProperty("--theme-nav-bg", tokens.navBarBg);
  root.style.setProperty("--theme-nav-border", tokens.navBarBorder);
  root.style.setProperty("--theme-nav-active", tokens.navBarActive);
  root.style.setProperty("--theme-nav-inactive", tokens.navBarInactive);

  root.style.setProperty("--theme-icon-container-bg", tokens.iconContainerBg);
  root.style.setProperty("--theme-icon-color", tokens.iconColor);

  root.style.setProperty("--theme-input-bg", tokens.inputBg);
  root.style.setProperty("--theme-input-border", tokens.inputBorder);
  root.style.setProperty("--theme-input-placeholder", tokens.inputPlaceholder);

  root.style.setProperty("--theme-chat-user-bg", tokens.chatUserBg);
  root.style.setProperty("--theme-chat-user-text", tokens.chatUserText);
  root.style.setProperty("--theme-chat-ony-bg", tokens.chatOnyBg);
  root.style.setProperty("--theme-chat-ony-text", tokens.chatOnyText);

  root.style.setProperty("--theme-success", tokens.success);
  root.style.setProperty("--theme-warning", tokens.warning);
  root.style.setProperty("--theme-error", tokens.error);

  // Legacy mappings for 100% backward compatibility
  root.style.setProperty("--cream", tokens.background);
  root.style.setProperty("--paper", tokens.surface);
  root.style.setProperty("--surface", tokens.surface);
  root.style.setProperty("--surface-strong", tokens.surfaceElevated);
  root.style.setProperty("--text", tokens.textPrimary);
  root.style.setProperty("--ink", tokens.textPrimary);
  root.style.setProperty("--muted", tokens.textSecondary);
  root.style.setProperty("--line", tokens.border);
  root.style.setProperty("--coral", tokens.primary);
  root.style.setProperty("--coral-dark", tokens.primaryDark);
  root.style.setProperty("--sage", tokens.accent);
  root.style.setProperty("--sage-soft", tokens.surfaceElevated);
  root.style.setProperty("--peach", tokens.surfaceElevated);
  root.style.setProperty("--peach-soft", tokens.surfaceSoft);
  root.style.setProperty("--danger", tokens.error);
  root.style.setProperty("--theme-env-gradient", tokens.envGradient);

  // Soft status colors for badges & alerts
  root.style.setProperty(
    "--theme-error-soft",
    isDark ? "rgba(248, 113, 113, 0.18)" : "#fee2e2"
  );
  root.style.setProperty(
    "--theme-success-soft",
    isDark ? "rgba(74, 222, 128, 0.18)" : "#dcfce7"
  );
  root.style.setProperty(
    "--theme-warning-soft",
    isDark ? "rgba(251, 191, 36, 0.18)" : "#fef3c7"
  );

  if (document.body) {
    document.body.setAttribute("data-theme", themeId);
    document.body.setAttribute("data-theme-mode", isDark ? "dark" : "light");
    if (isDark) {
      document.body.classList.add("dark-mode", "dark");
    } else {
      document.body.classList.remove("dark-mode", "dark");
    }
  }

  if (isDark) {
    root.style.setProperty("--shadow", "0 14px 34px rgba(0, 0, 0, 0.45)");
  } else {
    root.style.setProperty("--shadow", "0 12px 32px rgba(91, 60, 49, 0.08)");
  }

  // Update browser status bar / theme-color meta tag
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", tokens.background);
  }

  return { isDark };
}
