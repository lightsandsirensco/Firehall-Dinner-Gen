# Git Audit — Pre-Push

**Generated:** 2026-06-02  
**Branch:** working tree (not committed in this audit)

## Summary

| Metric | Count |
|--------|------:|
| **Total changed paths** | **616** |
| Modified (`M`) | ~556 |
| Untracked (`??`) | ~60 |
| Deleted | 0 observed |

## Do NOT commit (verified)

| Pattern | `.gitignore` | In `git status`? |
|---------|--------------|------------------|
| `.env` | Yes (line 11) | **No** |
| `.env.local` | Yes | **No** |
| `node_modules/` | Yes | **No** |
| `dist/` | Yes | **No** |
| `data/*.db` | Yes | **No** |

## Change categories

### 1. Catalog content (~305 files)

`client/public/catalog/**/pages/*.json` — recipe page JSON (bbq, breakfast, golden-100, meals, pizza-night, smoothies, etc.). **Intended for commit** (site content).

### 2. Hall guides (~59 files)

`client/public/content/guides/**` — regenerated during `npm run build` from `shared/editorial/*`. **Intended for commit**.

### 3. Images (~30+ files)

`client/public/images/**` — hero/thumb updates (golden-100, breakfast, meals). **Intended for commit** (binary assets).

### 4. SEO generated

- `client/public/sitemap.xml` (modified at build)

### 5. Application source (~45 modified + ~15 untracked)

**Client**

- `client/src/components/explore-catalog-browser.tsx` (mobile explore)
- `explore-catalog-card-boundary.tsx` (new)
- `explore-mobile-page-size.ts` (new)
- `explore-card-image.ts`, `approved-catalog-*.ts`
- Recipe pages: golden, breakfast, smoothie
- `recipe-nutrition-panel.tsx`, `explore-rating-collections.tsx`

**Server**

- `server/routes.ts`
- `server/golden-100/*`, `server/imagery/*`
- `server/analytics/*` (if tracked — product analytics store/routes)

**Shared**

- `shared/nutrition/*`, `shared/golden-100/*`, `shared/editorial/*`
- `shared/generation/*` (new — generator stress test)
- `shared/plating-accuracy-standard.ts` (new)

**Scripts**

- Audit: `audit-404`, `audit-indexing`, `audit-hall-guides`, `audit-nutrition-*`, `audit-explore-mobile`
- `generator-stress-test.ts`, `generate-editorial-content.ts`, etc.

**Config**

- `package.json` (new npm scripts)

### 6. Review / audit artifacts (~40+ files)

`review/*.md`, `review/*.json` — **safe to commit** as documentation; optional to exclude if you prefer a smaller commit:

- `review/404-audit-report.md`
- `review/analytics-verification-report.md`
- `review/generator-stress-test-report.md`
- `review/mobile-explore-verification.md`
- `review/indexing-audit.md`
- Many regenerated audit JSON/MD from `npm run check`

**Do not commit** if regenerated locally with machine paths only:

- Reports are fine; they may contain `C:\Users\Mike\OneDrive\...` paths in JSON (cosmetic, not secrets).

### 7. Build artifacts

- `dist/` — **ignored**, not staged ✓

### 8. Local-only paths in repo (not runtime)

| Location | Risk |
|----------|------|
| `scripts/generate-red-lead-lead-magnet-pdf.ts` | Windows Chrome/Edge paths — **dev script only** |
| `review/*.json` | May embed local absolute paths — not secrets |

No `OneDrive` references in server/client runtime code.

## Secrets scan

- No `.env` in status
- `.env.example` documents placeholders only (no real keys)
- Replit shared env in `.replit` contains **public** GA measurement ID only

## Recommended staging strategy

1. **Single production commit** (if desired): source + catalog + guides + images + sitemap + review reports
2. **Or split** (optional): (A) app fixes + scripts, (B) catalog/content bulk — user preference

## `.gitignore` gaps

None critical for deploy. Optional additions (not required):

- `review/*-audit.json` if you want audits generated only in CI

## Exclude before commit (local / duplicate assets)

Untracked `*-BeepBoop.jpg` / `*-BeepBoop.webp` under `client/public/images/` — appear to be local generation duplicates; **do not stage** (use canonical filenames without `-BeepBoop` suffix).

## Pre-commit checklist

- [ ] Confirm no `.env` staged: `git status --short | findstr env`
- [ ] Do not `git add dist/` or `data/*.db`
- [ ] Skip `*-BeepBoop*` image paths unless intentionally replacing heroes
- [ ] Run `npm run build` once more before commit so `sitemap.xml` / guides match sources
