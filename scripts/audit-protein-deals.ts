#!/usr/bin/env tsx
/**
 * Protein deals audit — normalization, demo mode, paywall, recipe relevance.
 */
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
  getProteinDealsResponse,
  refreshProteinDealsFromProvider,
} from "../server/grocery-deals/store.js";
import { saveGroceryPreferences, findNearbyStores } from "../server/grocery-deals/preferences-store.js";
import { normalizeProteinDeal } from "../deals_providers/deal-normalizer.js";
import { matchRecipesForProteinDeal } from "../server/grocery-deals/recipe-match.js";
import { resetRecipeMatchCatalogCache } from "../server/grocery-deals/recipe-match.js";
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

const failures: string[] = [];
function fail(msg: string): void {
  failures.push(msg);
}

async function main(): Promise<void> {
  process.env.PROTEIN_DEALS_MODE = "demo";

  const norm = normalizeProteinDeal("Boneless Skinless Chicken Thighs");
  if (!norm || norm.protein_type !== "chicken" || norm.protein_cut !== "thighs") {
    fail("chicken thigh normalization");
  }
  const ground = normalizeProteinDeal("Ground Beef");
  if (!ground || ground.protein_type !== "beef" || ground.protein_cut !== "ground") {
    fail("ground beef normalization");
  }
  if (normalizeProteinDeal("Romaine Lettuce") !== null) fail("produce should be excluded");

  const tmpDb = path.join(os.tmpdir(), `fh-audit-protein-${Date.now()}.db`);
  const db = await openSqliteDatabase(tmpDb);
  for (const sql of MIGRATIONS) db.exec(sql);
  bindAuthDb(db);
  bindHallMembershipDb(db);
  bindBillingDb(db);
  bindGroceryDealsDb(db);
  resetRecipeMatchCatalogCache();

  const captain = upsertEmailUser("audit-protein@firehall.test").user;
  const hall = createHall(captain.user_id, { hall_name: "Protein Station", appliances: ["stove"] });
  const hallId = hall.hall.hall_id;
  updateHall(hallId, captain.user_id, { postal_code: "K1A0B1" });

  const nearby = await findNearbyStores(db, hallId, {
    postal_code: "K1A0B1",
    country: "CA",
    radius_km: 20,
  });
  const pick = nearby.stores.slice(0, 2);
  if (pick.length === 0) fail("expected nearby stores");

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

  const pro = await getProteinDealsResponse(hallId, true);
  if (!pro.setup_complete) fail("setup incomplete");
  if (pro.deals.length === 0) fail("expected protein deals");
  for (const deal of pro.deals) {
    if (!deal.store_name) fail("deal missing store");
    if (!deal.protein_type) fail("deal missing protein_type");
  }

  const chicken = pro.deals.find((d) => d.protein_type === "chicken");
  if (chicken) {
    const recipes = matchRecipesForProteinDeal(chicken);
    if (recipes.length === 0) fail("expected chicken recipes");
  }

  const free = await getProteinDealsResponse(hallId, false);
  if (!free.hall_pro_locked) fail("free should be locked");
  assert.equal(userHasFeature(captain.user_id, "hall_grocery_planning", { hall_id: hallId }), false);
  enableHallPro(hallId, captain.user_id);
  assert.equal(userHasFeature(captain.user_id, "hall_grocery_planning", { hall_id: hallId }), true);

  if (pro.top_deals.length > 3) fail("top_deals should be max 3 in response slice");
  if (!proteinDealLabel(pro.deals[0]!)) fail("label required");
  const groundDeal = pro.deals.find((d) => d.protein_type === "beef" && d.protein_cut === "ground");
  if (groundDeal && proteinDealLabel(groundDeal) !== "Ground Beef") {
    fail(`ground beef label expected "Ground Beef", got "${proteinDealLabel(groundDeal)}"`);
  }

  if (failures.length > 0) {
    console.error("[audit:protein-deals] FAILED:\n" + failures.map((f) => `  - ${f}`).join("\n"));
    process.exit(1);
  }
  console.log("[audit:protein-deals] OK");
  releaseSqliteTimersForTests();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
