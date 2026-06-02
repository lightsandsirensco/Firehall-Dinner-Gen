# 404 Audit — Firehall Meals

Generated: 2026-06-02T14:47:26.805Z

## Executive summary

| Metric | Value |
|--------|------:|
| **Total URLs tested** | 382 |
| **200 / OK (SPA route + data)** | 379 |
| **301 / client redirects** | 3 |
| **404 (dead routes / missing data)** | 0 |
| **500 errors** | 0 (static audit; no server errors detected) |
| **Missing static assets** | 0 |
| **Broken internal links** | 0 |
| **Broken recipe pages** | 0 |
| **Broken images** | 0 |
| **Sitemap URLs failing resolution** | 0 / 309 |
| **Orphan recipes** (no nav link + not in sitemap) | 53 |
| **Recipes not linked from nav/footer scan** | 224 |
| **Approved recipes missing from sitemap** | 53 |
| **Site Integrity %** | **92.1%** |

Audit mode: **static route + filesystem** (matches SPA behavior: invalid slugs → NotFound).

## Sitemap audit

- URLs in sitemap: **309**
- Failing resolution: **0**
- Recipes in catalog but missing from sitemap: **53**
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

## Recipe page audit (224 catalog entries)

| Issue count | 0 |
|-------------|------:|

_All recipe pages have JSON, hero, ingredients, instructions, and nutrition._

## Image audit

| Source | Broken |
|--------|-------:|
| Catalog heroes/thumbs/mobile/rails | 0 |
| Classics wheel | 0 |




## Internal link audit

Broken links: **0**

_All scanned internal links resolve._

## Orphan & discoverability

- **Orphan recipes** (no internal link in scanned sources + not in sitemap): **53**
- **Not linked from nav/home scan** (may still be in Explore API/sitemap): **224**
- **In approved catalog but missing from sitemap:** **53**

### Recipes missing from sitemap (first 20)

- `chili-lime-grilled-tilapia`
- `andouille-po-boy-rolls-crew`
- `spiedie-chicken-platter-crew`
- `loaded-ranch-potato-salad-crew`
- `blueberry-almond`
- `brisket-style-beef-sandwiches-au-jus`
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
- `honey-chipotle-chicken-thighs`
- `hot-honey-grilled-sausage-peppers`

### True orphans (first 15)

- `chili-lime-grilled-tilapia`
- `andouille-po-boy-rolls-crew`
- `spiedie-chicken-platter-crew`
- `loaded-ranch-potato-salad-crew`
- `blueberry-almond`
- `brisket-style-beef-sandwiches-au-jus`
- `cast-iron-steak-fajita-sizzlers`
- `chocolate-banana-recovery`
- `citrus-ginger`
- `competition-bbq-chicken-thighs`
- `flat-top-philly-cheesesteaks-crew`
- `firehall-street-elote-cups`
- `firehall-burnt-ends-platter`
- `griddle-smash-sausage-peppers`
- `green-pineapple`


## Console & mobile

- **Console errors:** Browser console/React runtime errors require Playwright (not installed). Static audit covers routes, JSON, and assets.
- **Mobile Safari:** Mobile viewport crawl requires Playwright. Static checks: explore-mobile audit patterns + mobile image paths on catalog entries. Run `npm run audit:explore-mobile` for static mobile Explore checks.

## 404 / dead routes

_None._

## Recommendations

- Fix failing paths and broken assets before launch push.
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
