/**
 * Semantic alignment between meal title/format and hero imagery.
 * Prevents taco photos on quinoa-skillet titles, etc.
 */

import { normalizeFormatKey, titleClaimsTacos } from "./meal-format-contract.js";

export type MealVisualSignal =
  | "taco"
  | "burger"
  | "pasta"
  | "pizza"
  | "bowl"
  | "skillet"
  | "stir_fry"
  | "soup"
  | "sandwich"
  | "salad"
  | "sheet_pan"
  | "grill"
  | "breakfast"
  | "generic";

const SIGNAL_PATTERNS: Array<{ signal: MealVisualSignal; re: RegExp }> = [
  { signal: "taco", re: /\b(taco|tacos|fajita|burrito|enchilada|quesadilla|tortilla)\b/i },
  { signal: "burger", re: /\b(burger|smash burger|cheeseburger|patty|brioche bun)\b/i },
  { signal: "pasta", re: /\b(pasta|spaghetti|penne|rigatoni|fettuccine|lasagna|macaroni)\b/i },
  { signal: "pizza", re: /\b(pizza|flatbread|pepperoni|mozzarella pie)\b/i },
  { signal: "bowl", re: /\b(bowl|bibimbap|rice bowl|grain bowl|poke)\b/i },
  { signal: "skillet", re: /\b(skillet|one.?pan|cast iron)\b/i },
  { signal: "stir_fry", re: /\b(stir.?fry|wok)\b/i },
  { signal: "soup", re: /\b(soup|chili|chowder|stew|bisque)\b/i },
  { signal: "sandwich", re: /\b(sandwich|sub|hoagie|panini|wrap)\b/i },
  { signal: "salad", re: /\b(salad|caesar|greens)\b/i },
  { signal: "sheet_pan", re: /\b(sheet.?pan|tray bake|roasted vegetables)\b/i },
  { signal: "grill", re: /\b(grill|grilled|bbq|barbecue|charred)\b/i },
  { signal: "breakfast", re: /\b(breakfast|pancake|waffle|omelette)\b/i },
];

export function inferVisualSignalsFromTitle(title: string, mealFormat?: string): Set<MealVisualSignal> {
  const signals = new Set<MealVisualSignal>();
  const text = `${title} ${mealFormat || ""}`.toLowerCase();

  for (const { signal, re } of SIGNAL_PATTERNS) {
    if (re.test(text)) signals.add(signal);
  }

  const fmt = normalizeFormatKey(mealFormat);
  if (fmt === "tacos") signals.add("taco");
  if (fmt === "burger") signals.add("burger");
  if (fmt === "pasta") signals.add("pasta");
  if (fmt === "bowl") signals.add("bowl");
  if (fmt === "skillet") signals.add("skillet");
  if (fmt === "stir_fry") signals.add("stir_fry");
  if (fmt === "soup_chili" || fmt === "stew") signals.add("soup");
  if (fmt === "sandwich" || fmt === "wrap") signals.add("sandwich");
  if (fmt === "salad") signals.add("salad");
  if (fmt === "sheet_pan") signals.add("sheet_pan");
  if (fmt === "grill") signals.add("grill");

  if (signals.size === 0) signals.add("generic");
  return signals;
}

/** What a generated/editorial hero is allowed to depict for this meal. */
export function allowedHeroSignals(title: string, mealFormat?: string): Set<MealVisualSignal> {
  const titleSignals = inferVisualSignalsFromTitle(title, mealFormat);
  const allowed = new Set<MealVisualSignal>(titleSignals);

  if (titleClaimsTacos(title) || normalizeFormatKey(mealFormat) === "tacos") {
    allowed.delete("bowl");
    allowed.delete("skillet");
    allowed.delete("pasta");
  }

  if (/\b(quinoa|couscous|farro)\b/i.test(title)) {
    allowed.delete("taco");
    allowed.delete("burger");
    allowed.delete("pasta");
  }

  if (/\b(skillet|stir.?fry|one.?pot)\b/i.test(title)) {
    allowed.delete("taco");
    allowed.delete("burger");
    allowed.delete("salad");
  }

  return allowed;
}

export interface ImageTitleMatchResult {
  pass: boolean;
  score: number;
  conflicts: string[];
  dominantTitle: MealVisualSignal;
}

/**
 * Score whether hero imagery is appropriate for the meal title.
 * Used to invalidate mismatched generated assets before display.
 */
export function scoreImageTitleAlignment(
  title: string,
  mealFormat: string | undefined,
  options: {
    /** Hints from prompt/spec (shot preset id, etc.) */
    depictedSignals?: MealVisualSignal[];
    heroSource?: "generated" | "editorial_fallback" | "pinned";
  } = {},
): ImageTitleMatchResult {
  const titleSignals = inferVisualSignalsFromTitle(title, mealFormat);
  const allowed = allowedHeroSignals(title, mealFormat);
  const conflicts: string[] = [];
  let score = 85;

  const dominant = [...titleSignals].find((s) => s !== "generic") || "generic";

  if (options.heroSource === "editorial_fallback" || options.heroSource === "pinned") {
    return { pass: true, score: 92, conflicts: [], dominantTitle: dominant };
  }

  const depicted = new Set(options.depictedSignals || []);
  if (depicted.size === 0) {
    return { pass: true, score: 70, conflicts: [], dominantTitle: dominant };
  }

  for (const d of depicted) {
    if (!allowed.has(d) && d !== "generic") {
      conflicts.push(`hero_${d}_vs_title_${dominant}`);
      score -= 28;
    }
  }

  if (dominant === "taco" && depicted.has("bowl") && !depicted.has("taco")) {
    conflicts.push("bowl_image_for_taco_title");
    score -= 35;
  }
  if (dominant === "skillet" && depicted.has("taco")) {
    conflicts.push("taco_image_for_skillet_title");
    score -= 35;
  }
  if (dominant === "pasta" && depicted.has("burger")) {
    conflicts.push("burger_image_for_pasta_title");
    score -= 30;
  }

  const overlap = [...depicted].filter((d) => titleSignals.has(d) && d !== "generic");
  if (overlap.length > 0) score += 10;

  score = Math.max(0, Math.min(100, score));
  const pass = score >= 58 && conflicts.length === 0;

  return { pass, score, conflicts, dominantTitle: dominant };
}

/** Heuristic: known hero URL paths vs meal title (editorial/classic assets). */
export function heroPathConflictsTitle(
  heroPath: string,
  title: string,
  mealFormat?: string,
): boolean {
  const path = heroPath.toLowerCase();
  const allowed = allowedHeroSignals(title, mealFormat);

  const pathSignals: MealVisualSignal[] = [];
  if (/taco|fajita|burrito/.test(path)) pathSignals.push("taco");
  if (/burger|smash/.test(path)) pathSignals.push("burger");
  if (/pasta|lasagna|spaghetti/.test(path)) pathSignals.push("pasta");
  if (/bowl/.test(path)) pathSignals.push("bowl");
  if (/chili|stew|soup/.test(path)) pathSignals.push("soup");
  if (/pizza/.test(path)) pathSignals.push("pizza");

  for (const s of pathSignals) {
    if (!allowed.has(s)) return true;
  }

  const titleDominant = [...inferVisualSignalsFromTitle(title, mealFormat)].find((s) => s !== "generic");
  if (titleDominant === "skillet" && pathSignals.includes("taco")) return true;
  if (titleDominant === "taco" && pathSignals.includes("bowl") && !pathSignals.includes("taco")) return true;
  if (/\bquinoa\b/i.test(title) && pathSignals.includes("taco")) return true;

  return false;
}
