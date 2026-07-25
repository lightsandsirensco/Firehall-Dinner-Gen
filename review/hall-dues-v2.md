# Hall Dues v2 — Spreadsheet Killer Redesign

**Status:** Design only — do not implement until approved  
**Date:** 2026-07-17  
**Supersedes (product thinking):** `review/canteen-payments.md` as “Canteen Accounting” with ledger/KPI weight  
**Depends on:** Hall Ops · Hall Event Engine · Whiteboard v2 (dues pulse only) · existing `canteen_payment_tracker`  

**One problem, solved extremely well:**

> **Who has paid, who hasn’t, and how do I record payments in seconds?**

Nothing else is the product.

---

## 0. Simplified product philosophy

| Principle | Meaning |
|-----------|---------|
| **Spreadsheet killer** | Replace the Excel/Google Sheet — not QuickBooks |
| **Mark Paid is the product** | Primary action always visible; everything else secondary |
| **Low frequency** | Monthly (or cycle) tool — not daily Habit like Whiteboard |
| **Firefighter words** | Paid · Due · Overdue · On Leave · Exempt · Mark Paid · History |
| **Hide bookkeeping** | Advanced behind expanders or never ship |
| **No shame board** | Overdue is for the collector — not hall theater |
| **Money movement later** | Cash / e-Transfer confirm first; Stripe is future |

**Rename the product surface:** **Hall Dues** (not “Canteen Accounting,” not “AR”).

**Anti-goals (explicit):** QuickBooks · FreshBooks · Wave · Xero · ERP · A/R aging · GL · tax · payroll · invoice PDFs · revenue dashboards as home.

---

## 1. Recommended information architecture

### 1.1 Three surfaces only

```
/hall/dues                 ← Collector home (managers)
/hall/dues (My Dues mode)  ← Member: own status only
/hall/settings → Dues      ← Defaults: amount, frequency, due day
```

**Remove as first-class destinations:**

- Separate “Record payment” page (use sheet only)  
- Financial reports home  
- Canteen page as second dues app (one teaser card max → `/hall/dues`)  

### 1.2 Collector home structure

```
┌─────────────────────────────────────────┐
│ DUES                          [Mark Paid]│  ← bulk entry optional later
├─────────────────────────────────────────┤
│ 12 paid · 3 due · 2 overdue              │  ← counts only
│ Next collection: Friday                  │
├─────────────────────────────────────────┤
│ OVERDUE                                  │
│ · Alex · Sam                             │  ← tap → Mark Paid
├─────────────────────────────────────────┤
│ DUE                                      │
│ · Jordan · …                             │
├─────────────────────────────────────────┤
│ PAID                                     │
│ · … (collapsed by default)               │
└─────────────────────────────────────────┘
```

Filters: Overdue · Due · Paid · On Leave · Exempt.  
Retired/left: hidden behind “Inactive” — not on home.

### 1.3 No financial KPI strip on home

| v1 KPI | v2 verdict |
|--------|------------|
| Total Collected | **Remove from home** — Nice to Have in History/export |
| Outstanding ($) | **Remove from home** — use **counts**; $ optional on detail |
| Members Overdue | **Keep** (count) |
| Revenue This Year | **Remove** — accounting smell |
| Charts | **Never** on dues home |

Operational questions only:

- How many have paid?  
- Who is overdue?  
- Who is due?  
- When is the next collection day?

---

## 2. Streamlined payment workflow

### 2.1 Hero path — one tap when amount is standard

**Default hall case:** everyone owes the same amount this period.

1. Roster row → **Mark Paid**  
2. Confirm sheet (prefilled): amount = hall default · method = last used / Cash · paid now  
3. **Confirm**  

**Target: ≤3 seconds** when defaults are right.  
Optional fields collapsed: note · receipt · “not full amount.”

### 2.2 Even faster — swipe / checkbox night

**Cash collection night:**

1. Tap **Collect** mode  
2. Tap names (multi-select)  
3. **Mark N paid** — one method for the batch  

Individual history rows still written (audit without ceremony).

### 2.3 Challenge of v1 flow

| v1 step | v2 |
|---------|-----|
| Amount required every time | Prefill; edit only if needed |
| Method required | Prefill Cash; chips if changing |
| **Collected by required** | **Default to me; hide** — Advanced if someone else collected |
| Receipt number | **Collapsed / Remove from default** |
| Notes | Collapsed |
| Period covered UI | Auto — hide |
| Balance math shown | Hide on Mark Paid; show on detail if needed |

### 2.4 Primary button language

Always: **Mark Paid**  
Never: Remit · Record remittance · Post payment · Receive funds.

### 2.5 Corrections

- **Undo** within a short window (toast) OR **Void** on history row with reason  
- No silent delete  
- Don’t teach “credit memos”

---

## 3. Simplified dashboard (operational)

### 3.1 Home header (only this)

```
12 paid · 3 due · 2 overdue
Next collection: Fri Mar 1
```

Optional second line for managers only: `All clear` when overdue = 0.

### 3.2 Hall Home / Whiteboard

Align with Whiteboard v2:

- Pulse only when useful: `2 overdue` or `Dues Friday`  
- **Never** dollar revenue on the kitchen board  
- No public naming of overdue members on Whiteboard  

### 3.3 What managers see when they open Dues (monthly ritual)

1. Who’s overdue (act)  
2. Who’s due (nudge / collect)  
3. Mark Paid in bulk  
4. Done — close app  

No “review YTD revenue” step.

---

## 4. Field-by-field verdict

| Field | Verdict | Why |
|-------|---------|-----|
| **Member** | **Must Have** | Who |
| **Status** (Paid / Due / Overdue / On Leave / Exempt) | **Must Have** | The whole point |
| **Next due date** | **Must Have** | When |
| **Amount** (expected per period) | **Must Have** | What they owe each cycle |
| **Mark Paid action** | **Must Have** | Core |
| **Payment history** (date, amount, method) | **Must Have** | “Did I already mark them?” disputes |
| **Payment method** (Cash / e-Transfer / Other) | **Must Have** (simple) | Hallway reality; default Cash |
| **Paid at** | **Must Have** (default now) | History |
| **Frequency** (monthly / semi / annual) | **Must Have** | Most halls; keep existing three first |
| **Hall default amount + due day** | **Must Have** | Settings |
| **Grace days** | **Nice to Have** | Soft overdue; default 3–7 hidden in settings |
| **Due Soon window** | **Nice to Have** | Can collapse Due Soon into **Due** for simplicity |
| **Collector** | **Advanced** | Default = current user; show only in “More” |
| **Receipt number** | **Advanced / Remove from v2 default** | Rarely used; Interac ref → optional note |
| **Notes** | **Nice to Have** (collapsed) | “Paid for two months” |
| **Balance** (running AR balance) | **Advanced / demote** | Mental model: Paid vs not for *this period* beats AR ledger. See §5 |
| **Credits / negative balance** | **Future / Remove from v2** | Overpay → mark next period paid or note; don’t teach credits |
| **Partial payments** | **Advanced / Future** | Friction; halls usually take full dues. “Other amount” behind expand |
| **Revenue / Total Collected KPIs** | **Remove from product home** | Export later if needed |
| **Outstanding $ KPI** | **Nice to Have** on detail/settings, not home | Counts > dollars on home |
| **Weekly / biweekly / quarterly** | **Future** | Complexity; add when a hall asks |
| **New Member status** | **Nice to Have** | Or just Due with later first date |
| **Retired** | **Must Have** (as inactive) | Stop asking them to pay |
| **Exempt reason** | **Nice to Have** | Optional note |
| **Leave until** | **Nice to Have** | Optional date |
| **Anchor date** | **Advanced** | System-owned; don’t show |
| **balance_after snapshots** | **Advanced** | Ledger internals |
| **Period covered multi-select UI** | **Remove** | Auto-advance next due |
| **Currency picker complexity** | **Settings once** | One currency per hall |
| **Apply merch sale to dues** | **Future** | Mixing money systems |
| **CSV export** | **Nice to Have** (Pro) | Spreadsheet exit ramp |
| **Charts** | **Remove** | — |

---

## 5. Essential data model only

### 5.1 Mental model (v2)

Prefer **period status** over **accounts receivable balance**:

```
Each member, each cycle:
  - owes $X by date D
  - either Marked Paid for this cycle → Paid + next due advances
  - or not → Due / Overdue
```

**Balance field:** optional internal; **do not lead the UI with it.**  
If someone pays twice, advance two periods or add history note — don’t open with “credit balance.”

### 5.2 Tables (minimal)

```
hall_dues_members
  hall_id, user_id
  frequency          -- monthly | semi_annual | annual (v2)
  amount
  next_due_date
  status             -- paid | due | overdue | leave | exempt | inactive
  leave_until? 
  exempt_note?
  notes?             -- member-level standing note
  enrolled_at

hall_dues_payments
  payment_id, hall_id, user_id
  amount
  method             -- cash | etransfer | other
  paid_at
  recorded_by        -- implicit collector
  note?              -- optional (receipt ref lives here)
  voided_at?

hall_dues_settings
  default_frequency, default_amount, due_day, grace_days, currency
```

**Drop from v2 UI contract:** receipt_number column as first-class · credits · weekly frequencies · revenue rollups · required collector distinct from recorded_by.

### 5.3 Status set (firefighter language)

| Status | Meaning |
|--------|---------|
| **Paid** | Current cycle covered |
| **Due** | Owes for current cycle (includes former “Due Soon”) |
| **Overdue** | Past due (+ grace) |
| **On Leave** | Paused |
| **Exempt** | Doesn’t pay |
| **Inactive** | Left / retired — not on main roster |

**Merge:** Due Soon → **Due** (simpler roster). Optional sort: due date ascending within Due.

---

## 6. Must Have vs Nice to Have vs Future

### Must Have (ship this)

- Roster by Paid / Due / Overdue  
- Mark Paid (single + bulk)  
- Default amount & frequency & next due  
- Method: Cash / e-Transfer / Other  
- History per member (simple list)  
- On Leave / Exempt / Inactive  
- My Dues for members (own only)  
- Void/undo payment  
- Hall Home count pulse (overdue)  
- Hall Pro gate (existing)

### Nice to Have

- Grace days · CSV export · collapsed notes · “Other amount” · Due date sort · e-Transfer “I’ve sent it” pending (manager confirms) · member-level amount override  

### Future (not v2)

- Stripe / Square / Interac auto  
- Partial pay & credits as first-class  
- Weekly/biweekly/quarterly  
- Revenue dashboards · aging reports  
- Auto reminder campaigns (light digest OK later)  
- Merch↔dues application  
- Invoice PDFs · statements  

### Remove / don’t build

- “Canteen Accounting” naming  
- Home KPIs: Total Collected, Revenue YTD, Outstanding $ as heroes  
- Required receipt # · required separate collector field  
- Charts · AR aging · credit memos · GL language  
- Public overdue names on Whiteboard  
- Dual full UIs on Canteen + Dues  

---

## 7. Features to remove (from v1 design)

| Feature | Why remove / demote |
|---------|---------------------|
| Product name “Accounting” | Scares users; implies QuickBooks |
| Revenue This Year / Total Collected on home | Wrong job; monthly collectors don’t need it |
| Outstanding $ as primary | Counts drive action; $ is secondary |
| Due Soon as separate status | Extra cognitive load → merge into Due |
| Weekly/biweekly/quarterly in v2 | YAGNI until requested |
| Required collector + receipt | Slows Mark Paid; recorded_by is enough |
| Credits / negative balance UX | Accounting training required |
| Partial payments as default path | Edge case behind “Other amount” |
| Rich balance accrual narrative on home | Period paid/unpaid is enough |
| Member-facing anything beyond own dues | Privacy + simplicity |
| Dashboard “financial reporting” frame | Replace with operational counts |

---

## 8. UX recommendations

### 8.1 Collector

- Big **Mark Paid** on every Due/Overdue row  
- Overdue section always expanded first  
- Paid section collapsed  
- Empty overdue: “All clear — nice work”  
- Settings link small, not a tab  

### 8.2 Mark Paid sheet

```
Mark Paid — Alex
$20 · Cash                    [Change]
[ Confirm ]

▸ More options
   Method · Note · Different amount · Collected by someone else
```

### 8.3 My Dues (member)

Intentionally tiny:

```
Your dues
Status: Paid
Next: Apr 1 · $20
[ History ]
```

If Due/Overdue: show amount + “Pay cash/e-Transfer to [canteen contact]” (static hall instruction from settings) — **not** a payment processor in v2.

**Do not show:** other members · hall revenue · collector names · credits education.

### 8.4 Terminology cheat sheet

| Never say | Say |
|-----------|-----|
| Accounts receivable | Who hasn’t paid |
| Remit / Post payment | Mark Paid |
| Credit memo | (don’t) / note |
| Customer statement | History |
| Invoiced / Outstanding AR | Due / Overdue |
| Revenue | (don’t on home) |
| Ledger | History |
| Canteen Accounting | **Hall Dues** |

### 8.5 Low-frequency UX

- No daily badges nagging everyone  
- Optional manager digest when overdue count rises  
- Open Dues → act → leave; don’t invent “engagement”  

---

## 9. Final Hall Dues experience (story)

**Friday — canteen manager, cash night**

1. Opens Hall → Dues (or Home pulse “2 overdue”)  
2. Sees `10 paid · 2 due · 2 overdue` · Next collection: today  
3. Enters Collect mode · taps four names · **Mark 4 paid** · Cash  
4. Overdue clears · closes phone  
5. Total time: under a minute  

**Member**

1. Opens My Dues once a month: “Paid · Next Apr 1”  
2. Stops asking in the hallway  

**Captain**

1. Doesn’t learn accounting  
2. Doesn’t configure credits  
3. Trusts the roster matches the old spreadsheet — but faster  

---

## 10. Event Engine (light)

| Action | Event |
|--------|-------|
| Mark Paid | `payment.received` |
| Void | `payment.reversed` |
| Becomes overdue | `payment.overdue` |
| Status leave/exempt | member dues profile events |

Whiteboard: count/date pulses only (per Whiteboard v2).  
Logbook: optional quiet auto (“Dues marked paid ×4 — Sam”) — **off by default** to avoid noise.

---

## 11. Implementation order (v2)

### DU-0 — Rename + cut list approved  

### DU-1 — Schema: amount, next_due, status, simple payments (method, paid_at, recorded_by, note)  

### DU-2 — Roster + one-tap Mark Paid + bulk  

### DU-3 — My Dues (member)  

### DU-4 — Accrual job: Due / Overdue only  

### DU-5 — Home/Whiteboard count pulses  

### DU-6 — CSV + void polish  

### Later — reminders, Interac pending, Stripe  

**Do not implement** v1 CA-1 “full ledger + revenue KPIs + all frequencies” as the first ship.

---

## 12. Success metrics

| Metric | Direction |
|--------|-----------|
| Time to mark one payment | ↓ toward seconds |
| Time for cash-night bulk | ↓ |
| Overdue count after 2 cycles | ↓ |
| Training questions (“what’s a credit?”) | → 0 |
| Spreadsheet still in use | ↓ |
| Manager NPS vs old sheet | ↑ |

---

## 13. Risks

| Risk | Mitigation |
|------|-------------|
| Power users want AR balance | History + CSV; don’t bend home UI |
| Disputes “I paid cash” | History + recorded_by + void |
| Shame | No public overdue names on Board |
| Scope creep to Stripe | Tracker ships first |

---

## 14. One-line product truth

**Hall Dues is the spreadsheet replacement: who paid, who hasn’t, Mark Paid in seconds — nothing that feels like accounting software.**

---

## 15. Approval checklist

- [ ] Rename to Hall Dues approved  
- [ ] Home = counts + roster (no revenue KPIs) approved  
- [ ] Mark Paid one-tap defaults approved  
- [ ] Collector/receipt demoted approved  
- [ ] Due Soon merged into Due approved  
- [ ] Credits/partials out of v2 approved  
- [ ] My Dues minimal approved  
- [ ] Explicit go-ahead to implement  

---

*— End of Hall Dues v2 —*
