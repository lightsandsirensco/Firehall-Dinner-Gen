/**
 * One-off sprint script: replaces commercial-kitchen equipment terminology
 * (hotel pans, cambros, steam tables, bain-maries, half-pans) with
 * consumer-friendly language across every recipe source file.
 *
 * Run with: npx tsx scripts/fix-commercial-kitchen-jargon.ts
 * Run with --dry to preview counts without writing.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DRY = process.argv.includes("--dry");

const FILES = [
  "shared/golden-100/recipe-quality/classics-wheel-editorial.ts",
  "shared/golden-100/recipe-quality/classics-wheel-fixes.ts",
  "shared/golden-100/recipe-quality/meal-specific-packs.ts",
  "shared/golden-100/recipe-quality/golden-p0-classic-packs.ts",
  "shared/golden-100/recipe-quality/pizza-night-packs.ts",
  "shared/golden-100/recipe-quality/batch-b-packs.ts",
  "shared/golden-100/recipe-quality/blueprints-legacy-slugs.ts",
  "shared/golden-100/recipe-quality/instruction-engine.ts",
  "shared/curated-hall-packages.ts",
  "shared/classic-hall-meals.ts",
  "shared/bbq-30/recipes.ts",
  "shared/bbq-expansion/batch-25-bbq-recipes.ts",
  "shared/bbq-expansion/batch-30-bbq-grill-recipes.ts",
  "shared/hall-expansion/adapted/batch-b-sandwiches.ts",
  "shared/hall-expansion/adapted/batch-handheld-wraps.ts",
  "shared/hall-expansion/adapted/batch-phase5-distinct.ts",
  "shared/hall-expansion/adapted/all-expansion-recipes.ts",
  "shared/hall-expansion/adapted/batch-bowl-classics.ts",
  "shared/hall-expansion/adapted/batch-wave1-expansion.ts",
  "shared/hall-expansion/adapted/batch-250.ts",
  "shared/breakfast-expansion/batch-25-breakfast-pages.ts",
  "shared/breakfast-expansion/batch-wave1-breakfast-pages.ts",
  "shared/breakfast-expansion/batch-a-breakfast-pages.ts",
  "shared/breakfast-expansion/new-breakfast-pages.ts",
  "shared/performance-meals/adapted/batch-01.ts",
  "shared/performance-meals/adapted/batch-02.ts",
  "shared/performance-meals/adapted/batch-03.ts",
  "shared/performance-meals/adapted/batch-04.ts",
  "shared/performance-meals/adapted/batch-05.ts",
  "shared/performance-meals/adapted/batch-06.ts",
  "shared/seo/landing-pages-data.ts",
  "server/golden-100/editorial-templates.ts",
  "scripts/generate-breakfast-catalog.ts",
];

// Ordered longest-match-first. Applied in sequence per file.
const RULES: Array<[RegExp, string]> = [
  // --- Whole-sentence templates (most specific first) ---
  [
    /Cool \$\{proteinLabel\} and hot components in shallow hotel pans within two hours — deep pots stay in the danger zone too long\./g,
    "Cool ${proteinLabel} and hot components in a shallow baking dish within two hours — food left out too long isn't safe to eat.",
  ],
  [
    /does not hold well on a steam table/gi,
    "doesn't hold up well if it sits around waiting to be served",
  ],
  [
    /next to the steam table or it collapses/gi,
    "next to the warm oven or it collapses",
  ],
  [
    /Butter two full-size hotel pans or one deep half-pan for eight firefighters\./g,
    "Butter two large baking dishes (or one deep 9x13 dish) for eight firefighters.",
  ],
  [
    /Grease a deep hotel pan or two 9x13 dishes/gi,
    "Grease a deep 9x13 baking dish or two smaller baking dishes",
  ],
  [
    /Grease a deep 9x13 pan or hotel half-pan/gi,
    "Grease a deep 9x13 baking dish",
  ],
  [
    /Grease a deep 9x13 pan or small hotel pan/gi,
    "Grease a deep 9x13 baking dish",
  ],
  [
    /Grease a deep 9x13 pan or two smaller hotel pans/gi,
    "Grease a deep 9x13 baking dish, or two smaller baking dishes",
  ],
  [
    /Grease a deep 9x13 pan or shallow hotel pan/gi,
    "Grease a deep 9x13 baking dish",
  ],
  [
    /"Layer in hotel pans"/g,
    '"Assemble the layers"',
  ],
  [
    /Hold gravy in a bain-marie at 180°F—too cool and curds never melt right\./g,
    "Hold gravy in a pot set over low heat at 180°F—too cool and curds never melt right.",
  ],
  [
    /Hold grits in a bain-marie on low with a splash of milk stirred in every 10 minutes\./g,
    "Hold grits in a pot on low heat with a splash of milk stirred in every 10 minutes.",
  ],
  [
    /Soak the hotel pan immediately with hot water—baked salsa and cheese glue sets fast\./g,
    "Soak the baking dish immediately with hot water—baked salsa and cheese glue sets fast.",
  ],
  [
    /Set a warm holding zone \(oven 200°F or covered hotel pan\)/gi,
    "Set a warm holding zone (oven at 200°F, food covered)",
  ],
  [
    /a real firehouse kitchen\./g,
    "a real firehouse kitchen.",
  ],
  [
    /use hotel pans or sheet pans that fit a real firehouse kitchen/gi,
    "use large baking dishes or sheet pans that fit a real firehouse kitchen",
  ],
  // --- Generic noun-phrase swaps (grammar-safe, run after the specific ones above) ---
  [/full-size hotel pans/gi, "large baking dishes"],
  [/hotel pans or large baking dishes/gi, "large baking dishes"],
  [/deep half-pan/gi, "deep 9x13 dish"],
  [/hotel half-pan/gi, "half-size baking dish"],
  [/half-pan/gi, "half-size baking dish"],
  [/in a hotel pan/gi, "in a baking dish"],
  [/into a hotel pan/gi, "into a baking dish"],
  [/to a hotel pan/gi, "to a baking dish"],
  [/to hotel pan,/gi, "to a baking dish,"],
  [/into hotel pan,/gi, "into a baking dish,"],
  [/hotel pans/gi, "baking dishes"],
  [/hotel pan/gi, "baking dish"],
  [/in a cambro/gi, "in a lidded container"],
  [/in cambros/gi, "in lidded containers"],
  [/in labeled cambros/gi, "in labeled lidded containers"],
  [/to a cambro/gi, "to a lidded container"],
  [/to cambro/gi, "to a lidded container"],
  [/into the cambro/gi, "into the lidded container"],
  [/a deep cambro/gi, "a large lidded container"],
  [/one cambro/gi, "one large lidded container"],
  [/cambros? at 200°F/gi, "lidded containers at 200°F"],
  [/foil-lined cambros/gi, "foil-lined containers"],
  [/cambro of/gi, "container of"],
  [/cambro/gi, "lidded container"],
];

let totalChanges = 0;
const report: Array<{ file: string; changes: number }> = [];

for (const rel of FILES) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.warn(`[skip] missing file: ${rel}`);
    continue;
  }
  const original = fs.readFileSync(full, "utf8");
  let updated = original;
  let fileChanges = 0;
  for (const [pattern, replacement] of RULES) {
    const matches = updated.match(pattern);
    if (matches) {
      fileChanges += matches.length;
      updated = updated.replace(pattern, replacement);
    }
  }
  if (fileChanges > 0) {
    totalChanges += fileChanges;
    report.push({ file: rel, changes: fileChanges });
    if (!DRY) {
      fs.writeFileSync(full, updated, "utf8");
    }
  }
}

report.sort((a, b) => b.changes - a.changes);
console.log(`${DRY ? "[DRY RUN] " : ""}Applied ${totalChanges} replacements across ${report.length} files:`);
for (const { file, changes } of report) {
  console.log(`  ${changes.toString().padStart(3)}  ${file}`);
}
