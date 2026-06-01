# Firehall Meals Production Audit Summary

Generated: 2026-06-01T01:33:27.649Z

## Totals

| Metric | Value |
|--------|------:|
| Approved recipes audited | 228 |
| Image coverage (hero on disk) | 225/228 (98.7%) |
| Image style pass | 225/228 (98.7%) |
| Image accuracy (accurate) | 228/228 (100%) |
| Duplicate hero groups | 0 |
| Recipe detail pass | 228/228 (100%) |
| Category/filter pass | 228/228 |
| Explore eligible | 225/228 |
| Route pass | 225/228 |
| Public label pass | 228/228 |

## Sub-audit runs

- firehallPhotoStandard: PASS (376 audited, 0 failed, 0 duplicate heroes)
- imageAccuracy (approved inline): PASS (228/228 accurate)
- imageAccuracy (full corpus 761): 203 failures, 23 duplicate heroes — run `audit:firehall-photo-intensive`
- exploreMapping: PASS (225/228 eligible, 0 conflicts)
- imageGovernance: 58 failures across 566 curated rows (non-blocking for Explore)
- catalogDuplicates: report written (15 exact + 29 near-duplicate recipe pairs)
- approvedRoutes: PASS (225/228)

## Safe fixes applied

- Run `npm run audit:firehall-meals-production -- --fix` to relink slug-locked image paths on page JSON

## Success criteria

| Criterion | Status |
|-----------|--------|
| 100% approved recipes have images | **FAIL** (225/228) |
| 0 duplicate hero images | **PASS** |
| 0 broken Explore cards | **FAIL** |
| 0 wrong slug-image mappings | **PASS** |
| 0 forbidden public labels | **PASS** (228/228) |
| 0 recipe pages with vague steps | **PASS** (228/228) |
| 0 obvious image/title mismatches | **PASS** (228/228) |
| Firehall kitchen aesthetic (metadata) | **FAIL** (225/228) |

## Recommended next fixes

1. Batch rewrite 225 failing recipe pages (instruction depth, banned step titles, missing tonightSpread on breakfast cards)
2. Address 58 image-governance failures + 23 duplicate heroes in full 761-recipe corpus
3. Review 15 exact + 29 near-duplicate recipe pairs in review/duplicate-report.json

## Remaining manual review

- Image style: `cajun-grilled-cod-crew`
- Image style: `grilled-cod-lemon-packets`
- Image style: `garlic-butter-shrimp-skewers`
- No duplicate heroes
