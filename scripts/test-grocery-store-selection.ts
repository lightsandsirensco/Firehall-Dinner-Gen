#!/usr/bin/env tsx
/**
 * Local grocery store selection — discovery, preferences, demo deals scoped to hall.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { bindAuthDb, upsertEmailUser } from "../server/auth/auth-store.js";
import {
  bindHallMembershipDb,
  createHall,
  updateHall,
} from "../server/hall-membership/store.js";
import {
  bindBillingDb,
  enableHallPro,
} from "../server/billing/store.js";
import {
  bindGroceryDealsDb,
  getProteinDealsResponse,
  refreshProteinDealsFromProvider,
} from "../server/grocery-deals/store.js";
import {
  findNearbyStores,
  getGroceryPreferences,
  saveGroceryPreferences,
} from "../server/grocery-deals/preferences-store.js";
import { clearGeocodeCache } from "../store_locator_providers/geocode.js";
import { provinceFromCanadianPostal } from "../store_locator_providers/geocode.js";

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

const tmpDb = path.join(os.tmpdir(), `fh-grocery-stores-${Date.now()}.db`);

async function main(): Promise<void> {
  clearGeocodeCache();

  assert.equal(provinceFromCanadianPostal("L4L6A5"), "ON");

  const db = await openSqliteDatabase(tmpDb);
  for (const sql of MIGRATIONS) db.exec(sql);
  bindAuthDb(db);
  bindHallMembershipDb(db);
  bindBillingDb(db);
  bindGroceryDealsDb(db);

  const captain = upsertEmailUser("captain@firehall.test").user;
  const detail = createHall(captain.user_id, {
    hall_name: "Station 141",
    appliances: ["stove"],
  });
  const hallId = detail.hall.hall_id;
  enableHallPro(hallId, captain.user_id);
  updateHall(hallId, captain.user_id, { postal_code: "L4L6A5", province_state: "ON" });

  const nearby = await findNearbyStores(db, hallId, {
    postal_code: "L4L6A5",
    country: "CA",
    radius_km: 20,
  });
  assert.ok(nearby.stores.length > 0, "expected regional stores for L4L6A5");
  const banners = new Set(nearby.stores.map((s) => s.banner));
  assert.ok(banners.has("No Frills") || banners.has("Food Basics"), "expected Ontario banners");

  const pick = nearby.stores.slice(0, 3);
  saveGroceryPreferences(db, hallId, {
    postal_code: "L4L6A5",
    country: "CA",
    max_distance_km: 15,
    preferred_store_ids: pick.map((s) => s.store_id),
    default_store_id: pick[0]!.store_id,
  }, pick);

  const prefs = getGroceryPreferences(db, hallId);
  assert.equal(prefs.setup_complete, true);
  assert.equal(prefs.preferred_stores.length, 3);

  await refreshProteinDealsFromProvider(hallId);

  const deals = await getProteinDealsResponse(hallId, true);
  assert.equal(deals.setup_complete, true);
  assert.ok(deals.preferred_stores.length === 3);
  assert.ok(deals.mode === "demo");
  assert.ok(deals.deals.length > 0);

  const storeNames = new Set(deals.deals.map((d) => d.store_name.toLowerCase()));
  const allowedBanners = new Set(prefs.preferred_stores.map((s) => s.banner.toLowerCase()));
  for (const name of storeNames) {
    assert.ok(
      [...allowedBanners].some((b) => name.includes(b)),
      `deal store ${name} should match preferred banners`,
    );
  }

  console.log("grocery-store-selection: OK");
  releaseSqliteTimersForTests();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
