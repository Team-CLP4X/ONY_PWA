import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
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
  syncUserBookshelfData,
  loadUserBookshelfData,
} from "../firebase/firestore";
import { useLanguage } from "../i18n/LanguageContext";
import { getCategoryLabel } from "../i18n/translations";
import {
  type JournalShelf,
  type JournalBook,
  type BookColorOption,
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
import { JournalIcon, getMoodIconName, type JournalIconName } from "./JournalIcon";

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
}

const DIARY_MOOD_OPTIONS = [
  { label: "Reflective", labelBm: "Merenung", labelZh: "沉思" },
  { label: "Peaceful", labelBm: "Damai", labelZh: "平静" },
  { label: "Grateful", labelBm: "Bersyukur", labelZh: "感恩" },
  { label: "Cozy", labelBm: "Selesa", labelZh: "惬意" },
  { label: "Hopeful", labelBm: "Penuh Harapan", labelZh: "充满希望" },
  { label: "Grounded", labelBm: "Tenang", labelZh: "踏实" },
  { label: "Tender / Sad", labelBm: "Sayu / Sedih", labelZh: "脆弱低落" },
  { label: "Overwhelmed", labelBm: "Terbeban", labelZh: "疲惫压抑" },
  { label: "Thoughtful", labelBm: "Banyak Fikir", labelZh: "若有所思" },
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
  onOpenBookChange,
}: DigitalJournalProps) {
  const { language } = useLanguage();

  // Top Section Switcher: Personal Diary vs AI Recall Memories
  const [activeTab, setActiveTab] = useState<"diary" | "ai_memory">("diary");

  // Bookshelf Data State
  const [shelves, setShelves] = useState<JournalShelf[]>(() => loadSavedShelves());
  const [books, setBooks] = useState<JournalBook[]>(() => loadSavedBooks());
  const [bookSort, setBookSort] = useState<BookSortOption>("last_edited");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [customDate, setCustomDate] = useState("");
  const [moodFilter, setMoodFilter] = useState<string | null>(null);

  // Bookshelf Animation State
  const [slidingSpineId, setSlidingSpineId] = useState<string | null>(null);

  // Open Book Fullscreen View State
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [isOpeningCover, setIsOpeningCover] = useState(false);
  const [pageStyle, setPageStyle] = useState<"lined" | "dotted" | "plain">("lined");
  const [showPageStyleMenu, setShowPageStyleMenu] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [pageTurnDirection, setPageTurnDirection] = useState<"none" | "turning-next" | "turning-prev">("none");
  const [showPageIndexDrawer, setShowPageIndexDrawer] = useState(false);

  // Notify parent of open book state to hide bottom nav when reading/writing a book
  useEffect(() => {
    onOpenBookChange?.(Boolean(activeBookId));
  }, [activeBookId, onOpenBookChange]);

  // Auto-Save State for Current Open Page
  const [pageSaveStatus, setPageSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals State
  const [showBookInfoModal, setShowBookInfoModal] = useState(false);
  const [selectedBookForInfo, setSelectedBookForInfo] = useState<JournalBook | null>(null);

  const [showCreateBookSheet, setShowCreateBookSheet] = useState(false);
  const [editingBook, setEditingBook] = useState<JournalBook | null>(null);
  const [bookTitleInput, setBookTitleInput] = useState("");
  const [bookDescInput, setBookDescInput] = useState("");
  const [bookColorInput, setBookColorInput] = useState(BOOK_COLOR_PALETTE[0].hex);
  const [bookShelfIdInput, setBookShelfIdInput] = useState(DEFAULT_SHELVES[0].id);

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

  // AI Memory Controls State (Preserved)
  const [aiMemoryCategory, setAiMemoryCategory] = useState("All");
  const [aiMemoryQuery, setAiMemoryQuery] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isAddingAiMemory, setIsAddingAiMemory] = useState(false);
  const [editingAiMemory, setEditingAiMemory] = useState<MemoryItem | null>(null);
  const [newAiMemoryText, setNewAiMemoryText] = useState("");
  const [newAiMemoryCategory, setNewAiMemoryCategory] = useState("About Me");

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

  // Filter journal pages based on current active controls (Search, Date, Mood)
  const isFilterActive = Boolean(searchQuery.trim() || moodFilter || dateFilter !== "all" || customDate);

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

      if (moodFilter && page.moodLabel !== moodFilter) {
        return false;
      }

      if (dateFilter === "custom" && customDate) {
        return page.dateKey === customDate;
      }
      if (dateFilter === "today") {
        return page.dateKey === todayKey;
      }
      if (dateFilter === "week") {
        const entryTs = new Date(page.entryDate || page.createdAt).getTime();
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return entryTs >= weekAgo;
      }
      if (dateFilter === "month") {
        const entryTs = new Date(page.entryDate || page.createdAt).getTime();
        const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return entryTs >= monthAgo;
      }

      return true;
    },
    [searchQuery, moodFilter, dateFilter, customDate, todayKey],
  );

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

    // If filter is active, try to jump to the first matching page
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

  // Add new page to currently active book (with optional initial content for automatic continuation)
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

    // Update book updatedAt
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
          : "New page added",
      );
    }
  };

  // Writing area auto-continuation: when text overflows page height, continue onto next page seamlessly
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
          const combined = overflow + (nextPage.content ? "\n" + nextPage.content : "");
          const nextList = journalEntries.map((e) => (e.id === nextPage.id ? { ...e, content: combined } : e));
          setJournalEntries(nextList);
          saveCachedJournalEntries(nextList);
          setCurrentPageIndex((p) => p + 1);
        } else {
          handleAddNewPageToActiveBook(overflow);
        }
        return;
      }
    }
    handleMutateCurrentPage({ content: newContent });
  };

  // Auto-Save Page Mutator
  const handleMutateCurrentPage = (patch: Partial<FirestoreJournalEntry>) => {
    if (!currentPage) return;
    setPageSaveStatus("saving");

    const nowIso = new Date().toISOString();
    const updatedEntry: FirestoreJournalEntry = {
      ...currentPage,
      ...patch,
      updatedAt: nowIso,
    };

    // Update state immediately for instant typing responsiveness
    const nextList = journalEntries.map((e) => (e.id === currentPage.id ? updatedEntry : e));
    setJournalEntries(nextList);

    // Update active book updatedAt
    if (activeBookId) {
      const updatedBooks = books.map((b) => (b.id === activeBookId ? { ...b, updatedAt: nowIso } : b));
      updateBooksState(updatedBooks);
    }

    // Debounced persist to storage & Firestore
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        saveCachedJournalEntries(nextList);
        if (currentUser && currentPage.id) {
          await updateJournalEntry(currentUser.uid, currentPage.id, patch);
        }
        setPageSaveStatus("saved");
      } catch (err) {
        console.warn("[ONY Book] Save failed:", err);
        setPageSaveStatus("error");
      }
    }, 600);
  };

  // Force Retry Save
  const handleRetrySave = () => {
    if (!currentPage) return;
    setPageSaveStatus("saving");
    try {
      saveCachedJournalEntries(journalEntries);
      if (currentUser && currentPage.id) {
        updateJournalEntry(currentUser.uid, currentPage.id, {
          title: currentPage.title,
          content: currentPage.content,
          moodEmoji: currentPage.moodEmoji,
          moodLabel: currentPage.moodLabel,
          photoUrl: currentPage.photoUrl,
        }).catch(() => {});
      }
      setPageSaveStatus("saved");
      notify("Changes saved");
    } catch {
      setPageSaveStatus("error");
    }
  };

  // Page Turn Handlers with Smooth Animation
  const handleGoToNextPage = () => {
    if (currentPageIndex < activeBookPages.length - 1) {
      setPageTurnDirection("turning-next");
      setTimeout(() => {
        setCurrentPageIndex((prev) => prev + 1);
        setPageTurnDirection("none");
      }, 160);
    } else {
      // Prompt to create a new page if on last page
      handleAddNewPageToActiveBook();
    }
  };

  const handleGoToPrevPage = () => {
    if (currentPageIndex > 0) {
      setPageTurnDirection("turning-prev");
      setTimeout(() => {
        setCurrentPageIndex((prev) => prev - 1);
        setPageTurnDirection("none");
      }, 160);
    }
  };

  // Touch Swipe for Mobile Page Turn
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    touchStartXRef.current = null;

    if (diff > 50) {
      // Swiped Left -> Next Page
      handleGoToNextPage();
    } else if (diff < -50) {
      // Swiped Right -> Prev Page
      handleGoToPrevPage();
    }
  };

  // Small Toolbar Formatting Helpers
  const handleFormatText = (type: "bold" | "italic" | "heading" | "bullet" | "quote") => {
    const textarea = pageTextareaRef.current;
    if (!textarea || !currentPage) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = currentPage.content || "";
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
      case "bullet":
        prefix = "\n- ";
        suffix = "";
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
          : "Please choose an image under 4MB",
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
            : "Photo attached to page",
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
        : "Page deleted",
    );
  };

  // Create or Edit Book Submit
  const handleOpenCreateBook = (targetShelfId?: string) => {
    setEditingBook(null);
    setBookTitleInput("");
    setBookDescInput("");
    setBookColorInput(BOOK_COLOR_PALETTE[Math.floor(Math.random() * BOOK_COLOR_PALETTE.length)].hex);
    setBookShelfIdInput(targetShelfId || shelves[0]?.id || DEFAULT_SHELVES[0].id);
    setShowCreateBookSheet(true);
  };

  const handleOpenEditBook = (book: JournalBook) => {
    setEditingBook(book);
    setBookTitleInput(book.title);
    setBookDescInput(book.description || "");
    setBookColorInput(book.coverColor);
    setBookShelfIdInput(book.shelfId);
    setShowCreateBookSheet(true);
    setShowBookInfoModal(false);
  };

  const handleSaveBook = () => {
    const titleClean = bookTitleInput.trim() || (language === "Bahasa Melayu" ? "Buku Diari Baharu" : language === "中文" ? "未命名手帐" : "Untitled Journal");
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
          : b,
      );
      updateBooksState(updatedList);
      notify(
        language === "Bahasa Melayu"
          ? "Butiran buku dikemas kini"
          : language === "中文"
          ? "手帐信息已更新"
          : "Book details updated",
      );
    } else {
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

      // Create initial page for new book
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

      // Open new book immediately in dedicated full-screen page with 0.6s gentle 3D cover-opening animation!
      openBookToPage(newBookId, 0, true);

      notify(
        language === "Bahasa Melayu"
          ? "Buku diari dibuka untuk menulis"
          : language === "中文"
          ? "已翻开新手帐开始记录"
          : "Book opened for journaling",
      );
      return;
    }

    setShowCreateBookSheet(false);
    setEditingBook(null);
  };

  // Delete Book
  const handleConfirmDeleteBook = async () => {
    if (!bookToDelete) return;
    const targetBookId = bookToDelete.id;

    // Delete all pages in book
    const nextEntries = journalEntries.filter((e) => (e as any).bookId !== targetBookId);
    setJournalEntries(nextEntries);
    saveCachedJournalEntries(nextEntries);

    // Remove book from books
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
        : "Book and its pages deleted",
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
          : "Shelf renamed",
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
          : "New shelf created",
      );
    }
    setShowShelfModal(false);
    setEditingShelf(null);
  };

  const handleConfirmDeleteShelf = () => {
    if (!shelfToDelete) return;
    const targetShelfId = shelfToDelete.id;
    if (shelves.length <= 1) {
      notify("At least one shelf must remain");
      setShelfToDelete(null);
      return;
    }

    const fallbackShelf = shelves.find((s) => s.id !== targetShelfId) || shelves[0];

    // Reassign books on this shelf to the fallback shelf
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
        : "Shelf deleted and books relocated",
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
    // Add new blank page to that book and open it directly
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

    const updatedBooks = books.map((b) => (b.id === bookId ? { ...b, updatedAt: nowIso } : b));
    updateBooksState(updatedBooks);

    if (currentUser) {
      saveJournalEntry(currentUser.uid, newPage as any).catch(() => {});
    }

    const bookPagesCount = journalEntries.filter((e) => (e as any).bookId === bookId).length;
    openBookToPage(bookId, bookPagesCount);
  };

  // AI Memories Helpers (Preserved 100%)
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
      notify("AI memory updated");
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
      notify("AI memory added");
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
      nextState
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
      nextState
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
    notify(nextActive ? "All AI memories resumed" : "All AI memories paused");
  };

  const handleConfirmClearAllAiMemories = async () => {
    setMemories([]);
    setShowClearConfirm(false);
    if (currentUser) {
      await clearAllMemories(currentUser.uid).catch(() => {});
    }
    notify("All AI memories cleared");
  };

  return (
    <div className="digital-journal-container">
      {/* Top Header with updated pages across books count */}
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
        {/* Preserved Segmented Tabs */}
        <div className="journal-nav-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "diary"}
            className={`journal-nav-tab ${activeTab === "diary" ? "active" : ""}`}
            onClick={() => setActiveTab("diary")}
          >
            <span className="journal-tab-icon">
              <JournalIcon name="bookOpen" size={18} decorative />
            </span>
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
            {totalPagesCount > 0 && (
              <span className="journal-tab-counter">{totalPagesCount}</span>
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
        {/* TAB 1: PRIVATE DIARY - BOOKSHELF PRESENTATION                  */}
        {/* ============================================================== */}
        {activeTab === "diary" && (
          <div className="diary-tab-content">
            {/* Preserved Hero Card */}
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

              {/* Prominent "Write a Journal Entry" button: opens blank page and asks which book to save to */}
              <button
                type="button"
                className="btn btn-primary full diary-write-main-btn"
                onClick={handleWriteJournalEntryPrompt}
              >
                <span className="diary-write-btn-icon">
                  <JournalIcon name="pen" size={18} decorative />
                </span>
                <span>
                  {language === "Bahasa Melayu"
                    ? "Tulis Catatan Diari Baharu"
                    : language === "中文"
                    ? "记录新日记 · Write Entry"
                    : "Write a Journal Entry"}
                </span>
              </button>
            </div>

            {/* Preserved Search & Filter Bar */}
            <div className="diary-filters-section">
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
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="diary-search-clear-btn"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <JournalIcon name="close" size={14} />
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
                    <JournalIcon name="calendar" size={16} decorative />{" "}
                    <span>
                      {language === "Bahasa Melayu"
                        ? "Pilih Tarikh:"
                        : language === "中文"
                        ? "按日期浏览:"
                        : "Browse Date:"}
                    </span>
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
                      aria-label="Clear date filter"
                    >
                      <JournalIcon name="close" size={12} />
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
                  <JournalIcon name="sparkles" size={15} decorative />{" "}
                  <span>
                    {language === "Bahasa Melayu"
                      ? "Semua Mood"
                      : language === "中文"
                      ? "全部心绪"
                      : "All Moods"}
                  </span>
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
                    <JournalIcon name={getMoodIconName(opt.label)} size={15} decorative />
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

            {/* Preserved Privacy Assurance Notice */}
            <div className="diary-privacy-badge-banner">
              <span className="diary-lock-icon">
                <JournalIcon name="lock" size={20} decorative />
              </span>
              <p>
                {language === "Bahasa Melayu"
                  ? "Catatan diari ini disimpan dalam storan selamat peribadi anda dan tidak sesekali didedahkan kepada orang lain atau AI tanpa kebenaran anda."
                  : language === "中文"
                  ? "私密日记严格加密隔离保存，绝不会被其他成员查阅，亦不会未经允许提供给 AI 聊天使用。"
                  : "Private & Confidential: These diary reflections stay strictly in your personal vault and are never shared or fed into AI chats without your permission."}
              </p>
            </div>

            {/* Bookshelf Sort Bar */}
            <div className="bookshelf-sort-bar">
              <div className="bookshelf-sort-title">
                <JournalIcon name="stackedBooks" size={18} decorative />
                <span>
                  {language === "Bahasa Melayu"
                    ? "Rak Buku Diari"
                    : language === "中文"
                    ? "心绪书架"
                    : "Your Bookshelf"}
                </span>
                {isFilterActive && (
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
                    (Reset filter)
                  </button>
                )}
              </div>

              {/* Sort Options: Last edited, Created, Title */}
              <div className="bookshelf-sort-group">
                <button
                  type="button"
                  className={`bookshelf-sort-btn ${bookSort === "last_edited" ? "active" : ""}`}
                  onClick={() => setBookSort("last_edited")}
                >
                  {language === "Bahasa Melayu" ? "Disunting" : language === "中文" ? "最近编辑" : "Last edited"}
                </button>
                <button
                  type="button"
                  className={`bookshelf-sort-btn ${bookSort === "created" ? "active" : ""}`}
                  onClick={() => setBookSort("created")}
                >
                  {language === "Bahasa Melayu" ? "Dicipta" : language === "中文" ? "创建时间" : "Created"}
                </button>
                <button
                  type="button"
                  className={`bookshelf-sort-btn ${bookSort === "title" ? "active" : ""}`}
                  onClick={() => setBookSort("title")}
                >
                  {language === "Bahasa Melayu" ? "Tajuk" : language === "中文" ? "书名" : "Title"}
                </button>
              </div>
            </div>

            {/* ========================================================== */}
            {/* SHELVES LIST                                               */}
            {/* ========================================================== */}
            <div className="bookshelf-shelves-list">
              {shelves.map((shelf) => {
                const shelfItems = shelfBooksMap.get(shelf.id) || [];
                const visibleItems = isFilterActive
                  ? shelfItems.filter((item) => item.matchCount > 0 || item.book.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  : shelfItems;

                return (
                  <div key={shelf.id} className="bookshelf-shelf-row">
                    {/* Shelf Title Row: Name, book count, '...' menu */}
                    <div className="bookshelf-shelf-header">
                      <div className="bookshelf-shelf-title-group">
                        <h4>{shelf.name}</h4>
                        <span className="bookshelf-shelf-count-badge">
                          {shelfItems.length}{" "}
                          {shelfItems.length === 1
                            ? language === "Bahasa Melayu"
                              ? "buku"
                              : language === "中文"
                              ? "本"
                              : "book"
                            : language === "Bahasa Melayu"
                            ? "buku"
                            : language === "中文"
                            ? "本"
                            : "books"}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="bookshelf-shelf-menu-btn"
                        onClick={() => handleOpenEditShelf(shelf)}
                        aria-label="Shelf options"
                        title="Shelf options (rename, recolor, delete)"
                      >
                        <JournalIcon name="more" size={16} />
                      </button>
                    </div>

                    {/* Scrollable Stage with Spines and Pastel-teal Plank */}
                    <div className="bookshelf-stage">
                      <div className="bookshelf-scroll-track">
                        {visibleItems.map(({ book, matchCount, pages }) => {
                          const isSliding = slidingSpineId === book.id;
                          const height = book.spineHeight || 160;
                          const width = book.spineWidth || 40;
                          const colorObj = BOOK_COLOR_PALETTE.find((c) => c.hex.toLowerCase() === book.coverColor.toLowerCase()) || BOOK_COLOR_PALETTE[0];

                          return (
                            <div
                              key={book.id}
                              className={`book-spine-card ${isSliding ? "sliding-out" : ""}`}
                              style={{
                                height: `${height}px`,
                                width: `${width}px`,
                                backgroundColor: book.coverColor,
                                color: colorObj.textColor,
                              }}
                              onClick={() => handleTapBookSpine(book.id)}
                              role="button"
                              tabIndex={0}
                              title={`${book.title} (${pages.length} pages)`}
                            >
                              {/* Search match badge if filter active */}
                              {isFilterActive && matchCount > 0 && (
                                <span className="spine-match-badge">
                                  <JournalIcon name="sparkles" size={11} decorative /> {matchCount}
                                </span>
                              )}

                              {/* Top Embossed Band */}
                              <div className="spine-top-band" />

                              {/* Ribbon bookmark */}
                              <div
                                className="spine-ribbon"
                                style={{ backgroundColor: colorObj.ribbonColor }}
                              />

                              {/* Vertical Title */}
                              <span className="spine-title-vertical">
                                {book.title}
                              </span>

                              {/* Base Meta: Page Count with clean outline book icon */}
                              <div className="spine-base-meta">
                                <JournalIcon name="bookOpen" size={12} decorative />
                                <span>{pages.length}</span>
                              </div>

                              {/* Bottom Embossed Band */}
                              <div className="spine-bottom-band" />
                            </div>
                          );
                        })}

                        {/* Empty Shelf State Text */}
                        {visibleItems.length === 0 && (
                          <div className="bookshelf-empty-shelf">
                            <span>
                              {isFilterActive
                                ? language === "Bahasa Melayu"
                                  ? "Tiada buku padan pada rak ini"
                                  : language === "中文"
                                  ? "此书架暂无匹配的手帐"
                                  : "No books match on this shelf"
                                : language === "Bahasa Melayu"
                                ? "Rak ini sedang menanti kisah pertamanya."
                                : language === "中文"
                                ? "This shelf is waiting for its first story."
                                : "This shelf is waiting for its first story."}
                            </span>
                          </div>
                        )}

                        {/* Dashed '+' Book that creates a new book on this shelf */}
                        <div
                          className="book-spine-add-dashed"
                          onClick={() => handleOpenCreateBook(shelf.id)}
                          role="button"
                          tabIndex={0}
                          title={`Add new book to ${shelf.name}`}
                        >
                          <span className="plus-symbol">
                            <JournalIcon name="plus" size={18} decorative />
                          </span>
                          <span className="plus-label">
                            {language === "Bahasa Melayu"
                              ? "Buku Baharu"
                              : language === "中文"
                              ? "新建手帐"
                              : "New Book"}
                          </span>
                        </div>
                      </div>

                      {/* Pastel-teal or Light Wood Plank with gentle shadow */}
                      <div className="bookshelf-plank" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* '+ New Shelf' Pill Button at Bottom */}
            <div className="bookshelf-bottom-actions">
              <button
                type="button"
                className="new-shelf-pill-btn"
                onClick={handleOpenAddShelf}
              >
                <JournalIcon name="plus" size={14} decorative />{" "}
                <span>
                  {language === "Bahasa Melayu"
                    ? "Rak Baharu"
                    : language === "中文"
                    ? "新建书架 · New Shelf"
                    : "New Shelf"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: AI RECALL MEMORIES (PRESERVED 100%)                      */}
        {/* ============================================================== */}
        {activeTab === "ai_memory" && (
          <div className="ai-memory-tab-content">
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
      {/* 3. OPEN BOOK (PAGE UI - FULL-SCREEN OVERLAY)                   */}
      {/* ============================================================== */}
      {activeBook && (
        <div
          className="open-book-overlay"
          role="dialog"
          aria-modal="true"
          style={{ "--book-accent": activeBook.coverColor } as React.CSSProperties}
        >
          {/* 0.6s Gentle 3D Cover-Opening Animation in the Book's Chosen Cover Color */}
          {isOpeningCover && (
            <div
              className="book-opening-cover-overlay"
              style={{
                backgroundColor: activeBook.coverColor,
                color:
                  BOOK_COLOR_PALETTE.find(
                    (c) => c.hex.toLowerCase() === activeBook.coverColor.toLowerCase(),
                  )?.textColor || "#1d3557",
              }}
              aria-label="Opening book cover"
            >
              <div className="book-opening-cover-inner">
                <div className="book-opening-cover-spine-edge" />
                <div className="book-opening-cover-title-box">
                  <JournalIcon name="stackedBooks" size={38} decorative color="currentColor" />
                  <h1 className="book-opening-cover-title">{activeBook.title}</h1>
                  {activeBook.description && (
                    <p className="book-opening-cover-desc">{activeBook.description}</p>
                  )}
                </div>
                <div className="book-opening-cover-footer">
                  <JournalIcon name="leaf" size={20} decorative color="currentColor" />
                </div>
              </div>
            </div>
          )}

          {/* Header with back arrow, book title, page counter, page style toggle, and '...' menu */}
          <header className="open-book-header">
            <button
              type="button"
              className="open-book-back-btn"
              onClick={closeOpenBook}
              aria-label="Back to bookshelf"
            >
              <JournalIcon name="arrowLeft" size={16} decorative />
              <span>
                {language === "Bahasa Melayu"
                  ? "Rak Buku"
                  : language === "中文"
                  ? "返回书架"
                  : "Bookshelf"}
              </span>
            </button>

            <div className="open-book-title-group">
              <h2>{activeBook.title}</h2>
              <div className="open-book-page-counter">
                {activeBookPages.length > 0
                  ? language === "Bahasa Melayu"
                    ? `Halaman ${currentPageIndex + 1} daripada ${activeBookPages.length}`
                    : language === "中文"
                    ? `第 ${currentPageIndex + 1} 页 / 共 ${activeBookPages.length} 页`
                    : `Page ${currentPageIndex + 1} of ${activeBookPages.length}`
                  : language === "Bahasa Melayu"
                  ? "Halaman 1 daripada 1"
                  : language === "中文"
                  ? "第 1 页 / 共 1 页"
                  : "Page 1 of 1"}
              </div>
            </div>

            <div className="open-book-right-actions">
              {/* Paper Ruled Style Toggle (Plain / Lined / Dotted) */}
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className="open-book-icon-btn"
                  onClick={() => setShowPageStyleMenu((prev) => !prev)}
                  title="Paper Lines Style (Plain / Lined / Dotted)"
                  aria-label="Paper style options"
                >
                  <JournalIcon
                    name={
                      pageStyle === "lined"
                        ? "lines"
                        : pageStyle === "dotted"
                        ? "dotted"
                        : "plain"
                    }
                    size={16}
                  />
                </button>

                {showPageStyleMenu && (
                  <div className="paper-style-dropdown-popover">
                    <span className="paper-style-dropdown-title">Paper Style</span>
                    <button
                      type="button"
                      className={`paper-style-option ${pageStyle === "lined" ? "active" : ""}`}
                      onClick={() => {
                        setPageStyle("lined");
                        setShowPageStyleMenu(false);
                      }}
                    >
                      <JournalIcon name="lines" size={15} decorative />
                      <span>Lined</span>
                    </button>
                    <button
                      type="button"
                      className={`paper-style-option ${pageStyle === "dotted" ? "active" : ""}`}
                      onClick={() => {
                        setPageStyle("dotted");
                        setShowPageStyleMenu(false);
                      }}
                    >
                      <JournalIcon name="dotted" size={15} decorative />
                      <span>Dotted</span>
                    </button>
                    <button
                      type="button"
                      className={`paper-style-option ${pageStyle === "plain" ? "active" : ""}`}
                      onClick={() => {
                        setPageStyle("plain");
                        setShowPageStyleMenu(false);
                      }}
                    >
                      <JournalIcon name="plain" size={15} decorative />
                      <span>Plain</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Page Index Button */}
              <button
                type="button"
                className="open-book-icon-btn"
                onClick={() => setShowPageIndexDrawer(true)}
                title="Page Index / Jump to Page"
                aria-label="Page index"
              >
                <JournalIcon name="pageIndex" size={18} />
              </button>

              {/* '...' Menu: Book Info & Actions */}
              <button
                type="button"
                className="open-book-icon-btn"
                onClick={() => {
                  setSelectedBookForInfo(activeBook);
                  setShowBookInfoModal(true);
                }}
                title="Book details & options"
                aria-label="Book details"
              >
                <JournalIcon name="more" size={18} />
              </button>
            </div>
          </header>

          {/* Paper Page Container with swipe animation */}
          <div
            className="open-book-body"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {currentPage && (
              <div
                className={`open-book-page-paper style-${pageStyle} ${pageTurnDirection}`}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    pageTextareaRef.current?.focus();
                  }
                }}
              >
                {/* Hanging Ribbon Bookmark in Book Accent Color */}
                <div
                  className="book-ribbon-bookmark"
                  style={{
                    backgroundColor:
                      BOOK_COLOR_PALETTE.find(
                        (c) => c.hex.toLowerCase() === activeBook.coverColor.toLowerCase(),
                      )?.ribbonColor || "var(--coral)",
                  }}
                  title="Ribbon Bookmark"
                  aria-hidden="true"
                />

                {/* Top Meta: Date, Mood Badge Stamp, and Auto-Save Status */}
                <div className="page-top-meta-row">
                  <div className="page-date-indicator">
                    <JournalIcon name="calendar" size={14} decorative />
                    <span>
                      {currentPage.dateKey || getLocalDateKey(currentPage.entryDate)}
                    </span>
                  </div>

                  <div className="page-top-right-meta">
                    {/* Mood Stamp Badge with Vector Icon + Name in top corner */}
                    {currentPage.moodLabel && (
                      <div className="page-mood-stamp-badge">
                        <JournalIcon
                          name={getMoodIconName(currentPage.moodLabel)}
                          size={13}
                          decorative
                        />
                        <span>{currentPage.moodLabel}</span>
                      </div>
                    )}

                    <div
                      className={`page-save-indicator ${pageSaveStatus}`}
                      onClick={() => {
                        if (pageSaveStatus === "error") handleRetrySave();
                      }}
                      role="status"
                    >
                      {pageSaveStatus === "saved" && (
                        <>
                          <JournalIcon name="check" size={13} decorative />
                          <span>Saved</span>
                        </>
                      )}
                      {pageSaveStatus === "saving" && <span>Saving...</span>}
                      {pageSaveStatus === "error" && (
                        <>
                          <JournalIcon name="info" size={13} decorative />
                          <span>Save failed. Retry</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Optional Title Field with Printed Divider Line */}
                <input
                  type="text"
                  className="page-title-input"
                  value={currentPage.title || ""}
                  onChange={(e) => handleMutateCurrentPage({ title: e.target.value })}
                  placeholder={
                    language === "Bahasa Melayu"
                      ? "Tajuk refleksi (pilihan)..."
                      : language === "中文"
                      ? "日记标题（可选）..."
                      : "Add a title (optional)..."
                  }
                  maxLength={120}
                />
                <div className="page-title-divider" aria-hidden="true" />

                {/* Slim Floating Toolbar: Bold, Italic, Heading, Bullet List, Quote */}
                <div
                  className="page-formatting-toolbar"
                  role="toolbar"
                  aria-label="Text formatting"
                >
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => handleFormatText("bold")}
                    title="Bold"
                    aria-label="Bold"
                  >
                    <JournalIcon name="bold" size={13} decorative />
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => handleFormatText("italic")}
                    title="Italic"
                    aria-label="Italic"
                  >
                    <JournalIcon name="italic" size={13} decorative />
                  </button>
                  <div className="toolbar-separator" />
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => handleFormatText("heading")}
                    title="Heading"
                    aria-label="Heading"
                  >
                    <JournalIcon name="heading" size={13} decorative />
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => handleFormatText("bullet")}
                    title="Bullet List"
                    aria-label="Bullet list"
                  >
                    <JournalIcon name="list" size={13} decorative />
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => handleFormatText("quote")}
                    title="Quote"
                    aria-label="Quote"
                  >
                    <JournalIcon name="quote" size={13} decorative />
                  </button>
                </div>

                {/* Large Writing Area in Soft Serif Style with Seamless Auto-Continuation */}
                <textarea
                  ref={pageTextareaRef}
                  className="page-writing-textarea"
                  value={currentPage.content || ""}
                  onChange={(e) => handlePageContentChange(e.target.value)}
                  placeholder={
                    language === "Bahasa Melayu"
                      ? "Tulis luahan rasa anda di halaman ini dengan tenang..."
                      : language === "中文"
                      ? "在这页泛着温存纸香的纸笺上，写下心头闪烁的情思与片羽..."
                      : "Pour your heart onto this page... write freely and gently."
                  }
                />

                {/* Mood Selector: Vector Outline Icons always shown with Mood Name */}
                <div className="page-mood-section">
                  <span className="page-mood-label">
                    <JournalIcon name="sparkles" size={15} decorative />
                    <span>
                      {language === "Bahasa Melayu"
                        ? "Mood Halaman Ini"
                        : language === "中文"
                        ? "这页的心绪标签"
                        : "Page Mood"}
                    </span>
                  </span>
                  <div className="page-mood-chips-scroll">
                    {DIARY_MOOD_OPTIONS.map((opt) => {
                      const isActive = currentPage.moodLabel === opt.label;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          className={`page-mood-chip ${isActive ? "active" : ""}`}
                          onClick={() =>
                            handleMutateCurrentPage({
                              moodLabel: isActive ? undefined : opt.label,
                            })
                          }
                        >
                          <JournalIcon
                            name={getMoodIconName(opt.label)}
                            size={14}
                            decorative
                          />
                          <span>
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

                {/* Photo Attach Button & Polaroid Style Card */}
                <div className="page-photos-section">
                  <input
                    type="file"
                    ref={pageFileInputRef}
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleAttachPhotoToPage}
                  />

                  <button
                    type="button"
                    className="page-photo-attach-btn"
                    onClick={() => pageFileInputRef.current?.click()}
                  >
                    <JournalIcon name="camera" size={16} decorative />
                    <span>
                      {currentPage.photoUrl
                        ? language === "Bahasa Melayu"
                          ? "Tukar Foto Halaman"
                          : language === "中文"
                          ? "更换贴片照片"
                          : "Change Photo"
                        : language === "Bahasa Melayu"
                        ? "Lampirkan Foto"
                        : language === "中文"
                        ? "贴入回忆照片"
                        : "Attach Photo"}
                    </span>
                  </button>

                  {currentPage.photoUrl && (
                    <div className="polaroid-photo-card">
                      <div className="polaroid-tape-graphic" />
                      <img
                        src={currentPage.photoUrl}
                        alt="Page memory"
                        onClick={() => setPreviewPhotoUrl(currentPage.photoUrl || null)}
                      />
                      <div className="polaroid-caption">
                        <span>
                          {currentPage.dateKey || getLocalDateKey(currentPage.entryDate)}
                        </span>
                        <button
                          type="button"
                          className="polaroid-remove-btn"
                          onClick={() => handleMutateCurrentPage({ photoUrl: undefined })}
                          title="Remove photo"
                          aria-label="Remove photo"
                        >
                          <JournalIcon name="trash" size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Printed Page Number at Bottom Center: — 1 — */}
                <div className="page-number-center" aria-label={`Page ${currentPageIndex + 1}`}>
                  — {currentPageIndex + 1} —
                </div>

                {/* Bottom Outer Corner Page Curl: Tapping Turns to Next Page */}
                <div
                  className="page-corner-curl"
                  onClick={handleGoToNextPage}
                  title="Turn to next page"
                  aria-label="Turn to next page"
                />

                {/* Footer on Every Page: Always Visible with Created & Last Edited */}
                <div className="page-footer-timestamps">
                  <div className="page-footer-timestamp-line">
                    <strong>Created:</strong>
                    <span>{formatPageFooterTimestamp(currentPage.createdAt)}</span>
                  </div>
                  <div className="page-footer-timestamp-line">
                    <strong>Last edited:</strong>
                    <span>{formatPageFooterTimestamp(currentPage.updatedAt)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Navigation: Prev Page, Page Index, Next Page */}
          <footer className="open-book-bottom-nav">
            <button
              type="button"
              className="book-turn-page-btn"
              disabled={currentPageIndex === 0}
              onClick={handleGoToPrevPage}
            >
              <JournalIcon name="chevronLeft" size={16} decorative />
              <span>
                {language === "Bahasa Melayu"
                  ? "Sebelumnya"
                  : language === "中文"
                  ? "上一页"
                  : "Previous"}
              </span>
            </button>

            <button
              type="button"
              className="book-page-index-pill-btn"
              onClick={() => setShowPageIndexDrawer(true)}
            >
              <JournalIcon name="pageIndex" size={15} decorative />
              <span>
                {language === "Bahasa Melayu"
                  ? "Indeks Halaman"
                  : language === "中文"
                  ? "页面目录"
                  : "Page Index"}
              </span>
            </button>

            <button
              type="button"
              className="book-turn-page-btn"
              onClick={handleGoToNextPage}
            >
              <span>
                {currentPageIndex === activeBookPages.length - 1
                  ? (language === "Bahasa Melayu"
                      ? "Halaman Baharu"
                      : language === "中文"
                      ? "加一页"
                      : "Add Page")
                  : language === "Bahasa Melayu"
                  ? "Seterusnya"
                  : language === "中文"
                  ? "下一页"
                  : "Next"}
              </span>
              {currentPageIndex === activeBookPages.length - 1 ? (
                <JournalIcon name="plus" size={15} decorative />
              ) : (
                <JournalIcon name="chevronRight" size={16} decorative />
              )}
            </button>
          </footer>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. CREATE / EDIT BOOK BOTTOM SHEET                             */}
      {/* ============================================================== */}
      {showCreateBookSheet && (
        <div
          className="diary-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateBookSheet(false);
          }}
        >
          <div className="diary-writer-sheet" role="dialog" aria-modal="true">
            <div className="diary-sheet-handle" />

            <div className="diary-writer-header">
              <div className="diary-writer-title-group">
                <span className="diary-writer-icon">
                  <JournalIcon name="stackedBooks" size={20} decorative />
                </span>
                <div>
                  <h3>
                    {editingBook
                      ? language === "Bahasa Melayu"
                        ? "Sunting Buku Diari"
                        : language === "中文"
                        ? "编辑手帐封面"
                        : "Edit Book"
                      : language === "Bahasa Melayu"
                      ? "Cipta Buku Diari Baharu"
                      : language === "中文"
                      ? "创建新手帐"
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

            <div className="diary-writer-scrollable-body">
              {/* Live Spine Preview */}
              <div className="spine-preview-container">
                <div
                  className="book-spine-card"
                  style={{
                    height: "165px",
                    width: "42px",
                    backgroundColor: bookColorInput,
                    color:
                      BOOK_COLOR_PALETTE.find((c) => c.hex === bookColorInput)?.textColor ||
                      "#1d3557",
                  }}
                >
                  <div className="spine-top-band" />
                  <div
                    className="spine-ribbon"
                    style={{
                      backgroundColor:
                        BOOK_COLOR_PALETTE.find((c) => c.hex === bookColorInput)?.ribbonColor ||
                        "#e76f51",
                    }}
                  />
                  <span className="spine-title-vertical">
                    {bookTitleInput.trim() ||
                      (language === "Bahasa Melayu"
                        ? "Buku Baharu"
                        : language === "中文"
                        ? "新手帐"
                        : "New Book")}
                  </span>
                  <div className="spine-base-meta">
                    <JournalIcon name="bookOpen" size={12} decorative />
                    <span>1</span>
                  </div>
                  <div className="spine-bottom-band" />
                </div>
              </div>

              {/* Title Field */}
              <div className="diary-writer-form-group">
                <label className="diary-writer-label">
                  <JournalIcon name="tag" size={15} decorative />{" "}
                  <span>
                    {language === "Bahasa Melayu"
                      ? "Tajuk Buku"
                      : language === "中文"
                      ? "手帐书名"
                      : "Book Title"}
                  </span>
                </label>
                <input
                  type="text"
                  className="diary-writer-input title-input"
                  value={bookTitleInput}
                  onChange={(e) => setBookTitleInput(e.target.value)}
                  placeholder={
                    language === "Bahasa Melayu"
                      ? "Cth: Detik Menenangkan, Impian 2026..."
                      : language === "中文"
                      ? "例如：微风与落叶、未寄出的信、2026心愿..."
                      : "e.g., Midnight Thoughts, Quiet Reflections..."
                  }
                  maxLength={60}
                />
              </div>

              {/* Cover Color Swatches with Live Preview */}
              <div className="diary-writer-form-group">
                <label className="diary-writer-label">
                  <JournalIcon name="palette" size={15} decorative />{" "}
                  <span>
                    {language === "Bahasa Melayu"
                      ? "Warna Kulit Buku"
                      : language === "中文"
                      ? "书脊色彩 (Color Swatch)"
                      : "Cover & Spine Color"}
                  </span>
                </label>
                <div className="color-swatches-grid">
                  {BOOK_COLOR_PALETTE.map((swatch) => (
                    <button
                      key={swatch.id}
                      type="button"
                      className={`color-swatch-btn ${bookColorInput === swatch.hex ? "active" : ""}`}
                      style={{ backgroundColor: swatch.hex }}
                      onClick={() => setBookColorInput(swatch.hex)}
                      title={swatch.name}
                      aria-label={swatch.name}
                    />
                  ))}
                </div>
              </div>

              {/* Shelf Selection */}
              <div className="diary-writer-form-group">
                <label className="diary-writer-label">
                  <JournalIcon name="bookshelf" size={15} decorative />{" "}
                  <span>
                    {language === "Bahasa Melayu"
                      ? "Letakkan di Rak Mana"
                      : language === "中文"
                      ? "归类到书架 (Shelf)"
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
                <label className="diary-writer-label">
                  <JournalIcon name="fileText" size={15} decorative />{" "}
                  <span>
                    {language === "Bahasa Melayu"
                      ? "Penerangan Ringkas (Pilihan)"
                      : language === "中文"
                      ? "手帐小引 / 寄语（可选）"
                      : "Short Description (Optional)"}
                  </span>
                </label>
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

              {/* Action Submit */}
              <button
                type="button"
                className="btn btn-primary full diary-save-submit-btn"
                onClick={handleSaveBook}
              >
                {editingBook
                  ? language === "Bahasa Melayu"
                    ? "Simpan Perubahan Buku"
                    : language === "中文"
                    ? "保存手帐修改"
                    : "Save Changes"
                  : language === "Bahasa Melayu"
                  ? "Cipta Buku & Buka Halaman"
                  : language === "中文"
                  ? "创建并翻开手帐"
                  : "Create Book & Start Writing"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. BOOK INFO MODAL (FROM "..." MENU)                           */}
      {/* ============================================================== */}
      {showBookInfoModal && selectedBookForInfo && (
        <div
          className="diary-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBookInfoModal(false);
          }}
        >
          <div className="diary-confirm-modal-box" role="dialog" aria-modal="true">
            {/* Spine Preview Badge */}
            <div
              style={{
                width: "48px",
                height: "64px",
                backgroundColor: selectedBookForInfo.coverColor,
                borderRadius: "6px",
                margin: "0 auto 12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <JournalIcon name="bookOpen" size={24} decorative color="white" />
            </div>

            <h4>{selectedBookForInfo.title}</h4>
            {selectedBookForInfo.description && (
              <p style={{ fontStyle: "italic", marginBottom: "10px" }}>
                "{selectedBookForInfo.description}"
              </p>
            )}

            {/* Info details: Created, Last edited, Page count */}
            <div
              style={{
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: "12px",
                padding: "12px",
                textAlign: "left",
                fontSize: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                marginBottom: "16px",
              }}
            >
              <div>
                <strong>Shelf:</strong>{" "}
                <span>
                  {shelves.find((s) => s.id === selectedBookForInfo.shelfId)?.name ||
                    "General"}
                </span>
              </div>
              <div>
                <strong>Created:</strong>{" "}
                <span>
                  {formatPageFooterTimestamp(selectedBookForInfo.createdAt)}
                </span>
              </div>
              <div>
                <strong>Last edited:</strong>{" "}
                <span>
                  {formatPageFooterTimestamp(selectedBookForInfo.updatedAt)}
                </span>
              </div>
              <div>
                <strong>Page count:</strong>{" "}
                <span>
                  {
                    journalEntries.filter(
                      (e) => (e as any).bookId === selectedBookForInfo.id,
                    ).length
                  }{" "}
                  pages
                </span>
              </div>
            </div>

            {/* Actions: Rename, Change cover, Move to another shelf, Delete */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary full"
                onClick={() => handleOpenEditBook(selectedBookForInfo)}
              >
                <JournalIcon name="edit" size={15} decorative />{" "}
                <span>
                  {language === "Bahasa Melayu"
                    ? "Sunting Butiran & Warna Kulit"
                    : language === "中文"
                    ? "重命名与更改封面色彩"
                    : "Rename & Change Cover"}
                </span>
              </button>

              <button
                type="button"
                className="btn btn-danger full"
                onClick={() => {
                  setBookToDelete(selectedBookForInfo);
                }}
              >
                <JournalIcon name="trash" size={15} decorative />{" "}
                <span>
                  {language === "Bahasa Melayu"
                    ? "Padam Buku Ini"
                    : language === "中文"
                    ? "删除此手帐"
                    : "Delete Book"}
                </span>
              </button>

              <button
                type="button"
                className="btn btn-ghost full"
                onClick={() => setShowBookInfoModal(false)}
              >
                {language === "Bahasa Melayu" ? "Tutup" : language === "中文" ? "关闭" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PAGE INDEX DRAWER / MODAL                                      */}
      {/* ============================================================== */}
      {showPageIndexDrawer && activeBook && (
        <div
          className="diary-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPageIndexDrawer(false);
          }}
        >
          <div className="diary-writer-sheet" role="dialog" aria-modal="true">
            <div className="diary-sheet-handle" />

            <div className="diary-writer-header">
              <div className="diary-writer-title-group">
                <span className="diary-writer-icon">
                  <JournalIcon name="pageIndex" size={20} decorative />
                </span>
                <div>
                  <h3>
                    {language === "Bahasa Melayu"
                      ? "Indeks Halaman"
                      : language === "中文"
                      ? "页面目录 · Page Index"
                      : "Page Index"}
                  </h3>
                  <p>
                    {activeBook.title} — {activeBookPages.length}{" "}
                    {activeBookPages.length === 1 ? "page" : "pages"}
                  </p>
                </div>
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

            <div className="diary-writer-scrollable-body">
              {/* + Add Page button inside index */}
              <button
                type="button"
                className="btn btn-primary full"
                style={{ marginBottom: "14px" }}
                onClick={() => handleAddNewPageToActiveBook()}
              >
                <JournalIcon name="plus" size={15} decorative />{" "}
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
                                : "Untitled reflection")}
                          </strong>
                          <small style={{ color: "var(--muted)", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <JournalIcon name="calendar" size={12} decorative />{" "}
                            {page.dateKey || getLocalDateKey(page.entryDate)}
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
                            Viewing
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
      {/* CHOOSE BOOK TO WRITE IN MODAL (FROM HERO "WRITE" BUTTON)       */}
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

                {/* Or Create New Book */}
                <button
                  type="button"
                  className="btn btn-secondary full"
                  style={{ marginTop: "6px" }}
                  onClick={() => {
                    setShowChooseBookModal(false);
                    handleOpenCreateBook();
                  }}
                >
                  <JournalIcon name="plus" size={15} decorative />{" "}
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
              <JournalIcon name="bookshelf" size={24} decorative />
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
              placeholder="e.g., Letters I'll Never Send, Travel Reflections..."
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
                  <JournalIcon name="trash" size={15} decorative />{" "}
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
              <JournalIcon name="info" size={24} decorative />
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
              <JournalIcon name="info" size={24} decorative />
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

      {/* AI MEMORY ADD/EDIT MODAL (PRESERVED) */}
      {isAddingAiMemory && (
        <div
          className="diary-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddingAiMemory(false);
          }}
        >
          <div className="diary-confirm-modal-box" role="dialog" aria-modal="true">
            <span className="diary-confirm-icon">🤖</span>
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
              placeholder="e.g. I prefer quiet study sessions at night, I get anxious before public speaking..."
            />

            <select
              className="diary-writer-input"
              style={{ marginBottom: "16px" }}
              value={newAiMemoryCategory}
              onChange={(e) => setNewAiMemoryCategory(e.target.value)}
            >
              {AI_MEMORY_CATEGORIES.filter((c) => c !== "All").map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <div className="diary-confirm-btn-row">
              <button
                type="button"
                className="btn btn-secondary grow"
                onClick={() => setIsAddingAiMemory(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary grow"
                onClick={handleSaveAiMemory}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR ALL AI MEMORIES CONFIRMATION (PRESERVED) */}
      {showClearConfirm && (
        <div className="diary-modal-backdrop">
          <div className="diary-confirm-modal-box">
            <span className="diary-confirm-icon">🗑️</span>
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
                ? "这将清除 ONY 记住的所有上下文与偏好。"
                : "This will remove all remembered context and preferences."}
            </p>
            <div className="diary-confirm-btn-row">
              <button
                type="button"
                className="btn btn-secondary grow"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger grow"
                onClick={handleConfirmClearAllAiMemories}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
