import React, { useState } from "react";
import type { AppLanguage } from "../../i18n/translations";
import { type AutoOrganizeChatsMode, useTheme } from "../../theme/ThemeContext";
import {
  type ActiveFolderSelection,
  type ChatLibraryConversation,
  type ChatLibraryFolder,
  type ChatSortMode,
  getFolderAccentHex,
  getLocalizedDefaultFolderName,
  resolveFolderDefaults,
  sortConversations,
} from "../../utils/chatLibraryHelpers";
import { FolderGlyph, LibUiIcon } from "./FolderGlyph";
import { ChatCard } from "./ChatCard";

export interface FolderTreeProps {
  folders: ChatLibraryFolder[];
  conversations: ChatLibraryConversation[];
  sortMode: ChatSortMode;
  language: AppLanguage;
  autoOrganizeChats: AutoOrganizeChatsMode;
  isSelectMode: boolean;
  selectedChatIds: Set<number>;
  onOpenChat: (chat: ChatLibraryConversation) => void;
  onOpenFolderMenu: (folder: ChatLibraryFolder) => void;
  onOpenChatMenu: (chat: ChatLibraryConversation) => void;
  onToggleSelectChat: (chatId: number) => void;
  onEnterSelectMode: (chatId: number) => void;
  onAcceptSuggestion: (chat: ChatLibraryConversation) => void;
  onDismissSuggestion: (chat: ChatLibraryConversation) => void;
  onNewChatInFolder: (selection: ActiveFolderSelection) => void;
}

export function FolderTree({
  folders,
  conversations,
  sortMode,
  language,
  autoOrganizeChats,
  isSelectMode,
  selectedChatIds,
  onOpenChat,
  onOpenFolderMenu,
  onOpenChatMenu,
  onToggleSelectChat,
  onEnterSelectMode,
  onAcceptSuggestion,
  onDismissSuggestion,
  onNewChatInFolder,
}: FolderTreeProps) {
  const { isDark } = useTheme();
  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => {
    const initial = new Set<string>(folders.slice(0, 2).map((f) => String(f.id)));
    initial.add("unsorted");
    return initial;
  });

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const activeChats = conversations.filter((c) => !c.archived);
  const archivedChats = sortConversations(
    conversations.filter((c) => Boolean(c.archived)),
    sortMode,
  );
  const unsortedChats = sortConversations(
    activeChats.filter(
      (c) => c.folderId == null || !folders.some((f) => f.id === c.folderId),
    ),
    sortMode,
  );

  const renderBranch = ({
    branchKey,
    selectionId,
    name,
    colorHex,
    icon,
    chats,
    folderObj,
    allowCreateChat,
  }: {
    branchKey: string;
    selectionId: ActiveFolderSelection;
    name: string;
    colorHex: string;
    icon: string;
    chats: ChatLibraryConversation[];
    folderObj?: ChatLibraryFolder;
    allowCreateChat: boolean;
  }) => {
    const isExpanded = expandedKeys.has(branchKey);

    return (
      <div className="chat-tree-branch" key={branchKey}>
        <div className="chat-tree-row">
          <button
            type="button"
            className="chat-tree-toggle"
            aria-expanded={isExpanded}
            onClick={() => toggleExpand(branchKey)}
          >
            <span className="chat-tree-chevron">
              <LibUiIcon name={isExpanded ? "chevronDown" : "chevronRight"} size={16} />
            </span>
            <span
              className="chat-tree-folder-icon"
              style={{ "--folder-accent": colorHex } as React.CSSProperties}
            >
              <FolderGlyph icon={icon} size={17} />
            </span>
            <span className="chat-tree-folder-name">{name}</span>
            <span className="chat-tree-count">{chats.length}</span>
          </button>

          {folderObj && (
            <button
              type="button"
              className="chat-tree-row-more"
              aria-label={isBm ? `Pilihan ${name}` : isZh ? `${name} 选项` : `${name} options`}
              onClick={() => onOpenFolderMenu(folderObj)}
            >
              <LibUiIcon name="more" size={16} />
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="chat-tree-children">
            {chats.length === 0 ? (
              <div className="chat-tree-empty-row">
                <span>
                  {branchKey === "archived"
                    ? isBm
                      ? "Tiada sembang diarkibkan"
                      : isZh
                        ? "暂无已归档对话"
                        : "No archived chats"
                    : isBm
                      ? "Folder ini kosong"
                      : isZh
                        ? "文件夹为空"
                        : "No chats here yet"}
                </span>
                {allowCreateChat && (
                  <button
                    type="button"
                    className="chat-tree-empty-add"
                    onClick={() => onNewChatInFolder(selectionId)}
                  >
                    <LibUiIcon name="plus" size={14} />
                    <span>{isBm ? "Mulakan" : isZh ? "新建" : "New chat"}</span>
                  </button>
                )}
              </div>
            ) : (
              chats.map((chat) => (
                <ChatCard
                  key={chat.id}
                  chat={chat}
                  folders={folders}
                  language={language}
                  autoOrganizeChats={autoOrganizeChats}
                  isSelectMode={isSelectMode}
                  isSelected={selectedChatIds.has(chat.id)}
                  compact
                  onOpen={() => onOpenChat(chat)}
                  onToggleSelect={() => onToggleSelectChat(chat.id)}
                  onEnterSelectMode={() => onEnterSelectMode(chat.id)}
                  onOpenMenu={() => onOpenChatMenu(chat)}
                  onAcceptSuggestion={() => onAcceptSuggestion(chat)}
                  onDismissSuggestion={() => onDismissSuggestion(chat)}
                />
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="chat-folder-tree" role="tree">
      {folders.map((folder) => {
        const { color, icon } = resolveFolderDefaults(folder);
        const items = sortConversations(
          activeChats.filter((c) => c.folderId === folder.id),
          sortMode,
        );
        return renderBranch({
          branchKey: String(folder.id),
          selectionId: folder.id,
          name: getLocalizedDefaultFolderName(folder, language),
          colorHex: getFolderAccentHex(color, isDark),
          icon,
          chats: items,
          folderObj: folder,
          allowCreateChat: true,
        });
      })}

      {renderBranch({
        branchKey: "unsorted",
        selectionId: "unsorted",
        name: isBm ? "Belum Disusun" : isZh ? "未分类" : "Unsorted",
        colorHex: getFolderAccentHex("peach", isDark),
        icon: "inbox",
        chats: unsortedChats,
        allowCreateChat: true,
      })}

      {renderBranch({
        branchKey: "archived",
        selectionId: "archived",
        name: isBm ? "Diarkibkan" : isZh ? "已归档" : "Archived",
        colorHex: getFolderAccentHex("slate", isDark),
        icon: "archive",
        chats: archivedChats,
        allowCreateChat: false,
      })}
    </div>
  );
}
