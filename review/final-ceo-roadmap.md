# Final CEO Roadmap — Firehall Meals

**Date:** June 22, 2026  
**Author lens:** CEO · impact over engineering  
**Sources:** Full `/review` corpus — 111 markdown audits, 85+ JSON QA artifacts, 15 strategic synthesis docs from June 2026  
**North Star:** Halls using Firehall Meals **every shift night for 4 consecutive weeks**

---

## CEO letter (60 seconds)

Firehall Meals is a **real product** trapped inside a **content company**.

You have what most startups never build: 300+ audited recipes, crew scaling, Hall Vote, cook mode, hall membership, canteen, shopping lists, and SEO that works (392 indexed URLs). A firefighter **can** decide dinner faster than Facebook tonight.

What you do **not** have: proof that **any hall** came back week 2, week 3, week 4. No Stripe. No named departments on the homepage. No captain who says “we use this every shift.”

**The company does not have a recipe problem. It has a ritual problem.**

The next 90 days are not about catalog QA, new npm scripts, or Lighthouse scores. They are about **installing the product on physical fridges** and charging **one hall** enough that ten more want in.

---

## 1. Final product score

### **72 / 100**

| Lens | Score | CEO weight | Weighted |
|------|------:|----------:|---------:|
| **Decide dinner** (generator, wheel, vote) | 85 | 25% | 21.3 |
| **Cook dinner** (recipes, cook mode, scaling) | 78 | 20% | 15.6 |
| **Remember history** (saves, hall log) | 62 | 15% | 9.3 |
| **Manage necessities** (canteen, list, supplies) | 70 | 15% | 10.5 |
| **Hall ritual & retention** (4-week habit) | **45** | 15% | 6.8 |
| **Business** (distribution, revenue, trust) | **42** | 10% | 4.2 |
| **Total** | — | 100% | **67.7 → 72** |

**Rounding up +3** for deploy readiness (build passes, indexing PASS, PWA shell) and content moat — then **discounting** because unproven retention caps any score above 75.

### Score meaning

| Range | Meaning |
|-------|---------|
| 90+ | Mandated tool in halls; revenue follows |
| 80–89 | Strong product; distribution lagging |
| **70–79** | **← You are here.** Great demo, unproven business |
| 60–69 | Content site with features |
| &lt;60 | Idea stage |

### Prior audit scores (reconciled)

| Doc | Score | Note |
|-----|------:|------|
| `product-audit-v3.md` | 74 | Best product UX lens |
| `firehall-meals-90-roadmap.md` | 68 | Business-weighted |
| `strategic-audit.md` | 62 | Pre-hall-shipping; still directionally right |

**CEO final: 72** — product quality exceeds business proof by ~15 points. **Close that gap or stay a media brand.**

---

## 2. Top 10 issues (blocking the company)

Ranked by **adoption and revenue**, not code quality.

| # | Issue | Who hurts | CEO severity |
|---|-------|-----------|--------------|
| **1** | **No proven 4-week hall habit** | Whole company | Existential — no PMF signal |
| **2** | **Join → settings, not `/hall`** | Every new member | Hall dies on first visit |
| **3** | **Seven ways to browse; four ways to decide** | First-time visitor | Paralysis; feels like a website |
| **4** | **Cook Mode hidden below fold** | Hall cook at stove | Trust lost at the moment of truth |
| **5** | **Hall Vote buried** (not in nav) | Captain, viral loop | Best feature is a secret |
| **6** | **Shopping list in settings hash** | Canteen manager | Ops feature unusable |
| **7** | **Zero payment path** | Business | Cannot learn willingness-to-pay |
| **8** | **Anonymous social proof** | Every buyer | Fire service buys people, not polish |
| **9** | **“AI generator” / Hall Pro ghost features** | Senior FF, captain | Trust break; false advertising |
| **10** | **Building for SEO, not halls** | Team focus | 80+ catalog audits; 0 hall case studies |

---

## 3. Top 10 opportunities (highest impact)

| # | Opportunity | Why now | Upside |
|---|-------------|---------|--------|
| **1** | **Hall Vote as front door** | Solves “what’s for dinner?” socially; shareable | Viral hall creation |
| **2** | **QR on fridge → vote tonight** | Zero CAC; matches firehall culture | 10 pilots in 30 days |
| **3** | **Free vote + free canteen; charge for list + log + report** | Clear Pro wedge (`hall-pro-audit.md`) | First $149 checks |
| **4** | **Cook Mode sticky bar (mobile)** | Stove = retention | “This app gets shift night” |
| **5** | **5 real hall testimonials** | Unlocks trust overnight | Conversion on homepage + pricing |
| **6** | **Navigation v3** (Discover · Tonight · Hall · Me) | Ends website feel | −50% confusion |
| **7** | **Facebook group playbook** | Firefighters live there | Distribution without ads |
| **8** | **Stripe Hall Pro @ $149/yr** | 14-day trial after week-1 activity | Revenue learning |
| **9** | **Internal hall event logging** (cook, vote, shopping, staples) | Growth dashboard + experiments | Data without social UI |
| **10** | **Physical Hall Meal Cards ($25)** | L&S Co. bridge; gift culture | Cash + app installs |

---

## 4. Exact next 30 days

**Theme:** *Install ritual in 10 real halls. Do not ship new catalog.*

### Week 1 — Fix the front door (product + perf)

| Day | Ship | Owner focus |
|-----|------|-------------|
| Mon–Tue | Join → **`/hall`** + toast welcome (`product-audit` P0-2) | Adoption |
| Wed | **44px touch floor** + Generator FAB collision fix (`mobile-safari` P0-2, P0-4) | Safari |
| Thu | **Lazy Generator** + catalog server cache (`performance-priorities` P0-01, P0-02) | First impression |
| Fri | **Single hall create flow** — deprecate triple captain path (`product-audit` P0-1) | Captain clarity |

**Outreach (parallel, non-negotiable):** CEO/founder calls **10 hall cooks** personally. Script: *“I'll run your vote link tonight — 60 seconds.”*

### Week 2 — Stove + vote

| Ship | Metric |
|------|--------|
| **Sticky mobile cook bar** on all `/recipes/:slug` | Recipe → Cook = 1 tap |
| **Vote in header** or Tonight hub (`product-audit` P1-1) | Vote starts from nav |
| **Rebrand copy:** Hall Matcher, not AI (`product-audit` P0-9) | Trust |
| **Homepage mobile diet:** hero + Generate + Vote + one rail | First impression |
| **North Star dashboard** v0 in admin: halls created, week-1 active | Stop flying blind |

**Outreach:** 5 halls run **vote → recipe → cook** same night. Screenshot results.

### Week 3 — Hall ops path

| Ship | Metric |
|------|--------|
| **`/hall/shopping-list`** route (`product-audit` P0-4) | List findable |
| **Canteen tile** on hall quick actions (`product-audit` P1-4) | Manager workflow |
| **Hall dashboard reorder:** actions before activity teasers | Hall mobile grade B→A- |
| **Explore: food before filters** (6 cards above fold) | Browse abandonment ↓ |
| **Invite skip** on onboarding (`product-audit` P1-2) | Join completion ↑ |

**Outreach:** 3 canteen managers walk through list + canteen. Record friction.

### Week 4 — Money + proof

| Ship | Metric |
|------|--------|
| **Stripe Hall Pro** — $149/yr, 14-day trial (`product-audit` P0-6) | First payment |
| **5 hall testimonials** on homepage (photo + station name) (`product-audit` P1-10) | Trust |
| **QR hall kit PDF** (vote + join) for pilots | Physical install |
| **Remove ghost Pro features** from plans UI (`stop-building`) | Honesty |
| **Dead code PR1** (~4k lines orphans) (`dead-code-audit`) | Team velocity |

### 30-day exit criteria

| Metric | Target |
|--------|--------|
| Halls created (real, ≥3 members) | **10** |
| Halls with vote **or** cook in week 1 | **8** |
| Halls week-2 return (any activity) | **5** |
| Paying or trialing Hall Pro | **3** |
| Named testimonials live | **5** |
| New recipes / catalog silos shipped | **0** |

---

## 5. Exact next 90 days

### Days 31–60 — Retention + IA

| Priority | Deliverable |
|----------|-------------|
| 1 | **Navigation v3 Phase 1:** bottom tabs (Discover · Tonight · Hall · Me) |
| 2 | **Vote → hall list:** winner ingredients one-tap to shared list |
| 3 | **Shift reminder email** v1 (day-before shift) |
| 4 | **PWA install prompt** after first vote or cook |
| 5 | **Hall Matcher wheel:** expand to 24–30 meals; hall favorites bias |
| 6 | **True crew meal log** on server (Pro honesty for `hall_history`) |
| 7 | **Facebook group playbook:** 20 groups, weekly template |

**Exit criteria:** **25 halls** created · **10** at 4-week North Star · **15** Pro trials · **8** paid

### Days 61–90 — Scale + revenue

| Priority | Deliverable |
|----------|-------------|
| 1 | **Hall Pro enforcement** server-side (list, log, report) |
| 2 | **Captain monthly report** email (meals, votes, top meal) — Pro deliverable |
| 3 | **Protein deals demo** on dashboard (meal-first cards; Pro = full match) |
| 4 | **Explore → `/discover` migration** (301s) |
| 5 | **Ambassador kit:** captain one-pager + hall cook cheat sheet |
| 6 | **First sponsorship outreach** (1 grill/grocery brand, local) |
| 7 | **Physical meal cards** pilot via Lights & Sirens (50-card deck) |
| 8 | **Consolidate recipe routes** — kill `/explore/recipe/:id` stack |

**Exit criteria:** **50 halls** · **20** 4-week retained · **$3k+ ARR** run rate · **1** sponsorship conversation advanced

---

## 6. Features to build

Only items that move **decide · cook · remember · necessities · ritual · revenue**.

### Must build (30 days)

| Feature | Pillar | Doc |
|---------|--------|-----|
| Join → `/hall` + welcome checklist | Ritual | `product-audit-v3` P0-2 |
| Sticky mobile cook bar | Cook | `mobile-safari-audit-v3` P0-1 |
| `/hall/shopping-list` route | Necessities | `product-audit-v3` P0-4 |
| Vote in primary nav / Tonight hub | Decide | `navigation-v3` |
| Stripe Hall Pro checkout | Revenue | `hall-pro-audit` |
| North Star admin dashboard | Focus | `firehall-meals-90-roadmap` |
| Real hall testimonials block | Trust | `product-audit-v3` P1-10 |
| QR hall kit (PDF) | Distribution | `firehall-meals-90-roadmap` |

### Should build (31–90 days)

| Feature | Pillar |
|---------|--------|
| Bottom tab bar (Discover · Tonight · Hall · Me) | Decide + ritual |
| Vote winner → hall shopping list | Decide → necessities |
| True server-backed hall meal log | Remember (Pro) |
| Captain monthly report (email/PDF) | Pro + necessities |
| Shift reminder email | Retention |
| Wheel expansion + hall favorites | Decide |
| Server-side Hall Pro gates (list, log, report) | Revenue honesty |
| Protein deals dashboard cards (demo mode) | Necessities teaser |

### Build only if a paying pilot asks

| Feature | Condition |
|---------|-----------|
| Live protein retailer API | Canteen manager paying + postal code density |
| Grocery export formats | Pro customer request |
| Shift report PDF | Replace ghost `shift_reports` SKU |

---

## 7. Features to remove

| Remove | Why | Action |
|--------|-----|--------|
| **Crew Pulse** (activity feed, leaderboards, streak UI, digest emails) | Social layer hurts shift-night focus | **Removed** — internal event logging only |
| **Ghost Pro SKUs** (`meal_calendar`, `hall_badges`, `shift_reports`, `family_profiles`) | False advertising | Strip from `HALL_PRO_FEATURES` + `/plans` |
| **Paid Personal tier positioning** | No WTP; confuses buyer | Rename to free “Firefighter account” |
| **Top-level Pizza / Guides nav** | SEO ≠ app IA | Footer + collections only |
| **`/hall-program` orphan** | Duplicate captain path | Merge into join flow |
| **8 duplicate SEO landing variants** | Cannibalization | Consolidate to 2–3 canonical |
| **Dead pages** (4) + **Replit integrations** | Maintenance tax | Delete (`dead-code-audit`) |
| **Old explore rail components** (~1.1k LOC) | Superseded | Delete |
| **“Shared favorites/history” marketing** until server-crew-backed | Honesty gap | Copy fix |
| **AI / magic generator copy** | Trust | Hall Matcher language |
| **New catalog silos** (breakfast/smoothies as products) | Focus | Collections under Discover |

---

## 8. Features to postpone

**Until 100 active halls** (≥3 members, ≥1 activity/week):

| Postpone | Why |
|----------|-----|
| Inter-hall / regional leaderboards | Empty network |
| Hall badges / achievement gamification | No retention proof |
| Weekly hall digest email | Crew Pulse killed — no social feed to summarize |
| Navigation v3 desktop sidebar parity | Mobile first |
| IndexedDB / analytics worker / image CDN | Scale problems you don't have |
| Virtualized Explore grid | 337 rows OK |
| Department / enterprise sales | 6–18 month cycle |
| Voice cook mode | Cook bar first |
| Instacart / affiliate grocery | Distraction |
| More guides / SEO pages | Freeze at 58 |
| New npm audit scripts | **Freeze** at current set |
| Admin growth dashboard depth beyond North Star | Internal luxury |
| Live protein deals retailer integration | Demo sufficient |
| AI custom recipe generation | Curated matcher wins trust |
| Personal tier as paid SKU | Never (unless calendar proves value) |

---

## 9. Fastest path to first 100 halls

**Definition:** Hall with ≥3 members, ≥1 hall-visible activity per week (vote, cook, generate, wheel).

### The loop (repeat 100 times)

```
Physical QR on fridge
    → Hall Vote tonight (free)
        → "Save this hall" (join)
            → /hall dashboard
                → Cook winner
                    → Shared list
                        → PWA install
                            → Week 2: shift email
                                → Week 4: Pro trial
```

### Channel mix (CEO time allocation)

| Channel | % effort | Why |
|---------|----------|-----|
| **Warm intros** (your network, adjacent halls) | 40% | Fastest trust |
| **Facebook firefighter groups** (value posts, not ads) | 25% | Where they already are |
| **SEO → vote CTA** (top 10 guides + homepage) | 15% | Existing traffic |
| **QR kit at FDIC / regional musters** | 10% | Density events |
| **Lights & Sirens customers** | 10% | Brand bridge |

### Math to 100 halls

| Phase | Timeline | Cumulative halls | Tactic |
|-------|----------|------------------|--------|
| Pilot | Days 1–30 | **10** | Founder-led, hand-hold every vote night |
| Prove | Days 31–60 | **35** | 3 champions refer 2 halls each + FB groups |
| Repeat | Days 61–90 | **60** | QR kit + testimonial page + captain one-pager |
| Scale | Days 91–180 | **100** | 40 more via SEO vote links + regional ambassadors |

### Rules (non-negotiable)

1. **No hall created without a vote scheduled within 48 hours.**  
2. **Captain must see `/hall`, not settings.**  
3. **Do not count halls with 1 member.**  
4. **Weekly CEO review:** North Star cohort only — ignore pageviews.  
5. **One vertical (career/volunteer mix in one region) before national spray.**

### What NOT to do on the path to 100

- Buy ads before 10 halls retain at 4 weeks  
- Build department sales deck  
- Add recipes to impress chiefs  
- Perfect internal QA reports  

---

## 10. Fastest path to first $10,000 ARR

### Pricing assumption (CEO decision)

| SKU | Price | Buyer |
|-----|-------|-------|
| **Hall Pro** | **$149/year** per hall | Canteen manager / captain |
| **Volunteer hall** | **$99/year** | Price-sensitive stations |
| **Physical meal cards** | **$24.99** one-time | Supplement, not core |

### ARR math

| Mix | Calculation | ARR |
|-----|-------------|-----|
| **Subscriptions only** | 67 halls × $149/yr | **~$10,000** |
| **Blended** | 50 halls × $149 + 100 card decks × $25 | **~$9,950** |
| **Faster blend** | 40 halls × $149 + 1 local sponsor × $3,600/yr | **~$9,560** |

**Fastest realistic path:** **~55–70 paying halls at $149/yr** — not 100 halls (many stay free).

### Revenue timeline

| Month | Halls (active) | Paying | ARR run rate | CEO action |
|-------|----------------|--------|--------------|------------|
| 1 | 10 | 0 | $0 | Prove ritual; no selling |
| 2 | 25 | 5 | $745 | Trials after week-1 activity |
| 3 | 50 | 20 | $2,980 | Testimonials + Stripe live |
| 4 | 75 | 35 | $5,215 | FB playbook scaling |
| 5 | 100 | 50 | $7,450 | Ambassador referrals |
| 6 | 120 | **67** | **$9,983** | Optional: 40 card decks ≈ $11k total |

### Conversion assumptions (conservative)

- **50%** of 4-week retained halls start Pro trial  
- **60%** of trials convert to paid at $149  
- From **100 active halls** → **30 trials** → **18 paid** = $2,682 ARR  

**Therefore:** You need **either** more halls **or** higher conversion **or** hybrid revenue.

**CEO playbook for $10k ARR in 6 months:**

1. **Months 1–2:** Ritual only — no discounting, no feature selling  
2. **Month 3:** Stripe live; trial triggers after **2nd vote or 2nd cook** in hall  
3. **Month 4:** Outcome pricing page: *“One list. One log. One report. $149/yr.”*  
4. **Month 5:** Launch **meal cards** at musters (cash + QR)  
5. **Month 6:** One **local sponsorship** ($200–400/mo) for “Station BBQ Week”  

### What makes money vs what doesn't

| Makes money | Doesn't (yet) |
|-------------|----------------|
| Canteen manager slush fund | Individual firefighter subscription |
| Captain morale budget | Department procurement |
| Physical pride products | More free recipes |
| Proof hall used 18 shifts/month | Analytics dashboards |

---

## CEO decision log (this week)

| Decision | Call |
|----------|------|
| Primary product identity | **Hall ops app**, not recipe media site |
| Free forever | Generator, wheel, vote, browse, canteen view |
| Paid SKU | **Hall Pro per hall** — list, log, report |
| Personal tier | **Free account** — stop pretending it's paid |
| Content | **Freeze** at ~327 recipes |
| Engineering | **Sprint A** from `performance-priorities-v2` only |
| Success metric | **4-week hall retention** — nothing else in all-hands |
| Kill list | Ghost Pro features, new audit scripts, SEO expansion |

---

## Review corpus map (what we read)

| Category | Key docs | CEO use |
|----------|----------|---------|
| **Product / UX** | `product-audit-v3.md`, `firefighter-user-journeys.md`, `mobile-safari-audit-v3.md` | P0 fixes |
| **Strategy / business** | `strategic-audit.md`, `firehall-meals-90-roadmap.md`, `hall-pro-audit.md` | Model + GTM |
| **IA** | `navigation-v3.md`, `screen-map-v3.md`, `user-flows-v3.md` | 90-day IA |
| **Focus** | `stop-building.md` | Remove / postpone |
| **Performance** | `performance-priorities-v2.md`, `performance-audit-v3.md` | Sprint A only |
| **Hall social (killed)** | `crew-pulse-kill-or-keep.md` | Do not rebuild |
| **Monetization teaser** | `protein-deals-v1.md` | Post-10 halls |
| **Engineering hygiene** | `dead-code-audit.md` | Week 4 cleanup |
| **SEO / deploy** | `indexing-audit.md`, `push-readiness-report.md` | Maintenance mode |
| **Catalog QA (80+ JSON/MD)** | `recipe-*`, `image-*`, `nutrition-*` audits | **Frozen** — no CEO attention |

---

## One page for the wall

```
NORTH STAR: 4-week hall habit

THIS MONTH:  10 halls · 5 testimonials · cook bar · join→/hall · Stripe

NOT THIS MONTH:  recipes · scripts · SEO pages · badges · AI copy

SCORE TODAY:  72/100

SCORE AT 90:  10 halls retained 4 weeks + $3k ARR
```

---

*Next CEO review: when 10 halls complete week-4 North Star OR first $1,000 collected — whichever comes first.*
