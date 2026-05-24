/**
 * Recipe instruction enhancement — rule-based always, optional AI for shallow sets.
 */

import type OpenAI from "openai";
import type { RecipeStep } from "../shared/schema.js";
import {
  enhanceInstructionsRuleBased,
  isShallowInstructionSet,
  type InstructionEnhanceContext,
  type InstructionStep,
} from "../shared/instruction-enhancement.js";
import { log } from "./logger.js";
import { createOpenAIClient, hasOpenAIKey } from "./openai-client.js";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = createOpenAIClient();
  return openaiClient;
}

const AI_ENABLED = process.env.INSTRUCTION_AI_ENHANCE !== "false" && hasOpenAIKey();
const AI_TIMEOUT_MS = 12_000;

const enhanceCache = new Map<string, { steps: RecipeStep[]; expires: number }>();
const CACHE_TTL_MS = 45 * 60 * 1000;

function cacheKey(ctx: InstructionEnhanceContext, steps: InstructionStep[]): string {
  return `${ctx.title}::${steps.map((s) => s.body.slice(0, 40)).join("|")}`;
}

function toRecipeSteps(steps: InstructionStep[]): RecipeStep[] {
  return steps.map((s) => ({ heading: s.heading, body: s.body }));
}

export function enhanceRecipeStepsSync(
  steps: RecipeStep[],
  ctx: InstructionEnhanceContext,
): RecipeStep[] {
  const input: InstructionStep[] = steps.map((s) => ({
    heading: s.heading || "",
    body: s.body || "",
  }));
  const enhanced = enhanceInstructionsRuleBased(input, ctx);
  return toRecipeSteps(enhanced);
}

async function enhanceStepsWithAI(
  steps: RecipeStep[],
  ctx: InstructionEnhanceContext,
): Promise<RecipeStep[] | null> {
  if (!AI_ENABLED) return null;

  const key = cacheKey(ctx, steps.map((s) => ({ heading: s.heading, body: s.body })));
  const hit = enhanceCache.get(key);
  if (hit && Date.now() < hit.expires) return hit.steps;

  const stepLines = steps
    .slice(0, 12)
    .map((s, i) => `${i + 1}. ${s.heading}: ${s.body}`)
    .join("\n");

  const prompt =
    `You are the experienced cook at a fire hall kitchen teaching a beginner who is tired and easily distracted.\n\n` +
    `Rewrite ONLY the cooking steps for this recipe. Do NOT change ingredients or invent new ones.\n\n` +
    `Rules for EVERY step:\n` +
    `- heading: "Action (heat level, time)" e.g. "Brown the beef (medium-high, 8–10 min)"\n` +
    `- body: 3–5 short sentences (about 60–100 words). Explain HOW, what to LOOK for, what can go WRONG, when to move on.\n` +
    `- Include: pan size when relevant, heat level, visual/texture cues, doneness, safety temps for protein.\n` +
    `- Firefighter practical: interruptions happen — note when it's safe to pause.\n` +
    `- Start with a prep/setup step if missing. End with a serve/portion step.\n` +
    `- Max 12 steps. Plain language — no chef jargon.\n\n` +
    `Recipe: ${ctx.title}\n` +
    `Protein: ${ctx.protein || "mixed"} | Crew: ${ctx.crewSize || 6} | Time budget: ~${ctx.totalMinutes || 45} min\n` +
    `Ingredients: ${(ctx.ingredients || []).slice(0, 12).join(", ")}\n\n` +
    `Current steps:\n${stepLines}\n\n` +
    `Output ONLY JSON: {"steps":[{"heading":"...","body":"..."}]}`;

  try {
    const response = await Promise.race([
      getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2800,
        temperature: 0.35,
        response_format: { type: "json_object" },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("instruction enhance timeout")), AI_TIMEOUT_MS),
      ),
    ]);

    const raw = (response as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message
      ?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { steps?: { heading?: string; body?: string }[] };
    if (!Array.isArray(parsed.steps) || parsed.steps.length < 2) return null;

    const mapped: RecipeStep[] = parsed.steps
      .filter((s) => s?.heading && s?.body)
      .map((s) => ({
        heading: String(s.heading).trim(),
        body: String(s.body).trim(),
      }));

    if (mapped.length < 2) return null;

    enhanceCache.set(key, { steps: mapped, expires: Date.now() + CACHE_TTL_MS });
    log(`[instructions] AI enhanced "${ctx.title.slice(0, 40)}" → ${mapped.length} steps`, "catalog");
    return mapped;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[instructions] AI enhance skipped: ${msg}`, "catalog");
    return null;
  }
}

/** Full enhancement: rules first, optional AI if still shallow. */
export async function enhanceRecipeSteps(
  steps: RecipeStep[],
  ctx: InstructionEnhanceContext,
): Promise<RecipeStep[]> {
  if (!steps.length) return steps;

  let current = enhanceRecipeStepsSync(steps, ctx);

  if (!isShallowInstructionSet(current.map((s) => ({ heading: s.heading, body: s.body })))) {
    return current;
  }

  const aiSteps = await enhanceStepsWithAI(current, ctx);
  if (aiSteps) {
    current = enhanceRecipeStepsSync(aiSteps, ctx);
  }

  return current;
}

export function buildEnhanceContextFromTitle(
  title: string,
  options: Partial<InstructionEnhanceContext> = {},
): InstructionEnhanceContext {
  return {
    title,
    protein: options.protein,
    totalMinutes: options.totalMinutes ?? 45,
    crewSize: options.crewSize ?? 6,
    ingredients: options.ingredients,
    mealFormat: options.mealFormat,
  };
}
