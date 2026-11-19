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
  pageTexture?: "ruled" | "dots" | "blank";
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

export function formatPageFooterTimestamp(
  isoString?: string,
  lang: "English" | "Bahasa Melayu" | "中文" = "English",
): string {
  if (!isoString) return lang === "中文" ? "刚刚" : lang === "Bahasa Melayu" ? "Sebentar tadi" : "Just now";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;

  if (lang === "中文") {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${year}年${month}月${date}日 ${hours}:${minutes}`;
  }

  const day = d.getDate();
  const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthsBm = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
  const months = lang === "Bahasa Melayu" ? monthsBm : monthsEn;
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}

export type BookSortOption = "last_edited" | "created" | "page_count" | "title";

export function sortBooks(books: JournalBook[], sortOption: BookSortOption): JournalBook[] {
  const list = [...books];
  switch (sortOption) {
    case "last_edited":
      return list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    case "created":
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case "page_count":
      return list.sort((a, b) => (b.spineHeight || 160) - (a.spineHeight || 160));
    case "title":
      return list.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return list;
  }
}
