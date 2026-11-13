import type { FirestoreCommunityPost, PostLikeRecord } from "../firebase/firestore";
import type { AppLanguage } from "../i18n/translations";

export type SupportiveReactionType = "hug" | "relate" | "proud" | "strength";

export interface ReactionMeta {
  type: SupportiveReactionType;
  emoji: string;
  labelEn: string;
  labelBm: string;
  labelZh: string;
}

export const SUPPORTIVE_REACTIONS: ReactionMeta[] = [
  {
    type: "hug",
    emoji: "🤗",
    labelEn: "Hug",
    labelBm: "Peluk",
    labelZh: "抱抱",
  },
  {
    type: "relate",
    emoji: "💛",
    labelEn: "Relate",
    labelBm: "Fahami",
    labelZh: "感同身受",
  },
  {
    type: "proud",
    emoji: "🌱",
    labelEn: "Proud of you",
    labelBm: "Bangga",
    labelZh: "为你骄傲",
  },
  {
    type: "strength",
    emoji: "💪",
    labelEn: "Strength",
    labelBm: "Semangat",
    labelZh: "给你力量",
  },
];

export function getReactionLabel(
  reaction: SupportiveReactionType,
  language: AppLanguage,
): string {
  const found =
    SUPPORTIVE_REACTIONS.find((r) => r.type === reaction) ||
    SUPPORTIVE_REACTIONS[0];
  if (language === "Bahasa Melayu") return found.labelBm;
  if (language === "中文") return found.labelZh;
  return found.labelEn;
}

export function getReactionEmoji(reaction: SupportiveReactionType): string {
  const found = SUPPORTIVE_REACTIONS.find((r) => r.type === reaction);
  return found ? found.emoji : "🤗";
}

/**
 * Local reaction-type map keyed by `${postId}:${userId}` so supportive reaction types
 * ("hug" | "relate" | "proud" | "strength") map onto the existing `likeRecords` array
 * in Firestore without mutating the database schema.
 */
const REACTION_STORAGE_KEY = "ony_post_reactions_v1";
const HIDDEN_POSTS_STORAGE_KEY = "ony_hidden_community_posts_v1";
const SAVED_POSTS_STORAGE_KEY = "ony_saved_community_posts_v1";
const SEEN_POSTS_STORAGE_KEY = "ony_seen_community_posts_v1";
const DESK_LIST_PREF_KEY = "ony_desk_list_pref_v1";

type StoredReactionMap = Record<string, SupportiveReactionType>;

function readStoredReactionMap(): StoredReactionMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(REACTION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as StoredReactionMap)
      : {};
  } catch {
    return {};
  }
}

export function saveUserReactionChoice(
  postId: string,
  userId: string,
  reaction: SupportiveReactionType | null,
): void {
  if (typeof window === "undefined") return;
  try {
    const current = readStoredReactionMap();
    const key = `${postId}::${userId}`;
    if (!reaction) {
      delete current[key];
    } else {
      current[key] = reaction;
    }
    localStorage.setItem(REACTION_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore storage errors
  }
}

export function getUserReactionChoice(
  postId: string,
  userId: string,
): SupportiveReactionType | null {
  const map = readStoredReactionMap();
  const val = map[`${postId}::${userId}`];
  if (
    val === "hug" ||
    val === "relate" ||
    val === "proud" ||
    val === "strength"
  ) {
    return val;
  }
  return null;
}

function deterministicReactionForRecord(
  postId: string,
  record: PostLikeRecord,
  index: number,
): SupportiveReactionType {
  // Keep "hug" as primary default and gently diversify pre-existing records cleanly
  const seedStr = `${postId}:${record.userId}:${index}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) | 0;
  }
  const mod = Math.abs(hash) % 10;
  if (mod < 4) return "hug";
  if (mod < 6) return "relate";
  if (mod < 8) return "proud";
  return "strength";
}

export interface PostReactionSummary {
  totalCount: number;
  likedByMe: boolean;
  myReaction: SupportiveReactionType | null;
  countsByType: Record<SupportiveReactionType, number>;
  activeTypes: SupportiveReactionType[];
}

export function computePostReactionSummary(
  post: FirestoreCommunityPost,
  currentUid: string,
  currentUserName: string,
): PostReactionSummary {
  const cleanUid = currentUid.trim() || "anonymous_user";
  const cleanName = currentUserName.trim().toLowerCase();
  const records: PostLikeRecord[] = Array.isArray(post.likeRecords)
    ? post.likeRecords
    : [];

  const countsByType: Record<SupportiveReactionType, number> = {
    hug: 0,
    relate: 0,
    proud: 0,
    strength: 0,
  };

  let likedByMe = false;
  let myReaction: SupportiveReactionType | null = null;
  const storedMine = getUserReactionChoice(post.id, cleanUid);

  records.forEach((rec, idx) => {
    const isMe =
      rec.userId === cleanUid ||
      rec.userName.trim().toLowerCase() === cleanName;
    if (isMe) {
      likedByMe = true;
      const chosen = storedMine || "hug";
      myReaction = chosen;
      countsByType[chosen] += 1;
    } else {
      const storedOther = getUserReactionChoice(post.id, rec.userId);
      const mapped =
        storedOther || deterministicReactionForRecord(post.id, rec, idx);
      countsByType[mapped] += 1;
    }
  });

  const activeTypes = (
    Object.keys(countsByType) as SupportiveReactionType[]
  ).filter((k) => countsByType[k] > 0);

  return {
    totalCount: records.length,
    likedByMe,
    myReaction,
    countsByType,
    activeTypes,
  };
}

/**
 * Lightweight language detection so "Translate" only appears when content language differs from user's app language.
 */
export function detectPostLanguage(title: string, body: string): AppLanguage {
  const combined = `${title || ""} ${body || ""}`.trim();
  if (!combined) return "English";

  // Check for CJK Han characters -> Chinese
  const cjkMatches = combined.match(/[\u4e00-\u9fff]/g);
  if (cjkMatches && cjkMatches.length >= 2) {
    return "中文";
  }

  // Check for Malay indicators using whole-word boundaries
  const malayMarkers = [
    /\bsaya\b/i,
    /\banda\b/i,
    /\btidak\b/i,
    /\btak\b/i,
    /\byang\b/i,
    /\buntuk\b/i,
    /\bdengan\b/i,
    /\bhari ini\b/i,
    /\bterima kasih\b/i,
    /\bperasaan\b/i,
    /\bberkongsi\b/i,
    /\bpenat\b/i,
    /\bsedih\b/i,
    /\bboleh\b/i,
    /\bkerja\b/i,
    /\bsebab\b/i,
    /\bmereka\b/i,
    /\bkita\b/i,
    /\bawak\b/i,
    /\brasa\b/i,
    /\btenang\b/i,
  ];
  let malayScore = 0;
  for (const rx of malayMarkers) {
    if (rx.test(combined)) malayScore += 1;
  }
  if (malayScore >= 2) {
    return "Bahasa Melayu";
  }

  return "English";
}

/**
 * Mirrors ONY's server-side URGENT_SAFETY_PATTERNS + severe distress phrases.
 * Never censors or hides community posts/comments; triggers a gentle support banner linking to Help.
 */
const COMMUNITY_CRISIS_PATTERNS: RegExp[] = [
  /\bhurt myself\b/i,
  /\bhurting myself\b/i,
  /\bself[- ]?harm\b/i,
  /\bsuicid(e|al)\b/i,
  /\bend my life\b/i,
  /\bend it all\b/i,
  /\bkill myself\b/i,
  /\bdon'?t want to live\b/i,
  /\bi want to die\b/i,
  /\bwish i was dead\b/i,
  /\bnot safe with myself\b/i,
  /\bcan'?t go on\b/i,
  /\bcan'?t cope anymore\b/i,
  /\bno reason to live\b/i,
  /\bbunuh diri\b/i,
  /\bcederakan diri\b/i,
  /\btak nak hidup\b/i,
  /\btak mahu hidup\b/i,
  /自杀/,
  /自殺/,
  /伤害自己/,
  /傷害自己/,
  /不想活/,
  /活不下去/,
];

export function containsCrisisLanguage(title: string, body = ""): boolean {
  const combined = `${title || ""}\n${body || ""}`.trim();
  if (!combined) return false;
  return COMMUNITY_CRISIS_PATTERNS.some((rx) => rx.test(combined));
}

export function parseAuthorDisplay(author: string): {
  displayName: string;
  age: string | null;
  initial: string;
} {
  const trimmed = (author || "Anonymous").trim();
  const parts = trimmed.split("·").map((s) => s.trim());
  const displayName = parts[0] || "Anonymous";
  const maybeAge = parts[1] && /^\d{1,3}$/.test(parts[1]) ? parts[1] : null;
  const initial = (displayName[0] || "A").toUpperCase();
  return { displayName, age: maybeAge, initial };
}

export type CategoryThemeClass =
  | "cat-study"
  | "cat-work"
  | "cat-relationships"
  | "cat-motivation"
  | "cat-selfcare"
  | "cat-general";

export function getCategoryThemeClass(category: string): CategoryThemeClass {
  switch ((category || "").trim().toLowerCase()) {
    case "study":
      return "cat-study";
    case "work":
      return "cat-work";
    case "relationships":
      return "cat-relationships";
    case "motivation":
      return "cat-motivation";
    case "self-care":
    case "selfcare":
      return "cat-selfcare";
    default:
      return "cat-general";
  }
}

export type DeskObjectKind =
  | "notice-board"
  | "books"
  | "laptop-bag"
  | "mugs-frame"
  | "plant-note"
  | "candle-tea"
  | "pinned-note";

export type DeskPlacementZone = "wall" | "desk";

export interface DeskCategoryItem {
  category: string;
  objectKind: DeskObjectKind;
  zone: DeskPlacementZone;
  postCount: number;
  unseenCount: number;
}

export type WorldLandmarkKind =
  | "campfire"
  | "notice-board"
  | "library"
  | "garden-bench"
  | "desk-lamp"
  | "moon-tower"
  | "flower-pond"
  | "lantern";

export type MoodChipId = "calm" | "curious" | "inspired" | "tired" | "anxious";

export interface WorldCategoryItem {
  category: string;
  landmarkKind: WorldLandmarkKind;
  objectKind: DeskObjectKind;
  postCount: number;
  unseenCount: number;
  reactionTotal: number;
  commentTotal: number;
}

export type CategorySortTab = "forYou" | "latest" | "popular";

export function resolveDeskObjectKind(category: string): {
  kind: DeskObjectKind;
  zone: DeskPlacementZone;
} {
  const norm = (category || "").trim().toLowerCase();
  if (norm === "all" || norm === "latest") {
    return { kind: "notice-board", zone: "wall" };
  }
  if (norm === "study" || norm === "academics" || norm === "exams") {
    return { kind: "books", zone: "desk" };
  }
  if (norm === "work" || norm === "career" || norm === "job") {
    return { kind: "laptop-bag", zone: "desk" };
  }
  if (norm === "relationships" || norm === "family" || norm === "friends") {
    return { kind: "mugs-frame", zone: "desk" };
  }
  if (norm === "motivation" || norm === "growth" || norm === "goals") {
    return { kind: "plant-note", zone: "desk" };
  }
  if (
    norm === "self-care" ||
    norm === "selfcare" ||
    norm === "wellbeing" ||
    norm === "sleep" ||
    norm === "rest"
  ) {
    return { kind: "candle-tea", zone: "desk" };
  }
  return { kind: "pinned-note", zone: "wall" };
}

export function resolveWorldLandmarkKind(category: string): WorldLandmarkKind {
  const norm = (category || "").trim().toLowerCase();
  if (norm === "all" || norm === "latest") return "notice-board";
  if (norm === "general" || norm === "warm chats" || norm === "chat") return "campfire";
  if (norm === "study" || norm === "academics" || norm === "exams") return "library";
  if (
    norm === "relationships" ||
    norm === "shared stories" ||
    norm === "family" ||
    norm === "friends"
  ) {
    return "garden-bench";
  }
  if (norm === "work" || norm === "career" || norm === "job") return "desk-lamp";
  if (
    norm === "self-care" ||
    norm === "selfcare" ||
    norm === "sleep" ||
    norm === "late nights" ||
    norm === "wellbeing" ||
    norm === "rest"
  ) {
    return "moon-tower";
  }
  if (
    norm === "motivation" ||
    norm === "small wins" ||
    norm === "growth" ||
    norm === "goals"
  ) {
    return "flower-pond";
  }
  return "lantern";
}

export function getLandmarkTitle(category: string, language: AppLanguage): string {
  const norm = (category || "").trim().toLowerCase();
  if (norm === "all" || norm === "latest") {
    if (language === "Bahasa Melayu") return "Terkini";
    if (language === "中文") return "最新广场";
    return "Latest";
  }
  if (norm === "general") {
    if (language === "Bahasa Melayu") return "Sembang Hangat";
    if (language === "中文") return "温暖围炉";
    return "Warm Chats";
  }
  if (norm === "relationships") {
    if (language === "Bahasa Melayu") return "Kisah Bersama";
    if (language === "中文") return "花园长椅";
    return "Shared Stories";
  }
  if (norm === "self-care" || norm === "selfcare" || norm === "sleep") {
    if (language === "Bahasa Melayu") return "Malam Tenang";
    if (language === "中文") return "星空小塔";
    return "Late Nights";
  }
  if (norm === "motivation") {
    if (language === "Bahasa Melayu") return "Kejayaan Kecil";
    if (language === "中文") return "微光花溪";
    return "Small Wins";
  }
  if (norm === "study") {
    if (language === "Bahasa Melayu") return "Pelajaran";
    if (language === "中文") return "静心书屋";
    return "Study";
  }
  if (norm === "work") {
    if (language === "Bahasa Melayu") return "Kerjaya";
    if (language === "中文") return "台灯书桌";
    return "Work";
  }
  return category;
}

export function getLandmarkSubtitle(category: string, language: AppLanguage): string {
  const norm = (category || "").trim().toLowerCase();
  if (norm === "all" || norm === "latest") {
    return language === "Bahasa Melayu"
      ? "Semua perkongsian terkini"
      : language === "中文"
        ? "汇聚社区里每一份温柔分享"
        : "Every fresh note from the garden";
  }
  if (norm === "general") {
    return language === "Bahasa Melayu"
      ? "Ruang borak lembut & santai"
      : language === "中文"
        ? "坐下来聊聊今天的点滴"
        : "Gentle everyday check-ins around the fire";
  }
  if (norm === "study") {
    return language === "Bahasa Melayu"
      ? "Fokus perlahan & langkah belajar"
      : language === "中文"
        ? "一页一页慢慢来，你已经做得很好"
        : "Quiet study corners & small study wins";
  }
  if (norm === "work") {
    return language === "Bahasa Melayu"
      ? "Keseimbangan kerja & nafas lega"
      : language === "中文"
        ? "工作再忙，也记得给自己留一盏暖灯"
        : "Navigating workdays with steadiness";
  }
  if (norm === "relationships") {
    return language === "Bahasa Melayu"
      ? "Cerita hati, kawan & keluarga"
      : language === "中文"
        ? "人际与情感里的真实共鸣"
        : "Real moments of connection and care";
  }
  if (norm === "self-care" || norm === "selfcare" || norm === "sleep") {
    return language === "Bahasa Melayu"
      ? "Rehat, tidur & jaga diri"
      : language === "中文"
        ? "夜深了，在这里轻声安放情绪"
        : "Gentle rest, breathing, and soft nights";
  }
  if (norm === "motivation") {
    return language === "Bahasa Melayu"
      ? "Kemenangan kecil yang bermakna"
      : language === "中文"
        ? "记录每一次微小的进步与希望"
        : "Tiny steps forward that still count";
  }
  return language === "Bahasa Melayu"
    ? `Perkongsian komuniti dalam ${category}`
    : language === "中文"
      ? `来自「${category}」的社区故事`
      : `Stories and gentle thoughts in ${category}`;
}

/**
 * Maps optional feeling chip to a suggested landmark/category in the world scene.
 */
export function getMoodTargetLandmark(
  mood: MoodChipId | null,
  availableCategories: WorldCategoryItem[],
): string | null {
  if (!mood || availableCategories.length === 0) return null;
  const preferredOrder: Record<MoodChipId, string[]> = {
    calm: ["self-care", "motivation", "all"],
    curious: ["all", "study", "general"],
    inspired: ["motivation", "study", "relationships"],
    tired: ["self-care", "general", "all"],
    anxious: ["general", "relationships", "self-care"],
  };
  const candidates = preferredOrder[mood] || [];
  for (const cand of candidates) {
    const found = availableCategories.find(
      (c) => c.category.trim().toLowerCase() === cand,
    );
    if (found) return found.category;
  }
  return availableCategories[0]?.category || null;
}

/**
 * Dynamically extracts distinct categories present in the existing post dataset AND
 * any known app categories (so 0-post categories still appear as reachable landmarks).
 */
export function extractWorldCategories(
  allPosts: FirestoreCommunityPost[],
  hiddenPostIds: Set<string>,
  seenPostIds: Set<string>,
  knownCategories: string[] = [],
): WorldCategoryItem[] {
  const visiblePosts = allPosts.filter((p) => !hiddenPostIds.has(p.id));
  const unseenAll = visiblePosts.filter((p) => !seenPostIds.has(p.id)).length;
  const allReactions = visiblePosts.reduce(
    (sum, p) => sum + (Array.isArray(p.likeRecords) ? p.likeRecords.length : p.likes || 0),
    0,
  );
  const allComments = visiblePosts.reduce(
    (sum, p) => sum + (Array.isArray(p.comments) ? p.comments.length : 0),
    0,
  );

  const categoryStats = new Map<
    string,
    {
      label: string;
      visibleCount: number;
      unseenCount: number;
      reactionTotal: number;
      commentTotal: number;
    }
  >();

  // Seed known categories with 0 counts so empty corners still exist gently
  for (const cat of knownCategories) {
    const clean = (cat || "").trim();
    const key = clean.toLowerCase();
    if (!clean || key === "all") continue;
    if (!categoryStats.has(key)) {
      categoryStats.set(key, {
        label: clean,
        visibleCount: 0,
        unseenCount: 0,
        reactionTotal: 0,
        commentTotal: 0,
      });
    }
  }

  for (const post of allPosts) {
    const rawCat = (post.category || "General").trim() || "General";
    const key = rawCat.toLowerCase();
    if (key === "all") continue;

    const existing = categoryStats.get(key) || {
      label: rawCat,
      visibleCount: 0,
      unseenCount: 0,
      reactionTotal: 0,
      commentTotal: 0,
    };

    if (!hiddenPostIds.has(post.id)) {
      existing.visibleCount += 1;
      if (!seenPostIds.has(post.id)) {
        existing.unseenCount += 1;
      }
      existing.reactionTotal += Array.isArray(post.likeRecords)
        ? post.likeRecords.length
        : post.likes || 0;
      existing.commentTotal += Array.isArray(post.comments) ? post.comments.length : 0;
    }

    categoryStats.set(key, existing);
  }

  const preferredOrder = [
    "general",
    "study",
    "relationships",
    "work",
    "self-care",
    "selfcare",
    "motivation",
  ];

  const sortedEntries = Array.from(categoryStats.entries()).sort(([a], [b]) => {
    const idxA = preferredOrder.indexOf(a);
    const idxB = preferredOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const result: WorldCategoryItem[] = [
    {
      category: "All",
      landmarkKind: "notice-board",
      objectKind: "notice-board",
      postCount: visiblePosts.length,
      unseenCount: unseenAll,
      reactionTotal: allReactions,
      commentTotal: allComments,
    },
  ];

  for (const [, info] of sortedEntries) {
    const deskResolved = resolveDeskObjectKind(info.label);
    result.push({
      category: info.label,
      landmarkKind: resolveWorldLandmarkKind(info.label),
      objectKind: deskResolved.kind,
      postCount: info.visibleCount,
      unseenCount: info.unseenCount,
      reactionTotal: info.reactionTotal,
      commentTotal: info.commentTotal,
    });
  }

  return result;
}

export function extractDeskCategories(
  allPosts: FirestoreCommunityPost[],
  hiddenPostIds: Set<string>,
  seenPostIds: Set<string>,
): DeskCategoryItem[] {
  return extractWorldCategories(allPosts, hiddenPostIds, seenPostIds).map((item) => ({
    category: item.category,
    objectKind: item.objectKind,
    zone: resolveDeskObjectKind(item.category).zone,
    postCount: item.postCount,
    unseenCount: item.unseenCount,
  }));
}

export function sortCommunityPosts(
  posts: FirestoreCommunityPost[],
  tab: CategorySortTab,
  seenPostIds: Set<string>,
): FirestoreCommunityPost[] {
  const copy = [...posts];
  if (tab === "latest") {
    return copy.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }
  if (tab === "popular") {
    return copy.sort((a, b) => {
      const scoreA =
        (Array.isArray(a.likeRecords) ? a.likeRecords.length : a.likes || 0) * 2 +
        (Array.isArray(a.comments) ? a.comments.length : 0) * 3;
      const scoreB =
        (Array.isArray(b.likeRecords) ? b.likeRecords.length : b.likes || 0) * 2 +
        (Array.isArray(b.comments) ? b.comments.length : 0) * 3;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  }
  // "forYou": gently balance unseen items, warmth/discussion, and freshness
  return copy.sort((a, b) => {
    const unseenA = seenPostIds.has(a.id) ? 0 : 4;
    const unseenB = seenPostIds.has(b.id) ? 0 : 4;
    const engageA =
      (Array.isArray(a.likeRecords) ? a.likeRecords.length : a.likes || 0) +
      (Array.isArray(a.comments) ? a.comments.length : 0) * 1.5;
    const engageB =
      (Array.isArray(b.likeRecords) ? b.likeRecords.length : b.likes || 0) +
      (Array.isArray(b.comments) ? b.comments.length : 0) * 1.5;
    const ageHoursA = Math.max(
      0,
      (Date.now() - new Date(a.createdAt || 0).getTime()) / 3_600_000,
    );
    const ageHoursB = Math.max(
      0,
      (Date.now() - new Date(b.createdAt || 0).getTime()) / 3_600_000,
    );
    const rankA = unseenA + engageA - ageHoursA * 0.15;
    const rankB = unseenB + engageB - ageHoursB * 0.15;
    return rankB - rankA;
  });
}

export type SubtopicFilterId = "all" | "voice" | "quiet" | "discussed";

export function filterPostsBySubtopic(
  posts: FirestoreCommunityPost[],
  subtopic: SubtopicFilterId,
): FirestoreCommunityPost[] {
  if (subtopic === "all") return posts;
  if (subtopic === "voice") {
    return posts.filter((p) => p.media === "voice" || Boolean(p.audioUrl));
  }
  if (subtopic === "quiet") {
    return posts.filter((p) => (Array.isArray(p.comments) ? p.comments.length : 0) <= 1);
  }
  if (subtopic === "discussed") {
    return posts.filter((p) => (Array.isArray(p.comments) ? p.comments.length : 0) >= 2);
  }
  return posts;
}

export interface ReportReasonOption {
  id: string;
  labelEn: string;
  labelBm: string;
  labelZh: string;
}

export const COMMUNITY_REPORT_REASONS: ReportReasonOption[] = [
  {
    id: "unkind",
    labelEn: "Harassment or unkind content",
    labelBm: "Gangguan atau kandungan tidak baik",
    labelZh: "骚扰或不友善言论",
  },
  {
    id: "spam",
    labelEn: "Spam or promotion",
    labelBm: "Spam atau promosi",
    labelZh: "垃圾广告或推广信息",
  },
  {
    id: "safety",
    labelEn: "Urgent safety / self-harm concern",
    labelBm: "Kebimbangan keselamatan segera",
    labelZh: "紧急安全或自伤担忧",
  },
  {
    id: "misleading",
    labelEn: "Harmful medical misinformation",
    labelBm: "Maklumat kesihatan mengelirukan",
    labelZh: "误导性医疗健康信息",
  },
  {
    id: "other",
    labelEn: "Something else",
    labelBm: "Perkara lain",
    labelZh: "其他原因",
  },
];

export function loadHiddenPostIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(HIDDEN_POSTS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveHiddenPostIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      HIDDEN_POSTS_STORAGE_KEY,
      JSON.stringify(Array.from(ids)),
    );
  } catch {
    // ignore storage errors
  }
}

export function loadSavedPostIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SAVED_POSTS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveSavedPostIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      SAVED_POSTS_STORAGE_KEY,
      JSON.stringify(Array.from(ids)),
    );
  } catch {
    // ignore storage errors
  }
}

export function loadSeenPostIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SEEN_POSTS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveSeenPostIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      SEEN_POSTS_STORAGE_KEY,
      JSON.stringify(Array.from(ids).slice(-250)),
    );
  } catch {
    // ignore storage errors
  }
}

export function loadDeskListModePref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DESK_LIST_PREF_KEY) === "list";
  } catch {
    return false;
  }
}

export function saveDeskListModePref(useList: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DESK_LIST_PREF_KEY, useList ? "list" : "scene");
  } catch {
    // ignore storage errors
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function triggerSubtleHaptic(ms = 10): void {
  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function" &&
      !prefersReducedMotion()
    ) {
      navigator.vibrate(ms);
    }
  } catch {
    // ignore unsupported platforms
  }
}
