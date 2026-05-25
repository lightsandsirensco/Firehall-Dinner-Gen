import type { ClientRecipeResponse, PizzaResponse } from "../../shared/schema.js";
import { log } from "../logger.js";
import { getLatestAssetForRecipe, getLatestJobForRecipe } from "./asset-store.js";
import { getFoodImageryConfig } from "./config.js";
import { shouldGenerateFoodImagery } from "./policy.js";
import { ensureFoodImageryQueued, generateFoodImageryForRecipe } from "./pipeline.js";
import {
  foodImageryContextFromGenerateResponse,
  foodImageryContextFromPizza,
  mealImageryKeyFromId,
  mealImageryKeyFromSignature,
  pizzaImageryKey,
} from "./context-builders.js";
import { buildPizzaFoodImageryPrompt } from "../../shared/food-imagery/pizza-prompt-builder.js";
import { getPizzaConceptMeta } from "../../shared/pizza-concepts.js";
import { buildFoodImageryPrompt } from "../../shared/food-imagery/prompt-builder.js";
import { hashPrompt } from "./generator.js";
import { resolveEditorialFallbackHero } from "../../shared/meal-hero-fallback.js";

export type HeroImageStatus = "ready" | "pending" | "unavailable";

export interface ResolvedHeroImage {
  hero_image?: string;
  hero_image_alt?: string;
  hero_image_status: HeroImageStatus;
  hero_image_source?: "generated" | "editorial_fallback";
}

async function firstHeroFromKeys(keys: string[]): Promise<string | null> {
  for (const key of keys) {
    const asset = await getLatestAssetForRecipe(key);
    if (asset?.publicPath) return asset.publicPath;
  }
  return null;
}

function fallbackHero(
  title?: string,
  mealFormat?: string,
  protein?: string,
): ResolvedHeroImage | null {
  const path = resolveEditorialFallbackHero(title || "", { mealFormat, protein });
  if (!path) return null;
  return {
    hero_image: path,
    hero_image_alt: title ? `${title} — Firehall Meals` : "Firehall meal",
    hero_image_status: "ready",
    hero_image_source: "editorial_fallback",
  };
}

async function latestJobFailed(keys: string[]): Promise<boolean> {
  for (const key of keys) {
    const job = await getLatestJobForRecipe(key);
    if (job?.status === "failed") return true;
  }
  return false;
}

export async function resolveMealHeroImage(
  signature?: string,
  recipeId?: string,
  title?: string,
  opts?: { mealFormat?: string; protein?: string },
): Promise<ResolvedHeroImage> {
  const keys: string[] = [];
  if (recipeId) keys.push(mealImageryKeyFromId(recipeId));
  if (signature) keys.push(mealImageryKeyFromSignature(signature));

  const path = await firstHeroFromKeys(keys);
  if (path) {
    return {
      hero_image: path,
      hero_image_alt: title ? `${title} — Firehall Meals` : "Firehall meal",
      hero_image_status: "ready",
      hero_image_source: "generated",
    };
  }

  const cfg = getFoodImageryConfig();
  const fb = fallbackHero(title, opts?.mealFormat, opts?.protein);

  if (!cfg.enabled) {
    return fb ?? { hero_image_status: "unavailable" };
  }

  if (await latestJobFailed(keys)) {
    return (
      fb ?? {
        hero_image_status: "unavailable",
      }
    );
  }

  return { hero_image_status: "pending" };
}

export async function resolvePizzaHeroImage(
  styleId: string,
  title?: string,
): Promise<ResolvedHeroImage> {
  const path = await firstHeroFromKeys([pizzaImageryKey(styleId)]);
  if (path) {
    return {
      hero_image: path,
      hero_image_alt: title ? `${title} — Pizza Night` : "Firehall pizza",
      hero_image_status: "ready",
      hero_image_source: "generated",
    };
  }

  const cfg = getFoodImageryConfig();
  if (!cfg.enabled) {
    return { hero_image_status: "unavailable" };
  }

  const job = await getLatestJobForRecipe(pizzaImageryKey(styleId));
  if (job?.status === "failed") {
    return { hero_image_status: "unavailable" };
  }

  return { hero_image_status: "pending" };
}

/** Attach cached hero fields to API payload (sync, non-blocking). */
export async function enrichClientRecipeWithHero(
  client: Record<string, unknown>,
  signature?: string,
): Promise<Record<string, unknown>> {
  const recipeId = String(client._id || "");
  const title = String(client.title || "");
  const mealFormat = String(client.meal_style || client.meal_format || "");
  const protein = String(client.chosen_protein || "");
  const hero = await resolveMealHeroImage(signature, recipeId || undefined, title, {
    mealFormat,
    protein,
  });
  const out: Record<string, unknown> = { ...client, ...hero };
  if (signature) out._signature = signature;
  return out;
}

export async function enrichPizzaWithHero(recipe: PizzaResponse): Promise<PizzaResponse> {
  const hero = await resolvePizzaHeroImage(recipe.pizza_style_id, recipe.title);
  return { ...recipe, ...hero };
}

/** Queue async generation after meal normalize — does not block response. */
export function queueMealHeroAfterGenerate(
  recipe: import("../../shared/schema.js").GenerateResponse,
  recipeId: string,
  signature: string,
): void {
  const ctx = foodImageryContextFromGenerateResponse(recipe, recipeId, signature);
  if (!shouldGenerateFoodImagery(ctx)) return;

  void (async () => {
    try {
      await ensureFoodImageryQueued(ctx, { mealId: recipeId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`[food-imagery] meal queue failed: ${msg}`, "catalog");
    }
  })();
}

/** Queue pizza hero by style id (shared across same concept). */
export function queuePizzaHeroAfterGenerate(recipe: PizzaResponse): void {
  const ctx = foodImageryContextFromPizza(recipe);
  if (!ctx || !shouldGenerateFoodImagery(ctx)) return;

  void ensureFoodImageryQueued(ctx).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[food-imagery] pizza queue failed: ${msg}`, "catalog");
  });
}

/** Sync generate for CLI / admin only. */
export async function generatePizzaHeroSync(
  styleId: string,
  title?: string,
  force = false,
): Promise<ResolvedHeroImage> {
  const meta = getPizzaConceptMeta(styleId);
  if (!meta) return { hero_image_status: "unavailable" };
  const ctx = foodImageryContextFromPizza({
    pizza_style_id: styleId,
    title: title || meta.title,
  } as PizzaResponse);
  if (!ctx) return { hero_image_status: "unavailable" };

  const result = await generateFoodImageryForRecipe(ctx, { force });
  if (result.ok && result.publicPath) {
    return {
      hero_image: result.publicPath,
      hero_image_alt: `${title || meta.title} — Pizza Night`,
      hero_image_status: "ready",
      hero_image_source: "generated",
    };
  }
  return { hero_image_status: "unavailable" };
}

export function mealPromptPreview(signature: string, title: string): { prompt: string; hash: string } {
  const ctx: import("../../shared/food-imagery/types.js").FoodImageryContext = {
    recipeKey: mealImageryKeyFromSignature(signature),
    title,
    mealFormat: "plated_main",
    protein: "mixed",
  };
  const prompt = buildFoodImageryPrompt(ctx);
  return { prompt, hash: hashPrompt(prompt) };
}

export function pizzaPromptPreview(styleId: string): { prompt: string; hash: string } | null {
  const meta = getPizzaConceptMeta(styleId);
  if (!meta) return null;
  const prompt = buildPizzaFoodImageryPrompt(meta);
  return { prompt, hash: hashPrompt(prompt) };
}
