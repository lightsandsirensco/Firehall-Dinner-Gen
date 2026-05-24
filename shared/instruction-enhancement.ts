/**
 * Beginner-friendly instruction expansion — rule-based layer (no API).
 * Assumes the cook is tired, distracted, and new to the station kitchen.
 */

export interface InstructionStep {
  heading: string;
  body: string;
}

export interface InstructionEnhanceContext {
  title: string;
  protein?: string;
  totalMinutes?: number;
  crewSize?: number;
  ingredients?: string[];
  mealFormat?: string;
}

const VISUAL_CUE =
  /\b(golden|translucent|bubbl|simmer|tender|crisp|charred|flaky|165|145|160|internal|no longer pink|al dente|thickened)\b/i;

const HEAT_CUE =
  /\b(medium|low heat|high heat|425|400|375|350|preheat|simmer|boil|broil|°f|°c)\b/i;

const TIME_CUE = /\b(\d+\s*[-–]?\s*\d*\s*min|minutes?|hours?|hr)\b/i;

const ACTION_CUE =
  /\b(stir|add|pour|drain|season|toss|flip|transfer|remove|cover|uncover|whisk|combine)\b/i;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function isShallowStepBody(body: string): boolean {
  const t = body.trim();
  if (!t) return true;
  const words = wordCount(t);
  if (words < 18) return true;
  if (words < 28 && (!VISUAL_CUE.test(t) || !HEAT_CUE.test(t))) return true;
  if (!ACTION_CUE.test(t) && words < 35) return true;
  return false;
}

export function isShallowInstructionSet(steps: InstructionStep[]): boolean {
  if (steps.length === 0) return true;
  const shallowCount = steps.filter((s) => isShallowStepBody(s.body)).length;
  return shallowCount >= Math.ceil(steps.length * 0.4) || steps.some((s) => wordCount(s.body) < 12);
}

function inferHeatFromText(text: string): string {
  const t = text.toLowerCase();
  if (/bake|roast|broil|oven/.test(t)) return "oven per recipe";
  if (/simmer|braise|stew|chili|soup/.test(t)) return "low to medium-low";
  if (/sear|sauté|saute|stir.?fry|brown/.test(t)) return "medium-high";
  if (/boil|pasta|rice/.test(t)) return "high (rolling boil)";
  if (/slow cooker|crockpot/.test(t)) return "low (slow cooker)";
  return "medium";
}

function inferMinutesFromText(text: string, fallback = 5): number {
  const m = text.match(/(\d+)\s*[-–]\s*(\d+)\s*min/i) || text.match(/(\d+)\s*min/i);
  if (!m) return fallback;
  if (m[2]) return Math.round((parseInt(m[1], 10) + parseInt(m[2], 10)) / 2);
  return parseInt(m[1], 10);
}

function proteinDonenessNote(protein?: string): string {
  const p = (protein || "").toLowerCase();
  if (/chicken|turkey|poultry/.test(p)) {
    return " The thickest piece should reach 165°F (74°C) with no pink juice at the center.";
  }
  if (/ground beef|beef.*ground|sausage/.test(p)) return " Cook until no pink remains and the center reaches 160°F (71°C).";
  if (/pork/.test(p)) return " Look for 145°F (63°C) in the thickest part, then let it rest a few minutes.";
  if (/fish|salmon|shrimp|seafood/.test(p)) {
    return " Fish should flake easily with a fork; shrimp should be pink and firm.";
  }
  return "";
}

/** Rule-based expansion for common compressed publisher/API phrasing. */
export function expandStepRuleBased(
  step: InstructionStep,
  ctx: InstructionEnhanceContext,
): InstructionStep {
  let heading = step.heading?.trim() || "";
  let body = step.body.trim();
  if (!isShallowStepBody(body)) {
    return { heading: heading || inferHeadingFromBody(body), body };
  }

  const lower = body.toLowerCase();
  const heat = inferHeatFromText(`${heading} ${body}`);
  const mins = inferMinutesFromText(`${heading} ${body}`, 5);
  const proteinNote = proteinDonenessNote(ctx.protein);

  if (/^gather|^mise|^prep all|^before you start/i.test(body)) {
    return {
      heading: heading || "Set up the station (no heat, 10–15 min)",
      body:
        "Lay out every ingredient, measuring tools, and your largest pan or pot before you turn on any heat. " +
        "Read through all steps once so you know what fires when — this saves chaos mid-cook when someone gets a call.",
    };
  }

  if (/onion|shallot|garlic/.test(lower) && /(soft|translucent|sweat|cook)/.test(lower)) {
    heading = heading || `Sauté aromatics (${heat}, ${mins}–${mins + 2} min)`;
    body =
      `Add the onions (and garlic if using) to the hot pan with a little oil. Stir every 30–60 seconds for about ${mins}–${mins + 2} minutes ` +
      "until they turn soft, glossy, and slightly translucent — not dark brown. " +
      "If they brown too fast, lower the heat a notch and keep stirring.";
  } else if (/\bsear\b|\bbrown\b.*\b(chicken|beef|pork|steak|thigh|breast)\b/.test(lower)) {
    heading = heading || `Sear the protein (${heat}, ${mins}–${mins + 4} min)`;
    body =
      "Pat the protein dry with paper towels (wet meat steams instead of browning). " +
      `Heat oil in a large skillet over ${heat} until it shimmers. Add protein in a single layer without crowding — work in batches if needed. ` +
      `Cook ${mins}–${mins + 4} minutes per side until deeply golden on the outside.${proteinNote} ` +
      "If the pan smokes heavily, pull it off the heat for 20 seconds, then continue.";
  } else if (/\bsimmer\b|\bstew\b|\bchili\b|\bsoup\b/.test(lower)) {
    heading = heading || `Simmer the pot (${heat}, ${mins + 10}–${mins + 25} min)`;
    body =
      "Bring the mixture to a gentle bubble, then reduce heat so it simmers — small bubbles breaking the surface, not a rolling boil. " +
      `Stir occasionally and cook ${mins + 10}–${mins + 25} minutes until flavors meld and the liquid thickens slightly. ` +
      "If it sticks on the bottom, scrape with a wooden spoon and add a splash of water or broth.";
  } else if (/\bboil\b.*\bpasta\b|\bcook\b.*\bpasta\b|\bal dente\b/.test(lower)) {
    heading = heading || "Cook the pasta (high boil, 8–12 min)";
    body =
      "Fill a large pot with salted water — it should taste lightly like the sea. Bring to a rolling boil over high heat. " +
      "Add pasta and stir right away so it doesn't clump. Cook until tender but still slightly firm when you bite a piece (al dente). " +
      "Reserve about ½ cup pasta water, then drain well.";
  } else if (/\bbake\b|\broast\b|\boven\b/.test(lower)) {
    const temp = body.match(/(\d{3})\s*°?\s*f/i)?.[1] || "400";
    heading = heading || `Bake (${temp}°F oven, ${mins}–${mins + 15} min)`;
    body =
      `Preheat the oven to ${temp}°F — give it at least 10 minutes after the beep so it's fully hot. ` +
      "Spread food in an even layer on a sheet pan or baking dish. " +
      `Bake ${mins}–${mins + 15} minutes until edges are golden and the center is cooked through.${proteinNote} ` +
      "Rotate the pan halfway if your oven runs hot in back.";
  } else if (/\bseason\b|\bsalt and pepper\b|\btaste\b/.test(lower) && wordCount(body) < 25) {
    heading = heading || "Season and taste (no heat, 1 min)";
    body =
      "Add salt and pepper in small pinches, stir, and taste. " +
      "Seasoning should make flavors pop, not taste salty — you can always add more, not take it away. " +
      "If it tastes flat, a splash of acid (lemon, vinegar) often wakes it up.";
  } else if (/\bserve\b|\bplate\b|\bgarnish\b/.test(lower)) {
    heading = heading || `Serve the crew (${ctx.crewSize || 6} portions)`;
    body =
      `Portion for about ${ctx.crewSize || 6} hungry firefighters — generous scoops, not diet portions. ` +
      "Let the dish rest 2–3 minutes off heat so juices settle. " +
      "Taste once more at the line and adjust salt or heat (hot sauce) if your hall likes it spicier.";
  } else {
    heading = heading || inferHeadingFromBody(body);
    body =
      `${body.replace(/\.\s*$/, "")}. ` +
      `Work over ${heat} heat and watch for visual cues — color, aroma, and texture tell you more than the clock alone. ` +
      `If anything starts burning or sticking, lower the heat and add a small splash of liquid.${proteinNote}`;
  }

  if (!TIME_CUE.test(body)) {
    body += ` Plan about ${mins}–${mins + 5} minutes for this step unless your pan runs hotter than usual.`;
  }

  return { heading, body };
}

function inferHeadingFromBody(body: string): string {
  const first = body.split(/[.!?]/)[0]?.trim() || "Cook";
  const short = first.length > 48 ? `${first.slice(0, 45)}…` : first;
  const heat = inferHeatFromText(body);
  const mins = inferMinutesFromText(body, 5);
  return `${short} (${heat}, ${mins} min)`;
}

export function buildHallPrepStep(ctx: InstructionEnhanceContext): InstructionStep {
  const crew = ctx.crewSize || 6;
  const ingPreview =
    ctx.ingredients && ctx.ingredients.length > 0
      ? ` You'll need: ${ctx.ingredients.slice(0, 8).join(", ")}${ctx.ingredients.length > 8 ? ", and more" : ""}.`
      : "";

  return {
    heading: "Set up before you cook (no heat, 10–15 min)",
    body:
      `Read all steps once, then gather ingredients, cutting board, knife, and your largest pan or pot.${ingPreview} ` +
      `You're cooking for about ${crew} — scale portions accordingly. ` +
      "If you get interrupted by a call, turn off heat and note which step you're on.",
  };
}

export function buildHallServeStep(ctx: InstructionEnhanceContext): InstructionStep {
  return {
    heading: `Serve the hall (${ctx.crewSize || 6} portions, no heat)`,
    body:
      "Taste and adjust salt or spice at the last second. " +
      "Serve hot in big batches — firefighters eat after shifts, so keep it warm on the line or in a low oven (200°F) covered with foil if needed.",
  };
}

function hasPrepStep(steps: InstructionStep[]): boolean {
  return steps.some((s) =>
    /\b(prep|gather|set up|mise|before you|read all steps)\b/i.test(`${s.heading} ${s.body}`),
  );
}

function hasServeStep(steps: InstructionStep[]): boolean {
  return steps.some((s) => /\b(serve|plate|portion|line)\b/i.test(`${s.heading} ${s.body}`));
}

/** Synchronous rule-based enhancement — safe to call on every recipe serve path. */
export function enhanceInstructionsRuleBased(
  steps: InstructionStep[],
  ctx: InstructionEnhanceContext,
): InstructionStep[] {
  if (!steps.length) return steps;

  let out = steps.map((s) => expandStepRuleBased(s, ctx));

  if (!hasPrepStep(out)) {
    out = [buildHallPrepStep(ctx), ...out];
  }
  if (!hasServeStep(out)) {
    out = [...out, buildHallServeStep(ctx)];
  }

  return out.map((s, i) => ({
    heading: s.heading?.trim() || `Step ${i + 1}`,
    body: s.body.trim(),
  }));
}
