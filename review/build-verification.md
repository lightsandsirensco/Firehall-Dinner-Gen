# Build Verification Report

**Generated:** 2026-06-02  
**Environment:** Windows 10, Node (project uses nodejs-20 on Replit)

## Commands run

| Command | Result | Duration (approx.) |
|---------|--------|-------------------|
| `npm install` | **PASS** (450 packages, 0 vulnerabilities) | ~4s |
| `npm run check` | **PASS** | ~26s |
| `npm run build` | **PASS** | ~23s |
| `npm run catalog:verify` | **PASS** (Golden 100: 101/101) | ~2s |
| `npm run audit:indexing` | **PASS** (309 URLs, orphans=0) | ~4s |

## TypeScript

- `tsc` — **no errors**
- Full `check` script chain (30+ validation scripts) — **exit 0**

Notable non-blocking notes from `check`:

- Image governance: 60 recipe warnings, **0 blockers** (`validate:image-governance` OK)
- 56 Explore draft rows still need imagery (unpublished)
- Golden 100: 4 title warnings (non-blocking)
- Nutrition audit: 12 suspicious values flagged (report only)

## Production build output

| Artifact | Status |
|----------|--------|
| `dist/index.cjs` | ~3.1 MB (esbuild bundle) |
| `dist/public/index.html` | Present |
| `dist/public/assets/*` | Hashed JS/CSS |
| Build-time sitemap | `client/public/sitemap.xml` (309 URLs) |
| Build-time robots | `client/public/robots.txt` |
| Editorial guides regen | 58 articles → `client/public/content/guides/` |

### Build warnings (non-fatal)

- Browserslist data 8 months old
- Tailwind ambiguous utility classes (`duration-[900ms]`, etc.)
- Vite: `node:fs` / `node:path` externalized in some shared modules (browser compat — existing pattern)
- Chunk size: `approved-catalog` ~803 KB gzip ~206 KB (large but builds)

## Catalog verify

```
Manifest: 101 recipes, 0 errors
Pages on disk: 101/101
Image gaps: 0
Heroes missing: 0
DB published: 101/101
Overall: PASS
```

## Indexing audit

```
sitemap=309 recipes=217 guides=58 orphans=0 pass=true
```

Canonical origin: `https://www.firehallmeals.com`

## Imports / compilation

- Server entry: `server/index.ts` → `dist/index.cjs`
- sql.js WASM resolved via `process.cwd()/node_modules/sql.js/...` — present after install
- No missing module errors during build or check

## Static assets

- `client/public/images` served in production from repo root (see `server/static.ts`)
- Catalog JSON under `client/public/catalog/**` — included in working tree changes

## Verdict

**BUILD: PASS** — safe to deploy on Replit after `npm run build` per `.replit` `[deployment]` config.
