import type { Express, Request, Response } from "express";
import { getClassicHallMeal } from "../../shared/classic-hall-meals.js";
import { getCuratedRecipeById } from "../curated-recipe-store.js";
import { getFoodImageryConfig } from "./config.js";
import { generateFoodImageryForRecipe, ensureFoodImageryQueued } from "./pipeline.js";
import { getFoodImageryQueueDepth } from "./queue.js";
import { getLatestAssetForRecipe } from "./asset-store.js";
import type { FoodImageryContext } from "../../shared/food-imagery/types.js";
import { getCuratedPackageDef } from "../../shared/curated-hall-packages.js";

function contextFromSlug(slug: string, force?: boolean): FoodImageryContext | null {
  const meta = getClassicHallMeal(slug);
  const pkg = getCuratedPackageDef(slug);
  if (!meta && !pkg) return null;

  return {
    recipeKey: slug,
    title: meta?.title || pkg?.title || slug,
    displayTitle: meta?.displayTitle || pkg?.displayTitle,
    summary: meta?.description || pkg?.whyItFits,
    cuisine: meta?.cuisine || pkg?.cuisineLabel,
    mealFormat: meta?.mealFormat || pkg?.mealFormat,
    protein: meta?.protein || pkg?.protein,
    ingredients: pkg?.ingredients?.map((i) => ({ name: i.name })),
    tags: meta?.tags || pkg?.tags,
    heroImage: meta ? undefined : pkg?.heroImage,
    pinnedHeroPath: meta?.heroImagePath,
    sourceKind: meta ? "hall_classic" : "curated",
  };
}

export function registerFoodImageryRoutes(app: Express): void {
  app.get("/api/admin/food-imagery/status", async (_req: Request, res: Response) => {
    const cfg = getFoodImageryConfig();
    res.json({
      enabled: cfg.enabled,
      model: cfg.model,
      queueDepth: getFoodImageryQueueDepth(),
      storageDir: cfg.storageDir,
    });
  });

  app.post("/api/admin/food-imagery/generate", async (req: Request, res: Response) => {
    const { slug, recipeId, force, sync } = req.body as {
      slug?: string;
      recipeId?: string;
      force?: boolean;
      sync?: boolean;
    };

    let ctx: FoodImageryContext | null = null;
    if (slug) ctx = contextFromSlug(slug, force);
    if (!ctx && recipeId) {
      const recipe = getCuratedRecipeById(recipeId);
      if (recipe) {
        ctx = {
          recipeKey: recipe.slug,
          title: recipe.title,
          summary: recipe.summary,
          cuisine: recipe.cuisine,
          mealFormat: recipe.mealFormat,
          protein: recipe.protein,
          heroImage: recipe.heroImage,
          sourceKind: recipe.source.kind,
        };
      }
    }

    if (!ctx) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    const result = sync
      ? await generateFoodImageryForRecipe(ctx, { force, recipeId })
      : await ensureFoodImageryQueued(ctx, { force, recipeId });

    return res.json(result);
  });

  app.get("/api/admin/food-imagery/asset/:recipeKey", async (req: Request, res: Response) => {
    const recipeKey = String(req.params.recipeKey ?? "");
    const asset = await getLatestAssetForRecipe(recipeKey);
    if (!asset) return res.status(404).json({ error: "No asset" });
    return res.json(asset);
  });
}
