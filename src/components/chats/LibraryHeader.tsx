import React from "react";
import type { AppLanguage } from "../../i18n/translations";
import type {
  ActiveFolderSelection,
  ChatSortMode,
} from "../../utils/chatLibraryHelpers";
import { LibUiIcon } from "./FolderGlyph";

export interface LibraryHeaderProps {
  language: AppLanguage;
  activeSelection: ActiveFolderSelection;
  folderName: string;
  folderCount: number;
  searchOpen: boolean;
  searchQuery: string;
  sortMode: ChatSortMode;
  isSelectMode: boolean;
  selectedCount: number;
  totalSelectableCount: number;
  onBack: () => void;
  onBackToHome: () => void;
  onToggleSearch: () => void;
  onSearchChange: (q: string) => void;
  onNewChat: () => void;
  onOpenMonthlyReflection: () => void;
  onOpenOverflow: () => void;
  onCycleSort: () => void;
  onCancelSelect: () => void;
  onSelectAll: () => void;
}

export function LibraryHeader({
  language,
  activeSelection,
  folderName,
  folderCount,
  searchOpen,
  searchQuery,
  sortMode,
  isSelectMode,
  selectedCount,
  totalSelectableCount,
  onBack,
  onBackToHome,
  onToggleSearch,
  onSearchChange,
  onNewChat,
  onOpenMonthlyReflection,
  onOpenOverflow,
  onCycleSort,
  onCancelSelect,
  onSelectAll,
}: LibraryHeaderProps) {
  const isBm = language === "Bahasa Melayu";
  const isZh = language === "中文";

  const sortLabel =
    sortMode === "recent"
      ? isBm
        ? "Terkini"
        : isZh
          ? "最新"
          : "Recent"
      : sortMode === "name"
        ? isBm
          ? "Nama"
          : isZh
            ? "名称"
            : "Name"
        : isBm
          ? "Terlama"
          : isZh
            ? "最早"
            : "Oldest";

  if (isSelectMode) {
    const allSelected = totalSelectableCount > 0 && selectedCount >= totalSelectableCount;
    return (
      <header className="chat-lib-header">
        <div className="chat-lib-header-row">
          <button
            type="button"
            className="chat-lib-icon-btn"
            onClick={onCancelSelect}
            aria-label={isBm ? "Batal pilih" : isZh ? "取消选择" : "Cancel selection"}
          >
            <LibUiIcon name="close" size={18} />
          </button>

          <div className="chat-lib-header-title-block">
            <h1 className="chat-lib-header-title">
              {isBm
                ? `${selectedCount} dipilih`
                : isZh
                  ? `已选择 ${selectedCount} 项`
                  : `${selectedCount} selected`}
            </h1>
          </div>

          <button
            type="button"
            className="chat-lib-text-action"
            onClick={onSelectAll}
          >
            {allSelected
              ? isBm
                ? "Nyahpilih"
                : isZh
                  ? "全不选"
                  : "None"
              : isBm
                ? "Pilih semua"
                : isZh
                  ? "全选"
                  : "All"}
          </button>
        </div>
      </header>
    );
  }

  if (activeSelection !== null) {
    return (
      <header className="chat-lib-header">
        <div className="chat-lib-header-row">
          <button
            type="button"
            className="chat-lib-icon-btn"
            onClick={onBackToHome}
            aria-label={isBm ? "Kembali ke semua folder" : isZh ? "返回全部文件夹" : "Back to folders"}
          >
            <LibUiIcon name="back" size={19} />
          </button>

          <div className="chat-lib-breadcrumb-wrap">
            <div className="chat-lib-breadcrumb-trail">
              <button
                type="button"
                className="chat-lib-breadcrumb-root"
                onClick={onBackToHome}
              >
                {isBm ? "Sembang" : isZh ? "对话库" : "Chats"}
              </button>
              <span aria-hidden="true">›</span>
              <span className="chat-lib-breadcrumb-current">{folderName}</span>
            </div>
            <span className="chat-lib-breadcrumb-count">
              {folderCount === 1
                ? isBm
                  ? "1 sembang"
                  : isZh
                    ? "1 段对话"
                    : "1 chat"
                : isBm
                  ? `${folderCount} sembang`
                  : isZh
                    ? `${folderCount} 段对话`
                    : `${folderCount} chats`}
            </span>
          </div>

          <div className="chat-lib-header-actions">
            <button
              type="button"
              className="chat-lib-sort-pill"
              onClick={onCycleSort}
              aria-label={isBm ? "Susun perbualan" : isZh ? "切换排序方式" : "Change sort order"}
            >
              <LibUiIcon name="sort" size={15} />
              <span>{sortLabel}</span>
            </button>

            {activeSelection !== "archived" && (
              <button
                type="button"
                className="chat-lib-icon-btn primary-tint"
                onClick={onNewChat}
                aria-label={isBm ? "Sembang baharu" : isZh ? "新建对话" : "New chat"}
              >
                <LibUiIcon name="plus" size={19} />
              </button>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="chat-lib-header">
      <div className="chat-lib-header-row">
        <button
          type="button"
          className="chat-lib-icon-btn"
          onClick={onBack}
          aria-label={isBm ? "Kembali ke sembang" : isZh ? "返回聊天" : "Back to chat"}
        >
          <LibUiIcon name="back" size={19} />
        </button>

        <div className="chat-lib-header-title-block">
          <h1 className="chat-lib-header-title">
            {isBm ? "Sembang" : isZh ? "对话库" : "Chats"}
          </h1>
        </div>

        <div className="chat-lib-header-actions">
          <button
            type="button"
            className="chat-lib-icon-btn"
            onClick={onOpenMonthlyReflection}
            title={isBm ? "Refleksi Bulanan" : isZh ? "月度反思" : "Monthly Reflection"}
            aria-label={isBm ? "Refleksi Bulanan" : isZh ? "月度反思" : "Monthly Reflection"}
          >
            <LibUiIcon name="reflection" size={18} />
          </button>

          <button
            type="button"
            className={`chat-lib-icon-btn ${searchOpen ? "active" : ""}`}
            onClick={onToggleSearch}
            aria-label={isBm ? "Cari sembang" : isZh ? "搜索对话" : "Search chats"}
            aria-expanded={searchOpen}
          >
            <LibUiIcon name="search" size={18} />
          </button>

          <button
            type="button"
            className="chat-lib-icon-btn primary-tint"
            onClick={onNewChat}
            aria-label={isBm ? "Sembang baharu" : isZh ? "新建对话" : "New chat"}
          >
            <LibUiIcon name="plus" size={19} />
          </button>

          <button
            type="button"
            className="chat-lib-icon-btn"
            onClick={onOpenOverflow}
            aria-label={isBm ? "Pilihan lain" : isZh ? "更多选项" : "More options"}
          >
            <LibUiIcon name="more" size={18} />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="chat-lib-search-bar">
          <LibUiIcon name="search" size={16} className="chat-lib-search-bar-icon" />
          <input
            type="search"
            className="chat-lib-search-input"
            autoFocus
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              isBm
                ? "Cari tajuk atau mesej merentas folder..."
                : isZh
                  ? "跨文件夹搜索标题或聊天内容…"
                  : "Search titles & messages across folders..."
            }
          />
          {searchQuery && (
            <button
              type="button"
              className="chat-lib-search-clear"
              onClick={() => onSearchChange("")}
              aria-label={isBm ? "Padam carian" : isZh ? "清空搜索" : "Clear search"}
            >
              <LibUiIcon name="close" size={15} />
            </button>
          )}
        </div>
      )}
    </header>
  );
}
