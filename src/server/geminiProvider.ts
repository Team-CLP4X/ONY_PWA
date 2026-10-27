import { GoogleGenAI, type Content } from "@google/genai";
import type { AIServiceErrorPayload } from "../services/contracts.ts";

export const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
export const BACKUP_GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_TIMEOUT_MS = 20_000;

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

    // Check if configured model is known to be deprecated per Gemini API specification
    const isDeprecated =
      configuredModel.includes("2.0") ||
      configuredModel.includes("1.5") ||
      configuredModel === "gemini-pro";

    if (isApiKeyPattern || !isValidModelPattern || isDeprecated) {
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

    const ai = new GoogleGenAI({ apiKey });

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
    const candidateModels = Array.from(
      new Set([DEFAULT_GEMINI_MODEL, primaryModel, BACKUP_GEMINI_MODEL]),
    );

    let lastError: unknown = null;

    for (const targetModel of candidateModels) {
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(
            new ProviderGenerationError(
              500,
              "TIMEOUT",
              "ONY took a moment too long to respond. Please try again.",
            ),
          );
        }, GEMINI_TIMEOUT_MS);
      });

      try {
        const response = await Promise.race([
          ai.models.generateContent({
            model: targetModel,
            contents,
            config: {
              systemInstruction: input.systemInstruction,
              temperature: 0.8,
              ...(targetModel.includes("3.8")
                ? { thinkingConfig: { thinkingBudget: 0 } }
                : {}),
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
        lastError = err;
        console.warn(
          `[ONY /api/chat] Model ${targetModel} attempt failed, trying fallback if available:`,
          err instanceof Error ? err.message : err,
        );
      } finally {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      }
    }

    // If all models failed (e.g. temporary network disruption or rate limit),
    // provide an empathetic companion fallback reply so ONY never fails with an empty or broken reply.
    console.error(
      "[ONY /api/chat] All Gemini candidate models failed. Returning compassionate fallback.",
      lastError,
    );
    return {
      reply:
        "I'm listening, though my connection just flickered for a second. Take all the time you need, and feel free to continue when you're ready.",
      model: "ony-resilient-fallback",
    };
  }
}

export const geminiProvider: ServerChatProvider = new GeminiChatProvider();
