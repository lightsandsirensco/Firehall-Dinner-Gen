# Recipe Ingestion & Trend Discovery Architecture

## Principle

**Explore never scrapes.** All discovery runs in **batch jobs** (CLI/cron). The Explore page reads **cached, normalized** data from `curated_recipes` → `recipe_catalog` → editorial seeds.

## Ingestion flow

```
Apify Pinterest Actor (batch)
        ↓
TrendSignal[]  (keyword, pinUrl, destinationUrl, imageUrl, trendScore)
        ↓
PublisherUrlResolveSource  — JSON-LD from trusted publisher URLs
SpoonacularResolveSource   — licensed fallback for keyword-only signals
HallClassicSeedSource      — station classics
        ↓
normalize + score + categorize + dedupe + image validation
        ↓
ingestion_staging (validated | rejected)
        ↓
promote → curated_recipes (publisher) + recipe_catalog (Spoonacular)
        ↓
Explore editorial feed (curated DB first, then Spoonacular, catalog, seeds)
```

## Backend services

| Service | Path | Role |
|---------|------|------|
| Apify client | `server/ingestion/apify-client.ts` | Run Pinterest actor, fetch datasets |
| Pinterest trends | `server/ingestion/sources/apify-pinterest-trend-source.ts` | Trend discovery |
| Publisher resolver | `server/ingestion/sources/publisher-url-resolve-source.ts` | URL → JSON-LD extraction |
| JSON-LD extractor | `server/ingestion/extraction/json-ld-recipe.ts` | schema.org/Recipe parse |
| Page fetch + cache | `server/ingestion/extraction/fetch-recipe-page.ts`, `url-cache.ts` | Rate-limited fetch, 24h TTL |
| Image validator | `server/ingestion/extraction/image-validator.ts` | HEAD + URL heuristics |
| Normalization | `shared/ingestion/normalize-extracted.ts` | → IngestRecipeDraft |
| Recipe sourcing policy | `shared/recipe-sourcing-policy.ts` | Tier 1–3 hierarchy + creation rules |
| Trusted publishers | `shared/ingestion/trusted-publishers.ts` | Allowlist + quality bonus (from policy) |
| Scoring / categories | `shared/ingestion/scoring.ts`, `categorize.ts` | Comfort, hall fit, pools, sides |
| Curated DB | `server/curated-recipe-store.ts` | Normalized persistence |
| Promotion | `server/ingestion/promote.ts` | Publisher + Spoonacular paths |

## Database / storage

| Store | Contents |
|-------|----------|
| `ingestion_trend_signals` | Raw Pinterest/trend rows per run |
| `ingestion_staging` | Draft JSON + status + scores |
| `curated_recipes` + child tables | **Source of truth** for publisher meals |
| `recipe_catalog` | Legacy blob + Spoonacular write-through |
| `data/ingestion/trend-signals.json` | Offline trend file (no Apify run) |

## Caching strategy

- **URL fetch**: in-memory 24h TTL (`url-cache.ts`) — avoids re-fetching publisher HTML in one batch
- **Apify**: dataset items cached on disk via export script; actor runs are weekly
- **Explore**: no live external calls when `curated_recipes` fills rails; Spoonacular only as secondary fill
- **Spoonacular API**: existing `recipe_cache` for generate path (unchanged)

## Image handling

1. Prefer **publisher JSON-LD image** (full-size recipe photo)
2. Fallback to **Pinterest pin image** if publisher URL fails validation
3. `validateImageUrlFetch` — HEAD check, min size, block placeholders
4. Reject staging rows with `invalid_hero_image`
5. Explore uses publisher URLs directly (non-Spoonacular CDN) via `normalizeExploreRecipeCard`

## Legal / stability

- **Do not** scrape Pinterest/TikTok on user HTTP paths
- **Do** use Apify batch actor + trusted publisher JSON-LD
- Attribute every meal: `source_name`, `source_url`, `license`
- Spoonacular remains licensed aggregator fallback

## CLI

```bash
npm run ingest:pinterest              # Apify + publisher + staging
npm run ingest:pinterest:promote      # + promote to curated/catalog
npm run ingest:apify                  # Export dataset → trend-signals.json
npm run ingest:discover -- --promote  # JSON trends + Spoonacular
npm run ingest:weekly                 # apify merge + full pinterest promote
npm run db:sync-curated               # Backfill catalog → curated DB
```

## Environment

| Variable | Purpose |
|----------|---------|
| `APIFY_API_TOKEN` | Apify API (or `APIFY_TOKEN`) |
| `APIFY_PINTEREST_ACTOR_ID` | Default `pear_fight~pinterest-scraper` |
| `APIFY_DATASET_ID` / `APIFY_ACTOR_RUN_ID` | Re-use existing run |
| `SPOONACULAR_API_KEY` | Resolver + Spoonacular promote |
| `INGEST_TREND_SIGNALS_PATH` | Offline trend JSON |

## Explore quality

Feed priority per rail:

1. `curated_recipes` (published, pool-matched)
2. Spoonacular search (cached API)
3. `recipe_catalog` fallback
4. Hall classic seeds

See also: `server/prompts/docs/curated-recipe-database.md`
