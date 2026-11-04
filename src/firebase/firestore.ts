import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { auth, db } from "./config.ts";
import { DEFAULT_MERCHANTS, type FirestoreMerchant } from "../data/merchants.ts";
export { DEFAULT_MERCHANTS, type FirestoreMerchant };

export const OperationType = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LIST: "list",
  GET: "get",
  WRITE: "write",
} as const;

export type OperationType = (typeof OperationType)[keyof typeof OperationType];

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface UserProfileData {
  displayName: string;
  email: string;
  phoneNumber?: string;
  theme?: string;
  companion?: string;
  persona?: string;
  preferredLanguage?: string;
  conversationStyle?: string;
  responseLength?: string;
  memoryConsent?: string;
  useActiveMemories?: boolean;
  onboardingCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FirestoreMoodEntry {
  id: string;
  dateKey?: string;
  level: number;
  emoji: string;
  label: string;
  note: string;
  reportAllowed: boolean;
  createdAt: string;
}

export function getLocalDateKey(isoOrDate?: string | Date): string {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const year = validDate.getFullYear();
  const month = String(validDate.getMonth() + 1).padStart(2, "0");
  const day = String(validDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface FirestoreMemory {
  id: string;
  text: string;
  reason: string;
  category: string;
  active: boolean;
  kind?: "text" | "image";
  createdAt: string;
  updatedAt: string;
}

export interface FirestoreJournalEntry {
  id: string;
  title: string;
  content: string;
  dateKey: string;
  entryDate: string;
  moodEmoji?: string;
  moodLabel?: string;
  photoUrl?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FirestoreConversation {
  id: string;
  title: string;
  category: string;
  day: "Today" | "Yesterday";
  messages: { from: "user" | "ony"; text: string }[];
  folderId?: number;
  reportAllowed?: boolean;
  updatedAt: string;
}

export interface FirestoreGlobeUser {
  id: number;
  moodGlow: "bright" | "soft" | "dim" | "neutral";
  moodLabel: string;
  discoverable: boolean;
  acceptsMessages: boolean;
  minLevel: number;
  lon: number;
  lat: number;
  isMe?: boolean;
}

export interface PostLikeRecord {
  userId: string;
  userName: string;
  createdAt: string;
}

export interface PostCommentReplyRecord {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PostCommentRecord {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  likeRecords: PostLikeRecord[];
  replies: PostCommentReplyRecord[];
}

export interface FirestoreCommunityPost {
  id: string;
  author: string;
  authorId?: string;
  title: string;
  body: string;
  category: string;
  likes: number;
  likeRecords: PostLikeRecord[];
  comments: PostCommentRecord[];
  media?: "image" | "voice";
  audioUrl?: string;
  audioDuration?: number;
  createdAt: string;
}


export interface FirestoreCommunityMessage {
  id: string;
  toUserId: string;
  toUserMood?: string;
  fromUserId: string;
  senderAnonymous: string;
  recipientAnonymous: string;
  kind: "text" | "voice";
  text: string;
  audioUrl?: string;
  audioDuration?: number;
  transcription?: string;
  createdAt: string;
}

export interface FirestoreRegisteredAccount {
  uid: string;
  displayName: string;
  email: string;
  emailLower: string;
  phoneNumber?: string;
  updatedAt: string;
}

export interface FirestoreTrustedContactRequest {
  id: string;
  fromUid: string;
  fromName: string;
  fromEmail: string;
  toUid: string;
  toName: string;
  toEmail: string;
  contactPhone: string;
  relationshipNote?: string;
  requestKind?: "direct_invite" | "invite_link";
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
  respondedAt?: string;
}

// User Profile Operations
export async function syncRegisteredAccount(account: {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
}): Promise<void> {
  if (!account.uid || !account.email) return;
  const now = new Date().toISOString();
  const cleanEmail = account.email.trim();
  const cleanName = account.displayName.trim() || cleanEmail.split("@")[0] || "ONY Member";
  const cleanPhone = account.phoneNumber ? account.phoneNumber.trim() : undefined;
  try {
    await setDoc(
      doc(db, "globeUsers", `account_${account.uid}`),
      {
        recordType: "user_account",
        uid: account.uid,
        displayName: cleanName,
        email: cleanEmail,
        emailLower: cleanEmail.toLowerCase(),
        ...(cleanPhone ? { phoneNumber: cleanPhone } : {}),
        updatedAt: now,
      },
      { merge: true },
    );
  } catch (err) {
    console.warn("[ONY Directory] Could not sync registered account:", err);
  }
}

export async function createUserProfileDoc(
  uid: string,
  initial: { email: string; displayName: string; phoneNumber?: string },
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, "users", uid);
    const now = new Date().toISOString();
    const cleanPhone = (initial.phoneNumber || "").trim();
    await setDoc(
      userRef,
      {
        displayName: initial.displayName,
        email: initial.email,
        phoneNumber: cleanPhone,
        theme: "peach",
        companion: "Cat",
        persona: "gentle",
        preferredLanguage: "English",
        conversationStyle: "Reflective",
        responseLength: "Balanced",
        memoryConsent: "allow",
        useActiveMemories: true,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
    await syncRegisteredAccount({
      uid,
      displayName: initial.displayName,
      email: initial.email,
      phoneNumber: cleanPhone,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfileData | null> {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;
    return snap.data() as UserProfileData;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfileData>,
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, "users", uid);
    const now = new Date().toISOString();
    await updateDoc(userRef, {
      ...updates,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Mood Check-in Operations (Saved per day in users/{uid}/moodCheckins/{YYYY-MM-DD})
export async function listMoodEntries(uid: string): Promise<FirestoreMoodEntry[]> {
  const path = `users/${uid}/moodCheckins`;
  try {
    const colRef = collection(db, "users", uid, "moodCheckins");
    const snap = await getDocs(colRef);
    const rawDocs = snap.docs
      .map((d) => {
        const data = d.data() as Omit<FirestoreMoodEntry, "id">;
        const dateKey =
          data.dateKey ||
          (/^\d{4}-\d{2}-\d{2}$/.test(d.id) ? d.id : getLocalDateKey(data.createdAt));
        return {
          id: d.id,
          ...data,
          note: data.note || "",
          reportAllowed: data.reportAllowed ?? true,
          dateKey,
        };
      })
      .sort(
        (a, b) =>
          (b.dateKey || "").localeCompare(a.dateKey || "") ||
          (b.createdAt || "").localeCompare(a.createdAt || ""),
      );

    const byDate = new Map<string, FirestoreMoodEntry>();
    for (const item of rawDocs) {
      const key = item.dateKey || getLocalDateKey(item.createdAt);
      if (!byDate.has(key)) {
        byDate.set(key, item);
      }
    }
    return Array.from(byDate.values())
      .sort(
        (a, b) =>
          (b.dateKey || "").localeCompare(a.dateKey || "") ||
          (b.createdAt || "").localeCompare(a.createdAt || ""),
      )
      .slice(0, 90);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getTodayMoodEntry(uid: string): Promise<FirestoreMoodEntry | null> {
  const todayKey = getLocalDateKey();
  const path = `users/${uid}/moodCheckins/${todayKey}`;
  try {
    const docRef = doc(db, "users", uid, "moodCheckins", todayKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Omit<FirestoreMoodEntry, "id">;
      return {
        id: snap.id,
        ...data,
        note: data.note || "",
        reportAllowed: data.reportAllowed ?? true,
        dateKey: data.dateKey || todayKey,
      };
    }
    const all = await listMoodEntries(uid);
    return all.find((m) => (m.dateKey || getLocalDateKey(m.createdAt)) === todayKey) || null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveMoodEntry(
  uid: string,
  entry: Omit<FirestoreMoodEntry, "id">,
): Promise<string> {
  const dateKey = entry.dateKey || getLocalDateKey(entry.createdAt);
  const path = `users/${uid}/moodCheckins/${dateKey}`;
  try {
    const docRef = doc(db, "users", uid, "moodCheckins", dateKey);
    await setDoc(
      docRef,
      {
        level: entry.level,
        emoji: entry.emoji,
        label: entry.label,
        note: (entry.note || "").slice(0, 500),
        reportAllowed: entry.reportAllowed ?? true,
        createdAt: entry.createdAt || new Date().toISOString(),
        dateKey,
      },
      { merge: true },
    );
    // Also keep user's anonymous globe node mood in sync
    const moodGlow: "bright" | "soft" | "dim" =
      entry.level >= 4 ? "bright" : entry.level === 3 ? "soft" : "dim";
    await setDoc(
      doc(db, "globeUsers", "0"),
      {
        id: 0,
        isMe: true,
        moodLabel: entry.label,
        moodGlow,
      },
      { merge: true },
    ).catch(() => {});
    return dateKey;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateMoodEntry(
  uid: string,
  entryId: string,
  updates: Partial<FirestoreMoodEntry>,
): Promise<void> {
  const path = `users/${uid}/moodCheckins/${entryId}`;
  try {
    const docRef = doc(db, "users", uid, "moodCheckins", entryId);
    await setDoc(docRef, updates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteMoodEntry(uid: string, entryId: string): Promise<void> {
  const path = `users/${uid}/moodCheckins/${entryId}`;
  try {
    const docRef = doc(db, "users", uid, "moodCheckins", entryId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Memory Vault Operations
export async function listMemories(uid: string): Promise<FirestoreMemory[]> {
  const path = `users/${uid}/memories`;
  try {
    const colRef = collection(db, "users", uid, "memories");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreMemory, "id">),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveMemory(
  uid: string,
  memory: Omit<FirestoreMemory, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const path = `users/${uid}/memories`;
  try {
    const colRef = collection(db, "users", uid, "memories");
    const newDocRef = doc(colRef);
    const now = new Date().toISOString();
    await setDoc(newDocRef, {
      ...memory,
      createdAt: now,
      updatedAt: now,
    });
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateMemory(
  uid: string,
  memoryId: string,
  updates: Partial<FirestoreMemory>,
): Promise<void> {
  const path = `users/${uid}/memories/${memoryId}`;
  try {
    const docRef = doc(db, "users", uid, "memories", memoryId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteMemory(uid: string, memoryId: string): Promise<void> {
  const path = `users/${uid}/memories/${memoryId}`;
  try {
    const docRef = doc(db, "users", uid, "memories", memoryId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearAllMemories(uid: string): Promise<void> {
  const path = `users/${uid}/memories`;
  try {
    const colRef = collection(db, "users", uid, "memories");
    const snap = await getDocs(colRef);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// Digital Journal & Diary Operations
// ==========================================

const LOCAL_STORAGE_JOURNAL_KEY = "ony_cached_journal_entries";

export function loadCachedJournalEntries(): FirestoreJournalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_JOURNAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCachedJournalEntries(entries: FirestoreJournalEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_JOURNAL_KEY, JSON.stringify(entries));
  } catch {}
}

export const DEFAULT_JOURNAL_ENTRIES: Omit<FirestoreJournalEntry, "id" | "createdAt" | "updatedAt">[] = [
  {
    title: "Evening walk around Tasik Titiwangsa 🌿",
    content:
      "The evening breeze after the rain felt so grounding today. I took 30 minutes away from my laptop to just walk without earphones. Reminded myself that progress doesn't always have to be loud. One step at a time.",
    dateKey: getLocalDateKey(),
    entryDate: new Date().toISOString(),
    moodEmoji: "🌿",
    moodLabel: "Reflective",
    tags: ["Mindfulness", "Nature", "Evening"],
  },
  {
    title: "Small win: Finished my project pitch slides ☕",
    content:
      "Finally wrapped up the slides for Friday's presentation. Felt the familiar imposter syndrome creeping in during lunch, but taking five slow breaths and chatting with ONY helped me reset. Rewarded myself with a warm hazelnut latte.",
    dateKey: getLocalDateKey(new Date(Date.now() - 86400000)),
    entryDate: new Date(Date.now() - 86400000).toISOString(),
    moodEmoji: "☀️",
    moodLabel: "Grateful",
    tags: ["Study & Work", "Gratitude", "Self-Care"],
  },
  {
    title: "Letting go of things outside my control 🌧️",
    content:
      "Felt a wave of heaviness this afternoon when unexpected news shifted the timeline. Writing it down helps untangle the knot in my chest. It is okay to feel disappointed, and it is okay to rest tonight without forcing positivity.",
    dateKey: getLocalDateKey(new Date(Date.now() - 3 * 86400000)),
    entryDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    moodEmoji: "🌧️",
    moodLabel: "Tender",
    tags: ["Venting", "Acceptance", "Rest"],
  },
];

export async function listJournalEntries(uid: string): Promise<FirestoreJournalEntry[]> {
  const path = `users/${uid}/journalEntries`;
  try {
    const colRef = collection(db, "users", uid, "journalEntries");
    const q = query(colRef, orderBy("entryDate", "desc"));
    const snap = await getDocs(q);
    const loaded = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreJournalEntry, "id">),
    }));
    if (loaded.length > 0) {
      saveCachedJournalEntries(loaded);
      return loaded;
    }
    const cached = loadCachedJournalEntries();
    return cached;
  } catch (error) {
    console.warn("[ONY Journal] List notice, using local cache:", error);
    return loadCachedJournalEntries();
  }
}

export async function saveJournalEntry(
  uid: string,
  entry: Omit<FirestoreJournalEntry, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const path = `users/${uid}/journalEntries`;
  try {
    const colRef = collection(db, "users", uid, "journalEntries");
    const newDocRef = doc(colRef);
    const now = new Date().toISOString();
    await setDoc(newDocRef, {
      ...entry,
      createdAt: now,
      updatedAt: now,
    });
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateJournalEntry(
  uid: string,
  entryId: string,
  updates: Partial<FirestoreJournalEntry>,
): Promise<void> {
  const path = `users/${uid}/journalEntries/${entryId}`;
  try {
    const docRef = doc(db, "users", uid, "journalEntries", entryId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteJournalEntry(uid: string, entryId: string): Promise<void> {
  const path = `users/${uid}/journalEntries/${entryId}`;
  try {
    const docRef = doc(db, "users", uid, "journalEntries", entryId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Conversation Operations
export async function listConversations(uid: string): Promise<FirestoreConversation[]> {
  const path = `users/${uid}/conversations`;
  try {
    const colRef = collection(db, "users", uid, "conversations");
    const q = query(colRef, orderBy("updatedAt", "desc"), limit(30));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreConversation, "id">),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveConversation(
  uid: string,
  conversationId: string,
  data: Omit<FirestoreConversation, "id">,
): Promise<void> {
  const path = `users/${uid}/conversations/${conversationId}`;
  try {
    const docRef = doc(db, "users", uid, "conversations", conversationId);
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteConversation(uid: string, conversationId: string): Promise<void> {
  const path = `users/${uid}/conversations/${conversationId}`;
  try {
    const docRef = doc(db, "users", uid, "conversations", conversationId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Account Data Cleanup
export async function deleteUserData(uid: string): Promise<void> {
  const subcollections = ["moodCheckins", "memories", "conversations"];
  for (const sub of subcollections) {
    const path = `users/${uid}/${sub}`;
    try {
      const colRef = collection(db, "users", uid, sub);
      const snap = await getDocs(colRef);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
  const userPath = `users/${uid}`;
  try {
    const userDocRef = doc(db, "users", uid);
    await deleteDoc(userDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, userPath);
  }
}

// ==========================================
// Community Globe Operations
// ==========================================

export async function listGlobeUsers(): Promise<FirestoreGlobeUser[]> {
  const path = "globeUsers";
  try {
    const colRef = collection(db, "globeUsers");
    const snap = await getDocs(colRef);
    const globeDocs = snap.docs.filter((d) => {
      const raw = d.data() as Record<string, unknown>;
      return /^\d+$/.test(d.id) && !raw.recordType && typeof raw.moodGlow === "string";
    });
    if (globeDocs.length === 0) return DEFAULT_GLOBE_USERS;
    const loaded: FirestoreGlobeUser[] = globeDocs
      .map((d) => {
        const data = d.data() as FirestoreGlobeUser;
        const id = data.id ?? Number(d.id);
        return {
          id,
          moodGlow: data.moodGlow,
          moodLabel: data.moodLabel,
          discoverable: data.discoverable,
          acceptsMessages: data.acceptsMessages,
          minLevel: data.minLevel,
          lon: data.lon,
          lat: data.lat,
          isMe: Boolean(data.isMe || id === 0),
        };
      })
      .sort((a, b) => a.id - b.id);

    if (!loaded.some((u) => u.id === 0 || u.isMe)) {
      loaded.unshift({ ...DEFAULT_GLOBE_USERS[0], isMe: true });
    }
    return loaded;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ==========================================
// Community Guideline & Profanity Validation
// ==========================================

const PROFANITY_WORDS = [
  "fuck",
  "fucking",
  "fucked",
  "fucker",
  "fck",
  "fuk",
  "shit",
  "shitty",
  "bullshit",
  "sht",
  "bitch",
  "bitches",
  "asshole",
  "arsehole",
  "bastard",
  "dick",
  "cock",
  "pussy",
  "cunt",
  "slut",
  "whore",
  "motherfucker",
  "wtf",
  "stfu",
  "idiot",
  "idiotic",
  "stupid",
  "moron",
  "dumbass",
  "jackass",
  "loser",
  "pathetic",
  "worthless",
  "useless",
  "retard",
  "retarded",
  "scumbag",
  "bodoh",
  "babi",
  "sial",
  "celaka",
  "lancau",
  "pukimak",
  "bangang",
  "ampang",
  "mampus",
];

const PROFANITY_PHRASES = [
  "kill yourself",
  "kys",
  "go die",
  "i hate you",
  "you should die",
  "nobody likes you",
  "shut up",
  "screw you",
  "damn you",
  "fuck off",
  "piss off",
  "pergi mati",
  "kepala bapak",
];

export function validateCommunityCommentText(text: string): {
  valid: boolean;
  reason?: string;
  matchedTerm?: string;
} {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return { valid: false, reason: "Please write a message before sending." };
  }

  const normalized = trimmed.toLowerCase();

  for (const phrase of PROFANITY_PHRASES) {
    if (normalized.includes(phrase)) {
      return {
        valid: false,
        matchedTerm: phrase,
        reason: `Community Guideline Violation: Your comment contains unkind or prohibited language ("${phrase}"). Please keep all comments supportive, kind, and free of profanity.`,
      };
    }
  }

  const tokens = normalized
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const word of PROFANITY_WORDS) {
    if (tokens.includes(word)) {
      return {
        valid: false,
        matchedTerm: word,
        reason: `Community Guideline Violation: Profanity or disrespectful language ("${word}") is not allowed in ONY Community. Please edit your comment to be supportive.`,
      };
    }
  }

  return { valid: true };
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        cleaned[k] = stripUndefinedDeep(v);
      }
    }
    return cleaned as T;
  }
  return value;
}

function normalizeLikeRecords(raw: unknown): PostLikeRecord[] {
  if (!Array.isArray(raw)) return [];
  const seenUsers = new Set<string>();
  const list: PostLikeRecord[] = [];
  for (const item of raw) {
    if (item && typeof item === "object") {
      const rec = item as Partial<PostLikeRecord>;
      const userId = String(rec.userId || "").trim();
      const userName = String(rec.userName || "Community Member").trim();
      const createdAt = String(rec.createdAt || new Date().toISOString());
      const key = userId || userName.toLowerCase();
      if (key && !seenUsers.has(key)) {
        seenUsers.add(key);
        list.push({
          userId: userId || `user_${userName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
          userName,
          createdAt,
        });
      }
    }
  }
  return list;
}

function normalizeCommentReplies(raw: unknown): PostCommentReplyRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item, idx) => {
      const r = item as Partial<PostCommentReplyRecord>;
      return {
        id: String(r.id || `reply_${idx + 1}`),
        userId: String(r.userId || "community_member"),
        userName: String(r.userName || "Community Member"),
        text: String(r.text || ""),
        createdAt: String(r.createdAt || new Date().toISOString()),
        ...(r.updatedAt ? { updatedAt: String(r.updatedAt) } : {}),
      };
    });
}

function normalizePostComments(raw: unknown): PostCommentRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item, idx) => {
      const c = item as Partial<PostCommentRecord>;
      const likeRecords = normalizeLikeRecords(c.likeRecords);
      const replies = normalizeCommentReplies(c.replies);
      return {
        id: String(c.id || `comment_${idx + 1}`),
        userId: String(c.userId || "community_member"),
        userName: String(c.userName || "Community Member"),
        text: String(c.text || ""),
        createdAt: String(c.createdAt || new Date().toISOString()),
        ...(c.updatedAt ? { updatedAt: String(c.updatedAt) } : {}),
        likeRecords,
        likes: likeRecords.length,
        replies,
      };
    });
}

// ==========================================
// Community Posts Operations
// ==========================================

export async function listCommunityPosts(): Promise<FirestoreCommunityPost[]> {
  const path = "communityPosts";
  try {
    const colRef = collection(db, "communityPosts");
    const q = query(colRef, orderBy("createdAt", "desc"), limit(50));
    const snap = await getDocs(q);

    const results: FirestoreCommunityPost[] = [];
    for (const d of snap.docs) {
      const raw = d.data() as Record<string, unknown>;
      const title = String(raw.title || "");
      const matchingDefault = DEFAULT_COMMUNITY_POSTS.find(
        (def) => def.title.toLowerCase() === title.toLowerCase(),
      );

      const hasLikeRecordsField = Array.isArray(raw.likeRecords);
      const hasCommentsField = Array.isArray(raw.comments);

      const likeRecords = hasLikeRecordsField
        ? normalizeLikeRecords(raw.likeRecords)
        : matchingDefault
          ? matchingDefault.likeRecords
          : [];

      const comments = hasCommentsField
        ? normalizePostComments(raw.comments)
        : matchingDefault
          ? matchingDefault.comments
          : [];

      const likesCount = likeRecords.length;

      const postObj: FirestoreCommunityPost = {
        id: d.id,
        author: String(raw.author || "Anonymous"),
        ...(raw.authorId ? { authorId: String(raw.authorId) } : {}),
        title,
        body: String(raw.body || ""),
        category: String(raw.category || "General"),
        likes: likesCount,
        likeRecords,
        comments,
        ...(raw.media === "image" || raw.media === "voice" ? { media: raw.media } : {}),
        ...(raw.audioUrl ? { audioUrl: String(raw.audioUrl) } : {}),
        ...(typeof raw.audioDuration === "number" ? { audioDuration: raw.audioDuration } : {}),
        createdAt: String(raw.createdAt || new Date().toISOString()),
      };

      // Backfill older Firestore post documents so the database holds the full enhanced schema
      if (!hasLikeRecordsField || !hasCommentsField || raw.likes !== likesCount) {
        setDoc(
          doc(db, "communityPosts", d.id),
          stripUndefinedDeep({
            likes: likesCount,
            likeRecords,
            comments,
          }),
          { merge: true },
        ).catch(() => {});
      }

      results.push(postObj);
    }

    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createCommunityPost(
  post: Omit<FirestoreCommunityPost, "id">,
  customId?: string,
): Promise<string> {
  const path = "communityPosts";
  try {
    const colRef = collection(db, "communityPosts");
    const newDocRef = customId ? doc(db, "communityPosts", customId) : doc(colRef);
    const likeRecords = normalizeLikeRecords(post.likeRecords);
    const comments = normalizePostComments(post.comments);
    const payload = stripUndefinedDeep({
      ...post,
      likes: likeRecords.length,
      likeRecords,
      comments,
    });
    await setDoc(newDocRef, payload, { merge: true });
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function saveCommunityPostInteractionState(
  post: FirestoreCommunityPost,
): Promise<FirestoreCommunityPost> {
  const path = `communityPosts/${post.id}`;
  const likeRecords = normalizeLikeRecords(post.likeRecords);
  const comments = normalizePostComments(post.comments);
  const updatedPost: FirestoreCommunityPost = {
    ...post,
    likes: likeRecords.length,
    likeRecords,
    comments,
  };
  try {
    const docRef = doc(db, "communityPosts", String(post.id));
    await setDoc(
      docRef,
      stripUndefinedDeep({
        author: updatedPost.author,
        authorId: updatedPost.authorId,
        title: updatedPost.title,
        body: updatedPost.body,
        category: updatedPost.category,
        likes: updatedPost.likes,
        likeRecords: updatedPost.likeRecords,
        comments: updatedPost.comments,
        media: updatedPost.media,
        audioUrl: updatedPost.audioUrl,
        audioDuration: updatedPost.audioDuration,
        createdAt: updatedPost.createdAt,
      }),
      { merge: true },
    );
    return updatedPost;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleCommunityPostLike(
  post: FirestoreCommunityPost,
  user: { uid: string; name: string },
): Promise<FirestoreCommunityPost> {
  const cleanUid = user.uid.trim() || "anonymous_user";
  const cleanName = user.name.trim() || "ONY Member";
  const currentLikes = normalizeLikeRecords(post.likeRecords);
  const alreadyLiked = currentLikes.some(
    (item) =>
      item.userId === cleanUid ||
      item.userName.trim().toLowerCase() === cleanName.toLowerCase(),
  );

  const nextLikeRecords = alreadyLiked
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

  return saveCommunityPostInteractionState({
    ...post,
    likes: nextLikeRecords.length,
    likeRecords: nextLikeRecords,
  });
}

export async function addCommunityPostComment(
  post: FirestoreCommunityPost,
  params: { userId: string; userName: string; text: string },
): Promise<FirestoreCommunityPost> {
  const validation = validateCommunityCommentText(params.text);
  if (!validation.valid) {
    throw new Error(validation.reason || "Comment violates community guidelines.");
  }

  const now = new Date().toISOString();
  const newComment: PostCommentRecord = {
    id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: params.userId.trim() || "anonymous_user",
    userName: params.userName.trim() || "ONY Member",
    text: params.text.trim(),
    createdAt: now,
    likes: 0,
    likeRecords: [],
    replies: [],
  };

  const nextComments = [...normalizePostComments(post.comments), newComment];
  return saveCommunityPostInteractionState({
    ...post,
    comments: nextComments,
  });
}

export async function editCommunityPostComment(
  post: FirestoreCommunityPost,
  commentId: string,
  newText: string,
): Promise<FirestoreCommunityPost> {
  const validation = validateCommunityCommentText(newText);
  if (!validation.valid) {
    throw new Error(validation.reason || "Comment violates community guidelines.");
  }

  const now = new Date().toISOString();
  const nextComments = normalizePostComments(post.comments).map((c) =>
    c.id === commentId
      ? {
          ...c,
          text: newText.trim(),
          updatedAt: now,
        }
      : c,
  );

  return saveCommunityPostInteractionState({
    ...post,
    comments: nextComments,
  });
}

export async function deleteCommunityPostComment(
  post: FirestoreCommunityPost,
  commentId: string,
): Promise<FirestoreCommunityPost> {
  const nextComments = normalizePostComments(post.comments).filter((c) => c.id !== commentId);
  return saveCommunityPostInteractionState({
    ...post,
    comments: nextComments,
  });
}

export async function toggleCommunityCommentLike(
  post: FirestoreCommunityPost,
  commentId: string,
  user: { uid: string; name: string },
): Promise<FirestoreCommunityPost> {
  const cleanUid = user.uid.trim() || "anonymous_user";
  const cleanName = user.name.trim() || "ONY Member";

  const nextComments = normalizePostComments(post.comments).map((c) => {
    if (c.id !== commentId) return c;
    const currentLikes = normalizeLikeRecords(c.likeRecords);
    const alreadyLiked = currentLikes.some(
      (item) =>
        item.userId === cleanUid ||
        item.userName.trim().toLowerCase() === cleanName.toLowerCase(),
    );
    const updatedLikes = alreadyLiked
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
    return {
      ...c,
      likeRecords: updatedLikes,
      likes: updatedLikes.length,
    };
  });

  return saveCommunityPostInteractionState({
    ...post,
    comments: nextComments,
  });
}

export async function addCommunityCommentReply(
  post: FirestoreCommunityPost,
  commentId: string,
  params: { userId: string; userName: string; text: string },
): Promise<FirestoreCommunityPost> {
  const validation = validateCommunityCommentText(params.text);
  if (!validation.valid) {
    throw new Error(validation.reason || "Reply violates community guidelines.");
  }

  const now = new Date().toISOString();
  const newReply: PostCommentReplyRecord = {
    id: `reply_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: params.userId.trim() || "anonymous_user",
    userName: params.userName.trim() || "ONY Member",
    text: params.text.trim(),
    createdAt: now,
  };

  const nextComments = normalizePostComments(post.comments).map((c) =>
    c.id === commentId
      ? {
          ...c,
          replies: [...normalizeCommentReplies(c.replies), newReply],
        }
      : c,
  );

  return saveCommunityPostInteractionState({
    ...post,
    comments: nextComments,
  });
}

export async function editCommunityCommentReply(
  post: FirestoreCommunityPost,
  commentId: string,
  replyId: string,
  newText: string,
): Promise<FirestoreCommunityPost> {
  const validation = validateCommunityCommentText(newText);
  if (!validation.valid) {
    throw new Error(validation.reason || "Reply violates community guidelines.");
  }

  const now = new Date().toISOString();
  const nextComments = normalizePostComments(post.comments).map((c) =>
    c.id === commentId
      ? {
          ...c,
          replies: normalizeCommentReplies(c.replies).map((r) =>
            r.id === replyId
              ? {
                  ...r,
                  text: newText.trim(),
                  updatedAt: now,
                }
              : r,
          ),
        }
      : c,
  );

  return saveCommunityPostInteractionState({
    ...post,
    comments: nextComments,
  });
}

export async function deleteCommunityCommentReply(
  post: FirestoreCommunityPost,
  commentId: string,
  replyId: string,
): Promise<FirestoreCommunityPost> {
  const nextComments = normalizePostComments(post.comments).map((c) =>
    c.id === commentId
      ? {
          ...c,
          replies: normalizeCommentReplies(c.replies).filter((r) => r.id !== replyId),
        }
      : c,
  );

  return saveCommunityPostInteractionState({
    ...post,
    comments: nextComments,
  });
}

export async function updateCommunityPostLikes(
  postId: string,
  newLikes: number,
): Promise<void> {
  const path = `communityPosts/${postId}`;
  try {
    const docRef = doc(db, "communityPosts", postId);
    await updateDoc(docRef, { likes: newLikes });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================
// Marketplace Merchants Operations
// ==========================================

export async function listMerchants(): Promise<FirestoreMerchant[]> {
  const path = "merchants";
  try {
    const colRef = collection(db, "merchants");
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreMerchant, "id">),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ==========================================
// Community Support Messages Operations
// ==========================================

export async function listCommunityMessages(
  toUserId?: string,
): Promise<FirestoreCommunityMessage[]> {
  const path = "communityMessages";
  try {
    const colRef = collection(db, "communityMessages");
    const snap = await getDocs(colRef);
    let messages = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreCommunityMessage, "id">),
    }));
    // Sort in memory by newest first (resilient against composite index requirements)
    messages.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    if (toUserId) {
      const currentUid = auth.currentUser?.uid;
      messages = messages.filter(
        (m) =>
          m.toUserId === toUserId ||
          (toUserId === "0" &&
            (m.toUserId === "0" ||
              m.toUserId === "me" ||
              Boolean(currentUid && m.toUserId === currentUid))),
      );
    }
    return messages;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createCommunityMessage(
  message: Omit<FirestoreCommunityMessage, "id">,
): Promise<string> {
  const path = "communityMessages";
  try {
    const colRef = collection(db, "communityMessages");
    const newDocRef = doc(colRef);
    await setDoc(newDocRef, message);
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ==========================================
// Initial Database Seeding
// ==========================================

export const DEFAULT_GLOBE_USERS: FirestoreGlobeUser[] = [
  { id: 0, moodGlow: "bright", moodLabel: "Calm", discoverable: true, acceptsMessages: true, minLevel: 0, lon: 101, lat: 3, isMe: true },
  { id: 1, moodGlow: "bright", moodLabel: "Good", discoverable: true, acceptsMessages: true, minLevel: 0, lon: -145, lat: 38 },
  { id: 2, moodGlow: "soft", moodLabel: "Okay", discoverable: true, acceptsMessages: false, minLevel: 0, lon: -45, lat: 24 },
  { id: 3, moodGlow: "dim", moodLabel: "Low", discoverable: true, acceptsMessages: true, minLevel: 0, lon: 70, lat: -4 },
  { id: 4, moodGlow: "neutral", moodLabel: "No check-in shared", discoverable: true, acceptsMessages: false, minLevel: 0, lon: 150, lat: 28 },
  { id: 5, moodGlow: "bright", moodLabel: "Great", discoverable: true, acceptsMessages: false, minLevel: 1, lon: 96, lat: 12 },
  { id: 6, moodGlow: "dim", moodLabel: "Very low", discoverable: true, acceptsMessages: true, minLevel: 1, lon: 118, lat: -12 },
  { id: 7, moodGlow: "soft", moodLabel: "Okay", discoverable: true, acceptsMessages: true, minLevel: 2, lon: 132, lat: 22 },
  { id: 8, moodGlow: "neutral", moodLabel: "No check-in shared", discoverable: true, acceptsMessages: true, minLevel: 2, lon: 82, lat: -25 },
  { id: 9, moodGlow: "bright", moodLabel: "Good", discoverable: true, acceptsMessages: true, minLevel: 3, lon: 108, lat: 32 },
  { id: 10, moodGlow: "dim", moodLabel: "Low", discoverable: true, acceptsMessages: false, minLevel: 3, lon: 145, lat: -4 },
  { id: 11, moodGlow: "soft", moodLabel: "Okay", discoverable: false, acceptsMessages: true, minLevel: 3, lon: 118, lat: 18 },
];

export const DEFAULT_COMMUNITY_POSTS: FirestoreCommunityPost[] = [
  {
    id: "post_1",
    author: "Nadia · 21",
    authorId: "ony_user_nadia",
    title: "One tiny win during finals week",
    body: "I put my phone away for 25 minutes and finished one page. Sharing because small still counts.",
    category: "Study",
    likes: 3,
    likeRecords: [
      {
        userId: "ony_user_alex",
        userName: "Alex Tan",
        createdAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
      },
      {
        userId: "ony_user_jia",
        userName: "Jia · 24",
        createdAt: new Date(Date.now() - 62 * 60 * 1000).toISOString(),
      },
      {
        userId: "ony_user_amir",
        userName: "Amirul",
        createdAt: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
      },
    ],
    comments: [
      {
        id: "comment_seed_101",
        userId: "ony_user_alex",
        userName: "Alex Tan",
        text: "Small absolutely counts. Putting the phone away is honestly the hardest part!",
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        likes: 2,
        likeRecords: [
          {
            userId: "ony_user_nadia",
            userName: "Nadia · 21",
            createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
          },
          {
            userId: "ony_user_mei",
            userName: "Mei · ONY",
            createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          },
        ],
        replies: [
          {
            id: "reply_seed_201",
            userId: "ony_user_nadia",
            userName: "Nadia · 21",
            text: "Thank you Alex! Trying one more 25-minute block after dinner 🌱",
            createdAt: new Date(Date.now() - 36 * 60 * 1000).toISOString(),
          },
        ],
      },
      {
        id: "comment_seed_102",
        userId: "ony_user_mei",
        userName: "Mei · ONY",
        text: "Proud of you for starting with one page. Wishing you calm focus for the rest of finals.",
        createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        likes: 1,
        likeRecords: [
          {
            userId: "ony_user_amir",
            userName: "Amirul",
            createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          },
        ],
        replies: [],
      },
    ],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "post_2",
    author: "Anonymous",
    authorId: "ony_user_anon_work",
    title: "Starting over at a new job",
    body: "Week two and I still feel out of place. Today a colleague invited me for lunch, and it helped.",
    category: "Work",
    likes: 2,
    likeRecords: [
      {
        userId: "ony_user_nadia",
        userName: "Nadia · 21",
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
      {
        userId: "ony_user_alex",
        userName: "Alex Tan",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
    ],
    comments: [
      {
        id: "comment_seed_103",
        userId: "ony_user_amir",
        userName: "Amirul",
        text: "Those small lunch invitations make such a big difference in the first month. Take it one day at a time!",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        likes: 1,
        likeRecords: [
          {
            userId: "ony_user_jia",
            userName: "Jia · 24",
            createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
          },
        ],
        replies: [
          {
            id: "reply_seed_202",
            userId: "ony_user_jia",
            userName: "Jia · 24",
            text: "Agreed! By week three or four the routine starts feeling much gentler.",
            createdAt: new Date(Date.now() - 80 * 60 * 1000).toISOString(),
          },
        ],
      },
    ],
    media: "voice",
    audioDuration: 12,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "post_3",
    author: "Jia · 24",
    authorId: "ony_user_jia",
    title: "A low-energy self-care list",
    body: "Water, shower, clean shirt, one message to a friend. That is enough for some days.",
    category: "Self-care",
    likes: 3,
    likeRecords: [
      {
        userId: "ony_user_mei",
        userName: "Mei · ONY",
        createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      },
      {
        userId: "ony_user_alex",
        userName: "Alex Tan",
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      },
      {
        userId: "ony_user_nadia",
        userName: "Nadia · 21",
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      },
    ],
    comments: [
      {
        id: "comment_seed_104",
        userId: "ony_user_nadia",
        userName: "Nadia · 21",
        text: "Water + clean shirt resets my whole mood on low-energy days.",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        likes: 1,
        likeRecords: [
          {
            userId: "ony_user_jia",
            userName: "Jia · 24",
            createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          },
        ],
        replies: [],
      },
    ],
    media: "image",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];


export const DEFAULT_USER_MEMORIES = [
  { text: "I have exams coming up.", reason: "You mentioned this during a study-pressure chat.", active: true, category: "Study" },
  { text: "I prefer shorter replies.", reason: "You chose this in your conversation preferences.", active: true, category: "Preference" },
  { text: "I enjoy listening to music when stressed.", reason: "You said music helps you feel grounded.", active: true, category: "Wellbeing" },
];

export const DEFAULT_USER_CONVERSATIONS: Omit<FirestoreConversation, "id">[] = [
  { title: "Feeling overwhelmed", category: "Emotional Wellbeing", day: "Today", folderId: 4, reportAllowed: true, updatedAt: new Date().toISOString(), messages: [{ from: "user", text: "Everything feels like a lot today." }, { from: "ony", text: "I hear you. We can slow this down together—what feels most urgent right now?" }] },
  { title: "Internship search", category: "Career", day: "Today", folderId: 1, reportAllowed: true, updatedAt: new Date().toISOString(), messages: [{ from: "user", text: "I want to find an internship." }, { from: "ony", text: "Let’s begin with the kind of work and environment you want." }] },
  { title: "Study pressure", category: "Study", day: "Today", folderId: 1, reportAllowed: true, updatedAt: new Date().toISOString(), messages: [{ from: "user", text: "My exams are getting close." }, { from: "ony", text: "That pressure makes sense. Let’s choose one small task for today." }] },
  { title: "Relationship thoughts", category: "Relationships", day: "Yesterday", folderId: 2, reportAllowed: true, updatedAt: new Date(Date.now() - 86400000).toISOString(), messages: [{ from: "user", text: "I keep replaying a difficult conversation." }, { from: "ony", text: "It sounds like it stayed with you. Which part keeps coming back?" }] },
  { title: "Feeling anxious", category: "Emotional Wellbeing", day: "Yesterday", folderId: 3, reportAllowed: true, updatedAt: new Date(Date.now() - 86400000).toISOString(), messages: [{ from: "user", text: "I’m feeling anxious." }, { from: "ony", text: "I’m here. Would something calming help, or would you like to talk it through?" }] },
];

export const DEFAULT_COMMUNITY_MESSAGES: Omit<FirestoreCommunityMessage, "id">[] = [
  {
    toUserId: "0",
    toUserMood: "Calm",
    fromUserId: "system_anon_92",
    senderAnonymous: "Anonymous Member #928",
    recipientAnonymous: "You (Anonymous Traveler)",
    kind: "voice",
    text: "Encouraging voice note · 0:08",
    audioDuration: 8,
    transcription: "Hey there! Just wanted to send you a gentle reminder that you are doing so well. Take things one breath at a time today 🌱",
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    toUserId: "0",
    toUserMood: "Calm",
    fromUserId: "system_anon_71",
    senderAnonymous: "Anonymous Member #714",
    recipientAnonymous: "You (Anonymous Traveler)",
    kind: "text",
    text: "Thinking of you today! Remember that you don't have to carry everything all at once. Just this one breath right now is more than enough 🌱",
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    toUserId: "0",
    toUserMood: "Calm",
    fromUserId: "system_anon_30",
    senderAnonymous: "Anonymous Friend #304",
    recipientAnonymous: "You (Anonymous Traveler)",
    kind: "text",
    text: "Sending gentle warmth across the globe ☕ Hope today brings you a moment of genuine ease and comfort.",
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    toUserId: "1",
    toUserMood: "Good",
    fromUserId: "system_anon_1",
    senderAnonymous: "Anonymous Member #482",
    recipientAnonymous: "Anonymous Traveler (Globe #1)",
    kind: "text",
    text: "Sending you gentle energy for your day 🌱 Remember that one small breath changes everything.",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    toUserId: "3",
    toUserMood: "Low",
    fromUserId: "system_anon_2",
    senderAnonymous: "Anonymous Member #195",
    recipientAnonymous: "Anonymous Traveler (Globe #3)",
    kind: "text",
    text: "Hope today gets a little lighter for you. You are never as alone as you might feel 💫",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    toUserId: "6",
    toUserMood: "Very low",
    fromUserId: "system_anon_3",
    senderAnonymous: "Anonymous Member #312",
    recipientAnonymous: "Anonymous Traveler (Globe #6)",
    kind: "text",
    text: "Sending quiet support your way. Take all the time and space you need today 🍵",
    createdAt: new Date(Date.now() - 3600000 * 7).toISOString(),
  },
];

export const DEFAULT_REGISTERED_ACCOUNTS: FirestoreRegisteredAccount[] = [
  {
    uid: "ony_user_alex",
    displayName: "Alex Tan",
    email: "alex@ony.app",
    emailLower: "alex@ony.app",
    phoneNumber: "012-345 6789",
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    uid: "ony_user_nadia",
    displayName: "Nadia",
    email: "nadia@ony.app",
    emailLower: "nadia@ony.app",
    phoneNumber: "017-882 3410",
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    uid: "ony_user_amir",
    displayName: "Amirul",
    email: "amir@ony.app",
    emailLower: "amir@ony.app",
    phoneNumber: "019-410 9921",
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

// ==========================================
// Registered User Directory & Trusted Contact Requests
// ==========================================

export async function listRegisteredAccounts(
  excludeUid?: string,
  excludeEmail?: string | null,
): Promise<FirestoreRegisteredAccount[]> {
  const path = "globeUsers";
  try {
    const colRef = collection(db, "globeUsers");
    const snap = await getDocs(colRef);
    const byEmail = new Map<string, FirestoreRegisteredAccount>();

    for (const d of snap.docs) {
      const raw = d.data() as Record<string, unknown>;
      if (d.id.startsWith("account_") || raw.recordType === "user_account") {
        const email = String(raw.email || "").trim();
        const emailLower = String(raw.emailLower || email).trim().toLowerCase();
        const uid = String(raw.uid || d.id.replace(/^account_/, ""));
        const displayName = String(raw.displayName || email.split("@")[0] || "ONY Member");
        const phoneNumber = raw.phoneNumber ? String(raw.phoneNumber).trim() : undefined;
        if (emailLower) {
          byEmail.set(emailLower, {
            uid,
            displayName,
            email,
            emailLower,
            phoneNumber,
            updatedAt: String(raw.updatedAt || new Date().toISOString()),
          });
        }
      }
    }

    // Also include seeded registered ONY accounts if not present yet
    for (const acc of DEFAULT_REGISTERED_ACCOUNTS) {
      if (!byEmail.has(acc.emailLower)) {
        byEmail.set(acc.emailLower, acc);
      }
    }

    const exEmailLower = excludeEmail ? excludeEmail.trim().toLowerCase() : "";
    return Array.from(byEmail.values()).filter((acc) => {
      if (excludeUid && acc.uid === excludeUid) return false;
      if (exEmailLower && acc.emailLower === exEmailLower) return false;
      return true;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function findRegisteredAccount(
  emailOrName: string,
): Promise<FirestoreRegisteredAccount | null> {
  const clean = emailOrName.trim().toLowerCase();
  if (!clean) return null;
  const allAccounts = await listRegisteredAccounts();
  return (
    allAccounts.find(
      (acc) =>
        acc.emailLower === clean ||
        acc.displayName.trim().toLowerCase() === clean,
    ) || null
  );
}

export async function findRegisteredAccountByUid(
  uid: string,
): Promise<FirestoreRegisteredAccount | null> {
  const cleanUid = uid.trim();
  if (!cleanUid) return null;
  const allAccounts = await listRegisteredAccounts();
  return allAccounts.find((acc) => acc.uid === cleanUid) || null;
}

export async function sendTrustedContactRequest(params: {
  fromUid: string;
  fromName: string;
  fromEmail: string;
  targetEmailOrName: string;
  contactPhone: string;
  relationshipNote?: string;
}): Promise<FirestoreTrustedContactRequest> {
  const target = await findRegisteredAccount(params.targetEmailOrName);
  if (!target) {
    throw new Error(
      "ACCOUNT_NOT_FOUND: This person does not have a registered account in ONY. Please enter the email of an existing ONY user or share your invite link with them.",
    );
  }

  const senderEmailLower = params.fromEmail.trim().toLowerCase();
  if (
    target.uid === params.fromUid ||
    (senderEmailLower && target.emailLower === senderEmailLower)
  ) {
    throw new Error("SELF_REQUEST: You cannot add your own account as your trusted contact.");
  }

  const requestId = `trusted_req_${params.fromUid}_${target.uid}`;
  const path = `globeUsers/${requestId}`;
  const now = new Date().toISOString();
  const resolvedPhone = params.contactPhone.trim() || target.phoneNumber || "";
  const requestData: FirestoreTrustedContactRequest = {
    id: requestId,
    fromUid: params.fromUid,
    fromName: params.fromName.trim() || "ONY Member",
    fromEmail: senderEmailLower || "member@ony.app",
    toUid: target.uid,
    toName: target.displayName,
    toEmail: target.email,
    contactPhone: resolvedPhone,
    relationshipNote: (params.relationshipNote || "").trim(),
    requestKind: "direct_invite",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(
      doc(db, "globeUsers", requestId),
      {
        recordType: "trusted_contact_request",
        ...requestData,
      },
      { merge: true },
    );
    return requestData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
export interface SendInviteLinkRequestParams {
  requesterUid?: string;
  friendUid?: string;
  requesterName?: string;
  friendName?: string;
  requesterEmail?: string;
  friendEmail?: string;
  requesterPhone?: string;
  friendPhone?: string;
  inviterUid: string;
  inviterName?: string;
  inviterEmail?: string;
  relationshipNote?: string;
}

/**
 * Used when a friend clicks a user's shared Trusted Contact Invite Link
 * and requests to become the inviter's emergency contact.
 * The inviter (`toUid`) will see this request in their Incoming Requests and can Accept or Reject.
 */
export async function sendTrustedContactRequestViaInviteLink(
  params: SendInviteLinkRequestParams,
): Promise<FirestoreTrustedContactRequest> {
  const resolvedRequesterUid = (
    params.requesterUid ||
    params.friendUid ||
    auth.currentUser?.uid ||
    ""
  ).trim();
  const resolvedRequesterName = (
    params.requesterName ||
    params.friendName ||
    auth.currentUser?.displayName ||
    "ONY Friend"
  ).trim();
  const resolvedRequesterEmail = (
    params.requesterEmail ||
    params.friendEmail ||
    auth.currentUser?.email ||
    ""
  )
    .trim()
    .toLowerCase();
  const resolvedRequesterPhone = (
    params.requesterPhone ||
    params.friendPhone ||
    ""
  ).trim();

  const resolvedInviterUid = (params.inviterUid || "").trim();
  let resolvedInviterName = (params.inviterName || "").trim();
  let resolvedInviterEmail = (params.inviterEmail || "").trim().toLowerCase();

  if (!resolvedInviterUid) {
    throw new Error("INVALID_INVITE: Invalid invite link (missing inviter ID).");
  }

  // If inviterEmail or inviterName is missing, look up the account in registered accounts
  if (!resolvedInviterEmail || !resolvedInviterName || resolvedInviterName === "ONY Friend") {
    try {
      const inviterAcc = await findRegisteredAccountByUid(resolvedInviterUid);
      if (inviterAcc) {
        if (!resolvedInviterEmail) {
          resolvedInviterEmail = (inviterAcc.emailLower || inviterAcc.email || "").toLowerCase();
        }
        if (!resolvedInviterName || resolvedInviterName === "ONY Friend") {
          resolvedInviterName = inviterAcc.displayName;
        }
      }
    } catch {
      // ignore
    }
  }

  if (
    (resolvedRequesterUid && resolvedInviterUid && resolvedRequesterUid === resolvedInviterUid) ||
    (resolvedRequesterEmail && resolvedInviterEmail && resolvedRequesterEmail === resolvedInviterEmail)
  ) {
    throw new Error("SELF_REQUEST: You cannot request to be your own emergency contact.");
  }

  const effectiveSenderUid = resolvedRequesterUid || `user_${Date.now()}`;
  const requestId = `trusted_req_link_${effectiveSenderUid}_${resolvedInviterUid}`;
  const path = `globeUsers/${requestId}`;
  const now = new Date().toISOString();
  const requestData: FirestoreTrustedContactRequest = {
    id: requestId,
    fromUid: effectiveSenderUid,
    fromName: resolvedRequesterName || "ONY Friend",
    fromEmail: resolvedRequesterEmail || "friend@ony.app",
    toUid: resolvedInviterUid,
    toName: resolvedInviterName || "ONY Member",
    toEmail: resolvedInviterEmail || "member@ony.app",
    contactPhone: resolvedRequesterPhone,
    relationshipNote:
      (params.relationshipNote || "").trim() ||
      "Requested via your shared Trusted Contact invite link.",
    requestKind: "invite_link",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(
      doc(db, "globeUsers", requestId),
      {
        recordType: "trusted_contact_request",
        ...requestData,
      },
      { merge: true },
    );
    // Also sync the sender's phone to their registered account in the directory
    if (resolvedRequesterUid && resolvedRequesterPhone) {
      await syncRegisteredAccount({
        uid: resolvedRequesterUid,
        displayName: resolvedRequesterName,
        email: resolvedRequesterEmail || `${resolvedRequesterUid}@ony.app`,
        phoneNumber: resolvedRequesterPhone,
      }).catch(() => {});
    }
    return requestData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function listTrustedContactRequests(
  uid: string,
  email?: string | null,
): Promise<{
  outgoing: FirestoreTrustedContactRequest[];
  incoming: FirestoreTrustedContactRequest[];
}> {
  const path = "globeUsers";
  try {
    const colRef = collection(db, "globeUsers");
    const snap = await getDocs(colRef);
    const emailLower = email ? email.trim().toLowerCase() : "";

    const allRequests: FirestoreTrustedContactRequest[] = [];
    for (const d of snap.docs) {
      const raw = d.data() as Record<string, unknown>;
      if (d.id.startsWith("trusted_req_") || raw.recordType === "trusted_contact_request") {
        allRequests.push({
          id: d.id,
          fromUid: String(raw.fromUid || ""),
          fromName: String(raw.fromName || "ONY Member"),
          fromEmail: String(raw.fromEmail || ""),
          toUid: String(raw.toUid || ""),
          toName: String(raw.toName || "ONY Member"),
          toEmail: String(raw.toEmail || ""),
          contactPhone: String(raw.contactPhone || ""),
          relationshipNote: raw.relationshipNote ? String(raw.relationshipNote) : undefined,
          requestKind: raw.requestKind === "invite_link" ? "invite_link" : "direct_invite",
          status:
            raw.status === "accepted" || raw.status === "rejected"
              ? raw.status
              : "pending",
          createdAt: String(raw.createdAt || new Date().toISOString()),
          updatedAt: String(raw.updatedAt || raw.createdAt || new Date().toISOString()),
          respondedAt: raw.respondedAt ? String(raw.respondedAt) : undefined,
        });
      }
    }

    allRequests.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

    const outgoing = allRequests.filter(
      (r) =>
        (uid && r.fromUid === uid) ||
        (emailLower && r.fromEmail.trim().toLowerCase() === emailLower),
    );
    const incoming = allRequests.filter(
      (r) =>
        (uid && r.toUid === uid) ||
        (emailLower && r.toEmail.trim().toLowerCase() === emailLower),
    );

    return { outgoing, incoming };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function respondToTrustedContactRequest(
  requestId: string,
  decision: "accepted" | "rejected",
): Promise<void> {
  const path = `globeUsers/${requestId}`;
  try {
    const now = new Date().toISOString();
    await setDoc(
      doc(db, "globeUsers", requestId),
      {
        status: decision,
        respondedAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTrustedContactRequest(requestId: string): Promise<void> {
  const path = `globeUsers/${requestId}`;
  try {
    await deleteDoc(doc(db, "globeUsers", requestId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Seeds initial shared data into Firestore (globeUsers, communityPosts, merchants, registered accounts)
 * if the database collections are currently empty.
 */
export async function seedInitialDatabaseData(): Promise<{
  globeUsersCount: number;
  communityPostsCount: number;
  merchantsCount: number;
  communityMessagesCount: number;
}> {
  // 0. Ensure default registered ONY accounts exist in directory for Trusted Contact lookup
  for (const acc of DEFAULT_REGISTERED_ACCOUNTS) {
    await setDoc(
      doc(db, "globeUsers", `account_${acc.uid}`),
      {
        recordType: "user_account",
        ...acc,
      },
      { merge: true },
    ).catch(() => {});
  }

  // 1. Globe Users (always ensure node 0 / "You" exists)
  let globeUsers = await listGlobeUsers().catch(() => []);
  if (globeUsers.length <= 1) {
    for (const user of DEFAULT_GLOBE_USERS) {
      const docRef = doc(db, "globeUsers", String(user.id));
      await setDoc(docRef, user, { merge: true }).catch((e) =>
        console.warn("[ONY Seed] globeUser seed warning:", e),
      );
    }
    globeUsers = await listGlobeUsers().catch(() => DEFAULT_GLOBE_USERS);
  } else {
    const myNodeRef = doc(db, "globeUsers", "0");
    await setDoc(myNodeRef, DEFAULT_GLOBE_USERS[0], { merge: true }).catch(() => {});
  }

  // 2. Community Posts
  let posts = await listCommunityPosts().catch(() => []);
  if (posts.length === 0) {
    for (const post of DEFAULT_COMMUNITY_POSTS) {
      await createCommunityPost(post, post.id).catch((e) =>
        console.warn("[ONY Seed] communityPost seed warning:", e),
      );
    }
    posts = await listCommunityPosts().catch(() => []);
  }

  // 3. Merchants
  let merchants = await listMerchants().catch(() => []);
  if (merchants.length === 0) {
    for (const m of DEFAULT_MERCHANTS) {
      const docId = m.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const docRef = doc(db, "merchants", docId);
      await setDoc(docRef, m, { merge: true }).catch((e) =>
        console.warn("[ONY Seed] merchant seed warning:", e),
      );
    }
    merchants = await listMerchants().catch(() => DEFAULT_MERCHANTS);
  }

  // 4. Community Support Messages (ensure incoming messages for node "0" exist)
  let myMessages = await listCommunityMessages("0").catch(() => []);
  if (myMessages.length === 0) {
    const myDefaultMsgs = DEFAULT_COMMUNITY_MESSAGES.filter((m) => m.toUserId === "0");
    for (const msg of myDefaultMsgs) {
      await createCommunityMessage(msg).catch((e) =>
        console.warn("[ONY Seed] communityMessage seed warning:", e),
      );
    }
    myMessages = await listCommunityMessages("0").catch(() => []);
  }

  return {
    globeUsersCount: globeUsers.length,
    communityPostsCount: posts.length,
    merchantsCount: merchants.length,
    communityMessagesCount: myMessages.length,
  };
}

/**
 * Seeds initial user memories and starter conversations if the user's private collections are empty.
 */
export async function seedInitialUserData(uid: string): Promise<void> {
  try {
    const existingMemories = await listMemories(uid);
    if (existingMemories.length === 0) {
      for (const mem of DEFAULT_USER_MEMORIES) {
        await saveMemory(uid, mem);
      }
    }

    const existingChats = await listConversations(uid);
    if (existingChats.length === 0) {
      for (let i = 0; i < DEFAULT_USER_CONVERSATIONS.length; i++) {
        const chat = DEFAULT_USER_CONVERSATIONS[i];
        await saveConversation(uid, `chat_${101 + i}`, chat);
      }
    }

    const existingJournal = await listJournalEntries(uid);
    if (existingJournal.length === 0) {
      for (const entry of DEFAULT_JOURNAL_ENTRIES) {
        await saveJournalEntry(uid, entry);
      }
    }
  } catch (err) {
    console.warn("[ONY Seed] User data seed notice:", err);
  }
}

// ============================================================================
// SYSTEM & AUDIT LOGGING IN FIRESTORE
// ============================================================================

export type SystemLogLevel = "info" | "warn" | "error" | "security" | "audit";
export type SystemLogCategory =
  | "auth"
  | "safety"
  | "privacy"
  | "sync"
  | "system"
  | "user_action";

export interface SystemLogEntry {
  id: string;
  timestamp: string; // ISO 8601 string
  level: SystemLogLevel;
  category: SystemLogCategory;
  action: string;
  message: string;
  userId?: string | null;
  userEmail?: string | null;
  clientInfo?: {
    platform: string;
    userAgent: string;
    version: string;
  };
  metadata?: Record<string, unknown>;
}

const LOCAL_STORAGE_LOGS_KEY = "ony_system_logs_fallback_v1";

export async function writeSystemLog(entry: {
  level: SystemLogLevel;
  category: SystemLogCategory;
  action: string;
  message: string;
  userId?: string | null;
  userEmail?: string | null;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}): Promise<string> {
  const now = entry.timestamp || new Date().toISOString();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const logId = `log_${Date.now()}_${randomSuffix}`;

  const clientInfo = {
    platform: typeof navigator !== "undefined" ? navigator.platform || "web" : "server",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "web-client",
    version: "1.0.0",
  };

  const payload: SystemLogEntry = {
    id: logId,
    timestamp: now,
    level: entry.level,
    category: entry.category,
    action: entry.action,
    message: entry.message,
    userId: entry.userId || auth.currentUser?.uid || null,
    userEmail: entry.userEmail || auth.currentUser?.email || null,
    clientInfo,
    metadata: entry.metadata || {},
  };

  // 1. Always keep local fallback cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
    const existing: SystemLogEntry[] = raw ? JSON.parse(raw) : [];
    const updated = [payload, ...existing.slice(0, 99)];
    localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(updated));
  } catch {}

  // 2. Persist to Cloud Firestore `systemLogs` collection if permitted
  try {
    const docRef = doc(db, "systemLogs", logId);
    await setDoc(docRef, payload);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (!errMsg.includes("permission") && !errMsg.includes("PERMISSION_DENIED")) {
      console.debug("[ONY Logger] Remote log push deferred:", errMsg);
    }
  }

  // 3. If user is authenticated and matches author, also save to private auditLogs
  if (payload.userId && auth.currentUser?.uid === payload.userId) {
    try {
      const userAuditRef = doc(db, "users", payload.userId, "auditLogs", logId);
      await setDoc(userAuditRef, payload);
    } catch {}
  }

  return logId;
}

export async function listSystemLogs(limitCount = 60): Promise<SystemLogEntry[]> {
  try {
    const colRef = collection(db, "systemLogs");
    const q = query(colRef, orderBy("timestamp", "desc"), limit(limitCount));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const results: SystemLogEntry[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as Partial<SystemLogEntry>;
        results.push({
          id: docSnap.id,
          timestamp: d.timestamp || new Date().toISOString(),
          level: (d.level as SystemLogLevel) || "info",
          category: (d.category as SystemLogCategory) || "system",
          action: d.action || "EVENT",
          message: d.message || "",
          userId: d.userId || null,
          userEmail: d.userEmail || null,
          clientInfo: d.clientInfo,
          metadata: d.metadata || {},
        });
      });
      return results;
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (!errMsg.includes("permission") && !errMsg.includes("PERMISSION_DENIED")) {
      console.debug("[ONY Logger] Querying Firestore logs deferred, using local cache:", errMsg);
    }
  }

  // Fallback to local storage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
    if (raw) {
      const parsed: SystemLogEntry[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  // Initial seed logs if none exist yet
  const initialBootLog: SystemLogEntry = {
    id: `log_init_${Date.now()}`,
    timestamp: new Date().toISOString(),
    level: "info",
    category: "system",
    action: "SYSTEM_BOOT",
    message: "ONY Companion application launched. Cloud Firestore connection initialized.",
    clientInfo: {
      platform: "web",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "web-client",
      version: "1.0.0",
    },
  };
  return [initialBootLog];
}

export function formatLogsAsTextFile(logs: SystemLogEntry[]): string {
  const header = [
    "# ==============================================================================",
    "# ONY Mental Wellness Companion - Production Database & System Audit Log",
    `# Exported At: ${new Date().toISOString()}`,
    "# Database: ai-studio-onypwa-289f0eda-a42f-43da-8c66-8ac63f5d46a8",
    "# Application: ONY Web Client (v1.0.0 Production Release)",
    `# Total Log Records: ${logs.length}`,
    "# Security Standard: Zero-Trust ABAC, End-to-End Encrypted Cloud Firestore",
    "# ==============================================================================",
    "",
  ].join("\n");

  const lines = logs.map((log) => {
    const metaStr =
      log.metadata && Object.keys(log.metadata).length > 0
        ? ` | metadata=${JSON.stringify(log.metadata)}`
        : "";
    const userStr = log.userEmail ? ` | user=${log.userEmail}` : log.userId ? ` | uid=${log.userId}` : "";
    return `[${log.timestamp}] [${log.level.toUpperCase().padEnd(8)}] [${log.category.toUpperCase().padEnd(10)}] [${log.action}] ${log.message}${userStr}${metaStr}`;
  });

  return header + lines.join("\n") + "\n";
}

export function downloadLogFile(content: string, filename: string, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
