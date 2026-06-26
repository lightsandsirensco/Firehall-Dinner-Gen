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
import { saveGroceryPreferences, findNearbyStores } from "../server/grocery-deals/preferences-store.js";
import { normalizeFlyerItem } from "../server/grocery-deals/normalize.js";
import { matchRecipesForDeal, resetRecipeMatchCatalogCache } from "../server/grocery-deals/recipe-match.js";
import { PROTEIN_DEALS } from "../client/src/lib/brand-copy.ts";
import { proteinDealLabel } from "../shared/protein-deals/types.js";

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

process.env.PROTEIN_DEALS_MODE = "demo";

async function main(): Promise<void> {
  assert.equal(PROTEIN_DEALS.question, "What protein is cheap this week?");
  assert.equal(PROTEIN_DEALS.actions.findMeals, "Find Meals");
  assert.equal(PROTEIN_DEALS.actions.addToList, "Add to Shopping List");

  const tmpDb = path.join(os.tmpdir(), `fh-protein-deals-${Date.now()}.db`);
  const db = await openSqliteDatabase(tmpDb);
  for (const sql of MIGRATIONS) db.exec(sql);
  bindAuthDb(db);
  bindHallMembershipDb(db);
  bindBillingDb(db);
  bindGroceryDealsDb(db);
  resetRecipeMatchCatalogCache();

  const norm = normalizeFlyerItem("Boneless chicken thighs");
  assert.equal(norm?.protein_type, "chicken");

  const captain = upsertEmailUser("captain@firehall.test").user;
  const detail = createHall(captain.user_id, { hall_name: "Station 9", appliances: ["stove"] });
  const hallId = detail.hall.hall_id;
  updateHall(hallId, captain.user_id, { postal_code: "K1A0B1" });

  const nearby = await findNearbyStores(db, hallId, {
    postal_code: "K1A0B1",
    country: "CA",
    radius_km: 25,
  });
  const pick = nearby.stores.slice(0, 2);
  assert.ok(pick.length > 0, "expected nearby stores");

  saveGroceryPreferences(
    db,
    hallId,
    {
      postal_code: "K1A0B1",
      country: "CA",
      max_distance_km: 15,
      preferred_store_ids: pick.map((s) => s.store_id),
      default_store_id: pick[0]!.store_id,
    },
    pick,
  );

  await refreshProteinDealsFromProvider(hallId);

  assert.equal(userHasFeature(captain.user_id, "hall_grocery_planning", { hall_id: hallId }), false);
  enableHallPro(hallId, captain.user_id);
  assert.equal(userHasFeature(captain.user_id, "hall_grocery_planning", { hall_id: hallId }), true);

  const response = await getProteinDealsResponse(hallId, true);
  assert.equal(response.setup_complete, true);
  assert.ok(response.deals.length > 0, "expected demo protein deals");
  assert.ok(proteinDealLabel(response.deals[0]!).length > 0);

  const highlight = getProteinDealsHighlight(hallId);
  assert.ok(highlight.message === null || highlight.message.length > 0);

  const recipes = matchRecipesForDeal("chicken", "Chicken thighs", "chicken", "thighs");
  assert.ok(recipes.length > 0);

  console.log("[test-protein-deals] OK");
  releaseSqliteTimersForTests();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
