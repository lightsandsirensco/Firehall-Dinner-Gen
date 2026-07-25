# SEO Indexing Audit

Generated: 2026-07-24T02:32:40.424Z

Canonical origin: **https://www.firehallmeals.com**



## Executive summary

| Check | Status |
|-------|--------|
| Required routes in sitemap | PASS |
| robots.txt allows crawling | PASS |
| Recipe unique title + meta + canonical | NEEDS WORK |
| Recipes in sitemap | PASS |
| Internal discoverability | NEEDS WORK |
| **Overall** | **NEEDS WORK** |

## URL counts

| Metric | Count |
|--------|------:|
| **Total URLs in sitemap** | 444 |
| **Total recipe URLs** (catalog indexes) | 348 |
| Recipe URLs listed in sitemap | 348 |
| **Total guide URLs** | 58 |
| Guide URLs listed in sitemap | 62 |
| Approved catalog (Explore / Recipes browse) | 299 |

## 1. Sitemap — required routes

| Route | In sitemap |
|-------|------------|
| `/` | Yes |
| `/explore` | Yes |
| `/wheel` | Yes |
| `/pizza` | Yes |
| `/guides` | Yes |



Hall guides index (`/guides`) plus **62** individual guide URLs. Explore catalog (`/explore`) plus **348** recipe/smoothie detail URLs.

## 2. robots.txt

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /vote/
Disallow: /me
Disallow: /hall
Disallow: /halls/
Disallow: /settings
Disallow: /profile
Disallow: /tonight
Disallow: /onboarding/

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

Audited **348** indexable recipe URLs.

| Issue | Count |
|-------|------:|
| Missing title, description, or canonical | 0 |
| Duplicate meta titles | 1 |
| Duplicate meta descriptions | 0 |
| Invalid / missing canonical | 0 |
| Canonical path mismatch | 0 |


### Duplicate titles (sample)

- firehall-greek-chicken-bowls ↔ greek-chicken-bowls: "Greek Chicken Bowls | Firehall Meals"



## 4. Internal linking

Recipes should be reachable via **Explore / Recipes** (approved catalog) and/or **Hall Guide** meal picks. Golden/performance/expansion pages should expose **on-page related recipe clusters**.

| Signal | Count |
|--------|------:|
| In approved catalog (Explore / Recipes grid) | 299 |
| Hub-only (Pizza / Breakfast / Performance — not on Explore) | 57 |
| Not linked from any hall guide | 263 |
| Golden-family pages with &lt;2 outbound related links | 160 |
| **True orphan recipes** (no catalog hub, no guide link) | **37** |

### True orphan recipe slugs

- `chicken-alfredo-bake`
- `flank-chimichurri`
- `loaded-nacho-skillet`
- `best-tuna-melt-for-the-hall`
- `firehall-taco-bowls`
- `buffalo-chicken-sweet-potato-bowls`
- `firehall-greek-chicken-bowls`
- `teriyaki-chicken-rice-bowls`
- `firehall-korean-beef-bowls`
- `cajun-shrimp-rice-bowls`
- `southwest-steak-bowls`
- `bbq-pulled-pork-bowls`
- `mediterranean-beef-bowls`
- `chipotle-chicken-burrito-bowls`
- `turkey-taco-bowls`
- `peanut-chicken-rice-bowls`
- `firehall-gyro-bowls`
- `egg-roll-in-a-bowl-crew`
- `salmon-rice-bowls-crew`
- `korean-turkey-rice-bowls`
- `leftover-roast-beef-bowls`
- `mississippi-pot-roast-crew`
- `white-chicken-chili-crock`
- `italian-beef-slow-cooker`
- `salsa-verde-chicken-crock`
- `loaded-baked-potato-soup-crock`
- `thai-peanut-chicken-crock`
- `burnt-ends-chili-crew`
- `smoker-nachos-crew`
- `weeknight-bbq-ribs-crew`
- `grilled-flank-fajita-bar`
- `costco-rotisserie-remix`
- `chicken-thigh-stretch-dinner`
- `pasta-e-fagioli-hall`
- `dirty-rice-crew-skillet`
- `sausage-gnocchi-skillet`
- `spanish-rice-chicken-one-pot`


### Hub-only recipes (indexed, not on Explore)

57 recipes live on dedicated hubs instead of the main catalog — expected for Pizza Night and some breakfast/performance entries. See `hubOnlySample` in JSON.


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
