# Firehall Meals Production Audit Summary

Generated: 2026-05-31T12:18:56.405Z

## Totals

| Metric | Value |
|--------|------:|
| Approved recipes audited | 233 |
| Image coverage (hero on disk) | 233/233 (100%) |
| Image style pass | 233/233 (100%) |
| Image accuracy (accurate) | 233/233 (100%) |
| Duplicate hero groups | 0 |
| Recipe detail pass | 8/233 (3.4%) |
| Category/filter pass | 233/233 |
| Explore eligible | 233/233 |
| Route pass | 233/233 |
| Public label pass | 233/233 |

## Sub-audit runs

- firehallPhotoStandard: PASS (376 audited, 0 failed, 0 duplicate heroes)
- imageAccuracy (approved inline): PASS (233/233 accurate)
- imageAccuracy (full corpus 761): 203 failures, 23 duplicate heroes
- exploreMapping: PASS (233/233 eligible, 0 conflicts)
- imageGovernance: 58 failures across 566 curated rows
- catalogDuplicates: report written (15 exact + 29 near-duplicate recipe pairs)
- approvedRoutes: PASS (233/233)

## Safe fixes applied

- **181 page JSON image paths** relinked to slug-locked hero/thumb/mobile/rail (`npm run audit:firehall-meals-production -- --fix`)

## Success criteria

| Criterion | Status |
|-----------|--------|
| 100% approved recipes have images | **PASS** (233/233) |
| 0 duplicate hero images | **PASS** |
| 0 broken Explore cards | **PASS** |
| 0 wrong slug-image mappings | **PASS** |
| 0 forbidden public labels | **PASS** |
| 0 recipe pages with vague steps | **FAIL** (8/233 pass) |
| 0 obvious image/title mismatches | **PASS** |
| Firehall kitchen aesthetic (metadata) | **PASS** |

## Remaining manual review

- Recipe detail: 225 pages — see `review/recipe-detail-audit.json`
- Full corpus image accuracy: 203 rows — see `review/image-accuracy-audit.json` (761-recipe scope)
- Image governance: 58 rows — see `review/curated-image-governance-report.json`
- Content duplicates: 15 exact pairs — see `review/duplicate-report.json`

## Recommended next fixes

1. Batch rewrite failing recipe pages (instruction depth, banned step titles like “Rest briefly”, missing `tonightSpread` on breakfast cards)
2. Regenerate or relink 23 duplicate heroes in the full 761-recipe corpus
3. Retire or differentiate 15 exact + 29 near-duplicate recipe pairs
4. Optional human visual QA on Phase 6 BBQ heroes (metadata passes; documentary feel spot-check)

## Report index

| Section | Files |
|---------|-------|
| 1 Image style | `review/full-image-style-audit.json`, `.md` |
| 2 Image accuracy (approved) | inline totals above; full corpus in `review/image-accuracy-audit.json` |
| 3 Image duplicates | `review/image-duplicate-audit.json`, `.md` |
| 4 Recipe detail | `review/recipe-detail-audit.json`, `.md` |
| 5 Category/filters | `review/category-filter-audit.json`, `.md` |
| 6 Explore | `review/explore-production-audit.json`, `.md` |
| 7 Routes | `review/recipe-route-audit.json`, `.md` |
| 8 Public labels | `review/public-label-audit.json`, `.md` |
| Photo intensive | `review/firehall-photo-intensive-audit.json`, `.md` |
