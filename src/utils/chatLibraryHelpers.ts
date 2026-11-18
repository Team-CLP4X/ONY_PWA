import type { AppLanguage } from "../i18n/translations";
import type { ChatSuggestion, MarketplaceRecommendation } from "../services/contracts";

export type FolderColorId =
  | "peach"
  | "ocean"
  | "forest"
  | "lavender"
  | "sunset"
  | "amber"
  | "slate";

export type FolderIconId =
  | "briefcase"
  | "heart"
  | "sparkles"
  | "book"
  | "folder"
  | "moon"
  | "sun"
  | "compass"
  | "coffee";

export type ChatSortMode = "recent" | "name" | "oldest";

export type VirtualFolderId = "unsorted" | "archived";
export type ActiveFolderSelection = number | VirtualFolderId | null;

export interface ChatLibraryMessage {
  from: "ony" | "user";
  text: string;
  voucher?: MarketplaceRecommendation | null;
  vouchers?: MarketplaceRecommendation[];
  copingActivity?: string | null;
  suggestions?: ChatSuggestion[];
  shownSuggestionIds?: string[];
  dismissedVoucher?: boolean;
}

export interface ChatLibraryFolder {
  id: number;
  name: string;
  color?: FolderColorId | string;
  icon?: FolderIconId | string;
  pinned?: boolean;
  isDefault?: boolean;
}

export interface ChatLibraryConversation {
  id: number;
  title: string;
  category: string;
  day: "Today" | "Yesterday";
  messages: ChatLibraryMessage[];
  folderId?: number;
  archived?: boolean;
  reportAllowed?: boolean;
  pinned?: boolean;
  suggestedFolderId?: number;
  suggestedFolderName?: string;
  dismissedSuggestion?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_CHAT_FOLDERS: ChatLibraryFolder[] = [
  { id: 1, name: "Study & Work", color: "ocean", icon: "briefcase", isDefault: true },
  { id: 2, name: "Relationships", color: "sunset", icon: "heart", isDefault: true },
  { id: 3, name: "Self-Care", color: "forest", icon: "sparkles", isDefault: true },
  { id: 4, name: "Personal Reflections", color: "lavender", icon: "book", isDefault: true },
];

export interface FolderColorOption {
  id: FolderColorId;
  labelEn: string;
  labelBm: string;
  labelZh: string;
  lightHex: string;
  darkHex: string;
}

export const FOLDER_COLOR_OPTIONS: FolderColorOption[] = [
  { id: "peach", labelEn: "Warm Peach", labelBm: "Pic Hangat", labelZh: "暖桃", lightHex: "#d96552", darkHex: "#f59e8b" },
  { id: "ocean", labelEn: "Calm Blue", labelBm: "Biru Tenang", labelZh: "静海蓝", lightHex: "#2563eb", darkHex: "#60a5fa" },
  { id: "forest", labelEn: "Sage Teal", labelBm: "Hijau Damai", labelZh: "森语青", lightHex: "#0d9488", darkHex: "#2dd4bf" },
  { id: "lavender", labelEn: "Soft Violet", labelBm: "Ungu Lembut", labelZh: "柔雾紫", lightHex: "#7c3aed", darkHex: "#c4b5fd" },
  { id: "sunset", labelEn: "Gentle Rose", labelBm: "Mawar Lembut", labelZh: "暮玫瑰", lightHex: "#db2777", darkHex: "#f472b6" },
  { id: "amber", labelEn: "Honey Gold", labelBm: "Emas Madu", labelZh: "暖杏金", lightHex: "#b45309", darkHex: "#fbbf24" },
  { id: "slate", labelEn: "Quiet Slate", labelBm: "Kelabu Tenang", labelZh: "静石灰", lightHex: "#475569", darkHex: "#94a3b8" },
];

export const FOLDER_ICON_OPTIONS: { id: FolderIconId; labelEn: string; labelBm: string; labelZh: string }[] = [
  { id: "folder", labelEn: "Folder", labelBm: "Folder", labelZh: "文件夹" },
  { id: "briefcase", labelEn: "Work & Study", labelBm: "Kerja & Belajar", labelZh: "学业工作" },
  { id: "heart", labelEn: "Heart", labelBm: "Hati", labelZh: "情感" },
  { id: "sparkles", labelEn: "Self-Care", labelBm: "Penjagaan Diri", labelZh: "自我关怀" },
  { id: "book", labelEn: "Reflections", labelBm: "Refleksi", labelZh: "日记感悟" },
  { id: "moon", labelEn: "Sleep & Night", labelBm: "Tidur & Malam", labelZh: "睡眠夜晚" },
  { id: "sun", labelEn: "Mood & Energy", labelBm: "Mood & Tenaga", labelZh: "活力阳光" },
  { id: "compass", labelEn: "Life Path", labelBm: "Arah Hidup", labelZh: "人生方向" },
  { id: "coffee", labelEn: "Calm Break", labelBm: "Rehat", labelZh: "小憩片刻" },
];

export function resolveFolderDefaults(folder: ChatLibraryFolder): Required<Pick<ChatLibraryFolder, "color" | "icon">> {
  let defaultColor: FolderColorId = "peach";
  let defaultIcon: FolderIconId = "folder";
  if (folder.id === 1) {
    defaultColor = "ocean";
    defaultIcon = "briefcase";
  } else if (folder.id === 2) {
    defaultColor = "sunset";
    defaultIcon = "heart";
  } else if (folder.id === 3) {
    defaultColor = "forest";
    defaultIcon = "sparkles";
  } else if (folder.id === 4) {
    defaultColor = "lavender";
    defaultIcon = "book";
  }
  return {
    color: (folder.color as FolderColorId) || defaultColor,
    icon: (folder.icon as FolderIconId) || defaultIcon,
  };
}

export function getFolderAccentHex(colorId: FolderColorId | string | undefined, isDark: boolean): string {
  const match = FOLDER_COLOR_OPTIONS.find((opt) => opt.id === colorId) || FOLDER_COLOR_OPTIONS[0];
  return isDark ? match.darkHex : match.lightHex;
}

export function getLocalizedDefaultFolderName(folder: ChatLibraryFolder, language: AppLanguage): string {
  if (folder.id === 1 && folder.name === "Study & Work") {
    return language === "Bahasa Melayu" ? "Belajar & Kerja" : language === "中文" ? "学业与工作" : folder.name;
  }
  if (folder.id === 2 && folder.name === "Relationships") {
    return language === "Bahasa Melayu" ? "Perhubungan" : language === "中文" ? "人际与情感" : folder.name;
  }
  if (folder.id === 3 && folder.name === "Self-Care") {
    return language === "Bahasa Melayu" ? "Penjagaan Diri" : language === "中文" ? "自我关怀" : folder.name;
  }
  if (folder.id === 4 && folder.name === "Personal Reflections") {
    return language === "Bahasa Melayu" ? "Refleksi Peribadi" : language === "中文" ? "个人反思" : folder.name;
  }
  return folder.name;
}

export function getConversationTimestampMs(chat: ChatLibraryConversation): number {
  if (chat.updatedAt) {
    const parsed = Date.parse(chat.updatedAt);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (chat.createdAt) {
    const parsed = Date.parse(chat.createdAt);
    if (!Number.isNaN(parsed)) return parsed;
  }
  // Fall back nicely using day + numeric id ordering
  const now = Date.now();
  if (chat.day === "Yesterday") {
    return now - 86400000 + (chat.id % 10000);
  }
  if (chat.id > 1_000_000_000_000) {
    return chat.id;
  }
  return now - (200 - Math.min(199, chat.id)) * 60000;
}

export function formatRelativeActivityTime(ms: number | null, language: AppLanguage): string {
  if (!ms) {
    return language === "Bahasa Melayu" ? "Tiada aktiviti" : language === "中文" ? "暂无记录" : "No activity";
  }
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 90) {
    return language === "Bahasa Melayu" ? "Baru tadi" : language === "中文" ? "刚刚" : "Just now";
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return language === "Bahasa Melayu"
      ? `${diffMin}m lalu`
      : language === "中文"
        ? `${diffMin}分钟前`
        : `${diffMin}m ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return language === "Bahasa Melayu"
      ? `${diffHours}j lalu`
      : language === "中文"
        ? `${diffHours}小时前`
        : `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return language === "Bahasa Melayu" ? "Semalam" : language === "中文" ? "昨天" : "Yesterday";
  }
  if (diffDays < 7) {
    return language === "Bahasa Melayu"
      ? `${diffDays}h lalu`
      : language === "中文"
        ? `${diffDays}天前`
        : `${diffDays}d ago`;
  }
  return new Intl.DateTimeFormat(
    language === "Bahasa Melayu" ? "ms-MY" : language === "中文" ? "zh-CN" : "en-MY",
    { month: "short", day: "numeric" },
  ).format(new Date(ms));
}

export type DateBucketKey = "today" | "yesterday" | "thisWeek" | "earlier";

export function getDateBucketKey(chat: ChatLibraryConversation): DateBucketKey {
  if (!chat.updatedAt && chat.day === "Yesterday") return "yesterday";
  const ts = getConversationTimestampMs(chat);
  const d = new Date(ts);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOfWeek = startOfToday - 6 * 86400000;

  if (ts >= startOfToday || (!chat.updatedAt && chat.day === "Today")) return "today";
  if (ts >= startOfYesterday) return "yesterday";
  if (d.getTime() >= startOfWeek) return "thisWeek";
  return "earlier";
}

export function getDateBucketLabel(bucket: DateBucketKey, language: AppLanguage): string {
  switch (bucket) {
    case "today":
      return language === "Bahasa Melayu" ? "Hari Ini" : language === "中文" ? "今天" : "Today";
    case "yesterday":
      return language === "Bahasa Melayu" ? "Semalam" : language === "中文" ? "昨天" : "Yesterday";
    case "thisWeek":
      return language === "Bahasa Melayu" ? "Minggu Ini" : language === "中文" ? "本周" : "This week";
    case "earlier":
      return language === "Bahasa Melayu" ? "Terdahulu" : language === "中文" ? "更早" : "Earlier";
  }
}

export function getLastMessagePreview(chat: ChatLibraryConversation, language: AppLanguage): string {
  const lastMsg = chat.messages[chat.messages.length - 1];
  if (!lastMsg || !lastMsg.text.trim()) {
    return language === "Bahasa Melayu"
      ? "Tiada mesej lagi"
      : language === "中文"
        ? "尚无对话内容"
        : "No messages yet";
  }
  return lastMsg.text.trim();
}

export function sortConversations(
  items: ChatLibraryConversation[],
  mode: ChatSortMode,
): ChatLibraryConversation[] {
  return [...items].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) {
      return a.pinned ? -1 : 1;
    }
    if (mode === "name") {
      return a.title.localeCompare(b.title);
    }
    const ta = getConversationTimestampMs(a);
    const tb = getConversationTimestampMs(b);
    return mode === "oldest" ? ta - tb : tb - ta;
  });
}

export interface FolderSuggestionResult {
  kind: "existing_folder" | "create_folder";
  folderId?: number;
  folderName: string;
  suggestedColor?: FolderColorId;
  suggestedIcon?: FolderIconId;
}

const FOLDER_RULES: {
  targetIds: number[];
  keywords: string[];
}[] = [
  {
    targetIds: [1], // Study & Work
    keywords: [
      "study", "exam", "exams", "assignment", "homework", "class", "lecture", "university",
      "college", "deadline", "work", "job", "career", "internship", "boss", "meeting",
      "project", "office", "resume", "interview", "belajar", "peperiksaan", "tugasan",
      "kerja", "temuduga", "学习", "考试", "作业", "工作", "实习", "面试", "加班",
    ],
  },
  {
    targetIds: [2], // Relationships
    keywords: [
      "relationship", "partner", "boyfriend", "girlfriend", "spouse", "husband", "wife",
      "friend", "friends", "friendship", "family", "mom", "dad", "mother", "father",
      "sibling", "argument", "conflict", "lonely", "breakup", "dating", "hubung", "kawan",
      "keluarga", "pasangan", "朋友", "家人", "伴侣", "分手", "吵架", "感情", "父母",
    ],
  },
  {
    targetIds: [3], // Self-Care
    keywords: [
      "self-care", "breathe", "breathing", "grounding", "calm", "relax", "rest", "burnout",
      "tired", "exhausted", "panic", "anxious", "anxiety", "mindful", "meditation", "walk",
      "hydrate", "pause", "tenang", "rehat", "penat", "cemas", "nafas", "放松", "深呼吸",
      "焦虑", "正念", "疲惫", "休息",
    ],
  },
  {
    targetIds: [4], // Personal Reflections
    keywords: [
      "reflect", "reflection", "journal", "diary", "grateful", "gratitude", "meaning",
      "future", "identity", "growth", "value", "values", "overwhelmed", "feeling", "proud",
      "refleksi", "bersyukur", "masa depan", "反思", "感恩", "日记", "自我", "迷茫",
    ],
  },
];

const NEW_TOPIC_RULES: {
  nameEn: string;
  nameBm: string;
  nameZh: string;
  color: FolderColorId;
  icon: FolderIconId;
  keywords: string[];
}[] = [
  {
    nameEn: "Sleep",
    nameBm: "Tidur",
    nameZh: "睡眠",
    color: "lavender",
    icon: "moon",
    keywords: [
      "sleep", "insomnia", "nightmare", "nightmares", "awake", "bedtime", "can't sleep",
      "cant sleep", "sleepless", "tidur", "mimpi buruk", "tak boleh tidur", "失眠", "睡不着", "噩梦", "熬夜",
    ],
  },
  {
    nameEn: "Health",
    nameBm: "Kesihatan",
    nameZh: "健康",
    color: "forest",
    icon: "sun",
    keywords: [
      "headache", "chronic", "pain", "doctor", "clinic", "hospital", "appetite", "illness",
      "sihat", "kesihatan", "doktor", "sakit", "健康", "头痛", "生病", "医院",
    ],
  },
  {
    nameEn: "Finances",
    nameBm: "Kewangan",
    nameZh: "财务",
    color: "amber",
    icon: "compass",
    keywords: [
      "money", "rent", "bills", "debt", "loan", "salary", "budget", "financial",
      "duit", "kewangan", "bil", "hutang", "钱", "房租", "经济", "开销",
    ],
  },
];

/**
 * Lightweight local topic matcher for Auto-Organize Chats.
 * Triggers after at least 3 messages in the conversation.
 * Privacy rule: never touches `reportAllowed`, `archived`, or deletion.
 * // TODO: Optionally delegate topic classification to a privacy-scoped backend endpoint when available.
 */
export function evaluateChatFolderSuggestion(
  chat: ChatLibraryConversation,
  folders: ChatLibraryFolder[],
  language: AppLanguage,
): FolderSuggestionResult | null {
  if (chat.archived || chat.folderId != null || chat.dismissedSuggestion) {
    return null;
  }
  if (!chat.messages || chat.messages.length < 3) {
    return null;
  }

  const corpus = `${chat.title} ${chat.category} ${chat.messages.map((m) => m.text).join(" ")}`.toLowerCase();

  // 1. Check for strong match with unknown-to-default topics (e.g., "Sleep") FIRST if user hasn't created a Sleep folder yet,
  //    or match an existing folder with the exact topic name
  for (const topic of NEW_TOPIC_RULES) {
    let hits = 0;
    for (const kw of topic.keywords) {
      if (corpus.includes(kw)) hits += 1;
    }
    if (hits >= 1) {
      const existingTopicFolder = folders.find((f) => {
        const lower = f.name.toLowerCase();
        return (
          lower.includes(topic.nameEn.toLowerCase()) ||
          lower.includes(topic.nameBm.toLowerCase()) ||
          lower.includes(topic.nameZh.toLowerCase())
        );
      });
      if (existingTopicFolder) {
        return {
          kind: "existing_folder",
          folderId: existingTopicFolder.id,
          folderName: existingTopicFolder.name,
        };
      }
      const localizedName =
        language === "Bahasa Melayu" ? topic.nameBm : language === "中文" ? topic.nameZh : topic.nameEn;
      return {
        kind: "create_folder",
        folderName: localizedName,
        suggestedColor: topic.color,
        suggestedIcon: topic.icon,
      };
    }
  }

  // 2. Match custom folders by folder name tokens
  for (const folder of folders) {
    if (!folder.isDefault) {
      const words = folder.name
        .toLowerCase()
        .split(/[\s&,/]+/)
        .filter((w) => w.length >= 3);
      if (words.some((w) => corpus.includes(w))) {
        return {
          kind: "existing_folder",
          folderId: folder.id,
          folderName: folder.name,
        };
      }
    }
  }

  // 3. Score against standard folders present in `folders`
  let bestFolder: ChatLibraryFolder | null = null;
  let bestScore = 0;

  for (const rule of FOLDER_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (corpus.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      const matchFolder = folders.find((f) => rule.targetIds.includes(f.id));
      if (matchFolder) {
        bestScore = score;
        bestFolder = matchFolder;
      }
    }
  }

  if (bestFolder && bestScore >= 1) {
    return {
      kind: "existing_folder",
      folderId: bestFolder.id,
      folderName: getLocalizedDefaultFolderName(bestFolder, language),
    };
  }

  return null;
}
