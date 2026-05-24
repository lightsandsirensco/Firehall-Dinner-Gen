import type { PizzaRequest, PizzaResponse } from "@shared/schema";
import { log } from "./logger.js";
import { createOpenAIClient, hasOpenAIKey } from "./openai-client.js";
import { buildPizzaTemplate } from "./pizza-templates.js";
import { finalizePizzaRecipe } from "./pizza-finalize.js";

const MAX_RETRIES = 2;
const AI_TIMEOUT_MS = 28_000;

export interface PizzaAIResult {
  recipe: PizzaResponse;
  tokensIn: number;
  tokensOut: number;
  fromTemplate?: boolean;
}

const PIZZA_CONCEPTS = [
  "hot_honey_pepperoni",
  "big_mac_pizza",
  "buffalo_chicken",
  "bbq_chicken",
  "philly_cheesesteak",
  "taco_pizza",
  "chicken_bacon_ranch",
  "garlic_parm_white",
  "meatball_ricotta",
  "hawaiian",
  "spicy_italian",
  "greek_chicken",
  "veggie_supreme",
  "margherita",
  "cheeseburger_pizza",
  "breakfast_pizza",
  "nashville_hot_chicken",
  "pesto_chicken",
  "mushroom_truffle",
  "donair_style",
  "leftovers_pizza",
  "meat_lovers",
  "supreme_classic",
];

export function pickPizzaConcept(allergens: string[], lastStyleId?: string): string {
  let available = [...PIZZA_CONCEPTS];
  if (allergens.includes("eggs")) available = available.filter((c) => c !== "breakfast_pizza");
  if (allergens.includes("nuts")) available = available.filter((c) => c !== "pesto_chicken");
  if (lastStyleId) available = available.filter((c) => c !== lastStyleId);
  if (available.length === 0) available = PIZZA_CONCEPTS.filter((c) => c !== lastStyleId);
  return available[Math.floor(Math.random() * available.length)];
}

async function callAI(
  prompt: string,
  systemPrompt: string,
): Promise<{ content: string; tokensIn: number; tokensOut: number }> {
  const openai = createOpenAIClient();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const startMs = Date.now();
      const apiPromise = openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: 2800,
        temperature: 0.4,
        response_format: { type: "json_object" },
      });

      const response = await Promise.race([
        apiPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Pizza AI timeout")), AI_TIMEOUT_MS),
        ),
      ]);

      const elapsed = Date.now() - startMs;
      const content = response.choices[0]?.message?.content;
      const usage = response.usage;

      log(`[pizza] AI call ${elapsed}ms attempt ${attempt}`, "perf");

      if (content && content.trim().length > 20) {
        return {
          content,
          tokensIn: usage?.prompt_tokens || 0,
          tokensOut: usage?.completion_tokens || 0,
        };
      }

      log(`[pizza] attempt ${attempt}: empty/short response`, "ai");
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 600 * attempt));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`[pizza] attempt ${attempt}: ${msg}`, "ai");
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 600 * attempt));
      else throw err;
    }
  }
  throw new Error("Pizza AI did not return a valid recipe.");
}

function buildPrompt(request: PizzaRequest, conceptId: string): string {
  const crewSize = request.crew_size;
  const pizzaCount =
    crewSize <= 4
      ? "2-3"
      : crewSize <= 6
        ? "3-4"
        : crewSize <= 8
          ? "4-5"
          : crewSize <= 10
            ? "5-6"
            : "6+";

  const allergenLine =
    request.allergens_to_avoid.length > 0
      ? `ALLERGIES (CRITICAL): ${request.allergens_to_avoid.join(", ")} — exclude ALL.${request.allergens_to_avoid.includes("dairy") ? " Use dairy-free cheese." : ""}${request.allergens_to_avoid.includes("gluten") ? " Use GF dough." : ""}${request.allergens_to_avoid.includes("nuts") ? " No pesto/nut sauces." : ""}`
      : "";

  const doughLine =
    request.dough_option === "premade"
      ? "DOUGH: PREMADE. List premade dough in ingredients.dough. Step 1 = stretch tips."
      : request.dough_option === "from_scratch"
        ? "DOUGH: FROM SCRATCH. Full dough recipe in ingredients.dough."
        : "DOUGH: SURPRISE ME.";

  const styleLine =
    request.style_preference === "classic"
      ? "STYLE: Classic/traditional"
      : request.style_preference === "creative"
        ? "STYLE: Creative/viral/bold"
        : request.style_preference === "comfort"
          ? "STYLE: Comfort/hearty/loaded"
          : "STYLE: Healthier/lighter";

  const heatLine =
    request.heat_level === "mild"
      ? "HEAT: MILD"
      : request.heat_level === "medium"
        ? "HEAT: MEDIUM"
        : "HEAT: SPICY";

  const hasDough = request.dough_option === "from_scratch" || request.dough_option === "surprise_me";

  return `Generate ONE homemade oven pizza as JSON for a firefighter hall.

CONCEPT: ${conceptId.replace(/_/g, " ")} | ${styleLine} | ${heatLine}
CREW: ${crewSize} (${pizzaCount} large pizzas) | Time: ${request.time_available} min
${doughLine}
${allergenLine}

COMPOSITION RULES (mandatory):
- ingredients.sauce: base sauce(s) only
- ingredients.cheese: all cheese
- ingredients.toppings: proteins and vegetables (not sauce/cheese)
- ingredients.drizzles: finishing sauces after bake (ranch, hot honey, balsamic, etc.)
- Example buffalo chicken: sauce=buffalo+ranch base, cheese=mozzarella, toppings=chicken+red onion+green onion, drizzles=ranch drizzle
- Example BBQ chicken: sauce=BBQ, cheese=mozzarella, toppings=chicken+red onion, drizzles=extra BBQ
- Example supreme: sauce=pizza sauce, cheese=mozzarella, toppings=pepperoni+sausage+peppers+mushrooms+onion

STEPS: 5-8 build_steps. Beginner-friendly — each body 3-4 sentences with heat, visual cues, and doneness. Include prep and serve steps.

JSON:
{"pizza_style_id":"${conceptId}","title":"","dough_type":"","why_this_works":"","recommended_pizzas":"${pizzaCount} large pizzas for ${crewSize} people","timing":{"prep_minutes":0,"bake_minutes":0,"total_minutes":0},"oven_setup":{"preheat_temp_f":475,"preheat_temp_c":246,"rack_position":"","surface_option":""},"ingredients":{${hasDough ? '"dough":[{"item":"","amount":"","notes":""}],' : ""}"sauce":[],"cheese":[],"toppings":[],"drizzles":[]},"build_steps":[{"heading":"","body":""}],"protein_safety":[],"cleanup_tip":"","macros_per_serving":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}}`;
}

export async function generatePizzaRecipe(
  request: PizzaRequest,
  conceptId: string,
): Promise<PizzaAIResult> {
  log(`[pizza] generate concept=${conceptId} crew=${request.crew_size} dough=${request.dough_option}`, "ai");

  if (!hasOpenAIKey()) {
    log("[pizza] No OpenAI key — using hall template", "pizza");
    const recipe = finalizePizzaRecipe(buildPizzaTemplate(conceptId, request), request, conceptId, "template");
    return { recipe, tokensIn: 0, tokensOut: 0, fromTemplate: true };
  }

  try {
    const prompt = buildPrompt(request, conceptId);
    const { content, tokensIn, tokensOut } = await callAI(
      prompt,
      "You are the fire hall pizza lead. Return ONLY valid JSON. Practical oven pizza for crews. No markdown.",
    );

    let parsed: PizzaResponse;
    try {
      parsed = JSON.parse(content) as PizzaResponse;
    } catch {
      log(`[pizza] JSON parse failed: ${content.slice(0, 180)}`, "ai");
      throw new Error("Invalid AI JSON");
    }

    const recipe = finalizePizzaRecipe(parsed, request, conceptId, "ai");
    return { recipe, tokensIn, tokensOut, fromTemplate: false };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[pizza] AI failed (${msg}) — hall template fallback`, "pizza");
    const recipe = finalizePizzaRecipe(buildPizzaTemplate(conceptId, request), request, conceptId, "template");
    return { recipe, tokensIn: 0, tokensOut: 0, fromTemplate: true };
  }
}
