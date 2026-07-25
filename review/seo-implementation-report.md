# SEO Implementation Report

**Date:** July 17, 2026  
**Site:** https://www.firehallmeals.com  
**Scope:** P0 + P1 items from `review/seo-domination-audit.md`  
**Method:** Inspect first → fix only verified gaps → validate locally

---

## Executive summary

Critical and high-priority SEO gaps from the domination audit were implemented safely:

| Priority | Item | Status |
|----------|------|--------|
| P0 | Production sitemap HTTP 500 | **Fixed** (try/catch + static fallback + hardened builder) — **requires deploy** to clear live 500 |
| P0 | Homepage title/description drift | **Fixed** — static HTML + runtime constants synced |
| P0 | GSC readiness (robots, canonicals, OG/Twitter) | **Hardened** — expanded robots Disallow; OG/Twitter/canonical already present |
| P0 | App-shell crawlability (`/me`, `/hall`, `/api`, …) | **Fixed** — robots + `X-Robots-Tag` + client `noindex` |
| P1 | Missing pillars `/firehouse-meals`, `/firefighter-dinner-ideas`, `/crew-meals` | **Created** |
| P1 | Recipe → pillar + guide + related links | **Fixed** |
| P1 | Recipe schema (Org, WebSite, AggregateRating when ratings exist) | **Fixed** |
| EEAT | About + How We Test Recipes | **Improved / created** |
| P1 | Performance / CWV deep pass | **Partial** — existing LCP patterns kept; large main chunk remains a follow-up |

---

## Before / after

### 1. Sitemap (P0)

| | Before | After |
|--|--------|-------|
| Live `https://www.firehallmeals.com/sitemap.xml` | **HTTP 500** (confirmed during audit + this session via WebFetch) | Code path hardened; **live fix depends on deploy** |
| Local `buildSitemapXml()` | Worked (403→407 URLs) | Still works; **407 URLs** including new landings + EEAT page |
| Failure mode | Uncaught throw → Express 500; static file never served | try/catch → serve `client/public/sitemap.xml` / dist fallback with `X-Sitemap-Source: static-fallback` |
| Auto-update | Dynamic route + `catalog:generate-sitemap` in build | Unchanged + safer |

**Root cause note:** Local generation succeeds. Production 500 is almost certainly an uncaught exception in the live route (or an older deploy). The handler now never leaves crawlers without XML when a static fallback exists.

### 2. Homepage metadata (P0)

| Signal | Before | After |
|--------|--------|-------|
| `client/index.html` title | Firefighter Meals & Firehall Recipes \| Firehall Meals | Same (kept) |
| Runtime `SEO_DEFAULT_TITLE` | Firefighter Meal App — Pick Dinner… | **Synced** to keyword-first title |
| Description (HTML vs runtime) | Divergent marketing copy | **Synced** recommended description |
| `useHomeSeo(300)` | Hardcoded count | Uses live `APPROVED_CATALOG_TOTAL` |

Recommended description now used everywhere for home:

> Crew-sized firefighter meals for the fire hall and fire station. Browse hundreds of shift-tested recipes, meal ideas, and tools built by firefighters.

### 3. Google Search Console readiness (P0)

| Check | Status |
|-------|--------|
| `robots.txt` | Allow `/`; Disallow admin/api/vote/**me/hall/halls/settings/profile/tonight/onboarding**; Sitemap declared |
| Canonical origin | `https://www.firehallmeals.com` (unchanged) |
| Sitemap declaration | Present in robots |
| Meta robots (public) | `index, follow, max-image-preview:large` in `index.html` |
| Open Graph / Twitter | Present on home shell; `applyPageSeo` sets per-route |
| Indexability of public pages | Unchanged (recipes, guides, landings remain indexable) |

### 4. Crawlability — app shells (P0)

| Path family | Before | After |
|-------------|--------|-------|
| `/admin` | robots Disallow + admin shell noindex | Same + `X-Robots-Tag` |
| `/api` | robots Disallow | Same + `X-Robots-Tag` |
| `/vote` | robots Disallow | + client noindex + header |
| `/me`, `/hall`, `/halls`, `/tonight`, `/profile`, `/settings`, `/onboarding` | Crawlable SPA chrome | robots Disallow + `X-Robots-Tag` + `useNoIndex()` on shells |

### 5. New SEO landing pages (P1)

| URL | Purpose |
|-----|---------|
| `/firehouse-meals` | Exact-match pillar for “firehouse meals” |
| `/firefighter-dinner-ideas` | Exact-match for already-#1 dinner-ideas intent |
| `/crew-meals` | Firefighter-qualified “crew meals” hub |

Each uses existing `SeoLandingPage` template: unique copy, FAQs + FAQ schema, breadcrumbs, Org/WebSite schema, recipe cards, related pillars, generator CTA via InternalLinkHub.

### 6. Recipe internal linking (P1)

| Link type | Before | After |
|-----------|--------|-------|
| Related recipes | Yes (`relatedSlugs` + clusters) | Unchanged |
| Pillar page | Missing | Auto via `pickRecipePillarLink` |
| Guide | Missing | Auto via `pickRecipeGuideLink` |
| Hub | `InternalLinkHub` imported but unused | **Rendered** on golden recipe pages |

### 7. Recipe schema (P1)

| Block | Before | After |
|-------|--------|-------|
| Recipe | Yes | Yes |
| Breadcrumb | Yes | Yes |
| Organization (top-level) | Missing on golden recipes | **Added** |
| WebSite + SearchAction | Missing on recipe pages | **Added** |
| AggregateRating | Missing | **Added when** crew votes ≥ public threshold (10) |
| Canonical / hero / ALT / title / description | Present | Unchanged |

### 8. EEAT

| Page | Status |
|------|--------|
| `/about` | H1 clarified to “About Firehall Meals”; link to testing standard; 2–20 / beginner framing |
| `/how-we-test-recipes` | **New** — firefighter authorship, shift testing, beginner clarity, hold quality, FAQs + schema |

### 9. Technical performance

| Item | Finding | Action |
|------|---------|--------|
| Hero LCP | `HeroImage` already uses `fetchpriority=high` / eager on home + recipes | No UI change |
| Lazy routes | App already code-splits most pages | Kept |
| Main chunk | Build still warns ~1.1MB `index-*.js` | Documented as remaining risk — splitting further needs a dedicated bundle pass |
| CLS | No regression introduced | — |

---

## Files modified / added

### Added
- `client/src/lib/seo/use-noindex.ts`
- `client/src/pages/how-we-test-recipes.tsx`
- `shared/seo/recipe-authority-links.ts`
- `review/seo-implementation-report.md` (this file)

### Modified (high signal)
- `server/seo/sitemap.ts` — robots Disallow expansion, static fallback helpers, `how-we-test-recipes` static path, safer XML escape
- `server/routes.ts` — sitemap/robots try/catch + fallback; `X-Robots-Tag` middleware
- `shared/seo/constants.ts` — title/description sync
- `client/index.html` — description / OG / Twitter sync
- `client/public/robots.txt` + regenerated `client/public/sitemap.xml` (407 URLs)
- `shared/seo/landing-pages-data.ts` — 3 new pillars
- `shared/seo/schema.ts` — AggregateRating support
- `shared/seo/metadata.ts` — `buildHowWeTestRecipesSeo`, richer About meta
- `client/src/App.tsx` — routes for new landings + how-we-test
- `client/src/pages/golden-recipe-page.tsx` — Org/WebSite/AggregateRating + authority links + hub
- `client/src/components/seo/recipe-internal-links.tsx` — pillar/guide block
- `client/src/components/seo/internal-link-hub.tsx` — new pillars + how-we-test
- `client/src/pages/about.tsx` — EEAT copy + link
- `client/src/pages/home.tsx` — live recipe count for SEO
- `client/src/pages/me-page.tsx`, `tonight-page.tsx`, `vote.tsx`
- `client/src/components/app-shell/me-subpage-shell.tsx`, `hall/hall-shell.tsx`

---

## Validation results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **Pass** |
| `npm run build` | **Pass** |
| `npm run catalog:generate-sitemap` | **407 URLs** |
| Local sitemap includes home, categories hubs, landings, guides, recipes | **Yes** |
| New landings in sitemap | `/firehouse-meals`, `/firefighter-dinner-ideas`, `/crew-meals` |
| `npm run check` | **Fails on pre-existing** `scripts/test-shift-dashboard.ts` assertion (unrelated to SEO) |
| Live production sitemap | Still **500 until deploy** of this branch |
| Schema validate script | Catalog count heuristic warning only (104 vs expected 100) — pre-existing |

---

## Remaining recommendations (not blocking)

1. **Deploy immediately** and re-verify `https://www.firehallmeals.com/sitemap.xml` returns 200; submit/resubmit in GSC.
2. **SSR/prerender** for `/`, landings, recipes, guides (audit P1) — still client `useEffect` head mutation.
3. **Main JS chunk split** — reduce LCP risk on mobile (manualChunks / route weight).
4. **Guide cannibalization** merge for overlapping “cook for 10” guides (audit P2).
5. **Off-page / backlinks** — still the largest authority gap vs FRESH/.gov PDFs.
6. **AggregateRating ethics** — mapped from thumbs-up approval → 1–5 scale only when ≥10 votes; monitor GSC rich-result warnings.
7. Confirm `/explore?q=` SearchAction param still resolves (audit P3).

---

## Estimated SEO impact

| Change | Expected impact |
|--------|-----------------|
| Sitemap 200 after deploy | High — restores efficient discovery/recrawl for 400+ URLs |
| Homepage meta sync | Medium-High — protects #1 `firefighter meals` CTR/snippet consistency |
| New pillars | Medium — captures exact-match `firehouse meals` / `crew meals` / dinner-ideas depth |
| Recipe → pillar/guide graph | Medium — stronger topical authority and crawl paths |
| App noindex | Medium — reduces thin/app URL index bloat |
| EEAT pages | Low-Medium — helps trust vs institutional PDFs over time |
| AggregateRating | Low-Medium — richer results where vote volume exists |

**Overall:** Moves technical score from ~72 toward ~85 once production sitemap is confirmed healthy; topical authority improved with three exact-match pillars.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Production sitemap still 500 until deploy | Static fallback + try/catch; deploy ASAP and smoke-test |
| AggregateRating from thumbs mapping | Threshold gate (≥10 votes); can disable if GSC flags |
| New landings vs existing `/firehouse-recipes` | Distinct intent (meals hub vs recipes hub); cross-linked |
| `npm run check` red on shift-dashboard | Pre-existing; not introduced by this work |
| Larger recipe page payload (hub + links) | Lazy-loaded page chunk; no above-fold UI redesign |

---

## Deploy checklist

1. Deploy this branch to production.
2. `curl -I https://www.firehallmeals.com/sitemap.xml` → expect **200**, `application/xml`.
3. `curl https://www.firehallmeals.com/robots.txt` → confirm new Disallows + Sitemap line.
4. Spot-check `/firehouse-meals`, `/firefighter-dinner-ideas`, `/crew-meals`, `/how-we-test-recipes`.
5. Spot-check a recipe: view-source / DevTools → Org + Recipe JSON-LD; pillar + guide links visible.
6. GSC → Sitemaps → resubmit `https://www.firehallmeals.com/sitemap.xml`.
7. URL Inspection on `/` → confirm title matches keyword-first string (no “Meal App” drift).
