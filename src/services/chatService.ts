import type {
  AIConversationRequest,
  AIConversationResponse,
  AIService,
  AIServiceErrorPayload,
  SafetyAction,
} from "./contracts";

import { getCurrentIdToken } from "../firebase/auth";
import { parseAiSuggestionsFromReply } from "./chatSuggestions";

const MAX_CLIENT_HISTORY_TURNS = 10;
const MAX_MESSAGE_LENGTH = 2000;
const CLIENT_TIMEOUT_MS = 30_000;

export class ChatServiceError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly safetyAction?: SafetyAction;
  readonly isRetryable: boolean;
  readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    code = "UPSTREAM_ERROR",
    status?: number,
    safetyAction?: SafetyAction,
    isRetryable = false,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ChatServiceError";
    this.code = code;
    this.status = status;
    this.safetyAction = safetyAction;
    this.isRetryable = isRetryable;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

class OnyBackendChatService implements AIService {
  async sendMessage(request: AIConversationRequest): Promise<AIConversationResponse> {
    const trimmedMessage = request.message.trim();
    if (!trimmedMessage) {
      throw new ChatServiceError("Please enter a message before sending.", "INVALID_REQUEST", 400);
    }
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      throw new ChatServiceError(
        `Your message is a bit too long (maximum ${MAX_MESSAGE_LENGTH} characters). Try shortening it slightly.`,
        "PAYLOAD_TOO_LARGE",
        400,
      );
    }

    const boundedHistory = request.history
      .filter((turn) => (turn.role === "user" || turn.role === "assistant") && Boolean(turn.content?.trim()))
      .slice(-MAX_CLIENT_HISTORY_TURNS)
      .map((turn) => ({
        role: turn.role,
        content: turn.content.trim().slice(0, MAX_MESSAGE_LENGTH),
      }));

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    try {
      const idToken = await getCurrentIdToken().catch(() => null);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (idToken) {
        headers.Authorization = `Bearer ${idToken}`;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...request,
          message: trimmedMessage,
          history: boundedHistory,
        }),
        signal: controller.signal,
      });

      let payload: unknown = null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
      }

      if (!response.ok) {
        const errorBody = payload as AIServiceErrorPayload | null;
        const message =
          errorBody?.error?.message ||
          (response.status === 429
            ? "Too many messages sent recently. Please pause for a moment and try again."
            : response.status === 504 || response.status === 408
              ? "ONY took too long to respond. Please tap Retry to try again."
              : "ONY is experiencing high demand right now. Please tap Retry in a moment.");
        const code = errorBody?.error?.code || "UPSTREAM_ERROR";
        const safetyAction = errorBody?.error?.safetyAction;
        const isRetryable =
          errorBody?.error?.isRetryable ??
          (response.status === 503 || response.status === 500 || response.status === 504 || response.status === 429);
        const retryAfterSeconds = errorBody?.error?.retryAfterSeconds;
        throw new ChatServiceError(message, code, response.status, safetyAction, isRetryable, retryAfterSeconds);
      }

      const data = payload as AIConversationResponse | null;
      const defaultWarmReply =
        request.language === "Bahasa Melayu"
          ? "Saya ada di sini mendengar luahan awak. Ambillah masa awak, bila dah rasa sedia boleh teruskan."
          : request.language === "中文"
            ? "我就在这静静陪着你，不用着急，等准备好了再慢慢跟我说。"
            : "I'm listening quietly. Take all the time you need, and share whenever you feel ready.";

      const rawText =
        data && typeof data.message === "string" && data.message.trim().length > 0
          ? data.message.trim()
          : defaultWarmReply;
      const { cleanReply } = parseAiSuggestionsFromReply(rawText);
      const messageText = cleanReply || rawText;

      const recommendedVouchers = Array.isArray(data?.recommendedVouchers)
        ? data.recommendedVouchers
        : data?.recommendedVoucher
          ? [data.recommendedVoucher]
          : [];

      return {
        message: messageText,
        safetyAction: data?.safetyAction || "support",
        citedResourceIds: Array.isArray(data?.citedResourceIds) ? data.citedResourceIds : [],
        model: data?.model || "gemini-3.1-flash-lite",
        recommendedVoucher: recommendedVouchers[0] || null,
        recommendedVouchers,
        copingActivity: data?.copingActivity || null,
        suggestions: Array.isArray(data?.suggestions) ? data.suggestions : undefined,
      };
    } catch (error) {
      if (error instanceof ChatServiceError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ChatServiceError(
          "ONY is taking longer than expected to respond. Please check your connection and try again.",
          "TIMEOUT",
          504,
        );
      }
      throw new ChatServiceError(
        "Unable to connect to ONY’s server right now. Please check your connection and try again.",
        "UPSTREAM_ERROR",
      );
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
}

export const chatService = new OnyBackendChatService();
