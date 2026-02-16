import OpenAI from "openai";
import type { TemplateRow, GenerateRequest, GenerateResponse } from "@shared/schema";
import { log } from "./index";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MAX_RETRIES = 3;

export interface AIResult {
  recipe: GenerateResponse;
  tokensIn: number;
  tokensOut: number;
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

      const finishReason = choice?.finish_reason || "unknown";
      log(`Attempt ${attempt}/${MAX_RETRIES}: AI returned empty/short content. Finish reason: ${finishReason}`, "ai");

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    } catch (err: any) {
      log(`Attempt ${attempt}/${MAX_RETRIES}: AI call error: ${err.message}`, "ai");
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      } else {
        throw err;
      }
    }
  }

  throw new Error("AI did not return a recipe after multiple attempts. Please try again.");
}

export async function generateRecipe(
  template: TemplateRow,
  request: GenerateRequest,
  chosenProtein: string
): Promise<AIResult> {
  const allergenWarning =
    request.allergens_to_avoid.length > 0
      ? `CRITICAL: The crew has allergies: ${request.allergens_to_avoid.join(", ")}. Do NOT include any ingredients with these allergens. Use safe substitutes. This applies to BOTH the main recipe AND any vegetarian option.`
      : "No allergy restrictions.";

  const proteinDisplay = chosenProtein.charAt(0).toUpperCase() + chosenProtein.slice(1);

  const vegOptionBlock = request.vegetarian_swap_needed
    ? `
VEG OPTION REQUIRED: One crew member is vegetarian. Include a "veg_option" section in the JSON.
VEG OPTION RULES:
- The main recipe still uses ${proteinDisplay} for the crew.
- The veg_option makes the SAME meal vegetarian for 1 person only.
- Choose ONE vegetarian protein swap from: chickpeas, lentils, black beans, tofu, tempeh, paneer (only if dairy is NOT in allergens_to_avoid), or plant-based ground.
- The veg option must share the same base (same sauce, spices, base carbs) as the main meal.
- Provide a short parallel cooking method (5-10 minutes extra max).
- Include cross-contamination guidance: separate pan or cook veg first, separate utensils, label the vegetarian portion.
- The veg_option ingredients should only list the ADDITIONAL items needed for the 1-person vegetarian swap (not the shared base ingredients).
${request.allergens_to_avoid.includes("dairy") ? "- Do NOT use paneer or any dairy-based protein swap." : ""}
${request.allergens_to_avoid.includes("soy") ? "- Do NOT use tofu or tempeh as protein swap." : ""}
${request.allergens_to_avoid.includes("gluten") ? "- Ensure the veg protein swap is gluten-free." : ""}`
    : "";

  const exampleSwap = request.allergens_to_avoid.includes("soy")
    ? { protein: "chickpeas", item: "canned chickpeas", amount: "1 can (400g)", notes: "drained and rinsed" }
    : request.allergens_to_avoid.includes("dairy")
    ? { protein: "black beans", item: "canned black beans", amount: "1 can (400g)", notes: "drained and rinsed" }
    : { protein: "tofu", item: "firm tofu", amount: "200g", notes: "pressed and cubed" };

  const vegJsonBlock = request.vegetarian_swap_needed
    ? `,
  "veg_option": {
    "enabled": true,
    "swap_protein": "${exampleSwap.protein}",
    "ingredients": [{"item":"${exampleSwap.item}","amount":"${exampleSwap.amount}","notes":"${exampleSwap.notes}"}],
    "steps": ["Cook ${exampleSwap.protein} in a separate pan over medium-high heat (5 min). Toss with same sauce as main recipe."],
    "plating_notes": "Plate on a separate dish, label 'VEG'. Use separate serving utensils."
  }`
    : "";

  const prompt = `Generate ONE firehall meal recipe as JSON.

TEMPLATE: ${template.template_name} (${template.style}) - ${template.base_idea_description}
Appliances: ${template.appliances_needed}

CREW: ${request.crew_size} people | Shift: ${request.busy_level} | Time: ${request.time_available} min
Appliances available: ${request.appliances.join(", ")}
Healthiness: ${request.healthiness_preference}
${allergenWarning}

PRIMARY PROTEIN: ${proteinDisplay}
CRITICAL PROTEIN RULE: Use ONLY "${proteinDisplay}" as the primary protein in this recipe. Do NOT include any other meats or proteins as main ingredients. Small accent ingredients (e.g., bacon bits as garnish, parmesan) are acceptable, but the main protein must be ONLY ${proteinDisplay}.
${vegOptionBlock}
RULES:
- Scale for ${request.crew_size} servings. 4-6 interruptible steps. 8-12 ingredients. Target 35-60g protein/serving.
- Every step MUST include explicit temperature (oven temp in °F/°C, or stove heat level like "medium-high") AND approximate cook time.
- Steps MUST mention when to check internal temperature and the exact target number.
- SAUSAGE RULE: Sausage is NOT a standalone protein. It is always a subtype of its base meat. If the recipe uses sausage, specify the base protein (e.g., "Pork Sausage", "Chicken Sausage", "Turkey Sausage"). Use the correct safety temp for the base meat. Generic "sausage" = pork sausage.
- FOOD SAFETY TEMPS (mandatory):
  * Chicken/turkey (including chicken/turkey sausage): 165°F / 74°C
  * Ground meats and sausage (beef, pork): 160°F / 71°C
  * Whole pork/pork chops: 145°F / 63°C + 3 min rest
  * Fish/seafood: 145°F / 63°C
  * Reheating leftovers: 165°F / 74°C

REQUIRED JSON FORMAT:
{
  "template_id": ${template.template_id},
  "chosen_protein": "${proteinDisplay}",
  "title": "string",
  "why_it_fits_tonight": "string",
  "timing": {
    "prep_minutes": 0,
    "cook_minutes": 0,
    "total_minutes": 0
  },
  "protein_safety": [
    {
      "protein": "Chicken breast",
      "target_temp_f": 165,
      "target_temp_c": 74,
      "rest_minutes": 5,
      "probe_where": "Thickest part of the breast, avoiding bone",
      "notes": "Juices run clear, no pink in center"
    }
  ],
  "ingredients": [{"item":"string","amount":"string","notes":"string"}],
  "steps": [
    {"heading":"Preheat & prep (425°F / 218°C, ~8 min)","body":"Season chicken. Halve potatoes and toss with oil."},
    {"heading":"Roast potatoes (10 min)","body":"Spread in single layer, roast until slightly softened."},
    {"heading":"Add chicken (18–20 min)","body":"Place chicken in center of pan. Remove at 165°F / 74°C."},
    {"heading":"Rest & serve (5 min)","body":"Let chicken rest, then slice and plate."}
  ],
  "cleanup_tip": "string",
  "macros_per_serving": {"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}${vegJsonBlock}
}

IMPORTANT:
- protein_safety MUST have one entry for EACH protein in the recipe.
- STEP FORMAT: Each step is an object with "heading" and "body". The heading is a short scannable label with temp/time in parentheses (e.g., "Roast chicken (425°F, 20 min)"). The body contains only short, direct action phrases. NEVER repeat info from the heading in the body. Mention internal temp only once in the most relevant step. No filler phrases like "While oven preheats" or "This step is interruptible". Keep it concise and operational.`;

  log(`Generating recipe from template: ${template.template_name} (ID: ${template.template_id})`, "ai");

  const { content, tokensIn, tokensOut } = await callAI(
    prompt,
    "You are a firehall chef focused on food safety. Return ONLY valid JSON. No markdown. No code fences. Always include cooking temperatures and internal temp targets for every protein."
  );

  log(`AI response received (${content.length} chars, ${tokensIn} in / ${tokensOut} out tokens)`, "ai");

  let recipe: GenerateResponse;
  try {
    recipe = JSON.parse(content) as GenerateResponse;
  } catch {
    log(`Failed to parse AI JSON: ${content.substring(0, 200)}`, "ai");
    throw new Error("Failed to parse AI response. Please try again.");
  }

  recipe.template_id = parseInt(template.template_id);
  recipe.chosen_protein = proteinDisplay;

  if (!recipe.timing) {
    recipe.timing = { prep_minutes: 0, cook_minutes: 0, total_minutes: 0 };
  }
  if (!recipe.protein_safety || !Array.isArray(recipe.protein_safety)) {
    recipe.protein_safety = [];
  }

  if (!recipe.title || !recipe.ingredients || !recipe.steps) {
    throw new Error("AI returned incomplete recipe data. Please try again.");
  }

  return { recipe, tokensIn, tokensOut };
}
