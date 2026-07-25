# Smart Shopping Intelligence Engine — Product Design

**Status:** Design only — do not implement until approved  
**Date:** 2026-07-17  
**Role:** Purchasing intelligence layer for Hall Operations  
**Not:** A shopping list UI · Not a Costco integration · Not auto-ordering  

**Depends on:**  
`review/hall-operations-design.md` · `review/inventory-system.md` · `review/hall-merchandise.md` · `review/canteen-payments.md` · `review/digital-whiteboard.md` · `review/tools-section-design.md`

---

## 1. One-line definition

**Smart Shopping** decides *what* the hall should buy, *how much*, *why*, *when*, and *who should buy it* — then lets the hall choose *where*. Retailers are interchangeable preferences, never workflow locks.

---

## 2. Goals

| Goal | Meaning |
|------|---------|
| Recommend, don’t dictate | Humans approve every purchase |
| Retailer-agnostic | Costco, Sysco, butcher, Amazon — same engine |
| Power Hall Ops | Feeds The Run, Weekly Order, Dashboard, Board, Alerts |
| Ownership-aware | Canteen vs Department vs Merchandise don’t mix wrongly |
| Explainable | Every recommendation has a reason |
| AI-ready | Rules first; ML/LLM as later scorers, not hard deps |

**Anti-goals:** One-click Costco cart sync, retailer lock-in, silent auto-orders, live price scraping as a requirement.

---

## 3. Core principle

```
Firehall Meals manages PURCHASING INTELLIGENCE.
The hall decides WHERE to buy.
Workflows never require a specific retailer.
```

Preferred retailer on an item = **suggestion chip**, not a gate.

---

## 4. What the engine knows (inputs)

| Signal | Source |
|--------|--------|
| Current inventory qty / status | Hall Inventory |
| Par / min / max | Inventory item |
| Shortages (low / out) | Inventory marks + reports |
| Upcoming meals | Board Tonight + meal plan / calendar |
| Weekly meal plan | Meal Planner / Board slots |
| Recurring purchase rules | Smart Shopping config |
| Recent purchases | Purchase history ledger |
| Estimated consumption | Derived from consume/receive history |
| Ownership | `canteen` · `department` · `merchandise` |
| Seasonal events | Board events (BBQ, open house) + calendar tags |
| Hall preferences | Default retailers, bulk day, budget soft caps |
| Recipe needs | Locked dinner / planned recipes → scaled ingredients |
| Merchandise stock | Cabinet variants below min |

---

## 5. Ownership model (critical)

Every recommendable need has an **owner**:

| Owner | Code | Engine behavior |
|-------|------|-----------------|
| **Canteen** | `canteen` | Eligible for canteen Run / Weekly Order |
| **Department** | `department` | Recommend **Notify Department** — do **not** add to canteen shopping |
| **Merchandise** | `merchandise` | Cabinet restock recommendations |
| **Dinner / Kitchen** | `dinner` | Meal-driven protein/produce — often The Run (dinner section) |

**Example:** Paper towels owned by Department → recommendation type `notify_department`, not `buy_for_canteen`.

Halls configure ownership per inventory item (default by category).

---

## 6. Recommendations (output), not a bare list

### 6.1 Recommendation object

| Field | Purpose |
|-------|---------|
| `recommendation_id` | Stable id |
| `item_ref` | Inventory item / recipe ingredient / merch variant |
| `title` | “Coffee” |
| `current_qty` | Snapshot |
| `par_or_normal` | Par / typical on-hand |
| `recommended_qty` | What to buy |
| `unit` | bags, kg, cases |
| `reason_code` + `reason_text` | Explainable |
| `urgency` | `now` · `this_week` · `upcoming` · `seasonal` |
| `owner` | canteen / department / merchandise / dinner |
| `action` | `buy` · `notify_department` · `review_only` · `skip_suggested` |
| `preferred_retailer_id` | Soft preference |
| `alternative_retailer_ids` | Comparison |
| `confidence` | 0–1 rules score (AI later) |
| `sources[]` | Signals that fired (par, meal_plan, recurrence…) |
| `status` | See workflow stages |

### 6.2 Example cards

**Coffee**  
Current: 1 bag · Normal: 4 · **Buy 3**  
Reason: Average consumption last 30 days; below par.  
Owner: Canteen · Preferred: Costco Business  

**Ground Beef**  
Current: None · **Buy 8 kg**  
Reason: Taco Night Friday (meal plan).  
Owner: Dinner · Preferred: Local butcher  

**Paper Towels**  
Managed by: **Department**  
Recommendation: **Notify Department** — do not add to canteen shopping.

---

## 7. Purchasing workflow (8 stages)

```
1 Detected Needs
      ↓
2 Review Recommendations
      ↓
3 Approve Purchases
      ↓
4 Assign Buyer
      ↓
5 Choose Retailer   ← hall decision; never locked
      ↓
6 Purchase Complete
      ↓
7 Receive Inventory
      ↓
8 Update Inventory
```

| Stage | User job | System job |
|-------|----------|------------|
| **1 Detected Needs** | — | Run engines; create draft recommendations |
| **2 Review** | Accept / edit qty / dismiss / change owner action | Show reasons, group by urgency/owner |
| **3 Approve** | Confirm set for this cycle | Snapshot approved lines |
| **4 Assign Buyer** | Pick runner / split buyers | Notify assignee |
| **5 Choose Retailer** | Pick where (per line or bulk) | Suggest preferred + alts; no API required |
| **6 Purchase Complete** | Mark bought; optional cost/receipt | Write purchase history |
| **7 Receive** | Confirm delivery / put-away | Link to inventory Receive |
| **8 Update Inventory** | — | Qty up; clear low/out; close recs |

**The Run** (existing shopping list) becomes the **execution clipboard** for stages 4–6 — fed by approved recommendations, not the intelligence itself.

**Weekly Order** = a view of approved canteen lines filtered by bulk retailer preference — still not a Costco product.

---

## 8. Retailer model (flexible, unlimited)

### 8.1 Hall retailers

| Field | Notes |
|-------|-------|
| `name` | Costco Business Centre, Joe’s Meats… |
| `category` | warehouse · grocery · foodservice · hardware · online · specialty · other |
| `website` | Optional URL (open externally) |
| `preferred` | Hall-level default flag |
| `delivery_available` | Bool |
| `pickup_available` | Bool |
| `typical_lead_time_days` | Soft planning |
| `typical_price_level` | `$` · `$$` · `$$$` (qualitative) |
| `preferred_products` | Notes / tags |
| `member_number` | Optional, private |
| `notes` | “Use south entrance” |
| `active` | Soft archive |

**Built-in starters (templates, not integrations):** Costco, Costco Business, Walmart, Amazon, No Frills, Loblaws, Metro, Restaurant Depot, GFS, Sysco, Wholesale Club, Canadian Tire, Home Depot, “Local butcher,” “Local produce,” “Local bakery,” Custom…

Halls add unlimited custom retailers. **Zero API keys required for v1.**

### 8.2 Item ↔ retailer preferences

| Field | Notes |
|-------|-------|
| Preferred retailer | Soft |
| Alternative retailers | Ordered list |
| Preferred brand | |
| Preferred package size | |
| Typical price | Manual estimate |
| Preferred supplier | Text alias |
| Last purchased from | From history |

Retailers on recommendations = **chips to choose**, not forced carts.

---

## 9. Recommendation engines (rules architecture — no AI required)

Design as **pluggable detectors** → merge → score → dedupe.

| Detector | Fires when | Typical action |
|----------|------------|----------------|
| `below_par` | qty &lt; par or min | Buy toward par |
| `out_of_stock` | qty ≤ 0 or status out | Buy reorder_qty |
| `meal_plan_demand` | Upcoming recipe needs ingredient | Buy scaled qty |
| `recurrence_due` | Recurring rule due | Recommend buy |
| `consumption_trend` | Burn rate → stockout ETA &lt; N days | Buy early |
| `seasonal_event` | BBQ / open house tagged | Seasonal list |
| `merch_below_min` | Variant &lt; min | Merch reorder |
| `forgotten_frequent` | Often bought historically, missing from cycle | Soft suggest |
| `bundle_affinity` | Often purchased with approved item | Optional add |
| `duplicate_guard` | Same item already on approved Run | Suppress / merge |
| `bulk_opportunity` | Multiple small lines → case logic | Suggest case qty |
| `department_owned` | Owner = department | Notify only |
| `budget_soft_cap` | Cycle estimate &gt; soft budget | Flag review |

**Merger:** One recommendation per item; combine `sources[]` and reasons (“Below par + Taco Night”).

**AI later:** Replace/extend scorers (`confidence`, qty suggestion, bundle) without changing recommendation schema or workflow stages.

---

## 10. Recurring purchases

| Field | Example |
|-------|---------|
| Item | Coffee |
| Cadence | Every 2 weeks |
| Qty | 3 bags |
| Owner | Canteen |
| Season window | Optional (propane: May–Oct) |
| Preferred retailer | Soft |

**Recommendation only.** Never auto-create Stage 3 approvals or retailer orders.

---

## 11. Retailer comparison UI

Per recommendation (or item detail):

| Retailer | Role | Last purchased | Est. price | Notes |
|----------|------|----------------|------------|-------|
| Costco | Preferred | Mar 12 | ~$18 | Member # on file |
| Amazon | Alt | — | ~$22 | Delivery |
| Local roaster | Alt | Jan 3 | ~$16 | Pickup Thu |

**No live pricing required.** Est. price = last paid or typical_price on preference.

---

## 12. Purchase history

Track completed cycles / trips:

| Field | Notes |
|-------|-------|
| Who purchased | Buyer user |
| Where | Retailer id |
| Date | |
| Cost | Total and/or per line |
| Receipt | Photo / number |
| Items | Lines + qtys |
| Notes | |
| Delivery status | pickup · delivered · partial |

Feeds: last purchased from, typical price, consumption estimates, forgotten-item detection.

---

## 13. Merchandise

Same engine, `owner=merchandise`:

- Below min on sizes → recommend reorder qty  
- Approve → buyer + retailer (print shop, online blank apparel, etc.)  
- Receive → Cabinet stock  

No separate “merch shopping product.”

---

## 14. System architecture

```
┌──────────────────────────────────────────────────────────┐
│                 Smart Shopping Engine                      │
│  Detectors → Merger → Scorer → Recommendation Store        │
└───────────────┬───────────────────────┬────────────────────┘
                │                      │
     ┌──────────▼──────────┐ ┌─────────▼─────────┐
     │ Inventory / Merch   │ │ Board / Meal Plan │
     │ Recurrence / Prefs  │ │ Recipes / History │
     └──────────┬──────────┘ └─────────┬─────────┘
                │                      │
                ▼                      ▼
        Recommendation Review UI (Stage 2–5)
                │
                ├──► The Run (execution clipboard)
                ├──► Weekly Order view (bulk filter)
                ├──► Department notify queue
                ├──► Hall Home / Whiteboard pulses
                └──► Alerts / future push
```

**Layering**

| Layer | Responsibility |
|-------|----------------|
| Intelligence | Recommendations + reasons |
| Execution | The Run / receive / history |
| Preference | Retailers + item prefs |
| Presentation | Review UI, mobile |

---

## 15. Database model (conceptual)

```
hall_retailers
hall_item_retailer_prefs      -- preferred + alternatives + brand/size/price
hall_recurring_purchase_rules
hall_purchase_recommendations -- Stage 1–8 status machine
hall_purchase_recommendation_sources
hall_purchase_cycles            -- approved batch / shopping trip
hall_purchase_cycle_lines
hall_purchase_history           -- completed trips
hall_purchase_history_lines
hall_department_notices         -- notify_department actions
```

**Recommendation status enum:**  
`detected` → `reviewed` → `approved` → `assigned` → `retailer_chosen` → `purchased` → `receiving` → `closed` | `dismissed`

Link: `shopping_list_item_id`, `inventory_item_id`, `merch_variant_id`, `recipe_slug` optional.

---

## 16. User flows

### 16.1 Manager weekly cycle

1. Open **Smart Shopping** (or Hall Home “12 needs detected”)  
2. Review cards — edit qty, dismiss paper towels (dept), approve coffee + beef  
3. Assign buyer (Mike)  
4. Mike chooses Costco for canteen, butcher for beef  
5. Mike marks purchased + totals  
6. On return, Receive → inventory updates  

### 16.2 Member marks Out

1. Marks Coffee Out on inventory  
2. Engine detects → recommendation appears  
3. Manager approves into Run (or auto-suggest on Pro)

### 16.3 Dinner locked on Board

1. Taco Night locked  
2. Meal-plan detector adds beef, tortillas, etc.  
3. Dedupes against pantry stock  

### 16.4 Department item

1. Paper towels below min, owner=department  
2. Card: Notify Department  
3. Creates notice / alert to captain — **not** on canteen Run  

---

## 17. Mobile UX

- **Needs inbox:** cards with Current / Normal / Buy / Reason  
- Swipe: Approve · Dismiss · Snooze  
- Filter chips: Canteen · Dinner · Merch · Department · This week  
- Buyer mode: approved lines only, retailer chips, big “Purchased”  
- Receive mode: checkboxes → Update inventory  
- Offline: queue Stage 6 checkmarks  

**Not:** A flat checkbox list as the intelligence UI (that’s The Run after approval).

---

## 18. Permissions

| Action | Member | Runner | Canteen mgr | Captain |
|--------|:------:|:------:|:-------------:|:-------:|
| View recommendations (canteen/dinner) | limited | ✓ | ✓ | ✓ |
| Approve / dismiss | | | ✓ | ✓ |
| Assign buyer | | | ✓ | ✓ |
| Choose retailer / mark purchased | | ✓ | ✓ | ✓ |
| Receive inventory | | ✓ | ✓ | ✓ |
| Manage retailers / recurrence / ownership | | | ✓ | ✓ |
| Department notify acknowledge | | | | ✓ |
| Merch reorder approve | | | ✓ | ✓ |

**Hall Pro:** Full engine + auto-detect + history + multi-retailer prefs.  
**Free:** Manual Run only; teaser “Enable Smart Shopping with Hall Pro.”

---

## 19. Integration map

| Surface | How Smart Shopping powers it |
|---------|------------------------------|
| **Inventory** | Primary signal + receive sink |
| **Pantry / Canteen** | Ownership + weekly bulk view |
| **Recipe / Generator** | Scaled ingredient demand when meal planned |
| **Meal Planning / Board** | Upcoming meal detector |
| **The Run** | Execution after approve |
| **Payments / Dues** | Optional soft budget flag (not dues collection) |
| **Hall Dashboard** | “Needs detected / awaiting approve / overdue receive” |
| **Whiteboard** | Pulse + department notify notes |
| **Merchandise** | Restock recommendations |
| **Notifications** | Buyer assigned, dept notify, receive due |
| **Tools Shopping Builder** | Can import public tool lists as *manual* detected needs |

---

## 20. Monetization & Hall Pro

| Lever | Approach |
|-------|----------|
| **Hall Pro** | Smart Shopping engine unlock |
| **Affiliate (careful)** | Optional “Buy elsewhere” links on comparison — disclosure; never required |
| **Supplier partnerships** | Future: preferred GFS/Sysco hall programs — still interchangeable |
| **OCR / scanning add-ons** | Future Pro features |

**Do not** sell Costco membership or broker retailer logins.

---

## 21. Future roadmap & extension points

| Extension | Hook |
|-----------|------|
| Retailer APIs | `RetailerConnector` interface: search, deep link, never own workflow |
| Affiliates | Link templates on retailer records |
| Supplier integrations | Same connector; EDI later |
| Invoice upload | Attach to purchase history |
| Receipt OCR | Fill cost/lines → history |
| Barcode / QR | Map to inventory item → receive/adjust |
| **AI recommendations** | Scorer plugin: qty, bundles, anomaly “forgot propane” |
| Budget forecasting | Use history + meal plan → soft forecast |
| Predictive inventory | ETA to stockout |
| Department purchasing | Deeper notify + external ticket ID |

**AI roadmap (explicitly deferred)**

1. Rules-only GA  
2. Heuristic burn-rate  
3. Model-assisted qty + “forgotten”  
4. LLM explanation polish (still human approve)  

Never skip Stage 3 approval via AI.

---

## 22. Implementation phases

### SS-0 — Design lock  
Approve ownership, stages, retailer-agnostic principle  

### SS-1 — Retailers + item prefs  
CRUD retailers; preferred/alts on inventory items  

### SS-2 — Detectors v1  
below_par, out, meal_plan, recurrence, department_owned, merch_min  

### SS-3 — Review → Approve → Assign UI  
Recommendation inbox; push approved lines to The Run  

### SS-4 — Choose retailer + Purchase history  
Comparison chips; complete trip; receive link  

### SS-5 — Consumption + forgotten + bundles  
History-based detectors  

### SS-6 — Alerts + Board + Dashboard pulses  

### SS-7 — Connectors / OCR / AI scorers (future)  

---

## 23. Success metrics

| Metric | Meaning |
|--------|---------|
| % of Runs originating from approved recommendations | Intelligence adoption |
| Dismiss rate by reason_code | Detector quality |
| Stockouts after meal plan locked | Meal detector value |
| Department items wrongly on canteen Run | → 0 |
| Multi-retailer usage (not only one) | Agnostic success |
| Time Detected → Received | Ops speed |

---

## 24. Risks & anti-goals

| Risk | Mitigation |
|------|------------|
| Becoming “the Costco feature” | Language + equal retailer model |
| Auto-order disasters | No auto Stage 3 |
| Noisy recommendations | Dedupe, confidence, dismiss memory |
| Fighting The Run | Run = clipboard; Smart Shopping = brain |
| Live price complexity | Manual/typical/last-paid only in v1 |

**Anti-goals:** Exclusive retailer partnerships that break halls, scraping ToS-violating prices, replacing inventory with a list app.

---

## 25. One-line pitch

**Smart Shopping is the hall’s purchasing brain — it tells you what to buy, how much, why, and who should get it, while every retailer from Costco to the corner butcher stays a choice, not a cage.**

---

## 26. Approval checklist

- [ ] Retailer-agnostic principle approved  
- [ ] 8-stage workflow approved  
- [ ] Ownership (canteen / department / merch / dinner) approved  
- [ ] Recommendation card format approved  
- [ ] The Run = execution only approved  
- [ ] No AI in v1 / AI extension points approved  
- [ ] Hall Pro packaging approved  
- [ ] Explicit go-ahead to implement (design-only until then)

---

*— End of Smart Shopping Intelligence Engine design —*
