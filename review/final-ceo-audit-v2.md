# Firehall Meals — Final CEO Audit v2

**Date:** June 25, 2026  
**Lens:** Founder & CEO (not engineering)  
**North Star:** A hall uses Firehall Meals on **every shift night for 4 consecutive weeks**  
**Method:** Re-verified build/runtime gates, HTTP route smoke, script suite, and full product surface audit against current codebase — not prior audit assumptions.

---

## CEO letter (90 seconds)

Firehall Meals is no longer a prototype. It boots clean, passes a 50+ script gate, ships a 3.3 MB production bundle, indexes 393 URLs, and serves **268 explore-eligible recipes** with automated hero validation. The hall layer — dashboard v2, vote, canteen, protein deals, shopping list, history — is **real software**, not a landing page with features listed.

What has **not** changed: **zero proven halls** using this every shift for a month. No Stripe. No named departments on the homepage. No captain case study. The product is **deploy-ready** but **distribution- and revenue-unproven**.

The company is still two businesses in one repo: a **recipe media engine** (SEO, guides, 100+ QA scripts) and a **hall operating system** (decide → cook → remember → stock). The media engine is ahead. The OS is waiting for **one fridge QR and one paid pilot**.

**Verdict:** Build quality is now **ahead of business proof**. The next 90 days are not catalog audits — they are **10 halls retained**.

---

# STEP 1 — Build & Runtime Validation

**Re-run:** June 25, 2026

| Gate | Result | Notes |
|------|--------|-------|
| `npm install` | **PASS** | 792 packages; 3 transitive npm audit vulns (non-blocking) |
| `npm run check` | **PASS** | `tsc` + 50+ scripts including `audit:hero-images` (315/315 pass) |
| `npm run build` | **PASS** | Vite client + `dist/index.cjs`; PWA precache 114 entries |
| `npm run dev` | **PASS** | Existing instance on port 5000; `/api/health` → `status: healthy` |
| SQLite stores | **PASS** | cache, curated, catalog, auth, hall membership, billing, vote — all `ok` |
| TypeScript | **PASS** | No compile errors |
| Broken routes | **PASS** | All smoke-tested routes return SPA shell (`id="root"`) |
| Failed imports | **PASS** | Build completes; no missing modules |
| Runtime crashes | **NONE** observed in health/startup |
| Environment | **PASS** | Runs without Spoonacular; OpenAI optional |

### HTTP smoke (localhost:5000)

| Route | HTTP | SPA shell |
|-------|------|-----------|
| `/` | 200 | ✓ |
| `/generator` | 200 | ✓ |
| `/tonight` | 200 | ✓ |
| `/explore` | 200 | ✓ |
| `/wheel` | 200 | ✓ |
| `/hall` | 200 | ✓ |
| `/hall/canteen` | 200 | ✓ |
| `/hall/shopping-list` | 200 | ✓ (redirects to hall shopping panel) |
| `/hall/protein-deals` | 200 | ✓ |
| `/hall/history` | 200 | ✓ |
| `/plans` | 200 | ✓ |
| `/profile` | 200 | ✓ (→ `/me/profile`) |
| `/recipes/butter-chicken` | 200 | ✓ |
| `/guides/10-classic-firehall-meals` | 200 | ✓ |
| `/vote/test` | 200 | ✓ |

### Confirmed removals (not assumptions)

| Removed / redirected | Evidence |
|---------------------|----------|
| Crew Pulse UI | No `Crew Pulse` in `client/src`; `/hall/activity`, `/hall/leaderboard` → `/hall` |
| Captain reports | Not in nav or hall dashboard v2 |
| Ghost Hall Pro features (meal calendar, hall badges, shift reports) | Removed from `HALL_PRO_FEATURES`; only 4 hall features remain in billing types |

### Non-blocking warnings

1. **1.28 MB main JS chunk** — Home + Generator still eager-loaded; hurts cold SEO/mobile first impression
2. **6 recipes missing heroes** + **18 duplicate-blocked** — show placeholder, not wrong meal (`review/hero-image-validation.md`)
3. **142 suspicious nutrition rows** — audit flags, not user-blocking
4. **Hall Pro APIs** — shopping/canteen server gates weaker than UI paywalls (see Hall Pro section)
5. **No browser console instrumentation** in this headless pass

**Step 1 verdict: PASS — safe to ship; no blockers found.**

---

# STEP 2 — Complete Product Audit

Scores are **1–10** (10 = would mandate at my hall tonight).

| Area | Score | Working | Broken / unfinished | Recommended improvements |
|------|------:|---------|---------------------|--------------------------|
| **Homepage** | **8** | Clear hero, How It Works, Hall Vote section, featured meals, star-only testimonials (no fake photos) | Still many doors (generator, explore, wheel, pizza, guides in nav); SEO blocks hidden on mobile | One primary CTA: “Pick tonight’s meal”; demote pizza/guides to footer on mobile |
| **Navigation** | **7** | Clean header, sticky, haptic mobile menu | Hall not in main nav; `/hall` vs `/halls/:id` split; shopping list still hash-based | Add **Hall** to primary nav when member; one settings URL pattern |
| **Generator** | **9** | Fast, curated, crew scaling, realism firewall, stress test 100% | Variety duplicates in stress test; “AI” framing still scares some captains | Rename to “Meal Picker”; show classic result first |
| **Wheel** | **8** | Fun, fast, classics-focused, `/wheel` canonical | Not linked from hall dashboard as default ritual | “Can’t decide? Spin” on `/tonight` and `/hall` |
| **Recipe Pages** | **8** | 313+ approved routes, crew scaling, nutrition, ratings, SEO schema | Cook Mode not hero-level on all recipe types; 6 missing hero images | Sticky “Start Cooking” above fold; regen quarantined heroes |
| **Cook Mode** | **7** | Full-screen steps, wake lock, holding timer, hall dashboard shortcut | Still secondary on recipe pages; not default post-pick flow | Auto-offer Cook Mode after “We’re making this” on hall dash |
| **Explore** | **8** | 268 eligible recipes, filters, mobile page size, hero validation pipeline | 18 recipes excluded (placeholders); grid still heavy (~76 KB chunk) | Server-side explore cache; lazy-load explore route earlier |
| **Search** | **7** | In-explore search + catalog `searchText` | No global search; discover page thin | Unified search from `/tonight` |
| **Shopping Lists** | **7** | Hall-shared list exists, redirect from `/hall/shopping-list` | Lives in `/halls/:id#hall-shared-shopping-list`; Pro gate UI-only on settings | Top-level `/hall/shopping-list` panel; server enforce Pro |
| **Hall Dashboard** | **8** | v2: tonight’s meal, actions, canteen shortcut, protein deals, last meals | Stats feel local/sync-heavy; “hall history” not truly crew-shared server log | Weekly “what we cooked” email to captain |
| **Hall History** | **6** | `/hall/history` route exists | Mostly per-user sync, not authoritative crew log | Server-side hall meal log (Pro) |
| **Hall Vote** | **8** | Homepage section, modal, shareable `/vote/:id` | Not in main nav; captains may never discover | “Start vote” button on `/hall` header |
| **Canteen** | **7** | Dedicated `/hall/canteen`, staples-only server rule | Not in daily rhythm; shift report easy to miss | Push notification: “Low on coffee?” |
| **Protein Deals** | **7** | v1 architecture, demo mode, Hall Pro gate on API | Demo deals feel synthetic; setup friction | One real retailer pilot (even manual CSV) |
| **Membership** | **7** | Join → welcome → `/tonight?onboarding=1` (**fixed** since prior audit) | Create-hall still has multiple entry points | Single create-hall wizard |
| **Profile** | **7** | `/me/profile`, redirects from `/profile` | Buried under Me; hall settings separate | Merge account + hall identity for members |
| **Plans** | **6** | Honest copy; Hall Pro scoped per hall | No Stripe; “No charge during preview”; Personal is free SKU | Price anchor + checkout for Hall Pro only |
| **SEO** | **9** | 393 sitemap URLs, 58 guides, schema, landings | Content company risk — team builds for Google not halls | Freeze new guides; ship hall case study page |
| **Mobile Safari** | **7** | `pt-safe`, `pb-safe-nav`, sticky headers, PWA | 1.28 MB first load; explore scroll weight | Code-split generator; explore API cache |
| **Performance** | **6** | Builds fast; audits in CI | Main bundle bloated; explore-image node shims in client | Lazy routes per `performance-priorities-v2.md` P0 |
| **First Impression** | **8** | Premium dark brand, clear mission | Too many equal nav choices | Tonight-first homepage for returning users |
| **Trust** | **7** | Hero validation, honest Pro copy, star testimonials | Anonymous quotes; 6 placeholder recipe images | Real hall names (with permission); regen heroes |
| **Retention** | **5** | Streaks, vote, sync seeds | **No proven 4-week hall habit** | Fridge QR + weekly captain nudge |
| **Monetization** | **4** | Hall Pro SKU narrowed to 4 real features | No payment; leaky gates | Stripe + one $29/mo pilot |
| **Growth** | **6** | SEO machine ready; vote share links | No hall distribution playbook | QR kit + captain onboarding call |
| **Technical Debt** | **7** | Dead code cleaned; CI comprehensive | 100+ audit scripts vs 0 paying halls | Freeze new scripts; enforce Pro server-side |

**Weighted product average (areas): ~7.2 / 10**

---

# STEP 3 — Firefighter Usability Test

Simulated walkthroughs by role (code + route verification, not live user test).

### Rookie firefighter

| Flow | Result | Friction |
|------|--------|----------|
| Sign up | OK via auth modal | “Why do I need an account to save?” — unclear value |
| Join hall | OK → `/hall/welcome` → `/tonight` | Good fix vs prior audit |
| Generate meal | OK | Fast |
| Vote | OK if someone shares link | Wouldn’t find vote alone |
| Shopping list | **Confusing** | Hash URL in settings; wouldn’t find |
| Cook | OK if shown Cook Mode | Might scroll recipe on phone at stove |
| Canteen | **Easy to miss** | Not on main nav |

### Senior firefighter

| Flow | Friction |
|------|----------|
| “Just tell me what to cook” | Generator/wheel work — **too many other browse paths** |
| Trust | Testimonials feel generic without station names |
| Hall Pro | “Why would I pay?” — no price, no receipt |

### Station cook

| Flow | Friction |
|------|----------|
| Scale for 8 | **Strong** |
| Cook Mode | Exists but **too many taps** from recipe |
| Shopping | List buried; would use paper |
| Tonight hub | `/tonight` is good — **should be default after login** |

### Canteen manager

| Flow | Friction |
|------|----------|
| Canteen update | `/hall/canteen` works | |
| Protein deals | Setup page + Pro gate | Demo data feels fake |
| Shopping | **Should be daily tool** — feels like settings panel |
| Pay | **No way to pay** | Slush fund needs invoice/receipt |

### Captain

| Flow | Friction |
|------|----------|
| Create hall | Multiple paths (modal, account, join) | **Unfinished feeling** |
| Invite crew | Works | |
| Run vote | Strong feature, **not prominent on /hall** | |
| Enable Pro | Settings maze | Should prompt at first shopping list save |
| Reports | Captain reports removed ✓ | No replacement “weekly hall summary” |

### Cross-cutting usability failures

1. **Too many clicks** to shopping list and cook mode  
2. **Dead ends** for guests wanting hall features (good gates, but weak upgrade path)  
3. **Poor wording** — “Personal plan” implies payment; it’s free  
4. **Slow screens** — cold load on station Wi‑Fi (1.28 MB JS)  
5. **Cheap feeling** — placeholder heroes on 6 cards; demo protein deals  
6. **Wouldn’t survive shift use** — shopping list location; cook mode not stove-default  

---

# STEP 4 — Business Audit

| Question | Answer |
|----------|--------|
| Would firefighters use this every shift? | **Personally, yes** (generator/wheel/recipes). **As a hall, not yet** — ritual not installed. |
| Would a hall pay? | **Maybe $25–40/mo** if shopping + canteen + protein deals save one grocery run/month. **Unproven.** |
| Would an individual firefighter pay? | **Unlikely** for subscription. Maybe one-time tip. Free tier is enough. |
| Is Hall Pro compelling? | **Directionally yes** — narrowed to 4 real features. **Not compelling without checkout and crew-shared proof.** |
| Biggest reason NOT to pay? | “I can screenshot the recipe / use GroupMe for votes.” No locked-in crew workflow. |
| Strongest habit feature? | **Generator + wheel** (personal). **Hall Vote** (crew) if captain adopts. |
| Strongest referral loop? | **Hall Vote share link** → crew taps → joins hall. Under-marketed. |
| Missing before charging? | Stripe, server-side Pro enforcement, **one hall case study**, fridge QR onboarding |

---

# STEP 5 — Product Market Fit

### PMF score: **44 / 100**

| Signal | Status |
|--------|--------|
| Problem clarity | **High** — shift-night dinner is real |
| Solution quality | **High** — recipes + scaling + vote |
| Hall workflow fit | **Medium** — ops features buried |
| Retention proof | **Low** — no 4-week hall cohort |
| Willingness to pay | **Unknown** — no charges |
| Distribution | **Low** — SEO yes, halls no |

### Top 10 remaining product risks

1. **No retained hall cohort** — PMF unmeasured  
2. **Building for SEO, not fridges** — content treadmill  
3. **Hall history not truly shared** — Pro value leak  
4. **Paywalls UI-only** — trust break if discovered  
5. **Placeholder/missing heroes** — 24 recipes degraded on Explore  
6. **First-load performance** — bounce before generator  
7. **Fragmented hall URLs** — `/hall` vs `/halls/:id` confusion  
8. **Personal tier fiction** — distracts from Hall Pro buyer  
9. **Demo protein deals** — canteen manager skepticism  
10. **No captain success metric** — team ships features, not rituals  

### Top 10 opportunities

1. **Hall Vote as viral wedge** — every vote is acquisition  
2. **Fridge QR → /tonight** — physical install moment  
3. **Canteen + shopping as Pro anchor** — ops budget exists  
4. **300+ recipe moat** — competitors don’t have crew scaling  
5. **SEO inbound** — 393 URLs; convert to hall signup  
6. **Lights & Sirens brand** — merch trust for fire service  
7. **Red Lead / classics** — cultural hooks for Canadian halls  
8. **PWA install** — home screen on station iPad  
9. **One retailer protein pilot** — real deals = real Pro value  
10. **Captain weekly email** — “Your hall cooked 4 meals this week”  

---

# STEP 6 — Ruthless CEO Review

| Feature | Verdict | Rationale |
|---------|---------|-----------|
| **Generator** | **KEEP** | Core job #1 — decide dinner |
| **Wheel** | **KEEP** | Fastest fair decision |
| **Explore** | **SIMPLIFY** | One browse path; hide pizza/breakfast/smoothies from main nav |
| **Guides** | **POSTPONE** (new content) | Keep indexed; stop writing |
| **Recipe Pages** | **KEEP** | Core job #2 — cook dinner |
| **Hall Vote** | **KEEP** + elevate | Best crew ritual + growth loop |
| **Shopping Lists** | **KEEP** + simplify access | Pro anchor; fix URL |
| **Cook Mode** | **KEEP** + simplify access | Make default after pick |
| **Hall History** | **SIMPLIFY** | Honest scope or build real shared log |
| **Protein Deals** | **KEEP** | Differentiator if real data |
| **Canteen** | **KEEP** | Job #4 — necessities |
| **Plans** | **SIMPLIFY** | Drop Personal SKU marketing; Hall Pro only |
| **Profile** | **SIMPLIFY** | Merge with hall identity |
| **Saved Meals** | **KEEP** | Personal retention |
| **SEO landings** | **KEEP** (frozen) | Acquisition only |
| **Hall Pro** | **KEEP** | Right buyer, wrong payment state |
| **Admin / 100+ audits** | **POSTPONE** | Internal; freeze expansion |
| **Discover page** | **REMOVE** or merge | Duplicates explore |
| **Families index** | **POSTPONE** | Not shift-night job |
| **Hall analytics admin** | **POSTPONE** | Pre-10-halls |
| **Smoothies / performance fuel** | **POSTPONE** in app IA | SEO/catalog only |
| **Personal paid tier** | **REMOVE** | Never monetize individuals at this stage |

**Does it make dinner easier tonight?** If no → already removed (Crew Pulse, captain reports) or postponed above.

---

# STEP 7 — Growth Strategy (no paid ads)

### Path to 10 halls (weeks 1–6)

| Tactic | Owner | Mechanism |
|--------|-------|-----------|
| **Fridge QR kit** | Founder | QR → `/tonight` + hall join code |
| **Captain coffee** | Founder | 30-min Zoom: create hall → first vote |
| **Hall Vote launch** | Product | Captain posts link in crew GroupMe |
| **SEO → hall CTA** | Marketing | Guide footer: “Run this meal at your hall” |
| **Lights & Sirens** | Brand | Sticker in kit; trust signal |

**Target:** 10 halls with ≥3 members, ≥1 vote or meal pick in week 1.

### Path to 25 halls (weeks 7–10)

- Referral: captain invites **adjacent station** after successful vote  
- **Case study #1** published (named hall, photo of fridge QR)  
- **Protein deal pilot** with one regional grocer (even manual)  

### Path to 50 halls (month 3)

- **Ontario/BC fire Facebook groups** — vote screenshots, not ads  
- **Training officer** partnerships (meal planning module)  
- **PWA install** push on second visit  

### Path to 100 halls (month 4–6)

- **Hall Pro checkout live** — captains who hit shopping list limit convert  
- **Regional captain ambassadors** (free Pro for 6 months)  
- **SEO compounding** — recipe pages with hall CTA  

**Do not:** Facebook ads, Google ads, influencer sponsorships.

---

# STEP 8 — Monetization

### Free forever

- Generator, wheel, browse/explore  
- Guest recipe viewing  
- **Hall Vote** (growth loop — never paywall)  
- Basic personal saves (device/local)  
- Account sign-in / sync  

### Hall Pro ($29–39 USD/mo per hall — recommend **$29/mo** launch)

| Included | Why |
|----------|-----|
| Shared shopping lists | Canteen manager job |
| Hall meal history (server truth) | Captain memory |
| Canteen management | Staples tracking |
| Protein deals | Real grocery savings |

### Never monetize

- Individual firefighter subscription  
- Recipe access / paywalled recipes  
- Hall Vote  
- Cook mode  
- Crew scaling  

### Tier structure recommendation

| Tier | Who pays | Price |
|------|----------|------:|
| **Guest** | — | Free |
| **Account** | — | Free (rename from “Personal”) |
| **Hall Pro** | Captain / canteen manager | **$29/mo** hall |
| **Enterprise** | **POSTPONE** until 50+ halls | Department-wide — month 6+ |

**Individuals:** Do not charge. **Halls:** Charge when shopping + canteen are daily-used.

**Before charging:** Stripe Checkout, server-side `userHasFeature()` on shopping + canteen, one receipt PDF for slush fund.

---

# STEP 9 — 90-Day CEO Roadmap

### Weeks 1–2 — Install the ritual

| Task | Impact | Effort | Risk | Deps | Outcome |
|------|--------|--------|------|------|---------|
| Fridge QR PDF kit | Critical | S | Low | None | Physical install path |
| `/hall` vote CTA | High | XS | Low | None | Captains discover vote |
| Cook Mode default after pick | High | S | Low | None | Stove trust |
| `/hall/shopping-list` full page | High | S | Med | Pro gates | Ops daily driver |
| Lazy-load Generator chunk | High | S | Low | None | Mobile first impression |
| Recruit 5 pilot captains | Critical | M | Med | Founder time | Real feedback |

### Weeks 3–4 — Honest Pro + first money path

| Task | Impact | Effort | Risk | Deps | Outcome |
|------|--------|--------|------|------|---------|
| Stripe Hall Pro checkout | Critical | M | Med | Legal/tax | Revenue signal |
| Server enforce Pro on shopping/canteen | High | S | Low | Billing | Trust |
| Rename Personal → Free Account | Med | XS | Low | Copy | Clarity |
| Hall case study #1 | High | S | Med | Pilot hall | Social proof |
| Regen 6 quarantined heroes | Med | M | Low | Imagery pipeline | Trust on cards |

### Month 2 — Retention machinery

| Task | Impact | Effort | Risk | Deps | Outcome |
|------|--------|--------|------|------|---------|
| Server-side hall meal log | High | M | Med | Pro | Real hall history |
| Captain weekly email | High | S | Low | Klaviyo | Return trigger |
| Protein deal pilot (1 retailer) | High | L | High | Partner | Pro justification |
| Unified `/tonight` for signed-in users | Med | S | Low | None | One front door |
| 10 halls retained (≥1 activity/wk) | Critical | — | High | Weeks 1–4 | PMF signal |

### Month 3 — Scale what works

| Task | Impact | Effort | Risk | Deps | Outcome |
|------|--------|--------|------|------|---------|
| Referral: invite adjacent hall | High | S | Low | 10 halls | 25 halls |
| Explore API cache | Med | S | Low | None | Mobile browse |
| Drop discover duplicate route | Low | XS | Low | None | Simpler IA |
| Ambassador program (3 captains) | High | M | Med | Case study | Word of mouth |
| 25 halls retained | Critical | — | High | Month 2 | Series A narrative |

---

# STEP 10 — Final CEO Verdict

## Overall product score: **76 / 100**

| Readiness | Score | Note |
|-----------|------:|------|
| **Business** | **48** | No paying halls, no 4-week retention proof |
| **Technical** | **82** | check/build pass; hero audit; deploy-ready |
| **Growth** | **55** | SEO strong; hall playbook weak |
| **Monetization** | **40** | SKU right; payment missing |

Up **+4** from prior CEO score (72) due to: join→welcome fix, Hall Pro simplification, Crew Pulse removal, hero validation, route fixes. Capped below 80 until **retention proof**.

---

## Top 20 priorities

1. Recruit 5 pilot halls with named captains  
2. Fridge QR → `/tonight` physical kit  
3. Hall Vote prominent on `/hall`  
4. Cook Mode as default post-meal-pick  
5. Stripe Hall Pro at $29/mo  
6. Server-side Pro enforcement (shopping, canteen)  
7. Shopping list as first-class `/hall/shopping-list` page  
8. One published hall case study  
9. Captain weekly “what we cooked” email  
10. Lazy-load Generator (first-load perf)  
11. Regen quarantined hero images  
12. Real protein deal pilot (one retailer)  
13. Server-side shared hall meal log  
14. Rename Personal tier to Free Account  
15. `/tonight` as signed-in home  
16. Vote share loop in captain onboarding  
17. Track **halls with week-2 return** weekly  
18. PWA install prompt on second visit  
19. Explore API cache (mobile)  
20. Adjacent-station referral after first successful vote  

---

## Top 20 things NOT to build

1. New recipe catalog expansions  
2. New npm audit scripts  
3. Personal paid subscription  
4. Meal calendar  
5. Hall badges / gamification  
6. Captain PDF reports (removed — don’t resurrect)  
7. Crew Pulse (removed — don’t resurrect)  
8. Inter-hall leaderboards  
9. Enterprise / department sales motion  
10. Voice cook mode  
11. New SEO guide articles (freeze at 58)  
12. Family profiles  
13. AI imagery pipeline expansion (until heroes fixed)  
14. Admin growth dashboard features  
15. Discover page (merge into explore)  
16. Performance fuel as app section  
17. Smoothie app section in main nav  
18. County/regional hall networks  
19. Paid Facebook/Google ads  
20. Lighthouse optimization sprints in isolation  

---

## North Star metric

**Halls with ≥1 shift-night activity in each of 4 consecutive weeks**

(A meal pick, vote, cook start, or shopping list update counts as activity.)

---

## Metrics to track weekly

| Metric | Why |
|--------|-----|
| Active halls (any activity) | Volume |
| **4-week retained halls** | North Star |
| Hall Vote created / completed | Ritual + viral |
| Join → week-2 member return % | Onboarding quality |
| Generator/wheel sessions per hall | Decide job |
| Cook Mode starts per hall | Cook job |
| Shopping list items added (hall) | Pro value |
| Hall Pro trials started / converted | Revenue |
| SEO signups → hall join % | Acquisition quality |
| Time to first meal pick (mobile) | First impression |

---

## Path to retained halls

| Milestone | Definition | How |
|-----------|------------|-----|
| **10 halls** | 10 halls, ≥3 members, ≥2 activities in week 1, ≥5 return week 2 | Founder-led pilots, fridge QR, vote in GroupMe |
| **25 halls** | Above + ≥40% week-4 retention | Case study, referral to adjacent station, Pro pilot |
| **50 halls** | Above + ≥3 organic hall signups/week | SEO CTAs, ambassador captains, protein deal proof |
| **100 halls** | Above + Stripe revenue ≥$1.5k MRR | Hall Pro checkout, weekly captain email, shopping as habit |

---

## If I became CEO tomorrow — build ONE thing next month

### **Hall Vote → Hall Join loop on the fridge**

**What:** A captain prints one QR poster: “Tonight’s dinner — tap to vote.” Scan opens a **dead-simple vote** (no account required to vote; account to join hall). When vote closes, winning meal appears on `/hall` with **one-tap Cook Mode** and **add to shopping list**.

**Why (not engineering elegance):**

1. **Decide dinner** — the whole crew participates in 60 seconds  
2. **Viral acquisition** — every vote link is a product demo in GroupMe  
3. **Hall formation** — voters become members without understanding “features”  
4. **Retention** — if they voted Tuesday, they open Wednesday to see the result  
5. **Monetization path** — shopping list save is the natural Pro upsell moment  

This single loop connects the **strongest personal features** (meals) with the **strongest crew feature** (vote) and creates a **weekly habit** before you charge a dollar. Everything else — SEO, catalog QA, admin dashboards — is secondary until this loop runs in **10 real halls**.

---

## Validation appendix

```bash
npm install          # PASS (2026-06-25)
npm run check        # PASS (includes audit:hero-images 315/315)
npm run build        # PASS
npm run dev          # PASS (health 200, stores ok)
npm run audit:hero-images  # PASS
```

**Related artifacts:** `review/final-local-run-audit.md`, `review/hero-image-validation.md`, `review/hall-pro-audit.md`, `review/product-audit-v3.md`, `review/stop-building.md`

---

*This document reflects verified state as of June 25, 2026. Prior audits that assumed join→settings or ghost Hall Pro features are superseded where contradicted above.*
