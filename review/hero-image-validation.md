# Hero image validation

Generated: 2026-07-31T14:33:07.777Z

## Root cause

Hero files were saved at **correct slug-locked paths** but with **wrong image bytes** copied from bootstrap donors (`scripts/bootstrap-batch-b-images.ts`, `scripts/bootstrap-catalog-250-images.ts`). Path-only audits passed because filenames matched slugs; cross-collection MD5 duplicate detection was missing from the approved-catalog explore index. Explore grid thumbs also used a flat `/images/thumbs/{slug}.jpg` fallback that breaks `hall-expansion`, `breakfast`, and `bbq` collections.

## Summary

- Published recipes audited: **373**
- Approved catalog recipes: **392** (explore-eligible after mapping: **347**)
- Pass: **364**
- Fail: **9**
- Missing hero file: **0**
- Metadata / duplicate conflicts: **9**
- Cross-recipe duplicate conflicts: **0**
- Vision mode: **random sample (98/373)**
- Vision failures: **0** (skipped: 373)

## Recipes fixed

- `best-tuna-melt-for-the-hall` — quarantined wrong bootstrap donor hero (pasta bytes on melt title)
- `classic-patty-melt-for-the-crew` — quarantined duplicate of `smash-burgers`
- `hall-blt-sandwich-feed` — quarantined duplicate of `turkey-burgers`
- `30-minute-pasta-e-fagioli-for-the-hall` — quarantined duplicate of `chili-mac`
- `french-onion-soup-for-the-hall` — quarantined duplicate bootstrap copy
- `spaghetti-aglio-e-olio-for-the-hall` — quarantined duplicate of `five-ingredient-pasta`

## Critical failures

| Slug | Title | Hero | Reasons |
| --- | --- | --- | --- |
| `beef-birria-with-consomme` | Beef Birria with Consommé for Dipping | `/images/golden-100/beef-birria-with-consomme.jpg` | Title component not represented in hero path/slug: "consomm for dipping"; Complete meal required — hero metadata shows too few title components (1/3) |
| `trinidadian-curry-chicken-potatoes` | Trinidadian-Style Curry Chicken with Potatoes | `/images/golden-100/trinidadian-curry-chicken-potatoes.jpg` | plating accuracy: curry_fail: rice not clearly visible |
| `best-tuna-melt-for-the-hall` | Best Tuna Melt for the Hall (Diner Style) | `/images/hall-expansion/best-tuna-melt-for-the-hall.jpg` | Complete meal required — hero metadata shows too few title components (1/2) |
| `bagel-lox-breakfast-board` | Bagel and Lox Breakfast Board | `/images/breakfast/bagel-lox-breakfast-board.jpg` | Complete meal title needs wide family-style hero metadata (platter, crew, beside, bowl of) |
| `baked-oatmeal-mixed-berries` | Baked Oatmeal with Mixed Berries | `/images/breakfast/baked-oatmeal-mixed-berries.jpg` | Complete meal title needs wide family-style hero metadata (platter, crew, beside, bowl of) |
| `country-fried-steak-eggs` | Country Fried Steak and Eggs Breakfast | `/images/breakfast/country-fried-steak-eggs.jpg` | Complete meal title needs wide family-style hero metadata (platter, crew, beside, bowl of) |
| `johnnycakes-with-syrup` | Johnnycakes with Maple Syrup | `/images/breakfast/johnnycakes-with-syrup.jpg` | Complete meal title needs wide family-style hero metadata (platter, crew, beside, bowl of) |
| `lumberjack-breakfast-platter` | Lumberjack Breakfast Platter | `/images/breakfast/lumberjack-breakfast-platter.jpg` | plating accuracy: breakfast_fail: eggs on pancakes |
| `scrapple-and-eggs-skillet` | Scrapple and Eggs Skillet | `/images/breakfast/scrapple-and-eggs-skillet.jpg` | Complete meal title needs wide family-style hero metadata (platter, crew, beside, bowl of) |

## Remaining warnings

_None._

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

