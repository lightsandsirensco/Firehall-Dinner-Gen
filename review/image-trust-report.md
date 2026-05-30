# Image Trust Report

Generated: 2026-05-30T20:05:09.837Z

**Success metric:** A firefighter can identify the meal from the hero without opening the recipe — not 49/49 unique hashes.

## Summary

| Metric | Count |
| --- | ---: |
| User-facing recipes scanned | 508 |
| **P0 — Incorrect meal representations** | **0** |
| P1 — Within-category duplicate groups | 55 (165 recipe slots) |
| P1 — High-risk duplicate groups | 12 |
| P2 — Cross-category duplicate groups (accurate) | 139 |
| P2 — Cross-category duplicate groups (suspect) | 0 |
| **Estimated trust impact** | **ELEVATED** |

### P0 by collection


## P0 — Incorrect meal images remaining

_None flagged by path/format rules and donor semantic checks._

## P1 — User-facing within-category duplicates

Same hero visible twice+ in **Breakfast**, **Pizza Night**, or **Explore** — trust risk rises when titles diverge.

| Collection | Recipes | Risk | Example slugs |
| --- | ---: | --- | --- |
| explore_curated | 9 | high | `philly-cheesesteak-sliders`, `bbq-meatball-skewers`, `build-your-own-pho-bar`, `mesquite-chuck-roast` |
| explore_curated | 8 | high | `breakfast-crunchwraps`, `breakfast-nachos-supreme`, `breakfast-poutine`, `breakfast-sliders` |
| explore_curated | 6 | high | `smoked-mac-and-cheese`, `pretzel-bite-platter`, `pasta-bar-night`, `apple-cinnamon-baked-oatmeal` |
| explore_curated | 6 | high | `smoked-queso-fundido`, `loaded-potato-skins`, `game-day-pizza-sliders`, `jalapeno-popper-dip` |
| explore_curated | 5 | high | `smoked-sausage-platter`, `molasses-bourbon-pork-ribs`, `applewood-pork-shoulder-steaks`, `carolina-mustard-pork` |
| explore_curated | 5 | high | `pork-belly-burnt-ends`, `smoked-tri-tip`, `bbq-brisket-burnt-ends`, `smoked-corned-beef` |
| explore_curated | 5 | high | `rice-bowl-bar-night`, `mediterranean-feast-night`, `warm-spinach-chicken-salad`, `mediterranean-chicken-farro-bowls` |
| explore_curated | 4 | high | `smoked-turkey-breast`, `hickory-turkey-legs`, `hall-breakfast-wraps`, `turkey-burgers` |
| explore_curated | 4 | high | `bbq-breakfast-hash`, `sausage-egg-bake`, `bacon-egg-hash-skillet`, `steakhouse-hash-skillet` |
| explore_curated | 4 | high | `ginger-soy-chicken-rice-bowls`, `honey-garlic-chicken-rice-bowls`, `denver-breakfast-casserole`, `ham-cheddar-egg-bake` |
| explore_curated | 4 | high | `pellet-smoked-chicken-quarters`, `spatchcock-lemon-roast-chicken`, `paprika-roasted-chicken-quarters`, `greek-lemon-chicken-potatoes` |
| explore_curated | 4 | high | `firehall-charcuterie-board`, `sandwich-board-night`, `breakfast-enchiladas`, `breakfast-quesadillas` |
| explore_curated | 3 | medium | `cheesy-beef-nacho-bake`, `loaded-nacho-bar-night`, `enchilada-beef-skillet` |
| explore_curated | 3 | medium | `cast-iron-breakfast-skillet`, `bbq-chicken-sliders`, `ham-pepper-skillet` |
| explore_curated | 3 | medium | `smoked-meatloaf`, `dutch-oven-pot-roast`, `meatloaf-mashed` |
| explore_curated | 3 | medium | `cowboy-breakfast-skillet`, `red-lead-skillet`, `beef-stroganoff` |
| explore_curated | 3 | medium | `chorizo-breakfast-burritos`, `turkey-sausage-burritos`, `beef-barley-soup` |
| explore_curated | 3 | medium | `southwest-egg-bake`, `chicken-tikka-masala`, `turkey-sausage-egg-bake` |
| explore_curated | 3 | medium | `chili-garlic-bread`, `chili-mac`, `big-chili` |
| breakfast | 3 | medium | `bacon-egg-hash-skillet`, `bbq-breakfast-hash`, `steakhouse-hash-skillet` |
| breakfast | 3 | medium | `buttermilk-pancakes`, `maple-sausage-pinwheels`, `protein-pancake-tray` |
| explore_curated | 3 | medium | `buttermilk-pancakes`, `maple-sausage-pinwheels`, `protein-pancake-tray` |
| explore_curated | 3 | medium | `green-chile-chicken-stew`, `cheesy-chicken-broccoli-rice`, `one-pot-chicken-rice` |
| explore_curated | 3 | medium | `honey-mustard-oven-chicken-thighs`, `lemon-garlic-chicken-tray`, `honey-lime-chicken-tray` |
| explore_curated | 3 | medium | `fajita-bar-night`, `sheet-pan-chicken-fajitas-lite`, `cast-iron-chicken-fajitas` |

## P2 — Cross-category duplicates

- **Accurate (OK temporarily):** 139 groups, ~456 recipe slots — same dish in Golden 100 / Hall / Explore.
- **Suspect:** 0 groups overlap with P0 donor mismatches.

## Estimated trust impact

Several categories have misleading heroes or high-risk duplicate clusters. Browse experience feels generic or wrong before click-through.

## Recommended fix order

1. **P0 only** — regen or slug-lock donors until title and hero align.
2. **P1 high-risk** — split heroes where different meals share one image in the same category.
3. **P2 accurate** — leave until AI regen; cross-listing the same correct dish is acceptable.
4. **Do not** regen accurate images merely to reduce duplicate counts.