#!/usr/bin/env tsx
/**
 * Smoke test: generator pipeline must only return curated 150 hits.
 */

import { runLocalFirstGeneratePipeline } from "../server/generation/local-first-pipeline.js";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { buildGenerateRequestInput } from "../shared/generate-request-defaults.js";

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  const base = buildGenerateRequestInput({
    crew_size: 8,
    protein: "any",
    time_available: "25-40",
    healthiness_preference: "balanced",
  });

  const seen = new Set<string>();
  for (let i = 0; i < 50; i++) {
    let hit;
    try {
      hit = await runLocalFirstGeneratePipeline({
        request: base,
        v2SessionKey: "smoke",
        varietySeed: i,
        recentSignatures: [],
        currentRecipeSignature: undefined,
        preferDifferentStyle: false,
        startTime: Date.now(),
      });
    } catch (e) {
      // Minimal debugging context: if this ever happens, the curated store isn't returning
      // tagged Golden/Performance rows in this runtime.
      const { listCuratedSummariesByTag } = await import("../server/curated-recipe-store.js");
      const { GOLDEN_SET_TAG } = await import("../shared/golden-100/types.js");
      const { PERFORMANCE_SET_TAG } = await import("../shared/performance-meals/types.js");
      const g = listCuratedSummariesByTag(GOLDEN_SET_TAG, 200);
      const p = listCuratedSummariesByTag(PERFORMANCE_SET_TAG, 200);
      throw new Error(
        `curated generator failed at i=${i} golden=${g.length} performance=${p.length} err=${(e as any)?.message || e}`,
      );
    }
    const src = String((hit.extras as any)?._source || "");
    if (src !== "curated_150") {
      throw new Error(`Non-curated source returned: ${src || "unknown"}`);
    }
    if (!hit.recipe?.title) throw new Error("Missing title");
    seen.add(hit.recipe.title);
  }

  console.log(`[smoke:curated-generator] OK — hits=${seen.size}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

