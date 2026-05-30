#!/usr/bin/env tsx
/**
 * Stage 5 — startup health check (local + production bundle prerequisites).
 */
import fs from "fs";
import path from "path";
import { wasmPath } from "../server/sqlite.js";
import { runStartupBootstrap } from "../server/startup/bootstrap.js";
import { initCacheStore } from "../server/cache-store.js";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { initRecipeCatalog } from "../server/recipe-catalog.js";
import { initIngestionStore } from "../server/ingestion/ingestion-store.js";
import { initHallVoteTables } from "../server/hall-vote-store.js";
import { initRecipeCrewRatingsStore } from "../server/recipe-crew-ratings/store.js";
import { releaseSqliteTimersForTests } from "../server/sqlite.js";

const distPublic = path.join(process.cwd(), "dist", "public", "index.html");

async function main(): Promise<void> {
  const checks: { name: string; ok: boolean; detail?: string }[] = [];

  checks.push({
    name: "sql.js wasm",
    ok: fs.existsSync(wasmPath()),
    detail: wasmPath(),
  });

  const diag = await runStartupBootstrap({
    initCacheStore,
    initCuratedRecipeStore,
    initRecipeCatalog,
    initIngestionStore,
    initHallVoteTables,
    initRecipeCrewRatingsStore,
  });

  checks.push({ name: "startup bootstrap", ok: diag.ok });
  checks.push({ name: "cache store", ok: diag.stores.cache === "ok" });
  checks.push({ name: "curated store", ok: diag.stores.curated === "ok" });

  if (fs.existsSync(distPublic)) {
    checks.push({ name: "production client build", ok: true, detail: distPublic });
  } else {
    checks.push({
      name: "production client build",
      ok: process.env.NODE_ENV !== "production",
      detail: "Run npm run build before production deploy",
    });
  }

  releaseSqliteTimersForTests();

  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }

  if (failed.length > 0) {
    console.error(`\n[stage5-startup-health] ${failed.length} check(s) failed`);
    process.exit(1);
  }
  console.log("\n[stage5-startup-health] OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
