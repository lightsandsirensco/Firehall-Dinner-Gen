/**
 * Geocode postal codes via Nominatim (OpenStreetMap).
 * Respects usage policy: identifiable User-Agent, cached results.
 */

export interface GeocodedLocation {
  lat: number;
  lng: number;
  city: string | null;
  province_state: string | null;
  country: string;
  display_name: string;
}

const CACHE = new Map<string, GeocodedLocation>();
const USER_AGENT = "FirehallMeals/1.0 (grocery-store-discovery; +https://firehallmeals.com)";

function normalizePostal(postalCode: string, country: string): string {
  const raw = postalCode.replace(/\s+/g, "").toUpperCase();
  if (country === "CA" && raw.length === 6) {
    return `${raw.slice(0, 3)} ${raw.slice(3)}`;
  }
  return raw;
}

function cacheKey(postalCode: string, country: string): string {
  return `${country}:${postalCode.replace(/\s+/g, "").toUpperCase()}`;
}

/** Canadian FSA → province hint when geocoding fails */
export function provinceFromCanadianPostal(postalCode: string): string | null {
  const fsa = postalCode.replace(/\s+/g, "").toUpperCase().slice(0, 1);
  const map: Record<string, string> = {
    A: "NL",
    B: "NS",
    C: "PE",
    E: "NB",
    G: "QC",
    H: "QC",
    J: "QC",
    K: "ON",
    L: "ON",
    M: "ON",
    N: "ON",
    P: "ON",
    R: "MB",
    S: "SK",
    T: "AB",
    V: "BC",
    X: "NT",
    Y: "YT",
  };
  return map[fsa] ?? null;
}

export async function geocodePostalCode(
  postalCode: string,
  country: string,
): Promise<GeocodedLocation | null> {
  const key = cacheKey(postalCode, country);
  const cached = CACHE.get(key);
  if (cached) return cached;

  const formatted = normalizePostal(postalCode, country);
  const countryName = country === "US" ? "United States" : "Canada";
  const query = `${formatted}, ${countryName}`;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) return fallbackLocation(postalCode, country);

    const results = (await res.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
      address?: Record<string, string>;
    }>;

    const hit = results[0];
    if (!hit?.lat || !hit.lon) return fallbackLocation(postalCode, country);

    const addr = hit.address ?? {};
    const loc: GeocodedLocation = {
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      city: addr.city ?? addr.town ?? addr.municipality ?? null,
      province_state:
        addr.state ?? addr.province ?? provinceFromCanadianPostal(postalCode) ?? null,
      country,
      display_name: hit.display_name ?? query,
    };

    CACHE.set(key, loc);
    return loc;
  } catch {
    return fallbackLocation(postalCode, country);
  }
}

function fallbackLocation(postalCode: string, country: string): GeocodedLocation | null {
  if (country !== "CA") return null;
  const province = provinceFromCanadianPostal(postalCode);
  if (!province) return null;
  const loc: GeocodedLocation = {
    lat: 43.65,
    lng: -79.38,
    city: null,
    province_state: province,
    country,
    display_name: postalCode,
  };
  CACHE.set(cacheKey(postalCode, country), loc);
  return loc;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Test helper */
export function clearGeocodeCache(): void {
  CACHE.clear();
}
