#!/usr/bin/env tsx
/**
 * Full production audit for Hall Expansion (30) + new Breakfast (20) recipes.
 *
 *   npm run audit:expansion-production
 *   npm run audit:expansion-production -- --json
 */
import fs from "node:fs";
import path from "node:path";
import { normalizeTitleKey } from "../shared/ingestion/dedupe.js";
import { HALL_EXPANSION_ADAPTED_RECIPES } from "../shared/hall-expansion/adapted/index.js";
import { NEW_BREAKFAST_PAGES } from "../shared/breakfast-expansion/new-breakfast-pages.js";
import { buildAllHallExpansionPages } from "../server/hall-expansion/page-builder.js";
import { validateGoldenRecipePage } from "../server/golden-100/recipe-page-validator.js";
import { auditGoldenRecipeContent } from "../shared/golden-100/recipe-quality/audit.js";
import { listHallExpansionPageSlugs, HALL_EXPANSION_CATALOG_PAGES_DIR } from "../server/hall-expansion/page-store.js";
import { GOLDEN_CATALOG_PUBLIC_DIR } from "../server/golden-100/page-store.js";
import { PERFORMANCE_CATALOG_PUBLIC_DIR } from "../server/performance-meals/page-store.js";

const ROOT = process.cwd();
const BREAKFAST_DIR = path.join(ROOT, "client/public/catalog/breakfast/pages");
const REVIEW_DIR = path.join(ROOT, "review");

type Issue = { slug: string; phase: string; severity: "error" | "warn"; code: string; message: string };

function readIndexSlugs(indexPath: string): Array<{ slug: string; title: string; heroImage?: string }> {
  if (!fs.existsSync(indexPath)) return [];
  const data = JSON.parse(fs.readFileSync(indexPath, "utf8")) as {
    recipes?: Array<{ slug: string; title: string; heroImage?: string }>;
  };
  return data.recipes ?? [];
}

function diskExists(publicPath: string): boolean {
  const rel = publicPath.replace(/^\//, "");
  return fs.existsSync(path.join(ROOT, "client/public", rel));
}

function fileSize(publicPath: string): number {
  const rel = publicPath.replace(/^\//, "");
  const p = path.join(ROOT, "client/public", rel);
  return fs.existsSync(p) ? fs.statSync(p).size : 0;
}

function ingredientNames(page: { ingredients: Array<{ name: string }> }): string[] {
  return page.ingredients.map((i) => i.name.toLowerCase());
}

function stepText(page: { steps: Array<{ instruction: string; title?: string }> }): string {
  return page.steps.map((s) => `${s.title ?? ""} ${s.instruction}`).join(" ").toLowerCase();
}

function auditBreakfastContent(page: (typeof NEW_BREAKFAST_PAGES)[0]): Issue[] {
  const issues: Issue[] = [];
  const slug = page.slug;

  if (!page.steps?.length) {
    issues.push({ slug, phase: "content", severity: "error", code: "no_steps", message: "No steps" });
  }
  if (!page.ingredients?.length) {
    issues.push({ slug, phase: "content", severity: "error", code: "no_ingredients", message: "No ingredients" });
  }
  if ((page.prepTime ?? 0) + (page.cookTime ?? 0) <= 0) {
    issues.push({ slug, phase: "content", severity: "error", code: "no_timing", message: "Missing prep/cook time" });
  }
  if (!page.crewSize && !page.baseServings) {
    issues.push({ slug, phase: "station", severity: "warn", code: "no_crew_size", message: "No crew size" });
  }

  const joined = stepText(page);
  const vague = page.steps.filter((s) => /\bcook (the )?(chicken|meat|steak|pork|eggs)\b/i.test(s.instruction) && s.instruction.length < 80);
  for (const s of vague) {
    issues.push({
      slug,
      phase: "rookie",
      severity: "warn",
      code: "vague_step",
      message: `Step ${s.stepNumber} may be too vague: "${s.title}"`,
    });
  }

  if (!/\d+\s*°?\s*f/i.test(joined) && /chicken|pork|turkey|sausage|beef|egg/i.test(joined)) {
    issues.push({
      slug,
      phase: "content",
      severity: "warn",
      code: "missing_temp",
      message: "Protein present but no °F temperature in steps",
    });
  }

  for (const ing of page.ingredients) {
    const name = ing.name.toLowerCase();
    if (name.length > 3 && !joined.includes(name.split(" ")[0]!) && !joined.includes(name.slice(0, 6))) {
      const common = ["salt", "pepper", "oil", "butter", "water", "garlic", "onion"];
      if (!common.some((c) => name.includes(c))) {
        issues.push({
          slug,
          phase: "content",
          severity: "warn",
          code: "orphan_ingredient",
          message: `Ingredient may be unused in steps: ${ing.name}`,
        });
      }
    }
  }

  if (!page.description || page.description.length < 40) {
    issues.push({ slug, phase: "seo", severity: "warn", code: "short_description", message: "Description too short" });
  }

  return issues;
}

function main(): void {
  const jsonOut = process.argv.includes("--json");
  const issues: Issue[] = [];
  const inventory: Array<{
    name: string;
    slug: string;
    category: string;
    catalog: string;
    imagePath: string;
    published: boolean;
    heroBytes: number;
    thumbOk: boolean;
    mobileOk: boolean;
  }> = [];

  const golden = readIndexSlugs(path.join(GOLDEN_CATALOG_PUBLIC_DIR, "index.json"));
  const perf = readIndexSlugs(path.join(PERFORMANCE_CATALOG_PUBLIC_DIR, "index.json"));
  const breakfastIndex = readIndexSlugs(path.join(ROOT, "client/public/catalog/breakfast/index.json"));
  const expansionPages = buildAllHallExpansionPages();

  const allBaseline = [...golden, ...perf, ...breakfastIndex.filter((r) => !NEW_BREAKFAST_PAGES.some((n) => n.slug === r.slug))];
  const baselineSlugs = new Set(allBaseline.map((r) => r.slug));
  const baselineTitles = new Map<string, string>();
  for (const r of allBaseline) {
    const k = normalizeTitleKey(r.title);
    if (!baselineTitles.has(k)) baselineTitles.set(k, r.slug);
  }

  // Phase 1 — inventory
  for (const def of HALL_EXPANSION_ADAPTED_RECIPES) {
    const page = expansionPages.find((p) => p.slug === def.slug);
    if (!page) {
      issues.push({ slug: def.slug, phase: "inventory", severity: "error", code: "missing_page", message: "Page not built" });
      continue;
    }
    if (baselineSlugs.has(def.slug)) {
      issues.push({ slug: def.slug, phase: "inventory", severity: "error", code: "slug_collision", message: "Slug exists in baseline catalog" });
    }
    const titleKey = normalizeTitleKey(def.title);
    const hit = baselineTitles.get(titleKey);
    if (hit && hit !== def.slug) {
      issues.push({ slug: def.slug, phase: "inventory", severity: "error", code: "title_collision", message: `Title collision with ${hit}` });
    }

    const onDisk = fs.existsSync(path.join(HALL_EXPANSION_CATALOG_PAGES_DIR, `${def.slug}.json`));
    inventory.push({
      name: def.title,
      slug: def.slug,
      category: def.category,
      catalog: "hall-expansion",
      imagePath: page.heroImage,
      published: onDisk,
      heroBytes: fileSize(page.heroImage),
      thumbOk: diskExists(page.thumbImage),
      mobileOk: diskExists(page.mobileImage ?? page.heroImage.replace("/images/hall-expansion/", "/images/mobile/hall-expansion/")),
    });

    const validation = validateGoldenRecipePage(page);
    for (const v of validation.issues.filter((i) => i.severity === "error")) {
      issues.push({ slug: def.slug, phase: "content", severity: "error", code: v.code, message: v.message });
    }
    const audit = auditGoldenRecipeContent(page);
    for (const a of audit.issues.filter((i) => i.severity === "error")) {
      issues.push({ slug: def.slug, phase: "content", severity: "error", code: a.code, message: a.message });
    }
    for (const a of audit.issues.filter((i) => i.severity === "warn")) {
      issues.push({ slug: def.slug, phase: "content", severity: "warn", code: a.code, message: a.message });
    }
  }

  const newBreakfastSlugs = new Set(NEW_BREAKFAST_PAGES.map((p) => p.slug));
  for (const page of NEW_BREAKFAST_PAGES) {
    const idx = breakfastIndex.find((r) => r.slug === page.slug);
    const onDisk = fs.existsSync(path.join(BREAKFAST_DIR, `${page.slug}.json`));
    if (!idx) {
      issues.push({ slug: page.slug, phase: "inventory", severity: "error", code: "missing_index", message: "Not in breakfast index" });
    }
    if (!onDisk) {
      issues.push({ slug: page.slug, phase: "inventory", severity: "error", code: "missing_json", message: "Breakfast page JSON missing" });
    }

    inventory.push({
      name: page.title,
      slug: page.slug,
      category: "firehall_breakfasts",
      catalog: "breakfast",
      imagePath: page.heroImage,
      published: onDisk && !!idx,
      heroBytes: fileSize(page.heroImage),
      thumbOk: diskExists(page.thumbImage),
      mobileOk: false,
    });

    issues.push(...auditBreakfastContent(page));
  }

  // Phase 2-3 — images
  const heroPaths = new Map<string, string[]>();
  for (const row of inventory) {
    if (!diskExists(row.imagePath)) {
      issues.push({
        slug: row.slug,
        phase: "image",
        severity: "error",
        code: "missing_hero",
        message: `Hero missing: ${row.imagePath}`,
      });
    } else if (row.heroBytes < 50_000) {
      issues.push({
        slug: row.slug,
        phase: "image",
        severity: "warn",
        code: "small_hero",
        message: `Hero suspiciously small (${row.heroBytes} bytes)`,
      });
    }
    if (!row.thumbOk) {
      issues.push({
        slug: row.slug,
        phase: "image",
        severity: "warn",
        code: "missing_thumb",
        message: "Thumb variant missing",
      });
    }
    const list = heroPaths.get(row.imagePath) ?? [];
    list.push(row.slug);
    heroPaths.set(row.imagePath, list);
  }
  for (const [img, slugs] of heroPaths) {
    if (slugs.length > 1) {
      for (const s of slugs) {
        issues.push({
          slug: s,
          phase: "image",
          severity: "error",
          code: "duplicate_image",
          message: `Shares hero with: ${slugs.filter((x) => x !== s).join(", ")} (${img})`,
        });
      }
    }
  }

  // Orphan JSON in breakfast (old placeholders)
  if (fs.existsSync(BREAKFAST_DIR)) {
    for (const f of fs.readdirSync(BREAKFAST_DIR).filter((x) => x.endsWith(".json"))) {
      const slug = f.replace(/\.json$/, "");
      if (slug.startsWith("station-breakfast-") && !breakfastIndex.some((r) => r.slug === slug)) {
        issues.push({
          slug,
          phase: "inventory",
          severity: "warn",
          code: "orphan_json",
          message: "Orphan placeholder breakfast JSON on disk",
        });
      }
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warns = issues.filter((i) => i.severity === "warn");
  const passCount = inventory.length - new Set(errors.map((e) => e.slug)).size;
  const score = Math.round((passCount / inventory.length) * 100);

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      recipesAudited: inventory.length,
      hallExpansion: HALL_EXPANSION_ADAPTED_RECIPES.length,
      breakfastNew: NEW_BREAKFAST_PAGES.length,
      errors: errors.length,
      warnings: warns.length,
      heroesOnDisk: inventory.filter((r) => r.heroBytes > 0).length,
      thumbsOnDisk: inventory.filter((r) => r.thumbOk).length,
      productionReadinessScore: score,
    },
    inventory,
    issues,
    errorsByPhase: Object.fromEntries(
      [...new Set(issues.map((i) => i.phase))].map((phase) => [
        phase,
        { errors: issues.filter((i) => i.phase === phase && i.severity === "error").length, warnings: issues.filter((i) => i.phase === phase && i.severity === "warn").length },
      ]),
    ),
  };

  fs.mkdirSync(REVIEW_DIR, { recursive: true });
  fs.writeFileSync(path.join(REVIEW_DIR, "expansion-production-audit.json"), JSON.stringify(report, null, 2));

  const md = [
    "# Expansion Production Audit",
    "",
    `Generated: **${report.generatedAt}**`,
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "|--------|------:|",
    `| Recipes audited | ${report.totals.recipesAudited} |`,
    `| Heroes on disk | ${report.totals.heroesOnDisk} |`,
    `| Thumbs on disk | ${report.totals.thumbsOnDisk} |`,
    `| Errors | ${report.totals.errors} |`,
    `| Warnings | ${report.totals.warnings} |`,
    `| **Production readiness** | **${score}%** |`,
    "",
    "## Inventory",
    "",
    "| Recipe | Slug | Category | Image | Published |",
    "|--------|------|----------|-------|-----------|",
    ...inventory.map(
      (r) =>
        `| ${r.name} | \`${r.slug}\` | ${r.category} | ${r.heroBytes > 0 ? "✓" : "✗"} | ${r.published ? "✓" : "✗"} |`,
    ),
    "",
    "## Errors",
    "",
    ...(errors.length
      ? errors.map((e) => `- **${e.slug}** [${e.phase}/${e.code}]: ${e.message}`)
      : ["None"]),
    "",
    "## Warnings (top 30)",
    "",
    ...(warns.slice(0, 30).map((w) => `- **${w.slug}** [${w.phase}/${w.code}]: ${w.message}`)),
    warns.length > 30 ? `\n_…and ${warns.length - 30} more warnings_` : "",
  ].join("\n");

  fs.writeFileSync(path.join(REVIEW_DIR, "expansion-production-audit.md"), md);

  console.log(`[audit:expansion-production] audited=${inventory.length} errors=${errors.length} warnings=${warns.length} score=${score}%`);
  if (jsonOut) console.log(JSON.stringify(report.totals, null, 2));
  process.exit(errors.length > 0 ? 1 : 0);
}

main();
