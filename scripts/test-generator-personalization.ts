#!/usr/bin/env tsx
/**
 * Generator personalization merge rules.
 */
import {
  crewSizeToBucket,
  mapDietaryToAllergens,
  mapProfileAppliancesToSimplified,
  parsePersonalPrefs,
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
  preferences: { dietary_restrictions: ["gluten"], preferred_proteins: ["chicken"], appliance_preferences: [], shift_reminders_enabled: false, shift_days: [], shift_reminder_time: "17:00", shift_reminder_timezone: "UTC" },
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

console.log("[test-generator-personalization] OK");
process.exit(0);
