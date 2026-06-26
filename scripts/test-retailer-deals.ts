#!/usr/bin/env tsx
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { bindAuthDb, upsertEmailUser } from "../server/auth/auth-store.js";
import { bindHallMembershipDb, createHall, updateHall } from "../server/hall-membership/store.js";
import { bindBillingDb, enableHallPro, userHasFeature } from "../server/billing/store.js";
import {
  bindGroceryDealsDb,
  getProteinDealsHighlight,
  getProteinDealsResponse,
  refreshProteinDealsFromProvider,
} from "../server/grocery-deals/store.js";
import { normalizeProteinDeal } from "../deals_providers/deal-normalizer.js";
import { matchRecipesForDeal, resetRecipeMatchCatalogCache } from "../server/grocery-deals/recipe-match.js";
import { saveGroceryPreferences, findNearbyStores } from "../server/grocery-deals/preferences-store.js";

process.env.PROTEIN_DEALS_MODE = "demo";

const MIGRATIONS = [
  "014_user_accounts.sql",
  "015_hall_membership.sql",
  "016_billing.sql",
  "022_hall_identity.sql",
  "023_hall_pro_subscription.sql",
  "026_grocery_deals.sql",
  "027_retailer_deals.sql",
  "028_grocery_store_selection.sql",
  "029_retailer_deals_admin_seeded.sql",
  "030_protein_deals.sql",
].map((name) =>
  fs.readFileSync(path.join(process.cwd(), "server", "db", "migrations", name), "utf8"),
);

async function main(): Promise<void> {
  const tmpDb = path.join(os.tmpdir(), `fh-retailer-deals-${Date.now()}.db`);
  const db = await openSqliteDatabase(tmpDb);
  for (const sql of MIGRATIONS) db.exec(sql);
  bindAuthDb(db);
  bindHallMembershipDb(db);
  bindBillingDb(db);
  bindGroceryDealsDb(db);
  resetRecipeMatchCatalogCache();

  const norm = normalizeProteinDeal("Boneless Skinless Chicken Thighs, club pack");
  assert.equal(norm?.protein_type, "chicken");
  assert.equal(norm?.protein_cut, "thighs");

  const captain = upsertEmailUser("captain@firehall.test").user;
  const detail = createHall(captain.user_id, { hall_name: "Station 9", appliances: ["stove"] });
  const hallId = detail.hall.hall_id;
  updateHall(hallId, captain.user_id, { postal_code: "K1A0B1" });
  enableHallPro(hallId, captain.user_id);
  assert.equal(userHasFeature(captain.user_id, "hall_grocery_planning", { hall_id: hallId }), true);

  const nearby = await findNearbyStores(db, hallId, {
    postal_code: "K1A0B1",
    country: "CA",
    radius_km: 20,
  });
  saveGroceryPreferences(
    db,
    hallId,
    {
      postal_code: "K1A0B1",
      country: "CA",
      max_distance_km: 15,
      preferred_store_ids: nearby.stores.slice(0, 2).map((s) => s.store_id),
    },
    nearby.stores.slice(0, 2),
  );

  await refreshProteinDealsFromProvider(hallId);

  const response = await getProteinDealsResponse(hallId, true);
  assert.equal(response.setup_complete, true);
  assert.ok(response.deals.some((d) => d.protein_type === "chicken"));

  const highlight = getProteinDealsHighlight(hallId);
  assert.ok(highlight.deal != null);

  const recipes = matchRecipesForDeal("chicken", "Chicken thighs", "chicken", "thighs");
  assert.ok(recipes.length > 0);

  console.log("retailer-deals: OK");
  releaseSqliteTimersForTests();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
