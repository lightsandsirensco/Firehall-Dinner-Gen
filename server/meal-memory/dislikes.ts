/**
 * "Not for us" — per-user catalog meals that are never auto-picked by Pick
 * Tonight or the Shift Planner. Free for every signed-in user. Explore and
 * direct recipe links are unaffected. User id always comes from the session.
 */
import type { Express, Response } from "express";
import { z } from "zod";
import { pgAll, pgRun } from "../db/pg-sql.js";
import { requireCsrf } from "../csrf.js";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import { isApprovedCatalogSlug, normalizeCatalogSlug } from "../../shared/hall-catalog/gate.js";
import { getApprovedCatalog } from "../approved-catalog-cache.js";
import { approvedCatalogRecipePath } from "../../shared/approved-catalog.js";
import { resolveCatalogSlug } from "../../shared/catalog-slug-redirects.js";
import { log, logError } from "../logger.js";
import type { RecipeDislike } from "../../shared/meal-memory/types.js";

/** Generous cap — the list is a personal blocklist, not a second catalog. */
export const MAX_DISLIKES = 200;

export async function listDislikedSlugs(userId: string): Promise<Set<string>> {
  const rows = await pgAll<{ recipe_slug: string }>(
    `SELECT recipe_slug FROM user_recipe_dislikes WHERE user_id = $1`,
    [userId],
  );
  return new Set(rows.map((r) => resolveCatalogSlug(r.recipe_slug)));
}

/**
 * For the pickers: never throws. A failed read means no exclusions this
 * request, which only ever widens the pool — it can't hide a meal wrongly.
 */
export async function loadDislikedSlugsForPicking(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  try {
    return await listDislikedSlugs(userId);
  } catch (err) {
    log(`[meal-memory] dislikes load failed: ${(err as Error)?.message}`, "generate");
    return new Set();
  }
}

export async function listDislikes(userId: string): Promise<RecipeDislike[]> {
  const rows = await pgAll<{ recipe_slug: string; created_at: Date }>(
    `SELECT recipe_slug, created_at FROM user_recipe_dislikes WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  const bySlug = new Map(getApprovedCatalog().recipes.map((r) => [r.slug, r]));
  return rows.map((row) => {
    const entry = bySlug.get(resolveCatalogSlug(row.recipe_slug));
    return {
      slug: row.recipe_slug,
      title: entry?.title ?? row.recipe_slug,
      imageUrl: entry?.thumbImage ?? null,
      path: approvedCatalogRecipePath(resolveCatalogSlug(row.recipe_slug)),
      createdAt: new Date(row.created_at).toISOString(),
    };
  });
}

export class DislikeLimitError extends Error {}

export async function addDislike(userId: string, slug: string): Promise<void> {
  const count = await pgAll<{ n: string }>(`SELECT COUNT(*) AS n FROM user_recipe_dislikes WHERE user_id = $1`, [userId]);
  if (Number(count[0]?.n ?? 0) >= MAX_DISLIKES) throw new DislikeLimitError();
  await pgRun(
    `INSERT INTO user_recipe_dislikes (user_id, recipe_slug) VALUES ($1, $2) ON CONFLICT (user_id, recipe_slug) DO NOTHING`,
    [userId, slug],
  );
}

export async function removeDislike(userId: string, slug: string): Promise<void> {
  await pgRun(`DELETE FROM user_recipe_dislikes WHERE user_id = $1 AND recipe_slug = $2`, [userId, slug]);
}

const slugBody = z.object({ slug: z.string().trim().min(2).max(120) });

function catalogSlugOrNull(raw: unknown): string | null {
  const slug = resolveCatalogSlug(normalizeCatalogSlug(typeof raw === "string" ? raw : ""));
  return slug && isApprovedCatalogSlug(slug) ? slug : null;
}

export function registerRecipeDislikeRoutes(app: Express): void {
  app.get("/api/recipe-dislikes", requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      return res.json({ dislikes: await listDislikes(req._authUserId!) });
    } catch (err) {
      logError("meal-memory", "list dislikes failed", err);
      return res.status(500).json({ message: "Couldn't load your hidden meals" });
    }
  });

  app.post("/api/recipe-dislikes", requireAuth, requireCsrf, async (req: AuthedRequest, res: Response) => {
    const parsed = slugBody.safeParse(req.body);
    const slug = parsed.success ? catalogSlugOrNull(parsed.data.slug) : null;
    if (!slug) return res.status(400).json({ message: "That recipe isn't in the catalog" });
    try {
      await addDislike(req._authUserId!, slug);
      return res.json({ ok: true, slug });
    } catch (err) {
      if (err instanceof DislikeLimitError) {
        return res.status(409).json({ message: `You can hide up to ${MAX_DISLIKES} meals. Unhide some in your profile first.` });
      }
      logError("meal-memory", "add dislike failed", err);
      return res.status(500).json({ message: "Couldn't save that" });
    }
  });

  app.delete("/api/recipe-dislikes/:slug", requireAuth, requireCsrf, async (req: AuthedRequest, res: Response) => {
    const slug = normalizeCatalogSlug(String(req.params.slug ?? ""));
    if (!slug) return res.status(400).json({ message: "Missing recipe" });
    try {
      await removeDislike(req._authUserId!, slug);
      return res.json({ ok: true, slug });
    } catch (err) {
      logError("meal-memory", "remove dislike failed", err);
      return res.status(500).json({ message: "Couldn't undo that" });
    }
  });
}
