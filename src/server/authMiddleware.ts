import type { Request, Response, NextFunction } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { App } from "firebase-admin/app";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, "../../firebase-applet-config.json");
const appConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Initialize Firebase Admin once
let adminApp: App | null = null;

async function ensureAdminInitialized(): Promise<App | null> {
  if (adminApp) return adminApp;
  try {
    const [{ initializeApp, getApps }] = await Promise.all([import("firebase-admin/app")]);
    const existing = getApps();
    if (existing.length > 0) {
      adminApp = existing[0];
      return adminApp;
    }
    adminApp = initializeApp({
      projectId: appConfig.projectId,
    });
    return adminApp;
  } catch (err) {
    console.warn("[ONY Server] Firebase Admin initialization note:", err);
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

export async function verifyAuthToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // If no token is provided, proceed without authenticated user (or return 401 if strict)
    req.user = undefined;
    return next();
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    req.user = undefined;
    return next();
  }

  const app = await ensureAdminInitialized();
  if (!app) {
    req.user = undefined;
    return next();
  }

  try {
    const { getAuth } = await import("firebase-admin/auth");
    const auth = getAuth(app);
    const decodedToken = await auth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
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

// Strict requirement middleware
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user || !req.user.uid) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "You must be logged in to perform this action.",
      },
    });
    return;
  }
  next();
}
