import type { GenerateResponse } from "@shared/schema";

type ProteinMode = "vegetarian" | "seafood" | "chicken" | "beef" | "pork" | "turkey" | "lamb" | "fish" | "any" | "pantry";

const LAND_MEAT_PATTERNS: RegExp[] = [
  /\bchicken\b/, /\bturkey\b/, /\bbeef\b/, /\bpork\b/, /\bham\b/, /\bbacon\b/,
  /\blamb\b/, /\bveal\b/, /\bsausage\b/, /\bpepperoni\b/, /\bprosciutto\b/,
  /\bmeatballs?\b/, /\bground\s+(beef|pork|turkey|chicken|lamb)\b/,
  /\bsteak\b/, /\bribs?\b/, /\bbrisket\b/, /\bsalami\b/, /\bchorizo\b/,
  /\bpancetta\b/, /\bcarnitas\b/, /\bpulled\s+pork\b/, /\bpoultry\b/,
  /\bduck\b/, /\bvenison\b/, /\bbison\b/, /\bgoat\b/, /\brabbit\b/,
  /\bsirloin\b/, /\bribeye\b/, /\bchuck\b/, /\bflank\b/,
  /\bpork\s+chop\b/, /\bpork\s+loin\b/, /\bturkey\s+breast\b/,
];

const SEAFOOD_PATTERNS: RegExp[] = [
  /\bfish\b/, /\bsalmon\b/, /\btuna\b/, /\btilapia\b/, /\bcod\b/, /\bhaddock\b/,
  /\bshrimp\b/, /\bprawns?\b/, /\bcrab\b/, /\blobster\b/, /\bscallops?\b/,
  /\bclams?\b/, /\bmussels?\b/, /\boysters?\b/, /\banchov(?:y|ies)\b/,
  /\bsardines?\b/, /\bhalibut\b/, /\bmahi\b/, /\btrout\b/, /\bseafood\b/,
  /\bswordfish\b/, /\bbass\b/, /\bsnapper\b/, /\bsquid\b/, /\bcalamari\b/,
  /\boctopus\b/, /\bfish\s+fillet\b/, /\bwhite\s+fish\b/,
];

const NON_VEG_ADDON_PATTERNS: RegExp[] = [
  /\bchicken\s+stock\b/, /\bbeef\s+stock\b/, /\bfish\s+stock\b/,
  /\bbone\s+broth\b/, /\bchicken\s+broth\b/, /\bbeef\s+broth\b/,
  /\bfish\s+sauce\b/, /\boyster\s+sauce\b/, /\banchovy\s+paste\b/,
  /\bgelatin\b/, /\blard\b/, /\btallow\b/,
  /\bchicken\s+bouillon\b/, /\bbeef\s+bouillon\b/,
  /\bworcestershire\b/, /\bsuet\b/, /\bdripping\b/, /\bschmaltz\b/,
  /\bdemi[- ]glace\b/,
  /\bpork\s+broth\b/, /\bpork\s+stock\b/,
  /\bturkey\s+broth\b/, /\bturkey\s+stock\b/,
  /\bfish\s+broth\b/,
];

const LAND_MEAT_BROTH_PATTERNS: RegExp[] = [
  /\bchicken\s+stock\b/, /\bchicken\s+broth\b/, /\bchicken\s+bouillon\b/,
  /\bbeef\s+stock\b/, /\bbeef\s+broth\b/, /\bbeef\s+bouillon\b/,
  /\bpork\s+stock\b/, /\bpork\s+broth\b/,
  /\bturkey\s+stock\b/, /\bturkey\s+broth\b/,
  /\bbone\s+broth\b/,
];

const VEGETARIAN_FALSE_POSITIVE_PATTERNS: RegExp[] = [
  /\bchickpea/i,
  /\bplant[- ]based\s+chicken\b/i,
  /\bplant[- ]based\s+beef\b/i,
  /\bplant[- ]based\s+ground\b/i,
  /\blamb's\s+lettuce\b/i,
  /\bhamburger\b/i,
];

const PROTEIN_SPECIFIC_TERMS: Record<string, RegExp[]> = {
  chicken: [/\bchicken\b/, /\bpoultry\b/],
  beef: [/\bbeef\b/, /\bsteak\b/, /\bveal\b/, /\bbrisket\b/, /\bsirloin\b/, /\bribeye\b/, /\bchuck\b/, /\bflank\b/, /\bground\s+beef\b/],
  pork: [/\bpork\b/, /\bbacon\b/, /\bham\b/, /\bprosciutto\b/, /\bpancetta\b/, /\bchorizo\b/, /\bsalami\b/, /\bpepperoni\b/, /\bcarnitas\b/, /\bpulled\s+pork\b/, /\bpork\s+chop\b/, /\bpork\s+loin\b/, /\bsausage\b/],
  turkey: [/\bturkey\b/, /\bturkey\s+breast\b/, /\bground\s+turkey\b/],
  lamb: [/\blamb\b/],
  fish: [/\bfish\b/, /\bsalmon\b/, /\btuna\b/, /\bcod\b/, /\btilapia\b/, /\bhalibut\b/, /\btrout\b/, /\bmahi\b/, /\bswordfish\b/, /\bbass\b/, /\bsnapper\b/, /\bfish\s+fillet\b/, /\bwhite\s+fish\b/, /\bhaddock\b/, /\bsardines?\b/],
};

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatches(text: string, patterns: RegExp[]): string[] {
  const hits: string[] = [];
  for (const rx of patterns) {
    if (rx.test(text)) hits.push(rx.source);
  }
  return hits;
}

function findMatchesFiltered(text: string, patterns: RegExp[], excludePatterns: RegExp[]): string[] {
  const hits: string[] = [];
  for (const rx of patterns) {
    if (rx.test(text)) {
      const isExcluded = excludePatterns.some(ep => ep.test(text));
      if (!isExcluded) hits.push(rx.source);
    }
  }
  return hits;
}

function buildRecipeText(recipe: GenerateResponse): string {
  const parts = [
    recipe.title,
    ...recipe.ingredients.map(i => i.item),
    ...(recipe.steps || []).map(s => `${s.heading} ${s.body}`),
    ...(recipe.pro_tips || []),
  ];
  return normalizeText(parts.join(" "));
}

export function getForbiddenProteins(selectedProtein: string): string[] {
  const selected = selectedProtein.toLowerCase();
  const forbidden: string[] = [];

  const ALL_ANIMAL_TERMS: Record<string, string[]> = {
    chicken: ["chicken", "poultry"],
    beef: ["beef", "steak", "veal", "brisket", "ground beef", "sirloin", "ribeye", "chuck", "flank"],
    pork: ["pork", "bacon", "ham", "prosciutto", "pancetta", "chorizo", "salami", "pepperoni", "pork chop", "pork loin", "pulled pork", "carnitas"],
    turkey: ["turkey", "turkey breast", "ground turkey"],
    fish: ["fish", "salmon", "tuna", "cod", "tilapia", "halibut", "trout", "mahi", "swordfish", "bass", "snapper", "fish fillet", "white fish", "haddock", "sardine"],
    shrimp: ["shrimp", "prawn"],
    lamb: ["lamb"],
    crab: ["crab"],
    lobster: ["lobster"],
    seafood: ["seafood", "clam", "mussel", "oyster", "scallop", "squid", "calamari", "octopus", "anchovy", "anchovies"],
    other_meat: ["gelatin", "lard", "bone broth", "duck", "venison", "bison", "goat", "rabbit"],
  };

  const SEAFOOD_CATS = ["fish", "shrimp", "crab", "lobster", "seafood"];

  if (selected === "seafood") {
    for (const [protein, variants] of Object.entries(ALL_ANIMAL_TERMS)) {
      if (SEAFOOD_CATS.includes(protein)) continue;
      forbidden.push(...variants);
    }
    forbidden.push("sausage");
    return forbidden;
  }

  if (selected === "vegetarian") {
    for (const variants of Object.values(ALL_ANIMAL_TERMS)) {
      forbidden.push(...variants);
    }
    forbidden.push("sausage");
    return forbidden;
  }

  for (const [protein, variants] of Object.entries(ALL_ANIMAL_TERMS)) {
    if (protein === selected) continue;
    forbidden.push(...variants);
  }

  if (selected !== "pork") {
    forbidden.push("sausage");
  }

  return forbidden;
}

export function getForbiddenProteinsText(selectedProtein: string): string {
  return getForbiddenProteins(selectedProtein).join(", ");
}

export function validateProteinCompliance(
  recipe: GenerateResponse,
  selectedProtein: string
): { valid: boolean; reason?: string } {
  const mode = selectedProtein.toLowerCase() as ProteinMode;

  if (mode === "pantry" || mode === "any") {
    return { valid: true };
  }

  const text = buildRecipeText(recipe);
  const ingredientText = normalizeText(recipe.ingredients.map(i => i.item).join(" "));

  if (mode === "vegetarian") {
    const landMeatHits = findMatchesFiltered(text, LAND_MEAT_PATTERNS, VEGETARIAN_FALSE_POSITIVE_PATTERNS);
    const seafoodHits = findMatches(text, SEAFOOD_PATTERNS);
    const addonHits = findMatches(text, NON_VEG_ADDON_PATTERNS);
    const forbidden = [...landMeatHits, ...seafoodHits, ...addonHits];

    if (forbidden.length > 0) {
      return {
        valid: false,
        reason: `Forbidden in vegetarian recipe: ${forbidden.join(", ")}`,
      };
    }
    return { valid: true };
  }

  if (mode === "seafood") {
    const seafoodHits = findMatches(ingredientText, SEAFOOD_PATTERNS);
    if (seafoodHits.length === 0) {
      return {
        valid: false,
        reason: "No seafood detected in ingredients",
      };
    }

    const landMeatHits = findMatches(text, LAND_MEAT_PATTERNS);
    const brothHits = findMatches(text, LAND_MEAT_BROTH_PATTERNS);
    const forbidden = [...landMeatHits, ...brothHits];

    if (forbidden.length > 0) {
      return {
        valid: false,
        reason: `Land meat/broth in seafood recipe: ${forbidden.join(", ")}`,
      };
    }
    return { valid: true };
  }

  const specificPatterns = PROTEIN_SPECIFIC_TERMS[mode];
  if (specificPatterns) {
    const found = findMatches(ingredientText, specificPatterns);
    if (found.length === 0) {
      return {
        valid: false,
        reason: `Selected protein "${selectedProtein}" not found in ingredients`,
      };
    }

    const otherModes = Object.keys(PROTEIN_SPECIFIC_TERMS).filter(k => k !== mode && k !== "fish");
    const forbiddenPatterns = otherModes.flatMap(k => PROTEIN_SPECIFIC_TERMS[k]);
    const forbiddenHits = findMatchesFiltered(ingredientText, forbiddenPatterns, [
      /\bchicken\s+stock\b/i, /\bchicken\s+broth\b/i, /\bchicken\s+bouillon\b/i,
      /\bbeef\s+stock\b/i, /\bbeef\s+broth\b/i, /\bbeef\s+bouillon\b/i,
      /\bchickpea\b/i, /\bhamburger\b/i,
      /\bplant[- ]based/i,
      /\bduck\s+sauce\b/i,
      /\blamb's\s+lettuce\b/i,
    ]);

    if (forbiddenHits.length > 0) {
      return {
        valid: false,
        reason: `Forbidden protein in "${selectedProtein}" recipe: ${forbiddenHits.join(", ")}`,
      };
    }
  }

  return { valid: true };
}
