/**
 * Production startup bootstrap — env validation, store init, diagnostics, safe fallbacks.
 */

import fs from "fs";
import path from "path";
import { log, logError } from "../logger.js";
import { wasmPath } from "../sqlite.js";
import { loadProjectEnv } from "../lib/load-project-env.js";
import { hasOpenAIKey } from "../openai-client.js";

export interface StartupDiagnostics {
  ok: boolean;
  nodeEnv: string;
  cwd: string;
  distPublicExists: boolean;
  clientPublicExists: boolean;
  sqlWasmExists: boolean;
  openaiConfigured: boolean;
  spoonacularConfigured: boolean;
  foodImageryEnabled: boolean;
  stores: Record<string, "ok" | "degraded" | "failed">;
  warnings: string[];
  errors: string[];
  startedAt: string;
}

let lastDiagnostics: StartupDiagnostics | null = null;

export function getStartupDiagnostics(): StartupDiagnostics | null {
  return lastDiagnostics;
}

function validateEnvironment(): { warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!hasOpenAIKey()) {
    warnings.push("OPENAI_API_KEY missing — generation and imagery disabled");
  }

  if (process.env.NODE_ENV === "production") {
    const distPublic = path.join(process.cwd(), "dist", "public");
    if (!fs.existsSync(distPublic)) {
      errors.push(`Missing production client build: ${distPublic}`);
    }
    if (!fs.existsSync(wasmPath())) {
      errors.push(`Missing sql.js WASM: ${wasmPath()}`);
    }
  }

  return { warnings, errors };
}

async function initStoreSafe(
  name: string,
  fn: () => Promise<void>,
): Promise<"ok" | "degraded" | "failed"> {
  try {
    await fn();
    return "ok";
  } catch (err: unknown) {
    logError("startup", `Store init failed: ${name}`, err);
    return "failed";
  }
}

export interface BootstrapInitFns {
  initCacheStore: () => Promise<void>;
  initCuratedRecipeStore: () => Promise<void>;
  initRecipeCatalog: () => Promise<void>;
  initIngestionStore: () => Promise<void>;
  initHallVoteTables: () => Promise<void>;
  initRecipeCrewRatingsStore: () => Promise<void>;
}

/**
 * Run environment checks and initialize data stores with per-store isolation.
 * Critical failures (missing dist in prod) throw; non-critical stores degrade gracefully.
 */
export async function runStartupBootstrap(inits: BootstrapInitFns): Promise<StartupDiagnostics> {
  loadProjectEnv();
  const env = validateEnvironment();
  const stores: Record<string, "ok" | "degraded" | "failed"> = {};

  stores.cache = await initStoreSafe("cache", inits.initCacheStore);
  stores.curated = await initStoreSafe("curated", inits.initCuratedRecipeStore);
  stores.catalog = await initStoreSafe("catalog", inits.initRecipeCatalog);
  stores.ingestion = await initStoreSafe("ingestion", inits.initIngestionStore);
  stores.hallVote = await initStoreSafe("hallVote", inits.initHallVoteTables);
  stores.recipeCrewRatings = await initStoreSafe("recipeCrewRatings", inits.initRecipeCrewRatingsStore);

  const criticalFailed = stores.cache === "failed" || stores.curated === "failed";
  if (criticalFailed) {
    env.errors.push("Critical datastore failed to initialize");
  }

  if (env.errors.length > 0 && process.env.NODE_ENV === "production") {
    const diag: StartupDiagnostics = {
      ok: false,
      nodeEnv: process.env.NODE_ENV || "development",
      cwd: process.cwd(),
      distPublicExists: fs.existsSync(path.join(process.cwd(), "dist", "public")),
      clientPublicExists: fs.existsSync(path.join(process.cwd(), "client", "public")),
      sqlWasmExists: fs.existsSync(wasmPath()),
      openaiConfigured: hasOpenAIKey(),
      spoonacularConfigured: Boolean(process.env.SPOONACULAR_API_KEY?.trim()),
      foodImageryEnabled: process.env.FOOD_IMAGERY_ENABLED === "true",
      stores,
      warnings: env.warnings,
      errors: env.errors,
      startedAt: new Date().toISOString(),
    };
    lastDiagnostics = diag;
    throw new Error(`Startup validation failed: ${env.errors.join("; ")}`);
  }

  const diag: StartupDiagnostics = {
    ok: !criticalFailed,
    nodeEnv: process.env.NODE_ENV || "development",
    cwd: process.cwd(),
    distPublicExists: fs.existsSync(path.join(process.cwd(), "dist", "public")),
    clientPublicExists: fs.existsSync(path.join(process.cwd(), "client", "public")),
    sqlWasmExists: fs.existsSync(wasmPath()),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    spoonacularConfigured: Boolean(process.env.SPOONACULAR_API_KEY?.trim()),
    foodImageryEnabled: process.env.FOOD_IMAGERY_ENABLED === "true",
    stores,
    warnings: env.warnings,
    errors: env.errors,
    startedAt: new Date().toISOString(),
  };

  lastDiagnostics = diag;

  log(
    `[startup] ok=${diag.ok} env=${diag.nodeEnv} sqlWasm=${diag.sqlWasmExists} stores=${JSON.stringify(stores)}`,
    "system",
  );
  for (const w of diag.warnings) {
    log(`[startup] warning: ${w}`, "system");
  }

  return diag;
}
