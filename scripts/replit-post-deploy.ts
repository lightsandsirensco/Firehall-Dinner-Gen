#!/usr/bin/env tsx
/**
 * Post-deploy prep for Replit: migrations, hall-classic heroes, optional imagery backfill.
 *
 *   npx tsx scripts/replit-post-deploy.ts
 *   npx tsx scripts/replit-post-deploy.ts --imagery   # requires OPENAI + FOOD_IMAGERY_ENABLED
 */
import "dotenv/config";
import { runDbMigrations } from "../server/db/migrate.js";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { flushSqliteToDisk } from "../server/sqlite.js";
import { getFoodImageryConfig } from "../server/food-imagery/config.js";
import { execSync } from "node:child_process";

const runImagery = process.argv.includes("--imagery");

async function main(): Promise<void> {
  console.log("[replit-post-deploy] migrations…");
  const mig = await runDbMigrations();
  console.log(`[replit-post-deploy] schema v${mig.current} (applied ${mig.applied} this run)`);

  await initCuratedRecipeStore();
  console.log("[replit-post-deploy] sync hall classics…");
  execSync("npx tsx scripts/sync-hall-classics-curated.ts", { stdio: "inherit" });
  execSync("npx tsx scripts/fix-localhost-hero-urls.ts", { stdio: "inherit" });

  const cfg = getFoodImageryConfig();
  if (runImagery && cfg.enabled) {
    console.log("[replit-post-deploy] imagery backfill (pizza + classics slugs)…");
    try {
      execSync("npm run imagery:generate:pizza", { stdio: "inherit" });
    } catch {
      console.warn("[replit-post-deploy] pizza imagery partial/failed — check OpenAI connectivity");
    }
    try {
      execSync(
        "npx tsx scripts/generate-food-imagery.ts chicken-parm pulled-pork chicken-caesar beef-dip steak-sandwiches --sync",
        { stdio: "inherit" },
      );
    } catch {
      console.warn("[replit-post-deploy] classic imagery partial/failed");
    }
  } else if (runImagery) {
    console.warn(
      "[replit-post-deploy] skip imagery — set FOOD_IMAGERY_ENABLED=true and OPENAI_API_KEY in Replit Secrets",
    );
  }

  flushSqliteToDisk();
  console.log("[replit-post-deploy] done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
