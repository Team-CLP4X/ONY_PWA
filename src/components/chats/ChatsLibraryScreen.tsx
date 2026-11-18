import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../../i18n/LanguageContext";
import { type AutoOrganizeChatsMode, useTheme } from "../../theme/ThemeContext";
import { ThemedSwitch } from "../common/ThemedSwitch";
import {
  type ActiveFolderSelection,
  type ChatLibraryConversation,
  type ChatLibraryFolder,
  type ChatSortMode,
  type DateBucketKey,
  evaluateChatFolderSuggestion,
  formatRelativeActivityTime,
  getConversationTimestampMs,
  getDateBucketKey,
  getDateBucketLabel,
  getLastMessagePreview,
  getLocalizedDefaultFolderName,
  sortConversations,
} from "../../utils/chatLibraryHelpers";
import { ChatCard } from "./ChatCard";
import { ChatOrganizeSheet } from "./ChatOrganizeSheet";
import { FolderGlyph, LibUiIcon } from "./FolderGlyph";
import { FolderGrid } from "./FolderGrid";
import { ConfirmDeleteSheet, FolderSheet } from "./FolderSheet";
import { FolderTree } from "./FolderTree";
import { LibraryHeader } from "./LibraryHeader";

export interface ChatsLibraryScreenProps {
  back: () => void;
  onNavigateMonthlyReflection: () => void;
  conversations: ChatLibraryConversation[];
  onUpdateConversation: (id: number, patch: Partial<ChatLibraryConversation>) => void;
  onBulkUpdateConversations: (
    ids: number[],
    updater: (chat: ChatLibraryConversation) => ChatLibraryConversation,
  ) => void;
  onDeleteConversations: (ids: number[]) => void;
  onOpenChat: (chatId: number | null, folderId?: number | null) => void;
  folders: ChatLibraryFolder[];
  onCreateFolder: (payload: {
    name: string;
    color?: string;
    icon?: string;
  }) => ChatLibraryFolder;
  onUpdateFolder: (folderId: number, patch: Partial<ChatLibraryFolder>) => void;
  onDeleteFolder: (folderId: number) => void;
  notify: (input: string | { text: string; actionLabel?: string; onAction?: () => void }) => void;
}

const BUCKET_ORDER: DateBucketKey[] = ["today", "yesterday", "thisWeek", "earlier"];
const VIRTUAL_INITIAL_BATCH = 40;
const VIRTUAL_INCREMENT = 35;

export function ChatsLibraryScreen({
  back,
  onNavigateMonthlyReflection,
  conversations,
  onUpdateConversation,
  onBulkUpdateConversations,
  onDeleteConversations,
  onOpenChat,
  folders,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  notify,
}: ChatsLibraryScreenProps) {
  const { language } = useLanguage();
  const {
    chatLibraryView,
    setChatLibraryView,
    autoOrganizeChats,
    setAutoOrganizeChats,
  } = useTheme();

  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  const [activeSelection, setActiveSelection] = useState<ActiveFolderSelection>(null);
  const [sortMode, setSortMode] = useState<ChatSortMode>("recent");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<number>>(new Set());

  // Sheets & Dialogs
  const [showLibraryOverflow, setShowLibraryOverflow] = useState(false);
  const [folderSheetState, setFolderSheetState] = useState<{
    open: boolean;
    mode: "create" | "edit";
    folder?: ChatLibraryFolder | null;
  }>({ open: false, mode: "create", folder: null });
  const [folderActionTarget, setFolderActionTarget] = useState<ChatLibraryFolder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<ChatLibraryFolder | null>(null);

  const [chatActionTarget, setChatActionTarget] = useState<ChatLibraryConversation | null>(null);
  const [organizeTarget, setOrganizeTarget] = useState<{
    open: boolean;
    chat: ChatLibraryConversation | null;
    bulkCount: number;
  }>({ open: false, chat: null, bulkCount: 0 });
  const [chatsToDelete, setChatsToDelete] = useState<ChatLibraryConversation[]>([]);

  // Progressive virtualization limit for long folders / search lists
  const [renderLimit, setRenderLimit] = useState<number>(VIRTUAL_INITIAL_BATCH);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Close open sheets if bottom navigation switches tabs while visible
  useEffect(() => {
    const closeAllSheets = () => {
      setShowLibraryOverflow(false);
      setFolderSheetState((prev) => ({ ...prev, open: false }));
      setFolderActionTarget(null);
      setFolderToDelete(null);
      setChatActionTarget(null);
      setOrganizeTarget({ open: false, chat: null, bulkCount: 0 });
      setChatsToDelete([]);
    };
    window.addEventListener("ony-tab-changed", closeAllSheets);
    return () => window.removeEventListener("ony-tab-changed", closeAllSheets);
  }, []);

  useEffect(() => {
    setRenderLimit(VIRTUAL_INITIAL_BATCH);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeSelection, searchQuery, sortMode]);

  const activeFolderObj = useMemo(() => {
    if (typeof activeSelection !== "number") return null;
    return folders.find((f) => f.id === activeSelection) || null;
  }, [activeSelection, folders]);

  const activeFolderName = useMemo(() => {
    if (activeSelection === "unsorted") {
      return isBm ? "Belum Disusun" : isZh ? "未分类" : "Unsorted";
    }
    if (activeSelection === "archived") {
      return isBm ? "Diarkibkan" : isZh ? "已归档" : "Archived";
    }
    if (activeFolderObj) {
      return getLocalizedDefaultFolderName(activeFolderObj, language);
    }
    return isBm ? "Sembang" : isZh ? "对话库" : "Chats";
  }, [activeSelection, activeFolderObj, isBm, isZh, language]);

  // Top 3 most recent non-archived conversations for Folder Home quick strip
  const recentThree = useMemo(() => {
    return sortConversations(
      conversations.filter((c) => !c.archived),
      "recent",
    ).slice(0, 3);
  }, [conversations]);

  // Folder items when drilled into a folder
  const folderChats = useMemo(() => {
    if (activeSelection === null) return [];
    let filtered: ChatLibraryConversation[];
    if (activeSelection === "archived") {
      filtered = conversations.filter((c) => Boolean(c.archived));
    } else if (activeSelection === "unsorted") {
      filtered = conversations.filter(
        (c) => !c.archived && (c.folderId == null || !folders.some((f) => f.id === c.folderId)),
      );
    } else {
      filtered = conversations.filter(
        (c) => !c.archived && c.folderId === activeSelection,
      );
    }
    return sortConversations(filtered, sortMode);
  }, [activeSelection, conversations, folders, sortMode]);

  // Grouped by date bucket inside folder view (preserving virtual window)
  const visibleFolderChats = useMemo(
    () => folderChats.slice(0, renderLimit),
    [folderChats, renderLimit],
  );

  const groupedFolderBuckets = useMemo(() => {
    const map = new Map<DateBucketKey, ChatLibraryConversation[]>();
    for (const b of BUCKET_ORDER) map.set(b, []);
    for (const chat of visibleFolderChats) {
      const key = getDateBucketKey(chat);
      map.get(key)?.push(chat);
    }
    return BUCKET_ORDER.map((key) => ({
      key,
      label: getDateBucketLabel(key, language),
      items: map.get(key) || [],
    })).filter((g) => g.items.length > 0);
  }, [visibleFolderChats, language]);

  // Cross-folder Search results grouped by folder with matched snippet
  const searchResultsByFolder = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    type SearchHit = {
      chat: ChatLibraryConversation;
      snippet: string;
    };

    const hits: SearchHit[] = [];
    for (const chat of sortConversations(conversations, "recent")) {
      const titleMatch = chat.title.toLowerCase().includes(q);
      const matchedMessage = chat.messages.find((m) => m.text.toLowerCase().includes(q));
      if (titleMatch || matchedMessage) {
        hits.push({
          chat,
          snippet: matchedMessage ? matchedMessage.text : getLastMessagePreview(chat, language),
        });
      }
    }

    const groups = new Map<string, { groupKey: string; label: string; items: SearchHit[] }>();
    for (const hit of hits) {
      let groupKey = "unsorted";
      let label = isBm ? "Belum Disusun" : isZh ? "未分类" : "Unsorted";
      if (hit.chat.archived) {
        groupKey = "archived";
        label = isBm ? "Diarkibkan" : isZh ? "已归档" : "Archived";
      } else if (hit.chat.folderId != null) {
        const f = folders.find((item) => item.id === hit.chat.folderId);
        if (f) {
          groupKey = String(f.id);
          label = getLocalizedDefaultFolderName(f, language);
        }
      }
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { groupKey, label, items: [] });
      }
      groups.get(groupKey)!.items.push(hit);
    }

    return Array.from(groups.values());
  }, [conversations, folders, isBm, isZh, language, searchQuery]);

  const allFlatSearchChats = useMemo(
    () => searchResultsByFolder.flatMap((g) => g.items.map((x) => x.chat)),
    [searchResultsByFolder],
  );

  const currentSelectablePool = useMemo(() => {
    if (searchOpen && searchQuery.trim()) return allFlatSearchChats;
    if (activeSelection !== null) return folderChats;
    return conversations;
  }, [searchOpen, searchQuery, allFlatSearchChats, activeSelection, folderChats, conversations]);

  const handleScrollVirtualLoad = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 260) {
      if (renderLimit < folderChats.length) {
        setRenderLimit((prev) => Math.min(folderChats.length, prev + VIRTUAL_INCREMENT));
      }
    }
  };

  const toggleSelectChat = (chatId: number) => {
    setSelectedChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      if (next.size === 0) {
        setIsSelectMode(false);
      }
      return next;
    });
  };

  const enterSelectMode = (initialChatId?: number) => {
    setIsSelectMode(true);
    setSelectedChatIds(initialChatId != null ? new Set([initialChatId]) : new Set());
  };

  const handleSelectAll = () => {
    if (selectedChatIds.size >= currentSelectablePool.length && currentSelectablePool.length > 0) {
      setSelectedChatIds(new Set());
    } else {
      setSelectedChatIds(new Set(currentSelectablePool.map((c) => c.id)));
    }
  };

  const handleCycleSort = () => {
    const next: ChatSortMode =
      sortMode === "recent" ? "name" : sortMode === "name" ? "oldest" : "recent";
    setSortMode(next);
  };

  const handleAcceptSuggestion = (chat: ChatLibraryConversation) => {
    const suggestion = evaluateChatFolderSuggestion(chat, folders, language);
    if (!suggestion) return;

    if (suggestion.kind === "existing_folder" && suggestion.folderId != null) {
      onUpdateConversation(chat.id, {
        folderId: suggestion.folderId,
        suggestedFolderName: undefined,
        dismissedSuggestion: false,
      });
      notify(
        isBm
          ? `Dialihkan ke ${suggestion.folderName}`
          : isZh
            ? `已移至「${suggestion.folderName}」`
            : `Moved to ${suggestion.folderName}`,
      );
    } else if (suggestion.kind === "create_folder") {
      const created = onCreateFolder({
        name: suggestion.folderName,
        color: suggestion.suggestedColor || "lavender",
        icon: suggestion.suggestedIcon || "moon",
      });
      onUpdateConversation(chat.id, {
        folderId: created.id,
        suggestedFolderName: undefined,
        dismissedSuggestion: false,
      });
      notify(
        isBm
          ? `Folder "${created.name}" dicipta & dialihkan`
          : isZh
            ? `已创建「${created.name}」并移入对话`
            : `Created folder "${created.name}" & moved chat`,
      );
    }
  };

  const handleDismissSuggestion = (chat: ChatLibraryConversation) => {
    onUpdateConversation(chat.id, {
      dismissedSuggestion: true,
      suggestedFolderName: undefined,
    });
  };

  const handleDropChatToFolder = (chatId: number, target: ActiveFolderSelection) => {
    const chat = conversations.find((c) => c.id === chatId);
    if (!chat) return;
    if (target === "archived") {
      onUpdateConversation(chatId, { archived: true });
      notify(isBm ? "Sembang diarkibkan" : isZh ? "已归档对话" : "Chat archived");
      return;
    }
    if (target === "unsorted") {
      onUpdateConversation(chatId, { folderId: undefined, archived: false });
      notify(isBm ? "Dialihkan ke Belum Disusun" : isZh ? "已移至未分类" : "Moved to Unsorted");
      return;
    }
    if (typeof target === "number") {
      const folder = folders.find((f) => f.id === target);
      onUpdateConversation(chatId, { folderId: target, archived: false });
      notify(
        folder
          ? isBm
            ? `Dialihkan ke ${getLocalizedDefaultFolderName(folder, language)}`
            : isZh
              ? `已移至「${getLocalizedDefaultFolderName(folder, language)}」`
              : `Moved to ${getLocalizedDefaultFolderName(folder, language)}`
          : isBm
            ? "Sembang dialihkan"
            : isZh
              ? "已移动对话"
              : "Chat moved",
      );
    }
  };

  const handleToggleAutoOrganizeMode = (nextMode: AutoOrganizeChatsMode) => {
    setAutoOrganizeChats(nextMode);
    notify(
      nextMode === "suggest"
        ? isBm
          ? "Susun automatik: Cadangkan folder"
          : isZh
            ? "智能整理：建议分类（默认）"
            : "Auto-organize: Suggest folders"
        : nextMode === "automatic"
          ? isBm
            ? "Susun automatik: Automatik dengan buat asal"
            : isZh
              ? "智能整理：自动归类（支持撤销）"
              : "Auto-organize: Automatic with Undo"
          : isBm
            ? "Susun automatik: Dimatikan"
            : isZh
              ? "智能整理：已关闭"
              : "Auto-organize: Off",
    );
  };

  const selectedArray = useMemo(
    () => conversations.filter((c) => selectedChatIds.has(c.id)),
    [conversations, selectedChatIds],
  );
  const allSelectedAreArchived =
    selectedArray.length > 0 && selectedArray.every((c) => Boolean(c.archived));

  const renderEmptyFolderState = () => {
    let heading = isBm ? "Folder ini kosong" : isZh ? "该文件夹为空" : "This folder is empty";
    let body = isBm
      ? "Mulakan perbualan baharu di sini atau pindahkan sembang ke folder ini."
      : isZh
        ? "在这里开启新对话，或将其他对话移动到此文件夹。"
        : "Start a new conversation here or move chats into this folder anytime.";
    let showStartBtn = true;

    if (activeSelection === "archived") {
      heading = isBm
        ? "Tiada sembang diarkibkan"
        : isZh
          ? "暂无已归档对话"
          : "No archived chats";
      body = isBm
        ? "Sembang yang anda arkibkan akan disimpan di sini dengan selamat untuk rujukan kemudian."
        : isZh
          ? "您归档的对话将安静保存在这里，随时可以还原或删除。"
          : "Chats you archive stay tucked away safely here—you can restore or delete them anytime.";
      showStartBtn = false;
    } else if (activeSelection === "unsorted") {
      heading = isBm
        ? "Semua tersusun kemas"
        : isZh
          ? "所有对话都已整理完毕"
          : "Everything is organized";
      body = isBm
        ? "Perbualan tanpa folder akan muncul di sini."
        : isZh
          ? "尚未指定文件夹的新对话会暂时出现在这里。"
          : "Conversations without a folder will gather here quietly.";
    }

    return (
      <div className="chat-lib-empty-state">
        <span className="chat-lib-empty-glyph">
          <FolderGlyph
            icon={
              activeSelection === "archived"
                ? "archive"
                : activeSelection === "unsorted"
                  ? "inbox"
                  : activeFolderObj?.icon || "folder"
            }
            size={28}
          />
        </span>
        <h3>{heading}</h3>
        <p>{body}</p>
        {showStartBtn && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              onOpenChat(
                null,
                typeof activeSelection === "number" ? activeSelection : null,
              )
            }
          >
            <LibUiIcon name="plus" size={17} />
            <span>
              {isBm ? "Mulakan perbualan" : isZh ? "开启新对话" : "Start a conversation"}
            </span>
          </button>
        )}
      </div>
    );
  };

  const renderSearchView = () => {
    return (
      <div className="chat-lib-search-results">
        {searchResultsByFolder.length === 0 ? (
          <div className="chat-lib-empty-state">
            <span className="chat-lib-empty-glyph">
              <LibUiIcon name="search" size={26} />
            </span>
            <h3>
              {isBm
                ? "Tiada perbualan sepadan"
                : isZh
                  ? "未找到匹配的对话"
                  : "No matching chats"}
            </h3>
            <p>
              {isBm
                ? "Cuba kata kunci lain untuk tajuk atau mesej."
                : isZh
                  ? "请尝试搜索其他标题关键词或对话内容。"
                  : "Try another keyword across chat titles or message text."}
            </p>
          </div>
        ) : (
          searchResultsByFolder.map((group) => (
            <div key={group.groupKey} className="chat-lib-search-group">
              <div className="chat-lib-sticky-date-header">{group.label}</div>
              <div className="chat-lib-cards-col">
                {group.items.map(({ chat, snippet }) => (
                  <ChatCard
                    key={chat.id}
                    chat={chat}
                    folders={folders}
                    language={language}
                    autoOrganizeChats={autoOrganizeChats}
                    isSelectMode={isSelectMode}
                    isSelected={selectedChatIds.has(chat.id)}
                    highlightSnippet={snippet}
                    onOpen={() => onOpenChat(chat.id, chat.folderId ?? null)}
                    onToggleSelect={() => toggleSelectChat(chat.id)}
                    onEnterSelectMode={() => enterSelectMode(chat.id)}
                    onOpenMenu={() => setChatActionTarget(chat)}
                    onAcceptSuggestion={() => handleAcceptSuggestion(chat)}
                    onDismissSuggestion={() => handleDismissSuggestion(chat)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="chat-library-screen">
      <LibraryHeader
        language={language}
        activeSelection={activeSelection}
        folderName={activeFolderName}
        folderCount={folderChats.length}
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        sortMode={sortMode}
        isSelectMode={isSelectMode}
        selectedCount={selectedChatIds.size}
        totalSelectableCount={currentSelectablePool.length}
        onBack={back}
        onBackToHome={() => {
          setActiveSelection(null);
          setIsSelectMode(false);
          setSelectedChatIds(new Set());
        }}
        onToggleSearch={() => {
          setSearchOpen((prev) => {
            const next = !prev;
            if (!next) setSearchQuery("");
            return next;
          });
        }}
        onSearchChange={setSearchQuery}
        onNewChat={() =>
          onOpenChat(
            null,
            typeof activeSelection === "number" ? activeSelection : null,
          )
        }
        onOpenMonthlyReflection={onNavigateMonthlyReflection}
        onOpenOverflow={() => setShowLibraryOverflow(true)}
        onCycleSort={handleCycleSort}
        onCancelSelect={() => {
          setIsSelectMode(false);
          setSelectedChatIds(new Set());
        }}
        onSelectAll={handleSelectAll}
      />

      <div
        ref={scrollContainerRef}
        className="chat-lib-scroll-body"
        onScroll={handleScrollVirtualLoad}
      >
        {searchOpen && searchQuery.trim() ? (
          renderSearchView()
        ) : activeSelection === null ? (
          <>
            {/* Horizontal Recent Quick Access Row (Last 3 Chats) */}
            {recentThree.length > 0 && (
              <section
                className="chat-lib-recent-section"
                aria-label={isBm ? "Terkini" : isZh ? "最近对话" : "Recent"}
              >
                <div className="chat-lib-section-heading-row">
                  <span className="chat-lib-section-label">
                    {isBm ? "TERKINI" : isZh ? "最近对话" : "RECENT"}
                  </span>
                </div>
                <div className="chat-lib-recent-strip">
                  {recentThree.map((chat) => {
                    const folderObj = folders.find((f) => f.id === chat.folderId);
                    const folderLabel = folderObj
                      ? getLocalizedDefaultFolderName(folderObj, language)
                      : isBm
                        ? "Belum Disusun"
                        : isZh
                          ? "未分类"
                          : "Unsorted";
                    return (
                      <button
                        key={chat.id}
                        type="button"
                        className="chat-lib-recent-card"
                        onClick={() => onOpenChat(chat.id, chat.folderId ?? null)}
                      >
                        <div className="chat-lib-recent-top">
                          <span className="chat-lib-recent-folder-dot">{folderLabel}</span>
                          <span className="chat-lib-recent-time">
                            {formatRelativeActivityTime(getConversationTimestampMs(chat), language)}
                          </span>
                        </div>
                        <strong className="chat-lib-recent-title">{chat.title}</strong>
                        <span className="chat-lib-recent-preview">
                          {getLastMessagePreview(chat, language)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Desktop-Style Folder Library (Grid or Tree) */}
            <section className="chat-lib-folders-section">
              <div className="chat-lib-section-heading-row">
                <span className="chat-lib-section-label">
                  {isBm ? "FOLDER" : isZh ? "文件夹" : "FOLDERS"}
                </span>
                <button
                  type="button"
                  className="chat-lib-inline-view-switch"
                  onClick={() =>
                    setChatLibraryView(chatLibraryView === "grid" ? "tree" : "grid")
                  }
                >
                  <LibUiIcon name={chatLibraryView === "grid" ? "tree" : "grid"} size={14} />
                  <span>
                    {chatLibraryView === "grid"
                      ? isBm
                        ? "Pokok"
                        : isZh
                          ? "树状视图"
                          : "Tree"
                      : isBm
                        ? "Grid"
                        : isZh
                          ? "网格视图"
                          : "Grid"}
                  </span>
                </button>
              </div>

              {chatLibraryView === "tree" ? (
                <FolderTree
                  folders={folders}
                  conversations={conversations}
                  sortMode={sortMode}
                  language={language}
                  autoOrganizeChats={autoOrganizeChats}
                  isSelectMode={isSelectMode}
                  selectedChatIds={selectedChatIds}
                  onOpenChat={(chat) => onOpenChat(chat.id, chat.folderId ?? null)}
                  onOpenFolderMenu={(folder) => setFolderActionTarget(folder)}
                  onOpenChatMenu={(chat) => setChatActionTarget(chat)}
                  onToggleSelectChat={toggleSelectChat}
                  onEnterSelectMode={(chatId) => enterSelectMode(chatId)}
                  onAcceptSuggestion={handleAcceptSuggestion}
                  onDismissSuggestion={handleDismissSuggestion}
                  onNewChatInFolder={(sel) =>
                    onOpenChat(null, typeof sel === "number" ? sel : null)
                  }
                />
              ) : (
                <FolderGrid
                  folders={folders}
                  conversations={conversations}
                  language={language}
                  onSelectFolder={(sel) => setActiveSelection(sel)}
                  onOpenFolderMenu={(folder) => setFolderActionTarget(folder)}
                  onDropChatToFolder={handleDropChatToFolder}
                />
              )}
            </section>
          </>
        ) : (
          /* Inside-Folder Conversation List with Sticky Date Headers & Virtual Batching */
          <div className="chat-lib-inside-folder">
            {folderChats.length === 0 ? (
              renderEmptyFolderState()
            ) : (
              <>
                {groupedFolderBuckets.map((bucket) => (
                  <div key={bucket.key} className="chat-lib-date-group">
                    <div className="chat-lib-sticky-date-header">{bucket.label}</div>
                    <div className="chat-lib-cards-col">
                      {bucket.items.map((chat) => (
                        <ChatCard
                          key={chat.id}
                          chat={chat}
                          folders={folders}
                          language={language}
                          autoOrganizeChats={autoOrganizeChats}
                          isSelectMode={isSelectMode}
                          isSelected={selectedChatIds.has(chat.id)}
                          onOpen={() => onOpenChat(chat.id, chat.folderId ?? null)}
                          onToggleSelect={() => toggleSelectChat(chat.id)}
                          onEnterSelectMode={() => enterSelectMode(chat.id)}
                          onOpenMenu={() => setChatActionTarget(chat)}
                          onAcceptSuggestion={() => handleAcceptSuggestion(chat)}
                          onDismissSuggestion={() => handleDismissSuggestion(chat)}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {visibleFolderChats.length < folderChats.length && (
                  <div className="chat-lib-load-more-wrap">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() =>
                        setRenderLimit((prev) =>
                          Math.min(folderChats.length, prev + VIRTUAL_INCREMENT),
                        )
                      }
                    >
                      {isBm
                        ? `Muatkan lagi (${folderChats.length - visibleFolderChats.length})`
                        : isZh
                          ? `加载更多（剩余 ${folderChats.length - visibleFolderChats.length}）`
                          : `Show more (${folderChats.length - visibleFolderChats.length} left)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Multi-Select Bottom Action Bar (strictly inside container above bottom nav) */}
      {isSelectMode && (
        <div className="chat-lib-bulk-bar" role="toolbar">
          <button
            type="button"
            className="chat-lib-bulk-btn"
            disabled={selectedChatIds.size === 0}
            onClick={() =>
              setOrganizeTarget({
                open: true,
                chat: null,
                bulkCount: selectedChatIds.size,
              })
            }
          >
            <LibUiIcon name="folderMove" size={16} />
            <span>{isBm ? "Pindah" : isZh ? "移动" : "Move"}</span>
          </button>

          <button
            type="button"
            className="chat-lib-bulk-btn"
            disabled={selectedChatIds.size === 0}
            onClick={() => {
              const ids = Array.from(selectedChatIds);
              const nextArchived = !allSelectedAreArchived;
              onBulkUpdateConversations(ids, (c) => ({ ...c, archived: nextArchived }));
              setIsSelectMode(false);
              setSelectedChatIds(new Set());
              notify(
                nextArchived
                  ? isBm
                    ? `${ids.length} sembang diarkibkan`
                    : isZh
                      ? `已归档 ${ids.length} 段对话`
                      : `${ids.length} archived`
                  : isBm
                    ? `${ids.length} sembang dipulihkan`
                    : isZh
                      ? `已还原 ${ids.length} 段对话`
                      : `${ids.length} restored`,
              );
            }}
          >
            <LibUiIcon name={allSelectedAreArchived ? "restore" : "archive"} size={16} />
            <span>
              {allSelectedAreArchived
                ? isBm
                  ? "Pulihkan"
                  : isZh
                    ? "还原"
                    : "Restore"
                : isBm
                  ? "Arkib"
                  : isZh
                    ? "归档"
                    : "Archive"}
            </span>
          </button>

          <button
            type="button"
            className="chat-lib-bulk-btn danger"
            disabled={selectedChatIds.size === 0}
            onClick={() => setChatsToDelete(selectedArray)}
          >
            <LibUiIcon name="trash" size={16} />
            <span>{isBm ? "Padam" : isZh ? "删除" : "Delete"}</span>
          </button>
        </div>
      )}

      {/* Library Overflow Bottom Sheet (New Folder, Monthly Reflection, Grid/Tree, Sort, Select, Auto-Organize) */}
      {showLibraryOverflow &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="chat-library-sheet-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={isBm ? "Menu Sembang" : isZh ? "对话库选项" : "Chats options"}
            onClick={() => setShowLibraryOverflow(false)}
          >
            <div className="chat-library-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="chat-sheet-handle-row" onClick={() => setShowLibraryOverflow(false)}>
                <span className="chat-sheet-handle" aria-hidden="true" />
              </div>

              <div className="chat-sheet-header compact">
                <div className="chat-sheet-title-group">
                  <h2>{isBm ? "Pilihan Perpustakaan" : isZh ? "对话库设置" : "Library Options"}</h2>
                </div>
                <button
                  type="button"
                  className="chat-sheet-close-btn"
                  onClick={() => setShowLibraryOverflow(false)}
                  aria-label={isBm ? "Tutup" : isZh ? "关闭" : "Close"}
                >
                  <LibUiIcon name="close" size={18} />
                </button>
              </div>

              <div className="chat-lib-sheet-body">
                {/* Auto-organize 3-state setting */}
                <div className="chat-overflow-mode-box" style={{ paddingLeft: 0, paddingRight: 0, paddingTop: 4 }}>
                  <span className="chat-overflow-section-label">
                    {isBm ? "SUSUN SEMBANG AUTOMATIK" : isZh ? "自动归类对话" : "AUTO-ORGANIZE CHATS"}
                  </span>
                  <div className="chat-lib-tri-segmented" role="radiogroup">
                    {(
                      [
                        {
                          id: "suggest",
                          label: isBm ? "Cadang" : isZh ? "建议" : "Suggest",
                        },
                        {
                          id: "automatic",
                          label: isBm ? "Automatik" : isZh ? "自动" : "Automatic",
                        },
                        {
                          id: "off",
                          label: isBm ? "Tutup" : isZh ? "关闭" : "Off",
                        },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={autoOrganizeChats === opt.id}
                        className={`chat-mode-seg-btn ${autoOrganizeChats === opt.id ? "active" : ""}`}
                        onClick={() => handleToggleAutoOrganizeMode(opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="chat-lib-setting-hint">
                    {isBm
                      ? "Hanya mencadang/mengalih folder selepas 3 mesej. Tidak akan mengubah keizinan laporan atau mengarkib secara automatik."
                      : isZh
                        ? "仅在对话满 3 条消息后自动建议或移动文件夹；绝不会擅自更改月度总结授权或归档记录。"
                        : "Only suggests or assigns a folder after 3 messages. Never changes monthly report consent or archives."}
                  </p>
                </div>

                {/* Grid / Tree view toggle */}
                <div className="chat-overflow-mode-box" style={{ paddingLeft: 0, paddingRight: 0 }}>
                  <span className="chat-overflow-section-label">
                    {isBm ? "SUSUN ATUR FOLDER" : isZh ? "文件夹视图" : "FOLDER VIEW"}
                  </span>
                  <div className="chat-mode-segmented" role="radiogroup">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={chatLibraryView === "grid"}
                      className={`chat-mode-seg-btn ${chatLibraryView === "grid" ? "active" : ""}`}
                      onClick={() => {
                        setChatLibraryView("grid");
                        setShowLibraryOverflow(false);
                      }}
                    >
                      <LibUiIcon name="grid" size={16} />
                      <span>{isBm ? "Grid" : isZh ? "网格" : "Grid"}</span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={chatLibraryView === "tree"}
                      className={`chat-mode-seg-btn ${chatLibraryView === "tree" ? "active" : ""}`}
                      onClick={() => {
                        setChatLibraryView("tree");
                        setShowLibraryOverflow(false);
                      }}
                    >
                      <LibUiIcon name="tree" size={16} />
                      <span>{isBm ? "Pokok" : isZh ? "树状" : "Tree"}</span>
                    </button>
                  </div>
                </div>

                <div className="chat-overflow-list" style={{ padding: "4px 0 8px" }}>
                  <button
                    type="button"
                    className="chat-overflow-item"
                    onClick={() => {
                      setShowLibraryOverflow(false);
                      setFolderSheetState({ open: true, mode: "create", folder: null });
                    }}
                  >
                    <span className="chat-overflow-icon active">
                      <LibUiIcon name="plus" size={18} />
                    </span>
                    <span className="chat-overflow-texts">
                      <strong>{isBm ? "Folder Baharu" : isZh ? "新建文件夹" : "New Folder"}</strong>
                      <small>
                        {isBm
                          ? "Cipta folder dengan warna & ikon pilihan"
                          : isZh
                            ? "创建自定义颜色与图标的文件夹"
                            : "Create a custom folder with color & icon"}
                      </small>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="chat-overflow-item"
                    onClick={() => {
                      setShowLibraryOverflow(false);
                      onNavigateMonthlyReflection();
                    }}
                  >
                    <span className="chat-overflow-icon">
                      <LibUiIcon name="reflection" size={18} />
                    </span>
                    <span className="chat-overflow-texts">
                      <strong>
                        {isBm ? "Refleksi Bulanan" : isZh ? "月度心绪反思" : "Monthly Reflection"}
                      </strong>
                      <small>
                        {isBm
                          ? "Ringkasan perbualan dan mood yang dibenarkan"
                          : isZh
                            ? "仅使用您授权的对话和记忆生成"
                            : "Uses only conversations & memories you allow"}
                      </small>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="chat-overflow-item"
                    onClick={() => {
                      handleCycleSort();
                      setShowLibraryOverflow(false);
                    }}
                  >
                    <span className="chat-overflow-icon">
                      <LibUiIcon name="sort" size={18} />
                    </span>
                    <span className="chat-overflow-texts">
                      <strong>{isBm ? "Susun Mengikut" : isZh ? "排序方式" : "Sort Chats"}</strong>
                      <small>
                        {sortMode === "recent"
                          ? isBm
                            ? "Semasa: Terkini dahulu"
                            : isZh
                              ? "当前：最近优先"
                              : "Current: Recent first"
                          : sortMode === "name"
                            ? isBm
                              ? "Semasa: Mengikut abjad"
                              : isZh
                                ? "当前：按名称"
                                : "Current: Alphabetical (Name)"
                            : isBm
                              ? "Semasa: Terlama dahulu"
                              : isZh
                                ? "当前：最早优先"
                                : "Current: Oldest first"}
                      </small>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="chat-overflow-item"
                    onClick={() => {
                      setShowLibraryOverflow(false);
                      enterSelectMode();
                    }}
                  >
                    <span className="chat-overflow-icon">
                      <LibUiIcon name="select" size={18} />
                    </span>
                    <span className="chat-overflow-texts">
                      <strong>{isBm ? "Pilih Sembang" : isZh ? "批量管理" : "Select Chats"}</strong>
                      <small>
                        {isBm
                          ? "Pindah, arkib atau padam beberapa sembang serentak"
                          : isZh
                            ? "批量移动、归档或删除多条对话"
                            : "Bulk move, archive, or delete"}
                      </small>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Folder Action Menu (Rename, Color/Icon, Delete Folder) */}
      {folderActionTarget &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="chat-library-sheet-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={getLocalizedDefaultFolderName(folderActionTarget, language)}
            onClick={() => setFolderActionTarget(null)}
          >
            <div className="chat-library-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="chat-sheet-handle-row" onClick={() => setFolderActionTarget(null)}>
                <span className="chat-sheet-handle" aria-hidden="true" />
              </div>

              <div className="chat-sheet-header compact">
                <div className="chat-sheet-title-group">
                  <h2>{getLocalizedDefaultFolderName(folderActionTarget, language)}</h2>
                </div>
                <button
                  type="button"
                  className="chat-sheet-close-btn"
                  onClick={() => setFolderActionTarget(null)}
                  aria-label={isBm ? "Tutup" : isZh ? "关闭" : "Close"}
                >
                  <LibUiIcon name="close" size={18} />
                </button>
              </div>

              <div className="chat-overflow-list" style={{ padding: "8px 14px 14px" }}>
                <button
                  type="button"
                  className="chat-overflow-item"
                  onClick={() => {
                    const target = folderActionTarget;
                    setFolderActionTarget(null);
                    setFolderSheetState({ open: true, mode: "edit", folder: target });
                  }}
                >
                  <span className="chat-overflow-icon">
                    <LibUiIcon name="edit" size={18} />
                  </span>
                  <span className="chat-overflow-texts">
                    <strong>
                      {isBm
                        ? "Namakan semula / Tukar warna & ikon"
                        : isZh
                          ? "重命名 / 更换颜色与图标"
                          : "Rename & Customize Color or Icon"}
                    </strong>
                  </span>
                </button>

                <button
                  type="button"
                  className="chat-overflow-item"
                  onClick={() => {
                    const target = folderActionTarget;
                    setFolderActionTarget(null);
                    setFolderToDelete(target);
                  }}
                >
                  <span className="chat-overflow-icon danger">
                    <LibUiIcon name="trash" size={18} />
                  </span>
                  <span className="chat-overflow-texts">
                    <strong style={{ color: "var(--theme-error)" }}>
                      {isBm ? "Padam Folder" : isZh ? "删除文件夹" : "Delete Folder"}
                    </strong>
                    <small>
                      {isBm
                        ? "Sembang di dalam akan dipindah ke Belum Disusun"
                        : isZh
                          ? "内部对话将安全移至「未分类」"
                          : "Chats inside safely move to Unsorted"}
                    </small>
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Individual Chat Action Menu Bottom Sheet */}
      {chatActionTarget &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="chat-library-sheet-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={chatActionTarget.title}
            onClick={() => setChatActionTarget(null)}
          >
            <div className="chat-library-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="chat-sheet-handle-row" onClick={() => setChatActionTarget(null)}>
                <span className="chat-sheet-handle" aria-hidden="true" />
              </div>

              <div className="chat-sheet-header compact">
                <div className="chat-sheet-title-group">
                  <h2>{chatActionTarget.title}</h2>
                </div>
                <button
                  type="button"
                  className="chat-sheet-close-btn"
                  onClick={() => setChatActionTarget(null)}
                  aria-label={isBm ? "Tutup" : isZh ? "关闭" : "Close"}
                >
                  <LibUiIcon name="close" size={18} />
                </button>
              </div>

              <div className="chat-overflow-list" style={{ padding: "8px 14px 14px" }}>
                <button
                  type="button"
                  className="chat-overflow-item"
                  onClick={() => {
                    const c = chatActionTarget;
                    setChatActionTarget(null);
                    setOrganizeTarget({ open: true, chat: c, bulkCount: 0 });
                  }}
                >
                  <span className="chat-overflow-icon">
                    <LibUiIcon name="edit" size={18} />
                  </span>
                  <span className="chat-overflow-texts">
                    <strong>
                      {isBm ? "Namakan semula & Pindah folder" : isZh ? "重命名并移动到文件夹" : "Rename & Move to Folder"}
                    </strong>
                  </span>
                </button>

                <div className="chat-lib-menu-switch-row">
                  <div className="chat-overflow-texts">
                    <strong>
                      {isBm
                        ? "Sertakan dalam laporan bulanan"
                        : isZh
                          ? "用于月度反思总结"
                          : "Include in monthly report"}
                    </strong>
                    <small>
                      {isBm
                        ? "Hanya dengan keizinan anda"
                        : isZh
                          ? "仅在您允许时用于总结"
                          : "Summarize themes when allowed"}
                    </small>
                  </div>
                  <ThemedSwitch
                    checked={chatActionTarget.reportAllowed !== false}
                    onChange={(nextVal) => {
                      onUpdateConversation(chatActionTarget.id, { reportAllowed: nextVal });
                      setChatActionTarget((prev) =>
                        prev ? { ...prev, reportAllowed: nextVal } : prev,
                      );
                    }}
                    ariaLabel={
                      isBm
                        ? "Sertakan dalam laporan bulanan"
                        : isZh
                          ? "用于月度反思总结"
                          : "Include in monthly report"
                    }
                  />
                </div>

                <button
                  type="button"
                  className="chat-overflow-item"
                  onClick={() => {
                    const c = chatActionTarget;
                    setChatActionTarget(null);
                    onUpdateConversation(c.id, { archived: !c.archived });
                    notify(
                      !c.archived
                        ? isBm
                          ? "Sembang diarkibkan"
                          : isZh
                            ? "对话已归档"
                            : "Chat archived"
                        : isBm
                          ? "Sembang dipulihkan"
                          : isZh
                            ? "对话已还原"
                            : "Chat restored",
                    );
                  }}
                >
                  <span className="chat-overflow-icon">
                    <LibUiIcon name={chatActionTarget.archived ? "restore" : "archive"} size={18} />
                  </span>
                  <span className="chat-overflow-texts">
                    <strong>
                      {chatActionTarget.archived
                        ? isBm
                          ? "Pulihkan ke folder"
                          : isZh
                            ? "从归档还原"
                            : "Restore"
                        : isBm
                          ? "Arkibkan sembang"
                          : isZh
                            ? "归档对话"
                            : "Archive"}
                    </strong>
                  </span>
                </button>

                <button
                  type="button"
                  className="chat-overflow-item"
                  onClick={() => {
                    const c = chatActionTarget;
                    setChatActionTarget(null);
                    setChatsToDelete([c]);
                  }}
                >
                  <span className="chat-overflow-icon danger">
                    <LibUiIcon name="trash" size={18} />
                  </span>
                  <span className="chat-overflow-texts">
                    <strong style={{ color: "var(--theme-error)" }}>
                      {isBm ? "Padam sembang" : isZh ? "删除对话" : "Delete"}
                    </strong>
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* New / Rename / Customize Folder Sheet */}
      <FolderSheet
        open={folderSheetState.open}
        mode={folderSheetState.mode}
        initialFolder={folderSheetState.folder}
        language={language}
        onClose={() => setFolderSheetState((prev) => ({ ...prev, open: false }))}
        onSubmit={({ name, color, icon }) => {
          if (folderSheetState.mode === "edit" && folderSheetState.folder) {
            onUpdateFolder(folderSheetState.folder.id, { name, color, icon });
            notify(isBm ? "Folder dikemas kini" : isZh ? "文件夹已更新" : "Folder updated");
          } else {
            const created = onCreateFolder({ name, color, icon });
            notify(
              isBm
                ? `Folder "${created.name}" dicipta`
                : isZh
                  ? `已创建「${created.name}」`
                  : `Created folder "${created.name}"`,
            );
          }
        }}
      />

      {/* Organize / Bulk Move Sheet */}
      <ChatOrganizeSheet
        open={organizeTarget.open}
        chat={organizeTarget.chat}
        bulkCount={organizeTarget.bulkCount}
        folders={folders}
        language={language}
        onClose={() => setOrganizeTarget({ open: false, chat: null, bulkCount: 0 })}
        onSaveSingle={({ id, title, folderId, reportAllowed }) => {
          onUpdateConversation(id, { title, folderId, reportAllowed });
          notify(isBm ? "Perubahan disimpan" : isZh ? "已保存调整" : "Chat updated");
        }}
        onBulkMove={(targetFolderId) => {
          const ids = Array.from(selectedChatIds);
          onBulkUpdateConversations(ids, (c) => ({
            ...c,
            folderId: targetFolderId,
            archived: false,
          }));
          setIsSelectMode(false);
          setSelectedChatIds(new Set());
          notify(
            isBm
              ? `${ids.length} sembang dialihkan`
              : isZh
                ? `已移动 ${ids.length} 段对话`
                : `Moved ${ids.length} chat${ids.length === 1 ? "" : "s"}`,
          );
        }}
        onToggleArchiveSingle={(c) => {
          onUpdateConversation(c.id, { archived: !c.archived });
          notify(
            !c.archived
              ? isBm
                ? "Sembang diarkibkan"
                : isZh
                  ? "已归档对话"
                  : "Chat archived"
              : isBm
                ? "Sembang dipulihkan"
                : isZh
                  ? "已还原对话"
                  : "Chat restored",
          );
        }}
        onRequestDeleteSingle={(c) => setChatsToDelete([c])}
      />

      {/* Delete Folder Confirmation */}
      <ConfirmDeleteSheet
        open={folderToDelete !== null}
        title={
          isBm
            ? "Padam folder ini?"
            : isZh
              ? "确定删除此文件夹？"
              : "Delete this folder?"
        }
        description={
          isBm
            ? "Sembang di dalam folder ini tidak akan dipadam—semuanya akan dipindahkan ke Belum Disusun."
            : isZh
              ? "文件夹内的对话不会被删除，将自动移至「未分类」中保留。"
              : "Conversations inside won't be lost—they will safely move to Unsorted."
        }
        confirmLabel={isBm ? "Padam Folder" : isZh ? "删除文件夹" : "Delete Folder"}
        cancelLabel={isBm ? "Batal" : isZh ? "取消" : "Cancel"}
        onConfirm={() => {
          if (!folderToDelete) return;
          const deletedId = folderToDelete.id;
          onDeleteFolder(deletedId);
          if (activeSelection === deletedId) setActiveSelection(null);
          notify(isBm ? "Folder dipadam" : isZh ? "文件夹已删除" : "Folder deleted");
        }}
        onCancel={() => setFolderToDelete(null)}
      />

      {/* Delete Chat Confirmation */}
      <ConfirmDeleteSheet
        open={chatsToDelete.length > 0}
        title={
          chatsToDelete.length > 1
            ? isBm
              ? `Padam ${chatsToDelete.length} sembang?`
              : isZh
                ? `删除 ${chatsToDelete.length} 段对话？`
                : `Delete ${chatsToDelete.length} chats?`
            : isBm
              ? "Padam perbualan ini?"
              : isZh
                ? "删除这段对话？"
                : "Delete this conversation?"
        }
        description={
          isBm
            ? "Tindakan ini memadam perbualan secara kekal."
            : isZh
              ? "删除后无法恢复该对话记录。"
              : "This permanently removes the selected conversation(s)."
        }
        confirmLabel={isBm ? "Padam" : isZh ? "删除" : "Delete"}
        cancelLabel={isBm ? "Batal" : isZh ? "取消" : "Cancel"}
        onConfirm={() => {
          const ids = chatsToDelete.map((c) => c.id);
          onDeleteConversations(ids);
          setIsSelectMode(false);
          setSelectedChatIds(new Set());
          notify(
            ids.length > 1
              ? isBm
                ? `${ids.length} sembang dipadam`
                : isZh
                  ? `已删除 ${ids.length} 段对话`
                  : `${ids.length} chats deleted`
              : isBm
                ? "Perbualan dipadam"
                : isZh
                  ? "对话已删除"
                  : "Conversation deleted",
          );
        }}
        onCancel={() => setChatsToDelete([])}
      />
    </div>
  );
}
