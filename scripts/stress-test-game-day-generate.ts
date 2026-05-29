#!/usr/bin/env tsx
/**
 * Stress test: 100+ curated-only generations with firehall_category=game_day.
 *
 * Usage:
 *   npm run test:game-day-stress
 */
import { initCacheStore } from "../server/cache-store.js";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { runLocalFirstGeneratePipeline } from "../server/generation/local-first-pipeline.js";
import { buildGenerateRequestInput } from "../shared/generate-request-defaults.js";
import { flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";

const RUNS = Math.max(100, parseInt(process.env.GAME_DAY_STRESS_RUNS || "100", 10) || 100);

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

await initCacheStore();
await initCuratedRecipeStore();

let ok = 0;
let broadened = 0;
const failures: string[] = [];
const start = Date.now();

for (let i = 0; i < RUNS; i++) {
  const request = {
    ...buildGenerateRequestInput({ protein: i % 2 === 0 ? "chicken" : "beef" }),
    firehall_category: "game_day" as const,
    time_available: (["25-40", "30-45", "45-60", "60-90"] as const)[i % 4],
  };

  try {
    const hit = await runLocalFirstGeneratePipeline({
      request,
      v2SessionKey: `stress:game_day:${i}`,
      varietySeed: i,
      recentSignatures: [],
      recentSlugs: [],
      preferDifferentStyle: false,
      startTime: Date.now(),
    });

    assert(Boolean(hit.recipe.title?.trim()), `run ${i}: missing title`);
    assert(Array.isArray(hit.recipe.steps) && hit.recipe.steps.length > 0, `run ${i}: missing steps`);
    assert(Boolean(hit.extras._slug), `run ${i}: missing slug metadata`);

    if (hit.extras._fallback) broadened++;
    ok++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    failures.push(`run ${i}: ${msg}`);
  }
}

const ms = Date.now() - start;

console.log(`[stress:game-day] runs=${RUNS} ok=${ok} broadened=${broadened} fail=${failures.length} ms=${ms}`);

if (failures.length > 0) {
  console.error(failures.slice(0, 10).join("\n"));
  process.exit(1);
}

assert(ok >= RUNS, `expected ${RUNS} successes, got ${ok}`);
console.log("[stress:game-day] OK");

flushSqliteToDisk();
releaseSqliteTimersForTests();
process.exit(0);
