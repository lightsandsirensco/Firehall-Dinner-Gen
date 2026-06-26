# Magic Link UX Polish

**Date:** June 22, 2026  
**Status:** Implemented

---

## Summary

Magic link sign-in now has a production-quality success screen, return-to navigation, sliding session persistence, branded email, founder funnel analytics on `/admin/signups`, and validation coverage for all primary auth entry points.

---

## 1. Success screen

**File:** `client/src/components/auth/sign-in-sheet.tsx`

| Feature | Implementation |
|---|---|
| Masked email | `maskEmailAddress()` — e.g. `c***@firehall.org` |
| Resend timer | 60s cooldown with live countdown |
| Change email | “Use a different email” resets sent state |
| Open inbox | Provider-aware link (Gmail, Outlook, Yahoo, iCloud, or `mailto:`) |
| Dev link | Shown only when server returns `dev_link` |

---

## 2. Intended destination (return-to)

**Files:** `shared/auth/return-to.ts`, `client/src/lib/auth/return-to.ts`, `client/src/lib/auth/context.tsx`, `server/auth/auth-store.ts`, `server/auth/auth-routes.ts`

| Step | Behavior |
|---|---|
| User opens sign-in | `openSignIn()` captures current path (or explicit `returnTo`) in sessionStorage |
| Magic link request | `return_to` sent to `POST /api/auth/magic-link` and stored on token row |
| Email click | Server redirects to `return_to?signed_in=1` (sanitized internal paths only) |
| OAuth (Google/Apple) | `afterSignIn()` navigates to stored return path |
| Blocked paths | `/admin`, `/api/*`, `/vote/*`, external URLs rejected |

**Migration:** `server/db/migrations/038_magic_link_return_to.sql`

---

## 3. Session persistence

| Setting | Value |
|---|---|
| Cookie | `fh_auth`, httpOnly, sameSite=lax, 30 days |
| DB session | 30-day `expires_at` on `auth_sessions` |
| Sliding refresh | Each authenticated request extends `expires_at` and re-sets cookie |

**Files:** `server/auth/auth-store.ts`, `server/auth/auth-middleware.ts`

Sessions end only on explicit logout or expiry — not on browser close.

---

## 4. Email template

**File:** `server/auth/magic-link-mail.ts`

- Dark Firehall Meals branded layout
- Bebas-style wordmark treatment
- Tagline: “Built by Firefighters · Tested in the Firehall”
- Red CTA button, 15-minute expiry copy, plain-text fallback

---

## 5. Founder analytics

**Events** (`shared/analytics/events.ts`):

| Event | When |
|---|---|
| `magic_link_requested` | Client submits email |
| `magic_link_sent` | Server sends email successfully |
| `magic_link_failed` | Send/config/rate-limit failure |
| `magic_link_opened` | User hits `/api/auth/verify-magic` |
| `magic_link_completed` | Token consumed, session created |
| `magic_link_expired` | Expired or already-used token |

**Admin UI:** `/admin/signups` shows 30-day funnel cards (requested → sent → opened → completed + completion rate).

---

## 6. Validation matrix

| Flow | Return path | Expected after auth |
|---|---|---|
| Guest browsing | Current page | Stays on page (signed in) |
| Returning user `/me/saved` | `/me/saved` | Lands on saved meals |
| Join Hall `/hall/join?token=…` | Full join URL | Returns to join with token preserved |
| Hall Invite | Invite URL | Same |
| Plans `/plans` | `/plans` | Returns to plans |
| Saved Meals `/me/saved` | `/me/saved` | Returns to saves |
| Shopping List `/hall/shopping-list` | Shopping list path | Returns to list |

**Automated tests:**
- `scripts/test-magic-link-ux.ts` — return-to sanitization, consume, expiry
- `scripts/test-magic-link-mail.ts` — URL building, dev/prod send modes
- `scripts/validate-analytics.ts` — magic link event types registered

**Manual QA:**
1. Open sign-in from each flow above as guest
2. Request magic link → confirm success screen (masked email, inbox button, timer)
3. Click link → confirm redirect to original page with `signed_in` stripped
4. Refresh → confirm still signed in
5. Sign out → confirm session cleared

---

## 7. Commands

```bash
npm run check
npm run build
npm run dev
npx tsx scripts/test-magic-link-ux.ts
npx tsx scripts/test-magic-link-mail.ts
```

---

## Files changed

| Area | Files |
|---|---|
| Shared | `shared/auth/return-to.ts`, `shared/auth/schema.ts`, `shared/analytics/events.ts`, `shared/admin-users/types.ts` |
| Server | `server/auth/auth-routes.ts`, `auth-store.ts`, `auth-middleware.ts`, `magic-link-mail.ts`, `admin-users/routes.ts`, `analytics/analytics-store.ts`, migration `038_*` |
| Client | `sign-in-sheet.tsx`, `auth-complete-handler.tsx`, `auth/context.tsx`, `auth/return-to.ts`, `admin-signups-page.tsx`, `account-page.tsx`, `App.tsx`, `analytics.ts` |
| Tests/docs | `scripts/test-magic-link-ux.ts`, `scripts/validate-analytics.ts`, this doc |
