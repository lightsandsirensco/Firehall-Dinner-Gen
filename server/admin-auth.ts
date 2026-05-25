import type { Request, Response, NextFunction } from "express";

/**
 * Protects /api/admin/* — requires ADMIN_SECRET on the server.
 * Clients must send header `x-admin-key` or query `key` (prefer header).
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
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
