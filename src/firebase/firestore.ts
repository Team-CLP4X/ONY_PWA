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
import { auth, db } from "./config";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

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

export interface FirestoreCommunityPost {
  id: string;
  author: string;
  authorId?: string;
  title: string;
  body: string;
  category: string;
  likes: number;
  saved?: boolean;
  media?: "image" | "voice";
  audioUrl?: string;
  audioDuration?: number;
  createdAt: string;
}

export interface FirestoreMerchant {
  id?: string;
  name: string;
  category: string;
  offer: string;
  value: string;
  description: string;
  image: string;
  validity: string;
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
// Community Posts Operations
// ==========================================

export async function listCommunityPosts(): Promise<FirestoreCommunityPost[]> {
  const path = "communityPosts";
  try {
    const colRef = collection(db, "communityPosts");
    const q = query(colRef, orderBy("createdAt", "desc"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreCommunityPost, "id">),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createCommunityPost(
  post: Omit<FirestoreCommunityPost, "id">,
): Promise<string> {
  const path = "communityPosts";
  try {
    const colRef = collection(db, "communityPosts");
    const newDocRef = doc(colRef);
    await setDoc(newDocRef, post);
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
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

export const DEFAULT_COMMUNITY_POSTS: Omit<FirestoreCommunityPost, "id">[] = [
  {
    author: "Nadia · 21",
    title: "One tiny win during finals week",
    body: "I put my phone away for 25 minutes and finished one page. Sharing because small still counts.",
    category: "Study",
    likes: 34,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    author: "Anonymous",
    title: "Starting over at a new job",
    body: "Week two and I still feel out of place. Today a colleague invited me for lunch, and it helped.",
    category: "Work",
    likes: 21,
    media: "voice",
    audioDuration: 12,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    author: "Jia · 24",
    title: "A low-energy self-care list",
    body: "Water, shower, clean shirt, one message to a friend. That is enough for some days.",
    category: "Self-care",
    likes: 56,
    media: "image",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const DEFAULT_MERCHANTS: FirestoreMerchant[] = [
  {
    name: "Ruang Rasa",
    category: "Café",
    offer: "Slow afternoon set",
    value: "15% OFF",
    description: "A quiet table, warm drink, and room to pause.",
    image: "https://images.unsplash.com/photo-1613274554329-70f997f5789f?auto=format&fit=crop&w=600&q=80",
    validity: "Valid until 30 Jun · Demo",
  },
  {
    name: "Tangan Studio",
    category: "Art / creative",
    offer: "Mindful clay session",
    value: "RM10 OFF",
    description: "A gentle hands-on session for curious beginners.",
    image: "https://images.unsplash.com/photo-1590605095243-072811dbe64c?auto=format&fit=crop&w=600&q=80",
    validity: "Weekdays only · Demo",
  },
  {
    name: "Nafas Space",
    category: "Yoga / meditation",
    offer: "First community class",
    value: "RM18 CLASS",
    description: "A calm guided class with no experience required.",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80",
    validity: "Valid for first visit · Demo",
  },
  {
    name: "Tenang Goods",
    category: "Wellness products",
    offer: "Sleep ritual set",
    value: "20% OFF",
    description: "Simple example products for a slower evening.",
    image: "https://images.unsplash.com/photo-1761864293818-603c23655cee?auto=format&fit=crop&w=600&q=80",
    validity: "Valid until 15 Jul · Demo",
  },
  {
    name: "Sora Sounds",
    category: "Music",
    offer: "Calming playlist session",
    value: "FREE SESSION",
    description: "Instrumental and relaxation listening guides.",
    image: "https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?auto=format&fit=crop&w=600&q=80",
    validity: "Online access · Demo",
  },
  {
    name: "Senja Rest",
    category: "Relaxation",
    offer: "Quiet reset session",
    value: "RM15 OFF",
    description: "A future-stage relaxation and spa discovery offer.",
    image: "https://images.unsplash.com/photo-1557388243-e1194223f99b?auto=format&fit=crop&w=600&q=80",
    validity: "Weekdays only · Demo",
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

/**
 * Used when a friend clicks a user's shared Trusted Contact Invite Link
 * and requests to become the inviter's emergency contact.
 * The inviter (`toUid`) will see this request in their Incoming Requests and can Accept or Reject.
 */
export async function sendTrustedContactRequestViaInviteLink(params: {
  requesterUid: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  inviterUid: string;
  inviterName: string;
  inviterEmail: string;
  relationshipNote?: string;
}): Promise<FirestoreTrustedContactRequest> {
  const cleanRequesterEmail = params.requesterEmail.trim().toLowerCase();
  const cleanInviterEmail = params.inviterEmail.trim().toLowerCase();
  if (
    params.requesterUid === params.inviterUid ||
    (cleanRequesterEmail && cleanInviterEmail && cleanRequesterEmail === cleanInviterEmail)
  ) {
    throw new Error("SELF_REQUEST: You cannot request to be your own emergency contact.");
  }

  const requestId = `trusted_req_link_${params.requesterUid}_${params.inviterUid}`;
  const path = `globeUsers/${requestId}`;
  const now = new Date().toISOString();
  const requestData: FirestoreTrustedContactRequest = {
    id: requestId,
    fromUid: params.requesterUid,
    fromName: params.requesterName.trim() || "ONY Friend",
    fromEmail: cleanRequesterEmail || "friend@ony.app",
    toUid: params.inviterUid,
    toName: params.inviterName.trim() || "ONY Member",
    toEmail: cleanInviterEmail || "member@ony.app",
    contactPhone: params.requesterPhone.trim(),
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
      await createCommunityPost(post).catch((e) =>
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
  } catch (err) {
    console.warn("[ONY Seed] User data seed notice:", err);
  }
}
