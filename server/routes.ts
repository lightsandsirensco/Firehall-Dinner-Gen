import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import {
  generateRequestSchema,
  pizzaRequestSchema,
  hallVoteCreateSchema,
  emailRecipeSchema,
  emailShoppingListSchema,
  type GenerateRequest,
  type GenerateResponse,
  type ClientRecipeResponse,
  type ClientIngredient,
  type ClientStep,
  type ClientProteinSafety,
  type ClientPlating,
  type ClientTiming,
} from "@shared/schema";
import { inferBusyLevelFromTime } from "@shared/busy-level";
import { createDefaultGenerateRequest } from "@shared/generate-request-defaults";
import { buildMinimalGenerateResponse } from "@shared/minimal-generate-response";
import type { VoteOptionInput } from "@shared/schema";
import { loadTemplates, filterTemplates, filterTemplatesWithRelaxation, pickTemplate, chooseProtein } from "./templates";
import { scanRecipeForAllergens, autoSubstituteAllergens, substituteTextForAllergens, buildAllergenAvoidList } from "./allergens";
import { auditAndFixRecipe as labelAudit, inferIngredientCategory, type LabelAuditContext } from "./labelAudit";
import { auditCrewScale, type CrewScaleAuditResult } from "./crew-scale-audit";
import { generateRecipe, generateRecipeFromPantry, repairRecipe, buildSafeFallbackRecipe } from "./ai";
import { getVarietyConstraints, recordRecipe } from "./variety-memory";
import { generatePizzaRecipe } from "./pizza-ai";
import { pickPizzaConcept, getFeaturedPizzaIds } from "./pizza-variety";
import { PIZZA_CONCEPT_REGISTRY } from "../shared/pizza-concepts.js";
import { buildPizzaTemplate } from "./pizza-templates.js";
import { finalizePizzaRecipe } from "./pizza-finalize.js";
import { subscribeToList, trackRecipeEvent, trackShoppingListEvent, validateKlaviyoConfig } from "./klaviyo";
import { getFromPool, refillPool, getPoolSize } from "./recipe-pool";
import {
  initHallVoteTables,
  createHallVote,
  getHallVote,
  castBallot,
  closeHallVote,
  hashVoterFingerprint,
} from "./hall-vote-store";

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
import { addFavourite, getFavourites, removeFavourite, getAllFavouriteIds } from "./favourites";
import { getTopCachedRecipes, getVotedRecipeNames } from "./cache-store";
import { buildFallbackRecipe } from "./fallback-recipe";
import { searchRecipes, getRecipeById, getRandomRecipes, type SearchOptions } from "./spoonacular";
import {
  normalizeExploreRecipeCard,
  normalizeExploreRecipeList,
  filterDisplayableExploreCards,
} from "../shared/explore-recipe.js";
import { buildExploreEditorialFeed } from "./explore-editorial.js";
import {
  buildContextualSuggestions,
  parseSeenIds,
  parseRecentProteins,
  getMasterCategoryRailMeta,
} from "./recommendation/index.js";
import { auditGolden100Dataset } from "./golden-100/audit.js";
import { golden100HeroAvailable, golden100HeroUrl } from "./golden-100/local-hero.js";
import {
  goldenManifestSummary,
  GOLDEN_100_RECIPES,
  validateGoldenManifest,
} from "../shared/golden-100/index.js";
import { listCuratedSummariesByTag } from "./curated-recipe-store.js";
import { scoreRecipeTitle } from "../shared/recipe-title-quality.js";
import { normalizeTitleKey } from "../shared/ingestion/dedupe.js";
import { buildGoldenHeroPrompt } from "../shared/golden-100/imagery.js";
import { readGoldenRecipePage, listGoldenPageSlugs } from "./golden-100/page-store.js";
import { buildGoldenRecipePage } from "./golden-100/recipe-page-builder.js";
import { getGoldenRecipeBySlug } from "../shared/golden-100/manifest.js";
import { checkGoldenPageAssets } from "./golden-100/page-assets.js";
import { validateGoldenRecipePage } from "./golden-100/recipe-page-validator.js";
import fs from "node:fs";
import path from "node:path";
import { GOLDEN_CATALOG_PUBLIC_DIR } from "./golden-100/page-store.js";
import { fetchExploreRecipeDetailPayload } from "./explore-recipe-detail.js";
import {
  parseGenerationRateContext,
  enforceUserGenerationRateLimits,
  recordUserGenerationRateLimit,
  enforcePizzaGenerationRateLimits,
  recordPizzaGenerationRateLimit,
} from "./generation-rate-limit.js";
import { generationTimeoutMs, pizzaTimeoutMs, withTimeout } from "./generation-timeout.js";
import {
  runLocalFirstGeneratePipeline,
  resolveEmergencyGenerateHit,
} from "./generation/local-first-pipeline.js";
import { logGenerateTelemetry } from "./generation/generation-telemetry.js";
import { resolveSafeCuratedFallback } from "./generation/safe-curated-fallback.js";
import { runRealismFirewall } from "./generation/realism-firewall.js";
import {
  prepareRecipePreValidation,
  evaluateClientSendGate,
  RecipeNotSendableError,
  GENERATION_USER_FAILURE_MESSAGE,
  isLargeCrewGeneration,
  recordReliabilityEvent,
} from "./generation-reliability.js";
import { runCuratedGenerationFallback } from "./curated-generation-fallback.js";
import { curateRecipeForClient } from "./generation-curation.js";
import { stripInternalClientFields } from "../shared/customer-facing.js";
import { isRoboticTitle, suggestHumanMealTitle } from "../shared/generation-reliability.js";
import { generationError } from "../shared/generation-errors.js";
import {
  formatZodValidationForClient,
  formatPizzaZodValidationForClient,
  logGenerateValidationFailure,
} from "./request-validation.js";
import { initRecipeCatalog } from "./recipe-catalog.js";
import {
  initIngestionStore,
  getIngestionSummary,
  getLatestIngestionRun,
  listStagingForReview,
  updateStagingStatus,
} from "./ingestion/ingestion-store.js";
import { promoteDraftByFingerprint } from "./ingestion/promote.js";
import {
  initCuratedRecipeStore,
  getCuratedStoreStats,
  getCuratedRecipeById,
  getCuratedRecipeBySlug,
  listCuratedRecipeSummaries,
} from "./curated-recipe-store.js";
import {
  pickCatalogExploreFallback,
  pickCatalogRecipeForGenerate,
  pickCuratedExploreSearchCard,
} from "./recipe-ranker.js";
import { fetchBestSpoonacularRecipe } from "./spoonacular-converter";
import { runV2Generate } from "./recipe-engine-v2";
import { runV2Fallback } from "./v2-fallback";
import { isTemplateFallbackAllowed } from "./recipe-fallback-policy";
import { enforceCarbs, trackCarb, ensureRiceForRiceDishes } from "./carb-rules";
import { completeFirehallPlate } from "./meal-composition";
import { resolveMealBuildSteps } from "./meal-instructions.js";
import { detectMealIdentity } from "../shared/meal-semantics.js";
import {
  runRecipeQualityGate,
  applyQualityTitleFix,
} from "../shared/recipe-quality-gate.js";
import { polishFirehallSteps } from "../shared/firehall-instruction-voice.js";
import { adjustMacrosAfterCompose, assertMealSemanticsOrLog, scorePlateTrust } from "./meal-sanity";
import { applyCrewPortionFloors, hallCleanupTip, hallProTips } from "./firehall-voice";
import { pickStructure, trackStructure, STRUCTURE_DISPLAY, type StructureType } from "./structure-variety";
import { log, logVerbose, logError, clip, formatLogFields, maskEmail } from "./logger";
import { requireAdmin } from "./admin-auth.js";
import { requireCsrf } from "./csrf.js";
import {
  sanitizeClientGenerationMeta,
  sanitizeGenerateRequest,
  sanitizePizzaRequest,
} from "./sanitize-request.js";
import { getClientIp } from "./client-ip.js";
import { enforceExploreRateLimit } from "./explore-rate-limit.js";
import { enforceEmailRateLimit } from "./email-rate-limit.js";
import { validateAndFixRecipe, validateRecipe, computeSignature, recordSignature, isBlockedByRecentVariety, type RecipeValidationContext } from "./validateRecipe";
import {
  initCacheStore,
  buildCacheKey,
  buildPizzaCacheKey,
  getCachedRecipe,
  getCachedPizzaRecipe,
  setCachedRecipe,
  setCachedPizzaRecipe,
  checkRateLimit,
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
  getRecentSpoonacularIds,
  addRecentSpoonacularId,
} from "./cache-store";
import { runStartupBootstrap, getStartupDiagnostics } from "./startup/bootstrap.js";
import { exploreApiErrorMessage, sanitizeApiErrorMessage } from "./lib/api-errors.js";

const COST_PER_1K_INPUT = 0.00015;
const COST_PER_1K_OUTPUT = 0.0006;

let firstRequestSinceBoot = true;

const BOT_UA_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i,
  /python-requests/i, /httpie/i, /postman/i,
];

function isBot(ua: string): boolean {
  return BOT_UA_PATTERNS.some((p) => p.test(ua));
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await runStartupBootstrap({
    initCacheStore,
    initCuratedRecipeStore,
    initRecipeCatalog,
    initIngestionStore,
    initHallVoteTables,
  });

  const klaviyoCheck = validateKlaviyoConfig();
  if (klaviyoCheck.ok) {
    log("Klaviyo API key configured", "klaviyo");
  } else {
    log(`WARNING: ${klaviyoCheck.error} — email features will fail`, "klaviyo");
  }

  const { getFoodImageryConfig } = await import("./food-imagery/config.js");
  const imageryCfg = getFoodImageryConfig();
  if (imageryCfg.enabled) {
    log(`Food imagery pipeline enabled (model=${imageryCfg.model})`, "catalog");
  } else {
    log(
      "Food imagery pipeline disabled — set FOOD_IMAGERY_ENABLED=true and OPENAI_API_KEY in Secrets",
      "catalog",
    );
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

  app.use("/api/admin", requireAdmin);

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

  app.get("/api/health", (_req: Request, res: Response) => {
    const diag = getStartupDiagnostics();
    const ok = diag?.ok !== false;
    res.status(ok ? 200 : 503).json({
      status: ok ? "healthy" : "degraded",
      uptime: process.uptime(),
      nodeEnv: process.env.NODE_ENV || "development",
      diagnostics: diag,
    });
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
      const body = typeof step === "string" ? step : (step.body || step.instruction || step.instructions || "");

      let heat =
        typeof step === "object" && step.cooking_method
          ? String(step.cooking_method).replace(/_/g, "-")
          : "";
      let minutes =
        typeof step === "object" && typeof step.estimated_time === "number"
          ? step.estimated_time
          : 0;

      // Extract heat and time from structured heading parenthetical:
      const parenMatch = heading.match(/\(([^)]+)\)\s*$/);
      if (parenMatch && (!heat || !minutes)) {
        const parts = parenMatch[1].split(",").map((p: string) => p.trim());
        if (parts.length >= 2) {
          if (!heat) heat = parts[0];
          const timeMatch = parts[1].match(/(\d+)[–\-](\d+)|(\d+)/);
          if (timeMatch && !minutes) {
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
      meal_style: originalRecipe.meal_style || "skillet",
      tags: {
        cuisine: originalRecipe.tags?.cuisine || "american",
        cooking_method: "stovetop",
        base_carb: "none",
        key_ingredients: originalRecipe.tags?.key_ingredients || [],
        high_protein: originalRecipe.tags?.high_protein ?? true,
        high_fiber: originalRecipe.tags?.high_fiber ?? false,
        quick_cleanup: originalRecipe.tags?.quick_cleanup ?? true,
      },
    };
  }

  function buildResponse(validation: import("./validateRecipe").ValidationResult, extras: Record<string, any>, debug: boolean, crewSize: number = 0, mealFormat: string = "", allergens: string[] = [], auditCtx?: LabelAuditContext, sessionKey?: string): Record<string, any> {
    let recipe = prepareRecipePreValidation(validation.recipe);
    if (extras._recipe_source) {
      recipe = { ...recipe, _recipe_source: extras._recipe_source };
    }
    if (extras._fallback === true) {
      recipe = { ...recipe, _fallback: true };
    }

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
            swap_protein: vo.swap_protein
              ? substituteTextForAllergens(vo.swap_protein, allergens)
              : vo.swap_protein,
            plating_notes: vo.plating_notes
              ? substituteTextForAllergens(vo.plating_notes, allergens)
              : vo.plating_notes,
            steps: Array.isArray(vo.steps)
              ? vo.steps.map((t: string) => substituteTextForAllergens(t, allergens))
              : vo.steps,
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
      sessionKey,
    });
    const recipeSource = composed._recipe_source || extras._recipe_source;
    recipe = {
      ...composed,
      steps: resolveMealBuildSteps(composed, mealFormat, effectiveCrewSize, recipeSource),
    };
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
      steps: polishFirehallSteps(recipe.steps || []),
      ingredients: applyCrewPortionFloors(recipe.ingredients || [], effectiveCrewSize),
      cleanup_tip: recipe.cleanup_tip || hallCleanupTip(),
      pro_tips: recipe.pro_tips?.length ? recipe.pro_tips : hallProTips(effectiveCrewSize, 4),
    };

    const importedSource =
      extras._source === "spoonacular_v2" ||
      extras._source === "spoonacular_v2_relaxed" ||
      extras._source === "catalog" ||
      extras._source === "catalog_relaxed" ||
      extras._source === "session_cache" ||
      extras._source === "curated_fallback" ||
      recipe._imported === true;
    let quality = runRecipeQualityGate(recipe, {
      mealFormat,
      identity: detectMealIdentity(recipe.title || "", mealFormat),
      protein: ctx.chosenProtein || recipe.chosen_protein,
      crewSize: effectiveCrewSize,
      importedSource,
    });
    if (!quality.pass || isRoboticTitle(recipe.title || "")) {
      recipe = applyQualityTitleFix(recipe, mealFormat);
      quality = runRecipeQualityGate(recipe, {
        mealFormat,
        identity: detectMealIdentity(recipe.title || "", mealFormat),
        protein: ctx.chosenProtein || recipe.chosen_protein,
        crewSize: effectiveCrewSize,
        importedSource,
      });
      log(
        `[quality-gate] "${clip(recipe.title, 40)}" score=${quality.score} issues=[${quality.issues.join(",")}] msgs=${quality.messages.slice(0, 3).join("; ")}`,
        "generate",
      );
    }

    const finalBaseCarb = recipe.tags?.base_carb || "";
    if (finalBaseCarb && finalBaseCarb !== "none") {
      trackCarb(finalBaseCarb);
    }

    const recipeId = crypto.randomUUID();
    const merged = { ...recipe, ...extras, _signature: validation.signature, _id: recipeId };
    const client = normalizeToClientFormat(merged, crewSize, mealFormat);
    const base: Record<string, any> = stripInternalClientFields(
      { ...client },
      debug,
    );
    base._id = recipeId;
    if (extras._fallback === true) {
      if (debug) base._fallback = true;
      else base.hall_curated = true;
    }
    if (debug && extras._source) base._source = extras._source;
    if (extras._catalog_id) base._catalog_id = extras._catalog_id;
    if (extras._recipe_source) base._recipe_source = extras._recipe_source;

    const ingsCount = (client.ingredients || []).length;
    const stepsCount = (client.steps || []).length;
    const cuisine =
      (recipe.tags?.cuisine as string | undefined) ||
      (extras._source === "spoonacular_v2" ? "spoonacular" : undefined) ||
      "any";
    log(
      `[generate] success ${formatLogFields({
        title: clip(client.title, 60),
        cuisine,
        protein: recipe.chosen_protein,
        ings: ingsCount,
        steps: stepsCount,
        id: recipeId.slice(0, 8),
        fallback: extras._fallback === true,
        source: extras._source as string | undefined,
      })}`,
      "generate",
    );

    if (extras._filtersRelaxed) {
      base._filters_adjusted = true;
      base._adjustment_note = "Adjusted meal style to meet allergy requirements.";
    }

    const curation = curateRecipeForClient(recipe, validation, {
      mealFormat,
      protein: ctx.chosenProtein || recipe.chosen_protein || "any",
      importedSource,
    });
    recipe = curation.recipe;
    quality = curation.qualityGate;

    const sendCheck = evaluateClientSendGate({ validation, recipe, quality, extras });
    if (!sendCheck.sendable || !curation.sendable) {
      const reasons = [...sendCheck.reasons, ...curation.reasons];
      recordReliabilityEvent("blocked_client_send", reasons.join(","));
      throw new RecipeNotSendableError(reasons);
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
        send_gate_ok: sendCheck.sendable,
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

  async function sendRecipeResponse(
    res: Response,
    validation: import("./validateRecipe").ValidationResult,
    extras: Record<string, any>,
    debug: boolean,
    crewSize: number,
    mealFormat: string,
    allergens: string[],
    auditCtx: LabelAuditContext | undefined,
    ipHash: string,
    sessionId: string,
    rateCtx: ReturnType<typeof parseGenerationRateContext>,
    request?: GenerateRequest,
    clientRecentSigs: string[] = [],
    fallbackDepth = 0,
  ) {
    const sessKey = `${ipHash}:${sessionId}`;
    try {
      const result = buildResponse(validation, extras, debug, crewSize, mealFormat, allergens, auditCtx, sessKey);
      if (extras._spoonacular_title && result.title !== extras._spoonacular_title) {
        log(`[spoonacular-generator] Label audit changed title — restoring: "${extras._spoonacular_title}"`, "spoonacular");
        result.title = extras._spoonacular_title;
      }
      const signature = validation.signature || result._signature || "";
      const { enrichClientRecipeWithHero, queueMealHeroAfterGenerate } = await import(
        "./food-imagery/meal-integration.js",
      );
      const enriched = await enrichClientRecipeWithHero(result, signature);
      if (validation.recipe && enriched._id) {
        queueMealHeroAfterGenerate(validation.recipe, String(enriched._id), signature);
      }
      addSessionSignature(sessKey, signature);
      recordSuccessfulGeneration(ipHash, sessionId, rateCtx, signature);
      return res.json(enriched);
    } catch (err) {
      if (err instanceof RecipeNotSendableError && request && fallbackDepth < 1) {
        log(
          `[generate] send gate blocked (${err.reasons.join(",")}) — safe curated fallback`,
          "generate",
        );
        const safe = await resolveSafeCuratedFallback(
          request,
          clientRecentSigs,
          `send_gate:${err.reasons.slice(0, 3).join(",")}`,
        );
        const fbValCtx: RecipeValidationContext = {
          chosenProtein: safe.protein,
          meal_style: safe.recipe.meal_style || mealFormat,
          cuisine: request.cuisine_style || "any",
          appliances: request.appliances,
          allergens,
          recentSignatures: clientRecentSigs,
        };
        const fbVal = validateAndFixRecipe(
          prepareRecipePreValidation(safe.recipe),
          fbValCtx,
        );
        return sendRecipeResponse(
          res,
          fbVal,
          {
            _fallback: true,
            _source: safe.source,
            _recipe_source: safe.recipeSource,
            _catalog_id: safe.catalogId,
            _realism_firewall_fallback: true,
          },
          debug,
          crewSize,
          mealFormat,
          allergens,
          auditCtx ? { ...auditCtx, chosenProtein: safe.protein } : auditCtx,
          ipHash,
          sessionId,
          rateCtx,
          request,
          clientRecentSigs,
          fallbackDepth + 1,
        );
      }
      logError("generate", "sendRecipeResponse failed", err);
      return res.status(503).json(
        generationError("generation_failed", GENERATION_USER_FAILURE_MESSAGE, {
          request_id: rateCtx.requestId,
          retry_after_seconds: 8,
        }),
      );
    }
  }

  function recordSuccessfulGeneration(
    ipHash: string,
    sessionId: string,
    rateCtx: ReturnType<typeof parseGenerationRateContext>,
    signature: string,
  ) {
    const sessionKey = `${ipHash}:${sessionId}`;
    const result = finalizeRequest(sessionKey, rateCtx.requestId, signature);
    recordUserGenerationRateLimit(ipHash, sessionId, rateCtx, { sameSignature: result.sameSignature });
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

    const flavorWord = chosenSauce ? chosenSauce.split(" ")[0] : "";
    remixed.title = suggestHumanMealTitle({
      protein,
      mealFormat: remixed.meal_style || currentStructure,
      flavorHint: flavorWord,
      fallbackTitle: remixed.title,
      ingredients: remixed.ingredients,
      cuisine: remixed.tags?.cuisine,
    });

    return remixed;
  }

  app.post("/api/generate", requireCsrf, async (req: Request, res: Response) => {
    try {
      const ua = req.headers["user-agent"] || "";
      if (isBot(ua)) {
        return res.status(403).json({ message: "Automated requests are not allowed." });
      }

      const sessionId = (req as any)._sessionId || "unknown";
      const clientIp = getClientIp(req);
      const ipHash = hashIp(clientIp);

      const rateCtx = parseGenerationRateContext(req);
      const requestId = rateCtx.requestId;
      const sessionKey = `${ipHash}:${sessionId}`;

      log(`[generate] start intent=${rateCtx.intent} rid=${requestId} session=${sessionId}`, "generate");

      const reserveCheck = checkAndReserveRequest(sessionKey, requestId);
      if (reserveCheck.isDuplicate) {
        log(`[rate] Duplicate request_id=${requestId} — already completed`, "rate");
        return res.status(409).json(
          generationError("duplicate_request", "This request already completed. Wait a moment or tap Generate again.", {
            retry_after_seconds: 3,
            request_id: requestId,
          }),
        );
      }
      if (reserveCheck.isInFlight) {
        log(`[rate] In-flight request_id=${requestId} — blocking concurrent duplicate`, "rate");
        return res.status(409).json(
          generationError("in_flight", "A recipe is already generating for this session. Please wait.", {
            retry_after_seconds: 5,
            request_id: requestId,
          }),
        );
      }

      const userLimits = enforceUserGenerationRateLimits(ipHash, sessionId, rateCtx);
      if (!userLimits.allowed) {
        cancelRequest(sessionKey, requestId);
        return res.status(userLimits.status ?? 429).json(
          generationError("rate_limited", userLimits.message || "Rate limit exceeded.", {
            retry_after_seconds: userLimits.retryAfterSeconds ?? 60,
            request_id: requestId,
          }),
        );
      }

      const parsed = generateRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        cancelRequest(sessionKey, requestId);
        logGenerateValidationFailure(parsed.error, req.body);
        const { status, body } = formatZodValidationForClient(parsed.error);
        return res.status(status).json(body);
      }

      const request: GenerateRequest = sanitizeGenerateRequest({
        ...parsed.data,
        busy_level: inferBusyLevelFromTime(parsed.data.time_available),
      });

      if (request.use_what_we_have && (!request.ingredients_on_hand || request.ingredients_on_hand.length === 0)) {
        cancelRequest(sessionKey, requestId);
        return res.status(400).json({ message: "Please enter at least one ingredient when using 'Use What's in the Fridge' mode." });
      }

      // ─── GENERATE PIPELINE (local-first) ────────────────────────────────────
      //
      // A. Curated editorial → B. Golden 100 → C. cache/catalog →
      // D. emergency pools → E. live Spoonacular (hard timeout) → D if E fails
      // Pantry: AI from on-hand ingredients; safe template if AI fails
      //
      const allergens = request.allergens_to_avoid || [];
      const startTime = Date.now();
      const genTimeoutMs = generationTimeoutMs(request.crew_size);
      if (isLargeCrewGeneration(request.crew_size)) {
        recordReliabilityEvent("large_crew_path", `crew=${request.crew_size}`);
      }
      const debugMode = req.query.debug === "1" || (req.body as any).debug === true;
      const clientMeta = sanitizeClientGenerationMeta((req.body as Record<string, unknown>) || {});
      const clientCurrentSig = clientMeta.currentRecipeSignature;
      const clientRecentSigs = clientMeta.recentSignatures;

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
            const ptAI = await withTimeout("pantry_ai", genTimeoutMs, () =>
              generateRecipeFromPantry(ptChosen, request, ptVariety, ptStructure),
            );
            ptRecipe = ptAI.recipe;
          }
        } catch (ptErr: any) {
          log(`[pantry] AI error: ${ptErr.message} — using safe fallback`, "ai");
        }

        let ptUsedTemplateFallback = !ptRecipe;
        let ptSource = ptUsedTemplateFallback ? "pantry_template" : "pantry";
        let ptFinal = ptRecipe ?? buildSafeFallbackRecipe(request.meal_format || ptStyle, request.crew_size);

        if (ptRecipe) {
          const ptExtras = { _source: "pantry", _fallback: false };
          const ptFw = runRealismFirewall(ptRecipe, ptExtras);
          if (ptFw && !ptFw.pass) {
            log("[pantry] AI output rejected by realism firewall — safe curated fallback", "generate");
            const safe = await resolveSafeCuratedFallback(request, clientRecentSigs, "pantry_firewall");
            ptFinal = safe.recipe;
            ptSource = safe.source;
            ptUsedTemplateFallback = true;
            ptAuditCtx.chosenProtein = safe.protein;
          }
        }

        const ptWithStyle = { ...ptFinal, meal_style: ptStyle };
        const ptVal = validateAndFixRecipe(ptWithStyle as any, ptValCtx);
        logUsage({ cacheKey: `pantry-${sessionId}`, templateId: 0, cacheHit: false, latencyMs: Date.now() - startTime, ipHash, sessionId });
        log(
          `[generate] success ${formatLogFields({
            source: ptSource,
            title: clip(ptVal.recipe.title, 60),
            duration: `${Date.now() - startTime}ms`,
            pantry_items: (request.ingredients_on_hand || []).length,
            fallback: ptUsedTemplateFallback,
          })}`,
          "generate",
        );
        recordSignature(ptProtein, ptVal.signature);
        return sendRecipeResponse(
          res,
          ptVal,
          { _source: ptSource, _fallback: ptUsedTemplateFallback },
          debugMode,
          request.crew_size,
          request.meal_format || "random",
          allergens,
          ptAuditCtx,
          ipHash,
          sessionId,
          rateCtx,
          request,
          clientRecentSigs,
        );
      }

      const v2SessionKey = `${ipHash}:${sessionId}`;
      const catalogVarietySeed = (() => {
        const rid = String((req.body as { request_id?: string }).request_id || "");
        if (rid) {
          return parseInt(crypto.createHash("sha256").update(rid).digest("hex").slice(0, 8), 16);
        }
        return clientRecentSigs.length;
      })();
      const catalogPickOptions = {
        recentSignatures: clientRecentSigs,
        currentRecipeSignature: clientCurrentSig || undefined,
        varietySeed: catalogVarietySeed,
        recentSpoonacularIds: getRecentSpoonacularIds(v2SessionKey),
      };

      const auditCtx: LabelAuditContext = {
        selectedAppliances: request.appliances || [],
        selectedAllergens: allergens,
        selectedHealthiness: request.healthiness_preference || "balanced",
        selectedBudget: request.budget_level || "standard",
        selectedCuisine: request.cuisine_style || "",
        selectedMealFormat: request.meal_format || "",
        selectedProtein: request.protein || "any",
        chosenProtein: request.protein === "any" ? "chicken" : request.protein,
        crewSize: request.crew_size || 4,
      };

      const pipelineHit = await runLocalFirstGeneratePipeline({
        request,
        v2SessionKey,
        catalogPickOptions,
        varietySeed: catalogVarietySeed,
        recentSignatures: clientRecentSigs,
        currentRecipeSignature: clientCurrentSig || undefined,
        preferDifferentStyle: Boolean(request.prefer_different_style),
        startTime,
      });

      auditCtx.chosenProtein = pipelineHit.protein;
      const valCtx: RecipeValidationContext = {
        chosenProtein: pipelineHit.protein,
        meal_style: pipelineHit.recipe.meal_style || request.meal_format || "plated main",
        cuisine: request.cuisine_style || "any",
        appliances: request.appliances,
        allergens,
        recentSignatures: clientRecentSigs,
        currentRecipeSignature: clientCurrentSig || undefined,
      };

      let validated = validateAndFixRecipe(
        prepareRecipePreValidation(pipelineHit.recipe),
        valCtx,
      );

      const preserveTitle = pipelineHit.originalTitle;
      if (preserveTitle && validated.recipe.title !== preserveTitle) {
        validated = { ...validated, recipe: { ...validated.recipe, title: preserveTitle } };
      }

      logUsage({
        cacheKey: pipelineHit.cacheKey,
        templateId: 0,
        cacheHit: pipelineHit.cacheHit,
        latencyMs: Date.now() - startTime,
        ipHash,
        sessionId,
      });

      log(
        `[generate] success ${formatLogFields({
          source: String(pipelineHit.extras._source || pipelineHit.layer),
          layer: pipelineHit.layer,
          sourceKind: pipelineHit.telemetry.sourceKind,
          cacheHit: pipelineHit.cacheHit,
          ai: pipelineHit.aiInvoked,
          title: clip(validated.recipe.title, 60),
          protein: pipelineHit.protein,
          duration: `${pipelineHit.telemetry.durationMs}ms`,
        })}`,
        "generate",
      );

      recordSignature(pipelineHit.protein, validated.signature);
      if (pipelineHit.spoonacularId && pipelineHit.spoonacularId > 0) {
        addRecentSpoonacularId(v2SessionKey, pipelineHit.spoonacularId);
      }

      return sendRecipeResponse(
        res,
        validated,
        pipelineHit.extras,
        debugMode,
        request.crew_size,
        request.meal_format || "random",
        allergens,
        auditCtx,
        ipHash,
        sessionId,
        rateCtx,
        request,
        clientRecentSigs,
      );

    } catch (error: unknown) {
      const failCtx = parseGenerationRateContext(req);
      const failKey = `${hashIp(getClientIp(req))}:${(req as any)._sessionId || "unknown"}`;
      const msg = error instanceof Error ? error.message : String(error);
      logError("generate", "request failed — serving emergency fallback", error);

      if (error instanceof RecipeNotSendableError) {
        cancelRequest(failKey, failCtx.requestId);
        return res.status(500).json(
          generationError("generation_failed", GENERATION_USER_FAILURE_MESSAGE, {
            request_id: failCtx.requestId,
          }),
        );
      }

      try {
        const parsed = generateRequestSchema.safeParse(req.body);
        if (!parsed.success) {
          cancelRequest(failKey, failCtx.requestId);
          return res.status(500).json(
            generationError("generation_failed", GENERATION_USER_FAILURE_MESSAGE, {
              request_id: failCtx.requestId,
            }),
          );
        }

        const emergencyRequest = sanitizeGenerateRequest({
          ...parsed.data,
          busy_level: inferBusyLevelFromTime(parsed.data.time_available),
        });
        const emergencyStart = Date.now();
        const emergencyHit = resolveEmergencyGenerateHit(
          emergencyRequest,
          emergencyStart,
          `catch:${msg.slice(0, 80)}`,
        );
        logGenerateTelemetry(emergencyHit.telemetry);

        const allergens = emergencyRequest.allergens_to_avoid || [];
        const valCtx: RecipeValidationContext = {
          chosenProtein: emergencyHit.protein,
          meal_style: emergencyHit.recipe.meal_style || emergencyRequest.meal_format || "random",
          cuisine: emergencyRequest.cuisine_style || "any",
          appliances: emergencyRequest.appliances,
          allergens,
        };
        const validated = validateAndFixRecipe(
          prepareRecipePreValidation(emergencyHit.recipe),
          valCtx,
        );
        const auditCtx: LabelAuditContext = {
          selectedAppliances: emergencyRequest.appliances || [],
          selectedAllergens: allergens,
          selectedHealthiness: emergencyRequest.healthiness_preference || "balanced",
          selectedBudget: emergencyRequest.budget_level || "standard",
          selectedCuisine: emergencyRequest.cuisine_style || "",
          selectedMealFormat: emergencyRequest.meal_format || "",
          selectedProtein: emergencyRequest.protein || "any",
          chosenProtein: emergencyHit.protein,
          crewSize: emergencyRequest.crew_size || 4,
        };

        recordSignature(emergencyHit.protein, validated.signature);
        return sendRecipeResponse(
          res,
          validated,
          emergencyHit.extras,
          false,
          emergencyRequest.crew_size,
          emergencyRequest.meal_format || "random",
          allergens,
          auditCtx,
          failKey.split(":")[0] || "unknown",
          (req as any)._sessionId || "unknown",
          failCtx,
          emergencyRequest,
          [],
        );
      } catch (innerErr: unknown) {
        cancelRequest(failKey, failCtx.requestId);
        logError("generate", "emergency fallback failed", innerErr);
        return res.status(500).json(
          generationError("generation_failed", GENERATION_USER_FAILURE_MESSAGE, {
            request_id: failCtx.requestId,
          }),
        );
      }
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

  app.post("/api/email-recipe", requireCsrf, async (req: Request, res: Response) => {
    try {
      const parsed = emailRecipeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid email request.",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const {
        email,
        recipe_title,
        primary_protein,
        ingredients,
        steps,
        pro_tips,
        macros,
        healthiness_level,
        crew_size,
        timestamp,
      } = parsed.data;

      if (!enforceEmailRateLimit(req, res, email)) return;

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
        log(`[email] subscribe failed email=${maskEmail(email)} reason="${clip(reason, 80)}"`, "klaviyo");
      }
      if (eventFailed) {
        const reason = (results[1] as PromiseRejectedResult).reason?.message || "Unknown error";
        log(`[email] track failed email=${maskEmail(email)} reason="${clip(reason, 80)}"`, "klaviyo");
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

      log(
        `[email] recipe sent ${formatLogFields({
          email: maskEmail(email),
          title: clip(recipe_title, 50),
          crew: crew_size,
          ingredients: Array.isArray(ingredients) ? ingredients.length : 0,
          steps: Array.isArray(steps) ? steps.length : 0,
        })}`,
        "email",
      );
      return res.json({ success: true, message: "Recipe sent. Check your inbox." });
    } catch (error: any) {
      logError("email", "recipe send failed", error);
      return res.status(500).json({ message: `Failed to send recipe: ${error.message}` });
    }
  });

  app.post("/api/email-shopping-list", requireCsrf, async (req: Request, res: Response) => {
    try {
      const parsed = emailShoppingListSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid email request.",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { email, recipe_title, shopping_list_sections, generator_type, timestamp } = parsed.data;

      if (!enforceEmailRateLimit(req, res, email)) return;

      const klaviyo = validateKlaviyoConfig();
      if (!klaviyo.ok) {
        log(`Email blocked: ${klaviyo.error}`, "klaviyo");
        return res.status(503).json({ message: "Email service is not configured. Please contact the site owner." });
      }

      const results = await Promise.allSettled([
        subscribeToList(email),
        trackShoppingListEvent(email, {
          recipe_title,
          shopping_list_sections: (shopping_list_sections || []).map((section) => ({
            title: section.title,
            items: section.items.map((item) =>
              [item.name, item.amount, item.notes].filter(Boolean).join(" — "),
            ),
          })),
          generator_type: generator_type || "meal",
          timestamp: timestamp || new Date().toISOString(),
        }),
      ]);

      const subscribeFailed = results[0].status === "rejected";
      const eventFailed = results[1].status === "rejected";

      if (subscribeFailed) {
        const reason = (results[0] as PromiseRejectedResult).reason?.message || "Unknown error";
        log(`[email] subscribe failed email=${maskEmail(email)} reason="${clip(reason, 80)}"`, "klaviyo");
      }
      if (eventFailed) {
        const reason = (results[1] as PromiseRejectedResult).reason?.message || "Unknown error";
        log(`[email] track failed email=${maskEmail(email)} reason="${clip(reason, 80)}"`, "klaviyo");
      }

      if (subscribeFailed && eventFailed) {
        const reason = (results[0] as PromiseRejectedResult).reason?.message || "Unknown error";
        if (reason.includes("KLAVIYO_API_KEY")) {
          return res.status(503).json({ message: "Email service is not configured. Please contact the site owner." });
        }
        return res.status(502).json({ message: `Email service error: ${reason}` });
      }

      const sectionCount = Array.isArray(shopping_list_sections) ? shopping_list_sections.length : 0;
      log(
        `[email] shopping-list sent ${formatLogFields({
          email: maskEmail(email),
          title: clip(recipe_title, 50),
          sections: sectionCount,
          generator: generator_type || "meal",
        })}`,
        "email",
      );
      return res.json({ success: true, message: "Shopping list sent. Check your inbox." });
    } catch (error: any) {
      logError("email", "shopping-list send failed", error);
      return res.status(500).json({ message: `Failed to send shopping list: ${error.message}` });
    }
  });

  app.get("/api/pizza/menu", (_req: Request, res: Response) => {
    res.json({
      featured: getFeaturedPizzaIds(8),
      concepts: PIZZA_CONCEPT_REGISTRY.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        emoji: c.heroEmoji,
        gradient: c.heroGradient,
        badges: c.badges.slice(0, 2),
      })),
      total: PIZZA_CONCEPT_REGISTRY.length,
    });
  });

  async function respondWithPizza(res: Response, recipe: import("@shared/schema").PizzaResponse) {
    const { enrichPizzaWithHero, queuePizzaHeroAfterGenerate } = await import(
      "./food-imagery/meal-integration.js",
    );
    const enriched = await enrichPizzaWithHero(recipe);
    queuePizzaHeroAfterGenerate(recipe);
    return res.json(enriched);
  }

  app.post("/api/generate-pizza", requireCsrf, async (req: Request, res: Response) => {
    try {
      const ua = req.headers["user-agent"] || "";
      if (isBot(ua)) {
        return res.status(403).json({ message: "Automated requests are not allowed." });
      }

      const sessionId = (req as any)._sessionId || "unknown";
      const clientIp = getClientIp(req);
      const ipHash = hashIp(clientIp);

      const pizzaLimits = enforcePizzaGenerationRateLimits(ipHash);
      if (!pizzaLimits.allowed) {
        return res.status(pizzaLimits.status ?? 429).json(
          generationError("rate_limited", pizzaLimits.message || "Slow down on pizza.", {
            retry_after_seconds: pizzaLimits.retryAfterSeconds ?? 30,
          }),
        );
      }

      const parsed = pizzaRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        const { status, body } = formatPizzaZodValidationForClient(parsed.error);
        return res.status(status).json(body);
      }

      const request = sanitizePizzaRequest(parsed.data);
      const conceptId = pickPizzaConcept(request);
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
        return respondWithPizza(res, cached);
      }

      const dailyBudget = parseFloat(process.env.DAILY_LLM_BUDGET_USD || "5.00");
      const currentSpend = getDailySpend();
      const budgetExceeded = currentSpend >= dailyBudget;

      if (budgetExceeded) {
        log(`[pizza] LLM budget exceeded — serving hall template (${conceptId})`, "budget");
        const templateRecipe = finalizePizzaRecipe(
          buildPizzaTemplate(conceptId, request),
          request,
          conceptId,
          "template",
        );
        setCachedPizzaRecipe(cacheKey, templateRecipe);
        return respondWithPizza(res, templateRecipe);
      }

      const { recipe, tokensIn, tokensOut } = await withTimeout("pizza_ai", pizzaTimeoutMs(), () =>
        generatePizzaRecipe(request, conceptId),
      );

      const estimatedCost =
        (tokensIn / 1000) * COST_PER_1K_INPUT +
        (tokensOut / 1000) * COST_PER_1K_OUTPUT;

      setCachedPizzaRecipe(cacheKey, recipe);
      recordPizzaGenerationRateLimit(ipHash);

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

      return respondWithPizza(res, recipe);
    } catch (error: any) {
      logError("pizza", "generate failed", error);
      try {
        const parsed = pizzaRequestSchema.safeParse(req.body);
        if (parsed.success) {
          const conceptId = pickPizzaConcept(parsed.data);
          const fallback = finalizePizzaRecipe(
            buildPizzaTemplate(conceptId, parsed.data),
            parsed.data,
            conceptId,
            "template",
          );
          log(`[pizza] emergency template fallback: ${conceptId}`, "pizza");
          return respondWithPizza(res, fallback);
        }
      } catch {
        /* ignore */
      }
      return res.status(500).json({ message: error.message || "Failed to generate pizza recipe" });
    }
  });

  app.post("/api/hall-vote", requireCsrf, async (req: Request, res: Response) => {
    try {
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
      const voteOptions: VoteOptionInput[] = options.map((opt) => ({
        name: opt.name,
        description: opt.description,
        est_cost: opt.est_cost,
        est_time: opt.est_time,
        recipe_payload:
          (opt.recipe_payload as GenerateResponse | undefined) ??
          buildMinimalGenerateResponse(opt.name),
      }));

      const { voteId } = createHallVote(title, voteOptions, sessionId);

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["host"] || "localhost:5000";
      const shareUrl = `${protocol}://${host}/vote/${voteId}`;

      return res.json({ vote_id: voteId, share_url: shareUrl });
    } catch (error: any) {
      logError("hallvote", "create failed", error);
      return res.status(500).json({ message: "Failed to create vote" });
    }
  });

  app.get("/api/hall-vote/:voteId", (req: Request, res: Response) => {
    try {
      const voteId = routeParam(req.params.voteId);
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
      logError("hallvote", "get failed", error);
      return res.status(500).json({ message: "Failed to get vote" });
    }
  });

  app.post("/api/hall-vote/:voteId/vote", (req: Request, res: Response) => {
    try {
      const voteId = routeParam(req.params.voteId);
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
      logError("hallvote", "cast failed", error);
      return res.status(500).json({ message: "Failed to cast vote" });
    }
  });

  app.post("/api/hall-vote/:voteId/close", requireCsrf, (req: Request, res: Response) => {
    try {
      const voteId = routeParam(req.params.voteId);
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
      logError("hallvote", "close failed", error);
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
    const recipeId = routeParam(req.params.recipeId);
    const updated = removeFavourite(userId, recipeId);
    return res.json({ favourites: updated });
  });

  app.get("/api/admin/usage", (req: Request, res: Response) => {
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

  if (process.env.NODE_ENV !== "production") {
    app.get("/api/test-spoonacular", requireAdmin, async (_req: Request, res: Response) => {
      try {
        if (!process.env.SPOONACULAR_API_KEY) {
          return res.status(503).json({ error: "SPOONACULAR_API_KEY is not set" });
        }
        const { searchRecipes } = await import("./spoonacular.js");
        const results = await searchRecipes("chicken", { number: 3 });
        return res.json({ ok: true, count: results.results?.length ?? 0 });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Spoonacular test failed";
        return res.status(500).json({ error: msg });
      }
    });
  }

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

  app.get("/api/explore/sections", async (req: Request, res: Response) => {
    if (!enforceExploreRateLimit(req, res)) return;
    try {
      const diet = (req.query.diet as string) || "";
      const intolerances = (req.query.intolerances as string) || "";
      const excludeIngredients = (req.query.excludeIngredients as string) || "";
      const seen = parseSeenIds(req.query.seen as string | undefined);
      const recentProteins = parseRecentProteins(req.query.recent_proteins as string | undefined);
      const crewSize = req.query.crew_size ? Number(req.query.crew_size) : undefined;
      const maxReadyMinutes = req.query.max_ready_minutes
        ? Number(req.query.max_ready_minutes)
        : undefined;
      const performanceMode = req.query.performance_mode
        ? Number(req.query.performance_mode)
        : undefined;

      const feed = await buildExploreEditorialFeed(
        {
          diet: diet || undefined,
          intolerances: intolerances || undefined,
          excludeIngredients: excludeIngredients || undefined,
        },
        {
          seenRecipeIds: seen,
          recentProteins,
          crewSize: Number.isFinite(crewSize) ? crewSize : undefined,
          maxReadyMinutes: Number.isFinite(maxReadyMinutes) ? maxReadyMinutes : undefined,
          performanceMode: Number.isFinite(performanceMode) ? performanceMode : undefined,
        },
      );

      res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
      return res.json({
        sections: feed.sections,
        _editorial: true,
        _recommendation: true,
        _meta: feed.meta,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sections failed";
      if (msg.includes("SPOONACULAR_API_KEY is not configured")) {
        return res.status(503).json({ message: "Recipe search is not configured. SPOONACULAR_API_KEY is missing." });
      }
      log(`[explore] Sections error: ${msg}`, "spoonacular");
      return res.status(500).json({ message: exploreApiErrorMessage(err) });
    }
  });

  app.get("/api/recommendations/context", async (req: Request, res: Response) => {
    try {
      const crewSize = req.query.crew_size ? Number(req.query.crew_size) : undefined;
      const maxReadyMinutes = req.query.max_ready_minutes
        ? Number(req.query.max_ready_minutes)
        : undefined;
      const performanceMode = req.query.performance_mode
        ? Number(req.query.performance_mode)
        : undefined;
      const payload = buildContextualSuggestions({
        crewSize: Number.isFinite(crewSize) ? crewSize : undefined,
        maxReadyMinutes: Number.isFinite(maxReadyMinutes) ? maxReadyMinutes : undefined,
        performanceMode: Number.isFinite(performanceMode) ? performanceMode : undefined,
      });
      res.setHeader("Cache-Control", "public, max-age=120");
      return res.json(payload);
    } catch (err: unknown) {
      return res.status(500).json({
        message: sanitizeApiErrorMessage(err, "Recommendations unavailable. Please try again."),
      });
    }
  });

  app.get("/api/recommendations/rails", async (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "public, max-age=600");
    return res.json({ rails: getMasterCategoryRailMeta() });
  });

  app.get("/api/admin/curated-recipes/stats", async (_req: Request, res: Response) => {
    try {
      return res.json(getCuratedStoreStats());
    } catch (err: unknown) {
      return res.status(500).json({ message: (err as Error).message });
    }
  });

  app.get("/api/catalog/golden-100", async (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    const indexFile = path.join(GOLDEN_CATALOG_PUBLIC_DIR, "index.json");
    if (fs.existsSync(indexFile)) {
      return res.type("json").send(fs.readFileSync(indexFile, "utf8"));
    }
    const pages = GOLDEN_100_RECIPES.map((def) => {
      const page = buildGoldenRecipePage(def);
      return {
        slug: page.slug,
        title: page.title,
        subtitle: page.subtitle,
        category: page.category,
        cuisine: page.cuisine,
        protein: def.protein,
        mealFormat: def.mealFormat,
        cookTime: page.cookTime,
        difficulty: page.difficulty,
        heroImage: page.heroImage,
        thumbImage: page.thumbImage,
        tags: page.tags,
        firefighterScore: page.firefighterScore,
        popularityWeight: page.popularityWeight,
        searchTerms: page.searchTerms,
      };
    });
    return res.json({
      version: 1,
      contentVersion: 1,
      generatedAt: new Date().toISOString(),
      recipeCount: pages.length,
      recipes: pages,
    });
  });

  app.get("/api/catalog/golden-100/:slug", async (req: Request, res: Response) => {
    const slug = decodeURIComponent(String(req.params.slug)).trim().toLowerCase();
    const def = getGoldenRecipeBySlug(slug);
    if (!def) {
      return res.status(404).json({ message: "Recipe not in Golden 100 catalog" });
    }
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    const onDisk = readGoldenRecipePage(slug);
    const page = onDisk ?? buildGoldenRecipePage(def);
    return res.json(page);
  });

  app.get("/api/admin/golden-100/manifest", async (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "private, max-age=60");
    return res.json({
      summary: goldenManifestSummary(),
      staticIssues: validateGoldenManifest().filter((i) => i.severity === "error"),
      recipeCount: GOLDEN_100_RECIPES.length,
      recipes: GOLDEN_100_RECIPES.map((r) => {
        const inDb = getCuratedRecipeBySlug(r.slug);
        const heroAvailable = golden100HeroAvailable(r.slug);
        const assets = checkGoldenPageAssets(r.slug);
        const pageOnDisk = listGoldenPageSlugs().includes(r.slug);
        const page = readGoldenRecipePage(r.slug) ?? buildGoldenRecipePage(r);
        const pageValidation = validateGoldenRecipePage(page);
        return {
          slug: r.slug,
          title: r.title,
          category: r.masterCategoryId,
          masterCategoryId: r.masterCategoryId,
          protein: r.protein,
          cuisine: r.cuisine,
          mealFormat: r.mealFormat,
          hookLine: r.hookLine,
          heroImage: golden100HeroUrl(r.slug),
          heroAvailable,
          status: inDb?.status ?? "unseeded",
          recipeId: inDb?.recipeId,
          featured: r.featured ?? false,
          pageComplete: pageOnDisk && pageValidation.pass,
          realismScore: page.realismScore,
          firefighterScore: page.firefighterScore,
          assetsComplete: assets.complete,
          missingAssets: [
            !assets.hero && "hero",
            !assets.mobile && "mobile",
            !assets.thumb && "thumb",
            !assets.rail && "rail",
          ].filter(Boolean),
        };
      }),
    });
  });

  app.get("/api/admin/golden-100/recipe/:slug", async (req: Request, res: Response) => {
    try {
      const slug = decodeURIComponent(String(req.params.slug)).trim().toLowerCase();
      const manifest = GOLDEN_100_RECIPES.find((r) => r.slug === slug);
      if (!manifest) {
        return res.status(404).json({ message: "Recipe not in Golden 100 manifest" });
      }
      const curated = getCuratedRecipeBySlug(slug);
      const heroAvailable = golden100HeroAvailable(manifest.slug);
      return res.json({
        slug: manifest.slug,
        title: manifest.title,
        category: manifest.masterCategoryId,
        masterCategoryId: manifest.masterCategoryId,
        protein: manifest.protein,
        cuisine: manifest.cuisine,
        mealFormat: manifest.mealFormat,
        hookLine: manifest.hookLine,
        heroImage: golden100HeroUrl(manifest.slug),
        heroAvailable,
        status: curated?.status ?? "unseeded",
        recipeId: curated?.recipeId,
        featured: manifest.featured ?? false,
        curated,
      });
    } catch (err: unknown) {
      return res.status(500).json({ message: (err as Error).message });
    }
  });

  app.get("/api/admin/golden-100/audit", async (_req: Request, res: Response) => {
    try {
      return res.json(auditGolden100Dataset());
    } catch (err: unknown) {
      return res.status(500).json({ message: (err as Error).message });
    }
  });

  app.get("/api/admin/curated-recipes/list", async (req: Request, res: Response) => {
    try {
      const tag = (req.query.tag as string) || "golden_100";
      const limit = Math.min(parseInt(String(req.query.limit || "120"), 10) || 120, 200);
      const weakOnly = req.query.weakTitles === "1" || req.query.weakTitles === "true";

      const rows = listCuratedSummariesByTag(tag, limit);
      const titleKeys = new Map<string, string[]>();

      const items = rows.map((row) => {
        const recipe = getCuratedRecipeBySlug(row.slug);
        const titleQ = scoreRecipeTitle(row.title, {
          protein: row.protein,
          mealFormat: recipe?.mealFormat,
          cuisine: recipe?.cuisine,
        });
        const key = normalizeTitleKey(row.title);
        const dupList = titleKeys.get(key) || [];
        dupList.push(row.slug);
        titleKeys.set(key, dupList);

        const manifest = GOLDEN_100_RECIPES.find((m) => m.slug === row.slug);
        const missingImagery =
          !row.heroImage?.trim() ||
          (row.heroImage.includes("spoonacular.com") && !manifest?.classicSlug);

        return {
          ...row,
          weakTitle: !titleQ.pass,
          titleIssues: titleQ.issues,
          missingImagery,
          masterCategoryId: manifest?.masterCategoryId,
          imageryPromptPreview: manifest ? buildGoldenHeroPrompt(manifest).slice(0, 200) : undefined,
        };
      });

      const duplicates = [...titleKeys.entries()]
        .filter(([, slugs]) => slugs.length > 1)
        .map(([key, slugs]) => ({ titleKey: key, slugs }));

      const filtered = weakOnly ? items.filter((i) => i.weakTitle || i.missingImagery) : items;

      return res.json({
        tag,
        count: filtered.length,
        duplicates,
        recipes: filtered,
      });
    } catch (err: unknown) {
      return res.status(500).json({ message: (err as Error).message });
    }
  });

  app.get("/api/admin/curated-recipes/:recipeId", async (req: Request, res: Response) => {
    try {
      const recipe = getCuratedRecipeById(decodeURIComponent(String(req.params.recipeId)));
      if (!recipe) return res.status(404).json({ message: "Recipe not found" });
      return res.json(recipe);
    } catch (err: unknown) {
      return res.status(500).json({ message: (err as Error).message });
    }
  });

  app.get("/api/curated-recipes", async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || "24"), 10) || 24, 60);
      const explorePool = req.query.pool ? String(req.query.pool) : undefined;
      const rows = listCuratedRecipeSummaries({
        status: "published",
        explorePool,
        minQuality: 30,
        limit,
        orderBy: "quality",
      });
      return res.json({ recipes: rows });
    } catch (err: unknown) {
      return res.status(500).json({ message: (err as Error).message });
    }
  });

  app.get("/api/admin/ingestion/status", async (_req: Request, res: Response) => {
    try {
      const summary = getIngestionSummary();
      const lastRun = getLatestIngestionRun();
      return res.json({ summary, lastRun, _batchOnly: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ingestion status failed";
      return res.status(500).json({ message: msg });
    }
  });

  app.get("/api/admin/ingestion/staging", async (req: Request, res: Response) => {
    try {
      const status = (req.query.status as string) || "validated";
      const limit = Math.min(parseInt(String(req.query.limit || "30"), 10) || 30, 80);
      const allowed = ["pending", "validated", "rejected", "promoted"];
      const filter = allowed.includes(status) ? (status as typeof allowed[number]) : "validated";
      const rows = listStagingForReview(
        filter === "promoted" ? "promoted" : (filter as "pending" | "validated" | "rejected"),
        limit,
      );
      return res.json({ rows });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Staging list failed";
      return res.status(500).json({ message: msg });
    }
  });

  app.post("/api/admin/ingestion/staging/:fingerprint/approve", async (req: Request, res: Response) => {
    try {
      const fp = decodeURIComponent(String(req.params.fingerprint));
      updateStagingStatus(fp, "validated");
      return res.json({ ok: true, status: "validated" });
    } catch (err: unknown) {
      return res.status(500).json({ message: (err as Error).message });
    }
  });

  app.post("/api/admin/ingestion/staging/:fingerprint/reject", async (req: Request, res: Response) => {
    try {
      const fp = decodeURIComponent(String(req.params.fingerprint));
      updateStagingStatus(fp, "rejected", "admin_rejected");
      return res.json({ ok: true, status: "rejected" });
    } catch (err: unknown) {
      return res.status(500).json({ message: (err as Error).message });
    }
  });

  app.post("/api/admin/ingestion/staging/:fingerprint/promote", async (req: Request, res: Response) => {
    try {
      const fp = decodeURIComponent(String(req.params.fingerprint));
      const ok = await promoteDraftByFingerprint(fp);
      if (!ok) return res.status(400).json({ message: "Promote failed — needs Spoonacular id and valid draft" });
      return res.json({ ok: true, status: "promoted" });
    } catch (err: unknown) {
      return res.status(500).json({ message: (err as Error).message });
    }
  });

  app.get("/api/admin/expansion/stats", async (_req: Request, res: Response) => {
    try {
      const { getExpansionDashboard } = await import("./expansion/recipe-expansion-service.js");
      return res.json(getExpansionDashboard());
    } catch (err: unknown) {
      return res.status(500).json({ message: (err as Error).message });
    }
  });

  app.get("/api/explore/trending", async (req: Request, res: Response) => {
    if (!enforceExploreRateLimit(req, res)) return;
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
        .sort((a, b) => b.score - a.score);

      const { getCuratedPackageDef, CURATED_HALL_PACKAGES } = await import("../shared/curated-hall-packages.js");

      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
      );
      const rotated = [...CURATED_HALL_PACKAGES];
      for (let i = rotated.length - 1; i > 0; i--) {
        const j = ((dayOfYear * (i + 11)) % (i + 1) + i + 1) % (i + 1);
        [rotated[i], rotated[j]] = [rotated[j], rotated[i]];
      }

      const scoreBySlug = new Map<string, number>();
      const hitsBySlug = new Map<string, number>();
      for (const item of sorted) {
        const pkg = CURATED_HALL_PACKAGES.find(
          (p) => p.title.toLowerCase() === item.title.toLowerCase(),
        );
        const slug =
          pkg?.slug ||
          CURATED_HALL_PACKAGES.find((p) =>
            item.title.toLowerCase().includes(p.title.toLowerCase().split(" ")[0]),
          )?.slug;
        if (slug) {
          scoreBySlug.set(slug, (scoreBySlug.get(slug) || 0) + item.score);
          hitsBySlug.set(slug, (hitsBySlug.get(slug) || 0) + item.hit_count);
        }
      }

      const trending = rotated.slice(0, 6).map((pkg) => ({
        title: pkg.title,
        protein: pkg.protein,
        score: scoreBySlug.get(pkg.slug) || 10,
        source: scoreBySlug.has(pkg.slug) ? "hall_activity" : "hall_classic",
        hit_count: hitsBySlug.get(pkg.slug) || 0,
        curatedSlug: pkg.slug,
        image: pkg.heroImage,
        emoji: pkg.emoji,
        cuisineLabel: pkg.cuisineLabel,
        imageAlt: pkg.imageAlt,
      }));

      log(`[explore] Trending: ${trending.length} curated hall items`, "spoonacular");
      return res.json({ trending });
    } catch (err: any) {
      log(`[explore] Trending error: ${err.message}`, "spoonacular");
      return res.json({ trending: [] });
    }
  });

  app.get("/api/explore/discover", async (req: Request, res: Response) => {
    if (!enforceExploreRateLimit(req, res)) return;
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
                .map((r: any) =>
                  normalizeExploreRecipeCard(
                    {
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
                    },
                    "discover",
                  ),
                )
                .filter((r): r is NonNullable<typeof r> => r !== null);
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

      const trimmed = filterDisplayableExploreCards(
        normalizeExploreRecipeList(diverse, "discover-merge"),
      ).slice(0, limit);
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
    if (!enforceExploreRateLimit(req, res)) return;
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
          results: normalizeExploreRecipeList(
            results.map((r) => ({
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
            "random",
          ),
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
            logVerbose(
              `[explore] relaxation="${step.label}" count=${searchResults.results.length} query="${clip(step.q, 40)}"`,
              "explore",
            );
          } else {
            logVerbose(`[explore] search count=${searchResults.results.length}`, "explore");
          }
          return res.json({
            results: normalizeExploreRecipeList(searchResults.results, "search"),
            totalResults: searchResults.totalResults,
            _source: "spoonacular",
            _relaxed: step.label !== "original" ? step.label : undefined,
          });
        }
        if (step.label !== relaxationSteps[relaxationSteps.length - 1].label) {
          logVerbose(`[explore] step="${step.label}" count=0 — relaxing`, "explore");
        }
      }

      log(`[explore] All Spoonacular relaxation steps exhausted — trying curated/catalog before template`, "spoonacular");

      const curatedExplore = pickCuratedExploreSearchCard();
      if (curatedExplore) {
        const curatedCard = normalizeExploreRecipeCard(
          {
            id: curatedExplore.exploreId,
            title: curatedExplore.title,
            image: curatedExplore.image,
            readyInMinutes: curatedExplore.readyInMinutes,
            servings: 6,
            summary: curatedExplore.summary,
            sourceUrl: curatedExplore.sourceUrl,
            _catalogFallback: true,
          },
          "curated",
        );
        if (curatedCard) {
          log(`[explore] Curated import hit: "${curatedExplore.title}" slug=${curatedExplore.slug}`, "spoonacular");
          return res.json({
            results: [curatedCard],
            totalResults: 1,
            _source: "curated",
          });
        }
      }

      const catalogExplore = pickCatalogExploreFallback();
      if (catalogExplore) {
        const catalogCard = normalizeExploreRecipeCard(
          {
            id: catalogExplore.spoonacularId,
            title: catalogExplore.title,
            image: catalogExplore.heroImage,
            readyInMinutes: catalogExplore.readyInMinutes,
            servings: 4,
            summary: catalogExplore.summary,
            _catalogFallback: true,
          },
          "catalog",
        );
        if (catalogCard) {
          log(`[explore] Catalog last-tier hit: "${catalogExplore.title}" id=${catalogExplore.catalogId}`, "spoonacular");
          return res.json({
            results: [catalogCard],
            totalResults: 1,
            _source: "catalog",
          });
        }
      }

      if (!isTemplateFallbackAllowed()) {
        log(`[explore] template_fallback blocked — returning empty`, "spoonacular");
        return res.json({ results: [], totalResults: 0, _source: "none" });
      }

      log(`[explore] Catalog empty — last_resort template_fallback`, "spoonacular");
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

        const exploreTime =
          maxReadyTime && maxReadyTime <= 25
            ? "15-25"
            : maxReadyTime && maxReadyTime <= 40
              ? "25-40"
              : "30-45";
        const fallbackRequest = createDefaultGenerateRequest({
          crew_size: crewSize,
          busy_level: inferBusyLevelFromTime(exploreTime),
          time_available: exploreTime,
          appliances,
          protein: detectedProtein as GenerateRequest["protein"],
          allergens_to_avoid: allergenList,
        });

        const templates = await loadTemplates();
        const filterResult = filterTemplatesWithRelaxation(templates, fallbackRequest);
        if (filterResult.candidates.length === 0) {
          log(`[explore] Firehall fallback: no matching templates`, "spoonacular");
          return res.json({ results: [], totalResults: 0, _source: "none" });
        }
        const template = pickTemplate(filterResult.candidates);
        const protein = chooseProtein(template, fallbackRequest.protein, fallbackRequest.healthiness_preference);
        const fallback = buildFallbackRecipe(template, fallbackRequest, protein);

        const fbResult = normalizeExploreRecipeCard(
          {
            id: -1,
            title: fallback.title,
            image: "",
            readyInMinutes: fallback.timing?.total_minutes || 30,
            servings: crewSize,
            summary: fallback.why_it_fits_tonight || "AI-generated crew meal from the Firehall generator.",
            _firehallFallback: true,
          },
          "firehall-fallback",
        );

        log(`[explore] template_fallback served: "${fallback.title}" crew=${crewSize}`, "spoonacular");
        return res.json({
          results: fbResult ? [fbResult] : [],
          totalResults: fbResult ? 1 : 0,
          _source: "template_fallback",
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
      const slug = routeParam(req.params.slug).toLowerCase().trim();
      const def = getCuratedPackageDef(slug);
      if (!def) {
        return res.status(404).json({ message: "Curated package not found." });
      }
      const rawCrew = parseInt(req.query.crewSize as string, 10);
      const crewSize = Number.isFinite(rawCrew) && rawCrew >= 2 && rawCrew <= 20 ? rawCrew : 6;
      const recipe = buildCuratedClientRecipe(def, crewSize);
      const { getClassicHallMeal, resolveClassicHeroImage } = await import("../shared/classic-hall-meals.js");
      const classicMeta = getClassicHallMeal(slug);
      const heroImage = classicMeta
        ? resolveClassicHeroImage(classicMeta)
        : def.heroImage;
      return res.json({
        slug: def.slug,
        title: def.title,
        displayTitle: def.displayTitle,
        emoji: def.emoji,
        heroImage,
        imageAlt: def.imageAlt,
        tags: def.tags,
        cuisineLabel: def.cuisineLabel,
        spoonacularRecipeId: def.spoonacularRecipeId,
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
    if (!enforceExploreRateLimit(req, res)) return;
    const rawId = routeParam(req.params.id);
    const id = parseInt(rawId, 10);
    const hints = {
      slug: typeof req.query.slug === "string" ? req.query.slug : undefined,
      curatedRecipeId:
        typeof req.query.cid === "string"
          ? req.query.cid
          : typeof req.query.curatedRecipeId === "string"
            ? req.query.curatedRecipeId
            : undefined,
    };

    log(
      `[explore] detail request id=${rawId} parsed=${id} slug=${hints.slug ?? "-"} cid=${hints.curatedRecipeId ?? "-"}`,
      "explore",
    );

    try {
      if (!Number.isFinite(id) || id <= 0) {
        log(`[explore] Detail rejected: invalid id="${rawId}"`, "spoonacular");
        return res.status(400).json({ message: "Invalid recipe ID. Please pick another recipe from the list." });
      }

      const includeNutrition = req.query.nutrition === "true";
      const payload = await withTimeout("explore_detail", 30_000, () =>
        fetchExploreRecipeDetailPayload(id, includeNutrition, hints),
      );

      log(
        `[explore] detail ok id=${id} curated=${Boolean(payload._fromCurated)} curatedRecipeId=${payload._curatedRecipeId ?? "-"} title="${clip(payload.title, 50)}" ings=${payload.ingredients.length} steps=${payload.steps.length}`,
        payload._fromCurated ? "catalog" : "spoonacular",
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
      if (msg.includes("could not be loaded")) {
        log(`[explore] Detail not found: id=${rawId} hints=${JSON.stringify(hints)}`, "catalog");
        return res.status(404).json({ message: msg });
      }
      log(`[explore] Detail error: id=${rawId} hints=${JSON.stringify(hints)} msg=${msg}`, "spoonacular");
      return res.status(500).json({ message: "Failed to load recipe details. Please try again." });
    }
  });

  const { registerFoodImageryRoutes } = await import("./food-imagery/routes.js");
  registerFoodImageryRoutes(app);

  app.get("/api/recipe-hero/meal/:recipeId", async (req: Request, res: Response) => {
    try {
      const { resolveMealHeroImage } = await import("./food-imagery/meal-integration.js");
      const recipeId = String(req.params.recipeId || "");
      const title = typeof req.query.title === "string" ? req.query.title : undefined;
      const signature = typeof req.query.signature === "string" ? req.query.signature : undefined;
      const mealFormat = typeof req.query.meal_format === "string" ? req.query.meal_format : undefined;
      const protein = typeof req.query.protein === "string" ? req.query.protein : undefined;
      const hero = await resolveMealHeroImage(signature, recipeId, title, { mealFormat, protein });
      if (hero.hero_image_status === "ready" && hero.hero_image) {
        res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      } else {
        res.setHeader("Cache-Control", "private, no-cache");
      }
      return res.json(hero);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ hero_image_status: "unavailable", message: msg });
    }
  });

  app.get("/api/recipe-hero/pizza/:styleId", async (req: Request, res: Response) => {
    try {
      const { resolvePizzaHeroImage } = await import("./food-imagery/meal-integration.js");
      const styleId = String(req.params.styleId || "");
      const title = typeof req.query.title === "string" ? req.query.title : undefined;
      const hero = await resolvePizzaHeroImage(styleId, title);
      if (hero.hero_image_status === "ready" && hero.hero_image) {
        res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      } else {
        res.setHeader("Cache-Control", "private, no-cache");
      }
      return res.json(hero);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ hero_image_status: "unavailable", message: msg });
    }
  });

  return httpServer;
}
