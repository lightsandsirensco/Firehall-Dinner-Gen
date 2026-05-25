import type { PizzaRequest, PizzaResponse } from "@shared/schema";
import { log } from "./logger.js";
import { createOpenAIClient, hasOpenAIKey } from "./openai-client.js";
import { buildPizzaTemplate } from "./pizza-templates.js";
import { finalizePizzaRecipe } from "./pizza-finalize.js";
import { FIREHALL_VOICE_RULES } from "@shared/firehall-instruction-voice.js";
import { getPizzaConceptMeta } from "@shared/pizza-concepts.js";

const MAX_RETRIES = 2;
const AI_TIMEOUT_MS = 28_000;

const PIZZA_SYSTEM_PROMPT = `You are the fire hall pizza lead writing oven recipes for a hungry crew. Return ONLY valid JSON. No markdown.

${FIREHALL_VOICE_RULES}

PIZZA-SPECIFIC RULES (mandatory):
- Every build_step must explain HOW to make THIS pizza — reference actual sauce, cheese, and toppings by name from your ingredients lists.
- Include prep for proteins (brown chicken, cook sausage, make special sauces) BEFORE stretching dough when applicable.
- Explain layering order: sauce → cheese → toppings that bake → post-bake finishes (lettuce, pickles, drizzles).
- Coordinate timing (e.g. garlic bread or sauce prep while oven preheats).
- 6–8 build_steps. Each body 3–5 sentences (~50–90 words) with heat, minutes, color/smell/texture cues, and common mistakes.
- NEVER use: "watch for visual cues", "work over medium heat", "spread evenly", "spread sauce thinly; cover with mozzarella", "prepare ingredients carefully".
- Big Mac / burger pizzas: cook seasoned beef, build special sauce, sesame crust rim, pickles/lettuce AFTER bake.
- Buffalo/BBQ: thin sauce layer, drain wet toppings, post-bake ranch or cilantro.
- White pies: thin cream base, watch for scorching.
- Dessert: lower temp, post-bake fruit.`;

export interface PizzaAIResult {
  recipe: PizzaResponse;
  tokensIn: number;
  tokensOut: number;
  fromTemplate?: boolean;
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
        max_tokens: 3200,
        temperature: 0.45,
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
  const meta = getPizzaConceptMeta(conceptId);
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

  const modeLine = request.generation_mode
    ? `MODE: ${request.generation_mode.replace(/_/g, " ")}`
    : "";

  const doughLine =
    request.dough_option === "premade"
      ? "DOUGH: PREMADE. List premade dough in ingredients.dough. Include stretch step with tips."
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

  const sideHint =
    request.include_hall_side && meta?.recommendedSides?.length
      ? ` | optional hall side (if crew wants): ${request.hall_side_preference?.trim() || meta.recommendedSides.join(", ")}`
      : " | no hall side required — pizza only";

  const conceptHints = meta
    ? `CONCEPT META: ${meta.title} | crust: ${meta.crust} | sauce style: ${meta.sauceStyle} | optional after bake: ${meta.optionalToppings.join(", ") || "none"}${sideHint}`
    : "";

  return `Generate ONE homemade oven pizza as JSON for a firefighter hall.

CONCEPT: ${conceptId.replace(/_/g, " ")} | ${styleLine} | ${heatLine}
CREW: ${crewSize} (${pizzaCount} large pizzas) | Time budget: ${request.time_available} min
${modeLine}
${doughLine}
${allergenLine}
${conceptHints}

INGREDIENT GROUPING (mandatory):
- ingredients.sauce = base sauces only (not cheese)
- ingredients.cheese = all cheese
- ingredients.toppings = proteins and vegetables that go on before/during bake
- ingredients.drizzles = finishing items after bake (ranch drizzle, hot honey, lettuce, extra sauce)
- Name every ingredient specifically in build_steps — steps must teach that exact pizza.

STEP QUALITY BAR:
- If this is ${meta?.title ?? conceptId}: include technique unique to that dish (e.g. burger pizzas need seasoned beef crumbles + sauce built in a bowl + sesame crust + post-bake lettuce/pickles).
- Prep station → cook proteins/sauces → preheat → stretch → build with layering detail → bake with 475°F cues → rest/finish/post-bake toppings → slice for crew.

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
    const { content, tokensIn, tokensOut } = await callAI(prompt, PIZZA_SYSTEM_PROMPT);

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
