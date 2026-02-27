import { log } from "./index";

export const ALLERGEN_KEYWORDS: Record<string, RegExp> = {
  dairy: /\b(milk|butter|cheese|cream|whey|casein|yogurt|yoghurt|ghee|cheddar|mozzarella|parmesan|feta|ricotta|halloumi|brie|gouda|gruyere|provolone|monterey|colby|swiss cheese|cream cheese|sour cream|half.and.half|whipped cream|ice cream|custard|paneer|buttermilk|condensed milk|evaporated milk|heavy cream|light cream|mascarpone|queso|crema)\b/i,
  gluten: /\b(wheat|flour|bread|pasta|penne|spaghetti|linguine|fettuccine|macaroni|noodle|flatbread|naan|pizza dough|brioche|baguette|ciabatta|sourdough|couscous|barley|rye|seitan|breadcrumb|panko|crouton|pita|tortilla(?!.*corn)|bun(?!ion)|roll(?!ed)|orzo|farro|bulgur|semolina)\b/i,
  peanut: /\b(peanut|peanuts|peanut butter|peanut oil|peanut sauce)\b/i,
  nuts: /\b(peanut|peanuts|peanut butter|almond|almonds|walnut|walnuts|cashew|cashews|pecan|pecans|pistachio|pistachios|hazelnut|hazelnuts|macadamia|pine nut|pine nuts|brazil nut|praline|nut butter|mixed nuts|almond milk|almond flour|almond butter|cashew cream)\b/i,
  egg: /\b(egg|eggs|mayo|mayonnaise|aioli|meringue|custard)\b/i,
  eggs: /\b(egg|eggs|mayo|mayonnaise|aioli|meringue|custard)\b/i,
  soy: /\b(soy\b|soy sauce|soya|edamame|tofu|tempeh|miso|soybean|soy milk|soy protein)\b/i,
  shellfish: /\b(shrimp|prawn|prawns|crab|lobster|mussel|mussels|clam|clams|oyster|oysters|scallop|scallops|crawfish|crayfish|langoustine)\b/i,
};

export const ALLERGEN_SUBSTITUTIONS: {
  pattern: RegExp;
  safeFor: string[];
  replacement: string;
  stepFind: RegExp;
  stepReplace: string;
}[] = [
  { pattern: /\bbutter\b/i, safeFor: ["dairy"], replacement: "olive oil", stepFind: /\bbutter\b/gi, stepReplace: "olive oil" },
  { pattern: /\bheavy cream\b/i, safeFor: ["dairy"], replacement: "coconut cream", stepFind: /\bheavy cream\b/gi, stepReplace: "coconut cream" },
  { pattern: /\blight cream\b/i, safeFor: ["dairy"], replacement: "coconut cream", stepFind: /\blight cream\b/gi, stepReplace: "coconut cream" },
  { pattern: /\bsour cream\b/i, safeFor: ["dairy"], replacement: "coconut yogurt", stepFind: /\bsour cream\b/gi, stepReplace: "coconut yogurt" },
  { pattern: /\bcream cheese\b/i, safeFor: ["dairy"], replacement: "dairy-free cream cheese", stepFind: /\bcream cheese\b/gi, stepReplace: "dairy-free cream cheese" },
  { pattern: /\bcream\b/i, safeFor: ["dairy"], replacement: "coconut cream", stepFind: /\bcream\b/gi, stepReplace: "coconut cream" },
  { pattern: /\byogurt\b/i, safeFor: ["dairy"], replacement: "coconut yogurt", stepFind: /\byogurt\b/gi, stepReplace: "coconut yogurt" },
  { pattern: /\byoghurt\b/i, safeFor: ["dairy"], replacement: "coconut yogurt", stepFind: /\byoghurt\b/gi, stepReplace: "coconut yogurt" },
  { pattern: /\bmilk\b/i, safeFor: ["dairy"], replacement: "oat milk", stepFind: /\bmilk\b/gi, stepReplace: "oat milk" },
  { pattern: /\bshredded cheese\b/i, safeFor: ["dairy"], replacement: "nutritional yeast", stepFind: /\bshredded cheese\b/gi, stepReplace: "nutritional yeast" },
  { pattern: /\bcheddar\b/i, safeFor: ["dairy"], replacement: "nutritional yeast", stepFind: /\bcheddar\b/gi, stepReplace: "nutritional yeast" },
  { pattern: /\bmozzarella\b/i, safeFor: ["dairy"], replacement: "dairy-free mozzarella", stepFind: /\bmozzarella\b/gi, stepReplace: "dairy-free mozzarella" },
  { pattern: /\bparmesan\b/i, safeFor: ["dairy"], replacement: "nutritional yeast", stepFind: /\bparmesan\b/gi, stepReplace: "nutritional yeast" },
  { pattern: /\bfeta\b/i, safeFor: ["dairy"], replacement: "dairy-free feta crumbles", stepFind: /\bfeta\b/gi, stepReplace: "dairy-free feta" },
  { pattern: /\bcheese\b/i, safeFor: ["dairy"], replacement: "nutritional yeast", stepFind: /\bcheese\b/gi, stepReplace: "nutritional yeast" },
  { pattern: /\bpaneer\b/i, safeFor: ["dairy"], replacement: "extra-firm tofu", stepFind: /\bpaneer\b/gi, stepReplace: "extra-firm tofu" },
  { pattern: /\bghee\b/i, safeFor: ["dairy"], replacement: "coconut oil", stepFind: /\bghee\b/gi, stepReplace: "coconut oil" },
  { pattern: /\bsoy sauce\b/i, safeFor: ["soy"], replacement: "coconut aminos", stepFind: /\bsoy sauce\b/gi, stepReplace: "coconut aminos" },
  { pattern: /\bsoy sauce\b/i, safeFor: ["gluten"], replacement: "tamari (gluten-free)", stepFind: /\bsoy sauce\b/gi, stepReplace: "tamari (gluten-free)" },
  { pattern: /\btamari(?! \(gluten-free\))\b/i, safeFor: ["soy"], replacement: "coconut aminos", stepFind: /\btamari(?! \(gluten-free\))\b/gi, stepReplace: "coconut aminos" },
  { pattern: /\brice or pasta\b/i, safeFor: ["gluten"], replacement: "rice", stepFind: /\brice or pasta\b/gi, stepReplace: "rice" },
  { pattern: /\bcornstarch\b/i, safeFor: ["gluten"], replacement: "cornstarch (gluten-free thickener)", stepFind: /\bcornstarch\b/gi, stepReplace: "cornstarch" },
  { pattern: /\btofu\b/i, safeFor: ["soy"], replacement: "chickpeas", stepFind: /\btofu\b/gi, stepReplace: "chickpeas" },
  { pattern: /\btempeh\b/i, safeFor: ["soy"], replacement: "lentils", stepFind: /\btempeh\b/gi, stepReplace: "lentils" },
  { pattern: /\bedamame\b/i, safeFor: ["soy"], replacement: "green peas", stepFind: /\bedamame\b/gi, stepReplace: "green peas" },
  { pattern: /\bmiso\b/i, safeFor: ["soy"], replacement: "vegetable bouillon paste", stepFind: /\bmiso\b/gi, stepReplace: "vegetable bouillon paste" },
  { pattern: /\b(?:all[- ]purpose )?flour\b/i, safeFor: ["gluten"], replacement: "gluten-free flour blend", stepFind: /\b(?:all[- ]purpose )?flour\b/gi, stepReplace: "gluten-free flour blend" },
  { pattern: /\bpanko\b/i, safeFor: ["gluten"], replacement: "gluten-free panko", stepFind: /\bpanko\b/gi, stepReplace: "gluten-free panko" },
  { pattern: /\bbreadcrumb/i, safeFor: ["gluten"], replacement: "gluten-free breadcrumbs", stepFind: /\bbreadcrumbs?\b/gi, stepReplace: "gluten-free breadcrumbs" },
  { pattern: /\bpasta\b/i, safeFor: ["gluten"], replacement: "gluten-free pasta", stepFind: /\bpasta\b/gi, stepReplace: "gluten-free pasta" },
  { pattern: /\bpenne\b/i, safeFor: ["gluten"], replacement: "gluten-free penne", stepFind: /\bpenne\b/gi, stepReplace: "gluten-free penne" },
  { pattern: /\bspaghetti\b/i, safeFor: ["gluten"], replacement: "gluten-free spaghetti", stepFind: /\bspaghetti\b/gi, stepReplace: "gluten-free spaghetti" },
  { pattern: /\bnoodles?\b/i, safeFor: ["gluten"], replacement: "rice noodles", stepFind: /\bnoodles?\b/gi, stepReplace: "rice noodles" },
  { pattern: /\bflour tortilla/i, safeFor: ["gluten"], replacement: "corn tortillas", stepFind: /\bflour tortillas?\b/gi, stepReplace: "corn tortillas" },
  { pattern: /\btortilla/i, safeFor: ["gluten"], replacement: "corn tortillas", stepFind: /\btortillas?\b/gi, stepReplace: "corn tortillas" },
  { pattern: /\bbrioche\b/i, safeFor: ["gluten"], replacement: "gluten-free buns", stepFind: /\bbrioche\b/gi, stepReplace: "gluten-free buns" },
  { pattern: /\bburger bun/i, safeFor: ["gluten"], replacement: "gluten-free buns", stepFind: /\bburger buns?\b/gi, stepReplace: "gluten-free buns" },
  { pattern: /\bbun\b/i, safeFor: ["gluten"], replacement: "gluten-free buns", stepFind: /\bbuns?\b/gi, stepReplace: "gluten-free buns" },
  { pattern: /\bbread\b/i, safeFor: ["gluten"], replacement: "gluten-free bread", stepFind: /\bbread\b/gi, stepReplace: "gluten-free bread" },
  { pattern: /\bflatbread/i, safeFor: ["gluten"], replacement: "gluten-free flatbread", stepFind: /\bflatbreads?\b/gi, stepReplace: "gluten-free flatbread" },
  { pattern: /\bnaan\b/i, safeFor: ["gluten"], replacement: "gluten-free naan", stepFind: /\bnaan\b/gi, stepReplace: "gluten-free naan" },
  { pattern: /\bcouscous\b/i, safeFor: ["gluten"], replacement: "quinoa", stepFind: /\bcouscous\b/gi, stepReplace: "quinoa" },
  { pattern: /\bseitan\b/i, safeFor: ["gluten"], replacement: "chickpeas", stepFind: /\bseitan\b/gi, stepReplace: "chickpeas" },
  { pattern: /\bpeanut butter\b/i, safeFor: ["nuts", "peanut"], replacement: "sunflower seed butter", stepFind: /\bpeanut butter\b/gi, stepReplace: "sunflower seed butter" },
  { pattern: /\bpeanut/i, safeFor: ["nuts", "peanut"], replacement: "sunflower seeds", stepFind: /\bpeanuts?\b/gi, stepReplace: "sunflower seeds" },
  { pattern: /\balmond flour\b/i, safeFor: ["nuts"], replacement: "oat flour", stepFind: /\balmond flour\b/gi, stepReplace: "oat flour" },
  { pattern: /\balmond milk\b/i, safeFor: ["nuts"], replacement: "oat milk", stepFind: /\balmond milk\b/gi, stepReplace: "oat milk" },
  { pattern: /\balmond/i, safeFor: ["nuts"], replacement: "sunflower seeds", stepFind: /\balmonds?\b/gi, stepReplace: "sunflower seeds" },
  { pattern: /\bcashew/i, safeFor: ["nuts"], replacement: "sunflower seeds", stepFind: /\bcashews?\b/gi, stepReplace: "sunflower seeds" },
  { pattern: /\bwalnut/i, safeFor: ["nuts"], replacement: "pumpkin seeds", stepFind: /\bwalnuts?\b/gi, stepReplace: "pumpkin seeds" },
  { pattern: /\bpecan/i, safeFor: ["nuts"], replacement: "pumpkin seeds", stepFind: /\bpecans?\b/gi, stepReplace: "pumpkin seeds" },
  { pattern: /\bpistachio/i, safeFor: ["nuts"], replacement: "pumpkin seeds", stepFind: /\bpistachios?\b/gi, stepReplace: "pumpkin seeds" },
  { pattern: /\bhazelnut/i, safeFor: ["nuts"], replacement: "sunflower seeds", stepFind: /\bhazelnuts?\b/gi, stepReplace: "sunflower seeds" },
  { pattern: /\bpine nut/i, safeFor: ["nuts"], replacement: "sunflower seeds", stepFind: /\bpine nuts?\b/gi, stepReplace: "sunflower seeds" },
  { pattern: /\beggs?\b/i, safeFor: ["egg", "eggs"], replacement: "flax eggs (1 tbsp ground flax + 3 tbsp water per egg)", stepFind: /\beggs?\b/gi, stepReplace: "flax eggs" },
  { pattern: /\bmayonnaise\b/i, safeFor: ["egg", "eggs"], replacement: "egg-free mayo", stepFind: /\bmayonnaise\b/gi, stepReplace: "egg-free mayo" },
  { pattern: /\bmayo\b/i, safeFor: ["egg", "eggs"], replacement: "egg-free mayo", stepFind: /\bmayo\b/gi, stepReplace: "egg-free mayo" },
  { pattern: /\baioli\b/i, safeFor: ["egg", "eggs"], replacement: "egg-free aioli", stepFind: /\baioli\b/gi, stepReplace: "egg-free aioli" },
];

const FALSE_POSITIVE_GUARDS: Record<string, RegExp> = {
  dairy: /\b(coconut cream|coconut yogurt|dairy[- ]free|oat milk|almond milk|cashew cream|nut milk|rice milk|soy milk|non[- ]dairy)\b/i,
  gluten: /\b(gluten[- ]free|rice noodle|rice paper|rice vinegar|rice wine|rice flour|corn tortilla|coconut aminos|tamari \(gluten-free\)|tamari|gf\b)/i,
  nuts: /\b(coconut|sunflower|pumpkin seed|sesame|pine[- ]?apple)\b/i,
  soy: /\b(coconut aminos|soy[- ]free|soy[- ]&[- ]gluten[- ]free)\b/i,
  egg: /\b(egg[- ]free|flax egg|chia egg|vegan mayo)\b/i,
  eggs: /\b(egg[- ]free|flax egg|chia egg|vegan mayo)\b/i,
};

export function containsAllergen(text: string, allergen: string): boolean {
  const al = allergen.toLowerCase().trim();
  const normalizedAl = al === "eggs" ? "egg" : al;
  const pattern = ALLERGEN_KEYWORDS[normalizedAl] || ALLERGEN_KEYWORDS[al];
  if (!pattern) {
    return text.toLowerCase().includes(al);
  }

  if (!pattern.test(text)) return false;

  const guard = FALSE_POSITIVE_GUARDS[normalizedAl] || FALSE_POSITIVE_GUARDS[al];
  if (guard) {
    const cleaned = text.replace(guard, "___SAFE___");
    return pattern.test(cleaned);
  }

  return true;
}

export function scanRecipeForAllergens(
  ingredients: { item: string; amount?: string; notes?: string }[],
  steps: { heading?: string; body?: string }[],
  title: string,
  allergens: string[]
): { found: boolean; violations: string[] } {
  if (!allergens || allergens.length === 0) return { found: false, violations: [] };

  const violations: string[] = [];

  for (const allergen of allergens) {
    for (const ing of ingredients) {
      const text = `${ing.item} ${ing.notes || ""}`;
      if (containsAllergen(text, allergen)) {
        violations.push(`ingredient "${ing.item}" contains ${allergen}`);
      }
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const text = `${step.heading || ""} ${step.body || ""}`;
      if (containsAllergen(text, allergen)) {
        violations.push(`step ${i + 1} references ${allergen} ("${(step.heading || "").substring(0, 40)}")`);
      }
    }

    if (containsAllergen(title, allergen)) {
      violations.push(`title "${title}" references ${allergen}`);
    }
  }

  return { found: violations.length > 0, violations };
}

export function autoSubstituteAllergens(
  ingredients: { item: string; amount: string; notes: string }[],
  steps: { heading: string; body: string }[],
  title: string,
  allergens: string[]
): {
  ingredients: { item: string; amount: string; notes: string }[];
  steps: { heading: string; body: string }[];
  title: string;
  substitutionsMade: string[];
} {
  if (!allergens || allergens.length === 0) {
    return { ingredients, steps, title, substitutionsMade: [] };
  }

  let fixedIngredients = ingredients.map(i => ({ ...i }));
  let fixedSteps = steps.map(s => ({ ...s }));
  let fixedTitle = title;
  const substitutionsMade: string[] = [];
  const normalizedAllergens = allergens.map(a => a.toLowerCase().trim());

  for (const sub of ALLERGEN_SUBSTITUTIONS) {
    const isRelevant = sub.safeFor.some(sf => normalizedAllergens.includes(sf));
    if (!isRelevant) continue;

    for (let i = 0; i < fixedIngredients.length; i++) {
      const ing = fixedIngredients[i];
      if (sub.pattern.test(ing.item)) {
        const original = ing.item;
        fixedIngredients[i] = {
          ...ing,
          item: sub.replacement,
          notes: ing.notes ? `${ing.notes} (allergen swap)` : "(allergen swap)",
        };
        substitutionsMade.push(`${original} → ${sub.replacement}`);
      }
    }

    for (let i = 0; i < fixedSteps.length; i++) {
      const step = fixedSteps[i];
      if (sub.stepFind.test(step.heading) || sub.stepFind.test(step.body)) {
        fixedSteps[i] = {
          heading: step.heading.replace(sub.stepFind, sub.stepReplace),
          body: step.body.replace(sub.stepFind, sub.stepReplace),
        };
      }
    }

    if (sub.pattern.test(fixedTitle)) {
      fixedTitle = fixedTitle.replace(sub.stepFind, sub.stepReplace);
    }
  }

  fixedIngredients = fixedIngredients.filter(ing => {
    for (const allergen of normalizedAllergens) {
      if (containsAllergen(ing.item, allergen)) {
        substitutionsMade.push(`removed "${ing.item}" (contains ${allergen}, no safe swap)`);
        return false;
      }
    }
    return true;
  });

  return { ingredients: fixedIngredients, steps: fixedSteps, title: fixedTitle, substitutionsMade };
}

export function substituteTextForAllergens(text: string, allergens: string[]): string {
  if (!text || !allergens || allergens.length === 0) return text;
  const normalizedAllergens = allergens.map(a => a.toLowerCase().trim());
  let result = text;
  for (const sub of ALLERGEN_SUBSTITUTIONS) {
    const isRelevant = sub.safeFor.some(sf => normalizedAllergens.includes(sf));
    if (!isRelevant) continue;
    if (sub.stepFind.test(result)) {
      result = result.replace(sub.stepFind, sub.stepReplace);
    }
  }
  return result;
}

export function buildAllergenAvoidList(allergens: string[]): string {
  if (!allergens || allergens.length === 0) return "";
  const items: string[] = [];
  for (const a of allergens) {
    const al = a.toLowerCase().trim();
    const norm = al === "eggs" ? "egg" : al;
    const pattern = ALLERGEN_KEYWORDS[norm];
    if (pattern) {
      const src = pattern.source;
      const words = src
        .replace(/\\b/g, "")
        .replace(/\(|\)/g, "")
        .split("|")
        .map(w => w.replace(/[\\[\].+*?^${}|]/g, "").trim())
        .filter(w => w.length > 1);
      items.push(...words);
    } else {
      items.push(al);
    }
  }
  return [...new Set(items)].join(", ");
}
