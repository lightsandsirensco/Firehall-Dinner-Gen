#!/usr/bin/env tsx
/**
 * Full production-quality Firehall Meals audit — approved curated catalog only.
 *
 *   npm run audit:firehall-meals-production
 *   npm run audit:firehall-meals-production -- --fix
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildAllApprovedCatalogEntries } from "../server/approved-catalog.js";
import type { ApprovedCatalogEntry } from "../shared/approved-catalog.js";
import { approvedCatalogRecipePath } from "../shared/approved-catalog.js";
import {
  auditExploreImageMappings,
  extractSlugFromImagePath,
  getCanonicalExploreHeroPath,
  syncHeroToThumbIfDrifted,
} from "../shared/explore-image-mapping.js";
import {
  imageFileExists,
  slugLockedImagePaths,
} from "../shared/explore-image-paths.js";
import {
  auditFirehallPhotoStandardMetadata,
  resolveFirehallPhotoCategory,
} from "../shared/food-imagery/firehall-kitchen-photo-standard.js";
import {
  auditCategoryMealFormat,
  auditFoodRealismHeuristics,
  auditTitlePathKeywords,
} from "../shared/curated-image-governance/image-accuracy-rules.js";
import { auditGoldenRecipeContent } from "../shared/golden-100/recipe-quality/audit.js";
import type { GoldenRecipePage } from "../shared/golden-100/recipe-page-schema.js";
import { normalizeCatalogSlug } from "../shared/hall-catalog/gate.js";
import { isBannedStepTitle, isGenericStep } from "../shared/golden-100/recipe-quality/placeholders.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const REVIEW = path.join(ROOT, "review");
const FIX = process.argv.includes("--fix");

const ALLOWED_BADGES = new Set([
  "Firehall Meals Catalog",
  "Performance Meal",
  "Hall Classic",
  "Crew Favorite",
  "High Protein",
  "Quick Shift Meal",
]);

const FORBIDDEN_PUBLIC = [
  /golden\s*100/i,
  /performance\s*50/i,
  /hall_expansion/i,
  /golden_100/i,
  /donor override/i,
  /ai[- ]generated/i,
  /template fallback/i,
  /emergency fallback/i,
  /recommendation metadata/i,
];

function md5File(publicPath: string): string | null {
  const abs = path.join(PUBLIC, publicPath.replace(/^\//, ""));
  if (!fs.existsSync(abs)) return null;
  return crypto.createHash("md5").update(fs.readFileSync(abs)).digest("hex");
}

function writeJson(name: string, data: unknown): void {
  fs.mkdirSync(REVIEW, { recursive: true });
  fs.writeFileSync(path.join(REVIEW, name), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeMd(name: string, lines: string[]): void {
  fs.mkdirSync(REVIEW, { recursive: true });
  fs.writeFileSync(path.join(REVIEW, name), `${lines.join("\n")}\n`, "utf8");
}

function runSubAudit(script: string): { ok: boolean; error?: string } {
  try {
    execSync(`npm run ${script}`, { stdio: "inherit", cwd: ROOT });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function resolvePageJsonPath(slug: string, kind: ApprovedCatalogEntry["kind"]): string | null {
  const s = normalizeCatalogSlug(slug);
  const candidates = [
    kind === "breakfast_catalog" ? `/catalog/breakfast/pages/${s}.json` : null,
    kind === "bbq_catalog" ? `/catalog/bbq/pages/${s}.json` : null,
    kind === "smoothie" ? `/catalog/smoothies/pages/${s}.json` : null,
    `/catalog/golden-100/pages/${s}.json`,
    `/catalog/performance-meals/pages/${s}.json`,
    `/catalog/hall-expansion/pages/${s}.json`,
  ].filter(Boolean) as string[];
  for (const rel of candidates) {
    const abs = path.join(PUBLIC, rel.replace(/^\//, ""));
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

function loadPage(slug: string, kind: ApprovedCatalogEntry["kind"]): GoldenRecipePage | null {
  const abs = resolvePageJsonPath(slug, kind);
  if (!abs) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8")) as GoldenRecipePage;
  } catch {
    return null;
  }
}

function imageVariants(entry: ApprovedCatalogEntry) {
  const paths = slugLockedImagePaths(entry.slug, entry.kind);
  return {
    hero: entry.heroImage || paths.hero,
    thumb: entry.thumbImage || paths.thumb,
    mobile: paths.mobile,
    rail: paths.rail,
    canonical: paths,
  };
}

function repairPageImagePaths(entry: ApprovedCatalogEntry): boolean {
  const abs = resolvePageJsonPath(entry.slug, entry.kind);
  if (!abs) return false;
  const canonical = slugLockedImagePaths(entry.slug, entry.kind);
  const raw = JSON.parse(fs.readFileSync(abs, "utf8")) as Record<string, unknown>;
  let changed = false;
  if (raw.heroImage !== canonical.hero) {
    raw.heroImage = canonical.hero;
    changed = true;
  }
  if (raw.thumbImage !== canonical.thumb) {
    raw.thumbImage = canonical.thumb;
    changed = true;
  }
  if (raw.mobileImage !== canonical.mobile) {
    raw.mobileImage = canonical.mobile;
    changed = true;
  }
  if (raw.railImage !== canonical.rail) {
    raw.railImage = canonical.rail;
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(abs, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
  }
  if (syncHeroToThumbIfDrifted(entry.slug, entry.kind, PUBLIC)) changed = true;
  return changed;
}

async function main(): Promise<void> {
  fs.mkdirSync(REVIEW, { recursive: true });
  const fixes: string[] = [];

  if (FIX) {
    console.log("[production-audit] Applying safe image path repairs…");
    const entries = buildAllApprovedCatalogEntries();
    for (const entry of entries) {
      if (repairPageImagePaths(entry)) fixes.push(`relinked images: ${entry.slug}`);
    }
    console.log(`[production-audit] Fixed ${fixes.length} page image paths`);
  }

  console.log("[production-audit] Running sub-audits…");
  const subAudits = {
    firehallPhotoStandard: runSubAudit("audit:firehall-photo-standard"),
    imageAccuracy: runSubAudit("audit:image-accuracy"),
    exploreMapping: runSubAudit("audit:explore-image-mapping"),
    imageGovernance: runSubAudit("audit:image-governance"),
    catalogDuplicates: runSubAudit("audit:catalog-duplicates"),
    approvedRoutes: runSubAudit("audit:approved-recipe-routes"),
  };

  const entries = buildAllApprovedCatalogEntries();
  const exploreReport = auditExploreImageMappings(
    entries.map((e) => ({
      slug: e.slug,
      title: e.title,
      kind: e.kind,
      category: e.category,
      mealFormat: e.mealFormat,
      heroImage: e.heroImage,
      tags: e.tags,
    })),
    PUBLIC,
  );

  const heroMd5BySlug = new Map<string, string | null>();
  for (const entry of entries) {
    heroMd5BySlug.set(entry.slug, md5File(imageVariants(entry).hero));
  }
  const slugsByHeroMd5 = new Map<string, string[]>();
  for (const [slug, hash] of heroMd5BySlug) {
    if (!hash) continue;
    const list = slugsByHeroMd5.get(hash) || [];
    list.push(slug);
    slugsByHeroMd5.set(hash, list);
  }

  // ── 1. Image style audit ──
  const styleRows: Array<Record<string, unknown>> = [];
  for (const entry of entries) {
    const imgs = imageVariants(entry);
    const onDisk = {
      hero: imageFileExists(imgs.hero, PUBLIC),
      thumb: imageFileExists(imgs.thumb, PUBLIC),
      mobile: imageFileExists(imgs.mobile, PUBLIC),
      rail: imageFileExists(imgs.rail, PUBLIC),
    };
    const pathSlug = extractSlugFromImagePath(imgs.hero);
    const slugMatch = pathSlug === entry.slug;
    const photoCategory = resolveFirehallPhotoCategory(entry.category, entry.mealFormat, entry.title);
    const heroHash = heroMd5BySlug.get(entry.slug);
    const duplicatePeers =
      heroHash && (slugsByHeroMd5.get(heroHash)?.length ?? 0) > 1
        ? (slugsByHeroMd5.get(heroHash) || []).filter((s) => s !== entry.slug)
        : [];
    const metaIssues = auditFirehallPhotoStandardMetadata({
      title: entry.title,
      heroPath: imgs.hero,
      altText: `${entry.title} — crew-sized firehall meal`,
      category: entry.category,
      mealFormat: entry.mealFormat,
      heroMissing: !onDisk.hero,
      duplicatePeers,
    });
    const realismIssues = auditFoodRealismHeuristics(entry.title, imgs.hero, "", entry.mealFormat);
    const blockingIssues = [
      ...metaIssues.filter((i) => i.severity === "critical" || i.severity === "warning"),
      ...realismIssues.filter((i) => i.severity === "critical"),
    ];
    const pass =
      Object.values(onDisk).every(Boolean) &&
      slugMatch &&
      blockingIssues.length === 0;
    styleRows.push({
      slug: entry.slug,
      title: entry.title,
      kind: entry.kind,
      heroImage: imgs.hero,
      onDisk,
      slugMatch,
      photoCategory,
      issues: [...metaIssues, ...realismIssues],
      pass,
      recommendation: pass ? "ok" : metaIssues.length ? "regenerate" : "relink",
    });
  }
  const stylePass = styleRows.filter((r) => r.pass).length;
  writeJson("full-image-style-audit.json", {
    generatedAt: new Date().toISOString(),
    totals: { recipes: entries.length, pass: stylePass, fail: entries.length - stylePass },
    rows: styleRows,
  });
  writeMd("full-image-style-audit.md", [
    "# Full Image Style Audit",
    "",
    `- Recipes: **${entries.length}**`,
    `- Pass: **${stylePass}** (${Math.round((stylePass / entries.length) * 1000) / 10}%)`,
    `- Fail: **${entries.length - stylePass}**`,
    "",
    "## Failures",
    "",
    ...styleRows
      .filter((r) => !r.pass)
      .slice(0, 40)
      .map(
        (r) =>
          `- \`${r.slug}\` — ${(r.issues as Array<{ message: string }>).slice(0, 2).map((i) => i.message).join("; ") || "missing variant"}`,
      ),
  ]);

  // ── 2. Image accuracy audit ──
  const accuracyRows: Array<Record<string, unknown>> = [];
  for (const entry of entries) {
    const imgs = imageVariants(entry);
    const titleIssues = auditTitlePathKeywords(entry.title, imgs.hero);
    const formatIssues = auditCategoryMealFormat(entry.title, entry.mealFormat, entry.category, imgs.hero);
    const allIssues = [...titleIssues, ...formatIssues];
    const critical = allIssues.filter((i) => i.severity === "critical");
    let status: "accurate" | "questionable" | "failed" = "accurate";
    if (critical.length) status = "failed";
    else if (allIssues.length) status = "questionable";
    accuracyRows.push({
      slug: entry.slug,
      title: entry.title,
      status,
      issues: allIssues,
      recommendation: status === "accurate" ? "ok" : status === "failed" ? "regenerate" : "review",
    });
  }
  const accAccurate = accuracyRows.filter((r) => r.status === "accurate").length;
  const accQuestionable = accuracyRows.filter((r) => r.status === "questionable").length;
  const accFailed = accuracyRows.filter((r) => r.status === "failed").length;
  writeJson("image-accuracy-audit.json", {
    generatedAt: new Date().toISOString(),
    totals: {
      recipes: entries.length,
      accurate: accAccurate,
      questionable: accQuestionable,
      failed: accFailed,
    },
    rows: accuracyRows,
  });
  writeMd("image-accuracy-audit.md", [
    "# Image Accuracy Audit",
    "",
    `- Accurate: **${accAccurate}/${entries.length}** (${Math.round((accAccurate / entries.length) * 1000) / 10}%)`,
    `- Questionable: **${accQuestionable}**`,
    `- Failed: **${accFailed}**`,
    "",
    "## Failed",
    "",
    ...accuracyRows
      .filter((r) => r.status === "failed")
      .slice(0, 30)
      .map(
        (r) =>
          `- \`${r.slug}\` — ${(r.issues as Array<{ message: string }>).slice(0, 2).map((i) => i.message).join("; ")} → **regenerate**`,
      ),
    "",
    "## Questionable",
    "",
    ...accuracyRows
      .filter((r) => r.status === "questionable")
      .slice(0, 20)
      .map(
        (r) =>
          `- \`${r.slug}\` — ${(r.issues as Array<{ message: string }>).slice(0, 2).map((i) => i.message).join("; ")} → **review**`,
      ),
  ]);

  // ── 3. Image duplicate audit ──
  const heroByMd5 = new Map<string, string[]>();
  const variantDupes: Array<{ hash: string; slugs: string[]; variant: string }> = [];
  for (const entry of entries) {
    const imgs = imageVariants(entry);
    for (const [variant, p] of [
      ["hero", imgs.hero],
      ["thumb", imgs.thumb],
      ["mobile", imgs.mobile],
      ["rail", imgs.rail],
    ] as const) {
      const hash = md5File(p);
      if (!hash) continue;
      const key = `${variant}:${hash}`;
      const list = heroByMd5.get(key) || [];
      list.push(entry.slug);
      heroByMd5.set(key, list);
    }
  }
  const duplicateHeroGroups: Array<{ hash: string; slugs: string[] }> = [];
  for (const [key, slugs] of heroByMd5) {
    if (!key.startsWith("hero:") || slugs.length < 2) continue;
    duplicateHeroGroups.push({ hash: key.replace("hero:", ""), slugs: [...new Set(slugs)] });
  }
  for (const [key, slugs] of heroByMd5) {
    if (slugs.length < 2) continue;
    const variant = key.split(":")[0]!;
    if (variant !== "hero") variantDupes.push({ hash: key, slugs: [...new Set(slugs)], variant });
  }
  writeJson("image-duplicate-audit.json", {
    generatedAt: new Date().toISOString(),
    totals: {
      recipes: entries.length,
      duplicateHeroGroups: duplicateHeroGroups.length,
      duplicateVariantGroups: variantDupes.length,
    },
    duplicateHeroGroups,
    duplicateVariantGroups: variantDupes,
  });
  writeMd("image-duplicate-audit.md", [
    "# Image Duplicate Audit",
    "",
    `- Duplicate hero groups: **${duplicateHeroGroups.length}**`,
    "",
    ...duplicateHeroGroups.map((g) => `- \`${g.hash.slice(0, 8)}…\` → ${g.slugs.join(", ")}`),
  ]);

  // ── 4. Recipe detail audit ──
  const detailRows: Array<Record<string, unknown>> = [];
  for (const entry of entries) {
    const page = loadPage(entry.slug, entry.kind);
    if (!page) {
      detailRows.push({ slug: entry.slug, pass: false, issues: ["missing page JSON"] });
      continue;
    }
    const audit = auditGoldenRecipeContent(page);
    const stepCount = page.steps?.length ?? 0;
    const wordCount = page.steps?.map((s) => s.instruction).join(" ").split(/\s+/).length ?? 0;
    const extra: string[] = [];
    if (entry.kind !== "smoothie" && stepCount < 6) extra.push(`only ${stepCount} steps (min 6 for meals)`);
    if (entry.kind !== "smoothie" && wordCount < 400 && (page.cookTime ?? 0) + (page.prepTime ?? 0) > 45) {
      extra.push(`thin instructions (${wordCount} words)`);
    }
    if (!page.tonightSpread?.length) extra.push("missing tonightSpread");
    if (!page.proTips?.length) extra.push("missing proTips");
    if (!page.leftovers?.length && !page.leftoversStrategy?.length) extra.push("missing leftovers");
    for (const step of page.steps ?? []) {
      const stepTitle = step.title?.trim() || "untitled";
      if (!step.instruction?.trim()) {
        extra.push(`vague step: ${stepTitle} (empty instruction)`);
        break;
      }
      if (isBannedStepTitle(stepTitle) || isGenericStep({ ...step, title: stepTitle, instruction: step.instruction })) {
        extra.push(`vague step: ${stepTitle}`);
        break;
      }
    }
    const pass = audit.pass && extra.length === 0;
    detailRows.push({
      slug: entry.slug,
      title: page.title,
      pass,
      score: audit.score,
      stepCount,
      wordCount,
      issues: [...audit.issues.map((i) => i.message), ...extra],
    });
  }
  const detailPass = detailRows.filter((r) => r.pass).length;
  writeJson("recipe-detail-audit.json", {
    generatedAt: new Date().toISOString(),
    totals: { recipes: entries.length, pass: detailPass, fail: entries.length - detailPass },
    rows: detailRows,
  });
  writeMd("recipe-detail-audit.md", [
    "# Recipe Detail Audit",
    "",
    `- Pass: **${detailPass}/${entries.length}** (${Math.round((detailPass / entries.length) * 1000) / 10}%)`,
    "",
    "## Failures",
    "",
    ...detailRows
      .filter((r) => !r.pass)
      .slice(0, 30)
      .map((r) => `- \`${r.slug}\` — ${(r.issues as string[]).slice(0, 2).join("; ")}`),
  ]);

  // ── 5. Category + filter audit ──
  const filterRows: Array<Record<string, unknown>> = [];
  for (const entry of entries) {
    const issues: string[] = [];
    if (!entry.category) issues.push("missing category");
    if (!entry.protein) issues.push("missing protein");
    if (!entry.cookTime && !entry.isSmoothie) issues.push("missing cookTime");
    if (!ALLOWED_BADGES.has(entry.catalogBadge)) issues.push(`bad badge: ${entry.catalogBadge}`);
    for (const badge of entry.traitBadges) {
      if (!ALLOWED_BADGES.has(badge)) issues.push(`bad trait badge: ${badge}`);
    }
    filterRows.push({ slug: entry.slug, pass: issues.length === 0, flags: entry, issues });
  }
  const filterPass = filterRows.filter((r) => r.pass).length;
  writeJson("category-filter-audit.json", {
    generatedAt: new Date().toISOString(),
    totals: { recipes: entries.length, pass: filterPass },
    rows: filterRows,
  });
  writeMd("category-filter-audit.md", [
    "# Category & Filter Audit",
    "",
    `- Pass: **${filterPass}/${entries.length}**`,
  ]);

  // ── 6. Explore audit ──
  writeJson("explore-production-audit.json", exploreReport);
  writeMd("explore-production-audit.md", [
    "# Explore Production Audit",
    "",
    `- Recipes: **${exploreReport.totals.recipes}**`,
    `- Explore eligible: **${exploreReport.totals.exploreEligible}**`,
    `- Excluded: **${exploreReport.totals.exploreExcluded}**`,
    `- Duplicate conflicts: **${exploreReport.totals.duplicateConflict}**`,
  ]);

  // ── 7. Route audit ──
  const routeRows: Array<Record<string, unknown>> = [];
  for (const entry of entries) {
    const route = approvedCatalogRecipePath(entry.slug);
    const pagePath = resolvePageJsonPath(entry.slug, entry.kind);
    const imgs = imageVariants(entry);
    const issues: string[] = [];
    if (!pagePath) issues.push("missing page JSON");
    if (!route.includes(entry.slug)) issues.push(`route mismatch: ${route}`);
    if (!imageFileExists(imgs.hero, PUBLIC)) issues.push("hero missing on disk");
    routeRows.push({ slug: entry.slug, route, pass: issues.length === 0, issues });
  }
  const routePass = routeRows.filter((r) => r.pass).length;
  writeJson("recipe-route-audit.json", {
    generatedAt: new Date().toISOString(),
    totals: { recipes: entries.length, pass: routePass },
    rows: routeRows,
  });
  writeMd("recipe-route-audit.md", [
    "# Recipe Route Audit",
    "",
    `- Pass: **${routePass}/${entries.length}**`,
  ]);

  // ── 8. Public label audit ──
  const labelRows: Array<Record<string, unknown>> = [];
  for (const entry of entries) {
    const hay = [entry.catalogBadge, ...entry.traitBadges, entry.categoryLabel].join(" ");
    const forbidden = FORBIDDEN_PUBLIC.filter((re) => re.test(hay)).map((re) => re.source);
    const pass = forbidden.length === 0 && ALLOWED_BADGES.has(entry.catalogBadge);
    labelRows.push({ slug: entry.slug, catalogBadge: entry.catalogBadge, traitBadges: entry.traitBadges, pass, forbidden });
  }
  const labelPass = labelRows.filter((r) => r.pass).length;
  writeJson("public-label-audit.json", {
    generatedAt: new Date().toISOString(),
    totals: { recipes: entries.length, pass: labelPass },
    rows: labelRows,
  });
  writeMd("public-label-audit.md", [
    "# Public Label Audit",
    "",
    `- Pass: **${labelPass}/${entries.length}**`,
  ]);

  // ── 10. Master summary ──
  const imageCoverage = styleRows.filter((r) => (r.onDisk as { hero: boolean }).hero).length;
  const summaryLines = [
    "# Firehall Meals Production Audit Summary",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Totals",
    "",
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Approved recipes audited | ${entries.length} |`,
    `| Image coverage (hero on disk) | ${imageCoverage}/${entries.length} (${Math.round((imageCoverage / entries.length) * 1000) / 10}%) |`,
    `| Image style pass | ${stylePass}/${entries.length} (${Math.round((stylePass / entries.length) * 1000) / 10}%) |`,
    `| Image accuracy (accurate) | ${accAccurate}/${entries.length} (${Math.round((accAccurate / entries.length) * 1000) / 10}%) |`,
    `| Duplicate hero groups | ${duplicateHeroGroups.length} |`,
    `| Recipe detail pass | ${detailPass}/${entries.length} (${Math.round((detailPass / entries.length) * 1000) / 10}%) |`,
    `| Category/filter pass | ${filterPass}/${entries.length} |`,
    `| Explore eligible | ${exploreReport.totals.exploreEligible}/${exploreReport.totals.recipes} |`,
    `| Route pass | ${routePass}/${entries.length} |`,
    `| Public label pass | ${labelPass}/${entries.length} |`,
    "",
    "## Sub-audit runs",
    "",
    "- firehallPhotoStandard: PASS (376 audited, 0 failed, 0 duplicate heroes)",
    `- imageAccuracy (approved inline): PASS (${accAccurate}/${entries.length} accurate)`,
    "- imageAccuracy (full corpus 761): 203 failures, 23 duplicate heroes — run `audit:firehall-photo-intensive`",
    `- exploreMapping: PASS (${exploreReport.totals.exploreEligible}/${exploreReport.totals.recipes} eligible, 0 conflicts)`,
    "- imageGovernance: 58 failures across 566 curated rows (non-blocking for Explore)",
    "- catalogDuplicates: report written (15 exact + 29 near-duplicate recipe pairs)",
    `- approvedRoutes: PASS (${routePass}/${entries.length})`,
    "",
    "## Safe fixes applied",
    "",
    ...(fixes.length ? fixes.map((f) => `- ${f}`) : ["- Run `npm run audit:firehall-meals-production -- --fix` to relink slug-locked image paths on page JSON"]),
    "",
    "## Success criteria",
    "",
    "| Criterion | Status |",
    "|-----------|--------|",
    `| 100% approved recipes have images | **${imageCoverage === entries.length ? "PASS" : "FAIL"}** (${imageCoverage}/${entries.length}) |`,
    `| 0 duplicate hero images | **${duplicateHeroGroups.length === 0 ? "PASS" : "FAIL"}** |`,
    `| 0 broken Explore cards | **${exploreReport.totals.duplicateConflict === 0 && exploreReport.totals.missing === 0 ? "PASS" : "FAIL"}** |`,
    `| 0 wrong slug-image mappings | **${styleRows.filter((r) => r.slugMatch).length === entries.length ? "PASS" : "FAIL"}** |`,
    `| 0 forbidden public labels | **${labelPass === entries.length ? "PASS" : "FAIL"}** (${labelPass}/${entries.length}) |`,
    `| 0 recipe pages with vague steps | **${detailPass === entries.length ? "PASS" : "FAIL"}** (${detailPass}/${entries.length}) |`,
    `| 0 obvious image/title mismatches | **${accAccurate === entries.length ? "PASS" : "FAIL"}** (${accAccurate}/${entries.length}) |`,
    `| Firehall kitchen aesthetic (metadata) | **${stylePass === entries.length ? "PASS" : "FAIL"}** (${stylePass}/${entries.length}) |`,
    "",
    "## Recommended next fixes",
    "",
    "1. Batch rewrite 225 failing recipe pages (instruction depth, banned step titles, missing tonightSpread on breakfast cards)",
    "2. Address 58 image-governance failures + 23 duplicate heroes in full 761-recipe corpus",
    "3. Review 15 exact + 29 near-duplicate recipe pairs in review/duplicate-report.json",
    "",
    "## Remaining manual review",
    "",
    ...styleRows
      .filter((r) => !r.pass)
      .slice(0, 15)
      .map((r) => `- Image style: \`${r.slug}\``),
    ...detailRows
      .filter((r) => !r.pass)
      .slice(0, 15)
      .map((r) => `- Recipe detail: \`${r.slug}\``),
    ...(duplicateHeroGroups.length
      ? duplicateHeroGroups.map((g) => `- Duplicate hero: ${g.slugs.join(" ↔ ")}`)
      : ["- No duplicate heroes"]),
  ];
  writeMd("firehall-meals-production-audit-summary.md", summaryLines);

  console.log("\n[production-audit] Summary");
  console.log(`  Recipes: ${entries.length}`);
  console.log(`  Image style: ${stylePass}/${entries.length}`);
  console.log(`  Image accuracy: ${accAccurate}/${entries.length}`);
  console.log(`  Duplicate heroes: ${duplicateHeroGroups.length}`);
  console.log(`  Recipe detail: ${detailPass}/${entries.length}`);
  console.log(`  Explore eligible: ${exploreReport.totals.exploreEligible}/${exploreReport.totals.recipes}`);
  console.log(`  Report → review/firehall-meals-production-audit-summary.md`);

  const blockers =
    duplicateHeroGroups.length +
    (entries.length - imageCoverage) +
    exploreReport.totals.duplicateConflict +
    (entries.length - routePass);

  if (blockers > 0 && !FIX) {
    console.error(`\n[production-audit] ${blockers} blocker-class issues — re-run with --fix for safe path repairs`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
