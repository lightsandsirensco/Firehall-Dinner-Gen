# Firehall Meals Image Accuracy Audit

Generated: 2026-06-01T01:13:57.816Z

## Rule

A firefighter should identify the recipe title within **2 seconds** of seeing the image.

**FAIL** if: title ingredient missing · side dish missing · protein only · wrong recipe · tight restaurant crop · family meal not visible

**PASS** if: main dish and all named sides visible · wide family-style firehall framing

## Summary

| Metric | Count |
| --- | ---: |
| Recipes audited | 316 |
| Passed | 316 |
| Failed | 0 |
| Title ingredient mismatches | 0 |
| Missing side dishes | 0 |
| Protein-only heroes | 0 |
| Vision QA enabled | false |

## Failed recipes

_All recipes passed._

## Commands

```bash
npm run audit:firehall-image-accuracy
npm run fix:meal-hero-alt
npm run run:meal-image-trust-fix -- --apply --vision
```