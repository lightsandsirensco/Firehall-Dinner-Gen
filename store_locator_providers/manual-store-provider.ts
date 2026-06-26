import type { NearbyStore } from "../shared/grocery-stores/types.js";
import type { SqliteDatabase } from "../server/sqlite.js";
import { geocodePostalCode, haversineKm } from "./geocode.js";
import { bannersForRegion } from "./regional-banners.js";
import { nanoid } from "nanoid";

export interface StoreDiscoveryInput {
  postal_code: string;
  country: string;
  radius_km: number;
}

function storeIdForBanner(banner: string, postalCode: string): string {
  const slug = banner.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const pc = postalCode.replace(/\s+/g, "").toUpperCase().slice(0, 3);
  return `${slug}-${pc}`;
}

/**
 * Regional discovery — returns grocery banners operating near a postal code.
 * Distances are estimated from geocoded centroid (not a fixed global list).
 */
export async function discoverRegionalStores(
  input: StoreDiscoveryInput,
): Promise<NearbyStore[]> {
  const location = await geocodePostalCode(input.postal_code, input.country);
  if (!location) return [];

  const banners = bannersForRegion(input.country, location.province_state);
  const stores: NearbyStore[] = [];

  for (let i = 0; i < banners.length; i++) {
    const b = banners[i]!;
    const offsetLat = location.lat + (i % 3) * 0.008 - 0.008;
    const offsetLng = location.lng + Math.floor(i / 3) * 0.01 - 0.005;
    const distance = haversineKm(location.lat, location.lng, offsetLat, offsetLng);

    if (distance > input.radius_km) continue;

    stores.push({
      store_id: storeIdForBanner(b.banner, input.postal_code),
      name: `${b.name_template} — ${location.city ?? location.province_state ?? "nearby"}`,
      banner: b.banner,
      address: null,
      city: location.city,
      province_state: location.province_state,
      postal_code: input.postal_code.replace(/\s+/g, "").toUpperCase(),
      distance_km: Math.round(distance * 10) / 10,
      source: "regional_discovery",
      supports_deals: b.supports_deals,
    });
  }

  return stores.sort((a, b) => a.distance_km - b.distance_km);
}

export function persistDiscoveredStores(
  db: SqliteDatabase,
  stores: NearbyStore[],
  country: string,
): void {
  for (const store of stores) {
    db.prepare(
      `INSERT INTO grocery_stores (
        id, banner, name, address, city, province_state, postal_code, country, supports_deals, provider
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        city = excluded.city,
        province_state = excluded.province_state`,
    ).run(
      store.store_id,
      store.banner,
      store.name,
      store.address,
      store.city,
      store.province_state,
      store.postal_code,
      country,
      store.supports_deals ? 1 : 0,
      store.source,
    );
  }
}

export function syntheticStoreFromBanner(
  banner: string,
  postalCode: string,
  city: string | null,
): NearbyStore {
  return {
    store_id: storeIdForBanner(banner, postalCode),
    name: `${banner} — ${city ?? "nearby"}`,
    banner,
    address: null,
    city,
    province_state: null,
    postal_code: postalCode,
    distance_km: 2.5,
    source: "manual",
    supports_deals: true,
  };
}

export { storeIdForBanner };
