# Handheld batch deliverable (7 meals)

Generated: 2026-06-04

## Pre-build audit

| Check | Verdict |
|-------|---------|
| Greek Chicken Pitas vs Chicken Shawarma Pitas | **SUFFICIENTLY DIFFERENT** (lemon-oregano + tzatziki vs warm shawarma spice + pickles + garlic-tahini) |
| Buffalo Chicken Wraps vs catalog | **PASS** — only `buffalo-chicken-dip` (dip format); no buffalo wrap/sandwich |
| Chicken & Dumplings | **ENHANCED IN PLACE** — slug `chicken-dumpling-soup` (golden-100); no second recipe |

Report: `review/handheld-prebuild-audit.json`

## Recipes built

| # | Title | Slug | Collection | Source |
|---|-------|------|------------|--------|
| 1 | Chicken Caesar Wraps | `chicken-caesar-wraps` | hall-expansion | America's Test Kitchen |
| 2 | Buffalo Chicken Wraps | `buffalo-chicken-wraps` | hall-expansion | Serious Eats |
| 3 | Greek Chicken Pitas | `greek-chicken-pitas` | hall-expansion | Serious Eats |
| 4 | Beef Gyros | `beef-gyros-for-the-hall` | hall-expansion | Serious Eats |
| 5 | Chicken Shawarma Pitas | `chicken-shawarma-pitas` | hall-expansion | Serious Eats |
| 6 | Sausage & Peppers on Buns | `sausage-peppers-on-buns` | hall-expansion | America's Test Kitchen |
| 7 | Chicken and Dumplings | `chicken-dumpling-soup` | golden-100 | Serious Eats (hand-written pack) |

Hall expansion count: **83** (was 77).

## Audits (all PASS)

| Audit | Output |
|-------|--------|
| Duplicate | `review/batch-handheld-duplicate-report.json` |
| Recipe / logic / nutrition / scaling | `review/batch-handheld-recipe-audit.json` |
| Image trust | `review/batch-handheld-image-audit.json` |

Per-recipe overall: **PASS** × 7

## Images (interim donors)

Bootstrap: `scripts/bootstrap-batch-handheld-images.ts`

| Slug | Donor | Note |
|------|-------|------|
| chicken-caesar-wraps | chicken-caesar | Caesar salad donor until dedicated wrap hero |
| buffalo-chicken-wraps | buffalo-chicken-dip | Orange buffalo colour; not wrap cross-section yet |
| greek-chicken-pitas | chicken-souvlaki | Pita/grill donor |
| beef-gyros-for-the-hall | steak-sandwiches | Sliced meat donor |
| chicken-shawarma-pitas | shawarma-bar-night | Shawarma donor |
| sausage-peppers-on-buns | meatball-hoagies | Hoagie donor |
| chicken-dumpling-soup | (existing) | Regenerate with `catalog:generate-images` when ready for stew+dumplings hero |

## Build verification

- `npm run check` — PASS
- `npm run build` — PASS
- `test-soup-instruction-routing` — PASS (chicken-dumpling-soup stays soup class, no chili template)

## Mobile audit

Run with dev server on port 5000:

```bash
npm run dev
npx tsx scripts/capture-batch-handheld-mobile-screenshots.ts
```

Output folder: `review/batch-handheld-mobile-screenshots/`

## Git

**Not committed** per instructions. Stage handheld + dumplings files when ready.
