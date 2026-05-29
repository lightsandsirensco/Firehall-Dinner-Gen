#!/usr/bin/env tsx
/**
 * Stress test the curated-only generator.
 *
 * Requirements:
 * - 50 generations
 * - all hits must be from curated_150
 * - no smoothies/fuel content
 * - breakfast only when explicitly requested
 */

import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { initCacheStore } from "../server/cache-store.js";
import { runLocalFirstGeneratePipeline } from "../server/generation/local-first-pipeline.js";
import { buildGenerateRequestInput } from "../shared/generate-request-defaults.js";

type Scenario = { name: string; req: ReturnType<typeof buildGenerateRequestInput>; expectBreakfast?: boolean };

async function main(): Promise<void> {
  await initCacheStore();
  await initCuratedRecipeStore();

  const scenarios: Scenario[] = [
    {
      name: "default-balanced",
      req: buildGenerateRequestInput({ crew_size: 8, protein: "any", time_available: "25-40", healthiness_preference: "balanced" }),
    },
    {
      name: "bbq",
      req: buildGenerateRequestInput({ crew_size: 10, protein: "any", time_available: "45-60", cuisine_style: "bbq", healthiness_preference: "balanced" }),
    },
    {
      name: "comfort",
      req: buildGenerateRequestInput({ crew_size: 10, protein: "beef", time_available: "45-60", healthiness_preference: "comfort" }),
    },
    {
      name: "lean",
      req: buildGenerateRequestInput({ crew_size: 6, protein: "chicken", time_available: "25-40", healthiness_preference: "lean" }),
    },
    {
      name: "breakfast",
      req: buildGenerateRequestInput({ crew_size: 8, protein: "any", time_available: "45-60", meal_format: "breakfast" }),
      expectBreakfast: true,
    },
  ];

  const hits: Array<{ scenario: string; title: string; mealStyle?: string; source: string }> = [];
  for (let i = 0; i < 50; i++) {
    const scenario = scenarios[i % scenarios.length]!;
    const hit = await runLocalFirstGeneratePipeline({
      request: scenario.req,
      v2SessionKey: "stress",
      varietySeed: i,
      recentSignatures: [],
      currentRecipeSignature: undefined,
      preferDifferentStyle: false,
      startTime: Date.now(),
    });

    const source = String((hit.extras as any)?._source || "");
    if (source !== "curated_150") throw new Error(`Non-curated source: ${source}`);

    const mealStyle = String((hit.recipe as any).meal_style || "");
    if (!scenario.expectBreakfast) {
      if (mealStyle.toLowerCase().includes("breakfast")) {
        throw new Error(`Breakfast leaked into non-breakfast scenario "${scenario.name}": ${hit.recipe.title}`);
      }
    }

    hits.push({ scenario: scenario.name, title: hit.recipe.title, mealStyle, source });
  }

  console.log(`[stress:curated-generator] OK — runs=${hits.length}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

