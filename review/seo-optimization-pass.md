# FirehallMeals — SEO Optimization Pass

**Date:** 2026-05-29  
**Primary goal:** Rank page 1 for firefighter recipe / meal intent — positioned as **the largest collection of firefighter recipes**, not a meal generator.

---

## 1. New homepage title tag (implemented)

**Selected (best SEO + CTR balance):**

```text
Firefighter Recipes & Firefighter Meals | FirehallMeals
```

**Why this beat the alternative:**

| Option | Pros | Cons |
|--------|------|------|
| **Firefighter Recipes & Firefighter Meals \| FirehallMeals** ✓ | Hits both primary keywords; ~52 chars (fits SERP); brand at end for recognition | Slightly less long-tail variety |
| Firefighter Recipes, Firehouse Meals & Dinner Ideas \| FirehallMeals | More keyword variants | ~62 chars — likely truncates; weaker primary repetition |

**Not used:** “Firehall Meal Generator” or generator-first framing.

**Files updated:** `shared/seo/constants.ts`, `client/index.html`, runtime via `buildHomeSeo()`.

---

## 2. New homepage meta description (implemented)

```text
Browse 150+ firefighter recipes and firehouse meals sized for the crew — shift dinners, healthy hall picks, BBQ favorites, and rookie-friendly steps. Built by firefighters for station kitchens.
```

**Covers:** firefighter recipes, firehouse meals, dinner/shift context, healthy options, crew cooking, E-E-A-T (built by firefighters).  
**Does not lead** with the generator.

---

## 3. New homepage H1 (implemented)

```text
Firefighter Recipes Built for the Crew
```

**Supporting visible copy:**

- Eyebrow: `Firefighter recipes · Firehouse meals · Hall-tested`
- Brand line: `Firehall Meals · Firefighter Built. Firehall Tested.`
- Subline: positions site as **largest collection** of firefighter recipes and firehouse meals

**Previous issue:** H1 was brand name only (`Firehall Meals`) — Google saw a brand, not a recipe authority.

**File:** `client/src/components/home/home-hero.tsx`, `client/src/lib/brand-copy.ts`

---

## 4. Recommended homepage copy changes

### Implemented in this pass

| Section | Change |
|---------|--------|
| Hero H1 / eyebrow / subline | Recipe-first positioning |
| Featured rails | SEO headings: Popular firefighter recipes, Quick firehouse meal ideas, BBQ firehall favorites, Healthy firefighter meals |
| SEO editorial block | Recipe catalog first; generator last in link list |
| How it works step 3 | Browse recipes before Find a Meal |
| FAQ answer | Catalog first, tools second |
| Internal link hub | Recipes + categories before generator |

### Recommended next (content pass — not all implemented)

| Section | Recommendation | Priority |
|---------|----------------|----------|
| **Above-fold CTA order** | Primary: “Browse Recipes” · Secondary: “Find a Meal” | HIGH |
| **Trust strip** | Add line: “150+ firefighter recipes” (not “12 categories”) | MEDIUM |
| **Remove / shorten** | Duplicate CTA bands that repeat generator | MEDIUM |
| **Intro paragraph** | 2–3 sentences under hero with natural use of *firehouse recipes*, *fire station meals*, *meals for firefighters* | HIGH |
| **Recently added rail** | H2: “New firefighter recipes” (supports freshness) | MEDIUM |

---

## 5. SEO priority list

### HIGH impact (0–4 weeks)

1. **Homepage title, H1, meta** — done  
2. **Sitemap priority** — `/recipes` + `/explore` > `/generator` — done  
3. **CollectionPage schema** on homepage — done  
4. **Category title tags** — keyword-rich patterns — done  
5. **Internal links** — recipe clusters first — done  
6. Submit updated sitemap in Search Console  
7. Add 2–3 editorial guides targeting “firefighter dinner ideas” with links to `/recipes` clusters  

### MEDIUM impact (1–3 months)

8. Recipe page title template audit (ensure `{Dish} | Firefighter {Format} Recipe | FirehallMeals`)  
9. Image `alt` audit on golden heroes — include dish + “firefighter meal” where natural  
10. Build hub pages: `/guides/topic/firefighter-meals` ← already in sitemap; expand copy  
11. Earn links from fire service blogs / nutrition resources  
12. FAQ schema expansion with “firefighter recipes” questions  

### LOW impact / ongoing

13. OpenGraph image branded for recipe collage  
14. `hreflang` if expanding beyond EN  
15. Core Web Vitals on recipe pages  

---

## 6. Expected ranking impact

| Keyword cluster | Current likely state | Expected after 3–6 months |
|-----------------|----------------------|---------------------------|
| firefighter recipes | Competing; weak H1/title alignment | Top 10–20 realistic with content + links |
| firefighter meals | Moderate alignment | Top 10–15 |
| firehouse recipes | Long-tail; good catalog fit | Top 5–15 |
| fire station meals | Long-tail | Top 10–20 |
| firefighter dinner ideas | Guides + FAQ help | Top 15–30 |
| meals for firefighters | Semantic match in copy | Top 15–30 |
| firehall meals | Branded + partial match | Top 3–10 (brand + niche) |
| firefighter meal generator | Was over-weighted | Deliberately de-prioritized |

**Realistic framing:** Page 1 for all seven phrases simultaneously requires backlinks, content depth, and time. This pass fixes **topical clarity** (biggest technical/on-page gap). Expect **improved impressions and CTR within 4–8 weeks**; ranking lifts **3–9 months** depending on competition and link velocity.

---

## Keyword map

### Primary

| Keyword | Target URL | On-page signal |
|---------|------------|----------------|
| firefighter recipes | `/`, `/recipes`, `/explore` | Title, H1, Collection schema |
| firefighter meals | `/`, `/recipes` | Title, meta, body copy |

### Secondary

| Keyword | Target URL |
|---------|------------|
| firehouse recipes | `/recipes`, category hubs |
| fire station meals | `/recipes`, guides |
| shift worker meals | `/categories/quick_meals` |
| dinner ideas for firefighters | `/guides`, `/faq` |

### Long-tail

| Keyword | Target URL |
|---------|------------|
| healthy firefighter recipes | `/categories/healthy_options` |
| meals for large fire crews | `/categories/feed_a_crowd` |
| rookie firefighter recipes | Recipe pages with `rookie_friendly` tag |
| firehall dinner ideas | `/`, `/explore` |
| BBQ firehall meals | `/categories/bbq_smoker` |

---

## Technical SEO audit

| Item | Status | Notes |
|------|--------|-------|
| Title tags | ✅ Updated homepage + key templates | Per-route via `usePageSeo` |
| Meta descriptions | ✅ Homepage + explore/recipes/generator | |
| Canonical tags | ✅ `apply-page-seo.ts` | Dynamic per route |
| OpenGraph | ✅ og:title, description, image | Synced in `index.html` |
| Twitter cards | ✅ summary_large_image | |
| Sitemap | ✅ Dynamic XML | Recipes prioritized over generator |
| robots.txt | ✅ Allow /, block /admin, /api | |
| Recipe schema | ✅ `buildRecipeSchema` | Recipe + HowToStep |
| Organization schema | ✅ | knowsAbout keywords updated |
| Breadcrumb schema | ✅ | Recipe + guide pages |
| Collection schema | ✅ NEW `buildHomeRecipeCollectionSchema` | Homepage |
| Image alt text | ⚠️ Partial | Recipe pages use descriptive alts; audit remaining cards |

---

## Schema summary

| Type | Where | Purpose |
|------|-------|---------|
| Organization | Homepage | Brand + knowsAbout keywords |
| WebSite + SearchAction | Homepage | Site search → `/recipes?q=` |
| CollectionPage | Homepage | Recipe catalog authority |
| FAQPage | Homepage | FAQ rich results |
| Recipe | `/recipes/:slug` | Rich recipe results |
| BreadcrumbList | Recipes, guides | SERP hierarchy |
| Article | Hall guides | Editorial depth |

---

## Internal linking / topic clusters

```
Homepage
├── /recipes (hub)
├── /explore (catalog)
├── /categories/crew_favorites
├── /categories/quick_meals
├── /categories/healthy_options
├── /categories/bbq_smoker
├── /recipes/{slug} (spoke)
├── /guides (editorial)
└── /generator (tool — deprioritized)
```

**Popular recipe spokes (linked from InternalLinkHub):** chicken-parm, smash-burgers, pulled-pork, bbq-chicken-bowls, steak-tacos, big-chili.

---

## Repositioning summary

| Before | After |
|--------|-------|
| Identity: crew dinner app / generator | Identity: **firefighter recipe collection** |
| H1: Firehall Meals | H1: **Firefighter Recipes Built for the Crew** |
| Generator in sitemap 0.95 | Generator **0.7**; recipes/explore **0.95** |
| Generator-first FAQ | Catalog-first FAQ |

---

## Files changed (implementation)

- `shared/seo/constants.ts`
- `shared/seo/metadata.ts`
- `shared/seo/schema.ts`
- `client/index.html`
- `client/src/lib/brand-copy.ts`
- `client/src/components/home/home-hero.tsx`
- `client/src/components/home/home-featured-meals.tsx`
- `client/src/components/home/home-seo-editorial.tsx`
- `client/src/components/home/home-how-it-works.tsx`
- `client/src/components/seo/internal-link-hub.tsx`
- `client/src/lib/seo/use-home-seo.ts`
- `client/src/lib/seo/home-faq.ts`
- `client/src/pages/home.tsx`
- `server/seo/sitemap.ts`

---

## Post-deploy checklist

- [ ] Verify live homepage `<title>` and meta in view-source  
- [ ] Google Search Console → URL inspection for `/`  
- [ ] Resubmit `sitemap.xml`  
- [ ] Monitor impressions for “firefighter recipes” vs “meal generator” queries  
- [ ] Track CTR on new title (Search Console → Performance)
