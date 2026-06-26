/**
 * Optional approved grocery-deals provider.
 * Set GROCERY_DEALS_API_URL + GROCERY_DEALS_API_KEY for live flyer data.
 * No scraping — only configured HTTP APIs.
 */

import { log } from "../logger.js";
import { normalizeDealItem } from "../../deals_providers/deal-normalizer.js";

export interface ProviderDealInput {
  store_name: string;
  item_name: string;
  price?: number | null;
  unit?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  flyer_url?: string | null;
}

export function isGroceryDealsProviderConfigured(): boolean {
  const url = process.env.GROCERY_DEALS_API_URL?.trim();
  return Boolean(url && url.startsWith("http"));
}

export function groceryDealsProviderName(): string | null {
  return process.env.GROCERY_DEALS_PROVIDER_NAME?.trim() || null;
}

export async function fetchDealsFromProvider(postalCode: string): Promise<ProviderDealInput[]> {
  const baseUrl = process.env.GROCERY_DEALS_API_URL?.trim();
  if (!baseUrl) return [];

  const apiKey = process.env.GROCERY_DEALS_API_KEY?.trim();
  const url = new URL(baseUrl);
  url.searchParams.set("postal_code", postalCode);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
    });

    if (!res.ok) {
      log(`[grocery-deals] provider HTTP ${res.status} for ${postalCode}`, "catalog");
      return [];
    }

    const body = (await res.json()) as { deals?: unknown[] };
    if (!Array.isArray(body.deals)) return [];

    const out: ProviderDealInput[] = [];
    for (const raw of body.deals) {
      if (!raw || typeof raw !== "object") continue;
      const row = raw as Record<string, unknown>;
      const item_name = String(row.item_name ?? row.name ?? "").trim();
      const store_name = String(row.store_name ?? row.store ?? "Local store").trim();
      if (!item_name) continue;
      normalizeDealItem(item_name);
      out.push({
        store_name,
        item_name,
        price: row.price != null ? Number(row.price) : null,
        unit: row.unit ? String(row.unit) : null,
        valid_from: row.valid_from ? String(row.valid_from) : null,
        valid_to: row.valid_to ? String(row.valid_to) : null,
        flyer_url: row.flyer_url ? String(row.flyer_url) : null,
      });
    }

    return out;
  } catch (err: unknown) {
    log(
      `[grocery-deals] provider fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      "catalog",
    );
    return [];
  }
}
