#!/usr/bin/env tsx
/**
 * Full Classics Wheel audit — content, imagery, UX, and optional auto-fix.
 *
 *   npx tsx scripts/audit-classics-wheel-full.ts
 *   npx tsx scripts/audit-classics-wheel-full.ts --fix
 *   npx tsx scripts/audit-classics-wheel-full.ts --fix --fix-images
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CLASSIC_HALL_MEALS, type ClassicHallMealMeta } from "../shared/classic-hall-meals.js";
import {
  resolveClassicWheelImagery,
  isOwnedCatalogHeroPath,
  isSpoonacularOrExternalHeroUrl,
} from "../shared/classic-wheel-imagery.js";
import { approvedCatalogRecipePath } from "../shared/approved-catalog.js";
import { extractSlugFromImagePath } from "../shared/explore-image-mapping.js";
import { goldenRecipePageSchema, type GoldenRecipePage } from "../shared/golden-100/recipe-page-schema.js";
import { BANNED_STEP_PHRASES } from "../shared/golden-100/recipe-quality/classics-wheel-editorial.js";
import {
  applyClassicsWheelFix,
  CLASSICS_WHEEL_IMAGE_FIX_SLUGS,
  classicHallGoldenHeroPath,
} from "../shared/golden-100/recipe-quality/classics-wheel-fixes.js";
import { scoreRecipeTitle } from "../shared/recipe-title-quality.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const PAGES_DIR = path.join(PUBLIC, "catalog", "golden-100", "pages");
const REVIEW_DIR = path.join(ROOT, "review");
const CLASSIC_HALL_MEALS_PATH = path.join(ROOT, "shared", "classic-hall-meals.ts");

const FIX = process.argv.includes("--fix");
const FIX_IMAGES = process.argv.includes("--fix-images");

const MIN_INGREDIENTS = 8;
const MIN_STEPS = 10;
const MIN_PRO_TIPS = 4;
const MIN_LEFTOVERS = 3;

/** Catalog-only hall classics — not on the 10-segment wheel. */
const CATALOG_ONLY_CLASSICS = [
  { slug: "butter-chicken", title: "Butter Chicken" },
  { slug: "batch-lasagna", title: "Giant Batch Lasagna" },
  { slug: "pepperoni-pizza-night", title: "Pizza Night (Classic Pepperoni Pizza)" },
] as const;

type AuditRow = {
  slug: string;
  title: string;
  pass: boolean;
  imageAccuracyScore: number;
  recipeDetailScore: number;
  realismScore: number;
  route: string;
  pageExists: boolean;
  heroOnDisk: boolean;
  thumbOnDisk: boolean;
  mobileOnDisk: boolean;
  heroMd5: string | null;
  duplicateHeroPeers: string[];
  issues: string[];
  recommendations: string[];
};

function fileExists(publicPath: string): boolean {
  if (!publicPath.startsWith("/")) return false;
  return fs.existsSync(path.join(PUBLIC, publicPath.replace(/^\//, "")));
}

function md5Public(publicPath: string): string | null {
  if (!publicPath.startsWith("/")) return null;
  const abs = path.join(PUBLIC, publicPath.replace(/^\//, ""));
  if (!fs.existsSync(abs)) return null;
  return crypto.createHash("md5").update(fs.readFileSync(abs)).digest("hex");
}

function pageJsonPath(slug: string): string {
  return path.join(PAGES_DIR, `${slug}.json`);
}

function loadPage(slug: string): GoldenRecipePage | null {
  const abs = pageJsonPath(slug);
  if (!fs.existsSync(abs)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(abs, "utf8"));
    return goldenRecipePageSchema.parse(raw);
  } catch {
    return null;
  }
}

function hasCallInterruptionStep(steps: GoldenRecipePage["steps"]): boolean {
  return steps.some(
    (s) =>
      /hold for call/i.test(s.title) ||
      /call interruption/i.test(s.title) ||
      (/tones drop/i.test(s.instruction) && /140°|hold/i.test(s.instruction)),
  );
}

function isStructuredTonightSpread(spread: string[]): boolean {
  if (!spread.length) return false;
  return spread.some((l) => /^main:/i.test(l.trim())) && spread.some((l) => /^sides:/i.test(l.trim()));
}

function bannedStepHits(steps: GoldenRecipePage["steps"]): string[] {
  const hits: string[] = [];
  for (const step of steps) {
    const blob = `${step.title} ${step.instruction}`;
    if (BANNED_STEP_PHRASES.test(blob)) {
      hits.push(step.title);
    }
  }
  return hits;
}

function scoreImageAccuracy(
  meal: ClassicHallMealMeta,
  heroMd5: string | null,
  duplicatePeers: string[],
): { score: number; issues: string[] } {
  const imagery = resolveClassicWheelImagery(meal);
  const issues: string[] = [];
  let score = 100;

  if (!imagery.heroImage && !imagery.imageApproved) {
    issues.push("missing_hero_path");
    score -= 30;
  }
  if (imagery.heroImage && isSpoonacularOrExternalHeroUrl(imagery.heroImage)) {
    issues.push("forbidden_external_hero");
    score -= 40;
  }
  if (imagery.heroImage && !isOwnedCatalogHeroPath(imagery.heroImage)) {
    issues.push("hero_not_owned_path");
    score -= 25;
  }
  if (imagery.heroImage) {
    const pathSlug = extractSlugFromImagePath(imagery.heroImage);
    if (pathSlug && pathSlug !== meal.slug) {
      issues.push(`hero_slug_mismatch:${pathSlug}`);
      score -= 20;
    }
    if (imagery.heroImage.includes("/explore/") && !imagery.heroImage.includes(meal.slug)) {
      issues.push("legacy_explore_hero_path");
      score -= 15;
    }
  }
  if (imagery.imageApproved && !fileExists(imagery.heroImage)) {
    issues.push("hero_missing_on_disk");
    score -= 25;
  }
  if (!fileExists(imagery.thumbImage)) {
    issues.push("thumb_missing_on_disk");
    score -= 15;
  }
  if (!fileExists(imagery.mobileImage)) {
    issues.push("mobile_missing_on_disk");
    score -= 15;
  }
  if (duplicatePeers.length) {
    issues.push(`duplicate_hero:${duplicatePeers.join(",")}`);
    score -= 20;
  }
  if (!heroMd5 && imagery.heroImage) {
    score -= 10;
  }

  return { score: Math.max(0, Math.min(100, score)), issues };
}

function scoreRecipeDetail(
  page: GoldenRecipePage | null,
  meal: ClassicHallMealMeta,
): { score: number; issues: string[] } {
  const issues: string[] = [];
  if (!page) {
    return { score: 0, issues: ["missing_page_json"] };
  }

  let score = 100;

  const title = page.displayTitle || page.title;
  const titleCheck = scoreRecipeTitle(title, {
    mealFormat: meal.mealFormat,
    protein: meal.protein.toLowerCase(),
    cuisine: meal.cuisine.toLowerCase(),
    ingredients: page.ingredients.map((i) => ({ item: i.name, notes: i.notes })),
  });
  const hallTitleCheck = scoreRecipeTitle(meal.title, {
    mealFormat: meal.mealFormat,
    protein: meal.protein.toLowerCase(),
    cuisine: meal.cuisine.toLowerCase(),
    ingredients: page.ingredients.map((i) => ({ item: i.name, notes: i.notes })),
  });
  if (!titleCheck.pass && !hallTitleCheck.pass) {
    issues.push(`title_quality:${titleCheck.messages.slice(0, 2).join("; ") || "fail"}`);
    score -= Math.min(25, 100 - titleCheck.score);
  }

  const ingredientCount = page.ingredients.length;
  if (ingredientCount < MIN_INGREDIENTS) {
    issues.push(`ingredients:${ingredientCount}<${MIN_INGREDIENTS}`);
    score -= 15;
  }

  const stepCount = page.steps.length;
  if (stepCount < MIN_STEPS) {
    issues.push(`steps:${stepCount}<${MIN_STEPS}`);
    score -= 20;
  }

  const banned = bannedStepHits(page.steps);
  if (banned.length) {
    issues.push(`banned_step_phrases:${banned.slice(0, 3).join(", ")}`);
    score -= 15;
  }

  if (!isStructuredTonightSpread(page.tonightSpread)) {
    issues.push("tonightSpread:not_structured");
    score -= 10;
  }

  const proTipCount = page.proTips?.length ?? 0;
  if (proTipCount < MIN_PRO_TIPS) {
    issues.push(`proTips:${proTipCount}<${MIN_PRO_TIPS}`);
    score -= 10;
  }

  const leftoverCount = page.leftovers?.length ?? 0;
  if (leftoverCount < MIN_LEFTOVERS) {
    issues.push(`leftovers:${leftoverCount}<${MIN_LEFTOVERS}`);
    score -= 10;
  }

  if (!hasCallInterruptionStep(page.steps)) {
    issues.push("missing_call_interruption_step");
    score -= 10;
  }

  return { score: Math.max(0, Math.min(100, score)), issues };
}

function buildRecommendations(issues: string[], meal: ClassicHallMealMeta): string[] {
  const recs: string[] = [];
  for (const issue of issues) {
    if (issue.startsWith("missing_page_json")) {
      recs.push(`Generate golden page JSON for \`${meal.slug}\` under catalog/golden-100/pages/.`);
    } else if (issue.startsWith("steps:")) {
      recs.push("Add hall-scale steps including call-interruption and pack-down — run with --fix.");
    } else if (issue.startsWith("ingredients:")) {
      recs.push("Expand ingredient list to at least 8 distinct lines — run with --fix.");
    } else if (issue.startsWith("banned_step_phrases")) {
      recs.push("Replace generic step titles/instructions with dish-specific language.");
    } else if (issue === "tonightSpread:not_structured") {
      recs.push('Structure tonightSpread with "Main:" and "Sides:" lines.');
    } else if (issue.startsWith("proTips:")) {
      recs.push("Add at least 4 proTips with hall-specific timing and hold guidance.");
    } else if (issue.startsWith("leftovers:")) {
      recs.push("Add at least 3 leftovers lines covering cool-down and reheat temps.");
    } else if (issue === "missing_call_interruption_step") {
      recs.push('Insert a "Hold for call interruptions" step with 140°F hold guidance.');
    } else if (issue.includes("legacy_explore_hero") || issue.includes("hero_slug_mismatch")) {
      recs.push(`Pin heroImagePath to ${classicHallGoldenHeroPath(meal.slug)} — run with --fix-images.`);
    } else if (issue.includes("missing_on_disk") || issue.includes("missing_hero")) {
      recs.push("Generate owned golden-100 hero/thumb/mobile assets for this slug.");
    } else if (issue.startsWith("duplicate_hero")) {
      recs.push("Replace duplicate hero image — each wheel segment needs a unique photo.");
    } else if (issue.startsWith("title_quality")) {
      recs.push("Align page title with hall classic displayTitle and craveable naming.");
    } else if (issue === "route_mismatch") {
      recs.push("Ensure slug routes to /recipes/{slug} via approved catalog.");
    }
  }
  return [...new Set(recs)];
}

function applyHeroImagePathFixes(): string[] {
  const applied: string[] = [];
  let src = fs.readFileSync(CLASSIC_HALL_MEALS_PATH, "utf8");

  for (const slug of CLASSICS_WHEEL_IMAGE_FIX_SLUGS) {
    const target = classicHallGoldenHeroPath(slug);
    const slugBlock = new RegExp(
      `(id:\\s*"${slug}"[\\s\\S]*?heroImagePath:\\s*")([^"]+)(")`,
      "m",
    );
    if (!slugBlock.test(src)) {
      continue;
    }
    const before = src;
    src = src.replace(slugBlock, `$1${target}$3`);
    if (src !== before) {
      applied.push(`${slug} → ${target}`);
    }
  }

  if (applied.length) {
    fs.writeFileSync(CLASSIC_HALL_MEALS_PATH, src, "utf8");
    for (const slug of CLASSICS_WHEEL_IMAGE_FIX_SLUGS) {
      const meal = CLASSIC_HALL_MEALS.find((m) => m.slug === slug);
      if (meal) meal.heroImagePath = classicHallGoldenHeroPath(slug);
    }
  }
  return applied;
}

function auditWheel(): {
  rows: AuditRow[];
  duplicateHeroGroups: string[][];
  heroFixesApplied: string[];
  pagesFixed: string[];
} {
  const rows: AuditRow[] = [];
  const heroMd5BySlug = new Map<string, string | null>();
  const pagesFixed: string[] = [];

  const heroFixesApplied = FIX_IMAGES ? applyHeroImagePathFixes() : [];

  for (const meal of CLASSIC_HALL_MEALS) {
    let page = loadPage(meal.slug);

    if (FIX && page) {
      const fixed = goldenRecipePageSchema.parse(
        applyClassicsWheelFix(meal.slug, page, meal.title),
      );
      fs.writeFileSync(pageJsonPath(meal.slug), `${JSON.stringify(fixed, null, 2)}\n`, "utf8");
      pagesFixed.push(meal.slug);
      page = fixed;
    }

    const imagery = resolveClassicWheelImagery(meal);
    const heroOnDisk = imagery.heroImage ? fileExists(imagery.heroImage) : false;
    const thumbOnDisk = fileExists(imagery.thumbImage);
    const mobileOnDisk = fileExists(imagery.mobileImage);
    const heroMd5 = heroOnDisk ? md5Public(imagery.heroImage) : null;
    heroMd5BySlug.set(meal.slug, heroMd5);
  }

  const byMd5 = new Map<string, string[]>();
  for (const [slug, hash] of heroMd5BySlug) {
    if (!hash) continue;
    const list = byMd5.get(hash) || [];
    list.push(slug);
    byMd5.set(hash, list);
  }
  const duplicateHeroGroups = [...byMd5.values()].filter((g) => g.length > 1);

  for (const meal of CLASSIC_HALL_MEALS) {
    const page = loadPage(meal.slug);
    const route = approvedCatalogRecipePath(meal.slug);
    const imagery = resolveClassicWheelImagery(meal);
    const heroOnDisk = imagery.heroImage ? fileExists(imagery.heroImage) : false;
    const thumbOnDisk = fileExists(imagery.thumbImage);
    const mobileOnDisk = fileExists(imagery.mobileImage);
    const heroMd5 = heroOnDisk ? md5Public(imagery.heroImage) : null;

    const duplicateHeroPeers =
      duplicateHeroGroups.find((g) => g.includes(meal.slug))?.filter((s) => s !== meal.slug) ?? [];

    const imageResult = scoreImageAccuracy(meal, heroMd5, duplicateHeroPeers);
    const detailResult = scoreRecipeDetail(page, meal);

    const issues = [...imageResult.issues, ...detailResult.issues];
    if (!page) issues.unshift("missing_page_json");
    if (route !== `/recipes/${meal.slug}`) issues.push("route_mismatch");

    const pass = issues.length === 0;
    const recommendations = buildRecommendations(issues, meal);

    rows.push({
      slug: meal.slug,
      title: meal.title,
      pass,
      imageAccuracyScore: imageResult.score,
      recipeDetailScore: detailResult.score,
      realismScore: page?.realismScore ?? 0,
      route,
      pageExists: Boolean(page),
      heroOnDisk,
      thumbOnDisk,
      mobileOnDisk,
      heroMd5,
      duplicateHeroPeers,
      issues,
      recommendations,
    });
  }

  return { rows, duplicateHeroGroups, heroFixesApplied, pagesFixed };
}

function main(): void {
  console.log("=== Classics Wheel Full Audit ===\n");
  if (FIX) console.log("Mode: --fix (rewriting page JSON where needed)\n");
  if (FIX_IMAGES) console.log("Mode: --fix-images (pinning golden-100 hero paths in classic-hall-meals.ts)\n");

  const { rows, duplicateHeroGroups, heroFixesApplied, pagesFixed } = auditWheel();
  const passCount = rows.filter((r) => r.pass).length;
  const failCount = rows.length - passCount;

  console.log("| Slug | Pass | Img | Detail | Realism |");
  console.log("|------|------|-----|--------|---------|");
  for (const r of rows) {
    console.log(
      `| ${r.slug} | ${r.pass ? "✓" : "✗"} | ${r.imageAccuracyScore} | ${r.recipeDetailScore} | ${r.realismScore} |`,
    );
  }

  console.log(`\nPass: ${passCount}/${rows.length}`);
  if (pagesFixed.length) {
    console.log(`Pages rewritten: ${pagesFixed.join(", ")}`);
  }
  if (heroFixesApplied.length) {
    console.log(`Hero path fixes: ${heroFixesApplied.join("; ")}`);
  }
  if (duplicateHeroGroups.length) {
    console.log("\nDuplicate hero MD5 groups:");
    for (const g of duplicateHeroGroups) console.log(`  ${g.join(" ↔ ")}`);
  }

  fs.mkdirSync(REVIEW_DIR, { recursive: true });

  const report = {
    generatedAt: new Date().toISOString(),
    wheelSegmentCount: CLASSIC_HALL_MEALS.length,
    pass: failCount === 0,
    passCount,
    failCount,
    fixMode: FIX,
    fixImagesMode: FIX_IMAGES,
    pagesFixed,
    heroFixesApplied,
    duplicateHeroGroups,
    catalogOnlyClassics: CATALOG_ONLY_CLASSICS,
    catalogOnlyNote:
      "Butter Chicken, Lasagna (batch-lasagna), and Pizza Night (pepperoni-pizza-night) appear in the hall catalog but are NOT segments on the 10-slot Classics Wheel.",
    rows,
  };

  const jsonPath = path.join(REVIEW_DIR, "classics-wheel-audit.json");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const md = [
    "# Classics Wheel full audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `- **Wheel segments:** ${report.wheelSegmentCount}`,
    `- **Pass:** ${report.passCount}/${rows.length}`,
    `- **Overall pass:** ${report.pass ? "yes" : "no"}`,
    ...(FIX ? [`- **Fix mode:** enabled (${pagesFixed.length} pages rewritten)`] : []),
    ...(FIX_IMAGES ? [`- **Fix-images mode:** enabled`] : []),
    "",
    "## Not on the wheel",
    "",
    "These hall classics exist in the **catalog only** — they are **not** one of the 10 spinning wheel segments:",
    "",
    ...CATALOG_ONLY_CLASSICS.map((c) => `- **${c.title}** (\`${c.slug}\`) — catalog mention only`),
    "",
    "## Recipes",
    "",
    ...rows.map((r) => {
      const status = r.pass ? "pass" : "fail";
      const issueSuffix = r.issues.length ? ` — issues: ${r.issues.join(", ")}` : "";
      return `- \`${r.slug}\` — **${r.title}** — ${status} — img=${r.imageAccuracyScore} detail=${r.recipeDetailScore} realism=${r.realismScore}${issueSuffix}`;
    }),
    "",
    "## Recommendations",
    "",
    ...rows
      .filter((r) => r.recommendations.length)
      .flatMap((r) => r.recommendations.map((rec) => `- \`${r.slug}\`: ${rec}`)),
    ...(rows.every((r) => !r.recommendations.length) ? ["- None — all wheel classics pass."] : []),
    "",
    ...(duplicateHeroGroups.length
      ? [
          "## Duplicate heroes",
          "",
          ...duplicateHeroGroups.map((g) => `- ${g.join(" ↔ ")}`),
          "",
        ]
      : []),
    ...(heroFixesApplied.length
      ? ["## Hero path fixes applied", "", ...heroFixesApplied.map((h) => `- ${h}`), ""]
      : []),
  ].join("\n");

  const mdPath = path.join(REVIEW_DIR, "classics-wheel-audit.md");
  fs.writeFileSync(mdPath, `${md}\n`, "utf8");

  console.log(`\nReport → ${path.relative(ROOT, mdPath)}`);

  if (failCount > 0) {
    console.error("\nAudit FAILED:");
    for (const r of rows.filter((x) => !x.pass)) {
      console.error(`  ✗ ${r.slug}: ${r.issues.join(", ")}`);
    }
    process.exit(1);
  }

  console.log("\nAudit passed.");
}

main();
