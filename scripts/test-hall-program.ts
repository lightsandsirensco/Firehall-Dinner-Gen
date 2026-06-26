#!/usr/bin/env tsx
/**
 * Validates Hall Program landing copy and analytics event registration.
 */
import assert from "node:assert/strict";
import { ANALYTICS_EVENT_TYPES } from "../shared/analytics/events.js";
import {
  HALL_PROGRAM_BENEFITS,
  HALL_PROGRAM_HEADLINE,
  HALL_PROGRAM_HOW_IT_WORKS,
  HALL_PROGRAM_PRICING_TIERS,
  HALL_PROGRAM_ROLE_SECTIONS,
  HALL_PROGRAM_SUBHEADLINE,
} from "../shared/hall-program/copy.js";
import { buildHallProgramSeo } from "../shared/seo/metadata.js";

function main(): void {
  assert.equal(HALL_PROGRAM_HEADLINE, "Built For Fire Halls.");
  assert.ok(HALL_PROGRAM_SUBHEADLINE.includes("dinner"));

  assert.equal(HALL_PROGRAM_HOW_IT_WORKS.length, 3);
  assert.equal(HALL_PROGRAM_ROLE_SECTIONS.length, 3);
  assert.deepEqual(
    HALL_PROGRAM_ROLE_SECTIONS.map((r) => r.id),
    ["cooks", "canteen_managers", "captains"],
  );

  assert.equal(HALL_PROGRAM_BENEFITS.length, 5);
  assert.ok(HALL_PROGRAM_BENEFITS.includes("Hall grocery planning"));

  assert.equal(HALL_PROGRAM_PRICING_TIERS.length, 3);
  assert.deepEqual(
    HALL_PROGRAM_PRICING_TIERS.map((t) => t.name),
    ["Free", "Personal", "Hall Pro"],
  );

  const seo = buildHallProgramSeo();
  assert.equal(seo.canonicalPath, "/hall-program");
  assert.ok(seo.title.includes("Hall Program"));

  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_program_viewed"));
  assert.ok(ANALYTICS_EVENT_TYPES.includes("hall_program_started"));

  console.log("[test-hall-program] OK");
}

main();
