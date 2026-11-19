import type { Request, Response, NextFunction } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { App } from "firebase-admin/app";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPaths = [
  path.resolve(__dirname, "../../firebase-applet-config.json"),
  path.resolve(process.cwd(), "firebase-applet-config.json"),
];

let appConfig: { projectId?: string } = {};
for (const p of configPaths) {
  if (fs.existsSync(p)) {
    try {
      appConfig = JSON.parse(fs.readFileSync(p, "utf8"));
      break;
    } catch {
      // ignore invalid config JSON
    }
  }
}

let adminApp: App | null = null;

async function ensureAdminInitialized(): Promise<App | null> {
  if (adminApp) return adminApp;
  const projectId = appConfig.projectId || process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    console.warn("[ONY Server] Missing Firebase projectId for ID token verification.");
    return null;
  }
  try {
    const { initializeApp, getApps } = await import("firebase-admin/app");
    const existing = getApps();
    if (existing.length > 0) {
      adminApp = existing[0];
      return adminApp;
    }
    adminApp = initializeApp({ projectId });
    return adminApp;
  } catch (err) {
    console.warn("[ONY Server] Firebase Admin initialization error:", err);
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
  idToken?: string;
}

export async function verifyAuthToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  req.user = undefined;
  req.idToken = undefined;

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return next();
  }

  const app = await ensureAdminInitialized();
  if (!app) {
    res.status(503).json({
      error: {
        code: "UPSTREAM_ERROR",
        message: "Authentication verification service is not ready on the server.",
      },
    });
    return;
  }

  try {
    const { getAuth } = await import("firebase-admin/auth");
    const auth = getAuth(app);
    const decodedToken = await auth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
    req.idToken = token;
    return next();
  } catch (error) {
    console.warn("[ONY Server] Token verification failed:", error);
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Your session has expired or is invalid. Please sign in again.",
      },
    });
    return;
  }
}

// Strict fail-closed authentication middleware
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user || !req.user.uid) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication is required to access this endpoint.",
      },
    });
    return;
  }
  next();
}
