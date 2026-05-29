#!/usr/bin/env tsx
/**
 * Clear final variant_near_duplicate publish blockers by:
 * - rewriting 4 specific recipes (ingredients + steps + summary/title)
 * - archiving 1 specific recipe
 *
 * Constraints:
 * - Do NOT change slugs or URLs.
 * - Do NOT delete recipes.
 * - Only touch the target slugs.
 */

import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { getSharedLocalDb, flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";

type IngredientRow = {
  name: string;
  amount: number;
  unit: string;
  original_text: string;
  category?: string | null;
};

type StepRow = {
  step_number: number;
  heading?: string | null;
  body: string;
};

function upsertIngredients(db: any, recipeId: string, ingredients: IngredientRow[]) {
  db.prepare(`DELETE FROM curated_recipe_ingredients WHERE recipe_id = ?`).run(recipeId);
  const stmt = db.prepare(
    `INSERT INTO curated_recipe_ingredients (recipe_id, position, name, amount, unit, original_text, category)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  ingredients.forEach((ing, idx) => {
    stmt.run(
      recipeId,
      idx,
      ing.name,
      ing.amount,
      ing.unit,
      ing.original_text,
      ing.category ?? null,
    );
  });
}

function upsertInstructions(db: any, recipeId: string, steps: StepRow[]) {
  db.prepare(`DELETE FROM curated_recipe_instructions WHERE recipe_id = ?`).run(recipeId);
  const stmt = db.prepare(
    `INSERT INTO curated_recipe_instructions (recipe_id, step_number, heading, body)
     VALUES (?, ?, ?, ?)`,
  );
  steps.forEach((s) => {
    stmt.run(recipeId, s.step_number, s.heading ?? null, s.body);
  });
}

function updateTitleSummary(db: any, recipeId: string, title: string, summary: string) {
  db.prepare(`UPDATE curated_recipes SET title = ?, summary = ?, updated_at = datetime('now') WHERE recipe_id = ?`).run(
    title,
    summary,
    recipeId,
  );
}

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  const db = await getSharedLocalDb();

  const targetSlugs = [
    "teriyaki-salmon-grill",
    "pepperoni-pizza-night",
    "detroit-style-pizza",
    "ny-strip-herb-butter",
    "loaded-potato-feed",
  ] as const;

  const idBySlug = new Map<string, string>();
  for (const slug of targetSlugs) {
    const row = db
      .prepare(`SELECT recipe_id FROM curated_recipes WHERE slug = ? LIMIT 1`)
      .get(slug) as { recipe_id?: string } | undefined;
    if (!row?.recipe_id) throw new Error(`Missing recipe_id for slug: ${slug}`);
    idBySlug.set(slug, String(row.recipe_id));
  }

  // ARCHIVE: loaded-potato-feed (do not delete; do not change slug)
  {
    const recipeId = idBySlug.get("loaded-potato-feed")!;
    db.prepare(`UPDATE curated_recipes SET status = 'archived', updated_at = datetime('now') WHERE recipe_id = ?`).run(
      recipeId,
    );
    console.log(`[archive] loaded-potato-feed -> archived (${recipeId})`);
  }

  // REWRITE 1: teriyaki-salmon-grill
  {
    const slug = "teriyaki-salmon-grill";
    const recipeId = idBySlug.get(slug)!;
    const title = "Ginger-Soy Teriyaki Salmon (Grill or Broiler)";
    const summary = "Marinated salmon seared hot, then lacquered with a ginger-soy glaze and finished with sesame and scallions.";

    const ingredients: IngredientRow[] = [
      { name: "salmon fillets", amount: 3, unit: "lb", original_text: "3 lb salmon fillets" },
      { name: "soy sauce", amount: 0.5, unit: "cup", original_text: "1/2 cup soy sauce" },
      { name: "brown sugar", amount: 3, unit: "tbsp", original_text: "3 tbsp brown sugar" },
      { name: "rice vinegar", amount: 2, unit: "tbsp", original_text: "2 tbsp rice vinegar" },
      { name: "fresh ginger", amount: 1, unit: "tbsp", original_text: "1 tbsp grated fresh ginger" },
      { name: "garlic", amount: 4, unit: "cloves", original_text: "4 cloves garlic, grated" },
      { name: "sesame oil", amount: 2, unit: "tsp", original_text: "2 tsp sesame oil" },
      { name: "neutral oil", amount: 1, unit: "tbsp", original_text: "1 tbsp neutral oil (for grill grates)" },
      { name: "scallions", amount: 4, unit: "x", original_text: "4 scallions, thin-sliced" },
      { name: "toasted sesame seeds", amount: 2, unit: "tsp", original_text: "2 tsp toasted sesame seeds" },
      { name: "black pepper", amount: 1, unit: "tsp", original_text: "1 tsp black pepper" },
      { name: "kosher salt", amount: 1, unit: "tsp", original_text: "1 tsp kosher salt (if needed; depends on soy)" },
    ];

    const steps: StepRow[] = [
      {
        step_number: 1,
        heading: "Make the marinade + reserve glaze",
        body:
          "Whisk soy sauce, brown sugar, rice vinegar, ginger, garlic, sesame oil, and black pepper. Pour 1/3 into a small pot (this becomes your glaze). The rest is the marinade.",
      },
      {
        step_number: 2,
        heading: "Marinate (short and controlled)",
        body:
          "Pat salmon dry. Marinate 15–25 minutes (no longer than 30). Pull salmon out and let excess drip off so the sugar doesn’t scorch.",
      },
      {
        step_number: 3,
        heading: "Hot-zone sear, then move to cool-zone",
        body:
          "Heat grill for two zones (one hot, one cooler). Oil grates. Sear salmon on the hot side to set color, then slide to the cooler side to finish gently.",
      },
      {
        step_number: 4,
        heading: "Lacquer without burning sugar",
        body:
          "Simmer the reserved sauce 3–6 minutes until glossy. Brush a thin coat on the salmon during the last few minutes of cooking, then brush once more right off heat.",
      },
      {
        step_number: 5,
        heading: "Optional broiler finish (when the grill is full)",
        body:
          "If grill space is tight: broil salmon on a lined sheet pan. Brush glaze only in the final 2–3 minutes to avoid scorching.",
      },
      {
        step_number: 6,
        heading: "Finish and serve",
        body:
          "Rest 2 minutes. Top with scallions and sesame seeds. Serve family-style with rice and a quick cucumber salad if you’ve got it.",
      },
    ];

    updateTitleSummary(db, recipeId, title, summary);
    upsertIngredients(db, recipeId, ingredients);
    upsertInstructions(db, recipeId, steps);
    console.log(`[rewrite] ${slug} (${recipeId})`);
  }

  // REWRITE 2: pepperoni-pizza-night (NY-ish thin)
  {
    const slug = "pepperoni-pizza-night";
    const recipeId = idBySlug.get(slug)!;
    const title = "Classic Thin Pepperoni Pizza (NY-ish)";
    const summary = "Thin, foldable slices with sauce under cheese, finished with oregano, chili flake, and parmesan.";

    const ingredients: IngredientRow[] = [
      { name: "pizza dough", amount: 2, unit: "lb", original_text: "2 lb pizza dough (2 medium pies)" },
      { name: "crushed tomatoes", amount: 1.5, unit: "cups", original_text: "1 1/2 cups crushed tomatoes" },
      { name: "olive oil", amount: 1, unit: "tbsp", original_text: "1 tbsp olive oil" },
      { name: "garlic", amount: 2, unit: "cloves", original_text: "2 cloves garlic, grated" },
      { name: "dried oregano", amount: 2, unit: "tsp", original_text: "2 tsp dried oregano" },
      { name: "red pepper flakes", amount: 0.5, unit: "tsp", original_text: "1/2 tsp red pepper flakes" },
      { name: "mozzarella (low-moisture)", amount: 12, unit: "oz", original_text: "12 oz shredded low-moisture mozzarella" },
      { name: "pepperoni", amount: 6, unit: "oz", original_text: "6 oz pepperoni" },
      { name: "parmesan", amount: 0.25, unit: "cup", original_text: "1/4 cup grated parmesan" },
      { name: "kosher salt", amount: 1, unit: "tsp", original_text: "1 tsp kosher salt" },
      { name: "black pepper", amount: 1, unit: "tsp", original_text: "1 tsp black pepper" },
    ];

    const steps: StepRow[] = [
      {
        step_number: 1,
        heading: "Heat hard (steel, stone, or sheet pan)",
        body:
          "Preheat oven as hot as it goes (500–550°F). If you have a steel/stone, preheat it 30 minutes. If not, preheat a sheet pan upside-down so it’s ripping hot.",
      },
      {
        step_number: 2,
        heading: "Quick sauce (under the cheese)",
        body:
          "Stir crushed tomatoes with olive oil, garlic, oregano, salt, and pepper. Keep it uncooked so it stays bright on a fast bake.",
      },
      {
        step_number: 3,
        heading: "Stretch thin and build for foldable slices",
        body:
          "Stretch dough thinner than your Detroit pies. Spoon sauce first, then mozzarella, then pepperoni. Keep the edge clean for a crisp rim.",
      },
      {
        step_number: 4,
        heading: "Bake fast, rotate once",
        body:
          "Bake 8–12 minutes until the bottom is browned and the cheese is bubbling. Rotate once if your oven has a hot spot.",
      },
      {
        step_number: 5,
        heading: "Finish like a classic slice shop",
        body:
          "Right out of the oven: sprinkle parmesan and a pinch of chili flakes. Rest 2 minutes, slice, and serve as foldable wedges.",
      },
    ];

    updateTitleSummary(db, recipeId, title, summary);
    upsertIngredients(db, recipeId, ingredients);
    upsertInstructions(db, recipeId, steps);
    console.log(`[rewrite] ${slug} (${recipeId})`);
  }

  // REWRITE 3: detroit-style-pizza (true Detroit)
  {
    const slug = "detroit-style-pizza";
    const recipeId = idBySlug.get(slug)!;
    const title = "Detroit-Style Pepperoni Pizza (Crispy Frico Edges)";
    const summary = "Thick square pan pizza with cheese-to-the-edge frico and sauce stripes after the bake. Reheats like a champ.";

    const ingredients: IngredientRow[] = [
      { name: "pizza dough (high hydration)", amount: 2, unit: "lb", original_text: "2 lb high-hydration dough (for 1 pan)" },
      { name: "oil (for pan)", amount: 3, unit: "tbsp", original_text: "3 tbsp oil for the pan" },
      { name: "brick cheese (or mozzarella + cheddar)", amount: 14, unit: "oz", original_text: "14 oz brick cheese (or mozzarella + mild cheddar blend)" },
      { name: "pepperoni (cup-and-char if possible)", amount: 6, unit: "oz", original_text: "6 oz pepperoni (cup-and-char if you have it)" },
      { name: "pizza sauce", amount: 1, unit: "cup", original_text: "1 cup thick pizza sauce" },
      { name: "garlic", amount: 2, unit: "cloves", original_text: "2 cloves garlic, grated (optional)" },
      { name: "dried oregano", amount: 1, unit: "tsp", original_text: "1 tsp dried oregano" },
      { name: "kosher salt", amount: 1, unit: "tsp", original_text: "1 tsp kosher salt" },
      { name: "black pepper", amount: 1, unit: "tsp", original_text: "1 tsp black pepper" },
    ];

    const steps: StepRow[] = [
      {
        step_number: 1,
        heading: "Oil the pan and proof the dough",
        body:
          "Coat a Detroit-style pan (or sturdy metal 9x13) with oil. Press dough in, then rest 20–30 minutes. Press again to reach the corners without tearing.",
      },
      {
        step_number: 2,
        heading: "Cheese to the edge (frico is the point)",
        body:
          "Scatter cheese all the way to the edges so it melts against the pan and turns into crispy frico. Add pepperoni on top.",
      },
      {
        step_number: 3,
        heading: "Bake until deep golden",
        body:
          "Bake at 475–500°F until the top is browned and the edges are crackly—usually 14–18 minutes depending on your pan and oven.",
      },
      {
        step_number: 4,
        heading: "Sauce stripes after the bake",
        body:
          "Warm sauce with oregano (and optional garlic). Spoon in stripes (“racing lines”) over the pizza after it comes out so the crust stays crisp.",
      },
      {
        step_number: 5,
        heading: "Square slices + late-call reheat note",
        body:
          "Rest 3 minutes, loosen edges with a spatula, and cut into squares. Reheat slices in a skillet or hot oven to bring back the frico crunch.",
      },
    ];

    updateTitleSummary(db, recipeId, title, summary);
    upsertIngredients(db, recipeId, ingredients);
    upsertInstructions(db, recipeId, steps);
    console.log(`[rewrite] ${slug} (${recipeId})`);
  }

  // REWRITE 4: ny-strip-herb-butter (station steakhouse)
  {
    const slug = "ny-strip-herb-butter";
    const recipeId = idBySlug.get(slug)!;
    const title = "Station Steakhouse NY Strip with Charred Scallion Butter";
    const summary = "Cast-iron seared NY strip, rested and sliced on a platter with charred scallion-garlic butter and pan juices.";

    const ingredients: IngredientRow[] = [
      { name: "NY strip steaks", amount: 3, unit: "lb", original_text: "3 lb NY strip steaks" },
      { name: "kosher salt", amount: 2, unit: "tsp", original_text: "2 tsp kosher salt" },
      { name: "black pepper", amount: 2, unit: "tsp", original_text: "2 tsp black pepper" },
      { name: "neutral oil", amount: 1, unit: "tbsp", original_text: "1 tbsp neutral oil" },
      { name: "butter", amount: 4, unit: "tbsp", original_text: "4 tbsp butter" },
      { name: "scallions", amount: 6, unit: "x", original_text: "6 scallions" },
      { name: "garlic", amount: 3, unit: "cloves", original_text: "3 cloves garlic, grated" },
      { name: "lemon", amount: 1, unit: "x", original_text: "1 lemon (zest + a squeeze)" },
      { name: "Worcestershire sauce", amount: 2, unit: "tsp", original_text: "2 tsp Worcestershire sauce" },
      { name: "fresh thyme", amount: 1, unit: "tbsp", original_text: "1 tbsp chopped fresh thyme (or parsley)" },
    ];

    const steps: StepRow[] = [
      {
        step_number: 1,
        heading: "Salt early, dry the surface",
        body:
          "Salt the steaks 20–40 minutes ahead if you can. Pat dry right before cooking—dry meat sears, wet meat steams.",
      },
      {
        step_number: 2,
        heading: "Char the scallions + build the butter",
        body:
          "Char scallions in a dry skillet or right on the grill until blistered. Chop and mix with butter, garlic, thyme, lemon zest, and Worcestershire. Keep at room temp so it melts fast.",
      },
      {
        step_number: 3,
        heading: "Cast-iron sear (station steakhouse)",
        body:
          "Heat a cast-iron skillet until very hot. Add oil, then sear steaks hard on both sides. Lower heat briefly if needed so you get a brown crust without burning.",
      },
      {
        step_number: 4,
        heading: "Rest, then slice on a platter",
        body:
          "Rest 8–10 minutes. Slice across the grain and fan onto a platter. Spoon pan juices over the top.",
      },
      {
        step_number: 5,
        heading: "Butter finish + serve",
        body:
          "Dollop charred scallion butter over the sliced steak and finish with a squeeze of lemon. This is built for a crew—serve family-style with a starch and a simple green.",
      },
    ];

    updateTitleSummary(db, recipeId, title, summary);
    upsertIngredients(db, recipeId, ingredients);
    upsertInstructions(db, recipeId, steps);
    console.log(`[rewrite] ${slug} (${recipeId})`);
  }

  flushSqliteToDisk();
  releaseSqliteTimersForTests();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

