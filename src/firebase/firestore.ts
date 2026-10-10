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
  level: number;
  emoji: string;
  label: string;
  note: string;
  reportAllowed: boolean;
  createdAt: string;
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

// User Profile Operations
export async function createUserProfileDoc(
  uid: string,
  initial: { email: string; displayName: string },
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, "users", uid);
    const now = new Date().toISOString();
    await setDoc(
      userRef,
      {
        displayName: initial.displayName,
        email: initial.email,
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

// Mood Check-in Operations
export async function listMoodEntries(uid: string): Promise<FirestoreMoodEntry[]> {
  const path = `users/${uid}/moodCheckins`;
  try {
    const colRef = collection(db, "users", uid, "moodCheckins");
    const q = query(colRef, orderBy("createdAt", "desc"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreMoodEntry, "id">),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveMoodEntry(
  uid: string,
  entry: Omit<FirestoreMoodEntry, "id">,
): Promise<string> {
  const path = `users/${uid}/moodCheckins`;
  try {
    const colRef = collection(db, "users", uid, "moodCheckins");
    const newDocRef = doc(colRef);
    await setDoc(newDocRef, entry);
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
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
    if (snap.empty) return [];
    return snap.docs
      .map((d) => {
        const data = d.data() as FirestoreGlobeUser;
        return {
          id: data.id ?? Number(d.id),
          moodGlow: data.moodGlow,
          moodLabel: data.moodLabel,
          discoverable: data.discoverable,
          acceptsMessages: data.acceptsMessages,
          minLevel: data.minLevel,
          lon: data.lon,
          lat: data.lat,
        };
      })
      .sort((a, b) => a.id - b.id);
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
// Initial Database Seeding
// ==========================================

export const DEFAULT_GLOBE_USERS: FirestoreGlobeUser[] = [
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

/**
 * Seeds initial shared data into Firestore (globeUsers, communityPosts, merchants)
 * if the database collections are currently empty.
 */
export async function seedInitialDatabaseData(): Promise<{
  globeUsersCount: number;
  communityPostsCount: number;
  merchantsCount: number;
}> {
  // 1. Globe Users
  let globeUsers = await listGlobeUsers().catch(() => []);
  if (globeUsers.length === 0) {
    for (const user of DEFAULT_GLOBE_USERS) {
      const docRef = doc(db, "globeUsers", String(user.id));
      await setDoc(docRef, user, { merge: true }).catch((e) =>
        console.warn("[ONY Seed] globeUser seed warning:", e),
      );
    }
    globeUsers = await listGlobeUsers().catch(() => DEFAULT_GLOBE_USERS);
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

  return {
    globeUsersCount: globeUsers.length,
    communityPostsCount: posts.length,
    merchantsCount: merchants.length,
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
