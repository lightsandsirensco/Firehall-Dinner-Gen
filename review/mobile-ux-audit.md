# Firehall Meals — Mobile UX/UI Audit

**Date:** 2026-05-29  
**Scope:** Mobile-first review of existing surfaces (no new features, categories, or content).  
**Goal:** A firefighter understands what the app does and where to go within **3 seconds**.

**Primary files reviewed:** `client/src/pages/home.tsx`, `explore-discovery-page.tsx`, `golden-recipe-page.tsx`, `generator.tsx`, `site-header.tsx`, `explore-catalog-browser.tsx`, `design-tokens.ts`, `index.css`.

---

## Executive summary

The product foundation is strong: real recipes, clear brand voice, and thoughtful touch targets. On mobile, **clarity loses to volume** — the homepage stacks ~10 sections before the footer, repeats “Find a Meal” **5+ times**, and runs **four horizontal meal rails** that duplicate Explore. Explore is cleaner but still leads with **two filter rows + three dropdowns** before any food. Recipe pages are readable but **long and scroll-heavy** with no cook-mode focus or sticky anchors.

The highest-leverage path: **one calm homepage with two actions and two meal rows**, **Explore as the single browse surface**, **recipe pages optimized for hands-at-the-stove**, and **navigation that exposes only three destinations** on mobile.

---

## 1. Homepage redesign recommendations

### What the homepage does today (render order)

| # | Section | Role | Mobile issue |
|---|---------|------|----------------|
| 1 | `HomeHero` | Brand + 2 CTAs | **~88dvh** tall — delays “what do I do?” |
| 2 | `HomeLightsAuthenticity` | L&S brand story | Full section; credit already in hero |
| 3 | `HomeTrustStrip` | 5 pills + 4 stat tiles | Competes with hero; emphasizes “12 categories” |
| 4 | `HomeHowItWorks` | 3-step explainer | Good — keep (tighten) |
| 5 | `HomeFeaturedMeals` | **4 horizontal rails** × ~8 cards | Scroll fatigue; duplicates Explore categories |
| 6 | `HomeWhyCrews` | 6 value props + **mobile-only CTA** | Redundant with How It Works + hero |
| 7 | `HomeSeoEditorial` | SEO prose + 4 text links | Low thumb value; duplicate pathways |
| 8 | `HomeCtaBand` | Second full-width CTA band | Third “Find a Meal” push |
| 9 | `HomeFaqSection` | Accordion FAQ | Long tail before footer |
| 10 | `HomeFooter` | Links + beta feedback | Fine |

### Target homepage hierarchy (user priorities)

```
┌─────────────────────────────────────┐
│  Compact hero (≤60dvh)              │
│  What: Crew dinners for shift nights  │
│  [ Find a Meal ]  [ Browse Recipes ]  │
├─────────────────────────────────────┤
│  How it works (3 steps, 1 screen)   │
├─────────────────────────────────────┤
│  Hall Favorites (1 rail, 6–8 cards) │
├─────────────────────────────────────┤
│  Recently Added (1 rail, 6 cards)   │
├─────────────────────────────────────┤
│  Trust line (1 row, not 9 elements) │
├─────────────────────────────────────┤
│  FAQ link → /faq (not full accordion)│
└─────────────────────────────────────┘
```

### Recommendations

| # | Recommendation | Impact | Notes |
|---|----------------|--------|-------|
| H1 | **Shorten hero** to `min-h-[56dvh]` on mobile; keep firetruck visual as background, not the whole first session | **HIGH** | `home-hero.tsx` — user sees CTAs without excessive scroll |
| H2 | **Add one plain-language line** under tagline: “Pick crew size → get a dinner plan or browse 150+ hall recipes.” | **HIGH** | Answers “what does this do?” in &lt;3s |
| H3 | **Replace 4 category rails** with **one** “Hall Favorites” rail + **one** “Recently Added” (by `generatedAt` or catalog index order) | **HIGH** | `home-featured-meals.tsx` — drop `HOME_CATS` quadrant split |
| H4 | **Remove** `HomeWhyCrews` on mobile (or globally) | **HIGH** | 6 bullets duplicate trust strip + how-it-works |
| H5 | **Remove** `HomeSeoEditorial` from mobile layout; keep copy in `<meta>` / footer text link | **HIGH** | SEO preserved without scroll cost |
| H6 | **Remove** `HomeCtaBand` | **HIGH** | Pure duplicate of hero CTA |
| H7 | **Merge** `HomeLightsAuthenticity` into hero credit (`LightsAndSirensCredit` only) | **MEDIUM** | Full section is ~14–20rem of scroll |
| H8 | **Simplify** `HomeTrustStrip` to **one row**: “150+ recipes · Crew-sized · Shift-tested” (drop category count emphasis) | **MEDIUM** | Avoid “12 categories” — feels catalog-heavy |
| H9 | **Collapse FAQ** to “Common questions →” link; keep full FAQ on `/faq` | **MEDIUM** | `home-faq-section.tsx` |
| H10 | **Remove** mobile-only CTA inside `HomeWhyCrews` (section removed in H4) | **HIGH** | Eliminates 4th duplicate Find a Meal |
| H11 | Change secondary CTA label from “Explore Meals” to **“Browse Recipes”** (matches mental model) | **MEDIUM** | `brand-copy.ts` — aligns with Explore grid |
| H12 | **Lazy-load** rails below the fold (`content-visibility` or intersection observer) | **MEDIUM** | Perceived speed on mid-tier phones |

### What can be removed (homepage)

- `HomeLightsAuthenticity` as standalone section  
- `HomeWhyCrews`  
- `HomeSeoEditorial` (mobile)  
- `HomeCtaBand`  
- 3 of 4 featured category rails  
- FAQ accordion (replace with link)  
- Extra stat tiles in trust strip  

### What earns its place

- Hero + 2 CTAs  
- How it works (3 steps)  
- Hall Favorites (single rail)  
- Recently Added (single rail)  
- One-line trust + footer  

---

## 2. Explore redesign recommendations

### Current structure (`explore-discovery-page.tsx`)

1. Sticky `SiteHeader`  
2. SEO breadcrumbs  
3. `AppPageHeader` — “Full Catalog”  
4. `ExploreCatalogBrowser`:  
   - Chip row: All / Healthy / BBQ & Grill / Smoothies  
   - **3 stacked `<select>` filters** (category, protein, cook time)  
   - Chip row: High protein / Low cleanup  
   - 2-column card grid (`aspect-[4/5]` images)  
5. Compact footer  

**Strengths:** Single grid, no editorial rail sprawl, clear path to `/recipes/:slug`.  
**Friction:** Filter UI consumes **~200–280px** before first recipe row on a 390px-wide phone.

| # | Recommendation | Impact | Notes |
|---|----------------|--------|-------|
| E1 | On mobile, collapse **category + protein + cook time** into one **“Filters”** bottom sheet (keep chip row for primary: All / Healthy / BBQ / Smoothies) | **HIGH** | `explore-catalog-browser.tsx` |
| E2 | **Sticky subheader** on scroll: active filter summary + result count (“42 meals”) | **HIGH** | Discoverability without re-scrolling to top |
| E3 | Rename title **“Full Catalog” → “Browse Recipes”**; subtitle: “Every approved hall meal.” | **MEDIUM** | Less internal/warehouse tone |
| E4 | **Hide breadcrumbs** on mobile (`hidden sm:block`) | **LOW** | Saves vertical space; back via header |
| E5 | Reduce card **aspect ratio** to `4/3` or `1/1` on mobile — show more titles per viewport | **MEDIUM** | Less endless vertical scroll |
| E6 | Show **cook time + protein** on card (already has time; add protein icon/text) | **LOW** | Faster scanning |
| E7 | **Default sort** visible: “Hall favorites” or “Most cooked” — not a new feature if sort exists in data; else omit | **LOW** | Only if sort already in API |
| E8 | Delete unused legacy explore components from bundle (rails, cinematic cards) — **code cleanup**, smaller JS | **MEDIUM** | Files exist but aren’t routed |

### Explore — remove / simplify

| Item | Action | Impact |
|------|--------|--------|
| Triple `<select>` on mobile | Merge to filter sheet | **HIGH** |
| “Full Catalog” naming | Rename | **MEDIUM** |
| Duplicate pathways to same recipes (`/recipes` index vs `/explore`) | Pick **Explore as canonical browse**; demote `/recipes` to SEO/footer | **MEDIUM** |

### Does Explore feel endless but organized?

**Today:** Organized filters, but **top-heavy chrome** makes it feel like “settings page then food.”  
**Target:** Chips = quick mode; one filter affordance; immediate grid with count.

---

## 3. Recipe page redesign recommendations

**Primary template:** `golden-recipe-page.tsx` (Explore opens `/recipes/:slug`).

### Current flow

Hero (tall, title on image) → brand strip → meta pills → description → why crews like it → crew scaler → ingredients → steps → tonight’s spread → hall tips → substitutions → meal prep → leftovers → nutrition → equipment → related grid → internal links → footer.

### Kitchen usability issues

- No **sticky section nav** (Ingredients / Steps) — long scroll with wet hands.  
- Optional blocks **same visual weight** as steps — cognitive load.  
- **Spinner-only loading** — feels slower than content.  
- No **cook mode** (larger type, high contrast, one step visible).  
- Crew size pills **above** ingredients but easy to miss after scrolling.  
- Related recipes + SEO hubs **before** user finishes cooking flow.

| # | Recommendation | Impact | Notes |
|---|----------------|--------|-------|
| R1 | **Sticky tab bar** under header: `Ingredients` \| `Steps` (scroll-spy) | **HIGH** | `position: sticky; top: header height` |
| R2 | **Cook mode toggle** on Steps: larger text (18px), increased line-height, optional “screen stays on” hint | **HIGH** | CSS class on `<ol>` only — no new content |
| R3 | **Collapse** Tonight’s spread, Substitutions, Meal prep, Leftovers, Equipment into **accordions** (default closed) | **HIGH** | Steps + ingredients stay open |
| R4 | **Ingredient checklist** styling: left checkbox affordance (visual only) or tap-to-strike using local state | **MEDIUM** | Helps prep without new data |
| R5 | Step cards: **left border accent** + step number in filled circle (already close) — increase body text contrast `text-foreground/90` | **MEDIUM** | `golden-recipe-page.tsx` step `<p>` |
| R6 | **Pin crew size** row sticky just above ingredients when scrolling steps | **MEDIUM** | Scaling is critical for halls |
| R7 | Replace loading spinner with **skeleton** matching hero + ingredient block | **MEDIUM** | Match `RecipeGridSkeleton` pattern |
| R8 | **Shorten mobile hero** `max-h-[42vh]`; move trust badges **below** hero as row (not on image) | **MEDIUM** | Legibility + less gradient noise |
| R9 | Move **Related recipes** + `RecipeInternalLinks` below accordions, above footer | **LOW** | Keeps cook path uninterrupted |
| R10 | Fix `activePage="explore"` on recipe header → dedicated state or “recipes” | **LOW** | Wayfinding consistency |

### Generator result card (`recipe-card.tsx`)

Separate from catalog pages but part of “recipe reading” UX:

| # | Recommendation | Impact |
|---|----------------|--------|
| R11 | After generate, **collapse filter panel** automatically (`mealFocusMode` sooner) | **HIGH** |
| R12 | Match catalog step typography (same tokens as golden page) | **MEDIUM** |
| R13 | Primary actions: **Save + Shopping list** only above fold; email/print in “More” | **MEDIUM** |

---

## 4. Navigation improvements

### Current model

- **No bottom tabs** — sticky top header + hamburger sheet.  
- Mobile header: Find a Meal button + Saved + menu.  
- Sheet: 5 nav items + Saved again + Find a Meal again + Lights panel.  
- **Hall Feedback FAB** fixed bottom-right (`bottom: 5.75rem` on mobile).  
- Generator adds **`StickyCTA`** bar — **three bottom layers** (FAB + sticky generate + safe padding).

| # | Recommendation | Impact | Notes |
|---|----------------|--------|-------|
| N1 | **Mobile bottom bar** with 3 items only: `Home` \| `Find a Meal` \| `Browse` (`/explore`) | **HIGH** | Not a new feature — surfaces existing routes; reduces menu hunting |
| N2 | **Demote** Classics Wheel + Hall Ideas to sheet/footer secondary | **MEDIUM** | `site-header.tsx` navItems |
| N3 | **Remove duplicate** Find a Meal from mobile sheet when header CTA visible | **MEDIUM** | |
| N4 | **Hide Hall Feedback FAB** on `/generator` and pages with `mobile-sticky-bar` | **HIGH** | Prevent FAB/CTA overlap |
| N5 | FAB **icon-only** (no “Hall Feedback” text) on viewports &lt;400px | **MEDIUM** | `hall-feedback-fab.tsx` |
| N6 | Saved (heart) stays header — good; badge max “9+” | **LOW** | |
| N7 | Consistent labels: **Find a Meal** (action) vs **Browse Recipes** (catalog) | **MEDIUM** | Reduces “Explore vs Recipes vs Meals” confusion |

---

## 5. Mobile-first UX improvements

| Area | Issue | Fix | Impact |
|------|-------|-----|--------|
| 3-second clarity | Brand-first hero delays action | Shorter hero + explicit subline | **HIGH** |
| Thumb zone | CTAs scattered mid-page | Primary actions top + bottom bar | **HIGH** |
| Scroll fatigue | 4 rails + 6 sections | 2 rails max | **HIGH** |
| Filter sheets | Generator “More options” + Explore selects | One pattern: chips + “Filters” sheet | **HIGH** |
| Safe areas | `pb-safe-nav` (5.5rem) on pages without sticky bar | Conditional padding class | **MEDIUM** |
| Haptics | Used on nav — good | Keep; don’t add more animations | **LOW** |
| First visit | `FirstShiftTip` on generator | Dismiss permanently after 1 view; smaller banner | **MEDIUM** |
| Dual recipe URLs | `/explore/recipe/:id` vs `/recipes/:slug` | Route users to **one** detail system from Explore grid (already `/recipes`) — deprecate explore detail in nav | **MEDIUM** |

---

## 6. Visual hierarchy improvements

### Typography (`design-tokens.ts`)

- **Bebas Neue** for headings works for brand; body at **15px** is good.  
- Too many heading sizes on one page (display → titlePage → titleMeal → titleSection).

| # | Recommendation | Impact |
|---|----------------|--------|
| V1 | Homepage: max **2** display levels (hero H1 + section H2) | **HIGH** |
| V2 | Recipe steps: step title `text-base font-semibold`, body `text-[17px] leading-[1.65]` in cook mode | **HIGH** |
| V3 | Muted text ratio: bump step body from `text-muted-foreground` to `text-foreground/85` | **MEDIUM** |
| V4 | Eyebrow labels: use only once per screen (hero OR section, not both) | **LOW** |

### Buttons

- Primary = filled red; outline = secondary — clear.  
- Too many `font-heading uppercase tracking` buttons feel same weight.

| # | Recommendation | Impact |
|---|----------------|--------|
| V5 | **One** full-width primary per viewport; others `ghost` or text links | **HIGH** |
| V6 | Filter chips: active state stronger (bg-primary/20 + ring) — already decent | **LOW** |

### Cards

- Explore + home rails use heavy `ring + shadow` — premium but dense on 2-col grid.

| # | Recommendation | Impact |
|---|----------------|--------|
| V7 | Explore cards: lighter ring `ring-border/10`, title `text-[15px]` | **MEDIUM** |
| V8 | Home featured cards: show **title + time** on image bottom only; remove redundant subtitle on card | **MEDIUM** |

---

## 7. Performance & perceived speed

| # | Recommendation | Impact | Mechanism |
|---|----------------|--------|-----------|
| P1 | Lazy-load homepage sections below How It Works | **HIGH** | Intersection Observer / dynamic import |
| P2 | `loading="lazy"` on all catalog grid images (verify `FoodImage`) | **HIGH** | Below-fold cards |
| P3 | Remove `stagger-fade` on homepage lists for mobile | **MEDIUM** | `design-tokens.ts` `motion-reduce` already partial |
| P4 | Reduce hero `priority` only for LCP image; defer film grain overlay on mobile | **LOW** | CSS `content-visibility` |
| P5 | Explore catalog query `staleTime` 10m — good; show **cached grid instantly** with skeleton overlay on refetch | **MEDIUM** | TanStack Query `placeholderData` |
| P6 | Golden recipe: prefetch related only on idle, not mount | **LOW** | `relatedQueries` in golden page |
| P7 | Code-split unused explore editorial components | **MEDIUM** | Smaller initial Explore chunk |
| P8 | Avoid `hover:scale` on cards for touch devices (`@media (hover: hover)`) | **LOW** | Less jank |

---

## 8. Elements that should be removed

| Element | Location | Why | Impact |
|---------|----------|-----|--------|
| `HomeWhyCrews` | home | Duplicates trust + how-it-works | **HIGH** |
| `HomeSeoEditorial` | home (mobile) | SEO wall; links elsewhere | **HIGH** |
| `HomeCtaBand` | home | Duplicate CTA | **HIGH** |
| `HomeLightsAuthenticity` section | home | Hero already credits L&S | **MEDIUM** |
| 3 of 4 category rails | `home-featured-meals` | Explore duplication | **HIGH** |
| Mobile duplicate Find a Meal | `home-why-crews`, sheet | CTA fatigue | **HIGH** |
| FAQ accordion on home | home | Move to `/faq` | **MEDIUM** |
| Legacy explore rails (code) | unused components | Bundle weight | **MEDIUM** |
| `GeneratorWheelHub` (unused) | generator folder | Dead code | **LOW** |
| Category count stat (“12 categories”) | trust strip | Conflicts with simplicity goal | **MEDIUM** |
| Explore mobile breadcrumbs | explore page | Noise | **LOW** |

---

## 9. Elements that should be simplified

| Element | Simplification | Impact |
|---------|----------------|--------|
| `HomeTrustStrip` | 1 line + 2 stats (recipes, crew size) | **MEDIUM** |
| `HomeHowItWorks` | Keep 3 cards; reduce padding `py-12` mobile | **LOW** |
| `HomeFeaturedMeals` | 1 rail, 6–8 items, “View all → Explore” | **HIGH** |
| `ExploreCatalogBrowser` filters | Chips + 1 filter sheet | **HIGH** |
| `SiteHeader` mobile sheet | 3 primary links + secondary group | **HIGH** |
| `golden-recipe-page` optional sections | Accordions | **HIGH** |
| `FilterPanel` generator | Show 4 chips; rest in “More” sheet (already partial — reduce visible rows) | **HIGH** |
| Hall Feedback | Icon FAB; hide when sticky CTA present | **HIGH** |
| `AppPageHeader` on Explore | Smaller title on mobile (`text-2xl`) | **LOW** |

---

## 10. Prioritized implementation roadmap

### Phase 1 — Clarity in 3 seconds (1–2 days)

| Priority | Task | Impact |
|----------|------|--------|
| 1 | Shorten hero + add one-line “what it does” | **HIGH** |
| 2 | Remove `HomeCtaBand`, `HomeWhyCrews`, mobile `HomeSeoEditorial` | **HIGH** |
| 3 | Reduce featured meals to **Hall Favorites** + **Recently Added** rails | **HIGH** |
| 4 | Hide Hall Feedback FAB when `mobile-sticky-bar` present | **HIGH** |
| 5 | Explore: mobile filter sheet (replace 3 selects) | **HIGH** |

### Phase 2 — Cook & browse polish (2–4 days)

| Priority | Task | Impact |
|----------|------|--------|
| 6 | Recipe page: sticky Ingredients \| Steps tabs | **HIGH** |
| 7 | Recipe page: accordion optional sections | **HIGH** |
| 8 | Recipe page: cook mode typography | **HIGH** |
| 9 | Generator: aggressive `mealFocusMode` after first result | **HIGH** |
| 10 | Mobile bottom nav (3 items) | **HIGH** |

### Phase 3 — Premium feel & speed (3–5 days)

| Priority | Task | Impact |
|----------|------|--------|
| 11 | Homepage lazy-load below fold | **MEDIUM** |
| 12 | Trust strip simplification | **MEDIUM** |
| 13 | Explore card aspect + sticky result count | **MEDIUM** |
| 14 | Recipe skeleton loader | **MEDIUM** |
| 15 | Merge Lights authenticity into hero | **MEDIUM** |
| 16 | Conditional `pb-safe-nav` | **MEDIUM** |
| 17 | Remove legacy explore JS | **MEDIUM** |

### Phase 4 — Refinement (ongoing)

| Priority | Task | Impact |
|----------|------|--------|
| 18 | Rename Explore / CTA copy for consistency | **LOW** |
| 19 | Hide mobile breadcrumbs | **LOW** |
| 20 | Touch-only hover states | **LOW** |
| 21 | `activePage` fix on recipe header | **LOW** |

---

## Generator flow (brief)

**Files:** `generator.tsx`, `filter-panel.tsx`, `sticky-cta.tsx`, `recipe-card.tsx`.

| Issue | Recommendation | Impact |
|-------|----------------|--------|
| Filter noise before first meal | Default: crew + time + protein chips only; “More” sheet | **HIGH** |
| Sticky bar + FAB overlap | Hide FAB | **HIGH** |
| Wheel link in headline area | Move to menu/footer — secondary path | **MEDIUM** |
| Long recipe card | Auto-enter focus mode; filters collapse | **HIGH** |

---

## Feedback section (brief)

**Files:** `hall-feedback-shell.tsx`, `hall-feedback-fab.tsx`.

- FAB is valuable for beta but **competes with primary CTAs**.  
- **Icon-only**, **contextual hide** on generator/recipe sticky zones, **footer link** sufficient for discoverability.  
- Impact: **HIGH** for hide/collapse; **MEDIUM** for icon-only.

---

## Category browsing (brief)

- Home rails currently **are** category browsing disguised as four rails — consolidating to Hall Favorites fixes this without new categories.  
- `/categories/:id` and `/recipes` remain for SEO/deep links; **don’t promote** on homepage mobile.  
- Impact: **HIGH** (home simplification); **LOW** (category pages themselves).

---

## Success metrics (recommended)

Track after Phase 1–2 (no new features):

- Homepage: time to first tap on Find a Meal or Browse  
- Bounce rate on mobile `/`  
- Explore: scroll depth to first card click  
- Recipe: scroll-to-steps rate, avg time on steps section  
- Generator: time to first successful generate  

---

## Summary

| Principle | Current | Target |
|-----------|---------|--------|
| Calm | 10 homepage sections | 5–6 max |
| Useful | 4 rails + 3 CTAs | 2 rails + 1 CTA per screen |
| Premium | Heavy shadows/grains everywhere | Restraint; hero + food carry brand |
| Fast | Tall hero, spinner loads | Shorter hero, skeletons, lazy sections |
| Trustworthy | Repeated marketing copy | One trust row; proof in recipes |

**Do not add** features, categories, or content. **Do** remove, merge, collapse, and refocus navigation on: **Find a Meal → Browse Recipes → Hall Favorites / Recently Added → Cook.**
