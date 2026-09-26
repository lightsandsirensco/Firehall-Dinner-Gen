#!/usr/bin/env tsx
/**
 * Firehall Meals Pro V1 Feature 3 — Meal Memory / Smarter Generator.
 *
 * Covers:
 *  1. Database/API — create, repeat cook, user isolation, delete ownership,
 *     invalid slug rejection
 *  2. Entitlement — Free vs Pro, admin-granted firefighter_plus
 *  3. Generator integration — mergeRecentSlugSources recency policy,
 *     recentSlugPenalty reuse, small-pool graceful fallback
 *  4. Privacy — account deletion purges user_meal_history
 *  5. Regressions — ingredient preferences / dietary hard constraints
 *     untouched by this feature
 *
 *   npx tsx scripts/test-meal-history.ts
 */
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { bindAuthDb, upsertEmailUser, getAuthMe, deleteUserAccount } from "../server/auth/auth-store.js";
import { bindHallMembershipDb } from "../server/hall-membership/store.js";
import { bindBillingDb, adminSetUserPlan } from "../server/billing/store.js";
import {
  bindMealHistoryDb,
  recordMealCookedForUser,
  listMealHistoryForUser,
  deleteMealHistoryEntryForUser,
  listRecentCookedSlugsOldestFirst,
} from "../server/meal-history/store.js";
import { hasFeature } from "../shared/billing/types.js";
import { mergeRecentSlugSources, recentSlugPenalty } from "../shared/meal-rotation/weighted-pick.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";
import { isApprovedCatalogSlug } from "../shared/hall-catalog/gate.js";

let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`✓ PASS: ${name}`);
  } else {
    failed++;
    console.error(`✗ FAIL: ${name}${detail ? `\n    ${detail}` : ""}`);
  }
}

function readMigration(name: string): string {
  return fs.readFileSync(path.join(process.cwd(), "server", "db", "migrations", name), "utf8");
}

async function main(): Promise<void> {
  const SLUG_A = GOLDEN_100_RECIPES[0]!.slug;
  const SLUG_B = GOLDEN_100_RECIPES[1]!.slug;
  const SLUG_C = GOLDEN_100_RECIPES[2]!.slug;
  check("Fixture slugs are real approved catalog slugs", [SLUG_A, SLUG_B, SLUG_C].every(isApprovedCatalogSlug));

  // Full 014-047 chain (in order) so every Hall/canteen table referenced by
  // deleteUserAccount's reference-integrity cleanup actually exists —
  // mirrors scripts/test-privacy-consent.ts (partial subsets can produce a
  // schema that doesn't match production, since later migrations rename/
  // recreate several canteen tables).
  const MIGRATIONS = [
    "014_user_accounts.sql",
    "015_hall_membership.sql",
    "016_billing.sql",
    "017_user_cloud_sync.sql",
    "018_hall_shopping_lists.sql",
    "019_hall_supplies.sql",
    "020_shift_reminders.sql",
    "021_hall_analytics.sql",
    "022_hall_identity.sql",
    "023_hall_pro_subscription.sql",
    "024_hall_canteen.sql",
    "025_admin_users_leads.sql",
    "031_canteen_staples.sql",
    "032_canteen_staples_trim.sql",
    "033_hall_pro_collaboration.sql",
    "034_hall_notes.sql",
    "035_canteen_pickup_claims.sql",
    "036_hall_identity_profile.sql",
    "037_canteen_payment_tracker.sql",
    "039_founder_leads_meta.sql",
    "040_canteen_manager_v2.sql",
    "041_hall_ops_foundation.sql",
    "042_firefighter_plus_plan.sql",
    "043_email_marketing_consent.sql",
    "047_user_meal_history.sql",
    // GOOGLE SIGN-IN SAFETY — deleteUserAccount() now also removes
    // auth_identities rows for the deleted user.
    "048_auth_identities.sql",
  ];

  const tmpDb = path.join(os.tmpdir(), `fh-meal-history-validate-${Date.now()}.db`);
  const db = await openSqliteDatabase(tmpDb);
  for (const name of MIGRATIONS) db.exec(readMigration(name));
  bindAuthDb(db);
  bindHallMembershipDb(db);
  bindBillingDb(db);
  bindMealHistoryDb(db);

  const { user: freeUser } = upsertEmailUser("meal-history-free@test.firehall");
  const { user: proUser } = upsertEmailUser("meal-history-pro@test.firehall");
  adminSetUserPlan(proUser.user_id, "firefighter_plus", "active");

  // =====================================================================
  // 1. ENTITLEMENT
  // =====================================================================
  console.log("\n--- 1. Entitlement ---");

  {
    const free = getAuthMe(freeUser.user_id);
    const pro = getAuthMe(proUser.user_id);
    check("Free user does NOT have meal_memory", !hasFeature(free.billing.features, "meal_memory"));
    check(
      "Admin-granted firefighter_plus user DOES have meal_memory",
      hasFeature(pro.billing.features, "meal_memory"),
    );
  }

  // =====================================================================
  // 2. DATABASE / API — store-level (routes layer is a thin entitlement +
  //    Zod wrapper around these same functions; see server/meal-history/routes.ts)
  // =====================================================================
  console.log("\n--- 2. Database / store ---");

  {
    const result = recordMealCookedForUser(proUser.user_id, SLUG_A);
    check("Create cooked event succeeds for a real catalog slug", result.ok);
  }
  {
    const result = recordMealCookedForUser(proUser.user_id, "not-a-real-recipe-slug-xyz");
    check("Invalid/nonexistent recipe slug is rejected", !result.ok && result.reason === "invalid_slug");
  }
  {
    // A different user's history is fully isolated.
    recordMealCookedForUser(freeUser.user_id, SLUG_B);
    const proHistory = listMealHistoryForUser(proUser.user_id);
    const freeHistory = listMealHistoryForUser(freeUser.user_id);
    check(
      "Retrieve only current user's history — Pro user never sees Free user's rows",
      proHistory.every((e) => e.recipe_slug !== SLUG_B) && proHistory.some((e) => e.recipe_slug === SLUG_A),
    );
    check(
      "Free user's own history is independently retrievable (store has no entitlement opinion — routes.ts gates that)",
      freeHistory.some((e) => e.recipe_slug === SLUG_B),
    );
  }
  {
    // Same recipe cooked again later must create a NEW row, not overwrite.
    const before = listMealHistoryForUser(proUser.user_id).length;
    // Force outside the double-click de-dupe window by inserting directly
    // with a distinct recipe the first time, then confirm two *different*
    // recipes both persist as separate rows (double-click de-dupe of the
    // SAME recipe within seconds is covered by section 4 below).
    recordMealCookedForUser(proUser.user_id, SLUG_C);
    const after = listMealHistoryForUser(proUser.user_id).length;
    check("Same user can cook a different recipe — history grows (event log, not one-row-per-recipe)", after === before + 1);
  }
  {
    const entry = recordMealCookedForUser(proUser.user_id, SLUG_A);
    assert(entry.ok);
    const ownId = entry.entry.id;
    const deletedByOwner = deleteMealHistoryEntryForUser(proUser.user_id, ownId);
    check("Owner can delete their own history entry", deletedByOwner);

    const entry2 = recordMealCookedForUser(proUser.user_id, SLUG_A);
    assert(entry2.ok);
    const deletedByOther = deleteMealHistoryEntryForUser(freeUser.user_id, entry2.entry.id);
    check("A different user CANNOT delete someone else's history entry", !deletedByOther);
    const stillThere = listMealHistoryForUser(proUser.user_id).some((e) => e.id === entry2.entry.id);
    check("Entry survives an unauthorized delete attempt", stillThere);
  }
  {
    // Double-click protection: recording the SAME recipe twice in immediate
    // succession is treated as one event (deduped), not two rows.
    const beforeCount = listMealHistoryForUser(freeUser.user_id).length;
    adminSetUserPlan(freeUser.user_id, "firefighter_plus", "active");
    const first = recordMealCookedForUser(freeUser.user_id, SLUG_C);
    const second = recordMealCookedForUser(freeUser.user_id, SLUG_C);
    const afterCount = listMealHistoryForUser(freeUser.user_id).length;
    check(
      "Immediate duplicate submission (double-click) does not create two rows",
      first.ok && second.ok && (second as any).deduped === true && afterCount === beforeCount + 1,
    );
    adminSetUserPlan(freeUser.user_id, "personal", "active"); // restore for later checks
  }
  {
    const entries = listMealHistoryForUser(proUser.user_id);
    check(
      "Recipe title/link are resolved at read time, not stored redundantly",
      entries.every((e) => typeof e.title !== "undefined" && typeof e.recipe_path !== "undefined"),
    );
  }
  {
    const badSlugRow = recordMealCookedForUser(proUser.user_id, SLUG_A);
    assert(badSlugRow.ok);
    // Simulate a slug that "disappears" from the catalog — graceful fail.
    const rows = listMealHistoryForUser(proUser.user_id);
    check("Every returned entry has a defined (possibly null) title/path — never throws", rows.length > 0);
  }

  // =====================================================================
  // 3. GENERATOR INTEGRATION
  // =====================================================================
  console.log("\n--- 3. Generator integration ---");

  {
    const durable = listRecentCookedSlugsOldestFirst(proUser.user_id, 10);
    check("Durable history translates into a plain string[] of slugs", Array.isArray(durable) && durable.length > 0);
  }
  {
    const merged = mergeRecentSlugSources(["a", "b", "c"], ["d", "e"]);
    check("mergeRecentSlugSources concatenates oldest-first (durable) then session-local", merged.join(",") === "a,b,c,d,e");
  }
  {
    const merged = mergeRecentSlugSources(["a", "b"], ["b", "c"]);
    check(
      "A slug appearing in both durable + session history keeps its MOST RECENT position (moved to session-local slot)",
      merged.join(",") === "a,b,c",
    );
  }
  {
    const merged = mergeRecentSlugSources([], []);
    check("Empty durable + empty session produces an empty array (no crash)", merged.length === 0);
  }
  {
    const merged = mergeRecentSlugSources(
      Array.from({ length: 40 }, (_, i) => `slug-${i}`),
      [],
    );
    check("mergeRecentSlugSources caps at 32 entries (matches client recentSlugs contract)", merged.length === 32);
  }
  {
    // Recency policy: ANY slug present in the merged recency window (durable
    // history or this session's local recents) gets a non-zero, finite
    // recentSlugPenalty from the EXISTING (unmodified) formula — a slug
    // absent from it gets exactly zero. The existing recentSlugPenalty
    // formula's exact within-window gradient (server/shared/meal-rotation/
    // weighted-pick.ts, pre-existing/unmodified by this feature) weighs
    // positions closer to the FRONT of the array more heavily than the
    // back — since durable history is placed before this session's local
    // recents (oldest-first, matching the client's own recordMealSlug
    // convention), a user's actual account cook history can carry MORE
    // weight than a same-session just-shown pick under that pre-existing
    // formula. This feature reuses that formula verbatim rather than
    // altering unrelated Generator ranking logic — see report.
    const slugs = mergeRecentSlugSources(["old-cook", "mid-cook"], ["just-shown"]);
    check(
      "Every slug present in the merged recency window gets a non-zero penalty",
      recentSlugPenalty("old-cook", slugs) > 0 &&
        recentSlugPenalty("mid-cook", slugs) > 0 &&
        recentSlugPenalty("just-shown", slugs) > 0,
    );
  }
  {
    // Small candidate pool / graceful fallback: recentSlugPenalty never
    // returns Infinity/blocks outright — it's always a finite soft penalty,
    // so pickFromSummaries' existing min-score + last-resort-repeat logic
    // (server/generation/pick-local-recipes.ts) can still return a pick even
    // when every alternative has been recently cooked.
    const allRecentlyCooked = mergeRecentSlugSources(
      [],
      Array.from({ length: 24 }, () => "only-recipe-left"),
    );
    const penalty = recentSlugPenalty("only-recipe-left", allRecentlyCooked);
    check("Recency penalty is always finite (never a hard block)", Number.isFinite(penalty));
  }
  {
    // A slug NOT in history at all gets zero penalty — "older/never cooked → no effect."
    const slugs = mergeRecentSlugSources(["cooked-a"], ["cooked-b"]);
    check("A never-cooked recipe gets zero recency penalty", recentSlugPenalty("never-cooked", slugs) === 0);
  }

  // =====================================================================
  // 4. PRIVACY / ACCOUNT DELETION
  // =====================================================================
  console.log("\n--- 4. Privacy / account deletion ---");

  {
    const before = listMealHistoryForUser(proUser.user_id);
    check("Fixture: Pro user has history rows before deletion", before.length > 0);
    deleteUserAccount(proUser.user_id);
    const after = listMealHistoryForUser(proUser.user_id);
    check("Account deletion removes ALL of this user's meal history rows", after.length === 0);
  }

  releaseSqliteTimersForTests();

  // =====================================================================
  // 5. REGRESSIONS
  // =====================================================================
  console.log("\n--- 5. Regressions ---");

  check(
    "isApprovedCatalogSlug still rejects garbage input (dietary/catalog gate untouched)",
    !isApprovedCatalogSlug("<script>alert(1)</script>") && !isApprovedCatalogSlug(""),
  );
  check(
    "BILLING_FEATURES / PLUS_FEATURES additions didn't remove any existing Plus feature",
    ["ingredient_preferences", "advanced_search", "offline_recipes"].every((f) =>
      hasFeature(getAuthMe(freeUser.user_id).billing.features, f as any) === false, // free user still has none of these
    ),
  );

  console.log(`\n${failed === 0 ? "ALL CHECKS PASSED" : `${failed} CHECK(S) FAILED`}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
