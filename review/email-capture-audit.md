# Email Capture Audit — Firehall Meals

**Date:** 2026-07-27
**Scope:** Every email-collection surface in the codebase, every backing database table, the live Klaviyo integration, and every email address currently held in local storage + the live Klaviyo account.
**Type:** Read-only audit. No code was modified.

---

## 1. Every email-collection source

There are **7 lead/marketing capture surfaces** + **1 authentication surface** + **1 optional-contact surface** — 9 total UI entry points, all funneling into **4 backend tables** and **1 external provider (Klaviyo)**.

| # | Surface | Component (file) | API endpoint | DB table | → Klaviyo? | Working? |
|---|---|---|---|---|---|---|
| 1 | Recipe email ("Email this recipe") | `client/src/components/email-modal.tsx` | `POST /api/email-recipe` | `email_leads` (`source="generator"`) | ✅ Yes | ✅ Yes |
| 2 | Homepage newsletter | `client/src/components/home/home-email-capture.tsx` | `POST /api/homepage-subscribe` | `email_leads` (`source="homepage"`) | ✅ Yes | ✅ Yes |
| 3 | Hall Ops private-beta waitlist | `client/src/components/hall/hall-private-beta-notice.tsx` | `POST /api/homepage-subscribe` (`source="hall_private_beta"`) | `email_leads` (`source="hall_private_beta"`) | ✅ Yes | ✅ Yes |
| 4 | Red Lead recipe PDF unlock | `client/src/components/red-lead/red-lead-pdf-capture.tsx` | `POST /api/lead-magnet/red-lead` | `email_leads` (`source="red_lead"`) | ✅ Yes | ✅ Yes |
| 5 | "Email List" (shopping list) | `client/src/components/shopping-list-modal.tsx` | `POST /api/email-shopping-list` | `email_leads` (`source="shopping_list"`) | ✅ Yes | ✅ Yes |
| 6 | Magic-link sign-in | `client/src/components/auth/sign-in-panel.tsx` / `sign-in-sheet.tsx` | `POST /api/auth/magic-link` | `users` + `auth_magic_links` | ❌ No | ⚠️ Partial — see note |
| 7 | Hall feedback (email optional) | `client/src/components/hall-feedback/hall-feedback-modal.tsx` | `POST /api/hall-feedback` | `hall_feedback` | ❌ No | ✅ Yes (not a lead) |
| 8 | Admin one-off Klaviyo sync | `server/admin-users/routes.ts` (admin dashboard action) | `POST /api/admin/users/:userId/klaviyo` | updates `email_leads.klaviyo_synced` | ✅ Yes | ✅ Yes |
| 9 | Analytics backfill | `server/admin-users/leads-store.ts` `backfillLeadsFromAnalytics()` | `POST /api/admin/leads/backfill` | `email_leads` (mined from `analytics_events.metadata_json`) | ❌ No (local only) | ✅ Yes |

> **Note on #6:** No SMTP/Resend/SendGrid/Postmark provider is configured anywhere in `.env` — magic-link emails are **not actually delivered**. Confirmed in test output: `[auth] Magic link (email not configured) domain=firehall.test link=...`. The link is only logged server-side. In production this means real users requesting a magic link get no email unless a mail provider is wired in server-side that I haven't found — **this is a functional gap worth confirming against your production `.env`.**

### Per-surface detail

**1–5 (lead capture, all funnel through `captureEmailLead()` → `recordEmailLead()` in `server/admin-users/leads-store.ts`):**
- **Duplicate prevention:** Application-level only (no DB `UNIQUE` constraint). Keyed on **`(email, source)`** — the same email signing up via two different surfaces (e.g. homepage *and* red-lead) creates **two separate rows**, by design, so you can see multi-touch history — but this means "unique emails" and "unique leads" are not the same number.
- **Consent stored:** ❌ No consent/opt-in column exists anywhere in `email_leads`. No checkbox is shown in any of the 5 forms — only soft copy like "we'll email you sometimes... unsubscribe anytime" on 2 of the 5.
- **Timestamps:** ✅ `captured_at` (first capture) and `last_activity_at` (updated on re-capture or conversion).
- **Source attribution:** ✅ Yes — `source` (canonical enum) + `signup_form` (free-text, e.g. `"email-recipe"`, `"hall-private-beta-waitlist"`).
- **Status/confirmed:** ❌ No pending/confirmed/bounced/unsubscribed column. Closest analog: `converted_user_id` (set once the email later becomes a registered account) and `klaviyo_synced` (bool).
- **Klaviyo:** `subscribeToList()` (profile-import + list-add) **and** one event-track call per surface (`Recipe Generated`, `Shopping List Requested`, `Lead Magnet Downloaded`, `Homepage Subscriber`) — run in parallel via `Promise.allSettled`, so **the local row is always saved even if Klaviyo fails**.

**6 (magic-link auth) — `users` + `auth_magic_links`:**
- `users.email` has a genuine **DB `UNIQUE` constraint** (the only table with one) + app-level find-or-create (`upsertEmailUser`, case-insensitive).
- `auth_magic_links` has no unique-email constraint, but `createMagicLink()` deletes any prior *unused* token for that email before issuing a new one.
- No consent, no source, no Klaviyo sync. Timestamps: `created_at`, `updated_at`, `last_login_at` (users); `created_at`, `expires_at`, `used_at` (magic links).

**7 (hall feedback) — `hall_feedback`:**
- Email is optional, free-text, no dedup (every submission is a new row), no consent, has `source` (`floating_button | footer | generator_error | unknown`) and `created_at`. Never synced to Klaviyo — this is support contact info, not a marketing lead.

---

## 2. Every email currently collected

### ⚠️ Important caveat on this section

This audit was run from a **local development checkout**, not the live production server. Two different data sources gave two different pictures:

- **Local `data/cache.db` (this sandbox's SQLite file):** `email_leads` = **0 rows**, `users` = **0 rows**, `hall_feedback` = **0 rows with email**. `auth_magic_links` has 2 rows (see below). This is expected — this is a fresh/local dev database, not the one your production server writes to (confirmed via `docs/database-backup.md`: production uses `SQLITE_DB_PATH` with a real daily-backup routine, i.e. a separate persistent file this sandbox has no access to).
- **Live Klaviyo account:** ✅ **Reachable and queried directly, read-only** (`GET /lists`, `GET /lists/{id}/profiles`). This reflects real production activity, since Klaviyo is only ever written to by the live app. **23 real profiles** are on the `Firehall Dinner Generator Leads` list.

Because the local `email_leads` table (which is the only place `source`/`signup_form`/`consent`/full status live) is empty in this sandbox, **I cannot show you exact per-email source/status with full fidelity for the 23 Klaviyo profiles** — that detail only exists in your production database. What's below is everything recoverable from this environment, with Klaviyo used as the ground truth for "which emails exist," and source inferred where the email address itself gives it away (e.g. `firehall.e2e.recipe...@example.com`).

**Recommendation:** re-run the "known collected emails" portion of this audit directly against your production database (or via the `/admin/leads` dashboard, which already renders `source`, `signup_form`, `captured_at`, and `klaviyo_synced` per row) for complete accuracy.

### 2a. Local sandbox DB (`data/cache.db`) — `auth_magic_links` (only non-empty table with an email)

| Email Address | Date Collected | Source | Status | Storage Location |
|---|---|---|---|---|
| `miked_91@hotmail.com` | 2026-07-25 13:25:36 | Magic-link sign-in request | Link issued, never clicked (`used_at` is null) | `auth_magic_links` (local sandbox `data/cache.db`) |
| `test@firehall.test` | 2026-06-26 01:55:51 | Magic-link sign-in request (test) | Link issued, never clicked, expired | `auth_magic_links` (local sandbox `data/cache.db`) |

(`email_leads`, `users`, `hall_feedback` are all empty in this sandbox.)

### 2b. Live Klaviyo — list `Firehall Dinner Generator Leads` (id `UqVM8g`), all 23 profiles

| Email Address | Date Collected (Klaviyo `created`) | Likely Source | Status | Storage Location |
|---|---|---|---|---|
| `miked_91@hotmail.com` | 2026-02-18T17:27:13Z | Unknown (events not readable — API key lacks `events:read`) | Subscribed (single opt-in) | Klaviyo profile |
| `test-scope@example.com` | 2026-02-19T21:45:50Z | Test/QA (manual, during Klaviyo build) | Subscribed | Klaviyo profile |
| `test2@example.com` | 2026-02-19T21:46:23Z | Test/QA | Subscribed | Klaviyo profile |
| `test3@example.com` | 2026-02-19T21:46:33Z | Test/QA | Subscribed | Klaviyo profile |
| `verify-fix@example.com` | 2026-02-19T21:49:17Z | Test/QA | Subscribed | Klaviyo profile |
| `alinafayc@gmail.com` | 2026-02-20T11:51:47Z | Unknown (real-looking signup) | Subscribed | Klaviyo profile |
| `chris_cuculis@yahoo.com` | 2026-02-27T00:28:35Z | Unknown (real-looking signup) | Subscribed | Klaviyo profile |
| `npurdy@pittsborofire.org` | 2026-02-27T03:06:52Z | Unknown (real fire-dept domain) | Subscribed | Klaviyo profile |
| `connor.b.orey@gmail.com` | 2026-02-27T13:26:48Z | Unknown (real-looking signup) | Subscribed | Klaviyo profile |
| `daltonni19@gmail.com` | 2026-02-27T16:09:26Z | Unknown (real-looking signup) | Subscribed | Klaviyo profile |
| `taylor.samuelk@gmail.com` | 2026-02-27T19:20:11Z | Unknown (real-looking signup) | Subscribed | Klaviyo profile |
| `kathryn.zavoral@gmail.com` | 2026-02-28T15:02:59Z | Unknown (real-looking signup) | Subscribed | Klaviyo profile |
| `soundintolight@gmail.com` | 2026-03-01T16:57:43Z | Unknown (real-looking signup) | Subscribed | Klaviyo profile |
| `firehall.e2e.recipe.mpsntbh1@example.com` | 2026-05-30T18:03:42Z | **Confirmed by email pattern:** `/api/email-recipe` E2E test | Subscribed (test) | Klaviyo profile |
| `firehall.e2e.shopping.mpsnydss@example.com` | 2026-05-30T18:07:38Z | **Confirmed by email pattern:** `/api/email-shopping-list` E2E test | Subscribed (test) | Klaviyo profile |
| `firehall.e2e.redlead.141657@example.com` | 2026-05-30T18:16:58Z | **Confirmed by email pattern:** `/api/lead-magnet/red-lead` E2E test | Subscribed (test) | Klaviyo profile |
| `cohennequin@gmail.com` | 2026-05-31T21:42:14Z | Unknown (real-looking signup) | Subscribed | Klaviyo profile |
| `price375@purdue.edu` | 2026-06-01T13:47:12Z | Unknown (real-looking signup, university address) | Subscribed | Klaviyo profile |
| `campbellcolton912@gmail.com` | 2026-06-04T20:25:44Z | Unknown (real-looking signup) | Subscribed | Klaviyo profile |
| `lukevallevand@gmail.com` | 2026-06-10T05:09:13Z | Unknown (real-looking signup) | Subscribed | Klaviyo profile |
| `dsimkins@rocketmail.com` | 2026-07-16T19:11:43Z | Unknown (real-looking signup) | Subscribed | Klaviyo profile |
| `brandonjongreen85@gmail.com` | 2026-07-21T01:34:01Z | Unknown (real-looking signup) | Subscribed | Klaviyo profile |
| `powers.zackrey@gmail.com` | 2026-07-22T14:41:56Z | Unknown (real-looking signup) | Subscribed | Klaviyo profile |

*"Status: Subscribed (single opt-in)" means the list itself is configured `opt_in_process: single_opt_in` in Klaviyo — there is no double opt-in / confirmation-email step anywhere in this pipeline, so every captured email is immediately live on the list with no separate confirmation record.*

### 2c. Seed data / JSON / CSV / logs

Repo-wide search for email-address patterns across `*.json`, `*.csv`, `*.sql`, and the two stray root-level test-run log files (`server-test-err4.log`, `server-test-out4.log`) found **no additional real user emails** — the only match was `package-lock.json`, which contains npm package-maintainer emails (irrelevant, not user data).

---

## 3. Summary

| Metric | Value |
|---|---|
| Total unique emails (Klaviyo, ground truth) | **23** |
| Duplicate emails (same address, multiple profiles) | **0** in Klaviyo (Klaviyo profiles are upserted by email, so duplicates are structurally impossible there). **Possible in local `email_leads`**, by design — same email can have one row per distinct `source` it signed up through. Not visible in this sandbox (table empty). |
| Invalid emails | **0** found — all 23 pass standard email format; the app also enforces `z.string().email()` server-side on every capture path, so malformed addresses shouldn't reach storage at all. |
| Unconfirmed emails | **All 23** — no double opt-in / confirmation flow exists anywhere (single opt-in Klaviyo list, no confirmation-email step in the app). |
| Confirmed emails | **0** — by design, this app has no concept of "confirmed" beyond "we successfully called the API." |
| Real-looking signups | **16** (gmail/yahoo/hotmail/rocketmail/edu/org addresses with human names) |
| Clearly test/synthetic signups | **7** (`test-scope`, `test2`, `test3`, `verify-fix`, and 3 `firehall.e2e.*@example.com` from automated tests) |
| Emails by source | Cannot be fully attributed from this sandbox (see §2 caveat) — 3 are unambiguous from the address itself (1 each: recipe email, shopping list email, red-lead PDF); the rest require the production `email_leads.source` column. |
| Newest signup | `powers.zackrey@gmail.com` — 2026-07-22T14:41:56Z |
| Oldest signup | `miked_91@hotmail.com` — 2026-02-18T17:27:13Z |

---

## 4. Klaviyo Audit

**Is Klaviyo connected? ✅ Yes — verified live, read-only, right now.**

- **API key:** `KLAVIYO_API_KEY` is set in `.env` (37 characters — consistent with a real Klaviyo private key format). Not set in `.env.example` (empty placeholder, as expected). I verified it authenticates successfully against the real Klaviyo REST API v3 (`https://a.klaviyo.com/api`, revision `2025-01-15`).
- **List:** A single list, **`Firehall Dinner Generator Leads`** (id `UqVM8g`), created 2026-02-18, `single_opt_in`. This is the *only* list — there is no per-source segmentation (homepage leads and red-lead leads all land in the same list; they're distinguished only by which **event** got tracked alongside the profile-add, not by list membership).
- **Audience:** 23 profiles currently on the list (verified above).
- **Which API key:** Not printed here (secret), but confirmed present, well-formed, and live-authenticating.
- **Forms that sync:** Recipe email, homepage newsletter, hall private-beta waitlist, red-lead PDF, shopping-list email (all 5 lead-capture surfaces) — each calls both `subscribeToList()` (profile+list) and a source-specific event (`Recipe Generated` / `Homepage Subscriber` / `Lead Magnet Downloaded` / `Shopping List Requested`).
- **Forms that do NOT sync:** Magic-link sign-in (auth, not marketing) and hall feedback (support contact, optional email) — confirmed via code search, zero Klaviyo references in either code path.
- **Failure handling:** Klaviyo calls run via `Promise.allSettled` — **the local lead is always saved regardless of Klaviyo success/failure.** No retries. Failures are logged (`[klaviyo] FAIL ...` / `NETWORK ERROR`), and `email_leads.klaviyo_synced` records whether the sync actually succeeded, so you can identify + backfill any leads that failed to reach Klaviyo — but there is currently **no bulk backfill script that actually calls the Klaviyo API** (the one backfill script that exists, `backfillLeadsFromAnalytics`, only mines local `analytics_events` into the local table; it doesn't push to Klaviyo).
- **Note:** the key I found only has `profiles:read` / `lists:read` (and presumably `profiles:write`/`lists:write`/`events:write` for the app itself) — it does **not** have `events:read`, so I could not pull each profile's tracked-event history to give you hard per-email source attribution from Klaviyo alone. That's a reasonable least-privilege key scope, but it means Klaviyo alone can't answer "which form did this signup come from" — only your local `email_leads.source` column can.

---

## 5. Data Flow Diagram

```
                                   USER
                                    │
        ┌───────────────┬──────────┼──────────┬───────────────┬─────────────┐
        ▼               ▼          ▼          ▼               ▼             ▼
  Homepage form   Hall-beta form  Recipe    Shopping-list   Red-lead PDF   Magic-link
  (newsletter)     (waitlist)    email modal  email form     unlock form   sign-in form
        │               │          │          │               │             │
        ▼               ▼          ▼          ▼               ▼             ▼
  ══════════════════ FORM (client React component) ══════════════════════════
        │               │          │          │               │             │
        ▼               ▼          ▼          ▼               ▼             ▼
POST /api/homepage-subscribe   POST /api/email-recipe   POST /api/email-shopping-list
        (source tag varies)         POST /api/lead-magnet/red-lead      POST /api/auth/magic-link
        │               │          │          │               │             │
        ▼               ▼          ▼          ▼               ▼             ▼
  ═══════════════════════ API (Express route handler) ═══════════════════════
        │  Zod validation → rate limit → captureEmailLead() ─┐             │
        │                                                     │             ▼
        │                                                     │      createMagicLink()
        │                                                     │             │
        ▼                                                     ▼             ▼
  ═════════════ DATABASE (SQLite, data/cache.db) ═════════════════════════════
     email_leads (source, signup_form, captured_at, klaviyo_synced)   auth_magic_links / users
        │                                                     │
        │  Promise.allSettled — fire-and-forget, non-blocking │             │
        ▼                                                     │             ✗ (no Klaviyo call)
  ═══════════════ EMAIL PROVIDER (Klaviyo REST API v3) ═══════════════════
     subscribeToList()  +  track<Source>Event()
        │
        ▼
  Single list: "Firehall Dinner Generator Leads"  (no per-source segmentation)
        │
        ▼
  ═══════════════════════ AUTOMATION (Klaviyo flows) ══════════════════════
     ⚠️ Not audited here — whatever flows/automations exist inside Klaviyo
        itself are outside this codebase and weren't inspected.
```

### Where emails can be lost today

1. **Klaviyo API failure is silently non-fatal.** By design the local save always succeeds even if Klaviyo rejects/times out — good for not losing the lead, but if nobody watches `klaviyo_synced=false` rows, those emails **never reach Klaviyo at all** and there's no automatic retry or bulk-resync tool.
2. **Magic-link email is never actually sent** in this environment (no mail provider configured) — if this is also true in production, real users requesting a sign-in link get nothing, and there's no visibility/alerting on that failure from the user's side.
3. **No consent is captured anywhere.** There's no way to prove opt-in for CASL/CAN-SPAM/GDPR purposes beyond "they typed their email into a form and clicked submit" — a real risk if this list is ever emailed at scale or audited.
4. **Local `email_leads` de-dupes by `(email, source)`, not by `email` alone.** The same real person can accumulate multiple disconnected rows across sources — there's no single canonical "this human's whole history" view without cross-referencing all rows by raw email string.
5. **Klaviyo events (`Recipe Generated` etc.) can carry full recipe content** (ingredients, steps, macros) as event properties tied to an email — worth confirming this is intended, since it's a lot of PII-adjacent behavioral data flowing to a third party per capture.
6. **Local-only surfaces never reach Klaviyo or any CRM:** `hall_feedback` emails and `auth_magic_links`/`users` emails exist *only* in local SQLite — if someone emails you via feedback or signs up via magic-link only (no lead-capture form), that address is invisible to Klaviyo and to the admin leads dashboard entirely.
3. **Fold `hall_feedback` and `auth_magic_links`/`users` email capture into the same Klaviyo pipeline** (as separate lists or, better, the same profile with a custom property like `lifecycle_stage`), so a support-form or login-only user isn't invisible to your CRM. At minimum, sync `users.email` on account creation as its own event (`Account Created`) so registered users are queryable in Klaviyo even if they never touched a marketing form.
4. **Add an explicit, stored consent record.** A simple `consented_at` timestamp + the exact copy shown at time of capture (or a version number referencing it) on `email_leads`, satisfies CASL/CAN-SPAM/GDPR much more defensibly than implicit consent-by-submission. Surface this in the Klaviyo profile too (as a property), since Klaviyo suppression/consent tooling can act on it.
5. **De-duplicate by email as the canonical key**, keeping the current `(email, source)` rows as a *history* sub-table rather than the primary identity — e.g. `email_contacts (email PK, first_seen_at, consented_at, klaviyo_profile_id)` + `email_capture_events (contact_email FK, source, signup_form, captured_at)`. This gives you both "one true contact per human" and full source history, and maps naturally onto a single Klaviyo profile per contact.
6. **Confirm (and fix, if needed) the magic-link email delivery gap in production** — if `RESEND_API_KEY`/SMTP is genuinely never configured, users can request a sign-in link and get nothing; wire in an actual mail provider or clearly surface the dev-mode fallback link only in non-production environments.
7. **Tag/segregate test data at the source** — the 7 synthetic emails already on your real Klaviyo list should be either suppressed or deleted so they don't skew segments/sends; going forward, gate E2E test scripts to a dedicated test API key or `is_test_account`-style property that automations can exclude (this table already has an `admin_user_meta.is_test_account` flag for registered users — extend that concept to `email_leads`/Klaviyo profiles too).

---

*All data above was gathered by reading source code and, for §2b/§4, making direct read-only `GET` calls to the Klaviyo REST API using the project's own configured API key — no data was created, modified, or deleted in Klaviyo or any database during this audit.*

7. **This sandbox's `data/cache.db` is disconnected from production.** Anyone auditing "what's stored" needs to run this against the live deployment's actual DB file/backup, not a fresh local checkout — I could only get ground truth here via the external Klaviyo API.

---

## 6. Recommendations — centralizing on one CRM (Klaviyo)

1. **Make Klaviyo the single source of truth for source attribution, not just subscription status.** Today, `source`/`signup_form` only exist in local SQLite; Klaviyo profiles carry no custom property distinguishing where they came from beyond which *event* happened to fire alongside them. Pass `source` and `signup_form` as **profile properties** (not just event properties) on every `subscribeToList()` call, so Klaviyo segments/flows can filter by source directly — right now that data is stranded in a local table your marketing tooling can't see.
2. **Route every capture surface through one shared helper that always does both writes atomically-enough to reconcile later:** local insert (source of truth for consent/legal record) → Klaviyo profile+list+event (source of truth for sending). Add a scheduled job (or extend the existing daily-backup cron) that finds `klaviyo_synced=0` rows and retries them — closing the "silently lost to Klaviyo" gap.