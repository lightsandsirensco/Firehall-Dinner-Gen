/** Visual rules for firehall "Red Lead" breakfast imagery. */

const RED_LEAD_TITLE_RE = /\bred lead\b/i;

const RED_LEAD_FORBIDDEN_PATH_RE =
  /\b(biscuit|biscuits|gravy|biscuits-gravy|taco|tacos|pizza|sandwich|sandwiches|burrito|burritos|pancake|pancakes|waffle|waffles)\b/i;

/** Path/alt cues that tomato cast-iron Red Lead heroes should carry. */
const RED_LEAD_REQUIRED_PATH_RE =
  /\b(red-lead|firefighter-red-lead|tomato|shakshuka|cast-iron|cast_iron|skillet|cowboy-breakfast-skillet|firefighter-red-lead-recipe)\b/i;

export function titleIsRedLead(title: string): boolean {
  return RED_LEAD_TITLE_RE.test(title);
}

export function redLeadImagePathForbidden(imageRef: string): boolean {
  const blob = imageRef.toLowerCase();
  return RED_LEAD_FORBIDDEN_PATH_RE.test(blob);
}

export function redLeadImagePathSatisfied(imageRef: string, altText = ""): boolean {
  const blob = `${imageRef} ${altText}`.toLowerCase();
  return RED_LEAD_REQUIRED_PATH_RE.test(blob);
}

export interface RedLeadImageRuleResult {
  ok: boolean;
  forbidden?: string;
  missingRequired?: string;
}

export function validateRedLeadImageRef(
  title: string,
  imageRef: string,
  altText = "",
): RedLeadImageRuleResult {
  if (!titleIsRedLead(title)) return { ok: true };

  if (redLeadImagePathForbidden(imageRef)) {
    return {
      ok: false,
      forbidden: "Red Lead imagery must not use biscuits/gravy, tacos, pizza, or sandwiches",
    };
  }

  if (!redLeadImagePathSatisfied(imageRef, altText)) {
    return {
      ok: false,
      missingRequired:
        "Red Lead imagery must use a tomato cast-iron skillet hero (path should include red-lead, firefighter-red-lead, tomato, shakshuka, cast-iron, or skillet)",
    };
  }

  return { ok: true };
}
