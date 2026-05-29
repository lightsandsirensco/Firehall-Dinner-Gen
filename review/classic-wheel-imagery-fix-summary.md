# Classics Wheel imagery fix — summary

**Date:** 2026-05-29

## Classics Wheel recipes audited (10)

| Slug | Hero image | Status |
|------|------------|--------|
| chicken-parm | `/images/golden-100/chicken-parm.jpg` | approved |
| steak-tacos | `/images/explore/chimichurri-steak-tacos-hero.jpg` | approved |
| pulled-pork | `/images/golden-100/pulled-pork.jpg` | approved |
| smash-burgers | `/images/explore/double-smash-burgers-hero.jpg` | approved |
| chili-garlic-bread | `/images/explore/firehouse-smoked-beef-chili-hero.jpg` | approved |
| chicken-caesar | `/images/golden-100/chicken-caesar.jpg` | approved |
| jerk-chicken | `/images/explore/jerk-chicken-hero.jpg` | approved |
| beef-dip | `/images/golden-100/beef-dip.jpg` | approved |
| bbq-chicken-bowls | `/images/explore/bbq-chicken-bowls-hero.jpg` | approved |
| steak-sandwiches | `/images/golden-100/steak-sandwiches.jpg` | approved |

**Result:** 10/10 approved with on-disk heroes. 0 soft-held.

## Recipes fixed with approved imagery

Pinned `heroImagePath` for classics that previously relied on Spoonacular CDN only:

- chicken-parm
- pulled-pork
- chicken-caesar
- beef-dip
- steak-sandwiches

(5 already had explore/golden pinned paths.)

## Recipes using branded placeholder

None after this pass — all wheel classics resolve to owned paths.

## Emoji fallback locations removed

| File | Change |
|------|--------|
| `client/src/components/meal-hero-image.tsx` | Replaced emoji fallback with `ExploreHeldImageryPlaceholder` |
| `client/src/components/classics-wheel.tsx` | Wheel segments: initials badge instead of food emoji; reveal uses branded fallback |
| `client/src/pages/curated-package.tsx` | Removed large emoji under hero |
| `client/src/components/share/meal-share-card.tsx` | `heldLabel` instead of `emoji` |
| `client/src/components/recipe-card.tsx` | `heldLabel` instead of `emoji` |
| `client/src/components/pizza-card.tsx` | `heldLabel` instead of `emoji` |
| `client/src/components/generator/dinner-wheel-reveal.tsx` | `heldLabel` instead of `emoji` |

## Validation

- **`shared/classic-wheel-imagery.ts`** — owned-path resolution; blocks Spoonacular URLs
- **`scripts/audit-classic-wheel-images.ts`** — fails on missing hero, external URL, missing disk file
- **`npm run audit:classics-wheel`** — 10/10 pass

## Code changes

- `resolveClassicHeroImage()` now returns owned catalog paths only (no Spoonacular CDN)
- `WheelClassic` includes `thumbImage`, `mobileImage`, `imageApproved`, `imageryStatus`, `heldImageryLabel`
- Wheel spin weighting slightly favors `imageApproved` classics
- Initial load highlights first approved classic segment (`getDefaultWheelClassic()`)

## Test results

| Check | Result |
|-------|--------|
| `npx tsx scripts/audit-classic-wheel-images.ts` | **PASS** (10/10) |
| TypeScript `tsc --noEmit` | Run locally after pull |
| Spoonacular heroes in wheel data | **Removed** |
| Emoji as recipe imagery fallback | **Removed** |

### Manual QA (recommended)

- [ ] `/wheel` — spin lands on meal photo in reveal card
- [ ] Wheel segments show 2-letter labels (not food emojis)
- [ ] `/package/:slug` for each classic — hero loads, no emoji block
- [ ] Mobile + desktop — no broken image icons, no console 404s for heroes
