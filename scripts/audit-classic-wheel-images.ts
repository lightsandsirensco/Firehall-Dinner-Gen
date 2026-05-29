#!/usr/bin/env tsx
/**
 * Classics Wheel imagery audit — owned heroes, disk checks, no Spoonacular / emoji fallbacks.
 *
 *   npx tsx scripts/audit-classic-wheel-images.ts
 */
import fs from "node:fs";
import path from "node:path";
import {
  CLASSIC_HALL_MEALS,
  findDuplicateClassicHeroIds,
} from "../shared/classic-hall-meals.js";
import {
  resolveClassicWheelImagery,
  isOwnedCatalogHeroPath,
  isSpoonacularOrExternalHeroUrl,
} from "../shared/classic-wheel-imagery.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");

function fileExists(publicPath: string): boolean {
  if (!publicPath.startsWith("/")) return false;
  return fs.existsSync(path.join(PUBLIC, publicPath.replace(/^\//, "")));
}

type Row = {
  slug: string;
  title: string;
  heroImage: string;
  thumbImage: string;
  mobileImage: string;
  imageApproved: boolean;
  imageryStatus: string;
  heroOnDisk: boolean;
  thumbOnDisk: boolean;
  issues: string[];
};

function auditMeal(): { rows: Row[]; errors: string[] } {
  const rows: Row[] = [];
  const errors: string[] = [];

  for (const meal of CLASSIC_HALL_MEALS) {
    const imagery = resolveClassicWheelImagery(meal);
    const issues: string[] = [];

    if (!imagery.heroImage && !imagery.imageApproved) {
      issues.push("missing_hero_path");
    }
    if (imagery.heroImage && isSpoonacularOrExternalHeroUrl(imagery.heroImage)) {
      issues.push("forbidden_external_hero");
    }
    if (imagery.heroImage && !isOwnedCatalogHeroPath(imagery.heroImage)) {
      issues.push("hero_not_owned_path");
    }
    if (imagery.imageApproved && !fileExists(imagery.heroImage)) {
      issues.push("hero_missing_on_disk");
    }
    if (!fileExists(imagery.thumbImage)) {
      issues.push("thumb_missing_on_disk");
    }

    const heroOnDisk = imagery.heroImage ? fileExists(imagery.heroImage) : false;
    const thumbOnDisk = fileExists(imagery.thumbImage);

    if (issues.length) {
      errors.push(`${meal.slug}: ${issues.join(", ")}`);
    }

    rows.push({
      slug: meal.slug,
      title: meal.title,
      heroImage: imagery.heroImage,
      thumbImage: imagery.thumbImage,
      mobileImage: imagery.mobileImage,
      imageApproved: imagery.imageApproved,
      imageryStatus: imagery.imageryStatus,
      heroOnDisk,
      thumbOnDisk,
      issues,
    });
  }

  return { rows, errors };
}

function main(): void {
  console.log("=== Classics Wheel Imagery Audit ===\n");

  const { rows, errors } = auditMeal();
  const approved = rows.filter((r) => r.imageApproved && r.heroOnDisk);
  const placeholder = rows.filter((r) => !r.imageApproved || !r.heroOnDisk);

  console.log("| Slug | Status | Hero | Disk |");
  console.log("|------|--------|------|------|");
  for (const r of rows) {
    const status = r.imageApproved && r.heroOnDisk ? "approved" : "soft_held";
    console.log(
      `| ${r.slug} | ${status} | \`${r.heroImage || "(placeholder)"}\` | ${r.heroOnDisk ? "ok" : "—"} |`,
    );
  }

  console.log(`\nApproved with on-disk hero: ${approved.length}/${rows.length}`);
  console.log(`Soft-held / missing: ${placeholder.length}/${rows.length}`);

  const dups = findDuplicateClassicHeroIds();
  if (dups.length) {
    console.log("\nDuplicate Spoonacular hero IDs (legacy check):");
    for (const d of dups) console.log(`  id=${d.id} → ${d.slugs.join(", ")}`);
  }

  const reviewDir = path.join(ROOT, "review");
  if (!fs.existsSync(reviewDir)) fs.mkdirSync(reviewDir, { recursive: true });

  const report = {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    approvedCount: approved.length,
    placeholderCount: placeholder.length,
    pass: errors.length === 0,
    rows,
    errors,
  };

  const jsonPath = path.join(reviewDir, "classic-wheel-imagery-audit.json");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  const md = [
    "# Classics Wheel imagery audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `- **Total wheel classics:** ${report.total}`,
    `- **Approved + on disk:** ${report.approvedCount}`,
    `- **Placeholder / issues:** ${report.placeholderCount}`,
    `- **Pass:** ${report.pass ? "yes" : "no"}`,
    "",
    "## Recipes",
    "",
    ...rows.map(
      (r) =>
        `- \`${r.slug}\` — **${r.title}** — ${r.imageApproved && r.heroOnDisk ? "approved" : "soft_held"} — \`${r.heroImage || "branded placeholder"}\`${r.issues.length ? ` — issues: ${r.issues.join(", ")}` : ""}`,
    ),
    "",
    ...(errors.length
      ? ["## Errors", "", ...errors.map((e) => `- ${e}`), ""]
      : ["## Errors", "", "- None", ""]),
  ].join("\n");

  const mdPath = path.join(reviewDir, "classic-wheel-imagery-audit.md");
  fs.writeFileSync(mdPath, md + "\n", "utf8");

  console.log(`\nReport → ${path.relative(ROOT, mdPath)}`);

  if (errors.length) {
    console.error("\nAudit FAILED:");
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  console.log("\nAudit passed.");
}

main();
