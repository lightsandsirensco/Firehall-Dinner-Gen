# Canteen Manager Implementation

**Date:** July 17, 2026  
**Route:** `/hall/canteen`  
**Status:** Production-ready V2 on top of existing Hall Staples

---

## Architecture

Canteen Manager extends the existing **Hall Staples** system rather than replacing it.

```
/hall/canteen (HallShell)
  ├─ Count strip (Out / Running Low / Requested / In Order)
  ├─ Needs Attention (shortages + suggestions)
  ├─ This Week’s Order (shared weekly workspace + Costco handoff)
  ├─ Recent Deliveries
  ├─ Hall Staples (2-tap Good / Running Low / Out)
  ├─ Canteen Notes (manager-editable)
  ├─ Activity (managers/captains)
  └─ Payment Tracker (existing Hall Pro section)
```

**Layers**

| Layer | Path |
|-------|------|
| Shared types / helpers | `shared/hall-canteen/types.ts`, `schema.ts` |
| Store | `server/hall-canteen/store.ts` |
| API | `server/hall-canteen/routes.ts` |
| Client API | `client/src/lib/hall-canteen/api.ts` |
| UI | `client/src/pages/hall-canteen-page.tsx` + `client/src/components/hall-canteen/*` |
| Migration | `server/db/migrations/040_canteen_manager_v2.sql` |
| Billing feature | `canteen_manager_pro` in `HALL_PRO_FEATURES` |

Legacy `hall_supplies` remains a thin adapter over canteen.

---

## Database changes (040)

**Extended `hall_canteen_items`**

- preferred_brand, package_size, par_level, estimated_qty, reorder_qty  
- storage_location, preferred_retailer, costco_search_term, product_url  
- last_restocked_at, recurrence, next_review_at, is_test  
- Widened categories + statuses  
- Unique active name per hall: `UNIQUE (hall_id, lower(name)) WHERE archived = 0`

**New tables (all scoped by `hall_id`)**

| Table | Purpose |
|-------|---------|
| `hall_canteen_shortage_reports` | Per-member shortage reports (no duplicate order rows) |
| `hall_canteen_suggestions` | Member staple suggestions |
| `hall_canteen_weekly_orders` | Weekly order header + Costco checkout metadata |
| `hall_canteen_order_items` | Order lines; unique staple per order |
| `hall_canteen_manager_notes` | Shared canteen notes |
| `hall_canteen_activity` | Audit trail |

**Not stored (by design)**

- Costco passwords / cookies  
- Payment card numbers  
- Any live Costco cart sync state  

Existing `hall_canteen_history` from migration 024 remains unused by UI (activity table is the V2 audit path).

---

## Permissions

| Action | Member | Canteen Manager | Captain |
|--------|:------:|:---------------:|:-------:|
| View staples / order | ✓ | ✓ | ✓ |
| Mark Good / Running Low / Out + note | ✓ | ✓ | ✓ |
| Suggest staple | ✓ | ✓ | ✓ |
| Claim “Buying This” on order line | ✓ | ✓ | ✓ |
| Edit/archive master staple list | | ✓ | ✓ |
| Approve suggestions | | ✓ | ✓ |
| Build weekly order / Costco handoff | | ✓ | ✓ |
| Record checkout / receive delivery | | ✓ | ✓ |
| Edit canteen notes | | ✓ | ✓ |
| Assign/replace Canteen Manager | | | ✓ |
| View activity | | ✓ | ✓ |

Enforcement: `canUpdateCanteenStatus` / `canManageCanteenList` in shared types + server checks. Regular members cannot PATCH name/category/archive on staples.

---

## Routes

### Existing (preserved)
- `GET /api/halls/:hallId/canteen`
- `POST .../report`
- `PATCH .../:itemId`
- `POST .../items`
- `POST .../:itemId/pickup` (+ release)
- `POST .../manager`

### New
- `POST .../suggest`
- `POST .../suggestions/:id/review`
- `POST .../order/items` — add staple to draft week order (deduped)
- `PATCH .../order/items/:orderItemId`
- `POST .../order/items/:orderItemId/claim|release`
- `GET .../order/costco-handoff` → `{ text, csv, costco_url }`
- `POST .../order/checkout` — record external order metadata
- `POST .../order/items/:orderItemId/receive`
- `POST .../order/complete-delivery`
- `GET/POST/PATCH/DELETE .../manager-notes`
- `POST .../seed-test-data` — Test Hall only

---

## Costco handoff limitations

1. **Build Costco Order** shows approved Costco lines, grouped quantities, search terms, optional product URLs.  
2. Manager can **copy** the list and **export CSV** (Hall Pro).  
3. **Open Costco Same-Day** opens `https://www.costco.com/` in a new tab.  
4. Firehall Meals order stays open so items can be marked **Added to Costco** while shopping externally.  
5. There is **no** cart sync, login relay, or payment capture. UI copy states this explicitly.

---

## Hall Pro entitlements

| Capability | Free hall | Hall Pro (`canteen_manager_pro`) |
|------------|-----------|----------------------------------|
| Shortage reporting | ✓ | ✓ |
| Active staples | Up to **25** | Unlimited |
| One weekly draft order | ✓ | ✓ |
| Manual Costco handoff (copy) | ✓ | ✓ |
| CSV export | | ✓ |
| Saved product URLs | | ✓ |
| Recurring review flags | | ✓ |
| Order history / recent deliveries list | limited | ✓ |
| Receipt path field | | ✓ (path metadata only; no card data) |
| Payment tracker (existing) | | ✓ |

Admin-granted Hall Pro halls receive all `HALL_PRO_FEATURES` including `canteen_manager_pro`. Ensure the admin test account’s hall remains on Hall Pro (existing billing grant / trial flows).

---

## Test data

`seedTestHallCanteenData(hallId, userId)` seeds **only** when the hall name looks like a test hall (e.g. contains “Test”).

Seeds clearly labelled:

- TEST Coffee, TEST Paper Towels, TEST Hot Sauce, TEST Electrolyte Mix, TEST Dish Soap, TEST Garbage Bags, TEST Protein Bars, TEST Oat Milk  
- Mixed Out / Running Low / Good  
- Shortage reports, one suggestion, one draft Costco order, one completed delivery  

`is_test = 1` keeps these isolatable from real hall staples.

API: `POST /api/halls/:hallId/canteen/seed-test-data` (captain/manager).

---

## Test procedure

Automated:

```bash
npx tsx scripts/test-hall-canteen.ts
npx tsx scripts/test-canteen-manager.ts
npx tsx scripts/test-hall-supplies.ts
npm run build
```

Manual (in a linked hall):

1. As **member**: mark Coffee → Out with note in under five seconds; confirm cannot archive staples.  
2. As second member: report same item again — report count rises; still **one** weekly-order row when added.  
3. As **Canteen Manager**: Add to This Week’s Order → Build Costco Order → copy list → Open Costco (external).  
4. Claim **Buying This** as member A; member B cannot claim same line; release works.  
5. Receive Delivery: full → staple Good + last_restocked; missing/partial stay unresolved.  
6. Complete Delivery → order archived, new draft created, history preserved.  
7. Free hall: adding 26th staple fails; Hall Pro unlimited.  
8. Confirm no password/card fields in API payloads or DB.

---

## Notifications

Material actions write to `hall_canteen_activity` (visible to managers).  

Push/email digests for “Out”, “3+ reports”, suggestions, buyer release, and delivery-due are **not** wired to a push provider yet — remaining opportunity on top of existing activity + any future in-app notification bus.

---

## Remaining integration opportunities

1. Wire recurring (`always_check_weekly` / weekly / biweekly / monthly) into a scheduled job that queues Needs Attention.  
2. Receipt file upload storage (path column exists; binary upload pipeline TBD).  
3. In-app / email notification digests for Canteen Manager.  
4. Optional official Costco Business API if/when available — do not fake sync.  
5. Surface canteen counts on hall dashboard card beyond current “Need Anything” teaser.  
6. Migrate unused `hall_canteen_history` rows into `hall_canteen_activity` or drop after confirmation.

---

## Validation snapshot

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |
| `test-hall-canteen` | Pass |
| `test-canteen-manager` | Pass |
| `test-hall-supplies` | Pass |
| `npm run check` | May still fail on pre-existing `test-shift-dashboard` (unrelated) |
