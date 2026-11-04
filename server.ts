import express, { type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  geminiProvider,
  ProviderGenerationError,
} from "./src/server/geminiProvider.ts";
import {
  verifyAuthToken,
  type AuthenticatedRequest,
} from "./src/server/authMiddleware.ts";
import { buildOnySystemInstruction } from "./src/server/onyPrompt.ts";
import { evaluateMarketplaceRecommendations } from "./src/server/marketplaceMatcher.ts";
import { generateDynamicOnyReply } from "./src/server/onyCompanionEngine.ts";
import type {
  AIConversationRequest,
  AIConversationResponse,
  AIServiceErrorPayload,
  PersonaId,
  SafetyAction,
} from "./src/services/contracts.ts";
import {
  translateCommunityContent,
  transcribeSupportiveVoice,
} from "./src/server/communityAIEngine.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Filter benign gRPC idle stream disconnection messages from logging as errors
const origConsoleError = console.error;
console.error = (...args: any[]) => {
  const msg = args.map((a) => (typeof a === "string" ? a : a?.message || String(a))).join(" ");
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

// Simple in-memory per-IP rate limiter (20 requests per 60 seconds)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const ipRequestTimestamps = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (ipRequestTimestamps.get(ip) || []).filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRequestTimestamps.set(ip, recent);
    return true;
  }
  recent.push(now);
  ipRequestTimestamps.set(ip, recent);
  return false;
}

// Deterministic application-level safety evaluation (never rely solely on the LLM for crisis detection)
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
  // Prevent Nginx proxy_intercept_errors from replacing API JSON with warmup.html
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

async function startServer() {
  const app = express();

  const portArgIdx = process.argv.indexOf("--port");
  const cliPort = portArgIdx !== -1 && process.argv[portArgIdx + 1] ? parseInt(process.argv[portArgIdx + 1], 10) : undefined;
  const hostArgIdx = process.argv.indexOf("--host");
  const host = hostArgIdx !== -1 && process.argv[hostArgIdx + 1] ? process.argv[hostArgIdx + 1] : "0.0.0.0";

  const isDev = process.env.NODE_ENV !== "production";
  const primaryPort = cliPort || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

  app.disable("x-powered-by");

  app.use(express.json({ limit: "10mb" }));

  // Handle oversized JSON payloads cleanly
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
      status: "ok",
      provider: geminiProvider.providerName,
      configured: geminiProvider.isConfigured(),
      model: geminiProvider.getModel(),
    });
  });

  app.post("/api/system-logs", (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ received: true });
  });

  // Community supportive message & post translation endpoint
  app.post("/api/community/translate", async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const { text, title, body, targetLanguage, sourceLanguage } = req.body || {};
    if (!text && !title && !body) {
      return res.status(400).json({ error: "Missing text, title, or body parameter" });
    }
    const validLanguages = ["English", "Bahasa Melayu", "中文"];
    const target = validLanguages.includes(targetLanguage) ? targetLanguage : "English";

    try {
      const result = await translateCommunityContent({
        text: typeof text === "string" ? text : undefined,
        title: typeof title === "string" ? title : undefined,
        body: typeof body === "string" ? body : undefined,
        targetLanguage: target,
        sourceLanguage,
      });
      return res.json(result);
    } catch (err: unknown) {
      console.warn("[ONY /api/community/translate] Error:", err);
      return res.json({
        translatedText: text,
        translatedTitle: title,
        translatedBody: body,
        provider: "fallback",
      });
    }
  });

  // Community supportive voice transcription endpoint
  app.post("/api/community/transcribe", async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const { audioDataUrl, audioDuration, existingCaption } = req.body || {};

    try {
      const result = await transcribeSupportiveVoice({
        audioDataUrl,
        audioDuration: typeof audioDuration === "number" ? audioDuration : undefined,
        existingCaption: typeof existingCaption === "string" ? existingCaption : undefined,
      });
      return res.json(result);
    } catch (err: unknown) {
      console.warn("[ONY /api/community/transcribe] Error:", err);
      return res.json({
        transcript:
          "Just wanted to leave you a quick reminder that you are doing so well. Be gentle with your thoughts and take it one moment at a time 🌱",
      });
    }
  });

  app.get("/api/auth/verify", verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    if (!req.user) {
      return res.status(401).json({ authenticated: false });
    }
    return res.json({ authenticated: true, user: req.user });
  });

  app.post("/api/chat", verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
    res.setHeader("Cache-Control", "no-store");

    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    if (isRateLimited(clientIp)) {
      return sendStructuredError(
        res,
        429,
        "RATE_LIMITED",
        "You’ve sent several messages quickly. Please pause for a moment and try again.",
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

    if (!geminiProvider.isConfigured()) {
      console.info("[ONY /api/chat] GEMINI_API_KEY is not configured in server environment.");
      return sendStructuredError(
        res,
        503,
        "MISSING_API_KEY",
        "ONY’s AI service is not connected yet because GEMINI_API_KEY is not set in the server environment.",
        safetyAction,
      );
    }

    const validPersonas: PersonaId[] = ["gentle", "friendly", "calm"];
    const persona: PersonaId =
      typeof body.persona === "string" && validPersonas.includes(body.persona as PersonaId)
        ? (body.persona as PersonaId)
        : "gentle";

    const validLanguages = ["English", "Bahasa Melayu", "中文"];
    const language =
      typeof body.language === "string" && validLanguages.includes(body.language)
        ? body.language
        : "English";

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

    try {
      const result = await geminiProvider.generateReply({
        message: rawMessage,
        history: sanitizedHistory,
        systemInstruction,
        language,
        persona,
        memories: approvedMemories,
      });

      const { vouchers: recommendedVouchers, copingActivity } =
        await evaluateMarketplaceRecommendations({
          userMessage: rawMessage,
          recentHistory: sanitizedHistory,
          safetyAction,
          memories: approvedMemories,
          language,
        });

      const responsePayload: AIConversationResponse = {
        message: result.reply,
        safetyAction,
        citedResourceIds,
        model: result.model,
        recommendedVoucher: recommendedVouchers[0] || null,
        recommendedVouchers,
        copingActivity: copingActivity || null,
      };

      return res.json(responsePayload);
    } catch (err: unknown) {
      // For crisis / urgent safety messages, NEVER fail silently or withhold crisis resources
      if (safetyAction === "urgent_safety_flow") {
        console.warn("[ONY /api/chat] Crisis safety flow triggered during upstream interruption; returning protective crisis response.");
        const crisisFallback =
          language === "Bahasa Melayu"
            ? "Saya faham awak sedang mengalami waktu yang amat sukar sekarang. Keselamatan awak sangat berharga dan penting. Sila hubungi Talian HEAL di 15555 atau Befrienders KL di 03-7627 2929 sekarang juga."
            : language === "中文"
              ? "我能深切感受到您现在经历的艰难与痛苦。您的生命安全最重要，请立即拨打 HEAL 热线 15555 或吉隆坡心灵扶助会 03-7627 2929。"
              : "I hear that you're going through a very heavy and overwhelming time right now. Your safety matters deeply. Please reach out to the HEAL Crisis Line at 15555 or Befrienders KL at 03-7627 2929 right away.";

        const responsePayload: AIConversationResponse = {
          message: crisisFallback,
          safetyAction: "urgent_safety_flow",
          citedResourceIds,
          model: "ony-safety-protective",
          recommendedVoucher: null,
          recommendedVouchers: [],
          copingActivity: null,
        };
        return res.json(responsePayload);
      }

      if (err instanceof ProviderGenerationError && !err.isRetryable) {
        return sendStructuredError(
          res,
          err.status,
          err.code,
          err.message,
          safetyAction,
          false,
        );
      }

      console.warn("[ONY /api/chat] Upstream service momentarily busy, seamlessly serving empathetic companion response.");
      const fallbackReply = generateDynamicOnyReply({
        userMessage: rawMessage,
        history: sanitizedHistory,
        language,
        persona,
        memories: approvedMemories,
      });

      const { vouchers: fallbackVouchers, copingActivity: fallbackActivity } =
        await evaluateMarketplaceRecommendations({
          userMessage: rawMessage,
          recentHistory: sanitizedHistory,
          safetyAction,
          memories: approvedMemories,
          language,
        });

      return res.json({
        message: fallbackReply,
        safetyAction,
        citedResourceIds,
        model: "ony-resilient-companion",
        recommendedVoucher: fallbackVouchers[0] || null,
        recommendedVouchers: fallbackVouchers,
        copingActivity: fallbackActivity || null,
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(primaryPort, host, () => {
    console.log(`ONY server running on http://${host}:${primaryPort}`);
  });

  if (primaryPort !== 3000) {
    try {
      app.listen(3000, host, () => {
        console.log(`ONY server also listening on http://${host}:3000`);
      });
    } catch {
      // Graceful fallback if port already in use
    }
  }
}

startServer().catch((error) => {
  console.error("Failed to start ONY server:", error);
  process.exit(1);
});
