#!/usr/bin/env tsx
/**
 * Audit recipe titles for firefighter-native realism.
 *
 *   npx tsx scripts/audit-recipe-title-human-realism.ts
 *   npx tsx scripts/audit-recipe-title-human-realism.ts --json
 */
import { GOLDEN_100_RECIPES } from "../shared/golden-100/index.js";
import { CLASSIC_HALL_MEALS } from "../shared/classic-hall-meals.js";
import { PERFORMANCE_ADAPTED_RECIPES } from "../shared/performance-meals/adapted/index.js";
import { scoreRecipeTitle } from "../shared/recipe-title-quality.js";
import { isRoboticTitle } from "../shared/generation-reliability.js";

const FILLER_RX =
  /\b(power|hearty|ultimate|performance|high-protein|hall-sized|giant|creamy|classic)\b/i;
const LOADED_RX = /\bloaded\b/i;
const SHEET_PAN_RX = /\bsheet\s*pan\b/i;
const FOR_CREW_RX = /\bfor the (crew|hall)\b/i;
const BLOG_LEADING_RX =
  /^\s*(grilled|charcoal|smoked|fresh|quick|korean|mexican|moroccan|mediterranean|lemon herb grilled|honey garlic grilled|teriyaki grilled|cedar plank grilled)\b/i;
const UNNATURAL_WITH_RX = /\bwith\s+.{20,}/i;

export type TitleFlagReason =
  | "filler_word"
  | "loaded"
  | "sheet_pan"
  | "for_crew"
  | "blog_leading"
  | "unnatural_with_clause"
  | "too_long"
  | "too_many_words"
  | "robotic"
  | "quality_fail";

export interface FlaggedTitle {
  source: "golden_100" | "classics_wheel" | "performance";
  slug: string;
  title: string;
  reasons: TitleFlagReason[];
}

function flagTitle(
  source: FlaggedTitle["source"],
  slug: string,
  title: string,
  ctx: { mealFormat?: string; protein?: string; cuisine?: string; slug?: string },
): FlaggedTitle | null {
  const reasons: TitleFlagReason[] = [];
  const t = title.trim();
  if (!t) return null;

  if (FILLER_RX.test(t)) reasons.push("filler_word");
  if (LOADED_RX.test(t)) reasons.push("loaded");
  if (SHEET_PAN_RX.test(t) && !slug.includes("sheet")) reasons.push("sheet_pan");
  if (FOR_CREW_RX.test(t)) reasons.push("for_crew");
  if (BLOG_LEADING_RX.test(t)) reasons.push("blog_leading");
  if (UNNATURAL_WITH_RX.test(t)) reasons.push("unnatural_with_clause");
  if (t.length > 48) reasons.push("too_long");
  if (t.split(/\s+/).length >= 8) reasons.push("too_many_words");
  if (isRoboticTitle(t)) reasons.push("robotic");

  const q = scoreRecipeTitle(t, {
    mealFormat: ctx.mealFormat,
    protein: ctx.protein,
    cuisine: ctx.cuisine,
  });
  if (!q.pass) reasons.push("quality_fail");

  if (reasons.length === 0) return null;
  return { source, slug, title: t, reasons: [...new Set(reasons)] };
}

function main(): void {
  const flagged: FlaggedTitle[] = [];

  for (const r of GOLDEN_100_RECIPES) {
    const row = flagTitle("golden_100", r.slug, r.title, {
      mealFormat: r.mealFormat,
      protein: r.protein,
      cuisine: r.cuisine,
      slug: r.slug,
    });
    if (row) flagged.push(row);
  }

  for (const m of CLASSIC_HALL_MEALS) {
    const row = flagTitle("classics_wheel", m.slug, m.title, { slug: m.slug, mealFormat: m.mealFormat });
    if (row) flagged.push(row);
  }

  for (const r of PERFORMANCE_ADAPTED_RECIPES) {
    const row = flagTitle("performance", r.manifest.slug, r.manifest.title, {
      mealFormat: r.manifest.mealFormat,
      protein: r.manifest.protein,
      cuisine: r.manifest.cuisine,
      slug: r.manifest.slug,
    });
    if (row) flagged.push(row);
  }

  const asJson = process.argv.includes("--json");
  if (asJson) {
    console.log(JSON.stringify({ flaggedCount: flagged.length, flagged }, null, 2));
  } else {
    console.log(`[audit:title-human] flagged=${flagged.length}`);
    for (const f of flagged) {
      console.log(`  ${f.source} ${f.slug}: "${f.title}" → ${f.reasons.join(", ")}`);
    }
  }

  if (flagged.length > 0) process.exit(1);
}

main();
