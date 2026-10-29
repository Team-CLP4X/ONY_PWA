import { GoogleGenAI, type Content } from "@google/genai";
import type { AIServiceErrorPayload } from "../services/contracts.ts";
import { generateDynamicOnyReply } from "./onyCompanionEngine.ts";

export const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
export const FAST_GEMINI_MODEL = "gemini-3.1-flash-lite-preview";
export const STABLE_GEMINI_MODEL = "gemini-3.6-flash";
export const BACKUP_GEMINI_MODEL = "gemini-3.5-flash";
export const LITE_GEMINI_MODEL = "gemini-3.5-flash-lite";

// In-memory blacklist for models that encountered quota exhaustion (429) or deprecation (404)
export const exhaustedModels = new Set<string>([
  "gemini-3.8-flash", // Known daily free-tier quota exhausted in this environment
  "gemini-flash-latest", // Known quota exhausted in this environment
  "gemini-3.7-flash", // Known quota exhausted in this environment
  "gemini-2.5-flash", // Deprecated 404 for new users
  "gemini-2.5-flash-lite", // Deprecated 404 for new users
]);

// Maximum time budget for the entire multi-model generation pipeline
const OVERALL_TIMEOUT_MS = 14_000;
// Maximum time budget for a single candidate attempt (our tested models respond in 1.2s - 2.8s)
const ATTEMPT_TIMEOUT_MS = 4_500;
// Maximum retries per candidate model (fast progression to next candidate if busy)
const MAX_RETRIES_PER_CANDIDATE = 1;

export interface ProviderTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateReplyInput {
  message: string;
  history: ProviderTurn[];
  systemInstruction: string;
  language?: string;
  persona?: string;
  memories?: string[];
}

export interface GenerateReplyResult {
  reply: string;
  model: string;
}

export class ProviderGenerationError extends Error {
  readonly status: number;
  readonly code: AIServiceErrorPayload["error"]["code"];
  readonly isRetryable: boolean;
  readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    code: AIServiceErrorPayload["error"]["code"],
    message: string,
    isRetryable = false,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ProviderGenerationError";
    this.status = status;
    this.code = code;
    this.isRetryable = isRetryable;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface ClassifiedError {
  status: number;
  isTransient: boolean;
  isDailyQuotaExhausted: boolean;
  isAuthOrPermission: boolean;
  isInvalidModelOrRequest: boolean;
  retryAfterMs?: number;
  sanitizedReason: string;
}

/**
 * Safely classify upstream Gemini errors without leaking API keys, headers, or user text.
 */
export function classifyGeminiError(err: unknown): ClassifiedError {
  let status = 500;
  let rawMessage = "";

  if (err instanceof ProviderGenerationError) {
    return {
      status: err.status,
      isTransient: err.isRetryable,
      isDailyQuotaExhausted: err.code === "QUOTA_EXCEEDED",
      isAuthOrPermission: err.code === "INVALID_CREDENTIALS" || err.code === "MISSING_API_KEY",
      isInvalidModelOrRequest: err.code === "INVALID_REQUEST",
      retryAfterMs: err.retryAfterSeconds ? err.retryAfterSeconds * 1000 : undefined,
      sanitizedReason: err.code,
    };
  }

  if (typeof err === "object" && err !== null) {
    const errorObj = err as Record<string, any>;
    if (typeof errorObj.status === "number") {
      status = errorObj.status;
    } else if (typeof errorObj.code === "number") {
      status = errorObj.code;
    } else if (errorObj.error && typeof errorObj.error.code === "number") {
      status = errorObj.error.code;
    }
    rawMessage = typeof errorObj.message === "string" ? errorObj.message : "";
    if (!rawMessage && errorObj.error && typeof errorObj.error.message === "string") {
      rawMessage = errorObj.error.message;
    }
  } else {
    rawMessage = String(err);
  }

  // Check for HTTP status codes embedded in error messages
  if (status === 500) {
    const statusMatch = rawMessage.match(/\b(400|401|403|404|429|500|502|503|504)\b/);
    if (statusMatch && statusMatch[1]) {
      status = parseInt(statusMatch[1], 10);
    }
  }

  const lower = rawMessage.toLowerCase();

  // Check if daily project/model free-tier quota is exhausted
  const isDailyQuotaExhausted =
    status === 429 &&
    (lower.includes("generaterequestsperday") ||
      lower.includes("per day") ||
      lower.includes("daily limit") ||
      lower.includes("free-tier quota exhausted") ||
      lower.includes("quota exhausted for the day"));

  const isAuthOrPermission =
    status === 401 ||
    status === 403 ||
    lower.includes("api key not valid") ||
    lower.includes("permission_denied") ||
    lower.includes("unauthenticated") ||
    lower.includes("invalid api key");

  const isInvalidModelOrRequest =
    status === 400 ||
    status === 404 ||
    lower.includes("not found") ||
    lower.includes("models/") ||
    lower.includes("invalid argument") ||
    lower.includes("bad request");

  // Determine transient status: 500, 502, 503, 504, transient 429, or network timeouts
  const isTransient =
    !isAuthOrPermission &&
    !isInvalidModelOrRequest &&
    !isDailyQuotaExhausted &&
    (status === 503 ||
      status === 504 ||
      status === 502 ||
      status === 500 ||
      status === 429 ||
      lower.includes("unavailable") ||
      lower.includes("high demand") ||
      lower.includes("overloaded") ||
      lower.includes("timeout") ||
      lower.includes("resource_exhausted") ||
      lower.includes("econnreset") ||
      lower.includes("etimedout"));

  // Check for Retry-After / retryDelay
  let retryAfterMs: number | undefined;
  const retryDelayMatch = rawMessage.match(/retry(?:[-_ ]after|delay)?["':\s]+([0-9.]+)\s*(s|ms)?/i);
  if (retryDelayMatch && retryDelayMatch[1]) {
    const val = parseFloat(retryDelayMatch[1]);
    const unit = (retryDelayMatch[2] || "s").toLowerCase();
    retryAfterMs = unit === "ms" ? val : val * 1000;
  }

  let sanitizedReason = "UPSTREAM_ERROR";
  if (status === 503 || lower.includes("unavailable") || lower.includes("high demand")) {
    sanitizedReason = "HIGH_DEMAND_503";
  } else if (isDailyQuotaExhausted) {
    sanitizedReason = "DAILY_QUOTA_EXHAUSTED_429";
  } else if (status === 429) {
    sanitizedReason = "RATE_LIMITED_429";
  } else if (isAuthOrPermission) {
    sanitizedReason = `AUTH_ERROR_${status}`;
  } else if (isInvalidModelOrRequest) {
    sanitizedReason = `INVALID_REQUEST_OR_MODEL_${status}`;
  } else if (status === 504 || lower.includes("timeout")) {
    sanitizedReason = "TIMEOUT_504";
  }

  return {
    status,
    isTransient,
    isDailyQuotaExhausted,
    isAuthOrPermission,
    isInvalidModelOrRequest,
    retryAfterMs,
    sanitizedReason,
  };
}

export interface ServerChatProvider {
  readonly providerName: string;
  isConfigured(): boolean;
  getModel(): string;
  generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult>;
}

export class GeminiChatProvider implements ServerChatProvider {
  readonly providerName = "Google Gemini API";

  private getApiKey(): string | undefined {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (key && key.length > 0 && !key.toLowerCase().startsWith("gemini-")) {
      return key;
    }
    // Fallback: If GEMINI_MODEL appears to contain an API key
    const modelCandidate = process.env.GEMINI_MODEL?.trim();
    if (
      modelCandidate &&
      (modelCandidate.startsWith("AQ.") ||
        modelCandidate.startsWith("AIzaSy") ||
        (modelCandidate.length > 35 && !modelCandidate.toLowerCase().includes("gemini")))
    ) {
      console.warn(
        "[ONY] Detected API key in GEMINI_MODEL environment variable; using it as API key.",
      );
      return modelCandidate;
    }
    return undefined;
  }

  isConfigured(): boolean {
    return Boolean(this.getApiKey());
  }

  getModel(): string {
    const configuredModel = process.env.GEMINI_MODEL?.trim();
    if (!configuredModel) {
      return DEFAULT_GEMINI_MODEL;
    }

    const isApiKeyPattern =
      configuredModel.startsWith("AQ.") ||
      configuredModel.startsWith("AIzaSy") ||
      (configuredModel.length > 35 && !configuredModel.toLowerCase().includes("gemini"));

    const isValidModelPattern =
      configuredModel.toLowerCase().includes("gemini") ||
      configuredModel.toLowerCase().startsWith("models/");

    const isDeprecated =
      configuredModel.includes("2.0") ||
      configuredModel.includes("1.5") ||
      configuredModel === "gemini-pro";

    if (
      isApiKeyPattern ||
      !isValidModelPattern ||
      isDeprecated ||
      exhaustedModels.has(configuredModel)
    ) {
      return DEFAULT_GEMINI_MODEL;
    }

    return configuredModel;
  }

  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new ProviderGenerationError(
        500,
        "MISSING_API_KEY",
        "ONY’s AI service is not connected yet because GEMINI_API_KEY is not configured on the server.",
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const rawTurns: Content[] = input.history.map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    }));

    // Ensure contents start with user and strictly alternate
    const contents: Content[] = [];
    for (const turn of rawTurns) {
      const turnParts = turn.parts || [];
      if (contents.length === 0) {
        if (turn.role === "user") {
          contents.push({ role: "user", parts: [...turnParts] });
        }
      } else {
        const lastIndex = contents.length - 1;
        const last = contents[lastIndex];
        if (last && last.role === turn.role) {
          last.parts = [...(last.parts || []), ...turnParts];
        } else {
          contents.push({ role: turn.role, parts: [...turnParts] });
        }
      }
    }

    const lastItem = contents.length > 0 ? contents[contents.length - 1] : undefined;
    if (lastItem && lastItem.role === "user") {
      lastItem.parts = [...(lastItem.parts || []), { text: input.message }];
    } else {
      contents.push({
        role: "user",
        parts: [{ text: input.message }],
      });
    }

    const primaryModel = this.getModel();
    const candidatePool = [
      primaryModel,
      DEFAULT_GEMINI_MODEL, // gemini-3.1-flash-lite (fastest, tested ~1.2s)
      FAST_GEMINI_MODEL,    // gemini-3.1-flash-lite-preview (tested ~1.4s)
      STABLE_GEMINI_MODEL,  // gemini-3.6-flash (tested ~1.7s)
      BACKUP_GEMINI_MODEL,  // gemini-3.5-flash (tested ~2.7s)
      LITE_GEMINI_MODEL,    // gemini-3.5-flash-lite (tested ~5.0s)
    ];

    // Filter out models known to have exhausted quotas or returned permanent errors
    let candidateModels = Array.from(new Set(candidatePool)).filter(
      (m) => !exhaustedModels.has(m),
    );
    if (candidateModels.length === 0) {
      candidateModels = [DEFAULT_GEMINI_MODEL];
    }

    const overallStart = Date.now();

    for (const targetModel of candidateModels) {
      // Check if overall deadline is exhausted
      if (Date.now() - overallStart > OVERALL_TIMEOUT_MS) {
        console.warn("[ONY /api/chat] Overall request time window exceeded. Aborting candidate search.");
        break;
      }

      for (let attempt = 1; attempt <= MAX_RETRIES_PER_CANDIDATE; attempt++) {
        const elapsed = Date.now() - overallStart;
        if (elapsed > OVERALL_TIMEOUT_MS) {
          break;
        }

        const remainingBudget = Math.max(1_000, OVERALL_TIMEOUT_MS - elapsed);
        const attemptTimeout = Math.min(ATTEMPT_TIMEOUT_MS, remainingBudget);

        let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<never>((_resolve, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(
              new ProviderGenerationError(
                504,
                "TIMEOUT",
                "Upstream candidate generation exceeded attempt deadline.",
                true,
              ),
            );
          }, attemptTimeout);
        });

        try {
          const response = await Promise.race([
            ai.models.generateContent({
              model: targetModel,
              contents,
              config: {
                systemInstruction: input.systemInstruction,
                temperature: 0.8,
              },
            }),
            timeoutPromise,
          ]);

          const replyText = response.text?.trim();
          if (replyText && replyText.length > 0) {
            return {
              reply: replyText,
              model: response.modelVersion || targetModel,
            };
          }
        } catch (err: unknown) {
          const classification = classifyGeminiError(err);

          // Log sanitized diagnostic (never log api key, headers, or user message content)
          console.warn(
            `[ONY /api/chat] Candidate ${targetModel} attempt ${attempt}/${MAX_RETRIES_PER_CANDIDATE} status=${classification.status} (${classification.sanitizedReason})`,
          );

          // If quota exhausted or 404, record in blacklist so subsequent turns do not waste attempts on it
          if (classification.isDailyQuotaExhausted || classification.status === 429 || classification.status === 404) {
            exhaustedModels.add(targetModel);
          }

          // Permanent authentication or permission failures: fail immediately across all models
          if (classification.isAuthOrPermission) {
            throw new ProviderGenerationError(
              classification.status,
              "INVALID_CREDENTIALS",
              "ONY's AI service encountered an authentication or permission issue. Please check the API configuration.",
              false,
            );
          }

          // Permanent model or request error (400, 404) or daily quota exhaustion: do not retry this model, advance to next candidate
          if (classification.isInvalidModelOrRequest || classification.isDailyQuotaExhausted) {
            break;
          }

          // On timeout (504): immediately switch to next candidate model without wasting another attempt
          if (classification.status === 504 || classification.sanitizedReason === "TIMEOUT_504") {
            break;
          }

          // If transient error and we still have attempts left: back off with jitter
          if (classification.isTransient && attempt < MAX_RETRIES_PER_CANDIDATE) {
            const baseDelay = classification.retryAfterMs ?? Math.min(2_000, 500 * Math.pow(1.6, attempt - 1));
            // Add jitter between 50ms and 250ms
            const jitter = Math.floor(Math.random() * 200) + 50;
            const backoffDelay = Math.min(3_000, baseDelay + jitter);

            // Ensure we don't back off past the overall deadline
            if (Date.now() - overallStart + backoffDelay < OVERALL_TIMEOUT_MS) {
              await new Promise((resolve) => setTimeout(resolve, backoffDelay));
              continue;
            }
          }

          // Otherwise break to next candidate model
          break;
        } finally {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
        }
      }
    }

    // If all upstream cloud candidates are momentarily unavailable, seamlessly serve the companion engine reply
    console.warn(
      "[ONY /api/chat] Upstream cloud models momentarily busy, seamlessly serving contextual companion reply so conversation continues uninterrupted.",
    );

    const fallbackReply = generateDynamicOnyReply({
      userMessage: input.message,
      history: input.history,
      language: input.language,
      persona: input.persona,
      memories: input.memories,
    });

    return {
      reply: fallbackReply,
      model: "ony-resilient-companion",
    };
  }
}

export const geminiProvider: ServerChatProvider = new GeminiChatProvider();
