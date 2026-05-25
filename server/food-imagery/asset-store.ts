import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import { log } from "../logger.js";
import { generatedImagePublicPath, slugifyRecipeKey } from "../../shared/food-imagery/paths.js";
import type { FoodImageryJobStatus } from "../../shared/food-imagery/types.js";
import { getFoodImageryConfig } from "./config.js";

export interface SaveAssetInput {
  recipeKey: string;
  promptHash: string;
  promptText: string;
  buffer: Buffer;
  width: number;
  height: number;
  model: string;
  status?: FoodImageryJobStatus;
  validationNotes?: string;
}

export function ensureGeneratedStorageDir(): string {
  const cfg = getFoodImageryConfig();
  const dir = path.isAbsolute(cfg.storageDir)
    ? cfg.storageDir
    : path.join(process.cwd(), cfg.storageDir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function getDb(): Promise<SqliteDatabase> {
  return getSharedLocalDb();
}

export async function getLatestAssetForRecipe(recipeKey: string): Promise<{
  assetId: string;
  publicPath: string;
  version: number;
  promptHash: string;
} | null> {
  const row = (await getDb())
    .prepare(
      `SELECT asset_id, public_path, version, prompt_hash FROM food_imagery_assets
       WHERE recipe_key = ? AND status = 'succeeded'
       ORDER BY version DESC LIMIT 1`,
    )
    .get(recipeKey) as
    | { asset_id: string; public_path: string; version: number; prompt_hash: string }
    | undefined;
  if (!row) return null;
  return {
    assetId: row.asset_id,
    publicPath: row.public_path,
    version: row.version,
    promptHash: row.prompt_hash,
  };
}

export async function findAssetByPromptHash(
  recipeKey: string,
  promptHash: string,
): Promise<{ assetId: string; publicPath: string } | null> {
  const row = (await getDb())
    .prepare(
      `SELECT asset_id, public_path FROM food_imagery_assets
       WHERE recipe_key = ? AND prompt_hash = ? AND status = 'succeeded' LIMIT 1`,
    )
    .get(recipeKey, promptHash) as { asset_id: string; public_path: string } | undefined;
  if (!row) return null;
  return { assetId: row.asset_id, publicPath: row.public_path };
}

export async function getNextVersion(recipeKey: string): Promise<number> {
  const row = (await getDb())
    .prepare(`SELECT MAX(version) AS v FROM food_imagery_assets WHERE recipe_key = ?`)
    .get(recipeKey) as { v: number | null } | undefined;
  return (row?.v ?? 0) + 1;
}

export async function saveFoodImageryAsset(input: SaveAssetInput): Promise<{
  assetId: string;
  publicPath: string;
  absolutePath: string;
  version: number;
}> {
  const storageDir = ensureGeneratedStorageDir();
  const version = await getNextVersion(input.recipeKey);
  const publicPath = generatedImagePublicPath(slugifyRecipeKey(input.recipeKey), version);
  const filename = path.basename(publicPath);
  const absolutePath = path.join(storageDir, filename);

  fs.writeFileSync(absolutePath, input.buffer);

  const assetId = randomUUID();
  const database = await getDb();
  database
    .prepare(
      `INSERT INTO food_imagery_assets (
        asset_id, recipe_key, prompt_hash, prompt_text, public_path, file_path,
        version, width, height, bytes, model, status, validation_notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .run(
      assetId,
      input.recipeKey,
      input.promptHash,
      input.promptText.slice(0, 4000),
      publicPath,
      absolutePath,
      version,
      input.width,
      input.height,
      input.buffer.length,
      input.model,
      input.status ?? "succeeded",
      input.validationNotes ?? null,
    );

  log(`[food-imagery] saved ${publicPath} v${version} (${input.buffer.length}b)`, "catalog");
  return { assetId, publicPath, absolutePath, version };
}

/** Point an additional recipe key at an existing asset file (no duplicate bytes on disk). */
export async function duplicateAssetAlias(
  sourceRecipeKey: string,
  aliasRecipeKey: string,
): Promise<void> {
  const source = await getLatestAssetForRecipe(sourceRecipeKey);
  if (!source) return;

  const database = await getDb();
  const row = database
    .prepare(
      `SELECT asset_id, prompt_hash, prompt_text, public_path, file_path, width, height, bytes, model, validation_notes
       FROM food_imagery_assets WHERE recipe_key = ? AND status = 'succeeded' ORDER BY version DESC LIMIT 1`,
    )
    .get(sourceRecipeKey) as Record<string, unknown> | undefined;
  if (!row) return;

  const version = await getNextVersion(aliasRecipeKey);
  const { randomUUID } = await import("node:crypto");
  database
    .prepare(
      `INSERT INTO food_imagery_assets (
        asset_id, recipe_key, prompt_hash, prompt_text, public_path, file_path,
        version, width, height, bytes, model, status, validation_notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'succeeded', ?, datetime('now'))`,
    )
    .run(
      randomUUID(),
      aliasRecipeKey,
      String(row.prompt_hash),
      String(row.prompt_text),
      String(row.public_path),
      String(row.file_path),
      version,
      Number(row.width) || 0,
      Number(row.height) || 0,
      Number(row.bytes) || 0,
      String(row.model),
      row.validation_notes != null ? String(row.validation_notes) : null,
    );
}

export async function upsertFoodImageryJob(
  jobId: string,
  recipeKey: string,
  promptHash: string,
  status: FoodImageryJobStatus,
  patch: { attempts?: number; lastError?: string; assetId?: string } = {},
): Promise<void> {
  const database = await getDb();
  const existing = database.prepare(`SELECT job_id FROM food_imagery_jobs WHERE job_id = ?`).get(jobId);
  if (!existing) {
    database
      .prepare(
        `INSERT INTO food_imagery_jobs (job_id, recipe_key, prompt_hash, status, attempts, last_error, asset_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        jobId,
        recipeKey,
        promptHash,
        status,
        patch.attempts ?? 0,
        patch.lastError ?? null,
        patch.assetId ?? null,
      );
    return;
  }
  database
    .prepare(
      `UPDATE food_imagery_jobs SET status = ?, attempts = COALESCE(?, attempts),
       last_error = COALESCE(?, last_error), asset_id = COALESCE(?, asset_id),
       updated_at = datetime('now') WHERE job_id = ?`,
    )
    .run(status, patch.attempts ?? null, patch.lastError ?? null, patch.assetId ?? null, jobId);
}
