/**
 * Normalize partial / legacy recipe data into canonical shape (pre-validation).
 */

function newRecipeId(): string {
  if (typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
import type { GenerateResponse, IngredientItem, RecipeStep } from "../schema.js";
import { cookingMethodSchema, type CookingMethod } from "../recipe-step-schema.js";
import { normalizeRecipeTitle } from "../recipe-title-quality.js";
import { isFirehallOwnedHeroUrl, normalizeOwnedMediaPath } from "../food-imagery/paths.js";
import { normalizeImagePathOptional } from "../media/normalize-image-path.js";
import {
  INGREDIENT_CATEGORIES,
  INGREDIENT_NAME_ALIASES,
  RECIPE_SCHEMA_VERSION,
  UNIT_ALIASES,
} from "./constants.js";
import type { FirehallRecipe, FirehallRecipeDraft } from "./types.js";
import {
  coerceCuisine,
  coerceMealType,
  coerceProtein,
  mergeControlledTags,
  normalizeRecipeTagList,
  slugifyTag,
} from "./tags.js";
import { inferIngredientCategory } from "./helpers.js";

export function slugifyRecipeTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || `meal-${Date.now()}`;
}

export function normalizeTitle(title: string): string {
  const t = (title || "").trim().replace(/\s+/g, " ");
  if (!t) return "Firehall Crew Dinner";
  return normalizeRecipeTitle({
    title: t,
    meal_style: undefined,
    chosen_protein: undefined,
    ingredients: [],
  });
}

export function normalizeUnit(unit: string | undefined): string {
  const u = (unit || "").trim().toLowerCase();
  if (!u) return "";
  return UNIT_ALIASES[u] || u;
}

export function normalizeIngredientName(name: string): string {
  const key = name.trim().toLowerCase().replace(/\s+/g, " ");
  return INGREDIENT_NAME_ALIASES[key] || name.trim();
}

export function normalizeImagePath(path: string | undefined): string | undefined {
  if (!path?.trim()) return undefined;
  const trimmed = path.trim();
  if (isFirehallOwnedHeroUrl(trimmed)) {
    return normalizeOwnedMediaPath(trimmed) || trimmed;
  }
  return normalizeImagePathOptional(trimmed);
}

export function parseQuantityAmount(amount: string): { quantity?: number; unit: string } {
  const raw = (amount || "").trim();
  if (!raw) return { unit: "" };

  // Mixed fraction with optional trailing unit: "1 1/4 lb", "1 1/2". The old single regex
  // (`^([\d./]+)\s*(.*)$`) stopped at the first whitespace, so it captured only the leading
  // whole number ("1") and dumped the fraction + unit ("1/4 lb") into the unit field verbatim.
  // That bogus unit never matches a known conversion, silently collapsing ingredients like
  // "1 1/4 lb breakfast sausage" down to a generic ~80g guess instead of ~567g.
  const mixed = raw.match(/^(\d+)\s+(\d+)\/(\d+)\s*(.*)$/);
  if (mixed) {
    const den = parseInt(mixed[3], 10);
    const quantity = parseInt(mixed[1], 10) + (den ? parseInt(mixed[2], 10) / den : 0);
    return { quantity, unit: normalizeUnit(mixed[4]) };
  }

  // Simple fraction with optional trailing unit: "1/2 cup", "3/4 tsp".
  const frac = raw.match(/^(\d+)\/(\d+)\s*(.*)$/);
  if (frac) {
    const den = parseInt(frac[2], 10);
    const quantity = den ? parseInt(frac[1], 10) / den : undefined;
    return { quantity, unit: normalizeUnit(frac[3]) };
  }

  const m = raw.match(/^([\d.]+)\s*(.*)$/);
  if (!m) return { unit: "", quantity: undefined };
  const n = parseFloat(m[1]);
  const quantity = Number.isNaN(n) ? undefined : n;
  return { quantity, unit: normalizeUnit(m[2]) };
}

function coerceCookingMethod(raw?: string): CookingMethod | undefined {
  if (!raw) return undefined;
  const parsed = cookingMethodSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

function normalizeLegacyIngredient(
  item: IngredientItem | FirehallRecipe["ingredients"][number],
  position: number,
): FirehallRecipe["ingredients"][number] {
  if ("name" in item && item.name && !("item" in item)) {
    const canon = item as FirehallRecipe["ingredients"][number];
    return {
      position: canon.position ?? position,
      name: normalizeIngredientName(canon.name),
      quantity: canon.quantity,
      unit: normalizeUnit(canon.unit),
      originalText:
        canon.originalText ||
        [canon.quantity, canon.unit, canon.name].filter(Boolean).join(" ").trim(),
      category: canon.category || inferIngredientCategory(canon.name),
      optional: canon.optional ?? false,
      substitutions: canon.substitutions ?? [],
    };
  }
  const legacy = item as IngredientItem;
  const parsed = parseQuantityAmount(legacy.amount);
  const name = normalizeIngredientName(legacy.item || "Ingredient");
  return {
    position,
    name,
    quantity: parsed.quantity,
    unit: parsed.unit,
    originalText: [legacy.amount, legacy.item, legacy.notes].filter(Boolean).join(" ").trim(),
    category: inferIngredientCategory(name),
    optional: false,
    substitutions: [],
  };
}

function normalizeLegacyStep(
  step: Partial<RecipeStep> & { heading?: string; body?: string; title?: string; instruction?: string },
  index: number,
): FirehallRecipe["instructions"][number] {
  const title = (step.title || step.heading || `Step ${index + 1}`).trim();
  const instruction = (step.instruction || step.body || "").trim();
  return {
    stepNumber: index + 1,
    title: title.slice(0, 120),
    instruction: instruction.length >= 12 ? instruction : `${instruction} — continue until done.`,
    minutes: step.estimated_time,
    heatLevel: undefined,
    equipment: [],
    cookingMethod: coerceCookingMethod(step.cooking_method),
    tips: [],
    safetyNotes: [],
  };
}

function defaultServings(crewSize = 6): FirehallRecipe["servings"] {
  const n = Math.min(20, Math.max(2, crewSize));
  return { crewSizeMin: n, crewSizeMax: n, scalableServings: true };
}

function defaultTiming(prep = 15, cook = 25): FirehallRecipe["timing"] {
  const total = prep + cook;
  return { prepMinutes: prep, cookMinutes: cook, totalMinutes: total };
}

/**
 * Build a normalized draft from unknown / partial input (safe before Zod).
 */
export function normalizeFirehallRecipeDraft(
  input: FirehallRecipeDraft | Record<string, unknown>,
  options: {
    id?: string;
    slug?: string;
    crewSize?: number;
    sourceType?: FirehallRecipe["source"]["sourceType"];
  } = {},
): FirehallRecipeDraft {
  const raw = input as FirehallRecipeDraft & GenerateResponse;
  const title = normalizeTitle(
    raw.identity?.title || raw.title || (raw as GenerateResponse).title || "Firehall Crew Dinner",
  );
  const id = options.id || raw.identity?.id || newRecipeId();
  const slug = options.slug || raw.identity?.slug || slugifyRecipeTitle(title);
  const protein = coerceProtein(
    raw.classification?.protein || (raw as GenerateResponse).chosen_protein,
  );
  const mealType = coerceMealType(
    raw.classification?.mealType || (raw as GenerateResponse).meal_style,
  );
  const cuisine = coerceCuisine(raw.classification?.cuisine || raw.tags?.cuisine);

  const legacyIngredients = (raw as GenerateResponse).ingredients || [];
  const ingredients =
    raw.ingredients?.length
      ? raw.ingredients.map((ing, i) => normalizeLegacyIngredient(ing, ing.position ?? i))
      : legacyIngredients.map((ing, i) => normalizeLegacyIngredient(ing, i));

  const legacySteps = (raw as GenerateResponse).steps || [];
  const instructions =
    raw.instructions?.length
      ? raw.instructions.map((s, i) => {
          const inst = s as FirehallRecipe["instructions"][number] & Partial<RecipeStep>;
          return normalizeLegacyStep(
            {
              heading: inst.heading ?? inst.title,
              body: inst.body ?? inst.instruction,
              title: inst.title,
              instruction: inst.instruction,
              estimated_time: inst.estimated_time ?? inst.minutes,
              cooking_method: inst.cooking_method ?? inst.cookingMethod,
            },
            inst.stepNumber ? inst.stepNumber - 1 : i,
          );
        })
      : legacySteps.map((s, i) => normalizeLegacyStep(s, i));

  const timingRaw = raw.timing || (raw as GenerateResponse).timing;
  const prep = timingRaw?.prepMinutes ?? (timingRaw as { prep_minutes?: number })?.prep_minutes ?? 15;
  const cook = timingRaw?.cookMinutes ?? (timingRaw as { cook_minutes?: number })?.cook_minutes ?? 25;
  const total =
    timingRaw?.totalMinutes ??
    (timingRaw as { total_minutes?: number })?.total_minutes ??
    prep + cook;

  const crewSize = options.crewSize ?? raw.servings?.crewSizeMax ?? 6;
  const rt = (raw as GenerateResponse).tags;

  const tags = mergeControlledTags(
    normalizeRecipeTagList([
      ...(raw.classification?.tags || []),
      cuisine,
      mealType,
      ...(rt?.key_ingredients || []),
    ]),
    {
      highProtein: rt?.high_protein,
      highFiber: rt?.high_fiber,
      quickCleanup: rt?.quick_cleanup,
    },
  );

  const macros = (raw as GenerateResponse).macros_per_serving;

  const now = new Date().toISOString();

  return {
    identity: {
      id,
      slug,
      title,
      subtitle: raw.identity?.subtitle,
      shortDescription:
        raw.identity?.shortDescription ||
        (raw as GenerateResponse).why_it_fits_tonight?.slice(0, 400),
    },
    classification: {
      protein,
      cuisine,
      mealType,
      tags,
      difficulty: raw.classification?.difficulty || "moderate",
      cleanupLevel: raw.classification?.cleanupLevel ?? 3,
      spicyLevel: raw.classification?.spicyLevel || "mild",
      equipment: raw.classification?.equipment || [],
    },
    timing: { prepMinutes: prep, cookMinutes: cook, totalMinutes: total },
    servings: raw.servings || defaultServings(crewSize),
    ingredients,
    instructions,
    shopping: raw.shopping,
    media: {
      heroImage: normalizeImagePath(raw.media?.heroImage),
      cardImage: normalizeImagePath(raw.media?.cardImage),
      mobileImage: normalizeImagePath(raw.media?.mobileImage),
      thumbnailImage: normalizeImagePath(raw.media?.thumbnailImage),
      imageAlt: raw.media?.imageAlt || `${title} — Firehall Meals`,
      imagePrompt: raw.media?.imagePrompt,
      imageStyleVersion: raw.media?.imageStyleVersion,
    },
    firehall: raw.firehall || {},
    nutrition: {
      caloriesEstimate: macros?.calories ?? raw.nutrition?.caloriesEstimate,
      proteinEstimate: macros?.protein_g ?? raw.nutrition?.proteinEstimate,
      carbEstimate: macros?.carbs_g ?? raw.nutrition?.carbEstimate,
      fatEstimate: macros?.fat_g ?? raw.nutrition?.fatEstimate,
    },
    source: {
      sourceType: options.sourceType || raw.source?.sourceType || "generated",
      sourceName: raw.source?.sourceName || (raw as GenerateResponse)._recipe_source?.name,
      sourceUrl: raw.source?.sourceUrl || (raw as GenerateResponse)._recipe_source?.url,
      importedAt: raw.source?.importedAt,
      curatedBy: raw.source?.curatedBy,
      externalId: raw.source?.externalId,
      license: raw.source?.license,
    },
    system: {
      createdAt: raw.system?.createdAt || now,
      updatedAt: raw.system?.updatedAt || now,
      schemaVersion: RECIPE_SCHEMA_VERSION,
      validationStatus: "normalized",
      qualityScore: raw.system?.qualityScore,
    },
    legacy: {
      templateId: (raw as GenerateResponse).template_id,
      catalogId: (raw as GenerateResponse)._catalog_id,
      signature: (raw as { _signature?: string })._signature,
      whyItFitsTonight: (raw as GenerateResponse).why_it_fits_tonight,
      cleanupTip: (raw as GenerateResponse).cleanup_tip,
      proTips: (raw as GenerateResponse).pro_tips,
    },
  };
}

/** Apply normalization then return object ready for Zod parse. */
export function normalizeForValidation(
  input: unknown,
  options?: Parameters<typeof normalizeFirehallRecipeDraft>[1],
): FirehallRecipeDraft {
  if (input && typeof input === "object" && "identity" in input) {
    return normalizeFirehallRecipeDraft(input as FirehallRecipeDraft, options);
  }
  return normalizeFirehallRecipeDraft((input || {}) as FirehallRecipeDraft, options);
}
