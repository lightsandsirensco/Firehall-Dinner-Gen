# 404 Audit — Firehall Meals

Generated: 2026-07-29T14:01:59.748Z

## Executive summary

| Metric | Value |
|--------|------:|
| **Total URLs tested** | 571 |
| **200 / OK (SPA route + data)** | 568 |
| **301 / client redirects** | 3 |
| **404 (dead routes / missing data)** | 0 |
| **500 errors** | 0 (static audit; no server errors detected) |
| **Missing static assets** | 0 |
| **Broken internal links** | 0 |
| **Broken recipe pages** | 45 |
| **Broken images** | 45 |
| **Sitemap URLs failing resolution** | 0 / 515 |
| **Orphan recipes** (no nav link + not in sitemap) | 10 |
| **Recipes not linked from nav/footer scan** | 355 |
| **Approved recipes missing from sitemap** | 10 |
| **Site Integrity %** | **73.5%** |
| **Hard failures** (404, broken assets, links, recipes) | 90 |

Audit mode: **static route + filesystem** (matches SPA behavior: invalid slugs → NotFound).

## Sitemap audit

- URLs in sitemap: **515**
- Failing resolution: **0**
- Recipes in catalog but missing from sitemap: **10**
- Guides missing from sitemap: **0**

_All sitemap URLs resolve._


## Legacy routes

| Path | Expected | Actual | Pass |
|------|----------|--------|------|
| `/classics-wheel` | redirect | redirect | PASS |
| `/performance-fuel` | redirect | redirect | PASS |
| `/performance-fuel/steak-tacos` | redirect | redirect | PASS |
| `/explore/recipe/1` | ok | ok | PASS |
| `/recipes/__nonexistent_slug_xyz__` | not_found | not_found | PASS |

## Recipe page audit (355 catalog entries)

| Issue count | 45 |
|-------------|------:|

- `chili-lime-grilled-tilapia` (/recipes/chili-lime-grilled-tilapia): broken_related:carolina-vinegar-pulled-pork
- `andouille-po-boy-rolls-crew` (/recipes/andouille-po-boy-rolls-crew): broken_related:carolina-vinegar-pulled-pork
- `bbq-meatball-skewers` (/recipes/bbq-meatball-skewers): broken_related:chicken-caesar-wraps
- `beef-gyros-for-the-hall` (/recipes/beef-gyros-for-the-hall): broken_related:chicken-caesar-wraps
- `spiedie-chicken-platter-crew` (/recipes/spiedie-chicken-platter-crew): broken_related:carolina-vinegar-pulled-pork
- `cajun-grilled-cod-crew` (/recipes/cajun-grilled-cod-crew): broken_related:carolina-vinegar-pulled-pork
- `loaded-ranch-potato-salad-crew` (/recipes/loaded-ranch-potato-salad-crew): broken_related:carolina-vinegar-pulled-pork
- `brisket-style-beef-sandwiches-au-jus` (/recipes/brisket-style-beef-sandwiches-au-jus): broken_related:carolina-vinegar-pulled-pork
- `buffalo-chicken-wraps` (/recipes/buffalo-chicken-wraps): broken_related:chicken-caesar-wraps
- `grilled-cod-lemon-packets` (/recipes/grilled-cod-lemon-packets): broken_related:carolina-vinegar-pulled-pork
- `cast-iron-steak-fajita-sizzlers` (/recipes/cast-iron-steak-fajita-sizzlers): broken_related:carolina-vinegar-pulled-pork
- `chicken-shawarma-pitas` (/recipes/chicken-shawarma-pitas): broken_related:chicken-caesar-wraps
- `flat-top-philly-cheesesteaks-crew` (/recipes/flat-top-philly-cheesesteaks-crew): broken_related:carolina-vinegar-pulled-pork
- `firehall-street-elote-cups` (/recipes/firehall-street-elote-cups): broken_related:carolina-vinegar-pulled-pork
- `firehall-burnt-ends-platter` (/recipes/firehall-burnt-ends-platter): broken_related:pepper-smoked-brisket-flat
- `griddle-smash-sausage-peppers` (/recipes/griddle-smash-sausage-peppers): broken_related:carolina-vinegar-pulled-pork
- `greek-chicken-pitas` (/recipes/greek-chicken-pitas): broken_related:chicken-caesar-wraps
- `grilled-reuben-sandwiches-crew` (/recipes/grilled-reuben-sandwiches-crew): broken_related:carolina-vinegar-pulled-pork
- `caprese-steak-skewers-crew` (/recipes/caprese-steak-skewers-crew): broken_related:carolina-vinegar-pulled-pork
- `hot-honey-grilled-sausage-peppers` (/recipes/hot-honey-grilled-sausage-peppers): broken_related:carolina-vinegar-pulled-pork
- `pork-satay-skewers-crew` (/recipes/pork-satay-skewers-crew): broken_related:carolina-vinegar-pulled-pork
- `jalapeno-cheddar-smoked-sausages` (/recipes/jalapeno-cheddar-smoked-sausages): broken_related:firehall-double-smash-burgers-bbq
- `tandoori-lamb-chop-platter` (/recipes/tandoori-lamb-chop-platter): broken_related:carolina-vinegar-pulled-pork
- `portuguese-linguica-grill-platter` (/recipes/portuguese-linguica-grill-platter): broken_related:carolina-vinegar-pulled-pork
- `firehall-antipasto-pasta-salad` (/recipes/firehall-antipasto-pasta-salad): broken_related:carolina-vinegar-pulled-pork

## Image audit

| Source | Broken |
|--------|-------:|
| Catalog heroes/thumbs/mobile/rails | 45 |
| Classics wheel | 0 |


- chili-lime-grilled-tilapia:broken_related:carolina-vinegar-pulled-pork
- andouille-po-boy-rolls-crew:broken_related:carolina-vinegar-pulled-pork
- bbq-meatball-skewers:broken_related:chicken-caesar-wraps
- beef-gyros-for-the-hall:broken_related:chicken-caesar-wraps
- spiedie-chicken-platter-crew:broken_related:carolina-vinegar-pulled-pork
- cajun-grilled-cod-crew:broken_related:carolina-vinegar-pulled-pork
- loaded-ranch-potato-salad-crew:broken_related:carolina-vinegar-pulled-pork
- brisket-style-beef-sandwiches-au-jus:broken_related:carolina-vinegar-pulled-pork
- buffalo-chicken-wraps:broken_related:chicken-caesar-wraps
- grilled-cod-lemon-packets:broken_related:carolina-vinegar-pulled-pork
- cast-iron-steak-fajita-sizzlers:broken_related:carolina-vinegar-pulled-pork
- chicken-shawarma-pitas:broken_related:chicken-caesar-wraps
- flat-top-philly-cheesesteaks-crew:broken_related:carolina-vinegar-pulled-pork
- firehall-street-elote-cups:broken_related:carolina-vinegar-pulled-pork
- firehall-burnt-ends-platter:broken_related:pepper-smoked-brisket-flat
- griddle-smash-sausage-peppers:broken_related:carolina-vinegar-pulled-pork
- greek-chicken-pitas:broken_related:chicken-caesar-wraps
- grilled-reuben-sandwiches-crew:broken_related:carolina-vinegar-pulled-pork
- caprese-steak-skewers-crew:broken_related:carolina-vinegar-pulled-pork
- hot-honey-grilled-sausage-peppers:broken_related:carolina-vinegar-pulled-pork

## Internal link audit

Broken links: **0**

_All scanned internal links resolve._

## Orphan & discoverability

- **Orphan recipes** (no internal link in scanned sources + not in sitemap): **10**
- **Not linked from nav/home scan** (may still be in Explore API/sitemap): **355**
- **In approved catalog but missing from sitemap:** **10**

### Recipes missing from sitemap (first 20)

- `blueberry-almond`
- `chocolate-banana-recovery`
- `citrus-ginger`
- `green-pineapple`
- `mixed-berry-protein`
- `mocha-protein`
- `peanut-butter-banana-recovery`
- `strawberry-oat-breakfast`
- `strawberry-spinach`
- `tropical-mango-greek`

### True orphans (first 15)

- `blueberry-almond`
- `chocolate-banana-recovery`
- `citrus-ginger`
- `green-pineapple`
- `mixed-berry-protein`
- `mocha-protein`
- `peanut-butter-banana-recovery`
- `strawberry-oat-breakfast`
- `strawberry-spinach`
- `tropical-mango-greek`


## Console & mobile

- **Console errors:** Browser console/React runtime errors require Playwright (not installed). Static audit covers routes, JSON, and assets.
- **Mobile Safari:** Mobile viewport crawl requires Playwright. Static checks: explore-mobile audit patterns + mobile image paths on catalog entries. Run `npm run audit:explore-mobile` for static mobile Explore checks.

## 404 / dead routes

_None._

## Recommendations

- Fix failing paths and broken assets before launch push.
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
