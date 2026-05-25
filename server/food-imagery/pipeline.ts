import { randomUUID } from "node:crypto";
import type { FoodImageryContext } from "../../shared/food-imagery/types.js";
import { buildPromptForContext } from "./prompt-resolve.js";
import { log } from "../logger.js";
import { generateFoodImageBuffer, hashPrompt } from "./generator.js";
import { getFoodImageryConfig } from "./config.js";
import {
  findAssetByPromptHash,
  getLatestAssetForRecipe,
  saveFoodImageryAsset,
  upsertFoodImageryJob,
} from "./asset-store.js";
import { validateGeneratedFoodImage, validateImageBufferHeuristic } from "./validate-output.js";
import { shouldGenerateFoodImagery } from "./policy.js";
import { attachGeneratedHeroBySlug, attachGeneratedHeroToCurated } from "./attach-hero.js";
import { duplicateAssetAlias } from "./asset-store.js";
import { mealImageryKeyFromId } from "./context-builders.js";
import { readPngDimensions } from "./png-dimensions.js";

export interface GenerateFoodImageryResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  publicPath?: string;
  assetId?: string;
  jobId?: string;
  cached?: boolean;
}

function pngOrJpegDimensions(buf: Buffer): { width: number; height: number } {
  const png = readPngDimensions(buf);
  if (png) return png;
  return { width: 1024, height: 1024 };
}

export async function generateFoodImageryForRecipe(
  ctx: FoodImageryContext,
  options: { force?: boolean; recipeId?: string; mealId?: string; sync?: boolean } = {},
): Promise<GenerateFoodImageryResult> {
  if (!shouldGenerateFoodImagery(ctx, options.force)) {
    return { ok: true, skipped: true, reason: "policy_skip" };
  }

  const cfg = getFoodImageryConfig();
  if (!cfg.enabled) {
    return { ok: false, skipped: true, reason: "disabled" };
  }

  const prompt = buildPromptForContext(ctx);
  const promptHash = hashPrompt(prompt);

  const cached = await findAssetByPromptHash(ctx.recipeKey, promptHash);
  if (cached) {
    await attachHero(ctx, cached.publicPath, options.recipeId);
    return {
      ok: true,
      publicPath: cached.publicPath,
      assetId: cached.assetId,
      cached: true,
    };
  }

  const jobId = randomUUID();
  await upsertFoodImageryJob(jobId, ctx.recipeKey, promptHash, "running", { attempts: 1 });

  let lastError = "";
  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      const buf = await generateFoodImageBuffer(prompt);
      const heuristic = validateImageBufferHeuristic(buf);
      if (!heuristic.ok) {
        lastError = heuristic.reason || "heuristic_fail";
        continue;
      }

      const vision = await validateGeneratedFoodImage(buf, ctx);
      if (!vision.ok) {
        lastError = vision.reason || "vision_fail";
        continue;
      }

      const dims = pngOrJpegDimensions(buf);
      const saved = await saveFoodImageryAsset({
        recipeKey: ctx.recipeKey,
        promptHash,
        promptText: prompt,
        buffer: buf,
        width: dims.width,
        height: dims.height,
        model: cfg.model,
        validationNotes: vision.notes,
      });

      await upsertFoodImageryJob(jobId, ctx.recipeKey, promptHash, "succeeded", {
        assetId: saved.assetId,
      });

      await attachHero(ctx, saved.publicPath, options.recipeId);

      if (options.mealId) {
        await duplicateAssetAlias(ctx.recipeKey, mealImageryKeyFromId(options.mealId));
      }
      if (ctx.signatureKey && ctx.signatureKey !== ctx.recipeKey) {
        await duplicateAssetAlias(ctx.recipeKey, ctx.signatureKey);
      }

      return {
        ok: true,
        publicPath: saved.publicPath,
        assetId: saved.assetId,
        jobId,
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      log(`[food-imagery] attempt ${attempt + 1} failed ${ctx.recipeKey}: ${lastError}`, "catalog");
    }
  }

  await upsertFoodImageryJob(jobId, ctx.recipeKey, promptHash, "failed", {
    attempts: cfg.maxRetries + 1,
    lastError,
  });
  return { ok: false, reason: lastError, jobId };
}

async function attachHero(
  ctx: FoodImageryContext,
  publicPath: string,
  recipeId?: string,
): Promise<void> {
  const alt = ctx.displayTitle || ctx.title;
  const slug = ctx.recipeKey.replace(/^curated:/, "");
  if (slug && !/^spoonacular:\d+$/i.test(slug)) {
    await attachGeneratedHeroBySlug(slug, publicPath, alt);
  }
  if (recipeId) {
    await attachGeneratedHeroToCurated(recipeId, publicPath, alt);
  }
}

/** Non-blocking enqueue — returns existing or job id. */
export async function ensureFoodImageryQueued(
  ctx: FoodImageryContext,
  options: { force?: boolean; recipeId?: string; mealId?: string } = {},
): Promise<GenerateFoodImageryResult> {
  if (!shouldGenerateFoodImagery(ctx, options.force)) {
    return { ok: true, skipped: true, reason: "policy_skip" };
  }

  const latest = await getLatestAssetForRecipe(ctx.recipeKey);
  if (latest && !options.force) {
    return { ok: true, publicPath: latest.publicPath, cached: true };
  }

  const { enqueueFoodImageryJob } = await import("./queue.js");
  const jobId = await enqueueFoodImageryJob(ctx, {
    force: options.force,
    recipeId: options.recipeId,
    mealId: options.mealId,
  });
  return { ok: true, jobId, reason: "queued" };
}
