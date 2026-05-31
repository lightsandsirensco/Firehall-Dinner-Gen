#!/usr/bin/env tsx
/**
 * Queue P0 IMAGE_TITLE_MISMATCH recipes for regeneration.
 *
 * Reads review/image-accuracy-audit.json (run audit:image-accuracy first).
 * Writes review/title-mismatch-regen-queue.json and unapproves curated heroes.
 *
 *   npm run audit:image-accuracy
 *   npx tsx scripts/queue-title-mismatch-regen.ts --dry-run
 *   npx tsx scripts/queue-title-mismatch-regen.ts --apply --limit=20
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { initCuratedRecipeStore, getCuratedRecipeBySlug, upsertCuratedRecipe } from "../server/curated-recipe-store.js";
import { flushSqliteToDisk } from "../server/sqlite.js";
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import {
  auditTitlePrimarySideAlignment,
  hasImageTitleMismatch,
  extractTitleVisualRequirements,
  buildRequiredVisibleSidesPromptLine,
} from "../shared/curated-image-governance/title-primary-side-rules.js";
import type { CuratedRecipeInsert } from "../shared/curated-recipe/types.js";

const AUDIT_PATH = path.join(process.cwd(), "review", "image-accuracy-audit.json");
const QUEUE_PATH = path.join(process.cwd(), "review", "title-mismatch-regen-queue.json");

type QueueRow = {
  slug: string;
  title: string;
  collection: string;
  heroImage: string;
  issues: string[];
  requiredVisible: ReturnType<typeof extractTitleVisualRequirements>;
  promptLine: string;
  queuedAt: string;
};

function loadAuditMismatches(): QueueRow[] {
  const catalog = buildApprovedCatalog();
  const rows: QueueRow[] = [];

  for (const entry of catalog.recipes) {
    const issues = auditTitlePrimarySideAlignment({
      slug: entry.slug,
      title: entry.title,
      mealFormat: entry.mealFormat,
      heroPath: entry.heroImage,
    });
    if (!hasImageTitleMismatch(issues)) continue;
    rows.push({
      slug: entry.slug,
      title: entry.title,
      collection: entry.kind,
      heroImage: entry.heroImage,
      issues: issues.map((i) => i.message),
      requiredVisible: extractTitleVisualRequirements(entry.title, entry.mealFormat),
      promptLine: buildRequiredVisibleSidesPromptLine(entry.title, entry.mealFormat),
      queuedAt: new Date().toISOString(),
    });
  }

  if (fs.existsSync(AUDIT_PATH)) {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, "utf8")) as {
      rows?: Array<{ slug: string; title: string; collection: string; heroImage: string; accuracyIssues: Array<{ code: string; message: string }> }>;
    };
    for (const row of audit.rows ?? []) {
      const p0 = (row.accuracyIssues ?? []).filter((i) => i.code === "image_title_mismatch");
      if (!p0.length) continue;
      if (rows.some((r) => r.slug === row.slug)) continue;
      rows.push({
        slug: row.slug,
        title: row.title,
        collection: row.collection,
        heroImage: row.heroImage,
        issues: p0.map((i) => i.message),
        requiredVisible: extractTitleVisualRequirements(row.title),
        promptLine: buildRequiredVisibleSidesPromptLine(row.title),
        queuedAt: new Date().toISOString(),
      });
    }
  }

  return rows;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const apply = args.includes("--apply");
  const limit = parseInt(args.find((a) => a.startsWith("--limit="))?.replace("--limit=", "") || "50", 10);
  const only = args.find((a) => a.startsWith("--only="))?.replace("--only=", "");

  if (!dryRun && !apply) {
    console.error("Use --dry-run or --apply");
    process.exit(1);
  }

  let queue = loadAuditMismatches();
  if (only) queue = queue.filter((r) => r.slug === only);
  queue = queue.slice(0, limit);

  fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
  fs.writeFileSync(
    QUEUE_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), count: queue.length, rows: queue }, null, 2),
  );

  console.log(`[queue-title-mismatch] P0 mismatches=${queue.length} → ${QUEUE_PATH}`);

  if (apply) {
    await initCuratedRecipeStore();
    for (const row of queue) {
      const recipe = getCuratedRecipeBySlug(row.slug);
      if (!recipe?.editorialImage) continue;
      const nextMeta = {
        ...recipe.editorialImage,
        imageApproved: false,
        imageVersion: (recipe.editorialImage.imageVersion || 0) + 1,
        integrityFlags: [
          ...new Set([...(recipe.editorialImage.integrityFlags || []), "image_title_mismatch", "needs_regeneration"]),
        ],
      };
      const insert: CuratedRecipeInsert = {
        ...recipe,
        tags: recipe.tags.filter((t) => t !== "image_approved"),
        editorialImage: nextMeta,
      };
      upsertCuratedRecipe(insert);
      console.log(`  unapproved ${row.slug} — ${row.issues[0]?.slice(0, 80)}`);
    }
    await flushSqliteToDisk();
  } else {
    for (const row of queue.slice(0, 15)) {
      console.log(`  ${row.slug}: ${row.issues[0]}`);
    }
    if (queue.length > 15) console.log(`  … and ${queue.length - 15} more`);
  }

  console.log("\nRegenerate: npx tsx scripts/generate-review-queue-imagery.ts --only=<slug> --approve");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
