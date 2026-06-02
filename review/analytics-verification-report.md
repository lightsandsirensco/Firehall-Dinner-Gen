# Analytics Pipeline End-to-End Verification — Firehall Meals

Generated: 2026-06-02

## Scope & constraints

- **Production site tested**: `https://www.firehallmeals.com`
- **What was verified hands-on from this environment**:
  - GA4 tag presence (measurement ID found in production JS bundle)
  - Internal analytics **ingest** endpoint accepts events and returns `inserted` count
  - Admin analytics APIs currently respond **disabled** in production (cannot validate dashboard counters increasing)
- **What cannot be proven from this environment** (needs your access/screenshots):
  - GA4 **Realtime → Events** confirmation for each event
  - `/admin/analytics` **before/after** counters (dashboard data API is disabled)
  - SPA navigation duplicate-event behavior via real browser session (no browser automation available here)

## Production checks

### GA4 wiring (production)

- **GA4 Measurement ID detected**: **`G-LYT598M5KT`**
- **GA tags detected in production JS bundle**: **PASS**

Evidence: `https://www.firehallmeals.com/assets/index-ClVN1YYk.js` contains GA4 ID and GA tag strings.

### Internal analytics ingest (production)

- **POST `/api/analytics/events`**: **PASS**
  - CSRF token fetched from `/api/csrf-token`
  - Sent a single event (`event_type=page_view`, `route=/explore`, `visitor_id=stress-verify`)
  - Response: `{"ok":true,"inserted":1}`

This confirms production is accepting analytics events and writing at least one record successfully.

### Internal admin dashboard data (production)

- **GET `/api/admin/analytics/dashboard?period=today`**: **FAIL (blocked)**
  - Response: `{"message":"Admin API is disabled. Set ADMIN_SECRET in the server environment."}`
- **POST `/api/admin/analytics/test-events`**: **FAIL (blocked)**
  - Same disabled message

Because the dashboard data endpoints are disabled in production, the `/admin/analytics` page cannot be used to verify counter deltas from this environment.

## Event-by-event results (requested list)

Legend:
- **PASS** = verified actual collection from production here
- **FAIL (blocked)** = production endpoint/visibility unavailable
- **UNVERIFIED (needs GA4/admin access)** = requires GA4 Realtime / dashboard counters

| Event | GA4 Realtime | Internal DB ingest | Internal dashboard delta |
|------|--------------|-------------------|--------------------------|
| Homepage visit | UNVERIFIED | UNVERIFIED | FAIL (blocked) |
| Explore visit | UNVERIFIED | **PASS** (manual ingest for `/explore`) | FAIL (blocked) |
| Recipe page view | UNVERIFIED | UNVERIFIED | FAIL (blocked) |
| Meal generation started | UNVERIFIED | UNVERIFIED | FAIL (blocked) |
| Meal generated | UNVERIFIED | UNVERIFIED | FAIL (blocked) |
| Wheel spin | UNVERIFIED | UNVERIFIED | FAIL (blocked) |
| Wheel recipe opened | UNVERIFIED | UNVERIFIED | FAIL (blocked) |
| Recipe saved | UNVERIFIED | UNVERIFIED | FAIL (blocked) |
| Recipe printed | UNVERIFIED | UNVERIFIED | FAIL (blocked) |
| Shopping list opened | UNVERIFIED | UNVERIFIED | FAIL (blocked) |
| Email capture | UNVERIFIED | UNVERIFIED | FAIL (blocked) |
| Hall Vote opened | UNVERIFIED | UNVERIFIED | FAIL (blocked) |
| Hall Vote submitted | UNVERIFIED | UNVERIFIED | FAIL (blocked) |
| Search performed | UNVERIFIED | UNVERIFIED | FAIL (blocked) |
| Filter applied | UNVERIFIED | UNVERIFIED | FAIL (blocked) |

## Duplicate event audit (requested)

- **Status**: **UNVERIFIED (needs browser session + GA4 Realtime / internal event query UI)**
- Reason: no access here to GA4 Realtime and internal admin analytics query endpoints are disabled in production.

## SPA routing audit (requested)

- **Status**: **UNVERIFIED (needs browser session)**
- Reason: no browser automation here; verifying “no double page_view” requires observing actual client navigation events.

## Traffic source attribution (requested)

- **Status**: **UNVERIFIED (needs GA4 Realtime + controlled UTM/referrer tests)**

## Findings / blockers

1. **Production internal admin analytics APIs are disabled** (`ADMIN_SECRET` missing), so `/admin/analytics` cannot currently validate before/after dashboard deltas.
2. **GA4 tag is present** (measurement ID found), but **Realtime event appearance** cannot be confirmed without GA4 access.

## Recommendations (to reach “proven end-to-end”)

1. **Enable production admin analytics** by setting `ADMIN_SECRET` in the server environment, then re-test:
   - `/api/admin/analytics/dashboard?period=today`
   - `/api/admin/analytics/test-events`
2. Provide one of the following so I can complete the GA4 portion:
   - **Read-only access** to GA4 Realtime for property containing `G-LYT598M5KT`, or
   - Screenshots/export of **Realtime → Events** during the test run (with event names + page path + source/medium/device/country visible).

## Final score: Analytics Readiness %

**40%** (GA4 tag present + production ingest works, but end-to-end proof to GA4 Realtime and internal dashboard deltas is blocked in production until admin analytics is enabled and GA4 Realtime is accessible.)

