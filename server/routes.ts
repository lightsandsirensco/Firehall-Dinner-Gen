import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import { generateRequestSchema, pizzaRequestSchema, hallVoteCreateSchema, type GenerateResponse, type ClientRecipeResponse, type ClientIngredient, type ClientStep, type ClientProteinSafety, type ClientPlating, type ClientTiming } from "@shared/schema";
import { loadTemplates, filterTemplates, filterTemplatesWithRelaxation, pickTemplate, chooseProtein } from "./templates";
import { scanRecipeForAllergens, autoSubstituteAllergens, buildAllergenAvoidList } from "./allergens";
import { auditAndFixRecipe as labelAudit, inferIngredientCategory, type LabelAuditContext } from "./labelAudit";
import { generateRecipe, generateRecipeFromPantry, repairRecipe, buildSafeFallbackRecipe } from "./ai";
import { getVarietyConstraints, recordRecipe } from "./variety-memory";
import { generatePizzaRecipe, pickPizzaConcept } from "./pizza-ai";
import { subscribeToList, trackRecipeEvent, trackShoppingListEvent, validateKlaviyoConfig } from "./klaviyo";
import { getFromPool, refillPool, getPoolSize } from "./recipe-pool";
import { initHallVoteTables, createHallVote, getHallVote, castBallot, closeHallVote, hashVoterFingerprint } from "./hall-vote-store";
import { addFavourite, getFavourites, removeFavourite } from "./favourites";
import { buildFallbackRecipe, trackFallbackTemplateId, getRecentFallbackTemplateIds } from "./fallback-recipe";
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
      return {
        n: i + 1,
        title: heading,
        heat: "",
        minutes: 0,
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
      if (recipe.tags.high_protein) tags.push("High Protein");
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
      meal_format: mealFormat || recipe.meal_style || "",
      servings: crewSize,
      tags,
      timing,
      protein_safety: proteinSafety,
      ingredients,
      steps,
      plating,
      macros_per_serving: recipe.macros_per_serving || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
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
          log(`[allergen-postcheck] Still found violations after substitution: ${rescan.violations.join("; ")}`, "allergen");
        }
      } else {
        log(`[allergen-postcheck] Clean — no allergen violations found`, "allergen");
      }
    }

    const ctx: LabelAuditContext = auditCtx || {
      selectedAppliances: [],
      selectedAllergens: allergens,
      selectedHealthiness: "balanced",
      selectedBudget: "standard",
      selectedCuisine: "",
      selectedMealFormat: mealFormat,
      selectedProteins: [],
      chosenProtein: recipe.chosen_protein || "",
      crewSize,
    };

    const audit = labelAudit(recipe, ctx);
    recipe = audit.recipe;

    if (audit.fixesApplied.length > 0) {
      log(`[label-audit] Applied ${audit.fixesApplied.length} fixes: ${audit.fixesApplied.join("; ")}`, "audit");
    }

    const merged = { ...recipe, ...extras, _signature: validation.signature };
    const client = normalizeToClientFormat(merged, crewSize, mealFormat);
    const base: Record<string, any> = { ...client };

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
    const signature = validation.signature || result._signature || "";
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

      const templates = await loadTemplates();
      const allergens = request.allergens_to_avoid || [];
      const { candidates, relaxed: filtersRelaxed, relaxedConstraints } = filterTemplatesWithRelaxation(templates, request);

      let noTemplateMode = false;
      if (candidates.length === 0 && allergens.length > 0) {
        noTemplateMode = true;
        log(`[allergen] No templates match even after relaxation — entering AI-only allergen-safe mode`, "ai");
      } else if (candidates.length === 0) {
        cancelRequest(sessionKey, requestId);
        return res.status(404).json({ message: "No matching templates found. Try loosening your filters." });
      }

      const chosen = noTemplateMode ? null : pickTemplate(candidates, request.last_template_id);
      const chosenProtein = request.use_what_we_have ? "pantry" : noTemplateMode ? request.proteins[0] || "chicken" : chooseProtein(chosen!, request.proteins, request.healthiness_preference);
      log(`Protein selected: ${chosenProtein} (from user choices: ${request.proteins.join(", ")})`, "ai");
      const cacheKey = noTemplateMode ? `allergen-safe-${chosenProtein}-${allergens.sort().join("-")}-${request.crew_size}` : buildCacheKey(chosen!.template_id, request, chosenProtein);
      const startTime = Date.now();

      const auditCtx: LabelAuditContext = {
        selectedAppliances: request.appliances || [],
        selectedAllergens: allergens,
        selectedHealthiness: request.healthiness_preference || "balanced",
        selectedBudget: request.budget_level || "standard",
        selectedCuisine: request.cuisine_style || "",
        selectedMealFormat: request.meal_format || "",
        selectedProteins: request.proteins || [],
        chosenProtein,
        crewSize: request.crew_size || 4,
      };

      const recentStyles = request.recent_meal_styles || [];
      const lastStyle = recentStyles[0] || "";
      const preferDiff = request.prefer_different_style || false;

      const cached = getCachedRecipe(cacheKey);
      if (cached) {
        const cachedStyle = cached.meal_style || "";
        const styleConflict = preferDiff && cachedStyle && cachedStyle.toLowerCase() === lastStyle.toLowerCase();
        if (styleConflict) {
          log(`Cache HIT but style conflict (${cachedStyle} === ${lastStyle}) — bypassing cache for rotation`, "variety");
        } else {
          log(`Cache HIT for key ${cacheKey} (template ${chosen.template_id})`, "cache");
          recordRecipe(cached);
          logUsage({
            cacheKey,
            templateId: parseInt(chosen.template_id),
            cacheHit: true,
            latencyMs: Date.now() - startTime,
            ipHash,
            sessionId,
          });
          if (!cached.meal_style) {
            const inferredStructure = pickStructure(request.appliances, request.time_available, recentStyles, false);
            cached.meal_style = STRUCTURE_DISPLAY[inferredStructure] || inferredStructure;
          }
          const cacheDebug = req.query.debug === "1" || (req.body as any).debug === true;
          const cacheValCtx: RecipeValidationContext = {
            chosenProtein: chosenProtein,
            meal_style: cached.meal_style || "",
            cuisine: request.cuisine_style || "any",
            appliances: request.appliances,
            allergens: request.allergens_to_avoid || [],
            recentSignatures: (req.body as any).recentSignatures || [],
            currentRecipeSignature: (req.body as any).currentRecipeSignature || undefined,
          };
          const cacheVal = validateAndFixRecipe(cached, cacheValCtx);
          recordSignature(chosenProtein, cacheVal.signature);
          return sendRecipeResponse(res, cacheVal, {}, cacheDebug, request.crew_size, request.meal_format, allergens, auditCtx, ipHash, sessionId, requestId);
        }
      }

      if (!request.use_what_we_have) {
        const poolEntry = getFromPool(request, request.last_template_id);
        if (poolEntry) {
          const poolStyle = poolEntry.recipe.meal_style || "";
          const poolConflict = preferDiff && poolStyle && poolStyle.toLowerCase() === lastStyle.toLowerCase();
          if (poolConflict) {
            log(`Pool entry style conflict (${poolStyle} === ${lastStyle}) — bypassing pool for rotation`, "variety");
          } else {
            recordRecipe(poolEntry.recipe);
            setCachedRecipe(poolEntry.cacheKey, poolEntry.templateId, poolEntry.recipe);
            logUsage({
              cacheKey: poolEntry.cacheKey,
              templateId: poolEntry.templateId,
              cacheHit: false,
              estimatedCost: poolEntry.estimatedCost,
              latencyMs: Date.now() - startTime,
              ipHash,
              sessionId,
            });
            log(`Pool served in ${Date.now() - startTime}ms`, "perf");
            if (!poolEntry.recipe.meal_style) {
              const inferredStructure = pickStructure(request.appliances, request.time_available, recentStyles, false);
              poolEntry.recipe.meal_style = STRUCTURE_DISPLAY[inferredStructure] || inferredStructure;
            }
            const poolDebug = req.query.debug === "1" || (req.body as any).debug === true;
            const poolValCtx: RecipeValidationContext = {
              chosenProtein: chosenProtein,
              meal_style: poolEntry.recipe.meal_style || "",
              cuisine: request.cuisine_style || "any",
              appliances: request.appliances,
              allergens: request.allergens_to_avoid || [],
              recentSignatures: (req.body as any).recentSignatures || [],
              currentRecipeSignature: (req.body as any).currentRecipeSignature || undefined,
            };
            const poolVal = validateAndFixRecipe(poolEntry.recipe, poolValCtx);
            recordSignature(chosenProtein, poolVal.signature);
            return sendRecipeResponse(res, poolVal, {}, poolDebug, request.crew_size, request.meal_format, allergens, auditCtx, ipHash, sessionId, requestId);
          }
        }
      }

      const dailyBudget = parseFloat(process.env.DAILY_LLM_BUDGET_USD || "5.00");
      const currentSpend = getDailySpend();

      if (currentSpend >= dailyBudget) {
        cancelRequest(sessionKey, requestId);
        log(`Budget exceeded: $${currentSpend.toFixed(4)} / $${dailyBudget.toFixed(2)}`, "budget");
        return res.status(503).json({
          message: "Daily recipe generation limit reached. Cached recipes are still available. Please try again tomorrow.",
          budget_exceeded: true,
        });
      }

      const isColdStart = firstRequestSinceBoot;
      if (firstRequestSinceBoot) {
        log("Cold start: first AI request since boot", "perf");
        firstRequestSinceBoot = false;
      }

      const varietyConstraints = getVarietyConstraints(request.cuisine_style);

      const MEAL_FORMAT_TO_STRUCTURE: Record<string, StructureType> = {
        burger: "burger",
        tacos: "taco",
        wrap: "wrap",
        bowl: "bowl",
        pasta: "pasta",
        salad: "salad",
        sheet_pan: "sheet-pan",
        stir_fry: "stir-fry",
        soup_chili: "soup-stew",
        breakfast: "breakfast-for-dinner",
        loaded_fries: "loaded-fries",
      };

      const explicitStructure = request.meal_format && request.meal_format !== "random"
        ? MEAL_FORMAT_TO_STRUCTURE[request.meal_format]
        : undefined;

      const structureType: StructureType = explicitStructure || pickStructure(
        request.appliances,
        request.time_available,
        request.recent_meal_styles || [],
        request.prefer_different_style || false,
        request.recent_meal_styles?.[0],
      );
      const mealStyleDisplay = STRUCTURE_DISPLAY[structureType] || structureType;
      log(`[structure] Selected: ${structureType} (${mealStyleDisplay}) for protein: ${chosenProtein} | template: ${chosen ? chosen.template_id : "none"} | clientRecent: [${(request.recent_meal_styles || []).join(",")}] | preferDiff: ${request.prefer_different_style}`, "variety");

      const debugMode = req.query.debug === "1" || (req.body as any).debug === true;

      const validationCtx: RecipeValidationContext = {
        chosenProtein: chosenProtein,
        meal_style: mealStyleDisplay,
        cuisine: request.cuisine_style || "any",
        appliances: request.appliances,
        allergens: request.allergens_to_avoid || [],
        recentSignatures: (req.body as any).recentSignatures || [],
        currentRecipeSignature: (req.body as any).currentRecipeSignature || undefined,
      };

      const FAST_FALLBACK_MS = 8_000;

      const recentFbIds = getRecentFallbackTemplateIds();
      let fallbackTemplate = chosen || (candidates.length > 0 ? candidates[0] : null);
      if (fallbackTemplate && candidates.length > 1) {
        const nonRecent = candidates.filter(c => !recentFbIds.includes(parseInt(c.template_id)));
        const pool = nonRecent.length > 0 ? nonRecent : candidates;
        const chosenId = chosen ? chosen.template_id : "";
        const otherPool = pool.filter(c => c.template_id !== chosenId);
        fallbackTemplate = otherPool.length > 0
          ? otherPool[Math.floor(Math.random() * otherPool.length)]
          : pool[Math.floor(Math.random() * pool.length)];
      }
      const fallbackProtein = request.use_what_we_have ? "pantry" : fallbackTemplate ? chooseProtein(fallbackTemplate, request.proteins, request.healthiness_preference) : chosenProtein;
      const fallbackRecipe = fallbackTemplate
        ? buildFallbackRecipe(fallbackTemplate, request, fallbackProtein, structureType)
        : buildSafeFallbackRecipe(request.meal_format || mealStyleDisplay, request.crew_size);

      const templateForAI = chosen || fallbackTemplate;
      const aiPromise = (async () => {
        if (!templateForAI) {
          return await generateRecipe(
            { template_id: "0", template_name: "Open Recipe", style: "flexible", base_idea_description: "crew-sized meal", busy_level_fit: request.busy_level, time_range_minutes: request.time_available, appliances_needed: request.appliances.join("|"), proteins_allowed: request.proteins.join("|"), allergens_possible: "none" } as TemplateRow,
            request, chosenProtein, varietyConstraints, structureType
          );
        }
        const result = request.use_what_we_have
          ? await generateRecipeFromPantry(templateForAI, request, varietyConstraints, structureType)
          : await generateRecipe(templateForAI, request, chosenProtein, varietyConstraints, structureType);
        return result;
      })();

      const fastTimer = new Promise<"timeout">((resolve) =>
        setTimeout(() => resolve("timeout"), FAST_FALLBACK_MS)
      );

      const raceResult = await Promise.race([
        aiPromise.then((r) => ({ type: "ai" as const, result: r })),
        fastTimer.then(() => ({ type: "timeout" as const })),
      ]).catch((aiError: any) => {
        return { type: "error" as const, error: aiError };
      });

      if (raceResult.type === "ai") {
        let { recipe, tokensIn, tokensOut } = raceResult.result;
        let totalTokensIn = tokensIn;
        let totalTokensOut = tokensOut;
        trackStructure(structureType);
        recordRecipe(recipe);

        const aiRecipeWithStyle = { ...recipe, meal_style: mealStyleDisplay };
        let aiValidation = validateAndFixRecipe(aiRecipeWithStyle, validationCtx);

        const contentErrors = validateRecipe(aiValidation.recipe, request.meal_format);
        const blockingErrors = contentErrors.filter(e =>
          e.startsWith("format_missing_required:") ||
          e.startsWith("format_has_forbidden:") ||
          e.startsWith("format_missing_step:") ||
          e.startsWith("format_forbidden_step:") ||
          e.startsWith("timing_invalid:")
        );

        if (blockingErrors.length > 0) {
          log(`[repair-loop] Attempt 1 failed with ${blockingErrors.length} blocking errors — requesting LLM repair`, "ai");
          try {
            const repairResult = await repairRecipe(
              aiValidation.recipe,
              contentErrors,
              chosen,
              chosenProtein,
              request.budget_level || "standard"
            );

            if (repairResult) {
              totalTokensIn += repairResult.tokensIn;
              totalTokensOut += repairResult.tokensOut;
              const repairedWithStyle = { ...repairResult.recipe, meal_style: mealStyleDisplay };
              aiValidation = validateAndFixRecipe(repairedWithStyle, validationCtx);

              const repairErrors = validateRecipe(aiValidation.recipe, request.meal_format);
              const repairBlocking = repairErrors.filter(e =>
                e.startsWith("format_missing_required:") ||
                e.startsWith("format_has_forbidden:") ||
                e.startsWith("format_missing_step:") ||
                e.startsWith("format_forbidden_step:")
              );

              if (repairBlocking.length > 0) {
                log(`[repair-loop] Attempt 2 still invalid (${repairBlocking.length} blocking) — serving safe fallback`, "ai");
                const safeFb = buildSafeFallbackRecipe(request.meal_format || mealStyleDisplay, request.crew_size);
                const safeFbWithStyle = { ...safeFb, meal_style: mealStyleDisplay, _fallback: true };
                aiValidation = validateAndFixRecipe(safeFbWithStyle as any, validationCtx);
              } else {
                log(`[repair-loop] Repair succeeded on attempt 2`, "ai");
              }
            } else {
              log(`[repair-loop] Repair call failed — serving safe fallback`, "ai");
              const safeFb = buildSafeFallbackRecipe(request.meal_format || mealStyleDisplay, request.crew_size);
              const safeFbWithStyle = { ...safeFb, meal_style: mealStyleDisplay, _fallback: true };
              aiValidation = validateAndFixRecipe(safeFbWithStyle as any, validationCtx);
            }
          } catch (repairErr: any) {
            log(`[repair-loop] Repair error: ${repairErr.message} — serving safe fallback`, "ai");
            const safeFb = buildSafeFallbackRecipe(request.meal_format || mealStyleDisplay, request.crew_size);
            const safeFbWithStyle = { ...safeFb, meal_style: mealStyleDisplay, _fallback: true };
            aiValidation = validateAndFixRecipe(safeFbWithStyle as any, validationCtx);
          }
        }

        const estimatedCost =
          (totalTokensIn / 1000) * COST_PER_1K_INPUT +
          (totalTokensOut / 1000) * COST_PER_1K_OUTPUT;
        const templateId = chosen ? parseInt(chosen.template_id) : 0;
        setCachedRecipe(cacheKey, templateId, aiValidation.recipe);
        logUsage({
          cacheKey,
          templateId,
          cacheHit: false,
          tokensIn: totalTokensIn,
          tokensOut: totalTokensOut,
          estimatedCost,
          latencyMs: Date.now() - startTime,
          ipHash,
          sessionId,
        });
        log(`Generated in ${Date.now() - startTime}ms | ${totalTokensIn}in/${totalTokensOut}out | ~$${estimatedCost.toFixed(5)}${raceResult.result.fallback ? " [FALLBACK_REMIX]" : ""}${isColdStart ? " [COLD START]" : ""}`, "perf");
        if (process.env.ENABLE_POOL_WARMUP === "true") {
          refillPool().catch(() => {});
        }
        recordSignature(chosenProtein, aiValidation.signature);
        const responseExtras: Record<string, any> = {};
        if (filtersRelaxed) responseExtras._filtersRelaxed = true;
        return sendRecipeResponse(res, aiValidation, responseExtras, debugMode, request.crew_size, request.meal_format, allergens, auditCtx, ipHash, sessionId, requestId);
      }

      if (raceResult.type === "timeout") {
        const fbTemplateId = fallbackTemplate ? parseInt(fallbackTemplate.template_id) : 0;
        if (fbTemplateId) trackFallbackTemplateId(fbTemplateId);
        trackStructure(structureType);
        log(`AI exceeded ${FAST_FALLBACK_MS}ms — serving fast fallback (template ${fbTemplateId}, structure ${structureType}), AI continues in background${isColdStart ? " [COLD START]" : ""}`, "fallback");
        recordRecipe(fallbackRecipe);
        logUsage({
          cacheKey,
          templateId: fbTemplateId,
          cacheHit: false,
          latencyMs: Date.now() - startTime,
          ipHash,
          sessionId,
        });

        const bgTemplateId = chosen ? parseInt(chosen.template_id) : 0;
        aiPromise
          .then((aiResult) => {
            const { recipe, tokensIn, tokensOut } = aiResult;
            const estimatedCost =
              (tokensIn / 1000) * COST_PER_1K_INPUT +
              (tokensOut / 1000) * COST_PER_1K_OUTPUT;
            setCachedRecipe(cacheKey, bgTemplateId, recipe);
            recordRecipe(recipe);
            log(`Background AI completed in ${Date.now() - startTime}ms — cached for next request | ~$${estimatedCost.toFixed(5)}`, "perf");
          })
          .catch((bgErr: any) => {
            log(`Background AI also failed: ${bgErr.message}`, "fallback");
          });

        const fbRecipeWithStyle = { ...fallbackRecipe, _fallback: true, meal_style: mealStyleDisplay };
        const fbValidation = validateAndFixRecipe(fbRecipeWithStyle as any, validationCtx);
        recordSignature(chosenProtein, fbValidation.signature);
        const fbExtras: Record<string, any> = { _fallback: true };
        if (filtersRelaxed) fbExtras._filtersRelaxed = true;
        return sendRecipeResponse(res, fbValidation, fbExtras, debugMode, request.crew_size, request.meal_format, allergens, auditCtx, ipHash, sessionId, requestId);
      }

      const aiError = (raceResult as any).error;
      const errorCategory = aiError?.message?.includes("timed out") ? "timeout"
        : aiError?.message?.includes("empty") ? "ai_empty"
        : aiError?.message?.includes("parse") ? "json_parse_failed"
        : aiError?.message?.includes("validation") ? "validation_failed"
        : "ai_error";
      const fbTemplateId2 = fallbackTemplate ? parseInt(fallbackTemplate.template_id) : 0;
      if (fbTemplateId2) trackFallbackTemplateId(fbTemplateId2);
      trackStructure(structureType);
      log(`AI generation failed (${errorCategory}): ${aiError?.message}${isColdStart ? " [COLD START]" : ""} — serving fallback (template ${fbTemplateId2}, structure ${structureType})`, "fallback");
      recordRecipe(fallbackRecipe);
      logUsage({
        cacheKey,
        templateId: fbTemplateId2,
        cacheHit: false,
        latencyMs: Date.now() - startTime,
        ipHash,
        sessionId,
      });
      log(`Fallback served in ${Date.now() - startTime}ms${isColdStart ? " [COLD START]" : ""}`, "perf");
      const errFbWithStyle = { ...fallbackRecipe, _fallback: true, meal_style: mealStyleDisplay };
      const errFbValidation = validateAndFixRecipe(errFbWithStyle as any, validationCtx);
      recordSignature(chosenProtein, errFbValidation.signature);
      const errExtras: Record<string, any> = { _fallback: true };
      if (filtersRelaxed) errExtras._filtersRelaxed = true;
      return sendRecipeResponse(res, errFbValidation, errExtras, debugMode, request.crew_size, request.meal_format, allergens, auditCtx, ipHash, sessionId, requestId);
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

  return httpServer;
}
