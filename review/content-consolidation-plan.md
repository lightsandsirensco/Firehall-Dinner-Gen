# Content Consolidation Plan

**Status:** Plan only — **do not implement** until this document is approved.  
**Date:** 2026-07-17  
**Scope:** 58 guides · 10 SEO landings · 10 product SEO pages · related hubs (`/explore`, `/breakfast`, `/wheel`, etc.)

**Goal:** Collapse identical search-intent clusters so Firehall Meals ranks **one cornerstone URL per intent**, without losing unique operational content.

---

## Executive summary

| Layer | Main problem | Target state |
|-------|--------------|--------------|
| Guides | ~5 critical clusters with 3–5 near-duplicate URLs | ≤2 live URLs per cluster |
| Landings | Soft keyword bleed (`crew meals`, `station meals`, `firefighter meals`) | Keep all 10; differentiate keywords + H1 jobs |
| Product SEO | Mostly unique tool intent; soft overlap with planning/grocery guides | Keep all 10; tighten cross-links and titles |

**Proposed hard redirects:** **18 guide 301s**  
**Proposed merges into cornerstones:** **18** (same set — fold content, then redirect)  
**Landings to redirect:** **0** (differentiate instead)  
**Product pages to redirect:** **0**

**Net guide URLs after consolidation:** 58 → **~40** live guides (+ redirects preserving equity)

---

## Inventory audited

| Surface | Count | Source |
|---------|------:|--------|
| Guides | 58 | `client/public/content/guides/index.json` |
| Keyword landings | 10 | `shared/seo/landing-pages-data.ts` |
| Product SEO pages | 10 | `shared/seo/product-pages-data.ts` |
| Format hubs | breakfast / smoothies / pizza / wheel / explore | existing routes |

**Already redirected (keep):** `/guides/top-firehall-classics` → `/guides/10-classic-firehall-meals`

---

## Consolidation principles

1. **One primary SERP URL per intent.** Secondary URLs 301 to the cornerstone after content is folded in.
2. **Never hard-delete.** Redirect forever; preserve FAQ answers, unique H2s, and recipe picks.
3. **Landings own commercial head terms.** Guides own how-to / list depth. Product pages own tool intent.
4. **Differentiate before redirecting** when two URLs can own distinct modifiers (e.g. “under 30 minutes” vs “between calls”).
5. **Update inbound links** in landings, product pages, recipe authority links, InternalLinkHub, and `relatedArticleSlugs` before or with the 301 ship.
6. **Publish merged cornerstone first** (content + lastmod), then flip redirects in the same deploy.

---

# Cluster plans

Severity: **Critical** · **High** · **Medium** · **Soft** (differentiate only)

---

## Cluster A — Large crew / cooking for 10 (CRITICAL)

### Competing URLs

| URL | Current intent |
|-----|----------------|
| `/guides/cooking-for-10-firefighters` | Exact “cooking for 10” + formats |
| `/guides/feeding-ten-firefighters` | Feeding ten — formats/shortcuts |
| `/guides/meals-feeding-10-firefighters` | Meals + shopping for ~10 |
| `/guides/best-firehouse-meals-large-crews` | Large crews / past eight |
| `/guides/feeding-a-firehall-crew` | Broader ops (hold, tones, line) |
| `/crew-meals` (landing) | Commercial “crew meals” hub |

### Canonical cornerstone

**Guide:** `/guides/cooking-for-10-firefighters`  
**Landing (keep, do not redirect):** `/crew-meals` — owns head term *crew meals*; guide owns *cooking/feeding 10 firefighters*.

### Redirect

| From | To |
|------|-----|
| `/guides/feeding-ten-firefighters` | `/guides/cooking-for-10-firefighters` |
| `/guides/meals-feeding-10-firefighters` | `/guides/cooking-for-10-firefighters` |
| `/guides/best-firehouse-meals-large-crews` | `/guides/cooking-for-10-firefighters` |

### Merge (fold then redirect)

Fold unique content from the three redirect targets into the cornerstone (see **Merged outline A** below).

### Differentiate (keep live)

| URL | New job (retarget before ship) |
|-----|--------------------------------|
| `/guides/feeding-a-firehall-crew` | **Ops only:** interruption mid-prep, hold times, running the line like an incident — strip “cooking for 10 / large crew recipe list” language; title toward “Feed a firehall crew when tones drop” |
| `/crew-meals` | Commercial hub; link to cornerstone as primary guide spoke |

### Unique content to preserve before redirect

| Source | Must keep in cornerstone |
|--------|--------------------------|
| `feeding-ten-firefighters` | Format shortcuts for ten (line, tray, Dutch oven) |
| `meals-feeding-10-firefighters` | Shopping/portion table for ~10 |
| `best-firehouse-meals-large-crews` | “Past eight / battalion drop-in” scaling notes; FAQ phrasing “firehouse meals for large crews” |
| `feeding-a-firehall-crew` (if any recipe-list overlap removed) | Keep only on the differentiated ops page |

### Expected SEO impact

- Stop splitting “meals for 10 firefighters” / “cooking for 10 firefighters” / “large crew firehouse meals” across 4–5 URLs.
- Cornerstone should consolidate impressions and climb for exact-match *cooking for 10* / *feeding 10 firefighters*.
- `/crew-meals` should gain from clearer spoke (less guide competition on same phrases).

---

## Cluster B — Breakfast (CRITICAL)

### Competing URLs

| URL | Role |
|-----|------|
| `/guides/firefighter-breakfast-guide` | Deepest guide |
| `/guides/firefighter-breakfast-ideas` | Idea listicle |
| `/guides/firehall-breakfast-and-brunch` | Brunch + cleanup/handoff |
| `/firefighter-breakfast-recipes` | Landing / recipe hub |
| `/breakfast` | Format catalog |

### Canonical cornerstone

**Guide:** `/guides/firefighter-breakfast-guide`  
**Landing (keep):** `/firefighter-breakfast-recipes`  
**Catalog (keep):** `/breakfast`

### Redirect

| From | To |
|------|-----|
| `/guides/firefighter-breakfast-ideas` | `/guides/firefighter-breakfast-guide` |
| `/guides/firehall-breakfast-and-brunch` | `/guides/firefighter-breakfast-guide` |

### Merge

Fold ideas list + brunch/handoff into cornerstone (**Merged outline B**).

### Differentiate

| URL | Job |
|-----|-----|
| Landing | Own “firefighter breakfast **recipes**” |
| Guide | Own “firefighter breakfast” / station morning ops narrative |
| `/breakfast` | Indexed recipe index — not a second guide |

### Unique content to preserve

| Source | Fold as |
|--------|---------|
| `firefighter-breakfast-ideas` | H2: “10 breakfast formats that feed staggered eaters” + recipe grid |
| `firehall-breakfast-and-brunch` | H2: “Brunch & day-shift handoff / cleanup” |

### Expected SEO impact

- One guide ranks for breakfast how-to; landing ranks for recipe SERPs.
- Reduce three-way cannibalization on `fire station breakfast`.

---

## Cluster C — Healthy firefighter meals (CRITICAL)

### Competing URLs

| URL | Overlap |
|-----|---------|
| `/guides/healthy-meals-that-still-taste-good` | Healthy + taste |
| `/guides/healthy-firefighter-meals-fill-you-up` | Healthy + filling |
| `/guides/healthy-meals-for-active-crews` | Healthy + active crews |
| `/guides/high-protein-firehall-meals` | High protein (keep if differentiated) |
| `/healthy-firefighter-meals` | Landing |

### Canonical cornerstone

**Guide:** `/guides/healthy-meals-that-still-taste-good`  
**Landing (keep):** `/healthy-firefighter-meals`

### Redirect

| From | To |
|------|-----|
| `/guides/healthy-firefighter-meals-fill-you-up` | `/guides/healthy-meals-that-still-taste-good` |
| `/guides/healthy-meals-for-active-crews` | `/guides/healthy-meals-that-still-taste-good` |

### Keep (differentiated)

| URL | Required retarget |
|-----|-------------------|
| `/guides/high-protein-firehall-meals` | Keywords/title stay **high protein** — remove primary keyword `healthy firefighter meals` |
| Landing | Owns head term `healthy firefighter meals`; guide SEO title avoids exact duplicate of landing H1 |

### Unique content to preserve

| Source | Fold as |
|--------|---------|
| `…fill-you-up` | Section “Fill you up without pizza afterward” (volume/protein) |
| `…active-crews` | Section “Week balance for active crews” + flavor tricks |

### Expected SEO impact

- Landing consolidates commercial head term; guide becomes the deep spoke.
- End three guides fighting the same exact phrase.

---

## Cluster D — Comfort / post-busy / recovery meals (HIGH)

### Competing URLs

| URL | Intent |
|-----|--------|
| `/guides/comfort-food-after-a-long-shift` | Post-call comfort |
| `/guides/firehouse-comfort-meals` | Comfort recipe list |
| `/guides/best-meals-after-busy-shift` | After busy shift |
| `/guides/recovery-meals-after-hard-calls` | Recovery meals (recipe-ish) |
| `/guides/firefighter-recovery-nutrition` | Nutrition framework (keep) |

### Canonical cornerstone

**Guide:** `/guides/comfort-food-after-a-long-shift`

### Redirect

| From | To |
|------|-----|
| `/guides/firehouse-comfort-meals` | `/guides/comfort-food-after-a-long-shift` |
| `/guides/best-meals-after-busy-shift` | `/guides/comfort-food-after-a-long-shift` |
| `/guides/recovery-meals-after-hard-calls` | `/guides/comfort-food-after-a-long-shift` |

### Keep

`/guides/firefighter-recovery-nutrition` — fluids/protein framework (not a comfort listicle). Cross-link to comfort cornerstone.

### Unique content to preserve

| Source | Fold as |
|--------|---------|
| `firehouse-comfort-meals` | “Hall hits that never get voted off” recipe block |
| `best-meals-after-busy-shift` | Timing dinner after a hard job |
| `recovery-meals-after-hard-calls` | Soft kitchen / read-the-room notes (1 short H2); nutrition deep-link |

### Expected SEO impact

- One URL for “comfort food after shift / busy shift meals.”
- Recovery nutrition keeps a distinct SERP lane.

---

## Cluster E — Quick / busy / under 30 (HIGH)

### Competing URLs

| URL | Nuance |
|-----|--------|
| `/guides/quick-meals-between-calls` | Between calls / tones |
| `/guides/fast-firehall-meals-under-30-minutes` | ≤30 clock |
| `/guides/best-firehall-meals-busy-nights` | Busy-night picks |
| `/guides/busy-shift-dinner-strategies` | Ops strategies |
| `/guides/planning-tonights-station-dinner` | Decision tree (keep) |

### Canonical cornerstones (2 live)

| Role | Canonical |
|------|-----------|
| Recipe / interruption | `/guides/quick-meals-between-calls` |
| Ops strategies | `/guides/busy-shift-dinner-strategies` |

### Redirect

| From | To |
|------|-----|
| `/guides/best-firehall-meals-busy-nights` | `/guides/quick-meals-between-calls` |

### Differentiate (keep)

| URL | Job |
|-----|-----|
| `/guides/fast-firehall-meals-under-30-minutes` | **Keep** only if title/keywords stay “under 30 minutes” and body is a strict timer filter — not a second “busy nights” essay |
| `/guides/planning-tonights-station-dinner` | Decision tree — cross-link, do not merge |

### Unique content to preserve

| Source | Fold as |
|--------|---------|
| `best-firehall-meals-busy-nights` | “Chaotic-shift picks” subsection + recipe grid into quick guide |

### Expected SEO impact

- Consolidate “busy night firehall meals” into quick cornerstone.
- Preserve a unique timer SERP with under-30 if differentiated.

---

## Cluster F — Meal prep (HIGH)

### Competing URLs

| URL | Overlap |
|-----|---------|
| `/guides/firehall-meal-prep-ideas` | Component prep ideas |
| `/guides/meal-prep-for-shift-workers` | Storage / reheat / shift workers |

### Canonical cornerstone

`/guides/firehall-meal-prep-ideas`

### Redirect

| From | To |
|------|-----|
| `/guides/meal-prep-for-shift-workers` | `/guides/firehall-meal-prep-ideas` |

### Unique content to preserve

Storage rules, reheat safety, second-shift plan → H2s on cornerstone.

### Expected SEO impact

- One URL for firehall/shift meal prep.

---

## Cluster G — 24-hour / long-shift fuel (HIGH)

### Competing URLs

| URL | Intent |
|-----|--------|
| `/guides/best-meals-24-hour-shift` | Meal plan across the tour |
| `/guides/eating-well-on-24-hour-shifts` | Same timing, nutrition framing |
| `/guides/best-foods-for-long-shifts` | Steady energy foods |

### Canonical cornerstone

`/guides/best-meals-24-hour-shift`

### Redirect

| From | To |
|------|-----|
| `/guides/eating-well-on-24-hour-shifts` | `/guides/best-meals-24-hour-shift` |

### Keep (narrow)

`/guides/best-foods-for-long-shifts` — retarget away from “24 hour shift meals”; own “foods for long shifts / steady energy.”

### Unique content to preserve

Overnight-without-second-production notes from `eating-well-on-24-hour-shifts`.

### Expected SEO impact

- One URL for “meals for a 24 hour shift.”

---

## Cluster H — BBQ guide ↔ landing (MEDIUM / title clash)

### Competing URLs

| URL | Intent |
|-----|--------|
| `/firefighter-bbq-recipes` | Landing — commercial hub |
| `/guides/firefighter-bbq-recipes` | Guide — recipe list (same name) |
| `/guides/bbq-night-at-the-station` | How to run BBQ night |

### Canonical roles (no redirect required)

| URL | Canonical job |
|-----|---------------|
| Landing `/firefighter-bbq-recipes` | Owns `firefighter bbq recipes` |
| Guide `/guides/bbq-night-at-the-station` | Owns BBQ **ops** |
| Guide `/guides/firefighter-bbq-recipes` | **Retitle** SEO to “Hall BBQ Recipe Picks” / “Firefighter BBQ Night Recipe List” — subordinate spoke to landing; or 301 → landing if content is thin after audit |

### Recommended action

1. Prefer **retitle + differentiate** the guide (keep URL to avoid unnecessary redirect).  
2. If guide is mostly a thinner landing clone → **301** `/guides/firefighter-bbq-recipes` → `/firefighter-bbq-recipes` and fold any unique tips into `bbq-night-at-the-station`.

### Decision gate (before implement)

- If guide unique word count of non-landing content **≥ 400** after stripping recipe grid → retitle/keep.  
- Else → redirect to landing; fold leftovers into BBQ night guide.

### Expected SEO impact

- End exact title collision between landing and guide.
- Landing wins commercial SERP; BBQ night wins how-to.

---

## Cluster I — Cultural / “what firefighters cook” listicles (MEDIUM–HIGH)

### Competing URLs

| URL | Angle |
|-----|-------|
| `/guides/most-popular-firefighter-meals` | Popularity top list |
| `/guides/25-firefighter-dinner-ideas` | Ideas listicle |
| `/guides/10-classic-firehall-meals` | Short classics |
| `/guides/meals-firefighters-actually-cook` | Real patterns |
| `/guides/meals-every-firefighter-knows` | Shared canon |
| `/guides/legendary-firehall-meals` | Stories |
| `/firefighter-dinner-ideas` | Landing |
| `/firehouse-meals` | Landing |

### Canonical cornerstones (keep 4 guides + 2 landings)

| Keep | Job |
|------|-----|
| `/guides/most-popular-firefighter-meals` | Popularity |
| `/guides/25-firefighter-dinner-ideas` | Ideas depth for landing |
| `/guides/10-classic-firehall-meals` | Classics short list (+ wheel link) |
| `/guides/legendary-firehall-meals` | Story/culture |
| `/firefighter-dinner-ideas` | Commercial hub |
| `/firehouse-meals` | Classic firehouse meals hub |

### Redirect

| From | To |
|------|-----|
| `/guides/meals-every-firefighter-knows` | `/guides/meals-firefighters-actually-cook` |

### Soft merge option (Phase 2)

If `meals-firefighters-actually-cook` remains thin after absorbing “every firefighter knows,” consider later 301 → `most-popular-firefighter-meals`. **Not in Wave 1.**

### Unique content to preserve

Canon list / “everyone knows” examples → section on `meals-firefighters-actually-cook`.

### Expected SEO impact

- Fewer overlapping “what firefighters cook” URLs.
- Landing `/firefighter-dinner-ideas` stops competing with three near-identical guides.

---

## Cluster J — Grocery / money (MEDIUM)

### Competing URLs

| URL | Intent |
|-----|--------|
| `/guides/firehall-grocery-planning` | Lists / pantry / shop once |
| `/guides/how-crews-split-groceries` | Cost splits |
| `/guides/cheap-firehall-meals` | Budget recipes (keep) |
| `/guides/avoid-living-on-takeout` | Anti-delivery systems (keep) |
| `/fire-hall-grocery-list` | Product SEO |
| `/crew-grocery-budget` | Product SEO |
| `/cost-per-plate-calculator` | Product SEO |

### Canonical cornerstone (guide)

`/guides/firehall-grocery-planning`

### Redirect

| From | To |
|------|-----|
| `/guides/how-crews-split-groceries` | `/guides/firehall-grocery-planning` |

### Keep product pages

Product pages own tool SERPs (`fire hall grocery list`, `crew grocery budget`). Guides own educational how-to. Cross-link both ways; do not redirect product ↔ guide.

### Unique content to preserve

Fair-split / drama prevention → H2 “How crews split the grocery bill” on planning guide.

### Expected SEO impact

- One guide for grocery planning + splits.
- Product pages remain free to rank tool queries.

---

## Cluster K — Kitchen culture (SOFT)

### Competing URLs

| URL | Intent |
|-----|--------|
| `/guides/firehall-kitchen-culture` | How culture works |
| `/guides/better-station-food-culture` | How to improve it |

### Recommendation

**Keep both** with explicit H1 split (descriptive vs how-to). Optional future merge into one “Station food culture” cornerstone — **not Wave 1**.

---

## Cluster L — Cooking vessel (SOFT — keep all)

| URL | Modifier |
|-----|----------|
| `/guides/one-pot-firehall-meals` | One-pot / cleanup |
| `/guides/best-firefighter-crockpot-meals` | Crockpot |
| `/guides/dutch-oven-meals-firefighters` | Dutch oven |

**Action:** Keep all three. Cross-link. Avoid identical chili intros.

---

## Cluster M — Keyword landings vs each other (SOFT — differentiate, no redirects)

| Landing | Primary job | Must stop competing on |
|---------|-------------|------------------------|
| `/firefighter-meals` | Head brand + “firefighter meals” | Drop secondary focus on exact “crew meals” / “station meals” in keywords |
| `/firefighter-recipes` | “firefighter recipes” catalog framing | Differentiate from firehouse recipes |
| `/firehouse-recipes` | “firehouse recipes / cooking” | Keep firehouse modifier |
| `/firehouse-meals` | Classic firehouse dinners | Avoid duplicating firefighter-meals intro |
| `/firefighter-dinner-ideas` | Stuck-crew ideas hub | Point to `25-…` guide; don’t clone list |
| `/crew-meals` | Portions / feeding a crew | Point to cooking-for-10 cornerstone |
| `/fire-station-meals` | Shift / station kitchen framing | Own “fire station meals” only |
| `/healthy-firefighter-meals` | Healthy hub | Point to healthy guide cornerstone |
| `/firefighter-breakfast-recipes` | Breakfast recipes hub | Point to breakfast guide |
| `/firefighter-bbq-recipes` | BBQ recipes hub | Point to BBQ night guide |

### Landing keyword cleanup (planned edits — not redirects)

| Landing | Remove / demote from `keywords[]` | Keep |
|---------|-----------------------------------|------|
| `/firefighter-meals` | Exact `crew meals`, `station meals` as primary peers | `firefighter meals`, `firehall meals` |
| `/firefighter-recipes` | Exact `firehouse recipes` | `firefighter recipes`, `crew recipes` |
| `/firehouse-meals` | Exact `firefighter meals` | `firehouse meals`, `firehouse dinner` |

### Expected SEO impact

- Cleaner query → URL mapping for pillars.
- Less internal competition on shared synonyms.

---

## Cluster N — Product SEO vs guides (SOFT)

Product pages are **tool/educational** intents. Do not merge into guides.

| Product URL | Related guide spoke (link, don’t redirect) |
|-------------|----------------------------------------------|
| `/hall-meal-planner` | `planning-tonights-station-dinner`, `organize-firehall-dinners` |
| `/firefighter-dinner-vote` | `planning-tonights-station-dinner`, `25-firefighter-dinner-ideas` |
| `/fire-hall-grocery-list` | `firehall-grocery-planning` (after merge) |
| `/crew-grocery-budget` | `cheap-firehall-meals`, `firehall-grocery-planning` |
| `/canteen-manager` / `/fire-hall-pantry` | `firehall-grocery-planning`, `station-kitchen-essentials` |
| `/firefighter-meal-calendar` | `best-meals-24-hour-shift`, `firehall-meal-prep-ideas` |
| `/classics-wheel` | `10-classic-firehall-meals`, `most-popular-firefighter-meals` |

**After guide redirects:** update `guideSlugs` in `product-pages-data.ts` to canonical URLs only.

---

## Guides that stay as-is (Wave 1)

`planning-tonights-station-dinner` · `organize-firehall-dinners` · `station-kitchen-essentials` · `hydration-for-firefighters` · `healthy-station-snacks` · `healthy-smoothies-at-the-hall` · `best-station-chili-recipes` · `firehall-taco-night-ideas` · `easy-firehall-pasta-recipes` · `cheap-firehall-meals` · `rookie-cooking-mistakes` · `rookie-firefighter-meal-guide` · `performance-nutrition-firefighters` · `meals-wont-wreck-energy-levels` · `eating-during-high-stress-shifts` · `avoid-living-on-takeout` · `nutrition-after-overnight-calls` · `firefighter-recovery-nutrition` · `busy-shift-dinner-strategies` · `one-pot-firehall-meals` · `best-firefighter-crockpot-meals` · `dutch-oven-meals-firefighters` · `bbq-night-at-the-station` · `most-popular-firefighter-meals` · `10-classic-firehall-meals` · `25-firefighter-dinner-ideas` · `legendary-firehall-meals` · `high-protein-firehall-meals` (after keyword retarget) · `best-foods-for-long-shifts` (after retarget) · `fast-firehall-meals-under-30-minutes` (if differentiated) · `firehall-kitchen-culture` · `better-station-food-culture` · `meals-firefighters-actually-cook` (absorbs knows) · `feeding-a-firehall-crew` (after ops retarget)

---

# Redirect map (complete)

Implement as **301** (server + any client `Redirect` routes). Never 302 for SEO consolidations.

| # | From | To | Cluster |
|---|------|-----|---------|
| 1 | `/guides/feeding-ten-firefighters` | `/guides/cooking-for-10-firefighters` | A |
| 2 | `/guides/meals-feeding-10-firefighters` | `/guides/cooking-for-10-firefighters` | A |
| 3 | `/guides/best-firehouse-meals-large-crews` | `/guides/cooking-for-10-firefighters` | A |
| 4 | `/guides/firefighter-breakfast-ideas` | `/guides/firefighter-breakfast-guide` | B |
| 5 | `/guides/firehall-breakfast-and-brunch` | `/guides/firefighter-breakfast-guide` | B |
| 6 | `/guides/healthy-firefighter-meals-fill-you-up` | `/guides/healthy-meals-that-still-taste-good` | C |
| 7 | `/guides/healthy-meals-for-active-crews` | `/guides/healthy-meals-that-still-taste-good` | C |
| 8 | `/guides/firehouse-comfort-meals` | `/guides/comfort-food-after-a-long-shift` | D |
| 9 | `/guides/best-meals-after-busy-shift` | `/guides/comfort-food-after-a-long-shift` | D |
| 10 | `/guides/recovery-meals-after-hard-calls` | `/guides/comfort-food-after-a-long-shift` | D |
| 11 | `/guides/best-firehall-meals-busy-nights` | `/guides/quick-meals-between-calls` | E |
| 12 | `/guides/meal-prep-for-shift-workers` | `/guides/firehall-meal-prep-ideas` | F |
| 13 | `/guides/eating-well-on-24-hour-shifts` | `/guides/best-meals-24-hour-shift` | G |
| 14 | `/guides/meals-every-firefighter-knows` | `/guides/meals-firefighters-actually-cook` | I |
| 15 | `/guides/how-crews-split-groceries` | `/guides/firehall-grocery-planning` | J |
| 16* | `/guides/firefighter-bbq-recipes` | `/firefighter-bbq-recipes` **OR keep + retitle** | H (gate) |

\*Decision gate in Cluster H.

**Also keep existing:**

| From | To |
|------|-----|
| `/guides/top-firehall-classics` | `/guides/10-classic-firehall-meals` |
| `/blog/top-firehall-classics` | `/guides/10-classic-firehall-meals` |
| `/blog/:slug` | Prefer canonical `/guides/:slug` (verify existing behavior) |

**Sitemap:** Remove redirected URLs from `buildSitemapXml` guide enumeration (or rely on 301 + lastmod on canonical only).

---

# Merged outlines

## Merged outline A — `/guides/cooking-for-10-firefighters`

**H1:** Cooking for 10 Firefighters (keep exact-match)

1. Why ten is the hall default (and when it becomes twelve)  
2. Portion math table (absorb `meals-feeding-10` shopping math)  
3. Formats that scale: chili, sheet pans, taco lines, pasta bakes (absorb `feeding-ten` format shortcuts)  
4. Scaling past eight / drop-ins (absorb `best-firehouse-meals-large-crews`)  
5. Line setup & hold while tones drop (short; deep-link `feeding-a-firehall-crew`)  
6. Recipe picks for ten (merged unique picks from all four sources — dedupe)  
7. Grocery list pattern for ten  
8. FAQs (merge all FAQs; keep “large crews” and “feeding 10” phrasings)  
9. CTAs: `/crew-meals`, Find a Meal, related product grocery list  

## Merged outline B — `/guides/firefighter-breakfast-guide`

1. Why station breakfast fails (staggered eaters, cleanup)  
2. 10 breakfast formats (absorb ideas guide)  
3. Large-crew mornings  
4. Brunch & day-shift handoff (absorb brunch guide)  
5. Red lead heritage link → `/firefighter-red-lead-recipe`  
6. Recipe grid → landing `/firefighter-breakfast-recipes` + `/breakfast`  
7. FAQs  

## Merged outline C — `/guides/healthy-meals-that-still-taste-good`

1. Healthy that still tastes like dinner (non-lecture)  
2. Fill-you-up tactics (absorb fill-you-up)  
3. Week balance for active crews (absorb active-crews)  
4. Flavor under time pressure  
5. Recipe picks → `/healthy-firefighter-meals`  
6. Cross-link: high-protein guide, energy guide, recovery nutrition  
7. FAQs (preserve all three pages’ questions)  

## Merged outline D — `/guides/comfort-food-after-a-long-shift`

1. What the crew wants after a hard job  
2. What to skip when fried  
3. Hall hits that never get voted off (absorb firehouse-comfort)  
4. Timing dinner after a busy shift (absorb after-busy)  
5. Soft kitchen / read-the-room (absorb recovery-meals notes)  
6. Link recovery nutrition (not duplicate)  
7. Recipe grid + FAQs  

## Merged outline E — `/guides/quick-meals-between-calls`

1. Cooking when the board is loud  
2. Cheats crews respect  
3. Chaotic-shift picks (absorb busy-nights)  
4. Cross-link under-30 timer guide + busy-shift strategies + tonight planner  
5. Recipe grid + FAQs  

## Merged outline F — `/guides/firehall-meal-prep-ideas`

1. Cook once on a slow day  
2. Component prep ideas (existing)  
3. Walk-in storage & labeling (absorb shift-workers)  
4. Reheat rules for second eaters  
5. Link meal calendar product page  
6. Recipe grid + FAQs  

## Merged outline G — `/guides/best-meals-24-hour-shift`

1. Dinner → overnight → breakfast arc  
2. Hold-friendly dinners  
3. Overnight without a second production (absorb eating-well)  
4. Breakfast handoff  
5. Cross-link long-shift foods + meal prep  
6. FAQs  

## Merged outline I — `/guides/meals-firefighters-actually-cook`

1. What shows up on real whiteboards  
2. Shared canon everyone knows (absorb every-firefighter-knows)  
3. Patterns vs one-off experiments  
4. Cross-link popular / 25 ideas / classics / legendary  
5. Recipe grid + FAQs  

## Merged outline J — `/guides/firehall-grocery-planning`

1. Shop once for crew size  
2. Pantry vs tonight’s dinner  
3. How crews split the grocery bill (absorb splits guide)  
4. Link product: grocery list, budget, canteen, cost-per-plate  
5. Cross-link cheap meals + avoid takeout  
6. FAQs  

---

# Canonical URL summary

| Intent | Canonical URL | Type |
|--------|---------------|------|
| Cooking / feeding ~10 | `/guides/cooking-for-10-firefighters` | Guide |
| Crew meals (commercial) | `/crew-meals` | Landing |
| Breakfast how-to | `/guides/firefighter-breakfast-guide` | Guide |
| Breakfast recipes | `/firefighter-breakfast-recipes` | Landing |
| Healthy how-to | `/guides/healthy-meals-that-still-taste-good` | Guide |
| Healthy recipes hub | `/healthy-firefighter-meals` | Landing |
| Comfort after hard job | `/guides/comfort-food-after-a-long-shift` | Guide |
| Quick / between calls | `/guides/quick-meals-between-calls` | Guide |
| Busy-shift ops | `/guides/busy-shift-dinner-strategies` | Guide |
| Meal prep | `/guides/firehall-meal-prep-ideas` | Guide |
| 24h tour meals | `/guides/best-meals-24-hour-shift` | Guide |
| Grocery planning | `/guides/firehall-grocery-planning` | Guide |
| What crews actually cook | `/guides/meals-firefighters-actually-cook` | Guide |
| BBQ recipes (commercial) | `/firefighter-bbq-recipes` | Landing |
| BBQ night ops | `/guides/bbq-night-at-the-station` | Guide |
| Dinner ideas (commercial) | `/firefighter-dinner-ideas` | Landing |
| Firefighter meals head | `/firefighter-meals` | Landing |

---

# Internal link updates (required with redirects)

Update every inbound reference **before or in the same deploy** as 301s.

### Code / data surfaces

| Surface | Action |
|---------|--------|
| `shared/seo/product-pages-data.ts` `guideSlugs` | Replace redirected slugs with canonicals |
| `shared/seo/landing-pages-data.ts` | Point related/guide mentions to cornerstones; keyword cleanup (Cluster M) |
| `shared/seo/recipe-authority-links.ts` (and any guide maps) | Swap old guide slugs |
| Guide JSON `relatedArticleSlugs` / outbound links in page bodies | Rewrite to canonicals |
| `client/src/components/seo/internal-link-hub.tsx` | Prefer cornerstones where listed |
| `client/public/content/guides/index.json` | Remove or soft-hide redirected articles from index listings (redirects still resolve) |
| Editorial source files (if guides are generated from `shared/editorial/*`) | Merge content at source |
| Sitemap generator | Canonicals only |
| GSC | Monitor coverage; request indexing of cornerstones after deploy |

### Suggested link graph (after consolidation)

```
Landing hubs
  └─ 1 cornerstone guide (cluster)
        ├─ 1–2 supporting guides (differentiated)
        ├─ Product SEO tools (where relevant)
        └─ 6–12 recipes

Product SEO
  └─ 1–2 canonical guides (never redirected slugs)
```

### High-traffic outbound replacements

| Old target (anywhere) | New target |
|-----------------------|------------|
| `meals-feeding-10-firefighters` | `cooking-for-10-firefighters` |
| `feeding-ten-firefighters` | `cooking-for-10-firefighters` |
| `best-firehouse-meals-large-crews` | `cooking-for-10-firefighters` |
| `firefighter-breakfast-ideas` | `firefighter-breakfast-guide` |
| `firehall-breakfast-and-brunch` | `firefighter-breakfast-guide` |
| `healthy-firefighter-meals-fill-you-up` | `healthy-meals-that-still-taste-good` |
| `healthy-meals-for-active-crews` | `healthy-meals-that-still-taste-good` |
| `firehouse-comfort-meals` | `comfort-food-after-a-long-shift` |
| `best-meals-after-busy-shift` | `comfort-food-after-a-long-shift` |
| `recovery-meals-after-hard-calls` | `comfort-food-after-a-long-shift` |
| `best-firehall-meals-busy-nights` | `quick-meals-between-calls` |
| `meal-prep-for-shift-workers` | `firehall-meal-prep-ideas` |
| `eating-well-on-24-hour-shifts` | `best-meals-24-hour-shift` |
| `meals-every-firefighter-knows` | `meals-firefighters-actually-cook` |
| `how-crews-split-groceries` | `firehall-grocery-planning` |

---

# Expected SEO impact

## Quantitative direction (90 days post-ship)

| Metric | Expected direction | Why |
|--------|--------------------|-----|
| Impressions on cornerstone URLs | ↑ | Equity consolidation via 301s |
| Impressions on redirected URLs | ↓ to ~0 (correct) | 301s |
| Average position for cluster head terms | ↑ (esp. cooking for 10, breakfast, healthy) | Less self-competition |
| CTR on cornerstones | ↑ if titles/H1s clarified | Cleaner SERP snippet ownership |
| Indexed guide count | ↓ ~15–18 | Healthy — fewer duplicates |
| Landing impressions for head terms | Stable → ↑ | Clearer spoke architecture |
| Cannibalization pairs in GSC | ↓ | Primary KPI from growth strategy |

## Risk register

| Risk | Mitigation |
|------|------------|
| Temporary ranking dip during recrawl | Ship merges + 301s same day; update lastmod; submit canonicals in GSC |
| Lost unique FAQ / tip | Fold content first; checklist per cluster above |
| Soft 404 if index still lists old slug | Remove from guides index + sitemap |
| Over-merging under-30 into quick | Keep under-30 live if timer-unique |
| BBQ guide vs landing | Use decision gate before any BBQ 301 |
| Product pages linking dead guide slugs | Batch-update `guideSlugs` in product data |

## What success looks like (from growth strategy)

- Cannibalization clusters: **5+ competing URLs → ≤2 live URLs each**
- Large-crew / breakfast / healthy: **single clear winner each**
- No private hall data indexed (unchanged)
- Product SERPs untouched by guide redirects

---

# Implementation waves (plan only — do not execute yet)

### Wave 1 — Critical (highest ROI)

1. Cluster A large crew (merge outline + 3 redirects + retarget `feeding-a-firehall-crew`)  
2. Cluster B breakfast (merge + 2 redirects)  
3. Cluster C healthy (merge + 2 redirects + high-protein keyword retarget)  
4. Internal link + sitemap + product `guideSlugs` updates for Wave 1  

### Wave 2 — High

5. Cluster D comfort (3 redirects)  
6. Cluster E quick/busy (1 redirect + under-30 differentiation)  
7. Cluster F meal prep (1 redirect)  
8. Cluster G 24h (1 redirect)  

### Wave 3 — Medium / soft

9. Cluster I cultural (1 redirect)  
10. Cluster J grocery splits (1 redirect)  
11. Cluster H BBQ decision gate  
12. Cluster M landing keyword differentiation  

### Wave 4 — Monitor

13. GSC coverage + query mapping  
14. Optional Phase-2 merges (culture pair; actually-cook → popular)  

**Do not implement until this plan is explicitly approved.**

---

# Approval checklist

- [ ] Canonical choices accepted (especially A: `cooking-for-10-firefighters` vs ops page split)  
- [ ] BBQ gate decision (retitle vs 301 to landing)  
- [ ] Confirm keep `fast-firehall-meals-under-30-minutes` as live spoke  
- [ ] Confirm no landing redirects  
- [ ] Approve Wave 1 ship window  

---

*— End of content consolidation plan —*
