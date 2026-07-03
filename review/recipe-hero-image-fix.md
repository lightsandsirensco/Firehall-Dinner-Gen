# Recipe Hero Image Fix

**Date:** 2026-07-03  
**Priority:** P0 visual bug  
**Scope:** Rendering, sizing, cropping, layout only — no image regeneration, no recipe data changes.

---

## Root cause

Three compounding issues caused food to disappear behind titles or crop awkwardly:

1. **Portrait mobile aspect ratios** — `detail` / `cinematic` layouts used `aspect-[4/5]` on mobile. `object-cover` on tall narrow frames aggressively crops plated food (especially bowls, chicken, burgers).

2. **Title stacked on the hero** — `golden-recipe-page.tsx` placed category, title, subtitle, and trust badges **over** the image with heavy gradients (`overlay="detail"` + page fade + `from-background` gradient). The title block covered the center/bottom of the plate where food is composed.

3. **Aggressive focal offsets** — `food-plate` used `object-[center_56%]` on mobile, shifting crop downward and clipping the top of dishes. `detail` overlay used `from-black/75` across most of the frame, visually obscuring food even when pixels were present.

Explore detail pages already put the title below the image, but still inherited the portrait aspect ratio and heavy overlays.

---

## Fix summary

| Change | Effect |
|--------|--------|
| Unified `RECIPE_PAGE_HERO_FRAME` — 3:2 mobile, 16:9 (`aspect-video`) desktop, capped height | Consistent, less aggressive crop |
| Global `object-[center_45%]` for food focal points | Plate stays centered in frame |
| Lighter bottom-only overlays (`minimal`, `detail`) | Readability without hiding food |
| Catalog hero title **below** image (`golden-recipe-page`) | No text over the subject |
| New `RecipePageHeroImage` component | One standard for `/recipes/:slug` heroes |
| Removed `HERO_CONTENT_FADE` on explore detail hero | Stops double-darkening when title is below |
| Breakfast + red-lead pages aligned to same frame/focal | Consistent across recipe templates |

---

## Files changed

```
client/src/lib/hero-image.ts
client/src/components/recipe-page-hero-image.tsx          (new)
client/src/components/explore-recipe-image.tsx
client/src/components/meal-hero-image.tsx
client/src/pages/golden-recipe-page.tsx
client/src/pages/explore-recipe-detail-page.tsx
client/src/pages/breakfast-recipe-page.tsx
client/src/pages/firefighter-red-lead-recipe-page.tsx
```

---

## Before / after

### Before
- Mobile heroes: tall 4:5 frame → tight vertical crop, chicken/bowls clipped
- Golden catalog: white title + badges over food; triple gradient stack
- Focal: `center_56%` mobile on explore → food pushed out of frame
- Desktop: up to `70vh` hero on golden page → over-zoom feel

### After
- Mobile/tablet/desktop: **3:2 → 16:9**, max ~440px / 420px height
- Golden catalog: **image only** in hero band; title/metadata below in normal text colors
- Focal: **`center 45%`** globally for food
- Overlay: **bottom 35–45% fade** only; no full-frame dark wash on detail heroes

---

## Responsive behavior

| Breakpoint | Aspect | Max height | Title position |
|------------|--------|------------|----------------|
| ≤430px | 3:2 | 50vh / 440px | Below image (golden, explore) |
| 768px tablet | 16:9 | 48vh / 420px | Below image |
| 1440px+ desktop | 16:9 | 420px cap | Below image; no 70vh zoom |
| Ultrawide | Same cap | Prevents enormous heroes | Content column unchanged |

`object-fit: cover` retained with safe `object-position: center 45%`.

---

## QA spot-check targets

Manual verification recommended on:

- Jerk Chicken & Rice and Peas
- Honey Garlic Chicken Bowls
- Za'atar Chicken Thighs
- Chicken Parmesan
- Smash burgers / chili / wraps / pasta / BBQ / breakfast recipes

At widths: **375**, **430**, **768**, **1440**, and ultrawide.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run check` | TypeScript pass; fails at unrelated `test-shift-dashboard.ts` (pre-existing) |
| `npm run build` | ✅ Pass |
| `npm run dev` | Port 5000 (use existing server if in use) |

---

## Success criteria

- Food subject visible in hero frame
- Title does not cover the plate
- Consistent aspect ratio across recipe pages
- Desktop heroes no longer feel over-zoomed
- Mobile crops gracefully with centered focal point

**Status:** Implemented — global layout + golden page restructure address the reported Jerk Chicken, Honey Garlic Bowl, and Za'atar Thighs class of bugs without per-image overrides.
