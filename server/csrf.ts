import type { Request, Response, NextFunction } from "express";

/** Double-submit CSRF check — requires csrf_token cookie + X-CSRF-Token header. */
export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  const csrfCookie = req.cookies?.csrf_token;
  const csrfHeader = req.headers["x-csrf-token"];
  const headerToken = typeof csrfHeader === "string" ? csrfHeader : Array.isArray(csrfHeader) ? csrfHeader[0] : "";

  if (!csrfCookie || !headerToken || csrfCookie !== headerToken) {
    res.status(403).json({
      message: "Invalid security token. Please refresh the page and try again.",
    });
    return;
  }

  next();
}
