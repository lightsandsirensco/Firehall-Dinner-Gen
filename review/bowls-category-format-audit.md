# Production Recipe Format Audit — Bowls Authoring Spec

**Date:** 2026-07-17  
**Purpose:** Lock the exact Firehall Meals production format before authoring the Bowls category.

---

## Top 10 highest-quality production recipes

Ranked by firefighter/realism scores + editorial richness (step depth, tip length), not hall-expansion's flat popularity weight.

| # | Slug | Title | Collection | Steps |
|---|------|-------|------------|-------|
| 1 | `pad-thai` | Pad Thai | golden-100 | 8 |
| 2 | `smash-burgers` | Double Smash Burgers | golden-100 | 12 |
| 3 | `bbq-chicken-mac-and-cheese` | BBQ Chicken Mac and Cheese | golden-100 | 11 |
| 4 | `steak-tacos` | Steak Tacos | golden-100 | 10 |
| 5 | `chicken-caesar` | Chicken Caesar Salad | golden-100 | 11 |
| 6 | `big-chili` | Firehall Chili | golden-100 | 10 |
| 7 | `chicken-parm` | Chicken Parmesan | golden-100 | 10 |
| 8 | `steak-sandwiches` | Steak Sandwiches | golden-100 | 11 |
| 9 | `pulled-pork` | Pulled Pork Sandwiches | golden-100 | 10 |
| 10 | `beef-dip` | Beef Dip Sandwiches | golden-100 | 11 |

**Honest catalog baseline:** ~92% of pages have **4–6 steps**. Flagship / classics-wheel recipes use **8–12**. Bowls in this batch target **flagship depth (10–12 steps)** so they match the quality bar the product team requested.

---

## Exact published format (`GoldenRecipePage`)

Required / used fields:

- Identity: `slug`, `title`, `displayTitle`, `seoTitle`, `shortDescription`, `subtitle`, `category`, `cuisine`, `description`
- Timing / difficulty: `prepTime`, `cookTime`, `difficulty`, `crewSize`, `baseServings` (canonical **8**)
- Macros: `calories`, `protein`, `carbs`, `fats`, `nutrition`
- Content: `tags`, `equipment`, `ingredients[]`, `steps[]`, `proTips[]`, `tonightSpread[]`, `leftovers[]`, `whyCrewsLikeIt`, `mealPrepNotes`, `substitutions[]?`
- Ops: `spiceLevel`, `cleanupDifficulty`
- Media / SEO: `heroImage`, `heroImageAlt`, `mobileImage`, `thumbImage`, `railImage`, `searchTerms`, `relatedSlugs`
- Scores: `realismScore`, `firefighterScore`, `popularityWeight`, `contentVersion`

### UI label → JSON field

| UI | Field |
|----|-------|
| Hall tips (rookie/chef tips) | `proTips` |
| Tonight's spread (sides / service) | `tonightSpread` |
| Meal prep (make-ahead + storage + reheat) | `mealPrepNotes` (≤500 chars) |
| Leftovers | `leftovers` |
| Substitutions | `substitutions` |
| Why crews like it | `whyCrewsLikeIt` |

There is **no separate** Rookie Tips / Storage / Reheating UI section — those live inside `proTips` and `mealPrepNotes` / `leftovers`.

---

## Writing rules for new bowls

1. Steps: **10–12**, verb-first titles, 150–500+ char instructions covering heat, pan, time, visual cues, temps, mistakes, parallel prep.
2. Always include a **hold for calls** step and a **pack-down / leftovers safety** step (classics-wheel pattern).
3. Ingredients authored at crew 10 then scaled to base 8 by page builder; string quantities; groups (`Main`, `Base`, `Sauce`, `Toppings`, `Finish`…).
4. `tonightSpread`: Main / Sides / Condiments style service notes.
5. `leftovers`: cool within 2 hours → reheat to 165°F → meal-specific reuse ideas.
6. `seoTitle`: `{Title} | Firefighter Meal`
7. Voice: experienced firefighter teaching a rookie — concrete, station-aware, no fluff.

---

## Slug plan (avoid collisions)

| Recipe | Slug | Notes |
|--------|------|-------|
| Firehall Taco Bowls | `firehall-taco-bowls` | Exists — upgrade |
| Buffalo Chicken Sweet Potato Bowls | `buffalo-chicken-sweet-potato-bowls` | Exists — upgrade |
| Greek Chicken Bowls | `firehall-greek-chicken-bowls` | `greek-chicken-bowls` is golden-100 |
| Teriyaki Chicken Rice Bowls | `teriyaki-chicken-rice-bowls` | New |
| Korean Beef Bowls | `firehall-korean-beef-bowls` | `korean-beef-rice-bowls` is performance |
| Cajun Shrimp & Rice Bowls | `cajun-shrimp-rice-bowls` | New |
| Southwest Steak Bowls | `southwest-steak-bowls` | New |
| BBQ Pulled Pork Bowls | `bbq-pulled-pork-bowls` | New |
| Mediterranean Beef Bowls | `mediterranean-beef-bowls` | New |
| Chipotle Chicken Burrito Bowls | `chipotle-chicken-burrito-bowls` | New (`performance-burrito-bowls` distinct) |

---

## Integration path

Hall Expansion → `hall-expansion:generate-pages` → image remediate → `seed:hall-expansion` → Explore / Generator / search / sitemap.
