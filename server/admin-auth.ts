import type { Request, Response, NextFunction } from "express";

/** True only for local `npm run dev` — production stays protected. */
export function isDevelopmentAdminBypass(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Golden 100 catalog tooling — readable in local dev without ADMIN_SECRET.
 * Production always requires auth for these paths.
 */
export function isGolden100DevAdminRoute(req: Request): boolean {
  const path = (req.originalUrl || req.url || "").split("?")[0];
  if (path.startsWith("/api/admin/golden-100")) return true;
  if (path.startsWith("/api/admin/curated-recipes")) return true;
  return false;
}

/**
 * Protects /api/admin/* — requires ADMIN_SECRET on the server.
 * Clients must send header `x-admin-key` or query `key` (prefer header).
 *
 * In development, Golden 100 catalog routes skip auth (local tooling only).
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (isDevelopmentAdminBypass() && isGolden100DevAdminRoute(req)) {
    next();
    return;
  }

  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) {
    res.status(503).json({
      message: "Admin API is disabled. Set ADMIN_SECRET in the server environment.",
    });
    return;
  }

  const header = req.headers["x-admin-key"];
  const query = req.query.key;
  const provided =
    (typeof header === "string" ? header : Array.isArray(header) ? header[0] : "") ||
    (typeof query === "string" ? query : "");

  if (!provided || provided !== secret) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  next();
}
