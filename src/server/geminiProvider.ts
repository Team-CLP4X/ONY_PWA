import { GoogleGenAI, ThinkingLevel, type Content } from "@google/genai";
import type { AIServiceErrorPayload } from "../services/contracts.ts";

export const DEFAULT_GEMINI_MODEL = "gemini-4-hydrogen";
export const STABLE_GEMINI_MODEL = "gemini-4-hydrogen";
export const BACKUP_GEMINI_MODEL = "gemini-3.5-flash";
export const FAST_GEMINI_MODEL = "gemini-3.1-flash-lite";
export const LITE_GEMINI_MODEL = "gemini-3.5-flash-lite";

// Runtime blacklist for models encountering daily quota exhaustion (429) or deprecation (404)
export const exhaustedModels = new Set<string>();

const OVERALL_TIMEOUT_MS = 40_000;
const ATTEMPT_TIMEOUT_MS = 18_000;
const MAX_RETRIES_PER_CANDIDATE = 2;

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
    const errorObj = err as Record<string, unknown>;
    if (typeof errorObj.status === "number") {
      status = errorObj.status;
    } else if (typeof errorObj.code === "number") {
      status = errorObj.code;
    } else if (
      errorObj.error &&
      typeof errorObj.error === "object" &&
      typeof (errorObj.error as Record<string, unknown>).code === "number"
    ) {
      status = (errorObj.error as Record<string, unknown>).code as number;
    }
    rawMessage = typeof errorObj.message === "string" ? errorObj.message : "";
    if (
      !rawMessage &&
      errorObj.error &&
      typeof errorObj.error === "object" &&
      typeof (errorObj.error as Record<string, unknown>).message === "string"
    ) {
      rawMessage = (errorObj.error as Record<string, unknown>).message as string;
    }
  } else {
    rawMessage = String(err);
  }

  if (status === 500) {
    const statusMatch = rawMessage.match(/\b(400|401|403|404|429|500|502|503|504)\b/);
    if (statusMatch && statusMatch[1]) {
      status = parseInt(statusMatch[1], 10);
    }
  }

  const lower = rawMessage.toLowerCase();

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
    return key && !key.toLowerCase().startsWith("gemini-") ? key : undefined;
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
        503,
        "MISSING_API_KEY",
        "ONY's AI service is not connected yet because GEMINI_API_KEY is not configured on the server.",
        false,
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
      STABLE_GEMINI_MODEL,
      BACKUP_GEMINI_MODEL,
      FAST_GEMINI_MODEL,
      LITE_GEMINI_MODEL,
    ];

    let candidateModels = Array.from(new Set(candidatePool)).filter(
      (m) => !exhaustedModels.has(m),
    );
    if (candidateModels.length === 0) {
      candidateModels = [DEFAULT_GEMINI_MODEL];
    }

    const overallStart = Date.now();
    let lastClassification: ClassifiedError | null = null;

    for (const targetModel of candidateModels) {
      if (Date.now() - overallStart > OVERALL_TIMEOUT_MS) {
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
                "Upstream AI model exceeded response deadline.",
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
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
          lastClassification = classification;

          console.warn(
            `[ONY /api/chat] Candidate ${targetModel} attempt ${attempt}/${MAX_RETRIES_PER_CANDIDATE} status=${classification.status} (${classification.sanitizedReason})`,
          );

          if (classification.isDailyQuotaExhausted || classification.status === 429 || classification.status === 404) {
            exhaustedModels.add(targetModel);
          }

          if (classification.isAuthOrPermission) {
            throw new ProviderGenerationError(
              classification.status,
              "INVALID_CREDENTIALS",
              "ONY's AI service encountered an authentication or permission issue.",
              false,
            );
          }

          if (classification.isInvalidModelOrRequest || classification.isDailyQuotaExhausted) {
            break;
          }

          if (classification.status === 504 || classification.sanitizedReason === "TIMEOUT_504") {
            break;
          }

          if (classification.isTransient && attempt < MAX_RETRIES_PER_CANDIDATE) {
            const baseDelay = classification.retryAfterMs ?? Math.min(2_000, 500 * Math.pow(1.6, attempt - 1));
            const jitter = Math.floor(Math.random() * 200) + 50;
            const backoffDelay = Math.min(3_000, baseDelay + jitter);

            if (Date.now() - overallStart + backoffDelay < OVERALL_TIMEOUT_MS) {
              await new Promise((resolve) => setTimeout(resolve, backoffDelay));
              continue;
            }
          }

          break;
        } finally {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
        }
      }
    }

    if (lastClassification?.isDailyQuotaExhausted) {
      throw new ProviderGenerationError(
        429,
        "QUOTA_EXCEEDED",
        "AI quota is temporarily exhausted. Please try again shortly.",
        true,
        lastClassification.retryAfterMs ? Math.ceil(lastClassification.retryAfterMs / 1000) : 60,
      );
    }

    if (lastClassification?.status === 504) {
      throw new ProviderGenerationError(
        504,
        "TIMEOUT",
        "ONY took too long to generate a response. Please tap Retry.",
        true,
      );
    }

    throw new ProviderGenerationError(
      503,
      "MODEL_UNAVAILABLE",
      "ONY's AI service is temporarily busy. Please tap Retry in a moment.",
      true,
      lastClassification?.retryAfterMs ? Math.ceil(lastClassification.retryAfterMs / 1000) : 5,
    );
  }
}

export const geminiProvider: ServerChatProvider = new GeminiChatProvider();
