#!/usr/bin/env tsx
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  PERFORMANCE_ADAPTED_RECIPES,
  batch01,
  batch02,
  batch03,
  batch04,
  batch05,
} from "../shared/performance-meals/adapted/index.js";
import { PHASE5_REMOVED_SLUGS } from "../shared/catalog-consolidation/phase5-redirects.js";
import { PERFORMANCE_SOURCE_SELECTED, validatePerformanceSourceRegistry } from "../shared/performance-meals/source-registry.js";
import { PERFORMANCE_MEAL_COUNT } from "../shared/performance-meals/types.js";

const registryIssues = validatePerformanceSourceRegistry();
assert.equal(registryIssues.length, 0, registryIssues.join("; "));

// The original "Performance Meals 50" release is exactly the registry selection (batches 01–05).
const original = [...batch01, ...batch02, ...batch03, ...batch04, ...batch05].map((r) => r.manifest.slug);
const selected = new Set(PERFORMANCE_SOURCE_SELECTED.map((s) => s.firehallSlug));
assert.equal(original.length, PERFORMANCE_MEAL_COUNT);
assert.deepEqual([...original].sort(), [...selected].sort());

const all = PERFORMANCE_ADAPTED_RECIPES.map((r) => r.manifest.slug);
const duplicates = all.filter((s, i) => all.indexOf(s) !== i);
assert.deepEqual(duplicates, [], `duplicate performance slugs: ${duplicates.join(", ")}`);
const expansionInRegistry = all.slice(original.length).filter((s) => selected.has(s));
assert.deepEqual(expansionInRegistry, [], `expansion recipes duplicated in the original registry: ${expansionInRegistry.join(", ")}`);

// Published catalog = every defined recipe except Phase 5 consolidations (those redirect to a canonical slug).
const live = all.filter((s) => !PHASE5_REMOVED_SLUGS.has(s)).sort();
const catalogDir = path.join(process.cwd(), "client", "public", "catalog", "performance-meals");
const index = JSON.parse(fs.readFileSync(path.join(catalogDir, "index.json"), "utf8")) as {
  recipeCount: number;
  recipes: Array<{ slug: string }>;
};
const indexed = index.recipes.map((r) => r.slug).sort();
const pages = fs
  .readdirSync(path.join(catalogDir, "pages"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))
  .sort();
assert.deepEqual(indexed, live, "performance index must list exactly the live (non-consolidated) recipes");
assert.equal(index.recipeCount, live.length);
assert.deepEqual(pages, live, "performance pages on disk must match the live recipes");

console.log(
  `[test-performance-meals-manifest] OK ${PERFORMANCE_MEAL_COUNT} original + ${all.length - original.length} expansion; ${live.length} live (${all.length - live.length} consolidated)`,
);
