# Recipe Expansion Wave 1

**Date:** 2026-07-17  
**Status:** Shipped to catalog (pages generated + DB seeded)

## Goal

Ship the next production-quality recipe wave in priority order:

1. Bowls  
2. Slow Cooker  
3. Breakfast  
4. BBQ  
5. Budget  
6. One Pot  

Every recipe includes hold notes, crew scaling, beginner-friendly steps, leftovers, shopping-list-ready ingredients, tags/pools, and related-recipe linking via the existing page builder.

---

## Totals

| Catalog | Added | After |
|---------|------:|------:|
| Hall expansion (defs) | **+23** | 116 defs / 115 published pages* |
| Breakfast catalog | **+4** | 62 seeded / 67 generated pages** |
| **Wave 1 total** | **27** | — |

\*One legacy def remains filtered by `PHASE5_REMOVED_SLUGS` (`chicken-caesar-wraps`).  
\*\*Breakfast generator writes primary + performance splits.

---

## Quality bar applied

Matched hall-expansion / bowl-classics production pattern:

| Requirement | How delivered |
|-------------|---------------|
| Hold notes | `mealPrepNotes` + `CALL_INTERRUPTION_STEP` (140°F / 200°F oven) |
| Scaling | `crewSizeDefault: 10` → page baseServings 8 with UI scaling |
| Beginner steps | Concrete technique + failure modes; temps called out |
| Leftovers | `standardLeftovers` + remix idea + pack-down step |
| Shopping list | Grouped `ingredients[]` (UI builds list) |
| Tags | `explorePools` + auto format/protein/category tags |
| Related recipes | Auto by `mealFormat` then `category` in page builder |

**Slug collision rules honored:** no reuse of golden `greek-chicken-bowls` / performance `korean-beef-rice-bowls`; Wave 1 uses `firehall-gyro-bowls`, `korean-turkey-rice-bowls`, etc.

---

## Inventory by priority

### 1. Bowls (7) — hall-expansion

| Slug | Title |
|------|-------|
| `turkey-taco-bowls` | Turkey Taco Bowls |
| `peanut-chicken-rice-bowls` | Peanut Chicken Rice Bowls |
| `firehall-gyro-bowls` | Firehall Gyro Bowls |
| `egg-roll-in-a-bowl-crew` | Egg Roll in a Bowl |
| `salmon-rice-bowls-crew` | Salmon Rice Bowls |
| `korean-turkey-rice-bowls` | Korean Turkey Rice Bowls |
| `leftover-roast-beef-bowls` | Leftover Roast Beef Bowls |

### 2. Slow cooker (6) — hall-expansion

| Slug | Title |
|------|-------|
| `mississippi-pot-roast-crew` | Mississippi Pot Roast for the Crew |
| `white-chicken-chili-crock` | White Chicken Chili (Crock) |
| `italian-beef-slow-cooker` | Italian Beef Slow Cooker |
| `salsa-verde-chicken-crock` | Salsa Verde Chicken Crock |
| `loaded-baked-potato-soup-crock` | Loaded Baked Potato Soup |
| `thai-peanut-chicken-crock` | Thai Peanut Chicken Crock |

### 3. Breakfast (4) — breakfast catalog

| Slug | Title |
|------|-------|
| `sheet-pan-eggs-sausage-crew` | Sheet-Pan Eggs & Sausage |
| `hash-brown-breakfast-casserole` | Hash Brown Breakfast Casserole |
| `bagel-sandwich-line` | Bagel Sandwich Line |
| `overnight-oat-bar-crew` | Overnight Oat Bar for the Crew |

### 4. BBQ (4) — hall-expansion (smoker/grill)

| Slug | Title |
|------|-------|
| `burnt-ends-chili-crew` | Burnt Ends Chili |
| `smoker-nachos-crew` | Smoker Nachos |
| `weeknight-bbq-ribs-crew` | Weeknight BBQ Ribs |
| `grilled-flank-fajita-bar` | Grilled Flank Fajita Bar |

### 5. Budget (3) — hall-expansion

| Slug | Title |
|------|-------|
| `costco-rotisserie-remix` | Costco Rotisserie Chicken Remix |
| `chicken-thigh-stretch-dinner` | Chicken Thigh Stretch Dinner |
| `pasta-e-fagioli-hall` | Pasta e Fagioli for the Hall |

### 6. One pot (3) — hall-expansion

| Slug | Title |
|------|-------|
| `dirty-rice-crew-skillet` | Dirty Rice Crew Skillet |
| `sausage-gnocchi-skillet` | Sausage Gnocchi Skillet |
| `spanish-rice-chicken-one-pot` | Spanish Rice & Chicken One-Pot |

---

## Source files

| File | Role |
|------|------|
| `shared/hall-expansion/adapted/batch-wave1-expansion.ts` | 23 dinner/BBQ recipes |
| `scripts/wave1-recipe-data.json` | Intermediate recipe data |
| `scripts/build-wave1-recipes.mjs` | JSON → TS emitter |
| `shared/breakfast-expansion/batch-wave1-breakfast-pages.ts` | 4 breakfast recipes |
| `shared/hall-expansion/adapted/all-expansion-recipes.ts` | Registration |
| `shared/hall-expansion/types.ts` | `HALL_EXPANSION_COUNT = 116` |
| `shared/hall-expansion/image-donor-overrides.ts` | Temporary hero donors |
| `scripts/generate-breakfast-catalog.ts` | Breakfast wave1 wired |
| `shared/breakfast-catalog/slug-registry.ts` | Slug registry updated |

## Commands run

```bash
node scripts/build-wave1-recipes.mjs
npm run hall-expansion:generate-pages
npm run seed:hall-expansion
npm run catalog:generate-breakfast
npm run seed:breakfast-catalog
```

---

## Roadmap coverage vs content-growth-strategy

| Roadmap item | Wave 1 status |
|--------------|---------------|
| Turkey taco bowls | ✅ |
| Peanut chicken bowls | ✅ |
| Gyro bowls | ✅ |
| Egg roll in a bowl | ✅ |
| Salmon rice bowls | ✅ |
| Korean turkey bowls | ✅ |
| Leftover roast beef bowls | ✅ |
| Breakfast scramble bowls | ⏭ deferred (sheet-pan eggs & sausage covers morning protein) |
| Mississippi pot roast | ✅ |
| Chicken chili (crock) | ✅ white chicken chili |
| Italian beef | ✅ |
| Salsa chicken | ✅ |
| Loaded baked potato soup | ✅ |
| Thai peanut chicken | ✅ |
| BBQ pulled pork / carnitas crock | Already covered by existing bowl/bar recipes |
| Hot honey meatballs / beef stew crock | ⏭ Wave 2 |
| Sheet-pan eggs & sausage | ✅ |
| Hash brown casserole | ✅ |
| Bagel sandwich line | ✅ |
| Overnight oat bar | ✅ |
| Burnt ends chili | ✅ |
| Smoker nachos | ✅ |
| Weeknight ribs | ✅ |
| Flank fajita bar | ✅ |
| Costco rotisserie remix | ✅ |
| Chicken thigh stretch | ✅ |
| Pasta e fagioli | ✅ |
| Dirty rice / sausage gnocchi / Spanish rice chicken | ✅ |
| Shrimp & grits / Philly skillet / egg feed night | ⏭ Wave 2 |

---

## Follow-ups (Wave 2)

1. **Depth pass** on thinner Wave 1 slow-cooker/BBQ steps if audit flags generic language.  
2. **Dedicated heroes** — replace temporary golden-100 donor copies with real photography.  
3. Remaining P0 gaps: hot honey meatballs, beef stew crock, shrimp & grits, Philly skillet, egg feed night, breakfast scramble bowls.  
4. Optional: promote BBQ Wave 1 items into `bbq-expansion` catalog if dual-surface indexing is desired.  
5. Wire Wave 1 slugs into recipe authority / pillar related lists where relevant.  
6. Breakfast Wave 1 heroes under `/images/breakfast/` (pages seeded; photography still pending).  

---

## Audit note

After donor-image copy (`scripts/copy-wave1-donor-images.ts`):

- Expansion production readiness score **72% → 89%**
- Wave 1 `missing_hero` errors cleared via temporary golden-100 donors  
- Remaining audit errors are mostly pre-existing / breakfast imagery gaps, not recipe content collisions

---

## Expected product impact

- Slow cooker was near-empty in hall-expansion → now a usable Explore pool.  
- Bowl catalog depth increased beyond the prior 10 classics.  
- Budget + one-pot fill Costco / busy-night SERP and generator filters.  
- Breakfast gains four station-ops formats without colliding existing burrito/hash/pizza slugs.

*— End of recipe expansion wave 1 —*
