#!/usr/bin/env tsx
import assert from "node:assert/strict";
import { PERFORMANCE_ADAPTED_RECIPES } from "../shared/performance-meals/adapted/index.js";
import { validatePerformanceSourceRegistry } from "../shared/performance-meals/source-registry.js";
import { PERFORMANCE_MEAL_COUNT } from "../shared/performance-meals/types.js";

const registryIssues = validatePerformanceSourceRegistry();
assert.equal(registryIssues.length, 0, registryIssues.join("; "));
assert.equal(PERFORMANCE_ADAPTED_RECIPES.length, PERFORMANCE_MEAL_COUNT);

const slugs = new Set(PERFORMANCE_ADAPTED_RECIPES.map((r) => r.manifest.slug));
assert.equal(slugs.size, PERFORMANCE_MEAL_COUNT);

console.log(`[test-performance-meals-manifest] OK ${PERFORMANCE_MEAL_COUNT} recipes`);
