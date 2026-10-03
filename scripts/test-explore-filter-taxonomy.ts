#!/usr/bin/env tsx
/**
 * Explore Category/Protein filter taxonomy — runs against the live approved
 * catalog (same `buildApprovedCatalog()` that serves /api/catalog/approved).
 *
 *   npx tsx scripts/test-explore-filter-taxonomy.ts
 */
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import {
  buildApprovedCatalogFacetOptions,
  filterApprovedCatalogEntries,
  DEFAULT_APPROVED_CATALOG_FILTERS,
} from "../client/src/lib/approved-catalog-filters.js";
import { MASTER_CATEGORIES_BY_ID } from "../shared/categories/definitions.js";
import {
  EXPLORE_CATEGORY_LABELS,
  EXPLORE_PROTEIN_SLUG_OVERRIDES,
  canonicalExploreProtein,
  exploreProteinFilterId,
  normalizeTaxonomyKey,
  toTaxonomyTitleCase,
} from "../shared/explore-taxonomy.js";
import { parseExploreBrowseSearch } from "../shared/browse-canonical.js";

let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`✓ PASS: ${name}`);
  } else {
    failed++;
    console.error(`✗ FAIL: ${name}${detail ? `\n    ${detail}` : ""}`);
  }
}

const POLISHED_LABEL = /^[A-Z0-9][^\s]*(?:\s(?:[A-Z0-9&(][^\s]*|and|or|of|the|with))*$/;

function main() {
  const all = buildApprovedCatalog().recipes;
  const facets = buildApprovedCatalogFacetOptions(all);
  console.log(`[test-explore-filter-taxonomy] ${all.length} entries`);
  console.log(`  Categories: ${facets.categories.map((c) => c.label).join(", ")}`);
  console.log(`  Proteins:   ${facets.proteins.map((p) => p.label).join(", ")}\n`);

  for (const [kind, options] of [
    ["Category", facets.categories],
    ["Protein", facets.proteins],
  ] as const) {
    const labelKeys = options.map((o) => normalizeTaxonomyKey(o.label));
    check(`${kind}: no duplicate labels (case/whitespace-insensitive)`, new Set(labelKeys).size === labelKeys.length);
    check(`${kind}: no duplicate ids`, new Set(options.map((o) => o.id)).size === options.length);
    const unpolished = options.filter((o) => !POLISHED_LABEL.test(o.label) || o.label !== o.label.trim());
    check(`${kind}: every label is polished Title Case`, unpolished.length === 0, unpolished.map((o) => o.label).join(", "));
    const sorted = [...options].sort((a, b) => a.label.localeCompare(b.label));
    check(`${kind}: options sorted alphabetically`, sorted.every((o, i) => o.id === options[i].id));

    let reached = 0;
    for (const option of options) {
      const key = kind === "Category" ? "category" : "protein";
      const result = filterApprovedCatalogEntries(all, { ...DEFAULT_APPROVED_CATALOG_FILTERS, [key]: option.id });
      const expected = all.filter((e) =>
        kind === "Category" ? e.categoryLabel === option.label : e.protein === option.label,
      );
      check(
        `${kind} "${option.label}" returns all ${expected.length} matching recipes`,
        result.length === expected.length && result.length > 0,
        `got ${result.length}`,
      );
      reached += result.length;
    }
    check(`${kind}: every recipe reachable through exactly one option`, reached === all.length, `${reached}/${all.length}`);
  }

  const forbidden = ["blend", "protein blend", "plant", "mixed", "steak", "sausage and beef"];
  const leaked = facets.proteins.filter((p) => forbidden.includes(normalizeTaxonomyKey(p.label)));
  check("No internal protein terminology in options", leaked.length === 0, leaked.map((p) => p.label).join(", "));

  const slugs = new Set(all.map((e) => e.slug));
  const staleOverrides = Object.keys(EXPLORE_PROTEIN_SLUG_OVERRIDES).filter((s) => !slugs.has(s));
  check("Every protein override targets a live catalog slug", staleOverrides.length === 0, staleOverrides.join(", "));

  for (const [id, label] of Object.entries(EXPLORE_CATEGORY_LABELS)) {
    const master = MASTER_CATEGORIES_BY_ID[id as keyof typeof MASTER_CATEGORIES_BY_ID];
    if (master) check(`Category label "${label}" matches master displayName`, master.displayName === label, master.displayName);
  }

  // Legacy/inconsistent stored values and old links resolve to the same filter.
  const legacyPairs: Array<[string, string]> = [
    ["bacon", "Bacon"],
    [" Sausage ", "sausage"],
    ["Protein blend", "Blend"],
    ["plant", "vegetarian"],
    ["Steak", "beef"],
    ["mixed", "sausage and beef"],
  ];
  for (const [a, b] of legacyPairs) {
    check(`"${a}" and "${b}" share one filter`, exploreProteinFilterId(a) === exploreProteinFilterId(b));
  }
  const legacyLink = parseExploreBrowseSearch("?protein=Bacon&category=Comfort%20Food");
  check("Legacy ?protein=Bacon link maps to the bacon option", legacyLink.protein === "bacon");
  check("Legacy ?category=Comfort Food link maps to comfort_food", legacyLink.category === "comfort_food");
  check(
    "Filtering with a legacy raw value still matches",
    filterApprovedCatalogEntries(all, { ...DEFAULT_APPROVED_CATALOG_FILTERS, protein: "  CHICKEN " }).length ===
      all.filter((e) => e.protein === "Chicken").length,
  );
  check('Title Case preserves BBQ ("bbq & grill" → "BBQ & Grill")', toTaxonomyTitleCase("bbq & grill") === "BBQ & Grill");
  check("Unknown protein falls back to Title Case", canonicalExploreProtein("duck breast") === "Duck Breast");

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll Explore filter taxonomy checks passed.");
}

main();
