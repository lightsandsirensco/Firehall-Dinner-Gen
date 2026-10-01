/**
 * Offline recipe image QA — inspects the actual pixels against the recipe
 * (never the filename or alt text) and the Firehall Meals image standard.
 *
 * Used by scripts/audit-recipe-image-catalog.ts (catalog audit) and
 * scripts/regen-recipe-images.ts (pre-publish gate). Admin/offline only —
 * never called on a page load.
 */
import { createHash } from "node:crypto";
import type OpenAI from "openai";
import sharp from "sharp";
import {
  RECIPE_IMAGE_STANDARD_VERSION,
  recipeImageStandardLines,
} from "../../shared/food-imagery/recipe-image-standard.js";
import {
  checkRecipeDishFormat,
  combineFidelity,
  DISH_FORMATS,
  dishFormatRubricLines,
  expectedDishFormatBrief,
  isFormatIssue,
  normalizeDepictedFormat,
  type DishFormat,
  type DishFormatCheck,
  type FidelityStatus,
} from "../../shared/food-imagery/dish-format.js";
import {
  deriveAvoidItems,
  plateEggStyle,
  visibleIngredientHints,
  type RecipePageLike,
} from "./recipe-image-prompt.js";

export const RECIPE_IMAGE_QA_VERSION = `qa4+std${RECIPE_IMAGE_STANDARD_VERSION}`;

const EGG_BRIEF: Record<string, string> = {
  whole: "This recipe DOES serve visible whole eggs (fried, cracked on top, poached, or boiled) — do not flag them.",
  scrambled:
    "This recipe serves eggs as a visible cooked egg (scrambled, folded, or baked egg sheet/squares) — expect it, but a fried, poached, or sunny-side-up egg is wrong.",
  title: "The title names eggs, so visible eggs are expected.",
  none: "This recipe does NOT serve a visible plated egg (any egg is cooked into a batter, custard, dough, or binder).",
};

export type AccuracyStatus = "PASS" | "MINOR" | "MAJOR" | "CRITICAL";
export type ConsistencyStatus = "PASS" | "REVIEW" | "REPLACE";
export type Priority = "P0" | "P1" | "P2" | "P3" | "PASS";

export interface VisionVerdict {
  visible_foods: string[];
  dish_format: string;
  depicted_format: DishFormat;
  format_confidence: number;
  accuracy: AccuracyStatus;
  accuracy_issues: string[];
  camera_angle: "overhead" | "45_degree" | "low_side" | "eye_level" | "other";
  people_or_hands: boolean;
  text_or_logo: boolean;
  ai_artifacts: string[];
  background: string;
  lighting: string;
  food_frame_share: "small" | "medium" | "large";
  consistency: ConsistencyStatus;
  consistency_issues: string[];
  alt_text_accurate: boolean;
  confidence: number;
}

export type QaRecipe = RecipePageLike & { imageAlt?: string; heroImageAlt?: string; mealFormat?: string };

const RUBRIC = `You are the photo QA editor for Firehall Meals, a firefighter recipe app. The RECIPE is the source of truth. Judge only what is actually visible in the photo — ignore the filename and alt text when deciding what the photo shows.

ACCURACY — compare the photo to the recipe:
- CRITICAL: wrong dish (pancakes for a bake, wings for a turkey breast), wrong main protein, meat in a vegetarian recipe, a plated fried/poached/sunny egg when the recipe does not serve one, or a clearly different cooking method (fried vs baked).
- MAJOR: a prominent food not in the recipe (bacon, sausage, extra protein, a side dish that takes up real space), or the defining ingredient/finish is missing, or a misleading side dominates.
- MINOR: harmless unlisted garnish or small presentation difference that does not change what the cook is making.
- PASS: the photo shows this recipe.
{FORMAT}
Severity limits: a different bread or pasta shape, a different cut of the same protein, a different pan shape, or missing garnishes/secondary ingredients are MAJOR or MINOR — never CRITICAL. Hard-to-verify substitutions (e.g. rice vs quinoa, turkey vs beef patty) need clear visual evidence before you flag them.
Ingredients grouped as batter, custard, marinade, brine, dredge, egg wash, or cooking fat are cooked INTO the dish and are never expected as separate visible items.

CONSISTENCY — compare the photo to the house standard:
{STANDARD}
- REPLACE: text/logos/watermarks, obvious AI artifacts (fused or duplicated food, impossible utensils, melted/waxy food, garbled geometry), cartoonish/illustrated look, or the food is too small/obscured to read.
- REVIEW: people or hands anywhere (including blurred background staff), off-standard angle for this dish type, white studio or restaurant/outdoor setting, very dark or harsh HDR lighting, excessive props, or strongly off-brand colour grading.
- PASS: fits the standard. Do not downgrade an accurate, good photo for small stylistic differences.

Return JSON only with exactly these keys:
{"visible_foods": string[], "dish_format": string, "depicted_format": ${DISH_FORMATS.map((f) => `"${f}"`).join("|")}, "format_confidence": integer 0-100, "accuracy": "PASS"|"MINOR"|"MAJOR"|"CRITICAL", "accuracy_issues": string[], "camera_angle": "overhead"|"45_degree"|"low_side"|"eye_level"|"other", "people_or_hands": boolean, "text_or_logo": boolean, "ai_artifacts": string[], "background": string, "lighting": string, "food_frame_share": "small"|"medium"|"large", "consistency": "PASS"|"REVIEW"|"REPLACE", "consistency_issues": string[], "alt_text_accurate": boolean, "confidence": integer 0-100}
Each issue must name the specific food or problem, e.g. "fried egg on top — recipe only uses egg in the batter".`
  .replace(
    "{STANDARD}",
    recipeImageStandardLines()
      .map((l) => `  ${l}`)
      .join("\n"),
  )
  .replace("{FORMAT}", dishFormatRubricLines().join("\n"));

function recipeBrief(recipe: QaRecipe): string {
  const ingredients = (recipe.ingredients ?? [])
    .map((i) => {
      const bits = [i.quantity, i.name].filter(Boolean).join(" ");
      const extras = [i.group && `group: ${i.group}`, i.notes].filter(Boolean).join("; ");
      return `- ${bits}${extras ? ` (${extras})` : ""}`;
    })
    .join("\n");
  const serving = recipe.steps?.[recipe.steps.length - 1]?.instruction ?? "";
  const flags = recipe.dietary?.flags ?? {};
  const alt = recipe.imageAlt || recipe.heroImageAlt || "(none)";
  return [
    `Title: ${recipe.title ?? recipe.slug}`,
    expectedDishFormatBrief(recipe.title ?? "", recipe.mealFormat),
    recipe.subtitle || recipe.description ? `Summary: ${recipe.subtitle || recipe.description}` : "",
    `Ingredients:\n${ingredients || "(none listed)"}`,
    serving ? `Final serving step: ${serving}` : "",
    `Expected visible foods: ${visibleIngredientHints(recipe).join(", ") || "(infer from title)"}`,
    EGG_BRIEF[plateEggStyle(recipe) ?? "none"],
    `Must not appear (not in recipe): ${deriveAvoidItems(recipe).join(", ")}`,
    `Dietary: vegetarian=${flags.vegetarian === true}, porkFree=${flags.porkFree === true}`,
    `Alt text to verify: ${alt}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Stable key: re-inspect only when the image, recipe, or standard changes. */
export function qaCacheKey(imageBuffer: Buffer, recipe: QaRecipe): string {
  const recipeKey = JSON.stringify([
    recipe.title,
    recipe.subtitle,
    (recipe.ingredients ?? []).map((i) => [i.name, i.notes, i.group]),
    recipe.steps?.[recipe.steps.length - 1]?.instruction,
    recipe.dietary?.flags?.vegetarian,
    recipe.imageAlt || recipe.heroImageAlt,
  ]);
  return createHash("sha256")
    .update(imageBuffer)
    .update(recipeKey)
    .update(RECIPE_IMAGE_QA_VERSION)
    .digest("hex")
    .slice(0, 32);
}

async function toVisionJpeg(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer).resize(768, 768, { fit: "inside" }).jpeg({ quality: 85 }).toBuffer();
  } catch {
    return buffer;
  }
}

function coerceVerdict(raw: Record<string, unknown>): VisionVerdict {
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
  const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(v as T) ? (v as T) : fallback;
  return {
    visible_foods: arr(raw.visible_foods),
    dish_format: String(raw.dish_format ?? ""),
    depicted_format: normalizeDepictedFormat(raw.depicted_format ?? raw.dish_format),
    format_confidence: Number(raw.format_confidence ?? raw.confidence) || 0,
    accuracy: pick(raw.accuracy, ["PASS", "MINOR", "MAJOR", "CRITICAL"] as const, "MAJOR"),
    accuracy_issues: arr(raw.accuracy_issues),
    camera_angle: pick(raw.camera_angle, ["overhead", "45_degree", "low_side", "eye_level", "other"] as const, "other"),
    people_or_hands: raw.people_or_hands === true,
    text_or_logo: raw.text_or_logo === true,
    ai_artifacts: arr(raw.ai_artifacts),
    background: String(raw.background ?? ""),
    lighting: String(raw.lighting ?? ""),
    food_frame_share: pick(raw.food_frame_share, ["small", "medium", "large"] as const, "medium"),
    consistency: pick(raw.consistency, ["PASS", "REVIEW", "REPLACE"] as const, "REVIEW"),
    consistency_issues: arr(raw.consistency_issues),
    alt_text_accurate: raw.alt_text_accurate !== false,
    confidence: Number(raw.confidence) || 0,
  };
}

export async function inspectRecipeImage(
  client: OpenAI,
  imageBuffer: Buffer,
  recipe: QaRecipe,
): Promise<VisionVerdict> {
  const jpeg = await toVisionJpeg(imageBuffer);
  const res = await client.chat.completions.create({
    model: process.env.RECIPE_IMAGE_QA_MODEL?.trim() || "gpt-4o",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: RUBRIC },
      {
        role: "user",
        content: [
          { type: "text", text: recipeBrief(recipe) },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpeg.toString("base64")}`, detail: "high" } },
        ],
      },
    ],
  });
  return parseVisionVerdict(res.choices[0]?.message?.content || "{}");
}

/** Raw model JSON → verdict. Exported so fixtures can replay recorded model responses. */
export function parseVisionVerdict(raw: string | Record<string, unknown>): VisionVerdict {
  return coerceVerdict(typeof raw === "string" ? (JSON.parse(raw) as Record<string, unknown>) : raw);
}

export function dishFormatCheck(v: VisionVerdict, recipe: QaRecipe): DishFormatCheck {
  return checkRecipeDishFormat(recipe.title ?? "", recipe.mealFormat, v.depicted_format, v.format_confidence);
}

/**
 * Recipe-fidelity verdict. Dish format is compared first and on its own: a format mismatch fails
 * even when every ingredient is visible, and an ambiguous format goes to manual review.
 */
export function recipeFidelity(
  v: VisionVerdict,
  recipe: QaRecipe,
): { status: FidelityStatus; reasons: string[]; format: DishFormatCheck } {
  const format = dishFormatCheck(v, recipe);
  const accuracy = accuracyStatus(v);
  const formatIssues = v.accuracy_issues.filter(isFormatIssue);
  const foodIssues = v.accuracy_issues.filter((i) => !isFormatIssue(i));
  let content: { status: FidelityStatus; reasons: string[] };
  if (accuracy === "PASS" || accuracy === "MINOR") {
    content = { status: "PASS", reasons: [] };
  } else if (formatIssues.length) {
    // The grade may rest on a format complaint, which the format check already decided — judge the rest on its own.
    content = isObviousCritical(foodIssues, recipe)
      ? { status: "FAIL", reasons: foodIssues }
      : foodIssues.length
        ? { status: "INCONCLUSIVE", reasons: foodIssues }
        : { status: "PASS", reasons: [] };
  } else {
    const issues = foodIssues.length ? foodIssues : [`vision graded ${accuracy}`];
    content =
      accuracy === "CRITICAL" || isObviousCritical(issues, recipe)
        ? { status: "FAIL", reasons: issues }
        : { status: "INCONCLUSIVE", reasons: issues };
  }
  return { ...combineFidelity(format, content), format };
}

/** A CRITICAL call the model itself is unsure of goes to human review, not auto-replace. */
export function accuracyStatus(v: VisionVerdict): AccuracyStatus {
  const confidence = v.confidence <= 1 ? v.confidence * 100 : v.confidence;
  return v.accuracy === "CRITICAL" && confidence < 70 ? "MAJOR" : v.accuracy;
}

const ADDED_FOODS: Array<{ issue: RegExp; inRecipe: RegExp }> = [
  { issue: /\bbacon\b/i, inRecipe: /bacon/i },
  { issue: /sausage (links|patties)|sausages? (on|present)/i, inRecipe: /sausage|chorizo|kielbasa|andouille/i },
  { issue: /pancakes?|waffles?/i, inRecipe: /pancake|waffle/i },
  { issue: /potato|\bfries\b|hash browns?|home fries|wedges/i, inRecipe: /potato|fries|tots|hash brown/i },
  { issue: /coleslaw|\bslaw\b/i, inRecipe: /slaw|cabbage/i },
  { issue: /baked beans/i, inRecipe: /beans/i },
  { issue: /cheese|feta|cheddar|mozzarella/i, inRecipe: /cheese|cheddar|mozzarella|parmesan|feta|swiss|provolone|\bjack\b|queso|ricotta|cotija|gruy/i },
  { issue: /\bshrimp\b/i, inRecipe: /shrimp|prawn/i },
  { issue: /\bchicken\b/i, inRecipe: /chicken/i },
  { issue: /\bbeef\b/i, inRecipe: /beef|steak|brisket|chuck/i },
  { issue: /\bburgers?\b|\bbuns?\b/i, inRecipe: /\bbuns?\b|burger|slider/i },
];
const PLATED_EGG_ISSUE = /(fried|poached|sunny|runny|whole)[^|]{0,20}eggs?|eggs?[^|]{0,12}(fried|sunny)/i;
const WRONG_FORMAT = /wrong (dish|main protein)|\b(tacos|chili|pasta|falafel|burgers?|bowl|sandwich format|rolled enchiladas|rolled tortillas|chicken wings|meat cubes|egg rolls|round pizza) instead of/i;

/**
 * "Obvious" P0 = safe to auto-replace: a different dish/format/protein, or a
 * high-risk food the recipe verifiably doesn't contain. Missing-ingredient,
 * pasta-shape, or cut-of-meat calls go to human review instead.
 */
export function isObviousCritical(issues: string[], recipe: QaRecipe): boolean {
  const title = (recipe.title ?? "").toLowerCase();
  const ingredients = (recipe.ingredients ?? []).map((i) => `${i.name ?? ""} ${i.notes ?? ""}`).join(" ");
  const eggStyle = plateEggStyle(recipe);
  return issues.some((issue) => {
    if (/^missing\b/i.test(issue.trim())) return false;
    const format = WRONG_FORMAT.exec(issue);
    if (format) {
      const shown = (format[2] ?? "").replace(/s$/, "");
      return !shown || !title.includes(shown);
    }
    if (PLATED_EGG_ISSUE.test(issue) && eggStyle !== "whole" && eggStyle !== "title") return true;
    return ADDED_FOODS.some((f) => f.issue.test(issue) && !f.inRecipe.test(ingredients));
  });
}

/** Hard rules layered on the model verdict so the standard is applied uniformly. */
export function consistencyStatus(v: VisionVerdict): ConsistencyStatus {
  if (v.text_or_logo || v.ai_artifacts.length > 0 || v.food_frame_share === "small") return "REPLACE";
  if (v.consistency === "REPLACE") return "REPLACE";
  if (v.people_or_hands || v.consistency === "REVIEW") return "REVIEW";
  return "PASS";
}

/** Gate for newly generated images before they are written to disk. */
export function passesPublishGate(v: VisionVerdict, recipe?: QaRecipe): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const format = recipe ? dishFormatCheck(v, recipe) : null;
  if (format?.verdict === "mismatch" || format?.verdict === "inconclusive") reasons.push(format.reason!);
  if (v.accuracy !== "PASS" && v.accuracy !== "MINOR") reasons.push(...v.accuracy_issues);
  if (v.people_or_hands) reasons.push("people or hands in frame");
  if (v.text_or_logo) reasons.push("text or logo in frame");
  reasons.push(...v.ai_artifacts);
  if (consistencyStatus(v) === "REPLACE") reasons.push(...v.consistency_issues);
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)] };
}
