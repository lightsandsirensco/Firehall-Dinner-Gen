#!/usr/bin/env tsx
/**
 * Recipe Quality Phases 6–10 — read-only audit of every public recipe.
 *
 * Applies the quality gate (gate-checks.ts) to each public recipe record and
 * merges the existing audits (baseline.ts, nutrition integrity, hero images)
 * into one itemized record per recipe. Never writes recipe files; outputs go
 * to review/recipe-quality/ only.
 *
 *   npx tsx scripts/recipe-quality/baseline.ts      # refresh baseline.json first
 *   npx tsx scripts/audit-nutrition-integrity.ts    # refresh nutrition audit (report only)
 *   npx tsx scripts/audit-hero-images.ts            # refresh image audit
 *   npx tsx scripts/recipe-quality/full-audit.ts
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { initCuratedRecipeStore } from "../../server/curated-recipe-store.js";
import { buildAllApprovedCatalogEntries } from "../../server/approved-catalog.js";
import { loadCanonicalCatalogPage } from "../../server/meal-catalog/canonical-page.js";
import { readBreakfastRecipePageFromDisk } from "../../server/breakfast-catalog/page-store.js";
import { readPizzaNightRecipePage } from "../../server/pizza-night/page-store.js";
import { scoreRecipeTitle } from "../../shared/recipe-title-quality.js";
import {
  SEVERITY_LABEL,
  norm,
  checkFoodSafety,
  checkImages,
  checkIngredientInstructionConsistency,
  checkNutrition,
  checkPresentation,
  checkQuantities,
  checkRequiredFields,
  checkServingScaling,
  isTechnicallyValidated,
  qualityScore,
  type GateFinding,
  type QualityIngredient,
  type QualityRecipe,
  type Severity,
} from "./gate-checks.js";
import { REVIEW_STATUSES, loadReviewLog, resolveReviewState, type ReviewStatus } from "./review-status.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const OUT = path.join(ROOT, "review", "recipe-quality");

const readJson = <T>(p: string): T | null => (fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, "utf8")) as T) : null);
const publicFile = (web?: string) => (web ? path.join(PUBLIC, web.split("?")[0]!.replace(/^\//, "")) : "");
const exists = (web?: string) => !!web && fs.existsSync(publicFile(web));

interface BaselineRecipe {
  slug: string;
  title: string;
  collection: string;
  surfaces: string[];
  issues: string[];
  details: Record<string, string[]>;
}
interface Baseline {
  recipes: BaselineRecipe[];
  exact_title_duplicates: string[][];
  templated_step_clusters: string[][];
  near_duplicates: Array<{ a: string; b: string; titleSim: number; ingredientSim: number }>;
}
interface NutritionRow { slug: string; status: "pass" | "fail" | "withheld"; findings: Array<{ code: string }>; ingredientMatchPct: number }
interface HeroRow { slug: string; exploreMapping?: { status?: string } }
interface Exposure {
  generatedAt?: string;
  surfaces: Record<string, string[]>;
  analytics?: { views?: Record<string, number>; generated?: Record<string, number>; saves?: Record<string, number>; wheel?: Record<string, number>; period?: string };
}
interface VisualReview { [slug: string]: { verdict: "ok" | "replace" | "recrop" | "check"; note: string } }

/** Weight of each first-impression surface (a slug on the homepage counts more than one deep in Explore). */
const SURFACE_WEIGHT: Record<string, number> = {
  homepage: 50,
  welcome_email: 35,
  explore_first_page: 30,
  generator: 25,
  wheel: 25,
  breakfast_collection: 15,
  seo_landing: 15,
  shift_planner: 10,
};

function splitQuantity(i: { name: string; quantity?: string; unit?: string; notes?: string; optional?: boolean; group?: string }): QualityIngredient {
  if (i.unit || !i.quantity) return { ...i };
  const m = /^([\d\s./½⅓⅔¼¾⅛⅜⅝⅞–-]+(?:to\s+[\d./]+)?)\s+(.+)$/.exec(i.quantity.trim());
  return m ? { ...i, quantity: m[1]!.trim(), unit: m[2]!.trim() } : { ...i };
}

function loadRecord(slug: string, collection: string): { recipe: QualityRecipe; raw: Record<string, unknown> } | null {
  if (collection === "smoothies") {
    const raw = readJson<Record<string, any>>(path.join(PUBLIC, "catalog", "smoothies", "pages", `${slug}.json`));
    if (!raw) return null;
    return {
      raw,
      recipe: {
        slug,
        title: raw.title,
        description: raw.description ?? raw.intro,
        mealType: "smoothie",
        baseServings: raw.baseServings ?? raw.servings,
        ingredients: (raw.ingredients ?? []).map(splitQuantity),
        steps: (raw.steps ?? []).map((s: any) => (typeof s === "string" ? { instruction: s } : { title: s.title, instruction: s.instruction, minutes: s.minutes })),
        heroImage: raw.heroImage,
        thumbImage: raw.thumbImage,
        nutrition: raw.nutrition ? { calories: raw.nutrition.calories, protein: raw.nutrition.protein, carbs: raw.nutrition.carbs, fat: raw.nutrition.fats ?? raw.nutrition.fat, source: raw.nutrition.source } : undefined,
      },
    };
  }
  const raw = (loadCanonicalCatalogPage(slug) ?? readBreakfastRecipePageFromDisk(slug) ?? readPizzaNightRecipePage(slug)) as Record<string, any> | null;
  if (!raw) return null;
  const n = raw.nutrition;
  return {
    raw,
    recipe: {
      slug,
      title: raw.title,
      description: raw.description,
      mealType: collection.startsWith("breakfast") ? "breakfast" : "dinner",
      baseServings: raw.baseServings ?? raw.crewSize,
      crewSize: raw.crewSize,
      prepTime: raw.prepTime,
      cookTime: raw.cookTime,
      ingredients: (raw.ingredients ?? []).map(splitQuantity),
      steps: (raw.steps ?? []).map((s: any) => ({ title: s.title, instruction: s.instruction ?? "", minutes: s.minutes })),
      heroImage: raw.heroImage,
      thumbImage: raw.thumbImage,
      mobileImage: raw.mobileImage,
      nutrition: n ? { calories: n.calories, protein: n.protein, carbs: n.carbs, fat: n.fats ?? n.fat, source: n.source } : undefined,
    },
  };
}

/** Originals of templated pairs confirmed by reading both records (the copy is the same steps renamed, plus at most one added line). */
const CONFIRMED_ORIGINALS = new Set(["hall-breakfast-burritos", "buttermilk-pancakes", "sausage-egg-cheese-sandwiches"]);

/** Misleading or unsafe as written and not a one-line fix. One-line safety fixes are corrected, not hidden. */
const HIDE_CODES = new Set([
  "vegetarian_title_contains_meat",
  "undercooked_burger",
  "thaw_at_room_temp",
  "marinate_at_room_temp",
  "templated_copy",
  "exact_duplicate_hide",
]);

type Recommendation = "hide_temporarily" | "major_corrections" | "minor_corrections" | "technically_validated" | "decide_unapproved_page";

interface AuditRecord {
  id: string;
  title: string;
  collection: string;
  surfaces: string[];
  exposureScore: number;
  exposureRank: number | null;
  firstImpression: boolean;
  publicState: "approved" | "public_unapproved";
  reviewStatus: ReviewStatus;
  /** Optional: actually cooked and measured. Never required for publishing. */
  kitchenTested: boolean;
  recommendation: Recommendation;
  score: number;
  severityCounts: Record<Severity, number>;
  findings: GateFinding[];
  proposedCorrections: string[];
  evidence: string[];
  uncertainties: string[];
}

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  const baseline = readJson<Baseline>(path.join(OUT, "baseline.json"));
  if (!baseline) throw new Error("Run scripts/recipe-quality/baseline.ts first");
  const nutritionRows = readJson<{ results: NutritionRow[] }>(path.join(ROOT, "review", "nutrition-integrity-audit.json"))?.results ?? [];
  const nutritionBySlug = new Map(nutritionRows.map((r) => [r.slug, r]));
  const heroRows = readJson<{ rows: HeroRow[] }>(path.join(ROOT, "review", "hero-image-validation.json"))?.rows ?? [];
  const heroBySlug = new Map(heroRows.map((r) => [r.slug, r]));
  const exposure = readJson<Exposure>(path.join(OUT, "exposure.json"));
  const visual = readJson<VisualReview>(path.join(OUT, "visual-review.json")) ?? {};
  const reviewLog = loadReviewLog(path.join(OUT, "review-log.json"));
  const approved = new Map(buildAllApprovedCatalogEntries().map((e) => [e.slug.toLowerCase(), e]));

  const titleKeyToSlug = new Map<string, string>();
  for (const r of baseline.recipes) titleKeyToSlug.set(r.title.toLowerCase(), r.slug);
  const exposureBySlug = new Map<string, { score: number; why: string[] }>();
  const addExposure = (slug: string, pts: number, why: string) => {
    const cur = exposureBySlug.get(slug) ?? { score: 0, why: [] };
    cur.score += pts;
    cur.why.push(why);
    exposureBySlug.set(slug, cur);
  };
  if (exposure) {
    for (const [surface, slugs] of Object.entries(exposure.surfaces)) {
      const w = SURFACE_WEIGHT[surface] ?? 5;
      slugs.forEach((s, idx) => addExposure(s.toLowerCase(), Math.max(1, w - idx), surface));
    }
    const a = exposure.analytics ?? {};
    for (const [s, c] of Object.entries(a.views ?? {})) addExposure(s, c * 2, `${c} recipe views`);
    for (const [t, c] of Object.entries(a.generated ?? {})) {
      const s = titleKeyToSlug.get(t.toLowerCase());
      if (s) addExposure(s, c * 2, `${c} generator picks`);
    }
    for (const [s, c] of Object.entries(a.wheel ?? {})) addExposure(s, c * 2, `${c} wheel landings`);
    for (const [s, c] of Object.entries(a.saves ?? {})) addExposure(s, c * 5, `${c} saves`);
  }
  const ranked = [...exposureBySlug.entries()].sort((x, y) => y[1].score - x[1].score).map(([s]) => s);
  const rankOf = new Map(ranked.map((s, i) => [s, i + 1]));

  const heroUsers = new Map<string, string[]>();
  for (const r of baseline.recipes) {
    const shared = r.issues.find((i) => i.startsWith("hero_shared_with:"));
    if (shared) heroUsers.set(r.slug, shared.split(":")[1]!.split(","));
  }
  const templatedWith = new Map<string, string[]>();
  for (const c of baseline.templated_step_clusters) for (const s of c) templatedWith.set(s, c.filter((x) => x !== s));
  const nearDupOf = new Map<string, string[]>();
  for (const d of baseline.near_duplicates) {
    nearDupOf.set(d.a, [...(nearDupOf.get(d.a) ?? []), `${d.b} (ingredients ${Math.round(d.ingredientSim * 100)}% shared)`]);
    nearDupOf.set(d.b, [...(nearDupOf.get(d.b) ?? []), `${d.a} (ingredients ${Math.round(d.ingredientSim * 100)}% shared)`]);
  }

  const records: AuditRecord[] = [];
  const ingredientTextBySlug = new Map<string, string>();
  for (const b of baseline.recipes) {
    const loaded = loadRecord(b.slug, b.collection);
    const findings: GateFinding[] = [];
    const evidence: string[] = [];
    const uncertainties: string[] = ["Not kitchen-tested: taste, texture, timing and yield are unconfirmed."];
    const entry = approved.get(b.slug);

    if (!loaded) {
      findings.push({ code: "record_missing", severity: "S2", category: "completeness", message: "Recipe record could not be loaded." });
    } else {
      const r = loaded.recipe;
      const VEG = /\b(veggie|vegetarian|vegan|meatless|plant[- ]based)\b/i;
      const tags = Array.isArray(loaded.raw.tags) ? (loaded.raw.tags as string[]) : [];
      const vegTag = tags.find((t) => VEG.test(t.replace(/[-_]/g, " ")));
      const dietary = loaded.raw.dietary as { vegetarian?: boolean; flags?: { vegetarian?: boolean } } | undefined;
      const vegetarianClaim = VEG.test(r.title)
        ? "title"
        : vegTag
          ? `tag "${vegTag}"`
          : dietary?.vegetarian === true || dietary?.flags?.vegetarian === true
            ? "dietary profile"
            : undefined;
      findings.push(...checkRequiredFields(r));
      findings.push(...checkIngredientInstructionConsistency(r));
      findings.push(...checkQuantities(r));
      findings.push(...checkServingScaling(r));
      const nut = nutritionBySlug.get(b.slug);
      findings.push(
        ...checkNutrition(r, {
          integrityFindingCodes: nut?.findings.map((f) => f.code),
          integrityStatus: nut?.status,
          numericFilterEligible: entry?.numericFilterEligible ?? false,
          labeledHighProtein: !!entry && (entry.isHighProtein || entry.catalogBadge === "High Protein" || (entry.traitBadges ?? []).includes("High Protein")),
        }),
      );
      findings.push(...checkFoodSafety(r, { vegetarianClaim }));

      let width: number | undefined;
      let height: number | undefined;
      if (exists(r.heroImage)) {
        try {
          const meta = await sharp(publicFile(r.heroImage)).metadata();
          width = meta.width;
          height = meta.height;
        } catch {
          /* unreadable image is reported as missing below */
        }
      }
      findings.push(
        ...checkImages({
          heroExists: exists(r.heroImage) && width != null,
          thumbExists: r.thumbImage ? exists(r.thumbImage) : undefined,
          mobileExists: r.mobileImage ? exists(r.mobileImage) : undefined,
          width,
          height,
          sharedWith: heroUsers.get(b.slug),
          mappingStatus: heroBySlug.get(b.slug)?.exploreMapping?.status,
        }),
      );
      findings.push(...checkPresentation(r, { titleScore: scoreRecipeTitle(r.title).score }));

      const v = visual[b.slug];
      if (v?.verdict === "replace") findings.push({ code: "image_visual_mismatch", severity: "S2", category: "image", message: "Visual review: the photo doesn't match the dish as written, or would mislead a cook.", evidence: v.note, fix: "Replace with a photo of this recipe as written." });
      else if (v?.verdict === "recrop") findings.push({ code: "image_crop_issue", severity: "S4", category: "image", message: "Visual review: the photo needs recropping.", evidence: v.note, fix: "Recrop to 3:2 with the dish centered." });
      else if (v?.verdict === "check") findings.push({ code: "image_needs_check", severity: "S3", category: "image", message: "Visual review: the photo may not match the recipe.", evidence: v.note, fix: "Compare the photo with the recipe and replace if needed." });
      if (!v) uncertainties.push("Hero image has not been visually checked against the recipe.");

      if (r.nutrition?.source === "estimated") uncertainties.push("Nutrition is an estimate, not calculated from the ingredient list.");
      if (nut) evidence.push(`Nutrition integrity: ${nut.status}, ${nut.ingredientMatchPct}% of ingredients matched to nutrition data.`);
      if (width) evidence.push(`Hero ${width}×${height}px.`);
    }

    if (b.issues.some((i) => i.startsWith("schema_invalid"))) {
      findings.push({ code: "schema_mismatch", severity: "S4", category: "completeness", message: "Record doesn't match the canonical recipe schema (e.g. no equipment list).", evidence: b.issues.find((i) => i.startsWith("schema_invalid")), fix: "Migrate to the canonical schema." });
    }
    if (loaded) ingredientTextBySlug.set(b.slug, norm(loaded.recipe.ingredients.map((i) => i.name).join(" ")));
    const exact = baseline.exact_title_duplicates.find((d) => d.includes(b.slug));
    if (exact) findings.push({ code: "exact_duplicate", severity: "S2", category: "duplicate", message: "Another recipe has the same title.", evidence: exact.filter((s) => s !== b.slug).join(", "), fix: "Keep one, redirect the other." });
    const near = nearDupOf.get(b.slug);
    if (near) findings.push({ code: "near_duplicate", severity: "S5", category: "duplicate", message: "Very similar to another recipe — an editor should decide whether both earn a place.", evidence: near.slice(0, 3).join("; "), heuristic: true });
    if (!entry) findings.push({ code: "public_but_unapproved", severity: "S3", category: "completeness", message: "Public, search-indexed page that the app never recommends." });

    if (findings.some((f) => f.heuristic)) uncertainties.push("Heuristic findings (marked) need a human to confirm before correcting.");

    records.push({
      id: b.slug,
      title: b.title,
      collection: b.collection,
      surfaces: b.surfaces,
      exposureScore: exposureBySlug.get(b.slug)?.score ?? 0,
      exposureRank: rankOf.get(b.slug) ?? null,
      firstImpression: false,
      publicState: entry ? "approved" : "public_unapproved",
      reviewStatus: "needs_review",
      kitchenTested: false,
      recommendation: "minor_corrections",
      score: 0,
      severityCounts: { S1: 0, S2: 0, S3: 0, S4: 0, S5: 0 },
      findings,
      proposedCorrections: [],
      evidence: [...evidence, ...(exposureBySlug.get(b.slug)?.why.slice(0, 4).map((w) => `Exposure: ${w}`) ?? [])],
      uncertainties,
    });
  }

  // Templated copies: the original is the most-exposed member; on a tie, the
  // one whose title words actually appear in its ingredients and steps.
  const titleFit = (slug: string) => {
    const words = norm(records.find((r) => r.id === slug)?.title ?? "").split(" ").filter((w) => w.length > 3);
    const hay = ingredientTextBySlug.get(slug) ?? "";
    return words.filter((w) => hay.includes(w.replace(/s$/, ""))).length / Math.max(1, words.length);
  };
  for (const cluster of baseline.templated_step_clusters) {
    const original = cluster.find((s) => CONFIRMED_ORIGINALS.has(s)) ?? [...cluster].sort((x, y) => (exposureBySlug.get(y)?.score ?? 0) - (exposureBySlug.get(x)?.score ?? 0) || titleFit(y) - titleFit(x))[0]!;
    for (const slug of cluster) {
      const rec = records.find((r) => r.id === slug);
      if (!rec) continue;
      const others = cluster.filter((s) => s !== slug).join(", ");
      rec.findings.push(
        slug === original
          ? { code: "has_templated_copy", severity: "S3", category: "duplicate", message: "Another recipe copies this one's steps word for word.", evidence: others, fix: "Keep this as the original; fix or retire the copy." }
          : { code: "templated_copy", severity: "S2", category: "duplicate", message: `Steps are word-for-word the same as ${original}.`, evidence: others, fix: `Write this recipe properly, or retire it and 301-redirect to ${original}.` },
      );
    }
  }

  // Exact duplicates: keep the stronger record, mark the other for hiding.
  for (const pair of baseline.exact_title_duplicates) {
    const recs = pair.map((s) => records.find((r) => r.id === s)).filter(Boolean) as AuditRecord[];
    recs.sort((x, y) => qualityScore(y.findings) - qualityScore(x.findings) || y.exposureScore - x.exposureScore || x.id.length - y.id.length);
    for (const loser of recs.slice(1)) loser.findings.push({ code: "exact_duplicate_hide", severity: "S2", category: "duplicate", message: `Weaker of an exact-title pair; keep ${recs[0]!.id}.`, fix: `301-redirect to ${recs[0]!.id}, preserving saves and history.` });
  }

  const SEV_ORDER: Severity[] = ["S1", "S2", "S3", "S4", "S5"];
  const firstImpressionSlugs = new Set(ranked.filter((s) => records.some((r) => r.id === s)).slice(0, 50));
  for (const rec of records) {
    rec.findings.sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity));
    for (const f of rec.findings) rec.severityCounts[f.severity]++;
    rec.score = qualityScore(rec.findings);
    rec.firstImpression = firstImpressionSlugs.has(rec.id);
    rec.proposedCorrections = [...new Set(rec.findings.map((f) => f.fix).filter(Boolean) as string[])];
    const validated = isTechnicallyValidated(rec.findings);
    const state = resolveReviewState({ slug: rec.id, isPublic: true, technicallyValidated: validated, log: reviewLog });
    rec.reviewStatus = state.status;
    rec.kitchenTested = state.kitchenTested;
    if (state.kitchenTested) rec.uncertainties = rec.uncertainties.filter((u) => !u.startsWith("Not kitchen-tested"));
    if (rec.findings.some((f) => HIDE_CODES.has(f.code))) rec.recommendation = "hide_temporarily";
    else if (rec.publicState === "public_unapproved") rec.recommendation = "decide_unapproved_page";
    else if (validated) rec.recommendation = "technically_validated";
    else if (rec.severityCounts.S1 > 0 || rec.severityCounts.S2 >= 2 || rec.score < 60) rec.recommendation = "major_corrections";
    else rec.recommendation = "minor_corrections";
  }

  // ---- Outputs -----------------------------------------------------------
  const count = <K extends string>(keyOf: (r: AuditRecord) => K | K[]) => {
    const m: Record<string, number> = {};
    for (const r of records) for (const k of ([] as K[]).concat(keyOf(r))) m[k] = (m[k] ?? 0) + 1;
    return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]));
  };
  const findingCounts: Record<string, { severity: Severity; category: string; recipes: number; firstImpressionRecipes: number }> = {};
  for (const r of records) {
    for (const code of new Set(r.findings.map((f) => f.code))) {
      const f = r.findings.find((x) => x.code === code)!;
      const cur = findingCounts[code] ?? { severity: f.severity, category: f.category, recipes: 0, firstImpressionRecipes: 0 };
      cur.recipes++;
      if (r.firstImpression) cur.firstImpressionRecipes++;
      findingCounts[code] = cur;
    }
  }
  const sortedCodes = Object.entries(findingCounts).sort((a, b) => SEV_ORDER.indexOf(a[1].severity) - SEV_ORDER.indexOf(b[1].severity) || b[1].recipes - a[1].recipes);
  const approvedRecs = records.filter((r) => r.publicState === "approved");
  const avg = (rs: AuditRecord[]) => Math.round((rs.reduce((a, r) => a + r.score, 0) / Math.max(1, rs.length)) * 10) / 10;
  const fi = records.filter((r) => r.firstImpression).sort((a, b) => (a.exposureRank ?? 999) - (b.exposureRank ?? 999));

  const summary = {
    generatedAt: new Date().toISOString(),
    recipesAudited: records.length,
    approved: approvedRecs.length,
    publicUnapproved: records.length - approvedRecs.length,
    reviewStatus: count((r) => r.reviewStatus),
    recommendation: count((r) => r.recommendation),
    recipesWithSeverity: Object.fromEntries(SEV_ORDER.map((s) => [s, records.filter((r) => r.severityCounts[s] > 0).length])),
    findingsByCode: Object.fromEntries(sortedCodes),
    findingsByCategory: count((r) => [...new Set(r.findings.map((f) => f.category))]),
    qualityScore: {
      libraryMean: avg(records),
      approvedMean: avg(approvedRecs),
      firstImpressionMean: avg(fi),
      exposureWeightedMean: Math.round((records.reduce((a, r) => a + r.score * (1 + r.exposureScore), 0) / records.reduce((a, r) => a + 1 + r.exposureScore, 0)) * 10) / 10,
      shareTechnicallyValidated: Math.round((records.filter((r) => r.recommendation === "technically_validated").length / records.length) * 1000) / 10,
    },
    exposureSource: exposure ? { surfaces: Object.keys(exposure.surfaces), analyticsPeriod: exposure.analytics?.period ?? null } : null,
    firstImpression: fi.map((r) => ({ rank: r.exposureRank, id: r.id, title: r.title, score: r.score, recommendation: r.recommendation, S1: r.severityCounts.S1, S2: r.severityCounts.S2 })),
  };

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "audit-records.json"), JSON.stringify({ summary, records }, null, 2));

  const csvEsc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const csv = [
    ["id", "title", "collection", "public_state", "review_status", "recommendation", "score", "exposure_rank", "first_impression", "S1", "S2", "S3", "S4", "S5", "finding_codes", "surfaces"].join(","),
    ...records.map((r) =>
      [r.id, r.title, r.collection, r.publicState, r.reviewStatus, r.recommendation, r.score, r.exposureRank ?? "", r.firstImpression, ...SEV_ORDER.map((s) => r.severityCounts[s]), r.findings.map((f) => f.code).join(" "), r.surfaces.join(" ")]
        .map(csvEsc)
        .join(","),
    ),
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "audit-records.csv"), csv);

  const md: string[] = [
    "# Recipe audit records (read-only)",
    "",
    `Generated ${summary.generatedAt.slice(0, 10)} by \`scripts/recipe-quality/full-audit.ts\`. One record per public recipe, ordered by first-impression exposure, then by severity.`,
    "",
    `Severity: ${SEV_ORDER.map((s) => `**${s}** ${SEVERITY_LABEL[s]}`).join(" · ")}. Findings marked *(heuristic)* need a human to confirm.`,
    `Review statuses: ${REVIEW_STATUSES.join(" → ")}. Automation can reach Technically Validated at most; Culinary Reviewed and Approved for Publishing come only from the human review log. Kitchen Tested is a separate, optional badge and is not required for publishing.`,
    "",
  ];
  const ordered = [...records].sort((a, b) => (a.exposureRank ?? 9999) - (b.exposureRank ?? 9999) || a.score - b.score);
  for (const r of ordered) {
    md.push(`## ${r.title} — \`${r.id}\``);
    md.push(`${r.collection} · ${r.publicState === "approved" ? "approved" : "public, not approved"} · status **${r.reviewStatus}** · recommendation **${r.recommendation.replace(/_/g, " ")}** · score ${r.score}${r.exposureRank ? ` · exposure rank ${r.exposureRank}` : ""}`);
    if (r.findings.length) {
      md.push("", "Findings:");
      for (const f of r.findings) md.push(`- **${f.severity}** ${f.message}${f.heuristic ? " *(heuristic)*" : ""}${f.evidence ? ` — ${f.evidence}` : ""}`);
    } else md.push("", "Findings: none from automated checks.");
    if (r.proposedCorrections.length) {
      md.push("", "Proposed corrections:");
      for (const c of r.proposedCorrections) md.push(`- ${c}`);
    }
    if (r.evidence.length) md.push("", `Evidence: ${r.evidence.join(" ")}`);
    md.push("", `Uncertainties: ${r.uncertainties.join(" ")}`, "");
  }
  fs.writeFileSync(path.join(OUT, "AUDIT-RECORDS.md"), md.join("\n"));

  console.log(JSON.stringify({ ...summary, firstImpression: summary.firstImpression.slice(0, 50) }, null, 2));
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
