# Firehall canonical recipe schema (v1)

Single platform model for meals across generator, Explore, imagery, shopping, and future native apps.

## Module map

| File | Role |
|------|------|
| `constants.ts` | Controlled enums (protein, cuisine, meal type, tags, units) |
| `schema.ts` | Zod schemas + `FirehallRecipe` type |
| `types.ts` | Parse results + quality score interfaces |
| `validators.ts` | `safeParse` wrappers, human-readable errors |
| `normalization.ts` | Title/ingredient/image/unit normalization before validation |
| `tags.ts` | Tag slugs + coercion from legacy strings |
| `scoring.ts` | Quality dimensions (stubs → existing title/gate/image modules) |
| `adapters.ts` | `GenerateResponse` / `ClientRecipeResponse` bridges |
| `index.ts` | Public exports |

## Usage

```ts
import {
  firehallRecipeFromGenerateResponse,
  parseFirehallRecipe,
  scoreFirehallRecipeQuality,
} from "@shared/recipe";

const result = firehallRecipeFromGenerateResponse(generateResponse, { crewSize: 8 });
if (result.ok) {
  const score = scoreFirehallRecipeQuality({ recipe: result.data });
}
```

## Migration

- **Legacy**: `GenerateResponse` / `ClientRecipeResponse` in `@shared/schema` remain unchanged.
- **New work**: normalize → `parseFirehallRecipe` → persist or render from `FirehallRecipe`.
- **Catalog row**: `CanonicalRecipe` in `@shared/canonical-recipe` is the DB catalog wrapper; its `generateResponse` field should pass through `firehallRecipeFromGenerateResponse` when validating.

## Schema version

`RECIPE_SCHEMA_VERSION = 1` — bump when making breaking document changes.

## Step 2 — Trust pipeline

```
normalize → repair (if needed) → validate → quality score → sendable?
```

```ts
import { runRecipeTrustPipeline } from "@shared/recipe";

const result = runRecipeTrustPipeline(generateResponse, {
  mealFormat: "tacos",
  protein: "beef",
  legacyValidationOk: validation.ok,
  importedSource: false,
});
if (!result.sendable) {
  // trigger curated fallback — never render result.recipe
}
```

| Module | Role |
|--------|------|
| `normalize.ts` | Titles, ingredients, tags, units, dedupe |
| `sanitize.ts` | Strip internal vocabulary from copy |
| `validate.ts` | Structure, ingredients, instructions, image |
| `quality.ts` | Composite scoring + `detectBadAIGeneration` |
| `repair.ts` | Title/step/ingredient recovery |
| `pipeline.ts` | `runRecipeTrustPipeline` orchestrator |

Server entry: `server/recipe-trust-pipeline.ts` → `processRecipeTrustPipeline` (structured logs, no user-facing errors).
