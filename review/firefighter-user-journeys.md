# Firefighter User Journeys

**Date:** June 22, 2026  
**Method:** Walked every flow as five hall roles — Probie, Senior firefighter, Hall cook, Canteen manager, Captain — against the live product (routes, modals, gates, redirects).  
**Flows covered:** Sign up · Create hall · Join hall · Generate meal · Vote · Wheel · Shopping list · Canteen · Profile · Hall Pro  
**Companion docs:** [product-audit-v3.md](./product-audit-v3.md), [strategic-audit.md](./strategic-audit.md)

---

## The five personas

| Role | Who they are | What they want tonight | Tech comfort |
|------|--------------|------------------------|--------------|
| **Probie** | New hire, first month. Doesn't know who runs the kitchen yet. | "Tell me what to cook and don't make me look dumb." | Uses phone for everything; hates forms. |
| **Senior** | 12 years on. Cooked plenty. Skeptical of "apps." | "Pick something fast. I've got a truck check in 20." | Will use generator if it's faster than group chat. |
| **Hall cook** | On shift tonight. Responsible for dinner for 8–12. | Recipe, list, crew buy-in, stove mode — one flow. | Power user if the app respects gloves and grease. |
| **Canteen manager** | Tracks coffee, paper towels, protein in the walk-in. | Know what's out before someone yells from the bay. | Wants lists and status, not marketing pages. |
| **Captain** | Owns the hall setup, invites, billing, settings. | Crew actually using it next month, not just tonight. | Will tolerate setup if crew lands somewhere sensible. |

---

## Journey map (at a glance)

| Flow | Probie | Senior | Hall cook | Canteen mgr | Captain |
|------|:------:|:------:|:---------:|:-----------:|:-------:|
| Sign up | 😕 | 😐 | 😐 | 😐 | 😕 |
| Create hall | 😕 | — | — | — | 😕 |
| Join hall | 😕 | 😐 | 😐 | 😐 | 😐 |
| Generate meal | 🙂 | 🙂 | 🙂 | — | 😐 |
| Vote | 😕 | 🙂 | 🙂 | — | 🙂 |
| Wheel | 🙂 | 🙂 | 🙂 | — | 😐 |
| Shopping list | 😕 | 😕 | 😕 | — | 😕 |
| Canteen | 😐 | — | 😐 | 😕 | 😐 |
| Profile | 😕 | 😐 | 😐 | 😐 | 😕 |
| Hall Pro | — | — | — | 😕 | 😕 |

🙂 = works for this role · 😐 = friction but survivable · 😕 = real confusion or trust break · — = rarely their job

---

# Flow-by-flow walkthroughs

## 1. Sign up

### Probie
> "Captain texted a link. I tapped it, it wanted me to sign in. I put my email in, it said check my inbox. I went to Gmail, came back — I'm on **Account**, not the join page. Where did the hall go?"

**Steps today:** Invite link → `/hall/join?token=…` → "Sign in to join" → `SignInSheet` → magic link email → `/account?signed_in=1` → optional `HallActivationFunnel` modal on top.

| Issue type | What happens |
|------------|--------------|
| **Confusion** | Magic link drops invite context; lands on `/account`, not back on join URL. |
| **Duplicate flow** | OAuth (Google/Apple) keeps you on join page; email does not. Two different outcomes for same intent. |
| **Unnecessary step** | After email verify, funnel may open *again* asking create/join — even if they came from an invite. |
| **Feels like a website** | "Check your inbox" is a tab-switch ritual, not an in-app completion. |
| **Feels cheap** | Magic link errors (`?error=expired_link`) hit `/account` but nothing on screen explains why sign-in failed. |

### Senior
> "I'll hit Google. Done. Why is a popup asking me to create a hall? I already have one."

**Steps:** Any page → header sign-in → Google → stays on page → `HallActivationFunnel` may auto-open if onboarding incomplete.

| Issue type | What happens |
|------------|--------------|
| **Confusion** | Funnel doesn't know you're a join-only user vs a captain setting up. |
| **Unnecessary step** | Step 3 forces copy/share invite before Continue — irrelevant if you joined someone else's hall. |
| **Feels slow** | Cloud sync on OAuth (`runCloudSync`) before you do anything visible. |

### Captain
> "I signed up from Hall Program. It opened sign-in, I authenticated… and I'm still on marketing copy. I expected the create-hall form."

**Steps:** `/hall-program` → "Create Your Hall" (guest) → sign-in only → **no** redirect to `/account?create_hall=1`. Must navigate manually.

| Issue type | What happens |
|------------|--------------|
| **Confusion** | CTA promise ("Create Your Hall") ≠ post-auth destination. |
| **Duplicate flow** | Sign-in also triggers activation funnel (minimal create) *and* account page has full `CreateHallForm`. |

### Hall cook / Canteen manager
Same as Senior or Probie depending on invite path. **Guest path exists** ("Continue as guest") — good for trying generator, bad for hall features with no explanation of what you're missing.

---

## 2. Create hall

### Captain (primary owner)
> "I filled out station, department, shifts, appliances — fifteen minutes at the desk. Landed on **Hall settings**. Where's the dashboard my crew is supposed to use?"

**Path A — Account (full):** `/account` → "Set up your station" or `?create_hall=1` → `CreateHallForm` (name, station, department, city, province, crew, shift editor, appliances) → `POST /api/halls` → **`/halls/:hallId`** (settings page).

**Path B — Activation funnel (minimal):** Post sign-in modal → Step 1 Create → name + crew size only → steps 2–4 (shift, invite, vote) → **`/hall`** (dashboard).

| Issue type | What happens |
|------------|--------------|
| **Duplicate flow** | Two create forms, same API, different fields, different landing pages. |
| **Confusion** | `/halls/:id` reads as "settings/admin." `/hall` reads as "home." Captain who uses account create never sees the dashboard-first ritual. |
| **Unnecessary step** | Funnel step 3 (must share invite before continue) when captain already has a crew in the room. |
| **Feels like a website** | Long form on account page feels like SaaS onboarding, not "stand up your hall in 60 seconds." |
| **Feels slow** | Shift editor on account create before anyone has joined. |

### Probie
Not their job — but if they accidentally tap "Create hall" in the funnel, they can spawn a rogue hall with two fields and no idea what station/department means.

---

## 3. Join hall

### Probie
> "QR code on the fridge → preview looks good → Join → I'm on a page with **members, billing, supplies, analytics**. I thought I was joining dinner, not IT."

**Path A — Invite link:** `/hall/join?token|code|join_code=…` → preview → join → **`/halls/:hallId`**.

**Path B — Funnel:** Step 1 Join → compact form → shift pick → invite → vote → **`/hall`**.

**Path C — Account:** Join panel with hall ID field → **`/halls/:hallId`**.

| Issue type | What happens |
|------------|--------------|
| **Confusion** | Join succeeds to settings/detail, not crew dashboard. |
| **Duplicate flow** | Three join entry points; funnel adds 3 extra steps account/join page skip. |
| **Unnecessary step** | On `/hall/join` with valid token: one-click join **and** a second "Have a code?" form below. |
| **Feels like a website** | Hall ID field in advanced join — nobody knows a UUID. |
| **Feels cheap** | Invalid/expired invite → dead end; no "ask your captain for a new link" recovery path. |

### Senior
> "Code is `FH92`. Worked. Why am I in settings?"

Uses short join code; same redirect problem.

### Captain
> "I gave them the QR. They texted me a screenshot of **Hall Pro** and **Manage members**. They haven't even voted on tacos yet."

Join → settings exposes billing, analytics paywalls, member management — captain context dumped on probie.

### Canteen manager / Hall cook
Same join paths. Role assignment isn't explained at join — they discover permissions later on canteen or shopping list.

---

## 4. Generate meal

### Hall cook (hero flow)
> "Filters, Generate, recipe — that part slaps. Crew size 10, done. But I'm at the stove and Cook Mode is a button I have to hunt for. And the email popup after my second meal? Brother, I'm holding a spatula."

**URL:** `/generator` (also `/hall` → "Pick meal")

**Steps:** Filters (localStorage) → validate appliances → Generate (1.5s debounce) → `RecipeCard` → shopping list modal / hall vote modal / save / cook mode.

| Issue type | What happens |
|------------|--------------|
| **Confusion** | "AI" expectation vs curated matcher — trust wobble when options feel similar. |
| **Unnecessary step** | First-visit tip banner + filter panel before first win on cold open. |
| **Feels slow** | 50s timeout window; rare but scary on station Wi‑Fi. |
| **Feels like a website** | Left sidebar filters on desktop; meal-focus mode helps mobile but recipe still reads like a blog post until Cook Mode. |
| **Feels cheap** | `HallVotePromoBanner` and earned `EmailModal` after generation — growth mechanics on a cook in a hurry. |

### Senior
> "Wheel's faster. Generator's fine. Don't ask me for my email."

Uses generator or wheel; ignores hall layer.

### Probie
> "It said pick at least one appliance. What's a combi oven? I picked oven. It worked."

Appliance validation blocks generate — correct but jargon-heavy for probie.

### Captain
Uses generator occasionally; cares more that crew can vote after. No auth required — good.

---

## 5. Vote

### Hall cook
> "Started vote from the recipe — nice. Shared link in group chat. Half the guys got a plain page with no header. They thought it was a phishing link."

**Create:** `HallVoteModal` from generator, wheel, `/hall` quick action, shift dashboard, activation step 4.  
**Participate:** `/vote/:voteId` — minimal chrome, live bars, 3s poll.

| Issue type | What happens |
|------------|--------------|
| **Confusion** | Vote page looks like a different product (no site header). |
| **Unnecessary step** | Create flow needs ≥2 options; single recipe adds synthetic "Try another direction" — weird on the ballot. |
| **Duplicate flow** | Start vote from: hall dashboard, generator banner, wheel banner, shift page, onboarding — same modal, no "last vote" shortcut. |
| **Feels like a website** | QR + copy link + open results — three tools when one "send to crew" should suffice. |

### Probie
> "I voted. Bars moved. Cool. How do I get to the rest of the app?"

Vote page is a dead end — no path back to hall or recipe.

### Senior
> "Says I already voted. I switched phones. Whatever."

Fingerprint-based one-vote — correct for fraud, confusing for shared hall iPad.

### Captain
> "Who closed the vote? Says only creator can close. That was the probie on the shared tablet."

Session-bound close permission — operational fragility.

---

## 6. Wheel

### Senior
> "Spin, laugh, cook. This is the one I'd show the truck."

**URL:** `/wheel` (`/classics-wheel` redirects)

**Steps:** Ready → spin → reveal → Cook / Explore / Pin → `HallVoteFlow` banner → optional vote modal.

| Issue type | What happens |
|------------|--------------|
| **Confusion** | "Explore" vs "Cook" — two doors after the drama of the spin. |
| **Feels like an app** | Haptics, streak panel, suspense copy — **best app-feeling surface in the product**. |
| **Feels like a website** | Vote banner after reveal adds another decision layer before cooking. |

### Hall cook
Uses wheel for tie-breaks; wants winner to open **Cook Mode** directly, not recipe blog layout.

### Probie
Loves it. No account needed. Streak is local — probie doesn't know that and thinks hall sees it.

### Captain
Wishes wheel outcome logged to hall history automatically — today it's mostly personal/local unless they vote.

---

## 7. Shopping list

### Hall cook
> "Personal list from the recipe — great. 'Add to hall list' — where's the hall list? It dumped me on **settings** with a scroll to a hash anchor. On my phone I thought it was broken."

**Personal:** `ShoppingListModal` on generator/recipe — copy, print, email, add to hall (if signed in + `activeHallId`).

**Hall shared:** `/halls/:hallId#hall-shared-shopping-list` — behind sign-in, membership, **Hall Pro** (`PaywallGate`).

| Issue type | What happens |
|------------|--------------|
| **Confusion** | No `/hall/shopping` route — hash anchor on settings page. |
| **Confusion** | "Add to hall list" visible without Hall Pro; panel then paywalled. |
| **Duplicate flow** | Personal list (modal) vs hall list (settings anchor) vs shift shopping card — three surfaces. |
| **Unnecessary step** | Captain must enable Hall Pro before shared list works — cook can't tell crew what to buy. |
| **Feels like a website** | PDF export, SMS, copy — office tools, not "check off in aisle 7." |
| **Feels slow** | Navigate settings → scroll to anchor → hit paywall → message captain → back later. |

### Probie
Assigned "grocery runner" without understanding roles — can check items if `can_contribute`; can't mark run complete.

### Captain
> "I enabled Pro for the list. Crew still uses a paper list on the fridge because the link says `halls/ uuid`." 

### Canteen manager
Wants shopping list near canteen shortages — today they're separate cards (`HallSupplyShortagesCard` → canteen, shopping → settings).

---

## 8. Canteen

### Canteen manager
> "Main canteen page is good when it loads. But half our reports happen from the shift page modal I'd never find if nobody showed me. And guests see 'No canteen data' — why is guest even an option?"

**View/manage:** `/hall/canteen` — Needs Attention, Running Low, Out, Requested, Restocked.  
**Report:** `/hall/:hallId/shift/:shiftId` → `ReportCanteenItemModal` (not linked from canteen page).

| Issue type | What happens |
|------------|--------------|
| **Confusion** | Reporting lives on shift dashboard; managing lives on canteen page — split brain. |
| **Confusion** | `HallPermissionGate` allows guest → empty state instead of sign-in prompt. |
| **Unnecessary step** | Signed in but no hall → `CanteenLocked` → `/hall/join` (not create-hall or pick hall). |
| **Feels like a website** | Status columns read like a CRM, not "coffee's out" push urgency. |
| **Feels slow** | Manager must refresh page for crew reports; no live feel. |

### Hall cook
Reports "out of onions" from shift view when prepping — may never visit `/hall/canteen`.

### Probie
Can report from shift modal if someone points them there; won't discover it alone.

### Captain
Sees shortages card on `/hall` dashboard — good teaser; "View list" goes to canteen, not to assign a buyer.

---

## 9. Profile

### Probie
> "Account page has my name, shift, protein prefs… and **Create a hall** right next to **Join with code**. I almost made a second hall."

**URL:** `/account`

**Sections:** Feature pills → `AccountProfileForm` → Your halls → Create + Join panels → Plans / My Hall / Sign out.

| Issue type | What happens |
|------------|--------------|
| **Confusion** | Profile "hall name" is personal metadata, not the shared hall entity. |
| **Duplicate flow** | Create/join also on account, funnel, `/hall/join`, hall dashboard CTAs. |
| **Unnecessary step** | Manual Save on profile — no auto-save; easy to lose chip selections. |
| **Feels like a website** | Feature pills ("Sync saves," "Join halls," "Hall Pro") read like pricing page badges. |
| **Feels cheap** | Hall Pro pill says "Invite only" with no explanation of who invites whom. |

### Senior
Updates protein prefs once; never returns unless sign-out.

### Captain
Uses account for hall list links to settings — wishes one "Captain console" instead of account + hall settings + billing panel.

### Canteen manager
Role not visible on profile — only discovered via what buttons appear on canteen page.

---

## 10. Hall Pro

### Captain
> "Start trial — no charge during preview. OK… but where's the card? It says enable on hall page. I enabled it. Crew says deals still locked. Do I need to do it per person?"

**Location:** `HallProAdminPanel` at top of `/halls/:hallId`.  
**Unlocks (UI):** Shared favorites, hall history, supplies, shared shopping, analytics, meal calendar, badges, shift reports, protein deals.

| Issue type | What happens |
|------------|--------------|
| **Confusion** | Hall Pro is **per hall**, not per user — `/plans` personal tiers add noise. |
| **Confusion** | "No charge during preview" — no Stripe, no receipt, no trust anchor. |
| **Duplicate flow** | Paywall on each feature (supplies, shopping, analytics, protein deals) vs one Pro toggle. |
| **Feels cheap** | Trial/enable buttons work in DB only; feels like a feature flag, not a purchase. |
| **Feels like a website** | Feature bullet list marketing on settings page, not in-context upgrade at moment of need. |

### Canteen manager
> "Supplies panel locked. Captain enabled Pro. Works. Why did I need the captain for coffee tracking?"

Hits `PaywallGate` on hall supplies — operational feature behind admin billing role.

### Probie / Hall cook
See locked panels with "Ask your captain" — correct message, wrong page (settings, not dashboard).

### Senior
Never sees Hall Pro — uses free generator/wheel. Fine.

---

# Cross-cutting findings

## Confusion (top 10)

| # | Moment | Who hits it hardest |
|---|--------|---------------------|
| 1 | Join lands on `/halls/:id` (settings) not `/hall` (dashboard) | Probie, Captain |
| 2 | Magic link loses invite URL; OAuth keeps it | Probie |
| 3 | Two create-hall forms (minimal funnel vs full account) | Captain |
| 4 | Hall shopping list is a hash on settings, not a route | Hall cook |
| 5 | "Add to hall list" then Hall Pro paywall | Hall cook |
| 6 | Personal profile "hall name" ≠ crew hall | Probie |
| 7 | Vote page looks off-brand / phishing-adjacent | Probie, Senior |
| 8 | Canteen report on shift page vs manage on canteen page | Canteen mgr |
| 9 | Hall Pro per-hall vs plans page per-user | Captain |
| 10 | Guest mode works for meals but hall dashboard teases locked features | Probie |

## Unnecessary steps

| Step | Where | Better |
|------|-------|--------|
| Funnel step 3 forced share before continue | Activation | Optional for joiners; skippable for in-person crew |
| Account create → full shift editor before members exist | `/account` | Defaults first; edit later in settings |
| Post-join shift + invite + vote when joining existing hall | Funnel | Join-only fast path → `/hall` |
| Email modal after N generations | Generator | Defer until save or explicit opt-in |
| Second join form on `/hall/join` when token valid | Join page | Hide manual section after preview join |
| Navigate settings → scroll to `#hall-shared-shopping-list` | Shopping | `/hall/shopping` from dashboard tile |
| Hall-program sign-in without `?create_hall=1` | Marketing | Preserve intent through auth |
| Close vote only on creator session | Vote | Captain/shift role can close |

## Duplicate flows

```
SIGN UP
  ├─ Magic link → /account (drops context)
  ├─ Google/Apple → stay on page
  └─ Guest → no account

CREATE HALL
  ├─ Funnel step 1 (2 fields) → /hall
  ├─ /account?create_hall=1 (full form) → /halls/:id
  └─ /account manual expand → /halls/:id

JOIN HALL
  ├─ /hall/join?token → /halls/:id
  ├─ Funnel join → shift/invite/vote → /hall
  ├─ /account join panel → /halls/:id
  └─ Header "Join hall" → /hall/join

START VOTE
  ├─ /hall quick action
  ├─ Generator promo / recipe card
  ├─ Wheel reveal banner
  ├─ Shift dashboard
  └─ Onboarding step 4

SHOPPING
  ├─ Personal modal (recipe)
  ├─ Hall hash on /halls/:id
  └─ Shift shopping card

BROWSE MEALS (bonus pain)
  ├─ /generator
  ├─ /wheel
  ├─ /explore
  ├─ /recipes
  └─ Homepage rails
```

## Feels cheap

| Surface | Why |
|---------|-----|
| Magic link errors swallowed on `/account` | Looks broken, not "link expired" |
| Hall Pro "preview" billing with no payment | Feature flag cosplay |
| Paywall on ops tools (canteen supplies, shopping) | Crew thinks app is half demo |
| Synthetic vote option "Try another direction" | Ballot filler |
| `HallFeatureLocked` dashed border cards on dashboard | Placeholder energy for guests |
| Email capture after cooking | Bait-and-switch on a recipe site |
| "Invite only" on Hall Pro pill | Vague exclusivity, no action |
| Protein deals "integration coming soon" in disabled mode | Shipped shelf with empty boxes |
| Guest canteen "No canteen data" | Unfinished instead of intentional |

## Feels slow

| Surface | Why |
|---------|-----|
| Magic link round-trip | Leave app, email, return, maybe funnel |
| Full `CreateHallForm` before first crew join | Captain desk time |
| Hash navigation to shopping on mobile | Scroll hunt on long settings page |
| Paywall → find captain → enable Pro → reload | Multi-shift delay for shared list |
| Generator filter panel before first meal | Time-to-first-recipe |
| Explore / homepage rails | Five browse paths to same catalog |
| 50s generate timeout | Anxiety on bad Wi‑Fi |
| OAuth cloud sync on sign-in | Invisible wait before interaction |

## Feels like a website (not an app)

| Surface | Website signal | App would |
|---------|----------------|-----------|
| Homepage | SEO sections, FAQ, multiple "Find a Meal" CTAs | Open to last hall shift or tonight's meal |
| `/halls/:id` after join | Admin settings, billing, analytics | Crew dashboard `/hall` |
| Recipe pages | Blog layout, Cook Mode below fold | Stove-first full screen |
| `/account` | SaaS account center | Profile sheet, not a destination |
| `/plans` | Pricing page | In-context upgrade at lock |
| Vote `/vote/:id` | Orphan landing page | In-app sheet with hall context |
| Explore | Filters before food | Decision in 1 tap |
| Shopping list | Print/PDF/email | Shared checklist with live ticks |
| Navigation | Header links across content site | Bottom nav: Hall · Cook · Vote · List |
| PWA | Installable but no offline cook | Cache tonight's recipe + list |

---

# What each role would say (closing quotes)

**Probie:** "The wheel's fun. Joining felt like I signed up for payroll software. Just put me where the crew picks dinner."

**Senior:** "Don't make me create an account to vote. Generator works. Stop emailing me."

**Hall cook:** "Give me generate → vote → list → cook mode in one line. Everything else is captain stuff."

**Canteen manager:** "Shortages and shopping are the same trip. Put report on the canteen page and ping me when coffee's out."

**Captain:** "I'll do setup once — but send my crew to `/hall`, not billing. And either charge me for Pro or don't pretend."

---

# Priority fixes (journey-derived)

Aligned with [product-audit-v3.md](./product-audit-v3.md) P0s — ordered by how many personas benefit:

| Priority | Fix | Personas helped |
|----------|-----|-----------------|
| P0 | Join/create → land on `/hall`, not `/halls/:id` | All |
| P0 | Unify onboarding: one join path, one create path, preserve invite through magic link | Probie, Captain |
| P0 | `/hall/shopping` (or dashboard inline list) — kill hash on settings | Hall cook, Canteen mgr |
| P0 | Cook Mode default on recipe open from hall flows | Hall cook |
| P1 | Join-only funnel shortcut (skip invite step for joiners) | Probie, Senior |
| P1 | Canteen report entry on `/hall/canteen` | Canteen mgr |
| P1 | Vote page hall chrome + return link | Probie, Senior |
| P1 | Hall Pro upgrade at paywall moment with real checkout | Captain |
| P1 | Collapse browse paths; hall dashboard as app home | Senior, Hall cook |

---

*End of journey document.*
