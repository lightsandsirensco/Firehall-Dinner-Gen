#!/usr/bin/env tsx
/**
 * Generator personalization merge rules.
 */
import {
  crewSizeToBucket,
  mapDietaryToAllergens,
  mapDietaryToDiets,
  mapProfileAppliancesToSimplified,
  parsePersonalPrefs,
  personalPrefsFromFilters,
  resolveGeneratorFilters,
} from "../shared/generator-personalization.js";
import { createDefaultSimplifiedFilters } from "../shared/generator-simplified.js";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(crewSizeToBucket(4) === "2-4", "crew 4 → 2-4");
assert(crewSizeToBucket(6) === "5-8", "crew 6 → 5-8");
assert(crewSizeToBucket(10) === "9-12", "crew 10 → 9-12");
assert(crewSizeToBucket(14) === "12+", "crew 14 → 12+");

assert(
  mapProfileAppliancesToSimplified(["stove", "grill", "flat_top"]).join(",") ===
    "stovetop,bbq,flat_top",
  "profile appliances map",
);

assert(
  mapDietaryToAllergens(["dairy", "vegetarian", "gluten"]).join(",") === "dairy,gluten",
  "dietary map skips vegetarian",
);

// Regression: "vegan"/"pork-free" account-level dietary restrictions were previously
// silently DROPPED by mapDietaryToAllergens (explicitly skipped, never routed anywhere).
// mapDietaryToDiets must now capture them instead of discarding them.
assert(
  mapDietaryToDiets(["vegan", "pork-free"]).sort().join(",") === "porkFree,vegan",
  "mapDietaryToDiets captures vegan + pork-free instead of dropping them",
);
assert(mapDietaryToDiets(["dairy", "gluten"]).length === 0, "mapDietaryToDiets ignores unrelated restrictions");

// personalPrefsFromFilters must round-trip diets through parsePersonalPrefs (local-storage persistence).
const roundTripped = parsePersonalPrefs(
  personalPrefsFromFilters({ ...createDefaultSimplifiedFilters(), diets: ["vegan"] }),
);
assert(!!roundTripped && roundTripped.diets.includes("vegan"), "diets round-trip through parsePersonalPrefs");

const hallLinked = resolveGeneratorFilters({
  personal: null,
  session: null,
  preferences: null,
  hall: { crew_size: 8, appliances: ["grill", "oven"] },
  hallLinked: true,
  localCrewSize: 6,
});
assert(hallLinked.crew_bucket === "5-8", "hall crew 8");
assert(hallLinked.appliances.includes("bbq"), "hall grill → bbq");
assert(hallLinked.appliances.includes("oven"), "hall oven");

const returning = resolveGeneratorFilters({
  personal: parsePersonalPrefs({
    schemaVersion: 1,
    protein: "beef",
    healthiness: "comfort",
    allergens: ["dairy"],
    updatedAt: new Date().toISOString(),
  }),
  session: createDefaultSimplifiedFilters(),
  preferences: { dietary_restrictions: ["gluten"], preferred_proteins: ["chicken"], appliance_preferences: [], excluded_ingredients: [], shift_reminders_enabled: false, shift_days: [], shift_reminder_time: "17:00", shift_reminder_timezone: "UTC" },
  hall: null,
  hallLinked: false,
  localCrewSize: 6,
});
assert(returning.protein === "beef", "personal protein wins");
assert(returning.healthiness === "comfort", "personal healthiness wins");
assert(returning.allergens.includes("dairy"), "personal allergens win");

const accountOnly = resolveGeneratorFilters({
  personal: null,
  session: null,
  preferences: {
    preferred_proteins: ["turkey"],
    dietary_restrictions: ["shellfish"],
    appliance_preferences: ["air_fryer"],
    excluded_ingredients: [],
    shift_reminders_enabled: false,
    shift_days: [],
    shift_reminder_time: "17:00",
    shift_reminder_timezone: "UTC",
  },
  hall: null,
  hallLinked: false,
});
assert(accountOnly.protein === "turkey", "account protein default");
assert(accountOnly.allergens.includes("shellfish"), "account allergens");
assert(accountOnly.appliances.includes("air_fryer"), "account appliances");

// Regression: an account-level "vegan" dietary_restriction must now surface as a `diets`
// toggle in the resolved generator filters, not vanish silently.
const accountVegan = resolveGeneratorFilters({
  personal: null,
  session: null,
  preferences: {
    preferred_proteins: [],
    dietary_restrictions: ["vegan"],
    appliance_preferences: [],
    excluded_ingredients: [],
    shift_reminders_enabled: false,
    shift_days: [],
    shift_reminder_time: "17:00",
    shift_reminder_timezone: "UTC",
  },
  hall: null,
  hallLinked: false,
});
assert(accountVegan.diets.includes("vegan"), "account-level vegan restriction reaches generator filters.diets");

// Firehall Meals Pro V1 Feature 2 — "Foods to Avoid" personalization merge.
// Existing user with no saved preference defaults to no avoided foods.
const noAvoidByDefault = resolveGeneratorFilters({
  personal: null,
  session: null,
  preferences: null,
  hall: null,
  hallLinked: false,
});
assert(noAvoidByDefault.foodsToAvoid.length === 0, "existing user defaults to no avoided foods");

// A saved account-level excluded_ingredients preference becomes the session default.
const accountFoodsToAvoid = resolveGeneratorFilters({
  personal: null,
  session: null,
  preferences: {
    preferred_proteins: [],
    dietary_restrictions: [],
    appliance_preferences: [],
    excluded_ingredients: ["mushrooms", "olives"],
    shift_reminders_enabled: false,
    shift_days: [],
    shift_reminder_time: "17:00",
    shift_reminder_timezone: "UTC",
  },
  hall: null,
  hallLinked: false,
});
assert(
  accountFoodsToAvoid.foodsToAvoid.sort().join(",") === "mushrooms,olives",
  "account excluded_ingredients becomes generator foodsToAvoid default",
);

// Invalid/unknown keys are never accepted, even from a "saved" account preference.
const accountFoodsToAvoidInvalid = resolveGeneratorFilters({
  personal: null,
  session: null,
  preferences: {
    preferred_proteins: [],
    dietary_restrictions: [],
    appliance_preferences: [],
    excluded_ingredients: ["mushrooms", "not-a-real-key"],
    shift_reminders_enabled: false,
    shift_days: [],
    shift_reminder_time: "17:00",
    shift_reminder_timezone: "UTC",
  },
  hall: null,
  hallLinked: false,
});
assert(
  accountFoodsToAvoidInvalid.foodsToAvoid.join(",") === "mushrooms",
  "unknown foodsToAvoid keys are dropped even when they arrive via saved preferences",
);

// A per-session override (this generation only) wins over the saved account default —
// the saved preference must never become impossible to override for one session.
const sessionOverridesFoodsToAvoid = resolveGeneratorFilters({
  personal: null,
  session: { ...createDefaultSimplifiedFilters(), foodsToAvoid: ["cilantro"] },
  preferences: {
    preferred_proteins: [],
    dietary_restrictions: [],
    appliance_preferences: [],
    excluded_ingredients: ["mushrooms", "olives"],
    shift_reminders_enabled: false,
    shift_days: [],
    shift_reminder_time: "17:00",
    shift_reminder_timezone: "UTC",
  },
  hall: null,
  hallLinked: false,
});
assert(
  sessionOverridesFoodsToAvoid.foodsToAvoid.join(",") === "cilantro",
  "session foodsToAvoid choice overrides the saved account default",
);

// personalPrefsFromFilters/parsePersonalPrefs round-trip foodsToAvoid (local-storage persistence).
const foodsRoundTripped = parsePersonalPrefs(
  personalPrefsFromFilters({ ...createDefaultSimplifiedFilters(), foodsToAvoid: ["cilantro", "corn"] }),
);
assert(
  !!foodsRoundTripped && foodsRoundTripped.foodsToAvoid.sort().join(",") === "cilantro,corn",
  "foodsToAvoid round-trips through parsePersonalPrefs",
);
assert(
  !!parsePersonalPrefs(personalPrefsFromFilters(createDefaultSimplifiedFilters()))?.foodsToAvoid,
  "parsePersonalPrefs always returns a foodsToAvoid array (never undefined)",
);

// Saved account crew_size (user_profiles.crew_size, edited on /account) becomes the
// Generator's default crew bucket for a first-time/no-session user.
const accountCrewSize = resolveGeneratorFilters({
  personal: null,
  session: null,
  preferences: null,
  hall: null,
  hallLinked: false,
  localCrewSize: 6,
  accountCrewSize: 12,
});
assert(accountCrewSize.crew_bucket === "9-12", "account crew_size 12 → 9-12 bucket default");

// A session crew_bucket already picked by the user this session must win over the
// account default — defaults never overwrite an explicit in-session choice.
const sessionOverridesAccountCrewSize = resolveGeneratorFilters({
  personal: null,
  session: { ...createDefaultSimplifiedFilters(), crew_bucket: "2-4" },
  preferences: null,
  hall: null,
  hallLinked: false,
  localCrewSize: 6,
  accountCrewSize: 12,
});
assert(
  sessionOverridesAccountCrewSize.crew_bucket === "2-4",
  "session crew_bucket wins over account crew_size default",
);

// An active hall link still always wins over the account-level personal default.
const hallOverridesAccountCrewSize = resolveGeneratorFilters({
  personal: null,
  session: null,
  preferences: null,
  hall: { crew_size: 8, appliances: [] },
  hallLinked: true,
  localCrewSize: 6,
  accountCrewSize: 20,
});
assert(hallOverridesAccountCrewSize.crew_bucket === "5-8", "hall crew_size wins over account crew_size default");

console.log("[test-generator-personalization] OK");
process.exit(0);
