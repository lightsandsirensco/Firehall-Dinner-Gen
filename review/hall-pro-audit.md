# Hall Pro Audit — Product Strategy

**Date:** June 22, 2026  
**Role:** Product strategist  
**North Star:** *A hall uses Firehall Meals on every shift night for 4 consecutive weeks*  
**Business question:** Is Hall Pro a product firefighters and halls will pay for — and who writes the check?

**Sources:** `shared/billing/types.ts`, billing store/routes, `PaywallGate`, hall APIs, `firefighter-user-journeys.md`, `firehall-meals-90-roadmap.md`, `navigation-v3.md`

---

## Executive verdict

**Hall Pro is the right SKU. It is not yet the right product.**

The tier architecture (Guest → free account → Hall Pro per hall) is directionally correct. The **buyer** is the canteen manager or captain with a slush fund — not the department, not the line firefighter, and not a “Personal” subscription.

Today Hall Pro fails the payment test for three structural reasons:

1. **No money path** — “Coming soon” / “No charge during preview”; no Stripe, no price anchor, no receipt.
2. **Honesty gap** — Several “Hall Pro” features are **marketing flags** (meal calendar, hall badges, shift reports) or **mislabeled personal sync** (“shared” favorites/history are per-user cloud backup, not crew-shared server data).
3. **Wrong things gated** — Operational basics (canteen API is open; shopping list API is open) are UI-paywalled while **Hall Vote** (the viral loop) is free. Canteen managers hit paywalls before value; captains enable Pro in **settings**, not at the moment of need.

**Strategic recommendation:** Narrow Hall Pro to **3 paid outcomes** crews understand — **one list, one log, one report** — make adoption free, charge for persistence and ops. Kill or demote ghost features. Do not sell Personal.

| Question | Answer | Confidence |
|----------|--------|------------|
| Would a **canteen manager** pay? | **Yes — if** shared shopping + canteen + monthly proof justify the slush fund | Medium (unvalidated) |
| Would a **captain** pay? | **Sometimes —** for morale/vote ritual, not analytics | Medium-low |
| Would **firefighters chip in**? | **Rarely as subscription;** occasionally as one-time $5–10 hall kitty | Low |

---

## Current Hall Pro (as built)

### Tier model

| Plan | Price (UI) | Scope | Feature count (catalog) |
|------|------------|-------|-------------------------|
| **Guest** | Free | Device | 3 (generator, wheel, browse) |
| **Personal** | Free during preview | User account | +7 on top of guest |
| **Hall Pro** | Coming soon | **Per hall** | +9 hall-scoped features |

Hall Pro is **not** a user plan — captains with `manage_billing` enable trial/convert/enable on `/halls/:hallId`. Members inherit access when `hall_subscriptions.status` is `active` or `trialing`.

### Hall Pro feature catalog (code)

From `HALL_PRO_FEATURES` in `shared/billing/types.ts`:

| Feature key | UI label (admin panel) | Built? | Server gate? | Actually hall-shared? |
|-------------|------------------------|--------|--------------|------------------------|
| `shared_favorites` | Shared favorites | Partial | **No** | **No** — per-user cloud sync of local favorites |
| `hall_history` | Hall history | Partial | **No** | **No** — per-user cloud sync of local history |
| `hall_supplies` | Hall supplies | Yes | **No** | Yes — hall-scoped DB |
| `shared_shopping_lists` | Shared shopping lists | Yes | **No** | Yes — hall-scoped DB |
| `hall_analytics` | Hall analytics | Yes | **Yes** | Yes |
| `protein_deals` | *(not on admin panel list)* | Yes (demo mode) | **Yes** | Yes |
| `meal_calendar` | Meal calendar | **No** | **No** | N/A |
| `hall_badges` | Hall badges | **No** | **No** | N/A |
| `shift_reports` | Shift reports | **No** | **No** | N/A |

**Enforcement reality:** Only `protein_deals` and `hall_analytics` are server-enforced via `userHasFeature()`. Shopping list, supplies, and canteen APIs require **membership only** — paywall is UI-only (`PaywallGate` on hall settings page).

### Personal tier (as built)

Included with free account today (`PLAN_BASE_FEATURES.personal`):

- `cross_device_saves`, `family_profiles`, `personal_meal_history`
- `grocery_exports`, `shift_reminders`
- `hall_dashboard`, `vote_history`

**Problem:** Personal is not differentiated from Guest in practice — sign in and you get Personal for free. `/plans` lets users “select” Personal but there is no payment. **No willingness-to-pay signal.**

### Canteen vs supplies vs Pro

| Surface | Route | Hall Pro in UI? | API billing check? |
|---------|-------|-----------------|-------------------|
| Canteen page | `/hall/canteen` | No | No |
| Hall supplies panel | `/halls/:id` | Yes (`PaywallGate`) | No |
| Shared shopping | `/halls/:id#anchor` | Yes | No |
| Protein deals | `/hall/protein-deals` | Yes | Yes |

**Canteen managers** use the free canteen page daily but are told Hall Pro is required for “Hall supplies” on a settings page they never visit. **Strategy incoherence.**

---

## Buyer analysis

### Would a canteen manager pay?

**Profile:** Owns coffee, paper goods, bulk protein orders, slush fund ($200–800/mo). Counts receipts. Hates surprise outages. Grocery run is their job or they assign a runner.

**Pain they feel today (without Pro):**

- Crew texts “we’re out of coffee” at 5am  
- No single agreed dinner list before Costco  
- Captain asks “what did we spend on food this month?” — no answer  
- Duplicate shopping (shift A and B both buy onions)

**What they would pay for (ranked):**

| # | Outcome | WTP signal | In product today? |
|---|---------|------------|-------------------|
| 1 | **One shared shopping list** everyone checks off | **High** | Yes — buried, paywalled in wrong place |
| 2 | **Canteen low/out list** with manager workflow | **High** | Yes — **free API**, undermonetized |
| 3 | **“18 meals this month”** report for budget | **Medium-high** | Analytics exists — off dashboard, Pro-gated |
| 4 | Protein on sale near the hall | **Medium** | Demo deals — needs live data for trust |
| 5 | Meal calendar for ordering cycles | **Medium** | **Not built** |
| 6 | Hall badges / gamification | **Low** | **Not built** |

**Verdict: Yes, $12–19/mo or $99–149/yr** — if the first screen they see is **Shopping + Supplies + Monthly summary**, not a feature bullet list on settings.

**They will not pay** for: recipe browse, wheel, “AI”, or personal sync.

**Payment method:** Station credit card, canteen PayPal, or annual “station license” expensed once. **Not** app-store individual subscription.

---

### Would a captain pay?

**Profile:** Owns crew morale, shift discipline, hall culture. May not cook. Budget authority varies (often can approve &lt;$200 without chief).

**Pain they feel:**

- “What’s for dinner?” group chat noise  
- New probies don’t know hall traditions  
- Wants the hall to look organized to chief/members  
- Doesn’t want another admin login

**What they would pay for (ranked):**

| # | Outcome | WTP | Today |
|---|---------|-----|-------|
| 1 | **Hall Vote** working every shift | High value | **Free** (correct) |
| 2 | Crew actually using one app | Medium | Onboarding broken (join → settings) |
| 3 | Proof hall is engaged (“we voted 12 times”) | Medium | Analytics Pro-gated, hidden |
| 4 | Shared favorites / history | Low-med | Mislabeled — not truly shared |
| 5 | Hall Pro admin in settings | Low | Feels like IT |

**Verdict: Maybe — $8–15/mo** if onboarding is **60 seconds** and Pro is sold as **“keep the vote + list going”** not “enable 9 features.”

Captains **will enable trial** if prompted on `/hall` after first successful vote. They **won’t** hunt settings to convert unless crew asks for shopping list.

**They will not pay** for Personal tier or per-seat pricing.

---

### Would firefighters chip in?

**Profile:** Price-sensitive. Already pays union dues, gym, meal on shift. Subscription fatigue is real.

**Behaviors observed in fire service:**

- **Pizza fund / kitty:** $5–20 one-time for party or tool — yes  
- **Individual recipe app:** $3–5/mo — almost never  
- **“Everyone Venmo the captain $2”** for an app — social friction kills it  
- **Volunteer stations:** tighter than career

**Verdict: No for recurring Hall Pro** — unless captain mandates and expensed centrally.

**Optional:** “Hall kitty” **one-time contribution** ($25 hall unlock for 3 months) as experiment — not primary model.

**What line firefighters will use free forever:**

- Generator, wheel, recipes, cook mode  
- Hall Vote participate  
- Report canteen item  

**What they want from account (free):**

- Sync prefs across phone/tablet  
- Personal save/history  

---

## Willingness-to-pay matrix

| Segment | Monthly WTP | Annual WTP | Buyer | Decision time |
|---------|-------------|------------|-------|---------------|
| Canteen manager (career) | $15–25 | $149–199 | Self | 1–2 shift cycles |
| Captain (career) | $10–15 | $99–149 | Self / expensed | After 2nd vote |
| Volunteer hall | $5–10 | $59–79 | Captain + donation | Weeks |
| Line firefighter | $0–3 | $0 | Self | Won’t |
| Fire department | $500+ | $5k+ | Procurement | 6–18 months (not now) |

**Price anchor that passes the “pizza test”:** *Less than one shift pizza run for the whole hall for a year.*

Recommended pilot: **$149/yr Station License** (unlimited members per hall) + **14-day trial** triggered after first shared shopping list or 3rd vote.

---

## Feature-by-feature recommendation

### Free forever (growth & ritual)

These drive adoption and must not be paywalled:

| Feature | Why free |
|---------|----------|
| Generator / Hall Match | Wedge vs Google; SEO traffic |
| Classics Wheel | Emotional hook; shareable |
| Browse / read recipes | SEO; top of funnel |
| Cook Mode | Product quality; stove retention |
| **Hall Vote** (create + participate) | **Viral loop** — best growth mechanic |
| Personal shopping list (modal) | Immediate utility |
| Hall dashboard (basic) | Habit surface |
| Join hall / membership | Network effects |
| **Report canteen item** | Supply signal; hooks canteen mgr |
| Local save on device | Try before account |

### Hall Pro (paid — hall-scoped)

**Sell outcomes, not feature keys.** Recommended **Hall Pro Core** bundle:

| Keep as Pro | Rename for buyers | Rationale |
|-------------|-------------------|-----------|
| `shared_shopping_lists` | **Crew shopping list** | #1 canteen/cook pain; real server value |
| Canteen manage + history | **Supplies tracker** | Merge canteen + supplies; manager workflow |
| `hall_analytics` | **Hall report** | Budget/morale proof for captain |
| `vote_history` + meal log (hall) | **Meal log** | “What did we cook last Tuesday?” — build hall-scoped server log |
| `protein_deals` | **Protein deals** | Keep Pro when live data exists; teaser when not |

| Demote from Pro → free | Action |
|------------------------|--------|
| Basic canteen view + report | Free — drives Pro upsell at “assign runner” / export |
| Hall dashboard tiles | Free |

| Remove from Pro marketing until built | Action |
|---------------------------------------|--------|
| `meal_calendar` | Remove from catalog or ship MVP |
| `hall_badges` | Remove — gamification before retention proof |
| `shift_reports` | Remove or merge into Hall report |
| `shared_favorites` | **Rename** — not shared today; see Personal |
| `hall_history` (as Pro) | **Rename** — personal sync today; true hall log is new work |

### Personal (paid tier)

**Recommendation: Do not sell Personal as a paid SKU.**

| Today | v3 |
|-------|-----|
| “Personal” plan on `/plans` | **“Firefighter account”** (free with sign-in) |
| `cross_device_saves`, `personal_meal_history`, `shift_reminders` | Free — account benefits |
| `family_profiles` | Keep free or remove if unused |
| `grocery_exports` | Free basic; **Pro** = export to shared hall list in one tap |
| `vote_history` | Free personal; **Pro** = hall-wide vote archive |

**If ever paid ($3–5/mo):** Only with integrations that save 30+ min/week (grocery delivery export, calendar sync). Not before Hall Pro validates.

### Remove entirely

| Item | Why |
|------|-----|
| **Personal as paid tier** on `/plans` | Confuses Hall Pro buyer; no WTP |
| **Ghost Pro features** in UI (`meal_calendar`, `hall_badges`, `shift_reports`) | Trust destruction at checkout |
| **“Shared favorites” as Pro** without server-side hall favorites | False advertising |
| **Paywall on canteen view** | Blocks best payer persona |
| **Hall Pro on `/plans` card** | Manage in hall settings only (`navigation-v3`) |
| **`users.hall_pro_enabled` legacy flag** | Per-user Pro concept is dead |
| **Per-department pricing** (for now) | Enterprise is year 2+ |

---

## Recommended Hall Pro packaging (v3)

### One SKU, three sentences

**Hall Pro — Station License**  
*One grocery list. One supply board. One report for the captain.*  
$149/year per hall · 14-day trial · Unlimited crew

### Free vs Pro (user-facing)

| | Free hall | Hall Pro |
|---|-----------|----------|
| Pick dinner (generate/wheel) | ✓ | ✓ |
| Hall Vote | ✓ | ✓ |
| Report “out of coffee” | ✓ | ✓ |
| View canteen status | ✓ | ✓ |
| **Shared shopping list** | Preview (read-only last list) | Full + assign runner + complete run |
| **Manage supplies / restock** | — | ✓ |
| **Meal log (hall-wide)** | Last 7 days | Full history + export |
| **Hall report (meals/month)** | Teaser counts | Full analytics |
| **Protein deals** | Teaser | Full match + recipe tie-in |

### Trial trigger (not “Enable in settings”)

Start trial automatically when **any** of:

- Captain creates 2nd hall vote  
- First “Add to hall list” from recipe  
- Canteen manager assigned role  

End trial with **one** in-app prompt: *“Your hall used shared lists 4 times — keep it for $149/yr?”*

---

## Payment mechanics

| Decision | Recommendation |
|----------|----------------|
| **Who pays** | Captain or canteen manager (`manage_billing`) |
| **Billing unit** | Per `hall_id`, unlimited members |
| **Processor** | Stripe Checkout — annual default, monthly option |
| **Volunteer discount** | Coupon code `VOLUNTEER` → $79/yr |
| **Firefighter chip-in** | Not supported at launch; captain expense only |
| **Department PO** | Manual invoice year 2; not self-serve |
| **Physical add-on** | Hall Meal Cards $24.99 — L&S Co.; not part of Pro |

---

## GTM: who to call first

**Primary outbound persona:** Canteen manager or “hall cook who owns Costco runs”  
**Secondary:** Captain after internal champion exists  
**Do not sell:** Individual firefighters, chiefs, IT departments (yet)

**Pilot pitch (30 seconds):**  
*“Your crew already argues about dinner. Hall Vote’s free. Hall Pro is the shared grocery list and supply board so you’re not texting ‘who bought coffee’ at 5am — less than one pizza night a year.”*

**Proof required before scale:**

- 5 halls pay $149/yr without hand-holding  
- 60% trial → paid conversion  
- Canteen manager is named buyer in ≥3 of 5  

---

## Honesty & enforcement checklist (pre-Stripe)

Before charging, fix or remove:

| # | Issue | Fix |
|---|-------|-----|
| 1 | Shopping list API open | `userHasFeature(..., shared_shopping_lists, { hall_id })` on all mutations |
| 2 | Supplies API open | Same for `hall_supplies` / canteen manage |
| 3 | “Shared” favorites/history | Build server hall favorites OR move to free personal sync |
| 4 | Ghost features on plan card | Remove from `HALL_PRO_FEATURES` until shipped |
| 5 | Protein deals in demo | Label “Preview”; don’t charge until live provider |
| 6 | Paywall → `/plans` for Hall features | → `/hall/settings/billing` only |
| 7 | Canteen free vs supplies Pro | Unified **Supplies** under Hall Pro manage tier |
| 8 | Admin panel missing protein deals | Align panel list with real Pro bundle |

---

## Competitive positioning

Firefighters **won’t** pay for another recipe app. They **might** pay for:

- Less group-chat chaos  
- One list for the grocery runner  
- Canteen budget cover  

Hall Pro competes with **group chat + paper list on fridge**, not Mealime or ChatGPT.

**Moat when paid:** Hall memory (what this crew eats, who bought what, vote history) — not recipe count.

---

## Financial scenario (illustrative)

| Scenario | Halls paying | ARR | Notes |
|----------|--------------|-----|-------|
| Pilot | 10 × $149 | $1,490 | Proof only |
| Year 1 modest | 200 × $149 | $29,800 | ~2% of SEO hall traffic converts |
| Year 1 target | 500 × $149 | $74,500 | Requires QR hall kit + canteen outbound |
| Wrong path | 2,000 × $4 personal | $96,000 | Unlikely — individual WTP too low |

**Strategic focus:** 500 halls × $149 beats 5,000 personal subs at $4 — and matches buyer psychology.

---

## Decision summary

| Question | Recommendation |
|----------|----------------|
| Is Hall Pro the business? | **Yes** — only scalable B2B2C SKU |
| Should canteen manager pay? | **Target them** — highest WTP, daily pain |
| Should captain pay? | **Enable them** — trial owner, not primary marketer |
| Should firefighters chip in? | **No** — free users; captain/hall pays |
| Free forever? | Generator, wheel, browse, vote, basic canteen report, account sync |
| Hall Pro? | Shared shopping, supplies manage, hall meal log, hall report, live protein deals |
| Personal? | **Free account** — not a paid tier |
| Remove? | Ghost Pro features, paid Personal, per-user Pro, department tier (for now), paywall on canteen view |

---

## Implementation sequence

1. **Honesty pass** — align catalog with built, shared behavior  
2. **Server gates** — shopping + supplies mutations require Pro  
3. **Free canteen view** — pay only for manage + export + assign  
4. **Hall-scoped meal log** — real Pro differentiator (server)  
5. **Stripe $149/yr** — one product, trial on behavioral trigger  
6. **5-hall paid pilot** — canteen managers, not captains-only  
7. **Remove** ghost features from marketing  

---

## Related documents

| Doc | Use |
|-----|-----|
| `firefighter-user-journeys.md` | Why paywalls feel cheap today |
| `navigation-v3.md` | Hall Pro only in `/hall/settings/billing` |
| `firehall-meals-90-roadmap.md` | Pricing pilots, GTM |
| `product-audit-v3.md` | Monetization readiness 62/100 |

---

*End of Hall Pro audit.*
