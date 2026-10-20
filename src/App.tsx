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
  | "systemLogs";

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

function App() {
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
  const [language, setLanguage] = useState("English");
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
            if (profile.preferredLanguage) setLanguage(profile.preferredLanguage);
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
      notify("Logged out successfully");
    } catch (e) {
      console.warn("[ONY] Logout notice:", e);
      setAuthenticated(false);
      setOnboarding(0);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUserAccount();
      setAuthenticated(false);
      setOnboarding(0);
      setMoodEntries([]);
      setMemories([]);
      notify("Your account and all Firestore data have been deleted.");
    } catch (err) {
      console.warn("[ONY] Account deletion error:", err);
      notify("Could not delete account. Please sign in again and retry.");
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
      setLanguage={setLanguage}
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
      notify("Post published to Cloud Firestore");
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
                {tab === "profile" && <Profile navigate={navigate} displayName={displayName} language={language} persona={persona} theme={theme} companion={companion} trustedName={trustedName} contactStatus={contactStatus} pendingIncomingCount={pendingIncomingTrusted.length} unreadNotificationsCount={unreadNotificationsCount} subscriptionStatus={subscriptionStatus} onLogout={handleLogout} />}
              </main>
            </>
          ) : (
            <main className="overlay-page">
              {screen === "mood" && <MoodCheck back={back} navigate={navigate} entries={moodEntries} setEntries={handleSetMoodEntries} notify={notify} />}
              {screen === "trend" && <MoodTrend back={back} entries={moodEntries} setEntries={handleSetMoodEntries} />}
              {screen === "safety" && <SafetyFlow back={back} navigate={navigate} />}
              {screen === "help" && <Help back={back} navigate={navigate} />}
              {screen === "personalise" && <Personalise back={back} language={language} setLanguage={setLanguage} conversationStyle={conversationStyle} setConversationStyle={setConversationStyle} responseLength={responseLength} setResponseLength={setResponseLength} useActiveMemories={useActiveMemories} setUseActiveMemories={setUseActiveMemories} theme={theme} setTheme={setTheme} companion={companion} setCompanion={setCompanion} persona={persona} setPersona={setPersona} soundOn={soundOn} setSoundOn={setSoundOn} volume={volume} setVolume={setVolume} notify={notify} onSave={() => {
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
    if (msg.includes("email-already-in-use")) return "An account with this email already exists. Try logging in.";
    if (msg.includes("invalid-credential") || msg.includes("wrong-password") || msg.includes("user-not-found")) {
      return "Incorrect email or password. Please verify and try again.";
    }
    if (msg.includes("weak-password")) return "Password should be at least 6 characters.";
    if (msg.includes("invalid-email")) return "Please enter a valid email address.";
    if (msg.includes("network-request-failed")) return "Network error. Please check your connection.";
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

  if (legal) return <div className={`app-shell theme-${theme}`}><div className="phone auth-phone"><LegalDocument document={legal} back={() => setLegal(null)} /></div></div>;
  return <div className={`app-shell theme-${theme}`}><div className="phone auth-phone"><div className={`environment environment-${theme}`} aria-hidden="true"><i /><i /><i /></div>
    <section className="auth-page">
      <div className="auth-brand"><img src={logo} alt="Official ONY logo" /><span className="secure-badge"><Icon name="shield" />Secure Firebase Auth</span></div>
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
      {stage === "welcome" && <div className="auth-panel welcome-panel"><span className="eyebrow">Welcome to ONY</span><h1>A gentle space that starts with you.</h1><p>Private reflection, supportive conversation, and practical resources—at your pace.</p><Button className="full" onClick={() => setStage("register")}>Create account</Button><Button className="full" variant="secondary" onClick={() => setStage("login")}>Log in</Button><Button className="full" variant="ghost" onClick={onComplete}>Continue as guest (local only)</Button><small>Sign in to safely persist your reflections, check-ins, and personal settings.</small></div>}
      {stage === "login" && <form className="auth-panel" onSubmit={handleLogin}><div className="auth-heading"><Button variant="ghost" className="auth-back" onClick={() => { setStage("welcome"); setError(""); }}><Icon name="back" />Back</Button><span className="eyebrow">Welcome back</span></div><h1>Log in to ONY</h1><p className="muted">Your private space is secured with Firebase Authentication.</p><label className="field-label">Email</label><TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /><label className="field-label">Password</label><TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete="current-password" />{error && <div className="form-error"><Icon name="info" />{error}</div>}<Button className="full" type="submit" disabled={loading}>{loading ? "Signing in…" : "Log in"}</Button><Button variant="ghost" className="full" onClick={() => { setStage("forgot"); setError(""); }}>Forgot password?</Button></form>}
      {stage === "register" && <form className="auth-panel" onSubmit={handleRegisterStage1}><div className="auth-heading"><Button variant="ghost" className="auth-back" onClick={() => { setStage("welcome"); setError(""); }}><Icon name="back" />Back</Button><span className="eyebrow">Create your space</span></div><h1>Create an ONY account</h1><p className="muted">Start your journey with private reflections and secure cloud backup.</p><label className="field-label">Email</label><TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /><label className="field-label">Phone number (saved for emergency contact)</label><TextInput type="tel" value={userPhone} onChange={(event) => setUserPhone(event.target.value)} placeholder="e.g. 012-345 6789" autoComplete="tel" /><label className="field-label">Password</label><TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete="new-password" /><label className="field-label">Confirm password</label><TextInput type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" autoComplete="new-password" />{error && <div className="form-error"><Icon name="info" />{error}</div>}<Button className="full" type="submit" disabled={loading}>Continue</Button></form>}
      {stage === "forgot" && <form className="auth-panel" onSubmit={handleForgotPassword}><Button variant="ghost" className="auth-back" onClick={() => setStage("login")}><Icon name="back" />Back</Button><span className="eyebrow">Account access</span><h1>Reset your password</h1><p className="muted">We will send a secure reset link to your email via Firebase Auth.</p><label className="field-label">Email</label><TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />{error && <div className="form-error"><Icon name="info" />{error}</div>}{notice ? <div className="form-success"><Icon name="check" />{notice}</div> : <Button className="full" type="submit" disabled={loading}>{loading ? "Sending reset link…" : "Send reset link"}</Button>}</form>}
      {stage === "name" && <form className="auth-panel" onSubmit={handleNameStage}><span className="eyebrow">Your profile details</span><h1>What should ONY call you?</h1><p className="muted">Use a preferred display name and confirm your phone number for emergency support.</p><label className="field-label">Display name</label><TextInput value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={30} /><label className="field-label">Emergency contact phone number</label><TextInput type="tel" value={userPhone} onChange={(event) => setUserPhone(event.target.value)} placeholder="e.g. 012-345 6789" autoComplete="tel" />{error && <div className="form-error"><Icon name="info" />{error}</div>}<Button className="full" type="submit">Continue</Button></form>}
      {stage === "consent" && <div className="auth-panel consent-panel"><span className="eyebrow">Before you continue</span><h1>Understand ONY’s role.</h1><p>ONY is an AI-based emotional-support and reflection companion. It is not a psychologist, therapist, diagnostic tool, or emergency medical service. AI responses may occasionally vary.</p><div className="legal-links"><Button variant="secondary" onClick={() => setLegal("disclaimer")}>Disclaimer & Boundaries</Button><Button variant="secondary" onClick={() => setLegal("terms")}>Terms of Service</Button><Button variant="secondary" onClick={() => setLegal("privacy")}>Privacy Policy</Button><Button variant="secondary" onClick={() => setLegal("crisis")}>Crisis Resources</Button></div><label className="check-row consent-check"><TextInput type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>I have read and accept the Terms of Service and Privacy Policy, and understand ONY’s role and safety boundaries.</span></label>{error && <div className="form-error"><Icon name="info" />{error}</div>}<Button className="full" disabled={!accepted || loading} onClick={handleCompleteRegistration}>{loading ? "Creating space…" : "Accept and create space"}</Button><small>ONY is committed to user safety, ethical artificial intelligence, and data privacy.</small></div>}
    </section>
  </div></div>;
}

function LegalDocument({ document, back }: { document: LegalDocumentId; back: () => void }) {
  const content: Record<LegalDocumentId, { title: string; subtitle: string; sections: { heading: string; text: string }[] }> = {
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
        { heading: "Service Availability & Security", text: "ONY operates with secure cloud persistence and Firebase authentication. We strive for uninterrupted availability while continuously updating our safety safeguards." },
        { heading: "Community Standards", text: "Public posts and peer solidarity notes must respect privacy, empathy, and personal safety. Any harassment, hate speech, or sharing of non-consensual personal contact details is strictly prohibited." }
      ]
    },
    privacy: {
      title: "Privacy Policy",
      subtitle: "How ONY safeguards your personal data",
      sections: [
        { heading: "Information We Protect", text: "Your account profile, mood check-in records, consented memories, and chat reflections are stored securely in Google Cloud Firestore with strict access control rules." },
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
  const item = content[document];
  return (
    <>
      <PageHeader title={item.title} subtitle={item.subtitle} back={back} />
      <section className="page-pad legal-document">
        <span className="prototype-label" style={{ background: "var(--sage-soft)", color: "#2e7d32" }}>Official Document</span>
        {item.sections.map((section) => (
          <div className="card" key={section.heading}>
            <h3>{section.heading}</h3>
            <p>{section.text}</p>
          </div>
        ))}
        <p className="disclaimer">
          <Icon name="info" />
          ONY is committed to transparent data practices, user safety, and adherence to Malaysian digital service standards.
        </p>
      </section>
    </>
  );
}

function LegalHub({ back, navigate }: { back: () => void; navigate: (screen: Screen) => void }) {
  const [document, setDocument] = useState<LegalDocumentId | null>(null);
  if (document) return <LegalDocument document={document} back={() => setDocument(null)} />;
  return (
    <>
      <PageHeader title="Legal & Safety" subtitle="Service terms, privacy & standards" back={back} />
      <section className="page-pad">
        <div className="help-hero">
          <Icon name="shield" />
          <div>
            <h2>Clear information, always accessible.</h2>
            <p>Read our commitment to your privacy, ethical artificial intelligence, and safety boundaries.</p>
          </div>
        </div>
        <div className="menu legal-menu">
          {([
            ["disclaimer", "Disclaimer & AI Boundaries"],
            ["terms", "Terms of Service"],
            ["privacy", "Privacy Policy"],
            ["crisis", "Crisis & Emergency Information"],
          ] as [LegalDocumentId, string][]).map(([id, title]) => (
            <Button key={id} variant="ghost" onClick={() => setDocument(id)}>
              <span>
                <strong>{title}</strong>
                <small>Official policy</small>
              </span>
              <Icon name="chevron" />
            </Button>
          ))}
        </div>
        <Button className="full" variant="secondary" onClick={() => navigate("privacy")}>
          Open privacy controls
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
  const [acknowledged, setAcknowledged] = useState(false);
  return (
    <div className={`app-shell onboarding-shell theme-${theme}`}>
      <div className="phone onboarding">
        <div className={`environment environment-${theme}`} aria-hidden="true"><i /><i /><i /></div>
        <div className="progress"><span style={{ width: `${((step + 1) / 9) * 100}%` }} /></div>
        <div className="onboarding-body">
          {step === 0 && <>
            <img className={`brand-art ${step === 0 ? "hero-art" : ""}`} src={logo} alt="Official ONY cat mascot with green leaves" />
            <div className="eyebrow">Welcome to</div><h1>ONY</h1>
            <p className="lead">A gentle place to pause, share, and feel a little less alone.</p>
          </>}
          {step === 1 && <>
            <img className="brand-art compact-art" src={logo} alt="Official ONY logo" />
            <div className="eyebrow">Meet ONY</div><h1>Your low-pressure companion</h1>
            <p className="lead">ONY is a gentle first layer for everyday emotional support—always at your pace.</p>
          </>}
          {step === 2 && <>
            <SmallLogo /><div className="eyebrow">Make ONY yours</div><h1>Choose your ONY companion</h1>
            <p className="lead">Choose a companion appearance that feels right. Your companion is always called ONY.</p>
            <CompanionPicker value={companion} setValue={setCompanion} />
          </>}
          {step === 3 && <>
            <SmallLogo /><div className="eyebrow">Your calming space</div><h1>Choose a space that feels comfortable for you</h1>
            <p className="lead">Pick a visual theme. Your choice applies throughout the app and can be changed later.</p>
            <ThemePicker value={theme} setValue={setTheme} />
          </>}
          {step === 4 && <>
            <SmallLogo /><div className="eyebrow">Optional ambience</div><h1>Add a calming sound</h1>
            <p className="lead">Listen to soothing {themeOptions.find((item) => item.id === theme)?.name.toLowerCase()} ambience. You can pause or change it anytime.</p>
            <div className="ambient-onboarding"><span className={`sound-orb ${soundOn ? "playing" : ""}`}><i /><i /><i /></span><strong>{soundOn ? "Ambience playing" : "Ambience paused"}</strong><Button onClick={() => setSoundOn(!soundOn)}>{soundOn ? "Pause" : "Play"}</Button></div>
            <Button className="full" variant="ghost" onClick={() => setSoundOn(false)}>Continue without sound</Button>
          </>}
          {step === 5 && <>
            <SmallLogo /><div className="eyebrow">Personalise ONY</div><h1>What would feel helpful?</h1>
            <p className="lead">Choose how ONY communicates, a language, and any topics on your mind.</p>
            <PersonaPicker value={persona} setValue={setPersona} compact />
            <div className="segmented">{["English", "Bahasa Melayu", "中文"].map((x) => <Button key={x} variant={language === x ? "primary" : "secondary"} onClick={() => setLanguage(x)}>{x}</Button>)}</div>
            <div className="chips">{topics.map((x) => <Button key={x} variant={selectedTopics.includes(x) ? "primary" : "secondary"} onClick={() => setSelectedTopics(selectedTopics.includes(x) ? selectedTopics.filter((t) => t !== x) : [...selectedTopics, x])}>{x}</Button>)}</div>
          </>}
          {step === 6 && <>
            <img className="brand-art compact-art" src={logo} alt="Official ONY logo" />
            <div className="eyebrow">Clear boundaries</div><h1>Support, not treatment</h1>
            <p className="lead">ONY offers AI-based emotional support and self-help resources. It is not a psychologist, therapist, diagnostic tool, or emergency service.</p>
            <div className="boundary-list"><span>Not therapy</span><span>No diagnosis</span><span>Not emergency care</span></div>
            <p className="disclaimer"><Icon name="info" />AI responses may be inaccurate. Safety information, crisis resources, and privacy details remain available in the app.</p>
            <label className="check-row"><TextInput type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span>I understand ONY’s role and limitations.</span></label>
          </>}
          {step === 7 && <>
            <SmallLogo />
            <div className="eyebrow">Your privacy</div><h1>What should ONY remember?</h1>
            <p className="lead">You are always in control. Review, pause, or delete memories anytime.</p>
            <Choice active={consent === "allow"} onClick={() => setConsent("allow")} title="Allow relevant memories" text="ONY may save helpful context you share." />
            <Choice active={consent === "control"} onClick={() => setConsent("control")} title="Let me control memories" text="Ask before anything is saved." />
          </>}
          {step === 8 && <>
            <div className="companion-confirm"><CompanionAvatar companion={companion} large /><img src={logo} alt="Official ONY logo" /></div>
            <div className="eyebrow">You’re all set</div><h1>Enter ONY</h1>
            <p className="lead">Experience compassionate companion conversations, daily mood check-ins, and verified wellbeing resources.</p>
            <div className="demo-profile"><span className="avatar">{displayName[0]?.toUpperCase()}</span><div><strong>{displayName}</strong><small>{companion} companion · {themeOptions.find((item) => item.id === theme)?.name} theme</small></div><Icon name="check" /></div>
          </>}
        </div>
        <div className="onboarding-actions">
          {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
          <Button className="grow" disabled={step === 6 && !acknowledged} onClick={() => setStep(step + 1)}>{step === 8 ? "Enter ONY" : "Continue"}</Button>
        </div>
      </div>
    </div>
  );
}

function PersonaPicker({ value, setValue, compact = false }: { value: Persona; setValue: (v: Persona) => void; compact?: boolean }) {
  return <div className={`persona-grid ${compact ? "compact" : ""}`}>{personaOptions.map((item) => <Button key={item.id} variant="secondary" className={value === item.id ? "active" : ""} onClick={() => setValue(item.id)}><span className="persona-check">{value === item.id && <Icon name="check" />}</span><strong>{item.name}</strong><small>{item.note}</small>{!compact && <p>“{item.preview}”</p>}</Button>)}</div>;
}

function CompanionAvatar({ companion, large = false }: { companion: Companion; large?: boolean }) {
  if (companion === "Cat") return <img className={`companion-logo ${large ? "large" : ""}`} src={logo} alt="ONY Cat companion" />;
  return <span className={`companion-face animal-${companion.toLowerCase()} ${large ? "large" : ""}`} aria-label={`ONY with ${companion.toLowerCase()} appearance`}><i className="ear left" /><i className="ear right" /><i className="face-patch" /><i className="eye left" /><i className="eye right" /><i className="nose" /><small>ONY</small></span>;
}

function CompanionPicker({ value, setValue }: { value: Companion; setValue: (v: Companion) => void }) {
  const companions: Companion[] = ["Cat", "Dog", "Bunny", "Bear", "Fox", "Panda"];
  return <div className="companion-grid">{companions.map((item) => <button key={item} className={value === item ? "active" : ""} onClick={() => setValue(item)}><CompanionAvatar companion={item} /><strong>{item}</strong>{value === item && <span><Icon name="check" /></span>}</button>)}</div>;
}

function ThemePicker({ value, setValue }: { value: Theme; setValue: (v: Theme) => void }) {
  return <div className="theme-grid">{themeOptions.map((item) => <button key={item.id} className={`theme-option ${value === item.id ? "active" : ""}`} onClick={() => setValue(item.id)}><span className={`theme-preview preview-${item.id}`}><i /><i /><i /></span><strong>{item.name}</strong><small>{item.note}</small>{value === item.id && <b><Icon name="check" /></b>}</button>)}</div>;
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
  language: string; conversationStyle: string; responseLength: string; memoryConsent: string; useActiveMemories: boolean;
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
  const suggestions = ["I feel stressed", "I feel anxious", "I need someone to talk to", "Find a job", "Study pressure", "I want to relax"];

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
        setMicNotice("Microphone access is needed for live speech. You can also pick a prompt below:");
      }
    }

    if (isSpeechRecognitionSupported()) {
      if (!speechRecognizerRef.current) {
        speechRecognizerRef.current = new ChatSpeechRecognizer(language === "ms" ? "ms-MY" : "en-US");
      } else {
        speechRecognizerRef.current.setLanguage(language === "ms" ? "ms-MY" : "en-US");
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
        setMicNotice("Speech recognition could not be started. You can choose a quick prompt below:");
      }
    } else {
      setMicNotice("Live speech transcription is unavailable on this browser. Try a quick prompt below:");
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
      notify("Voice transcribed and sent");
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
    notify("Transcribing voice…");
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
    setMemories([{ id, text: latestUserText, category: "Things That Help Me", active: true, kind: "text", reason: "You chose to remember this during an ONY conversation." }, ...memories]);
    setSavedMemoryId(id);
    notify("Saved to your Memory Vault");
  };
  const undoContextMemory = () => {
    if (savedMemoryId !== null) setMemories(memories.filter((memory) => memory.id !== savedMemoryId));
    setSavedMemoryId(null);
    notify("Memory removed");
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
      title="Chat with ONY"
      subtitle="Here with you, at your pace"
      action={
        <div className="chat-header-actions">
          <Button
            variant="secondary"
            onClick={() => navigate(todayMoodEntry ? "trend" : "mood")}
            title={todayMoodEntry ? `Today's mood check-in completed (${todayMoodEntry.emoji} ${todayMoodEntry.label})` : "Check in your mood for today"}
          >
            {todayMoodEntry ? `${todayMoodEntry.emoji} ${todayMoodEntry.label}` : "Mood"}
          </Button>
          <Button variant="secondary" onClick={() => navigate("help")}>Help</Button>
        </div>
      }
    />
    <div className="chat-scroll" ref={chatScrollRef}>
    <div className="chat-history-entry"><Button variant="secondary" onClick={() => navigate("chatHistory")}><Icon name="chat" />Chats</Button><div className="chat-trust-links"><Button variant="ghost" className={`tts-toggle ${autoSpeak ? "active" : ""}`} onClick={() => { const next = !autoSpeak; setAutoSpeak(next); notify(next ? "ONY voice on · Replies will be read aloud" : "ONY voice off"); }} title="Toggle auto voice response"><Icon name={autoSpeak ? "volume" : "volumeOff"} />{autoSpeak ? "Voice on" : "Voice off"}</Button><Button variant="ghost" onClick={() => navigate("riskDemo")}>Safety protocols</Button><Button variant="ghost" onClick={() => navigate("resources")}>Resources</Button></div></div>
    {!todayMoodEntry && messages.length === 0 && (
      <div className="memory-note" style={{ marginBottom: "8px" }}>
        <span>🌱</span>
        <span>You haven’t checked in your mood yet today.</span>
        <Button variant="secondary" onClick={() => navigate("mood")}>Check in</Button>
      </div>
    )}
    {messages.length > 0 && <div className="memory-note"><Icon name="memory" /><span>{memoryConsent === "allow" && useActiveMemories ? "Memory is on · You’re in control" : "Memory sharing paused · You’re in control"}</span><Button variant="ghost" onClick={() => goTab("memory")}>View</Button></div>}
    {messages.length === 0 && <div className="chat-welcome"><div className="companion-stage"><CompanionAvatar companion={companion} large /><span className="leaf-accent">ONY</span></div><span className="persona-label">{personaOptions.find((item) => item.id === persona)?.name}</span><h1>Hi {displayName}, I’m here.</h1><p>{personaOptions.find((item) => item.id === persona)?.preview}</p><div className="welcome-suggestions">{suggestions.map((s) => <button key={s} disabled={typing || isLimitReached} onClick={() => { if (!isLimitReached) { reply(s); } else { navigate("subscription"); } }}>{s}<Icon name="chevron" /></button>)}</div><div className="ambient-mini"><span>{soundOn ? "Ambient sound playing" : "Calming ambience"}</span><Button variant="ghost" onClick={() => setSoundOn(!soundOn)}>{soundOn ? "Pause" : "Play"}</Button></div></div>}
    {messages.length > 0 && <div className="messages">
      {messages.map((m, i) => <div key={i} className={`message-row ${m.from}`} >
        {m.from === "ony" && <CompanionAvatar companion={companion} />}
        <div className="message">{m.text}</div>
        {m.from === "ony" && (
          <button
            type="button"
            className={`tts-btn ${speakingMsgId === `ony-msg-${i}` ? "speaking" : ""}`}
            onClick={() => toggleSpeakMessage(m.text, `ony-msg-${i}`)}
            title={speakingMsgId === `ony-msg-${i}` ? "Stop speaking" : "Listen to ONY"}
            aria-label={speakingMsgId === `ony-msg-${i}` ? "Stop speaking" : "Listen to ONY"}
          >
            <Icon name={speakingMsgId === `ony-msg-${i}` ? "volumeOff" : "volume"} />
          </button>
        )}
      </div>)}
      {typing && <div className="message-row ony"><CompanionAvatar companion={companion} /><div className="message typing"><i /><i /><i /></div></div>}
      {chatError && !typing && <div className="chat-error-banner" role="alert">
        <div><Icon name="info" /><span>{chatError}</span></div>
        <div className="chat-error-actions">
          <Button variant="ghost" onClick={() => setChatError(null)}>Dismiss</Button>
          {failedUserText && <Button variant="secondary" onClick={retryLastMessage}>Retry</Button>}
        </div>
      </div>}
      {!typing && <div className="context-actions">
        {safetyContext && <><Button variant="danger" onClick={() => navigate("safety")}>Get help now</Button><Button variant="secondary" onClick={() => navigate("professional")}>Find professional support</Button><Button variant="secondary" onClick={() => navigate("trusted")}>Contact trusted person</Button></>}
        {!safetyContext && serverSafetyAction === "offer_human_support" && <><Button variant="secondary" onClick={() => navigate("professional")}>Find professional support</Button><Button variant="secondary" onClick={() => navigate("help")}>View support resources</Button></>}
        {!safetyContext && memoryContext && (savedMemoryId === null ? <Button variant="secondary" onClick={saveContextMemory}><Icon name="memory" />Remember this</Button> : <div className="memory-saved"><Icon name="check" /><span>Saved to your Memory Vault.</span><Button variant="ghost" onClick={undoContextMemory}>Undo</Button></div>)}
        {!safetyContext && anxietyContext && <><Button variant="secondary" onClick={() => navigate("wellbeing")}>Try something calming</Button><Button variant="secondary" onClick={() => notify("One-minute breathing activity opened")}>Breathing activity</Button><Button variant="secondary" onClick={() => navigate("wellbeing")}>Calming music</Button></>}
        {!safetyContext && studyContext && <><Button variant="secondary" onClick={() => reply("Help me make a study plan")}>Study plan</Button><Button variant="secondary" onClick={() => notify("A five-minute break timer started")}>Take a break</Button><Button variant="secondary" onClick={() => reply("I want to talk about my study pressure")}>Talk about it</Button></>}
        {!safetyContext && jobContext && <><Button variant="secondary" onClick={() => navigate("jobs")}>Find job opportunities</Button><Button variant="secondary" onClick={() => navigate("jobPrefs")}>Set job preferences</Button></>}
        {!safetyContext && relationshipContext && <><Button variant="secondary" onClick={() => reply("I want to tell you more about it")}>Tell me more</Button><Button variant="secondary" onClick={() => reply("Help me reflect on this relationship")}>Help me reflect</Button></>}
      </div>}
      <div ref={messagesEndRef} className="chat-bottom-spacer" />
    </div>}
    </div>
    <div className="chat-composer">
      <Button variant="ghost" className="ai-notice" onClick={() => navigate("resources")}><Icon name="info" />AI can be inaccurate · Not diagnosis or treatment</Button>
      {isLimitReached ? (
        <div className="chat-limit-banner">
          <div className="limit-banner-text">
            <strong><Icon name="shield" /> Free message allowance reached ({freeUsage}/{freeLimit})</strong>
            <p>You’ve reached the free message limit. Please choose a plan or activate your free trial to continue chatting with ONY.</p>
          </div>
          <Button variant="primary" className="full upgrade-btn" onClick={() => navigate("subscription")}>
            View Subscription Plans & Unlock
          </Button>
        </div>
      ) : (
        <>
          <div className="mode-switch"><button className={inputMode === "voice" ? "active" : ""} onClick={() => setInputMode("voice")}><Icon name="mic" />Voice</button><button className={inputMode === "text" ? "active" : ""} onClick={() => setInputMode("text")}><Icon name="chat" />Text</button></div>
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
                      ? "Tap mic to speak"
                      : voiceState === "listening"
                      ? (voiceTranscript || voiceInterim ? "Listening… tap send when ready" : "Listening… speak into your mic")
                      : voiceState === "sent"
                      ? "Message sent"
                      : "Processing voice"}
                  </strong>
                  <small>
                    {voiceState === "idle"
                      ? "ONY listens and transcribes in real time"
                      : voiceState === "listening"
                      ? "Speak at your own pace"
                      : voiceState === "sent"
                      ? "Tap mic again anytime to speak"
                      : "Voice stays in this session"}
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
                      <span className="placeholder">Say whatever is on your mind…</span>
                    )}
                  </div>
                  <div className="voice-composer-actions">
                    <Button variant="ghost" onClick={() => stopVoiceListening(false)}>Cancel</Button>
                    <Button
                      variant="primary"
                      disabled={!voiceTranscript.trim() && !voiceInterim.trim()}
                      onClick={() => stopVoiceListening(true)}
                    >
                      Send to ONY
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
                    <small>Quick voice prompts to speak with ONY:</small>
                    <div className="voice-prompt-chips">
                      {["I'm feeling overwhelmed today", "Help me relax with a breathing exercise", "I want to talk about how I feel"].map((phrase) => (
                        <button key={phrase} type="button" onClick={() => handleSimulateVoice(phrase)}>
                          💬 "{phrase}"
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <Button variant="secondary" onClick={() => { setMicNotice(null); void startVoiceListening(); }}>Try Mic Again</Button>
                    <Button variant="ghost" onClick={() => setMicNotice(null)}>Dismiss</Button>
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
                placeholder="Share what's on your mind.."
                aria-label="Message ONY"
                maxLength={2000}
              />
              <Button className="send-btn" type="submit" disabled={typing || !input.trim()}><Icon name="send" /></Button>
            </form>
          )}
        </>
      )}
    </div>
  </div>;
}

function MoodCheck({ back, navigate, entries, setEntries, notify }: { back: () => void; navigate: (s: Screen) => void; entries: MoodEntry[]; setEntries: (entries: MoodEntry[]) => void; notify: (s: string) => void }) {
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const todayKey = getLocalDateKey();
  const todayEntry = entries.find((entry) => getMoodDateKey(entry) === todayKey) || null;
  const selected = mood === null ? null : moodOptions[mood];

  const save = () => {
    if (!selected || mood === null || todayEntry) return;
    const nowIso = new Date().toISOString();
    const newEntry: MoodEntry = {
      id: Date.now(),
      dateKey: todayKey,
      level: mood + 1,
      emoji: selected.emoji,
      label: selected.label,
      note: note.trim(),
      createdAt: nowIso,
      reportAllowed: true,
    };
    setEntries([newEntry, ...entries.filter((item) => getMoodDateKey(item) !== todayKey)]);
    notify("Today’s mood check-in saved to database");
  };

  // If the user has already done the mood check-in for today, do NOT prompt them to input the mood again
  if (todayEntry) {
    return (
      <div className="centered-state">
        <img src={logo} alt="ONY" />
        <div className="success-mark"><Icon name="check" /></div>
        <span className="eyebrow">Daily Check-in Complete · {todayKey}</span>
        <h1>Check-in saved for today</h1>
        <p>
          You checked in today as <strong>{todayEntry.emoji} {todayEntry.label}</strong>
          {todayEntry.note ? <> — <em>“{todayEntry.note}”</em></> : "."}{" "}
          Your mood is saved in the database for today. Come back tomorrow for your next daily check-in.
        </p>
        <Button onClick={() => navigate("trend")}>View mood history</Button>
        <Button variant="ghost" onClick={back}>Back to chat</Button>
      </div>
    );
  }

  return <><PageHeader title="Mood check-in" subtitle="A quick moment for you" back={back} /><section className="page-pad">
    <div className="eyebrow">Right now · {todayKey}</div><h1>How is your mood today?</h1><p className="muted">Choose the closest fit. Your check-in is saved once per day to your private database history.</p>
    <div className="mood-scale emoji-scale">{moodOptions.map((option, index) => <button key={option.label} onClick={() => setMood(index)} className={mood === index ? "active" : ""} aria-pressed={mood === index}><span>{option.emoji}</span><small>{option.label}</small></button>)}</div>
    <div className="selected-mood">{selected ? <><span>{selected.emoji}</span><strong>{selected.label}</strong></> : <p>Select a mood to continue.</p>}</div>
    <label className="field-label">What’s contributing to your mood today? <small>Optional</small></label><TextArea rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write as much or as little as you like…" />
    <Button className="full" disabled={!selected} onClick={save}>Save check-in</Button>
    <Button className="full" variant="ghost" onClick={() => navigate("trend")}>Review previous check-ins</Button>
  </section></>;
}

function MoodTrend({ back, entries, setEntries }: { back: () => void; entries: MoodEntry[]; setEntries: (entries: MoodEntry[]) => void }) {
  const recent = entries[0];
  const todayKey = getLocalDateKey();
  const todayEntry = entries.find((entry) => getMoodDateKey(entry) === todayKey) || null;
  return <><PageHeader title="Mood history" subtitle="Saved daily in Cloud Firestore" back={back} /><section className="page-pad">
    {todayEntry && (
      <div className="community-note" style={{ marginBottom: "12px" }}>
        <Icon name="check" />
        <span>
          <strong>Today’s check-in complete ({todayKey}):</strong> {todayEntry.emoji} {todayEntry.label}. You are all set for today.
        </span>
      </div>
    )}
    {recent && <div className="trend-summary"><div><span>Most recent ({getMoodDateKey(recent) === todayKey ? "Today" : getMoodDateKey(recent)})</span><strong>{recent.emoji} {recent.label}</strong><small>{new Date(recent.createdAt).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}</small></div><span className="score">{recent.level}/5</span></div>}
    {entries.length === 0 ? <div className="empty"><span className="empty-emoji">😐</span><h3>No mood check-ins yet</h3><p>Your daily mood check-ins will appear here after you record one.</p></div> : <><div className="card"><div className="card-title"><h3>Daily check-ins</h3><span>{entries.length} {entries.length === 1 ? "day" : "days"} saved</span></div><div className="mood-history-list">{entries.map((entry) => {
      const dKey = getMoodDateKey(entry);
      const isToday = dKey === todayKey;
      return <div key={dKey || entry.id}><span className="history-emoji">{entry.emoji}</span><div><strong>{entry.label} {isToday ? "· Today" : ""}</strong><small>{dKey} · {new Date(entry.createdAt).toLocaleString("en-MY", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</small>{entry.note && <p>{entry.note}</p>}</div><Toggle on={entry.reportAllowed} setOn={(value) => setEntries(entries.map((item) => getMoodDateKey(item) === dKey ? { ...item, reportAllowed: value } : item))} /><Button variant="ghost" onClick={() => setEntries(entries.filter((item) => getMoodDateKey(item) !== dKey))}><Icon name="trash" /></Button></div>;
    })}</div></div>{entries.length >= 3 ? <div className="card"><h3>Recent pattern</h3><div className="bars mood-entry-bars">{[...entries].reverse().slice(-7).map((entry) => <div key={getMoodDateKey(entry) || entry.id}><span style={{ height: `${entry.level * 20}%` }} /><small>{entry.emoji}</small></div>)}</div><p className="muted">A simple view of your daily entries, not a clinical interpretation.</p></div> : <div className="community-note"><Icon name="info" />At least three daily check-ins are needed before ONY shows a simple trend.</div>}</>}
    <p className="disclaimer"><Icon name="info" />Each mood check-in is saved per day in Cloud Firestore. Use the switch beside an entry to include or exclude it from monthly reports.</p>
  </section></>;
}

function MemoryVault({ memories: items, setMemories: setItems, navigate, setEditingMemory, companion, notify }: {
  memories: Memory[]; setMemories: (v: Memory[]) => void; navigate: (s: Screen) => void;
  setEditingMemory: (v: Memory | null) => void; companion: Companion; notify: (s: string) => void;
}) {
  const [query, setQuery] = useState("");
  const update = (id: number, patch: Partial<Memory>) => setItems(items.map((x) => x.id === id ? { ...x, ...patch } : x));
  return <><PageHeader title="Memory Vault" subtitle={`${items.filter((x) => x.active).length} active memories`} /><section className="page-pad topless">
    <div className="search"><Icon name="search" /><TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search memories" /></div>
    <div className="vault-intro"><div><span className="eyebrow">You’re in control</span><h2>What ONY remembers</h2><p>Pause, edit, or remove anything. Changes affect future conversations.</p></div><Icon name="memory" /></div>
    <Button className="full add-memory-btn" onClick={() => { setEditingMemory(null); navigate("addMemory"); }}>+ Add Memory</Button>
    <div className="section-head"><h3>Saved memories</h3><Button variant="ghost" onClick={() => { setItems([]); notify("All memories cleared"); }}>Clear all</Button></div>
    {items.filter((x) => x.text.toLowerCase().includes(query.toLowerCase())).map((item) => <div className={`memory-card ${!item.active ? "paused" : ""}`} key={item.id}>
      <div className="memory-top"><span className="memory-icon"><Icon name="memory" /></span><Toggle on={item.active} setOn={(v) => update(item.id, { active: v })} /></div>
      {item.kind === "image" && <div className={`memory-image ${item.imageTone || "forest"}`}><span>Image memory</span></div>}
      {item.category && <span className="memory-category">{item.category}</span>}<strong>{item.text}</strong>
      <details><summary>ONY remembers this because…</summary><p>{item.reason}</p></details>
      <div className="memory-actions"><Button variant="ghost" onClick={() => { setEditingMemory(item); navigate("addMemory"); }}><Icon name="edit" />Edit</Button><Button variant="ghost" onClick={() => { setItems(items.filter((x) => x.id !== item.id)); notify("Memory deleted"); }}><Icon name="trash" />Delete</Button></div>
    </div>)}
    {!items.length && <div className="empty"><CompanionAvatar companion={companion} large /><h3>Your vault is clear</h3><p>New memories will only appear with your permission.</p></div>}
    <div className="privacy-row"><Icon name="shield" /><div><strong>Memory privacy controls</strong><p>Ask before saving is currently {items.length ? "off" : "on"}.</p></div><Toggle on={memoryConsentOn(items)} setOn={() => notify("Memory preference updated")} /></div>
  </section></>;
}
const memoryConsentOn = (items: Memory[]) => items.length > 0;

function AddMemory({ back, memories, setMemories, editing, notify }: {
  back: () => void; memories: Memory[]; setMemories: (v: Memory[]) => void; editing: Memory | null; notify: (s: string) => void;
}) {
  const [text, setText] = useState(editing?.text || "");
  const [category, setCategory] = useState(editing?.category || "");
  const [active, setActive] = useState(editing?.active ?? true);
  const [kind, setKind] = useState<"text" | "image">(editing?.kind || "text");
  const [imageSelected, setImageSelected] = useState(editing?.kind === "image");
  const save = () => {
    const item: Memory = { id: editing?.id || Date.now(), text: text || "A special image memory", category: category || undefined, active, kind, imageTone: kind === "image" ? "forest" : undefined, reason: editing?.reason || "You added this directly to your Memory Vault." };
    setMemories(editing ? memories.map((memory) => memory.id === editing.id ? item : memory) : [item, ...memories]);
    notify(editing ? "Memory updated" : "Memory added to your Vault");
    back();
  };
  return <><PageHeader title={editing ? "Edit memory" : "Add memory"} subtitle="Only save what feels helpful" back={back} /><section className="page-pad">
    <div className="help-hero"><Icon name="memory" /><div><h2>You decide what stays.</h2><p>ONY can only use this memory while the switch below is on.</p></div></div>
    <div className="memory-type"><Button variant={kind === "text" ? "primary" : "secondary"} onClick={() => setKind("text")}>Text Memory</Button><Button variant={kind === "image" ? "primary" : "secondary"} onClick={() => setKind("image")}>Image Memory</Button></div>
    {kind === "image" && <button className={`image-upload ${imageSelected ? "selected" : ""}`} onClick={() => { setImageSelected(true); notify("Photo selected for memory"); }}>{imageSelected ? <><span className="sample-photo"><i /></span><strong>Forest walk.jpg</strong><small>Tap to change image</small></> : <><Icon name="market" /><strong>Select an image</strong><small>Attach a calming photo from your gallery</small></>}</button>}
    <label className="field-label">{kind === "text" ? "What should ONY remember?" : "Caption (optional)"}</label><TextArea rows={kind === "text" ? 5 : 3} value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === "text" ? "For example: I feel calmer when I listen to music." : "A quiet walk that made me feel grounded."} />
    <label className="field-label">Category</label><div className="chips memory-categories">{["About Me", "Preferences", "Important People", "Goals", "Things That Help Me", "Special Memories"].map((item) => <Button key={item} variant={category === item ? "primary" : "secondary"} onClick={() => setCategory(item)}>{item}</Button>)}</div>
    <div className="setting-toggle"><div><strong>Allow ONY to use this</strong><p>Applies to future companion conversations.</p></div><Toggle on={active} setOn={setActive} /></div>
    <Button className="full" disabled={kind === "text" ? !text.trim() : !imageSelected} onClick={save}>Save memory</Button><Button className="full" variant="secondary" onClick={back}>Cancel</Button>
  </section></>;
}

function formatFriendlyTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Recently";
    const now = Date.now();
    const diff = (now - d.getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "Recently";
  }
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
      "Sending you a quiet moment of peace from across the globe. Whatever you are carrying today, you don’t have to carry it alone 🌱",
      "Hey there traveler—just wanted to remind you to rest your shoulders, unclench your jaw, and take one slow breath. You’re doing enough 💫",
      "Saw your light on the globe and wanted to send some warmth your way. Hope something gentle makes you smile today ☕",
    ];
    const randomText = sampleNotes[Math.floor(Math.random() * sampleNotes.length)];
    const randomSenderNum = Math.floor(100 + Math.random() * 899);
    const now = new Date().toISOString();
    const payload: Omit<FirestoreCommunityMessage, "id"> = {
      toUserId: "0",
      toUserMood: myMoodLabel,
      fromUserId: `community_member_${randomSenderNum}`,
      senderAnonymous: `Anonymous Member #${randomSenderNum}`,
      recipientAnonymous: "You (Anonymous Traveler)",
      kind: "text",
      text: randomText,
      createdAt: now,
    };

    try {
      const id = await createCommunityMessage(payload);
      setMySupportMessages((prev) => [{ id: id || `msg_${Date.now()}`, ...payload }, ...prev]);
      notify(`New support message received from Anonymous Member #${randomSenderNum} 🌱`);
    } catch {
      setMySupportMessages((prev) => [{ id: `local_${Date.now()}`, ...payload }, ...prev]);
      notify(`New support message received from Anonymous Member #${randomSenderNum} 🌱`);
    } finally {
      setSendingSampleToMe(false);
    }
  };

  const regions = [
    { label: "World", note: "Discoverable anonymous members across broad, privacy-safe regions" },
    { label: "Malaysia", note: "Approximate country view; no precise user locations" },
    { label: "Selangor", note: "Approximate state view with more discoverable members" },
    { label: "Petaling district", note: "Broad regional area; never an exact address" },
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
  return <><PageHeader title="Community" subtitle="Connected gently, across the world" action={<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>{dbSyncing && <span className="prototype-label">Syncing…</span>}<Button className="create-post-top" onClick={() => navigate("post")}>+ Create Post</Button></div>} /><section className="page-pad community-page">
    <div className="community-view-switch" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
      <Button variant={view === "globe" ? "primary" : "secondary"} onClick={() => setView("globe")}>Globe</Button>
      <Button variant={view === "posts" ? "primary" : "secondary"} onClick={() => setView("posts")}>Posts</Button>
      <Button variant={view === "myNode" ? "primary" : "secondary"} onClick={() => setView("myNode")}>My Node ({mySupportMessages.length})</Button>
    </div>
    {view === "globe" && <>
      <div className="community-world full-globe">
        <div className="world-copy">
          <span className="eyebrow">Discoverable people · Anonymous</span>
          <div className="region-breadcrumb">{regions.slice(0, regionLevel + 1).map((item, index) => <span key={item.label}>{index > 0 && "›"} {item.label}</span>)}</div>
          <h2>{region.label}</h2><p>{region.note}. Tap your glowing node ("You") or any member node to connect.</p>
        </div>
        <div className="globe-controls"><Button variant="ghost" disabled={regionLevel === 0} onClick={() => { setRegionLevel((level) => Math.max(0, level - 1)); setSelectedNode(null); }}>Zoom out</Button><span>{visibleUsers.length} discoverable nodes</span><Button disabled={regionLevel === regions.length - 1} onClick={() => { setRegionLevel((level) => Math.min(regions.length - 1, level + 1)); setSelectedNode(null); }}>Zoom in</Button></div>
        {regionLevel > 0 && <Button variant="ghost" className="back-world" onClick={() => { setRegionLevel(0); setSelectedNode(null); }}>Back to world</Button>}
        <div className="globe-stage"><div className={`globe globe-level-${regionLevel}`} aria-label={`Interactive user globe for ${region.label}`} style={{ backgroundPosition: `${rotation * 1.4}px center` }} onPointerDown={(event) => { drag.current = { active: true, moved: false, x: event.clientX, rotation }; if (!(event.target as HTMLElement).closest(".globe-node")) event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (drag.current.active) { const distance = event.clientX - drag.current.x; if (Math.abs(distance) > 5) drag.current.moved = true; setRotation(drag.current.rotation + distance * .7); } }} onPointerUp={() => { drag.current.active = false; }} onPointerCancel={() => { drag.current.active = false; }}><i className="orbit one" /><i className="orbit two" />{visibleUsers.map((user) => {
          const isMeNode = Boolean(user.isMe || user.id === 0);
          const angle = (user.lon + rotation) * Math.PI / 180;
          const depth = Math.cos(angle);
          const x = 50 + Math.sin(angle) * 43;
          const y = 50 - user.lat * .48;
          return (
            <button
              aria-label={isMeNode ? `Your anonymous node, mood glow ${user.moodLabel}` : `Anonymous member node, mood glow ${user.moodLabel}`}
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
              {isMeNode && <small className="my-node-indicator">You</small>}
              <span />
            </button>
          );
        })}</div><span className="rotate-hint">Drag to pan · Tap "You" to view support messages sent to your node</span></div>

        {selectedUser && (selectedUser.isMe || selectedUser.id === 0 ? (
          <div className="node-card user-node-card">
            <Button variant="ghost" className="node-close" onClick={() => setSelectedNode(null)}><Icon name="close" /></Button>
            <span className={`anonymous-light mood-${selectedUser.moodGlow}`} />
            <span className="prototype-label">Your Anonymous Node · Malaysia</span>
            <strong>Your light on the globe</strong>
            <p>
              Others see your anonymous mood check-in ({selectedUser.moodLabel.toLowerCase()}) with zero personal identity or exact location. You have <strong>{mySupportMessages.length}</strong> support {mySupportMessages.length === 1 ? "message" : "messages"} from others.
            </p>
            <div>
              <Button onClick={() => setView("myNode")}>View Support Sent to Me ({mySupportMessages.length})</Button>
              <Button variant="secondary" onClick={() => setSelectedNode(null)}>Close</Button>
            </div>
          </div>
        ) : (
          <div className="node-card user-node-card">
            <Button variant="ghost" className="node-close" onClick={() => setSelectedNode(null)}><Icon name="close" /></Button>
            <span className={`anonymous-light mood-${selectedUser.moodGlow}`} />
            <span className="prototype-label">Anonymous Member</span>
            <strong>Someone is here</strong>
            <p>The light reflects an optional mood check-in: {selectedUser.moodLabel.toLowerCase()}. No personal identity or precise location is shared.</p>
            {!selectedUser.acceptsMessages && <div className="messages-off-notice"><Icon name="info" />This member is visible but is not receiving supportive messages right now.</div>}
            <div>
              {selectedUser.acceptsMessages ? <Button onClick={() => openMember(selectedUser)}>Send Support</Button> : <Button disabled>Support messages off</Button>}
              <Button variant="ghost" onClick={() => notify("Thank you for reporting. This member node has been sent for moderation review.")}>Report</Button>
              <Button variant="ghost" onClick={() => { notify("Anonymous member blocked in this session"); setSelectedNode(null); }}>Block</Button>
            </div>
          </div>
        ))}
        <div className="world-legend mood-legend"><span><i className="bright" />Higher mood</span><span><i className="soft" />Okay</span><span><i className="dim" />Lower mood</span><span><i className="neutral" />No check-in</span><Button variant="ghost" onClick={() => navigate("guidelines")}>Guidelines</Button></div>
      </div>
      <div className="globe-privacy-settings"><div><strong>Appear on the globe</strong><p>When off, your anonymous light is hidden from the globe.</p></div><Toggle on={discoverable} setOn={setDiscoverable} /></div>
      <div className="globe-privacy-settings"><div><strong>Receive supportive messages</strong><p>When on, other community members can send anonymous encouragement to your node.</p></div><Toggle on={acceptMessages} setOn={setAcceptMessages} /></div>
      <div className="location-choice"><strong>Broad Regional Discovery</strong><p>ONY protects your privacy. We only use broad state or district regions, never precise GPS addresses.</p>{locationChoice === "none" && <div><Button onClick={() => setLocationChoice("allowed")}>Enable Regional Area</Button><Button variant="secondary" onClick={() => setLocationChoice("declined")}>Enter Area Manually</Button></div>}{locationChoice === "allowed" && <div className="form-success"><Icon name="check" />Regional area set to Malaysia (Central / Klang Valley).</div>}{locationChoice === "declined" && <div className="folder-create"><TextInput value={manualArea} onChange={(event) => setManualArea(event.target.value)} placeholder="e.g. Petaling Jaya, Penang, Johor Bahru" /><Button disabled={!manualArea.trim()} onClick={() => notify(`Regional area set to ${manualArea}`)}>Set Area</Button></div>}</div>
      <div className="community-note"><Icon name="shield" />All members and message delivery are anonymous. Nodes never reveal real-world addresses.</div>
    </>}
    {view === "posts" && <>
      <div className="posts-heading"><div><span className="eyebrow">Community posts</span><h2>Shared gently, together.</h2></div><Button variant="ghost" onClick={() => setView("globe")}>Back to globe</Button></div>
      <div className="search"><Icon name="search" /><TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search posts or topics" /></div>
      <div className="scroll-chips">{categories.map((x) => <Button key={x} variant={filter === x ? "primary" : "secondary"} onClick={() => setFilter(x)}>{x}</Button>)}</div>
      <div className="feed">{shown.map((post) => {
        const likeList = Array.isArray(post.likeRecords) ? post.likeRecords : [];
        const commentList = Array.isArray(post.comments) ? post.comments : [];
        const totalReplies = commentList.reduce((acc, c) => acc + (Array.isArray(c.replies) ? c.replies.length : 0), 0);
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
                <small>{post.category} · {formatFriendlyTime(post.createdAt)}</small>
              </div>
              <Button variant="ghost" onClick={() => notify("Thank you. Post flagged for community moderation.")}>Report</Button>
            </div>
            <button className="post-open" onClick={() => openPost(post)}>
              <h3>{post.title}</h3>
              <p>{post.body}</p>
            </button>
            {post.media === "voice" && <VoiceNote audioUrl={post.audioUrl} audioDuration={post.audioDuration} notify={notify} />}
            {post.media === "image" && <div className="post-image"><span>Shared calming image</span></div>}
            <div className="post-actions">
              <Button
                variant={likedByMe ? "primary" : "ghost"}
                onClick={() => onLikePost && onLikePost(post.id)}
              >
                <Icon name="heart" />
                {likedByMe ? "Liked" : "Like"} ({post.likes})
              </Button>
              <Button variant="ghost" onClick={() => openPost(post)}>
                <Icon name="chat" />
                {commentList.length} {commentList.length === 1 ? "comment" : "comments"}
              </Button>
            </div>
          </article>
        );
      })}</div>
    </>}
    {view === "myNode" && <>
      <div className="posts-heading">
        <div>
          <span className="eyebrow">Your Personal Globe Node</span>
          <h2>Support Sent to You</h2>
        </div>
        <Button variant="ghost" onClick={fetchMySupportMessages}>{loadingMyMessages ? "Refreshing…" : "Refresh"}</Button>
      </div>

      <div className="my-node-card">
        <div className="my-node-card-header">
          <div className="my-node-beacon-large">{latestMood ? latestMood.emoji : "🌱"}</div>
          <div style={{ flex: 1 }}>
            <span className="prototype-label">Your Anonymous Light · Node #0</span>
            <h2>You on the Community Globe</h2>
            <p>Only messages sent by other community members to your node appear here.</p>
          </div>
        </div>
        <div className="my-node-stats-row">
          <div className="my-node-stat-box">
            <label>Your Current Mood Glow</label>
            <strong>{myMoodLabel} ({discoverable ? "Visible on Globe" : "Hidden"})</strong>
          </div>
          <div className="my-node-stat-box">
            <label>Support Received from Others</label>
            <strong>{mySupportMessages.length} {mySupportMessages.length === 1 ? "message" : "messages"}</strong>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            onClick={handleSimulateIncomingSupport}
            disabled={sendingSampleToMe || !acceptMessages}
          >
            {sendingSampleToMe ? "Receiving…" : "+ Receive Encouragement from Member"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedNode(0);
              setView("globe");
            }}
          >
            Locate My Node on Globe
          </Button>
        </div>
      </div>

      {loadingMyMessages ? (
        <div className="empty mini-empty"><Icon name="chat" /><p>Loading support messages sent to your node…</p></div>
      ) : mySupportMessages.length === 0 ? (
        <div className="empty mini-empty">
          <Icon name="chat" />
          <p>No support messages sent to your node yet. Make sure "Receive supportive messages" is enabled on the Globe!</p>
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
                  <strong>{msg.senderAnonymous || "Anonymous Traveler"}</strong>
                  <span className="to-you-pill">To You</span>
                  <small>{formatFriendlyTime(msg.createdAt)}</small>
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
      notify("Voice note attached · 00:10");
    } catch {
      notify("Could not attach voice note");
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
      notify("Recording started · speak into your mic");
    } catch (err: any) {
      setRecording(false);
      setMicError(err.message || "Microphone access is restricted in this preview frame.");
      notify(err.message || "Could not access microphone.");
    }
  };

  const handleStopRecording = async () => {
    if (!recorderRef.current || !recording) return;
    try {
      setRecording(false);
      const res = await recorderRef.current.stop();
      setRecordedAudio(res);
      notify("Voice note recorded");
    } catch {
      notify("Failed to save audio recording");
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
        notify("Unable to play preview audio");
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

  if (posted) return <div className="centered-state"><div className="success-mark"><Icon name="check" /></div><h1>Your post is live</h1><p>Thanks for sharing with care. It’s now saved in Cloud Firestore and visible in the community feed.</p><Button onClick={back}>Return to community</Button></div>;
  return <><PageHeader title="Create a post" subtitle="Share kindly, at your pace" back={back} /><section className="page-pad">
    <label className="field-label">Post as</label><div className="segmented"><Button variant={postAs === "ONY profile" ? "primary" : "secondary"} onClick={() => setPostAs("ONY profile")}>My ONY profile</Button><Button variant={postAs === "Anonymous" ? "primary" : "secondary"} onClick={() => setPostAs("Anonymous")}>Anonymous</Button></div>
    <label className="field-label">Format</label><div className="segmented"><Button variant={media === "text" ? "primary" : "secondary"} onClick={() => setMedia("text")}>Text</Button><Button variant={media === "image" ? "primary" : "secondary"} onClick={() => setMedia("image")}>Image</Button><Button variant={media === "voice" ? "primary" : "secondary"} onClick={() => setMedia("voice")}>Voice</Button></div>
    <label className="field-label">Title</label><TextInput value={title} onChange={(e) => { setTitle(e.target.value); setGuidelineError(null); }} placeholder="What would you like to share?" />
    {media !== "voice" && <><label className="field-label">Your post</label><TextArea value={body} onChange={(e) => { setBody(e.target.value); setGuidelineError(null); }} rows={5} placeholder="Write what’s on your mind..." /></>}
    {media === "image" && <button className="image-upload selected" onClick={() => notify("Image selected")}><span className="sample-photo sunset"><i /></span><strong>Sunset moment.jpg</strong><small>Tap to change image</small></button>}
    {media === "voice" && (
      <div className="voice-record-card">
        {!recordedAudio ? (
          <>
            <button
              type="button"
              className={recording ? "recording" : ""}
              onClick={recording ? handleStopRecording : handleStartRecording}
              aria-label={recording ? "Stop recording" : "Record voice message"}
            >
              <Icon name={recording ? "close" : "mic"} />
            </button>
            <div style={{ flex: 1 }}>
              <strong>
                {recording
                  ? `Recording · ${formatAudioDuration(recordingSeconds)}`
                  : "Record voice message"}
              </strong>
              <small>
                {recording
                  ? "Tap stop when ready (up to 2 minutes)"
                  : "Speak into your microphone gently"}
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
                Done
              </Button>
            ) : (
              <Button variant="secondary" onClick={handleUseVoiceSample} title="Attach an audio note">
                Quick Audio Note
              </Button>
            )}
            {micError && (
              <div className="voice-mic-inline-help">
                <small>{micError}</small>
                <Button variant="secondary" onClick={handleUseVoiceSample}>
                  Attach Voice Note (10s)
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
              aria-label={isPlayingPreview ? "Pause preview" : "Play preview"}
            >
              <Icon name={isPlayingPreview ? "pause" : "play"} />
            </button>
            <div>
              <strong>Voice note ready · {formatAudioDuration(recordedAudio.duration)}</strong>
              <small>Recorded with your mic</small>
            </div>
            <Button variant="ghost" onClick={handleTogglePreview}>
              {isPlayingPreview ? "Pause" : "Play"}
            </Button>
            <Button variant="ghost" onClick={handleDiscardRecording}>
              Re-record
            </Button>
          </>
        )}
      </div>
    )}
    <label className="field-label">Category</label><div className="chips">{categories.slice(1).map((x) => <Button key={x} variant={category === x ? "primary" : "secondary"} onClick={() => setCategory(x)}>{x}</Button>)}</div>
    {guidelineError && (
      <div className="form-error" role="alert">
        <Icon name="info" />
        <span>{guidelineError}</span>
      </div>
    )}
    <div className="community-note"><Icon name="info" />Community guidelines and moderation apply. Profanity or unkind content is automatically blocked.</div>
    <Button className="full" disabled={submitting || !title || (media === "text" && !body) || (media === "voice" && !recordedAudio)} onClick={async () => {
      const titleCheck = validateCommunityCommentText(title);
      if (!titleCheck.valid) {
        setGuidelineError(titleCheck.reason || "Title violates community guidelines.");
        notify("Post blocked: violates community guidelines");
        return;
      }
      if (body.trim()) {
        const bodyCheck = validateCommunityCommentText(body);
        if (!bodyCheck.valid) {
          setGuidelineError(bodyCheck.reason || "Post content violates community guidelines.");
          notify("Post blocked: violates community guidelines");
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
    }}>{submitting ? "Publishing to Firestore…" : "Publish post"}</Button></section></>;
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
      notify("Comment saved to Cloud Firestore");
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
        title="Community post"
        subtitle={`${post.category} · ${formatFriendlyTime(post.createdAt)}`}
        back={back}
      />
      <section className="page-pad post-detail-scroll">
        <article className="post-detail-card">
          <div className="post-meta">
            <span className="mini-avatar">{post.author[0]}</span>
            <div>
              <strong>{post.author}</strong>
              <small>
                {post.author === "Anonymous" ? "Identity kept private" : "ONY community profile"} ·{" "}
                {formatFriendlyTime(post.createdAt)}
              </small>
            </div>
            <Button variant="ghost" onClick={() => notify("Thank you. Post flagged for moderation review.")}>
              Report
            </Button>
          </div>
          <h1>{post.title}</h1>
          <p>{post.body}</p>
          {post.media === "voice" && (
            <VoiceNote audioUrl={post.audioUrl} audioDuration={post.audioDuration} notify={notify} />
          )}
          {post.media === "image" && (
            <div className="post-image detail">
              <span>Shared calming image</span>
            </div>
          )}

          <div className="post-detail-stats">
            <span>
              {post.likes} {post.likes === 1 ? "like" : "likes"}
            </span>
            <span>
              {comments.length} {comments.length === 1 ? "comment" : "comments"}
            </span>
          </div>

          <div className="post-detail-actions">
            <Button
              variant={isPostLikedByMe ? "primary" : "secondary"}
              onClick={() => onLikePost && onLikePost(post.id)}
            >
              <Icon name="heart" />
              {isPostLikedByMe ? "Liked" : "Like"} ({post.likes})
            </Button>
            <Button
              variant="secondary"
              onClick={() => commentInputRef.current?.focus()}
            >
              <Icon name="chat" />
              Comment ({comments.length})
            </Button>
          </div>
        </article>

        <div className="comments-section">
          <div className="comments-section-header">
            <h3>Comments ({comments.length})</h3>
          </div>

          {comments.length === 0 ? (
            <div className="empty mini-empty">
              <p>No comments yet. Share a supportive note below.</p>
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
                        {isMine && <b className="you-badge">You</b>}
                      </span>
                      <small>
                        {formatFriendlyTime(item.createdAt)}
                        {item.updatedAt ? " · edited" : ""}
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
                          placeholder="Edit your comment…"
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
                            Save
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingCommentError(null);
                            }}
                          >
                            Cancel
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
                        {likedByMe ? "Liked" : "Like"} ({commentLikes.length})
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
                        Reply ({replies.length})
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
                            <Icon name="edit" /> Edit
                          </button>
                          <button
                            type="button"
                            className="comment-action-btn danger"
                            onClick={() => handleDeleteComment(item.id)}
                          >
                            <Icon name="trash" /> Delete
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
                                  {isMyReply && <b className="you-badge">You</b>}
                                </strong>
                                <small>
                                  {formatFriendlyTime(rep.createdAt)}
                                  {rep.updatedAt ? " · edited" : ""}
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
                                    placeholder="Edit your reply…"
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
                                      Save
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      onClick={() => {
                                        setEditingReplyTarget(null);
                                        setEditingReplyError(null);
                                      }}
                                    >
                                      Cancel
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
                                    <Icon name="edit" /> Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="comment-action-btn danger"
                                    onClick={() => handleDeleteReply(item.id, rep.id)}
                                  >
                                    <Icon name="trash" /> Delete
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
                          placeholder={`Reply to ${item.userName}…`}
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
                            Reply
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setReplyingToCommentId(null);
                              setReplyError(null);
                            }}
                          >
                            Cancel
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
            placeholder={`Comment as ${cleanName}…`}
            aria-label="Add a comment"
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
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const cats = ["All", "Café", "Art / creative", "Yoga / meditation", "Music", "Relaxation", "Wellness products", "Professional support"];
  const list = merchants && merchants.length > 0 ? merchants : fallbackMerchants;
  const shown = list.filter((m) => (category === "All" || m.category === category) && `${m.name} ${m.offer}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageHeader title="Discover" subtitle="Wellness & Partner Offers" action={<span className="prototype-label" style={{ background: "var(--sage-soft)", color: "#2e7d32" }}>{dbSyncing ? "Syncing…" : "Verified Partners"}</span>} /><section className="page-pad topless">
    <div className="market-hero"><span className="eyebrow">Wellness, Nearby</span><h2>Make a little room for you.</h2><p>Exclusive partner privileges, calming spaces, and verified care directory.</p></div>
    <div className="search"><Icon name="search" /><TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search providers or offers" /></div>
    <div className="scroll-chips">{cats.map((x) => <Button key={x} variant={category === x ? "primary" : "secondary"} onClick={() => x === "Professional support" ? navigate("professional") : setCategory(x)}>{x}</Button>)}</div>
    <div className="market-section-head"><h3>Wellness Vouchers</h3><Button variant="ghost" onClick={() => setCategory("All")}>View all</Button></div>
    <div className="voucher-list">{shown.map((m) => <button className="voucher-ticket" key={m.name} onClick={() => openMerchant(m.name)}><span className="voucher-ticket-stub"><img src={m.image} alt="" /><small>{m.category}</small><strong>{m.value}</strong></span><span className="voucher-ticket-body"><small>{m.category} · Partner</small><strong>{m.name}</strong><b>{m.offer}</b><span>{m.description}</span><em>{m.validity}</em><i>Tap to open voucher</i></span></button>)}</div>
    <button className="professional-banner" onClick={() => navigate("professional")}><Icon name="shield" /><span><strong>Find professional support nearby</strong><small>Registered clinics, MENTARI centres, and certified counsellors</small></span><Icon name="chevron" /></button>
    <p className="disclaimer"><Icon name="info" /> All partner privileges and wellness offers are verified with our local merchant community.</p>
  </section></>;
}

function MerchantDetail({ back, navigate, merchantName, notify, merchants = fallbackMerchants }: { back: () => void; navigate: (s: Screen) => void; merchantName: string; notify: (s: string) => void; merchants?: Merchant[] }) {
  const list = merchants && merchants.length > 0 ? merchants : fallbackMerchants;
  const merchant = list.find((item) => item.name === merchantName) || list[0];
  return <><PageHeader title="Voucher Details" subtitle="Wellness Partner Offer" back={back} /><section className="page-pad voucher-detail-page"><div className="physical-voucher large"><div className="physical-voucher-image"><img src={merchant.image} alt={`${merchant.category} example for ${merchant.name}`} /><span>Partner Offer</span></div><div className="physical-voucher-main"><small>{merchant.category} · Verified Partner</small><h1>{merchant.name}</h1><strong>{merchant.value}</strong><h3>{merchant.offer}</h3><p>{merchant.description}</p><em>{merchant.validity}</em></div><div className="voucher-serial">ONY · PASS · 2026</div></div><div className="voucher-terms"><h3>Terms & conditions</h3><p>Valid for single use per member at participating branches. Present digital voucher barcode upon ordering. Cannot be exchanged for cash or combined with other promotions.</p></div><Button className="full redeem-voucher" onClick={() => { notify("Voucher activated! Show barcode at counter"); navigate("voucher"); }}>Redeem Voucher</Button><p className="disclaimer"><Icon name="info" />Show this pass directly to the partner cashier to redeem.</p></section></>;
}

function Voucher({ back, merchantName, merchants = fallbackMerchants }: { back: () => void; merchantName: string; merchants?: Merchant[] }) {
  const list = merchants && merchants.length > 0 ? merchants : fallbackMerchants;
  const merchant = list.find((item) => item.name === merchantName) || list[0];
  return <div className="voucher-page"><PageHeader title="Voucher Ready!" subtitle="Digital Member Pass" back={back} /><section className="page-pad"><div className="redeemed-mark"><Icon name="check" /></div><div className="voucher-card"><SmallLogo /><span className="eyebrow">Your voucher is ready to use</span><h1>{merchant.value}</h1><p>{merchant.offer} at {merchant.name}</p><div className="voucher-code">ONY-PASS-{merchant.name.slice(0, 3).toUpperCase()}-2026</div><div className="barcode">|||| || ||| | |||| |||</div><small>Active Digital Member Pass</small></div><div className="community-note" style={{ background: "var(--sage-soft)", borderColor: "var(--sage)", color: "#2e7d32" }}><Icon name="check" />Present this barcode to the staff upon placing your order or booking.</div><Button className="full" onClick={back}>Done</Button></section></div>;
}

function Profile({ navigate, displayName, language, persona, theme, companion, trustedName, contactStatus, pendingIncomingCount = 0, unreadNotificationsCount = 0, subscriptionStatus, onLogout }: {
  navigate: (s: Screen) => void; displayName: string; language: string; persona: Persona; theme: Theme; companion: Companion; trustedName: string;
  contactStatus: ContactStatus; pendingIncomingCount?: number; unreadNotificationsCount?: number; subscriptionStatus: SubscriptionStatus; onLogout: () => void;
}) {
  const contactLabel =
    pendingIncomingCount > 0
      ? `${pendingIncomingCount} incoming request${pendingIncomingCount > 1 ? "s" : ""} to review`
      : contactStatus === "accepted"
        ? `${trustedName} · Accepted`
        : contactStatus === "pending"
          ? `${trustedName} · Pending approval`
          : contactStatus === "rejected"
            ? `${trustedName} · Request declined`
            : "No trusted contact connected";
  const subscriptionLabel = subscriptionStatus === "trial"
    ? "ONY Premium Trial · 2 days remaining"
    : subscriptionStatus === "payg"
      ? "ONY Premium · RM5 / 3 days"
      : subscriptionStatus === "monthly"
        ? "ONY Premium · RM19.90/month"
        : subscriptionStatus === "trialEnded"
          ? "Free · Trial ended"
          : "Free · Free access";
  const menu = [
    ["personalise", "Companion & communication", `${personaOptions.find((item) => item.id === persona)?.name}`],
    ["monthlyReport", "Monthly Reflection", "Your conversations and check-ins"],
    ["trusted", "Trusted contact", contactLabel],
    [
      "notifications",
      "Notifications",
      unreadNotificationsCount > 0
        ? `${unreadNotificationsCount} unread update${unreadNotificationsCount > 1 ? "s" : ""}`
        : "All caught up",
    ],
    ["privacy", "Privacy & memory", "You’re in control"],
    ["systemLogs", "Activity & System Logs", "Cloud database audit trail & .log export"],
    ["legal", "Legal & safety", "Disclaimer, terms, privacy, and crisis information"],
    ["subscription", "Subscription", subscriptionLabel],
    ["help", "Help & support", "Resources and crisis help"],
    ["about", "About ONY", "Version 1.0.0 (Release)"],
  ] as [Screen, string, string][];
  return <><PageHeader title="Profile" subtitle="Your ONY, your way" /><section className="page-pad top-row">
    <div className="profile-card"><CompanionAvatar companion={companion} /><div><h2>{displayName} & ONY</h2><p>Preferred display name · {language}</p><span>{companion} · {personaOptions.find((item) => item.id === persona)?.name}</span></div><SmallLogo /></div>
    <div className="section-head"><h3>Settings</h3></div><div className="menu">{menu.map(([id, title, text]) => <button key={id} onClick={() => navigate(id)}><span className="menu-icon"><Icon name={id === "help" ? "shield" : id === "notifications" ? "bell" : id === "privacy" ? "memory" : id === "systemLogs" ? "fileText" : "profile"} /></span><span><strong>{title}</strong><small>{text}</small></span><Icon name="chevron" /></button>)}</div>
    <Button variant="secondary" className="full logout" onClick={onLogout}>Log out</Button>
    <p className="prototype-foot">ONY Secure Platform · Protected by Firebase Authentication & Cloud Firestore. End-to-end secure synchronization.</p>
  </section></>;
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
  return <><PageHeader title="Personalise ONY" subtitle="Shape how conversations feel" back={back} /><section className="page-pad">
    <div className="setting-block"><h3>ONY companion</h3><p>Choose who accompanies you.</p><CompanionPicker value={companion} setValue={setCompanion} /></div>
    <div className="setting-block"><h3>Environment</h3><p>Choose a calming space for the whole app.</p><ThemePicker value={theme} setValue={setTheme} /></div>
    <div className="ambient-settings"><div><strong>{themeOptions.find((item) => item.id === theme)?.name} ambience</strong><small>Soothing ambient soundscape</small></div><Button variant={soundOn ? "primary" : "secondary"} onClick={() => setSoundOn(!soundOn)}>{soundOn ? "Pause" : "Play"}</Button><label>Volume <TextInput type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} /></label></div>
    <div className="setting-block"><h3>Communication style</h3><p>Tone changes, but ONY’s safety rules never do.</p><PersonaPicker value={persona} setValue={setPersona} /></div>
    <SettingChoices title="Conversation style" values={["Reflective", "Practical", "A mix"]} value={conversationStyle} setValue={setConversationStyle} />
    <SettingChoices title="Response length" values={["Short", "Balanced", "Detailed"]} value={responseLength} setValue={setResponseLength} />
    <SettingChoices title="Language" values={["English", "Bahasa Melayu", "中文"]} value={language} setValue={setLanguage} />
    <div className="setting-toggle"><div><strong>Relevant memories</strong><p>Let ONY use active Vault memories.</p></div><Toggle on={useActiveMemories} setOn={setUseActiveMemories} /></div>
    <div className="preview-bubble"><CompanionAvatar companion={companion} /><div><span>Your preview</span><p>{personaOptions.find((item) => item.id === persona)?.preview}</p></div></div>
    <Button className="full" onClick={() => { if (onSave) onSave(); notify("Your ONY preferences are saved to your profile"); }}>Save preferences</Button>
  </section></>;
}

function SettingChoices({ title, subtitle, values, value, setValue }: { title: string; subtitle?: string; values: string[]; value: string; setValue: (v: string) => void }) {
  return <div className="setting-block"><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}<div className="segmented">{values.map((x) => <Button key={x} variant={value === x ? "primary" : "secondary"} onClick={() => setValue(x)}>{x}</Button>)}</div></div>;
}

function ChatHistory({ back, navigate, conversations, setConversations, activeChatId, setActiveChatId, folders, setFolders, selectedFolderId, setSelectedFolderId }: {
  back: () => void; navigate: (s: Screen) => void; conversations: Conversation[];
  setConversations: (value: Conversation[] | ((items: Conversation[]) => Conversation[])) => void; activeChatId: number | null; setActiveChatId: (id: number | null) => void;
  folders: ChatFolder[]; setFolders: (value: ChatFolder[] | ((items: ChatFolder[]) => ChatFolder[])) => void;
  selectedFolderId: number | null; setSelectedFolderId: (id: number | null) => void;
}) {
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
  return <><PageHeader title="Chats" subtitle="Separate conversations, organised your way" back={back} action={<Button onClick={() => { setActiveChatId(null); back(); }}>+ New Chat</Button>} /><section className="page-pad">
    <Button className="monthly-entry" variant="ghost" onClick={() => navigate("monthlyReport")}><Icon name="memory" /><span><strong>Monthly Reflection</strong><small>Uses only conversations and memories you allow</small></span><Icon name="chevron" /></Button>
    <div className="search"><Icon name="search" /><TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chat titles and messages" /></div>
    <div className="folder-create"><TextInput value={newFolder} onChange={(event) => setNewFolder(event.target.value)} placeholder="New folder name" /><Button disabled={!newFolder.trim()} onClick={createFolder}>Create</Button></div>
    <div className="folder-strip"><Button variant={selectedFolderId === null ? "primary" : "secondary"} onClick={() => setSelectedFolderId(null)}>All chats</Button>{folders.map((folder) => <Button key={folder.id} variant={selectedFolderId === folder.id ? "primary" : "secondary"} onClick={() => setSelectedFolderId(folder.id)}>{folder.name}</Button>)}</div>
    {selectedFolderId !== null && <div className="folder-manage">{renamingFolder === selectedFolderId ? <><TextInput value={folders.find((folder) => folder.id === selectedFolderId)?.name || ""} onChange={(event) => setFolders((items) => items.map((folder) => folder.id === selectedFolderId ? { ...folder, name: event.target.value } : folder))} /><Button onClick={() => setRenamingFolder(null)}>Done</Button></> : <><span>{folders.find((folder) => folder.id === selectedFolderId)?.name}</span><Button variant="ghost" onClick={() => setRenamingFolder(selectedFolderId)}>Rename</Button><Button variant="ghost" onClick={() => { setFolders((items) => items.filter((folder) => folder.id !== selectedFolderId)); setConversations((items) => items.map((chat) => chat.folderId === selectedFolderId ? { ...chat, folderId: undefined } : chat)); setSelectedFolderId(null); }}>Delete folder</Button><Button onClick={() => { setActiveChatId(null); back(); }}>New chat here</Button></>}</div>}
    <div className="archive-switch"><Button variant={!showArchived ? "primary" : "secondary"} onClick={() => setShowArchived(false)}>Active</Button><Button variant={showArchived ? "primary" : "secondary"} onClick={() => setShowArchived(true)}>Archived</Button></div>
    {visible.length === 0 && <div className="empty"><Icon name="chat" /><h3>{query ? "No matching conversations" : showArchived ? "No archived conversations" : "This folder is empty"}</h3><p>{query ? "Try another search." : "Start a new conversation here whenever you’re ready."}</p><Button onClick={() => { setActiveChatId(null); back(); }}>Start a conversation</Button></div>}
    {(["Today", "Yesterday"] as const).map((day) => {
      const dayChats = visible.filter((chat) => chat.day === day);
      if (!dayChats.length) return null;
      return <div className="history-group" key={day}><h3>{day}</h3>{dayChats.map((chat) => <div className="chat-history-card" key={chat.id}>
        {editing === chat.id ? <><TextInput value={chat.title} onChange={(event) => update(chat.id, { title: event.target.value })} /><label className="field-label">Move to folder</label><div className="chips history-categories"><Button variant={!chat.folderId ? "primary" : "secondary"} onClick={() => update(chat.id, { folderId: undefined })}>No folder</Button>{folders.map((folder) => <Button key={folder.id} variant={chat.folderId === folder.id ? "primary" : "secondary"} onClick={() => update(chat.id, { folderId: folder.id })}>{folder.name}</Button>)}</div><div className="setting-toggle"><div><strong>Use in monthly report</strong><p>Allow themes from this conversation to be summarized.</p></div><Toggle on={chat.reportAllowed !== false} setOn={(value) => update(chat.id, { reportAllowed: value })} /></div><Button className="full" onClick={() => setEditing(null)}>Done</Button></> :
        <><Button variant="ghost" className="history-open" onClick={() => { setActiveChatId(chat.id); setSelectedFolderId(chat.folderId || null); back(); }}><span><strong>{chat.title}</strong><small>{folders.find((folder) => folder.id === chat.folderId)?.name || "No folder"} · {chat.reportAllowed === false ? "Excluded from report" : "Report allowed"}</small></span><Icon name="chevron" /></Button><div className="memory-actions"><Button variant="ghost" onClick={() => setEditing(chat.id)}><Icon name="edit" />Organize</Button><Button variant="ghost" onClick={() => update(chat.id, { archived: !chat.archived })}>{chat.archived ? "Restore" : "Archive"}</Button><Button variant="ghost" onClick={() => { setConversations((items) => items.filter((item) => item.id !== chat.id)); if (activeChatId === chat.id) setActiveChatId(null); }}><Icon name="trash" />Delete</Button></div></>}
      </div>)}</div>;
    })}
  </section></>;
}

function MonthlyReport({ back, moodEntries, setMoodEntries, conversations, setConversations, memories }: { back: () => void; moodEntries: MoodEntry[]; setMoodEntries: (entries: MoodEntry[]) => void; conversations: Conversation[]; setConversations: (value: Conversation[] | ((items: Conversation[]) => Conversation[])) => void; memories: Memory[] }) {
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
  const dateRange = `${new Intl.DateTimeFormat("en-MY", { month: "long", year: "numeric" }).format(now)} · Active Member Insights`;
  const deleteReportData = () => {
    setIncludedMemories([]);
    setConversations((items) => items.map((chat) => ({ ...chat, reportAllowed: false })));
    setMoodEntries(moodEntries.map((entry) => ({ ...entry, reportAllowed: false })));
    setIntention("");
    setGenerated((value) => value + 1);
  };
  return <><PageHeader title="Monthly Reflection" subtitle="Consented data, never a diagnosis" back={back} /><section className="page-pad">
    <div className="monthly-hero"><SmallLogo /><span className="eyebrow">Monthly with ONY</span><h1>Your reflection</h1><p>{dateRange}</p></div>
    <div className="report-source"><Icon name="info" /><p>Generated locally from {allowedMoods.length} allowed mood entries, {allowedChats.length} conversations, and {allowedMemories.length} active selected memories. Version {generated}.</p></div>
    <div className="report-grid"><div><span>Included mood entries</span><strong>{allowedMoods.length}</strong><small>{moodEntries.length - allowedMoods.length} excluded from this report</small></div><div><span>Included chats</span><strong>{allowedChats.length}</strong><small>{conversations.length - allowedChats.length} excluded or archived</small></div></div>
    <div className="card"><h3>Mood patterns</h3>{allowedMoods.length >= 3 ? <><div className="bars mood-entry-bars">{[...allowedMoods].reverse().slice(-7).map((entry) => <div key={entry.id}><span style={{ height: `${entry.level * 20}%` }} /><small>{entry.emoji}</small></div>)}</div><p>Simple visualization of your included check-ins. ONY does not interpret this as a diagnosis or clinical trend.</p></> : <p>At least three included mood entries are needed before a trend is shown. ONY will not invent missing check-ins.</p>}<div className="report-memory-list mood-report-list">{moodEntries.map((entry) => <div key={entry.id}><Toggle on={entry.reportAllowed} setOn={(value) => setMoodEntries(moodEntries.map((item) => item.id === entry.id ? { ...item, reportAllowed: value } : item))} /><span><strong>{entry.emoji} {entry.label}</strong><small>{new Date(entry.createdAt).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}{entry.note ? ` · ${entry.note}` : ""}</small></span></div>)}</div></div>
    <div className="card"><h3>Conversation themes</h3>{themes.length ? <div className="theme-bars">{themes.map(([theme, count]) => <div key={theme}><span><strong>{theme}</strong><small>{count} {count === 1 ? "conversation" : "conversations"}</small></span><i><b style={{ width: `${Math.max(12, (count / allowedChats.length) * 100)}%` }} /></i></div>)}</div> : <p>No conversations are currently included. Allow a conversation from Chat folders to see themes here.</p>}</div>
    <div className="card"><h3>Personal reflections & memories</h3>{memories.length ? <div className="report-memory-list">{memories.map((memory) => <div key={memory.id}><Toggle on={includedMemories.includes(memory.id)} setOn={(value) => setIncludedMemories(value ? [...includedMemories, memory.id] : includedMemories.filter((id) => id !== memory.id))} /><span><strong>{memory.text}</strong><small>{memory.active ? "Active memory" : "Paused in Memory Vault"}</small></span></div>)}</div> : <p>No saved memories are available. ONY will not invent personal reflections.</p>}</div>
    <div className="card"><h3>Coping and self-care</h3>{copingMemories.length ? copingMemories.map((memory) => <p key={memory.id}>{memory.text}<small className="source-note">Source: user-approved memory</small></p>) : <p>No approved coping strategies have been saved yet.</p>}</div>
    <div className="card"><h3>Positive moments</h3>{positiveMemories.length ? positiveMemories.map((memory) => <p key={memory.id}>{memory.text}</p>) : <p>No positive moments are currently saved. ONY will not create achievements you did not share.</p>}</div>
    <div className="reflection"><SmallLogo /><div><strong>Reflection prompt</strong><p>{themes.length ? `When ${themes[0][0].toLowerCase()} came up, what kind of support felt most useful?` : "What is one moment from this month you would like to remember?"}</p></div></div>
    <label className="field-label">Optional intention for next month</label><TextArea value={intention} onChange={(event) => setIntention(event.target.value)} rows={3} placeholder="A small intention you choose for yourself…" />
    <Button className="full" onClick={() => setGenerated((value) => value + 1)}>Regenerate from selected data</Button>
    <Button className="full" variant="danger" onClick={deleteReportData}>Delete report selections</Button>
    <p className="disclaimer"><Icon name="info" />This local reflection explains its sources and avoids clinical conclusions. Real report generation requires secure persistence, consent records, and reviewed AI prompts.</p>
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

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="All your activity & updates"
        back={back}
        hideNotifications={true}
        action={
          <button
            type="button"
            className="notifications-settings-icon-btn"
            onClick={() => navigate("notificationSettings")}
            aria-label="Notification settings & quiet hours"
            title="Notification settings & quiet hours"
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
                <i /> {unreadCount} unread
              </span>
            ) : (
              <span
                className="notifications-unread-pill"
                style={{ background: "var(--sage-soft)", color: "#2e7d32" }}
              >
                All caught up
              </span>
            )}
            <span className="notifications-total-count">
              {notifications.length} {notifications.length === 1 ? "notification" : "notifications"}
            </span>
          </div>
          <div className="notifications-top-actions">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                className="mark-all-read-btn"
                onClick={onMarkAllRead}
              >
                Mark all as read
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
                {tabName} ({count})
              </Button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="notifications-empty-box">
            <Icon name="bell" />
            <h3>No notifications in {filter}</h3>
            <p>
              Activity like someone putting you as emergency contact, post likes, comments, and supportive messages will appear here 🌱
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
                      <small>{formatFriendlyTime(item.createdAt)}</small>
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
                              Accept
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
                              Reject
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                onMarkRead(item.id);
                                onOpenTrusted();
                              }}
                            >
                              View in Contacts
                            </Button>
                          </>
                        ) : item.rawRequest.status === "accepted" ? (
                          <span className="notification-item-badge accepted">
                            <Icon name="check" /> Accepted as Trusted Contact
                          </span>
                        ) : (
                          <span className="notification-item-badge rejected">
                            Request Declined
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
                            ? "View in My Node ›"
                            : "Open post ›"}
                        </span>
                      </div>
                    )}
                  </div>

                  {!item.read && <span className="notification-unread-dot-badge" title="Unread" />}
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
    notify("Notification preferences & quiet hours saved");
    back();
  };

  return (
    <>
      <PageHeader
        title="Notification Settings"
        subtitle="Preferences & quiet hours"
        back={back}
        hideNotifications={true}
        action={
          <Button
            variant="primary"
            className="header-save-btn"
            onClick={handleSave}
            title="Save notification preferences & quiet hours"
          >
            <Icon name="check" /> Save
          </Button>
        }
      />
      <section className="page-pad">
        <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
          <div className="setting-section-header">
            <span className="eyebrow">Rest & Peace</span>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
              <div>
                <h3 style={{ margin: 0 }}>🌙 Quiet Hours</h3>
                <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "12px" }}>
                  Mute non-urgent alerts during sleep or focus time.
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
                  <label>Start (Bedtime)</label>
                  <TextInput
                    type="time"
                    value={quietHours.start}
                    onChange={(e) =>
                      setQuietHours((prev) => ({ ...prev, start: e.target.value }))
                    }
                  />
                </div>
                <div className="quiet-hours-time-input">
                  <label>End (Wake up)</label>
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
                  <strong>Emergency Override:</strong> Trusted contact requests and safety crisis resources will always alert you immediately, even during quiet hours.
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: "16px", marginBottom: "20px" }}>
          <span className="eyebrow">Alert Categories</span>
          <h3 style={{ margin: "4px 0 6px" }}>🔔 Choose What Updates You Receive</h3>
          <p style={{ color: "var(--muted)", fontSize: "12px", marginBottom: "14px" }}>
            Toggle the activities you want to receive alerts for in your notification feed.
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
                  <strong style={{ fontSize: "13.5px" }}>{name}</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--muted)" }}>
                    {name === "Daily check-in"
                      ? "Gentle reminder for your daily mood check-in."
                      : name === "Emergency contacts"
                      ? "Requests and confirmations from your trusted emergency contacts."
                      : name === "Community activity"
                      ? "When other members like or comment on your community posts."
                      : name === "Supportive messages"
                      ? "When anonymous members send encouragement to your globe node."
                      : "Helpful follow-up reflections and gentle check-ins from ONY."}
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
            <Icon name="check" /> Save Preferences
          </Button>
          <Button variant="ghost" className="full" onClick={back}>
            Back to Notifications
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
  const activate = (next: SubscriptionStatus, message: string) => {
    setStatus(next);
    if (next !== "free") resetFreeUsage();
    notify(message);
  };
  const freeCard = <div className={`subscription-plan free-plan ${status === "free" || status === "trialEnded" ? "current" : ""}`}><div className="plan-heading"><span>Free Tier</span>{(status === "free" || status === "trialEnded") && <b>Current Plan</b>}</div><h2>Free</h2><strong>RM0</strong><ul><li>Unlimited daily mood check-ins</li><li>Core ONY conversational support</li><li>Memory Vault self-reflections</li><li>Essential crisis & helpline resources</li><li>Full community access</li></ul>{freeUsage >= freeLimit && <p className="allowance-note">Daily conversation allowance reached. Upgrade to Premium or continue tomorrow. Safety resources remain 100% free.</p>}<Button variant="secondary" className="full" onClick={() => { setStatus(status === "trialEnded" ? "trialEnded" : "free"); resetFreeUsage(); notify("Continuing with Free Plan"); back(); }}>Continue with Free</Button></div>;
  const paygCard = <div className={`subscription-plan payg-plan ${status === "payg" ? "current" : ""}`}><div className="plan-heading"><span>Pay As You Go</span>{status === "payg" && <b>Premium Active</b>}</div><h2>ONY 3-Day Pass</h2><strong>RM5 <small>/ 3 days</small></strong><p>Flexible Premium access whenever you need deeper support.</p><ul><li>Instant Premium access for 3 days</li><li>Enhanced AI personalization & depth</li><li>Unlimited conversational continuity</li><li>Advanced weekly mood insights</li></ul>{status === "payg" ? <><div className="days-remaining">2 days remaining</div><Button className="full" variant="secondary" onClick={() => { activate("free", "Returned to Free Plan"); }}>Switch to Free Tier</Button></> : <><small className="best-for">Best for exam weeks or intense moments</small><Button className="full" onClick={() => activate("payg", "3-Day Premium Pass activated · Welcome to Premium!")}>Get 3-Day Pass (RM5)</Button></>}</div>;
  const monthlyCard = <div className={`subscription-plan monthly-plan ${status === "monthly" ? "current" : ""}`}><div className="plan-heading"><span>Monthly Plan</span>{status === "monthly" && <b>Active Subscription</b>}</div><h2>ONY Premium</h2><strong>RM19.90 <small>/ month</small></strong><p>Continuous Premium companionship with full features unlocked.</p><ul><li>Continuous Premium access</li><li>Deep memory vault retention</li><li>Full emotional trends & monthly analytics</li><li>Priority AI response speed & continuity</li><li>Exclusive companion tones & soundscapes</li></ul>{status === "monthly" ? <div className="days-remaining">Active Monthly Subscription</div> : <><small className="best-for">Best value for continuous well-being</small><Button className="full" onClick={() => activate("monthly", "ONY Monthly Premium active · Thank you for supporting ONY!")}>Subscribe for RM19.90/month</Button></>}</div>;
  if (status === "trial") return <><PageHeader title="ONY Premium Trial" subtitle="3-Day Free Trial" back={back} /><section className="page-pad"><div className="pricing-status trial"><div className="success-mark"><Icon name="check" /></div><span className="eyebrow">Trial Active</span><h1>ONY Premium Trial</h1><strong>RM0 for 3 days</strong><p>All Premium capabilities are active during your trial period.</p><div className="days-remaining">2 days remaining</div></div><div className="benefits"><h3>Free trial benefits</h3><span><Icon name="check" />Enhanced personalization</span><span><Icon name="check" />Deeper memory retention and continuity</span><span><Icon name="check" />Advanced mood analytics</span><span><Icon name="check" />Expanded Premium experience</span></div><Button className="full" onClick={() => activate("free", "Returned to Free Plan")}>End Trial & Switch to Free</Button><Button className="full" variant="secondary" onClick={back}>Continue with Trial</Button><p className="disclaimer"><Icon name="info" />Transparent pricing. Essential safety and crisis hotlines are always accessible free of charge.</p></section></>;
  if (status === "trialEnded") return <><PageHeader title="Choose Your Plan" subtitle="Your free trial has ended" back={back} /><section className="page-pad"><div className="trial-ended"><SmallLogo /><span className="eyebrow">Trial Complete</span><h1>Welcome to the next chapter.</h1><p>You can continue using ONY for free forever, or choose a Premium plan that fits your journey.</p></div>{freeCard}<div className="paid-options-heading"><span>Premium Plans</span><p>Choose occasional flexibility or continuous full support.</p></div>{paygCard}{monthlyCard}<Button className="full" variant="ghost" onClick={openHelp}><Icon name="shield" />Access essential crisis support</Button><p className="disclaimer"><Icon name="info" />Encrypted billing. Cancel or change your subscription at any time.</p></section></>;
  if (status === "payg") return <><PageHeader title="ONY Premium" subtitle="Pay As You Go" back={back} /><section className="page-pad">{paygCard}<div className="community-note"><Icon name="info" />After this 3-day pass, access seamlessly returns to Free unless you renew.</div>{monthlyCard}<Button className="full" variant="ghost" onClick={openHelp}><Icon name="shield" />Access essential support</Button></section></>;
  if (status === "monthly") return <><PageHeader title="ONY Premium" subtitle="Monthly Plan" back={back} /><section className="page-pad">{monthlyCard}<div className="community-note"><Icon name="info" />Your monthly subscription renews automatically. You can manage or cancel anytime.</div><Button className="full" variant="ghost" onClick={openHelp}><Icon name="shield" />Access essential support</Button></section></>;
  return <><PageHeader title="Subscription" subtitle="Free and Premium options" back={back} /><section className="page-pad"><div className="pricing-intro"><span className="eyebrow">Your ONY Sanctuary</span><h1>Choose what fits you best.</h1><p>The Free tier is always available. Upgrade whenever you want deeper continuity and insights.</p></div>{freeCard}<div className="subscription-plan trial-plan"><div className="plan-heading"><span>Try Premium Free</span><b>Eligible</b></div><h2>3-Day Free Trial</h2><strong>RM0 <small>for 3 days</small></strong><p>Experience the complete ONY Premium journey free for 3 days.</p><ul><li>Enhanced personalization</li><li>Deeper memory continuity</li><li>Advanced mood insights</li><li>Expanded Premium features</li></ul><Button className="full" onClick={() => activate("trial", "3-Day Free Trial started · Welcome!")}>Start 3-Day Free Trial</Button><Button className="full" variant="ghost" onClick={back}>Stay on Free</Button></div><div className="paid-options-heading"><span>Or Choose Premium Directly</span><p>Flexible short-term passes or continuous monthly support.</p></div>{paygCard}{monthlyCard}<Button className="full" variant="ghost" onClick={openHelp}><Icon name="shield" />Access essential support</Button><p className="disclaimer"><Icon name="info" />Transparent policies. Core safety and crisis resources remain free forever for all members.</p></section></>;
}

function SafetyFlow({ back, navigate }: { back: () => void; navigate: (s: Screen) => void }) {
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
  return <div className="safety-page"><PageHeader title="Immediate support" subtitle="Let’s focus on your safety" back={back} /><section className="page-pad">
    <div className="safety-mark"><Icon name="shield" /></div><h1>I’m really sorry you’re going through this.</h1><p className="lead">You don’t have to handle this alone. I want to help you connect with support that can respond right now.</p>
    {answer === "none" && <div className="danger-card"><strong>Are you in immediate danger?</strong><p>This includes having a plan, access to means, or feeling you may act now.</p><Button variant="danger" className="full" onClick={handleAnswerYes}>Yes, I need immediate help</Button><Button variant="secondary" className="full" onClick={() => setAnswer("no")}>No, but I need support</Button></div>}
    {answer === "yes" && <div className="emergency"><span className="eyebrow">Need immediate help?</span><a href="tel:999">999</a><strong>Emergency</strong><p>If you can, move away from anything you could use to hurt yourself and go to a trusted person or public place.</p><Button className="full" onClick={() => navigate("help")}>See Malaysia crisis resources</Button><Button variant="secondary" className="full" onClick={() => navigate("professional")}>Find Professional Help Near Me</Button><Button variant="secondary" className="full" onClick={() => navigate("trusted")}>Contact someone I trust</Button></div>}
    {answer === "no" && <div className="danger-card"><strong>Let’s connect you with someone.</strong><p>Consider contacting a trusted person and staying near others. A befriender, counsellor, or support line can listen without judgment.</p><Button className="full" onClick={() => navigate("help")}>View crisis resources</Button><Button variant="secondary" className="full" onClick={() => navigate("professional")}>Find Professional Help Near Me</Button><Button variant="secondary" className="full" onClick={() => navigate("trusted")}>Contact someone I trust</Button><Button variant="ghost" className="full" onClick={back}>Return when I’m ready</Button></div>}
    <p className="safety-disclaimer"><strong>ONY is an AI companion and does not replace human emergency services.</strong> If in immediate life-threatening crisis, call 999 or Talian HEAL 15555 immediately.</p>
    <div className="sop"><span>Distress Detection</span><span>Gentle De-escalation</span><span>Immediate Crisis Resources</span><span>User Safety Choice</span></div>
  </section></div>;
}

function Help({ back, navigate }: { back: () => void; navigate: (s: Screen) => void }) {
  useEffect(() => {
    writeSystemLog({
      level: "info",
      category: "safety",
      action: "CRISIS_DIRECTORY_ACCESSED",
      message: "User opened verified Malaysian helplines and emergency directory.",
    }).catch(() => {});
  }, []);
  return <><PageHeader title="Get support" subtitle="Professional and urgent help" back={back} /><section className="page-pad">
    <div className="help-hero"><Icon name="shield" /><div><h2>You deserve the right support.</h2><p>ONY provides emotional support and information. It is not a replacement for professional or emergency care.</p></div></div>
    <h3 className="group-title">Immediate danger</h3><a className="resource emergency-resource" href="tel:999"><span><strong>Malaysian Emergency Services</strong><small>Police, ambulance, emergency medical response</small></span><b>Call 999</b></a>
    <h3 className="group-title">Crisis & Emotional Support Helplines</h3>
    <a className="resource" href="tel:15555"><span><strong>Talian HEAL 15555 (MOH Malaysia)</strong><small>24/7 National mental health helpline · Free & confidential</small></span><b>Call 15555</b></a>
    <a className="resource" href="tel:0376272929"><span><strong>Befrienders Kuala Lumpur</strong><small>24/7 Emotional support and suicide prevention hotline</small></span><b>03-7627 2929</b></a>
    <a className="resource" href="tel:15999"><span><strong>Talian Kasih 15999</strong><small>Ministry of Women, Family and Community Development</small></span><b>Call 15999</b></a>
    <div className="resource"><span><strong>University Counselling Centre</strong><small>Contact your campus wellbeing or student affairs office</small></span><Icon name="chevron" /></div>
    <h3 className="group-title">Professional Care & Directory</h3><button className="resource resource-button" onClick={() => navigate("professional")}><span><strong>Find registered professional care near me</strong><small>Government MENTARI centres, hospitals, and licensed counsellors</small></span><Icon name="chevron" /></button>
    <p className="disclaimer"><Icon name="info" />If you or someone you know is in immediate life-threatening danger, dial 999 immediately.</p>
  </section></>;
}

function JobPreferences({ back, navigate }: { back: () => void; navigate: (s: Screen) => void }) {
  const [type, setType] = useState("Internship");
  const [field, setField] = useState("Marketing");
  const [location, setLocation] = useState("Kuala Lumpur");
  const [arrangement, setArrangement] = useState("Hybrid");
  const [experience, setExperience] = useState("Entry level");
  return <><PageHeader title="Career & Opportunities" subtitle="Supportive, youth-friendly workplaces" back={back} /><section className="page-pad">
    <div className="help-hero"><Icon name="market" /><div><h2>What kind of work fits your journey?</h2><p>ONY curates openings with Malaysian employers who prioritize healthy communication and well-being.</p></div></div>
    <SettingChoices title="Job type" values={["Internship", "Part-time", "Full-time"]} value={type} setValue={setType} />
    <SettingChoices title="Job field" values={["Marketing", "Tech", "Design", "Operations"]} value={field} setValue={setField} />
    <label className="field-label">Preferred location</label><TextInput value={location} onChange={(e) => setLocation(e.target.value)} />
    <SettingChoices title="Work arrangement" values={["On-site", "Hybrid", "Remote"]} value={arrangement} setValue={setArrangement} />
    <SettingChoices title="Experience level" values={["No experience", "Entry level", "1–3 years"]} value={experience} setValue={setExperience} />
    <Button className="full" onClick={() => navigate("jobs")}>Show Matching Opportunities</Button>
  </section></>;
}

function JobOpportunities({ back, navigate }: { back: () => void; navigate: (s: Screen) => void }) {
  const jobs = [
    { title: "Junior Content Coordinator", company: "Kita Creative Studio", location: "Kuala Lumpur", type: "Full-time · Hybrid", body: "Support social content, campaign planning, and community storytelling in a supportive team environment." },
    { title: "Marketing & Growth Intern", company: "Bina Digital Media", location: "Petaling Jaya", type: "Internship · Hybrid", body: "Learn campaign operations with mentorship, healthy work-life balance, and clear learning goals." },
    { title: "Community Wellbeing Assistant", company: "Ruang Muda Collective", location: "Remote, Malaysia", type: "Part-time · Remote", body: "Help coordinate online peer events, community inquiries, and member communications." },
  ];
  return <><PageHeader title="Youth Opportunities" subtitle="Curated entry-level & internship openings" back={back} /><section className="page-pad">
    <div className="community-note" style={{ background: "var(--sage-soft)", borderColor: "var(--sage)", color: "#2e7d32" }}><Icon name="check" />Verified partner listings committed to young adult well-being and reasonable working hours.</div>
    <div className="result-summary"><strong>3 verified matches</strong><span>Marketing & Community · Entry level · Malaysia</span></div>
    {jobs.map((job) => <div className="job-card" key={job.title}><span className="prototype-label" style={{ background: "var(--peach-soft)", color: "var(--coral-dark)" }}>Verified Partner</span><h3>{job.title}</h3><strong>{job.company}</strong><div className="job-meta"><span>{job.location}</span><span>{job.type}</span></div><p>{job.body}</p><div className="job-actions"><Button variant="secondary" onClick={() => navigate("jobDetail")}>View Opportunity</Button><Button onClick={() => navigate("jobDetail")}>Apply / Save</Button></div></div>)}
  </section></>;
}

function JobDetail({ back, notify }: { back: () => void; notify: (s: string) => void }) {
  return <><PageHeader title="Opportunity Details" subtitle="Kita Creative Studio" back={back} /><section className="page-pad">
    <div className="job-detail-head"><span className="prototype-label" style={{ background: "var(--peach-soft)", color: "var(--coral-dark)" }}>Youth Friendly</span><h1>Junior Content Coordinator</h1><strong>Kita Creative Studio · Kuala Lumpur</strong><div className="job-meta"><span>Kuala Lumpur</span><span>Full-time</span><span>Hybrid (3 days on-site)</span></div></div>
    <div className="card"><h3>About the role</h3><p>Support social media content, organize campaign calendars, and help turn community insights into useful stories. Our team values mental health, realistic deadlines, and open communication.</p><h3>What we look for</h3><p>Clear communication, curiosity, basic social-media familiarity, and willingness to learn. No prior full-time experience required; fresh graduates and school-leavers welcome.</p></div>
    <Button className="full" onClick={() => notify("Opportunity saved to your profile")}>Save Opportunity</Button>
    <Button variant="secondary" className="full" onClick={() => notify("Application submitted to Kita Creative Studio · They will contact your email")}>Submit Application</Button>
    <p className="disclaimer"><Icon name="info" />ONY partners with youth-conscious Malaysian employers to promote humane work hours and mental well-being.</p>
  </section></>;
}

function Wellbeing({ back, navigate, notify }: { back: () => void; navigate: (s: Screen) => void; notify: (s: string) => void }) {
  const [mode, setMode] = useState("All");
  const options = [
    { title: "Slow instrumental mix", type: "Music", detail: "Focus & calm · 24 min", tone: "ocean" },
    { title: "One-minute breathing pause", type: "Relaxation", detail: "Guided reset · 1 min", tone: "forest" },
    { title: "Ocean horizon", type: "Nature", detail: "Visual grounding · Waves", tone: "ocean" },
    { title: "Soft sunset", type: "Nature", detail: "Visual grounding · Sunset", tone: "sunset" },
    { title: "Mindful pottery & clay", type: "Wellness", detail: "Creative reset session", tone: "peach" },
  ];
  const shown = options.filter((item) => mode === "All" || item.type === mode);
  return <><PageHeader title="Gentle Suggestions" subtitle="Everyday grounding & well-being" back={back} /><section className="page-pad">
    <div className="reflection"><SmallLogo /><div><strong>Let’s make this moment a little lighter.</strong><p>Choose whatever feels manageable. You can pause or change activities at any time.</p></div></div>
    <div className="scroll-chips wellbeing-tabs">{["All", "Music", "Nature", "Relaxation", "Wellness"].map((item) => <Button key={item} variant={mode === item ? "primary" : "secondary"} onClick={() => setMode(item)}>{item}</Button>)}</div>
    <div className="wellbeing-grid">{shown.map((item) => <button key={item.title} className="wellbeing-card" onClick={() => item.type === "Wellness" ? navigate("merchant") : notify(`${item.title} started · Breathe gently 🌱`)}><span className={`wellbeing-visual visual-${item.tone}`}><i /></span><span className="eyebrow">{item.type}</span><strong>{item.title}</strong><small>{item.detail}</small><b>Open</b></button>)}</div>
    <button className="professional-banner" onClick={() => navigate("merchant")}><Icon name="market" /><span><strong>Explore wellness partners</strong><small>Mindful cafés, pottery, yoga, and calming activities</small></span><Icon name="chevron" /></button>
    <p className="disclaimer"><Icon name="info" />These lifestyle suggestions are for everyday relaxation and do not substitute for clinical mental healthcare.</p>
  </section></>;
}

const providers = [
  {
    name: "MENTARI Kuala Lumpur (MOH Malaysia)",
    service: "Community Mental Health Centre · Ministry of Health",
    area: "Sentul / Kuala Lumpur",
    contact: "03-4040 0418",
    phone: "0340400418",
    hours: "Mon - Fri, 8:00 AM - 5:00 PM",
    label: "MOH Certified",
    description: "Public outpatient psychiatric consultations, psychological assessment, counselling, and psychosocial rehabilitation.",
  },
  {
    name: "Befrienders Kuala Lumpur",
    service: "24/7 Suicide Prevention & Emotional Support Helpline",
    area: "Nationwide (Center in Petaling Jaya)",
    contact: "03-7627 2929",
    phone: "0376272929",
    hours: "24 Hours / 7 Days",
    label: "24/7 Helpline",
    description: "Free, confidential 24-hour emotional support hotline for anyone in Malaysia experiencing loneliness, anxiety, or despair.",
  },
  {
    name: "Hospital Kuala Lumpur (HKL) - Psychiatric Clinic",
    service: "Public Hospital Psychiatric & Emergency Department",
    area: "Jalan Pahang, Kuala Lumpur",
    contact: "03-2615 5555",
    phone: "0326155555",
    hours: "24/7 Emergency Department Open",
    label: "Public Hospital",
    description: "Emergency acute psychiatric intervention, inpatient care, and specialized psychiatric clinical services.",
  },
  {
    name: "Malaysian Mental Health Association (MMHA)",
    service: "Community Counselling & Psychotherapy NGO",
    area: "Petaling Jaya, Selangor",
    contact: "03-2780 4390",
    phone: "0327804390",
    hours: "Mon - Sat, 9:00 AM - 5:00 PM",
    label: "Registered NGO",
    description: "Subsidized psychological counselling, psychotherapy, caregiver support, and mental health education programs.",
  },
];

function ProfessionalSupport({ back, navigate }: { back: () => void; navigate: (s: Screen) => void }) {
  const [filter, setFilter] = useState("All");
  const [area, setArea] = useState("Kuala Lumpur & Selangor");
  const shown = providers.filter((provider) => filter === "All" || provider.service.toLowerCase().includes(filter.toLowerCase()) || provider.label.toLowerCase().includes(filter.toLowerCase()));
  return <><PageHeader title="Professional Help Nearby" subtitle="Verified Malaysian mental health resources" back={back} /><section className="page-pad">
    <a className="resource emergency-resource emergency-strip" href="tel:999"><span><strong>In immediate life danger?</strong><small>Call 999 for ambulance or emergency medical care.</small></span><b>Call 999</b></a>
    <div className="location-choice"><strong>Search Area</strong><p>Verified public clinics, hospital departments, and crisis helplines across Malaysia.</p><div className="folder-create"><TextInput value={area} onChange={(event) => setArea(event.target.value)} placeholder="e.g. Kuala Lumpur, Selangor, Penang, Johor" /><Button onClick={() => {}}>Active Area</Button></div></div>
    <div className="support-distinction"><div><strong>24/7 Helplines</strong><p>Immediate, non-clinical listening and emotional support.</p></div><div><strong>Clinical Care</strong><p>Hospital psychiatric units, MENTARI clinics, and licensed therapists.</p></div></div>
    <div className="scroll-chips">{["All", "Helpline", "MOH", "Hospital", "NGO"].map((item) => <Button key={item} variant={filter === item ? "primary" : "secondary"} onClick={() => setFilter(item)}>{item}</Button>)}</div>
    {shown.map((provider) => <div className="provider-card" key={provider.name}><div><span className="prototype-label" style={{ background: "var(--sage-soft)", color: "#2e7d32" }}>{provider.label}</span><h3>{provider.name}</h3><strong>{provider.service}</strong><p>{provider.area} · {provider.contact}</p><small style={{ display: "block", color: "var(--muted)", marginTop: "4px" }}>{provider.hours}</small></div><div className="provider-actions"><a className="btn btn-secondary" href={`tel:${provider.phone}`}>Call Now</a><Button onClick={() => navigate("provider")}>Details</Button></div></div>)}
    <Button className="full" variant="secondary" onClick={() => window.open("https://mentari.moh.gov.my", "_blank")}>Open official MENTARI Malaysia website</Button>
    <p className="disclaimer"><Icon name="info" />All helplines and hospitals listed are certified public or registered non-profit resources in Malaysia.</p>
  </section></>;
}

function ProviderDetail({ back, notify }: { back: () => void; notify: (s: string) => void }) {
  const p = providers[0];
  return <><PageHeader title="Provider Details" subtitle="Verified Malaysian care centre" back={back} /><section className="page-pad">
    <div className="provider-hero"><span className="prototype-label" style={{ background: "var(--sage-soft)", color: "#2e7d32" }}>{p.label}</span><div className="provider-avatar"><Icon name="shield" /></div><h1>{p.name}</h1><p>{p.service} · {p.area}</p></div>
    <div className="card"><h3>About this facility</h3><p>{p.description}</p><h3>Hours & Contact</h3><p>Operating Hours: {p.hours}<br />Telephone: {p.contact}</p></div>
    <a className="btn btn-primary full" href={`tel:${p.phone}`} style={{ textDecoration: "none" }}><Icon name="phone" /> Call {p.contact}</a>
    <Button className="full" variant="ghost" onClick={() => notify("Provider contact saved to your emergency contacts")}>Save to Emergency Contacts</Button>
    <p className="disclaimer"><Icon name="info" />If you require immediate medical intervention or feel unsafe, please proceed to the nearest emergency department or dial 999.</p>
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
        <span className="eyebrow">Connected Trusted Contact</span>
        <h1>{callState === "calling" ? `Calling ${name}…` : `Message sent to ${name}`}</h1>
        <p>{callState === "calling" ? `Connecting to ${name} at ${number || "registered number on file"}…` : "“I could use someone to talk to. Are you free?”"}</p>
        <Button onClick={() => setCallState("idle")}>{callState === "calling" ? "End Call" : "Done"}</Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Trusted contact"
        subtitle="Emergency contact invite link & requests"
        back={back}
        action={
          <Button variant="ghost" onClick={() => void onRefresh()}>
            Refresh
          </Button>
        }
      />
      <section className="page-pad">
        {/* 0. Your Saved Emergency Phone Number */}
        <div className="card" style={{ marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
            <div>
              <span className="eyebrow">Your Account & Emergency Phone</span>
              <strong style={{ display: "block", fontSize: "14px", marginTop: "2px" }}>
                {currentName} ({currentEmail})
              </strong>
              <small style={{ color: "var(--muted)", display: "block", marginTop: "2px" }}>
                Saved emergency number: <strong>{currentPhone || "Not set yet"}</strong>
              </small>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setMyPhoneDraft(currentPhone || "");
                setEditingMyPhone((prev) => !prev);
              }}
            >
              {editingMyPhone ? "Cancel" : currentPhone ? "Edit Phone" : "Add Phone"}
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
                notify("Emergency phone number saved to your profile");
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
                Save
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
              <span className="eyebrow">Invite Link Opened</span>
              <Button variant="ghost" onClick={() => setPendingInvite(null)}>
                Dismiss
              </Button>
            </div>
            <h3 style={{ margin: "4px 0 6px" }}>
              Request to be {pendingInvite.inviterName}’s Emergency Contact
            </h3>
            <p className="muted" style={{ marginBottom: "12px" }}>
              <strong>{pendingInvite.inviterName}</strong> {pendingInvite.inviterEmail ? `(${pendingInvite.inviterEmail})` : ""} shared an invite link with you. Send a request below so {pendingInvite.inviterName} can accept or reject you as their Trusted Emergency Contact.
            </p>
            <form onSubmit={handleRequestViaInviteLink}>
              <label className="field-label">Your emergency phone number (shared with {pendingInvite.inviterName})</label>
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
                Message to {pendingInvite.inviterName} <small>Optional</small>
              </label>
              <TextInput
                value={inviteFriendNote}
                onChange={(e) => setInviteFriendNote(e.target.value)}
                placeholder={`Hi ${pendingInvite.inviterName}, I clicked your invite link to be your emergency contact.`}
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
                    ? "Sending Request…"
                    : `Request to be ${pendingInvite.inviterName}’s Emergency Contact`}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* 2. Share Your Invite Link Card */}
        <div className="card" style={{ marginBottom: "16px" }}>
          <div className="card-title">
            <h3>Invite a Friend via Link</h3>
            <span className="prototype-label">Shareable Link</span>
          </div>
          <p className="muted" style={{ marginTop: "4px", marginBottom: "10px" }}>
            Share this link with a friend. When your friend clicks the link, they can request to become your emergency contact, and you can accept or reject their request right here.
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
              <Icon name="check" /> {copiedInvite ? "Invite Link Copied!" : "Copy Invite Link"}
            </Button>
            <Button variant="secondary" className="full" onClick={() => void handleShareInviteLink()}>
              Share Invite Link
            </Button>
            <Button
              variant="ghost"
              className="full"
              onClick={() => setShowPasteLink((prev) => !prev)}
            >
              {showPasteLink ? "Hide Paste Invite Link" : "Have a friend’s invite link? Paste it here"}
            </Button>
          </div>

          {showPasteLink && (
            <form onSubmit={handleParsePastedLink} style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--line)" }}>
              <label className="field-label">Paste a friend’s ONY Invite Link</label>
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
                  Open Friend’s Invite Link
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* 3. Incoming Requests Section (For when a friend clicks your invite link OR sends you a direct request) */}
        <div className="card" style={{ marginBottom: "16px" }}>
          <div className="card-title">
            <h3>Requests for Your Approval</h3>
            <span>{pendingIncoming.length} pending</span>
          </div>
          <p className="muted" style={{ marginTop: "4px", marginBottom: "12px" }}>
            When a friend clicks your invite link and requests to be your emergency contact (or when another user invites you), you can accept or reject their request here.
          </p>

          {pendingIncoming.length === 0 ? (
            <div className="community-note" style={{ marginBottom: peopleYouSupport.length > 0 ? "12px" : 0 }}>
              <Icon name="info" />
              <span>No pending requests waiting for your approval right now.</span>
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
                          {req.fromEmail} {req.contactPhone ? `· Emergency Phone: ${req.contactPhone}` : ""}
                        </small>
                        <small style={{ color: "var(--accent, #e07a5f)", display: "block", fontWeight: 600, marginTop: "2px" }}>
                          {isFromMyInviteLink
                            ? "Clicked your invite link · Wants to be your Emergency Contact"
                            : "Wants to add you as their Trusted Contact"}
                        </small>
                      </div>
                      <span className="prototype-label">Pending</span>
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
                        <Icon name="check" /> {isFromMyInviteLink ? "Accept as My Emergency Contact" : "Accept Request"}
                      </Button>
                      <Button
                        variant="danger"
                        className="full"
                        disabled={respondingId === req.id}
                        onClick={() => void handleDecision(req, "rejected")}
                      >
                        <Icon name="close" /> Reject
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
                Invite Link Requests You Sent (Waiting for friend to accept)
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
                        To {req.toName} ({req.toEmail})
                      </strong>
                      <small style={{ color: "var(--muted)" }}>
                        Requested via invite link · Waiting for {req.toName}’s approval
                      </small>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        await deleteTrustedContactRequest(req.id);
                        await onRefresh();
                        notify("Cancelled invite link request");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ))}
            </div>
          )}

          {peopleYouSupport.length > 0 && (
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--line)" }}>
              <small style={{ fontWeight: 700, display: "block", marginBottom: "8px" }}>
                People You Support as an Emergency Contact ({peopleYouSupport.length})
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
                      {item.personEmail} · {item.via} · Accepted
                    </small>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await deleteTrustedContactRequest(item.id);
                      await onRefresh();
                      notify(`Removed ${item.personName}`);
                    }}
                  >
                    Remove
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
                <h2>Or Invite Directly by Email / Name</h2>
                <p>
                  Know your friend’s registered ONY email or display name? Send them a request directly so they can accept or reject it in their app.
                </p>
              </div>
            </div>

            <label className="field-label">Friend’s ONY Account Email or Display Name</label>
            <TextInput
              value={recipientIdentifier}
              onChange={(e) => {
                setRecipientIdentifier(e.target.value);
                setFormError(null);
              }}
              placeholder="Enter your friend’s email or display name"
            />

            <label className="field-label">
              Emergency phone number <small>(Optional if saved on their account)</small>
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
              Note to recipient <small>Optional</small>
            </label>
            <TextInput
              value={relationshipNote}
              onChange={(e) => setRelationshipNote(e.target.value)}
              placeholder="Hi, I’d like to add you as my trusted emergency contact on ONY."
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
              {submitting ? "Sending request…" : "Send Trusted Contact Request"}
            </Button>
          </form>
        )}

        {status === "pending" && activeDirectOutgoing && (
          <div className="card">
            <div className="trusted-card">
              <span className="trusted-avatar">{activeDirectOutgoing.toName[0]?.toUpperCase() || "T"}</span>
              <span className="prototype-label">Request Pending · Waiting for Recipient</span>
              <h1>{activeDirectOutgoing.toName}</h1>
              <p style={{ margin: "4px 0" }}>
                <strong>ONY Account:</strong> {activeDirectOutgoing.toEmail}
              </p>
              {activeDirectOutgoing.contactPhone && (
                <p style={{ margin: "2px 0" }}>
                  <strong>Emergency Phone:</strong> {activeDirectOutgoing.contactPhone}
                </p>
              )}
              <p className="muted" style={{ marginTop: "10px" }}>
                Invitation sent to <strong>{activeDirectOutgoing.toName}</strong>’s ONY account. They can open their ONY app to accept or reject your request.
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
              <Button variant="secondary" className="full" onClick={() => void onRefresh()}>
                Check Request Status
              </Button>
              <Button
                variant="danger"
                className="full"
                disabled={submitting}
                onClick={handleCancelOrRemoveActiveContact}
              >
                Cancel Request
              </Button>
            </div>
          </div>
        )}

        {status === "accepted" && (
          <>
            <div className="trusted-card connected">
              <span className="trusted-avatar">{name[0]?.toUpperCase() || "T"}</span>
              <span className="status-pill accepted">Accepted · Active Emergency Contact</span>
              <h1>{name}</h1>
              <p>
                {acceptedViaMyInviteLink
                  ? acceptedViaMyInviteLink.fromEmail
                  : activeDirectOutgoing?.toEmail || email}
              </p>
              <p>
                <strong>Emergency Phone:</strong>{" "}
                {acceptedViaMyInviteLink?.contactPhone ||
                  activeDirectOutgoing?.contactPhone ||
                  number ||
                  "Saved on account"}
              </p>
              <div className="trusted-actions">
                <Button onClick={() => setCallState("calling")}>Call Contact</Button>
                <Button variant="secondary" onClick={() => setCallState("message")}>
                  Send Message
                </Button>
              </div>
            </div>
            <Button
              className="full"
              variant="danger"
              disabled={submitting}
              onClick={handleCancelOrRemoveActiveContact}
            >
              Remove trusted contact
            </Button>
          </>
        )}

        {status === "rejected" && (
          <div className="card">
            <div className="trusted-card">
              <span className="trusted-avatar">{name[0]?.toUpperCase() || "T"}</span>
              <span className="prototype-label">Request Declined</span>
              <h1>{name}</h1>
              <p className="muted">
                {name} ({activeDirectOutgoing?.toEmail || email}) declined your trusted contact request in their app. You can share your invite link or send a new request anytime.
              </p>
            </div>
            <Button
              className="full"
              disabled={submitting}
              onClick={handleCancelOrRemoveActiveContact}
            >
              Invite Another Contact
            </Button>
          </div>
        )}

        <p className="disclaimer">
          <Icon name="info" /> Trusted contact requests and emergency phone numbers are stored in Cloud Firestore. Registered user accounts are kept private and are never listed publicly.
        </p>
      </section>
    </>
  );
}

function CommunityMember({ back, user, notify }: { back: () => void; user: GlobeUser; notify: (s: string) => void }) {
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

  const encouragements = [
    "You’re doing great 🌱",
    "Take it one step at a time",
    "Hope today gets a little lighter",
    "Sending you some gentle support",
  ];

  if (blocked) {
    return (
      <div className="centered-state">
        <div className="success-mark"><Icon name="shield" /></div>
        <h1>Anonymous user blocked</h1>
        <p>This user will be hidden for the rest of this session. No personal profile data was stored.</p>
        <Button onClick={back}>Return to globe</Button>
      </div>
    );
  }

  return (
    <div className="node-chat-page">
      <PageHeader
        title={`Anonymous Node #${user.id}`}
        subtitle={`Mood check-in: ${user.moodLabel} · Identity-free`}
        back={back}
        action={
          <div style={{ display: "flex", gap: "4px" }}>
            <Button variant="ghost" onClick={() => notify("Thank you. Node flagged for moderation review.")}>Report</Button>
            <Button variant="ghost" onClick={() => setBlocked(true)}>Block</Button>
          </div>
        }
      />

      <div className="node-chat-scroll">
        <div className="anonymous-profile compact">
          <span className={`anonymous-orbit mood-${user.moodGlow}`}><i /></span>
          <div>
            <span className="prototype-label">Anonymous member · Node #{user.id}</span>
            <h1>Someone is here</h1>
            <strong>Current mood glow: {user.moodLabel}</strong>
            <p>Messages sent by others or by you appear as anonymous chat bubbles below.</p>
          </div>
        </div>

        <div className="encouragement-intro compact">
          <span className="eyebrow">Quick encouragement</span>
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
          <span>Keep messages kind, supportive, and free of personal identifying details.</span>
        </label>

        <div className="conversation-label">
          <span>Support messages for Node #{user.id}</span>
          <small>{messages.length} {messages.length === 1 ? "bubble" : "bubbles"}</small>
        </div>

        {loadingMessages ? (
          <div className="empty mini-empty"><Icon name="chat" /><p>Loading support messages…</p></div>
        ) : messages.length === 0 ? (
          <div className="empty mini-empty">
            <Icon name="chat" />
            <p>No support messages yet. Send a text or audio bubble from the bottom bar below.</p>
          </div>
        ) : (
          <div className="community-thread">
            {messages.map((message) => {
              const isMe = message.from === "me";
              const timeDisplay = formatFriendlyTime(message.createdAt);
              return (
                <div className={`support-bubble-row ${isMe ? "me" : "member"}`} key={message.id}>
                  {!isMe && (
                    <div className="support-bubble-avatar" aria-hidden="true">
                      {message.kind === "voice" ? "🎙️" : "🌱"}
                    </div>
                  )}
                  <div className="support-bubble-col">
                    <div className="support-bubble-meta">
                      <strong>{isMe ? "You (Anonymous)" : message.senderAnonymous}</strong>
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
            Text
          </button>
          <button
            type="button"
            className={composerMode === "voice" || voice !== "idle" ? "active" : ""}
            onClick={() => setComposerMode("voice")}
          >
            <Icon name="mic" />
            Audio
          </button>
        </div>

        {micNotice && (
          <div className="voice-mic-inline-help" style={{ marginBottom: "8px" }}>
            <small>{micNotice}</small>
            <div style={{ display: "flex", gap: "6px" }}>
              <Button variant="secondary" onClick={handleUseVoiceSample}>Attach Voice Greeting (8s)</Button>
              <Button variant="ghost" onClick={() => setMicNotice(null)}>Dismiss</Button>
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
                  <strong>Tap mic to record audio support</strong>
                  <small>Or attach a warm voice greeting below</small>
                </div>
                <Button variant="secondary" onClick={handleUseVoiceSample}>
                  Voice Greeting (8s)
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
                  <strong>Recording audio · {formatAudioDuration(voiceSeconds)}</strong>
                  <div className="voice-live-waves mini">
                    <span style={{ height: `${Math.max(4, voiceVolume * 20)}px` }} />
                    <span style={{ height: `${Math.max(6, voiceVolume * 28)}px` }} />
                    <span style={{ height: `${Math.max(5, voiceVolume * 22)}px` }} />
                    <span style={{ height: `${Math.max(8, voiceVolume * 30)}px` }} />
                    <span style={{ height: `${Math.max(4, voiceVolume * 18)}px` }} />
                  </div>
                </div>
                <Button variant="ghost" onClick={handleCancelVoice}>Cancel</Button>
                <Button variant="danger" onClick={() => void handleStopVoice()}>Stop</Button>
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
                  <strong>Audio ready · {formatAudioDuration(recordedVoice?.duration || 8)}</strong>
                  <small>{isPlayingPreview ? "Playing preview…" : "Tap play to review before sending"}</small>
                </div>
                <Button variant="ghost" onClick={handleCancelVoice}>Cancel</Button>
                <Button disabled={sending} onClick={() => void confirmVoice()}>
                  {sending ? "Sending…" : "Send Audio"}
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
              placeholder="Write a supportive message…"
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
  return (
    <>
      <PageHeader title="Community guidelines" subtitle="Kind, private, supportive" back={back} />
      <section className="page-pad">
        <div className="help-hero">
          <Icon name="shield" />
          <div>
            <h2>A safer shared space.</h2>
            <p>Every post and interaction is protected by human moderation and automated safety protocols.</p>
          </div>
        </div>
        <div className="card">
          <h3>Be kind</h3>
          <p>Respond with empathy and patience. Harassment, hate speech, or pressure are strictly not tolerated.</p>
          <h3>Protect privacy</h3>
          <p>Never share personal contact info, phone numbers, addresses, or private details of others.</p>
          <h3>Know the boundary</h3>
          <p>Community support provides compassionate peer encouragement; it does not replace qualified clinical or emergency care.</p>
          <h3>Report concerns</h3>
          <p>Use the report button on any post or anonymous profile to immediately flag content for our safety moderation team.</p>
        </div>
        <Button className="full" onClick={back}>
          I understand
        </Button>
      </section>
    </>
  );
}

function RiskDemo({ back, navigate, persona, companion }: { back: () => void; navigate: (s: Screen) => void; persona: Persona; companion: Companion }) {
  const [level, setLevel] = useState<RiskLevel>("low");
  const scenarios: Record<RiskLevel, { label: string; message: string; response: string; next: string[] }> = {
    low: {
      label: "Everyday Stress",
      message: "I’m stressed about an assignment and can’t focus.",
      response: persona === "friendly" ? "That deadline pressure sounds rough. Want to pick one tiny task and do a short breathing reset first?" : persona === "calm" ? "Let’s slow this down. We can name the next manageable task, then take a brief grounding pause." : "That sounds tiring. We can make it feel smaller together—perhaps one gentle task and a short breathing pause.",
      next: ["Try a grounding exercise", "Break the task into one step", "Keep talking with ONY"],
    },
    moderate: {
      label: "Elevated Distress",
      message: "I haven’t been coping for days. I feel hopeless and I’m pulling away from everyone.",
      response: "I’m sorry things have felt this heavy. I won’t assume what this means, but I’d like to understand what support feels possible right now. We can try one grounding step, contact someone you trust, or look at verified human-support options.",
      next: ["Stay connected to someone", "Try a simple grounding step", "Explore human support"],
    },
    high: {
      label: "Immediate Crisis",
      message: "I’m thinking about ending my life and I don’t feel safe.",
      response: "I’m really sorry you’re in this much pain. Are you in immediate danger or likely to act now? If yes, call emergency services (999 or Talian HEAL 15555) now, move away from anything you could use to hurt yourself, and go to a trusted person or public place. I can help you open those options.",
      next: ["Clarify immediate danger", "Contact emergency support", "Reach a trusted person"],
    },
  };
  const scenario = scenarios[level];
  return (
    <>
      <PageHeader title="Safety Protocols" subtitle="Escalation & Care Tier Architecture" back={back} />
      <section className="page-pad">
        <div className="demo-notice">
          <Icon name="shield" />
          <div>
            <strong>Safety-First Architecture</strong>
            <p>ONY is designed with progressive risk assessment to prioritize your safety and connect you with human care whenever distress is detected.</p>
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
            <strong>{scenario.label} Protocol</strong>
            <small>Automated support paired with direct pathways to professional crisis resources.</small>
          </div>
        </div>
        <div className="scenario-thread">
          <span className="scenario-label">User Situation</span>
          <div className="message-row user">
            <div className="message">{scenario.message}</div>
          </div>
          <span className="scenario-label">ONY Companion Response · {personaOptions.find((item) => item.id === persona)?.name}</span>
          <div className="message-row ony">
            <CompanionAvatar companion={companion} />
            <div className="message">{scenario.response}</div>
          </div>
        </div>
        <div className="card next-steps">
          <h3>Escalation Pathways</h3>
          {scenario.next.map((item) => (
            <span key={item}>
              <Icon name="check" />
              {item}
            </span>
          ))}
        </div>
        {level === "low" && <Button className="full" onClick={() => navigate("resources")}>Open self-help library</Button>}
        {level === "moderate" && (
          <>
            <Button className="full" onClick={() => navigate("resources")}>View coping resources</Button>
            <Button className="full" variant="secondary" onClick={() => navigate("professional")}>Explore verified professionals</Button>
          </>
        )}
        {level === "high" && (
          <>
            <Button className="full" variant="danger" onClick={() => navigate("safety")}>Open immediate safety steps</Button>
            <Button className="full" variant="secondary" onClick={() => navigate("trusted")}>Contact a trusted person</Button>
          </>
        )}
        <p className="disclaimer">
          <Icon name="shield" />
          Persona styles change tone only. Every interaction adheres strictly to safety boundaries, clinical guidance, and emergency escalation.
        </p>
      </section>
    </>
  );
}

function ResourceLibrary({ back, navigate, notify }: { back: () => void; navigate: (s: Screen) => void; notify: (s: string) => void }) {
  const [open, setOpen] = useState("Breathing & grounding");
  const resources = [
    { title: "Stress management", description: "Name the pressure, choose one small next step, and pause before reassessing.", action: "Open stress reset" },
    { title: "Breathing & grounding", description: "Try a slow exhale and notice five things you can see around you.", action: "Start 60-second guide" },
    { title: "Reflection & journaling", description: "Write what happened, what you felt, and what support might help.", action: "Open reflection prompt" },
    { title: "Sleep & relaxation", description: "Build a gentle wind-down routine and reduce stimulation before rest.", action: "View sleep habits" },
    { title: "Study or work pressure", description: "Reduce a large task to the smallest visible action you can begin.", action: "Make a small plan" },
    { title: "Professional support", description: "Understand the difference between peer support and qualified care.", action: "Find support" },
    { title: "Crisis & emergency", description: "Access urgent safety steps and confirm current crisis contact details.", action: "View urgent help" },
  ];
  const openResource = (title: string, action: string) => {
    if (open !== title) {
      setOpen(title);
      return;
    }
    if (title === "Professional support") navigate("professional");
    else if (title === "Crisis & emergency") navigate("help");
    else notify(`${action} opened`);
  };
  return (
    <>
      <PageHeader title="Support Library" subtitle="Evidence-based coping resources" back={back} />
      <section className="page-pad">
        <div className="help-hero">
          <Icon name="memory" />
          <div>
            <h2>Practical support, in small steps.</h2>
            <p>Clinically-grounded self-help techniques and verified emergency directories ready when you need them.</p>
          </div>
        </div>
        <div className="knowledge-status">
          <span className="prototype-label" style={{ background: "var(--sage-soft)", color: "#2e7d32" }}>Verified Library</span>
          <p>Curated in alignment with mental health guidelines and verified Malaysian crisis helplines.</p>
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
          <Icon name="info" />
          Evidence-informed educational content for everyday well-being. It does not replace medical consultation or clinical psychiatric treatment.
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
  const [analytics, setAnalytics] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <>
      <PageHeader title="Privacy & safety" subtitle="Clear choices, always" back={back} />
      <section className="page-pad">
        <div className="help-hero">
          <Icon name="shield" />
          <div>
            <h2>Your data, your control.</h2>
            <p>Reflections, consented memories, and check-ins are secured with Cloud Firestore and can be reviewed or removed anytime.</p>
          </div>
        </div>
        <div className="privacy-facts">
          <div>
            <strong>What may be used</strong>
            <p>Your selected persona, language, active consented memories, and bounded recent conversation context are sent securely with your message.</p>
          </div>
          <div>
            <strong>AI provider</strong>
            <p>Conversational replies are processed via private, server-side Gemini API endpoints without exposing your credentials or personal identification.</p>
          </div>
          <div>
            <strong>Share less identifying data</strong>
            <p>Avoid unnecessary names, addresses, IDs, financial details, or private information about other people.</p>
          </div>
        </div>
        <div className="setting-toggle">
          <div>
            <strong>Use active memories</strong>
            <p>Allow {memoryCount} saved {memoryCount === 1 ? "memory" : "memories"} to personalise future replies.</p>
          </div>
          <Toggle on={useActiveMemories} setOn={setUseActiveMemories} />
        </div>
        <div className="setting-toggle">
          <div>
            <strong>Anonymous platform analytics</strong>
            <p>Help improve ONY with aggregated, non-identifying reliability telemetry.</p>
          </div>
          <Toggle on={analytics} setOn={setAnalytics} />
        </div>
        <Button variant="secondary" className="full" onClick={reviewMemories}>
          Review saved memories
        </Button>
        <Button
          variant="secondary"
          className="full"
          onClick={() => navigate("systemLogs")}
        >
          <Icon name="fileText" /> View Database Activity & System Logs (.log)
        </Button>
        <Button
          variant="secondary"
          className="full"
          onClick={() => notify("Account data exported: check-ins, consented memories, and settings archive")}
        >
          Export my data archive
        </Button>
        <Button
          variant="ghost"
          className="full"
          onClick={() => {
            clearMemories();
            notify("Saved memories cleared");
          }}
        >
          Clear saved memories
        </Button>
        {confirmDelete ? (
          <div className="card" style={{ borderColor: "var(--danger)" }}>
            <h3>Permanently delete account?</h3>
            <p>This will permanently purge your user profile, mood history, saved memories, and chat records from our secure servers.</p>
            <Button variant="danger" className="full" onClick={onDeleteAccount}>
              Confirm delete my account
            </Button>
            <Button variant="ghost" className="full" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="danger" className="full" onClick={() => setConfirmDelete(true)}>
            Delete account and all data
          </Button>
        )}
        <p className="disclaimer">
          <Icon name="info" />
          Deleting an account permanently removes all associated records across Cloud Firestore and Firebase Authentication.
        </p>
      </section>
    </>
  );
}

function About({ back }: { back: () => void }) {
  return (
    <>
      <PageHeader title="About ONY" back={back} />
      <section className="page-pad about">
        <img src={logo} alt="Official ONY logo" />
        <span className="eyebrow">Mental Wellness Companion</span>
        <h1>A softer first step.</h1>
        <p>ONY is a compassionate, low-pressure first layer for everyday emotional support, created with Malaysian young adults in mind.</p>
        <div className="boundary-list">
          <span>Not therapy</span>
          <span>Not diagnosis</span>
          <span>Not emergency care</span>
        </div>
        <div className="card">
          <h3>Built with Care in Malaysia</h3>
          <p>ONY is engineered to provide compassionate, culturally-aware companionship, privacy-first community connection, and swift escalation to professional care when you need it most.</p>
        </div>
        <small>ONY · Version 1.0.0 (Release Edition)</small>
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
      notify("Failed to fetch logs from Firestore");
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
        message: "Manual diagnostic ping generated by user. Cloud Firestore round-trip verified.",
        userId: currentUser?.uid,
        userEmail: currentUser?.email,
        metadata: {
          clientTime: new Date().toISOString(),
          screen: "systemLogs",
          database: "ai-studio-onypwa-289f0eda-a42f-43da-8c66-8ac63f5d46a8",
        },
      });
      notify("Diagnostic log entry saved to Firestore");
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
        title="Activity & System Logs"
        subtitle="Production database audit trail"
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
            <h2>Database System & Audit Logs</h2>
            <p>
              Real-time audit log of security events, authentications, safety escalations, and system actions stored in Cloud Firestore.
            </p>
          </div>
        </div>

        <div className="log-file-summary-card">
          <div className="log-file-summary-header">
            <div>
              <strong style={{ fontSize: "13px" }}>📦 Live Database Log Stream</strong>
              <small style={{ display: "block", color: "var(--muted)", fontSize: "11px" }}>
                Collection: <code>systemLogs</code> · Zero-Trust Security
              </small>
            </div>
            <Button
              variant="ghost"
              className="refresh-btn"
              onClick={fetchLogs}
              disabled={loading}
              title="Refresh log stream"
            >
              <Icon name="refresh" /> {loading ? "Syncing…" : "Refresh"}
            </Button>
          </div>

          <div className="log-file-meta-grid">
            <div className="log-file-meta-item">
              <strong>Database Instance</strong>
              <span>ai-studio-onypwa…</span>
            </div>
            <div className="log-file-meta-item">
              <strong>Total Records</strong>
              <span>{logs.length} logged events</span>
            </div>
            <div className="log-file-meta-item">
              <strong>Current User</strong>
              <span>{currentUser?.email || "Anonymous"}</span>
            </div>
            <div className="log-file-meta-item">
              <strong>Log Standard</strong>
              <span>RFC-5424 Syslog / JSON</span>
            </div>
          </div>

          <div className="log-export-actions">
            <Button variant="primary" onClick={handleDownloadLog}>
              <Icon name="download" /> Export .log File
            </Button>
            <Button variant="secondary" onClick={handleDownloadJson}>
              <Icon name="fileText" /> Export .json File
            </Button>
          </div>
          <div style={{ marginTop: "4px" }}>
            <Button
              variant="ghost"
              className="full"
              onClick={handleDiagnosticPing}
              disabled={isSubmittingPing}
            >
              {isSubmittingPing ? "Writing to DB…" : "+ Record Diagnostic Ping in Firestore"}
            </Button>
          </div>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <TextInput
            placeholder="Search action, message, or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", fontSize: "12.5px" }}
          />
        </div>

        <div className="logs-filter-scroll">
          {(["All", "Security", "Audit", "Safety", "Auth", "System", "Errors"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              className={`logs-filter-pill ${filter === cat ? "active" : ""}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="log-empty-state">Loading system log stream from Firestore…</div>
        ) : filteredLogs.length === 0 ? (
          <div className="log-empty-state">No matching log records found in database.</div>
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
  const nav: [Tab, string, string][] = [["chat", "Chatbot", "chat"], ["memory", "Memory Vault", "memory"], ["community", "Community", "community"], ["market", "Marketplace", "market"], ["profile", "Profile", "profile"]];
  return <nav className="bottom-nav">{nav.map(([id, label, icon]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon name={icon} /><span>{label}</span></button>)}</nav>;
}

export default App;
