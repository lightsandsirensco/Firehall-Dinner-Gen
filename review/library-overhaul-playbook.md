# Firehall Meals — Library Overhaul Playbook

The standard every rewritten recipe must meet before it ships. Derived from the
production quality audit (`shared/recipe-quality/curated-recipe-quality-audit.ts`),
the firehall voice rules (`shared/firehall-instruction-voice.ts`), and the
`big-chili` exemplar (`client/public/catalog/golden-100/pages/big-chili.json` — read
it first; it is the reference for depth, voice, and structure).

## Mission

Every recipe must be accurate, repeatable, realistic, firehall-friendly, and taste
like the best version of that dish a firefighter has ever cooked. Nothing may read
like generic AI or blog filler.

## Never invent recipes

Do not create dishes from scratch. For each dish, recall the most respected known
versions (Serious Eats / Kenji, America's Test Kitchen, Cook's Illustrated, NYT
Cooking, Food & Wine and equivalent classic preparations) and synthesize their
common techniques, ratios, and finishing moves into an original Firehall Meals
version. Keep whatever is already good in the existing recipe — many have solid
bones and fail on completeness, temps, and thin instructions.

Never fabricate `sourceName`/`sourceUrl`. Keep existing values. If empty, leave
empty — attribution requires a real verified URL.

## Hard quality bar (the audit enforces all of this)

Structure:
- Base servings 8 (`crewSize: 8`, `baseServings: 8`). The UI scales to 4/6/8/10/14.
- Steps: minimum 8; minimum 10 if prep+cook ≥ 90 min or difficulty is "hard".
- Step instructions total ≥ 400 words if prep+cook > 45 min (≥ 280 if 25–45 min).
- Required sections: `equipment` (must match what steps actually use),
  `tonightSpread`, `proTips` (≥ 2), `leftovers`, `substitutions`, `whyCrewsLikeIt`.

Every step needs:
- WHAT (specific action with quantities where useful), WHY (the reasoning, where it
  helps a probationary firefighter), WHAT TO LOOK FOR (color/sound/smell/texture
  cue), and where natural, the COMMON MISTAKE ("crowded pot steams the meat gray").
- A time, heat level, or doneness cue in the text. `minutes` and `heatLevel`
  ("", low, medium-low, medium, medium-high, high) set honestly.
- ≥ 12 words. No banned titles: never "Gather ingredients and equipment",
  "Preheat ovens and surfaces", "Cook until done", "Prepare ingredients",
  "Finish and serve", "Set the line", "Rest briefly".

Temperatures (audit rule — read carefully):
- Any step whose title+instruction contains BOTH a hot-cook word
  (bake/roast/grill/sear/fry/simmer/boil/smoke/broil/sauté/oven/skillet/griddle)
  AND a protein word (chicken/beef/pork/turkey/salmon/shrimp/cod/fish/sausage/
  steak/ground/thigh/breast/lamb/ham/bacon) must contain a safe internal temp:
  165°F poultry, 160°F ground meat, 145°F whole-muscle beef/pork/fish.
- Corollary: keep stray protein words out of steps that don't cook protein
  (say "the meat" or "the broth" instead of "beef" in simmer/deglaze steps), or
  include the temp cue.
- At least one step must verify doneness with an instant-read thermometer.

Ingredient alignment:
- Every non-optional ingredient must be referenced in the step text (word-level
  match; "Crushed Fire-Roasted Tomatoes" is satisfied by "crushed tomatoes").
- Every protein cooked in steps must exist in the ingredient list.
- Protein ≤ ~12 oz per firefighter at base 8. Quantities realistic and scalable:
  lb/oz/cups/tbsp/tsp/cans/loaves. Whole cans/loaves/bottles at base 8. Name
  countable produce so it scales to whole numbers (e.g. "Fresh Jalapeño Peppers").

Banned phrases (instant fail): "visual cues", "spread evenly", "wooden bowl",
"cook until done", "until done", "perfectly cooked", "culinary", "delectable",
"mouth-watering", "whilst", "utilize", "plate beautifully", "artfully",
"nourish/nourishing", "meal prep", "balanced bowl", "feeds hard",
"tonight's board", "hall spread", "station template", "elevated",
"restaurant-quality", "to perfection", "perfect for", "ideal for",
"flavor explosion". Firefighter references: at most a couple of natural crew/shift
notes — no cosplay in every sentence.

Standard closing steps (verbatim, adjust only the protein label):
- Step N-1 — title "Hold for call interruptions", minutes 5, heatLevel "low":
  "If tones drop mid-cook: turn off direct heat and cover {protein label} — hold at
  140°F in a warm cabinet or 200°F oven, never below 140°F for more than 30 minutes
  cumulative. Log hold time on the pan with a grease pencil. If tones drop after
  service, cover hot food and keep sides on low heat or ice as appropriate. On
  return, spot-check proteins at safe internal temp before reopening the line."
- Step N — title "Pack down leftovers safely", minutes 10, heatLevel "":
  "Cool {protein label} and hot components in shallow hotel pans within two hours —
  deep pots stay in the danger zone too long. Label with date; reheat proteins to
  165°F minimum before second shift. Store cold components separately so textures
  survive overnight."

`leftovers` array: start with the two standard lines, then dish-specific reheat
guidance (how to revive texture, what to store separately):
1. "Cool {protein label} in shallow pans within two hours; label with date and
   reheat to 165°F before second shift."
2. "Store cold sides separately — hot and cold stacked overnight ruins texture."

`proTips`: 2–4 dish-specific tips that teach the recipe's own logic, then these
four hall standards:
- "Keep a backup tray at 200°F for firefighters returning from a run — never serve
  picked-over pans to late crew."
- "Taste for salt at the end — hall palates run salty after long shifts."
- "Log hold times on the pan with a grease pencil when tones drop mid-service."
- "Spot-check proteins with an instant-read thermometer before reopening the line
  after a call."

`tonightSpread` format:
- "Main: {main dish}"
- "Sides: {sides}"
- "Condiments: {condiments}" (optional)
- "Set hot components closest to the crew; cold crunch and toppings at the far end of the line."
- "Keep a backup tray at 200°F for firefighters returning from a run."

## Editorial fields

- `description`: 1–2 sentences, specific to the technique ("browned hard, masa
  finish"), not marketing filler.
- `whyCrewsLikeIt`: concrete and appetite-driven, never generic.
- `substitutions`: 2–4 practical swaps (leaner protein, missing specialty item,
  no-alcohol option) with the consequence stated.
- Serving suggestions live in `tonightSpread`; garnish upgrades belong in
  `substitutions` or `proTips` as optional upgrades.
- Nutrition: keep the existing block unless clearly absurd for the portions; if you
  change quantities materially, adjust calories/macros to a defensible estimate and
  set `"source": "estimated"`.

## Do not touch

`slug`, image fields, `tags`, `category`, `relatedSlugs`, `realismScore`,
`firefighterScore`, `popularityWeight`, `contentVersion`, `classicSlug`,
`sourceName`/`sourceUrl` (unless genuinely wrong). Update `generatedAt` to now.
You may add 1–2 `searchTerms`. Keep 2-space JSON indent and trailing newline.

## Verification (mandatory per recipe)

```
npx tsx scripts/audit-one-recipe.ts <slug> [--scale]
```

Must print `PASS`. With `--scale`, sanity-check that crew-4 and crew-14 quantities
read like something a cook would actually measure. Do not report a recipe done
until it passes.
