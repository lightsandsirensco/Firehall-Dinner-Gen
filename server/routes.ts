import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import { generateRequestSchema, pizzaRequestSchema } from "@shared/schema";
import { loadTemplates, filterTemplates, pickTemplate, chooseProtein } from "./templates";
import { generateRecipe, generateRecipeFromPantry } from "./ai";
import { generatePizzaRecipe, pickPizzaConcept } from "./pizza-ai";
import { subscribeToList, trackRecipeEvent, trackShoppingListEvent } from "./klaviyo";
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
      const cacheKey = buildCacheKey(chosen.template_id, request, chosenProtein);
      const startTime = Date.now();

      const cached = getCachedRecipe(cacheKey);
      if (cached) {
        log(`Cache HIT for key ${cacheKey} (template ${chosen.template_id})`, "cache");
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

      const dailyBudget = parseFloat(process.env.DAILY_LLM_BUDGET_USD || "5.00");
      const currentSpend = getDailySpend();

      if (currentSpend >= dailyBudget) {
        log(`Budget exceeded: $${currentSpend.toFixed(4)} / $${dailyBudget.toFixed(2)}`, "budget");
        return res.status(503).json({
          message: "Daily recipe generation limit reached. Cached recipes are still available. Please try again tomorrow.",
          budget_exceeded: true,
        });
      }

      const { recipe, tokensIn, tokensOut } = request.use_what_we_have
        ? await generateRecipeFromPantry(chosen, request)
        : await generateRecipe(chosen, request, chosenProtein);

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

      log(`LLM call: ${tokensIn} in / ${tokensOut} out, ~$${estimatedCost.toFixed(5)}, daily total: $${(currentSpend + estimatedCost).toFixed(4)}`, "cost");

      return res.json(recipe);
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
      const { email, recipe_title, primary_protein, ingredients, steps, macros, healthiness_level, crew_size, timestamp } = req.body;

      if (!email || !recipe_title) {
        return res.status(400).json({ message: "Email and recipe title are required." });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email address." });
      }

      await Promise.all([
        subscribeToList(email),
        trackRecipeEvent(email, {
          recipe_title,
          primary_protein: primary_protein || "",
          healthiness_level: healthiness_level || "",
          crew_size: crew_size || 0,
          ingredients: ingredients || [],
          steps: steps || [],
          macros: macros || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
          generated_at: timestamp || new Date().toISOString(),
        }),
      ]);

      return res.json({ success: true, message: "Recipe sent. Check your inbox." });
    } catch (error: any) {
      log(`Email recipe error: ${error.message}`, "klaviyo");
      return res.status(500).json({ message: "Failed to send recipe. Please try again." });
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
        return res.status(400).json({ message: "Invalid email address." });
      }

      await Promise.all([
        subscribeToList(email),
        trackShoppingListEvent(email, {
          recipe_title,
          shopping_list_sections: shopping_list_sections || [],
          generator_type: generator_type || "meal",
          timestamp: timestamp || new Date().toISOString(),
        }),
      ]);

      return res.json({ success: true, message: "Shopping list sent. Check your inbox." });
    } catch (error: any) {
      log(`Email shopping list error: ${error.message}`, "klaviyo");
      return res.status(500).json({ message: "Failed to send shopping list. Please try again." });
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

      log(`Pizza LLM call: ${tokensIn} in / ${tokensOut} out, ~$${estimatedCost.toFixed(5)}`, "cost");

      return res.json(recipe);
    } catch (error: any) {
      console.error("Pizza generate error:", error);
      return res.status(500).json({ message: error.message || "Failed to generate pizza recipe" });
    }
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
      today: stats.today,
      last7Days: stats.last7Days,
      recentLogs: stats.recentLogs,
      topIps: stats.topIps,
      topSessions: stats.topSessions,
    });
  });

  return httpServer;
}
