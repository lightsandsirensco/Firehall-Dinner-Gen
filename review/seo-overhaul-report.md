# Firehall Meals — Complete SEO Overhaul Report

**Date:** 2026-05-29  
**Goal:** Rank page 1 for firefighter meal searches while preserving Firehall Meals brand identity.

---

## 1. Files modified

| Area | Files |
|------|--------|
| **SEO constants & metadata** | `shared/seo/constants.ts`, `shared/seo/metadata.ts`, `shared/seo/schema.ts`, `shared/seo/index.ts`, `shared/seo/recipe-image-seo.ts` |
| **SEO landing pages (new)** | `shared/seo/landing-pages-data.ts`, `client/src/pages/seo-landing-page.tsx` |
| **Blog architecture (new)** | `shared/editorial/blog-outlines-data.ts` |
| **Homepage** | `client/index.html`, `client/src/pages/home.tsx`, `client/src/components/home/home-hero.tsx`, `client/src/components/home/home-seo-intro.tsx`, `client/src/components/home/home-seo-editorial.tsx`, `client/src/lib/brand-copy.ts` |
| **FAQ** | `client/src/lib/seo/home-faq.ts`, `client/src/pages/faq.tsx`, `client/src/lib/seo/use-home-seo.ts` |
| **Routing** | `client/src/App.tsx` |
| **Internal linking** | `client/src/components/seo/internal-link-hub.tsx` |
| **Image SEO** | `client/src/pages/golden-recipe-page.tsx`, `client/src/pages/recipes-index.tsx` |
| **Technical SEO** | `server/seo/sitemap.ts`, `client/src/lib/seo/site-origin.ts` |

---

## 2. Metadata changes

### Homepage (implemented)

| Element | Value |
|---------|--------|
| **Title** | `Firefighter Meals & Firehall Recipes \| Firehall Meals` |
| **Meta description** | Discover firefighter meals, firehall recipes, crew dinners, BBQ ideas, healthy station meals, and firefighter cooking classics. Built by firefighters. Tested in the firehall. |
| **Canonical** | `https://www.firehallmeals.com/` |
| **H1** | `Firefighter Meals & Firehall Recipes` |

### Brand messages (above the fold — preserved)

- **Tagline:** Built by Firefighters. Tested in the Firehall.
- **Mission:** Get rid of the "What's for Dinner?" debate every shift.
- **Brand name:** Firehall Meals (visible in hero)

### Other page metadata updates

- Generator, Explore, Recipes index — reframed around *firefighter meals* (not "meal generator")
- Category pages — `Firehall Meals` suffix (not `FirehallMeals`)
- FAQ page — H1: *Firefighter & Firehall Meal FAQ*

---

## 3. New pages created

Seven dedicated SEO landing pages at priority **0.9** in sitemap:

| URL | H1 |
|-----|-----|
| `/firefighter-meals` | Firefighter Meals |
| `/firefighter-recipes` | Firefighter Recipes |
| `/firehouse-recipes` | Firehouse Recipes |
| `/fire-station-meals` | Fire Station Meals |
| `/healthy-firefighter-meals` | Healthy Firefighter Meals |
| `/firefighter-breakfast-recipes` | Firefighter Breakfast Recipes |
| `/firefighter-bbq-recipes` | BBQ Firefighter Recipes |

Each page includes:
- Unique title, meta description, H1
- ~900–1,100 words of firefighter-voice copy
- Curated recipe links from Golden 100 catalog
- FAQ section with FAQPage schema
- Related topic internal links
- `InternalLinkHub` sidebar

---

## 4. Schema added / validated

| Schema | Where |
|--------|--------|
| **Organization** | Homepage, landing pages, guides |
| **WebSite + SearchAction** | Homepage, landing pages |
| **CollectionPage** | Homepage (recipe catalog hub) |
| **FAQPage** | Homepage (12 FAQs), landing pages, `/faq` |
| **BreadcrumbList** | Homepage, landing pages, recipes, guides |
| **Recipe** | Existing on `/recipes/:slug` (unchanged) |
| **Article** | Existing on `/guides/:slug` (unchanged) |

`npm run check` passes including TypeScript and stage-5 platform validation.

---

## 5. Internal linking changes

- **Homepage intro** — links to all primary SEO landing pages + `/recipes`
- **Home SEO editorial** — 13 keyword-rich internal links
- **InternalLinkHub** — expanded with firefighter meals, recipes, firehouse recipes, healthy/breakfast/BBQ landing pages, Classics Wheel
- **Landing pages** — cross-link related topics + curated recipes + hub sidebar
- **Hero CTA order** — Browse Recipes primary, Find a Meal secondary

---

## 6. SEO improvements by phase

| Phase | Status |
|-------|--------|
| Homepage metadata + H1 + intro | ✅ Done |
| Brand messages preserved above fold | ✅ Done |
| Structured data (Org, WebSite, FAQ, Breadcrumb) | ✅ Done |
| 7 SEO landing pages | ✅ Done |
| Internal linking clusters | ✅ Done |
| Image alt text helpers + recipe pages | ✅ Done (lazy loading already in `hero-image.tsx`) |
| Sitemap + robots + canonical www | ✅ Done |
| Weak "generator" language reduced | ✅ Done |
| Blog content architecture (8 outlines) | ✅ Done (`shared/editorial/blog-outlines-data.ts`) |
| Firefighter FAQ expansion (12 Q&As) | ✅ Done |
| Content voice audit (major pages) | ✅ Done |

---

## 7. Remaining opportunities

| Item | Priority | Notes |
|------|----------|-------|
| **Publish blog articles** from outlines | HIGH | Outlines ready; write + `content:generate-guides` |
| **Physical image filename migration** | MEDIUM | Alt text done; disk rename is batch job via `suggestRecipeImageFilename()` |
| **Image compression pass** | MEDIUM | Audit hero JPG weights in `/images/golden-100/` |
| **Homepage UX simplification** | MEDIUM | Mobile audit: shorten hero, reduce duplicate CTAs |
| **Search Console** | HIGH | Verify www canonical, resubmit sitemap |
| **Backlinks / authority** | HIGH | External — department shares, fire service forums |
| **Core Web Vitals audit on production** | MEDIUM | Run Lighthouse on live www |
| **www redirect** | HIGH | Ensure host redirects apex → www (DNS/server config) |

---

## 8. Estimated ranking impact

| Keyword | 4–8 weeks | 3–6 months | Notes |
|---------|-----------|------------|-------|
| **Firefighter Meals** (primary) | Impressions + CTR lift | Top 10–20 realistic | Title/H1/landing page alignment |
| **Firefighter Recipes** | Improved relevance signals | Top 10–20 with content depth | 150+ catalog + landing page |
| **Firehall Meals** | Brand SERP consolidation | Strong brand panel | Brand in title suffix |
| **Firehouse Recipes** | Long-tail impressions | Top 15–25 | Dedicated landing page |
| **Fire Station Meals** | Long-tail impressions | Top 15–25 | Dedicated landing page |
| **Healthy / Breakfast / BBQ long-tail** | Featured snippet potential | Top 10–30 | FAQ + landing pages |

Page 1 for all primary terms simultaneously requires **time + backlinks + continued content publishing**. This overhaul fixes the largest on-page gap: **topical authority + brand-aligned keyword targeting**.

---

## Brand compliance checklist

- [x] "Built by Firefighters. Tested in the Firehall." — hero + intro
- [x] "Get rid of the 'What's for Dinner?' debate every shift." — hero mission line
- [x] Firehall Meals brand name preserved
- [x] Firefighter-first voice (crew, hall, station, shift, rookie)
- [x] Not repositioned as generic recipe blog
- [x] Find a Meal / Classics Wheel remain as supporting features

---

## Validation commands

```bash
npm run check
npm run seo:validate-schema
npm run catalog:verify
```

After deploy:
1. View-source homepage — confirm title, canonical, H1
2. Google Search Console — inspect URLs, submit sitemap
3. Rich Results Test — homepage + one landing page + one recipe
