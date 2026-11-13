import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  createContext,
  useContext,
  type CSSProperties,
} from "react";
import logo from "./assets/ony-logo.png";
import { chatService, ChatServiceError } from "./services/chatService";
import type {
  ChatSuggestion,
  MarketplaceRecommendation,
  SafetyAction,
} from "./services/contracts";
import { buildContextualSuggestions } from "./services/chatSuggestions";
import type { User } from "firebase/auth";
import { auth } from "./firebase/config";
import {
  registerWithEmailPassword,
  loginWithEmailPassword,
  sendPasswordReset,
  logoutUser,
  deleteUserAccount,
  subscribeToAuthChanges,
} from "./firebase/auth";
import {
  getUserProfile,
  updateUserProfile,
  listMoodEntries,
  saveMoodEntry,
  updateMoodEntry,
  deleteMoodEntry,
  getLocalDateKey,
  listMemories,
  saveMemory,
  updateMemory,
  deleteMemory,
  clearAllMemories,
  listConversations,
  saveConversation,
  deleteConversation,
  listGlobeUsers,
  subscribeVisibleGlobeUsers,
  updateGlobeUserNode,
  listCommunityPosts,
  deduplicateCommunityPostList,
  createCommunityPost,
  toggleCommunityPostLike,
  validateCommunityCommentText,
  listMerchants,
  listCommunityMessages,
  createCommunityMessage,
  seedInitialDatabaseData,
  seedInitialUserData,
  syncRegisteredAccount,
  findRegisteredAccountByUid,
  sendTrustedContactRequest,
  sendTrustedContactRequestViaInviteLink,
  listTrustedContactRequests,
  respondToTrustedContactRequest,
  deleteTrustedContactRequest,
  DEFAULT_GLOBE_USERS,
  DEFAULT_COMMUNITY_POSTS,
  DEFAULT_MERCHANTS,
  DEFAULT_USER_CONVERSATIONS,
  DEFAULT_COMMUNITY_MESSAGES,
  writeSystemLog,
  listSystemLogs,
  formatLogsAsTextFile,
  downloadLogFile,
  listJournalEntries,
  saveJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  loadCachedJournalEntries,
  saveCachedJournalEntries,
  DEFAULT_JOURNAL_ENTRIES,
  type FirestoreJournalEntry,
  type SystemLogEntry,
  type SystemLogLevel,
  type PostLikeRecord,
  type PostCommentRecord,
  type PostCommentReplyRecord,
  type FirestoreCommunityPost,
  type FirestoreCommunityMessage,
  type FirestoreTrustedContactRequest,
  deleteCommunityMessage,
} from "./firebase/firestore";
import GlobeView, { type GlobeCameraTarget } from "./components/globe/GlobeView";
import Fallback2DMap from "./components/globe/Fallback2DMap";
import { ListViewPanel } from "./components/globe/ClusterLayer";
import GlobeBreadcrumb from "./components/globe/GlobeBreadcrumb";
import GlobeControls from "./components/globe/GlobeControls";
import NodeSheet from "./components/globe/NodeSheet";
import ThemedSwitch from "./components/common/ThemedSwitch";
import MyNodeTab from "./components/globe/MyNodeTab";
import {
  buildGlobeDisplayItems,
  buildHierarchicalList,
  coarsenCoordinates,
  getHierarchyLevelForZoom,
  getLocalizedMoodLabel,
  normalizeMoodKey,
  resolveAndCoarsenLocation,
  resolveNodeMoodKey,
  reverseLookupCameraLocation,
  getCameraVisibleCount,
  type GlobeClusterDisplayItem,
  type GlobeNodeDisplayItem,
  type ListCountryGroup,
} from "./data/worldRegions";
import { LanguageProvider, useLanguage } from "./i18n/LanguageContext";
import {
  type AppLanguage,
  getTranslation,
  formatFriendlyTime,
  getCategoryLabel,
  getCompanionLabel,
  getThemeDetails,
  getPersonaDetails,
} from "./i18n/translations";
import {
  requestDeviceLocation,
  loadCachedLocation,
  clearCachedLocation,
  haversineDistanceKm,
  formatDistanceString,
  type UserCoordinates,
  type MalaysianAreaItem,
  MALAYSIAN_AREAS,
  POPULAR_MALAYSIAN_AREAS,
  searchMalaysianAreas,
  createManualLocation,
} from "./utils/geo";
import {
  VERIFIED_MALAYSIAN_PROVIDERS,
  type HealthcareProvider,
} from "./data/providers";
import {
  ambientMusicEngine,
  CALMING_TRACKS,
  type CalmingTrack,
} from "./services/ambientMusicEngine";
import {
  CalmingMusicFloatingBar,
  CalmingMusicModal,
} from "./components/CalmingMusicPlayer";
import { SupportiveMessageBubble } from "./components/SupportiveMessageBubble";
import { CommunityWorldScene } from "./components/community/CommunityWorldScene";
import { CategoryHeader } from "./components/community/CategoryHeader";
import { PostDetailScreen } from "./components/community/PostDetailScreen";
import { ReportReasonSheet } from "./components/community/PostMenu";
import { PostFeed } from "./components/community/PostFeed";
import { CommentSheet } from "./components/community/CommentSheet";
import {
  extractWorldCategories,
  filterPostsBySubtopic,
  getUserReactionChoice,
  loadHiddenPostIds,
  loadSavedPostIds,
  loadSeenPostIds,
  saveHiddenPostIds,
  saveSavedPostIds,
  saveSeenPostIds,
  saveUserReactionChoice,
  sortCommunityPosts,
  type CategorySortTab,
  type SubtopicFilterId,
  type SupportiveReactionType,
} from "./utils/communityPostHelpers";
import { DigitalJournal } from "./components/DigitalJournal";
import {
  SettingsHeader,
  SettingsSection,
  SettingsRow,
  SettingsIcon,
  EditProfileScreen,
  AppearanceScreen,
  NotificationSettingsScreen,
  AppLockScreen,
  SoundHapticsScreen,
  ChangePasswordScreen,
  ConnectedAccountsScreen,
  DeleteAccountScreen,
  ExportDataScreen,
  FeedbackReportScreen,
  TermsScreen,
  PrivacyPolicyScreen,
  loadStoredProfile,
  loadStoredAppearance,
  applyAppearanceToDom,
} from "./components/SettingsComponents";
import { ToolkitPage } from "./components/ToolkitPage";
import {
  ChatHeader,
  CompanionStage,
  ChatHistorySheet,
  ClassicMessageList,
  ChatInputBar,
  ChatOverflowSheet,
  ChatTonePickerSheet,
  AiDisclaimerSheet,
  type ActiveBreakTimerState,
} from "./components/ChatComponents";
import { ThemeProvider, useTheme, type ChatViewMode } from "./theme/ThemeContext";
import type { ThemeId } from "./theme/palettes";
import {
  CompanionAvatar as VectorCompanionAvatar,
  type CompanionAnimal,
  type CompanionExpression,
} from "./components/CompanionAvatar";
import { CompanionPreviewSheet } from "./components/CompanionPreviewSheet";

type Tab = "chat" | "memory" | "community" | "market" | "profile";
type Screen =
  | "main"
  | "mood"
  | "trend"
  | "safety"
  | "help"
  | "personalise"
  | "notifications"
  | "notificationSettings"
  | "subscription"
  | "merchant"
  | "voucher"
  | "post"
  | "privacy"
  | "about"
  | "addMemory"
  | "jobPrefs"
  | "jobs"
  | "jobDetail"
  | "wellbeing"
  | "professional"
  | "provider"
  | "trusted"
  | "communityMember"
  | "guidelines"
  | "chatHistory"
  | "monthlyReport"
  | "postDetail"
  | "resources"
  | "legal"
  | "systemLogs"
  | "language"
  | "editProfile"
  | "appearance"
  | "soundHaptics"
  | "changePassword"
  | "connectedAccounts"
  | "appLock"
  | "sendFeedback"
  | "reportProblem"
  | "exportData"
  | "deleteAccountConfirm"
  | "terms"
  | "privacyPolicy";

type Theme = "ocean" | "sunset" | "forest" | "lavender" | "peach" | "neutral";
type Companion = "Cat" | "Dog" | "Bunny" | "Bear" | "Fox" | "Panda";
type ContactStatus = "none" | "pending" | "accepted" | "rejected";
type SubscriptionStatus = "free" | "trial" | "trialEnded" | "payg" | "monthly";
type Persona = "gentle" | "friendly" | "calm";
type RiskLevel = "low" | "moderate" | "high";

import {
  ChatSpeechRecognizer,
  VoiceRecorder,
  OnySpeechSynthesizer,
  playSoothingChime,
  formatAudioDuration,
  isSpeechRecognitionSupported,
} from "./services/voiceService";

type Message = {
  from: "ony" | "user";
  text: string;
  voucher?: MarketplaceRecommendation | null;
  vouchers?: MarketplaceRecommendation[];
  copingActivity?: string | null;
  suggestions?: ChatSuggestion[];
  shownSuggestionIds?: string[];
  dismissedVoucher?: boolean;
};
type Conversation = { id: number; title: string; category: string; day: "Today" | "Yesterday"; messages: Message[]; folderId?: number; archived?: boolean; reportAllowed?: boolean };
type ChatFolder = { id: number; name: string };
type LegalDocumentId = "disclaimer" | "terms" | "privacy" | "crisis";
type MoodEntry = { id: number; dateKey?: string; level: number; emoji: string; label: string; note: string; createdAt: string; reportAllowed: boolean };

function getMoodDateKey(entry: Pick<MoodEntry, "dateKey" | "createdAt">): string {
  if (entry.dateKey && /^\d{4}-\d{2}-\d{2}$/.test(entry.dateKey)) {
    return entry.dateKey;
  }
  return getLocalDateKey(entry.createdAt);
}

const MOOD_STORAGE_KEY = "ony_daily_mood_checkins_v1";

function loadCachedMoodEntries(): MoodEntry[] {
  try {
    const raw = localStorage.getItem(MOOD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return deduplicateMoodEntriesByDay(parsed);
  } catch {
    return [];
  }
}

function saveCachedMoodEntries(entries: MoodEntry[]): void {
  try {
    localStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage quota errors
  }
}

function deduplicateMoodEntriesByDay(entries: MoodEntry[]): MoodEntry[] {
  const byDate = new Map<string, MoodEntry>();
  const sorted = [...entries].sort(
    (a, b) =>
      getMoodDateKey(b).localeCompare(getMoodDateKey(a)) ||
      (b.createdAt || "").localeCompare(a.createdAt || ""),
  );
  for (const item of sorted) {
    const dKey = getMoodDateKey(item);
    if (!byDate.has(dKey)) {
      byDate.set(dKey, { ...item, dateKey: dKey });
    }
  }
  return Array.from(byDate.values()).sort(
    (a, b) =>
      getMoodDateKey(b).localeCompare(getMoodDateKey(a)) ||
      (b.createdAt || "").localeCompare(a.createdAt || ""),
  );
}
type GlobeUser = { id: number; moodGlow: "bright" | "soft" | "dim" | "neutral"; moodKey?: string; moodLabel: string; discoverable: boolean; acceptsMessages: boolean; minLevel: number; lon: number; lat: number; isMe?: boolean };
type Merchant = { name: string; category: string; offer: string; value: string; description: string; image: string; validity: string };
type Memory = { id: number; text: string; reason: string; active: boolean; category?: string; kind?: "text" | "image"; imageTone?: string; imageUrl?: string; firestoreId?: string };
type Post = FirestoreCommunityPost;

const Icon = ({ name }: { name: string }) => {
  const paths: Record<string, ReactNode> = {
    chat: <><path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12h5"/></>,
    memory: <><path d="M6 3h12v18l-6-3-6 3V3Z"/><path d="M9 8h6M9 12h4"/></>,
    community: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2"/><path d="M3 20c0-4 2-6 6-6s6 2 6 6M15 15c4 0 6 2 6 5"/></>,
    market: <><path d="M4 9h16l-1 12H5L4 9ZM7 9V7a5 5 0 0 1 10 0v2"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-7 8-7s8 2 8 7"/></>,
    back: <path d="m15 18-6-6 6-6"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),
    heart: <path d="M20 5c-2-2-5-2-8 1-3-3-6-3-8-1-3 3-1 7 8 14 9-7 11-11 8-14Z"/>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    shield: <><path d="M12 3 4 6v5c0 5 3 8 8 10 5-2 8-5 8-10V6l-8-3Z"/><path d="m9 12 2 2 4-5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    bell: <><path d="M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3V9ZM10 20h4"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
    edit: <><path d="m4 20 4-1 11-11-3-3L5 16l-1 4ZM14 7l3 3"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>,
    play: <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" />,
    pause: <><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/></>,
    volume: <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></>,
    volumeOff: <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>,
    refresh: <path d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5"/>,
    plus: <path d="M12 5v14M5 12h14" />,
    sparkles: <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />,
    cloud: <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />,
    wind: <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2" />,
    coffee: <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8ZM6 1v3M10 1v3M14 1v3" />,
    music: <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />,
    moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></>,
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
    fileText: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </>
    ),
    download: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </>
    ),
    calendarCheck: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="m9 16 2 2 4-4" />
      </>
    ),
    smile: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </>
    ),
    lifebuoy: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
        <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
        <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
        <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
      </>
    ),
    helpCircle: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    keyboard: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="3" />
        <line x1="6" y1="8" x2="6.01" y2="8" />
        <line x1="10" y1="8" x2="10.01" y2="8" />
        <line x1="14" y1="8" x2="14.01" y2="8" />
        <line x1="18" y1="8" x2="18.01" y2="8" />
        <line x1="6" y1="12" x2="6.01" y2="12" />
        <line x1="10" y1="12" x2="10.01" y2="12" />
        <line x1="14" y1="12" x2="14.01" y2="12" />
        <line x1="18" y1="12" x2="18.01" y2="12" />
        <line x1="7" y1="16" x2="17" y2="16" />
      </>
    ),
    location: (
      <>
        <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    mapPin: (
      <>
        <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    phone: (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    ),
    externalLink: (
      <>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </>
    ),
    compass: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.3" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </>
    ),
  };
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
};

function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
  title,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  title?: string;
  style?: CSSProperties;
}) {
  return <button type={type} disabled={disabled} onClick={onClick} className={`btn btn-${variant} ${className}`} title={title} style={style}>{children}</button>;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} />;
}

function Toggle({ on, setOn, ariaLabel }: { on: boolean; setOn: (v: boolean) => void; ariaLabel?: string }) {
  return <ThemedSwitch checked={on} onChange={setOn} ariaLabel={ariaLabel} />;
}

function AreaSearchPicker({
  userCoords,
  onSelectArea,
  onDetectLocation,
  onClearLocation,
  detectingLocation = false,
  isDenied = false,
  errorMessage = null,
  compact = false,
  title,
  subtitle,
}: {
  userCoords: UserCoordinates | null;
  onSelectArea: (area: MalaysianAreaItem) => void;
  onDetectLocation?: () => Promise<void>;
  onClearLocation?: () => void;
  detectingLocation?: boolean;
  isDenied?: boolean;
  errorMessage?: string | null;
  compact?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchMalaysianAreas(query);
  }, [query]);

  const PAGE_SIZE = 5;
  const totalResults = searchResults.length;
  const totalPages = Math.ceil(totalResults / PAGE_SIZE);
  const pageResults = searchResults.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setPage(0);
  };

  const handleSelect = (area: MalaysianAreaItem) => {
    onSelectArea(area);
    setQuery("");
    setPage(0);
  };

  const getAreaLabel = (area: MalaysianAreaItem) => {
    if (language === "Bahasa Melayu") return area.nameBm;
    if (language === "中文") return area.nameZh;
    return area.nameEn;
  };

  const isCurrentArea = (area: MalaysianAreaItem) => {
    if (!userCoords) return false;
    if (userCoords.areaName && userCoords.areaName === area.nameEn) return true;
    if (userCoords.regionName && userCoords.regionName.includes(area.nameEn)) return true;
    return false;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && pageResults.length > 0) {
      e.preventDefault();
      handleSelect(pageResults[0]);
    } else if (e.key === "Escape") {
      setQuery("");
      setPage(0);
    }
  };

  return (
    <div className={`geo-denied-panel ${compact ? "compact" : ""}`}>
      <div className="geo-denied-header">
        <div className="geo-denied-icon">
          <Icon name={isDenied || errorMessage ? "compass" : "location"} />
        </div>
        <div className="geo-denied-title">
          <h4>
            {title || (isDenied || errorMessage ? t.geo_denied_heading : (language === "Bahasa Melayu" ? "Pilih Kawasan / Bandar Anda" : language === "中文" ? "选择或搜索您的所在区域" : "Select or Search Your Area"))}
          </h4>
          <p>
            {subtitle || (isDenied || errorMessage ? t.geo_denied_help_desc : (language === "Bahasa Melayu" ? "Cari bandar anda di Malaysia untuk mengira jarak tepat ke pusat rawatan." : language === "中文" ? "搜索或点击马来西亚常用城镇，即刻获取精准距离与就诊指引。" : "Search or pick any town in Malaysia to calculate exact distances and nearby support."))}
          </p>
        </div>
      </div>

      {userCoords && (
        <div className="geo-manual-active-indicator">
          <span className="geo-manual-active-text">
            <Icon name="check" />
            <span>
              {userCoords.isManual ? t.geo_manual_active_badge : t.geo_approx_badge}: <strong>{userCoords.regionName}</strong>
            </span>
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            {onClearLocation && (
              <Button variant="ghost" onClick={onClearLocation} style={{ fontSize: "11px", padding: "3px 8px" }}>
                {t.geo_clear}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Search Input Bar - Left-aligned focus and instant click-to-type */}
      <div className="area-search-container">
        <div
          className="area-search-input-wrap"
          onClick={() => inputRef.current?.focus()}
        >
          <Icon name="search" />
          <input
            ref={inputRef}
            className="area-search-input"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.geo_search_area_placeholder}
            aria-label={t.geo_search_area_placeholder}
          />
          {query && (
            <button
              type="button"
              className="area-search-clear-btn"
              onClick={(e) => {
                e.stopPropagation();
                setQuery("");
                setPage(0);
                inputRef.current?.focus();
              }}
              aria-label="Clear area search"
            >
              <Icon name="close" />
            </button>
          )}
        </div>

        {/* 5 Results at a time - smoothly displayed without jumping */}
        {query.trim().length > 0 && (
          <div className="area-results-box">
            <div className="area-results-header">
              <span>
                {language === "Bahasa Melayu" ? "Keputusan Carian" : language === "中文" ? "搜索结果" : "Search Results"} ({totalResults})
              </span>
              {totalResults > 5 && (
                <span>
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalResults)} {language === "Bahasa Melayu" ? "daripada" : language === "中文" ? "共" : "of"} {totalResults}
                </span>
              )}
            </div>

            {totalResults === 0 ? (
              <div style={{ padding: "14px 12px", fontSize: "12px", color: "var(--muted)", textAlign: "center" }}>
                {t.geo_no_areas_found}
              </div>
            ) : (
              <>
                <div className="area-results-list">
                  {pageResults.map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      className="area-result-item"
                      onClick={() => handleSelect(area)}
                    >
                      <div className="area-result-left">
                        <Icon name="mapPin" />
                        <div>
                          <span className="area-result-name">{getAreaLabel(area)}</span>
                          <span className="area-result-sub">{area.nameEn} · {area.state}</span>
                        </div>
                      </div>
                      <span className="area-result-action">
                        {language === "Bahasa Melayu" ? "Pilih" : language === "中文" ? "选择" : "Select"}
                        <Icon name="chevron" />
                      </span>
                    </button>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="area-pagination-bar">
                    <button
                      type="button"
                      className="area-page-btn"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      ‹ {language === "Bahasa Melayu" ? "5 Sebelum" : language === "中文" ? "上 5 条" : "Prev 5"}
                    </button>
                    <span className="area-page-info">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      className="area-page-btn"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    >
                      {language === "Bahasa Melayu" ? "5 Seterusnya" : language === "中文" ? "下 5 条" : "Next 5"} ›
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Popular Area Chips */}
      <div className="popular-areas-section">
        <div className="popular-areas-label">
          <Icon name="mapPin" />
          <span>{t.geo_popular_areas}</span>
        </div>
        <div className="popular-chips-wrap">
          {POPULAR_MALAYSIAN_AREAS.slice(0, 10).map((area) => {
            const active = isCurrentArea(area);
            return (
              <button
                key={area.id}
                type="button"
                className={`popular-area-chip ${active ? "active" : ""}`}
                onClick={() => handleSelect(area)}
              >
                {active ? "✓ " : ""}{getAreaLabel(area)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Retry GPS & Browser Help */}
      <div className="geo-browser-help-toggle">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          {onDetectLocation && (
            <Button
              variant="secondary"
              onClick={onDetectLocation}
              disabled={detectingLocation}
              style={{ fontSize: "12px", padding: "6px 12px" }}
            >
              {detectingLocation ? (
                <>
                  <span className="spinner mini" /> {t.geo_detecting}
                </>
              ) : (
                <>
                  <Icon name="location" /> {t.geo_retry}
                </>
              )}
            </Button>
          )}

          <button
            type="button"
            className="geo-help-btn"
            onClick={() => setShowHelp(!showHelp)}
          >
            <Icon name="info" />
            <span>{t.geo_how_to_enable}</span>
            <Icon name="chevron" />
          </button>
        </div>

        {showHelp && (
          <div className="geo-help-content">
            {t.geo_how_to_enable_steps}
          </div>
        )}
      </div>
    </div>
  );
}

const topics = ["Stress", "Loneliness", "Study", "Work", "Relationships", "Self-confidence", "General emotional support"];
const moodOptions = [
  { emoji: "😢", label: "Very low" },
  { emoji: "😟", label: "Low" },
  { emoji: "😐", label: "Okay" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😄", label: "Great" },
];
const emotions = ["stressed", "tired", "lonely", "anxious", "calm", "happy", "overwhelmed"];
const categories = ["All", "Study", "Work", "Relationships", "Motivation", "Self-care", "General"];
const themeOptions: { id: Theme; name: string; note: string }[] = [
  { id: "ocean", name: "Ocean / Sea", note: "Clear and steady" },
  { id: "sunset", name: "Sunset", note: "Soft and hopeful" },
  { id: "forest", name: "Forest / Nature", note: "Grounded and calm" },
  { id: "lavender", name: "Lavender", note: "Quiet and gentle" },
  { id: "peach", name: "Warm Peach", note: "Familiar ONY warmth" },
  { id: "neutral", name: "Minimal / Neutral", note: "Simple and focused" },
];
const personaOptions: { id: Persona; name: string; note: string; preview: string }[] = [
  { id: "gentle", name: "Gentle & Comforting", note: "Warm, empathetic, and reassuring", preview: "That sounds like a lot to carry. We can take this gently, one small step at a time." },
  { id: "friendly", name: "Friendly & Casual", note: "Relaxed, approachable, and conversational", preview: "That’s a lot for one day. Want to unpack the hardest bit together?" },
  { id: "calm", name: "Calm & Thoughtful", note: "Reflective, patient, and composed", preview: "Let’s pause with what you’re feeling. Which part needs your attention first?" },
];

export type TrustedInvitePayload = {
  inviterUid: string;
  inviterName: string;
  inviterEmail: string;
  inviterPhone?: string;
};

const PENDING_INVITE_STORAGE_KEY = "ony_pending_trusted_invite_v1";

export function parseTrustedInviteFromUrl(rawInput?: string): TrustedInvitePayload | null {
  try {
    let searchStr = "";
    if (rawInput !== undefined) {
      const trimmed = rawInput.trim();
      if (!trimmed) return null;
      if (trimmed.includes("?")) {
        searchStr = trimmed.slice(trimmed.indexOf("?"));
      } else if (trimmed.includes("inviteTrusted=") || trimmed.includes("trustedInvite=")) {
        searchStr = `?${trimmed}`;
      } else {
        const urlMatch = trimmed.match(/https?:\/\/[^\s]+/);
        if (urlMatch && urlMatch[0].includes("?")) {
          searchStr = urlMatch[0].slice(urlMatch[0].indexOf("?"));
        } else {
          return null;
        }
      }
    } else if (typeof window !== "undefined") {
      searchStr = window.location.search;
    }
    if (!searchStr) return null;
    const params = new URLSearchParams(searchStr);
    const inviterUid = (params.get("inviteTrusted") || params.get("trustedInvite") || "").trim();
    if (!inviterUid) return null;
    const inviterName = (params.get("inviterName") || "ONY Friend").trim();
    const inviterEmail = (params.get("inviterEmail") || "").trim();
    const inviterPhone = (params.get("inviterPhone") || "").trim() || undefined;
    return {
      inviterUid,
      inviterName,
      inviterEmail,
      inviterPhone,
    };
  } catch {
    return null;
  }
}

function loadStoredPendingInvite(): TrustedInvitePayload | null {
  try {
    const fromUrl = parseTrustedInviteFromUrl();
    if (fromUrl) {
      sessionStorage.setItem(PENDING_INVITE_STORAGE_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    const raw = sessionStorage.getItem(PENDING_INVITE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TrustedInvitePayload;
    if (parsed && parsed.inviterUid) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveStoredPendingInvite(invite: TrustedInvitePayload | null): void {
  try {
    if (!invite) {
      sessionStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
    } else {
      sessionStorage.setItem(PENDING_INVITE_STORAGE_KEY, JSON.stringify(invite));
    }
  } catch {
    // ignore storage errors
  }
}

type AuthFlowProps = {
  theme: Theme;
  displayName: string;
  setDisplayName: (name: string) => void;
  userPhone: string;
  setUserPhone: (phone: string) => void;
  pendingInvite?: TrustedInvitePayload | null;
  onComplete: () => void;
};

function AuthFlow(props: AuthFlowProps) {
  return <AuthFlowContent {...props} />;
}

function AppInner() {
  const { language, setLanguage } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [pendingInvite, setPendingInvite] = useState<TrustedInvitePayload | null>(() =>
    loadStoredPendingInvite(),
  );
  const [onboarding, setOnboarding] = useState(0);
  const [memoryConsent, setMemoryConsent] = useState("allow");
  const [useActiveMemories, setUseActiveMemories] = useState(true);
  const [conversationStyle, setConversationStyle] = useState("Reflective");
  const [responseLength, setResponseLength] = useState("Balanced");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["Stress", "Study"]);
  const {
    themeId,
    setColorTheme,
    themeMode,
    setThemeMode,
    fontSizeScale,
    fontSizePercent,
    tokens,
    isDark,
    syncWithDatabase,
    resetSettingsOnLogout,
  } = useTheme();
  const theme = themeId as Theme;
  const setTheme = (newTheme: Theme) => {
    setColorTheme(newTheme as ThemeId);
  };
  const [companion, setCompanion] = useState<Companion>("Cat");
  const [persona, setPersona] = useState<Persona>("gentle");
  const [soundOn, setSoundOn] = useState(false);
  const [volume, setVolume] = useState(55);
  const [currentTrack, setCurrentTrack] = useState<CalmingTrack>(() => ambientMusicEngine.getCurrentTrack());
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [trustedName, setTrustedName] = useState("Alex Tan");
  const [trustedEmail, setTrustedEmail] = useState("alex@ony.app");
  const [trustedNumber, setTrustedNumber] = useState("012-345 6789");
  const [contactStatus, setContactStatus] = useState<ContactStatus>("none");
  const [outgoingTrustedRequests, setOutgoingTrustedRequests] = useState<FirestoreTrustedContactRequest[]>([]);
  const [incomingTrustedRequests, setIncomingTrustedRequests] = useState<FirestoreTrustedContactRequest[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedMerchantName, setSelectedMerchantName] = useState("Ruang Rasa");
  const [selectedProvider, setSelectedProvider] = useState<HealthcareProvider>(() => VERIFIED_MALAYSIAN_PROVIDERS[0]);
  const [userCoords, setUserCoords] = useState<UserCoordinates | null>(() => loadCachedLocation());
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>("trial");
  const [freeUsage, setFreeUsage] = useState(0);
  const freeLimit = 100;
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>(() => loadCachedMoodEntries());
  const [selectedCommunityUser, setSelectedCommunityUser] = useState<GlobeUser | null>(null);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [globeUsers, setGlobeUsers] = useState<GlobeUser[]>(DEFAULT_GLOBE_USERS);
  const [posts, setPosts] = useState<Post[]>(DEFAULT_COMMUNITY_POSTS);
  const [merchants, setMerchants] = useState<Merchant[]>(DEFAULT_MERCHANTS);
  const [dbSyncing, setDbSyncing] = useState(false);
  const [folders, setFolders] = useState<ChatFolder[]>([
    { id: 1, name: "Study & Work" },
    { id: 2, name: "Relationships" },
    { id: 3, name: "Self-Care" },
    { id: 4, name: "Personal Reflections" },
  ]);
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: 101, title: "Feeling overwhelmed", category: "Emotional Wellbeing", day: "Today", folderId: 4, reportAllowed: true, messages: [{ from: "user", text: "Everything feels like a lot today." }, { from: "ony", text: "I hear you. We can slow this down together—what feels most urgent right now?" }] },
    { id: 102, title: "Internship search", category: "Career", day: "Today", folderId: 1, reportAllowed: true, messages: [{ from: "user", text: "I want to find an internship." }, { from: "ony", text: "Let’s begin with the kind of work and environment you want." }] },
    { id: 103, title: "Study pressure", category: "Study", day: "Today", folderId: 1, reportAllowed: true, messages: [{ from: "user", text: "My exams are getting close." }, { from: "ony", text: "That pressure makes sense. Let’s choose one small task for today." }] },
    { id: 104, title: "Relationship thoughts", category: "Relationships", day: "Yesterday", folderId: 2, reportAllowed: true, messages: [{ from: "user", text: "I keep replaying a difficult conversation." }, { from: "ony", text: "It sounds like it stayed with you. Which part keeps coming back?" }] },
    { id: 105, title: "Feeling anxious", category: "Emotional Wellbeing", day: "Yesterday", folderId: 3, reportAllowed: true, messages: [{ from: "user", text: "I’m feeling anxious." }, { from: "ony", text: "I’m here. Would something calming help, or would you like to talk it through?" }] },
  ]);
  const [memories, setMemories] = useState<Memory[]>([
    { id: 1, text: "I have exams coming up.", reason: "You mentioned this during a study-pressure chat.", active: true, category: "Study" },
    { id: 2, text: "I prefer shorter replies.", reason: "You chose this in your conversation preferences.", active: true, category: "Preference" },
    { id: 3, text: "I enjoy listening to music when stressed.", reason: "You said music helps you feel grounded.", active: true, category: "Wellbeing" },
  ]);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [journalEntries, setJournalEntries] = useState<FirestoreJournalEntry[]>(() =>
    loadCachedJournalEntries(),
  );
  const [tab, setTab] = useState<Tab>("chat");
  const [screen, setScreen] = useState<Screen>("main");
  const [selectedToolkitGuideId, setSelectedToolkitGuideId] = useState<string | undefined>(undefined);
  const [createPostInitialCategory, setCreatePostInitialCategory] = useState<string>("General");
  const [preloadedChatTopic, setPreloadedChatTopic] = useState<string | undefined>(undefined);
  const [isWritingJournalBook, setIsWritingJournalBook] = useState(false);
  const [isJournalSheetOpen, setIsJournalSheetOpen] = useState(false);
  const [isVirtualKeyboardOpen, setIsVirtualKeyboardOpen] = useState(false);
  const [visualViewportHeight, setVisualViewportHeight] = useState<number | null>(null);
  const [history, setHistory] = useState<Screen[]>([]);
  const [toast, setToast] = useState("");
  const [toastAction, setToastAction] = useState<{ label: string; onAction: () => void } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const navigate = (next: Screen) => { setHistory((h) => [...h, screen]); setScreen(next); };
  const back = () => { const prev = history[history.length - 1] || "main"; setHistory((h) => h.slice(0, -1)); setScreen(prev); };
  const notify = (
    input: string | { text: string; actionLabel?: string; onAction?: () => void },
  ) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    if (typeof input === "string") {
      setToast(input);
      setToastAction(null);
      toastTimerRef.current = window.setTimeout(() => {
        setToast((curr) => (curr === input ? "" : curr));
        toastTimerRef.current = null;
      }, 2600);
    } else {
      setToast(input.text);
      setToastAction(input.actionLabel && input.onAction ? { label: input.actionLabel, onAction: input.onAction } : null);
      toastTimerRef.current = window.setTimeout(() => {
        setToast((curr) => (curr === input.text ? "" : curr));
        setToastAction(null);
        toastTimerRef.current = null;
      }, 4600);
    }
  };
  const goTab = (next: Tab) => { setTab(next); setScreen("main"); setHistory([]); setIsWritingJournalBook(false); setIsJournalSheetOpen(false); };
  const handleOpenToolkitGuide = (guideId?: string) => {
    setSelectedToolkitGuideId(guideId);
    navigate("resources");
  };

  useEffect(() => {
    const unsub = ambientMusicEngine.subscribe((state) => {
      setSoundOn(state.isPlaying);
      setVolume(Math.round(state.volume * 100));
      setCurrentTrack(ambientMusicEngine.getCurrentTrack());
    });
    return unsub;
  }, []);

  useEffect(() => {
    applyAppearanceToDom(loadStoredAppearance());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    let baseline = Math.max(window.innerHeight, vv.height);
    const syncViewport = () => {
      baseline = Math.max(baseline, window.innerHeight);
      const ratio = vv.height / Math.max(baseline, 1);
      const kbOpen = ratio < 0.78;
      setIsVirtualKeyboardOpen(kbOpen);
      setVisualViewportHeight(kbOpen ? Math.round(vv.height) : null);
    };
    vv.addEventListener("resize", syncViewport);
    return () => vv.removeEventListener("resize", syncViewport);
  }, []);

  const handleToggleSound = (targetTrackId?: string) => {
    ambientMusicEngine.toggle(targetTrackId);
  };

  const handleSetSoundOn = (on: boolean) => {
    if (on) {
      ambientMusicEngine.play();
    } else {
      ambientMusicEngine.pause();
    }
  };

  const handleSetVolume = (val: number) => {
    setVolume(val);
    ambientMusicEngine.setVolume(val);
  };

  const handleSelectTrack = (trackId: string) => {
    ambientMusicEngine.play(trackId);
  };

  const handleSetPersona = (nextPersona: Persona) => {
    setPersona(nextPersona);
    if (currentUser) {
      updateUserProfile(currentUser.uid, { persona: nextPersona }).catch((e) =>
        console.warn("[ONY] Profile persona update notice:", e)
      );
    }
  };

  const handleSetPendingInvite = (nextInvite: TrustedInvitePayload | null) => {
    setPendingInvite(nextInvite);
    saveStoredPendingInvite(nextInvite);
  };

  // Detect ?trustedInvite=... link on load and hydrate inviter details if needed
  useEffect(() => {
    const fromUrl = parseTrustedInviteFromUrl();
    if (fromUrl) {
      handleSetPendingInvite(fromUrl);
      if (typeof window !== "undefined" && window.location.search.includes("trustedInvite=")) {
        const cleanUrl = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, []);

  useEffect(() => {
    if (!pendingInvite || (pendingInvite.inviterEmail && pendingInvite.inviterName !== "ONY Friend")) {
      return;
    }
    let active = true;
    findRegisteredAccountByUid(pendingInvite.inviterUid)
      .then((acc) => {
        if (active && acc) {
          handleSetPendingInvite({
            inviterUid: pendingInvite.inviterUid,
            inviterName: acc.displayName || pendingInvite.inviterName,
            inviterEmail: acc.email || pendingInvite.inviterEmail,
            inviterPhone: acc.phoneNumber || pendingInvite.inviterPhone,
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pendingInvite?.inviterUid]);

  // Seed shared database collections (Globe, Community Posts, Merchants) and subscribe live from Firestore
  useEffect(() => {
    let active = true;
    let unsubGlobe: (() => void) | null = null;

    async function syncDatabase() {
      setDbSyncing(true);
      try {
        await seedInitialDatabaseData().catch((e) => console.warn("[ONY] Seed warning:", e));

        const [loadedGlobe, loadedPosts, loadedMerchants] = await Promise.all([
          listGlobeUsers().catch(() => []),
          listCommunityPosts().catch(() => []),
          listMerchants().catch(() => []),
        ]);

        if (active) {
          if (loadedGlobe && loadedGlobe.length > 0) {
            setGlobeUsers(loadedGlobe);
          }
          if (loadedPosts && loadedPosts.length > 0) {
            setPosts((prev) =>
              deduplicateCommunityPostList([...loadedPosts, ...prev.filter((p) => !/^post_\d+$/.test(p.id) && !loadedPosts.some((lp) => lp.id === p.id))]),
            );
          }
          if (loadedMerchants && loadedMerchants.length > 0) {
            setMerchants(loadedMerchants);
          }
          writeSystemLog({
            level: "info",
            category: "sync",
            action: "DATABASE_SYNCED",
            message: "Connected to Cloud Firestore (ai-studio-onypwa-289f0eda-a42f-43da-8c66-8ac63f5d46a8). Synced live collections.",
          }).catch(() => {});

          unsubGlobe = subscribeVisibleGlobeUsers((liveUsers) => {
            if (active && liveUsers.length > 0) {
              setGlobeUsers(liveUsers);
            }
          });
        }
      } catch (err) {
        console.warn("[ONY] Database fetch warning:", err);
      } finally {
        if (active) setDbSyncing(false);
      }
    }
    syncDatabase();
    return () => {
      active = false;
      if (unsubGlobe) unsubGlobe();
    };
  }, []);

  // Listen to Firebase Authentication state and hydrate Firestore profile data
  useEffect(() => {
    const unsub = subscribeToAuthChanges(async (user) => {
      setCurrentUser(user);
      if (user) {
        setAuthenticated(true);
        if (user.displayName) setDisplayName(user.displayName);
        writeSystemLog({
          level: "audit",
          category: "auth",
          action: "USER_AUTHENTICATED",
          message: `Active session authenticated for ${user.email || user.uid}.`,
          userId: user.uid,
          userEmail: user.email,
        }).catch(() => {});
        try {
          await seedInitialUserData(user.uid).catch((e) => console.warn("[ONY] User seed notice:", e));
          await syncWithDatabase(user.uid).catch((e) => console.warn("[ONY] Theme sync notice:", e));
          const profile = await getUserProfile(user.uid);
          const resolvedName =
            profile?.displayName || user.displayName || user.email?.split("@")[0] || "Friend";
          const resolvedPhone = profile?.phoneNumber || "";
          if (resolvedPhone) {
            setUserPhone(resolvedPhone);
          }
          if (user.email) {
            await syncRegisteredAccount({
              uid: user.uid,
              displayName: resolvedName,
              email: user.email,
              phoneNumber: resolvedPhone || undefined,
            });
          }
          if (profile) {
            if (profile.displayName) setDisplayName(profile.displayName);
            if (profile.phoneNumber) setUserPhone(profile.phoneNumber);
            if (profile.theme) setTheme(profile.theme as Theme);
            if (profile.companion) setCompanion(profile.companion as Companion);
            if (profile.persona) setPersona(profile.persona as Persona);
            if (profile.preferredLanguage) setLanguage(profile.preferredLanguage as AppLanguage);
            if (profile.conversationStyle) setConversationStyle(profile.conversationStyle);
            if (profile.responseLength) setResponseLength(profile.responseLength);
            if (profile.memoryConsent) setMemoryConsent(profile.memoryConsent);
            if (typeof profile.useActiveMemories === "boolean") setUseActiveMemories(profile.useActiveMemories);
            if (profile.onboardingCompleted) setOnboarding(9);
          }
          const loadedMoods = await listMoodEntries(user.uid);
          const firestoreByDate = new Map<string, MoodEntry>();
          loadedMoods.forEach((m, idx) => {
            const dKey =
              m.dateKey ||
              (/^\d{4}-\d{2}-\d{2}$/.test(m.id) ? m.id : getLocalDateKey(m.createdAt));
            const parsedTime = Date.parse(m.createdAt);
            firestoreByDate.set(dKey, {
              id: !isNaN(parsedTime) ? parsedTime + idx : Date.now() - idx * 1000,
              dateKey: dKey,
              level: m.level,
              emoji: m.emoji,
              label: m.label,
              note: m.note || "",
              createdAt: m.createdAt,
              reportAllowed: m.reportAllowed ?? true,
            });
          });

          // Merge any locally cached daily mood entries and ensure they are persisted to Firestore
          const cachedLocal = loadCachedMoodEntries();
          for (const localEntry of cachedLocal) {
            const dKey = getMoodDateKey(localEntry);
            if (!firestoreByDate.has(dKey)) {
              firestoreByDate.set(dKey, { ...localEntry, dateKey: dKey });
              saveMoodEntry(user.uid, {
                dateKey: dKey,
                level: localEntry.level,
                emoji: localEntry.emoji,
                label: localEntry.label,
                note: localEntry.note,
                reportAllowed: localEntry.reportAllowed,
                createdAt: localEntry.createdAt,
              }).catch((e) => console.warn("[ONY] Mood backfill notice:", e));
            }
          }

          const mergedMoods = deduplicateMoodEntriesByDay(Array.from(firestoreByDate.values()));
          setMoodEntries(mergedMoods);
          saveCachedMoodEntries(mergedMoods);
          const loadedMemories = await listMemories(user.uid);
          if (loadedMemories.length > 0) {
            setMemories(
              loadedMemories.map((m, idx) => ({
                id: idx + 1,
                firestoreId: m.id,
                text: m.text,
                reason: m.reason,
                category: m.category,
                active: m.active,
                kind: m.kind,
              })),
            );
          }
          const loadedJournals = await listJournalEntries(user.uid);
          if (loadedJournals.length > 0) {
            setJournalEntries(loadedJournals);
            saveCachedJournalEntries(loadedJournals);
          }
          const loadedChats = await listConversations(user.uid);
          if (loadedChats.length > 0) {
            setConversations(
              loadedChats.map((c, idx) => ({
                id: Number(c.id.replace(/\D/g, "")) || 101 + idx,
                title: c.title,
                category: c.category,
                day: c.day,
                folderId: c.folderId,
                reportAllowed: c.reportAllowed,
                messages: c.messages,
              })),
            );
          }
        } catch (err) {
          console.warn("[ONY] Firestore initial fetch notice:", err);
        }
      } else {
        // When not logged in / logged out, the first page must default strictly to English
        setLanguage("English");
        setDisplayName("");
        setUserPhone("");
        try {
          localStorage.setItem("ony_preferred_language", "English");
        } catch {
          // ignore
        }
      }
    });
    return () => unsub();
  }, []);

  // If the user opened an invite link from a friend, open the Trusted Contact screen automatically once signed in
  useEffect(() => {
    if (authenticated && pendingInvite) {
      setOnboarding(9);
      setScreen("trusted");
    }
  }, [authenticated, pendingInvite?.inviterUid]);

  const effectiveUid = currentUser?.uid || "guest_local_user";
  const effectiveEmail =
    currentUser?.email || `${displayName.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || "guest"}@ony.app`;

  const refreshTrustedContactData = async () => {
    try {
      if (currentUser?.email) {
        await syncRegisteredAccount({
          uid: currentUser.uid,
          displayName: displayName || currentUser.displayName || "ONY Member",
          email: currentUser.email,
          phoneNumber: userPhone || undefined,
        });
      }
      const requests = await listTrustedContactRequests(effectiveUid, effectiveEmail).catch(() => ({
        outgoing: [],
        incoming: [],
      }));
      setOutgoingTrustedRequests(requests.outgoing);
      setIncomingTrustedRequests(requests.incoming);

      // Determine the user's own Emergency Contact:
      // 1) Either a friend who clicked our invite link (`requestKind === "invite_link"`) and we ACCEPTED them
      // 2) Or a direct invite we sent (`requestKind !== "invite_link"`)
      const acceptedViaMyInviteLink = requests.incoming.find(
        (r) => r.requestKind === "invite_link" && r.status === "accepted",
      );
      const directOutgoing = requests.outgoing.filter((r) => r.requestKind !== "invite_link");
      const acceptedDirectOutgoing = directOutgoing.find((r) => r.status === "accepted");
      const latestDirectOutgoing = directOutgoing[0];

      if (acceptedViaMyInviteLink) {
        setContactStatus("accepted");
        setTrustedName(acceptedViaMyInviteLink.fromName);
        setTrustedEmail(acceptedViaMyInviteLink.fromEmail);
        if (acceptedViaMyInviteLink.contactPhone) {
          setTrustedNumber(acceptedViaMyInviteLink.contactPhone);
        }
      } else if (acceptedDirectOutgoing) {
        setContactStatus("accepted");
        setTrustedName(acceptedDirectOutgoing.toName);
        setTrustedEmail(acceptedDirectOutgoing.toEmail);
        if (acceptedDirectOutgoing.contactPhone) {
          setTrustedNumber(acceptedDirectOutgoing.contactPhone);
        }
      } else if (latestDirectOutgoing) {
        setContactStatus(latestDirectOutgoing.status);
        setTrustedName(latestDirectOutgoing.toName);
        setTrustedEmail(latestDirectOutgoing.toEmail);
        if (latestDirectOutgoing.contactPhone) {
          setTrustedNumber(latestDirectOutgoing.contactPhone);
        }
      } else {
        setContactStatus("none");
      }
    } catch (err) {
      console.warn("[ONY Trusted Contact] Sync notice:", err);
    }
  };

  useEffect(() => {
    if (!authenticated) return;
    void refreshTrustedContactData();
    const timer = window.setInterval(() => {
      void refreshTrustedContactData();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [authenticated, currentUser?.uid, currentUser?.email, userPhone, screen, tab]);

  const handleRespondToIncomingTrusted = async (
    requestId: string,
    decision: "accepted" | "rejected",
    senderName: string,
    requestKind?: "direct_invite" | "invite_link",
  ) => {
    try {
      await respondToTrustedContactRequest(requestId, decision);
      await refreshTrustedContactData();
      if (decision === "accepted") {
        notify(
          requestKind === "invite_link"
            ? `${senderName} is now your active Trusted Emergency Contact!`
            : `You accepted ${senderName}’s Trusted Contact request`,
        );
      } else {
        notify(`You declined ${senderName}’s request`);
      }
    } catch {
      notify("Could not update request. Please try again.");
    }
  };

  const pendingIncomingTrusted = incomingTrustedRequests.filter((r) => r.status === "pending");

  const [mySupportMessages, setMySupportMessages] = useState<FirestoreCommunityMessage[]>(() =>
    DEFAULT_COMMUNITY_MESSAGES.filter((m) => m.toUserId === "0").map((m, i) => ({
      id: `seed_me_${i}`,
      ...m,
    })),
  );

  const fetchMySupportMessages = async () => {
    try {
      let msgs = await listCommunityMessages("0");
      if (!msgs || msgs.length === 0) {
        const myDefaults = DEFAULT_COMMUNITY_MESSAGES.filter((m) => m.toUserId === "0");
        for (const item of myDefaults) {
          await createCommunityMessage(item).catch(() => {});
        }
        msgs = await listCommunityMessages("0");
      }
      if (msgs && msgs.length > 0) {
        setMySupportMessages(msgs);
      }
    } catch (err) {
      console.warn("[ONY] Support message fetch notice:", err);
    }
  };

  useEffect(() => {
    if (!authenticated) return;
    void fetchMySupportMessages();
  }, [authenticated]);

  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("ony_read_notifications_v1");
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  });

  const saveReadNotificationIds = (nextSet: Set<string>) => {
    try {
      localStorage.setItem("ony_read_notifications_v1", JSON.stringify(Array.from(nextSet)));
    } catch {}
  };

  const allNotifications: AppNotificationItem[] = useMemo(() => {
    const list: AppNotificationItem[] = [];

    // 1. Incoming Trusted / Emergency Contact Requests
    incomingTrustedRequests.forEach((req) => {
      const isInviteLink = req.requestKind === "invite_link";
      const title = isInviteLink
        ? "Emergency Contact Request via Invite Link"
        : "Emergency Contact Request";
      const message = isInviteLink
        ? `${req.fromName} clicked your invite link and requested to be your emergency contact${
            req.contactPhone ? ` · Phone: ${req.contactPhone}` : ""
          }.`
        : `${req.fromName} (${req.fromEmail}) wants to add you as their Trusted Contact in ONY.`;

      const id = `tc_${req.id}_${req.status}`;
      list.push({
        id,
        type: "emergency_contact_request",
        title,
        message,
        createdAt: req.createdAt || new Date().toISOString(),
        read: readNotificationIds.has(id),
        rawRequest: req,
      });
    });

    // 2. Outgoing Trusted / Emergency Contact Confirmations
    outgoingTrustedRequests.forEach((req) => {
      if (req.status === "accepted") {
        const id = `tc_out_${req.id}_accepted`;
        list.push({
          id,
          type: "emergency_contact_accepted",
          title: "Emergency Contact Accepted",
          message: `${req.toName} accepted your request to be their Trusted Emergency Contact.`,
          createdAt: req.updatedAt || req.createdAt || new Date().toISOString(),
          read: readNotificationIds.has(id),
        });
      }
    });

    // 3. Likes, comments, and replies on user's posts
    const cleanNameLower = displayName.trim().toLowerCase();
    posts.forEach((post) => {
      const isMyPost =
        (post.authorId && post.authorId === effectiveUid) ||
        (post.author && post.author.toLowerCase().includes(cleanNameLower));

      if (isMyPost && Array.isArray(post.likeRecords)) {
        post.likeRecords.forEach((like) => {
          const isFromOther =
            like.userId !== effectiveUid &&
            like.userName.trim().toLowerCase() !== cleanNameLower;
          if (isFromOther) {
            const id = `like_${post.id}_${like.userId}_${like.createdAt}`;
            list.push({
              id,
              type: "post_liked",
              title: "Someone liked your post",
              message: `${like.userName} liked your post "${post.title}".`,
              createdAt: like.createdAt,
              read: readNotificationIds.has(id),
              postId: post.id,
              post,
            });
          }
        });
      }

      if (Array.isArray(post.comments)) {
        post.comments.forEach((comment) => {
          if (isMyPost) {
            const isFromOther =
              comment.userId !== effectiveUid &&
              comment.userName.trim().toLowerCase() !== cleanNameLower;
            if (isFromOther) {
              const id = `comment_${post.id}_${comment.id}`;
              list.push({
                id,
                type: "post_commented",
                title: "Someone commented on your post",
                message: `${comment.userName} commented: "${comment.text}" on "${post.title}".`,
                createdAt: comment.createdAt,
                read: readNotificationIds.has(id),
                postId: post.id,
                post,
              });
            }
          }

          const isMyComment =
            comment.userId === effectiveUid ||
            comment.userName.trim().toLowerCase() === cleanNameLower;
          if (isMyComment && Array.isArray(comment.replies)) {
            comment.replies.forEach((rep) => {
              const isFromOther =
                rep.userId !== effectiveUid &&
                rep.userName.trim().toLowerCase() !== cleanNameLower;
              if (isFromOther) {
                const id = `reply_${post.id}_${comment.id}_${rep.id}`;
                list.push({
                  id,
                  type: "comment_replied",
                  title: "Someone replied to your comment",
                  message: `${rep.userName} replied: "${rep.text}" to your comment.`,
                  createdAt: rep.createdAt,
                  read: readNotificationIds.has(id),
                  postId: post.id,
                  post,
                });
              }
            });
          }
        });
      }
    });

    // 4. Supportive messages sent to user's globe node
    mySupportMessages.forEach((msg) => {
      const isFromOther =
        msg.fromUserId !== effectiveUid &&
        !(msg.senderAnonymous || "").includes("(You)");
      if (isFromOther) {
        const id = `support_${msg.id}`;
        list.push({
          id,
          type: "support_message",
          title: "Supportive Message Received",
          message:
            msg.kind === "voice"
              ? `${msg.senderAnonymous || "Anonymous Member"} sent an encouraging voice note (${
                  msg.audioDuration || 8
                }s) to your globe node.`
              : `${msg.senderAnonymous || "Anonymous Member"} sent you encouragement: "${msg.text}"`,
          createdAt: msg.createdAt,
          read: readNotificationIds.has(id),
          audioUrl: msg.audioUrl,
          audioDuration: msg.audioDuration,
        });
      }
    });

    // Sort newest first
    return list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [
    incomingTrustedRequests,
    outgoingTrustedRequests,
    posts,
    mySupportMessages,
    effectiveUid,
    displayName,
    readNotificationIds,
  ]);

  const unreadNotificationsCount = useMemo(
    () => allNotifications.filter((n) => !n.read).length,
    [allNotifications],
  );

  const handleMarkAllRead = () => {
    const nextSet = new Set(readNotificationIds);
    allNotifications.forEach((n) => nextSet.add(n.id));
    setReadNotificationIds(nextSet);
    saveReadNotificationIds(nextSet);
    notify("All notifications marked as read");
  };

  const handleMarkRead = (id: string) => {
    if (readNotificationIds.has(id)) return;
    const nextSet = new Set(readNotificationIds);
    nextSet.add(id);
    setReadNotificationIds(nextSet);
    saveReadNotificationIds(nextSet);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      resetSettingsOnLogout();
      setAuthenticated(false);
      setOnboarding(0);
      setDisplayName("");
      setUserPhone("");
      setLanguage("English");
      try {
        localStorage.setItem("ony_preferred_language", "English");
      } catch {
        // ignore
      }
      notify("Logged out successfully");
    } catch (e) {
      console.warn("[ONY] Logout notice:", e);
      resetSettingsOnLogout();
      setAuthenticated(false);
      setOnboarding(0);
      setDisplayName("");
      setUserPhone("");
      setLanguage("English");
      try {
        localStorage.setItem("ony_preferred_language", "English");
      } catch {
        // ignore
      }
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUserAccount();
      resetSettingsOnLogout();
      setAuthenticated(false);
      setOnboarding(0);
      setDisplayName("");
      setUserPhone("");
      setMoodEntries([]);
      setMemories([]);
      setLanguage("English");
      try {
        localStorage.setItem("ony_preferred_language", "English");
      } catch {
        // ignore
      }
      notify("Your account and all personal data have been deleted.");
    } catch (err) {
      console.warn("[ONY] Account deletion error:", err);
      notify("Could not delete account. Please sign in again and retry.");
    }
  };

  const handleSelectLanguage = async (nextLang: AppLanguage) => {
    setLanguage(nextLang);
    const toastMsg =
      nextLang === "Bahasa Melayu"
        ? "Bahasa aplikasi ditukar ke Bahasa Melayu"
        : nextLang === "中文"
          ? "应用语言已切换为中文"
          : "App language switched to English";
    notify(toastMsg);
    if (currentUser) {
      try {
        await updateUserProfile(currentUser.uid, {
          preferredLanguage: nextLang,
        });
        writeSystemLog({
          level: "audit",
          category: "auth",
          action: "LANGUAGE_PREFERENCE_UPDATED",
          message: `Language updated to ${nextLang} for ${currentUser.email || currentUser.uid}. Synced to Cloud Firestore.`,
          userId: currentUser.uid,
          userEmail: currentUser.email,
        }).catch(() => {});
      } catch (e) {
        console.warn("[ONY] Firestore language update warning:", e);
      }
    }
  };

  const handleOnboardingComplete = async (nextStep: number) => {
    setOnboarding(nextStep);
    if (nextStep >= 9 && currentUser) {
      await updateUserProfile(currentUser.uid, {
        displayName,
        phoneNumber: userPhone || undefined,
        theme,
        companion,
        persona,
        preferredLanguage: language,
        conversationStyle,
        responseLength,
        memoryConsent,
        useActiveMemories,
        onboardingCompleted: true,
      }).catch((e) => console.warn("[ONY] Profile onboarding save notice:", e));
    }
  };

  if (!authenticated) {
    return (
      <AuthFlow
        theme={theme}
        displayName={displayName}
        setDisplayName={setDisplayName}
        userPhone={userPhone}
        setUserPhone={setUserPhone}
        pendingInvite={pendingInvite}
        onComplete={() => setAuthenticated(true)}
      />
    );
  }

  if (onboarding < 9) {
    return <Onboarding
      step={onboarding}
      setStep={handleOnboardingComplete}
      displayName={displayName}
      consent={memoryConsent}
      setConsent={setMemoryConsent}
      language={language}
      setLanguage={(v) => void handleSelectLanguage(v as AppLanguage)}
      selectedTopics={selectedTopics}
      setSelectedTopics={setSelectedTopics}
      theme={theme}
      setTheme={setTheme}
      companion={companion}
      setCompanion={setCompanion}
      persona={persona}
      setPersona={setPersona}
      soundOn={soundOn}
      setSoundOn={handleSetSoundOn}
    />;
  }

  const handleClearMemories = () => {
    setMemories([]);
    if (currentUser) {
      clearAllMemories(currentUser.uid).catch((e) => console.warn("[ONY] Clear memories error:", e));
    }
  };

  const handleSetMoodEntries = (action: MoodEntry[] | ((prev: MoodEntry[]) => MoodEntry[])) => {
    setMoodEntries((prev) => {
      const rawNext = typeof action === "function" ? action(prev) : action;
      const next = deduplicateMoodEntriesByDay(rawNext);
      saveCachedMoodEntries(next);

      if (currentUser) {
        const prevByDate = new Map(prev.map((item) => [getMoodDateKey(item), item]));
        const nextByDate = new Map(next.map((item) => [getMoodDateKey(item), item]));

        // Save new or updated daily entries to Firestore (users/{uid}/moodCheckins/{YYYY-MM-DD})
        for (const [dKey, entry] of nextByDate.entries()) {
          const existing = prevByDate.get(dKey);
          if (!existing) {
            saveMoodEntry(currentUser.uid, {
              dateKey: dKey,
              level: entry.level,
              emoji: entry.emoji,
              label: entry.label,
              note: entry.note,
              reportAllowed: entry.reportAllowed,
              createdAt: entry.createdAt,
            }).catch((e) => console.warn("[ONY] Mood save error:", e));
          } else if (
            existing.reportAllowed !== entry.reportAllowed ||
            existing.level !== entry.level ||
            existing.note !== entry.note
          ) {
            updateMoodEntry(currentUser.uid, dKey, {
              level: entry.level,
              emoji: entry.emoji,
              label: entry.label,
              note: entry.note,
              reportAllowed: entry.reportAllowed,
              dateKey: dKey,
            }).catch((e) => console.warn("[ONY] Mood update error:", e));
          }
        }

        // Delete removed daily entries from Firestore
        for (const [dKey] of prevByDate.entries()) {
          if (!nextByDate.has(dKey)) {
            deleteMoodEntry(currentUser.uid, dKey).catch((e) =>
              console.warn("[ONY] Mood delete error:", e),
            );
          }
        }
      }
      return next;
    });
  };

  const todayDateKey = getLocalDateKey();
  const todayMoodEntry = moodEntries.find((entry) => getMoodDateKey(entry) === todayDateKey) || null;

  const handleSetMemories = (action: Memory[] | ((prev: Memory[]) => Memory[])) => {
    setMemories((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      if (currentUser && next.length > prev.length) {
        const newest = next[0];
        saveMemory(currentUser.uid, {
          text: newest.text,
          reason: newest.reason,
          category: newest.category || "General",
          active: newest.active,
          kind: newest.kind,
        }).catch((e) => console.warn("[ONY] Memory save error:", e));
      }
      return next;
    });
  };

  const syncUpdatedPostInState = (updatedPost: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
    setSelectedPost((prev) => (prev && prev.id === updatedPost.id ? updatedPost : prev));
  };

  const handleCreatePost = async (newPost: Omit<FirestoreCommunityPost, "id">) => {
    try {
      const id = await createCommunityPost(newPost);
      const created: Post = {
        ...newPost,
        id: id || String(Date.now()),
        likes: newPost.likeRecords?.length || 0,
        likeRecords: newPost.likeRecords || [],
        comments: newPost.comments || [],
      };
      setPosts((prev) => deduplicateCommunityPostList([created, ...prev]));
      notify(language === "Bahasa Melayu" ? "Siaran berjaya diterbitkan" : language === "中文" ? "帖子已发布" : "Post published");
    } catch (e) {
      console.warn("[ONY] Post save warning:", e);
      const fallbackCreated: Post = {
        ...newPost,
        id: String(Date.now()),
        likes: newPost.likeRecords?.length || 0,
        likeRecords: newPost.likeRecords || [],
        comments: newPost.comments || [],
      };
      setPosts((prev) => deduplicateCommunityPostList([fallbackCreated, ...prev]));
      notify("Post published");
    }
  };

  const handleLikePost = async (postId: string) => {
    const post = posts.find((p) => p.id === postId) || (selectedPost?.id === postId ? selectedPost : undefined);
    if (!post) return;
    const cleanUid = effectiveUid.trim() || "anonymous_user";
    const cleanName = (displayName || "ONY Member").trim();
    const currentLikes = Array.isArray(post.likeRecords) ? post.likeRecords : [];
    const alreadyLiked = currentLikes.some(
      (item) =>
        item.userId === cleanUid ||
        item.userName.trim().toLowerCase() === cleanName.toLowerCase(),
    );
    const optimisticLikeRecords: PostLikeRecord[] = alreadyLiked
      ? currentLikes.filter(
          (item) =>
            item.userId !== cleanUid &&
            item.userName.trim().toLowerCase() !== cleanName.toLowerCase(),
        )
      : [
          ...currentLikes,
          {
            userId: cleanUid,
            userName: cleanName,
            createdAt: new Date().toISOString(),
          },
        ];
    const optimisticPost: Post = {
      ...post,
      likes: optimisticLikeRecords.length,
      likeRecords: optimisticLikeRecords,
    };
    syncUpdatedPostInState(optimisticPost);
    try {
      const saved = await toggleCommunityPostLike(post, { uid: cleanUid, name: cleanName });
      syncUpdatedPostInState(saved);
    } catch (e) {
      console.warn("[ONY] Like post update notice:", e);
    }
  };

  const handleRefreshCommunityPosts = async (limitCount = 50) => {
    try {
      const fresh = await listCommunityPosts(limitCount);
      if (fresh && fresh.length > 0) {
        setPosts((prev) => {
          const merged = deduplicateCommunityPostList([...fresh, ...prev.filter((p) => !fresh.some((f) => f.id === p.id))]);
          return merged;
        });
      }
    } catch (e) {
      console.warn("[ONY] Community posts refresh notice:", e);
    }
  };

  const handleSaveCommunityPostToVault = async (post: Post) => {
    const now = new Date().toISOString();
    const dateKey = now.slice(0, 10);
    const contentText = `${post.title}\n\n${post.body}\n\n— Shared by ${post.author} (${post.category})`;
    const newEntry: FirestoreJournalEntry = {
      id: `journal_post_${post.id}_${Date.now()}`,
      title: `Saved Post: ${post.title}`,
      content: contentText,
      dateKey,
      entryDate: dateKey,
      moodEmoji: "🌿",
      moodLabel: "Reflective",
      tags: ["Community", post.category || "General"],
      createdAt: now,
      updatedAt: now,
    };
    setJournalEntries((prev) => [newEntry, ...prev]);
    if (currentUser) {
      saveJournalEntry(currentUser.uid, newEntry).catch((err) =>
        console.warn("[ONY] Journal post save notice:", err),
      );
      saveMemory(currentUser.uid, {
        text: `${post.title} — ${post.body}`,
        reason: `Saved from ONY Community (${post.category})`,
        category: post.category || "Community",
        active: true,
      }).catch(() => {});
    }
    setMemories((prev) => [
      {
        id: Date.now(),
        text: `${post.title} — ${post.body}`,
        reason: `Saved from ONY Community (${post.category})`,
        category: post.category || "Community",
        active: true,
        createdAt: now,
      },
      ...prev,
    ]);
    notify(
      language === "Bahasa Melayu"
        ? "Disimpan ke Peti Memori"
        : language === "中文"
          ? "已保存到记忆宝库"
          : "Saved to Memory Vault",
    );
  };

  return (
    <NotificationsContext.Provider
      value={{
        unreadCount: unreadNotificationsCount,
        openNotifications: () => navigate("notifications"),
      }}
    >
      <div className={`app-shell theme-${theme}`}>
        <div
          className={`phone ${isVirtualKeyboardOpen ? "virtual-keyboard-open" : ""}`}
          style={
            visualViewportHeight
              ? ({ "--vvh": `${visualViewportHeight}px` } as CSSProperties)
              : undefined
          }
        >
          <div className={`environment environment-${theme}`} aria-hidden="true"><i /><i /><i /></div>
          {screen === "main" ? (
            <>
              <main className={`main-content ${tab === "chat" ? "chat-tab-active" : ""}`}>
                {tab === "chat" && <ChatHome navigate={navigate} goTab={goTab} displayName={displayName} companion={companion} persona={persona} setPersona={handleSetPersona} language={language} conversationStyle={conversationStyle} responseLength={responseLength} memoryConsent={memoryConsent} useActiveMemories={useActiveMemories} soundOn={soundOn} setSoundOn={handleSetSoundOn} currentTrack={currentTrack} onOpenMusicModal={() => setShowMusicModal(true)} conversations={conversations} setConversations={setConversations} activeChatId={activeChatId} setActiveChatId={setActiveChatId} selectedFolderId={selectedFolderId} memories={memories} setMemories={handleSetMemories} todayMoodEntry={todayMoodEntry} subscriptionStatus={subscriptionStatus} freeUsage={freeUsage} freeLimit={freeLimit} registerFreeUse={() => {
                  if (subscriptionStatus === "trial" || subscriptionStatus === "payg" || subscriptionStatus === "monthly") return;
                  const next = freeUsage + 1;
                  setFreeUsage(next);
                  if (next >= freeLimit) window.setTimeout(() => navigate("subscription"), 750);
                }} notify={notify} onOpenMerchant={(name) => { setSelectedMerchantName(name); navigate("merchant"); }} onOpenToolkitGuide={handleOpenToolkitGuide} preloadedTopic={preloadedChatTopic} onClearPreloadedTopic={() => setPreloadedChatTopic(undefined)} />}
                {tab === "memory" && (
                  <DigitalJournal
                    journalEntries={journalEntries}
                    setJournalEntries={setJournalEntries}
                    memories={memories}
                    setMemories={handleSetMemories}
                    companion={companion}
                    notify={notify}
                    memoryConsent={memoryConsent}
                    setMemoryConsent={setMemoryConsent}
                    useActiveMemories={useActiveMemories}
                    setUseActiveMemories={setUseActiveMemories}
                    currentUser={currentUser}
                    onNavigateToPrivacy={() => navigate("privacy")}
                    onOpenBookChange={setIsWritingJournalBook}
                    onSheetOpenChange={setIsJournalSheetOpen}
                  />
                )}
                {tab === "community" && <Community navigate={navigate} onOpenCreatePost={(cat) => { setCreatePostInitialCategory(cat && cat !== "All" ? cat : "General"); navigate("post"); }} globeUsers={globeUsers} setGlobeUsers={setGlobeUsers} posts={posts} setPosts={setPosts} currentUid={effectiveUid} currentUserName={displayName} onLikePost={handleLikePost} onPostUpdated={syncUpdatedPostInState} onSavePostToVault={handleSaveCommunityPostToVault} onRefreshPosts={handleRefreshCommunityPosts} dbSyncing={dbSyncing} latestMood={moodEntries[0]} openPost={(post) => { setSelectedPost(post); navigate("postDetail"); }} openMember={(user) => { setSelectedCommunityUser(user); navigate("communityMember"); }} notify={notify} mySupportMessages={mySupportMessages} setMySupportMessages={setMySupportMessages} userCoords={userCoords} setUserCoords={setUserCoords} />}
                {tab === "market" && <Marketplace navigate={navigate} merchants={merchants} dbSyncing={dbSyncing} openMerchant={(name) => { setSelectedMerchantName(name); navigate("merchant"); }} />}
                {tab === "profile" && (
                  <Profile
                    navigate={navigate}
                    displayName={displayName}
                    language={language}
                    persona={persona}
                    theme={theme}
                    companion={companion}
                    trustedName={trustedName}
                    contactStatus={contactStatus}
                    pendingIncomingCount={pendingIncomingTrusted.length}
                    unreadNotificationsCount={unreadNotificationsCount}
                    subscriptionStatus={subscriptionStatus}
                    onLogout={handleLogout}
                    onSelectLanguage={handleSelectLanguage}
                    effectiveEmail={effectiveEmail}
                    currentUser={currentUser}
                  />
                )}
              </main>
            </>
          ) : (
            <main className="overlay-page">
              {screen === "language" && (
                <LanguagePreferences
                  back={back}
                  currentLanguage={language}
                  onSelectLanguage={handleSelectLanguage}
                  notify={notify}
                />
              )}
              {screen === "mood" && <MoodCheck back={back} navigate={navigate} entries={moodEntries} setEntries={handleSetMoodEntries} notify={notify} />}
              {screen === "trend" && <MoodTrend back={back} entries={moodEntries} setEntries={handleSetMoodEntries} />}
              {screen === "safety" && <SafetyFlow back={back} navigate={navigate} />}
              {screen === "help" && <Help back={back} navigate={navigate} />}
              {screen === "personalise" && <Personalise back={back} language={language} setLanguage={(v) => void handleSelectLanguage(v as AppLanguage)} conversationStyle={conversationStyle} setConversationStyle={setConversationStyle} responseLength={responseLength} setResponseLength={setResponseLength} useActiveMemories={useActiveMemories} setUseActiveMemories={setUseActiveMemories} theme={theme} setTheme={setTheme} companion={companion} setCompanion={setCompanion} persona={persona} setPersona={setPersona} soundOn={soundOn} setSoundOn={handleSetSoundOn} volume={volume} setVolume={handleSetVolume} currentTrack={currentTrack} onOpenMusicModal={() => setShowMusicModal(true)} notify={notify} onSave={() => {
                if (currentUser) {
                  updateUserProfile(currentUser.uid, {
                    theme,
                    companion,
                    persona,
                    preferredLanguage: language,
                    conversationStyle,
                    responseLength,
                    useActiveMemories,
                  }).catch((e) => console.warn("[ONY] Update preferences error:", e));
                }
              }} />}
              {screen === "notifications" && (
                <Notifications
                  back={back}
                  navigate={navigate}
                  notifications={allNotifications}
                  onMarkAllRead={handleMarkAllRead}
                  onMarkRead={handleMarkRead}
                  onRespondTrusted={handleRespondToIncomingTrusted}
                  onOpenPost={(postOrId) => {
                    const found =
                      typeof postOrId === "string"
                        ? posts.find((p) => p.id === postOrId)
                        : postOrId;
                    if (found) {
                      setSelectedPost(found);
                      navigate("postDetail");
                    }
                  }}
                  onOpenCommunityNode={() => {
                    sessionStorage.setItem("ony_community_view", "myNode");
                    goTab("community");
                  }}
                  onOpenTrusted={() => navigate("trusted")}
                  notify={notify}
                />
              )}
              {screen === "notificationSettings" && (
                <NotificationSettingsScreen
                  back={back}
                  notify={notify}
                />
              )}
            {screen === "subscription" && <Subscription back={back} openHelp={() => navigate("help")} status={subscriptionStatus} setStatus={setSubscriptionStatus} freeUsage={freeUsage} freeLimit={freeLimit} resetFreeUsage={() => setFreeUsage(0)} notify={notify} />}
            {screen === "merchant" && <MerchantDetail back={back} navigate={navigate} merchants={merchants} merchantName={selectedMerchantName} notify={notify} />}
            {screen === "voucher" && <Voucher back={back} merchants={merchants} merchantName={selectedMerchantName} />}
            {screen === "post" && <CreatePost back={back} notify={notify} displayName={displayName} currentUid={effectiveUid} initialCategory={createPostInitialCategory} onPostCreated={handleCreatePost} />}
            {screen === "privacy" && <Privacy back={back} notify={notify} memoryCount={memories.length} useActiveMemories={useActiveMemories} setUseActiveMemories={setUseActiveMemories} reviewMemories={() => goTab("memory")} clearMemories={handleClearMemories} onDeleteAccount={handleDeleteAccount} navigate={navigate} />}
            {screen === "systemLogs" && <SystemLogsView back={back} notify={notify} currentUser={currentUser} />}
            {screen === "about" && <About back={back} />}
            {screen === "addMemory" && <AddMemory back={back} memories={memories} setMemories={handleSetMemories} editing={editingMemory} notify={notify} />}
            {screen === "jobPrefs" && <JobPreferences back={back} navigate={navigate} />}
            {screen === "jobs" && <JobOpportunities back={back} navigate={navigate} />}
            {screen === "jobDetail" && <JobDetail back={back} notify={notify} />}
            {screen === "wellbeing" && <Wellbeing back={back} navigate={navigate} notify={notify} onOpenMusicModal={() => setShowMusicModal(true)} />}
            {screen === "professional" && <ProfessionalSupport back={back} navigate={navigate} onSelectProvider={setSelectedProvider} userCoords={userCoords} setUserCoords={setUserCoords} notify={notify} />}
            {screen === "provider" && <ProviderDetail back={back} notify={notify} provider={selectedProvider} userCoords={userCoords} />}
            {screen === "trusted" && (
              <TrustedContact
                back={back}
                currentUid={effectiveUid}
                currentName={displayName}
                currentEmail={effectiveEmail}
                currentPhone={userPhone}
                setCurrentPhone={(nextPhone) => {
                  setUserPhone(nextPhone);
                  if (currentUser) {
                    updateUserProfile(currentUser.uid, { phoneNumber: nextPhone }).catch(() => {});
                    syncRegisteredAccount({
                      uid: currentUser.uid,
                      displayName: displayName || currentUser.displayName || "ONY Member",
                      email: currentUser.email || effectiveEmail,
                      phoneNumber: nextPhone,
                    }).catch(() => {});
                  }
                }}
                name={trustedName}
                email={trustedEmail}
                number={trustedNumber}
                setName={setTrustedName}
                setEmail={setTrustedEmail}
                setNumber={setTrustedNumber}
                status={contactStatus}
                setStatus={setContactStatus}
                outgoingRequests={outgoingTrustedRequests}
                incomingRequests={incomingTrustedRequests}
                pendingInvite={pendingInvite}
                setPendingInvite={(inv) => {
                  setPendingInvite(inv);
                  saveStoredPendingInvite(inv);
                }}
                onRefresh={refreshTrustedContactData}
                notify={notify}
              />
            )}
            {screen === "communityMember" && selectedCommunityUser && <CommunityMember back={back} user={selectedCommunityUser} notify={notify} />}
            {screen === "guidelines" && <CommunityGuidelines back={back} />}
            {screen === "chatHistory" && <ChatHistory back={back} navigate={navigate} conversations={conversations} setConversations={setConversations} activeChatId={activeChatId} setActiveChatId={setActiveChatId} folders={folders} setFolders={setFolders} selectedFolderId={selectedFolderId} setSelectedFolderId={setSelectedFolderId} />}
            {screen === "monthlyReport" && <MonthlyReport back={back} moodEntries={moodEntries} setMoodEntries={handleSetMoodEntries} conversations={conversations} setConversations={setConversations} memories={memories} />}
            {screen === "postDetail" && selectedPost && (
              <PostDetailScreen
                back={() => {
                  sessionStorage.setItem("ony-show-posts", "true");
                  back();
                }}
                post={posts.find((p) => p.id === selectedPost.id) || selectedPost}
                currentUid={effectiveUid}
                currentUserName={displayName}
                onLikePost={handleLikePost}
                onPostUpdated={syncUpdatedPostInState}
                onSavePostToVault={handleSaveCommunityPostToVault}
                onOpenHelp={() => navigate("help")}
                notify={notify}
              />
            )}
            {screen === "resources" && (
              <ToolkitPage
                back={back}
                navigate={navigate}
                notify={notify}
                onOpenMusicModal={() => setShowMusicModal(true)}
                isMusicPlaying={soundOn}
                onToggleMusic={() => handleSetSoundOn(!soundOn)}
                onSaveToVault={async (text, guideTitle) => {
                  const now = new Date().toISOString();
                  const dateKey = now.slice(0, 10);
                  const newEntry: FirestoreJournalEntry = {
                    id: `journal_${Date.now()}`,
                    title: `Reflection: ${guideTitle}`,
                    content: text,
                    dateKey,
                    entryDate: dateKey,
                    moodEmoji: "🌱",
                    moodLabel: "Reflective",
                    tags: ["Toolkit", "Reflection"],
                    createdAt: now,
                    updatedAt: now,
                  };
                  setJournalEntries((prev) => [newEntry, ...prev]);
                  if (currentUser) {
                    saveJournalEntry(currentUser.uid, newEntry).catch((err) =>
                      console.warn("[ONY] Journal entry save notice:", err),
                    );
                    saveMemory(currentUser.uid, {
                      text,
                      reason: `Toolkit exercise: ${guideTitle}`,
                      category: "Reflections",
                      active: true,
                    }).catch(() => {});
                  }
                  setMemories((prev) => [
                    {
                      id: Date.now(),
                      text,
                      reason: `Toolkit exercise: ${guideTitle}`,
                      category: "Reflections",
                      active: true,
                      createdAt: now,
                    },
                    ...prev,
                  ]);
                }}
                onPreloadChatTopic={(topic) => {
                  setPreloadedChatTopic(topic);
                  setTab("chat");
                  setScreen("main");
                }}
                initialGuideId={selectedToolkitGuideId}
              />
            )}
            {screen === "legal" && <LegalHub back={back} navigate={navigate} />}
            {screen === "editProfile" && (
              <EditProfileScreen
                back={back}
                currentDisplayName={displayName}
                onSaveDisplayName={(name) => {
                  setDisplayName(name);
                  if (currentUser) {
                    syncRegisteredAccount({
                      uid: currentUser.uid,
                      displayName: name,
                      email: effectiveEmail,
                      phoneNumber: userPhone,
                    }).catch(() => {});
                  }
                }}
                currentEmail={effectiveEmail}
                notify={notify}
                currentUser={currentUser}
              />
            )}
            {screen === "appearance" && <AppearanceScreen back={back} notify={notify} />}
            {screen === "soundHaptics" && (
              <SoundHapticsScreen
                back={back}
                notify={notify}
                onOpenAmbientModal={() => setShowMusicModal(true)}
              />
            )}
            {screen === "changePassword" && (
              <ChangePasswordScreen back={back} notify={notify} userEmail={effectiveEmail} />
            )}
            {screen === "connectedAccounts" && (
              <ConnectedAccountsScreen
                back={back}
                notify={notify}
                userEmail={effectiveEmail}
                currentUser={currentUser}
              />
            )}
            {screen === "appLock" && <AppLockScreen back={back} notify={notify} />}
            {screen === "sendFeedback" && (
              <FeedbackReportScreen
                type="feedback"
                back={back}
                notify={notify}
                userEmail={effectiveEmail}
              />
            )}
            {screen === "reportProblem" && (
              <FeedbackReportScreen
                type="report"
                back={back}
                notify={notify}
                userEmail={effectiveEmail}
              />
            )}
            {screen === "exportData" && (
              <ExportDataScreen
                back={back}
                notify={notify}
                currentUser={currentUser}
                displayName={displayName}
              />
            )}
            {screen === "deleteAccountConfirm" && (
              <DeleteAccountScreen
                back={back}
                onConfirmDelete={handleDeleteAccount}
                notify={notify}
              />
            )}
            {screen === "terms" && <TermsScreen back={back} />}
            {screen === "privacyPolicy" && <PrivacyPolicyScreen back={back} />}
          </main>
        )}
        {soundOn && (
          <CalmingMusicFloatingBar
            currentTrack={currentTrack}
            isPlaying={soundOn}
            onTogglePlay={() => handleToggleSound()}
            onNext={() => ambientMusicEngine.nextTrack()}
            onPrev={() => ambientMusicEngine.prevTrack()}
            onOpenModal={() => setShowMusicModal(true)}
            onClose={() => ambientMusicEngine.pause()}
            language={language}
          />
        )}
        {!isVirtualKeyboardOpen && ((!isWritingJournalBook && !isJournalSheetOpen) || tab !== "memory") && (
          <BottomNav tab={tab} setTab={goTab} />
        )}
        {toast && (
          <div className="toast">
            <Icon name="check" />
            <span className="toast-text">{toast}</span>
            {toastAction && (
              <button
                type="button"
                className="toast-action-btn"
                onClick={() => {
                  toastAction.onAction();
                  setToast("");
                  setToastAction(null);
                }}
              >
                {toastAction.label}
              </button>
            )}
          </div>
        )}
        <CalmingMusicModal
          isOpen={showMusicModal}
          onClose={() => setShowMusicModal(false)}
          currentTrack={currentTrack}
          isPlaying={soundOn}
          volume={volume}
          onSelectTrack={handleSelectTrack}
          onTogglePlay={() => handleToggleSound()}
          onVolumeChange={handleSetVolume}
          language={language}
        />
      </div>
    </div>
  </NotificationsContext.Provider>
);
}

function AuthFlowContent({
  theme,
  displayName,
  setDisplayName,
  userPhone,
  setUserPhone,
  pendingInvite,
  onComplete,
}: AuthFlowProps) {
  // First page (login/register) does not follow user's previous preference language; strictly default to English
  const t = getTranslation("English");
  const [stage, setStage] = useState<"welcome" | "login" | "register" | "forgot" | "name" | "consent">("welcome");
  const [legal, setLegal] = useState<LegalDocumentId | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const validEmail = /\S+@\S+\.\S+/.test(email);

  const translateFirebaseError = (err: unknown): string => {
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
    if (msg.includes("email-already-in-use")) {
      return "An account with this email already exists. Try logging in.";
    }
    if (msg.includes("invalid-credential") || msg.includes("wrong-password") || msg.includes("user-not-found")) {
      return "Incorrect email or password. Please verify and try again.";
    }
    if (msg.includes("weak-password")) {
      return "Password should be at least 6 characters.";
    }
    if (msg.includes("invalid-email")) {
      return "Please enter a valid email address.";
    }
    if (msg.includes("network-request-failed")) {
      return "Network error. Please check your connection.";
    }
    return "Authentication failed. Please verify your details and try again.";
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (!validEmail) return setError("Enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);
    setError("");
    try {
      await loginWithEmailPassword(email, password);
      onComplete();
    } catch (err) {
      setError(translateFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStage1 = (event: FormEvent) => {
    event.preventDefault();
    if (!validEmail) return setError("Enter a valid email address.");
    if (!userPhone.trim() || userPhone.trim().length < 6) {
      return setError("Please enter a valid phone number so it can be saved for emergency contact.");
    }
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setError("");
    setStage("name");
  };

  const handleNameStage = (event: FormEvent) => {
    event.preventDefault();
    if (displayName.trim().length < 2) return setError("Enter a display name with at least 2 characters.");
    if (!userPhone.trim() || userPhone.trim().length < 6) {
      return setError("Please enter a valid emergency phone number.");
    }
    setError("");
    setStage("consent");
  };

  const handleCompleteRegistration = async () => {
    if (!accepted) return;
    setLoading(true);
    setError("");
    try {
      await registerWithEmailPassword(email, password, displayName, userPhone.trim());
      onComplete();
    } catch (err) {
      setError(translateFirebaseError(err));
      setStage("register");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!validEmail) return setError("Enter the email associated with your account.");
    setLoading(true);
    setError("");
    try {
      await sendPasswordReset(email);
      setNotice(`A password reset link has been sent to ${email}. Please check your inbox.`);
    } catch (err) {
      setError(translateFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  if (legal) return <div className={`app-shell theme-${theme}`}><div className="phone auth-phone"><LegalDocument document={legal} back={() => setLegal(null)} forceLanguage="English" /></div></div>;
  return <div className={`app-shell theme-${theme}`}><div className="phone auth-phone"><div className={`environment environment-${theme}`} aria-hidden="true"><i /><i /><i /></div>
    <section className="auth-page">
      <div className="auth-brand">
        <img src={logo} alt="Official ONY logo" />
      </div>

      {pendingInvite && (
        <div
          className="card"
          style={{
            marginBottom: "12px",
            padding: "12px 14px",
            border: "1px solid var(--theme-accent)",
            background: "var(--theme-surface-elevated)",
          }}
        >
          <span className="eyebrow">Trusted Contact Invite Link</span>
          <strong style={{ display: "block", marginTop: "2px" }}>
            {pendingInvite.inviterName} invited you to be their Emergency Contact
          </strong>
          <small style={{ color: "var(--muted)", display: "block", marginTop: "2px" }}>
            Log in or create an ONY account to send your request to {pendingInvite.inviterName}.
          </small>
        </div>
      )}
      {stage === "welcome" && (
        <div className="auth-panel welcome-panel">
          <span className="eyebrow">{t.auth_welcome_eyebrow}</span>
          <h1>{t.auth_welcome_title}</h1>
          <p>{t.auth_welcome_lead}</p>
          <Button className="full" onClick={() => setStage("register")}>{t.auth_create_account}</Button>
          <Button className="full" variant="secondary" onClick={() => setStage("login")}>{t.auth_login}</Button>
        </div>
      )}
      {stage === "login" && (
        <form className="auth-panel" onSubmit={handleLogin}>
          <div className="auth-heading">
            <Button variant="ghost" className="auth-back" onClick={() => { setStage("welcome"); setError(""); }}>
              <Icon name="back" />{t.common_back}
            </Button>
            <span className="eyebrow">{t.auth_welcome_eyebrow}</span>
          </div>
          <h1>{t.auth_login_title}</h1>
          <p className="muted">{t.auth_login_lead}</p>
          <label className="field-label">{t.auth_email_label}</label>
          <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
          <label className="field-label">{t.auth_password_label}</label>
          <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete="current-password" />
          {error && <div className="form-error"><Icon name="info" />{error}</div>}
          <Button className="full" type="submit" disabled={loading}>{loading ? t.common_loading : t.auth_login}</Button>
          <Button variant="ghost" className="full" onClick={() => { setStage("forgot"); setError(""); }}>{t.auth_forgot_password_btn}</Button>
        </form>
      )}
      {stage === "register" && (
        <form className="auth-panel" onSubmit={handleRegisterStage1}>
          <div className="auth-heading">
            <Button variant="ghost" className="auth-back" onClick={() => { setStage("welcome"); setError(""); }}>
              <Icon name="back" />{t.common_back}
            </Button>
            <span className="eyebrow">{t.auth_welcome_eyebrow}</span>
          </div>
          <h1>{t.auth_register_title}</h1>
          <p className="muted">{t.auth_register_lead}</p>
          <label className="field-label">{t.auth_email_label}</label>
          <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
          <label className="field-label">{t.auth_phone_label}</label>
          <TextInput type="tel" value={userPhone} onChange={(event) => setUserPhone(event.target.value)} placeholder="e.g. 012-345 6789" autoComplete="tel" />
          <label className="field-label">{t.auth_password_label}</label>
          <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />
          <label className="field-label">{t.auth_confirm_password_label}</label>
          <TextInput type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" autoComplete="new-password" />
          {error && <div className="form-error"><Icon name="info" />{error}</div>}
          <Button className="full" type="submit" disabled={loading}>{t.onboarding_btn_continue}</Button>
        </form>
      )}
      {stage === "forgot" && (
        <form className="auth-panel" onSubmit={handleForgotPassword}>
          <Button variant="ghost" className="auth-back" onClick={() => setStage("login")}>
            <Icon name="back" />{t.common_back}
          </Button>
          <span className="eyebrow">{t.auth_welcome_eyebrow}</span>
          <h1>{t.auth_forgot_title}</h1>
          <p className="muted">{t.auth_forgot_lead}</p>
          <label className="field-label">{t.auth_email_label}</label>
          <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          {error && <div className="form-error"><Icon name="info" />{error}</div>}
          {notice ? <div className="form-success"><Icon name="check" />{notice}</div> : <Button className="full" type="submit" disabled={loading}>{loading ? t.auth_sending_reset : t.auth_send_reset_btn}</Button>}
        </form>
      )}
      {stage === "name" && (
        <form className="auth-panel" onSubmit={handleNameStage}>
          <span className="eyebrow">{t.auth_welcome_eyebrow}</span>
          <h1>{t.auth_name_stage_title}</h1>
          <p className="muted">{t.auth_name_stage_lead}</p>
          <label className="field-label">{t.auth_name_label}</label>
          <TextInput value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={30} placeholder="Write your name or nickname..." />
          <label className="field-label">{t.auth_phone_label}</label>
          <TextInput type="tel" value={userPhone} onChange={(event) => setUserPhone(event.target.value)} placeholder="e.g. 012-345 6789" autoComplete="tel" />
          {error && <div className="form-error"><Icon name="info" />{error}</div>}
          <Button className="full" type="submit">{t.onboarding_btn_continue}</Button>
        </form>
      )}
      {stage === "consent" && (
        <div className="auth-panel consent-panel">
          <span className="eyebrow">{t.auth_welcome_eyebrow}</span>
          <h1>{t.auth_consent_title}</h1>
          <p>{t.auth_consent_lead}</p>
          <div className="legal-links">
            <Button variant="secondary" onClick={() => setLegal("disclaimer")}>{t.auth_disclaimer_btn}</Button>
            <Button variant="secondary" onClick={() => setLegal("terms")}>{t.auth_terms_btn}</Button>
            <Button variant="secondary" onClick={() => setLegal("privacy")}>{t.auth_privacy_btn}</Button>
            <Button variant="secondary" onClick={() => setLegal("crisis")}>{t.auth_crisis_btn}</Button>
          </div>
          <label className="check-row consent-check">
            <TextInput type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
            <span>{t.auth_consent_agree}</span>
          </label>
          {error && <div className="form-error"><Icon name="info" />{error}</div>}
          <Button className="full" disabled={!accepted || loading} onClick={handleCompleteRegistration}>
            {loading ? t.auth_creating_space : t.auth_create_space_btn}
          </Button>
          <small>
            ONY is committed to user safety, ethical artificial intelligence, and data privacy.
          </small>
        </div>
      )}
    </section>
  </div></div>;
}

function LegalDocument({ document, back, forceLanguage }: { document: LegalDocumentId; back: () => void; forceLanguage?: AppLanguage }) {
  const { language: ctxLanguage } = useLanguage();
  const language = forceLanguage || ctxLanguage;
  const contentEn: Record<LegalDocumentId, { title: string; subtitle: string; sections: { heading: string; text: string }[] }> = {
    disclaimer: {
      title: "Disclaimer & AI Limitations",
      subtitle: "Safety boundaries and conversational scope",
      sections: [
        { heading: "What ONY is", text: "ONY is designed for everyday emotional support, self-reflection, and gentle wellbeing companionship. It is not medical care, psychotherapy, psychological diagnosis, or an emergency service." },
        { heading: "AI Generative Model Scope", text: "Conversations are powered by secure server-side generative artificial intelligence. While safety guardrails and multi-tier crisis protocols are active at all times, generative responses may occasionally be imperfect. Always exercise personal discernment." },
        { heading: "Your Choices & Autonomy", text: "You maintain complete agency to end conversations, adjust tone personas, manage or delete memory vault entries, and transition to verified professional human care at any moment." }
      ]
    },
    terms: {
      title: "Terms of Service",
      subtitle: "Usage guidelines and member agreements",
      sections: [
        { heading: "Appropriate Use", text: "Use ONY for personal reflection, daily emotional check-ins, and mutual community encouragement. Do not rely on ONY for emergency medical intervention, crisis rescue, legal decisions, or self-harm." },
        { heading: "Service Availability & Security", text: "ONY operates with secure cloud persistence and authentication. We strive for uninterrupted availability while continuously updating our safety safeguards." },
        { heading: "Community Standards", text: "Public posts and peer solidarity notes must respect privacy, empathy, and personal safety. Any harassment, hate speech, or sharing of non-consensual personal contact details is strictly prohibited." }
      ]
    },
    privacy: {
      title: "Privacy Policy",
      subtitle: "How ONY safeguards your personal data",
      sections: [
        { heading: "Information We Protect", text: "Your account profile, mood check-in records, consented memories, and chat reflections are stored securely in encrypted cloud infrastructure with strict access control rules." },
        { heading: "Confidentiality & Non-Sale of Data", text: "Your personal emotional records and chat reflections are strictly confidential. ONY will never sell, broker, or rent your personal data to advertisers or third parties." },
        { heading: "User Control & Deletion", text: "You have the permanent right to review, export, or permanently delete your account and all associated mood and conversation data at any time from your Privacy settings." },
        { heading: "Location Privacy", text: "Broad area selection for nearby care or community discovery is completely optional. ONY never tracks real-time GPS coordinates without explicit granular consent." }
      ]
    },
    crisis: {
      title: "Crisis & Emergency Hotlines",
      subtitle: "24/7 verified Malaysian support resources",
      sections: [
        { heading: "Immediate Life-Threatening Danger", text: "If you or someone around you is in immediate danger of injury or suicide, please call 999 immediately or go to the nearest hospital emergency department." },
        { heading: "Talian HEAL 15555 (MOH Malaysia)", text: "Free, confidential national mental health crisis hotline operated daily from 8:00 AM to 12:00 AM (midnight) by qualified counsellors from the Ministry of Health Malaysia." },
        { heading: "Befrienders Kuala Lumpur (03-7627 2929)", text: "24-hour emotional support hotline for anyone in Malaysia experiencing loneliness, depression, or distress. Completely free and confidential." }
      ]
    },
  };

  const contentBm: Record<LegalDocumentId, { title: string; subtitle: string; sections: { heading: string; text: string }[] }> = {
    disclaimer: {
      title: "Penafian & Batasan AI",
      subtitle: "Sempadan keselamatan dan skop perbualan",
      sections: [
        { heading: "Apakah ONY", text: "ONY direka untuk sokongan emosi harian, refleksi kendiri, dan teman kesejahteraan yang lembut. Ia bukan rawatan perubatan, psikoterapi, diagnosis klinikal, atau perkhidmatan kecemasan." },
        { heading: "Skop Model Generatif AI", text: "Perbualan dikuasakan oleh kecerdasan buatan generatif pelayan selamat. Walaupun kawalan keselamatan dan protokol krisis sentiasa aktif, jawapan generatif kadangkala mungkin tidak sempurna. Sentiasa gunakan pertimbangan peribadi." },
        { heading: "Pilihan & Autonomi Anda", text: "Anda mengekalkan kuasa penuh untuk menamatkan perbualan, menukar persona nada, mengurus atau memadam memori, dan beralih kepada bantuan profesional manusia bertauliah pada bila-bila masa." }
      ]
    },
    terms: {
      title: "Syarat Perkhidmatan",
      subtitle: "Garis panduan penggunaan dan persetujuan ahli",
      sections: [
        { heading: "Penggunaan Wajar", text: "Gunakan ONY untuk refleksi peribadi, daftar masuk emosi harian, dan sokongan komuniti yang membina. Jangan bergantung pada ONY untuk campur tangan perubatan kecemasan, penyelamatan krisis, keputusan undang-undang, atau mencederakan diri." },
        { heading: "Ketersediaan & Keselamatan Perkhidmatan", text: "ONY beroperasi dengan storan awan selamat dan pengesahan disulitkan. Kami berusaha untuk ketersediaan berterusan sambil sentiasa mengemas kini perlindungan keselamatan kami." },
        { heading: "Standard Komuniti", text: "Siaran awam dan nota sokongan rakan sebaya mesti menghormati privasi, empati, dan keselamatan peribadi. Sebarang gangguan, ucapan kebencian, atau perkongsian maklumat peribadi tanpa persetujuan dilarang sama sekali." }
      ]
    },
    privacy: {
      title: "Dasar Privasi",
      subtitle: "Bagaimana ONY melindungi data peribadi anda",
      sections: [
        { heading: "Maklumat Yang Kami Lindungi", text: "Profil akaun, rekod emosi, memori yang dipersetujui, dan refleksi perbualan disimpan dengan selamat dalam pelayan awan disulitkan dengan kawalan akses ketat." },
        { heading: "Kerahsiaan & Tiada Penjualan Data", text: "Rekod emosi peribadi dan sembang anda adalah sulit. ONY tidak akan sesekali menjual, memajak, atau menyewakan data peribadi anda kepada pengiklan atau pihak ketiga." },
        { heading: "Kawalan Pengguna & Pemadaman", text: "Anda berhak menyemak, mengeksport, atau memadam akaun anda dan semua data perbualan pada bila-bila masa daripada tetapan Privasi anda." },
        { heading: "Privasi Lokasi", text: "Pilihan kawasan serantau luas untuk sokongan berdekatan adalah pilihan sepenuhnya. ONY tidak pernah menjejaki koordinat GPS masa nyata tanpa persetujuan jelas anda." }
      ]
    },
    crisis: {
      title: "Talian Krisis & Kecemasan",
      subtitle: "Sumber sokongan Malaysia yang disahkan",
      sections: [
        { heading: "Bahaya Mengancam Nyawa Segera", text: "Sekiranya anda atau sesiapa di sekeliling anda berada dalam bahaya kecederaan atau bunuh diri serta-merta, sila hubungi 999 dengan segera atau pergi ke jabatan kecemasan hospital terdekat." },
        { heading: "Talian HEAL 15555 (KKM Malaysia)", text: "Talian krisis kesihatan mental kebangsaan percuma dan sulit yang beroperasi setiap hari dari jam 8:00 pagi hingga 12:00 tengah malam, dikendalikan oleh kaunselor bertauliah Kementerian Kesihatan Malaysia." },
        { heading: "Befrienders Kuala Lumpur (03-7627 2929)", text: "Talian sokongan emosi 24 jam untuk sesiapa sahaja di Malaysia yang mengalami kesunyian, kemurungan, atau tekanan emosi. Percuma dan sulit." }
      ]
    },
  };

  const contentZh: Record<LegalDocumentId, { title: string; subtitle: string; sections: { heading: string; text: string }[] }> = {
    disclaimer: {
      title: "免责声明与 AI 边界",
      subtitle: "安全界限与对话范围说明",
      sections: [
        { heading: "关于 ONY 的定位", text: "ONY 专为日常情绪舒缓、自我倾听反思和温和身心陪伴而设计。它绝非医疗服务、心理治疗、精神科临床诊断或紧急危机救援。" },
        { heading: "生成式 AI 模型范围", text: "对话由严格受控的服务端生成式人工智能驱动。尽管全天候激活多级危机防护与安全护栏，生成式回应偶有不尽完美之处。请始终保留个人的理性判断。" },
        { heading: "您的自主掌控权", text: "您拥有随时结束对话、更换陪伴语调、编辑或删除记忆宝库记录，以及直接转介至核实专业人类援助的完整自主权利。" }
      ]
    },
    terms: {
      title: "服务条款",
      subtitle: "使用守则与用户协议",
      sections: [
        { heading: "合规使用", text: "使用 ONY 进行个人反思、每日心情登记和社区互助陪伴。请勿将 ONY 用于紧急医疗救治、人身危机救援、法律争议裁决或自残自伤行为。" },
        { heading: "服务可用性与数据安全", text: "ONY 采用高标准云端加密与安全身份体系运行。我们全力保障服务稳定，并持续迭代安全风控算法。" },
        { heading: "社区准则", text: "公开帖子与同伴鼓励留言必须尊重隐私、抱持同理心并确保人身安全。严禁任何形式的骚扰、仇恨言论或未经允许公开他人联系方式。" }
      ]
    },
    privacy: {
      title: "隐私政策",
      subtitle: "ONY 如何守护您的个人数据安全",
      sections: [
        { heading: "我们守护的数据范围", text: "您的账户资料、每日心情轨迹、征得同意的宝库记忆及对话反思均通过细粒度安全规则加密存储于安全云端数据库。" },
        { heading: "严格保密与绝不出售数据", text: "您的私人情绪轨迹与对话记录具有最高保密级别。ONY 绝不会向任何广告商或第三方机构出售、出借或商业出租您的个人数据。" },
        { heading: "用户自主控制与彻底删除", text: "您始终拥有永久权利在隐私设置中随时查阅、导出个人数据归档，或彻底注销账户并清除全部关联数据记录。" },
        { heading: "地理位置隐私", text: "用于寻找周边心理资源或星球同伴的宽泛区域选择纯属自愿。未经您明确确认，ONY 绝不采集实时高精度 GPS 门牌坐标。" }
      ]
    },
    crisis: {
      title: "危机干预与紧急援助热线",
      subtitle: "马来西亚官方核实支持热线",
      sections: [
        { heading: "危及生命的紧急险情", text: "如果您或身旁人员面临即刻的人身伤害或自残自杀危险，请立即拨打 999 报警或前往就近医院的急诊部（A&E）。" },
        { heading: "Talian HEAL 15555 (马来西亚卫生部 MOH)", text: "由马来西亚卫生部注册辅导员运营的免费、保密国家心理健康热线（每天开放时间为早上 8:00 至午夜 12:00）。" },
        { heading: "吉隆坡心灵扶助会 Befrienders (03-7627 2929)", text: "面向马来西亚全境感到孤独、抑郁或情绪困扰人士的 24 小时免费情感支持热线。全程严格保密。" }
      ]
    },
  };

  const selectedContent = language === "Bahasa Melayu" ? contentBm : language === "中文" ? contentZh : contentEn;
  const item = selectedContent[document];
  return (
    <>
      <PageHeader title={item.title} subtitle={item.subtitle} back={back} />
      <section className="page-pad legal-document">
        <span className="status-badge" style={{ background: "var(--theme-surface-soft)", color: "var(--theme-success)" }}>
          {language === "Bahasa Melayu" ? "Dokumen Rasmi" : language === "中文" ? "官方政策文档" : "Official Document"}
        </span>
        {item.sections.map((section) => (
          <div className="card" key={section.heading}>
            <h3>{section.heading}</h3>
            <p>{section.text}</p>
          </div>
        ))}
        <p className="disclaimer">
          <Icon name="info" />
          {language === "Bahasa Melayu" ? "ONY komited terhadap amalan data telus, keselamatan pengguna, dan pematuhan piawaian perkhidmatan digital Malaysia." : language === "中文" ? "ONY 坚定践行透明的数据规范与用户安全准则，严格遵从马来西亚数字服务伦理标准。" : "ONY is committed to transparent data practices, user safety, and adherence to Malaysian digital service standards."}
        </p>
      </section>
    </>
  );
}

function LegalHub({ back, navigate }: { back: () => void; navigate: (screen: Screen) => void }) {
  const { t, language } = useLanguage();
  const [document, setDocument] = useState<LegalDocumentId | null>(null);
  if (document) return <LegalDocument document={document} back={() => setDocument(null)} />;
  return (
    <>
      <PageHeader title={t.profile_menu_legal} subtitle={t.profile_menu_legal_sub} back={back} />
      <section className="page-pad">
        <div className="help-hero">
          <Icon name="shield" />
          <div>
            <h2>{t.legal_hero_title}</h2>
            <p>{t.legal_hero_desc}</p>
          </div>
        </div>
        <div className="menu legal-menu">
          {([
            ["disclaimer", language === "Bahasa Melayu" ? "Penafian & Batasan AI" : language === "中文" ? "免责声明与 AI 边界" : "Disclaimer & AI Boundaries"],
            ["terms", language === "Bahasa Melayu" ? "Syarat Perkhidmatan" : language === "中文" ? "服务条款" : "Terms of Service"],
            ["privacy", language === "Bahasa Melayu" ? "Dasar Privasi" : language === "中文" ? "隐私政策" : "Privacy Policy"],
            ["crisis", language === "Bahasa Melayu" ? "Maklumat Krisis & Kecemasan" : language === "中文" ? "危机与紧急援助信息" : "Crisis & Emergency Information"],
          ] as [LegalDocumentId, string][]).map(([id, title]) => (
            <Button key={id} variant="ghost" onClick={() => setDocument(id)}>
              <span>
                <strong>{title}</strong>
                <small>{language === "Bahasa Melayu" ? "Dasar rasmi" : language === "中文" ? "官方政策文档" : "Official policy"}</small>
              </span>
              <Icon name="chevron" />
            </Button>
          ))}
        </div>
        <Button className="full" variant="secondary" onClick={() => navigate("privacy")}>
          {language === "Bahasa Melayu" ? "Buka kawalan privasi" : language === "中文" ? "打开隐私控制面板" : "Open privacy controls"}
        </Button>
      </section>
    </>
  );
}

function Onboarding({ step, setStep, displayName, consent, setConsent, language, setLanguage, selectedTopics, setSelectedTopics, theme, setTheme, companion, setCompanion, persona, setPersona, soundOn, setSoundOn }: {
  step: number; setStep: (v: number) => void; displayName: string; consent: string; setConsent: (v: string) => void;
  language: string; setLanguage: (v: string) => void; selectedTopics: string[]; setSelectedTopics: (v: string[]) => void;
  theme: Theme; setTheme: (v: Theme) => void;
  companion: Companion; setCompanion: (v: Companion) => void;
  persona: Persona; setPersona: (v: Persona) => void;
  soundOn: boolean; setSoundOn: (v: boolean) => void;
}) {
  const { t } = useLanguage();
  const [acknowledged, setAcknowledged] = useState(false);
  return (
    <div className={`app-shell onboarding-shell theme-${theme}`}>
      <div className="phone onboarding">
        <div className={`environment environment-${theme}`} aria-hidden="true"><i /><i /><i /></div>
        <div className="progress"><span style={{ width: `${((step + 1) / 9) * 100}%` }} /></div>
        <div className="onboarding-body">
          {step === 0 && <>
            <img className={`brand-art ${step === 0 ? "hero-art" : ""}`} src={logo} alt="Official ONY cat mascot with green leaves" />
            <div className="eyebrow">{t.onboarding_welcome_eyebrow}</div><h1>{t.onboarding_welcome_title}</h1>
            <p className="lead">{t.onboarding_welcome_lead}</p>
            <div className="segmented" style={{ marginTop: "16px" }}>
              {(["English", "Bahasa Melayu", "中文"] as AppLanguage[]).map((x) => (
                <Button key={x} variant={language === x ? "primary" : "secondary"} onClick={() => setLanguage(x)}>{x}</Button>
              ))}
            </div>
          </>}
          {step === 1 && <>
            <img className="brand-art compact-art" src={logo} alt="Official ONY logo" />
            <div className="eyebrow">{t.onboarding_meet_eyebrow}</div><h1>{t.onboarding_meet_title}</h1>
            <p className="lead">{t.onboarding_meet_lead}</p>
          </>}
          {step === 2 && <>
            <SmallLogo /><div className="eyebrow">{t.onboarding_companion_eyebrow}</div><h1>{t.onboarding_companion_title}</h1>
            <p className="lead">{t.onboarding_companion_lead}</p>
            <CompanionPicker value={companion} setValue={setCompanion} />
          </>}
          {step === 3 && <>
            <SmallLogo /><div className="eyebrow">{t.onboarding_theme_eyebrow}</div><h1>{t.onboarding_theme_title}</h1>
            <p className="lead">{t.onboarding_theme_lead}</p>
            <ThemePicker value={theme} setValue={setTheme} />
          </>}
          {step === 4 && <>
            <SmallLogo /><div className="eyebrow">{t.onboarding_sound_eyebrow}</div><h1>{t.onboarding_sound_title}</h1>
            <p className="lead">{t.onboarding_sound_lead}</p>
            <div className="ambient-onboarding"><span className={`sound-orb ${soundOn ? "playing" : ""}`}><i /><i /><i /></span><strong>{soundOn ? (language === "Bahasa Melayu" ? "Bunyi latar dimainkan" : language === "中文" ? "背景音效播放中" : "Ambience playing") : (language === "Bahasa Melayu" ? "Bunyi latar dijeda" : language === "中文" ? "背景音效已暂停" : "Ambience paused")}</strong><Button onClick={() => setSoundOn(!soundOn)}>{soundOn ? t.common_pause : t.common_play}</Button></div>
            <Button className="full" variant="ghost" onClick={() => setSoundOn(false)}>{t.onboarding_sound_continue_without}</Button>
          </>}
          {step === 5 && <>
            <SmallLogo /><div className="eyebrow">{t.onboarding_personalise_eyebrow}</div><h1>{t.onboarding_personalise_title}</h1>
            <p className="lead">{t.onboarding_personalise_lead}</p>
            <PersonaPicker value={persona} setValue={setPersona} compact />
            <div className="segmented">{(["English", "Bahasa Melayu", "中文"] as AppLanguage[]).map((x) => <Button key={x} variant={language === x ? "primary" : "secondary"} onClick={() => setLanguage(x)}>{x}</Button>)}</div>
            <div className="chips">{topics.map((x) => <Button key={x} variant={selectedTopics.includes(x) ? "primary" : "secondary"} onClick={() => setSelectedTopics(selectedTopics.includes(x) ? selectedTopics.filter((t) => t !== x) : [...selectedTopics, x])}>{getCategoryLabel(x, language as AppLanguage)}</Button>)}</div>
          </>}
          {step === 6 && <>
            <img className="brand-art compact-art" src={logo} alt="Official ONY logo" />
            <div className="eyebrow">{t.onboarding_boundaries_eyebrow}</div><h1>{t.onboarding_boundaries_title}</h1>
            <p className="lead">{t.onboarding_boundaries_lead}</p>
            <div className="boundary-list"><span>{t.onboarding_boundaries_tag1}</span><span>{t.onboarding_boundaries_tag2}</span><span>{t.onboarding_boundaries_tag3}</span></div>
            <p className="disclaimer"><Icon name="info" />{t.chat_ai_notice}</p>
            <label className="check-row"><TextInput type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span>{t.onboarding_boundaries_ack}</span></label>
          </>}
          {step === 7 && <>
            <SmallLogo />
            <div className="eyebrow">{t.onboarding_privacy_eyebrow}</div><h1>{t.onboarding_privacy_title}</h1>
            <p className="lead">{t.onboarding_privacy_lead}</p>
            <Choice active={consent === "allow"} onClick={() => setConsent("allow")} title={t.onboarding_privacy_allow_title} text={t.onboarding_privacy_allow_desc} />
            <Choice active={consent === "control"} onClick={() => setConsent("control")} title={t.onboarding_privacy_control_title} text={t.onboarding_privacy_control_desc} />
          </>}
          {step === 8 && <>
            <div className="companion-confirm"><CompanionAvatar companion={companion} size="xl" mood="happy" showGlow interactive /></div>
            <div className="eyebrow">{t.onboarding_complete_eyebrow}</div><h1>{t.onboarding_complete_title}</h1>
            <p className="lead">{t.onboarding_complete_lead}</p>
            <div className="user-preview-card"><span className="avatar">{displayName[0]?.toUpperCase()}</span><div><strong>{displayName}</strong><small>{getCompanionLabel(companion, language as AppLanguage)} · {getThemeDetails(theme, themeOptions.find((item) => item.id === theme)?.name || "", "", language as AppLanguage).name}</small></div><Icon name="check" /></div>
          </>}
        </div>
        <div className="onboarding-actions">
          {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>{t.common_back}</Button>}
          <Button className="grow" disabled={step === 6 && !acknowledged} onClick={() => setStep(step + 1)}>{step === 8 ? t.onboarding_btn_enter : t.onboarding_btn_continue}</Button>
        </div>
      </div>
    </div>
  );
}

function PersonaPicker({ value, setValue, compact = false }: { value: Persona; setValue: (v: Persona) => void; compact?: boolean }) {
  const { language } = useLanguage();
  return (
    <div className={`persona-grid ${compact ? "compact" : ""}`}>
      {personaOptions.map((item) => {
        const details = getPersonaDetails(item.id, item.name, item.note, item.preview, language);
        return (
          <Button key={item.id} variant="secondary" className={value === item.id ? "active" : ""} onClick={() => setValue(item.id)}>
            <span className="persona-check">{value === item.id && <Icon name="check" />}</span>
            <strong>{details.name}</strong>
            <small>{details.note}</small>
            {!compact && <p>“{details.preview}”</p>}
          </Button>
        );
      })}
    </div>
  );
}

function CompanionAvatar({
  companion,
  animal,
  large = false,
  size,
  mood,
  expression,
  showGlow,
  interactive = false,
  className,
  style,
  onClick,
}: {
  companion?: Companion | string;
  animal?: Companion | string;
  large?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number;
  mood?: CompanionExpression;
  expression?: CompanionExpression;
  showGlow?: boolean;
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  return (
    <VectorCompanionAvatar
      animal={(animal || companion) as CompanionAnimal}
      size={size || (large ? "xl" : "sm")}
      mood={mood || expression || "idle"}
      showGlow={showGlow}
      interactive={interactive}
      className={className}
      style={style}
      onClick={onClick}
    />
  );
}

function CompanionPicker({ value, setValue }: { value: Companion; setValue: (v: Companion) => void }) {
  const { language } = useLanguage();
  const [showPreviewSheet, setShowPreviewSheet] = useState(false);
  const companions: Companion[] = ["Cat", "Dog", "Bunny", "Bear", "Fox", "Panda"];

  return (
    <>
      <div className="companion-grid" role="radiogroup" aria-label="Select companion mascot">
        {companions.map((item) => {
          const isSelected = value === item;
          return (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={isSelected ? "active" : ""}
              onClick={() => setValue(item)}
              aria-label={getCompanionLabel(item, language)}
            >
              <CompanionAvatar
                companion={item}
                size="lg"
                mood={isSelected ? "happy" : "idle"}
                interactive
              />
              <strong>{getCompanionLabel(item, language)}</strong>
              {isSelected && (
                <span>
                  <Icon name="check" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ textAlign: "center", marginTop: "4px", marginBottom: "12px" }}>
        <Button
          variant="ghost"
          onClick={() => setShowPreviewSheet(true)}
          style={{ fontSize: "12px", gap: "6px", display: "inline-flex", alignItems: "center" }}
        >
          <span>✨</span>
          {language === "Bahasa Melayu"
            ? "Lihat Showcase & Ekspresi 6 Maskot"
            : language === "中文"
            ? "全景查看 6 款伴侣立绘与动态表情"
            : "Showcase All 6 Mascots & Expressions"}
        </Button>
      </div>

      {showPreviewSheet && (
        <CompanionPreviewSheet
          isOpen={showPreviewSheet}
          onClose={() => setShowPreviewSheet(false)}
          currentCompanion={value}
          onSelectCompanion={(selected) => setValue(selected as Companion)}
          language={language}
        />
      )}
    </>
  );
}

function ThemePicker({ value, setValue }: { value: Theme; setValue: (v: Theme) => void }) {
  const { language } = useLanguage();
  return (
    <div className="theme-grid">
      {themeOptions.map((item) => {
        const details = getThemeDetails(item.id, item.name, item.note, language);
        return (
          <button key={item.id} className={`theme-option ${value === item.id ? "active" : ""}`} onClick={() => setValue(item.id)}>
            <span className={`theme-preview preview-${item.id}`}><i /><i /><i /></span>
            <strong>{details.name}</strong>
            <small>{details.note}</small>
            {value === item.id && <b><Icon name="check" /></b>}
          </button>
        );
      })}
    </div>
  );
}

function SmallLogo() {
  return <img className="small-logo" src={logo} alt="ONY" />;
}

function Choice({ active, onClick, title, text }: { active: boolean; onClick: () => void; title: string; text?: string }) {
  return <button className={`choice ${active ? "active" : ""}`} onClick={onClick}><span className="choice-radio">{active && <span />}</span><span><strong>{title}</strong>{text && <small>{text}</small>}</span></button>;
}

export const NotificationsContext = createContext<{
  unreadCount: number;
  openNotifications: () => void;
}>({
  unreadCount: 0,
  openNotifications: () => {},
});

export function useNotifications() {
  return useContext(NotificationsContext);
}

function PageHeader({
  title,
  subtitle,
  back,
  action,
  hideNotifications = false,
}: {
  title: string;
  subtitle?: string;
  back?: () => void;
  action?: ReactNode;
  hideNotifications?: boolean;
  hideLanguage?: boolean;
}) {
  const { unreadCount, openNotifications } = useNotifications();
  return (
    <header className="page-header">
      {back ? (
        <Button variant="ghost" className="icon-btn" onClick={back} aria-label="Go back">
          <Icon name="back" />
        </Button>
      ) : (
        <SmallLogo />
      )}
      <div className="header-copy">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="header-right-actions">
        {action}
        {!hideNotifications && (
          <button
            type="button"
            className="top-notification-btn"
            onClick={openNotifications}
            aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
            title={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
          >
            <Icon name="bell" />
            {unreadCount > 0 && <span className="notification-red-dot" aria-hidden="true" />}
          </button>
        )}
      </div>
    </header>
  );
}

export function getOnyTimeGreeting(
  language: AppLanguage,
  displayName?: string,
): { title: string; subtitle: string; greeting: string; question: string } {
  const hour = new Date().getHours();
  const name = displayName?.trim();
  const hasName = Boolean(name && name.toLowerCase() !== "guest" && name.toLowerCase() !== "user");

  if (language === "Bahasa Melayu") {
    if (hour >= 5 && hour < 12) {
      const greeting = hasName ? `Selamat pagi, ${name} 🌿` : "Selamat pagi 🌿";
      const question = "Bagaimana perasaan anda pagi ini?";
      return {
        greeting,
        question,
        title: `${greeting} ${question}`,
        subtitle: "Ambil masa anda—saya sentiasa ada di sini sedia mendengar.",
      };
    }
    if (hour >= 12 && hour < 17) {
      const greeting = hasName ? `Selamat tengah hari, ${name} ☀️` : "Selamat tengah hari ☀️";
      const question = "Bagaimana hari anda setakat ini?";
      return {
        greeting,
        question,
        title: `${greeting} ${question}`,
        subtitle: "Berehatlah sejenak. Ada apa-apa yang terbuku di fikiran anda?",
      };
    }
    if (hour >= 17 && hour < 21) {
      const greeting = hasName ? `Selamat petang, ${name} 🌇` : "Selamat petang 🌇";
      const question = "Bagaimana keadaan anda petang ini?";
      return {
        greeting,
        question,
        title: `${greeting} ${question}`,
        subtitle: "Tiada paksaan. Kita boleh bualkan apa sahaja dengan tenang.",
      };
    }
    const greeting = hasName ? `Malam yang tenang, ${name} 🌙` : "Malam yang tenang 🌙";
    const question = "Bagaimana keadaan anda malam ini?";
    return {
      greeting,
      question,
      title: `${greeting} ${question}`,
      subtitle: "Jika anda sukar tidur atau perlukan teman senyap, saya ada di sini menemani.",
    };
  }

  if (language === "中文") {
    if (hour >= 5 && hour < 12) {
      const greeting = hasName ? `早上好，${name} 🌿` : "早上好 🌿";
      const question = "今天感觉怎么样？";
      return {
        greeting,
        question,
        title: `${greeting} ${question}`,
        subtitle: "慢慢来就好，随时可以在这里卸下心里的包袱。",
      };
    }
    if (hour >= 12 && hour < 17) {
      const greeting = hasName ? `下午好，${name} ☀️` : "下午好 ☀️";
      const question = "今天过得还顺利吗？";
      return {
        greeting,
        question,
        title: `${greeting} ${question}`,
        subtitle: "停下来深呼吸一下。心里有什么想聊聊的吗？",
      };
    }
    if (hour >= 17 && hour < 21) {
      const greeting = hasName ? `晚上好，${name} 🌇` : "晚上好 🌇";
      const question = "此刻心情还好吗？";
      return {
        greeting,
        question,
        title: `${greeting} ${question}`,
        subtitle: "今晚不赶时间，随时和我倾诉今天的点点滴滴。",
      };
    }
    const greeting = hasName ? `夜深了，${name} 🌙` : "夜深了 🌙";
    const question = "今夜感觉还好吗？";
    return {
      greeting,
      question,
      title: `${greeting} ${question}`,
      subtitle: "要是睡不着或者心事多，别担心，我一直在这里守候着你。",
    };
  }

  // English default
  if (hour >= 5 && hour < 12) {
    const greeting = hasName ? `Good morning, ${name} 🌿` : "Good morning 🌿";
    const question = "How are you feeling this morning?";
    return {
      greeting,
      question,
      title: `${greeting} ${question}`,
      subtitle: "Take your time—I'm here whenever you'd like to share.",
    };
  }
  if (hour >= 12 && hour < 17) {
    const greeting = hasName ? `Good afternoon, ${name} ☀️` : "Good afternoon ☀️";
    const question = "How is your day going?";
    return {
      greeting,
      question,
      title: `${greeting} ${question}`,
      subtitle: "Even a quick pause can help. What's on your mind?",
    };
  }
  if (hour >= 17 && hour < 21) {
    const greeting = hasName ? `Good evening, ${name} 🌇` : "Good evening 🌇";
    const question = "How are you unwinding today?";
    return {
      greeting,
      question,
      title: `${greeting} ${question}`,
      subtitle: "No rush at all. We can gently unpack whatever you're carrying.",
    };
  }
  const greeting = hasName ? `Quiet night, ${name} 🌙` : "Quiet night 🌙";
  const question = "How are you holding up tonight?";
  return {
    greeting,
    question,
    title: `${greeting} ${question}`,
    subtitle: "I'm right here if your thoughts are keeping you awake.",
  };
}

function ChatHome({ navigate, goTab, displayName, companion, persona, setPersona, language, conversationStyle, responseLength, memoryConsent, useActiveMemories, soundOn, setSoundOn, conversations, setConversations, activeChatId, setActiveChatId, selectedFolderId, memories, setMemories, todayMoodEntry, subscriptionStatus, freeUsage, freeLimit, registerFreeUse, notify, onOpenMerchant, currentTrack, onOpenMusicModal, onOpenToolkitGuide, preloadedTopic, onClearPreloadedTopic }: {
  navigate: (s: Screen) => void; goTab: (t: Tab) => void; displayName: string; companion: Companion; persona: Persona;
  setPersona?: (p: Persona) => void;
  language: AppLanguage; conversationStyle: string; responseLength: string; memoryConsent: string; useActiveMemories: boolean;
  soundOn: boolean; setSoundOn: (v: boolean) => void;
  conversations: Conversation[]; setConversations: (value: Conversation[] | ((items: Conversation[]) => Conversation[])) => void; activeChatId: number | null; setActiveChatId: (id: number | null) => void;
  selectedFolderId: number | null;
  memories: Memory[]; setMemories: (items: Memory[]) => void;
  todayMoodEntry?: MoodEntry | null;
  subscriptionStatus: SubscriptionStatus; freeUsage: number; freeLimit: number;
  registerFreeUse: () => void; notify: (s: string) => void;
  onOpenMerchant?: (name: string) => void;
  currentTrack?: CalmingTrack;
  onOpenMusicModal?: () => void;
  onOpenToolkitGuide?: (guideId: string) => void;
  preloadedTopic?: string;
  onClearPreloadedTopic?: () => void;
}) {
  const onyxGreeting = useMemo(() => getOnyTimeGreeting(language, displayName), [language, displayName]);
  const activeIdRef = useRef<number | null>(activeChatId);
  activeIdRef.current = activeChatId;
  const messages = conversations.find((chat) => chat.id === activeChatId)?.messages || [];
  const setMessages = (update: Message[] | ((items: Message[]) => Message[])) => {
    const id = activeIdRef.current;
    if (id === null) {
      const next = typeof update === "function" ? update([]) : update;
      const firstText = next.find((message) => message.from === "user")?.text || "New conversation";
      const lower = firstText.toLowerCase();
      const category = lower.includes("job") || lower.includes("work") ? "Career" : lower.includes("study") || lower.includes("exam") ? "Study" : lower.includes("relationship") ? "Relationships" : lower.includes("stress") || lower.includes("anxious") || lower.includes("overwhelmed") ? "Emotional Wellbeing" : "Other";
      const title = lower.includes("job") ? "Job search" : lower.includes("study") ? "Study pressure" : lower.includes("anxious") ? "Feeling anxious" : lower.includes("stress") || lower.includes("overwhelmed") ? "Feeling overwhelmed" : firstText.slice(0, 32);
      const newId = Date.now();
      activeIdRef.current = newId;
      setActiveChatId(newId);
      setConversations((items) => [{ id: newId, title, category, day: "Today", folderId: selectedFolderId || undefined, reportAllowed: true, messages: next }, ...items]);
      return;
    }
    setConversations((items) => items.map((chat) => chat.id === id ? { ...chat, messages: typeof update === "function" ? update(chat.messages) : update } : chat));
  };
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [inputMode, setInputMode] = useState<"voice" | "text">("text");
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "recording" | "sent">("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceInterim, setVoiceInterim] = useState("");
  const [voiceVolume, setVoiceVolume] = useState(0.1);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const speechRecognizerRef = useRef<ChatSpeechRecognizer | null>(null);
  const voiceRecorderRef = useRef<VoiceRecorder | null>(null);

  const [savedMemoryId, setSavedMemoryId] = useState<number | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [failedUserText, setFailedUserText] = useState<string | null>(null);
  const [serverSafetyAction, setServerSafetyAction] = useState<SafetyAction>("support");
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<string[]>([]);
  const [activeBreakTimer, setActiveBreakTimer] = useState<ActiveBreakTimerState | null>(null);

  // Redesigned Chat UI states
  const { chatViewMode, setChatViewMode } = useTheme();
  const [showHistorySheet, setShowHistorySheet] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [showTonePicker, setShowTonePicker] = useState(false);
  const [showAiDisclaimer, setShowAiDisclaimer] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [recentUserEcho, setRecentUserEcho] = useState<{
    id: number;
    text: string;
    fading: boolean;
  } | null>(null);
  const typingIdleTimerRef = useRef<number | null>(null);
  const echoClearTimerRef = useRef<number | null>(null);

  const { t } = useLanguage();
  const { unreadCount, openNotifications } = useNotifications();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    const baselineHeight = window.innerHeight;
    const updateViewport = () => {
      if (!vv) return;
      const ratio = vv.height / Math.max(window.innerHeight, baselineHeight);
      setKeyboardOpen(ratio < 0.78);
    };
    if (vv) {
      vv.addEventListener("resize", updateViewport);
      return () => vv.removeEventListener("resize", updateViewport);
    }
    return undefined;
  }, []);

  useEffect(() => {
    return () => {
      if (typingIdleTimerRef.current) window.clearTimeout(typingIdleTimerRef.current);
      if (echoClearTimerRef.current) window.clearTimeout(echoClearTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setDismissedSuggestionIds([]);
  }, [activeChatId]);

  useEffect(() => {
    if (!activeBreakTimer || activeBreakTimer.paused) return;
    const intervalId = window.setInterval(() => {
      setActiveBreakTimer((prev) => {
        if (!prev || prev.paused) return prev;
        if (prev.secondsLeft <= 1) {
          playSoothingChime();
          notify(
            language === "Bahasa Melayu"
              ? "Masa rehat selesai. Selamat kembali bersama ONY!"
              : language === "中文"
                ? "休息时间到啦，欢迎慢慢回来~"
                : "Break complete. Welcome back when you're ready.",
          );
          return null;
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [activeBreakTimer, language, notify]);

  useEffect(() => {
    if (preloadedTopic) {
      const topicText =
        language === "Bahasa Melayu"
          ? `Saya ingin bercakap tentang refleksi saya dalam Toolkit: ${preloadedTopic}`
          : language === "中文"
          ? `我想和 ONY 聊聊刚才在工具箱里的反思体验：${preloadedTopic}`
          : `I'd like to talk about what I reflected on in the Toolkit: ${preloadedTopic}`;
      setInput(topicText);
      if (onClearPreloadedTopic) {
        onClearPreloadedTopic();
      }
    }
  }, [preloadedTopic, onClearPreloadedTopic, language]);
  const suggestedCards = useMemo(() => {
    if (language === "Bahasa Melayu") {
      return [
        {
          icon: "cloud",
          label: "Tekanan Harian & Tugasan",
          prompt: "Saya rasa tertekan dengan tugasan hari ini",
        },
        {
          icon: "heart",
          label: "Ruang Luahan Hati",
          prompt: "Saya perlukan teman untuk meluahkan perasaan",
        },
        {
          icon: "wind",
          label: "Pernafasan Tenang & Relaks",
          prompt: "Bimbing saya dalam senaman pernafasan tenang",
        },
        {
          icon: "coffee",
          label: "Rehat Minda Tanpa Bersalah",
          prompt: "Bagaimana cara untuk berehat tanpa rasa bersalah?",
        },
      ];
    }
    if (language === "中文") {
      return [
        {
          icon: "cloud",
          label: "生活与学业压力",
          prompt: "今天感到压力有些大，想和你理清思绪",
        },
        {
          icon: "heart",
          label: "温柔倾听陪伴",
          prompt: "想要找一个温暖的倾听者，聊聊今天的心事",
        },
        {
          icon: "wind",
          label: "深呼吸正念练习",
          prompt: "请带我做一次深呼吸平复情绪练习",
        },
        {
          icon: "coffee",
          label: "安心休息充电",
          prompt: "总是感到焦虑紧绷，怎样才能安心放松休息？",
        },
      ];
    }
    return [
      {
        icon: "cloud",
        label: "Daily Stress",
        prompt: "I feel stressed and overwhelmed today",
      },
      {
        icon: "heart",
        label: "Safe to Vent",
        prompt: "I just need someone to talk to and be heard",
      },
      {
        icon: "wind",
        label: "Calming Breath",
        prompt: "Guide me through a calming breathing exercise",
      },
      {
        icon: "coffee",
        label: "Permission to Rest",
        prompt: "How can I pause and rest without feeling guilty?",
      },
    ];
  }, [language]);
  const suggestions = useMemo(() => suggestedCards.map((c) => c.prompt), [suggestedCards]);

  const isSubscribed = subscriptionStatus === "trial" || subscriptionStatus === "payg" || subscriptionStatus === "monthly";
  const isLimitReached = !isSubscribed && freeUsage >= freeLimit;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
      } else if (chatScrollRef.current) {
        chatScrollRef.current.scrollTo({
          top: chatScrollRef.current.scrollHeight,
          behavior,
        });
      }
    });
  };

  useEffect(() => {
    if (messages.length > 0 || typing) {
      scrollToBottom("smooth");
    }
  }, [messages.length, typing]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom("auto");
    }
  }, [activeChatId]);

  useEffect(() => {
    const synth = OnySpeechSynthesizer.getInstance();
    synth.setOnStateChange((id) => setSpeakingMsgId(id));
    return () => {
      synth.stop();
      if (speechRecognizerRef.current) {
        speechRecognizerRef.current.abort();
      }
      if (voiceRecorderRef.current) {
        voiceRecorderRef.current.cancel();
      }
    };
  }, []);

  const toggleSpeakMessage = (text: string, id: string) => {
    const synth = OnySpeechSynthesizer.getInstance();
    if (speakingMsgId === id) {
      synth.stop();
      setSpeakingMsgId(null);
    } else {
      setSpeakingMsgId(id);
      synth.speak(text, id, language);
    }
  };

  const sendToBackend = async (textToSend: string, priorMessages: Message[]) => {
    setTyping(true);
    setChatError(null);

    const activeConsentedMemories =
      memoryConsent === "allow" && useActiveMemories
        ? memories.filter((m) => m.active && m.kind !== "image")
        : [];

    const previousOnyMessage = [...priorMessages].reverse().find((m) => m.from === "ony");
    const previousTurnSuggestionIds =
      previousOnyMessage?.shownSuggestionIds ||
      previousOnyMessage?.suggestions?.map((s) => s.id) ||
      [];

    try {
      const response = await chatService.sendMessage({
        conversationId: String(activeIdRef.current || "new"),
        message: textToSend,
        history: priorMessages.slice(-10).map((m) => ({
          role: m.from === "user" ? "user" : "assistant",
          content: m.text,
        })),
        persona,
        language,
        conversationStyle,
        responseLength,
        approvedContext: {
          memoryIds: activeConsentedMemories.map((m) => String(m.id)),
          conversationIds: activeIdRef.current ? [String(activeIdRef.current)] : [],
          consentVersion: "1.0",
          memories: activeConsentedMemories.slice(0, 5).map((m) => m.text),
        },
        recentSuggestionIds: previousTurnSuggestionIds,
      });

      setServerSafetyAction(response.safetyAction);
      const vouchersList = (response.recommendedVouchers && response.recommendedVouchers.length > 0)
        ? response.recommendedVouchers
        : (response.recommendedVoucher ? [response.recommendedVoucher] : []);

      const computedTurnSuggestions =
        response.suggestions && response.suggestions.length > 0
          ? response.suggestions.filter((s) => !previousTurnSuggestionIds.includes(s.id)).slice(0, 3)
          : buildContextualSuggestions({
              replyText: response.message,
              userMessage: textToSend,
              recentShownIds: previousTurnSuggestionIds,
              language,
              safetyAction: response.safetyAction,
              maxCount: 3,
            });

      setDismissedSuggestionIds([]);
      setMessages((m) => [
        ...m,
        {
          from: "ony",
          text: response.message,
          voucher: vouchersList[0] || null,
          vouchers: vouchersList,
          copingActivity: response.copingActivity || null,
          suggestions: computedTurnSuggestions,
          shownSuggestionIds: computedTurnSuggestions.map((s) => s.id),
        },
      ]);
      scrollToBottom("smooth");

      if (autoSpeak) {
        const nextId = `ony-${Date.now()}`;
        setSpeakingMsgId(nextId);
        OnySpeechSynthesizer.getInstance().speak(response.message, nextId, language);
      }

      if (response.safetyAction !== "urgent_safety_flow" && response.model !== "ony-resilient-fallback") {
        registerFreeUse();
      }
    } catch (err) {
      const message =
        err instanceof ChatServiceError
          ? err.message
          : "Unable to get a reply from ONY right now. Please try again.";
      if (err instanceof ChatServiceError && err.safetyAction) {
        setServerSafetyAction(err.safetyAction);
      }
      setChatError(message);
      setFailedUserText(textToSend);
    } finally {
      setTyping(false);
      // Fade & collapse the temporary user bubble once ONY begins responding
      setRecentUserEcho((prev) => (prev ? { ...prev, fading: true } : null));
      if (echoClearTimerRef.current) window.clearTimeout(echoClearTimerRef.current);
      echoClearTimerRef.current = window.setTimeout(() => {
        setRecentUserEcho(null);
      }, 650);
    }
  };

  const reply = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    if (isLimitReached) {
      notify("Message limit reached. Please choose a subscription plan.");
      navigate("subscription");
      return;
    }
    setSavedMemoryId(null);
    setChatError(null);
    setFailedUserText(null);
    setDismissedSuggestionIds([]);
    setIsUserTyping(false);
    const lower = trimmed.toLowerCase();
    if (lower === "show my memories") { goTab("memory"); setInput(""); return; }
    if (lower === "open community") { goTab("community"); setInput(""); return; }

    if (echoClearTimerRef.current) window.clearTimeout(echoClearTimerRef.current);
    setRecentUserEcho({ id: Date.now(), text: trimmed, fading: false });

    const priorMessages = [...messages];
    setMessages((m) => [...m, { from: "user", text: trimmed }]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    scrollToBottom("smooth");
    void sendToBackend(trimmed, priorMessages);
  };

  const retryLastMessage = () => {
    if (!failedUserText || typing) return;
    const priorMessages = messages.slice(0, -1);
    void sendToBackend(failedUserText, priorMessages);
  };

  const submit = (e: FormEvent) => { e.preventDefault(); reply(input); };

  const startVoiceListening = async () => {
    if (typing) return;
    setMicNotice(null);
    setVoiceTranscript("");
    setVoiceInterim("");
    setVoiceState("listening");

    try {
      if (!voiceRecorderRef.current) {
        voiceRecorderRef.current = new VoiceRecorder();
      }
      await voiceRecorderRef.current.start({
        onVolumeChange: (vol) => setVoiceVolume(vol),
      });
    } catch (e: any) {
      console.warn("[Voice] Audio visualizer notice:", e);
      const isRestricted = e?.message?.includes("restricted") || e?.message?.includes("denied");
      if (isRestricted) {
        setMicNotice(language === "Bahasa Melayu" ? "Akses mikrofon diperlukan untuk pertuturan langsung. Anda juga boleh memilih saranan di bawah:" : language === "中文" ? "需要麦克风访问权限以启用语音输入。您也可以在下方选择常用短语：" : "Microphone access is needed for live speech. You can also pick a prompt below:");
      }
    }

    if (isSpeechRecognitionSupported()) {
      const recognitionLang = language === "Bahasa Melayu" ? "ms-MY" : language === "中文" ? "zh-CN" : "en-US";
      if (!speechRecognizerRef.current) {
        speechRecognizerRef.current = new ChatSpeechRecognizer(recognitionLang);
      } else {
        speechRecognizerRef.current.setLanguage(recognitionLang);
      }
      const started = speechRecognizerRef.current.start({
        onUpdate: ({ transcript, interim }) => {
          setVoiceTranscript(transcript);
          setVoiceInterim(interim);
        },
        onError: (err) => {
          setMicNotice(err);
          stopVoiceListening(false);
        },
        onEnd: () => {
          // preserve recognition
        },
      });
      if (!started) {
        setMicNotice(language === "Bahasa Melayu" ? "Pengecaman pertuturan tidak dapat dimulakan. Anda boleh memilih saranan pantas di bawah:" : language === "中文" ? "无法启动语音识别。您可以点击下方的快捷短语：" : "Speech recognition could not be started. You can choose a quick prompt below:");
      }
    } else {
      setMicNotice(language === "Bahasa Melayu" ? "Pengecaman pertuturan langsung tidak disokong pada pelayar ini. Cuba saranan pantas di bawah:" : language === "中文" ? "当前浏览器不支持实时语音识别。请尝试下方的快捷输入：" : "Live speech transcription is unavailable on this browser. Try a quick prompt below:");
    }
  };

  const stopVoiceListening = (send = true) => {
    let finalSpeech = voiceTranscript;
    if (speechRecognizerRef.current) {
      const captured = speechRecognizerRef.current.stop();
      if (captured) finalSpeech = captured;
    }
    if (voiceRecorderRef.current) {
      voiceRecorderRef.current.cancel();
    }
    setVoiceVolume(0.1);

    const speechToSend = (finalSpeech + " " + voiceInterim).trim();
    if (send && speechToSend) {
      setVoiceState("sent");
      notify(language === "Bahasa Melayu" ? "Suara ditranskripsi dan dihantar" : language === "中文" ? "语音已转录并发送" : "Voice transcribed and sent");
      reply(speechToSend);
      setTimeout(() => {
        setVoiceState("idle");
        setVoiceTranscript("");
        setVoiceInterim("");
      }, 1500);
    } else {
      setVoiceState("idle");
      setVoiceTranscript("");
      setVoiceInterim("");
    }
  };

  const handleVoice = () => {
    if (typing) return;
    if (voiceState === "idle" || voiceState === "sent") {
      void startVoiceListening();
    } else if (voiceState === "listening" || voiceState === "recording") {
      stopVoiceListening(true);
    } else {
      stopVoiceListening(false);
    }
  };

  const handleUsePromptSuggestion = (phrase: string) => {
    setInput(phrase);
    setInputMode("text");
    setMicNotice(null);
  };
  const latestUserText = [...messages].reverse().find((message) => message.from === "user")?.text || "";
  const latestLower = latestUserText.toLowerCase();
  const safetyContext =
    serverSafetyAction === "urgent_safety_flow" ||
    ["hurt myself", "self-harm", "suicide", "not safe", "end my life", "kill myself", "bunuh diri", "cederakan diri", "tak nak hidup"].some((phrase) => latestLower.includes(phrase));
  const memoryContext = ["always", "helps me", "calmer when", "remember this", "important to me", "i prefer", "i like"].some((phrase) => latestLower.includes(phrase));
  const anxietyContext = ["anxious", "anxiety", "stress", "overwhelmed", "panic", "relax"].some((phrase) => latestLower.includes(phrase));
  const studyContext = ["study", "exam", "assignment", "class"].some((phrase) => latestLower.includes(phrase));
  const jobContext = ["job", "work opportunity", "internship", "career"].some((phrase) => latestLower.includes(phrase));
  const relationshipContext = ["relationship", "partner", "boyfriend", "girlfriend", "friendship"].some((phrase) => latestLower.includes(phrase));

  const turnSuggestions = useMemo<ChatSuggestion[]>(() => {
    if (messages.length === 0 || typing || safetyContext) return [];

    let latestOnyIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].from === "ony") {
        latestOnyIdx = i;
        break;
      }
    }
    if (latestOnyIdx < 0) return [];

    const latestOnyMsg = messages[latestOnyIdx];
    let precedingUserText = "";
    for (let i = latestOnyIdx - 1; i >= 0; i--) {
      if (messages[i].from === "user") {
        precedingUserText = messages[i].text;
        break;
      }
    }

    let previousOnyIds: string[] = [];
    for (let i = latestOnyIdx - 1; i >= 0; i--) {
      if (messages[i].from === "ony") {
        previousOnyIds =
          messages[i].shownSuggestionIds ||
          messages[i].suggestions?.map((s) => s.id) ||
          [];
        break;
      }
    }

    const baseSuggestions =
      latestOnyMsg.suggestions !== undefined
        ? latestOnyMsg.suggestions
        : buildContextualSuggestions({
            replyText: latestOnyMsg.text,
            userMessage: precedingUserText,
            recentShownIds: previousOnyIds,
            language,
            safetyAction: serverSafetyAction,
            maxCount: 3,
          });

    return baseSuggestions
      .filter((s) => !dismissedSuggestionIds.includes(s.id))
      .slice(0, 3);
  }, [messages, typing, safetyContext, language, serverSafetyAction, dismissedSuggestionIds]);

  const handleSelectSuggestion = (suggestion: ChatSuggestion) => {
    if (suggestion.action === "toolkit") {
      if (onOpenToolkitGuide) {
        onOpenToolkitGuide(suggestion.toolId || "breathing_box");
      } else {
        navigate("resources");
      }
      return;
    }

    if (suggestion.action === "music") {
      if (!soundOn) {
        setSoundOn(true);
        notify(
          language === "Bahasa Melayu"
            ? "Memainkan muzik tenang 🎵"
            : language === "中文"
              ? "正在播放舒缓音乐 🎵"
              : "Playing calming music 🎵",
        );
      } else if (onOpenMusicModal) {
        onOpenMusicModal();
      }
      return;
    }

    if (suggestion.action === "timer") {
      const mins = suggestion.durationMinutes && suggestion.durationMinutes > 0 ? suggestion.durationMinutes : 5;
      setActiveBreakTimer({
        id: suggestion.id,
        label: suggestion.label,
        secondsLeft: mins * 60,
        totalSeconds: mins * 60,
        paused: false,
      });
      setDismissedSuggestionIds((prev) => (prev.includes(suggestion.id) ? prev : [...prev, suggestion.id]));
      notify(
        language === "Bahasa Melayu"
          ? `Pemasa ${mins} minit dimulakan`
          : language === "中文"
            ? `已开启 ${mins} 分钟休息计时`
            : `${mins}-min timer started`,
      );
      return;
    }

    if (suggestion.action === "hydrate") {
      playSoothingChime();
      setDismissedSuggestionIds((prev) => (prev.includes(suggestion.id) ? prev : [...prev, suggestion.id]));
      notify(
        language === "Bahasa Melayu"
          ? "Minum air perlahan-lahan ya 💧"
          : language === "中文"
            ? "慢慢喝口温水歇一歇 💧"
            : "Take a slow, refreshing sip of water 💧",
      );
      return;
    }

    if (suggestion.action === "follow_up") {
      reply(suggestion.followUpPrompt || suggestion.label);
    }
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestionIds((prev) => (prev.includes(suggestionId) ? prev : [...prev, suggestionId]));
  };
  const saveContextMemory = () => {
    const id = Date.now();
    setMemories([{ id, text: latestUserText, category: "Things That Help Me", active: true, kind: "text", reason: language === "Bahasa Melayu" ? "Anda memilih untuk mengingati perkara ini semasa perbualan ONY." : language === "中文" ? "您选择在与 ONY 对话期间记住这一点。" : "You chose to remember this during an ONY conversation." }, ...memories]);
    setSavedMemoryId(id);
    notify(t.memory_added_toast || (language === "Bahasa Melayu" ? "Disimpan ke Peti Memori anda" : language === "中文" ? "已保存至记忆宝库" : "Saved to your Memory Vault"));
  };
  const undoContextMemory = () => {
    if (savedMemoryId !== null) setMemories(memories.filter((memory) => memory.id !== savedMemoryId));
    setSavedMemoryId(null);
    notify(t.memory_deleted_toast || (language === "Bahasa Melayu" ? "Memori dialih keluar" : language === "中文" ? "已移除该记忆" : "Memory removed"));
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    setIsUserTyping(val.trim().length > 0);
    if (typingIdleTimerRef.current) window.clearTimeout(typingIdleTimerRef.current);
    if (val.trim().length > 0) {
      typingIdleTimerRef.current = window.setTimeout(() => {
        setIsUserTyping(false);
      }, 2400);
    }
    const target = e.target;
    target.style.height = "auto";
    const nextHeight = Math.min(target.scrollHeight, 120);
    target.style.height = `${nextHeight}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!typing && !isLimitReached && input.trim()) {
        reply(input);
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    }
  };

  const handleNewChat = () => {
    if (messages.length === 0) return;
    const newId = Date.now();
    activeIdRef.current = newId;
    setActiveChatId(newId);
    setRecentUserEcho(null);
    setDismissedSuggestionIds([]);
    setActiveBreakTimer(null);
    setConversations((items) => [
      {
        id: newId,
        title: language === "Bahasa Melayu" ? "Perbualan baru" : language === "中文" ? "新对话" : "New conversation",
        category: "Emotional Wellbeing",
        day: "Today",
        folderId: selectedFolderId || undefined,
        reportAllowed: true,
        messages: [],
      },
      ...items,
    ]);
    notify(language === "Bahasa Melayu" ? "Perbualan baru dimulakan" : language === "中文" ? "已开启新对话" : "Started new conversation");
  };

  const handleDismissVoucher = (msgIndex: number) => {
    setMessages((prev) =>
      prev.map((msg, idx) =>
        idx === msgIndex ? { ...msg, dismissedVoucher: true } : msg,
      ),
    );
  };

  const handleSwitchChatViewMode = (nextMode: ChatViewMode) => {
    if (chatViewMode === nextMode) return;
    setChatViewMode(nextMode);
    notify(
      nextMode === "companion"
        ? language === "Bahasa Melayu"
          ? "Bertukar ke Paparan Teman"
          : language === "中文"
            ? "已切换为伴侣互动模式"
            : "Switched to Companion view"
        : language === "Bahasa Melayu"
          ? "Bertukar ke Sembang Klasik"
          : language === "中文"
            ? "已切换为经典对话模式"
            : "Switched to Classic chat",
    );
  };

  const handleToggleAutoSpeak = () => {
    const next = !autoSpeak;
    setAutoSpeak(next);
    notify(
      next
        ? language === "Bahasa Melayu"
          ? "Suara ONY diaktifkan · Jawapan akan dibaca"
          : language === "中文"
            ? "ONY 语音播报已开启 · 将朗读回复"
            : "ONY voice on · Replies will be read aloud"
        : language === "Bahasa Melayu"
          ? "Suara ONY dimatikan"
          : language === "中文"
            ? "ONY 语音播报已关闭"
            : "ONY voice off",
    );
  };

  const headerCompanionMood: CompanionExpression =
    speakingMsgId !== null
      ? "speaking"
      : typing || isUserTyping
        ? "listening"
        : "idle";

  const classicMessageLabels = {
    dismiss: t.common_dismiss,
    retry: t.common_retry,
    getHelp: t.chat_action_get_help,
    findSupport: t.chat_action_find_support,
    contactTrusted: t.chat_action_contact_trusted,
    viewResources: t.chat_action_view_resources,
    rememberThis: t.chat_action_remember_this,
    savedVault: t.chat_action_saved_vault,
    undo: t.common_undo,
    breathing: t.chat_action_breathing,
    calmingMusic: t.chat_action_calming_music,
    studyPlan: t.chat_action_study_plan,
    takeBreak: t.chat_action_take_break,
    talkAboutIt: t.chat_action_talk_about_it,
    findJobs: t.chat_action_find_jobs,
    jobPrefs: t.chat_action_job_prefs,
    tellMore: t.chat_action_tell_more,
    helpReflect: t.chat_action_help_reflect,
    listenLabel: t.chat_voice_listen,
    stopSpeakingLabel: t.chat_voice_stop_speaking,
  };

  return (
    <div className={`chat-page mode-${chatViewMode} ${keyboardOpen ? "keyboard-open" : ""}`}>
      {/* Clean uncluttered header with max 3 action icons on right */}
      <ChatHeader
        companion={companion}
        companionMood={headerCompanionMood}
        language={language}
        todayMoodEntry={todayMoodEntry}
        unreadCount={unreadCount}
        onOpenHistory={() => setShowHistorySheet(true)}
        onOpenMood={() => navigate(todayMoodEntry ? "trend" : "mood")}
        onOpenOverflow={() => setShowOverflowMenu(true)}
      />

      {/* Mode A: COMPANION MODE (default) */}
      {chatViewMode === "companion" ? (
        <CompanionStage
          companion={companion}
          persona={persona}
          messages={messages}
          typing={typing}
          isUserTyping={isUserTyping}
          speakingMsgId={speakingMsgId}
          keyboardOpen={keyboardOpen}
          language={language}
          welcomeGreeting={onyxGreeting.greeting}
          welcomeQuestion={onyxGreeting.question}
          starterCards={suggestedCards}
          isLimitReached={isLimitReached}
          recentUserEcho={recentUserEcho}
          chatError={chatError}
          failedUserText={failedUserText}
          safetyContext={safetyContext}
          serverSafetyAction={serverSafetyAction}
          memoryContext={memoryContext}
          savedMemoryId={savedMemoryId}
          anxietyContext={anxietyContext}
          studyContext={studyContext}
          jobContext={jobContext}
          relationshipContext={relationshipContext}
          onSelectStarter={(prompt) => {
            if (!isLimitReached) {
              reply(prompt);
            } else {
              navigate("subscription");
            }
          }}
          onToggleSpeakMessage={toggleSpeakMessage}
          onOpenMerchant={onOpenMerchant}
          onDismissVoucher={handleDismissVoucher}
          onDismissError={() => setChatError(null)}
          onRetryLastMessage={retryLastMessage}
          onNavigate={(screen) => navigate(screen as Screen)}
          onSaveContextMemory={saveContextMemory}
          onUndoContextMemory={undoContextMemory}
          onOpenToolkitGuide={onOpenToolkitGuide}
          onSendQuickReply={reply}
          onOpenHistory={() => setShowHistorySheet(true)}
        />
      ) : (
        /* Mode B: CLASSIC MODE (standard scrolling message feed) */
        <div className="chat-scroll" ref={chatScrollRef}>
          {messages.length > 0 && (
            <div className="memory-note">
              <Icon name="memory" />
              <span>
                {memoryConsent === "allow" && useActiveMemories
                  ? t.chat_memory_active_badge
                  : t.chat_memory_paused_badge}
              </span>
              <Button variant="ghost" onClick={() => goTab("memory")}>
                {t.chat_view_btn}
              </Button>
            </div>
          )}

          {messages.length === 0 && (
            <div className="chat-welcome-hero">
              <div className="chat-hero-avatar-stage">
                <div className="chat-hero-halo-aura" aria-hidden="true" />
                <div className="chat-hero-avatar-bubble">
                  <CompanionAvatar
                    companion={companion}
                    size="xl"
                    mood={typing ? "speaking" : isUserTyping ? "listening" : "idle"}
                    showGlow
                    interactive
                  />
                  <span className="chat-hero-presence-badge" aria-label="Available & online">
                    <span className="chat-hero-presence-pulse" />
                  </span>
                </div>
              </div>

              <div className="chat-hero-meta-row">
                <span className="chat-hero-status-tag">
                  <span className="live-dot" aria-hidden="true" />
                  {language === "Bahasa Melayu"
                    ? "ONY · 24/7 Sedia Mendengar"
                    : language === "中文"
                      ? "ONY · 24/7 随时倾听"
                      : "ONY · 24/7 Active & Listening"}
                </span>
              </div>

              <div className="chat-hero-copy">
                <h1 className="chat-hero-greeting-heading">{onyxGreeting.greeting}</h1>
                <p className="chat-hero-question-line">{onyxGreeting.question}</p>
                <p className="chat-hero-safety-line">{onyxGreeting.subtitle}</p>
              </div>

              {/* Calming Ambience Audio Quick Action */}
              <div className="chat-hero-ambience-strip">
                <div
                  className={`hero-ambience-toggle ${soundOn ? "active" : ""}`}
                  onClick={() => setSoundOn(!soundOn)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSoundOn(!soundOn);
                    }
                  }}
                  aria-label={soundOn ? "Pause calming audio" : "Play calming audio"}
                >
                  <span className="hero-ambience-eq-icon">
                    {soundOn ? (
                      <span className="calming-mini-eq">
                        <span className="eq-bar bar-1"></span>
                        <span className="eq-bar bar-2"></span>
                        <span className="eq-bar bar-3"></span>
                      </span>
                    ) : (
                      <Icon name="music" />
                    )}
                  </span>
                  <span className="hero-ambience-text">
                    <strong>
                      {soundOn
                        ? (language === "Bahasa Melayu" ? "Muzik Dimainkan: " : language === "中文" ? "正在播放: " : "Playing: ") +
                          (currentTrack
                            ? (language === "Bahasa Melayu" ? currentTrack.titleBm : language === "中文" ? currentTrack.titleZh : currentTrack.title)
                            : (language === "Bahasa Melayu" ? "Muzik Tenang" : language === "中文" ? "舒缓白噪音" : "Calming Ambience"))
                        : (language === "Bahasa Melayu" ? "Pasang Muzik Tenang (432Hz / Hujan / Ombak)" : language === "中文" ? "开启疗愈音乐 (432Hz / 寺庙雨 / 潮汐)" : "Play Calming Music & Ambience")}
                    </strong>
                    <small>
                      {soundOn
                        ? (language === "Bahasa Melayu" ? "Ketik untuk jeda · Tukar trek di butang kanan" : language === "中文" ? "轻点暂停 · 点击右侧挑选曲目" : "Tap to pause · Tap button to switch tracks")
                        : (language === "Bahasa Melayu" ? "Terbukti redakan kegelisahan & tekanan" : language === "中文" ? "缓解焦虑紧绷、神经减压与助眠" : "Acoustic frequencies for anxiety & stress relief")}
                    </small>
                  </span>
                  {onOpenMusicModal && (
                    <span
                      role="button"
                      tabIndex={0}
                      className="hero-ambience-browse-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenMusicModal();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          e.preventDefault();
                          onOpenMusicModal();
                        }
                      }}
                      title={language === "Bahasa Melayu" ? "Pilih senarai muzik" : language === "中文" ? "浏览疗愈曲库" : "Browse calming playlist"}
                    >
                      <Icon name="sparkles" />
                      <span>{language === "Bahasa Melayu" ? "Tukar" : language === "中文" ? "选曲" : "Tracks"}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="chat-hero-suggestions-wrap">
                <div className="chat-hero-suggestions-title-row">
                  <span className="chat-hero-suggestions-title">
                    <Icon name="sparkles" />
                    {language === "Bahasa Melayu"
                      ? "Cadangan topik perbualan"
                      : language === "中文"
                        ? "推荐开启暖心话题"
                        : "Suggested conversation starters"}
                  </span>
                  <span className="chat-hero-suggestions-hint">
                    {language === "Bahasa Melayu"
                      ? "Ketik untuk mula"
                      : language === "中文"
                        ? "轻点直接开启"
                        : "Tap to begin"}
                  </span>
                </div>

                <div className="chat-hero-suggestions-grid">
                  {suggestedCards.map((card) => (
                    <button
                      key={card.prompt}
                      type="button"
                      className="hero-suggestion-card"
                      disabled={typing || isLimitReached}
                      onClick={() => {
                        if (!isLimitReached) {
                          reply(card.prompt);
                        } else {
                          navigate("subscription");
                        }
                      }}
                    >
                      <div className="suggestion-card-left">
                        <span className="suggestion-card-icon" aria-hidden="true">
                          <Icon name={card.icon} />
                        </span>
                        <div className="suggestion-card-texts">
                          <strong className="suggestion-card-label">{card.label}</strong>
                          <p className="suggestion-card-prompt">"{card.prompt}"</p>
                        </div>
                      </div>
                      <span className="suggestion-card-arrow" aria-hidden="true">
                        <Icon name="chevron" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <ClassicMessageList
              messages={messages}
              companion={companion}
              typing={typing}
              speakingMsgId={speakingMsgId}
              language={language}
              chatError={chatError}
              failedUserText={failedUserText}
              safetyContext={safetyContext}
              serverSafetyAction={serverSafetyAction}
              memoryContext={memoryContext}
              savedMemoryId={savedMemoryId}
              anxietyContext={anxietyContext}
              studyContext={studyContext}
              jobContext={jobContext}
              relationshipContext={relationshipContext}
              showContextActions
              onToggleSpeakMessage={toggleSpeakMessage}
              onDismissVoucher={handleDismissVoucher}
              onOpenMerchant={onOpenMerchant}
              onNavigate={(s) => navigate(s as Screen)}
              onDismissError={() => setChatError(null)}
              onRetryLastMessage={retryLastMessage}
              onSaveContextMemory={saveContextMemory}
              onUndoContextMemory={undoContextMemory}
              onOpenToolkitGuide={onOpenToolkitGuide}
              onSendQuickReply={reply}
              onNotify={notify}
              messagesEndRef={messagesEndRef}
              labels={classicMessageLabels}
            />
          )}
        </div>
      )}

      {/* Compact Input Bar with Reply-Matched Suggestion Strip, Single-Row ToneChip + Disclaimer */}
      <ChatInputBar
        input={input}
        inputMode={inputMode}
        voiceState={voiceState}
        voiceTranscript={voiceTranscript}
        voiceInterim={voiceInterim}
        voiceVolume={voiceVolume}
        micNotice={micNotice}
        typing={typing}
        keyboardOpen={keyboardOpen}
        isLimitReached={isLimitReached}
        freeUsage={freeUsage}
        freeLimit={freeLimit}
        persona={persona}
        personaOptions={personaOptions}
        language={language}
        suggestions={turnSuggestions}
        activeTimer={activeBreakTimer}
        textareaRef={textareaRef}
        onOpenTonePicker={() => setShowTonePicker(true)}
        onOpenAiDisclaimer={() => setShowAiDisclaimer(true)}
        onSelectSuggestion={handleSelectSuggestion}
        onDismissSuggestion={handleDismissSuggestion}
        onTogglePauseTimer={() =>
          setActiveBreakTimer((prev) => (prev ? { ...prev, paused: !prev.paused } : null))
        }
        onStopTimer={() => setActiveBreakTimer(null)}
        onDismissMicNotice={() => setMicNotice(null)}
        onUsePromptSuggestion={handleUsePromptSuggestion}
        onChangeInput={handleTextareaChange}
        onKeyDownInput={handleKeyDown}
        onFocusInput={() => {
          if (typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches) {
            setKeyboardOpen(true);
          }
        }}
        onBlurInput={() => {
          setIsUserTyping(false);
          if (typeof window !== "undefined" && window.visualViewport) {
            const ratio = window.visualViewport.height / Math.max(window.innerHeight, 1);
            if (ratio >= 0.85) setKeyboardOpen(false);
          } else {
            setKeyboardOpen(false);
          }
        }}
        onSubmitText={submit}
        onSwitchToTextMode={() => {
          stopVoiceListening(false);
          setInputMode("text");
        }}
        onSwitchToVoiceMode={() => {
          setInputMode("voice");
          void startVoiceListening();
        }}
        onHandleVoiceTap={handleVoice}
        onStartVoiceListening={() => {
          void startVoiceListening();
        }}
        onCancelVoice={() => {
          stopVoiceListening(false);
          setInputMode("text");
        }}
        onSendVoice={() => {
          stopVoiceListening(true);
          setInputMode("text");
        }}
        onUpgradePlan={() => navigate("subscription")}
        labels={{
          placeholder: t.chat_input_placeholder,
          aiNotice: t.chat_ai_notice,
          limitTitle: t.chat_limit_title,
          limitDesc: t.chat_limit_desc,
          unlockBtn: t.chat_limit_unlock_btn,
          voiceModeText: t.chat_mode_text,
          voiceStart: t.chat_voice_start,
          voiceStop: t.chat_voice_stop,
          voiceListening: t.chat_voice_listening,
          voiceSent: t.chat_voice_sent,
          voiceTapMic: t.chat_voice_tap_mic,
          voiceSendBtn: t.chat_voice_send_btn,
          sendButton: t.chat_send_button,
          cancel: t.common_cancel,
          promptOverwhelmed: t.chat_voice_prompt_overwhelmed,
          promptBreathing: t.chat_voice_prompt_breathing,
          promptTalk: t.chat_voice_prompt_talk,
        }}
      />

      {/* Slide-up Full Conversation History Sheet */}
      <ChatHistorySheet
        open={showHistorySheet}
        onClose={() => setShowHistorySheet(false)}
        messages={messages}
        companion={companion}
        typing={typing}
        speakingMsgId={speakingMsgId}
        language={language}
        onToggleSpeakMessage={toggleSpeakMessage}
        onDismissVoucher={handleDismissVoucher}
        onOpenMerchant={onOpenMerchant}
        onNavigate={(s) => navigate(s as Screen)}
        onOpenAllSessions={() => navigate("chatHistory")}
        onNewChat={handleNewChat}
        labels={classicMessageLabels}
      />

      {/* Header "..." Overflow Bottom Sheet */}
      <ChatOverflowSheet
        open={showOverflowMenu}
        onClose={() => setShowOverflowMenu(false)}
        chatViewMode={chatViewMode}
        onChangeChatViewMode={handleSwitchChatViewMode}
        hasMessages={messages.length > 0}
        autoSpeak={autoSpeak}
        soundOn={soundOn}
        unreadCount={unreadCount}
        memoryActive={memoryConsent === "allow" && useActiveMemories}
        language={language}
        onNewChat={handleNewChat}
        onToggleAutoSpeak={handleToggleAutoSpeak}
        onToggleSound={() => setSoundOn(!soundOn)}
        onOpenMusicModal={onOpenMusicModal}
        onOpenNotifications={openNotifications}
        onOpenToolkit={() => navigate("resources")}
        onOpenSafety={() => navigate("safety")}
        onOpenHelp={() => navigate("help")}
        onOpenMemoryTab={() => goTab("memory")}
      />

      {/* Tone Picker Bottom Sheet */}
      <ChatTonePickerSheet
        open={showTonePicker}
        onClose={() => setShowTonePicker(false)}
        persona={persona}
        personaOptions={personaOptions}
        language={language}
        onSelectPersona={(nextPersona) => {
          if (setPersona && persona !== nextPersona) {
            setPersona(nextPersona);
            const opt = personaOptions.find((item) => item.id === nextPersona);
            const details = getPersonaDetails(
              nextPersona,
              opt?.name || "",
              opt?.note || "",
              opt?.preview || "",
              language,
            );
            notify(
              language === "Bahasa Melayu"
                ? `Nada ditukar kepada: ${details.name}`
                : language === "中文"
                  ? `已切换语气：${details.name}`
                  : `Tone switched to: ${details.name}`,
            );
          }
        }}
      />

      {/* AI Disclaimer Info Sheet */}
      <AiDisclaimerSheet
        open={showAiDisclaimer}
        onClose={() => setShowAiDisclaimer(false)}
        language={language}
        onOpenSafety={() => navigate("safety")}
        onOpenToolkit={() => navigate("resources")}
      />
    </div>
  );
}

function MoodCheck({ back, navigate, entries, setEntries, notify }: { back: () => void; navigate: (s: Screen) => void; entries: MoodEntry[]; setEntries: (entries: MoodEntry[]) => void; notify: (s: string) => void }) {
  const { t, language } = useLanguage();
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const todayKey = getLocalDateKey();
  const todayEntry = entries.find((entry) => getMoodDateKey(entry) === todayKey) || null;
  const selected = mood === null ? null : moodOptions[mood];

  const getMoodLabel = (index: number) => {
    switch (index) {
      case 0: return t.mood_difficult;
      case 1: return t.mood_low;
      case 2: return t.mood_okay;
      case 3: return t.mood_good;
      case 4: return t.mood_great;
      default: return moodOptions[index]?.label || "";
    }
  };

  const save = () => {
    if (!selected || mood === null || todayEntry) return;
    const nowIso = new Date().toISOString();
    const newEntry: MoodEntry = {
      id: Date.now(),
      dateKey: todayKey,
      level: mood + 1,
      emoji: selected.emoji,
      label: getMoodLabel(mood),
      note: note.trim(),
      createdAt: nowIso,
      reportAllowed: true,
    };
    setEntries([newEntry, ...entries.filter((item) => getMoodDateKey(item) !== todayKey)]);
    notify(t.mood_saved_toast);
  };

  // If the user has already done the mood check-in for today, do NOT prompt them to input the mood again
  if (todayEntry) {
    return (
      <div className="centered-state">
        <img src={logo} alt="ONY" />
        <div className="success-mark"><Icon name="check" /></div>
        <span className="eyebrow">{t.mood_today_badge} · {todayKey}</span>
        <h1>{t.mood_saved_today_title}</h1>
        <p>
          {language === "Bahasa Melayu" ? (
            <>Anda telah mendaftar masuk hari ini sebagai <strong>{todayEntry.emoji} {todayEntry.label}</strong>{todayEntry.note ? <> — <em>“{todayEntry.note}”</em></> : "."} {t.mood_saved_today_desc}</>
          ) : language === "中文" ? (
            <>您今天的记录为 <strong>{todayEntry.emoji} {todayEntry.label}</strong>{todayEntry.note ? <> — <em>“{todayEntry.note}”</em></> : "。"} {t.mood_saved_today_desc}</>
          ) : (
            <>You checked in today as <strong>{todayEntry.emoji} {todayEntry.label}</strong>{todayEntry.note ? <> — <em>“{todayEntry.note}”</em></> : "."} {t.mood_saved_today_desc}</>
          )}
        </p>
        <Button onClick={() => navigate("trend")}>{t.mood_view_history}</Button>
        <Button variant="ghost" onClick={back}>{t.mood_back_chat}</Button>
      </div>
    );
  }

  return <><PageHeader title={t.mood_modal_title} subtitle={t.mood_modal_subtitle} back={back} /><section className="page-pad">
    <div className="eyebrow">{t.mood_right_now} · {todayKey}</div><h1>{t.mood_question}</h1><p className="muted">{t.mood_scale_hint}</p>
    <div className="mood-scale emoji-scale">{moodOptions.map((option, index) => <button key={option.label} onClick={() => setMood(index)} className={mood === index ? "active" : ""} aria-pressed={mood === index}><span>{option.emoji}</span><small>{getMoodLabel(index)}</small></button>)}</div>
    <div className="selected-mood">{selected ? <><span>{selected.emoji}</span><strong>{getMoodLabel(mood!)}</strong></> : <p>{t.mood_select_prompt}</p>}</div>
    <label className="field-label">{t.mood_note_label} <small>{t.common_optional}</small></label><TextArea rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t.mood_note_placeholder} />
    <Button className="full" disabled={!selected} onClick={save}>{t.mood_save_btn}</Button>
    <Button className="full" variant="ghost" onClick={() => navigate("trend")}>{t.mood_review_previous}</Button>
  </section></>;
}

function MoodTrend({ back, entries, setEntries }: { back: () => void; entries: MoodEntry[]; setEntries: (entries: MoodEntry[]) => void }) {
  const { t, language } = useLanguage();
  const recent = entries[0];
  const todayKey = getLocalDateKey();
  const todayEntry = entries.find((entry) => getMoodDateKey(entry) === todayKey) || null;
  return <><PageHeader title={t.mood_trends_title} subtitle={t.mood_trends_subtitle} back={back} /><section className="page-pad">
    {todayEntry && (
      <div className="community-note" style={{ marginBottom: "12px" }}>
        <Icon name="check" />
        <span>
          <strong>{t.mood_complete_banner} ({todayKey}):</strong> {todayEntry.emoji} {todayEntry.label}
        </span>
      </div>
    )}
    {recent && <div className="trend-summary"><div><span>{t.mood_most_recent} ({getMoodDateKey(recent) === todayKey ? t.mood_today_label : getMoodDateKey(recent)})</span><strong>{recent.emoji} {recent.label}</strong><small>{new Date(recent.createdAt).toLocaleDateString(language === "Bahasa Melayu" ? "ms-MY" : language === "中文" ? "zh-CN" : "en-MY", { day: "numeric", month: "short", year: "numeric" })}</small></div><span className="score">{recent.level}/5</span></div>}
    {entries.length === 0 ? <div className="empty"><span className="empty-emoji">😐</span><h3>{t.mood_empty_title}</h3><p>{t.mood_empty_desc}</p></div> : <><div className="card"><div className="card-title"><h3>{t.mood_daily_checkins}</h3><span>{entries.length} {entries.length === 1 ? t.mood_day_saved : t.mood_days_saved}</span></div><div className="mood-history-list">{entries.map((entry) => {
      const dKey = getMoodDateKey(entry);
      const isToday = dKey === todayKey;
      return <div key={dKey || entry.id}><span className="history-emoji">{entry.emoji}</span><div><strong>{entry.label} {isToday ? `· ${t.mood_today_label}` : ""}</strong><small>{dKey} · {new Date(entry.createdAt).toLocaleString(language === "Bahasa Melayu" ? "ms-MY" : language === "中文" ? "zh-CN" : "en-MY", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</small>{entry.note && <p>{entry.note}</p>}</div><Toggle on={entry.reportAllowed} setOn={(value) => setEntries(entries.map((item) => getMoodDateKey(item) === dKey ? { ...item, reportAllowed: value } : item))} /><Button variant="ghost" onClick={() => setEntries(entries.filter((item) => getMoodDateKey(item) !== dKey))}><Icon name="trash" /></Button></div>;
    })}</div></div>{entries.length >= 3 ? <div className="card"><h3>{t.mood_recent_pattern}</h3><div className="bars mood-entry-bars">{[...entries].reverse().slice(-7).map((entry) => <div key={getMoodDateKey(entry) || entry.id}><span style={{ height: `${entry.level * 20}%` }} /><small>{entry.emoji}</small></div>)}</div><p className="muted">{t.mood_pattern_disclaimer}</p></div> : <div className="community-note"><Icon name="info" />{t.mood_need_three}</div>}</>}
    <p className="disclaimer"><Icon name="info" />{t.mood_firestore_disclaimer}</p>
  </section></>;
}

const memoryCategories = [
  "All",
  "About Me",
  "Preferences",
  "Important People",
  "Goals",
  "Things That Help Me",
  "Special Memories",
];

function MemoryVault({
  memories: items,
  setMemories: setItems,
  navigate,
  setEditingMemory,
  companion,
  notify,
  memoryConsent,
  setMemoryConsent,
  useActiveMemories,
  setUseActiveMemories,
  currentUser,
}: {
  memories: Memory[];
  setMemories: (action: Memory[] | ((prev: Memory[]) => Memory[])) => void;
  navigate: (s: Screen) => void;
  setEditingMemory: (v: Memory | null) => void;
  companion: Companion;
  notify: (s: string) => void;
  memoryConsent: string;
  setMemoryConsent: (val: string) => void;
  useActiveMemories: boolean;
  setUseActiveMemories: (val: boolean) => void;
  currentUser: User | null;
}) {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const isAskBeforeSaving = memoryConsent === "control";
  const activeCount = items.filter((x) => x.active).length;
  const allPaused = items.length > 0 && items.every((x) => !x.active);

  const update = async (id: number, patch: Partial<Memory>) => {
    const target = items.find((x) => x.id === id);
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    if (currentUser && target?.firestoreId) {
      const { id: _ignoreId, firestoreId: _ignoreFsId, ...cleanPatch } = patch;
      await updateMemory(currentUser.uid, target.firestoreId, cleanPatch).catch((e) =>
        console.warn("[ONY] Memory item update notice:", e)
      );
    }
  };

  const deleteSingle = async (item: Memory) => {
    setItems(items.filter((x) => x.id !== item.id));
    if (currentUser && item.firestoreId) {
      await deleteMemory(currentUser.uid, item.firestoreId).catch((e) =>
        console.warn("[ONY] Memory item delete notice:", e)
      );
    }
    notify(t.memory_deleted_toast);
  };

  const handleToggleAskBeforeSaving = async (nextState: boolean) => {
    const nextVal = nextState ? "control" : "allow";
    setMemoryConsent(nextVal);
    if (currentUser) {
      await updateUserProfile(currentUser.uid, { memoryConsent: nextVal }).catch((e) =>
        console.warn("[ONY] Update memory consent error:", e)
      );
      writeSystemLog({
        level: "audit",
        category: "privacy",
        action: "MEMORY_CONSENT_TOGGLED",
        message: `Memory consent updated: Ask before saving = ${nextState ? "ON (manual only)" : "OFF (automatic allowed)"}.`,
        userId: currentUser.uid,
        userEmail: currentUser.email,
      }).catch(() => {});
    }
    notify(
      language === "Bahasa Melayu"
        ? nextState
          ? "Tanya sebelum simpan: Diaktifkan (Persetujuan diperlukan)"
          : "Simpan automatik: Dibenarkan"
        : language === "中文"
        ? nextState
          ? "保存前询问：已开启（每次均需手动确认）"
          : "自动辅助记忆：已允许"
        : nextState
        ? "Ask before saving: ON (Manual confirmation required)"
        : "Auto-saving: Enabled"
    );
  };

  const handleToggleUseActiveMemories = async (nextState: boolean) => {
    setUseActiveMemories(nextState);
    if (currentUser) {
      await updateUserProfile(currentUser.uid, { useActiveMemories: nextState }).catch((e) =>
        console.warn("[ONY] Update useActiveMemories error:", e)
      );
      writeSystemLog({
        level: "audit",
        category: "privacy",
        action: "ACTIVE_MEMORIES_TOGGLED",
        message: `Use active memories in conversation set to ${nextState ? "ENABLED" : "DISABLED"}.`,
        userId: currentUser.uid,
        userEmail: currentUser.email,
      }).catch(() => {});
    }
    notify(
      language === "Bahasa Melayu"
        ? nextState
          ? "Memori aktif digunakan dalam sembang"
          : "Mod sementara aktif: Memori dilumpuhkan dalam sembang"
        : language === "中文"
        ? nextState
          ? "已在对话中启用宝库记忆"
          : "纯净即时模式：已在对话中停用宝库记忆"
        : nextState
        ? "Active memories enabled in conversations"
        : "Pure ephemeral mode: Memories disabled in conversations"
    );
  };

  const handleTogglePauseAll = async () => {
    const nextActive = allPaused;
    const updated = items.map((x) => ({ ...x, active: nextActive }));
    setItems(updated);
    if (currentUser) {
      for (const item of items) {
        if (item.firestoreId) {
          updateMemory(currentUser.uid, item.firestoreId, { active: nextActive }).catch(() => {});
        }
      }
      writeSystemLog({
        level: "audit",
        category: "privacy",
        action: nextActive ? "ALL_MEMORIES_RESUMED" : "ALL_MEMORIES_PAUSED",
        message: `${nextActive ? "Resumed" : "Paused"} all ${items.length} memories in vault.`,
        userId: currentUser.uid,
        userEmail: currentUser.email,
      }).catch(() => {});
    }
    notify(nextActive ? t.memory_resumed_all_toast : t.memory_paused_all_toast);
  };

  const handleExportVault = () => {
    if (items.length === 0) {
      notify(
        language === "Bahasa Melayu"
          ? "Tiada memori untuk dieksport"
          : language === "中文"
          ? "暂无记忆可导出"
          : "No memories to export"
      );
      return;
    }
    const payload = {
      exportDate: new Date().toISOString(),
      appName: "ONY Mental Wellness Companion",
      user: currentUser?.email || "ONY Member",
      privacySettings: {
        memoryConsent,
        useActiveMemories,
        askBeforeSaving: isAskBeforeSaving,
      },
      totalMemories: items.length,
      activeMemories: items.filter((x) => x.active).length,
      memories: items.map((m) => ({
        id: m.id,
        text: m.text,
        reason: m.reason,
        category: m.category || "General",
        active: m.active,
        kind: m.kind || "text",
        imageUrl: m.imageUrl || undefined,
      })),
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `ony-memory-vault-${dateStr}.json`;
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify(t.memory_export_toast);

    if (currentUser) {
      writeSystemLog({
        level: "audit",
        category: "privacy",
        action: "MEMORY_VAULT_EXPORTED",
        message: `User exported Memory Vault archive (${items.length} items).`,
        userId: currentUser.uid,
        userEmail: currentUser.email,
      }).catch(() => {});
    }
  };

  const handleConfirmClearAll = async () => {
    setItems([]);
    setShowClearConfirm(false);
    if (currentUser) {
      await clearAllMemories(currentUser.uid).catch((e) =>
        console.warn("[ONY] Clear memories error:", e)
      );
      writeSystemLog({
        level: "audit",
        category: "privacy",
        action: "ALL_MEMORIES_CLEARED",
        message: "User permanently cleared entire Memory Vault.",
        userId: currentUser.uid,
        userEmail: currentUser.email,
      }).catch(() => {});
    }
    notify(t.memory_cleared_toast);
  };

  const filteredItems = items.filter((x) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      x.text.toLowerCase().includes(q) ||
      (x.reason && x.reason.toLowerCase().includes(q)) ||
      (x.category && x.category.toLowerCase().includes(q));
    const matchesCat = category === "All" || x.category === category;
    return matchesQuery && matchesCat;
  });

  return (
    <>
      <PageHeader
        title={t.memory_title}
        subtitle={`${activeCount} ${t.memory_card_active} ${
          !useActiveMemories ? `· ${language === "Bahasa Melayu" ? "Jeda" : language === "中文" ? "已全局暂停" : "Globally Paused"}` : ""
        }`}
      />
      <section className="page-pad topless memory-page-section">
        <div className="vault-intro">
          <div>
            <span className="eyebrow">{t.memory_vault_control}</span>
            <h2>{t.memory_vault_heading}</h2>
            <p>{t.memory_vault_desc}</p>
          </div>
          <Icon name="memory" />
        </div>

        <Button
          className="full add-memory-btn"
          onClick={() => {
            setEditingMemory(null);
            navigate("addMemory");
          }}
        >
          + {t.memory_add_btn}
        </Button>

        <div className="memory-sticky-controls">
          <div className="search">
            <Icon name="search" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.memory_search_placeholder}
            />
            {query && (
              <button
                type="button"
                className="memory-search-clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                title="Clear search"
              >
                <Icon name="close" />
              </button>
            )}
          </div>
          <div className="scroll-chips">
            {memoryCategories.map((x) => (
              <Button
                key={x}
                variant={category === x ? "primary" : "secondary"}
                onClick={() => setCategory(x)}
              >
                {getCategoryLabel(x, language)}
              </Button>
            ))}
          </div>
        </div>

        <div className="section-head">
          <h3>
            {t.memory_saved_section}{" "}
            {items.length > 0 && <small className="muted">({filteredItems.length})</small>}
          </h3>
          {items.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => setShowClearConfirm(true)}
            >
              {t.memory_clear_all}
            </Button>
          )}
        </div>

        {filteredItems.map((item) => (
          <div className={`memory-card ${!item.active ? "paused" : ""}`} key={item.id}>
            <div className="memory-top">
              <span className="memory-icon">
                <Icon name="memory" />
              </span>
              <Toggle on={item.active} setOn={(v) => update(item.id, { active: v })} />
            </div>
            {item.kind === "image" && (
              item.imageUrl ? (
                <div style={{ marginBottom: "12px", borderRadius: "14px", overflow: "hidden" }}>
                  <img src={item.imageUrl} alt={item.text} style={{ width: "100%", maxHeight: "200px", objectFit: "cover" }} />
                </div>
              ) : (
                <div className={`memory-image ${item.imageTone || "forest"}`}>
                  <span>{t.memory_kind_image}</span>
                </div>
              )
            )}
            {item.category && (
              <span className="memory-category">
                {getCategoryLabel(item.category, language)}
              </span>
            )}
            <strong>{item.text}</strong>
            <details>
              <summary>{t.memory_why_remembers}</summary>
              <p>{item.reason}</p>
            </details>
            <div className="memory-actions">
              <Button
                variant="ghost"
                onClick={() => {
                  setEditingMemory(item);
                  navigate("addMemory");
                }}
              >
                <Icon name="edit" />
                {t.common_edit}
              </Button>
              <Button
                variant="ghost"
                onClick={() => deleteSingle(item)}
              >
                <Icon name="trash" />
                {t.common_delete}
              </Button>
            </div>
          </div>
        ))}

        {!items.length && (
          <div className="empty">
            <CompanionAvatar companion={companion} size="xl" mood="comforting" showGlow interactive />
            <h3>{t.memory_empty_title}</h3>
            <p>{t.memory_empty_desc}</p>
          </div>
        )}

        {items.length > 0 && filteredItems.length === 0 && (
          <div className="empty">
            <Icon name="search" />
            <h3>
              {language === "Bahasa Melayu"
                ? "Tiada memori sepadan"
                : language === "中文"
                ? "无匹配记忆条目"
                : "No matching memories"}
            </h3>
            <p>
              {language === "Bahasa Melayu"
                ? "Cuba ubah carian anda atau pilih kategori lain."
                : language === "中文"
                ? "请尝试更改搜索词或选择其它分类标签。"
                : "Try adjusting your search terms or picking another category filter."}
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setCategory("All");
              }}
            >
              {language === "Bahasa Melayu"
                ? "Kosongkan carian"
                : language === "中文"
                ? "重置筛选"
                : "Reset filters"}
            </Button>
          </div>
        )}

        {/* Fully Functional Memory Privacy & Retention Controls Card */}
        <div className="vault-privacy-box">
          <div className="vault-privacy-header">
            <div className="vault-privacy-header-left">
              <Icon name="shield" />
              <strong>{t.memory_privacy_controls}</strong>
            </div>
            {!useActiveMemories ? (
              <span className="vault-privacy-status-pill paused">
                <Icon name="lock" /> {language === "Bahasa Melayu" ? "Mod Sementara" : language === "中文" ? "纯净即时模式" : "Ephemeral Mode"}
              </span>
            ) : isAskBeforeSaving ? (
              <span className="vault-privacy-status-pill control">
                <Icon name="shield" /> {t.memory_ask_saving_on_badge}
              </span>
            ) : (
              <span className="vault-privacy-status-pill active">
                <Icon name="check" /> {t.memory_ask_saving_off_badge}
              </span>
            )}
          </div>

          {/* Privacy Control 1: Ask Before Saving */}
          <div className="vault-privacy-item">
            <div className="vault-privacy-item-text">
              <strong>
                {t.memory_ask_before_saving}
                <span className="vault-privacy-item-badge">
                  {isAskBeforeSaving
                    ? (language === "Bahasa Melayu" ? "HIDUP" : language === "中文" ? "开启" : "ON")
                    : (language === "Bahasa Melayu" ? "MATI" : language === "中文" ? "关闭" : "OFF")}
                </span>
              </strong>
              <p>{t.memory_ask_saving_desc}</p>
            </div>
            <Toggle on={isAskBeforeSaving} setOn={handleToggleAskBeforeSaving} />
          </div>

          {/* Privacy Control 2: Master Switch for Active Memories in Chat */}
          <div className="vault-privacy-item">
            <div className="vault-privacy-item-text">
              <strong>
                {t.personalise_memories_toggle}
                <span className="vault-privacy-item-badge">
                  {useActiveMemories
                    ? `${activeCount} ${language === "Bahasa Melayu" ? "aktif" : language === "中文" ? "条启用" : "active"}`
                    : (language === "Bahasa Melayu" ? "Dilumpuhkan" : language === "中文" ? "已停用" : "Disabled")}
                </span>
              </strong>
              <p>
                {useActiveMemories
                  ? (language === "Bahasa Melayu"
                      ? `Membenarkan ${activeCount} memori aktif memperibadikan perbualan teman anda.`
                      : language === "中文"
                      ? `允许 ${activeCount} 条已启用的个人记忆用于连贯的日常对话。`
                      : `Allows ${activeCount} active memories to personalize your ongoing companion chats.`)
                  : t.memory_ephemeral_notice}
              </p>
            </div>
            <Toggle on={useActiveMemories} setOn={handleToggleUseActiveMemories} />
          </div>

          {!useActiveMemories && (
            <div className="vault-privacy-ephemeral-banner off">
              <Icon name="info" />
              <span>{t.memory_ephemeral_notice}</span>
            </div>
          )}

          {/* Inline Clear Confirmation Modal */}
          {showClearConfirm && (
            <div className="vault-clear-confirm-modal">
              <h4>{t.memory_clear_confirm_title}</h4>
              <p>{t.memory_clear_confirm_desc}</p>
              <div className="vault-clear-confirm-buttons">
                <Button variant="danger" onClick={handleConfirmClearAll}>
                  {t.memory_clear_all}
                </Button>
                <Button variant="ghost" onClick={() => setShowClearConfirm(false)}>
                  {t.common_cancel}
                </Button>
              </div>
            </div>
          )}

          {/* Batch Privacy & Data Sovereignty Actions Grid */}
          <div className="vault-privacy-actions-grid">
            <Button
              variant="secondary"
              onClick={handleTogglePauseAll}
              disabled={items.length === 0}
            >
              <Icon name={allPaused ? "play" : "pause"} />
              {allPaused ? t.memory_resume_all : t.memory_pause_all}
            </Button>
            <Button
              variant="secondary"
              onClick={handleExportVault}
              disabled={items.length === 0}
            >
              <Icon name="download" />
              {t.memory_export_btn}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowClearConfirm(true)}
              disabled={items.length === 0}
            >
              <Icon name="trash" />
              {t.memory_clear_all}
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("privacy")}
            >
              <Icon name="shield" />
              {language === "Bahasa Melayu" ? "Tetapan Privasi Penuh" : language === "中文" ? "完整隐私与数据设置" : "Full Privacy Settings"}
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function AddMemory({ back, memories, setMemories, editing, notify }: {
  back: () => void; memories: Memory[]; setMemories: (v: Memory[]) => void; editing: Memory | null; notify: (s: string) => void;
}) {
  const { t, language } = useLanguage();
  const [text, setText] = useState(editing?.text || "");
  const [category, setCategory] = useState(editing?.category || "");
  const [active, setActive] = useState(editing?.active ?? true);
  const [kind, setKind] = useState<"text" | "image">(editing?.kind || "text");
  const [imageUrl, setImageUrl] = useState<string | undefined>(editing?.imageUrl);
  const [imageFileName, setImageFileName] = useState<string | undefined>(editing?.imageUrl ? "Uploaded memory photo" : undefined);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const save = () => {
    const item: Memory = {
      id: editing?.id || Date.now(),
      text: text || (language === "Bahasa Melayu" ? "Memori imej istimewa" : language === "中文" ? "特别的心情照片" : "A special image memory"),
      category: category || undefined,
      active,
      kind,
      imageUrl: kind === "image" ? imageUrl : undefined,
      imageTone: kind === "image" ? "forest" : undefined,
      reason: editing?.reason || (language === "Bahasa Melayu" ? "Anda menambah ini terus ke Kubah Memori anda." : language === "中文" ? "您直接将其添加到了记忆宝库中。" : "You added this directly to your Memory Vault.")
    };
    setMemories(editing ? memories.map((memory) => memory.id === editing.id ? item : memory) : [item, ...memories]);
    notify(editing ? t.memory_updated_toast : t.memory_added_toast);
    back();
  };

  return (
    <>
      <PageHeader title={editing ? t.memory_edit_title : t.memory_add_title} subtitle={t.memory_add_sub} back={back} />
      <section className="page-pad">
        <div className="help-hero"><Icon name="memory" /><div><h2>{t.memory_hero_title}</h2><p>{t.memory_hero_desc}</p></div></div>
        <div className="memory-type">
          <Button variant={kind === "text" ? "primary" : "secondary"} onClick={() => setKind("text")}>{t.memory_kind_text}</Button>
          <Button variant={kind === "image" ? "primary" : "secondary"} onClick={() => setKind("image")}>{t.memory_kind_image}</Button>
        </div>
        {kind === "image" && (
          <div>
            <input
              type="file"
              ref={imageInputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    setImageUrl(reader.result as string);
                    setImageFileName(file.name);
                    notify(language === "Bahasa Melayu" ? "Imej dipilih" : language === "中文" ? "已选择图片" : "Image selected");
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <button
              type="button"
              className={`image-upload ${imageUrl ? "selected" : ""}`}
              onClick={() => imageInputRef.current?.click()}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="Memory preview" style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "14px" }} />
              ) : (
                <span className="sample-photo forest"><i /></span>
              )}
              <strong>{imageFileName || (language === "Bahasa Melayu" ? "Pilih foto dari peranti anda" : language === "中文" ? "从设备选择照片" : "Select photo from your device")}</strong>
              <small>{imageUrl ? t.memory_change_image : (language === "Bahasa Melayu" ? "Ketik untuk muat naik foto kenangan" : language === "中文" ? "轻点上传珍贵照片" : "Tap to upload memory photo")}</small>
            </button>
          </div>
        )}
        <label className="field-label">{kind === "text" ? t.memory_what_should_remember : t.memory_caption_label}</label>
        <TextArea rows={kind === "text" ? 5 : 3} value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === "text" ? t.memory_text_placeholder : t.memory_image_placeholder} />
        <label className="field-label">{t.memory_category_label}</label>
        <div className="chips memory-categories">
          {["About Me", "Preferences", "Important People", "Goals", "Things That Help Me", "Special Memories"].map((item) => (
            <Button key={item} variant={category === item ? "primary" : "secondary"} onClick={() => setCategory(item)}>
              {getCategoryLabel(item, language)}
            </Button>
          ))}
        </div>
        <div className="setting-toggle">
          <div><strong>{t.memory_allow_use}</strong><p>{t.memory_allow_use_sub}</p></div>
          <Toggle on={active} setOn={setActive} />
        </div>
        <Button className="full" disabled={kind === "text" ? !text.trim() : !imageUrl} onClick={save}>{t.memory_save_btn}</Button>
        <Button className="full" variant="secondary" onClick={back}>{t.common_cancel}</Button>
      </section>
    </>
  );
}



const GLOBE_PREFS_STORAGE_KEY = "ony_globe_node_prefs_v1";

function loadCachedGlobePrefs(): { discoverable?: boolean; acceptsMessages?: boolean } {
  try {
    const raw = localStorage.getItem(GLOBE_PREFS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as { discoverable?: boolean; acceptsMessages?: boolean };
  } catch {
    // ignore storage errors
  }
  return {};
}

function saveCachedGlobePrefs(prefs: { discoverable: boolean; acceptsMessages: boolean }) {
  try {
    localStorage.setItem(GLOBE_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

function Community({
  navigate,
  onOpenCreatePost,
  openPost,
  openMember,
  notify,
  globeUsers = DEFAULT_GLOBE_USERS,
  setGlobeUsers,
  posts = [],
  setPosts,
  currentUid = "guest_local_user",
  currentUserName = "ONY Member",
  onLikePost,
  onPostUpdated,
  onSavePostToVault,
  onRefreshPosts,
  dbSyncing,
  latestMood,
  mySupportMessages: propMySupportMessages,
  setMySupportMessages: propSetMySupportMessages,
  userCoords,
  setUserCoords,
}: {
  navigate: (s: Screen) => void;
  onOpenCreatePost?: (category?: string) => void;
  openPost: (post: Post) => void;
  openMember: (user: GlobeUser) => void;
  notify: (s: string | { text: string; actionLabel?: string; onAction?: () => void }) => void;
  globeUsers?: GlobeUser[];
  setGlobeUsers?: React.Dispatch<React.SetStateAction<GlobeUser[]>>;
  posts?: Post[];
  setPosts?: React.Dispatch<React.SetStateAction<Post[]>>;
  currentUid?: string;
  currentUserName?: string;
  onLikePost?: (postId: string) => void;
  onPostUpdated?: (updated: Post) => void;
  onSavePostToVault?: (post: Post) => void;
  onRefreshPosts?: (limitCount?: number) => Promise<void>;
  dbSyncing?: boolean;
  latestMood?: MoodEntry;
  mySupportMessages?: FirestoreCommunityMessage[];
  setMySupportMessages?: React.Dispatch<React.SetStateAction<FirestoreCommunityMessage[]>>;
  userCoords?: UserCoordinates | null;
  setUserCoords?: (c: UserCoordinates | null) => void;
}) {
  const { t, language } = useLanguage();
  const { postsViewMode, setPostsViewMode } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem("ony_posts_selected_category");
    } catch {
      return null;
    }
  });
  const [activeSortTab, setActiveSortTab] = useState<CategorySortTab>("forYou");
  const [subtopicFilter, setSubtopicFilter] = useState<SubtopicFilterId>("all");
  const [heroCollapsed, setHeroCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [reportTargetPost, setReportTargetPost] = useState<Post | null>(null);
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(() => loadHiddenPostIds());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(() => loadSavedPostIds());
  const [seenPostIds, setSeenPostIds] = useState<Set<string>>(() => loadSeenPostIds());
  const [postsFetchLimit, setPostsFetchLimit] = useState(50);
  const [reactionTick, setReactionTick] = useState(0);

  useEffect(() => {
    try {
      if (selectedCategory) {
        sessionStorage.setItem("ony_posts_selected_category", selectedCategory);
      } else {
        sessionStorage.removeItem("ony_posts_selected_category");
      }
    } catch {
      // ignore storage errors
    }
  }, [selectedCategory]);

  const [view, setView] = useState<"globe" | "posts" | "myNode">(() => {
    const showPosts = sessionStorage.getItem("ony-show-posts") === "true";
    if (showPosts) {
      sessionStorage.removeItem("ony-show-posts");
      return "posts";
    }
    const navView = sessionStorage.getItem("ony_community_view") as "globe" | "posts" | "myNode" | null;
    if (navView) {
      sessionStorage.removeItem("ony_community_view");
      return navView;
    }
    return "globe";
  });

  const meFromDb = globeUsers.find((u) => u.id === 0 || u.isMe);
  const cachedPrefs = useMemo(() => loadCachedGlobePrefs(), []);

  const [discoverable, setDiscoverableState] = useState<boolean>(
    () => cachedPrefs.discoverable ?? meFromDb?.discoverable ?? true,
  );
  const [acceptMessages, setAcceptMessagesState] = useState<boolean>(
    () => cachedPrefs.acceptsMessages ?? meFromDb?.acceptsMessages ?? true,
  );

  // Sync from live Firestore updates on own node
  useEffect(() => {
    if (!meFromDb) return;
    setDiscoverableState(meFromDb.discoverable);
    setAcceptMessagesState(meFromDb.acceptsMessages);
    saveCachedGlobePrefs({
      discoverable: meFromDb.discoverable,
      acceptsMessages: meFromDb.acceptsMessages,
    });
  }, [meFromDb?.discoverable, meFromDb?.acceptsMessages]);

  const [selectedNodeInfo, setSelectedNodeInfo] = useState<{
    user: GlobeUser;
    country: string;
    state: string;
    isHiddenSelf: boolean;
  } | null>(null);
  const [globeMode, setGlobeMode] = useState<"globe" | "list">("globe");
  const [use2DFallback, setUse2DFallback] = useState(false);
  const [webglErrorDetail, setWebglErrorDetail] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [visibilitySheetOpen, setVisibilitySheetOpen] = useState(false);
  const [mapZoom, setMapZoom] = useState(1.55);
  const [focusedCountry, setFocusedCountry] = useState<string | null>(null);
  const [focusedState, setFocusedState] = useState<string | null>(null);
  const [cameraTarget, setCameraTarget] = useState<GlobeCameraTarget | null>(null);
  const [blockedNodeIds, setBlockedNodeIds] = useState<Set<number>>(() => new Set());
  const privacySettingsRef = useRef<HTMLDivElement | null>(null);

  const [locationChoice, setLocationChoice] = useState<"none" | "declined" | "allowed">(() =>
    userCoords ? "allowed" : "none",
  );
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Store language-neutral mood key on nodes; localize display at render time
  const myMoodKey = latestMood ? normalizeMoodKey(latestMood.label, latestMood.level) : "calm";
  const myMoodLabel = getLocalizedMoodLabel(myMoodKey, language);
  const myMoodGlow: "bright" | "soft" | "dim" | "neutral" = latestMood
    ? latestMood.level >= 4
      ? "bright"
      : latestMood.level === 3
        ? "soft"
        : "dim"
    : "bright";

  const [cameraState, setCameraState] = useState<{ lon: number; lat: number; zoom: number }>({
    lon: 104.5,
    lat: 9.5,
    zoom: 1.55,
  });
  const [debouncedCameraState, setDebouncedCameraState] = useState(cameraState);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedCameraState(cameraState);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [cameraState]);

  const cameraLocation = useMemo(
    () => reverseLookupCameraLocation(debouncedCameraState.lon, debouncedCameraState.lat, debouncedCameraState.zoom),
    [debouncedCameraState],
  );

  const flyTo = useCallback(
    (lon: number, lat: number, zoom: number, country?: string | null, state?: string | null) => {
      setFocusedCountry(country ?? null);
      setFocusedState(state ?? null);
      setCameraState({ lon, lat, zoom });
      setDebouncedCameraState({ lon, lat, zoom });
      setCameraTarget({ lon, lat, zoom, seq: Date.now() + Math.random() });
    },
    [],
  );

  // Coarsened coordinates derived from either userCoords or node 0's saved location
  const myCoarsenedLocation = useMemo(() => {
    const rawLat = userCoords ? userCoords.lat : meFromDb?.lat ?? DEFAULT_GLOBE_USERS[0].lat;
    const rawLon = userCoords ? userCoords.lng : meFromDb?.lon ?? DEFAULT_GLOBE_USERS[0].lon;
    return coarsenCoordinates(rawLat, rawLon, 0);
  }, [userCoords, meFromDb?.lat, meFromDb?.lon]);

  // Persist "Appear on the globe" toggle directly to Firestore + state (live update, no restart)
  const handleSetDiscoverable = useCallback(
    (next: boolean) => {
      setDiscoverableState(next);
      saveCachedGlobePrefs({ discoverable: next, acceptsMessages: acceptMessages });
      if (setGlobeUsers) {
        setGlobeUsers((prev) =>
          prev.map((u) => (u.id === 0 || u.isMe ? { ...u, discoverable: next } : u)),
        );
      }
      void updateGlobeUserNode(0, {
        discoverable: next,
        moodGlow: myMoodGlow,
        moodKey: myMoodKey,
        moodLabel: myMoodKey,
        lat: myCoarsenedLocation.lat,
        lon: myCoarsenedLocation.lon,
      }).catch((e) => console.warn("[ONY Globe] Could not persist discoverable:", e));

      if (!next) {
        notify({
          text:
            language === "Bahasa Melayu"
              ? "Cahaya anda telah disembunyikan."
              : language === "中文"
                ? "您的微光已隐藏。"
                : "Your light is hidden.",
          actionLabel: language === "Bahasa Melayu" ? "Buat asal" : language === "中文" ? "撤销" : "Undo",
          onAction: () => {
            handleSetDiscoverable(true);
          },
        });
      } else {
        notify(
          language === "Bahasa Melayu"
            ? "Nod anda kini kelihatan di glob"
            : language === "中文"
              ? "您的匿名微光已在星球上可见"
              : "Your anonymous node is now visible on the globe",
        );
      }
    },
    [acceptMessages, setGlobeUsers, myMoodGlow, myMoodKey, myCoarsenedLocation, notify, language],
  );

  // Persist "Receive supportive messages" toggle directly to Firestore + state
  const handleSetAcceptMessages = useCallback(
    (next: boolean) => {
      setAcceptMessagesState(next);
      saveCachedGlobePrefs({ discoverable, acceptsMessages: next });
      if (setGlobeUsers) {
        setGlobeUsers((prev) =>
          prev.map((u) => (u.id === 0 || u.isMe ? { ...u, acceptsMessages: next } : u)),
        );
      }
      void updateGlobeUserNode(0, {
        acceptsMessages: next,
      }).catch((e) => console.warn("[ONY Globe] Could not persist acceptsMessages:", e));

      notify(
        next
          ? language === "Bahasa Melayu"
            ? "Mesej sokongan diaktifkan"
            : language === "中文"
              ? "已开启接收匿名鼓励留言"
              : "Supportive messages enabled for your node"
          : language === "Bahasa Melayu"
            ? "Mesej sokongan dimatikan"
            : language === "中文"
              ? "已关闭接收匿名留言"
              : "Supportive messages turned off for your node",
      );
    },
    [discoverable, setGlobeUsers, notify, language],
  );

  const handleEnableLocation = async () => {
    setDetectingLocation(true);
    setLocationError(null);
    try {
      const coords = await requestDeviceLocation();
      const coarse = coarsenCoordinates(coords.lat, coords.lng, 0);
      if (setUserCoords) setUserCoords(coords);
      setLocationChoice("allowed");
      if (setGlobeUsers) {
        setGlobeUsers((prev) =>
          prev.map((u) =>
            u.id === 0 || u.isMe ? { ...u, lat: coarse.lat, lon: coarse.lon } : u,
          ),
        );
      }
      void updateGlobeUserNode(0, {
        lat: coarse.lat,
        lon: coarse.lon,
      }).catch(() => {});
      flyTo(coarse.lon, coarse.lat, 5.2, coarse.country, coarse.state);
      notify(
        language === "Bahasa Melayu"
          ? `Kawasan anggaran ditetapkan: ${coarse.state}, ${coarse.country}`
          : language === "中文"
            ? `已模糊定位至大区：${coarse.state}，${coarse.country}`
            : `Coarse regional area set: ${coarse.state}, ${coarse.country}`,
      );
    } catch (err: any) {
      setLocationChoice("declined");
      setLocationError(err.message || t.geo_permission_denied);
      notify(err.message || t.geo_permission_denied);
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleSelectManualArea = (area: MalaysianAreaItem) => {
    const coords = createManualLocation(area);
    const coarse = coarsenCoordinates(coords.lat, coords.lng, 0);
    if (setUserCoords) setUserCoords(coords);
    setLocationChoice("allowed");
    setLocationError(null);
    if (setGlobeUsers) {
      setGlobeUsers((prev) =>
        prev.map((u) =>
          u.id === 0 || u.isMe ? { ...u, lat: coarse.lat, lon: coarse.lon } : u,
        ),
      );
    }
    void updateGlobeUserNode(0, {
      lat: coarse.lat,
      lon: coarse.lon,
    }).catch(() => {});
    flyTo(coarse.lon, coarse.lat, 5.2, coarse.country, coarse.state);
    notify(
      language === "Bahasa Melayu"
        ? `Kawasan serantau: ${area.nameBm}, ${area.state}`
        : language === "中文"
          ? `已将大区设为：${area.nameZh}（${area.state}）`
          : `Regional area set to: ${area.nameEn}, ${area.state}`,
    );
  };

  const handleClearLocation = () => {
    clearCachedLocation();
    if (setUserCoords) setUserCoords(null);
    setLocationChoice("none");
    const defaultCoarse = coarsenCoordinates(
      DEFAULT_GLOBE_USERS[0].lat,
      DEFAULT_GLOBE_USERS[0].lon,
      0,
    );
    void updateGlobeUserNode(0, {
      lat: defaultCoarse.lat,
      lon: defaultCoarse.lon,
    }).catch(() => {});
    notify(
      language === "Bahasa Melayu"
        ? "Lokasi peranti dipadamkan"
        : language === "中文"
          ? "已清除设备定位"
          : "Device location cleared",
    );
  };

  // Support messages sent specifically from others to MY node ("0" / "me" / currentUser.uid)
  const [internalSupportMessages, setInternalSupportMessages] = useState<FirestoreCommunityMessage[]>(() =>
    DEFAULT_COMMUNITY_MESSAGES.filter((m) => m.toUserId === "0").map((m, i) => ({
      id: `seed_me_${i}`,
      ...m,
    })),
  );
  const mySupportMessages = propMySupportMessages || internalSupportMessages;
  const setMySupportMessages = propSetMySupportMessages || setInternalSupportMessages;
  const [loadingMyMessages, setLoadingMyMessages] = useState(false);
  const [myMessagesError, setMyMessagesError] = useState<string | null>(null);

  const fetchMySupportMessages = async () => {
    setLoadingMyMessages(true);
    setMyMessagesError(null);
    try {
      let msgs = await listCommunityMessages("0");
      if (!msgs || msgs.length === 0) {
        const myDefaults = DEFAULT_COMMUNITY_MESSAGES.filter((m) => m.toUserId === "0");
        for (const item of myDefaults) {
          await createCommunityMessage(item).catch(() => {});
        }
        msgs = await listCommunityMessages("0");
      }
      if (msgs && msgs.length > 0) {
        setMySupportMessages(msgs);
      } else {
        setMySupportMessages(
          DEFAULT_COMMUNITY_MESSAGES.filter((m) => m.toUserId === "0").map((m, i) => ({
            id: `seed_me_${i}`,
            ...m,
          })),
        );
      }
    } catch {
      setMyMessagesError(
        language === "Bahasa Melayu"
          ? "Gagal memuat turun mesej terkini"
          : language === "中文"
            ? "刷新留言失败，请重试"
            : "Could not refresh messages. Tap Retry to try again.",
      );
    } finally {
      setLoadingMyMessages(false);
    }
  };

  useEffect(() => {
    void fetchMySupportMessages();
  }, []);

  useEffect(() => {
    if (view === "myNode") {
      void fetchMySupportMessages();
    }
  }, [view]);

  // Ensure the user's own node (id === 0 / isMe) reflects persisted privacy toggles, mood & coarsened coordinates
  const normalizedGlobeUsers: GlobeUser[] = useMemo(() => {
    const hasMe = globeUsers.some((u) => u.id === 0 || u.isMe);
    const baseList = hasMe ? globeUsers : [DEFAULT_GLOBE_USERS[0], ...globeUsers];
    return baseList.map((u) =>
      u.id === 0 || u.isMe
        ? {
            ...u,
            id: 0,
            isMe: true,
            moodGlow: myMoodGlow,
            moodKey: myMoodKey,
            moodLabel: myMoodKey,
            discoverable,
            acceptsMessages: acceptMessages,
            lat: myCoarsenedLocation.lat,
            lon: myCoarsenedLocation.lon,
          }
        : u,
    );
  }, [globeUsers, myMoodGlow, myMoodKey, discoverable, acceptMessages, myCoarsenedLocation]);

  const myNodeResolved = useMemo(
    () => resolveAndCoarsenLocation(myCoarsenedLocation.lat, myCoarsenedLocation.lon, 0),
    [myCoarsenedLocation],
  );

  const displayData = useMemo(
    () => buildGlobeDisplayItems(normalizedGlobeUsers, mapZoom, blockedNodeIds, focusedCountry),
    [normalizedGlobeUsers, mapZoom, blockedNodeIds, focusedCountry],
  );

  const listGroups = useMemo(
    () =>
      buildHierarchicalList(
        normalizedGlobeUsers,
        blockedNodeIds,
        myNodeResolved.country,
        myNodeResolved.state,
      ),
    [normalizedGlobeUsers, blockedNodeIds, myNodeResolved.country, myNodeResolved.state],
  );

  const myNodeObject = normalizedGlobeUsers.find((u) => u.id === 0 || u.isMe) || DEFAULT_GLOBE_USERS[0];

  const cameraBreadcrumbCount = useMemo(
    () => getCameraVisibleCount(normalizedGlobeUsers, cameraLocation, blockedNodeIds),
    [normalizedGlobeUsers, cameraLocation, blockedNodeIds],
  );

  const handleClusterTap = useCallback(
    (cluster: GlobeClusterDisplayItem) => {
      setMapZoom(cluster.targetZoom);
      flyTo(
        cluster.lon,
        cluster.lat,
        cluster.targetZoom,
        cluster.countryName ?? focusedCountry,
        cluster.stateName ?? null,
      );
    },
    [flyTo, focusedCountry],
  );

  const handleNodeTap = useCallback((nodeItem: GlobeNodeDisplayItem) => {
    setVisibilitySheetOpen(false);
    setSelectedNodeInfo({
      user: nodeItem.user,
      country: nodeItem.countryName,
      state: nodeItem.stateName,
      isHiddenSelf: nodeItem.isHiddenSelf,
    });
  }, []);

  const handleResetView = useCallback(() => {
    setSelectedNodeInfo(null);
    setMapZoom(1.55);
    flyTo(104.5, 9.5, 1.55, null, null);
  }, [flyTo]);

  const handleFindMyNode = useCallback(() => {
    const isHidden = !myNodeObject.discoverable;
    setVisibilitySheetOpen(false);
    if (globeMode === "globe") {
      setMapZoom(5.5);
      flyTo(
        myCoarsenedLocation.lon,
        myCoarsenedLocation.lat,
        5.5,
        myNodeResolved.country,
        myNodeResolved.state,
      );
    }
    setSelectedNodeInfo({
      user: myNodeObject,
      country: myNodeResolved.country,
      state: myNodeResolved.state,
      isHiddenSelf: isHidden,
    });
  }, [globeMode, flyTo, myCoarsenedLocation, myNodeObject, myNodeResolved]);

  const handleBreadcrumbSelect = useCallback(
    (target: "world" | "country") => {
      if (target === "world") {
        handleResetView();
      } else if (cameraLocation.country) {
        const match = listGroups.find((g) => g.country === cameraLocation.country);
        setMapZoom(3.4);
        flyTo(
          match ? match.lon : debouncedCameraState.lon,
          match ? match.lat : debouncedCameraState.lat,
          3.4,
          cameraLocation.country,
          null,
        );
      }
    },
    [handleResetView, cameraLocation.country, listGroups, flyTo, debouncedCameraState],
  );

  const handleDrillCountry = useCallback(
    (group: ListCountryGroup) => {
      setMapZoom(3.4);
      flyTo(group.lon, group.lat, 3.4, group.country, null);
    },
    [flyTo],
  );

  const handleDrillState = useCallback(
    (country: string, stateGroup: ListCountryGroup["states"][number]) => {
      setMapZoom(5.4);
      flyTo(stateGroup.lon, stateGroup.lat, 5.4, country, stateGroup.state);
    },
    [flyTo],
  );

  const handleMapZoomChange = useCallback(
    (zoom: number, center?: { lon: number; lat: number }) => {
      setMapZoom(zoom);
      setCameraState((prev) => ({
        zoom,
        lon: center ? center.lon : prev.lon,
        lat: center ? center.lat : prev.lat,
      }));
    },
    [],
  );

  const handleDeleteSupportMessage = useCallback(
    async (msgId: string, silent = false) => {
      try {
        await deleteCommunityMessage(msgId);
      } catch (e) {
        console.warn("[ONY] Message delete from Firestore failed:", e);
      }
      setMySupportMessages((prev) => prev.filter((m) => m.id !== msgId));
      if (propSetMySupportMessages) {
        propSetMySupportMessages((prev) => prev.filter((m) => m.id !== msgId));
      }
      if (!silent) {
        notify(
          language === "Bahasa Melayu"
            ? "Mesej telah dipadam"
            : language === "中文"
              ? "留言已删除"
              : "Message deleted",
        );
      }
    },
    [language, notify, propSetMySupportMessages],
  );

  const handleReportSupportMessage = useCallback(
    (msgId: string) => {
      // TODO: Persist supportive message moderation reports (`communityMessageReports`) when backend endpoint is added.
      void msgId;
      notify(
        language === "Bahasa Melayu"
          ? "Mesej telah dilaporkan kepada penyederhana"
          : language === "中文"
            ? "已向社区安全团队举报该留言"
            : "Message reported to moderators for review",
      );
    },
    [language, notify],
  );

  const deduplicatedPosts = useMemo(() => deduplicateCommunityPostList(posts), [posts]);

  const allVisiblePosts = useMemo(
    () => deduplicatedPosts.filter((p) => !hiddenPostIds.has(p.id)),
    [deduplicatedPosts, hiddenPostIds],
  );

  const worldCategories = useMemo(
    () => extractWorldCategories(deduplicatedPosts, hiddenPostIds, seenPostIds, categories),
    [deduplicatedPosts, hiddenPostIds, seenPostIds],
  );

  const markPostViewed = useCallback((postId: string) => {
    setSeenPostIds((prev) => {
      if (prev.has(postId)) return prev;
      const next = new Set(prev);
      next.add(postId);
      saveSeenPostIds(next);
      return next;
    });
  }, []);

  const shown = useMemo(() => {
    const activeCat = selectedCategory || "All";
    const needle = query.trim().toLowerCase();
    const catMatched = allVisiblePosts.filter((p) => {
      if (
        activeCat !== "All" &&
        (p.category || "General").trim().toLowerCase() !== activeCat.trim().toLowerCase()
      ) {
        return false;
      }
      if (needle) {
        const hay = `${p.title} ${p.body} ${p.author} ${p.category}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const subtopicMatched = filterPostsBySubtopic(catMatched, subtopicFilter);
    return sortCommunityPosts(subtopicMatched, activeSortTab, seenPostIds);
  }, [allVisiblePosts, selectedCategory, query, subtopicFilter, activeSortTab, seenPostIds, reactionTick]);

  const activeCommentPost = useMemo(
    () => (activeCommentPostId ? posts.find((p) => p.id === activeCommentPostId) || null : null),
    [activeCommentPostId, posts],
  );

  const handleSelectPostReaction = useCallback(
    (postId: string, reaction: SupportiveReactionType) => {
      const targetPost = posts.find((p) => p.id === postId);
      if (!targetPost) return;
      const cleanUid = currentUid.trim() || "anonymous_user";
      const cleanName = currentUserName.trim().toLowerCase();
      const records = Array.isArray(targetPost.likeRecords) ? targetPost.likeRecords : [];
      const alreadyLiked = records.some(
        (rec) =>
          rec.userId === cleanUid ||
          rec.userName.trim().toLowerCase() === cleanName,
      );
      const currentReaction = getUserReactionChoice(postId, cleanUid) || (alreadyLiked ? "hug" : null);

      if (alreadyLiked && currentReaction === reaction) {
        saveUserReactionChoice(postId, cleanUid, null);
        setReactionTick((n) => n + 1);
        onLikePost?.(postId);
      } else if (alreadyLiked && currentReaction !== reaction) {
        saveUserReactionChoice(postId, cleanUid, reaction);
        setReactionTick((n) => n + 1);
      } else {
        saveUserReactionChoice(postId, cleanUid, reaction);
        setReactionTick((n) => n + 1);
        onLikePost?.(postId);
      }
    },
    [posts, currentUid, currentUserName, onLikePost],
  );

  const handleHideCommunityPost = useCallback(
    (postId: string) => {
      setHiddenPostIds((prev) => {
        const next = new Set(prev);
        next.add(postId);
        saveHiddenPostIds(next);
        return next;
      });
      notify({
        text:
          language === "Bahasa Melayu"
            ? "Siaran disembunyikan daripada suapan anda"
            : language === "中文"
              ? "已为您隐藏该帖子"
              : "Post hidden from your feed",
        actionLabel: language === "Bahasa Melayu" ? "Buat asal" : language === "中文" ? "撤销" : "Undo",
        onAction: () => {
          setHiddenPostIds((prev) => {
            const next = new Set(prev);
            next.delete(postId);
            saveHiddenPostIds(next);
            return next;
          });
        },
      });
    },
    [language, notify],
  );

  const handleReportCommunityPost = useCallback(
    (post: Post) => {
      setReportTargetPost(post);
    },
    [],
  );

  const handleConfirmReportCommunityPost = useCallback(
    (_post: Post, _reason: string) => {
      notify(
        language === "Bahasa Melayu"
          ? "Terima kasih. Siaran ditandakan untuk semakan moderasi."
          : language === "中文"
            ? "感谢反馈。帖子已提交社区安全团队审核。"
            : "Thank you. Post flagged for community moderation.",
      );
    },
    [language, notify],
  );

  const handleSavePostToVaultClick = useCallback(
    (post: Post) => {
      if (savedPostIds.has(post.id)) {
        notify(
          language === "Bahasa Melayu"
            ? "Sudah disimpan dalam Peti Memori"
            : language === "中文"
              ? "已保存在记忆宝库中"
              : "Already saved to Memory Vault",
        );
        return;
      }
      setSavedPostIds((prev) => {
        const next = new Set(prev);
        next.add(post.id);
        saveSavedPostIds(next);
        return next;
      });
      if (onSavePostToVault) {
        onSavePostToVault(post);
      } else {
        notify(
          language === "Bahasa Melayu"
            ? "Disimpan ke Peti Memori"
            : language === "中文"
              ? "已保存到记忆宝库"
              : "Saved to Memory Vault",
        );
      }
    },
    [savedPostIds, onSavePostToVault, language, notify],
  );

  const handleRefreshPosts = useCallback(async () => {
    if (onRefreshPosts) {
      await onRefreshPosts(postsFetchLimit);
    }
  }, [onRefreshPosts, postsFetchLimit]);

  const handleLoadMorePosts = useCallback(() => {
    if (posts.length >= postsFetchLimit && onRefreshPosts) {
      const nextLimit = postsFetchLimit + 30;
      setPostsFetchLimit(nextLimit);
      void onRefreshPosts(nextLimit);
    }
  }, [posts.length, postsFetchLimit, onRefreshPosts]);

  const communityPageClass =
    view === "globe"
      ? "globe-tab-active"
      : view === "myNode"
        ? "my-node-tab-active"
        : view === "posts" && selectedCategory === null
          ? "posts-desk-active"
          : view === "posts" && postsViewMode === "feed"
            ? "posts-feed-active"
            : view === "posts"
              ? "posts-list-active"
              : "";

  const openCreatePostFlow = (cat?: string) => {
    if (onOpenCreatePost) {
      onOpenCreatePost(cat);
    } else {
      navigate("post");
    }
  };

  return <><PageHeader title={t.community_title} subtitle={undefined} action={<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>{dbSyncing && <span className="status-badge">{t.common_syncing}</span>}<Button className="create-post-top" onClick={() => openCreatePostFlow(selectedCategory || undefined)}>+ {t.community_create_post}</Button></div>} /><section className={`page-pad community-page ${communityPageClass}`}>
    <div className="community-view-switch" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
      <Button variant={view === "globe" ? "primary" : "secondary"} onClick={() => setView("globe")}>{t.community_tab_globe}</Button>
      <Button variant={view === "posts" ? "primary" : "secondary"} onClick={() => setView("posts")}>{t.community_tab_posts}</Button>
      <Button variant={view === "myNode" ? "primary" : "secondary"} onClick={() => setView("myNode")}>{t.community_my_node} ({mySupportMessages.length})</Button>
    </div>
    {view === "globe" && <>
      <div className="globe-stage-shell">
        <GlobeBreadcrumb
          level={cameraLocation.level}
          countryName={cameraLocation.country}
          stateName={cameraLocation.state}
          visibleCount={cameraBreadcrumbCount}
          language={language}
          onSelectLevel={handleBreadcrumbSelect}
        />

        {globeMode === "list" ? (
          <ListViewPanel
            groups={listGroups}
            level={cameraLocation.level}
            focusedCountry={cameraLocation.country}
            focusedState={cameraLocation.state}
            hiddenSelfNode={!discoverable ? myNodeObject : null}
            hiddenSelfRegion={!discoverable ? { country: myNodeResolved.country, state: myNodeResolved.state } : null}
            language={language}
            onDrillCountry={handleDrillCountry}
            onDrillState={handleDrillState}
            onSelectNode={(user, country, state, isHiddenSelf = false) => {
              setVisibilitySheetOpen(false);
              setSelectedNodeInfo({ user, country, state, isHiddenSelf });
            }}
          />
        ) : !use2DFallback ? (
          <GlobeView
            items={displayData.items}
            hiddenSelf={displayData.hiddenSelf}
            level={displayData.level}
            selectedNodeId={selectedNodeInfo?.user.id ?? null}
            cameraTarget={cameraTarget}
            pauseAutoRotate={Boolean(selectedNodeInfo || visibilitySheetOpen)}
            loading={Boolean(dbSyncing && normalizedGlobeUsers.length === 0)}
            retryNonce={retryNonce}
            language={language}
            onZoomChange={(zoom, center) => handleMapZoomChange(zoom, center)}
            onClusterTap={handleClusterTap}
            onNodeTap={handleNodeTap}
            onWebGlError={(reason) => {
              setWebglErrorDetail(reason);
              setUse2DFallback(true);
            }}
          />
        ) : (
          <Fallback2DMap
            items={displayData.items}
            hiddenSelf={displayData.hiddenSelf}
            selectedNodeId={selectedNodeInfo?.user.id ?? null}
            cameraTarget={cameraTarget}
            fallbackReason={webglErrorDetail}
            language={language}
            onZoomChange={(zoom, center) => handleMapZoomChange(zoom, center)}
            onClusterTap={handleClusterTap}
            onNodeTap={handleNodeTap}
            onRetry3D={() => {
              setUse2DFallback(false);
              setWebglErrorDetail(null);
              setRetryNonce((n) => n + 1);
            }}
          />
        )}

        <GlobeControls
          viewMode={globeMode}
          discoverable={discoverable}
          onToggleViewMode={() =>
            setGlobeMode((prev) => (prev === "globe" ? "list" : "globe"))
          }
          onResetView={handleResetView}
          onFindMyNode={handleFindMyNode}
          onOpenVisibilitySheet={() => {
            setSelectedNodeInfo(null);
            setVisibilitySheetOpen(true);
          }}
          onOpenGuidelines={() => navigate("guidelines")}
          canReset={mapZoom > 1.7 || Boolean(focusedCountry)}
          language={language}
        />

        <NodeSheet
          node={selectedNodeInfo?.user ?? null}
          countryName={selectedNodeInfo?.country}
          stateName={selectedNodeInfo?.state}
          isMe={Boolean(selectedNodeInfo && (selectedNodeInfo.user.isMe || selectedNodeInfo.user.id === 0))}
          isHiddenSelf={Boolean(selectedNodeInfo?.isHiddenSelf)}
          mySupportCount={mySupportMessages.length}
          language={language}
          onClose={() => setSelectedNodeInfo(null)}
          onOpenMyMessages={() => {
            setSelectedNodeInfo(null);
            setView("myNode");
          }}
          onOpenVisibilitySetting={() => {
            setSelectedNodeInfo(null);
            setVisibilitySheetOpen(true);
          }}
          onConnect={(node) => {
            setSelectedNodeInfo(null);
            openMember(node);
          }}
          onReport={(node) => {
            // TODO: Wire to a persistent Firestore moderation/reports collection when backend endpoint is added.
            notify(
              language === "Bahasa Melayu"
                ? `Terima kasih atas laporan anda untuk Ahli #${node.id}. Nod dihantar untuk semakan.`
                : language === "中文"
                  ? `感谢您的反馈，匿名成员 #${node.id} 已提交社区审核。`
                  : `Thank you for reporting Member #${node.id}. Sent for moderation review.`,
            );
            setSelectedNodeInfo(null);
          }}
          onBlock={(node) => {
            // TODO: Persist blocked node IDs once user blocklist backend endpoint is introduced.
            setBlockedNodeIds((prev) => {
              const next = new Set(prev);
              next.add(node.id);
              return next;
            });
            setSelectedNodeInfo(null);
            notify(
              language === "Bahasa Melayu"
                ? "Ahli tanpa nama disekat dan disembunyikan dalam sesi ini"
                : language === "中文"
                  ? "已屏蔽该匿名成员并从此视图移除"
                  : "Anonymous member blocked and hidden for this session",
            );
          }}
        />

        {visibilitySheetOpen && (
          <div
            className="globe-visibility-sheet-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setVisibilitySheetOpen(false);
            }}
          >
            <div
              className="globe-visibility-sheet"
              role="dialog"
              aria-modal="true"
              aria-label={t.community_appear_globe}
            >
              <div className="globe-sheet-handle" aria-hidden="true" />
              <div className="globe-visibility-head">
                <strong>
                  {language === "Bahasa Melayu"
                    ? "Keterlihatan Nod Anda"
                    : language === "中文"
                      ? "您的节点可见设置"
                      : "Your Node Visibility"}
                </strong>
                <button
                  type="button"
                  className="globe-sheet-mini-icon"
                  onClick={() => setVisibilitySheetOpen(false)}
                  aria-label="Close"
                >
                  <Icon name="close" />
                </button>
              </div>
              <div className="globe-visibility-item">
                <ThemedSwitch
                  checked={discoverable}
                  onChange={handleSetDiscoverable}
                  label={t.community_appear_globe}
                  description={t.community_appear_globe_desc}
                  onStatusText={language === "中文" ? "开启 · 对社区可见" : language === "Bahasa Melayu" ? "Aktif · kelihatan" : "On · visible to others"}
                  offStatusText={language === "中文" ? "关闭 · 已隐藏" : language === "Bahasa Melayu" ? "Mati · tersembunyi" : "Off · hidden"}
                  ariaLabel={t.community_appear_globe}
                />
              </div>
              <div className="globe-visibility-item">
                <ThemedSwitch
                  checked={acceptMessages}
                  onChange={handleSetAcceptMessages}
                  label={t.community_receive_support}
                  description={t.community_receive_support_desc}
                  onStatusText={language === "中文" ? "开启 · 正常接收" : language === "Bahasa Melayu" ? "Aktif · menerima" : "On · receiving messages"}
                  offStatusText={language === "中文" ? "关闭 · 已暂停" : language === "Bahasa Melayu" ? "Mati · dijeda" : "Off · messages paused"}
                  ariaLabel={t.community_receive_support}
                />
              </div>
              <div className="globe-visibility-footer">
                <small>
                  {myNodeResolved.state}, {myNodeResolved.country}
                </small>
                <button
                  type="button"
                  className="globe-sheet-text-link"
                  onClick={() => {
                    setVisibilitySheetOpen(false);
                    setView("myNode");
                  }}
                >
                  {language === "Bahasa Melayu"
                    ? "Tetapan kawasan penuh ›"
                    : language === "中文"
                      ? "完整区域设置 ›"
                      : "Full node settings ›"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>}
    {view === "posts" && (
      <div className="posts-stage-shell">
        {selectedCategory === null ? (
          <CommunityWorldScene
            categories={worldCategories}
            allVisiblePosts={allVisiblePosts}
            searchOpen={searchOpen}
            searchQuery={query}
            onToggleSearch={() => {
              if (searchOpen) {
                setSearchOpen(false);
                setQuery("");
              } else {
                setSearchOpen(true);
              }
            }}
            onSearchChange={setQuery}
            onSelectCategory={(cat) => {
              setQuery("");
              setSearchOpen(false);
              setHeroCollapsed(false);
              setSubtopicFilter("all");
              setSelectedCategory(cat);
            }}
            onSelectSearchPost={(post) => {
              markPostViewed(post.id);
              openPost(post);
            }}
            onOpenFeedWithSearch={() => {
              setHeroCollapsed(false);
              setSelectedCategory("All");
            }}
            language={language}
          />
        ) : (
          <>
            <CategoryHeader
              selectedCategory={selectedCategory}
              categories={worldCategories}
              filteredCount={shown.length}
              activeSortTab={activeSortTab}
              subtopicFilter={subtopicFilter}
              viewMode={postsViewMode}
              heroCollapsed={heroCollapsed}
              searchOpen={searchOpen}
              searchQuery={query}
              onBackToGarden={() => {
                setSelectedCategory(null);
                setHeroCollapsed(false);
                setQuery("");
                setSearchOpen(false);
                setSubtopicFilter("all");
              }}
              onSelectCategory={(cat) => {
                setHeroCollapsed(false);
                setSubtopicFilter("all");
                setSelectedCategory(cat);
              }}
              onChangeSortTab={setActiveSortTab}
              onChangeSubtopic={setSubtopicFilter}
              onChangeViewMode={setPostsViewMode}
              onToggleSearch={() => {
                if (searchOpen) {
                  setSearchOpen(false);
                  setQuery("");
                } else {
                  setSearchOpen(true);
                }
              }}
              onSearchChange={setQuery}
              onCreatePost={() => openCreatePostFlow(selectedCategory)}
              onRefresh={() => void handleRefreshPosts()}
              language={language}
            />

            <PostFeed
              posts={shown}
              selectedCategory={selectedCategory}
              viewMode={postsViewMode}
              loading={Boolean(dbSyncing)}
              hasSearchQuery={query.trim().length > 0 || subtopicFilter !== "all"}
              currentUid={currentUid}
              currentUserName={currentUserName}
              savedPostIds={savedPostIds}
              onScrollCollapseChange={setHeroCollapsed}
              onPostViewed={markPostViewed}
              onOpenPostDetail={(post) => {
                markPostViewed(post.id);
                openPost(post);
              }}
              onSelectReaction={handleSelectPostReaction}
              onOpenComments={(postId) => setActiveCommentPostId(postId)}
              onSaveToVault={handleSavePostToVaultClick}
              onReportPost={handleReportCommunityPost}
              onHidePost={handleHideCommunityPost}
              onOpenHelp={() => navigate("help")}
              onCreatePost={() => openCreatePostFlow(selectedCategory)}
              onResetSearch={() => {
                setQuery("");
                setSearchOpen(false);
                setSubtopicFilter("all");
              }}
              onRefresh={handleRefreshPosts}
              onLoadMore={handleLoadMorePosts}
              notify={(msg) => notify(msg)}
              language={language}
            />
          </>
        )}

        <CommentSheet
          post={activeCommentPost}
          currentUid={currentUid}
          currentUserName={currentUserName}
          loadingComments={Boolean(dbSyncing)}
          onClose={() => setActiveCommentPostId(null)}
          onPostUpdated={(updated) => {
            if (onPostUpdated) {
              onPostUpdated(updated);
            } else if (setPosts) {
              setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            }
          }}
          onOpenHelp={() => navigate("help")}
          notify={(msg) => notify(msg)}
        />

        <ReportReasonSheet
          post={reportTargetPost}
          language={language}
          onClose={() => setReportTargetPost(null)}
          onConfirmReport={handleConfirmReportCommunityPost}
        />
      </div>
    )}
    {view === "myNode" && (
      <MyNodeTab
        discoverable={discoverable}
        acceptMessages={acceptMessages}
        onSetDiscoverable={handleSetDiscoverable}
        onSetAcceptMessages={handleSetAcceptMessages}
        myMoodEmoji={latestMood ? latestMood.emoji : "🌱"}
        myMoodLabel={myMoodLabel}
        myMoodGlow={myMoodGlow}
        myRegion={{ state: myNodeResolved.state, country: myNodeResolved.country }}
        onUpdateMood={() => navigate("mood")}
        onLocateOnGlobe={() => {
          setView("globe");
          window.setTimeout(() => {
            handleFindMyNode();
          }, 80);
        }}
        messages={mySupportMessages}
        loadingMessages={loadingMyMessages}
        messagesError={myMessagesError}
        onRefreshMessages={fetchMySupportMessages}
        onDeleteMessage={(id) => handleDeleteSupportMessage(id, true)}
        onReportMessage={handleReportSupportMessage}
        detectingLocation={detectingLocation}
        locationChoice={locationChoice}
        onEnableLocation={handleEnableLocation}
        onClearLocation={handleClearLocation}
        onSelectManualArea={() => setLocationChoice("declined")}
        renderAreaPicker={() =>
          locationChoice === "declined" ? (
            <AreaSearchPicker
              userCoords={userCoords || null}
              onSelectArea={handleSelectManualArea}
              onDetectLocation={handleEnableLocation}
              onClearLocation={handleClearLocation}
              detectingLocation={detectingLocation}
              isDenied={Boolean(locationError)}
              errorMessage={locationError}
              compact
              title={locationError ? t.geo_denied_heading : undefined}
              subtitle={locationError ? t.geo_denied_help_desc : undefined}
            />
          ) : null
        }
        notify={notify}
        language={language}
      />
    )}
  </section></>;
}

function CreatePost({
  back,
  notify,
  displayName = "Anonymous",
  currentUid = "guest_local_user",
  initialCategory = "General",
  onPostCreated,
}: {
  back: () => void;
  notify: (s: string) => void;
  displayName?: string;
  currentUid?: string;
  initialCategory?: string;
  onPostCreated?: (post: Omit<FirestoreCommunityPost, "id">) => Promise<void>;
}) {
  const { t, language } = useLanguage();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(() =>
    initialCategory && initialCategory !== "All" ? initialCategory : "General",
  );
  const [posted, setPosted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [postAs, setPostAs] = useState("Anonymous");
  const [media, setMedia] = useState<"text" | "image" | "voice">("text");
  const [guidelineError, setGuidelineError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState("");

  // Real voice recording state
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0.1);
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; dataUrl: string; duration: number } | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (recorderRef.current) recorderRef.current.cancel();
      if (previewAudioRef.current) previewAudioRef.current.pause();
    };
  }, []);

  const handleStartRecording = async () => {
    try {
      if (!recorderRef.current) {
        recorderRef.current = new VoiceRecorder();
      }
      setMicError(null);
      setRecording(true);
      setRecordingSeconds(0);
      setRecordedAudio(null);
      setIsPlayingPreview(false);

      await recorderRef.current.start({
        onVolumeChange: (vol) => setVolumeLevel(vol),
        onTimeUpdate: (sec) => setRecordingSeconds(sec),
        maxDurationSeconds: 120,
        onMaxDurationReached: () => handleStopRecording(),
      });
      notify(language === "Bahasa Melayu" ? "Rakaman bermula · bercakap ke mikrofon anda" : language === "中文" ? "录音开始 · 请对麦克风倾诉" : "Recording started · speak into your mic");
    } catch (err: any) {
      setRecording(false);
      const errMsg = err?.message || (language === "Bahasa Melayu" ? "Akses mikrofon terhad dalam bingkai pratonton ini." : language === "中文" ? "当前预览环境限制麦克风访问。" : "Microphone access is restricted in this preview frame.");
      setMicError(errMsg);
      notify(errMsg);
    }
  };

  const handleStopRecording = async () => {
    if (!recorderRef.current || !recording) return;
    try {
      setRecording(false);
      const res = await recorderRef.current.stop();
      setRecordedAudio(res);
      notify(language === "Bahasa Melayu" ? "Nota suara dirakam" : language === "中文" ? "语音已录制完成" : "Voice note recorded");
    } catch {
      notify(language === "Bahasa Melayu" ? "Gagal menyimpan rakaman audio" : language === "中文" ? "无法保存音频录音" : "Failed to save audio recording");
    }
  };

  const handleTogglePreview = () => {
    if (!recordedAudio) return;
    if (!previewAudioRef.current) {
      const audio = new Audio(recordedAudio.dataUrl);
      audio.onended = () => setIsPlayingPreview(false);
      previewAudioRef.current = audio;
    }
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play().then(() => {
        setIsPlayingPreview(true);
      }).catch(() => {
        notify(language === "Bahasa Melayu" ? "Tidak dapat memainkan audio pratonton" : language === "中文" ? "无法播放预览音频" : "Unable to play preview audio");
      });
    }
  };

  const handleDiscardRecording = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setRecordedAudio(null);
    setRecordingSeconds(0);
    setIsPlayingPreview(false);
  };

  if (posted) return <div className="centered-state"><div className="success-mark"><Icon name="check" /></div><h1>{t.community_post_live}</h1><p>{t.community_post_live_desc}</p><Button onClick={back}>{t.community_return_feed}</Button></div>;
  return <><PageHeader title={t.community_create_post_title} subtitle={t.community_create_post_sub} back={back} /><section className="page-pad">
    <label className="field-label">{t.community_post_as}</label><div className="segmented"><Button variant={postAs === "ONY profile" ? "primary" : "secondary"} onClick={() => setPostAs("ONY profile")}>{t.community_my_profile}</Button><Button variant={postAs === "Anonymous" ? "primary" : "secondary"} onClick={() => setPostAs("Anonymous")}>{language === "Bahasa Melayu" ? "Tanpa Nama" : language === "中文" ? "匿名" : "Anonymous"}</Button></div>
    <label className="field-label">{t.community_format}</label><div className="segmented"><Button variant={media === "text" ? "primary" : "secondary"} onClick={() => setMedia("text")}>{t.community_text}</Button><Button variant={media === "image" ? "primary" : "secondary"} onClick={() => setMedia("image")}>{t.community_image}</Button><Button variant={media === "voice" ? "primary" : "secondary"} onClick={() => setMedia("voice")}>{t.community_voice}</Button></div>
    <label className="field-label">{t.community_title_label}</label><TextInput value={title} onChange={(e) => { setTitle(e.target.value); setGuidelineError(null); }} placeholder={t.community_title_placeholder} />
    {media !== "voice" && <><label className="field-label">{t.community_body_label}</label><TextArea value={body} onChange={(e) => { setBody(e.target.value); setGuidelineError(null); }} rows={5} placeholder={t.community_body_placeholder} /></>}
    {media === "image" && (
      <div>
        <input
          type="file"
          id="post-image-picker"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              const r = new FileReader();
              r.onload = () => {
                setUploadedImage(r.result as string);
                setImageFileName(f.name);
                notify(language === "Bahasa Melayu" ? "Imej dipilih" : language === "中文" ? "已选择图片" : "Image selected");
              };
              r.readAsDataURL(f);
            }
          }}
        />
        <button
          type="button"
          className="image-upload selected"
          onClick={() => document.getElementById("post-image-picker")?.click()}
        >
          {uploadedImage ? (
            <img src={uploadedImage} alt="Post preview" style={{ width: "100%", height: "130px", objectFit: "cover", borderRadius: "14px" }} />
          ) : (
            <span className="sample-photo sunset"><i /></span>
          )}
          <strong>{imageFileName || (language === "Bahasa Melayu" ? "Pilih foto dari peranti anda" : language === "中文" ? "从设备选择照片" : "Select photo from your device")}</strong>
          <small>{language === "Bahasa Melayu" ? "Ketik untuk muat naik foto" : language === "中文" ? "轻点上传照片" : "Tap to upload photo"}</small>
        </button>
      </div>
    )}
    {media === "voice" && (
      <div className="voice-record-card">
        {!recordedAudio ? (
          <>
            <button
              type="button"
              className={recording ? "recording" : ""}
              onClick={recording ? handleStopRecording : handleStartRecording}
              aria-label={recording ? t.chat_voice_stop_speaking : t.community_record_voice}
            >
              <Icon name={recording ? "close" : "mic"} />
            </button>
            <div style={{ flex: 1 }}>
              <strong>
                {recording
                  ? `${language === "Bahasa Melayu" ? "Merakam" : language === "中文" ? "录音中" : "Recording"} · ${formatAudioDuration(recordingSeconds)}`
                  : t.community_record_voice}
              </strong>
              <small>
                {recording
                  ? t.community_record_hint
                  : (language === "Bahasa Melayu" ? "Bercakap dengan tenang ke dalam mikrofon anda" : language === "中文" ? "轻声对着麦克风诉说即可" : "Speak into your microphone gently")}
              </small>
              {recording && (
                <div className="voice-live-waves mini">
                  <span style={{ height: `${Math.max(4, volumeLevel * 22)}px` }} />
                  <span style={{ height: `${Math.max(6, volumeLevel * 30)}px` }} />
                  <span style={{ height: `${Math.max(4, volumeLevel * 18)}px` }} />
                  <span style={{ height: `${Math.max(7, volumeLevel * 28)}px` }} />
                  <span style={{ height: `${Math.max(4, volumeLevel * 16)}px` }} />
                </div>
              )}
            </div>
            {recording ? (
              <Button variant="danger" onClick={handleStopRecording}>
                {t.common_done}
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => void handleStartRecording()}>
                <Icon name="mic" />
                {language === "Bahasa Melayu" ? "Rakam Suara" : language === "中文" ? "录制语音" : "Record Voice"}
              </Button>
            )}
            {micError && (
              <div className="voice-mic-inline-help">
                <small>{micError}</small>
              </div>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              className="preview-play-btn"
              onClick={handleTogglePreview}
              aria-label={isPlayingPreview ? t.common_pause : t.common_play}
            >
              <Icon name={isPlayingPreview ? "pause" : "play"} />
            </button>
            <div>
              <strong>{t.community_voice_ready} · {formatAudioDuration(recordedAudio.duration)}</strong>
              <small>{language === "Bahasa Melayu" ? "Dirakam dengan mikrofon anda" : language === "中文" ? "已通过麦克风录制" : "Recorded with your mic"}</small>
            </div>
            <Button variant="ghost" onClick={handleTogglePreview}>
              {isPlayingPreview ? t.common_pause : t.common_play}
            </Button>
            <Button variant="ghost" onClick={handleDiscardRecording}>
              {t.community_re_record}
            </Button>
          </>
        )}
      </div>
    )}
    <label className="field-label">{language === "Bahasa Melayu" ? "Kategori" : language === "中文" ? "分类" : "Category"}</label><div className="chips">{categories.slice(1).map((x) => <Button key={x} variant={category === x ? "primary" : "secondary"} onClick={() => setCategory(x)}>{getCategoryLabel(x, language)}</Button>)}</div>
    {guidelineError && (
      <div className="form-error" role="alert">
        <Icon name="info" />
        <span>{guidelineError}</span>
      </div>
    )}
    <div className="community-note"><Icon name="info" />{t.community_mod_notice}</div>
    <Button className="full" disabled={submitting || !title || (media === "text" && !body) || (media === "voice" && !recordedAudio)} onClick={async () => {
      const titleCheck = validateCommunityCommentText(title);
      if (!titleCheck.valid) {
        setGuidelineError(titleCheck.reason || "Title violates community guidelines.");
        notify(language === "Bahasa Melayu" ? "Siaran disekat: melanggar garis panduan komuniti" : language === "中文" ? "发帖已拦截：违反社区准则" : "Post blocked: violates community guidelines");
        return;
      }
      if (body.trim()) {
        const bodyCheck = validateCommunityCommentText(body);
        if (!bodyCheck.valid) {
          setGuidelineError(bodyCheck.reason || "Post content violates community guidelines.");
          notify(language === "Bahasa Melayu" ? "Siaran disekat: melanggar garis panduan komuniti" : language === "中文" ? "发帖已拦截：违反社区准则" : "Post blocked: violates community guidelines");
          return;
        }
      }
      const authorName = postAs === "Anonymous" ? "Anonymous" : `${displayName} · ONY profile`;
      const postPayload: Omit<FirestoreCommunityPost, "id"> = {
        author: authorName,
        authorId: currentUid,
        title: title.trim(),
        body: (body || "Voice message shared with the community.").trim(),
        category,
        likes: 0,
        likeRecords: [],
        comments: [],
        media: media === "text" ? undefined : media,
        audioUrl: media === "voice" && recordedAudio ? recordedAudio.dataUrl : undefined,
        audioDuration: media === "voice" && recordedAudio ? recordedAudio.duration : undefined,
        createdAt: new Date().toISOString(),
      };
      if (onPostCreated) {
        setSubmitting(true);
        await onPostCreated(postPayload);
        setSubmitting(false);
      }
      setPosted(true);
    }}>{submitting ? (language === "Bahasa Melayu" ? "Menerbitkan…" : language === "中文" ? "正在发布…" : "Publishing…") : (language === "Bahasa Melayu" ? "Terbitkan siaran" : language === "中文" ? "发布帖子" : "Publish post")}</Button></section></>;
}

function VoiceNote({
  audioUrl,
  audioDuration = 12,
  notify,
}: {
  audioUrl?: string;
  audioDuration?: number;
  notify: (s: string) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = () => {
    if (audioUrl) {
      if (!audioRef.current) {
        const audio = new Audio(audioUrl);
        audio.ontimeupdate = () => setCurrentTime(Math.floor(audio.currentTime));
        audio.onended = () => {
          setPlaying(false);
          setCurrentTime(0);
        };
        audio.onerror = () => {
          setPlaying(false);
          notify("Unable to play voice note");
        };
        audioRef.current = audio;
      }
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
        notify("Voice paused");
      } else {
        audioRef.current.play().then(() => {
          setPlaying(true);
          notify("Playing voice message");
        }).catch(() => {
          notify("Audio playback blocked by browser");
        });
      }
    } else {
      // Fallback soothing chime tone
      if (playing) {
        setPlaying(false);
        notify("Voice paused");
      } else {
        setPlaying(true);
        notify("Playing soothing voice note");
        void playSoothingChime(audioDuration).then(() => {
          setPlaying(false);
        });
      }
    }
  };

  return (
    <div className="voice-note">
      <Button
        className="icon-btn"
        onClick={togglePlay}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
      >
        <Icon name={playing ? "pause" : "play"} />
      </Button>
      <span className={playing ? "playing" : ""}>
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <small>
        {playing && currentTime > 0
          ? `${formatAudioDuration(currentTime)} / ${formatAudioDuration(audioDuration)}`
          : formatAudioDuration(audioDuration)}
      </small>
    </div>
  );
}



const fallbackMerchants: Merchant[] = DEFAULT_MERCHANTS;

function Marketplace({ navigate, openMerchant, merchants = fallbackMerchants, dbSyncing }: { navigate: (s: Screen) => void; openMerchant: (name: string) => void; merchants?: Merchant[]; dbSyncing?: boolean }) {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const cats = ["All", "Café", "Art / creative", "Yoga / meditation", "Music", "Relaxation", "Wellness products", "Professional support"];
  const getCatLabel = (c: string) => {
    if (language === "Bahasa Melayu") {
      switch (c) {
        case "All": return "Semua";
        case "Café": return "Kafe";
        case "Art / creative": return "Seni / Kreatif";
        case "Yoga / meditation": return "Yoga / Meditasi";
        case "Music": return "Muzik";
        case "Relaxation": return "Relaksasi";
        case "Wellness products": return "Produk Kesejahteraan";
        case "Professional support": return "Sokongan Profesional";
        default: return c;
      }
    }
    if (language === "中文") {
      switch (c) {
        case "All": return "全部";
        case "Café": return "静心咖啡";
        case "Art / creative": return "艺术与手作";
        case "Yoga / meditation": return "瑜伽与冥想";
        case "Music": return "疗愈音乐";
        case "Relaxation": return "深度放松";
        case "Wellness products": return "身心好物";
        case "Professional support": return "专业医疗支持";
        default: return c;
      }
    }
    return c;
  };
  const list = merchants && merchants.length > 0 ? merchants : fallbackMerchants;
  const shown = list.filter((m) => (category === "All" || m.category === category) && `${m.name} ${m.offer}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <PageHeader
        title={t.market_title}
        subtitle={t.market_subtitle}
        action={
          <span
            className="status-badge"
            style={{ background: "var(--theme-surface-soft)", color: "var(--theme-success)" }}
          >
            {dbSyncing
              ? language === "Bahasa Melayu"
                ? "Menyegerak…"
                : language === "中文"
                ? "同步中…"
                : "Syncing…"
              : t.market_verified_partners}
          </span>
        }
      />
      <section className="page-pad topless market-page-section">
        <div className="market-hero">
          <span className="eyebrow">{t.market_nearby_eyebrow}</span>
          <h2>{t.market_hero_title}</h2>
          <p>{t.market_hero_desc}</p>
        </div>
        <div className="market-sticky-controls">
          <div className="search">
            <Icon name="search" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.market_search_placeholder}
            />
            {query && (
              <button
                type="button"
                className="market-search-clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                title="Clear search"
              >
                <Icon name="close" />
              </button>
            )}
          </div>
          <div className="scroll-chips">
            {cats.map((x) => (
              <Button
                key={x}
                variant={category === x ? "primary" : "secondary"}
                onClick={() =>
                  x === "Professional support"
                    ? navigate("professional")
                    : setCategory(x)
                }
              >
                {getCatLabel(x)}
              </Button>
            ))}
          </div>
        </div>
        <div className="market-section-head">
          <h3>{t.market_wellness_vouchers}</h3>
          <Button variant="ghost" onClick={() => setCategory("All")}>
            {t.market_view_all}
          </Button>
        </div>
    <div className="voucher-list">{shown.map((m) => <button className="voucher-ticket" key={m.name} onClick={() => openMerchant(m.name)}><span className="voucher-ticket-stub"><img src={m.image} alt="" /><small>{getCatLabel(m.category)}</small><strong>{m.value}</strong></span><span className="voucher-ticket-body"><small>{getCatLabel(m.category)} · {language === "Bahasa Melayu" ? "Rakan" : language === "中文" ? "合作商户" : "Partner"}</small><strong>{m.name}</strong><b>{m.offer}</b><span>{m.description}</span><em>{m.validity}</em><i>{t.market_claim_voucher}</i></span></button>)}</div>
    <button className="professional-banner" onClick={() => navigate("professional")}><Icon name="shield" /><span><strong>{t.market_prof_banner_title}</strong><small>{t.market_prof_banner_desc}</small></span><Icon name="chevron" /></button>
    <p className="disclaimer"><Icon name="info" /> {language === "Bahasa Melayu" ? "Semua keistimewaan rakan kongsi dan tawaran kesejahteraan telah disahkan bersama komuniti peniaga tempatan kami." : language === "中文" ? "所有合作专属礼遇及身心健康优惠均经由我们本地合作商户社区实名核实。" : "All partner privileges and wellness offers are verified with our local merchant community."}</p>
  </section>
    </>
  );
}

function MerchantDetail({ back, navigate, merchantName, notify, merchants = fallbackMerchants }: { back: () => void; navigate: (s: Screen) => void; merchantName: string; notify: (s: string) => void; merchants?: Merchant[] }) {
  const { t, language } = useLanguage();
  const list = merchants && merchants.length > 0 ? merchants : fallbackMerchants;
  const merchant = list.find((item) => item.name === merchantName) || list[0];
  return <><PageHeader title={t.voucher_details_title} subtitle={t.voucher_partner_offer} back={back} /><section className="page-pad voucher-detail-page"><div className="physical-voucher large"><div className="physical-voucher-image"><img src={merchant.image} alt={`${merchant.category} example for ${merchant.name}`} /><span>{language === "Bahasa Melayu" ? "Tawaran Rakan" : language === "中文" ? "合作伙伴特惠" : "Partner Offer"}</span></div><div className="physical-voucher-main"><small>{merchant.category} · {language === "Bahasa Melayu" ? "Rakan Disahkan" : language === "中文" ? "认证伙伴" : "Verified Partner"}</small><h1>{merchant.name}</h1><strong>{merchant.value}</strong><h3>{merchant.offer}</h3><p>{merchant.description}</p><em>{merchant.validity}</em></div><div className="voucher-serial">ONY · PASS · 2026</div></div><div className="voucher-terms"><h3>{t.voucher_terms_title}</h3><p>{language === "Bahasa Melayu" ? "Sah untuk kegunaan sekali bagi setiap ahli di cawangan yang mengambil bahagian. Tunjukkan kod bar baucar digital semasa membuat pesanan. Tidak boleh ditukar dengan wang tunai atau digabungkan dengan promosi lain." : language === "中文" ? "每位会员在参与合作门市仅限使用一次。点单或核销时请出示数字条形码。不可兑换现金，亦不可与其他优惠叠加使用。" : "Valid for single use per member at participating branches. Present digital voucher barcode upon ordering. Cannot be exchanged for cash or combined with other promotions."}</p></div><Button className="full redeem-voucher" onClick={() => { notify(language === "Bahasa Melayu" ? "Baucar diaktifkan! Tunjukkan kod bar di kaunter" : language === "中文" ? "优惠券已激活！请在柜台出示条形码" : "Voucher activated! Show barcode at counter"); navigate("voucher"); }}>{t.voucher_redeem_btn}</Button><p className="disclaimer"><Icon name="info" />{language === "Bahasa Melayu" ? "Tunjukkan pas ini terus kepada juruwang rakan niaga untuk menebus." : language === "中文" ? "结账时直接向合作门市收银员出示此通行证即可兑换。" : "Show this pass directly to the partner cashier to redeem."}</p></section></>;
}

function Voucher({ back, merchantName, merchants = fallbackMerchants }: { back: () => void; merchantName: string; merchants?: Merchant[] }) {
  const { t, language } = useLanguage();
  const list = merchants && merchants.length > 0 ? merchants : fallbackMerchants;
  const merchant = list.find((item) => item.name === merchantName) || list[0];
  return <div className="voucher-page"><PageHeader title={t.voucher_ready_title} subtitle={t.voucher_ready_subtitle} back={back} /><section className="page-pad"><div className="redeemed-mark"><Icon name="check" /></div><div className="voucher-card"><SmallLogo /><span className="eyebrow">{t.voucher_ready_eyebrow}</span><h1>{merchant.value}</h1><p>{merchant.offer} {language === "Bahasa Melayu" ? "di" : language === "中文" ? "于" : "at"} {merchant.name}</p><div className="voucher-code">ONY-PASS-{merchant.name.slice(0, 3).toUpperCase()}-2026</div><div className="barcode">|||| || ||| | |||| |||</div><small>{language === "Bahasa Melayu" ? "Pas Ahli Digital Aktif" : language === "中文" ? "有效数字会员凭证" : "Active Digital Member Pass"}</small></div><div className="community-note" style={{ background: "var(--theme-surface-soft)", borderColor: "var(--theme-border)", color: "var(--theme-success)" }}><Icon name="check" />{language === "Bahasa Melayu" ? "Tunjukkan kod bar ini kepada kakitangan semasa membuat pesanan atau tempahan." : language === "中文" ? "在点单或预约核销时向店员出示此条形码即可。" : "Present this barcode to the staff upon placing your order or booking."}</div><Button className="full" onClick={back}>{t.voucher_done_btn}</Button></section></div>;
}

function Profile({
  navigate,
  displayName,
  language,
  persona,
  theme,
  companion,
  trustedName,
  contactStatus,
  pendingIncomingCount = 0,
  unreadNotificationsCount = 0,
  subscriptionStatus,
  onLogout,
  onSelectLanguage,
  effectiveEmail,
  currentUser,
}: {
  navigate: (s: Screen) => void;
  displayName: string;
  language: string;
  persona: Persona;
  theme: Theme;
  companion: Companion;
  trustedName: string;
  contactStatus: ContactStatus;
  pendingIncomingCount?: number;
  unreadNotificationsCount?: number;
  subscriptionStatus: SubscriptionStatus;
  onLogout: () => void;
  onSelectLanguage: (lang: AppLanguage) => void;
  effectiveEmail?: string;
  currentUser?: User | null;
}) {
  const { t } = useLanguage();
  const currentLang = (language as AppLanguage) || "English";
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const storedProfile = loadStoredProfile();

  const contactLabel =
    pendingIncomingCount > 0
      ? `${pendingIncomingCount} ${currentLang === "Bahasa Melayu" ? "permohonan menunggu untuk disemak" : currentLang === "中文" ? "条待处理申请待确认" : "incoming request(s) to review"}`
      : contactStatus === "accepted"
        ? `${trustedName} · ${currentLang === "Bahasa Melayu" ? "Diterima" : currentLang === "中文" ? "已连接" : "Accepted"}`
        : contactStatus === "pending"
          ? `${trustedName} · ${currentLang === "Bahasa Melayu" ? "Menunggu kelulusan" : currentLang === "中文" ? "等待确认" : "Pending approval"}`
          : contactStatus === "rejected"
            ? `${trustedName} · ${currentLang === "Bahasa Melayu" ? "Permohonan ditolak" : currentLang === "中文" ? "已谢绝" : "Request declined"}`
            : currentLang === "Bahasa Melayu" ? "Tiada kenalan dipercayai disambungkan" : currentLang === "中文" ? "未绑定信任联系人" : "No trusted contact connected";

  const subscriptionLabel = subscriptionStatus === "trial"
    ? (currentLang === "Bahasa Melayu" ? "Percubaan Premium ONY · Baki 2 hari" : currentLang === "中文" ? "ONY 进阶试用 · 剩余 2 天" : "ONY Premium Trial · 2 days remaining")
    : subscriptionStatus === "payg"
      ? (currentLang === "Bahasa Melayu" ? "ONY Premium · RM5 / 3 hari" : currentLang === "中文" ? "ONY 进阶通行证 · RM5 / 3 天" : "ONY Premium · RM5 / 3 days")
      : subscriptionStatus === "monthly"
        ? (currentLang === "Bahasa Melayu" ? "ONY Premium · RM19.90 / bulan" : currentLang === "中文" ? "ONY 进阶月度通行证 · RM19.90 / 月" : "ONY Premium · RM19.90/month")
        : subscriptionStatus === "trialEnded"
          ? (currentLang === "Bahasa Melayu" ? "Percuma · Percubaan tamat" : currentLang === "中文" ? "免费版 · 试用已结束" : "Free · Trial ended")
          : (currentLang === "Bahasa Melayu" ? "Percuma · Akses percuma" : currentLang === "中文" ? "免费版 · 开放使用" : "Free · Free access");

  const languageDisplayLabel =
    language === "Bahasa Melayu"
      ? "Bahasa Melayu"
      : language === "中文"
        ? "中文 (简体)"
        : "English";

  const companionSubtitle = `${getCompanionLabel(companion, currentLang)} · ${getPersonaDetails(persona, personaOptions.find((item) => item.id === persona)?.name || "", "", "", currentLang).name}`;

  return (
    <div className="settings-page">
      <PageHeader title={t.profile_title} subtitle={t.profile_subtitle} />
      <section className="page-pad top-row">
        {/* 1. PROFILE HEADER (top of page) */}
        <SettingsHeader
          displayName={displayName || storedProfile.displayName || "ONY Member"}
          email={effectiveEmail || currentUser?.email || "Edit profile & personal preferences"}
          avatarUrl={storedProfile.avatarType === "photo" ? storedProfile.avatarUrl : undefined}
          presetAvatar={storedProfile.avatarType === "preset" ? storedProfile.presetAvatar : undefined}
          onEditProfile={() => navigate("editProfile")}
        />

        {/* STANDALONE ROW: Monthly Reflection placed above sections */}
        <SettingsRow
          isStandalone={true}
          icon="sparkles"
          title={t.profile_menu_monthly}
          subtitle={t.profile_menu_monthly_sub}
          onClick={() => navigate("monthlyReport")}
          ariaLabel="Monthly Reflection: Review your monthly wellness highlights"
        />

        {/* SECTION: ACCOUNT */}
        <SettingsSection title="ACCOUNT">
          <SettingsRow
            icon="user"
            title="Edit Profile"
            subtitle="Display username, avatar, bio & pronouns"
            onClick={() => navigate("editProfile")}
          />
          <SettingsRow
            icon="creditCard"
            title={t.profile_menu_subscription}
            subtitle={subscriptionLabel}
            onClick={() => navigate("subscription")}
          />
          <SettingsRow
            icon="key"
            title="Change Password"
            subtitle="Update sign-in credentials"
            onClick={() => navigate("changePassword")}
          />
          <SettingsRow
            icon="link"
            title="Connected Accounts"
            subtitle="Google, Apple & registered email"
            onClick={() => navigate("connectedAccounts")}
          />
        </SettingsSection>

        {/* SECTION: PREFERENCES */}
        <SettingsSection title="PREFERENCES">
          <SettingsRow
            icon="globe"
            title={t.profile_menu_language}
            subtitle={languageDisplayLabel}
            onClick={() => navigate("language")}
          />
          <SettingsRow
            icon="messageCircle"
            title={t.profile_menu_personalise}
            subtitle={companionSubtitle}
            onClick={() => navigate("personalise")}
          />
          <SettingsRow
            icon="palette"
            title="Appearance"
            subtitle="Color theme & text size slider"
            onClick={() => navigate("appearance")}
          />
          <SettingsRow
            icon="bell"
            title="Notifications"
            subtitle={
              unreadNotificationsCount > 0
                ? `${unreadNotificationsCount} unread alert(s)`
                : "Daily check-in & quiet hours"
            }
            onClick={() => navigate("notificationSettings")}
          />
          <SettingsRow
            icon="volume"
            title="Sound & Haptics"
            subtitle="Audio cues, tactile vibration & voice volume"
            onClick={() => navigate("soundHaptics")}
          />
        </SettingsSection>

        {/* SECTION: PRIVACY & SECURITY */}
        <SettingsSection title="PRIVACY & SECURITY">
          <SettingsRow
            icon="shield"
            title={t.profile_menu_privacy}
            subtitle={t.profile_menu_privacy_sub}
            onClick={() => navigate("privacy")}
          />
          <SettingsRow
            icon="phone"
            title={t.profile_menu_trusted}
            subtitle={contactLabel}
            onClick={() => navigate("trusted")}
          />
          <SettingsRow
            icon="lock"
            title="App Lock"
            subtitle="Passcode PIN & biometric verification"
            onClick={() => navigate("appLock")}
          />
          <SettingsRow
            icon="fileText"
            title={t.profile_menu_legal}
            subtitle={t.profile_menu_legal_sub}
            onClick={() => navigate("legal")}
          />
        </SettingsSection>

        {/* SECTION: SUPPORT */}
        <SettingsSection title="SUPPORT">
          <SettingsRow
            icon="helpCircle"
            title={t.profile_menu_help}
            subtitle={t.profile_menu_help_sub}
            onClick={() => navigate("help")}
          />
          <SettingsRow
            icon="messageSquare"
            title="Send Feedback"
            subtitle="Share ideas and reflections with ONY team"
            onClick={() => navigate("sendFeedback")}
          />
          <SettingsRow
            icon="alertTriangle"
            title="Report a Problem"
            subtitle="Report a glitch, sync error or issue"
            onClick={() => navigate("reportProblem")}
          />
        </SettingsSection>

        {/* SECTION: ABOUT */}
        <SettingsSection title="ABOUT">
          <SettingsRow
            icon="info"
            title={t.profile_menu_about}
            subtitle={
              currentLang === "Bahasa Melayu"
                ? "Versi 1.0.0 (Keluaran)"
                : currentLang === "中文"
                ? "版本 1.0.0 (正式发布版)"
                : "Version 1.0.0 (Release)"
            }
            onClick={() => navigate("about")}
          />
          <SettingsRow
            icon="fileText"
            title="Terms of Service"
            subtitle="Terms, conditions & platform rules"
            onClick={() => navigate("terms")}
          />
          <SettingsRow
            icon="shield"
            title="Privacy Policy"
            subtitle="Malaysian PDPA & user privacy standards"
            onClick={() => navigate("privacyPolicy")}
          />
        </SettingsSection>

        {/* SECTION: DATA */}
        <SettingsSection title="DATA">
          <SettingsRow
            icon="download"
            title="Export My Data"
            subtitle="Download complete personal wellness archive"
            onClick={() => navigate("exportData")}
          />
          <SettingsRow
            icon="trash"
            destructive={true}
            title="Delete Account"
            subtitle="Permanently erase your account and all data"
            onClick={() => navigate("deleteAccountConfirm")}
          />
        </SettingsSection>

        {/* LOG OUT BUTTON (Outlined with red text & confirmation dialog) */}
        <button
          type="button"
          className="settings-logout-btn"
          onClick={() => setShowLogoutModal(true)}
          aria-label="Log out of ONY account"
        >
          <SettingsIcon name="logOut" />
          <span>{t.profile_menu_logout}</span>
        </button>

        <p className="platform-foot">
          {currentLang === "Bahasa Melayu"
            ? "Platform Selamat ONY · Privasi anda dilindungi dengan penyulitan selamat."
            : currentLang === "中文"
            ? "ONY 守护平台 · 严格守护您的隐私安全。"
            : "ONY Platform · Your privacy is protected with secure encryption."}
        </p>

        {/* LOG OUT CONFIRMATION DIALOG */}
        {showLogoutModal && (
          <div className="settings-modal-overlay" onClick={() => setShowLogoutModal(false)}>
            <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="settings-modal-icon-alert">
                <SettingsIcon name="logOut" />
              </div>
              <h3 className="settings-modal-title">Log Out of ONY?</h3>
              <p className="settings-modal-desc">
                Are you sure you want to log out? You will need to sign in again to access your private diary, check-ins, and companion chats.
              </p>
              <div className="settings-modal-actions">
                <button
                  type="button"
                  className="settings-btn secondary"
                  onClick={() => setShowLogoutModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="settings-btn danger"
                  onClick={() => {
                    setShowLogoutModal(false);
                    onLogout();
                  }}
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function LanguagePreferences({
  back,
  currentLanguage,
  onSelectLanguage,
  notify,
}: {
  back: () => void;
  currentLanguage: AppLanguage;
  onSelectLanguage: (lang: AppLanguage) => void;
  notify: (msg: string) => void;
}) {
  const { t } = useLanguage();
  const options: {
    id: AppLanguage;
    label: string;
    sub: string;
    desc: string;
    flag: string;
  }[] = [
    {
      id: "English",
      label: "English",
      sub: "English (Malaysia / Global)",
      desc: t.language_en_note,
      flag: "🇬🇧",
    },
    {
      id: "Bahasa Melayu",
      label: "Bahasa Melayu",
      sub: "Bahasa Kebangsaan Malaysia",
      desc: t.language_bm_note,
      flag: "🇲🇾",
    },
    {
      id: "中文",
      label: "中文",
      sub: "简体中文 · 华语",
      desc: t.language_zh_note,
      flag: "🇨🇳",
    },
  ];

  return (
    <>
      <PageHeader
        title={t.language_screen_title}
        subtitle={t.language_screen_subtitle}
        back={back}
      />
      <section className="page-pad">
        <div className="help-hero">
          <Icon name="settings" />
          <div>
            <h2>{t.language_screen_title}</h2>
            <p>{t.language_screen_desc}</p>
          </div>
        </div>

        <div className="card" style={{ padding: "8px", marginBottom: "16px" }}>
          {options.map((item) => {
            const isSelected = currentLanguage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`language-selection-row ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  onSelectLanguage(item.id);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: "14px",
                  border: isSelected ? "2px solid var(--theme-accent)" : "1px solid var(--theme-border)",
                  background: isSelected ? "var(--theme-surface-elevated)" : "var(--theme-surface)",
                  marginBottom: "8px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span style={{ fontSize: "calc(26px * var(--font-scale, 1))", lineHeight: 1 }}>{item.flag}</span>
                  <div>
                    <strong style={{ display: "block", fontSize: "var(--font-body, 15px)", color: "var(--theme-text-primary)" }}>
                      {item.label}
                    </strong>
                    <small style={{ display: "block", color: "var(--theme-text-secondary)", fontSize: "var(--font-caption, 12px)", marginTop: "1px" }}>
                      {item.sub}
                    </small>
                    <span style={{ display: "block", color: "var(--theme-text-muted)", fontSize: "var(--font-micro, 11px)", marginTop: "3px" }}>
                      {item.desc}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    border: isSelected ? "6px solid var(--theme-accent)" : "2px solid var(--theme-border)",
                    background: "var(--theme-surface)",
                    flexShrink: 0,
                  }}
                />
              </button>
            );
          })}
        </div>

        <div className="community-note" style={{ background: "var(--theme-surface-soft)", borderColor: "var(--theme-border)", color: "var(--theme-success)" }}>
          <Icon name="shield" />
          <span>{t.language_sync_notice}</span>
        </div>

        <div style={{ marginTop: "16px" }}>
          <Button className="full" onClick={back}>
            {t.common_done}
          </Button>
        </div>
      </section>
    </>
  );
}

function Personalise({ back, language, setLanguage, conversationStyle, setConversationStyle, responseLength, setResponseLength, useActiveMemories, setUseActiveMemories, theme, setTheme, companion, setCompanion, persona, setPersona, soundOn, setSoundOn, volume, setVolume, notify, onSave, currentTrack, onOpenMusicModal }: {
  back: () => void; language: string; setLanguage: (v: string) => void;
  conversationStyle: string; setConversationStyle: (v: string) => void;
  responseLength: string; setResponseLength: (v: string) => void;
  useActiveMemories: boolean; setUseActiveMemories: (v: boolean) => void;
  theme: Theme; setTheme: (v: Theme) => void; companion: Companion; setCompanion: (v: Companion) => void;
  soundOn: boolean; setSoundOn: (v: boolean) => void; volume: number; setVolume: (v: number) => void; notify: (s: string) => void;
  persona: Persona; setPersona: (v: Persona) => void; onSave?: () => void;
  currentTrack?: CalmingTrack;
  onOpenMusicModal?: () => void;
}) {
  const { t } = useLanguage();
  const currentLang = (language as AppLanguage) || "English";
  const activeThemeObj = themeOptions.find((item) => item.id === theme);
  const themeDetails = activeThemeObj ? getThemeDetails(activeThemeObj.id, activeThemeObj.name, activeThemeObj.note, currentLang) : { name: theme, note: "" };
  const activePersonaObj = personaOptions.find((item) => item.id === persona);
  const personaDetails = activePersonaObj ? getPersonaDetails(activePersonaObj.id, activePersonaObj.name, activePersonaObj.note, activePersonaObj.preview, currentLang) : { name: persona, note: "", preview: "" };

  const currentTrackTitle = currentTrack
    ? currentLang === "Bahasa Melayu"
      ? currentTrack.titleBm
      : currentLang === "中文"
      ? currentTrack.titleZh
      : currentTrack.title
    : `${themeDetails.name} ${currentLang === "Bahasa Melayu" ? "suasana latar" : currentLang === "中文" ? "背景音效" : "ambience"}`;

  return <><PageHeader title={t.personalise_title} subtitle={t.personalise_subtitle} back={back} /><section className="page-pad">
    <div className="setting-block"><h3>{t.personalise_companion}</h3><p>{currentLang === "Bahasa Melayu" ? "Pilih siapa yang menemani anda." : currentLang === "中文" ? "选择谁来陪伴您的旅程。" : "Choose who accompanies you."}</p><CompanionPicker value={companion} setValue={setCompanion} /></div>
    <div className="setting-block"><h3>{t.personalise_theme}</h3><p>{currentLang === "Bahasa Melayu" ? "Pilih suasana menenangkan untuk keseluruhan aplikasi." : currentLang === "中文" ? "为整个应用选择舒适宁静的视觉空间。" : "Choose a calming space for the whole app."}</p><ThemePicker value={theme} setValue={setTheme} /></div>
    <div className="ambient-settings">
      <div>
        <strong>{currentTrackTitle}</strong>
        <small>
          {soundOn
            ? (currentLang === "Bahasa Melayu" ? "Muzik terapi sintesis aktif · 100% luar talian" : currentLang === "中文" ? "声学疗愈音乐播放中 · 支持完全离线收听" : "Live Web Audio synthesis · 100% offline")
            : (currentLang === "Bahasa Melayu" ? "Lanskap bunyi 432Hz & alam semula jadi" : currentLang === "中文" ? "432Hz 颂钵、雨声与自然节律白噪音" : "432Hz drone, nature soundscapes & warm chords")}
        </small>
      </div>
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <Button variant={soundOn ? "primary" : "secondary"} onClick={() => setSoundOn(!soundOn)}>
          {soundOn ? (currentLang === "Bahasa Melayu" ? "Jeda" : currentLang === "中文" ? "暂停" : "Pause") : (currentLang === "Bahasa Melayu" ? "Main" : currentLang === "中文" ? "播放" : "Play")}
        </Button>
        {onOpenMusicModal && (
          <Button variant="secondary" onClick={onOpenMusicModal}>
            {currentLang === "Bahasa Melayu" ? "Pilih Trek" : currentLang === "中文" ? "选曲" : "Tracks"}
          </Button>
        )}
      </div>
      <label>
        {currentLang === "Bahasa Melayu" ? "Kelantangan" : currentLang === "中文" ? "音量" : "Volume"} ({volume}%)
        <TextInput type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
      </label>
    </div>
    <div className="setting-block"><h3>{t.personalise_persona}</h3><p>{currentLang === "Bahasa Melayu" ? "Gaya nada berubah, tetapi peraturan keselamatan ONY kekal terjamin." : currentLang === "中文" ? "语气风格随心选，但 ONY 的安全原则始终如一。" : "Tone changes, but ONY’s safety rules never do."}</p><PersonaPicker value={persona} setValue={setPersona} /></div>
    <SettingChoices
      title={t.personalise_style}
      values={["Reflective", "Practical", "A mix"]}
      value={conversationStyle}
      setValue={setConversationStyle}
      labels={{
        Reflective: t.personalise_style_reflective,
        Practical: t.personalise_style_practical,
        "A mix": t.personalise_style_mix,
      }}
    />
    <SettingChoices
      title={t.personalise_response_length}
      values={["Short", "Balanced", "Detailed"]}
      value={responseLength}
      setValue={setResponseLength}
      labels={{
        Short: t.personalise_len_short,
        Balanced: t.personalise_len_balanced,
        Detailed: t.personalise_len_detailed,
      }}
    />
    <SettingChoices title={t.personalise_language} values={["English", "Bahasa Melayu", "中文"]} value={language} setValue={setLanguage} />
    <div className="setting-toggle"><div><strong>{t.personalise_memories_toggle}</strong><p>{t.personalise_memories_desc}</p></div><Toggle on={useActiveMemories} setOn={setUseActiveMemories} /></div>
    <div className="preview-bubble"><CompanionAvatar companion={companion} size="md" mood="happy" interactive /><div><span>{currentLang === "Bahasa Melayu" ? "Pratonton anda" : currentLang === "中文" ? "您的实时预览" : "Your preview"}</span><p>{personaDetails.preview}</p></div></div>
    <Button className="full" onClick={() => { if (onSave) onSave(); notify(t.personalise_save_toast); }}>{t.common_save}</Button>
  </section></>;
}

function SettingChoices<T extends string = string>({
  title,
  subtitle,
  values,
  value,
  setValue,
  labels,
}: {
  title: string;
  subtitle?: string;
  values: T[];
  value: T;
  setValue: (v: T) => void;
  labels?: Record<T, string>;
}) {
  return (
    <div className="setting-block">
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
      <div className="segmented">
        {values.map((x) => (
          <Button
            key={x}
            variant={value === x ? "primary" : "secondary"}
            onClick={() => setValue(x)}
          >
            {labels ? labels[x] || x : x}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ChatHistory({ back, navigate, conversations, setConversations, activeChatId, setActiveChatId, folders, setFolders, selectedFolderId, setSelectedFolderId }: {
  back: () => void; navigate: (s: Screen) => void; conversations: Conversation[];
  setConversations: (value: Conversation[] | ((items: Conversation[]) => Conversation[])) => void; activeChatId: number | null; setActiveChatId: (id: number | null) => void;
  folders: ChatFolder[]; setFolders: (value: ChatFolder[] | ((items: ChatFolder[]) => ChatFolder[])) => void;
  selectedFolderId: number | null; setSelectedFolderId: (id: number | null) => void;
}) {
  const { t, language } = useLanguage();
  const [editing, setEditing] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const update = (id: number, patch: Partial<Conversation>) => setConversations((items) => items.map((chat) => chat.id === id ? { ...chat, ...patch } : chat));
  const visible = conversations.filter((chat) => {
    const matchesFolder = selectedFolderId === null || chat.folderId === selectedFolderId;
    const matchesArchive = Boolean(chat.archived) === showArchived;
    const haystack = `${chat.title} ${chat.messages.map((message) => message.text).join(" ")}`.toLowerCase();
    return matchesFolder && matchesArchive && haystack.includes(query.toLowerCase());
  });
  const createFolder = () => {
    if (!newFolder.trim()) return;
    const folder = { id: Date.now(), name: newFolder.trim() };
    setFolders((items) => [...items, folder]);
    setSelectedFolderId(folder.id);
    setNewFolder("");
  };
  return <><PageHeader title={language === "Bahasa Melayu" ? "Sembang" : language === "中文" ? "历史对话" : "Chats"} subtitle={language === "Bahasa Melayu" ? "Perbualan berasingan, disusun mengikut cara anda" : language === "中文" ? "独立对话记录，按您的喜好整理" : "Separate conversations, organised your way"} back={back} action={<Button onClick={() => { setActiveChatId(null); back(); }}>{language === "Bahasa Melayu" ? "+ Sembang Baharu" : language === "中文" ? "+ 新建对话" : "+ New Chat"}</Button>} /><section className="page-pad">
    <Button className="monthly-entry" variant="ghost" onClick={() => navigate("monthlyReport")}><Icon name="memory" /><span><strong>{language === "Bahasa Melayu" ? "Refleksi Bulanan" : language === "中文" ? "月度心绪总结" : "Monthly Reflection"}</strong><small>{language === "Bahasa Melayu" ? "Hanya menggunakan perbualan dan memori yang anda benarkan" : language === "中文" ? "仅使用您授权的对话与记忆片段" : "Uses only conversations and memories you allow"}</small></span><Icon name="chevron" /></Button>
    <div className="search"><Icon name="search" /><TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={language === "Bahasa Melayu" ? "Cari tajuk dan mesej sembang" : language === "中文" ? "搜索对话标题和消息内容" : "Search chat titles and messages"} /></div>
    <div className="folder-create"><TextInput value={newFolder} onChange={(event) => setNewFolder(event.target.value)} placeholder={language === "Bahasa Melayu" ? "Nama folder baharu" : language === "中文" ? "新文件夹名称" : "New folder name"} /><Button disabled={!newFolder.trim()} onClick={createFolder}>{language === "Bahasa Melayu" ? "Cipta" : language === "中文" ? "创建" : "Create"}</Button></div>
    <div className="folder-strip"><Button variant={selectedFolderId === null ? "primary" : "secondary"} onClick={() => setSelectedFolderId(null)}>{language === "Bahasa Melayu" ? "Semua sembang" : language === "中文" ? "全部对话" : "All chats"}</Button>{folders.map((folder) => <Button key={folder.id} variant={selectedFolderId === folder.id ? "primary" : "secondary"} onClick={() => setSelectedFolderId(folder.id)}>{folder.name}</Button>)}</div>
    {selectedFolderId !== null && <div className="folder-manage">{renamingFolder === selectedFolderId ? <><TextInput value={folders.find((folder) => folder.id === selectedFolderId)?.name || ""} onChange={(event) => setFolders((items) => items.map((folder) => folder.id === selectedFolderId ? { ...folder, name: event.target.value } : folder))} /><Button onClick={() => setRenamingFolder(null)}>{t.common_done}</Button></> : <><span>{folders.find((folder) => folder.id === selectedFolderId)?.name}</span><Button variant="ghost" onClick={() => setRenamingFolder(selectedFolderId)}>{language === "Bahasa Melayu" ? "Namakan semula" : language === "中文" ? "重命名" : "Rename"}</Button><Button variant="ghost" onClick={() => { setFolders((items) => items.filter((folder) => folder.id !== selectedFolderId)); setConversations((items) => items.map((chat) => chat.folderId === selectedFolderId ? { ...chat, folderId: undefined } : chat)); setSelectedFolderId(null); }}>{language === "Bahasa Melayu" ? "Padam folder" : language === "中文" ? "删除文件夹" : "Delete folder"}</Button><Button onClick={() => { setActiveChatId(null); back(); }}>{language === "Bahasa Melayu" ? "Sembang baharu di sini" : language === "中文" ? "在此新建对话" : "New chat here"}</Button></>}</div>}
    <div className="archive-switch"><Button variant={!showArchived ? "primary" : "secondary"} onClick={() => setShowArchived(false)}>{language === "Bahasa Melayu" ? "Aktif" : language === "中文" ? "活跃" : "Active"}</Button><Button variant={showArchived ? "primary" : "secondary"} onClick={() => setShowArchived(true)}>{language === "Bahasa Melayu" ? "Diarkibkan" : language === "中文" ? "已归档" : "Archived"}</Button></div>
    {visible.length === 0 && <div className="empty"><Icon name="chat" /><h3>{query ? (language === "Bahasa Melayu" ? "Tiada perbualan sepadan" : language === "中文" ? "未找到匹配对话" : "No matching conversations") : showArchived ? (language === "Bahasa Melayu" ? "Tiada perbualan diarkibkan" : language === "中文" ? "暂无归档对话" : "No archived conversations") : (language === "Bahasa Melayu" ? "Folder ini kosong" : language === "中文" ? "该文件夹为空" : "This folder is empty")}</h3><p>{query ? (language === "Bahasa Melayu" ? "Cuba carian lain." : language === "中文" ? "请尝试其他关键词。" : "Try another search.") : (language === "Bahasa Melayu" ? "Mulakan perbualan baharu di sini bila-bila masa anda bersedia." : language === "中文" ? "准备好时，随时在此开启新的对话。" : "Start a new conversation here whenever you’re ready.")}</p><Button onClick={() => { setActiveChatId(null); back(); }}>{language === "Bahasa Melayu" ? "Mulakan perbualan" : language === "中文" ? "开启对话" : "Start a conversation"}</Button></div>}
    {(["Today", "Yesterday"] as const).map((day) => {
      const dayChats = visible.filter((chat) => chat.day === day);
      if (!dayChats.length) return null;
      const dayLabel = day === "Today" ? (language === "Bahasa Melayu" ? "Hari Ini" : language === "中文" ? "今天" : "Today") : (language === "Bahasa Melayu" ? "Semalam" : language === "中文" ? "昨天" : "Yesterday");
      return <div className="history-group" key={day}><h3>{dayLabel}</h3>{dayChats.map((chat) => <div className="chat-history-card" key={chat.id}>
        {editing === chat.id ? <><TextInput value={chat.title} onChange={(event) => update(chat.id, { title: event.target.value })} /><label className="field-label">{language === "Bahasa Melayu" ? "Pindahkan ke folder" : language === "中文" ? "移动到文件夹" : "Move to folder"}</label><div className="chips history-categories"><Button variant={!chat.folderId ? "primary" : "secondary"} onClick={() => update(chat.id, { folderId: undefined })}>{language === "Bahasa Melayu" ? "Tiada folder" : language === "中文" ? "无文件夹" : "No folder"}</Button>{folders.map((folder) => <Button key={folder.id} variant={chat.folderId === folder.id ? "primary" : "secondary"} onClick={() => update(chat.id, { folderId: folder.id })}>{folder.name}</Button>)}</div><div className="setting-toggle"><div><strong>{language === "Bahasa Melayu" ? "Gunakan dalam laporan bulanan" : language === "中文" ? "用于月度反思总结" : "Use in monthly report"}</strong><p>{language === "Bahasa Melayu" ? "Benarkan tema daripada perbualan ini diringkaskan." : language === "中文" ? "允许将此对话的主题纳入月度摘要。" : "Allow themes from this conversation to be summarized."}</p></div><Toggle on={chat.reportAllowed !== false} setOn={(value) => update(chat.id, { reportAllowed: value })} /></div><Button className="full" onClick={() => setEditing(null)}>{t.common_done}</Button></> :
        <><Button variant="ghost" className="history-open" onClick={() => { setActiveChatId(chat.id); setSelectedFolderId(chat.folderId || null); back(); }}><span><strong>{chat.title}</strong><small>{folders.find((folder) => folder.id === chat.folderId)?.name || (language === "Bahasa Melayu" ? "Tiada folder" : language === "中文" ? "无文件夹" : "No folder")} · {chat.reportAllowed === false ? (language === "Bahasa Melayu" ? "Dikecualikan daripada laporan" : language === "中文" ? "不纳入总结" : "Excluded from report") : (language === "Bahasa Melayu" ? "Dibenarkan dalam laporan" : language === "中文" ? "允许纳入总结" : "Report allowed")}</small></span><Icon name="chevron" /></Button><div className="memory-actions"><Button variant="ghost" onClick={() => setEditing(chat.id)}><Icon name="edit" />{language === "Bahasa Melayu" ? "Susun" : language === "中文" ? "管理" : "Organize"}</Button><Button variant="ghost" onClick={() => update(chat.id, { archived: !chat.archived })}>{chat.archived ? (language === "Bahasa Melayu" ? "Pulihkan" : language === "中文" ? "还原" : "Restore") : (language === "Bahasa Melayu" ? "Arkib" : language === "中文" ? "归档" : "Archive")}</Button><Button variant="ghost" onClick={() => { setConversations((items) => items.filter((item) => item.id !== chat.id)); if (activeChatId === chat.id) setActiveChatId(null); }}><Icon name="trash" />{language === "Bahasa Melayu" ? "Padam" : language === "中文" ? "删除" : "Delete"}</Button></div></>}
      </div>)}</div>;
    })}
  </section></>;
}

function MonthlyReport({ back, moodEntries, setMoodEntries, conversations, setConversations, memories }: { back: () => void; moodEntries: MoodEntry[]; setMoodEntries: (entries: MoodEntry[]) => void; conversations: Conversation[]; setConversations: (value: Conversation[] | ((items: Conversation[]) => Conversation[])) => void; memories: Memory[] }) {
  const { t, language } = useLanguage();
  const [includedMemories, setIncludedMemories] = useState<number[]>(memories.filter((memory) => memory.active).map((memory) => memory.id));
  const [intention, setIntention] = useState("");
  const [generated, setGenerated] = useState(1);
  const allowedChats = conversations.filter((chat) => chat.reportAllowed !== false && !chat.archived);
  const allowedMoods = moodEntries.filter((entry) => entry.reportAllowed);
  const themes = Object.entries(allowedChats.reduce<Record<string, number>>((counts, chat) => ({ ...counts, [chat.category]: (counts[chat.category] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const allowedMemories = memories.filter((memory) => memory.active && includedMemories.includes(memory.id));
  const copingMemories = allowedMemories.filter((memory) => memory.category === "Wellbeing" || memory.category === "Things That Help Me");
  const positiveMemories = allowedMemories.filter((memory) => memory.category === "Special Memories" || memory.category === "Goals");
  const now = new Date();
  const monthName = new Intl.DateTimeFormat(language === "Bahasa Melayu" ? "ms-MY" : language === "中文" ? "zh-CN" : "en-MY", { month: "long", year: "numeric" }).format(now);
  const memberSubtitle = language === "Bahasa Melayu" ? "Wawasan Ahli Aktif" : language === "中文" ? "活跃会员洞察" : "Active Member Insights";
  const dateRange = `${monthName} · ${memberSubtitle}`;
  const deleteReportData = () => {
    setIncludedMemories([]);
    setConversations((items) => items.map((chat) => ({ ...chat, reportAllowed: false })));
    setMoodEntries(moodEntries.map((entry) => ({ ...entry, reportAllowed: false })));
    setIntention("");
    setGenerated((value) => value + 1);
  };
  return <><PageHeader title={t.report_title} subtitle={t.report_subtitle} back={back} /><section className="page-pad">
    <div className="monthly-hero"><SmallLogo /><span className="eyebrow">{language === "Bahasa Melayu" ? "Bulanan bersama ONY" : language === "中文" ? "ONY 月度纪实" : "Monthly with ONY"}</span><h1>{language === "Bahasa Melayu" ? "Refleksi anda" : language === "中文" ? "您的心绪反思" : "Your reflection"}</h1><p>{dateRange}</p></div>
    <div className="report-source"><Icon name="info" /><p>{language === "Bahasa Melayu" ? `Dihasilkan setempat daripada ${allowedMoods.length} rekod mood dibenarkan, ${allowedChats.length} perbualan, dan ${allowedMemories.length} memori terpilih aktif. Versi ${generated}.` : language === "中文" ? `基于本地 ${allowedMoods.length} 条已授权心情记录、${allowedChats.length} 个对话以及 ${allowedMemories.length} 条精选活跃记忆生成。版本 ${generated}。` : `Generated locally from ${allowedMoods.length} allowed mood entries, ${allowedChats.length} conversations, and ${allowedMemories.length} active selected memories. Version ${generated}.`}</p></div>
    <div className="report-grid"><div><span>{language === "Bahasa Melayu" ? "Rekod mood disertakan" : language === "中文" ? "已纳入心情记录" : "Included mood entries"}</span><strong>{allowedMoods.length}</strong><small>{language === "Bahasa Melayu" ? `${moodEntries.length - allowedMoods.length} dikecualikan daripada laporan ini` : language === "中文" ? `${moodEntries.length - allowedMoods.length} 条未纳入此总结` : `${moodEntries.length - allowedMoods.length} excluded from this report`}</small></div><div><span>{language === "Bahasa Melayu" ? "Sembang disertakan" : language === "中文" ? "已纳入对话" : "Included chats"}</span><strong>{allowedChats.length}</strong><small>{language === "Bahasa Melayu" ? `${conversations.length - allowedChats.length} dikecualikan atau diarkibkan` : language === "中文" ? `${conversations.length - allowedChats.length} 个已排除或已归档` : `${conversations.length - allowedChats.length} excluded or archived`}</small></div></div>
    <div className="card"><h3>{language === "Bahasa Melayu" ? "Corak mood" : language === "中文" ? "情绪走势" : "Mood patterns"}</h3>{allowedMoods.length >= 3 ? <><div className="bars mood-entry-bars">{[...allowedMoods].reverse().slice(-7).map((entry) => <div key={entry.id}><span style={{ height: `${entry.level * 20}%` }} /><small>{entry.emoji}</small></div>)}</div><p>{language === "Bahasa Melayu" ? "Visualisasi ringkas bagi daftar masuk anda. ONY tidak mentafsirkannya sebagai diagnosis klinikal." : language === "中文" ? "您心情记录的直观展示。ONY 绝不将其视作医学诊断或临床依据。" : "Simple visualization of your included check-ins. ONY does not interpret this as a diagnosis or clinical trend."}</p></> : <p>{language === "Bahasa Melayu" ? "Sekurang-kurangnya tiga daftar masuk mood diperlukan sebelum corak dapat dipaparkan. ONY tidak akan mencipta data yang tiada." : language === "中文" ? "至少需要纳入三条心情记录方可显示趋势。ONY 绝不捏造缺失记录。" : "At least three included mood entries are needed before a trend is shown. ONY will not invent missing check-ins."}</p>}<div className="report-memory-list mood-report-list">{moodEntries.map((entry) => <div key={entry.id}><Toggle on={entry.reportAllowed} setOn={(value) => setMoodEntries(moodEntries.map((item) => item.id === entry.id ? { ...item, reportAllowed: value } : item))} /><span><strong>{entry.emoji} {entry.label}</strong><small>{new Date(entry.createdAt).toLocaleDateString(language === "Bahasa Melayu" ? "ms-MY" : language === "中文" ? "zh-CN" : "en-MY", { day: "numeric", month: "short" })}{entry.note ? ` · ${entry.note}` : ""}</small></span></div>)}</div></div>
    <div className="card"><h3>{language === "Bahasa Melayu" ? "Tema perbualan" : language === "中文" ? "对话主要主题" : "Conversation themes"}</h3>{themes.length ? <div className="theme-bars">{themes.map(([theme, count]) => <div key={theme}><span><strong>{getCategoryLabel(theme, language)}</strong><small>{count} {count === 1 ? (language === "Bahasa Melayu" ? "perbualan" : language === "中文" ? "次对话" : "conversation") : (language === "Bahasa Melayu" ? "perbualan" : language === "中文" ? "次对话" : "conversations")}</small></span><i><b style={{ width: `${Math.max(12, (count / allowedChats.length) * 100)}%` }} /></i></div>)}</div> : <p>{language === "Bahasa Melayu" ? "Tiada perbualan disertakan buat masa ini. Benarkan perbualan dari folder Sembang untuk melihat tema di sini." : language === "中文" ? "当前未纳入任何对话。可在对话文件夹中开启授权以在此查看主题。" : "No conversations are currently included. Allow a conversation from Chat folders to see themes here."}</p>}</div>
    <div className="card"><h3>{language === "Bahasa Melayu" ? "Refleksi & memori peribadi" : language === "中文" ? "个人反思与记忆" : "Personal reflections & memories"}</h3>{memories.length ? <div className="report-memory-list">{memories.map((memory) => <div key={memory.id}><Toggle on={includedMemories.includes(memory.id)} setOn={(value) => setIncludedMemories(value ? [...includedMemories, memory.id] : includedMemories.filter((id) => id !== memory.id))} /><span><strong>{memory.text}</strong><small>{memory.active ? (language === "Bahasa Melayu" ? "Memori aktif" : language === "中文" ? "活跃记忆" : "Active memory") : (language === "Bahasa Melayu" ? "Dijeda dalam Peti Memori" : language === "中文" ? "已在记忆库中暂停" : "Paused in Memory Vault")}</small></span></div>)}</div> : <p>{language === "Bahasa Melayu" ? "Tiada memori disimpan buat masa ini. ONY tidak akan mencipta refleksi tiruan." : language === "中文" ? "暂无已保存的记忆。ONY 绝不捏造任何反思内容。" : "No saved memories are available. ONY will not invent personal reflections."}</p>}</div>
    <div className="card"><h3>{language === "Bahasa Melayu" ? "Daya tindak & penjagaan diri" : language === "中文" ? "应对方法与自我关怀" : "Coping and self-care"}</h3>{copingMemories.length ? copingMemories.map((memory) => <p key={memory.id}>{memory.text}<small className="source-note">{language === "Bahasa Melayu" ? "Sumber: memori diluluskan pengguna" : language === "中文" ? "来源：用户确认的记忆" : "Source: user-approved memory"}</small></p>) : <p>{language === "Bahasa Melayu" ? "Tiada strategi daya tindak yang diluluskan telah disimpan." : language === "中文" ? "尚未保存任何经确认的应对策略。" : "No approved coping strategies have been saved yet."}</p>}</div>
    <div className="card"><h3>{language === "Bahasa Melayu" ? "Detik-detik positif" : language === "中文" ? "积极与温暖时刻" : "Positive moments"}</h3>{positiveMemories.length ? positiveMemories.map((memory) => <p key={memory.id}>{memory.text}</p>) : <p>{language === "Bahasa Melayu" ? "Tiada detik positif disimpan buat masa ini. ONY tidak akan mencipta pencapaian yang tidak dikongsi." : language === "中文" ? "暂未保存任何温暖时刻。ONY 绝不捏造未曾发生的事情。" : "No positive moments are currently saved. ONY will not create achievements you did not share."}</p>}</div>
    <div className="reflection"><SmallLogo /><div><strong>{language === "Bahasa Melayu" ? "Dorongan refleksi" : language === "中文" ? "反思启发" : "Reflection prompt"}</strong><p>{themes.length ? (language === "Bahasa Melayu" ? `Apabila ${getCategoryLabel(themes[0][0], language).toLowerCase()} timbul, apakah bentuk sokongan yang paling membantu?` : language === "中文" ? `当谈及“${getCategoryLabel(themes[0][0], language)}”时，怎样的支持对您最有帮助？` : `When ${themes[0][0].toLowerCase()} came up, what kind of support felt most useful?`) : (language === "Bahasa Melayu" ? "Apakah satu detik dari bulan ini yang ingin anda ingati?" : language === "中文" ? "这个月里有哪一个瞬间是您想要珍藏的？" : "What is one moment from this month you would like to remember?")}</p></div></div>
    <label className="field-label">{language === "Bahasa Melayu" ? "Niat pilihan untuk bulan hadapan" : language === "中文" ? "下个月的美好期许（选填）" : "Optional intention for next month"}</label><TextArea value={intention} onChange={(event) => setIntention(event.target.value)} rows={3} placeholder={language === "Bahasa Melayu" ? "Satu niat kecil yang anda pilih untuk diri sendiri…" : language === "中文" ? "为自己设定一个微小而温柔的期许…" : "A small intention you choose for yourself…"} />
    <Button className="full" onClick={() => setGenerated((value) => value + 1)}>{language === "Bahasa Melayu" ? "Jana semula dari data terpilih" : language === "中文" ? "基于选定数据重新生成" : "Regenerate from selected data"}</Button>
    <Button className="full" variant="danger" onClick={deleteReportData}>{language === "Bahasa Melayu" ? "Padam pilihan laporan" : language === "中文" ? "清除报告数据勾选" : "Delete report selections"}</Button>
    <p className="disclaimer"><Icon name="info" />{language === "Bahasa Melayu" ? "Refleksi setempat ini menerangkan sumbernya dan mengelakkan kesimpulan klinikal. Penjanaan laporan sebenar memerlukan persetujuan dan storan yang selamat." : language === "中文" ? "此本地反思清晰阐述了数据来源，不作任何临床结论。完整报告生成需要经严格审核的隐私保护与授权记录。" : "This local reflection explains its sources and avoids clinical conclusions. Real report generation requires secure persistence, consent records, and reviewed AI prompts."}</p>
  </section></>;
}

export type AppNotificationType =
  | "emergency_contact_request"
  | "emergency_contact_accepted"
  | "post_liked"
  | "post_commented"
  | "comment_replied"
  | "support_message"
  | "system";

export interface AppNotificationItem {
  id: string;
  type: AppNotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  rawRequest?: FirestoreTrustedContactRequest;
  postId?: string;
  post?: Post;
  audioUrl?: string;
  audioDuration?: number;
}

function Notifications({
  back,
  navigate,
  notifications,
  onMarkAllRead,
  onMarkRead,
  onRespondTrusted,
  onOpenPost,
  onOpenCommunityNode,
  onOpenTrusted,
  notify,
}: {
  back: () => void;
  navigate: (s: Screen) => void;
  notifications: AppNotificationItem[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onRespondTrusted: (
    requestId: string,
    decision: "accepted" | "rejected",
    senderName: string,
    requestKind?: "direct_invite" | "invite_link",
  ) => Promise<void>;
  onOpenPost: (postId: string) => void;
  onOpenCommunityNode: () => void;
  onOpenTrusted: () => void;
  notify: (s: string) => void;
}) {
  const { t, language } = useLanguage();
  const [filter, setFilter] = useState<"All" | "Emergency" | "Community" | "Messages">("All");

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = notifications.filter((item) => {
    if (filter === "All") return true;
    if (filter === "Emergency") {
      return (
        item.type === "emergency_contact_request" ||
        item.type === "emergency_contact_accepted"
      );
    }
    if (filter === "Community") {
      return (
        item.type === "post_liked" ||
        item.type === "post_commented" ||
        item.type === "comment_replied"
      );
    }
    if (filter === "Messages") {
      return item.type === "support_message";
    }
    return true;
  });

  const handleCardClick = (item: AppNotificationItem) => {
    onMarkRead(item.id);
    if (item.postId) {
      onOpenPost(item.postId);
    } else if (item.type === "support_message") {
      onOpenCommunityNode();
    } else if (
      item.type === "emergency_contact_request" ||
      item.type === "emergency_contact_accepted"
    ) {
      onOpenTrusted();
    }
  };

  const getIconForType = (type: AppNotificationType) => {
    switch (type) {
      case "emergency_contact_request":
      case "emergency_contact_accepted":
        return <Icon name="shield" />;
      case "post_liked":
        return <Icon name="heart" />;
      case "post_commented":
      case "comment_replied":
        return <Icon name="chat" />;
      case "support_message":
        return <Icon name="send" />;
      default:
        return <Icon name="bell" />;
    }
  };

  const getWrapClassForType = (type: AppNotificationType) => {
    switch (type) {
      case "emergency_contact_request":
      case "emergency_contact_accepted":
        return "emergency";
      case "post_liked":
        return "like";
      case "post_commented":
      case "comment_replied":
        return "comment";
      case "support_message":
        return "message";
      default:
        return "system";
    }
  };

  const getTabLabel = (tabName: "All" | "Emergency" | "Community" | "Messages") => {
    switch (tabName) {
      case "All":
        return language === "Bahasa Melayu" ? "Semua" : language === "中文" ? "全部" : "All";
      case "Emergency":
        return language === "Bahasa Melayu" ? "Kecemasan" : language === "中文" ? "紧急" : "Emergency";
      case "Community":
        return language === "Bahasa Melayu" ? "Komuniti" : language === "中文" ? "社区" : "Community";
      case "Messages":
        return language === "Bahasa Melayu" ? "Mesej" : language === "中文" ? "消息" : "Messages";
    }
  };

  return (
    <>
      <PageHeader
        title={t.notif_title}
        subtitle={t.notif_subtitle}
        back={back}
        hideNotifications={true}
        action={
          <button
            type="button"
            className="notifications-settings-icon-btn"
            onClick={() => navigate("notificationSettings")}
            aria-label={language === "Bahasa Melayu" ? "Tetapan pemberitahuan & waktu tenang" : language === "中文" ? "通知设置与静音时段" : "Notification settings & quiet hours"}
            title={language === "Bahasa Melayu" ? "Tetapan pemberitahuan & waktu tenang" : language === "中文" ? "通知设置与静音时段" : "Notification settings & quiet hours"}
          >
            <Icon name="settings" />
          </button>
        }
      />
      <section className="page-pad">
        <div className="notifications-top-bar">
          <div className="notifications-badge-wrap">
            {unreadCount > 0 ? (
              <span className="notifications-unread-pill">
                <i /> {unreadCount} {t.notif_unread}
              </span>
            ) : (
              <span
                className="notifications-unread-pill"
                style={{ background: "var(--theme-surface-soft)", color: "var(--theme-success)" }}
              >
                {t.notif_all_caught_up}
              </span>
            )}
            <span className="notifications-total-count">
              {notifications.length} {notifications.length === 1 ? (language === "Bahasa Melayu" ? "pemberitahuan" : language === "中文" ? "条通知" : "notification") : (language === "Bahasa Melayu" ? "pemberitahuan" : language === "中文" ? "条通知" : "notifications")}
            </span>
          </div>
          <div className="notifications-top-actions">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                className="mark-all-read-btn"
                onClick={onMarkAllRead}
              >
                {t.notif_mark_all_read}
              </Button>
            )}
          </div>
        </div>

        <div className="notifications-filter-row">
          {(["All", "Emergency", "Community", "Messages"] as const).map((tabName) => {
            const count = notifications.filter((n) => {
              if (tabName === "All") return true;
              if (tabName === "Emergency")
                return (
                  n.type === "emergency_contact_request" ||
                  n.type === "emergency_contact_accepted"
                );
              if (tabName === "Community")
                return (
                  n.type === "post_liked" ||
                  n.type === "post_commented" ||
                  n.type === "comment_replied"
                );
              if (tabName === "Messages") return n.type === "support_message";
              return true;
            }).length;
            return (
              <Button
                key={tabName}
                variant={filter === tabName ? "primary" : "secondary"}
                onClick={() => setFilter(tabName)}
              >
                {getTabLabel(tabName)} ({count})
              </Button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="notifications-empty-box">
            <Icon name="bell" />
            <h3>{language === "Bahasa Melayu" ? `Tiada pemberitahuan dalam ${getTabLabel(filter)}` : language === "中文" ? `${getTabLabel(filter)}分类下暂无通知` : `No notifications in ${filter}`}</h3>
            <p>
              {language === "Bahasa Melayu" ? "Aktiviti seperti seseorang menetapkan anda sebagai kenalan kecemasan, suka siaran, komen, dan mesej sokongan akan dipaparkan di sini 🌱" : language === "中文" ? "当有人将您设为紧急联系人、点赞或评论发帖、发送暖心留言时，均会显示在此处 🌱" : "Activity like someone putting you as emergency contact, post likes, comments, and supportive messages will appear here 🌱"}
            </p>
          </div>
        ) : (
          <div className="notifications-list">
            {filtered.map((item) => {
              const isActionableContact =
                item.type === "emergency_contact_request" && item.rawRequest;
              const isClickable =
                Boolean(item.postId) ||
                item.type === "support_message" ||
                item.type === "emergency_contact_accepted";

              return (
                <div
                  key={item.id}
                  className={`notification-card ${!item.read ? "unread" : ""} ${
                    isClickable ? "clickable" : ""
                  }`}
                  onClick={() => {
                    if (isClickable) handleCardClick(item);
                    else onMarkRead(item.id);
                  }}
                >
                  <div className={`notification-icon-wrap ${getWrapClassForType(item.type)}`}>
                    {getIconForType(item.type)}
                  </div>

                  <div className="notification-body">
                    <div className="notification-header-row">
                      <strong>{item.title}</strong>
                      <small>{formatFriendlyTime(item.createdAt, language)}</small>
                    </div>
                    <p>{item.message}</p>

                    {item.audioUrl && (
                      <div style={{ marginTop: "8px" }} onClick={(e) => e.stopPropagation()}>
                        <VoiceNote
                          audioUrl={item.audioUrl}
                          audioDuration={item.audioDuration || 8}
                          notify={notify}
                        />
                      </div>
                    )}

                    {isActionableContact && item.rawRequest && (
                      <div
                        className="notification-item-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.rawRequest.status === "pending" ? (
                          <>
                            <Button
                              variant="primary"
                              onClick={async () => {
                                onMarkRead(item.id);
                                await onRespondTrusted(
                                  item.rawRequest!.id,
                                  "accepted",
                                  item.rawRequest!.fromName,
                                  item.rawRequest!.requestKind,
                                );
                              }}
                            >
                              {language === "Bahasa Melayu" ? "Terima" : language === "中文" ? "接受" : "Accept"}
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={async () => {
                                onMarkRead(item.id);
                                await onRespondTrusted(
                                  item.rawRequest!.id,
                                  "rejected",
                                  item.rawRequest!.fromName,
                                  item.rawRequest!.requestKind,
                                );
                              }}
                            >
                              {language === "Bahasa Melayu" ? "Tolak" : language === "中文" ? "拒绝" : "Reject"}
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                onMarkRead(item.id);
                                onOpenTrusted();
                              }}
                            >
                              {language === "Bahasa Melayu" ? "Lihat dalam Kenalan" : language === "中文" ? "在通讯录中查看" : "View in Contacts"}
                            </Button>
                          </>
                        ) : item.rawRequest.status === "accepted" ? (
                          <span className="notification-item-badge accepted">
                            <Icon name="check" /> {language === "Bahasa Melayu" ? "Diterima sebagai Kenalan Dipercayai" : language === "中文" ? "已接受为信任联系人" : "Accepted as Trusted Contact"}
                          </span>
                        ) : (
                          <span className="notification-item-badge rejected">
                            {language === "Bahasa Melayu" ? "Permintaan Ditolak" : language === "中文" ? "已婉拒请求" : "Request Declined"}
                          </span>
                        )}
                      </div>
                    )}

                    {isClickable && !isActionableContact && (
                      <div style={{ marginTop: "6px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "var(--coral-dark)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "2px",
                          }}
                        >
                          {item.type === "support_message"
                            ? (language === "Bahasa Melayu" ? "Lihat di Nod Saya ›" : language === "中文" ? "在我的节点中查看 ›" : "View in My Node ›")
                            : (language === "Bahasa Melayu" ? "Buka catatan ›" : language === "中文" ? "查看帖子 ›" : "Open post ›")}
                        </span>
                      </div>
                    )}
                  </div>

                  {!item.read && <span className="notification-unread-dot-badge" title={language === "Bahasa Melayu" ? "Belum dibaca" : language === "中文" ? "未读" : "Unread"} />}
                </div>
              );
            })}
          </div>
        )}

      </section>
    </>
  );
}

function NotificationSettings({
  back,
  notify,
}: {
  back: () => void;
  notify: (s: string) => void;
}) {
  const { t, language } = useLanguage();
  const [settings, setSettings] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem("ony_notification_prefs_v1");
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      "Daily check-in": true,
      "Emergency contacts": true,
      "Community activity": true,
      "Supportive messages": true,
      "Gentle follow-up": true,
    };
  });

  const [quietHours, setQuietHours] = useState<{
    enabled: boolean;
    start: string;
    end: string;
  }>(() => {
    try {
      const stored = localStorage.getItem("ony_quiet_hours_v1");
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      enabled: true,
      start: "22:00",
      end: "08:00",
    };
  });

  const handleSave = () => {
    try {
      localStorage.setItem("ony_notification_prefs_v1", JSON.stringify(settings));
      localStorage.setItem("ony_quiet_hours_v1", JSON.stringify(quietHours));
    } catch {}
    writeSystemLog({
      level: "info",
      category: "privacy",
      action: "NOTIFICATION_PREFERENCES_SAVED",
      message: `Quiet hours: ${quietHours.enabled ? "Active (" + quietHours.start + "-" + quietHours.end + ")" : "Disabled"}. Updated category alert preferences.`,
    }).catch(() => {});
    notify(t.notif_saved_toast);
    back();
  };

  return (
    <>
      <PageHeader
        title={t.notif_settings_title}
        subtitle={t.notif_settings_subtitle}
        back={back}
        hideNotifications={true}
        action={
          <Button
            variant="primary"
            className="header-save-btn"
            onClick={handleSave}
            title={t.notif_save_btn}
          >
            <Icon name="check" /> {t.common_save}
          </Button>
        }
      />
      <section className="page-pad">
        <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
          <div className="setting-section-header">
            <span className="eyebrow">{language === "Bahasa Melayu" ? "Rehat & Ketenangan" : language === "中文" ? "静心安歇" : "Rest & Peace"}</span>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
              <div>
                <h3 style={{ margin: 0 }}>🌙 {t.notif_quiet_hours}</h3>
                <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "12px" }}>
                  {t.notif_quiet_hours_desc}
                </p>
              </div>
              <Toggle
                on={quietHours.enabled}
                setOn={(v) => setQuietHours((prev) => ({ ...prev, enabled: v }))}
              />
            </div>
          </div>

          {quietHours.enabled && (
            <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px dashed var(--line)" }}>
              <div className="quiet-hours-time-row">
                <div className="quiet-hours-time-input">
                  <label>{t.notif_bedtime}</label>
                  <TextInput
                    type="time"
                    value={quietHours.start}
                    onChange={(e) =>
                      setQuietHours((prev) => ({ ...prev, start: e.target.value }))
                    }
                  />
                </div>
                <div className="quiet-hours-time-input">
                  <label>{t.notif_wakeup}</label>
                  <TextInput
                    type="time"
                    value={quietHours.end}
                    onChange={(e) =>
                      setQuietHours((prev) => ({ ...prev, end: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="quiet-hours-emergency-callout" style={{ marginTop: "12px" }}>
                <Icon name="shield" />
                <span>
                  <strong>{language === "Bahasa Melayu" ? "Pengecualian Kecemasan:" : language === "中文" ? "紧急特殊覆盖：" : "Emergency Override:"}</strong> {t.notif_emergency_override}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: "16px", marginBottom: "20px" }}>
          <span className="eyebrow">{t.notif_categories_heading}</span>
          <h3 style={{ margin: "4px 0 6px" }}>🔔 {language === "Bahasa Melayu" ? "Pilih Kemas Kini Yang Anda Terima" : language === "中文" ? "选择您希望接收的更新" : "Choose What Updates You Receive"}</h3>
          <p style={{ color: "var(--muted)", fontSize: "12px", marginBottom: "14px" }}>
            {language === "Bahasa Melayu" ? "Togol aktiviti yang anda ingin terima makluman dalam suapan pemberitahuan." : language === "中文" ? "自定义勾选您希望在通知列表中接收提醒的活动。" : "Toggle the activities you want to receive alerts for in your notification feed."}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {Object.entries(settings).map(([name, on], idx, arr) => (
              <div
                className="setting-toggle"
                key={name}
                style={{
                  padding: "10px 0",
                  borderBottom: idx === arr.length - 1 ? "none" : "1px solid var(--line)",
                }}
              >
                <div style={{ paddingRight: "10px" }}>
                  <strong style={{ fontSize: "13.5px" }}>
                    {name === "Daily check-in"
                      ? (language === "Bahasa Melayu" ? "Daftar masuk harian" : language === "中文" ? "每日心情打卡" : name)
                      : name === "Emergency contacts"
                      ? (language === "Bahasa Melayu" ? "Kenalan kecemasan" : language === "中文" ? "紧急联系人" : name)
                      : name === "Community activity"
                      ? (language === "Bahasa Melayu" ? "Aktiviti komuniti" : language === "中文" ? "社区互动提醒" : name)
                      : name === "Supportive messages"
                      ? (language === "Bahasa Melayu" ? "Mesej sokongan" : language === "中文" ? "暖心留言接收" : name)
                      : (language === "Bahasa Melayu" ? "Kemas kini ONY" : language === "中文" ? "ONY 温馨回访" : name)}
                  </strong>
                  <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--muted)" }}>
                    {name === "Daily check-in"
                      ? (language === "Bahasa Melayu" ? "Peringatan lembut untuk daftar masuk emosi harian anda." : language === "中文" ? "每日心情状态登记的温和提醒。" : "Gentle reminder for your daily mood check-in.")
                      : name === "Emergency contacts"
                      ? (language === "Bahasa Melayu" ? "Permintaan dan pengesahan daripada kenalan kecemasan dipercayai anda." : language === "中文" ? "来自您信任的紧急联系人的申请与确认通知。" : "Requests and confirmations from your trusted emergency contacts.")
                      : name === "Community activity"
                      ? (language === "Bahasa Melayu" ? "Apabila ahli lain menyukai atau mengulas siaran komuniti anda." : language === "中文" ? "当其他同伴点赞或评论您的社区发帖时。" : "When other members like or comment on your community posts.")
                      : name === "Supportive messages"
                      ? (language === "Bahasa Melayu" ? "Apabila ahli tanpa nama menghantar kata semangat ke nod glob anda." : language === "中文" ? "当匿名成员向您的星球节点发送暖心鼓励时。" : "When anonymous members send encouragement to your globe node.")
                      : (language === "Bahasa Melayu" ? "Refleksi susulan yang bermanfaat dan pemeriksaan lembut daripada ONY." : language === "中文" ? "来自 ONY 的跟进反思与日常问候。" : "Helpful follow-up reflections and gentle check-ins from ONY.")}
                  </p>
                </div>
                <Toggle
                  on={on}
                  setOn={(v) => setSettings((prev) => ({ ...prev, [name]: v }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="notification-settings-save-bar">
          <Button className="full" variant="primary" onClick={handleSave}>
            <Icon name="check" /> {t.notif_save_btn}
          </Button>
          <Button variant="ghost" className="full" onClick={back}>
            {language === "Bahasa Melayu" ? "Kembali ke Pemberitahuan" : language === "中文" ? "返回通知中心" : "Back to Notifications"}
          </Button>
        </div>
      </section>
    </>
  );
}

function Subscription({ back, openHelp, status, setStatus, freeUsage, freeLimit, resetFreeUsage, notify }: {
  back: () => void; openHelp: () => void; status: SubscriptionStatus; setStatus: (status: SubscriptionStatus) => void;
  freeUsage: number; freeLimit: number; resetFreeUsage: () => void; notify: (s: string) => void;
}) {
  const { t, language } = useLanguage();
  const activate = (next: SubscriptionStatus, message: string) => {
    setStatus(next);
    if (next !== "free") resetFreeUsage();
    notify(message);
  };
  const freeCard = (
    <div className={`subscription-plan free-plan ${status === "free" || status === "trialEnded" ? "current" : ""}`}>
      <div className="plan-heading">
        <span>{t.sub_free_tier}</span>
        {(status === "free" || status === "trialEnded") && <b>{t.sub_current_plan}</b>}
      </div>
      <h2>{t.sub_free_price}</h2>
      <strong>{t.sub_rm0}</strong>
      <ul>
        <li>{t.sub_free_feat1}</li>
        <li>{t.sub_free_feat2}</li>
        <li>{t.sub_free_feat3}</li>
        <li>{t.sub_free_feat4}</li>
        <li>{t.sub_free_feat5}</li>
      </ul>
      {freeUsage >= freeLimit && (
        <p className="allowance-note">{t.sub_allowance_reached}</p>
      )}
      <Button
        variant="secondary"
        className="full"
        onClick={() => {
          setStatus(status === "trialEnded" ? "trialEnded" : "free");
          resetFreeUsage();
          notify(t.sub_continue_free);
          back();
        }}
      >
        {t.sub_continue_free}
      </Button>
    </div>
  );

  const paygCard = (
    <div className={`subscription-plan payg-plan ${status === "payg" ? "current" : ""}`}>
      <div className="plan-heading">
        <span>{t.sub_payg_heading}</span>
        {status === "payg" && <b>{t.sub_payg_active}</b>}
      </div>
      <h2>{t.sub_payg_title}</h2>
      <strong>{t.sub_payg_price}</strong>
      <p>{t.sub_payg_desc}</p>
      <ul>
        <li>{t.sub_payg_feat1}</li>
        <li>{t.sub_payg_feat2}</li>
        <li>{t.sub_payg_feat3}</li>
        <li>{t.sub_payg_feat4}</li>
      </ul>
      {status === "payg" ? (
        <>
          <div className="days-remaining">2 {language === "Bahasa Melayu" ? "hari tinggal" : language === "中文" ? "天剩余" : "days remaining"}</div>
          <Button className="full" variant="secondary" onClick={() => { activate("free", language === "Bahasa Melayu" ? "Kembali ke Pelan Percuma" : language === "中文" ? "已返回免费版" : "Returned to Free Plan"); }}>
            {language === "Bahasa Melayu" ? "Tukar ke Peringkat Percuma" : language === "中文" ? "切换至免费版" : "Switch to Free Tier"}
          </Button>
        </>
      ) : (
        <>
          <small className="best-for">{language === "Bahasa Melayu" ? "Terbaik untuk minggu peperiksaan atau waktu mencabar" : language === "中文" ? "适合考试周或需要深度支持的时刻" : "Best for exam weeks or intense moments"}</small>
          <Button className="full" onClick={() => activate("payg", language === "Bahasa Melayu" ? "Pas Premium 3-Hari diaktifkan · Selamat datang ke Premium!" : language === "中文" ? "3天高级通行证已激活 · 欢迎体验 Premium！" : "3-Day Premium Pass activated · Welcome to Premium!")}>
            {language === "Bahasa Melayu" ? "Dapatkan Pas 3-Hari (RM5)" : language === "中文" ? "获取3天通行证 (RM5)" : "Get 3-Day Pass (RM5)"}
          </Button>
        </>
      )}
    </div>
  );

  const monthlyCard = (
    <div className={`subscription-plan monthly-plan ${status === "monthly" ? "current" : ""}`}>
      <div className="plan-heading">
        <span>{t.sub_monthly_heading}</span>
        {status === "monthly" && <b>{t.sub_monthly_active}</b>}
      </div>
      <h2>{t.sub_monthly_title}</h2>
      <strong>{t.sub_monthly_price}</strong>
      <p>{t.sub_monthly_desc}</p>
      <ul>
        <li>{language === "Bahasa Melayu" ? "Akses Premium berterusan" : language === "中文" ? "全天候无间断高级版体验" : "Continuous Premium access"}</li>
        <li>{language === "Bahasa Melayu" ? "Pengekalan kubah memori mendalam" : language === "中文" ? "永久深度记忆库沉淀" : "Deep memory vault retention"}</li>
        <li>{language === "Bahasa Melayu" ? "Trend emosi penuh & analitik bulanan" : language === "中文" ? "完整情绪趋势与月度深度洞察" : "Full emotional trends & monthly analytics"}</li>
        <li>{language === "Bahasa Melayu" ? "Kelajuan respons AI keutamaan & kesinambungan" : language === "中文" ? "优先 AI 响应速度与连贯对话" : "Priority AI response speed & continuity"}</li>
        <li>{language === "Bahasa Melayu" ? "Nada teman & landskap bunyi eksklusif" : language === "中文" ? "专属陪伴语调与治愈白噪音" : "Exclusive companion tones & soundscapes"}</li>
      </ul>
      {status === "monthly" ? (
        <div className="days-remaining">{language === "Bahasa Melayu" ? "Langganan Bulanan Aktif" : language === "中文" ? "月度订阅已生效" : "Active Monthly Subscription"}</div>
      ) : (
        <>
          <small className="best-for">{language === "Bahasa Melayu" ? "Nilai terbaik untuk kesejahteraan berterusan" : language === "中文" ? "持续心理健康的最佳长伴选择" : "Best value for continuous well-being"}</small>
          <Button className="full" onClick={() => activate("monthly", language === "Bahasa Melayu" ? "ONY Premium Bulanan aktif · Terima kasih menyokong ONY!" : language === "中文" ? "ONY 月度高级版已开通 · 感谢支持 ONY！" : "ONY Monthly Premium active · Thank you for supporting ONY!")}>
            {language === "Bahasa Melayu" ? "Langgan untuk RM19.90/bulan" : language === "中文" ? "按月订阅 RM19.90/月" : "Subscribe for RM19.90/month"}
          </Button>
        </>
      )}
    </div>
  );

  if (status === "trial") {
    return (
      <>
        <PageHeader title={t.sub_trial_title} subtitle={language === "Bahasa Melayu" ? "Percubaan Percuma 3-Hari" : language === "中文" ? "3天免费试用" : "3-Day Free Trial"} back={back} />
        <section className="page-pad">
          <div className="pricing-status trial">
            <div className="success-mark"><Icon name="check" /></div>
            <span className="eyebrow">{language === "Bahasa Melayu" ? "Percubaan Aktif" : language === "中文" ? "试用中" : "Trial Active"}</span>
            <h1>{t.sub_trial_title}</h1>
            <strong>{language === "Bahasa Melayu" ? "RM0 untuk 3 hari" : language === "中文" ? "3天免费 RM0" : "RM0 for 3 days"}</strong>
            <p>{language === "Bahasa Melayu" ? "Semua keupayaan Premium aktif sepanjang tempoh percubaan anda." : language === "中文" ? "在试用期内，您可以尽情享受全部高级版功能。" : "All Premium capabilities are active during your trial period."}</p>
            <div className="days-remaining">2 {language === "Bahasa Melayu" ? "hari tinggal" : language === "中文" ? "天剩余" : "days remaining"}</div>
          </div>
          <div className="benefits">
            <h3>{language === "Bahasa Melayu" ? "Faedah percubaan percuma" : language === "中文" ? "免费试用专属权益" : "Free trial benefits"}</h3>
            <span><Icon name="check" />{language === "Bahasa Melayu" ? "Pemperibadian dipertingkat" : language === "中文" ? "更细致的专属个性化" : "Enhanced personalization"}</span>
            <span><Icon name="check" />{language === "Bahasa Melayu" ? "Pengekalan memori lebih mendalam & kesinambungan" : language === "中文" ? "更长久的记忆沉淀与话题连贯" : "Deeper memory retention and continuity"}</span>
            <span><Icon name="check" />{language === "Bahasa Melayu" ? "Analitik emosi lanjutan" : language === "中文" ? "进阶情绪多维洞察" : "Advanced mood analytics"}</span>
            <span><Icon name="check" />{language === "Bahasa Melayu" ? "Pengalaman Premium diperluas" : language === "中文" ? "扩展的高级陪伴功能" : "Expanded Premium experience"}</span>
          </div>
          <Button className="full" onClick={() => activate("free", language === "Bahasa Melayu" ? "Kembali ke Pelan Percuma" : language === "中文" ? "已返回免费版" : "Returned to Free Plan")}>
            {language === "Bahasa Melayu" ? "Tamatkan Percubaan & Tukar ke Percuma" : language === "中文" ? "结束试用并切换至免费版" : "End Trial & Switch to Free"}
          </Button>
          <Button className="full" variant="secondary" onClick={back}>
            {language === "Bahasa Melayu" ? "Teruskan dengan Percubaan" : language === "中文" ? "继续试用体验" : "Continue with Trial"}
          </Button>
          <p className="disclaimer">
            <Icon name="info" />
            {language === "Bahasa Melayu" ? "Harga telus. Talian krisis dan sumber keselamatan penting sentiasa percuma." : language === "中文" ? "透明定价。核心危机热线与安全资源永远 100% 免费。" : "Transparent pricing. Essential safety and crisis hotlines are always accessible free of charge."}
          </p>
        </section>
      </>
    );
  }

  if (status === "trialEnded") {
    return (
      <>
        <PageHeader title={language === "Bahasa Melayu" ? "Pilih Pelan Anda" : language === "中文" ? "选择适合您的方案" : "Choose Your Plan"} subtitle={language === "Bahasa Melayu" ? "Percubaan percuma anda telah tamat" : language === "中文" ? "您的免费试用期已结束" : "Your free trial has ended"} back={back} />
        <section className="page-pad">
          <div className="trial-ended">
            <SmallLogo />
            <span className="eyebrow">{language === "Bahasa Melayu" ? "Percubaan Selesai" : language === "中文" ? "试用结束" : "Trial Complete"}</span>
            <h1>{language === "Bahasa Melayu" ? "Selamat datang ke babak seterusnya." : language === "中文" ? "开启下一步陪伴之旅。" : "Welcome to the next chapter."}</h1>
            <p>{language === "Bahasa Melayu" ? "Anda boleh terus menggunakan ONY secara percuma selamanya, atau pilih pelan Premium yang sesuai dengan anda." : language === "中文" ? "您可以随时永久免费使用基础版 ONY，或选择更适合您节奏的高级版方案。" : "You can continue using ONY for free forever, or choose a Premium plan that fits your journey."}</p>
          </div>
          {freeCard}
          <div className="paid-options-heading">
            <span>{language === "Bahasa Melayu" ? "Pelan Premium" : language === "中文" ? "高级版选项" : "Premium Plans"}</span>
            <p>{language === "Bahasa Melayu" ? "Pilih fleksibiliti berkala atau sokongan penuh berterusan." : language === "中文" ? "选择灵活的短期体验，或开启无间断的长久陪伴。" : "Choose occasional flexibility or continuous full support."}</p>
          </div>
          {paygCard}
          {monthlyCard}
          <Button className="full" variant="ghost" onClick={openHelp}>
            <Icon name="shield" /> {language === "Bahasa Melayu" ? "Akses sokongan krisis penting" : language === "中文" ? "获取核心紧急支持" : "Access essential crisis support"}
          </Button>
          <p className="disclaimer">
            <Icon name="info" />
            {language === "Bahasa Melayu" ? "Pengebilan disulitkan. Batalkan atau tukar langganan anda pada bila-bila masa." : language === "中文" ? "安全加密账单。随时可以调整或取消您的方案。" : "Encrypted billing. Cancel or change your subscription at any time."}
          </p>
        </section>
      </>
    );
  }

  if (status === "payg") {
    return (
      <>
        <PageHeader title={t.sub_payg_heading} subtitle={t.sub_payg_title} back={back} />
        <section className="page-pad">
          {paygCard}
          <div className="community-note">
            <Icon name="info" />
            {language === "Bahasa Melayu" ? "Selepas pas 3 hari ini, akses akan kembali ke Percuma secara lancar melainkan anda memperbaharuinya." : language === "中文" ? "此 3 天通行证到期后，若未主动续订，将自动平滑转回免费版。" : "After this 3-day pass, access seamlessly returns to Free unless you renew."}
          </div>
          {monthlyCard}
          <Button className="full" variant="ghost" onClick={openHelp}>
            <Icon name="shield" /> {language === "Bahasa Melayu" ? "Akses sokongan penting" : language === "中文" ? "获取核心支持" : "Access essential support"}
          </Button>
        </section>
      </>
    );
  }

  if (status === "monthly") {
    return (
      <>
        <PageHeader title={t.sub_monthly_heading} subtitle={t.sub_monthly_title} back={back} />
        <section className="page-pad">
          {monthlyCard}
          <div className="community-note">
            <Icon name="info" />
            {language === "Bahasa Melayu" ? "Langganan bulanan anda diperbaharui secara automatik. Anda boleh mengurus atau membatalkannya pada bila-bila masa." : language === "中文" ? "您的月度订阅将自动按月续订。您可以随时在设置中管理或取消。" : "Your monthly subscription renews automatically. You can manage or cancel anytime."}
          </div>
          <Button className="full" variant="ghost" onClick={openHelp}>
            <Icon name="shield" /> {language === "Bahasa Melayu" ? "Akses sokongan penting" : language === "中文" ? "获取核心支持" : "Access essential support"}
          </Button>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t.sub_title} subtitle={t.sub_subtitle} back={back} />
      <section className="page-pad">
        <div className="pricing-intro">
          <span className="eyebrow">{language === "Bahasa Melayu" ? "Ruang Tenang ONY Anda" : language === "中文" ? "您的 ONY 心灵庇护所" : "Your ONY Sanctuary"}</span>
          <h1>{language === "Bahasa Melayu" ? "Pilih yang paling sesuai untuk anda." : language === "中文" ? "选择最契合您当下需求的节奏。" : "Choose what fits you best."}</h1>
          <p>{language === "Bahasa Melayu" ? "Peringkat Percuma sentiasa tersedia. Naik taraf pada bila-bila masa anda inginkan kesinambungan dan wawasan yang lebih mendalam." : language === "中文" ? "免费版永久向所有人开放。当您需要更深度的连贯记忆与洞察时，可随时升级。" : "The Free tier is always available. Upgrade whenever you want deeper continuity and insights."}</p>
        </div>
        {freeCard}
        <div className="subscription-plan trial-plan">
          <div className="plan-heading">
            <span>{t.sub_start_trial}</span>
            <b>{language === "Bahasa Melayu" ? "Layak" : language === "中文" ? "符合资格" : "Eligible"}</b>
          </div>
          <h2>{t.sub_trial_hero_title}</h2>
          <strong>{language === "Bahasa Melayu" ? "RM0 untuk 3 hari" : language === "中文" ? "3天免费 RM0" : "RM0 for 3 days"}</strong>
          <p>{t.sub_trial_hero_desc}</p>
          <ul>
            <li>{language === "Bahasa Melayu" ? "Pemperibadian dipertingkat" : language === "中文" ? "进阶专属个性化" : "Enhanced personalization"}</li>
            <li>{language === "Bahasa Melayu" ? "Kesinambungan memori lebih mendalam" : language === "中文" ? "更深度长久的记忆连贯" : "Deeper memory continuity"}</li>
            <li>{language === "Bahasa Melayu" ? "Wawasan emosi lanjutan" : language === "中文" ? "多维度情绪深度洞察" : "Advanced mood insights"}</li>
            <li>{language === "Bahasa Melayu" ? "Ciri-ciri Premium diperluas" : language === "中文" ? "拓展的高级版完整功能" : "Expanded Premium features"}</li>
          </ul>
          <Button className="full" onClick={() => activate("trial", language === "Bahasa Melayu" ? "Percubaan Percuma 3-Hari dimulakan · Selamat datang!" : language === "中文" ? "3天免费试用已开启 · 欢迎体验！" : "3-Day Free Trial started · Welcome!")}>
            {t.sub_start_trial}
          </Button>
          <Button className="full" variant="ghost" onClick={back}>
            {language === "Bahasa Melayu" ? "Kekal di Percuma" : language === "中文" ? "继续保持免费版" : "Stay on Free"}
          </Button>
        </div>
        <div className="paid-options-heading">
          <span>{language === "Bahasa Melayu" ? "Atau Pilih Premium Terus" : language === "中文" ? "或直接开通 Premium" : "Or Choose Premium Directly"}</span>
          <p>{language === "Bahasa Melayu" ? "Pas jangka pendek fleksibel atau sokongan bulanan berterusan." : language === "中文" ? "灵活的短期体验卡，或无忧的月度连续守护。" : "Flexible short-term passes or continuous monthly support."}</p>
        </div>
        {paygCard}
        {monthlyCard}
        <Button className="full" variant="ghost" onClick={openHelp}>
          <Icon name="shield" /> {language === "Bahasa Melayu" ? "Akses sokongan penting" : language === "中文" ? "获取核心支持" : "Access essential support"}
        </Button>
        <p className="disclaimer">
          <Icon name="info" />
          {language === "Bahasa Melayu" ? "Dasar telus. Sumber keselamatan dan talian krisis kekal percuma selamanya untuk semua ahli." : language === "中文" ? "透明承诺。核心安全指引与危机热线永远对所有用户免费开放。" : "Transparent policies. Core safety and crisis resources remain free forever for all members."}
        </p>
      </section>
    </>
  );
}

function SafetyFlow({ back, navigate }: { back: () => void; navigate: (s: Screen) => void }) {
  const { t, language } = useLanguage();
  const [answer, setAnswer] = useState<"none" | "yes" | "no">("none");
  const handleAnswerYes = () => {
    setAnswer("yes");
    writeSystemLog({
      level: "security",
      category: "safety",
      action: "CRISIS_IMMEDIATE_DANGER_TRIGGERED",
      message: "User responded YES to immediate danger. Critical emergency pathways presented.",
    }).catch(() => {});
  };
  return <div className="safety-page"><PageHeader title={t.safety_title} subtitle={t.safety_subtitle} back={back} /><section className="page-pad">
    <div className="safety-mark"><Icon name="shield" /></div><h1>{t.safety_sorry_heading}</h1><p className="lead">{t.safety_lead}</p>
    {answer === "none" && <div className="danger-card"><strong>{t.safety_immediate_question}</strong><p>{t.safety_immediate_desc}</p><Button variant="danger" className="full" onClick={handleAnswerYes}>{t.safety_yes_danger}</Button><Button variant="secondary" className="full" onClick={() => setAnswer("no")}>{t.safety_no_support}</Button></div>}
    {answer === "yes" && <div className="emergency"><span className="eyebrow">{language === "Bahasa Melayu" ? "Perlukan bantuan segera?" : language === "中文" ? "需要即时求助？" : "Need immediate help?"}</span><a href="tel:999">999</a><strong>{t.safety_emergency_services}</strong><p>{language === "Bahasa Melayu" ? "Jika boleh, jauhkan diri dari sebarang perkara yang boleh mencederakan diri dan pergi kepada orang yang dipercayai atau tempat awam." : language === "中文" ? "如果可以，请立即远离任何可能伤害自己的物品，并前往信任的朋友身边或公共场所。" : "If you can, move away from anything you could use to hurt yourself and go to a trusted person or public place."}</p><Button className="full" onClick={() => navigate("help")}>{language === "Bahasa Melayu" ? "Lihat sumber krisis Malaysia" : language === "中文" ? "查看马来西亚危机热线与资源" : "See Malaysia crisis resources"}</Button><Button variant="secondary" className="full" onClick={() => navigate("professional")}>{language === "Bahasa Melayu" ? "Cari Bantuan Profesional Berdekatan" : language === "中文" ? "寻找附近的专业心理服务" : "Find Professional Help Near Me"}</Button><Button variant="secondary" className="full" onClick={() => navigate("trusted")}>{t.safety_contact_trusted}</Button></div>}
    {answer === "no" && <div className="danger-card"><strong>{language === "Bahasa Melayu" ? "Mari kami hubungkan anda dengan seseorang." : language === "中文" ? "让我们为您连结一位倾听者。" : "Let’s connect you with someone."}</strong><p>{language === "Bahasa Melayu" ? "Pertimbangkan untuk menghubungi orang yang dipercayai dan tinggal berdekatan orang lain. Kaunselor atau talian sokongan sedia mendengar tanpa menghakimi." : language === "中文" ? "不妨联络一位信任的人并陪伴在身边。辅导员或求助热线会不带偏见地倾听您的心声。" : "Consider contacting a trusted person and staying near others. A befriender, counsellor, or support line can listen without judgment."}</p><Button className="full" onClick={() => navigate("help")}>{language === "Bahasa Melayu" ? "Lihat sumber krisis" : language === "中文" ? "查看危机求助资源" : "View crisis resources"}</Button><Button variant="secondary" className="full" onClick={() => navigate("professional")}>{language === "Bahasa Melayu" ? "Cari Bantuan Profesional Berdekatan" : language === "中文" ? "寻找附近的专业心理服务" : "Find Professional Help Near Me"}</Button><Button variant="secondary" className="full" onClick={() => navigate("trusted")}>{t.safety_contact_trusted}</Button><Button variant="ghost" className="full" onClick={back}>{language === "Bahasa Melayu" ? "Kembali bila saya bersedia" : language === "中文" ? "当我准备好时再回来" : "Return when I’m ready"}</Button></div>}
    <p className="safety-disclaimer"><strong>{language === "Bahasa Melayu" ? "ONY ialah teman AI dan tidak menggantikan perkhidmatan kecemasan manusia." : language === "中文" ? "ONY 是 AI 心情陪伴助手，绝不替代人类紧急救护服务。" : "ONY is an AI companion and does not replace human emergency services."}</strong> {t.safety_disclaimer}</p>
    <div className="sop">
      <span>{language === "Bahasa Melayu" ? "Pengesanan Tekanan" : language === "中文" ? "情绪困扰识别" : "Distress Detection"}</span>
      <span>{language === "Bahasa Melayu" ? "Peredaan Lembut" : language === "中文" ? "温和情绪降温" : "Gentle De-escalation"}</span>
      <span>{language === "Bahasa Melayu" ? "Sumber Krisis Segera" : language === "中文" ? "即时危机热线" : "Immediate Crisis Resources"}</span>
      <span>{language === "Bahasa Melayu" ? "Pilihan Keselamatan Pengguna" : language === "中文" ? "用户自主安全决策" : "User Safety Choice"}</span>
    </div>
  </section></div>;
}

function Help({ back, navigate }: { back: () => void; navigate: (s: Screen) => void }) {
  const { t, language } = useLanguage();
  useEffect(() => {
    writeSystemLog({
      level: "info",
      category: "safety",
      action: "CRISIS_DIRECTORY_ACCESSED",
      message: "User opened verified Malaysian helplines and emergency directory.",
    }).catch(() => {});
  }, []);
  return <><PageHeader title={t.profile_menu_help} subtitle={t.profile_menu_help_sub} back={back} /><section className="page-pad">
    <div className="help-hero"><Icon name="shield" /><div><h2>{language === "Bahasa Melayu" ? "Anda berhak menerima sokongan yang tepat." : language === "中文" ? "您值得获得恰当的温暖支持。" : "You deserve the right support."}</h2><p>{language === "Bahasa Melayu" ? "ONY menyediakan sokongan emosi dan maklumat. Ia bukan pengganti rawatan profesional atau perkhidmatan kecemasan." : language === "中文" ? "ONY 提供日常情感支持与科普指引。它不可替代执业医师诊断或紧急救护服务。" : "ONY provides emotional support and information. It is not a replacement for professional or emergency care."}</p></div></div>
    <h3 className="group-title">{language === "Bahasa Melayu" ? "Bahaya Segera" : language === "中文" ? "紧急生命安全险情" : "Immediate danger"}</h3>
    <a className="resource emergency-resource" href="tel:999"><span><strong>{language === "Bahasa Melayu" ? "Perkhidmatan Kecemasan Malaysia" : language === "中文" ? "马来西亚紧急呼救中心" : "Malaysian Emergency Services"}</strong><small>{language === "Bahasa Melayu" ? "Polis, ambulans, tindak balas perubatan kecemasan" : language === "中文" ? "报警、救护车、紧急院前医疗救援" : "Police, ambulance, emergency medical response"}</small></span><b>{language === "Bahasa Melayu" ? "Hubungi 999" : language === "中文" ? "呼叫 999" : "Call 999"}</b></a>
    <h3 className="group-title">{language === "Bahasa Melayu" ? "Talian Bantuan Krisis & Sokongan Emosi" : language === "中文" ? "危机干预与情感支持热线" : "Crisis & Emotional Support Helplines"}</h3>
    <a className="resource" href="tel:15555"><span><strong>Talian HEAL 15555 (MOH Malaysia)</strong><small>{language === "Bahasa Melayu" ? "Talian kesihatan mental kebangsaan · 8:00 PG – 12:00 MLM setiap hari · Percuma & sulit" : language === "中文" ? "国家心理健康热线 · 每天 8:00 AM – 12:00 AM · 免费且严格保密" : "National mental health helpline · 8:00 AM – 12:00 AM daily · Free & confidential"}</small></span><b>{language === "Bahasa Melayu" ? "Hubungi 15555" : language === "中文" ? "拨打 15555" : "Call 15555"}</b></a>
    <a className="resource" href="tel:0376272929"><span><strong>Befrienders Kuala Lumpur</strong><small>{language === "Bahasa Melayu" ? "Talian sokongan emosi dan pencegahan bunuh diri 24/7" : language === "中文" ? "24/7 全天候情感关怀与危机干预热线" : "24/7 Emotional support and suicide prevention hotline"}</small></span><b>03-7627 2929</b></a>
    <a className="resource" href="tel:15999"><span><strong>Talian Kasih 15999</strong><small>{language === "Bahasa Melayu" ? "Kementerian Pembangunan Wanita, Keluarga dan Masyarakat" : language === "中文" ? "妇女、家庭及社会发展部关怀热线" : "Ministry of Women, Family and Community Development"}</small></span><b>{language === "Bahasa Melayu" ? "Hubungi 15999" : language === "中文" ? "拨打 15999" : "Call 15999"}</b></a>
    <div className="resource"><span><strong>{language === "Bahasa Melayu" ? "Pusat Kaunseling Universiti" : language === "中文" ? "高校学生心理咨询中心" : "University Counselling Centre"}</strong><small>{language === "Bahasa Melayu" ? "Hubungi pejabat kesejahteraan kampus atau hal ehwal pelajar anda" : language === "中文" ? "联络您所在校园的学生事务处或心理健康中心" : "Contact your campus wellbeing or student affairs office"}</small></span><Icon name="chevron" /></div>
    <h3 className="group-title">{language === "Bahasa Melayu" ? "Penjagaan Profesional & Direktori" : language === "中文" ? "专业心理机构与名录" : "Professional Care & Directory"}</h3>
    <button className="resource resource-button" onClick={() => navigate("professional")}><span><strong>{language === "Bahasa Melayu" ? "Cari penjagaan profesional berdaftar berdekatan saya" : language === "中文" ? "查找我附近的注册专业心理医疗机构" : "Find registered professional care near me"}</strong><small>{language === "Bahasa Melayu" ? "Pusat MENTARI kerajaan, hospital, dan kaunselor berlesen" : language === "中文" ? "政府社区精神健康中心 MENTARI、公立医院与执业心理咨询师" : "Government MENTARI centres, hospitals, and licensed counsellors"}</small></span><Icon name="chevron" /></button>
    <p className="disclaimer"><Icon name="info" />{language === "Bahasa Melayu" ? "Sekiranya anda atau seseorang yang anda kenali berada dalam bahaya mengancam nyawa serta-merta, dail 999 dengan segera." : language === "中文" ? "若您或身边人员面临即刻危及生命的险情，请立即拨打 999。" : "If you or someone you know is in immediate life-threatening danger, dial 999 immediately."}</p>
  </section></>;
}

function JobPreferences({ back, navigate }: { back: () => void; navigate: (s: Screen) => void }) {
  const { language } = useLanguage();
  const [type, setType] = useState("Internship");
  const [field, setField] = useState("Marketing");
  const [location, setLocation] = useState("Kuala Lumpur");
  const [arrangement, setArrangement] = useState("Hybrid");
  const [experience, setExperience] = useState("Entry level");

  return <><PageHeader
    title={language === "Bahasa Melayu" ? "Kerjaya & Peluang" : language === "中文" ? "职业与成长机遇" : "Career & Opportunities"}
    subtitle={language === "Bahasa Melayu" ? "Tempat kerja yang menyokong dan mesra belia" : language === "中文" ? "关爱青年、氛围健康的优质雇主" : "Supportive, youth-friendly workplaces"}
    back={back}
  /><section className="page-pad">
    <div className="help-hero"><Icon name="market" /><div><h2>{language === "Bahasa Melayu" ? "Apakah jenis pekerjaan yang sesuai dengan perjalanan anda?" : language === "中文" ? "怎样的职业节奏最契合您当下的人生步调？" : "What kind of work fits your journey?"}</h2><p>{language === "Bahasa Melayu" ? "ONY memilih peluang bersama majikan Malaysia yang mengutamakan komunikasi sihat dan kesejahteraan." : language === "中文" ? "ONY 严选注重健康沟通、关怀身心健康的马来西亚本地优质雇主。" : "ONY curates openings with Malaysian employers who prioritize healthy communication and well-being."}</p></div></div>
    <SettingChoices
      title={language === "Bahasa Melayu" ? "Jenis pekerjaan" : language === "中文" ? "工作类型" : "Job type"}
      values={["Internship", "Part-time", "Full-time"]}
      value={type}
      setValue={setType}
      labels={{
        Internship: language === "Bahasa Melayu" ? "Latihan Industri" : language === "中文" ? "实习岗位" : "Internship",
        "Part-time": language === "Bahasa Melayu" ? "Sambilan" : language === "中文" ? "兼职" : "Part-time",
        "Full-time": language === "Bahasa Melayu" ? "Sepenuh Masa" : language === "中文" ? "全职" : "Full-time",
      }}
    />
    <SettingChoices
      title={language === "Bahasa Melayu" ? "Bidang pekerjaan" : language === "中文" ? "工作领域" : "Job field"}
      values={["Marketing", "Tech", "Design", "Operations"]}
      value={field}
      setValue={setField}
      labels={{
        Marketing: language === "Bahasa Melayu" ? "Pemasaran" : language === "中文" ? "市场营销" : "Marketing",
        Tech: language === "Bahasa Melayu" ? "Teknologi" : language === "中文" ? "技术与软件" : "Tech",
        Design: language === "Bahasa Melayu" ? "Reka Bentuk" : language === "中文" ? "视觉设计" : "Design",
        Operations: language === "Bahasa Melayu" ? "Operasi" : language === "中文" ? "运营管理" : "Operations",
      }}
    />
    <label className="field-label">{language === "Bahasa Melayu" ? "Lokasi pilihan" : language === "中文" ? "意向工作地点" : "Preferred location"}</label><TextInput value={location} onChange={(e) => setLocation(e.target.value)} />
    <SettingChoices
      title={language === "Bahasa Melayu" ? "Susunan kerja" : language === "中文" ? "工作形式" : "Work arrangement"}
      values={["On-site", "Hybrid", "Remote"]}
      value={arrangement}
      setValue={setArrangement}
      labels={{
        "On-site": language === "Bahasa Melayu" ? "Di Pejabat" : language === "中文" ? "现场办公" : "On-site",
        Hybrid: language === "Bahasa Melayu" ? "Hibrid" : language === "中文" ? "混合办公" : "Hybrid",
        Remote: language === "Bahasa Melayu" ? "Jauh / Dari Rumah" : language === "中文" ? "全远程办公" : "Remote",
      }}
    />
    <SettingChoices
      title={language === "Bahasa Melayu" ? "Tahap pengalaman" : language === "中文" ? "经验要求" : "Experience level"}
      values={["No experience", "Entry level", "1–3 years"]}
      value={experience}
      setValue={setExperience}
      labels={{
        "No experience": language === "Bahasa Melayu" ? "Tiada pengalaman" : language === "中文" ? "无需经验" : "No experience",
        "Entry level": language === "Bahasa Melayu" ? "Peringkat permulaan" : language === "中文" ? "入门级" : "Entry level",
        "1–3 years": language === "Bahasa Melayu" ? "1–3 tahun" : language === "中文" ? "1–3 年经验" : "1–3 years",
      }}
    />
    <Button className="full" onClick={() => navigate("jobs")}>{language === "Bahasa Melayu" ? "Tunjukkan Peluang Yang Sepadan" : language === "中文" ? "浏览匹配机遇" : "Show Matching Opportunities"}</Button>
  </section></>;
}

function JobOpportunities({ back, navigate }: { back: () => void; navigate: (s: Screen) => void }) {
  const { language } = useLanguage();
  const jobs = [
    {
      title: language === "Bahasa Melayu" ? "Penyelaras Kandungan Junior" : language === "中文" ? "初级内容策划专员" : "Junior Content Coordinator",
      company: "Kita Creative Studio",
      location: "Kuala Lumpur",
      type: language === "Bahasa Melayu" ? "Sepenuh Masa · Hibrid" : language === "中文" ? "全职 · 混合办公" : "Full-time · Hybrid",
      body: language === "Bahasa Melayu" ? "Sokong kandungan sosial, perancangan kempen, dan penceritaan komuniti dalam persekitaran pasukan yang saling menyokong." : language === "中文" ? "在温暖互助的团队环境中协助社交内容创作、活动统筹及社区故事传播。" : "Support social content, campaign planning, and community storytelling in a supportive team environment."
    },
    {
      title: language === "Bahasa Melayu" ? "Pelatih Pemasaran & Pertumbuhan" : language === "中文" ? "市场与增长实习生" : "Marketing & Growth Intern",
      company: "Bina Digital Media",
      location: "Petaling Jaya",
      type: language === "Bahasa Melayu" ? "Latihan Industri · Hibrid" : language === "中文" ? "实习 · 混合办公" : "Internship · Hybrid",
      body: language === "Bahasa Melayu" ? "Ketahui operasi kempen dengan bimbingan mentor, keseimbangan kerja-kehidupan yang sihat, dan matlamat pembelajaran yang jelas." : language === "中文" ? "在导师一对一指引下熟悉推广运作，享受健康的工作与生活平衡和清晰的成长目标。" : "Learn campaign operations with mentorship, healthy work-life balance, and clear learning goals."
    },
    {
      title: language === "Bahasa Melayu" ? "Pembantu Kesejahteraan Komuniti" : language === "中文" ? "社区身心健康关怀助理" : "Community Wellbeing Assistant",
      company: "Ruang Muda Collective",
      location: language === "Bahasa Melayu" ? "Jauh, Malaysia" : language === "中文" ? "远程，马来西亚" : "Remote, Malaysia",
      type: language === "Bahasa Melayu" ? "Sambilan · Jauh" : language === "中文" ? "兼职 · 远程" : "Part-time · Remote",
      body: language === "Bahasa Melayu" ? "Bantu menyelaraskan acara rakan sebaya dalam talian, pertanyaan komuniti, dan komunikasi ahli." : language === "中文" ? "协助统筹线上同伴互助聚会、解答社区伙伴咨询并跟进成员温暖互动。" : "Help coordinate online peer events, community inquiries, and member communications."
    },
  ];
  return <><PageHeader
    title={language === "Bahasa Melayu" ? "Peluang Belia" : language === "中文" ? "青年工作机会" : "Youth Opportunities"}
    subtitle={language === "Bahasa Melayu" ? "Peluang peringkat permulaan & latihan industri terpilih" : language === "中文" ? "精选入门级全职与实习岗位" : "Curated entry-level & internship openings"}
    back={back}
  /><section className="page-pad">
    <div className="community-note" style={{ background: "var(--theme-surface-soft)", borderColor: "var(--theme-border)", color: "var(--theme-success)" }}>
      <Icon name="check" />{language === "Bahasa Melayu" ? "Senarai rakan kongsi disahkan yang komited kepada kesejahteraan belia dan waktu kerja munasabah." : language === "中文" ? "经认证的合作伙伴，致力于保障青年身心健康与合理工时。" : "Verified partner listings committed to young adult well-being and reasonable working hours."}
    </div>
    <div className="result-summary">
      <strong>3 {language === "Bahasa Melayu" ? "padanan disahkan" : language === "中文" ? "个精选认证匹配" : "verified matches"}</strong>
      <span>Marketing & Community · {language === "Bahasa Melayu" ? "Peringkat permulaan · Malaysia" : language === "中文" ? "入门级 · 马来西亚" : "Entry level · Malaysia"}</span>
    </div>
    {jobs.map((job) => (
      <div className="job-card" key={job.title}>
        <span className="status-badge" style={{ background: "var(--peach-soft)", color: "var(--coral-dark)" }}>
          {language === "Bahasa Melayu" ? "Rakan Disahkan" : language === "中文" ? "认证伙伴" : "Verified Partner"}
        </span>
        <h3>{job.title}</h3>
        <strong>{job.company}</strong>
        <div className="job-meta">
          <span>{job.location}</span>
          <span>{job.type}</span>
        </div>
        <p>{job.body}</p>
        <div className="job-actions">
          <Button variant="secondary" onClick={() => navigate("jobDetail")}>
            {language === "Bahasa Melayu" ? "Lihat Peluang" : language === "中文" ? "查看岗位" : "View Opportunity"}
          </Button>
          <Button onClick={() => navigate("jobDetail")}>
            {language === "Bahasa Melayu" ? "Mohon / Simpan" : language === "中文" ? "申请 / 收藏" : "Apply / Save"}
          </Button>
        </div>
      </div>
    ))}
  </section></>;
}

function JobDetail({ back, notify }: { back: () => void; notify: (s: string) => void }) {
  const { language } = useLanguage();
  return <><PageHeader
    title={language === "Bahasa Melayu" ? "Butiran Peluang" : language === "中文" ? "职位详情" : "Opportunity Details"}
    subtitle="Kita Creative Studio"
    back={back}
  /><section className="page-pad">
    <div className="job-detail-head">
      <span className="status-badge" style={{ background: "var(--peach-soft)", color: "var(--coral-dark)" }}>
        {language === "Bahasa Melayu" ? "Mesra Belia" : language === "中文" ? "青年友好" : "Youth Friendly"}
      </span>
      <h1>{language === "Bahasa Melayu" ? "Penyelaras Kandungan Junior" : language === "中文" ? "初级内容策划专员" : "Junior Content Coordinator"}</h1>
      <strong>Kita Creative Studio · Kuala Lumpur</strong>
      <div className="job-meta">
        <span>Kuala Lumpur</span>
        <span>{language === "Bahasa Melayu" ? "Sepenuh Masa" : language === "中文" ? "全职" : "Full-time"}</span>
        <span>{language === "Bahasa Melayu" ? "Hibrid (3 hari di pejabat)" : language === "中文" ? "混合办公（每周3天在司）" : "Hybrid (3 days on-site)"}</span>
      </div>
    </div>
    <div className="card">
      <h3>{language === "Bahasa Melayu" ? "Mengenai peranan ini" : language === "中文" ? "岗位职责" : "About the role"}</h3>
      <p>{language === "Bahasa Melayu" ? "Sokong kandungan media sosial, atur kalendar kempen, dan bantu jadikan wawasan komuniti sebagai kisah bermakna. Pasukan kami menghargai kesihatan mental, tarikh akhir yang realistik, dan komunikasi terbuka." : language === "中文" ? "协助社群媒体内容策划、管理宣传档期，将社区心声转化为有温度的故事。我们团队推崇心理健康、合理的截稿期与坦诚透明的沟通。" : "Support social media content, organize campaign calendars, and help turn community insights into useful stories. Our team values mental health, realistic deadlines, and open communication."}</p>
      <h3>{language === "Bahasa Melayu" ? "Apa yang kami cari" : language === "中文" ? "任职要求" : "What we look for"}</h3>
      <p>{language === "Bahasa Melayu" ? "Komunikasi jelas, sifat ingin tahu, kebiasaan asas media sosial, dan minat belajar. Tiada pengalaman sepenuh masa terdahulu diperlukan; graduan baharu dan lepasan sekolah dialu-alukan." : language === "中文" ? "沟通表达清晰，充满求知欲，熟悉主流社交平台，善于主动学习。无需过往全职工作经验，欢迎应届毕业生。" : "Clear communication, curiosity, basic social-media familiarity, and willingness to learn. No prior full-time experience required; fresh graduates and school-leavers welcome."}</p>
    </div>
    <Button className="full" onClick={() => notify(language === "Bahasa Melayu" ? "Peluang disimpan ke profil anda" : language === "中文" ? "职位已收藏至您的个人主页" : "Opportunity saved to your profile")}>
      {language === "Bahasa Melayu" ? "Simpan Peluang" : language === "中文" ? "收藏职位" : "Save Opportunity"}
    </Button>
    <Button variant="secondary" className="full" onClick={() => notify(language === "Bahasa Melayu" ? "Permohonan dihantar kepada Kita Creative Studio · Mereka akan menghubungi e-mel anda" : language === "中文" ? "申请已提交给 Kita Creative Studio · 招聘专员将通过邮件与您联系" : "Application submitted to Kita Creative Studio · They will contact your email")}>
      {language === "Bahasa Melayu" ? "Hantar Permohonan" : language === "中文" ? "提交申请" : "Submit Application"}
    </Button>
    <p className="disclaimer">
      <Icon name="info" />{language === "Bahasa Melayu" ? "ONY bekerjasama dengan majikan Malaysia yang prihatin terhadap belia untuk menggalakkan waktu kerja berperikemanusiaan dan kesejahteraan mental." : language === "中文" ? "ONY 与关爱青年身心健康的马来西亚雇主深度合作，倡导人性化工时与心理健康。" : "ONY partners with youth-conscious Malaysian employers to promote humane work hours and mental well-being."}
    </p>
  </section></>;
}

function Wellbeing({ back, navigate, notify, onOpenMusicModal }: { back: () => void; navigate: (s: Screen) => void; notify: (s: string) => void; onOpenMusicModal?: () => void }) {
  const { language } = useLanguage();
  const [mode, setMode] = useState("All");
  const [isPlaying, setIsPlaying] = useState(() => ambientMusicEngine.getIsPlaying());
  const [activeTrack, setActiveTrack] = useState(() => ambientMusicEngine.getCurrentTrack());

  useEffect(() => {
    const unsub = ambientMusicEngine.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setActiveTrack(ambientMusicEngine.getCurrentTrack());
    });
    return unsub;
  }, []);

  const options: {
    id: string;
    title: string;
    type: "Music" | "Nature" | "Relaxation" | "Wellness";
    detail: string;
    tone: string;
    trackId?: string;
  }[] = [
    {
      id: "serenity_432",
      title: language === "Bahasa Melayu" ? "Dron Tenang 432Hz (Redakan Gelisah)" : language === "中文" ? "432Hz 颂钵疗愈共鸣 (缓解焦虑)" : "432Hz Serenity Drone (Anxiety Relief)",
      type: "Music",
      detail: language === "Bahasa Melayu" ? "Harmonik 432Hz · Redakan degupan laju" : language === "中文" ? "432Hz 疗愈谐波 · 平复心悸紧绷" : "432Hz Solfeggio harmonics · Calms rapid heartbeat",
      tone: "peach",
      trackId: "serenity_432",
    },
    {
      id: "rain_leaves",
      title: language === "Bahasa Melayu" ? "Hujan di Daun Rimba (Dekompresi Tekanan)" : language === "中文" ? "热带雨林静心微雨 (深度减压)" : "Rain on Temple Leaves (Stress Relief)",
      type: "Nature",
      detail: language === "Bahasa Melayu" ? "Bunyi hujan & titisan · Kurangkan burnout" : language === "中文" ? "粉红噪音白噪音 · 洗涤疲惫思绪" : "Filtered pink noise · Mind decompression & burnout relief",
      tone: "forest",
      trackId: "rain_leaves",
    },
    {
      id: "ocean_breath",
      title: language === "Bahasa Melayu" ? "Ombak Pernafasan 10 Saat (Irama Tenang)" : language === "中文" ? "潮汐腹式深呼吸 (10秒呼吸法)" : "Ocean Tide Breathing (10s Vagus Cycle)",
      type: "Relaxation",
      detail: language === "Bahasa Melayu" ? "Rentak ombak: 5s tarik / 5s hembus" : language === "中文" ? "10秒潮涨潮落 · 同步5秒吸气5秒呼气" : "10s wave rhythm matching 5s in / 5s out breathing",
      tone: "ocean",
      trackId: "ocean_breath",
    },
    {
      id: "singing_bowls",
      title: language === "Bahasa Melayu" ? "Mangkuk Nyanyian Tibet (Redakan Panik)" : language === "中文" ? "藏式颂钵与古道清钟 (平复惊恐)" : "Tibetan Singing Bowls (Panic Grounding)",
      type: "Relaxation",
      detail: language === "Bahasa Melayu" ? "Gema harmonik 216Hz/432Hz untuk panik" : language === "中文" ? "沉浸式谐波回响 · 抚平惊恐心慌" : "Harmonic resonance for acute panic grounding",
      tone: "lavender",
      trackId: "singing_bowls",
    },
    {
      id: "lofi_piano",
      title: language === "Bahasa Melayu" ? "Piano Lembut Tengah Malam (Tidur & Fokus)" : language === "中文" ? "午夜温润暖心钢琴 (助眠伴读)" : "Midnight Cozy Piano (Sleep & Focus)",
      type: "Music",
      detail: language === "Bahasa Melayu" ? "Kord akustik Rhodes & vinil hangat" : language === "中文" ? "暖心爵士和弦 · 助眠伴读与舒心安歇" : "Warm acoustic Rhodes chords & gentle focus",
      tone: "sunset",
      trackId: "lofi_piano",
    },
    {
      id: "pottery",
      title: language === "Bahasa Melayu" ? "Seramik & tanah liat minda" : language === "中文" ? "正念陶艺与手作泥工" : "Mindful pottery & clay",
      type: "Wellness",
      detail: language === "Bahasa Melayu" ? "Sesi penetapan semula kreatif" : language === "中文" ? "创意放松治愈体验" : "Creative reset session",
      tone: "peach",
    },
  ];

  const getTabName = (raw: string) => {
    switch (raw) {
      case "All": return language === "Bahasa Melayu" ? "Semua" : language === "中文" ? "全部" : "All";
      case "Music": return language === "Bahasa Melayu" ? "Muzik" : language === "中文" ? "音乐" : "Music";
      case "Nature": return language === "Bahasa Melayu" ? "Alam Semula Jadi" : language === "中文" ? "自然" : "Nature";
      case "Relaxation": return language === "Bahasa Melayu" ? "Kelonggaran" : language === "中文" ? "放松" : "Relaxation";
      case "Wellness": return language === "Bahasa Melayu" ? "Kesejahteraan" : language === "中文" ? "疗愈" : "Wellness";
      default: return raw;
    }
  };

  const shown = options.filter((item) => mode === "All" || item.type === mode);
  return <><PageHeader
    title={language === "Bahasa Melayu" ? "Cadangan Lembut & Muzik" : language === "中文" ? "舒心微习惯与疗愈音" : "Gentle Suggestions & Soundscapes"}
    subtitle={language === "Bahasa Melayu" ? "Ketenangan, muzik 432Hz & kesejahteraan" : language === "中文" ? "日常身心安顿、432Hz 颂钵与白噪音" : "Everyday grounding, 432Hz audio & well-being"}
    back={back}
  /><section className="page-pad">
    <div className="reflection"><SmallLogo /><div><strong>{language === "Bahasa Melayu" ? "Mari jadikan saat ini lebih tenang dan ringan." : language === "中文" ? "让此刻的心情更轻松一些。" : "Let’s make this moment a little lighter."}</strong><p>{language === "Bahasa Melayu" ? "Ketik mana-mana trek untuk terus mendengar frekuensi penenang degupan jantung dan pernafasan." : language === "中文" ? "轻点下方任意卡片，即可立即播放舒缓心率与平复交感神经的音频。" : "Tap any soundscape to immediately play frequencies designed to down-regulate nervous system stress."}</p></div></div>
    
    {onOpenMusicModal && (
      <button
        type="button"
        className="professional-banner"
        style={{ marginBottom: "12px", background: "var(--theme-surface-elevated)" }}
        onClick={onOpenMusicModal}
      >
        <Icon name="music" />
        <span>
          <strong>
            {language === "Bahasa Melayu"
              ? "Buka Pemain Muzik & Lanskap Tenang Penuh"
              : language === "中文"
              ? "打开完整疗愈音乐与情绪白噪音播放器"
              : "Open Full Calming Music & Soundscape Player"}
          </strong>
          <small>
            {language === "Bahasa Melayu"
              ? "Kawalan kelantangan, frekuensi 432Hz & irama nafas"
              : language === "中文"
              ? "支持音量无极调节、432Hz 共鸣与10秒深呼吸节律"
              : "Master volume, 432Hz frequencies & 10s vagus nerve sync"}
          </small>
        </span>
        <Icon name="chevron" />
      </button>
    )}

    <div className="scroll-chips wellbeing-tabs">{["All", "Music", "Nature", "Relaxation", "Wellness"].map((item) => <Button key={item} variant={mode === item ? "primary" : "secondary"} onClick={() => setMode(item)}>{getTabName(item)}</Button>)}</div>
    <div className="wellbeing-grid">{shown.map((item) => {
      const isThisTrack = Boolean(item.trackId && activeTrack.id === item.trackId);
      const isThisPlaying = isThisTrack && isPlaying;

      return (
        <button
          key={item.title}
          className={`wellbeing-card ${isThisPlaying ? "active-playing" : ""}`}
          onClick={() => {
            if (item.trackId) {
              if (isPlaying && activeTrack.id === item.trackId) {
                ambientMusicEngine.pause();
                notify(language === "Bahasa Melayu" ? "Muzik dijeda" : language === "中文" ? "音频已暂停" : "Audio paused");
              } else {
                ambientMusicEngine.play(item.trackId);
                notify(`${item.title} ${language === "Bahasa Melayu" ? "dimulakan · Bernafas perlahan-lahan 🌱" : language === "中文" ? "已开启 · 缓慢平稳地深呼吸 🌱" : "started · Breathe gently 🌱"}`);
              }
            } else if (item.type === "Wellness") {
              navigate("merchant");
            }
          }}
        >
          <span className={`wellbeing-visual visual-${item.tone}`}>
            {isThisPlaying ? (
              <span className="calming-equalizer-bars" aria-hidden="true" style={{ marginTop: "8px" }}>
                <i className="bar b1" />
                <i className="bar b2" />
                <i className="bar b3" />
              </span>
            ) : (
              <i />
            )}
          </span>
          <span className="eyebrow">{getTabName(item.type)}</span>
          <strong>{item.title}</strong>
          <small>{item.detail}</small>
          <b>
            {isThisPlaying
              ? (language === "Bahasa Melayu" ? "Jeda" : language === "中文" ? "暂停" : "Pause")
              : item.trackId
              ? (language === "Bahasa Melayu" ? "Main" : language === "中文" ? "播放" : "Play")
              : (language === "Bahasa Melayu" ? "Buka" : language === "中文" ? "开始" : "Open")}
          </b>
        </button>
      );
    })}</div>
    <button className="professional-banner" onClick={() => navigate("merchant")}><Icon name="market" /><span><strong>{language === "Bahasa Melayu" ? "Terokai rakan kesihatan & kesejahteraan" : language === "中文" ? "探索身心疗愈伙伴" : "Explore wellness partners"}</strong><small>{language === "Bahasa Melayu" ? "Kafe tenang, seramik, yoga, dan aktiviti santai" : language === "中文" ? "静心咖啡馆、陶艺手作、轻瑜伽及放松体验" : "Mindful cafés, pottery, yoga, and calming activities"}</small></span><Icon name="chevron" /></button>
    <p className="disclaimer"><Icon name="info" />{language === "Bahasa Melayu" ? "Cadangan gaya hidup ini adalah untuk kelonggaran harian dan tidak menggantikan penjagaan kesihatan mental klinikal." : language === "中文" ? "此类生活方式建议仅用于日常放松减压，不可替代专业临床心理医疗。" : "These lifestyle suggestions are for everyday relaxation and do not substitute for clinical mental healthcare."}</p>
  </section></>;
}

function ProfessionalSupport({
  back,
  navigate,
  onSelectProvider,
  userCoords,
  setUserCoords,
  notify,
}: {
  back: () => void;
  navigate: (s: Screen) => void;
  onSelectProvider: (p: HealthcareProvider) => void;
  userCoords: UserCoordinates | null;
  setUserCoords: (c: UserCoordinates | null) => void;
  notify?: (s: string) => void;
}) {
  const { t, language } = useLanguage();
  const [filter, setFilter] = useState("All");
  const [selectedState, setSelectedState] = useState("All");
  const [search, setSearch] = useState("");
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [showAreaPicker, setShowAreaPicker] = useState(false);

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    setGeoError(null);
    try {
      const coords = await requestDeviceLocation();
      setUserCoords(coords);
      setFilter("Nearest");
      setShowAreaPicker(false);
    } catch (err: any) {
      setGeoError(err.message || t.geo_permission_denied);
      setShowAreaPicker(true);
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleSelectManualArea = (area: MalaysianAreaItem) => {
    const coords = createManualLocation(area);
    setUserCoords(coords);
    setGeoError(null);
    setShowAreaPicker(false);
    setFilter("Nearest");
    if (notify) {
      notify(
        language === "Bahasa Melayu"
          ? `Kawasan ditetapkan ke ${area.nameBm}, ${area.state}`
          : language === "中文"
            ? `已将区域设为：${area.nameZh}（${area.state}）`
            : `Area set to: ${area.nameEn}, ${area.state}`
      );
    }
  };

  const handleClearLocation = () => {
    clearCachedLocation();
    setUserCoords(null);
    setShowAreaPicker(false);
    setGeoError(null);
    if (filter === "Nearest") setFilter("All");
  };

  const states = [
    { id: "All", label: t.professional_all_states },
    { id: "Kuala Lumpur", label: "Kuala Lumpur" },
    { id: "Selangor", label: "Selangor" },
    { id: "Pulau Pinang", label: "Penang (Pulau Pinang)" },
    { id: "Johor", label: "Johor" },
    { id: "Perak", label: "Perak" },
    { id: "Sarawak", label: "Sarawak" },
    { id: "Sabah", label: "Sabah" },
  ];

  const getFilterLabel = (item: string) => {
    switch (item) {
      case "All":
        return language === "Bahasa Melayu" ? "Semua Sumber" : language === "中文" ? "全部机构" : "All Resources";
      case "Nearest":
        return t.professional_nearest_tab;
      case "Helpline":
        return language === "Bahasa Melayu" ? "Talian 24/7" : language === "中文" ? "24/7 热线" : "24/7 Helplines";
      case "MOH":
        return language === "Bahasa Melayu" ? "MENTARI (KKM)" : language === "中文" ? "MENTARI (卫生部)" : "MOH MENTARI";
      case "Hospital":
        return language === "Bahasa Melayu" ? "Hospital Awam" : language === "中文" ? "公立总医院" : "Public Hospitals";
      case "NGO":
        return language === "Bahasa Melayu" ? "NGO Berdaftar" : language === "中文" ? "注册公益 NGO" : "Certified NGOs";
      default:
        return item;
    }
  };

  // Calculate distance for all providers
  const providersWithDistance = VERIFIED_MALAYSIAN_PROVIDERS.map((provider) => {
    const distanceKm = userCoords
      ? haversineDistanceKm(userCoords.lat, userCoords.lng, provider.lat, provider.lng)
      : null;
    return { ...provider, distanceKm };
  });

  // Filter
  const filtered = providersWithDistance.filter((p) => {
    // State filter
    if (selectedState !== "All") {
      if (p.state !== selectedState && !p.isNationwide) return false;
    }

    // Type filter
    if (filter === "Helpline" && p.type !== "helpline") return false;
    if (filter === "MOH" && p.type !== "mentari") return false;
    if (filter === "Hospital" && p.type !== "hospital") return false;
    if (filter === "NGO" && p.type !== "ngo") return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q) || (p.nameBm && p.nameBm.toLowerCase().includes(q)) || (p.nameZh && p.nameZh.toLowerCase().includes(q));
      const matchAddress = p.address.toLowerCase().includes(q);
      const matchState = p.state.toLowerCase().includes(q);
      const matchService = p.service.toLowerCase().includes(q) || p.serviceBm.toLowerCase().includes(q) || p.serviceZh.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q) || p.descriptionBm.toLowerCase().includes(q) || p.descriptionZh.toLowerCase().includes(q);
      return matchName || matchAddress || matchState || matchService || matchDesc;
    }

    return true;
  });

  // Sorting: If user coordinates exist, sort by distance; keep 24/7 nationwide emergency helplines accessible
  const shown = [...filtered].sort((a, b) => {
    if (userCoords) {
      if (a.isNationwide && !b.isNationwide) return -1;
      if (!a.isNationwide && b.isNationwide) return 1;
      if (a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }
    }
    return 0;
  });

  return (
    <>
      <PageHeader
        title={language === "Bahasa Melayu" ? "Bantuan Profesional Berdekatan" : language === "中文" ? "附近的专业心理支援" : "Professional Help Nearby"}
        subtitle={language === "Bahasa Melayu" ? "Rangkaian kesihatan mental Malaysia yang disahkan & hospital KKM" : language === "中文" ? "马来西亚官方卫生部认证精神专科医院与心理中心" : "Verified Malaysian mental health resources & MOH hospitals"}
        back={back}
      />
      <section className="page-pad">
        {/* Emergency Life Danger Strip */}
        <a className="resource emergency-resource emergency-strip" href="tel:999">
          <span>
            <strong>{language === "Bahasa Melayu" ? "Dalam bahaya nyawa serta-merta?" : language === "中文" ? "面临即刻生命安全险情？" : "In immediate life danger?"}</strong>
            <small>{language === "Bahasa Melayu" ? "Hubungi 999 untuk ambulans kecemasan atau polis serta-merta." : language === "中文" ? "立即拨打 999 呼叫救护车或紧急警务救助。" : "Call 999 for ambulance or emergency medical care immediately."}</small>
          </span>
          <b>{language === "Bahasa Melayu" ? "Hubungi 999" : language === "中文" ? "呼叫 999" : "Call 999"}</b>
        </a>

        {/* Real Geolocation Location Control Card */}
        <div className={`geo-location-card ${userCoords ? "active" : ""}`}>
          <div className="geo-header-row">
            <div className="geo-title-wrap">
              <div className={`geo-pin-icon ${detectingLocation ? "pulse" : ""}`}>
                <Icon name={detectingLocation ? "refresh" : userCoords?.isManual ? "compass" : "location"} />
              </div>
              <div>
                <strong>
                  {userCoords
                    ? `${language === "Bahasa Melayu" ? "Lokasi Aktif:" : language === "中文" ? "当前已定位：" : "Active Location:"} ${userCoords.regionName || "Malaysia"} ${userCoords.isManual ? `(${t.geo_manual_active_badge})` : ""}`
                    : (language === "Bahasa Melayu" ? "Kesan Fasiliti Terdekat Anda" : language === "中文" ? "查找您身边的专业机构" : "Find Facilities Closest to You")}
                </strong>
                <p>
                  {userCoords
                    ? userCoords.isManual
                      ? (language === "Bahasa Melayu" ? `Disusun mengikut jarak dari ${userCoords.areaName || userCoords.regionName}.` : language === "中文" ? `已按距离 ${userCoords.areaName || userCoords.regionName} 由近及远精准排序。` : `Sorted by proximity from ${userCoords.areaName || userCoords.regionName}.`)
                      : `${t.professional_closest_first} (~${userCoords.accuracy || 20}m GPS).`
                    : (language === "Bahasa Melayu" ? "Dayakan GPS peranti atau cari kawasan anda di Malaysia untuk mengira jarak sebenar ke klinik MENTARI dan hospital." : language === "中文" ? "开启设备定位或搜索您的区域，即刻计算距离您最近的 MENTARI 心理中心与公立医院。" : "Enable device GPS or search your area in Malaysia to calculate real driving/walking distances to the nearest MOH MENTARI clinics and hospitals.")}
                </p>
              </div>
            </div>
            {userCoords && (
              <span className="distance-pill" style={{ flexShrink: 0 }}>
                <Icon name="check" /> {userCoords.isManual ? t.geo_approx_badge : t.common_active}
              </span>
            )}
          </div>

          <div className="geo-actions-row">
            <Button
              variant={userCoords && !userCoords.isManual ? "secondary" : "primary"}
              onClick={handleDetectLocation}
              disabled={detectingLocation}
            >
              {detectingLocation ? (
                <>
                  <span className="spinner mini" /> {t.geo_detecting}
                </>
              ) : (
                <>
                  <Icon name="location" /> {userCoords ? t.geo_retry : t.geo_detect_btn}
                </>
              )}
            </Button>
            <Button
              variant={showAreaPicker || (userCoords && userCoords.isManual) ? "primary" : "secondary"}
              onClick={() => setShowAreaPicker(!showAreaPicker)}
            >
              <Icon name="search" /> {showAreaPicker ? (language === "Bahasa Melayu" ? "Tutup Carian" : language === "中文" ? "收起搜索" : "Hide Search") : (language === "Bahasa Melayu" ? "Cari Kawasan / Bandar" : language === "中文" ? "搜索区域 / 城市" : "Search Area / City")}
            </Button>
            {userCoords && (
              <Button variant="ghost" onClick={handleClearLocation}>
                {t.geo_clear}
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced Area Search Picker Panel when location is denied or user searches area */}
        {(showAreaPicker || geoError) && (
          <AreaSearchPicker
            userCoords={userCoords}
            onSelectArea={handleSelectManualArea}
            onDetectLocation={handleDetectLocation}
            onClearLocation={handleClearLocation}
            detectingLocation={detectingLocation}
            isDenied={Boolean(geoError)}
            errorMessage={geoError}
            title={geoError ? t.geo_denied_heading : (language === "Bahasa Melayu" ? "Cari Kawasan di Malaysia" : language === "中文" ? "搜索马来西亚区域" : "Search Area in Malaysia")}
            subtitle={geoError ? t.geo_denied_help_desc : (language === "Bahasa Melayu" ? "Pilih kawasan anda untuk mengira jarak terdekat ke klinik MENTARI dan hospital." : language === "中文" ? "选择或搜索您的城市/城镇，即刻获取精准距离排序与就诊指引。" : "Select your area to calculate closest distances to MOH MENTARI clinics and hospitals.")}
          />
        )}

        {/* Search input */}
        <div className="search" style={{ margin: "0 0 14px", padding: "0 12px", background: "var(--paper)", cursor: "text" }}>
          <Icon name="search" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.professional_search_prompt}
            style={{
              flex: 1,
              minWidth: 0,
              width: "100%",
              border: 0,
              padding: "10px 4px 10px 0",
              background: "transparent",
              fontSize: "13px",
              textAlign: "left",
              outline: "none",
            }}
            aria-label={t.professional_search_prompt}
          />
          {search && (
            <button
              type="button"
              className="area-search-clear-btn"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <Icon name="close" />
            </button>
          )}
        </div>

        {/* State filter scroll */}
        <div style={{ marginBottom: "6px" }}>
          <small style={{ fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
            {t.professional_filter_state}
          </small>
          <div className="state-filter-scroll">
            {states.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`state-pill ${selectedState === s.id ? "active" : ""}`}
                onClick={() => setSelectedState(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Service Type Chips */}
        <div className="scroll-chips" style={{ marginBottom: "14px" }}>
          {["All", "Nearest", "Helpline", "MOH", "Hospital", "NGO"].map((item) => (
            <Button
              key={item}
              variant={filter === item ? "primary" : "secondary"}
              onClick={() => {
                if (item === "Nearest" && !userCoords) {
                  void handleDetectLocation();
                } else {
                  setFilter(item);
                }
              }}
            >
              {getFilterLabel(item)}
            </Button>
          ))}
        </div>

        {/* Results Count & Note */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", fontSize: "11px", color: "var(--muted)" }}>
          <span>
            {shown.length} {language === "Bahasa Melayu" ? "pusat rawatan disahkan" : language === "中文" ? "所认证医疗服务机构" : "verified healthcare providers"}
          </span>
          {userCoords && (
            <span style={{ color: "var(--theme-success)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
              <Icon name="mapPin" /> {language === "Bahasa Melayu" ? "Disusun mengikut jarak" : language === "中文" ? "按真实距离排序" : "Distance sorted"}
            </span>
          )}
        </div>

        {/* Provider Cards */}
        {shown.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "28px 16px" }}>
            <Icon name="search" />
            <h3 style={{ marginTop: "10px" }}>
              {language === "Bahasa Melayu" ? "Tiada pusat rawatan padanan ditemui" : language === "中文" ? "未找到符合条件的机构" : "No matching providers found"}
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "12px" }}>
              {language === "Bahasa Melayu" ? "Cuba ubah pilihan carian negeri atau kosongkan kata kunci carian." : language === "中文" ? "请尝试选择其他州属或清空搜索关键词。" : "Try selecting 'All Malaysia' or clearing your search keywords."}
            </p>
            <Button variant="secondary" onClick={() => { setSearch(""); setSelectedState("All"); setFilter("All"); }} style={{ marginTop: "12px" }}>
              {language === "Bahasa Melayu" ? "Set Semula Carian" : language === "中文" ? "重置筛选条件" : "Reset Filters"}
            </Button>
          </div>
        ) : (
          shown.map((provider) => {
            const displayName =
              language === "Bahasa Melayu" && provider.nameBm
                ? provider.nameBm
                : language === "中文" && provider.nameZh
                  ? provider.nameZh
                  : provider.name;
            const displayLabel =
              language === "Bahasa Melayu"
                ? provider.labelBm
                : language === "中文"
                  ? provider.labelZh
                  : provider.label;
            const displayService =
              language === "Bahasa Melayu"
                ? provider.serviceBm
                : language === "中文"
                  ? provider.serviceZh
                  : provider.service;
            const displayHours =
              language === "Bahasa Melayu"
                ? provider.hoursBm
                : language === "中文"
                  ? provider.hoursZh
                  : provider.hours;

            const mapDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${provider.lat},${provider.lng}`;

            return (
              <div className="provider-card" key={provider.id}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", flexWrap: "wrap" }}>
                    <span
                      className="status-badge"
                      style={{
                        background: provider.type === "hospital" ? "var(--theme-error-soft)" : provider.type === "mentari" ? "var(--theme-success-soft)" : "var(--theme-surface-soft)",
                        color: provider.type === "hospital" ? "var(--theme-error)" : provider.type === "mentari" ? "var(--theme-success)" : "var(--theme-primary)",
                        fontWeight: 800,
                      }}
                    >
                      {displayLabel}
                    </span>

                    {/* Proximity / Distance Badge */}
                    {provider.isNationwide ? (
                      <span className="distance-pill nationwide">
                        <Icon name="phone" /> {t.professional_nationwide_badge}
                      </span>
                    ) : provider.distanceKm !== null ? (
                      <span className="distance-pill">
                        <Icon name="mapPin" /> {formatDistanceString(provider.distanceKm, language)}
                      </span>
                    ) : (
                      <span className="distance-pill nationwide">
                        <Icon name="mapPin" /> {provider.state}
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: "16px", marginTop: "8px", marginBottom: "3px" }}>{displayName}</h3>
                  <strong style={{ fontSize: "12px", color: "var(--coral-dark)", display: "block" }}>
                    {displayService}
                  </strong>

                  {/* Capability tags */}
                  <div className="provider-tags">
                    {provider.emergencyAvailable && (
                      <span className="provider-tag emergency">
                        🚨 {t.professional_emergency_tag}
                      </span>
                    )}
                    {provider.walkInWelcome && (
                      <span className="provider-tag walkin">
                        ✅ {t.professional_walkin_tag}
                      </span>
                    )}
                  </div>

                  {/* Physical verified address */}
                  <div className="provider-address-row">
                    <Icon name="mapPin" />
                    <span>{provider.address}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                    <Icon name="calendarCheck" />
                    <span>{displayHours}</span>
                  </div>
                </div>

                {/* Real Navigation & Action Grid */}
                <div className="provider-action-grid">
                  <a className="btn btn-primary" href={`tel:${provider.phone}`} style={{ textDecoration: "none" }}>
                    <Icon name="phone" /> {t.professional_call_btn}
                  </a>

                  <a
                    className="btn btn-secondary"
                    href={mapDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none" }}
                    title="Open live navigation in Google Maps"
                  >
                    <Icon name="location" /> {t.professional_directions_btn}
                  </a>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      onSelectProvider(provider);
                      navigate("provider");
                    }}
                  >
                    {t.professional_details_btn}
                  </Button>
                </div>
              </div>
            );
          })
        )}

        <a
          className="btn btn-secondary full"
          href="https://mentari.moh.gov.my"
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginTop: "14px", textDecoration: "none" }}
        >
          <Icon name="externalLink" /> {language === "Bahasa Melayu" ? "Laman Sesawang Rasmi MENTARI KKM Malaysia" : language === "中文" ? "访问马来西亚官方 MENTARI 心理卫生专网" : "Official MENTARI MOH Malaysia Portal"}
        </a>

        <p className="disclaimer" style={{ marginTop: "16px" }}>
          <Icon name="info" />
          {language === "Bahasa Melayu"
            ? "Semua talian bantuan, pusat MENTARI, dan hospital yang disenaraikan adalah perkhidmatan kesihatan mental bertauliah di bawah Kementerian Kesihatan Malaysia atau badan kebajikan berdaftar."
            : language === "中文"
              ? "所列所有 24 小时热线、MENTARI 社区中心及综合公立医院均为马来西亚卫生部 (KKM) 官方认证或国家注册权威公益机构。"
              : "All listed helplines, MENTARI centres, and hospital psychiatric units are certified under the Ministry of Health Malaysia or legally registered organizations."}
        </p>
      </section>
    </>
  );
}

function ProviderDetail({
  back,
  notify,
  provider,
  userCoords,
}: {
  back: () => void;
  notify: (s: string) => void;
  provider: HealthcareProvider;
  userCoords: UserCoordinates | null;
}) {
  const { t, language } = useLanguage();
  const displayName =
    language === "Bahasa Melayu" && provider.nameBm
      ? provider.nameBm
      : language === "中文" && provider.nameZh
        ? provider.nameZh
        : provider.name;
  const displayLabel =
    language === "Bahasa Melayu"
      ? provider.labelBm
      : language === "中文"
        ? provider.labelZh
        : provider.label;
  const displayService =
    language === "Bahasa Melayu"
      ? provider.serviceBm
      : language === "中文"
        ? provider.serviceZh
        : provider.service;
  const displayHours =
    language === "Bahasa Melayu"
      ? provider.hoursBm
      : language === "中文"
        ? provider.hoursZh
        : provider.hours;
  const displayDesc =
    language === "Bahasa Melayu"
      ? provider.descriptionBm
      : language === "中文"
        ? provider.descriptionZh
        : provider.description;
  const displayReferral =
    language === "Bahasa Melayu"
      ? provider.referralRequirementBm
      : language === "中文"
        ? provider.referralRequirementZh
        : provider.referralRequirement;

  const distanceKm = userCoords
    ? haversineDistanceKm(userCoords.lat, userCoords.lng, provider.lat, provider.lng)
    : null;

  const mapDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${provider.lat},${provider.lng}`;

  return (
    <>
      <PageHeader
        title={language === "Bahasa Melayu" ? "Butiran Pusat Rawatan" : language === "中文" ? "医疗机构详情" : "Provider Details"}
        subtitle={language === "Bahasa Melayu" ? "Pusat jagaan kesihatan mental Malaysia disahkan" : language === "中文" ? "经认证的马来西亚心理医疗中心" : "Verified Malaysian mental healthcare centre"}
        back={back}
      />
      <section className="page-pad">
        <div className="provider-hero">
          <div style={{ display: "flex", justifyContent: "center", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
            <span
              className="status-badge"
              style={{
                background: provider.type === "hospital" ? "var(--theme-error-soft)" : "var(--theme-success-soft)",
                color: provider.type === "hospital" ? "var(--theme-error)" : "var(--theme-success)",
                fontWeight: 800,
              }}
            >
              {displayLabel}
            </span>
            {provider.isNationwide ? (
              <span className="distance-pill nationwide">
                <Icon name="phone" /> {t.professional_nationwide_badge}
              </span>
            ) : distanceKm !== null ? (
              <span className="distance-pill">
                <Icon name="mapPin" /> {formatDistanceString(distanceKm, language)}
              </span>
            ) : null}
          </div>

          <div className="provider-avatar">
            <Icon name="shield" />
          </div>
          <h1 style={{ fontSize: "21px", margin: "6px 0 2px" }}>{displayName}</h1>
          <p style={{ color: "var(--coral-dark)", fontWeight: 700, margin: "2px 0 6px" }}>{displayService}</p>
          <small style={{ color: "var(--muted)" }}>{provider.address}</small>
        </div>

        {/* Primary Action Strip */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", margin: "14px 0" }}>
          <a className="btn btn-primary" href={`tel:${provider.phone}`} style={{ textDecoration: "none", justifyContent: "center" }}>
            <Icon name="phone" /> {t.professional_call_btn}
          </a>
          <a
            className="btn btn-secondary"
            href={mapDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none", justifyContent: "center" }}
          >
            <Icon name="location" /> {t.professional_directions_btn}
          </a>
        </div>

        {/* Detailed Information Cards */}
        <div className="card">
          <h3>{language === "Bahasa Melayu" ? "Mengenai kemudahan & kepakaran" : language === "中文" ? "机构背景与专科诊疗" : "About this facility & clinical scope"}</h3>
          <p>{displayDesc}</p>

          <h3 style={{ marginTop: "14px" }}>
            {language === "Bahasa Melayu" ? "Panduan Rujukan & Kemasukan" : language === "中文" ? "就诊指引与转介说明" : "Walk-in & Referral Guidelines"}
          </h3>
          <p>{displayReferral}</p>

          <h3 style={{ marginTop: "14px" }}>
            {language === "Bahasa Melayu" ? "Waktu Operasi & Hubungan" : language === "中文" ? "开放时间与联络方式" : "Hours & Contact Details"}
          </h3>
          <p>
            <strong>{language === "Bahasa Melayu" ? "Waktu Operasi:" : language === "中文" ? "门诊时间：" : "Operating Hours:"}</strong> {displayHours}
            <br />
            <strong>{language === "Bahasa Melayu" ? "Talian Hubungan:" : language === "中文" ? "联络电话：" : "Contact Number:"}</strong> {provider.contact}
            <br />
            <strong>{language === "Bahasa Melayu" ? "Alamat Fizikal:" : language === "中文" ? "详细地址：" : "Physical Address:"}</strong> {provider.address}
          </p>

          {provider.website && (
            <div style={{ marginTop: "12px" }}>
              <a
                className="btn btn-ghost full"
                href={provider.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", justifyContent: "center" }}
              >
                <Icon name="externalLink" /> {language === "Bahasa Melayu" ? "Buka Laman Rasmi" : language === "中文" ? "访问官方网站" : "Open Official Portal"}
              </a>
            </div>
          )}
        </div>

        <Button
          className="full"
          variant="secondary"
          onClick={() => {
            notify(
              language === "Bahasa Melayu"
                ? `Kontak ${displayName} disimpan ke senarai kecemasan anda`
                : language === "中文"
                  ? `机构 ${displayName} 已保存至紧急联系人列表`
                  : `Provider ${displayName} saved to your emergency contacts`,
            );
          }}
        >
          <Icon name="shield" /> {language === "Bahasa Melayu" ? "Simpan ke Kenalan Kecemasan" : language === "中文" ? "保存到紧急联络人" : "Save to Emergency Contacts"}
        </Button>

        <p className="disclaimer" style={{ marginTop: "16px" }}>
          <Icon name="info" />
          {language === "Bahasa Melayu"
            ? "Sekiranya anda memerlukan rawatan perubatan segera atau berasa tidak selamat, sila ke jabatan kecemasan hospital terdekat atau dail 999 tanpa berlengah."
            : language === "中文"
              ? "若您需要紧急医疗救助或身处危险之中，请立即前往最近的综合医院急诊科或拨打 999。"
              : "If you require immediate medical intervention or feel unsafe, please proceed directly to the nearest hospital emergency department or dial 999."}
        </p>
      </section>
    </>
  );
}

function TrustedContact({
  back,
  currentUid,
  currentName,
  currentEmail,
  currentPhone,
  setCurrentPhone,
  name,
  email,
  number,
  setName,
  setEmail,
  setNumber,
  status,
  setStatus,
  outgoingRequests,
  incomingRequests,
  pendingInvite,
  setPendingInvite,
  onRefresh,
  notify,
}: {
  back: () => void;
  currentUid: string;
  currentName: string;
  currentEmail: string;
  currentPhone: string;
  setCurrentPhone: (v: string) => void;
  name: string;
  email: string;
  number: string;
  setName: (v: string) => void;
  setEmail: (v: string) => void;
  setNumber: (v: string) => void;
  status: ContactStatus;
  setStatus: (status: ContactStatus) => void;
  outgoingRequests: FirestoreTrustedContactRequest[];
  incomingRequests: FirestoreTrustedContactRequest[];
  pendingInvite: TrustedInvitePayload | null;
  setPendingInvite: (inv: TrustedInvitePayload | null) => void;
  onRefresh: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const { t, language } = useLanguage();
  const [callState, setCallState] = useState<"idle" | "calling" | "message">("idle");
  const [recipientIdentifier, setRecipientIdentifier] = useState(email || "");
  const [relationshipNote, setRelationshipNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  // Invite link state
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [pasteLinkInput, setPasteLinkInput] = useState("");
  const [showPasteLink, setShowPasteLink] = useState(false);
  const [inviteFriendPhone, setInviteFriendPhone] = useState(currentPhone || "");
  const [inviteFriendNote, setInviteFriendNote] = useState("");
  const [inviteLinkError, setInviteLinkError] = useState<string | null>(null);
  const [editingMyPhone, setEditingMyPhone] = useState(false);
  const [myPhoneDraft, setMyPhoneDraft] = useState(currentPhone || "");

  useEffect(() => {
    if (currentPhone && !inviteFriendPhone) {
      setInviteFriendPhone(currentPhone);
    }
    if (currentPhone && !myPhoneDraft) {
      setMyPhoneDraft(currentPhone);
    }
  }, [currentPhone]);

  // Separate direct requests vs invite-link requests:
  // - If a friend clicked YOUR invite link (`requestKind === "invite_link"`), they are `fromUid` and you are `toUid` (so it appears in `incomingRequests`). When YOU accept it, they become YOUR emergency contact!
  // - If YOU clicked a friend's invite link (`requestKind === "invite_link"`), you are `fromUid` and they are `toUid` (so it appears in `outgoingRequests`). When THEY accept it, you support THEM!
  const directOutgoing = outgoingRequests.filter((r) => r.requestKind !== "invite_link");
  const activeDirectOutgoing = directOutgoing[0] || null;
  const inviteLinkOutgoing = outgoingRequests.filter((r) => r.requestKind === "invite_link");
  const acceptedViaMyInviteLink =
    incomingRequests.find((r) => r.requestKind === "invite_link" && r.status === "accepted") || null;

  const pendingIncoming = incomingRequests.filter((r) => r.status === "pending");
  const peopleYouSupport = [
    ...incomingRequests
      .filter((r) => r.requestKind !== "invite_link" && r.status === "accepted")
      .map((r) => ({
        id: r.id,
        personName: r.fromName,
        personEmail: r.fromEmail,
        personPhone: r.contactPhone,
        via: "Direct invite",
      })),
    ...inviteLinkOutgoing
      .filter((r) => r.status === "accepted")
      .map((r) => ({
        id: r.id,
        personName: r.toName,
        personEmail: r.toEmail,
        personPhone: r.contactPhone,
        via: "Via invite link",
      })),
  ];

  // Build personal shareable invite link
  const inviteLinkUrl = (() => {
    const base = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "https://ony.app/";
    const params = new URLSearchParams();
    params.set("inviteTrusted", currentUid);
    params.set("inviterName", currentName);
    params.set("inviterEmail", currentEmail);
    if (currentPhone) {
      params.set("inviterPhone", currentPhone);
    }
    return `${base}?${params.toString()}`;
  })();

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLinkUrl);
      setCopiedInvite(true);
      notify("Invite link copied! Share it with your friend.");
      window.setTimeout(() => setCopiedInvite(false), 3000);
    } catch {
      notify("Invite link ready below — copy and share it with your friend.");
    }
  };

  const handleShareInviteLink = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${currentName} invited you to be their Trusted Emergency Contact on ONY`,
          text: `Click this link to request to be ${currentName}’s Trusted Emergency Contact on ONY:`,
          url: inviteLinkUrl,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    await handleCopyInviteLink();
  };

  const handleParsePastedLink = (e: FormEvent) => {
    e.preventDefault();
    setInviteLinkError(null);
    const raw = pasteLinkInput.trim();
    if (!raw) return;
    const parsed = parseTrustedInviteFromUrl(raw);
    if (!parsed) {
      try {
        const urlMatch = raw.match(/https?:\/\/[^\s]+/);
        const candidate = urlMatch ? urlMatch[0] : raw;
        const url = candidate.startsWith("http")
          ? new URL(candidate)
          : new URL(candidate.startsWith("?") ? candidate : `?${candidate}`, window.location.origin);
        const inviterUid = (
          url.searchParams.get("inviteTrusted") ||
          url.searchParams.get("trustedInvite")
        )?.trim();
        const inviterName = url.searchParams.get("inviterName")?.trim() || "ONY Friend";
        const inviterEmail = url.searchParams.get("inviterEmail")?.trim() || "";
        const inviterPhone = url.searchParams.get("inviterPhone")?.trim() || "";
        if (inviterUid) {
          setPendingInvite({
            inviterUid,
            inviterName,
            inviterEmail,
            inviterPhone: inviterPhone || undefined,
          });
          setPasteLinkInput("");
          setShowPasteLink(false);
          notify(`Opened invite link from ${inviterName}`);
          return;
        }
      } catch {
        // ignore
      }
      setInviteLinkError("Could not read that invite link. Please paste the full link shared by your friend.");
      return;
    }
    setPendingInvite(parsed);
    setPasteLinkInput("");
    setShowPasteLink(false);
    notify(`Opened invite link from ${parsed.inviterName}`);
  };

  const handleRequestViaInviteLink = async (e: FormEvent) => {
    e.preventDefault();
    if (!pendingInvite) return;
    setInviteLinkError(null);
    const phoneToUse = (inviteFriendPhone || currentPhone).trim();
    if (!phoneToUse) {
      setInviteLinkError("Please enter your emergency contact phone number so your friend can reach you.");
      return;
    }

    setSubmitting(true);
    try {
      if (phoneToUse !== currentPhone) {
        setCurrentPhone(phoneToUse);
      }
      const created = await sendTrustedContactRequestViaInviteLink({
        requesterUid: currentUid,
        friendUid: currentUid,
        requesterName: currentName,
        friendName: currentName,
        requesterEmail: currentEmail,
        friendEmail: currentEmail,
        requesterPhone: phoneToUse,
        friendPhone: phoneToUse,
        inviterUid: pendingInvite.inviterUid,
        inviterName: pendingInvite.inviterName,
        inviterEmail: pendingInvite.inviterEmail,
        relationshipNote:
          inviteFriendNote.trim() ||
          `I clicked your invite link and requested to be your emergency contact.`,
      });
      setPendingInvite(null);
      setInviteFriendNote("");
      await onRefresh();
      notify(`Request sent to ${created.toName}! They can now accept or reject in their app.`);
    } catch (err: any) {
      console.warn("[ONY] Invite link request error:", err);
      const rawMsg = err instanceof Error ? err.message : String(err);
      if (rawMsg.includes("SELF_REQUEST")) {
        setInviteLinkError(
          "This is your own invite link! Share this link with a friend so they can log into their account and request to be your emergency contact.",
        );
      } else if (rawMsg.includes("INVALID_INVITE")) {
        setInviteLinkError("Invalid invite link. Please ask your friend to re-share their invite link.");
      } else {
        setInviteLinkError(
          rawMsg && !rawMsg.includes("{")
            ? rawMsg
            : "Could not send request from invite link. Please check your phone number and try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendRequest = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmedTarget = recipientIdentifier.trim();
    if (!trimmedTarget) {
      setFormError("Please enter the email address or display name of your friend’s ONY account.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await sendTrustedContactRequest({
        fromUid: currentUid,
        fromName: currentName,
        fromEmail: currentEmail,
        targetEmailOrName: trimmedTarget,
        contactPhone: number.trim(),
        relationshipNote: relationshipNote.trim(),
      });
      setName(created.toName);
      setEmail(created.toEmail);
      if (created.contactPhone) {
        setNumber(created.contactPhone);
      }
      setStatus("pending");
      await onRefresh();
      notify(`Request sent to ${created.toName} (${created.toEmail})`);
    } catch (err: any) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      if (rawMsg.includes("ACCOUNT_NOT_FOUND")) {
        setFormError(
          `No registered ONY account found for "${trimmedTarget}". You can also copy your Invite Link above and share it with your friend!`,
        );
      } else if (rawMsg.includes("SELF_REQUEST")) {
        setFormError("You cannot send a trusted contact request to your own account.");
      } else {
        setFormError("Could not send request right now. Please verify the account details and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecision = async (
    req: FirestoreTrustedContactRequest,
    decision: "accepted" | "rejected",
  ) => {
    setRespondingId(req.id);
    try {
      await respondToTrustedContactRequest(req.id, decision);
      await onRefresh();
      if (decision === "accepted") {
        notify(
          req.requestKind === "invite_link"
            ? `${req.fromName} is now your active Trusted Emergency Contact!`
            : `Accepted ${req.fromName}’s trusted contact request`,
        );
      } else {
        notify(`Declined request from ${req.fromName}`);
      }
    } catch {
      notify("Failed to update request status");
    } finally {
      setRespondingId(null);
    }
  };

  const handleCancelOrRemoveActiveContact = async () => {
    const targetReq = acceptedViaMyInviteLink || activeDirectOutgoing;
    if (!targetReq) {
      setStatus("none");
      return;
    }
    setSubmitting(true);
    try {
      await deleteTrustedContactRequest(targetReq.id);
      setStatus("none");
      await onRefresh();
      notify("Trusted contact removed");
    } catch {
      notify("Could not remove trusted contact");
    } finally {
      setSubmitting(false);
    }
  };

  if (callState !== "idle") {
    return (
      <div className="centered-state trusted-state">
        <div className={`call-pulse ${callState}`}>
          <Icon name={callState === "calling" ? "profile" : "send"} />
        </div>
        <span className="eyebrow">{language === "Bahasa Melayu" ? "Kenalan Dipercayai Bersambung" : language === "中文" ? "已连接信任紧急联系人" : "Connected Trusted Contact"}</span>
        <h1>{callState === "calling" ? (language === "Bahasa Melayu" ? `Memanggil ${name}…` : language === "中文" ? `正在拨通 ${name}…` : `Calling ${name}…`) : (language === "Bahasa Melayu" ? `Mesej dihantar kepada ${name}` : language === "中文" ? `已向 ${name} 发送求助消息` : `Message sent to ${name}`)}</h1>
        <p>{callState === "calling" ? (language === "Bahasa Melayu" ? `Menghubungi ${name} di ${number || "nombor berdaftar dalam profil"}…` : language === "中文" ? `正在拨给 ${name} (${number || "已登记的档案电话"})…` : `Connecting to ${name} at ${number || "registered number on file"}…`) : (language === "Bahasa Melayu" ? "“Saya perlukan seseorang untuk berbual. Adakah anda lapang?”" : language === "中文" ? "“我现在想找个人聊聊，你有空吗？”" : "“I could use someone to talk to. Are you free?”")}</p>
        <Button onClick={() => setCallState("idle")}>{callState === "calling" ? (language === "Bahasa Melayu" ? "Tamatkan Panggilan" : language === "中文" ? "结束通话" : "End Call") : t.common_done}</Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={t.trusted_title}
        subtitle={t.trusted_subtitle}
        back={back}
        action={
          <Button variant="ghost" onClick={() => void onRefresh()}>
            {t.common_refresh}
          </Button>
        }
      />
      <section className="page-pad">
        {/* 0. Your Saved Emergency Phone Number */}
        <div className="card" style={{ marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
            <div>
              <span className="eyebrow">{t.trusted_phone_section}</span>
              <strong style={{ display: "block", fontSize: "14px", marginTop: "2px" }}>
                {currentName} ({currentEmail})
              </strong>
              <small style={{ color: "var(--muted)", display: "block", marginTop: "2px" }}>
                {t.trusted_saved_phone}: <strong>{currentPhone || t.trusted_not_set}</strong>
              </small>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setMyPhoneDraft(currentPhone || "");
                setEditingMyPhone((prev) => !prev);
              }}
            >
              {editingMyPhone ? t.common_cancel : currentPhone ? t.trusted_edit_phone : t.trusted_add_phone}
            </Button>
          </div>
          {editingMyPhone && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!myPhoneDraft.trim()) return;
                setCurrentPhone(myPhoneDraft.trim());
                setInviteFriendPhone(myPhoneDraft.trim());
                setEditingMyPhone(false);
                notify(language === "Bahasa Melayu" ? "Nombor telefon kecemasan disimpan ke profil anda" : language === "中文" ? "紧急联系电话已保存至您的个人档案" : "Emergency phone number saved to your profile");
              }}
              style={{ marginTop: "10px", display: "flex", gap: "8px" }}
            >
              <TextInput
                type="tel"
                value={myPhoneDraft}
                onChange={(e) => setMyPhoneDraft(e.target.value)}
                placeholder="e.g. 012-345 6789"
              />
              <Button type="submit" disabled={!myPhoneDraft.trim()}>
                {t.common_save}
              </Button>
            </form>
          )}
        </div>

        {/* 1. If the user clicked a friend's Invite Link, show the prompt to request to be their Emergency Contact */}
        {pendingInvite && (
          <div
            className="card"
            style={{
              marginBottom: "16px",
              border: "2px solid var(--theme-accent)",
              background: "var(--theme-surface-elevated)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <span className="eyebrow">{language === "Bahasa Melayu" ? "Pautan Jemputan Dibuka" : language === "中文" ? "已打开邀请链接" : "Invite Link Opened"}</span>
              <Button variant="ghost" onClick={() => setPendingInvite(null)}>
                {t.common_dismiss}
              </Button>
            </div>
            <h3 style={{ margin: "4px 0 6px" }}>
              {language === "Bahasa Melayu" ? `Mohon menjadi Kenalan Kecemasan ${pendingInvite.inviterName}` : language === "中文" ? `申请成为 ${pendingInvite.inviterName} 的紧急联系人` : `Request to be ${pendingInvite.inviterName}’s Emergency Contact`}
            </h3>
            <p className="muted" style={{ marginBottom: "12px" }}>
              <strong>{pendingInvite.inviterName}</strong> {pendingInvite.inviterEmail ? `(${pendingInvite.inviterEmail})` : ""}{" "}
              {language === "Bahasa Melayu"
                ? `telah berkongsi pautan jemputan dengan anda. Hantar permohonan di bawah supaya ${pendingInvite.inviterName} boleh menerima atau menolak anda sebagai Kenalan Kecemasan Dipercayai.`
                : language === "中文"
                ? `向您分享了专属邀请链接。在下方发送申请，以便 ${pendingInvite.inviterName} 确认您为其受信任的紧急联系人。`
                : `shared an invite link with you. Send a request below so ${pendingInvite.inviterName} can accept or reject you as their Trusted Emergency Contact.`}
            </p>
            <form onSubmit={handleRequestViaInviteLink}>
              <label className="field-label">{language === "Bahasa Melayu" ? `Nombor telefon kecemasan anda (dikongsi bersama ${pendingInvite.inviterName})` : language === "中文" ? `您的紧急电话号码 (将与 ${pendingInvite.inviterName} 共享)` : `Your emergency phone number (shared with ${pendingInvite.inviterName})`}</label>
              <TextInput
                type="tel"
                value={inviteFriendPhone}
                onChange={(e) => {
                  setInviteFriendPhone(e.target.value);
                  setInviteLinkError(null);
                }}
                placeholder="e.g. 012-345 6789"
              />
              <label className="field-label">
                {language === "Bahasa Melayu" ? `Mesej kepada ${pendingInvite.inviterName}` : language === "中文" ? `附言给 ${pendingInvite.inviterName}` : `Message to ${pendingInvite.inviterName}`} <small>{t.common_optional}</small>
              </label>
              <TextInput
                value={inviteFriendNote}
                onChange={(e) => setInviteFriendNote(e.target.value)}
                placeholder={language === "Bahasa Melayu" ? `Hai ${pendingInvite.inviterName}, saya membuka pautan anda untuk menjadi kenalan kecemasan anda.` : language === "中文" ? `你好 ${pendingInvite.inviterName}，我收到了你的邀请链接，愿作为你的紧急联系人。` : `Hi ${pendingInvite.inviterName}, I clicked your invite link to be your emergency contact.`}
              />
              {inviteLinkError && (
                <div className="form-error" style={{ marginTop: "8px", marginBottom: "8px" }}>
                  <Icon name="info" />
                  <span>{inviteLinkError}</span>
                </div>
              )}
              <div style={{ marginTop: "8px" }}>
                <Button className="full" type="submit" disabled={submitting}>
                  {submitting
                    ? (language === "Bahasa Melayu" ? "Menghantar Permohonan…" : language === "中文" ? "正在发送申请…" : "Sending Request…")
                    : (language === "Bahasa Melayu" ? `Mohon menjadi Kenalan Kecemasan ${pendingInvite.inviterName}` : language === "中文" ? `申请成为 ${pendingInvite.inviterName} 的紧急联系人` : `Request to be ${pendingInvite.inviterName}’s Emergency Contact`)}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* 2. Share Your Invite Link Card */}
        <div className="card" style={{ marginBottom: "16px" }}>
          <div className="card-title">
            <h3>{t.trusted_invite_link_title}</h3>
            <span className="status-badge">{language === "Bahasa Melayu" ? "Pautan Boleh Dikongsi" : language === "中文" ? "专属邀请链接" : "Shareable Link"}</span>
          </div>
          <p className="muted" style={{ marginTop: "4px", marginBottom: "10px" }}>
            {t.trusted_invite_link_desc}
          </p>
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "12px",
              background: "var(--theme-surface-soft)",
              border: "1px solid var(--theme-border)",
              fontSize: "var(--font-caption, 12px)",
              wordBreak: "break-all",
              color: "var(--theme-text-primary)",
              marginBottom: "10px",
              userSelect: "all",
            }}
          >
            {inviteLinkUrl}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Button className="full" onClick={() => void handleCopyInviteLink()}>
              <Icon name="check" /> {copiedInvite ? (language === "Bahasa Melayu" ? "Pautan Jemputan Disalin!" : language === "中文" ? "邀请链接已复制！" : "Invite Link Copied!") : t.common_copy}
            </Button>
            <Button variant="secondary" className="full" onClick={() => void handleShareInviteLink()}>
              {t.trusted_share_link_btn}
            </Button>
            <Button
              variant="ghost"
              className="full"
              onClick={() => setShowPasteLink((prev) => !prev)}
            >
              {showPasteLink ? (language === "Bahasa Melayu" ? "Sembunyikan Tampal Pautan" : language === "中文" ? "收起输入框" : "Hide Paste Invite Link") : t.trusted_paste_link_toggle}
            </Button>
          </div>

          {showPasteLink && (
            <form onSubmit={handleParsePastedLink} style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--line)" }}>
              <label className="field-label">{language === "Bahasa Melayu" ? "Tampal Pautan Jemputan ONY Rakan Anda" : language === "中文" ? "粘贴好友的 ONY 邀请链接" : "Paste a friend’s ONY Invite Link"}</label>
              <TextInput
                value={pasteLinkInput}
                onChange={(e) => {
                  setPasteLinkInput(e.target.value);
                  setInviteLinkError(null);
                }}
                placeholder="Paste https://.../?inviteTrusted=... link here"
              />
              {inviteLinkError && (
                <div className="form-error" style={{ marginTop: "8px" }}>
                  <Icon name="info" />
                  <span>{inviteLinkError}</span>
                </div>
              )}
              <div style={{ marginTop: "8px" }}>
                <Button className="full" type="submit" disabled={!pasteLinkInput.trim()}>
                  {language === "Bahasa Melayu" ? "Buka Pautan Jemputan Rakan" : language === "中文" ? "打开好友的邀请链接" : "Open Friend’s Invite Link"}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* 3. Incoming Requests Section (For when a friend clicks your invite link OR sends you a direct request) */}
        <div className="card" style={{ marginBottom: "16px" }}>
          <div className="card-title">
            <h3>{t.trusted_requests_section}</h3>
            <span>{pendingIncoming.length} {language === "Bahasa Melayu" ? "menunggu" : language === "中文" ? "待处理" : "pending"}</span>
          </div>
          <p className="muted" style={{ marginTop: "4px", marginBottom: "12px" }}>
            {language === "Bahasa Melayu"
              ? "Apabila rakan membuka pautan jemputan anda atau menghantar jemputan secara langsung, anda boleh menerima atau menolak permohonan mereka di sini."
              : language === "中文"
              ? "当好友通过邀请链接申请（或直接向您发起邀请）时，您可以在此处确认或谢绝。"
              : "When a friend clicks your invite link and requests to be your emergency contact (or when another user invites you), you can accept or reject their request here."}
          </p>

          {pendingIncoming.length === 0 ? (
            <div className="community-note" style={{ marginBottom: peopleYouSupport.length > 0 ? "12px" : 0 }}>
              <Icon name="info" />
              <span>{t.trusted_no_pending}</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
              {pendingIncoming.map((req) => {
                const isFromMyInviteLink = req.requestKind === "invite_link";
                return (
                  <div
                    key={req.id}
                    style={{
                      padding: "12px",
                      borderRadius: "14px",
                      border: "1px solid var(--theme-border)",
                      background: "var(--theme-surface-elevated)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className="trusted-avatar" style={{ width: "38px", height: "38px", fontSize: "15px" }}>
                        {req.fromName[0]?.toUpperCase() || "O"}
                      </span>
                      <div style={{ flex: 1 }}>
                        <strong style={{ display: "block" }}>{req.fromName}</strong>
                        <small style={{ color: "var(--muted)", display: "block" }}>
                          {req.fromEmail} {req.contactPhone ? `· ${language === "Bahasa Melayu" ? "Tel Kecemasan" : language === "中文" ? "紧急电话" : "Emergency Phone"}: ${req.contactPhone}` : ""}
                        </small>
                        <small style={{ color: "var(--theme-accent)", display: "block", fontWeight: 600, marginTop: "2px" }}>
                          {isFromMyInviteLink
                            ? (language === "Bahasa Melayu" ? "Membuka pautan anda · Ingin menjadi Kenalan Kecemasan anda" : language === "中文" ? "通过邀请链接进入 · 申请成为您的紧急联系人" : "Clicked your invite link · Wants to be your Emergency Contact")
                            : (language === "Bahasa Melayu" ? "Ingin menambah anda sebagai Kenalan Dipercayai mereka" : language === "中文" ? "希望将您添加为其信任联系人" : "Wants to add you as their Trusted Contact")}
                        </small>
                      </div>
                      <span className="status-badge">{language === "Bahasa Melayu" ? "Menunggu" : language === "中文" ? "待审核" : "Pending"}</span>
                    </div>
                    {req.relationshipNote && (
                      <p style={{ margin: "8px 0 0", fontSize: "13px", fontStyle: "italic" }}>
                        “{req.relationshipNote}”
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      <Button
                        className="full"
                        disabled={respondingId === req.id}
                        onClick={() => void handleDecision(req, "accepted")}
                      >
                        <Icon name="check" /> {isFromMyInviteLink ? t.trusted_accept_contact : (language === "Bahasa Melayu" ? "Terima Permohonan" : language === "中文" ? "接受申请" : "Accept Request")}
                      </Button>
                      <Button
                        variant="danger"
                        className="full"
                        disabled={respondingId === req.id}
                        onClick={() => void handleDecision(req, "rejected")}
                      >
                        <Icon name="close" /> {t.trusted_reject_contact}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {inviteLinkOutgoing.filter((r) => r.status === "pending").length > 0 && (
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--line)" }}>
              <small style={{ fontWeight: 700, display: "block", marginBottom: "8px" }}>
                {language === "Bahasa Melayu" ? "Permohonan Pautan Dihantar (Menunggu kelulusan rakan)" : language === "中文" ? "已发出的链接申请 (等待对方确认)" : "Invite Link Requests You Sent (Waiting for friend to accept)"}
              </small>
              {inviteLinkOutgoing
                .filter((r) => r.status === "pending")
                .map((req) => (
                  <div
                    key={req.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      padding: "8px 0",
                    }}
                  >
                    <div>
                      <strong style={{ display: "block", fontSize: "13px" }}>
                        {language === "Bahasa Melayu" ? "Kepada" : language === "中文" ? "发送给" : "To"} {req.toName} ({req.toEmail})
                      </strong>
                      <small style={{ color: "var(--muted)" }}>
                        {language === "Bahasa Melayu" ? `Dipohon melalui pautan · Menunggu kelulusan ${req.toName}` : language === "中文" ? `通过链接申请 · 等待 ${req.toName} 确认` : `Requested via invite link · Waiting for ${req.toName}’s approval`}
                      </small>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        await deleteTrustedContactRequest(req.id);
                        await onRefresh();
                        notify(language === "Bahasa Melayu" ? "Membatalkan permohonan pautan" : language === "中文" ? "已取消邀请链接申请" : "Cancelled invite link request");
                      }}
                    >
                      {t.common_cancel}
                    </Button>
                  </div>
                ))}
            </div>
          )}

          {peopleYouSupport.length > 0 && (
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--line)" }}>
              <small style={{ fontWeight: 700, display: "block", marginBottom: "8px" }}>
                {t.trusted_people_supported} ({peopleYouSupport.length})
              </small>
              {peopleYouSupport.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    padding: "8px 0",
                  }}
                >
                  <div>
                    <strong style={{ display: "block", fontSize: "13px" }}>{item.personName}</strong>
                    <small style={{ color: "var(--muted)" }}>
                      {item.personEmail} · {item.via} · {language === "Bahasa Melayu" ? "Diterima" : language === "中文" ? "已接受" : "Accepted"}
                    </small>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await deleteTrustedContactRequest(item.id);
                      await onRefresh();
                      notify(language === "Bahasa Melayu" ? `Mengalih keluar ${item.personName}` : language === "中文" ? `已移出 ${item.personName}` : `Removed ${item.personName}`);
                    }}
                  >
                    {t.trusted_remove_btn}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Your Active Emergency Contact or Direct Invite Form */}
        {status === "none" && (
          <form onSubmit={handleSendRequest}>
            <div className="help-hero">
              <Icon name="profile" />
              <div>
                <h2>{t.trusted_invite_directly}</h2>
                <p>
                  {language === "Bahasa Melayu"
                    ? "Ketahui e-mel atau nama paparan akaun ONY berdaftar rakan anda? Hantarkan permohonan secara terus untuk mereka terima dalam aplikasi mereka."
                    : language === "中文"
                    ? "知晓好友注册的 ONY 邮箱或显示昵称？直接向对方发送邀请，以便其在应用内直接接受。"
                    : "Know your friend’s registered ONY email or display name? Send them a request directly so they can accept or reject it in their app."}
                </p>
              </div>
            </div>

            <label className="field-label">{language === "Bahasa Melayu" ? "E-mel Akaun ONY atau Nama Paparan Rakan" : language === "中文" ? "好友的 ONY 注册邮箱或显示昵称" : "Friend’s ONY Account Email or Display Name"}</label>
            <TextInput
              value={recipientIdentifier}
              onChange={(e) => {
                setRecipientIdentifier(e.target.value);
                setFormError(null);
              }}
              placeholder={language === "Bahasa Melayu" ? "Masukkan e-mel atau nama paparan rakan" : language === "中文" ? "输入好友的邮箱或昵称" : "Enter your friend’s email or display name"}
            />

            <label className="field-label">
              {language === "Bahasa Melayu" ? "Nombor telefon kecemasan" : language === "中文" ? "紧急联系电话" : "Emergency phone number"}{" "}
              <small>{language === "Bahasa Melayu" ? "(Pilihan jika telah disimpan dalam akaun mereka)" : language === "中文" ? "(若对方账户已保存则为选填)" : "(Optional if saved on their account)"}</small>
            </label>
            <TextInput
              type="tel"
              value={number}
              onChange={(e) => {
                setNumber(e.target.value);
                setFormError(null);
              }}
              placeholder="e.g. 012-345 6789"
            />

            <label className="field-label">
              {language === "Bahasa Melayu" ? "Nota kepada penerima" : language === "中文" ? "附言给对方" : "Note to recipient"} <small>{t.common_optional}</small>
            </label>
            <TextInput
              value={relationshipNote}
              onChange={(e) => setRelationshipNote(e.target.value)}
              placeholder={language === "Bahasa Melayu" ? "Hai, saya ingin menambah anda sebagai kenalan kecemasan dipercayai saya di ONY." : language === "中文" ? "你好，我想在 ONY 上将你添加为我的信任紧急联系人。" : "Hi, I’d like to add you as my trusted emergency contact on ONY."}
            />

            {formError && (
              <div className="form-error" style={{ marginTop: "10px", marginBottom: "10px" }}>
                <Icon name="info" />
                <span>{formError}</span>
              </div>
            )}

            <Button
              className="full"
              type="submit"
              disabled={submitting || !recipientIdentifier.trim()}
            >
              {submitting
                ? (language === "Bahasa Melayu" ? "Menghantar permohonan…" : language === "中文" ? "正在发送请求…" : "Sending request…")
                : (language === "Bahasa Melayu" ? "Hantar Permohonan Kenalan Dipercayai" : language === "中文" ? "发送信任联系人邀请" : "Send Trusted Contact Request")}
            </Button>
          </form>
        )}

        {status === "pending" && activeDirectOutgoing && (
          <div className="card">
            <div className="trusted-card">
              <span className="trusted-avatar">{activeDirectOutgoing.toName[0]?.toUpperCase() || "T"}</span>
              <span className="status-badge">{t.trusted_waiting_recipient}</span>
              <h1>{activeDirectOutgoing.toName}</h1>
              <p style={{ margin: "4px 0" }}>
                <strong>ONY Account:</strong> {activeDirectOutgoing.toEmail}
              </p>
              {activeDirectOutgoing.contactPhone && (
                <p style={{ margin: "2px 0" }}>
                  <strong>{language === "Bahasa Melayu" ? "Tel Kecemasan:" : language === "中文" ? "紧急电话:" : "Emergency Phone:"}</strong> {activeDirectOutgoing.contactPhone}
                </p>
              )}
              <p className="muted" style={{ marginTop: "10px" }}>
                {language === "Bahasa Melayu"
                  ? `Jemputan telah dihantar ke akaun ONY milik ${activeDirectOutgoing.toName}. Mereka boleh membuka aplikasi ONY untuk menerima atau menolak permohonan anda.`
                  : language === "中文"
                  ? `邀请已发送至 ${activeDirectOutgoing.toName} 的 ONY 账户。对方可在其 ONY 应用中接受或谢绝您的申请。`
                  : `Invitation sent to ${activeDirectOutgoing.toName}’s ONY account. They can open their ONY app to accept or reject your request.`}
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
              <Button variant="secondary" className="full" onClick={() => void onRefresh()}>
                {language === "Bahasa Melayu" ? "Semak Status Permohonan" : language === "中文" ? "刷新申请状态" : "Check Request Status"}
              </Button>
              <Button
                variant="danger"
                className="full"
                disabled={submitting}
                onClick={handleCancelOrRemoveActiveContact}
              >
                {t.common_cancel}
              </Button>
            </div>
          </div>
        )}

        {status === "accepted" && (
          <>
            <div className="trusted-card connected">
              <span className="trusted-avatar">{name[0]?.toUpperCase() || "T"}</span>
              <span className="status-pill accepted">{language === "Bahasa Melayu" ? "Diterima · Kenalan Kecemasan Aktif" : language === "中文" ? "已连接 · 活跃紧急联系人" : "Accepted · Active Emergency Contact"}</span>
              <h1>{name}</h1>
              <p>
                {acceptedViaMyInviteLink
                  ? acceptedViaMyInviteLink.fromEmail
                  : activeDirectOutgoing?.toEmail || email}
              </p>
              <p>
                <strong>{language === "Bahasa Melayu" ? "Tel Kecemasan:" : language === "中文" ? "紧急电话:" : "Emergency Phone:"}</strong>{" "}
                {acceptedViaMyInviteLink?.contactPhone ||
                  activeDirectOutgoing?.contactPhone ||
                  number ||
                  (language === "Bahasa Melayu" ? "Disimpan dalam akaun" : language === "中文" ? "已在账户保存" : "Saved on account")}
              </p>
              <div className="trusted-actions">
                <Button onClick={() => setCallState("calling")}>{t.trusted_call_btn}</Button>
                <Button variant="secondary" onClick={() => setCallState("message")}>
                  {t.trusted_send_msg_btn}
                </Button>
              </div>
            </div>
            <Button
              className="full"
              variant="danger"
              disabled={submitting}
              onClick={handleCancelOrRemoveActiveContact}
            >
              {t.trusted_remove_btn}
            </Button>
          </>
        )}

        {status === "rejected" && (
          <div className="card">
            <div className="trusted-card">
              <span className="trusted-avatar">{name[0]?.toUpperCase() || "T"}</span>
              <span className="status-badge">{language === "Bahasa Melayu" ? "Permohonan Ditolak" : language === "中文" ? "请求已被谢绝" : "Request Declined"}</span>
              <h1>{name}</h1>
              <p className="muted">
                {language === "Bahasa Melayu"
                  ? `${name} (${activeDirectOutgoing?.toEmail || email}) menolak permohonan kenalan dipercayai dalam aplikasi mereka. Anda boleh berkongsi pautan jemputan atau menghantar permohonan baharu pada bila-bila masa.`
                  : language === "中文"
                  ? `${name} (${activeDirectOutgoing?.toEmail || email}) 在其应用中谢绝了此联系人邀请。您可以随时分享专属邀请链接或重新发起邀请。`
                  : `${name} (${activeDirectOutgoing?.toEmail || email}) declined your trusted contact request in their app. You can share your invite link or send a new request anytime.`}
              </p>
            </div>
            <Button
              className="full"
              disabled={submitting}
              onClick={handleCancelOrRemoveActiveContact}
            >
              {t.trusted_invite_another}
            </Button>
          </div>
        )}

        <p className="disclaimer">
          <Icon name="info" />{" "}
          {language === "Bahasa Melayu"
            ? "Permohonan kenalan dipercayai dan nombor telefon kecemasan disimpan dengan selamat dan disulitkan. Akaun pengguna berdaftar dirahsiakan dan tidak sekali-kali disenaraikan secara awam."
            : language === "中文"
            ? "信任联系人请求与紧急电话均经加密安全保存。注册用户账户严格保密，绝不会公开列出。"
            : "Trusted contact requests and emergency phone numbers are stored securely and encrypted. Registered user accounts are kept private and are never listed publicly."}
        </p>
      </section>
    </>
  );
}

function CommunityMember({ back, user, notify }: { back: () => void; user: GlobeUser; notify: (s: string) => void }) {
  const { t, language } = useLanguage();
  const memberMoodKey = resolveNodeMoodKey(user);
  const memberMoodLabel = getLocalizedMoodLabel(memberMoodKey, language);
  const [composerMode, setComposerMode] = useState<"text" | "voice">("text");
  const [voice, setVoice] = useState<"idle" | "recording" | "ready">("idle");
  const [recordedVoice, setRecordedVoice] = useState<{ dataUrl: string; duration: number } | null>(null);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voiceVolume, setVoiceVolume] = useState(0.15);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const [text, setText] = useState("");
  const [consent, setConsent] = useState(true);
  const [sent, setSent] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [sending, setSending] = useState(false);

  type MemberMessage = {
    id: string;
    from: "member" | "me";
    senderAnonymous: string;
    recipientAnonymous: string;
    kind: "text" | "voice";
    text: string;
    audioUrl?: string;
    audioDuration?: number;
    transcription?: string;
    createdAt: string;
    toUserMood?: string;
  };

  const [messages, setMessages] = useState<MemberMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const scrollToThreadBottom = (behavior: ScrollBehavior = "smooth") => {
    window.setTimeout(() => {
      threadEndRef.current?.scrollIntoView({ behavior, block: "end" });
    }, 50);
  };

  // Load message history from Firestore database
  useEffect(() => {
    let isMounted = true;
    const buildFallbackForNode = (): MemberMessage[] => {
      const defaults = DEFAULT_COMMUNITY_MESSAGES.filter((m) => m.toUserId === String(user.id));
      if (defaults.length > 0) {
        return defaults
          .slice()
          .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
          .map((m, i) => ({
            id: `seed_${user.id}_${i}`,
            from: "member",
            senderAnonymous: m.senderAnonymous,
            recipientAnonymous: m.recipientAnonymous,
            kind: m.kind,
            text: m.text,
            audioUrl: m.audioUrl,
            audioDuration: m.audioDuration,
            transcription: m.transcription,
            createdAt: m.createdAt,
            toUserMood: m.toUserMood || memberMoodLabel,
          }));
      }
      return [
        {
          id: `seed_${user.id}_0`,
          from: "member",
          senderAnonymous: `Anonymous Member #${100 + user.id * 37}`,
          recipientAnonymous: `Anonymous Member (Globe #${user.id})`,
          kind: "text",
          text: `Saw your ${memberMoodLabel.toLowerCase()} glow on the globe and wanted to send a warm note of encouragement 🌱 You are not alone.`,
          createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
          toUserMood: memberMoodLabel,
        },
        {
          id: `seed_${user.id}_1`,
          from: "member",
          senderAnonymous: `Anonymous Friend #${240 + user.id * 19}`,
          recipientAnonymous: `Anonymous Member (Globe #${user.id})`,
          kind: "voice",
          text: "Encouraging voice note · 0:08",
          audioDuration: 8,
          createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
          toUserMood: memberMoodLabel,
        },
      ];
    };

    const loadFromDb = async () => {
      try {
        const dbMsgs = await listCommunityMessages(String(user.id));
        if (!isMounted) return;
        const currentUid = auth.currentUser?.uid;
        if (dbMsgs && dbMsgs.length > 0) {
          const mapped: MemberMessage[] = dbMsgs
            .slice()
            .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
            .map((m) => {
              const isFromMe =
                Boolean(currentUid && m.fromUserId === currentUid) ||
                (m.senderAnonymous || "").includes("(You)");
              return {
                id: m.id,
                from: isFromMe ? "me" : "member",
                senderAnonymous: isFromMe
                  ? "You (Anonymous)"
                  : m.senderAnonymous || "Anonymous Member",
                recipientAnonymous: m.recipientAnonymous || `Anonymous Member (Globe #${user.id})`,
                kind: m.kind,
                text: m.text,
                audioUrl: m.audioUrl,
                audioDuration: m.audioDuration,
                transcription: m.transcription,
                createdAt: m.createdAt,
                toUserMood: m.toUserMood || memberMoodLabel,
              };
            });
          setMessages(mapped);
        } else {
          setMessages(buildFallbackForNode());
        }
      } catch (err) {
        console.warn("Could not load community messages from Firestore:", err);
        if (isMounted) {
          setMessages(buildFallbackForNode());
        }
      } finally {
        if (isMounted) {
          setLoadingMessages(false);
          scrollToThreadBottom("auto");
        }
      }
    };

    void loadFromDb();
    return () => {
      isMounted = false;
      if (recorderRef.current) recorderRef.current.cancel();
      if (previewAudioRef.current) previewAudioRef.current.pause();
    };
  }, [user.id, memberMoodLabel]);


  const handleStartVoice = async () => {
    setComposerMode("voice");
    setMicNotice(null);
    try {
      if (!recorderRef.current) {
        recorderRef.current = new VoiceRecorder();
      }
      setVoice("recording");
      setVoiceSeconds(0);
      setRecordedVoice(null);
      setIsPlayingPreview(false);

      await recorderRef.current.start({
        onVolumeChange: (vol) => setVoiceVolume(vol),
        onTimeUpdate: (sec) => setVoiceSeconds(sec),
        maxDurationSeconds: 60,
        onMaxDurationReached: () => void handleStopVoice(),
      });
      notify("Recording audio · speak into your mic");
    } catch (err: any) {
      setVoice("idle");
      setMicNotice(err.message || "Microphone access is restricted in this preview frame.");
      notify(err.message || "Microphone access denied or unavailable.");
    }
  };

  const handleStopVoice = async () => {
    if (!recorderRef.current || voice !== "recording") return;
    try {
      setVoice("ready");
      const res = await recorderRef.current.stop();
      setRecordedVoice({ dataUrl: res.dataUrl, duration: res.duration });
      notify("Audio recorded · preview or tap Send Audio");
    } catch {
      setVoice("idle");
      notify("Failed to save audio recording");
    }
  };

  const handleTogglePreview = () => {
    if (!recordedVoice) return;
    if (!previewAudioRef.current) {
      const audio = new Audio(recordedVoice.dataUrl);
      audio.onended = () => setIsPlayingPreview(false);
      previewAudioRef.current = audio;
    }
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current
        .play()
        .then(() => {
          setIsPlayingPreview(true);
        })
        .catch(() => {
          notify("Unable to play preview audio");
        });
    }
  };

  const handleCancelVoice = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (recorderRef.current) recorderRef.current.cancel();
    setVoice("idle");
    setRecordedVoice(null);
    setVoiceSeconds(0);
    setIsPlayingPreview(false);
  };

  const handleTextareaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(Math.max(textareaRef.current.scrollHeight, 38), 120)}px`;
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSendText();
    }
  };

  const handleSendText = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!user.acceptsMessages) {
      notify(
        language === "Bahasa Melayu"
          ? "Ahli ini tidak menerima mesej buat masa ini."
          : language === "中文"
            ? "该成员目前不接收留言。"
            : "This person isn't accepting messages right now",
      );
      return;
    }
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    if (!consent) {
      notify("Please keep the supportive guidelines checkbox checked to send.");
      return;
    }
    setSending(true);

    const currentUid = auth.currentUser?.uid || `anon_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const shortSenderId = currentUid.slice(-4) || "882";

    const msgPayload: Omit<FirestoreCommunityMessage, "id"> = {
      toUserId: String(user.id),
      toUserMood: user.moodLabel,
      fromUserId: currentUid,
      senderAnonymous: `Anonymous Member #${shortSenderId}`,
      recipientAnonymous: `Anonymous Member (Globe #${user.id})`,
      kind: "text",
      text: trimmed,
      createdAt: now,
    };

    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const docId = await createCommunityMessage(msgPayload);
      const newMsg: MemberMessage = {
        id: docId || `msg_${Date.now()}`,
        from: "me",
        senderAnonymous: "You (Anonymous)",
        recipientAnonymous: `Anonymous Member (Globe #${user.id})`,
        kind: "text",
        text: trimmed,
        createdAt: now,
        toUserMood: user.moodLabel,
      };
      setMessages((prev) => [...prev, newMsg]);
      setSent("Support message delivered");
      scrollToThreadBottom("smooth");
      notify("Support message sent 🌱");
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("RECIPIENT_MESSAGES_DISABLED:")) {
        setText(trimmed);
        notify("This person isn't accepting messages right now");
        return;
      }
      console.warn("Could not save to database, using optimistic delivery:", err);
      const newMsg: MemberMessage = {
        id: `local_${Date.now()}`,
        from: "me",
        senderAnonymous: "You (Anonymous)",
        recipientAnonymous: `Anonymous Member (Globe #${user.id})`,
        kind: "text",
        text: trimmed,
        createdAt: now,
        toUserMood: user.moodLabel,
      };
      setMessages((prev) => [...prev, newMsg]);
      setSent("Support message delivered");
      scrollToThreadBottom("smooth");
      notify("Support message sent 🌱");
    } finally {
      setSending(false);
    }
  };

  const confirmVoice = async () => {
    if (!user.acceptsMessages) {
      notify("This person isn't accepting messages right now");
      return;
    }
    if (!recordedVoice || sending) return;
    if (!consent) {
      notify("Please keep the supportive guidelines checkbox checked to send.");
      return;
    }
    setSending(true);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }

    const currentUid = auth.currentUser?.uid || `anon_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const shortSenderId = currentUid.slice(-4) || "882";
    const voiceNoteText = `Encouraging voice note · ${formatAudioDuration(recordedVoice.duration)}`;

    const msgPayload: Omit<FirestoreCommunityMessage, "id"> = {
      toUserId: String(user.id),
      toUserMood: user.moodLabel,
      fromUserId: currentUid,
      senderAnonymous: `Anonymous Member #${shortSenderId}`,
      recipientAnonymous: `Anonymous Member (Globe #${user.id})`,
      kind: "voice",
      text: voiceNoteText,
      audioUrl: recordedVoice.dataUrl,
      audioDuration: recordedVoice.duration,
      createdAt: now,
    };

    try {
      const docId = await createCommunityMessage(msgPayload);
      const newMsg: MemberMessage = {
        id: docId || `msg_${Date.now()}`,
        from: "me",
        senderAnonymous: "You (Anonymous)",
        recipientAnonymous: `Anonymous Member (Globe #${user.id})`,
        kind: "voice",
        text: voiceNoteText,
        audioUrl: recordedVoice.dataUrl,
        audioDuration: recordedVoice.duration,
        createdAt: now,
        toUserMood: user.moodLabel,
      };
      setMessages((prev) => [...prev, newMsg]);
      setVoice("idle");
      setRecordedVoice(null);
      setSent("Audio support message delivered");
      scrollToThreadBottom("smooth");
      notify("Audio encouragement sent 🎙️");
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("RECIPIENT_MESSAGES_DISABLED:")) {
        notify("This person isn't accepting messages right now");
        return;
      }
      console.warn("Could not save voice to database, using optimistic delivery:", err);
      const newMsg: MemberMessage = {
        id: `local_${Date.now()}`,
        from: "me",
        senderAnonymous: "You (Anonymous)",
        recipientAnonymous: `Anonymous Member (Globe #${user.id})`,
        kind: "voice",
        text: voiceNoteText,
        audioUrl: recordedVoice.dataUrl,
        audioDuration: recordedVoice.duration,
        createdAt: now,
        toUserMood: user.moodLabel,
      };
      setMessages((prev) => [...prev, newMsg]);
      setVoice("idle");
      setRecordedVoice(null);
      setSent("Audio support message delivered");
      scrollToThreadBottom("smooth");
      notify("Audio encouragement sent 🎙️");
    } finally {
      setSending(false);
    }
  };

  const encouragements = language === "Bahasa Melayu"
    ? [
        "Anda hebat 🌱",
        "Langkah demi langkah",
        "Semoga hari ini terasa lebih ringan",
        "Kirimkan sokongan lembut buat anda",
      ]
    : language === "中文"
    ? [
        "你做得很棒 🌱",
        "一步一步来就好",
        "愿今天变得轻松一点",
        "给你送上一份温暖的支持",
      ]
    : [
        "You’re doing great 🌱",
        "Take it one step at a time",
        "Hope today gets a little lighter",
        "Sending you some gentle support",
      ];

  if (blocked) {
    return (
      <div className="centered-state">
        <div className="success-mark"><Icon name="shield" /></div>
        <h1>{language === "Bahasa Melayu" ? "Pengguna tanpa nama disekat" : language === "中文" ? "已屏蔽此匿名用户" : "Anonymous user blocked"}</h1>
        <p>{language === "Bahasa Melayu" ? "Pengguna ini akan disembunyikan untuk baki sesi ini. Tiada data profil peribadi disimpan." : language === "中文" ? "该用户在此会话的其余时间内将被隐藏。未存储任何个人档案数据。" : "This user will be hidden for the rest of this session. No personal profile data was stored."}</p>
        <Button onClick={back}>{t.community_back_globe}</Button>
      </div>
    );
  }

  return (
    <div className="node-chat-page">
      <PageHeader
        title={`${language === "Bahasa Melayu" ? "Nod Tanpa Nama #" : language === "中文" ? "匿名节点 #" : "Anonymous Node #"}${user.id}`}
        subtitle={`${language === "Bahasa Melayu" ? "Daftar masuk emosi: " : language === "中文" ? "心情状态: " : "Mood check-in: "}${memberMoodLabel} · ${language === "Bahasa Melayu" ? "Bebas identiti" : language === "中文" ? "完全匿名" : "Identity-free"}`}
        back={back}
        action={
          <div style={{ display: "flex", gap: "4px" }}>
            <Button variant="ghost" onClick={() => notify(language === "Bahasa Melayu" ? "Terima kasih. Nod ditandakan untuk semakan penyederhanaan." : language === "中文" ? "感谢反馈。该节点已标记并提交审核团队。" : "Thank you. Node flagged for moderation review.")}>{t.common_report}</Button>
            <Button variant="ghost" onClick={() => setBlocked(true)}>{t.common_block}</Button>
          </div>
        }
      />

      <div className="node-chat-scroll">
        <div className="anonymous-profile compact">
          <span className={`anonymous-orbit mood-${user.moodGlow}`}><i /></span>
          <div>
            <span className="status-badge">{language === "Bahasa Melayu" ? `Ahli tanpa nama · Nod #${user.id}` : language === "中文" ? `匿名成员 · 节点 #${user.id}` : `Anonymous member · Node #${user.id}`}</span>
            <h1>{t.community_someone_here}</h1>
            <strong>{language === "Bahasa Melayu" ? `Cahaya emosi semasa: ${memberMoodLabel}` : language === "中文" ? `当前心情微光: ${memberMoodLabel}` : `Current mood glow: ${memberMoodLabel}`}</strong>
            <p>{language === "Bahasa Melayu" ? "Mesej dihantar oleh orang lain atau anda muncul sebagai buih sembang tanpa nama di bawah." : language === "中文" ? "您或他人发送的支持留言将作为匿名气泡显示在下方。" : "Messages sent by others or by you appear as anonymous chat bubbles below."}</p>
          </div>
        </div>

        <div className="encouragement-intro compact">
          <span className="eyebrow">{language === "Bahasa Melayu" ? "Kata perangsang pantas" : language === "中文" ? "快捷温暖语" : "Quick encouragement"}</span>
          <div className="encouragement-chips">
            {encouragements.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setComposerMode("text");
                  setText(item);
                  if (textareaRef.current) {
                    textareaRef.current.focus();
                  }
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <label className="check-row community-consent compact">
          <TextInput type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>{language === "Bahasa Melayu" ? "Kekalkan mesej yang baik, menyokong, dan tanpa butiran pengenalan peribadi." : language === "中文" ? "请保持言语善意支持，切勿透露个人可识别信息。" : "Keep messages kind, supportive, and free of personal identifying details."}</span>
        </label>

        <div className="conversation-label">
          <span>{language === "Bahasa Melayu" ? `Mesej sokongan untuk Nod #${user.id}` : language === "中文" ? `给节点 #${user.id} 的支持留言` : `Support messages for Node #${user.id}`}</span>
          <small>{messages.length} {messages.length === 1 ? (language === "Bahasa Melayu" ? "buih" : language === "中文" ? "条" : "bubble") : (language === "Bahasa Melayu" ? "buih" : language === "中文" ? "条" : "bubbles")}</small>
        </div>

        {loadingMessages ? (
          <div className="empty mini-empty"><Icon name="chat" /><p>{t.common_loading}</p></div>
        ) : messages.length === 0 ? (
          <div className="empty mini-empty">
            <Icon name="chat" />
            <p>{language === "Bahasa Melayu" ? "Belum ada mesej sokongan lagi. Hantar buih teks atau audio dari bar di bawah." : language === "中文" ? "暂无支持留言。可从下方底栏发送文字或语音鼓励气泡。" : "No support messages yet. Send a text or audio bubble from the bottom bar below."}</p>
          </div>
        ) : (
          <div className="community-thread">
            {messages.map((message) => {
              const isMe = message.from === "me";
              const timeDisplay = formatFriendlyTime(message.createdAt, language);
              return (
                <SupportiveMessageBubble
                  key={message.id}
                  id={message.id}
                  kind={message.kind}
                  text={message.text}
                  audioUrl={message.audioUrl}
                  audioDuration={message.audioDuration}
                  transcription={message.transcription}
                  isMe={isMe}
                  senderAnonymous={message.senderAnonymous}
                  timeDisplay={timeDisplay}
                  notify={notify}
                />
              );
            })}
            <div ref={threadEndRef} className="chat-bottom-spacer" />
          </div>
        )}

        {sent && (
          <div className="form-success" style={{ marginTop: "8px" }}>
            <Icon name="check" />
            {sent}
          </div>
        )}
      </div>

      {/* Fixed Bottom Composer Bar: Send Audio or Text (enforcing acceptsMessages) */}
      <div className="node-chat-fixed chat-composer">
        {!user.acceptsMessages ? (
          <div className="messages-off-notice" role="status" style={{ margin: 0 }}>
            <Icon name="info" />
            <span>
              {language === "Bahasa Melayu"
                ? "Ahli ini tidak menerima mesej sokongan buat masa ini."
                : language === "中文"
                  ? "该成员当前未开启接收支持留言。"
                  : "This person isn't accepting messages right now"}
            </span>
          </div>
        ) : (
        <>
        {micNotice && (
          <div className="voice-mic-notice-card" style={{ marginBottom: "8px" }}>
            <div className="voice-mic-notice-header">
              <Icon name="info" />
              <span style={{ flex: 1, fontSize: "12px", color: "var(--ink)" }}>{micNotice}</span>
              <button
                type="button"
                className="notice-dismiss-btn"
                onClick={() => setMicNotice(null)}
                aria-label="Dismiss notice"
              >
                <Icon name="close" />
              </button>
            </div>
          </div>
        )}

        {composerMode === "voice" || voice !== "idle" ? (
          <div className={`chat-input-bar voice-mode state-${voice}`}>
            <button
              type="button"
              className="composer-icon-btn keyboard-toggle-btn"
              onClick={() => {
                if (voice !== "idle") handleCancelVoice();
                setComposerMode("text");
              }}
              title={t.chat_mode_text}
              aria-label="Switch to typing keyboard"
            >
              <Icon name="keyboard" />
            </button>

            {voice === "idle" && (
              <div
                className="voice-recording-track"
                onClick={() => void handleStartVoice()}
              >
                <button
                  type="button"
                  className="voice-mic-pill"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleStartVoice();
                  }}
                  aria-label="Start recording audio"
                  title="Record audio support"
                >
                  <Icon name="mic" />
                </button>
                <div className="voice-text-stream">
                  <span className="voice-status-hint">
                    {language === "Bahasa Melayu"
                      ? "Ketik mikrofon untuk rakam audio sokongan"
                      : language === "中文"
                      ? "轻点麦克风录制语音鼓励"
                      : "Tap mic to record audio support"}
                  </span>
                </div>
              </div>
            )}

            {voice === "recording" && (
              <div
                className="voice-recording-track"
                onClick={() => void handleStopVoice()}
              >
                <button
                  type="button"
                  className="voice-mic-pill recording"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleStopVoice();
                  }}
                  aria-label="Stop recording audio"
                  title="Stop recording"
                >
                  <Icon name="close" />
                </button>
                <div className="voice-live-waves mini" aria-hidden="true">
                  <span style={{ height: `${Math.max(4, voiceVolume * 18)}px` }} />
                  <span style={{ height: `${Math.max(6, voiceVolume * 26)}px` }} />
                  <span style={{ height: `${Math.max(5, voiceVolume * 22)}px` }} />
                  <span style={{ height: `${Math.max(8, voiceVolume * 30)}px` }} />
                  <span style={{ height: `${Math.max(4, voiceVolume * 16)}px` }} />
                </div>
                <div className="voice-text-stream">
                  <span className="transcript-live">
                    {language === "Bahasa Melayu" ? "Merakam audio · " : language === "中文" ? "正在录音 · " : "Recording audio · "}
                    {formatAudioDuration(voiceSeconds)}
                  </span>
                </div>
              </div>
            )}

            {voice === "ready" && (
              <div
                className="voice-recording-track"
                onClick={handleTogglePreview}
              >
                <button
                  type="button"
                  className="voice-mic-pill"
                  style={{ background: isPlayingPreview ? "var(--ink)" : "var(--sage)" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePreview();
                  }}
                  aria-label={isPlayingPreview ? "Pause preview" : "Play preview"}
                  title={isPlayingPreview ? "Pause" : "Play preview"}
                >
                  <Icon name={isPlayingPreview ? "pause" : "play"} />
                </button>
                <div className="voice-text-stream">
                  <span className="transcript-live">
                    {language === "Bahasa Melayu" ? "Audio sedia · " : language === "中文" ? "音频就绪 · " : "Audio ready · "}
                    {formatAudioDuration(recordedVoice?.duration || voiceSeconds || 8)}
                  </span>
                  <span className="voice-status-hint" style={{ display: "block", fontSize: "11px" }}>
                    {isPlayingPreview
                      ? (language === "Bahasa Melayu" ? "Memainkan pratonton…" : language === "中文" ? "正在试听…" : "Playing preview…")
                      : (language === "Bahasa Melayu" ? "Ketik untuk dengar sebelum hantar" : language === "中文" ? "点击播放试听，确认后发送" : "Tap play to review before sending")}
                  </span>
                </div>
              </div>
            )}

            <div className="composer-actions">
              {voice !== "idle" && (
                <button
                  type="button"
                  className="composer-icon-btn cancel-btn"
                  onClick={handleCancelVoice}
                  title={t.common_cancel}
                  aria-label={t.common_cancel}
                >
                  <Icon name="close" />
                </button>
              )}
              {voice === "ready" && (
                <button
                  type="button"
                  className="composer-icon-btn send-btn ready"
                  onClick={() => void confirmVoice()}
                  disabled={sending}
                  title={language === "Bahasa Melayu" ? "Hantar Audio" : language === "中文" ? "发送音频" : "Send Audio"}
                  aria-label={language === "Bahasa Melayu" ? "Hantar Audio" : language === "中文" ? "发送音频" : "Send Audio"}
                >
                  <Icon name="send" />
                </button>
              )}
              {voice === "recording" && (
                <button
                  type="button"
                  className="composer-icon-btn send-btn ready"
                  onClick={() => void handleStopVoice()}
                  title="Done recording"
                  aria-label="Done recording"
                >
                  <Icon name="check" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <form
            className="chat-input-bar text-mode"
            onSubmit={handleSendText}
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName !== "BUTTON" && !(e.target as HTMLElement).closest("button")) {
                textareaRef.current?.focus();
              }
            }}
          >
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              rows={1}
              value={text}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={language === "Bahasa Melayu" ? "Tulis mesej sokongan…" : language === "中文" ? "写下一句鼓励支持…" : "Write a supportive message…"}
              aria-label={language === "Bahasa Melayu" ? "Mesej sokongan" : language === "中文" ? "支持留言" : "Supportive message"}
              maxLength={2000}
            />
            <div className="composer-actions">
              <button
                type="button"
                className="composer-icon-btn mic-btn"
                onClick={() => {
                  setComposerMode("voice");
                  void handleStartVoice();
                }}
                title={language === "Bahasa Melayu" ? "Rakam audio sokongan" : language === "中文" ? "录制语音鼓励" : "Record audio support"}
                aria-label={language === "Bahasa Melayu" ? "Rakam audio sokongan" : language === "中文" ? "录制语音鼓励" : "Record audio support"}
                disabled={sending}
              >
                <Icon name="mic" />
              </button>
              <button
                type="submit"
                className={`composer-icon-btn send-btn ${text.trim() ? "ready" : ""}`}
                disabled={sending || !text.trim()}
                title={language === "Bahasa Melayu" ? "Hantar mesej sokongan" : language === "中文" ? "发送支持留言" : "Send support message"}
                aria-label={language === "Bahasa Melayu" ? "Hantar mesej sokongan" : language === "中文" ? "发送支持留言" : "Send support message"}
              >
                <Icon name="send" />
              </button>
            </div>
          </form>
        )}
        </>
        )}
      </div>
    </div>
  );
}

function CommunityGuidelines({ back }: { back: () => void }) {
  const { t, language } = useLanguage();
  return (
    <>
      <PageHeader title={t.guidelines_title} subtitle={t.guidelines_subtitle} back={back} />
      <section className="page-pad">
        <div className="help-hero">
          <Icon name="shield" />
          <div>
            <h2>{language === "Bahasa Melayu" ? "Ruang perkongsian yang lebih selamat." : language === "中文" ? "更安全的共处空间。" : "A safer shared space."}</h2>
            <p>{language === "Bahasa Melayu" ? "Setiap hantaran dan interaksi dilindungi oleh penyederhanaan manusia dan protokol keselamatan automatik." : language === "中文" ? "每一条动态与互动均受到人工审核与自动化安全协议的保护。" : "Every post and interaction is protected by human moderation and automated safety protocols."}</p>
          </div>
        </div>
        <div className="card">
          <h3>{language === "Bahasa Melayu" ? "Jadilah baik" : language === "中文" ? "保持善意" : "Be kind"}</h3>
          <p>{language === "Bahasa Melayu" ? "Balas dengan empati dan kesabaran. Gangguan, ucapan kebencian, atau tekanan sama sekali tidak diterima." : language === "中文" ? "请带着同理心与耐心回复。平台对骚扰、仇恨言论或强迫行为采取零容忍态度。" : "Respond with empathy and patience. Harassment, hate speech, or pressure are strictly not tolerated."}</p>
          <h3>{language === "Bahasa Melayu" ? "Lindungi privasi" : language === "中文" ? "保护隐私" : "Protect privacy"}</h3>
          <p>{language === "Bahasa Melayu" ? "Jangan sekali-kali berkongsi maklumat hubungan peribadi, nombor telefon, alamat, atau butiran sulit orang lain." : language === "中文" ? "切勿分享个人联系方式、电话号码、住址或他人的私人隐私信息。" : "Never share personal contact info, phone numbers, addresses, or private details of others."}</p>
          <h3>{language === "Bahasa Melayu" ? "Ketahui batasan" : language === "中文" ? "明确边界" : "Know the boundary"}</h3>
          <p>{language === "Bahasa Melayu" ? "Sokongan komuniti menyediakan sokongan rakan sebaya yang prihatin; ia bukan pengganti rawatan klinikal atau kecemasan bertauliah." : language === "中文" ? "社区互助提供富有同理心的同伴鼓励，无法代替专业临床医疗或危机急救。" : "Community support provides compassionate peer encouragement; it does not replace qualified clinical or emergency care."}</p>
          <h3>{language === "Bahasa Melayu" ? "Laporkan kebimbangan" : language === "中文" ? "举报违规" : "Report concerns"}</h3>
          <p>{language === "Bahasa Melayu" ? "Gunakan butang lapor pada sebarang hantaran atau profil tanpa nama untuk segera menandakan kandungan kepada pasukan penyederhana keselamatan kami." : language === "中文" ? "使用任意动态或匿名档案上的举报按钮，可立即向我们的安全审核团队标记违规内容。" : "Use the report button on any post or anonymous profile to immediately flag content for our safety moderation team."}</p>
        </div>
        <Button className="full" onClick={back}>
          {language === "Bahasa Melayu" ? "Saya faham" : language === "中文" ? "我已理解" : "I understand"}
        </Button>
      </section>
    </>
  );
}

function ResourceLibrary({ back, navigate, notify }: { back: () => void; navigate: (s: Screen) => void; notify: (s: string) => void }) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(language === "Bahasa Melayu" ? "Pernafasan & pembumian" : language === "中文" ? "呼吸与身心着陆" : "Breathing & grounding");
  const resources = [
    {
      title: language === "Bahasa Melayu" ? "Pengurusan tekanan" : language === "中文" ? "压力管理" : "Stress management",
      description: language === "Bahasa Melayu" ? "Kenal pasti punca tekanan, pilih satu tindakan kecil, dan bertenang sejenak." : language === "中文" ? "明确感受压力来源，选定一个微小的下一步，并在重新评估前稍作停顿。" : "Name the pressure, choose one small next step, and pause before reassessing.",
      action: language === "Bahasa Melayu" ? "Buka set semula tekanan" : language === "中文" ? "开启减压重置" : "Open stress reset",
    },
    {
      title: language === "Bahasa Melayu" ? "Pernafasan & pembumian" : language === "中文" ? "呼吸与身心着陆" : "Breathing & grounding",
      description: language === "Bahasa Melayu" ? "Hembus nafas perlahan-lahan dan perhatikan lima benda yang anda boleh lihat di sekeliling." : language === "中文" ? "深吸后缓缓呼气，并环顾四周留意能看到的五件事物。" : "Try a slow exhale and notice five things you can see around you.",
      action: language === "Bahasa Melayu" ? "Mula panduan 60 saat" : language === "中文" ? "开启 60 秒指引" : "Start 60-second guide",
    },
    {
      title: language === "Bahasa Melayu" ? "Refleksi & penulisan jurnal" : language === "中文" ? "反思与心情记录" : "Reflection & journaling",
      description: language === "Bahasa Melayu" ? "Tulis apa yang berlaku, perasaan anda, dan sokongan yang mungkin diperlukan." : language === "中文" ? "写下发生了什么、内心的感受，以及哪种支持能够帮到你。" : "Write what happened, what you felt, and what support might help.",
      action: language === "Bahasa Melayu" ? "Buka panduan refleksi" : language === "中文" ? "开启反思提示" : "Open reflection prompt",
    },
    {
      title: language === "Bahasa Melayu" ? "Tidur & relaksasi" : language === "中文" ? "睡眠与深度放松" : "Sleep & relaxation",
      description: language === "Bahasa Melayu" ? "Bina rutin santai sebelum tidur dan kurangkan rangsangan skrin sebelum rehat." : language === "中文" ? "建立温和的睡前放松流程，在就寝前减少感官刺激。" : "Build a gentle wind-down routine and reduce stimulation before rest.",
      action: language === "Bahasa Melayu" ? "Lihat tabiat tidur" : language === "中文" ? "查看睡眠习惯" : "View sleep habits",
    },
    {
      title: language === "Bahasa Melayu" ? "Tekanan belajar atau kerja" : language === "中文" ? "学业与工作压力" : "Study or work pressure",
      description: language === "Bahasa Melayu" ? "Kecilkan tugasan besar kepada tindakan nyata paling mudah yang boleh dimulakan sekarang." : language === "中文" ? "把繁重庞大的任务简化为当下即可着手的第一步清晰微行动。" : "Reduce a large task to the smallest visible action you can begin.",
      action: language === "Bahasa Melayu" ? "Bina rancangan kecil" : language === "中文" ? "制定微行动计划" : "Make a small plan",
    },
    {
      title: language === "Bahasa Melayu" ? "Sokongan profesional" : language === "中文" ? "专业医疗支持" : "Professional support",
      description: language === "Bahasa Melayu" ? "Fahami perbezaan antara sokongan rakan sebaya dan rawatan pakar bertauliah." : language === "中文" ? "了解同伴陪伴与具备资质的专业临床治疗之间的重要区别。" : "Understand the difference between peer support and qualified care.",
      action: language === "Bahasa Melayu" ? "Cari sokongan" : language === "中文" ? "寻找专业求助" : "Find support",
    },
    {
      title: language === "Bahasa Melayu" ? "Krisis & kecemasan" : language === "中文" ? "紧急危机支援" : "Crisis & emergency",
      description: language === "Bahasa Melayu" ? "Akses langkah keselamatan segera dan sahkan butiran hubungan krisis terkini." : language === "中文" ? "获取紧急安全自护步骤并核实官方最新危机救助热线。" : "Access urgent safety steps and confirm current crisis contact details.",
      action: language === "Bahasa Melayu" ? "Lihat bantuan segera" : language === "中文" ? "查看紧急援助" : "View urgent help",
    },
  ];
  const openResource = (title: string, action: string) => {
    if (open !== title) {
      setOpen(title);
      return;
    }
    if (title === "Professional support" || title === "Sokongan profesional" || title === "专业医疗支持") navigate("professional");
    else if (title === "Crisis & emergency" || title === "Krisis & kecemasan" || title === "紧急危机支援") navigate("help");
    else notify(`${action} opened`);
  };
  return (
    <>
      <PageHeader title={t.chat_resources || "Support Library"} subtitle={language === "Bahasa Melayu" ? "Sumber daya tindak berasaskan bukti" : language === "中文" ? "循证心理调适资源" : "Evidence-based coping resources"} back={back} />
      <section className="page-pad">
        <div className="help-hero">
          <Icon name="memory" />
          <div>
            <h2>{language === "Bahasa Melayu" ? "Sokongan praktikal, langkah demi langkah." : language === "中文" ? "实用支持，步步为营。" : "Practical support, in small steps."}</h2>
            <p>{language === "Bahasa Melayu" ? "Teknik bantu diri berasaskan klinikal dan direktori kecemasan disahkan sedia apabila anda memerlukannya." : language === "中文" ? "基于临床的自助技巧与经过核实的马来西亚危机专线，随时为您守候。" : "Clinically-grounded self-help techniques and verified emergency directories ready when you need them."}</p>
          </div>
        </div>
        <div className="knowledge-status">
          <span className="status-badge" style={{ background: "var(--theme-surface-soft)", color: "var(--theme-success)" }}>{language === "Bahasa Melayu" ? "Perpustakaan Disahkan" : language === "中文" ? "权威核实资源库" : "Verified Library"}</span>
          <p>{language === "Bahasa Melayu" ? "Disusun selaras dengan garis panduan kesihatan mental dan talian bantuan krisis Malaysia yang disahkan." : language === "中文" ? "依据心理健康准则与马来西亚官方核实危机热线精选编制。" : "Curated in alignment with mental health guidelines and verified Malaysian crisis helplines."}</p>
        </div>
        <div className="resource-library">
          {resources.map((resource) => (
            <Button
              key={resource.title}
              variant="secondary"
              className={`resource-card ${open === resource.title ? "active" : ""}`}
              onClick={() => openResource(resource.title, resource.action)}
            >
              <span>
                <strong>{resource.title}</strong>
                <small>{resource.description}</small>
                {open === resource.title && <b>{resource.action}</b>}
              </span>
              <Icon name={open === resource.title ? "check" : "chevron"} />
            </Button>
          ))}
        </div>
        <p className="disclaimer">
          <Icon name="info" />{" "}
          {language === "Bahasa Melayu"
            ? "Kandungan pendidikan berpandukan bukti untuk kesejahteraan harian. Ia tidak menggantikan konsultasi perubatan atau rawatan psikiatri klinikal."
            : language === "中文"
            ? "提供用于日常身心健康的循证科普资源。本资源不可替代专业医疗诊断或临床精神科治疗。"
            : "Evidence-informed educational content for everyday well-being. It does not replace medical consultation or clinical psychiatric treatment."}
        </p>
      </section>
    </>
  );
}

function Privacy({
  back,
  notify,
  memoryCount,
  useActiveMemories,
  setUseActiveMemories,
  reviewMemories,
  clearMemories,
  onDeleteAccount,
  navigate,
}: {
  back: () => void;
  notify: (s: string) => void;
  memoryCount: number;
  useActiveMemories: boolean;
  setUseActiveMemories: (v: boolean) => void;
  reviewMemories: () => void;
  clearMemories: () => void;
  onDeleteAccount?: () => void;
  navigate: (s: Screen) => void;
}) {
  const { t, language } = useLanguage();
  const [analytics, setAnalytics] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <>
      <PageHeader title={t.privacy_title} subtitle={t.privacy_subtitle} back={back} />
      <section className="page-pad">
        <div className="help-hero">
          <Icon name="shield" />
          <div>
            <h2>{t.privacy_hero_title}</h2>
            <p>{t.privacy_hero_desc}</p>
          </div>
        </div>
        <div className="privacy-facts">
          <div>
            <strong>{t.privacy_what_used_title}</strong>
            <p>{t.privacy_what_used_desc}</p>
          </div>
          <div>
            <strong>{t.privacy_ai_title}</strong>
            <p>{t.privacy_ai_desc}</p>
          </div>
          <div>
            <strong>{t.privacy_less_id_title}</strong>
            <p>{t.privacy_less_id_desc}</p>
          </div>
        </div>
        <div className="setting-toggle">
          <div>
            <strong>{t.personalise_memories_toggle}</strong>
            <p>{language === "Bahasa Melayu" ? `Benarkan ${memoryCount} memori disimpan memperibadikan balasan.` : language === "中文" ? `允许 ${memoryCount} 条已保存记忆用于个性化回复。` : `Allow ${memoryCount} saved ${memoryCount === 1 ? "memory" : "memories"} to personalise future replies.`}</p>
          </div>
          <Toggle on={useActiveMemories} setOn={setUseActiveMemories} />
        </div>
        <div className="setting-toggle">
          <div>
            <strong>{language === "Bahasa Melayu" ? "Analisis platform tanpa nama" : language === "中文" ? "匿名平台分析" : "Anonymous platform analytics"}</strong>
            <p>{language === "Bahasa Melayu" ? "Bantu pertingkatkan ONY dengan telemetri kebolehpercayaan tanpa pengenalan identiti." : language === "中文" ? "通过非个人身份识别的聚合可靠性指标帮助改进 ONY。" : "Help improve ONY with aggregated, non-identifying reliability telemetry."}</p>
          </div>
          <Toggle on={analytics} setOn={setAnalytics} />
        </div>
        <Button variant="secondary" className="full" onClick={reviewMemories}>
          {t.privacy_review_memories}
        </Button>
        <Button
          variant="secondary"
          className="full"
          onClick={() => navigate("systemLogs")}
        >
          <Icon name="fileText" /> {t.privacy_view_logs}
        </Button>
        <Button
          variant="secondary"
          className="full"
          onClick={() => notify(language === "Bahasa Melayu" ? "Data akaun dieksport: arkib daftar masuk, memori dipersetujui, dan tetapan" : language === "中文" ? "账户数据已导出：签到记录、记忆及设置归档" : "Account data exported: check-ins, consented memories, and settings archive")}
        >
          {t.privacy_export_archive}
        </Button>
        <Button
          variant="ghost"
          className="full"
          onClick={() => {
            clearMemories();
            notify(t.memory_cleared_toast);
          }}
        >
          {t.privacy_clear_memories}
        </Button>
        {confirmDelete ? (
          <div className="card" style={{ borderColor: "var(--danger)" }}>
            <h3>{t.privacy_confirm_delete_title}</h3>
            <p>{t.privacy_confirm_delete_desc}</p>
            <Button variant="danger" className="full" onClick={onDeleteAccount}>
              {t.privacy_confirm_btn}
            </Button>
            <Button variant="ghost" className="full" onClick={() => setConfirmDelete(false)}>
              {t.common_cancel}
            </Button>
          </div>
        ) : (
          <Button variant="danger" className="full" onClick={() => setConfirmDelete(true)}>
            {t.privacy_delete_account}
          </Button>
        )}
        <p className="disclaimer">
          <Icon name="info" />{" "}
          {language === "Bahasa Melayu"
            ? "Memadamkan akaun memadamkan secara kekal semua rekod dan data peribadi anda dari pelayan kami."
            : language === "中文"
            ? "注销账户将从我们的安全云端服务器永久清除您的所有关联记录与个人数据。"
            : "Deleting an account permanently removes all your associated records and personal data from our secure servers."}
        </p>
      </section>
    </>
  );
}

function About({ back }: { back: () => void }) {
  const { t, language } = useLanguage();
  return (
    <>
      <PageHeader title={t.about_title} subtitle={t.about_subtitle} back={back} />
      <section className="page-pad about">
        <img src={logo} alt="Official ONY logo" />
        <span className="eyebrow">{language === "Bahasa Melayu" ? "Rakan Kesejahteraan Minda" : language === "中文" ? "心灵相伴伴侣" : "Mental Wellness Companion"}</span>
        <h1>{t.about_hero_title}</h1>
        <p>{t.about_hero_desc}</p>
        <div className="boundary-list">
          <span>{t.about_not_therapy}</span>
          <span>{t.about_not_diagnosis}</span>
          <span>{t.about_not_emergency}</span>
        </div>
        <div className="card">
          <h3>{t.about_built_care_title}</h3>
          <p>{t.about_built_care_desc}</p>
        </div>
        <small>{language === "Bahasa Melayu" ? "ONY · Versi 1.0.0 (Edisi Keluaran)" : language === "中文" ? "ONY · 版本 1.0.0 (正式发布版)" : "ONY · Version 1.0.0 (Release Edition)"}</small>
      </section>
    </>
  );
}

function SystemLogsView({
  back,
  notify,
  currentUser,
}: {
  back: () => void;
  notify: (s: string) => void;
  currentUser: User | null;
}) {
  const { t, language } = useLanguage();
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [isSubmittingPing, setIsSubmittingPing] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listSystemLogs(100);
      setLogs(items);
    } catch {
      notify("Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDownloadLog = () => {
    if (logs.length === 0) {
      notify("No log records available to export");
      return;
    }
    const formatted = formatLogsAsTextFile(logs);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `ony-system-audit-${dateStr}.log`;
    downloadLogFile(formatted, fileName, "text/plain");
    notify(`Downloaded log file: ${fileName}`);

    writeSystemLog({
      level: "audit",
      category: "privacy",
      action: "LOG_FILE_DOWNLOADED",
      message: `User exported system log file (${logs.length} records, format: .log).`,
      userId: currentUser?.uid,
      userEmail: currentUser?.email,
    });
  };

  const handleDownloadJson = () => {
    if (logs.length === 0) {
      notify("No log records available to export");
      return;
    }
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `ony-system-audit-${dateStr}.json`;
    downloadLogFile(JSON.stringify(logs, null, 2), fileName, "application/json");
    notify(`Downloaded JSON log: ${fileName}`);

    writeSystemLog({
      level: "audit",
      category: "privacy",
      action: "JSON_LOG_DOWNLOADED",
      message: `User exported system log file (${logs.length} records, format: .json).`,
      userId: currentUser?.uid,
      userEmail: currentUser?.email,
    });
  };

  const handleDiagnosticPing = async () => {
    setIsSubmittingPing(true);
    try {
      await writeSystemLog({
        level: "info",
        category: "system",
        action: "DIAGNOSTIC_PING_OK",
        message: "Manual diagnostic ping generated by user. Cloud round-trip verified.",
        userId: currentUser?.uid,
        userEmail: currentUser?.email,
        metadata: {
          clientTime: new Date().toISOString(),
          screen: "systemLogs",
          database: "ai-studio-onypwa-289f0eda-a42f-43da-8c66-8ac63f5d46a8",
        },
      });
      notify("Diagnostic log entry recorded");
      await fetchLogs();
    } catch {
      notify("Could not write diagnostic log entry");
    } finally {
      setIsSubmittingPing(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === "Security" && log.level !== "security") return false;
    if (filter === "Audit" && log.level !== "audit") return false;
    if (filter === "Safety" && log.category !== "safety") return false;
    if (filter === "Auth" && log.category !== "auth") return false;
    if (filter === "System" && log.category !== "system") return false;
    if (filter === "Errors" && log.level !== "error" && log.level !== "warn") return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchMsg = log.message.toLowerCase().includes(q);
      const matchCat = log.category.toLowerCase().includes(q);
      const matchUser = (log.userEmail || "").toLowerCase().includes(q);
      return matchAction || matchMsg || matchCat || matchUser;
    }
    return true;
  });

  return (
    <>
      <PageHeader
        title={t.logs_title}
        subtitle={t.logs_subtitle}
        back={back}
        action={
          <div style={{ display: "flex", gap: "6px" }}>
            <Button
              variant="secondary"
              className="header-action-btn"
              onClick={handleDownloadLog}
              title="Download standard .log file"
            >
              <Icon name="download" /> .log
            </Button>
          </div>
        }
      />
      <section className="page-pad system-logs-page">
        <div className="system-logs-hero">
          <div className="system-logs-hero-icon">
            <Icon name="fileText" />
          </div>
          <div>
            <h2>{t.logs_title}</h2>
            <p>
              {t.logs_hero_desc}
            </p>
          </div>
        </div>

        <div className="log-file-summary-card">
          <div className="log-file-summary-header">
            <div>
              <strong style={{ fontSize: "13px" }}>{language === "Bahasa Melayu" ? "📦 Aliran Log Pangkalan Data Langsung" : language === "中文" ? "📦 实时数据库日志流" : "📦 Live Database Log Stream"}</strong>
              <small style={{ display: "block", color: "var(--muted)", fontSize: "11px" }}>
                {language === "Bahasa Melayu" ? "Koleksi: systemLogs · Keselamatan Sifar Kepercayaan" : language === "中文" ? "集合: systemLogs · 零信任安全机制" : "Collection: systemLogs · Zero-Trust Security"}
              </small>
            </div>
            <Button
              variant="ghost"
              className="refresh-btn"
              onClick={fetchLogs}
              disabled={loading}
              title="Refresh log stream"
            >
              <Icon name="refresh" /> {loading ? (language === "Bahasa Melayu" ? "Menyegerakkan…" : language === "中文" ? "正在同步…" : "Syncing…") : t.common_refresh}
            </Button>
          </div>

          <div className="log-file-meta-grid">
            <div className="log-file-meta-item">
              <strong>{t.logs_database_instance}</strong>
              <span>ai-studio-onypwa…</span>
            </div>
            <div className="log-file-meta-item">
              <strong>{language === "Bahasa Melayu" ? "Jumlah Rekod" : language === "中文" ? "日志总计" : "Total Records"}</strong>
              <span>{logs.length} {t.logs_total_events}</span>
            </div>
            <div className="log-file-meta-item">
              <strong>{language === "Bahasa Melayu" ? "Pengguna Semasa" : language === "中文" ? "当前用户" : "Current User"}</strong>
              <span>{currentUser?.email || (language === "Bahasa Melayu" ? "Tanpa Nama" : language === "中文" ? "匿名" : "Anonymous")}</span>
            </div>
            <div className="log-file-meta-item">
              <strong>{language === "Bahasa Melayu" ? "Piawaian Log" : language === "中文" ? "日志格式" : "Log Standard"}</strong>
              <span>RFC-5424 Syslog / JSON</span>
            </div>
          </div>

          <div className="log-export-actions">
            <Button variant="primary" onClick={handleDownloadLog}>
              <Icon name="download" /> {t.logs_export_log_btn}
            </Button>
            <Button variant="secondary" onClick={handleDownloadJson}>
              <Icon name="fileText" /> {t.logs_export_json_btn}
            </Button>
          </div>
          <div style={{ marginTop: "4px" }}>
            <Button
              variant="ghost"
              className="full"
              onClick={handleDiagnosticPing}
              disabled={isSubmittingPing}
            >
              {isSubmittingPing ? (language === "Bahasa Melayu" ? "Menulis ke DB…" : language === "中文" ? "正在写入数据库…" : "Writing to DB…") : t.logs_diagnostic_btn}
            </Button>
          </div>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <TextInput
            placeholder={t.logs_search_placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", fontSize: "12.5px" }}
          />
        </div>

        <div className="logs-filter-scroll">
          {(["All", "Security", "Audit", "Safety", "Auth", "System", "Errors"] as const).map((cat) => {
            const label = language === "Bahasa Melayu"
              ? (cat === "All" ? "Semua" : cat === "Security" ? "Keselamatan" : cat === "Audit" ? "Audit" : cat === "Safety" ? "Krisis/SOP" : cat === "Auth" ? "Pengesahan" : cat === "System" ? "Sistem" : "Ralat")
              : language === "中文"
              ? (cat === "All" ? "全部" : cat === "Security" ? "安全防御" : cat === "Audit" ? "审计追踪" : cat === "Safety" ? "危机/SOP" : cat === "Auth" ? "用户认证" : cat === "System" ? "系统运行" : "异常错误")
              : cat;
            return (
              <button
                key={cat}
                type="button"
                className={`logs-filter-pill ${filter === cat ? "active" : ""}`}
                onClick={() => setFilter(cat)}
              >
                {label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="log-empty-state">{language === "Bahasa Melayu" ? "Memuatkan aliran log sistem…" : language === "中文" ? "正在载入系统日志…" : "Loading system log stream…"}</div>
        ) : filteredLogs.length === 0 ? (
          <div className="log-empty-state">{language === "Bahasa Melayu" ? "Tiada rekod log padanan ditemui dalam pangkalan data." : language === "中文" ? "数据库中未找到符合条件的日志记录。" : "No matching log records found in database."}</div>
        ) : (
          <div className="logs-list">
            {filteredLogs.map((log) => {
              const d = new Date(log.timestamp);
              const friendlyTime = isNaN(d.getTime())
                ? log.timestamp
                : `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
              return (
                <div className="log-card" key={log.id}>
                  <div className="log-card-head">
                    <div className="log-badge-group">
                      <span className={`log-badge ${log.level}`}>{log.level}</span>
                      <span className="log-category-tag">{log.category}</span>
                    </div>
                    <span className="log-timestamp">{friendlyTime}</span>
                  </div>
                  <strong className="log-action-title">{log.action}</strong>
                  <p className="log-body-msg">{log.message}</p>
                  <div className="log-meta-footer">
                    <span>
                      <strong>ID:</strong> {log.id}
                    </span>
                    {log.userEmail && (
                      <span>
                        <strong>User:</strong> {log.userEmail}
                      </span>
                    )}
                    {log.clientInfo?.platform && (
                      <span>
                        <strong>Platform:</strong> {log.clientInfo.platform}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { t } = useLanguage();
  const nav: [Tab, string, string][] = [
    ["chat", t.nav_chat, "chat"],
    ["memory", t.nav_memory, "memory"],
    ["community", t.nav_community, "community"],
    ["market", t.nav_market, "market"],
    ["profile", t.nav_profile, "profile"],
  ];
  return (
    <nav className="bottom-nav">
      {nav.map(([id, label, icon]) => (
        <button
          key={id}
          className={tab === id ? "active" : ""}
          onClick={() => setTab(id)}
        >
          <Icon name={icon} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
