import { USDA_SAFE_TEMPS, type RecipeCorrection } from "../types.js";
import { field } from "./helpers.js";

/** B9 — method rewrites where an earlier ingredient correction left the steps behind. */
export const B9_INSTRUCTIONS: RecipeCorrection[] = [
  {
    slug: "beef-barley-soup", collection: "golden-100", batch: "B9-instruction-01", category: "instruction",
    findings: ["fewer_than_4_steps", "step_minutes_mismatch_cook_time", "hot_hold_temperature"],
    summary: "Method rewritten to match the corrected beef recipe: 5 steps that use every ingredient, add up to the 105-minute cook time, and hold at 140°F+",
    rationale:
      "B2 replaced the template ingredients but kept the old 3-step method: step minutes totalled 80 against a 105-minute cook time, the onion was never prepped, and the closing line said to rest the soup off heat while holding it at 180°F (a hard simmer that keeps thickening the barley). Hot holding only needs 140°F.",
    reference: USDA_SAFE_TEMPS,
    ops: [
      field(
        "steps",
        [
          { stepNumber: 1, title: "Brown the beef and vegetables", instruction: "Pat beef dry and season with half the salt and the pepper. Brown in batches in oil over medium-high so it sears instead of steaming; remove. Sweat onion, carrot, and celery in the same pot 8 minutes until edges soften.", minutes: 15, heatLevel: "medium" },
          { stepNumber: 2, title: "Simmer the pot", instruction: "Add broth, browned beef, thyme, and bay leaves. Cover and simmer gently 45 minutes, then stir in barley and simmer 30–45 minutes more until the beef is fork-tender and the barley is soft. Season with the remaining salt to taste.", minutes: 55, heatLevel: "medium-low" },
          { stepNumber: 3, title: "Skim and serve", instruction: "Skim fat if needed and remove bay leaves. Beef Barley Soup tastes better after 20 minutes off heat — hold at 180°F for late shifts.", minutes: 10, heatLevel: "low" },
        ],
        [
          { stepNumber: 1, title: "Brown the beef", instruction: "Pat the beef dry and season with half the salt and all the pepper. Heat the oil in a large Dutch oven over medium-high and brown the beef in 2 or 3 batches, about 4 minutes each, without crowding the pot so it sears instead of steaming. Move it to a bowl.", minutes: 15, heatLevel: "medium-high" },
          { stepNumber: 2, title: "Soften the vegetables", instruction: "Lower the heat to medium. Dice the onions and add them to the pot with the carrots and celery. Cook 8 minutes, scraping up the browned bits, until the edges soften.", minutes: 8, heatLevel: "medium" },
          { stepNumber: 3, title: "Simmer the beef", instruction: "Return the beef and its juices to the pot. Add the broth, thyme, and bay leaves, bring to a boil, then cover and simmer gently for 45 minutes.", minutes: 45, heatLevel: "medium-low" },
          { stepNumber: 4, title: "Add the barley", instruction: "Rinse the barley and stir it in. Simmer partly covered 30–45 minutes, stirring now and then so it doesn't catch on the bottom, until the beef is fork-tender and the barley is soft. Add a splash of water if it gets too thick.", minutes: 35, heatLevel: "medium-low" },
          { stepNumber: 5, title: "Season and serve", instruction: "Remove the bay leaves and skim any fat from the surface. Taste and add the remaining salt. For late calls, keep it covered on low at 140°F or above; it thickens as it sits, so loosen with broth or water before serving.", minutes: 2, heatLevel: "low" },
        ],
      ),
    ],
  },
];
