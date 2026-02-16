import OpenAI from "openai";
import type { PizzaRequest, PizzaResponse } from "@shared/schema";
import { log } from "./index";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MAX_RETRIES = 3;

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

  if (allergens.includes("eggs")) {
    available = available.filter(c => c !== "breakfast_pizza");
  }
  if (allergens.includes("nuts")) {
    available = available.filter(c => c !== "pesto_chicken");
  }

  if (lastStyleId) {
    available = available.filter(c => c !== lastStyleId);
  }

  if (available.length === 0) available = PIZZA_CONCEPTS.filter(c => c !== lastStyleId);

  return available[Math.floor(Math.random() * available.length)];
}

async function callAI(prompt: string, systemPrompt: string): Promise<{ content: string; tokensIn: number; tokensOut: number }> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 8192,
        response_format: { type: "json_object" },
      });

      const choice = response.choices[0];
      const content = choice?.message?.content;
      const usage = response.usage;

      if (content && content.trim().length > 10) {
        return {
          content,
          tokensIn: usage?.prompt_tokens || 0,
          tokensOut: usage?.completion_tokens || 0,
        };
      }

      log(`Pizza attempt ${attempt}/${MAX_RETRIES}: AI returned empty/short content.`, "ai");
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    } catch (err: any) {
      log(`Pizza attempt ${attempt}/${MAX_RETRIES}: AI call error: ${err.message}`, "ai");
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      } else {
        throw err;
      }
    }
  }
  throw new Error("AI did not return a pizza recipe after multiple attempts. Please try again.");
}

export async function generatePizzaRecipe(
  request: PizzaRequest,
  conceptId: string
): Promise<PizzaAIResult> {
  const allergenWarning =
    request.allergens_to_avoid.length > 0
      ? `CRITICAL ALLERGIES: ${request.allergens_to_avoid.join(", ")}. STRICTLY AVOID all ingredients containing these allergens.
${request.allergens_to_avoid.includes("dairy") ? "- DAIRY AVOIDED: Use dairy-free cheese alternatives (vegan mozzarella, nutritional yeast). Use olive oil or dairy-free sauce base. Mention dairy-free alternatives explicitly." : ""}
${request.allergens_to_avoid.includes("gluten") ? "- GLUTEN AVOIDED: Suggest a gluten-free premade dough option. Note cross-contamination risks with shared surfaces. If from-scratch dough, provide a GF flour blend recipe." : ""}
${request.allergens_to_avoid.includes("nuts") ? "- NUTS AVOIDED: No pesto (contains pine nuts), no walnut toppings, no nut-based sauces. Provide nut-free alternatives." : ""}
${request.allergens_to_avoid.includes("soy") ? "- SOY AVOIDED: No soy sauce, no tofu. Check cheese alternatives for soy content." : ""}
${request.allergens_to_avoid.includes("eggs") ? "- EGGS AVOIDED: No egg wash, no breakfast pizza with eggs. Check dough recipe for eggs." : ""}`
      : "No allergy restrictions.";

  const doughBlock = request.dough_option === "premade"
    ? `DOUGH: PREMADE - Do NOT include a dough recipe. Instead provide simple stretching/shaping tips. This shortens total time.`
    : request.dough_option === "from_scratch"
    ? `DOUGH: FROM SCRATCH - Include a simple dough recipe with ingredients (flour, yeast, water, olive oil, salt, sugar). Include rise times. Add a "make-ahead" note for firehall practicality (e.g., "Make dough in the morning, refrigerate, use at dinner"). The "dough" ingredient array must list all dough ingredients.`
    : `DOUGH: SURPRISE ME - Choose either premade or from-scratch based on the time available and what best fits this pizza concept. If premade, give stretching tips. If from-scratch, include the dough recipe.`;

  const styleBlock = request.style_preference === "classic"
    ? "STYLE: Classic - Traditional pizza flavors (margherita, pepperoni, meat lovers, etc.). Keep it familiar and crowd-pleasing."
    : request.style_preference === "creative"
    ? "STYLE: Creative / Viral - Unique, trendy, social-media-worthy pizza concepts. Think Big Mac pizza, Nashville hot chicken pizza, donair pizza. Bold and unexpected."
    : request.style_preference === "comfort"
    ? "STYLE: Comfort / Heavy - Hearty, loaded, indulgent pizzas. Lots of cheese, rich sauces, meaty toppings. Think cheeseburger pizza, meat lovers, meatball ricotta."
    : "STYLE: Healthier - Lighter toppings, more vegetables, lean proteins. Thinner crust preferred. Think Greek chicken, veggie supreme, pesto chicken.";

  const heatBlock = request.heat_level === "mild"
    ? "HEAT: MILD - No spicy ingredients. No hot sauce, no jalapenos, no chili flakes. Keep it family-friendly."
    : request.heat_level === "medium"
    ? "HEAT: MEDIUM - Light spice is okay. Mild jalapenos, a light drizzle of hot sauce, pepper flakes on the side."
    : "HEAT: SPICY - Bring the heat! Hot honey, jalapenos, calabrian chili, Nashville hot sauce, sriracha drizzle. Make it fiery.";

  const vegBlock = request.vegetarian_swap_needed
    ? `VEG OPTION REQUIRED: One crew member is vegetarian. Include a "veg_option" in the JSON.
- Make the SAME pizza concept vegetarian for 1 person (1 personal pizza or portion of a large).
- NO TOFU as a swap. Use: roasted vegetables, plant-based crumbles, mushrooms, artichokes, roasted peppers, olives, caramelized onions.
- Must match the same flavor profile (e.g., Big Mac pizza veg version uses plant-based crumbles + pickles + special sauce).
- Keep it practical: same dough, same base sauce, just different toppings.
${request.allergens_to_avoid.includes("dairy") ? "- Veg option must also be dairy-free." : ""}
${request.allergens_to_avoid.includes("soy") ? "- No soy-based meat alternatives." : ""}`
    : "";

  const vegJsonBlock = request.vegetarian_swap_needed
    ? `,
  "veg_option": {
    "enabled": true,
    "description": "Brief description of the veg version",
    "swap_toppings": [{"item":"string","amount":"string","notes":"string"}],
    "steps": ["Step to make the veg version"]
  }`
    : "";

  const crewSize = request.crew_size;
  const pizzaCount = crewSize <= 4 ? "2-3" : crewSize <= 6 ? "3-4" : crewSize <= 8 ? "4-5" : crewSize <= 10 ? "5-6" : crewSize <= 14 ? "7-8" : crewSize <= 18 ? "9-10" : "10-12";

  const prompt = `Generate ONE homemade oven pizza recipe as JSON for a firehall crew pizza night.

PIZZA CONCEPT: ${conceptId.replace(/_/g, " ")}
${styleBlock}
${heatBlock}

CREW: ${crewSize} people
Recommended pizza count: ${pizzaCount} large pizzas
Time available: ${request.time_available} minutes

${doughBlock}

${allergenWarning}

${vegBlock}

RULES:
- This is HOMEMADE OVEN pizza only. Not delivery, not frozen, not flatbread.
- Must require an oven.
- Scale all ingredients to make ${pizzaCount} large pizzas for ${crewSize} people.
- Keep portions realistic for hungry firefighters (2-3 slices per person minimum).
- Include a single primary meat topping (or go vegetarian if the concept calls for it).
- 4-8 clear, non-repetitive build steps. Do NOT duplicate "preheat" text across steps.
- Include bake time ranges (e.g., "10-14 minutes").
- FOOD SAFETY: If using chicken, beef, or pork toppings, include safe internal temp check:
  * Chicken/turkey: 165°F / 74°C
  * Ground beef/pork/sausage: 160°F / 71°C
  * Whole pork: 145°F / 63°C + 3 min rest
- Include drizzles/finishing sauces (hot honey, ranch, special sauce, etc.) as separate ingredient group.

REQUIRED JSON FORMAT:
{
  "pizza_style_id": "${conceptId}",
  "title": "Creative Pizza Title",
  "dough_type": "Premade" or "From Scratch",
  "why_this_works": "1-2 lines why this is a great pick tonight",
  "recommended_pizzas": "${pizzaCount} large pizzas for ${crewSize} people",
  "timing": {
    "prep_minutes": 0,
    "bake_minutes": 0,
    "total_minutes": 0
  },
  "oven_setup": {
    "preheat_temp_f": 450,
    "preheat_temp_c": 232,
    "rack_position": "Middle or lower-middle",
    "surface_option": "Sheet pan, pizza stone, or pizza steel"
  },
  "ingredients": {
    ${request.dough_option === "from_scratch" || request.dough_option === "surprise_me" ? '"dough": [{"item":"string","amount":"string","notes":"string"}],' : ""}
    "sauce": [{"item":"string","amount":"string","notes":"string"}],
    "cheese": [{"item":"string","amount":"string","notes":"string"}],
    "toppings": [{"item":"string","amount":"string","notes":"string"}],
    "drizzles": [{"item":"string","amount":"string","notes":"string"}]
  },
  "build_steps": [
    {"heading":"Step label with temp/time","body":"Clear action"}
  ],
  "protein_safety": [
    {"protein":"string","target_temp_f":165,"target_temp_c":74,"rest_minutes":0,"probe_where":"string","notes":"string"}
  ],
  "cleanup_tip": "string",
  "macros_per_serving": {"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}${vegJsonBlock}
}

IMPORTANT:
- "pizza_style_id" must be exactly "${conceptId}".
- protein_safety: Include one entry per meat protein used. If vegetarian pizza with no meat, use an empty array [].
- macros_per_serving: Per 2-slice serving.
- build_steps: Each step is {"heading":"...","body":"..."}. heading is a short label with temp/time. body is concise action.
- If dough is premade, do NOT include a "dough" key in ingredients. Instead mention premade dough in the sauce/toppings notes or first build step.
- If dough is from scratch, include a "dough" key in ingredients with all dough ingredients.`;

  log(`Generating pizza recipe: ${conceptId} (crew: ${crewSize}, style: ${request.style_preference})`, "ai");

  const { content, tokensIn, tokensOut } = await callAI(
    prompt,
    "You are a firehall pizza chef. Return ONLY valid JSON. No markdown. No code fences. Create delicious, practical homemade pizza recipes for firefighter crews."
  );

  log(`Pizza AI response received (${content.length} chars, ${tokensIn} in / ${tokensOut} out tokens)`, "ai");

  let recipe: PizzaResponse;
  try {
    recipe = JSON.parse(content) as PizzaResponse;
  } catch {
    log(`Failed to parse pizza AI JSON: ${content.substring(0, 200)}`, "ai");
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
