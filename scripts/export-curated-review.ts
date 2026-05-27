#!/usr/bin/env tsx
/**
 * Export curated recipe catalog into an offline review bundle.
 *
 * Outputs:
 * - review/index.html (dark themed, filterable, collapsible)
 * - review/golden-100-review.md (editorial QA checklist)
 *
 * Data source: curated SQLite DB (data/cache.db) via sql.js.
 * No runtime generation.
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { getSharedLocalDb, flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { normalizeImagePath } from "../shared/media/normalize-image-path.js";
import crypto from "node:crypto";
import type { CuratedRecipeMetadata } from "../shared/curated-recipe/metadata/types.js";
import { deriveCuratedRecipeMetadata } from "../shared/curated-recipe/metadata/derive.js";
import { metadataCompletenessScore } from "../shared/curated-recipe/metadata/qa.js";
import { METADATA_LABELS } from "../shared/curated-recipe/metadata/taxonomy.js";
import { parseMetadataFromRow } from "../server/curated-recipe-metadata.js";
import {
  runEditorialQaBatch,
  type EditorialQaInput,
  type EditorialQaReport,
  type EditorialQaOverrides,
} from "../shared/curated-recipe/qa-engine/index.js";
import { findNearDuplicatePairs } from "../shared/curated-recipe/families/similarity.js";
import { checkImageAvailability } from "../shared/curated-recipe/qa-engine/assets.js";
import { summarizeEditorialQaReports } from "../shared/curated-recipe/qa-engine/summarize.js";
import { parseQaOverridesJson } from "../server/curated-recipe-qa.js";

type CuratedStatus = "draft" | "review" | "approved" | "published" | "rejected" | "archived";

type CuratedRow = {
  recipe_id: string;
  slug: string;
  status: CuratedStatus;
  title: string;
  summary: string | null;
  hero_image: string;
  prep_minutes: number;
  cook_minutes: number;
  total_minutes: number;
  servings_base: number;
  cleanup_difficulty: number;
  protein: string;
  cuisine: string;
  category: string;
  meal_format: string;
  meal_archetype: string;
  source_kind: string;
  source_name: string;
  source_url: string;
  quality_score: number;
  comfort_score: number;
  healthy_score: number;
  firehall_suitability_score: number;
  appetite_score: number;
  trend_score: number;
  featured: number;
  created_at: string;
  updated_at: string;
  editorial_image_json: string | null;
  generate_response_json: string | null;
  metadata_json: string | null;
  difficulty: string | null;
  cook_time_bucket: string | null;
  meal_style: string | null;
  nutrition_category: string | null;
  leftovers_quality: string | null;
  crew_size_bucket: string | null;
  hall_tested: string | null;
  busy_night_suitable: number | null;
  equipment_json: string | null;
  qa_overrides_json: string | null;
  archetype_id: string | null;
  parent_recipe_id: string | null;
  recipe_role: string | null;
  variant_key: string | null;
};

type IngredientRow = {
  position: number;
  name: string;
  amount: number;
  unit: string;
  original_text: string;
  category: string | null;
};

type StepRow = { step_number: number; heading: string | null; body: string };
type TagRow = { tag: string };
type CatRow = { category_key: string };
type ImgRow = { role: string; url: string; alt_text: string | null; position: number };

type HydratedRecipe = {
  recipeId: string;
  slug: string;
  status: CuratedStatus;
  title: string;
  summary: string;
  heroImage: string;
  thumbImage: string;
  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  servingsBase: number;
  cleanupDifficulty: number;
  protein: string;
  cuisine: string;
  category: string;
  mealFormat: string;
  mealArchetype: string;
  featured: boolean;
  source: { kind: string; name: string; url: string };
  // optional legacy/generator fields (if stored)
  tonightSpread?: string;
  leftovers?: string;
  stationTips?: string[];
  cleanupTip?: string;
  tags: string[];
  explorePools: string[];
  ingredients: Array<{ name: string; amount: number; unit: string; originalText: string; category?: string }>;
  steps: Array<{ n: number; heading: string; body: string }>;
  images: Array<{ role: string; url: string; alt: string }>;
  metadata?: CuratedRecipeMetadata;
  metadataCompleteness: number;
  qaOverrides?: EditorialQaOverrides;
  archetypeId?: string;
  parentRecipeId?: string;
  recipeRole?: string;
  variantKey?: string;
  parentSlug?: string;
  parentTitle?: string;
};

const OUT_DIR = path.join(process.cwd(), "review");
const OUT_ASSETS = path.join(OUT_DIR, "assets");
const OUT_HTML = path.join(OUT_DIR, "index.html");
const OUT_MD = path.join(OUT_DIR, "golden-100-review.md");

function e(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtMinutes(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return "—";
  return `${min} min`;
}

function isSiteImagesPath(p: string): boolean {
  return p.startsWith("/images/");
}

function isReviewAssetPath(p: string): boolean {
  return p.startsWith("assets/");
}

function isAbsoluteHttp(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function urlExt(url: string): string {
  try {
    const u = new URL(url);
    const ext = path.extname(u.pathname || "").toLowerCase();
    if (ext === ".jpg" || ext === ".jpeg") return ".jpg";
    if (ext === ".png") return ".png";
    if (ext === ".webp") return ".webp";
  } catch {
    /* ignore */
  }
  return ".jpg";
}

async function fetchWithRetry(
  url: string,
  attempts = 3,
  timeoutMs = 15000,
): Promise<{ buf: Buffer | null; error?: string }> {
  let lastErr = "";
  for (let i = 1; i <= attempts; i++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      const arr = await res.arrayBuffer();
      if (!res.ok) return { buf: null, error: `HTTP ${res.status}` };
      return { buf: Buffer.from(arr) };
    } catch (err: any) {
      lastErr = String(err?.message || err || "fetch failed");
      if (i === attempts) return { buf: null, error: lastErr };
      await new Promise((r) => setTimeout(r, 250 * i * i));
    } finally {
      clearTimeout(t);
    }
  }
  return { buf: null, error: lastErr || "fetch failed" };
}

async function cacheExternalImage(
  url: string,
): Promise<{ path: string; saved: boolean; error?: string }> {
  if (!isAbsoluteHttp(url)) return { path: url, saved: false };
  fs.mkdirSync(OUT_ASSETS, { recursive: true });
  const ext = urlExt(url);
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
  const filename = `${hash}${ext}`;
  const abs = path.join(OUT_ASSETS, filename);
  const rel = `assets/${filename}`;
  if (fs.existsSync(abs)) return { path: rel, saved: false };
  const { buf, error } = await fetchWithRetry(url, 3, 15000);
  if (!buf) return { path: url, saved: false, error }; // keep original if download fails (still works online)
  fs.writeFileSync(abs, buf);
  return { path: rel, saved: true };
}

function pickThumb(recipe: HydratedRecipe): string {
  const thumb = recipe.images.find((i) => i.role === "thumb")?.url;
  if (thumb) return thumb;
  // editorial metadata thumbnails are stored as images with role thumb in curated_recipe_images
  return recipe.heroImage;
}

function hydratedToQaInput(r: HydratedRecipe): EditorialQaInput {
  return {
    recipeId: r.recipeId,
    slug: r.slug,
    status: r.status,
    title: r.title,
    summary: r.summary,
    heroImage: r.heroImage,
    thumbImage: r.thumbImage,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    totalMinutes: r.totalMinutes,
    servingsBase: r.servingsBase,
    cleanupDifficulty: r.cleanupDifficulty,
    protein: r.protein,
    cuisine: r.cuisine,
    mealFormat: r.mealFormat,
    tags: r.tags,
    ingredients: r.ingredients.map((i) => ({ name: i.name, originalText: i.originalText })),
    steps: r.steps.map((s) => ({ n: s.n, heading: s.heading, body: s.body })),
    metadata: r.metadata,
    metadataCompleteness: r.metadataCompleteness,
    qaOverrides: r.qaOverrides,
    archetypeId: r.archetypeId,
    recipeRole: r.recipeRole,
    parentRecipeId: r.parentRecipeId,
    variantKey: r.variantKey,
  };
}

function runCatalogQa(recipes: HydratedRecipe[]): Map<string, EditorialQaReport> {
  const inputs = recipes.map(hydratedToQaInput);
  const simInputs = recipes.map((r) => ({
    recipeId: r.recipeId,
    slug: r.slug,
    title: r.title,
    mealFormat: r.mealFormat,
    equipment: r.metadata?.equipment,
    ingredients: r.ingredients.map((i) => ({ name: i.name })),
    steps: r.steps.map((s) => ({ heading: s.heading, body: s.body })),
  }));
  const archetypeById = new Map(recipes.map((r) => [r.recipeId, r.archetypeId || ""]));
  const nearDupes = findNearDuplicatePairs(simInputs, { sameArchetypeOnly: true, archetypeById }).map(
    (p) => ({
      recipeIdA: p.recipeIdA,
      recipeIdB: p.recipeIdB,
      slugA: p.slugA,
      slugB: p.slugB,
      similarity: p.overall,
    }),
  );
  const reports = runEditorialQaBatch(inputs, {
    imageContext: { cwd: process.cwd(), reviewAssetsDir: OUT_ASSETS },
    variantNearDuplicates: nearDupes,
  });
  return new Map(reports.map((rep) => [rep.recipeId, rep]));
}

async function loadAllCurated(): Promise<HydratedRecipe[]> {
  await initCuratedRecipeStore();
  const db = await getSharedLocalDb();

  const rows = db
    .prepare(
      `SELECT
        recipe_id, slug, status, title, summary, hero_image,
        prep_minutes, cook_minutes, total_minutes, servings_base, cleanup_difficulty,
        protein, cuisine, category, meal_format, meal_archetype,
        source_kind, source_name, source_url,
        quality_score, comfort_score, healthy_score, firehall_suitability_score, appetite_score, trend_score,
        featured, created_at, updated_at, editorial_image_json, generate_response_json,
        metadata_json, difficulty, cook_time_bucket, meal_style, nutrition_category,
        leftovers_quality, crew_size_bucket, hall_tested, busy_night_suitable, equipment_json,
        qa_overrides_json, archetype_id, parent_recipe_id, recipe_role, variant_key
      FROM curated_recipes
      WHERE status != 'archived'
      ORDER BY status != 'published', quality_score DESC, updated_at DESC`,
    )
    .all() as unknown as CuratedRow[];

  const out: HydratedRecipe[] = [];
  for (const row of rows) {
    const recipeId = String(row.recipe_id);
    const tags = (db.prepare(`SELECT tag FROM curated_recipe_tags WHERE recipe_id = ?`).all(recipeId) as unknown as TagRow[])
      .map((t) => String(t.tag))
      .filter(Boolean);

    const cats = (db.prepare(
      `SELECT category_key FROM curated_recipe_categories WHERE recipe_id = ? ORDER BY weight DESC`,
    ).all(recipeId) as unknown as CatRow[])
      .map((c) => String(c.category_key))
      .filter(Boolean);

    const ingredients = (db.prepare(
      `SELECT position, name, amount, unit, original_text, category
       FROM curated_recipe_ingredients WHERE recipe_id = ? ORDER BY position`,
    ).all(recipeId) as unknown as IngredientRow[]).map((ing) => ({
      name: String(ing.name),
      amount: Number(ing.amount) || 0,
      unit: String(ing.unit || ""),
      originalText: String(ing.original_text || ""),
      category: ing.category ? String(ing.category) : undefined,
    }));

    const steps = (db.prepare(
      `SELECT step_number, heading, body FROM curated_recipe_instructions
       WHERE recipe_id = ? ORDER BY step_number`,
    ).all(recipeId) as unknown as StepRow[]).map((s) => ({
      n: Number(s.step_number) || 0,
      heading: s.heading ? String(s.heading) : "",
      body: String(s.body || ""),
    }));

    const images = (db.prepare(
      `SELECT role, url, alt_text, position FROM curated_recipe_images WHERE recipe_id = ? ORDER BY position`,
    ).all(recipeId) as unknown as ImgRow[]).map((img) => ({
      role: String(img.role),
      url: normalizeImagePath(String(img.url || "")),
      alt: String(img.alt_text || ""),
    }));

    const heroImage = normalizeImagePath(String(row.hero_image || ""));
    let generateResponse: Record<string, unknown> | undefined;
    if (row.generate_response_json) {
      try {
        generateResponse = JSON.parse(String(row.generate_response_json)) as Record<string, unknown>;
      } catch {
        /* ignore */
      }
    }
    let tonightSpread: string | undefined;
    let leftovers: string | undefined;
    let stationTips: string[] | undefined;
    let cleanupTip: string | undefined;
    if (generateResponse) {
      const gr = generateResponse as any;
      tonightSpread = typeof gr?.why_it_fits_tonight === "string" ? gr.why_it_fits_tonight : undefined;
      cleanupTip = typeof gr?.cleanup_tip === "string" ? gr.cleanup_tip : undefined;
      stationTips = Array.isArray(gr?.pro_tips) ? gr.pro_tips.filter((x: any) => typeof x === "string") : undefined;
      leftovers = typeof gr?.plating?.leftovers === "string" ? gr.plating.leftovers : undefined;
    }

    const parsedMeta =
      parseMetadataFromRow(row as unknown as Record<string, unknown>) ??
      deriveCuratedRecipeMetadata({
        protein: String(row.protein || ""),
        cuisine: String(row.cuisine || ""),
        totalMinutes: Number(row.total_minutes) || 0,
        servingsBase: Number(row.servings_base) || 4,
        cleanupDifficulty: Number(row.cleanup_difficulty) as 1 | 2 | 3 | 4 | 5,
        featured: Boolean(row.featured),
        tags,
        categories: cats,
        mealFormat: String(row.meal_format || ""),
        mealArchetype: String(row.meal_archetype || ""),
        sourceKind: String(row.source_kind || ""),
        steps: steps.map((s) => ({ heading: s.heading, body: s.body })),
        generateResponse: generateResponse as any,
      });

    const r: HydratedRecipe = {
      recipeId,
      slug: String(row.slug),
      status: row.status,
      title: String(row.title),
      summary: (row.summary ? String(row.summary) : "").trim(),
      heroImage,
      thumbImage: "",
      prepMinutes: Number(row.prep_minutes) || 0,
      cookMinutes: Number(row.cook_minutes) || 0,
      totalMinutes: Number(row.total_minutes) || 0,
      servingsBase: Number(row.servings_base) || 0,
      cleanupDifficulty: Number(row.cleanup_difficulty) || 0,
      protein: String(row.protein || ""),
      cuisine: String(row.cuisine || ""),
      category: String(row.category || ""),
      mealFormat: String(row.meal_format || ""),
      mealArchetype: String(row.meal_archetype || ""),
      featured: Boolean(row.featured),
      source: { kind: String(row.source_kind || ""), name: String(row.source_name || ""), url: String(row.source_url || "") },
      tonightSpread,
      leftovers,
      stationTips,
      cleanupTip,
      tags,
      explorePools: cats,
      ingredients,
      steps,
      images,
      metadata: parsedMeta,
      metadataCompleteness: metadataCompletenessScore(parsedMeta),
      qaOverrides: parseQaOverridesJson(row.qa_overrides_json),
      archetypeId: row.archetype_id ? String(row.archetype_id) : undefined,
      parentRecipeId: row.parent_recipe_id ? String(row.parent_recipe_id) : undefined,
      recipeRole: row.recipe_role ? String(row.recipe_role) : "standalone",
      variantKey: row.variant_key ? String(row.variant_key) : undefined,
    };
    r.thumbImage = pickThumb(r);
    out.push(r);
  }
  const slugById = new Map(out.map((r) => [r.recipeId, r.slug]));
  const titleById = new Map(out.map((r) => [r.recipeId, r.title]));
  for (const r of out) {
    if (r.parentRecipeId) {
      r.parentSlug = slugById.get(r.parentRecipeId);
      r.parentTitle = titleById.get(r.parentRecipeId);
    }
  }
  return out;
}

function buildHtml(
  recipes: HydratedRecipe[],
  qaById: Map<string, EditorialQaReport>,
  generatedAt: string,
  cacheNote: { total: number; saved: number; failed: number },
  qaSummary: ReturnType<typeof summarizeEditorialQaReports>,
): string {
  const proteins = [...new Set(recipes.map((r) => r.metadata?.protein || r.protein).filter(Boolean))].sort();
  const cuisines = [...new Set(recipes.map((r) => r.metadata?.cuisine || r.cuisine).filter(Boolean))].sort();
  const statuses = [...new Set(recipes.map((r) => r.status))].sort();
  const difficulties = ["easy", "medium", "hard"];
  const cookBuckets = ["under_30", "thirty_to_45", "fortyfive_to_60", "over_60"];
  const mealStyles = [...new Set(recipes.map((r) => r.metadata?.mealStyle).filter(Boolean))].sort();
  const nutritionCats = [...new Set(recipes.map((r) => r.metadata?.nutritionCategory).filter(Boolean))].sort();

  function metaRow(label: string, value: string): string {
    return `<tr><th>${e(label)}</th><td>${e(value)}</td></tr>`;
  }

  const recipeCards = recipes
    .map((r) => {
      const qaReport = qaById.get(r.recipeId);
      const warnings = (qaReport?.activeFlags ?? []).map((f) => f.message);
      const score = qaReport?.overallScore ?? 0;
      const flagCodes = (qaReport?.activeFlags ?? []).map((f) => f.code).join(" ");
      const heroExists =
        isAbsoluteHttp(r.heroImage) || isReviewAssetPath(r.heroImage) || isSiteImagesPath(r.heroImage);
      const thumbExists =
        isAbsoluteHttp(r.thumbImage) || isReviewAssetPath(r.thumbImage) || isSiteImagesPath(r.thumbImage);
      const m = r.metadata;
      const diff = m?.difficulty ?? "medium";

      const manualQaChecklist = [
        "image correct",
        "instructions clear",
        "realistic timing",
        "no duplicate recipe",
        "beginner friendly",
        "firefighter appropriate",
        "publish approved",
      ];

      const familyBadge =
        r.recipeRole && r.recipeRole !== "standalone"
          ? `<span class="badge family">${e(r.recipeRole)}${r.variantKey ? ` · ${e(r.variantKey)}` : ""}</span>`
          : r.archetypeId
            ? `<span class="badge family">family</span>`
            : "";
      const parentLine =
        r.parentSlug
          ? `<div class="family-line muted">↳ variant of <a href="#${e(r.parentSlug)}">${e(r.parentTitle || r.parentSlug)}</a> (<code>${e(r.parentSlug)}</code>)</div>`
          : r.recipeRole === "canonical"
            ? `<div class="family-line muted">★ canonical · archetype <code>${e(r.archetypeId || "")}</code></div>`
            : "";

      const metaBadges = [
        `<span class="badge">${e(r.status)}</span>`,
        familyBadge,
        r.protein ? `<span class="badge">${e(r.protein)}</span>` : "",
        r.cuisine ? `<span class="badge">${e(r.cuisine)}</span>` : "",
        r.totalMinutes ? `<span class="badge">${e(fmtMinutes(r.totalMinutes))}</span>` : "",
        m?.cleanupDifficulty
          ? `<span class="badge">cleanup ${e(String(m.cleanupDifficulty))}/5</span>`
          : "",
        m?.busyNightSuitable ? `<span class="badge">busy-night</span>` : "",
        m?.hallTested && m.hallTested !== "not_tested"
          ? `<span class="badge">${e(m.hallTested)}</span>`
          : "",
        `<span class="badge score">QA ${score}</span>`,
        qaReport?.publishReady
          ? `<span class="badge ok">publish-ready</span>`
          : `<span class="badge bad">needs review</span>`,
        `<span class="badge">meta ${r.metadataCompleteness}%</span>`,
      ]
        .filter(Boolean)
        .join("");

      const dims = qaReport?.dimensionScores;
      const dimHtml = dims
        ? `<div class="qa-dims muted">content ${dims.content} · steps ${dims.instructions} · media ${dims.media} · meta ${dims.metadata} · voice ${dims.authenticity}</div>`
        : "";

      const flagsHtml =
        qaReport && qaReport.activeFlags.length
          ? `<div class="qa-flags muted">${qaReport.activeFlags
              .slice(0, 12)
              .map((f) => `<code class="flag-${e(f.severity)}">${e(f.code)}</code>`)
              .join(" ")}</div>`
          : "";

      const criticalFlags = (qaReport?.activeFlags ?? []).filter((f) => f.severity === "critical");
      const warningFlags = (qaReport?.activeFlags ?? []).filter((f) => f.severity === "warning");
      const infoFlags = (qaReport?.activeFlags ?? []).filter((f) => f.severity === "info");

      const flagPills = (items: typeof criticalFlags, label: string, cls: string) =>
        items.length
          ? `<div class="qa-row ${cls}"><span class="qa-l">${e(label)}</span>${items
              .slice(0, 10)
              .map((f) => `<span class="warn-pill ${cls}">${e(f.code)} · ${e(f.message)}</span>`)
              .join("")}</div>`
          : "";

      const warningHtml =
        criticalFlags.length || warningFlags.length || infoFlags.length
          ? `<div class="qa-stack">
              ${flagPills(criticalFlags, "Critical", "sev-critical")}
              ${flagPills(warningFlags, "Warnings", "sev-warning")}
              ${flagPills(infoFlags, "Info", "sev-info")}
            </div>`
          : "";

      const tagsHtml =
        r.tags.length > 0
          ? `<div class="tags">${r.tags.slice(0, 24).map((t) => `<span class="tag">#${e(t)}</span>`).join("")}</div>`
          : `<div class="tags muted">no tags</div>`;

      const tipsHtml =
        r.stationTips && r.stationTips.length
          ? `<ul class="mini">${r.stationTips.slice(0, 8).map((t) => `<li>${e(t)}</li>`).join("")}</ul>`
          : `<div class="muted">—</div>`;

      const leftoversHtml = r.leftovers ? `<p>${e(r.leftovers)}</p>` : `<div class="muted">—</div>`;

      const ingHtml = r.ingredients
        .slice(0, 80)
        .map((i) => `<li>${e(i.originalText || i.name)}</li>`)
        .join("");

      const stepHtml = r.steps
        .slice(0, 40)
        .map(
          (s) =>
            `<li><div class="step-h">${e(s.heading || `Step ${s.n}`)}</div><div class="step-b">${e(s.body)}</div></li>`,
        )
        .join("");

      const qaHtml = manualQaChecklist
        .map(
          (label, i) =>
            `<label class="qa"><input type="checkbox" data-qa="${i}"> <span>${e(label)}</span></label>`,
        )
        .join("");

      const metadataTable = m
        ? `<table class="meta-table">
            ${metaRow("Protein", METADATA_LABELS.protein[m.protein] || m.protein)}
            ${metaRow("Cuisine", METADATA_LABELS.cuisine[m.cuisine] || m.cuisine)}
            ${metaRow("Difficulty", METADATA_LABELS.difficulty[m.difficulty] || m.difficulty)}
            ${metaRow("Cook time", METADATA_LABELS.cookTimeBucket[m.cookTimeBucket] || m.cookTimeBucket)}
            ${metaRow("Cleanup", `${m.cleanupDifficulty}/5`)}
            ${metaRow("Equipment", m.equipment.join(", ") || "—")}
            ${metaRow("Crew size", METADATA_LABELS.crewSizeBucket[m.crewSize.bucket] || m.crewSize.bucket)}
            ${metaRow("Leftovers", METADATA_LABELS.leftoversQuality[m.leftoversQuality] || m.leftoversQuality)}
            ${metaRow("Hall tested", METADATA_LABELS.hallTested[m.hallTested] || m.hallTested)}
            ${metaRow("Featured", m.featured ? "yes" : "no")}
            ${metaRow("Busy night", m.busyNightSuitable ? "yes" : "no")}
            ${metaRow("Meal style", METADATA_LABELS.mealStyle[m.mealStyle] || m.mealStyle)}
            ${metaRow("Nutrition", METADATA_LABELS.nutritionCategory[m.nutritionCategory] || m.nutritionCategory)}
          </table>
          <p class="muted meta-edit-note">Persist edits: <code>POST /api/admin/curated-recipes/${e(r.recipeId)}/metadata</code></p>`
        : `<div class="muted">metadata not computed</div>`;

      return `
<section class="recipe" id="${e(r.slug)}" data-protein="${e(m?.protein || r.protein)}" data-cuisine="${e(m?.cuisine || r.cuisine)}" data-status="${e(r.status)}" data-difficulty="${diff}" data-cook-bucket="${e(m?.cookTimeBucket || "")}" data-meal-style="${e(m?.mealStyle || "")}" data-nutrition="${e(m?.nutritionCategory || "")}" data-hall-tested="${e(m?.hallTested || "")}" data-busy-night="${m?.busyNightSuitable ? "1" : "0"}" data-min="${e(String(r.totalMinutes || 0))}" data-score="${e(String(score))}" data-meta-score="${e(String(r.metadataCompleteness))}" data-publish-ready="${qaReport?.publishReady ? "1" : "0"}" data-qa-flags="${e(flagCodes)}" data-recipe-role="${e(r.recipeRole || "standalone")}" data-archetype-id="${e(r.archetypeId || "")}">
  <details>
    <summary>
      <div class="sum">
        <div class="thumb">
          <img loading="lazy" src="${e(r.thumbImage)}" data-fallback="${e(r.heroImage)}" alt="${e(r.title)}" class="${thumbExists ? "" : "missing"}"/>
        </div>
        <div class="sum-main">
          <div class="title">${e(r.title)}</div>
          <div class="sub">${e(r.slug)}${r.summary ? ` · ${e(r.summary.slice(0, 120))}${r.summary.length > 120 ? "…" : ""}` : ""}</div>
          <div class="badges">${metaBadges}</div>
          ${parentLine}
          ${dimHtml}
          ${flagsHtml}
          ${warningHtml}
        </div>
      </div>
    </summary>

    <div class="body">
      <div class="grid">
        <div>
          <div class="hero-wrap">
            <img loading="lazy" src="${e(r.heroImage)}" alt="${e(r.title)}" class="${heroExists ? "" : "missing"}"/>
            <div class="img-note">
              hero: <code>${e(r.heroImage)}</code>${isSiteImagesPath(r.heroImage) ? (heroExists ? "" : " · missing") : ""}
            </div>
          </div>
          <h4>Description</h4>
          <p class="${r.summary ? "" : "muted"}">${r.summary ? e(r.summary) : "—"}</p>
          <h4>Tonight’s spread</h4>
          <p class="${r.tonightSpread ? "" : "muted"}">${r.tonightSpread ? e(r.tonightSpread) : "—"}</p>
          <h4>Cleanup tip</h4>
          <p class="${r.cleanupTip ? "" : "muted"}">${r.cleanupTip ? e(r.cleanupTip) : "—"}</p>
          <h4>Station tips</h4>
          ${tipsHtml}
          <h4>Leftovers</h4>
          ${leftoversHtml}
          <h4>Tags</h4>
          ${tagsHtml}
          <h4>CMS metadata</h4>
          ${metadataTable}
          <h4>Editorial QA</h4>
          <div class="qa-grid">${qaHtml}</div>
        </div>

        <div>
          <h4>Ingredients (${r.ingredients.length})</h4>
          <ul class="list">${ingHtml}</ul>
          <h4>Steps (${r.steps.length})</h4>
          <ol class="steps">${stepHtml}</ol>
        </div>
      </div>
    </div>
  </details>
</section>`;
    })
    .join("\n");

  const navProtein = proteins.map((p) => `<button class="chip" data-filter="protein" data-value="${e(p)}">${e(p)}</button>`).join("");
  const navCuisine = cuisines.map((c) => `<button class="chip" data-filter="cuisine" data-value="${e(c)}">${e(c)}</button>`).join("");
  const navStatus = statuses.map((s) => `<button class="chip" data-filter="status" data-value="${e(s)}">${e(s)}</button>`).join("");
  const navDiff = difficulties.map((d) => `<button class="chip" data-filter="difficulty" data-value="${d}">${d}</button>`).join("");
  const navCook = cookBuckets
    .map((b) => `<button class="chip" data-filter="cookBucket" data-value="${b}">${e(METADATA_LABELS.cookTimeBucket[b] || b)}</button>`)
    .join("");
  const navMealStyle = mealStyles
    .map((s) => `<button class="chip" data-filter="mealStyle" data-value="${e(s)}">${e(METADATA_LABELS.mealStyle[s] || s)}</button>`)
    .join("");
  const navNutrition = nutritionCats
    .map((n) => `<button class="chip" data-filter="nutrition" data-value="${e(n)}">${e(METADATA_LABELS.nutritionCategory[n] || n)}</button>`)
    .join("");

  const qaSummaryHtml = `<div class="counts qa-summary">
    <span><strong>QA</strong> · ${qaSummary.recipeCount} recipes</span>
    <span class="sev-critical">critical ${qaSummary.totals.critical}</span>
    <span class="sev-warning">warnings ${qaSummary.totals.warning}</span>
    <span class="sev-info">info ${qaSummary.totals.info}</span>
    <span class="ok-pill">publish-safe ${qaSummary.publishSafe}</span>
    <span class="bad-pill">needs review ${qaSummary.blocked}</span>
  </div>`;

  const offlineNote =
    cacheNote.total > 0 && cacheNote.failed > 0
      ? `<div class="warn" style="margin-top:8px">
          <span class="warn-pill">⚠ Offline images: cached ${cacheNote.saved}/${cacheNote.total}. ${cacheNote.failed} external images could not be downloaded on this machine.</span>
         </div>`
      : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>FirehallMeals — Curated Review Export</title>
  <style>
    :root{
      --bg:#070A0F; --panel:#0E1422; --panel2:#0B1020;
      --text:#E7EEF9; --muted:#9AAAC0; --border:rgba(255,255,255,0.10);
      --accent:#F97316; --warn:#F59E0B; --good:#22C55E; --bad:#EF4444;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      --sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
    }
    html,body{height:100%}
    body{margin:0;font-family:var(--sans);background:radial-gradient(1200px 700px at 20% -10%, rgba(249,115,22,0.18), transparent 55%), var(--bg); color:var(--text);}
    a{color:inherit}
    .topbar{position:sticky;top:0;z-index:20;background:rgba(7,10,15,0.92);backdrop-filter: blur(10px);border-bottom:1px solid var(--border);}
    .top-inner{max-width:1200px;margin:0 auto;padding:12px 16px;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
    .brand{display:flex;gap:10px;align-items:center}
    .logo{width:12px;height:12px;border-radius:3px;background:linear-gradient(135deg,var(--accent),#fb7185)}
    .title{font-weight:800;letter-spacing:0.3px}
    .meta{color:var(--muted);font-size:12px}
    .search{display:flex;gap:8px;align-items:center;flex:1;min-width:260px}
    input[type="search"]{width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--border);color:var(--text);border-radius:10px;padding:10px 12px;font-size:14px}
    .chips{display:flex;gap:8px;flex-wrap:wrap}
    .chip{border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);border-radius:999px;padding:6px 10px;font-size:12px;cursor:pointer}
    .chip.active{border-color:rgba(249,115,22,0.7);background:rgba(249,115,22,0.15)}
    .wrap{max-width:1200px;margin:0 auto;padding:16px}
    .counts{display:flex;gap:10px;flex-wrap:wrap;color:var(--muted);font-size:12px;margin:10px 0 14px}
    .qa-summary .sev-critical{color:#fca5a5}
    .qa-summary .sev-warning{color:#fcd34d}
    .qa-summary .sev-info{color:#cbd5e1}
    .qa-summary .ok-pill{color:#86efac}
    .qa-summary .bad-pill{color:#fca5a5}
    .recipe{border:1px solid var(--border);border-radius:14px;overflow:hidden;background:linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));margin-bottom:12px}
    details summary{list-style:none;cursor:pointer;padding:14px 14px}
    details summary::-webkit-details-marker{display:none}
    .sum{display:flex;gap:12px;align-items:flex-start}
    .thumb{width:72px;height:72px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid var(--border);overflow:hidden;flex:0 0 auto}
    .thumb img{width:100%;height:100%;object-fit:cover;display:block}
    .thumb img.missing{filter:grayscale(1);opacity:0.35}
    .sum-main{min-width:0;flex:1}
    .sub{color:var(--muted);font-size:12px;line-height:1.4;margin-top:2px}
    .badges{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
    .badge{border:1px solid var(--border);background:rgba(255,255,255,0.03);border-radius:999px;padding:4px 8px;font-size:11px;color:var(--muted)}
    .badge.score{color:var(--text);border-color:rgba(34,197,94,0.35)}
    .badge.ok{border-color:rgba(34,197,94,0.45);color:#86efac}
    .badge.bad{border-color:rgba(239,68,68,0.45);color:#fca5a5}
    .badge.family{border-color:rgba(96,165,250,0.45);color:#93c5fd}
    .family-line{font-size:12px;margin-top:6px}
    .family-line a{color:#93c5fd}
    .qa-dims,.qa-flags{margin-top:6px;font-size:11px}
    .qa-flags code{margin-right:6px}
    .flag-error{color:#fca5a5}
    .flag-warn{color:#fcd34d}
    .flag-info{color:var(--muted)}
    .warn{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap}
    .qa-stack{margin-top:10px;display:flex;flex-direction:column;gap:8px}
    .qa-row{display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap}
    .qa-l{font-size:11px;color:var(--muted);min-width:70px}
    .warn-pill{font-size:11px;border-radius:999px;padding:4px 8px;border:1px solid rgba(245,158,11,0.35);background:rgba(245,158,11,0.12);color:rgba(255,231,177,0.95)}
    .warn-pill.sev-critical{border-color:rgba(239,68,68,0.45);background:rgba(239,68,68,0.14);color:#fecaca}
    .warn-pill.sev-warning{border-color:rgba(245,158,11,0.35);background:rgba(245,158,11,0.12);color:rgba(255,231,177,0.95)}
    .warn-pill.sev-info{border-color:rgba(148,163,184,0.35);background:rgba(148,163,184,0.10);color:#cbd5e1}
    .body{padding:0 14px 16px 14px}
    .grid{display:grid;grid-template-columns: 1.05fr 1fr; gap:16px}
    @media (max-width: 980px){ .grid{grid-template-columns:1fr} .thumb{width:60px;height:60px} }
    h4{margin:14px 0 8px 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:rgba(231,238,249,0.85)}
    p{margin:0;color:rgba(231,238,249,0.9);line-height:1.55}
    .muted{color:var(--muted)}
    .tags{display:flex;gap:6px;flex-wrap:wrap}
    .tag{font-size:11px;color:rgba(231,238,249,0.85);border:1px solid var(--border);background:rgba(255,255,255,0.03);padding:4px 7px;border-radius:999px}
    .list{margin:0;padding-left:18px}
    .list li{margin:4px 0;color:rgba(231,238,249,0.88)}
    .steps{margin:0;padding-left:18px}
    .steps li{margin:10px 0}
    .step-h{font-weight:700;margin-bottom:3px}
    .step-b{color:rgba(231,238,249,0.85);line-height:1.55}
    .hero-wrap{border:1px solid var(--border);border-radius:14px;overflow:hidden;background:rgba(255,255,255,0.03)}
    .hero-wrap img{width:100%;height:240px;object-fit:cover;display:block}
    .hero-wrap img.missing{filter:grayscale(1);opacity:0.35}
    .img-note{font-family:var(--mono);font-size:11px;color:var(--muted);padding:8px 10px;border-top:1px solid var(--border);background:rgba(0,0,0,0.18);overflow-wrap:anywhere}
    code{font-family:var(--mono);font-size:11px;color:rgba(231,238,249,0.85)}
    .qa-grid{display:grid;grid-template-columns:1fr 1fr; gap:8px}
    @media (max-width: 560px){ .qa-grid{grid-template-columns:1fr} }
    .qa{display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(231,238,249,0.9)}
    .qa input{accent-color: var(--accent)}
    .meta-table{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0}
    .meta-table th{text-align:left;color:var(--muted);font-weight:600;padding:6px 8px 6px 0;width:38%;vertical-align:top}
    .meta-table td{padding:6px 0;color:rgba(231,238,249,0.92)}
    .meta-edit-note{font-size:11px;margin-top:6px}
    .footer{color:var(--muted);font-size:12px;padding:24px 0 40px;text-align:center}
  </style>
</head>
<body>
  <div class="topbar">
    <div class="top-inner">
      <div class="brand">
        <div class="logo"></div>
        <div>
          <div class="title">Curated Catalog Review</div>
          <div class="meta">Generated ${e(generatedAt)} · ${recipes.length} recipes · offline bundle</div>
          ${offlineNote}
        </div>
      </div>

      <div class="search">
        <input id="q" type="search" placeholder="Search title / slug / tags… (Ctrl+F works too)" />
      </div>
    </div>
    <div class="top-inner" style="padding-top:0">
      <div class="chips" id="chips">
        <button class="chip active" data-filter="all" data-value="all">All</button>
        ${navStatus}
        <span style="opacity:.35">|</span>
        ${navProtein}
        <span style="opacity:.35">|</span>
        ${navCuisine}
        <span style="opacity:.35">|</span>
        ${navDiff}
        <span style="opacity:.35">|</span>
        ${navCook}
        <span style="opacity:.35">|</span>
        ${navMealStyle}
        <span style="opacity:.35">|</span>
        ${navNutrition}
        <span style="opacity:.35">|</span>
        <button class="chip" data-filter="busyNight" data-value="1">Busy night</button>
        <button class="chip" data-filter="hallTested" data-value="hall_approved">Hall approved</button>
        <span style="opacity:.35">|</span>
        <button class="chip" data-filter="time" data-value="<=30">≤ 30 min</button>
        <button class="chip" data-filter="time" data-value="<=60">≤ 60 min</button>
        <button class="chip" data-filter="time" data-value=">60">&gt; 60 min</button>
      </div>
      <div class="counts" id="counts"></div>
      ${qaSummaryHtml}
    </div>
  </div>

  <div class="wrap" id="list">
    ${recipeCards}
    <div class="footer">FirehallMeals review export · generated ${e(generatedAt)}</div>
  </div>

  <script>
    (function(){
      const q = document.getElementById('q');
      const chips = document.getElementById('chips');
      const list = document.getElementById('list');
      const counts = document.getElementById('counts');
      const recipes = Array.from(document.querySelectorAll('.recipe'));
      let active = { filter: 'all', value: 'all' };

      // Fallback image swap (thumb -> hero)
      document.querySelectorAll('img[data-fallback]').forEach(img => {
        img.addEventListener('error', () => {
          const fb = img.getAttribute('data-fallback');
          if (fb && img.getAttribute('src') !== fb) img.setAttribute('src', fb);
          img.classList.add('missing');
        });
      });
      document.querySelectorAll('.hero-wrap img').forEach(img => {
        img.addEventListener('error', () => img.classList.add('missing'));
      });

      function passesFilter(el){
        const text = (el.textContent || '').toLowerCase();
        const query = (q.value || '').trim().toLowerCase();
        if (query && !text.includes(query)) return false;

        if (active.filter === 'all') return true;
        if (active.filter === 'protein') return (el.dataset.protein || '') === active.value;
        if (active.filter === 'cuisine') return (el.dataset.cuisine || '') === active.value;
        if (active.filter === 'status') return (el.dataset.status || '') === active.value;
        if (active.filter === 'difficulty') return (el.dataset.difficulty || '') === active.value;
        if (active.filter === 'cookBucket') return (el.dataset.cookBucket || '') === active.value;
        if (active.filter === 'mealStyle') return (el.dataset.mealStyle || '') === active.value;
        if (active.filter === 'nutrition') return (el.dataset.nutrition || '') === active.value;
        if (active.filter === 'busyNight') return (el.dataset.busyNight || '') === active.value;
        if (active.filter === 'hallTested') return (el.dataset.hallTested || '') === active.value;
        if (active.filter === 'time'){
          const m = parseInt(el.dataset.min || '0', 10) || 0;
          if (active.value === '<=30') return m > 0 && m <= 30;
          if (active.value === '<=60') return m > 0 && m <= 60;
          if (active.value === '>60') return m > 60;
        }
        return true;
      }

      function render(){
        let visible = 0;
        for (const el of recipes){
          const ok = passesFilter(el);
          el.style.display = ok ? '' : 'none';
          if (ok) visible++;
        }
        counts.textContent = visible + ' shown · ' + recipes.length + ' total';
      }

      q.addEventListener('input', render);
      chips.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button[data-filter]');
        if (!btn) return;
        active = { filter: btn.dataset.filter, value: btn.dataset.value };
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        render();
      });

      render();
    })();
  </script>
</body>
</html>`;
}

function buildGoldenMd(
  recipes: HydratedRecipe[],
  qaById: Map<string, EditorialQaReport>,
  generatedAt: string,
): string {
  const golden = recipes.filter((r) => r.tags.includes("golden_100") || r.tags.includes("golden100") || r.tags.includes("golden"));

  const lines: string[] = [];
  lines.push(`# Golden 100 — Editorial Review`);
  lines.push("");
  lines.push(`Generated: **${generatedAt}**`);
  lines.push(`Total Golden-tagged recipes: **${golden.length}**`);
  lines.push("");
  lines.push(`QA legend (check when approved):`);
  lines.push(`- [ ] image correct`);
  lines.push(`- [ ] instructions clear`);
  lines.push(`- [ ] realistic timing`);
  lines.push(`- [ ] no duplicate recipe`);
  lines.push(`- [ ] beginner friendly`);
  lines.push(`- [ ] firefighter appropriate`);
  lines.push(`- [ ] publish approved`);
  lines.push("");

  for (const r of golden) {
    const qaReport = qaById.get(r.recipeId);
    const warnings = (qaReport?.activeFlags ?? []).map((f) => `${f.code}: ${f.message}`);
    const score = qaReport?.overallScore ?? 0;
    lines.push(`---`);
    lines.push(`## ${r.title}`);
    lines.push("");
    lines.push(`- **slug**: \`${r.slug}\``);
    lines.push(`- **status**: \`${r.status}\``);
    if (r.archetypeId) lines.push(`- **archetype**: \`${r.archetypeId}\` · role \`${r.recipeRole || "standalone"}\``);
    if (r.parentSlug) lines.push(`- **parent**: \`${r.parentSlug}\` (${r.parentTitle || ""})`);
    if (r.variantKey) lines.push(`- **variant key**: \`${r.variantKey}\``);
    const heroAvail = checkImageAvailability(r.heroImage, r.thumbImage, { cwd: process.cwd(), reviewAssetsDir: OUT_ASSETS });
    lines.push(`- **hero**: \`${r.heroImage}\`${isSiteImagesPath(r.heroImage) && !heroAvail.heroProductionOk ? " (missing on disk)" : ""}`);
    lines.push(`- **thumb**: \`${r.thumbImage}\`${isSiteImagesPath(r.thumbImage) && !heroAvail.thumbProductionOk ? " (missing on disk)" : ""}`);
    lines.push(`- **protein/cuisine**: ${r.protein || "—"} / ${r.cuisine || "—"}`);
    lines.push(`- **cook time**: ${fmtMinutes(r.totalMinutes)} (prep ${fmtMinutes(r.prepMinutes)}, cook ${fmtMinutes(r.cookMinutes)})`);
    lines.push(`- **cleanup**: ${r.cleanupDifficulty}/5`);
    lines.push(`- **scores**: QA=${score} · publishReady=${qaReport?.publishReady ? "yes" : "no"} · meta=${r.metadataCompleteness}%`);
    if (warnings.length) lines.push(`- **QA flags**: ${warnings.join("; ")}`);
    if (qaReport?.suppressedFlags?.length) {
      lines.push(`- **suppressed**: ${qaReport.suppressedFlags.map((f) => f.code).join(", ")}`);
    }
    lines.push("");
    lines.push(`### Editorial QA`);
    lines.push(`- [ ] image correct`);
    lines.push(`- [ ] instructions clear`);
    lines.push(`- [ ] realistic timing`);
    lines.push(`- [ ] no duplicate recipe`);
    lines.push(`- [ ] beginner friendly`);
    lines.push(`- [ ] firefighter appropriate`);
    lines.push(`- [ ] publish approved`);
    lines.push("");
    lines.push(`### Description`);
    lines.push(r.summary ? r.summary : "_(missing)_");
    lines.push("");
    lines.push(`### Tonight’s spread`);
    lines.push(r.tonightSpread ? r.tonightSpread : "_(missing)_");
    lines.push("");
    lines.push(`### Cleanup tip`);
    lines.push(r.cleanupTip ? r.cleanupTip : "_(missing)_");
    lines.push("");
    lines.push(`### Station tips`);
    lines.push(r.stationTips && r.stationTips.length ? r.stationTips.map((t) => `- ${t}`).join("\n") : "_(none)_");
    lines.push("");
    lines.push(`### Leftovers`);
    lines.push(r.leftovers ? r.leftovers : "_(missing)_");
    lines.push("");
    lines.push(`### Tags`);
    lines.push(r.tags.length ? r.tags.map((t) => `- \`${t}\``).join("\n") : "_(none)_");
    lines.push("");
    lines.push(`### Ingredients`);
    lines.push(r.ingredients.map((i) => `- ${i.originalText || i.name}`).join("\n"));
    lines.push("");
    lines.push(`### Steps`);
    lines.push(r.steps.map((s) => `1. **${s.heading || `Step ${s.n}`}** — ${s.body}`).join("\n"));
    lines.push("");
  }

  return lines.join("\n");
}

async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (process.env.REVIEW_INSECURE_TLS === "true") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    console.warn("[review] REVIEW_INSECURE_TLS=true — TLS verification disabled for this export process only");
  }

  const recipes = await loadAllCurated();

  // Make bundle offline-friendly by caching external images locally.
  // This only affects the review export output (does not modify DB).
  let cacheTotal = 0;
  let cacheSaved = 0;
  let cacheFailed = 0;
  {
    const urlSet = new Set<string>();
    for (const r of recipes) {
      if (isAbsoluteHttp(r.heroImage)) urlSet.add(r.heroImage);
      if (isAbsoluteHttp(r.thumbImage)) urlSet.add(r.thumbImage);
    }

    const urls = [...urlSet];
    cacheTotal = urls.length;
    const mapped = new Map<string, string>();
    const concurrency = Math.max(2, Math.min(10, Number(process.env.REVIEW_IMAGE_CONCURRENCY) || 6));
    let done = 0;

    async function worker(start: number) {
      for (let idx = start; idx < urls.length; idx += concurrency) {
        const u = urls[idx];
        const cached = await cacheExternalImage(u);
        mapped.set(u, cached.path);
        if (cached.saved) cacheSaved++;
        if (!cached.saved && cached.path === u) cacheFailed++;
        done++;
        if (done % 25 === 0 || done === urls.length) {
          console.log(
            `[review] cached ${done}/${urls.length} external images (saved=${cacheSaved}, failed=${cacheFailed})`,
          );
        }
      }
    }

    if (urls.length) {
      console.log(`[review] caching ${urls.length} external images (concurrency=${concurrency})`);
      await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i)));
      for (const r of recipes) {
        if (isAbsoluteHttp(r.heroImage)) r.heroImage = mapped.get(r.heroImage) || r.heroImage;
        if (isAbsoluteHttp(r.thumbImage)) r.thumbImage = mapped.get(r.thumbImage) || r.thumbImage;
      }
    }
  }

  const qaById = runCatalogQa(recipes);
  const qaSummary = summarizeEditorialQaReports([...qaById.values()]);
  const html = buildHtml(recipes, qaById, generatedAt, {
    total: cacheTotal,
    saved: cacheSaved,
    failed: cacheFailed,
  }, qaSummary);
  const md = buildGoldenMd(recipes, qaById, generatedAt);
  const qaJsonPath = path.join(OUT_DIR, "editorial-qa-report.json");
  fs.writeFileSync(
    qaJsonPath,
    JSON.stringify(
      {
        generatedAt,
        engineVersion: [...qaById.values()][0]?.engineVersion ?? 1,
        recipeCount: recipes.length,
        summary: qaSummary,
        reports: [...qaById.values()],
      },
      null,
      2,
    ),
    "utf8",
  );

  fs.writeFileSync(OUT_HTML, html, "utf8");
  fs.writeFileSync(OUT_MD, md, "utf8");

  flushSqliteToDisk();
  releaseSqliteTimersForTests();

  console.log(`[review] wrote ${path.relative(process.cwd(), OUT_HTML)}`);
  console.log(`[review] wrote ${path.relative(process.cwd(), OUT_MD)}`);
  console.log(`[review] wrote ${path.relative(process.cwd(), qaJsonPath)}`);
  console.log(`[review] QA summary: publish-safe=${qaSummary.publishSafe} needs-review=${qaSummary.blocked} critical=${qaSummary.totals.critical} warning=${qaSummary.totals.warning} info=${qaSummary.totals.info}`);
  console.log(`[review] recipes=${recipes.length} generatedAt=${generatedAt}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

