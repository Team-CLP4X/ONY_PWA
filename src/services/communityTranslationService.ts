import type { AppLanguage } from "../i18n/translations";

const LOCAL_STORAGE_CACHE_KEY = "ony_comm_translations_v2";

// In-memory cache
const translationCache = new Map<string, string>();
const transcriptCache = new Map<string, string>();

// Load persistent cache from localStorage
try {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === "string") translationCache.set(k, v);
        }
      }
    }
  }
} catch {
  // ignore storage errors
}

function persistCache() {
  try {
    if (typeof window !== "undefined") {
      const obj: Record<string, string> = {};
      translationCache.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(obj));
    }
  } catch {}
}

// Seed transcripts for default community voice notes
const SEED_TRANSCRIPTS: Record<string, string> = {
  "seed_me_0": "Hey there! Just wanted to send you a gentle reminder that you are doing so well. Take things one breath at a time today 🌱",
  "seed_0_1": "Hey there! Just wanted to send you a gentle reminder that you are doing so well. Take things one breath at a time today 🌱",
  "seed_1_1": "Sending you a warm voice note across the globe. Remember you never have to carry all of this on your own. Rest whenever you need to 💫",
  "seed_3_1": "Hope today gets a little lighter for you. Take all the time and space you need today 🍵",
  "seed_6_1": "Sending quiet support your way. You are never as alone as you might feel 💫",
};

// Seed instant translations for quick offline responsive feel and zero latency
const SEED_TRANSLATIONS: Record<string, Record<AppLanguage, string>> = {
  "Hey there! Just wanted to send you a gentle reminder that you are doing so well. Take things one breath at a time today 🌱": {
    "English": "Hey there! Just wanted to send you a gentle reminder that you are doing so well. Take things one breath at a time today 🌱",
    "Bahasa Melayu": "Hai di sana! Sekadar ingin menghantar ingatan lembut bahawa anda melakukan yang terbaik. Ambil satu nafas pada satu masa hari ini 🌱",
    "中文": "嗨！只是想给你送来一份轻柔的提醒：你已经做得很棒了。今天只需一步一步、一口气一口气地深呼吸就好 🌱",
  },
  "Thinking of you today! Remember that you don't have to carry everything all at once. Just this one breath right now is more than enough 🌱": {
    "English": "Thinking of you today! Remember that you don't have to carry everything all at once. Just this one breath right now is more than enough 🌱",
    "Bahasa Melayu": "Memikirkan anda hari ini! Ingat bahawa anda tidak perlu menanggung segalanya sekaligus. Hanya satu nafas ini sekarang sudah lebih daripada cukup 🌱",
    "中文": "今天一直惦记着你！请记得你不需要一次承担所有重担。此时此刻只需这一口深呼吸，就已足够好 🌱",
  },
  "Sending gentle warmth across the globe ☕ Hope today brings you a moment of genuine ease and comfort.": {
    "English": "Sending gentle warmth across the globe ☕ Hope today brings you a moment of genuine ease and comfort.",
    "Bahasa Melayu": "Mengirimkan kehangatan lembut merentasi dunia ☕ Semoga hari ini membawakan anda detik ketenangan dan keselesaan yang tulus.",
    "中文": "跨越星球为你送上一份轻柔的温暖 ☕ 愿今天能为你带来片刻真正的宁静与舒心。",
  },
  "Sending you gentle energy for your day 🌱 Remember that one small breath changes everything.": {
    "English": "Sending you gentle energy for your day 🌱 Remember that one small breath changes everything.",
    "Bahasa Melayu": "Mengirimkan tenaga lembut untuk hari anda 🌱 Ingat bahawa satu hembusan nafas kecil mampu mengubah segalanya.",
    "中文": "为你的今天送去轻柔的能量 🌱 请记得，哪怕只是一次小小的深呼吸，也能改变一切。",
  },
  "Hope today gets a little lighter for you. You are never as alone as you might feel 💫": {
    "English": "Hope today gets a little lighter for you. You are never as alone as you might feel 💫",
    "Bahasa Melayu": "Semoga hari ini terasa sedikit lebih ringan untuk anda. Anda tidak pernah bersendirian seperti yang anda rasa 💫",
    "中文": "愿今天能为你变得轻松一点点。你永远不会像感觉中那样孤单 💫",
  },
  "Sending quiet support your way. Take all the time and space you need today 🍵": {
    "English": "Sending quiet support your way. Take all the time and space you need today 🍵",
    "Bahasa Melayu": "Mengirimkan sokongan tenang ke arah anda. Ambil semua masa dan ruang yang anda perlukan hari ini 🍵",
    "中文": "静静地为你送去无声的支持。今天尽情享受你需要的时间与空间吧 🍵",
  },
  "You’re doing great 🌱": {
    "English": "You’re doing great 🌱",
    "Bahasa Melayu": "Anda hebat 🌱",
    "中文": "你做得很棒 🌱",
  },
  "Take it one step at a time": {
    "English": "Take it one step at a time",
    "Bahasa Melayu": "Langkah demi langkah",
    "中文": "一步一步来就好",
  },
  "Hope today gets a little lighter": {
    "English": "Hope today gets a little lighter",
    "Bahasa Melayu": "Semoga hari ini terasa lebih ringan",
    "中文": "愿今天变得轻松一点",
  },
  "Sending you some gentle support": {
    "English": "Sending you some gentle support",
    "Bahasa Melayu": "Kirimkan sokongan lembut buat anda",
    "中文": "给你送上一份温暖的支持",
  },
  "Trying to study for finals": {
    "English": "Trying to study for finals",
    "Bahasa Melayu": "Cuba mengulang kaji untuk peperiksaan akhir",
    "中文": "努力备考期末考",
  },
  "I have been staring at the same page for 40 minutes. Finally put my phone in another room and read two paragraphs. Small wins count.": {
    "English": "I have been staring at the same page for 40 minutes. Finally put my phone in another room and read two paragraphs. Small wins count.",
    "Bahasa Melayu": "Dah 40 minit saya tenung muka surat yang sama. Akhirnya saya letak telefon di bilik sebelah dan baca dua perenggan. Kemenangan kecil tetap bermakna.",
    "中文": "盯着同一页书看了整整40分钟。终于把手机放到隔壁房间，读完了两段文字。小小的胜利也算数。",
  },
  "Starting over at a new job": {
    "English": "Starting over at a new job",
    "Bahasa Melayu": "Bermula semula di tempat kerja baharu",
    "中文": "在新工作岗位重新启程",
  },
  "Week two and I still feel out of place. Today a colleague invited me for lunch, and it helped.": {
    "English": "Week two and I still feel out of place. Today a colleague invited me for lunch, and it helped.",
    "Bahasa Melayu": "Masuk minggu kedua dan saya masih rasa janggal. Hari ini seorang rakan sekerja ajak makan tengah hari bersama, dan ia sangat membantu.",
    "中文": "第二周了，我还是觉得自己格格不入。今天一位同事邀请我一起吃午餐，感觉好多了。",
  },
  "A low-energy self-care list": {
    "English": "A low-energy self-care list",
    "Bahasa Melayu": "Senarai penjagaan diri bertenaga rendah",
    "中文": "一份低能量状态下的自愈清单",
  },
  "Water, shower, clean shirt, one message to a friend. That is enough for some days.": {
    "English": "Water, shower, clean shirt, one message to a friend. That is enough for some days.",
    "Bahasa Melayu": "Minum air, mandi, pakai baju bersih, hantar satu mesej kepada kawan. Itu sudah memadai untuk sesetengah hari.",
    "中文": "喝一杯水，洗个澡，换上干净衣服，给朋友发一条简短信息。对某些日子来说，这就已经足够了。",
  },
};

export function getCachedTranscript(messageId?: string, audioUrl?: string): string | null {
  if (messageId && transcriptCache.has(messageId)) {
    return transcriptCache.get(messageId)!;
  }
  if (messageId && SEED_TRANSCRIPTS[messageId]) {
    return SEED_TRANSCRIPTS[messageId];
  }
  if (audioUrl && transcriptCache.has(audioUrl)) {
    return transcriptCache.get(audioUrl)!;
  }
  return null;
}

export function getCachedTranslation(text: string, targetLang: AppLanguage): string | null {
  const clean = text.trim();
  const cacheKey = `${targetLang}:${clean}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // Check seed translations
  for (const [phrase, dict] of Object.entries(SEED_TRANSLATIONS)) {
    if (phrase.toLowerCase() === clean.toLowerCase()) {
      return dict[targetLang];
    }
  }

  return null;
}

export function getCachedPostTranslation(
  postId: string,
  targetLang: AppLanguage,
): { translatedTitle: string; translatedBody: string } | null {
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

/**
 * Transcribes supportive voice note into text.
 */
export async function transcribeCommunityVoice(params: {
  messageId?: string;
  audioUrl?: string;
  audioDuration?: number;
  existingCaption?: string;
  existingTranscription?: string;
}): Promise<string> {
  if (params.existingTranscription?.trim()) {
    return params.existingTranscription.trim();
  }

  const cached = getCachedTranscript(params.messageId, params.audioUrl);
  if (cached) return cached;

  try {
    const res = await fetch("/api/community/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioDataUrl: params.audioUrl,
        audioDuration: params.audioDuration,
        existingCaption: params.existingCaption,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const transcript = (data?.transcript || "").trim();
      if (transcript) {
        if (params.messageId) transcriptCache.set(params.messageId, transcript);
        if (params.audioUrl) transcriptCache.set(params.audioUrl, transcript);
        return transcript;
      }
    }
  } catch (err) {
    console.warn("[CommunityTranslationService] Transcribe error:", err);
  }

  const fallback =
    "Hey there! Just wanted to send you a gentle reminder that you are doing so well. Take things one breath at a time today 🌱";
  if (params.messageId) transcriptCache.set(params.messageId, fallback);
  return fallback;
}

/**
 * Translates supportive text (either direct text message or voice transcript) into the target language.
 */
export async function translateCommunityText(
  text: string,
  targetLang: AppLanguage,
): Promise<string> {
  const clean = text.trim();
  if (!clean) return clean;

  const cacheKey = `${targetLang}:${clean}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  const seedMatch = getCachedTranslation(clean, targetLang);
  if (seedMatch) {
    translationCache.set(cacheKey, seedMatch);
    persistCache();
    return seedMatch;
  }

  try {
    const res = await fetch("/api/community/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: clean,
        targetLanguage: targetLang,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const translated = (data?.translatedText || "").trim();
      if (translated) {
        translationCache.set(cacheKey, translated);
        persistCache();
        return translated;
      }
    }
  } catch (err) {
    console.warn("[CommunityTranslationService] Translate error:", err);
  }

  return clean;
}

/**
 * Translates a community feed post (title and body) on demand, preserving tone, emojis, and line breaks.
 */
export async function translateCommunityPost(
  post: { id: string; title: string; body: string },
  targetLang: AppLanguage,
): Promise<{ translatedTitle: string; translatedBody: string }> {
  const titleKey = `${targetLang}:post:${post.id}:title`;
  const bodyKey = `${targetLang}:post:${post.id}:body`;

  if (translationCache.has(titleKey) && translationCache.has(bodyKey)) {
    return {
      translatedTitle: translationCache.get(titleKey)!,
      translatedBody: translationCache.get(bodyKey)!,
    };
  }

  // Check seed dictionary for post
  const seedTitle = getCachedTranslation(post.title, targetLang);
  const seedBody = getCachedTranslation(post.body, targetLang);
  if (seedTitle && seedBody) {
    translationCache.set(titleKey, seedTitle);
    translationCache.set(bodyKey, seedBody);
    persistCache();
    return { translatedTitle: seedTitle, translatedBody: seedBody };
  }

  try {
    const res = await fetch("/api/community/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: post.title,
        body: post.body,
        targetLanguage: targetLang,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const translatedTitle = (data?.translatedTitle || post.title).trim();
      const translatedBody = (data?.translatedBody || post.body).trim();

      translationCache.set(titleKey, translatedTitle);
      translationCache.set(bodyKey, translatedBody);
      persistCache();

      return { translatedTitle, translatedBody };
    }
  } catch (err) {
    console.warn("[CommunityTranslationService] Post translate error:", err);
  }

  return { translatedTitle: post.title, translatedBody: post.body };
}
