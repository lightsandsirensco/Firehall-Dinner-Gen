import type { Express, Request, Response } from "express";
import { log } from "../logger.js";
import { getStartupDiagnostics } from "../startup/bootstrap.js";
import { getApprovedCatalogCacheStats } from "../approved-catalog-cache.js";

export function registerHealthRoutes(app: Express): void {
  app.get("/api/warm", (_req: Request, res: Response) => {
    log("Warm-up ping received", "perf");
    return res.json({ status: "warm", uptime: process.uptime() });
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    const diag = getStartupDiagnostics();
    const ok = diag?.ok !== false;
    res.status(ok ? 200 : 503).json({
      status: ok ? "healthy" : "degraded",
      uptime: process.uptime(),
      nodeEnv: process.env.NODE_ENV || "development",
      diagnostics: diag,
      catalogCache: getApprovedCatalogCacheStats(),
    });
  });

  app.get("/health", (_req: Request, res: Response) => {
    return res.json({ status: "ok", uptime: process.uptime() });
  });
}
