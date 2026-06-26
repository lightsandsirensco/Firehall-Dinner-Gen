import { nanoid } from "nanoid";
import type { SqliteDatabase } from "../sqlite.js";
import { fetchDemoProteinDealsForBanners } from "../../deals_providers/manual-test-provider.js";
import {
  resolveProteinDealsMode,
  dealsModeLabel,
  shouldSyncDemoDeals,
} from "../../deals_providers/grocery-deals-mode.js";
import { getGroceryPreferences } from "./preferences-store.js";
import { refreshProteinDealsFromProvider, listProteinDealsForHall } from "./store.js";

export function getAdminDealsDashboard(db: SqliteDatabase): Record<string, unknown> {
  const mode = resolveProteinDealsMode();

  const halls = db
    .prepare(
      `SELECT h.hall_id, h.hall_name, h.postal_code,
              p.country, p.max_distance_km, p.default_store_id, p.updated_at AS prefs_updated,
              (SELECT COUNT(*) FROM hall_preferred_stores ps WHERE ps.hall_id = h.hall_id AND ps.active = 1) AS store_count,
              (SELECT COUNT(*) FROM protein_deals pd WHERE pd.hall_id = h.hall_id) AS deal_count,
              (SELECT MAX(fetched_at) FROM protein_deals pd WHERE pd.hall_id = h.hall_id) AS last_refresh
       FROM halls h
       LEFT JOIN hall_grocery_preferences p ON p.hall_id = h.hall_id
       WHERE h.postal_code IS NOT NULL OR p.hall_id IS NOT NULL
       ORDER BY p.updated_at DESC NULLS LAST
       LIMIT 100`,
    )
    .all() as Array<Record<string, unknown>>;

  const total_deals = (
    db.prepare(`SELECT COUNT(*) AS c FROM protein_deals`).get() as { c: number }
  ).c;

  return {
    mode,
    mode_label: dealsModeLabel(mode),
    halls,
    total_deals,
    protein_deals: total_deals,
  };
}

export function seedAdminDealsForHall(db: SqliteDatabase, hallId: string): number {
  const prefs = getGroceryPreferences(db, hallId);
  if (!prefs.postal_code || prefs.preferred_stores.length === 0) return 0;

  const banners = prefs.preferred_stores.map((s) => s.banner);
  db.prepare(`DELETE FROM protein_deals WHERE hall_id = ?`).run(hallId);

  const deals = fetchDemoProteinDealsForBanners(banners);
  let inserted = 0;

  for (const deal of deals) {
    const id = nanoid(12);
    db.prepare(
      `INSERT INTO protein_deals (
        id, hall_id, store_name, protein_type, protein_cut, price, unit, valid_from, valid_to, fetched_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    ).run(
      id,
      hallId,
      deal.store_name,
      deal.protein_type,
      deal.protein_cut,
      deal.price,
      deal.unit,
      deal.valid_from,
      deal.valid_to,
    );
    inserted++;
  }
  return inserted;
}

export function clearStaleDeals(db: SqliteDatabase, olderThanDays = 14): number {
  db.prepare(
    `DELETE FROM protein_deals WHERE datetime(fetched_at) < datetime('now', ?)`,
  ).run(`-${olderThanDays} days`);
  const row = db.prepare(`SELECT changes() AS c`).get() as { c: number };
  return row.c ?? 0;
}

export async function forceRefreshHallDeals(hallId: string): Promise<{ inserted: number }> {
  const result = await refreshProteinDealsFromProvider(hallId);
  return { inserted: result.inserted };
}
