import { GoogleGenAI, type Content } from "@google/genai";
import type { AIServiceErrorPayload } from "../services/contracts.ts";

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_TIMEOUT_MS = 25_000;

export interface ProviderTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateReplyInput {
  message: string;
  history: ProviderTurn[];
  systemInstruction: string;
}

export interface GenerateReplyResult {
  reply: string;
  model: string;
}

export class ProviderGenerationError extends Error {
  readonly status: number;
  readonly code: AIServiceErrorPayload["error"]["code"];

  constructor(
    status: number,
    code: AIServiceErrorPayload["error"]["code"],
    message: string,
  ) {
    super(message);
    this.name = "ProviderGenerationError";
    this.status = status;
    this.code = code;
  }
}

export interface ServerChatProvider {
  readonly providerName: string;
  isConfigured(): boolean;
  getModel(): string;
  generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult>;
}

class GeminiChatProvider implements ServerChatProvider {
  readonly providerName = "Google Gemini API";

  private getApiKey(): string | undefined {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (key && key.length > 0 && !key.toLowerCase().startsWith("gemini-")) {
      return key;
    }
    // Fallback: If GEMINI_MODEL appears to contain an API key (e.g. starts with AQ. or AIzaSy)
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

    // Guard against API keys accidentally passed in GEMINI_MODEL
    const isApiKeyPattern =
      configuredModel.startsWith("AQ.") ||
      configuredModel.startsWith("AIzaSy") ||
      (configuredModel.length > 35 && !configuredModel.toLowerCase().includes("gemini"));

    const isValidModelPattern =
      configuredModel.toLowerCase().includes("gemini") ||
      configuredModel.toLowerCase().startsWith("models/");

    if (isApiKeyPattern || !isValidModelPattern) {
      console.warn(
        `[ONY] Ignoring invalid GEMINI_MODEL value ("${configuredModel.slice(0, 8)}..."). Falling back to default model: ${DEFAULT_GEMINI_MODEL}.`,
      );
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
        "ONY’s AI service is not connected yet because GEMINI_API_KEY is not configured on the server.",
      );
    }

    const model = this.getModel();

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const contents: Content[] = [
      ...input.history.map((turn) => ({
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: turn.content }],
      })),
      {
        role: "user",
        parts: [{ text: input.message }],
      },
    ];

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(
          new ProviderGenerationError(
            504,
            "TIMEOUT",
            "ONY took too long to respond. Please try again in a moment.",
          ),
        );
      }, GEMINI_TIMEOUT_MS);
    });

    const executeGenerate = async (targetModel: string) => {
      const response = await Promise.race([
        ai.models.generateContent({
          model: targetModel,
          contents,
          config: {
            systemInstruction: input.systemInstruction,
            temperature: 0.7,
          },
        }),
        timeoutPromise,
      ]);

      const replyText = response.text?.trim();
      if (!replyText) {
        throw new ProviderGenerationError(
          502,
          "UPSTREAM_ERROR",
          "ONY received an empty response from the AI service. Please try sending your message again.",
        );
      }

      return {
        reply: replyText,
        model: response.modelVersion || targetModel,
      };
    };

    try {
      return await executeGenerate(model);
    } catch (err: unknown) {
      if (err instanceof ProviderGenerationError) {
        throw err;
      }

      const errObj = err as {
        status?: number;
        code?: number | string;
        name?: string;
        message?: string;
      };
      const status =
        typeof errObj?.status === "number"
          ? errObj.status
          : typeof errObj?.code === "number"
            ? errObj.code
            : undefined;
      const rawMsg = (errObj?.message || "").toLowerCase();

      // If a custom or configured model failed due to invalid model / not found / bad request,
      // attempt fallback to default model if we haven't already.
      if (
        (status === 404 ||
          status === 400 ||
          rawMsg.includes("not found") ||
          rawMsg.includes("not supported")) &&
        model !== DEFAULT_GEMINI_MODEL
      ) {
        console.warn(
          `[ONY /api/chat] Model ${model} failed with ${status}. Attempting fallback to ${DEFAULT_GEMINI_MODEL}...`,
        );
        try {
          return await executeGenerate(DEFAULT_GEMINI_MODEL);
        } catch (fallbackErr: unknown) {
          console.error(
            `[ONY /api/chat] Fallback model ${DEFAULT_GEMINI_MODEL} also failed:`,
            fallbackErr,
          );
        }
      }

      console.info(
        `[ONY /api/chat] Handled Gemini API error: status=${status ?? "n/a"} name=${errObj?.name ?? "Error"} model=${model}`,
      );

      if (
        errObj?.name === "AbortError" ||
        rawMsg.includes("timeout") ||
        rawMsg.includes("timed out") ||
        status === 504
      ) {
        throw new ProviderGenerationError(
          504,
          "TIMEOUT",
          "ONY took too long to respond. Please try again in a moment.",
        );
      }

      if (
        status === 401 ||
        status === 403 ||
        rawMsg.includes("api_key_invalid") ||
        rawMsg.includes("api key not valid") ||
        rawMsg.includes("permission_denied")
      ) {
        throw new ProviderGenerationError(
          401,
          "INVALID_CREDENTIALS",
          "The configured GEMINI_API_KEY was rejected. Please verify your secret in the Google AI Studio Settings > Secrets panel.",
        );
      }

      if (
        status === 429 ||
        rawMsg.includes("resource_exhausted") ||
        rawMsg.includes("quota") ||
        rawMsg.includes("rate limit")
      ) {
        throw new ProviderGenerationError(
          429,
          "QUOTA_EXCEEDED",
          "ONY’s Gemini free-tier rate or quota limit has been reached right now. Please wait a moment and try again.",
        );
      }

      if (
        status === 404 ||
        status === 400 ||
        rawMsg.includes("not found") ||
        rawMsg.includes("not supported")
      ) {
        throw new ProviderGenerationError(
          502,
          "MODEL_UNAVAILABLE",
          `The requested Gemini model (${model}) could not complete the request. Verify GEMINI_MODEL or try again shortly.`,
        );
      }

      throw new ProviderGenerationError(
        502,
        "UPSTREAM_ERROR",
        "ONY could not reach the Gemini AI service right now. Please try again shortly.",
      );
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }
}

export const geminiProvider: ServerChatProvider = new GeminiChatProvider();
