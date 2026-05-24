import type { GenerateResponse, RecipeTags } from "@shared/schema";
import { log } from "./index";

const MEMORY_SIZE = 15;

interface RecentEntry {
  title: string;
  protein: string;
  cuisine: string;
  cooking_method: string;
  base_carb: string;
  structure_type: string;
  key_ingredients: string[];
  timestamp: number;
}

const recentRecipes: RecentEntry[] = [];

function inferStructureFromTitle(title: string, method: string): string {
  const t = title.toLowerCase();
  const m = method.toLowerCase();
  if (t.includes("bowl")) return "bowl";
  if (t.includes("wrap") || t.includes("burrito")) return "wrap";
  if (t.includes("taco")) return "taco";
  if (t.includes("sandwich") || t.includes("sub")) return "sandwich";
  if (t.includes("burger")) return "burger";
  if (t.includes("sheet pan") || m.includes("sheet")) return "sheet-pan";
  if (t.includes("stir-fry") || t.includes("stir fry")) return "stir-fry";
  if (t.includes("flatbread")) return "flatbread";
  if (t.includes("stuffed")) return "stuffed";
  if (t.includes("casserole")) return "casserole";
  if (t.includes("bake") && !t.includes("rice bake")) return "bake";
  if (t.includes("rice bake")) return "rice-bake";
  if (t.includes("soup") || t.includes("stew") || t.includes("chili") || t.includes("chowder")) return "soup-stew";
  if (t.includes("pasta") || t.includes("penne") || t.includes("spaghetti")) return "pasta";
  if (t.includes("noodle")) return "noodle-toss";
  if (t.includes("loaded fries") || t.includes("nacho fries")) return "loaded-fries";
  if (t.includes("one-pot") || t.includes("one pot")) return "one-pot";
  if (t.includes("breakfast") || t.includes("hash")) return "breakfast-for-dinner";
  if (t.includes("skillet") || m.includes("skillet")) return "skillet";
  if (t.includes("grill") || m.includes("grill")) return "grill";
  return m || "skillet";
}

const CUISINE_POOL = [
  "Mediterranean",
  "Mexican-inspired",
  "Korean-inspired",
  "Thai-inspired",
  "Indian-inspired",
  "Japanese-inspired",
  "Middle Eastern",
  "Italian-inspired (lighter)",
  "BBQ/Smoky (lean)",
  "Canadian comfort-lite",
];

export function recordRecipe(recipe: GenerateResponse): void {
  const tags = recipe.tags;
  const entry: RecentEntry = {
    title: recipe.title,
    protein: recipe.chosen_protein?.toLowerCase() || "",
    cuisine: tags?.cuisine?.toLowerCase() || "",
    cooking_method: tags?.cooking_method?.toLowerCase() || "",
    base_carb: tags?.base_carb?.toLowerCase() || "",
    structure_type: inferStructureFromTitle(recipe.title, tags?.cooking_method || ""),
    key_ingredients: tags?.key_ingredients?.map((k) => k.toLowerCase()) || [],
    timestamp: Date.now(),
  };

  recentRecipes.push(entry);
  if (recentRecipes.length > MEMORY_SIZE) {
    recentRecipes.shift();
  }

  log(`Variety memory: recorded "${entry.title}" (${entry.cuisine} / ${entry.cooking_method} / ${entry.base_carb}) — ${recentRecipes.length}/${MEMORY_SIZE} in memory`, "variety");
}

export interface VarietyConstraints {
  avoid_cuisines: string[];
  avoid_methods: string[];
  avoid_proteins: string[];
  avoid_carbs: string[];
  avoid_structures: string[];
  suggested_cuisine: string;
  recent_titles: string[];
}

export function getVarietyConstraints(cuisineStyle?: string): VarietyConstraints {
  const last3 = recentRecipes.slice(-3);
  const last2 = recentRecipes.slice(-2);

  const explicitCuisine = cuisineStyle && cuisineStyle !== "any";

  const avoid_cuisines = explicitCuisine ? [] : Array.from(new Set(last3.map((r) => r.cuisine).filter(Boolean)));
  const avoid_methods = Array.from(new Set(last3.map((r) => r.cooking_method).filter(Boolean)));
  const avoid_proteins = Array.from(new Set(last2.map((r) => r.protein).filter(Boolean)));
  const avoid_carbs = Array.from(new Set(last2.map((r) => r.base_carb).filter(Boolean)));
  const avoid_structures = Array.from(new Set(last3.map((r) => r.structure_type).filter(Boolean)));
  const recent_titles = recentRecipes.slice(-5).map((r) => r.title);

  let suggested_cuisine = "";
  if (!explicitCuisine) {
    const usedCuisinesLower = new Set(avoid_cuisines.map((c) => c.toLowerCase()));
    const available = CUISINE_POOL.filter((c) => !usedCuisinesLower.has(c.toLowerCase()));
    if (available.length > 0) {
      suggested_cuisine = available[Math.floor(Math.random() * available.length)];
    } else {
      suggested_cuisine = CUISINE_POOL[Math.floor(Math.random() * CUISINE_POOL.length)];
    }
  }

  return {
    avoid_cuisines,
    avoid_methods,
    avoid_proteins,
    avoid_carbs,
    avoid_structures,
    suggested_cuisine,
    recent_titles,
  };
}

export function buildVarietyPromptBlock(constraints: VarietyConstraints): string {
  const lines: string[] = [];

  lines.push("VARIETY RULES (enforce these):");

  if (constraints.avoid_cuisines.length > 0) {
    lines.push(`- Do NOT repeat these cuisines (used recently): ${constraints.avoid_cuisines.join(", ")}. Try: ${constraints.suggested_cuisine}.`);
  } else if (constraints.suggested_cuisine) {
    lines.push(`- Suggested cuisine: ${constraints.suggested_cuisine}. Rotate across: Mediterranean, Mexican, Korean, Thai, Indian, Japanese, Middle Eastern, Italian-lite, BBQ/Smoky, Canadian comfort-lite.`);
  }

  if (constraints.avoid_methods.length > 0) {
    lines.push(`- Do NOT repeat these cooking methods (used recently): ${constraints.avoid_methods.join(", ")}. Use a different method (stir-fry, sheet-pan, one-pot, grilling, braising, sautéing, baking, slow-cook, etc.).`);
  }

  if (constraints.avoid_structures.length > 0) {
    lines.push(`- Do NOT repeat these meal structures (used recently): ${constraints.avoid_structures.join(", ")}. Use a completely different format (bowl, wrap, taco, sandwich, burger, sheet-pan, casserole, pasta, stuffed, flatbread, etc.).`);
  }

  if (constraints.avoid_proteins.length > 0) {
    lines.push(`- Recently used proteins: ${constraints.avoid_proteins.join(", ")} — try a different cut/preparation if same protein is required.`);
  }

  if (constraints.avoid_carbs.length > 0) {
    lines.push(`- Do NOT repeat these base carbs (used recently): ${constraints.avoid_carbs.join(", ")}. Try a different base (quinoa, couscous, naan, sweet potato, farro, rice noodles, tortillas, pita, polenta, etc.).`);
  }

  if (constraints.recent_titles.length > 0) {
    lines.push(`- Recent recipes (do NOT repeat these): ${constraints.recent_titles.join("; ")}`);
  }

  return lines.join("\n");
}

export function buildHealthyPromptBlock(healthiness: string, timeAvailable: string): string {
  const lines: string[] = [];

  if (healthiness === "lean") {
    lines.push("HEALTHY CREW DINNER (mandatory — firehall tone, NOT a diet or meal-prep app):");
    lines.push("- Lighter, cleaner plates for the hall — still satisfying, craveable, and crew-sized.");
    lines.push("- FULL composed meals: quality protein + starch/grain + real vegetable sides (or equivalent veg volume).");
    lines.push("- Prefer grilling, roasting, sheet-pan, rice/grain bowls, wraps with slaw, Mediterranean/Mexican/Asian flavors.");
    lines.push("- Hearty portions — everyone leaves full. No tiny plates, no influencer meal-prep energy.");
    lines.push("");
    lines.push("GOOD EXAMPLES (match this energy):");
    lines.push("- Grilled chicken rice bowls, Greek chicken plates, steak + roasted potatoes + greens");
    lines.push("- Mediterranean bowls, salmon + potatoes + veg, chicken Caesar with real toppings");
    lines.push("- Turkey tacos with slaw, sheet-pan chicken + peppers + rice");
    lines.push("");
    lines.push("AVOID:");
    lines.push("- Plain chicken breast + broccoli only, sad side salads, deep-fried comfort bombs, mac-and-cheese feasts");
    lines.push("- Low-carb obsession, bland diet food, macro-tracker language in titles or copy");
    lines.push("");
    lines.push("FLAVOR & SIDES:");
    lines.push("- Bold but clean: citrus, herbs, garlic, ginger, chimichurri, salsa, yogurt sauces, spice blends");
    lines.push("- 2+ vegetable elements or a substantial veg side; prefer roasted/grilled/slaw over heavy cream sauces");
    lines.push("- Minimize deep-frying; olive oil, grilling, and roasting are preferred");
  } else if (healthiness === "balanced") {
    lines.push("BALANCED HALL MEAL:");
    lines.push("- Default hall dinner — hearty and practical; vegetables and protein still matter.");
    lines.push("- Occasional comfort is fine; avoid making every meal feel like diet food.");
  } else {
    return "";
  }

  if (timeAvailable === "15-25" || timeAvailable === "20-30") {
    lines.push("");
    lines.push("SHORT TIME WINDOW:");
    lines.push("- Prefer sheet-pan, skillet, or one-pan approaches when possible.");
    lines.push("- Frozen veg, pre-chopped produce, and rotisserie chicken are fair game on shift.");
  }

  return lines.join("\n");
}

export function getMemorySize(): number {
  return recentRecipes.length;
}
