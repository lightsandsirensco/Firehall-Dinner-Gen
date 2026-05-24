# Curated Recipe Database — Architecture

## Purpose

Firehall Meals is moving from **random AI-generated recipes** toward **curated, attributed meals** from trusted external sources. The curated recipe database is the normalized internal store for:

- External recipe imports (Spoonacular, publishers, partners)
- Explore editorial feeds and category rails
- Trending / featured placement
- Firefighter meal categories and crew-dinner scoring
- Hall Vote and recommendation compatibility (via optional `generate_response_json`)
- High-quality imagery metadata (hero, blur hash, CDN preload)

## Design principles

| Principle | Decision |
|-----------|----------|
| **Real recipes only** | Rows require source attribution + ingredients + instructions |
| **Normalize scalars, JSON sparingly** | Ingredients/steps/tags/images in child tables; optional `generate_response_json` for hall-scale compatibility |
| **Incremental migration** | Coexists with legacy `recipe_catalog` (`payload_json` blob); `legacy_catalog_id` links rows |
| **Versioned schema** | `schema_migrations` + numbered SQL files in `server/db/migrations/` |
| **Validate at write** | Zod schemas in `shared/curated-recipe/validation.ts` |
| **Batch + API paths** | Ingestion promotes → catalog + curated; read APIs for Explore (future) |

## Entity model

```
curated_recipes (1)
  ├── curated_recipe_ingredients (N)
  ├── curated_recipe_instructions (N)
  ├── curated_recipe_tags (N)
  ├── curated_recipe_images (N)
  └── curated_recipe_categories (N)  ← Explore pools, hall categories
```

### Core fields (`curated_recipes`)

| Field group | Columns |
|-------------|---------|
| Identity | `recipe_id`, `slug`, `status` |
| Content | `title`, `summary`, `hero_image`, `hero_image_alt` |
| Timing | `prep_minutes`, `cook_minutes`, `total_minutes`, `servings_base`, `cleanup_difficulty` |
| Taxonomy | `protein`, `cuisine`, `category`, `meal_format`, `meal_archetype`, `cooking_style` |
| Scores | `comfort_score`, `healthy_score`, `firehall_suitability_score`, `quality_score`, `appetite_score`, `trend_score` |
| Source | `source_kind`, `source_name`, `source_url`, `source_license`, `external_id` |
| Editorial | `featured`, `trending_rank`, `served_count` |
| Compatibility | `legacy_catalog_id`, `generate_response_json`, `schema_version` |
| Audit | `created_at`, `updated_at` |

### Status lifecycle

`draft` → `review` → `published` → `archived`

- Ingestion drafts land in `review`
- Promotion sets `published`
- Admin can archive rejected/low-quality rows (future UI)

## Normalization strategy

**Why not one JSON blob?**

- Query filters (protein, category, quality, explore pool) need indexed columns
- Ingredients/instructions are stable shapes for shopping lists, vote payloads, and future search
- Tags and categories support many-to-many editorial placement without duplicating full recipes

**What stays as JSON?**

- `generate_response_json` — optional cached hall-scaled `GenerateResponse` for `/api/generate` and Hall Vote without re-scaling

**ID strategy**

| Pattern | Example |
|---------|---------|
| Spoonacular | `spoonacular:716429` |
| Curated slug | `curated:bbq-ribs-night` |
| Import fingerprint | `import:abc123…` |

Aligns with legacy `recipe_catalog.catalog_id` where possible.

## Indexing (migration 002)

| Index | Use case |
|-------|----------|
| `(status, quality_score DESC)` | Explore rails, generate-first |
| `(status, featured, trending_rank)` | Trending strip |
| `protein`, `category`, `meal_archetype` | Filters / personalization |
| `(source_kind, external_id)` | Dedupe on import |
| `curated_recipe_categories(category_key, weight)` | `listCuratedRecipeSummaries({ explorePool })` |

## Scalability

- **SQLite (sql.js)** today: single-file `data/cache.db`, fine for thousands of curated rows and batch ingestion
- **Read path**: list endpoints return summaries; full hydrate only on detail
- **Write path**: transactional upsert replaces child rows atomically
- **Future**: Postgres read replica or export to object storage for images; same TypeScript domain types

## Performance

- Explore should call `listCuratedRecipeSummaries` (indexed) not full `getCuratedRecipeById` per card
- Keep `generate_response_json` off hot list queries
- Image preload uses `curated_recipe_images` hero URL + optional `blur_hash`
- Partial indexes on `published` reduce scan size as catalog grows

## Code map

| Layer | Path |
|-------|------|
| Types | `shared/curated-recipe/types.ts` |
| Validation | `shared/curated-recipe/validation.ts` |
| Migrations | `server/db/migrate.ts`, `server/db/migrations/*.sql` |
| Store | `server/curated-recipe-store.ts` |
| Bridges | `server/curated-recipe-bridge.ts` |
| Sync script | `scripts/sync-catalog-to-curated.ts` |

## APIs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/curated-recipes/stats` | Counts + migration version |
| GET | `/api/admin/curated-recipes/:recipeId` | Full normalized recipe |
| GET | `/api/curated-recipes?pool=comfort_food` | Published summaries for feeds |

## Migration from `recipe_catalog`

1. Deploy migrations (automatic on `initCuratedRecipeStore()`)
2. Run `npx tsx scripts/sync-catalog-to-curated.ts` for existing rows
3. New promotions dual-write via `promote.ts`
4. Phase 2: point Explore `listCatalogForExplorePool` → `listCuratedRecipeSummaries`
5. Phase 3: deprecate `recipe_catalog.payload_json` for reads

## Related docs

- `server/prompts/docs/recipe-ingestion-architecture.md` — batch pipeline
- `shared/canonical-recipe.ts` — legacy catalog shape (bridge source)
