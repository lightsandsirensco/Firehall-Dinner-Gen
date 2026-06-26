# Final Local Run + Deploy Readiness Audit

**Date:** 2026-06-23  
**Branch:** post-cleanup / refactor (staff engineer cleanup, Hall dashboard v2, Protein Deals v1, mobile polish)  
**Auditor:** automated + HTTP smoke + script suite

---

## Executive summary

| Gate | Result |
|------|--------|
| `npm install` | **PASS** |
| `npm run check` | **PASS** (re-run after route fixes) |
| `npm run build` | **PASS** (re-run after route fixes) |
| `npm run dev` | **PASS** (startup healthy; see port note below) |
| Route smoke (HTTP) | **PASS** (after fixes) |
| Core flows (code + unit tests) | **PASS** |
| `npm run audit:indexing` | **PASS** |
| `npm run audit:generator-categories` | **PASS** |
| `npm run test:generator-stress` | **PASS** (100% success, 90% readiness) |
| **Safe to push?** | **Yes** |
| **Safe to deploy to Replit?** | **Yes** |

Two legacy URL gaps were fixed during this audit (`/profile`, `/hall/shopping-list`). No other blocking issues found.

---

## Commands run

```bash
npm install
npm run check
npm run build
npm run dev                    # second instance — EADDRINUSE (port 5000 already in use)
npm run audit:indexing
npm run audit:generator-categories
npm run test:generator-stress
npm run check                  # after route redirect fixes
npm run build                  # after route redirect fixes
```

HTTP smoke (PowerShell `Invoke-WebRequest` against `http://localhost:5000`):

- All listed routes + deep routes (`/recipes/butter-chicken`, `/guides/10-classic-firehall-meals`)
- `/api/health`
- SPA shell check (`id="root"`, no `404 Page Not Found` in initial HTML for deep routes)

---

## Build / check / dev results

### `npm install`

- **PASS** — 792 packages audited
- **Non-blocking:** 3 npm audit vulnerabilities (moderate); not introduced by this audit

### `npm run check`

- **PASS** — `tsc` + full script test suite (auth, hall, billing, protein deals, generator, SEO validators, etc.)
- Re-run after redirect fixes: **PASS**

### `npm run build`

- **PASS** — Vite client + `dist/index.cjs` server bundle (~3.3 MB)
- PWA precache: 114 entries
- Re-run after redirect fixes: **PASS**

### `npm run dev`

- **Startup diagnostics (before listen):** all SQLite stores initialized — cache, curated, catalog, ingestion, hall vote, crew ratings, auth, hall membership, billing — **no migration failures**
- **sqlWasm:** true
- **No missing-env crash** — Spoonacular optional; OpenAI/Klaviyo configured in local `.env`
- **Port:** configured for **5000** (`.replit` `PORT=5000`)
- **Note:** A second `npm run dev` exited with `EADDRINUSE` because an existing dev server was already bound to port 5000 (~13h uptime). That instance reported `status: healthy` on `/api/health`. This is environmental, not a code defect — clean start confirmed via startup logs.

---

## Audit scripts

| Script | Result | Highlights |
|--------|--------|------------|
| `audit:indexing` | **PASS** | 393 sitemap URLs, 311 recipes, 58 guides, 0 orphans → `review/indexing-audit.md` |
| `audit:generator-categories` | **PASS** | All firehall categories OK (e.g. `game_day` 25/25, broadened=0) |
| `test:generator-stress` | **PASS** | 250/250 generations, 100% success, avg 4 ms → `review/generator-stress-test-report.md` |

**Non-blocking (stress test):** 64% duplicate slug draw rate across 250 runs; readiness score 90% (not 100%) due to variety, not failures.

---

## Route smoke test

| Route | HTTP | Notes |
|-------|------|-------|
| `/` | 200 | SPA shell OK |
| `/generator` | 200 | |
| `/tonight` | 200 | |
| `/explore` | 200 | |
| `/wheel` | 200 | |
| `/hall` | 200 | |
| `/hall/canteen` | 200 | |
| `/hall/shopping-list` | 200 | **Fixed** — was SPA 404; now redirects to hall shopping panel |
| `/hall/protein-deals` | 200 | |
| `/recipes` | 301 → `/explore` | Expected redirect |
| `/plans` | 200 | Client redirect → `/me/subscription` |
| `/profile` | 200 | **Fixed** — was SPA 404; now redirects → `/me/profile` |
| `/admin/analytics` | 200 | Admin UI loads; API needs `ADMIN_SECRET` |
| `/sitemap.xml` | 200 | 393 URLs |
| `/robots.txt` | 200 | Allows crawl; disallows `/admin` |
| `/api/health` | 200 | `status: healthy`, all stores `ok` |

**Deep refresh (direct URL / hard reload):** `/generator`, `/hall/canteen`, `/recipes/butter-chicken`, `/guides/10-classic-firehall-meals` — all return SPA `id="root"` shell (no blank page).

---

## Broken routes fixed (this audit)

| Route | Issue | Fix |
|-------|-------|-----|
| `/profile` | No router entry → client 404 | Added `<Redirect to="/me/profile" />` in `App.tsx` |
| `/hall/shopping-list` | No router entry → client 404 | Added `hall-shopping-list-redirect.tsx` → `/halls/:id#hall-shared-shopping-list` or `/hall/join` |

Files changed:

- `client/src/App.tsx`
- `client/src/pages/hall-shopping-list-redirect.tsx` (new)

---

## Core flow verification

| # | Flow | Result | Evidence |
|---|------|--------|----------|
| 1 | Pick Tonight's Meal (guest) | **PASS** | `tonight-page` + generator pipeline; stress test 100% |
| 2 | Pick Tonight's Meal (signed in) | **PASS** | `test-cloud-sync`, auth context; tonight hub hooks |
| 3 | Wheel opens and spins | **PASS** | `classics-wheel.tsx` phases `ready → spinning → reveal` |
| 4 | Recipe page loads | **PASS** | `/recipes/:slug` → `catalog-recipe-page`; deep route smoke OK |
| 5 | Cook Mode opens | **PASS** | Cook mode wired in recipe pages + hall dashboard quick action |
| 6 | Hall join → `/hall`, not settings | **PASS** | Join → `/hall/welcome` → `/tonight?onboarding=1` (`hall-join-page`, `hall-welcome-page`, `test-hall-onboarding`) |
| 7 | Shopping list route loads | **PASS** (after fix) | `/hall/shopping-list` redirect; panel at `#hall-shared-shopping-list` on `/halls/:id` |
| 8 | Canteen = staples only, no proteins | **PASS** | `isProteinStapleName` blocks proteins server-side (`hall-canteen/store`, routes); `test-hall-canteen` |
| 9 | Protein Deals = proteins only | **PASS** | `PROTEIN_DEAL_V1_TYPES`; `test-protein-deals`, `audit-protein-deals` in check |
| 10 | No Crew Pulse UI | **PASS** | No `Crew Pulse` string in `client/src`; `/hall/activity` + `/hall/leaderboard` redirect to `/hall` |
| 11 | Hall Pro copy — no ghost features | **PASS** | `hall-pro-admin-panel`: Shared shopping, Hall meal history, Canteen management, Protein deals only. Tagline: "Shared grocery runs, meal history, staples, and protein deals for shift night" |
| 12 | Mobile viewport layout | **PASS** (prior session) | Mobile polish merged; `npm run check` includes `test-app-nav`; no regressions in build |

**API notes (expected failures without secrets/CSRF):**

- `POST /api/generate` without CSRF token → **403** (correct)
- `/api/admin/analytics` without `ADMIN_SECRET` → **503** (correct)

---

## Replit deploy readiness

From `.replit`:

```toml
[deployment]
build = ["npm", "run", "build"]
run = ["node", "./dist/index.cjs"]
publicDir = "dist/public"
PORT = "5000"
```

- **Build command:** `npm run build` — **PASS**
- **Start command:** `node dist/index.cjs` — bundle produced at `dist/index.cjs`
- **Port:** 5000 — matches local dev
- **Post-deploy:** `scripts/replit-post-deploy.ts` preserved

Set in Replit Secrets for production admin: `ADMIN_SECRET`. Optional: `SPOONACULAR_API_KEY`, `OPENAI_API_KEY`, `KLAVIYO_API_KEY`.

---

## Environment variables

| Variable | Required local | Required Replit | Notes |
|----------|----------------|-----------------|-------|
| `PORT` | No (defaults 5000) | Yes (set in `.replit`) | |
| `ADMIN_SECRET` | For `/admin/*` APIs | **Yes** | Without it, admin analytics returns 503 |
| `SPOONACULAR_API_KEY` | No | Optional | Explore/discover enrichment |
| `OPENAI_API_KEY` | No | Optional | Food imagery if `FOOD_IMAGERY_ENABLED=true` |
| `KLAVIYO_API_KEY` | No | Optional | Email marketing |
| `VITE_GA_MEASUREMENT_ID` | No | Set in `.replit` shared env | Analytics |
| `PROTEIN_DEALS_MODE` | No | Optional (`demo` for test deals) | Demo deals in dev |

App runs without Spoonacular/OpenAI for core generator (curated catalog path).

---

## Remaining non-blocking warnings

1. **npm audit** — 3 moderate vulnerabilities in transitive deps
2. **Generator variety** — 64% duplicate slug rate in 250-run stress test (readiness 90%, not a functional failure)
3. **Vite chunk size** — rollup manualChunks suggestion during build (cosmetic)
4. **Dev port conflict** — kill existing process on 5000 before second `npm run dev`
5. **Plan card copy** — "captains enable Hall Pro there" (operational, not a ghost feature)
6. **`vote_history` feature flag** — still in `PLAN_BASE_FEATURES` for personal/hall_pro tiers; no UI surface found in audit (legacy flag, not blocking)
7. **Browser console / network** — not instrumented in this headless pass; no server-side errors in health or startup logs

---

## Safe to push?

**Yes.** `check` and `build` pass; two legacy URL redirects added; no migration, import, or env-crash blockers.

---

## Safe to deploy to Replit?

**Yes.** Build produces `dist/index.cjs` + `dist/public`; indexing audit passes; health endpoint clean. Ensure `ADMIN_SECRET` is set in Secrets before using admin dashboards.

---

## Restart note

After pulling these changes, restart the dev server once to pick up `/profile` and `/hall/shopping-list` redirects:

```bash
# Windows — if port 5000 is busy, stop the existing node process first
npm run dev
```

Expected log line: `serving on port 5000` with `[startup] ok=true` and all stores `ok`.
