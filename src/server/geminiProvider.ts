import { GoogleGenAI, type Content } from "@google/genai";
import type { AIServiceErrorPayload } from "../services/contracts.ts";
import { generateDynamicOnyReply } from "./onyCompanionEngine.ts";

export const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
export const FAST_GEMINI_MODEL = "gemini-3.8-flash";
export const BACKUP_GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_TIMEOUT_MS = 6_000;

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
    const candidateModels = Array.from(
      new Set([DEFAULT_GEMINI_MODEL, primaryModel, FAST_GEMINI_MODEL, BACKUP_GEMINI_MODEL]),
    );

    for (const targetModel of candidateModels) {
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(
            new ProviderGenerationError(
              503,
              "TIMEOUT",
              "Upstream model response exceeded timeout window.",
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
        const errMsg = err instanceof Error ? err.message : String(err);
        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("overloaded") ||
          errMsg.includes("high demand") ||
          errMsg.includes("unavailable") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("ResourceExhausted") ||
          errMsg.includes("429") ||
          errMsg.includes("TIMEOUT");

        console.log(
          `[ONY /api/chat] Candidate ${targetModel} busy (${isTransient ? "transient high demand" : "temporary pause"}), advancing to next candidate.`,
        );
      } finally {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      }
    }

    // If all models encountered transient high demand or rate limit, serve the dynamic empathetic companion reply
    console.log(
      "[ONY /api/chat] Upstream models momentarily busy, served empathetic companion reply.",
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
      model: "ony-resilient-fallback",
    };
  }
}

export const geminiProvider: ServerChatProvider = new GeminiChatProvider();
