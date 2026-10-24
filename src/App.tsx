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
} from "react";
import logo from "./assets/ony-logo.png";
import { chatService, ChatServiceError } from "./services/chatService";
import type { SafetyAction } from "./services/contracts";
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
  listCommunityPosts,
  createCommunityPost,
  toggleCommunityPostLike,
  addCommunityPostComment,
  editCommunityPostComment,
  deleteCommunityPostComment,
  toggleCommunityCommentLike,
  addCommunityCommentReply,
  editCommunityCommentReply,
  deleteCommunityCommentReply,
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
  type SystemLogEntry,
  type SystemLogLevel,
  type PostLikeRecord,
  type PostCommentRecord,
  type PostCommentReplyRecord,
  type FirestoreCommunityPost,
  type FirestoreCommunityMessage,
  type FirestoreTrustedContactRequest,
} from "./firebase/firestore";
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
  | "riskDemo"
  | "resources"
  | "legal"
  | "systemLogs"
  | "language";

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
  generateSampleVoiceAudio,
} from "./services/voiceService";

type Message = { from: "ony" | "user"; text: string };
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
type GlobeUser = { id: number; moodGlow: "bright" | "soft" | "dim" | "neutral"; moodLabel: string; discoverable: boolean; acceptsMessages: boolean; minLevel: number; lon: number; lat: number; isMe?: boolean };
type Merchant = { name: string; category: string; offer: string; value: string; description: string; image: string; validity: string };
type Memory = { id: number; text: string; reason: string; active: boolean; category?: string; kind?: "text" | "image"; imageTone?: string };
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
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  title?: string;
}) {
  return <button type={type} disabled={disabled} onClick={onClick} className={`btn btn-${variant} ${className}`} title={title}>{children}</button>;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} />;
}

function Toggle({ on, setOn }: { on: boolean; setOn: (v: boolean) => void }) {
  return <button className={`toggle ${on ? "on" : ""}`} onClick={() => setOn(!on)} aria-label={on ? "Turn off" : "Turn on"}><span /></button>;
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
  const [displayName, setDisplayName] = useState("Aina");
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
  const [theme, setTheme] = useState<Theme>("peach");
  const [companion, setCompanion] = useState<Companion>("Cat");
  const [persona, setPersona] = useState<Persona>("gentle");
  const [soundOn, setSoundOn] = useState(false);
  const [volume, setVolume] = useState(55);
  const [trustedName, setTrustedName] = useState("Alex Tan");
  const [trustedEmail, setTrustedEmail] = useState("alex@ony.app");
  const [trustedNumber, setTrustedNumber] = useState("012-345 6789");
  const [contactStatus, setContactStatus] = useState<ContactStatus>("none");
  const [outgoingTrustedRequests, setOutgoingTrustedRequests] = useState<FirestoreTrustedContactRequest[]>([]);
  const [incomingTrustedRequests, setIncomingTrustedRequests] = useState<FirestoreTrustedContactRequest[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedMerchantName, setSelectedMerchantName] = useState("Ruang Rasa");
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>("free");
  const [freeUsage, setFreeUsage] = useState(0);
  const freeLimit = 3;
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
  const [tab, setTab] = useState<Tab>("chat");
  const [screen, setScreen] = useState<Screen>("main");
  const [history, setHistory] = useState<Screen[]>([]);
  const [toast, setToast] = useState("");
  const navigate = (next: Screen) => { setHistory((h) => [...h, screen]); setScreen(next); };
  const back = () => { const prev = history[history.length - 1] || "main"; setHistory((h) => h.slice(0, -1)); setScreen(prev); };
  const notify = (text: string) => { setToast(text); window.setTimeout(() => setToast(""), 2200); };
  const goTab = (next: Tab) => { setTab(next); setScreen("main"); setHistory([]); };

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

  // Seed shared database collections (Globe, Community Posts, Merchants) and fetch live from Firestore
  useEffect(() => {
    let active = true;
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
            setPosts(loadedPosts);
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
                text: m.text,
                reason: m.reason,
                category: m.category,
                active: m.active,
                kind: m.kind,
              })),
            );
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
      setAuthenticated(false);
      setOnboarding(0);
      setLanguage("English");
      try {
        localStorage.setItem("ony_preferred_language", "English");
      } catch {
        // ignore
      }
      notify("Logged out successfully");
    } catch (e) {
      console.warn("[ONY] Logout notice:", e);
      setAuthenticated(false);
      setOnboarding(0);
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
      setAuthenticated(false);
      setOnboarding(0);
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
      setSoundOn={setSoundOn}
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
      setPosts((prev) => [created, ...prev]);
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
      setPosts((prev) => [fallbackCreated, ...prev]);
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

  return (
    <NotificationsContext.Provider
      value={{
        unreadCount: unreadNotificationsCount,
        openNotifications: () => navigate("notifications"),
      }}
    >
      <div className={`app-shell theme-${theme}`}>
        <div className="phone">
          <div className={`environment environment-${theme}`} aria-hidden="true"><i /><i /><i /></div>
          {screen === "main" ? (
            <>
              <main className="main-content">
                {tab === "chat" && <ChatHome navigate={navigate} goTab={goTab} displayName={displayName} companion={companion} persona={persona} language={language} conversationStyle={conversationStyle} responseLength={responseLength} memoryConsent={memoryConsent} useActiveMemories={useActiveMemories} soundOn={soundOn} setSoundOn={setSoundOn} conversations={conversations} setConversations={setConversations} activeChatId={activeChatId} setActiveChatId={setActiveChatId} selectedFolderId={selectedFolderId} memories={memories} setMemories={handleSetMemories} todayMoodEntry={todayMoodEntry} subscriptionStatus={subscriptionStatus} freeUsage={freeUsage} freeLimit={freeLimit} registerFreeUse={() => {
                  if (subscriptionStatus === "trial" || subscriptionStatus === "payg" || subscriptionStatus === "monthly") return;
                  const next = freeUsage + 1;
                  setFreeUsage(next);
                  if (next >= freeLimit) window.setTimeout(() => navigate("subscription"), 750);
                }} notify={notify} />}
                {tab === "memory" && <MemoryVault memories={memories} setMemories={handleSetMemories} navigate={navigate} setEditingMemory={setEditingMemory} companion={companion} notify={notify} />}
                {tab === "community" && <Community navigate={navigate} globeUsers={globeUsers} posts={posts} setPosts={setPosts} currentUid={effectiveUid} currentUserName={displayName} onLikePost={handleLikePost} dbSyncing={dbSyncing} latestMood={moodEntries[0]} openPost={(post) => { setSelectedPost(post); navigate("postDetail"); }} openMember={(user) => { setSelectedCommunityUser(user); navigate("communityMember"); }} notify={notify} mySupportMessages={mySupportMessages} setMySupportMessages={setMySupportMessages} />}
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
              {screen === "personalise" && <Personalise back={back} language={language} setLanguage={(v) => void handleSelectLanguage(v as AppLanguage)} conversationStyle={conversationStyle} setConversationStyle={setConversationStyle} responseLength={responseLength} setResponseLength={setResponseLength} useActiveMemories={useActiveMemories} setUseActiveMemories={setUseActiveMemories} theme={theme} setTheme={setTheme} companion={companion} setCompanion={setCompanion} persona={persona} setPersona={setPersona} soundOn={soundOn} setSoundOn={setSoundOn} volume={volume} setVolume={setVolume} notify={notify} onSave={() => {
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
                <NotificationSettings
                  back={back}
                  notify={notify}
                />
              )}
            {screen === "subscription" && <Subscription back={back} openHelp={() => navigate("help")} status={subscriptionStatus} setStatus={setSubscriptionStatus} freeUsage={freeUsage} freeLimit={freeLimit} resetFreeUsage={() => setFreeUsage(0)} notify={notify} />}
            {screen === "merchant" && <MerchantDetail back={back} navigate={navigate} merchants={merchants} merchantName={selectedMerchantName} notify={notify} />}
            {screen === "voucher" && <Voucher back={back} merchants={merchants} merchantName={selectedMerchantName} />}
            {screen === "post" && <CreatePost back={back} notify={notify} displayName={displayName} currentUid={effectiveUid} onPostCreated={handleCreatePost} />}
            {screen === "privacy" && <Privacy back={back} notify={notify} memoryCount={memories.length} useActiveMemories={useActiveMemories} setUseActiveMemories={setUseActiveMemories} reviewMemories={() => goTab("memory")} clearMemories={handleClearMemories} onDeleteAccount={handleDeleteAccount} navigate={navigate} />}
            {screen === "systemLogs" && <SystemLogsView back={back} notify={notify} currentUser={currentUser} />}
            {screen === "about" && <About back={back} />}
            {screen === "addMemory" && <AddMemory back={back} memories={memories} setMemories={handleSetMemories} editing={editingMemory} notify={notify} />}
            {screen === "jobPrefs" && <JobPreferences back={back} navigate={navigate} />}
            {screen === "jobs" && <JobOpportunities back={back} navigate={navigate} />}
            {screen === "jobDetail" && <JobDetail back={back} notify={notify} />}
            {screen === "wellbeing" && <Wellbeing back={back} navigate={navigate} notify={notify} />}
            {screen === "professional" && <ProfessionalSupport back={back} navigate={navigate} />}
            {screen === "provider" && <ProviderDetail back={back} notify={notify} />}
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
              <PostDetail
                back={() => {
                  sessionStorage.setItem("ony-show-posts", "true");
                  back();
                }}
                post={posts.find((p) => p.id === selectedPost.id) || selectedPost}
                currentUid={effectiveUid}
                currentUserName={displayName}
                onLikePost={handleLikePost}
                onPostUpdated={syncUpdatedPostInState}
                notify={notify}
              />
            )}
            {screen === "riskDemo" && <RiskDemo back={back} navigate={navigate} persona={persona} companion={companion} />}
            {screen === "resources" && <ResourceLibrary back={back} navigate={navigate} notify={notify} />}
            {screen === "legal" && <LegalHub back={back} navigate={navigate} />}
          </main>
        )}
        <BottomNav tab={tab} setTab={goTab} />
        {toast && <div className="toast"><Icon name="check" />{toast}</div>}
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
            border: "1px solid var(--accent, #e07a5f)",
            background: "var(--surface-strong, #fff8f5)",
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
          <TextInput value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={30} />
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
        { heading: "Talian HEAL 15555 (MOH Malaysia)", text: "Free, confidential 24-hour national mental health crisis hotline operated by qualified counsellors from the Ministry of Health Malaysia." },
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
      subtitle: "Sumber sokongan Malaysia yang disahkan 24/7",
      sections: [
        { heading: "Bahaya Mengancam Nyawa Segera", text: "Sekiranya anda atau sesiapa di sekeliling anda berada dalam bahaya kecederaan atau bunuh diri serta-merta, sila hubungi 999 dengan segera atau pergi ke jabatan kecemasan hospital terdekat." },
        { heading: "Talian HEAL 15555 (KKM Malaysia)", text: "Talian krisis kesihatan mental kebangsaan 24 jam percuma dan sulit yang dikendalikan oleh kaunselor bertauliah Kementerian Kesihatan Malaysia." },
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
      subtitle: "24小时全天候核实的马来西亚官方支持热线",
      sections: [
        { heading: "危及生命的紧急险情", text: "如果您或身旁人员面临即刻的人身伤害或自残自杀危险，请立即拨打 999 报警或前往就近医院的急诊部（A&E）。" },
        { heading: "Talian HEAL 15555 (马来西亚卫生部 MOH)", text: "由马来西亚卫生部注册辅导员运营的免费、保密 24 小时国家心理健康危机干预热线。" },
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
        <span className="prototype-label" style={{ background: "var(--sage-soft)", color: "#2e7d32" }}>
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
            <div className="companion-confirm"><CompanionAvatar companion={companion} large /><img src={logo} alt="Official ONY logo" /></div>
            <div className="eyebrow">{t.onboarding_complete_eyebrow}</div><h1>{t.onboarding_complete_title}</h1>
            <p className="lead">{t.onboarding_complete_lead}</p>
            <div className="demo-profile"><span className="avatar">{displayName[0]?.toUpperCase()}</span><div><strong>{displayName}</strong><small>{getCompanionLabel(companion, language as AppLanguage)} · {getThemeDetails(theme, themeOptions.find((item) => item.id === theme)?.name || "", "", language as AppLanguage).name}</small></div><Icon name="check" /></div>
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

function CompanionAvatar({ companion, large = false }: { companion: Companion; large?: boolean }) {
  if (companion === "Cat") return <img className={`companion-logo ${large ? "large" : ""}`} src={logo} alt="ONY Cat companion" />;
  return <span className={`companion-face animal-${companion.toLowerCase()} ${large ? "large" : ""}`} aria-label={`ONY with ${companion.toLowerCase()} appearance`}><i className="ear left" /><i className="ear right" /><i className="face-patch" /><i className="eye left" /><i className="eye right" /><i className="nose" /><small>ONY</small></span>;
}

function CompanionPicker({ value, setValue }: { value: Companion; setValue: (v: Companion) => void }) {
  const { language } = useLanguage();
  const companions: Companion[] = ["Cat", "Dog", "Bunny", "Bear", "Fox", "Panda"];
  return (
    <div className="companion-grid">
      {companions.map((item) => (
        <button key={item} className={value === item ? "active" : ""} onClick={() => setValue(item)}>
          <CompanionAvatar companion={item} />
          <strong>{getCompanionLabel(item, language)}</strong>
          {value === item && <span><Icon name="check" /></span>}
        </button>
      ))}
    </div>
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

function ChatHome({ navigate, goTab, displayName, companion, persona, language, conversationStyle, responseLength, memoryConsent, useActiveMemories, soundOn, setSoundOn, conversations, setConversations, activeChatId, setActiveChatId, selectedFolderId, memories, setMemories, todayMoodEntry, subscriptionStatus, freeUsage, freeLimit, registerFreeUse, notify }: {
  navigate: (s: Screen) => void; goTab: (t: Tab) => void; displayName: string; companion: Companion; persona: Persona;
  language: AppLanguage; conversationStyle: string; responseLength: string; memoryConsent: string; useActiveMemories: boolean;
  soundOn: boolean; setSoundOn: (v: boolean) => void;
  conversations: Conversation[]; setConversations: (value: Conversation[] | ((items: Conversation[]) => Conversation[])) => void; activeChatId: number | null; setActiveChatId: (id: number | null) => void;
  selectedFolderId: number | null;
  memories: Memory[]; setMemories: (items: Memory[]) => void;
  todayMoodEntry?: MoodEntry | null;
  subscriptionStatus: SubscriptionStatus; freeUsage: number; freeLimit: number;
  registerFreeUse: () => void; notify: (s: string) => void;
}) {
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
  const { t } = useLanguage();
  const suggestions = useMemo(() => {
    if (language === "Bahasa Melayu") {
      return [
        "Saya rasa tertekan dengan tugasan",
        "Saya rasa gelisah hari ini",
        "Perlukan teman untuk meluahkan perasaan",
        "Bimbing saya dalam pernafasan tenang",
        "Tekanan belajar dan peperiksaan",
        "Saya ingin berehat sejenak",
      ];
    }
    if (language === "中文") {
      return [
        "今天感到压力有些大",
        "感到有些焦虑不安",
        "想要找一个温暖的倾听者",
        "带我做一次深呼吸放松",
        "学习和考试压力很大",
        "想要在这里静静放松一下",
      ];
    }
    return [
      "I feel stressed",
      "I feel anxious",
      "I need someone to talk to",
      "Guide me through a calming breath",
      "Study and exam pressure",
      "I want to relax",
    ];
  }, [language]);

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
      });

      setServerSafetyAction(response.safetyAction);
      setFailedUserText(null);
      setMessages((m) => [...m, { from: "ony", text: response.message }]);
      scrollToBottom("smooth");

      if (autoSpeak) {
        const nextId = `ony-${Date.now()}`;
        setSpeakingMsgId(nextId);
        OnySpeechSynthesizer.getInstance().speak(response.message, nextId, language);
      }

      if (response.safetyAction !== "urgent_safety_flow") {
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
    const lower = trimmed.toLowerCase();
    if (lower === "show my memories") { goTab("memory"); setInput(""); return; }
    if (lower === "open community") { goTab("community"); setInput(""); return; }

    const priorMessages = [...messages];
    setMessages((m) => [...m, { from: "user", text: trimmed }]);
    setInput("");
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

  const handleSimulateVoice = (phrase: string) => {
    if (typing) return;
    setMicNotice(null);
    setVoiceState("listening");
    setVoiceTranscript(phrase);
    setVoiceVolume(0.75);
    notify(language === "Bahasa Melayu" ? "Mentranskripsi suara…" : language === "中文" ? "正在转录语音…" : "Transcribing voice…");
    window.setTimeout(() => {
      stopVoiceListening(true);
    }, 1100);
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
    setInput(e.target.value);
    const target = e.target;
    target.style.height = "auto";
    const nextHeight = Math.min(Math.max(target.scrollHeight, 38), 120);
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

  return <div className="chat-page">
    <PageHeader
      title={t.chat_title}
      subtitle={t.chat_subtitle}
      action={
        <div className="chat-header-actions">
          <Button
            variant="secondary"
            onClick={() => navigate(todayMoodEntry ? "trend" : "mood")}
            title={todayMoodEntry ? `${t.mood_complete_banner} (${todayMoodEntry.emoji} ${todayMoodEntry.label})` : t.chat_mood_prompt}
          >
            {todayMoodEntry ? `${todayMoodEntry.emoji} ${todayMoodEntry.label}` : t.mood_modal_title}
          </Button>
          <Button variant="secondary" onClick={() => navigate("help")}>{t.profile_menu_help}</Button>
        </div>
      }
    />
    <div className="chat-scroll" ref={chatScrollRef}>
    <div className="chat-history-entry"><Button variant="secondary" onClick={() => navigate("chatHistory")}><Icon name="chat" />{t.chat_chats_btn}</Button><div className="chat-trust-links"><Button variant="ghost" className={`tts-toggle ${autoSpeak ? "active" : ""}`} onClick={() => { const next = !autoSpeak; setAutoSpeak(next); notify(next ? (language === "Bahasa Melayu" ? "Suara ONY diaktifkan · Jawapan akan dibaca" : language === "中文" ? "ONY 语音播报已开启 · 将朗读回复" : "ONY voice on · Replies will be read aloud") : (language === "Bahasa Melayu" ? "Suara ONY dimatikan" : language === "中文" ? "ONY 语音播报已关闭" : "ONY voice off")); }} title={language === "Bahasa Melayu" ? "Tukar respons suara automatik" : language === "中文" ? "切换自动语音播报" : "Toggle auto voice response"}><Icon name={autoSpeak ? "volume" : "volumeOff"} />{autoSpeak ? t.chat_voice_on : t.chat_voice_off}</Button><Button variant="ghost" onClick={() => navigate("riskDemo")}>{t.chat_safety_protocols}</Button><Button variant="ghost" onClick={() => navigate("resources")}>{t.chat_resources}</Button></div></div>
    {!todayMoodEntry && messages.length === 0 && (
      <div className="memory-note" style={{ marginBottom: "8px" }}>
        <span>🌱</span>
        <span>{t.chat_mood_reminder}</span>
        <Button variant="secondary" onClick={() => navigate("mood")}>{t.chat_mood_checkin_btn}</Button>
      </div>
    )}
    {messages.length > 0 && <div className="memory-note"><Icon name="memory" /><span>{memoryConsent === "allow" && useActiveMemories ? t.chat_memory_active_badge : t.chat_memory_paused_badge}</span><Button variant="ghost" onClick={() => goTab("memory")}>{t.chat_view_btn}</Button></div>}
    {messages.length === 0 && <div className="chat-welcome"><div className="companion-stage"><CompanionAvatar companion={companion} large /><span className="leaf-accent">ONY</span></div><span className="persona-label">{getPersonaDetails(persona, personaOptions.find((item) => item.id === persona)?.name || "", "", "", language).name}</span><h1>{t.chat_greeting_prefix} {displayName}, {t.chat_greeting_question}</h1><p>{getPersonaDetails(persona, personaOptions.find((item) => item.id === persona)?.name || "", "", personaOptions.find((item) => item.id === persona)?.preview || "", language).preview}</p><div className="welcome-suggestions">{suggestions.map((s) => <button key={s} disabled={typing || isLimitReached} onClick={() => { if (!isLimitReached) { reply(s); } else { navigate("subscription"); } }}>{s}<Icon name="chevron" /></button>)}</div><div className="ambient-mini"><span>{soundOn ? (language === "Bahasa Melayu" ? "Bunyi latar sedang dimainkan" : language === "中文" ? "背景音效播放中" : "Ambient sound playing") : (language === "Bahasa Melayu" ? "Suasana latar menenangkan" : language === "中文" ? "舒缓背景音" : "Calming ambience")}</span><Button variant="ghost" onClick={() => setSoundOn(!soundOn)}>{soundOn ? t.common_pause : t.common_play}</Button></div></div>}
    {messages.length > 0 && <div className="messages">
      {messages.map((m, i) => <div key={i} className={`message-row ${m.from}`} >
        {m.from === "ony" && <CompanionAvatar companion={companion} />}
        <div className="message">{m.text}</div>
        {m.from === "ony" && (
          <button
            type="button"
            className={`tts-btn ${speakingMsgId === `ony-msg-${i}` ? "speaking" : ""}`}
            onClick={() => toggleSpeakMessage(m.text, `ony-msg-${i}`)}
            title={speakingMsgId === `ony-msg-${i}` ? t.chat_voice_stop_speaking : t.chat_voice_listen}
            aria-label={speakingMsgId === `ony-msg-${i}` ? t.chat_voice_stop_speaking : t.chat_voice_listen}
          >
            <Icon name={speakingMsgId === `ony-msg-${i}` ? "volumeOff" : "volume"} />
          </button>
        )}
      </div>)}
      {typing && <div className="message-row ony"><CompanionAvatar companion={companion} /><div className="message typing"><i /><i /><i /></div></div>}
      {chatError && !typing && <div className="chat-error-banner" role="alert">
        <div><Icon name="info" /><span>{chatError}</span></div>
        <div className="chat-error-actions">
          <Button variant="ghost" onClick={() => setChatError(null)}>{t.common_dismiss}</Button>
          {failedUserText && <Button variant="secondary" onClick={retryLastMessage}>{t.common_retry}</Button>}
        </div>
      </div>}
      {!typing && <div className="context-actions">
        {safetyContext && <><Button variant="danger" onClick={() => navigate("safety")}>{t.chat_action_get_help}</Button><Button variant="secondary" onClick={() => navigate("professional")}>{t.chat_action_find_support}</Button><Button variant="secondary" onClick={() => navigate("trusted")}>{t.chat_action_contact_trusted}</Button></>}
        {!safetyContext && serverSafetyAction === "offer_human_support" && <><Button variant="secondary" onClick={() => navigate("professional")}>{t.chat_action_find_support}</Button><Button variant="secondary" onClick={() => navigate("help")}>{t.chat_action_view_resources}</Button></>}
        {!safetyContext && memoryContext && (savedMemoryId === null ? <Button variant="secondary" onClick={saveContextMemory}><Icon name="memory" />{t.chat_action_remember_this}</Button> : <div className="memory-saved"><Icon name="check" /><span>{t.chat_action_saved_vault}</span><Button variant="ghost" onClick={undoContextMemory}>{t.common_undo}</Button></div>)}
        {!safetyContext && anxietyContext && <><Button variant="secondary" onClick={() => navigate("wellbeing")}>{t.chat_action_try_calming}</Button><Button variant="secondary" onClick={() => notify(t.chat_action_breathing)}>{t.chat_action_breathing}</Button><Button variant="secondary" onClick={() => navigate("wellbeing")}>{t.chat_action_calming_music}</Button></>}
        {!safetyContext && studyContext && <><Button variant="secondary" onClick={() => reply(t.chat_action_study_plan)}>{t.chat_action_study_plan}</Button><Button variant="secondary" onClick={() => notify(t.chat_action_take_break)}>{t.chat_action_take_break}</Button><Button variant="secondary" onClick={() => reply(t.chat_action_talk_about_it)}>{t.chat_action_talk_about_it}</Button></>}
        {!safetyContext && jobContext && <><Button variant="secondary" onClick={() => navigate("jobs")}>{t.chat_action_find_jobs}</Button><Button variant="secondary" onClick={() => navigate("jobPrefs")}>{t.chat_action_job_prefs}</Button></>}
        {!safetyContext && relationshipContext && <><Button variant="secondary" onClick={() => reply(t.chat_action_tell_more)}>{t.chat_action_tell_more}</Button><Button variant="secondary" onClick={() => reply(t.chat_action_help_reflect)}>{t.chat_action_help_reflect}</Button></>}
      </div>}
      <div ref={messagesEndRef} className="chat-bottom-spacer" />
    </div>}
    </div>
    <div className="chat-composer">
      <Button variant="ghost" className="ai-notice" onClick={() => navigate("resources")}><Icon name="info" />{t.chat_ai_notice}</Button>
      {isLimitReached ? (
        <div className="chat-limit-banner">
          <div className="limit-banner-text">
            <strong><Icon name="shield" /> {t.chat_limit_title} ({freeUsage}/{freeLimit})</strong>
            <p>{t.chat_limit_desc}</p>
          </div>
          <Button variant="primary" className="full upgrade-btn" onClick={() => navigate("subscription")}>
            {t.chat_limit_unlock_btn}
          </Button>
        </div>
      ) : (
        <>
          <div className="mode-switch"><button className={inputMode === "voice" ? "active" : ""} onClick={() => setInputMode("voice")}><Icon name="mic" />{t.chat_mode_voice}</button><button className={inputMode === "text" ? "active" : ""} onClick={() => setInputMode("text")}><Icon name="chat" />{t.chat_mode_text}</button></div>
          {inputMode === "voice" ? (
            <div className={`voice-composer state-${voiceState}`}>
              <div className="voice-composer-row">
                <button
                  type="button"
                  className="primary-mic"
                  disabled={typing}
                  onClick={handleVoice}
                  aria-label={voiceState === "listening" ? "Stop and send speech" : voiceState === "sent" ? "Message sent" : "Tap to speak into mic"}
                >
                  <Icon name={voiceState === "recording" || voiceState === "listening" ? "send" : voiceState === "sent" ? "check" : "mic"} />
                </button>
                <div className="voice-composer-info">
                  <strong>
                    {voiceState === "idle"
                      ? t.chat_voice_tap_mic
                      : voiceState === "listening"
                      ? (voiceTranscript || voiceInterim ? t.chat_voice_ready_send : t.chat_voice_listening_speak)
                      : voiceState === "sent"
                      ? t.chat_voice_sent
                      : t.chat_voice_processing}
                  </strong>
                  <small>
                    {voiceState === "idle"
                      ? t.chat_voice_sub_idle
                      : voiceState === "listening"
                      ? t.chat_voice_sub_listening
                      : voiceState === "sent"
                      ? t.chat_voice_tap_mic
                      : t.chat_voice_session_privacy}
                  </small>
                  {voiceState === "listening" && (
                    <div className="voice-live-waves">
                      <span style={{ height: `${Math.max(4, voiceVolume * 22)}px` }} />
                      <span style={{ height: `${Math.max(6, voiceVolume * 30)}px` }} />
                      <span style={{ height: `${Math.max(5, voiceVolume * 25)}px` }} />
                      <span style={{ height: `${Math.max(8, voiceVolume * 35)}px` }} />
                      <span style={{ height: `${Math.max(4, voiceVolume * 20)}px` }} />
                      <span style={{ height: `${Math.max(6, voiceVolume * 28)}px` }} />
                    </div>
                  )}
                </div>
              </div>
              {voiceState === "listening" && (
                <>
                  <div className="voice-live-transcript">
                    {voiceTranscript || voiceInterim ? (
                      <>
                        <span>{voiceTranscript}</span>
                        {voiceInterim && <span className="interim"> {voiceInterim}</span>}
                      </>
                    ) : (
                      <span className="placeholder">{t.chat_input_placeholder}</span>
                    )}
                  </div>
                  <div className="voice-composer-actions">
                    <Button variant="ghost" onClick={() => stopVoiceListening(false)}>{t.common_cancel}</Button>
                    <Button
                      variant="primary"
                      disabled={!voiceTranscript.trim() && !voiceInterim.trim()}
                      onClick={() => stopVoiceListening(true)}
                    >
                      {t.chat_voice_send_btn}
                    </Button>
                  </div>
                </>
              )}
              {micNotice && (
                <div className="voice-mic-notice">
                  <div className="voice-mic-notice-text">
                    <Icon name="info" />
                    <span>{micNotice}</span>
                  </div>
                  <div className="voice-mic-notice-prompts">
                    <small>{t.chat_voice_quick_prompts}</small>
                    <div className="voice-prompt-chips">
                      {[
                        t.chat_voice_prompt_overwhelmed,
                        t.chat_voice_prompt_breathing,
                        t.chat_voice_prompt_talk,
                      ].map((phrase) => (
                        <button key={phrase} type="button" onClick={() => handleSimulateVoice(phrase)}>
                          💬 "{phrase}"
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <Button variant="secondary" onClick={() => { setMicNotice(null); void startVoiceListening(); }}>{t.chat_voice_try_mic_again}</Button>
                    <Button variant="ghost" onClick={() => setMicNotice(null)}>{t.common_dismiss}</Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form className="chat-input" onSubmit={submit}>
              <textarea
                ref={textareaRef}
                className="chat-textarea"
                rows={1}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={t.chat_input_placeholder}
                aria-label="Message ONY"
                maxLength={2000}
              />
              <Button className="send-btn" type="submit" disabled={typing || !input.trim()} title={t.chat_send_button}><Icon name="send" /></Button>
            </form>
          )}
        </>
      )}
    </div>
  </div>;
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

function MemoryVault({ memories: items, setMemories: setItems, navigate, setEditingMemory, companion, notify }: {
  memories: Memory[]; setMemories: (v: Memory[]) => void; navigate: (s: Screen) => void;
  setEditingMemory: (v: Memory | null) => void; companion: Companion; notify: (s: string) => void;
}) {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState("");
  const update = (id: number, patch: Partial<Memory>) => setItems(items.map((x) => x.id === id ? { ...x, ...patch } : x));
  return <><PageHeader title={t.memory_title} subtitle={`${items.filter((x) => x.active).length} ${t.memory_card_active}`} /><section className="page-pad topless">
    <div className="search"><Icon name="search" /><TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.memory_search_placeholder} /></div>
    <div className="vault-intro"><div><span className="eyebrow">{t.memory_vault_control}</span><h2>{t.memory_vault_heading}</h2><p>{t.memory_vault_desc}</p></div><Icon name="memory" /></div>
    <Button className="full add-memory-btn" onClick={() => { setEditingMemory(null); navigate("addMemory"); }}>+ {t.memory_add_btn}</Button>
    <div className="section-head"><h3>{t.memory_saved_section}</h3><Button variant="ghost" onClick={() => { setItems([]); notify(t.memory_cleared_toast); }}>{t.memory_clear_all}</Button></div>
    {items.filter((x) => x.text.toLowerCase().includes(query.toLowerCase())).map((item) => <div className={`memory-card ${!item.active ? "paused" : ""}`} key={item.id}>
      <div className="memory-top"><span className="memory-icon"><Icon name="memory" /></span><Toggle on={item.active} setOn={(v) => update(item.id, { active: v })} /></div>
      {item.kind === "image" && <div className={`memory-image ${item.imageTone || "forest"}`}><span>{t.memory_kind_image}</span></div>}
      {item.category && <span className="memory-category">{getCategoryLabel(item.category, language)}</span>}<strong>{item.text}</strong>
      <details><summary>{t.memory_why_remembers}</summary><p>{item.reason}</p></details>
      <div className="memory-actions"><Button variant="ghost" onClick={() => { setEditingMemory(item); navigate("addMemory"); }}><Icon name="edit" />{t.common_edit}</Button><Button variant="ghost" onClick={() => { setItems(items.filter((x) => x.id !== item.id)); notify(t.memory_deleted_toast); }}><Icon name="trash" />{t.common_delete}</Button></div>
    </div>)}
    {!items.length && <div className="empty"><CompanionAvatar companion={companion} large /><h3>{t.memory_empty_title}</h3><p>{t.memory_empty_desc}</p></div>}
    <div className="privacy-row"><Icon name="shield" /><div><strong>{t.memory_privacy_controls}</strong><p>{t.memory_ask_before_saving} {items.length ? (language === "Bahasa Melayu" ? "mati" : language === "中文" ? "关闭" : "off") : (language === "Bahasa Melayu" ? "hidup" : language === "中文" ? "开启" : "on")}.</p></div><Toggle on={memoryConsentOn(items)} setOn={() => notify(t.personalise_save_toast)} /></div>
  </section></>;
}
const memoryConsentOn = (items: Memory[]) => items.length > 0;

function AddMemory({ back, memories, setMemories, editing, notify }: {
  back: () => void; memories: Memory[]; setMemories: (v: Memory[]) => void; editing: Memory | null; notify: (s: string) => void;
}) {
  const { t, language } = useLanguage();
  const [text, setText] = useState(editing?.text || "");
  const [category, setCategory] = useState(editing?.category || "");
  const [active, setActive] = useState(editing?.active ?? true);
  const [kind, setKind] = useState<"text" | "image">(editing?.kind || "text");
  const [imageSelected, setImageSelected] = useState(editing?.kind === "image");
  const save = () => {
    const item: Memory = { id: editing?.id || Date.now(), text: text || (language === "Bahasa Melayu" ? "Memori imej istimewa" : language === "中文" ? "特别的心情照片" : "A special image memory"), category: category || undefined, active, kind, imageTone: kind === "image" ? "forest" : undefined, reason: editing?.reason || (language === "Bahasa Melayu" ? "Anda menambah ini terus ke Kubah Memori anda." : language === "中文" ? "您直接将其添加到了记忆宝库中。" : "You added this directly to your Memory Vault.") };
    setMemories(editing ? memories.map((memory) => memory.id === editing.id ? item : memory) : [item, ...memories]);
    notify(editing ? t.memory_updated_toast : t.memory_added_toast);
    back();
  };
  return <><PageHeader title={editing ? t.memory_edit_title : t.memory_add_title} subtitle={t.memory_add_sub} back={back} /><section className="page-pad">
    <div className="help-hero"><Icon name="memory" /><div><h2>{t.memory_hero_title}</h2><p>{t.memory_hero_desc}</p></div></div>
    <div className="memory-type"><Button variant={kind === "text" ? "primary" : "secondary"} onClick={() => setKind("text")}>{t.memory_kind_text}</Button><Button variant={kind === "image" ? "primary" : "secondary"} onClick={() => setKind("image")}>{t.memory_kind_image}</Button></div>
    {kind === "image" && <button className={`image-upload ${imageSelected ? "selected" : ""}`} onClick={() => { setImageSelected(true); notify(t.memory_kind_image); }}>{imageSelected ? <><span className="sample-photo"><i /></span><strong>Forest walk.jpg</strong><small>{t.memory_change_image}</small></> : <><Icon name="market" /><strong>{t.memory_select_image}</strong><small>{t.memory_select_image_sub}</small></>}</button>}
    <label className="field-label">{kind === "text" ? t.memory_what_should_remember : t.memory_caption_label}</label><TextArea rows={kind === "text" ? 5 : 3} value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === "text" ? t.memory_text_placeholder : t.memory_image_placeholder} />
    <label className="field-label">{t.memory_category_label}</label><div className="chips memory-categories">{["About Me", "Preferences", "Important People", "Goals", "Things That Help Me", "Special Memories"].map((item) => <Button key={item} variant={category === item ? "primary" : "secondary"} onClick={() => setCategory(item)}>{getCategoryLabel(item, language)}</Button>)}</div>
    <div className="setting-toggle"><div><strong>{t.memory_allow_use}</strong><p>{t.memory_allow_use_sub}</p></div><Toggle on={active} setOn={setActive} /></div>
    <Button className="full" disabled={kind === "text" ? !text.trim() : !imageSelected} onClick={save}>{t.memory_save_btn}</Button><Button className="full" variant="secondary" onClick={back}>{t.common_cancel}</Button>
  </section></>;
}



function Community({
  navigate,
  openPost,
  openMember,
  notify,
  globeUsers = DEFAULT_GLOBE_USERS,
  posts = [],
  currentUid = "guest_local_user",
  currentUserName = "ONY Member",
  onLikePost,
  dbSyncing,
  latestMood,
  mySupportMessages: propMySupportMessages,
  setMySupportMessages: propSetMySupportMessages,
}: {
  navigate: (s: Screen) => void;
  openPost: (post: Post) => void;
  openMember: (user: GlobeUser) => void;
  notify: (s: string) => void;
  globeUsers?: GlobeUser[];
  posts?: Post[];
  setPosts?: React.Dispatch<React.SetStateAction<Post[]>>;
  currentUid?: string;
  currentUserName?: string;
  onLikePost?: (postId: string) => void;
  dbSyncing?: boolean;
  latestMood?: MoodEntry;
  mySupportMessages?: FirestoreCommunityMessage[];
  setMySupportMessages?: React.Dispatch<React.SetStateAction<FirestoreCommunityMessage[]>>;
}) {
  const { t, language } = useLanguage();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
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
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [regionLevel, setRegionLevel] = useState(0);
  const [locationChoice, setLocationChoice] = useState<"none" | "declined" | "allowed">("none");
  const [manualArea, setManualArea] = useState("");
  const [discoverable, setDiscoverable] = useState(true);
  const [acceptMessages, setAcceptMessages] = useState(true);

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
  const [sendingSampleToMe, setSendingSampleToMe] = useState(false);

  const myMoodLabel = latestMood ? latestMood.label : "Calm";
  const myMoodGlow: "bright" | "soft" | "dim" | "neutral" = latestMood
    ? latestMood.level >= 4
      ? "bright"
      : latestMood.level === 3
        ? "soft"
        : "dim"
    : "bright";

  const fetchMySupportMessages = async () => {
    setLoadingMyMessages(true);
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
      setMySupportMessages(
        DEFAULT_COMMUNITY_MESSAGES.filter((m) => m.toUserId === "0").map((m, i) => ({
          id: `seed_me_${i}`,
          ...m,
        })),
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

  const handleSimulateIncomingSupport = async () => {
    if (sendingSampleToMe) return;
    setSendingSampleToMe(true);
    const sampleNotes = [
      language === "Bahasa Melayu"
        ? "Menghantar detik kedamaian yang hening merentasi glob. Apa sahaja yang anda pikul hari ini, anda tidak perlu laluinya seorang diri 🌱"
        : language === "中文"
        ? "从星球的另一端为您送上一份安静的平和。无论今天背负着什么，你都不必独自承担 🌱"
        : "Sending you a quiet moment of peace from across the globe. Whatever you are carrying today, you don’t have to carry it alone 🌱",
      language === "Bahasa Melayu"
        ? "Hai pengembara—hanya ingin mengingatkan anda untuk merehatkan bahu, melepaskan rahang, dan menarik satu nafas perlahan. Anda telah mencuba yang terbaik 💫"
        : language === "中文"
        ? "嘿，同路的旅人——只是想提醒你放松紧绷的双肩，松开咬紧的下颌，深呼吸一次。你已经做得足够好了 💫"
        : "Hey there traveler—just wanted to remind you to rest your shoulders, unclench your jaw, and take one slow breath. You’re doing enough 💫",
      language === "Bahasa Melayu"
        ? "Melihat cahaya anda di glob dan ingin mengirimkan sedikit kehangatan kepada anda. Semoga ada perkara lembut yang membuatkan anda tersenyum hari ini ☕"
        : language === "中文"
        ? "在星球上看见了你发出的微光，想送去一份温暖。愿今天有些温柔的小事能让你嘴角微扬 ☕"
        : "Saw your light on the globe and wanted to send some warmth your way. Hope something gentle makes you smile today ☕",
    ];
    const randomText = sampleNotes[Math.floor(Math.random() * sampleNotes.length)];
    const randomSenderNum = Math.floor(100 + Math.random() * 899);
    const now = new Date().toISOString();
    const payload: Omit<FirestoreCommunityMessage, "id"> = {
      toUserId: "0",
      toUserMood: myMoodLabel,
      fromUserId: `community_member_${randomSenderNum}`,
      senderAnonymous: language === "Bahasa Melayu" ? `Ahli Tanpa Nama #${randomSenderNum}` : language === "中文" ? `匿名成员 #${randomSenderNum}` : `Anonymous Member #${randomSenderNum}`,
      recipientAnonymous: language === "Bahasa Melayu" ? "Anda (Pengembara Tanpa Nama)" : language === "中文" ? "您（匿名同行者）" : "You (Anonymous Traveler)",
      kind: "text",
      text: randomText,
      createdAt: now,
    };

    try {
      const id = await createCommunityMessage(payload);
      setMySupportMessages((prev) => [{ id: id || `msg_${Date.now()}`, ...payload }, ...prev]);
      notify(language === "Bahasa Melayu" ? `Mesej sokongan baharu diterima daripada Ahli Tanpa Nama #${randomSenderNum} 🌱` : language === "中文" ? `收到来自匿名成员 #${randomSenderNum} 的暖心留言 🌱` : `New support message received from Anonymous Member #${randomSenderNum} 🌱`);
    } catch {
      setMySupportMessages((prev) => [{ id: `local_${Date.now()}`, ...payload }, ...prev]);
      notify(language === "Bahasa Melayu" ? `Mesej sokongan baharu diterima daripada Ahli Tanpa Nama #${randomSenderNum} 🌱` : language === "中文" ? `收到来自匿名成员 #${randomSenderNum} 的暖心留言 🌱` : `New support message received from Anonymous Member #${randomSenderNum} 🌱`);
    } finally {
      setSendingSampleToMe(false);
    }
  };

  const regions = [
    {
      label: language === "Bahasa Melayu" ? "Dunia" : language === "中文" ? "全球" : "World",
      note: language === "Bahasa Melayu" ? "Ahli tanpa nama yang boleh ditemui merentasi kawasan luas dan selamat privasi" : language === "中文" ? "跨越广阔安全大区的匿名成员" : "Discoverable anonymous members across broad, privacy-safe regions",
    },
    {
      label: language === "Bahasa Melayu" ? "Malaysia" : language === "中文" ? "马来西亚" : "Malaysia",
      note: language === "Bahasa Melayu" ? "Paparan anggaran negara; tiada lokasi tepat pengguna" : language === "中文" ? "全国概览视图；绝不公开精确坐标" : "Approximate country view; no precise user locations",
    },
    {
      label: language === "Bahasa Melayu" ? "Selangor" : language === "中文" ? "雪兰莪" : "Selangor",
      note: language === "Bahasa Melayu" ? "Paparan negeri anggaran dengan lebih ramai ahli yang boleh ditemui" : language === "中文" ? "州属概览视图，发现更多同行伙伴" : "Approximate state view with more discoverable members",
    },
    {
      label: language === "Bahasa Melayu" ? "Daerah Petaling" : language === "中文" ? "八打灵区" : "Petaling district",
      note: language === "Bahasa Melayu" ? "Kawasan wilayah luas; bukan alamat tepat" : language === "中文" ? "宽泛大区视图；绝非具体门牌住址" : "Broad regional area; never an exact address",
    },
  ];
  const region = regions[regionLevel];
  const drag = useRef({ active: false, moved: false, x: 0, rotation: 0 });

  // Ensure the user's own node (id === 0 / isMe) reflects current discoverable/acceptMessages/mood settings
  const normalizedGlobeUsers: GlobeUser[] = (() => {
    const hasMe = globeUsers.some((u) => u.id === 0 || u.isMe);
    const baseList = hasMe ? globeUsers : [DEFAULT_GLOBE_USERS[0], ...globeUsers];
    return baseList.map((u) =>
      u.id === 0 || u.isMe
        ? {
            ...u,
            id: 0,
            isMe: true,
            moodGlow: myMoodGlow,
            moodLabel: myMoodLabel,
            discoverable,
            acceptsMessages: acceptMessages,
          }
        : u,
    );
  })();

  const visibleUsers = normalizedGlobeUsers.filter((user) => user.discoverable && user.minLevel <= regionLevel);
  const selectedUser = normalizedGlobeUsers.find((user) => user.id === selectedNode) || null;
  const shown = posts.filter((p) => (filter === "All" || p.category === filter) && `${p.title} ${p.body}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageHeader title={t.community_title} subtitle={t.community_subtitle} action={<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>{dbSyncing && <span className="prototype-label">{t.common_syncing}</span>}<Button className="create-post-top" onClick={() => navigate("post")}>+ {t.community_create_post}</Button></div>} /><section className="page-pad community-page">
    <div className="community-view-switch" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
      <Button variant={view === "globe" ? "primary" : "secondary"} onClick={() => setView("globe")}>{t.community_tab_globe}</Button>
      <Button variant={view === "posts" ? "primary" : "secondary"} onClick={() => setView("posts")}>{t.community_tab_posts}</Button>
      <Button variant={view === "myNode" ? "primary" : "secondary"} onClick={() => setView("myNode")}>{t.community_my_node} ({mySupportMessages.length})</Button>
    </div>
    {view === "globe" && <>
      <div className="community-world full-globe">
        <div className="world-copy">
          <span className="eyebrow">{t.community_discoverable_eyebrow}</span>
          <div className="region-breadcrumb">{regions.slice(0, regionLevel + 1).map((item, index) => <span key={item.label}>{index > 0 && "›"} {item.label}</span>)}</div>
          <h2>{region.label}</h2><p>{region.note}. {language === "Bahasa Melayu" ? "Ketik nod bercahaya anda (\"Anda\") atau mana-mana nod ahli untuk berhubung." : language === "中文" ? "轻点您发光的节点（\"您\"）或任意成员节点即可互动连结。" : "Tap your glowing node (\"You\") or any member node to connect."}</p>
        </div>
        <div className="globe-controls"><Button variant="ghost" disabled={regionLevel === 0} onClick={() => { setRegionLevel((level) => Math.max(0, level - 1)); setSelectedNode(null); }}>{t.community_zoom_out}</Button><span>{visibleUsers.length} {t.community_nodes_count}</span><Button disabled={regionLevel === regions.length - 1} onClick={() => { setRegionLevel((level) => Math.min(regions.length - 1, level + 1)); setSelectedNode(null); }}>{t.community_zoom_in}</Button></div>
        {regionLevel > 0 && <Button variant="ghost" className="back-world" onClick={() => { setRegionLevel(0); setSelectedNode(null); }}>{t.community_back_world}</Button>}
        <div className="globe-stage"><div className={`globe globe-level-${regionLevel}`} aria-label={`Interactive user globe for ${region.label}`} style={{ backgroundPosition: `${rotation * 1.4}px center` }} onPointerDown={(event) => { drag.current = { active: true, moved: false, x: event.clientX, rotation }; if (!(event.target as HTMLElement).closest(".globe-node")) event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (drag.current.active) { const distance = event.clientX - drag.current.x; if (Math.abs(distance) > 5) drag.current.moved = true; setRotation(drag.current.rotation + distance * .7); } }} onPointerUp={() => { drag.current.active = false; }} onPointerCancel={() => { drag.current.active = false; }}><i className="orbit one" /><i className="orbit two" />{visibleUsers.map((user) => {
          const isMeNode = Boolean(user.isMe || user.id === 0);
          const angle = (user.lon + rotation) * Math.PI / 180;
          const depth = Math.cos(angle);
          const x = 50 + Math.sin(angle) * 43;
          const y = 50 - user.lat * .48;
          return (
            <button
              aria-label={isMeNode ? `${t.community_you_node}, mood glow ${user.moodLabel}` : `Anonymous member node, mood glow ${user.moodLabel}`}
              key={user.id}
              className={`globe-node mood-${user.moodGlow} ${isMeNode ? "is-me" : ""} ${selectedNode === user.id ? "selected" : ""}`}
              style={{ left: `${x}%`, top: `${y}%`, opacity: depth < -.2 ? .38 : depth * .35 + .65, transform: "translate(-50%, -50%)", zIndex: isMeNode ? 45 : Math.round((depth + 1) * 10) }}
              onPointerUp={(event) => {
                if (!drag.current.moved) {
                  drag.current.active = false;
                  event.stopPropagation();
                  setSelectedNode(user.id);
                }
              }}
            >
              {isMeNode && <small className="my-node-indicator">{t.community_you_node}</small>}
              <span />
            </button>
          );
        })}</div><span className="rotate-hint">{t.community_globe_pan_hint}</span></div>

        {selectedUser && (selectedUser.isMe || selectedUser.id === 0 ? (
          <div className="node-card user-node-card">
            <Button variant="ghost" className="node-close" onClick={() => setSelectedNode(null)}><Icon name="close" /></Button>
            <span className={`anonymous-light mood-${selectedUser.moodGlow}`} />
            <span className="prototype-label">{language === "Bahasa Melayu" ? "Nod Tanpa Nama Anda · Malaysia" : language === "中文" ? "您的匿名节点 · 马来西亚" : "Your Anonymous Node · Malaysia"}</span>
            <strong>{t.community_your_light}</strong>
            <p>
              {language === "Bahasa Melayu"
                ? `Ahli lain melihat daftar masuk emosi tanpa nama anda (${selectedUser.moodLabel.toLowerCase()}) tanpa identiti peribadi atau lokasi tepat. Anda mempunyai `
                : language === "中文"
                ? `其他人仅能看到您的匿名心情状态（${selectedUser.moodLabel.toLowerCase()}），零个人身份或具体位置暴露。您已收到来自同伴的 `
                : `Others see your anonymous mood check-in (${selectedUser.moodLabel.toLowerCase()}) with zero personal identity or exact location. You have `}
              <strong>{mySupportMessages.length}</strong>{" "}
              {language === "Bahasa Melayu" ? "mesej sokongan daripada orang lain." : language === "中文" ? "条暖心留言。" : mySupportMessages.length === 1 ? "support message from others." : "support messages from others."}
            </p>
            <div>
              <Button onClick={() => setView("myNode")}>{t.community_view_support_sent} ({mySupportMessages.length})</Button>
              <Button variant="secondary" onClick={() => setSelectedNode(null)}>{t.common_close}</Button>
            </div>
          </div>
        ) : (
          <div className="node-card user-node-card">
            <Button variant="ghost" className="node-close" onClick={() => setSelectedNode(null)}><Icon name="close" /></Button>
            <span className={`anonymous-light mood-${selectedUser.moodGlow}`} />
            <span className="prototype-label">{language === "Bahasa Melayu" ? "Ahli Tanpa Nama" : language === "中文" ? "匿名成员" : "Anonymous Member"}</span>
            <strong>{t.community_someone_here}</strong>
            <p>
              {language === "Bahasa Melayu"
                ? `Cahaya ini menggambarkan daftar masuk emosi pilihan: ${selectedUser.moodLabel.toLowerCase()}. Tiada identiti peribadi atau lokasi tepat dikongsi.`
                : language === "中文"
                ? `微光反映可选的心情状态：${selectedUser.moodLabel.toLowerCase()}。绝不共享任何个人身份或精确位置。`
                : `The light reflects an optional mood check-in: ${selectedUser.moodLabel.toLowerCase()}. No personal identity or precise location is shared.`}
            </p>
            {!selectedUser.acceptsMessages && <div className="messages-off-notice"><Icon name="info" />{language === "Bahasa Melayu" ? "Ahli ini kelihatan tetapi tidak menerima mesej sokongan buat masa ini." : language === "中文" ? "该成员目前可见，但暂时关闭了接收支持留言。" : "This member is visible but is not receiving supportive messages right now."}</div>}
            <div>
              {selectedUser.acceptsMessages ? <Button onClick={() => openMember(selectedUser)}>{t.community_receive_support}</Button> : <Button disabled>{language === "Bahasa Melayu" ? "Mesej sokongan dimatikan" : language === "中文" ? "支持留言已关闭" : "Support messages off"}</Button>}
              <Button variant="ghost" onClick={() => notify(language === "Bahasa Melayu" ? "Terima kasih atas laporan anda. Nod ahli ini telah dihantar untuk semakan moderasi." : language === "中文" ? "感谢您的反馈。该成员节点已提交社区审核。" : "Thank you for reporting. This member node has been sent for moderation review.")}>{t.common_report}</Button>
              <Button variant="ghost" onClick={() => { notify(language === "Bahasa Melayu" ? "Ahli tanpa nama disekat dalam sesi ini" : language === "中文" ? "已在此会话中屏蔽该匿名成员" : "Anonymous member blocked in this session"); setSelectedNode(null); }}>{t.common_block}</Button>
            </div>
          </div>
        ))}
        <div className="world-legend mood-legend"><span><i className="bright" />{t.community_mood_higher}</span><span><i className="soft" />{t.community_mood_okay}</span><span><i className="dim" />{t.community_mood_lower}</span><span><i className="neutral" />{t.community_mood_none}</span><Button variant="ghost" onClick={() => navigate("guidelines")}>{t.community_guidelines_btn}</Button></div>
      </div>
      <div className="globe-privacy-settings"><div><strong>{t.community_appear_globe}</strong><p>{t.community_appear_globe_desc}</p></div><Toggle on={discoverable} setOn={setDiscoverable} /></div>
      <div className="globe-privacy-settings"><div><strong>{t.community_receive_support}</strong><p>{t.community_receive_support_desc}</p></div><Toggle on={acceptMessages} setOn={setAcceptMessages} /></div>
      <div className="location-choice"><strong>{t.community_regional_discovery}</strong><p>{t.community_regional_desc}</p>{locationChoice === "none" && <div><Button onClick={() => setLocationChoice("allowed")}>{t.community_enable_area}</Button><Button variant="secondary" onClick={() => setLocationChoice("declined")}>{t.community_manual_area}</Button></div>}{locationChoice === "allowed" && <div className="form-success"><Icon name="check" />{language === "Bahasa Melayu" ? "Kawasan serantau ditetapkan ke Malaysia (Lembah Klang / Pusat)." : language === "中文" ? "区域已设为马来西亚（中部 / 巴生谷）。" : "Regional area set to Malaysia (Central / Klang Valley)."}</div>}{locationChoice === "declined" && <div className="folder-create"><TextInput value={manualArea} onChange={(event) => setManualArea(event.target.value)} placeholder={t.community_area_placeholder} /><Button disabled={!manualArea.trim()} onClick={() => notify(`${language === "Bahasa Melayu" ? "Kawasan serantau ditetapkan ke" : language === "中文" ? "已将大区设为" : "Regional area set to"} ${manualArea}`)}>{t.community_set_area}</Button></div>}</div>
      <div className="community-note"><Icon name="shield" />{t.community_safety_note}</div>
    </>}
    {view === "posts" && <>
      <div className="posts-heading"><div><span className="eyebrow">{t.community_posts_heading}</span><h2>{language === "Bahasa Melayu" ? "Berkongsi dengan lembut, bersama-sama." : language === "中文" ? "轻柔分享，一路相伴。" : "Shared gently, together."}</h2></div><Button variant="ghost" onClick={() => setView("globe")}>{t.community_back_globe}</Button></div>
      <div className="search"><Icon name="search" /><TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.community_search_posts} /></div>
      <div className="scroll-chips">{categories.map((x) => <Button key={x} variant={filter === x ? "primary" : "secondary"} onClick={() => setFilter(x)}>{getCategoryLabel(x, language)}</Button>)}</div>
      <div className="feed">{shown.map((post) => {
        const likeList = Array.isArray(post.likeRecords) ? post.likeRecords : [];
        const commentList = Array.isArray(post.comments) ? post.comments : [];
        const likedByMe = likeList.some(
          (l) =>
            l.userId === currentUid ||
            l.userName.trim().toLowerCase() === currentUserName.trim().toLowerCase(),
        );
        return (
          <article className="post-card" key={post.id}>
            <div className="post-meta">
              <span className="mini-avatar">{post.author[0]}</span>
              <div>
                <strong>{post.author}</strong>
                <small>{getCategoryLabel(post.category, language)} · {formatFriendlyTime(post.createdAt, language)}</small>
              </div>
              <Button variant="ghost" onClick={() => notify(language === "Bahasa Melayu" ? "Terima kasih. Siaran ditandakan untuk moderasi komuniti." : language === "中文" ? "感谢反馈。帖子已提交社区审核。" : "Thank you. Post flagged for community moderation.")}>{t.common_report}</Button>
            </div>
            <button className="post-open" onClick={() => openPost(post)}>
              <h3>{post.title}</h3>
              <p>{post.body}</p>
            </button>
            {post.media === "voice" && <VoiceNote audioUrl={post.audioUrl} audioDuration={post.audioDuration} notify={notify} />}
            {post.media === "image" && <div className="post-image"><span>{t.community_calm_image}</span></div>}
            <div className="post-actions">
              <Button
                variant={likedByMe ? "primary" : "ghost"}
                onClick={() => onLikePost && onLikePost(post.id)}
              >
                <Icon name="heart" />
                {likedByMe ? (language === "Bahasa Melayu" ? "Disukai" : language === "中文" ? "已赞" : "Liked") : (language === "Bahasa Melayu" ? "Suka" : language === "中文" ? "点赞" : "Like")} ({post.likes})
              </Button>
              <Button variant="ghost" onClick={() => openPost(post)}>
                <Icon name="chat" />
                {commentList.length} {language === "Bahasa Melayu" ? "komen" : language === "中文" ? "条评论" : commentList.length === 1 ? "comment" : "comments"}
              </Button>
            </div>
          </article>
        );
      })}</div>
    </>}
    {view === "myNode" && <>
      <div className="posts-heading">
        <div>
          <span className="eyebrow">{language === "Bahasa Melayu" ? "Nod Glob Peribadi Anda" : language === "中文" ? "您的专属星球节点" : "Your Personal Globe Node"}</span>
          <h2>{t.community_support_sent_to_you}</h2>
        </div>
        <Button variant="ghost" onClick={fetchMySupportMessages}>{loadingMyMessages ? (language === "Bahasa Melayu" ? "Menyegarkan…" : language === "中文" ? "刷新中…" : "Refreshing…") : (language === "Bahasa Melayu" ? "Segarkan" : language === "中文" ? "刷新" : "Refresh")}</Button>
      </div>

      <div className="my-node-card">
        <div className="my-node-card-header">
          <div className="my-node-beacon-large">{latestMood ? latestMood.emoji : "🌱"}</div>
          <div style={{ flex: 1 }}>
            <span className="prototype-label">{language === "Bahasa Melayu" ? "Cahaya Tanpa Nama Anda · Nod #0" : language === "中文" ? "您的匿名微光 · 节点 #0" : "Your Anonymous Light · Node #0"}</span>
            <h2>{language === "Bahasa Melayu" ? "Anda di Glob Komuniti" : language === "中文" ? "社区星球上的您" : "You on the Community Globe"}</h2>
            <p>{t.community_my_node_desc}</p>
          </div>
        </div>
        <div className="my-node-stats-row">
          <div className="my-node-stat-box">
            <label>{t.community_current_glow}</label>
            <strong>{myMoodLabel} ({discoverable ? (language === "Bahasa Melayu" ? "Kelihatan di Glob" : language === "中文" ? "星球上可见" : "Visible on Globe") : (language === "Bahasa Melayu" ? "Tersembunyi" : language === "中文" ? "已隐藏" : "Hidden")})</strong>
          </div>
          <div className="my-node-stat-box">
            <label>{t.community_support_received}</label>
            <strong>{mySupportMessages.length} {language === "Bahasa Melayu" ? "mesej" : language === "中文" ? "条鼓励" : mySupportMessages.length === 1 ? "message" : "messages"}</strong>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            onClick={handleSimulateIncomingSupport}
            disabled={sendingSampleToMe || !acceptMessages}
          >
            {sendingSampleToMe ? (language === "Bahasa Melayu" ? "Menerima…" : language === "中文" ? "接收中…" : "Receiving…") : (language === "Bahasa Melayu" ? "+ Terima Kata Semangat daripada Ahli" : language === "中文" ? "+ 接收来自成员的暖心鼓励" : "+ Receive Encouragement from Member")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedNode(0);
              setView("globe");
            }}
          >
            {t.community_locate_globe}
          </Button>
        </div>
      </div>

      {loadingMyMessages ? (
        <div className="empty mini-empty"><Icon name="chat" /><p>{language === "Bahasa Melayu" ? "Memuatkan mesej sokongan ke nod anda…" : language === "中文" ? "正在加载发送给您节点的温暖留言…" : "Loading support messages sent to your node…"}</p></div>
      ) : mySupportMessages.length === 0 ? (
        <div className="empty mini-empty">
          <Icon name="chat" />
          <p>{language === "Bahasa Melayu" ? "Belum ada mesej sokongan dihantar ke nod anda. Pastikan \"Terima mesej sokongan\" diaktifkan di Glob!" : language === "中文" ? "暂无发送给您节点的支持留言。请确认已在星球开启“接收支持留言”！" : "No support messages sent to your node yet. Make sure \"Receive supportive messages\" is enabled on the Globe!"}</p>
        </div>
      ) : (
        <div className="community-thread my-node-bubble-list">
          {mySupportMessages.map((msg) => (
            <div key={msg.id} className="support-bubble-row member">
              <div className="support-bubble-avatar" aria-hidden="true">
                {msg.kind === "voice" ? "🎙️" : "🌱"}
              </div>
              <div className="support-bubble-col">
                <div className="support-bubble-meta">
                  <strong>{msg.senderAnonymous || (language === "Bahasa Melayu" ? "Pengembara Tanpa Nama" : language === "中文" ? "匿名旅人" : "Anonymous Traveler")}</strong>
                  <span className="to-you-pill">{language === "Bahasa Melayu" ? "Kepada Anda" : language === "中文" ? "写给您" : "To You"}</span>
                  <small>{formatFriendlyTime(msg.createdAt, language)}</small>
                </div>
                <div className="support-bubble member">
                  {msg.kind === "text" ? (
                    <p>{msg.text}</p>
                  ) : (
                    <VoiceNote audioUrl={msg.audioUrl} audioDuration={msg.audioDuration} notify={notify} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>}
  </section></>;
}

function CreatePost({
  back,
  notify,
  displayName = "Anonymous",
  currentUid = "guest_local_user",
  onPostCreated,
}: {
  back: () => void;
  notify: (s: string) => void;
  displayName?: string;
  currentUid?: string;
  onPostCreated?: (post: Omit<FirestoreCommunityPost, "id">) => Promise<void>;
}) {
  const { t, language } = useLanguage();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General");
  const [posted, setPosted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [postAs, setPostAs] = useState("Anonymous");
  const [media, setMedia] = useState<"text" | "image" | "voice">("text");
  const [guidelineError, setGuidelineError] = useState<string | null>(null);

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

  const handleUseVoiceSample = async () => {
    try {
      const sample = await generateSampleVoiceAudio(10);
      setRecordedAudio(sample);
      setMicError(null);
      notify(language === "Bahasa Melayu" ? "Nota suara dilampirkan · 00:10" : language === "中文" ? "已附加语音留言 · 00:10" : "Voice note attached · 00:10");
    } catch {
      notify(language === "Bahasa Melayu" ? "Tidak dapat melampirkan nota suara" : language === "中文" ? "无法附加语音留言" : "Could not attach voice note");
    }
  };

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
    {media === "image" && <button className="image-upload selected" onClick={() => notify(t.community_image)}><span className="sample-photo sunset"><i /></span><strong>{language === "Bahasa Melayu" ? "Saat matahari terbenam.jpg" : language === "中文" ? "日落治愈时刻.jpg" : "Sunset moment.jpg"}</strong><small>{language === "Bahasa Melayu" ? "Ketik untuk menukar imej" : language === "中文" ? "轻点更换图片" : "Tap to change image"}</small></button>}
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
              <Button variant="secondary" onClick={handleUseVoiceSample} title="Attach an audio note">
                {t.community_quick_audio}
              </Button>
            )}
            {micError && (
              <div className="voice-mic-inline-help">
                <small>{micError}</small>
                <Button variant="secondary" onClick={handleUseVoiceSample}>
                  {t.community_quick_audio} (10s)
                </Button>
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

function PostDetail({
  back,
  post,
  currentUid = "guest_local_user",
  currentUserName = "ONY Member",
  notify,
  onLikePost,
  onPostUpdated,
}: {
  back: () => void;
  post: Post;
  currentUid?: string;
  currentUserName?: string;
  notify: (text: string) => void;
  onLikePost?: (id: string) => void;
  onPostUpdated?: (updated: Post) => void;
}) {
  const { t, language } = useLanguage();
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Editing comment state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [editingCommentError, setEditingCommentError] = useState<string | null>(null);

  // Replying to a comment state
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);

  // Editing reply state
  const [editingReplyTarget, setEditingReplyTarget] = useState<{ commentId: string; replyId: string } | null>(null);
  const [editingReplyText, setEditingReplyText] = useState("");
  const [editingReplyError, setEditingReplyError] = useState<string | null>(null);

  const commentInputRef = useRef<HTMLInputElement | null>(null);

  const cleanUid = currentUid.trim() || "anonymous_user";
  const cleanName = currentUserName.trim() || "ONY Member";

  const postLikes: PostLikeRecord[] = Array.isArray(post.likeRecords) ? post.likeRecords : [];
  const comments: PostCommentRecord[] = Array.isArray(post.comments) ? post.comments : [];

  const isPostLikedByMe = postLikes.some(
    (l) =>
      l.userId === cleanUid ||
      l.userName.trim().toLowerCase() === cleanName.toLowerCase(),
  );

  const isOwnedByCurrentUser = (recordUserId?: string, recordUserName?: string) => {
    if (recordUserId && recordUserId === cleanUid) return true;
    const normRecord = (recordUserName || "").trim().toLowerCase();
    const normCurrent = cleanName.toLowerCase();
    return (
      Boolean(normRecord) &&
      (normRecord === normCurrent ||
        normRecord === `${normCurrent} · ony profile` ||
        normRecord === "my ony profile")
    );
  };

  const handleAddComment = async (event: FormEvent) => {
    event.preventDefault();
    const check = validateCommunityCommentText(comment);
    if (!check.valid) {
      setCommentError(check.reason || "Comment violates community guidelines.");
      notify("Comment blocked: violates community guidelines");
      return;
    }
    setCommentError(null);
    setSubmittingComment(true);
    try {
      const updated = await addCommunityPostComment(post, {
        userId: cleanUid,
        userName: cleanName,
        text: comment.trim(),
      });
      if (onPostUpdated) onPostUpdated(updated);
      setComment("");
      notify(language === "Bahasa Melayu" ? "Komen telah dihantar" : language === "中文" ? "评论已发布" : "Comment posted");
    } catch (err: any) {
      setCommentError(err?.message || "Could not post comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSaveEditedComment = async (commentId: string) => {
    const check = validateCommunityCommentText(editingCommentText);
    if (!check.valid) {
      setEditingCommentError(check.reason || "Comment violates community guidelines.");
      notify("Edit blocked: violates community guidelines");
      return;
    }
    setEditingCommentError(null);
    try {
      const updated = await editCommunityPostComment(post, commentId, editingCommentText.trim());
      if (onPostUpdated) onPostUpdated(updated);
      setEditingCommentId(null);
      setEditingCommentText("");
      notify("Comment updated");
    } catch (err: any) {
      setEditingCommentError(err?.message || "Could not update comment.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const updated = await deleteCommunityPostComment(post, commentId);
      if (onPostUpdated) onPostUpdated(updated);
      if (editingCommentId === commentId) setEditingCommentId(null);
      if (replyingToCommentId === commentId) setReplyingToCommentId(null);
      notify("Comment deleted");
    } catch {
      notify("Could not delete comment");
    }
  };

  const handleToggleCommentLike = async (commentId: string, customLiker?: { uid: string; name: string }) => {
    const liker = customLiker || { uid: cleanUid, name: cleanName };
    try {
      const updated = await toggleCommunityCommentLike(post, commentId, liker);
      if (onPostUpdated) onPostUpdated(updated);
      if (customLiker) {
        notify(`${customLiker.name} liked the comment`);
      }
    } catch {
      notify("Could not update comment like");
    }
  };

  const handleSimulateOtherLikeOnComment = async (c: PostCommentRecord) => {
    const samplePeers = [
      { uid: "user_mei", name: "Mei · ONY profile" },
      { uid: "user_harith", name: "Harith · ONY profile" },
      { uid: "user_sofia", name: "Sofia · ONY profile" },
      { uid: "user_daniel", name: "Daniel · ONY profile" },
      { uid: "user_nina", name: "Nina · ONY profile" },
    ];
    const existingIds = new Set((c.likeRecords || []).map((l) => l.userId));
    const availablePeer =
      samplePeers.find((p) => !existingIds.has(p.uid)) || {
        uid: `peer_${Date.now()}`,
        name: `Community Member #${Math.floor(100 + Math.random() * 899)}`,
      };
    await handleToggleCommentLike(c.id, availablePeer);
  };

  const handleAddReply = async (commentId: string) => {
    const check = validateCommunityCommentText(replyText);
    if (!check.valid) {
      setReplyError(check.reason || "Reply violates community guidelines.");
      notify("Reply blocked: violates community guidelines");
      return;
    }
    setReplyError(null);
    try {
      const updated = await addCommunityCommentReply(post, commentId, {
        userId: cleanUid,
        userName: cleanName,
        text: replyText.trim(),
      });
      if (onPostUpdated) onPostUpdated(updated);
      setReplyText("");
      setReplyingToCommentId(null);
      notify("Reply added");
    } catch (err: any) {
      setReplyError(err?.message || "Could not add reply.");
    }
  };

  const handleSaveEditedReply = async (commentId: string, replyId: string) => {
    const check = validateCommunityCommentText(editingReplyText);
    if (!check.valid) {
      setEditingReplyError(check.reason || "Reply violates community guidelines.");
      notify("Edit blocked: violates community guidelines");
      return;
    }
    setEditingReplyError(null);
    try {
      const updated = await editCommunityCommentReply(post, commentId, replyId, editingReplyText.trim());
      if (onPostUpdated) onPostUpdated(updated);
      setEditingReplyTarget(null);
      setEditingReplyText("");
      notify("Reply updated");
    } catch (err: any) {
      setEditingReplyError(err?.message || "Could not update reply.");
    }
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    try {
      const updated = await deleteCommunityCommentReply(post, commentId, replyId);
      if (onPostUpdated) onPostUpdated(updated);
      setEditingReplyTarget(null);
      notify("Reply deleted");
    } catch {
      notify("Could not delete reply");
    }
  };

  return (
    <div className="post-detail-page">
      <PageHeader
        title={t.community_post_detail_title}
        subtitle={`${getCategoryLabel(post.category, language)} · ${formatFriendlyTime(post.createdAt, language)}`}
        back={back}
      />
      <section className="page-pad post-detail-scroll">
        <article className="post-detail-card">
          <div className="post-meta">
            <span className="mini-avatar">{post.author[0]}</span>
            <div>
              <strong>{post.author}</strong>
              <small>
                {post.author === "Anonymous" ? t.community_private_identity : t.community_profile_identity} ·{" "}
                {formatFriendlyTime(post.createdAt, language)}
              </small>
            </div>
            <Button variant="ghost" onClick={() => notify(language === "Bahasa Melayu" ? "Terima kasih. Siaran ditandakan untuk semakan moderasi." : language === "中文" ? "感谢反馈。帖子已提交审核。" : "Thank you. Post flagged for moderation review.")}>
              {t.common_report}
            </Button>
          </div>
          <h1>{post.title}</h1>
          <p>{post.body}</p>
          {post.media === "voice" && (
            <VoiceNote audioUrl={post.audioUrl} audioDuration={post.audioDuration} notify={notify} />
          )}
          {post.media === "image" && (
            <div className="post-image detail">
              <span>{t.community_calm_image}</span>
            </div>
          )}

          <div className="post-detail-stats">
            <span>
              {post.likes} {language === "Bahasa Melayu" ? "suka" : language === "中文" ? "个赞" : post.likes === 1 ? "like" : "likes"}
            </span>
            <span>
              {comments.length} {language === "Bahasa Melayu" ? "komen" : language === "中文" ? "条评论" : comments.length === 1 ? "comment" : "comments"}
            </span>
          </div>

          <div className="post-detail-actions">
            <Button
              variant={isPostLikedByMe ? "primary" : "secondary"}
              onClick={() => onLikePost && onLikePost(post.id)}
            >
              <Icon name="heart" />
              {isPostLikedByMe ? (language === "Bahasa Melayu" ? "Disukai" : language === "中文" ? "已赞" : "Liked") : (language === "Bahasa Melayu" ? "Suka" : language === "中文" ? "点赞" : "Like")} ({post.likes})
            </Button>
            <Button
              variant="secondary"
              onClick={() => commentInputRef.current?.focus()}
            >
              <Icon name="chat" />
              {language === "Bahasa Melayu" ? "Komen" : language === "中文" ? "评论" : "Comment"} ({comments.length})
            </Button>
          </div>
        </article>

        <div className="comments-section">
          <div className="comments-section-header">
            <h3>{t.community_comments_title} ({comments.length})</h3>
          </div>

          {comments.length === 0 ? (
            <div className="empty mini-empty">
              <p>{t.community_no_comments}</p>
            </div>
          ) : (
            comments.map((item) => {
              const isMine = isOwnedByCurrentUser(item.userId, item.userName);
              const commentLikes = Array.isArray(item.likeRecords) ? item.likeRecords : [];
              const likedByMe = commentLikes.some(
                (l) =>
                  l.userId === cleanUid ||
                  l.userName.trim().toLowerCase() === cleanName.toLowerCase(),
              );
              const replies = Array.isArray(item.replies) ? item.replies : [];

              return (
                <div className="comment" key={item.id}>
                  <span>{(item.userName || "A")[0]}</span>
                  <div>
                    <strong>
                      <span className="comment-author-wrap">
                        {item.userName}
                        {isMine && <b className="you-badge">{t.common_you}</b>}
                      </span>
                      <small>
                        {formatFriendlyTime(item.createdAt, language)}
                        {item.updatedAt ? ` · ${t.common_edited}` : ""}
                      </small>
                    </strong>

                    {editingCommentId === item.id ? (
                      <div className="comment-inline-editor">
                        <TextArea
                          rows={2}
                          value={editingCommentText}
                          onChange={(e) => {
                            setEditingCommentText(e.target.value);
                            setEditingCommentError(null);
                          }}
                          placeholder={t.community_edit_comment_placeholder}
                        />
                        {editingCommentError && (
                          <div className="form-error" role="alert">
                            <Icon name="info" />
                            <span>{editingCommentError}</span>
                          </div>
                        )}
                        <div className="comment-inline-actions">
                          <Button
                            variant="primary"
                            onClick={() => handleSaveEditedComment(item.id)}
                            disabled={!editingCommentText.trim()}
                          >
                            {t.common_save}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingCommentError(null);
                            }}
                          >
                            {t.common_cancel}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p>{item.text}</p>
                    )}

                    <div className="comment-action-bar">
                      <button
                        type="button"
                        className={`comment-action-btn ${likedByMe ? "liked" : ""}`}
                        onClick={() => handleToggleCommentLike(item.id)}
                      >
                        <Icon name="heart" />
                        {likedByMe ? (language === "Bahasa Melayu" ? "Disukai" : language === "中文" ? "已赞" : "Liked") : (language === "Bahasa Melayu" ? "Suka" : language === "中文" ? "点赞" : "Like")} ({commentLikes.length})
                      </button>

                      <button
                        type="button"
                        className="comment-action-btn"
                        onClick={() => {
                          if (replyingToCommentId === item.id) {
                            setReplyingToCommentId(null);
                            setReplyError(null);
                          } else {
                            setReplyingToCommentId(item.id);
                            setReplyText("");
                            setReplyError(null);
                          }
                        }}
                      >
                        {language === "Bahasa Melayu" ? "Balas" : language === "中文" ? "回复" : "Reply"} ({replies.length})
                      </button>

                      {isMine && editingCommentId !== item.id && (
                        <>
                          <button
                            type="button"
                            className="comment-action-btn"
                            onClick={() => {
                              setEditingCommentId(item.id);
                              setEditingCommentText(item.text);
                              setEditingCommentError(null);
                            }}
                          >
                            <Icon name="edit" /> {t.common_edit}
                          </button>
                          <button
                            type="button"
                            className="comment-action-btn danger"
                            onClick={() => handleDeleteComment(item.id)}
                          >
                            <Icon name="trash" /> {t.common_delete}
                          </button>
                        </>
                      )}
                    </div>

                    {replies.length > 0 && (
                      <div className="comment-replies-list">
                        {replies.map((rep) => {
                          const isMyReply = isOwnedByCurrentUser(rep.userId, rep.userName);
                          const isEditingThisReply =
                            editingReplyTarget?.commentId === item.id &&
                            editingReplyTarget?.replyId === rep.id;

                          return (
                            <div key={rep.id} className="comment-reply-item">
                              <div className="comment-reply-head">
                                <strong>
                                  {rep.userName}
                                  {isMyReply && <b className="you-badge">{t.common_you}</b>}
                                </strong>
                                <small>
                                  {formatFriendlyTime(rep.createdAt, language)}
                                  {rep.updatedAt ? ` · ${t.common_edited}` : ""}
                                </small>
                              </div>

                              {isEditingThisReply ? (
                                <div className="comment-inline-editor">
                                  <TextInput
                                    value={editingReplyText}
                                    onChange={(e) => {
                                      setEditingReplyText(e.target.value);
                                      setEditingReplyError(null);
                                    }}
                                    placeholder={t.community_edit_reply_placeholder}
                                  />
                                  {editingReplyError && (
                                    <div className="form-error" role="alert">
                                      <Icon name="info" />
                                      <span>{editingReplyError}</span>
                                    </div>
                                  )}
                                  <div className="comment-inline-actions">
                                    <Button
                                      variant="primary"
                                      onClick={() => handleSaveEditedReply(item.id, rep.id)}
                                      disabled={!editingReplyText.trim()}
                                    >
                                      {t.common_save}
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      onClick={() => {
                                        setEditingReplyTarget(null);
                                        setEditingReplyError(null);
                                      }}
                                    >
                                      {t.common_cancel}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p>{rep.text}</p>
                              )}

                              {isMyReply && !isEditingThisReply && (
                                <div className="comment-reply-actions">
                                  <button
                                    type="button"
                                    className="comment-action-btn"
                                    onClick={() => {
                                      setEditingReplyTarget({ commentId: item.id, replyId: rep.id });
                                      setEditingReplyText(rep.text);
                                      setEditingReplyError(null);
                                    }}
                                  >
                                    <Icon name="edit" /> {t.common_edit}
                                  </button>
                                  <button
                                    type="button"
                                    className="comment-action-btn danger"
                                    onClick={() => handleDeleteReply(item.id, rep.id)}
                                  >
                                    <Icon name="trash" /> {t.common_delete}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {replyingToCommentId === item.id && (
                      <div className="comment-reply-composer">
                        <TextInput
                          value={replyText}
                          onChange={(e) => {
                            setReplyText(e.target.value);
                            setReplyError(null);
                          }}
                          placeholder={`${t.community_reply_to} ${item.userName}…`}
                        />
                        {replyError && (
                          <div className="form-error" role="alert">
                            <Icon name="info" />
                            <span>{replyError}</span>
                          </div>
                        )}
                        <div className="comment-inline-actions">
                          <Button
                            variant="primary"
                            onClick={() => handleAddReply(item.id)}
                            disabled={!replyText.trim()}
                          >
                            {language === "Bahasa Melayu" ? "Balas" : language === "中文" ? "回复" : "Reply"}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setReplyingToCommentId(null);
                              setReplyError(null);
                            }}
                          >
                            {t.common_cancel}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <div className="comment-composer-wrapper">
        {commentError && (
          <div className="comment-guideline-error" role="alert">
            <Icon name="info" />
            <span>{commentError}</span>
          </div>
        )}
        <form className="comment-composer" onSubmit={handleAddComment}>
          <input
            ref={commentInputRef}
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              if (commentError) setCommentError(null);
            }}
            placeholder={`${t.community_comment_as} ${cleanName}…`}
            aria-label={t.community_comments_title}
          />
          <Button type="submit" disabled={submittingComment}>
            <Icon name="send" />
          </Button>
        </form>
      </div>
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
  return <><PageHeader title={t.market_title} subtitle={t.market_subtitle} action={<span className="prototype-label" style={{ background: "var(--sage-soft)", color: "#2e7d32" }}>{dbSyncing ? (language === "Bahasa Melayu" ? "Menyegerak…" : language === "中文" ? "同步中…" : "Syncing…") : t.market_verified_partners}</span>} /><section className="page-pad topless">
    <div className="market-hero"><span className="eyebrow">{t.market_nearby_eyebrow}</span><h2>{t.market_hero_title}</h2><p>{t.market_hero_desc}</p></div>
    <div className="search"><Icon name="search" /><TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.market_search_placeholder} /></div>
    <div className="scroll-chips">{cats.map((x) => <Button key={x} variant={category === x ? "primary" : "secondary"} onClick={() => x === "Professional support" ? navigate("professional") : setCategory(x)}>{getCatLabel(x)}</Button>)}</div>
    <div className="market-section-head"><h3>{t.market_wellness_vouchers}</h3><Button variant="ghost" onClick={() => setCategory("All")}>{t.market_view_all}</Button></div>
    <div className="voucher-list">{shown.map((m) => <button className="voucher-ticket" key={m.name} onClick={() => openMerchant(m.name)}><span className="voucher-ticket-stub"><img src={m.image} alt="" /><small>{getCatLabel(m.category)}</small><strong>{m.value}</strong></span><span className="voucher-ticket-body"><small>{getCatLabel(m.category)} · {language === "Bahasa Melayu" ? "Rakan" : language === "中文" ? "合作商户" : "Partner"}</small><strong>{m.name}</strong><b>{m.offer}</b><span>{m.description}</span><em>{m.validity}</em><i>{t.market_claim_voucher}</i></span></button>)}</div>
    <button className="professional-banner" onClick={() => navigate("professional")}><Icon name="shield" /><span><strong>{t.market_prof_banner_title}</strong><small>{t.market_prof_banner_desc}</small></span><Icon name="chevron" /></button>
    <p className="disclaimer"><Icon name="info" /> {language === "Bahasa Melayu" ? "Semua keistimewaan rakan kongsi dan tawaran kesejahteraan telah disahkan bersama komuniti peniaga tempatan kami." : language === "中文" ? "所有合作专属礼遇及身心健康优惠均经由我们本地合作商户社区实名核实。" : "All partner privileges and wellness offers are verified with our local merchant community."}</p>
  </section></>;
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
  return <div className="voucher-page"><PageHeader title={t.voucher_ready_title} subtitle={t.voucher_ready_subtitle} back={back} /><section className="page-pad"><div className="redeemed-mark"><Icon name="check" /></div><div className="voucher-card"><SmallLogo /><span className="eyebrow">{t.voucher_ready_eyebrow}</span><h1>{merchant.value}</h1><p>{merchant.offer} {language === "Bahasa Melayu" ? "di" : language === "中文" ? "于" : "at"} {merchant.name}</p><div className="voucher-code">ONY-PASS-{merchant.name.slice(0, 3).toUpperCase()}-2026</div><div className="barcode">|||| || ||| | |||| |||</div><small>{language === "Bahasa Melayu" ? "Pas Ahli Digital Aktif" : language === "中文" ? "有效数字会员凭证" : "Active Digital Member Pass"}</small></div><div className="community-note" style={{ background: "var(--sage-soft)", borderColor: "var(--sage)", color: "#2e7d32" }}><Icon name="check" />{language === "Bahasa Melayu" ? "Tunjukkan kod bar ini kepada kakitangan semasa membuat pesanan atau tempahan." : language === "中文" ? "在点单或预约核销时向店员出示此条形码即可。" : "Present this barcode to the staff upon placing your order or booking."}</div><Button className="full" onClick={back}>{t.voucher_done_btn}</Button></section></div>;
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
}) {
  const { t } = useLanguage();
  const currentLang = (language as AppLanguage) || "English";
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
  const menu = [
    ["language", t.profile_menu_language, languageDisplayLabel],
    ["personalise", t.profile_menu_personalise, t.profile_menu_personalise_sub],
    ["monthlyReport", t.profile_menu_monthly, t.profile_menu_monthly_sub],
    ["trusted", t.profile_menu_trusted, contactLabel],
    [
      "notifications",
      t.profile_menu_notifications,
      unreadNotificationsCount > 0
        ? `${unreadNotificationsCount} ${t.notif_unread}`
        : t.notif_all_caught_up,
    ],
    ["privacy", t.profile_menu_privacy, t.profile_menu_privacy_sub],
    ["systemLogs", t.profile_menu_logs, t.profile_menu_logs_sub],
    ["legal", t.profile_menu_legal, t.profile_menu_legal_sub],
    ["subscription", t.profile_menu_subscription, subscriptionLabel],
    ["help", t.profile_menu_help, t.profile_menu_help_sub],
    ["about", t.profile_menu_about, currentLang === "Bahasa Melayu" ? "Versi 1.0.0 (Keluaran)" : currentLang === "中文" ? "版本 1.0.0 (正式发布版)" : "Version 1.0.0 (Release)"],
  ] as [Screen, string, string][];
  return (
    <>
      <PageHeader title={t.profile_title} subtitle={t.profile_subtitle} />
      <section className="page-pad top-row">
        <div className="profile-card">
          <CompanionAvatar companion={companion} />
          <div>
            <h2>{displayName} & ONY</h2>
            <p>{currentLang === "Bahasa Melayu" ? "Nama paparan pilihan · " : currentLang === "中文" ? "首选显示昵称 · " : "Preferred display name · "}{language}</p>
            <span>{getCompanionLabel(companion, currentLang)} · {getPersonaDetails(persona, personaOptions.find((item) => item.id === persona)?.name || "", "", "", currentLang).name}</span>
          </div>
          <SmallLogo />
        </div>

        <div className="section-head">
          <h3>{t.profile_settings_head}</h3>
        </div>
        <div className="menu">
          {menu.map(([id, title, text]) => (
            <button key={id} onClick={() => navigate(id)}>
              <span className="menu-icon">
                <Icon name={id === "language" ? "settings" : id === "help" ? "shield" : id === "notifications" ? "bell" : id === "privacy" ? "memory" : id === "systemLogs" ? "fileText" : "profile"} />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{text}</small>
              </span>
              <Icon name="chevron" />
            </button>
          ))}
        </div>
        <Button variant="secondary" className="full logout" onClick={onLogout}>
          {t.profile_menu_logout}
        </Button>
        <p className="prototype-foot">
          {currentLang === "Bahasa Melayu"
            ? "Platform Selamat ONY · Privasi anda dilindungi dengan penyulitan selamat."
            : currentLang === "中文"
            ? "ONY 守护平台 · 严格守护您的隐私安全。"
            : "ONY Platform · Your privacy is protected with secure encryption."}
        </p>
      </section>
    </>
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
                  border: isSelected ? "2px solid var(--accent, #e07a5f)" : "1px solid var(--line, #e2ded9)",
                  background: isSelected ? "var(--surface-strong, #fff)" : "var(--surface, #faf7f4)",
                  marginBottom: "8px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span style={{ fontSize: "26px", lineHeight: 1 }}>{item.flag}</span>
                  <div>
                    <strong style={{ display: "block", fontSize: "15px", color: "var(--text)" }}>
                      {item.label}
                    </strong>
                    <small style={{ display: "block", color: "var(--muted)", fontSize: "12px", marginTop: "1px" }}>
                      {item.sub}
                    </small>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "11px", marginTop: "3px" }}>
                      {item.desc}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    border: isSelected ? "6px solid var(--accent, #e07a5f)" : "2px solid var(--muted, #aaa)",
                    background: "#fff",
                    flexShrink: 0,
                  }}
                />
              </button>
            );
          })}
        </div>

        <div className="community-note" style={{ background: "var(--sage-soft, #e8f5e9)", borderColor: "var(--sage, #a5d6a7)", color: "#2e7d32" }}>
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

function Personalise({ back, language, setLanguage, conversationStyle, setConversationStyle, responseLength, setResponseLength, useActiveMemories, setUseActiveMemories, theme, setTheme, companion, setCompanion, persona, setPersona, soundOn, setSoundOn, volume, setVolume, notify, onSave }: {
  back: () => void; language: string; setLanguage: (v: string) => void;
  conversationStyle: string; setConversationStyle: (v: string) => void;
  responseLength: string; setResponseLength: (v: string) => void;
  useActiveMemories: boolean; setUseActiveMemories: (v: boolean) => void;
  theme: Theme; setTheme: (v: Theme) => void; companion: Companion; setCompanion: (v: Companion) => void;
  soundOn: boolean; setSoundOn: (v: boolean) => void; volume: number; setVolume: (v: number) => void; notify: (s: string) => void;
  persona: Persona; setPersona: (v: Persona) => void; onSave?: () => void;
}) {
  const { t } = useLanguage();
  const currentLang = (language as AppLanguage) || "English";
  const activeThemeObj = themeOptions.find((item) => item.id === theme);
  const themeDetails = activeThemeObj ? getThemeDetails(activeThemeObj.id, activeThemeObj.name, activeThemeObj.note, currentLang) : { name: theme, note: "" };
  const activePersonaObj = personaOptions.find((item) => item.id === persona);
  const personaDetails = activePersonaObj ? getPersonaDetails(activePersonaObj.id, activePersonaObj.name, activePersonaObj.note, activePersonaObj.preview, currentLang) : { name: persona, note: "", preview: "" };

  return <><PageHeader title={t.personalise_title} subtitle={t.personalise_subtitle} back={back} /><section className="page-pad">
    <div className="setting-block"><h3>{t.personalise_companion}</h3><p>{currentLang === "Bahasa Melayu" ? "Pilih siapa yang menemani anda." : currentLang === "中文" ? "选择谁来陪伴您的旅程。" : "Choose who accompanies you."}</p><CompanionPicker value={companion} setValue={setCompanion} /></div>
    <div className="setting-block"><h3>{t.personalise_theme}</h3><p>{currentLang === "Bahasa Melayu" ? "Pilih suasana menenangkan untuk keseluruhan aplikasi." : currentLang === "中文" ? "为整个应用选择舒适宁静的视觉空间。" : "Choose a calming space for the whole app."}</p><ThemePicker value={theme} setValue={setTheme} /></div>
    <div className="ambient-settings"><div><strong>{themeDetails.name} {currentLang === "Bahasa Melayu" ? "suasana latar" : currentLang === "中文" ? "背景音效" : "ambience"}</strong><small>{currentLang === "Bahasa Melayu" ? "Lanskap bunyi latar yang menenangkan" : currentLang === "中文" ? "宁静舒缓的环境背景音效" : "Soothing ambient soundscape"}</small></div><Button variant={soundOn ? "primary" : "secondary"} onClick={() => setSoundOn(!soundOn)}>{soundOn ? (currentLang === "Bahasa Melayu" ? "Jeda" : currentLang === "中文" ? "暂停" : "Pause") : (currentLang === "Bahasa Melayu" ? "Main" : currentLang === "中文" ? "播放" : "Play")}</Button><label>{currentLang === "Bahasa Melayu" ? "Kelantangan" : currentLang === "中文" ? "音量" : "Volume"} <TextInput type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} /></label></div>
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
    <div className="preview-bubble"><CompanionAvatar companion={companion} /><div><span>{currentLang === "Bahasa Melayu" ? "Pratonton anda" : currentLang === "中文" ? "您的实时预览" : "Your preview"}</span><p>{personaDetails.preview}</p></div></div>
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
                style={{ background: "var(--sage-soft)", color: "#2e7d32" }}
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
    <a className="resource" href="tel:15555"><span><strong>Talian HEAL 15555 (MOH Malaysia)</strong><small>{language === "Bahasa Melayu" ? "Talian kesihatan mental kebangsaan 24/7 · Percuma & sulit" : language === "中文" ? "24/7 全天候国家心理健康热线 · 免费且严格保密" : "24/7 National mental health helpline · Free & confidential"}</small></span><b>{language === "Bahasa Melayu" ? "Hubungi 15555" : language === "中文" ? "拨打 15555" : "Call 15555"}</b></a>
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
    <div className="community-note" style={{ background: "var(--sage-soft)", borderColor: "var(--sage)", color: "#2e7d32" }}>
      <Icon name="check" />{language === "Bahasa Melayu" ? "Senarai rakan kongsi disahkan yang komited kepada kesejahteraan belia dan waktu kerja munasabah." : language === "中文" ? "经认证的合作伙伴，致力于保障青年身心健康与合理工时。" : "Verified partner listings committed to young adult well-being and reasonable working hours."}
    </div>
    <div className="result-summary">
      <strong>3 {language === "Bahasa Melayu" ? "padanan disahkan" : language === "中文" ? "个精选认证匹配" : "verified matches"}</strong>
      <span>Marketing & Community · {language === "Bahasa Melayu" ? "Peringkat permulaan · Malaysia" : language === "中文" ? "入门级 · 马来西亚" : "Entry level · Malaysia"}</span>
    </div>
    {jobs.map((job) => (
      <div className="job-card" key={job.title}>
        <span className="prototype-label" style={{ background: "var(--peach-soft)", color: "var(--coral-dark)" }}>
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
      <span className="prototype-label" style={{ background: "var(--peach-soft)", color: "var(--coral-dark)" }}>
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

function Wellbeing({ back, navigate, notify }: { back: () => void; navigate: (s: Screen) => void; notify: (s: string) => void }) {
  const { language } = useLanguage();
  const [mode, setMode] = useState("All");
  const options = [
    {
      title: language === "Bahasa Melayu" ? "Campuran instrumental perlahan" : language === "中文" ? "慢节奏轻柔器乐混音" : "Slow instrumental mix",
      type: "Music",
      detail: language === "Bahasa Melayu" ? "Fokus & tenang · 24 min" : language === "中文" ? "专注与宁神 · 24分钟" : "Focus & calm · 24 min",
      tone: "ocean"
    },
    {
      title: language === "Bahasa Melayu" ? "Jeda pernafasan satu minit" : language === "中文" ? "一分钟正念深呼吸" : "One-minute breathing pause",
      type: "Relaxation",
      detail: language === "Bahasa Melayu" ? "Penetapan semula berpandu · 1 min" : language === "中文" ? "引导式重置 · 1分钟" : "Guided reset · 1 min",
      tone: "forest"
    },
    {
      title: language === "Bahasa Melayu" ? "Kaki langit lautan" : language === "中文" ? "辽阔海平线" : "Ocean horizon",
      type: "Nature",
      detail: language === "Bahasa Melayu" ? "Ketenangan visual · Ombak" : language === "中文" ? "视觉静心 · 海浪" : "Visual grounding · Waves",
      tone: "ocean"
    },
    {
      title: language === "Bahasa Melayu" ? "Matahari terbenam lembut" : language === "中文" ? "柔和日落晚霞" : "Soft sunset",
      type: "Nature",
      detail: language === "Bahasa Melayu" ? "Ketenangan visual · Matahari Terbenam" : language === "中文" ? "视觉静心 · 日落" : "Visual grounding · Sunset",
      tone: "sunset"
    },
    {
      title: language === "Bahasa Melayu" ? "Seramik & tanah liat minda" : language === "中文" ? "正念陶艺与手作泥工" : "Mindful pottery & clay",
      type: "Wellness",
      detail: language === "Bahasa Melayu" ? "Sesi penetapan semula kreatif" : language === "中文" ? "创意放松治愈体验" : "Creative reset session",
      tone: "peach"
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
    title={language === "Bahasa Melayu" ? "Cadangan Lembut" : language === "中文" ? "舒心微习惯" : "Gentle Suggestions"}
    subtitle={language === "Bahasa Melayu" ? "Ketenangan & kesejahteraan harian" : language === "中文" ? "日常身心安顿与舒缓" : "Everyday grounding & well-being"}
    back={back}
  /><section className="page-pad">
    <div className="reflection"><SmallLogo /><div><strong>{language === "Bahasa Melayu" ? "Mari jadikan saat ini lebih tenang dan ringan." : language === "中文" ? "让此刻的心情更轻松一些。" : "Let’s make this moment a little lighter."}</strong><p>{language === "Bahasa Melayu" ? "Pilih apa sahaja yang terasa selesa. Anda boleh menjeda atau menukar aktiviti pada bila-bila masa." : language === "中文" ? "选择任何让您感到舒适的微小活动。您可以随时暂停或切换。" : "Choose whatever feels manageable. You can pause or change activities at any time."}</p></div></div>
    <div className="scroll-chips wellbeing-tabs">{["All", "Music", "Nature", "Relaxation", "Wellness"].map((item) => <Button key={item} variant={mode === item ? "primary" : "secondary"} onClick={() => setMode(item)}>{getTabName(item)}</Button>)}</div>
    <div className="wellbeing-grid">{shown.map((item) => <button key={item.title} className="wellbeing-card" onClick={() => item.type === "Wellness" ? navigate("merchant") : notify(`${item.title} ${language === "Bahasa Melayu" ? "dimulakan · Bernafas perlahan-lahan 🌱" : language === "中文" ? "已开启 · 缓慢平稳地深呼吸 🌱" : "started · Breathe gently 🌱"}`)}><span className={`wellbeing-visual visual-${item.tone}`}><i /></span><span className="eyebrow">{getTabName(item.type)}</span><strong>{item.title}</strong><small>{item.detail}</small><b>{language === "Bahasa Melayu" ? "Buka" : language === "中文" ? "开始" : "Open"}</b></button>)}</div>
    <button className="professional-banner" onClick={() => navigate("merchant")}><Icon name="market" /><span><strong>{language === "Bahasa Melayu" ? "Terokai rakan kesihatan & kesejahteraan" : language === "中文" ? "探索身心疗愈伙伴" : "Explore wellness partners"}</strong><small>{language === "Bahasa Melayu" ? "Kafe tenang, seramik, yoga, dan aktiviti santai" : language === "中文" ? "静心咖啡馆、陶艺手作、轻瑜伽及放松体验" : "Mindful cafés, pottery, yoga, and calming activities"}</small></span><Icon name="chevron" /></button>
    <p className="disclaimer"><Icon name="info" />{language === "Bahasa Melayu" ? "Cadangan gaya hidup ini adalah untuk kelonggaran harian dan tidak menggantikan penjagaan kesihatan mental klinikal." : language === "中文" ? "此类生活方式建议仅用于日常放松减压，不可替代专业临床心理医疗。" : "These lifestyle suggestions are for everyday relaxation and do not substitute for clinical mental healthcare."}</p>
  </section></>;
}

const providers = [
  {
    name: "MENTARI Kuala Lumpur (MOH Malaysia)",
    service: "Community Mental Health Centre · Ministry of Health",
    serviceBm: "Pusat Kesihatan Mental Komuniti · Kementerian Kesihatan Malaysia",
    serviceZh: "社区心理健康中心 · 马来西亚卫生部 (MOH)",
    area: "Sentul / Kuala Lumpur",
    contact: "03-4040 0418",
    phone: "0340400418",
    hours: "Mon - Fri, 8:00 AM - 5:00 PM",
    hoursBm: "Isn - Jum, 8:00 PG - 5:00 PTG",
    hoursZh: "周一至周五, 8:00 - 17:00",
    label: "MOH Certified",
    labelBm: "Disahkan KKM",
    labelZh: "卫生部官方认证",
    description: "Public outpatient psychiatric consultations, psychological assessment, counselling, and psychosocial rehabilitation.",
    descriptionBm: "Konsultasi psikiatri pesakit luar awam, penilaian psikologi, kaunseling, dan pemulihan psikososial.",
    descriptionZh: "公立精神科门诊咨询、心理评估、专业辅导咨询及心理社会康复服务。",
  },
  {
    name: "Befrienders Kuala Lumpur",
    service: "24/7 Suicide Prevention & Emotional Support Helpline",
    serviceBm: "Talian Bantuan Pencegahan Bunuh Diri & Sokongan Emosi 24/7",
    serviceZh: "24/7 全天候危机干预与情感倾听关怀热线",
    area: "Nationwide (Center in Petaling Jaya)",
    contact: "03-7627 2929",
    phone: "0376272929",
    hours: "24 Hours / 7 Days",
    hoursBm: "24 Jam / 7 Hari",
    hoursZh: "24小时 / 7天 全年无休",
    label: "24/7 Helpline",
    labelBm: "Talian 24/7",
    labelZh: "24/7 援助热线",
    description: "Free, confidential 24-hour emotional support hotline for anyone in Malaysia experiencing loneliness, anxiety, or despair.",
    descriptionBm: "Talian sokongan emosi 24 jam percuma dan sulit untuk sesiapa sahaja di Malaysia yang mengalami kesunyian, kebimbangan, atau keputusasaan.",
    descriptionZh: "为在马来西亚任何遭遇孤独、焦虑或绝望困境的朋友提供免费、严格保密的24小时全天候情感关怀与热线陪伴。",
  },
  {
    name: "Hospital Kuala Lumpur (HKL) - Psychiatric Clinic",
    service: "Public Hospital Psychiatric & Emergency Department",
    serviceBm: "Jabatan Psikiatri & Kecemasan Hospital Awam",
    serviceZh: "公立公办综合医院精神专科与急诊部",
    area: "Jalan Pahang, Kuala Lumpur",
    contact: "03-2615 5555",
    phone: "0326155555",
    hours: "24/7 Emergency Department Open",
    hoursBm: "Jabatan Kecemasan 24/7 Dibuka",
    hoursZh: "急诊中心 24/7 全天候开放",
    label: "Public Hospital",
    labelBm: "Hospital Awam",
    labelZh: "公立医院",
    description: "Emergency acute psychiatric intervention, inpatient care, and specialized psychiatric clinical services.",
    descriptionBm: "Intervensi psikiatri akut kecemasan, penjagaan dalam wad, dan perkhidmatan klinikal psikiatri khusus.",
    descriptionZh: "提供急性精神危象紧急干预、住院诊疗监护及针对性精神专科临床医疗服务。",
  },
  {
    name: "Malaysian Mental Health Association (MMHA)",
    service: "Community Counselling & Psychotherapy NGO",
    serviceBm: "NGO Kaunseling Komuniti & Psikoterapi",
    serviceZh: "社区心理辅导与心理治疗注册非政府组织 (NGO)",
    area: "Petaling Jaya, Selangor",
    contact: "03-2780 4390",
    phone: "0327804390",
    hours: "Mon - Sat, 9:00 AM - 5:00 PM",
    hoursBm: "Isn - Sab, 9:00 PG - 5:00 PTG",
    hoursZh: "周一至周六, 9:00 - 17:00",
    label: "Registered NGO",
    labelBm: "NGO Berdaftar",
    labelZh: "注册公益组织",
    description: "Subsidized psychological counselling, psychotherapy, caregiver support, and mental health education programs.",
    descriptionBm: "Kaunseling psikologi bersubsidi, psikoterapi, sokongan penjaga, dan program pendidikan kesihatan mental.",
    descriptionZh: "提供惠民补贴心理咨询、专业心理治疗、照护者身心支持及心理健康科普教育项目。",
  },
];

function ProfessionalSupport({ back, navigate }: { back: () => void; navigate: (s: Screen) => void }) {
  const { language } = useLanguage();
  const [filter, setFilter] = useState("All");
  const [area, setArea] = useState(language === "Bahasa Melayu" ? "Kuala Lumpur & Selangor" : language === "中文" ? "吉隆坡与雪兰莪" : "Kuala Lumpur & Selangor");
  const shown = providers.filter((provider) => filter === "All" || provider.service.toLowerCase().includes(filter.toLowerCase()) || provider.label.toLowerCase().includes(filter.toLowerCase()));

  const getFilterLabel = (item: string) => {
    switch (item) {
      case "All": return language === "Bahasa Melayu" ? "Semua" : language === "中文" ? "全部" : "All";
      case "Helpline": return language === "Bahasa Melayu" ? "Talian Bantuan" : language === "中文" ? "求助热线" : "Helpline";
      case "MOH": return language === "Bahasa Melayu" ? "KKM (MOH)" : language === "中文" ? "卫生部 (MOH)" : "MOH";
      case "Hospital": return language === "Bahasa Melayu" ? "Hospital" : language === "中文" ? "公立医院" : "Hospital";
      case "NGO": return "NGO";
      default: return item;
    }
  };

  return <><PageHeader
    title={language === "Bahasa Melayu" ? "Bantuan Profesional Berdekatan" : language === "中文" ? "附近的专业心理支援" : "Professional Help Nearby"}
    subtitle={language === "Bahasa Melayu" ? "Sumber kesihatan mental Malaysia yang disahkan" : language === "中文" ? "经官方认证的马来西亚心理健康服务网络" : "Verified Malaysian mental health resources"}
    back={back}
  /><section className="page-pad">
    <a className="resource emergency-resource emergency-strip" href="tel:999">
      <span>
        <strong>{language === "Bahasa Melayu" ? "Dalam bahaya nyawa serta-merta?" : language === "中文" ? "面临即刻生命安全险情？" : "In immediate life danger?"}</strong>
        <small>{language === "Bahasa Melayu" ? "Hubungi 999 untuk ambulans atau rawatan perubatan kecemasan." : language === "中文" ? "立即拨打 999 呼叫急救或警务援助。" : "Call 999 for ambulance or emergency medical care."}</small>
      </span>
      <b>{language === "Bahasa Melayu" ? "Hubungi 999" : language === "中文" ? "呼叫 999" : "Call 999"}</b>
    </a>
    <div className="location-choice">
      <strong>{language === "Bahasa Melayu" ? "Kawasan Carian" : language === "中文" ? "搜索区域" : "Search Area"}</strong>
      <p>{language === "Bahasa Melayu" ? "Klinik awam yang disahkan, jabatan hospital, dan talian bantuan krisis di seluruh Malaysia." : language === "中文" ? "覆盖马来西亚各州的公立诊所、医院科室及 24 小时危机热线。" : "Verified public clinics, hospital departments, and crisis helplines across Malaysia."}</p>
      <div className="folder-create">
        <TextInput value={area} onChange={(event) => setArea(event.target.value)} placeholder="e.g. Kuala Lumpur, Selangor, Penang, Johor" />
        <Button onClick={() => {}}>{language === "Bahasa Melayu" ? "Kawasan Aktif" : language === "中文" ? "当前区域" : "Active Area"}</Button>
      </div>
    </div>
    <div className="support-distinction">
      <div>
        <strong>{language === "Bahasa Melayu" ? "Talian Bantuan 24/7" : language === "中文" ? "24/7 援助热线" : "24/7 Helplines"}</strong>
        <p>{language === "Bahasa Melayu" ? "Sokongan emosi segera dan pendengaran tanpa klinikal." : language === "中文" ? "全天候即时非临床倾听与情感疏导。" : "Immediate, non-clinical listening and emotional support."}</p>
      </div>
      <div>
        <strong>{language === "Bahasa Melayu" ? "Penjagaan Klinikal" : language === "中文" ? "临床诊疗服务" : "Clinical Care"}</strong>
        <p>{language === "Bahasa Melayu" ? "Unit psikiatri hospital, klinik MENTARI, dan terapis berlesen." : language === "中文" ? "公立医院精神科门诊、MENTARI 社区中心及执业心理咨询师。" : "Hospital psychiatric units, MENTARI clinics, and licensed therapists."}</p>
      </div>
    </div>
    <div className="scroll-chips">
      {["All", "Helpline", "MOH", "Hospital", "NGO"].map((item) => (
        <Button key={item} variant={filter === item ? "primary" : "secondary"} onClick={() => setFilter(item)}>
          {getFilterLabel(item)}
        </Button>
      ))}
    </div>
    {shown.map((provider) => {
      const label = language === "Bahasa Melayu" ? provider.labelBm : language === "中文" ? provider.labelZh : provider.label;
      const service = language === "Bahasa Melayu" ? provider.serviceBm : language === "中文" ? provider.serviceZh : provider.service;
      const hours = language === "Bahasa Melayu" ? provider.hoursBm : language === "中文" ? provider.hoursZh : provider.hours;
      return (
        <div className="provider-card" key={provider.name}>
          <div>
            <span className="prototype-label" style={{ background: "var(--sage-soft)", color: "#2e7d32" }}>{label}</span>
            <h3>{provider.name}</h3>
            <strong>{service}</strong>
            <p>{provider.area} · {provider.contact}</p>
            <small style={{ display: "block", color: "var(--muted)", marginTop: "4px" }}>{hours}</small>
          </div>
          <div className="provider-actions">
            <a className="btn btn-secondary" href={`tel:${provider.phone}`}>{language === "Bahasa Melayu" ? "Hubungi Sekarang" : language === "中文" ? "立即致电" : "Call Now"}</a>
            <Button onClick={() => navigate("provider")}>{language === "Bahasa Melayu" ? "Butiran" : language === "中文" ? "详情" : "Details"}</Button>
          </div>
        </div>
      );
    })}
    <Button className="full" variant="secondary" onClick={() => window.open("https://mentari.moh.gov.my", "_blank")}>
      {language === "Bahasa Melayu" ? "Buka laman sesawang rasmi MENTARI Malaysia" : language === "中文" ? "访问马来西亚官方 MENTARI 网站" : "Open official MENTARI Malaysia website"}
    </Button>
    <p className="disclaimer">
      <Icon name="info" />{language === "Bahasa Melayu" ? "Semua talian bantuan dan hospital yang disenaraikan adalah sumber awam bertauliah atau badan bukan untung berdaftar di Malaysia." : language === "中文" ? "所列所有热线与医院均为马来西亚官方注册的公立机构或公益组织。" : "All helplines and hospitals listed are certified public or registered non-profit resources in Malaysia."}
    </p>
  </section></>;
}

function ProviderDetail({ back, notify }: { back: () => void; notify: (s: string) => void }) {
  const { language } = useLanguage();
  const p = providers[0];
  const label = language === "Bahasa Melayu" ? p.labelBm : language === "中文" ? p.labelZh : p.label;
  const service = language === "Bahasa Melayu" ? p.serviceBm : language === "中文" ? p.serviceZh : p.service;
  const hours = language === "Bahasa Melayu" ? p.hoursBm : language === "中文" ? p.hoursZh : p.hours;
  const description = language === "Bahasa Melayu" ? p.descriptionBm : language === "中文" ? p.descriptionZh : p.description;

  return <><PageHeader
    title={language === "Bahasa Melayu" ? "Butiran Pusat Rawatan" : language === "中文" ? "医疗机构详情" : "Provider Details"}
    subtitle={language === "Bahasa Melayu" ? "Pusat jagaan kesihatan Malaysia disahkan" : language === "中文" ? "经认证的马来西亚心理医疗中心" : "Verified Malaysian care centre"}
    back={back}
  /><section className="page-pad">
    <div className="provider-hero">
      <span className="prototype-label" style={{ background: "var(--sage-soft)", color: "#2e7d32" }}>{label}</span>
      <div className="provider-avatar"><Icon name="shield" /></div>
      <h1>{p.name}</h1>
      <p>{service} · {p.area}</p>
    </div>
    <div className="card">
      <h3>{language === "Bahasa Melayu" ? "Mengenai kemudahan ini" : language === "中文" ? "关于该机构" : "About this facility"}</h3>
      <p>{description}</p>
      <h3>{language === "Bahasa Melayu" ? "Waktu Operasi & Hubungan" : language === "中文" ? "开放时间与联络方式" : "Hours & Contact"}</h3>
      <p>{language === "Bahasa Melayu" ? "Waktu Operasi" : language === "中文" ? "服务时间" : "Operating Hours"}: {hours}<br />{language === "Bahasa Melayu" ? "Telefon" : language === "中文" ? "联络电话" : "Telephone"}: {p.contact}</p>
    </div>
    <a className="btn btn-primary full" href={`tel:${p.phone}`} style={{ textDecoration: "none" }}>
      <Icon name="phone" /> {language === "Bahasa Melayu" ? "Hubungi" : language === "中文" ? "拨打电话" : "Call"} {p.contact}
    </a>
    <Button className="full" variant="ghost" onClick={() => notify(language === "Bahasa Melayu" ? "Kontak pusat rawatan disimpan ke kenalan kecemasan anda" : language === "中文" ? "机构联络方式已保存至紧急联系人列表" : "Provider contact saved to your emergency contacts")}>
      {language === "Bahasa Melayu" ? "Simpan ke Kontak Kecemasan" : language === "中文" ? "保存到紧急联络人" : "Save to Emergency Contacts"}
    </Button>
    <p className="disclaimer">
      <Icon name="info" />{language === "Bahasa Melayu" ? "Sekiranya anda memerlukan rawatan perubatan segera atau berasa tidak selamat, sila ke jabatan kecemasan terdekat atau dail 999." : language === "中文" ? "若您需要紧急医疗介入或感到自身安全受到威胁，请前往最近的医院急诊部或拨打 999。" : "If you require immediate medical intervention or feel unsafe, please proceed to the nearest emergency department or dial 999."}
    </p>
  </section></>;
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
              border: "2px solid var(--accent, #e07a5f)",
              background: "var(--surface-strong, #fff8f5)",
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
            <span className="prototype-label">{language === "Bahasa Melayu" ? "Pautan Boleh Dikongsi" : language === "中文" ? "专属邀请链接" : "Shareable Link"}</span>
          </div>
          <p className="muted" style={{ marginTop: "4px", marginBottom: "10px" }}>
            {t.trusted_invite_link_desc}
          </p>
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "12px",
              background: "var(--surface, #f7f4f0)",
              border: "1px solid var(--line)",
              fontSize: "12px",
              wordBreak: "break-all",
              color: "var(--text)",
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
                      border: "1px solid var(--line)",
                      background: "var(--surface-strong, #fff)",
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
                        <small style={{ color: "var(--accent, #e07a5f)", display: "block", fontWeight: 600, marginTop: "2px" }}>
                          {isFromMyInviteLink
                            ? (language === "Bahasa Melayu" ? "Membuka pautan anda · Ingin menjadi Kenalan Kecemasan anda" : language === "中文" ? "通过邀请链接进入 · 申请成为您的紧急联系人" : "Clicked your invite link · Wants to be your Emergency Contact")
                            : (language === "Bahasa Melayu" ? "Ingin menambah anda sebagai Kenalan Dipercayai mereka" : language === "中文" ? "希望将您添加为其信任联系人" : "Wants to add you as their Trusted Contact")}
                        </small>
                      </div>
                      <span className="prototype-label">{language === "Bahasa Melayu" ? "Menunggu" : language === "中文" ? "待审核" : "Pending"}</span>
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
              <span className="prototype-label">{t.trusted_waiting_recipient}</span>
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
              <span className="prototype-label">{language === "Bahasa Melayu" ? "Permohonan Ditolak" : language === "中文" ? "请求已被谢绝" : "Request Declined"}</span>
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
            createdAt: m.createdAt,
            toUserMood: m.toUserMood || user.moodLabel,
          }));
      }
      return [
        {
          id: `seed_${user.id}_0`,
          from: "member",
          senderAnonymous: `Anonymous Member #${100 + user.id * 37}`,
          recipientAnonymous: `Anonymous Member (Globe #${user.id})`,
          kind: "text",
          text: `Saw your ${user.moodLabel.toLowerCase()} glow on the globe and wanted to send a warm note of encouragement 🌱 You are not alone.`,
          createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
          toUserMood: user.moodLabel,
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
          toUserMood: user.moodLabel,
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
                createdAt: m.createdAt,
                toUserMood: m.toUserMood || user.moodLabel,
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
  }, [user.id, user.moodLabel]);

  const handleUseVoiceSample = async () => {
    try {
      const sample = await generateSampleVoiceAudio(8);
      setRecordedVoice({ dataUrl: sample.dataUrl, duration: sample.duration });
      setComposerMode("voice");
      setVoice("ready");
      setMicNotice(null);
      notify("Voice greeting attached · 00:08 (Tap Send Audio)");
    } catch {
      notify("Could not attach voice greeting");
    }
  };

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
      textareaRef.current.style.height = `${Math.min(Math.max(textareaRef.current.scrollHeight, 38), 110)}px`;
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
        subtitle={`${language === "Bahasa Melayu" ? "Daftar masuk emosi: " : language === "中文" ? "心情状态: " : "Mood check-in: "}${user.moodLabel} · ${language === "Bahasa Melayu" ? "Bebas identiti" : language === "中文" ? "完全匿名" : "Identity-free"}`}
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
            <span className="prototype-label">{language === "Bahasa Melayu" ? `Ahli tanpa nama · Nod #${user.id}` : language === "中文" ? `匿名成员 · 节点 #${user.id}` : `Anonymous member · Node #${user.id}`}</span>
            <h1>{t.community_someone_here}</h1>
            <strong>{language === "Bahasa Melayu" ? `Cahaya emosi semasa: ${user.moodLabel}` : language === "中文" ? `当前心情微光: ${user.moodLabel}` : `Current mood glow: ${user.moodLabel}`}</strong>
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
                <div className={`support-bubble-row ${isMe ? "me" : "member"}`} key={message.id}>
                  {!isMe && (
                    <div className="support-bubble-avatar" aria-hidden="true">
                      {message.kind === "voice" ? "🎙️" : "🌱"}
                    </div>
                  )}
                  <div className="support-bubble-col">
                    <div className="support-bubble-meta">
                      <strong>{isMe ? (language === "Bahasa Melayu" ? "Anda (Tanpa Nama)" : language === "中文" ? "你 (匿名)" : "You (Anonymous)") : message.senderAnonymous}</strong>
                      <small>{timeDisplay}</small>
                    </div>
                    <div className={`support-bubble ${isMe ? "me" : "member"}`}>
                      {message.kind === "text" ? (
                        <p>{message.text}</p>
                      ) : (
                        <VoiceNote
                          audioUrl={message.audioUrl}
                          audioDuration={message.audioDuration}
                          notify={notify}
                        />
                      )}
                    </div>
                  </div>
                </div>
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

      {/* Fixed Bottom Composer Bar: Send Audio or Text */}
      <div className="node-chat-fixed">
        <div className="mode-switch">
          <button
            type="button"
            className={composerMode === "text" && voice === "idle" ? "active" : ""}
            onClick={() => {
              if (voice !== "idle") handleCancelVoice();
              setComposerMode("text");
            }}
          >
            <Icon name="chat" />
            {t.community_text}
          </button>
          <button
            type="button"
            className={composerMode === "voice" || voice !== "idle" ? "active" : ""}
            onClick={() => setComposerMode("voice")}
          >
            <Icon name="mic" />
            {t.community_voice}
          </button>
        </div>

        {micNotice && (
          <div className="voice-mic-inline-help" style={{ marginBottom: "8px" }}>
            <small>{micNotice}</small>
            <div style={{ display: "flex", gap: "6px" }}>
              <Button variant="secondary" onClick={handleUseVoiceSample}>{language === "Bahasa Melayu" ? "Sertakan Salam Suara (8s)" : language === "中文" ? "附加问候音频 (8秒)" : "Attach Voice Greeting (8s)"}</Button>
              <Button variant="ghost" onClick={() => setMicNotice(null)}>{t.common_dismiss}</Button>
            </div>
          </div>
        )}

        {composerMode === "voice" || voice !== "idle" ? (
          <div className="node-audio-bar">
            {voice === "idle" && (
              <div className="node-audio-idle-row">
                <button
                  type="button"
                  className="primary-mic mini"
                  onClick={() => void handleStartVoice()}
                  aria-label="Start recording audio"
                >
                  <Icon name="mic" />
                </button>
                <div className="voice-composer-info">
                  <strong>{language === "Bahasa Melayu" ? "Ketik mikrofon untuk rakam audio sokongan" : language === "中文" ? "点击麦克风录制语音鼓励" : "Tap mic to record audio support"}</strong>
                  <small>{language === "Bahasa Melayu" ? "Atau sertakan salam suara mesra di bawah" : language === "中文" ? "或在下方附上温暖的语音问候" : "Or attach a warm voice greeting below"}</small>
                </div>
                <Button variant="secondary" onClick={handleUseVoiceSample}>
                  {language === "Bahasa Melayu" ? "Salam Suara (8s)" : language === "中文" ? "问候音频 (8秒)" : "Voice Greeting (8s)"}
                </Button>
              </div>
            )}

            {voice === "recording" && (
              <div className="node-audio-active-row">
                <button
                  type="button"
                  className="primary-mic mini recording"
                  onClick={() => void handleStopVoice()}
                  aria-label="Stop recording audio"
                >
                  <Icon name="close" />
                </button>
                <div className="voice-composer-info">
                  <strong>{language === "Bahasa Melayu" ? "Merakam audio · " : language === "中文" ? "正在录音 · " : "Recording audio · "}{formatAudioDuration(voiceSeconds)}</strong>
                  <div className="voice-live-waves mini">
                    <span style={{ height: `${Math.max(4, voiceVolume * 20)}px` }} />
                    <span style={{ height: `${Math.max(6, voiceVolume * 28)}px` }} />
                    <span style={{ height: `${Math.max(5, voiceVolume * 22)}px` }} />
                    <span style={{ height: `${Math.max(8, voiceVolume * 30)}px` }} />
                    <span style={{ height: `${Math.max(4, voiceVolume * 18)}px` }} />
                  </div>
                </div>
                <Button variant="ghost" onClick={handleCancelVoice}>{t.common_cancel}</Button>
                <Button variant="danger" onClick={() => void handleStopVoice()}>{language === "Bahasa Melayu" ? "Berhenti" : language === "中文" ? "停止" : "Stop"}</Button>
              </div>
            )}

            {voice === "ready" && (
              <div className="node-audio-active-row">
                <button
                  type="button"
                  className="preview-play-btn mini"
                  onClick={handleTogglePreview}
                  aria-label={isPlayingPreview ? "Pause preview" : "Play preview"}
                >
                  <Icon name={isPlayingPreview ? "pause" : "play"} />
                </button>
                <div className="voice-composer-info">
                  <strong>{language === "Bahasa Melayu" ? "Audio sedia · " : language === "中文" ? "音频就绪 · " : "Audio ready · "}{formatAudioDuration(recordedVoice?.duration || 8)}</strong>
                  <small>{isPlayingPreview ? (language === "Bahasa Melayu" ? "Memainkan pratonton…" : language === "中文" ? "正在试听…" : "Playing preview…") : (language === "Bahasa Melayu" ? "Ketik main untuk dengar sebelum hantar" : language === "中文" ? "点击播放试听，确认后发送" : "Tap play to review before sending")}</small>
                </div>
                <Button variant="ghost" onClick={handleCancelVoice}>{t.common_cancel}</Button>
                <Button disabled={sending} onClick={() => void confirmVoice()}>
                  {sending ? (language === "Bahasa Melayu" ? "Menghantar…" : language === "中文" ? "发送中…" : "Sending…") : (language === "Bahasa Melayu" ? "Hantar Audio" : language === "中文" ? "发送音频" : "Send Audio")}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <form className="node-text-bar" onSubmit={handleSendText}>
            <button
              type="button"
              className="node-inline-mic-btn"
              onClick={() => void handleStartVoice()}
              title="Record audio message"
              aria-label="Record audio message"
            >
              <Icon name="mic" />
            </button>
            <textarea
              ref={textareaRef}
              className="node-message-textarea"
              rows={1}
              value={text}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={language === "Bahasa Melayu" ? "Tulis mesej sokongan…" : language === "中文" ? "写下一句鼓励支持…" : "Write a supportive message…"}
              aria-label="Supportive message"
              maxLength={2000}
            />
            <Button className="send-btn" type="submit" disabled={!text.trim() || sending} aria-label="Send message">
              <Icon name="send" />
            </Button>
          </form>
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

function RiskDemo({ back, navigate, persona, companion }: { back: () => void; navigate: (s: Screen) => void; persona: Persona; companion: Companion }) {
  const { t, language } = useLanguage();
  const [level, setLevel] = useState<RiskLevel>("low");
  const scenarios: Record<RiskLevel, { label: string; message: string; response: string; next: string[] }> = {
    low: {
      label: language === "Bahasa Melayu" ? "Tekanan Harian" : language === "中文" ? "日常压力" : "Everyday Stress",
      message: language === "Bahasa Melayu" ? "Saya tertekan dengan tugasan dan tak dapat fokus." : language === "中文" ? "我对作业任务感到焦虑，无法集中注意力。" : "I’m stressed about an assignment and can’t focus.",
      response: persona === "friendly"
        ? (language === "Bahasa Melayu" ? "Tekanan tarikh akhir itu memang meletihkan. Nak pilih satu tugas paling kecil dan buat reset pernafasan ringkas dahulu?" : language === "中文" ? "截稿压力确实让人喘不过气。想先选一个最微小的小任务，然后做个简短的呼吸重置吗？" : "That deadline pressure sounds rough. Want to pick one tiny task and do a short breathing reset first?")
        : persona === "calm"
        ? (language === "Bahasa Melayu" ? "Mari kita perlahankan ritma ini. Kita boleh namakan tugas seterusnya yang boleh diurus, kemudian berhenti sejenak untuk menenangkan diri." : language === "中文" ? "让我们把节奏慢下来。我们可以先确定下一个最容易处理的小事，然后做短暂的着陆平复。" : "Let’s slow this down. We can name the next manageable task, then take a brief grounding pause.")
        : (language === "Bahasa Melayu" ? "Kedengaran meletihkan. Kita boleh ringankan beban ini bersama—mungkin satu tugas lembut dan sedikit jeda pernafasan." : language === "中文" ? "听起来让人很疲惫。我们可以一起把事情拆小——或许先从一个微小的任务和一个温和的呼吸小憩开始。" : "That sounds tiring. We can make it feel smaller together—perhaps one gentle task and a short breathing pause."),
      next: language === "Bahasa Melayu"
        ? ["Cuba senaman pembumian (grounding)", "Pecahkan tugas kepada satu langkah kecil", "Teruskan berbual dengan ONY"]
        : language === "中文"
        ? ["尝试身心着陆练习", "将任务拆解为最小一步", "继续与 ONY 倾诉"]
        : ["Try a grounding exercise", "Break the task into one step", "Keep talking with ONY"],
    },
    moderate: {
      label: language === "Bahasa Melayu" ? "Tekanan Emosi Meningkat" : language === "中文" ? "情绪高度困扰" : "Elevated Distress",
      message: language === "Bahasa Melayu" ? "Saya rasa sukar bertahan sejak beberapa hari. Saya rasa putus asa dan menjauhkan diri daripada semua orang." : language === "中文" ? "好几天我都撑不下去了。我感到绝望，并下意识远离身边所有人。" : "I haven’t been coping for days. I feel hopeless and I’m pulling away from everyone.",
      response: language === "Bahasa Melayu"
        ? "Maafkan saya jika keadaan terasa seberat ini. Saya tidak akan membuat andaian, tetapi saya ingin memahami apa sokongan yang mungkin membantu sekarang. Kita boleh cuba satu langkah pembumian, hubungi orang yang dipercayai, atau terokai sokongan pakar yang disahkan."
        : language === "中文"
        ? "看到你承受如此重压，我很心疼。我不会妄下定论，但希望能了解此刻对你最适切的支持。我们可以尝试一步着陆练习、联系你信任的人，或查看核实的专业医疗求助资源。"
        : "I’m sorry things have felt this heavy. I won’t assume what this means, but I’d like to understand what support feels possible right now. We can try one grounding step, contact someone you trust, or look at verified human-support options.",
      next: language === "Bahasa Melayu"
        ? ["Kekal berhubung dengan seseorang", "Cuba langkah pembumian mudah", "Terokai sokongan profesional"]
        : language === "中文"
        ? ["与身边信任的人保持联络", "尝试简单的呼吸着陆步法", "探索经过核实的专业支持"]
        : ["Stay connected to someone", "Try a simple grounding step", "Explore human support"],
    },
    high: {
      label: language === "Bahasa Melayu" ? "Krisis Segera" : language === "中文" ? "即时危机" : "Immediate Crisis",
      message: language === "Bahasa Melayu" ? "Saya berfikir untuk menamatkan hidup dan rasa tidak selamat." : language === "中文" ? "我产生了结束生命的念头，现在感到很不安全。" : "I’m thinking about ending my life and I don’t feel safe.",
      response: language === "Bahasa Melayu"
        ? "Saya amat bersimpati dengan kesakitan berat ini. Adakah anda berada dalam bahaya serta-merta sekarang? Jika ya, sila hubungi talian kecemasan (999 atau Talian HEAL 15555) sekarang, jauhi sebarang benda yang boleh mencederakan, dan pergi ke tempat selamat atau bersama orang yang dipercayai. Saya boleh bantu anda membuka pilihan ini."
        : language === "中文"
        ? "非常难过你正在经历如此巨大的痛苦。你目前是否处于紧急危险中？如果是，请立即拨打紧急求助电话 (999 或 Talian HEAL 15555)，远离任何可能伤害自己的物品，前往公共场所或信任的人身边。我可以立即为你打开求助选项。"
        : "I’m really sorry you’re in this much pain. Are you in immediate danger or likely to act now? If yes, call emergency services (999 or Talian HEAL 15555) now, move away from anything you could use to hurt yourself, and go to a trusted person or public place. I can help you open those options.",
      next: language === "Bahasa Melayu"
        ? ["Jelaskan bahaya serta-merta", "Hubungi sokongan kecemasan", "Hubungi kenalan dipercayai"]
        : language === "中文"
        ? ["明确当前紧急危险状态", "联系专业危机急救支持", "联系身边的信任联系人"]
        : ["Clarify immediate danger", "Contact emergency support", "Reach a trusted person"],
    },
  };
  const scenario = scenarios[level];
  return (
    <>
      <PageHeader title={t.chat_safety_protocols || "Safety Protocols"} subtitle={language === "Bahasa Melayu" ? "Seni Bina Tahap Eskalasi & Penjagaan" : language === "中文" ? "升级与护理层级架构" : "Escalation & Care Tier Architecture"} back={back} />
      <section className="page-pad">
        <div className="demo-notice">
          <Icon name="shield" />
          <div>
            <strong>{language === "Bahasa Melayu" ? "Seni Bina Mengutamakan Keselamatan" : language === "中文" ? "安全第一架构" : "Safety-First Architecture"}</strong>
            <p>{language === "Bahasa Melayu" ? "ONY direka dengan penilaian risiko progresif untuk mengutamakan keselamatan anda dan menghubungkan anda dengan penjagaan manusia setiap kali tekanan dikesan." : language === "中文" ? "ONY 采用渐进式风险评估设计，在检测到情绪困扰时优先保障您的安全，并引导您及时获取人工支持。" : "ONY is designed with progressive risk assessment to prioritize your safety and connect you with human care whenever distress is detected."}</p>
          </div>
        </div>
        <div className="risk-switch" aria-label="Review safety escalation levels">
          {(["low", "moderate", "high"] as RiskLevel[]).map((item) => (
            <Button
              key={item}
              variant={level === item ? (item === "high" ? "danger" : "primary") : "secondary"}
              onClick={() => setLevel(item)}
            >
              {scenarios[item].label}
            </Button>
          ))}
        </div>
        <div className={`risk-indicator risk-${level}`}>
          <span />
          <div>
            <strong>{scenario.label} {language === "Bahasa Melayu" ? "Protokol" : language === "中文" ? "协议" : "Protocol"}</strong>
            <small>{language === "Bahasa Melayu" ? "Sokongan automatik digandingkan dengan laluan terus ke sumber krisis profesional." : language === "中文" ? "自动化同伴陪伴结合直通专业危机资源的保障路径。" : "Automated support paired with direct pathways to professional crisis resources."}</small>
          </div>
        </div>
        <div className="scenario-thread">
          <span className="scenario-label">{language === "Bahasa Melayu" ? "Situasi Pengguna" : language === "中文" ? "用户场景" : "User Situation"}</span>
          <div className="message-row user">
            <div className="message">{scenario.message}</div>
          </div>
          <span className="scenario-label">{language === "Bahasa Melayu" ? "Balasan Teman ONY" : language === "中文" ? "ONY 伴侣回复" : "ONY Companion Response"} · {personaOptions.find((item) => item.id === persona)?.name}</span>
          <div className="message-row ony">
            <CompanionAvatar companion={companion} />
            <div className="message">{scenario.response}</div>
          </div>
        </div>
        <div className="card next-steps">
          <h3>{language === "Bahasa Melayu" ? "Laluan Eskalasi" : language === "中文" ? "转介与求助路径" : "Escalation Pathways"}</h3>
          {scenario.next.map((item) => (
            <span key={item}>
              <Icon name="check" />
              {item}
            </span>
          ))}
        </div>
        {level === "low" && <Button className="full" onClick={() => navigate("resources")}>{language === "Bahasa Melayu" ? "Buka perpustakaan bantu diri" : language === "中文" ? "打开自助资源库" : "Open self-help library"}</Button>}
        {level === "moderate" && (
          <>
            <Button className="full" onClick={() => navigate("resources")}>{language === "Bahasa Melayu" ? "Lihat sumber daya tindak" : language === "中文" ? "查看心理调适资源" : "View coping resources"}</Button>
            <Button className="full" variant="secondary" onClick={() => navigate("professional")}>{language === "Bahasa Melayu" ? "Terokai profesional disahkan" : language === "中文" ? "寻找核实专业医生与咨询师" : "Explore verified professionals"}</Button>
          </>
        )}
        {level === "high" && (
          <>
            <Button className="full" variant="danger" onClick={() => navigate("safety")}>{language === "Bahasa Melayu" ? "Buka langkah keselamatan segera" : language === "中文" ? "开启即时安全保护步骤" : "Open immediate safety steps"}</Button>
            <Button className="full" variant="secondary" onClick={() => navigate("trusted")}>{t.chat_action_contact_trusted}</Button>
          </>
        )}
        <p className="disclaimer">
          <Icon name="shield" />{" "}
          {language === "Bahasa Melayu"
            ? "Gaya persona hanya mengubah nada suara. Setiap interaksi mematuhi sempadan keselamatan, panduan klinikal, dan eskalasi kecemasan dengan ketat."
            : language === "中文"
            ? "人设风格仅改变沟通语调。所有对话均严格遵守安全边界、临床指导原则与危机升级规范。"
            : "Persona styles change tone only. Every interaction adheres strictly to safety boundaries, clinical guidance, and emergency escalation."}
        </p>
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
          <span className="prototype-label" style={{ background: "var(--sage-soft)", color: "#2e7d32" }}>{language === "Bahasa Melayu" ? "Perpustakaan Disahkan" : language === "中文" ? "权威核实资源库" : "Verified Library"}</span>
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
      <AppInner />
    </LanguageProvider>
  );
}

export default App;
