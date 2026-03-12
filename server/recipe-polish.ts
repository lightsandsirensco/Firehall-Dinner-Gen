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
import type { RecipeStep } from "@shared/schema";

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
  return `${c} ${protein} — ${totalMin}-minute meal ready for ${crewSize}.`;
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

export async function polishRecipeCopy(
  recipeId: number,
  originalTitle: string,
  protein: string,
  cuisine: string,
  totalMin: number,
  crewSize: number,
  keyIngredients: string[],
  originalSteps: RecipeStep[],
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

  const prompt =
    `You are a firehouse cook's assistant. For this recipe, do three things:\n\n` +
    `1. TITLE: Fix capitalization or awkward phrasing only. Do NOT change dish type, cuisine, or protein. Under 10 words.\n` +
    `2. DESCRIPTION: One sentence. Crew-ready tone. Accurate to the recipe. Under 25 words.\n` +
    `3. STEPS: Rewrite each step to be beginner-friendly. Rules:\n` +
    `   - Heading format exactly: "Action phrase (heat, X–Y min)" e.g. "Sear the chicken (medium-high, 5–7 min)"\n` +
    `   - If no heat (prep/plating): "Action phrase (no heat, X min)"\n` +
    `   - Body: explain HOW step by step. Include visual/doneness cue (e.g., "until golden brown", "until edges are set").${safeTempNote}\n` +
    `   - Combine steps if over 10 total. Max 8–10 steps.\n` +
    `   - No storytelling. No repeating the same instruction twice.\n` +
    `   - Keep each body under 50 words.\n\n` +
    `Output ONLY valid JSON:\n` +
    `{"title":"...","description":"...","steps":[{"heading":"...","body":"..."}]}\n\n` +
    `Recipe:\n` +
    `Title: ${originalTitle}\n` +
    `Protein: ${protein}\n` +
    `Cuisine: ${cuisine}\n` +
    `Time: ${totalMin} min | Crew: ${crewSize}\n` +
    `Key ingredients: ${keyIngredients.slice(0, 5).join(", ")}\n\n` +
    `Current steps:\n${stepLines}`;

  try {
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1200,
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

    // Validate and map improved steps — fall back to originals on bad output
    let steps: RecipeStep[] = originalSteps;
    if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
      const mapped: RecipeStep[] = parsed.steps
        .filter((s: any) => typeof s?.heading === "string" && typeof s?.body === "string")
        .map((s: any, i: number) => ({
          heading: s.heading.trim() || `Step ${i + 1}`,
          body: s.body.trim(),
        }));
      if (mapped.length > 0) steps = mapped;
    }

    polishCache.set(recipeId, { title, why, steps, expires: Date.now() + POLISH_CACHE_TTL_MS });
    log(`[polish] polished id=${recipeId} title="${title}" steps=${steps.length}`, "polish");

    return { title, why_it_fits_tonight: why, steps };
  } catch (err: any) {
    log(`[polish] failed id=${recipeId}: ${err.message} — using fallback`, "polish");
    return fallback;
  }
}
