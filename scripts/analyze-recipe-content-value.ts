/**
 * SEO Phase 4 — Step 1/2/3 analysis: inventories every indexable recipe
 * family, the differentiating content fields that exist beyond the generic
 * title/description/ingredients/instructions/nutrition core, their real
 * coverage/uniqueness, and exact-duplicate values across those fields.
 *
 * READ-ONLY. Does not modify any recipe data. Run with:
 *   npx tsx scripts/analyze-recipe-content-value.ts
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

interface FamilyDef {
  id: string;
  label: string;
  indexFile: string;
  pagesDir: string;
  routePattern: string;
  schema: "golden" | "breakfast" | "fuel";
  /** Filter index entries down to this family when pages are shared on disk (breakfast/breakfast-performance). */
  slugFilter?: (slug: string) => boolean;
}

const BREAKFAST_PAGES_DIR = path.join(PUBLIC, "catalog", "breakfast", "pages");

const FAMILIES: FamilyDef[] = [
  {
    id: "golden-100",
    label: "Golden 100",
    indexFile: path.join(PUBLIC, "catalog", "golden-100", "index.json"),
    pagesDir: path.join(PUBLIC, "catalog", "golden-100", "pages"),
    routePattern: "/recipes/:slug",
    schema: "golden",
  },
  {
    id: "hall-expansion",
    label: "Hall Expansion",
    indexFile: path.join(PUBLIC, "catalog", "hall-expansion", "index.json"),
    pagesDir: path.join(PUBLIC, "catalog", "hall-expansion", "pages"),
    routePattern: "/recipes/:slug",
    schema: "golden",
  },
  {
    id: "performance-meals",
    label: "Performance",
    indexFile: path.join(PUBLIC, "catalog", "performance-meals", "index.json"),
    pagesDir: path.join(PUBLIC, "catalog", "performance-meals", "pages"),
    routePattern: "/recipes/:slug",
    schema: "golden",
  },
  {
    id: "bbq",
    label: "BBQ",
    indexFile: path.join(PUBLIC, "catalog", "bbq", "index.json"),
    pagesDir: path.join(PUBLIC, "catalog", "bbq", "pages"),
    routePattern: "/recipes/:slug",
    schema: "golden",
  },
  {
    id: "pizza-night",
    label: "Pizza Night",
    indexFile: path.join(PUBLIC, "catalog", "pizza-night", "index.json"),
    pagesDir: path.join(PUBLIC, "catalog", "pizza-night", "pages"),
    routePattern: "/recipes/:slug",
    schema: "golden",
  },
  {
    id: "breakfast",
    label: "Breakfast",
    indexFile: path.join(PUBLIC, "catalog", "breakfast", "index.json"),
    pagesDir: BREAKFAST_PAGES_DIR,
    routePattern: "/breakfast/:slug",
    schema: "breakfast",
  },
  {
    id: "breakfast-performance",
    label: "Breakfast Performance",
    indexFile: path.join(PUBLIC, "catalog", "breakfast", "performance", "index.json"),
    pagesDir: BREAKFAST_PAGES_DIR,
    routePattern: "/breakfast/performance/:slug",
    schema: "breakfast",
  },
  {
    id: "smoothies",
    label: "Smoothies",
    indexFile: path.join(PUBLIC, "catalog", "smoothies", "index.json"),
    pagesDir: path.join(PUBLIC, "catalog", "smoothies", "pages"),
    routePattern: "/smoothies/:slug",
    schema: "fuel",
  },
];

interface LoadedRecipe {
  familyId: string;
  familyLabel: string;
  slug: string;
  data: Record<string, unknown>;
}

function loadFamily(def: FamilyDef): LoadedRecipe[] {
  const index = readJson<{ recipes: Array<{ slug: string }> }>(def.indexFile);
  if (!index) {
    console.error(`[analyze] MISSING index: ${def.indexFile}`);
    return [];
  }
  const out: LoadedRecipe[] = [];
  for (const entry of index.recipes) {
    const file = path.join(def.pagesDir, `${entry.slug}.json`);
    const data = readJson<Record<string, unknown>>(file);
    if (!data) {
      console.error(`[analyze] MISSING page for ${def.id}/${entry.slug}: ${file}`);
      continue;
    }
    out.push({ familyId: def.id, familyLabel: def.label, slug: entry.slug, data });
  }
  return out;
}

// ---------------------------------------------------------------------------
// STEP 1 — inventory
// ---------------------------------------------------------------------------

const allRecipes: LoadedRecipe[] = [];
for (const def of FAMILIES) {
  const recipes = loadFamily(def);
  allRecipes.push(...recipes);
  console.log(`[family] ${def.label.padEnd(22)} ${def.routePattern.padEnd(26)} count=${recipes.length}`);
}
console.log(`\nTotal indexable recipes loaded: ${allRecipes.length}\n`);

// ---------------------------------------------------------------------------
// STEP 2 — candidate differentiating fields (real field names only)
// ---------------------------------------------------------------------------

type FieldKind = "string" | "string[]";

interface FieldDef {
  key: string;
  path: string[]; // dotted path into recipe.data
  kind: FieldKind;
  families: string[]; // which family ids this field is checked against
}

const CANDIDATE_FIELDS: FieldDef[] = [
  { key: "whyCrewsLikeIt", path: ["whyCrewsLikeIt"], kind: "string", families: ["golden-100", "hall-expansion", "performance-meals", "bbq", "pizza-night"] },
  { key: "proTips", path: ["proTips"], kind: "string[]", families: ["golden-100", "hall-expansion", "performance-meals", "bbq", "pizza-night"] },
  { key: "tonightSpread", path: ["tonightSpread"], kind: "string[]", families: ["golden-100", "hall-expansion", "performance-meals", "bbq", "pizza-night", "breakfast", "breakfast-performance"] },
  { key: "leftovers", path: ["leftovers"], kind: "string[]", families: ["golden-100", "hall-expansion", "performance-meals", "bbq", "pizza-night", "breakfast", "breakfast-performance"] },
  { key: "mealPrepNotes", path: ["mealPrepNotes"], kind: "string", families: ["golden-100", "hall-expansion", "performance-meals", "bbq", "pizza-night"] },
  { key: "substitutions", path: ["substitutions"], kind: "string[]", families: ["golden-100", "hall-expansion", "performance-meals", "bbq", "pizza-night", "smoothies"] },
  { key: "equipment", path: ["equipment"], kind: "string[]", families: ["golden-100", "hall-expansion", "performance-meals", "bbq", "pizza-night", "breakfast", "breakfast-performance"] },
  { key: "stationWorkflow", path: ["stationWorkflow"], kind: "string[]", families: ["breakfast", "breakfast-performance"] },
  { key: "cleanupNotes", path: ["cleanupNotes"], kind: "string[]", families: ["breakfast", "breakfast-performance"] },
  { key: "shiftNote", path: ["shiftNote"], kind: "string", families: ["smoothies"] },
  { key: "nutrition.highlights", path: ["nutrition", "highlights"], kind: "string", families: ["smoothies"] },
  // Fields that only appear on the *source* BbqRecipe/type definitions — verifying whether they survive onto the final page JSON at all.
  { key: "stationTimingNotes", path: ["stationTimingNotes"], kind: "string", families: ["bbq"] },
  { key: "allergyNotes", path: ["allergyNotes"], kind: "string", families: ["bbq"] },
];

function getPath(obj: unknown, p: string[]): unknown {
  let cur = obj;
  for (const key of p) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function normalizeForDup(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

console.log("=".repeat(100));
console.log("STEP 2 — CANDIDATE DIFFERENTIATING FIELD COVERAGE");
console.log("=".repeat(100));

interface FieldStat {
  field: FieldDef;
  recipesEligible: number; // recipes in families where this field is checked
  recipesWithField: number;
  totalValues: number; // for string[] fields, total entries across all recipes
  uniqueValues: number;
  exactDuplicateValueCount: number; // # of distinct values that appear >1 time
  duplicateOccurrences: Map<string, { preview: string; count: number; families: Set<string>; slugs: string[] }>;
}

const fieldStats: FieldStat[] = [];

for (const field of CANDIDATE_FIELDS) {
  const eligible = allRecipes.filter((r) => field.families.includes(r.familyId));
  let recipesWithField = 0;
  let totalValues = 0;
  const valueMap = new Map<string, { preview: string; count: number; families: Set<string>; slugs: string[] }>();

  for (const r of eligible) {
    const raw = getPath(r.data, field.path);
    if (field.kind === "string") {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (s) {
        recipesWithField++;
        totalValues++;
        const norm = normalizeForDup(s);
        const entry = valueMap.get(norm) ?? { preview: s.slice(0, 90), count: 0, families: new Set(), slugs: [] };
        entry.count++;
        entry.families.add(r.familyId);
        entry.slugs.push(r.slug);
        valueMap.set(norm, entry);
      }
    } else {
      const arr = Array.isArray(raw) ? (raw as unknown[]).filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
      if (arr.length > 0) recipesWithField++;
      for (const s of arr) {
        totalValues++;
        const norm = normalizeForDup(s);
        const entry = valueMap.get(norm) ?? { preview: s.slice(0, 90), count: 0, families: new Set(), slugs: [] };
        entry.count++;
        entry.families.add(r.familyId);
        entry.slugs.push(r.slug);
        valueMap.set(norm, entry);
      }
    }
  }

  const uniqueValues = valueMap.size;
  const duplicates = [...valueMap.entries()].filter(([, v]) => v.count > 1);
  const exactDuplicateValueCount = duplicates.length;

  fieldStats.push({
    field,
    recipesEligible: eligible.length,
    recipesWithField,
    totalValues,
    uniqueValues,
    exactDuplicateValueCount,
    duplicateOccurrences: valueMap,
  });

  const pct = eligible.length ? ((recipesWithField / eligible.length) * 100).toFixed(1) : "0.0";
  console.log(
    `\n[field] ${field.key}  (${field.kind})  families=[${field.families.join(",")}]\n` +
      `  eligible recipes: ${eligible.length}\n` +
      `  recipes with non-empty field: ${recipesWithField} (${pct}%)\n` +
      `  total values (entries): ${totalValues}\n` +
      `  unique values: ${uniqueValues}\n` +
      `  exact-duplicate distinct values (count>1): ${exactDuplicateValueCount}`,
  );
}

// ---------------------------------------------------------------------------
// STEP 3 — duplicate content analysis (top offenders across all fields)
// ---------------------------------------------------------------------------

console.log("\n" + "=".repeat(100));
console.log("STEP 3 — TOP EXACT-DUPLICATE VALUES ACROSS ALL DIFFERENTIATING FIELDS");
console.log("=".repeat(100));

interface DupRow {
  fieldKey: string;
  preview: string;
  count: number;
  families: string[];
}

const allDupRows: DupRow[] = [];
for (const stat of fieldStats) {
  for (const [, v] of stat.duplicateOccurrences) {
    if (v.count > 1) {
      allDupRows.push({ fieldKey: stat.field.key, preview: v.preview, count: v.count, families: [...v.families].sort() });
    }
  }
}
allDupRows.sort((a, b) => b.count - a.count);

console.log(`\nTotal distinct duplicated values found: ${allDupRows.length}`);
console.log(`Values duplicated across >=70 recipes: ${allDupRows.filter((r) => r.count >= 70).length}`);
console.log(`Values duplicated across 40-69 recipes: ${allDupRows.filter((r) => r.count >= 40 && r.count < 70).length}`);
console.log(`Values duplicated across 10-39 recipes: ${allDupRows.filter((r) => r.count >= 10 && r.count < 40).length}`);
console.log(`Values duplicated across 2-9 recipes: ${allDupRows.filter((r) => r.count >= 2 && r.count < 10).length}`);

console.log("\nTop 40 by recipe count:\n");
for (const row of allDupRows.slice(0, 40)) {
  console.log(`  [${row.count.toString().padStart(3)}x] (${row.fieldKey}) [${row.families.join(",")}] "${row.preview}${row.preview.length >= 90 ? "…" : ""}"`);
}

// ---------------------------------------------------------------------------
// STEP 8 (measurement only) — per-family thinness / SSR-differentiation stats
// ---------------------------------------------------------------------------

console.log("\n" + "=".repeat(100));
console.log("STEP 8 — PER-FAMILY THINNESS MEASUREMENT (differentiating content only)");
console.log("=".repeat(100));

function differentiatingCharCount(r: LoadedRecipe): number {
  let n = 0;
  for (const field of CANDIDATE_FIELDS) {
    if (!field.families.includes(r.familyId)) continue;
    const raw = getPath(r.data, field.path);
    if (field.kind === "string" && typeof raw === "string") n += raw.trim().length;
    if (field.kind === "string[]" && Array.isArray(raw)) {
      for (const s of raw) if (typeof s === "string") n += s.trim().length;
    }
  }
  return n;
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

interface FamilyThinness {
  familyId: string;
  count: number;
  medianChars: number;
  pctWithAnyGuidance: number;
  pctDuplicateHeavy: number; // % of recipes where >=50% of their differentiating field VALUES are exact duplicates found elsewhere
}

const familyThinness: FamilyThinness[] = [];
const dupValueSet = new Set(allDupRows.map((r) => `${r.fieldKey}::${normalizeForDup(r.preview)}`)); // approx — full check below uses valueMap directly

for (const def of FAMILIES) {
  const recipes = allRecipes.filter((r) => r.familyId === def.id);
  if (!recipes.length) continue;
  const chars = recipes.map(differentiatingCharCount);
  const withGuidance = recipes.filter((r) => differentiatingCharCount(r) > 0).length;

  let dupHeavyCount = 0;
  for (const r of recipes) {
    let totalVals = 0;
    let dupVals = 0;
    for (const field of CANDIDATE_FIELDS) {
      if (!field.families.includes(r.familyId)) continue;
      const raw = getPath(r.data, field.path);
      const stat = fieldStats.find((s) => s.field.key === field.key)!;
      if (field.kind === "string" && typeof raw === "string" && raw.trim()) {
        totalVals++;
        const entry = stat.duplicateOccurrences.get(normalizeForDup(raw.trim()));
        if (entry && entry.count > 1) dupVals++;
      }
      if (field.kind === "string[]" && Array.isArray(raw)) {
        for (const s of raw) {
          if (typeof s !== "string" || !s.trim()) continue;
          totalVals++;
          const entry = stat.duplicateOccurrences.get(normalizeForDup(s.trim()));
          if (entry && entry.count > 1) dupVals++;
        }
      }
    }
    if (totalVals > 0 && dupVals / totalVals >= 0.5) dupHeavyCount++;
  }

  familyThinness.push({
    familyId: def.id,
    count: recipes.length,
    medianChars: median(chars),
    pctWithAnyGuidance: (withGuidance / recipes.length) * 100,
    pctDuplicateHeavy: (dupHeavyCount / recipes.length) * 100,
  });
}

console.log(
  "\n" +
    ["family", "count", "medianDiffChars", "%withAnyGuidance", "%duplicateHeavy"].map((h) => h.padEnd(18)).join(""),
);
for (const f of familyThinness.sort((a, b) => a.medianChars - b.medianChars)) {
  console.log(
    [
      f.familyId,
      String(f.count),
      String(Math.round(f.medianChars)),
      f.pctWithAnyGuidance.toFixed(1) + "%",
      f.pctDuplicateHeavy.toFixed(1) + "%",
    ]
      .map((c) => c.padEnd(18))
      .join(""),
  );
}

// ---------------------------------------------------------------------------
// Backlog candidates: thinnest + most duplicate-heavy recipes, ranked
// ---------------------------------------------------------------------------

console.log("\n" + "=".repeat(100));
console.log("EDITORIAL BACKLOG CANDIDATES (thinnest + most duplicate-heavy, top 25)");
console.log("=".repeat(100));

interface BacklogRow {
  familyId: string;
  slug: string;
  diffChars: number;
  dupRatio: number;
  score: number;
}
const backlogRows: BacklogRow[] = [];
for (const r of allRecipes) {
  const chars = differentiatingCharCount(r);
  let totalVals = 0;
  let dupVals = 0;
  for (const field of CANDIDATE_FIELDS) {
    if (!field.families.includes(r.familyId)) continue;
    const raw = getPath(r.data, field.path);
    const stat = fieldStats.find((s) => s.field.key === field.key)!;
    if (field.kind === "string" && typeof raw === "string" && raw.trim()) {
      totalVals++;
      const entry = stat.duplicateOccurrences.get(normalizeForDup(raw.trim()));
      if (entry && entry.count > 1) dupVals++;
    }
    if (field.kind === "string[]" && Array.isArray(raw)) {
      for (const s of raw) {
        if (typeof s !== "string" || !s.trim()) continue;
        totalVals++;
        const entry = stat.duplicateOccurrences.get(normalizeForDup(s.trim()));
        if (entry && entry.count > 1) dupVals++;
      }
    }
  }
  const dupRatio = totalVals > 0 ? dupVals / totalVals : 0;
  // Lower chars + higher dup ratio = worse. Score: higher = more urgent.
  const score = dupRatio * 100 - chars / 20;
  backlogRows.push({ familyId: r.familyId, slug: r.slug, diffChars: chars, dupRatio, score });
}
backlogRows.sort((a, b) => b.score - a.score);
for (const row of backlogRows.slice(0, 25)) {
  console.log(
    `  ${row.familyId.padEnd(20)} ${row.slug.padEnd(38)} diffChars=${String(row.diffChars).padEnd(5)} dupRatio=${(row.dupRatio * 100).toFixed(0)}%`,
  );
}

console.log("\n[analyze-recipe-content-value] done.");
