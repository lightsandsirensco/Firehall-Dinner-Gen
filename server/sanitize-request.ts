import type { GenerateRequest, PizzaRequest } from "@shared/schema.js";
import {
  normalizeRecipeSignature,
  sanitizeRecipeSignatureList,
  sanitizeRecipeMealStyleList,
} from "../shared/recipe-signature.js";
import { sanitizeFoodLabelText, sanitizePromptStringList, sanitizeUserPromptText } from "./prompt-sanitize.js";

/** Normalize generate body after Zod — strips injection patterns from prompt-bound fields. */
export function sanitizeGenerateRequest(request: GenerateRequest): GenerateRequest {
  return {
    ...request,
    appliances: sanitizePromptStringList(request.appliances, 8, 40, false),
    allergens_to_avoid: sanitizePromptStringList(request.allergens_to_avoid, 12, 40),
    ingredients_on_hand: sanitizePromptStringList(request.ingredients_on_hand, 30, 80),
    recent_meal_styles: sanitizeRecipeMealStyleList(request.recent_meal_styles),
    recentSignatures: sanitizeRecipeSignatureList(request.recentSignatures),
    currentRecipeSignature: request.currentRecipeSignature
      ? normalizeRecipeSignature(request.currentRecipeSignature)
      : undefined,
    request_id: request.request_id
      ? sanitizeUserPromptText(request.request_id, 80).replace(/[^a-zA-Z0-9_-]/g, "")
      : undefined,
  };
}

export function sanitizePizzaRequest(request: PizzaRequest): PizzaRequest {
  return {
    ...request,
    allergens_to_avoid: sanitizePromptStringList(request.allergens_to_avoid, 12, 40),
    last_pizza_style_id: request.last_pizza_style_id
      ? sanitizeUserPromptText(request.last_pizza_style_id, 48).replace(/[^a-z0-9_]/gi, "")
      : undefined,
    last_pizza_style_ids: sanitizePromptStringList(request.last_pizza_style_ids, 8, 48, false).map(
      (id) => id.replace(/[^a-z0-9_]/gi, ""),
    ),
  };
}

/** Fields sent outside Zod on generate — sanitize before session/signature use. */
function sanitizeRecentSlugs(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const s = item.trim().toLowerCase().slice(0, 120);
    if (!s || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) continue;
    if (!out.includes(s)) out.push(s);
    if (out.length >= 32) break;
  }
  return out;
}

export function sanitizeClientGenerationMeta(body: Record<string, unknown>): {
  currentRecipeSignature: string;
  recentSignatures: string[];
  recentSlugs: string[];
} {
  const fromRecent = sanitizeRecipeSignatureList(body.recentSignatures);
  const fromExclude = sanitizeRecipeSignatureList(body.exclude_signatures);
  const merged = sanitizeRecipeSignatureList([...fromRecent, ...fromExclude]);
  return {
    currentRecipeSignature: normalizeRecipeSignature(body.currentRecipeSignature),
    recentSignatures: merged,
    recentSlugs: sanitizeRecentSlugs(body.recentSlugs),
  };
}
