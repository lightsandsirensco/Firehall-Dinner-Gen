/**
 * Regression tests — soup titles must not route to chili template.
 */
import fs from "node:fs";
import path from "node:path";
import { inferRecipeInstructionClass } from "../shared/golden-100/recipe-quality/recipe-instruction-class.js";
import { buildEditorialInstructions } from "../shared/golden-100/recipe-quality/instruction-engine.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/recipes-data.js";
import { titleMatchesDishIdentity } from "../shared/meal-format-contract.js";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const CHILI_WORDING =
  /\b(chili powder|kidney beans|bloom the spices|chili splatters|chili should be bold|ground beef \(80\/20\))\b/i;

function loadPage(slug: string): Record<string, unknown> {
  const file = path.join("client/public/catalog/golden-100/pages", `${slug}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
}

function pageBlob(page: Record<string, unknown>): string {
  const ingredients = (page.ingredients as Array<{ name: string }>) ?? [];
  const steps = (page.steps as Array<{ title: string; instruction: string }>) ?? [];
  return [
    page.title,
    ...ingredients.map((i) => i.name),
    ...steps.map((s) => `${s.title} ${s.instruction}`),
  ].join(" ");
}

for (const slug of ["beef-barley-soup", "chicken-dumpling-soup"] as const) {
  const def = GOLDEN_100_RECIPES.find((r) => (r.classicSlug || r.slug) === slug);
  assert(!!def, `${slug} missing from GOLDEN_100_RECIPES`);

  const cls = inferRecipeInstructionClass(def!);
  assert(cls === "soup", `${slug} instruction class should be soup, got ${cls}`);

  const built = buildEditorialInstructions(def!, 8);
  const builtBlob = [
    ...built.ingredients.map((i) => i.name),
    ...built.steps.map((s) => `${s.title} ${s.instruction}`),
  ].join(" ");
  assert(!CHILI_WORDING.test(builtBlob), `${slug} buildEditorialInstructions still has chili template wording`);

  const page = loadPage(slug);
  const blob = pageBlob(page);
  assert(!CHILI_WORDING.test(blob), `${slug} published page still has chili template wording`);

  const identity = titleMatchesDishIdentity(String(page.title), page.ingredients as Array<{ name: string }>);
  assert(identity.ok, `${slug} titleMatchesDishIdentity failed: ${identity.reason}`);
}

// Generic soup title must not infer chili
const soupDef = GOLDEN_100_RECIPES.find((r) => r.slug === "beef-barley-soup")!;
const soupTitleOnly = { ...soupDef, slug: "test-vegetable-soup", title: "Vegetable Soup" };
assert(inferRecipeInstructionClass(soupTitleOnly) === "soup", "Vegetable Soup should infer soup class");

const chiliDef = GOLDEN_100_RECIPES.find((r) => r.slug === "big-chili")!;
assert(inferRecipeInstructionClass(chiliDef) === "chili", "big-chili should stay chili class");

console.log("[test-soup-instruction-routing] OK");
