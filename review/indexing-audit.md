# SEO Indexing Audit

Generated: 2026-06-23T15:33:36.751Z

Canonical origin: **https://www.firehallmeals.com**



## Executive summary

| Check | Status |
|-------|--------|
| Required routes in sitemap | PASS |
| robots.txt allows crawling | PASS |
| Recipe unique title + meta + canonical | PASS |
| Recipes in sitemap | PASS |
| Internal discoverability | PASS |
| **Overall** | **PASS** |

## URL counts

| Metric | Count |
|--------|------:|
| **Total URLs in sitemap** | 393 |
| **Total recipe URLs** (catalog indexes) | 311 |
| Recipe URLs listed in sitemap | 311 |
| **Total guide URLs** | 58 |
| Guide URLs listed in sitemap | 62 |
| Approved catalog (Explore / Recipes browse) | 313 |

## 1. Sitemap — required routes

| Route | In sitemap |
|-------|------------|
| `/` | Yes |
| `/explore` | Yes |
| `/wheel` | Yes |
| `/pizza` | Yes |
| `/guides` | Yes |



Hall guides index (`/guides`) plus **62** individual guide URLs. Explore catalog (`/explore`) plus **311** recipe/smoothie detail URLs.

## 2. robots.txt

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /vote/

Sitemap: https://www.firehallmeals.com/sitemap.xml
```

| Rule | OK |
|------|:--:|
| `User-agent: *` | ✓ |
| `Allow: /` | ✓ |
| Sitemap declared | ✓ |
| `/recipes` not disallowed | ✓ |
| `/guides` not disallowed | ✓ |
| `/explore` not disallowed | ✓ |

## 3. Recipe page metadata

Audited **311** indexable recipe URLs.

| Issue | Count |
|-------|------:|
| Missing title, description, or canonical | 0 |
| Duplicate meta titles | 0 |
| Duplicate meta descriptions | 0 |
| Invalid / missing canonical | 0 |
| Canonical path mismatch | 0 |





## 4. Internal linking

Recipes should be reachable via **Explore / Recipes** (approved catalog) and/or **Hall Guide** meal picks. Golden/performance/expansion pages should expose **on-page related recipe clusters**.

| Signal | Count |
|--------|------:|
| In approved catalog (Explore / Recipes grid) | 313 |
| Hub-only (Pizza / Breakfast / Performance — not on Explore) | 43 |
| Not linked from any hall guide | 226 |
| Golden-family pages with &lt;2 outbound related links | 127 |
| **True orphan recipes** (no catalog hub, no guide link) | **0** |

_No true orphans — every indexable recipe is reachable via Explore, a dedicated hub (/pizza, /breakfast), performance catalog, or a hall guide._


### Hub-only recipes (indexed, not on Explore)

43 recipes live on dedicated hubs instead of the main catalog — expected for Pizza Night and some breakfast/performance entries. See `hubOnlySample` in JSON.


## 5. Sitemap generation coverage

| Issue | Count |
|-------|------:|
| Indexable recipes missing from sitemap | 0 |
| Published guides missing from sitemap | 0 |
| Orphan sitemap URLs (no backing page) | 0 |





## 6. Remediation log (browse unification)

### Canonical path rules

| Collection | Valid canonical pattern |
|------------|-------------------------|
| Golden / performance / expansion / pizza | `/recipes/:slug` |
| Breakfast | `/breakfast/:slug` (performance: `/breakfast/performance/:slug`) |
| Smoothies | `/smoothies/:slug` |

Breakfast recipes stay in the sitemap at `/recipes/:slug` for legacy routing, but on-page SEO canonicals correctly use `/breakfast/:slug`.

### Orphan recipe guide links

Recipes excluded from Explore (duplicate hero imagery) are linked from hall guides:

| Recipe slug | Linked from |
|-------------|-------------|
| `30-minute-pasta-e-fagioli-for-the-hall` | `/guides/easy-firehall-pasta-recipes` |
| `spaghetti-aglio-e-olio-for-the-hall` | `/guides/easy-firehall-pasta-recipes` |
| `crispy-chicken-cutlets` | `/guides/firehouse-comfort-meals` |
| `four-step-chicken-piccata` | `/guides/rookie-firefighter-meal-guide` |
| `french-onion-soup-for-the-hall` | `/guides/comfort-food-after-a-long-shift` |
| `tomato-soup-grilled-cheese-croutons` | `/guides/comfort-food-after-a-long-shift` |
| `sheet-pan-parmesan-dijon-chicken-thigh-dinner` | `/guides/fast-firehall-meals-under-30-minutes` |
| `turkey-burgers` | `/guides/healthy-firefighter-meals-fill-you-up` |
| `classic-patty-melt-for-the-crew` | `/guides/10-classic-firehall-meals` |
| `hall-blt-sandwich-feed` | `/guides/quick-meals-between-calls` |

## Validation commands

```bash
npm run audit:indexing
npm run catalog:generate-sitemap
npm run seo:audit-sitemap
```
