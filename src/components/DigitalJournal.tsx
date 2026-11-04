import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  type ChangeEvent,
} from "react";
import type { User } from "firebase/auth";
import {
  type FirestoreJournalEntry,
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
  syncUserBookshelfData,
  loadUserBookshelfData,
} from "../firebase/firestore";
import { useLanguage } from "../i18n/LanguageContext";
import { getCategoryLabel } from "../i18n/translations";
import {
  type JournalShelf,
  type JournalBook,
  type BookSortOption,
  BOOK_COLOR_PALETTE,
  DEFAULT_SHELVES,
  DEFAULT_BOOKS,
  loadSavedShelves,
  saveShelves,
  loadSavedBooks,
  saveBooks,
  ensureEntriesLinkedToBooks,
  formatPageFooterTimestamp,
  sortBooks,
} from "../services/bookshelfService";
import {
  JournalIcon,
  getMoodIconName,
  getCategoryIconName,
  type JournalIconName,
} from "./JournalIcon";
import {
  getAccessibleTextColor,
  getDerivedRibbonColor,
  getDerivedAccentColor,
  isColorSaturatedOrDark,
  getSpineDepthStyles,
  getSpineFontSize,
  hexToRgb,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  hsvToHex,
  normalizeHex,
} from "../utils/bookColorUtils";

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
  onOpenBookChange?: (isOpen: boolean) => void;
  onSheetOpenChange?: (isOpen: boolean) => void;
}

interface DiaryMoodOption {
  key: string;
  label: string;
  labelBm: string;
  labelZh: string;
  icon: JournalIconName;
}

const DIARY_MOOD_OPTIONS: DiaryMoodOption[] = [
  { key: "Reflective", label: "Reflective", labelBm: "Merenung", labelZh: "沉思", icon: "moon" },
  { key: "Peaceful", label: "Peaceful", labelBm: "Damai", labelZh: "平静", icon: "leaf" },
  { key: "Grateful", label: "Grateful", labelBm: "Bersyukur", labelZh: "感恩", icon: "sun" },
  { key: "Cozy", label: "Cozy", labelBm: "Selesa", labelZh: "惬意", icon: "cozy" },
  { key: "Hopeful", label: "Hopeful", labelBm: "Penuh Harapan", labelZh: "充满希望", icon: "hopeful" },
  { key: "Grounded", label: "Grounded", labelBm: "Tenang", labelZh: "踏实", icon: "grounded" },
  { key: "Tender / Sad", label: "Tender / Sad", labelBm: "Sayu / Sedih", labelZh: "脆弱低落", icon: "cloudRain" },
  { key: "Overwhelmed", label: "Overwhelmed", labelBm: "Terbeban", labelZh: "疲惫压抑", icon: "waves" },
  { key: "Thoughtful", label: "Thoughtful", labelBm: "Banyak Fikir", labelZh: "若有所思", icon: "feather" },
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
  notify,
  memoryConsent,
  setMemoryConsent,
  useActiveMemories,
  setUseActiveMemories,
  currentUser,
  onNavigateToPrivacy,
  onOpenBookChange,
  onSheetOpenChange,
}: DigitalJournalProps) {
  const { language } = useLanguage();

  // Top Section Switcher: Personal Diary vs AI Recall Memories
  const [activeTab, setActiveTab] = useState<"diary" | "ai_memory">("diary");

  // Bookshelf Data State
  const [shelves, setShelves] = useState<JournalShelf[]>(() => loadSavedShelves());
  const [books, setBooks] = useState<JournalBook[]>(() => loadSavedBooks());
  const [bookSort, setBookSort] = useState<BookSortOption>("last_edited");

  // Search & Filter State (Fix 3: Minimal Filtering)
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [customDateStart, setCustomDateStart] = useState<string | null>(null);
  const [customDateEnd, setCustomDateEnd] = useState<string | null>(null);
  const [moodFilters, setMoodFilters] = useState<string[]>([]);

  // Filter Bottom Sheet State (Fix 3)
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [draftDateFilter, setDraftDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [draftCustomDateStart, setDraftCustomDateStart] = useState<string | null>(null);
  const [draftCustomDateEnd, setDraftCustomDateEnd] = useState<string | null>(null);
  const [draftMoodFilters, setDraftMoodFilters] = useState<string[]>([]);

  // Custom Calendar Bottom Sheet State
  const [showCalendarSheet, setShowCalendarSheet] = useState(false);
  const [calendarViewYear, setCalendarViewYear] = useState(() => new Date().getFullYear());
  const [calendarViewMonth, setCalendarViewMonth] = useState(() => new Date().getMonth());
  const [calendarDraftStart, setCalendarDraftStart] = useState<string | null>(null);
  const [calendarDraftEnd, setCalendarDraftEnd] = useState<string | null>(null);

  // Bookshelf Animation State
  const [slidingSpineId, setSlidingSpineId] = useState<string | null>(null);

  // Open Book Fullscreen View State (Fix 2)
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [isOpeningCover, setIsOpeningCover] = useState(false);
  const [pageStyle, setPageStyle] = useState<"lined" | "dotted" | "plain">("lined");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showPageTextureSheet, setShowPageTextureSheet] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [pageTurnDirection, setPageTurnDirection] = useState<"none" | "turning-next" | "turning-prev">("none");
  const [showPageIndexDrawer, setShowPageIndexDrawer] = useState(false);

  // Rename Book Modal State (from "..." menu)
  const [showRenameBookModal, setShowRenameBookModal] = useState(false);
  const [renameBookTitleInput, setRenameBookTitleInput] = useState("");

  // Change Cover Color Bottom Sheet State (Fix 4 from "..." menu)
  const [showChangeCoverSheet, setShowChangeCoverSheet] = useState(false);
  const [changeCoverColorInput, setChangeCoverColorInput] = useState("#94D2BD");
  const [showCustomPickerCover, setShowCustomPickerCover] = useState(false);

  // Custom Color Picker State (Fix 4: 2D area, hue slider, recent colors, hex)
  const [showCustomPickerCreate, setShowCustomPickerCreate] = useState(false);
  const [pickerHue, setPickerHue] = useState(180);
  const [pickerSat, setPickerSat] = useState(0.42);
  const [pickerVal, setPickerVal] = useState(0.82);
  const [pickerHexInput, setPickerHexInput] = useState("94D2BD");
  const [recentCustomColors, setRecentCustomColors] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("ony_recent_colors");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 5);
      }
    } catch {}
    return ["#8EA8C3", "#A8DADC", "#E9C46A", "#F4A261", "#E76F51"];
  });

  // Notify parent of open book state to hide bottom nav when reading/writing a book
  useEffect(() => {
    onOpenBookChange?.(Boolean(activeBookId));
  }, [activeBookId, onOpenBookChange]);

  // Auto-Save State for Current Open Page
  const [pageSaveStatus, setPageSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals & Bottom Sheets State
  const [showBookInfoModal, setShowBookInfoModal] = useState(false);
  const [selectedBookForInfo, setSelectedBookForInfo] = useState<JournalBook | null>(null);

  const [showCreateBookSheet, setShowCreateBookSheet] = useState(false);
  const [editingBook, setEditingBook] = useState<JournalBook | null>(null);
  const [bookTitleInput, setBookTitleInput] = useState("");
  const [bookDescInput, setBookDescInput] = useState("");
  const [bookColorInput, setBookColorInput] = useState(BOOK_COLOR_PALETTE[0].hex);
  const [bookShelfIdInput, setBookShelfIdInput] = useState(DEFAULT_SHELVES[0].id);
  const [createBookTitleError, setCreateBookTitleError] = useState(false);
  const bookTitleInputRef = useRef<HTMLInputElement>(null);

  const [showShelfModal, setShowShelfModal] = useState(false);
  const [editingShelf, setEditingShelf] = useState<JournalShelf | null>(null);
  const [shelfNameInput, setShelfNameInput] = useState("");

  const [showChooseBookModal, setShowChooseBookModal] = useState(false);
  const [shelfToDelete, setShelfToDelete] = useState<JournalShelf | null>(null);
  const [bookToDelete, setBookToDelete] = useState<JournalBook | null>(null);
  const [pageToDelete, setPageToDelete] = useState<FirestoreJournalEntry | null>(null);

  // Photo Fullscreen Enlarged
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const pageFileInputRef = useRef<HTMLInputElement>(null);
  const pageTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Touch Swipe coordinates for page turning
  const touchStartXRef = useRef<number | null>(null);

  // AI Memory Controls State
  const [aiMemoryCategory, setAiMemoryCategory] = useState("All");
  const [aiMemoryQuery, setAiMemoryQuery] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isAddingAiMemory, setIsAddingAiMemory] = useState(false);
  const [editingAiMemory, setEditingAiMemory] = useState<MemoryItem | null>(null);
  const [newAiMemoryText, setNewAiMemoryText] = useState("");
  const [newAiMemoryCategory, setNewAiMemoryCategory] = useState("About Me");

  // Track if ANY modal or bottom sheet is open, and inform parent App.tsx to hide bottom navigation
  const isAnySheetOpen = Boolean(
    showCreateBookSheet ||
      showCalendarSheet ||
      showFilterSheet ||
      showPageTextureSheet ||
      showChangeCoverSheet ||
      showRenameBookModal ||
      showPageIndexDrawer ||
      showBookInfoModal ||
      showShelfModal ||
      showChooseBookModal ||
      isAddingAiMemory ||
      showClearConfirm ||
      shelfToDelete ||
      bookToDelete ||
      pageToDelete ||
      previewPhotoUrl
  );

  useEffect(() => {
    onSheetOpenChange?.(isAnySheetOpen);
  }, [isAnySheetOpen, onSheetOpenChange]);

  // Helper date
  const todayKey = useMemo(() => getLocalDateKey(), []);

  // Sync existing journal entries so they are linked to a default book
  useEffect(() => {
    if (journalEntries.length > 0 && books.length > 0) {
      const { updatedEntries, didChange } = ensureEntriesLinkedToBooks(journalEntries, books);
      if (didChange) {
        setJournalEntries(updatedEntries);
        saveCachedJournalEntries(updatedEntries);
      }
    }
  }, [journalEntries, books, setJournalEntries]);

  // Cloud sync: Load saved shelves and books from user document if present
  useEffect(() => {
    if (!currentUser) return;
    loadUserBookshelfData(currentUser.uid)
      .then((remoteData) => {
        if (remoteData) {
          if (Array.isArray(remoteData.shelves) && remoteData.shelves.length > 0) {
            setShelves(remoteData.shelves);
            saveShelves(remoteData.shelves);
          }
          if (Array.isArray(remoteData.books) && remoteData.books.length > 0) {
            setBooks(remoteData.books);
            saveBooks(remoteData.books);
          }
        }
      })
      .catch(() => {});
  }, [currentUser]);

  // Persist shelves and books
  const updateShelvesState = (newShelves: JournalShelf[]) => {
    setShelves(newShelves);
    saveShelves(newShelves);
    if (currentUser) {
      syncUserBookshelfData(currentUser.uid, newShelves, books).catch(() => {});
    }
  };

  const updateBooksState = (newBooks: JournalBook[]) => {
    setBooks(newBooks);
    saveBooks(newBooks);
    if (currentUser) {
      syncUserBookshelfData(currentUser.uid, shelves, newBooks).catch(() => {});
    }
  };

  // Compute active book and its pages
  const activeBook = useMemo(() => {
    return books.find((b) => b.id === activeBookId) || null;
  }, [books, activeBookId]);

  const activeBookPages = useMemo(() => {
    if (!activeBookId) return [];
    return journalEntries
      .filter((e) => (e as any).bookId === activeBookId)
      .sort((a, b) => new Date(a.entryDate || a.createdAt).getTime() - new Date(b.entryDate || b.createdAt).getTime());
  }, [journalEntries, activeBookId]);

  const currentPage = useMemo(() => {
    if (activeBookPages.length === 0) return null;
    const safeIdx = Math.max(0, Math.min(currentPageIndex, activeBookPages.length - 1));
    return activeBookPages[safeIdx] || null;
  }, [activeBookPages, currentPageIndex]);

  // Total pages and books count for header subtitle
  const totalBooksCount = books.length;
  const totalPagesCount = journalEntries.length;

  // Set of dates that have at least one journal page (for calendar dots)
  const daysWithPages = useMemo(() => {
    const set = new Set<string>();
    journalEntries.forEach((entry) => {
      const d = entry.dateKey || entry.entryDate?.slice(0, 10) || entry.createdAt?.slice(0, 10);
      if (d) set.add(d);
    });
    return set;
  }, [journalEntries]);

  // Sync page texture from book preferences when opening a book (Fix 2)
  useEffect(() => {
    if (activeBook) {
      if (activeBook.pageTexture === "dots") setPageStyle("dotted");
      else if (activeBook.pageTexture === "blank") setPageStyle("plain");
      else setPageStyle("lined");
    }
  }, [activeBookId, activeBook?.pageTexture]);

  // Filter journal pages based on active controls (Search, Date, Multi-select Moods)
  const isFilterActive = Boolean(
    searchQuery.trim() ||
      moodFilters.length > 0 ||
      dateFilter !== "all" ||
      customDateStart
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (dateFilter !== "all") count += 1;
    count += moodFilters.length;
    return count;
  }, [dateFilter, moodFilters]);

  const isPageMatchingFilter = useCallback(
    (page: FirestoreJournalEntry): boolean => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = (page.title || "").toLowerCase().includes(q);
        const matchesContent = (page.content || "").toLowerCase().includes(q);
        const matchesMood = (page.moodLabel || "").toLowerCase().includes(q);
        const matchesTag = page.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesMood && !matchesTag) {
          return false;
        }
      }

      if (moodFilters.length > 0) {
        if (!page.moodLabel || !moodFilters.includes(page.moodLabel)) {
          return false;
        }
      }

      const pageDate = page.dateKey || page.entryDate?.slice(0, 10) || page.createdAt?.slice(0, 10) || "";

      if (dateFilter === "custom" && customDateStart) {
        if (customDateEnd) {
          if (pageDate < customDateStart || pageDate > customDateEnd) return false;
        } else {
          if (pageDate !== customDateStart) return false;
        }
      }
      if (dateFilter === "today") {
        if (pageDate !== todayKey) return false;
      }
      if (dateFilter === "week") {
        const entryTs = new Date(page.entryDate || page.createdAt).getTime();
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (entryTs < weekAgo) return false;
      }
      if (dateFilter === "month") {
        const entryTs = new Date(page.entryDate || page.createdAt).getTime();
        const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        if (entryTs < monthAgo) return false;
      }

      return true;
    },
    [searchQuery, moodFilters, dateFilter, customDateStart, customDateEnd, todayKey]
  );

  // Result count for draft filters inside the Filter Bottom Sheet (Fix 3)
  const draftFilterResultCount = useMemo(() => {
    return journalEntries.filter((page) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = (page.title || "").toLowerCase().includes(q);
        const matchesContent = (page.content || "").toLowerCase().includes(q);
        const matchesMood = (page.moodLabel || "").toLowerCase().includes(q);
        const matchesTag = page.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesMood && !matchesTag) {
          return false;
        }
      }

      if (draftMoodFilters.length > 0) {
        if (!page.moodLabel || !draftMoodFilters.includes(page.moodLabel)) {
          return false;
        }
      }

      const pageDate = page.dateKey || page.entryDate?.slice(0, 10) || page.createdAt?.slice(0, 10) || "";
      if (draftDateFilter === "custom" && draftCustomDateStart) {
        if (draftCustomDateEnd) {
          if (pageDate < draftCustomDateStart || pageDate > draftCustomDateEnd) return false;
        } else {
          if (pageDate !== draftCustomDateStart) return false;
        }
      }
      if (draftDateFilter === "today" && pageDate !== todayKey) return false;
      if (draftDateFilter === "week") {
        const entryTs = new Date(page.entryDate || page.createdAt).getTime();
        if (entryTs < Date.now() - 7 * 24 * 60 * 60 * 1000) return false;
      }
      if (draftDateFilter === "month") {
        const entryTs = new Date(page.entryDate || page.createdAt).getTime();
        if (entryTs < Date.now() - 30 * 24 * 60 * 60 * 1000) return false;
      }

      return true;
    }).length;
  }, [
    journalEntries,
    searchQuery,
    draftMoodFilters,
    draftDateFilter,
    draftCustomDateStart,
    draftCustomDateEnd,
    todayKey,
  ]);

  // Group books by shelf and compute match counts
  const shelfBooksMap = useMemo(() => {
    const map = new Map<string, { book: JournalBook; matchCount: number; pages: FirestoreJournalEntry[] }[]>();
    for (const shelf of shelves) {
      map.set(shelf.id, []);
    }

    const sortedAllBooks = sortBooks(books, bookSort);

    for (const book of sortedAllBooks) {
      const bookPages = journalEntries.filter((e) => (e as any).bookId === book.id);
      const matches = bookPages.filter(isPageMatchingFilter);

      const targetShelfId = map.has(book.shelfId) ? book.shelfId : shelves[0]?.id;
      if (targetShelfId) {
        const currentList = map.get(targetShelfId) || [];
        currentList.push({
          book,
          matchCount: matches.length,
          pages: bookPages,
        });
        map.set(targetShelfId, currentList);
      }
    }

    return map;
  }, [shelves, books, journalEntries, bookSort, isPageMatchingFilter]);

  // Open Book with Tactile Sliding Spine Animation & 0.6s Cover Opening
  const handleTapBookSpine = (bookId: string) => {
    setSlidingSpineId(bookId);
    setTimeout(() => {
      setSlidingSpineId(null);
      openBookToPage(bookId, 0, true);
    }, 220);
  };

  const openBookToPage = (bookId: string, pageIdx: number, triggerCoverAnim = false) => {
    if (triggerCoverAnim) {
      setIsOpeningCover(true);
      setTimeout(() => {
        setIsOpeningCover(false);
      }, 620);
    }

    const bookPages = journalEntries
      .filter((e) => (e as any).bookId === bookId)
      .sort((a, b) => new Date(a.entryDate || a.createdAt).getTime() - new Date(b.entryDate || b.createdAt).getTime());

    if (bookPages.length === 0) {
      // Auto-create initial blank page 1 if empty
      const newPageId = `page_${Date.now()}`;
      const nowIso = new Date().toISOString();
      const initialPage: FirestoreJournalEntry = {
        id: newPageId,
        title: "",
        content: "",
        dateKey: getLocalDateKey(),
        entryDate: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
        bookId,
        pageNumber: 1,
      };
      const updatedEntries = [initialPage, ...journalEntries];
      setJournalEntries(updatedEntries);
      saveCachedJournalEntries(updatedEntries);
      if (currentUser) {
        saveJournalEntry(currentUser.uid, initialPage as any).catch(() => {});
      }
      setActiveBookId(bookId);
      setCurrentPageIndex(0);
      return;
    }

    // If filter is active, jump to the first matching page
    if (isFilterActive) {
      const matchIdx = bookPages.findIndex(isPageMatchingFilter);
      if (matchIdx !== -1) {
        setActiveBookId(bookId);
        setCurrentPageIndex(matchIdx);
        return;
      }
    }

    setActiveBookId(bookId);
    setCurrentPageIndex(Math.max(0, Math.min(pageIdx, bookPages.length - 1)));
  };

  const closeOpenBook = () => {
    setActiveBookId(null);
    setCurrentPageIndex(0);
    setShowPageIndexDrawer(false);
  };

  // Add new page to currently active book
  const handleAddNewPageToActiveBook = (initialContent = "") => {
    if (!activeBookId) return;
    const newPageId = `page_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const newPage: FirestoreJournalEntry = {
      id: newPageId,
      title: "",
      content: initialContent,
      dateKey: getLocalDateKey(),
      entryDate: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      bookId: activeBookId,
      pageNumber: activeBookPages.length + 1,
    };

    const nextList = [...journalEntries, newPage];
    setJournalEntries(nextList);
    saveCachedJournalEntries(nextList);

    const updatedBooks = books.map((b) => (b.id === activeBookId ? { ...b, updatedAt: nowIso } : b));
    updateBooksState(updatedBooks);

    if (currentUser) {
      saveJournalEntry(currentUser.uid, newPage as any).catch(() => {});
    }

    setCurrentPageIndex(activeBookPages.length);
    setShowPageIndexDrawer(false);
    if (!initialContent) {
      notify(
        language === "Bahasa Melayu"
          ? "Halaman baharu ditambah"
          : language === "中文"
          ? "已添加新的一页"
          : "New page added"
      );
    }
  };

  // Writing area auto-continuation
  const handlePageContentChange = (newContent: string) => {
    const textarea = pageTextareaRef.current;
    if (textarea && textarea.scrollHeight > textarea.clientHeight && textarea.clientHeight > 180) {
      const lines = newContent.split("\n");
      if (lines.length > 1) {
        const overflow = lines.pop() || "";
        const fitting = lines.join("\n");
        handleMutateCurrentPage({ content: fitting });
        if (currentPageIndex < activeBookPages.length - 1) {
          const nextPage = activeBookPages[currentPageIndex + 1];
          const combined = (nextPage.content ? nextPage.content + "\n" : "") + overflow;
          const nextList = journalEntries.map((e) =>
            e.id === nextPage.id ? { ...e, content: combined, updatedAt: new Date().toISOString() } : e
          );
          setJournalEntries(nextList);
          saveCachedJournalEntries(nextList);
          if (currentUser) {
            updateJournalEntry(currentUser.uid, nextPage.id, { content: combined } as any).catch(() => {});
          }
        } else {
          handleAddNewPageToActiveBook(overflow);
        }
        return;
      }
    }
    handleMutateCurrentPage({ content: newContent });
  };

  // Auto-Save open page changes with subtle status indicator
  const handleMutateCurrentPage = (patch: Partial<FirestoreJournalEntry>) => {
    if (!currentPage) return;
    setPageSaveStatus("saving");

    const nowIso = new Date().toISOString();
    const updated = {
      ...currentPage,
      ...patch,
      updatedAt: nowIso,
    };

    const nextList = journalEntries.map((e) => (e.id === currentPage.id ? updated : e));
    setJournalEntries(nextList);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveCachedJournalEntries(nextList);
      if (currentUser && currentPage.id && !currentPage.id.startsWith("seed_")) {
        updateJournalEntry(currentUser.uid, currentPage.id, patch as any)
          .then(() => setPageSaveStatus("saved"))
          .catch(() => setPageSaveStatus("error"));
      } else {
        setPageSaveStatus("saved");
      }
    }, 600);
  };

  // Page Turn Actions
  const handleNextPage = () => {
    if (currentPageIndex < activeBookPages.length - 1) {
      setPageTurnDirection("turning-next");
      setTimeout(() => {
        setCurrentPageIndex((prev) => prev + 1);
        setPageTurnDirection("none");
      }, 200);
    } else {
      handleAddNewPageToActiveBook();
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setPageTurnDirection("turning-prev");
      setTimeout(() => {
        setCurrentPageIndex((prev) => prev - 1);
        setPageTurnDirection("none");
      }, 200);
    }
  };

  // Touch Swipe Gesture for Page Turning
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    if (diff < -50) {
      handleNextPage();
    } else if (diff > 50) {
      handlePrevPage();
    }
    touchStartXRef.current = null;
  };

  // Formatting Toolbar Action
  const handleApplyFormatting = (type: "bold" | "italic" | "heading" | "list" | "quote") => {
    const textarea = pageTextareaRef.current;
    if (!textarea || !currentPage) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const selectedText = currentVal.substring(start, end);

    let prefix = "";
    let suffix = "";

    switch (type) {
      case "bold":
        prefix = "**";
        suffix = "**";
        break;
      case "italic":
        prefix = "*";
        suffix = "*";
        break;
      case "heading":
        prefix = "\n### ";
        suffix = "\n";
        break;
      case "list":
        prefix = "\n- ";
        suffix = "\n";
        break;
      case "quote":
        prefix = "\n> ";
        suffix = "\n";
        break;
    }

    const replacement = selectedText ? `${prefix}${selectedText}${suffix}` : `${prefix}${type}${suffix}`;
    const nextContent = currentVal.substring(0, start) + replacement + currentVal.substring(end);

    handleMutateCurrentPage({ content: nextContent });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 50);
  };

  // Photo Attachment Handler for Open Page
  const handleAttachPhotoToPage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      notify(
        language === "Bahasa Melayu"
          ? "Sila pilih imej di bawah 4MB"
          : language === "中文"
          ? "请选择小于 4MB 的照片"
          : "Please choose an image under 4MB"
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        handleMutateCurrentPage({ photoUrl: reader.result });
        notify(
          language === "Bahasa Melayu"
            ? "Foto dilampirkan ke halaman"
            : language === "中文"
            ? "照片已贴入页面"
            : "Photo attached to page"
        );
      }
    };
    reader.readAsDataURL(file);
  };

  // Delete current page
  const handleConfirmDeletePage = async () => {
    if (!pageToDelete) return;
    const targetId = pageToDelete.id;
    const nextList = journalEntries.filter((e) => e.id !== targetId);
    setJournalEntries(nextList);
    saveCachedJournalEntries(nextList);

    if (currentUser && targetId && !targetId.startsWith("seed_")) {
      await deleteJournalEntry(currentUser.uid, targetId).catch(() => {});
    }

    setPageToDelete(null);
    setCurrentPageIndex((prev) => Math.max(0, prev - 1));
    notify(
      language === "Bahasa Melayu"
        ? "Halaman diari dipadam"
        : language === "中文"
        ? "日记页面已删除"
        : "Page deleted"
    );
  };

  // Create or Edit Book Flow (Fix B & Fix C)
  const handleOpenCreateBook = (targetShelfId?: string) => {
    setEditingBook(null);
    setBookTitleInput("");
    setBookDescInput("");
    setCreateBookTitleError(false);
    setBookColorInput(BOOK_COLOR_PALETTE[Math.floor(Math.random() * BOOK_COLOR_PALETTE.length)].hex);
    setBookShelfIdInput(targetShelfId || shelves[0]?.id || DEFAULT_SHELVES[0].id);
    setShowCreateBookSheet(true);
  };

  const handleOpenEditBook = (book: JournalBook) => {
    setEditingBook(book);
    setBookTitleInput(book.title);
    setBookDescInput(book.description || "");
    setCreateBookTitleError(false);
    setBookColorInput(book.coverColor);
    setBookShelfIdInput(book.shelfId);
    setShowCreateBookSheet(true);
    setShowBookInfoModal(false);
  };

  const handleSaveBook = () => {
    const titleClean = bookTitleInput.trim();
    if (!titleClean) {
      setCreateBookTitleError(true);
      bookTitleInputRef.current?.focus();
      return;
    }
    setCreateBookTitleError(false);

    const nowIso = new Date().toISOString();

    if (editingBook) {
      const updatedList = books.map((b) =>
        b.id === editingBook.id
          ? {
              ...b,
              title: titleClean,
              description: bookDescInput.trim(),
              coverColor: bookColorInput,
              shelfId: bookShelfIdInput,
              updatedAt: nowIso,
            }
          : b
      );
      updateBooksState(updatedList);
      notify(
        language === "Bahasa Melayu"
          ? "Butiran buku dikemas kini"
          : language === "中文"
          ? "手帐信息已更新"
          : "Book details updated"
      );
      setShowCreateBookSheet(false);
      setEditingBook(null);
    } else {
      // Fix C: Create book and open immediately with 0.6s animation and focus on blank Page 1
      const newBookId = `book_${Date.now()}`;
      const newBook: JournalBook = {
        id: newBookId,
        shelfId: bookShelfIdInput,
        title: titleClean,
        coverColor: bookColorInput,
        description: bookDescInput.trim() || undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
        spineHeight: Math.floor(Math.random() * 25) + 150,
        spineWidth: Math.floor(Math.random() * 8) + 38,
      };

      const updatedList = [...books, newBook];
      updateBooksState(updatedList);

      // Create initial page 1 for new book
      const initialPage: FirestoreJournalEntry = {
        id: `page_${Date.now()}`,
        title: "",
        content: "",
        dateKey: getLocalDateKey(),
        entryDate: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
        bookId: newBookId,
        pageNumber: 1,
      };
      const nextEntries = [...journalEntries, initialPage];
      setJournalEntries(nextEntries);
      saveCachedJournalEntries(nextEntries);
      if (currentUser) {
        saveJournalEntry(currentUser.uid, initialPage as any).catch(() => {});
      }

      setShowCreateBookSheet(false);
      setEditingBook(null);

      // Open new book immediately in dedicated full-screen page with 0.6s gentle 3D cover-opening animation
      openBookToPage(newBookId, 0, true);

      // Auto focus cursor on Page 1 textarea
      setTimeout(() => {
        pageTextareaRef.current?.focus();
      }, 500);

      notify(
        language === "Bahasa Melayu"
          ? "Buku diari dibuka untuk menulis"
          : language === "中文"
          ? "已翻开新手帐开始记录"
          : "Book opened for journaling"
      );
    }
  };

  // Delete Book
  const handleConfirmDeleteBook = async () => {
    if (!bookToDelete) return;
    const targetBookId = bookToDelete.id;

    const nextEntries = journalEntries.filter((e) => (e as any).bookId !== targetBookId);
    setJournalEntries(nextEntries);
    saveCachedJournalEntries(nextEntries);

    const nextBooks = books.filter((b) => b.id !== targetBookId);
    updateBooksState(nextBooks);

    if (activeBookId === targetBookId) {
      closeOpenBook();
    }

    setBookToDelete(null);
    setShowBookInfoModal(false);
    notify(
      language === "Bahasa Melayu"
        ? "Buku dan semua halamannya telah dipadam"
        : language === "中文"
        ? "手帐及其所有页面已删除"
        : "Book and its pages deleted"
    );
  };

  // Create or Edit Shelf
  const handleOpenAddShelf = () => {
    setEditingShelf(null);
    setShelfNameInput("");
    setShowShelfModal(true);
  };

  const handleOpenEditShelf = (shelf: JournalShelf) => {
    setEditingShelf(shelf);
    setShelfNameInput(shelf.name);
    setShowShelfModal(true);
  };

  const handleSaveShelf = () => {
    const cleanName = shelfNameInput.trim();
    if (!cleanName) return;

    if (editingShelf) {
      const updated = shelves.map((s) => (s.id === editingShelf.id ? { ...s, name: cleanName } : s));
      updateShelvesState(updated);
      notify(
        language === "Bahasa Melayu"
          ? "Rak diari dinamakan semula"
          : language === "中文"
          ? "书架分类已重命名"
          : "Shelf renamed"
      );
    } else {
      const newShelf: JournalShelf = {
        id: `shelf_${Date.now()}`,
        name: cleanName,
        createdAt: new Date().toISOString(),
        order: shelves.length + 1,
      };
      const updated = [...shelves, newShelf];
      updateShelvesState(updated);
      notify(
        language === "Bahasa Melayu"
          ? "Rak baharu ditambah"
          : language === "中文"
          ? "新书架已添加"
          : "New shelf created"
      );
    }
    setShowShelfModal(false);
    setEditingShelf(null);
  };

  const handleConfirmDeleteShelf = () => {
    if (!shelfToDelete) return;
    const targetShelfId = shelfToDelete.id;
    if (shelves.length <= 1) {
      notify(
        language === "Bahasa Melayu"
          ? "Sekurang-kurangnya satu rak mesti dikekalkan"
          : language === "中文"
          ? "必须至少保留一个书架分类"
          : "At least one shelf must remain"
      );
      setShelfToDelete(null);
      return;
    }

    const fallbackShelf = shelves.find((s) => s.id !== targetShelfId) || shelves[0];

    const nextBooks = books.map((b) => (b.shelfId === targetShelfId ? { ...b, shelfId: fallbackShelf.id } : b));
    updateBooksState(nextBooks);

    const nextShelves = shelves.filter((s) => s.id !== targetShelfId);
    updateShelvesState(nextShelves);

    setShelfToDelete(null);
    notify(
      language === "Bahasa Melayu"
        ? "Rak dipadam dan buku dipindahkan"
        : language === "中文"
        ? "书架已删除，手帐已移至其他书架"
        : "Shelf deleted and books relocated"
    );
  };

  // Helper to open a blank page in a chosen book (from hero "Write a Journal Entry" button)
  const handleWriteJournalEntryPrompt = () => {
    if (books.length === 0) {
      handleOpenCreateBook();
      return;
    }
    setShowChooseBookModal(true);
  };

  const handleSelectBookToWrite = (bookId: string) => {
    setShowChooseBookModal(false);
    const newPageId = `page_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const newPage: FirestoreJournalEntry = {
      id: newPageId,
      title: "",
      content: "",
      dateKey: getLocalDateKey(),
      entryDate: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      bookId,
      pageNumber: journalEntries.filter((e) => (e as any).bookId === bookId).length + 1,
    };

    const nextList = [...journalEntries, newPage];
    setJournalEntries(nextList);
    saveCachedJournalEntries(nextList);

    if (currentUser) {
      saveJournalEntry(currentUser.uid, newPage as any).catch(() => {});
    }

    openBookToPage(bookId, journalEntries.filter((e) => (e as any).bookId === bookId).length, true);
    setTimeout(() => {
      pageTextareaRef.current?.focus();
    }, 500);
  };

  // Calendar bottom sheet date picker helpers (Fix A)
  const handleOpenCalendarSheet = () => {
    const baseDate = customDateStart ? new Date(customDateStart) : new Date();
    setCalendarViewYear(baseDate.getFullYear());
    setCalendarViewMonth(baseDate.getMonth());
    setCalendarDraftStart(customDateStart);
    setCalendarDraftEnd(customDateEnd);
    setShowCalendarSheet(true);
  };

  const handlePrevMonth = () => {
    if (calendarViewMonth === 0) {
      setCalendarViewMonth(11);
      setCalendarViewYear((y) => y - 1);
    } else {
      setCalendarViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarViewMonth === 11) {
      setCalendarViewMonth(0);
      setCalendarViewYear((y) => y + 1);
    } else {
      setCalendarViewMonth((m) => m + 1);
    }
  };

  const handleSelectCalendarDay = (dKey: string) => {
    if (!calendarDraftStart || (calendarDraftStart && calendarDraftEnd)) {
      setCalendarDraftStart(dKey);
      setCalendarDraftEnd(null);
    } else if (calendarDraftStart && !calendarDraftEnd) {
      if (dKey === calendarDraftStart) {
        // Tapped same day = single day selection
        setCalendarDraftEnd(null);
      } else if (dKey < calendarDraftStart) {
        setCalendarDraftEnd(calendarDraftStart);
        setCalendarDraftStart(dKey);
      } else {
        setCalendarDraftEnd(dKey);
      }
    }
  };

  const handleClearCalendarDraft = () => {
    setCalendarDraftStart(null);
    setCalendarDraftEnd(null);
  };

  const handleApplyCalendarSelection = () => {
    if (calendarDraftStart) {
      setCustomDateStart(calendarDraftStart);
      setCustomDateEnd(calendarDraftEnd);
      setDateFilter("custom");
    } else {
      setCustomDateStart(null);
      setCustomDateEnd(null);
      setDateFilter("all");
    }
    setShowCalendarSheet(false);
  };

  const handleClearAppliedCustomDate = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCustomDateStart(null);
    setCustomDateEnd(null);
    setDateFilter("all");
  };

  // Format label for picked custom date chip
  const formatPickedDateLabel = () => {
    if (!customDateStart) return "";
    const parseParts = (key: string) => {
      const parts = key.split("-").map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]);
    };
    const sDate = parseParts(customDateStart);

    if (customDateEnd && customDateEnd !== customDateStart) {
      const eDate = parseParts(customDateEnd);
      if (language === "中文") {
        if (sDate.getFullYear() === eDate.getFullYear()) {
          return `${sDate.getMonth() + 1}月${sDate.getDate()}日 - ${eDate.getMonth() + 1}月${eDate.getDate()}日`;
        }
        return `${sDate.getFullYear()}年${sDate.getMonth() + 1}月 - ${eDate.getFullYear()}年${eDate.getMonth() + 1}月`;
      }
      if (language === "Bahasa Melayu") {
        return `${sDate.getDate()} hingga ${eDate.getDate()} ${eDate.toLocaleDateString("ms-MY", { month: "short" })}`;
      }
      return `${sDate.getDate()} to ${eDate.getDate()} ${eDate.toLocaleDateString("en-MY", { month: "short" })}`;
    }

    if (language === "中文") {
      return `${sDate.getFullYear()}年${sDate.getMonth() + 1}月${sDate.getDate()}日`;
    }
    if (language === "Bahasa Melayu") {
      return sDate.toLocaleDateString("ms-MY", { day: "numeric", month: "short", year: "numeric" });
    }
    return sDate.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
  };

  // Calendar month days calculation
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
    const firstDayWeekday = new Date(calendarViewYear, calendarViewMonth, 1).getDay(); // 0 is Sunday
    const cells: { day: number | null; dateKey: string | null }[] = [];

    for (let i = 0; i < firstDayWeekday; i++) {
      cells.push({ day: null, dateKey: null });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(calendarViewMonth + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      const key = `${calendarViewYear}-${mStr}-${dStr}`;
      cells.push({ day: d, dateKey: key });
    }

    return cells;
  }, [calendarViewYear, calendarViewMonth]);

  // Calendar localized month name
  const calendarMonthLabel = useMemo(() => {
    const date = new Date(calendarViewYear, calendarViewMonth, 1);
    if (language === "中文") {
      return `${calendarViewYear}年 ${calendarViewMonth + 1}月`;
    }
    if (language === "Bahasa Melayu") {
      return date.toLocaleDateString("ms-MY", { month: "long", year: "numeric" });
    }
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [calendarViewYear, calendarViewMonth, language]);

  // Weekday labels
  const weekdayLabels = useMemo(() => {
    if (language === "中文") return ["日", "一", "二", "三", "四", "五", "六"];
    if (language === "Bahasa Melayu") return ["Ahd", "Isn", "Sel", "Rab", "Kha", "Jum", "Sab"];
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  }, [language]);

  // Active Filter Chip Helpers (Fix 3)
  const getActiveDateFilterLabel = () => {
    if (dateFilter === "today") return language === "中文" ? "今天" : language === "Bahasa Melayu" ? "Hari Ini" : "Today";
    if (dateFilter === "week") return language === "中文" ? "本周" : language === "Bahasa Melayu" ? "Minggu Ini" : "This Week";
    if (dateFilter === "month") return language === "中文" ? "本月" : language === "Bahasa Melayu" ? "Bulan Ini" : "This Month";
    if (dateFilter === "custom" && customDateStart) return formatPickedDateLabel();
    return "";
  };

  const handleOpenFilterSheet = () => {
    setDraftDateFilter(dateFilter);
    setDraftCustomDateStart(customDateStart);
    setDraftCustomDateEnd(customDateEnd);
    setDraftMoodFilters([...moodFilters]);
    setShowFilterSheet(true);
  };

  const handleResetDraftFilters = () => {
    setDraftDateFilter("all");
    setDraftCustomDateStart(null);
    setDraftCustomDateEnd(null);
    setDraftMoodFilters([]);
  };

  const handleApplyFilterSheet = () => {
    setDateFilter(draftDateFilter);
    setCustomDateStart(draftCustomDateStart);
    setCustomDateEnd(draftCustomDateEnd);
    setMoodFilters(draftMoodFilters);
    setShowFilterSheet(false);
  };

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setDateFilter("all");
    setCustomDateStart(null);
    setCustomDateEnd(null);
    setMoodFilters([]);
  };

  const handleRemoveMoodFilter = (moodKey: string) => {
    setMoodFilters((prev) => prev.filter((m) => m !== moodKey));
  };

  const handleClearDateFilter = () => {
    setDateFilter("all");
    setCustomDateStart(null);
    setCustomDateEnd(null);
  };

  const handleToggleDraftMood = (moodKey: string) => {
    setDraftMoodFilters((prev) =>
      prev.includes(moodKey) ? prev.filter((m) => m !== moodKey) : [...prev, moodKey]
    );
  };

  const handleSelectDraftDate = (dFilter: "all" | "today" | "week" | "month" | "custom") => {
    setDraftDateFilter(dFilter);
    if (dFilter !== "custom") {
      setDraftCustomDateStart(null);
      setDraftCustomDateEnd(null);
    }
  };

  // Fix 2: Texture Selection Handler
  const handleSelectPageTexture = (style: "lined" | "dotted" | "plain") => {
    setPageStyle(style);
    if (activeBook) {
      const textureKey: "ruled" | "dots" | "blank" = style === "dotted" ? "dots" : style === "plain" ? "blank" : "ruled";
      const updatedBooks: JournalBook[] = books.map((b) => (b.id === activeBook.id ? { ...b, pageTexture: textureKey } : b));
      updateBooksState(updatedBooks);
    }
  };

  // Rename Book Handlers (from "..." menu)
  const handleOpenRenameBook = () => {
    if (!activeBook) return;
    setRenameBookTitleInput(activeBook.title);
    setShowRenameBookModal(true);
    setShowMoreMenu(false);
  };

  const handleSaveRenameBook = () => {
    const trimmed = renameBookTitleInput.trim();
    if (!trimmed || !activeBook) return;
    const updatedBooks = books.map((b) => (b.id === activeBook.id ? { ...b, title: trimmed } : b));
    updateBooksState(updatedBooks);
    setShowRenameBookModal(false);
    notify(language === "中文" ? "手帐名称已更新" : "Book renamed");
  };

  // Change Cover Color Handlers (from "..." menu)
  const handleOpenChangeCover = () => {
    if (!activeBook) return;
    setChangeCoverColorInput(activeBook.coverColor);
    const rgb = hexToRgb(activeBook.coverColor);
    if (rgb) {
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setPickerHue(hsv.h);
      setPickerSat(hsv.s);
      setPickerVal(hsv.v);
      setPickerHexInput(activeBook.coverColor.replace("#", ""));
    }
    setShowChangeCoverSheet(true);
    setShowCustomPickerCover(false);
    setShowMoreMenu(false);
  };

  const handleSaveChangeCover = () => {
    if (!activeBook) return;
    const norm = normalizeHex(changeCoverColorInput) || activeBook.coverColor;
    const updatedBooks = books.map((b) => (b.id === activeBook.id ? { ...b, coverColor: norm } : b));
    updateBooksState(updatedBooks);
    addRecentColor(norm);
    setShowChangeCoverSheet(false);
    notify(language === "中文" ? "手帐封面色彩已更新" : "Cover color updated");
  };

  // Custom Color Picker Helpers (Fix 4 & 5)
  const addRecentColor = (hex: string) => {
    const norm = normalizeHex(hex);
    if (!norm) return;
    setRecentCustomColors((prev) => {
      const filtered = prev.filter((c) => c.toUpperCase() !== norm.toUpperCase());
      const next = [norm, ...filtered].slice(0, 5);
      try {
        localStorage.setItem("ony_recent_colors", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const applyCustomColor = (hex: string, setColorFn: (h: string) => void) => {
    const norm = normalizeHex(hex);
    if (!norm) return;
    setColorFn(norm);
    const rgb = hexToRgb(norm);
    if (rgb) {
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setPickerHue(hsv.h);
      setPickerSat(hsv.s);
      setPickerVal(hsv.v);
      setPickerHexInput(norm.replace("#", ""));
    }
    addRecentColor(norm);
  };

  const handleSatValPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    setColorFn: (hex: string) => void,
    currentHue: number
  ) => {
    const area = e.currentTarget;
    area.setPointerCapture(e.pointerId);

    const update = (clientX: number, clientY: number) => {
      const rect = area.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      const s = Math.round((x / rect.width) * 100) / 100;
      const v = Math.round((1 - y / rect.height) * 100) / 100;
      setPickerSat(s);
      setPickerVal(v);
      const newHex = hsvToHex(currentHue, s, v);
      setColorFn(newHex);
      setPickerHexInput(newHex.replace("#", ""));
    };

    update(e.clientX, e.clientY);

    const onPointerMove = (moveEv: PointerEvent) => {
      update(moveEv.clientX, moveEv.clientY);
    };

    const onPointerUp = (upEv: PointerEvent) => {
      try {
        area.releasePointerCapture(e.pointerId);
      } catch {}
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleHuePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    setColorFn: (hex: string) => void,
    currentSat: number,
    currentVal: number
  ) => {
    const slider = e.currentTarget;
    slider.setPointerCapture(e.pointerId);

    const update = (clientX: number) => {
      const rect = slider.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const h = Math.round((x / rect.width) * 360);
      setPickerHue(h);
      const newHex = hsvToHex(h, currentSat, currentVal);
      setColorFn(newHex);
      setPickerHexInput(newHex.replace("#", ""));
    };

    update(e.clientX);

    const onPointerMove = (moveEv: PointerEvent) => {
      update(moveEv.clientX);
    };

    const onPointerUp = (upEv: PointerEvent) => {
      try {
        slider.releasePointerCapture(e.pointerId);
      } catch {}
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handlePickFromScreen = async (setColorFn: (hex: string) => void) => {
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      try {
        const EyeDropperClass = (window as any).EyeDropper;
        const eyeDropper = new EyeDropperClass();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) {
          applyCustomColor(result.sRGBHex, setColorFn);
        }
      } catch {}
    }
  };

  // AI Memory Handlers (Preserved with strict no-emoji requirement)
  const activeAiMemoriesCount = memories.filter((m) => m.active).length;
  const allAiMemoriesPaused = memories.length > 0 && memories.every((m) => !m.active);

  const filteredAiMemories = useMemo(() => {
    return memories.filter((m) => {
      if (aiMemoryCategory !== "All" && m.category !== aiMemoryCategory) return false;
      if (aiMemoryQuery.trim()) {
        const q = aiMemoryQuery.toLowerCase().trim();
        const matchesText = m.text.toLowerCase().includes(q);
        const matchesReason = (m.reason || "").toLowerCase().includes(q);
        if (!matchesText && !matchesReason) return false;
      }
      return true;
    });
  }, [memories, aiMemoryCategory, aiMemoryQuery]);

  const handleOpenAddAiMemory = () => {
    setEditingAiMemory(null);
    setNewAiMemoryText("");
    setNewAiMemoryCategory("About Me");
    setIsAddingAiMemory(true);
  };

  const handleOpenEditAiMemory = (mem: MemoryItem) => {
    setEditingAiMemory(mem);
    setNewAiMemoryText(mem.text);
    setNewAiMemoryCategory(mem.category || "About Me");
    setIsAddingAiMemory(true);
  };

  const handleSaveAiMemory = () => {
    const textClean = newAiMemoryText.trim();
    if (!textClean) return;

    const reasonClean =
      editingAiMemory?.reason ||
      (language === "Bahasa Melayu"
        ? "Ditambah terus ke Kubah Memori anda."
        : language === "中文"
        ? "您直接保存至记忆宝库的个人偏好。"
        : "Added directly to your Memory Vault.");

    if (editingAiMemory) {
      const updatedMemories = memories.map((m) =>
        m.id === editingAiMemory.id
          ? {
              ...m,
              text: textClean,
              category: newAiMemoryCategory,
              reason: reasonClean,
            }
          : m
      );
      setMemories(updatedMemories);
      if (currentUser && editingAiMemory.firestoreId) {
        updateMemory(currentUser.uid, editingAiMemory.firestoreId, {
          text: textClean,
          category: newAiMemoryCategory,
          reason: reasonClean,
        }).catch(() => {});
      }
      notify(
        language === "Bahasa Melayu"
          ? "Memori AI dikemas kini"
          : language === "中文"
          ? "AI 记忆已更新"
          : "AI memory updated"
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
          ? "Memori AI baharu disimpan"
          : language === "中文"
          ? "已添加新 AI 记忆"
          : "AI memory saved"
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
      nextState
        ? language === "中文"
          ? "保存前询问：已开启"
          : "Ask before saving: ON"
        : language === "中文"
        ? "自动辅助记忆：已允许"
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
      nextState
        ? language === "中文"
          ? "已在对话中启用宝库记忆"
          : "Active memories enabled in chats"
        : language === "中文"
        ? "纯净即时模式：记忆已暂停"
        : "Ephemeral mode: Memories disabled in chats"
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
        ? language === "中文"
          ? "已恢复全部 AI 记忆"
          : "All AI memories resumed"
        : language === "中文"
        ? "已暂停全部 AI 记忆"
        : "All AI memories paused"
    );
  };

  const handleConfirmClearAllAiMemories = async () => {
    setMemories([]);
    setShowClearConfirm(false);
    if (currentUser) {
      await clearAllMemories(currentUser.uid).catch(() => {});
    }
    notify(
      language === "中文" ? "已清空全部记忆" : "All AI memories cleared"
    );
  };

  // Reusable Custom Cover Color Swatches & Inline Picker (Fix 4 & 5)
  const renderColorPickerControl = (
    currentColor: string,
    setColorFn: (hex: string) => void,
    isExpanded: boolean,
    setIsExpanded: (val: boolean | ((prev: boolean) => boolean)) => void
  ) => {
    const isPreset = BOOK_COLOR_PALETTE.some((c) => c.hex.toUpperCase() === currentColor.toUpperCase());
    const isCustomActive = !isPreset;

    return (
      <div className="diary-writer-form-group">
        <label className="diary-writer-inline-label">
          <JournalIcon name="palette" size={15} decorative />
          <span>
            {language === "Bahasa Melayu"
              ? "Warna Kulit & Tulang Buku"
              : language === "中文"
              ? "书脊色彩"
              : "Cover & Spine Color"}
          </span>
        </label>

        {/* 10 Preset Swatches + 11th Custom Swatch */}
        <div className="color-swatches-grid">
          {BOOK_COLOR_PALETTE.map((swatch) => {
            const isSelected = currentColor.toUpperCase() === swatch.hex.toUpperCase();
            return (
              <button
                key={swatch.id}
                type="button"
                className={`color-swatch-btn ${isSelected ? "active" : ""}`}
                style={{ backgroundColor: swatch.hex }}
                onClick={() => {
                  setColorFn(swatch.hex);
                  setIsExpanded(false);
                }}
                title={swatch.name}
                aria-label={swatch.name}
              >
                {isSelected && (
                  <JournalIcon name="check" size={14} color="#ffffff" decorative />
                )}
              </button>
            );
          })}

          {/* 11th Custom Swatch */}
          <button
            type="button"
            className={`color-swatch-custom ${isCustomActive ? "active has-color" : ""}`}
            style={
              isCustomActive
                ? ({ "--custom-swatch-color": currentColor } as any)
                : undefined
            }
            onClick={() => setIsExpanded((prev) => !prev)}
            title={language === "中文" ? "自定义色彩" : "Custom Color"}
            aria-label={language === "中文" ? "自定义色彩" : "Custom Color"}
          >
            <div className="color-swatch-custom-inner">
              <JournalIcon
                name="pipette"
                size={14}
                decorative
                color={isCustomActive ? getAccessibleTextColor(currentColor) : "#2b7a78"}
              />
            </div>
            <span className="custom-swatch-sublabel">
              {language === "中文" ? "自定义" : language === "Bahasa Melayu" ? "Tersuai" : "Custom"}
            </span>
          </button>
        </div>

        {/* Inline Custom Color Picker Panel */}
        {isExpanded && (
          <div className="custom-color-picker-panel">
            {/* 1. 2D Saturation / Value Area with draggable handle (touch target >= 44px) */}
            <div
              className="color-sat-val-area"
              style={{
                backgroundColor: `hsl(${pickerHue}, 100%, 50%)`,
                backgroundImage:
                  "linear-gradient(to top, #000000, transparent), linear-gradient(to right, #ffffff, transparent)",
              }}
              onPointerDown={(e) => handleSatValPointerDown(e, setColorFn, pickerHue)}
            >
              <div
                className="color-sat-val-handle"
                style={{
                  left: `${pickerSat * 100}%`,
                  top: `${(1 - pickerVal) * 100}%`,
                  backgroundColor: currentColor,
                }}
              />
            </div>

            {/* 2. Hue Slider with draggable thumb */}
            <div
              className="color-hue-slider-wrap"
              onPointerDown={(e) => handleHuePointerDown(e, setColorFn, pickerSat, pickerVal)}
            >
              <div
                className="color-hue-slider-thumb"
                style={{
                  left: `${(pickerHue / 360) * 100}%`,
                  backgroundColor: `hsl(${pickerHue}, 100%, 50%)`,
                }}
              />
            </div>

            {/* 3. Recent Custom Colors (up to 5 swatches) */}
            {recentCustomColors.length > 0 && (
              <div className="recent-colors-section">
                <span className="recent-colors-label">
                  {language === "中文" ? "最近使用" : language === "Bahasa Melayu" ? "Terkini" : "Recent"}
                </span>
                <div className="recent-colors-swatches">
                  {recentCustomColors.map((rHex, i) => (
                    <button
                      key={i}
                      type="button"
                      className="recent-color-chip"
                      style={{ backgroundColor: rHex }}
                      onClick={() => applyCustomColor(rHex, setColorFn)}
                      title={rHex}
                      aria-label={`Recent color ${rHex}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 4. Hex Input & Eyedropper */}
            <div className="color-hex-controls-row">
              <div
                className="color-preview-circle"
                style={{ backgroundColor: currentColor }}
              />
              <div className="color-hex-input-wrap">
                <span className="color-hex-prefix">#</span>
                <input
                  type="text"
                  className="color-hex-input"
                  value={pickerHexInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
                    setPickerHexInput(raw);
                    if (raw.length === 3 || raw.length === 6) {
                      const norm = normalizeHex("#" + raw);
                      if (norm) {
                        setColorFn(norm);
                        const rgb = hexToRgb(norm);
                        if (rgb) {
                          const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
                          setPickerHue(hsv.h);
                          setPickerSat(hsv.s);
                          setPickerVal(hsv.v);
                        }
                        addRecentColor(norm);
                      }
                    }
                  }}
                  placeholder="RRGGBB"
                  maxLength={6}
                />
              </div>

              {typeof window !== "undefined" && "EyeDropper" in window && (
                <button
                  type="button"
                  className="color-eyedropper-btn"
                  onClick={() => handlePickFromScreen(setColorFn)}
                  title={language === "中文" ? "吸取屏幕颜色" : "Pick from screen"}
                >
                  <JournalIcon name="pipette" size={14} decorative />
                  <span>{language === "中文" ? "吸色" : "Pipette"}</span>
                </button>
              )}
            </div>

            {/* 5. Readability Tip (Fix 5: gentle, non-blocking) */}
            {isColorSaturatedOrDark(currentColor) && (
              <div className="color-readability-hint">
                <JournalIcon name="info" size={14} decorative />
                <span>
                  {language === "中文"
                    ? "提示：柔和的色彩在手帐中阅读体验更佳。"
                    : language === "Bahasa Melayu"
                    ? "Tip: Warna lembut lebih mudah dibaca dalam buku diari."
                    : "Tip: softer colors are easier to read."}
                </span>
              </div>
            )}

            {/* 6. Done button to collapse */}
            <button
              type="button"
              className="custom-picker-done-btn"
              onClick={() => setIsExpanded(false)}
            >
              {language === "中文" ? "完成" : language === "Bahasa Melayu" ? "Selesai" : "Done"}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="digital-journal-container">
      {/* Top Header with Bookshelf and Pages Counter */}
      <div className="page-header journal-header">
        <div className="header-copy">
          <h2>
            {language === "Bahasa Melayu"
              ? "Kubah Memori"
              : language === "中文"
              ? "记忆库"
              : "Memory Vault"}
          </h2>
          <p>
            {activeTab === "diary"
              ? language === "Bahasa Melayu"
                ? `${totalPagesCount} halaman dalam ${totalBooksCount} buku`
                : language === "中文"
                ? `${totalBooksCount} 本书共 ${totalPagesCount} 页心绪`
                : `${totalPagesCount} pages across ${totalBooksCount} books`
              : language === "Bahasa Melayu"
              ? `${activeAiMemoriesCount} memori aktif untuk sembang ONY`
              : language === "中文"
              ? `${activeAiMemoriesCount} 条授权供 ONY 记忆的日常细节`
              : `${activeAiMemoriesCount} memories active for ONY's chats`}
          </p>
        </div>
      </div>

      <div className="page-pad topless journal-body-pad">
        {/* Global Rule 4: Fixed 2-column Segmented Control (50% width each, no horizontal scroll) */}
        <div className="journal-fixed-two-col-segments" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "diary"}
            className={`journal-segment-btn ${activeTab === "diary" ? "active" : ""}`}
            onClick={() => setActiveTab("diary")}
          >
            <div className="segment-btn-left">
              <JournalIcon name="bookOpen" size={18} decorative />
              <div className="segment-btn-text">
                <strong className="segment-title">
                  {language === "Bahasa Melayu"
                    ? "Diari Peribadi"
                    : language === "中文"
                    ? "私密日记"
                    : "Private Diary"}
                </strong>
                <small className="segment-subtitle">
                  {language === "Bahasa Melayu"
                    ? "Refleksi & foto"
                    : language === "中文"
                    ? "心事、照片与回甘"
                    : "Reflections & photos"}
                </small>
              </div>
            </div>
            {totalPagesCount > 0 && (
              <span className="segment-count-badge">{totalPagesCount}</span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "ai_memory"}
            className={`journal-segment-btn ${activeTab === "ai_memory" ? "active" : ""}`}
            onClick={() => setActiveTab("ai_memory")}
          >
            <div className="segment-btn-left">
              <JournalIcon name="bot" size={18} decorative />
              <div className="segment-btn-text">
                <strong className="segment-title">
                  {language === "Bahasa Melayu"
                    ? "Memori Sembang AI"
                    : language === "中文"
                    ? "AI 陪伴记忆"
                    : "AI Recall Memories"}
                </strong>
                <small className="segment-subtitle">
                  {language === "Bahasa Melayu"
                    ? "Konteks diperibadikan"
                    : language === "中文"
                    ? "辅助日常连贯对话"
                    : "For companion chat"}
                </small>
              </div>
            </div>
            {activeAiMemoriesCount > 0 && (
              <span className="segment-count-badge">{activeAiMemoriesCount}</span>
            )}
          </button>
        </div>

        {/* ============================================================== */}
        {/* SEGMENT 1: PRIVATE DIARY (REALISTIC BOOKSHELF & PAGES)         */}
        {/* ============================================================== */}
        {activeTab === "diary" && (
          <div className="diary-bookshelf-view">
            {/* Hero Card with Pure Single-Language Button */}
            <div className="diary-hero-card">
              <div className="diary-hero-decoration" aria-hidden="true">
                <JournalIcon name="leaf" size={24} decorative />
                <JournalIcon name="sparkles" size={22} decorative />
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
                    ? "Diari ini 100% peribadi kepada anda. Catat detik berharga, luahkan beban hati, dan susun dalam rak buku peribadi dengan tenang."
                    : language === "中文"
                    ? "每一篇日记均属您的私密领地。在这里放下疲惫、记录闪光日常，整齐安放在专属书架上。"
                    : "This diary is strictly private to you. Revisit meaningful moments, untangle heavy feelings, and collect snapshots across your personal books."}
                </p>
              </div>

              {/* Global Rule 3: Single language at a time */}
              <button
                type="button"
                className="btn btn-primary full diary-write-main-btn"
                onClick={handleWriteJournalEntryPrompt}
              >
                <JournalIcon name="pen" size={18} decorative />
                <span>
                  {language === "Bahasa Melayu"
                    ? "Tulis Catatan Diari"
                    : language === "中文"
                    ? "记录新日记"
                    : "Write a Journal Entry"}
                </span>
              </button>
            </div>

            {/* Fix 3: Search Bar with "Sliders" Filter Button inside right end */}
            <div className="diary-filters-section" style={{ marginBottom: "8px" }}>
              <div className="search diary-search-input-wrap">
                <span className="search-icon">
                  <JournalIcon name="search" size={16} decorative />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === "Bahasa Melayu"
                      ? "Cari tajuk buku, teks halaman, atau tag..."
                      : language === "中文"
                      ? "搜索书名、日记内容或标签..."
                      : "Search books, page thoughts, or tags..."
                  }
                  style={{ paddingRight: searchQuery ? "76px" : "44px" }}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className="diary-search-clear-btn"
                    style={{ right: "42px" }}
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <JournalIcon name="close" size={13} />
                  </button>
                ) : null}

                {/* Filter sliders button inside right end of search bar */}
                <button
                  type="button"
                  className={`diary-search-filter-btn ${activeFilterCount > 0 ? "active" : ""}`}
                  onClick={handleOpenFilterSheet}
                  aria-label={
                    language === "中文"
                      ? `筛选日记 (${activeFilterCount})`
                      : `Filter journal (${activeFilterCount})`
                  }
                  title={
                    language === "中文"
                      ? "筛选日期与心情"
                      : "Filter by date and mood"
                  }
                >
                  <JournalIcon name="sliders" size={16} />
                  {activeFilterCount > 0 && (
                    <span className="filter-badge-dot" aria-label="Filters active" />
                  )}
                </button>
              </div>

              {/* Fix 3: Active Filters Row (Only shown when filter active, single row with Clear all) */}
              {(dateFilter !== "all" || moodFilters.length > 0) && (
                <div className="diary-active-filters-row">
                  {dateFilter !== "all" && (
                    <span className="diary-active-removable-chip">
                      <JournalIcon name="calendar" size={12} decorative />
                      <span>{getActiveDateFilterLabel()}</span>
                      <button
                        type="button"
                        className="diary-active-chip-remove"
                        onClick={handleClearDateFilter}
                        aria-label="Remove date filter"
                      >
                        <JournalIcon name="close" size={10} decorative />
                      </button>
                    </span>
                  )}

                  {moodFilters.map((moodKey) => {
                    const opt = DIARY_MOOD_OPTIONS.find((m) => m.key === moodKey);
                    const label =
                      language === "中文"
                        ? opt?.labelZh
                        : language === "Bahasa Melayu"
                        ? opt?.labelBm
                        : opt?.label;
                    return (
                      <span key={moodKey} className="diary-active-removable-chip">
                        {opt?.icon && <JournalIcon name={opt.icon} size={12} decorative />}
                        <span>{label || moodKey}</span>
                        <button
                          type="button"
                          className="diary-active-chip-remove"
                          onClick={() => handleRemoveMoodFilter(moodKey)}
                          aria-label={`Remove ${label} filter`}
                        >
                          <JournalIcon name="close" size={10} decorative />
                        </button>
                      </span>
                    );
                  })}

                  <button
                    type="button"
                    className="diary-clear-all-filters-btn"
                    onClick={handleClearAllFilters}
                  >
                    {language === "中文"
                      ? "清除全部"
                      : language === "Bahasa Melayu"
                      ? "Kosongkan semua"
                      : "Clear all"}
                  </button>
                </div>
              )}
            </div>

            {/* Bookshelf Sort Bar */}
            <div className="bookshelf-sort-bar">
              <span className="bookshelf-sort-title">
                <JournalIcon name="bookshelf" size={15} decorative />
                <span>
                  {language === "Bahasa Melayu"
                    ? "Koleksi Rak Buku"
                    : language === "中文"
                    ? "我的心绪书架"
                    : "Bookshelf Collection"}
                </span>
              </span>

              <div className="bookshelf-sort-group">
                <button
                  type="button"
                  className={`bookshelf-sort-btn ${bookSort === "last_edited" ? "active" : ""}`}
                  onClick={() => setBookSort("last_edited")}
                >
                  {language === "Bahasa Melayu" ? "Terkini" : language === "中文" ? "最近编辑" : "Recent"}
                </button>
                <button
                  type="button"
                  className={`bookshelf-sort-btn ${bookSort === "page_count" ? "active" : ""}`}
                  onClick={() => setBookSort("page_count")}
                >
                  {language === "Bahasa Melayu" ? "Halaman" : language === "中文" ? "页数" : "Pages"}
                </button>
                <button
                  type="button"
                  className={`bookshelf-sort-btn ${bookSort === "title" ? "active" : ""}`}
                  onClick={() => setBookSort("title")}
                >
                  {language === "Bahasa Melayu" ? "A-Z" : language === "中文" ? "名称" : "A-Z"}
                </button>
              </div>
            </div>

            {/* Interactive Shelves Rendering */}
            <div className="bookshelf-shelves-container">
              {shelves.map((shelf) => {
                const booksOnShelf = shelfBooksMap.get(shelf.id) || [];
                const totalPagesOnShelf = booksOnShelf.reduce((acc, item) => acc + item.pages.length, 0);

                return (
                  <div key={shelf.id} className="bookshelf-shelf-row">
                    <div className="bookshelf-shelf-header">
                      <div className="bookshelf-shelf-title-group">
                        <h4>{shelf.name}</h4>
                        <span className="bookshelf-shelf-count-badge">
                          {booksOnShelf.length} {booksOnShelf.length === 1 ? "book" : "books"} • {totalPagesOnShelf} p.
                        </span>
                      </div>

                      <button
                        type="button"
                        className="bookshelf-shelf-menu-btn"
                        onClick={() => handleOpenEditShelf(shelf)}
                        aria-label={`Manage shelf ${shelf.name}`}
                        title="Manage shelf"
                      >
                        <JournalIcon name="more" size={16} />
                      </button>
                    </div>

                    <div className="bookshelf-stage">
                      <div className="bookshelf-scroll-track">
                        {booksOnShelf.map(({ book, matchCount, pages }) => {
                          const isSliding = slidingSpineId === book.id;
                          const textColor = getAccessibleTextColor(book.coverColor);
                          const ribbonColor = getDerivedRibbonColor(book.coverColor);
                          const spineH = book.spineHeight || 160;
                          const spineW = book.spineWidth || 42;

                          return (
                            <div
                              key={book.id}
                              className={`book-spine-card ${isSliding ? "sliding-out" : ""}`}
                              style={{
                                height: `${spineH}px`,
                                width: `${spineW}px`,
                                backgroundColor: book.coverColor,
                                color: textColor,
                              }}
                              onClick={() => handleTapBookSpine(book.id)}
                              role="button"
                              tabIndex={0}
                              aria-label={`Book ${book.title}, ${pages.length} pages`}
                            >
                              <div className="spine-top-band" />
                              <div className="spine-ribbon" style={{ backgroundColor: ribbonColor }} />

                              {isFilterActive && matchCount > 0 && (
                                <span className="spine-match-badge">{matchCount}</span>
                              )}

                              <span
                                className="spine-title-vertical"
                                style={{ fontSize: `${getSpineFontSize(book.title)}px` }}
                              >
                                {book.title}
                              </span>

                              <div className="spine-base-meta">
                                <JournalIcon name="bookOpen" size={11} decorative />
                                <span>{pages.length}</span>
                              </div>

                              <div className="spine-bottom-band" />
                            </div>
                          );
                        })}

                        {/* Dashed "+ Book" placeholder spine */}
                        <div
                          className="book-spine-add-dashed"
                          onClick={() => handleOpenCreateBook(shelf.id)}
                          role="button"
                          tabIndex={0}
                          aria-label={`Add book to shelf ${shelf.name}`}
                        >
                          <span className="plus-symbol">+</span>
                          <span className="plus-label">
                            {language === "Bahasa Melayu"
                              ? "TAMBAH"
                              : language === "中文"
                              ? "新建"
                              : "NEW"}
                          </span>
                        </div>
                      </div>

                      {/* 3D Shelf Plank */}
                      <div className="bookshelf-plank" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* "+ New Shelf" Pill Action Button */}
            <div className="bookshelf-bottom-actions">
              <button
                type="button"
                className="new-shelf-pill-btn"
                onClick={handleOpenAddShelf}
              >
                <JournalIcon name="plus" size={15} decorative />
                <span>
                  {language === "Bahasa Melayu"
                    ? "Rak Baharu"
                    : language === "中文"
                    ? "新建书架"
                    : "New Shelf"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SEGMENT 2: AI RECALL MEMORIES (PURE ICONS, ZERO EMOJIS)        */}
        {/* ============================================================== */}
        {activeTab === "ai_memory" && (
          <div className="ai-recall-memory-segment">
            <div className="ai-recall-hero-card">
              <div className="ai-recall-hero-header">
                <div className="ai-recall-hero-icon-pill">
                  <JournalIcon name="bot" size={20} decorative />
                  <span>
                    {language === "Bahasa Melayu"
                      ? "Memori Sembang Selamat"
                      : language === "中文"
                      ? "加密陪伴记忆"
                      : "Consented AI Recall"}
                  </span>
                </div>
                <button
                  type="button"
                  className="ai-recall-privacy-btn"
                  onClick={onNavigateToPrivacy}
                >
                  <JournalIcon name="shield" size={14} decorative />
                  <span>
                    {language === "Bahasa Melayu"
                      ? "Privasi"
                      : language === "中文"
                      ? "隐私控制"
                      : "Privacy"}
                  </span>
                </button>
              </div>

              <h3>
                {language === "Bahasa Melayu"
                  ? "Fakta yang diingati oleh bot sembang ONY."
                  : language === "中文"
                  ? "由您全权授权 ONY 记住的日常细节。"
                  : "Things ONY holds gently in mind for you."}
              </h3>
              <p>
                {language === "Bahasa Melayu"
                  ? "Hanya butiran yang anda benarkan disimpan untuk rujukan dalam perbualan. Boleh dijeda, disunting atau dipadam sepenuhnya bila-bila masa."
                  : language === "中文"
                  ? "仅保留您明确同意记住的偏好与上下文，让日常交流更具连贯温度。您可以随时独立暂停、修改或一键彻底清空。"
                  : "These items inform ONY's ongoing conversations with empathetic context. You have sovereign control to pause, edit, or purge memories at any time."}
              </p>

              <button
                type="button"
                className="btn btn-primary full"
                onClick={handleOpenAddAiMemory}
              >
                <JournalIcon name="plus" size={16} decorative />
                <span>
                  {language === "Bahasa Melayu"
                    ? "Tambah Memori Baharu untuk AI"
                    : language === "中文"
                    ? "添加新记忆"
                    : "Add Memory for AI"}
                </span>
              </button>
            </div>

            {/* AI Recall Search & Category Chips */}
            <div className="diary-filters-section" style={{ marginTop: "16px" }}>
              <div className="search diary-search-input-wrap">
                <span className="search-icon">
                  <JournalIcon name="search" size={16} decorative />
                </span>
                <input
                  type="text"
                  value={aiMemoryQuery}
                  onChange={(e) => setAiMemoryQuery(e.target.value)}
                  placeholder={
                    language === "Bahasa Melayu"
                      ? "Cari memori AI..."
                      : language === "中文"
                      ? "搜索 AI 记忆条目..."
                      : "Search AI recall memories..."
                  }
                />
                {aiMemoryQuery && (
                  <button
                    type="button"
                    className="diary-search-clear-btn"
                    onClick={() => setAiMemoryQuery("")}
                    aria-label="Clear search"
                  >
                    <JournalIcon name="close" size={14} />
                  </button>
                )}
              </div>

              <div className="ai-recall-category-chips">
                {AI_MEMORY_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`ai-cat-chip ${aiMemoryCategory === cat ? "active" : ""}`}
                    onClick={() => setAiMemoryCategory(cat)}
                  >
                    <JournalIcon name={getCategoryIconName(cat)} size={14} decorative />
                    <span>{getCategoryLabel(cat, language)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active / Total Counter & Actions Bar */}
            <div className="ai-recall-section-head">
              <h3>
                {language === "Bahasa Melayu"
                  ? "Senarai Memori Disimpan"
                  : language === "中文"
                  ? "已收录记忆"
                  : "Saved Memory Items"}{" "}
                <small>({filteredAiMemories.length})</small>
              </h3>

              {memories.length > 0 && (
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleTogglePauseAll}
                    style={{ fontSize: "12px", padding: "4px 8px" }}
                  >
                    <JournalIcon name={allAiMemoriesPaused ? "play" : "pause"} size={14} decorative />
                    <span>
                      {allAiMemoriesPaused
                        ? language === "中文"
                          ? "恢复全部"
                          : "Resume All"
                        : language === "中文"
                        ? "暂停全部"
                        : "Pause All"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowClearConfirm(true)}
                    style={{ fontSize: "12px", padding: "4px 8px", color: "var(--danger)" }}
                  >
                    <JournalIcon name="trash" size={14} decorative />
                    <span>{language === "中文" ? "清空" : "Clear"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* AI Recall List */}
            <div className="ai-recall-list">
              {filteredAiMemories.map((item) => (
                <div key={item.id} className={`ai-recall-card ${!item.active ? "paused" : ""}`}>
                  <div className="ai-recall-card-top">
                    <div className="ai-recall-card-cat-badge">
                      <JournalIcon name={getCategoryIconName(item.category || "About Me")} size={13} decorative />
                      <span>{getCategoryLabel(item.category || "About Me", language)}</span>
                    </div>

                    <div className="ai-recall-card-toggle">
                      <button
                        type="button"
                        className={`mini-toggle-pill ${item.active ? "active" : ""}`}
                        onClick={() => {
                          const updated = memories.map((m) =>
                            m.id === item.id ? { ...m, active: !m.active } : m
                          );
                          setMemories(updated);
                          if (currentUser && item.firestoreId) {
                            updateMemory(currentUser.uid, item.firestoreId, { active: !item.active }).catch(() => {});
                          }
                        }}
                      >
                        {item.active
                          ? language === "中文"
                            ? "生效中"
                            : "Active"
                          : language === "中文"
                          ? "已暂停"
                          : "Paused"}
                      </button>
                    </div>
                  </div>

                  <strong className="ai-recall-card-text">{item.text}</strong>

                  {item.reason && (
                    <p className="ai-recall-card-reason">
                      <JournalIcon name="info" size={13} decorative />
                      <span>{item.reason}</span>
                    </p>
                  )}

                  <div className="ai-recall-card-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => handleOpenEditAiMemory(item)}
                    >
                      <JournalIcon name="edit" size={14} decorative />
                      <span>{language === "中文" ? "编辑" : "Edit"}</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        const updated = memories.filter((m) => m.id !== item.id);
                        setMemories(updated);
                        if (currentUser && item.firestoreId) {
                          deleteMemory(currentUser.uid, item.firestoreId).catch(() => {});
                        }
                        notify(
                          language === "中文" ? "已删除该记忆条目" : "Memory item removed"
                        );
                      }}
                    >
                      <JournalIcon name="trash" size={14} decorative />
                      <span>{language === "中文" ? "删除" : "Delete"}</span>
                    </button>
                  </div>
                </div>
              ))}

              {filteredAiMemories.length === 0 && (
                <div className="empty-state-clean">
                  <JournalIcon name="bot" size={36} color="var(--muted)" decorative />
                  <h4>
                    {language === "Bahasa Melayu"
                      ? "Tiada memori sepadan"
                      : language === "中文"
                      ? "暂无匹配的 AI 记忆"
                      : "No matching recall memories"}
                  </h4>
                  <p>
                    {language === "Bahasa Melayu"
                      ? "Ketik butang Tambah di atas untuk berkongsi fakta penting dengan ONY."
                      : language === "中文"
                      ? "点击上方按钮，授权 ONY 记住关于您的重要习惯或偏好。"
                      : "Add preferences or facts you'd like ONY to keep in mind."}
                  </p>
                </div>
              )}
            </div>

            {/* Privacy Controls Box (Zero emojis) */}
            <div className="vault-privacy-box">
              <div className="vault-privacy-header">
                <div className="vault-privacy-header-left">
                  <JournalIcon name="shield" size={18} decorative />
                  <strong>
                    {language === "Bahasa Melayu"
                      ? "Kawalan Privasi Memori"
                      : language === "中文"
                      ? "记忆隐私与授权控制"
                      : "Memory Privacy Controls"}
                  </strong>
                </div>
                <span className="vault-privacy-status-pill active">
                  <JournalIcon name="lock" size={12} decorative />
                  <span>
                    {useActiveMemories
                      ? language === "中文"
                        ? "受控开启"
                        : "Active Protected"
                      : language === "中文"
                      ? "纯净即时"
                      : "Ephemeral Mode"}
                  </span>
                </span>
              </div>

              <div className="vault-privacy-item">
                <div className="vault-privacy-item-text">
                  <strong>
                    {language === "Bahasa Melayu"
                      ? "Tanya sebelum simpan memori"
                      : language === "中文"
                      ? "保存前始终询问确认"
                      : "Ask before saving memory"}
                  </strong>
                  <p>
                    {language === "Bahasa Melayu"
                      ? "Perlukan pengesahan manual sebelum ONY menyimpan sebarang butiran baharu."
                      : language === "中文"
                      ? "开启后，ONY 在聊天中发现重要偏好时必须主动征得您的同意才会入库。"
                      : "Require explicit manual confirmation before ONY commits any new fact."}
                  </p>
                </div>
                <button
                  type="button"
                  className={`mini-toggle-pill ${memoryConsent === "control" ? "active" : ""}`}
                  onClick={() => handleToggleAskBeforeSaving(memoryConsent !== "control")}
                >
                  {memoryConsent === "control"
                    ? language === "中文"
                      ? "开启"
                      : "ON"
                    : language === "中文"
                    ? "关闭"
                    : "OFF"}
                </button>
              </div>

              <div className="vault-privacy-item">
                <div className="vault-privacy-item-text">
                  <strong>
                    {language === "Bahasa Melayu"
                      ? "Gunakan memori dalam sembang aktif"
                      : language === "中文"
                      ? "允许在对话中引用已存记忆"
                      : "Use memories in companion chats"}
                  </strong>
                  <p>
                    {language === "Bahasa Melayu"
                      ? "Membolehkan ONY mengingati konteks untuk jawapan yang lebih mendalam."
                      : language === "中文"
                      ? "关闭后将进入纯净即时对话模式，不读取任何已保存的个人偏好。"
                      : "When disabled, ONY runs in pure ephemeral mode without accessing saved memories."}
                  </p>
                </div>
                <button
                  type="button"
                  className={`mini-toggle-pill ${useActiveMemories ? "active" : ""}`}
                  onClick={() => handleToggleUseActiveMemories(!useActiveMemories)}
                >
                  {useActiveMemories
                    ? language === "中文"
                      ? "已启用"
                      : "Enabled"
                    : language === "中文"
                    ? "已停用"
                    : "Disabled"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* FULLSCREEN DEDICATED BOOK VIEW (3:4 PROPORTIONS, CREAM PAPER) */}
      {/* ============================================================== */}
      {activeBook && (
        <div className="open-book-overlay" style={{ "--book-accent": activeBook.coverColor } as any}>
          {/* Header (Fix 2: Arrow icon only, 2-line centered title, ONE "..." button) */}
          <div className="open-book-header">
            <button
              type="button"
              className="open-book-back-btn"
              onClick={closeOpenBook}
              aria-label={
                language === "Bahasa Melayu"
                  ? "Kembali ke rak buku"
                  : language === "中文"
                  ? "返回书架"
                  : "Back to bookshelf"
              }
              title={
                language === "Bahasa Melayu"
                  ? "Kembali ke rak buku"
                  : language === "中文"
                  ? "返回书架"
                  : "Back to bookshelf"
              }
            >
              <JournalIcon name="arrowLeft" size={17} decorative />
            </button>

            <div className="open-book-title-group">
              <h2>{activeBook.title}</h2>
              <span className="open-book-page-counter">
                {activeBookPages.length > 0
                  ? language === "Bahasa Melayu"
                    ? `Halaman ${currentPageIndex + 1} drpd ${activeBookPages.length}`
                    : language === "中文"
                    ? `第 ${currentPageIndex + 1} 页 / 共 ${activeBookPages.length} 页`
                    : `Page ${currentPageIndex + 1} of ${activeBookPages.length}`
                  : language === "中文"
                  ? "空白页"
                  : "Blank page"}
              </span>
            </div>

            <div className="open-book-right-actions">
              <button
                type="button"
                className="open-book-more-btn"
                onClick={() => setShowMoreMenu((prev) => !prev)}
                aria-label="More options"
                title="More options"
              >
                <JournalIcon name="more" size={18} />
              </button>

              {/* Fix 2: "..." Dropdown Menu */}
              {showMoreMenu && (
                <>
                  <div
                    className="book-more-dropdown-backdrop"
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <div className="book-more-dropdown-menu" role="menu">
                    <button
                      type="button"
                      className="book-more-dropdown-item"
                      role="menuitem"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowPageTextureSheet(true);
                      }}
                    >
                      <JournalIcon name="lines" size={16} decorative />
                      <span>
                        {language === "中文"
                          ? "信纸底纹"
                          : language === "Bahasa Melayu"
                          ? "Tekstur Kertas"
                          : "Page Texture"}
                      </span>
                    </button>

                    <button
                      type="button"
                      className="book-more-dropdown-item"
                      role="menuitem"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setSelectedBookForInfo(activeBook);
                        setShowBookInfoModal(true);
                      }}
                    >
                      <JournalIcon name="info" size={16} decorative />
                      <span>
                        {language === "中文"
                          ? "手帐信息"
                          : language === "Bahasa Melayu"
                          ? "Maklumat Buku"
                          : "Book Info"}
                      </span>
                    </button>

                    <button
                      type="button"
                      className="book-more-dropdown-item"
                      role="menuitem"
                      onClick={handleOpenRenameBook}
                    >
                      <JournalIcon name="pen" size={16} decorative />
                      <span>
                        {language === "中文"
                          ? "重命名手帐"
                          : language === "Bahasa Melayu"
                          ? "Namakan Semula"
                          : "Rename Book"}
                      </span>
                    </button>

                    <button
                      type="button"
                      className="book-more-dropdown-item"
                      role="menuitem"
                      onClick={handleOpenChangeCover}
                    >
                      <JournalIcon name="palette" size={16} decorative />
                      <span>
                        {language === "中文"
                          ? "更改封面色彩"
                          : language === "Bahasa Melayu"
                          ? "Tukar Warna Kulit"
                          : "Change Cover Color"}
                      </span>
                    </button>

                    <div className="book-more-dropdown-divider" />

                    <button
                      type="button"
                      className="book-more-dropdown-item danger"
                      role="menuitem"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setBookToDelete(activeBook);
                      }}
                    >
                      <JournalIcon name="trash" size={16} decorative />
                      <span>
                        {language === "中文"
                          ? "删除手帐"
                          : language === "Bahasa Melayu"
                          ? "Padam Buku"
                          : "Delete Book"}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 0.6s 3D Cover Opening Moment Animation */}
          {isOpeningCover && (
            <div className="book-opening-stage" aria-hidden="true">
              <div
                className="book-opening-cover"
                style={{
                  backgroundColor: activeBook.coverColor,
                  color: getAccessibleTextColor(activeBook.coverColor),
                }}
              >
                <div className="book-opening-cover-seal">
                  <JournalIcon name="stackedBooks" size={16} decorative />
                  <span>
                    {language === "Bahasa Melayu"
                      ? "Koleksi Diari Peribadi"
                      : language === "中文"
                      ? "私密心绪手帐"
                      : "Private Journal"}
                  </span>
                </div>
                <h1 className="book-opening-cover-title">{activeBook.title}</h1>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", opacity: 0.8 }}>ONY Reflection Vault</span>
                  <JournalIcon name="bookOpen" size={18} decorative />
                </div>
              </div>
            </div>
          )}

          {/* Page Body Container */}
          <div
            className="open-book-body"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="open-book-spread-container">
              <div
                className={`open-book-page-paper page-style-${pageStyle} gutter-left ${
                  pageTurnDirection !== "none" ? pageTurnDirection : ""
                }`}
              >
                {/* Ribbon Bookmark (Fix 2 & 5: soft, desaturated tone) */}
                <div
                  className="book-ribbon-bookmark"
                  style={{
                    backgroundColor: getDerivedRibbonColor(activeBook.coverColor),
                  }}
                  title="Bookmark"
                />

                {/* Page Top Meta Row */}
                <div className="page-top-meta-row">
                  <span className="page-date-indicator">
                    <JournalIcon name="calendar" size={13} decorative />
                    <span>
                      {currentPage
                        ? currentPage.dateKey || getLocalDateKey(currentPage.entryDate)
                        : todayKey}
                    </span>
                  </span>

                  <span className={`page-save-indicator ${pageSaveStatus}`}>
                    {pageSaveStatus === "saved" && (
                      <>
                        <JournalIcon name="check" size={12} decorative />
                        <span>{language === "中文" ? "已自动保存" : "Saved"}</span>
                      </>
                    )}
                    {pageSaveStatus === "saving" && (
                      <>
                        <JournalIcon name="clock" size={12} decorative />
                        <span>{language === "中文" ? "保存中…" : "Saving…"}</span>
                      </>
                    )}
                    {pageSaveStatus === "error" && (
                      <>
                        <JournalIcon name="info" size={12} decorative />
                        <span>{language === "中文" ? "保存失败，点击重试" : "Error saving"}</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Mood Stamp in Top Corner (Vector Outline Icon) */}
                <div className="page-mood-stamp-row">
                  <span className="page-mood-stamp">
                    <JournalIcon
                      name={getMoodIconName(currentPage?.moodLabel || "Reflective")}
                      size={14}
                      decorative
                    />
                    <span>{currentPage?.moodLabel || "Reflective"}</span>
                  </span>
                </div>

                {/* Optional Page Title Input */}
                <input
                  type="text"
                  className="page-title-input"
                  value={currentPage?.title || ""}
                  onChange={(e) => handleMutateCurrentPage({ title: e.target.value })}
                  placeholder={
                    language === "Bahasa Melayu"
                      ? "Tajuk refleksi (pilihan)..."
                      : language === "中文"
                      ? "给这一页起个题目（可选）..."
                      : "Page title (optional)..."
                  }
                  maxLength={70}
                />

                {/* Main Page Writing Area with Auto-continuation */}
                <textarea
                  ref={pageTextareaRef}
                  className="page-writing-textarea"
                  value={currentPage?.content || ""}
                  onChange={(e) => handlePageContentChange(e.target.value)}
                  placeholder={
                    language === "Bahasa Melayu"
                      ? "Tuliskan apa yang ada di fikiran dan hati anda hari ini..."
                      : language === "中文"
                      ? "写下今天的心境、闪光的细碎片段，或是只想讲给自己听的话..."
                      : "Pour out whatever is in your heart and mind today..."
                  }
                />

                {/* Polaroid Photos Section */}
                {currentPage?.photoUrl && (
                  <div className="page-photos-section">
                    <div className="polaroid-card">
                      <div className="polaroid-tape" />
                      <img
                        src={currentPage.photoUrl}
                        alt="Journal photo"
                        onClick={() => setPreviewPhotoUrl(currentPage.photoUrl || null)}
                      />
                      <button
                        type="button"
                        className="polaroid-remove-btn"
                        onClick={() => handleMutateCurrentPage({ photoUrl: undefined })}
                        title="Remove photo"
                        aria-label="Remove photo"
                      >
                        <JournalIcon name="close" size={12} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Bottom Center Page Number in Traditional Book Format: — 1 — */}
                <div className="page-number-printed">
                  — {currentPageIndex + 1} —
                </div>

                {/* Footer Timestamps: Created and Last Edited (Permanent & Localized) */}
                <div className="page-footer-timestamps">
                  <span className="page-footer-timestamp-line">
                    <strong>{language === "中文" ? "创建于" : "Created:"}</strong>{" "}
                    {formatPageFooterTimestamp(currentPage?.createdAt || new Date().toISOString(), language)}
                  </span>
                  {currentPage?.updatedAt && currentPage.updatedAt !== currentPage.createdAt && (
                    <span className="page-footer-timestamp-line">
                      <strong>{language === "中文" ? "最后编辑" : "Edited:"}</strong>{" "}
                      {formatPageFooterTimestamp(currentPage.updatedAt, language)}
                    </span>
                  )}
                </div>

                {/* Page Curl in Bottom Outer Corner */}
                <div
                  className="page-curl-corner"
                  onClick={handleNextPage}
                  title="Turn to next page"
                  aria-label="Turn page"
                >
                  <div className="page-curl-triangle" />
                </div>
              </div>
            </div>
          </div>

          {/* Hidden File Input for Attaching Photos to Page */}
          <input
            ref={pageFileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleAttachPhotoToPage}
          />

          {/* Floating Formatting Toolbar above bottom bar */}
          <div className="page-floating-toolbar">
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => handleApplyFormatting("bold")}
              title="Bold"
              aria-label="Bold text"
            >
              <JournalIcon name="bold" size={14} />
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => handleApplyFormatting("italic")}
              title="Italic"
              aria-label="Italic text"
            >
              <JournalIcon name="italic" size={14} />
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => handleApplyFormatting("heading")}
              title="Heading"
              aria-label="Heading format"
            >
              <JournalIcon name="heading" size={14} />
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => handleApplyFormatting("list")}
              title="Bullet list"
              aria-label="Bullet list"
            >
              <JournalIcon name="list" size={14} />
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => handleApplyFormatting("quote")}
              title="Quote block"
              aria-label="Quote block"
            >
              <JournalIcon name="quote" size={14} />
            </button>

            <span className="toolbar-separator" />

            {/* Photo Attachment button */}
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => pageFileInputRef.current?.click()}
              title="Attach photo"
              aria-label="Attach photo"
            >
              <JournalIcon name="camera" size={15} />
            </button>
          </div>

          {/* Bottom Navigation for Book Pages */}
          <div className="open-book-bottom-nav">
            <button
              type="button"
              className="book-turn-page-btn"
              onClick={handlePrevPage}
              disabled={currentPageIndex === 0}
              aria-label="Previous page"
            >
              <JournalIcon name="chevronLeft" size={15} decorative />
              <span>{language === "中文" ? "上一页" : "Prev Page"}</span>
            </button>

            <button
              type="button"
              className="book-page-index-pill-btn"
              onClick={() => setShowPageIndexDrawer(true)}
              aria-label="Open page index directory"
            >
              <JournalIcon name="pageIndex" size={14} decorative />
              <span>
                {language === "中文"
                  ? `目录 (${currentPageIndex + 1}/${activeBookPages.length || 1})`
                  : `Index (${currentPageIndex + 1}/${activeBookPages.length || 1})`}
              </span>
            </button>

            <button
              type="button"
              className="book-turn-page-btn"
              onClick={handleNextPage}
              aria-label="Next page"
            >
              <span>
                {currentPageIndex < activeBookPages.length - 1
                  ? language === "中文"
                    ? "下一页"
                    : "Next Page"
                  : language === "中文"
                  ? "+ 新一页"
                  : "+ New Page"}
              </span>
              <JournalIcon name="chevronRight" size={15} decorative />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FIX 2: PAGE TEXTURE BOTTOM SHEET (EQUAL-WIDTH CARDS, 1 ROW)   */}
      {/* ============================================================== */}
      {showPageTextureSheet && (
        <div
          className="diary-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPageTextureSheet(false);
          }}
        >
          <div className="diary-writer-sheet" role="dialog" aria-modal="true">
            <div className="diary-sheet-handle" />
            <div className="diary-writer-header">
              <div className="diary-writer-title-group">
                <span className="diary-writer-icon">
                  <JournalIcon name="lines" size={20} decorative />
                </span>
                <div>
                  <h3>
                    {language === "Bahasa Melayu"
                      ? "Tekstur Kertas Diari"
                      : language === "中文"
                      ? "手帐信纸底纹"
                      : "Page Paper Texture"}
                  </h3>
                  <p>
                    {language === "Bahasa Melayu"
                      ? "Pilih gaya garisan atau titik yang selesa untuk menulis"
                      : language === "中文"
                      ? "挑选令您心静的底纹，应用于此手帐的所有页面"
                      : "Choose a soothing paper texture for this book"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="diary-sheet-close-btn"
                onClick={() => setShowPageTextureSheet(false)}
                aria-label="Close"
              >
                <JournalIcon name="close" size={16} />
              </button>
            </div>

            <div className="diary-writer-scrollable-body">
              <div className="page-texture-cards-row">
                {/* 1. Ruled Lines */}
                <button
                  type="button"
                  className={`page-texture-card ${pageStyle === "lined" ? "active" : ""}`}
                  onClick={() => handleSelectPageTexture("lined")}
                >
                  {pageStyle === "lined" && (
                    <span className="page-texture-check-badge">
                      <JournalIcon name="check" size={12} color="#ffffff" decorative />
                    </span>
                  )}
                  <div className="page-texture-mini-paper lined" />
                  <div className="page-texture-card-meta">
                    <span className="page-texture-card-icon">
                      <JournalIcon name="lines" size={15} decorative />
                    </span>
                    <span className="page-texture-card-name">
                      {language === "Bahasa Melayu"
                        ? "Kertas Garis"
                        : language === "中文"
                        ? "横线信纸"
                        : "Ruled Lines"}
                    </span>
                  </div>
                </button>

                {/* 2. Dot Grid */}
                <button
                  type="button"
                  className={`page-texture-card ${pageStyle === "dotted" ? "active" : ""}`}
                  onClick={() => handleSelectPageTexture("dotted")}
                >
                  {pageStyle === "dotted" && (
                    <span className="page-texture-check-badge">
                      <JournalIcon name="check" size={12} color="#ffffff" decorative />
                    </span>
                  )}
                  <div className="page-texture-mini-paper dotted" />
                  <div className="page-texture-card-meta">
                    <span className="page-texture-card-icon">
                      <JournalIcon name="dotted" size={15} decorative />
                    </span>
                    <span className="page-texture-card-name">
                      {language === "Bahasa Melayu"
                        ? "Kertas Titik"
                        : language === "中文"
                        ? "点阵纸"
                        : "Dot Grid"}
                    </span>
                  </div>
                </button>

                {/* 3. Blank Vellum */}
                <button
                  type="button"
                  className={`page-texture-card ${pageStyle === "plain" ? "active" : ""}`}
                  onClick={() => handleSelectPageTexture("plain")}
                >
                  {pageStyle === "plain" && (
                    <span className="page-texture-check-badge">
                      <JournalIcon name="check" size={12} color="#ffffff" decorative />
                    </span>
                  )}
                  <div className="page-texture-mini-paper plain" />
                  <div className="page-texture-card-meta">
                    <span className="page-texture-card-icon">
                      <JournalIcon name="plain" size={15} decorative />
                    </span>
                    <span className="page-texture-card-name">
                      {language === "Bahasa Melayu"
                        ? "Kertas Kosong"
                        : language === "中文"
                        ? "空白宣纸"
                        : "Blank Vellum"}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div className="diary-sheet-sticky-footer">
              <button
                type="button"
                className="btn btn-primary full"
                onClick={() => setShowPageTextureSheet(false)}
              >
                {language === "Bahasa Melayu" ? "Selesai" : language === "中文" ? "完成" : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FIX 3: MINIMAL FILTER BOTTOM SHEET                             */}
      {/* ============================================================== */}
      {showFilterSheet && (
        <div
          className="diary-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFilterSheet(false);
          }}
        >
          <div className="diary-writer-sheet" role="dialog" aria-modal="true">
            <div className="diary-sheet-handle" />
            <div className="diary-writer-header">
              <div className="diary-writer-title-group">
                <span className="diary-writer-icon">
                  <JournalIcon name="sliders" size={20} decorative />
                </span>
                <div>
                  <h3>
                    {language === "Bahasa Melayu"
                      ? "Tapis Refleksi"
                      : language === "中文"
                      ? "筛选手帐与日记"
                      : "Filter Reflections"}
                  </h3>
                  <p>
                    {language === "Bahasa Melayu"
                      ? "Tapis mengikut tarikh dan suasana perasaan"
                      : language === "中文"
                      ? "按日期区间与情绪分类检索回忆"
                      : "Narrow down by date and emotional tone"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="diary-sheet-close-btn"
                onClick={() => setShowFilterSheet(false)}
                aria-label="Close"
              >
                <JournalIcon name="close" size={16} />
              </button>
            </div>

            <div className="diary-writer-scrollable-body">
              {/* 1. Date Section: Single Row of Chips */}
              <div className="diary-filter-section-title">
                <JournalIcon name="calendar" size={15} decorative />
                <span>
                  {language === "Bahasa Melayu"
                    ? "Tarikh"
                    : language === "中文"
                    ? "日期范围"
                    : "Date"}
                </span>
              </div>
              <div className="diary-date-chips-single-row">
                <button
                  type="button"
                  className={`diary-filter-chip ${draftDateFilter === "all" ? "active" : ""}`}
                  onClick={() => handleSelectDraftDate("all")}
                >
                  {language === "Bahasa Melayu" ? "Semua Tarikh" : language === "中文" ? "全部日期" : "All Dates"}
                </button>
                <button
                  type="button"
                  className={`diary-filter-chip ${draftDateFilter === "today" ? "active" : ""}`}
                  onClick={() => handleSelectDraftDate("today")}
                >
                  {language === "Bahasa Melayu" ? "Hari Ini" : language === "中文" ? "今天" : "Today"}
                </button>
                <button
                  type="button"
                  className={`diary-filter-chip ${draftDateFilter === "week" ? "active" : ""}`}
                  onClick={() => handleSelectDraftDate("week")}
                >
                  {language === "Bahasa Melayu" ? "Minggu Ini" : language === "中文" ? "本周" : "This Week"}
                </button>
                <button
                  type="button"
                  className={`diary-filter-chip ${draftDateFilter === "month" ? "active" : ""}`}
                  onClick={() => handleSelectDraftDate("month")}
                >
                  {language === "Bahasa Melayu" ? "Bulan Ini" : language === "中文" ? "本月" : "This Month"}
                </button>
                <button
                  type="button"
                  className={`diary-filter-chip ${draftDateFilter === "custom" ? "active" : ""}`}
                  onClick={() => {
                    handleOpenCalendarSheet();
                  }}
                >
                  <JournalIcon name="calendar" size={13} decorative />
                  <span>
                    {draftCustomDateStart
                      ? formatPickedDateLabel()
                      : language === "Bahasa Melayu"
                      ? "Pilih tarikh"
                      : language === "中文"
                      ? "选择日期"
                      : "Pick date"}
                  </span>
                </button>
              </div>

              {/* 2. Mood Section: Compact Wrapping Grid, Multi-Select */}
              <div className="diary-filter-section-title">
                <JournalIcon name="sparkles" size={15} decorative />
                <span>
                  {language === "Bahasa Melayu"
                    ? "Suasana Hati (Boleh Pilih Banyak)"
                    : language === "中文"
                    ? "心绪感受（可多选）"
                    : "Mood (Multi-Select)"}
                </span>
              </div>
              <div className="diary-mood-wrapping-chips">
                <button
                  type="button"
                  className={`diary-mood-chip ${draftMoodFilters.length === 0 ? "active" : ""}`}
                  onClick={() => setDraftMoodFilters([])}
                >
                  <JournalIcon name="sparkles" size={14} decorative />
                  <span>
                    {language === "Bahasa Melayu" ? "Semua Mood" : language === "中文" ? "全部心情" : "All Moods"}
                  </span>
                </button>

                {DIARY_MOOD_OPTIONS.map((mood) => {
                  const isSelected = draftMoodFilters.includes(mood.key);
                  const label =
                    language === "Bahasa Melayu"
                      ? mood.labelBm
                      : language === "中文"
                      ? mood.labelZh
                      : mood.label;
                  return (
                    <button
                      key={mood.key}
                      type="button"
                      className={`diary-mood-chip ${isSelected ? "active" : ""}`}
                      onClick={() => handleToggleDraftMood(mood.key)}
                    >
                      <JournalIcon name={mood.icon} size={14} decorative />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sticky Footer: Reset (text) & Show results (teal pill with count) */}
            <div className="diary-sheet-sticky-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleResetDraftFilters}
              >
                {language === "Bahasa Melayu" ? "Set Semula" : language === "中文" ? "重置" : "Reset"}
              </button>
              <button
                type="button"
                className="btn btn-primary grow"
                onClick={handleApplyFilterSheet}
              >
                <JournalIcon name="check" size={15} decorative />
                <span>
                  {language === "Bahasa Melayu"
                    ? `Papar Hasil (${draftFilterResultCount})`
                    : language === "中文"
                    ? `显示结果 (${draftFilterResultCount})`
                    : `Show results (${draftFilterResultCount})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FIX 4: CHANGE COVER COLOR BOTTOM SHEET (FROM "..." MENU)       */}
      {/* ============================================================== */}
      {showChangeCoverSheet && activeBook && (
        <div
          className="diary-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowChangeCoverSheet(false);
          }}
        >
          <div className="diary-writer-sheet" role="dialog" aria-modal="true">
            <div className="diary-sheet-handle" />
            <div className="diary-writer-header">
              <div className="diary-writer-title-group">
                <span className="diary-writer-icon">
                  <JournalIcon name="palette" size={20} decorative />
                </span>
                <div>
                  <h3>
                    {language === "Bahasa Melayu"
                      ? "Tukar Warna Kulit Buku"
                      : language === "中文"
                      ? "更改封面色彩"
                      : "Change Cover Color"}
                  </h3>
                  <p>
                    {language === "Bahasa Melayu"
                      ? "Pilih palet pratetap atau sesuaikan warna anda sendiri"
                      : language === "中文"
                      ? "挑选预设治愈色调，或自定义专属书脊色彩"
                      : "Choose a preset swatch or mix your custom palette"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="diary-sheet-close-btn"
                onClick={() => setShowChangeCoverSheet(false)}
                aria-label="Close"
              >
                <JournalIcon name="close" size={16} />
              </button>
            </div>

            <div className="diary-writer-scrollable-body">
              {/* Live Spine Preview */}
              <div className="spine-preview-container">
                <div
                  className="book-spine-card"
                  style={{
                    height: "165px",
                    width: "42px",
                    backgroundColor: changeCoverColorInput,
                    color: getAccessibleTextColor(changeCoverColorInput),
                  }}
                >
                  <div className="spine-top-band" />
                  <div
                    className="spine-ribbon"
                    style={{
                      backgroundColor: getDerivedRibbonColor(changeCoverColorInput),
                    }}
                  />
                  <span
                    className="spine-title-vertical"
                    style={{ fontSize: getSpineFontSize(activeBook.title) }}
                  >
                    {activeBook.title}
                  </span>
                  <div className="spine-base-meta">
                    <JournalIcon name="bookOpen" size={11} decorative />
                    <span>{activeBookPages.length || 1}</span>
                  </div>
                  <div className="spine-bottom-band" />
                </div>
              </div>

              {/* Color Picker Swatches & Inline Picker Panel */}
              {renderColorPickerControl(
                changeCoverColorInput,
                setChangeCoverColorInput,
                showCustomPickerCover,
                setShowCustomPickerCover
              )}
            </div>

            <div className="diary-sheet-sticky-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowChangeCoverSheet(false)}
              >
                {language === "Bahasa Melayu" ? "Batal" : language === "中文" ? "取消" : "Cancel"}
              </button>
              <button
                type="button"
                className="btn btn-primary grow"
                onClick={handleSaveChangeCover}
              >
                <JournalIcon name="check" size={15} decorative />
                <span>
                  {language === "Bahasa Melayu"
                    ? "Gunakan Warna"
                    : language === "中文"
                    ? "保存色彩修改"
                    : "Apply Color"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* RENAME BOOK MODAL (FROM "..." MENU)                            */}
      {/* ============================================================== */}
      {showRenameBookModal && activeBook && (
        <div
          className="diary-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRenameBookModal(false);
          }}
        >
          <div className="diary-confirm-modal-box" role="dialog" aria-modal="true">
            <span className="diary-confirm-icon">
              <JournalIcon name="pen" size={26} decorative />
            </span>
            <h4>
              {language === "Bahasa Melayu"
                ? "Namakan Semula Buku"
                : language === "中文"
                ? "重命名手帐"
                : "Rename Book"}
            </h4>

            <input
              type="text"
              className="diary-writer-input"
              style={{ margin: "14px 0", textAlign: "center", fontWeight: 700 }}
              value={renameBookTitleInput}
              onChange={(e) => setRenameBookTitleInput(e.target.value)}
              placeholder={language === "中文" ? "手帐书名..." : "Book title..."}
              maxLength={60}
              autoFocus
            />

            <div className="diary-confirm-btn-row">
              <button
                type="button"
                className="btn btn-ghost grow"
                onClick={() => setShowRenameBookModal(false)}
              >
                {language === "Bahasa Melayu" ? "Batal" : language === "中文" ? "取消" : "Cancel"}
              </button>
              <button
                type="button"
                className="btn btn-primary grow"
                onClick={handleSaveRenameBook}
                disabled={!renameBookTitleInput.trim()}
              >
                {language === "Bahasa Melayu" ? "Simpan" : language === "中文" ? "确认重命名" : "Rename"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* BOOK INFO BOTTOM SHEET (FROM "..." MENU OR SHELF)              */}
      {/* ============================================================== */}
      {showBookInfoModal && selectedBookForInfo && (
        <div
          className="diary-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBookInfoModal(false);
          }}
        >
          <div className="diary-writer-sheet" role="dialog" aria-modal="true">
            <div className="diary-sheet-handle" />
            <div className="diary-writer-header">
              <div className="diary-writer-title-group">
                <span className="diary-writer-icon">
                  <JournalIcon name="info" size={20} decorative />
                </span>
                <div>
                  <h3>
                    {language === "Bahasa Melayu"
                      ? "Maklumat Buku"
                      : language === "中文"
                      ? "手帐详细信息"
                      : "Book Information"}
                  </h3>
                  <p>
                    {language === "Bahasa Melayu"
                      ? "Butiran dan statistik halaman buku ini"
                      : language === "中文"
                      ? "手帐归属分类、页数与创建记录"
                      : "Overview, shelf category, and reflection pages"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="diary-sheet-close-btn"
                onClick={() => setShowBookInfoModal(false)}
                aria-label="Close"
              >
                <JournalIcon name="close" size={16} />
              </button>
            </div>

            <div className="diary-writer-scrollable-body">
              {/* Spine Preview in Info */}
              <div className="spine-preview-container">
                <div
                  className="book-spine-card"
                  style={{
                    height: "165px",
                    width: "42px",
                    backgroundColor: selectedBookForInfo.coverColor,
                    color: getAccessibleTextColor(selectedBookForInfo.coverColor),
                  }}
                >
                  <div className="spine-top-band" />
                  <div
                    className="spine-ribbon"
                    style={{
                      backgroundColor: getDerivedRibbonColor(selectedBookForInfo.coverColor),
                    }}
                  />
                  <span
                    className="spine-title-vertical"
                    style={{ fontSize: getSpineFontSize(selectedBookForInfo.title) }}
                  >
                    {selectedBookForInfo.title}
                  </span>
                  <div className="spine-base-meta">
                    <JournalIcon name="bookOpen" size={11} decorative />
                    <span>
                      {journalEntries.filter((e) => (e as any).bookId === selectedBookForInfo.id).length}
                    </span>
                  </div>
                  <div className="spine-bottom-band" />
                </div>
              </div>

              {/* Information Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="page-index-item" style={{ cursor: "default" }}>
                  <div>
                    <strong style={{ fontSize: "14px" }}>{selectedBookForInfo.title}</strong>
                    <small style={{ color: "var(--muted)", display: "block", marginTop: "2px" }}>
                      {shelves.find((s) => s.id === selectedBookForInfo.shelfId)?.name || "Shelf"} •{" "}
                      {journalEntries.filter((e) => (e as any).bookId === selectedBookForInfo.id).length} pages
                    </small>
                  </div>
                </div>

                {selectedBookForInfo.description && (
                  <div
                    style={{
                      background: "#faf8f5",
                      border: "1px solid var(--line)",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "12.5px",
                      color: "var(--muted)",
                      lineHeight: "1.5",
                      fontStyle: "italic",
                    }}
                  >
                    "{selectedBookForInfo.description}"
                  </div>
                )}
              </div>
            </div>

            <div className="diary-sheet-sticky-footer">
              <button
                type="button"
                className="btn btn-secondary grow"
                onClick={() => {
                  setShowBookInfoModal(false);
                  handleOpenEditBook(selectedBookForInfo);
                }}
              >
                <JournalIcon name="pen" size={14} decorative />
                <span>{language === "中文" ? "编辑手帐详情" : "Edit Details"}</span>
              </button>
              <button
                type="button"
                className="btn btn-primary grow"
                onClick={() => setShowBookInfoModal(false)}
              >
                {language === "中文" ? "关闭" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FIX A: CUSTOM CALENDAR BOTTOM SHEET (APP STYLE, NOT NATIVE)    */}
      {/* ============================================================== */}
      {showCalendarSheet && (
        <div
          className="diary-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCalendarSheet(false);
          }}
        >
          <div className="diary-writer-sheet calendar-bottom-sheet" role="dialog" aria-modal="true">
            {/* 1. Fixed Header */}
            <div className="diary-sheet-handle" />
            <div className="diary-writer-header">
              <div className="diary-writer-title-group">
                <span className="diary-writer-icon">
                  <JournalIcon name="calendar" size={20} decorative />
                </span>
                <div>
                  <h3>
                    {language === "Bahasa Melayu"
                      ? "Pilih Tarikh atau Julat"
                      : language === "中文"
                      ? "选择日期或时间范围"
                      : "Select Date or Range"}
                  </h3>
                  <p>
                    {language === "Bahasa Melayu"
                      ? "Tapis halaman diari mengikut hari atau tempoh"
                      : language === "中文"
                      ? "按特定日子或起止区间查看日记页面"
                      : "Filter reflections by day or custom timeframe"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="diary-sheet-close-btn"
                onClick={() => setShowCalendarSheet(false)}
                aria-label="Close calendar"
              >
                <JournalIcon name="close" size={16} />
              </button>
            </div>

            {/* 2. Scrollable Body with Interactive Calendar Grid */}
            <div className="diary-writer-scrollable-body calendar-grid-body">
              {/* Month Navigation Row */}
              <div className="calendar-month-nav">
                <button
                  type="button"
                  className="calendar-nav-arrow"
                  onClick={handlePrevMonth}
                  aria-label="Previous month"
                >
                  <JournalIcon name="chevronLeft" size={18} />
                </button>
                <strong className="calendar-month-title">{calendarMonthLabel}</strong>
                <button
                  type="button"
                  className="calendar-nav-arrow"
                  onClick={handleNextMonth}
                  aria-label="Next month"
                >
                  <JournalIcon name="chevronRight" size={18} />
                </button>
              </div>

              {/* Weekday Row */}
              <div className="calendar-weekday-row">
                {weekdayLabels.map((wd, i) => (
                  <span key={i} className="calendar-weekday-cell">
                    {wd}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="calendar-days-grid">
                {calendarDays.map((cell, idx) => {
                  if (!cell.day || !cell.dateKey) {
                    return <div key={idx} className="calendar-day-cell empty" />;
                  }

                  const dKey = cell.dateKey;
                  const isToday = dKey === todayKey;
                  const hasPages = daysWithPages.has(dKey);
                  const isStart = calendarDraftStart === dKey;
                  const isEnd = calendarDraftEnd === dKey;
                  const isInRange =
                    calendarDraftStart &&
                    calendarDraftEnd &&
                    dKey > calendarDraftStart &&
                    dKey < calendarDraftEnd;

                  return (
                    <button
                      key={dKey}
                      type="button"
                      className={`calendar-day-cell ${isToday ? "today" : ""} ${
                        isStart ? "selected-start" : ""
                      } ${isEnd ? "selected-end" : ""} ${isInRange ? "in-range" : ""}`}
                      onClick={() => handleSelectCalendarDay(dKey)}
                    >
                      <span className="day-number">{cell.day}</span>
                      {hasPages && <span className="day-entry-dot" aria-label="Has entry" />}
                    </button>
                  );
                })}
              </div>

              {/* Selection Summary */}
              <div className="calendar-selection-summary">
                {calendarDraftStart ? (
                  <span>
                    <JournalIcon name="check" size={14} decorative />
                    <strong>
                      {calendarDraftEnd && calendarDraftEnd !== calendarDraftStart
                        ? language === "中文"
                          ? `已选范围：${calendarDraftStart} 至 ${calendarDraftEnd}`
                          : `Range: ${calendarDraftStart} to ${calendarDraftEnd}`
                        : language === "中文"
                        ? `已选日期：${calendarDraftStart}`
                        : `Date: ${calendarDraftStart}`}
                    </strong>
                  </span>
                ) : (
                  <span className="summary-hint">
                    {language === "Bahasa Melayu"
                      ? "Ketik satu hari, atau ketik hari kedua untuk memilih julat tarikh."
                      : language === "中文"
                      ? "点击单日进行筛选，或连续点击两个日期选择区间范围。"
                      : "Tap a day to select, or tap a second day to select a range."}
                  </span>
                )}
              </div>
            </div>

            {/* 3. Sticky Footer with Clear & Apply Pill */}
            <div className="diary-sheet-sticky-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleClearCalendarDraft}
              >
                {language === "Bahasa Melayu"
                  ? "Kosongkan"
                  : language === "中文"
                  ? "清空选择"
                  : "Clear"}
              </button>
              <button
                type="button"
                className="btn btn-primary grow"
                onClick={handleApplyCalendarSelection}
              >
                {language === "Bahasa Melayu"
                  ? "Gunakan Tarikh"
                  : language === "中文"
                  ? "应用筛选"
                  : "Apply Filter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FIX B & FIX C: "CREATE A NEW BOOK" SHEET (3-PART LAYOUT)       */}
      {/* ============================================================== */}
      {showCreateBookSheet && (
        <div
          className="diary-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateBookSheet(false);
          }}
        >
          <div className="diary-writer-sheet" role="dialog" aria-modal="true">
            {/* 1. Header: Pinned at top */}
            <div className="diary-sheet-handle" />
            <div className="diary-writer-header">
              <div className="diary-writer-title-group">
                <span className="diary-writer-icon">
                  <JournalIcon name="stackedBooks" size={22} decorative />
                </span>
                <div>
                  <h3>
                    {editingBook
                      ? language === "Bahasa Melayu"
                        ? "Sunting Butiran Buku"
                        : language === "中文"
                        ? "编辑手帐信息"
                        : "Edit Book Details"
                      : language === "Bahasa Melayu"
                      ? "Cipta Buku Baharu"
                      : language === "中文"
                      ? "新建手帐"
                      : "Create a New Book"}
                  </h3>
                  <p>
                    {language === "Bahasa Melayu"
                      ? "Pilih warna kulit dan tajuk buku anda"
                      : language === "中文"
                      ? "挑选治愈的书脊色彩并命名"
                      : "Personalize your book's spine, color, and story"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="diary-sheet-close-btn"
                onClick={() => setShowCreateBookSheet(false)}
                aria-label="Close sheet"
              >
                <JournalIcon name="close" size={16} />
              </button>
            </div>

            {/* 2. Body: Scrollable with inline icons and labels on same line */}
            <div className="diary-writer-scrollable-body">
              {/* Live Spine Preview */}
              <div className="spine-preview-container">
                <div
                  className="book-spine-card"
                  style={{
                    height: "165px",
                    width: "42px",
                    backgroundColor: bookColorInput,
                    color: getAccessibleTextColor(bookColorInput),
                  }}
                >
                  <div className="spine-top-band" />
                  <div
                    className="spine-ribbon"
                    style={{
                      backgroundColor: getDerivedRibbonColor(bookColorInput),
                    }}
                  />
                  <span
                    className="spine-title-vertical"
                    style={{
                      fontSize: `${getSpineFontSize(
                        bookTitleInput.trim() ||
                          (language === "Bahasa Melayu"
                            ? "Buku Baharu"
                            : language === "中文"
                            ? "新手帐"
                            : "New Book")
                      )}px`,
                    }}
                  >
                    {bookTitleInput.trim() ||
                      (language === "Bahasa Melayu"
                        ? "Buku Baharu"
                        : language === "中文"
                        ? "新手帐"
                        : "New Book")}
                  </span>
                  <div className="spine-base-meta">
                    <JournalIcon name="bookOpen" size={11} decorative />
                    <span>1</span>
                  </div>
                  <div className="spine-bottom-band" />
                </div>
              </div>

              {/* Title Field with Inline Icon */}
              <div className="diary-writer-form-group">
                <label className="diary-writer-inline-label">
                  <JournalIcon name="tag" size={15} decorative />
                  <span>
                    {language === "Bahasa Melayu"
                      ? "Tajuk Buku"
                      : language === "中文"
                      ? "手帐书名"
                      : "Book Title"}
                  </span>
                </label>
                <input
                  ref={bookTitleInputRef}
                  type="text"
                  className={`diary-writer-input title-input ${createBookTitleError ? "error" : ""}`}
                  value={bookTitleInput}
                  onChange={(e) => {
                    setBookTitleInput(e.target.value);
                    if (createBookTitleError && e.target.value.trim()) {
                      setCreateBookTitleError(false);
                    }
                  }}
                  placeholder={
                    language === "Bahasa Melayu"
                      ? "Cth: Detik Menenangkan, Impian 2026..."
                      : language === "中文"
                      ? "例如：微风与落叶、未寄出的信、2026心愿..."
                      : "e.g., Midnight Thoughts, Quiet Reflections..."
                  }
                  maxLength={60}
                />
                {createBookTitleError && (
                  <span className="field-error-tip">
                    <JournalIcon name="info" size={12} decorative />
                    <span>
                      {language === "Bahasa Melayu"
                        ? "Sila berikan tajuk untuk buku anda dahulu."
                        : language === "中文"
                        ? "请先为手帐填写一个书名。"
                        : "Give your book a title first."}
                    </span>
                  </span>
                )}
              </div>

              {/* Cover Color Swatches & Custom Picker (Global Rule 3: Single language, no parentheses) */}
              <div className="diary-writer-form-group">
                <label className="diary-writer-inline-label">
                  <JournalIcon name="palette" size={15} decorative />
                  <span>
                    {language === "Bahasa Melayu"
                      ? "Warna Kulit & Tulang Buku"
                      : language === "中文"
                      ? "书脊色彩"
                      : "Cover & Spine Color"}
                  </span>
                </label>
                {renderColorPickerControl(
                  bookColorInput,
                  setBookColorInput,
                  showCustomPickerCreate,
                  setShowCustomPickerCreate
                )}
              </div>

              {/* Shelf Selection (Global Rule 3: Single language, no parentheses) */}
              <div className="diary-writer-form-group">
                <label className="diary-writer-inline-label">
                  <JournalIcon name="bookshelf" size={15} decorative />
                  <span>
                    {language === "Bahasa Melayu"
                      ? "Letakkan di Rak Mana"
                      : language === "中文"
                      ? "归类到书架"
                      : "Place on Shelf"}
                  </span>
                </label>
                <select
                  className="diary-writer-input"
                  value={bookShelfIdInput}
                  onChange={(e) => setBookShelfIdInput(e.target.value)}
                >
                  {shelves.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Description */}
              <div className="diary-writer-form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="diary-writer-inline-label">
                    <JournalIcon name="fileText" size={15} decorative />
                    <span>
                      {language === "Bahasa Melayu"
                        ? "Penerangan Ringkas (Pilihan)"
                        : language === "中文"
                        ? "手帐小引 / 寄语（可选）"
                        : "Short Description (Optional)"}
                    </span>
                  </label>
                  <small style={{ color: "var(--muted)", fontSize: "11px" }}>
                    {bookDescInput.length}/180
                  </small>
                </div>
                <textarea
                  className="diary-writer-textarea"
                  rows={3}
                  value={bookDescInput}
                  onChange={(e) => setBookDescInput(e.target.value)}
                  placeholder={
                    language === "Bahasa Melayu"
                      ? "Apakah tema atau perasaan yang ingin anda simpan dalam buku ini?"
                      : language === "中文"
                      ? "这本手帐陪伴您记录怎样的心情？"
                      : "What feelings or theme does this book hold?"
                  }
                  maxLength={180}
                />
              </div>
            </div>

            {/* 3. Footer: Pinned at bottom with primary teal pill button and cancel */}
            <div className="diary-sheet-sticky-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowCreateBookSheet(false)}
              >
                {language === "Bahasa Melayu" ? "Batal" : language === "中文" ? "取消" : "Cancel"}
              </button>

              <button
                type="button"
                className="btn btn-primary grow"
                onClick={handleSaveBook}
              >
                <JournalIcon name="pen" size={15} decorative />
                <span>
                  {editingBook
                    ? language === "Bahasa Melayu"
                      ? "Simpan Perubahan"
                      : language === "中文"
                      ? "保存手帐修改"
                      : "Save Changes"
                    : language === "Bahasa Melayu"
                    ? "Cipta Buku & Mula Menulis"
                    : language === "中文"
                    ? "创建手帐并开始记录"
                    : "Create Book & Start Writing"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PAGE INDEX DRAWER (THUMBNAILS & DIRECT JUMP)                   */}
      {/* ============================================================== */}
      {showPageIndexDrawer && (
        <div className="page-index-drawer" onClick={() => setShowPageIndexDrawer(false)}>
          <div className="page-index-panel" onClick={(e) => e.stopPropagation()}>
            <div className="page-index-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <JournalIcon name="pageIndex" size={18} decorative />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>
                  {language === "Bahasa Melayu"
                    ? "Indeks Halaman"
                    : language === "中文"
                    ? "页面目录"
                    : "Page Index"}
                </h3>
              </div>
              <button
                type="button"
                className="diary-sheet-close-btn"
                onClick={() => setShowPageIndexDrawer(false)}
                aria-label="Close page index"
              >
                <JournalIcon name="close" size={16} />
              </button>
            </div>

            <div className="diary-writer-scrollable-body" style={{ padding: "0" }}>
              <button
                type="button"
                className="btn btn-primary full"
                style={{ margin: "0 0 14px 0" }}
                onClick={() => handleAddNewPageToActiveBook()}
              >
                <JournalIcon name="plus" size={15} decorative />
                <span>
                  {language === "Bahasa Melayu"
                    ? "Tambah Halaman Baharu"
                    : language === "中文"
                    ? "新增一页"
                    : "Add New Page"}
                </span>
              </button>

              <div className="page-index-list">
                {activeBookPages.map((page, idx) => {
                  const isCurrent = idx === currentPageIndex;
                  return (
                    <div
                      key={page.id}
                      className={`page-index-item ${isCurrent ? "current" : ""}`}
                      onClick={() => {
                        setCurrentPageIndex(idx);
                        setShowPageIndexDrawer(false);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: "13px",
                            color: isCurrent ? "var(--coral-dark)" : "var(--muted)",
                          }}
                        >
                          P.{idx + 1}
                        </span>
                        <div>
                          <strong style={{ display: "block", fontSize: "14px" }}>
                            {page.title ||
                              (page.content
                                ? page.content.slice(0, 32) + "..."
                                : language === "中文"
                                ? "无题心声"
                                : "Untitled reflection")}
                          </strong>
                          <small style={{ color: "var(--muted)", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <JournalIcon name="calendar" size={12} decorative />
                            <span>{page.dateKey || getLocalDateKey(page.entryDate)}</span>
                          </small>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {page.moodLabel && (
                          <JournalIcon
                            name={getMoodIconName(page.moodLabel)}
                            size={15}
                            decorative
                          />
                        )}
                        {page.photoUrl && (
                          <JournalIcon name="camera" size={14} decorative />
                        )}
                        {isCurrent && (
                          <span
                            style={{
                              fontSize: "10px",
                              background: "var(--coral)",
                              color: "white",
                              padding: "2px 6px",
                              borderRadius: "100px",
                              fontWeight: 700,
                            }}
                          >
                            {language === "中文" ? "当前" : "Current"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CHOOSE BOOK TO WRITE IN MODAL (3-PART LAYOUT)                  */}
      {/* ============================================================== */}
      {showChooseBookModal && (
        <div
          className="diary-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowChooseBookModal(false);
          }}
        >
          <div className="diary-writer-sheet" role="dialog" aria-modal="true">
            <div className="diary-sheet-handle" />

            <div className="diary-writer-header">
              <div className="diary-writer-title-group">
                <span className="diary-writer-icon">
                  <JournalIcon name="pen" size={20} decorative />
                </span>
                <div>
                  <h3>
                    {language === "Bahasa Melayu"
                      ? "Pilih Buku Diari"
                      : language === "中文"
                      ? "选择记录手帐"
                      : "Choose a Book"}
                  </h3>
                  <p>
                    {language === "Bahasa Melayu"
                      ? "Di manakah anda ingin simpan catatan hari ini?"
                      : language === "中文"
                      ? "今天的心情想要安放在哪本手帐？"
                      : "Which book would you like to add this reflection to?"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="diary-sheet-close-btn"
                onClick={() => setShowChooseBookModal(false)}
                aria-label="Close modal"
              >
                <JournalIcon name="close" size={16} />
              </button>
            </div>

            <div className="diary-writer-scrollable-body">
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {books.map((b) => {
                  const bPages = journalEntries.filter((e) => (e as any).bookId === b.id);
                  const shelf = shelves.find((s) => s.id === b.shelfId);

                  return (
                    <div
                      key={b.id}
                      className="page-index-item"
                      onClick={() => handleSelectBookToWrite(b.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "46px",
                            backgroundColor: b.coverColor,
                            borderRadius: "4px",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <JournalIcon name="bookOpen" size={16} decorative color="white" />
                        </div>
                        <div>
                          <strong style={{ fontSize: "14px" }}>{b.title}</strong>
                          <small style={{ color: "var(--muted)", display: "block" }}>
                            {shelf?.name || "Shelf"} • {bPages.length} pages
                          </small>
                        </div>
                      </div>

                      <span style={{ color: "var(--coral)", display: "flex", alignItems: "center" }}>
                        <JournalIcon name="pen" size={16} decorative />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="diary-sheet-sticky-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowChooseBookModal(false)}
              >
                {language === "中文" ? "取消" : "Cancel"}
              </button>
              <button
                type="button"
                className="btn btn-primary grow"
                onClick={() => {
                  setShowChooseBookModal(false);
                  handleOpenCreateBook();
                }}
              >
                <JournalIcon name="plus" size={15} decorative />
                <span>
                  {language === "Bahasa Melayu"
                    ? "Cipta Buku Baharu"
                    : language === "中文"
                    ? "创建一本新手帐"
                    : "Create a New Book"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SHELF CREATE / EDIT MODAL                                      */}
      {/* ============================================================== */}
      {showShelfModal && (
        <div
          className="diary-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShelfModal(false);
          }}
        >
          <div className="diary-confirm-modal-box" role="dialog" aria-modal="true">
            <span className="diary-confirm-icon">
              <JournalIcon name="bookshelf" size={28} decorative />
            </span>
            <h4>
              {editingShelf
                ? language === "Bahasa Melayu"
                  ? "Sunting Rak Diari"
                  : language === "中文"
                  ? "管理书架分类"
                  : "Shelf Options"
                : language === "Bahasa Melayu"
                ? "Cipta Rak Baharu"
                : language === "中文"
                ? "新建书架分类"
                : "Create New Shelf"}
            </h4>

            <input
              type="text"
              className="diary-writer-input"
              style={{ margin: "14px 0", textAlign: "center", fontWeight: 700 }}
              value={shelfNameInput}
              onChange={(e) => setShelfNameInput(e.target.value)}
              placeholder={
                language === "中文"
                  ? "例如：未寄出的信、深夜树洞..."
                  : "e.g., Letters I'll Never Send, Midnight Reflections..."
              }
              maxLength={40}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                type="button"
                className="btn btn-primary full"
                onClick={handleSaveShelf}
                disabled={!shelfNameInput.trim()}
              >
                {editingShelf
                  ? language === "Bahasa Melayu"
                    ? "Namakan Semula"
                    : language === "中文"
                    ? "重命名书架"
                    : "Rename Shelf"
                  : language === "Bahasa Melayu"
                  ? "Cipta Rak"
                  : language === "中文"
                  ? "确认创建"
                  : "Create Shelf"}
              </button>

              {editingShelf && shelves.length > 1 && (
                <button
                  type="button"
                  className="btn btn-danger full"
                  onClick={() => {
                    setShelfToDelete(editingShelf);
                    setShowShelfModal(false);
                  }}
                >
                  <JournalIcon name="trash" size={15} decorative />
                  <span>
                    {language === "Bahasa Melayu"
                      ? "Padam Rak Ini"
                      : language === "中文"
                      ? "删除此书架"
                      : "Delete Shelf"}
                  </span>
                </button>
              )}

              <button
                type="button"
                className="btn btn-ghost full"
                onClick={() => setShowShelfModal(false)}
              >
                {language === "Bahasa Melayu" ? "Batal" : language === "中文" ? "取消" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DELETE SHELF CONFIRMATION MODAL                                */}
      {/* ============================================================== */}
      {shelfToDelete && (
        <div className="diary-modal-backdrop">
          <div className="diary-confirm-modal-box" role="dialog" aria-modal="true">
            <span className="diary-confirm-icon">
              <JournalIcon name="info" size={28} decorative />
            </span>
            <h4>
              {language === "Bahasa Melayu"
                ? `Padam rak "${shelfToDelete.name}"?`
                : language === "中文"
                ? `确定删除书架 "${shelfToDelete.name}"？`
                : `Delete shelf "${shelfToDelete.name}"?`}
            </h4>
            <p>
              {language === "Bahasa Melayu"
                ? "Buku di atas rak ini akan dipindahkan ke rak lain secara selamat."
                : language === "中文"
                ? "此书架上的所有手帐将自动移至其他书架，内容不会丢失。"
                : "Books on this shelf will be safely relocated to another shelf."}
            </p>
            <div className="diary-confirm-btn-row">
              <button
                type="button"
                className="btn btn-secondary grow"
                onClick={() => setShelfToDelete(null)}
              >
                {language === "Bahasa Melayu" ? "Batal" : language === "中文" ? "取消" : "Cancel"}
              </button>
              <button
                type="button"
                className="btn btn-danger grow"
                onClick={handleConfirmDeleteShelf}
              >
                {language === "Bahasa Melayu" ? "Ya, Padam" : language === "中文" ? "确认删除" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DELETE BOOK CONFIRMATION MODAL                                 */}
      {/* ============================================================== */}
      {bookToDelete && (
        <div className="diary-modal-backdrop">
          <div className="diary-confirm-modal-box" role="dialog" aria-modal="true">
            <span className="diary-confirm-icon">
              <JournalIcon name="info" size={28} decorative />
            </span>
            <h4>
              {language === "Bahasa Melayu"
                ? `Padam buku "${bookToDelete.title}"?`
                : language === "中文"
                ? `确定删除手帐 "${bookToDelete.title}"？`
                : `Delete book "${bookToDelete.title}"?`}
            </h4>
            <p>
              {language === "Bahasa Melayu"
                ? "Semua halaman dan catatan di dalam buku ini akan dipadam secara kekal."
                : language === "中文"
                ? "此手帐内的所有日记与页面都将被永久删除。"
                : "All pages and reflections inside this book will be permanently deleted."}
            </p>
            <div className="diary-confirm-btn-row">
              <button
                type="button"
                className="btn btn-secondary grow"
                onClick={() => setBookToDelete(null)}
              >
                {language === "Bahasa Melayu" ? "Batal" : language === "中文" ? "取消" : "Cancel"}
              </button>
              <button
                type="button"
                className="btn btn-danger grow"
                onClick={handleConfirmDeleteBook}
              >
                {language === "Bahasa Melayu" ? "Ya, Padam" : language === "中文" ? "确认删除" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DELETE PAGE CONFIRMATION MODAL                                 */}
      {/* ============================================================== */}
      {pageToDelete && (
        <div className="diary-modal-backdrop">
          <div className="diary-confirm-modal-box" role="dialog" aria-modal="true">
            <span className="diary-confirm-icon">
              <JournalIcon name="trash" size={28} decorative />
            </span>
            <h4>
              {language === "中文" ? "确定删除此页面？" : "Delete this page?"}
            </h4>
            <p>
              {language === "中文"
                ? "该页面的日记内容将被移除，手帐将自动调整页码。"
                : "This reflection will be permanently removed from this book."}
            </p>
            <div className="diary-confirm-btn-row">
              <button
                type="button"
                className="btn btn-secondary grow"
                onClick={() => setPageToDelete(null)}
              >
                {language === "中文" ? "取消" : "Cancel"}
              </button>
              <button
                type="button"
                className="btn btn-danger grow"
                onClick={handleConfirmDeletePage}
              >
                {language === "中文" ? "确认删除" : "Delete Page"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PHOTO ENLARGE PREVIEW MODAL                                    */}
      {/* ============================================================== */}
      {previewPhotoUrl && (
        <div className="diary-modal-backdrop" onClick={() => setPreviewPhotoUrl(null)}>
          <div className="diary-photo-zoom-container" onClick={(e) => e.stopPropagation()}>
            <img src={previewPhotoUrl} alt="Enlarged view" />
            <button
              type="button"
              className="diary-photo-zoom-close"
              onClick={() => setPreviewPhotoUrl(null)}
              aria-label="Close enlarged photo"
            >
              <JournalIcon name="close" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* AI MEMORY ADD/EDIT MODAL (ZERO EMOJIS, 3-PART CLEAN LAYOUT)     */}
      {/* ============================================================== */}
      {isAddingAiMemory && (
        <div
          className="diary-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddingAiMemory(false);
          }}
        >
          <div className="diary-confirm-modal-box" role="dialog" aria-modal="true">
            <span className="diary-confirm-icon">
              <JournalIcon name="bot" size={28} decorative />
            </span>
            <h4>
              {editingAiMemory
                ? language === "Bahasa Melayu"
                  ? "Sunting Memori AI"
                  : language === "中文"
                  ? "编辑 AI 记忆"
                  : "Edit AI Memory"
                : language === "Bahasa Melayu"
                ? "Tambah Memori AI"
                : language === "中文"
                ? "添加 AI 记忆"
                : "Add AI Memory"}
            </h4>

            <textarea
              className="diary-writer-textarea"
              rows={3}
              style={{ margin: "12px 0" }}
              value={newAiMemoryText}
              onChange={(e) => setNewAiMemoryText(e.target.value)}
              placeholder={
                language === "中文"
                  ? "例如：我喜欢晚上安静温习、考前容易焦虑、喜欢喝无糖茉莉绿茶..."
                  : "e.g. I prefer quiet study sessions at night, I get anxious before exams..."
              }
            />

            <select
              className="diary-writer-input"
              style={{ marginBottom: "16px" }}
              value={newAiMemoryCategory}
              onChange={(e) => setNewAiMemoryCategory(e.target.value)}
            >
              {AI_MEMORY_CATEGORIES.filter((c) => c !== "All").map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryLabel(cat, language)}
                </option>
              ))}
            </select>

            <div className="diary-confirm-btn-row">
              <button
                type="button"
                className="btn btn-secondary grow"
                onClick={() => setIsAddingAiMemory(false)}
              >
                {language === "中文" ? "取消" : "Cancel"}
              </button>
              <button
                type="button"
                className="btn btn-primary grow"
                onClick={handleSaveAiMemory}
              >
                {language === "中文" ? "保存记忆" : "Save Memory"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CLEAR ALL AI MEMORIES CONFIRMATION (OUTLINE TRASH ICON)         */}
      {/* ============================================================== */}
      {showClearConfirm && (
        <div className="diary-modal-backdrop">
          <div className="diary-confirm-modal-box">
            <span className="diary-confirm-icon">
              <JournalIcon name="trash" size={28} color="var(--danger)" decorative />
            </span>
            <h4>
              {language === "Bahasa Melayu"
                ? "Padam Semua Memori AI?"
                : language === "中文"
                ? "清空所有 AI 记忆？"
                : "Clear All AI Memories?"}
            </h4>
            <p>
              {language === "Bahasa Melayu"
                ? "Semua fakta yang diingati oleh bot sembang ONY akan dipadam."
                : language === "中文"
                ? "这将彻底清除 ONY 记住的所有日常细节与上下文。"
                : "This will remove all remembered context and preferences."}
            </p>
            <div className="diary-confirm-btn-row">
              <button
                type="button"
                className="btn btn-secondary grow"
                onClick={() => setShowClearConfirm(false)}
              >
                {language === "中文" ? "取消" : "Cancel"}
              </button>
              <button
                type="button"
                className="btn btn-danger grow"
                onClick={handleConfirmClearAllAiMemories}
              >
                {language === "中文" ? "确认清空" : "Clear All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
