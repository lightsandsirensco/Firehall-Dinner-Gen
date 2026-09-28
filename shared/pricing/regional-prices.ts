/**
 * Regional price book lookup: postal region → city/province → province/state
 * → country → generic baseline. Only levels actually backed by data are used
 * — we never require a street address.
 *
 * Premium sale overrides (future "Cook What's On Sale") take priority over
 * every baseline level for the affected canonical ingredient only; every
 * other ingredient keeps using its normal baseline lookup.
 */
import type {
  LocationFallbackLevel,
  LocationQuery,
  PriceRecord,
  SaleOverride,
} from "./types.js";
import { BASELINE_PRICE_BOOK } from "./baseline-prices.js";

function norm(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

/** First 3 chars of a postal/ZIP code, e.g. "M5V 2T6" -> "M5V", "98101" -> "981". */
export function derivePostalRegion(postalCode: string | null | undefined): string | null {
  const compact = (postalCode || "").replace(/\s+/g, "").toUpperCase();
  if (compact.length < 3) return null;
  return compact.slice(0, 3);
}

export interface PriceResolution {
  record: PriceRecord;
  fallbackLevel: LocationFallbackLevel;
  isSaleOverride: boolean;
}

function saleToRecord(o: SaleOverride): PriceRecord {
  return {
    canonical_ingredient_id: o.canonical_ingredient_id,
    country: "generic",
    price: o.price,
    pricing_unit: o.pricing_unit,
    package_size: o.package_size,
    source: o.label || "premium_sale_override",
    observed_at: o.observed_at,
    confidence: "high",
    retailer: o.retailer,
    price_type: "sale",
  };
}

/**
 * Resolve the best available price record for one canonical ingredient.
 * `saleOverrides` (Premium) is checked first; everything else falls back
 * through the regional hierarchy against `priceBook`.
 */
export function resolvePriceRecord(
  canonicalId: string,
  location: LocationQuery,
  options: {
    priceBook?: PriceRecord[];
    saleOverrides?: Record<string, SaleOverride>;
  } = {},
): PriceResolution | null {
  const override = options.saleOverrides?.[canonicalId];
  if (override) {
    return { record: saleToRecord(override), fallbackLevel: "generic", isSaleOverride: true };
  }

  const priceBook = options.priceBook ?? BASELINE_PRICE_BOOK;
  const candidates = priceBook.filter((r) => r.canonical_ingredient_id === canonicalId);
  if (candidates.length === 0) return null;

  const postalRegion = derivePostalRegion(location.postal_code);
  const country = norm(location.country);
  const province = norm(location.province_state);
  const city = norm(location.city);

  const pickLatest = (list: PriceRecord[]): PriceRecord =>
    list.slice().sort((a, b) => (a.observed_at < b.observed_at ? 1 : -1))[0];

  // 1) postal region
  if (postalRegion) {
    const matches = candidates.filter(
      (r) => norm(r.postal_region) === norm(postalRegion) && (!country || norm(r.country) === country),
    );
    if (matches.length) return { record: pickLatest(matches), fallbackLevel: "postal_region", isSaleOverride: false };
  }

  // 2) city + province/state
  if (city && province) {
    const matches = candidates.filter(
      (r) => norm(r.city) === city && norm(r.province_state) === province,
    );
    if (matches.length) return { record: pickLatest(matches), fallbackLevel: "city_province", isSaleOverride: false };
  }

  // 3) province/state
  if (province) {
    const matches = candidates.filter((r) => !r.city && norm(r.province_state) === province);
    if (matches.length) return { record: pickLatest(matches), fallbackLevel: "province_state", isSaleOverride: false };
  }

  // 4) country
  if (country) {
    const matches = candidates.filter(
      (r) => !r.province_state && !r.postal_region && norm(r.country) === country,
    );
    if (matches.length) return { record: pickLatest(matches), fallbackLevel: "country", isSaleOverride: false };
  }

  // 5) generic baseline
  const genericMatches = candidates.filter((r) => norm(r.country) === "generic");
  if (genericMatches.length) return { record: pickLatest(genericMatches), fallbackLevel: "generic", isSaleOverride: false };

  return null;
}

export function describeFallbackLevel(level: LocationFallbackLevel): string {
  switch (level) {
    case "postal_region":
      return "local postal region";
    case "city_province":
      return "your city";
    case "province_state":
      return "your province/state";
    case "country":
      return "your country";
    case "generic":
      return "typical national prices";
  }
}
