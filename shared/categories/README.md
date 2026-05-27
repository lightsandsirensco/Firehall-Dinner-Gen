# Firehall Master Category System (v1)

Twelve editorial **recommendation anchors** — not flat tags. Each category bundles emotional identity, visual system, imagery prompts, scoring rules, and legacy Explore pool bridges.

## The 12 categories

| ID | Display name |
|----|----------------|
| `firehall_classics` | Firehall Classics |
| `bbq_grill_nights` | BBQ & Grill Nights |
| `quick_shift_meals` | Quick Shift Meals |
| `comfort_food` | Comfort Food |
| `healthy_performance` | Healthy & Performance |
| `pizza_night` | Pizza Night |
| `big_crew_feeders` | Big Crew Feeders |
| `breakfast_brunch` | Breakfast & Brunch |
| `global_flavors` | Global Flavors |
| `game_day_watch_party` | Game Day & Watch Party |
| `meal_prep_leftovers` | Meal Prep & Leftovers |
| `rookie_friendly` | Rookie-Friendly Meals |

## Usage

```ts
import {
  assignFromGenerateResponse,
  rankCategoriesForRecipe,
  buildRecommendationIndexEntry,
  getDiscoverySectionsWithMasterCategories,
  enrichImageryContextFromCategories,
} from "@shared/categories";

const classification = assignFromGenerateResponse(recipe, "meal:abc", {
  curatedSlug: "steak-tacos",
  crewSize: 8,
});

const index = buildRecommendationIndexEntry({
  recipeKey: "meal:abc",
  title: recipe.title,
  mealFormat: recipe.meal_style,
});
```

## Module map

| File | Role |
|------|------|
| `definitions.ts` | Full editorial definitions (12) |
| `assignment.ts` | Rule + curated assignment, hall classic starters |
| `scoring.ts` | Per-category affinity + composite boost |
| `indexing.ts` | Recommendation vectors (12-dim) |
| `imagery.ts` | Category-aware prompt enrichment |
| `explore-bridge.ts` | Explore section ↔ master category |
| `validators.ts` | Zod validation for definitions |

## Migration notes

- Legacy `EXPLORE_POOL_IDS` in `shared/ingestion/categorize.ts` remain for ingest; new work should use `@shared/categories`.
- `CuratedHallCategory` in `curated-recipe/types.ts` is DB editorial — map via assignment, do not duplicate taxonomy.
- Food imagery `buildFoodImageryPromptSpec` now applies primary category mood/lighting automatically.
