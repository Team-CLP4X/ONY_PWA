import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getMyNodeStrings, type InboxFilterKind } from "../../utils/nodeInboxHelpers";

export interface InboxFilterChipsProps {
  filter: InboxFilterKind;
  onChangeFilter: (next: InboxFilterKind) => void;
  counts: {
    all: number;
    unread: number;
    text: number;
    voice: number;
  };
  searchOpen: boolean;
  searchQuery: string;
  onToggleSearch: () => void;
  onChangeSearch: (next: string) => void;
  loading: boolean;
  onRefresh: () => void;
  onMarkAllRead: () => void;
  onOpenSettings: () => void;
  language?: string;
}

export function InboxFilterChips({
  filter,
  onChangeFilter,
  counts,
  searchOpen,
  searchQuery,
  onToggleSearch,
  onChangeSearch,
  loading,
  onRefresh,
  onMarkAllRead,
  onOpenSettings,
  language = "English",
}: InboxFilterChipsProps) {
  const strings = getMyNodeStrings(language);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number }>({ top: 140, left: 200 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (searchOpen) {
      const id = window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(id);
    }
  }, [searchOpen]);

  useLayoutEffect(() => {
    if (!menuOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = 204;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const top = Math.min(vh - 120, rect.bottom + 6);
    const left = Math.max(10, Math.min(rect.right - width, vw - width - 10));
    setMenuCoords({ top, left });
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const chips: { id: InboxFilterKind; label: string; count: number }[] = [
    { id: "all", label: strings.filterAll, count: counts.all },
    { id: "unread", label: strings.filterUnread, count: counts.unread },
    { id: "text", label: strings.filterText, count: counts.text },
    { id: "voice", label: strings.filterVoice, count: counts.voice },
  ];

  return (
    <div className="inbox-toolbar-wrap">
      <div className="inbox-toolbar-row">
        <div className="inbox-filter-scroll" role="tablist" aria-label="Filter support messages">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={filter === c.id}
              className={`inbox-filter-chip ${filter === c.id ? "active" : ""}`}
              onClick={() => onChangeFilter(c.id)}
            >
              <span>{c.label}</span>
              <span className="inbox-filter-count">{c.count}</span>
            </button>
          ))}
        </div>

        <div className="inbox-toolbar-actions">
          <button
            type="button"
            className={`inbox-icon-action-btn ${searchOpen || searchQuery ? "active" : ""}`}
            onClick={onToggleSearch}
            aria-label={strings.searchAria}
            aria-expanded={searchOpen}
            title={strings.searchAria}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7.5" />
              <path d="m20 20-3.8-3.8" />
            </svg>
          </button>

          <button
            type="button"
            className="inbox-icon-action-btn"
            onClick={onRefresh}
            disabled={loading}
            aria-label={strings.refreshAria}
            title={strings.refreshAria}
          >
            <svg
              className={loading ? "spin-icon" : ""}
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 3v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L21 9" />
            </svg>
          </button>

          <button
            ref={triggerRef}
            type="button"
            className={`inbox-icon-action-btn ${menuOpen ? "active" : ""}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={strings.moreOptionsAria}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="inbox-search-row">
          <div className="inbox-search-field">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7.5" />
              <path d="m20 20-3.8-3.8" />
            </svg>
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => onChangeSearch(e.target.value)}
              placeholder={strings.searchPlaceholder}
              aria-label={strings.searchAria}
            />
            {searchQuery && (
              <button
                type="button"
                className="inbox-search-clear-btn"
                onClick={() => onChangeSearch("")}
                aria-label={strings.clearSearch}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {menuOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="inbox-portal-menu"
            role="menu"
            style={{ top: `${menuCoords.top}px`, left: `${menuCoords.left}px` }}
          >
            <button
              type="button"
              role="menuitem"
              className="inbox-portal-menu-item"
              onClick={() => {
                setMenuOpen(false);
                onMarkAllRead();
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span>{strings.markAllRead}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="inbox-portal-menu-item"
              onClick={() => {
                setMenuOpen(false);
                onOpenSettings();
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>{strings.openSettings}</span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default InboxFilterChips;
