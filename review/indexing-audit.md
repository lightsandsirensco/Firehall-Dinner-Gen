# SEO Indexing Audit

Generated: 2026-06-02T15:58:19.497Z

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
| **Total URLs in sitemap** | 309 |
| **Total recipe URLs** (catalog indexes) | 217 |
| Recipe URLs listed in sitemap | 217 |
| **Total guide URLs** | 58 |
| Guide URLs listed in sitemap | 62 |
| Approved catalog (Explore / Recipes browse) | 224 |

## 1. Sitemap — required routes

| Route | In sitemap |
|-------|------------|
| `/` | Yes |
| `/explore` | Yes |
| `/wheel` | Yes |
| `/pizza` | Yes |
| `/guides` | Yes |
| `/recipes` | Yes |



Hall guides index (`/guides`) plus **62** individual guide URLs. Recipe index (`/recipes`) plus **217** recipe/smoothie URLs.

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

Audited **217** indexable recipe URLs.

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
| In approved catalog (Explore / Recipes grid) | 224 |
| Hub-only (Pizza / Breakfast / Performance — not on Explore) | 36 |
| Not linked from any hall guide | 207 |
| Golden-family pages with &lt;2 outbound related links | 125 |
| **True orphan recipes** (no catalog hub, no guide link) | **0** |

_No true orphans — every indexable recipe is reachable via Explore, a dedicated hub (/pizza, /breakfast), performance catalog, or a hall guide._


### Hub-only recipes (indexed, not on Explore)

36 recipes live on dedicated hubs instead of the main catalog — expected for Pizza Night and some breakfast/performance entries. See `hubOnlySample` in JSON.


## 5. Sitemap generation coverage

| Issue | Count |
|-------|------:|
| Indexable recipes missing from sitemap | 0 |
| Published guides missing from sitemap | 0 |
| Orphan sitemap URLs (no backing page) | 0 |





## Validation commands

```bash
npm run audit:indexing
npm run catalog:generate-sitemap
npm run seo:audit-sitemap
```
