# Firehall Meals — Red Lead Klaviyo Onboarding (Launch v2)

**Use this doc for:** Klaviyo flow build, copy-paste into templates, QA before send, and post-launch segmentation.  
**Product truth (May 2026):** Trigger = **Lead Magnet Downloaded** (`lead_magnet` = `red-lead-recipe`). Site: `https://www.firehallmeals.com`.

---

## Objective

Increase **opens**, **CTR**, **return visits**, **generator usage**, and **breakfast engagement** — not PDF re-downloads.

**Voice:** Built by Firefighters. Tested in the Firehall.  
**Tone:** Authentic, firefighter-focused, conversational, useful. Not newsletter-style. Not marketing-heavy.

---

## Flow setup (Klaviyo)

| Setting | Value |
|--------|--------|
| **Flow name** | Lead Magnet — Red Lead Onboarding v2 |
| **Trigger** | Metric: **Lead Magnet Downloaded** |
| **Trigger filter** | `lead_magnet` equals `red-lead-recipe` |
| **List** | Firehall Dinner Generator Leads |

### Timing (anchor all delays to flow trigger)

| Email | Day | Subject |
|-------|-----|---------|
| 1 | 0 | You're set on Red Lead — here's the hall |
| 2 | 2 | 5 Firehall Breakfasts Every Crew Should Know |
| 3 | 5 | Most Popular Firehall Meals This Week |
| 4 | 7 | What Should We Cook Tonight? |
| 5 | 14 | What Should We Build Next? |

---

## UTM pattern (every link)

```
?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-{N}-{cta}
```

| Email | `{N}` | Example `{cta}` values |
|-------|------|-------------------------|
| 1 | 1 | `breakfast`, `pdf`, `generator`, `wheel`, `home` |
| 2 | 2 | `breakfast-index`, `burritos`, `hash`, `chorizo-hash`, `omelette`, `red-lead` |
| 3 | 3 | `generator`, `recipes`, `smash-burgers`, `big-chili`, `chicken-parm` |
| 4 | 4 | `generator`, `wheel` |
| 5 | 5 | `reply`, `home` |

**Base URL helper:**

```
https://www.firehallmeals.com{path}?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-{N}-{cta}
```

---

## CTA structure summary

| Email | Primary CTA | Secondary CTA |
|-------|-------------|---------------|
| 1 | Browse Firehall Breakfasts → `/breakfast` | Download the PDF |
| 2 | Browse All Breakfast Recipes → `/breakfast` | — (recipe links inline) |
| 3 | Find a Meal → `/generator` | Browse Recipes → `/recipes` |
| 4 | Find a Meal → `/generator` | Spin the Classics Wheel → `/wheel` |
| 5 | Reply to this email | Browse Firehall Meals → `/` |

---

## Email 1 — Day 0 (Immediately)

**Subject:** You're set on Red Lead — here's the hall  

**Preview text:** PDF confirmed. Browse breakfasts, spin the wheel, or find tonight's meal.

### Body

Hey,

You're in — **your Red Lead PDF is saved** (same 5-page hall card from the site).

Quick reminder: **Red Lead is the tomato sauce** in the middle of the table. Bacon, eggs, sausage, toast, potatoes, and coffee go around it. You cook those separately.

**Firehall Meals** is where crews browse hall-sized recipes, pick dinner fast, and stop arguing about what's on the board.

**Start here:**
- **Breakfast Collection** — Sunday shift staples, crew portions  
- **Find a Meal** — set crew size, protein, and time; get a pick in seconds  
- **Classics Wheel** — spin a hall classic when nobody can decide  

**[Browse Firehall Breakfasts](https://www.firehallmeals.com/breakfast?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-1-breakfast)** ← primary button

Need the file again? **[Download the PDF](https://www.firehallmeals.com/downloads/the-official-firehall-red-lead-recipe.pdf?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-1-pdf)**

Quick links: [Find a Meal](https://www.firehallmeals.com/generator?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-1-generator) · [Classics Wheel](https://www.firehallmeals.com/wheel?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-1-wheel)

Built by Firefighters. Tested in the Firehall.

— The Firehall Meals crew

[FirehallMeals.com](https://www.firehallmeals.com?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-1-home) · [Unsubscribe]({{ unsubscribe_url }})

---

## Email 2 — Day 2

**Subject:** 5 Firehall Breakfasts Every Crew Should Know  

**Preview text:** Five Sunday staples — burritos, hash, omelette bar, and Red Lead.

### Body

Hey,

Red Lead handled the sauce pan. Here are **five breakfasts** crews actually run when the table's full.

**[Hall Breakfast Burritos](https://www.firehallmeals.com/breakfast/hall-breakfast-burritos?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-2-burritos)** — Wrap it, hold it on the line, reheat clean between calls.

**[Bacon Egg Hash Skillet](https://www.firehallmeals.com/breakfast/bacon-egg-hash-skillet?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-2-hash-skillet)** — Cast iron, crispy potatoes, eggs — the default when the crew's hungry now.

**[Chorizo Breakfast Hash](https://www.firehallmeals.com/breakfast/chorizo-breakfast-hash?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-2-chorizo-hash)** — Bold flavor at 6 AM without a complicated setup.

**[Fire Captain Omelette Bar](https://www.firehallmeals.com/breakfast/fire-captain-omelette-bar?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-2-omelette-bar)** — Let the crew build their own plate while you keep the line moving.

**[Firefighter Red Lead](https://www.firehallmeals.com/firefighter-red-lead-recipe?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-2-red-lead)** — Full sauce recipe, hall tradition, and how to serve it on the table.

**[Browse All Breakfast Recipes](https://www.firehallmeals.com/breakfast?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-2-breakfast-index)** ← primary button

Built by Firefighters. Tested in the Firehall.

— The Firehall Meals crew

[FirehallMeals.com](https://www.firehallmeals.com?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-2-home) · [Unsubscribe]({{ unsubscribe_url }})

---

## Email 3 — Day 5

**Subject:** Most Popular Firehall Meals This Week  

**Preview text:** Three crew favorites — then let Find a Meal pick dinner for you.

### Body

Hey,

Breakfast isn't the only meal that starts a debate at the table.

**Most popular on Firehall Meals this week:**

**[Double Smash Burgers](https://www.firehallmeals.com/recipes/smash-burgers?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-3-smash-burgers)** — Crispy edges, melty cheese, line-friendly for a hungry crew.

**[Hall-Sized Beef and Bean Chili](https://www.firehallmeals.com/recipes/big-chili?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-3-big-chili)** — Double pot energy when you need to feed the whole hall.

**[Chicken Parm](https://www.firehallmeals.com/recipes/chicken-parm?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-3-chicken-parm)** — Italian night spread that everyone recognizes on the plate.

**Still debating dinner?**

Set crew size, protein, and time — **Find a Meal** gives you a crew-sized pick in seconds. No scrolling. No 20-minute argument.

**[Find a Meal](https://www.firehallmeals.com/generator?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-3-generator)** ← primary button

**[Browse Recipes](https://www.firehallmeals.com/recipes?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-3-recipes)** ← secondary link

Built by Firefighters. Tested in the Firehall.

— The Firehall Meals crew

[FirehallMeals.com](https://www.firehallmeals.com?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-3-home) · [Unsubscribe]({{ unsubscribe_url }})

---

## Email 4 — Day 7

**Subject:** What Should We Cook Tonight?  

**Preview text:** Crew size + protein + time = dinner decided. Try Find a Meal.

### Body

Hey,

Same question every shift: **"What are we cooking?"**

Firehall Meals exists to kill that debate.

**Three inputs:**
- **Crew size** — how many plates  
- **Protein** — what's in the fridge or what the crew wants  
- **Time** — how long you've actually got before people get hungry  

**Find a Meal** matches you with a hall-sized recipe in seconds — portions and steps written for a station kitchen, not a food blog.

**[Find a Meal](https://www.firehallmeals.com/generator?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-4-generator)** ← primary button

Deadlocked anyway? **Spin the Classics Wheel** — whatever lands is what you cook.

**[Spin the Classics Wheel](https://www.firehallmeals.com/wheel?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-4-wheel)** ← secondary link

Built by Firefighters. Tested in the Firehall.

— The Firehall Meals crew

[FirehallMeals.com](https://www.firehallmeals.com?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-4-home) · [Unsubscribe]({{ unsubscribe_url }})

---

## Email 5 — Day 14 (NEW)

**Subject:** What Should We Build Next?  

**Preview text:** Built by firefighters — tell us what's missing.

### Body

Hey,

Firehall Meals is **built by firefighters, for firefighters** — not a generic recipe site.

We're always improving what goes on the board. **Hit reply** and tell us:

- What recipes are missing from your hall?  
- What would actually help on shift?  
- What annoys you about meal planning or recipe sites?  
- What should we build next?  

One sentence is fine. A rant is fine. We read every reply.

**Reply to this email** ← primary action (no button needed; use `mailto:` or Klaviyo reply-to)

Or jump back on the site: **[Browse Firehall Meals](https://www.firehallmeals.com?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-5-home)** ← secondary link

Built by Firefighters. Tested in the Firehall.

— The Firehall Meals crew

[FirehallMeals.com](https://www.firehallmeals.com?utm_source=klaviyo&utm_medium=email&utm_campaign=red-lead-onboarding&utm_content=email-5-home) · [Unsubscribe]({{ unsubscribe_url }})

**Klaviyo setup:** Set flow reply-to to a monitored inbox (e.g. `hello@firehallmeals.com`). Tag profiles who reply with `feedback_responded`.

---

## Link QA (verified May 2026)

| Link | Path | Status |
|------|------|--------|
| PDF | `/downloads/the-official-firehall-red-lead-recipe.pdf` | ✓ |
| Red Lead page | `/firefighter-red-lead-recipe` | ✓ |
| Breakfast index | `/breakfast` | ✓ |
| Hall Breakfast Burritos | `/breakfast/hall-breakfast-burritos` | ✓ |
| Bacon Egg Hash Skillet | `/breakfast/bacon-egg-hash-skillet` | ✓ |
| Chorizo Breakfast Hash | `/breakfast/chorizo-breakfast-hash` | ✓ |
| Fire Captain Omelette Bar | `/breakfast/fire-captain-omelette-bar` | ✓ |
| Double Smash Burgers | `/recipes/smash-burgers` | ✓ |
| Hall-Sized Chili | `/recipes/big-chili` | ✓ |
| Chicken Parm | `/recipes/chicken-parm` | ✓ |
| Find a Meal | `/generator` | ✓ |
| Browse Recipes | `/recipes` | ✓ |
| Classics Wheel | `/wheel` | ✓ |
| Home | `/` | ✓ |

---

## Pre-launch QA checklist

### Content & links
- [ ] All URLs open on mobile (iOS Mail, Gmail app, Android)
- [ ] UTMs present on every link (including footer home link)
- [ ] Primary CTA is a button; secondary is text link
- [ ] Email 1 primary = `/breakfast` (not PDF)
- [ ] Email 5 reply-to inbox monitored

### Klaviyo compliance
- [ ] `{{ unsubscribe_url }}` in every template footer
- [ ] Physical mailing address block (Klaviyo organization settings)
- [ ] From name: **Firehall Meals** (or consistent brand sender)
- [ ] Preview text set in preheader for each email

### Rendering
- [ ] Mobile: single column, 16px+ body, tappable buttons (min 44px height)
- [ ] Dark mode: test in Apple Mail dark mode — logo and buttons remain readable
- [ ] No broken images (text-first design; minimal hero images recommended)
- [ ] Link contrast passes in light and dark mode

### Analytics
- [ ] GA4 receives `utm_campaign=red-lead-onboarding` events
- [ ] Klaviyo flow analytics: open rate, click rate, placed order (if applicable) per email
- [ ] Tag profiles on click: `clicked_email_1_breakfast`, `clicked_email_3_generator`, etc. (optional)

---

## Segmentation recommendations

Apply tags or list splits based on onboarding behavior + product events.

| Segment | Definition | Next flow |
|---------|------------|-----------|
| **Breakfast engaged** | Clicked Email 1 or 2 breakfast links; or visited `/breakfast` with UTM | Breakfast spotlight drip; Sunday shift reminders |
| **Generator curious** | Clicked Email 3 or 4 generator link; no `Recipe Generated` yet | Short "try your first pick" nudge (1 email, day 3 after click) |
| **Generator active** | `Recipe Generated` event (1+ times) | Saved-meal tips, shopping list intro, classics wheel |
| **Shopping list user** | `Shopping List Requested` event | Grocery / prep-day content; repeat-meal suggestions |
| **Highly engaged** | Opened 4+ onboarding emails + 2+ site clicks | Early access to new recipes; feedback invites (Email 5 cohort) |
| **Cold after onboarding** | No opens on Emails 3–5 | Re-engagement: single "Find a Meal in 30 seconds" email at day 21 |
| **Feedback replied** | Replied to Email 5 | Manual review queue; tag `product_feedback` |

**Profile properties to set from site events (already fired server-side):**

| Event | Suggested Klaviyo property |
|-------|---------------------------|
| Lead Magnet Downloaded | `lead_magnet` = `red-lead-recipe`, `lead_source` = `red-lead-page` |
| Recipe Generated | `last_recipe_generated`, increment `recipes_generated_count` |
| Shopping List Requested | `last_shopping_list_at`, `shopping_list_user` = true |

---

## Future event-driven flows (post-onboarding)

Build these **after** onboarding v2 is live. Do not duplicate onboarding content.

| Trigger | Flow name | Goal | Timing |
|---------|-----------|------|--------|
| **Lead Magnet Downloaded** | Red Lead Onboarding v2 | Return visits, breakfast, generator | Days 0 / 2 / 5 / 7 / 14 (this doc) |
| **Recipe Generated** | First meal picked | Shopping list + save tips | +1 hour after first event |
| **Recipe Generated** (3+) | Power user | Classics wheel, explore rails | +3 days after 3rd event |
| **Shopping List Requested** | List sent | Confirm + related meals | Immediately |
| **Homepage Subscriber** (future) | Welcome (non–Red Lead) | Generator + explore intro | Day 0 / 3 / 7 |
| **Lead Magnet Downloaded** + no `Recipe Generated` in 14d | Generator nudge | One email: Find a Meal | Day 14 (parallel to Email 5 or replace for non-repliers) |

**Exit rules:** Suppress promotional flows if profile unsubscribes or marks spam. Cap to 2 marketing emails per week outside transactional.

---

## Expected improvements (v1 → v2)

| Metric | v1 issue | v2 change | Expected impact |
|--------|----------|-----------|-----------------|
| **Open rate** | Email 1 subject = PDF delivery (already done) | Subject = "here's the hall" + curiosity | Higher opens on Email 1 |
| **CTR** | Email 1 primary = PDF re-download | Primary = `/breakfast` | More site sessions; less dead-end PDF clicks |
| **Return visits** | Heavy recipe lists (10+ links) | 5 recipes max; product links early | Fewer choices → more clicks per link |
| **Generator usage** | Generator buried in Email 4 | Email 3 primary CTA = generator | Earlier generator trials (day 5 vs day 7) |
| **Breakfast engagement** | Breakfast list in Email 2 only | Email 1 introduces breakfast collection | Breakfast traffic from day 0 |
| **Reply / feedback** | None | Email 5 at day 14 | Qualitative product input; engaged segment identification |
| **List fatigue** | 4 emails, long bodies | 5 shorter emails, one job each | Better completion rate through sequence |

**Benchmark targets (30 days post-launch — adjust to your baseline):**

- Email 1 CTR to site: **>8%** (vs PDF-only flows typically 2–4%)
- Email 3 generator clicks: **>5%** of recipients
- Onboarding-to-generator conversion: **>10%** of Red Lead leads generate at least one meal within 30 days

---

## Klaviyo build checklist

- [ ] Metric **Lead Magnet Downloaded** exists (`POST /api/lead-magnet/red-lead`)
- [ ] Trigger filter: `lead_magnet` = `red-lead-recipe`
- [ ] Delays from trigger: Day 0 / 2 / 5 / 7 / 14
- [ ] All templates use copy above with UTMs
- [ ] Email 1 button → `/breakfast`; PDF as text link only
- [ ] Email 5 reply-to configured; feedback tag on reply
- [ ] Send test to real firehall inboxes; click every link on phone
- [ ] Archive or pause v1 flow before enabling v2

---

## Optional personalization (later)

If capture adds first name: `Hey {% if first_name %}{{ first_name }}{% else %}there{% endif %},`

If profile has `recipes_generated_count` > 0 before Email 4: swap opener to "You've already picked a meal — here's the fastest way to pick the next one."
