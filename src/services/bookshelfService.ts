import type { FirestoreJournalEntry } from "../firebase/firestore";

export interface JournalShelf {
  id: string;
  name: string;
  color?: string; // pastel accent
  createdAt: string;
  order?: number;
}

export interface JournalBook {
  id: string;
  shelfId: string;
  title: string;
  coverColor: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  spineHeight?: number; // 145 - 175 px for varied heights
  spineWidth?: number;  // 36 - 48 px for varied widths
}

export interface BookColorOption {
  id: string;
  name: string;
  hex: string;
  textColor: string;
  ribbonColor: string;
}

export const BOOK_COLOR_PALETTE: BookColorOption[] = [
  { id: "mint", name: "Seafoam Mint", hex: "#94d2bd", textColor: "#19433b", ribbonColor: "#e76f51" },
  { id: "sky", name: "Sky Whisper", hex: "#a2d2ff", textColor: "#0d3b66", ribbonColor: "#f4a261" },
  { id: "lavender", name: "Lavender Mist", hex: "#cdb4db", textColor: "#3e244d", ribbonColor: "#9b5de5" },
  { id: "peach", name: "Warm Peach", hex: "#ffc8dd", textColor: "#5c2438", ribbonColor: "#00b4d8" },
  { id: "butter", name: "Soft Buttercup", hex: "#faedcd", textColor: "#4d3827", ribbonColor: "#e63946" },
  { id: "sage", name: "Calm Sage", hex: "#b7e4c7", textColor: "#1b4332", ribbonColor: "#e76f51" },
  { id: "lilac", name: "Dreamy Lilac", hex: "#d8bbff", textColor: "#341e54", ribbonColor: "#f15bb5" },
  { id: "coral", name: "Coral Bloom", hex: "#fbc4ab", textColor: "#6b2c1f", ribbonColor: "#2a9d8f" },
  { id: "teal", name: "Ocean Teal", hex: "#80ced6", textColor: "#134e5e", ribbonColor: "#f77f00" },
  { id: "sand", name: "Warm Sand", hex: "#e9d8a6", textColor: "#443926", ribbonColor: "#3a86ff" },
];

export const DEFAULT_SHELVES: JournalShelf[] = [
  { id: "shelf_feelings", name: "Feelings & Reflections", color: "#8ecae6", createdAt: "2026-11-01T08:00:00.000Z", order: 1 },
  { id: "shelf_memories", name: "Precious Memories", color: "#cdb4db", createdAt: "2026-11-01T08:00:00.000Z", order: 2 },
  { id: "shelf_gratitude", name: "Gratitude & Joy", color: "#faedcd", createdAt: "2026-11-01T08:00:00.000Z", order: 3 },
  { id: "shelf_goals", name: "Dreams & Goals", color: "#b7e4c7", createdAt: "2026-11-01T08:00:00.000Z", order: 4 },
  { id: "shelf_relationships", name: "Relationships", color: "#ffc8dd", createdAt: "2026-11-01T08:00:00.000Z", order: 5 },
  { id: "shelf_letters", name: "Letters I'll Never Send", color: "#bde0fe", createdAt: "2026-11-01T08:00:00.000Z", order: 6 },
];

export const DEFAULT_BOOKS: JournalBook[] = [
  {
    id: "book_feelings_1",
    shelfId: "shelf_feelings",
    title: "Heart Whispers",
    coverColor: "#94d2bd",
    description: "Everyday musings, quiet pauses, and unhurried reflections.",
    createdAt: "2026-11-01T09:00:00.000Z",
    updatedAt: "2026-11-04T21:42:00.000Z",
    spineHeight: 168,
    spineWidth: 42,
  },
  {
    id: "book_memories_1",
    shelfId: "shelf_memories",
    title: "Starlit Memories",
    coverColor: "#cdb4db",
    description: "Moments that felt like gentle warmth in the dark.",
    createdAt: "2026-11-02T10:15:00.000Z",
    updatedAt: "2026-11-03T18:30:00.000Z",
    spineHeight: 156,
    spineWidth: 38,
  },
  {
    id: "book_gratitude_1",
    shelfId: "shelf_gratitude",
    title: "Little Sparks",
    coverColor: "#ffc8dd",
    description: "Tiny reasons to smile when everything feels loud.",
    createdAt: "2026-11-02T14:20:00.000Z",
    updatedAt: "2026-11-04T11:00:00.000Z",
    spineHeight: 172,
    spineWidth: 44,
  },
  {
    id: "book_goals_1",
    shelfId: "shelf_goals",
    title: "Whispers of Tomorrow",
    coverColor: "#faedcd",
    description: "Hopes, small steps, and soft promises to myself.",
    createdAt: "2026-11-03T08:45:00.000Z",
    updatedAt: "2026-11-04T16:15:00.000Z",
    spineHeight: 160,
    spineWidth: 40,
  },
];

const SHELVES_STORAGE_KEY = "ony_journal_shelves_v2";
const BOOKS_STORAGE_KEY = "ony_journal_books_v2";

export function loadSavedShelves(): JournalShelf[] {
  if (typeof window === "undefined") return DEFAULT_SHELVES;
  try {
    const raw = localStorage.getItem(SHELVES_STORAGE_KEY);
    if (!raw) {
      saveShelves(DEFAULT_SHELVES);
      return DEFAULT_SHELVES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    saveShelves(DEFAULT_SHELVES);
    return DEFAULT_SHELVES;
  } catch {
    return DEFAULT_SHELVES;
  }
}

export function saveShelves(shelves: JournalShelf[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SHELVES_STORAGE_KEY, JSON.stringify(shelves));
  } catch {}
}

export function loadSavedBooks(): JournalBook[] {
  if (typeof window === "undefined") return DEFAULT_BOOKS;
  try {
    const raw = localStorage.getItem(BOOKS_STORAGE_KEY);
    if (!raw) {
      saveBooks(DEFAULT_BOOKS);
      return DEFAULT_BOOKS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    saveBooks(DEFAULT_BOOKS);
    return DEFAULT_BOOKS;
  } catch {
    return DEFAULT_BOOKS;
  }
}

export function saveBooks(books: JournalBook[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books));
  } catch {}
}

/**
 * Ensures all existing journal entries are linked to a book so nothing disappears.
 */
export function ensureEntriesLinkedToBooks(
  entries: FirestoreJournalEntry[],
  books: JournalBook[],
): { updatedEntries: FirestoreJournalEntry[]; didChange: boolean } {
  if (!books || books.length === 0) {
    return { updatedEntries: entries, didChange: false };
  }
  const defaultBookId = books[0].id;
  let didChange = false;

  const validBookIds = new Set(books.map((b) => b.id));

  const updatedEntries = entries.map((entry, index) => {
    const currentBookId = (entry as any).bookId;
    if (!currentBookId || !validBookIds.has(currentBookId)) {
      didChange = true;
      return {
        ...entry,
        bookId: defaultBookId,
        pageNumber: index + 1,
      } as FirestoreJournalEntry;
    }
    return entry;
  });

  return { updatedEntries, didChange };
}

/**
 * Format timestamp for footer: e.g. "4 Nov 2026, 9:42 PM"
 */
export function formatPageFooterTimestamp(isoString?: string): string {
  if (!isoString) return "Just now";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const day = d.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}

export type BookSortOption = "last_edited" | "created" | "title";

export function sortBooks(books: JournalBook[], sortOption: BookSortOption): JournalBook[] {
  const list = [...books];
  switch (sortOption) {
    case "last_edited":
      return list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    case "created":
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case "title":
      return list.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return list;
  }
}
