# Navigation — Every Shift Starts at Home

**Status:** Implemented

## Guiding principle

Firehall Meals is **one application**.

It is not a recipe website with Hall features, and not Hall software with recipe features.

It helps firefighters:

1. Decide what's for dinner.
2. Run the fire hall.

Every shift starts at **Home**.

---

## One Brain

Users should never feel like they are switching applications.

Every screen is another part of the same shift.

Navigation follows firefighter workflows, not software modules.

---

## Shift lifecycle

```
Start Shift → Home → What's for dinner? → Vote → Shopping → Cook → Run the Hall → Continue
```

Users move through this flow without thinking about navigation.

---

## Four destinations

| Tab | Role |
|-----|------|
| **Home** | Command center. Beginning of every shift. Surfaces dinner, vote, shopping, staples, next action. |
| **Explore** | Discovery. Inspire — never duplicate Home. |
| **Hall** | Deeper ops. Home asks "what needs attention?"; Hall answers "let's manage it." |
| **Me** | Personal account. Profile, saves, history, settings. |

Bottom tabs are always these four. Brand and the Home chip always return to `/home`.

---

## Home is proactive

Home surfaces actions, not modules:

- Tonight's meal
- Vote status
- Something to buy
- Low in the canteen
- Continue cooking
- One primary next action

---

## Design checks

Every screen answers: Where am I? Why am I here? What's next? How do I return Home?

**Constitution:** [feature-filter.md](./feature-filter.md) overrides roadmap and prior design.

Before any change:

1. Help decide tonight's dinner? **or** ease dinner after it's decided?
2. Immediate value on the next shift?
3. One-sentence purpose?
4. Strengthens Home? Simplifies workflow?
5. Would firefighters miss it if removed?

Hall is earned through Meal → Vote → Shop → … — not sold upfront.
