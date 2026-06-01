/**
 * Title + side pairing governance — prevents AI-style "Main with Quinoa & Greek Salad"
 * on dishes that already carry starch, and normalizes awkward generator titles.
 */

/** Main dishes that already include a starch — do not add rice/quinoa/potatoes to the title. */
export const BUILTIN_STARCH_MAIN_RE =
  /\b(shepherd'?s?\s*pie|cottage\s*pie|pot\s*pie|meatloaf|lasagna|baked\s*ziti|mostaccioli|mac\s*(?:&|and)\s*cheese|pizza|calzone|stromboli|poutine|nachos|french\s*toast|pancake|waffle|burrito|quesadilla|sandwich|burger|bun\b|hoagie|sub\b|bagel\b|pasta\b|penne|rigatoni|spaghetti|fettuccine|alfredo|biscuit|dumpling)\b/i;

/** "with X" that names an integral component — not a separate side dish. */
const INTEGRAL_WITH_RE =
  /\bwith\s+(glaze|chimichurri|herb butter|white sauce|meat sauce|barbecue sauce|bbq sauce|caramelized onions|dirty sauce|cotija|beer cheese|maple syrup|enchilada sauce|alfredo|hollandaise|ranchero|salsa verde|charred corn salsa|sweet potato top|zucchini noodles|zoodles|potato wedges?\s+and\b)\b/i;

const SIDE_STARCH_WORDS =
  /\b(rice|quinoa|fries|wedges|mashed potatoes?|garlic bread|cornbread|mac and cheese|macaroni|noodles|pasta|potatoes|bread|naan|rolls?)\b/i;

const SIDE_VEG_WORDS =
  /\b(salad|slaw|coleslaw|broccoli|beans|asparagus|spinach|greens|corn|peppers|vegetables|edamame)\b/i;

export type TitleSideAuditIssue = {
  code:
    | "redundant_starch_side"
    | "awkward_multi_side"
    | "unrealistic_hall_pairing"
    | "missing_named_side_in_metadata"
    | "integral_with_ok";
  severity: "critical" | "warning" | "info";
  message: string;
};

export function mainHasBuiltinStarch(mainLabel: string): boolean {
  return BUILTIN_STARCH_MAIN_RE.test(mainLabel || "");
}

export function isIntegralWithPhrase(title: string): boolean {
  const t = (title || "").trim();
  if (!/\bwith\b/i.test(t)) return false;
  if (INTEGRAL_WITH_RE.test(t)) return true;
  if (/\bwith\s+(meat\s+sauce|rigatoni|sausage)\b/i.test(t) && /\b(rigatoni|mostaccioli|pasta|ziti)\b/i.test(t)) {
    return true;
  }
  if (/\bmeatloaf\b/i.test(t) && /\bwith\b/i.test(t) && /\bmashed\b/i.test(t)) return true;
  if (/\bchili\b/i.test(t) && /\bwith\b/i.test(t) && /\b(garlic bread|cheesy)\b/i.test(t)) return true;
  return false;
}

/** True when title uses generator-style "Main with Side" (not integral sauce/format). */
export function isSidePairingTitle(title: string): boolean {
  const t = (title || "").trim();
  if (!/\bwith\b/i.test(t)) return false;
  if (isIntegralWithPhrase(t)) return false;

  const afterWith = t.split(/\bwith\b/i).slice(1).join(" with ");
  if (SIDE_STARCH_WORDS.test(afterWith) || SIDE_VEG_WORDS.test(afterWith)) return true;
  if (/\b&\b/.test(afterWith)) return true;
  return false;
}

export function normalizeSideLabel(label: string): string {
  return label
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/,\s*uncooked/i, "")
    .trim();
}

/**
 * Fix awkward pairings like "Shepherd's Pie with Quinoa & Greek Salad"
 * → "Shepherd's Pie with Greek Salad"
 */
export function normalizeSidePairingTitle(
  mainLabel: string,
  starchLabel: string | null | undefined,
  vegLabel: string | null | undefined,
): string {
  const main = mainLabel.trim();
  const starch = starchLabel ? normalizeSideLabel(starchLabel) : null;
  const veg = vegLabel ? normalizeSideLabel(vegLabel) : null;
  const builtinStarch = mainHasBuiltinStarch(main);

  let useStarch = starch;
  let useVeg = veg;

  if (builtinStarch && useStarch) {
    useStarch = null;
  }

  if (useStarch && useVeg && /quinoa/i.test(useStarch) && /salad/i.test(useVeg)) {
    useStarch = null;
  }

  if (useStarch && useVeg && builtinStarch) {
    useStarch = null;
  }

  if (useStarch && useVeg) {
    return `${main} with ${useStarch} & ${useVeg}`;
  }
  if (useVeg) return `${main} with ${useVeg}`;
  if (useStarch && !builtinStarch) return `${main} with ${useStarch}`;
  return main;
}

export function auditTitleSidePairing(input: {
  slug: string;
  title: string;
  heroPath?: string;
  heroAlt?: string;
}): TitleSideAuditIssue[] {
  const issues: TitleSideAuditIssue[] = [];
  const title = (input.title || "").trim();
  if (!isSidePairingTitle(title)) {
    if (/\bwith\b/i.test(title) && isIntegralWithPhrase(title)) {
      issues.push({
        code: "integral_with_ok",
        severity: "info",
        message: "Title uses integral 'with' component — not a separate side pairing.",
      });
    }
    return issues;
  }

  const base = title.split(/\bwith\b/i)[0]?.trim() || title;
  const sidePart = title.split(/\bwith\b/i).slice(1).join(" with ").trim();

  if (mainHasBuiltinStarch(base) && SIDE_STARCH_WORDS.test(sidePart)) {
    issues.push({
      code: "redundant_starch_side",
      severity: "critical",
      message: `"${base}" already includes starch — title should not also name ${sidePart}. Use a salad or slaw only.`,
    });
  }

  if (/quinoa/i.test(sidePart) && /salad/i.test(sidePart) && mainHasBuiltinStarch(base)) {
    issues.push({
      code: "awkward_multi_side",
      severity: "critical",
      message: "Drop redundant quinoa — keep a single salad side for potato-top bakes.",
    });
  }

  if (/quinoa/i.test(sidePart) && /rice/i.test(sidePart)) {
    issues.push({
      code: "awkward_multi_side",
      severity: "critical",
      message: "Title names two starches (quinoa + rice) — pick one carb side.",
    });
  }

  if (/\bpizza\b/i.test(base) && SIDE_STARCH_WORDS.test(sidePart)) {
    issues.push({
      code: "redundant_starch_side",
      severity: "critical",
      message: "Pizza does not need a separate starch side in the title.",
    });
  }

  if (/\b(sandwich|burger|burrito|wrap)\b/i.test(base) && /\b(rice|quinoa|mashed|fries)\b/i.test(sidePart)) {
    issues.push({
      code: "unrealistic_hall_pairing",
      severity: "warning",
      message: "Handheld mains rarely get a separate plated starch in the title — use slaw or salad.",
    });
  }

  const blob = `${input.heroPath || ""} ${input.heroAlt || ""}`.toLowerCase();
  if (blob.length > 3) {
    if (/greek salad|garden salad|side salad/i.test(sidePart) && !/\b(salad|lettuce|cucumber|tomato|feta|olive)\b/i.test(blob)) {
      issues.push({
        code: "missing_named_side_in_metadata",
        severity: "warning",
        message: "Title names salad but hero path/alt lacks salad cues — regenerate wider family-style hero.",
      });
    }
  }

  return issues;
}

export function recommendedSideForBuiltinStarchMain(mainLabel: string): string | null {
  if (!mainHasBuiltinStarch(mainLabel)) return null;
  if (/\b(shepherd|cottage|pot)\s*pie\b/i.test(mainLabel)) return "Greek salad";
  if (/\bmeatloaf\b/i.test(mainLabel)) return "Green beans with butter";
  if (/\bpasta\b/i.test(mainLabel)) return "Garlic bread";
  return "Garden salad";
}
