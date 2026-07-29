# Recipe Quality Improvement Sprint — Commercial Kitchen Jargon Audit

Mission: no recipe should assume commercial kitchen equipment or professional culinary
knowledge. Every instruction should be cookable by a volunteer fire hall, a career fire
hall, or someone cooking at home for the first time — with no term that needs a Google
search.

## Scope audited

Searched every recipe source file across all seven catalog collections
(`golden-100`, `hall-expansion`, `performance-meals`, `bbq`, `breakfast`,
`pizza-night`, `smoothies`) plus the `content/guides` editorial articles, for the
full banned-term list: hotel pan, steam table, hot box, gastronorm, bain-marie,
cambro, deli container, rondeau, chinois, sauteuse, half-pan, sixth-pan, full-pan.

`gastronorm`, `hot box`, `rondeau`, `chinois`, `sauteuse`, `deli container`, and
`sixth-pan` were **not found anywhere** in the recipe library. `hotel pan(s)`,
`cambro`, `steam table`, `bain-marie`, and `half-pan` were, extensively.

## What was found and fixed

**275+ instances across 40 source files**, all replaced with plain-language
equivalents:

| Term | Instances | Replaced with |
|---|---|---|
| hotel pan / hotel pans | ~245 | baking dish / baking dishes (large baking dish for deep/oversized contexts) |
| cambro | 21 | lidded container / large lidded container / covered container |
| steam table | 6 | "doesn't hold up if it sits around waiting to be served" / warm oven |
| bain-marie | 2 | a pot on low heat / a pot set over low heat |
| half-pan / hotel half-pan | 4 | half-size baking dish / 9x13 dish |

Also fixed opportunistically (not the primary banned-term list, but the same
"nobody should have to Google this" standard from the brief):
- **"mise en place"** (4 instances, `detail-rewrite-engine.ts` + `batch-bowl-classics.ts`) → "prep and measure everything first" / "everything prepped"
- **"deglaze"** used with zero explanation (`seo-articles-data.ts`) → "add a splash of stock or water to the hot pan and scrape up the browned bits stuck to the bottom"
- The exact example from the brief — the lasagna step literally titled **"Layer in hotel pans"** (`golden-100/recipe-quality/golden-p0-classic-packs.ts`, used for both `batch-lasagna` and `mostaccioli-sausage-bake`) — is now **"Assemble the layers"**.

### Where the jargon was coming from

Two categories of source:

1. **Static per-recipe text** in `shared/**/*.ts` recipe objects (bbq, hall-expansion,
   breakfast, performance-meals, golden-100 classic packs, editorial guide copy).
   Fixed with a scripted find-and-replace (`scripts/fix-commercial-kitchen-jargon.ts`,
   kept in the repo) across 33 files, plus ~10 files edited by hand where the
   phrasing needed grammar-aware rewriting (bain-marie, steam-table sentences, the
   lasagna step title, mise en place, deglaze).
2. **A code-level text generator**, `shared/golden-100/recipe-quality/detail-rewrite-engine.ts`,
   which programmatically pads thin/generic instructions for any golden-100 recipe
   and was injecting "hotel pans" and "mise en place" into freshly-generated steps.
   This was the more important fix — it's called on every build, so leaving it
   unfixed would have kept reintroducing commercial jargon into future recipes even
   after the static text was cleaned up. Its five injection points are now baking-dish/
   plain-English throughout.

### Intentionally left alone

Internal AI photo-generation prompt files (`shared/food-imagery/**`,
`shared/image-style-presets.ts`, `shared/plating-accuracy-standard.ts`,
`shared/editorial-image-quality.ts`, `server/prompts/editorial-image-style.ts`,
`server/imagery/build-image-prompt.ts`) still reference "steam tables," "hotel
pans," etc. as part of the *photography* environment description fed to the image
model — this text is never shown to users and describing a commercial-looking fire
hall kitchen background is the correct intent for those prompts, so it was left as-is
per "do not introduce unnecessary changes outside the recipe instructions."
Internal QA regex classifiers (`meal-image-completeness.ts`, `hall-guides-audit.ts`)
that pattern-match on these words for auditing purposes were also left untouched —
they're detection logic, not user-facing copy.

## Regeneration and verification

Rebuilt every collection's static JSON from the fixed sources:
`hall-expansion:generate-pages`, `catalog:generate-bbq`, `catalog:generate-breakfast`,
`content:generate-guides`, `fuel:generate-smoothies`, `catalog:generate-pages`
(golden-100), `pizza-night:generate-pages`, and a new
`scripts/rebuild-performance-meals-all.ts` (rebuilds all 71 performance-meals pages
from batch01–07 while preserving each recipe's already-published images).

Final sweep across all 501 generated recipe/guide JSON files for every banned term:
**0 remaining matches.**

`npx tsc --noEmit`: clean. `npm run build`: clean production build (client + server).

## Known pre-existing issues (unrelated to this sprint, not introduced by it)

`catalog:verify` flags 2 pre-existing golden-100 validation failures —
`beef-dip` and `beef-barley-soup` — both already documented in
`review/recipe-detail-audit.md` before this sprint (thin instructions / missing
sauce detail). Neither recipe's published JSON contains any commercial-kitchen
jargon, so they don't affect this audit's completion; they're a separate content-
depth gap that predates this work.

## Files changed

- `scripts/fix-commercial-kitchen-jargon.ts` (new, reusable) — bulk replacement script
- `scripts/rebuild-performance-meals-all.ts` (new, reusable) — full performance-meals rebuild helper
- 33 files fixed by the script: bbq (`bbq-30`, `bbq-expansion` batches), hall-expansion
  (`adapted/*`), breakfast (`breakfast-expansion/*`), performance-meals (`batch-01`–`06`),
  golden-100 recipe-quality packs, `curated-hall-packages.ts`, `classic-hall-meals.ts`,
  `seo/landing-pages-data.ts`, `server/golden-100/editorial-templates.ts`,
  `scripts/generate-breakfast-catalog.ts`
- 10 files fixed by hand: `detail-rewrite-engine.ts`, `batch-bowl-classics.ts`,
  `articles-data.ts`, `seo-articles-data.ts`, `cornerstone-articles-data.ts`,
  `firefighter-red-lead-sauce-data.ts`, `guide-depth-enrichment.ts`,
  `curated-image-governance/firehall-hero-alt.ts`
- All catalog `index.json` + `pages/*.json` under `client/public/catalog/**` and
  `client/public/content/guides/**` regenerated from the fixed sources.
