#!/usr/bin/env tsx
/**
 * Seed Golden 100 manifest into curated_recipes (Spoonacular + hall classics).
 *
 *   npx tsx scripts/seed-golden-100.ts --dry-run
 *   npx tsx scripts/seed-golden-100.ts --skip-existing
 *   npx tsx scripts/seed-golden-100.ts --only=smash-burgers,bbq-chicken-bowls
 */
import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";
import { upsertGoldenRecipe } from "../server/golden-100/upsert.js";
import { auditGolden100Dataset } from "../server/golden-100/audit.js";
import { flushSqliteToDisk } from "../server/sqlite.js";
import { applyDevInsecureTlsIfAllowed } from "./dev-tls.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipExisting = args.includes("--skip-existing");
const onlyArg = args.find((a) => a.startsWith("--only="));
const onlySlugs = onlyArg
  ? new Set(onlyArg.replace("--only=", "").split(",").map((s) => s.trim()).filter(Boolean))
  : null;

async function main(): Promise<void> {
  // Emergency global fallback only when explicitly enabled (dev only).
  applyDevInsecureTlsIfAllowed();

  if (!dryRun && !process.env.SPOONACULAR_API_KEY) {
    console.error("[golden-100] SPOONACULAR_API_KEY required (except --dry-run)");
    process.exit(1);
  }

  await initCuratedRecipeStore();

  let ok = 0;
  let skip = 0;
  let fail = 0;

  const recipes = onlySlugs
    ? GOLDEN_100_RECIPES.filter((r) => onlySlugs.has(r.slug))
    : GOLDEN_100_RECIPES;

  console.log(`[golden-100] Seeding ${recipes.length} recipes (dryRun=${dryRun})…`);

  for (let i = 0; i < recipes.length; i++) {
    const def = recipes[i]!;
    let result: { ok: boolean; reason?: string; recipeId?: string };
    try {
      result = await upsertGoldenRecipe(def, { dryRun, skipIfPublished: skipExisting });
    } catch (err: any) {
      fail++;
      const msg = err instanceof Error ? err.message : String(err ?? "unknown error");
      console.warn(`  ✗ ${def.slug}: exception=${msg}`);
      continue;
    }
    if (result.ok) {
      if (result.reason === "already_golden") skip++;
      else ok++;
      console.log(`  ✓ ${def.slug}${result.reason ? ` (${result.reason})` : ""}`);
    } else {
      fail++;
      console.warn(`  ✗ ${def.slug}: ${result.reason}`);
    }
    if (!dryRun && !def.classicSlug && i < recipes.length - 1) {
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  if (!dryRun) flushSqliteToDisk();

  const audit = auditGolden100Dataset();
  console.log(`\n[golden-100] done — ok=${ok} skip=${skip} fail=${fail}`);
  console.log(`[golden-100] db golden tag: ${audit.publishedGoldenCount} / ${audit.manifestCount} manifest`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
