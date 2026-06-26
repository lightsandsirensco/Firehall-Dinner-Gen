# Magic Link Auth Fix

Audit date: 2026-06-22  
Scope: P0 — magic link sign-in appeared to do nothing (no email, unclear UI feedback).

---

## Root cause

Three compounding issues:

1. **Silent success in production when email was not sent**  
   `POST /api/auth/magic-link` always returned `200` with `{ ok: true, sent: false }` when no SMTP provider was configured. The UI treated any `200` as success and showed “Check your inbox” even though no email was dispatched.

2. **Email provider not wired for production**  
   - `nodemailer` was referenced in code and the server bundle allowlist but **was not listed in `package.json` dependencies** — SMTP sends would fail at import time if `SMTP_HOST` was set.  
   - No `RESEND_API_KEY` path existed (common transactional provider).  
   - `.env.example` documented no magic-link / SMTP / Resend variables.

3. **Callback URL could use wrong origin**  
   Magic links used `APP_BASE_URL` / `VITE_PUBLIC_SITE_URL` only, ignoring `PUBLIC_SITE_URL` and canonical `www` normalization. Apex links (`https://firehallmeals.com/...`) still redirect via middleware, but email links now use `resolvePublicSiteOrigin()` → `https://www.firehallmeals.com`.

Secondary gap: magic-link route did not use existing `enforceEmailRateLimit` (now added).

---

## Endpoint fixed

| Route | Change |
|-------|--------|
| `POST /api/auth/magic-link` | Rate limit; fail with **503** if email not configured (production); **502** if provider send fails; **200** only when `sent: true` or dev `dev_link` exposed |
| `GET /api/auth/verify-magic` | Unchanged — token consume, session cookie, redirect `/account?signed_in=1` |

---

## Env vars required

**Production (at least one provider):**

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | **Recommended** — Resend HTTP API for magic link email |
| `MAGIC_LINK_FROM` or `SMTP_FROM` | Verified sender, e.g. `Firehall Meals <noreply@firehallmeals.com>` |
| `PUBLIC_SITE_URL` or `APP_BASE_URL` | Magic link base URL (defaults to `https://www.firehallmeals.com`) |

**SMTP alternative:**

| Variable | Purpose |
|----------|---------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | Default `587` |
| `SMTP_SECURE` | `true` for port 465 |
| `SMTP_USER` / `SMTP_PASS` | Auth when required |
| `SMTP_FROM` | From address |

**Development:**

| Variable | Purpose |
|----------|---------|
| `AUTH_MAGIC_LINK_DEV_EXPOSE=true` | Return `dev_link` in API when email not configured (optional in non-production) |
| Unset providers | Logs link server-side + returns `dev_link` in development |

**Not required for magic link:** `ADMIN_SECRET`, `KLAVIYO_API_KEY`

---

## UI states added/fixed

`client/src/components/auth/sign-in-sheet.tsx`

| State | Behavior |
|-------|----------|
| **Loading** | Spinner on send button; button disabled |
| **Success** | Inline: “Check your email for a sign-in link.” + toast |
| **Dev success** | Shows clickable `dev_link` when server exposes it |
| **Error** | Inline `role="alert"` + destructive toast with server message |
| **Never silent** | `sent` UI only when `body.sent` or `body.dev_link` |

Error messages surfaced from API:

- `Check your email for a sign-in link.`
- `We could not send the sign-in link. Try again.`
- `Email is not configured on this server.`
- `Too many attempts. Try again in a few minutes.` (429)
- `Security token expired. Refresh the page and try again.` (403 CSRF)

---

## Email provider status

| Provider | Status after fix |
|----------|------------------|
| **Resend** | Supported via `RESEND_API_KEY` + `fetch` (no extra package) |
| **SMTP** | Supported via `nodemailer` (now in `package.json`) |
| **None (production)** | **503** — clear error, no fake success |
| **None (development)** | Link logged + `dev_link` in response |

---

## Callback URL used

```
https://www.firehallmeals.com/api/auth/verify-magic?token={token}
```

Built with `resolvePublicSiteOrigin()` from `server/seo/sitemap.ts` (honors `PUBLIC_SITE_URL`, `SITE_URL`, `REPLIT_DEPLOYMENT_URL`, normalizes apex → www).

After verify: redirect to `/account?signed_in=1` with session cookie.

---

## Validation results

| Check | Result |
|-------|--------|
| `npm run check` | Run after fix (includes `test-magic-link-mail.ts`) |
| `npm run build` | Run after fix |
| `scripts/test-magic-link-mail.ts` | URL canonicalization + prod blocked + dev link |
| `scripts/test-auth.ts` | Token create/consume unchanged |

**Manual QA (production):** Requires `RESEND_API_KEY` or SMTP secrets in Replit — set `RESEND_API_KEY` + verified `MAGIC_LINK_FROM`, submit real email, confirm 200 + inbox delivery, click link, confirm session.

**Manual QA (local dev):** Without providers → `dev_link` in response and UI; with `RESEND_API_KEY` → real send.

---

## Remaining risks

1. **Production secrets** — Until `RESEND_API_KEY` or SMTP is set in deploy secrets, users will see “Email is not configured on this server.” (intentional fail-closed).
2. **Post-sign-in redirect** — Still lands on `/account?signed_in=1`; invite/hall return URL preservation is a separate improvement.
3. **Shift reminder email** — Uses same SMTP pattern but not yet updated for Resend (out of scope).
4. **Klaviyo** — Marketing only; not used for auth emails.

---

## Files changed

- `server/auth/magic-link-mail.ts` — Resend + SMTP, canonical URL, structured errors
- `server/auth/auth-routes.ts` — rate limit, proper HTTP status codes
- `client/src/components/auth/sign-in-sheet.tsx` — error/success UX
- `package.json` — `nodemailer` dependency, test script
- `.env.example` — email env documentation
- `scripts/test-magic-link-mail.ts` — regression tests
