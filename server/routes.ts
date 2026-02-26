import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import { generateRequestSchema, pizzaRequestSchema, hallVoteCreateSchema } from "@shared/schema";
import { loadTemplates, filterTemplates, pickTemplate, chooseProtein } from "./templates";
import { generateRecipe, generateRecipeFromPantry } from "./ai";
import { getVarietyConstraints, recordRecipe } from "./variety-memory";
import { generatePizzaRecipe, pickPizzaConcept } from "./pizza-ai";
import { subscribeToList, trackRecipeEvent, trackShoppingListEvent, validateKlaviyoConfig } from "./klaviyo";
import { getFromPool, refillPool, getPoolSize } from "./recipe-pool";
import { initHallVoteTables, createHallVote, getHallVote, castBallot, closeHallVote, hashVoterFingerprint } from "./hall-vote-store";
import { addFavourite, getFavourites, removeFavourite } from "./favourites";
import { buildFallbackRecipe, trackFallbackTemplateId, getRecentFallbackTemplateIds } from "./fallback-recipe";
import { pickStructure, trackStructure } from "./structure-variety";
import { log } from "./index";
import {
  initCacheStore,
  buildCacheKey,
  buildPizzaCacheKey,
  getCachedRecipe,
  getCachedPizzaRecipe,
  setCachedRecipe,
  setCachedPizzaRecipe,
  checkRateLimit,
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
          message: `Hourly limit reached (10 recipes/hour). You have ${hourlyCheck.remaining} remaining. Try again later.`,
          retry_after_seconds: 3600,
        });
      }

      const sessionBurst = checkRateLimit(`burst:session:${sessionId}`, 60_000, 3);
      if (!sessionBurst.allowed) {
        return res.status(429).json({
          message: "Slow down! Maximum 3 recipes per minute.",
          retry_after_seconds: 60,
        });
      }

      const sessionHourly = checkRateLimit(`hourly:session:${sessionId}`, 3_600_000, 10);
      if (!sessionHourly.allowed) {
        return res.status(429).json({
          message: "Hourly limit reached (10 recipes/hour). Try again later.",
          retry_after_seconds: 3600,
        });
      }

      const parsed = generateRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: " + parsed.error.message });
      }

      const request = parsed.data;

      if (request.use_what_we_have && (!request.ingredients_on_hand || request.ingredients_on_hand.length === 0)) {
        return res.status(400).json({ message: "Please enter at least one ingredient when using 'Use What's in the Fridge' mode." });
      }

      const templates = await loadTemplates();
      const candidates = filterTemplates(templates, request);

      if (candidates.length === 0) {
        return res.status(404).json({ message: "No matching templates found. Try loosening your filters." });
      }

      const chosen = pickTemplate(candidates, request.last_template_id);
      const chosenProtein = request.use_what_we_have ? "pantry" : chooseProtein(chosen, request.proteins, request.healthiness_preference);
      log(`Protein selected: ${chosenProtein} (from user choices: ${request.proteins.join(", ")})`, "ai");
      const cacheKey = buildCacheKey(chosen.template_id, request, chosenProtein);
      const startTime = Date.now();

      const cached = getCachedRecipe(cacheKey);
      if (cached) {
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
        return res.json(cached);
      }

      if (!request.use_what_we_have) {
        const poolEntry = getFromPool(request, request.last_template_id);
        if (poolEntry) {
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
          return res.json(poolEntry.recipe);
        }
      }

      const dailyBudget = parseFloat(process.env.DAILY_LLM_BUDGET_USD || "5.00");
      const currentSpend = getDailySpend();

      if (currentSpend >= dailyBudget) {
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

      const structureType = pickStructure(request.appliances, request.time_available);
      log(`[structure] Selected: ${structureType} for protein: ${chosenProtein}`, "variety");

      const FAST_FALLBACK_MS = 8_000;

      const recentFbIds = getRecentFallbackTemplateIds();
      let fallbackTemplate = chosen;
      if (candidates.length > 1) {
        const nonRecent = candidates.filter(c => !recentFbIds.includes(parseInt(c.template_id)));
        const pool = nonRecent.length > 0 ? nonRecent : candidates;
        const otherPool = pool.filter(c => c.template_id !== chosen.template_id);
        fallbackTemplate = otherPool.length > 0
          ? otherPool[Math.floor(Math.random() * otherPool.length)]
          : pool[Math.floor(Math.random() * pool.length)];
      }
      const fallbackProtein = request.use_what_we_have ? "pantry" : chooseProtein(fallbackTemplate, request.proteins, request.healthiness_preference);
      const fallbackRecipe = buildFallbackRecipe(fallbackTemplate, request, fallbackProtein, structureType);

      const aiPromise = (async () => {
        const result = request.use_what_we_have
          ? await generateRecipeFromPantry(chosen, request, varietyConstraints, structureType)
          : await generateRecipe(chosen, request, chosenProtein, varietyConstraints, structureType);
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
        const { recipe, tokensIn, tokensOut } = raceResult.result;
        trackStructure(structureType);
        recordRecipe(recipe);
        const estimatedCost =
          (tokensIn / 1000) * COST_PER_1K_INPUT +
          (tokensOut / 1000) * COST_PER_1K_OUTPUT;
        setCachedRecipe(cacheKey, parseInt(chosen.template_id), recipe);
        logUsage({
          cacheKey,
          templateId: parseInt(chosen.template_id),
          cacheHit: false,
          tokensIn,
          tokensOut,
          estimatedCost,
          latencyMs: Date.now() - startTime,
          ipHash,
          sessionId,
        });
        log(`Generated in ${Date.now() - startTime}ms | ${tokensIn}in/${tokensOut}out | ~$${estimatedCost.toFixed(5)}${raceResult.result.fallback ? " [FALLBACK_REMIX]" : ""}${isColdStart ? " [COLD START]" : ""}`, "perf");
        if (process.env.ENABLE_POOL_WARMUP === "true") {
          refillPool().catch(() => {});
        }
        return res.json(recipe);
      }

      if (raceResult.type === "timeout") {
        const fbTemplateId = parseInt(fallbackTemplate.template_id);
        trackFallbackTemplateId(fbTemplateId);
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

        aiPromise
          .then((aiResult) => {
            const { recipe, tokensIn, tokensOut } = aiResult;
            const estimatedCost =
              (tokensIn / 1000) * COST_PER_1K_INPUT +
              (tokensOut / 1000) * COST_PER_1K_OUTPUT;
            setCachedRecipe(cacheKey, parseInt(chosen.template_id), recipe);
            recordRecipe(recipe);
            log(`Background AI completed in ${Date.now() - startTime}ms — cached for next request | ~$${estimatedCost.toFixed(5)}`, "perf");
          })
          .catch((bgErr: any) => {
            log(`Background AI also failed: ${bgErr.message}`, "fallback");
          });

        return res.json({ ...fallbackRecipe, _fallback: true });
      }

      const aiError = (raceResult as any).error;
      const errorCategory = aiError?.message?.includes("timed out") ? "timeout"
        : aiError?.message?.includes("empty") ? "ai_empty"
        : aiError?.message?.includes("parse") ? "json_parse_failed"
        : aiError?.message?.includes("validation") ? "validation_failed"
        : "ai_error";
      const fbTemplateId = parseInt(fallbackTemplate.template_id);
      trackFallbackTemplateId(fbTemplateId);
      trackStructure(structureType);
      log(`AI generation failed (${errorCategory}): ${aiError?.message}${isColdStart ? " [COLD START]" : ""} — serving fallback (template ${fbTemplateId}, structure ${structureType})`, "fallback");
      recordRecipe(fallbackRecipe);
      logUsage({
        cacheKey,
        templateId: fbTemplateId,
        cacheHit: false,
        latencyMs: Date.now() - startTime,
        ipHash,
        sessionId,
      });
      log(`Fallback served in ${Date.now() - startTime}ms${isColdStart ? " [COLD START]" : ""}`, "perf");
      return res.json({ ...fallbackRecipe, _fallback: true });
    } catch (error: any) {
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
