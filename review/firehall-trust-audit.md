# Firehall Meals Trust Audit

**Generated:** 2026-06-01  
**Updated:** 2026-06-01 (Sprint 1 trust fixes applied)  
**Perspective:** First-time firefighter using the site on a shift night  
**Scope:** 10 core workflows · 301 curated catalog recipes · approved production subset (228) · UX/code review

---

## Executive summary

Firehall Meals has **strong infrastructure** (60+ audit scripts, layered QA gates) and **passes automated content checks** on the approved catalog (228/228 recipe quality, 228/228 detail standard, 316/316 meal-image metadata). A first-time user can generate a meal, browse Explore, and open most recipe pages without hitting broken layouts.

**Trust breaks where automation does not match human judgment:**

| Area | Status | Firefighter impact |
| --- | --- | --- |
| Recipe title ↔ dish identity | **MAJOR** | “Beef Barley Soup” is chili with no barley; “Chicken Dumpling Soup” is chili with no dumplings |
| Duplicate / same-hero images | **MAJOR** | Different meals look identical — user assumes wrong recipe or lazy content |
| Nutrition display | **MODERATE** | Curated JSON has macros; UI still renders `0` if missing; 166 recipes flagged suspicious divergence |
| Save / favorites on catalog | **MODERATE** | Can save generator meals but **not** curated `/recipes/:slug` pages |
| Homepage / Explore clutter | **MODERATE** | Too many CTAs and rails before user sees food |
| Analytics blind spots | **LOW (ops)** | Search, Hall Vote, shopping list untracked — doesn’t break user trust directly |

### Overall site trust score: **74 / 100 — MINOR ISSUE (site-wide)** ↑ from 68

**Sprint 1 fixes applied:** soup mislabels rewritten, soup≠chili routing fixed, nutrition zero guard, catalog save button, explore blank-page fix, title↔dish identity audit gate (228/228 pass).

**Interpretation:** Usable and credible for generator + most catalog browsing. **Not yet trustworthy as a complete recipe library** until title/dish mismatches and duplicate visuals are fixed on high-traffic recipes.

---

## Core workflow audit

| # | Workflow | Route(s) | Trust verdict | Key findings |
| --- | --- | --- | --- | --- |
| 1 | **Homepage** | `/` | **MINOR ISSUE** | ~10 sections, 5+ “Find a Meal” CTAs, 4 horizontal rails duplicate Explore. Hero uses `/classics-wheel` while nav uses `/wheel`. See `review/mobile-ux-audit.md`. |
| 2 | **Meal Generator** | `/generator` | **PASS** | Strong error states, crew scaling, shopping list, Hall Vote promo. Disabled generate when no appliances lacks inline explanation. Files: `client/src/pages/generator.tsx`, `filter-panel.tsx`. |
| 3 | **Meal Wheel** | `/wheel`, `/classics-wheel` | **MINOR ISSUE** | “Cook” opens `/package/:slug` not recipe page — label mismatch. Analytics wired (`wheel_spin`, `wheel_recipe_open`). `client/src/pages/classics-wheel.tsx`. |
| 4 | **Recipe Pages** | `/recipes/:slug`, `/breakfast/:slug`, etc. | **MAJOR ISSUE** (content) | Pages render well; **content trust fails** on mis-templated soups. No save button on catalog pages. Nutrition always shown (no zero guard). `golden-recipe-page.tsx`. |
| 5 | **Explore** | `/explore` | **PASS** (browse) / **MINOR** (legacy) | Primary catalog browser works. Legacy `/explore/recipe/:id` still routable; invalid ID returns **`null` → blank screen** (`explore-recipe-detail-page.tsx:344`). |
| 6 | **Search** | Explore + `/recipes` only | **MINOR ISSUE** | No global search. `trackSearch()` defined in `client/src/lib/analytics.ts` but **never called**. |
| 7 | **Hall Vote** | Generator → `/vote/:voteId` | **MINOR ISSUE** | Works functionally; **zero analytics events**. Synthetic “Try another direction” option may confuse. `hall-vote-modal.tsx`, `vote.tsx`. |
| 8 | **Save Recipe** | `/favorites` | **MAJOR ISSUE** | localStorage only — lost on clear data. **Catalog recipes cannot be saved.** `saved-meals.ts`, `recipe-card.tsx` (generator only). |
| 9 | **Shopping List** | Modal (multi-surface) | **PASS** | Works from generator + catalog. No analytics. Print may fail on mobile Safari. `shopping-list-modal.tsx`. |
| 10 | **Email Capture** | Homepage, generator, shopping list, Red Lead | **PASS** | Multiple paths with privacy copy. Shopping-list email untracked. `home-email-capture.tsx`, `email-modal.tsx`. |

---

## Recipe audit (curated catalog)

**Corpus:** 301 page JSON files scanned · **228 approved** production recipes in quality/detail gates

### Automated gate results (latest run)

| Gate | Result | Report |
| --- | --- | --- |
| Recipe quality (beginner, accuracy) | **228/228 pass** | `review/recipe-quality-audit.json` |
| Recipe detail (Phase 7) | **228/228 pass** | `review/recipe-detail-audit.json` |
| Meal image metadata | **316/316 pass** | `review/meal-image-trust-audit.json` |
| Nutrition completeness | **0 missing** · **166 suspicious** | `review/recipe-nutrition-audit-report.md` |
| Master recipe audit (228) | Grade A: 137 · B: 91 · C/D: 0 | `review/master-recipe-audit.json` |
| Image accuracy (761 corpus) | **558 pass · 203 fail** | `review/image-accuracy-audit.json` |
| Duplicate recipes | **28 exact · 34 near** (368 catalog) | `review/duplicate-report.json` |
| P0 wrong meal images | **0** | `review/image-trust-report.json` |

### Trust tier definitions

| Tier | Meaning |
| --- | --- |
| **PASS** | Title, ingredients, steps, image metadata, and nutrition align; cookable as written |
| **MINOR ISSUE** | Usable; small gaps (unused garnish in steps, Grade B detail, suspicious macro math) |
| **MAJOR ISSUE** | Misleading title, wrong dish template, duplicate hero with different title, or broken nutrition UX |
| **REMOVE** | Would embarrass the hall if served as labeled — do not publish |

### REMOVE — immediate publish blockers

| Recipe | Slug | Why | Fix location |
| --- | --- | --- | --- |
| Beef Barley Soup | `beef-barley-soup` | Title promises barley soup; page is **ground-beef chili** (kidney beans, chili powder, no barley) | `client/public/catalog/golden-100/pages/beef-barley-soup.json` · root cause: `shared/golden-100/recipe-quality/recipe-instruction-class.ts` routes any title with “soup” to `buildChili()` |
| Chicken and Dumplings / Dumpling Soup | `chicken-dumpling-soup` | Title/alt promise dumplings; content is **chili template** (beans, chili powder, “chili splatters”) | Same instruction-class bug · `instruction-engine.ts` |

### MAJOR ISSUE — high-traffic trust risks

| Category | Examples | Evidence |
| --- | --- | --- |
| **Title ↔ dish mismatch** | `beef-barley-soup`, `chicken-dumpling-soup` | Ingredient scan + manual read |
| **Duplicate hero images** | 9 recipes share one hash (philly sliders, pepper steak, rigatoni, etc.) | `review/image-trust-report.json` P1 groups |
| **Vision QA failures (post-regen)** | 23/41 image queue still fail pixel QA | `review/meal-image-trust-audit.json` (vision batch) |
| **Exact duplicate recipes** | 28 pairs in catalog | `review/duplicate-report.json` |
| **Nutrition UI shows zeros** | Catalog pages always render panel | `recipe-nutrition-panel.tsx` — no guard; explore detail hides when `calories > 0` only |

### MINOR ISSUE — approved catalog (representative)

- **91 Grade B** recipes in master audit (ingredient-step alignment, vague steps)
- **166 suspicious nutrition** (macro math diverges from label, e.g. lumberjack breakfast 1100 vs 1658 computed)
- **Phase 3 failures:** 94 recipes with unused ingredients in steps (often garnish/prep items)
- **Image governance:** 59/566 failed (`review/curated-image-governance-report.json`)

### PASS — production subset

Majority of **228 approved** recipes pass automated quality, detail, and metadata image checks. Generator output uses trust pipeline (`shared/recipe/pipeline.ts`, threshold 58).

---

## UX audit (first-time firefighter)

### Confusing / dead-end patterns

| Issue | Location | Impact |
| --- | --- | --- |
| Blank page on bad explore recipe ID | `explore-recipe-detail-page.tsx:344` `return null` | **HIGH** confusion |
| Cannot save catalog recipe | `golden-recipe-page.tsx` — no save affordance | **HIGH** — “Save Recipe” workflow broken for main library |
| Favorites lost on browser clear | `client/src/lib/saved-meals.ts` | **HIGH** trust |
| Homepage scroll fatigue | `home.tsx` + 4 featured rails | **MEDIUM** — user may leave before food |
| Wheel “Cook” → package URL | `classics-wheel.tsx` | **MEDIUM** expectation mismatch |
| Generator disabled with no explanation | `generator.tsx` | **MEDIUM** |
| Recipes index silent fetch failure | `recipes-index.tsx` | **MEDIUM** — empty looks like no recipes |
| Duplicate “Find a Meal” CTAs | homepage sections | **MEDIUM** clutter |
| No global search | header + analytics gap | **MEDIUM** |
| Explore legacy route split | `/explore/recipe/:id` vs `/recipes/:slug` | **LOW** bookmark confusion |

### Mobile

See full recommendations in `review/mobile-ux-audit.md` — shorten hero, collapse FAQ, single featured rail, sticky recipe anchors.

---

## Analytics trust (workflow observability)

Product analytics **cannot validate** Hall Vote funnel, search behavior, or shopping-list usage:

| Event | Status | File |
| --- | --- | --- |
| `trackSearch` | **Not wired** | `client/src/lib/analytics.ts` |
| Hall Vote create/vote | **Missing** | `hall-vote-modal.tsx`, `vote.tsx` |
| Shopping list open/print/email | **Missing** | `shopping-list-modal.tsx` |
| `trackRecipeShare` | **Not wired** | `analytics.ts` |
| Generator / wheel / explore | Wired | `generator.tsx`, `classics-wheel.tsx`, explore browser |

---

# TOP 25 HIGHEST PRIORITY FIXES

Ranked by: (1) user trust impact, (2) confusion impact, (3) conversion impact

| Rank | Fix | Trust | Confusion | Conversion | File(s) | Recommended action |
| ---: | --- | :---: | :---: | :---: | --- | --- |
| **1** | **Rewrite Beef Barley Soup** — replace chili template with real barley soup content | ●●● | ●●● | ●● | `beef-barley-soup.json`, `recipe-instruction-class.ts`, `instruction-engine.ts` | Add `buildBarleySoup()`; fix `inferRecipeInstructionClass` so “soup” ≠ always chili; regenerate page + hero |
| **2** | **Rewrite Chicken Dumpling Soup** — dumplings + broth, not chili | ●●● | ●●● | ●● | `chicken-dumpling-soup.json`, same engine files | Route to `buildSoup()` / new dumpling builder; regen image |
| **3** | **Never display 0 macros** — show “Nutrition unavailable” or hide panel | ●●● | ●● | ● | `recipe-nutrition-panel.tsx`, `golden-recipe-page.tsx`, `breakfast-recipe-page.tsx` | Add `hasValidNutrition()` guard; match explore-detail pattern (`calories > 0`) |
| **4** | **Add Save to catalog recipe pages** | ●● | ●●● | ●●● | `golden-recipe-page.tsx`, `breakfast-recipe-page.tsx`, `saved-meals.ts` | Reuse `saveMeal` with catalog slug; `trackRecipeSave` |
| **5** | **Fix blank explore detail** for invalid IDs | ●● | ●●● | ●● | `explore-recipe-detail-page.tsx:344` | Replace `return null` with error UI + back link |
| **6** | **Break duplicate hero image groups** (P1 high-risk) | ●●● | ●● | ●● | 9-slug group in `image-trust-report.json`; `scripts/regen-meal-image-trust.ts` | Regenerate unique heroes for pepper-steak, rigatoni, sloppy joe feed, etc. |
| **7** | **Add title↔dish identity audit gate** | ●●● | ●● | ● | New check in `shared/recipe-quality/` or extend `meal-format-contract.ts` | Fail if title contains barley/dumpling/caeser side but ingredients contradict |
| **8** | **Shorten mobile homepage** — 1 rail, remove duplicate CTAs | ● | ●●● | ●●● | `home.tsx`, `home-featured-meals.tsx`, `home-cta-band.tsx` | Implement H1–H6 from `mobile-ux-audit.md` |
| **9** | **Resolve 28 exact duplicate recipe pairs** | ●●● | ●● | ● | `review/duplicate-report.json`; catalog JSON | Merge or differentiate titles, ingredients, and images |
| **10** | **Fix golden-100 index.json** (lists 5, ~100 pages exist) | ●● | ●●● | ●● | `client/public/catalog/golden-100/index.json` | Regenerate index from manifest — Explore/recipes index may hide meals |
| **11** | **Wire `trackSearch`** on Explore + Recipes index | ● | ●● | ●●● | `explore-catalog-browser.tsx`, `recipes-index.tsx`, `analytics.ts` | Emit on debounced search with result count |
| **12** | **Hall Vote analytics** (create, share, vote cast) | ● | ●● | ●●● | `hall-vote-modal.tsx`, `vote.tsx`, `product-analytics.ts` | Funnel: generator → vote → conversion |
| **13** | **Wheel “Cook” label** → “View meal plan” or route to `/recipes/:slug` | ● | ●●● | ●● | `classics-wheel.tsx`, `firehall-classics-wheel.ts` | Align CTA with destination |
| **14** | **Vision QA remaining 23 image queue failures** | ●●● | ●● | ● | `review/image-accuracy-regen-queue.txt`; title-locked prompts | Continue regen loop + prompts for breakfast skillets |
| **15** | **Remediate 166 suspicious nutrition entries** | ●●● | ●● | ● | `scripts/audit-recipe-nutrition.ts --fix` | Recalculate from ingredients or mark `source: estimated` with label |
| **16** | **Recipes index fetch error state** | ● | ●●● | ●● | `recipes-index.tsx` | Show retry when catalog index fails |
| **17** | **Persist favorites** (optional account/local backup warning) | ●● | ●●● | ●●● | `saved-meals.ts`, `favorites.tsx` | Banner: “Saved on this device only” + export |
| **18** | **Unify wheel URL** to `/wheel` everywhere | ● | ●● | ● | `home-hero.tsx`, marketing links | Remove `/classics-wheel` from primary CTAs or 301 |
| **19** | **Shopping list analytics** | ● | ● | ●● | `shopping-list-modal.tsx` | Track open, print, email success/fail |
| **20** | **Generator disabled-state tooltips** | ● | ●●● | ●● | `generator.tsx`, `filter-panel.tsx` | Explain “Select at least one appliance” |
| **21** | **Fix `inferRecipeInstructionClass`** soup routing | ●●● | ●● | ● | `recipe-instruction-class.ts:91` | `soup` in title → soup builder unless `chili` explicit |
| **22** | **Deprecate `/explore/recipe/:id`** — redirect to catalog | ●● | ●●● | ●● | `explore.tsx`, `explore-navigation.ts`, `App.tsx` | 301 to `/recipes/:slug` when mapped |
| **23** | **Image governance 59 failures** | ●●● | ●● | ● | `review/curated-image-governance-report.json` | Run `audit:image-governance` remediation |
| **24** | **Master audit Phase 3** — 94 ingredient alignment fixes | ●● | ●● | ● | `review/master-recipe-audit.json` | Batch apply unused-ingredient step mentions |
| **25** | **Add cook-mode sticky step nav** on recipe pages | ● | ●●● | ●● | `golden-recipe-page.tsx` | Reduce scroll; improve at-stove UX per mobile audit |

---

## Recommended fix order (sprints)

**Sprint 1 — Trust blockers (1 week)**  
Fixes #1–7, #21: soup template bug, nutrition zero UI, catalog save, explore blank page, duplicate heroes, identity audit gate.

**Sprint 2 — Discovery & conversion (1 week)**  
Fixes #8–12, #18–20: homepage simplification, search analytics, Hall Vote tracking, wheel CTA clarity.

**Sprint 3 — Library integrity (ongoing)**  
Fixes #9, #13–17, #22–25: duplicates, nutrition recalc, image vision queue, governance, recipe detail UX.

---

## Commands to re-run audits

```bash
npm run audit:recipe-quality
npm run audit:recipe-detail
npm run audit:recipe-nutrition
npm run audit:meal-image-trust
npm run audit:image-trust
npm run audit:catalog-duplicates
npm run audit:master-recipes
```

---

## Success criteria (trust audit)

| Criterion | Current | Target |
| --- | --- | --- |
| REMOVE-tier recipes published | **2** | **0** |
| Title ↔ dish identity failures | **≥2 known** | **0** (automated gate) |
| False zero nutrition displayed | **Possible on catalog UI** | **0** |
| Catalog save workflow | **Broken** | **Works on all recipe pages** |
| Blank error pages | **1** (explore detail) | **0** |
| P1 duplicate hero groups (high risk) | **12 groups** | **0** |
| Overall site trust score | **68/100** | **≥85/100** |

---

*This audit synthesizes automated reports in `review/`, live catalog scans, and client workflow code review. Re-run gates after fixes and update this document.*
