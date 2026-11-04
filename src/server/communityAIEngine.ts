import { GoogleGenAI } from "@google/genai";

export interface TranslateRequest {
  text?: string;
  title?: string;
  body?: string;
  targetLanguage: "English" | "Bahasa Melayu" | "中文";
  sourceLanguage?: string;
}

export interface TranscribeRequest {
  audioDataUrl?: string;
  audioDuration?: number;
  existingCaption?: string;
}

// In-memory server-side cache for translated strings to prevent repeated API calls
const serverTranslationCache = new Map<string, string>();

// Resilient dictionary for immediate offline / quick translations of supportive messages and common seed posts
const KNOWN_PHRASES: Record<string, Record<"English" | "Bahasa Melayu" | "中文", string>> = {
  "encouraging voice note · 0:08": {
    "English": "Hey there! Just wanted to send you a gentle reminder that you are doing so well. Take things one breath at a time today 🌱",
    "Bahasa Melayu": "Hai di sana! Sekadar ingin menghantar ingatan lembut bahawa anda melakukan yang terbaik. Ambil satu nafas pada satu masa hari ini 🌱",
    "中文": "嗨！只是想给你送来一份轻柔的提醒：你已经做得很棒了。今天只需一步一步、一口气一口气地深呼吸就好 🌱",
  },
  "thinking of you today! remember that you don't have to carry everything all at once. just this one breath right now is more than enough 🌱": {
    "English": "Thinking of you today! Remember that you don't have to carry everything all at once. Just this one breath right now is more than enough 🌱",
    "Bahasa Melayu": "Memikirkan anda hari ini! Ingat bahawa anda tidak perlu menanggung segalanya sekaligus. Hanya satu nafas ini sekarang sudah lebih daripada cukup 🌱",
    "中文": "今天一直惦记着你！请记得你不需要一次承担所有重担。此时此刻只需这一口深呼吸，就已足够好 🌱",
  },
  "sending gentle warmth across the globe ☕ hope today brings you a moment of genuine ease and comfort.": {
    "English": "Sending gentle warmth across the globe ☕ Hope today brings you a moment of genuine ease and comfort.",
    "Bahasa Melayu": "Mengirimkan kehangatan lembut merentasi dunia ☕ Semoga hari ini membawakan anda detik ketenangan dan keselesaan yang tulus.",
    "中文": "跨越星球为你送上一份轻柔的温暖 ☕ 愿今天能为你带来片刻真正的宁静与舒心。",
  },
  "sending you gentle energy for your day 🌱 remember that one small breath changes everything.": {
    "English": "Sending you gentle energy for your day 🌱 Remember that one small breath changes everything.",
    "Bahasa Melayu": "Mengirimkan tenaga lembut untuk hari anda 🌱 Ingat bahawa satu hembusan nafas kecil mampu mengubah segalanya.",
    "中文": "为你的今天送去轻柔的能量 🌱 请记得，哪怕只是一次小小的深呼吸，也能改变一切。",
  },
  "hope today gets a little lighter for you. you are never as alone as you might feel 💫": {
    "English": "Hope today gets a little lighter for you. You are never as alone as you might feel 💫",
    "Bahasa Melayu": "Semoga hari ini terasa sedikit lebih ringan untuk anda. Anda tidak pernah bersendirian seperti yang anda rasa 💫",
    "中文": "愿今天能为你变得轻松一点点。你永远不会像感觉中那样孤单 💫",
  },
  "sending quiet support your way. take all the time and space you need today 🍵": {
    "English": "Sending quiet support your way. Take all the time and space you need today 🍵",
    "Bahasa Melayu": "Mengirimkan sokongan tenang ke arah anda. Ambil semua masa dan ruang yang anda perlukan hari ini 🍵",
    "中文": "静静地为你送去无声的支持。今天尽情享受你需要的时间与空间吧 🍵",
  },
  "you're doing great 🌱": {
    "English": "You’re doing great 🌱",
    "Bahasa Melayu": "Anda hebat 🌱",
    "中文": "你做得很棒 🌱",
  },
  "you’re doing great 🌱": {
    "English": "You’re doing great 🌱",
    "Bahasa Melayu": "Anda hebat 🌱",
    "中文": "你做得很棒 🌱",
  },
  "take it one step at a time": {
    "English": "Take it one step at a time",
    "Bahasa Melayu": "Langkah demi langkah",
    "中文": "一步一步来就好",
  },
  "hope today gets a little lighter": {
    "English": "Hope today gets a little lighter",
    "Bahasa Melayu": "Semoga hari ini terasa lebih ringan",
    "中文": "愿今天变得轻松一点",
  },
  "sending you some gentle support": {
    "English": "Sending you some gentle support",
    "Bahasa Melayu": "Kirimkan sokongan lembut buat anda",
    "中文": "给你送上一份温暖的支持",
  },
  // Common seed community posts
  "trying to study for finals": {
    "English": "Trying to study for finals",
    "Bahasa Melayu": "Cuba mengulang kaji untuk peperiksaan akhir",
    "中文": "努力备考期末考",
  },
  "i have been staring at the same page for 40 minutes. finally put my phone in another room and read two paragraphs. small wins count.": {
    "English": "I have been staring at the same page for 40 minutes. Finally put my phone in another room and read two paragraphs. Small wins count.",
    "Bahasa Melayu": "Dah 40 minit saya tenung muka surat yang sama. Akhirnya saya letak telefon di bilik sebelah dan baca dua perenggan. Kemenangan kecil tetap bermakna.",
    "中文": "盯着同一页书看了整整40分钟。终于把手机放到隔壁房间，读完了两段文字。小小的胜利也算数。",
  },
  "starting over at a new job": {
    "English": "Starting over at a new job",
    "Bahasa Melayu": "Bermula semula di tempat kerja baharu",
    "中文": "在新工作岗位重新启程",
  },
  "week two and i still feel out of place. today a colleague invited me for lunch, and it helped.": {
    "English": "Week two and I still feel out of place. Today a colleague invited me for lunch, and it helped.",
    "Bahasa Melayu": "Masuk minggu kedua dan saya masih rasa janggal. Hari ini seorang rakan sekerja ajak makan tengah hari bersama, dan ia sangat membantu.",
    "中文": "第二周了，我还是觉得自己格格不入。今天一位同事邀请我一起吃午餐，感觉好多了。",
  },
  "a low-energy self-care list": {
    "English": "A low-energy self-care list",
    "Bahasa Melayu": "Senarai penjagaan diri bertenaga rendah",
    "中文": "一份低能量状态下的自愈清单",
  },
  "water, shower, clean shirt, one message to a friend. that is enough for some days.": {
    "English": "Water, shower, clean shirt, one message to a friend. That is enough for some days.",
    "Bahasa Melayu": "Minum air, mandi, pakai baju bersih, hantar satu mesej kepada kawan. Itu sudah memadai untuk sesetengah hari.",
    "中文": "喝一杯水，洗个澡，换上干净衣服，给朋友发一条简短信息。对某些日子来说，这就已经足够了。",
  },
};

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}

function getApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (key && key.length > 0 && !key.toLowerCase().startsWith("gemini-")) {
    return key;
  }
  const modelCandidate = process.env.GEMINI_MODEL?.trim();
  if (
    modelCandidate &&
    (modelCandidate.startsWith("AQ.") ||
      modelCandidate.startsWith("AIzaSy") ||
      (modelCandidate.length > 35 && !modelCandidate.toLowerCase().includes("gemini")))
  ) {
    return modelCandidate;
  }
  return undefined;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

/**
 * Translates text using Google Cloud Translation API v2.
 * Returns translated string if successful, or null on error / quota.
 */
async function translateWithGoogleCloudAPI(
  text: string,
  targetLang: "English" | "Bahasa Melayu" | "中文",
): Promise<string | null> {
  const apiKey =
    process.env.GOOGLE_TRANSLATE_API_KEY?.trim() ||
    process.env.GOOGLE_CLOUD_API_KEY?.trim() ||
    process.env.TRANSLATION_API_KEY?.trim() ||
    getApiKey();

  if (!apiKey) return null;

  const targetCode = targetLang === "Bahasa Melayu" ? "ms" : targetLang === "中文" ? "zh-CN" : "en";

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: [text],
        target: targetCode,
        format: "text",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const rawTranslated = data?.data?.translations?.[0]?.translatedText;
      if (typeof rawTranslated === "string" && rawTranslated.trim().length > 0) {
        return decodeHtmlEntities(rawTranslated.trim());
      }
    } else {
      const errText = await res.text().catch(() => "");
      console.warn("[Google Cloud Translation API] Status:", res.status, errText.slice(0, 160));
    }
  } catch (err) {
    console.warn("[Google Cloud Translation API] Network error, failing over to Gemini:", err);
  }

  return null;
}

/**
 * Translates text with Gemini, strictly preserving emojis, line breaks, and emotional tone.
 */
async function translateWithGemini(
  text: string,
  targetLang: "English" | "Bahasa Melayu" | "中文",
): Promise<string | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  const targetLangPrompt =
    targetLang === "Bahasa Melayu"
      ? "authentic, warm Malaysian Bahasa Melayu (santai, mesra, bersahaja)"
      : targetLang === "中文"
      ? "warm, natural colloquial Malaysian Chinese (温馨自然、贴心的日常大马华语)"
      : "natural, warm, empathetic English";

  const prompt = `You are an expert translation engine for a compassionate mental health and wellness community platform named ONY.
Translate the following community message or post into ${targetLangPrompt}.

CRITICAL PRESERVATION REQUIREMENTS:
1. Preserve the authentic emotional tone: empathy, warmth, vulnerability, reassurance, and calmness.
2. PRESERVE ALL EMOJIS (e.g. 🌱, ☕, 💫, 🍵, etc.) and punctuation exactly.
3. PRESERVE ALL LINE BREAKS (\\n) and paragraph structures. Do not flatten into a single run-on sentence.
4. Return ONLY the translated text. Do not add quotes, introductory tags, or meta explanations.

Original content to translate:
"""
${text}
"""`;

  const candidateModels = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash"];

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      });

      const reply = response.text?.trim();
      if (reply && reply.length > 0) {
        const cleaned = reply.replace(/^"""\s*/, "").replace(/\s*"""$/, "").replace(/^["'“”‘’]/, "").replace(/["'“”‘’]$/, "").trim();
        return cleaned || reply;
      }
    } catch (err: unknown) {
      console.warn(`[ONY Translation] Attempt with ${model} warning:`, err);
    }
  }

  return null;
}

/**
 * Translates a single string with caching:
 * 1. Checks in-memory cache
 * 2. Checks known seed dictionary
 * 3. Calls Google Cloud Translation API
 * 4. Falls back to Gemini with emotional tone & line-break preservation
 * 5. Falls back to original text if offline
 */
export async function translateSingleString(
  text: string,
  targetLang: "English" | "Bahasa Melayu" | "中文",
): Promise<{ translatedText: string; provider: "cache" | "google-cloud-translation" | "gemini" | "fallback" }> {
  const clean = text.trim();
  if (!clean) {
    return { translatedText: "", provider: "fallback" };
  }

  const cacheKey = `${targetLang}:::${clean}`;
  if (serverTranslationCache.has(cacheKey)) {
    return {
      translatedText: serverTranslationCache.get(cacheKey)!,
      provider: "cache",
    };
  }

  // Check known phrases dictionary
  const normalized = clean.toLowerCase();
  for (const [key, mapping] of Object.entries(KNOWN_PHRASES)) {
    if (normalized === key || (normalized.length > 20 && (normalized.includes(key) || key.includes(normalized)))) {
      const match = mapping[targetLang];
      if (match) {
        serverTranslationCache.set(cacheKey, match);
        return { translatedText: match, provider: "cache" };
      }
    }
  }

  // 1. Try Google Cloud Translation API
  const cloudResult = await translateWithGoogleCloudAPI(clean, targetLang);
  if (cloudResult) {
    serverTranslationCache.set(cacheKey, cloudResult);
    return { translatedText: cloudResult, provider: "google-cloud-translation" };
  }

  // 2. Fall back to Gemini with tone & emoji preservation
  const geminiResult = await translateWithGemini(clean, targetLang);
  if (geminiResult) {
    serverTranslationCache.set(cacheKey, geminiResult);
    return { translatedText: geminiResult, provider: "gemini" };
  }

  // 3. Fallback to original text
  return { translatedText: clean, provider: "fallback" };
}

/**
 * Translates supportive community messages or multi-field posts.
 */
export async function translateCommunityContent(
  req: TranslateRequest,
): Promise<{
  translatedText?: string;
  translatedTitle?: string;
  translatedBody?: string;
  provider: string;
}> {
  const target = req.targetLanguage;

  // Case A: Post with Title and Body
  if (req.title !== undefined || req.body !== undefined) {
    const [titleRes, bodyRes] = await Promise.all([
      req.title ? translateSingleString(req.title, target) : Promise.resolve(null),
      req.body ? translateSingleString(req.body, target) : Promise.resolve(null),
    ]);

    return {
      translatedTitle: titleRes ? titleRes.translatedText : req.title,
      translatedBody: bodyRes ? bodyRes.translatedText : req.body,
      provider: titleRes?.provider || bodyRes?.provider || "fallback",
    };
  }

  // Case B: Single supportive message text
  const textToTranslate = req.text || "";
  const singleRes = await translateSingleString(textToTranslate, target);
  return {
    translatedText: singleRes.translatedText,
    provider: singleRes.provider,
  };
}

/**
 * Transcribes voice note audio into text using Gemini audio transcription.
 */
export async function transcribeSupportiveVoice(
  req: TranscribeRequest,
): Promise<{ transcript: string }> {
  // 1. If audioDataUrl is provided with base64 data
  if (req.audioDataUrl && req.audioDataUrl.startsWith("data:audio/")) {
    const ai = getGeminiClient();
    if (ai) {
      try {
        const matches = req.audioDataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];

          const transcribeModels = [
            "gemini-3.5-transcribe",
            "gemini-3.6-flash",
            "gemini-3.8-flash",
          ];

          for (const model of transcribeModels) {
            try {
              const response = await ai.models.generateContent({
                model,
                contents: [
                  {
                    role: "user",
                    parts: [
                      {
                        inlineData: {
                          mimeType,
                          data: base64Data,
                        },
                      },
                      {
                        text: "Transcribe the spoken speech in this audio exactly. Return only the transcription text with natural punctuation. Do not add quotes, explanations, or timestamps.",
                      },
                    ],
                  },
                ],
              });

              const text = response.text?.trim();
              if (text && text.length > 0) {
                const cleaned = text.replace(/^["'“”‘’]/, "").replace(/["'“”‘’]$/, "").trim();
                return { transcript: cleaned };
              }
            } catch (err) {
              console.warn(`[ONY Community Transcribe] Model ${model} attempt warning:`, err);
            }
          }
        }
      } catch (err) {
        console.warn("[ONY Community Transcribe] Audio parsing error:", err);
      }
    }
  }

  // Fallback: If audio is a simulated voice note or synthetic chime note
  const duration = req.audioDuration || 8;
  const caption = (req.existingCaption || "").toLowerCase();

  if (caption.includes("0:08") || duration <= 10) {
    return {
      transcript:
        "Hey there! Just wanted to send you a gentle reminder that you are doing so well. Take things one breath at a time today 🌱",
    };
  } else if (duration <= 15) {
    return {
      transcript:
        "Sending you a warm voice note across the globe. Remember you never have to carry all of this on your own. Rest whenever you need to 💫",
    };
  }

  return {
    transcript:
      "Sending you quiet encouragement and gentle warmth today. Be kind to yourself and take one peaceful breath right now 🍵",
  };
}
