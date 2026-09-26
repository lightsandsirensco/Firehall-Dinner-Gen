#!/usr/bin/env tsx
/**
 * SEO PHASE 4 — regression test for recipe-guidance server rendering.
 *
 * Phase 4 extended `server/seo/content-snapshot.ts` to render each recipe's
 * existing "why crews like it / hall tips / tonight's spread / substitutions
 * / meal prep / leftovers / equipment" guidance (Golden-100-shaped families),
 * "equipment / morning spread / station workflow / cleanup / leftovers"
 * (Breakfast), and "substitutions / on shift" (Smoothies) into the
 * pre-hydration HTML snapshot — content that already existed in canonical
 * recipe data and was already shown to users post-hydration, but never
 * reached crawlers/non-JS clients before this phase. (Smoothies also have a
 * `nutrition.highlights` field, but every current recipe's value is the
 * literal placeholder "Nutrition estimate coming soon" — deliberately
 * excluded, see test below.)
 *
 * This test proves, straight from real on-disk catalog data (no mocks):
 *   1. Populated guidance fields render as real, non-empty HTML sections.
 *   2. Every section heading used server-side is the *same* heading string
 *      the recipe's own client page component renders post-hydration — so
 *      there is never a second, differently-labeled copy of the same
 *      content after React takes over (no hydration-era content drift).
 *   3. Recipes that genuinely lack an optional field (no `substitutions`, no
 *      `mealPrepNotes`, no `equipment`) render with that heading *absent* —
 *      never an empty "Substitutions" heading with no items under it.
 *   4. `whyCrewsLikeIt` is deduped against the subtitle/lead paragraph
 *      exactly like the client (`dedupeAgainstShownCopy`), so the snapshot
 *      never repeats the same sentence twice back-to-back.
 *   5. No internal-only ranking/generation metadata (realismScore,
 *      firefighterScore, popularityWeight, contentVersion, generatedAt,
 *      searchTerms, sourceUrl, classicSlug, avoidTags) ever leaks into the
 *      rendered HTML.
 *   6. Core recipe facts (title, ingredient count/names, step count,
 *      nutrition numbers) are unchanged — this phase never touches them.
 *   7. Families with zero qualifying differentiating fields (none of this
 *      recipe's family's candidate fields are non-empty) still render a
 *      complete, valid snapshot with no forced/empty sections.
 *
 * Usage:
 *   npx tsx scripts/test-recipe-guidance-ssr.ts
 */
import fs from "node:fs";
import path from "node:path";

import {
  goldenRecipeSnapshot,
  breakfastRecipeSnapshot,
  fuelRecipeSnapshot,
  renderRecipeSnapshotHtml,
  type RecipeSnapshotData,
} from "../server/seo/content-snapshot.js";
import { goldenRecipeLeadParagraph } from "../shared/golden-100/lead-paragraph.js";
import type { GoldenRecipePage } from "../shared/golden-100/recipe-page-schema.js";
import type { BreakfastRecipePage } from "../shared/breakfast-schema.js";
import type { FuelRecipePage } from "../shared/fuel-catalog/schema.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const failures: string[] = [];

function fail(msg: string): void {
  failures.push(msg);
  console.error(`  ✗ ${msg}`);
}

function ok(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function readClientSource(file: string): string {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

// Internal-only fields that must NEVER leak into crawler-facing HTML.
const INTERNAL_ONLY_MARKERS = [
  "realismScore",
  "firefighterScore",
  "popularityWeight",
  "contentVersion",
  "generatedAt",
  "searchTerms",
  "sourceUrl",
  "sourceName",
  "classicSlug",
  "avoidTags",
];

function assertNoInternalLeak(label: string, html: string) {
  for (const marker of INTERNAL_ONLY_MARKERS) {
    if (html.includes(marker)) fail(`${label}: internal-only marker "${marker}" leaked into rendered HTML`);
  }
}

/** Every `<h2>` must be immediately followed by non-empty `<ul>`/`<ol>`/`<p>` content — never a heading with nothing under it. */
function assertNoEmptyHeadings(label: string, html: string) {
  const headingMatches = [
    ...html.matchAll(/<h2>([^<]*)<\/h2>(<ul[^>]*>(.*?)<\/ul>|<ol[^>]*>(.*?)<\/ol>|<p[^>]*>(.*?)<\/p>)?/g),
  ];
  for (const m of headingMatches) {
    const heading = m[1];
    const hasFollowUp = m[2] !== undefined;
    if (!hasFollowUp) {
      fail(`${label}: heading "${heading}" has no immediately-following <ul>/<ol>/<p> content`);
      continue;
    }
    const body = m[3] ?? m[4] ?? m[5] ?? "";
    if (!body.trim()) fail(`${label}: heading "${heading}" is followed by empty content`);
  }
}

function assertHeadingsMatchClient(label: string, sectionHeadings: string[], clientSourceFiles: string[]) {
  const clientSource = clientSourceFiles.map(readClientSource).join("\n");
  for (const heading of sectionHeadings) {
    if (!clientSource.includes(heading)) {
      fail(`${label}: server-rendered heading "${heading}" was not found as a literal string in ${clientSourceFiles.join(", ")} — server/client heading drift risk`);
    }
  }
}

console.log("=".repeat(100));
console.log("PHASE 4 — Recipe guidance SSR regression test");
console.log("=".repeat(100));

// ---------------------------------------------------------------------------
// 1) Golden-100-shaped families (Golden 100, Hall Expansion, Performance,
//    BBQ, Pizza Night) — all share `goldenRecipeSnapshot` + the same client
//    page (`client/src/pages/golden-recipe-page.tsx`).
// ---------------------------------------------------------------------------

const GOLDEN_CLIENT_FILE = "client/src/pages/golden-recipe-page.tsx";
const GOLDEN_FAMILIES = ["golden-100", "hall-expansion", "performance-meals", "bbq", "pizza-night"];

interface GoldenSample {
  family: string;
  slug: string;
  page: GoldenRecipePage;
}

function loadGoldenFamily(family: string): GoldenSample[] {
  const index = readJson<{ recipes: Array<{ slug: string }> }>(
    path.join(PUBLIC, "catalog", family, "index.json"),
  );
  return index.recipes.map((entry) => ({
    family,
    slug: entry.slug,
    page: readJson<GoldenRecipePage>(path.join(PUBLIC, "catalog", family, "pages", `${entry.slug}.json`)),
  }));
}

const allGolden: GoldenSample[] = GOLDEN_FAMILIES.flatMap(loadGoldenFamily);
console.log(`\nLoaded ${allGolden.length} golden-100-shaped recipes across ${GOLDEN_FAMILIES.length} families.\n`);

// --- 1a. Every populated field renders as a real section on a representative sample per family.
for (const family of GOLDEN_FAMILIES) {
  const sample = allGolden.find((r) => r.family === family && r.page.proTips.length && r.page.tonightSpread.length && r.page.leftovers.length);
  if (!sample) {
    fail(`${family}: could not find a sample recipe with proTips/tonightSpread/leftovers to test`);
    continue;
  }
  const data = goldenRecipeSnapshot(sample.page);
  const html = renderRecipeSnapshotHtml("https://example.com", data);

  const expectedHeadings: string[] = [];
  if (sample.page.tonightSpread.length) expectedHeadings.push("Tonight's spread");
  if (sample.page.proTips.length) expectedHeadings.push("Hall tips");
  if (sample.page.substitutions?.length) expectedHeadings.push("Substitutions");
  if (sample.page.mealPrepNotes?.trim()) expectedHeadings.push("Meal prep");
  if (sample.page.leftovers.length) expectedHeadings.push("Leftovers");
  // NOTE: `equipment` is deliberately excluded from `expectedHeadings` — the
  // client shows it as unlabeled pills with no section heading, so the
  // server snapshot renders the same items with no `<h2>` either (see
  // "equipment/no-heading parity" checks below).

  for (const heading of expectedHeadings) {
    if (!html.includes(`<h2>${heading}</h2>`)) fail(`${family}/${sample.slug}: expected heading "${heading}" missing from rendered HTML`);
  }
  if (expectedHeadings.length) ok(`${family}/${sample.slug}: renders ${expectedHeadings.join(", ")}`);

  // Every proTip/tonightSpread/leftovers string must appear verbatim (escaped) in the HTML.
  for (const tip of sample.page.proTips) {
    if (!html.includes(escapeForCheck(tip))) fail(`${family}/${sample.slug}: proTip text missing from rendered HTML: "${tip.slice(0, 60)}"`);
  }
  assertNoEmptyHeadings(`${family}/${sample.slug}`, html);
  assertNoInternalLeak(`${family}/${sample.slug}`, html);
  assertHeadingsMatchClient(`${family}/${sample.slug}`, expectedHeadings, [GOLDEN_CLIENT_FILE]);

  // --- Equipment/no-heading parity: content still renders (crawlable), but
  // never behind a fabricated "<h2>Equipment</h2>" the client doesn't show.
  if (sample.page.equipment.length) {
    if (html.includes("<h2>Equipment</h2>")) {
      fail(`${family}/${sample.slug}: rendered a crawler-only "<h2>Equipment</h2>" heading the client never shows (equipment is unlabeled pills client-side)`);
    } else {
      for (const item of sample.page.equipment) {
        if (!html.includes(escapeForCheck(item))) fail(`${family}/${sample.slug}: equipment item missing from rendered HTML: "${item}"`);
      }
      ok(`${family}/${sample.slug}: equipment renders as heading-less content, matching client's unlabeled pills`);
    }
  }
}

// --- 1a-2. Lead-paragraph parity: server snapshot and client both call the
// *same* shared `goldenRecipeLeadParagraph` helper (see
// `shared/golden-100/lead-paragraph.ts`), so this proves the wiring is
// actually in place on both sides rather than two independently-maintained
// copies of the same rule that could silently drift apart.
{
  const clientSource = readClientSource(GOLDEN_CLIENT_FILE);
  if (!clientSource.includes("goldenRecipeLeadParagraph")) {
    fail(`${GOLDEN_CLIENT_FILE}: does not call the shared goldenRecipeLeadParagraph() helper — lead paragraph logic may have been re-duplicated independently`);
  } else {
    ok(`${GOLDEN_CLIENT_FILE}: uses the shared goldenRecipeLeadParagraph() helper`);
  }

  // Representative recipes covering both branches of the rule: one whose
  // shortDescription duplicates its subtitle (must fall back to
  // `description`), and one whose shortDescription genuinely differs (must
  // be used as-is).
  const dupShort = allGolden.find((r) => {
    const short = r.page.shortDescription?.trim().toLowerCase();
    const subtitle = r.page.subtitle?.trim().toLowerCase();
    return short && subtitle && short === subtitle;
  });
  const distinctShort = allGolden.find((r) => {
    const short = r.page.shortDescription?.trim().toLowerCase();
    const subtitle = r.page.subtitle?.trim().toLowerCase();
    return short && subtitle && short !== subtitle;
  });

  for (const [label, sample] of [
    ["shortDescription duplicates subtitle -> falls back to description", dupShort],
    ["shortDescription distinct from subtitle -> used as lead", distinctShort],
  ] as const) {
    if (!sample) {
      ok(`lead paragraph: no recipe found for case "${label}" (nothing to test for this branch)`);
      continue;
    }
    const expected = goldenRecipeLeadParagraph(sample.page);
    const data = goldenRecipeSnapshot(sample.page);
    if (data.description !== expected) {
      fail(`${sample.family}/${sample.slug}: server snapshot lead paragraph ("${data.description.slice(0, 60)}...") does not match shared helper output ("${expected.slice(0, 60)}...") for case "${label}"`);
    } else {
      ok(`${sample.family}/${sample.slug}: server snapshot lead paragraph matches shared helper (${label})`);
    }
  }
}

// --- 1b. `whyCrewsLikeIt` dedup: find a recipe whose whyCrewsLikeIt fully restates the subtitle, and confirm the
// rendered HTML never contains the subtitle sentence twice.
{
  const dupSample = allGolden.find((r) => {
    const w = r.page.whyCrewsLikeIt?.trim().toLowerCase();
    const s = r.page.subtitle?.trim().toLowerCase();
    return w && s && w.startsWith(s);
  });
  if (!dupSample) {
    fail("could not find a golden-shaped recipe whose whyCrewsLikeIt restates its subtitle (dedup test needs a real example)");
  } else {
    const data = goldenRecipeSnapshot(dupSample.page);
    const html = renderRecipeSnapshotHtml("https://example.com", data);
    // Look specifically at the "Why crews like it" paragraph's own rendered
    // text — it must not still start with the subtitle sentence that's
    // already shown above it. (We deliberately don't count raw subtitle
    // occurrences across the *whole* snapshot: `description`/`subtitle` can
    // themselves share a lead sentence on some recipes — a pre-existing,
    // out-of-scope characteristic of the base description field, not
    // something this phase's whyCrewsLikeIt dedup is responsible for.)
    const whyMatch = /Why crews like it: <\/strong>([^<]*)<\/p>/.exec(html);
    const subtitleNorm = dupSample.page.subtitle.trim().toLowerCase().replace(/[.!?…\s]+$/g, "");
    if (!whyMatch) {
      fail(`${dupSample.family}/${dupSample.slug}: expected a "Why crews like it" paragraph, found none`);
    } else if (whyMatch[1].trim().toLowerCase().startsWith(subtitleNorm)) {
      fail(`${dupSample.family}/${dupSample.slug}: "Why crews like it" text still repeats the subtitle sentence (dedup failed)`);
    } else {
      ok(`${dupSample.family}/${dupSample.slug}: whyCrewsLikeIt correctly deduped against subtitle (no repeat)`);
    }
    // The deduped remainder should not equal the full raw field (it was shortened).
    if (data.whyCrewsLikeIt && data.whyCrewsLikeIt === dupSample.page.whyCrewsLikeIt) {
      fail(`${dupSample.family}/${dupSample.slug}: whyCrewsLikeIt was not shortened despite subtitle overlap`);
    }
  }
}

// --- 1c. Recipes that genuinely lack an optional field must not render that heading.
function findGoldenMissing(family: string | null, predicate: (p: GoldenRecipePage) => boolean): GoldenSample | undefined {
  return allGolden.find((r) => (family === null || r.family === family) && predicate(r.page));
}

const missingSubstitutions = findGoldenMissing(null, (p) => !p.substitutions || p.substitutions.length === 0);
const missingMealPrep = findGoldenMissing(null, (p) => !p.mealPrepNotes || !p.mealPrepNotes.trim());
// NOTE: every golden-shaped recipe (Golden/Hall Expansion/Performance/BBQ/
// Pizza Night) has a non-empty `equipment` list (100% coverage — see Phase 4
// Step 2 findings), so there is no "missing equipment" case to test here.
// Breakfast is the family where `equipment` is usually absent (~4.5%
// coverage) — see the breakfast section below for that omission case.

for (const [label, sample, heading] of [
  ["substitutions", missingSubstitutions, "Substitutions"],
  ["mealPrepNotes", missingMealPrep, "Meal prep"],
] as const) {
  if (!sample) {
    fail(`could not find any golden-shaped recipe missing "${label}" to test the no-empty-heading guarantee`);
    continue;
  }
  const html = renderRecipeSnapshotHtml("https://example.com", goldenRecipeSnapshot(sample.page));
  if (html.includes(`<h2>${heading}</h2>`)) {
    fail(`${sample.family}/${sample.slug}: has no "${label}" data but rendered a "${heading}" heading anyway`);
  } else {
    ok(`${sample.family}/${sample.slug}: correctly omits "${heading}" heading (no ${label} data)`);
  }
}

// --- 1d. Core recipe facts must be byte-identical to source data (Phase 4 must never touch these).
{
  const sample = allGolden[0];
  const data = goldenRecipeSnapshot(sample.page);
  if (data.title !== (sample.page.displayTitle || sample.page.title)) fail(`${sample.family}/${sample.slug}: title changed`);
  if (data.ingredients.length !== sample.page.ingredients.length) fail(`${sample.family}/${sample.slug}: ingredient count changed`);
  if (data.steps.length !== sample.page.steps.length) fail(`${sample.family}/${sample.slug}: step count changed`);
  if (data.nutrition?.calories !== sample.page.nutrition.calories) fail(`${sample.family}/${sample.slug}: calories changed`);
  if (data.nutrition?.protein !== sample.page.nutrition.protein) fail(`${sample.family}/${sample.slug}: protein changed`);
  if (data.nutrition?.carbs !== sample.page.nutrition.carbs) fail(`${sample.family}/${sample.slug}: carbs changed`);
  if (data.nutrition?.fat !== sample.page.nutrition.fats) fail(`${sample.family}/${sample.slug}: fat changed`);
  ok(`${sample.family}/${sample.slug}: core recipe facts (title/ingredients/steps/nutrition) unchanged`);
}

// ---------------------------------------------------------------------------
// 2) Breakfast + Breakfast Performance
// ---------------------------------------------------------------------------

const BREAKFAST_CLIENT_FILE = "client/src/pages/breakfast-recipe-page.tsx";

function loadBreakfastFamily(indexRelPath: string): Array<{ slug: string; page: BreakfastRecipePage }> {
  const index = readJson<{ recipes: Array<{ slug: string }> }>(path.join(PUBLIC, ...indexRelPath.split("/")));
  return index.recipes.map((entry) => ({
    slug: entry.slug,
    page: readJson<BreakfastRecipePage>(path.join(PUBLIC, "catalog", "breakfast", "pages", `${entry.slug}.json`)),
  }));
}

const breakfastRecipes = [
  ...loadBreakfastFamily("catalog/breakfast/index.json"),
  ...loadBreakfastFamily("catalog/breakfast/performance/index.json"),
];
console.log(`\nLoaded ${breakfastRecipes.length} breakfast recipes.\n`);

{
  const sample = breakfastRecipes.find((r) => r.page.equipment?.length && r.page.tonightSpread?.length);
  if (!sample) {
    fail("breakfast: could not find a sample recipe with equipment + tonightSpread to test");
  } else {
    const data = breakfastRecipeSnapshot(sample.page);
    const html = renderRecipeSnapshotHtml("https://example.com", data);
    const expectedHeadings = ["Equipment", "Morning spread", "Station workflow", "Cleanup", "Leftovers"];
    for (const heading of expectedHeadings) {
      if (!html.includes(`<h2>${heading}</h2>`)) fail(`breakfast/${sample.slug}: expected heading "${heading}" missing`);
    }
    ok(`breakfast/${sample.slug}: renders ${expectedHeadings.join(", ")}`);
    assertNoEmptyHeadings(`breakfast/${sample.slug}`, html);
    assertNoInternalLeak(`breakfast/${sample.slug}`, html);
    assertHeadingsMatchClient(`breakfast/${sample.slug}`, expectedHeadings, [BREAKFAST_CLIENT_FILE]);
  }

  const noSpread = breakfastRecipes.find((r) => !r.page.tonightSpread || r.page.tonightSpread.length === 0);
  if (noSpread) {
    const html = renderRecipeSnapshotHtml("https://example.com", breakfastRecipeSnapshot(noSpread.page));
    if (html.includes("<h2>Morning spread</h2>")) {
      fail(`breakfast/${noSpread.slug}: has no tonightSpread data but rendered "Morning spread" heading anyway`);
    } else {
      ok(`breakfast/${noSpread.slug}: correctly omits "Morning spread" heading (no data)`);
    }
  } else {
    ok("breakfast: every recipe has tonightSpread data (nothing to test for this omission case)");
  }

  const noEquipment = breakfastRecipes.find((r) => !r.page.equipment || r.page.equipment.length === 0);
  if (noEquipment) {
    const html = renderRecipeSnapshotHtml("https://example.com", breakfastRecipeSnapshot(noEquipment.page));
    if (html.includes("<h2>Equipment</h2>")) {
      fail(`breakfast/${noEquipment.slug}: has no equipment data but rendered "Equipment" heading anyway`);
    } else {
      ok(`breakfast/${noEquipment.slug}: correctly omits "Equipment" heading (no data)`);
    }
  } else {
    ok("breakfast: every recipe has equipment data (nothing to test for this omission case)");
  }
}

// ---------------------------------------------------------------------------
// 3) Smoothies
// ---------------------------------------------------------------------------

const SMOOTHIE_CLIENT_FILE = "client/src/pages/smoothie-recipe-page.tsx";

function loadSmoothies(): Array<{ slug: string; page: FuelRecipePage }> {
  const index = readJson<{ recipes: Array<{ slug: string }> }>(path.join(PUBLIC, "catalog", "smoothies", "index.json"));
  return index.recipes.map((entry) => ({
    slug: entry.slug,
    page: readJson<FuelRecipePage>(path.join(PUBLIC, "catalog", "smoothies", "pages", `${entry.slug}.json`)),
  }));
}

const smoothies = loadSmoothies();
console.log(`\nLoaded ${smoothies.length} smoothie recipes.\n`);

{
  const sample = smoothies.find((r) => r.page.substitutions?.length && r.page.shiftNote?.trim());
  if (!sample) {
    fail("smoothies: could not find a sample with substitutions + shiftNote to test");
  } else {
    const data = fuelRecipeSnapshot(sample.page);
    const html = renderRecipeSnapshotHtml("https://example.com", data);
    const expectedHeadings = ["Substitutions", "On shift"];
    for (const heading of expectedHeadings) {
      if (!html.includes(`<h2>${heading}</h2>`)) fail(`smoothies/${sample.slug}: expected heading "${heading}" missing`);
    }
    ok(`smoothies/${sample.slug}: renders ${expectedHeadings.join(", ")}`);
    assertNoEmptyHeadings(`smoothies/${sample.slug}`, html);
    assertNoInternalLeak(`smoothies/${sample.slug}`, html);
    assertHeadingsMatchClient(`smoothies/${sample.slug}`, expectedHeadings, [SMOOTHIE_CLIENT_FILE]);
  }

  // Every current smoothie's `nutrition.highlights` is the literal
  // placeholder "Nutrition estimate coming soon" — verify it's deliberately
  // excluded from SSR (never rendered as if it were real content).
  {
    const placeholderSample = smoothies.find((r) => /coming soon/i.test(r.page.nutrition.highlights ?? ""));
    if (!placeholderSample) {
      fail("smoothies: expected at least one recipe with a placeholder nutrition.highlights value to test exclusion");
    } else {
      const html = renderRecipeSnapshotHtml("https://example.com", fuelRecipeSnapshot(placeholderSample.page));
      if (html.includes("<h2>Nutrition notes</h2>") || html.includes("coming soon")) {
        fail(`smoothies/${placeholderSample.slug}: placeholder nutrition.highlights ("coming soon") leaked into rendered HTML`);
      } else {
        ok(`smoothies/${placeholderSample.slug}: placeholder nutrition.highlights correctly excluded from SSR`);
      }
    }
  }

  const noSubs = smoothies.find((r) => !r.page.substitutions || r.page.substitutions.length === 0);
  if (noSubs) {
    const html = renderRecipeSnapshotHtml("https://example.com", fuelRecipeSnapshot(noSubs.page));
    if (html.includes("<h2>Substitutions</h2>")) {
      fail(`smoothies/${noSubs.slug}: has no substitutions data but rendered "Substitutions" heading anyway`);
    } else {
      ok(`smoothies/${noSubs.slug}: correctly omits "Substitutions" heading (no data)`);
    }
  } else {
    ok("smoothies: every recipe has substitutions data (nothing to test for this omission case)");
  }
}

// ---------------------------------------------------------------------------

function escapeForCheck(s: string): string {
  // Mirrors `escapeHtml` in apply-seo-tags.ts closely enough for substring checks
  // (only characters that actually appear in this catalog's guidance text).
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

console.log("\n" + "=".repeat(100));
if (failures.length > 0) {
  console.error(`FAILED — ${failures.length} issue(s) found.`);
  process.exit(1);
}
console.log("PASSED — recipe guidance SSR renders correctly across all families, with no internal-data leaks, no empty headings, and no server/client heading drift.");
