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
import type {
  AIConversationRequest,
  AIConversationResponse,
  AIServiceErrorPayload,
  PersonaId,
  SafetyAction,
} from "./src/services/contracts.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
) {
  // Prevent Nginx proxy_intercept_errors from replacing API JSON with warmup.html
  const safeStatus = status === 502 || status === 503 || status === 504 ? 500 : status;
  const payload: AIServiceErrorPayload = {
    error: {
      code,
      message,
      ...(safetyAction ? { safetyAction } : {}),
    },
  };
  return res.status(safeStatus).json(payload);
}

async function startServer() {
  const app = express();
  const port = parseInt(process.env.PORT || "3000", 10);

  app.disable("x-powered-by");

  app.use(express.json({ limit: "32kb" }));

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
      });

      const responsePayload: AIConversationResponse = {
        message: result.reply,
        safetyAction,
        citedResourceIds,
        model: result.model,
      };

      return res.json(responsePayload);
    } catch (err: unknown) {
      if (err instanceof ProviderGenerationError) {
        return sendStructuredError(
          res,
          err.status,
          err.code,
          err.message,
          safetyAction,
        );
      }

      return sendStructuredError(
        res,
        502,
        "UPSTREAM_ERROR",
        "ONY could not reach the Gemini AI service right now. Please try again shortly.",
        safetyAction,
      );
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(port, "0.0.0.0", () => {
    console.log(`ONY server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start ONY server:", error);
  process.exit(1);
});
