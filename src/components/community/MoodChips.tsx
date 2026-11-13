import type { AppLanguage } from "../../i18n/translations";
import type { MoodChipId } from "../../utils/communityPostHelpers";

export interface MoodChipsProps {
  selectedMood: MoodChipId | null;
  onSelectMood: (mood: MoodChipId | null) => void;
  language: AppLanguage;
}

interface MoodChipMeta {
  id: MoodChipId;
  en: string;
  bm: string;
  zh: string;
}

const MOOD_CHIPS: MoodChipMeta[] = [
  { id: "calm", en: "Calm", bm: "Tenang", zh: "平静" },
  { id: "curious", en: "Curious", bm: "Ingin tahu", zh: "好奇" },
  { id: "inspired", en: "Inspired", bm: "Terinspirasi", zh: "受启发" },
  { id: "tired", en: "Tired", bm: "Penat", zh: "疲惫" },
  { id: "anxious", en: "Anxious", bm: "Resah", zh: "焦虑" },
];

function MoodStrokeIcon({ id }: { id: MoodChipId }) {
  if (id === "calm") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="mood-chip-svg">
        <path d="M5 17c5-1 10-5 13-12-7 1-12 5-13 12Z" />
        <path d="M5 17c3-3 6-6 9-8" />
      </svg>
    );
  }
  if (id === "curious") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="mood-chip-svg">
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-3.8-3.8" />
      </svg>
    );
  }
  if (id === "inspired") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="mood-chip-svg">
        <path d="m12 3 2.5 5.4L20 9.3l-4 4 1 5.7-5-2.7-5 2.7 1-5.7-4-4 5.5-.9L12 3Z" />
      </svg>
    );
  }
  if (id === "tired") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="mood-chip-svg">
        <path d="M18 14.5A6.5 6.5 0 0 1 9.5 6a7 7 0 1 0 8.5 8.5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mood-chip-svg">
      <path d="M6 16h11a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6-1A4 4 0 0 0 6 16Z" />
    </svg>
  );
}

export function MoodChips({
  selectedMood,
  onSelectMood,
  language,
}: MoodChipsProps) {
  const promptText =
    language === "Bahasa Melayu"
      ? "Bagaimana perasaan anda hari ini?"
      : language === "中文"
        ? "今天的心情感觉如何？"
        : "How are you feeling today?";

  return (
    <div className="mood-chips-strip" role="group" aria-label={promptText}>
      <div className="mood-chips-heading">
        <span>{promptText}</span>
      </div>
      <div className="mood-chips-row">
        {MOOD_CHIPS.map((chip) => {
          const active = selectedMood === chip.id;
          const label =
            language === "Bahasa Melayu"
              ? chip.bm
              : language === "中文"
                ? chip.zh
                : chip.en;
          return (
            <button
              key={chip.id}
              type="button"
              className={`mood-chip-btn ${active ? "active" : ""}`}
              aria-pressed={active}
              onClick={() => onSelectMood(active ? null : chip.id)}
            >
              <MoodStrokeIcon id={chip.id} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MoodChips;
