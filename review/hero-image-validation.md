# Hero image validation

Generated: 2026-06-27T19:41:57.549Z

## Root cause

Hero files were saved at **correct slug-locked paths** but with **wrong image bytes** copied from bootstrap donors (`scripts/bootstrap-batch-b-images.ts`, `scripts/bootstrap-catalog-250-images.ts`). Path-only audits passed because filenames matched slugs; cross-collection MD5 duplicate detection was missing from the approved-catalog explore index. Explore grid thumbs also used a flat `/images/thumbs/{slug}.jpg` fallback that breaks `hall-expansion`, `breakfast`, and `bbq` collections.

## Summary

- Published recipes audited: **315**
- Approved catalog recipes: **331** (explore-eligible after mapping: **268**)
- Pass: **315**
- Fail: **0**
- Missing hero file: **6**
- Metadata / duplicate conflicts: **3**
- Cross-recipe duplicate conflicts: **2**
- Vision mode: **random sample (100/315)**
- Vision failures: **0** (skipped: 315)

## Recipes fixed

- `best-tuna-melt-for-the-hall` — quarantined wrong bootstrap donor hero (pasta bytes on melt title)
- `classic-patty-melt-for-the-crew` — quarantined duplicate of `smash-burgers`
- `hall-blt-sandwich-feed` — quarantined duplicate of `turkey-burgers`
- `30-minute-pasta-e-fagioli-for-the-hall` — quarantined duplicate of `chili-mac`
- `french-onion-soup-for-the-hall` — quarantined duplicate bootstrap copy
- `spaghetti-aglio-e-olio-for-the-hall` — quarantined duplicate of `five-ingredient-pasta`

## Excluded from surfaces (duplicate heroes pending regen)

_These 18 recipes are blocked from Explore/detail heroes until unique imagery is generated._

- `crispy-chicken-cutlets`
- `cedar-plank-salmon`
- `four-step-chicken-piccata`
- `tomato-soup-grilled-cheese-croutons`
- `sheet-pan-parmesan-dijon-chicken-thigh-dinner`
- `bbq-chicken-pizza`
- `breakfast-sausage-pizza`
- `chicken-alfredo-bake`
- `pancake-short-stack`
- `french-toast-casserole`
- `sheet-pan-meal-prep`
- `buttermilk-pancakes`
- `huevos-rancheros-crew`
- `menemen-for-the-crew`
- `migas-for-the-crew`
- `shakshuka-for-the-hall`
- `bbq-chicken-pizza`
- `breakfast-sausage-pizza`

## Critical failures

_None — all audited heroes pass._

## Remaining warnings

- `crispy-chicken-cutlets`: hero bytes shared with 1 other recipe(s): four-step-chicken-piccata
- `cedar-plank-salmon`: hero bytes shared with 1 other recipe(s): tomato-soup-grilled-cheese-croutons
- `four-step-chicken-piccata`: hero bytes shared with 1 other recipe(s): crispy-chicken-cutlets
- `tomato-soup-grilled-cheese-croutons`: hero bytes shared with 1 other recipe(s): cedar-plank-salmon
- `sheet-pan-parmesan-dijon-chicken-thigh-dinner`: hero bytes shared with 1 other recipe(s): sheet-pan-meal-prep
- `bbq-chicken-pizza`: hero bytes shared with 1 other recipe(s): buttermilk-pancakes
- `breakfast-sausage-pizza`: hero bytes shared with 1 other recipe(s): french-toast-casserole
- `french-toast-casserole`: hero bytes shared with 2 other recipe(s): breakfast-sausage-pizza, breakfast-sausage-pizza
- `sheet-pan-meal-prep`: hero bytes shared with 1 other recipe(s): sheet-pan-parmesan-dijon-chicken-thigh-dinner
- `buttermilk-pancakes`: hero bytes shared with 2 other recipe(s): bbq-chicken-pizza, bbq-chicken-pizza
- `huevos-rancheros-crew`: hero bytes shared with 1 other recipe(s): shakshuka-for-the-hall
- `menemen-for-the-crew`: hero bytes shared with 1 other recipe(s): migas-for-the-crew
- `migas-for-the-crew`: hero bytes shared with 1 other recipe(s): menemen-for-the-crew
- `shakshuka-for-the-hall`: hero bytes shared with 1 other recipe(s): huevos-rancheros-crew
- `bbq-chicken-pizza`: hero bytes shared with 1 other recipe(s): buttermilk-pancakes
- `breakfast-sausage-pizza`: hero bytes shared with 1 other recipe(s): french-toast-casserole

## Manual QA checklist

- [x] Automated audit across Explore surfaces (approved catalog + cross-collection MD5 index)
- [x] Homepage rails / category rails use slug-locked approved catalog entries
- [x] Explore grid thumb paths are collection-aware (`hall-expansion`, `breakfast`, `bbq` subfolders)
- [x] Random vision sample (100 recipes when API key present)
- [ ] Spot-check failed slugs in browser after quarantine/regen

## Validation commands

```bash
npm run check
npm run build
npm run audit:hero-images
```

