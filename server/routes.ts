import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import { generateRequestSchema, pizzaRequestSchema, hallVoteCreateSchema, type GenerateRequest, type GenerateResponse, type ClientRecipeResponse, type ClientIngredient, type ClientStep, type ClientProteinSafety, type ClientPlating, type ClientTiming } from "@shared/schema";
import { loadTemplates, filterTemplates, filterTemplatesWithRelaxation, pickTemplate, chooseProtein } from "./templates";
import { scanRecipeForAllergens, autoSubstituteAllergens, substituteTextForAllergens, buildAllergenAvoidList } from "./allergens";
import { auditAndFixRecipe as labelAudit, inferIngredientCategory, type LabelAuditContext } from "./labelAudit";
import { auditCrewScale, type CrewScaleAuditResult } from "./crew-scale-audit";
import { generateRecipe, generateRecipeFromPantry, repairRecipe, buildSafeFallbackRecipe } from "./ai";
import { getVarietyConstraints, recordRecipe } from "./variety-memory";
import { generatePizzaRecipe, pickPizzaConcept } from "./pizza-ai";
import { subscribeToList, trackRecipeEvent, trackShoppingListEvent, validateKlaviyoConfig } from "./klaviyo";
import { getFromPool, refillPool, getPoolSize } from "./recipe-pool";
import { initHallVoteTables, createHallVote, getHallVote, castBallot, closeHallVote, hashVoterFingerprint } from "./hall-vote-store";
import { addFavourite, getFavourites, removeFavourite, getAllFavouriteIds } from "./favourites";
import { getTopCachedRecipes, getVotedRecipeNames } from "./cache-store";
import { buildFallbackRecipe } from "./fallback-recipe";
import { searchRecipes, getRecipeById, getRandomRecipes, type SearchOptions } from "./spoonacular";
import { fetchBestSpoonacularRecipe } from "./spoonacular-converter";
import { runV2Generate } from "./recipe-engine-v2";
import { runV2Fallback } from "./v2-fallback";
import { enforceCarbs, trackCarb, ensureRiceForRiceDishes } from "./carb-rules";
import { completeFirehallPlate } from "./meal-composition";
import { adjustMacrosAfterCompose, assertMealSemanticsOrLog, scorePlateTrust } from "./meal-sanity";
import { applyCrewPortionFloors, hallCleanupTip, hallProTips } from "./firehall-voice";
import { pickStructure, trackStructure, STRUCTURE_DISPLAY, type StructureType } from "./structure-variety";
import { log } from "./index";
import { validateAndFixRecipe, validateRecipe, computeSignature, recordSignature, type RecipeValidationContext } from "./validateRecipe";
import {
  initCacheStore,
  buildCacheKey,
  buildPizzaCacheKey,
  getCachedRecipe,
  getCachedPizzaRecipe,
  setCachedRecipe,
  setCachedPizzaRecipe,
  checkRateLimit,
  recordRateLimit,
  checkAndReserveRequest,
  finalizeRequest,
  cancelRequest,
  logUsage,
  addSessionSignature,
  isRecentSessionSignature,
  getDailySpend,
  getUsageStats,
  getCacheCount,
  hashIp,
} from "./cache-store";

const COST_PER_1K_INPUT = 0.00015;
const COST_PER_1K_OUTPUT = 0.0006;

let firstRequestSinceBoot = true;

const BOT_UA_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i,
  /python-requests/i, /httpie/i, /postman/i,
];

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip || req.socket.remoteAddress || "unknown";
}

function isBot(ua: string): boolean {
  return BOT_UA_PATTERNS.some((p) => p.test(ua));
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  initCacheStore();
  initHallVoteTables();

  const klaviyoCheck = validateKlaviyoConfig();
  if (klaviyoCheck.ok) {
    log("Klaviyo API key configured", "klaviyo");
  } else {
    log(`WARNING: ${klaviyoCheck.error} — email features will fail`, "klaviyo");
  }

  const poolWarmupEnabled = process.env.ENABLE_POOL_WARMUP === "true";
  if (poolWarmupEnabled) {
    setTimeout(() => {
      log("Starting pre-generation pool warmup...", "pool");
      refillPool().catch((err) => log(`Pool warmup error: ${err.message}`, "pool"));
    }, 3000);
  } else {
    log("Pool warmup disabled (ENABLE_POOL_WARMUP != true). Recipes will be generated on-demand.", "pool");
  }

  app.use(cookieParser());

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.cookies?.session_id) {
      const sessionId = crypto.randomUUID();
      res.cookie("session_id", sessionId, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      (req as any)._sessionId = sessionId;
    } else {
      (req as any)._sessionId = req.cookies.session_id;
    }
    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === "GET") {
      if (!req.cookies?.csrf_token) {
        const token = crypto.randomBytes(24).toString("hex");
        res.cookie("csrf_token", token, {
          httpOnly: false,
          sameSite: "strict",
          maxAge: 24 * 60 * 60 * 1000,
        });
      }
    }
    next();
  });

  app.get("/api/warm", (_req: Request, res: Response) => {
    log("Warm-up ping received", "perf");
    return res.json({ status: "warm", uptime: process.uptime() });
  });

  function parseQtyUnit(amount: string): { qty: number; unit: string } {
    if (!amount || !amount.trim()) return { qty: 0, unit: "" };
    const m = amount.trim().match(/^([\d.\/\s]+)\s*(.*)$/);
    if (!m) return { qty: 0, unit: amount.trim() };
    let val: number;
    const numStr = m[1].trim();
    if (numStr.includes("/")) {
      const parts = numStr.split("/");
      val = parseFloat(parts[0]) / (parseFloat(parts[1]) || 1);
    } else if (numStr.includes(" ")) {
      const [whole, frac] = numStr.split(/\s+/);
      val = parseFloat(whole) + (frac && frac.includes("/") ? parseFloat(frac.split("/")[0]) / parseFloat(frac.split("/")[1]) : 0);
    } else {
      val = parseFloat(numStr);
    }
    if (isNaN(val)) val = 0;
    return { qty: Math.round(val * 100) / 100, unit: m[2].trim() };
  }

  function categorizeIngredient(name: string): string {
    return inferIngredientCategory(name);
  }

  function normalizeToClientFormat(recipe: any, crewSize: number, mealFormat: string): ClientRecipeResponse {
    const ingredients: ClientIngredient[] = (recipe.ingredients || []).map((ing: any) => {
      const { qty, unit } = parseQtyUnit(ing.amount || "");
      return {
        name: ing.item || ing.name || "",
        qty,
        unit,
        category: categorizeIngredient(ing.item || ing.name || ""),
      };
    });

    const steps: ClientStep[] = (recipe.steps || []).map((step: any, i: number) => {
      const heading = typeof step === "string" ? "" : (step.heading || step.title || "");
      const body = typeof step === "string" ? step : (step.body || step.instructions || "");

      // Extract heat and time from structured heading parenthetical:
      // e.g. "Sear the chicken (medium-high, 5–7 min)" → heat="medium-high", minutes=6
      // e.g. "Plate and serve (no heat, 2 min)" → heat="no heat", minutes=2
      let heat = "";
      let minutes = 0;
      const parenMatch = heading.match(/\(([^)]+)\)\s*$/);
      if (parenMatch) {
        const parts = parenMatch[1].split(",").map((p: string) => p.trim());
        if (parts.length >= 2) {
          heat = parts[0];
          const timeMatch = parts[1].match(/(\d+)[–\-](\d+)|(\d+)/);
          if (timeMatch) {
            const lo = parseInt(timeMatch[1] || timeMatch[3] || "0");
            const hi = timeMatch[2] ? parseInt(timeMatch[2]) : lo;
            minutes = Math.round((lo + hi) / 2);
          }
        } else if (parts.length === 1) {
          const timeOnly = parts[0].match(/^(\d+)[–\-]?(\d+)?\s*min/);
          if (timeOnly) {
            const lo = parseInt(timeOnly[1]);
            const hi = timeOnly[2] ? parseInt(timeOnly[2]) : lo;
            minutes = Math.round((lo + hi) / 2);
          } else {
            heat = parts[0];
          }
        }
      }

      return {
        n: i + 1,
        title: heading,
        heat,
        minutes,
        instructions: body,
      };
    });

    const timing: ClientTiming = recipe.timing ? {
      prep_min: recipe.timing.prep_minutes ?? recipe.timing.prep_min ?? 0,
      cook_min: recipe.timing.cook_minutes ?? recipe.timing.cook_min ?? 0,
      total_min: recipe.timing.total_minutes ?? recipe.timing.total_min ?? 0,
    } : { prep_min: 0, cook_min: 0, total_min: 0 };

    const safetyArr = recipe.protein_safety || [];
    const firstSafety = Array.isArray(safetyArr) && safetyArr.length > 0 ? safetyArr[0] : null;
    const proteinSafety: ClientProteinSafety = firstSafety ? {
      protein: firstSafety.protein || recipe.chosen_protein || "",
      internal_temp_f: firstSafety.target_temp_f ?? firstSafety.internal_temp_f ?? 0,
      rest_min: firstSafety.rest_minutes ?? firstSafety.rest_min ?? 0,
      notes: [firstSafety.probe_where, firstSafety.notes].filter(Boolean).join(". ") || "",
    } : {
      protein: recipe.chosen_protein || "",
      internal_temp_f: 0,
      rest_min: 0,
      notes: "",
    };

    const tags: string[] = [];
    if (recipe.tags) {
      if (recipe.tags.cuisine) tags.push(recipe.tags.cuisine);
      if (recipe.tags.cooking_method) tags.push(recipe.tags.cooking_method);
      if (recipe.tags.high_protein) tags.push("Feeds hard");
      if (recipe.tags.high_fiber) tags.push("High Fiber");
      if (recipe.tags.quick_cleanup) tags.push("Quick Cleanup");
      if (recipe.tags.base_carb) tags.push(recipe.tags.base_carb);
    }

    const plating: ClientPlating = recipe.plating || {
      serve_style: recipe.meal_style || mealFormat || "",
      assembly_instructions: "",
      optional_toppings: [],
    };

    return {
      title: recipe.title || "",
      meal_plate: recipe.meal_plate || undefined,
      meal_format: mealFormat || recipe.meal_style || "",
      servings: crewSize,
      tags,
      timing,
      protein_safety: proteinSafety,
      ingredients,
      steps,
      plating,
      macros_per_serving: recipe.macros_per_serving || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      macros_estimated: !!(recipe.tags as Record<string, unknown> | undefined)?.macros_estimated,
      chosen_protein: recipe.chosen_protein || "",
      primary_protein_source: recipe.primary_protein_source || "",
      meal_style: recipe.meal_style,
      why_it_fits_tonight: recipe.why_it_fits_tonight || "",
      cleanup_tip: recipe.cleanup_tip || "",
      pro_tips: recipe.pro_tips,
      budget_level: recipe.budget_level,
      budget_tips: recipe.budget_tips,
      veg_option: recipe.veg_option,
      ingredients_used: recipe.ingredients_used,
      extra_items_needed: recipe.extra_items_needed,
      recipe_tags: recipe.tags,
      template_id: recipe.template_id,
      _fallback: recipe._fallback,
      _signature: recipe._signature,
      _id: recipe._id,
    };
  }

  function buildAllergenSafeFallback(originalRecipe: GenerateResponse, allergens: string[], crewSize: number): GenerateResponse {
    const protein = originalRecipe.chosen_protein || "chicken";
    const scale = crewSize > 0 ? crewSize / 4 : 1;
    const scaleAmt = (base: number, unit: string) => `${Math.round(base * scale)} ${unit}`;

    const safeIngredients: { item: string; amount: string; notes: string }[] = [];

    if (protein === "vegetarian") {
      safeIngredients.push(
        { item: "Chickpeas, drained and rinsed", amount: scaleAmt(2, "cans"), notes: "" },
        { item: "Olive oil", amount: "3 tbsp", notes: "" },
        { item: "Garlic cloves, minced", amount: scaleAmt(4, "cloves"), notes: "" },
      );
    } else {
      const proteinLabel = protein === "fish" ? "White fish fillets" :
        protein === "beef" ? "Ground beef" :
        protein === "pork" ? "Pork tenderloin, sliced" :
        protein === "turkey" ? "Ground turkey" : "Boneless skinless chicken breasts";
      safeIngredients.push(
        { item: proteinLabel, amount: scaleAmt(2, "lbs"), notes: "" },
        { item: "Olive oil", amount: "2 tbsp", notes: "" },
        { item: "Garlic cloves, minced", amount: scaleAmt(4, "cloves"), notes: "" },
      );
    }

    safeIngredients.push(
      { item: "Mixed vegetables (bell pepper, broccoli, carrots)", amount: scaleAmt(4, "cups"), notes: "" },
      { item: "Salt", amount: "1 tsp", notes: "" },
      { item: "Black pepper", amount: "½ tsp", notes: "" },
      { item: "Paprika", amount: "1 tsp", notes: "" },
      { item: "Lemon juice", amount: "2 tbsp", notes: "" },
    );

    const proteinDisplay = protein.charAt(0).toUpperCase() + protein.slice(1);
    const proteinStepName = protein === "vegetarian" ? "chickpeas"
      : protein === "fish" ? "the fish fillets"
      : protein === "beef" ? "the ground beef"
      : protein === "pork" ? "the pork"
      : protein === "turkey" ? "the ground turkey"
      : "the chicken";

    const safeSteps = [
      { heading: `Season and cook ${proteinStepName} (medium-high, 8 min)`, body: `Season ${proteinStepName} with salt, pepper, and paprika. Heat olive oil in a large skillet over medium-high heat. Cook until golden and cooked through, about 6-8 minutes.` },
      { heading: "Sauté vegetables (medium, 5 min)", body: "In the same pan, add garlic and mixed vegetables. Cook 4-5 minutes until tender-crisp." },
      { heading: "Combine and finish (medium, 2 min)", body: `Return ${proteinStepName} to the pan. Toss everything together. Squeeze lemon juice over the top.` },
      { heading: "Plate and serve (no heat, 2 min)", body: `Plate ${proteinStepName} and vegetable mixture. Serve family-style.` },
    ];
    const safeTitle = `Lemon Herb ${protein === "vegetarian" ? "Chickpea" : proteinDisplay} Skillet`;

    log(`[allergen-postcheck] Built allergen-safe fallback: "${safeTitle}"`, "allergen");

    return {
      ...originalRecipe,
      title: safeTitle,
      ingredients: safeIngredients,
      steps: safeSteps,
      meal_style: originalRecipe.meal_style || "Skillet",
      base_carb: "none",
      cooking_method: "stovetop",
      tags: {
        ...(originalRecipe.tags || {}),
        base_carb: "none",
        cooking_method: "stovetop",
        meal_style: "skillet",
      },
    };
  }

  function buildResponse(validation: import("./validateRecipe").ValidationResult, extras: Record<string, any>, debug: boolean, crewSize: number = 0, mealFormat: string = "", allergens: string[] = [], auditCtx?: LabelAuditContext): Record<string, any> {
    let recipe = validation.recipe;

    if (allergens.length > 0) {
      const scan = scanRecipeForAllergens(recipe.ingredients, recipe.steps, recipe.title, allergens);
      if (scan.found) {
        log(`[allergen-postcheck] Found ${scan.violations.length} allergen violations — auto-substituting: ${scan.violations.join("; ")}`, "allergen");
        const fixed = autoSubstituteAllergens(recipe.ingredients, recipe.steps, recipe.title, allergens);
        recipe = { ...recipe, ingredients: fixed.ingredients, steps: fixed.steps, title: fixed.title };
        if (fixed.substitutionsMade.length > 0) {
          log(`[allergen-postcheck] Substitutions: ${fixed.substitutionsMade.join("; ")}`, "allergen");
        }

        const rescan = scanRecipeForAllergens(recipe.ingredients, recipe.steps, recipe.title, allergens);
        if (rescan.found) {
          log(`[allergen-postcheck] Still found violations after substitution — switching to allergen-safe fallback: ${rescan.violations.join("; ")}`, "allergen");
          const safeRecipe = buildAllergenSafeFallback(recipe, allergens, crewSize);
          recipe = safeRecipe;
        }
      } else {
        log(`[allergen-postcheck] Clean — no allergen violations found`, "allergen");
      }

      if (recipe.pro_tips && Array.isArray(recipe.pro_tips)) {
        recipe = { ...recipe, pro_tips: recipe.pro_tips.map((t: string) => substituteTextForAllergens(t, allergens)) };
      }
      if (recipe.why_it_fits_tonight) {
        recipe = { ...recipe, why_it_fits_tonight: substituteTextForAllergens(recipe.why_it_fits_tonight, allergens) };
      }
      if (recipe.cleanup_tip) {
        recipe = { ...recipe, cleanup_tip: substituteTextForAllergens(recipe.cleanup_tip, allergens) };
      }
      if (recipe.budget_tips && Array.isArray(recipe.budget_tips)) {
        recipe = { ...recipe, budget_tips: recipe.budget_tips.map((t: string) => substituteTextForAllergens(t, allergens)) };
      }
      if (recipe.veg_option) {
        const vo = recipe.veg_option;
        recipe = {
          ...recipe,
          veg_option: {
            ...vo,
            title: vo.title ? substituteTextForAllergens(vo.title, allergens) : vo.title,
            swap_instructions: vo.swap_instructions ? substituteTextForAllergens(vo.swap_instructions, allergens) : vo.swap_instructions,
          },
        };
      }
    }

    const ctx: LabelAuditContext = auditCtx || {
      selectedAppliances: [],
      selectedAllergens: allergens,
      selectedHealthiness: "balanced",
      selectedBudget: "standard",
      selectedCuisine: "",
      selectedMealFormat: mealFormat,
      selectedProtein: "any",
      chosenProtein: recipe.chosen_protein || "",
      crewSize,
    };

    const audit = labelAudit(recipe, ctx);
    recipe = audit.recipe;

    if (audit.fixesApplied.length > 0) {
      log(`[label-audit] Applied ${audit.fixesApplied.length} fixes: ${audit.fixesApplied.join("; ")}`, "audit");
    }

    const healthiness = ctx.selectedHealthiness || "balanced";
    const { recipe: carbFixed, fixes: carbFixes } = enforceCarbs(recipe, mealFormat, healthiness, allergens);
    recipe = carbFixed;
    if (carbFixes.length > 0) {
      log(`[carb-rules] Applied ${carbFixes.length} fixes: ${carbFixes.join("; ")}`, "carb");
    }

    const effectiveCrewSize = ctx.crewSize || crewSize || 6;
    const { recipe: riceFixed, fixes: riceFixes } = ensureRiceForRiceDishes(recipe, mealFormat, effectiveCrewSize, allergens);
    recipe = riceFixed;
    if (riceFixes.length > 0) {
      log(`[rice-inject] Applied ${riceFixes.length} fixes: ${riceFixes.join("; ")}`, "carb");
    }

    const { recipe: composed, fixes: composeFixes } = completeFirehallPlate(recipe, {
      mealFormat,
      cuisine: ctx.selectedCuisine || recipe.tags?.cuisine || "any",
      healthiness,
      crewSize: effectiveCrewSize,
      allergens,
      protein: ctx.chosenProtein || recipe.chosen_protein || "any",
    });
    recipe = composed;
    if (composeFixes.length > 0) {
      log(`[compose] Applied ${composeFixes.length} plate fixes: ${composeFixes.join("; ")}`, "compose");
    }

    recipe = assertMealSemanticsOrLog(recipe, {
      mealFormat,
      cuisine: ctx.selectedCuisine || recipe.tags?.cuisine || "any",
      crewSize: effectiveCrewSize,
      allergens,
      protein: ctx.chosenProtein || recipe.chosen_protein || "any",
    }, composeFixes.filter((f) => f.startsWith("unrepaired:") || f.startsWith("repair:")));

    if (composeFixes.length > 0) {
      recipe = adjustMacrosAfterCompose(recipe, composeFixes.length);
    }

    const trustScore = scorePlateTrust(recipe);
    if (trustScore < 5) {
      log(`[meal-sanity] Low plate trust (${trustScore}/10) for "${recipe.title}"`, "validate");
    }

    recipe = {
      ...recipe,
      ingredients: applyCrewPortionFloors(recipe.ingredients || [], effectiveCrewSize),
      cleanup_tip: recipe.cleanup_tip || hallCleanupTip(),
      pro_tips: recipe.pro_tips?.length ? recipe.pro_tips : hallProTips(effectiveCrewSize, 4),
    };

    const finalBaseCarb = recipe.tags?.base_carb || "";
    if (finalBaseCarb && finalBaseCarb !== "none") {
      trackCarb(finalBaseCarb);
    }

    const recipeId = crypto.randomUUID();
    const merged = { ...recipe, ...extras, _signature: validation.signature, _id: recipeId };
    const client = normalizeToClientFormat(merged, crewSize, mealFormat);
    const base: Record<string, any> = { ...client };
    base._id = recipeId;

    const ingsCount = (client.ingredients || []).length;
    const stepsCount = (client.steps || []).length;
    log(`[api] returning recipe id=${recipeId} signature=${(validation.signature || "").substring(0, 50)} title="${client.title}" ingredientsCount=${ingsCount} stepsCount=${stepsCount}`, "api");

    if (extras._filtersRelaxed) {
      base._filters_adjusted = true;
      base._adjustment_note = "Adjusted meal style to meet allergy requirements.";
    }

    if (debug) {
      const recipeValidationErrors = validation.issues.filter((i: string) =>
        i.startsWith("ingredient_unused:") ||
        i.startsWith("step_mentions_unlisted:") ||
        i.startsWith("format_missing_required:") ||
        i.startsWith("format_has_forbidden:") ||
        i.startsWith("format_missing_step:") ||
        i.startsWith("format_forbidden_step:")
      );
      base._debug = {
        validation_ok: validation.ok,
        issues: validation.issues,
        validation_errors: recipeValidationErrors,
        action: validation.actionTaken,
        meal_style: recipe.meal_style,
        base_carb: recipe.tags?.base_carb,
        cooking_method: recipe.tags?.cooking_method,
        cuisine: recipe.tags?.cuisine,
        key_ingredients: recipe.tags?.key_ingredients,
        signature: validation.signature,
        label_audit: {
          ok: audit.ok,
          fixes_applied: audit.fixesApplied,
          issues: audit.issues,
          details: audit.auditDetails,
        },
      };
    }
    return base;
  }

  function sendRecipeResponse(res: Response, validation: import("./validateRecipe").ValidationResult, extras: Record<string, any>, debug: boolean, crewSize: number, mealFormat: string, allergens: string[], auditCtx: LabelAuditContext | undefined, ipHash: string, sessionId: string, requestId: string) {
    const result = buildResponse(validation, extras, debug, crewSize, mealFormat, allergens, auditCtx);
    if (extras._spoonacular_title && result.title !== extras._spoonacular_title) {
      log(`[spoonacular-generator] Label audit changed title — restoring: "${extras._spoonacular_title}"`, "spoonacular");
      result.title = extras._spoonacular_title;
    }
    const signature = validation.signature || result._signature || "";
    const sessKey = `${ipHash}:${sessionId}`;
    addSessionSignature(sessKey, signature);
    recordSuccessfulGeneration(ipHash, sessionId, requestId, signature);
    return res.json(result);
  }

  function recordSuccessfulGeneration(ipHash: string, sessionId: string, requestId: string, signature: string) {
    const sessionKey = `${ipHash}:${sessionId}`;
    const result = finalizeRequest(sessionKey, requestId, signature);

    if (result.sameSignature) {
      log(`[rate] NOT counted — same signature=${signature} for session=${sessionId} request_id=${requestId}`, "rate");
      return;
    }

    recordRateLimit(`burst:${ipHash}`);
    recordRateLimit(`hourly:${ipHash}`);
    recordRateLimit(`burst:session:${sessionId}`);
    recordRateLimit(`hourly:session:${sessionId}`);
    log(`[rate] Generation counted — request_id=${requestId} signature=${signature} session=${sessionId}`, "rate");
  }

  const REMIX_SAUCES: Record<string, string[]> = {
    chicken: ["honey mustard", "teriyaki glaze", "chipotle lime", "lemon herb", "bbq sauce", "buffalo sauce", "pesto", "garlic butter"],
    beef: ["chimichurri", "mushroom gravy", "bbq sauce", "teriyaki", "garlic herb butter", "horseradish cream", "balsamic glaze", "salsa verde"],
    pork: ["apple cider glaze", "honey garlic", "bbq sauce", "mustard glaze", "teriyaki", "chipotle", "maple dijon", "hoisin"],
    turkey: ["cranberry glaze", "herb gravy", "honey mustard", "lemon herb", "bbq rub", "chipotle lime", "garlic herb", "teriyaki"],
    fish: ["lemon dill", "miso glaze", "garlic butter", "cajun spice", "teriyaki", "coconut curry", "herb crust", "citrus salsa"],
    vegetarian: ["pesto", "tahini", "coconut curry", "chipotle", "lemon herb", "garlic sauce", "harissa", "teriyaki"],
    pantry: ["garlic herb", "lemon pepper", "bbq rub", "cajun spice", "honey mustard", "teriyaki", "chipotle", "balsamic"],
  };

  const REMIX_CARBS = ["rice", "pasta", "quinoa", "potatoes", "noodles", "bread", "tortillas", "couscous"];
  const GLUTEN_UNSAFE_CARBS = new Set(["pasta", "noodles", "bread", "couscous", "tortillas"]);

  function remixRecipeForVariety(recipe: GenerateResponse, currentStructure: StructureType, protein: string, allergens: string[] = []): GenerateResponse {
    const remixed = { ...recipe, ingredients: [...recipe.ingredients], steps: [...recipe.steps], tags: recipe.tags ? { ...recipe.tags } : undefined };

    const sauces = REMIX_SAUCES[protein.toLowerCase()] || REMIX_SAUCES.chicken;
    const currentIngs = remixed.ingredients.map(i => i.item.toLowerCase()).join(" ");
    const availSauces = sauces.filter(s => !currentIngs.includes(s.split(" ")[0]));
    let chosenSauce = "";
    if (availSauces.length > 0) {
      chosenSauce = availSauces[Math.floor(Math.random() * availSauces.length)];
      const sauceIdx = remixed.ingredients.findIndex(i =>
        /sauce|glaze|dressing|marinade|drizzle/i.test(i.item) || /sauce|glaze|dressing/i.test(i.notes || "")
      );
      if (sauceIdx >= 0) {
        remixed.ingredients[sauceIdx] = { item: chosenSauce.charAt(0).toUpperCase() + chosenSauce.slice(1), amount: remixed.ingredients[sauceIdx].amount, notes: "" };
      } else {
        remixed.ingredients.push({ item: chosenSauce.charAt(0).toUpperCase() + chosenSauce.slice(1), amount: "2 tbsp", notes: "for finishing" });
      }
    }

    const currentCarb = remixed.tags?.base_carb || "";
    const hasGluten = allergens.some(a => a.toLowerCase() === "gluten");
    const altCarbs = REMIX_CARBS.filter(c => {
      if (c === currentCarb.toLowerCase()) return false;
      if (hasGluten && GLUTEN_UNSAFE_CARBS.has(c)) return false;
      return true;
    });
    const newCarb = altCarbs.length > 0 ? altCarbs[Math.floor(Math.random() * altCarbs.length)] : "rice";
    if (newCarb && remixed.tags) remixed.tags.base_carb = newCarb;

    if (newCarb && currentCarb && newCarb !== currentCarb.toLowerCase()) {
      const carbPattern = new RegExp(`\\b(${currentCarb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, "gi");
      const display = newCarb.charAt(0).toUpperCase() + newCarb.slice(1);
      const carbIngIdx = remixed.ingredients.findIndex(i => carbPattern.test(i.item));
      if (carbIngIdx >= 0) {
        remixed.ingredients[carbIngIdx] = { ...remixed.ingredients[carbIngIdx], item: display };
      }
      for (let si = 0; si < remixed.steps.length; si++) {
        const stepBody = remixed.steps[si].body || "";
        if (carbPattern.test(stepBody)) {
          remixed.steps[si] = { ...remixed.steps[si], body: stepBody.replace(carbPattern, newCarb) };
        }
      }
    }

    const proteinDisplay = protein.charAt(0).toUpperCase() + protein.slice(1);
    const styleDisplay = remixed.meal_style || currentStructure;
    const flavorWord = chosenSauce ? chosenSauce.split(" ")[0] : "";
    const titleFlavor = flavorWord ? flavorWord.charAt(0).toUpperCase() + flavorWord.slice(1) + " " : "";
    remixed.title = `${titleFlavor}${proteinDisplay} ${styleDisplay}`;

    return remixed;
  }

  app.post("/api/generate", async (req: Request, res: Response) => {
    try {
      const ua = req.headers["user-agent"] || "";
      if (isBot(ua)) {
        return res.status(403).json({ message: "Automated requests are not allowed." });
      }

      const csrfCookie = req.cookies?.csrf_token;
      const csrfHeader = req.headers["x-csrf-token"] as string;
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return res.status(403).json({ message: "Invalid security token. Please refresh the page and try again." });
      }

      const sessionId = (req as any)._sessionId || "unknown";
      const clientIp = getClientIp(req);
      const ipHash = hashIp(clientIp);

      const requestId = (req.body as any)?.request_id || `auto-${Date.now()}`;
      const sessionKey = `${ipHash}:${sessionId}`;
      const reserveCheck = checkAndReserveRequest(sessionKey, requestId);
      if (reserveCheck.isDuplicate) {
        log(`[rate] Duplicate request_id=${requestId} — already completed`, "rate");
        return res.status(429).json({
          message: "Duplicate request detected. Please wait for the current recipe to finish.",
          retry_after_seconds: 5,
        });
      }
      if (reserveCheck.isInFlight) {
        log(`[rate] In-flight request_id=${requestId} — blocking concurrent duplicate`, "rate");
        return res.status(429).json({
          message: "A recipe is already being generated. Please wait.",
          retry_after_seconds: 5,
        });
      }

      const burstCheck = checkRateLimit(`burst:${ipHash}`, 60_000, 3);
      if (!burstCheck.allowed) {
        cancelRequest(sessionKey, requestId);
        return res.status(429).json({
          message: "Slow down! Maximum 3 recipes per minute. Please wait a moment.",
          retry_after_seconds: 60,
        });
      }

      const hourlyCheck = checkRateLimit(`hourly:${ipHash}`, 3_600_000, 10);
      if (!hourlyCheck.allowed) {
        cancelRequest(sessionKey, requestId);
        return res.status(429).json({
          message: `Hourly limit reached (10 recipes/hour). You have ${hourlyCheck.remaining} remaining. Try again later.`,
          retry_after_seconds: 3600,
        });
      }

      const sessionBurst = checkRateLimit(`burst:session:${sessionId}`, 60_000, 3);
      if (!sessionBurst.allowed) {
        cancelRequest(sessionKey, requestId);
        return res.status(429).json({
          message: "Slow down! Maximum 3 recipes per minute.",
          retry_after_seconds: 60,
        });
      }

      const sessionHourly = checkRateLimit(`hourly:session:${sessionId}`, 3_600_000, 10);
      if (!sessionHourly.allowed) {
        cancelRequest(sessionKey, requestId);
        return res.status(429).json({
          message: "Hourly limit reached (10 recipes/hour). Try again later.",
          retry_after_seconds: 3600,
        });
      }

      const parsed = generateRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        cancelRequest(sessionKey, requestId);
        return res.status(400).json({ message: "Invalid request: " + parsed.error.message });
      }

      const request = parsed.data;

      if (request.use_what_we_have && (!request.ingredients_on_hand || request.ingredients_on_hand.length === 0)) {
        cancelRequest(sessionKey, requestId);
        return res.status(400).json({ message: "Please enter at least one ingredient when using 'Use What's in the Fridge' mode." });
      }

      // ─── V2 GENERATE PIPELINE ────────────────────────────────────────────────
      //
      // Primary source: Spoonacular (multi-pass progressive search + protein audit)
      // Fallback:       Deterministic template-based recipe (no AI)
      // Pantry mode:    AI generation using ingredients on hand (preserved as-is)
      //
      const allergens = request.allergens_to_avoid || [];
      const startTime = Date.now();
      const debugMode = req.query.debug === "1" || (req.body as any).debug === true;
      const clientCurrentSig = (req.body as any).currentRecipeSignature || "";
      const clientRecentSigs = (req.body as any).recentSignatures || [];

      if (clientCurrentSig) {
        addSessionSignature(`${ipHash}:${sessionId}`, clientCurrentSig);
      }

      // ── PANTRY MODE: AI generation from ingredients on hand ─────────────────
      if (request.use_what_we_have) {
        const ptTemplates = await loadTemplates();
        const { candidates: ptCandidates } = filterTemplatesWithRelaxation(ptTemplates, request);
        const ptChosen = ptCandidates.length > 0 ? pickTemplate(ptCandidates, request.last_template_id) : null;
        const ptProtein = "pantry";
        const ptStructure = pickStructure(request.appliances, request.time_available, request.recent_meal_styles || [], request.prefer_different_style || false);
        const ptStyle = STRUCTURE_DISPLAY[ptStructure] || ptStructure;
        const ptVariety = getVarietyConstraints(request.cuisine_style);
        const ptAuditCtx: LabelAuditContext = {
          selectedAppliances: request.appliances || [],
          selectedAllergens: allergens,
          selectedHealthiness: request.healthiness_preference || "balanced",
          selectedBudget: request.budget_level || "standard",
          selectedCuisine: request.cuisine_style || "",
          selectedMealFormat: request.meal_format || "",
          selectedProtein: request.protein || "any",
          chosenProtein: ptProtein,
          crewSize: request.crew_size || 4,
        };
        const ptValCtx: RecipeValidationContext = {
          chosenProtein: ptProtein,
          meal_style: ptStyle,
          cuisine: request.cuisine_style || "any",
          appliances: request.appliances,
          allergens,
          recentSignatures: clientRecentSigs,
          currentRecipeSignature: clientCurrentSig || undefined,
        };

        let ptRecipe: GenerateResponse | null = null;
        try {
          if (ptChosen) {
            const ptAI = await generateRecipeFromPantry(ptChosen, request, ptVariety, ptStructure);
            ptRecipe = ptAI.recipe;
          }
        } catch (ptErr: any) {
          log(`[pantry] AI error: ${ptErr.message} — using safe fallback`, "ai");
        }

        const ptFinal = ptRecipe ?? buildSafeFallbackRecipe(request.meal_format || ptStyle, request.crew_size);
        const ptWithStyle = { ...ptFinal, meal_style: ptStyle };
        const ptVal = validateAndFixRecipe(ptWithStyle as any, ptValCtx);
        logUsage({ cacheKey: `pantry-${sessionId}`, templateId: 0, cacheHit: false, latencyMs: Date.now() - startTime, ipHash, sessionId });
        recordSignature(ptProtein, ptVal.signature);
        return sendRecipeResponse(res, ptVal, {}, debugMode, request.crew_size, request.meal_format || "random", allergens, ptAuditCtx, ipHash, sessionId, requestId);
      }

      // ── V2 MAIN PATH: Spoonacular as authoritative source ───────────────────
      const v2SessionKey = `${ipHash}:${sessionId}`;
      const v2Result = await runV2Generate(request, { sessionKey: v2SessionKey });
      const chosenProtein = v2Result?.protein ?? request.protein ?? "chicken";
      const v2CacheKey = buildCacheKey("v2", request, chosenProtein);

      const auditCtx: LabelAuditContext = {
        selectedAppliances: request.appliances || [],
        selectedAllergens: allergens,
        selectedHealthiness: request.healthiness_preference || "balanced",
        selectedBudget: request.budget_level || "standard",
        selectedCuisine: request.cuisine_style || "",
        selectedMealFormat: request.meal_format || "",
        selectedProtein: request.protein || "any",
        chosenProtein,
        crewSize: request.crew_size || 4,
      };

      if (v2Result) {
        const originalTitle = v2Result.originalTitle;
        const v2ValCtx: RecipeValidationContext = {
          chosenProtein,
          meal_style: v2Result.recipe.meal_style || "plated main",
          cuisine: request.cuisine_style || "any",
          appliances: request.appliances,
          allergens,
          recentSignatures: clientRecentSigs,
          currentRecipeSignature: clientCurrentSig || undefined,
        };

        let v2Val = validateAndFixRecipe(v2Result.recipe, v2ValCtx);

        // Restore original Spoonacular title — validator must not rename it
        if (v2Val.recipe.title !== originalTitle) {
          log(`[v2] Validator changed title — restoring "${originalTitle}"`, "v2");
          v2Val = { ...v2Val, recipe: { ...v2Val.recipe, title: originalTitle } };
        }

        setCachedRecipe(v2CacheKey, 0, v2Val.recipe);
        logUsage({ cacheKey: v2CacheKey, templateId: 0, cacheHit: false, latencyMs: Date.now() - startTime, ipHash, sessionId });
        log(`[v2] Served "${originalTitle}" in ${Date.now() - startTime}ms | source=spoonacular_v2`, "v2");
        log("[fallback] used=false", "fallback");
        recordSignature(chosenProtein, v2Val.signature);
        return sendRecipeResponse(res, v2Val, { _source: "spoonacular_v2", _spoonacular_title: originalTitle }, debugMode, request.crew_size, request.meal_format || "random", allergens, auditCtx, ipHash, sessionId, requestId);
      }

      // ── DETERMINISTIC FALLBACK: all Spoonacular candidates failed validation ──
      log("[v2] All Spoonacular candidates exhausted — running deterministic fallback", "v2");

      const fb = await runV2Fallback(request, "spoonacular_no_valid_candidate", clientRecentSigs);

      const fbAuditCtx: LabelAuditContext = { ...auditCtx, chosenProtein: fb.protein };
      const fbValCtx: RecipeValidationContext = {
        chosenProtein: fb.protein,
        meal_style: fb.structureDisplay,
        cuisine: request.cuisine_style || "any",
        appliances: request.appliances,
        allergens,
        recentSignatures: clientRecentSigs,
        currentRecipeSignature: clientCurrentSig || undefined,
      };

      const fbWithStyle = { ...fb.recipe, _fallback: true, meal_style: fb.structureDisplay };
      const fbVal = validateAndFixRecipe(fbWithStyle as any, fbValCtx);
      setCachedRecipe(v2CacheKey, 0, fbVal.recipe);
      logUsage({ cacheKey: v2CacheKey, templateId: 0, cacheHit: false, latencyMs: Date.now() - startTime, ipHash, sessionId });
      log(`[v2] Fallback served in ${Date.now() - startTime}ms | structure=${fb.structure} | protein=${fb.protein}`, "v2");
      recordSignature(fb.protein, fbVal.signature);
      return sendRecipeResponse(res, fbVal, { _fallback: true }, debugMode, request.crew_size, request.meal_format, allergens, fbAuditCtx, ipHash, sessionId, requestId);

    } catch (error: any) {
      cancelRequest(sessionKey, requestId);
      console.error("Generate error:", error);
      return res.status(500).json({ message: error.message || "Failed to generate recipe" });
    }
  });

  app.get("/api/csrf-token", (req: Request, res: Response) => {
    let token = req.cookies?.csrf_token;
    if (!token) {
      token = crypto.randomBytes(24).toString("hex");
      res.cookie("csrf_token", token, {
        httpOnly: false,
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000,
      });
    }
    return res.json({ token });
  });

  app.post("/api/email-recipe", async (req: Request, res: Response) => {
    try {
      const { email, recipe_title, primary_protein, ingredients, steps, pro_tips, macros, healthiness_level, crew_size, timestamp } = req.body;

      if (!email || !recipe_title) {
        return res.status(400).json({ message: "Email and recipe title are required." });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address." });
      }

      const klaviyo = validateKlaviyoConfig();
      if (!klaviyo.ok) {
        log(`Email blocked: ${klaviyo.error}`, "klaviyo");
        return res.status(503).json({ message: "Email service is not configured. Please contact the site owner." });
      }

      const results = await Promise.allSettled([
        subscribeToList(email),
        trackRecipeEvent(email, {
          recipe_title,
          primary_protein: primary_protein || "",
          healthiness_level: healthiness_level || "",
          crew_size: crew_size || 0,
          ingredients: ingredients || [],
          steps: steps || [],
          pro_tips: pro_tips || [],
          macros: macros || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
          generated_at: timestamp || new Date().toISOString(),
        }),
      ]);

      const subscribeFailed = results[0].status === "rejected";
      const eventFailed = results[1].status === "rejected";

      if (subscribeFailed) {
        const reason = (results[0] as PromiseRejectedResult).reason?.message || "Unknown error";
        log(`Subscribe failed for ${email}: ${reason}`, "klaviyo");
      }
      if (eventFailed) {
        const reason = (results[1] as PromiseRejectedResult).reason?.message || "Unknown error";
        log(`Event tracking failed for ${email}: ${reason}`, "klaviyo");
      }

      if (subscribeFailed && eventFailed) {
        const reason = (results[0] as PromiseRejectedResult).reason?.message || "Unknown error";
        if (reason.includes("KLAVIYO_API_KEY")) {
          return res.status(503).json({ message: "Email service is not configured. Please contact the site owner." });
        }
        return res.status(502).json({ message: `Email service error: ${reason}` });
      }

      if (subscribeFailed) {
        return res.status(207).json({ success: true, message: "Recipe tracked but subscription may not have completed. Check your inbox." });
      }

      return res.json({ success: true, message: "Recipe sent. Check your inbox." });
    } catch (error: any) {
      log(`Email recipe error: ${error.message}`, "klaviyo");
      return res.status(500).json({ message: `Failed to send recipe: ${error.message}` });
    }
  });

  app.post("/api/email-shopping-list", async (req: Request, res: Response) => {
    try {
      const { email, recipe_title, shopping_list_sections, generator_type, timestamp } = req.body;

      if (!email || !recipe_title) {
        return res.status(400).json({ message: "Email and recipe title are required." });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address." });
      }

      const klaviyo = validateKlaviyoConfig();
      if (!klaviyo.ok) {
        log(`Email blocked: ${klaviyo.error}`, "klaviyo");
        return res.status(503).json({ message: "Email service is not configured. Please contact the site owner." });
      }

      const results = await Promise.allSettled([
        subscribeToList(email),
        trackShoppingListEvent(email, {
          recipe_title,
          shopping_list_sections: shopping_list_sections || [],
          generator_type: generator_type || "meal",
          timestamp: timestamp || new Date().toISOString(),
        }),
      ]);

      const subscribeFailed = results[0].status === "rejected";
      const eventFailed = results[1].status === "rejected";

      if (subscribeFailed) {
        const reason = (results[0] as PromiseRejectedResult).reason?.message || "Unknown error";
        log(`Subscribe failed for ${email}: ${reason}`, "klaviyo");
      }
      if (eventFailed) {
        const reason = (results[1] as PromiseRejectedResult).reason?.message || "Unknown error";
        log(`Event tracking failed for ${email}: ${reason}`, "klaviyo");
      }

      if (subscribeFailed && eventFailed) {
        const reason = (results[0] as PromiseRejectedResult).reason?.message || "Unknown error";
        if (reason.includes("KLAVIYO_API_KEY")) {
          return res.status(503).json({ message: "Email service is not configured. Please contact the site owner." });
        }
        return res.status(502).json({ message: `Email service error: ${reason}` });
      }

      return res.json({ success: true, message: "Shopping list sent. Check your inbox." });
    } catch (error: any) {
      log(`Email shopping list error: ${error.message}`, "klaviyo");
      return res.status(500).json({ message: `Failed to send shopping list: ${error.message}` });
    }
  });

  app.post("/api/generate-pizza", async (req: Request, res: Response) => {
    try {
      const ua = req.headers["user-agent"] || "";
      if (isBot(ua)) {
        return res.status(403).json({ message: "Automated requests are not allowed." });
      }

      const csrfCookie = req.cookies?.csrf_token;
      const csrfHeader = req.headers["x-csrf-token"] as string;
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return res.status(403).json({ message: "Invalid security token. Please refresh the page and try again." });
      }

      const sessionId = (req as any)._sessionId || "unknown";
      const clientIp = getClientIp(req);
      const ipHash = hashIp(clientIp);

      const burstCheck = checkRateLimit(`burst:${ipHash}`, 60_000, 3);
      if (!burstCheck.allowed) {
        return res.status(429).json({
          message: "Slow down! Maximum 3 recipes per minute. Please wait a moment.",
          retry_after_seconds: 60,
        });
      }

      const hourlyCheck = checkRateLimit(`hourly:${ipHash}`, 3_600_000, 10);
      if (!hourlyCheck.allowed) {
        return res.status(429).json({
          message: `Hourly limit reached (10 recipes/hour). Try again later.`,
          retry_after_seconds: 3600,
        });
      }

      const sessionBurst = checkRateLimit(`burst:session:${sessionId}`, 60_000, 3);
      if (!sessionBurst.allowed) {
        return res.status(429).json({ message: "Slow down! Maximum 3 recipes per minute.", retry_after_seconds: 60 });
      }

      const sessionHourly = checkRateLimit(`hourly:session:${sessionId}`, 3_600_000, 10);
      if (!sessionHourly.allowed) {
        return res.status(429).json({ message: "Hourly limit reached (10 recipes/hour). Try again later.", retry_after_seconds: 3600 });
      }

      const parsed = pizzaRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: " + parsed.error.message });
      }

      const request = parsed.data;
      const conceptId = pickPizzaConcept(request.allergens_to_avoid, request.last_pizza_style_id);
      const cacheKey = buildPizzaCacheKey(conceptId, request);
      const startTime = Date.now();

      const cached = getCachedPizzaRecipe(cacheKey);
      if (cached) {
        log(`Pizza cache HIT for key ${cacheKey} (concept: ${conceptId})`, "cache");
        logUsage({
          cacheKey,
          templateId: 0,
          cacheHit: true,
          latencyMs: Date.now() - startTime,
          ipHash,
          sessionId,
        });
        return res.json(cached);
      }

      const dailyBudget = parseFloat(process.env.DAILY_LLM_BUDGET_USD || "5.00");
      const currentSpend = getDailySpend();

      if (currentSpend >= dailyBudget) {
        log(`Budget exceeded: $${currentSpend.toFixed(4)} / $${dailyBudget.toFixed(2)}`, "budget");
        return res.status(503).json({
          message: "Daily recipe generation limit reached. Please try again tomorrow.",
          budget_exceeded: true,
        });
      }

      const { recipe, tokensIn, tokensOut } = await generatePizzaRecipe(request, conceptId);

      const estimatedCost =
        (tokensIn / 1000) * COST_PER_1K_INPUT +
        (tokensOut / 1000) * COST_PER_1K_OUTPUT;

      setCachedPizzaRecipe(cacheKey, recipe);

      logUsage({
        cacheKey,
        templateId: 0,
        cacheHit: false,
        tokensIn,
        tokensOut,
        estimatedCost,
        latencyMs: Date.now() - startTime,
        ipHash,
        sessionId,
      });

      log(`Pizza generated in ${Date.now() - startTime}ms | ${tokensIn}in/${tokensOut}out | ~$${estimatedCost.toFixed(5)}`, "perf");

      return res.json(recipe);
    } catch (error: any) {
      console.error("Pizza generate error:", error);
      return res.status(500).json({ message: error.message || "Failed to generate pizza recipe" });
    }
  });

  app.post("/api/hall-vote", async (req: Request, res: Response) => {
    try {
      const csrfCookie = req.cookies?.csrf_token;
      const csrfHeader = req.headers["x-csrf-token"] as string;
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return res.status(403).json({ message: "Invalid security token. Please refresh the page." });
      }

      const sessionId = (req as any)._sessionId || "unknown";
      const clientIp = getClientIp(req);
      const ipHash = hashIp(clientIp);

      const voteLimit = checkRateLimit(`hallvote:${ipHash}`, 60_000, 2);
      if (!voteLimit.allowed) {
        return res.status(429).json({ message: "Please wait before creating another vote.", retry_after_seconds: 60 });
      }

      const parsed = hallVoteCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: " + parsed.error.message });
      }

      const { title, options } = parsed.data;

      const { voteId } = createHallVote(title, options, sessionId);

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["host"] || "localhost:5000";
      const shareUrl = `${protocol}://${host}/vote/${voteId}`;

      return res.json({ vote_id: voteId, share_url: shareUrl });
    } catch (error: any) {
      console.error("Hall vote create error:", error);
      return res.status(500).json({ message: "Failed to create vote" });
    }
  });

  app.get("/api/hall-vote/:voteId", (req: Request, res: Response) => {
    try {
      const { voteId } = req.params;
      const sessionId = (req as any)._sessionId || "";
      const clientIp = getClientIp(req);
      const ua = req.headers["user-agent"] || "";
      const fingerprint = hashVoterFingerprint(clientIp, ua);

      const vote = getHallVote(voteId, sessionId, fingerprint);
      if (!vote) {
        return res.status(404).json({ message: "Vote not found" });
      }

      return res.json(vote);
    } catch (error: any) {
      console.error("Hall vote get error:", error);
      return res.status(500).json({ message: "Failed to get vote" });
    }
  });

  app.post("/api/hall-vote/:voteId/vote", (req: Request, res: Response) => {
    try {
      const { voteId } = req.params;
      const { optionId } = req.body;

      if (typeof optionId !== "number") {
        return res.status(400).json({ message: "optionId is required" });
      }

      const clientIp = getClientIp(req);
      const ipHash = hashIp(clientIp);
      const voteRateLimit = checkRateLimit(`vote:${ipHash}`, 60_000, 10);
      if (!voteRateLimit.allowed) {
        return res.status(429).json({ message: "Too many vote attempts. Please wait." });
      }

      const ua = req.headers["user-agent"] || "";
      const fingerprint = hashVoterFingerprint(clientIp, ua);

      const result = castBallot(voteId, optionId, fingerprint);
      if (!result.success) {
        const statusCode = result.error === "You already voted" ? 409 : 400;
        return res.status(statusCode).json({ message: result.error });
      }

      const sessionId = (req as any)._sessionId || "";
      const updatedVote = getHallVote(voteId, sessionId, fingerprint);
      return res.json(updatedVote);
    } catch (error: any) {
      console.error("Hall vote cast error:", error);
      return res.status(500).json({ message: "Failed to cast vote" });
    }
  });

  app.post("/api/hall-vote/:voteId/close", (req: Request, res: Response) => {
    try {
      const csrfCookie = req.cookies?.csrf_token;
      const csrfHeader = req.headers["x-csrf-token"] as string;
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return res.status(403).json({ message: "Invalid security token. Please refresh the page." });
      }

      const { voteId } = req.params;
      const sessionId = (req as any)._sessionId || "";

      const result = closeHallVote(voteId, sessionId);
      if (!result.success) {
        return res.status(403).json({ message: result.error });
      }

      const clientIp = getClientIp(req);
      const ua = req.headers["user-agent"] || "";
      const fingerprint = hashVoterFingerprint(clientIp, ua);
      const updatedVote = getHallVote(voteId, sessionId, fingerprint);
      return res.json(updatedVote);
    } catch (error: any) {
      console.error("Hall vote close error:", error);
      return res.status(500).json({ message: "Failed to close vote" });
    }
  });

  app.get("/health", (_req: Request, res: Response) => {
    return res.json({ status: "ok", uptime: process.uptime() });
  });

  app.get("/api/favourites", (req: Request, res: Response) => {
    const userId = (req as any)._sessionId || "unknown";
    const faves = getFavourites(userId);
    return res.json({ favourites: faves });
  });

  app.post("/api/favourites", (req: Request, res: Response) => {
    const userId = (req as any)._sessionId || "unknown";
    const { recipeId } = req.body;

    if (!recipeId || typeof recipeId !== "string") {
      return res.status(400).json({ message: "recipeId (string) is required." });
    }

    const updated = addFavourite(userId, recipeId);
    return res.json({ favourites: updated });
  });

  app.delete("/api/favourites/:recipeId", (req: Request, res: Response) => {
    const userId = (req as any)._sessionId || "unknown";
    const { recipeId } = req.params;
    const updated = removeFavourite(userId, recipeId);
    return res.json({ favourites: updated });
  });

  app.get("/api/admin/usage", (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_SECRET;
    const providedKey = req.headers["x-admin-key"] || req.query.key;

    if (adminKey && providedKey !== adminKey) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const stats = getUsageStats();
    const cacheCount = getCacheCount();
    const dailyBudget = parseFloat(process.env.DAILY_LLM_BUDGET_USD || "5.00");
    const currentSpend = getDailySpend();

    return res.json({
      budget: {
        daily_limit_usd: dailyBudget,
        spent_today_usd: currentSpend,
        remaining_usd: Math.max(0, dailyBudget - currentSpend),
        budget_exceeded: currentSpend >= dailyBudget,
      },
      cacheInfo: {
        total_recipes_cached: cacheCount,
        total_cache_hits: stats.cache.totalHits,
      },
      pool: {
        size: getPoolSize(),
      },
      today: stats.today,
      last7Days: stats.last7Days,
      recentLogs: stats.recentLogs,
      topIps: stats.topIps,
      topSessions: stats.topSessions,
    });
  });

  app.get("/api/test-spoonacular", async (_req: Request, res: Response) => {
    try {
      const apiKey = process.env.SPOONACULAR_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: "SPOONACULAR_API_KEY is not set" });
      }
      const url = `https://api.spoonacular.com/recipes/complexSearch?query=chicken&number=3&apiKey=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      return res.json({ status: response.status, data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  const discoverSeenIds: number[] = [];
  const DISCOVER_MEMORY_SIZE = 30;

  function addToDiscoverMemory(ids: number[]) {
    for (const id of ids) {
      if (!discoverSeenIds.includes(id)) {
        discoverSeenIds.push(id);
        if (discoverSeenIds.length > DISCOVER_MEMORY_SIZE) {
          discoverSeenIds.shift();
        }
      }
    }
  }

  app.get("/api/explore/trending", async (_req: Request, res: Response) => {
    try {
      const cachedRecipes = getTopCachedRecipes(30);
      const votedNames = getVotedRecipeNames();
      const favCounts = getAllFavouriteIds();

      interface TrendingItem {
        title: string;
        protein: string;
        score: number;
        source: string;
        hit_count: number;
      }

      const titleMap = new Map<string, TrendingItem>();

      for (const cr of cachedRecipes) {
        const key = cr.title.toLowerCase().replace(/[^a-z]/g, "").substring(0, 40);
        const existing = titleMap.get(key);
        const score = cr.hit_count * 2;
        if (!existing || score > existing.score) {
          titleMap.set(key, {
            title: cr.title.replace(/\s*\(.*?\)\s*$/, "").replace(/\s*—.*$/, "").trim(),
            protein: cr.chosen_protein,
            score,
            source: "generated",
            hit_count: cr.hit_count,
          });
        }
      }

      for (const voted of votedNames) {
        const key = voted.name.toLowerCase().replace(/[^a-z]/g, "").substring(0, 40);
        const existing = titleMap.get(key);
        const voteBonus = voted.votes * 3;
        if (existing) {
          existing.score += voteBonus;
          existing.source = "voted";
        } else {
          titleMap.set(key, {
            title: voted.name,
            protein: "",
            score: voteBonus,
            source: "voted",
            hit_count: 0,
          });
        }
      }

      for (const [recipeId, count] of Array.from(favCounts.entries())) {
        for (const cr of cachedRecipes) {
          try {
            const parsed = JSON.parse(cr.recipe_json);
            if (parsed._id === recipeId) {
              const key = cr.title.toLowerCase().replace(/[^a-z]/g, "").substring(0, 40);
              const existing = titleMap.get(key);
              if (existing) {
                existing.score += count * 5;
                existing.source = "favorited";
              }
              break;
            }
          } catch {}
        }
      }

      const sorted = Array.from(titleMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);

      const { resolveCuratedSlugFromTitle, getCuratedPackageDef } = await import("../shared/curated-hall-packages.js");
      const trending = sorted.map(item => {
        const curatedSlug = resolveCuratedSlugFromTitle(item.title);
        const pkg = curatedSlug ? getCuratedPackageDef(curatedSlug) : undefined;
        return {
          title: item.title,
          protein: item.protein,
          score: item.score,
          source: item.source,
          hit_count: item.hit_count,
          curatedSlug: curatedSlug || null,
          image: pkg?.heroImage || "",
          emoji: pkg?.emoji || "🔥",
        };
      });

      log(`[explore] Trending: ${trending.length} items`, "spoonacular");
      return res.json({ trending });
    } catch (err: any) {
      log(`[explore] Trending error: ${err.message}`, "spoonacular");
      return res.json({ trending: [] });
    }
  });

  app.get("/api/explore/discover", async (req: Request, res: Response) => {
    try {
      const diet = (req.query.diet as string) || "";
      const intolerances = (req.query.intolerances as string) || "";
      const excludeIngredients = (req.query.excludeIngredients as string) || "";
      const seenParam = (req.query.seen as string) || "";
      const limitParam = parseInt(req.query.limit as string) || 12;
      const limit = Math.min(Math.max(limitParam, 4), 20);
      const seenIds = new Set([
        ...discoverSeenIds,
        ...seenParam.split(",").map(s => parseInt(s)).filter(Number.isFinite),
      ]);

      const safetyFilters: Record<string, string> = {};
      if (diet) safetyFilters.diet = diet;
      if (intolerances) safetyFilters.intolerances = intolerances;
      if (excludeIngredients) safetyFilters.excludeIngredients = excludeIngredients;

      const pools: { name: string; queries: { q: string; cuisine?: string }[] }[] = [
        {
          name: "chicken",
          queries: [
            { q: "chicken dinner" },
            { q: "chicken bowl", cuisine: "mediterranean,greek" },
            { q: "chicken stir fry", cuisine: "chinese,thai,korean" },
            { q: "grilled chicken" },
            { q: "chicken sheet pan" },
          ],
        },
        {
          name: "beef",
          queries: [
            { q: "beef dinner" },
            { q: "beef stew" },
            { q: "burger" },
            { q: "steak dinner" },
            { q: "beef tacos", cuisine: "mexican" },
          ],
        },
        {
          name: "pork",
          queries: [
            { q: "pork dinner" },
            { q: "pork chops" },
            { q: "bbq pork" },
            { q: "pulled pork" },
            { q: "pork tenderloin" },
          ],
        },
        {
          name: "vegetarian",
          queries: [
            { q: "vegetarian dinner" },
            { q: "vegetable stir fry" },
            { q: "vegetarian pasta", cuisine: "italian" },
            { q: "bean bowl", cuisine: "mexican" },
            { q: "tofu dinner" },
          ],
        },
        {
          name: "comfort",
          queries: [
            { q: "comfort food dinner" },
            { q: "mac and cheese" },
            { q: "casserole" },
            { q: "one pot meal" },
            { q: "slow cooker dinner" },
          ],
        },
        {
          name: "healthy",
          queries: [
            { q: "high protein meal" },
            { q: "healthy dinner" },
            { q: "lean protein meal" },
            { q: "quinoa bowl" },
            { q: "grilled fish" },
          ],
        },
        {
          name: "international",
          queries: [
            { q: "cajun dinner", cuisine: "cajun" },
            { q: "tacos", cuisine: "mexican" },
            { q: "pasta", cuisine: "italian" },
            { q: "curry", cuisine: "indian,thai" },
            { q: "mediterranean bowl", cuisine: "mediterranean,greek" },
            { q: "korean dinner", cuisine: "korean" },
            { q: "japanese dinner", cuisine: "japanese" },
          ],
        },
      ];

      const poolResults = new Map<string, any[]>();

      const poolEntries = pools.map(pool => ({
        pool,
        query: pool.queries[Math.floor(Math.random() * pool.queries.length)],
      }));

      const batch1 = poolEntries.slice(0, 4);
      const batch2 = poolEntries.slice(4);

      const fetchBatch = async (entries: typeof poolEntries) => {
        await Promise.all(entries.map(({ pool, query }) =>
          searchRecipes(query.q, {
            cuisine: query.cuisine || undefined,
            number: 6,
            sort: "random",
            ...safetyFilters,
          })
            .then(result => {
              const cleaned = result.results
                .filter((r: any) => !seenIds.has(r.id))
                .filter((r: { id: number; title?: string }) => Number.isFinite(r.id) && r.id > 0 && !!r.title?.trim())
                .map((r: any) => ({
                  id: r.id,
                  title: r.title,
                  image: r.image || "",
                  readyInMinutes: r.readyInMinutes || 0,
                  servings: r.servings || 0,
                  sourceUrl: r.sourceUrl || "",
                  summary: (r.summary || "").replace(/<[^>]*>/g, "").substring(0, 200),
                  cuisines: r.cuisines || [],
                  diets: r.diets || [],
                  _pool: pool.name,
                }));
              poolResults.set(pool.name, cleaned);
            })
            .catch(() => {
              poolResults.set(pool.name, []);
            })
        ));
      };

      await fetchBatch(batch1);
      await new Promise(resolve => setTimeout(resolve, 1100));
      await fetchBatch(batch2);

      const diverse: any[] = [];
      const seenTitles = new Set<string>();
      const usedTitleWords = new Map<string, number>();

      const pickFromPool = (poolName: string, count: number) => {
        const candidates = poolResults.get(poolName) || [];
        const shuffledCandidates = [...candidates].sort(() => Math.random() - 0.5);
        let picked = 0;
        for (const r of shuffledCandidates) {
          if (picked >= count) break;
          const titleKey = r.title.toLowerCase().replace(/[^a-z]/g, "");
          if (seenTitles.has(titleKey)) continue;
          const titleWords = r.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
          const wordOverlap = titleWords.reduce((sum: number, w: string) => sum + (usedTitleWords.get(w) || 0), 0);
          if (wordOverlap > 2 && shuffledCandidates.length > picked + 1) continue;
          seenTitles.add(titleKey);
          for (const w of titleWords) {
            usedTitleWords.set(w, (usedTitleWords.get(w) || 0) + 1);
          }
          diverse.push(r);
          picked++;
        }
      };

      const poolOrder = pools.map(p => p.name).sort(() => Math.random() - 0.5);
      const firstPassPick = Math.max(1, Math.ceil(limit / pools.length));
      for (const poolName of poolOrder) {
        if (diverse.length >= limit) break;
        pickFromPool(poolName, firstPassPick);
      }

      for (const poolName of poolOrder) {
        if (diverse.length >= limit) break;
        pickFromPool(poolName, 3);
      }

      const trimmed = diverse
        .filter((r: { id: number; title?: string }) => Number.isFinite(r.id) && r.id > 0 && !!r.title?.trim())
        .slice(0, limit);
      trimmed.sort(() => Math.random() - 0.5);

      addToDiscoverMemory(trimmed.map((r: { id: number }) => r.id));

      log(`[explore] Discover feed: ${trimmed.length}/${limit} diverse recipes from ${pools.length} pools | memory=${discoverSeenIds.length}`, "spoonacular");
      return res.json({
        results: trimmed,
        totalResults: trimmed.length,
        _source: "spoonacular",
        _discover: true,
      });
    } catch (err: any) {
      const msg = err.message || "Discover failed";
      if (msg.includes("SPOONACULAR_API_KEY is not configured")) {
        return res.status(503).json({ message: "Recipe search is not configured. SPOONACULAR_API_KEY is missing." });
      }
      log(`[spoonacular] Discover error: ${msg}`, "spoonacular");
      return res.status(500).json({ message: "Recipe discovery failed. Please try again." });
    }
  });

  app.get("/api/explore/search", async (req: Request, res: Response) => {
    try {
      const query = (req.query.q as string) || "";
      const cuisine = (req.query.cuisine as string) || "";
      const diet = (req.query.diet as string) || "";
      const type = (req.query.type as string) || "";
      const intolerances = (req.query.intolerances as string) || "";
      const excludeIngredients = (req.query.excludeIngredients as string) || "";
      const includeIngredients = (req.query.includeIngredients as string) || "";
      const equipment = (req.query.equipment as string) || "";
      const rawMaxReadyTime = parseInt(req.query.maxReadyTime as string);
      const maxReadyTime = Number.isFinite(rawMaxReadyTime) && rawMaxReadyTime > 0 ? Math.min(rawMaxReadyTime, 480) : undefined;
      const rawNumber = parseInt((req.query.number as string) || "15");
      const number = Number.isFinite(rawNumber) && rawNumber > 0 ? Math.min(rawNumber, 20) : 15;
      const rawOffset = parseInt((req.query.offset as string) || "0");
      const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
      const rawMinServings = parseInt(req.query.minServings as string);
      const minServings = Number.isFinite(rawMinServings) && rawMinServings > 0 ? rawMinServings : undefined;
      const rawMaxServings = parseInt(req.query.maxServings as string);
      const maxServings = Number.isFinite(rawMaxServings) && rawMaxServings > 0 ? rawMaxServings : undefined;
      const sort = (req.query.sort as string) || "";
      const baseQuery = (req.query._baseQuery as string) || "";

      if (!query.trim()) {
        const results = await getRandomRecipes(cuisine || undefined, number);
        log(`[explore] Random recipes returned ${results.length} results | source=spoonacular`, "spoonacular");
        return res.json({
          results: results
            .filter(r => Number.isFinite(r.id) && r.id > 0)
            .map(r => ({
            id: r.id,
            title: r.title,
            image: r.image,
            readyInMinutes: r.readyInMinutes,
            servings: r.servings,
            sourceUrl: r.sourceUrl || "",
            summary: (r.summary || "").replace(/<[^>]*>/g, "").substring(0, 200),
            cuisines: r.cuisines || [],
            diets: r.diets || [],
          })),
          totalResults: results.length,
          _source: "spoonacular",
        });
      }

      const safetyFilters = { intolerances, excludeIngredients, diet };

      const relaxationSteps: { label: string; opts: SearchOptions; q: string }[] = [
        {
          label: "original",
          q: query,
          opts: { cuisine, type, maxReadyTime, number, offset, includeIngredients, equipment, minServings, maxServings, sort, ...safetyFilters },
        },
        {
          label: "relax-cuisine",
          q: query,
          opts: { type, maxReadyTime, number, offset, includeIngredients, equipment, minServings, maxServings, sort, ...safetyFilters },
        },
        {
          label: "relax-meal-style",
          q: baseQuery || "dinner",
          opts: { maxReadyTime, number, offset, includeIngredients, equipment, minServings, maxServings, sort, ...safetyFilters },
        },
        {
          label: "relax-time",
          q: baseQuery || "dinner",
          opts: { number, offset, includeIngredients, equipment, sort, ...safetyFilters },
        },
      ];

      for (const step of relaxationSteps) {
        const searchResults = await searchRecipes(step.q, step.opts);
        if (searchResults.results.length > 0) {
          if (step.label !== "original") {
            log(`[explore] Relaxation "${step.label}" found ${searchResults.results.length} results (query="${step.q}") | source=spoonacular`, "spoonacular");
          } else {
            log(`[explore] Original search found ${searchResults.results.length} results | source=spoonacular`, "spoonacular");
          }
          return res.json({
            results: searchResults.results
              .filter(r => Number.isFinite(r.id) && r.id > 0)
              .map(r => ({
              id: r.id,
              title: r.title,
              image: r.image,
              readyInMinutes: r.readyInMinutes,
              servings: r.servings,
              sourceUrl: r.sourceUrl || "",
              summary: (r.summary || "").replace(/<[^>]*>/g, "").substring(0, 200),
            })),
            totalResults: searchResults.totalResults,
            _source: "spoonacular",
            _relaxed: step.label !== "original" ? step.label : undefined,
          });
        }
        if (step.label !== relaxationSteps[relaxationSteps.length - 1].label) {
          log(`[explore] Step "${step.label}" returned 0 results — relaxing next filter`, "spoonacular");
        }
      }

      log(`[explore] All Spoonacular relaxation steps exhausted — falling back to Firehall generator`, "spoonacular");
      try {
        const rawCrewParam = parseInt(req.query._crewSize as string);
        const crewSize = Number.isFinite(rawCrewParam) && rawCrewParam >= 2 ? rawCrewParam : 6;
        const allergenList = [
          ...(intolerances || "").split(",").map(a => a.trim().toLowerCase()).filter(Boolean),
          ...(excludeIngredients || "").split(",").map(a => a.trim().toLowerCase()).filter(Boolean),
        ];
        const isVegetarian = diet === "vegetarian";
        let detectedProtein = "chicken";
        if (isVegetarian) {
          detectedProtein = "vegetarian";
        } else {
          const queryLower = query.toLowerCase();
          for (const p of ["chicken", "beef", "pork", "turkey", "fish", "seafood"]) {
            if (queryLower.includes(p)) { detectedProtein = p; break; }
          }
        }

        const equipList = (equipment || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
        const applianceMap: Record<string, string> = { oven: "oven", stove: "stove", "slow cooker": "slow cooker", grill: "grill", "rice cooker": "rice cooker" };
        const appliances = equipList.map(e => applianceMap[e]).filter(Boolean);
        if (appliances.length === 0) appliances.push("stove", "oven");

        const fallbackRequest: GenerateRequest = {
          crew_size: crewSize,
          busy_level: "average",
          time_available: maxReadyTime && maxReadyTime <= 25 ? "15-25" : maxReadyTime && maxReadyTime <= 40 ? "25-40" : "30-45",
          appliances,
          protein: detectedProtein as any,
          healthiness_preference: "balanced",
          budget_level: "standard",
          allergens_to_avoid: allergenList,
          vegetarian_swap_needed: false,
          use_what_we_have: false,
          ingredients_on_hand: [],
          cuisine_style: "any",
          meal_format: "random",
        };

        const templates = await loadTemplates();
        const filterResult = filterTemplatesWithRelaxation(templates, fallbackRequest);
        if (filterResult.candidates.length === 0) {
          log(`[explore] Firehall fallback: no matching templates`, "spoonacular");
          return res.json({ results: [], totalResults: 0, _source: "none" });
        }
        const template = pickTemplate(filterResult.candidates);
        const protein = chooseProtein(template, fallbackRequest.protein, fallbackRequest.healthiness_preference);
        const fallback = buildFallbackRecipe(template, fallbackRequest, protein);

        const fbResult = {
          id: -1,
          title: fallback.title,
          image: "",
          readyInMinutes: (fallback.timing?.total_min) || 30,
          servings: crewSize,
          summary: fallback.why_it_fits_tonight || "AI-generated crew meal from the Firehall generator.",
          _firehallFallback: true,
        };

        log(`[explore] Firehall fallback served: "${fallback.title}" for crew of ${crewSize} | source=firehall`, "spoonacular");
        return res.json({
          results: [fbResult],
          totalResults: 1,
          _source: "firehall",
        });
      } catch (fbErr: any) {
        log(`[explore] Firehall fallback failed: ${fbErr.message}`, "spoonacular");
        return res.json({ results: [], totalResults: 0, _source: "none" });
      }
    } catch (err: any) {
      const msg = err.message || "Search failed";
      if (msg.includes("SPOONACULAR_API_KEY is not configured")) {
        return res.status(503).json({ message: "Recipe search is not configured. SPOONACULAR_API_KEY is missing." });
      }
      log(`[spoonacular] Search error: ${msg}`, "spoonacular");
      return res.status(500).json({ message: "Recipe search failed. Please try again." });
    }
  });

  app.get("/api/curated/:slug", async (req: Request, res: Response) => {
    try {
      const { getCuratedPackageDef, buildCuratedClientRecipe } = await import("../shared/curated-hall-packages.js");
      const slug = (req.params.slug || "").toLowerCase().trim();
      const def = getCuratedPackageDef(slug);
      if (!def) {
        return res.status(404).json({ message: "Curated package not found." });
      }
      const rawCrew = parseInt(req.query.crewSize as string, 10);
      const crewSize = Number.isFinite(rawCrew) && rawCrew >= 2 && rawCrew <= 20 ? rawCrew : 6;
      const recipe = buildCuratedClientRecipe(def, crewSize);
      return res.json({
        slug: def.slug,
        title: def.title,
        displayTitle: def.displayTitle,
        emoji: def.emoji,
        heroImage: def.heroImage,
        externalUrl: def.externalUrl,
        tagline: def.tagline,
        crewLine: def.crewLine,
        curated: true,
        recipe,
      });
    } catch (err: any) {
      log(`[curated] Error: ${err.message}`, "api");
      return res.status(500).json({ message: "Failed to load curated package." });
    }
  });

  app.get("/api/explore/recipe/:id", async (req: Request, res: Response) => {
    const rawId = req.params.id;
    const id = parseInt(rawId, 10);
    log(`[explore] Detail click: rawId=${rawId} parsedId=${id}`, "spoonacular");

    try {
      if (!Number.isFinite(id) || id <= 0) {
        log(`[explore] Detail rejected: invalid id="${rawId}"`, "spoonacular");
        return res.status(400).json({ message: "Invalid recipe ID. Please pick another recipe from the list." });
      }

      const includeNutrition = req.query.nutrition === "true";
      const detail = await getRecipeById(id, includeNutrition);

      const nutrients = detail.nutrition?.nutrients || [];
      const findNutrient = (name: string) => nutrients.find(n => n.name.toLowerCase() === name.toLowerCase())?.amount || 0;

      let steps = detail.analyzedInstructions?.[0]?.steps || [];
      if (steps.length === 0 && detail.instructions) {
        const plain = detail.instructions.replace(/<[^>]*>/g, "").trim();
        if (plain) {
          steps = plain
            .split(/\.\s+/)
            .filter(Boolean)
            .map((sentence, i) => ({ number: i + 1, step: sentence.trim() }));
        }
      }

      const payload = {
        id: detail.id,
        title: detail.title,
        image: detail.image,
        readyInMinutes: detail.readyInMinutes,
        servings: detail.servings,
        sourceUrl: detail.sourceUrl,
        summary: (detail.summary || "").replace(/<[^>]*>/g, ""),
        cuisines: detail.cuisines || [],
        diets: detail.diets || [],
        dishTypes: detail.dishTypes || [],
        ingredients: (detail.extendedIngredients || []).map(ing => ({
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          original: ing.original || `${ing.amount} ${ing.unit} ${ing.name}`.trim(),
        })),
        steps: steps.map(s => ({
          number: s.number,
          step: s.step,
        })),
        macros: {
          calories: Math.round(findNutrient("Calories")),
          protein_g: Math.round(findNutrient("Protein")),
          carbs_g: Math.round(findNutrient("Carbohydrates")),
          fat_g: Math.round(findNutrient("Fat")),
        },
      };

      log(
        `[explore] Detail OK: id=${id} title="${payload.title}" ingredients=${payload.ingredients.length} steps=${payload.steps.length}`,
        "spoonacular",
      );
      return res.json(payload);
    } catch (err: any) {
      const msg = err.message || "Fetch failed";
      if (msg.includes("SPOONACULAR_API_KEY is not configured")) {
        return res.status(503).json({ message: "Recipe search is not configured. SPOONACULAR_API_KEY is missing." });
      }
      if (msg.includes("Invalid Spoonacular recipe id")) {
        return res.status(400).json({ message: "Invalid recipe ID. Please pick another recipe from the list." });
      }
      log(`[explore] Detail error: id=${rawId} msg=${msg}`, "spoonacular");
      return res.status(500).json({ message: "Failed to load recipe details. Please try again." });
    }
  });

  return httpServer;
}
