# Stage 5 — Production Readiness Report

Generated as part of platform stabilization (validation, runtime hardening, QA).

## Executive summary

Firehall Meals has been hardened for **local dev** and **Replit production** with startup diagnostics, safe datastore recovery, ESM/CJS-safe concurrency limiting, customer-safe API errors, and Stage 5 validation scripts. The platform is **production-viable** with known optional gaps (full Golden 100 imagery run, CDN cutover).

| Area | Score (1–10) | Status |
|------|--------------|--------|
| Runtime stability | 8 | Startup bootstrap, corrupt DB recovery, safe JSON |
| Deployment stability | 8 | Build guards, `/api/health`, fatal startup logging |
| Mobile quality | 7 | Sticky CTA pattern, safe areas, editorial image resolver |
| Recommendation quality | 8 | Feed fallback, rate limits, context API sanitization |
| Imagery consistency | 7 | Visual lock + variants; batch generation optional |
| Trust / error UX | 8 | No Zod dumps in prod, sanitized 500s |

## What was implemented

### Runtime & startup (`server/startup/bootstrap.ts`)
- Per-store init isolation (cache, curated, catalog, ingestion, hall vote)
- Environment validation (dist/public, sql.js WASM in production)
- `GET /api/health` with diagnostics payload
- Fatal startup → `process.exit(1)` with logged cause (no silent post-build crash)

### Data resilience
- **SQLite**: corrupt `data/cache.db` renamed to `.corrupt.<timestamp>`, fresh DB created
- **Cache**: malformed `recipe_json` rows deleted on read (existing)
- **Curated**: `safeJsonParse` for `editorial_image_json`, `quality_breakdown_json`, `generate_response_json`
- **Migrations**: per-migration error surfacing
- **Explore feed**: seed fallback if intelligent feed throws

### ESM/CJS (`server/lib/concurrency-limit.ts`)
- `p-limit` v7 removed from esbuild bundle allowlist (external)
- Dynamic import + in-process semaphore fallback for food imagery queue and batch utils
- `sql.js` remains external with `.default` interop (unchanged, verified)

### Error handling (`server/lib/api-errors.ts`)
- Production API messages sanitized (no Zod/stack leakage)
- Explore + recommendations context use safe messages

### Testing tooling
| Script | Purpose |
|--------|---------|
| `npm run stage5:health` | Startup + store init + wasm + optional dist check |
| `npm run stage5:validate` | Golden 100 manifest, visual lock, rails, DB |
| `npm run stage5:scan-images` | Hero/mobile/thumb/rail file presence |

## System audit — findings

### Stable
- Recommendation engine (cached feed, rotation, master rails)
- Generation rate limits (dev relaxed, prod strict)
- Editorial imagery prompt system (visual lock, mobile crops, QA scoring)
- Explore sections API try/catch + fallback feed

### Hardened this phase
- Production boot path (`index.ts` try/catch)
- Duplicate startup init → single bootstrap
- Malformed DB JSON on curated rows
- Intelligent explore feed total failure

### Residual risks
1. **Golden 100 heroes** — paths deterministic; files require `npm run imagery:golden-100` (needs API key + seed)
2. **sharp optional** — without install, mobile/thumb/rail are copies of hero bytes
3. **Catalog/ingestion store failure** — marked `degraded`; app continues (by design)
4. **Spoonacular dependency** — Explore degrades without key; message is user-safe 503
5. **sql.js WASM path** — must exist in `node_modules` on Replit (no native better-sqlite3)
6. **Explore API** — `editorialImage` not yet passed to client cards (resolver ready in `client/src/lib/editorial-image.ts`)

### Duplication / coupling notes
- Two imagery systems: legacy `food-imagery` + editorial Golden 100 pipeline (intentional migration path)
- `getSharedLocalDb()` single file for cache + curated + votes (acceptable; corrupt recovery helps all)

## Deployment checklist (Replit)

1. `npm install` (includes `sql.js`; optional `sharp`)
2. `npm run build` — must produce `dist/public/index.html` + `dist/index.cjs`
3. Set secrets: `OPENAI_API_KEY`, `SPOONACULAR_API_KEY`, `ADMIN_SECRET`, optional `FOOD_IMAGERY_ENABLED=true`
4. Start: `npm start` (NODE_ENV=production)
5. Verify: `GET /api/health` → `status: "healthy"`
6. Optional: `npm run deploy:prep` / `imagery:golden-100`

## Performance notes
- Explore feed cached 10 minutes per context fingerprint
- Recommendation batch fetch (4 rails parallel) with 80ms stagger
- Hero images: lazy load + LQIP when metadata present
- Rate limit peek/record pattern avoids double-counting

## Future roadmap (post–Stage 5)
1. Wire `editorialImage` through Explore API → `ExploreRecipeImage`
2. CDN cutover via `EDITORIAL_CDN_BASE_URL`
3. Admin image approval queue (metadata ready)
4. Native SQLite driver on Linux deploy target (optional perf win)
5. E2E mobile viewport tests (Playwright)

## Mobile QA notes
- Home: sidebar generate hidden on mobile (`hidden lg:flex`); single sticky CTA
- Safe area: `pb-safe-sticky` on main content
- Filter panel: bottom sheet for advanced options on mobile
- Explore: 4:5 rail aspect, cinematic grade, lazy images

---

*Re-run validation: `npm run check && npm run stage5:health && npm run stage5:validate`*
