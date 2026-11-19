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

export class CommunityAIError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "CommunityAIError";
    this.status = status;
    this.code = code;
  }
}

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const ALLOWED_AUDIO_HOSTS = [
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
];

// In-memory cache of real model outputs (no pre-seeded fake phrase tables)
const serverTranslationCache = new Map<string, string>();

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
  return key && !key.toLowerCase().startsWith("gemini-") ? key : undefined;
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

async function translateWithGoogleCloudAPI(
  text: string,
  targetLang: "English" | "Bahasa Melayu" | "中文",
): Promise<string | null> {
  const apiKey =
    process.env.GOOGLE_TRANSLATE_API_KEY?.trim() ||
    process.env.GOOGLE_CLOUD_API_KEY?.trim() ||
    process.env.TRANSLATION_API_KEY?.trim();

  if (!apiKey) return null;

  const targetCode = targetLang === "Bahasa Melayu" ? "ms" : targetLang === "中文" ? "zh-CN" : "en";

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    }
  } catch (err) {
    console.warn("[Google Cloud Translation API] Request failed, trying Gemini:", err);
  }

  return null;
}

async function translateWithGemini(
  text: string,
  targetLang: "English" | "Bahasa Melayu" | "中文",
): Promise<string | null> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new CommunityAIError(
      503,
      "MISSING_API_KEY",
      "Translation service unavailable: GEMINI_API_KEY is not configured.",
    );
  }

  const targetLangPrompt =
    targetLang === "Bahasa Melayu"
      ? "authentic, warm Malaysian Bahasa Melayu (santai, mesra, bersahaja)"
      : targetLang === "中文"
      ? "warm, natural colloquial Malaysian Chinese (温馨自然、贴心的日常大马华语)"
      : "natural, warm, empathetic English";

  const prompt = `You are an expert translation engine for a compassionate mental health and wellness community platform named ONY.
Translate the following community message or post into ${targetLangPrompt}.

REQUIREMENTS:
1. Preserve the authentic emotional tone: empathy, warmth, vulnerability, reassurance, and calmness.
2. Preserve all emojis and punctuation faithfully.
3. Preserve all line breaks and paragraph formatting.
4. Return ONLY the translated text with no quotes, markdown fences, or explanations.

Original content:
"""
${text}
"""`;

  const candidateModels = ["gemini-4-hydrogen", "gemini-3.5-flash"];

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
        const cleaned = reply
          .replace(/^"""\s*/, "")
          .replace(/\s*"""$/, "")
          .replace(/^["'“”‘’]/, "")
          .replace(/["'“”‘’]$/, "")
          .trim();
        return cleaned || reply;
      }
    } catch (err) {
      console.warn(`[ONY Translation] Attempt with ${model} failed:`, err);
    }
  }

  return null;
}

export async function translateSingleString(
  text: string,
  targetLang: "English" | "Bahasa Melayu" | "中文",
): Promise<{ translatedText: string; provider: "cache" | "google-cloud-translation" | "gemini" }> {
  const clean = text.trim();
  if (!clean) {
    throw new CommunityAIError(400, "INVALID_REQUEST", "Text to translate cannot be empty.");
  }

  const cacheKey = `${targetLang}:::${clean}`;
  if (serverTranslationCache.has(cacheKey)) {
    return {
      translatedText: serverTranslationCache.get(cacheKey)!,
      provider: "cache",
    };
  }

  const cloudResult = await translateWithGoogleCloudAPI(clean, targetLang);
  if (cloudResult) {
    serverTranslationCache.set(cacheKey, cloudResult);
    return { translatedText: cloudResult, provider: "google-cloud-translation" };
  }

  const geminiResult = await translateWithGemini(clean, targetLang);
  if (geminiResult) {
    serverTranslationCache.set(cacheKey, geminiResult);
    return { translatedText: geminiResult, provider: "gemini" };
  }

  throw new CommunityAIError(
    503,
    "UPSTREAM_ERROR",
    "Translation service is temporarily unavailable. Please try again later.",
  );
}

export async function translateCommunityContent(
  req: TranslateRequest,
): Promise<{
  translatedText?: string;
  translatedTitle?: string;
  translatedBody?: string;
  provider: string;
}> {
  const target = req.targetLanguage;

  if (req.title !== undefined || req.body !== undefined) {
    const [titleRes, bodyRes] = await Promise.all([
      req.title?.trim() ? translateSingleString(req.title, target) : Promise.resolve(null),
      req.body?.trim() ? translateSingleString(req.body, target) : Promise.resolve(null),
    ]);

    return {
      translatedTitle: titleRes ? titleRes.translatedText : req.title,
      translatedBody: bodyRes ? bodyRes.translatedText : req.body,
      provider: titleRes?.provider || bodyRes?.provider || "gemini",
    };
  }

  const textToTranslate = (req.text || "").trim();
  const singleRes = await translateSingleString(textToTranslate, target);
  return {
    translatedText: singleRes.translatedText,
    provider: singleRes.provider,
  };
}

function isAllowedStorageAudioUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    return (
      ALLOWED_AUDIO_HOSTS.includes(parsed.hostname) ||
      parsed.hostname.endsWith(".firebasestorage.app")
    );
  } catch {
    return false;
  }
}

async function resolveAudioPayload(audioInput: string): Promise<{ mimeType: string; base64Data: string }> {
  if (audioInput.startsWith("data:audio/")) {
    const matches = audioInput.match(/^data:(audio\/[^;]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new CommunityAIError(400, "INVALID_REQUEST", "Invalid audio data URL format.");
    }
    const approxBytes = Math.ceil((matches[2].length * 3) / 4);
    if (approxBytes > MAX_AUDIO_BYTES) {
      throw new CommunityAIError(413, "PAYLOAD_TOO_LARGE", "Audio recording exceeds 10 MB limit.");
    }
    return { mimeType: matches[1], base64Data: matches[2] };
  }

  if (isAllowedStorageAudioUrl(audioInput)) {
    const resp = await fetch(audioInput);
    if (!resp.ok) {
      throw new CommunityAIError(400, "INVALID_REQUEST", "Unable to fetch stored audio file for transcription.");
    }
    const contentLength = Number(resp.headers.get("content-length") || "0");
    if (contentLength > MAX_AUDIO_BYTES) {
      throw new CommunityAIError(413, "PAYLOAD_TOO_LARGE", "Audio file exceeds 10 MB limit.");
    }
    const contentType = (resp.headers.get("content-type") || "audio/webm").split(";")[0].trim();
    const arrayBuffer = await resp.arrayBuffer();
    if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_AUDIO_BYTES) {
      throw new CommunityAIError(400, "INVALID_REQUEST", "Audio file is empty or exceeds 10 MB.");
    }
    return {
      mimeType: contentType.startsWith("audio/") ? contentType : "audio/webm",
      base64Data: Buffer.from(arrayBuffer).toString("base64"),
    };
  }

  throw new CommunityAIError(
    400,
    "INVALID_REQUEST",
    "A valid audio data URL or Firebase Storage audio URL is required for transcription.",
  );
}

export async function transcribeSupportiveVoice(
  req: TranscribeRequest,
): Promise<{ transcript: string }> {
  const audioInput = (req.audioDataUrl || "").trim();
  if (!audioInput) {
    throw new CommunityAIError(
      400,
      "INVALID_REQUEST",
      "No audio recording was provided to transcribe.",
    );
  }

  const ai = getGeminiClient();
  if (!ai) {
    throw new CommunityAIError(
      503,
      "MISSING_API_KEY",
      "Voice transcription unavailable: GEMINI_API_KEY is not configured.",
    );
  }

  const { mimeType, base64Data } = await resolveAudioPayload(audioInput);

  const transcribeModels = ["gemini-3.5-transcribe", "gemini-4-hydrogen"];
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
                text: "Transcribe the spoken speech in this audio accurately. Return only the transcription text with natural punctuation and no quotes or timestamps.",
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
      console.warn(`[ONY Community Transcribe] Model ${model} failed:`, err);
    }
  }

  throw new CommunityAIError(
    503,
    "UPSTREAM_ERROR",
    "Unable to transcribe this audio recording right now. Please try again later.",
  );
}
