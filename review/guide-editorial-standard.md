# Firehall Meals guide editorial standard

One standard for every guide in `shared/editorial/`. The reader is an adult who
cooks for a crew of 6 to 12+ at the hall, often without much experience, and
who wants to know what to do, not a lecture.

## Voice

- Practical, concise, confident. An experienced cook explaining what matters.
- Second person ("you") is fine. No "we" for the publication.
- Plain English. Explain the science only as far as it changes what the cook does.
- Firehall context only where it changes the advice: crew size, interrupted
  meals, holding and reheating, shared kitchens and fridges, shopping for a
  crew, mixed diets, budget. Never as decoration.
- No motivational, wellness or health-blog framing. No fire-service jokes.

## Banned (enforced at build time in `seo-article-build.ts` where marked *)

- Intros that describe the article ("This guide covers…", "This guide gives…") *
- "whether you're" *, "game changer" *, "fuel your shift/crew/body" *, "morale" *,
  "it's not just" *, "ultimate/comprehensive guide" *, "hall-tested" *
- "when it comes to" *, "the key is" *, "power through" *, "willpower" *,
  "in today's fast-paced" *, "genius" *, "like it is part of the job" *
- "not a secret", "the trick is", "here's the thing", "simply", "truly"
- Robot transitions: furthermore, moreover, additionally, that being said
- Em dashes in guide prose. Use a full stop, colon, comma or parentheses.
- Fake asides, metaphors that need decoding, closing summaries that repeat the article.

## Structure

- **Intro:** answer the search question in the first two sentences, with a
  number where there is one (quantity, temperature, time). Then name the one
  or two things that actually go wrong. Stop. No table of contents in prose.
- **Headings (H2):** sentence case, descriptive, tell the reader what the
  section answers. Prefer "How much pasta for 4 to 12 people" over "Quantities".
  Mistake-style headings name the mistake plainly.
- **Paragraphs:** 2 to 4 sentences, one idea each. Steps for ordered methods,
  tables for quantities, times and temperatures.
- **FAQ:** only questions a reader would type into a search box, answered in
  2 to 4 sentences. Two or more FAQs make the guide eligible for FAQ rich
  results; do not pad.
- **Practical advice list:** the 3 to 5 actions a reader should take away,
  not a summary of every section.

## Conventions

- US spelling (flavor, center, color, labeling). "Firehall" as one word;
  "fire station" and "firehouse" are fine as variety and for search.
- Temperatures: °F first, °C in brackets: 165°F (74°C). Where USDA and Health
  Canada differ, give both and name them.
- Weights and volumes: US units first with metric in brackets for weights
  and key volumes.
- Clock times in schedules use the 24-hour clock (17:30). Avoid clock times in
  ordinary prose ("late at night", "by mid-afternoon").
- Crew sizes as numerals: "for 8", "for 10 to 12".
- Recipe titles as they appear in the catalog.

## Food safety (state once per guide, accurately, where relevant)

- Doneness: an instant-read thermometer in the thickest part, away from bone.
  Chicken and turkey 165°F (74°C); ground beef and pork 160°F (71°C); whole
  cuts of beef, pork, lamb 145°F (63°C) + 3 minute rest (USDA); Health Canada
  gives 160°F (71°C) for pork and 158°F (70°C) for fish; 180°F (82°C) for
  whole poultry. Egg dishes 160°F (71°C) USDA / 165°F (74°C) Health Canada.
- Hot holding at 140°F (60°C) or above. Cold at 40°F (4°C) or below.
- Two hours maximum between 40 and 140°F (4 and 60°C); one hour above 90°F (32°C).
- Reheat leftovers to 165°F (74°C); soups, sauces and gravies to a rolling boil.
- Leftovers: USDA 3 to 4 days, Health Canada 2 to 3 days. House rule in a
  shared fridge: the shorter window, labeled with the date.
- Do not rinse raw chicken. Do not partially cook meat to finish later
  (USDA); if a call interrupts, chill it right away and finish it to a safe
  temperature as soon as you are back, or discard it if it sat warm.
- Thaw in the fridge, in cold water changed every 30 minutes, or in the
  microwave; cook cold-water and microwave-thawed food immediately. Never
  start frozen meat in a slow cooker.
- Dried red kidney beans must boil hard for at least 10 minutes.
- No medical or dietary advice. Nutrition guides say so once, plainly.

## Seasoning and scaling

- Salt scales with the amount of food. Hold some back when scaling because
  salty ingredients (stock, canned tomatoes, cheese, cured meat, seasoning
  blends) vary and over-salting cannot be undone, not because a big pot
  "needs less". A bigger pot evaporates proportionally less, so it may need
  a longer uncovered simmer, not less salt.
- Taste and adjust at the end. Acid (lime, vinegar) fixes "flat" more often
  than more spice.
