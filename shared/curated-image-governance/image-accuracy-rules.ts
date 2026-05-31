/**
 * Cross-catalog image accuracy heuristics — title/path keyword conflicts,
 * category mismatches, and food-realism red flags (path/metadata based).
 */

export type ImageAccuracyIssue = {
  code:
    | "title_path_keyword_conflict"
    | "category_mismatch"
    | "food_realism_red_flag"
    | "duplicate_hero_hash"
    | "donor_override_active"
    | "missing_image_file"
    | "explore_card_mismatch"
    | "image_title_mismatch"
    | "generic_substitute_meal"
    | "donor_image_forbidden";
  severity: "critical" | "warning" | "info";
  message: string;
  confidence: number;
};

export type TitlePathRule = {
  titleRe: RegExp;
  requiredPathRe?: RegExp;
  forbiddenPathRe?: RegExp;
  message: string;
  severity?: "critical" | "warning";
  /** Skip rule when title already claims the depicted format (e.g. steak tacos). */
  skipWhenTitleMatches?: RegExp;
};

/** Title vs hero path keyword alignment — catches stew-on-plate, dessert-on-hash, etc. */
export const TITLE_PATH_ACCURACY_RULES: TitlePathRule[] = [
  {
    titleRe: /\bhash\b/i,
    forbiddenPathRe: /\b(cake|coffee-cake|bar|brownie|cookie|dessert|square|muffin|bundt|loaf)\b/i,
    message: "hash recipe but hero path suggests baked dessert or coffee cake",
    severity: "critical",
    skipWhenTitleMatches: /\bburrito\b/i,
  },
  {
    titleRe: /\bchicken thighs?\b/i,
    forbiddenPathRe: /\b(curry|stew|soup|chili|broth|coconut|one-pot|one_pot)\b/i,
    message: "chicken thigh recipe but hero suggests stew, curry, or soup",
    severity: "critical",
  },
  {
    titleRe: /\bsteak\b/i,
    forbiddenPathRe: /\b(taco|tacos|burrito|nacho|quesadilla)\b/i,
    message: "steak recipe but hero suggests tacos or handheld Mexican",
    severity: "critical",
    skipWhenTitleMatches: /\b(taco|tacos|steak taco)\b/i,
  },
  {
    titleRe: /\bpulled pork\b/i,
    forbiddenPathRe: /\b(brisket|roast-beef|pot-roast|sliced-loin|pork-chop)\b/i,
    message: "pulled pork recipe but hero suggests brisket or roast slices",
    severity: "critical",
  },
  {
    titleRe: /\bbrisket\b/i,
    forbiddenPathRe: /\b(roast-beef|pot-roast|meatloaf|pulled-pork)\b/i,
    message: "brisket recipe but hero suggests roast beef or pulled pork",
    severity: "warning",
  },
  {
    titleRe: /\bnacho\b/i,
    forbiddenPathRe: /\b(taco|tacos|burrito)\b/i,
    message: "nacho recipe but hero suggests tacos",
    severity: "warning",
  },
  {
    titleRe: /\bsalad\b/i,
    forbiddenPathRe: /\b(sandwich|sub|hoagie|burger|panini)\b/i,
    message: "salad recipe but hero suggests sandwich",
    severity: "warning",
  },
  {
    titleRe: /\bsmoothie\b/i,
    forbiddenPathRe: /\b(pizza|taco|steak|burger|pasta|skillet|hash)\b/i,
    message: "smoothie recipe but hero suggests solid meal imagery",
    severity: "critical",
  },
  {
    titleRe: /\bpizza\b/i,
    forbiddenPathRe: /\b(taco|burger|pasta|skillet|hash|stew)\b/i,
    message: "pizza recipe but hero path suggests non-pizza meal",
    severity: "critical",
    skipWhenTitleMatches: /\btaco\s+pizza\b/i,
  },
  {
    titleRe: /\bred lead\b/i,
    forbiddenPathRe: /\b(biscuit|gravy|chicken|steak|curry|stew|egg|pancake|waffle)\b/i,
    message: "Red Lead sauce but hero suggests full breakfast protein or wrong dish",
    severity: "critical",
  },
  {
    titleRe: /\bred lead\b/i,
    requiredPathRe: /\b(red-lead|firefighter-red-lead|tomato|shakshuka|cast-iron|cast_iron|skillet)\b/i,
    message: "Red Lead hero must show tomato cast-iron sauce — not generic breakfast",
    severity: "critical",
  },
  {
    titleRe: /\bbreakfast\b|\bpancake\b|\bwaffle\b|\bomelette\b/i,
    forbiddenPathRe: /\b(cake|brownie|cookie|dessert|cheesecake)\b/i,
    message: "breakfast recipe but hero suggests dessert",
    severity: "critical",
  },
  {
    titleRe: /\bhash\b/i,
    requiredPathRe: /\b(potato|hash|skillet|skillet)\b/i,
    forbiddenPathRe: /\b(cake|coffee-cake|bar|brownie|cookie|dessert|square|muffin|bundt|loaf|granola)\b/i,
    message: "hash recipe but hero path lacks potato/skillet cues or suggests baked dessert",
    severity: "critical",
    skipWhenTitleMatches: /\bburrito\b/i,
  },
  {
    titleRe: /\bburrito\b/i,
    requiredPathRe: /\b(burrito|tortilla|wrap|crunchwrap)\b/i,
    forbiddenPathRe: /\b(biscuit|gravy|sandwich|open-face)\b/i,
    message: "burrito recipe but hero path lacks tortilla cues or suggests biscuits and gravy",
    severity: "critical",
  },
  {
    titleRe: /\boats?\b/i,
    requiredPathRe: /\b(oats?|oatmeal|savory-oats)\b/i,
    forbiddenPathRe: /\b(biscuit|gravy|pancake|sweet|dessert|cake|square)\b/i,
    message: "oats recipe but hero path lacks oatmeal cues or suggests biscuits, gravy, or sweet dessert",
    severity: "critical",
  },
  {
    titleRe: /\bsalmon\b/i,
    forbiddenPathRe: /\b(cod-taco|tilapia|white-fish|fish-taco)\b/i,
    message: "salmon recipe but hero suggests different fish",
    severity: "warning",
  },
];

const FOOD_REALISM_RED_FLAGS =
  /\b(ai.?slop|fantasy|surreal|fine.?dining|molecular|gourmet.?plating|macro.?only|extreme.?close|floating.?ingredient|waxy|stock.?photo|shutterstock|generic.?food|restaurant.?marketing|influencer|studio.?seamless|white.?background)\b/i;

const HEARTY_POSITIVE =
  /\b(firehall|station.?kitchen|hall.?kitchen|crew|cast.?iron|skillet|sheet.?pan|hotel.?pan|platter|steam.?table|prep.?table|serving.?tray|commercial.?kitchen|stainless)\b/i;

export function auditTitlePathKeywords(
  title: string,
  heroPath: string,
  altText = "",
): ImageAccuracyIssue[] {
  const blob = `${heroPath} ${altText}`.toLowerCase();
  const issues: ImageAccuracyIssue[] = [];

  for (const rule of TITLE_PATH_ACCURACY_RULES) {
    if (!rule.titleRe.test(title)) continue;
    if (rule.skipWhenTitleMatches?.test(title)) continue;
    if (rule.forbiddenPathRe?.test(blob)) {
      issues.push({
        code: "title_path_keyword_conflict",
        severity: rule.severity ?? "critical",
        message: rule.message,
        confidence: 90,
      });
    }
    if (rule.requiredPathRe && !rule.requiredPathRe.test(blob)) {
      issues.push({
        code: "title_path_keyword_conflict",
        severity: rule.severity ?? "critical",
        message: rule.message,
        confidence: 88,
      });
    }
  }

  return issues;
}

export function auditFoodRealismHeuristics(
  title: string,
  heroPath: string,
  altText = "",
  mealFormat = "",
): ImageAccuracyIssue[] {
  const blob = `${title} ${heroPath} ${altText} ${mealFormat}`.toLowerCase();
  const issues: ImageAccuracyIssue[] = [];

  if (FOOD_REALISM_RED_FLAGS.test(blob)) {
    issues.push({
      code: "food_realism_red_flag",
      severity: "warning",
      message: "hero path/metadata suggests AI slop, stock photo, or fine-dining framing",
      confidence: 55,
    });
  }

  if (/\b(tiny.?portion|diet.?plate|amuse.?bouche|tasting.?menu)\b/i.test(blob)) {
    issues.push({
      code: "food_realism_red_flag",
      severity: "warning",
      message: "hero suggests tiny or fine-dining portions — not crew-sized firehall food",
      confidence: 60,
    });
  }

  if (!HEARTY_POSITIVE.test(blob) && /\b(abstract|artistic|minimalist.?white)\b/i.test(blob)) {
    issues.push({
      code: "food_realism_red_flag",
      severity: "info",
      message: "hero metadata may read overly artistic rather than firehall crew meal",
      confidence: 40,
    });
  }

  return issues;
}

export function auditCategoryMealFormat(
  title: string,
  mealFormat: string,
  category: string,
  heroPath: string,
): ImageAccuracyIssue[] {
  const issues: ImageAccuracyIssue[] = [];
  const blob = `${heroPath} ${title}`.toLowerCase();
  const fmt = mealFormat.toLowerCase();

  if (category.includes("breakfast") || fmt === "breakfast") {
    if (/\b(pizza|taco|steak|bbq.?brisket)\b/i.test(blob) && !/\bbreakfast\b/i.test(title)) {
      issues.push({
        code: "category_mismatch",
        severity: "critical",
        message: "breakfast category but hero suggests dinner/BBQ dish",
        confidence: 85,
      });
    }
  }

  if (fmt === "bowl" && /\b(sandwich|sub|hoagie|panini)\b/i.test(blob)) {
    issues.push({
      code: "category_mismatch",
      severity: "critical",
      message: "bowl format but hero suggests sandwich",
      confidence: 82,
    });
  }

  if ((fmt === "soup_chili" || fmt === "stew" || fmt === "one_pot") && /\b(plated|platter)\b/i.test(blob) && !/\b(soup|chili|stew|curry|pot)\b/i.test(blob)) {
    issues.push({
      code: "category_mismatch",
      severity: "warning",
      message: "soup/stew/one-pot format but hero lacks stew visual cues",
      confidence: 50,
    });
  }

  return issues;
}
