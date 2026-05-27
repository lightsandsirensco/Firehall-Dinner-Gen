/**
 * Automated editorial image quality scoring — heuristic + optional vision.
 */

import { createOpenAIClient, hasOpenAIKey } from "../openai-client.js";
import { log } from "../logger.js";
import { getFoodImageryConfig } from "../food-imagery/config.js";
import { readPngDimensions } from "../food-imagery/png-dimensions.js";
import type { ImageStylePresetId } from "../../shared/image-style-presets.js";
import {
  EDITORIAL_VISION_QA_RUBRIC,
  evaluateEditorialQualityScore,
  type EditorialImageQualityScore,
} from "../../shared/editorial-image-quality.js";
import { getVisualLockSpec } from "../../shared/visual-lock.js";

export interface ScoreEditorialImageInput {
  buffer: Buffer;
  mealName: string;
  stylePreset: ImageStylePresetId;
  useVision?: boolean;
}

function scoreFromHeuristics(
  buf: Buffer,
  presetId: ImageStylePresetId,
): import("../../shared/editorial-image-quality.js").EditorialQualityInput {
  const flags: string[] = [];
  const dims = readPngDimensions(buf);
  const bytes = buf.length;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89;

  let realism = 7.5;
  let lightingQuality = 7.0;
  let foodClarity = 7.0;
  let appetiteAppeal = 7.5;
  let framingConsistency = 8.0;
  let textureRealism = 7.0;
  let visualCleanliness = 7.5;
  let mobileReadability = 7.5;

  if (!isJpeg && !isPng) {
    flags.push("unknown_format");
    realism = 3;
  }

  if (bytes < 40_000) {
    flags.push("low_bytes");
    realism -= 1.5;
    foodClarity -= 1;
  } else if (bytes > 2_500_000) {
    flags.push("oversized_buffer");
    visualCleanliness -= 0.5;
  }

  if (dims) {
    const minDim = Math.min(dims.width, dims.height);
    if (minDim < 512) {
      flags.push("resolution_low");
      foodClarity -= 2;
      mobileReadability -= 2;
    }
    const aspect = dims.width / dims.height;
    if (aspect < 0.85 || aspect > 1.2) {
      flags.push("non_square_master");
      framingConsistency -= 1;
      mobileReadability -= 0.5;
    } else {
      framingConsistency += 0.5;
      mobileReadability += 0.5;
    }
  }

  const lock = getVisualLockSpec(presetId);
  if (lock.presetId === "hall_bbq_dark" || lock.presetId === "post_call_comfort") {
    lightingQuality += 0.3;
  }

  return {
    realism: clamp10(realism),
    lightingQuality: clamp10(lightingQuality),
    foodClarity: clamp10(foodClarity),
    appetiteAppeal: clamp10(appetiteAppeal),
    framingConsistency: clamp10(framingConsistency),
    textureRealism: clamp10(textureRealism),
    visualCleanliness: clamp10(visualCleanliness),
    mobileReadability: clamp10(mobileReadability),
    flags,
    scoredAt: new Date().toISOString(),
    method: "heuristic",
  };
}

function clamp10(n: number): number {
  return Math.max(1, Math.min(10, Math.round(n * 10) / 10));
}

function mergeVisionScores(
  heuristic: import("../../shared/editorial-image-quality.js").EditorialQualityInput,
  vision: Record<string, unknown>,
): import("../../shared/editorial-image-quality.js").EditorialQualityInput {
  const issues = Array.isArray(vision.issues) ? vision.issues.map(String) : [];
  const pick = (key: string, fallback: number) => {
    const v = Number(vision[key]);
    return Number.isFinite(v) && v >= 1 && v <= 10 ? v : fallback;
  };

  return {
    realism: pick("realism", heuristic.realism),
    lightingQuality: pick("lightingQuality", heuristic.lightingQuality),
    foodClarity: pick("foodClarity", heuristic.foodClarity),
    appetiteAppeal: pick("appetiteAppeal", heuristic.appetiteAppeal),
    framingConsistency: pick("framingConsistency", heuristic.framingConsistency),
    textureRealism: pick("textureRealism", heuristic.textureRealism),
    visualCleanliness: pick("visualCleanliness", heuristic.visualCleanliness),
    mobileReadability: pick("mobileReadability", heuristic.mobileReadability),
    flags: [...heuristic.flags, ...issues.slice(0, 5)],
    scoredAt: new Date().toISOString(),
    method: "combined",
  };
}

async function scoreWithVision(
  buf: Buffer,
  mealName: string,
): Promise<Record<string, unknown> | null> {
  const cfg = getFoodImageryConfig();
  if (!cfg.visionValidate || !hasOpenAIKey()) return null;

  try {
    const client = createOpenAIClient();
    const mime = buf[0] === 0xff ? "image/jpeg" : "image/png";
    const res = await client.chat.completions.create({
      model: process.env.FOOD_IMAGERY_VISION_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EDITORIAL_VISION_QA_RUBRIC },
        {
          role: "user",
          content: [
            { type: "text", text: `Dish: "${mealName}". Score for Firehall editorial pipeline.` },
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${buf.toString("base64")}`, detail: "low" },
            },
          ],
        },
      ],
    });
    return JSON.parse(res.choices[0]?.message?.content || "{}") as Record<string, unknown>;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[imagery] vision QA skipped: ${msg}`, "catalog");
    return null;
  }
}

export async function scoreEditorialImageQuality(
  input: ScoreEditorialImageInput,
): Promise<EditorialImageQualityScore> {
  let partial = scoreFromHeuristics(input.buffer, input.stylePreset);

  if (input.useVision !== false) {
    const vision = await scoreWithVision(input.buffer, input.mealName);
    if (vision) {
      partial = mergeVisionScores(partial, vision);
    }
  }

  return evaluateEditorialQualityScore(partial);
}
