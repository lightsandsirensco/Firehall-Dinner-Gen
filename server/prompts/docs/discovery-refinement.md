# Discovery Refinement Layer

## Explore UI (curated-v1)

- **14 editorial rails** in `shared/explore-discovery-catalog.ts`
- **Crew Favorites** + **Trending Tonight** hero rails (server-injected + catalog)
- **Cinematic cards** with quick-info pills (30 Min, High Protein, Comfort, etc.)
- **Mobile-first** horizontal snap scroll, `touch-manipulation`, larger tap targets
- Query key `curated-v1` — bust cache after deploy

# Discovery Refinement Layer

## Weak points addressed

| Issue | Fix |
|-------|-----|
| Fragmented scoring (appetite vs quality vs DB) | `shared/recipe-ranking.ts` — `scoreExploreCard()` |
| Same meals across Explore rails | Global dedupe in `buildExploreEditorialFeed` |
| Repetitive sides across users | Session-scoped rotation in `cache-store` + `side-pairing` |
| Explore sort ignores `qualityScore` | Composite rank blends appetite + quality + trust |
| Weak generate catalog picks | Ranker uses `appetiteScore`; curated rows allowed |
| Slow Explore TTFB | 10m in-memory feed cache; 120ms batch throttle |
| Card presentation double-compute | Server `enrichCard` + client memoized presentation |
| Preload link leak | Deduped `preloadExploreImages` |
| Query cache churn | Stable `queryKey`, `refetchOnWindowFocus: false` |

## Ranking architecture

```
scoreExploreCard =
  appetite (45%) + storedQuality (35%)
  + image/trust/hall bonuses
  - low-quality patterns
  - feed protein / image-host repetition penalties
```

Used in: Explore section fill, Spoonacular merge, catalog/curated pulls.

## Explore feed strategy

1. **Curated DB first** (published, pool-matched)
2. Spoonacular fill (merged, not replaced)
3. Catalog fallback
4. Hall seed fallback (deduped)

Per feed build:

- Global `seenIds` / `seenTitles`
- `feedProteins` + `feedImageHosts` penalty during sort
- `sequenceExploreCardsForDisplay` — protein alternation within rail

## Meal composition

- `sessionKey` passed from `sendRecipeResponse` → `completeFirehallPlate` → `pickComposedSides`
- Title-curated bundles (chicken parm → spaghetti + Caesar + garlic bread)
- Archetype bundles + cuisine pools unchanged but session-aware rotation

## Performance

- Feed cache keyed by day + diet filters (10 min TTL)
- First rail: `priority` images (`loading=eager`, `fetchPriority=high`)
- `ExploreCinematicCard` wrapped in `memo`
- Wider rail cards (320px) for appetite appeal
