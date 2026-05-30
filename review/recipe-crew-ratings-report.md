# Recipe Crew Ratings — Final Deliverable

Firefighter-focused thumbs up/down voting, badges, Explore collections, sorting, admin analytics, and anti-spam protection.

## 1. Database Changes

**Migration:** `server/db/migrations/011_recipe_crew_ratings.sql`

| Table | Purpose |
|-------|---------|
| `recipe_crew_ratings` | Aggregates per recipe: `thumbs_up_count`, `thumbs_down_count`, `total_votes`, `approval_score`, timestamps |
| `recipe_crew_rating_ballots` | One ballot per `(recipe_slug, fingerprint_hash)` with optional `complaint_category` |

**Future expansion columns (unused in v1 UI):** `cooked_at_hall_count`, `station_tested_count`, `unique_cookers_count`

**Approval score:** `thumbs_up_count / total_votes` (stored as REAL, e.g. `0.92`)

## 2. Components Created

| Path | Role |
|------|------|
| `client/src/components/recipe-crew-rating/recipe-crew-rating-panel.tsx` | Main voting UI on recipe pages |
| `client/src/components/recipe-crew-rating/recipe-crew-rating-badges.tsx` | Earned badge chips |
| `client/src/components/recipe-crew-rating/negative-feedback-sheet.tsx` | Optional complaint picker after 👎 |
| `client/src/components/explore-rating-collections.tsx` | Dynamic Explore sections from live vote data |
| `client/src/pages/admin-recipe-ratings.tsx` | Admin analytics dashboard |
| `client/src/lib/recipe-crew-ratings-api.ts` | Public API client |
| `client/src/lib/recipe-crew-ratings-admin-types.ts` | Admin analytics types |

**Recipe page integration:**
- `golden-recipe-page.tsx` (covers `/recipes/:slug` meals via `catalog-recipe-page.tsx`)
- `smoothie-recipe-page.tsx`
- `breakfast-recipe-page.tsx` (`/breakfast/:slug`)

## 3. Badge Logic

**Shared:** `shared/recipe-crew-ratings/badges.ts`

| Badge | Requirements |
|-------|--------------|
| 🔥 Crew Favourite | ≥100 votes, ≥90% approval |
| 🥇 Hall Favourite | ≥250 votes, ≥92% approval |
| ⭐ Top Rated | ≥50 votes, top 10% approval across library |
| 📈 Trending | Significant 30-day vote growth (7d vs prior 23d) |
| 👨‍🚒 Rookie Approved | category = rookie_friendly, ≥85%, ≥25 votes |
| 🏆 Firehall Classic | category = firehall_classics, ≥90%, ≥50 votes |

Badges are evaluated at read time — only shown when criteria are met. Target: **5–15%** of rated recipes; hard warn if **>20%** with sufficient data.

**Display rules:** `shared/recipe-crew-ratings/display.ts`
- Always show `"92% Would Cook Again"` when voted
- Hide vote count when `< 25` votes
- Show `"N Firefighter Ratings"` when `N ≥ 25`

## 4. Explore Sections

**Component:** `ExploreRatingCollections` — wired into `explore-catalog-browser.tsx`

Dynamic sections (empty until real votes exist):
- 🔥 Crew Favourites
- ⭐ Top Rated Recipes
- 📈 Trending Recipes
- 👨‍🚒 Rookie Approved
- 🏆 Firehall Classics

Titles resolved from approved catalog API (not slug-only).

## 5. Sorting

**Explore sort modes** in `explore-catalog-browser.tsx`:
- Curated (default)
- Most Popular
- Highest Rated
- Most Votes
- Trending

Sort map from `GET /api/recipe-ratings/sort-map`.

## 6. Admin Analytics

**Route:** `/admin/recipe-ratings` (linked from `/admin`)

**API:** `GET /api/admin/recipe-ratings/analytics`

Dashboard shows:
- Most liked / most disliked
- Highest / lowest approval scores
- Most voted
- Fastest growing (7d / 30d)
- Complaint category breakdown
- Badge distribution + badge rate

## 7. Anti-Spam Protection

| Layer | Mechanism |
|-------|-----------|
| Identity | SHA-256 fingerprint (IP + User-Agent) |
| Duplicate votes | Unique `(recipe_slug, fingerprint_hash)` in DB |
| Rate limit | 40 votes/hour per IP |
| Client | Debounced submit, disabled state while posting |
| Server | CSRF on POST, Zod validation |

No account required for v1.

## 8. Badge Distribution Report

```
npm run audit:recipe-crew-ratings
```

**Latest run (2026-05-28):**
- Catalog recipes: 224
- Rated recipes: 0
- Total votes: 0
- Badge rate: 0%

Expected at launch — collections and badges populate from real firefighter votes only.

## 9. QA Results

| Check | Result |
|-------|--------|
| `npm run check` | ✅ Pass (includes `test-recipe-crew-ratings.ts`) |
| `npm run build` | ✅ Pass |
| `npm run audit:recipe-crew-ratings` | ✅ Pass |
| TypeScript | ✅ No errors |
| Unit tests | ✅ Display rules, badge thresholds, trending logic |

## API Reference

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/recipe-ratings/:slug?category=` | Public view + badges + user's vote |
| POST | `/api/recipe-ratings/:slug/vote` | Cast/update vote |
| GET | `/api/recipe-ratings/collections` | Explore section data |
| GET | `/api/recipe-ratings/sort-map` | Slug ordering for Explore sorts |
| GET | `/api/admin/recipe-ratings/analytics` | Admin dashboard data |

## Success Criteria

On any recipe page, a firefighter can instantly answer **"Would other firefighters cook this again?"** via one-tap 👍/👎 — with earned, rare badges and no Yelp-style complexity.
