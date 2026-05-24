# Recipe Expansion Architecture

Curated growth system for the Firehall Meals internal database. Goal: **quality over quantity** — a scalable editorial pipeline, not a recipe dump.

## Principles

1. **Publisher-first** — trusted JSON-LD sources beat Spoonacular aggregators for heroes and attribution.
2. **Gate before publish** — unified quality scoring + catalog balance caps.
3. **Archetype nights** — Taco Night, Chili Night, etc. with variation labels for Explore and Hall Vote.
4. **Dedupe at every layer** — batch fingerprint, staging fingerprint, curated DB lookup.
5. **Explore-ready** — normalized `curated_recipes` + pool tags + indexes for feeds and future personalization.

---

## Data model

### Core table: `curated_recipes`

| Column | Purpose |
|--------|---------|
| `quality_score` | Composite 0–100 (publish threshold ~52, publisher ~48) |
| `archetype_family` | Hall night family (`taco_night`, `chili_night`, …) |
| `archetype_variation` | Editorial variation label |
| `quality_breakdown_json` | Sub-scores: appetite, image, realism, protein, sides, … |
| `source_kind` + `external_id` | Unique index prevents duplicate imports |

Child tables: ingredients, instructions, tags, images, categories (Explore pools).

### Staging: `ingestion_staging`

Fingerprint-keyed drafts from pipeline runs before promote.

---

## Ingestion flow

```
Trend signals (JSON / Apify Pinterest)
        ↓
Resolvers (publisher JSON-LD → optional Spoonacular / hall classics)
        ↓
dedupeDrafts() — batch fingerprint
        ↓
enrichDraftForExpansion() — quality + archetype tags
        ↓
validateIngestDraft() + image URL check
        ↓
stageRecipeDraft() — SQLite staging
        ↓
promoteValidatedWithExpansionGates()
        ├─ findExistingCuratedForDraft() — DB dedupe
        ├─ evaluateExpansionPromoteGate() — quality + balance
        └─ promoteDraftToCatalog() → curated_recipes (+ legacy catalog for Spoonacular)
```

**CLI:** `npx tsx scripts/expand-recipes.ts` (full run) or `--promote-only` (gates only).

**Admin:** `GET /api/admin/expansion/stats` — catalog counts + balance snapshot.

---

## Quality scoring (`shared/recipe-quality-score.ts`)

| Dimension | Weight (composite) |
|-----------|-------------------|
| Appetite appeal | 18% |
| Image quality | 14% |
| Visual quality | 8% |
| Hall suitability | 16% |
| Comfort | 10% |
| Realism | 10% |
| Ingredient completeness | 10% |
| Protein quality | 6% |
| Side dish quality | 4% |
| Trend signal | 4% |
| Publisher bonus | additive |

Publish requires: composite ≥ threshold, realism ≥ 35, ingredient completeness ≥ 40.

---

## Meal archetypes (`shared/meal-archetype-system.ts`)

Families map to legacy `meal_archetype` for compatibility and emit Explore pool tags:

- Taco Night, Chicken Parm Night, BBQ Night, Chili Night, Pasta Night, Sandwich Night
- Pizza Night, Slow Cooker, Grill, Healthy Bowl, Comfort, Breakfast, Soup/Stew, Game Day, Plated

`inferHallArchetypeFamily()` runs on title/summary/format/tags. `pickArchetypeVariation()` picks a display variation deterministically.

---

## Deduplication

1. **Batch:** `recipeFingerprint()` — Spoonacular id > curated slug > title+host
2. **Staging:** unique fingerprint per run
3. **Curated DB:** `findExistingCuratedForDraft()` — external id, slug, fp tag, normalized title+host

---

## Category balancing (`shared/feed-balance.ts`)

Before promote, `computeBalanceDecision()` applies soft caps:

| Axis | Cap (of published catalog) |
|------|---------------------------|
| Protein | ~28% |
| Cuisine | ~32% |
| Archetype family | ~22% |
| Explore pool | ~45% |

Over-cap candidates get a quality penalty; hard reject if effective score &lt; 48. Spoonacular image ratio penalized when &gt; 65% of catalog.

---

## Ranking & Explore

**Editorial sort** (existing): publisher-first, non-Spoonacular heroes, `scoreEditorialQuality()`.

**Unified ranking** (`shared/recipe-ranking.ts`): appetite + editorial + publisher bonuses.

**Explore sections:** `listCuratedForExplorePool(poolTag)` — category join + publisher-first sort.

**Future personalization:** `archetype_family`, `served_count`, `trending_rank`, quality breakdown JSON — ready for weighted retrieval without schema churn.

---

## DB scaling strategy

| Phase | Approach |
|-------|----------|
| Now (~100–500 recipes) | Single SQLite `data/cache.db`, indexed queries |
| Growth (1k–10k) | Keep SQLite; add `title_normalized` column + FTS for search |
| Scale (10k+) | Postgres read replica; curated_recipes as source of truth; CDN for images |

Migrations are versioned in `server/db/migrations/` and applied on `initCuratedRecipeStore()`.

---

## Performance considerations

- Ingestion is **offline only** — never on Explore HTTP hot path.
- Image validation uses HEAD/fetch with timeout per draft.
- Promote throttles ~350ms between Spoonacular API calls.
- Balance snapshot uses aggregate SQL — O(1) per promote gate.
- Title dedupe scan is O(n) — acceptable under ~2k rows; index `title_normalized` when n grows.

---

## Operational checklist

1. Add URLs to `data/ingestion/publisher-seed-urls.json`
2. Run `npx tsx scripts/expand-recipes.ts --promote --prefer-publisher`
3. Audit: `npx tsx scripts/audit-explore-flow.ts`
4. Monitor `/api/admin/expansion/stats`

---

## Files map

| Module | Role |
|--------|------|
| `shared/meal-archetype-system.ts` | Archetype families + inference |
| `shared/recipe-quality-score.ts` | 10-dimension quality model |
| `shared/feed-balance.ts` | Catalog balance caps |
| `server/expansion/recipe-expansion-service.ts` | Orchestrator + promote gates |
| `server/ingestion/pipeline.ts` | Batch ingest |
| `server/curated-recipe-store.ts` | Persistence + Explore queries |
| `scripts/expand-recipes.ts` | CLI entry |
