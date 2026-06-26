export type ProteinType =
  | "chicken"
  | "beef"
  | "pork"
  | "sausage"
  | "turkey"
  | "fish"
  | "seafood";

/** V1 — protein deals surface only (no seafood bucket; shrimp maps to fish). */
export type ProteinDealV1Type = Exclude<ProteinType, "seafood">;

export const PROTEIN_DEAL_V1_TYPES: ProteinDealV1Type[] = [
  "chicken",
  "beef",
  "pork",
  "sausage",
  "turkey",
  "fish",
];

export function isProteinDealV1Type(type: ProteinType): type is ProteinDealV1Type {
  return PROTEIN_DEAL_V1_TYPES.includes(type as ProteinDealV1Type);
}

export type ProteinDealsMode = "disabled" | "demo" | "provider" | "admin_seeded";

export interface ProteinDealRow {
  id: string;
  hall_id: string;
  store_name: string;
  protein_type: ProteinType;
  protein_cut: string | null;
  price: number | null;
  unit: string | null;
  valid_from: string | null;
  valid_to: string | null;
  fetched_at: string;
}

export interface ProteinDealMatchedRecipe {
  slug: string;
  title: string;
  protein: string;
  heroImage: string;
  match_reason: string;
}

export interface ProteinDealsTeaser {
  message: string;
  top_deals: ProteinDealRow[];
  setup_complete: boolean;
  hall_pro_required: boolean;
}

export interface ProteinDealsResponse {
  hall_id: string;
  postal_code: string | null;
  country: string | null;
  mode: ProteinDealsMode;
  available: boolean;
  unavailable_message: string | null;
  integration_coming_soon: boolean;
  setup_complete: boolean;
  hall_pro_locked: boolean;
  teaser: ProteinDealsTeaser | null;
  preferred_stores: Array<{ store_id: string; store_name: string; banner: string }>;
  last_refreshed_at: string | null;
  deals: ProteinDealRow[];
  top_deals: ProteinDealRow[];
}

export const PROTEIN_TYPES: ProteinType[] = [
  ...PROTEIN_DEAL_V1_TYPES,
  "seafood",
];

function titleCaseWords(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function proteinDealLabel(deal: ProteinDealRow): string {
  const typeName = titleCaseWords(deal.protein_type === "seafood" ? "fish" : deal.protein_type);
  if (!deal.protein_cut) return typeName;
  const cut = titleCaseWords(deal.protein_cut);
  if (deal.protein_cut === "ground") return `Ground ${typeName}`;
  return `${typeName} ${cut}`;
}

export function formatProteinPrice(deal: ProteinDealRow): string {
  if (deal.price == null) return "—";
  const unit = deal.unit ? `/${deal.unit}` : "";
  return `$${deal.price.toFixed(2)}${unit}`;
}
