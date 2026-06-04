# Stage tier-one expansion production files only (Batch A, B, handheld + wiring).
$slugs = @(
  'shakshuka-for-the-hall','menemen-for-the-crew','baked-oatmeal-mixed-berries',
  'sheet-pan-parmesan-dijon-chicken-thigh-dinner','four-step-chicken-piccata',
  'tomato-soup-grilled-cheese-croutons','spaghetti-aglio-e-olio-for-the-hall',
  'spicy-tomato-bisque-grilled-brie-toast',
  'classic-patty-melt-for-the-crew','best-tuna-melt-for-the-hall','hall-blt-sandwich-feed',
  '30-minute-pasta-e-fagioli-for-the-hall','red-beans-and-rice-for-the-hall',
  'french-onion-soup-for-the-hall','chicken-tortilla-soup-for-the-hall','pasta-e-ceci-for-the-hall',
  'chicken-caesar-wraps','buffalo-chicken-wraps','greek-chicken-pitas','beef-gyros-for-the-hall',
  'chicken-shawarma-pitas','sausage-peppers-on-buns','chicken-dumpling-soup'
)

$paths = @(
  'shared/breakfast-expansion/batch-a-breakfast-pages.ts',
  'shared/golden-100/recipe-quality/batch-a-packs.ts',
  'shared/golden-100/recipe-quality/batch-b-packs.ts',
  'shared/golden-100/recipe-quality/batch-handheld-dumplings-pack.ts',
  'shared/hall-expansion/adapted/batch-b-sandwiches.ts',
  'shared/hall-expansion/adapted/batch-handheld-wraps.ts',
  'shared/hall-expansion/adapted/all-expansion-recipes.ts',
  'shared/hall-expansion/types.ts',
  'shared/golden-100/recipes-data.ts',
  'shared/golden-100/recipe-quality/meal-specific-packs.ts',
  'shared/golden-100/recipe-quality/recipe-instruction-class.ts',
  'shared/golden-100/entry.ts',
  'shared/golden-100/validate.ts',
  'shared/food-imagery/title-locked-prompts.ts',
  'shared/curated-image-governance/meal-image-completeness.ts',
  'shared/recipe-sourcing-policy.ts',
  'shared/recipe/crew-scaling-config.ts',
  'shared/canonical-recipe.ts',
  'shared/chef-quality-prompt.ts',
  'shared/ingestion/trusted-publishers.ts',
  'docs/recipe-sourcing.md',
  'scripts/catalog-generate-pages.ts',
  'scripts/generate-breakfast-catalog.ts',
  'scripts/audit-curated-image-governance.ts',
  'scripts/test-golden-100-manifest.ts',
  'scripts/patch-breakfast-batch-a-index.ts',
  'scripts/rebuild-hall-expansion-index.ts',
  'scripts/generate-batch-handheld-imagery.ts',
  'scripts/patch-handheld-page-images.ts',
  'client/public/catalog/breakfast/index.json',
  'client/public/catalog/golden-100/index.json',
  'client/public/catalog/hall-expansion/index.json'
)

foreach ($slug in $slugs) {
  $paths += "client/public/catalog/breakfast/pages/$slug.json"
  $paths += "client/public/catalog/golden-100/pages/$slug.json"
  $paths += "client/public/catalog/hall-expansion/pages/$slug.json"
  $paths += "client/public/images/breakfast/$slug.jpg"
  $paths += "client/public/images/thumbs/breakfast/$slug.jpg"
  $paths += "client/public/images/golden-100/$slug.jpg"
  $paths += "client/public/images/thumbs/$slug.jpg"
  $paths += "client/public/images/hall-expansion/$slug.jpg"
  $paths += "client/public/images/thumbs/hall-expansion/$slug.jpg"
  $paths += "client/public/images/mobile/$slug.jpg"
  $paths += "client/public/images/mobile/breakfast/$slug.jpg"
  $paths += "client/public/images/mobile/hall-expansion/$slug.jpg"
  $paths += "client/public/images/rails/$slug.jpg"
  $paths += "client/public/images/rails/breakfast/$slug.jpg"
  $paths += "client/public/images/rails/hall-expansion/$slug.jpg"
}

$unique = $paths | Select-Object -Unique
foreach ($p in $unique) {
  if (Test-Path $p) { git add -- "$p" }
}
