import type { Express, Response } from "express";
import { requireCsrf } from "../csrf.js";
import { logError } from "../logger.js";
import { insertAnalyticsEvents } from "../analytics/analytics-store.js";
import { requireAuth, type AuthedRequest } from "../auth/auth-middleware.js";
import { userHasFeature } from "../billing/store.js";
import { memberHasPermission } from "../hall-membership/store.js";
import { addManualItem, initHallShoppingListStore } from "../hall-shopping-list/store.js";
import { saveGroceryPreferencesSchema, nearbyStoresQuerySchema } from "../../shared/grocery-stores/schema.js";
import {
  findNearbyStores,
  getGroceryPreferences,
  removePreferredStore,
  saveGroceryPreferences,
} from "./preferences-store.js";
import { matchRecipesForProteinDeal } from "./recipe-match.js";
import { proteinDealLabel } from "../../shared/protein-deals/types.js";
import {
  getDealById,
  getProteinDealsHighlight,
  getProteinDealsResponse,
  getProteinDealsTeaser,
  initGroceryDealsStore,
  refreshProteinDealsFromProvider,
} from "./store.js";
import {
  clearStaleDeals,
  forceRefreshHallDeals,
  getAdminDealsDashboard,
  seedAdminDealsForHall,
} from "./admin-store.js";
import { getSharedLocalDb } from "../sqlite.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initGroceryDealsStore();
    storeReady = true;
  }
}

function requireHallMember(req: AuthedRequest, res: Response, hallId: string): boolean {
  if (!memberHasPermission(hallId, req._authUserId!, "view_hall_dashboard")) {
    res.status(403).json({ message: "Not a member of this hall" });
    return false;
  }
  return true;
}

function requireProteinDealsAccess(req: AuthedRequest, res: Response, hallId: string): boolean {
  if (!userHasFeature(req._authUserId ?? null, "hall_grocery_planning", { hall_id: hallId })) {
    res.status(402).json({ message: "Hall Pro required", feature: "hall_grocery_planning" });
    return false;
  }
  return true;
}

function trackProteinEvent(
  req: AuthedRequest,
  eventType:
    | "protein_deals_viewed"
    | "protein_deal_clicked"
    | "protein_recipe_generated"
    | "protein_shopping_list_created"
    | "postal_code_saved"
    | "nearby_stores_loaded"
    | "preferred_store_added"
    | "preferred_store_removed"
    | "protein_setup_completed",
  metadata?: Record<string, string | number | boolean>,
): void {
  try {
    insertAnalyticsEvents([{ event_type: eventType, route: req.path, metadata }], req._sessionId);
  } catch {
    /* optional */
  }
}

function registerProteinDealRoutes(app: Express, basePath: string): void {
  app.get(basePath, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const hallId = String(req.params.hallId ?? "");
      if (!requireHallMember(req, res, hallId)) return;
      const hasPro = userHasFeature(req._authUserId ?? null, "hall_grocery_planning", { hall_id: hallId });
      if (!hasPro) {
        return res.json(await getProteinDealsResponse(hallId, false));
      }
      const payload = await getProteinDealsResponse(hallId, true);
      trackProteinEvent(req, "protein_deals_viewed", { hall_id: hallId });
      return res.json(payload);
    } catch (err) {
      logError("protein-deals", "list failed", err);
      return res.status(500).json({ message: "Failed to load protein deals" });
    }
  });

  app.post(`${basePath}/refresh`, requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const hallId = String(req.params.hallId ?? "");
      if (!requireProteinDealsAccess(req, res, hallId)) return;
      if (!requireHallMember(req, res, hallId)) return;
      const result = await refreshProteinDealsFromProvider(hallId);
      const deals = await getProteinDealsResponse(hallId, true);
      return res.json({ ok: !result.failed, ...result, deals });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Refresh failed";
      return res.status(400).json({ message });
    }
  });

  app.get(`${basePath}/:dealId/recipes`, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const hallId = String(req.params.hallId ?? "");
      const dealId = String(req.params.dealId ?? "");
      if (!requireProteinDealsAccess(req, res, hallId)) return;
      if (!requireHallMember(req, res, hallId)) return;

      const deal = getDealById(hallId, dealId);
      if (!deal) return res.status(404).json({ message: "Deal not found" });

      const recipes = matchRecipesForProteinDeal(deal);
      trackProteinEvent(req, "protein_recipe_generated", {
        hall_id: hallId,
        deal_id: dealId,
        protein_type: deal.protein_type,
        match_count: recipes.length,
      });
      return res.json({ deal, recipes });
    } catch (err) {
      logError("protein-deals", "recipe match failed", err);
      return res.status(500).json({ message: "Failed to match recipes" });
    }
  });

  app.post(
    `${basePath}/:dealId/shopping-list`,
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        await initHallShoppingListStore();
        const hallId = String(req.params.hallId ?? "");
        const dealId = String(req.params.dealId ?? "");
        if (!requireProteinDealsAccess(req, res, hallId)) return;
        if (!requireHallMember(req, res, hallId)) return;

        const deal = getDealById(hallId, dealId);
        if (!deal) return res.status(404).json({ message: "Deal not found" });

        const quantity =
          deal.price != null
            ? `$${deal.price.toFixed(2)}${deal.unit ? `/${deal.unit}` : ""}`
            : deal.unit ?? undefined;

        const list = addManualItem(hallId, req._authUserId!, {
          name: proteinDealLabel(deal),
          quantity,
          section: "Protein",
        });
        if (!list) return res.status(403).json({ message: "Could not add to shopping list" });

        trackProteinEvent(req, "protein_shopping_list_created", { hall_id: hallId, deal_id: dealId });
        return res.json({ ok: true, list });
      } catch (err) {
        logError("protein-deals", "add to shopping list failed", err);
        return res.status(500).json({ message: "Failed to add to shopping list" });
      }
    },
  );
}

export function registerGroceryDealsRoutes(app: Express): void {
  registerProteinDealRoutes(app, "/api/halls/:hallId/protein-deals");
  registerProteinDealRoutes(app, "/api/halls/:hallId/deals");

  app.get(
    "/api/halls/:hallId/protein-deals/highlight",
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        if (!requireHallMember(req, res, hallId)) return;
        const hasPro = userHasFeature(req._authUserId ?? null, "hall_grocery_planning", { hall_id: hallId });
        if (!hasPro) {
          const teaser = getProteinDealsTeaser(hallId);
          return res.json({ message: teaser.message, deals: teaser.top_deals });
        }
        return res.json(getProteinDealsHighlight(hallId));
      } catch (err) {
        return res.status(500).json({ message: "Failed to load highlight" });
      }
    },
  );

  app.get(
    "/api/halls/:hallId/grocery/preferences",
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        if (!requireHallMember(req, res, hallId)) return;
        const db = await getSharedLocalDb();
        return res.json(getGroceryPreferences(db, hallId));
      } catch (err) {
        return res.status(500).json({ message: "Failed to load preferences" });
      }
    },
  );

  app.get(
    "/api/halls/:hallId/grocery/stores/nearby",
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        if (!requireHallMember(req, res, hallId)) return;
        const parsed = nearbyStoresQuerySchema.safeParse(req.query);
        if (!parsed.success) return res.status(400).json({ message: "Invalid query" });
        const db = await getSharedLocalDb();
        const payload = await findNearbyStores(db, hallId, parsed.data);
        trackProteinEvent(req, "nearby_stores_loaded", { hall_id: hallId, count: payload.stores.length });
        return res.json(payload);
      } catch (err) {
        return res.status(500).json({ message: "Failed to find stores" });
      }
    },
  );

  app.put(
    "/api/halls/:hallId/grocery/preferences",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        if (!requireHallMember(req, res, hallId)) return;
        if (!memberHasPermission(hallId, req._authUserId!, "manage_settings")) {
          return res.status(403).json({ message: "Captain permission required" });
        }
        const parsed = saveGroceryPreferencesSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ message: "Invalid preferences" });
        const db = await getSharedLocalDb();
        const nearby = await findNearbyStores(db, hallId, {
          postal_code: parsed.data.postal_code,
          country: parsed.data.country,
          radius_km: parsed.data.max_distance_km,
        });
        const prefs = saveGroceryPreferences(db, hallId, parsed.data, nearby.stores);
        trackProteinEvent(req, "postal_code_saved", { hall_id: hallId });
        trackProteinEvent(req, "preferred_store_added", {
          hall_id: hallId,
          count: parsed.data.preferred_store_ids.length,
        });
        trackProteinEvent(req, "protein_setup_completed", { hall_id: hallId });
        await refreshProteinDealsFromProvider(hallId).catch(() => undefined);
        const hasPro = userHasFeature(req._authUserId ?? null, "hall_grocery_planning", { hall_id: hallId });
        return res.json({
          ok: true,
          preferences: prefs,
          deals: await getProteinDealsResponse(hallId, hasPro),
        });
      } catch (err) {
        return res.status(500).json({ message: "Failed to save preferences" });
      }
    },
  );

  app.delete(
    "/api/halls/:hallId/grocery/preferences/stores/:storeId",
    requireCsrf,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        await ensureStore();
        const hallId = String(req.params.hallId ?? "");
        if (!requireHallMember(req, res, hallId)) return;
        if (!memberHasPermission(hallId, req._authUserId!, "manage_settings")) {
          return res.status(403).json({ message: "Captain permission required" });
        }
        const db = await getSharedLocalDb();
        const prefs = removePreferredStore(db, hallId, String(req.params.storeId ?? ""));
        trackProteinEvent(req, "preferred_store_removed", {
          hall_id: hallId,
          store_id: String(req.params.storeId ?? ""),
        });
        return res.json({ ok: true, preferences: prefs });
      } catch (err) {
        return res.status(500).json({ message: "Failed to remove store" });
      }
    },
  );

  app.get("/api/admin/deals", async (_req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const db = await getSharedLocalDb();
      return res.json(getAdminDealsDashboard(db));
    } catch (err) {
      return res.status(500).json({ message: "Failed to load admin protein deals" });
    }
  });

  app.post("/api/admin/deals/seed/:hallId", async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const db = await getSharedLocalDb();
      const inserted = seedAdminDealsForHall(db, String(req.params.hallId ?? ""));
      return res.json({ ok: true, inserted });
    } catch (err) {
      return res.status(500).json({ message: "Seed failed" });
    }
  });

  app.post("/api/admin/deals/clear-stale", async (_req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const db = await getSharedLocalDb();
      return res.json({ ok: true, removed: clearStaleDeals(db) });
    } catch (err) {
      return res.status(500).json({ message: "Clear failed" });
    }
  });

  app.post("/api/admin/deals/refresh/:hallId", async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const result = await forceRefreshHallDeals(String(req.params.hallId ?? ""));
      return res.json({ ok: true, ...result });
    } catch (err) {
      return res.status(500).json({ message: "Refresh failed" });
    }
  });
}

export const registerProteinDealsRoutes = registerGroceryDealsRoutes;
