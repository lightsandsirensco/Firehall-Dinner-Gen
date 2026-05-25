import { createOpenAIClient, hasOpenAIKey } from "../openai-client.js";
import { log } from "../logger.js";
import type { FoodImageryContext } from "../../shared/food-imagery/types.js";
import { getFoodImageryConfig } from "./config.js";

export interface OutputValidationResult {
  ok: boolean;
  reason?: string;
  notes?: string;
}

import { readPngDimensions } from "./png-dimensions.js";

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
  if (dims && (dims.width < 512 || dims.height < 512)) {
    return { ok: false, reason: "resolution_low", notes: `${dims.width}x${dims.height}` };
  }

  return { ok: true, notes: dims ? `${dims.width}x${dims.height}` : `jpeg_${buf.length}b` };
}

/** Optional vision gate — rejects obvious AI failures. */
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
        {
          role: "system",
          content:
            "You are a food photography QA director. Return JSON: {pass:boolean,issues:string[],matchesTitle:boolean,realismScore:1-10}. Reject distorted food, wrong dish type, hands, utensils dominating frame, cartoon style, text overlays.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Does this image faithfully represent "${ctx.title}" as premium comfort food? Cuisine: ${ctx.cuisine || "American"}.`,
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
    const parsed = JSON.parse(raw) as {
      pass?: boolean;
      issues?: string[];
      matchesTitle?: boolean;
      realismScore?: number;
    };

    if (parsed.pass === false) {
      return {
        ok: false,
        reason: "vision_reject",
        notes: (parsed.issues || []).join("; ").slice(0, 200),
      };
    }
    if (parsed.matchesTitle === false) {
      return { ok: false, reason: "title_mismatch", notes: (parsed.issues || []).join("; ") };
    }
    if ((parsed.realismScore ?? 10) < 6) {
      return { ok: false, reason: "low_realism", notes: `score=${parsed.realismScore}` };
    }

    return { ok: true, notes: `vision_ok realism=${parsed.realismScore ?? "?"}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[food-imagery] vision validate skipped: ${msg}`, "catalog");
    return { ok: true, reason: "vision_error_assume_ok" };
  }
}

export async function validateGeneratedFoodImage(
  buf: Buffer,
  ctx: FoodImageryContext,
): Promise<OutputValidationResult> {
  const heuristic = validateImageBufferHeuristic(buf);
  if (!heuristic.ok) return heuristic;
  return validateImageWithVision(buf, ctx);
}
