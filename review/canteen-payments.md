# Hall Canteen Accounting — Product Design

**Status:** Design only — do not implement until approved  
**Date:** 2026-07-17  
**Depends on:** `review/hall-operations-design.md` (Dues station)  
**Builds on:** Hall Pro `canteen_payment_tracker` (`hall_canteen_dues_members`, `hall_canteen_dues_history` — monthly / semi-annual / annual today)

> **v2 rethink (prefer):** Spreadsheet killer, not accounting — **Hall Dues**, Mark Paid in seconds, counts not revenue KPIs — see [`review/hall-dues-v2.md`](./hall-dues-v2.md). Reconcile before implementing collector/receipt/credits/revenue dashboard from this v1 doc.

---

## 1. Purpose

Replace the canteen dues spreadsheet, whiteboard tally, and “who hasn’t paid?” hallway interrogation.

**Canteen Accounting** tracks what each firefighter owes the hall for canteen / dues — who paid, how, when, who’s late — without turning Firehall Meals into QuickBooks.

**v1 stance:** **Tracker + ledger** (record cash / e-Transfer honesty).  
**Future:** Stripe / Square / Interac collection + automatic reminders.

**Voice:** dues, paid, owes, exempt, on leave — not AR aging, invoices, or Chart of Accounts.

---

## 2. Design principles

1. **Spreadsheet killer, not bank** — captains mark paid in two taps.  
2. **Per-member schedule** — not everyone pays monthly the same way.  
3. **Status at a glance** — Paid / Due Soon / Overdue dominate the UI.  
4. **Audit trail** — who collected, receipt #, method, notes.  
5. **Hall Pro feature** — already gated as `canteen_payment_tracker`.  
6. **Privacy** — private hall data; never SEO-indexed.  
7. **Money movement later** — don’t block tracker on Stripe.  
8. **Fits Hall Ops** — Dues surface under More; summary on Hall Home + Whiteboard pulse.

---

## 3. What exists today (honest baseline)

| Built | Gap vs this design |
|-------|--------------------|
| Enroll hall members | Need richer status (Exempt, Leave, Retired, New) |
| Frequency: monthly, semi_annual, annual | Add weekly, biweekly, quarterly |
| Mark as paid → advance next due | Need amount, balance, method, collector, receipt |
| History of paid_at | Need full payment ledger fields |
| Simple filters | Need dashboard KPIs |
| Hall Pro gate | Keep |

**Evolution:** Expand enrollment + history tables into a full **dues ledger**; keep “Mark Paid” as the hero action.

---

## 4. Product surfaces

| Surface | Path (proposed) | Job |
|---------|-----------------|-----|
| **Dues home** | `/hall/dues` | Roster + statuses + mark paid |
| **Member dues detail** | `/hall/dues/:userId` | Balance, schedule, history |
| **Record payment** | Sheet / modal | Amount, method, collector, receipt, notes |
| **Hall settings → Dues** | `/hall/settings#dues` | Default amount, due day, grace, currencies |
| **Hall Home pulse** | `/hall` | Outstanding · Overdue count |
| **Whiteboard chip** | Board | “3 overdue · dues Friday” (optional pin) |
| **Canteen page section** | Existing | Teaser → full Dues (avoid two sources of truth long-term) |

**Recommendation:** Canteen page keeps a **summary card** only; full accounting lives at `/hall/dues`.

---

## 5. Payment frequencies

| Frequency | Code | Typical use |
|-----------|------|-------------|
| Weekly | `weekly` | Rare; small halls / coffee kitty |
| Biweekly | `biweekly` | Aligns with some pay cycles |
| Monthly | `monthly` | Default — most halls |
| Quarterly | `quarterly` | Light canteen |
| Semi-Annual | `semi_annual` | Existing |
| Annual | `annual` | Existing — prepaid year |

**Hall default frequency** in settings; override per member.

**Next due calculation:** From `next_due_date` + frequency after each paid period (or from enrollment anchor date). Support “paid through” date for clarity.

---

## 6. Member dues profile

Each enrolled member has:

| Field | Description |
|-------|-------------|
| **payment_frequency** | One of §5 |
| **amount** | Expected amount per period (hall currency) |
| **balance** | Amount currently owed (can be 0, positive, or credit negative) |
| **payment_history** | Ledger of payment events |
| **next_due** | Next period due date |
| **status** | Derived + manual override statuses (§7) |
| **anchor_date** | When their cycle started |
| **grace_days** | Override hall default (optional) |
| **notes** | “Pays annual every January,” etc. |
| **enrolled_at / enrolled_by** | Existing |
| **exempt_reason** | If Exempt |
| **leave_until** | If Leave |

### Balance rules (v1)

```
On period open (crossing next_due without payment):
  balance += amount
  recompute status

On Record Payment (amount_paid):
  balance -= amount_paid
  if balance <= 0 and period covered → advance next_due, status Paid
  store ledger row
```

**Partial payments:** Allowed — reduce balance; status stays Due Soon/Overdue until balance ≤ 0 for current period.

**Credits:** Overpay → negative balance (credit) applied to next period.

---

## 7. Statuses

| Status | Code | Meaning | How set |
|--------|------|---------|---------|
| **Paid** | `paid` | Current; nothing owed for open period | Auto when balance ≤ 0 and before due / within grace |
| **Due Soon** | `due_soon` | Approaching due (e.g. within 7 days) | Auto from next_due + grace config |
| **Overdue** | `overdue` | Past due + grace; balance &gt; 0 | Auto |
| **Exempt** | `exempt` | Does not pay (probationary deal, guest, etc.) | Manual (manager) |
| **New Member** | `new_member` | Enrolled; first period not started or welcome grace | Auto for N days / until first due |
| **Retired** | `retired` | Left hall / retired; no longer billed | Manual; stop accruing |
| **Leave** | `leave` | Temporary pause (injury, LOA, secondment) | Manual + optional `leave_until` |

**Display priority on roster:** Overdue → Due Soon → New Member → Paid → Leave → Exempt → Retired (Retired collapsed by default).

**Mutually exclusive billing states:** Exempt / Retired / Leave do **not** auto-accrue. Paid / Due Soon / Overdue / New Member are billing-active.

---

## 8. Payment methods

| Method | Code | Notes |
|--------|------|-------|
| Cash | `cash` | Default hallway |
| e-Transfer | `etransfer` | Interac e-Transfer (manual confirm) |
| Bank | `bank` | Direct deposit / bank transfer |
| Other | `other` | Cheque, pay-in-kind — require note |

Future methods (roadmap): `stripe`, `square`, `interac_auto` — same ledger, different `source`.

---

## 9. Recording a payment

### 9.1 Required / optional fields

| Field | Required | Notes |
|-------|----------|-------|
| Member | ✓ | |
| Amount | ✓ | Defaults to balance or scheduled amount |
| Method | ✓ | cash / etransfer / bank / other |
| Paid at | ✓ | Default now |
| **Collected by** | ✓ | Who took the money (manager / captain / designated) |
| **Receipt number** | | Optional string (“#142”, Interac ref) |
| **Notes** | | “Paid for March–April” |
| Period covered | | Auto from next_due; allow multi-period |

### 9.2 UX (phone)

1. Roster → member → **Mark Paid**  
2. Confirm amount (editable)  
3. Method chips  
4. Collector defaults to current user  
5. Optional receipt + note (collapsed)  
6. Save → toast → roster updates  

**Bulk:** “Mark selected paid” for cash night — same method/collector, individual ledger rows.

### 9.3 Edits / voids

- Managers can **void** a payment (ledger reversal + note) — never silent delete.  
- Correct amount via void + re-enter (keeps audit clean).

---

## 10. Hall dashboard KPIs

Shown on **Dues home header** and summarized on **Hall Ops Home**.

| KPI | Definition |
|-----|------------|
| **Total Collected** | Sum of payment amounts in selected period (MTD / YTD toggle) |
| **Outstanding** | Sum of positive balances for billing-active members |
| **Members Overdue** | Count with status `overdue` |
| **Revenue This Year** | Sum of payments with `paid_at` in calendar YTD |

Optional secondary (don’t clutter v1 home):

- Collected This Month  
- Exempt / Leave headcount  
- Average days overdue  

**No charts required in v1** — big numbers + overdue list. Charts are enterprise smell.

### Hall Home pulse examples

- `Dues: $240 outstanding · 3 overdue`  
- `Dues: all clear` (hide or quiet)

---

## 11. Permissions

| Action | Member | Canteen mgr | Captain |
|--------|:------:|:-------------:|:-------:|
| View own balance / history | ✓ | ✓ | ✓ |
| View full roster & KPIs | | ✓ | ✓ |
| Record / void payment | | ✓ | ✓ |
| Edit member amount / frequency | | ✓ | ✓ |
| Set Exempt / Leave / Retired | | ✓ | ✓ |
| Enroll / unenroll | | ✓ | ✓ |
| Edit hall dues settings | | | ✓ |
| Export CSV | | ✓ | ✓ |

**Members** see a simple **My Dues** card (amount, next due, status, history) — reduces “did I pay?” pings without exposing others’ balances.

---

## 12. Hall settings (dues)

| Setting | Default suggestion |
|---------|-------------------|
| Default frequency | `monthly` |
| Default amount | Hall-set (e.g. $20) |
| Currency | CAD / USD (hall locale) |
| Due day | Day of month / day of week for weekly |
| Grace days | 3–7 |
| Due Soon window | 7 days before due |
| New member grace | 14 days |
| Auto-accrue | On (period tick job) |
| Member visibility | Own dues only vs roster (managers always roster) |
| Reminder opt-in (future) | Off until Phase 2 |

---

## 13. Notifications (tracker era → future)

### Phase A (manual tracker)

| Event | Audience | Channel |
|-------|----------|---------|
| Marked overdue (nightly job) | Managers | In-app alert |
| Member marked paid | Member (optional) | In-app |
| Whiteboard / Home pulse | All | Passive glance |

### Phase B (automatic reminders — roadmap)

| Event | Audience |
|-------|----------|
| Due Soon (−7 / −3 / −1 days) | Member |
| Overdue (+1 / +7) | Member + managers digest |
| Monthly manager digest | Managers |

Respect quiet hours. Never SMS by default.

---

## 14. Data model (target)

Evolve existing tables; don’t strand history.

### 14.1 `hall_canteen_dues_members` → expand

Add / migrate columns:

- `amount` REAL NOT NULL DEFAULT 0  
- `balance` REAL NOT NULL DEFAULT 0  
- `status` TEXT (or derive in app + cache)  
- `status_override` TEXT NULL (exempt/leave/retired/new handling)  
- `anchor_date`, `grace_days`, `leave_until`, `exempt_reason`, `notes`  
- Expand `frequency` CHECK to include `weekly`, `biweekly`, `quarterly`

### 14.2 `hall_canteen_dues_history` → payment ledger

Rename conceptually to **payment events** (keep table name or migrate to `hall_canteen_dues_payments`):

| Column | Purpose |
|--------|---------|
| `payment_id` | PK |
| `hall_id`, `user_id` | Scope |
| `amount` | Money received |
| `method` | cash / etransfer / bank / other / future processors |
| `collected_by_user_id` | Who collected |
| `receipt_number` | Optional |
| `notes` | Optional |
| `paid_at` | When |
| `due_date_at_payment` | Period marker (existing) |
| `frequency` | Snapshot |
| `balance_after` | Snapshot |
| `voided_at` / `voided_by` / `void_reason` | Soft void |

### 14.3 Optional `hall_canteen_dues_settings`

One row per hall — defaults in §12.

### 14.4 Jobs

- Daily: recompute statuses; accrue balances when past due without payment  
- Idempotent; hall-scoped  

---

## 15. Integration map

| System | Integration |
|--------|-------------|
| **Hall Ops Home** | KPI strip + overdue count |
| **Whiteboard** | Optional dues chip / pinned Reminder |
| **Canteen** | Summary card → `/hall/dues` |
| **Cabinet / Inventory sales** | Optional “apply to dues” credit (Phase 2) |
| **Alerts** | Overdue / due soon |
| **Hall Pro** | Feature `canteen_payment_tracker` |
| **Merchandise sale** | Link payment note “shirt + dues” (manual) |

**Not integrated:** Personal Firefighter Plus billing — different money.

---

## 16. Free vs Hall Pro

| Capability | Free | Hall Pro |
|------------|------|----------|
| Full dues accounting | — | ✓ |
| Teaser on Canteen | “Track dues with Hall Pro” | — |
| CSV export | — | ✓ |
| Member “My Dues” | With Pro hall | ✓ |
| Future Stripe collection | — | Pro add-on TBD |

---

## 17. Future roadmap — processors & automation

### Phase PAY-1 — Complete tracker (this design)

Frequencies, statuses, amounts, balance, methods, collector, receipt, KPIs, voids, My Dues.

### Phase PAY-2 — Automatic reminders

Email / push Due Soon & Overdue; manager digest; prefs.

### Phase PAY-3 — Interac assist (still manual confirm)

- Show hall e-Transfer email/phone on My Dues  
- Member taps “I’ve sent e-Transfer” → pending  
- Manager confirms → Record Payment (`etransfer`)  

### Phase PAY-4 — Stripe / Square

- Collect card / tap to pay  
- Webhooks → ledger `method=stripe|square`  
- Payout to hall-connected account (platform policy TBD)  
- Requires `payments_enabled` + legal/compliance  

### Phase PAY-5 — Auto Interac / PAD (region-specific)

Higher compliance bar; Canada-first if ever.

**Rule:** Processor payments write the **same ledger**. UI “Mark Paid” remains for cash forever.

---

## 18. UX copy examples

| Instead of | Use |
|------------|-----|
| Accounts receivable aging | Who’s overdue |
| Remit payment | Mark paid |
| Issue credit memo | Apply credit / overpay |
| Customer statement | Payment history |
| Invoiced | Due |

Empty: “Enroll the crew and set a monthly amount — ditch the spreadsheet.”

---

## 19. Edge cases

| Case | Rule |
|------|------|
| Mid-cycle amount change | Apply next period; optional note |
| Frequency change | Set new next_due explicitly |
| Member leaves mid-period | Status Retired; stop accrual; keep history |
| Rejoin | New enrollment or reactivate; don’t erase history |
| Currency mismatch | One currency per hall |
| Two managers collect same cash | Receipt # + void discipline |
| Timezone | Hall-local date for due boundaries |
| Exempt with balance | Clear or write-off with note before Exempt |

---

## 20. Analytics

| Event | Why |
|-------|-----|
| `dues_payment_recorded` | Core usage |
| `dues_mark_overdue_transition` | Health |
| `dues_roster_view` | Manager habit |
| `dues_member_self_view` | Reduces pings |
| `dues_export` | Power users |

KPI goal: **Members Overdue → down** over first 90 days after adoption.

---

## 21. Implementation roadmap

### CA-0 — Design lock

- [ ] Frequencies + statuses approved  
- [ ] Partial pay / credit rules approved  
- [ ] Collector + receipt required/optional approved  

### CA-1 — Schema expansion

- Amount, balance, methods, ledger fields, new frequencies  
- Settings row  
- Migrate existing monthly/semi/annual enrollments  

### CA-2 — Dues home + Mark Paid v2

- Roster by status  
- Record payment sheet  
- KPIs header  
- My Dues for members  

### CA-3 — Accrual job + status engine

- Due Soon / Overdue automation  
- New Member / Leave / Exempt / Retired controls  

### CA-4 — Hall Home + Whiteboard + Alerts

- Pulse chips  
- In-app overdue alerts  

### CA-5 — Export + bulk mark paid  

### CA-6 — Reminders (PAY-2)  

### CA-7+ — Interac assist → Stripe/Square  

---

## 22. Success metrics

| Metric | Direction |
|--------|-----------|
| Halls with ≥50% members enrolled | ↑ |
| Payments recorded / month | ↑ |
| Overdue count after 2 cycles | ↓ |
| Time to mark cash night (bulk) | ↓ |
| Spreadsheet mentions in feedback | ↓ |

---

## 23. Risks & anti-goals

| Risk | Mitigation |
|------|------------|
| Feels like accounting software | Big Mark Paid; hide ledger detail |
| Shame board | Soft overdue styling; no public hall shaming on Whiteboard without captain intent |
| Fighting over who paid cash | Collector + receipt + void audit |
| Stripe before trust | Tracker first |
| Mixing Hall Pro SaaS billing with dues | Separate systems forever |

**Anti-goals:** Full bookkeeping, tax filing, payroll, multi-entity GL, invoice PDF spam in v1.

---

## 24. One-line pitch

**Canteen Accounting is the dues spreadsheet that lives in the hall — every member’s schedule and balance, every cash or e-Transfer night logged, overdue clear on the home screen — with real processors when the hall is ready.**

---

## 25. Approval checklist

- [ ] Frequency set approved (weekly → annual)  
- [ ] Status set approved (Paid → Leave)  
- [ ] Method set + collector/receipt approved  
- [ ] KPI set approved  
- [ ] Balance / partial pay rules approved  
- [ ] My Dues for members approved  
- [ ] Roadmap CA-1 → CA-5 before processors approved  
- [ ] Explicit go-ahead to implement (design-only until then)

---

*— End of Hall Canteen Accounting design —*
