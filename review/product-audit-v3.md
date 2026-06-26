# Firehall Meals — Product Audit v3

**Date:** June 22, 2026  
**Auditor lens:** Senior product designer · Startup operator · Active firefighter (shift cook)  
**Method:** Full codebase walkthrough — routes, hall flows, billing, canteen, protein deals, PWA, analytics, and live UX surfaces  
**North Star:** *A hall uses Firehall Meals on every shift night for 4 consecutive weeks*  
**Overall score:** **74 / 100**  
**Target:** **90+ / 100**

---

## Executive Summary

If I showed up at my hall tonight as the cook, Firehall Meals would **help me decide dinner** faster than scrolling Facebook — the generator, wheel, and crew-sized recipes are real. The hall layer (dashboard, vote, streaks, shift view, canteen, protein deals) is **more built than most early-stage apps** in this niche.

The gap to 90 is not more recipes or more audit scripts. It is **ritual, clarity, and trust at the stove**:

1. **One hall home** — I should land on `/hall`, not settings, after join.  
2. **One browse path** — I should not choose between Explore, Recipes, homepage rails, and categories.  
3. **Stove-first recipes** — Cook Mode exists but still feels bolted on.  
4. **Hall Pro that earns money** — Features are listed; enforcement and payment are not.  
5. **Proof from real halls** — Polished anonymous product; fire service buys people they know.

Engineering maturity (300+ recipes, hall membership, sync, billing scaffold, protein deals V1) is **ahead of distribution and monetization proof**. You are one strong onboarding pass and one paid pilot away from a step-change in score.

---

## Scorecard

Scores are **0–100** (not 0–10). Calibrated against: *Would I install this for my crew and use it again next shift?*

| Dimension | Score | One-line verdict |
|-----------|------:|------------------|
| **First impression** | **78** | Premium dark brand, clear “what’s for dinner?” — still too many doors on homepage |
| **Mobile UX** | **77** | Hall dashboard is phone-native; Explore and recipe pages lag behind |
| **Navigation** | **73** | Clean header, but hall ops live in a maze of URLs and hash anchors |
| **Trust** | **76** | Strong imagery governance and honest copy; weak human proof |
| **Hall adoption** | **72** | Onboarding funnel exists; two captain paths fight each other |
| **Retention** | **70** | Streaks, votes, sync seeds — no proven 4-week hall habit loop |
| **Hall Pro value** | **68** | Right feature bundle; leaky gates and no checkout |
| **Personal value** | **79** | Generator + wheel + cook mode adapters are the killer wedge |
| **Canteen workflows** | **71** | Real page + shift report; not wired into daily hall rhythm |
| **Growth readiness** | **70** | SEO machine is ready; hall distribution playbook is not |
| **Monetization readiness** | **62** | Tier architecture yes; revenue path no |

**Weighted overall: 74 / 100**

### Score trajectory to 90+

| Phase | Focus | Expected overall |
|-------|--------|------------------|
| **Now** | Ship as-is | 74 |
| **+ Hall ritual sprint** (onboarding, vote hero, `/hall` as home) | +6 | 80 |
| **+ Stove + ops sprint** (cook mode default, shopping list route, canteen tile) | +5 | 85 |
| **+ Trust + pay sprint** (real hall stories, Stripe Hall Pro, enforce gates) | +5 | 90 |
| **+ Distribution sprint** (QR kit, captain playbook, 10 hall pilots) | +3 | 93 |

---

## Firefighter Walkthrough (Shift Night)

*Tuesday B-shift. I’m cooking for 8. Phone in pocket, gloves soon, group chat already arguing chili vs tacos.*

| Step | What I do | What happens today | Grade |
|------|-----------|-------------------|-------|
| 1 | Open app from fridge QR (future) or Google | Homepage: hero, How It Works, **Hall Vote**, featured rails | B+ |
| 2 | Pick dinner fast | Generator or Wheel — both work | A |
| 3 | Scale for crew | Crew size on generator/recipe — works | A |
| 4 | Get crew buy-in | Hall Vote — strong, but I had to know it exists | B |
| 5 | Build shopping list | Personal list OK; **hall list buried** in `/halls/:id#anchor` | C |
| 6 | Cook at stove | Cook Mode on golden/explore recipes — **not above the fold** | B- |
| 7 | Check canteen | `/hall/canteen` or shift “Report canteen” — easy to miss on hall dash | C+ |
| 8 | Use protein deals | `/hall/protein-deals` — setup once, demo deals, Hall Pro for full match | B- |
| 9 | Come back next shift | Streaks/activity if hall joined; otherwise easy to forget | C+ |

**Verdict:** Great **personal utility**, uneven **crew operating system**.

---

# P0 — Fix before scaling (blocks 90)

---

### P0-1 · Split hall creation paths confuse captains

**Why it matters**  
A captain can create a hall three ways: activation modal (name + crew only), account `CreateHallForm` (full profile + shifts), or `/hall-program` → account. Each lands somewhere different (`/hall` vs `/halls/:id`). I don’t know if I “finished” setup. Crew gets invite links from one path but not another.

**Proposed fix**  
- Single **Create Hall** flow: name → postal code → shifts → appliances → invite crew.  
- Always land on **`/hall`** with a 3-step checklist: Invite crew · Run first vote · Enable Hall Pro trial.  
- Deprecate minimal modal create or route it into the full flow.

**Effort:** M (1–2 weeks)  
**Expected impact:** +4 Hall adoption, +3 Retention — captains complete setup once; crew sees one link pattern.

**Code touchpoints:** `hall-activation-funnel.tsx`, `create-hall-form.tsx`, `hall-join-page.tsx`, `HallActivationGate`

---

### P0-2 · Join flow dumps members on settings, not the hall home

**Why it matters**  
After `/hall/join`, I land on **`/halls/:hallId`** (admin/settings). As a line firefighter I want **tonight’s meal**, not billing panels. This kills first-shift wow.

**Proposed fix**  
- Post-join redirect → **`/hall`** with toast: “Welcome to Station 12 — start a vote or pick a meal.”  
- Settings remain at `/halls/:id` for captains only (or “Hall settings” link).

**Effort:** S (1–2 days)  
**Expected impact:** +5 Hall adoption, +3 Retention — members immediately see value.

---

### P0-3 · Hall navigation is fragmented (dashboard vs settings vs hash anchors)

**Why it matters**  
- Operational home: `/hall`  
- Admin: `/halls/:hallId`  
- Shopping list: `/halls/:hallId#hall-shared-shopping-list`  
- Protein setup: `/hall/protein-deals/setup`  
- Canteen: `/hall/canteen`  

As cook I shouldn’t need a site map. Right now I do.

**Proposed fix**  
- Add **`/hall/shopping-list`** route (wrapper around shared list).  
- Hall sub-nav (sticky on mobile): **Home · Vote · List · Canteen · Deals**  
- Rename mental model: `/hall` = **Tonight**, `/halls/:id` = **Settings**

**Effort:** M (1–2 weeks)  
**Expected impact:** +6 Navigation, +4 Canteen, +3 Hall Pro — ops features get used.

---

### P0-4 · Shopping list is buried; dashboard card lies empty

**Why it matters**  
Quick action says “Shopping list” but sends me to a **hash on a long settings page**. Shift dashboard shows live list preview; hall dashboard card does not. Grocery runner workflow is core hall ops.

**Proposed fix**  
- First-class route `/hall/shopping-list`.  
- Dashboard card shows **pending item count** (same data as shift page).  
- Vote winner → **“Add ingredients to hall list”** one-tap.

**Effort:** M (1 week)  
**Expected impact:** +5 Hall Pro value, +4 Retention — list becomes weekly ritual.

**Code touchpoints:** `hall-dashboard-v2.tsx`, `hall-meals-month-card.tsx`, `hall-shopping-list` panel, vote completion flow

---

### P0-5 · Hall Pro gates are UI-only on key features

**Why it matters**  
Catalog says Hall Pro includes supplies, shared lists, favorites, history, badges, shift reports. **`PaywallGate` only on** analytics, supplies UI, shopping list UI, protein deals. APIs for supplies/shopping list **do not check billing**. I can’t sell what leaks for free.

**Proposed fix**  
- Server-side `requireHallPro(hallId, feature)` on every Hall Pro API.  
- Client gates match server 1:1.  
- Free tier: teaser counts (“3 items on list — unlock Hall Pro for full list”).

**Effort:** M (1–2 weeks)  
**Expected impact:** +8 Monetization readiness, +5 Hall Pro value — honest upgrade path.

**Code touchpoints:** `server/billing/store.ts`, `hall-supplies/routes.ts`, `hall-shopping-list/routes.ts`, `shared/billing/types.ts`

---

### P0-6 · No payment path (monetization is pretend)

**Why it matters**  
`payments_enabled: false`. Hall Pro trial → convert flips DB only. Captains can’t learn willingness-to-pay. Investors and captains both ask “what does it cost?” — answer is “coming soon.”

**Proposed fix**  
- Stripe Checkout for **Hall Pro** ($99–149/yr pilot).  
- Convert trial → paywall step.  
- Analytics: `checkout_started`, `checkout_completed`.  
- Keep Personal free; charge per **hall**, not per firefighter.

**Effort:** L (2–3 weeks)  
**Expected impact:** +10 Monetization readiness — unlocks real business learning.

---

### P0-7 · Cook Mode is not the default recipe experience on mobile

**Why it matters**  
At the stove I need **big type, one step, greasy thumb**. Cook Mode exists (`StartCookingButton`, step view, wake lock) but recipe pages are still **long blog scrolls**. Trust is won or lost here.

**Proposed fix**  
- Mobile recipe pages: **sticky bottom bar** — Start Cooking · Shopping list · Share.  
- Optional: mobile default opens **step-first** layout.  
- Unify cook adapters on **all** catalog surfaces (pizza, performance meals if linked).

**Effort:** M (1–2 weeks)  
**Expected impact:** +5 Mobile UX, +4 Trust, +3 Retention — “this app gets shift night.”

**Code touchpoints:** `golden-recipe-page.tsx`, `explore-recipe-detail-page.tsx`, `cook-mode.tsx`

---

### P0-8 · Browse surface duplication still creates paralysis

**Why it matters**  
Homepage featured rails + `/explore` + `/recipes` + category redirects + generator browse — five ways to see the same catalog. On mobile I scroll filters before food on Explore.

**Proposed fix**  
- **Explore = canonical browse.**  
- Homepage: **one** rail (“Hall favorites” or “Tonight’s picks”).  
- `/recipes` → redirect or merge into Explore.  
- Mobile Explore: **6 cards first**, filters collapsed behind “Refine.”

**Effort:** M (1–2 weeks)  
**Expected impact:** +5 First impression, +4 Mobile UX — faster first meal pick.

---

### P0-9 · “AI generator” messaging vs curated matcher

**Why it matters**  
Firefighters smell marketing BS fast. Product is a **curated hall matcher** (audited). “AI” sets wrong expectations and erodes trust when results feel predictable.

**Proposed fix**  
- Rebrand copy: **“Hall Matcher”** / **“Pick from hall-tested meals.”**  
- Generator subtitle: crew size + protein + time — not “AI magic.”  
- Marketing aligns with `test-meal-realism-firewall` reality.

**Effort:** S (copy pass, 2–3 days)  
**Expected impact:** +4 Trust, +2 First impression — credibility with senior members.

---

### P0-10 · North Star metric not visible to the team or captains

**Why it matters**  
You can’t hit “4 weeks every shift” if nobody measures it. Admin analytics track events; **growth dashboard** doesn’t show hall cohort retention as the hero number. Captains don’t see “Your hall cooked 3 of 4 shifts this month.”

**Proposed fix**  
- Admin: **North Star dashboard** — halls active week 1→4, vote→cook conversion.  
- Captain card on `/hall`: **“Shift meals this month: 3/4”** with gentle nudge.  
- Instrument `hall_shift_meal_completed` if missing.

**Effort:** M (1 week)  
**Expected impact:** +5 Retention, +4 Growth readiness — focus team on habit not pageviews.

---

# P1 — High leverage (next sprint after P0)

---

### P1-1 · Hall Vote not in primary navigation

**Why it matters**  
Best viral loop (share link → crew votes → meal decided) is on homepage section but **not in header nav**. Captains won’t discover it from hall dashboard alone.

**Proposed fix**  
- Add **Vote** to mobile sheet + desktop nav (or under Hall submenu).  
- Post-vote screen: recipe card + share list + “Cook tonight.”

**Effort:** S  
**Expected impact:** +4 Growth readiness, +3 Retention

---

### P1-2 · Onboarding invite step blocks Continue until “shared”

**Why it matters**  
Step 3 forces marking invite shared before continuing. Good for accountability; **high abandon** before seeing dashboard value.

**Proposed fix**  
- Allow **Skip for now** with reminder on `/hall`.  
- Or move invite to dashboard checklist after first vote win.

**Effort:** S  
**Expected impact:** +3 Hall adoption

---

### P1-3 · Protein deals: strong concept, demo-only perception

**Why it matters**  
`/hall/protein-deals` is well-scoped (proteins only, setup once, recipe match, Hall Pro gate). In `disabled`/`demo` mode captains see **“integration coming soon”** — feels unfinished after setup work.

**Proposed fix**  
- Default dev/staging to **demo** with realistic proteins (already built).  
- Captain copy: “Sample deals for your stores — live flyers when provider connects.”  
- Dashboard card: always show **3 protein lines** (Chicken Thighs / Ground Beef / Pork Shoulder pattern).

**Effort:** S  
**Expected impact:** +4 Hall Pro value, +2 Trust

---

### P1-4 · Canteen not on hall quick actions grid

**Why it matters**  
Canteen shortages card exists; **Report canteen** only on shift dashboard modal. Canteen manager role is underused.

**Proposed fix**  
- Add **Canteen** tile to hall 2×2 grid (or 2×3).  
- Push notification/email to canteen manager on “out” items (future).

**Effort:** S  
**Expected impact:** +5 Canteen workflows

---

### P1-5 · Analytics card built but not on dashboard

**Why it matters**  
`HallAnalyticsCard` exists; not imported in `hall-dashboard-v2.tsx`. Captains never see meals cooked / votes / engagement without digging into settings.

**Proposed fix**  
- Add teaser card: “12 meals this month · 8 votes” → Hall Pro full analytics.  
- Respect `hall_analytics` gate.

**Effort:** S  
**Expected impact:** +3 Hall Pro value, +2 Retention

---

### P1-6 · 404 page breaks brand trust

**Why it matters**  
`not-found.tsx` uses light gray dev copy (“Did you forget to add the page to the router?”). No header, no helpful links. Bad links from shared vote URLs hurt credibility.

**Proposed fix**  
- Branded dark 404 with `SiteHeader`, links to Generator / Explore / Hall.

**Effort:** S  
**Expected impact:** +2 Trust, +1 Navigation

---

### P1-7 · Social proof section has no API fallback

**Why it matters**  
`HomeSocialProof` hides stats if API fails. Homepage loses “300+ recipes” punch silently.

**Proposed fix**  
- Static fallback counts from catalog manifest.  
- Loading skeleton for testimonials.

**Effort:** S  
**Expected impact:** +2 First impression, +2 Trust

---

### P1-8 · Plans page hard to discover

**Why it matters**  
`/plans` not in header/footer. Paywall and account page are only paths. Hall Pro positioning unclear until you hit a gate.

**Proposed fix**  
- Footer link “Plans & Hall Pro.”  
- Account: replace “Invite only” with **“Start 30-day trial.”**

**Effort:** S  
**Expected impact:** +3 Monetization readiness

---

### P1-9 · Shift reminders unproven end-to-end

**Why it matters**  
`shift_reminders` in Personal tier; profile fields exist; attribution hook in App. No proof captains get **day-before-shift email** that drives a cook action.

**Proposed fix**  
- Wire Klaviyo (or existing email) flow: “Tomorrow’s B-shift — vote or pick.”  
- Require shift days in hall profile.  
- Track `shift_reminder_clicked` → generator/vote.

**Effort:** M  
**Expected impact:** +5 Retention

---

### P1-10 · No real hall testimonials or named departments

**Why it matters**  
“Hall-tested” is a claim. Fire service is referral-driven. Anonymous polish ≠ peer proof.

**Proposed fix**  
- 5 permissioned halls: photo, department name, quote, favorite meal.  
- Homepage + `/hall-program` + vote OG images.

**Effort:** M (mostly outreach)  
**Expected impact:** +6 Trust, +4 Growth readiness

---

### P1-11 · PWA install not tied to hall join moment

**Why it matters**  
PWA shell exists (offline banner, install prompt). Best install moment is **after first vote or hall join** — station iPad / personal phone home screen.

**Proposed fix**  
- Post-join: “Add to home screen for shift night.”  
- iOS: manual instructions sheet.

**Effort:** S  
**Expected impact:** +3 Retention, +2 Mobile UX

---

### P1-12 · Paywall on shopping list only at destination

**Why it matters**  
Dashboard teasers link to gated settings page — feels like bait. User wastes taps before seeing Hall Pro message.

**Proposed fix**  
- Inline `PaywallGate` preview on dashboard card when locked.  
- Or soft lock: view list, can’t add/export without Pro.

**Effort:** S  
**Expected impact:** +2 Hall Pro value, +1 Trust

---

### P1-13 · Generator first-run still filter-heavy

**Why it matters**  
First cook needs **crew size + protein + Go**. Advanced filters intimidate (“More controls below”).

**Proposed fix**  
- First visit: simplified panel; “More filters” collapsed.  
- Remember last crew size per hall.

**Effort:** S  
**Expected impact:** +3 Personal value, +2 First impression

---

### P1-14 · Wheel pool small (~10 classics)

**Why it matters**  
Best emotional hook fatigues after repeated spins. Streaks help but variety doesn’t.

**Proposed fix**  
- Expand to 24–30 from golden catalog.  
- **Hall wheel**: prefers hall favorites + history.

**Effort:** M  
**Expected impact:** +3 Retention

---

### P1-15 · Guides → tonight loop weak

**Why it matters**  
46 hall guides are SEO assets; shift cook won’t read before dinner. Missing **“Cook this tonight”** CTA on articles.

**Proposed fix**  
- Guide sidebar: linked recipe + Start Cooking + Add to vote options.

**Effort:** S  
**Expected impact:** +2 SEO conversion, +1 Retention

---

# P2 — Polish (after P0/P1; do not block 90)

| ID | Issue | Why | Fix | Effort | Impact |
|----|-------|-----|-----|--------|--------|
| P2-1 | Beta footer on every page | Undercuts production trust | Show beta only for logged-in preview users | S | Trust +1 |
| P2-2 | Dual brand (Firehall Meals + Lights & Sirens) | Splits authority | One primary brand on product; L&S as “byline” | S | Trust +1 |
| P2-3 | Footer duplicate links (Browse / All recipes) | Minor clutter | Deduplicate | XS | Nav +1 |
| P2-4 | `/hall-history` activePage mapping | Confusing nav highlight | Fix `site-header` active state | XS | Nav +1 |
| P2-5 | Favorites not in main nav | Discovery | Add to mobile sheet | S | Personal +1 |
| P2-6 | FAQ accordion on homepage | Long scroll | Link to `/faq` only | S | First impression +1 |
| P2-7 | Voice advance in Cook Mode | Hands-busy cooks | Phase 2 cook feature | L | Mobile +2 |
| P2-8 | Offline recipe precache | Station dead zones | Precache last 5 viewed + golden heroes | M | Mobile +2 |
| P2-9 | Hall badges gamification | Engagement | After retention proof | M | Retention +1 |
| P2-10 | Admin deals fetch logs empty | Admin noise | Hide section when empty (partially done) | XS | — |
| P2-11 | Explore tablet nav (hamburger until xl) | 1280px breakpoint harsh | Tablet shows key nav items | S | Mobile +1 |
| P2-12 | Email capture after 3rd generation | Can feel bait-and-switch | Soften copy; offer value first | S | Trust +1 |
| P2-13 | Instagram / OG for vote links | Viral growth | Custom OG per vote with meal options | M | Growth +2 |
| P2-14 | Meal calendar (Hall Pro) | Listed but thin UX | Ship or remove from marketing until ready | M | Hall Pro +1 |
| P2-15 | More catalog / audit scripts | Builder trap | Freeze catalog ~450; ship distribution | — | Focus |

---

## Dimension Deep Dives

### First impression (78)

**Working:** `HomeHero`, How It Works, **Hall Vote section**, social proof, mobile-hidden SEO bloat, dark cinematic aesthetic.  
**Weak:** Featured meals rail still duplicates Explore; trust story hidden on mobile (`hidden md:block` blocks).  
**To reach 90:** One job homepage, real hall photos, 3-second comprehension line under hero.

### Mobile UX (77)

**Working:** `pb-safe-nav`, hall `max-w-lg`, touch targets, `HallDashboardV2`, generator haptics, PWA shell.  
**Weak:** Explore filter wall; recipe scroll length; install prompt vs safe area.  
**To reach 90:** Cook Mode sticky bar; food-before-filters Explore; hall sub-nav.

### Navigation (73)

**Working:** `App.tsx` lazy routes, prefetch, back-links on hall sub-pages.  
**Weak:** `/hall` vs `/halls/:id`; hash shopping list; protein deals setup orphan; favorites off-nav.  
**To reach 90:** Tonight vs Settings split; five hall sub-routes in sticky nav.

### Trust (76)

**Working:** Image governance, crew ratings, recipe trust lines, honest sync messaging, protein-only deals scope (no flyer clutter).  
**Weak:** No named halls; AI generator label; beta footer; 404 page.  
**To reach 90:** 5 real departments; rename matcher; kill dev surfaces.

### Hall adoption (72)

**Working:** `HallActivationGate` 4-step funnel, join deep links, QR invite, roles/permissions.  
**Weak:** Split create paths; join → settings; invite gate friction.  
**To reach 90:** Single captain path; join → `/hall`; checklist onboarding.

### Retention (70)

**Working:** Wheel streaks, hall streaks, activity feed, leaderboard, cloud sync, vote links.  
**Weak:** No proven cohort; shift reminders unproven; easy to use once via SEO.  
**To reach 90:** North Star visible; shift emails; PWA at join; vote→cook→list loop.

### Hall Pro value (68)

**Working:** Feature catalog correct for hall ops (lists, supplies, analytics, protein deals, calendar).  
**Weak:** Leaky enforcement; demo protein deals; analytics off-dashboard; no payment.  
**To reach 90:** Stripe + server gates + captain trial CTA + analytics teaser.

### Personal value (79)

**Working:** Generator speed, wheel delight, cook mode adapters, measurement toggle, crew scaling.  
**Weak:** First-run complexity; wheel size; saved meals still feel secondary to hall.  
**To reach 90:** Simplified first run; hall-aware wheel; favorites in nav.

### Canteen workflows (71)

**Working:** `/hall/canteen` statuses, shortages dashboard card, shift report modal, manager field.  
**Weak:** Not in quick actions; no notify loop; Hall Pro positioning for canteen unclear.  
**To reach 90:** Dashboard tile; manager alerts; tie to grocery list.

### Growth readiness (70)

**Working:** 393 URL sitemap, guides, vote share URLs, hall program landing, analytics events.  
**Weak:** No QR hall kit; no Facebook playbook; no case studies; SEO ≠ hall installs.  
**To reach 90:** 10 hall pilots; printable fridge QR; captain outbound template.

### Monetization readiness (62)

**Working:** `guest | personal | hall_pro` tiers, `PaywallGate`, trial/enable/convert, admin billing.  
**Weak:** No Stripe; Personal auto-free on sign-in; leaky Pro APIs.  
**To reach 90:** Paid Hall Pro; checkout analytics; enforce Pro server-side.

---

## Path to 90+ (Recommended Sequence)

### Sprint A — Hall ritual (weeks 1–2)
- P0-1, P0-2, P0-3 (partial), P1-1, P1-2  
- **Exit criteria:** New member lands on `/hall`; captain completes one checklist; vote in nav.

### Sprint B — Ops at the stove (weeks 3–4)
- P0-4, P0-7, P1-4, P1-5, P1-6  
- **Exit criteria:** Shopping list has route; cook sticky bar shipped; canteen in quick actions.

### Sprint C — Money and truth (weeks 5–6)
- P0-5, P0-6, P0-9, P1-8, P1-10  
- **Exit criteria:** Stripe live; server gates on; 5 real hall stories on homepage.

### Sprint D — Distribution (weeks 7–8)
- P0-8, P0-10, P1-9, P1-11, P1-13  
- **Exit criteria:** 10 halls in pilot; North Star dashboard; shift reminder email live.

**Do not start:** New catalog silos, more audit npm scripts, AI recipe generation, breakfast/smoothie expansion — unless a **paying** hall asks.

---

## What Already Scores High (Protect These)

1. **Generator reliability** — fast curated match; don’t break for “smarter AI.”  
2. **Crew scaling + measurements** — genuine differentiator vs AllRecipes.  
3. **Hall Dashboard V2** — mobile-native ops hub; iterate, don’t replace.  
4. **Hall Vote** — best viral mechanic; promote, don’t bury.  
5. **Protein deals V1** — right scope (proteins only); connect to live data when ready.  
6. **Content QA discipline** — trust moat for SEO; don’t trade quality for count.  
7. **Billing architecture** — wire payment to existing gates, don’t redesign tiers.

---

## Appendix — Key Routes (Operator Map)

| Job | Canonical route | Today’s friction |
|-----|-----------------|------------------|
| Pick dinner (personal) | `/generator` | Low |
| Browse meals | `/explore` | Medium (filters) |
| Vote crew | `/vote` + homepage section | Not in nav |
| Hall home | `/hall` | Competes with `/halls/:id` |
| Hall settings | `/halls/:hallId` | Members land here by mistake |
| Shopping list | `/halls/:id#hall-shared-shopping-list` | Should be `/hall/shopping-list` |
| Canteen | `/hall/canteen` | Low discoverability |
| Protein deals | `/hall/protein-deals` | Hall Pro + setup |
| Plans | `/plans` | Low discoverability |

---

## Appendix — Hall Pro Feature Honesty Matrix

| Feature | Marketing | Client gate | Server gate | Ship status |
|---------|-----------|-------------|-------------|-------------|
| Shared shopping lists | Yes | Yes (settings) | **No** | UX yes, billing no |
| Hall supplies | Yes | Yes | **No** | UX yes |
| Hall analytics | Yes | Yes | **Yes** | OK |
| Protein deals | Yes | Yes | **Yes** | Demo OK |
| Shared favorites | Yes | **No** | **No** | Leak |
| Hall history | Yes | **No** | **No** | Leak |
| Meal calendar | Yes | **No** | **No** | Thin |
| Hall badges | Yes | **No** | **No** | Thin |
| Shift reports | Yes | **No** | **No** | Thin |

**Rule for 90:** Row must be **Yes / Yes / Yes** before Hall Pro marketing claims it.

---

*This audit reflects the codebase as of June 22, 2026, including Hall Dashboard V2, hall membership, cloud sync, billing scaffold, cook mode adapters, canteen page, and Protein Deals V1 (`/hall/protein-deals`, `protein_deals` table, Hall Pro `protein_deals` feature).*

*Next review trigger: when 10 halls complete 4-week North Star cohort OR Stripe Hall Pro first paid conversion.*
