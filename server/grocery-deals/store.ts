import { nanoid } from "nanoid";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import { runDbMigrations } from "../db/migrate.js";
import type {
  ProteinDealRow,
  ProteinDealsResponse,
  ProteinDealsTeaser,
  ProteinType,
} from "../../shared/protein-deals/types.js";
import { proteinDealLabel } from "../../shared/protein-deals/types.js";
import type { GroceryDealsHighlight } from "../../shared/grocery-deals/types.js";
import { normalizeProteinDeal } from "../../deals_providers/deal-normalizer.js";
import { fetchDemoProteinDealsForBanners } from "../../deals_providers/manual-test-provider.js";
import {
  resolveProteinDealsMode,
  shouldSyncDemoDeals,
  shouldSyncProviderDeals,
  isDealsModeDisabled,
} from "../../deals_providers/grocery-deals-mode.js";
import {
  getGroceryPreferences,
  getPreferredBanners,
  getPreferredStoreIds,
} from "./preferences-store.js";
import {
  fetchDealsFromProvider,
  isGroceryDealsProviderConfigured,
  type ProviderDealInput,
} from "./provider.js";

let db: SqliteDatabase;

export function bindGroceryDealsDb(database: SqliteDatabase): void {
  db = database;
}

export const bindProteinDealsDb = bindGroceryDealsDb;

export async function initGroceryDealsStore(): Promise<void> {
  await runDbMigrations();
  db = await getSharedLocalDb();
}

export const initProteinDealsStore = initGroceryDealsStore;

function getDb(): SqliteDatabase {
  if (!db) throw new Error("Protein deals store not initialized");
  return db;
}

function rowToProteinDeal(row: Record<string, unknown>): ProteinDealRow {
  return {
    id: String(row.id),
    hall_id: String(row.hall_id),
    store_name: String(row.store_name),
    protein_type: String(row.protein_type) as ProteinType,
    protein_cut: row.protein_cut ? String(row.protein_cut) : null,
    price: row.price != null ? Number(row.price) : null,
    unit: row.unit ? String(row.unit) : null,
    valid_from: row.valid_from ? String(row.valid_from) : null,
    valid_to: row.valid_to ? String(row.valid_to) : null,
    fetched_at: String(row.fetched_at),
  };
}

export function getHallPostalCode(hallId: string): string | null {
  const d = getDb();
  const row = d.prepare(`SELECT postal_code FROM halls WHERE hall_id = ?`).get(hallId) as
    | { postal_code: string | null }
    | undefined;
  const code = row?.postal_code ? String(row.postal_code).trim() : "";
  return code || null;
}

export function setHallPostalCode(hallId: string, postalCode: string | null): void {
  const d = getDb();
  d.prepare(`UPDATE halls SET postal_code = ?, updated_at = datetime('now') WHERE hall_id = ?`).run(
    postalCode?.trim().toUpperCase() || null,
    hallId,
  );
}

function insertProteinDeal(
  hallId: string,
  input: {
    store_name: string;
    protein_type: ProteinType;
    protein_cut?: string | null;
    price?: number | null;
    unit?: string | null;
    valid_from?: string | null;
    valid_to?: string | null;
  },
): ProteinDealRow | null {
  const d = getDb();
  const id = nanoid(12);
  const now = new Date().toISOString();
  d.prepare(
    `INSERT INTO protein_deals (
      id, hall_id, store_name, protein_type, protein_cut, price, unit, valid_from, valid_to, fetched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    hallId,
    input.store_name.trim(),
    input.protein_type,
    input.protein_cut ?? null,
    input.price ?? null,
    input.unit ?? null,
    input.valid_from ?? null,
    input.valid_to ?? null,
    now,
  );
  return rowToProteinDeal(
    d.prepare(`SELECT * FROM protein_deals WHERE id = ?`).get(id) as Record<string, unknown>,
  );
}

function insertFromItemName(
  hallId: string,
  storeName: string,
  itemName: string,
  price: number | null,
  unit: string | null,
  validFrom: string | null,
  validTo: string | null,
): ProteinDealRow | null {
  const norm = normalizeProteinDeal(itemName);
  if (!norm) return null;
  return insertProteinDeal(hallId, {
    store_name: storeName,
    protein_type: norm.protein_type,
    protein_cut: norm.protein_cut,
    price,
    unit,
    valid_from: validFrom,
    valid_to: validTo,
  });
}

export function listProteinDealsForHall(hallId: string, preferredOnly = true): ProteinDealRow[] {
  const d = getDb();
  let rows = d
    .prepare(
      `SELECT * FROM protein_deals WHERE hall_id = ?
       ORDER BY CASE WHEN price IS NULL THEN 1 ELSE 0 END, price ASC, fetched_at DESC`,
    )
    .all(hallId) as Array<Record<string, unknown>>;

  if (preferredOnly) {
    const preferredBanners = new Set(getPreferredBanners(d, hallId).map((b) => b.toLowerCase()));
    if (preferredBanners.size > 0) {
      rows = rows.filter((row) => {
        const storeName = String(row.store_name ?? "").toLowerCase();
        return [...preferredBanners].some((b) => storeName.includes(b) || b.includes(storeName));
      });
    }
  }

  return rows.map(rowToProteinDeal);
}

function sortByPrice(deals: ProteinDealRow[]): ProteinDealRow[] {
  return [...deals].sort((a, b) => {
    const pa = a.price ?? Number.POSITIVE_INFINITY;
    const pb = b.price ?? Number.POSITIVE_INFINITY;
    return pa - pb;
  });
}

function syncDemoProteinDealsToHall(hallId: string): number {
  if (!shouldSyncDemoDeals()) return 0;
  const d = getDb();
  const banners = getPreferredBanners(d, hallId);
  if (banners.length === 0) return 0;

  d.prepare(`DELETE FROM protein_deals WHERE hall_id = ?`).run(hallId);

  const demoDeals = fetchDemoProteinDealsForBanners(banners);
  let inserted = 0;
  for (const deal of demoDeals) {
    const row = insertProteinDeal(hallId, deal);
    if (row) inserted++;
  }
  return inserted;
}

async function ensureFreshProteinDealsForHall(hallId: string): Promise<{
  refreshed: boolean;
  failed: boolean;
  error: string | null;
}> {
  const d = getDb();
  const prefs = getGroceryPreferences(d, hallId);
  if (!prefs.setup_complete && prefs.preferred_stores.length === 0) {
    return { refreshed: false, failed: false, error: null };
  }

  if (isDealsModeDisabled()) {
    return { refreshed: false, failed: false, error: null };
  }

  if (shouldSyncProviderDeals() && isGroceryDealsProviderConfigured()) {
    try {
      const postal = prefs.postal_code ?? getHallPostalCode(hallId);
      if (!postal) return { refreshed: false, failed: false, error: null };
      const incoming = await fetchDealsFromProvider(postal);
      d.prepare(`DELETE FROM protein_deals WHERE hall_id = ?`).run(hallId);
      let inserted = 0;
      for (const deal of incoming) {
        const row = insertFromItemName(
          hallId,
          deal.store_name,
          deal.item_name,
          deal.price ?? null,
          deal.unit ?? null,
          deal.valid_from ?? null,
          deal.valid_to ?? null,
        );
        if (row) inserted++;
      }
      if (shouldSyncDemoDeals()) syncDemoProteinDealsToHall(hallId);
      return { refreshed: inserted > 0, failed: false, error: null };
    } catch (err: unknown) {
      if (shouldSyncDemoDeals()) syncDemoProteinDealsToHall(hallId);
      return {
        refreshed: false,
        failed: true,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (shouldSyncDemoDeals()) {
    const count = syncDemoProteinDealsToHall(hallId);
    return { refreshed: count > 0, failed: false, error: null };
  }

  return { refreshed: false, failed: false, error: null };
}

export function getProteinDealsTeaser(hallId: string): ProteinDealsTeaser {
  const d = getDb();
  const prefs = getGroceryPreferences(d, hallId);
  const deals = sortByPrice(listProteinDealsForHall(hallId)).slice(0, 3);

  return {
    message:
      deals.length > 0
        ? deals.map((p) => `${proteinDealLabel(p)} at ${p.store_name}`).join(" · ")
        : prefs.setup_complete
          ? "Protein deals integration coming soon."
          : "Set up your stores to see protein deals.",
    top_deals: deals,
    setup_complete: prefs.setup_complete,
    hall_pro_required: true,
  };
}

export const getDealsTeaser = getProteinDealsTeaser;

export async function getProteinDealsResponse(
  hallId: string,
  hallPro = true,
): Promise<ProteinDealsResponse> {
  const d = getDb();
  const prefs = getGroceryPreferences(d, hallId);
  const postal_code = prefs.postal_code ?? getHallPostalCode(hallId);
  const mode = resolveProteinDealsMode();
  let unavailable_message: string | null = null;
  let available = true;

  if (prefs.setup_complete && !isDealsModeDisabled()) {
    const sync = await ensureFreshProteinDealsForHall(hallId);
    if (sync.failed) {
      available = listProteinDealsForHall(hallId).length > 0;
      if (!available) unavailable_message = "Protein deals are unavailable right now.";
    }
  }

  const allDeals = hallPro ? sortByPrice(listProteinDealsForHall(hallId)) : [];
  const integration_coming_soon = isDealsModeDisabled() && prefs.setup_complete;
  const demoActive = shouldSyncDemoDeals() && prefs.preferred_stores.length > 0;

  return {
    hall_id: hallId,
    postal_code,
    country: prefs.country,
    mode,
    available: isDealsModeDisabled() ? false : available || demoActive,
    unavailable_message: integration_coming_soon
      ? "Protein deals integration coming soon."
      : unavailable_message,
    integration_coming_soon,
    setup_complete: prefs.setup_complete,
    hall_pro_locked: !hallPro,
    teaser: !hallPro ? getProteinDealsTeaser(hallId) : null,
    preferred_stores: prefs.preferred_stores.map((s) => ({
      store_id: s.store_id,
      store_name: s.store_name,
      banner: s.banner,
    })),
    last_refreshed_at: allDeals[0]?.fetched_at ?? null,
    deals: allDeals,
    top_deals: allDeals.slice(0, 3),
  };
}

export const getDealsResponse = getProteinDealsResponse;

export function getProteinDealsHighlight(hallId: string): GroceryDealsHighlight {
  const deals = sortByPrice(listProteinDealsForHall(hallId));
  const featured = deals[0] ?? null;
  if (!featured) {
    const prefs = getGroceryPreferences(getDb(), hallId);
    if (!prefs.setup_complete) {
      return { message: "Set up your stores", deal: null };
    }
    return { message: null, deal: null };
  }
  return {
    message: `${proteinDealLabel(featured)} at ${featured.store_name}`,
    deal: featured,
  };
}

export const getDealsHighlight = getProteinDealsHighlight;

export function getProteinDealById(hallId: string, dealId: string): ProteinDealRow | null {
  const d = getDb();
  const row = d
    .prepare(`SELECT * FROM protein_deals WHERE hall_id = ? AND id = ?`)
    .get(hallId, dealId) as Record<string, unknown> | undefined;
  return row ? rowToProteinDeal(row) : null;
}

export const getDealById = getProteinDealById;

export async function refreshProteinDealsFromProvider(hallId: string): Promise<{
  inserted: number;
  postal_code: string;
  failed?: boolean;
  error?: string;
}> {
  const postalCode = getHallPostalCode(hallId);
  if (!postalCode) {
    throw new Error("Postal code required — set it in linked hall settings");
  }

  if (isDealsModeDisabled()) {
    return { inserted: 0, postal_code: postalCode };
  }

  const inserted = syncDemoProteinDealsToHall(hallId);
  if (inserted > 0 || shouldSyncDemoDeals()) {
    return { inserted, postal_code: postalCode };
  }

  if (shouldSyncProviderDeals() && isGroceryDealsProviderConfigured()) {
    const sync = await ensureFreshProteinDealsForHall(hallId);
    const count = listProteinDealsForHall(hallId).length;
    return {
      inserted: count,
      postal_code: postalCode,
      failed: sync.failed,
      error: sync.error ?? undefined,
    };
  }

  return { inserted: 0, postal_code: postalCode };
}

export const refreshDealsFromProvider = refreshProteinDealsFromProvider;

export const listDealsForHall = listProteinDealsForHall;
