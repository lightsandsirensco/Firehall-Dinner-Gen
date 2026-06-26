# Dead Code Audit — Staff Engineer Review

**Date:** June 22, 2026  
**Lens:** Staff engineer · maintainability · bundle hygiene · honest inventory  
**Goal:** Reduce complexity so the app is easier to maintain — fewer paths, fewer lies in types, fewer scripts nobody runs  
**Codebase scale:** ~44,500 client LOC · ~42,800 server LOC · 186 npm scripts · 54 routed pages

**Companion:** `stop-building.md`, `performance-audit-v3.md`, `screen-map-v3.md`, `product-audit-v3.md`

---

## Executive summary

Firehall Meals carries **three generations of product** in one tree:

1. **Current** — `explore-catalog-browser`, `hall-dashboard/v2`, `catalog-recipe-page` → `golden-recipe-page`, protein deals  
2. **Legacy** — old explore rails, pizza-card generator UI, hall dashboard v1, `/explore/recipe/:id` Spoonacular detail stack  
3. **Abandoned** — Replit chat/image/audio integrations, ghost billing SKUs, duplicate sync modules

**Good news:** Most orphan React components are **already tree-shaken** from the production bundle (zero imports). Deleting them improves **maintainability**, not necessarily first-load JS.

**Bad news:** Duplicate **live** architecture (two recipe detail stacks, three catalog fetchers, double cloud sync on sign-in, duplicate hall API calls on dashboard) still costs **runtime, bundle, and engineer time**.

| Category | Est. lines removable | Bundle impact | Maintenance impact |
|----------|---------------------:|---------------|-------------------|
| **Phase 1 — safe delete** (orphans, dead pages, Replit) | **~4,600** | ~0 KB (already unimported) | High |
| **Phase 2 — consolidate live dupes** | **~1,200** net | **~25–45 KB gzip** | Very high |
| **Phase 3 — optional shadcn prune** | **~3,000** | **~15–30 KB gzip** | Medium |
| **Phase 4 — scripts & billing honesty** | N/A (config/types) | 0 | Very high |
| **Total potential** | **~8,800 lines** | **~40–75 KB gzip** | Fewer files to grep, review, break |

---

## Methodology

1. Cross-reference `App.tsx` routes vs `client/src/pages/*`  
2. Ripgrep import graph for components, hooks, lib modules  
3. Server mount trace from `server/index.ts` → `registerRoutes`  
4. Billing feature matrix vs `PaywallGate` / API enforcement  
5. `package.json` scripts vs `npm run check` chain and CI workflows  
6. Production build chunk sizes (June 2026 baseline: **1,270 KB** main chunk, **356 KB** gzip)

---

## 1. Unused routes & dead pages

### Routed and live (52 page modules)

All imports in `client/src/App.tsx` resolve. No completely missing page files for active routes.

### Dead page files (not in router, not imported)

| File | Lines | Replaced by |
|------|------:|-------------|
| `client/src/pages/recipes-index.tsx` | 225 | `explore-browse-redirect.tsx` (`/recipes` → `/explore`) |
| `client/src/pages/performance-fuel-hub.tsx` | 116 | `performance-fuel-redirect.tsx` |
| `client/src/pages/performance-fuel-recipe-page.tsx` | 203 | Redirect to `/recipes/:slug` |
| `client/src/pages/firehall-category-page.tsx` | 114 | `firehall-category-redirect.tsx` |

**Subtotal: ~658 lines — delete immediately.**

### Live but legacy (consolidate, don’t just delete)

| Route | File | Lines | Issue |
|-------|------|------:|-------|
| `/explore/recipe/:id` | `explore-recipe-detail-page.tsx` | **719** | Parallel recipe stack to `golden-recipe-page.tsx` (582 lines via `/recipes/:slug`). Uses Spoonacular `/api/explore/recipe/:id`. |
| `/recipes/:slug` | `catalog-recipe-page.tsx` → `golden-recipe-page.tsx` | 582 | **Canonical** curated recipe surface |

**Recommendation:** 301 all `/explore/recipe/:id` to `/recipes/:slug` where mappable; delete `explore-recipe-detail-page.tsx` + slim `explore-api.ts` after redirect window.

### Redirect-only pages (keep, ~35 lines total)

`explore-browse-redirect.tsx`, `performance-fuel-redirect.tsx`, `firehall-category-redirect.tsx` — intentional, minimal.

---

## 2. Unused components

### Orphan feature components (import count = 0)

Verified not imported from any live app code:

#### Old Explore rail cluster (~1,100 lines)

| File | Lines |
|------|------:|
| `components/explore-discovery-section.tsx` | 122 |
| `components/explore-cinematic-card.tsx` | 162 |
| `components/explore-editorial-section.tsx` | 68 |
| `components/explore-recipe-card.tsx` | 37 |
| `components/explore-grid-card.tsx` | 126 |
| `components/explore-rail-header.tsx` | 35 |
| `components/explore-recommendation-hero.tsx` | 46 |
| `components/explore-spotlight-card.tsx` | 76 |
| `components/explore-category-nav.tsx` | 58 |
| `lib/explore-recommendation-ux.ts` | 373 |

**Live replacement:** `components/explore-catalog-browser.tsx`

#### Old Pizza generator UI (~1,075 lines)

| File | Lines |
|------|------:|
| `components/pizza-card.tsx` | 562 |
| `components/pizza-filter-panel.tsx` | 435 |
| `components/pizza-hero.tsx` | 78 |

**Live replacement:** `components/pizza-night-catalog.tsx` on `/pizza`

#### Old Generator wheel hub (~279 lines)

| File | Lines |
|------|------:|
| `components/generator/generator-wheel-hub.tsx` | 196 |
| `components/generator/dinner-wheel-reveal.tsx` | 83 |

**Live replacement:** `pages/classics-wheel.tsx` at `/wheel`

#### Hall dashboard v1 (~233 lines)

| File | Lines |
|------|------:|
| `components/hall-dashboard/hall-dashboard-stat-cards.tsx` | 101 |
| `components/hall-dashboard/hall-dashboard-profile-strip.tsx` | 71 |
| `components/hall-dashboard/hall-dashboard-generated-meals.tsx` | 61 |

**Live replacement:** `components/hall-dashboard/v2/*`

#### Other orphans (~350 lines)

| File | Lines | Notes |
|------|------:|-------|
| `components/hall-membership/hall-platform-banner.tsx` | 132 | v1 promo never mounted |
| `components/hall-dashboard/v2/hall-analytics-card.tsx` | 36 | Built, **not imported** in `hall-dashboard-v2.tsx` |
| `components/tonight-hero.tsx` | 54 | |
| `components/home/home-cta-band.tsx` | 34 | |
| `components/seo/json-ld.tsx` | 9 | SEO uses `usePageSeo` instead |
| `components/mobile/mobile-header.tsx` | 5 | Re-export alias |
| `lib/grocery-deals/api.ts` | 12 | Re-export barrel of `protein-deals/api` only |

**Orphan feature component subtotal: ~3,050 lines**

### Unused shadcn UI primitives (~3,000 lines)

Never imported outside `components/ui/` (boilerplate from scaffold):

| Largest | Lines |
|---------|------:|
| `ui/sidebar.tsx` | 673 |
| `ui/menubar.tsx` | 237 |
| `ui/carousel.tsx` | 231 |
| `ui/command.tsx` | 135 |
| + 22 more (`drawer`, `table`, `calendar`, `form`, `tabs`, etc.) | ~1,700 |

`ui/slider.tsx` only imported by orphan `pizza-filter-panel.tsx`.

**Optional Phase 3:** Remove unused primitives; keep only what app imports. Regenerate from shadcn if needed later.

---

## 3. Duplicate hooks

Not dead — **overlapping live hooks** that cause double work:

| Duplication | Files | Runtime cost |
|-------------|-------|--------------|
| **Activity feed fetch** | `use-hall-activity-feed.ts` + `use-hall-leaderboard.ts` | 2× `GET /activity-feed` on hall dashboard |
| **Streak computation** | `use-hall-dashboard.ts` + `use-hall-streaks.ts` | 2× `buildHallStreaksSnapshot()` on `/hall` |
| **Hall name / shift resolution** | dashboard, activity, leaderboard, shift-dashboard hooks | Copy-pasted fallback chains |
| **Hall detail fetch** | `HallMembershipProvider` + `hall-detail-page.tsx` + `use-shift-dashboard.ts` + activation funnel | Redundant API calls |
| **Hall vs shift dashboard** | `use-hall-dashboard.ts` + `use-shift-dashboard.ts` | Parallel aggregators |
| **Shift reminder settings** | `useShiftReminderSettingsFromPreferences` + `useSyncedShiftReminderSettings` in same file | Near-identical mapping |
| **Billing** | `useBilling()` → thin alias over `useAuth().billing` | Harmless indirection |

### Hooks scattered outside `hooks/`

| Location | Exports |
|----------|---------|
| `lib/auth/context.tsx` | `useAuth` |
| `lib/hall-membership/context.tsx` | `useHallMembership` |
| `lib/billing/hooks.ts` | `useBilling`, `useHallFeature` |
| `lib/hall-feedback/context.tsx` | `useHallFeedback` |
| `lib/seo/use-*.ts` | SEO hooks |
| `lib/recipe-hero.ts` | `useMealHeroPoll`, `usePizzaHeroPoll` |

**Recommendation:** Extract `useHallIdentity()` (name, shift, crew) and `useHallActivityQuery()` shared React Query key — don’t delete leaf hooks until dashboard uses composites only.

---

## 4. Duplicate providers

### `App.tsx` provider stack

```
ErrorBoundary
  QueryClientProvider
    MeasurementSystemProvider
      AuthProvider
        CloudSyncProvider
          HallMembershipProvider
            HallFeedbackProvider
              TooltipProvider
```

### Overlapping / duplicate behavior

| Issue | Locations | Fix |
|-------|-----------|-----|
| **Double sign-in sync** | `auth/context.tsx` `afterSignIn` + `sync/provider.tsx` initial mount | One owner: `CloudSyncProvider` only |
| **Double background sync schedule** | `auth/context.tsx` (800ms) + `sync/provider.tsx` (5 min + change events) | Single scheduler in coordinator |
| **Triple hall identity** | `AuthProvider.halls` + `HallMembershipProvider.detail` + `hall-profile-store` | Document precedence; merge reads |
| **Nested TooltipProvider** | App root + `ui/sidebar.tsx` (orphan) | N/A until sidebar deleted |

**Not duplicate:** `MeasurementSystemProvider` and `HallFeedbackProvider` are scoped correctly — keep.

---

## 5. Duplicate analytics events

### Registry size

`shared/analytics/events.ts` — **104 event types** in `ANALYTICS_EVENT_TYPES`.

### Deprecated aliases still fired

| Deprecated | Replacement | Still emitted from |
|------------|-------------|-------------------|
| `hall_vote_create` | `hall_vote_started` | `analytics.ts` `trackHallVoteStarted` |
| `hall_vote_share` | `hall_vote_shared` | `trackHallVoteShared` (fires **both**) |
| `hall_vote_cast` | `hall_vote_submitted` | `trackHallVoteSubmitted` (fires **both**) |

**Effect:** One user action → 2–3 SQLite rows. Growth dashboard queries union old + new names (`server/growth-dashboard/store.ts`).

### Dual-write pattern (by design, costly)

`client/src/lib/analytics.ts` (~809 lines) — most actions call:

1. `trackEvent()` → GA4 `gtag`  
2. `trackProductEvent()` → internal SQLite queue  

Not dead code, but **duplicate instrumentation**. ~50% of analytics LOC is paired wrappers.

### Orphan / unregistered event types

`generator.tsx` fires `trackEvent("email_capture_prompt_shown", ...)` — **not in** `ANALYTICS_EVENT_TYPES` (validation may skip or fail silently).

**Recommendation:**

- Stop emitting deprecated vote events; migrate dashboard SQL  
- Collapse GA + product into one helper with `dest: 'ga' | 'product' | 'both'`  
- Run `scripts/validate-analytics.ts` against all `trackEvent` strings

---

## 6. Orphan utilities & API modules

### Client — zero importers

| File | Lines | Notes |
|------|------:|-------|
| `lib/auth/sync-saves.ts` | 37 | Duplicates `sync/coordinator.ts` `syncSavedRecipes()` — **never imported** |
| `lib/explore-sections-api.ts` | 56 | `fetchExploreSections` — **never imported** |
| `lib/grocery-deals/api.ts` | 12 | Re-export only |

### Client — duplicate catalog loaders (all live, consolidate)

| Module | Endpoint | Used by |
|--------|----------|---------|
| `approved-catalog-api.ts` | `/api/catalog/approved` | Explore grid, SEO counts |
| `golden-recipe-api.ts` | `/api/catalog/golden-100` | Home featured, recipe pages |
| `fuel-recipe-api.ts` | `/api/catalog/performance-meals` | Breakfast/performance indexes |

`fetchCuratedRecipeTotal()` in golden API is an alias to `fetchApprovedCatalogTotal()`.

### Server — unmounted / stub

| Path | Lines | Status |
|------|------:|--------|
| `server/replit_integrations/**` | **~784** | Chat, image, audio routes — **never registered** |
| `server/explore-catalog-browse.ts` | 4 | `@deprecated` re-export shim, zero importers |
| `server/storage.ts` | 1 | `export {}` stub |
| `server/generation-curation-hero.ts` | small | Dead export chain |

### Server — live but legacy

| Module | Notes |
|--------|-------|
| `server/spoonacular.ts` | Still used for explore recipe detail + ingestion — legacy, not orphan |
| `POST /api/generate-pizza` | Parallel to `/api/generate` — consolidate when pizza nav demoted |

---

## 7. Stale feature flags

### Ghost Hall Pro features (in types, not in product)

From `shared/billing/types.ts` — in `HALL_PRO_FEATURES` and `PLAN_BASE_FEATURES.hall_pro`:

| Feature | UI | API | Product |
|---------|----|-----|---------|
| `meal_calendar` | Plans page label only | None | **Ghost** |
| `hall_badges` | Plans + admin panel list | None | **Ghost** |
| `shift_reports` | Plans + admin panel list | None | **Ghost** |
| `family_profiles` | Plans page label only | None | **Ghost** — no implementation found |

### Mislabeled features (implemented, wrong marketing)

| Feature | Claim | Reality |
|---------|-------|---------|
| `shared_favorites` | Hall-shared | Per-user cloud sync of local favorites |
| `hall_history` | Hall-shared | Per-user cloud sync of local history |

### Features with UI gate but no server gate

| Feature | `PaywallGate` | Server `userHasFeature` |
|---------|---------------|-------------------------|
| `shared_shopping_lists` | Yes | **No** |
| `hall_supplies` | Yes | **No** |
| `hall_analytics` | Yes | Yes |
| `protein_deals` | Yes | Yes |

**Recommendation:** Remove ghost keys from `BILLING_FEATURES` / `HALL_PRO_FEATURES` until built. Add server gates or remove UI gates for shopping/supplies.

### Stale `@deprecated` markers (40+ in repo)

Notable: `shared/generate-request-defaults.ts`, `client/src/lib/explore-navigation.ts` (prefer `/recipes/:slug`), `shared/grocery-deals/types.ts` (shim re-exports).

---

## 8. Abandoned billing logic

| Area | State |
|------|-------|
| `payments_enabled: false` | Checkout is pretend |
| `PLAN_BASE_FEATURES.personal` | Auto-granted free on sign-in — not a real SKU |
| `HallProAdminPanel` | Lists ghost features captains can’t use |
| `scripts/test-hall-pro-billing.ts` | Asserts ghost flags exist |
| `useHallFeature()` / `PaywallGate` | Cosmetic on supplies/shopping |

**Not abandoned (keep):** `hall_subscriptions` table, trial/convert DB flow, `userHasFeature` for analytics + protein deals — wire Stripe here, don’t rewrite.

---

## 9. Unused npm scripts

| Metric | Count |
|--------|------:|
| Total `package.json` scripts | **186** |
| Steps in `npm run check` | **61** (`tsc` + 60 tsx scripts) |
| Named `audit:*` scripts | **69** |
| In CI workflows | **~3** (ingest, security audit, sync mirror) |
| **`npm run check` in CI** | **No** |

### Broken scripts (reference missing files)

| Script | Missing file |
|--------|--------------|
| `audit:expansion-catalog` | `scripts/audit-expansion-catalog.ts` |
| `expansion:generate-imagery` | `scripts/generate-expansion-imagery.ts` |

### Orphan script categories (~126 entries)

Manual-only — never in `check` or CI:

- Most `audit:*`, `fix:*`, `imagery:*`, `remediate:*`, `catalog:*`, `seed:*`
- Duplicate aliases pointing at same script as `check` already runs

**Recommendation:**

1. Delete 2 broken script entries  
2. Move `audit:*` to `scripts/audits/README.md` with explicit weekly run list  
3. Split `check` into `check:ci` (15 scripts) vs `check:full` (current 61)  
4. Add `check:ci` to GitHub Actions  

---

## 10. Abandoned architecture map

```
                    ┌─────────────────────────────────────┐
                    │         ABANDONED (delete)          │
                    │  replit_integrations, dead pages,   │
                    │  explore rails, pizza-card, v1 hall │
                    └─────────────────────────────────────┘
                                      │
    ┌─────────────────────────────────┼─────────────────────────────────┐
    │                                 │                                 │
    ▼                                 ▼                                 ▼
┌──────────────┐              ┌──────────────┐              ┌──────────────┐
│ LEGACY LIVE  │              │   CURRENT    │              │   GHOST      │
│ explore/     │   migrate    │ /recipes/    │              │ billing      │
│ recipe/:id   │ ──────────►  │ :slug        │              │ flags        │
│ spoonacular  │              │ golden page  │              │ meal_calendar│
└──────────────┘              └──────────────┘              └──────────────┘
        │                            │
        │                            │
        ▼                            ▼
┌──────────────┐              ┌──────────────┐
│ 3 catalog    │   merge      │ approved     │
│ API clients  │ ──────────►  │ catalog API  │
└──────────────┘              └──────────────┘
```

---

## Removal plan & estimates

### Phase 1 — Safe delete (1–2 days, low risk)

**Delete:**

- 4 dead pages (~658 lines)  
- `server/replit_integrations/` (~784 lines)  
- Orphan explore cluster + `explore-recommendation-ux.ts` (~1,473 lines)  
- Orphan pizza + generator wheel hub (~1,354 lines)  
- Hall dashboard v1 + misc orphans (~583 lines)  
- `lib/auth/sync-saves.ts`, `lib/explore-sections-api.ts`, `lib/grocery-deals/api.ts` (~105 lines)  
- `server/explore-catalog-browse.ts`, `server/storage.ts` (~5 lines)  

| Metric | Estimate |
|--------|----------|
| **Lines removed** | **~4,600** |
| **Bundle reduction** | **~0 KB** (tree-shaken already) |
| **Files removed** | **~35** |
| **Maintenance** | −35 files in grep/review; faster onboarding |

**PR checklist:** `tsc`, spot-check `/explore`, `/pizza`, `/hall`, `/generator`.

---

### Phase 2 — Consolidate live duplicates (1–2 weeks)

| Action | Lines net | Bundle |
|--------|----------:|--------|
| Redirect `/explore/recipe/:id` → `/recipes/:slug`; remove `explore-recipe-detail-page.tsx` | −~650 | −~12–18 KB gzip |
| Merge activity + leaderboard fetch (shared React Query) | −~80 dup logic | Fewer API calls |
| Single sign-in sync path | −~30 | — |
| Lazy-load `AdminGolden100Page` (eager in `App.tsx` today) | 0 lines | **−~30–50 KB gzip** |
| Mount or delete `HallAnalyticsCard` | 0 or −36 | — |
| Unify catalog fetch behind `approved-catalog-api` | −~150 | −~5–10 KB gzip |

| Metric | Estimate |
|--------|----------|
| **Lines removed** | **~900–1,200** net |
| **Bundle reduction** | **~25–45 KB gzip** |
| **Maintenance** | One recipe stack; one catalog client; one sync entry |

---

### Phase 3 — Optional shadcn prune (2–3 days)

Remove ~25 unused `components/ui/*` files (~3,000 lines).

| Metric | Estimate |
|--------|----------|
| **Bundle reduction** | **~15–30 KB gzip** (if any barrel re-export pulled them in) |
| **Risk** | Low if grep confirms zero imports |

---

### Phase 4 — Scripts & billing honesty (2–3 days)

- Remove 2 broken npm scripts  
- Remove 3 ghost + 1 unused features from `shared/billing/types.ts`  
- Trim `plan-card.tsx` marketing labels  
- Stop dual-emitting deprecated vote analytics events  
- Document 15-script `check:ci` subset  

| Metric | Estimate |
|--------|----------|
| **Maintenance** | −126 confusing script names; honest Pro surface; cleaner analytics DB |

---

## Total impact summary

| | Lines | Bundle (gzip) | Maintenance |
|--|------:|--------------:|-------------|
| Phase 1 | ~4,600 | ~0 | ★★★★★ |
| Phase 2 | ~1,200 | ~25–45 KB | ★★★★★ |
| Phase 3 | ~3,000 | ~15–30 KB | ★★★☆☆ |
| Phase 4 | — | 0 | ★★★★☆ |
| **All phases** | **~8,800** | **~40–75 KB** | **~35 fewer files; 1 recipe path; 1 catalog API; honest billing** |

**Ongoing maintenance reduction (qualitative):**

- New engineers face **one** browse path and **one** recipe page stack  
- Code search for “explore” returns **half** the noise  
- `npm run check` can drop from 61 → 15 steps in CI (faster PRs)  
- Billing types match shipped product — no ghost SKUs in tests  
- Analytics DB stops storing 2–3 rows per vote action  

---

## Do not delete (common false positives)

| Item | Why keep |
|------|----------|
| `golden-recipe-page.tsx` | Live via `catalog-recipe-page.tsx` |
| `explore-discovery-page.tsx` | Live via `explore.tsx` |
| `explore-catalog-browser.tsx` | Canonical browse UI |
| `hall-dashboard/v2/*` | Production hall home |
| `server/spoonacular.ts` | Still powers explore detail until Phase 2 migration |
| `scripts/test-*.ts` in `check` | Regression net — trim, don’t zero |
| Admin routes | Internal ops — hide from app nav, don’t delete |

---

## Suggested PR sequence

```
PR1  chore: delete dead pages + replit integrations + orphan explore/pizza cluster
PR2  chore: delete hall v1 components + orphan lib files
PR3  refactor: shared useHallActivityQuery + fix double sign-in sync
PR4  refactor: explore/recipe/:id → /recipes/:slug redirect + delete detail page
PR5  chore: lazy admin golden-100 + billing type cleanup
PR6  chore: npm scripts — remove broken, add check:ci
PR7  optional: prune unused shadcn ui primitives
```

---

## Verification commands

```bash
# After Phase 1 — must pass
npm run check

# Confirm no orphan imports
npx tsc --noEmit

# Bundle before/after Phase 2+3
npm run build
# Compare dist/public/assets/index-*.js gzip size

# Find new orphans
# rg "from \"@/components/" client/src --glob "!**/ui/**" | ...
```

---

*Audit reflects codebase as of June 22, 2026. Re-run after navigation v3 or catalog consolidation merges.*
