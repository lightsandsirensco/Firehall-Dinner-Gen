import type { NearbyStore } from "../shared/grocery-stores/types.js";
import type { SqliteDatabase } from "../server/sqlite.js";
import { geocodePostalCode, haversineKm } from "./geocode.js";
import type { StoreDiscoveryInput } from "./manual-store-provider.js";

export async function discoverRetailerDbStores(
  db: SqliteDatabase,
  input: StoreDiscoveryInput,
): Promise<NearbyStore[]> {
  const location = await geocodePostalCode(input.postal_code, input.country);
  if (!location) return [];

  const rows = db
    .prepare(
      `SELECT * FROM grocery_stores WHERE country = ?
       AND (province_state IS NULL OR province_state = ?)`,
    )
    .all(input.country, location.province_state) as Array<Record<string, unknown>>;

  const stores: NearbyStore[] = [];
  for (const row of rows) {
    const lat = row.lat != null ? Number(row.lat) : null;
    const lng = row.lng != null ? Number(row.lng) : null;
    let distance = 5;
    if (lat != null && lng != null) {
      distance = haversineKm(location.lat, location.lng, lat, lng);
    }
    if (distance > input.radius_km) continue;

    stores.push({
      store_id: String(row.id),
      name: String(row.name),
      banner: String(row.banner),
      address: row.address ? String(row.address) : null,
      city: row.city ? String(row.city) : null,
      province_state: row.province_state ? String(row.province_state) : null,
      postal_code: row.postal_code ? String(row.postal_code) : null,
      distance_km: Math.round(distance * 10) / 10,
      source: "retailer_locator",
      supports_deals: Boolean(row.supports_deals),
    });
  }

  return stores;
}
