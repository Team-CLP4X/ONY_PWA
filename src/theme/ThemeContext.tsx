import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  type ThemeId,
  type ThemeMode,
  type SemanticThemeTokens,
  THEME_DEFINITIONS,
  getResolvedTokens,
  applyTokensToDocument,
} from "./palettes";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../firebase/config";

export type FontSizeScale = "small" | "default" | "large" | "extraLarge";

export const FONT_SCALE_VALUES: Record<FontSizeScale, number> = {
  small: 85,
  default: 100,
  large: 115,
  extraLarge: 130,
};

export interface CompanionPreferences {
  companion: string;
  persona: string;
  conversationStyle: string;
  responseLength: string;
  useActiveMemories: boolean;
  memoryConsent: string;
}

export interface NotificationPreferences {
  dailyCheckinEnabled: boolean;
  reminderTime: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  reminders: boolean;
  community: boolean;
  marketplace: boolean;
  system: boolean;

  // Screen field aliases
  dailyCheckin?: boolean;
  dailyCheckinTime?: string;
  categories?: {
    reminders: boolean;
    community: boolean;
    marketplace: boolean;
    system: boolean;
  };
}

export interface SoundHapticsPreferences {
  soundsEnabled: boolean;
  hapticsEnabled: boolean;
  voiceVolume: number; // 0 to 100
}

export interface AppLockPreferences {
  enabled: boolean;
  pinHash?: string;
  biometricEnabled: boolean;
  lockAfter: "immediately" | "1min" | "5min";
  lockDelay?: "immediately" | "1min" | "5min";
}

/**
 * Unified user_settings document model
 * Stored in Firestore collection `user_settings/{userId}`
 */
export interface UserSettingsDoc {
  schemaVersion: number;
  userId: string;
  colorTheme: ThemeId;
  themeMode: ThemeMode;
  fontSizeScale: FontSizeScale;
  fontSizePercent: number; // 85 to 150
  language: string;
  companionPreferences: CompanionPreferences;
  notificationPreferences: NotificationPreferences;
  soundHapticsPreferences: SoundHapticsPreferences;
  appLockPreferences: AppLockPreferences;

  // Convenient property aliases
  notifications?: NotificationPreferences;
  soundHaptics?: SoundHapticsPreferences;
  appLock?: AppLockPreferences;

  createdAt?: string;
  updatedAt: string;
}

export const DEFAULT_USER_SETTINGS: UserSettingsDoc = {
  schemaVersion: 1,
  userId: "",
  colorTheme: "peach",
  themeMode: "system",
  fontSizeScale: "default",
  fontSizePercent: 100,
  language: "English",
  companionPreferences: {
    companion: "Cat",
    persona: "gentle",
    conversationStyle: "Reflective",
    responseLength: "Balanced",
    useActiveMemories: true,
    memoryConsent: "allow",
  },
  notificationPreferences: {
    dailyCheckinEnabled: true,
    reminderTime: "20:30",
    quietHoursEnabled: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:30",
    reminders: true,
    community: true,
    marketplace: false,
    system: true,
    dailyCheckin: true,
    dailyCheckinTime: "20:30",
    categories: {
      reminders: true,
      community: true,
      marketplace: false,
      system: true,
    },
  },
  soundHapticsPreferences: {
    soundsEnabled: true,
    hapticsEnabled: true,
    voiceVolume: 80,
  },
  appLockPreferences: {
    enabled: false,
    biometricEnabled: false,
    lockAfter: "1min",
    lockDelay: "1min",
  },
  notifications: {
    dailyCheckinEnabled: true,
    reminderTime: "20:30",
    quietHoursEnabled: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:30",
    reminders: true,
    community: true,
    marketplace: false,
    system: true,
    dailyCheckin: true,
    dailyCheckinTime: "20:30",
    categories: {
      reminders: true,
      community: true,
      marketplace: false,
      system: true,
    },
  },
  soundHaptics: {
    soundsEnabled: true,
    hapticsEnabled: true,
    voiceVolume: 80,
  },
  appLock: {
    enabled: false,
    biometricEnabled: false,
    lockAfter: "1min",
    lockDelay: "1min",
  },
  updatedAt: new Date().toISOString(),
};

export const LOCAL_SETTINGS_STORAGE_KEY = "ony_user_settings_v2";
export const PENDING_SYNC_QUEUE_KEY = "ony_user_settings_pending_sync_queue";

/**
 * Helper to compute SHA-256 hash for App Lock PIN
 */
export async function hashAppLockPin(pin: string): Promise<string> {
  const salt = "ony_wellness_secure_pin_salt_v1:";
  try {
    if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
      const data = new TextEncoder().encode(salt + pin);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch {}
  // Fallback simple bitwise hash if subtle is unavailable
  let hash = 0;
  const str = salt + pin;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return "fb_" + Math.abs(hash).toString(16);
}

/**
 * Synchronous local cache loader.
 * Safely migrates older stored settings or fills missing defaults.
 */
export function loadCachedSettings(): UserSettingsDoc {
  if (typeof window === "undefined") return DEFAULT_USER_SETTINGS;
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return mergeWithDefaults(parsed);
    }

    // Migration fallback from older disparate keys
    const legacyTheme = localStorage.getItem("ony_theme_preference");
    const legacyMode = localStorage.getItem("ony_appearance_theme_mode");
    const legacyScale = localStorage.getItem("ony_appearance_font_scale");
    const legacyLang = localStorage.getItem("ony_language");

    const migrated: Partial<UserSettingsDoc> = {};
    if (legacyTheme && legacyTheme in THEME_DEFINITIONS) {
      migrated.colorTheme = legacyTheme as ThemeId;
    }
    if (legacyMode === "light" || legacyMode === "dark" || legacyMode === "system") {
      migrated.themeMode = legacyMode;
    }
    if (legacyScale && legacyScale in FONT_SCALE_VALUES) {
      migrated.fontSizeScale = legacyScale as FontSizeScale;
      migrated.fontSizePercent = FONT_SCALE_VALUES[migrated.fontSizeScale];
    }
    if (legacyLang) migrated.language = legacyLang;

    return mergeWithDefaults(migrated);
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

/**
 * Handles schema evolution / missing fields for existing users
 */
export function mergeWithDefaults(incoming: Partial<UserSettingsDoc> | null | undefined): UserSettingsDoc {
  if (!incoming) return DEFAULT_USER_SETTINGS;

  const validThemes: ThemeId[] = ["peach", "ocean", "sunset", "forest", "lavender", "neutral"];
  const colorTheme: ThemeId =
    incoming.colorTheme && validThemes.includes(incoming.colorTheme)
      ? incoming.colorTheme
      : DEFAULT_USER_SETTINGS.colorTheme;

  const validModes: ThemeMode[] = ["light", "dark", "system"];
  const themeMode: ThemeMode =
    incoming.themeMode && validModes.includes(incoming.themeMode)
      ? incoming.themeMode
      : DEFAULT_USER_SETTINGS.themeMode;

  const validScales: FontSizeScale[] = ["small", "default", "large", "extraLarge"];
  const fontSizeScale: FontSizeScale =
    incoming.fontSizeScale && validScales.includes(incoming.fontSizeScale)
      ? incoming.fontSizeScale
      : DEFAULT_USER_SETTINGS.fontSizeScale;

  const fontSizePercent =
    typeof incoming.fontSizePercent === "number" &&
    incoming.fontSizePercent >= 85 &&
    incoming.fontSizePercent <= 150
      ? incoming.fontSizePercent
      : FONT_SCALE_VALUES[fontSizeScale] || 100;

  return {
    schemaVersion: 1,
    userId: incoming.userId || "",
    colorTheme,
    themeMode,
    fontSizeScale,
    fontSizePercent,
    language: incoming.language || DEFAULT_USER_SETTINGS.language,
    companionPreferences: {
      ...DEFAULT_USER_SETTINGS.companionPreferences,
      ...(incoming.companionPreferences || {}),
    },
    notificationPreferences: {
      ...DEFAULT_USER_SETTINGS.notificationPreferences,
      ...(incoming.notificationPreferences || {}),
    },
    soundHapticsPreferences: {
      ...DEFAULT_USER_SETTINGS.soundHapticsPreferences,
      ...(incoming.soundHapticsPreferences || {}),
    },
    appLockPreferences: {
      ...DEFAULT_USER_SETTINGS.appLockPreferences,
      ...(incoming.appLockPreferences || {}),
    },
    createdAt: incoming.createdAt || new Date().toISOString(),
    updatedAt: incoming.updatedAt || new Date().toISOString(),
  };
}

export function saveCachedSettings(settings: UserSettingsDoc): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    // Keep backwards-compatible keys in sync
    localStorage.setItem("ony_theme_preference", settings.colorTheme);
    localStorage.setItem("ony_appearance_theme_mode", settings.themeMode);
    localStorage.setItem("ony_appearance_font_scale", settings.fontSizeScale);
    localStorage.setItem("ony_language", settings.language);
  } catch {}
}

/**
 * Initializes theme tokens on DOM as early as possible
 */
export function initThemeSystem(): { isDark: boolean; initialSettings: UserSettingsDoc } {
  const cached = loadCachedSettings();
  const res = applyTokensToDocument(cached.colorTheme, cached.themeMode, cached.fontSizePercent);
  return { isDark: res.isDark, initialSettings: cached };
}

export interface ThemeContextValue {
  // Theme state
  themeId: ThemeId;
  themeMode: ThemeMode;
  effectiveMode: "light" | "dark";
  fontSizeScale: FontSizeScale;
  fontSizePercent: number;
  tokens: SemanticThemeTokens;
  isDark: boolean;
  settings: UserSettingsDoc;
  isSyncing: boolean;
  syncError: string | null;

  // Actions
  setColorTheme: (theme: ThemeId) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setFontSizeScale: (scale: FontSizeScale) => void;
  setFontSizePercent: (percent: number) => void;
  setFontScalePercent: (percent: number) => void;
  updateSettings: (updater: ((prev: UserSettingsDoc) => UserSettingsDoc) | Partial<UserSettingsDoc>) => Promise<void> | void;
  syncWithDatabase: (userId: string) => Promise<void>;
  resetSettingsOnLogout: () => void;
  retryPendingSync: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettingsDoc>(() => loadCachedSettings());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Apply to DOM on initial render and whenever theme / mode / text size changes
  useEffect(() => {
    isMountedRef.current = true;
    applyTokensToDocument(settings.colorTheme, settings.themeMode, settings.fontSizePercent);
    saveCachedSettings(settings);

    return () => {
      isMountedRef.current = false;
    };
  }, [settings]);

  // Listen for system color-scheme changes if themeMode === 'system'
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (settings.themeMode === "system") {
        applyTokensToDocument(settings.colorTheme, "system", settings.fontSizePercent);
      }
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [settings.themeMode, settings.colorTheme, settings.fontSizePercent]);

  // Persist settings to Firestore database
  const pushSettingsToDatabase = useCallback(
    async (updatedSettings: UserSettingsDoc, targetUid?: string) => {
      const uid = targetUid || updatedSettings.userId || auth.currentUser?.uid;
      if (!uid) return;

      const payload: UserSettingsDoc = {
        ...updatedSettings,
        userId: uid,
        updatedAt: new Date().toISOString(),
      };

      try {
        setIsSyncing(true);
        setSyncError(null);

        // 1. Save to dedicated user_settings collection
        const settingsRef = doc(db, "user_settings", uid);
        await setDoc(settingsRef, payload, { merge: true });

        // 2. Also sync to users/{uid} document for 100% backwards compatibility
        const userRef = doc(db, "users", uid);
        await setDoc(
          userRef,
          {
            theme: payload.colorTheme,
            preferredLanguage: payload.language,
            companion: payload.companionPreferences.companion,
            persona: payload.companionPreferences.persona,
            conversationStyle: payload.companionPreferences.conversationStyle,
            responseLength: payload.companionPreferences.responseLength,
            useActiveMemories: payload.companionPreferences.useActiveMemories,
            memoryConsent: payload.companionPreferences.memoryConsent,
            userSettings: payload,
            updatedAt: payload.updatedAt,
          },
          { merge: true },
        ).catch(() => {});

        // Clear offline pending queue on success
        if (typeof window !== "undefined") {
          localStorage.removeItem(PENDING_SYNC_QUEUE_KEY);
        }
      } catch (err: unknown) {
        console.warn("[ONY Theme] Remote sync warning, queuing offline:", err);
        // Queue for background retry
        if (typeof window !== "undefined") {
          localStorage.setItem(PENDING_SYNC_QUEUE_KEY, JSON.stringify(payload));
        }
        setSyncError("Settings saved offline. Will sync when back online.");
      } finally {
        if (isMountedRef.current) {
          setIsSyncing(false);
        }
      }
    },
    [],
  );

  // Auto-retry offline queued settings when device comes online
  const retryPendingSync = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine) return;
    try {
      const queued = localStorage.getItem(PENDING_SYNC_QUEUE_KEY);
      if (queued) {
        const parsed: UserSettingsDoc = JSON.parse(queued);
        await pushSettingsToDatabase(parsed);
      }
    } catch {}
  }, [pushSettingsToDatabase]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("online", retryPendingSync);
    return () => window.removeEventListener("online", retryPendingSync);
  }, [retryPendingSync]);

  // Sync with Firestore upon login or device boot
  const syncWithDatabase = useCallback(
    async (userId: string) => {
      if (!userId) return;
      try {
        setIsSyncing(true);
        // 1. Try reading user_settings/{userId}
        const settingsRef = doc(db, "user_settings", userId);
        const snap = await getDoc(settingsRef);

        if (snap.exists()) {
          const remoteData = snap.data() as Partial<UserSettingsDoc>;
          const merged = mergeWithDefaults({ ...remoteData, userId });
          setSettings(merged);
          saveCachedSettings(merged);
          applyTokensToDocument(merged.colorTheme, merged.themeMode, merged.fontSizePercent);
        } else {
          // 2. Fallback check user profile document
          const userRef = doc(db, "users", userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const uData = userSnap.data();
            const fromProfile: Partial<UserSettingsDoc> = {
              userId,
              ...(uData.userSettings || {}),
              colorTheme: (uData.theme as ThemeId) || settings.colorTheme,
              language: uData.preferredLanguage || settings.language,
            };
            const merged = mergeWithDefaults(fromProfile);
            setSettings(merged);
            saveCachedSettings(merged);
            applyTokensToDocument(merged.colorTheme, merged.themeMode, merged.fontSizePercent);
            // Save initial user_settings doc
            await pushSettingsToDatabase(merged, userId);
          } else {
            // New user, push local settings to Firestore
            await pushSettingsToDatabase(settings, userId);
          }
        }
      } catch (err: unknown) {
        console.warn("[ONY Theme] Cloud settings fetch notice:", err);
      } finally {
        if (isMountedRef.current) {
          setIsSyncing(false);
        }
      }
    },
    [pushSettingsToDatabase, settings],
  );

  // General updater for arbitrary settings
  const updateSettings = useCallback(
    (updater: ((prev: UserSettingsDoc) => UserSettingsDoc) | Partial<UserSettingsDoc>) => {
      setSettings((prev) => {
        let next: UserSettingsDoc;
        if (typeof updater === "function") {
          next = updater(prev);
        } else {
          next = {
            ...prev,
            ...updater,
            notificationPreferences: {
              ...prev.notificationPreferences,
              ...(updater.notificationPreferences || updater.notifications || {}),
            },
            soundHapticsPreferences: {
              ...prev.soundHapticsPreferences,
              ...(updater.soundHapticsPreferences || updater.soundHaptics || {}),
            },
            appLockPreferences: {
              ...prev.appLockPreferences,
              ...(updater.appLockPreferences || updater.appLock || {}),
            },
            companionPreferences: {
              ...prev.companionPreferences,
              ...(updater.companionPreferences || {}),
            },
            updatedAt: new Date().toISOString(),
          };
        }

        // Keep aliases populated
        next.notifications = next.notificationPreferences;
        next.soundHaptics = next.soundHapticsPreferences;
        next.appLock = next.appLockPreferences;

        saveCachedSettings(next);
        applyTokensToDocument(next.colorTheme, next.themeMode, next.fontSizePercent);
        void pushSettingsToDatabase(next);
        return next;
      });
    },
    [pushSettingsToDatabase],
  );

  // Dedicated Theme Setters with instant optimistic updates
  const setColorTheme = useCallback(
    (theme: ThemeId) => {
      updateSettings((prev) => ({
        ...prev,
        colorTheme: theme,
      }));
    },
    [updateSettings],
  );

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      updateSettings((prev) => ({
        ...prev,
        themeMode: mode,
      }));
    },
    [updateSettings],
  );

  const setFontSizeScale = useCallback(
    (scale: FontSizeScale) => {
      const percent = FONT_SCALE_VALUES[scale] || 100;
      updateSettings((prev) => ({
        ...prev,
        fontSizeScale: scale,
        fontSizePercent: percent,
      }));
    },
    [updateSettings],
  );

  const setFontSizePercent = useCallback(
    (percent: number) => {
      const clamped = Math.max(85, Math.min(150, Math.round(percent)));
      let closestScale: FontSizeScale = "default";
      if (clamped <= 92) closestScale = "small";
      else if (clamped <= 108) closestScale = "default";
      else if (clamped <= 122) closestScale = "large";
      else closestScale = "extraLarge";

      updateSettings((prev) => ({
        ...prev,
        fontSizePercent: clamped,
        fontSizeScale: closestScale,
      }));
    },
    [updateSettings],
  );

  const resetSettingsOnLogout = useCallback(() => {
    const defaults = { ...DEFAULT_USER_SETTINGS, userId: "" };
    setSettings(defaults);
    saveCachedSettings(defaults);
    applyTokensToDocument(defaults.colorTheme, defaults.themeMode, defaults.fontSizePercent);
    if (typeof window !== "undefined") {
      localStorage.removeItem(PENDING_SYNC_QUEUE_KEY);
    }
  }, []);

  const { tokens, isDark } = getResolvedTokens(settings.colorTheme, settings.themeMode);
  const effectiveMode: "light" | "dark" = isDark ? "dark" : "light";

  return (
    <ThemeContext.Provider
      value={{
        themeId: settings.colorTheme,
        themeMode: settings.themeMode,
        effectiveMode,
        fontSizeScale: settings.fontSizeScale,
        fontSizePercent: settings.fontSizePercent,
        tokens,
        isDark,
        settings,
        isSyncing,
        syncError,
        setColorTheme,
        setThemeMode,
        setFontSizeScale,
        setFontSizePercent,
        setFontScalePercent: setFontSizePercent,
        updateSettings,
        syncWithDatabase,
        resetSettingsOnLogout,
        retryPendingSync,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function useSettings(): ThemeContextValue {
  return useTheme();
}
