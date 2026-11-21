export interface FirestoreMerchant {
  id?: string;
  name: string;
  category: string;
  offer: string;
  value: string;
  description: string;
  image: string;
  validity: string;
  active?: boolean;
  expired?: boolean;
  tags?: string[];
}

const MONTH_INDEX_MAP: Record<string, number> = {
  jan: 0,
  january: 0,
  januari: 0,
  feb: 1,
  february: 1,
  februari: 1,
  mar: 2,
  march: 2,
  mac: 2,
  apr: 3,
  april: 3,
  may: 4,
  mei: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  julai: 6,
  aug: 7,
  august: 7,
  ogo: 7,
  ogos: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  okt: 9,
  oktober: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
  dis: 11,
  disember: 11,
};

function buildLocalEndOfDay(year: number, monthIndex: number, day: number): Date | null {
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;
  const maxDayInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const clampedDay = Math.min(day, maxDayInMonth);
  return new Date(year, monthIndex, clampedDay, 23, 59, 59, 999);
}

/**
 * Parses voucher expiry dates across ISO (YYYY-MM-DD), D MMM YYYY, D MMM (yearless,
 * resolved against `now.getFullYear()`), and explicit expired markers.
 * All calendar dates are evaluated at local end-of-day (23:59:59.999).
 */
export function isVoucherActiveAndValid(
  voucher: Pick<FirestoreMerchant, "active" | "expired" | "validity">,
  now?: Date,
): boolean {
  const refNow = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();

  if (voucher.active === false || voucher.expired === true) {
    return false;
  }

  const rawValidity = (voucher.validity || "").trim();
  const validityLower = rawValidity.toLowerCase();

  if (
    validityLower.includes("expired") ||
    validityLower.includes("tamat tempoh") ||
    validityLower.includes("已过期") ||
    validityLower === "inactive"
  ) {
    return false;
  }

  // 1. ISO date with 4-digit year: e.g. "2026-11-30" or "Valid until 2026-06-30"
  const isoMatch = validityLower.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const expiry = buildLocalEndOfDay(year, month, day);
    if (expiry && refNow.getTime() > expiry.getTime()) {
      return false;
    }
    return true;
  }

  // 2. Day Month Year: e.g. "Valid until 30 Jun 2026" or "31 Disember 2026"
  const dmyWithYearMatch = validityLower.match(/\b(\d{1,2})\s+([a-z]{3,10})\s+(\d{4})\b/);
  if (dmyWithYearMatch) {
    const day = Number(dmyWithYearMatch[1]);
    const monthIdx = MONTH_INDEX_MAP[dmyWithYearMatch[2]];
    const year = Number(dmyWithYearMatch[3]);
    if (monthIdx !== undefined) {
      const expiry = buildLocalEndOfDay(year, monthIdx, day);
      if (expiry && refNow.getTime() > expiry.getTime()) {
        return false;
      }
    }
    return true;
  }

  // 3. Yearless Day Month: e.g. "Valid until 30 Jun", "Expires 15 Mac", "Until 31 Dec"
  const dmyWithoutYearMatch = validityLower.match(
    /(?:valid\s+(?:until|till|thru|through)|until|till|expires?|ends?|sah\s+sehingga)\s+(\d{1,2})\s+([a-z]{3,10})\b/,
  );
  if (dmyWithoutYearMatch) {
    const day = Number(dmyWithoutYearMatch[1]);
    const monthIdx = MONTH_INDEX_MAP[dmyWithoutYearMatch[2]];
    if (monthIdx !== undefined) {
      const expiry = buildLocalEndOfDay(refNow.getFullYear(), monthIdx, day);
      if (expiry && refNow.getTime() > expiry.getTime()) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Strips any legacy "· Demo" / "- Demo" / trailing "Demo" marker from voucher validity strings.
 */
export function formatVoucherValidity(validity?: string | null): string {
  const raw = (validity || "").trim();
  if (!raw) return "";
  return raw
    .replace(/\s*[·•|\-–—]\s*demo\b/gi, "")
    .replace(/\bdemo\s*[·•|\-–—]\s*/gi, "")
    .replace(/\s+\bdemo\b$/i, "")
    .replace(/^\s*[·•|\-–—]+\s*|\s*[·•|\-–—]+\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

