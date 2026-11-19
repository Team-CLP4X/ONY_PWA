import React, {
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type ChangeEvent,
} from "react";
import type { User } from "firebase/auth";
import { auth } from "../firebase/config";
import {
  changeUserPassword,
  linkGoogleProvider,
  sendPasswordReset,
  unlinkGoogleProvider,
} from "../firebase/auth";
import {
  exportUserData,
  submitFeedbackReport,
  updateUserProfile,
  writeSystemLog,
  type UserProfileData,
} from "../firebase/firestore";
import { uploadUserMedia } from "../firebase/storage";
import {
  useTheme,
  useSettings,
  FONT_SCALE_VALUES,
  hashAppLockPin,
  DEFAULT_USER_SETTINGS,
  type FontSizeScale,
  type ChatViewMode,
  type UserSettingsDoc,
} from "../theme/ThemeContext";
import {
  THEME_DEFINITIONS,
  applyTokensToDocument,
  type ThemeId,
  type ThemeMode,
} from "../theme/palettes";
import { CompanionAvatar } from "./CompanionAvatar";
import ThemedSwitch from "./common/ThemedSwitch";

export function getAnimalFromPreset(preset?: string): "Cat" | "Dog" | "Bunny" | "Bear" | "Fox" | "Panda" | null {
  if (!preset) return null;
  const p = preset.trim().toLowerCase();
  if (p === "cat" || p === "🐱") return "Cat";
  if (p === "dog" || p === "🐶") return "Dog";
  if (p === "bunny" || p === "🐰") return "Bunny";
  if (p === "bear" || p === "🐻") return "Bear";
  if (p === "fox" || p === "🦊") return "Fox";
  if (p === "panda" || p === "🐼") return "Panda";
  return null;
}

function getScopedProfileKey(uid?: string | null): string {
  const clean = (uid || "").trim();
  return clean ? `ony_profile_customization_v2_${clean}` : "ony_profile_customization_v2_signed_out";
}

export interface StoredProfileCustomization {
  displayName: string;
  preferredName?: string;
  bio?: string;
  avatarUrl?: string;
  avatarType?: "initials" | "photo" | "preset";
  presetAvatar?: string;
  ageRange?: string;
  pronouns?: string;
}

export interface StoredAppearanceSettings {
  themeMode: "light" | "dark" | "system";
  themeId?: ThemeId;
  fontSizeScale: "small" | "default" | "large" | "extraLarge";
  fontSizePercent?: number;
}

export function loadStoredProfile(uid?: string | null): StoredProfileCustomization {
  const cleanUid = (uid || auth.currentUser?.uid || "").trim();
  if (!cleanUid) {
    return {
      displayName: "",
      avatarType: "initials",
      ageRange: "18-24",
      pronouns: "prefer not to say",
    };
  }
  try {
    const raw = localStorage.getItem(getScopedProfileKey(cleanUid));
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    displayName: "",
    avatarType: "initials",
    ageRange: "18-24",
    pronouns: "prefer not to say",
  };
}

export function saveStoredProfile(profile: StoredProfileCustomization, uid?: string | null) {
  const cleanUid = (uid || auth.currentUser?.uid || "").trim();
  if (!cleanUid) return;
  try {
    localStorage.setItem(getScopedProfileKey(cleanUid), JSON.stringify(profile));
  } catch {}
}

export function applyAppearanceToDom(settings: StoredAppearanceSettings) {
  if (typeof document === "undefined") return;
  const tId = settings.themeId || "peach";
  const tMode = settings.themeMode || "system";
  const percent = settings.fontSizePercent || FONT_SCALE_VALUES[settings.fontSizeScale || "default"] || 100;
  applyTokensToDocument(tId, tMode, percent);
}

// ==========================================
// Settings Dedicated SVG Icon Component
// ==========================================

export function SettingsIcon({ name, className = "" }: { name: string; className?: string }) {
  const iconPaths: Record<string, ReactNode> = {
    user: (
      <>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </>
    ),
    creditCard: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </>
    ),
    key: (
      <>
        <path d="m21 2-2 2m-1.5 1.5L14 9l-2-2-4 4 2 2-3 3H3v4h4v-2l2-2 2 2 4-4-2-2 3.5-3.5" />
        <circle cx="7.5" cy="16.5" r=".5" fill="currentColor" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </>
    ),
    messageCircle: (
      <>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </>
    ),
    palette: (
      <>
        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
        <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
        <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
    volume: (
      <>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </>
    ),
    phone: (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    ),
    lock: (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
    fileText: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </>
    ),
    helpCircle: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
    messageSquare: (
      <>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </>
    ),
    alertTriangle: (
      <>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </>
    ),
    download: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </>
    ),
    trash: (
      <>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </>
    ),
    logOut: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    sparkles: (
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </>
    ),
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
    monitor: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </>
    ),
    check: <polyline points="20 6 9 17 4 12" />,
    eye: (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    eyeOff: (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    ),
    camera: (
      <>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
    x: <line x1="18" y1="6" x2="6" y2="18" />,
  };

  return (
    <svg
      className={`settings-svg-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name] || iconPaths.info}
    </svg>
  );
}

// ==========================================
// 1. REUSABLE SETTINGS COMPONENTS
// ==========================================

export interface SettingsHeaderProps {
  displayName: string;
  email?: string;
  avatarUrl?: string;
  presetAvatar?: string;
  onEditProfile: () => void;
  companion?: string;
}

export function SettingsHeader({
  displayName,
  email,
  avatarUrl,
  presetAvatar,
  onEditProfile,
  companion,
}: SettingsHeaderProps) {
  const cleanName = displayName.trim() || "ONY Member";
  const initials = cleanName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "O";

  const animalPreset = getAnimalFromPreset(presetAvatar) || getAnimalFromPreset(companion);

  return (
    <div
      className="settings-header-card"
      onClick={onEditProfile}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEditProfile();
        }
      }}
      aria-label={`Profile: ${cleanName}. Tap to edit profile.`}
    >
      <div className="settings-header-avatar-slot">
        {avatarUrl ? (
          <img src={avatarUrl} alt={cleanName} className="settings-header-avatar-img" />
        ) : animalPreset ? (
          <CompanionAvatar animal={animalPreset} size="sm" mood="idle" />
        ) : presetAvatar ? (
          <span className="settings-header-avatar-emoji">{presetAvatar}</span>
        ) : (
          <div className="settings-header-avatar-initials">{initials}</div>
        )}
      </div>

      <div className="settings-header-text">
        <h2 className="settings-header-title">{cleanName}</h2>
        <p className="settings-header-subtitle">{email || "Edit profile & personal preferences"}</p>
      </div>

      <div className="settings-header-action" title="Edit Profile">
        <span className="settings-header-edit-pill">
          <SettingsIcon name="edit" />
          <span>Edit</span>
        </span>
      </div>
    </div>
  );
}

export interface SettingsSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function SettingsSection({ title, children, className = "" }: SettingsSectionProps) {
  return (
    <section className={`settings-section-container ${className}`}>
      <span className="settings-section-title">{title}</span>
      <div className="settings-section-card">{children}</div>
    </section>
  );
}

export interface SettingsRowProps {
  icon: string | ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  rightElement?: ReactNode;
  destructive?: boolean;
  badge?: string | number;
  disabled?: boolean;
  ariaLabel?: string;
  isStandalone?: boolean;
}

export function SettingsRow({
  icon,
  title,
  subtitle,
  onClick,
  rightElement,
  destructive = false,
  badge,
  disabled = false,
  ariaLabel,
  isStandalone = false,
}: SettingsRowProps) {
  const content = (
    <>
      <div className={`settings-row-icon-box ${destructive ? "destructive" : ""}`}>
        {typeof icon === "string" ? <SettingsIcon name={icon} /> : icon}
      </div>

      <div className="settings-row-text-col">
        <strong className={`settings-row-title ${destructive ? "destructive" : ""}`}>
          {title}
        </strong>
        {subtitle && <small className="settings-row-subtitle">{subtitle}</small>}
      </div>

      <div className="settings-row-right-col">
        {badge !== undefined && badge !== "" && (
          <span className="settings-row-badge">{badge}</span>
        )}
        {rightElement ? (
          rightElement
        ) : onClick ? (
          <SettingsIcon name="chevron" className="settings-row-chevron" />
        ) : null}
      </div>
    </>
  );

  if (isStandalone) {
    return (
      <div
        className="settings-standalone-card"
        onClick={disabled ? undefined : onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick && !disabled ? 0 : undefined}
        onKeyDown={(e) => {
          if (onClick && !disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onClick();
          }
        }}
        aria-label={ariaLabel || `${title}${subtitle ? `. ${subtitle}` : ""}`}
      >
        <div className="settings-row standalone-row">{content}</div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`settings-row ${destructive ? "destructive" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || `${title}${subtitle ? `. ${subtitle}` : ""}`}
    >
      {content}
    </button>
  );
}

// ==========================================
// 2. NEW SCREEN: EDIT PROFILE
// ==========================================

export interface EditProfileScreenProps {
  back: () => void;
  currentDisplayName: string;
  onSaveDisplayName: (name: string) => void;
  currentEmail?: string;
  initialProfile?: UserProfileData | null;
  notify: (msg: string) => void;
  currentUser?: User | null;
}

const PRESET_AVATARS = [
  { emoji: "🐱", name: "Cat" },
  { emoji: "🐶", name: "Dog" },
  { emoji: "🐰", name: "Bunny" },
  { emoji: "🐻", name: "Bear" },
  { emoji: "🦊", name: "Fox" },
  { emoji: "🐼", name: "Panda" },
  { emoji: "🌸", name: "Blossom" },
  { emoji: "☀️", name: "Sun" },
];

export function EditProfileScreen({
  back,
  currentDisplayName,
  onSaveDisplayName,
  currentEmail,
  initialProfile,
  notify,
  currentUser,
}: EditProfileScreenProps) {
  const uid = currentUser?.uid || auth.currentUser?.uid || "";
  const stored = loadStoredProfile(uid);

  const initialAvatarUrlRaw = initialProfile?.avatarUrl || stored.avatarUrl || "";
  const isHttpAvatar = initialAvatarUrlRaw.startsWith("http://") || initialAvatarUrlRaw.startsWith("https://");
  const initialAvatarType: "initials" | "photo" | "preset" = isHttpAvatar
    ? "photo"
    : initialAvatarUrlRaw
      ? "preset"
      : stored.avatarType || "initials";

  const [username, setUsername] = useState(
    currentDisplayName || initialProfile?.displayName || stored.displayName || "ONY Member",
  );
  const [preferredName, setPreferredName] = useState(
    initialProfile?.preferredName ?? stored.preferredName ?? "",
  );
  const [bio, setBio] = useState(initialProfile?.bio ?? stored.bio ?? "");
  const [avatarType, setAvatarType] = useState<"initials" | "photo" | "preset">(initialAvatarType);
  const [avatarUrl, setAvatarUrl] = useState<string>(isHttpAvatar ? initialAvatarUrlRaw : "");
  const [presetAvatar, setPresetAvatar] = useState<string>(
    !isHttpAvatar && initialAvatarUrlRaw ? initialAvatarUrlRaw : stored.presetAvatar || "🐱",
  );
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [ageRange, setAgeRange] = useState(initialProfile?.ageRange || stored.ageRange || "18-24");
  const [pronouns, setPronouns] = useState(
    initialProfile?.pronouns || stored.pronouns || "prefer not to say",
  );
  const [customPronouns, setCustomPronouns] = useState("");

  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  const initialValuesRef = useRef({
    username: currentDisplayName || initialProfile?.displayName || stored.displayName || "ONY Member",
    preferredName: initialProfile?.preferredName ?? stored.preferredName ?? "",
    bio: initialProfile?.bio ?? stored.bio ?? "",
    avatarType: initialAvatarType,
    avatarUrl: isHttpAvatar ? initialAvatarUrlRaw : "",
    presetAvatar: !isHttpAvatar && initialAvatarUrlRaw ? initialAvatarUrlRaw : stored.presetAvatar || "🐱",
    ageRange: initialProfile?.ageRange || stored.ageRange || "18-24",
    pronouns: initialProfile?.pronouns || stored.pronouns || "prefer not to say",
    customPronouns: "",
  });

  // Inline Validation
  const trimmedUsername = username.trim();
  let usernameError = "";
  if (!trimmedUsername) {
    usernameError = "Username is required";
  } else if (trimmedUsername.length < 2) {
    usernameError = "Username must be at least 2 characters";
  } else if (trimmedUsername.length > 30) {
    usernameError = "Username must be at most 30 characters";
  }

  const isDirty =
    username !== initialValuesRef.current.username ||
    preferredName !== initialValuesRef.current.preferredName ||
    bio !== initialValuesRef.current.bio ||
    avatarType !== initialValuesRef.current.avatarType ||
    avatarUrl !== initialValuesRef.current.avatarUrl ||
    Boolean(pendingPhotoFile) ||
    presetAvatar !== initialValuesRef.current.presetAvatar ||
    ageRange !== initialValuesRef.current.ageRange ||
    pronouns !== initialValuesRef.current.pronouns ||
    customPronouns !== initialValuesRef.current.customPronouns;

  const isValid = !usernameError;
  const canSave = isDirty && isValid && !isSaving;

  const handleBackAttempt = () => {
    if (isDirty) {
      setShowDiscardModal(true);
    } else {
      back();
    }
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notify("Please select an image file (PNG, JPG, WebP)");
      return;
    }

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }
    const objUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = objUrl;
    setPendingPhotoFile(file);
    setAvatarUrl(objUrl);
    setAvatarType("photo");
    notify("Photo selected. Tap Save to upload.");
  };

  const handleSave = async () => {
    if (!canSave) return;
    if (!uid) {
      notify("Please sign in to save your profile.");
      return;
    }
    setIsSaving(true);

    const resolvedPronouns =
      pronouns === "Custom" && customPronouns.trim() ? customPronouns.trim() : pronouns;

    try {
      let resolvedPhotoUrl = avatarType === "photo" ? avatarUrl : "";
      if (avatarType === "photo" && pendingPhotoFile) {
        const uploaded = await uploadUserMedia(uid, "avatars", pendingPhotoFile, {
          maxDimension: 512,
        });
        resolvedPhotoUrl = uploaded.url;
      }

      const persistedAvatarValue =
        avatarType === "photo" ? resolvedPhotoUrl : avatarType === "preset" ? presetAvatar : "";

      await updateUserProfile(uid, {
        displayName: trimmedUsername,
        bio: bio.trim(),
        avatarUrl: persistedAvatarValue,
        preferredName: preferredName.trim(),
        ageRange,
        pronouns: resolvedPronouns,
      } as Partial<UserProfileData>);

      const profileData: StoredProfileCustomization = {
        displayName: trimmedUsername,
        preferredName: preferredName.trim(),
        bio: bio.trim(),
        avatarType,
        avatarUrl: avatarType === "photo" ? resolvedPhotoUrl : "",
        presetAvatar: avatarType === "preset" ? presetAvatar : "",
        ageRange,
        pronouns: resolvedPronouns,
      };
      saveStoredProfile(profileData, uid);
      onSaveDisplayName(trimmedUsername);

      writeSystemLog({
        level: "info",
        category: "auth",
        action: "PROFILE_UPDATED",
        message: `User updated profile. Display name set to "${trimmedUsername}".`,
      }).catch(() => {});

      notify("Profile updated successfully!");
      back();
    } catch (err: any) {
      console.error("[EditProfile] Save failed:", err);
      notify(err?.message || "Could not save profile changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const initials = trimmedUsername
    ? trimmedUsername
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() || "")
        .join("")
    : "O";

  return (
    <div className="settings-subpage">
      {/* Header */}
      <div className="settings-page-header">
        <button
          type="button"
          className="settings-back-btn"
          onClick={handleBackAttempt}
          aria-label="Go back"
        >
          <SettingsIcon name="chevron" className="rotate-180" />
        </button>
        <div className="settings-page-header-title">
          <h1>Edit Profile</h1>
          <p>Customize your personal identity & appearance</p>
        </div>
        <button
          type="button"
          className="settings-save-header-btn"
          disabled={!canSave}
          onClick={handleSave}
          aria-label="Save profile changes"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="settings-subpage-content">
        {/* Avatar Section */}
        <div className="edit-profile-avatar-center">
          <div className="edit-profile-avatar-large">
            {avatarType === "photo" && avatarUrl ? (
              <img src={avatarUrl} alt="Avatar Preview" className="edit-profile-avatar-img" />
            ) : avatarType === "preset" ? (
              getAnimalFromPreset(presetAvatar) ? (
                <CompanionAvatar
                  animal={getAnimalFromPreset(presetAvatar)!}
                  size="lg"
                  mood="happy"
                  interactive
                />
              ) : (
                <span className="edit-profile-avatar-emoji">{presetAvatar}</span>
              )
            ) : (
              <div className="edit-profile-avatar-initials">{initials}</div>
            )}
          </div>

          <div className="edit-profile-avatar-actions">
            <button
              type="button"
              className="edit-avatar-chip-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <SettingsIcon name="camera" />
              <span>Upload Photo</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/*"
              onChange={handlePhotoUpload}
            />

            <button
              type="button"
              className="edit-avatar-chip-btn"
              onClick={() => setShowPresetModal(true)}
            >
              <SettingsIcon name="sparkles" />
              <span>Choose Preset</span>
            </button>

            <button
              type="button"
              className={`edit-avatar-chip-btn ${avatarType === "initials" ? "active" : ""}`}
              onClick={() => setAvatarType("initials")}
            >
              <SettingsIcon name="user" />
              <span>Initials</span>
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="edit-profile-form-card">
          {/* Username */}
          <div className="form-field-group">
            <label htmlFor="edit-username" className="form-field-label">
              Display Username <span className="required-star">*</span>
            </label>
            <input
              id="edit-username"
              type="text"
              className={`settings-text-input ${usernameError ? "error" : ""}`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
              placeholder="e.g. Nadia"
            />
            {usernameError && <span className="form-field-error-text">{usernameError}</span>}
            <small className="form-field-hint">
              Visible on your community light posts, journal signature, and companion greetings (2-30 chars).
            </small>
          </div>

          {/* Preferred Name */}
          <div className="form-field-group">
            <label htmlFor="edit-pref-name" className="form-field-label">
              Preferred Name / Nickname (Optional)
            </label>
            <input
              id="edit-pref-name"
              type="text"
              className="settings-text-input"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              maxLength={30}
              placeholder="e.g. Lex"
            />
            <small className="form-field-hint">What ONY calls you during warm reflections.</small>
          </div>

          {/* Bio */}
          <div className="form-field-group">
            <div className="label-with-counter">
              <label htmlFor="edit-bio" className="form-field-label">
                Bio & Personal Note
              </label>
              <span className="char-counter">{bio.length}/160</span>
            </div>
            <textarea
              id="edit-bio"
              className="settings-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              placeholder="A few gentle words about yourself, things that keep you grounded, or your current focus..."
              rows={3}
            />
          </div>

          {/* Age Range */}
          <div className="form-field-group">
            <label htmlFor="edit-age" className="form-field-label">
              Age Range (Optional)
            </label>
            <select
              id="edit-age"
              className="settings-select"
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
            >
              <option value="Under 18">Under 18</option>
              <option value="18-24">18 - 24 years</option>
              <option value="25-34">25 - 34 years</option>
              <option value="35-44">35 - 44 years</option>
              <option value="45+">45+ years</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

          {/* Pronouns */}
          <div className="form-field-group">
            <label htmlFor="edit-pronouns" className="form-field-label">
              Pronouns (Optional)
            </label>
            <select
              id="edit-pronouns"
              className="settings-select"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
            >
              <option value="she/her">she / her</option>
              <option value="he/him">he / him</option>
              <option value="they/them">they / them</option>
              <option value="prefer not to say">Prefer not to say</option>
              <option value="Custom">Custom...</option>
            </select>
            {pronouns === "Custom" && (
              <input
                type="text"
                className="settings-text-input"
                style={{ marginTop: "8px" }}
                value={customPronouns}
                onChange={(e) => setCustomPronouns(e.target.value)}
                placeholder="Enter your pronouns (e.g. ze/zir)"
                maxLength={20}
              />
            )}
          </div>

          {/* Account Email (Read-Only) */}
          {currentEmail && (
            <div className="form-field-group">
              <label className="form-field-label">Registered Account Email</label>
              <div className="settings-readonly-badge">
                <SettingsIcon name="shield" />
                <span>{currentEmail}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preset Modal */}
      {showPresetModal && (
        <div className="settings-modal-overlay" onClick={() => setShowPresetModal(false)}>
          <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="settings-modal-title">Choose Companion Preset</h3>
            <p className="settings-modal-desc">Select a friendly emblem for your profile</p>
            <div className="preset-grid">
              {PRESET_AVATARS.map((p) => {
                const animalName = getAnimalFromPreset(p.emoji) || getAnimalFromPreset(p.name);
                return (
                  <button
                    type="button"
                    key={p.name}
                    className={`preset-choice-btn ${presetAvatar === p.emoji || presetAvatar === p.name ? "selected" : ""}`}
                    onClick={() => {
                      setPresetAvatar(p.emoji);
                      setAvatarType("preset");
                      setShowPresetModal(false);
                    }}
                  >
                    {animalName ? (
                      <CompanionAvatar animal={animalName} size="md" interactive />
                    ) : (
                      <span className="preset-choice-emoji">{p.emoji}</span>
                    )}
                    <span className="preset-choice-name">{p.name}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="settings-btn secondary full"
              style={{ marginTop: "16px" }}
              onClick={() => setShowPresetModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Discard Changes Modal */}
      {showDiscardModal && (
        <div className="settings-modal-overlay" onClick={() => setShowDiscardModal(false)}>
          <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-icon-alert">
              <SettingsIcon name="alertTriangle" />
            </div>
            <h3 className="settings-modal-title">Discard changes?</h3>
            <p className="settings-modal-desc">
              You have unsaved changes in your profile. Leaving now will lose any edits you made.
            </p>
            <div className="settings-modal-actions">
              <button
                type="button"
                className="settings-btn secondary"
                onClick={() => setShowDiscardModal(false)}
              >
                Keep Editing
              </button>
              <button
                type="button"
                className="settings-btn danger"
                onClick={() => {
                  setShowDiscardModal(false);
                  back();
                }}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. NEW SCREEN: APPEARANCE
// ==========================================

export interface AppearanceScreenProps {
  back: () => void;
  notify: (msg: string) => void;
}

export function AppearanceScreen({ back, notify }: AppearanceScreenProps) {
  const {
    themeId,
    setColorTheme,
    themeMode,
    setThemeMode,
    effectiveMode,
    fontSizeScale,
    setFontSizeScale,
    fontSizePercent,
    setFontScalePercent,
    chatViewMode,
    setChatViewMode,
    tokens,
  } = useTheme();

  const handleSelectMode = (mode: "light" | "dark" | "system") => {
    setThemeMode(mode);
    notify(`Switched to ${mode} mode`);
  };

  const handleSelectChatViewMode = (mode: ChatViewMode) => {
    setChatViewMode(mode);
    notify(
      mode === "companion"
        ? "Chat view set to Companion mode"
        : "Chat view set to Classic chat mode",
    );
  };

  const handleSelectPalette = (id: ThemeId) => {
    setColorTheme(id);
    const def = THEME_DEFINITIONS[id];
    notify(`Theme set to ${def.name}`);
  };

  const presetScales: { id: FontSizeScale; label: string; pct: number }[] = [
    { id: "small", label: "Small (85%)", pct: 85 },
    { id: "default", label: "Default (100%)", pct: 100 },
    { id: "large", label: "Large (115%)", pct: 115 },
    { id: "extraLarge", label: "XL (130%)", pct: 130 },
  ];

  const handlePresetScale = (scale: FontSizeScale) => {
    setFontSizeScale(scale);
    notify(`Text size set to ${scale}`);
  };

  const handleSliderChange = (newPct: number) => {
    setFontScalePercent(newPct);
  };

  return (
    <div className="settings-subpage">
      <div className="settings-page-header">
        <button type="button" className="settings-back-btn" onClick={back} aria-label="Go back">
          <SettingsIcon name="chevron" className="rotate-180" />
        </button>
        <div className="settings-page-header-title">
          <h1>Appearance</h1>
          <p>Theme mode, color palette & reading text size</p>
        </div>
      </div>

      <div className="settings-subpage-content">
        {/* Theme Mode Selector */}
        <SettingsSection title="THEME MODE">
          <div className="appearance-theme-grid">
            <button
              type="button"
              className={`theme-mode-card ${themeMode === "light" ? "active" : ""}`}
              onClick={() => handleSelectMode("light")}
            >
              <div className="theme-mode-icon-circle light">
                <SettingsIcon name="sun" />
              </div>
              <strong className="theme-mode-name">Light</strong>
              <small className="theme-mode-sub">Crisp & warm daylight</small>
              {themeMode === "light" && <div className="theme-mode-check"><SettingsIcon name="check" /></div>}
            </button>

            <button
              type="button"
              className={`theme-mode-card ${themeMode === "dark" ? "active" : ""}`}
              onClick={() => handleSelectMode("dark")}
            >
              <div className="theme-mode-icon-circle dark">
                <SettingsIcon name="moon" />
              </div>
              <strong className="theme-mode-name">Dark</strong>
              <small className="theme-mode-sub">Calm & soothing contrast</small>
              {themeMode === "dark" && <div className="theme-mode-check"><SettingsIcon name="check" /></div>}
            </button>

            <button
              type="button"
              className={`theme-mode-card ${themeMode === "system" ? "active" : ""}`}
              onClick={() => handleSelectMode("system")}
            >
              <div className="theme-mode-icon-circle system">
                <SettingsIcon name="monitor" />
              </div>
              <strong className="theme-mode-name">System</strong>
              <small className="theme-mode-sub">Matches your device ({effectiveMode})</small>
              {themeMode === "system" && <div className="theme-mode-check"><SettingsIcon name="check" /></div>}
            </button>
          </div>
        </SettingsSection>

        {/* Chat View Mode Selector */}
        <SettingsSection title="CHAT DISPLAY MODE">
          <p
            style={{
              margin: "0 0 12px 0",
              fontSize: "var(--font-body-sm, 13px)",
              color: "var(--theme-text-secondary)",
            }}
          >
            Choose how ONY appears while chatting. You can switch anytime without losing your conversation.
          </p>
          <div className="appearance-chat-mode-grid">
            <button
              type="button"
              className={`theme-mode-card ${chatViewMode === "companion" ? "active" : ""}`}
              onClick={() => handleSelectChatViewMode("companion")}
              aria-pressed={chatViewMode === "companion"}
              style={{ minHeight: "44px" }}
            >
              <div
                className="theme-mode-icon-circle"
                style={{
                  backgroundColor: "var(--theme-icon-container-bg)",
                  color: "var(--theme-primary)",
                }}
              >
                <SettingsIcon name="user" />
              </div>
              <strong className="theme-mode-name">Companion View</strong>
              <small className="theme-mode-sub">Centered plushie & speech bubble</small>
              {chatViewMode === "companion" && (
                <div className="theme-mode-check">
                  <SettingsIcon name="check" />
                </div>
              )}
            </button>

            <button
              type="button"
              className={`theme-mode-card ${chatViewMode === "classic" ? "active" : ""}`}
              onClick={() => handleSelectChatViewMode("classic")}
              aria-pressed={chatViewMode === "classic"}
              style={{ minHeight: "44px" }}
            >
              <div
                className="theme-mode-icon-circle"
                style={{
                  backgroundColor: "var(--theme-icon-container-bg)",
                  color: "var(--theme-primary)",
                }}
              >
                <SettingsIcon name="messageCircle" />
              </div>
              <strong className="theme-mode-name">Classic Chat</strong>
              <small className="theme-mode-sub">Full scrolling message thread</small>
              {chatViewMode === "classic" && (
                <div className="theme-mode-check">
                  <SettingsIcon name="check" />
                </div>
              )}
            </button>
          </div>
        </SettingsSection>

        {/* Color Palette Picker */}
        <SettingsSection title="CALMING COLOR PALETTE">
          <p style={{ margin: "0 0 12px 0", fontSize: "0.88rem", color: "var(--theme-text-secondary)" }}>
            Each palette features hand-tuned light and dark variants designed for comfort and accessibility.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "10px",
            }}
          >
            {(Object.keys(THEME_DEFINITIONS) as ThemeId[]).map((id) => {
              const def = THEME_DEFINITIONS[id];
              const isSelected = themeId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelectPalette(id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: "12px",
                    borderRadius: "14px",
                    border: isSelected ? "2px solid var(--theme-primary)" : "1.5px solid var(--theme-border)",
                    backgroundColor: isSelected ? "var(--theme-surface-elevated)" : "var(--theme-surface)",
                    boxShadow: isSelected ? "0 4px 12px var(--theme-shadow)" : "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                    position: "relative",
                  }}
                >
                  {/* Swatches preview */}
                  <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                    <span
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        backgroundColor: def.previewHex,
                        boxShadow: "var(--theme-shadow-xs)",
                      }}
                    />
                    <span
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        backgroundColor: def.accentHex,
                        boxShadow: "var(--theme-shadow-xs)",
                      }}
                    />
                  </div>
                  <strong
                    style={{
                      fontSize: "0.88rem",
                      fontWeight: 600,
                      color: "var(--theme-text-primary)",
                      lineHeight: 1.2,
                    }}
                  >
                    {def.name}
                  </strong>
                  <span
                    style={{
                      fontSize: "0.74rem",
                      color: "var(--theme-text-secondary)",
                      marginTop: "3px",
                      lineHeight: 1.2,
                    }}
                  >
                    {def.note}
                  </span>
                  {isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        backgroundColor: "var(--theme-primary)",
                        color: "var(--theme-on-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "calc(11px * var(--font-scale, 1))",
                      }}
                    >
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </SettingsSection>

        {/* Text Size Slider & Live Preview */}
        <SettingsSection title="TEXT SIZE & ACCESSIBILITY">
          <div className="text-size-slider-box">
            <div className="text-size-label-row">
              <span>Text scale factor</span>
              <strong>{fontSizePercent}% ({fontSizeScale.charAt(0).toUpperCase() + fontSizeScale.slice(1)})</strong>
            </div>

            {/* Quick preset buttons */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
              {presetScales.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetScale(p.id)}
                  style={{
                    flex: "1 1 auto",
                    padding: "8px 10px",
                    borderRadius: "10px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    border: fontSizeScale === p.id && fontSizePercent === p.pct
                      ? "1.5px solid var(--theme-primary)"
                      : "1px solid var(--theme-border)",
                    backgroundColor: fontSizeScale === p.id && fontSizePercent === p.pct
                      ? "var(--theme-primary)"
                      : "var(--theme-surface-elevated)",
                    color: fontSizeScale === p.id && fontSizePercent === p.pct
                      ? "var(--theme-on-primary)"
                      : "var(--theme-text-primary)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="slider-row">
              <span className="slider-end-label small" style={{ fontSize: "var(--font-caption, 12px)", color: "var(--theme-text-secondary)" }}>85%</span>
              <input
                type="range"
                min="85"
                max="150"
                step="5"
                value={fontSizePercent}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                className="appearance-range-slider"
                aria-label="Text size scale slider"
              />
              <span className="slider-end-label large" style={{ fontSize: "var(--font-subheading, 16px)", color: "var(--theme-text-secondary)" }}>150%</span>
            </div>

            <div className="slider-ticks" style={{ color: "var(--theme-text-secondary)" }}>
              <span>85% (Small)</span>
              <span>100% (Default)</span>
              <span>115% (Large)</span>
              <span>150% (Max)</span>
            </div>

            {/* Live Reading Preview Card */}
            <div className="text-size-live-preview-container" style={{ marginTop: "16px" }}>
              <span className="live-preview-tag" style={{ color: "var(--theme-primary)", fontWeight: 700 }}>
                LIVE READING PREVIEW
              </span>
              <div
                className="live-preview-bubble"
                style={{
                  backgroundColor: "var(--theme-surface-elevated)",
                  color: "var(--theme-text-primary)",
                  border: "1px solid var(--theme-border)",
                  borderRadius: "16px",
                  padding: "16px",
                  lineHeight: 1.5,
                  boxShadow: "0 4px 14px var(--theme-shadow)",
                  transition: "font-size 0.2s ease, background-color 0.2s ease",
                }}
              >
                <div
                  className="preview-bubble-header"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    className="preview-avatar-mini"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "var(--theme-icon-container-bg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    🐱
                  </div>
                  <div>
                    <strong style={{ display: "block", color: "var(--theme-text-primary)" }}>ONY Companion</strong>
                    <small style={{ color: "var(--theme-text-secondary)" }}>Just now</small>
                  </div>
                </div>
                <p style={{ margin: "0 0 10px 0", color: "var(--theme-text-primary)" }}>
                  "Hello! I am here with you. Take a gentle breath—we can slow down and reflect at your own pace."
                </p>
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      backgroundColor: "var(--theme-surface-soft)",
                      color: "var(--theme-text-secondary)",
                      fontSize: "0.85em",
                    }}
                  >
                    Mood: Calm & Grounded
                  </span>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      backgroundColor: "var(--theme-primary)",
                      color: "var(--theme-on-primary)",
                      fontSize: "0.85em",
                      fontWeight: 600,
                    }}
                  >
                    Take a Break
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

// ==========================================
// 4. NEW SCREEN: NOTIFICATION SETTINGS
// ==========================================

export interface NotificationSettingsScreenProps {
  back: () => void;
  notify: (msg: string) => void;
}

export function NotificationSettingsScreen({ back, notify }: NotificationSettingsScreenProps) {
  const { settings, updateSettings } = useSettings();

  const [dailyCheckinEnabled, setDailyCheckinEnabled] = useState(
    settings.notifications?.dailyCheckin ?? true
  );
  const [dailyCheckinTime, setDailyCheckinTime] = useState(
    settings.notifications?.dailyCheckinTime ?? "09:00"
  );

  const [quietHoursEnabled, setQuietHoursEnabled] = useState(
    settings.notifications?.quietHoursEnabled ?? true
  );
  const [quietStart, setQuietStart] = useState(
    settings.notifications?.quietHoursStart ?? "22:00"
  );
  const [quietEnd, setQuietEnd] = useState(
    settings.notifications?.quietHoursEnd ?? "08:00"
  );

  interface NotifCategories {
    reminders: boolean;
    community: boolean;
    marketplace: boolean;
    system: boolean;
  }

  const [categories, setCategories] = useState<NotifCategories>(
    settings.notifications?.categories ?? {
      reminders: true,
      community: true,
      marketplace: false,
      system: true,
    }
  );

  // Sync if settings load asynchronously
  useEffect(() => {
    if (settings.notifications) {
      setDailyCheckinEnabled(settings.notifications.dailyCheckin ?? settings.notifications.dailyCheckinEnabled ?? true);
      setDailyCheckinTime(settings.notifications.dailyCheckinTime || settings.notifications.reminderTime || "09:00");
      setQuietHoursEnabled(settings.notifications.quietHoursEnabled ?? true);
      setQuietStart(settings.notifications.quietHoursStart || "22:00");
      setQuietEnd(settings.notifications.quietHoursEnd || "08:00");
      if (settings.notifications.categories) {
        setCategories(settings.notifications.categories);
      }
    }
  }, [settings.notifications]);

  const handleSave = async () => {
    await updateSettings({
      notifications: {
        dailyCheckinEnabled,
        reminderTime: dailyCheckinTime,
        dailyCheckin: dailyCheckinEnabled,
        dailyCheckinTime,
        quietHoursEnabled,
        quietHoursStart: quietStart,
        quietHoursEnd: quietEnd,
        reminders: categories.reminders,
        community: categories.community,
        marketplace: categories.marketplace,
        system: categories.system,
        categories,
      },
    });

    writeSystemLog({
      level: "info",
      category: "privacy",
      action: "NOTIFICATION_SETTINGS_UPDATED",
      message: `Daily check-in: ${dailyCheckinEnabled ? dailyCheckinTime : "Off"}. Quiet hours: ${
        quietHoursEnabled ? quietStart + "-" + quietEnd : "Off"
      }.`,
    }).catch(() => {});

    notify("Notification settings saved!");
    back();
  };

  return (
    <div className="settings-subpage">
      <div className="settings-page-header">
        <button type="button" className="settings-back-btn" onClick={back} aria-label="Go back">
          <SettingsIcon name="chevron" className="rotate-180" />
        </button>
        <div className="settings-page-header-title">
          <h1>Notification Settings</h1>
          <p>Daily check-ins, quiet hours, and alerts</p>
        </div>
        <button type="button" className="settings-save-header-btn" onClick={handleSave}>
          Save
        </button>
      </div>

      <div className="settings-subpage-content">
        {/* Daily Check-in Reminder */}
        <SettingsSection title="DAILY WELLNESS CHECK-IN">
          <ThemedSwitch
            checked={dailyCheckinEnabled}
            onChange={(v) => setDailyCheckinEnabled(v)}
            label="Daily Reminder"
            description="Receive a gentle prompt to record your daily feelings"
            onStatusText="On · reminders scheduled"
            offStatusText="Off · disabled"
            ariaLabel="Daily Reminder"
          />

          {dailyCheckinEnabled && (
            <div className="settings-time-picker-row">
              <label htmlFor="daily-time-picker">Reminder Time</label>
              <input
                id="daily-time-picker"
                type="time"
                className="settings-time-input"
                value={dailyCheckinTime}
                onChange={(e) => setDailyCheckinTime(e.target.value)}
              />
            </div>
          )}
        </SettingsSection>

        {/* Quiet Hours */}
        <SettingsSection title="QUIET HOURS & SLEEP">
          <ThemedSwitch
            checked={quietHoursEnabled}
            onChange={(v) => setQuietHoursEnabled(v)}
            label="Quiet Hours"
            description="Mute non-urgent sound notifications during rest"
            onStatusText="On · quiet hours active"
            offStatusText="Off · standard alerts"
            ariaLabel="Quiet Hours"
          />

          {quietHoursEnabled && (
            <div className="settings-quiet-times-grid">
              <div className="time-block">
                <label htmlFor="quiet-start">Sleep Time (From)</label>
                <input
                  id="quiet-start"
                  type="time"
                  className="settings-time-input"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                />
              </div>
              <div className="time-block">
                <label htmlFor="quiet-end">Wake Time (Until)</label>
                <input
                  id="quiet-end"
                  type="time"
                  className="settings-time-input"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="settings-callout-info">
            <SettingsIcon name="shield" />
            <span>Emergency trusted contact alerts always bypass quiet hours for safety.</span>
          </div>
        </SettingsSection>

        {/* Categories */}
        <SettingsSection title="NOTIFICATION CATEGORIES">
          <ThemedSwitch
            checked={categories.reminders}
            onChange={(v) => setCategories((prev: NotifCategories) => ({ ...prev, reminders: v }))}
            label="Reminders & Reflections"
            description="Mindful check-ins, diary prompts, and breathing breaks"
            onStatusText="On · notifications active"
            offStatusText="Off · muted"
            ariaLabel="Reminders & Reflections"
          />

          <ThemedSwitch
            checked={categories.community}
            onChange={(v) => setCategories((prev: NotifCategories) => ({ ...prev, community: v }))}
            label="Community Interaction"
            description="When others hug or comment on your anonymous posts"
            onStatusText="On · notifications active"
            offStatusText="Off · muted"
            ariaLabel="Community Interaction"
          />

          <ThemedSwitch
            checked={categories.marketplace}
            onChange={(v) => setCategories((prev: NotifCategories) => ({ ...prev, marketplace: v }))}
            label="Marketplace & Wellness Perks"
            description="New student discounts and verified wellness vouchers"
            onStatusText="On · notifications active"
            offStatusText="Off · muted"
            ariaLabel="Marketplace & Wellness Perks"
          />

          <ThemedSwitch
            checked={categories.system}
            onChange={(v) => setCategories((prev: NotifCategories) => ({ ...prev, system: v }))}
            label="System & Security"
            description="Account safety, new versions, and trusted requests"
            onStatusText="On · notifications active"
            offStatusText="Off · muted"
            ariaLabel="System & Security"
          />
        </SettingsSection>
      </div>
    </div>
  );
}

// ==========================================
// 5. NEW SCREEN: APP LOCK
// ==========================================

export interface AppLockScreenProps {
  back: () => void;
  notify: (msg: string) => void;
}

export function AppLockScreen({ back, notify }: AppLockScreenProps) {
  const { settings, updateSettings } = useSettings();
  const activeLock = settings.appLock || settings.appLockPreferences;

  const [enabled, setEnabled] = useState(activeLock?.enabled ?? false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [hasExistingPin, setHasExistingPin] = useState(Boolean(activeLock?.pinHash));
  const [biometricEnabled, setBiometricEnabled] = useState(activeLock?.biometricEnabled ?? false);
  const [lockDelay, setLockDelay] = useState<"immediately" | "1min" | "5min">(
    activeLock?.lockDelay || activeLock?.lockAfter || "immediately",
  );

  const [isChangingPin, setIsChangingPin] = useState(!hasExistingPin);
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    const lockCfg = settings.appLock || settings.appLockPreferences;
    if (lockCfg) {
      setEnabled(lockCfg.enabled);
      setBiometricEnabled(lockCfg.biometricEnabled);
      setLockDelay(lockCfg.lockDelay || lockCfg.lockAfter || "immediately");
      if (lockCfg.pinHash) {
        setHasExistingPin(true);
      }
    }
  }, [settings.appLock, settings.appLockPreferences]);

  const isBiometricSupported =
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined";

  const handleSave = async () => {
    let nextPinHash = activeLock?.pinHash || "";

    if (enabled && isChangingPin) {
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        setPinError("PIN must be exactly 4 digits");
        return;
      }
      if (pin !== confirmPin) {
        setPinError("PINs do not match");
        return;
      }
      nextPinHash = await hashAppLockPin(pin);
    }

    if (!enabled) {
      nextPinHash = "";
    }

    await updateSettings({
      appLock: {
        enabled,
        pinHash: nextPinHash,
        biometricEnabled: enabled && biometricEnabled,
        lockAfter: lockDelay,
        lockDelay,
      },
    });

    notify(enabled ? "App Lock enabled and secured with PIN hash!" : "App Lock disabled");
    back();
  };

  return (
    <div className="settings-subpage">
      <div className="settings-page-header">
        <button type="button" className="settings-back-btn" onClick={back} aria-label="Go back">
          <SettingsIcon name="chevron" className="rotate-180" />
        </button>
        <div className="settings-page-header-title">
          <h1>App Lock & Security</h1>
          <p>Protect your private diary and companion chats</p>
        </div>
        <button type="button" className="settings-save-header-btn" onClick={handleSave}>
          Save
        </button>
      </div>

      <div className="settings-subpage-content">
        <SettingsSection title="SECURITY PROTECTION">
          <ThemedSwitch
            checked={enabled}
            onChange={(v) => {
              setEnabled(v);
              if (v && !hasExistingPin) setIsChangingPin(true);
            }}
            label="Enable App Lock"
            description="Require passcode or biometric verification to unlock ONY"
            onStatusText="On · passcode protection active"
            offStatusText="Off · unlocked"
            ariaLabel="Enable App Lock"
          />
        </SettingsSection>

        {enabled && (
          <>
            <SettingsSection title="PASSCODE PIN">
              {!isChangingPin ? (
                <div className="settings-row-static">
                  <div>
                    <strong>4-Digit Passcode Active (SHA-256 Secured)</strong>
                    <small>•••• (Cryptographically hashed)</small>
                  </div>
                  <button
                    type="button"
                    className="settings-small-link-btn"
                    onClick={() => {
                      setIsChangingPin(true);
                      setPin("");
                      setConfirmPin("");
                    }}
                  >
                    Change PIN
                  </button>
                </div>
              ) : (
                <div className="pin-setup-box">
                  <div className="form-field-group">
                    <label className="form-field-label">Enter 4-Digit PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      className="settings-text-input pin-input"
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                        setPinError("");
                      }}
                      placeholder="••••"
                    />
                  </div>

                  <div className="form-field-group">
                    <label className="form-field-label">Confirm 4-Digit PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      className="settings-text-input pin-input"
                      value={confirmPin}
                      onChange={(e) => {
                        setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                        setPinError("");
                      }}
                      placeholder="••••"
                    />
                  </div>

                  {pinError && <p className="form-field-error-text">{pinError}</p>}
                </div>
              )}
            </SettingsSection>

            {isBiometricSupported && (
              <SettingsSection title="BIOMETRIC UNLOCK">
                <ThemedSwitch
                  checked={biometricEnabled}
                  onChange={(v) => setBiometricEnabled(v)}
                  label="Biometric Authentication"
                  description="Unlock with Face ID, Touch ID, or fingerprint"
                  onStatusText="On · biometric unlock enabled"
                  offStatusText="Off · passcode only"
                  ariaLabel="Biometric Authentication"
                />
              </SettingsSection>
            )}

            <SettingsSection title="LOCK TIMEOUT DELAY">
              <div className="radio-group-card">
                {[
                  { id: "immediately", label: "Immediately", sub: "Lock whenever switching apps" },
                  { id: "1min", label: "After 1 minute", sub: "Brief grace period" },
                  { id: "5min", label: "After 5 minutes", sub: "Extended grace period" },
                ].map((item) => (
                  <label key={item.id} className="settings-radio-row">
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.sub}</small>
                    </div>
                    <input
                      type="radio"
                      name="lockDelay"
                      value={item.id}
                      checked={lockDelay === item.id}
                      onChange={() => setLockDelay(item.id as "immediately" | "1min" | "5min")}
                    />
                  </label>
                ))}
              </div>
            </SettingsSection>
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 6. NEW SCREEN: SOUND & HAPTICS
// ==========================================

export interface SoundHapticsScreenProps {
  back: () => void;
  notify: (msg: string) => void;
  onOpenAmbientModal?: () => void;
}

export function SoundHapticsScreen({ back, notify, onOpenAmbientModal }: SoundHapticsScreenProps) {
  const { settings, updateSettings } = useSettings();
  const activeSound = settings.soundHaptics || settings.soundHapticsPreferences;

  const [sounds, setSounds] = useState(activeSound?.soundsEnabled ?? true);
  const [haptics, setHaptics] = useState(activeSound?.hapticsEnabled ?? true);
  const [volume, setVolume] = useState(activeSound?.voiceVolume ?? 80);

  useEffect(() => {
    const soundCfg = settings.soundHaptics || settings.soundHapticsPreferences;
    if (soundCfg) {
      setSounds(soundCfg.soundsEnabled);
      setHaptics(soundCfg.hapticsEnabled);
      setVolume(soundCfg.voiceVolume);
    }
  }, [settings.soundHaptics, settings.soundHapticsPreferences]);

  const handleSave = async () => {
    await updateSettings({
      soundHaptics: {
        soundsEnabled: sounds,
        hapticsEnabled: haptics,
        voiceVolume: volume,
      },
    });

    notify("Sound & haptic preferences saved");
    back();
  };

  const testHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([35]);
      notify("Haptic vibration pulse triggered!");
    } else {
      notify("Haptics not supported by this browser / hardware");
    }
  };

  return (
    <div className="settings-subpage">
      <div className="settings-page-header">
        <button type="button" className="settings-back-btn" onClick={back} aria-label="Go back">
          <SettingsIcon name="chevron" className="rotate-180" />
        </button>
        <div className="settings-page-header-title">
          <h1>Sound & Haptics</h1>
          <p>Audio cues, tactile feedback, and voice volume</p>
        </div>
        <button type="button" className="settings-save-header-btn" onClick={handleSave}>
          Save
        </button>
      </div>

      <div className="settings-subpage-content">
        <SettingsSection title="TACTILE & AUDIO FEEDBACK">
          <ThemedSwitch
            checked={sounds}
            onChange={(v) => setSounds(v)}
            label="Sound Effects"
            description="Calming chime when completing check-ins or saving journal notes"
            onStatusText="On · sound enabled"
            offStatusText="Off · muted"
            ariaLabel="Sound Effects"
          />

          <ThemedSwitch
            checked={haptics}
            onChange={(v) => setHaptics(v)}
            label="Haptic Vibration"
            description="Gentle tactile vibration when tapping key buttons"
            onStatusText="On · vibration enabled"
            offStatusText="Off · disabled"
            ariaLabel="Haptic Vibration"
          />

          <div className="settings-row-static">
            <div>
              <strong>Test Vibration</strong>
              <small>Verify device haptic motor</small>
            </div>
            <button type="button" className="settings-small-link-btn" onClick={testHaptic}>
              Vibrate Now
            </button>
          </div>
        </SettingsSection>

        <SettingsSection title="ONY VOICE OUTPUT VOLUME">
          <div className="voice-volume-box">
            <div className="volume-label-row">
              <SettingsIcon name="volume" />
              <span>Voice Volume Level</span>
              <strong>{volume}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="appearance-range-slider"
              aria-label="ONY speech volume slider"
            />
            <small className="form-field-hint">
              Controls the read-aloud playback volume for ONY responses and audio reflections.
            </small>
          </div>
        </SettingsSection>

        {onOpenAmbientModal && (
          <SettingsSection title="CALMING AMBIENT MUSIC">
            <SettingsRow
              icon="volume"
              title="Ambient Soundscapes Player"
              subtitle="Listen to rain, gentle stream, lo-fi café, or Tibetan singing bowls"
              onClick={onOpenAmbientModal}
            />
          </SettingsSection>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 7. NEW SCREEN: CHANGE PASSWORD
// ==========================================

export interface ChangePasswordScreenProps {
  back: () => void;
  notify: (msg: string) => void;
  userEmail?: string;
}

export function ChangePasswordScreen({ back, notify, userEmail }: ChangePasswordScreenProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [error, setError] = useState("");

  const hasPasswordProvider =
    auth.currentUser?.providerData.some((p) => p.providerId === "password") ?? true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!hasPasswordProvider) {
      setError("Your account uses Google sign-in. Manage your password through your Google account.");
      return;
    }
    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await changeUserPassword(currentPassword, newPassword);
      writeSystemLog({
        level: "info",
        category: "auth",
        action: "PASSWORD_CHANGED",
        message: "User updated account password.",
      }).catch(() => {});
      notify("Password updated successfully!");
      back();
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Current password is incorrect.");
      } else if (code === "auth/weak-password") {
        setError("New password is too weak. Use at least 6 characters.");
      } else if (code === "auth/requires-recent-login") {
        setError("Please sign out and sign back in before changing your password.");
      } else {
        setError(err?.message || "Could not update password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    const email = userEmail || auth.currentUser?.email;
    if (!email) {
      notify("No email address associated with this account.");
      return;
    }
    setResetSending(true);
    try {
      await sendPasswordReset(email);
      notify(`Password reset email sent to ${email}`);
    } catch (err: any) {
      notify(err?.message || "Could not send password reset email.");
    } finally {
      setResetSending(false);
    }
  };

  return (
    <div className="settings-subpage">
      <div className="settings-page-header">
        <button type="button" className="settings-back-btn" onClick={back} aria-label="Go back">
          <SettingsIcon name="chevron" className="rotate-180" />
        </button>
        <div className="settings-page-header-title">
          <h1>Change Password</h1>
          <p>Update your account access credentials</p>
        </div>
      </div>

      <div className="settings-subpage-content">
        <form onSubmit={handleSubmit} className="edit-profile-form-card">
          {error && <div className="settings-alert danger">{error}</div>}

          <div className="form-field-group">
            <label className="form-field-label">Current Password</label>
            <div className="input-with-eye">
              <input
                type={showCurrent ? "text" : "password"}
                className="settings-text-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={!hasPasswordProvider}
              />
              <button
                type="button"
                className="eye-toggle-btn"
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label="Toggle password visibility"
              >
                <SettingsIcon name={showCurrent ? "eyeOff" : "eye"} />
              </button>
            </div>
          </div>

          <div className="form-field-group">
            <label className="form-field-label">New Password (min 6 characters)</label>
            <div className="input-with-eye">
              <input
                type={showNew ? "text" : "password"}
                className="settings-text-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={!hasPasswordProvider}
              />
              <button
                type="button"
                className="eye-toggle-btn"
                onClick={() => setShowNew(!showNew)}
                aria-label="Toggle password visibility"
              >
                <SettingsIcon name={showNew ? "eyeOff" : "eye"} />
              </button>
            </div>
          </div>

          <div className="form-field-group">
            <label className="form-field-label">Confirm New Password</label>
            <input
              type="password"
              className="settings-text-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              disabled={!hasPasswordProvider}
            />
          </div>

          {userEmail && (
            <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <p className="form-field-hint" style={{ margin: 0 }}>
                Registered for {userEmail}. Forgot your current password?
              </p>
              <button
                type="button"
                className="settings-small-link-btn"
                onClick={() => void handleSendResetEmail()}
                disabled={resetSending}
                style={{ alignSelf: "flex-start" }}
              >
                {resetSending ? "Sending reset email..." : "Send password reset email"}
              </button>
            </div>
          )}

          <button
            type="submit"
            className="settings-btn primary full"
            style={{ marginTop: "16px" }}
            disabled={loading || !hasPasswordProvider}
          >
            {loading ? "Updating Password..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 8. NEW SCREEN: CONNECTED ACCOUNTS
// ==========================================

export interface ConnectedAccountsScreenProps {
  back: () => void;
  notify: (msg: string) => void;
  userEmail?: string;
  currentUser?: User | null;
}

export function ConnectedAccountsScreen({
  back,
  notify,
  userEmail,
  currentUser,
}: ConnectedAccountsScreenProps) {
  const [providerTick, setProviderTick] = useState(0);
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  void providerTick;
  const activeUser = auth.currentUser || currentUser || null;
  const providers = activeUser?.providerData || [];
  const isPasswordLinked = providers.some((p) => p.providerId === "password");
  const isGoogleLinked = providers.some((p) => p.providerId === "google.com");

  const handleToggleGoogle = async () => {
    setLinkingGoogle(true);
    try {
      if (isGoogleLinked) {
        await unlinkGoogleProvider();
        notify("Google account disconnected");
      } else {
        await linkGoogleProvider();
        notify("Google account connected!");
      }
      setProviderTick((n) => n + 1);
    } catch (err: any) {
      notify(err?.message || "Could not update Google connection.");
    } finally {
      setLinkingGoogle(false);
    }
  };

  return (
    <div className="settings-subpage">
      <div className="settings-page-header">
        <button type="button" className="settings-back-btn" onClick={back} aria-label="Go back">
          <SettingsIcon name="chevron" className="rotate-180" />
        </button>
        <div className="settings-page-header-title">
          <h1>Connected Accounts</h1>
          <p>Sign-in methods linked to your ONY account</p>
        </div>
      </div>

      <div className="settings-subpage-content">
        <SettingsSection title="ACTIVE SIGN-IN METHODS">
          {/* Email / Password */}
          <div className="connected-account-row">
            <div className="account-icon-badge mail">
              <SettingsIcon name="fileText" />
            </div>
            <div className="account-meta">
              <strong>Email & Password</strong>
              <small>{userEmail || activeUser?.email || "Not registered"}</small>
            </div>
            <span className={`account-status-badge ${isPasswordLinked ? "connected" : ""}`}>
              {isPasswordLinked ? "Connected" : "Not set"}
            </span>
          </div>

          {/* Google */}
          <div className="connected-account-row">
            <div className="account-icon-badge google">
              <span style={{ fontWeight: 800 }}>G</span>
            </div>
            <div className="account-meta">
              <strong>Google Account</strong>
              <small>{isGoogleLinked ? "Sign in with Google active" : "Not connected"}</small>
            </div>
            {isGoogleLinked ? (
              providers.length > 1 ? (
                <button
                  type="button"
                  className="settings-small-link-btn"
                  onClick={() => void handleToggleGoogle()}
                  disabled={linkingGoogle}
                >
                  {linkingGoogle ? "Updating..." : "Disconnect"}
                </button>
              ) : (
                <span className="account-status-badge connected">Connected</span>
              )
            ) : (
              <button
                type="button"
                className="settings-small-link-btn"
                onClick={() => void handleToggleGoogle()}
                disabled={linkingGoogle}
              >
                {linkingGoogle ? "Connecting..." : "Connect"}
              </button>
            )}
          </div>
        </SettingsSection>

        <div className="settings-callout-info" style={{ marginTop: "16px" }}>
          <SettingsIcon name="shield" />
          <span>
            Connected accounts allow you to sign in across devices while keeping your private Firestore journal and conversations synced.
          </span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 9. NEW SCREEN: DELETE ACCOUNT
// ==========================================

export interface DeleteAccountScreenProps {
  back: () => void;
  onConfirmDelete: (reauthPassword?: string) => Promise<void> | void;
  currentUser?: User | null;
  notify: (msg: string) => void;
}

export function DeleteAccountScreen({
  back,
  onConfirmDelete,
  currentUser,
  notify,
}: DeleteAccountScreenProps) {
  const [typedConfirm, setTypedConfirm] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const activeUser = auth.currentUser || currentUser || null;
  const hasPasswordProvider =
    activeUser?.providerData.some((p) => p.providerId === "password") ?? false;

  const canProceed = typedConfirm.trim().toUpperCase() === "DELETE";

  const executeDelete = async () => {
    setDeleteError("");
    setIsDeleting(true);
    try {
      await onConfirmDelete(hasPasswordProvider ? reauthPassword || undefined : undefined);
      setShowFinalModal(false);
    } catch (err: any) {
      const code = err?.code || "";
      const msg =
        code === "auth/requires-recent-login"
          ? hasPasswordProvider
            ? "For security, please enter your account password to confirm deletion."
            : "Please confirm re-authentication in the popup window to delete your account."
          : err?.message || "Could not delete account right now.";
      setDeleteError(msg);
      notify(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="settings-subpage">
      <div className="settings-page-header">
        <button type="button" className="settings-back-btn" onClick={back} aria-label="Go back">
          <SettingsIcon name="chevron" className="rotate-180" />
        </button>
        <div className="settings-page-header-title">
          <h1 className="text-danger">Delete Account</h1>
          <p>Irreversible and permanent removal</p>
        </div>
      </div>

      <div className="settings-subpage-content">
        <div className="settings-danger-card">
          <div className="danger-header">
            <SettingsIcon name="alertTriangle" />
            <h3>Warning: This action cannot be undone</h3>
          </div>
          <p>
            Deleting your account will immediately and permanently erase all personal wellness records stored with ONY:
          </p>
          <ul className="danger-list">
            <li>All personal journal entries, photos, and private diary reflections</li>
            <li>All daily mood logs and weekly emotional trend reports</li>
            <li>All saved chatbot conversational memories and AI context vaults</li>
            <li>All community light messages, anonymous posts, and hugs</li>
            <li>All claimed wellness vouchers and partner digital passes</li>
          </ul>
        </div>

        <div className="edit-profile-form-card" style={{ marginTop: "16px" }}>
          <label className="form-field-label">
            To confirm deletion, type <strong>DELETE</strong> below:
          </label>
          <input
            type="text"
            className="settings-text-input danger-border"
            value={typedConfirm}
            onChange={(e) => setTypedConfirm(e.target.value)}
            placeholder='Type "DELETE"'
            autoCapitalize="characters"
          />

          <button
            type="button"
            className="settings-btn danger full"
            style={{ marginTop: "16px" }}
            disabled={!canProceed || isDeleting}
            onClick={() => {
              setDeleteError("");
              setShowFinalModal(true);
            }}
          >
            {isDeleting ? "Erasing Data..." : "Permanently Delete My Account"}
          </button>
        </div>
      </div>

      {showFinalModal && (
        <div className="settings-modal-overlay" onClick={() => !isDeleting && setShowFinalModal(false)}>
          <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-icon-alert">
              <SettingsIcon name="trash" />
            </div>
            <h3 className="settings-modal-title">Final Confirmation</h3>
            <p className="settings-modal-desc">
              Are you completely certain? Your account, private diary, and emotional history will be permanently erased right now.
            </p>
            {hasPasswordProvider && (
              <div className="form-field-group" style={{ textAlign: "left", marginBottom: "12px" }}>
                <label className="form-field-label">Confirm Password (if required)</label>
                <input
                  type="password"
                  className="settings-text-input"
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isDeleting}
                />
              </div>
            )}
            {deleteError && <div className="settings-alert danger">{deleteError}</div>}
            <div className="settings-modal-actions">
              <button
                type="button"
                className="settings-btn secondary"
                onClick={() => setShowFinalModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="settings-btn danger"
                onClick={() => void executeDelete()}
                disabled={isDeleting}
              >
                {isDeleting ? "Erasing..." : "Yes, Delete Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 10. NEW SCREEN: EXPORT MY DATA
// ==========================================

export interface ExportDataScreenProps {
  back: () => void;
  notify: (msg: string) => void;
  currentUser?: User | null;
  displayName: string;
}

export function ExportDataScreen({ back, notify, currentUser }: ExportDataScreenProps) {
  const [status, setStatus] = useState<"idle" | "preparing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleExport = async () => {
    const uid = currentUser?.uid || auth.currentUser?.uid || "";
    if (!uid) {
      notify("Please sign in to export your account archive.");
      return;
    }

    setStatus("preparing");
    setErrorMsg("");
    try {
      const exportObject = await exportUserData(uid);
      const jsonStr = JSON.stringify(exportObject, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ony-wellness-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus("done");
      notify("Data export downloaded successfully!");
      writeSystemLog({
        level: "info",
        category: "privacy",
        action: "DATA_EXPORT_DOWNLOADED",
        message: "User generated and downloaded Firestore privacy archive.",
      }).catch(() => {});
    } catch (err: any) {
      setStatus("error");
      const msg = err?.message || "Could not export user data.";
      setErrorMsg(msg);
      notify(msg);
    }
  };

  return (
    <div className="settings-subpage">
      <div className="settings-page-header">
        <button type="button" className="settings-back-btn" onClick={back} aria-label="Go back">
          <SettingsIcon name="chevron" className="rotate-180" />
        </button>
        <div className="settings-page-header-title">
          <h1>Export My Data</h1>
          <p>Download your complete wellness history</p>
        </div>
      </div>

      <div className="settings-subpage-content">
        <div className="settings-section-card" style={{ padding: "18px" }}>
          <div className="settings-header-icon-box" style={{ margin: "0 auto 12px" }}>
            <SettingsIcon name="download" />
          </div>
          <h3 style={{ textAlign: "center", margin: "0 0 6px" }}>Download Personal Wellness Archive</h3>
          <p style={{ textAlign: "center", color: "var(--theme-text-secondary)", fontSize: "var(--font-caption, 12px)", margin: "0 0 16px" }}>
            ONY respects your digital sovereignty. Download a complete JSON archive directly from your Firestore account records.
          </p>

          <ul className="settings-bullet-list">
            <li>Profile metadata, settings & preferences</li>
            <li>Daily mood check-ins & AI companion conversations</li>
            <li>Digital journal shelves, books, entries & photo links</li>
            <li>Voucher claims, toolkit completions & community posts</li>
          </ul>

          {errorMsg && (
            <div className="settings-alert danger" style={{ marginTop: "12px" }}>
              {errorMsg}
            </div>
          )}

          <div style={{ marginTop: "20px" }}>
            {(status === "idle" || status === "error") && (
              <button
                type="button"
                className="settings-btn primary full"
                onClick={() => void handleExport()}
              >
                Request & Download Data
              </button>
            )}

            {status === "preparing" && (
              <button type="button" className="settings-btn secondary full" disabled>
                Fetching Firestore archive...
              </button>
            )}

            {status === "done" && (
              <div className="settings-alert success" style={{ textAlign: "center" }}>
                <span>✓ Archive downloaded to your device!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 11. NEW SCREEN: FEEDBACK & REPORT
// ==========================================

export interface FeedbackReportScreenProps {
  type: "feedback" | "report";
  back: () => void;
  notify: (msg: string) => void;
  userEmail?: string;
  currentUid?: string;
}

export function FeedbackReportScreen({
  type,
  back,
  notify,
  userEmail,
  currentUid,
}: FeedbackReportScreenProps) {
  const isFeedback = type === "feedback";
  const [category, setCategory] = useState(isFeedback ? "General Experience" : "Bug or Glitch");
  const [message, setMessage] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const feedbackCategories = [
    "General Experience",
    "Chatbot / Companion",
    "Digital Journal & Diary",
    "Community Lights",
    "Design & Usability",
    "Other Thoughts",
  ];

  const reportCategories = [
    "Bug or Glitch",
    "Audio / Music Issue",
    "Sync or Login Problem",
    "Visual / Layout Defect",
    "Crash or Unresponsive",
    "Other Issue",
  ];

  const handleScreenshot = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Please select an image file.");
      return;
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const objUrl = URL.createObjectURL(file);
    previewUrlRef.current = objUrl;
    setScreenshotFile(file);
    setScreenshotUrl(objUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      notify("Please enter a short message describing your input.");
      return;
    }
    const uid = (currentUid || auth.currentUser?.uid || "").trim();
    if (!uid) {
      notify("Please sign in to submit feedback or problem reports.");
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedScreenshotUrl: string | undefined;
      if (screenshotFile) {
        const uploaded = await uploadUserMedia(uid, "feedback", screenshotFile, {
          maxDimension: 1280,
        });
        uploadedScreenshotUrl = uploaded.url;
      }

      await submitFeedbackReport({
        userId: uid,
        category: `${isFeedback ? "Feedback" : "Bug"}: ${category}`,
        description: message.trim(),
        screenshotUrl: uploadedScreenshotUrl,
      });

      writeSystemLog({
        level: "info",
        category: "user_action",
        action: isFeedback ? "USER_FEEDBACK_SUBMITTED" : "USER_BUG_REPORTED",
        message: `[${category}] ${message.trim().slice(0, 120)}`,
        metadata: { category, hasScreenshot: Boolean(uploadedScreenshotUrl), userEmail },
      }).catch(() => {});

      notify(
        isFeedback
          ? "Thank you! Your feedback has been saved."
          : "Thank you for reporting. Your ticket has been recorded.",
      );
      back();
    } catch (err: any) {
      notify(err?.message || "Could not submit your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="settings-subpage">
      <div className="settings-page-header">
        <button type="button" className="settings-back-btn" onClick={back} aria-label="Go back">
          <SettingsIcon name="chevron" className="rotate-180" />
        </button>
        <div className="settings-page-header-title">
          <h1>{isFeedback ? "Send Feedback" : "Report a Problem"}</h1>
          <p>{isFeedback ? "Share ideas or reflections" : "Let us know if something isn't working"}</p>
        </div>
      </div>

      <div className="settings-subpage-content">
        <form onSubmit={handleSubmit} className="edit-profile-form-card">
          <div className="form-field-group">
            <label className="form-field-label">Category</label>
            <select
              className="settings-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {(isFeedback ? feedbackCategories : reportCategories).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field-group">
            <div className="label-with-counter">
              <label className="form-field-label">Message</label>
              <span className="char-counter">{message.length}/500</span>
            </div>
            <textarea
              className="settings-textarea"
              rows={4}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isFeedback
                  ? "Tell us what you enjoy about ONY or what would make your experience even better..."
                  : "Please describe what went wrong, what steps led to it, or what you expected to see..."
              }
              required
            />
          </div>

          <div className="form-field-group">
            <label className="form-field-label">Optional Screenshot</label>
            {screenshotUrl ? (
              <div className="screenshot-preview-box">
                <img src={screenshotUrl} alt="Attached screenshot" />
                <button
                  type="button"
                  className="remove-screenshot-btn"
                  onClick={() => {
                    setScreenshotUrl(null);
                    setScreenshotFile(null);
                  }}
                >
                  <SettingsIcon name="trash" /> Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="edit-avatar-chip-btn full"
                onClick={() => fileRef.current?.click()}
              >
                <SettingsIcon name="camera" />
                <span>Attach Screenshot</span>
              </button>
            )}
            <input
              type="file"
              ref={fileRef}
              style={{ display: "none" }}
              accept="image/*"
              onChange={handleScreenshot}
            />
          </div>

          <button
            type="submit"
            className="settings-btn primary full"
            disabled={isSubmitting || !message.trim()}
            style={{ marginTop: "12px" }}
          >
            {isSubmitting ? "Sending..." : isFeedback ? "Submit Feedback" : "Submit Report"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 12. NEW SCREEN: TERMS & PRIVACY POLICY
// ==========================================

export function TermsScreen({ back }: { back: () => void }) {
  return (
    <div className="settings-subpage">
      <div className="settings-page-header">
        <button type="button" className="settings-back-btn" onClick={back} aria-label="Go back">
          <SettingsIcon name="chevron" className="rotate-180" />
        </button>
        <div className="settings-page-header-title">
          <h1>Terms of Service</h1>
          <p>Usage agreement and platform guidelines</p>
        </div>
      </div>

      <div className="settings-subpage-content">
        <div className="legal-article-card">
          <h2>1. Purpose of the Platform</h2>
          <p>
            ONY is an emotional wellness companion designed to support young adults in Malaysia through reflective conversational check-ins, personal diary logging, and peer encouragement. ONY is <strong>not</strong> a medical device or psychiatric healthcare provider.
          </p>

          <h2>2. Non-Emergency Notice</h2>
          <p>
            If you or someone you know is in acute danger, facing suicidal thoughts, or in need of immediate intervention, please contact local 24/7 crisis hotlines such as <strong>Befrienders KL (03-7627 2929)</strong> or <strong>Talian Kasih (15999)</strong> immediately.
          </p>

          <h2>3. Community Standards</h2>
          <p>
            All community reflections and light interactions must adhere to gentle kindness, mutual respect, and zero tolerance for harassment, doxxing, self-harm promotion, or hate speech.
          </p>

          <h2>4. Intellectual Property & License</h2>
          <p>
            Your private journal entries and mood reflections remain your exclusive personal property. ONY does not sell user data.
          </p>
        </div>
      </div>
    </div>
  );
}

export function PrivacyPolicyScreen({ back }: { back: () => void }) {
  return (
    <div className="settings-subpage">
      <div className="settings-page-header">
        <button type="button" className="settings-back-btn" onClick={back} aria-label="Go back">
          <SettingsIcon name="chevron" className="rotate-180" />
        </button>
        <div className="settings-page-header-title">
          <h1>Privacy Policy</h1>
          <p>Malaysian PDPA & user data security</p>
        </div>
      </div>

      <div className="settings-subpage-content">
        <div className="legal-article-card">
          <h2>1. Data Protection Commitment</h2>
          <p>
            ONY adheres to the Malaysian Personal Data Protection Act (PDPA 2010). We treat your emotional check-ins, journal diary entries, and companion conversations with strict confidentiality and end-to-end security.
          </p>

          <h2>2. What We Collect</h2>
          <p>
            We collect the display name and email you choose to provide, your selected companion persona preferences, and your private diary entries stored within your isolated user subcollection.
          </p>

          <h2>3. Zero Data Brokering</h2>
          <p>
            ONY does <strong>not</strong> sell, rent, or trade your emotional history, journal reflections, or check-in trends to advertisers or data brokers.
          </p>

          <h2>4. Your Rights: Access & Deletion</h2>
          <p>
            You have the absolute right to export your data archive or request complete account erasure at any time via the Settings page.
          </p>
        </div>
      </div>
    </div>
  );
}
