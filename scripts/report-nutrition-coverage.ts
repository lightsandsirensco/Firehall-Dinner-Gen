#!/usr/bin/env tsx
/**
 * Read-only nutrition coverage report: how many published recipes have per-serving
 * macros trusted enough for nutrition goals (`numericFilterEligible`), and why the
 * rest don't. Never writes recipe files.
 *
 *   npx tsx scripts/report-nutrition-coverage.ts
 */
import fs from "node:fs";
import path from "node:path";
import { auditRecipeNutritionIntegrity, type NutritionCatalogId } from "../shared/nutrition/integrity-audit.js";
import {
  isEligibleForNumericNutritionFilter,
  MIN_INGREDIENT_MATCH_PCT_FOR_NUMERIC_FILTER,
  NUMERIC_FILTER_DISQUALIFYING_CODES,
} from "../shared/nutrition/filter-eligibility.js";
import { catalogIngredientsFromUnknown, defaultRecipeServings } from "../shared/nutrition/servings.js";
import { getRecipeBaseServings } from "../shared/recipe/crew-scaling-config.js";

const COLLECTIONS: Array<{ id: string; catalogId: NutritionCatalogId; mealType: "dinner" | "breakfast" }> = [
  { id: "golden-100", catalogId: "golden_100", mealType: "dinner" },
  { id: "hall-expansion", catalogId: "hall_expansion", mealType: "dinner" },
  { id: "bbq", catalogId: "bbq_grill", mealType: "dinner" },
  { id: "performance-meals", catalogId: "performance_meals", mealType: "dinner" },
  { id: "pizza-night", catalogId: "pizza_night", mealType: "dinner" },
  { id: "breakfast", catalogId: "breakfast", mealType: "breakfast" },
];

type Row = { collection: string; slug: string; protein: string; popular: boolean; verified: boolean; reasons: string[] };
const rows: Row[] = [];

for (const c of COLLECTIONS) {
  const dir = path.join("client/public/catalog", c.id, "pages");
  if (!fs.existsSync(dir)) continue;
  const indexPath = path.join("client/public/catalog", c.id, "index.json");
  const proteinBySlug = new Map<string, string>(
    fs.existsSync(indexPath)
      ? (JSON.parse(fs.readFileSync(indexPath, "utf8")).recipes ?? []).map((e: { slug: string; protein?: string }) => [
          e.slug,
          e.protein ?? "unknown",
        ])
      : [],
  );
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const json = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    if (!json?.slug) continue;
    const n = json.nutrition ?? {};
    const estimateAvailable = Boolean(n.estimateAvailable);
    const audit = auditRecipeNutritionIntegrity({
      slug: json.slug,
      title: String(json.displayTitle || json.title || json.slug),
      catalog: c.catalogId,
      mealType: c.mealType,
      category: typeof json.category === "string" ? json.category : undefined,
      baseServings:
        getRecipeBaseServings({
          baseServings: Number(json.baseServings) || undefined,
          crewSize: Number(json.crewSize) || undefined,
        }) || defaultRecipeServings(json, c.mealType),
      ingredients: catalogIngredientsFromUnknown(json.ingredients),
      stored: {
        calories: Number(n.calories ?? json.calories ?? 0),
        protein: Number(n.protein ?? json.protein ?? 0),
        carbs: Number(n.carbs ?? json.carbs ?? 0),
        fat: Number(n.fats ?? n.fat ?? json.fats ?? json.fat ?? 0),
        source: n.source,
        estimateAvailable,
      },
    });
    const verified = estimateAvailable && isEligibleForNumericNutritionFilter(audit);
    const reasons: string[] = [];
    if (!estimateAvailable) reasons.push("no_estimate");
    if (audit.status === "withheld") reasons.push("withheld");
    if (audit.ingredientMatchPct < MIN_INGREDIENT_MATCH_PCT_FOR_NUMERIC_FILTER) reasons.push("low_ingredient_match");
    for (const f of audit.findings) if (NUMERIC_FILTER_DISQUALIFYING_CODES.has(f.code)) reasons.push(f.code);
    rows.push({
      collection: c.id,
      slug: json.slug,
      protein: String(proteinBySlug.get(json.slug) ?? "unknown").toLowerCase(),
      popular: Number(json.popularityWeight) >= 0.8,
      verified,
      reasons: [...new Set(reasons)],
    });
  }
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const tally = (key: (r: Row) => string) => {
  const m = new Map<string, { total: number; verified: number }>();
  for (const r of rows) {
    const t = m.get(key(r)) ?? { total: 0, verified: 0 };
    t.total++;
    if (r.verified) t.verified++;
    m.set(key(r), t);
  }
  return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
};

const verifiedCount = rows.filter((r) => r.verified).length;
console.log(`Recipes: ${rows.length} · verified for goals: ${verifiedCount} (${pct(verifiedCount, rows.length)})\n`);
console.log("By collection:");
for (const [k, t] of tally((r) => r.collection)) console.log(`  ${k.padEnd(20)} ${t.verified}/${t.total} (${pct(t.verified, t.total)})`);
console.log("\nBy protein:");
for (const [k, t] of tally((r) => r.protein)) console.log(`  ${k.padEnd(20)} ${t.verified}/${t.total} (${pct(t.verified, t.total)})`);
console.log("\nBy catalog popularity weight:");
for (const [k, t] of tally((r) => (r.popular ? "popular (>= 0.8)" : "other"))) console.log(`  ${k.padEnd(20)} ${t.verified}/${t.total} (${pct(t.verified, t.total)})`);

const reasonCounts = new Map<string, number>();
for (const r of rows) if (!r.verified) for (const x of r.reasons) reasonCounts.set(x, (reasonCounts.get(x) ?? 0) + 1);
console.log("\nWhy unverified (a recipe can have several):");
for (const [k, v] of [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(28)} ${v}`);

const out = path.join("tmp", "nutrition-coverage.json");
fs.mkdirSync("tmp", { recursive: true });
fs.writeFileSync(out, JSON.stringify(rows.filter((r) => !r.verified), null, 2));
console.log(`\nUnverified recipe list: ${out}`);
