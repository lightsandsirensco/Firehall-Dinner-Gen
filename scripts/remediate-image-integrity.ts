#!/usr/bin/env tsx
/**
 * Remediate recipes failing image integrity — unapprove + queue for regen.
 *
 *   npx tsx scripts/remediate-image-integrity.ts --dry-run
 *   npx tsx scripts/remediate-image-integrity.ts --apply --limit=10
 *   npx tsx scripts/remediate-image-integrity.ts --only=some-slug --apply
 */
import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { initCuratedRecipeStore, getCuratedRecipeBySlug, upsertCuratedRecipe } from "../server/curated-recipe-store.js";
import { flushSqliteToDisk } from "../server/sqlite.js";
import type { CuratedRecipeInsert } from "../shared/curated-recipe/types.js";
import { applySubjectLockToMetadata } from "../shared/image-subject-lock.js";
import { scoreImageIntegrity } from "../shared/image-integrity.js";

interface AuditFile {
  rows: Array<{ slug: string; pass: boolean; imageIntegrityScore: number }>;
}

function loadFailedSlugs(limit: number, only?: string): string[] {
  if (only) return [only];
  const path = join(process.cwd(), "review", "image-subject-lock-audit.json");
  if (!existsSync(path)) {
    console.error("Run: npx tsx scripts/audit-image-subject-lock.ts first");
    process.exit(1);
  }
  const audit = JSON.parse(readFileSync(path, "utf8")) as AuditFile;
  return audit.rows
    .filter((r) => !r.pass)
    .slice(0, limit)
    .map((r) => r.slug);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const apply = args.includes("--apply");
  const only = args.find((a) => a.startsWith("--only="))?.replace("--only=", "");
  const limit = parseInt(args.find((a) => a.startsWith("--limit="))?.replace("--limit=", "") || "20", 10);

  if (!dryRun && !apply) {
    console.error("Use --dry-run or --apply");
    process.exit(1);
  }

  await initCuratedRecipeStore();
  const slugs = loadFailedSlugs(limit, only || undefined);

  console.log(`[remediate:image-integrity] slugs=${slugs.length} mode=${dryRun ? "dry-run" : "apply"}`);

  for (const slug of slugs) {
    const recipe = getCuratedRecipeBySlug(slug);
    if (!recipe?.editorialImage) {
      console.log(`  skip ${slug} — no editorial metadata`);
      continue;
    }

    const integrity = scoreImageIntegrity({
      slug,
      title: recipe.title,
      protein: recipe.protein,
      cuisine: recipe.cuisine,
      mealFormat: recipe.mealFormat,
      heroImage: recipe.heroImage,
      heroAlt: recipe.title,
      imageApproved: recipe.editorialImage.imageApproved,
    });

    const nextMeta = applySubjectLockToMetadata(
      {
        ...recipe.editorialImage,
        imageApproved: false,
        imageVersion: (recipe.editorialImage.imageVersion || 0) + 1,
        integrityFlags: [...new Set([...(recipe.editorialImage.integrityFlags || []), ...integrity.flags, "needs_regeneration"])],
        imageIntegrityScore: integrity.score,
      },
      { title: recipe.title, cuisine: recipe.cuisine, mealFormat: recipe.mealFormat },
      { score: integrity.score, flags: integrity.flags },
    );

    console.log(
      `  ${slug} score=${integrity.score} plating=${integrity.platingType} depicted=${integrity.depictedPlating ?? "?"} → unapprove v${nextMeta.imageVersion}`,
    );

    if (apply) {
      const insert: CuratedRecipeInsert = {
        recipeId: recipe.recipeId,
        slug: recipe.slug,
        status: recipe.status,
        title: recipe.title,
        summary: recipe.summary,
        heroImage: recipe.heroImage,
        images: recipe.images,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prepMinutes: recipe.prepMinutes,
        cookMinutes: recipe.cookMinutes,
        totalMinutes: recipe.totalMinutes,
        servingsBase: recipe.servingsBase,
        cleanupDifficulty: recipe.cleanupDifficulty,
        protein: recipe.protein,
        cuisine: recipe.cuisine,
        category: recipe.category,
        mealFormat: recipe.mealFormat,
        mealArchetype: recipe.mealArchetype,
        tags: recipe.tags.filter((t) => t !== "image_approved"),
        source: recipe.source,
        scores: recipe.scores,
        editorialImage: nextMeta,
      };
      upsertCuratedRecipe(insert);
    }
  }

  if (apply) await flushSqliteToDisk();
  console.log("\nRegenerate heroes with: npx tsx scripts/generate-review-queue-imagery.ts --only=<slug> --approve");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
