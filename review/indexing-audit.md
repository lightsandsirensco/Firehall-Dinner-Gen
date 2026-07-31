# SEO Indexing Audit

Generated: 2026-07-30T13:11:40.854Z

Canonical origin: **https://www.firehallmeals.com**



## Executive summary

| Check | Status |
|-------|--------|
| Required routes in sitemap | PASS |
| robots.txt allows crawling | PASS |
| Recipe unique title + meta + canonical | PASS |
| Recipes in sitemap | PASS |
| Internal discoverability | NEEDS WORK |
| **Overall** | **NEEDS WORK** |

## URL counts

| Metric | Count |
|--------|------:|
| **Total URLs in sitemap** | 515 |
| **Total recipe URLs** (catalog indexes) | 374 |
| Recipe URLs listed in sitemap | 374 |
| **Total guide URLs** | 58 |
| Guide URLs listed in sitemap | 62 |
| Approved catalog (Explore / Recipes browse) | 355 |

## 1. Sitemap — required routes

| Route | In sitemap |
|-------|------------|
| `/` | Yes |
| `/explore` | Yes |
| `/wheel` | Yes |
| `/pizza` | Yes |
| `/guides` | Yes |



Hall guides index (`/guides`) plus **62** individual guide URLs. Explore catalog (`/explore`) plus **374** recipe/smoothie detail URLs.

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
Disallow: /favorites

User-agent: GPTBot
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
Disallow: /favorites

User-agent: ChatGPT-User
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
Disallow: /favorites

User-agent: OAI-SearchBot
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
Disallow: /favorites

User-agent: Google-Extended
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
Disallow: /favorites

User-agent: GoogleOther
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
Disallow: /favorites

User-agent: CCBot
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
Disallow: /favorites

User-agent: anthropic-ai
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
Disallow: /favorites

User-agent: ClaudeBot
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
Disallow: /favorites

User-agent: Claude-Web
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
Disallow: /favorites

User-agent: PerplexityBot
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
Disallow: /favorites

User-agent: Applebot-Extended
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
Disallow: /favorites

User-agent: Bytespider
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
Disallow: /favorites

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

Audited **374** indexable recipe URLs.

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
| In approved catalog (Explore / Recipes grid) | 355 |
| Hub-only (Pizza / Breakfast / Performance — not on Explore) | 55 |
| Not linked from any hall guide | 289 |
| Golden-family pages with &lt;2 outbound related links | 186 |
| **True orphan recipes** (no catalog hub, no guide link) | **9** |

### True orphan recipe slugs

- `chicken-alfredo-bake`
- `teriyaki-chicken-rice-bowls`
- `firehall-korean-beef-bowls`
- `egg-roll-in-a-bowl-crew`
- `korean-turkey-rice-bowls`
- `white-chicken-chili-crock`
- `thai-peanut-chicken-crock`
- `burnt-ends-chili-crew`
- `pasta-e-fagioli-hall`


### Hub-only recipes (indexed, not on Explore)

55 recipes live on dedicated hubs instead of the main catalog — expected for Pizza Night and some breakfast/performance entries. See `hubOnlySample` in JSON.


## 5. Sitemap generation coverage

| Issue | Count |
|-------|------:|
| Indexable recipes missing from sitemap | 0 |
| Published guides missing from sitemap | 0 |
| Orphan sitemap URLs (no backing page) | 45 |



**Orphan sitemap paths:** /recipes/honey-chipotle-chicken-thighs, /recipes/smoked-chicken-quarters-white-sauce, /recipes/brisket-style-beef-sandwiches-au-jus, /recipes/hot-honey-grilled-sausage-peppers, /recipes/texas-central-brisket-crew, /recipes/firehall-burnt-ends-platter, /recipes/competition-bbq-chicken-thighs, /recipes/smoked-bbq-chicken-wings-tray, /recipes/hickory-smoked-chicken-breast, /recipes/santa-maria-tri-tip-roast, /recipes/reverse-seared-ribeye-crew, /recipes/smoked-picanha-steak-platter, /recipes/jalapeno-cheddar-smoked-sausages, /recipes/smoked-mac-and-cheese-crew, /recipes/smoked-baked-beans-crew, /recipes/smoked-potato-salad-tray, /recipes/lamb-merguez-skewers-crew, /recipes/pork-satay-skewers-crew, /recipes/gochujang-beef-skewers-crew, /recipes/caprese-steak-skewers-crew, /recipes/honey-sriracha-shrimp-skewers, /recipes/yakiniku-grill-platter-crew, /recipes/tandoori-lamb-chop-platter, /recipes/portuguese-linguica-grill-platter, /recipes/spiedie-chicken-platter-crew, /recipes/pollo-asado-citrus-platter, /recipes/mixed-lamb-chop-grill-board, /recipes/maple-bourbon-grilled-trout, /recipes/cajun-grilled-cod-crew, /recipes/grilled-cod-lemon-packets, /recipes/chili-lime-grilled-tilapia, /recipes/grilled-chicken-pesto-panini-crew, /recipes/pressed-cuban-sandwiches-crew, /recipes/grilled-reuben-sandwiches-crew, /recipes/andouille-po-boy-rolls-crew, /recipes/cast-iron-steak-fajita-sizzlers, /recipes/firehall-hibachi-mixed-grill-crew, /recipes/flat-top-philly-cheesesteaks-crew, /recipes/griddle-smash-sausage-peppers, /recipes/mongolian-beef-flat-top-crew, /recipes/firehall-street-elote-cups, /recipes/loaded-ranch-potato-salad-crew, /recipes/firehall-antipasto-pasta-salad, /recipes/grilled-peach-burrata-salad, /recipes/charred-broccolini-lemon-tray


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
