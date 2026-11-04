/**
 * Utility functions for Memory Vault search indexing, Chinese substring matching,
 * and user-local date boundaries.
 */

export interface DateBoundaries {
  startIso: string;
  endIso: string;
}

/**
 * Converts user's LOCAL time day boundaries to ISO strings.
 * Week starts Monday (ISO-8601 standard in Malaysia and globally).
 */
export function getLocalDateBoundaries(
  filterType: "all" | "today" | "week" | "month" | "custom",
  customStart?: string | null,
  customEnd?: string | null,
): DateBoundaries | null {
  if (filterType === "all") return null;

  const now = new Date();

  if (filterType === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    };
  }

  if (filterType === "week") {
    // Week starts Monday (0 = Monday, 6 = Sunday)
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday ...
    const distToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distToMonday, 0, 0, 0, 0);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
    return {
      startIso: monday.toISOString(),
      endIso: sunday.toISOString(),
    };
  }

  if (filterType === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    };
  }

  if (filterType === "custom" && customStart) {
    const sParts = customStart.split("-").map(Number);
    const start = new Date(sParts[0], sParts[1] - 1, sParts[2], 0, 0, 0, 0);
    let end: Date;
    if (customEnd && customEnd !== customStart) {
      const eParts = customEnd.split("-").map(Number);
      end = new Date(eParts[0], eParts[1] - 1, eParts[2], 23, 59, 59, 999);
    } else {
      end = new Date(sParts[0], sParts[1] - 1, sParts[2], 23, 59, 59, 999);
    }
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    };
  }

  return null;
}

/**
 * Substring search supporting English and Chinese.
 * Never splits by spaces or requires whole-word boundaries.
 * "开心" matches "今天很开心".
 */
export function matchesSearchSubstring(text: string | undefined | null, query: string): boolean {
  if (!query || !query.trim()) return true;
  if (!text) return false;
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

/**
 * Extracts a matching snippet for search results display with ~60 chars of surrounding context.
 */
export function getSearchSnippet(
  text: string | undefined | null,
  query: string,
): { before: string; match: string; after: string } | null {
  if (!text || !query || !query.trim()) return null;
  const qClean = query.trim();
  const lowerText = text.toLowerCase();
  const lowerQuery = qClean.toLowerCase();
  const matchIdx = lowerText.indexOf(lowerQuery);

  if (matchIdx === -1) return null;

  const start = Math.max(0, matchIdx - 28);
  const end = Math.min(text.length, matchIdx + qClean.length + 42);

  const before = (start > 0 ? "…" : "") + text.slice(start, matchIdx);
  const match = text.slice(matchIdx, matchIdx + qClean.length);
  const after = text.slice(matchIdx + qClean.length, end) + (end < text.length ? "…" : "");

  return { before, match, after };
}

/**
 * Compress an image file to a small base64 thumbnail (<35KB) using HTML5 Canvas
 * to prevent large images from inflating Firestore documents.
 */
export async function createCompressedPhotoThumbnail(
  file: File,
  maxDimension = 360,
  quality = 0.72,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(typeof reader.result === "string" ? reader.result : "");
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.src = typeof reader.result === "string" ? reader.result : "";
    };
    reader.readAsDataURL(file);
  });
}
