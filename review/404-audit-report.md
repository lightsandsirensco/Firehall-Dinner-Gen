# 404 Audit — Firehall Meals

Generated: 2026-07-24T02:32:38.417Z

## Executive summary

| Metric | Value |
|--------|------:|
| **Total URLs tested** | 543 |
| **200 / OK (SPA route + data)** | 506 |
| **301 / client redirects** | 3 |
| **404 (dead routes / missing data)** | 34 |
| **500 errors** | 0 (static audit; no server errors detected) |
| **Missing static assets** | 0 |
| **Broken internal links** | 30 |
| **Broken recipe pages** | 77 |
| **Broken images** | 79 |
| **Sitemap URLs failing resolution** | 10 / 444 |
| **Orphan recipes** (no nav link + not in sitemap) | 55 |
| **Recipes not linked from nav/footer scan** | 299 |
| **Approved recipes missing from sitemap** | 55 |
| **Site Integrity %** | **44.1%** |
| **Hard failures** (404, broken assets, links, recipes) | 230 |

Audit mode: **static route + filesystem** (matches SPA behavior: invalid slugs → NotFound).

## Sitemap audit

- URLs in sitemap: **444**
- Failing resolution: **10**
- Recipes in catalog but missing from sitemap: **55**
- Guides missing from sitemap: **0**

### Sitemap failures

- `/how-we-test-recipes`
- `/hall-meal-planner`
- `/firefighter-dinner-vote`
- `/fire-hall-pantry`
- `/canteen-manager`
- `/cost-per-plate-calculator`
- `/fire-hall-grocery-list`
- `/fire-station-kitchen-inventory`
- `/firefighter-meal-calendar`
- `/crew-grocery-budget`


## Legacy routes

| Path | Expected | Actual | Pass |
|------|----------|--------|------|
| `/classics-wheel` | redirect | redirect | PASS |
| `/performance-fuel` | redirect | redirect | PASS |
| `/performance-fuel/steak-tacos` | redirect | redirect | PASS |
| `/explore/recipe/1` | ok | ok | PASS |
| `/recipes/__nonexistent_slug_xyz__` | not_found | not_found | PASS |

## Recipe page audit (299 catalog entries)

| Issue count | 77 |
|-------------|------:|

- `chili-lime-grilled-tilapia` (/recipes/chili-lime-grilled-tilapia): broken_related:carolina-vinegar-pulled-pork
- `andouille-po-boy-rolls-crew` (/recipes/andouille-po-boy-rolls-crew): broken_related:carolina-vinegar-pulled-pork
- `mediterranean-baked-fish-tray` (/recipes/mediterranean-baked-fish-tray): broken_related:sheet-pan-chicken-fajitas-lite
- `herb-baked-salmon-tray` (/recipes/herb-baked-salmon-tray): broken_related:sheet-pan-chicken-fajitas-lite
- `baked-turkey-meatball-marinara` (/recipes/baked-turkey-meatball-marinara): broken_related:lean-turkey-bean-chili
- `crock-barbacoa-chicken` (/recipes/crock-barbacoa-chicken): broken_related:lean-turkey-bean-chili, broken_related:sheet-pan-chicken-fajitas-lite
- `bbq-meatball-skewers` (/recipes/bbq-meatball-skewers): broken_related:chicken-caesar-wraps
- `beef-gyros-for-the-hall` (/recipes/beef-gyros-for-the-hall): broken_related:chicken-caesar-wraps
- `korean-beef-rice-bowls` (/recipes/korean-beef-rice-bowls): broken_related:lean-beef-broccoli-rice
- `spiedie-chicken-platter-crew` (/recipes/spiedie-chicken-platter-crew): broken_related:carolina-vinegar-pulled-pork
- `cajun-grilled-cod-crew` (/recipes/cajun-grilled-cod-crew): broken_related:carolina-vinegar-pulled-pork
- `loaded-ranch-potato-salad-crew` (/recipes/loaded-ranch-potato-salad-crew): broken_related:carolina-vinegar-pulled-pork
- `brisket-style-beef-sandwiches-au-jus` (/recipes/brisket-style-beef-sandwiches-au-jus): broken_related:carolina-vinegar-pulled-pork
- `buffalo-chicken-wraps` (/recipes/buffalo-chicken-wraps): broken_related:chicken-caesar-wraps
- `cajun-chicken-rice-bowl` (/recipes/cajun-chicken-rice-bowl): broken_related:sheet-pan-chicken-fajitas-lite
- `grilled-cod-lemon-packets` (/recipes/grilled-cod-lemon-packets): broken_related:carolina-vinegar-pulled-pork
- `caprese-chicken-bake` (/recipes/caprese-chicken-bake): broken_related:sheet-pan-chicken-fajitas-lite
- `cast-iron-steak-fajita-sizzlers` (/recipes/cast-iron-steak-fajita-sizzlers): broken_related:carolina-vinegar-pulled-pork
- `spanish-chicken-chorizo-rice` (/recipes/spanish-chicken-chorizo-rice): broken_related:sheet-pan-chicken-fajitas-lite
- `chicken-enchilada-skillet-light` (/recipes/chicken-enchilada-skillet-light): broken_related:sheet-pan-chicken-fajitas-lite
- `asian-chicken-lettuce-cups` (/recipes/asian-chicken-lettuce-cups): broken_related:sheet-pan-chicken-fajitas-lite
- `chicken-shawarma-pitas` (/recipes/chicken-shawarma-pitas): broken_related:chicken-caesar-wraps
- `boneless-chicken-thighs-sweet-potato-spinach` (/recipes/boneless-chicken-thighs-sweet-potato-spinach): broken_related:sheet-pan-chicken-fajitas-lite
- `chipotle-lime-chicken-tacos` (/recipes/chipotle-lime-chicken-tacos): broken_related:sheet-pan-chicken-fajitas-lite
- `flat-top-philly-cheesesteaks-crew` (/recipes/flat-top-philly-cheesesteaks-crew): missing_nutrition, broken_related:carolina-vinegar-pulled-pork

## Image audit

| Source | Broken |
|--------|-------:|
| Catalog heroes/thumbs/mobile/rails | 79 |
| Classics wheel | 0 |


- chili-lime-grilled-tilapia:broken_related:carolina-vinegar-pulled-pork
- andouille-po-boy-rolls-crew:broken_related:carolina-vinegar-pulled-pork
- mediterranean-baked-fish-tray:broken_related:sheet-pan-chicken-fajitas-lite
- herb-baked-salmon-tray:broken_related:sheet-pan-chicken-fajitas-lite
- baked-turkey-meatball-marinara:broken_related:lean-turkey-bean-chili
- crock-barbacoa-chicken:broken_related:lean-turkey-bean-chili
- crock-barbacoa-chicken:broken_related:sheet-pan-chicken-fajitas-lite
- bbq-meatball-skewers:broken_related:chicken-caesar-wraps
- beef-gyros-for-the-hall:broken_related:chicken-caesar-wraps
- korean-beef-rice-bowls:broken_related:lean-beef-broccoli-rice
- spiedie-chicken-platter-crew:broken_related:carolina-vinegar-pulled-pork
- cajun-grilled-cod-crew:broken_related:carolina-vinegar-pulled-pork
- loaded-ranch-potato-salad-crew:broken_related:carolina-vinegar-pulled-pork
- brisket-style-beef-sandwiches-au-jus:broken_related:carolina-vinegar-pulled-pork
- buffalo-chicken-wraps:broken_related:chicken-caesar-wraps
- cajun-chicken-rice-bowl:broken_related:sheet-pan-chicken-fajitas-lite
- grilled-cod-lemon-packets:broken_related:carolina-vinegar-pulled-pork
- caprese-chicken-bake:broken_related:sheet-pan-chicken-fajitas-lite
- cast-iron-steak-fajita-sizzlers:broken_related:carolina-vinegar-pulled-pork
- spanish-chicken-chorizo-rice:broken_related:sheet-pan-chicken-fajitas-lite

## Internal link audit

Broken links: **30**

- `/tonight` — no matching route (from: client\src\App.tsx, client\src\pages\hall-detail-page.tsx)
- `/me/profile` — no matching route (from: client\src\App.tsx, client\src\pages\hall-features-page.tsx)
- `/me/saved` — no matching route (from: client\src\App.tsx, client\src\pages\me-page.tsx)
- `/me/subscription` — no matching route (from: client\src\App.tsx, client\src\pages\me-page.tsx)
- `/hall/history` — no matching route (from: client\src\App.tsx, client\src\components\hall-dashboard\v2\hall-dashboard-actions.tsx)
- `/hall/join` — no matching route (from: client\src\App.tsx, client\src\pages\account-page.tsx)
- `/hall/protein-deals/setup` — no matching route (from: client\src\App.tsx, client\src\pages\hall-protein-deals-page.tsx)
- `/hall/protein-deals` — no matching route (from: client\src\App.tsx, client\src\pages\hall-deals-setup-page.tsx)
- `/how-we-test-recipes` — no matching route (from: client\src\pages\about.tsx)
- `/plans` — no matching route (from: client\src\pages\admin-billing.tsx, client\src\pages\hall-features-page.tsx)
- `/admin/signups` — no matching route (from: client\src\pages\admin-leads.tsx, client\src\pages\admin.tsx)
- `/admin/users` — no matching route (from: client\src\pages\admin-leads.tsx, client\src\pages\admin-user-detail.tsx)
- `/admin/leads` — no matching route (from: client\src\pages\admin-signups-page.tsx, client\src\pages\admin-users.tsx)
- `/admin/billing` — no matching route (from: client\src\pages\admin.tsx)
- `/admin/deals` — no matching route (from: client\src\pages\admin.tsx)
- `/admin/errors` — no matching route (from: client\src\pages\admin.tsx)
- `/admin/growth` — no matching route (from: client\src\pages\admin.tsx)
- `/hall/canteen` — no matching route (from: client\src\pages\hall-detail-page.tsx, client\src\components\shift-dashboard\shift-dashboard-actions.tsx)
- `/firefighter-dinner-vote` — no matching route (from: client\src\pages\hall-features-page.tsx)
- `/fire-hall-grocery-list` — no matching route (from: client\src\pages\hall-features-page.tsx)
- `/canteen-manager` — no matching route (from: client\src\pages\hall-features-page.tsx)
- `/hall-meal-planner` — no matching route (from: client\src\pages\hall-features-page.tsx)
- `/crew-grocery-budget` — no matching route (from: client\src\pages\hall-features-page.tsx)
- `/me/history` — no matching route (from: client\src\pages\hall-history-page.tsx, client\src\pages\me-page.tsx)
- `/account` — no matching route (from: client\src\pages\hall-join-page.tsx)

## Orphan & discoverability

- **Orphan recipes** (no internal link in scanned sources + not in sitemap): **55**
- **Not linked from nav/home scan** (may still be in Explore API/sitemap): **299**
- **In approved catalog but missing from sitemap:** **55**

### Recipes missing from sitemap (first 20)

- `chili-lime-grilled-tilapia`
- `andouille-po-boy-rolls-crew`
- `spiedie-chicken-platter-crew`
- `cajun-grilled-cod-crew`
- `loaded-ranch-potato-salad-crew`
- `blueberry-almond`
- `brisket-style-beef-sandwiches-au-jus`
- `grilled-cod-lemon-packets`
- `cast-iron-steak-fajita-sizzlers`
- `chocolate-banana-recovery`
- `citrus-ginger`
- `competition-bbq-chicken-thighs`
- `flat-top-philly-cheesesteaks-crew`
- `firehall-street-elote-cups`
- `firehall-burnt-ends-platter`
- `griddle-smash-sausage-peppers`
- `green-pineapple`
- `grilled-reuben-sandwiches-crew`
- `caprese-steak-skewers-crew`
- `hickory-smoked-chicken-breast`

### True orphans (first 15)

- `chili-lime-grilled-tilapia`
- `andouille-po-boy-rolls-crew`
- `spiedie-chicken-platter-crew`
- `cajun-grilled-cod-crew`
- `loaded-ranch-potato-salad-crew`
- `blueberry-almond`
- `brisket-style-beef-sandwiches-au-jus`
- `grilled-cod-lemon-packets`
- `cast-iron-steak-fajita-sizzlers`
- `chocolate-banana-recovery`
- `citrus-ginger`
- `competition-bbq-chicken-thighs`
- `flat-top-philly-cheesesteaks-crew`
- `firehall-street-elote-cups`
- `firehall-burnt-ends-platter`


## Console & mobile

- **Console errors:** Browser console/React runtime errors require Playwright (not installed). Static audit covers routes, JSON, and assets.
- **Mobile Safari:** Mobile viewport crawl requires Playwright. Static checks: explore-mobile audit patterns + mobile image paths on catalog entries. Run `npm run audit:explore-mobile` for static mobile Explore checks.

## 404 / dead routes

- `/how-we-test-recipes`
- `/hall-meal-planner`
- `/firefighter-dinner-vote`
- `/fire-hall-pantry`
- `/canteen-manager`
- `/cost-per-plate-calculator`
- `/fire-hall-grocery-list`
- `/fire-station-kitchen-inventory`
- `/firefighter-meal-calendar`
- `/crew-grocery-budget`
- `/tonight`
- `/me/profile`
- `/me/saved`
- `/me/subscription`
- `/hall/history`
- `/hall/join`
- `/hall/protein-deals/setup`
- `/hall/protein-deals`
- `/plans`
- `/admin/signups`
- `/admin/users`
- `/admin/leads`
- `/admin/billing`
- `/admin/deals`
- `/admin/errors`
- `/admin/growth`
- `/hall/canteen`
- `/me/history`
- `/account`
- `/me/settings`
- `/hall/settings`
- `/hall/features`
- `/hall/dues`
- `/hall/logbook`

## Recommendations

- Fix failing paths and broken assets before launch push.
- Repair internal links listed above.
- Fix recipe page JSON/image gaps.
- Link orphan recipes from Explore, guides, or related clusters.
- Re-run after deploy: `npm run audit:404`
- Optional live probe: `npm run audit:404 -- --http=http://127.0.0.1:5000` (with `npm run dev`)

## Commands

```bash
npm run audit:404
npm run audit:404 -- --http=http://127.0.0.1:5000
npm run audit:indexing
npm run audit:approved-recipe-data-routes
```
