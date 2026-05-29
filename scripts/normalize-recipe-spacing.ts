#!/usr/bin/env tsx
/**
 * Normalize punctuation spacing across the curated catalog + Golden 100 pages.
 * Writes before/after samples to review/spacing-normalization-examples.md
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { getCuratedRecipeById } from "../server/curated-recipe-store.js";
import { getSharedLocalDb, flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";
import {
  collectGenerateResponseCopy,
  detectRecipeSpacingIssues,
  normalizeGenerateResponseCopy,
  normalizeGoldenRecipePageCopy,
  normalizeRecipeSpacing,
} from "../shared/recipe/spacing.js";

interface ChangeSample {
  slug: string;
  field: string;
  before: string;
  after: string;
}

const MAX_SAMPLES = 40;
const samples: ChangeSample[] = [];

function track(slug: string, field: string, before: string, after: string): void {
  if (before === after || samples.length >= MAX_SAMPLES) return;
  samples.push({
    slug,
    field,
    before: before.length > 120 ? `${before.slice(0, 117)}...` : before,
    after: after.length > 120 ? `${after.slice(0, 117)}...` : after,
  });
}

function safeJsonParse(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function normalizeCatalog(): Promise<{
  recipes: number;
  summaryUpdates: number;
  notesUpdates: number;
  stepUpdates: number;
  generateUpdates: number;
  issuesBefore: number;
  issuesAfter: number;
}> {
  const db = await getSharedLocalDb();
  const rows = db
    .prepare(`SELECT recipe_id FROM curated_recipes WHERE status != 'archived' ORDER BY slug`)
    .all() as { recipe_id: string }[];

  let summaryUpdates = 0;
  let notesUpdates = 0;
  let stepUpdates = 0;
  let generateUpdates = 0;
  let issuesBefore = 0;
  let issuesAfter = 0;

  const updateSummary = db.prepare(
    `UPDATE curated_recipes SET summary = ?, updated_at = datetime('now') WHERE recipe_id = ?`,
  );
  const updateNotes = db.prepare(
    `UPDATE curated_recipes SET editorial_notes = ?, updated_at = datetime('now') WHERE recipe_id = ?`,
  );
  const updateGenerate = db.prepare(
    `UPDATE curated_recipes SET generate_response_json = ?, updated_at = datetime('now') WHERE recipe_id = ?`,
  );
  const updateStep = db.prepare(
    `UPDATE curated_recipe_instructions SET heading = ?, body = ? WHERE recipe_id = ? AND step_number = ?`,
  );

  for (const row of rows) {
    const recipe = getCuratedRecipeById(String(row.recipe_id));
    if (!recipe) continue;

    const blocks: string[] = [
      recipe.summary || "",
      recipe.editorialNotes || "",
      ...recipe.instructions.flatMap((s) => [s.heading || "", s.body]),
      ...collectGenerateResponseCopy(
        (recipe.generateResponse ?? null) as unknown as Record<string, unknown>,
      ),
    ];
    for (const b of blocks) {
      issuesBefore += detectRecipeSpacingIssues(b).length;
    }

    if (recipe.summary) {
      const after = normalizeRecipeSpacing(recipe.summary);
      if (after !== recipe.summary) {
        track(recipe.slug, "summary", recipe.summary, after);
        updateSummary.run(after, recipe.recipeId);
        summaryUpdates++;
      }
    }

    if (recipe.editorialNotes) {
      const after = normalizeRecipeSpacing(recipe.editorialNotes);
      if (after !== recipe.editorialNotes) {
        track(recipe.slug, "editorial_notes", recipe.editorialNotes, after);
        updateNotes.run(after, recipe.recipeId);
        notesUpdates++;
      }
    }

    for (const step of recipe.instructions) {
      const heading = step.heading ? normalizeRecipeSpacing(step.heading) : step.heading;
      const body = normalizeRecipeSpacing(step.body);
      if (heading !== step.heading || body !== step.body) {
        track(recipe.slug, `step-${step.stepNumber}`, step.body, body);
        updateStep.run(heading ?? null, body, recipe.recipeId, step.stepNumber);
        stepUpdates++;
      }
    }

    const grRaw = db
      .prepare(`SELECT generate_response_json FROM curated_recipes WHERE recipe_id = ?`)
      .get(recipe.recipeId) as { generate_response_json?: string } | undefined;
    const gr = safeJsonParse(grRaw?.generate_response_json ?? null);
    if (gr) {
      const normalized = normalizeGenerateResponseCopy(gr);
      const beforeJson = JSON.stringify(gr);
      const afterJson = JSON.stringify(normalized);
      if (beforeJson !== afterJson) {
        updateGenerate.run(afterJson, recipe.recipeId);
        generateUpdates++;
      }
    }

    const refreshed = getCuratedRecipeById(recipe.recipeId);
    if (refreshed) {
      const afterBlocks: string[] = [
        refreshed.summary || "",
        refreshed.editorialNotes || "",
        ...refreshed.instructions.flatMap((s) => [s.heading || "", s.body]),
        ...collectGenerateResponseCopy(
          (refreshed.generateResponse ?? null) as unknown as Record<string, unknown>,
        ),
      ];
      for (const b of afterBlocks) {
        issuesAfter += detectRecipeSpacingIssues(b).length;
      }
    }
  }

  return {
    recipes: rows.length,
    summaryUpdates,
    notesUpdates,
    stepUpdates,
    generateUpdates,
    issuesBefore,
    issuesAfter,
  };
}

function normalizeGoldenPages(): { files: number; updated: number } {
  const dir = path.join(process.cwd(), "client", "public", "catalog", "golden-100", "pages");
  if (!fs.existsSync(dir)) return { files: 0, updated: 0 };
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  let updated = 0;
  for (const file of files) {
    const abs = path.join(dir, file);
    const raw = JSON.parse(fs.readFileSync(abs, "utf8")) as Record<string, unknown>;
    const normalized = normalizeGoldenRecipePageCopy(raw);
    const before = JSON.stringify(raw);
    const after = JSON.stringify(normalized);
    if (before !== after) {
      const slug = String(raw.slug || file.replace(/\.json$/, ""));
      const desc = String(raw.description || "");
      const descAfter = String(normalized.description || "");
      if (desc !== descAfter) track(slug, "golden.description", desc, descAfter);
      fs.writeFileSync(abs, `${JSON.stringify(normalized, null, 2)}\n`);
      updated++;
    }
  }
  return { files: files.length, updated };
}

function writeExamplesReport(): void {
  const outDir = path.join(process.cwd(), "review");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "spacing-normalization-examples.md");
  const lines = [
    "# Recipe spacing normalization — before / after",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Samples captured: ${samples.length} (max ${MAX_SAMPLES})`,
    "",
  ];
  for (const s of samples) {
    lines.push(`## ${s.slug} — \`${s.field}\``, "");
    lines.push("**Before:**", "", `\`${s.before.replace(/`/g, "'")}\``, "");
    lines.push("**After:**", "", `\`${s.after.replace(/`/g, "'")}\``, "");
  }
  fs.writeFileSync(outPath, lines.join("\n"));
  console.log(`[spacing] wrote ${outPath}`);
}

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  const catalog = await normalizeCatalog();
  const golden = normalizeGoldenPages();

  await flushSqliteToDisk();
  writeExamplesReport();

  console.log("[spacing] catalog normalization complete");
  console.log(`  recipes scanned: ${catalog.recipes}`);
  console.log(`  summary updated: ${catalog.summaryUpdates}`);
  console.log(`  editorial_notes updated: ${catalog.notesUpdates}`);
  console.log(`  instruction rows updated: ${catalog.stepUpdates}`);
  console.log(`  generate_response_json updated: ${catalog.generateUpdates}`);
  console.log(`  spacing issues before: ${catalog.issuesBefore}`);
  console.log(`  spacing issues after: ${catalog.issuesAfter}`);
  console.log(`  golden pages: ${golden.files} (${golden.updated} updated)`);
  console.log(`  examples: review/spacing-normalization-examples.md`);

  releaseSqliteTimersForTests();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
