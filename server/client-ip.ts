import type { Express, Request } from "express";

/**
 * Trust proxy only when explicitly configured (or 1 hop in production).
 * Avoids honoring spoofed X-Forwarded-For when running without a reverse proxy.
 */
export function configureTrustProxy(app: Express): void {
  const raw = process.env.TRUST_PROXY_HOPS?.trim();
  if (raw === "false" || raw === "0") {
    app.set("trust proxy", false);
    return;
  }
  if (raw) {
    const hops = parseInt(raw, 10);
    app.set("trust proxy", Number.isFinite(hops) && hops > 0 ? hops : false);
    return;
  }
  app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : false);
}

/** Client IP for rate limits — uses Express-trusted req.ip when proxy is configured. */
export function getClientIp(req: Request): string {
  if (req.ip) return req.ip;
  return req.socket.remoteAddress || "unknown";
}
