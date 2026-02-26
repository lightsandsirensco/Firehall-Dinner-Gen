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

export function buildHealthyPromptBlock(healthiness: string, busyLevel: string): string {
  const lines: string[] = [];

  if (healthiness === "lean") {
    lines.push("HEALTHY DIRECTIVE (100% healthy — this is mandatory):");
    lines.push("- This MUST be a healthy, high-protein, nutrient-dense meal. No exceptions.");
  } else if (healthiness === "balanced") {
    lines.push("HEALTHY DIRECTIVE (healthy-leaning — 70% chance this should be healthy):");
    lines.push("- Prefer a healthy, high-protein meal but occasional comfort-inspired options are fine if still nutritious.");
  } else {
    return "";
  }

  lines.push("HEALTHY QUALITY SIGNALS (include at least 2 of these):");
  lines.push("- 30g+ protein per serving");
  lines.push("- 1+ high-fiber ingredient (beans, lentils, chickpeas, whole grains, veg-heavy)");
  lines.push("- Healthy fat source (olive oil, avocado, nuts, seeds)");
  lines.push("- Veg volume (2+ cups veg per serving OR 3+ vegetable ingredients)");
  lines.push("- Lower added sugar (no sweet sauces unless low-sugar alternative)");
  lines.push("");
  lines.push("AVOID 'BORING HEALTHY':");
  lines.push("- Do NOT default to plain chicken + broccoli + rice. Be creative.");
  lines.push("- Avoid generic 'salad' meals.");
  lines.push("- Use bold healthy flavor builders: citrus, vinegars, fresh herbs, garlic, ginger, spice blends, yogurt sauces, salsa verde, chimichurri, gochujang (lower sugar), miso, tahini-lemon, harissa, chermoula, etc.");

  if (busyLevel === "busy" || busyLevel === "slammed") {
    lines.push("");
    lines.push("STATION PRACTICALITY (busy hall):");
    lines.push("- Prefer one-pan, sheet-pan, slow cooker, or single-pot meals.");
    lines.push("- Include prep shortcuts: pre-chopped veg, frozen veg, rotisserie chicken if applicable.");
  }

  return lines.join("\n");
}

export function getMemorySize(): number {
  return recentRecipes.length;
}
