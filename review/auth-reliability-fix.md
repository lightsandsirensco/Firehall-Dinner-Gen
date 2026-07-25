# Auth Reliability Fix — Magic Link Production Hardening

**Date:** 2026-07-17  
**Status:** Implemented

---

## Root cause(s) found

| Cause | Impact |
|-------|--------|
| **Missing / invalid `RESEND_API_KEY` or `SMTP_HOST` in production** | No email sent; previously easier to misread as “silent” success (already fail-closed to 503/502 — kept and strengthened) |
| **Unverified Resend sending domain** (`MAGIC_LINK_FROM`) | Resend API errors; users only saw generic failure; SPF/DKIM/DMARC must be correct at DNS |
| **No SMTP fallback when Resend fails** | Single provider outage = total auth email failure |
| **Rate limit recorded before send** | Failed sends burned hourly email quota → “emails never arrive” after retries |
| **`APP_BASE_URL` ignored for magic-link host** | Docs promised it; wrong/missing `PUBLIC_SITE_URL` could produce bad callbacks |
| **Short 15‑minute expiry + delayed filters** | Hall email filters delay delivery past expiry |
| **Used vs expired links both felt like “broken”** | Poor recovery UX |
| **Check-inbox UI lacked troubleshooting** | Users didn’t check spam / didn’t know to wait / resend |

DNS (SPF/DKIM/DMARC) cannot be fixed in app code — see Remaining recommendations.

---

## Changes made

### Server — `magic-link-mail.ts`
- Resend → **automatic SMTP fallback** on Resend failure  
- **15s timeouts** on Resend fetch; SMTP connection timeouts  
- Classified provider errors (domain unverified, bad API key, rate limit, timeout)  
- Link origin order: `PUBLIC_SITE_URL` → `SITE_URL` → **`APP_BASE_URL`** → `VITE_PUBLIC_SITE_URL` → Replit → request host → canonical www  
- Expiry copy **30 minutes**; optional `MAGIC_LINK_REPLY_TO`  
- Structured logs with email **domain only** (privacy)  
- `getMagicLinkMailStatus()` for public config  

### Server — rate limit
- Check without burning address quota on failure  
- Record per-email limit **only after successful / accepted send**  
- Slightly higher hourly address cap (8); clearer 429 messages + `retry_after_seconds`  

### Server — routes
- `/api/auth/config` exposes `email_configured` + `magic_link_expires_minutes`  
- Magic-link response includes `expires_in_minutes`  
- Verify redirects: `used_link` distinct from `expired_link` / `invalid_link`  
- Token lifetime **30 minutes**  

### Client — Sign-in sheet
- Success panel with check icon + animation  
- **Countdown bar** before resend (45s)  
- “Didn’t get the email?” expandable: spam, delay, typo, resend invalidates old, support mailto  
- Client-side email validation; in-flight lock (no double submit)  
- Better 429/502/503 messages; uses `retry_after_seconds`  
- Mobile-friendly input attrs (`inputMode`, no autocorrect)  
- Warns when `email_configured === false`  

### Client — Auth complete handler
- Clear titles for expired / used / invalid  
- **Re-opens Sign in** automatically so recovery is one tap  

### Docs / env
- `.env.example` notes domain verification + Reply-To + APP_BASE_URL order  

---

## Auth flow (user-facing)

1. Enter email → Send  
2. Instant “Check your inbox” + masked address + Open inbox  
3. Countdown → Resend  
4. Troubleshooting accordion + support link  
5. Tap email link → session cookie → `?signed_in=1` toast  
6. Bad link → toast + Sign-in sheet reopens  

---

## Edge cases handled

| Case | Behavior |
|------|----------|
| Invalid email | Inline validation + 400 |
| Not configured (prod) | 503, no fake success |
| Provider failure | 502 + classified message; SMTP fallback if available |
| Dev / no mail | `dev_link` on screen |
| Rate limit | 429 + retry seconds; doesn’t burn quota on failed send |
| Expired / used / invalid link | Distinct errors + reopen sign-in |
| Multiple requests | New link invalidates unused prior tokens |
| Double-click send | In-flight guard |
| CSRF expired | Clear refresh message |

---

## Remaining recommendations (ops / DNS)

1. **Verify `firehallmeals.com` (or sending subdomain) in Resend** — SPF, DKIM, DMARC  
2. Confirm production secrets: `RESEND_API_KEY`, `MAGIC_LINK_FROM`, `PUBLIC_SITE_URL=https://www.firehallmeals.com`  
3. Optionally set `SMTP_*` as hot standby for Resend outages  
4. Monitor Resend dashboard for bounces/suppressions  
5. Consider custom support inbox + status page if auth mail fails often  
6. Manual QA matrix (Safari/Chrome/Firefox/Edge, mobile, incognito) after deploy  

---

*— End —*
