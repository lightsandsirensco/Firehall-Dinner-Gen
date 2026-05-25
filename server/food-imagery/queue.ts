import { randomUUID } from "node:crypto";
import pLimit from "p-limit";
import { log } from "../logger.js";
import type { FoodImageryContext } from "../../shared/food-imagery/types.js";
import { getFoodImageryConfig } from "./config.js";
import { generateFoodImageryForRecipe } from "./pipeline.js";
import { upsertFoodImageryJob } from "./asset-store.js";
import { hashPrompt } from "./generator.js";
import { buildPromptForContext } from "./prompt-resolve.js";

const pending = new Map<string, Promise<unknown>>();

function limiter() {
  const cfg = getFoodImageryConfig();
  return pLimit(cfg.maxConcurrent);
}

let limit = limiter();

export function resetFoodImageryQueue(): void {
  limit = limiter();
}

export async function enqueueFoodImageryJob(
  ctx: FoodImageryContext,
  options: { force?: boolean; recipeId?: string; mealId?: string } = {},
): Promise<string> {
  const key = ctx.recipeKey;
  const existing = pending.get(key);
  if (existing) {
    await existing.catch(() => undefined);
    return key;
  }

  const jobId = randomUUID();
  const promptHash = hashPrompt(buildPromptForContext(ctx));
  await upsertFoodImageryJob(jobId, key, promptHash, "queued");

  const task = limit(async () => {
    try {
      await generateFoodImageryForRecipe(ctx, { ...options, sync: true, force: options.force });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`[food-imagery] queue error ${key}: ${msg}`, "catalog");
      await upsertFoodImageryJob(jobId, key, promptHash, "failed", { lastError: msg });
    } finally {
      pending.delete(key);
    }
  });

  pending.set(key, task);
  return jobId;
}

export function getFoodImageryQueueDepth(): number {
  return pending.size;
}
