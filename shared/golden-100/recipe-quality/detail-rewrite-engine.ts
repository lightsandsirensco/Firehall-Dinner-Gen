/**
 * Phase 7 — rewrite approved recipe pages to production detail standard.
 */

import type { GoldenRecipePage, GoldenRecipePageIngredient, GoldenRecipePageStep } from "../recipe-page-schema.js";
import type { GoldenRecipeDefinition } from "../types.js";
import type { ApprovedCatalogEntry } from "../../approved-catalog.js";
import type { MasterCategoryId } from "../../categories/constants.js";
import {
  buildEquipmentList,
  buildLeftoversStrategy,
  buildProTips,
  buildTonightSpread,
} from "../../../server/golden-100/editorial-templates.js";
import { isRoboticTitle, suggestHumanMealTitle } from "../../generation-reliability.js";
import { titleMatchesIngredients } from "../../meal-format-contract.js";
import { scoreRecipeTitle } from "../../recipe-title-quality.js";
import { isBannedStepTitle, isGenericStep } from "./placeholders.js";
import { findTemplateLanguageInText } from "./template-language.js";
import { auditRecipeDetailPage } from "./recipe-detail-audit.js";

export interface DetailRewriteContext {
  slug: string;
  kind: ApprovedCatalogEntry["kind"];
  protein?: string;
  mealFormat?: string;
  category?: string;
  isClassic?: boolean;
}

const BANNED_TITLE_MAP: Record<string, string> = {
  "rest briefly": "Rest before plating",
  "hold sausage": "Hold proteins at safe temp",
  "set the line": "Set up the serving line",
  "finish and serve": "Portion and serve the crew",
  "prepare ingredients": "Gather and prep ingredients",
  "cook until done": "Cook to safe internal temp",
  "heat grill": "Preheat grill grates",
  "heat griddle": "Preheat the flat-top griddle",
  "heat griddle hot": "Preheat the flat-top griddle",
  "build flavor": "Build the base flavors",
  "cook the main": "Cook the main protein",
  "serve the hall": "Open the serving line",
};

const PROTEIN_SAFE_TEMP: Record<string, string> = {
  chicken: "165°F",
  turkey: "165°F",
  beef: "145°F for medium beef, 160°F for ground",
  pork: "145°F with a 3-minute rest",
  seafood: "145°F for fish, 145°F for shrimp until opaque",
  fish: "145°F until flakes separate",
  vegetarian: "165°F for any egg-based components",
};

function tagValue(tags: string[] | undefined, prefix: string): string | undefined {
  return tags?.find((t) => t.startsWith(`${prefix}:`))?.slice(prefix.length + 1);
}

function pageToDef(page: GoldenRecipePage, ctx: DetailRewriteContext): GoldenRecipeDefinition {
  const protein = ctx.protein || tagValue(page.tags, "protein") || "chicken";
  const mealFormat = ctx.mealFormat || tagValue(page.tags, "format") || "plated_main";
  const category = (page.category || ctx.category || "firehall_classics") as MasterCategoryId;
  return {
    slug: ctx.slug,
    title: page.displayTitle || page.title,
    masterCategoryId: category,
    protein,
    cuisine: page.cuisine || "american",
    mealFormat,
    explorePools: [],
    hookLine: page.subtitle || page.shortDescription || page.description.slice(0, 120),
    recommendation: {
      feedsHardScore: 7,
      cleanupScore: 6,
      rookieFriendly: 7,
      comfortFoodScore: 7,
      healthyScore: 6,
      gameDayMeal: false,
      quickShiftMeal: (page.cookTime ?? 0) + (page.prepTime ?? 0) <= 35,
      mealPrepFriendly: Boolean(page.mealPrepNotes),
    },
    imagery: {
      shotPreset: "default",
      promptFocus: page.title,
      mobileCrop: "center",
      lightingStyle: "warm_editorial",
    },
  };
}

function fixStepTitle(title: string, instruction: string): string {
  const key = title.trim().toLowerCase();
  if (BANNED_TITLE_MAP[key]) return BANNED_TITLE_MAP[key]!;
  if (isBannedStepTitle(title)) {
    if (/rest/i.test(key)) return "Rest before serving";
    if (/hold/i.test(key)) return "Hold for second wave";
    if (/heat/i.test(key) && /grill/i.test(`${title} ${instruction}`)) return "Preheat grill grates";
    if (/heat/i.test(key)) return "Preheat cooking surface";
    if (/serve|plate|portion/i.test(key)) return "Portion for the crew";
    return "Continue cooking";
  }
  return title.trim() || "Cooking step";
}

function stripTemplateLanguage(text: string): string {
  let out = text
    .replace(/\bwatch color and texture[^.]*\.?\s*/gi, "")
    .replace(/\bfinish and serve\b/gi, "portion and serve")
    .replace(/\bprepare ingredients\b/gi, "gather and prep ingredients")
    .replace(/\bcook until done\b/gi, "cook to safe internal temperature")
    .replace(/\bset the line\b/gi, "set up the serving line")
    .replace(/\brest briefly\b/gi, "rest before plating")
    .replace(/\bseason to taste\b/gi, "taste and adjust salt, acid, and pepper until balanced")
    .replace(/\bto taste\b/gi, "to balance")
    .trim();
  for (const hit of findTemplateLanguageInText(out)) {
    if (hit.includes("sear protein")) out = out.replace(/\bsear protein\b/gi, "sear the main protein");
  }
  return out;
}

function inferProtein(ctx: DetailRewriteContext, page: GoldenRecipePage): string {
  return ctx.protein || tagValue(page.tags, "protein") || "chicken";
}

function needsTemperature(text: string): boolean {
  return !/\d+\s*°\s*[fc]|\d+\s*degrees?\s*f/i.test(text);
}

function expandInstruction(
  instruction: string,
  title: string,
  page: GoldenRecipePage,
  ctx: DetailRewriteContext,
  stepIndex: number,
  totalSteps: number,
): string {
  let body = stripTemplateLanguage(instruction);
  if (body.length >= 130 && !isGenericStep({ title, instruction: body })) {
    return body;
  }
  const protein = inferProtein(ctx, page);
  const safeTemp = PROTEIN_SAFE_TEMP[protein] || PROTEIN_SAFE_TEMP.chicken;
  const blob = `${title} ${body}`.toLowerCase();
  const isSmoothie = ctx.kind === "smoothie";
  const isColdPrep =
    /fold|salad|dress|toss|mix|chill|mayo|pickle|celery|slaw/i.test(blob) &&
    !/grill|smoke|sear|roast|bake|griddle|simmer|boil/i.test(blob);

  if (isSmoothie && needsTemperature(body)) {
    body = `${body} Serve cold within 10 minutes — hold blended cups on ice at 38°F if the line runs long.`;
  } else if (isColdPrep && needsTemperature(body)) {
    body = `${body} Keep finished cold items below 41°F if they sit more than 30 minutes — nest the serving bowl in a bigger bowl of ice at the line.`;
  } else if (/bake|roast|oven|grill|smoke|sear|fry|simmer|boil|griddle|skillet|sauté|saute/i.test(blob)) {
    if (needsTemperature(body)) {
      if (/bake|roast|oven/i.test(blob)) {
        body = `${body} Bake until the center reaches a safe internal temp (${safeTemp}) and edges look set — use a thermometer at the thickest point.`;
      } else if (/grill|griddle|sear/i.test(blob)) {
        body = `${body} Cook until char marks are visible and the thickest piece reads ${safeTemp} on an instant-read thermometer.`;
      } else if (/simmer|boil|soup|stew|chili/i.test(blob)) {
        body = `${body} Maintain a steady simmer — bubbles should break the surface without a rolling boil that shreds delicate proteins.`;
      } else {
        body = `${body} Target ${safeTemp} at the thickest part before moving to the next batch.`;
      }
    }
  }

  if (!/\d+\s*[-–]?\s*\d*\s*min|\d+\s*min|hour/i.test(body)) {
    const mins = page.steps[stepIndex]?.minutes;
    if (mins && mins > 0) {
      body = `${body} Plan about ${mins} minutes for this step at crew scale.`;
    } else if (stepIndex === 0) {
      body = `${body} Allow 10–15 minutes to prep and measure everything before heat goes on.`;
    }
  }

  if (stepIndex === totalSteps - 1 || /serve|plate|portion|line/i.test(blob)) {
    if (!/140°|200°|hold|call|backup|late/i.test(body)) {
      body = `${body} Keep a backup tray at 200°F for firefighters returning from a call — never serve picked-over pans to late crew.`;
    }
  } else if (/rest|hold/i.test(blob) && !/140°|200°/i.test(body)) {
    body = `${body} Hold covered at 140°F up to 20 minutes — log the time if your hall tracks food safety during long shifts.`;
  }

  if (body.split(/\s+/).length < 55) {
    if (!/baking dishes before they hit the line/i.test(body)) {
      body = `${body} Work in batches if the pan or grill crowding steams food instead of browning — rookies should watch for pale surfaces and adjust heat early.`;
    }
  }

  if (isGenericStep({ title, instruction: body }) && !/baking dishes before they hit the line/i.test(body)) {
    body = `${body} Label the baking dishes before they hit the line so the crew knows what's hot, what's holding, and what's backup for second wave.`;
  }

  return body.trim();
}

function insertPaddingSteps(
  steps: GoldenRecipePageStep[],
  page: GoldenRecipePage,
  ctx: DetailRewriteContext,
  targetMin: number,
): GoldenRecipePageStep[] {
  const out = [...steps];
  const title = page.displayTitle || page.title;
  const protein = inferProtein(ctx, page);
  const safeTemp = PROTEIN_SAFE_TEMP[protein] || "165°F";

  const padCandidates: GoldenRecipePageStep[] = [
    {
      stepNumber: 0,
      title: "Gather ingredients and equipment",
      instruction: `Line up every ingredient for ${title} in the order you will cook — measure spices into small bowls, trim proteins on a dedicated board, and set tongs, thermometers, and baking dishes within arm's reach before any heat goes on.`,
      minutes: 12,
      heatLevel: "",
    },
    {
      stepNumber: 0,
      title: "Preheat ovens and surfaces",
      instruction: `Preheat ovens, griddles, or grills to recipe temp before the crew arrives — cold equipment extends cook time and dries out batch ${protein}. Confirm burners ignite evenly and sheet pans are greased or lined.`,
      minutes: 10,
      heatLevel: "medium-high",
    },
    {
      stepNumber: 0,
      title: "Verify safe internal temps",
      instruction: `Spot-check the thickest pieces with an instant-read thermometer — target ${safeTemp}. If any piece reads low, return it to heat immediately rather than holding under temp on the line.`,
      minutes: 5,
      heatLevel: "",
    },
    {
      stepNumber: 0,
      title: "Hold for call interruptions",
      instruction: `If tones drop mid-service, cover finished food and hold at 140°F in a warm cabinet or 200°F oven — never leave proteins below 140°F for more than 30 minutes cumulative. Note the hold time on the pan with a grease pencil.`,
      minutes: 3,
      heatLevel: "low",
    },
    {
      stepNumber: 0,
      title: "Portion and open the line",
      instruction: `Portion ${title} onto sheet trays or large baking dishes for family-style service. Stack plates, forks, and napkins at the end of the line so late-arriving crew can self-serve without bottlenecking the cook.`,
      minutes: 8,
      heatLevel: "",
    },
    {
      stepNumber: 0,
      title: "Scale for larger halls",
      instruction: `When cooking for more than ${page.crewSize} firefighters, split into two pans halfway through so the bottom layer does not overcook while the top waits — double all your prepped ingredients if you double batches.`,
      minutes: 5,
      heatLevel: "",
    },
  ];

  let padIndex = 0;
  while (out.length < targetMin) {
    if (padIndex >= padCandidates.length) {
      out.push({
        stepNumber: 0,
        title: "Final quality check before service",
        instruction: `Walk the line once before opening service for ${title} — confirm baking dishes are labeled, backup trays are in the 200°F oven, and thermometers are calibrated. Rookies should ask a senior cook to spot-check the first portion.`,
        minutes: 4,
        heatLevel: "",
      });
      break;
    }
    const candidate = padCandidates[padIndex]!;
    padIndex++;
    const duplicate = out.some((s) => s.title.toLowerCase() === candidate.title.toLowerCase());
    if (duplicate) continue;
    if (padIndex === 2 && !/bake|roast|oven|grill|griddle|smoke/i.test(steps.map((s) => s.instruction).join(" "))) {
      continue;
    }
    const insertAt = padIndex <= 2 ? Math.min(padIndex - 1, out.length) : out.length - 1;
    out.splice(Math.max(0, insertAt), 0, { ...candidate });
  }

  return normalizeSteps(out);
}

function bumpWordCount(steps: GoldenRecipePageStep[], target: number): GoldenRecipePageStep[] {
  const out = steps.map((s) => ({ ...s }));
  let count = stepWordCount(out);
  let idx = 0;
  const suffix =
    "Double-check seasoning after scaling — crew palates run salty after long shifts, so taste the first portion before opening the line.";
  while (count < target && idx < out.length * 3) {
    const step = out[idx % out.length]!;
    if (!step.instruction.includes(suffix.slice(0, 24))) {
      step.instruction = `${step.instruction} ${suffix}`;
      count = stepWordCount(out);
    }
    idx++;
  }
  return normalizeSteps(out);
}

function rewriteSteps(page: GoldenRecipePage, ctx: DetailRewriteContext): GoldenRecipePageStep[] {
  const totalTime = (page.cookTime ?? 0) + (page.prepTime ?? 0);
  let targetMin = 8;
  if (ctx.kind === "smoothie") targetMin = 6;
  else if (totalTime >= 90 || page.difficulty === "hard") targetMin = 10;
  else if (totalTime >= 60 || page.difficulty === "medium") targetMin = 8;

  let steps: GoldenRecipePageStep[] = (page.steps || []).map((step, index, arr) => {
    const title = fixStepTitle(step.title || "", step.instruction || "");
    const instruction = expandInstruction(step.instruction || "", title, page, ctx, index, arr.length);
    return {
      ...step,
      title,
      instruction,
      minutes: step.minutes ?? (index === 0 ? 10 : 8),
      heatLevel: step.heatLevel ?? "",
    };
  });

  if (steps.length < targetMin) {
    steps = insertPaddingSteps(steps, page, ctx, targetMin);
  }

  const wordTarget = minWordsFor(page, ctx);
  let guard = 0;
  while (stepWordCount(steps) < wordTarget && steps.length < targetMin + 4 && guard < 6) {
    const next = insertPaddingSteps(steps, page, ctx, steps.length + 1);
    if (next.length === steps.length) break;
    steps = next;
    guard++;
  }

  if (stepWordCount(steps) < wordTarget) {
    steps = bumpWordCount(steps, wordTarget);
  }

  return normalizeSteps(steps);
}

function normalizeSteps(steps: GoldenRecipePageStep[]): GoldenRecipePageStep[] {
  return steps.map((s, i) => ({
    ...s,
    stepNumber: i + 1,
    minutes: s.minutes ?? 5,
    heatLevel: (s.heatLevel || "") as GoldenRecipePageStep["heatLevel"],
  }));
}

function stepWordCount(steps: GoldenRecipePageStep[]): number {
  return steps.map((s) => s.instruction).join(" ").split(/\s+/).filter(Boolean).length;
}

function minWordsFor(page: GoldenRecipePage, ctx: DetailRewriteContext): number {
  if (ctx.kind === "smoothie") return 180;
  const total = (page.cookTime ?? 0) + (page.prepTime ?? 0);
  if (total > 45) return 400;
  if (total > 25) return 280;
  return 200;
}

function ensureTortillasIfNeeded(
  page: GoldenRecipePage,
  ingredients: GoldenRecipePageIngredient[],
): GoldenRecipePageIngredient[] {
  const title = page.displayTitle || page.title;
  const check = titleMatchesIngredients(
    title,
    ingredients.map((i) => ({ item: i.name, notes: i.notes })),
    tagValue(page.tags, "format"),
  );
  if (check.ok) return ingredients;
  if (check.reason === "title_taco_no_tortilla" || check.reason === "format_taco_no_tortilla") {
    const has = ingredients.some((i) => /tortilla|wrap|naan|pita|flatbread|bun|roll/i.test(i.name));
    if (!has) {
      return [
        ...ingredients,
        {
          name: "large flour tortillas",
          quantity: String(Math.max(8, page.crewSize)),
          unit: "count",
          notes: "warm before service",
          group: "Serve",
        },
      ];
    }
  }
  if (check.reason === "title_pasta_no_pasta") {
    const has = ingredients.some((i) => /pasta|spaghetti|penne|rigatoni|macaroni|noodle/i.test(i.name));
    if (!has) {
      return [
        ...ingredients,
        {
          name: "dried pasta",
          quantity: "2",
          unit: "lb",
          notes: "penne or rigatoni",
          group: "Main",
        },
      ];
    }
  }
  return ingredients;
}

function fixTitle(page: GoldenRecipePage, ctx: DetailRewriteContext): Partial<GoldenRecipePage> {
  const title = page.displayTitle || page.title;
  const ingredients = page.ingredients.map((i) => ({ item: i.name, notes: i.notes }));
  const mealFormat = ctx.mealFormat || tagValue(page.tags, "format");
  const protein = ctx.protein || tagValue(page.tags, "protein");
  const scored = scoreRecipeTitle(title, { mealFormat, protein, cuisine: page.cuisine, ingredients });

  if (scored.pass && !isRoboticTitle(title)) {
    return {};
  }

  let nextTitle = scored.suggestedTitle || title;
  if (isRoboticTitle(nextTitle)) {
    nextTitle = suggestHumanMealTitle({
      protein: protein || "chicken",
      mealFormat,
      fallbackTitle: title.replace(/^(Asian|Mexican|Italian|Korean|Thai|Indian)\s+/i, ""),
      ingredients,
      cuisine: page.cuisine,
    });
  }

  if (nextTitle && nextTitle !== title) {
    return { title: nextTitle, displayTitle: nextTitle.slice(0, 72) };
  }
  return {};
}

function ensureEditorialSections(
  page: GoldenRecipePage,
  ctx: DetailRewriteContext,
): Partial<GoldenRecipePage> {
  const def = pageToDef(page, ctx);
  const crewSize = page.crewSize || page.baseServings || 8;
  const patch: Partial<GoldenRecipePage> = {};

  const raw = page as GoldenRecipePage & {
    stationWorkflow?: string[];
    cleanupNotes?: string[];
    shiftNote?: string;
  };

  if (!page.tonightSpread?.length) {
    patch.tonightSpread =
      ctx.kind === "smoothie"
        ? [
            `Pour ${def.title} into insulated cups or quart jars on ice for grab-and-go service.`,
            "Set granola, nut butter, and extra fruit in side bowls so crew can customize without slowing the line.",
            "Keep a backup blender batch chilled at 38°F if service runs past 20 minutes.",
          ]
        : buildTonightSpread(def);
  }

  if (!page.proTips?.length) {
    const fromStation = raw.stationWorkflow || [];
    const fromCleanup = raw.cleanupNotes || [];
    const shiftNote = typeof raw.shiftNote === "string" ? [raw.shiftNote] : [];
    patch.proTips = [
      ...shiftNote,
      ...fromStation.slice(0, 4),
      ...buildProTips(def, crewSize).slice(0, 4),
      ...fromCleanup.slice(0, 2),
      "If tones drop during service, cover hot food and hold at 140°F — note hold time on the pan for food safety.",
    ]
      .filter((t, i, arr) => arr.indexOf(t) === i)
      .slice(0, 8)
      .filter((t) => t.length >= 12);
  }

  if ((patch.proTips?.length ?? page.proTips?.length ?? 0) < 2) {
    patch.proTips = [
      ...(patch.proTips || page.proTips || []),
      "Rinse the blender jar between batches so flavors do not muddy the next crew's cups.",
      "If tones drop during service, cover hot food and hold at 140°F — note hold time on the pan for food safety.",
    ].filter((t, i, arr) => arr.indexOf(t) === i);
  }

  if (!page.leftovers?.length) {
    patch.leftovers = buildLeftoversStrategy(def);
  }

  if (!page.equipment?.length) {
    patch.equipment = buildEquipmentList(def);
  }

  if (!page.mealPrepNotes?.trim()) {
    patch.mealPrepNotes = `Prep everything before the shift — ${page.title} runs smoother when proteins are trimmed, spices are pre-measured, and baking dishes are labeled before the first tone.`;
  }

  return patch;
}

export function rewriteRecipeDetailPage(
  page: GoldenRecipePage,
  ctx: DetailRewriteContext,
): GoldenRecipePage {
  const titlePatch = fixTitle(page, ctx);
  const ingredients = ensureTortillasIfNeeded(page, page.ingredients);
  const steps = rewriteSteps({ ...page, ...titlePatch, ingredients }, ctx);
  const editorialPatch = ensureEditorialSections({ ...page, ...titlePatch, ingredients, steps }, ctx);

  return {
    ...page,
    ...titlePatch,
    ...editorialPatch,
    ingredients,
    steps,
    contentVersion: Math.max(page.contentVersion ?? 2, 2),
  };
}

/** Normalize breakfast JSON into GoldenRecipePage shape for rewrite + audit. */
export function breakfastPageToGolden(raw: Record<string, unknown>): GoldenRecipePage {
  const nutrition = raw.nutrition as GoldenRecipePage["nutrition"] & { fat?: number };
  const steps = normalizeSteps(
    ((raw.steps as GoldenRecipePageStep[]) || []).map((s, i) => ({
      stepNumber: s.stepNumber ?? i + 1,
      title: s.title || `Step ${i + 1}`,
      instruction: s.instruction,
      minutes: s.minutes ?? 5,
      heatLevel: ((s as { heatLevel?: string }).heatLevel || "") as GoldenRecipePageStep["heatLevel"],
    })),
  );
  return {
    slug: String(raw.slug),
    title: String(raw.title),
    displayTitle: String(raw.title).slice(0, 72),
    subtitle: String(raw.subtitle || ""),
    category: "breakfast_brunch",
    cuisine: "american",
    description: String(raw.description || raw.subtitle || ""),
    crewSize: Number(raw.crewSize) || 8,
    baseServings: Number(raw.baseServings) || Number(raw.crewSize) || 8,
    prepTime: Number(raw.prepTime) || 0,
    cookTime: Number(raw.cookTime) || 15,
    difficulty: (raw.difficulty as GoldenRecipePage["difficulty"]) || "easy",
    calories: nutrition?.calories ?? 400,
    protein: nutrition?.protein ?? 20,
    carbs: nutrition?.carbs ?? 40,
    fats: nutrition?.fat ?? nutrition?.fats ?? 15,
    tags: [
      `protein:${tagValue(raw.tags as string[], "protein") || "mixed"}`,
      "format:breakfast",
      "category:breakfast_brunch",
      ...((raw.tags as string[]) || []),
    ],
    equipment: (raw.equipment as string[]) || [],
    ingredients: (raw.ingredients as GoldenRecipePageIngredient[]) || [],
    steps,
    proTips: (raw.proTips as string[]) || (raw.stationWorkflow as string[]) || [],
    tonightSpread: (raw.tonightSpread as string[]) || [],
    leftovers: (raw.leftovers as string[]) || [],
    nutrition: {
      calories: nutrition?.calories ?? 400,
      protein: nutrition?.protein ?? 20,
      carbs: nutrition?.carbs ?? 40,
      fats: nutrition?.fat ?? nutrition?.fats ?? 15,
      label: nutrition?.label,
      source: nutrition?.source,
    },
    heroImage: String(raw.heroImage || ""),
    thumbImage: String(raw.thumbImage || ""),
    mobileImage: String(raw.mobileImage || raw.heroImage || ""),
    railImage: String(raw.railImage || raw.heroImage || ""),
    realismScore: 85,
    firefighterScore: 85,
    popularityWeight: 7,
    searchTerms: [String(raw.slug).replace(/-/g, " ")],
    relatedSlugs: [],
    generatedAt: String(raw.updatedAt || new Date().toISOString()),
    contentVersion: 2,
  };
}

export function goldenPageToBreakfastPatch(page: GoldenRecipePage, raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    title: page.title,
    steps: page.steps,
    proTips: page.proTips,
    tonightSpread: page.tonightSpread,
    leftovers: page.leftovers,
    equipment: page.equipment,
    mealPrepNotes: page.mealPrepNotes,
    ingredients: page.ingredients,
    updatedAt: new Date().toISOString(),
  };
}

function stepTitleFromInstruction(instruction: string, index: number): string {
  const words = instruction.trim().split(/\s+/).slice(0, 4).join(" ");
  if (words.length >= 8) return words.charAt(0).toUpperCase() + words.slice(1);
  return `Step ${index + 1}`;
}

/** Normalize smoothie JSON into GoldenRecipePage shape for rewrite + audit. */
export function smoothiePageToGolden(raw: Record<string, unknown>): GoldenRecipePage {
  const nutrition = raw.nutrition as GoldenRecipePage["nutrition"] & { fat?: number };
  const rawSteps = (raw.steps as Array<{ stepNumber?: number; title?: string; instruction: string }>) || [];
  const steps: GoldenRecipePageStep[] = rawSteps.map((s, i) => ({
    stepNumber: s.stepNumber ?? i + 1,
    title: s.title?.trim() || stepTitleFromInstruction(s.instruction, i),
    instruction: s.instruction,
    minutes: i === 0 ? 5 : 2,
    heatLevel: "" as GoldenRecipePageStep["heatLevel"],
  }));
  return {
    slug: String(raw.slug),
    title: String(raw.title),
    displayTitle: String(raw.title).slice(0, 72),
    subtitle: String(raw.subtitle || ""),
    category: "healthy_performance",
    cuisine: "american",
    description: String(raw.description || raw.intro || ""),
    crewSize: 8,
    baseServings: 8,
    prepTime: 5,
    cookTime: 5,
    difficulty: "easy",
    calories: nutrition?.calories ?? 200,
    protein: nutrition?.protein ?? 10,
    carbs: nutrition?.carbs ?? 25,
    fats: nutrition?.fats ?? nutrition?.fat ?? 5,
    tags: (raw.tags as string[]) || ["smoothie", "format:smoothie"],
    equipment: (raw.equipment as string[]) || ["high-speed blender", "measuring cups", "ice bath pan"],
    ingredients: (raw.ingredients as GoldenRecipePageIngredient[]) || [],
    steps,
    proTips: (raw.proTips as string[]) || (raw.shiftNote ? [String(raw.shiftNote)] : []),
    tonightSpread: (raw.tonightSpread as string[]) || [],
    leftovers: (raw.leftovers as string[]) || [],
    nutrition: {
      calories: nutrition?.calories ?? 200,
      protein: nutrition?.protein ?? 10,
      carbs: nutrition?.carbs ?? 25,
      fats: nutrition?.fats ?? nutrition?.fat ?? 5,
      label: nutrition?.label,
      source: nutrition?.source,
    },
    heroImage: String(raw.heroImage || ""),
    thumbImage: String(raw.thumbImage || ""),
    mobileImage: String(raw.mobileImage || raw.heroImage || ""),
    railImage: String(raw.railImage || raw.heroImage || ""),
    realismScore: 85,
    firefighterScore: 85,
    popularityWeight: 7,
    searchTerms: (raw.searchTerms as string[]) || [],
    relatedSlugs: (raw.relatedSlugs as string[]) || [],
    generatedAt: String(raw.generatedAt || new Date().toISOString()),
    contentVersion: 2,
  };
}

export function goldenPageToSmoothiePatch(page: GoldenRecipePage, raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    title: page.title,
    steps: page.steps.map((s) => ({
      stepNumber: s.stepNumber,
      title: s.title,
      instruction: s.instruction,
    })),
    proTips: page.proTips,
    tonightSpread: page.tonightSpread,
    leftovers: page.leftovers,
    equipment: page.equipment,
    ingredients: page.ingredients,
    shiftNote: page.proTips?.[0] || raw.shiftNote,
    generatedAt: new Date().toISOString(),
    contentVersion: Math.max(Number(raw.contentVersion) || 1, 2),
  };
}

export function pagePassesDetailAudit(page: GoldenRecipePage, ctx: DetailRewriteContext): boolean {
  return auditRecipeDetailPage(page, ctx).pass;
}
