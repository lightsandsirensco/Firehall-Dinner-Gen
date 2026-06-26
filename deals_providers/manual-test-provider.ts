/**
 * Demo protein deals only — no produce, pantry, or dairy.
 */

import type { ProteinType } from "../shared/protein-deals/types.js";
import { shouldSyncDemoDeals } from "./grocery-deals-mode.js";
import { normalizeProteinDeal } from "./deal-normalizer.js";

const DEMO_ITEMS_BY_BANNER: Record<string, Array<{ item_name: string; price: number; unit: string }>> = {
  "No Frills": [
    { item_name: "Chicken Thighs", price: 3.99, unit: "lb" },
    { item_name: "Lean Ground Beef", price: 5.99, unit: "lb" },
    { item_name: "Pork Shoulder Blade Roast", price: 2.99, unit: "lb" },
    { item_name: "Italian Sausage, mild", price: 4.49, unit: "pack" },
    { item_name: "Atlantic Salmon Fillets", price: 8.99, unit: "lb" },
  ],
  "Food Basics": [
    { item_name: "Fresh Chicken Thighs", price: 2.49, unit: "lb" },
    { item_name: "Ground Beef, lean", price: 6.49, unit: "lb" },
    { item_name: "Pork Loin Chops", price: 3.49, unit: "lb" },
    { item_name: "Tilapia Fillets", price: 7.99, unit: "bag" },
  ],
  Metro: [
    { item_name: "Ground Beef", price: 4.49, unit: "lb" },
    { item_name: "Chicken Breast, boneless", price: 4.99, unit: "lb" },
    { item_name: "Ground Turkey", price: 5.49, unit: "lb" },
    { item_name: "Stir Fry Beef Strips", price: 7.99, unit: "lb" },
  ],
  Walmart: [
    { item_name: "Whole Chicken", price: 2.99, unit: "lb" },
    { item_name: "Ground Beef, medium", price: 5.49, unit: "lb" },
  ],
  Costco: [
    { item_name: "Chicken Thighs, family pack", price: 2.79, unit: "lb" },
    { item_name: "Ground Beef, bulk", price: 5.29, unit: "lb" },
  ],
};

const GENERIC_DEMO = [
  { item_name: "Chicken Thighs", price: 4.29, unit: "lb" },
  { item_name: "Ground Beef", price: 6.49, unit: "lb" },
  { item_name: "Pork Shoulder", price: 3.29, unit: "lb" },
];

export interface DemoProteinDealInput {
  store_name: string;
  protein_type: ProteinType;
  protein_cut: string | null;
  price: number;
  unit: string;
  valid_from: string | null;
  valid_to: string | null;
}

export function fetchDemoProteinDealsForBanners(banners: string[]): DemoProteinDealInput[] {
  if (!shouldSyncDemoDeals()) return [];

  const out: DemoProteinDealInput[] = [];
  const seen = new Set<string>();
  const validTo = new Date();
  validTo.setDate(validTo.getDate() + 7);

  for (const banner of banners) {
    const items = DEMO_ITEMS_BY_BANNER[banner] ?? [];
    for (const item of items) {
      const norm = normalizeProteinDeal(item.item_name);
      if (!norm) continue;
      const key = `${banner}-${norm.protein_type}-${norm.protein_cut ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        store_name: banner,
        protein_type: norm.protein_type,
        protein_cut: norm.protein_cut,
        price: item.price,
        unit: item.unit,
        valid_from: null,
        valid_to: validTo.toISOString(),
      });
    }
  }

  if (out.length === 0) {
    for (const item of GENERIC_DEMO) {
      const norm = normalizeProteinDeal(item.item_name);
      if (!norm) continue;
      out.push({
        store_name: "Local Grocery",
        protein_type: norm.protein_type,
        protein_cut: norm.protein_cut,
        price: item.price,
        unit: item.unit,
        valid_from: null,
        valid_to: validTo.toISOString(),
      });
    }
  }

  return out;
}

/** @deprecated */
export function fetchDemoDealsForBanners(banners: string[]) {
  return fetchDemoProteinDealsForBanners(banners).map((d) => ({
    store_name: d.store_name,
    item_name: d.protein_cut
      ? `${d.protein_type} ${d.protein_cut}`
      : d.protein_type,
    price: d.price,
    unit: d.unit,
    valid_from: d.valid_from,
    valid_to: d.valid_to,
    source_url: null,
    image_url: null,
  }));
}

export function isManualTestDealsEnabled(): boolean {
  return shouldSyncDemoDeals();
}
