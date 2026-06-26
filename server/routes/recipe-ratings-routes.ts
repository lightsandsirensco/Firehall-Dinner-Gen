import type { Express, Request, Response } from "express";
import { getApprovedCatalog } from "../approved-catalog-cache.js";
import { castCrewRatingVoteSchema } from "../../shared/recipe-crew-ratings/schema.js";
import { EMPTY_RECIPE_CREW_RATING_COLLECTIONS } from "../../shared/recipe-crew-ratings/types.js";
import {
  getRecipeCrewRatingPublicView,
  castRecipeCrewRatingVote,
  hashCrewRatingFingerprint,
  getRecipeCrewRatingCollectionsForCatalog,
  getRecipeCrewRatingAnalytics,
  getRatingSortMap,
  getTopRatedRecipes,
} from "../recipe-crew-ratings/store.js";
import { checkRateLimit, hashIp } from "../cache-store";
import { requireCsrf } from "../csrf.js";
import { getClientIp } from "../client-ip.js";
import { logError } from "../logger";
import { routeParam } from "./param.js";

export function registerRecipeRatingsRoutes(app: Express): void {
  app.get("/api/recipe-ratings/collections", (_req: Request, res: Response) => {
    try {
      const catalog = getApprovedCatalog();
      const collections = getRecipeCrewRatingCollectionsForCatalog(
        catalog.recipes.map((r) => ({ slug: r.slug, category: r.category })),
      );
      return res.json(collections);
    } catch (error: unknown) {
      logError("crew-rating", "collections failed", error);
      return res.json(EMPTY_RECIPE_CREW_RATING_COLLECTIONS);
    }
  });

  app.get("/api/recipe-ratings/top-rated", (req: Request, res: Response) => {
    try {
      const limitRaw = typeof req.query.limit === "string" ? Number.parseInt(req.query.limit, 10) : 48;
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 48;
      return res.json({ recipes: getTopRatedRecipes(limit) });
    } catch (error: unknown) {
      logError("crew-rating", "top-rated failed", error);
      return res.json({ recipes: [] });
    }
  });

  app.get("/api/recipe-ratings/sort-map", (_req: Request, res: Response) => {
    try {
      const map = getRatingSortMap();
      const slugs: Record<string, { approvalScore: number | null; totalVotes: number; trendingScore: number }> = {};
      for (const [slug, v] of map.entries()) {
        slugs[slug] = v;
      }
      return res.json({ slugs });
    } catch (error: unknown) {
      logError("crew-rating", "sort-map failed", error);
      return res.status(500).json({ message: "Failed to load sort map" });
    }
  });

  app.get("/api/recipe-ratings/:slug", (req: Request, res: Response) => {
    try {
      const slug = routeParam(req.params.slug);
      const category = typeof req.query.category === "string" ? req.query.category : undefined;
      const clientIp = getClientIp(req);
      const ua = req.headers["user-agent"] || "";
      const fingerprint = hashCrewRatingFingerprint(clientIp, ua);
      const view = getRecipeCrewRatingPublicView(slug, { fingerprint, category });
      return res.json(view);
    } catch (error: unknown) {
      logError("crew-rating", "get failed", error);
      return res.status(500).json({ message: "Failed to load crew rating" });
    }
  });

  app.post("/api/recipe-ratings/:slug/vote", requireCsrf, (req: Request, res: Response) => {
    try {
      const slug = routeParam(req.params.slug);
      const parsed = castCrewRatingVoteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid vote payload" });
      }
      const clientIp = getClientIp(req);
      const ua = req.headers["user-agent"] || "";
      const ipHash = hashIp(clientIp);
      const voteLimit = checkRateLimit(`crew-rating:${ipHash}`, 60 * 60 * 1000, 40);
      if (!voteLimit.allowed) {
        return res.status(429).json({ message: "Too many ratings — try again later." });
      }
      const fingerprint = hashCrewRatingFingerprint(clientIp, ua);
      const sessionId = (req as { _sessionId?: string })._sessionId || "";
      const result = castRecipeCrewRatingVote(slug, parsed.data, fingerprint, sessionId);
      if (!result.ok) {
        return res.status(result.status).json({ message: result.error });
      }
      return res.json(result.view);
    } catch (error: unknown) {
      logError("crew-rating", "vote failed", error);
      return res.status(500).json({ message: "Failed to record vote" });
    }
  });

  app.get("/api/admin/recipe-ratings/analytics", (_req: Request, res: Response) => {
    try {
      const catalog = getApprovedCatalog();
      const analytics = getRecipeCrewRatingAnalytics(
        catalog.recipes.map((r) => ({ slug: r.slug, category: r.category })),
      );
      return res.json(analytics);
    } catch (error: unknown) {
      logError("crew-rating", "analytics failed", error);
      return res.status(500).json({ message: "Failed to load analytics" });
    }
  });
}
