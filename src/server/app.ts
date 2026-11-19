import express, { type Request, type Response } from "express";
import {
  geminiProvider,
  ProviderGenerationError,
} from "./geminiProvider.ts";
import {
  verifyAuthToken,
  requireAuth,
  type AuthenticatedRequest,
} from "./authMiddleware.ts";
import { buildOnySystemInstruction } from "./onyPrompt.ts";
import { evaluateMarketplaceRecommendations } from "./marketplaceMatcher.ts";
import type {
  AIConversationRequest,
  AIConversationResponse,
  AIServiceErrorPayload,
  PersonaId,
  SafetyAction,
} from "../services/contracts.ts";
import {
  buildContextualSuggestions,
  parseAiSuggestionsFromReply,
} from "../services/chatSuggestions.ts";
import {
  CommunityAIError,
  translateCommunityContent,
  transcribeSupportiveVoice,
} from "./communityAIEngine.ts";

const origConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const msg = args
    .map((a) => (typeof a === "string" ? a : (a as { message?: string })?.message || String(a)))
    .join(" ");
  if (
    msg.includes("Disconnecting idle stream") ||
    msg.includes("Timed out waiting for new targets")
  ) {
    return;
  }
  origConsoleError(...args);
};

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_MESSAGES = 10;
const MAX_MEMORY_ITEMS = 5;
const MAX_MEMORY_CHARS = 240;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const requestTimestamps = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (requestTimestamps.get(key) || []).filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestTimestamps.set(key, recent);
    return true;
  }
  recent.push(now);
  requestTimestamps.set(key, recent);
  return false;
}

const URGENT_SAFETY_PATTERNS = [
  /\bhurt myself\b/i,
  /\bself[- ]?harm\b/i,
  /\bsuicid(e|al)\b/i,
  /\bend my life\b/i,
  /\bkill myself\b/i,
  /\bdon'?t want to live\b/i,
  /\bi want to die\b/i,
  /\bnot safe with myself\b/i,
  /\bbunuh diri\b/i,
  /\bcederakan diri\b/i,
  /\btak nak hidup\b/i,
  /自杀/,
  /自殺/,
  /伤害自己/,
  /傷害自己/,
  /不想活/,
];

const HUMAN_SUPPORT_PATTERNS = [
  /\bprofessional support\b/i,
  /\bfind a therapist\b/i,
  /\bfind a counsellor\b/i,
  /\bsee a psychologist\b/i,
  /\bhopaless\b/i,
  /\bhopeless\b/i,
  /\bcan'?t cope anymore\b/i,
];

function evaluateSafetyAction(message: string): {
  safetyAction: SafetyAction;
  citedResourceIds: string[];
} {
  const normalized = message.trim();
  if (URGENT_SAFETY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      safetyAction: "urgent_safety_flow",
      citedResourceIds: ["heal_15555", "befrienders_kl", "hkl_psychiatry"],
    };
  }
  if (HUMAN_SUPPORT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      safetyAction: "offer_human_support",
      citedResourceIds: ["heal_15555", "befrienders_kl"],
    };
  }
  return {
    safetyAction: "support",
    citedResourceIds: [],
  };
}

function sendStructuredError(
  res: Response,
  status: number,
  code: AIServiceErrorPayload["error"]["code"],
  message: string,
  safetyAction?: SafetyAction,
  isRetryable = false,
  retryAfterSeconds?: number,
) {
  const safeStatus = status === 502 || status === 503 || status === 504 ? 500 : status;
  const payload: AIServiceErrorPayload = {
    error: {
      code,
      message,
      ...(safetyAction ? { safetyAction } : {}),
      ...(isRetryable ? { isRetryable } : {}),
      ...(typeof retryAfterSeconds === "number" ? { retryAfterSeconds } : {}),
    },
  };
  return res.status(safeStatus).json(payload);
}

export function createApiApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "10mb" }));

  app.use((err: Error & { type?: string; status?: number }, _req: Request, res: Response, next: express.NextFunction) => {
    if (err && (err.type === "entity.too.large" || err.status === 413)) {
      return sendStructuredError(
        res,
        413,
        "PAYLOAD_TOO_LARGE",
        "The request payload is too large. Please shorten your message and try again.",
      );
    }
    if (err instanceof SyntaxError) {
      return sendStructuredError(res, 400, "INVALID_REQUEST", "Malformed JSON request body.");
    }
    return next(err);
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({
      ok: true,
      geminiKeyConfigured: geminiProvider.isConfigured(),
      model: geminiProvider.getModel(),
    });
  });

  app.get("/api/auth/verify", verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    if (!req.user) {
      return res.status(401).json({ authenticated: false });
    }
    return res.json({ authenticated: true, user: req.user });
  });

  app.post(
    "/api/community/translate",
    verifyAuthToken,
    requireAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      res.setHeader("Cache-Control", "no-store");
      const rateKey = `translate:${req.user?.uid || req.ip || "unknown"}`;
      if (isRateLimited(rateKey)) {
        return sendStructuredError(
          res,
          429,
          "RATE_LIMITED",
          "Too many translation requests right now. Please wait a moment.",
          undefined,
          true,
          15,
        );
      }

      const { text, title, body, targetLanguage, sourceLanguage } = req.body || {};
      if (!text && !title && !body) {
        return res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Missing text, title, or body parameter." } });
      }
      const validLanguages = ["English", "Bahasa Melayu", "中文"];
      const target = validLanguages.includes(targetLanguage) ? targetLanguage : "English";

      try {
        const result = await translateCommunityContent({
          text: typeof text === "string" ? text : undefined,
          title: typeof title === "string" ? title : undefined,
          body: typeof body === "string" ? body : undefined,
          targetLanguage: target,
          sourceLanguage: typeof sourceLanguage === "string" ? sourceLanguage : undefined,
        });
        return res.json(result);
      } catch (err: unknown) {
        if (err instanceof CommunityAIError) {
          return res.status(err.status === 503 ? 500 : err.status).json({
            error: { code: err.code, message: err.message },
          });
        }
        console.warn("[ONY /api/community/translate] Error:", err);
        return res.status(500).json({
          error: {
            code: "UPSTREAM_ERROR",
            message: "Unable to translate content right now. Please try again later.",
          },
        });
      }
    },
  );

  app.post(
    "/api/community/transcribe",
    verifyAuthToken,
    requireAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      res.setHeader("Cache-Control", "no-store");
      const rateKey = `transcribe:${req.user?.uid || req.ip || "unknown"}`;
      if (isRateLimited(rateKey)) {
        return sendStructuredError(
          res,
          429,
          "RATE_LIMITED",
          "Too many transcription requests right now. Please wait a moment.",
          undefined,
          true,
          15,
        );
      }

      const { audioDataUrl, audioUrl, audioDuration, existingCaption } = req.body || {};
      const resolvedAudioInput =
        typeof audioDataUrl === "string" && audioDataUrl.trim()
          ? audioDataUrl
          : typeof audioUrl === "string" && audioUrl.trim()
            ? audioUrl
            : undefined;

      try {
        const result = await transcribeSupportiveVoice({
          audioDataUrl: resolvedAudioInput,
          audioDuration: typeof audioDuration === "number" ? audioDuration : undefined,
          existingCaption: typeof existingCaption === "string" ? existingCaption : undefined,
        });
        return res.json(result);
      } catch (err: unknown) {
        if (err instanceof CommunityAIError) {
          return res.status(err.status === 503 ? 500 : err.status).json({
            error: { code: err.code, message: err.message },
          });
        }
        console.warn("[ONY /api/community/transcribe] Error:", err);
        return res.status(500).json({
          error: {
            code: "UPSTREAM_ERROR",
            message: "Unable to transcribe audio right now. Please try again later.",
          },
        });
      }
    },
  );

  app.post(
    "/api/chat",
    verifyAuthToken,
    requireAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      res.setHeader("Cache-Control", "no-store");

      const rateKey = `chat:${req.user?.uid || req.ip || "unknown"}`;
      if (isRateLimited(rateKey)) {
        return sendStructuredError(
          res,
          429,
          "RATE_LIMITED",
          "You've sent several messages quickly. Please pause for a moment and try again.",
          undefined,
          true,
          15,
        );
      }

      const body = req.body as Partial<AIConversationRequest> | undefined;
      if (!body || typeof body !== "object") {
        return sendStructuredError(res, 400, "INVALID_REQUEST", "Invalid request body.");
      }

      const rawMessage = typeof body.message === "string" ? body.message.trim() : "";
      if (!rawMessage) {
        return sendStructuredError(res, 400, "INVALID_REQUEST", "Please enter a message before sending.");
      }
      if (rawMessage.length > MAX_MESSAGE_CHARS) {
        return sendStructuredError(
          res,
          400,
          "PAYLOAD_TOO_LARGE",
          `Message exceeds the maximum length of ${MAX_MESSAGE_CHARS} characters.`,
        );
      }

      const { safetyAction, citedResourceIds } = evaluateSafetyAction(rawMessage);

      const validLanguages = ["English", "Bahasa Melayu", "中文"];
      const language =
        typeof body.language === "string" && validLanguages.includes(body.language)
          ? body.language
          : "English";

      if (!geminiProvider.isConfigured()) {
        if (safetyAction === "urgent_safety_flow") {
          return res.json(buildProtectiveCrisisResponse(language, citedResourceIds));
        }
        return sendStructuredError(
          res,
          503,
          "MISSING_API_KEY",
          "ONY's AI service is not connected yet because GEMINI_API_KEY is not set in the server environment.",
          safetyAction,
        );
      }

      const validPersonas: PersonaId[] = ["gentle", "friendly", "calm"];
      const persona: PersonaId =
        typeof body.persona === "string" && validPersonas.includes(body.persona as PersonaId)
          ? (body.persona as PersonaId)
          : "gentle";

      const validStyles = ["Reflective", "Practical", "A mix"];
      const conversationStyle =
        typeof body.conversationStyle === "string" && validStyles.includes(body.conversationStyle)
          ? body.conversationStyle
          : "Reflective";

      const validLengths = ["Short", "Balanced", "Detailed"];
      const responseLength =
        typeof body.responseLength === "string" && validLengths.includes(body.responseLength)
          ? body.responseLength
          : "Balanced";

      const rawMemories = Array.isArray(body.approvedContext?.memories)
        ? body.approvedContext.memories
        : [];
      const approvedMemories = rawMemories
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .slice(0, MAX_MEMORY_ITEMS)
        .map((item) => item.trim().slice(0, MAX_MEMORY_CHARS));

      const rawHistory = Array.isArray(body.history) ? body.history : [];
      const sanitizedHistory = rawHistory
        .filter(
          (turn): turn is { role: "user" | "assistant"; content: string } =>
            Boolean(turn) &&
            (turn.role === "user" || turn.role === "assistant") &&
            typeof turn.content === "string" &&
            turn.content.trim().length > 0,
        )
        .slice(-MAX_HISTORY_MESSAGES)
        .map((turn) => ({
          role: turn.role,
          content: turn.content.trim().slice(0, MAX_MESSAGE_CHARS),
        }));

      const systemInstruction = buildOnySystemInstruction({
        persona,
        language,
        conversationStyle,
        responseLength,
        memories: approvedMemories,
        safetyAction,
      });

      const recentSuggestionIds = Array.isArray(body.recentSuggestionIds)
        ? body.recentSuggestionIds.filter((id): id is string => typeof id === "string").slice(0, 10)
        : [];

      try {
        const result = await geminiProvider.generateReply({
          message: rawMessage,
          history: sanitizedHistory,
          systemInstruction,
          language,
          persona,
          memories: approvedMemories,
        });

        const { cleanReply, aiSuggestions } = parseAiSuggestionsFromReply(result.reply);
        const finalReply = cleanReply || result.reply;

        const suggestions = buildContextualSuggestions({
          replyText: finalReply,
          userMessage: rawMessage,
          aiSuggestions,
          recentShownIds: recentSuggestionIds,
          memories: approvedMemories,
          language,
          safetyAction,
          maxCount: 3,
        });

        const { vouchers: recommendedVouchers, copingActivity } =
          await evaluateMarketplaceRecommendations({
            userMessage: rawMessage,
            recentHistory: sanitizedHistory,
            safetyAction,
            memories: approvedMemories,
            language,
            idToken: req.idToken,
          });

        const responsePayload: AIConversationResponse = {
          message: finalReply,
          safetyAction,
          citedResourceIds,
          model: result.model,
          recommendedVoucher: recommendedVouchers[0] || null,
          recommendedVouchers,
          copingActivity: copingActivity || null,
          suggestions,
        };

        return res.json(responsePayload);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("[ONY /api/chat] Gemini request failed:", errorMessage);

        // Preserve deterministic protective crisis hotline response in emergencies
        if (safetyAction === "urgent_safety_flow") {
          return res.json(buildProtectiveCrisisResponse(language, citedResourceIds));
        }

        if (err instanceof ProviderGenerationError) {
          return sendStructuredError(
            res,
            err.status,
            err.code,
            err.message,
            safetyAction,
            err.isRetryable,
            err.retryAfterSeconds,
          );
        }

        return sendStructuredError(
          res,
          500,
          "UPSTREAM_ERROR",
          "ONY's AI companion could not respond right now. Please tap Retry in a moment.",
          safetyAction,
          true,
        );
      }
    },
  );

  return app;
}

function buildProtectiveCrisisResponse(
  language: string,
  citedResourceIds: string[],
): AIConversationResponse {
  const crisisFallback =
    language === "Bahasa Melayu"
      ? "Saya faham awak sedang mengalami waktu yang amat sukar sekarang. Keselamatan awak sangat berharga dan penting.\n\n**Kecemasan:** 999\n**Talian HEAL:** 15555 (8:00 pagi – 12:00 tengah malam setiap hari)\n**Befrienders KL:** 03-7627 2929 (24 jam)"
      : language === "中文"
        ? "我能深切感受到您现在经历的艰难与痛苦。您的生命安全最重要。\n\n**紧急求救:** 999\n**Talian HEAL:** 15555 (每天 8:00 AM – 12:00 AM)\n**Befrienders KL (吉隆坡爱心线):** 03-7627 2929 (24 小时)"
        : "I hear that you're going through a very heavy and overwhelming time right now. Your safety matters deeply.\n\n**Emergency:** 999\n**Talian HEAL:** 15555 (8:00 AM – 12:00 AM daily)\n**Befrienders KL:** 03-7627 2929 (24 hours)";

  return {
    message: crisisFallback,
    safetyAction: "urgent_safety_flow",
    citedResourceIds,
    model: "ony-safety-protective",
    recommendedVoucher: null,
    recommendedVouchers: [],
    copingActivity: null,
  };
}
