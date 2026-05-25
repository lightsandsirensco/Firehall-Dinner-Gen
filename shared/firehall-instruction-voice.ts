/**
 * Firehall station-kitchen voice — banned filler, pairing rules, instruction polish.
 */

import type { RecipeStep } from "./schema";

/** Blog/AI filler phrases — strip or rewrite in post-processing. */
export const BANNED_INSTRUCTION_PHRASES: RegExp[] = [
  /\bfeeds hard\b/gi,
  /\btonight'?s board\b/gi,
  /\bstation template\b/gi,
  /\bhall spread\b/gi,
  /\btonight at the hall\b/gi,
  /\bwatch for visual cues\b/gi,
  /\bvisual cues\b/gi,
  /\bprepare ingredients carefully\b/gi,
  /\bspread evenly\b/gi,
  /\bwork over medium heat\b/gi,
  /\bmedium wooden bowl\b/gi,
  /\bwooden bowl\b/gi,
  /\bensure even cooking\b/gi,
  /\bcook until done\b/gi,
  /\buntil done\b/gi,
  /\bperfectly cooked\b/gi,
  /\bculinary\b/gi,
  /\bdelectable\b/gi,
  /\bmouth-?watering\b/gi,
  /\bwhilst\b/gi,
  /\butilize\b/gi,
  /\bplate beautifully\b/gi,
  /\bartfully\b/gi,
  /\bnourish(ing|es)?\b/gi,
  /\bmeal prep\b/gi,
  /\bbalanced bowl\b/gi,
];

export const FIREHALL_VOICE_RULES = `
COOKING VOICE (mandatory):
- Write like a professional home cook (Serious Eats / NYT Cooking) — warm, specific, craveable.
- Each step: action + heat level + sensory cues (color, sizzle, smell, thickness) + one common mistake to avoid.
- Explain WHY when it helps beginners (browning builds flavor; resting keeps juices in; acid brightens at the end).
- Batch smart: note what runs in parallel; keep one pause-safe hold point for interrupted shifts.
- NEVER: "visual cues", "spread evenly", "wooden bowl", "cook until done", diet/meal-prep tone, or firefighter cosplay every sentence.
- At most ONE subtle crew/shift note in the whole recipe — not "hall spread" / "tonight's board" spam.
`.trim();

const BANNED_REPLACEMENTS: [RegExp, string][] = [
  [/\bwatch for visual cues\b/gi, "check color, smell, and texture"],
  [/\bvisual cues\b/gi, "color, sizzle, and texture"],
  [/\bwork over medium heat\b/gi, "keep the burner at medium"],
  [/\bprepare ingredients carefully\b/gi, "get ingredients lined up on the counter"],
  [/\bspread evenly\b/gi, "spread in an even layer"],
  [/\bcook until done\b/gi, "cook until the center hits safe temp"],
  [/\buntil done\b/gi, "until fully cooked"],
];

export function stripBannedInstructionPhrases(text: string): string {
  let out = text;
  for (const [re, replacement] of BANNED_REPLACEMENTS) {
    out = out.replace(re, replacement);
  }
  for (const re of BANNED_INSTRUCTION_PHRASES) {
    out = out.replace(re, "");
  }
  out = out.replace(/\s{2,}/g, " ").replace(/ \./g, ".").trim();
  if (out.length < 12 && text.trim().length > 20) {
    return text.trim();
  }
  return out;
}

export function isCaesarMainDish(title: string): boolean {
  return /\bcaesar\b/i.test(title || "");
}

/** Steak fries with Caesar salad is a bad hall pairing — garlic bread / wedges / focaccia instead. */
export function isWeakCaesarStarch(item: string): boolean {
  return /\b(steak fries|frozen fries|french fries|waffle fries)\b/i.test(item);
}

export function isAppropriateCaesarStarch(item: string): boolean {
  return /\b(garlic bread|cheesy garlic|focaccia|crouton|bread|baguette|roll|wedge|potato wedge)\b/i.test(item);
}

export function correctStarchKeyForTitle(title: string, starchKey: string | null): string | null {
  if (!isCaesarMainDish(title)) return starchKey;
  if (!starchKey || starchKey === "fries") return "garlic bread";
  if (isWeakCaesarStarch(starchKey)) return "garlic bread";
  return starchKey;
}

export function buildStationSideStep(item: string, starchKey?: string): RecipeStep {
  const name = item.split("(")[0].trim();
  const lower = name.toLowerCase();

  if (/\bgarlic bread\b/i.test(lower)) {
    return {
      heading: "Toast garlic bread (400°F oven, 8–10 min)",
      body:
        "Split loaves or buns and spread garlic butter on the cut sides. Sprinkle parmesan if you have it. " +
        "Bake at 400°F until the edges are crisp and the top is golden — garlic burns fast, so pull it when you smell toast, not smoke. " +
        "Wrap in foil and hold on the counter while you finish the salad line so the crew gets hot bread, not cardboard.",
    };
  }

  if (/\bcrouton\b/i.test(lower)) {
    return {
      heading: "Toast croutons (400°F oven, 8–10 min)",
      body:
        "Toss bread cubes with a little oil, salt, and garlic powder. Spread on a sheet pan and bake until crunchy all the way through — soft centers will turn the salad soggy in minutes. " +
        "Cool 2 minutes, then keep in a dry pan or bowl with a paper towel so they stay loud and crisp at the table.",
    };
  }

  if (/\bcoleslaw\b|\bslaw\b/i.test(lower)) {
    return {
      heading: "Toss the slaw (no heat, 5 min)",
      body:
        "Bagged slaw mix is fine on shift — toss with mayo, vinegar, and a pinch of salt. " +
        "Chill it until the mains are ready; creamy slaw holds better cold than warm.",
    };
  }

  if (starchKey === "fries" || /\bfries\b/i.test(lower)) {
    return {
      heading: "Bake the fries (425°F, 18–22 min)",
      body:
        "Spread frozen fries on sheet pans — don't pile them or they'll steam. " +
        "Bake at 425°F until the edges are brown and crunchy. Season right out of the oven and serve hot; cold fries get skipped at the hall table.",
    };
  }

  if (/\brice\b/i.test(lower)) {
    return {
      heading: "Cook the rice (simmer, 15–18 min)",
      body:
        "Rinse if your crew likes fluffy grains, then simmer covered until tender. " +
        "Fluff with a fork and hold covered — dry rice on the line is easier to fix than mush.",
    };
  }

  return {
    heading: `Finish ${name} for the hall table (medium, 8–12 min)`,
    body:
      `Knock out ${lower} while the main cooks — season, taste once, and set it out family-style. ` +
      "If you get pulled away mid-step, turn off heat and pick up where you left off when you're back.",
  };
}

export interface HallRealismScore {
  score: number;
  issues: string[];
}

/** 0–10 — higher = more station-realistic instructions and pairings. */
export function scoreHallRealism(
  title: string,
  steps: { heading?: string; body?: string }[],
  ingredients: { item: string }[],
): HallRealismScore {
  const issues: string[] = [];
  let score = 10;
  const allText = steps.map((s) => `${s.heading} ${s.body}`).join(" ");

  for (const re of BANNED_INSTRUCTION_PHRASES) {
    if (re.test(allText)) {
      issues.push("banned_phrase");
      score -= 1.5;
      break;
    }
  }

  if (/\bwhile the main cooks, finish\b/i.test(allText)) {
    const count = (allText.match(/while the main cooks/gi) || []).length;
    if (count >= 2) {
      issues.push("repeated_side_filler");
      score -= 2;
    }
  }

  if (isCaesarMainDish(title)) {
    const badStarch = ingredients.some((i) => isWeakCaesarStarch(i.item));
    if (badStarch) {
      issues.push("caesar_with_fries");
      score -= 3;
    }
    if (!ingredients.some((i) => isAppropriateCaesarStarch(i.item) || /\bromaine\b/i.test(i.item))) {
      issues.push("caesar_missing_bread_or_greens");
      score -= 1;
    }
    if (!/\b(dress|dressing|toss romaine|crisp)\b/i.test(allText)) {
      issues.push("caesar_missing_dress_workflow");
      score -= 1;
    }
  }

  const shallow = steps.filter((s) => (s.body || "").split(/\s+/).length < 20).length;
  if (shallow > Math.ceil(steps.length * 0.5)) {
    issues.push("too_shallow");
    score -= 2;
  }

  return { score: Math.max(0, Math.round(score * 10) / 10), issues };
}

function normalizeStepKey(body: string): string {
  return body.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
}

/** Drop near-duplicate step bodies (common after compose + enhance). */
export function dedupeRedundantSteps(steps: RecipeStep[]): RecipeStep[] {
  const seen = new Set<string>();
  const out: RecipeStep[] = [];
  for (const step of steps) {
    const key = normalizeStepKey(step.body || "");
    if (!key || key.length < 20) {
      out.push(step);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(step);
  }
  return out;
}

export function polishFirehallSteps(steps: RecipeStep[]): RecipeStep[] {
  return dedupeRedundantSteps(
    steps.map((s) => ({
      heading: stripBannedInstructionPhrases(s.heading || ""),
      body: stripBannedInstructionPhrases(s.body || ""),
    })),
  ).filter((s) => s.body.length > 0);
}
