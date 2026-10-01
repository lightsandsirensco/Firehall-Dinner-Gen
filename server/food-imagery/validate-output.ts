import { createOpenAIClient, hasOpenAIKey } from "../openai-client.js";
import { log } from "../logger.js";
import type { FoodImageryContext } from "../../shared/food-imagery/types.js";
import { getFoodImageryConfig } from "./config.js";
import {
  evaluateVisionQaResult,
  formatQualityNotes,
  VISION_QA_RUBRIC,
} from "../../shared/food-imagery/quality-score.js";
import { readPngDimensions } from "./png-dimensions.js";
import {
  checkRecipeDishFormat,
  DISH_FORMATS,
  dishFormatRubricLines,
  expectedDishFormat,
} from "../../shared/food-imagery/dish-format.js";
import { parseSizeDimensions, FOOD_IMAGERY_HERO_SIZE } from "../../shared/food-imagery/aspect-ratio.js";

export interface OutputValidationResult {
  ok: boolean;
  reason?: string;
  notes?: string;
}

/** Fast local checks — no vision API. */
export function validateImageBufferHeuristic(
  buf: Buffer,
  minBytes?: number,
): OutputValidationResult {
  const cfg = getFoodImageryConfig();
  const floor = minBytes ?? cfg.minBytes;

  if (!buf?.length) return { ok: false, reason: "empty_buffer" };
  if (buf.length < floor) return { ok: false, reason: "too_small", notes: `bytes=${buf.length}` };

  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  if (!isPng && !isJpeg) return { ok: false, reason: "unknown_format" };

  const dims = isPng ? readPngDimensions(buf) : null;
  const target = parseSizeDimensions("1024x1024");
  if (dims && (dims.width < 512 || dims.height < 512)) {
    return { ok: false, reason: "resolution_low", notes: `${dims.width}x${dims.height}` };
  }
  if (dims && (dims.width < target.width * 0.9 || dims.height < target.height * 0.9)) {
    return { ok: false, reason: "below_target_size", notes: `${dims.width}x${dims.height}` };
  }

  return { ok: true, notes: dims ? `${dims.width}x${dims.height}` : `jpeg_${buf.length}b` };
}

/** Vision gate — brand consistency + realism scoring. */
export async function validateImageWithVision(
  buf: Buffer,
  ctx: FoodImageryContext,
): Promise<OutputValidationResult> {
  const cfg = getFoodImageryConfig();
  if (!cfg.visionValidate || !hasOpenAIKey()) {
    return { ok: true, reason: "vision_skipped" };
  }

  try {
    const client = createOpenAIClient();
    const b64 = buf.toString("base64");
    const mime = buf[0] === 0xff ? "image/jpeg" : "image/png";

    const res = await client.chat.completions.create({
      model: process.env.FOOD_IMAGERY_VISION_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: VISION_QA_RUBRIC },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Dish: "${ctx.title}". Cuisine: ${ctx.cuisine || "American"}. Format: ${ctx.mealFormat || "plated"}.`,
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
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const scores = evaluateVisionQaResult(parsed);

    if (!scores.pass) {
      return {
        ok: false,
        reason: scores.realism < 7 ? "low_realism" : scores.brandConsistency < 7 ? "low_brand_consistency" : "vision_reject",
        notes: formatQualityNotes(scores),
      };
    }

    return { ok: true, notes: formatQualityNotes(scores) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[food-imagery] vision validate skipped: ${msg}`, "catalog");
    return { ok: true, reason: "vision_error_assume_ok" };
  }
}

const FORMAT_GATE_PROMPT = `You classify the serving format of a food photo. Ignore ingredients, quality and style.
${dishFormatRubricLines().join("\n")}
Return JSON only: {"depicted_format": ${DISH_FORMATS.map((f) => `"${f}"`).join("|")}, "format_confidence": integer 0-100, "description": string}`;

/**
 * Dish-format gate — runs whenever an OpenAI key is present, independent of FOOD_IMAGERY_VISION_VALIDATE,
 * so a bowl rendered as a sandwich is rejected (and retried) before it is ever stored.
 * Opt out with FOOD_IMAGERY_FORMAT_GATE=false.
 */
export async function validateDishFormat(buf: Buffer, ctx: FoodImageryContext): Promise<OutputValidationResult> {
  if (process.env.FOOD_IMAGERY_FORMAT_GATE === "false" || !hasOpenAIKey()) {
    return { ok: true, reason: "format_gate_skipped" };
  }
  const expected = expectedDishFormat(ctx.title, ctx.mealFormat);
  if (!expected) return { ok: true, reason: "format_not_applicable" };

  try {
    const client = createOpenAIClient();
    const mime = buf[0] === 0xff ? "image/jpeg" : "image/png";
    const res = await client.chat.completions.create({
      model: process.env.FOOD_IMAGERY_VISION_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: FORMAT_GATE_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Classify the serving format of this photo." },
            { type: "image_url", image_url: { url: `data:${mime};base64,${buf.toString("base64")}`, detail: "low" } },
          ],
        },
      ],
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}") as Record<string, unknown>;
    const check = checkRecipeDishFormat(ctx.title, ctx.mealFormat, parsed.depicted_format, Number(parsed.format_confidence) || 0);
    const notes = `format expected=${check.expected} depicted=${check.depicted} (${String(parsed.description ?? "")})`;
    if (check.verdict === "mismatch") {
      log(`[food-imagery] format gate rejected ${ctx.recipeKey}: ${check.reason}`, "catalog");
      return { ok: false, reason: "wrong_dish_format", notes };
    }
    return { ok: true, reason: check.verdict === "inconclusive" ? "format_inconclusive" : undefined, notes };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[food-imagery] format gate skipped: ${msg}`, "catalog");
    return { ok: true, reason: "format_gate_error" };
  }
}

export async function validateGeneratedFoodImage(
  buf: Buffer,
  ctx: FoodImageryContext,
): Promise<OutputValidationResult> {
  const heuristic = validateImageBufferHeuristic(buf);
  if (!heuristic.ok) return heuristic;
  const format = await validateDishFormat(buf, ctx);
  if (!format.ok) return format;
  return validateImageWithVision(buf, ctx);
}
