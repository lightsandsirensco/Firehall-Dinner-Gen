import type { Request, Response, NextFunction } from "express";

/** True only for local `npm run dev` — production stays protected. */
export function isDevelopmentAdminBypass(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Golden 100 / unified catalog browsing tooling — readable in local dev
 * without ADMIN_SECRET. Production always requires auth for these paths.
 */
export function isGolden100DevAdminRoute(req: Request): boolean {
  const path = (req.originalUrl || req.url || "").split("?")[0];
  if (path.startsWith("/api/admin/golden-100")) return true;
  if (path.startsWith("/api/admin/curated-recipes")) return true;
  // /api/admin/catalog/manifest — the unified "All Recipes" admin view (see
  // server/admin/catalog-manifest.ts) is read-only catalog browsing, same
  // trust level as the Golden 100 routes above.
  if (path.startsWith("/api/admin/catalog")) return true;
  return false;
}

/**
 * Non-blocking version of the requireAdmin check — same header/query
 * comparison, but returns a boolean instead of responding. Used where admin
 * access is OPTIONAL (e.g. previewing a draft Shop product on its normal
 * public-facing route) rather than required for the whole route.
 */
export function isAdminRequest(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers["x-admin-key"];
  const query = req.query.key;
  const provided =
    (typeof header === "string" ? header : Array.isArray(header) ? header[0] : "") ||
    (typeof query === "string" ? query : "");
  return Boolean(provided) && provided === secret;
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

  if (!process.env.ADMIN_SECRET?.trim()) {
    res.status(503).json({
      message: "Admin API is disabled. Set ADMIN_SECRET in the server environment.",
    });
    return;
  }

  if (!isAdminRequest(req)) {
    res.status(403).json({ message: "Forbidden — admin only" });
    return;
  }

  next();
}
