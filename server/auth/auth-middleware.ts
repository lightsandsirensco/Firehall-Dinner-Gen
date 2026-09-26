import type { Request, Response, NextFunction } from "express";
import {
  getAuthCookieName,
  getUserIdFromSessionToken,
} from "./auth-store.js";

export interface AuthedRequest extends Request {
  _sessionId?: string;
  _authUserId?: string | null;
}

function readAuthToken(req: Request): string | undefined {
  const cookieName = getAuthCookieName();
  return req.cookies?.[cookieName] as string | undefined;
}

function authCookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

export async function attachAuthUser(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = readAuthToken(req);
    const userId = await getUserIdFromSessionToken(token);
    if (userId && token) {
      res.cookie(getAuthCookieName(), token, authCookieOptions());
    }
    req._authUserId = userId ?? null;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = readAuthToken(req);
    const userId = await getUserIdFromSessionToken(token);
    if (!userId) {
      res.status(401).json({ message: "Sign in required" });
      return;
    }
    req._authUserId = userId;
    next();
  } catch (err) {
    next(err);
  }
}
