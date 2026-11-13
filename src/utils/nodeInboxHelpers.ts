import type { FirestoreCommunityMessage } from "../firebase/firestore";

export type InboxMessage = FirestoreCommunityMessage & {
  /** Optional database read flag. Existing docs without `isRead` default to read (`false` unread). */
  isRead?: boolean;
  /** Optional ISO timestamp when message was read in DB. */
  readAt?: string;
};

export type InboxFilterKind = "all" | "unread" | "text" | "voice";

export type DateBucketKey = "today" | "yesterday" | "thisWeek" | "earlier";

export interface BlockedSenderEntry {
  id: string;
  label: string;
  blockedAt: string;
}

const READ_IDS_STORAGE_KEY = "ony_node_read_ids_v1";
const UNREAD_OVERRIDE_IDS_STORAGE_KEY = "ony_node_unread_ids_v1";
const BLOCKED_SENDERS_STORAGE_KEY = "ony_node_blocked_senders_v1";
export const AUTO_TRANSLATE_STORAGE_KEY = "ony_auto_translate_messages";

export function parseMessageTimestamp(createdAt: unknown): number {
  if (!createdAt) return Date.now();
  if (typeof createdAt === "number") return createdAt;
  if (createdAt instanceof Date) return createdAt.getTime();
  const obj = createdAt as { toMillis?: () => number; toDate?: () => Date; seconds?: number };
  if (typeof obj.toMillis === "function") return obj.toMillis();
  if (typeof obj.toDate === "function") return obj.toDate().getTime();
  if (typeof obj.seconds === "number") return obj.seconds * 1000;
  const parsed = Date.parse(String(createdAt));
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

export function formatInboxMessageTime(ts: number, language: string): string {
  const diffMs = Math.max(0, Date.now() - ts);
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);

  if (diffMins < 1) {
    if (language === "Bahasa Melayu") return "Baru sebentar";
    if (language === "中文") return "刚刚";
    return "Just now";
  }
  if (diffMins < 60) {
    if (language === "Bahasa Melayu") return `${diffMins}m lalu`;
    if (language === "中文") return `${diffMins}分钟前`;
    return `${diffMins}m ago`;
  }
  if (diffHours < 18) {
    if (language === "Bahasa Melayu") return `${diffHours}j lalu`;
    if (language === "中文") return `${diffHours}小时前`;
    return `${diffHours}h ago`;
  }

  const locale =
    language === "Bahasa Melayu" ? "ms-MY" : language === "中文" ? "zh-CN" : "en-US";
  const d = new Date(ts);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();

  return d.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function getDateBucketKey(ts: number, now: Date = new Date()): DateBucketKey {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;

  if (ts >= startOfToday) return "today";
  if (ts >= startOfYesterday) return "yesterday";
  if (ts >= startOfWeek) return "thisWeek";
  return "earlier";
}

export function formatInboxSenderLabel(
  rawSender: string | undefined,
  language: string,
): string {
  const s = (rawSender || "").trim();
  const numMatch = /#?(\d+)/.exec(s);
  const idSuffix = numMatch ? `#${numMatch[1]}` : "";

  if (s.toLowerCase().includes("friend") || s.includes("Teman") || s.includes("朋友")) {
    if (language === "Bahasa Melayu") return `Sahabat Tanpa Nama ${idSuffix}`.trim();
    if (language === "中文") return `匿名挚友 ${idSuffix}`.trim();
    return `Anonymous Friend ${idSuffix}`.trim();
  }

  if (language === "Bahasa Melayu") {
    return idSuffix ? `Ahli Tanpa Nama ${idSuffix}` : "Ahli Tanpa Nama";
  }
  if (language === "中文") {
    return idSuffix ? `匿名成员 ${idSuffix}` : "匿名成员";
  }
  return idSuffix ? `Anonymous Member ${idSuffix}` : "Anonymous Member";
}

export function getSenderBlockKey(msg: FirestoreCommunityMessage): string {
  const fromId = (msg.fromUserId || "").trim();
  if (fromId) return fromId;
  return (msg.senderAnonymous || msg.id).trim().toLowerCase();
}

/**
 * Determines if a message is unread.
 * Existing Firestore documents without an `isRead` boolean default to read (`false` unread),
 * matching backwards-compatible rollout semantics.
 */
export function isMessageUnread(
  msg: InboxMessage,
  readIds: Set<string>,
  unreadOverrideIds: Set<string>,
): boolean {
  if (readIds.has(msg.id)) return false;
  if (unreadOverrideIds.has(msg.id)) return true;
  return msg.isRead === false;
}

export function loadStoredIdSet(key: string): Set<string> {
  try {
    if (typeof window === "undefined") return new Set();
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function saveStoredIdSet(key: string, ids: Set<string>): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore storage errors
  }
}

export function loadReadMessageIds(): Set<string> {
  return loadStoredIdSet(READ_IDS_STORAGE_KEY);
}

export function saveReadMessageIds(ids: Set<string>): void {
  saveStoredIdSet(READ_IDS_STORAGE_KEY, ids);
}

export function loadUnreadOverrideIds(): Set<string> {
  return loadStoredIdSet(UNREAD_OVERRIDE_IDS_STORAGE_KEY);
}

export function saveUnreadOverrideIds(ids: Set<string>): void {
  saveStoredIdSet(UNREAD_OVERRIDE_IDS_STORAGE_KEY, ids);
}

export function loadBlockedSenders(): BlockedSenderEntry[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(BLOCKED_SENDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is BlockedSenderEntry =>
        Boolean(item && typeof item.id === "string" && typeof item.label === "string"),
    );
  } catch {
    return [];
  }
}

export function saveBlockedSenders(entries: BlockedSenderEntry[]): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(BLOCKED_SENDERS_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage errors
  }
}

export function loadAutoTranslatePref(): boolean {
  try {
    if (typeof window === "undefined") return true;
    const raw = localStorage.getItem(AUTO_TRANSLATE_STORAGE_KEY);
    return raw !== null ? raw === "true" : true;
  } catch {
    return true;
  }
}

export function saveAutoTranslatePref(val: boolean): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(AUTO_TRANSLATE_STORAGE_KEY, String(val));
  } catch {
    // ignore storage errors
  }
}

export function formatMessageCountLabel(count: number, language: string): string {
  if (language === "Bahasa Melayu") {
    return `${count} mesej`;
  }
  if (language === "中文") {
    return `${count} 条留言`;
  }
  return count === 1 ? "1 message" : `${count} messages`;
}

export function getMyNodeStrings(language: string) {
  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  return {
    // Header
    myLight: isBm ? "Cahaya Tanpa Nama Anda" : isZh ? "您的匿名微光" : "Your anonymous light",
    visible: isBm ? "Kelihatan" : isZh ? "可见" : "Visible",
    hidden: isBm ? "Tersembunyi" : isZh ? "已隐藏" : "Hidden",
    locateShort: isBm ? "Lokasi" : isZh ? "定位" : "Locate",
    locateAria: isBm ? "Cari nod anda di glob" : isZh ? "在星球上定位您的节点" : "Locate your light on globe",
    updateMoodAria: isBm ? "Kemas kini daftar masuk emosi anda" : isZh ? "更新您的心情状态" : "Update your mood check-in",
    settingsAria: isBm ? "Buka tetapan nod" : isZh ? "打开节点设置" : "Open node settings",
    expandHeaderAria: isBm ? "Kembangkan ringkasan nod" : isZh ? "展开节点摘要" : "Expand node header",

    // Inbox top & filters
    inboxTitle: isBm ? "Sokongan kepada anda" : isZh ? "发送给您的支持" : "Support sent to you",
    filterAll: isBm ? "Semua" : isZh ? "全部" : "All",
    filterUnread: isBm ? "Belum dibaca" : isZh ? "未读" : "Unread",
    filterText: isBm ? "Teks" : isZh ? "文字" : "Text",
    filterVoice: isBm ? "Suara" : isZh ? "语音" : "Voice",
    searchAria: isBm ? "Cari mesej dan transkrip" : isZh ? "搜索留言与语音文字" : "Search messages and transcripts",
    searchPlaceholder: isBm ? "Cari mesej atau transkrip suara…" : isZh ? "搜索鼓励内容或语音文字…" : "Search messages or voice transcripts…",
    clearSearch: isBm ? "Kosongkan carian" : isZh ? "清空搜索" : "Clear search",
    refreshAria: isBm ? "Segarkan mesej" : isZh ? "刷新留言" : "Refresh messages",
    moreOptionsAria: isBm ? "Lagi tindakan peti masuk" : isZh ? "更多收件箱操作" : "More inbox actions",
    markAllRead: isBm ? "Tanda semua telah dibaca" : isZh ? "全部标为已读" : "Mark all as read",
    markedAllReadToast: isBm ? "Semua mesej ditanda telah dibaca" : isZh ? "已将所有留言标为已读" : "All messages marked as read",
    openSettings: isBm ? "Tetapan nod" : isZh ? "节点设置" : "Node settings",
    pullToRefresh: isBm ? "Lepas untuk segarkan…" : isZh ? "松开刷新…" : "Release to refresh…",

    // Date buckets
    today: isBm ? "Hari ini" : isZh ? "今天" : "Today",
    yesterday: isBm ? "Semalam" : isZh ? "昨天" : "Yesterday",
    thisWeek: isBm ? "Minggu ini" : isZh ? "本周" : "This week",
    earlier: isBm ? "Lebih awal" : isZh ? "更早" : "Earlier",

    // Row actions & states
    unreadAria: isBm ? "Mesej belum dibaca" : isZh ? "未读留言" : "Unread message",
    readMore: isBm ? "Baca lagi" : isZh ? "展开" : "Read more",
    showLess: isBm ? "Tunjuk sedikit" : isZh ? "收起" : "Show less",
    viewTranscript: isBm ? "Lihat transkrip" : isZh ? "查看文字" : "View transcript",
    hideTranscript: isBm ? "Tutup transkrip" : isZh ? "收起文字" : "Hide transcript",
    transcribing: isBm ? "Menukar suara ke teks…" : isZh ? "正在获取语音文字…" : "Getting transcript…",
    transcriptLabel: isBm ? "Transkrip suara" : isZh ? "语音文字" : "Transcript",
    showOriginal: isBm ? "Tunjuk teks asal" : isZh ? "查看原文" : "Show original",
    translateAction: isBm ? `Terjemah (${language})` : isZh ? "翻译内容" : "Translate",
    translating: isBm ? "Menterjemah…" : isZh ? "翻译中…" : "Translating…",
    translatedToggleAria: isBm
      ? "Teks diterjemahkan dipaparkan · Ketik untuk tukar ke asal"
      : isZh
        ? "当前显示译文 · 点击切换原文"
        : "Showing translation · Tap to toggle original",
    markUnread: isBm ? "Tanda belum dibaca" : isZh ? "标为未读" : "Mark as unread",
    markRead: isBm ? "Tanda telah dibaca" : isZh ? "标为已读" : "Mark as read",
    report: isBm ? "Laporkan" : isZh ? "举报" : "Report",
    blockSender: isBm ? "Sekat penghantar" : isZh ? "屏蔽此发送者" : "Block sender",
    deleteAction: isBm ? "Padam" : isZh ? "删除" : "Delete",
    messageOptionsAria: isBm ? "Pilihan mesej" : isZh ? "留言选项" : "Message options",

    // Gestures & bulk mode
    selectedCount: (n: number) =>
      isBm ? `${n} dipilih` : isZh ? `已选 ${n} 项` : `${n} selected`,
    cancel: isBm ? "Batal" : isZh ? "取消" : "Cancel",
    deletedUndo: isBm ? "Mesej dipadamkan" : isZh ? "留言已删除" : "Message deleted",
    deletedBulkUndo: (n: number) =>
      isBm ? `${n} mesej dipadamkan` : isZh ? `已删除 ${n} 条留言` : `${n} messages deleted`,
    undo: isBm ? "Buat asal" : isZh ? "撤销" : "Undo",
    senderBlockedToast: (label: string) =>
      isBm
        ? `${label} telah disekat`
        : isZh
          ? `已屏蔽 ${label}`
          : `Blocked ${label}`,
    senderUnblockedToast: (label: string) =>
      isBm
        ? `Sekatan ${label} dibuka`
        : isZh
          ? `已取消屏蔽 ${label}`
          : `Unblocked ${label}`,

    // Infinite scroll & empty / paused / error
    loadingMore: isBm ? "Memuatkan lagi mesej…" : isZh ? "正在加载更多…" : "Loading more messages…",
    loadMoreBtn: isBm ? "Muat lagi" : isZh ? "加载更多" : "Load more",
    emptyNoMessagesTitle: isBm ? "Belum ada mesej lagi" : isZh ? "暂无鼓励留言" : "No messages yet",
    emptyNoMessagesDesc: isBm
      ? "Kata-kata yang baik akan muncul di sini apabila seseorang menghantarnya."
      : isZh
        ? "当有人向您发送温暖话语时，它们会出现在这里。"
        : "Kind words will appear here when someone sends them.",
    emptyNoMatchesTitle: isBm ? "Tiada mesej sepadan" : isZh ? "未找到匹配的留言" : "No matching messages",
    emptyNoMatchesDesc: isBm
      ? "Tiada mesej sepadan dengan penapis atau carian semasa anda."
      : isZh
        ? "没有符合当前筛选或搜索关键词的留言。"
        : "Nothing matched your current filter or search.",
    clearFilters: isBm ? "Kosongkan penapis" : isZh ? "重置筛选" : "Clear filters",
    pausedTitle: isBm
      ? "Anda tidak menerima mesej buat masa ini"
      : isZh
        ? "您当前已暂停接收鼓励留言"
        : "You're not accepting messages right now",
    pausedDesc: isBm
      ? "Hidupkan semula dalam Tetapan Nod apabila anda bersedia untuk menerima kata-kata semangat."
      : isZh
        ? "当您准备好再次接收社区关怀时，可随时在节点设置中开启。"
        : "Turn it back on in Node settings whenever you're ready to receive kind notes.",
    pausedInlineBanner: isBm
      ? "Penerimaan mesej baharu dijeda."
      : isZh
        ? "已暂停接收新留言。"
        : "New messages are paused.",
    openNodeSettingsBtn: isBm ? "Buka Tetapan Nod" : isZh ? "前往节点设置" : "Open Node settings",
    errorTitle: isBm ? "Tidak dapat memuatkan mesej" : isZh ? "无法加载留言" : "Couldn't load messages",
    retry: isBm ? "Cuba lagi" : isZh ? "重试" : "Retry",

    // Node Settings Screen
    settingsTitle: isBm ? "Tetapan nod" : isZh ? "节点设置" : "Node settings",
    backAria: isBm ? "Kembali" : isZh ? "返回" : "Back",
    sectionVisibility: isBm ? "KETERLIHATAN" : isZh ? "可见性" : "VISIBILITY",
    appearTitle: isBm ? "Tampil di atas glob" : isZh ? "在社区星球上显示" : "Appear on the globe",
    appearDesc: isBm
      ? "Biarkan cahaya hangat anda kelihatan oleh orang lain di rantau anda."
      : isZh
        ? "让您所在大区的社区伙伴看见您的匿名微光。"
        : "Let your anonymous light be seen in your broad region.",
    appearOnStatus: isBm ? "Aktif · Kelihatan di glob" : isZh ? "开启 · 星球可见" : "On · Visible on globe",
    appearOffStatus: isBm ? "Mati · Tersembunyi" : isZh ? "关闭 · 已隐藏" : "Off · Hidden",
    acceptTitle: isBm ? "Terima mesej sokongan" : isZh ? "接收温暖鼓励留言" : "Accept supportive messages",
    acceptDesc: isBm
      ? "Benarkan ahli menghantar kata-kata semangat dan nota suara."
      : isZh
        ? "允许社区伙伴向您的微光发送文字或语音鼓励。"
        : "Allow community members to send gentle notes and voice whispers.",
    acceptOnStatus: isBm ? "Aktif · Sedia menerima" : isZh ? "开启 · 正常接收" : "On · Accepting messages",
    acceptOffStatus: isBm ? "Mati · Mesej dijeda" : isZh ? "关闭 · 已暂停" : "Off · Messages paused",

    sectionLanguage: isBm ? "BAHASA" : isZh ? "语言偏好" : "LANGUAGE",
    autoTranslateTitle: isBm
      ? "Auto-terjemah mesej ke bahasa saya"
      : isZh
        ? "自动翻译留言为我的语言"
        : "Auto-translate messages to my language",
    autoTranslateDesc: isBm
      ? "Terjemah mesej sokongan dan transkrip suara secara automatik."
      : isZh
        ? "自动将收到的文字与语音转写内容翻译为您选择的语言。"
        : "Automatically translates supportive notes and voice transcripts.",

    sectionRegion: isBm ? "RANTAU" : isZh ? "地区设置" : "REGION",
    changeArea: isBm ? "Tukar kawasan" : isZh ? "更换区域" : "Change area",
    done: isBm ? "Selesai" : isZh ? "完成" : "Done",
    useCurrentArea: isBm ? "Gunakan kawasan semasa" : isZh ? "使用当前位置" : "Use current area",
    chooseManual: isBm ? "Pilih secara manual" : isZh ? "手动选择区域" : "Choose manually",
    detecting: isBm ? "Mengenal pasti rantau…" : isZh ? "正在识别大区…" : "Detecting broad region…",
    privacyOneLine: isBm
      ? "Hanya negeri atau rantau anda digunakan, bukan lokasi tepat anda"
      : isZh
        ? "仅使用您的省州或大区范围，绝不使用精确定位"
        : "Only your state or region is used, never your exact location",
    learnMore: isBm ? "Ketahui lebih lanjut" : isZh ? "了解更多" : "Learn more",
    hideDetails: isBm ? "Tutup" : isZh ? "收起" : "Hide details",
    privacyDetail: isBm
      ? "Koordinat GPS tepat tidak pernah disimpan atau dihantar. Lokasi sentiasa digeneralisasikan (~25 km) dan kawasan berpenduduk kurang daripada 5 orang digabungkan ke kluster negara."
      : isZh
        ? "精确的 GPS 坐标绝不会被保存或传输。位置始终会被泛化为约 25 公里的大区中心；若所在省州少于 5 人，您的微光会自动合并入国家级星团。"
        : "Exact GPS coordinates are never stored or transmitted. Coordinates are coarsened locally (~25 km) and areas with fewer than 5 people merge into the country cluster.",

    sectionMessages: isBm ? "MESEJ" : isZh ? "留言管理" : "MESSAGES",
    blockedSendersTitle: isBm ? "Penghantar disekat" : isZh ? "已屏蔽的发送者" : "Blocked senders",
    noneBlocked: isBm ? "Tiada penghantar disekat" : isZh ? "暂无已屏蔽用户" : "No blocked senders",
    unblock: isBm ? "Nyahsekat" : isZh ? "取消屏蔽" : "Unblock",
    deleteAllTitle: isBm ? "Padam semua mesej" : isZh ? "清空全部留言" : "Delete all messages",
    deleteAllConfirmTitle: isBm ? "Padam semua mesej sokongan?" : isZh ? "确认删除全部支持留言？" : "Delete all support messages?",
    deleteAllConfirmDesc: isBm
      ? "Tindakan ini akan mengosongkan keseluruhan peti masuk anda secara kekal."
      : isZh
        ? "此操作将永久清空您收件箱中的所有温暖留言，且无法恢复。"
        : "This permanently clears your support inbox and cannot be undone.",
    deleteAllConfirmBtn: isBm ? "Padam semua" : isZh ? "确认清空" : "Delete all",
    deletedAllToast: isBm ? "Semua mesej telah dipadamkan" : isZh ? "已清空所有支持留言" : "All messages deleted",
  };
}
