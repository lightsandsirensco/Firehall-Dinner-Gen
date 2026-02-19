import OpenAI from "openai";
import type { PizzaRequest, PizzaResponse } from "@shared/schema";
import { log } from "./index";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MAX_RETRIES = 2;

export interface PizzaAIResult {
  recipe: PizzaResponse;
  tokensIn: number;
  tokensOut: number;
}

const PIZZA_CONCEPTS = [
  "hot_honey_pepperoni", "big_mac_pizza", "buffalo_chicken", "bbq_chicken",
  "philly_cheesesteak", "taco_pizza", "chicken_bacon_ranch", "garlic_parm_white",
  "meatball_ricotta", "hawaiian", "spicy_italian", "greek_chicken",
  "veggie_supreme", "margherita", "cheeseburger_pizza", "breakfast_pizza",
  "nashville_hot_chicken", "pesto_chicken", "mushroom_truffle",
  "donair_style", "leftovers_pizza", "meat_lovers", "supreme_classic",
];

export function pickPizzaConcept(allergens: string[], lastStyleId?: string): string {
  let available = [...PIZZA_CONCEPTS];
  if (allergens.includes("eggs")) available = available.filter(c => c !== "breakfast_pizza");
  if (allergens.includes("nuts")) available = available.filter(c => c !== "pesto_chicken");
  if (lastStyleId) available = available.filter(c => c !== lastStyleId);
  if (available.length === 0) available = PIZZA_CONCEPTS.filter(c => c !== lastStyleId);
  return available[Math.floor(Math.random() * available.length)];
}

async function callAI(prompt: string, systemPrompt: string): Promise<{ content: string; tokensIn: number; tokensOut: number }> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const startMs = Date.now();
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 4096,
        response_format: { type: "json_object" },
      });

      const elapsed = Date.now() - startMs;
      const choice = response.choices[0];
      const content = choice?.message?.content;
      const usage = response.usage;

      log(`Pizza AI call completed in ${elapsed}ms (attempt ${attempt})`, "perf");

      if (content && content.trim().length > 10) {
        return {
          content,
          tokensIn: usage?.prompt_tokens || 0,
          tokensOut: usage?.completion_tokens || 0,
        };
      }

      log(`Pizza attempt ${attempt}/${MAX_RETRIES}: empty/short response`, "ai");
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 800 * attempt));
    } catch (err: any) {
      log(`Pizza attempt ${attempt}/${MAX_RETRIES}: ${err.message}`, "ai");
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 800 * attempt));
      else throw err;
    }
  }
  throw new Error("AI did not return a pizza recipe after multiple attempts. Please try again.");
}

export async function generatePizzaRecipe(
  request: PizzaRequest,
  conceptId: string
): Promise<PizzaAIResult> {
  const crewSize = request.crew_size;
  const pizzaCount = crewSize <= 4 ? "2-3" : crewSize <= 6 ? "3-4" : crewSize <= 8 ? "4-5" : crewSize <= 10 ? "5-6" : crewSize <= 14 ? "7-8" : crewSize <= 18 ? "9-10" : "10-12";

  const allergenLine = request.allergens_to_avoid.length > 0
    ? `ALLERGIES (CRITICAL): ${request.allergens_to_avoid.join(", ")} — exclude ALL.${request.allergens_to_avoid.includes("dairy") ? " Use dairy-free cheese." : ""}${request.allergens_to_avoid.includes("gluten") ? " Use GF dough." : ""}${request.allergens_to_avoid.includes("nuts") ? " No pesto/nut sauces." : ""}`
    : "";

  const doughLine = request.dough_option === "premade"
    ? "DOUGH: PREMADE. No dough recipe. Give stretching tips in step 1."
    : request.dough_option === "from_scratch"
    ? 'DOUGH: FROM SCRATCH. Include dough recipe in ingredients.dough array. Add make-ahead note.'
    : "DOUGH: SURPRISE ME. Pick premade or from-scratch based on time.";

  const styleLine = request.style_preference === "classic" ? "STYLE: Classic/traditional"
    : request.style_preference === "creative" ? "STYLE: Creative/viral/bold"
    : request.style_preference === "comfort" ? "STYLE: Comfort/hearty/loaded"
    : "STYLE: Healthier/lighter";

  const heatLine = request.heat_level === "mild" ? "HEAT: MILD. No spicy ingredients."
    : request.heat_level === "medium" ? "HEAT: MEDIUM. Light spice ok."
    : "HEAT: SPICY. Bring the heat!";

  const vegLine = request.vegetarian_swap_needed
    ? `VEG OPTION: 1 person. Add "veg_option" with description, swap_toppings, steps. NO TOFU. Use plant-based crumbles/mushrooms/roasted veg.${request.allergens_to_avoid.includes("dairy") ? " Dairy-free." : ""}`
    : "";

  const hasDough = request.dough_option === "from_scratch" || request.dough_option === "surprise_me";

  const prompt = `Generate ONE homemade oven pizza as JSON.

CONCEPT: ${conceptId.replace(/_/g, " ")} | ${styleLine} | ${heatLine}
CREW: ${crewSize} (${pizzaCount} large pizzas) | Time: ${request.time_available} min
${doughLine}
${allergenLine}
${vegLine}

RULES: Oven pizza only. Scale for ${pizzaCount} pizzas/${crewSize} people. 4-8 build steps. Safety: chicken 165°F, ground meat 160°F, pork 145°F+3min.

JSON:
{"pizza_style_id":"${conceptId}","title":"","dough_type":"","why_this_works":"","recommended_pizzas":"${pizzaCount} large pizzas for ${crewSize} people","timing":{"prep_minutes":0,"bake_minutes":0,"total_minutes":0},"oven_setup":{"preheat_temp_f":450,"preheat_temp_c":232,"rack_position":"","surface_option":""},"ingredients":{${hasDough ? '"dough":[],' : ""}"sauce":[],"cheese":[],"toppings":[],"drizzles":[]},"build_steps":[{"heading":"","body":""}],"protein_safety":[],"cleanup_tip":"","macros_per_serving":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}${request.vegetarian_swap_needed ? ',"veg_option":{"enabled":true,"description":"","swap_toppings":[],"steps":[]}' : ""}}`;

  const genStart = Date.now();
  log(`Generating pizza: ${conceptId} (crew: ${crewSize}, style: ${request.style_preference})`, "ai");

  const { content, tokensIn, tokensOut } = await callAI(
    prompt,
    "Firehall pizza chef. Return ONLY valid JSON. Practical homemade pizza for firefighter crews. No markdown."
  );

  const genElapsed = Date.now() - genStart;
  log(`Pizza generated in ${genElapsed}ms (${tokensIn}in/${tokensOut}out tokens)`, "perf");

  let recipe: PizzaResponse;
  try {
    recipe = JSON.parse(content) as PizzaResponse;
  } catch {
    log(`Pizza JSON parse failed: ${content.substring(0, 200)}`, "ai");
    throw new Error("Failed to parse pizza recipe. Please try again.");
  }

  recipe.pizza_style_id = conceptId;
  if (!recipe.timing) recipe.timing = { prep_minutes: 0, bake_minutes: 0, total_minutes: 0 };
  if (!recipe.oven_setup) recipe.oven_setup = { preheat_temp_f: 450, preheat_temp_c: 232, rack_position: "Middle", surface_option: "Sheet pan" };
  if (!recipe.protein_safety || !Array.isArray(recipe.protein_safety)) recipe.protein_safety = [];
  if (!recipe.ingredients) recipe.ingredients = { sauce: [], cheese: [], toppings: [], drizzles: [] };
  if (!recipe.build_steps || !Array.isArray(recipe.build_steps)) recipe.build_steps = [];
  if (!recipe.title) throw new Error("AI returned incomplete pizza data. Please try again.");

  return { recipe, tokensIn, tokensOut };
}
