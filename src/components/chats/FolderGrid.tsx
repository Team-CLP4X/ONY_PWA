import React from "react";
import type { AppLanguage } from "../../i18n/translations";
import {
  type ActiveFolderSelection,
  type ChatLibraryConversation,
  type ChatLibraryFolder,
  getConversationTimestampMs,
} from "../../utils/chatLibraryHelpers";
import { FolderCard } from "./FolderCard";

export interface FolderGridProps {
  folders: ChatLibraryFolder[];
  conversations: ChatLibraryConversation[];
  language: AppLanguage;
  onSelectFolder: (selection: ActiveFolderSelection) => void;
  onOpenFolderMenu: (folder: ChatLibraryFolder, anchorEl: HTMLElement) => void;
  onDropChatToFolder: (chatId: number, target: ActiveFolderSelection) => void;
}

export function FolderGrid({
  folders,
  conversations,
  language,
  onSelectFolder,
  onOpenFolderMenu,
  onDropChatToFolder,
}: FolderGridProps) {
  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  const activeChats = conversations.filter((c) => !c.archived);
  const archivedChats = conversations.filter((c) => Boolean(c.archived));
  const unsortedChats = activeChats.filter(
    (c) => c.folderId == null || !folders.some((f) => f.id === c.folderId),
  );

  const getLatestMs = (items: ChatLibraryConversation[]): number | null => {
    if (items.length === 0) return null;
    return Math.max(...items.map((c) => getConversationTimestampMs(c)));
  };

  return (
    <div className="chat-folder-grid" role="list">
      {folders.map((folder) => {
        const items = activeChats.filter((c) => c.folderId === folder.id);
        const hasPendingSuggestion = items.some(
          (c) => Boolean(c.suggestedFolderName) && !c.dismissedSuggestion,
        );
        return (
          <FolderCard
            key={folder.id}
            id={folder.id}
            folder={folder}
            name={folder.name}
            count={items.length}
            lastActivityMs={getLatestMs(items)}
            hasBadgeDot={hasPendingSuggestion}
            language={language}
            onOpen={() => onSelectFolder(folder.id)}
            onOpenMenu={(el) => onOpenFolderMenu(folder, el)}
            onDropChatId={(chatId) => onDropChatToFolder(chatId, folder.id)}
          />
        );
      })}

      {/* Virtual Unsorted Folder */}
      <FolderCard
        id="unsorted"
        isVirtual
        virtualKind="unsorted"
        name={isBm ? "Belum Disusun" : isZh ? "未分类" : "Unsorted"}
        count={unsortedChats.length}
        lastActivityMs={getLatestMs(unsortedChats)}
        hasBadgeDot={unsortedChats.some((c) => !c.dismissedSuggestion)}
        language={language}
        onOpen={() => onSelectFolder("unsorted")}
        onDropChatId={(chatId) => onDropChatToFolder(chatId, "unsorted")}
      />

      {/* Virtual Archived Folder */}
      <FolderCard
        id="archived"
        isVirtual
        virtualKind="archived"
        name={isBm ? "Diarkibkan" : isZh ? "已归档" : "Archived"}
        count={archivedChats.length}
        lastActivityMs={getLatestMs(archivedChats)}
        language={language}
        onOpen={() => onSelectFolder("archived")}
        onDropChatId={(chatId) => onDropChatToFolder(chatId, "archived")}
      />
    </div>
  );
}
