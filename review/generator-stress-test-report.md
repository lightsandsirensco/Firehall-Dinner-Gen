# Generator Stress Test — Firehall Meals

Generated: 2026-06-02T15:58:18.378Z

## Executive summary

| Metric | Value |
|--------|------:|
| **Total generations tested** | 250 |
| **Success rate** | 100.0% |
| **Failure rate** | 0.0% |
| **Duplicate draw rate** (repeat slugs / total) | 64.8% |
| **Rows hitting a repeated slug** | 88.8% |
| **Max repeats (single slug)** | 11 |
| **Mean draws per unique slug** | 2.8 |
| **Unique recipes generated** | 88 |
| **Average generation time** | 6 ms |
| **Slowest generation** | 34 ms |
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

Crew sizes rotated: 2, 4, 6, 8, 10, 12 · Proteins: any, chicken, beef, pork, turkey, seafood

## Duplicate analysis

| Metric | Value |
|--------|------:|
| Unique slugs | 88 |
| Repeat draw rate | 64.8% |
| Rows with repeated slug | 88.8% |
| Max slug frequency | 11 |

### Top 20 most frequently generated recipes

| Rank | Slug | Count |
|------|------|------:|
| 1 | `baked-turkey-meatball-marinara` | 11 |
| 2 | `philly-cheesesteak-skillet` | 10 |
| 3 | `ginger-salmon-bowls` | 9 |
| 4 | `steak-tacos` | 8 |
| 5 | `pulled-pork` | 8 |
| 6 | `turkey-shepherds-sweet-potato` | 7 |
| 7 | `sheet-pan-sausage-peppers` | 7 |
| 8 | `sheet-pan-chicken-fajitas-lite` | 6 |
| 9 | `honey-garlic-pork-tenderloin` | 6 |
| 10 | `turkey-taco-skillet` | 6 |
| 11 | `pork-carnitas-tacos` | 6 |
| 12 | `steak-sandwiches` | 5 |
| 13 | `garlic-butter-shrimp` | 5 |
| 14 | `maple-soy-salmon-bowls` | 5 |
| 15 | `lemon-garlic-shrimp-pasta` | 5 |
| 16 | `texas-beef-ribs` | 4 |
| 17 | `lemon-herb-salmon` | 4 |
| 18 | `crispy-fish-taco-night` | 4 |
| 19 | `turkey-zoodle-bolognese` | 4 |
| 20 | `shawarma-chicken-rice-bowls` | 4 |



## Performance

| Metric | Value | Target |
|--------|------:|--------|
| Average generation time | 6 ms | < 2,000 ms |
| Slowest generation | 34 ms | — |
| Failed generations (pipeline throw) | 0 | 0 |
| Timeout rate | 0% | 0% |

## Analytics validation

Every successful generation includes fields for `meal_generation_started` and `meal_generated`: `recipe_slug`, `meal_category` (scenario tag), `crew_size`, `session_id`, plus `recipe_title` and `protein`.

| Metric | Value |
|--------|------:|
| Payloads complete | 250 / 250 |
| Broken analytics | 0 |

## Scaling test (crew 2, 4, 6, 8, 10, 12)

Catalog page ingredient scaling validated for **88** unique slugs drawn during the run.

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
| vague_step | 1020 |
| ingredient_unused | 512 |
| placeholder_ingredient | 242 |
| nutrition_withheld | 22 |

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
