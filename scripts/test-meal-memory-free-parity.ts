#!/usr/bin/env tsx
/**
 * Meal Memory guard: Free / signed-out picks must be identical before and after
 * the Meal Memory changes for the same inputs and variety seed.
 *
 *   npx tsx scripts/test-meal-memory-free-parity.ts --write   # capture baseline (run on pre-change code)
 *   npx tsx scripts/test-meal-memory-free-parity.ts           # compare against baseline
 */
import fs from "node:fs";
import path from "node:path";
import { initCacheStore } from "../server/cache-store.js";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { runLocalFirstGeneratePipeline } from "../server/generation/local-first-pipeline.js";
import { tonightStandaloneMealSlugs } from "../server/generation/tonight-eligibility.js";
import { buildGenerateRequestInput } from "../shared/generate-request-defaults.js";
import { releaseSqliteTimersForTests } from "../server/sqlite.js";

const BASELINE = path.join(process.cwd(), "scripts", "fixtures", "meal-memory-free-baseline.json");
const SEEDS = 20;

const COMBOS: Array<{ label: string; input: Record<string, unknown>; recentSlugs: string[] }> = [
  { label: "default", input: {}, recentSlugs: [] },
  { label: "chicken-30-45", input: { protein: "chicken", time_available: "30-45" }, recentSlugs: [] },
  { label: "beef-lean", input: { protein: "beef", healthiness_preference: "lean" }, recentSlugs: [] },
  { label: "vegetarian-diet", input: { dietary_restrictions: ["vegetarian"] }, recentSlugs: [] },
  { label: "crew-12-comfort", input: { crew_size: 12, healthiness_preference: "comfort" }, recentSlugs: [] },
  {
    label: "with-recent",
    input: {},
    recentSlugs: ["chicken-fajita-sheet-pan", "smash-burgers", "beef-chili", "chicken-alfredo-bake"],
  },
];

async function capture(): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const combo of COMBOS) {
    const picks: string[] = [];
    for (let i = 0; i < SEEDS; i++) {
      const request = buildGenerateRequestInput({
        crew_size: 8,
        time_available: "45-60",
        protein: "any",
        healthiness_preference: "balanced",
        ...combo.input,
      } as never);
      try {
        const hit = await runLocalFirstGeneratePipeline({
          request,
          v2SessionKey: `free-parity:${combo.label}:${i}`,
          varietySeed: 1000 + i * 7919,
          recentSignatures: [],
          recentSlugs: combo.recentSlugs,
          preferDifferentStyle: false,
          startTime: Date.now(),
          restrictToSlugs: tonightStandaloneMealSlugs(),
        });
        picks.push(String(hit.extras._slug ?? hit.originalTitle));
      } catch (err) {
        picks.push(`ERROR:${(err as Error).message.slice(0, 60)}`);
      }
    }
    out[combo.label] = picks;
  }
  return out;
}

initCacheStore();
await initCuratedRecipeStore();
const current = await capture();

if (process.argv.includes("--write")) {
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, JSON.stringify(current, null, 2) + "\n");
  console.log(`baseline written: ${Object.values(current).flat().length} picks`);
} else {
  const baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8")) as Record<string, string[]>;
  let diffs = 0;
  for (const [label, picks] of Object.entries(baseline)) {
    picks.forEach((slug, i) => {
      if (current[label]?.[i] !== slug) {
        diffs++;
        console.error(`FAIL ${label}[${i}]: baseline=${slug} now=${current[label]?.[i]}`);
      }
    });
  }
  const total = Object.values(baseline).flat().length;
  console.log(diffs === 0 ? `ok: ${total} Free picks identical to baseline` : `${diffs}/${total} Free picks changed`);
  if (diffs) process.exitCode = 1;
}
releaseSqliteTimersForTests();
process.exit(process.exitCode ?? 0);
