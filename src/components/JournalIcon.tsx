import type { ReactNode } from "react";

export type JournalIconName =
  | "stackedBooks"
  | "tag"
  | "palette"
  | "bookshelf"
  | "fileText"
  | "pen"
  | "feather"
  | "search"
  | "calendar"
  | "lock"
  | "bookOpen"
  | "leaf"
  | "sparkles"
  | "check"
  | "chevronLeft"
  | "chevronRight"
  | "arrowLeft"
  | "arrowRight"
  | "more"
  | "plus"
  | "trash"
  | "edit"
  | "image"
  | "camera"
  | "bold"
  | "italic"
  | "heading"
  | "list"
  | "quote"
  | "pageIndex"
  | "info"
  | "close"
  | "lines"
  | "dotted"
  | "plain"
  | "clock"
  | "bookmark"
  // Moods
  | "reflective"
  | "peaceful"
  | "grateful"
  | "cozy"
  | "hopeful"
  | "grounded"
  | "sad"
  | "overwhelmed"
  | "angry"
  | "joyful"
  | "loved"
  | "thoughtful";

interface JournalIconProps {
  name: JournalIconName;
  className?: string;
  size?: number | string;
  color?: string;
  strokeWidth?: number;
  decorative?: boolean;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
}

export function JournalIcon({
  name,
  className = "",
  size = 20,
  color = "currentColor",
  strokeWidth = 2,
  decorative = false,
  "aria-label": ariaLabel,
  "aria-hidden": ariaHidden,
}: JournalIconProps) {
  const isDecorative = decorative || (ariaHidden ?? !ariaLabel);

  const paths: Record<JournalIconName, ReactNode> = {
    stackedBooks: (
      <>
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        <path d="M6 6h10" />
        <path d="M6 10h10" />
        <path d="M4 6.5A2.5 2.5 0 0 0 6.5 9H20" />
        <path d="M4 14.5A2.5 2.5 0 0 0 6.5 17H20" />
      </>
    ),
    tag: (
      <>
        <path d="M12 2H2v10l9.29 9.29a2 2 0 0 0 2.83 0l7.17-7.17a2 2 0 0 0 0-2.83L12 2Z" />
        <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
      </>
    ),
    palette: (
      <>
        <circle cx="13.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="17.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="8.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="6.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.4-.4-.8-.4-1.3 0-1.1.9-2 2-2h2.4c3.3 0 6-2.7 6-6 0-5.5-4.5-10-10-10Z" />
      </>
    ),
    bookshelf: (
      <>
        <path d="M4 21h16" />
        <path d="M4 11h16" />
        <path d="M4 3h16" />
        <path d="M6 3v8" />
        <path d="M10 3v8" />
        <path d="M14 5l2 6" />
        <path d="M7 11v10" />
        <path d="M11 13l2 8" />
        <path d="M17 11v10" />
      </>
    ),
    fileText: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </>
    ),
    pen: (
      <>
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18z" />
        <circle cx="11.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    feather: (
      <>
        <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
        <line x1="16" y1="8" x2="2" y2="22" />
        <line x1="17.5" y1="15" x2="9" y2="15" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
    lock: (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
    bookOpen: (
      <>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </>
    ),
    leaf: (
      <>
        <path d="M11 20A7 7 0 0 1 4 13C4 8 8 3 19 3c0 11-5 15-8 17Z" />
        <path d="M8 16c2-4 6-7 11-13" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
      </>
    ),
    check: (
      <>
        <polyline points="20 6 9 17 4 12" />
      </>
    ),
    chevronLeft: (
      <>
        <polyline points="15 18 9 12 15 6" />
      </>
    ),
    chevronRight: (
      <>
        <polyline points="9 18 15 12 9 6" />
      </>
    ),
    arrowLeft: (
      <>
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </>
    ),
    arrowRight: (
      <>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </>
    ),
    more: (
      <>
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </>
    ),
    plus: (
      <>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </>
    ),
    trash: (
      <>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </>
    ),
    edit: (
      <>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
        <polyline points="21 15 16 10 5 21" />
      </>
    ),
    camera: (
      <>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
    bold: (
      <>
        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      </>
    ),
    italic: (
      <>
        <line x1="19" y1="4" x2="10" y2="4" />
        <line x1="14" y1="20" x2="5" y2="20" />
        <line x1="15" y1="4" x2="9" y2="20" />
      </>
    ),
    heading: (
      <>
        <path d="M6 4v16" />
        <path d="M18 4v16" />
        <path d="M6 12h12" />
      </>
    ),
    list: (
      <>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
      </>
    ),
    quote: (
      <>
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h4c0 2.5-1 4.5-5 5.5v2.5z" />
        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h4c0 2.5-1 4.5-5 5.5v2.5z" />
      </>
    ),
    pageIndex: (
      <>
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        <path d="M8 7h8" />
        <path d="M8 11h8" />
        <path d="M8 15h5" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </>
    ),
    close: (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ),
    lines: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="7" y1="8" x2="17" y2="8" />
        <line x1="7" y1="12" x2="17" y2="12" />
        <line x1="7" y1="16" x2="17" y2="16" />
      </>
    ),
    dotted: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="7" cy="8" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
        <circle cx="17" cy="8" r="1" fill="currentColor" stroke="none" />
        <circle cx="7" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="17" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="7" cy="16" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
        <circle cx="17" cy="16" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    plain: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
    bookmark: (
      <>
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </>
    ),

    // Moods
    reflective: (
      <>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </>
    ),
    peaceful: (
      <>
        <path d="M11 20A7 7 0 0 1 4 13C4 8 8 3 19 3c0 11-5 15-8 17Z" />
        <path d="M8 16c2-4 6-7 11-13" />
      </>
    ),
    grateful: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </>
    ),
    cozy: (
      <>
        <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8Z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </>
    ),
    hopeful: (
      <>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </>
    ),
    grounded: (
      <>
        <path d="M12 19V5" />
        <path d="M5 12a7 7 0 0 1 7-7 7 7 0 0 1 7 7" />
        <path d="M4 19h16" />
      </>
    ),
    sad: (
      <>
        <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
        <line x1="8" y1="19" x2="8" y2="21" />
        <line x1="8" y1="13" x2="8" y2="15" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="12" y1="15" x2="12" y2="17" />
        <line x1="16" y1="19" x2="16" y2="21" />
        <line x1="16" y1="13" x2="16" y2="15" />
      </>
    ),
    overwhelmed: (
      <>
        <path d="M2 12c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 5-3" />
        <path d="M2 17c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 5-3" />
        <path d="M2 7c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 5-3" />
      </>
    ),
    angry: (
      <>
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </>
    ),
    joyful: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </>
    ),
    loved: (
      <>
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </>
    ),
    thoughtful: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </>
    ),
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`journal-icon ${className}`}
      aria-hidden={isDecorative}
      aria-label={ariaLabel}
      role={isDecorative ? undefined : "img"}
    >
      {paths[name] || paths.bookOpen}
    </svg>
  );
}

/**
 * Maps mood labels (or legacy mood emojis) to our clean vector icon name
 */
export function getMoodIconName(moodLabelOrEmoji?: string): JournalIconName {
  if (!moodLabelOrEmoji) return "reflective";
  const str = moodLabelOrEmoji.toLowerCase().trim();

  if (str.includes("reflect") || str.includes("merenung") || str.includes("沉思") || str.includes("🌿")) {
    return "reflective";
  }
  if (str.includes("peace") || str.includes("damai") || str.includes("平静") || str.includes("🌸")) {
    return "peaceful";
  }
  if (str.includes("grate") || str.includes("syukur") || str.includes("感恩") || str.includes("☀️")) {
    return "grateful";
  }
  if (str.includes("cozy") || str.includes("selesa") || str.includes("惬意") || str.includes("☕")) {
    return "cozy";
  }
  if (str.includes("hope") || str.includes("harapan") || str.includes("充满希望") || str.includes("💫")) {
    return "hopeful";
  }
  if (str.includes("ground") || str.includes("tenang") || str.includes("踏实") || str.includes("🍃")) {
    return "grounded";
  }
  if (str.includes("sad") || str.includes("sayu") || str.includes("sedih") || str.includes("低落") || str.includes("tender") || str.includes("🌧")) {
    return "sad";
  }
  if (str.includes("overwhelm") || str.includes("terbeban") || str.includes("压抑") || str.includes("anxious") || str.includes("⚡")) {
    return "overwhelmed";
  }
  if (str.includes("angry") || str.includes("marah") || str.includes("愤怒") || str.includes("🔥")) {
    return "angry";
  }
  if (str.includes("joy") || str.includes("gembira") || str.includes("喜悦") || str.includes("😊")) {
    return "joyful";
  }
  if (str.includes("love") || str.includes("sayang") || str.includes("被爱") || str.includes("❤️")) {
    return "loved";
  }
  if (str.includes("thought") || str.includes("fikir") || str.includes("若有所思") || str.includes("💭")) {
    return "thoughtful";
  }

  return "reflective";
}
