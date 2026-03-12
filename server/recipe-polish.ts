/**
 * Recipe Copy Polish (V2 Post-Processing)
 *
 * Lightly polishes recipe title and description using gpt-4o-mini.
 * Spoonacular remains the source of truth — this only improves readability.
 *
 * Constraints enforced by prompt:
 *   - Title: capitalization/readability fix only. Dish type and cuisine unchanged.
 *   - Description: accurate to recipe, firefighter-friendly tone, ≤25 words.
 *
 * Safety guarantees:
 *   - 2-second hard timeout; falls back to original title + generated description
 *   - In-process cache by Spoonacular recipe ID (1-hour TTL) — zero repeat AI calls
 *   - JSON parse error → fallback (never throws)
 */

import OpenAI from "openai";
import { log } from "./index";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const POLISH_CACHE_TTL_MS = 60 * 60 * 1000;

interface PolishCacheEntry {
  title: string;
  why: string;
  expires: number;
}

const polishCache = new Map<number, PolishCacheEntry>();

export interface PolishResult {
  title: string;
  why_it_fits_tonight: string;
}

function buildFallbackWhy(
  cuisine: string,
  protein: string,
  totalMin: number,
  crewSize: number,
  stepCount: number,
): string {
  const c = cuisine && cuisine !== "any" ? cuisine.charAt(0).toUpperCase() + cuisine.slice(1) : "Hearty";
  return `${c} ${protein} — ${totalMin}-minute meal for ${crewSize}, done in ${stepCount} steps.`;
}

export async function polishRecipeCopy(
  recipeId: number,
  originalTitle: string,
  protein: string,
  cuisine: string,
  totalMin: number,
  crewSize: number,
  keyIngredients: string[],
  stepCount: number,
): Promise<PolishResult> {
  // ── Cache check ────────────────────────────────────────────────────────────
  const cached = polishCache.get(recipeId);
  if (cached && Date.now() < cached.expires) {
    log(`[polish] cache HIT id=${recipeId} title="${cached.title}"`, "polish");
    return { title: cached.title, why_it_fits_tonight: cached.why };
  }

  const fallbackWhy = buildFallbackWhy(cuisine, protein, totalMin, crewSize, stepCount);
  const fallback: PolishResult = { title: originalTitle, why_it_fits_tonight: fallbackWhy };

  // ── AI call with hard timeout ──────────────────────────────────────────────
  log(`[polish] cache MISS id=${recipeId} — calling gpt-4o-mini`, "polish");

  const prompt =
    `You are a firehouse cook's assistant. Lightly polish this recipe title and write a ` +
    `short firefighter-friendly description.\n\n` +
    `STRICT RULES:\n` +
    `- Title: fix capitalization or awkward phrasing only. Do NOT change the dish type, cuisine, ` +
    `protein, or any key ingredient. Keep it under 10 words.\n` +
    `- Description: one sentence, accurate to the recipe, crew-ready tone, under 25 words. ` +
    `Mention the protein and format. Do NOT mention unrelated foods.\n` +
    `- Output ONLY valid JSON: {"title":"...","description":"..."}\n\n` +
    `Recipe:\n` +
    `Title: ${originalTitle}\n` +
    `Protein: ${protein}\n` +
    `Cuisine: ${cuisine}\n` +
    `Time: ${totalMin} min\n` +
    `Crew: ${crewSize}\n` +
    `Key ingredients: ${keyIngredients.slice(0, 5).join(", ")}`;

  try {
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 80,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("polish timeout")), 2000),
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

    const result: PolishResult = { title, why_it_fits_tonight: why };

    polishCache.set(recipeId, { title, why, expires: Date.now() + POLISH_CACHE_TTL_MS });
    log(`[polish] polished id=${recipeId} title="${title}"`, "polish");

    return result;
  } catch (err: any) {
    log(`[polish] failed id=${recipeId}: ${err.message} — using fallback`, "polish");
    return fallback;
  }
}
