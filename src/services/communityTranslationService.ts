import { auth } from "../firebase/config";
import { getCurrentIdToken } from "../firebase/auth";
import type { AppLanguage } from "../i18n/translations";

const CACHE_KEY_PREFIX = "ony_comm_translations_v3_";
const LEGACY_CACHE_KEY = "ony_comm_translations_v2";

// In-memory cache scoped per authenticated UID
let loadedUid: string | null = null;
const translationCache = new Map<string, string>();
const transcriptCache = new Map<string, string>();

function getActiveUidKey(): string {
  return auth.currentUser?.uid?.trim() || "signed_out";
}

function getStorageKey(uid: string): string {
  return `${CACHE_KEY_PREFIX}${uid}`;
}

function ensureCacheLoadedForCurrentUid(): string {
  const uid = getActiveUidKey();
  if (loadedUid === uid) return uid;

  loadedUid = uid;
  translationCache.clear();
  transcriptCache.clear();

  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(LEGACY_CACHE_KEY);
      const raw = window.localStorage.getItem(getStorageKey(uid));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === "string") translationCache.set(k, v);
          }
        }
      }
    } catch {
      // ignore storage read errors
    }
  }
  return uid;
}

function persistCache(uid: string): void {
  if (typeof window === "undefined" || uid === "signed_out") return;
  try {
    const obj: Record<string, string> = {};
    translationCache.forEach((val, key) => {
      obj[key] = val;
    });
    window.localStorage.setItem(getStorageKey(uid), JSON.stringify(obj));
  } catch {
    // ignore storage quota errors
  }
}

export function clearCommunityTranslationCache(uid?: string | null): void {
  translationCache.clear();
  transcriptCache.clear();
  loadedUid = null;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_CACHE_KEY);
    if (uid) {
      window.localStorage.removeItem(getStorageKey(uid));
    } else {
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(CACHE_KEY_PREFIX)) {
          toRemove.push(key);
        }
      }
      toRemove.forEach((k) => window.localStorage.removeItem(k));
    }
  } catch {
    // ignore storage cleanup errors
  }
}

export function getCachedTranscript(messageId?: string, audioUrl?: string): string | null {
  ensureCacheLoadedForCurrentUid();
  if (messageId && transcriptCache.has(messageId)) {
    return transcriptCache.get(messageId)!;
  }
  if (audioUrl && transcriptCache.has(audioUrl)) {
    return transcriptCache.get(audioUrl)!;
  }
  return null;
}

export function getCachedTranslation(text: string, targetLang: AppLanguage): string | null {
  ensureCacheLoadedForCurrentUid();
  const clean = text.trim();
  const cacheKey = `${targetLang}:${clean}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }
  return null;
}

export function getCachedPostTranslation(
  postId: string,
  targetLang: AppLanguage,
): { translatedTitle: string; translatedBody: string } | null {
  ensureCacheLoadedForCurrentUid();
  const titleKey = `${targetLang}:post:${postId}:title`;
  const bodyKey = `${targetLang}:post:${postId}:body`;

  if (translationCache.has(titleKey) && translationCache.has(bodyKey)) {
    return {
      translatedTitle: translationCache.get(titleKey)!,
      translatedBody: translationCache.get(bodyKey)!,
    };
  }
  return null;
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const token = await getCurrentIdToken().catch(() => null);
  if (!token) {
    throw new Error("Please sign in to transcribe or translate community content.");
  }
  headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Transcribes a supportive voice note into text via the authenticated backend transcription route.
 */
export async function transcribeCommunityVoice(params: {
  messageId?: string;
  audioUrl?: string;
  audioDuration?: number;
  existingCaption?: string;
  existingTranscription?: string;
}): Promise<string> {
  ensureCacheLoadedForCurrentUid();

  if (params.existingTranscription?.trim()) {
    return params.existingTranscription.trim();
  }

  const cached = getCachedTranscript(params.messageId, params.audioUrl);
  if (cached) return cached;

  if (!params.audioUrl) {
    throw new Error("Audio source is unavailable for transcription.");
  }

  const headers = await buildAuthHeaders();
  const res = await fetch("/api/community/transcribe", {
    method: "POST",
    headers,
    body: JSON.stringify({
      audioUrl: params.audioUrl,
      audioDuration: params.audioDuration,
      existingCaption: params.existingCaption,
    }),
  });

  if (!res.ok) {
    const errPayload = await res.json().catch(() => null);
    throw new Error(errPayload?.error?.message || "Unable to transcribe this voice note right now.");
  }

  const data = await res.json();
  const transcript = typeof data?.transcript === "string" ? data.transcript.trim() : "";
  if (!transcript) {
    throw new Error("No speech transcript could be extracted from this recording.");
  }

  if (params.messageId) transcriptCache.set(params.messageId, transcript);
  if (params.audioUrl) transcriptCache.set(params.audioUrl, transcript);
  return transcript;
}

/**
 * Translates supportive text into the target language via the authenticated backend route.
 */
export async function translateCommunityText(
  text: string,
  targetLang: AppLanguage,
): Promise<string> {
  const uid = ensureCacheLoadedForCurrentUid();
  const clean = text.trim();
  if (!clean) return clean;

  const cacheKey = `${targetLang}:${clean}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  const headers = await buildAuthHeaders();
  const res = await fetch("/api/community/translate", {
    method: "POST",
    headers,
    body: JSON.stringify({
      text: clean,
      targetLanguage: targetLang,
    }),
  });

  if (!res.ok) {
    const errPayload = await res.json().catch(() => null);
    throw new Error(errPayload?.error?.message || "Unable to translate this message right now.");
  }

  const data = await res.json();
  const translated = typeof data?.translatedText === "string" ? data.translatedText.trim() : "";
  if (!translated) {
    throw new Error("Translation service returned an empty response.");
  }

  translationCache.set(cacheKey, translated);
  persistCache(uid);
  return translated;
}

/**
 * Translates a community feed post (title and body) on demand via the authenticated backend route.
 */
export async function translateCommunityPost(
  post: { id: string; title: string; body: string },
  targetLang: AppLanguage,
): Promise<{ translatedTitle: string; translatedBody: string }> {
  const uid = ensureCacheLoadedForCurrentUid();
  const titleKey = `${targetLang}:post:${post.id}:title`;
  const bodyKey = `${targetLang}:post:${post.id}:body`;

  if (translationCache.has(titleKey) && translationCache.has(bodyKey)) {
    return {
      translatedTitle: translationCache.get(titleKey)!,
      translatedBody: translationCache.get(bodyKey)!,
    };
  }

  const headers = await buildAuthHeaders();
  const res = await fetch("/api/community/translate", {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: post.title,
      body: post.body,
      targetLanguage: targetLang,
    }),
  });

  if (!res.ok) {
    const errPayload = await res.json().catch(() => null);
    throw new Error(errPayload?.error?.message || "Unable to translate this post right now.");
  }

  const data = await res.json();
  const translatedTitle = typeof data?.translatedTitle === "string" ? data.translatedTitle.trim() : "";
  const translatedBody = typeof data?.translatedBody === "string" ? data.translatedBody.trim() : "";

  if (!translatedTitle && !translatedBody) {
    throw new Error("Translation service returned an empty response.");
  }

  const resolvedTitle = translatedTitle || post.title;
  const resolvedBody = translatedBody || post.body;

  translationCache.set(titleKey, resolvedTitle);
  translationCache.set(bodyKey, resolvedBody);
  persistCache(uid);

  return { translatedTitle: resolvedTitle, translatedBody: resolvedBody };
}
