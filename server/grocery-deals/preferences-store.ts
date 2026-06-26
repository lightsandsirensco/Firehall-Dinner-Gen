import type { SqliteDatabase } from "../sqlite.js";
import type {
  HallGroceryPreferences,
  HallPreferredStore,
  NearbyStoresResponse,
} from "../../shared/grocery-stores/types.js";
import type { SaveGroceryPreferencesInput } from "../../shared/grocery-stores/schema.js";
import { discoverNearbyStores } from "../../store_locator_providers/index.js";

function readPostalCode(db: SqliteDatabase, hallId: string): string | null {
  const pref = db
    .prepare(`SELECT postal_code FROM hall_grocery_preferences WHERE hall_id = ?`)
    .get(hallId) as { postal_code: string | null } | undefined;
  if (pref?.postal_code?.trim()) return String(pref.postal_code).trim();

  const hall = db
    .prepare(`SELECT postal_code FROM halls WHERE hall_id = ?`)
    .get(hallId) as { postal_code: string | null } | undefined;
  return hall?.postal_code?.trim() ? String(hall.postal_code).trim() : null;
}

export function getGroceryPreferences(
  db: SqliteDatabase,
  hallId: string,
): HallGroceryPreferences {
  const pref = db
    .prepare(`SELECT * FROM hall_grocery_preferences WHERE hall_id = ?`)
    .get(hallId) as Record<string, unknown> | undefined;

  const preferredRows = db
    .prepare(
      `SELECT * FROM hall_preferred_stores WHERE hall_id = ? AND active = 1 ORDER BY priority ASC`,
    )
    .all(hallId) as Array<Record<string, unknown>>;

  const preferred_stores: HallPreferredStore[] = preferredRows.map((row) => ({
    hall_id: hallId,
    store_id: String(row.store_id),
    store_name: String(row.store_name),
    banner: String(row.banner),
    address: row.address ? String(row.address) : null,
    distance_km: row.distance_km != null ? Number(row.distance_km) : null,
    priority: Number(row.priority ?? 0),
    active: Boolean(row.active),
  }));

  const postal_code = readPostalCode(db, hallId);

  return {
    hall_id: hallId,
    postal_code: postal_code ?? null,
    country: pref?.country ? String(pref.country) : "CA",
    max_distance_km: pref?.max_distance_km != null ? Number(pref.max_distance_km) : 15,
    default_store_id: pref?.default_store_id ? String(pref.default_store_id) : null,
    preferred_stores,
    updated_at: pref?.updated_at ? String(pref.updated_at) : new Date().toISOString(),
    setup_complete: preferred_stores.length > 0 && Boolean(postal_code?.trim()),
  };
}

export function getPreferredBanners(db: SqliteDatabase, hallId: string): string[] {
  const prefs = getGroceryPreferences(db, hallId);
  return [...new Set(prefs.preferred_stores.map((s) => s.banner))];
}

export function getPreferredStoreIds(db: SqliteDatabase, hallId: string): string[] {
  return getGroceryPreferences(db, hallId).preferred_stores.map((s) => s.store_id);
}

export async function findNearbyStores(
  db: SqliteDatabase,
  hallId: string,
  opts?: { postal_code?: string; country?: string; radius_km?: number },
): Promise<NearbyStoresResponse> {
  const prefs = getGroceryPreferences(db, hallId);
  const postal_code = opts?.postal_code?.trim() || readPostalCode(db, hallId) || "";
  const country = opts?.country ?? prefs.country ?? "CA";
  const radius_km = opts?.radius_km ?? prefs.max_distance_km ?? 15;

  if (!postal_code) {
    return { postal_code: "", country, radius_km, stores: [], sources_used: [] };
  }

  const result = await discoverNearbyStores(db, { postal_code, country, radius_km });
  return {
    postal_code: postal_code.replace(/\s+/g, "").toUpperCase(),
    country,
    radius_km,
    stores: result.stores,
    sources_used: result.sources_used,
  };
}

export function saveGroceryPreferences(
  db: SqliteDatabase,
  hallId: string,
  input: SaveGroceryPreferencesInput,
  nearbyStores: Array<{
    store_id: string;
    name: string;
    banner: string;
    address: string | null;
    distance_km: number;
  }>,
): HallGroceryPreferences {
  const now = new Date().toISOString();
  const postal = input.postal_code.replace(/\s+/g, "").toUpperCase();

  db.prepare(
    `INSERT INTO hall_grocery_preferences (hall_id, postal_code, country, max_distance_km, default_store_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(hall_id) DO UPDATE SET
       postal_code = excluded.postal_code,
       country = excluded.country,
       max_distance_km = excluded.max_distance_km,
       default_store_id = excluded.default_store_id,
       updated_at = excluded.updated_at`,
  ).run(
    hallId,
    postal,
    input.country,
    input.max_distance_km,
    input.default_store_id ?? input.preferred_store_ids[0] ?? null,
    now,
  );

  try {
    db.prepare(`UPDATE halls SET postal_code = ?, country = ?, updated_at = datetime('now') WHERE hall_id = ?`).run(
      postal,
      input.country,
      hallId,
    );
  } catch {
    db.prepare(`UPDATE halls SET postal_code = ?, updated_at = datetime('now') WHERE hall_id = ?`).run(
      postal,
      hallId,
    );
  }

  db.prepare(`DELETE FROM hall_preferred_stores WHERE hall_id = ?`).run(hallId);

  const storeMap = new Map(nearbyStores.map((s) => [s.store_id, s]));
  input.preferred_store_ids.forEach((storeId, index) => {
    const store = storeMap.get(storeId);
    const banner = store?.banner ?? storeId.split("-")[0] ?? "Grocery";
    const name = store?.name ?? banner;
    db.prepare(
      `INSERT INTO hall_preferred_stores (hall_id, store_id, store_name, banner, address, distance_km, priority, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    ).run(
      hallId,
      storeId,
      name,
      banner,
      store?.address ?? null,
      store?.distance_km ?? null,
      index,
    );
  });

  return getGroceryPreferences(db, hallId);
}

export function removePreferredStore(
  db: SqliteDatabase,
  hallId: string,
  storeId: string,
): HallGroceryPreferences {
  db.prepare(`UPDATE hall_preferred_stores SET active = 0 WHERE hall_id = ? AND store_id = ?`).run(
    hallId,
    storeId,
  );
  return getGroceryPreferences(db, hallId);
}
