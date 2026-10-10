import type {
  AIConversationRequest,
  AIConversationResponse,
  AIService,
  AIServiceErrorPayload,
  SafetyAction,
} from "./contracts";

import { getCurrentIdToken } from "../firebase/auth";

const MAX_CLIENT_HISTORY_TURNS = 10;
const MAX_MESSAGE_LENGTH = 2000;
const CLIENT_TIMEOUT_MS = 30_000;

export class ChatServiceError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly safetyAction?: SafetyAction;

  constructor(message: string, code = "UPSTREAM_ERROR", status?: number, safetyAction?: SafetyAction) {
    super(message);
    this.name = "ChatServiceError";
    this.code = code;
    this.status = status;
    this.safetyAction = safetyAction;
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
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const errorBody = payload as AIServiceErrorPayload | null;
        const message =
          errorBody?.error?.message ||
          (response.status === 429
            ? "Too many messages sent recently. Please pause for a moment and try again."
            : response.status === 504
              ? "ONY took too long to respond. Please try again."
              : "ONY could not reach the AI service right now. Please try again.");
        const code = errorBody?.error?.code || "UPSTREAM_ERROR";
        const safetyAction = errorBody?.error?.safetyAction;
        throw new ChatServiceError(message, code, response.status, safetyAction);
      }

      const data = payload as AIConversationResponse | null;
      if (!data || typeof data.message !== "string" || !data.message.trim()) {
        throw new ChatServiceError(
          "ONY received an empty reply from the AI service. Please try again.",
          "UPSTREAM_ERROR",
          502,
        );
      }

      return {
        message: data.message.trim(),
        safetyAction: data.safetyAction || "support",
        citedResourceIds: Array.isArray(data.citedResourceIds) ? data.citedResourceIds : [],
        model: data.model,
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
