# Digital Hall Whiteboard — Product Design

**Status:** Design only — do not implement until approved  
**Date:** 2026-07-17  
**Depends on:** `review/hall-operations-design.md`  
**Role in product:** First screen when entering Hall Operations — the digital kitchen whiteboard + station bulletin board.

> **v2 rethink (prefer):** Ruthless “need to know now” board — thinner Tonight, no activity feed, auto pulses — see [`review/whiteboard-v2.md`](./whiteboard-v2.md). This v1 doc remains useful for historical detail; do not implement the dense note taxonomy without reconciling v2 cuts.

---

## 1. What this is

The Digital Hall Whiteboard replaces:

- The dry-erase board above the sink  
- The cork board by the fridge  
- The sticky notes that fall behind the toaster  

It is **not** Slack, **not** Facebook, **not** a feed to scroll forever.

It is a **station bulletin board**: glanceable, finite, ordered by what matters tonight and this week — then quiet.

**Success:** A firefighter opens Hall → sees the board → knows dinner, who’s shopping, what’s broken, and what’s pinned — in under ten seconds.

---

## 2. Design principles

1. **Bulletin board, not social network** — no infinite scroll, no follower graph, no “create a post” vanity.  
2. **Kitchen first** — dinner / cook / runner / hold live at the top, always.  
3. **Finite surface** — pins + today’s notes + this week; older stuff archives.  
4. **Few taps** — post a reminder in ≤3 taps; react in 1.  
5. **Station voice** — “Out of propane,” not “Status update.”  
6. **Ephemeral by default** — most notes expire; the board stays clean.  
7. **Engagement without addiction** — useful returns, not dopamine loops.  
8. **Private hall only** — never indexed; never public.

---

## 3. Screen architecture (first screen of Hall Ops)

### 3.1 Layout (phone, top → bottom)

```
┌─────────────────────────────────────────┐
│ Hall name · motto                        │
├─────────────────────────────────────────┤
│ TONIGHT (whiteboard strip)               │  ← always visible
│ Dinner · Cook · Runner · Head count      │
│ Hold note · Status chip                  │
├─────────────────────────────────────────┤
│ NEEDS A PULSE (optional 0–2 chips)       │  ← out of coffee, dues, vote
├─────────────────────────────────────────┤
│ PINNED                                   │  ← max 3–5
├─────────────────────────────────────────┤
│ TODAY / ACTIVE NOTES                     │  ← typed cards
├─────────────────────────────────────────┤
│ THIS WEEK                                │  ← events, BBQ, training
├─────────────────────────────────────────┤
│ [ + Post ]                               │  ← primary FAB / button
└─────────────────────────────────────────┘
```

No stories. No stories rings. No “For You.” No suggested friends.

### 3.2 Tonight strip = classic whiteboard

Structured fields (from Hall Ops Board design):

| Field | Example |
|-------|---------|
| Dinner | Big Chili → recipe link |
| Status | Voting · Locked · Cooking · Fed |
| Cook | Sam |
| Runner | Mike |
| Head count | 10 (+2 drop-ins) |
| Hold | “Covered, 200° oven” |

**This strip is not a “note.”** It is the permanent top of the board — editable by cook/runner/managers, written by vote lock.

Everything below is the **bulletin**.

---

## 4. Note taxonomy

### 4.1 Topics (what the note is about)

Multi-select chips when composing; filter chips when browsing.

| Topic | Examples |
|-------|----------|
| **Announcements** | Captain notices, policy, fridge clean-out |
| **Kitchen Notes** | Leftovers labeled, don’t use that pan |
| **Shopping Notes** | “Grab cilantro if you go,” runner tips |
| **Maintenance Reminders** | Dishwasher drain, hood filter due |
| **Upcoming Events** | Open house, mutual aid feed |
| **Shift Notes** | A-shift / B-shift handoff |
| **Equipment Notes** | Smoker down, thermometer missing |
| **Training Notes** | Recruits on drill night — feed 16 |
| **Birthdays** | “Jasper turns 40 Thursday” |
| **Hall BBQ** | Saturday smoke — bring a side |
| **Retirements** | Cake Friday, dress uniform |
| **Congratulations** | Promotion, baby, award |

Topics are **labels**, not separate apps.

### 4.2 Note types (intent of the card)

| Type | Purpose | Default UI |
|------|---------|------------|
| **Information** | FYI | Body + optional photo |
| **Question** | Needs an answer | Body + “Answers” thread (light) |
| **Suggestion** | Idea for the hall | Body + 👍/👎 style reactions |
| **Reminder** | Time-bound nudge | Expiry required; shows countdown |
| **Poll** | Quick crew choice | 2–4 options; not full Hall Vote |
| **For Sale** | Hall merch / personal gear | Price optional; “Sold” closes |
| **Wanted** | Looking for item/help | “Still needed” / “Filled” |
| **Lost & Found** | Missing / found gear | Photo encouraged |

**Poll vs Hall Vote:** Board polls are lightweight (BBQ side dish, movie). Dinner decisions stay in **Tonight / Hall Vote**.

---

## 5. Note fields

Every note supports:

| Field | Required | Notes |
|-------|----------|-------|
| **Type** | ✓ | Information, Question, … |
| **Topics** | ≥1 | Chips |
| **Title** | ✓ | Short; whiteboard handwriting length |
| **Body** | | Optional if photo+title enough |
| **Priority** | ✓ | `normal` · `important` · `urgent` |
| **Expires** | ★ | Required for Reminder; default 7 days for most types |
| **Pinned** | | Captain / canteen mgr; max pins enforced |
| **Author** | ✓ | Member display name + role badge optional |
| **Attachments** | | PDF / doc rare; prefer photo |
| **Photo** | | One primary image (phone camera) |
| **Emoji reactions** | | Small fixed set — see §8 |
| **Comments** | Optional | Off by default for Information; on for Question |

★ **Expiry is the hygiene system.** Expired notes leave Active and land in Archive (searchable by managers).

### 5.1 Priority display

| Priority | Visual |
|----------|--------|
| Normal | Default card |
| Important | Subtle left rail / label “Important” |
| Urgent | Strong rail + sits above other non-pinned actives |

Urgent is for “walk-in warm” and “gas smell reported” energy — not birthday spam. Soft-rate-limit urgent posts per day for non-captains.

---

## 6. Compose flow (few taps)

1. Tap **+ Post**  
2. Pick **Type** (big buttons)  
3. Pick **Topic** chips (1–2)  
4. Title → optional photo → Post  

Advanced (collapsed): priority, expiry, pin (if allowed), attach.

**Templates (one-tap starters)**

- “Out of ___” → Equipment / Kitchen + Reminder  
- “Birthday: ___” → Birthdays + Information + expiry end-of-day  
- “BBQ ___” → Hall BBQ + Event date  
- “For sale: ___” → For Sale  

---

## 7. Permissions

| Action | Member | Cook/Runner* | Canteen mgr | Captain |
|--------|:------:|:------------:|:-------------:|:-------:|
| View board | ✓ | ✓ | ✓ | ✓ |
| Post note | ✓ | ✓ | ✓ | ✓ |
| React | ✓ | ✓ | ✓ | ✓ |
| Comment (when enabled) | ✓ | ✓ | ✓ | ✓ |
| Edit own note | ✓ | ✓ | ✓ | ✓ |
| Pin / unpin | | | ✓ | ✓ |
| Mark Urgent | limited | limited | ✓ | ✓ |
| Delete any note | | | ✓ | ✓ |
| Edit Tonight strip | | ✓ | ✓ | ✓ |
| Lock dinner on strip | | | ✓ | ✓ |

\*While assigned

**Free vs Hall Pro (recommendation)**

| Capability | Free linked hall | Hall Pro |
|------------|------------------|----------|
| Tonight strip | ✓ | ✓ |
| Active notes | ✓ (soft cap, e.g. 25 active) | Unlimited |
| Pins | 2 | 5 |
| Photo on notes | ✓ compressed | ✓ |
| Archive search | 30 days | Full |
| Polls on board | ✓ simple | ✓ + history |
| Comments | Optional off/on hall setting | Same |

**Do not Pro-gate viewing the board** — daily habit dies.

---

## 8. Engagement without becoming social media

### 8.1 What we do

| Mechanism | Why it works at a hall |
|-----------|------------------------|
| **Tonight strip always changes** | Natural daily open |
| **Expiry + clean board** | Respects attention; feels maintained |
| **Pinned captain voice** | Authority without a feed algorithm |
| **Tight reaction set** | 👍 👀 ✅ 😂 🔥 only — no custom sticker packs |
| **“Got it” on Urgent / Reminder** | Ack without chat pile-on (optional) |
| **Shift handoff template** | Ritual at tour change |
| **Weekly BBQ / birthday surface** | Culture, not content farming |
| **Deep links from Alerts** | “Coffee out — see board” → land on card |
| **Streak-free** | Never show “3 day streak posting” |

### 8.2 What we refuse

- Infinite scroll / “load more posts from 2024” on home  
- Likes counts as status competition  
- Public profiles / karma  
- @everyone storms  
- GIFs-as-identity  
- Algorithmic ranking (“you might like”)  
- Stories that disappear for FOMO (expiry is hygiene, not FOMO)  
- Friend suggestions  
- Share-to-social 

### 8.3 Ranking (deterministic, not algorithmic)

Active list order:

1. Pinned (captain order)  
2. Urgent (unacked first)  
3. Expiring within 24h  
4. Tonight-related (Kitchen / Shopping)  
5. Recency  

No ML. No personalization beyond “my shift” filter.

### 8.4 Daily check habits (product tactics)

1. **Hall tab opens to Whiteboard** (this screen).  
2. **Morning digest (optional push):** “Tonight still empty · 1 pinned · BBQ Saturday.” Max 1/day.  
3. **Tour start prompt** (if shift known): “Post a shift note?” skip forever OK.  
4. **After Fed status:** soft prompt “Leftovers on the board?” once.  
5. **Empty Tonight:** board CTA = Vote / Wheel / Post dinner — not “create engaging content.”  
6. **Birthday / BBQ calendar strip** in This Week — glanceable culture.  
7. **Acknowledge Reminder** clears it from *your* attention without deleting for others.

### 8.5 Metrics that mean engagement (good)

| Metric | Meaning |
|--------|---------|
| Board opens / member / tour | Habit |
| % opens with no note authored | Healthy lurking |
| Time-to-ack on Urgent | Ops health |
| Pins read rate | Captain signal works |
| Notes expired vs manually deleted | Hygiene working |

**Bad metrics we won’t optimize:** posts per user, reactions per post, session length, scroll depth.

---

## 9. Comments & reactions (guardrails)

### Reactions

- Fixed emoji row under card  
- One reaction per user per note (tap toggles)  
- Show count only; no “Mike, Sam, and 4 others” lists on home (detail OK)

### Comments

- **Default off** for Information / Reminder / Birthday  
- **Default on** for Question / Suggestion / For Sale / Wanted / Lost & Found  
- Hall setting: “Allow comments on all notes”  
- Max depth: flat thread, no nested replies in v1  
- Captain can lock comments on a note  

If a Question needs a real decision → “Start Hall Vote” CTA.

---

## 10. Attachments & photos

- **Photo:** one hero image per note; compress hard for bay Wi‑Fi  
- **Attachments:** PDF rare (menu, flyer); Pro if storage matters  
- No video in v1 (size + moderation complexity)

---

## 11. Lifecycle

```
Draft (rare) → Active → (Pinned?) → Expired/Archived
                ↓
         Closed (Sold / Found / Filled)
```

| State | Home visibility |
|-------|-----------------|
| Active | In lists |
| Pinned | Pin section |
| Closed | Hidden from Active; searchable |
| Archived/Expired | Archive only |

**Auto-expire defaults**

| Type | Default expiry |
|------|----------------|
| Reminder | User-set (required) |
| Birthday | End of event day |
| Hall BBQ / Event | End of event day + 1 |
| Information | 7 days |
| Question | 14 days or when marked Answered |
| For Sale / Wanted / Lost | 30 days or Closed |
| Poll | When closed or 7 days |

---

## 12. Integration map

| System | Integration |
|--------|-------------|
| **Tonight / Vote** | Lock vote → fills Tonight strip; optional auto-note “Dinner locked: Chili” |
| **The Run** | Shopping Notes type; “Add to Run” on shopping-related notes |
| **Canteen / Inventory** | “Out of X” template → Mark Out on inventory + board note |
| **Alerts** | Urgent / Out / Vote closing deep-link to board card or strip |
| **Hall Home** | Whiteboard **is** Hall Ops home |
| **Dues** | Optional pin “Dues due Friday” |
| **Cabinet** | For Sale can link merch item |
| **SEO / Tools** | No public board; join CTA only |

---

## 13. Data model (conceptual)

```
hall_board_state          -- Tonight strip (1 per hall or per shift)
hall_board_notes          -- bulletin cards
hall_board_note_topics    -- M2M topic tags
hall_board_reactions      -- user_id, note_id, emoji
hall_board_comments       -- optional
hall_board_acks           -- Got it (urgent/reminder)
hall_board_poll_options
hall_board_poll_votes
```

**Note row fields:** type, priority, expires_at, pinned, pinned_order, author_id, title, body, photo_url, attachment_url, comments_enabled, closed_at, created_at, updated_at.

Privacy: hall-scoped; robots disallow `/hall`.

---

## 14. Mobile UX details

- Cards: title prominent, type chip, expiry subtle (“2d”)  
- Long-press: Pin (mgr), Expire now, Delete  
- Pull-to-refresh only — no infinite scroll on home  
- Archive behind More → “Old notes”  
- Filter sheet: topic, type, mine, my shift  
- Accessibility: status not color-only; targets ≥44px  

**Empty states**

- No notes: “Board’s clean. Post a reminder or lock tonight’s dinner.”  
- No dinner: CTA Vote / Wheel / Set dinner  

---

## 15. Moderation & safety

- Captain / canteen mgr delete + lock  
- Report note → captain queue (simple)  
- No anonymous posts  
- Urgent rate limit for members  
- Lost & Found / For Sale: disclaimer — hall not a marketplace guarantor  

---

## 16. Roadmap

### WB-1 — Tonight strip + shell

- Hall Ops opens to Whiteboard  
- Structured Tonight fields  
- Vote lock write-through  

### WB-2 — Notes v1

- Types: Information, Reminder, Question  
- Topics subset (Announcements, Kitchen, Shopping, Events, Birthdays)  
- Priority, expires, pin, author, photo  
- Reactions (fixed set)  

### WB-3 — Full types + culture

- Suggestion, Poll, For Sale, Wanted, Lost & Found  
- Remaining topics (Maintenance, Equipment, Training, BBQ, Retirements, Congrats)  
- Ack on Urgent/Reminder  

### WB-4 — Comments + archive search

- Optional comments  
- Archive UI  
- Inventory “Out of” template  
- Digest push  

### WB-5 — Polish

- Shift filter  
- Templates pack  
- Merch For Sale link  
- Hall Pro caps  

---

## 17. Success metrics

| Metric | Target direction |
|--------|------------------|
| Hall sessions landing on Whiteboard first | → ~100% of Hall opens |
| Median time to first useful glance | &lt; 10s |
| Daily board opens / linked member | ↑ |
| % sessions with zero posts authored | Stay high (lurking OK) |
| Urgent ack rate &lt; 2h | ↑ |
| Active notes older than expiry still showing | → 0 |
| Correlation: board open → Run/Canteen action same day | ↑ |

---

## 18. One-line pitch

**The Digital Hall Whiteboard is the kitchen board and cork board in your pocket — dinner on top, hall life underneath, nothing that feels like social media.**

---

## 19. Approval checklist

- [ ] Whiteboard as Hall Ops first screen approved  
- [ ] Tonight strip vs bulletin split approved  
- [ ] Topic + type lists approved  
- [ ] Engagement rules (do / don’t) approved  
- [ ] Free vs Pro board caps approved  
- [ ] Comments default-off for most types approved  
- [ ] Roadmap WB-1 → WB-4 approved  
- [ ] Explicit go-ahead to implement (design-only until then)

---

*— End of Digital Hall Whiteboard design —*
