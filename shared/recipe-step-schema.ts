/**
 * Structured cooking step contract — validated, ingredient-coupled instructions.
 */

import { z } from "zod";

export const cookingMethodSchema = z.enum([
  "prep",
  "sear",
  "sauté",
  "simmer",
  "boil",
  "bake",
  "roast",
  "grill",
  "broil",
  "stir_fry",
  "rest",
  "assemble",
  "serve",
  "no_heat",
]);

export type CookingMethod = z.infer<typeof cookingMethodSchema>;

export const structuredRecipeStepSchema = z.object({
  title: z.string().trim().min(3).max(120),
  instruction: z.string().trim().min(24).max(2000),
  ingredients_used: z.array(z.string().trim().min(1).max(120)).min(1).max(12),
  estimated_time: z.number().int().min(1).max(120),
  cooking_method: cookingMethodSchema,
});

export type StructuredRecipeStep = z.infer<typeof structuredRecipeStepSchema>;

/** Legacy GenerateResponse step shape — structured fields optional for backward compatibility. */
export interface RecipeStepStructured {
  heading: string;
  body: string;
  title?: string;
  instruction?: string;
  ingredients_used?: string[];
  estimated_time?: number;
  cooking_method?: CookingMethod;
}

export function formatStepHeading(
  title: string,
  cookingMethod: CookingMethod,
  estimatedTime: number,
): string {
  const heatLabel =
    cookingMethod === "no_heat" || cookingMethod === "prep" || cookingMethod === "serve" || cookingMethod === "assemble"
      ? "no heat"
      : cookingMethod === "bake" || cookingMethod === "roast"
        ? "oven"
        : cookingMethod === "boil"
          ? "high boil"
          : cookingMethod === "simmer"
            ? "low simmer"
            : cookingMethod === "grill"
              ? "grill"
              : cookingMethod.replace("_", "-");
  return `${title} (${heatLabel}, ${estimatedTime} min)`;
}

export function structuredToRecipeStep(step: StructuredRecipeStep): RecipeStepStructured {
  return {
    heading: formatStepHeading(step.title, step.cooking_method, step.estimated_time),
    body: step.instruction,
    title: step.title,
    instruction: step.instruction,
    ingredients_used: step.ingredients_used,
    estimated_time: step.estimated_time,
    cooking_method: step.cooking_method,
  };
}

export function parseStructuredSteps(steps: unknown[]): StructuredRecipeStep[] {
  const out: StructuredRecipeStep[] = [];
  for (const raw of steps) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Record<string, unknown>;
    const title = String(s.title || s.heading || "").trim();
    const instruction = String(s.instruction || s.body || "").trim();
    const ingredients_used = Array.isArray(s.ingredients_used)
      ? s.ingredients_used.map((x) => String(x).trim()).filter(Boolean)
      : [];
    const estimated_time =
      typeof s.estimated_time === "number"
        ? s.estimated_time
        : typeof s.minutes === "number"
          ? s.minutes
          : 5;
    const cooking_method = cookingMethodSchema.safeParse(s.cooking_method).success
      ? (s.cooking_method as CookingMethod)
      : inferCookingMethodFromText(`${title} ${instruction}`);

    const candidate = {
      title: title || "Cook",
      instruction,
      ingredients_used: ingredients_used.length ? ingredients_used : ["pantry staples"],
      estimated_time,
      cooking_method,
    };
    const parsed = structuredRecipeStepSchema.safeParse(candidate);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

function inferCookingMethodFromText(text: string): CookingMethod {
  const t = text.toLowerCase();
  if (/\bserve\b|\bportion\b|\bline\b/.test(t)) return "serve";
  if (/\bassemble\b|\bbuild\b|\bstack\b|\bwrap\b/.test(t)) return "assemble";
  if (/\bprep\b|\bmise\b|\bgather\b/.test(t)) return "prep";
  if (/\bbake\b|\broast\b|\boven\b/.test(t)) return "bake";
  if (/\bgrill\b/.test(t)) return "grill";
  if (/\bboil\b|\bal dente\b/.test(t)) return "boil";
  if (/\bsimmer\b|\bstew\b|\bchili\b|\bsoup\b/.test(t)) return "simmer";
  if (/\bstir.?fry\b|\bwok\b/.test(t)) return "stir_fry";
  if (/\bsear\b|\bbrown\b/.test(t)) return "sear";
  if (/\bsauté\b|\bsaute\b/.test(t)) return "sauté";
  if (/\brest\b/.test(t)) return "rest";
  return "sauté";
}
