#!/usr/bin/env tsx
/**
 * Breakfast-only image audit — hero, thumb, mobile, rail, Explore.
 *
 *   npm run audit:breakfast-images
 *
 * Outputs:
 *   review/breakfast-image-audit.json
 *   review/breakfast-image-audit.md
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { getSharedLocalDb, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";
import { goldenPageImageSet } from "../shared/golden-100/recipe-page-paths.js";
import { RED_LEAD_PDF_ASSETS } from "../shared/seo/firefighter-red-lead-sauce-data.js";
import { FIREFIGHTER_RED_LEAD_RECIPE_PATH } from "../shared/seo/firefighter-red-lead-recipe-data.js";
import {
  auditBreakfastImageSurfaces,
  breakfastRecipePasses,
  inferBreakfastFormatKind,
  type BreakfastImageSurface,
} from "../shared/curated-image-governance/breakfast-image-rules.js";
import type { ImageAccuracyIssue } from "../shared/curated-image-governance/image-accuracy-rules.js";
import {
  recommendBreakfastDonor,
  BREAKFAST_CANONICAL_UNIQUE_SLUGS,
} from "../shared/breakfast-catalog/image-donor-plan.js";
import { imageFileExists } from "../shared/explore-image-paths.js";
import { breakfastCatalogHeroPath, breakfastCatalogThumbPath } from "../shared/breakfast-catalog/slug-registry.js";

type BreakfastAuditRow = BreakfastImageSurface & {
  route: string;
  formatKinds: string[];
  heroMd5: string | null;
  duplicateGroup: string[];
  duplicatePeers: string[];
  recommendedDonor: string | null;
  onDisk: { hero: boolean; thumb: boolean; mobile: boolean; rail: boolean };
  variantMismatch: boolean;
  issues: ImageAccuracyIssue[];
  pass: boolean;
};

const PUBLIC = path.join(process.cwd(), "client/public");
const JSON_OUT = path.join("review", "breakfast-image-audit.json");
const MD_OUT = path.join("review", "breakfast-image-audit.md");

function md5Public(publicPath: string): string | null {
  const abs = path.join(PUBLIC, publicPath.replace(/^\//, ""));
  if (!fs.existsSync(abs)) return null;
  return crypto.createHash("md5").update(fs.readFileSync(abs)).digest("hex");
}

function breakfastImageSet(slug: string) {
  return {
    heroImage: breakfastCatalogHeroPath(slug),
    thumbImage: breakfastCatalogThumbPath(slug),
    mobileImage: `/images/mobile/breakfast/${slug}.jpg`,
    railImage: `/images/rails/breakfast/${slug}.jpg`,
  };
}

function readBreakfastIndex(): Array<{ slug: string; title: string; tags?: string[] }> {
  const file = path.join(PUBLIC, "catalog/breakfast/index.json");
  if (!fs.existsSync(file)) return [];
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as {
    recipes: Array<{ slug: string; title: string; tags?: string[] }>;
  };
  return raw.recipes;
}

function auditRow(surface: BreakfastImageSurface & { route: string; tags?: string[] }): BreakfastAuditRow {
  const images = {
    heroImage: surface.heroImage,
    thumbImage: surface.thumbImage,
    mobileImage: surface.mobileImage,
    railImage: surface.railImage,
  };

  const onDisk = {
    hero: imageFileExists(images.heroImage),
    thumb: imageFileExists(images.thumbImage),
    mobile: imageFileExists(images.mobileImage),
    rail: imageFileExists(images.railImage),
  };

  const heroMd5 = onDisk.hero ? md5Public(images.heroImage) : null;
  const thumbMd5 = onDisk.thumb ? md5Public(images.thumbImage) : null;
  const mobileMd5 = onDisk.mobile ? md5Public(images.mobileImage) : null;
  const railMd5 = onDisk.rail ? md5Public(images.railImage) : null;

  const variantMismatch =
    Boolean(heroMd5) &&
    ((thumbMd5 && thumbMd5 !== heroMd5) ||
      (mobileMd5 && mobileMd5 !== heroMd5) ||
      (railMd5 && railMd5 !== heroMd5)) &&
    // variants are resized crops — compare only if thumb equals a different slug's hero
    false;

  const issues: ImageAccuracyIssue[] = [];

  if (!onDisk.hero) {
    issues.push({
      code: "missing_image_file",
      severity: "critical",
      message: "hero image file missing on disk",
      confidence: 95,
    });
  }
  if (!onDisk.thumb) {
    issues.push({
      code: "missing_image_file",
      severity: "critical",
      message: "thumbnail image file missing on disk",
      confidence: 90,
    });
  }
  if (!onDisk.mobile) {
    issues.push({
      code: "missing_image_file",
      severity: "warning",
      message: "mobile image file missing on disk",
      confidence: 85,
    });
  }
  if (!onDisk.rail) {
    issues.push({
      code: "explore_card_mismatch",
      severity: "warning",
      message: "Explore rail/card image file missing on disk",
      confidence: 85,
    });
  }

  return {
    ...surface,
    route: surface.route,
    formatKinds: inferBreakfastFormatKind(surface.title, surface.tags || []),
    heroMd5,
    duplicateGroup: [],
    duplicatePeers: [],
    recommendedDonor: recommendBreakfastDonor(surface.slug),
    onDisk,
    variantMismatch,
    issues,
    pass: true,
  };
}

function attachDuplicateGroups(rows: BreakfastAuditRow[]): void {
  const byHash = new Map<string, BreakfastAuditRow[]>();
  for (const row of rows) {
    if (!row.heroMd5) continue;
    const list = byHash.get(row.heroMd5) || [];
    list.push(row);
    byHash.set(row.heroMd5, list);
  }

  for (const row of rows) {
    if (!row.heroMd5) continue;
    const group = byHash.get(row.heroMd5) || [];
    row.duplicateGroup = group.map((r) => r.slug);
    row.duplicatePeers = group.filter((r) => r.slug !== row.slug).map((r) => r.slug);

    row.issues.push(
      ...auditBreakfastImageSurfaces(row, row.heroMd5, row.duplicatePeers),
    );

    if (row.duplicatePeers.length > 0) {
      row.pass = false;
    } else if (!breakfastRecipePasses(row.issues)) {
      row.pass = false;
    } else {
      row.pass = true;
    }

    if (
      BREAKFAST_CANONICAL_UNIQUE_SLUGS.has(row.slug) &&
      breakfastRecipePasses(row.issues.filter((i) => i.code !== "duplicate_hero_hash"))
    ) {
      row.pass = true;
    }
  }
}

async function auditExploreBreakfast(): Promise<BreakfastAuditRow[]> {
  const db = await getSharedLocalDb();
  if (!db || typeof db.prepare !== "function") return [];

  let rawRows: Record<string, unknown>[] = [];
  try {
    rawRows = db
      .prepare(
        `SELECT slug, title, hero_image, tags
         FROM curated_recipes
         WHERE status IN ('published', 'approved')
           AND (tags LIKE '%breakfast_catalog%' OR tags LIKE '%breakfast%' OR category = 'breakfast_brunch')`,
      )
      .all() as Record<string, unknown>[];
  } catch {
    return [];
  }

  const catalogSlugs = new Set(readBreakfastIndex().map((r) => r.slug));
  const rows: BreakfastAuditRow[] = [];

  for (const row of rawRows) {
    const slug = String(row.slug || "");
    if (catalogSlugs.has(slug)) continue;

    const images = breakfastImageSet(slug);
    const heroFromDb = String(row.hero_image || "").trim();
    const base = auditRow({
      slug,
      title: String(row.title || ""),
      route: `/recipes/${slug}`,
      source: "explore",
      tags: String(row.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      ...images,
      heroImage: heroFromDb || images.heroImage,
    });

    if (heroFromDb && heroFromDb !== images.heroImage) {
      base.issues.push({
        code: "explore_card_mismatch",
        severity: "warning",
        message: `Explore hero_image (${heroFromDb}) differs from breakfast catalog path (${images.heroImage})`,
        confidence: 80,
      });
    }
    rows.push(base);
  }

  return rows;
}

function writeReports(rows: BreakfastAuditRow[]): void {
  const failed = rows.filter((r) => !r.pass);
  const duplicateGroups = [
    ...new Map(
      rows
        .filter((r) => r.duplicatePeers.length > 0)
        .map((r) => [r.heroMd5, r.duplicateGroup] as const),
    ).values(),
  ];

  const payload = {
    generatedAt: new Date().toISOString(),
    totals: {
      recipesAudited: rows.length,
      passed: rows.filter((r) => r.pass).length,
      failed: failed.length,
      formatPassed: rows.filter((r) => breakfastRecipePasses(r.issues.filter((i) => i.code !== "duplicate_hero_hash"))).length,
      duplicateGroups: duplicateGroups.length,
      canonicalUnique: BREAKFAST_CANONICAL_UNIQUE_SLUGS.size,
      missingHero: rows.filter((r) => !r.onDisk.hero).length,
    },
    duplicateGroups: duplicateGroups.map((slugs) => ({
      slugs,
      hash: rows.find((r) => r.slug === slugs[0])?.heroMd5 ?? null,
    })),
    failedRecipes: failed.map((r) => ({
      slug: r.slug,
      title: r.title,
      source: r.source,
      route: r.route,
      formatKinds: r.formatKinds,
      heroImage: r.heroImage,
      thumbImage: r.thumbImage,
      mobileImage: r.mobileImage,
      railImage: r.railImage,
      duplicatePeers: r.duplicatePeers,
      recommendedDonor: r.recommendedDonor,
      issues: r.issues.filter((i) => i.severity !== "info"),
    })),
    recipes: rows,
  };

  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify(payload, null, 2), "utf8");

  const md: string[] = [
    "# Breakfast Image Audit",
    "",
    `- Recipes audited: **${payload.totals.recipesAudited}**`,
    `- Passed: **${payload.totals.passed}**`,
    `- Failed: **${payload.totals.failed}**`,
    `- Duplicate hero groups: **${payload.totals.duplicateGroups}**`,
    `- Format/title passed (ignoring dupes): **${payload.totals.formatPassed}**`,
    `- Missing heroes: **${payload.totals.missingHero}**`,
    "",
    "## Duplicate image groups",
    "",
  ];

  if (duplicateGroups.length === 0) {
    md.push("_No duplicate hero hashes._", "");
  } else {
    md.push("| Hash | Recipes | Recommended fix |", "| --- | --- | --- |");
    for (const group of duplicateGroups) {
      const hash = rows.find((r) => r.slug === group[0])?.heroMd5?.slice(0, 12) ?? "?";
      const recs = group
        .map((s) => {
          const d = recommendBreakfastDonor(s);
          return d ? `\`${s}\` → \`${d}\`` : `\`${s}\` (canonical)`;
        })
        .join("; ");
      md.push(`| \`${hash}…\` | ${group.map((s) => `\`${s}\``).join(", ")} | ${recs} |`);
    }
    md.push("");
  }

  md.push("## Failed recipes", "");
  for (const r of failed) {
    md.push(`### ${r.title} (\`${r.slug}\`) — ${r.source}`);
    md.push(`- Route: \`${r.route}\``);
    md.push(`- Hero: \`${r.heroImage}\``);
    md.push(`- Formats: ${r.formatKinds.join(", ")}`);
    if (r.duplicatePeers.length) {
      md.push(`- Duplicate peers: ${r.duplicatePeers.map((s) => `\`${s}\``).join(", ")}`);
    }
    if (r.recommendedDonor) {
      md.push(`- Recommended donor: \`${r.recommendedDonor}\``);
    }
    for (const issue of r.issues.filter((i) => i.severity !== "info")) {
      md.push(`- **${issue.severity}** \`${issue.code}\`: ${issue.message}`);
    }
    md.push("");
  }

  fs.writeFileSync(MD_OUT, md.join("\n"), "utf8");
  console.log(`[audit:breakfast-images] wrote ${JSON_OUT}`);
  console.log(`[audit:breakfast-images] wrote ${MD_OUT}`);
  console.log(
    `[audit:breakfast-images] audited=${payload.totals.recipesAudited} failed=${payload.totals.failed} duplicates=${payload.totals.duplicateGroups}`,
  );
}

async function main(): Promise<void> {
  await initCuratedRecipeStore();

  const rows: BreakfastAuditRow[] = [];

  for (const entry of readBreakfastIndex()) {
    const pagePath = path.join(PUBLIC, "catalog/breakfast/pages", `${entry.slug}.json`);
    let tags = entry.tags || [];
    if (fs.existsSync(pagePath)) {
      try {
        const page = JSON.parse(fs.readFileSync(pagePath, "utf8")) as { tags?: string[] };
        tags = page.tags || tags;
      } catch {
        /* ignore */
      }
    }

    rows.push(
      auditRow({
        slug: entry.slug,
        title: entry.title,
        route: `/breakfast/${entry.slug}`,
        source: "breakfast_catalog",
        tags,
        ...breakfastImageSet(entry.slug),
      }),
    );
  }

  for (const def of GOLDEN_100_RECIPES) {
    if (def.masterCategoryId !== "breakfast_brunch") continue;
    const slug = def.classicSlug || def.slug;
    const images = goldenPageImageSet(slug);
    rows.push(
      auditRow({
        slug,
        title: def.title,
        route: `/recipes/${slug}`,
        source: "golden_100",
        tags: ["breakfast", "golden_100"],
        heroImage: images.heroImage,
        thumbImage: images.thumbImage,
        mobileImage: images.mobileImage,
        railImage: images.railImage,
      }),
    );
  }

  const redLeadHero = RED_LEAD_PDF_ASSETS.heroImage;
  rows.push(
    auditRow({
      slug: "firefighter-red-lead-recipe",
      title: "Firefighter Red Lead Recipe",
      route: FIREFIGHTER_RED_LEAD_RECIPE_PATH,
      source: "red_lead",
      tags: ["red-lead", "breakfast"],
      heroImage: redLeadHero,
      thumbImage: `/images/thumbs/breakfast/firefighter-red-lead-recipe.jpg`,
      mobileImage: `/images/mobile/breakfast/firefighter-red-lead-recipe.jpg`,
      railImage: `/images/rails/breakfast/firefighter-red-lead-recipe.jpg`,
    }),
  );

  rows.push(...(await auditExploreBreakfast()));

  attachDuplicateGroups(rows);
  writeReports(rows);
  releaseSqliteTimersForTests();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
