# Environment Variables Audit

**Generated:** 2026-06-02  
**Scope:** Replit / production deployment readiness (no feature changes)

## Executive summary

| Area | Status |
|------|--------|
| App starts without optional secrets | **PASS** |
| OpenAI / imagery degrade gracefully | **PASS** |
| Analytics ingest degrades gracefully | **PASS** |
| Admin API without `ADMIN_SECRET` | **Degraded** (503 on `/api/admin/*`) |
| Klaviyo without key | **Warning** (email endpoints fail at runtime) |
| Production hard requirements (`dist/public`, sql.js WASM) | **Enforced in bootstrap** |

## Replit configuration

| Item | Value |
|------|--------|
| Dev run | `npm run dev` (port 5000) |
| Deploy build | `npm run build` |
| Deploy run | `node ./dist/index.cjs` |
| Static root | `dist/public` |
| Shared secrets (`.replit` `[userenv.shared]`) | `VITE_GA_MEASUREMENT_ID`, `DAILY_LLM_BUDGET_USD` |
| Post-merge hook | `scripts/post-merge.sh` → migrations + `replit-post-deploy.ts` |

## Required vs optional

### Production-critical (deploy will fail or serve broken app if missing)

| Variable | Required? | Behavior if missing |
|----------|-----------|---------------------|
| *(none for HTTP serving)* | — | Server binds `PORT` (default 5000); static from `dist/public` after `npm run build` |
| `NODE_ENV=production` | Set by build / Replit deploy | Dev uses Vite middleware; prod uses `serveStatic` |
| `dist/public` | Must exist after build | Bootstrap **throws** in production if missing |
| `node_modules/sql.js/dist/sql-wasm.wasm` | Must exist after `npm install` | Bootstrap **throws** in production if missing |

### Strongly recommended (Replit Secrets)

| Variable | Purpose | If missing |
|----------|---------|------------|
| `ADMIN_SECRET` | `/api/admin/*`, admin UI, analytics dashboard API | Admin routes return **503** with message to set secret |
| `OPENAI_API_KEY` or `AI_INTEGRATIONS_OPENAI_API_KEY` | AI generation, optional imagery | Warning at startup; generation/imagery disabled |
| `VITE_GA_MEASUREMENT_ID` | GA4 in client bundle | **Prod fallback:** `G-LYT598M5KT` via `client/src/lib/ga-config.ts` |
| `SPOONACULAR_API_KEY` | Spoonacular-backed discover / some generator paths | Logged warning; Spoonacular routes fail gracefully |

### Optional (app must not crash)

| Variable | Purpose | If missing |
|----------|---------|------------|
| `KLAVIYO_API_KEY` | Newsletter / Klaviyo events | `validateKlaviyoConfig()` warns; subscribe APIs return errors |
| `FOOD_IMAGERY_ENABLED` | AI hero pipeline | Off unless exactly `"true"` + OpenAI key |
| `VITE_CLARITY_PROJECT_ID` | Microsoft Clarity | Disabled |
| `APIFY_API_TOKEN` | Pinterest trend ingest | Ingest scripts only |
| `PUBLIC_SITE_URL` / `SITE_URL` / `REPLIT_DEPLOYMENT_URL` | Sitemap canonical origin | Build uses `https://www.firehallmeals.com` when unset |
| `ENABLE_POOL_WARMUP` | Pre-gen pool | Off by default (on-demand generation) |
| `DEBUG_LOGS` | Verbose logging | Off |
| `TRUST_PROXY_HOPS` | Rate limit behind proxy | Sensible defaults in code |

### Dev-only (never set in Replit production)

| Variable | Notes |
|----------|--------|
| `SPOONACULAR_INSECURE_TLS` | Windows TLS workaround |
| `OPENAI_INSECURE_TLS` | Windows TLS workaround |
| `VITE_ADMIN_SECRET` | Exposes admin key in client bundle — dev only |

## Graceful degradation (verified in code)

### OpenAI

- `server/startup/bootstrap.ts`: missing key → **warning**, not fatal
- `hasOpenAIKey()` used before enabling generation paths
- `createOpenAIClient()` throws only when a route explicitly calls it without a key

### Analytics

- `server/analytics/analytics-routes.ts`: lazy `initAnalyticsStore()`; failures return **500** on ingest, not process exit
- SQLite path: `data/cache.db` under `process.cwd()` (Replit-safe, created on first write)
- CSRF required on `POST /api/analytics/events` (expected; browser client sends token)

### Admin

- `server/admin-auth.ts`: no `ADMIN_SECRET` → **503** `"Admin API is disabled"` (not a crash)

### Klaviyo

- `server/routes.ts` startup: logs warning if key invalid/missing; server continues

## SQLite paths

| Path | Usage |
|------|--------|
| `data/cache.db` | Shared local DB (cache, votes, analytics, crew ratings) via `getSharedLocalDb()` |
| `data/*.db` | **Gitignored** — ephemeral on Replit; migrations run post-deploy |

No hardcoded `OneDrive` or `C:\Users\...` in server runtime paths.

## Client build-time env

| Variable | Embed | Fallback |
|----------|-------|----------|
| `VITE_GA_MEASUREMENT_ID` | Vite `import.meta.env` | `DEFAULT_GA_MEASUREMENT_ID` in production |
| `VITE_EDITORIAL_CDN_BASE_URL` | Optional CDN for heroes | Local `/images/...` |
| `VITE_ADMIN_SECRET` | Optional dev admin UI | Prompt at runtime |

## Replit Secrets checklist (post-push deploy)

```
ADMIN_SECRET=<strong-random>
OPENAI_API_KEY=sk-...
SPOONACULAR_API_KEY=...          # recommended
KLAVIYO_API_KEY=...              # if using email capture
VITE_GA_MEASUREMENT_ID=G-LYT598M5KT   # already in .replit shared; confirm on deploy build
```

## Findings

1. **No startup crash** when optional API keys are unset (local prod smoke test: all stores `ok`).
2. **`ADMIN_SECRET`** must be set on Replit for admin/analytics dashboard APIs — not required for public site.
3. **GA4** ships in production builds even without env (canonical ID fallback).
4. **`.env` / `.env.local`** are gitignored; not present in `git status`.
