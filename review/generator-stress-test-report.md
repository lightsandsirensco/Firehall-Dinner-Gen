# Generator Stress Test — Firehall Meals

Generated: 2026-06-23T15:41:46.492Z

## Executive summary

| Metric | Value |
|--------|------:|
| **Total generations tested** | 250 |
| **Success rate** | 100.0% |
| **Failure rate** | 0.0% |
| **Duplicate draw rate** (repeat slugs / total) | 64.4% |
| **Rows hitting a repeated slug** | 89.2% |
| **Max repeats (single slug)** | 12 |
| **Mean draws per unique slug** | 2.8 |
| **Unique recipes generated** | 89 |
| **Average generation time** | 4 ms |
| **Slowest generation** | 19 ms |
| **Target avg** | < 2,000 ms |
| **Broken images** | 0 |
| **Broken nutrition** | 0 |
| **Broken scaling** | 0 |
| **Broken analytics payloads** | 0 |
| **Generator Production Readiness %** | **90%** |

Pipeline: `runLocalFirstGeneratePipeline` (same path as `POST /api/generate`, curated catalog only).

## Scenario coverage

- breakfast
- lunch
- dinner
- bbq
- healthy
- comfort
- rookie
- quick
- high_protein
- classics

Crew sizes rotated: 4, 6, 8, 10, 14 · Proteins: any, chicken, beef, pork, turkey, seafood

## Duplicate analysis

| Metric | Value |
|--------|------:|
| Unique slugs | 89 |
| Repeat draw rate | 64.4% |
| Rows with repeated slug | 89.2% |
| Max slug frequency | 12 |

### Top 20 most frequently generated recipes

| Rank | Slug | Count |
|------|------|------:|
| 1 | `beef-broccoli` | 12 |
| 2 | `korean-beef-rice-bowls` | 9 |
| 3 | `pulled-pork` | 8 |
| 4 | `ginger-salmon-bowls` | 8 |
| 5 | `honey-garlic-pork-tenderloin` | 7 |
| 6 | `baked-turkey-meatball-marinara` | 7 |
| 7 | `jerk-chicken` | 6 |
| 8 | `turkey-taco-skillet` | 6 |
| 9 | `sheet-pan-sausage-peppers` | 5 |
| 10 | `pork-carnitas-tacos` | 5 |
| 11 | `white-bean-chicken-chili` | 5 |
| 12 | `veggie-egg-casserole-tray` | 4 |
| 13 | `pad-thai` | 4 |
| 14 | `detroit-style-pizza` | 4 |
| 15 | `garlic-butter-shrimp` | 4 |
| 16 | `herb-baked-salmon-tray` | 4 |
| 17 | `grilled-pork-chops` | 4 |
| 18 | `sausage-peppers-onions` | 4 |
| 19 | `steak-tacos` | 4 |
| 20 | `smoked-wings-white-sauce` | 4 |



## Performance

| Metric | Value | Target |
|--------|------:|--------|
| Average generation time | 4 ms | < 2,000 ms |
| Slowest generation | 19 ms | — |
| Failed generations (pipeline throw) | 0 | 0 |
| Timeout rate | 0% | 0% |

## Analytics validation

Every successful generation includes fields for `meal_generation_started` and `meal_generated`: `recipe_slug`, `meal_category` (scenario tag), `crew_size`, `session_id`, plus `recipe_title` and `protein`.

| Metric | Value |
|--------|------:|
| Payloads complete | 250 / 250 |
| Broken analytics | 0 |

## Scaling test (crew 2, 4, 6, 8, 10, 12)

Catalog page ingredient scaling validated for **89** unique slugs drawn during the run.

| Result | Count |
|--------|------:|
| Scaling failures | 0 |

_All tested slugs scale across crew sizes._

## Image validation

| Issue | Count |
|-------|------:|
| Missing hero file | 0 |
| Hero/title semantic conflict | 0 |

## Recipe quality flags (non-blocking)

| Code | Occurrences |
|------|------------:|
| vague_step | 1021 |
| ingredient_unused | 508 |
| placeholder_ingredient | 272 |

## Failure & resilience tests

| Test | Result |
|------|--------|
| Invalid request rejected (Zod) | PASS |
| Duplicate request_id guard | PASS |
| In-flight request guard | PASS |
| 20 parallel generations | 20 ok / 0 failed |

## Per-generation validation (every result)

1. Recipe exists (title, ingredients, steps)
2. Catalog page JSON when slug is approved
3. Hero image file on disk
4. Hero vs title semantic check
5. Per-serving nutrition (calories + protein)
6. No placeholder / blank sections
7. Ingredient ↔ step alignment (heuristic)
8. Analytics payload complete (`meal_generation_started` / `meal_generated` fields)

## Broken categories

### Failed generations (0)

_None._

### Image issues

_None._

### Nutrition issues

_None._

### Scaling issues

_None._

## Recommendations

- Generator pipeline is production-ready for curated meal generation at current volume.
- Review rotation weights — duplicate rate is high for 250 draws.
- Latency target met (local curated pipeline).
- Re-run after catalog or imagery changes: `npm run test:generator-stress`

## Commands

```bash
npm run test:generator-stress
npm run test:generator-stress -- --count=50
```
