/**
 * Shift Planner v2 API — authenticated, own-data only. Plans the shift under
 * way, otherwise the user's next scheduled shift (available to Free users).
 *
 *   GET   /api/shift-plan        → ShiftPlanView
 *   PATCH /api/shift-plan/slot   → set/clear recipe, skip, BYO, lock, crew size for one meal
 *   POST  /api/shift-plan/fill   → auto-fill the shift, or pick/swap specific meals
 *
 *   GET   /api/shift-plan/shopping-list     → the shift's consolidated list (null until built)
 *   POST  /api/shift-plan/shopping-list     → build / bring up to date (with device pantry)
 *   POST  /api/shift-plan/shopping-list/op  → check, add manual item, remove, clear checked, undo
 *
 * The shopping list is part of planning the next shift, so it is synced for
 * every signed-in user — no entitlement check.
 *
 * Auto-fill uses the existing curated-only Pick Tonight pipeline
 * (runLocalFirstGeneratePipeline) — no AI. The user's personalized base
 * request is validated and entitlement-gated exactly like /api/generate.
 */
import type { Express, Response } from "express";
import { requireCsrf } from "../csrf.js";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import { log, logError } from "../logger.js";
import { generateRequestSchema, type GenerateRequest } from "../../shared/schema.js";
import { coerceGenerateRequestBody, sanitizeGenerateRequest } from "../sanitize-request.js";
import { resolveUserBilling } from "../billing/store.js";
import { hasFeature } from "../../shared/billing/types.js";
import { gateFoodsToAvoidByEntitlement } from "../generation/foods-to-avoid-gate.js";
import { loadEntitledNutritionGoals } from "../generation/nutrition-goals-gate.js";
import { computeHistorySignals } from "../generation/history-personalization.js";
import { listRecentCookedSlugsOldestFirst } from "../meal-history/store.js";
import { mergeRecentSlugSources } from "../../shared/meal-rotation/weighted-pick.js";
import { peekRateLimit, recordRateLimit } from "../cache-store.js";
import { getApprovedCatalog } from "../approved-catalog-cache.js";
import { getCuratedRecipeBySlug } from "../curated-recipe-store.js";
import {
  approvedCatalogCardImagePath,
  approvedCatalogRecipePath,
  type ApprovedCatalogEntry,
} from "../../shared/approved-catalog.js";
import { cacheSafeImageUrl } from "../../shared/editorial-image-delivery.js";
import {
  getMealSlotPreferencesForUser,
  getScheduleForUser,
  initScheduleStore,
  listOverridesForUser,
} from "../schedule/store.js";
import {
  shiftListOpSchema,
  shiftListOpenSchema,
  shiftPlanFillSchema,
  shiftPlanSlotPatchSchema,
} from "../../shared/shift-plan/schema.js";
import { GENERATOR_MAX_CREW, GENERATOR_MIN_CREW } from "../../shared/shift-plan/plan.js";
import type { PlannedRecipe } from "../../shared/shift-plan/types.js";
import type { ShoppingRecipeInput } from "../../shared/shopping/index.js";
import { getRecipeBaseServings } from "../../shared/recipe/crew-scaling-config.js";
import { loadCanonicalCatalogPage } from "../meal-catalog/canonical-page.js";
import { readBreakfastRecipePageFromDisk } from "../breakfast-catalog/page-store.js";
import { pgShiftPlanRepo } from "./store.js";
import { pgShiftListRepo } from "./shopping-store.js";
import { applyShiftListAction, getShiftList, openShiftList, type ShiftListDeps } from "./shopping-service.js";
import { createSlotPicker } from "./picker.js";
import {
  ShiftPlanError,
  fillShiftPlan,
  getShiftPlan,
  patchShiftPlanSlot,
  type ShiftPlanDeps,
  type SlotPicker,
} from "./service.js";

const FILL_WINDOW_MS = 60_000;
const FILL_MAX_PER_WINDOW = 20;
const LIST_OP_MAX_PER_WINDOW = 120;

let storeReady = false;
async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initScheduleStore();
    storeReady = true;
  }
}

let catalogIndex: { source: unknown; bySlug: Map<string, ApprovedCatalogEntry> } | null = null;
function catalogEntry(slug: string): ApprovedCatalogEntry | undefined {
  const catalog = getApprovedCatalog();
  if (!catalogIndex || catalogIndex.source !== catalog) {
    catalogIndex = { source: catalog, bySlug: new Map(catalog.recipes.map((r) => [r.slug.toLowerCase(), r])) };
  }
  return catalogIndex.bySlug.get(slug.toLowerCase());
}

export function resolvePlannedRecipe(slug: string): PlannedRecipe | null {
  const entry = catalogEntry(slug);
  let curated: ReturnType<typeof getCuratedRecipeBySlug> = null;
  try {
    curated = getCuratedRecipeBySlug(slug);
  } catch {
    curated = null;
  }
  if (!entry && !curated) return null;
  const imageUrl = entry
    ? cacheSafeImageUrl(entry.thumbImage || approvedCatalogCardImagePath(entry.slug, entry.kind), entry.thumbCacheVersion)
    : curated?.heroImage || null;
  const totalMinutes = curated?.totalMinutes || entry?.cookTime || null;
  return {
    slug,
    title: entry?.title ?? curated!.title,
    imageUrl,
    totalMinutes,
    path: approvedCatalogRecipePath(slug),
  };
}

const deps: ShiftPlanDeps = {
  repo: pgShiftPlanRepo,
  async loadSchedule(userId) {
    const schedule = await getScheduleForUser(userId);
    if (!schedule) return null;
    const [overrides, mealPreferences] = await Promise.all([
      listOverridesForUser(userId),
      getMealSlotPreferencesForUser(userId),
    ]);
    return { schedule, overrides, mealPreferences };
  },
  resolveRecipe: resolvePlannedRecipe,
  isSelectableSlug: (slug) => Boolean(catalogEntry(slug)),
  now: () => new Date(),
};

/** Same page record the recipe detail page renders (and "Add to my list" uses). */
export function resolveShoppingRecipe(slug: string): ShoppingRecipeInput | null {
  const page = loadCanonicalCatalogPage(slug) ?? readBreakfastRecipePageFromDisk(slug.toLowerCase());
  if (!page || page.ingredients.length === 0) return null;
  return {
    slug: page.slug,
    title: page.title,
    recipePath: approvedCatalogRecipePath(page.slug),
    baseServings: getRecipeBaseServings(page),
    ingredients: page.ingredients.map(({ name, quantity, unit, notes, optional }) => ({
      name,
      ...(quantity ? { quantity } : {}),
      ...(unit ? { unit } : {}),
      ...(notes ? { notes } : {}),
      ...(optional ? { optional } : {}),
    })),
  };
}

const listDeps: ShiftListDeps = { plan: deps, lists: pgShiftListRepo, resolveShoppingRecipe };

/** Base request → validated, sanitized, entitlement-gated; plus the same history inputs /api/generate uses. */
async function buildSlotPicker(
  userId: string,
  rawBase: Record<string, unknown>,
  clientRecentSlugs: string[],
): Promise<SlotPicker | null> {
  const crew = Number(rawBase.crew_size);
  const parsed = generateRequestSchema.safeParse(
    coerceGenerateRequestBody({
      ...rawBase,
      crew_size: Number.isFinite(crew) ? Math.min(GENERATOR_MAX_CREW, Math.max(GENERATOR_MIN_CREW, crew)) : 6,
    }),
  );
  if (!parsed.success) return null;
  const base: GenerateRequest = sanitizeGenerateRequest(parsed.data);

  const billing = await resolveUserBilling(userId);
  base.foods_to_avoid = base.foods_to_avoid.length > 0 ? gateFoodsToAvoidByEntitlement(billing, base.foods_to_avoid) : [];

  let recentSlugs = clientRecentSlugs;
  let historySignals: Awaited<ReturnType<typeof computeHistorySignals>> | null = null;
  if (hasFeature(billing.features, "meal_memory")) {
    const durable = await listRecentCookedSlugsOldestFirst(userId, 10);
    if (durable.length > 0) recentSlugs = mergeRecentSlugSources(durable, clientRecentSlugs);
    if (base.personalize_with_history !== false) {
      try {
        historySignals = await computeHistorySignals(userId, recentSlugs);
      } catch (err) {
        log(`[shift-plan] history signals failed: ${(err as Error)?.message}`, "shift-plan");
      }
    }
  }
  let nutritionGoals: Awaited<ReturnType<typeof loadEntitledNutritionGoals>> = [];
  try {
    nutritionGoals = await loadEntitledNutritionGoals(userId, billing);
  } catch (err) {
    log(`[shift-plan] nutrition goals failed: ${(err as Error)?.message}`, "shift-plan");
  }

  return createSlotPicker({ base, recentSlugs, historySignals, nutritionGoals, sessionKey: `shift-plan:${userId}` });
}

function sendError(res: Response, err: unknown, what: string) {
  if (err instanceof ShiftPlanError) return res.status(err.status).json({ message: err.message });
  logError("shift-plan", `${what} failed`, err);
  return res.status(500).json({ message: `Failed to ${what}` });
}

export function registerShiftPlanRoutes(app: Express): void {
  app.get("/api/shift-plan", requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      return res.json(await getShiftPlan(deps, req._authUserId!));
    } catch (err) {
      return sendError(res, err, "load shift plan");
    }
  });

  app.patch("/api/shift-plan/slot", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const parsed = shiftPlanSlotPatchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid change", issues: parsed.error.issues.map((i) => i.message) });
      }
      return res.json(await patchShiftPlanSlot(deps, req._authUserId!, parsed.data));
    } catch (err) {
      return sendError(res, err, "save meal");
    }
  });

  app.post("/api/shift-plan/fill", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const userId = req._authUserId!;
      const parsed = shiftPlanFillSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request", issues: parsed.error.issues.map((i) => i.message) });
      }

      const rateKey = `shift-plan:fill:${userId}`;
      const limit = peekRateLimit(rateKey, FILL_WINDOW_MS, FILL_MAX_PER_WINDOW);
      if (!limit.allowed) {
        const retry = Math.max(5, Math.ceil(limit.resetMs / 1000));
        return res.status(429).json({ message: `Slow down — try again in ${retry}s.`, retry_after_seconds: retry });
      }
      recordRateLimit(rateKey);

      const picker = await buildSlotPicker(userId, parsed.data.base, parsed.data.recentSlugs ?? []);
      if (!picker) return res.status(400).json({ message: "Invalid meal preferences" });

      return res.json(await fillShiftPlan(deps, userId, parsed.data, picker));
    } catch (err) {
      return sendError(res, err, "fill shift plan");
    }
  });

  app.get("/api/shift-plan/shopping-list", requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      res.setHeader("Cache-Control", "no-store");
      return res.json(await getShiftList(listDeps, req._authUserId!));
    } catch (err) {
      return sendError(res, err, "load shopping list");
    }
  });

  app.post("/api/shift-plan/shopping-list", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const parsed = shiftListOpenSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request" });
      return res.json(await openShiftList(listDeps, req._authUserId!, parsed.data));
    } catch (err) {
      return sendError(res, err, "build shopping list");
    }
  });

  app.post("/api/shift-plan/shopping-list/op", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const userId = req._authUserId!;
      const parsed = shiftListOpSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid change" });

      const rateKey = `shift-plan:list-op:${userId}`;
      const limit = peekRateLimit(rateKey, FILL_WINDOW_MS, LIST_OP_MAX_PER_WINDOW);
      if (!limit.allowed) {
        const retry = Math.max(5, Math.ceil(limit.resetMs / 1000));
        return res.status(429).json({ message: `Slow down — try again in ${retry}s.`, retry_after_seconds: retry });
      }
      recordRateLimit(rateKey);

      return res.json(await applyShiftListAction(listDeps, userId, parsed.data));
    } catch (err) {
      return sendError(res, err, "update shopping list");
    }
  });
}
