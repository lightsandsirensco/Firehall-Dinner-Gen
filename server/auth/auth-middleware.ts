import type { Request, Response, NextFunction } from "express";
import { getAuthCookieName, getUserIdFromSessionToken } from "./auth-store.js";

export interface AuthedRequest extends Request {
  _sessionId?: string;
  _authUserId?: string | null;
}

function readAuthToken(req: Request): string | undefined {
  const cookieName = getAuthCookieName();
  return req.cookies?.[cookieName] as string | undefined;
}

export function attachAuthUser(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const token = readAuthToken(req);
  req._authUserId = getUserIdFromSessionToken(token) ?? null;
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = readAuthToken(req);
  const userId = getUserIdFromSessionToken(token);
  if (!userId) {
    res.status(401).json({ message: "Sign in required" });
    return;
  }
  req._authUserId = userId;
  next();
}
