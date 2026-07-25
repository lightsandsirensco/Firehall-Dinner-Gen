# Hall Inventory System — Product Design (v1 archive)

**Status:** Superseded for implementation planning  
**Date:** 2026-07-17  

> **Canonical spec:** [`review/intelligent-inventory.md`](./intelligent-inventory.md) — Hall Inventory product specification v2.0 (status-first faces + item memory, relations, tips). Use that document for implementation. This file is retained as historical v1 detail only.

---

## 1. Purpose

Every hall should track **everything that lives in the station** that the crew cares about stocking, buying, or selling — without turning Firehall Meals into warehouse ERP.

**Hall Inventory** is the single stock engine behind:

| Hall Ops station | Inventory domain |
|------------------|------------------|
| **Canteen** | Canteen-managed consumables (coffee → freezer → pantry) |
| **The Cabinet** | Merchandise (shirts, coins, bottles…) |
| **The Run** | Auto-fed restock lines |
| **Weekly Order** | Auto-fed Costco / bulk order |
| **Hall Home** | Needs Attention |
| **Alerts** | Running low / out |
| **Sales** | Merchandise sell-through |

**Voice:** shelves, par, running low, out, receive, sell — not SKU masters, WMS, or cycle-count campaigns.

---

## 2. Design principles

1. **One inventory engine, two halls of the building** — Canteen shelf vs Merchandise cabinet.  
2. **Status first, quantity second** — most firefighters tap *Running Low* / *Out*; managers optionally count.  
3. **Par levels drive work** — below min → Needs Attention → Run / Weekly Order.  
4. **Few taps on a phone** — member actions are 1–2 taps; receive/adjust are manager flows.  
5. **Never corporate** — no “bin locations,” “putaway,” “ASN.” Location = “Fridge,” “Freezer,” “Cabinet top shelf.”  
6. **Evolve canteen, don’t fork forever** — migrate `hall_canteen_items` into a unified model; keep Canteen UI as the consumable face.  
7. **Private only** — inventory never indexed; public SEO stays on `/fire-hall-pantry`, `/canteen-manager`, Tools checklists.  
8. **Barcode later** — field reserved; UI not blocked on scanners.

---

## 3. Domain split

### 3.1 Domains (top-level)

| Domain | Code | Who owns it | Hall Ops surface |
|--------|------|-------------|------------------|
| **Canteen Managed** | `canteen` | Canteen manager (+ captain) | `/hall/canteen` |
| **Merchandise** | `merchandise` | Canteen manager / captain | `/hall/cabinet` |

Optional future domain (not v1): `equipment` (thermometers, sheet pans) — Kitchen Checklist Tools feed seeding only until then.

### 3.2 Canteen Managed — categories

Aligned with station reality + current canteen categories (extend, don’t confuse).

| Category ID | Label | Examples |
|-------------|-------|----------|
| `coffee_beverages` | Coffee & Drinks | Coffee, creamers, pop, water cases |
| `dairy_breakfast` | Dairy & Breakfast | Butter, milk, cream, eggs |
| `cooking_oils` | Cooking Oil | Oil, spray, specialty fats |
| `spices_seasonings` | Spices & Seasonings | Salt, pepper, rubs, spice jars |
| `condiments` | Condiments | Ketchup, mayo, hot sauce |
| `bbq_supplies` | BBQ Supplies | Pellets, charcoal, foil pans, sauce bottles |
| `snacks` | Snacks | Chips, bars, canteen candy |
| `drinks` | Drinks | (If split from coffee; else fold into coffee_beverages) |
| `freezer` | Freezer | Frozen proteins, veg, ice cream |
| `pantry` | Pantry | Rice, pasta, stock, canned tomatoes |
| `refrigerated` | Fridge (other) | Leftover-safe staples, tortillas, cheese blocks |
| `cleaning` | Cleaning | Soap, sanitizer, spray |
| `paper_products` | Paper | Towels, plates, wrap |
| `personal_care` | Personal Care | Soap, med kit restock (hall-shared) |
| `other` | Other | Catch-all |

**Migration note:** Map existing `breakfast` → `dairy_breakfast`; keep `frozen` → `freezer`; add `cooking_oils`, `bbq_supplies`. Soft-alias legacy IDs.

### 3.3 Merchandise — categories

| Category ID | Label | Examples |
|-------------|-------|----------|
| `apparel_shirts` | Hall Shirts | T-shirts, polos |
| `apparel_hats` | Hall Hats | Caps, toques |
| `apparel_sweaters` | Sweaters / Hoodies | Crewnecks, zip-ups |
| `patches` | Patches | Shoulder / commemorative |
| `coins` | Coins & Challenge Coins | Challenge coins, challenge sets |
| `stickers` | Stickers | Bumper, helmet-safe stickers |
| `drinkware` | Water Bottles / Drinkware | Bottles, mugs |
| `other_merch` | Other Merch | Lanyards, challenge kits |

---

## 4. Item data model

### 4.1 Core fields (every item)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `item_id` | id | ✓ | Stable |
| `hall_id` | id | ✓ | Scoped |
| `domain` | `canteen` \| `merchandise` | ✓ | Shelf of the building |
| `name` | text | ✓ | Display name |
| `photo_url` | url? | | Optional; phone camera upload |
| `category` | enum | ✓ | Per domain tables above |
| `location` | text? | | Free text: “Walk-in,” “Cabinet L2” |
| `preferred_retailer` | enum/text | | `costco`, `walmart`, `sysco`, `custom`… |
| `par_level` | number? | | Target on-hand (manager) |
| `quantity_on_hand` | number | ✓ | Current qty (default 0) |
| `quantity_min` | number? | | Minimum; below → Running Low logic |
| `quantity_max` | number? | | Cap for receive warnings |
| `unit` | text | ✓ | `each`, `lb`, `L`, `box`, `case`… |
| `estimated_unit_value` | money? | | Est. replacement / sale value |
| `supplier` | text? | | Vendor name or “Costco Business” |
| `notes` | text? | | “Buy the big tin,” sizes |
| `barcode` | text? | | **Future** — nullable, indexed later |
| `last_restocked_at` | datetime? | | Last receive that increased stock |
| `last_purchased_at` | datetime? | | Last order/run purchase event |
| `last_counted_at` | datetime? | | Last explicit count/adjust |
| `active` | bool | ✓ | Visible in ops (default true) |
| `archived` | bool | ✓ | Soft-delete (default false) |
| `status` | enum | ✓ | Derived + override (see §5) |

### 4.2 Canteen-only extensions (keep from V2)

| Field | Purpose |
|-------|---------|
| `preferred_brand` | Brand lock |
| `package_size` | “2.5 L”, “case of 12” |
| `reorder_qty` | Default qty when adding to order/run |
| `costco_search_term` / `product_url` | Handoff helpers |
| `recurrence` | Weekly check cadence |
| `next_review_at` | Always-check-weekly |

### 4.3 Merchandise-only extensions

| Field | Purpose |
|-------|---------|
| `sale_price` | What the hall charges |
| `cost_basis` | What the hall paid (optional) |
| `size_variant` | S/M/L/XL or “one size” |
| `sku_label` | Internal short code |
| `fundraising_flag` | Counts toward fundraiser totals |

### 4.4 Status model

**Member-facing (one tap):**

| Status | Meaning |
|--------|---------|
| `good` | Fine |
| `running_low` | Needs attention soon |
| `out` | Empty / unavailable |

**Pipeline (manager / system):**

| Status | Meaning |
|--------|---------|
| `requested` | Member asked for restock |
| `on_list` | On The Run |
| `ordered` | On Weekly Order |
| `being_shopped` | Runner buying |
| `delivered` | Received, awaiting put-away confirmation |

**Derivation rule (default):**

```
if quantity_on_hand <= 0           → out
else if quantity_min and qty < min → running_low
else if par_level and qty < par    → running_low (soft)
else                               → good
```

Manual *Running Low* / *Out* **overrides** until next Receive or Count clears override.

---

## 5. User actions

All actions write an **inventory ledger event** (audit). No silent edits.

### 5.1 Action catalog

| Action | Who | Effect | Feeds |
|--------|-----|--------|-------|
| **Mark Running Low** | Any member | Status override `running_low`; shortage report | Needs Attention, Alerts, optional Run line |
| **Mark Out** | Any member | Status `out`; qty → 0 optional confirm | Same + stronger alert |
| **Consume Quantity** | Member+ / Cook | Decrease qty by N; if below min → low | Dashboard; dinner waste optional note |
| **Receive Inventory** | Manager / Runner | Increase qty; set `last_restocked_at`; clear low/out | Clears Needs Attention; closes order lines |
| **Adjust Inventory** | Manager | Set absolute qty (count); `last_counted_at` | Corrects drift |
| **Transfer Inventory** | Manager | Move qty between locations or related items | Location update + ledger |
| **Archive Item** | Manager | `archived=true`, `active=false` | Hidden from ops; history kept |
| **Restore Item** | Manager | Unarchive | — |
| **Add to Run** | Manager / system | Create/update shopping line | The Run |
| **Add to Weekly Order** | Manager / system | Create/update order line | Weekly Order |
| **Record Sale** (merch) | Manager / seller | Decrease qty; sale event; value | Merchandise Sales, Dues optional |

### 5.2 Mobile UX — member (≤2 taps)

From Canteen or item detail:

1. **Running Low**  
2. **Out**  

Optional third: **Used some** → stepper (1, 2, half pack).

No forms. No required photos. No barcode for v1.

### 5.3 Mobile UX — manager

- **Receive:** scan list from Weekly Order / Run → confirm qty → done  
- **Adjust:** “Count now” → number pad  
- **Transfer:** from/to location chips  
- **Archive:** behind overflow, confirm once  

### 5.4 Transfer semantics (v1)

Keep simple:

- **Location transfer:** same item, change `location` + note  
- **Split later:** do not support item→item transfers in v1 unless needed for “bulk oil → squeeze bottles” (Phase 2)

---

## 6. Automatic feeds

### 6.1 Shopping List (The Run)

**Triggers → add/update Run lines**

| Trigger | Default qty on list |
|---------|---------------------|
| Mark Out | `reorder_qty` or 1 |
| Mark Running Low | `reorder_qty` or max(par − on_hand, 1) |
| Below `quantity_min` after consume | Same |
| Recurrence `always_check_weekly` on review day | Manager prompt, not auto-spam |

**Line metadata:** `source=inventory`, `inventory_item_id`, domain tag (`Dinner staples` vs `Canteen`).

**Rules**

- Dedupe by `inventory_item_id`  
- Don’t auto-add merchandise unless manager enables “restock merch on Run”  
- Auto-add is **Hall Pro** for full sync; free hall may show Needs Attention only  

### 6.2 Weekly Order

**Triggers**

- Items with status `running_low` / `out` and preferred_retailer = Costco (or hall default)  
- Recurrence due  
- Manager “Build this week’s order from Needs Attention”

**On Receive from Weekly Order**

- Order line → Receive Inventory  
- `last_purchased_at` + `last_restocked_at`  
- Status → `good`  

### 6.3 Hall Dashboard (Needs Attention)

Aggregate card:

- Count of `out`  
- Count of `running_low`  
- Merch low (Cabinet) as secondary row  
- Tap → filtered inventory list  

Tour pulse copy examples:

- `3 out · 5 running low`  
- `Coffee out — reported by Sam`  

### 6.4 Notifications / Alerts

| Event | Audience | Priority |
|-------|----------|----------|
| Marked Out | Canteen mgr + captain | High |
| Running Low (first time this week) | Canteen mgr | Normal |
| Below min after consume | Canteen mgr | Normal |
| Weekly review due | Canteen mgr | Digest |
| Merch hit min (shirts size L) | Managers | Normal |
| Receive completed | Optional ack to reporters | Low |

Digest > spam. Cap: one push per item per 24h unless Out.

### 6.5 Merchandise Sales

**Flow**

1. Open Cabinet item  
2. **Sell** → qty 1 (or size) → confirm price  
3. Ledger: `sale` event; decrease on_hand  
4. Optional: mark buyer paid / unpaid → light link to Dues (“uniform shirt”)  
5. Sales log: date, item, qty, amount, seller  

**Reports (simple)**

- This month revenue  
- Low stock after sales  
- “Sold out: Medium shirts”

Not a full POS. Cash/e-transfer happens in the hallway; app tracks honesty.

---

## 7. Information architecture

### 7.1 Navigation (Hall Ops)

| Entry | Path | Domain filter |
|-------|------|---------------|
| Canteen | `/hall/canteen` | `canteen` |
| Cabinet | `/hall/cabinet` | `merchandise` |
| Inventory admin (optional More) | `/hall/inventory` | Both, manager power-user |

**Canteen home sections (evolve V2)**

1. Needs Attention  
2. By category (chips)  
3. This Week’s Order  
4. Recent activity  

**Cabinet home**

1. Needs Attention (merch)  
2. Categories (shirts, coins…)  
3. Recent sales  
4. Low stock  

### 7.2 Item detail (shared template)

- Photo hero (optional placeholder)  
- Name · status chip · location  
- Qty · unit · par/min/max  
- Primary actions by role  
- Meta: retailer, supplier, value, dates  
- Activity trail (last 10 ledger events)

### 7.3 Seed / onboarding

- Import from **Tools → Pantry Checklist** / Kitchen Checklist  
- “Starter canteen pack” template (coffee, milk, oil, spices, paper)  
- Merch: empty until first shirt  

---

## 8. Permissions

| Action | Member | Runner* | Canteen mgr | Captain |
|--------|:------:|:-------:|:-------------:|:-------:|
| View canteen inventory | ✓ | ✓ | ✓ | ✓ |
| View merchandise | ✓ | ✓ | ✓ | ✓ |
| Mark low / out | ✓ | ✓ | ✓ | ✓ |
| Consume (small) | ✓ | ✓ | ✓ | ✓ |
| Receive / adjust / transfer | | ✓† | ✓ | ✓ |
| Archive / create item | | | ✓ | ✓ |
| Manage Weekly Order | | | ✓ | ✓ |
| Record merch sale | | | ✓ | ✓ |
| Edit unit value / sale price | | | ✓ | ✓ |

\*Assigned runner †Receive against The Run only  

**Free vs Hall Pro**

| Capability | Free linked hall | Hall Pro |
|------------|------------------|----------|
| Active canteen items | Cap (e.g. 25 — existing) | Unlimited |
| Merchandise items | — or soft cap 10 preview | Full Cabinet |
| Auto-feed Run / Weekly Order | Manual add from Needs Attention | Auto + bulk build |
| Photo uploads | — / limited | Full |
| Ledger export / CSV | — | ✓ |
| Sales log | — | ✓ |

---

## 9. Database architecture (target)

Design-level. Prefer **unify** over parallel forever.

### 9.1 Recommended shape

```
hall_inventory_items          -- supersedes / evolves hall_canteen_items
hall_inventory_ledger         -- all qty/status mutations
hall_inventory_shortage_reports  -- evolve canteen shortage reports
(reuse) hall_canteen_weekly_orders + order_items  -- link inventory_item_id
(reuse) hall_shopping_list_items -- inventory_item_id + source
hall_merchandise_sales        -- sale events
```

### 9.2 `hall_inventory_items` (conceptual columns)

All §4 fields + `created_at`, `updated_at`, `created_by`, `domain`, unique `(hall_id, lower(name), domain) WHERE archived=0`.

### 9.3 `hall_inventory_ledger`

| Column | Purpose |
|--------|---------|
| `event_id` | PK |
| `hall_id`, `item_id` | Scope |
| `action` | `mark_low`, `mark_out`, `consume`, `receive`, `adjust`, `transfer`, `archive`, `sale`, `status_clear`… |
| `qty_delta` | Signed |
| `qty_after` | Snapshot |
| `status_after` | Snapshot |
| `actor_user_id` | Who |
| `ref_type` / `ref_id` | order_id, list_item_id, sale_id |
| `note` | Optional |
| `created_at` | |

### 9.4 Migration path from Canteen V2

1. Add `domain='canteen'` to existing rows (via rename/expand table).  
2. Map categories; preserve item_ids.  
3. Backfill `quantity_on_hand` from `estimated_qty` where present.  
4. Keep weekly orders / shortage tables; rename FKs in place.  
5. Feature-flag UI until Cabinet ships.  

**Do not** hard-delete canteen history.

---

## 10. Integration contracts

### 10.1 → The Run

```
on NeedsAttention(item):
  if Pro and auto_restock_enabled:
    upsert ShoppingLine(item, qty=reorder_qty, source=inventory)
  else:
    show "Add to Run" on Needs Attention row
```

### 10.2 → Weekly Order

```
buildWeeklyOrder():
  include items where
    domain=canteen AND
    (status in out, running_low OR recurrence due) AND
    preferred_retailer in hall.bulk_retailers
```

### 10.3 → Hall Home

```
NeedsAttentionCard:
  out_count, low_count, top_item_name, deep_link=/hall/canteen?filter=needs
```

### 10.4 → Alerts

Emit `hall_alerts` per HO design when Out / first Low / merch min.

### 10.5 → Merchandise Sales

```
recordSale(item, qty, price):
  ledger sale (−qty)
  insert hall_merchandise_sales
  if qty_after < min: Needs Attention
```

### 10.6 → Recipes / Board (soft)

- Board dinner does **not** auto-decrement pantry (too noisy).  
- Optional later: “Cook mode used staples” checklist.  

### 10.7 → Public Tools

- Pantry Checklist PDF → “Apply starter pack to hall inventory” (after join).  
- Never sync private qty to public pages.  

---

## 11. Edge cases & rules

| Case | Rule |
|------|------|
| Two “Coffee” names | Unique per hall+domain; suggest merge |
| Negative qty | Block; force Adjust |
| Receive above max | Warn, allow with confirm |
| Member marks Out but qty was 12 | Set override Out; prompt manager to count |
| Archived with open order lines | Soft-block archive until cleared |
| Runner offline | Queue Receive; sync later |
| Photo too large | Compress client-side; Pro storage caps |
| Barcode collision | Future: warn, don’t block name uniqueness |

---

## 12. Analytics (product)

| Event | Why |
|-------|-----|
| `inventory_mark_low` / `mark_out` | Member engagement |
| `inventory_receive` | Manager ops health |
| `inventory_auto_add_run` | Automation value |
| `merch_sale` | Cabinet adoption |
| `needs_attention_open` | Dashboard usefulness |

---

## 13. Implementation roadmap

### INV-0 — Design lock

- [ ] Approve domain split + category lists  
- [ ] Approve Free/Pro caps  
- [ ] Approve auto-feed defaults (auto vs button)  

### INV-1 — Unify data model (canteen → inventory)

- Evolve schema; ledger; status derivation  
- Keep Canteen UI working on new engine  
- Par / min / max / dates exposed in manager edit  

### INV-2 — Member actions polish

- Running Low / Out / Consume  
- Needs Attention → Add to Run  
- Alerts hooks  

### INV-3 — Receive / Adjust / Transfer

- Manager flows from Order + Run  
- Activity trail on item  

### INV-4 — Auto-feed Weekly Order + Run

- Build-from-Needs  
- Retailer filters  
- Deduping  

### INV-5 — Merchandise Cabinet v1

- Merch categories + sale price  
- Sell action + sales log  
- Low stock after sales  

### INV-6 — Photos + templates + Tools import

- Photo upload  
- Starter packs  
- Checklist → inventory seed  

### INV-7 — Barcode (future)

- Field live already; camera scan entry  
- Search by barcode  

---

## 14. Success metrics

| Metric | Signal |
|--------|--------|
| % halls with ≥10 active canteen items | Adoption |
| Marks low/out per week per hall | Live usage |
| Median time Out → Receive | Ops effectiveness |
| Auto or one-tap adds to Run | Clipboard replacement |
| Merch sales logged / month | Cabinet value |
| Non-cook DAU touching Needs Attention | Habit (Hall Ops goal) |

---

## 15. Risks & anti-goals

| Risk | Mitigation |
|------|------------|
| ERP creep | Status-first UX; hide advanced fields behind “Edit details” |
| Quantity guilt | Members never forced to count |
| Notification fatigue | Per-item daily cap; digests |
| Double systems (canteen vs inventory) | Single engine, two faces |
| Merch before canteen solid | Cabinet only after INV-1–4 |
| Public data leak | Private hall APIs only |

**Anti-goals:** Full warehouse management, multi-warehouse, purchase orders with AP, barcode-required receiving, AI demand forecasting in v1.

---

## 16. One-line pitch

**Hall Inventory is how the station knows what’s on the shelf, what’s gone, and what belongs on this week’s run — for the canteen and the merch cabinet — without a spreadsheet or a binder.**

---

## 17. Approval checklist

- [ ] Canteen vs Merchandise domain split approved  
- [ ] Category lists approved (incl. BBQ, freezer, pantry)  
- [ ] Field list approved (barcode future OK)  
- [ ] Action set approved  
- [ ] Auto-feed rules (Run / Weekly Order / Dashboard / Alerts / Sales) approved  
- [ ] Free vs Pro caps approved  
- [ ] Roadmap INV-1 → INV-5 sequencing approved  
- [ ] Explicit go-ahead to implement (design-only until then)

---

*— End of Hall Inventory system design —*
