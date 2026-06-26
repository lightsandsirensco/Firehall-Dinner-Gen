# Mobile Safari Audit v3 — iPhone

**Date:** June 22, 2026  
**Lens:** Senior product designer · iPhone Safari (iOS 17+) · Portrait · 390×844 (iPhone 14 class)  
**Method:** Codebase audit of layout, touch targets, safe-area tokens, sticky chrome, and scroll hierarchy — cross-checked against `index.css`, `site-header.tsx`, page shells, and mobile-specific components.  
**Pages:** Homepage · Explore · Generator · Wheel · Recipe · Cook Mode · Hall · Canteen · Shopping lists · Profile · Plans  
**Companion:** `navigation-v3.md`, `firefighter-user-journeys.md`, `firehall-meals-90-roadmap.md` Part 6

---

## Executive summary

Firehall Meals has **real mobile engineering** — `100dvh`, safe-area utilities, `touch-manipulation`, haptics, sticky CTAs, Explore filter sheet, Cook Mode fullscreen. Hall dashboard (`max-w-lg`) is the most phone-native surface.

The product still **reads like a website on Safari** on most routes because:

1. **Food is below chrome** — headers, explainers, filters, and marketing blocks precede the job.
2. **Sticky layers stack** — site header + page sticky bars + bottom generate bar + Hall Feedback FAB + compact footer padding fight for the same 844px.
3. **Touch targets are inconsistent** — many controls are `min-h-9` (36px) or `min-h-10` (40px); Apple HIG recommends **44px minimum**.
4. **Recipe + account flows are scroll marathons** — primary actions (Cook, Save, Join) sit mid-page, not in a thumb zone.

**Overall mobile Safari grade: C+** (Hall + Cook Mode: B; Explore + Recipe + Homepage: C–)

---

## Audit matrix

| Page | Hierarchy | Scroll | Touch targets | Sticky/footer | Cheap feel | Grade |
|------|-----------|--------|---------------|---------------|------------|-------|
| Homepage | C | D+ | B− | C | C | C |
| Explore | C+ | C− | C | B− | C+ | C |
| Generator | C | C− | B− | D+ | C+ | C+ |
| Wheel | B− | C | B | B | B− | B− |
| Recipe | D+ | D | C | C | C | D+ |
| Cook Mode | A− | B+ | A | A | B+ | A− |
| Hall | B | C− | B | B | C+ | B− |
| Canteen | B− | C | D+ | B | C+ | C+ |
| Shopping lists | C | B | C | C | C | C |
| Profile | C | C− | C | B | C | C |
| Plans | C | B+ | B− | B | C | C |

---

## Cross-cutting issues (all pages)

### Sticky chrome stack

On Generator and Explore, up to **four fixed layers** compete:

```
┌─────────────────────────────┐
│ Site header (h-12 + safe)   │  z-50
├─────────────────────────────┤
│ Page sticky bar (Explore)   │  z-40  ← optional
├─────────────────────────────┤
│        scroll content        │
├─────────────────────────────┤
│ mobile-sticky-bar (Generate) │  z-40
│ Hall Feedback FAB            │  z-45
└─────────────────────────────┘
│ Safari URL bar (dynamic)     │  ← 100dvh jump
```

| Issue | Where | Safari symptom |
|-------|-------|----------------|
| `pb-safe-sticky` (6.75rem) + sticky bar + FAB | Generator | Last recipe actions hidden behind double bottom chrome |
| `pb-safe-nav` (5.5rem) inconsistent with sticky | Hall, Account | Footer padding wrong when no bottom bar |
| Hall Feedback FAB at `bottom: 5.75rem` | Global | Overlaps Generate sticky; hard to tap both |
| Explore sticky toolbar + site header | Explore | ~96px before first food pixel |

### Default button sizes (`ui/button.tsx`)

| Size | min-height | Verdict |
|------|------------|---------|
| `default` | 36px (`min-h-9`) | **Too small** for primary mobile actions |
| `sm` | 32px (`min-h-8`) | Used on Canteen — **fails HIG** |
| `lg` | 40px (`min-h-10`) | Still under 44px |

Many pages override with `min-h-11` (44px) — but **any un-overridden `Button`** is undersized.

### Dialogs on iOS Safari

`DialogContent` is **centered** (`top-[50%] translate-y-[-50%]`). When email keyboard opens (Shopping list, Account), the focused field can sit **under the keyboard** — no `visualViewport` offset, no bottom sheet pattern.

### Layout shift (CLS)

| Source | Page |
|--------|------|
| Lazy recipe card images | Explore grid |
| Hero `object-contain` → cover breakpoint | Homepage |
| `mealFocusMode` layout flip | Generator post-first-gen |
| Wheel reveal `AnimatePresence` height | Wheel |
| Font heading (Bebas) late load | All |

### `100dvh` + Safari URL bar

Pages use `min-h-[100dvh]` correctly, but **sticky bottom bars don't re-anchor** when the URL bar collapses — content can jump ~50px on first scroll.

---

# Page-by-page findings

## 1. Homepage (`/`)

### What works
- Hero capped at `min(50dvh, 400px)` on mobile — improved vs older 88dvh audits.
- Primary CTAs are `h-12` full-width — good thumb targets.
- SEO editorial blocks hidden `md:block` — reduces desktop-only bloat on small screens (partial).

### Issues

| Category | Finding |
|----------|---------|
| **Too much scrolling** | After hero: How It Works → Hall Vote → Featured Meals → Social Proof → Trust Strip → Email Capture → FAQ → full footer. **~8 sections** before footer on mobile. |
| **Poor hierarchy** | No single “do this now” after hero; Featured Meals rail duplicates Explore. |
| **Cheap feel** | Trust/social proof without real hall photos; email capture before user gets value. |
| **Awkward spacing** | Hero `pt-20` clears sticky header but feels tight under notch on smaller phones. |
| **Sticky/footer** | No `pb-safe` on main; full `SiteFooter` on mobile — heavy. |
| **Small buttons** | Header “Find a Meal” is `h-9 text-[11px]` — smallest CTA on site. |

### Safari moment
User opens from Google → scrolls past How It Works, vote explainer, meal rail → still hasn’t generated a meal.

---

## 2. Explore (`/explore`)

### What works
- Mobile filter **bottom sheet** (`max-h 88dvh`, `pb-safe`) — correct pattern.
- Sticky search + filter chip row below header.
- `explore-mobile-grid` 2-column compact cards — appropriate for thumb browsing.
- Filter sheet “Show N recipes” sticky apply button.

### Issues

| Category | Finding |
|----------|---------|
| **Poor hierarchy** | No visible H1 on mobile (`sr-only` only) — page feels headless. |
| **Small buttons** | Search `min-h-10`; filter button `min-h-10 px-2.5` — under 44px. Filter label `sr-only` on small screens — icon-only button. |
| **Too much scrolling** | Sticky toolbar (~56px) + **no food until grid**; rating collections appear **below** grid on mobile (inverted vs desktop). |
| **Layout shifts** | Card images lazy-load at `44vw` — grid reflows as rows enter viewport. |
| **Cheap feel** | Desktop title “Full Catalog” hidden — mobile gets utility UI without brand frame. |
| **Awkward spacing** | `-mx-page` sticky bar breaks horizontal rhythm with grid padding. |

### Safari moment
Thumb reaches for first recipe row at ~**120px** below header — after toolbar. User must scroll to see “food” if toolbar feels like chrome.

---

## 3. Generator (`/generator`)

### What works
- `StickyCTA` + `mobile-sticky-bar` with blur — strong thumb-zone generate.
- `mealFocusMode` flips to recipe-first (`flex-col-reverse`) after first success.
- Haptics on generate success/failure.
- `pb-safe-sticky` accounts for bottom bar.

### Issues

| Category | Finding |
|----------|---------|
| **Too much scrolling** | Before first gen: header copy + Recently Cooked + FirstShiftTip + **full FilterPanel** above empty results. Filters dominate. |
| **Duplicate CTAs** | Generate in FilterPanel **and** sticky bottom bar **and** header nav CTA. |
| **Small buttons** | Appliance toggles `min-h-9`; some filter chips `text-xs py-2`. |
| **Sticky/footer** | Sticky bar + Hall Feedback FAB + compact footer = **triple bottom obstruction**. |
| **Layout shifts** | `mealFocusMode` transition moves filters below recipe — jarring on first generation. |
| **Poor hierarchy** | `GENERATOR.subline` + wheel link before user sees a meal. |
| **Keyboard** | “Use what we have” textarea in filter panel — Safari keyboard covers bottom sticky generate until scroll. |

### Safari moment
Cook opens generator → scrolls through filters → taps sticky Generate → recipe appears → layout flips → scrolls again to read card.

---

## 4. Wheel (`/wheel`)

### What works
- Fixed wheel stage `min(92vw)` — prevents collapse during spin.
- Haptics on land; streak panel adds retention without heavy chrome.
- `pb-safe-nav` on main.

### Issues

| Category | Finding |
|----------|---------|
| **Too much scrolling** | `AppPageHeader` + Lights & Sirens credit + streak panel + wheel + vote banner — long page for one action. |
| **Cheap feel** | `LightsAndSirensCredit` block reads marketing site, not shift app. |
| **Poor hierarchy** | Eyebrow + title + subtitle + brand copy before spin. |
| **Layout shifts** | Reveal phase adds `WheelReveal` below stage — page length jumps. |

### Safari moment
Best emotional surface — but user scrolls to find vote banner after reveal instead of it appearing in thumb zone.

---

## 5. Recipe pages (`/recipes/:slug`)

### What works
- Cinematic hero with title overlay — premium first impression.
- `RecipeCookStepNav` sticky step pills when in instructions section.
- `StartCookingButton` uses `min-h-11`.
- Crew size picker prominent.

### Issues

| Category | Finding |
|----------|---------|
| **Poor hierarchy** | **Start Cooking is not above the fold.** Order: hero → brand strip → crew picker → meta pills → history panel → measurement bar (favorite, shopping, cook) → vote banner → description → ratings → ingredients → steps. Cook is **~2–3 screens down**. |
| **Small buttons** | Step nav pills `h-9 min-w-9` (36px) — below HIG. |
| **Too much scrolling** | Full blog layout: nutrition, related recipes, internal SEO links, crew rating, FAQ-style blocks. |
| **Sticky conflicts** | Site header + step nav both `sticky` at `3.5rem + safe-top` — double sticky when scrolling steps. |
| **Cheap feel** | Wall of pills + panels before food instructions — content site pattern. |
| **No mobile cook bar** | Unlike Cook Mode, no bottom sticky “Start Cooking” on scroll. |

### Safari moment
User from wheel taps “Cook” → lands on recipe → still must hunt for Start Cooking below fold.

---

## 6. Cook Mode (fullscreen overlay)

### What works
- **Best mobile surface in the product.** Full viewport, `z-120`, safe-area on header/footer.
- Step pills `min-h-11 min-w-11`; bottom controls `min-h-12`.
- Wake lock toggle; holding panel for tones.
- Ingredients sheet `max-h-[45dvh]` + `pb-safe`.
- Body scroll lock — no Safari background scroll bleed.

### Issues

| Category | Finding |
|----------|---------|
| **Small buttons** | Header “Calls” button hides label on mobile — icon-only is OK at 44px. |
| **Awkward spacing** | Header packs exit + title + calls + wake lock — crowded on iPhone SE width. |
| **Keyboard** | N/A — no text inputs. |

### Safari moment
This is what the rest of the app should feel like at the stove.

---

## 7. Hall (`/hall`)

### What works
- `max-w-lg mx-auto` — phone-first dashboard width.
- Quick actions 2×2 grid `min-h-[92px]` — good touch tiles.
- `pb-safe-nav`; compact section cards.
- Permission-gated content clear.

### Issues

| Category | Finding |
|----------|---------|
| **Too much scrolling** | Activity teaser → Leaderboard teaser → actions → stats → streaks → tonight → deals → recent → favorites → vote → shopping + meals month → shortages → empty state. **12+ sections.** |
| **Cheap feel** | `HallFeatureLocked` dashed borders for guests — placeholder, not onboarding. |
| **Poor hierarchy** | Social teasers (activity, leaderboard) above operational quick actions. |
| **Small buttons** | Section action links are text `text-sm` — not 44px tap areas. |
| **Awkward spacing** | `space-y-4` consistent but no visual priority between vote and shopping. |

### Safari moment
Cook wants shopping list → scrolls past activity/leaderboard/stats to find tile → lands on settings hash not dedicated route.

---

## 8. Canteen (`/hall/canteen`)

### What works
- Same hall width constraint; clear section grouping.
- Header card with back link to hall.
- Status color coding readable.

### Issues

| Category | Finding |
|----------|---------|
| **Small buttons** | `Mark Purchased` / `Restocked` use `size="sm"` → **32px min-height** — fails for gloved/hurry taps. |
| **Poor hierarchy** | Five sections always expanded — long scroll for busy manager. |
| **Cheap feel** | “Loading canteen list…” plain text; no skeleton. |
| **Small tap targets** | Back link is `text-xs` inline link, not button. |

### Safari moment
Manager tries to tap “Mark Purchased” with wet hands — misses small outline button.

---

## 9. Shopping lists

### Personal — `ShoppingListModal`

| Category | Finding |
|----------|---------|
| **Keyboard** | Centered dialog; email input triggers keyboard **over the field**. |
| **Small buttons** | Copy/Print/Email row — default button height without `min-h-11`. |
| **Sticky/footer** | `max-h-[85vh]` flex column — OK, but action row not pinned when list scrolls. |
| **Cheap feel** | Dense `text-xs` section headers; print opens new tab (Safari popup risk). |

### Hall shared — `HallSharedShoppingListPanel` on `/halls/:id`

| Category | Finding |
|----------|---------|
| **Too much scrolling** | Panel buried on long settings page; hash anchor scroll. |
| **Small buttons** | Checkboxes `min-h-[36px] min-w-[36px]` — under 44px. |
| **Poor hierarchy** | Export PDF / SMS / Copy in one row — wraps awkwardly on 390px. |
| **Cheap feel** | `max-h-[360px]` inner scroll inside page scroll — scroll jail. |

---

## 10. Profile (`/account`)

### What works
- `max-w-[720px]` readable form width.
- Clear guest vs authed states.
- `pb-safe-nav`.

### Issues

| Category | Finding |
|----------|---------|
| **Too much scrolling** | Pills → profile form (many chip fields) → halls list → create hall form → join form → footer buttons. |
| **Poor hierarchy** | Create + Join hall compete with profile save — account page as admin center. |
| **Keyboard** | Profile inputs in long page; Safari scroll-to-focused is unreliable with sticky header. |
| **Cheap feel** | “Hall Pro — Invite only” pill with no action path. |
| **Small buttons** | “Join hall” `size="sm"` in section header. |

### Safari moment
Probie edits protein chips → keyboard covers Save → scroll fight.

---

## 11. Plans (`/plans`)

### What works
- Single-column cards on mobile.
- `pb-safe-nav`.

### Issues

| Category | Finding |
|----------|---------|
| **Poor hierarchy** | Three tiers including Hall Pro (not selectable here) — confuses mobile user. |
| **Cheap feel** | “Free during preview” / “Coming soon” — undermines trust. |
| **Wrong nav context** | `SiteHeader activePage="home"` — nav highlight incorrect. |

---

# Prioritized fixes

## P0 — Fix before hall pilots (blocks stove + shift night)

| ID | Fix | Pages | Effort | Impact |
|----|-----|-------|--------|--------|
| **P0-1** | **Sticky mobile cook bar** on recipe pages: `Start Cooking` + Shopping List fixed above `safe-area-bottom`; hide on Cook Mode open | Recipe | S | Cook discoverability |
| **P0-2** | **Raise global mobile touch floor** to `min-h-11` (44px) for all primary/secondary `Button` on `<lg`; ban `size="sm"` on operational actions | Canteen, Shopping, Explore | S | Gloved/hurry taps |
| **P0-3** | **Generator: default collapsed filters** on first visit — crew size + protein + Generate visible; “More options” sheet for rest | Generator | M | Time-to-first-meal |
| **P0-4** | **Resolve bottom chrome collision** — either hide Hall Feedback FAB on pages with `mobile-sticky-bar`, or raise FAB to `bottom: calc(7.5rem + safe)` | Generator | S | Sticky overlap |
| **P0-5** | **Shopping list email → bottom sheet** on mobile (not centered dialog) to fix keyboard cover | Shopping | M | Form completion |
| **P0-6** | **Explore: show 6 recipe cards above fold** — compress sticky toolbar to single row; move rating collections below fold or horizontal rail at top | Explore | M | Food-first browse |
| **P0-7** | **Hall shopping list dedicated route** (`/hall/shopping`) — exit scroll jail on settings hash | Hall, Shopping | M | Ops workflow |

---

## P1 — High value polish (90+ mobile score)

| ID | Fix | Pages | Effort | Impact |
|----|-----|-------|--------|--------|
| **P1-1** | Homepage mobile diet: hero + 2 CTAs + How It Works (3 steps) + **one** meal rail + footer link to FAQ — cut email capture on first visit | Homepage | M | First impression |
| **P1-2** | Explore visible H1 + one-line subcopy on mobile | Explore | XS | Hierarchy |
| **P1-3** | Generator `mealFocusMode` on first success: **no layout flip animation** — recipe replaces empty state in place | Generator | S | CLS |
| **P1-4** | Wheel: move `WheelReveal` actions into **fixed bottom sheet**; trim L&S credit above wheel on mobile | Wheel | M | Spin-to-cook path |
| **P1-5** | Hall dashboard: move Activity/Leaderboard **below** quick actions; collapse to single “Crew pulse” row | Hall | M | Ops hierarchy |
| **P1-6** | Recipe: collapse Ingredients by default on mobile; expand in sheet | Recipe | S | Scroll reduction |
| **P1-7** | Recipe step nav pills → `min-h-11 min-w-11` | Recipe, Cook Mode | XS | Touch |
| **P1-8** | Canteen: accordion sections (only “Needs Attention” open); large full-width action buttons | Canteen | M | Manager speed |
| **P1-9** | Account: split **Profile** vs **Hall setup** into tabs; sticky Save on profile tab | Profile | M | Keyboard + clarity |
| **P1-10** | Explore card images: explicit `width`/`height` + skeleton placeholder color match | Explore | S | CLS |
| **P1-11** | Header mobile CTA: `min-h-11`, `text-xs` → `text-sm`, shorten copy to “Generate” | Global | XS | Nav consistency |
| **P1-12** | Open Cook Mode by default when `?cook=1` or arriving from generator/wheel/deal | Recipe | S | Tonight flow |

---

## P2 — Polish & trust (post-ritual sprint)

| ID | Fix | Pages | Effort | Impact |
|----|-----|-------|--------|--------|
| **P2-1** | Bottom tab bar (Discover · Tonight · Hall · Me) — retire hamburger for core jobs | Global | L | App feel |
| **P2-2** | `visualViewport` listener for dialogs with inputs | Shopping, Account | M | Keyboard |
| **P2-3** | Safari URL bar: use `position: fixed` bottom bar with `env(safe-area)` only — test `100svh` fallback | Global | M | dvh jump |
| **P2-4** | Homepage hero: preload LCP image; fixed aspect placeholder | Homepage | S | CLS |
| **P2-5** | Guest hall locked cards → illustrated join CTA (not dashed border) | Hall | S | Cheap feel |
| **P2-6** | Plans: remove Hall Pro card from `/plans` on mobile; link to hall billing | Plans | S | Clarity |
| **P2-7** | Shopping list modal: pin Copy/Print/Email row at bottom of sheet | Shopping | S | Actions always visible |
| **P2-8** | Hall shared list: full-height checklist mode (no nested 360px scroll) | Shopping | M | Usability |
| **P2-9** | Reduce `SiteFooter` on mobile app routes to one line + feedback link | Most pages | S | Scroll |
| **P2-10** | Filter chip minimum `min-h-11` everywhere (`filter-panel`, explore chips) | Generator, Explore | S | Touch |
| **P2-11** | Recipe internal SEO / related rails collapsed under “More recipes” | Recipe | S | Scroll |
| **P2-12** | PWA install prompt timing — after first successful cook, not on homepage | Global | S | App vs web |

---

## Recommended sprint order

```
Week 1: P0-2, P0-4, P1-7, P1-11  (touch + chrome — quick wins)
Week 2: P0-1, P1-12, P1-6                 (recipe / cook path)
Week 3: P0-3, P1-3                         (generator)
Week 4: P0-6, P1-2                         (explore)
Week 5: P0-7, P1-5, P1-8                   (hall ops)
Week 6: P1-1, P1-4, P1-5                   (homepage + wheel + hall)
```

---

## Success metrics (iPhone Safari)

| Metric | Current (est.) | Target |
|--------|----------------|--------|
| Time to first recipe (generator, cold) | 25–45s + 2–3 scrolls | &lt;15s, ≤1 scroll |
| Tap success on Canteen manage (fitts) | ~32px targets | 44px+ |
| Recipe → Cook Mode taps | 2–4 | 1 |
| Explore scroll depth to first click | ~120px + toolbar | First row visible at load |
| CLS on explore grid (Lighthouse mobile) | Medium | &lt;0.1 |
| Shopping email form completion | Keyboard drop-off | +30% completion |

---

## What to protect (do not regress)

- Cook Mode fullscreen + wake lock + safe areas  
- Generator sticky bottom generate bar (after chrome fix)  
- Hall dashboard `max-w-lg` constraint  
- Explore bottom filter sheet pattern  
- Haptics on generate/wheel  
- `touch-manipulation` on interactive controls  

---

*End of mobile Safari audit v3.*
