/**
 * "Pick Tonight's Meal" must resolve a catalog slug to the same record the recipe detail page
 * and Explore use. Run: npx tsx scripts/test-tonight-content-integrity.ts
 */
import assert from "node:assert/strict";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { hydrateCatalogGenerateResponse } from "../server/meal-catalog/hydrate-golden-generate.js";
import {
  loadCanonicalCatalogPage,
  loadCanonicalCatalogPageForDisplay,
} from "../server/meal-catalog/canonical-page.js";
import { applyCatalogGateToClientPayload, mustApproveCatalogRecipe } from "../server/meal-catalog/catalog-response-gate.js";
import { tonightFilterProtein, tonightIneligibleReason } from "../server/generation/tonight-eligibility.js";
import { TONIGHT_IMAGE_HOLDS } from "../shared/catalog-integrity/image-holds.js";
import { canonicalExploreProtein } from "../shared/explore-taxonomy.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";
import { buildEditorialInstructions } from "../shared/golden-100/recipe-quality/instruction-engine.js";

await initCuratedRecipeStore();

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Hydration is the canonical page: same title, every ingredient, every step, same total time.
for (const slug of ["chicken-parm", "steak-tacos", "pulled-pork", "big-chili", "turkey-burgers", "crock-barbacoa-chicken"]) {
  const page = loadCanonicalCatalogPage(slug);
  const h = hydrateCatalogGenerateResponse(slug, page?.crewSize || 8);
  assert.ok(page && h, `${slug} hydrates`);
  assert.equal(h.title, page.title, `${slug} title`);
  assert.deepEqual(
    h.recipe.ingredients.map((i) => norm(String(i.item))),
    page.ingredients.map((i) => norm(i.name)),
    `${slug} ingredients`,
  );
  assert.equal(h.recipe.steps.length, page.steps.length, `${slug} step count`);
  assert.equal(h.recipe.timing?.total_minutes, (page.prepTime ?? 0) + (page.cookTime ?? 0), `${slug} total time`);
}

// Wrong-dish photos never reach Tonight.
for (const slug of Object.keys(TONIGHT_IMAGE_HOLDS)) {
  assert.match(String(tonightIneligibleReason(slug)), /^image_hold:/, `${slug} held`);
}
assert.equal(tonightIneligibleReason("chicken-parm"), null);

// Tonight filters on the protein Explore shows, including per-slug overrides.
assert.equal(canonicalExploreProtein("vegetarian", "smoked-baked-beans-crew"), "Bacon");
assert.equal(tonightFilterProtein("vegetarian", "smoked-baked-beans-crew"), "pork");
assert.equal(tonightFilterProtein("vegetarian", "charred-broccolini-lemon-tray"), "seafood");
assert.equal(tonightFilterProtein("sausage and beef", "dirty-rice-crew-skillet"), "mixed");
assert.equal(tonightFilterProtein("chicken", "chicken-parm"), "chicken");

// The outbound card carries the detail page's title and verified hero, and passes the gate.
for (const slug of ["steak-tacos", "big-chili", "steak-sandwiches"]) {
  const page = loadCanonicalCatalogPageForDisplay(slug)!;
  const gated = applyCatalogGateToClientPayload(
    { title: "Some Other Title", hero_image: "/images/golden-100/other.jpg", meal_plate: { display_title: "Drifted Plate Title" } },
    { slug },
  ) as Record<string, any>;
  assert.equal(gated.title, page.title, `${slug} gated title`);
  assert.equal(gated.meal_plate.display_title, page.title, `${slug} plate title`);
  assert.equal(gated.hero_image, page.heroVerified ? page.heroImage : "", `${slug} gated hero`);
  const check = mustApproveCatalogRecipe({ slug, title: gated.title, heroImage: gated.hero_image || undefined });
  assert.ok(check.approved, `${slug} approved: ${check.reasons.join(",")}`);
}

// Format templates follow the recipe's protein and title.
const def = (slug: string) => GOLDEN_100_RECIPES.find((r) => r.slug === slug)!;
const turkey = buildEditorialInstructions(def("turkey-burgers"), 8);
assert.ok(turkey.ingredients.some((i) => /turkey/i.test(i.name)), "turkey burger has turkey");
assert.ok(!turkey.ingredients.some((i) => /beef/i.test(i.name)), "turkey burger has no beef");
const fajitas = buildEditorialInstructions(def("sheet-pan-fajitas"), 8);
assert.ok(fajitas.ingredients.some((i) => /tortilla/i.test(i.name)), "fajitas have tortillas");
const smash = buildEditorialInstructions(def("smash-burgers"), 8);
assert.ok(smash.ingredients.some((i) => /beef/i.test(i.name)), "smash burgers stay beef");

console.log("[test-tonight-content-integrity] OK");
