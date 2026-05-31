/**
 * Firehall Meals — global food photography standard.
 * All recipe hero images must match this firehall kitchen realism spec.
 */

export const FIREHALL_KITCHEN_PHOTO_STANDARD_VERSION = "1.0" as const;

/** Active Canadian firehall kitchen — the gold-standard environment. */
export const FIREHALL_KITCHEN_ENVIRONMENT = {
  location:
    "active Canadian firehall kitchen during meal preparation — Toronto, Mississauga, Brampton, Calgary, or Edmonton station kitchen realism",
  include: [
    "commercial stainless equipment",
    "prep tables",
    "steam tables",
    "sheet pans",
    "hotel pans",
    "industrial kitchen lighting",
    "realistic hall environment",
    "commercial ranges",
    "flat-top grills",
    "stock pots",
    "cutting boards",
    "serving trays",
    "warming tables",
    "commercial sinks",
    "walk-in cooler doors",
    "pantry shelving",
    "visible steam",
    "prep stations",
  ],
  optional: [
    "firefighters blurred in background as kitchen staff",
    "station kitchen activity",
    "crew preparing food in soft bokeh",
  ],
  feel: "the crew is making dinner after calls — NOT a firefighter marketing photo",
} as const;

/** Hard exclusions — firehall kitchen photos, NOT firefighting photos. */
export const FIREHALL_KITCHEN_FORBIDDEN = [
  "fire trucks",
  "pumpers",
  "aerial apparatus",
  "bunker gear",
  "turnout gear",
  "SCBA packs",
  "helmets",
  "firefighting equipment",
  "emergency scenes",
  "flashing lights",
  "hoses",
  "axes",
  "Halligan bars",
  "firefighter group photos",
  "firefighter recruitment imagery",
  "department logos",
  "station patches prominently displayed",
  "restaurant kitchens",
  "food photography studios",
  "luxury home kitchens",
  "outdoor BBQ patios as primary setting",
  "influencer kitchens",
  "firefighter promotional photography",
] as const;

/** Crew-sized firehall food styling. */
export const FIREHALL_FOOD_STYLING = {
  include: [
    "large portions",
    "family style",
    "crew sized",
    "hearty",
    "realistic",
    "served for 8–12 firefighters",
    "serving trays",
    "cutting boards",
    "sheet pans",
    "hotel pans",
    "large platters",
    "carving boards",
    "prep surfaces",
    "meal ready to serve an entire shift",
  ],
  avoid: [
    "fine dining plating",
    "tiny portions",
    "influencer food styling",
    "floating ingredients",
    "white studio backgrounds",
    "restaurant glamour shots",
    "unrealistic garnish overload",
    "magazine cover perfection",
  ],
} as const;

/** Documentary realism camera language. */
export const FIREHALL_CAMERA_STYLE = {
  lens: "professional 50mm food photography look, shallow depth of field",
  lighting: "warm industrial kitchen lighting, natural shadows, visible steam when hot",
  mood: "served to a hungry fire crew — documentary realism, not magazine cover staging",
} as const;

export type FirehallPhotoCategory =
  | "breakfast"
  | "bbq"
  | "soups_chili"
  | "sandwiches"
  | "global_meals"
  | "default";

const CATEGORY_RULES: Record<FirehallPhotoCategory, string[]> = {
  breakfast: [
    "bacon",
    "eggs",
    "breakfast sausage",
    "hash browns",
    "toast",
    "griddle cooking",
    "breakfast station atmosphere",
  ],
  bbq: [
    "smoke",
    "grill marks",
    "carving boards",
    "smoker or grill environment",
    "sliced meats",
    "large serving platters",
  ],
  soups_chili: [
    "stock pots",
    "ladles",
    "steam",
    "bread trays",
    "hall lunch atmosphere",
  ],
  sandwiches: [
    "stacked trays",
    "deli-style serving",
    "sliced meats",
    "family-style presentation",
  ],
  global_meals: [
    "authentic ingredients",
    "culturally accurate presentation",
    "realistic serving vessels",
    "still prepared in a Canadian firehall kitchen",
  ],
  default: ["crew-sized firehall meal on prep surface or serving tray"],
};

/** Metadata/path signals that an image likely fails the standard. */
const REPLACEMENT_RED_FLAGS =
  /\b(stock|shutterstock|getty|istock|unsplash|placeholder|generic|studio.?seamless|white.?background|macro.?only|extreme.?close|floating.?ingredient|ai.?slop|fine.?dining|molecular|gourmet.?plating|restaurant.?marketing|influencer|donor|copy)\b/i;

const FIREFIGHTER_MARKETING_FLAGS =
  /\b(fire.?truck|pumper|aerial|bunker|turnout|scba|helmet|recruitment|department.?logo|station.?patch|halligan|emergency.?scene|flashing.?light)\b/i;

const FIREHALL_POSITIVE_SIGNALS =
  /\b(firehall|station.?kitchen|hall.?kitchen|crew|sheet.?pan|hotel.?pan|steam.?table|prep.?table|serving.?tray|stock.?pot|commercial.?kitchen|stainless)\b/i;

export function resolveFirehallPhotoCategory(
  category = "",
  mealFormat = "",
  title = "",
): FirehallPhotoCategory {
  const blob = `${category} ${mealFormat} ${title}`.toLowerCase();
  if (/breakfast|brunch|pancake|waffle|omelette|hash|griddle/.test(blob)) return "breakfast";
  if (/bbq|grill|smoke|brisket|rib|smoker/.test(blob)) return "bbq";
  if (/soup|chili|stew|broth|one.?pot|curry/.test(blob)) return "soups_chili";
  if (/sandwich|sub|hoagie|panini|wrap|burrito|slider/.test(blob)) return "sandwiches";
  if (/global|thai|pad.?thai|curry|taco|mexican|italian|asian|korean|indian/.test(blob)) {
    return "global_meals";
  }
  return "default";
}

export function getCategoryPhotoRules(
  category?: string,
  mealFormat?: string,
  title?: string,
): string[] {
  const id = resolveFirehallPhotoCategory(category, mealFormat, title);
  return CATEGORY_RULES[id];
}

/** Positive prompt lines — injected into every hero generation. */
export function getFirehallKitchenPhotoStandardLines(): string[] {
  return [
    "GLOBAL FIREHALL KITCHEN PHOTO STANDARD — photorealistic professional food photography",
    `Location: ${FIREHALL_KITCHEN_ENVIRONMENT.location}`,
    `Environment includes: ${FIREHALL_KITCHEN_ENVIRONMENT.include.join(", ")}`,
    `Optional background: ${FIREHALL_KITCHEN_ENVIRONMENT.optional.join(", ")}`,
    `Food styling: ${FIREHALL_FOOD_STYLING.include.slice(0, 6).join(", ")} — ${FIREHALL_FOOD_STYLING.avoid.slice(0, 4).join(", ")} avoided`,
    `Camera: ${FIREHALL_CAMERA_STYLE.lens}, ${FIREHALL_CAMERA_STYLE.lighting}`,
    `Mood: ${FIREHALL_CAMERA_STYLE.mood}`,
    "Primary subject: THE FOOD and THE FIREHALL KITCHEN — food tack sharp, kitchen supports the story",
    "Background firefighters only if blurred, in navy station t-shirts, aprons, or uniforms — cooking or prepping, never hero subjects",
    `Story feel: ${FIREHALL_KITCHEN_ENVIRONMENT.feel}`,
    `Standard version ${FIREHALL_KITCHEN_PHOTO_STANDARD_VERSION}`,
  ];
}

/** Negative prompt fragments — firefighter marketing and wrong environments. */
export function getFirehallKitchenNegativePromptLines(): string[] {
  return [
    ...FIREHALL_KITCHEN_FORBIDDEN,
    ...FIREHALL_FOOD_STYLING.avoid,
    "firefighter as primary subject",
    "posed firefighter portrait",
    "recruitment poster aesthetic",
    "restaurant fine dining",
    "food studio white seamless",
    "tiny tasting portions",
    "duplicate hero reused from another recipe",
  ];
}

export type FirehallPhotoStandardIssue = {
  code:
    | "duplicate_hero_hash"
    | "donor_override_active"
    | "missing_image_file"
    | "replacement_red_flag"
    | "firefighter_marketing_signal"
    | "missing_firehall_atmosphere_metadata"
    | "needs_regeneration";
  severity: "critical" | "warning" | "info";
  message: string;
  confidence: number;
};

export function auditFirehallPhotoStandardMetadata(input: {
  title: string;
  heroPath: string;
  altText?: string;
  category?: string;
  mealFormat?: string;
  donorOverride?: string;
  duplicatePeers?: string[];
  heroMissing?: boolean;
}): FirehallPhotoStandardIssue[] {
  const blob = `${input.title} ${input.heroPath} ${input.altText || ""}`.toLowerCase();
  const issues: FirehallPhotoStandardIssue[] = [];

  if (input.heroMissing) {
    issues.push({
      code: "missing_image_file",
      severity: "critical",
      message: "hero image file missing — must generate unique firehall kitchen photo",
      confidence: 99,
    });
  }

  if (input.duplicatePeers?.length) {
    issues.push({
      code: "duplicate_hero_hash",
      severity: "critical",
      message: `duplicate hero image shared with ${input.duplicatePeers.join(", ")} — replace with unique photo`,
      confidence: 95,
    });
  }

  if (input.donorOverride) {
    issues.push({
      code: "donor_override_active",
      severity: "warning",
      message: `hero still byte-identical to configured donor "${input.donorOverride}" — replace with unique slug hero`,
      confidence: 70,
    });
  }

  if (REPLACEMENT_RED_FLAGS.test(blob)) {
    issues.push({
      code: "replacement_red_flag",
      severity: "warning",
      message: "path/metadata suggests stock photo, studio, AI, or generic imagery — replace per global standard",
      confidence: 65,
    });
  }

  if (FIREFIGHTER_MARKETING_FLAGS.test(blob)) {
    issues.push({
      code: "firefighter_marketing_signal",
      severity: "critical",
      message: "metadata suggests firefighter marketing imagery — replace with firehall kitchen meal photo",
      confidence: 85,
    });
  }

  if (!FIREHALL_POSITIVE_SIGNALS.test(blob)) {
    issues.push({
      code: "missing_firehall_atmosphere_metadata",
      severity: "info",
      message: "hero metadata lacks firehall kitchen atmosphere cues — verify environment on regeneration",
      confidence: 35,
    });
  }

  const needsReplace =
    issues.some((i) => i.severity === "critical") ||
    issues.some((i) => i.code === "duplicate_hero_hash");

  if (needsReplace) {
    issues.push({
      code: "needs_regeneration",
      severity: issues.some((i) => i.severity === "critical") ? "critical" : "warning",
      message: "queued for replacement under global firehall kitchen photo standard",
      confidence: 90,
    });
  }

  return issues;
}

/** Build category-specific positive lines for prompt assembly. */
export function buildCategoryPhotoPromptBlock(
  category?: string,
  mealFormat?: string,
  title?: string,
): string {
  const rules = getCategoryPhotoRules(category, mealFormat, title);
  const cat = resolveFirehallPhotoCategory(category, mealFormat, title);
  return `Category (${cat}): include ${rules.join(", ")}`;
}
