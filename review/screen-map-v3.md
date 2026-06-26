# Screen Map v3 — Complete Route Inventory

**Date:** June 22, 2026  
**Source of truth:** `client/src/App.tsx` + page components + in-app link graph  
**Purpose:** Every route classified, every duplicate named, every orphan flagged — input to Discover · Tonight · Hall · Me redesign.

---

## Legend

| Status | Meaning |
|--------|---------|
| **Live** | Routed, renders content |
| **Redirect** | Routed, immediately forwards elsewhere |
| **SEO** | Live for crawlers/ads; demoted from app nav in v3 |
| **Orphan** | Live but no primary nav link; discoverable only via deep link or buried CTA |
| **Dead code** | Page file exists, not mounted in router |
| **System** | Share links, admin, errors — outside tab IA |

| Zone (v3) | Role |
|-----------|------|
| **Discover** | Browse catalog, guides, collections |
| **Tonight** | Decide + cook tonight (generator, wheel, vote, recipe cook mode) |
| **Hall** | Crew ops (dashboard, shift, canteen, shopping, deals) |
| **Me** | Account, profile, plans, personal history |
| **Marketing** | Homepage, about, hall-program, SEO landings |
| **Admin** | Internal ops |
| **System** | Vote share, join deep links, 404 |

---

## Route inventory (70+ paths)

### Marketing & homepage

| Route | Component | Zone today | v3 zone | Status | In nav? | Notes |
|-------|-----------|------------|---------|--------|---------|-------|
| `/` | `home.tsx` | Marketing | **Tonight** (logged-in default) / Marketing (guest) | Live | Header "Home" | 10+ sections; 5+ "Find a Meal" CTAs; SEO blocks desktop-only |
| `/about` | `about.tsx` | Marketing | Me → About (footer) | Live | Footer only | |
| `/faq` | `faq.tsx` | Marketing | Me → Help | Live | Homepage accordion | Duplicates homepage FAQ |
| `/hall-program` | `hall-program-page.tsx` | Marketing | Hall → Onboarding promo | Live | Orphan | Captain acquisition; guest CTA doesn't preserve `create_hall` |

### Tonight — decision surfaces

| Route | Component | Zone today | v3 zone | Status | In nav? | Notes |
|-------|-----------|------------|---------|--------|---------|-------|
| `/generator` | `generator.tsx` | Tonight | **Tonight** (home tab) | Live | Header + CTA + everywhere | Primary product surface |
| `/wheel` | `classics-wheel.tsx` | Tonight | **Tonight** | Live | Header | Best app-feel surface |
| `/classics-wheel` | — | Tonight | Tonight | Redirect → `/wheel` | — | Legacy |
| `/pizza` | `pizza-night.tsx` | Tonight | Discover → collection | Live | Header | Niche night; shouldn't be top-level nav |
| `/vote/:voteId` | `vote.tsx` | Tonight | **Tonight** (modal/sheet) | Live | Orphan | No site header; share-only entry |
| `/package/:slug` | `curated-package.tsx` | Tonight | Discover → package | Live | Orphan | Wheel classic packages |

### Discover — browse & recipes

| Route | Component | Zone today | v3 zone | Status | In nav? | Notes |
|-------|-----------|------------|---------|--------|---------|-------|
| `/explore` | `explore.tsx` → `explore-discovery-page` | Discover | **Discover** (home tab) | Live | Header | Canonical browse; filters before food on mobile |
| `/explore/recipe/:id` | `explore-recipe-detail-page` | Discover | Discover | Live | Orphan | Legacy ID route; may redirect to `/recipes/:slug` |
| `/recipes` | `explore-browse-redirect` | Discover | Discover | Redirect → `/explore` | Footer ×2 | Duplicate footer links both hit explore |
| `/recipes/:slug` | `catalog-recipe-page` → `golden-recipe-page` / smoothie | Discover | **Tonight** (cook) | Live | Orphan | SEO canonical recipe; Cook Mode not default |
| `/categories/:categoryId` | `firehall-category-redirect` | Discover | Discover | Redirect → `/explore?…` or `/breakfast` | Orphan | SEO legacy hubs |
| `/top-rated-recipes` | `top-rated-recipes-page.tsx` | Discover | Discover → collection | Live | Orphan | Linked from explore rails only |
| `/hall-of-fame` | `hall-of-fame-page.tsx` | Discover | Discover → collection | Live | Orphan | Crew-rated collection |
| `/smoothies` | `smoothies-index.tsx` | Discover | Discover → collection | Live | Orphan | Also reachable via `?primary=smoothies` |
| `/smoothies/:slug` | `smoothie-recipe-page.tsx` | Discover | Tonight (cook) | Live | Orphan | Also under `/recipes/:slug` router |
| `/breakfast` | `breakfast-index.tsx` | Discover | Discover → collection | Live | Orphan | Category redirect for `breakfast` |
| `/breakfast/:slug` | `breakfast-recipe-page.tsx` | Discover | Tonight (cook) | Live | Orphan | |
| `/breakfast/performance` | `breakfast-performance-index.tsx` | Discover | Discover → collection | Live | Orphan | Overlaps breakfast index |
| `/breakfast/performance/:slug` | `breakfast-recipe-page.tsx` | Discover | Tonight (cook) | Live | Orphan | |
| `/performance-fuel/:slug?` | `performance-fuel-redirect` | Discover | — | Redirect → `/recipes/:slug` or `/explore` | — | Legacy |
| `/families` | `families-index.tsx` | Discover | Discover → collection | Live | Orphan | Thin landing; links to explore |

### SEO landing pages (8+)

| Route | Component | v3 zone | Status | In nav? |
|-------|-----------|---------|--------|---------|
| `/firefighter-meals` | `seo-landing-page` | Marketing (SEO) | Live | Homepage intro links |
| `/firefighter-recipes` |同上 | Marketing (SEO) | Live | Homepage |
| `/firehouse-recipes` |同上 | Marketing (SEO) | Live | — |
| `/fire-station-meals` |同上 | Marketing (SEO) | Live | — |
| `/healthy-firefighter-meals` |同上 | Marketing (SEO) | Live | — |
| `/firefighter-breakfast-recipes` |同上 | Marketing (SEO) | Live | — |
| `/firefighter-bbq-recipes` |同上 | Marketing (SEO) | Live | — |
| `/firefighter-red-lead-recipe` | `firefighter-red-lead-recipe-page` | Marketing (SEO) | Live | Sitemap priority 0.9 |

**v3 treatment:** Keep URLs; remove from in-app nav. Entry = search/ads only. In-app browse = `/discover` only.

### Guides / editorial

| Route | Component | v3 zone | Status | In nav? | Notes |
|-------|-----------|---------|--------|---------|-------|
| `/guides` | `guides-index.tsx` | Discover | Live | Header "Hall Ideas" | |
| `/guides/topic/:clusterId` | `guides-cluster.tsx` | Discover | Live | Orphan | |
| `/guides/:slug` | `guide-article-page.tsx` | Discover | Live | Orphan | |
| `/blog/:slug` | `guide-article-page.tsx` | Discover | Live | Orphan | **Duplicate** of `/guides/:slug` |
| `/guides/top-firehall-classics` | — | — | Redirect → `/guides/10-classic-firehall-meals` | — | |
| `/blog/top-firehall-classics` | — | — | Redirect (same) | — | |

### Hall — crew operating system

| Route | Component | Zone today | v3 zone | Status | In nav? | Notes |
|-------|-----------|------------|---------|--------|---------|-------|
| `/hall` | `hall-page.tsx` → `HallDashboardV2` | Hall | **Hall** (home tab) | Live | Header heart | True crew home |
| `/hall/join` | `hall-join-page.tsx` | Hall | Hall → Join sheet | Live | Buried links | Post-join → `/halls/:id` (wrong) |
| `/hall/canteen` | `hall-canteen-page.tsx` | Hall | **Hall** → Supplies | Live | Shortages card | Report flow on shift page only |
| `/hall/protein-deals` | `hall-protein-deals-page.tsx` | Hall | Hall → Deals | Live | Dashboard card | Hall Pro gated |
| `/hall/protein-deals/setup` | `hall-deals-setup-page.tsx` | Hall | Hall → Deals setup | Live | Orphan | |
| `/hall/deals` | — | Hall | Hall | Redirect → protein-deals | — | Legacy |
| `/hall/deals/setup` | — | Hall | Hall | Redirect | — | Legacy |
| `/hall/activity` | `hall-activity-page.tsx` | Hall | Hall → Activity | Live | Dashboard teaser | Full-page orphan |
| `/hall/leaderboard` | `hall-leaderboard-page.tsx` | Hall | Hall → Leaderboard | Live | Dashboard teaser | Full-page orphan |
| `/hall/:hallId/shift/:shiftId` | `hall-shift-page.tsx` | Hall | **Hall** → Shift | Live | Dashboard header | Ops hub; report canteen here |
| `/halls/:hallId` | `hall-detail-page.tsx` | Hall | Hall → **Settings** | Live | Header "Hall settings" | **Not crew home** — admin wall |
| `/halls/:hallId#hall-shared-shopping-list` | hash on detail | Hall | Hall → **Shopping** | Live | Dashboard tile | **Not a route** — scroll anchor |

### Me — personal & account

| Route | Component | Zone today | v3 zone | Status | In nav? | Notes |
|-------|-----------|------------|---------|--------|---------|-------|
| `/account` | `account-page.tsx` | Me | **Me** (home tab) | Live | Header user | Also create/join hall |
| `/plans` | `plans-page.tsx` | Me | Me → Plans | Live | Account footer | Personal vs Hall Pro confusion |
| `/favorites` | `favorites.tsx` | Me | Hall → Favorites (or Me) | Live | Orphan | Linked from hall dashboard only |
| `/hall-history` | `hall-history-page.tsx` | Me | Me → History (local) | Live | Orphan | Device-local; overlaps hall dashboard timeline |

### Admin (11 routes)

| Route | Component | Status |
|-------|-----------|--------|
| `/admin` | `admin.tsx` | Live |
| `/admin/golden-100` | `admin-golden-100.tsx` | Live |
| `/admin/ingestion` | `admin-ingestion.tsx` | Live |
| `/admin/recipe-ratings` | `admin-recipe-ratings.tsx` | Live |
| `/admin/analytics` | `admin-analytics.tsx` | Live |
| `/admin/growth` | `admin-growth-dashboard.tsx` | Live |
| `/admin/billing` | `admin-billing.tsx` | Live |
| `/admin/users` | `admin-users.tsx` | Live |
| `/admin/users/:userId` | `admin-user-detail.tsx` | Live |
| `/admin/leads` | `admin-leads.tsx` | Live |
| `/admin/deals` | `admin-deals.tsx` | Live |

### System

| Route | Component | Status | Notes |
|-------|-----------|--------|-------|
| `*` | `not-found.tsx` | Live | |

---

## Dead code — page files not in router

| File | Was | Action in v3 |
|------|-----|--------------|
| `recipes-index.tsx` | Standalone catalog index | **Delete** — superseded by `/explore` redirect |
| `firehall-category-page.tsx` | Category hub pages | **Delete** — superseded by explore filter redirects |
| `performance-fuel-hub.tsx` | Performance fuel landing | **Delete** — redirect chain handles |
| `performance-fuel-recipe-page.tsx` | PF recipe detail | **Delete** — `/recipes/:slug` handles |

---

## Duplicate pages

| Duplicate pair | Same job | Keep | Merge / redirect |
|----------------|----------|------|------------------|
| `/explore` vs `/recipes` | Browse catalog | `/explore` → rename `/discover` | `/recipes` stays 301 → discover |
| `/explore/recipe/:id` vs `/recipes/:slug` | Recipe detail | `/recipes/:slug` (SEO) | Legacy explore IDs 301 |
| `/guides/:slug` vs `/blog/:slug` | Guide article | `/guides/:slug` | `/blog/*` 301 |
| `/wheel` vs `/classics-wheel` | Spin wheel | `/wheel` | Redirect exists |
| `/hall/protein-deals` vs `/hall/deals` | Protein deals | protein-deals | Redirect exists |
| `/hall` vs `/halls/:hallId` | Hall home | **`/hall`** | Settings → `/hall/settings` |
| `/favorites` vs hall dashboard favorites section | Saved classics | Inline on Hall + full list | One route: `/hall/favorites` |
| `/hall-history` vs hall dashboard recent meals | Meal history | Dashboard teaser + `/me/history` | Merge local history under Me |
| `/account` create vs funnel create vs `/hall/join` | Onboarding | **Single join/create sheet** | See user-flows-v3 |
| `/plans` Hall Pro vs `/halls/:id` Hall Pro panel | Billing | **Hall settings only** for Hall Pro | Plans = personal tier only |
| Homepage vs `/faq` | FAQ content | `/me/help` or footer | Homepage FAQ = teaser only |
| `/top-rated-recipes` vs explore sort | Top rated | Discover collection filter | Optional redirect |
| `/hall-of-fame` vs explore crew-rated | Rated meals | Discover collection | Optional redirect |
| `breakfast-index` vs `breakfast-performance-index` | Breakfast browse | Single discover collection | Consolidate |
| SEO landings (×8) vs `/explore` | Keyword entry | SEO pages for ads | In-app never duplicates |

---

## Orphan routes (live, no tab/nav home)

| Route | How users find it | v3 home |
|-------|-------------------|---------|
| `/vote/:voteId` | Share link only | Tonight tab → active vote sheet |
| `/favorites` | Hall dashboard "Manage" | Hall → Favorites |
| `/hall-history` | Dashboard / generator strip | Me → History |
| `/hall/activity` | Dashboard teaser | Hall → Activity (inline or subpage) |
| `/hall/leaderboard` | Dashboard teaser | Hall → Leaderboard |
| `/hall/:id/shift/:id` | Dashboard header shift link | Hall → Shift pill |
| `/hall/protein-deals` | Dashboard card | Hall → Deals row |
| `/top-rated-recipes` | Explore rail | Discover collection |
| `/hall-of-fame` | Unknown / SEO | Discover collection |
| `/package/:slug` | Wheel / generator deep link | Tonight context |
| `/families` | Unknown | Delete or Discover footer |
| All SEO landings | Google | Out of app shell |
| `/hall-program` | Unknown marketing | Hall onboarding marketing |

---

## Confusing navigation patterns

### 1. Two hall URLs

```
/hall          → crew dashboard (right destination)
/halls/:id     → settings, billing, paywalls (admin destination)
```

Users joining land on **settings**. Dashboard links say "Hall settings" but probies think they're "in the hall."

### 2. Header overload (7 items + CTA + account + hall)

Desktop XL: Home · Find a Meal · Browse Recipes · Classics Wheel · Pizza Night · Hall Ideas · [Find a Meal CTA] · Account · My Hall

Mobile: CTA + Hall heart + hamburger with **same 7 items + CTA again**.

**Generator appears 3×** on mobile (header CTA, menu CTA, active page).

### 3. `/hall` vs `/halls` typo trap

One letter difference between **home** and **settings**. UUID in settings URL.

### 4. Shopping list is not a page

`/halls/:id#hall-shared-shopping-list` — hash scroll on admin page. Feels broken on mobile.

### 5. Favorites badge on Hall nav icon

Heart icon + count = **local hall favorites**, not "My Hall" membership. Semantic mismatch.

### 6. `SiteHeader activePage="favorites"` on history page

`/hall-history` uses favorites active state — copy-paste bug; reinforces nav confusion.

---

## Duplicate CTAs (same action, many labels)

| Action | Labels found | Locations |
|--------|--------------|-----------|
| Open generator | "Find a Meal", "Pick Tonight's Meal", "Hall Match", "Crew Meal Picker" | Header, hero, footer, hall dashboard, FAQ, guides, vote page, SEO pages |
| Open explore | "Browse Recipes", "All recipes", "View Recipes", "Explore Meals" | Header, footer ×2, guides, about, SEO |
| Open wheel | "Spin the Wheel", "Classics Wheel", "Spin again" | Header, hero, hall dashboard, package page |
| Create hall | "Set up your station", "Create hall", "Create Your Hall" | Account, dashboard, funnel, hall-program |
| Join hall | "Join hall", "Join with code", "Sign in to join" | Account, join page, dashboard, banners |
| Start vote | "Start a Hall Vote", "Let the crew vote", "Start vote" | Dashboard, generator, wheel, shift |
| Hall Pro upgrade | "View plans", "Hall settings", "Enable Hall Pro" | PaywallGate, plans, account pill |

**v3 rule:** One label per action globally. See `navigation-v3.md` copy table.

---

## Duplicate functionality

| Function | Implementations | Problem |
|----------|-----------------|---------|
| **Browse meals** | Homepage rails, `/explore`, `/recipes` redirect, category redirects, collection pages (breakfast, smoothies, top-rated, hall-of-fame), SEO landings | Five in-app paths to same catalog |
| **Recipe detail** | `/recipes/:slug`, `/explore/recipe/:id`, collection-specific paths | Multiple URL shapes per recipe |
| **Create hall** | Activation funnel (2 fields), `CreateHallForm` on account (8+ fields) | Same API, different UX, different exit URL |
| **Join hall** | `/hall/join`, account panel, funnel step 1 | Three forms; join page shows two forms when token present |
| **Shopping list** | Personal modal, hall hash panel, shift card | Three entry points, one paywalled |
| **Meal history** | Local `hall-history`, dashboard timeline, shift timeline, `RecentlyCookedStrip` | Same data, four surfaces |
| **Favorites** | Local hall favorites store, `/favorites` page, dashboard section, header badge | Local vs cloud hall favorites unclear |
| **Canteen** | `/hall/canteen` page, shift `ReportCanteenItemModal`, supplies panel on settings | Report vs manage split |
| **Billing** | `/plans` personal, `HallProAdminPanel` on settings, `PaywallGate` CTAs | Users don't know which to use |
| **Onboarding** | `HallActivationGate` funnel, account create/join, `/hall/join` | Competing modals after sign-in |
| **Cook entry** | Generator result, wheel reveal, recipe page, explore card | Cook Mode not default on any path |

---

## Components built but not on primary path

| Component | Built | Wired? | v3 |
|-----------|-------|--------|-----|
| `hall-analytics-card.tsx` | Yes | **No** on dashboard | Hall → Analytics row |
| `HallAnalyticsPanel` | Yes | Settings only + paywall | Hall tab when Pro |
| Explore mobile filter sheet | Yes | Explore only | Discover tab |
| Cook Mode | Yes | Opt-in button | Tonight default on recipe open |
| PWA install prompt | Yes | Global | Me → Install |

---

## v3 route target map (summary)

| Current | v3 target | Tab |
|---------|-----------|-----|
| `/explore`, collections | `/discover` (+ query/collection segments) | Discover |
| `/generator`, `/wheel`, `/vote/:id`, recipe cook | `/tonight`, `/tonight/wheel`, `/tonight/vote/:id`, `/tonight/recipe/:slug` | Tonight |
| `/hall`, shift, canteen, shopping, deals, activity | `/hall`, `/hall/shift`, `/hall/supplies`, `/hall/shopping`, etc. | Hall |
| `/account`, `/plans`, local history | `/me`, `/me/plans`, `/me/history` | Me |
| `/halls/:id` | `/hall/settings` | Hall → settings stack |
| `/` | `/` (guest marketing) or redirect `/tonight` (returning user) | — |
| SEO, guides, admin | Unchanged URLs; outside tab shell | — |

Full IA spec: **`navigation-v3.md`**. Flows: **`user-flows-v3.md`**.

---

*End of screen map.*
