#!/usr/bin/env tsx
/**
 * Audit recipe-image subject lock integrity across curated catalog.
 *
 *   npx tsx scripts/audit-image-subject-lock.ts
 *   npx tsx scripts/audit-image-subject-lock.ts --tag=golden_100 --fail-on-mismatch
 */
import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { initCuratedRecipeStore, listCuratedSummariesByTag } from "../server/curated-recipe-store.js";
import { getCuratedRecipeBySlug } from "../server/curated-recipe-store.js";
import { scoreImageIntegrity, IMAGE_INTEGRITY_PASS_THRESHOLD } from "../shared/image-integrity.js";
import { validateCuratedImageGovernance, buildCuratedMealImageProfile } from "../shared/curated-image-governance/index.js";

interface AuditRow {
  slug: string;
  title: string;
  status: string;
  heroImage: string;
  platingType: string;
  depictedPlating: string | null;
  imageIntegrityScore: number;
  pass: boolean;
  flags: string[];
  conflicts: string[];
  imageApproved: boolean;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const tag = args.find((a) => a.startsWith("--tag="))?.replace("--tag=", "") || "golden_100";
  const failOnMismatch = args.includes("--fail-on-mismatch");

  await initCuratedRecipeStore();
  const rows = listCuratedSummariesByTag(tag, 500);

  const audited: AuditRow[] = [];
  let failed = 0;
  let platingMismatches = 0;

  for (const row of rows) {
    const recipe = getCuratedRecipeBySlug(row.slug);
    if (!recipe) continue;

    const integrity = scoreImageIntegrity({
      slug: row.slug,
      title: row.title,
      protein: row.protein,
      cuisine: row.cuisine,
      mealFormat: recipe.mealFormat,
      heroImage: row.heroImage,
      heroAlt: recipe.heroImageAlt || row.title,
      imageApproved: recipe.editorialImage?.imageApproved,
      publishGate: recipe.status === "published",
    });

    const gov = validateCuratedImageGovernance({
      profile: buildCuratedMealImageProfile({
        slug: row.slug,
        title: row.title,
        protein: row.protein,
        cuisine: row.cuisine,
        mealFormat: recipe.mealFormat,
      }),
      heroImage: row.heroImage,
      thumbImage: recipe.editorialImage?.thumbnailImage,
      mobileImage: recipe.editorialImage?.mobileHeroImage,
      imageApproved: recipe.editorialImage?.imageApproved,
      heroAlt: row.title,
      publishGate: recipe.status === "published",
    });

    const pass = integrity.pass && gov.pass;
    if (!pass) failed++;
    if (integrity.flags.includes("plating_mismatch")) platingMismatches++;

    audited.push({
      slug: row.slug,
      title: row.title,
      status: row.status,
      heroImage: row.heroImage,
      platingType: integrity.platingType,
      depictedPlating: integrity.depictedPlating,
      imageIntegrityScore: integrity.score,
      pass,
      flags: [...new Set([...integrity.flags, ...gov.mismatches.map((m) => m.code)])],
      conflicts: integrity.conflicts,
      imageApproved: Boolean(recipe.editorialImage?.imageApproved),
    });
  }

  audited.sort((a, b) => a.imageIntegrityScore - b.imageIntegrityScore);

  const outDir = join(process.cwd(), "review");
  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, "image-subject-lock-audit.json");
  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        tag,
        threshold: IMAGE_INTEGRITY_PASS_THRESHOLD,
        total: audited.length,
        failed,
        platingMismatches,
        rows: audited,
      },
      null,
      2,
    ),
  );

  console.log(`\n[audit:image-subject-lock] tag=${tag} total=${audited.length} failed=${failed} plating_mismatches=${platingMismatches}`);
  console.log(`Wrote ${jsonPath}\n`);

  const worst = audited.filter((r) => !r.pass).slice(0, 25);
  if (worst.length) {
    console.log("TOP FAILURES:");
    for (const r of worst) {
      console.log(
        `  ${r.slug} score=${r.imageIntegrityScore} expected=${r.platingType} depicted=${r.depictedPlating ?? "?"} flags=${r.flags.join(",")}`,
      );
      console.log(`    "${r.title}"`);
    }
  } else {
    console.log("All recipes pass image subject lock audit.");
  }

  if (failOnMismatch && failed > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
