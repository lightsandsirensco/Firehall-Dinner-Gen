/**
 * Recipe Copy Polish + Step Improvement (V2 Post-Processing)
 *
 * Single gpt-4o-mini call that:
 *   1. Lightly polishes recipe title (capitalization/readability only)
 *   2. Writes a crew-friendly one-sentence description
 *   3. Rewrites cooking steps to be beginner-friendly with:
 *        - Heading format: "Action phrase (heat, X–Y min)"
 *        - Body: HOW-to instructions with visual/doneness cues and safe cook temps
 *        - Max 8–10 steps; no repeated instructions
 *
 * Safety guarantees:
 *   - 6-second hard timeout → fallback to original title + generated description + original steps
 *   - JSON parse error → same fallback (never throws)
 *   - In-process cache by Spoonacular recipe ID (1-hour TTL) → zero repeat AI calls
 *   - Title and step content never invent new ingredients or meal types
 */

import OpenAI from "openai";
import { log } from "./index";
import { inferActualProtein } from "./spoonacular-converter";
import { healthinessForVoice } from "./firehall-voice";
import type { RecipeStep } from "@shared/schema";
import { FIREHALL_VOICE_RULES } from "@shared/firehall-instruction-voice";
import { CHEF_RECIPE_RULES, TITLE_QUALITY_EXAMPLES } from "@shared/chef-quality-prompt";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const POLISH_CACHE_TTL_MS = 60 * 60 * 1000;

interface PolishCacheEntry {
  title: string;
  why: string;
  steps: RecipeStep[];
  expires: number;
}

const polishCache = new Map<number, PolishCacheEntry>();

export interface PolishResult {
  title: string;
  why_it_fits_tonight: string;
  steps: RecipeStep[];
}

function buildFallbackWhy(cuisine: string, protein: string, totalMin: number, crewSize: number): string {
  const c = cuisine && cuisine !== "any" ? cuisine.charAt(0).toUpperCase() + cuisine.slice(1) : "Hearty";
  return `Hall spread for ${crewSize} — ${c} ${protein}, about ${totalMin} minutes. The kind of dinner the crew actually looks forward to.`;
}

const PROTEIN_TEMPS: Record<string, string> = {
  chicken: "165°F (74°C)",
  turkey: "165°F (74°C)",
  pork: "145°F (63°C)",
  sausage: "160°F (71°C)",
  "ground beef": "160°F (71°C)",
  beef: "145°F (63°C) for whole cuts, 160°F for ground",
  fish: "145°F (63°C)",
  salmon: "145°F (63°C)",
  shrimp: "145°F (63°C)",
};

function getSafeTemp(protein: string): string {
  const p = protein.toLowerCase();
  for (const [key, val] of Object.entries(PROTEIN_TEMPS)) {
    if (p.includes(key)) return val;
  }
  return "";
}

const SIGNIFICANT_TITLE_STOP = new Set([
  "with", "and", "the", "for", "in", "on", "a", "an", "of", "to", "style", "recipe",
]);

const DISH_TYPE_WORDS = [
  "pasta", "taco", "tacos", "burger", "bowl", "salad", "soup", "chili", "stew",
  "skillet", "casserole", "wrap", "sandwich", "stir", "fry", "grill", "sheet",
];

const NEW_PROTEIN_PATTERNS: Record<string, RegExp> = {
  chicken: /\b(chicken|poultry)\b/i,
  beef: /\b(beef|steak|brisket)\b/i,
  pork: /\b(pork|bacon|ham|sausage)\b/i,
  turkey: /\b(turkey)\b/i,
  seafood: /\b(shrimp|salmon|fish|cod|tuna|scallop|lobster|crab)\b/i,
  vegetarian: /\b(tofu|tempeh|lentil|chickpea)\b/i,
};

function significantTitleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !SIGNIFICANT_TITLE_STOP.has(w));
}

function titlePolishIsSafe(originalTitle: string, polishedTitle: string, protein: string): boolean {
  if (!polishedTitle.trim()) return false;
  const orig = significantTitleTokens(originalTitle);
  const polish = significantTitleTokens(polishedTitle);
  if (orig.length === 0) return true;

  const overlap = orig.filter((w) => polish.includes(w)).length / orig.length;
  if (overlap < 0.5) {
    log(`[polish] title unsafe: word overlap ${(overlap * 100).toFixed(0)}% < 50%`, "polish");
    return false;
  }

  for (const dish of DISH_TYPE_WORDS) {
    const inOrig = orig.some((w) => w.includes(dish));
    const inPolish = polish.some((w) => w.includes(dish));
    if (inOrig && !inPolish) {
      log(`[polish] title unsafe: dropped dish-type word "${dish}"`, "polish");
      return false;
    }
    if (!inOrig && inPolish) {
      log(`[polish] title unsafe: added dish-type word "${dish}"`, "polish");
      return false;
    }
  }

  const origProtein = inferActualProtein(originalTitle, []);
  const polishProtein = inferActualProtein(polishedTitle, []);
  if (
    origProtein !== "unknown" &&
    polishProtein !== "unknown" &&
    origProtein !== polishProtein &&
    !proteinMatchesLoose(polishProtein, protein)
  ) {
    log(`[polish] title unsafe: protein ${origProtein} → ${polishProtein}`, "polish");
    return false;
  }

  return true;
}

function proteinMatchesLoose(inferred: string, selected: string): boolean {
  if (selected === "any") return true;
  if (inferred === selected) return true;
  if (selected === "seafood" && ["fish", "salmon", "shrimp"].includes(inferred)) return true;
  return false;
}

function buildIngredientAllowlist(ingredientNames: string[], originalTitle: string): string {
  return [...ingredientNames, ...significantTitleTokens(originalTitle)].join(" ").toLowerCase();
}

function stepsPolishIsSafe(
  originalSteps: RecipeStep[],
  polishedSteps: RecipeStep[],
  allowlistText: string,
): boolean {
  if (polishedSteps.length === 0) return false;
  const minSteps = Math.max(2, originalSteps.length - 3);
  const maxSteps = Math.min(12, originalSteps.length + 3);
  if (polishedSteps.length < minSteps || polishedSteps.length > maxSteps) {
    log(`[polish] steps unsafe: count ${polishedSteps.length} outside ${minSteps}-${maxSteps}`, "polish");
    return false;
  }

  for (const [protein, pattern] of Object.entries(NEW_PROTEIN_PATTERNS)) {
    const inAllow = pattern.test(allowlistText);
    if (inAllow) continue;
    for (const step of polishedSteps) {
      const text = `${step.heading} ${step.body}`;
      if (pattern.test(text)) {
        log(`[polish] steps unsafe: mentions ${protein} not in ingredient list`, "polish");
        return false;
      }
    }
  }

  return true;
}

/** Reject polish output that drifts from Spoonacular source data. */
export function applySafePolish(
  originalTitle: string,
  originalSteps: RecipeStep[],
  polish: PolishResult,
  protein: string,
  ingredientNames: string[],
): PolishResult {
  const allowlist = buildIngredientAllowlist(ingredientNames, originalTitle);

  let title = polish.title;
  if (!titlePolishIsSafe(originalTitle, title, protein)) {
    title = originalTitle;
  }

  let steps = polish.steps;
  if (!stepsPolishIsSafe(originalSteps, steps, allowlist)) {
    steps = originalSteps;
  }

  return {
    title,
    why_it_fits_tonight: polish.why_it_fits_tonight,
    steps,
  };
}

export async function polishRecipeCopy(
  recipeId: number,
  originalTitle: string,
  protein: string,
  cuisine: string,
  totalMin: number,
  crewSize: number,
  keyIngredients: string[],
  originalSteps: RecipeStep[],
  healthiness: string = "balanced",
): Promise<PolishResult> {
  // ── Cache check ────────────────────────────────────────────────────────────
  const cached = polishCache.get(recipeId);
  if (cached && Date.now() < cached.expires) {
    log(`[polish] cache HIT id=${recipeId} title="${cached.title}"`, "polish");
    return { title: cached.title, why_it_fits_tonight: cached.why, steps: cached.steps };
  }

  const fallbackWhy = buildFallbackWhy(cuisine, protein, totalMin, crewSize);
  const fallback: PolishResult = {
    title: originalTitle,
    why_it_fits_tonight: fallbackWhy,
    steps: originalSteps,
  };

  log(`[polish] cache MISS id=${recipeId} — calling gpt-4o-mini (steps=${originalSteps.length})`, "polish");

  const safeTemp = getSafeTemp(protein);
  const safeTempNote = safeTemp ? `\n   - Safe internal temperature for ${protein}: ${safeTemp}` : "";

  // Compact step list: just the instruction body text, numbered. Cap at 10 to limit input tokens.
  const stepLines = originalSteps
    .slice(0, 10)
    .map((s, i) => `${i + 1}. ${s.body.substring(0, 300)}`)
    .join("\n");

  const voice = healthinessForVoice(healthiness);

  const prompt =
    `You are a recipe editor for a premium comfort-food site (Serious Eats / NYT Cooking level).\n\n` +
    `${CHEF_RECIPE_RULES}\n\n` +
    `${FIREHALL_VOICE_RULES}\n\n` +
    `Good title examples: ${TITLE_QUALITY_EXAMPLES.good.join(" | ")}\n` +
    `Bad title examples: ${TITLE_QUALITY_EXAMPLES.bad.join(" | ")}\n\n` +
    `For this recipe:\n\n` +
    `1. TITLE: Make it craveable and accurate to ingredients. You MAY rephrase for clarity but NEVER call it "Tacos" without tortillas in the ingredient list. Under 12 words.\n` +
    `2. DESCRIPTION: One vivid sentence — what makes this dinner exciting (texture + sauce + main). Style: ${voice}. No invented ingredients. Under 35 words.\n\n` +
    `Do NOT rewrite cooking steps — steps stay from the source recipe.\n\n` +
    `Output ONLY valid JSON:\n` +
    `{"title":"...","description":"..."}\n\n` +
    `Recipe:\n` +
    `Title: ${originalTitle}\n` +
    `Protein: ${protein}\n` +
    `Cuisine: ${cuisine}\n` +
    `Time: ${totalMin} min | Crew: ${crewSize}\n` +
    `Full plate ingredients: ${keyIngredients.slice(0, 10).join(", ")}\n\n` +
    `Current steps:\n${stepLines}`;

  try {
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2400,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("polish timeout")), 6000),
      ),
    ]);

    const raw = (response as any).choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(raw);

    const title =
      typeof parsed.title === "string" && parsed.title.trim().length > 0
        ? parsed.title.trim()
        : originalTitle;

    const why =
      typeof parsed.description === "string" && parsed.description.trim().length > 0
        ? parsed.description.trim()
        : fallbackWhy;

    const rawPolish: PolishResult = { title, why_it_fits_tonight: why, steps: originalSteps };
    const safe = applySafePolish(
      originalTitle,
      originalSteps,
      rawPolish,
      protein,
      keyIngredients,
    );
    const copyOnly: PolishResult = { ...safe, steps: originalSteps };

    polishCache.set(recipeId, { title: copyOnly.title, why: copyOnly.why_it_fits_tonight, steps: originalSteps, expires: Date.now() + POLISH_CACHE_TTL_MS });
    log(`[polish] polished id=${recipeId} title="${copyOnly.title}" (steps unchanged)`, "polish");

    return copyOnly;
  } catch (err: any) {
    log(`[polish] failed id=${recipeId}: ${err.message} — using fallback`, "polish");
    return fallback;
  }
}
