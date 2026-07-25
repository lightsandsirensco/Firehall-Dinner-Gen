# Firehall Meals Product Constitution

## Feature Filter & Product Guardrails

**Status:** Governing rule  

This document takes priority over feature ideas, implementation convenience, previous designs, and roadmap ambitions.

Before designing, implementing, reviewing, or approving **any** feature, apply this filter.

---

# Mission

Firehall Meals exists to make dinner at the fire hall effortless.

The product should become the place every crew opens when asking:

**"What's for dinner tonight?"**

Every feature must strengthen that mission.

If it weakens focus, adds unnecessary complexity, or delays value, challenge it.

---

# The Two Questions

Before building anything, answer:

## 1.

Does this help firefighters decide what's for dinner tonight?

**OR**

## 2.

Does this make tonight's dinner easier after it has been decided?

Examples include:

- voting
- assigning shopping
- shopping lists
- pantry awareness
- cooking
- cook mode
- serving
- cleanup
- saving successful meals for future shifts

If the answer to **both** questions is no, **stop**.

Challenge whether the feature belongs inside Firehall Meals.

Do not continue until you can justify it.

---

# Immediate Value Rule

Every feature should provide value on the very next shift.

Avoid building features whose usefulness depends on:

- large crew adoption
- future integrations
- months of data
- enterprise workflows
- "later"

Instead ask:

**"How does this help tonight?"**

---

# Complexity Rule

Do not increase complexity unless the user receives immediate and obvious value.

**Immediate** means: a firefighter benefits during the next shift.

**Obvious** means: a firefighter understands why the feature exists in one sentence.

If explaining the feature requires multiple paragraphs, the feature is probably too complicated.

---

# One Sentence Test

Every feature must answer:

**"Why does this exist?"**

### Good

- It picks tonight's dinner.
- It lets the crew vote.
- It creates tonight's shopping list.
- It remembers meals that worked.
- It tells us what we're missing before shopping.

### Poor

- It increases engagement.
- It prepares for future scalability.
- It centralizes collaborative workflows.
- It may become useful later.

---

# Home Rule

Home is not a menu.

Home is the beginning of every shift.

Every meaningful workflow should naturally begin at Home.

Ask:

- Does this make Home more valuable?
- Does this reduce the number of places users must remember?
- Does this naturally appear during tonight's workflow?

If a feature requires users to remember another destination, reconsider the design.

---

# Progressive Disclosure

Never expose complexity before users need it.

Users should discover new capabilities naturally as their workflow evolves.

Do not present advanced Hall functionality before it solves a real problem.

```
Meal
  ↓
Vote
  ↓
Shopping
  ↓
Inventory
  ↓
Whiteboard
  ↓
Everything else
```

Hall should feel **earned**, not sold.

---

# Features That Usually Fail

Challenge ideas like:

- HR
- payroll
- scheduling
- social feeds
- badges
- leaderboards
- engagement mechanics
- generic dashboards
- enterprise administration
- standalone destinations
- complexity introduced "for later"

Unless they clearly support tonight's dinner workflow, they do not belong.

---

# Features That Usually Pass

Examples:

- Meal Generator
- Meal Wheel
- Saved Meals
- Meal History
- Favorites
- Suggested Tonight's Meal
- Hall Voting
- Shopping List
- Pantry Awareness
- Cook Mode
- Continue Cooking
- Recipe Scaling
- Prep Timeline
- Shopping Assignments

Anything that makes tonight's dinner easier.

---

# Every Review

Before approving any design, implementation, roadmap item, PR, or feature, answer:

1. Does it help decide tonight's dinner?
2. Does it reduce friction after dinner is decided?
3. Does it provide immediate value on the next shift?
4. Can its purpose be explained in one sentence?
5. Does it strengthen Home?
6. Does it simplify the workflow?
7. If removed tomorrow, would firefighters miss it?

If multiple answers are "No", reduce scope or remove the feature.

---

# Product Philosophy

Firehall Meals should own one moment in every shift:

**"What's for dinner tonight?"**

Everything else exists to make that decision—and everything immediately after it—as effortless as possible.

Never optimize for feature count.

Never optimize for complexity.

Optimize for habit.

The product succeeds when firefighters instinctively open Firehall Meals every shift before dinner because it is the fastest, easiest, and most trusted way to decide, organize, and cook tonight's meal.
