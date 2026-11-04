import {
  useState,
  useMemo,
  useRef,
  type ReactNode,
  type ChangeEvent,
} from "react";
import type { User } from "firebase/auth";
import {
  type FirestoreJournalEntry,
  type FirestoreMemory,
  saveJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  saveCachedJournalEntries,
  saveMemory,
  updateMemory,
  deleteMemory,
  clearAllMemories,
  updateUserProfile,
  writeSystemLog,
  getLocalDateKey,
} from "../firebase/firestore";
import { useLanguage } from "../i18n/LanguageContext";
import { getCategoryLabel } from "../i18n/translations";

type Companion = "Cat" | "Dog" | "Bunny" | "Bear" | "Fox" | "Panda";

export interface MemoryItem {
  id: number;
  text: string;
  reason: string;
  active: boolean;
  category?: string;
  kind?: "text" | "image";
  imageTone?: string;
  imageUrl?: string;
  firestoreId?: string;
}

interface DigitalJournalProps {
  journalEntries: FirestoreJournalEntry[];
  setJournalEntries: React.Dispatch<React.SetStateAction<FirestoreJournalEntry[]>>;
  memories: MemoryItem[];
  setMemories: (action: MemoryItem[] | ((prev: MemoryItem[]) => MemoryItem[])) => void;
  companion: Companion;
  notify: (s: string) => void;
  memoryConsent: string;
  setMemoryConsent: (val: string) => void;
  useActiveMemories: boolean;
  setUseActiveMemories: (val: boolean) => void;
  currentUser: User | null;
  onNavigateToPrivacy?: () => void;
}

const DIARY_MOOD_OPTIONS = [
  { emoji: "🌿", label: "Reflective", labelBm: "Merenung", labelZh: "沉思" },
  { emoji: "🌸", label: "Peaceful", labelBm: "Damai", labelZh: "平静" },
  { emoji: "☀️", label: "Grateful", labelBm: "Bersyukur", labelZh: "感恩" },
  { emoji: "☕", label: "Cozy", labelBm: "Selesa", labelZh: "惬意" },
  { emoji: "💫", label: "Hopeful", labelBm: "Penuh Harapan", labelZh: "充满希望" },
  { emoji: "🍃", label: "Grounded", labelBm: "Tenang", labelZh: "踏实" },
  { emoji: "🌧️", label: "Tender / Sad", labelBm: "Sayu / Sedih", labelZh: "脆弱低落" },
  { emoji: "⚡", label: "Overwhelmed", labelBm: "Terbeban", labelZh: "疲惫压抑" },
  { emoji: "💭", label: "Thoughtful", labelBm: "Banyak Fikir", labelZh: "若有所思" },
];

const SOOTHING_PHOTO_PRESETS = [
  {
    name: "Rain on Leaves",
    nameBm: "Daun Basah Hujan",
    nameZh: "雨后绿叶",
    url: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Warm Cafe Corner",
    nameBm: "Sudut Kafe Hangat",
    nameZh: "温暖街角咖啡",
    url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Evening Sunset Calm",
    nameBm: "Senja Menenangkan",
    nameZh: "静谧黄昏暮色",
    url: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Peaceful Lake Waters",
    nameBm: "Tasik Hening",
    nameZh: "宁静湖畔微风",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
  },
];

const COMMON_TAGS = [
  "Mindfulness",
  "Gratitude",
  "Self-Care",
  "Study & Work",
  "Relationships",
  "Small Wins",
  "Venting",
  "Nature",
  "Family",
  "Healing",
];

const AI_MEMORY_CATEGORIES = [
  "All",
  "About Me",
  "Preferences",
  "Important People",
  "Goals",
  "Things That Help Me",
  "Special Memories",
];

export function DigitalJournal({
  journalEntries,
  setJournalEntries,
  memories,
  setMemories,
  companion,
  notify,
  memoryConsent,
  setMemoryConsent,
  useActiveMemories,
  setUseActiveMemories,
  currentUser,
  onNavigateToPrivacy,
}: DigitalJournalProps) {
  const { language } = useLanguage();

  // Top Section Switcher: Personal Diary vs AI Recall Memories
  const [activeTab, setActiveTab] = useState<"diary" | "ai_memory">("diary");

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [customDate, setCustomDate] = useState("");
  const [moodFilter, setMoodFilter] = useState<string | null>(null);

  // Editor Modal State
  const [isWriting, setIsWriting] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FirestoreJournalEntry | null>(null);

  // Deletion Modal State
  const [entryToDelete, setEntryToDelete] = useState<FirestoreJournalEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Photo Enlarged Modal
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // AI Memory Controls State
  const [aiMemoryCategory, setAiMemoryCategory] = useState("All");
  const [aiMemoryQuery, setAiMemoryQuery] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isAddingAiMemory, setIsAddingAiMemory] = useState(false);
  const [editingAiMemory, setEditingAiMemory] = useState<MemoryItem | null>(null);
  const [newAiMemoryText, setNewAiMemoryText] = useState("");
  const [newAiMemoryCategory, setNewAiMemoryCategory] = useState("About Me");

  // Form State for Journal Writer
  const [entryTitle, setEntryTitle] = useState("");
  const [entryContent, setEntryContent] = useState("");
  const [entryDateKey, setEntryDateKey] = useState(getLocalDateKey());
  const [entryMood, setEntryMood] = useState<{ emoji: string; label: string } | null>(null);
  const [entryPhotoUrl, setEntryPhotoUrl] = useState<string>("");
  const [entryTags, setEntryTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [shareToAiOnSave, setShareToAiOnSave] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper date formatting
  const todayKey = useMemo(() => getLocalDateKey(), []);

  const openNewEntry = () => {
    setEditingEntry(null);
    setEntryTitle("");
    setEntryContent("");
    setEntryDateKey(getLocalDateKey());
    setEntryMood(null);
    setEntryPhotoUrl("");
    setEntryTags([]);
    setCustomTagInput("");
    setShareToAiOnSave(false);
    setIsWriting(true);
  };

  const openEditEntry = (entry: FirestoreJournalEntry) => {
    setEditingEntry(entry);
    setEntryTitle(entry.title);
    setEntryContent(entry.content);
    setEntryDateKey(entry.dateKey || getLocalDateKey(entry.entryDate));
    setEntryMood(
      entry.moodEmoji && entry.moodLabel
        ? { emoji: entry.moodEmoji, label: entry.moodLabel }
        : null,
    );
    setEntryPhotoUrl(entry.photoUrl || "");
    setEntryTags(Array.isArray(entry.tags) ? entry.tags : []);
    setCustomTagInput("");
    setShareToAiOnSave(false);
    setIsWriting(true);
  };

  const closeWriter = () => {
    setIsWriting(false);
    setEditingEntry(null);
  };

  // Image Upload handler
  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      notify(
        language === "Bahasa Melayu"
          ? "Sila pilih imej di bawah 4MB"
          : language === "中文"
          ? "请选择小于 4MB 的照片"
          : "Please choose an image under 4MB",
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setEntryPhotoUrl(reader.result);
        notify(
          language === "Bahasa Melayu"
            ? "Foto dilampirkan"
            : language === "中文"
            ? "照片已添加"
            : "Photo attached",
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleTag = (tag: string) => {
    setEntryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleAddCustomTag = () => {
    const clean = customTagInput.trim().replace(/^#/, "");
    if (!clean) return;
    if (!entryTags.includes(clean)) {
      setEntryTags((prev) => [...prev, clean]);
    }
    setCustomTagInput("");
  };

  // Save Journal Entry
  const handleSaveEntry = async () => {
    if (!entryTitle.trim() && !entryContent.trim()) {
      notify(
        language === "Bahasa Melayu"
          ? "Sila masukkan tajuk atau teks catatan harian"
          : language === "中文"
          ? "请输入日记标题或文字内容"
          : "Please enter a title or journal content",
      );
      return;
    }

    const cleanTitle = entryTitle.trim() || (entryContent.trim().slice(0, 40) + "...");
    const cleanContent = entryContent.trim();
    const entryDate = entryDateKey
      ? new Date(`${entryDateKey}T12:00:00`).toISOString()
      : new Date().toISOString();

    const payload = {
      title: cleanTitle,
      content: cleanContent,
      dateKey: entryDateKey,
      entryDate,
      moodEmoji: entryMood?.emoji,
      moodLabel: entryMood?.label,
      photoUrl: entryPhotoUrl || undefined,
      tags: entryTags.length > 0 ? entryTags : undefined,
    };

    if (editingEntry) {
      // Update existing entry
      const updatedList = journalEntries.map((e) =>
        e.id === editingEntry.id
          ? {
              ...e,
              ...payload,
              updatedAt: new Date().toISOString(),
            }
          : e,
      );
      setJournalEntries(updatedList);
      saveCachedJournalEntries(updatedList);

      if (currentUser && editingEntry.id) {
        await updateJournalEntry(currentUser.uid, editingEntry.id, payload).catch((err) =>
          console.warn("[ONY Journal] Update error:", err),
        );
      }

      notify(
        language === "Bahasa Melayu"
          ? "Catatan diari berjaya dikemas kini"
          : language === "中文"
          ? "日记已更新保存"
          : "Journal entry updated",
      );
    } else {
      // Create new entry
      const localId = `entry_${Date.now()}`;
      const nowIso = new Date().toISOString();
      const newEntry: FirestoreJournalEntry = {
        id: localId,
        ...payload,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const updatedList = [newEntry, ...journalEntries];
      setJournalEntries(updatedList);
      saveCachedJournalEntries(updatedList);

      if (currentUser) {
        saveJournalEntry(currentUser.uid, payload)
          .then((firestoreId) => {
            if (firestoreId) {
              setJournalEntries((prev) =>
                prev.map((e) => (e.id === localId ? { ...e, id: firestoreId } : e)),
              );
            }
          })
          .catch((err) => console.warn("[ONY Journal] Save error:", err));
      }

      notify(
        language === "Bahasa Melayu"
          ? "Catatan diari tersimpan dengan selamat"
          : language === "中文"
          ? "日记已悄然珍藏入册"
          : "Journal entry saved privately",
      );
    }

    // If opted to share a highlight to AI Recall memory
    if (shareToAiOnSave) {
      const summaryText = cleanTitle;
      const reasonText =
        language === "Bahasa Melayu"
          ? `Disimpan daripada catatan diari bertarikh ${entryDateKey}`
          : language === "中文"
          ? `来源于 ${entryDateKey} 的私人日记反思`
          : `Shared from your personal journal entry on ${entryDateKey}`;

      const newMem: MemoryItem = {
        id: Date.now(),
        text: summaryText,
        reason: reasonText,
        active: true,
        category: "Special Memories",
      };
      setMemories((prev) => [newMem, ...prev]);
      if (currentUser) {
        saveMemory(currentUser.uid, {
          text: newMem.text,
          reason: newMem.reason,
          category: newMem.category || "Special Memories",
          active: true,
        }).catch(() => {});
      }
    }

    closeWriter();
  };

  // Delete Journal Entry
  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    setIsDeleting(true);

    const targetId = entryToDelete.id;
    const nextList = journalEntries.filter((e) => e.id !== targetId);
    setJournalEntries(nextList);
    saveCachedJournalEntries(nextList);

    if (currentUser && targetId && !targetId.startsWith("seed_")) {
      await deleteJournalEntry(currentUser.uid, targetId).catch((err) =>
        console.warn("[ONY Journal] Delete error:", err),
      );
    }

    setIsDeleting(false);
    setEntryToDelete(null);
    notify(
      language === "Bahasa Melayu"
        ? "Catatan diari telah dipadam"
        : language === "中文"
        ? "日记条目已删除"
        : "Journal entry deleted",
    );
  };

  // Quick Action: Share highlight from an existing entry to AI Memory
  const handleShareHighlightToAiMemory = (entry: FirestoreJournalEntry) => {
    const memorySnippet = entry.title || entry.content.slice(0, 80);
    const reasonSnippet =
      language === "Bahasa Melayu"
        ? `Refleksi diari anda pada ${entry.dateKey || "hari yang bermakna"}`
        : language === "中文"
        ? `您在 ${entry.dateKey || "特别日子"} 的日记感悟`
        : `Your personal journal reflection from ${entry.dateKey || "a meaningful day"}`;

    const newMem: MemoryItem = {
      id: Date.now(),
      text: memorySnippet,
      reason: reasonSnippet,
      active: true,
      category: "Special Memories",
    };
    setMemories((prev) => [newMem, ...prev]);
    if (currentUser) {
      saveMemory(currentUser.uid, {
        text: newMem.text,
        reason: newMem.reason,
        category: "Special Memories",
        active: true,
      }).catch(() => {});
    }
    notify(
      language === "Bahasa Melayu"
        ? "Sorotan dikongsi ke memori AI ONY"
        : language === "中文"
        ? "已同步为 ONY 的长期关怀记忆"
        : "Highlight shared with ONY's AI memory",
    );
  };

  // Filter journal entries
  const filteredJournalEntries = useMemo(() => {
    return journalEntries.filter((entry) => {
      // Query search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = entry.title.toLowerCase().includes(q);
        const matchesContent = entry.content.toLowerCase().includes(q);
        const matchesMood = entry.moodLabel?.toLowerCase().includes(q);
        const matchesTag = entry.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesMood && !matchesTag) {
          return false;
        }
      }

      // Mood Filter
      if (moodFilter && entry.moodLabel !== moodFilter) {
        return false;
      }

      // Date Filter
      if (dateFilter === "custom" && customDate) {
        return entry.dateKey === customDate;
      }
      if (dateFilter === "today") {
        return entry.dateKey === todayKey;
      }
      if (dateFilter === "week") {
        const entryTs = new Date(entry.entryDate || entry.createdAt).getTime();
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return entryTs >= weekAgo;
      }
      if (dateFilter === "month") {
        const entryTs = new Date(entry.entryDate || entry.createdAt).getTime();
        const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return entryTs >= monthAgo;
      }

      return true;
    });
  }, [journalEntries, searchQuery, moodFilter, dateFilter, customDate, todayKey]);

  // AI Memories Filtering
  const isAskBeforeSaving = memoryConsent === "control";
  const activeAiMemoriesCount = memories.filter((x) => x.active).length;
  const allAiMemoriesPaused = memories.length > 0 && memories.every((x) => !x.active);

  const filteredAiMemories = useMemo(() => {
    const q = aiMemoryQuery.trim().toLowerCase();
    return memories.filter((x) => {
      const matchesQuery =
        !q ||
        x.text.toLowerCase().includes(q) ||
        (x.reason && x.reason.toLowerCase().includes(q)) ||
        (x.category && x.category.toLowerCase().includes(q));
      const matchesCat = aiMemoryCategory === "All" || x.category === aiMemoryCategory;
      return matchesQuery && matchesCat;
    });
  }, [memories, aiMemoryQuery, aiMemoryCategory]);

  const updateAiMemory = async (id: number, patch: Partial<MemoryItem>) => {
    const target = memories.find((x) => x.id === id);
    setMemories((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    if (currentUser && target?.firestoreId) {
      const { id: _ignoreId, firestoreId: _ignoreFsId, ...cleanPatch } = patch;
      await updateMemory(currentUser.uid, target.firestoreId, cleanPatch).catch((e) =>
        console.warn("[ONY] Memory item update notice:", e),
      );
    }
  };

  const deleteSingleAiMemory = async (item: MemoryItem) => {
    setMemories((prev) => prev.filter((x) => x.id !== item.id));
    if (currentUser && item.firestoreId) {
      await deleteMemory(currentUser.uid, item.firestoreId).catch((e) =>
        console.warn("[ONY] Memory item delete notice:", e),
      );
    }
    notify(
      language === "Bahasa Melayu"
        ? "Memori AI telah dipadam"
        : language === "中文"
        ? "AI 记忆条目已删除"
        : "AI memory deleted",
    );
  };

  const handleSaveAiMemory = async () => {
    if (!newAiMemoryText.trim()) return;
    const textClean = newAiMemoryText.trim();
    const reasonClean =
      language === "Bahasa Melayu"
        ? "Ditambah terus sebagai ingatan penting untuk ONY."
        : language === "中文"
        ? "作为重要记忆直接添加供 ONY 陪伴参考。"
        : "Added directly as key context for ONY to remember.";

    if (editingAiMemory) {
      updateAiMemory(editingAiMemory.id, {
        text: textClean,
        category: newAiMemoryCategory,
      });
      notify(
        language === "Bahasa Melayu"
          ? "Memori AI dikemas kini"
          : language === "中文"
          ? "AI 记忆已更新"
          : "AI memory updated",
      );
    } else {
      const newId = Date.now();
      const newMem: MemoryItem = {
        id: newId,
        text: textClean,
        reason: reasonClean,
        active: true,
        category: newAiMemoryCategory,
      };
      setMemories((prev) => [newMem, ...prev]);
      if (currentUser) {
        saveMemory(currentUser.uid, {
          text: newMem.text,
          reason: newMem.reason,
          category: newMem.category || "General",
          active: true,
        }).catch(() => {});
      }
      notify(
        language === "Bahasa Melayu"
          ? "Memori AI berjaya disimpan"
          : language === "中文"
          ? "AI 记忆已添加"
          : "AI memory added",
      );
    }

    setIsAddingAiMemory(false);
    setEditingAiMemory(null);
    setNewAiMemoryText("");
  };

  const handleToggleAskBeforeSaving = async (nextState: boolean) => {
    const nextVal = nextState ? "control" : "allow";
    setMemoryConsent(nextVal);
    if (currentUser) {
      await updateUserProfile(currentUser.uid, { memoryConsent: nextVal }).catch((e) =>
        console.warn("[ONY] Update memory consent error:", e),
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
        : "Auto-saving: Enabled",
    );
  };

  const handleToggleUseActiveMemories = async (nextState: boolean) => {
    setUseActiveMemories(nextState);
    if (currentUser) {
      await updateUserProfile(currentUser.uid, { useActiveMemories: nextState }).catch((e) =>
        console.warn("[ONY] Update useActiveMemories error:", e),
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
        : "Pure ephemeral mode: Memories disabled in conversations",
    );
  };

  const handleTogglePauseAll = async () => {
    const nextActive = allAiMemoriesPaused;
    const updated = memories.map((x) => ({ ...x, active: nextActive }));
    setMemories(updated);
    if (currentUser) {
      for (const item of memories) {
        if (item.firestoreId) {
          updateMemory(currentUser.uid, item.firestoreId, { active: nextActive }).catch(() => {});
        }
      }
    }
    notify(
      nextActive
        ? language === "Bahasa Melayu"
          ? "Semua memori AI diaktifkan semula"
          : language === "中文"
          ? "已恢复所有 AI 记忆"
          : "All AI memories resumed"
        : language === "Bahasa Melayu"
        ? "Semua memori AI dijeda"
        : language === "中文"
        ? "已暂停所有 AI 记忆"
        : "All AI memories paused",
    );
  };

  const handleConfirmClearAllAiMemories = async () => {
    setMemories([]);
    setShowClearConfirm(false);
    if (currentUser) {
      await clearAllMemories(currentUser.uid).catch(() => {});
    }
    notify(
      language === "Bahasa Melayu"
        ? "Semua memori AI dikosongkan"
        : language === "中文"
        ? "AI 记忆宝库已清空"
        : "All AI memories cleared",
    );
  };

  return (
    <div className="digital-journal-container">
      {/* Top Main Navigation Header */}
      <div className="page-header journal-header">
        <div className="header-copy">
          <h2>
            {language === "Bahasa Melayu"
              ? "Diari Digital & Memori"
              : language === "中文"
              ? "私人日记与心绪手帐"
              : "Digital Journal & Diary"}
          </h2>
          <p>
            {activeTab === "diary"
              ? language === "Bahasa Melayu"
                ? `${journalEntries.length} catatan peribadi sulit`
                : language === "中文"
                ? `${journalEntries.length} 篇私密心绪珍藏`
                : `${journalEntries.length} private reflection entries`
              : language === "Bahasa Melayu"
              ? `${activeAiMemoriesCount} memori aktif untuk sembang ONY`
              : language === "中文"
              ? `${activeAiMemoriesCount} 条授权供 ONY 记忆的日常细节`
              : `${activeAiMemoriesCount} memories active for ONY's chats`}
          </p>
        </div>
      </div>

      <div className="page-pad topless journal-body-pad">
        {/* Distinct Segmented Tabs: Personal Diary vs AI Recall Memories */}
        <div className="journal-nav-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "diary"}
            className={`journal-nav-tab ${activeTab === "diary" ? "active" : ""}`}
            onClick={() => setActiveTab("diary")}
          >
            <span className="journal-tab-icon">📖</span>
            <div className="journal-tab-label-group">
              <strong>
                {language === "Bahasa Melayu"
                  ? "Diari Peribadi"
                  : language === "中文"
                  ? "我的私密日记"
                  : "Private Diary"}
              </strong>
              <small>
                {language === "Bahasa Melayu"
                  ? "Refleksi & kenangan"
                  : language === "中文"
                  ? "心事、照片与回甘"
                  : "Reflections & photos"}
              </small>
            </div>
            {journalEntries.length > 0 && (
              <span className="journal-tab-counter">{journalEntries.length}</span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "ai_memory"}
            className={`journal-nav-tab ${activeTab === "ai_memory" ? "active" : ""}`}
            onClick={() => setActiveTab("ai_memory")}
          >
            <span className="journal-tab-icon">🤖</span>
            <div className="journal-tab-label-group">
              <strong>
                {language === "Bahasa Melayu"
                  ? "Memori Sembang AI"
                  : language === "中文"
                  ? "AI 陪伴记忆"
                  : "AI Recall Memories"}
              </strong>
              <small>
                {language === "Bahasa Melayu"
                  ? "Konteks diingati ONY"
                  : language === "中文"
                  ? "供 ONY 对话参考"
                  : "Context ONY recalls"}
              </small>
            </div>
            {memories.length > 0 && (
              <span className="journal-tab-counter">{memories.length}</span>
            )}
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: PERSONAL DIGITAL JOURNAL & DIARY                        */}
        {/* ============================================================== */}
        {activeTab === "diary" && (
          <div className="diary-tab-content">
            {/* Journal Hero & Quick Action */}
            <div className="diary-hero-card">
              <div className="diary-hero-decoration" aria-hidden="true">
                <span>🍃</span>
                <span>✨</span>
              </div>
              <div className="diary-hero-quote">
                <span className="diary-hero-badge">
                  {language === "Bahasa Melayu"
                    ? "Ruang Jiwa Tenang"
                    : language === "中文"
                    ? "私语自愈角"
                    : "Quiet Reflection Sanctuary"}
                </span>
                <h3>
                  {language === "Bahasa Melayu"
                    ? "Luahkan perasaan anda hari ini."
                    : language === "中文"
                    ? "写下这一刻的心绪与风景。"
                    : "Reflect on how your heart feels today."}
                </h3>
                <p>
                  {language === "Bahasa Melayu"
                    ? "Diari ini 100% peribadi kepada anda. Catat detik berharga, luahkan beban hati, dan abadikan foto kenangan dengan tenang."
                    : language === "中文"
                    ? "每一篇日记均属您的私密领地。在这里放下疲惫、记录闪光日常与温存时刻，随心安放真实自我。"
                    : "This diary is strictly private to you. Revisit meaningful moments, untangle heavy feelings, and collect snapshots of your journey."}
                </p>
              </div>

              {/* Clear Prominent "Write a Journal Entry" button */}
              <button
                type="button"
                className="btn btn-primary full diary-write-main-btn"
                onClick={openNewEntry}
              >
                <span className="diary-write-btn-icon">✍️</span>
                <span>
                  {language === "Bahasa Melayu"
                    ? "Tulis Catatan Diari Baharu"
                    : language === "中文"
                    ? "记录新日记 · Write Entry"
                    : "Write a Journal Entry"}
                </span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="diary-filters-section">
              <div className="search diary-search-input-wrap">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === "Bahasa Melayu"
                      ? "Cari tajuk, teks, atau tag diari..."
                      : language === "中文"
                      ? "搜索日记标题、内容或标签..."
                      : "Search diary title, thoughts, or tags..."
                  }
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="diary-search-clear-btn"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Date Filters Row */}
              <div className="diary-date-filter-bar">
                <div className="diary-date-chips">
                  <button
                    type="button"
                    className={`diary-filter-chip ${dateFilter === "all" ? "active" : ""}`}
                    onClick={() => {
                      setDateFilter("all");
                      setCustomDate("");
                    }}
                  >
                    {language === "Bahasa Melayu"
                      ? "Semua Tarikh"
                      : language === "中文"
                      ? "全部日期"
                      : "All Dates"}
                  </button>
                  <button
                    type="button"
                    className={`diary-filter-chip ${dateFilter === "today" ? "active" : ""}`}
                    onClick={() => setDateFilter("today")}
                  >
                    {language === "Bahasa Melayu"
                      ? "Hari Ini"
                      : language === "中文"
                      ? "今天"
                      : "Today"}
                  </button>
                  <button
                    type="button"
                    className={`diary-filter-chip ${dateFilter === "week" ? "active" : ""}`}
                    onClick={() => setDateFilter("week")}
                  >
                    {language === "Bahasa Melayu"
                      ? "Minggu Ini"
                      : language === "中文"
                      ? "本周"
                      : "This Week"}
                  </button>
                  <button
                    type="button"
                    className={`diary-filter-chip ${dateFilter === "month" ? "active" : ""}`}
                    onClick={() => setDateFilter("month")}
                  >
                    {language === "Bahasa Melayu"
                      ? "Bulan Ini"
                      : language === "中文"
                      ? "本月"
                      : "This Month"}
                  </button>
                </div>

                {/* Specific Date Jump Picker */}
                <div className="diary-calendar-jump">
                  <label htmlFor="diary-jump-date" className="diary-date-jump-label">
                    📅{" "}
                    {language === "Bahasa Melayu"
                      ? "Pilih Tarikh:"
                      : language === "中文"
                      ? "按日期浏览:"
                      : "Browse Date:"}
                  </label>
                  <input
                    id="diary-jump-date"
                    type="date"
                    className="diary-date-picker-input"
                    value={customDate}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      if (e.target.value) setDateFilter("custom");
                    }}
                  />
                  {customDate && (
                    <button
                      type="button"
                      className="diary-date-clear-pill"
                      onClick={() => {
                        setCustomDate("");
                        setDateFilter("all");
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Mood Filter Pills */}
              <div className="diary-mood-scroll-chips">
                <button
                  type="button"
                  className={`diary-mood-chip ${moodFilter === null ? "active" : ""}`}
                  onClick={() => setMoodFilter(null)}
                >
                  🌈{" "}
                  {language === "Bahasa Melayu"
                    ? "Semua Mood"
                    : language === "中文"
                    ? "全部心绪"
                    : "All Moods"}
                </button>
                {DIARY_MOOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    className={`diary-mood-chip ${moodFilter === opt.label ? "active" : ""}`}
                    onClick={() =>
                      setMoodFilter((prev) => (prev === opt.label ? null : opt.label))
                    }
                  >
                    <span>{opt.emoji}</span>
                    <span>
                      {language === "Bahasa Melayu"
                        ? opt.labelBm
                        : language === "中文"
                        ? opt.labelZh
                        : opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy Assurance Notice */}
            <div className="diary-privacy-badge-banner">
              <span className="diary-lock-icon">🔒</span>
              <p>
                {language === "Bahasa Melayu"
                  ? "Catatan diari ini disimpan dalam storan selamat peribadi anda dan tidak sesekali didedahkan kepada orang lain atau AI tanpa kebenaran anda."
                  : language === "中文"
                  ? "私密日记严格加密隔离保存，绝不会被其他成员查阅，亦不会未经允许提供给 AI 聊天使用。"
                  : "Private & Confidential: These diary reflections stay strictly in your personal vault and are never shared or fed into AI chats without your permission."}
              </p>
            </div>

            {/* Entries List Header */}
            <div className="diary-list-header">
              <h4>
                {language === "Bahasa Melayu"
                  ? "Coretan Hati Anda"
                  : language === "中文"
                  ? "日记长卷"
                  : "Your Reflections"}{" "}
                <small>({filteredJournalEntries.length})</small>
              </h4>
              {(searchQuery || moodFilter || dateFilter !== "all" || customDate) && (
                <button
                  type="button"
                  className="diary-reset-filters-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setMoodFilter(null);
                    setDateFilter("all");
                    setCustomDate("");
                  }}
                >
                  {language === "Bahasa Melayu"
                    ? "Set Semula Penapis"
                    : language === "中文"
                    ? "清除筛选"
                    : "Reset filters"}
                </button>
              )}
            </div>

            {/* Journal Entries List */}
            <div className="diary-cards-list">
              {filteredJournalEntries.map((entry) => {
                const entryDisplayDate = entry.dateKey || getLocalDateKey(entry.entryDate);
                const isTodayEntry = entryDisplayDate === todayKey;

                let formattedDateString = entryDisplayDate;
                try {
                  const d = new Date(entry.entryDate || `${entryDisplayDate}T12:00:00`);
                  if (!isNaN(d.getTime())) {
                    formattedDateString = d.toLocaleDateString(
                      language === "Bahasa Melayu"
                        ? "ms-MY"
                        : language === "中文"
                        ? "zh-CN"
                        : "en-MY",
                      {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      },
                    );
                  }
                } catch {}

                return (
                  <article key={entry.id} className="diary-entry-card">
                    {/* Header: Date + Mood Badge */}
                    <div className="diary-card-header">
                      <div className="diary-card-date-badge">
                        <span className="diary-card-date-icon">📅</span>
                        <strong>{formattedDateString}</strong>
                        {isTodayEntry && (
                          <span className="diary-today-tag">
                            {language === "Bahasa Melayu"
                              ? "Hari Ini"
                              : language === "中文"
                              ? "今日"
                              : "Today"}
                          </span>
                        )}
                      </div>

                      {entry.moodEmoji && entry.moodLabel && (
                        <div className="diary-card-mood-pill">
                          <span className="mood-pill-emoji">{entry.moodEmoji}</span>
                          <span className="mood-pill-text">{entry.moodLabel}</span>
                        </div>
                      )}
                    </div>

                    {/* Entry Title */}
                    <h3 className="diary-card-title">{entry.title}</h3>

                    {/* Attached Photo if present */}
                    {entry.photoUrl && (
                      <div
                        className="diary-card-photo-wrapper"
                        onClick={() => setPreviewPhotoUrl(entry.photoUrl || null)}
                        role="button"
                        tabIndex={0}
                        title={
                          language === "Bahasa Melayu"
                            ? "Ketik untuk besarkan foto"
                            : language === "中文"
                            ? "轻点放大查看照片"
                            : "Tap to view full photo"
                        }
                      >
                        <img
                          src={entry.photoUrl}
                          alt={entry.title}
                          className="diary-card-photo"
                          loading="lazy"
                        />
                        <span className="diary-photo-expand-hint">🔍</span>
                      </div>
                    )}

                    {/* Reflection Body Text */}
                    <div className="diary-card-text">
                      <p>{entry.content}</p>
                    </div>

                    {/* Tags */}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="diary-card-tags">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="diary-tag-pill"
                            onClick={() => setSearchQuery(tag)}
                            role="button"
                            tabIndex={0}
                            title={`Filter by #${tag}`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="diary-card-actions-bar">
                      <div className="diary-card-left-actions">
                        <button
                          type="button"
                          className="diary-action-btn edit"
                          onClick={() => openEditEntry(entry)}
                          aria-label="Edit journal entry"
                        >
                          <span>✏️</span>
                          <span>
                            {language === "Bahasa Melayu"
                              ? "Sunting"
                              : language === "中文"
                              ? "编辑"
                              : "Edit"}
                          </span>
                        </button>

                        <button
                          type="button"
                          className="diary-action-btn delete"
                          onClick={() => setEntryToDelete(entry)}
                          aria-label="Delete journal entry"
                        >
                          <span>🗑️</span>
                          <span>
                            {language === "Bahasa Melayu"
                              ? "Padam"
                              : language === "中文"
                              ? "删除"
                              : "Delete"}
                          </span>
                        </button>
                      </div>

                      {/* Bridge to AI Recall Memory */}
                      <button
                        type="button"
                        className="diary-action-btn share-ai"
                        onClick={() => handleShareHighlightToAiMemory(entry)}
                        title={
                          language === "Bahasa Melayu"
                            ? "Simpan sorotan catatan ini untuk diingati oleh ONY dalam sembang"
                            : language === "中文"
                            ? "让 ONY 的 AI 记住这篇日记中的重要感悟"
                            : "Share highlight with ONY's AI memory for chats"
                        }
                      >
                        <span>🤖</span>
                        <span>
                          {language === "Bahasa Melayu"
                            ? "Kongsi ke AI"
                            : language === "中文"
                            ? "记入 AI 关怀"
                            : "Save to AI Recall"}
                        </span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Empty State: No entries match filter */}
            {journalEntries.length > 0 && filteredJournalEntries.length === 0 && (
              <div className="diary-empty-state">
                <span className="diary-empty-emoji">🔍</span>
                <h3>
                  {language === "Bahasa Melayu"
                    ? "Tiada catatan diari yang sepadan"
                    : language === "中文"
                    ? "未找到匹配的日记"
                    : "No matching journal entries"}
                </h3>
                <p>
                  {language === "Bahasa Melayu"
                    ? "Cuba kosongkan carian atau ubah pemilihan tarikh dan mood anda."
                    : language === "中文"
                    ? "尝试调整搜索关键词、日期范围或心绪标签。"
                    : "Try adjusting your search terms or resetting the date and mood filters."}
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSearchQuery("");
                    setMoodFilter(null);
                    setDateFilter("all");
                    setCustomDate("");
                  }}
                >
                  {language === "Bahasa Melayu"
                    ? "Set Semula Penapis"
                    : language === "中文"
                    ? "重置筛选条件"
                    : "Reset filters"}
                </button>
              </div>
            )}

            {/* Empty State: Brand new journal */}
            {journalEntries.length === 0 && (
              <div className="diary-empty-state welcome">
                <span className="diary-empty-emoji">📔</span>
                <h3>
                  {language === "Bahasa Melayu"
                    ? "Selamat datang ke Diari Peribadi anda"
                    : language === "中文"
                    ? "欢迎开启您的个人私密手帐"
                    : "Welcome to your personal diary"}
                </h3>
                <p>
                  {language === "Bahasa Melayu"
                    ? "Ini adalah ruang selamat anda. Tulislah tentang detik kecil yang menggembirakan, beban yang ingin dilepaskan, atau gambar yang menyentuh jiwa."
                    : language === "中文"
                    ? "这里是专属于您的私密树洞。记录每一次微小的欣喜、释怀内心的困惑，或珍藏一张触动心弦的照片。"
                    : "This is your quiet, sacred corner. Write down small moments of gratitude, release heavy thoughts, or capture a soothing picture."}
                </p>
                <button
                  type="button"
                  className="btn btn-primary diary-first-entry-btn"
                  onClick={openNewEntry}
                >
                  ✍️{" "}
                  {language === "Bahasa Melayu"
                    ? "Tulis Catatan Pertama Anda"
                    : language === "中文"
                    ? "记录您的第一篇心绪手帐"
                    : "Write Your First Entry"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: AI RECALL MEMORIES (PRESERVED & CLEARLY DISTINGUISHED)  */}
        {/* ============================================================== */}
        {activeTab === "ai_memory" && (
          <div className="ai-memory-tab-content">
            {/* Clear Distinguishing Explanation Banner */}
            <div className="ai-memory-explainer-card">
              <div className="ai-memory-explainer-icon">🤖</div>
              <div className="ai-memory-explainer-copy">
                <h4>
                  {language === "Bahasa Melayu"
                    ? "Memori yang Diingati oleh AI ONY"
                    : language === "中文"
                    ? "ONY 聊天机器人的关怀记忆"
                    : "Memories ONY's AI Chatbot Recalls"}
                </h4>
                <p>
                  {language === "Bahasa Melayu"
                    ? "Fakta dan keutamaan ini diingati oleh teman AI ONY untuk memperibadikan perbualan sembang harian anda. Catatan diari peribadi anda di tab sebelah TIDAK dibaca oleh AI melainkan anda memilih untuk berkongsi."
                    : language === "中文"
                    ? "这些是经过您明确同意后由 ONY 记住的关键信息（如考试周期、喜好的回答风格、放松习惯），以便在日常对话中给予您懂您的关怀。您的私密日记绝不会被 AI 自动读取。"
                    : "These consented facts and preferences help ONY's AI chatbot personalize your conversations (like upcoming exams, preferences, and hobbies). Your private diary entries remain strictly confidential and are NOT read by the AI."}
                </p>
              </div>
            </div>

            {/* Add Memory Button */}
            <button
              type="button"
              className="btn btn-primary full"
              style={{ marginBottom: "14px" }}
              onClick={() => {
                setEditingAiMemory(null);
                setNewAiMemoryText("");
                setNewAiMemoryCategory("About Me");
                setIsAddingAiMemory(true);
              }}
            >
              +{" "}
              {language === "Bahasa Melayu"
                ? "Tambah Memori untuk AI"
                : language === "中文"
                ? "添加 AI 关怀记忆"
                : "Add Memory for AI"}
            </button>

            {/* Search and Category Filters */}
            <div className="search">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                value={aiMemoryQuery}
                onChange={(e) => setAiMemoryQuery(e.target.value)}
                placeholder={
                  language === "Bahasa Melayu"
                    ? "Cari memori AI..."
                    : language === "中文"
                    ? "搜索 AI 记忆..."
                    : "Search AI memories..."
                }
              />
              {aiMemoryQuery && (
                <button
                  type="button"
                  className="diary-search-clear-btn"
                  onClick={() => setAiMemoryQuery("")}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="scroll-chips" style={{ marginBottom: "14px" }}>
              {AI_MEMORY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`btn ${aiMemoryCategory === cat ? "btn-primary" : "btn-secondary"}`}
                  style={{ minHeight: "34px", padding: "4px 12px", fontSize: "11px", borderRadius: "100px" }}
                  onClick={() => setAiMemoryCategory(cat)}
                >
                  {getCategoryLabel(cat, language)}
                </button>
              ))}
            </div>

            {/* AI Memories Count & Clear All */}
            <div className="section-head" style={{ marginTop: "4px" }}>
              <h3>
                {language === "Bahasa Melayu"
                  ? "Konteks Diingati"
                  : language === "中文"
                  ? "已授权记忆条目"
                  : "Remembered Context"}{" "}
                <small className="muted">({filteredAiMemories.length})</small>
              </h3>
              {memories.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowClearConfirm(true)}
                  style={{ fontSize: "11px" }}
                >
                  {language === "Bahasa Melayu"
                    ? "Kosongkan Semua"
                    : language === "中文"
                    ? "清空全部"
                    : "Clear All"}
                </button>
              )}
            </div>

            {/* AI Memories Cards */}
            <div className="ai-memories-list">
              {filteredAiMemories.map((item) => (
                <div
                  className={`memory-card ${!item.active ? "paused" : ""}`}
                  key={item.id}
                >
                  <div className="memory-top">
                    <span className="memory-icon">
                      <span style={{ fontSize: "15px" }}>🤖</span>
                    </span>
                    <button
                      type="button"
                      className={`toggle ${item.active ? "on" : ""}`}
                      onClick={() => updateAiMemory(item.id, { active: !item.active })}
                      aria-label={item.active ? "Pause memory" : "Resume memory"}
                    >
                      <span />
                    </button>
                  </div>

                  {item.category && (
                    <span className="memory-category">
                      {getCategoryLabel(item.category, language)}
                    </span>
                  )}

                  <strong>{item.text}</strong>

                  <details>
                    <summary>
                      {language === "Bahasa Melayu"
                        ? "Mengapa ONY mengingatinya"
                        : language === "中文"
                        ? "为什么 ONY 记住了这条"
                        : "Why ONY remembers this"}
                    </summary>
                    <p>{item.reason}</p>
                  </details>

                  <div className="memory-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setEditingAiMemory(item);
                        setNewAiMemoryText(item.text);
                        setNewAiMemoryCategory(item.category || "About Me");
                        setIsAddingAiMemory(true);
                      }}
                    >
                      ✏️ {language === "Bahasa Melayu" ? "Sunting" : language === "中文" ? "编辑" : "Edit"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => deleteSingleAiMemory(item)}
                    >
                      🗑️ {language === "Bahasa Melayu" ? "Padam" : language === "中文" ? "删除" : "Delete"}
                    </button>
                  </div>
                </div>
              ))}

              {!memories.length && (
                <div className="empty">
                  <span style={{ fontSize: "36px" }}>🌱</span>
                  <h3>
                    {language === "Bahasa Melayu"
                      ? "Tiada memori AI disimpan"
                      : language === "中文"
                      ? "暂无已授权 AI 记忆"
                      : "No AI memories stored"}
                  </h3>
                  <p>
                    {language === "Bahasa Melayu"
                      ? "Konteks atau keutamaan yang anda benarkan akan dipaparkan di sini."
                      : language === "中文"
                      ? "在与 ONY 的聊天中征得您同意的细节将妥善保存在此。"
                      : "Context or preferences you consent for ONY to remember will appear here."}
                  </p>
                </div>
              )}
            </div>

            {/* Privacy Controls for AI Memory */}
            <div className="vault-privacy-box">
              <div className="vault-privacy-header">
                <div className="vault-privacy-header-left">
                  <span>🛡️</span>
                  <strong>
                    {language === "Bahasa Melayu"
                      ? "Kawalan Privasi Memori AI"
                      : language === "中文"
                      ? "AI 记忆隐私与控制"
                      : "AI Memory Privacy Controls"}
                  </strong>
                </div>
              </div>

              {/* Control 1: Ask Before Saving */}
              <div className="vault-privacy-item">
                <div className="vault-privacy-item-text">
                  <strong>
                    {language === "Bahasa Melayu"
                      ? "Tanya Sebelum Menyimpan"
                      : language === "中文"
                      ? "保存前始终询问"
                      : "Ask Before Saving"}
                    <span className="vault-privacy-item-badge">
                      {isAskBeforeSaving ? "ON" : "OFF"}
                    </span>
                  </strong>
                  <p>
                    {language === "Bahasa Melayu"
                      ? "Minta pengesahan manual anda sebelum ONY menyimpan sebarang butiran baharu."
                      : language === "中文"
                      ? "在将聊天中的信息存入记忆库前，必须先征得您的确认。"
                      : "Require explicit manual confirmation before ONY saves any new detail."}
                  </p>
                </div>
                <button
                  type="button"
                  className={`toggle ${isAskBeforeSaving ? "on" : ""}`}
                  onClick={() => handleToggleAskBeforeSaving(!isAskBeforeSaving)}
                >
                  <span />
                </button>
              </div>

              {/* Control 2: Master Switch for Active Memories in Chat */}
              <div className="vault-privacy-item">
                <div className="vault-privacy-item-text">
                  <strong>
                    {language === "Bahasa Melayu"
                      ? "Gunakan Memori dalam Sembang"
                      : language === "中文"
                      ? "在对话中启用个性化记忆"
                      : "Use Memories in Conversations"}
                    <span className="vault-privacy-item-badge">
                      {useActiveMemories ? "ACTIVE" : "PAUSED"}
                    </span>
                  </strong>
                  <p>
                    {useActiveMemories
                      ? language === "Bahasa Melayu"
                        ? `Membenarkan ${activeAiMemoriesCount} memori aktif memperibadikan sembang anda.`
                        : language === "中文"
                        ? `允许 ${activeAiMemoriesCount} 条激活记忆为日常陪伴提供连贯关怀。`
                        : `Allows ${activeAiMemoriesCount} active memories to personalize your companion chats.`
                      : language === "Bahasa Melayu"
                      ? "Mod sementara aktif: ONY tidak merujuk sebarang memori lampau."
                      : language === "中文"
                      ? "纯净即时模式：已停用所有往期记忆参考。"
                      : "Ephemeral mode active: ONY will not reference any past memories."}
                  </p>
                </div>
                <button
                  type="button"
                  className={`toggle ${useActiveMemories ? "on" : ""}`}
                  onClick={() => handleToggleUseActiveMemories(!useActiveMemories)}
                >
                  <span />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="vault-privacy-actions-grid" style={{ marginTop: "14px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleTogglePauseAll}
                  disabled={memories.length === 0}
                >
                  {allAiMemoriesPaused ? "▶️ Resume All" : "⏸️ Pause All"}
                </button>

                {onNavigateToPrivacy && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={onNavigateToPrivacy}
                  >
                    🛡️ Full Privacy Settings
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* COMFORTABLE WRITING INTERFACE MODAL / OVERLAY                  */}
      {/* ============================================================== */}
      {isWriting && (
        <div className="diary-modal-backdrop" onClick={(e) => {
          if (e.target === e.currentTarget) closeWriter();
        }}>
          <div className="diary-writer-sheet" role="dialog" aria-modal="true">
            {/* Sheet Handle */}
            <div className="diary-sheet-handle" />

            {/* Writer Header */}
            <div className="diary-writer-header">
              <div className="diary-writer-title-group">
                <span className="diary-writer-icon">✍️</span>
                <div>
                  <h3>
                    {editingEntry
                      ? language === "Bahasa Melayu"
                        ? "Sunting Catatan Diari"
                        : language === "中文"
                        ? "编辑日记"
                        : "Edit Journal Entry"
                      : language === "Bahasa Melayu"
                      ? "Tulis Catatan Diari"
                      : language === "中文"
                      ? "书写心绪日记"
                      : "Write a Journal Entry"}
                  </h3>
                  <p>
                    {language === "Bahasa Melayu"
                      ? "Ruang peribadi untuk meluahkan dan merenung"
                      : language === "中文"
                      ? "私密放慢心绪的专属港湾"
                      : "Your comfortable space to pause, feel, and reflect"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="diary-sheet-close-btn"
                onClick={closeWriter}
                aria-label="Close writer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Writer Body */}
            <div className="diary-writer-scrollable-body">
              {/* Date & Time Picker */}
              <div className="diary-writer-form-group">
                <label className="diary-writer-label">
                  📅{" "}
                  {language === "Bahasa Melayu"
                    ? "Tarikh Catatan"
                    : language === "中文"
                    ? "日记日期"
                    : "Entry Date"}
                </label>
                <input
                  type="date"
                  className="diary-writer-input date-input"
                  value={entryDateKey}
                  onChange={(e) => setEntryDateKey(e.target.value)}
                />
              </div>

              {/* Title Input */}
              <div className="diary-writer-form-group">
                <label className="diary-writer-label">
                  🏷️{" "}
                  {language === "Bahasa Melayu"
                    ? "Tajuk Catatan"
                    : language === "中文"
                    ? "日记标题"
                    : "Entry Title"}
                </label>
                <input
                  type="text"
                  className="diary-writer-input title-input"
                  value={entryTitle}
                  onChange={(e) => setEntryTitle(e.target.value)}
                  placeholder={
                    language === "Bahasa Melayu"
                      ? "Cth: Petang yang tenang di Tasik, Detik kecil membahagiakan..."
                      : language === "中文"
                      ? "例如：午后微雨的散步、今天的一点点小成就..."
                      : "e.g., A quiet afternoon walk, Small wins today..."
                  }
                  maxLength={120}
                />
              </div>

              {/* Mood Selector (Optional Tag) */}
              <div className="diary-writer-form-group">
                <div className="diary-writer-label-with-hint">
                  <label className="diary-writer-label">
                    ✨{" "}
                    {language === "Bahasa Melayu"
                      ? "Pilih Mood Anda Hari Ini"
                      : language === "中文"
                      ? "当下的心绪标签"
                      : "Optional Mood Tag"}
                  </label>
                  {entryMood && (
                    <button
                      type="button"
                      className="diary-clear-mood-btn"
                      onClick={() => setEntryMood(null)}
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>
                <div className="diary-writer-mood-grid">
                  {DIARY_MOOD_OPTIONS.map((opt) => {
                    const isSelected = entryMood?.label === opt.label;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        className={`diary-writer-mood-pill ${isSelected ? "selected" : ""}`}
                        onClick={() =>
                          setEntryMood(isSelected ? null : { emoji: opt.emoji, label: opt.label })
                        }
                      >
                        <span className="mood-pill-emoji">{opt.emoji}</span>
                        <span className="mood-pill-title">
                          {language === "Bahasa Melayu"
                            ? opt.labelBm
                            : language === "中文"
                            ? opt.labelZh
                            : opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comfortable Journal Text Area */}
              <div className="diary-writer-form-group">
                <label className="diary-writer-label">
                  📖{" "}
                  {language === "Bahasa Melayu"
                    ? "Refleksi & Luahan Rasa"
                    : language === "中文"
                    ? "畅所欲言的心绪正文"
                    : "Your Reflections & Thoughts"}
                </label>
                <textarea
                  className="diary-writer-textarea"
                  rows={6}
                  value={entryContent}
                  onChange={(e) => setEntryContent(e.target.value)}
                  placeholder={
                    language === "Bahasa Melayu"
                      ? "Apa yang anda rasa dan alami hari ini? Luahkan dengan bebas tanpa rasa dihakimi—ini adalah ruang aman anda..."
                      : language === "中文"
                      ? "今天发生了什么？心头流淌着怎样的感受？无需字斟句句，在这里全然安放真实的自己..."
                      : "What made you pause or feel something today? Write freely—this space is entirely yours without judgment..."
                  }
                />
              </div>

              {/* Photo Attachment Section */}
              <div className="diary-writer-form-group">
                <label className="diary-writer-label">
                  📷{" "}
                  {language === "Bahasa Melayu"
                    ? "Lampirkan Foto Kenangan (Pilihan)"
                    : language === "中文"
                    ? "添加一张温存照片（可选）"
                    : "Attach Photo (Optional)"}
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageFileChange}
                />

                {entryPhotoUrl ? (
                  <div className="diary-attached-photo-preview">
                    <img src={entryPhotoUrl} alt="Attached preview" />
                    <div className="diary-photo-overlay-actions">
                      <button
                        type="button"
                        className="diary-photo-btn replace"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        🔄{" "}
                        {language === "Bahasa Melayu"
                          ? "Tukar Foto"
                          : language === "中文"
                          ? "更换"
                          : "Change"}
                      </button>
                      <button
                        type="button"
                        className="diary-photo-btn remove"
                        onClick={() => setEntryPhotoUrl("")}
                      >
                        🗑️{" "}
                        {language === "Bahasa Melayu"
                          ? "Buang"
                          : language === "中文"
                          ? "移除"
                          : "Remove"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="diary-photo-picker-box">
                    <button
                      type="button"
                      className="diary-upload-trigger-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span className="upload-icon">📸</span>
                      <strong>
                        {language === "Bahasa Melayu"
                          ? "Muat Naik dari Peranti"
                          : language === "中文"
                          ? "从手机/设备上传照片"
                          : "Upload photo from device"}
                      </strong>
                      <small>
                        {language === "Bahasa Melayu"
                          ? "Pilih gambar dari galeri atau ambil gambar baharu"
                          : language === "中文"
                          ? "选择相册照片或拍摄，最大 4MB"
                          : "Pick from camera roll or take a snapshot (max 4MB)"}
                      </small>
                    </button>

                    {/* Quick Soothing Presets */}
                    <div className="diary-soothing-presets-wrap">
                      <span className="diary-presets-label">
                        {language === "Bahasa Melayu"
                          ? "Atau pilih gambar latar menenangkan:"
                          : language === "中文"
                          ? "或选择一张治愈意境照片："
                          : "Or choose a calming aesthetic preset:"}
                      </span>
                      <div className="diary-presets-grid">
                        {SOOTHING_PHOTO_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            className="diary-preset-card-btn"
                            onClick={() => setEntryPhotoUrl(preset.url)}
                          >
                            <img src={preset.url} alt={preset.name} loading="lazy" />
                            <span>
                              {language === "Bahasa Melayu"
                                ? preset.nameBm
                                : language === "中文"
                                ? preset.nameZh
                                : preset.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags Section */}
              <div className="diary-writer-form-group">
                <label className="diary-writer-label">
                  🏷️{" "}
                  {language === "Bahasa Melayu"
                    ? "Tag Refleksi"
                    : language === "中文"
                    ? "反思分类标签"
                    : "Reflection Tags"}
                </label>
                <div className="diary-common-tags-pills">
                  {COMMON_TAGS.map((tag) => {
                    const isSelected = entryTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        className={`diary-tag-toggle-pill ${isSelected ? "selected" : ""}`}
                        onClick={() => handleToggleTag(tag)}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>

                <div className="diary-custom-tag-row">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    placeholder={
                      language === "Bahasa Melayu"
                        ? "Tambah tag tersuai..."
                        : language === "中文"
                        ? "输入自定义标签..."
                        : "Add custom tag..."
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: "36px", padding: "4px 12px" }}
                    onClick={handleAddCustomTag}
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Privacy Notice inside Writer */}
              <div className="diary-writer-privacy-callout">
                <span>🔒</span>
                <div>
                  <strong>
                    {language === "Bahasa Melayu"
                      ? "100% Sulit & Terselindung"
                      : language === "中文"
                      ? "100% 绝对私密保密"
                      : "100% Private & Confidential"}
                  </strong>
                  <p>
                    {language === "Bahasa Melayu"
                      ? "Catatan ini disimpan ke diari peribadi anda. AI tidak akan membacanya melainkan anda mengaktifkan pilihan kongsi di bawah."
                      : language === "中文"
                      ? "本条目完全保存在您的个人手帐中，AI 绝不主动读取，除非您在下方选择分享重点。"
                      : "This entry is completely confidential. ONY's conversational AI does not read this entry unless you choose to share a highlight below."}
                  </p>
                </div>
              </div>

              {/* Optional Bridge to AI Recall Memory */}
              <label className="diary-share-ai-checkbox-wrap">
                <input
                  type="checkbox"
                  checked={shareToAiOnSave}
                  onChange={(e) => setShareToAiOnSave(e.target.checked)}
                />
                <div className="diary-share-ai-checkbox-text">
                  <strong>
                    {language === "Bahasa Melayu"
                      ? "Kongsi sorotan tajuk ke Memori AI ONY"
                      : language === "中文"
                      ? "将本篇标题作为要点存入 ONY 的 AI 关怀记忆"
                      : "Also save this title as context in ONY's AI Recall Memory"}
                  </strong>
                  <small>
                    {language === "Bahasa Melayu"
                      ? "Membantu teman AI mengingati peristiwa ini semasa perbualan sembang masa depan."
                      : language === "中文"
                      ? "允许 ONY 在后续聊天关怀中自然记起这一事件。"
                      : "Helps your companion gently remember this milestone in future chats."}
                  </small>
                </div>
              </label>
            </div>

            {/* Writer Footer Actions */}
            <div className="diary-writer-footer-bar">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeWriter}
              >
                {language === "Bahasa Melayu"
                  ? "Batal"
                  : language === "中文"
                  ? "取消"
                  : "Cancel"}
              </button>
              <button
                type="button"
                className="btn btn-primary diary-save-submit-btn"
                onClick={handleSaveEntry}
              >
                💾{" "}
                {language === "Bahasa Melayu"
                  ? "Simpan Catatan Diari"
                  : language === "中文"
                  ? "保存日记入册"
                  : "Save Journal Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DELETE CONFIRMATION MODAL                                      */}
      {/* ============================================================== */}
      {entryToDelete && (
        <div className="diary-modal-backdrop" onClick={() => setEntryToDelete(null)}>
          <div className="diary-confirm-modal-box">
            <span className="diary-confirm-icon">🗑️</span>
            <h4>
              {language === "Bahasa Melayu"
                ? "Padam Catatan Diari Ini?"
                : language === "中文"
                ? "确定删除这篇日记？"
                : "Delete this Journal Entry?"}
            </h4>
            <p>
              {language === "Bahasa Melayu"
                ? `Adakah anda pasti ingin memadamkan "${entryToDelete.title}"? Tindakan ini tidak boleh dibatalkan.`
                : language === "中文"
                ? `您确定要彻底删除《${entryToDelete.title}》吗？删除后将无法恢复。`
                : `Are you sure you want to permanently delete "${entryToDelete.title}"? This reflection cannot be recovered.`}
            </p>
            <div className="diary-confirm-btn-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEntryToDelete(null)}
                disabled={isDeleting}
              >
                {language === "Bahasa Melayu" ? "Batal" : language === "中文" ? "取消" : "Cancel"}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting
                  ? "Deleting..."
                  : language === "Bahasa Melayu"
                  ? "Padam Sekarang"
                  : language === "中文"
                  ? "确认删除"
                  : "Delete Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PHOTO PREVIEW MODAL                                            */}
      {/* ============================================================== */}
      {previewPhotoUrl && (
        <div
          className="diary-modal-backdrop photo-zoom"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="diary-photo-zoom-container">
            <button
              type="button"
              className="diary-photo-zoom-close"
              onClick={() => setPreviewPhotoUrl(null)}
              aria-label="Close photo preview"
            >
              ✕
            </button>
            <img src={previewPhotoUrl} alt="Enlarged reflection" />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ADD / EDIT AI MEMORY MODAL                                     */}
      {/* ============================================================== */}
      {isAddingAiMemory && (
        <div className="diary-modal-backdrop" onClick={() => setIsAddingAiMemory(false)}>
          <div
            className="diary-confirm-modal-box ai-memory-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h4>
              {editingAiMemory
                ? language === "Bahasa Melayu"
                  ? "Sunting Memori AI"
                  : language === "中文"
                  ? "编辑 AI 记忆"
                  : "Edit AI Memory"
                : language === "Bahasa Melayu"
                ? "Tambah Memori Baharu untuk AI"
                : language === "中文"
                ? "为 ONY 添加新记忆"
                : "Add Memory for ONY's AI"}
            </h4>
            <p className="muted">
              {language === "Bahasa Melayu"
                ? "Konteks ini akan membantu ONY mengingati fakta atau pilihan penting anda dalam sembang."
                : language === "中文"
                ? "此条信息将授权供 ONY 在后续陪伴对话中自然呼应与理解您。"
                : "This context helps ONY recall your preferences and life events during chats."}
            </p>

            <div style={{ marginTop: "12px", textAlign: "left" }}>
              <label className="field-label" style={{ margin: "6px 0 4px" }}>
                {language === "Bahasa Melayu"
                  ? "Apa yang perlu diingati:"
                  : language === "中文"
                  ? "希望 ONY 记住的内容："
                  : "What ONY should remember:"}
              </label>
              <textarea
                rows={3}
                className="diary-writer-textarea"
                value={newAiMemoryText}
                onChange={(e) => setNewAiMemoryText(e.target.value)}
                placeholder="e.g., I have exams coming up, I enjoy listening to music when stressed..."
              />

              <label className="field-label" style={{ margin: "10px 0 4px" }}>
                {language === "Bahasa Melayu"
                  ? "Kategori:"
                  : language === "中文"
                  ? "分类："
                  : "Category:"}
              </label>
              <div className="chips" style={{ margin: "6px 0 16px" }}>
                {AI_MEMORY_CATEGORIES.filter((c) => c !== "All").map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`btn ${newAiMemoryCategory === cat ? "btn-primary" : "btn-secondary"}`}
                    style={{ minHeight: "30px", padding: "2px 10px", fontSize: "11px", borderRadius: "100px" }}
                    onClick={() => setNewAiMemoryCategory(cat)}
                  >
                    {getCategoryLabel(cat, language)}
                  </button>
                ))}
              </div>
            </div>

            <div className="diary-confirm-btn-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsAddingAiMemory(false);
                  setEditingAiMemory(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveAiMemory}
                disabled={!newAiMemoryText.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All AI Memories Confirmation Modal */}
      {showClearConfirm && (
        <div className="diary-modal-backdrop" onClick={() => setShowClearConfirm(false)}>
          <div className="diary-confirm-modal-box">
            <h4>Clear Entire AI Memory Vault?</h4>
            <p className="muted">
              This will remove all consented memories stored for ONY's AI assistant. Your private diary entries will not be affected.
            </p>
            <div className="diary-confirm-btn-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmClearAllAiMemories}
              >
                Clear All Memories
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DigitalJournal;
