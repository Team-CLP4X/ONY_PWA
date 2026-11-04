import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  query,
  where,
  orderBy,
  onSnapshot,
  waitForPendingWrites,
  collectionGroup,
  type Unsubscribe,
  type DocumentData,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";

// Types matching the strict specification
export interface VaultShelf {
  id: string;
  name: string;
  color: string;
  order: number;
  isLocked: boolean;
  aiRecallEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface VaultBook {
  id: string;
  shelfId: string;
  title: string;
  description: string;
  coverColor: string;
  pageTexture: "ruled" | "dots" | "blank";
  pageCount: number;
  order: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  spineHeight?: number;
  spineWidth?: number;
}

export interface VaultPage {
  id: string;
  ownerId: string;
  bookId: string;
  title: string;
  content: string;
  plainText: string;
  searchText: string;
  mood: string;
  tags: string[];
  photos: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface UserVaultSettings {
  textSize?: "small" | "medium" | "large";
  textSizeApplyAll?: boolean;
}

// Temporary debug logger for dev verification
export function logVaultOperation(action: string, path: string, extra?: Record<string, unknown>): void {
  const dbId = (db as any)._databaseId?.database || "ai-studio-onypwa-289f0eda-a42f-43da-8c66-8ac63f5d46a8";
  const currentUid = auth.currentUser?.uid || "unauthenticated";
  console.info(`[ONY Vault Debug] action="${action}" db="${dbId}" userId="${currentUid}" path="${path}"`, extra || "");
}

// Strip HTML tags and markdown formatting to produce clean searchable plain text
export function extractPlainText(rawText: string): string {
  if (!rawText) return "";
  let clean = rawText
    // Remove HTML tags
    .replace(/<[^>]*>/g, " ")
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove markdown bold/italic
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    // Remove markdown blockquotes
    .replace(/^>\s+/gm, "")
    // Remove markdown list markers
    .replace(/^[-*+]\s+/gm, "")
    // Remove markdown horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Normalize repeated whitespace and newlines
    .replace(/\s+/g, " ")
    .trim();
  return clean;
}

// Build consolidated searchable text for instant, substring-accurate multi-language search
export function buildSearchText(title: string, plainText: string, tags: string[] = [], mood = ""): string {
  const parts = [
    title || "",
    plainText || "",
    (tags || []).join(" "),
    mood || "",
  ];
  return parts.join(" ").toLowerCase().trim();
}

// Default shelves specification
export const DEFAULT_VAULT_SHELVES_SPEC: Array<{ name: string; color: string; order: number }> = [
  { name: "Feelings", color: "#8ecae6", order: 1 },
  { name: "Memories", color: "#cdb4db", order: 2 },
  { name: "Gratitude", color: "#faedcd", order: 3 },
  { name: "Dreams and Goals", color: "#b7e4c7", order: 4 },
  { name: "Relationships", color: "#ffc8dd", order: 5 },
  { name: "Letters I'll Never Send", color: "#bde0fe", order: 6 },
];

class VaultService {
  private searchIndexCache: Map<string, VaultPage[]> = new Map();
  private searchIndexLoading: boolean = false;
  private searchIndexReady: boolean = false;

  private validateUserId(userId?: string): string {
    const effective = userId || auth.currentUser?.uid;
    if (!effective || effective === "anonymous" || effective === "guest_local_user") {
      const err = new Error("Firebase user session is not authenticated. Cannot perform vault operations.");
      (err as any).code = "auth/unauthenticated";
      throw err;
    }
    return effective;
  }

  // Ensure parent user document exists so subcollections render seamlessly in Firebase Console
  async ensureParentUserDoc(userId: string): Promise<void> {
    const uid = this.validateUserId(userId);
    const userDocRef = doc(db, "users", uid);
    try {
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) {
        const now = new Date().toISOString();
        await setDoc(userDocRef, {
          createdAt: now,
          updatedAt: now,
        }, { merge: true });
        logVaultOperation("CREATE_PARENT_USER_DOC", `users/${uid}`);
      }
    } catch (err: unknown) {
      console.error("[VaultService] Failed to ensure parent user doc:", err);
      throw err;
    }
  }

  // Initialize the 6 default shelves in a batch if the user has none
  async initDefaultShelves(userId: string): Promise<void> {
    const uid = this.validateUserId(userId);
    await this.ensureParentUserDoc(uid);

    const shelvesCol = collection(db, "users", uid, "vaultShelves");
    const existingSnap = await getDocs(shelvesCol);
    const nonDeleted = existingSnap.docs.filter((d) => !d.data().deletedAt);

    if (nonDeleted.length > 0) {
      return; // Already initialized
    }

    const now = new Date().toISOString();
    const batch = writeBatch(db);

    for (const spec of DEFAULT_VAULT_SHELVES_SPEC) {
      const shelfId = `shelf_${spec.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const shelfRef = doc(db, "users", uid, "vaultShelves", shelfId);
      const shelfData: VaultShelf = {
        id: shelfId,
        name: spec.name,
        color: spec.color,
        order: spec.order,
        isLocked: false,
        aiRecallEnabled: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      batch.set(shelfRef, shelfData);
      logVaultOperation("BATCH_INIT_SHELF", `users/${uid}/vaultShelves/${shelfId}`);
    }

    await batch.commit();
    await waitForPendingWrites(db);
    logVaultOperation("INIT_DEFAULT_SHELVES_CONFIRMED", `users/${uid}/vaultShelves`);
  }

  // Subscribe to Vault Shelves in real time
  subscribeShelves(
    userId: string,
    onData: (shelves: VaultShelf[]) => void,
    onError: (err: Error) => void,
  ): Unsubscribe {
    const uid = this.validateUserId(userId);
    const q = query(
      collection(db, "users", uid, "vaultShelves"),
      orderBy("order", "asc"),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: VaultShelf[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as VaultShelf;
          if (!data.deletedAt) {
            list.push({ ...data, id: d.id });
          }
        });
        onData(list);
      },
      (err) => {
        console.error("[VaultService] subscribeShelves error:", err);
        onError(err);
      },
    );
  }

  // Subscribe to Vault Books in real time
  subscribeBooks(
    userId: string,
    onData: (books: VaultBook[]) => void,
    onError: (err: Error) => void,
  ): Unsubscribe {
    const uid = this.validateUserId(userId);
    const q = query(
      collection(db, "users", uid, "vaultBooks"),
      orderBy("order", "asc"),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: VaultBook[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as VaultBook;
          if (!data.deletedAt) {
            list.push({ ...data, id: d.id });
          }
        });
        onData(list);
      },
      (err) => {
        console.error("[VaultService] subscribeBooks error:", err);
        onError(err);
      },
    );
  }

  // Subscribe to a specific Book's Pages in real time
  subscribeBookPages(
    userId: string,
    bookId: string,
    onData: (pages: VaultPage[]) => void,
    onError: (err: Error) => void,
  ): Unsubscribe {
    const uid = this.validateUserId(userId);
    const q = query(
      collection(db, "users", uid, "vaultBooks", bookId, "pages"),
      orderBy("order", "asc"),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: VaultPage[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as VaultPage;
          if (!data.deletedAt) {
            list.push({ ...data, id: d.id });
          }
        });
        // Update local session search cache with latest opened book pages
        this.updateCachePagesForBook(bookId, list);
        onData(list);
      },
      (err) => {
        console.error(`[VaultService] subscribeBookPages error for book ${bookId}:`, err);
        onError(err);
      },
    );
  }

  // Create Shelf
  async createShelf(
    userId: string,
    shelfOrName: string | { name: string; color?: string; order?: number },
    color?: string,
    order?: number,
  ): Promise<VaultShelf> {
    const uid = this.validateUserId(userId);
    await this.ensureParentUserDoc(uid);

    const name = typeof shelfOrName === "string" ? shelfOrName : shelfOrName.name;
    const clr =
      typeof shelfOrName === "object" && shelfOrName.color
        ? shelfOrName.color
        : color || "#8ecae6";
    const ord =
      typeof shelfOrName === "object" && typeof shelfOrName.order === "number"
        ? shelfOrName.order
        : typeof order === "number"
        ? order
        : 99;

    const shelfId = `shelf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const shelfRef = doc(db, "users", uid, "vaultShelves", shelfId);
    const now = new Date().toISOString();

    const shelfData: VaultShelf = {
      id: shelfId,
      name: name.trim(),
      color: clr,
      order: ord,
      isLocked: false,
      aiRecallEnabled: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await setDoc(shelfRef, shelfData);
    await waitForPendingWrites(db);
    logVaultOperation("CREATE_SHELF", `users/${uid}/vaultShelves/${shelfId}`);
    return shelfData;
  }

  // Update Shelf
  async updateShelf(userId: string, shelfId: string, updates: Partial<VaultShelf>): Promise<void> {
    const uid = this.validateUserId(userId);
    const shelfRef = doc(db, "users", uid, "vaultShelves", shelfId);
    const now = new Date().toISOString();

    await updateDoc(shelfRef, {
      ...updates,
      updatedAt: now,
    });
    await waitForPendingWrites(db);
    logVaultOperation("UPDATE_SHELF", `users/${uid}/vaultShelves/${shelfId}`);
  }

  // Soft delete Shelf and relocate its books
  async deleteShelf(userId: string, shelfId: string, fallbackShelfId: string): Promise<void> {
    const uid = this.validateUserId(userId);
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    // Mark shelf as deleted
    const shelfRef = doc(db, "users", uid, "vaultShelves", shelfId);
    batch.update(shelfRef, { deletedAt: now, updatedAt: now });

    // Relocate books to fallback shelf
    const booksCol = collection(db, "users", uid, "vaultBooks");
    const snap = await getDocs(query(booksCol, where("shelfId", "==", shelfId)));
    snap.forEach((d) => {
      batch.update(d.ref, { shelfId: fallbackShelfId, updatedAt: now });
    });

    await batch.commit();
    await waitForPendingWrites(db);
    logVaultOperation("DELETE_SHELF", `users/${uid}/vaultShelves/${shelfId}`, { fallbackShelfId });
  }

  // Create Book: 1 batch containing book doc + blank Page 1 + shelf updatedAt
  async createBook(
    userId: string,
    params: {
      shelfId: string;
      title: string;
      description?: string;
      coverColor: string;
      pageTexture?: "ruled" | "dots" | "blank";
      order?: number;
    },
  ): Promise<{ bookId: string; firstPageId: string; book: VaultBook; firstPage: VaultPage }> {
    const uid = this.validateUserId(userId);
    await this.ensureParentUserDoc(uid);

    const now = new Date().toISOString();
    const bookId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const firstPageId = `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const batch = writeBatch(db);

    const bookRef = doc(db, "users", uid, "vaultBooks", bookId);
    const bookData: VaultBook = {
      id: bookId,
      shelfId: params.shelfId,
      title: params.title.trim(),
      description: (params.description || "").trim(),
      coverColor: params.coverColor || "#94d2bd",
      pageTexture: params.pageTexture || "ruled",
      pageCount: 1,
      order: typeof params.order === "number" ? params.order : 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      spineHeight: Math.floor(Math.random() * 25) + 150,
      spineWidth: Math.floor(Math.random() * 8) + 38,
    };
    batch.set(bookRef, bookData);

    const pageRef = doc(db, "users", uid, "vaultBooks", bookId, "pages", firstPageId);
    const pageData: VaultPage = {
      id: firstPageId,
      ownerId: uid,
      bookId,
      title: "",
      content: "",
      plainText: "",
      searchText: "",
      mood: "Reflective",
      tags: [],
      photos: [],
      order: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    batch.set(pageRef, pageData);

    // Update parent shelf timestamp
    const shelfRef = doc(db, "users", uid, "vaultShelves", params.shelfId);
    batch.update(shelfRef, { updatedAt: now });

    await batch.commit();
    await waitForPendingWrites(db);

    logVaultOperation("CREATE_BOOK_BATCH", `users/${uid}/vaultBooks/${bookId}`, {
      bookPath: `users/${uid}/vaultBooks/${bookId}`,
      firstPagePath: `users/${uid}/vaultBooks/${bookId}/pages/${firstPageId}`,
    });

    this.addPageToSessionIndex(pageData);

    return { bookId, firstPageId, book: bookData, firstPage: pageData };
  }

  // Update Book
  async updateBook(userId: string, bookId: string, updates: Partial<VaultBook>): Promise<void> {
    const uid = this.validateUserId(userId);
    const bookRef = doc(db, "users", uid, "vaultBooks", bookId);
    const now = new Date().toISOString();

    await updateDoc(bookRef, {
      ...updates,
      updatedAt: now,
    });
    await waitForPendingWrites(db);
    logVaultOperation("UPDATE_BOOK", `users/${uid}/vaultBooks/${bookId}`);
  }

  // Soft Delete Book
  async deleteBook(userId: string, bookId: string): Promise<void> {
    const uid = this.validateUserId(userId);
    const now = new Date().toISOString();
    const batch = writeBatch(db);

    const bookRef = doc(db, "users", uid, "vaultBooks", bookId);
    batch.update(bookRef, { deletedAt: now, updatedAt: now });

    // Also mark its pages as deleted
    const pagesCol = collection(db, "users", uid, "vaultBooks", bookId, "pages");
    const snap = await getDocs(pagesCol);
    snap.forEach((d) => {
      batch.update(d.ref, { deletedAt: now, updatedAt: now });
    });

    await batch.commit();
    await waitForPendingWrites(db);
    logVaultOperation("DELETE_BOOK", `users/${uid}/vaultBooks/${bookId}`);

    // Remove from local search index
    this.removePagesOfBookFromSessionIndex(bookId);
  }

  // Create Page: updates book's updatedAt and pageCount in the same batch
  async createPage(
    userId: string,
    bookId: string,
    pageData: {
      title?: string;
      content?: string;
      mood?: string;
      tags?: string[];
      photos?: string[];
      order?: number;
      plainText?: string;
    },
    currentPagesCount = 0,
  ): Promise<VaultPage> {
    const uid = this.validateUserId(userId);
    const pageId = `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const plain = pageData.plainText ?? extractPlainText(pageData.content || "");
    const search = buildSearchText(pageData.title || "", plain, pageData.tags || [], pageData.mood || "");

    const newPage: VaultPage = {
      id: pageId,
      ownerId: uid,
      bookId,
      title: (pageData.title || "").trim(),
      content: pageData.content || "",
      plainText: plain,
      searchText: search,
      mood: pageData.mood || "Reflective",
      tags: pageData.tags || [],
      photos: pageData.photos || [],
      order: typeof pageData.order === "number" ? pageData.order : currentPagesCount + 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const batch = writeBatch(db);
    const pageRef = doc(db, "users", uid, "vaultBooks", bookId, "pages", pageId);
    batch.set(pageRef, newPage);

    const bookRef = doc(db, "users", uid, "vaultBooks", bookId);
    batch.update(bookRef, {
      pageCount: currentPagesCount + 1,
      updatedAt: now,
    });

    await batch.commit();
    await waitForPendingWrites(db);

    logVaultOperation("CREATE_PAGE_BATCH", `users/${uid}/vaultBooks/${bookId}/pages/${pageId}`);
    this.addPageToSessionIndex(newPage);

    return newPage;
  }

  // Update Page: updates page content + book's updatedAt in the same batch
  async updatePage(
    userId: string,
    bookId: string,
    pageId: string,
    updates: Partial<VaultPage>,
  ): Promise<void> {
    const uid = this.validateUserId(userId);
    const now = new Date().toISOString();

    const patch: Record<string, unknown> = {
      ...updates,
      updatedAt: now,
    };

    // If content, title, tags or mood were updated, recompute plainText and searchText
    if (
      updates.content !== undefined ||
      updates.title !== undefined ||
      updates.tags !== undefined ||
      updates.mood !== undefined
    ) {
      const plain = extractPlainText(updates.content ?? "");
      patch.plainText = plain;
      patch.searchText = buildSearchText(
        updates.title ?? "",
        plain,
        updates.tags ?? [],
        updates.mood ?? "",
      );
    }

    // Never overwrite createdAt or id
    delete patch.createdAt;
    delete patch.id;
    delete patch.ownerId;
    delete patch.bookId;

    const batch = writeBatch(db);
    const pageRef = doc(db, "users", uid, "vaultBooks", bookId, "pages", pageId);
    batch.update(pageRef, patch);

    const bookRef = doc(db, "users", uid, "vaultBooks", bookId);
    batch.update(bookRef, { updatedAt: now });

    await batch.commit();
    await waitForPendingWrites(db);

    logVaultOperation("UPDATE_PAGE_BATCH", `users/${uid}/vaultBooks/${bookId}/pages/${pageId}`);
    this.patchPageInSessionIndex(pageId, patch);
  }

  // Soft delete Page: decreases book's pageCount and updates updatedAt in the same batch
  async deletePage(
    userId: string,
    bookId: string,
    pageId: string,
    currentPagesCount = 1,
  ): Promise<void> {
    const uid = this.validateUserId(userId);
    const now = new Date().toISOString();

    const batch = writeBatch(db);
    const pageRef = doc(db, "users", uid, "vaultBooks", bookId, "pages", pageId);
    batch.update(pageRef, { deletedAt: now, updatedAt: now });

    const bookRef = doc(db, "users", uid, "vaultBooks", bookId);
    batch.update(bookRef, {
      pageCount: Math.max(0, currentPagesCount - 1),
      updatedAt: now,
    });

    await batch.commit();
    await waitForPendingWrites(db);

    logVaultOperation("DELETE_PAGE_BATCH", `users/${uid}/vaultBooks/${bookId}/pages/${pageId}`);
    this.removePageFromSessionIndex(pageId);
  }

  // Build lightweight session search index using collectionGroup query
  // Read cost: N pages once per session (e.g. 10-30 reads), kept updated via active listeners
  async buildSessionSearchIndex(userId: string): Promise<VaultPage[]> {
    const uid = this.validateUserId(userId);

    if (this.searchIndexReady && this.searchIndexCache.has(uid)) {
      return this.searchIndexCache.get(uid) || [];
    }

    if (this.searchIndexLoading) {
      // Wait briefly if already building
      await new Promise((r) => setTimeout(r, 200));
      return this.searchIndexCache.get(uid) || [];
    }

    this.searchIndexLoading = true;
    try {
      const q = query(
        collectionGroup(db, "pages"),
        where("ownerId", "==", uid),
      );
      const snap = await getDocs(q);
      const pages: VaultPage[] = [];

      snap.forEach((d) => {
        const data = d.data() as VaultPage;
        if (!data.deletedAt) {
          pages.push({
            id: d.id,
            ownerId: data.ownerId || uid,
            bookId: data.bookId || "",
            title: data.title || "",
            content: data.content || "",
            plainText: data.plainText || extractPlainText(data.content || ""),
            searchText: data.searchText || buildSearchText(data.title || "", data.plainText || "", data.tags || [], data.mood || ""),
            mood: data.mood || "Reflective",
            tags: data.tags || [],
            photos: data.photos || [],
            order: data.order || 1,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            deletedAt: null,
          });
        }
      });

      this.searchIndexCache.set(uid, pages);
      this.searchIndexReady = true;
      logVaultOperation("BUILD_SEARCH_INDEX", `collectionGroup(pages) count=${pages.length}`);
      return pages;
    } catch (err) {
      console.warn("[VaultService] CollectionGroup pages query note (falling back to book pages scan):", err);
      // Fallback if collection group requires composite index deployment
      return this.buildSearchIndexFallback(uid);
    } finally {
      this.searchIndexLoading = false;
    }
  }

  // Fallback scanner across user's books if collection group index is being built
  private async buildSearchIndexFallback(uid: string): Promise<VaultPage[]> {
    try {
      const booksCol = collection(db, "users", uid, "vaultBooks");
      const booksSnap = await getDocs(booksCol);
      const allPages: VaultPage[] = [];

      for (const bDoc of booksSnap.docs) {
        if (bDoc.data().deletedAt) continue;
        const pagesSnap = await getDocs(collection(db, "users", uid, "vaultBooks", bDoc.id, "pages"));
        pagesSnap.forEach((pDoc) => {
          const pData = pDoc.data() as VaultPage;
          if (!pData.deletedAt) {
            allPages.push({
              id: pDoc.id,
              ownerId: uid,
              bookId: bDoc.id,
              title: pData.title || "",
              content: pData.content || "",
              plainText: pData.plainText || extractPlainText(pData.content || ""),
              searchText: pData.searchText || buildSearchText(pData.title || "", pData.plainText || "", pData.tags || [], pData.mood || ""),
              mood: pData.mood || "Reflective",
              tags: pData.tags || [],
              photos: pData.photos || [],
              order: pData.order || 1,
              createdAt: pData.createdAt || new Date().toISOString(),
              updatedAt: pData.updatedAt || new Date().toISOString(),
              deletedAt: null,
            });
          }
        });
      }

      this.searchIndexCache.set(uid, allPages);
      this.searchIndexReady = true;
      return allPages;
    } catch (e) {
      console.error("[VaultService] Failed to build fallback search index:", e);
      return [];
    }
  }

  private addPageToSessionIndex(page: VaultPage) {
    const uid = page.ownerId;
    const current = this.searchIndexCache.get(uid) || [];
    const filtered = current.filter((p) => p.id !== page.id);
    this.searchIndexCache.set(uid, [...filtered, page]);
  }

  private patchPageInSessionIndex(pageId: string, patch: Record<string, unknown>) {
    for (const [uid, list] of this.searchIndexCache.entries()) {
      const updated = list.map((p) => (p.id === pageId ? { ...p, ...patch } : p));
      this.searchIndexCache.set(uid, updated);
    }
  }

  private removePageFromSessionIndex(pageId: string) {
    for (const [uid, list] of this.searchIndexCache.entries()) {
      const updated = list.filter((p) => p.id !== pageId);
      this.searchIndexCache.set(uid, updated);
    }
  }

  private removePagesOfBookFromSessionIndex(bookId: string) {
    for (const [uid, list] of this.searchIndexCache.entries()) {
      const updated = list.filter((p) => p.bookId !== bookId);
      this.searchIndexCache.set(uid, updated);
    }
  }

  private updateCachePagesForBook(bookId: string, bookPages: VaultPage[]) {
    if (bookPages.length === 0) return;
    const uid = bookPages[0].ownerId;
    const current = this.searchIndexCache.get(uid) || [];
    const withoutBook = current.filter((p) => p.bookId !== bookId);
    this.searchIndexCache.set(uid, [...withoutBook, ...bookPages]);
  }

  // Clear search index on user logout
  clearSearchIndex(): void {
    this.searchIndexCache.clear();
    this.searchIndexReady = false;
  }

  // Migration: move legacy diary entries into shelf "Memories" > book "My Diary" once
  async migrateLegacyJournalEntries(userId: string): Promise<{ migratedCount: number; didMigrate: boolean }> {
    const uid = this.validateUserId(userId);
    const userDocRef = doc(db, "users", uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists() && userSnap.data().vaultMigratedAt) {
      return { migratedCount: 0, didMigrate: false };
    }

    // Gather legacy entries from localStorage and users doc
    const localRaw = typeof window !== "undefined" ? localStorage.getItem("ony_cached_journal_entries") : null;
    let localEntries: any[] = [];
    try {
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        if (Array.isArray(parsed)) localEntries = parsed;
      }
    } catch {}

    const uData = userSnap.exists() ? userSnap.data() : {};
    const docEntries = Array.isArray(uData.journalEntries) ? uData.journalEntries : [];

    // Combine & deduplicate legacy entries by id or title+entryDate
    const entriesMap = new Map<string, any>();
    [...docEntries, ...localEntries].forEach((e) => {
      const key = e.id || `${e.title}_${e.entryDate || e.createdAt}`;
      if (!entriesMap.has(key)) {
        entriesMap.set(key, e);
      }
    });

    const entriesToMigrate = Array.from(entriesMap.values());
    if (entriesToMigrate.length === 0) {
      // Mark as migrated even if empty so we don't repeat checks
      const now = new Date().toISOString();
      await setDoc(userDocRef, { vaultMigratedAt: now }, { merge: true });
      await waitForPendingWrites(db);
      return { migratedCount: 0, didMigrate: false };
    }

    // Find or create "Memories" shelf
    const shelvesSnap = await getDocs(collection(db, "users", uid, "vaultShelves"));
    let memoriesShelf = shelvesSnap.docs.find((d) => d.data().name?.toLowerCase() === "memories" && !d.data().deletedAt);

    let memoriesShelfId = memoriesShelf ? memoriesShelf.id : "shelf_memories";
    const now = new Date().toISOString();

    if (!memoriesShelf) {
      await setDoc(doc(db, "users", uid, "vaultShelves", memoriesShelfId), {
        id: memoriesShelfId,
        name: "Memories",
        color: "#cdb4db",
        order: 2,
        isLocked: false,
        aiRecallEnabled: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
    }

    // Check if "My Diary" book exists on Memories shelf
    const booksSnap = await getDocs(
      query(collection(db, "users", uid, "vaultBooks"), where("shelfId", "==", memoriesShelfId)),
    );
    let diaryBook = booksSnap.docs.find((d) => d.data().title?.toLowerCase() === "my diary" && !d.data().deletedAt);
    let diaryBookId = diaryBook ? diaryBook.id : `book_my_diary_${Date.now()}`;

    const batch = writeBatch(db);

    if (!diaryBook) {
      const bookRef = doc(db, "users", uid, "vaultBooks", diaryBookId);
      const newBook: VaultBook = {
        id: diaryBookId,
        shelfId: memoriesShelfId,
        title: "My Diary",
        description: "Migrated reflection entries and personal thoughts.",
        coverColor: "#cdb4db",
        pageTexture: "ruled",
        pageCount: entriesToMigrate.length,
        order: 1,
        createdAt: entriesToMigrate[0]?.createdAt || now,
        updatedAt: now,
        deletedAt: null,
        spineHeight: 165,
        spineWidth: 44,
      };
      batch.set(bookRef, newBook);
    } else {
      batch.update(doc(db, "users", uid, "vaultBooks", diaryBookId), {
        pageCount: entriesToMigrate.length,
        updatedAt: now,
      });
    }

    // Write each legacy entry as a VaultPage
    entriesToMigrate.forEach((entry, idx) => {
      const pageId = entry.id && !entry.id.startsWith("entry_") ? entry.id : `page_migrated_${idx}_${Date.now()}`;
      const pageRef = doc(db, "users", uid, "vaultBooks", diaryBookId, "pages", pageId);
      const createdAt = entry.createdAt || entry.entryDate || now;
      const plain = extractPlainText(entry.content || "");
      const search = buildSearchText(entry.title || "", plain, entry.tags || [], entry.moodLabel || "");

      const pageData: VaultPage = {
        id: pageId,
        ownerId: uid,
        bookId: diaryBookId,
        title: entry.title || "",
        content: entry.content || "",
        plainText: plain,
        searchText: search,
        mood: entry.moodLabel || "Reflective",
        tags: Array.isArray(entry.tags) ? entry.tags : [],
        photos: entry.photoUrl ? [entry.photoUrl] : [],
        order: idx + 1,
        createdAt,
        updatedAt: entry.updatedAt || createdAt,
        deletedAt: null,
      };
      batch.set(pageRef, pageData);
    });

    // Mark vaultMigratedAt on users/{uid}
    batch.set(userDocRef, { vaultMigratedAt: now }, { merge: true });

    await batch.commit();
    await waitForPendingWrites(db);

    logVaultOperation("MIGRATION_CONFIRMED", `users/${uid}`, { count: entriesToMigrate.length });
    return { migratedCount: entriesToMigrate.length, didMigrate: true };
  }
}

export const vaultService = new VaultService();
