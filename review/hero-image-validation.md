# Hero image validation

Generated: 2026-07-27T18:18:00.755Z

## Root cause

Hero files were saved at **correct slug-locked paths** but with **wrong image bytes** copied from bootstrap donors (`scripts/bootstrap-batch-b-images.ts`, `scripts/bootstrap-catalog-250-images.ts`). Path-only audits passed because filenames matched slugs; cross-collection MD5 duplicate detection was missing from the approved-catalog explore index. Explore grid thumbs also used a flat `/images/thumbs/{slug}.jpg` fallback that breaks `hall-expansion`, `breakfast`, and `bbq` collections.

## Summary

- Published recipes audited: **352**
- Approved catalog recipes: **371** (explore-eligible after mapping: **310**)
- Pass: **345**
- Fail: **7**
- Missing hero file: **0**
- Metadata / duplicate conflicts: **11**
- Cross-recipe duplicate conflicts: **2**
- Vision mode: **random sample (100/352)**
- Vision failures: **0** (skipped: 352)

## Recipes fixed

- `best-tuna-melt-for-the-hall` — quarantined wrong bootstrap donor hero (pasta bytes on melt title)
- `classic-patty-melt-for-the-crew` — quarantined duplicate of `smash-burgers`
- `hall-blt-sandwich-feed` — quarantined duplicate of `turkey-burgers`
- `30-minute-pasta-e-fagioli-for-the-hall` — quarantined duplicate of `chili-mac`
- `french-onion-soup-for-the-hall` — quarantined duplicate bootstrap copy
- `spaghetti-aglio-e-olio-for-the-hall` — quarantined duplicate of `five-ingredient-pasta`

## Excluded from surfaces (duplicate heroes pending regen)

_These 17 recipes are blocked from Explore/detail heroes until unique imagery is generated._

- `chicken-alfredo-bake`
- `big-chili`
- `pancake-short-stack`
- `bulgogi-bowls`
- `teriyaki-donburi`
- `teriyaki-chicken-rice-bowls`
- `firehall-korean-beef-bowls`
- `egg-roll-in-a-bowl-crew`
- `korean-turkey-rice-bowls`
- `white-chicken-chili-crock`
- `thai-peanut-chicken-crock`
- `burnt-ends-chili-crew`
- `pasta-e-fagioli-hall`
- `huevos-rancheros-crew`
- `menemen-for-the-crew`
- `migas-for-the-crew`
- `shakshuka-for-the-hall`

## Critical failures

| Slug | Title | Hero | Reasons |
| --- | --- | --- | --- |
| `best-tuna-melt-for-the-hall` | Best Tuna Melt for the Hall (Diner Style) | `/images/hall-expansion/best-tuna-melt-for-the-hall.jpg` | Complete meal required — hero metadata shows too few title components (1/2) |
| `bagel-lox-breakfast-board` | Bagel and Lox Breakfast Board | `/images/breakfast/bagel-lox-breakfast-board.jpg` | Complete meal title needs wide family-style hero metadata (platter, crew, beside, bowl of) |
| `baked-oatmeal-mixed-berries` | Baked Oatmeal with Mixed Berries | `/images/breakfast/baked-oatmeal-mixed-berries.jpg` | Complete meal title needs wide family-style hero metadata (platter, crew, beside, bowl of) |
| `country-fried-steak-eggs` | Country Fried Steak and Eggs Breakfast | `/images/breakfast/country-fried-steak-eggs.jpg` | Complete meal title needs wide family-style hero metadata (platter, crew, beside, bowl of) |
| `johnnycakes-with-syrup` | Johnnycakes with Maple Syrup | `/images/breakfast/johnnycakes-with-syrup.jpg` | Complete meal title needs wide family-style hero metadata (platter, crew, beside, bowl of) |
| `lumberjack-breakfast-platter` | Lumberjack Breakfast Platter | `/images/breakfast/lumberjack-breakfast-platter.jpg` | plating accuracy: breakfast_fail: eggs on pancakes |
| `scrapple-and-eggs-skillet` | Scrapple and Eggs Skillet | `/images/breakfast/scrapple-and-eggs-skillet.jpg` | Complete meal title needs wide family-style hero metadata (platter, crew, beside, bowl of) |

## Remaining warnings

- `big-chili`: hero bytes shared with 3 other recipe(s): white-chicken-chili-crock, burnt-ends-chili-crew, pasta-e-fagioli-hall
- `bulgogi-bowls`: hero bytes shared with 3 other recipe(s): firehall-korean-beef-bowls, egg-roll-in-a-bowl-crew, korean-turkey-rice-bowls
- `teriyaki-donburi`: hero bytes shared with 2 other recipe(s): teriyaki-chicken-rice-bowls, thai-peanut-chicken-crock
- `teriyaki-chicken-rice-bowls`: hero bytes shared with 2 other recipe(s): teriyaki-donburi, thai-peanut-chicken-crock
- `firehall-korean-beef-bowls`: hero bytes shared with 3 other recipe(s): bulgogi-bowls, egg-roll-in-a-bowl-crew, korean-turkey-rice-bowls
- `egg-roll-in-a-bowl-crew`: hero bytes shared with 3 other recipe(s): bulgogi-bowls, firehall-korean-beef-bowls, korean-turkey-rice-bowls
- `korean-turkey-rice-bowls`: hero bytes shared with 3 other recipe(s): bulgogi-bowls, firehall-korean-beef-bowls, egg-roll-in-a-bowl-crew
- `white-chicken-chili-crock`: hero bytes shared with 3 other recipe(s): big-chili, burnt-ends-chili-crew, pasta-e-fagioli-hall
- `thai-peanut-chicken-crock`: hero bytes shared with 2 other recipe(s): teriyaki-donburi, teriyaki-chicken-rice-bowls
- `burnt-ends-chili-crew`: hero bytes shared with 3 other recipe(s): big-chili, white-chicken-chili-crock, pasta-e-fagioli-hall
- `pasta-e-fagioli-hall`: hero bytes shared with 3 other recipe(s): big-chili, white-chicken-chili-crock, burnt-ends-chili-crew
- `huevos-rancheros-crew`: hero bytes shared with 1 other recipe(s): shakshuka-for-the-hall
- `menemen-for-the-crew`: hero bytes shared with 1 other recipe(s): migas-for-the-crew
- `migas-for-the-crew`: hero bytes shared with 1 other recipe(s): menemen-for-the-crew
- `shakshuka-for-the-hall`: hero bytes shared with 1 other recipe(s): huevos-rancheros-crew

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

