#!/usr/bin/env tsx
/**
 * Audit curated image governance — Golden 100, Performance Meals, Explore DB.
 *
 * Outputs:
 *   review/curated-image-governance-report.json
 *   review/curated-image-governance-report.md
 *
 * Usage:
 *   npm run audit:image-governance
 *   npm run audit:image-governance -- --json
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { getSharedLocalDb, flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { loadMergedHallCatalogIndex, resolveHallRecipePage } from "../server/meal-catalog/load-index.js";
import { parseEditorialImageMetadata } from "../shared/editorial-image-metadata.js";
import {
  buildCuratedMealImageProfile,
  governanceFailsBuild,
  validateCuratedImageGovernance,
  IMAGE_GOVERNANCE_BUILD_FAIL_THRESHOLD,
} from "../shared/curated-image-governance/index.js";
import { goldenPageImageSet } from "../shared/golden-100/recipe-page-paths.js";

type AuditRow = {
  source: "hall_catalog" | "explore_curated";
  slug: string;
  title: string;
  protein: string;
  mealFormat: string;
  cuisine: string;
  heroImage: string;
  thumbImage: string;
  mobileImage: string;
  mismatchConfidence: number;
  pass: boolean;
  needsManualReview: boolean;
  mismatches: Array<{ code: string; severity: string; message: string }>;
};

function auditHallCatalog(): AuditRow[] {
  const index = loadMergedHallCatalogIndex();
  const rows: AuditRow[] = [];

  for (const entry of index.recipes) {
    const page = resolveHallRecipePage(entry.slug);
    const locked = goldenPageImageSet(entry.slug);
    const hero = page?.heroImage?.trim() || entry.heroImage?.trim() || locked.heroImage;
    const thumb = page?.thumbImage?.trim() || entry.thumbImage?.trim() || locked.thumbImage;
    const mobile = page?.mobileImage?.trim() || locked.mobileImage;

    const profile = buildCuratedMealImageProfile({
      slug: entry.slug,
      title: entry.title,
      protein: entry.protein,
      cuisine: entry.cuisine,
      mealFormat: entry.mealFormat,
    });

    const result = validateCuratedImageGovernance({
      profile,
      heroImage: hero,
      thumbImage: thumb,
      mobileImage: mobile,
      imageApproved: true,
      publishGate: true,
    });

    rows.push({
      source: "hall_catalog",
      slug: entry.slug,
      title: entry.title,
      protein: entry.protein,
      mealFormat: entry.mealFormat,
      cuisine: entry.cuisine,
      heroImage: hero,
      thumbImage: thumb,
      mobileImage: mobile,
      mismatchConfidence: result.mismatchConfidence,
      pass: result.pass,
      needsManualReview: result.needsManualReview,
      mismatches: result.mismatches.map((m) => ({
        code: m.code,
        severity: m.severity,
        message: m.message,
      })),
    });
  }

  return rows;
}

async function auditExploreCurated(): Promise<AuditRow[]> {
  await initCuratedRecipeStore();
  const db = await getSharedLocalDb();
  const recipeCols = (db.prepare("PRAGMA table_info(curated_recipes)").all() as { name: string }[]).map(
    (r) => r.name,
  );
  const idCol = recipeCols.includes("recipe_id") ? "recipe_id" : "id";

  const rawRows = db
    .prepare(
      `
      SELECT slug, title, protein, cuisine, meal_format, hero_image, editorial_image_json, status
      FROM curated_recipes
      WHERE status IN ('published', 'approved', 'review')
      ORDER BY title
      `,
    )
    .all() as Record<string, unknown>[];

  const rows: AuditRow[] = [];
  for (const row of rawRows) {
    const slug = String(row.slug || "");
    const title = String(row.title || "");
    const hero = String(row.hero_image || "").trim();
    let thumb = "";
    let mobile = "";
    try {
      const t = db
        .prepare(
          `SELECT i.url FROM curated_recipe_images i
           INNER JOIN curated_recipes r ON r.${idCol} = i.${idCol}
           WHERE r.slug = ? AND i.role = 'thumb' ORDER BY i.position LIMIT 1`,
        )
        .get(slug) as { url?: string } | undefined;
      thumb = String(t?.url || "").trim();
    } catch {
      /* optional table */
    }

    const editorial = parseEditorialImageMetadata(row.editorial_image_json);
    if (editorial) {
      thumb = thumb || editorial.thumbnailImage;
      mobile = editorial.mobileHeroImage;
    }

    const profile = buildCuratedMealImageProfile({
      slug,
      title,
      protein: String(row.protein || "any"),
      cuisine: String(row.cuisine || "american"),
      mealFormat: String(row.meal_format || "plated_main"),
    });

    const result = validateCuratedImageGovernance({
      profile,
      heroImage: hero,
      thumbImage: thumb,
      mobileImage: mobile,
      imageApproved: editorial?.imageApproved ?? false,
      publishGate: row.status === "published",
    });

    rows.push({
      source: "explore_curated",
      slug,
      title,
      protein: profile.protein,
      mealFormat: profile.mealFormat,
      cuisine: profile.cuisine,
      heroImage: hero,
      thumbImage: thumb,
      mobileImage: mobile,
      mismatchConfidence: result.mismatchConfidence,
      pass: result.pass,
      needsManualReview: result.needsManualReview,
      mismatches: result.mismatches.map((m) => ({
        code: m.code,
        severity: m.severity,
        message: m.message,
      })),
    });
  }

  return rows;
}

function duplicateHeroReport(rows: AuditRow[]): Array<{ hero: string; slugs: string[] }> {
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const h = r.heroImage.trim();
    if (!h || !h.startsWith("/images/")) continue;
    const list = map.get(h) ?? [];
    list.push(r.slug);
    map.set(h, list);
  }
  return [...map.entries()]
    .filter(([, slugs]) => slugs.length > 1)
    .map(([hero, slugs]) => ({ hero, slugs }));
}

async function main(): Promise<void> {
  const asJson = process.argv.includes("--json");
  const hall = auditHallCatalog();
  const explore = await auditExploreCurated();
  const all = [...hall, ...explore];
  const failed = all.filter((r) => !r.pass);
  const buildBlockers = all.filter((r) =>
    governanceFailsBuild({
      pass: r.pass,
      mismatchConfidence: r.mismatchConfidence,
      mismatches: [],
      needsManualReview: r.needsManualReview,
      inferredImageSignals: [],
    }),
  );
  const dupes = duplicateHeroReport(all);

  const report = {
    generatedAt: new Date().toISOString(),
    threshold: IMAGE_GOVERNANCE_BUILD_FAIL_THRESHOLD,
    totals: {
      recipes: all.length,
      hallCatalog: hall.length,
      exploreCurated: explore.length,
      failed: failed.length,
      buildBlockers: buildBlockers.length,
      duplicateHeroPaths: dupes.length,
    },
    duplicateHeroPaths: dupes,
    failedRecipes: failed,
    buildBlockers: buildBlockers.map((r) => ({
      slug: r.slug,
      title: r.title,
      source: r.source,
      mismatchConfidence: r.mismatchConfidence,
      mismatches: r.mismatches,
    })),
    rows: all,
  };

  const reviewDir = path.join(process.cwd(), "review");
  fs.mkdirSync(reviewDir, { recursive: true });
  const jsonPath = path.join(reviewDir, "curated-image-governance-report.json");
  const mdPath = path.join(reviewDir, "curated-image-governance-report.md");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const md: string[] = [
    "# Curated image governance audit",
    "",
    `Generated: **${report.generatedAt}**`,
    "",
    `- Recipes audited: **${report.totals.recipes}**`,
    `- Failed governance: **${report.totals.failed}**`,
    `- Build blockers (≥${report.threshold}): **${report.totals.buildBlockers}**`,
    `- Duplicate hero paths: **${report.totals.duplicateHeroPaths}**`,
    "",
    "## Build blockers",
    "",
  ];

  if (buildBlockers.length === 0) {
    md.push("_None — images pass governance threshold._");
  } else {
    for (const r of buildBlockers.slice(0, 80)) {
      md.push(`### ${r.slug} (${r.source})`);
      md.push(`- **${r.title}** — confidence ${r.mismatchConfidence}`);
      for (const m of r.mismatches) {
        md.push(`- \`${m.code}\` (${m.severity}): ${m.message}`);
      }
      md.push("");
    }
  }

  md.push("", "## Duplicate hero reuse", "");
  if (dupes.length === 0) {
    md.push("_None._");
  } else {
    for (const d of dupes.slice(0, 40)) {
      md.push(`- \`${d.hero}\` → ${d.slugs.join(", ")}`);
    }
  }

  fs.writeFileSync(mdPath, md.join("\n"));

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `[audit:image-governance] recipes=${all.length} failed=${failed.length} blockers=${buildBlockers.length} dupes=${dupes.length}`,
    );
    console.log(`[audit:image-governance] wrote ${jsonPath}`);
    console.log(`[audit:image-governance] wrote ${mdPath}`);
  }

  flushSqliteToDisk();
  releaseSqliteTimersForTests();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
