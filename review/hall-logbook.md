# Hall Logbook — Product Design

**Status:** Design only — do not implement until approved  
**Date:** 2026-07-17  
**Depends on:** `review/hall-operations-design.md` · `review/digital-whiteboard.md`  

**What this is:** The hall’s **memory** — kitchen notebook + shift handoff + searchable ops history.  
**What this is not:** Fire department incident/operational logbook · Slack · Facebook · the Whiteboard.

---

## 1. One-line pitch

**The Hall Logbook is what you open at the start of every shift to catch up — and what the hall keeps forever so nothing important dies on a sticky note.**

---

## 2. Whiteboard vs Logbook (non-negotiable)

| | **Whiteboard** | **Hall Logbook** |
|--|----------------|------------------|
| Job | Today’s board | Hall’s memory |
| Lifespan | Temporary, expires | Historical, archived — **never auto-deleted** |
| Feel | Cork board + dry-erase | Bound kitchen notebook |
| Content | Announcements, polls, questions, events, short reminders | Operational notes, resolved issues, auto activity, lasting facts |
| Home role | First glance / pulse | Shift start catch-up + search |
| Density | Finite, clean | Searchable archive grows |

**Rule of thumb**

- “BBQ Saturday — bring a side” → **Whiteboard**  
- “Coffee filters now live beside the freezer” → **Logbook** (and maybe a short Whiteboard pointer)  
- “Coffee marked OUT by Mike” → **Logbook** (auto)  
- “Vote: chili vs tacos” → **Whiteboard** poll / Tonight vote — not Logbook  

Systems may **cross-post**: important log entries can surface a Whiteboard chip; Whiteboard “promote to Logbook” saves lasting facts.

---

## 3. Design principles

1. **Shift-start ritual** — unread since last shift is the hero.  
2. **Notebook, not chat** — entries, not threads that never end.  
3. **Archive > delete** — nothing important vanishes.  
4. **Auto + human** — system writes activity; people write judgment.  
5. **Four-shift aware** — A/B/C/D (or hall-configured) catch-up.  
6. **Few taps** — mark read, react, optional comment.  
7. **No notification fatigue** — digest > push storm.  
8. **Private hall only** — never SEO-indexed.

---

## 4. Entry categories (types)

| Category | Examples |
|----------|----------|
| **Kitchen** | Cast iron ban, fridge cleaned, butter in downstairs freezer |
| **Canteen** | Coffee filters moved, Frank’s almost out |
| **Shopping** | Ordered 6 bags coffee from Costco Business |
| **Inventory** | Milk expires tomorrow; item marked out (auto) |
| **Maintenance** | Coffee machine descaled; propane replaced |
| **Merchandise** | Shirts back; patch order Tuesday; hoodie sold (auto) |
| **Cleaning** | Kitchen fridge cleaned |
| **Supplies** | Paper towels reported to Facilities |
| **General Hall** | Catch-all ops |
| **Training** | Recruits Thursday — feed 16 |
| **Social** | Christmas dinner volunteers |
| **Lost & Found** | Missing thermometer |
| **Suggestion** | “Buy the big oil next time” |
| **Reminder** | Lasting reminder (also consider Whiteboard if today-only) |
| **Question** | Needs an answer in the record |
| **Announcement** | Standing policy (“Don’t use cast iron”) |

Categories are filters, not separate apps.

---

## 5. Entry fields

| Field | Required | Notes |
|-------|----------|-------|
| **Title** | ✓ | Short notebook headline |
| **Message** | ✓ | Body |
| **Category** | ✓ | From §4 |
| **Priority** | ✓ | `normal` · `important` · `urgent` |
| **Created by** | ✓ | User or `system` |
| **Created date** | ✓ | |
| **Expires on** | | Optional; expiry → suggest archive, **does not delete** |
| **Shift** | | Originating shift (A/B/C/D) |
| **Tags** | | Freeform + suggested |
| **Attachments** | | PDF, receipt |
| **Photos** | | Preferred for location/merch proof |
| **Pinned** | | Manager pin; few max |
| **Resolved** | | Issue closed; stays searchable |
| **Archived** | | Soft-remove from active streams |
| **Source** | | `manual` · `inventory` · `shopping` · `merch` · `payments` · `whiteboard` · … |
| **Source ref** | | Linked entity ids |

---

## 6. Shift visibility & catch-up

Halls configure **N shifts** (default four: A/B/C/D) via existing `hall_shifts`.

### Every member can

| Action | Notes |
|--------|-------|
| **Read** | Full active + own bookmarks; archive via search |
| **React** | Fixed emoji set (same discipline as Whiteboard) |
| **Mark read** | Per-entry or “Mark all unread since last shift” |
| **Bookmark** | Personal “remember this” |
| **Comment** | Optional; hall setting; default on for Question/Suggestion only |

### Catch-up home (Logbook first screen)

```
┌─────────────────────────────────────────┐
│ Logbook                                  │
│ Unread since your last shift · 7         │
├─────────────────────────────────────────┤
│ PINNED                                   │
├─────────────────────────────────────────┤
│ UNREAD SINCE LAST SHIFT   [Mark all read]│
├─────────────────────────────────────────┤
│ TODAY                                    │
├─────────────────────────────────────────┤
│ RECENT ACTIVITY                          │
└─────────────────────────────────────────┘
```

**“Last shift”** = last time this user opened Logbook *or* last duty end timestamp if known — prefer explicit **Mark all read** so catch-up stays honest.

Filters: My shift · Category · Pinned · Unresolved · System · Manual.

---

## 7. Smart features (no auto-delete)

| Feature | Behavior |
|---------|----------|
| **Search** | Full text title/message/tags; include archive |
| **Filter** | Category, shift, priority, resolved, source |
| **Pinned** | Always top of catch-up |
| **Expiring** | Badge “expires soon”; prompt archive |
| **Archive** | Manual or bulk “archive resolved &gt; 30d” |
| **Recently resolved** | Filter / section |
| **Most discussed** | Optional sort by comment count (not a popularity contest on home) |

**Never automatically delete.** Retention = archive policies, not purge.

---

## 8. Automatic event generation

System entries are concise, factual, attributed.

| Trigger | Example auto entry |
|---------|-------------------|
| Inventory marked Out | “Coffee marked OUT by Mike.” |
| Inventory Running Low | “Frank’s RedHot running low (Sam).” |
| Inventory Receive | “Received: 6× coffee (Costco Business) — Sarah.” |
| Shopping / Run completed | “Shopping completed by Sarah.” |
| Purchase cycle purchased | “Ordered 6 bags of coffee from Costco Business Centre.” |
| Merch sold | “Large Hall Hoodie sold.” |
| Merch receive / back in stock | “Hall shirts are back in stock.” |
| Dues payment recorded | “John paid quarterly canteen dues.” |
| Whiteboard dinner locked | Optional: “Dinner locked: Taco Night — cook Sam.” |
| Department notify | “Paper towels reported to Facilities.” |

**Controls**

- Hall settings: which auto-events are on  
- Dedupe: same item Out twice in 6h → one entry + update  
- Batch: “Shopping completed” one entry with line summary, not 40 rows  

Auto entries: `created_by = system`, `source = …`, still **Mark read** capable.

---

## 9. Integration with Hall Operations

| Module | Integration |
|--------|-------------|
| **Whiteboard** | Distinct surfaces; promote / deep-link; don’t duplicate polls |
| **Inventory** | Auto Out/Low/Receive |
| **Smart Shopping / The Run** | Shopping completed / ordered |
| **Merchandise / Cabinet** | Sold / restocked |
| **Canteen Payments** | Payment received (no amounts on shared feed if sensitive — setting) |
| **Meal Planning / Tonight** | Optional dinner lock notes |
| **Hall Home** | “7 unread in Logbook” pulse |
| **Alerts** | Urgent log entries → in-app; not every auto line |

**Payments privacy default:** Log “John paid canteen dues” **without dollar amount** unless managers enable amounts.

---

## 10. Engagement without chat/social

### Do

- Unread-since-last-shift as the reason to open  
- Pinned standing rules (cast iron, filter location)  
- One optional **shift-start digest** push: “7 unread in Logbook”  
- Mark all read — closure feels good  
- Bookmarks for personal handoff  
- Cross-link from Home / Canteen (“See log”)  

### Don’t

- Infinite chat scroll as home  
- Streaks, likes leaderboards, @everyone storms  
- Push on every auto inventory tick  
- Stories / vanishing FOMO (expiry ≠ delete)  
- Turn Logbook into Whiteboard clone  

**Ritual copy:** “Start of shift? Check the Logbook.”

---

## 11. Notification strategy

| Event | Channel | Audience |
|-------|---------|----------|
| Shift-start digest (unread &gt; 0) | Push optional / in-app | Member |
| Urgent manual entry | In-app + optional push | All / shift |
| Pinned by captain | In-app | All |
| Mention (future) | Push | Mentioned |
| Per auto Out/sale | **No push** — digest only | — |

Quiet hours respected. Default: digest off until user opts in; badge count on Hall tab OK.

---

## 12. Permissions

| Action | Member | Canteen mgr | Captain |
|--------|:------:|:-------------:|:-------:|
| Read active + catch-up | ✓ | ✓ | ✓ |
| Create manual entry | ✓ | ✓ | ✓ |
| React / mark read / bookmark | ✓ | ✓ | ✓ |
| Comment (if enabled) | ✓ | ✓ | ✓ |
| Resolve / archive own | ✓ | ✓ | ✓ |
| Pin / archive any / delete* | | ✓ | ✓ |
| Configure auto-events | | ✓ | ✓ |
| View payment amounts in log | | ✓ | ✓ |

\*Prefer archive over delete; hard delete captain-only + rare.

---

## 13. Mobile UX

- Catch-up list first; compose FAB **+ Note**  
- Templates: “Moved location,” “Almost out,” “Don’t use,” “Ordered,” “Cleaned”  
- Long-press: Pin, Resolve, Archive, Bookmark  
- Entry detail: photo, source link (“Open inventory item”), reactions, optional comments  
- Search always one tap from header  

**Empty unread:** “You’re caught up. Nice.”

---

## 14. Database design (conceptual)

```
hall_logbook_entries
  entry_id, hall_id
  title, message, category, priority
  created_by_user_id NULL  -- null = system
  created_at, expires_on
  shift_id NULL
  pinned, pinned_order
  resolved, resolved_at, resolved_by
  archived, archived_at
  source, source_ref_type, source_ref_id
  photo_url, attachment_url
  updated_at

hall_logbook_tags
  entry_id, tag

hall_logbook_reads
  entry_id, user_id, read_at

hall_logbook_bookmarks
  entry_id, user_id, created_at

hall_logbook_reactions
  entry_id, user_id, emoji

hall_logbook_comments
  comment_id, entry_id, user_id, body, created_at

hall_logbook_settings
  hall_id, auto_event_flags JSON, comments_default, payment_amount_visible
```

Indexes: `(hall_id, created_at DESC)`, `(hall_id, archived, pinned)`, `(hall_id, category)`, full-text if available.

**Retention:** Soft archive only; legal export via CSV for captains.

---

## 15. User flows

### Start of shift

1. Open Hall → Logbook (or Home pulse)  
2. See Unread since last shift  
3. Skim pinned → unread → mark all read  
4. Optionally bookmark standing kitchen rule  

### Leave a lasting note

1. + Note → category Kitchen → “Filters beside freezer” → Post  
2. Optional: “Also pin” / “Show on Whiteboard today”  

### Auto path

1. Mike marks Coffee Out  
2. Logbook entry created  
3. Appears in next shift’s unread  

### Resolve

1. Coffee received  
2. Auto or manual resolve related Out entry  
3. Lands in Recently resolved; still searchable  

---

## 16. Hall Pro opportunities

| Free linked hall | Hall Pro |
|------------------|----------|
| Manual notes + short history window | Full Logbook + archive search |
| Limited auto-events (e.g. Out only) | Full auto suite (shopping, merch, payments, receive) |
| — | Shift digests, bookmarks sync, CSV export |
| — | Attachments / receipt photos |
| Teaser on Hall Home | Full unread catch-up |

**Do not Pro-gate “unread since last shift” if free notes exist** — the ritual builds the habit; Pro deepens memory.

---

## 17. Future roadmap (extension points)

| Future | Architecture hook |
|--------|-------------------|
| Voice notes | `attachment_type=audio` on entry |
| OCR from handwritten boards | Import job → draft entries for approve |
| Photo / receipt uploads | Existing attachment fields |
| @mentions | `hall_logbook_mentions` + notify |
| Recurring reminders | Scheduler → new entry or Whiteboard promo |
| Task assignments | `assignee_user_id` + resolved = done |
| Read receipts | Already `hall_logbook_reads`; aggregate UI |
| Daily digest / weekly recap | Digest builder over unread + highlights |
| AI summaries | “Since your last shift” LLM summary — **never replaces list**; cite entries |

---

## 18. Implementation phases

### LB-0 — Design lock  
Whiteboard vs Logbook split approved  

### LB-1 — Manual Logbook  
Entries, categories, pin, archive, search, mark read, four-shift catch-up  

### LB-2 — Auto events v1  
Inventory Out/Low/Receive · Shopping completed  

### LB-3 — Merch + Payments autos · Bookmarks · Resolve  

### LB-4 — Digests · Whiteboard promote · Pro packaging  

### LB-5 — Voice / OCR / AI summary / tasks  

---

## 19. Success metrics

| Metric | Meaning |
|--------|---------|
| % of shifts with Logbook open in first 30 min on duty | Ritual adoption |
| Unread → mark-read completion | Catch-up works |
| Manual notes / week | Human memory use |
| Auto entries dismissed as noise | Tune detectors |
| Search queries / week | Archive value |
| “Sticky note” support tickets | ↓ |

---

## 20. Risks & anti-goals

| Risk | Mitigation |
|------|------------|
| Duplicate of Whiteboard | Hard IA split + copy; different nav entries |
| Becomes group chat | Flat comments optional; no typing indicators |
| Auto-log spam | Batch, dedupe, settings |
| Privacy (dues amounts) | Default hide amounts |
| Confusion with FD official log | Product name **Hall Logbook** + onboarding line: “Kitchen & hall ops only — not the official department log.” |

**Anti-goals:** Incident reporting, apparatus checks, NFIRS, HR discipline files, ephemeral social feed.

---

## 21. Nav placement (Hall Ops)

| Priority | Surface |
|----------|---------|
| Whiteboard | First screen (today) |
| **Logbook** | Primary tab or Home pulse #2 — **start-of-shift** |
| Canteen / Run / Dues | Ops tools |

Recommended: Hall Ops bar includes **Board** and **Log** as siblings — Board = today, Log = memory.

---

## 22. Approval checklist

- [ ] Whiteboard vs Logbook distinction approved  
- [ ] Category list approved  
- [ ] Unread-since-last-shift catch-up approved  
- [ ] Auto-event set + privacy defaults approved  
- [ ] Archive-never-delete approved  
- [ ] Hall Pro split approved  
- [ ] Explicit go-ahead to implement (design-only until then)

---

*— End of Hall Logbook design —*
