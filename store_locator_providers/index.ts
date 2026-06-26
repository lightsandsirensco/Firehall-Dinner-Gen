import { nanoid } from "nanoid";
import type { NearbyStore } from "../shared/grocery-stores/types.js";
import type { SqliteDatabase } from "../server/sqlite.js";
import type { StoreDiscoveryInput } from "./manual-store-provider.js";
import { discoverRegionalStores, persistDiscoveredStores } from "./manual-store-provider.js";
import { discoverRetailerDbStores } from "./retailer-store-locator-provider.js";

export function isGooglePlacesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim());
}

async function discoverGooglePlacesStores(
  input: StoreDiscoveryInput,
): Promise<NearbyStore[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) return [];

  const { geocodePostalCode } = await import("./geocode.js");
  const location = await geocodePostalCode(input.postal_code, input.country);
  if (!location) return [];

  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${location.lat},${location.lng}`);
  url.searchParams.set("radius", String(Math.round(input.radius_km * 1000)));
  url.searchParams.set("type", "grocery_or_supermarket");
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      results?: Array<{
        place_id?: string;
        name?: string;
        vicinity?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
      }>;
    };

    const { haversineKm } = await import("./geocode.js");
    return (body.results ?? []).map((place) => {
      const plat = place.geometry?.location?.lat ?? location.lat;
      const plng = place.geometry?.location?.lng ?? location.lng;
      return {
        store_id: `gplace-${place.place_id ?? nanoid(8)}`,
        name: place.name ?? "Grocery store",
        banner: place.name ?? "Grocery",
        address: place.vicinity ?? null,
        city: location.city,
        province_state: location.province_state,
        postal_code: input.postal_code.replace(/\s+/g, "").toUpperCase(),
        distance_km: Math.round(haversineKm(location.lat, location.lng, plat, plng) * 10) / 10,
        source: "google_places" as const,
        supports_deals: false,
      };
    });
  } catch {
    return [];
  }
}

function dedupeStores(stores: NearbyStore[]): NearbyStore[] {
  const map = new Map<string, NearbyStore>();
  for (const s of stores) {
    const key = `${s.banner.toLowerCase()}|${s.name.toLowerCase()}`;
    const existing = map.get(key);
    if (!existing || s.distance_km < existing.distance_km) {
      map.set(key, s);
    }
  }
  return [...map.values()].sort((a, b) => a.distance_km - b.distance_km);
}

export async function discoverNearbyStores(
  db: SqliteDatabase,
  input: StoreDiscoveryInput,
): Promise<{ stores: NearbyStore[]; sources_used: string[] }> {
  const sources_used: string[] = [];
  const all: NearbyStore[] = [];

  if (isGooglePlacesConfigured()) {
    const google = await discoverGooglePlacesStores(input);
    if (google.length > 0) {
      sources_used.push("google_places");
      all.push(...google);
    }
  }

  const regional = await discoverRegionalStores(input);
  if (regional.length > 0) {
    sources_used.push("regional_discovery");
    all.push(...regional);
    persistDiscoveredStores(db, regional, input.country);
  }

  const dbStores = await discoverRetailerDbStores(db, input);
  if (dbStores.length > 0) {
    sources_used.push("retailer_locator");
    all.push(...dbStores);
  }

  if (sources_used.length === 0) sources_used.push("manual");

  return { stores: dedupeStores(all), sources_used };
}
