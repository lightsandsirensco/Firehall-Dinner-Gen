# Handheld Recipe Trust Pass — Image Generation

**Generated:** 2026-06-04  
**Status:** All 7 recipes **PASS** (production-ready imagery)

## Actions completed

1. **Title-locked prompts** added for all 7 slugs in `shared/food-imagery/title-locked-prompts.ts`
2. **Generated unique heroes** via `scripts/generate-batch-handheld-imagery.ts --force` (gpt-image-1, 1024×1024)
3. **Card variants** written: thumb + mobile + rail per slug (`writeHallExpansionCatalogImageVariants` / `writeEditorialImageVariants`)
4. **Page JSON + index** synced (`scripts/patch-handheld-page-images.ts`)
5. **Bootstrap donor script disabled** (`bootstrap-batch-handheld-images.ts` exits BLOCKER)
6. **Heuristic fix** for `Sausage & Peppers on Buns` title parsing (`meal-image-completeness.ts` — multi-word cues before `/bun/` shortcut)

## Per-recipe verdict

| Recipe | Slug | Image trust | Donor reuse | Duplicate hero | Explore card | Mobile card | Overall |
|--------|------|-------------|-------------|----------------|--------------|-------------|---------|
| Chicken Caesar Wraps | `chicken-caesar-wraps` | PASS | PASS | PASS | PASS | PASS | **PASS** |
| Buffalo Chicken Wraps | `buffalo-chicken-wraps` | PASS | PASS | PASS | PASS | PASS | **PASS** |
| Greek Chicken Pitas | `greek-chicken-pitas` | PASS | PASS | PASS | PASS | PASS | **PASS** |
| Beef Gyros | `beef-gyros-for-the-hall` | PASS | PASS | PASS | PASS | PASS | **PASS** |
| Chicken Shawarma Pitas | `chicken-shawarma-pitas` | PASS | PASS | PASS | PASS | PASS | **PASS** |
| Sausage & Peppers on Buns | `sausage-peppers-on-buns` | PASS | PASS | PASS | PASS | PASS | **PASS** |
| Chicken and Dumplings | `chicken-dumpling-soup` | PASS | PASS | PASS | PASS | PASS | **PASS** |

## Audit runs

| Audit | Result |
|-------|--------|
| `audit-batch-handheld-image-trust.ts` | **7/7 PASS** — `review/batch-handheld-image-trust-audit.json` |
| `audit-meal-image-trust.ts` (7 slugs) | **7/7 PASS** |
| `audit-batch-handheld-expansion.ts` | **7/7 PASS** (recipe logic + image paths) |
| `audit-explore-mobile.ts` | PASS |
| Mobile screenshots | `review/batch-handheld-mobile-screenshots/` (7/7) |

## Image paths (unique per slug)

**Hall expansion (6):**

- Hero: `/images/hall-expansion/{slug}.jpg`
- Card: `/images/thumbs/hall-expansion/{slug}.jpg`
- Mobile: `/images/mobile/hall-expansion/{slug}.jpg`
- Rail: `/images/rails/hall-expansion/{slug}.jpg`

**Golden (1):**

- Hero: `/images/golden-100/chicken-dumpling-soup.jpg`
- Card: `/images/thumbs/chicken-dumpling-soup.jpg`

## Regenerate command

```bash
npx tsx scripts/generate-batch-handheld-imagery.ts --force
npx tsx scripts/patch-handheld-page-images.ts
npx tsx scripts/audit-batch-handheld-image-trust.ts
```

## Commit readiness

**Safe to commit** from an image-trust perspective. No placeholder, donor, or duplicate heroes in this batch.
