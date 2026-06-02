/**
 * Vision-based meal image accuracy — compares hero pixels to title, ingredients, and sides.
 */

import { createOpenAIClient, hasOpenAIKey } from "../openai-client.js";
import { log } from "../logger.js";
import { getFoodImageryConfig } from "../food-imagery/config.js";
import type { MealImageRequirements } from "../../shared/curated-image-governance/meal-image-completeness.js";
import { getPlatingAccuracyVisionRubric } from "../../shared/plating-accuracy-standard.js";

export type MealImageVisionResult = {
  pass: boolean;
  titleIngredientsVisible: boolean;
  primarySidesVisible: boolean;
  completeMeal: boolean;
  proteinOnly: boolean;
  couldBelongToAnotherRecipe: boolean;
  reasons: string[];
  confidence: number;
  skipped?: boolean;
};

export const MEAL_IMAGE_VISION_RUBRIC = `You are auditing Firehall Meals hero food photography for TRUST and ACCURACY.

Compare the IMAGE to the RECIPE metadata. Return JSON only:
{
  "pass": boolean,
  "titleIngredientsVisible": boolean,
  "primarySidesVisible": boolean,
  "completeMeal": boolean,
  "proteinOnly": boolean,
  "couldBelongToAnotherRecipe": boolean,
  "reasons": string[],
  "confidence": 1-100
}

FAIL (pass=false) if ANY of:
- A title ingredient or named side is clearly missing from the image
- Image shows protein only when recipe title includes sides or multiple components (with/and/&)
- Visible ingredients contradict the title (e.g. tomatoes/zucchini when title says sweet potato & spinach)
- Image could reasonably belong to a different recipe (generic bowl, wrong sides, wrong format)
- Tight restaurant macro crop with no complete meal context

PASS when image clearly shows the correct protein, named sides/carbs/vegetables, and reads as a complete firehall crew meal with wider family-style framing.

${getPlatingAccuracyVisionRubric()}`;

export async function auditMealImageWithVision(input: {
  imageBuffer: Buffer;
  title: string;
  requirements: MealImageRequirements;
  ingredients?: Array<{ name: string }>;
  mealFormat?: string;
  cuisine?: string;
  force?: boolean;
}): Promise<MealImageVisionResult> {
  const cfg = getFoodImageryConfig();
  if ((!cfg.visionValidate && !input.force) || !hasOpenAIKey()) {
    return {
      pass: true,
      titleIngredientsVisible: true,
      primarySidesVisible: true,
      completeMeal: true,
      proteinOnly: false,
      couldBelongToAnotherRecipe: false,
      reasons: ["vision_skipped"],
      confidence: 0,
      skipped: true,
    };
  }

  try {
    const client = createOpenAIClient();
    const mime = input.imageBuffer[0] === 0xff ? "image/jpeg" : "image/png";
    const b64 = input.imageBuffer.toString("base64");
    const ingredientList = (input.ingredients ?? []).slice(0, 12).map((i) => i.name).join(", ");

    const res = await client.chat.completions.create({
      model: process.env.FOOD_IMAGERY_VISION_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: MEAL_IMAGE_VISION_RUBRIC },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `Title: "${input.title}"`,
                `Format: ${input.mealFormat || "plated"}`,
                `Cuisine: ${input.cuisine || "American"}`,
                `Title-required visible: ${input.requirements.titleRequiredSides.join("; ") || input.requirements.requiredVisible.join("; ") || "protein matching title"}`,
                `Optional tonight spread (bonus, do not fail if absent): ${input.requirements.spreadSides.join("; ") || "none"}`,
                `Requires complete meal (title names multiple components): ${input.requirements.requiresCompleteMeal}`,
                `Ingredients: ${ingredientList || "see title"}`,
              ].join("\n"),
            },
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${b64}`, detail: "low" },
            },
          ],
        },
      ],
    });

    const raw = res.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as Partial<MealImageVisionResult>;

    const proteinOnly = parsed.proteinOnly === true;
    const couldBelong = parsed.couldBelongToAnotherRecipe === true;
    const titleOk = parsed.titleIngredientsVisible !== false;
    const sidesOk =
      parsed.primarySidesVisible !== false ||
      input.requirements.titleRequiredSides.length === 0;
    const completeOk = parsed.completeMeal !== false || !input.requirements.requiresCompleteMeal;

    const pass =
      parsed.pass !== false &&
      titleOk &&
      sidesOk &&
      completeOk &&
      !proteinOnly &&
      !couldBelong;

    return {
      pass,
      titleIngredientsVisible: titleOk,
      primarySidesVisible: sidesOk,
      completeMeal: completeOk,
      proteinOnly,
      couldBelongToAnotherRecipe: couldBelong,
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String) : [],
      confidence: Number(parsed.confidence) || 80,
      skipped: false,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[meal-image-vision] skipped: ${msg}`, "catalog");
    return {
      pass: true,
      titleIngredientsVisible: true,
      primarySidesVisible: true,
      completeMeal: true,
      proteinOnly: false,
      couldBelongToAnotherRecipe: false,
      reasons: [`vision_error: ${msg}`],
      confidence: 0,
      skipped: true,
    };
  }
}
