# Performance Audit v3 — Firehall Meals

**Date:** June 22, 2026  
**Lens:** Frontend bundle · route loading · images · React render path · network · localStorage · SQLite  
**Method:** Production `npm run build` chunk analysis, Vite/PWA config review, hot-path code audit (`App.tsx`, generator, explore, hall, sync, analytics, server catalog + SQLite stores)  
**Companion:** `mobile-safari-audit-v3.md`, `product-audit-v3.md`, `navigation-v3.md`

---

## Executive summary

Firehall Meals has **real performance engineering** in places: Vite `manualChunks`, lazy routes for 50+ pages, deferred GA4/Clarity, route prefetch on idle, Explore grid payload without hero URLs, React Query `staleTime` on catalog fetches, PWA runtime image caching, and SQLite indexes on analytics + protein deals.

The dominant problem is **first-load weight and main-thread work on the paths users actually open**:

| Bottleneck | Impact |
|------------|--------|
| **1.27 MB main chunk** (`index-*.js`, 356 KB gzip) | Homepage + Generator + Admin Golden 100 are **eager**; most app code ships on first paint |
| **`buildApprovedCatalog()` per request** | Server rebuilds ~337-recipe catalog from disk on every `/api/catalog/approved` hit — no in-process cache |
| **Global hall detail fetch** | `HallMembershipProvider` loads full hall detail for every authenticated session on every page |
| **localStorage on hot paths** | Saved meals, hall history, recipe cache, filters — repeated `JSON.parse` / `stringify` on render and sync |
| **Duplicate / uncached fetches** | Protein deals (dashboard card vs page), hall detail (context vs `/halls/:id`), golden catalog query keys |

**Overall performance grade: C+**  
(Strong primitives, weak first-byte and authenticated-session overhead.)

**Target after quick wins:** B− (homepage LCP −30%, Explore TTI −20%, hall dashboard −1 redundant API round-trip).

---

## Measurement baseline (production build, June 2026)

| Asset | Raw | Gzip | Notes |
|-------|-----|------|-------|
| `index-*.js` | **1,270 KB** | **356 KB** | Main app shell — **exceeds 500 KB Rollup warning** |
| `vendor-*.js` | 469 KB | 152 KB | Remaining `node_modules` |
| `vendor-charts-*.js` | 248 KB | 58 KB | Recharts — admin routes only (good) |
| `vendor-motion-*.js` | 113 KB | 37 KB | Framer Motion — pulled when Generator loads vote UI |
| `explore-*.js` | 75 KB | 23 KB | Lazy — good |
| `hall-page-*.js` | 23 KB | 6 KB | Lazy |
| `catalog-recipe-page-*.js` | 33 KB | 12 KB | Lazy |
| PWA precache | **2,918 KB** | — | 109 entries; images/catalog excluded from glob (good) |
| Server `dist/index.cjs` | 3.3 MB | — | Cold start + catalog build CPU |

**Home hero:** `home-hero-firetruck.jpg` ≈ **45 KB** — not a primary image problem.

**Approved catalog:** ~337 recipes (`APPROVED_CATALOG_TOTAL`). Grid JSON (no heroes) ≈ **150–220 KB** per fetch — acceptable with cache, heavy without.

---

## 1. Bundle size

### What’s working

- `vite.config.ts` splits `framer-motion`, `recharts`, `@radix-ui`, `@tanstack/react-query`, `lucide-react`.
- Admin growth/analytics pages lazy-load Recharts (248 KB stays off consumer paths).
- PWA `globIgnores` excludes `images/**`, `catalog/**`, `content/**` from precache bloat.

### Findings

| Issue | Severity | Detail |
|-------|----------|--------|
| Monolithic `index` chunk | **P0** | `Home`, `Generator`, and `AdminGolden100Page` are **static imports** in `App.tsx` — not code-split |
| Generator import graph | **P1** | ~900-line `generator.tsx` + `filter-panel.tsx` + vote modals + shopping/email modals in main chunk |
| Framer on Generator path | **P1** | `HallVoteModal` / `HallVotePromoBanner` import `framer-motion` — loads `vendor-motion` even before user opens vote UI |
| `CLASSIC_HALL_MEALS` in main graph | **P2** | `firehall-classics-wheel.ts` → `@shared/classic-hall-meals` via eager Generator |
| `vendor` catch-all | **P2** | 469 KB bucket — candidate for further splits (e.g. `wouter`, `zod`, date libs if present) |

```23:26:client/src/App.tsx
import Home from "@/pages/home";
import Generator from "@/pages/generator";
/** Eager — admin catalog must work on direct URL / refresh without lazy chunk race */
import AdminGolden100Page from "@/pages/admin-golden-100";
```

### Recommendations

| Tier | Action | Est. savings |
|------|--------|--------------|
| **Quick** | Lazy-load `Generator` (prefetch already warms `/generator` from homepage) | **−200–350 KB** off first paint for `/` |
| **Quick** | Lazy-load vote modals/banners inside Generator (`React.lazy` + open-gate) | **−113 KB** motion until needed |
| **Medium** | Lazy-load `Home` or split `HomeFeaturedMeals` + social proof | **−80–150 KB** on cold `/` |
| **Medium** | Admin Golden 100: lazy + `Suspense` with retry on direct URL (pattern used elsewhere) | **−30–50 KB** off consumer paths |
| **Large** | Audit `index` with `rollup-plugin-visualizer`; split shared hall/auth shells | **−300+ KB** sustained |

---

## 2. Route loading

### What’s working

- 50+ routes use `React.lazy` + `Suspense` + `RouteLoadingFallback`.
- `route-prefetch.ts` warms `/generator`, `/explore`, `/pizza`, `/hall`, `/wheel` on idle, hover, and post-navigation.
- `prefetchLikelyRoutes` runs on every route change from `App.tsx` `Router`.

### Findings

| Issue | Severity | Detail |
|-------|----------|--------|
| Critical paths eager | **P0** | `/` and `/generator` — top funnel — pay full `index` parse cost |
| Prefetch vs Save-Data | **P2** | Hover prefetch skipped on `saveData`; idle prefetch still runs at 2.5s |
| Admin on consumer bundle | **P1** | Golden 100 admin ships to all users for direct-URL reliability |
| No route-based provider split | **P2** | `HallMembershipProvider` + `CloudSyncProvider` wrap entire app |

### Recommendations

| Tier | Action |
|------|--------|
| **Quick** | `lazy(() => import("@/pages/generator"))` — keep `prefetchRoute("/generator")` on homepage |
| **Quick** | Extend prefetch map: `/recipes/:slug` on Explore card hover (recipe chunk) |
| **Medium** | Scope `HallMembershipProvider` to `/hall/*` routes via layout route |
| **Large** | Navigation v3 tab shell — prefetch only active tab neighborhood |

---

## 3. Large images

### What’s working

- Explore grid: `loading="lazy"`, `fetchPriority="low"`, `sizes="(max-width: 768px) 44vw, 240px"`.
- `HeroImage` supports `srcSet`, `sizes`, `priority`, LQIP `blurDataUrl`.
- `toApprovedCatalogGridResponse` strips hero URLs from Explore JSON (mobile memory safe).
- PWA runtime cache: `/images/` → StaleWhileRevalidate, 300 entries, 14-day TTL.
- Homepage hero is modest (~45 KB JPG) with `priority` only on `/`.

### Findings

| Issue | Severity | Detail |
|-------|----------|--------|
| Recipe detail heroes | **P1** | Full-resolution heroes on `/recipes/:slug` — no build-time responsive variants enforced in audit |
| Explore first paint | **P2** | Grid loads many thumbs at once (paginated to `visibleCount`, but initial page still 6–12 images) |
| JPEG heroes in catalog | **P2** | Editorial pipeline has WebP/srcSet helpers (`editorial-image.ts`) — not uniformly applied |
| Generator result hero poll | **P2** | `useMealHeroPoll` can trigger repeated `/api/.../hero` polling after generation |

### Recommendations

| Tier | Action |
|------|--------|
| **Quick** | Recipe page: `fetchPriority="high"` only above-fold hero; defer related-recipe thumbs |
| **Quick** | Reduce Explore initial `visibleCount` on mobile (6 → 4) |
| **Medium** | Standardize thumb WebP + width buckets (240 / 480) in image governance scripts |
| **Medium** | CDN or static `/_img?w=` resize proxy for heroes |
| **Large** | Build-step multi-resolution asset manifest tied to `thumbCacheVersion` |

---

## 4. Slow components

### Findings

| Component / page | Severity | Issue |
|------------------|----------|-------|
| `ExploreCatalogBrowser` | **P1** | Downloads full grid (~337 rows), filters + sorts **client-side** on every filter keystroke |
| `Generator` + `FilterPanel` | **P1** | Large Radix filter UI; `localStorage` write on every filter change |
| `ClassicsWheelPage` | **P2** | Framer `AnimatePresence` + spin animations — acceptable when lazy-loaded |
| `HallDashboardV2` | **P2** | `useHallDashboard` recomputes streaks/stats from full history on any history event |
| `CatalogRecipePage` | **P2** | 33 KB chunk + crew scaling + ratings — fine lazy; heavy when linked from SEO |
| Admin growth dashboard | **P3** | Recharts + growth SQLite aggregates — admin-only |

### Recommendations

| Tier | Action |
|------|--------|
| **Quick** | Debounce Explore filter URL sync (already 280ms on search — extend to filter chips) |
| **Quick** | Generator: debounce `firehall_filters` localStorage writes (300–500ms) |
| **Medium** | Virtualize Explore grid (`@tanstack/react-virtual`) — render only visible rows |
| **Medium** | Server-side catalog filter endpoint (`?protein=chicken&category=...`) for large catalogs |
| **Large** | Move recommendation ranking to Web Worker or server feed (already partial via editorial feed API) |

---

## 5. Duplicate fetches

### Findings

| Duplicate | Severity | Where |
|-----------|----------|-------|
| Hall detail | **P0** | `HallMembershipProvider.refreshDetail()` + `HallDetailPage.load()` both call `fetchHallDetail` |
| Protein deals | **P1** | `HallProteinDealsCard` raw `fetch` + `HallProteinDealsPage` separate load — no shared React Query key |
| Golden catalog index | **P1** | Home uses `["golden-catalog-home"]`; other pages use different keys — same `/api/catalog/golden-100` payload re-fetched |
| Approved catalog count | **P2** | `useGeneratorSeo`, Explore discovery, generator wheel hub all use `approvedCatalogTotalQueryKey` (good) — but **count endpoint still calls `buildApprovedCatalog()`** server-side |
| Auth + sync on sign-in | **P2** | `AuthProvider.afterSignIn` → `runCloudSync` + `CloudSyncProvider` initial sync — potential double sync |
| Social proof | **P3** | Home `SocialProofSection` fetch — single query, OK |

```94:96:client/src/lib/hall-membership/context.tsx
  useEffect(() => {
    void refreshDetail();
  }, [refreshDetail]);
```

```61:71:client/src/pages/hall-detail-page.tsx
  const load = useCallback(async () => {
    ...
      const data = await fetchHallDetail(hallId);
```

### Recommendations

| Tier | Action |
|------|--------|
| **Quick** | `HallDetailPage`: read `detail` from context; only fetch if `hallId !== activeHallId` or stale |
| **Quick** | Protein deals: `useQuery(['protein-deals', hallId], ...)` shared by card + page |
| **Quick** | Unify golden catalog `queryKey` to `["golden-catalog-index"]` everywhere |
| **Medium** | Hall detail in React Query with `staleTime: 60_000` — context reads from cache |
| **Medium** | Count endpoint: return cached `recipeCount` without full catalog build |

---

## 6. Rerenders

### What’s working

- `FilterPanel`, `ResultsPanel`, `ApprovedCatalogCard`, `ExploreCinematicCard` use `memo`.
- `HallFeedbackProvider` value is `useMemo`'d.
- `useHallDashboard` wraps output in `useMemo` with explicit deps.

### Findings

| Issue | Severity | Detail |
|-------|----------|--------|
| Provider cascade | **P1** | `AuthProvider` → `CloudSyncProvider` → `HallMembershipProvider` — any `detail`/`me` update rerenders all children |
| `useHallHistory` | **P1** | Event-driven full re-read of localStorage + recompute all derived lists per history write |
| `PageTransition` | **P2** | `key={location}` remounts entire route subtree on navigation — intentional scroll reset, costs reconciliation |
| `SiteHeader` | **P2** | Subscribes to `HALL_FAVORITES_CHANGED_EVENT` — global header rerenders on favorites sync |
| `getSavedCount()` | **P2** | Called synchronously in Explore render — parses full saved-meals JSON |

### Recommendations

| Tier | Action |
|------|--------|
| **Quick** | `getSavedCount` → cached counter updated only on `favorites-changed` event |
| **Quick** | Split `HallMembershipProvider`: expose `detail` via separate context so homepage doesn't subscribe |
| **Medium** | `useHallHistory`: store parsed snapshot in module memory; localStorage as persistence only |
| **Medium** | Route-level layouts — header outside `PageTransition` remount key |
| **Large** | Zustand or Jotai for hall snapshot — selectors prevent broad rerenders |

---

## 7. Analytics overhead

### What’s working

- GA4 + Clarity deferred via `scheduleNonCriticalScripts` (idle / post-load).
- `send_page_view: false` — manual SPA `page_view` only on route change.
- Product events batched: queue → flush 25 events / 1.2s → `POST /api/analytics/events`.
- `sessionStorage` backup queue (max 50) on unload via `keepalive`.

### Findings

| Issue | Severity | Detail |
|-------|----------|--------|
| Dual write | **P2** | Most actions call `trackEvent` (GA) **and** `trackProductEvent` (SQLite API) |
| Route `page_view` | **P2** | Every navigation → GA event + product `page_view` + SQLite insert |
| Filter/search tracking | **P2** | Explore search fires `trackSearch` on each distinct query |
| Growth dashboard SQL | **P1** | `getAnalyticsDashboard` runs 15+ aggregations; `topCookedMeals` uses heavy `UNION` subquery |
| `analytics_events` growth | **P2** | Unbounded table — indexes exist but no retention/TTL policy in app code |

```116:120:client/src/lib/product-analytics.ts
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushProductAnalytics();
  }, 1200);
```

### Recommendations

| Tier | Action |
|------|--------|
| **Quick** | Increase flush debounce to 2–3s; batch size 50 on idle |
| **Quick** | Sample low-value events in production (e.g. 10% `explore_filter`) |
| **Medium** | Nightly rollup job — dashboard reads summary tables, not raw scans |
| **Medium** | `analytics_events` retention: purge > 90 days |
| **Large** | Separate analytics write path (queue worker) decoupled from API request thread |

---

## 8. localStorage bottlenecks

### Inventory (hot keys)

| Key | Used for | Risk |
|-----|----------|------|
| `firehall_saved_meals` | Saved recipes (full `ClientRecipeResponse` objects) | **High** — large JSON, parsed on every count/check |
| `firehall_recipe_cache` | Generator cache (up to 50 recipes) | **High** — `loadDisk()` on cache miss path |
| `firehall_hall_history_v1` | Up to 80 entries | Medium — read on every history hook bump |
| `firehall_filters` | Generator filters | Medium — write on every change |
| `firehall_hall_favorites_v1` | Favorites snapshot | Medium — sync merges full snapshot |
| `fh_visitor_id` | Analytics | Low |
| `fh_active_hall_id` | Hall selection | Low |

### Cloud sync amplification

```196:211:client/src/lib/sync/coordinator.ts
    const localRows = collectLocalSnapshots();
    const remoteRows = await pullRemoteSnapshots();
    const merged = mergeSnapshots(localRows, remoteRows);
    applyMergedToLocal(merged);
    await pushSnapshots(merged);
    ...
    await syncSavedRecipes();
```

- Triggers: sign-in, **every domain change event**, 5-minute background interval, `beforeunload`.
- Each run: read 4 snapshots + full saved meals, merge, push, then PUT all saves with `replace: true`.

### Recommendations

| Tier | Action |
|------|--------|
| **Quick** | Debounce filter + history writes to localStorage (100–300ms) |
| **Quick** | `recipe-cache`: keep disk cache in module memory; flush async |
| **Quick** | Saved meals: store count denormalized; avoid `getSavedMeals()` in render |
| **Medium** | Sync only dirty domains (per `data_key` timestamp vs last push) |
| **Medium** | Increase background sync interval to 15 min; skip if tab hidden |
| **Large** | IndexedDB for saved meals + recipe cache (async, larger quota) |

---

## 9. SQLite queries

### What’s working

- Indexes: `analytics_events` (type, time, visitor, route), `protein_deals(hall_id, fetched_at)`, `hall_activity_events(hall_id, ...)`.
- Analytics inserts use **transactions** batching up to 25 rows.
- Shopping list / canteen / auth use prepared statements.

### Findings

| Issue | Severity | Detail |
|-------|----------|--------|
| `buildApprovedCatalog()` | **P0** | No in-memory cache — reads merged indexes from disk, maps ~337 entries **per HTTP request** |
| Count endpoint | **P1** | `/api/catalog/approved/count` calls full `buildApprovedCatalog()` just for `recipeCount` |
| `getAnalyticsDashboard` | **P1** | Many sequential COUNT/GROUP BY + `json_extract` on large `analytics_events` |
| `hall_activity` `SELECT *` | **P2** | Activity feed loads all columns — fine at hall scale, watch growth |
| Protein deals refresh | **P2** | `ensureFreshProteinDealsForHall` may DELETE + re-INSERT all deals on provider sync |
| Shopping list mutations | **P2** | Multiple `SELECT *` refreshes per item update (correctness OK, chatty) |
| Single shared DB | **P3** | `getSharedLocalDb()` — analytics + halls + deals contend on one file |

```305:314:server/approved-catalog.ts
export function buildApprovedCatalog(): ApprovedCatalogResponse {
  const allRecipes = buildAllApprovedCatalogEntries();
  const { recipes } = filterExploreEligibleCatalogEntries(allRecipes);
  return { ... };
}
```

### Recommendations

| Tier | Action |
|------|--------|
| **Quick** | Module-level catalog cache with `assetRevision` / file mtime invalidation |
| **Quick** | Count endpoint: read `recipeCount` from cache or precomputed manifest |
| **Medium** | Prebuild `approved-catalog.json` at `npm run build` — API serves static file |
| **Medium** | Analytics dashboard: materialized daily rollups table |
| **Large** | Read replica or separate DB file for analytics writes vs hall operational data |

---

## Recommendations summary

### Quick wins (1–3 days)

| # | Win | Area | Impact |
|---|-----|------|--------|
| Q1 | Lazy-load **Generator** route | Bundle | −200–350 KB first paint on `/` |
| Q2 | Lazy-load vote modals (defer Framer) | Bundle | Motion chunk deferred |
| Q3 | **In-memory cache** for `buildApprovedCatalog()` | SQLite/CPU | −50–200ms per catalog API hit |
| Q4 | Fix **duplicate hall detail** fetch | Network | −1 API call on `/halls/:id` |
| Q5 | React Query for **protein deals** (card + page) | Network | −1 duplicate on `/hall` |
| Q6 | Unify **golden catalog** query key | Network | Cache hit across Home → Generator |
| Q7 | Debounce **localStorage** filter/history writes | Main thread | Smoother Generator typing |
| Q8 | Cached **saved meal count** | Rerender | Explore header stops parsing JSON |
| Q9 | Analytics flush **2–3s** debounce | Network | Fewer `/api/analytics/events` posts |

### Medium wins (1–2 sprints)

| # | Win | Area | Impact |
|---|-----|------|--------|
| M1 | Lazy-load **Home** sections (featured meals, social proof) | Bundle | Lighter homepage |
| M2 | **Virtualized** Explore grid | Runtime | Smooth scroll at 300+ recipes |
| M3 | Hall detail via **React Query** in membership context | Network + rerender | Shared cache, staleTime |
| M4 | **Dirty-domain** cloud sync (push only changed keys) | localStorage + network | Smaller sync payloads |
| M5 | **Prebuilt catalog JSON** at build time | Server | Near-zero catalog CPU |
| M6 | Analytics **rollup tables** + 90-day retention | SQLite | Faster admin dashboard |
| M7 | Scope **hall providers** to hall routes | Rerender | Guest paths skip hall fetch |
| M8 | WebP + **width buckets** for catalog thumbs | Images | −30–50% image bytes |

### Large wins (quarter / architecture)

| # | Win | Area | Impact |
|---|-----|------|--------|
| L1 | **Navigation v3** shell — tab-scoped bundles + prefetch | Bundle + UX | Consumer path under 400 KB gzip |
| L2 | **Static catalog CDN** (grid JSON + thumbs by revision) | Server + edge | Explore TTI independent of Node |
| L3 | **IndexedDB** migration for saves + generator cache | localStorage | Removes main-thread JSON blocking |
| L4 | **Image CDN** with on-the-fly resize | Images | Recipe LCP at scale |
| L5 | **Analytics pipeline** off request path (worker/queue) | SQLite | API p99 stable under traffic |
| L6 | Server-side **catalog search/filter** API | Runtime | Client memory flat as catalog grows past 500 |

---

## Prioritized sprint order

```
Week 1 — Perceived speed
  Q1 Q2 Q3 Q7 Q8          → smaller first paint, faster Generator
  Q4 Q5 Q6                → fewer duplicate API calls

Week 2 — Explore + hall
  M2 M8                   → Explore scroll + images
  M3 M4                   → authenticated session leaner

Week 3 — Observability
  Q9 M6                   → analytics overhead contained
  Add RUM: LCP, INP, JS heap on Explore (firehall_perf flag exists)

Backlog — architecture
  L1 L2 L5                → align with navigation v3 + scale
```

---

## Metrics to track

| Metric | Target | How |
|--------|--------|-----|
| Main chunk gzip | **< 250 KB** | `npm run build` |
| LCP (homepage, 4G) | **< 2.5s** | Lighthouse mobile / `firehall_perf` LCP log |
| LCP (Explore) | **< 3.0s** | First thumb visible |
| `/api/catalog/approved?view=grid` p95 | **< 50ms** | Server timing after catalog cache |
| Authenticated cold load API calls | **≤ 3** | auth/me + hall detail + sync (not duplicates) |
| `analytics_events` inserts/min | Flat at scale | Admin metrics |
| localStorage sync time | **< 16ms** | `performance.measure` around `collectLocalSnapshots` |

---

## What not to optimize yet

- **Admin Recharts** — already lazy; 248 KB is acceptable for internal users.
- **Cook Mode** — best-performing surface per mobile audit; leave alone.
- **PWA precache 2.9 MB** — mostly JS/CSS; excluding images was the right call.
- **Hall shopping list SQL chatter** — hall-scale data; optimize only if profiling shows user-visible lag.

---

## Cross-reference: related audit actions

| Performance item | Links to |
|------------------|----------|
| Generator sticky + FAB stack | `mobile-safari-audit-v3.md` P0 chrome |
| Hall detail vs `/hall` duplicate UX | `navigation-v3.md`, `firefighter-user-journeys.md` |
| Protein deals fetch | `protein-deals-v1.md`, `hall-pro-audit.md` |
| Catalog as single browse source | `product-audit-v3.md` navigation score |

---

*Audit complete. No code changes in this pass — implementation tracked via sprint items above.*
