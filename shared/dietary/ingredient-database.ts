/**
 * Canonical ingredient dietary/allergen database.
 *
 * This is a FOOD SAFETY system, not a convenience feature. The governing rule:
 * if an ingredient's status for a given allergen/diet is not confidently known,
 * the classifier (see classify-recipe.ts) treats that allergen as PRESENT for
 * that ingredient rather than absent. Accuracy and conservatism outrank recipe
 * coverage — it is fine, and expected, for many recipes to not qualify for a
 * strict filter simply because one ingredient couldn't be confidently verified.
 *
 * Entries are matched against free-text ingredient `name`/`notes` fields via
 * longest-keyword-wins substring matching (same pattern as
 * shared/nutrition/ingredient-database.ts). Keywords are drawn from an actual
 * frequency audit of every ingredient string across all 432 published recipes,
 * so common phrasing variants ("yellow onion, diced", "garlic cloves, minced")
 * resolve to the same canonical profile as their base ingredient.
 */

export type DietaryCategory =
  | "beef"
  | "pork"
  | "poultry"
  | "lamb"
  | "processed_meat"
  | "fish"
  | "shellfish"
  | "egg"
  | "dairy"
  | "grain_gluten"
  | "grain_gluten_free"
  | "legume"
  | "vegetable"
  | "fruit"
  | "tree_nut"
  | "peanut"
  | "seed"
  | "sauce_condiment"
  | "fat_oil"
  | "sweetener"
  | "spice_herb_aromatic"
  | "beverage_alcohol"
  | "baking_leavening"
  | "other";

export interface IngredientDietaryProfile {
  /** Canonical id, e.g. "soy-sauce". */
  id: string;
  /** Matching substrings, longest-match-wins at lookup time. */
  keywords: string[];
  category: DietaryCategory;
  /** true = contains this allergen/component. */
  gluten: boolean;
  dairy: boolean;
  egg: boolean;
  soy: boolean;
  treeNuts: boolean;
  peanuts: boolean;
  shellfish: boolean;
  fish: boolean;
  sesame: boolean;
  pork: boolean;
  alcohol: boolean;
  /** Meat/poultry/fish/shellfish (blocks vegetarian) — animal flesh specifically. */
  meat: boolean;
  /** Free-text note on cross-contamination risk (shared fryers, shared lines, etc.). */
  crossContaminationRisk?: string;
  /** Human-readable substitution notes keyed by the allergen they address. */
  substitutions?: Partial<Record<"gluten" | "dairy" | "egg" | "soy" | "treeNuts" | "peanuts" | "pork" | "alcohol", string>>;
}

/**
 * Ingredient text containing any of these patterns overrides the matched
 * profile's flag to `false` for that specific allergen — e.g. "gluten-free
 * soy sauce" or "tamari" should not be flagged gluten-containing even though
 * the base "soy sauce" profile assumes gluten by default.
 *
 * `unless`, if present, SUPPRESSES the override when it also matches the same
 * text — this guards against an "X or Y" alternative ingredient line (e.g.
 * "turkey sausage or lean pork sausage") where the poultry phrase alone would
 * otherwise unconditionally force pork:false even though the very same line
 * also explicitly names a pork alternative. Without this guard the override
 * fires purely on substring presence regardless of what else is in the text.
 */
export const TEXT_OVERRIDES: Array<{
  pattern: RegExp;
  flag: keyof Pick<IngredientDietaryProfile, "gluten" | "dairy" | "egg" | "soy" | "treeNuts" | "peanuts" | "pork" | "alcohol">;
  value: boolean;
  unless?: RegExp;
}> = [
  { pattern: /gluten[\s-]?free/i, flag: "gluten", value: false },
  { pattern: /\btamari\b/i, flag: "gluten", value: false },
  { pattern: /dairy[\s-]?free|non-?dairy|\bvegan\b/i, flag: "dairy", value: false },
  { pattern: /egg[\s-]?free|\bvegan\b/i, flag: "egg", value: false },
  { pattern: /soy[\s-]?free|coconut aminos/i, flag: "soy", value: false },
  { pattern: /\bnut[\s-]?free\b/i, flag: "treeNuts", value: false },
  { pattern: /peanut[\s-]?free/i, flag: "peanuts", value: false },
  { pattern: /non-?alcoholic|alcohol-?free/i, flag: "alcohol", value: false },
  {
    // NOTE: `unless` intentionally only lists pork-indicating words that are NOT already
    // substrings of the trigger phrases themselves (i.e. never "bacon"/"sausage"/"pepperoni" —
    // those appear inside "turkey bacon"/"chicken sausage"/"turkey pepperoni" and would
    // self-suppress the override for the exact ingredients it's meant to handle).
    pattern: /turkey bacon|beef bacon|turkey sausage|chicken sausage|turkey pepperoni/i,
    flag: "pork",
    value: false,
    unless: /\bpork\b|\bham\b|\bchorizo\b|\bprosciutto\b|\blard\b/i,
  },
];

const NONE = { gluten: false, dairy: false, egg: false, soy: false, treeNuts: false, peanuts: false, shellfish: false, fish: false, sesame: false, pork: false, alcohol: false, meat: false };

export const INGREDIENT_DIETARY_PROFILES: IngredientDietaryProfile[] = [
  // ---------------- BEEF ----------------
  { id: "ground-beef", keywords: ["ground beef", "beef, browned", "ground beef, browned"], category: "beef", ...NONE, meat: true },
  { id: "beef-roast-steak", keywords: ["beef chuck", "chuck roast", "stew beef", "beef stew meat", "stew meat", "beef sirloin", "sirloin steak", "beef brisket", "brisket point", "packer brisket", "brisket", "burnt ends", "beef short rib", "beef short ribs", "beef ribs", "ny strip", "ribeye", "flank steak", "skirt steak", "tri-tip", "tri tip", "tri-tip roast", "chuck", "beef tallow", "beef chuck roast"], category: "beef", ...NONE, meat: true },
  { id: "beef-general", keywords: ["beef"], category: "beef", ...NONE, meat: true },
  { id: "ground-lamb", keywords: ["ground lamb", "lamb loin chops", "lamb"], category: "lamb", ...NONE, meat: true },

  // ---------------- POULTRY ----------------
  { id: "chicken", keywords: ["boneless skinless chicken thighs", "boneless chicken thighs", "boneless, skinless chicken thighs", "chicken thighs", "chicken thigh", "bone-in chicken thighs", "bone-in, skin-on chicken thighs", "chicken breast", "chicken breasts", "boneless chicken breasts", "boneless, skinless chicken breasts", "boneless skinless chicken breasts", "chicken drumstick", "chicken quarters", "chicken leg quarters", "split chicken", "rotisserie chicken", "shredded chicken", "cooked shredded chicken", "cooked chicken breast", "whole chicken", "bone-in thighs", "bone-in chicken", "chicken wings", "chicken"], category: "poultry", ...NONE, meat: true },
  { id: "ground-turkey", keywords: ["ground turkey", "turkey breast", "turkey thigh", "lean turkey", "sliced turkey breast", "turkey"], category: "poultry", ...NONE, meat: true },

  // ---------------- PORK / PROCESSED MEAT (pork by default) ----------------
  { id: "bacon", keywords: ["thick-cut bacon", "cooked bacon", "bacon, cooked and crumbled", "bacon"], category: "processed_meat", ...NONE, meat: true, pork: true, crossContaminationRisk: "Cured with nitrates; some brands processed on shared lines with soy/gluten fillers — check label if strict." },
  { id: "sausage-pork", keywords: ["breakfast sausage", "italian sausage", "pork sausage", "chorizo", "mexican chorizo", "andouille sausage", "sweet italian sausage", "italian sausage links", "sausage"], category: "processed_meat", ...NONE, meat: true, pork: true, gluten: false, crossContaminationRisk: "Many sausage casings/binders include breadcrumbs or wheat-based fillers — verify label for gluten status.", substitutions: { pork: "Swap in chicken or turkey sausage." } },
  { id: "ham", keywords: ["ham", "deli ham", "canadian bacon", "diced ham"], category: "processed_meat", ...NONE, meat: true, pork: true },
  { id: "pepperoni-salami", keywords: ["pepperoni", "salami", "soppressata", "mortadella"], category: "processed_meat", ...NONE, meat: true, pork: true },
  { id: "pork-cuts", keywords: ["pork shoulder", "pork butt", "pulled pork", "pork chop", "pork chops", "pork tenderloin", "pork loin", "pork belly", "spare ribs", "baby back ribs", "pork ribs", "st louis ribs", "rib racks", "pork spare ribs", "ground pork", "pork"], category: "pork", ...NONE, meat: true, pork: true },

  // ---------------- FISH & SHELLFISH ----------------
  { id: "fish-fillet", keywords: ["salmon fillet", "salmon fillets", "salmon", "cod fillets", "cod", "tilapia", "trout", "rainbow trout", "whole rainbow trout", "whole trout", "grilled trout", "white fish", "ancho-tilapia"], category: "fish", ...NONE, meat: true, fish: true },
  { id: "shellfish", keywords: ["shrimp", "large shrimp", "jumbo shrimp"], category: "shellfish", ...NONE, meat: true, shellfish: true },
  { id: "anchovy", keywords: ["anchovy fillets", "anchovy", "anchovies"], category: "fish", ...NONE, meat: true, fish: true },
  { id: "canned-tuna", keywords: ["canned tuna", "tuna packed in oil", "tuna packed in water", "tuna steak", "tuna", "albacore"], category: "fish", ...NONE, meat: true, fish: true },
  { id: "fish-sauce", keywords: ["fish sauce"], category: "sauce_condiment", ...NONE, fish: true },
  { id: "worcestershire", keywords: ["worcestershire sauce", "worcestershire"], category: "sauce_condiment", ...NONE, fish: true, gluten: true, crossContaminationRisk: "Contains anchovies (fish) and is typically malt-vinegar based (gluten) — verify label for gluten-free/vegan versions.", substitutions: { gluten: "Use a certified gluten-free Worcestershire sauce." } },
  { id: "caesar-dressing", keywords: ["caesar dressing"], category: "sauce_condiment", ...NONE, fish: true, egg: true, dairy: true, crossContaminationRisk: "Traditional Caesar dressing contains anchovies and raw/coddled egg." },

  // ---------------- EGGS ----------------
  { id: "eggs", keywords: ["large eggs", "large egg yolks", "hard-boiled eggs", "soft-boiled eggs", "eggs", "egg"], category: "egg", ...NONE, egg: true },

  // ---------------- DAIRY ----------------
  { id: "milk", keywords: ["whole milk", "2% milk", "buttermilk", "milk"], category: "dairy", ...NONE, dairy: true, substitutions: { dairy: "Use oat, almond, or soy milk (check tree-nut/soy status of the substitute)." } },
  { id: "cheese", keywords: ["cheddar cheese", "shredded cheddar", "sharp cheddar cheese", "sharp cheddar", "shredded sharp cheddar", "cheddar, shredded", "cheddar", "mozzarella cheese", "shredded mozzarella", "low-moisture mozzarella", "fresh mozzarella", "mozzarella, shredded", "mozzarella", "pepper jack", "shredded cheese", "cheese shredded", "parmesan cheese", "grated parmesan", "parmesan, grated", "parmesan", "monterey jack cheese", "monterey jack", "shredded monterey jack", "swiss cheese", "provolone slices", "provolone cheese", "provolone", "queso fresco", "cotija cheese", "cotija", "feta cheese", "feta, crumbled", "crumbled feta", "feta", "smoked gouda", "brick cheese", "american cheese slices", "american cheese", "shredded pepper jack", "shredded cheddar-mozzarella blend", "cheese curds", "nacho cheese sauce", "pecorino romano", "queso", "cheese"], category: "dairy", ...NONE, dairy: true, substitutions: { dairy: "Use a dairy-free cheese shred/block alternative." } },
  { id: "cream-cheese-sour-cream", keywords: ["cream cheese", "sour cream", "mexican crema"], category: "dairy", ...NONE, dairy: true },
  { id: "butter", keywords: ["unsalted butter", "clarified butter", "whipped butter", "melted butter", "butter"], category: "dairy", ...NONE, dairy: true, substitutions: { dairy: "Use a plant-based butter/margarine." } },
  { id: "cream", keywords: ["heavy cream", "whipping cream", "ricotta", "whole-milk ricotta"], category: "dairy", ...NONE, dairy: true },
  { id: "yogurt", keywords: ["greek yogurt", "plain yogurt", "yogurt", "tzatziki"], category: "dairy", ...NONE, dairy: true },
  { id: "cottage-cheese", keywords: ["cottage cheese"], category: "dairy", ...NONE, dairy: true },
  { id: "dairy-alt-milk", keywords: ["oat milk", "coconut milk"], category: "dairy", ...NONE }, // plant milks: not dairy by definition ("almond milk" is handled by the dedicated almond/tree-nut profile below)

  // ---------------- GRAINS / GLUTEN ----------------
  { id: "flour-tortilla", keywords: ["10-inch flour tortillas", "large flour tortillas", "flour tortilla", "flour tortillas"], category: "grain_gluten", ...NONE, gluten: true, substitutions: { gluten: "Use certified gluten-free tortillas or corn tortillas." } },
  { id: "corn-tortilla", keywords: ["corn tortilla", "corn tortillas", "tortilla strips", "tortilla chips", "tostada shell", "tostada shells", "6-inch tostada shells"], category: "grain_gluten_free", ...NONE },
  { id: "generic-tortilla-wrap", keywords: ["tortillas", "tortilla", "wrap"], category: "grain_gluten", ...NONE, gluten: true, crossContaminationRisk: "Ambiguous — could be flour or corn. Treated as gluten-containing unless the recipe specifies corn tortillas.", substitutions: { gluten: "Confirm corn tortillas are used, or substitute a certified gluten-free wrap." } },
  { id: "bun-bread-roll", keywords: ["brioche bun", "hamburger bun", "burger bun", "hot dog bun", "slider bun", "buns", "bun", "hoagie rolls", "sub rolls", "sandwich bread", "white bread", "rye bread", "marbled rye bread", "crusty bread", "baguette", "french baguettes", "ciabatta", "sourdough", "english muffin", "english muffins", "day-old bread", "bagels", "pita bread", "pita breads", "brioche", "texas toast", "french toast", "thick-sliced brioche", "challah", "bread"], category: "grain_gluten", ...NONE, gluten: true, substitutions: { gluten: "Use a certified gluten-free bun/bread and toast on a separate, clean surface." } },
  { id: "rice", keywords: ["jasmine rice", "white rice", "long grain rice", "long-grain rice", "long-grain white rice", "basmati rice", "basmati", "brown rice", "wild rice", "short-grain rice", "cilantro-lime rice", "cooked rice", "rice"], category: "grain_gluten_free", ...NONE },
  { id: "rice-noodles", keywords: ["rice noodles"], category: "grain_gluten_free", ...NONE },
  { id: "pasta-wheat", keywords: ["dry elbow macaroni", "dry macaroni", "elbow macaroni", "elbow macaroni dry", "spaghetti", "dried spaghetti", "penne", "penne pasta", "macaroni", "orzo pasta", "whole wheat orzo", "orzo", "farfalle pasta", "ditalini", "pasta"], category: "grain_gluten", ...NONE, gluten: true, substitutions: { gluten: "Use a certified gluten-free pasta." } },
  // Egg noodles are a distinct product from egg-free wheat pasta shapes above — the eggs are
  // a manufactured ingredient of the noodle itself, so egg-free must exclude them. (Previously
  // this was folded into the plain "pasta" profile with an incorrect `egg: false` override.)
  { id: "egg-noodles", keywords: ["egg noodles", "wide egg noodles", "whole wheat egg noodles"], category: "grain_gluten", ...NONE, gluten: true, egg: true, substitutions: { gluten: "Use a certified gluten-free pasta or rice noodles.", egg: "Use an egg-free wheat or rice noodle." } },
  { id: "ramen-noodles", keywords: ["ramen noodles"], category: "grain_gluten", ...NONE, gluten: true, substitutions: { gluten: "Use rice noodles or a certified gluten-free ramen substitute." } },
  { id: "potatoes", keywords: ["russet potato", "russet potatoes", "yukon potato", "yukon gold potatoes", "hash brown", "hash browns", "frozen hash browns", "baby potatoes", "potato", "potatoes"], category: "grain_gluten_free", ...NONE },
  { id: "sweet-potato", keywords: ["sweet potato", "sweet potatoes"], category: "grain_gluten_free", ...NONE },
  { id: "flour-wheat", keywords: ["all-purpose flour", "bread flour", "cake flour", "flour"], category: "grain_gluten", ...NONE, gluten: true, substitutions: { gluten: "Use a 1:1 gluten-free all-purpose flour blend." } },
  { id: "cornstarch-cornmeal", keywords: ["cornstarch", "cornmeal"], category: "grain_gluten_free", ...NONE },
  { id: "breadcrumbs-panko", keywords: ["panko breadcrumbs", "panko", "bread crumb", "breadcrumbs", "plain breadcrumbs"], category: "grain_gluten", ...NONE, gluten: true, substitutions: { gluten: "Use certified gluten-free panko/breadcrumbs, or crushed gluten-free crackers." } },
  { id: "oats", keywords: ["rolled oats", "oats", "oatmeal"], category: "grain_gluten", ...NONE, gluten: true, crossContaminationRisk: "Oats are naturally gluten-free but are very commonly cross-contaminated with wheat during growing/milling — treated as gluten-containing unless labeled certified gluten-free.", substitutions: { gluten: "Use certified gluten-free oats." } },
  { id: "pancake-waffle-mix", keywords: ["pancake mix", "bisquick", "waffle mix", "complete pancake mix"], category: "grain_gluten", ...NONE, gluten: true, egg: false, dairy: false, substitutions: { gluten: "Use a certified gluten-free pancake/baking mix." } },
  { id: "pizza-dough", keywords: ["pizza dough", "pizza crust", "pizza dough balls"], category: "grain_gluten", ...NONE, gluten: true, substitutions: { gluten: "Use a certified gluten-free pizza crust." } },
  { id: "yeast", keywords: ["instant yeast", "active dry yeast", "yeast"], category: "baking_leavening", ...NONE },
  { id: "baking-powder-soda", keywords: ["baking powder", "baking soda"], category: "baking_leavening", ...NONE, crossContaminationRisk: "Some baking powder brands use wheat starch as an anti-caking agent — verify label if strict." },
  { id: "quinoa-farro-bulgur", keywords: ["quinoa"], category: "grain_gluten_free", ...NONE },
  { id: "farro-bulgur", keywords: ["farro", "bulgur wheat", "bulgur", "tabbouleh"], category: "grain_gluten", ...NONE, gluten: true, substitutions: { gluten: "Substitute quinoa or rice." } },
  { id: "barley", keywords: ["pearl barley", "barley"], category: "grain_gluten", ...NONE, gluten: true, substitutions: { gluten: "Substitute rice or a gluten-free grain." } },

  // ---------------- LEGUMES / PLANT PROTEIN ----------------
  { id: "beans", keywords: ["kidney bean", "kidney beans", "black bean", "black beans", "pinto bean", "pinto beans", "cannellini", "cannellini beans", "chickpea", "chickpeas", "canned chickpeas", "garbanzo", "beans drained", "beans, drained", "baked beans", "butter bean", "butter beans", "lima bean", "lima beans", "great northern beans", "navy beans", "fava beans", "white beans", "beans"], category: "legume", ...NONE },
  { id: "lentils", keywords: ["lentil", "lentils", "green lentils"], category: "legume", ...NONE },
  { id: "edamame", keywords: ["edamame"], category: "legume", ...NONE, soy: true },
  { id: "tofu-tempeh", keywords: ["tofu", "tempeh"], category: "legume", ...NONE, soy: true },
  { id: "hummus", keywords: ["hummus", "tahini"], category: "sauce_condiment", ...NONE, sesame: true },

  // ---------------- SAUCES / CONDIMENTS (hidden allergen zone) ----------------
  { id: "soy-sauce", keywords: ["low-sodium soy sauce", "soy sauce"], category: "sauce_condiment", ...NONE, gluten: true, soy: true, crossContaminationRisk: "Traditionally brewed with wheat — assume gluten-containing unless labeled tamari or gluten-free.", substitutions: { gluten: "Use tamari (check soy-free brands separately) or coconut aminos.", soy: "Use coconut aminos." } },
  { id: "tamari", keywords: ["tamari"], category: "sauce_condiment", ...NONE, gluten: false, soy: true, crossContaminationRisk: "Most tamari is gluten-free by tradition, but always verify the specific brand/label — some tamari blends still include wheat." },
  { id: "coconut-aminos", keywords: ["coconut aminos"], category: "sauce_condiment", ...NONE },
  { id: "hoisin", keywords: ["hoisin sauce", "hoisin"], category: "sauce_condiment", ...NONE, gluten: true, soy: true, substitutions: { gluten: "Use a certified gluten-free hoisin or a tamari-based substitute." } },
  { id: "teriyaki", keywords: ["teriyaki sauce", "teriyaki"], category: "sauce_condiment", ...NONE, gluten: true, soy: true, substitutions: { gluten: "Use a certified gluten-free teriyaki sauce made with tamari." } },
  { id: "oyster-sauce", keywords: ["oyster sauce"], category: "sauce_condiment", ...NONE, gluten: true, shellfish: true, substitutions: { gluten: "Use a certified gluten-free or vegetarian 'oyster' sauce alternative.", pork: "N/A" } },
  { id: "gochujang-miso", keywords: ["gochujang", "miso"], category: "sauce_condiment", ...NONE, gluten: true, soy: true, substitutions: { gluten: "Use a certified gluten-free gochujang/miso." } },
  { id: "malt-vinegar", keywords: ["malt vinegar"], category: "sauce_condiment", ...NONE, gluten: true, substitutions: { gluten: "Use cider or white vinegar instead." } },
  { id: "vinegar-other", keywords: ["apple cider vinegar", "red wine vinegar", "white vinegar", "rice vinegar", "balsamic vinegar", "aged balsamic vinegar", "vinegar"], category: "sauce_condiment", ...NONE },
  { id: "mustard", keywords: ["yellow mustard", "dijon mustard", "whole-grain mustard", "creole mustard", "dry mustard", "mustard"], category: "sauce_condiment", ...NONE },
  { id: "ketchup", keywords: ["ketchup"], category: "sauce_condiment", ...NONE },
  { id: "mayonnaise", keywords: ["mayonnaise", "mayo", "aioli"], category: "sauce_condiment", ...NONE, egg: true, substitutions: { egg: "Use an egg-free/vegan mayonnaise." } },
  { id: "bbq-sauce", keywords: ["bbq sauce", "barbecue sauce"], category: "sauce_condiment", ...NONE, crossContaminationRisk: "Some BBQ sauces use soy sauce or malt vinegar as a base — verify label for gluten/soy if strict.", gluten: false },
  { id: "hot-sauce-salsa", keywords: ["hot sauce", "salsa verde", "salsa or pico de gallo", "salsa", "pico de gallo", "adobo sauce", "chipotle in adobo", "chipotles in adobo", "chipotle peppers in adobo", "green chiles", "diced tomatoes with green chiles"], category: "sauce_condiment", ...NONE },
  { id: "marinara-pizza-sauce", keywords: ["marinara sauce", "marinara", "pizza sauce", "red enchilada sauce", "crushed tomato", "diced tomato", "crushed tomatoes", "diced tomatoes", "fire-roasted diced tomatoes", "san marzano crushed tomatoes", "san marzano", "tomato sauce", "tomatoes canned"], category: "vegetable", ...NONE },
  { id: "tomato-paste-fresh", keywords: ["tomato paste", "tomatoes", "cherry tomatoes", "grape tomatoes", "roma tomatoes", "heirloom cherry tomatoes"], category: "vegetable", ...NONE },
  { id: "ranch-dressing", keywords: ["ranch dressing"], category: "sauce_condiment", ...NONE, dairy: true },
  // Stock/broth/bouillon MUST be split by protein source — a recipe using chicken or beef
  // stock contains meat and must never pass vegetarian/vegan, regardless of how "neutral"
  // the ingredient sounds. An unqualified "stock"/"broth"/"bouillon" with no named protein
  // is genuinely ambiguous (could be meat- or vegetable-based) and is deliberately left
  // OUT of this keyword list entirely so findDietaryProfile() returns null for it — the
  // classifier then marks the whole recipe "low confidence" rather than guessing.
  { id: "chicken-stock", keywords: ["chicken stock", "chicken broth", "chicken bouillon", "chicken base", "chicken consomme", "turkey stock", "turkey broth", "low-sodium chicken broth", "low-sodium chicken stock"], category: "sauce_condiment", ...NONE, gluten: true, meat: true, crossContaminationRisk: "Bouillon and many boxed/canned stocks use hydrolyzed wheat protein, wheat starch, or 'natural flavoring' as a gluten source — treated as gluten-containing unless labeled gluten-free.", substitutions: { gluten: "Use a certified gluten-free broth or bouillon." } },
  { id: "beef-stock", keywords: ["beef stock", "beef broth", "beef bouillon", "beef base", "beef bone broth", "bone broth", "veal stock"], category: "sauce_condiment", ...NONE, gluten: true, meat: true, crossContaminationRisk: "Bouillon and many boxed/canned stocks use hydrolyzed wheat protein, wheat starch, or 'natural flavoring' as a gluten source — treated as gluten-containing unless labeled gluten-free.", substitutions: { gluten: "Use a certified gluten-free broth or bouillon." } },
  { id: "pork-ham-stock", keywords: ["ham stock", "ham broth", "pork stock", "pork broth", "pork bone broth"], category: "sauce_condiment", ...NONE, gluten: true, meat: true, pork: true, crossContaminationRisk: "Bouillon and many boxed/canned stocks use hydrolyzed wheat protein, wheat starch, or 'natural flavoring' as a gluten source — treated as gluten-containing unless labeled gluten-free.", substitutions: { gluten: "Use a certified gluten-free broth or bouillon." } },
  { id: "fish-shellfish-stock", keywords: ["fish stock", "fish broth", "seafood stock", "seafood broth", "shrimp stock", "shrimp broth", "lobster stock", "clam broth", "clam juice"], category: "sauce_condiment", ...NONE, gluten: true, meat: true, fish: true, crossContaminationRisk: "Bouillon and many boxed/canned stocks use hydrolyzed wheat protein, wheat starch, or 'natural flavoring' as a gluten source — treated as gluten-containing unless labeled gluten-free.", substitutions: { gluten: "Use a certified gluten-free broth or bouillon." } },
  { id: "vegetable-stock", keywords: ["vegetable stock", "vegetable broth", "veggie stock", "veggie broth", "mushroom stock", "mushroom broth", "low-sodium vegetable broth"], category: "sauce_condiment", ...NONE, gluten: true, crossContaminationRisk: "Bouillon and many boxed/canned stocks use hydrolyzed wheat protein, wheat starch, or 'natural flavoring' as a gluten source — treated as gluten-containing unless labeled gluten-free.", substitutions: { gluten: "Use a certified gluten-free broth or bouillon." } },
  { id: "cajun-taco-seasoning", keywords: ["cajun blackening spice", "cajun seasoning", "taco seasoning", "fajita seasoning", "jerk or poultry rub", "everything bagel seasoning", "seasoning packet", "seasoning"], category: "spice_herb_aromatic", ...NONE, gluten: true, crossContaminationRisk: "Pre-mixed spice/seasoning packets frequently include wheat-derived anti-caking agents or hydrolyzed wheat protein — treated as gluten-containing unless a specific gluten-free brand/blend is named.", substitutions: { gluten: "Make your own blend from individually confirmed gluten-free spices, or use a certified gluten-free seasoning packet." } },
  { id: "gravy-mix-cream-soup", keywords: ["country sausage gravy mix", "gravy mix", "gravy", "cream of mushroom", "cream of chicken", "cream soup", "roux"], category: "sauce_condiment", ...NONE, gluten: true, dairy: true, pork: false, crossContaminationRisk: "Traditional roux and canned cream soups are wheat-flour thickened — treated as gluten-containing.", substitutions: { gluten: "Thicken with cornstarch or a gluten-free flour blend instead of a wheat roux." } },

  // ---------------- OILS / FATS ----------------
  { id: "oil", keywords: ["extra-virgin olive oil", "olive oil", "vegetable oil", "canola oil", "cooking oil", "neutral oil", "grapeseed oil", "sesame oil", "toasted sesame oil", "oil"], category: "fat_oil", ...NONE },
  { id: "sesame-oil-seeds", keywords: ["sesame seeds", "toasted sesame seeds", "sesame oil", "toasted sesame oil"], category: "seed", ...NONE, sesame: true },

  // ---------------- SWEETENERS ----------------
  { id: "sugar", keywords: ["granulated sugar", "brown sugar", "powdered sugar", "sugar"], category: "sweetener", ...NONE },
  { id: "honey-syrup", keywords: ["honey or maple syrup", "honey", "maple syrup", "molasses", "hot honey"], category: "sweetener", ...NONE },

  // ---------------- VEGETABLES / AROMATICS ----------------
  { id: "onion", keywords: ["yellow onion, diced", "yellow onion", "red onion, thin sliced", "red onion, sliced", "red onion", "white onion", "yellow onions, sliced", "yellow onions", "onions", "large onion", "onion"], category: "vegetable", ...NONE },
  { id: "garlic", keywords: ["garlic cloves, minced", "garlic cloves, smashed", "garlic cloves", "garlic clove", "granulated garlic", "garlic powder", "garlic"], category: "vegetable", ...NONE },
  { id: "bell-pepper", keywords: ["bell peppers, sliced", "bell peppers, diced", "bell pepper", "bell peppers", "red bell pepper", "red bell peppers", "green bell pepper", "poblano peppers", "pepper diced"], category: "vegetable", ...NONE },
  { id: "jalapeno", keywords: ["jalapeño peppers", "jalapeños", "pickled jalapeños", "jalapeno"], category: "vegetable", ...NONE },
  { id: "carrots", keywords: ["carrot", "carrots", "frozen peas and carrots"], category: "vegetable", ...NONE },
  { id: "celery", keywords: ["celery stalks", "celery sticks", "celery seed", "celery"], category: "vegetable", ...NONE },
  { id: "greens-lettuce", keywords: ["spinach", "fresh spinach", "baby spinach", "kale", "lacinato kale", "mixed greens", "romaine", "romaine lettuce", "lettuce", "shredded lettuce", "arugula", "butter lettuce", "iceberg lettuce"], category: "vegetable", ...NONE },
  { id: "cruciferous-veg", keywords: ["broccoli", "broccolini", "cauliflower", "green bean", "asparagus", "zucchini", "zucchini noodles", "zoodles", "eggplant", "corn on the cob"], category: "vegetable", ...NONE },
  { id: "corn", keywords: ["corn kernels", "frozen corn", "corn kernel", "corn"], category: "vegetable", ...NONE },
  { id: "avocado", keywords: ["avocado", "avocados", "guacamole"], category: "fruit", ...NONE },
  { id: "cucumber", keywords: ["english cucumber", "cucumbers", "cucumber"], category: "vegetable", ...NONE },
  { id: "mushroom", keywords: ["cremini mushrooms", "mushroom", "mushrooms"], category: "vegetable", ...NONE },
  { id: "cabbage-slaw", keywords: ["green cabbage", "coleslaw mix", "shredded cabbage mix", "sauerkraut", "coleslaw", "kimchi"], category: "vegetable", ...NONE },
  { id: "herbs-fresh", keywords: ["fresh parsley, chopped", "fresh parsley", "fresh cilantro, chopped", "fresh cilantro", "cilantro", "fresh basil leaves", "fresh basil, torn", "fresh basil", "thai basil", "fresh mint", "fresh thyme leaves", "fresh thyme", "fresh dill", "fresh rosemary", "fresh oregano", "fresh epazote"], category: "spice_herb_aromatic", ...NONE },
  { id: "herbs-dried-spice", keywords: ["dried italian seasoning", "dried oregano", "dried basil", "dried thyme", "dried sage", "ground cumin", "cumin", "chili powder", "chile powder", "ancho chili powder", "ancho chile powder", "smoked paprika", "sweet paprika", "paprika", "ground cinnamon", "cinnamon stick", "cinnamon", "ground coriander", "coriander seeds", "ground allspice", "garam masala", "ras el hanout", "turmeric", "ground turmeric", "tajín seasoning", "mexican oregano", "oregano"], category: "spice_herb_aromatic", ...NONE },
  { id: "chili-flakes-cayenne", keywords: ["red pepper flakes", "crushed red chili flakes", "cayenne pepper", "cayenne", "dried guajillo chiles", "dried ancho chiles", "dried red chilies"], category: "spice_herb_aromatic", ...NONE },
  { id: "salt-pepper", keywords: ["kosher salt and black pepper", "kosher salt", "maldon salt", "flaky sea salt", "coarse salt", "coarse black pepper", "black pepper", "cracked black pepper", "white pepper", "pinch of kosher salt", "salt", "pepper"], category: "spice_herb_aromatic", ...NONE },
  { id: "onion-powder-generic", keywords: ["onion powder"], category: "spice_herb_aromatic", ...NONE },
  { id: "ginger", keywords: ["fresh ginger, grated", "fresh ginger", "ginger"], category: "spice_herb_aromatic", ...NONE },
  { id: "shallots", keywords: ["shallots", "shallot"], category: "vegetable", ...NONE },
  { id: "capers-olives", keywords: ["capers", "kalamata olives", "black olives, sliced", "green olives", "castelvetrano olives", "olives", "pepperoncini"], category: "vegetable", ...NONE },
  { id: "pickles", keywords: ["dill pickle chips", "dill pickles", "pickle chips", "pickled red onions", "pickled turnips", "sweet pickle relish", "pickled jalapeños, sliced", "pickled vegetables", "pickled veggies"], category: "vegetable", ...NONE },
  { id: "frozen-mixed-vegetables", keywords: ["frozen mixed vegetables", "frozen mixed veggies", "frozen vegetable medley"], category: "vegetable", ...NONE },
  { id: "parsley", keywords: ["chopped parsley", "italian parsley", "flat-leaf parsley", "parsley"], category: "spice_herb_aromatic", ...NONE },
  { id: "scallions", keywords: ["green onions, sliced", "green onions", "sliced green onions", "scallions"], category: "vegetable", ...NONE },
  { id: "bean-sprouts-water-chestnuts", keywords: ["bean sprouts", "water chestnuts", "daikon radish"], category: "vegetable", ...NONE },
  { id: "tomatillo", keywords: ["tomatillos", "tomatillo"], category: "vegetable", ...NONE },

  // ---------------- FRUIT ----------------
  { id: "citrus", keywords: ["lemon juice", "fresh lemon juice", "lime juice", "fresh lime juice", "lime wedges", "lemon wedges", "lime", "limes", "lemon", "orange juice", "sour orange juice", "navel orange", "orange", "oranges"], category: "fruit", ...NONE },
  { id: "berries-stonefruit", keywords: ["mixed berries", "frozen berries", "frozen strawberries", "berry", "berries", "strawberry", "blueberry", "raspberry", "pomegranate molasses"], category: "fruit", ...NONE },
  { id: "banana-apple-pineapple", keywords: ["banana", "bananas", "apple juice", "apple", "apples", "pineapple", "mango", "frozen pineapple", "asian pear"], category: "fruit", ...NONE },

  // ---------------- NUTS / SEEDS ----------------
  { id: "peanut-butter", keywords: ["peanut butter", "crushed roasted peanuts", "peanuts"], category: "peanut", ...NONE, peanuts: true, crossContaminationRisk: "Processed on shared equipment with tree nuts at many facilities." },
  { id: "almond", keywords: ["almond butter", "almond milk", "almond"], category: "tree_nut", ...NONE, treeNuts: true },
  { id: "pine-nuts-other-nuts", keywords: ["pine nuts"], category: "tree_nut", ...NONE, treeNuts: true },
  { id: "chia-seeds", keywords: ["chia seeds"], category: "seed", ...NONE },

  // ---------------- ALCOHOL ----------------
  { id: "beer", keywords: ["beer can", "beer"], category: "beverage_alcohol", ...NONE, gluten: true, alcohol: true, substitutions: { gluten: "Use a certified gluten-free beer or non-alcoholic broth instead.", alcohol: "Substitute non-alcoholic beer or broth." } },
  { id: "wine", keywords: ["dry red wine", "dry white wine", "bourbon", "red wine vinaigrette", "dry sherry", "cooking sherry", "sherry"], category: "beverage_alcohol", ...NONE, alcohol: true, substitutions: { alcohol: "Substitute broth plus a splash of vinegar for the acidity." } },

  // ---------------- MISC / DAIRY-ADJACENT ----------------
  { id: "vanilla-extract", keywords: ["vanilla extract"], category: "other", ...NONE, alcohol: true, crossContaminationRisk: "Pure vanilla extract is alcohol-based (very small quantity per serving)." },
  { id: "cocoa-powder", keywords: ["unsweetened cocoa powder", "cocoa powder"], category: "other", ...NONE },
  { id: "cornbread-cornmeal", keywords: ["cornmeal"], category: "grain_gluten_free", ...NONE },
  { id: "protein-powder", keywords: ["protein powder", "whey protein", "whey protein isolate", "casein protein", "greek yogurt or protein powder"], category: "dairy", ...NONE, dairy: true, crossContaminationRisk: "Whey-based protein powders contain dairy; verify the specific product if a plant-based/vegan protein powder is intended instead.", substitutions: { dairy: "Use a plant-based (pea/soy/rice) protein powder." } },
  // Explicitly plant-sourced protein powders are NOT dairy — must outrank the generic
  // "protein powder" keyword above via longer keyword length, not assumed safe by default.
  { id: "soy-protein-powder", keywords: ["soy protein powder", "soy protein isolate"], category: "legume", ...NONE, soy: true },
  { id: "plant-protein-powder", keywords: ["plant protein powder", "plant-based protein powder", "pea protein powder", "pea protein isolate", "pea protein", "rice protein powder", "vegan protein powder", "hemp protein powder", "pumpkin seed protein powder", "brown rice protein powder"], category: "other", ...NONE },
  { id: "coconut-water", keywords: ["coconut water"], category: "beverage_alcohol", ...NONE },
  { id: "ice-water", keywords: ["ice", "water", "warm water"], category: "other", ...NONE },
  { id: "coffee", keywords: ["cold brew coffee", "brewed coffee", "black coffee", "espresso", "coffee"], category: "beverage_alcohol", ...NONE },
  { id: "mirin-tamarind", keywords: ["mirin"], category: "beverage_alcohol", ...NONE, alcohol: true, gluten: false },
  { id: "tamarind", keywords: ["tamarind paste", "preserved lemon"], category: "other", ...NONE },
  { id: "horseradish", keywords: ["prepared horseradish", "horseradish"], category: "sauce_condiment", ...NONE },

  // ---------------- GELATIN (animal-derived unless a plant source is named) ----------------
  // Conventional gelatin is rendered from animal collagen — usually pork or beef, but the
  // specific source is rarely stated on a recipe ingredient line. Defaulting to `pork: true`
  // mirrors the existing conservative default already used for unlabeled "sausage".
  { id: "gelatin", keywords: ["unflavored gelatin", "gelatin powder", "gelatin", "gelatine"], category: "other", ...NONE, meat: true, pork: true, crossContaminationRisk: "Conventional gelatin is animal-derived collagen (commonly pork or beef); the specific source is rarely stated on packaging — verify the brand if pork status must be confirmed.", substitutions: { pork: "Use a beef, fish, or plant-based (agar-agar) gelatin substitute confirmed non-pork." } },
  { id: "beef-gelatin", keywords: ["beef gelatin", "bovine gelatin"], category: "other", ...NONE, meat: true },
  { id: "fish-gelatin", keywords: ["fish gelatin"], category: "other", ...NONE, meat: true, fish: true },
  { id: "plant-gelatin", keywords: ["vegan gelatin", "agar agar", "agar-agar", "agar powder", "pectin"], category: "other", ...NONE },

  // ---------------- POULTRY-BASED PROCESSED MEAT (explicit, non-pork by name) ----------------
  // These must be matched as their own compound keywords rather than relying on the shorter
  // generic "chicken"/"turkey" or "bacon"/"sausage" keywords to coincidentally win on length —
  // that was fragile (a tie or a shorter match could silently flip the result).
  { id: "poultry-processed-meat", keywords: ["turkey bacon", "chicken bacon", "beef bacon", "turkey sausage", "chicken sausage", "turkey pepperoni", "turkey ham", "turkey chorizo", "chicken chorizo", "turkey kielbasa", "chicken andouille"], category: "processed_meat", ...NONE, meat: true, pork: false, crossContaminationRisk: "Poultry/beef-based alternative — confirm the specific product to rule out pork-derived casings or fillers if strict." },

  // ---------------- ADDITIONAL PROTEINS (expanded pass) ----------------
  { id: "beef-cuts-2", keywords: ["boneless short rib", "picanha roast", "cube steak", "round steak", "rotisserie chickens", "whole chickens"], category: "beef", ...NONE, meat: true },
  { id: "cured-pork-2", keywords: ["prosciutto di parma", "sliced prosciutto", "prosciutto", "pancetta", "bratwurst", "smoked kielbasa", "kielbasa links", "kielbasa", "portuguese linguica", "linguica", "scrapple loaf", "scrapple", "black pudding", "cube of pork", "mexican-style chorizo"], category: "processed_meat", ...NONE, meat: true, pork: true },

  // ---------------- ADDITIONAL SAUCES / HIDDEN ALLERGENS (expanded pass) ----------------
  { id: "doenjang-ssamjang", keywords: ["doenjang", "ssamjang"], category: "sauce_condiment", ...NONE, gluten: true, soy: true },
  { id: "shoyu-kecap", keywords: ["shoyu", "kecap manis"], category: "sauce_condiment", ...NONE, gluten: true, soy: true, substitutions: { gluten: "Use tamari or a certified gluten-free soy sauce alternative." } },
  { id: "nam-pla", keywords: ["nam pla"], category: "sauce_condiment", ...NONE, fish: true },
  { id: "laksa-paste", keywords: ["laksa paste"], category: "sauce_condiment", ...NONE, shellfish: true, crossContaminationRisk: "Traditional laksa/curry pastes commonly include shrimp paste — treated as shellfish-containing unless a shrimp-free brand is specified." },
  { id: "crushed-soybeans", keywords: ["crushed roasted soybeans", "roasted soybeans"], category: "legume", ...NONE, soy: true },
  { id: "sambal-chili-paste", keywords: ["sambal oelek", "calabrian chili paste", "harissa", "gochujang", "piri-piri sauce", "piri piri sauce"], category: "sauce_condiment", ...NONE },
  { id: "roasted-red-peppers", keywords: ["roasted red peppers"], category: "vegetable", ...NONE },
  { id: "buffalo-sauce", keywords: ["buffalo sauce"], category: "sauce_condiment", ...NONE, dairy: true, crossContaminationRisk: "Classic buffalo sauce is butter-based — treated as dairy-containing unless a dairy-free brand is specified.", substitutions: { dairy: "Use a dairy-free buffalo sauce made with plant-based butter." } },
  { id: "thousand-island-crema", keywords: ["thousand island dressing", "chipotle crema"], category: "sauce_condiment", ...NONE, egg: true, dairy: true },
  { id: "pesto", keywords: ["basil pesto", "sun-dried tomato pesto", "pesto"], category: "sauce_condiment", ...NONE, dairy: true, treeNuts: true, crossContaminationRisk: "Traditional pesto contains Parmesan (dairy) and pine nuts (tree nut).", substitutions: { treeNuts: "Use a nut-free pesto made with pepitas or sunflower seeds instead of pine nuts." } },
  { id: "kitchen-bouquet-browning", keywords: ["kitchen bouquet"], category: "sauce_condiment", ...NONE, gluten: true, substitutions: { gluten: "Use a certified gluten-free browning/seasoning sauce." } },
  { id: "cranberry-fig-fruit-sauce", keywords: ["cranberry sauce", "fig jam", "balsamic glaze", "saba balsamic syrup"], category: "sauce_condiment", ...NONE },
  { id: "mint-chutney", keywords: ["mint-coriander chutney"], category: "sauce_condiment", ...NONE },
  { id: "green-enchilada-roasted-chile", keywords: ["green enchilada sauce", "roasted green chile sauce"], category: "sauce_condiment", ...NONE },
  { id: "bbq-rub", keywords: ["bbq rub", "barbecue rub"], category: "spice_herb_aromatic", ...NONE, gluten: true, crossContaminationRisk: "Pre-made rubs frequently include wheat-derived anti-caking agents — treated as gluten-containing unless a certified gluten-free rub is specified.", substitutions: { gluten: "Use a certified gluten-free rub or build your own from confirmed gluten-free spices." } },
  { id: "modified-food-starch", keywords: ["modified food starch"], category: "other", ...NONE, gluten: false, crossContaminationRisk: "In the U.S., FDA labeling rules require wheat-derived starch to be declared as 'wheat' — unqualified 'modified food starch' is treated as corn-derived and gluten-free, but always verify the label if serving someone with celiac disease." },
  { id: "pickle-relish-brine", keywords: ["dill pickle relish", "pickle brine", "dill pickle spears", "pickles", "cornichons", "giardiniera relish", "giardiniera"], category: "vegetable", ...NONE },

  // ---------------- ADDITIONAL GRAINS / BAKED GOODS (expanded pass) ----------------
  { id: "crackers-crusts-pastry", keywords: ["crackers assortment", "pie crust or puff pastry", "pie crust", "puff pastry", "croutons", "focaccia loaves", "focaccia", "flatbread", "grilled pita wedges", "pita or flatbread", "whole-wheat pita", "brioche or challah", "hawaiian sweet rolls", "packages hawaiian sweet rolls", "large refrigerated biscuits", "8-count crescent roll tubes", "crescent roll", "24-count slider roll package", "slider roll", "soft pretzel bites", "pretzel dough", "pretzel", "wonton wrappers", "cornbread", "crusty rolls", "baguettes"], category: "grain_gluten", ...NONE, gluten: true, substitutions: { gluten: "Use a certified gluten-free bread/crust/wrapper alternative." } },
  { id: "pasta-additional", keywords: ["ziti or rigatoni", "ziti", "rigatoni", "lasagna noodles", "whole-wheat linguine", "toasted vermicelli noodles", "couscous, dry", "couscous", "shelf-stable gnocchi", "gnocchi"], category: "grain_gluten", ...NONE, gluten: true, substitutions: { gluten: "Use a certified gluten-free pasta/noodle alternative." } },
  { id: "grits-polenta-masa", keywords: ["stone-ground grits", "grits", "polenta", "masa harina", "crushed totopos"], category: "grain_gluten_free", ...NONE },
  { id: "frozen-fries-tots", keywords: ["frozen straight-cut fries", "frozen diner fries", "frozen crinkle or diner fries", "frozen crinkle fries", "frozen steak fries", "frozen tater tots"], category: "grain_gluten", ...NONE, gluten: true, crossContaminationRisk: "Many packaged frozen fries/tots use a wheat-starch or batter coating for crispness — treated as gluten-containing unless a certified gluten-free brand is specified.", substitutions: { gluten: "Use a certified gluten-free frozen fry/tot brand, or fresh-cut potatoes." } },
  { id: "granola", keywords: ["chopped nuts or granola", "granola"], category: "grain_gluten", ...NONE, gluten: true, crossContaminationRisk: "Granola is oat-based and commonly cross-contaminated with wheat, and may also contain tree nuts — verify the specific product." },
  { id: "dark-lager-beer-2", keywords: ["dark lager or brewed coffee", "dark lager"], category: "beverage_alcohol", ...NONE, gluten: true, alcohol: true, substitutions: { gluten: "Use a certified gluten-free beer or brewed coffee instead.", alcohol: "Substitute brewed coffee or broth." } },

  // ---------------- ADDITIONAL DAIRY (expanded pass) ----------------
  { id: "swiss-gruyere-brie", keywords: ["shredded swiss", "gruyere", "gruyère", "brie wheel", "brie", "labneh"], category: "dairy", ...NONE, dairy: true },
  { id: "coconut-cream", keywords: ["coconut cream", "shredded coconut"], category: "other", ...NONE },

  // ---------------- ADDITIONAL NUTS / SEEDS (expanded pass) ----------------
  { id: "pecans-pistachios", keywords: ["chopped pecans", "pecans", "pistachios", "pomegranate seeds"], category: "tree_nut", ...NONE, treeNuts: true },
  // Food-safety gap fix: walnut, cashew, hazelnut, macadamia, and Brazil nut were completely
  // absent from the ingredient database (an ingredient like "chopped walnuts" resolved to
  // NOTHING and only reflected whatever happened to be in an accompanying `notes` string) —
  // a critical hole for the nut-free filter specifically, since these are common tree-nut
  // allergens. See scripts/dietary-qa-test-cases.ts for the regression test.
  { id: "walnuts", keywords: ["chopped walnuts", "candied walnuts", "walnut", "walnuts"], category: "tree_nut", ...NONE, treeNuts: true },
  { id: "cashews", keywords: ["cashew butter", "cashew milk", "cashews", "cashew"], category: "tree_nut", ...NONE, treeNuts: true },
  { id: "hazelnuts", keywords: ["hazelnut spread", "hazelnuts", "hazelnut", "filberts"], category: "tree_nut", ...NONE, treeNuts: true },
  { id: "macadamia-brazil-nuts", keywords: ["macadamia nuts", "macadamia", "brazil nuts", "brazil nut"], category: "tree_nut", ...NONE, treeNuts: true },
  { id: "sesame-dressing-zaatar", keywords: ["sesame dressing", "za'atar spice blend", "za'atar", "zaatar"], category: "seed", ...NONE, sesame: true },

  // ---------------- ADDITIONAL ALCOHOL (expanded pass) ----------------
  { id: "vermouth-wine-2", keywords: ["dry vermouth", "riesling wine", "riesling", "prosecco reduction", "prosecco", "shaoxing wine", "sake", "dry marsala wine", "marsala wine", "red wine"], category: "beverage_alcohol", ...NONE, alcohol: true, substitutions: { alcohol: "Substitute broth plus a splash of vinegar for the acidity." } },

  // ---------------- ADDITIONAL VEGETABLES / AROMATICS / FRUIT (expanded pass) ----------------
  { id: "bay-leaves", keywords: ["bay leaves", "bay leaf"], category: "spice_herb_aromatic", ...NONE },
  { id: "caraway-fennel-seed", keywords: ["caraway seeds", "ground fennel seed", "fennel pollen", "fennel bulb", "star anise", "ground cloves", "black peppercorns", "whole black peppercorns", "sichuan peppercorns", "urfa biber", "sumac", "fenugreek leaves", "caribbean-style curry powder", "saffron threads", "annatto seeds", "recado rojo paste"], category: "spice_herb_aromatic", ...NONE },
  { id: "frozen-peas", keywords: ["frozen peas", "snap peas", "black-eyed peas"], category: "vegetable", ...NONE },
  { id: "cedar-plank", keywords: ["cedar plank", "cedar grilling planks", "foil"], category: "other", ...NONE },
  { id: "jalapeno-2", keywords: ["fresh jalapeño peppers", "fresh jalapeños, thin sliced", "jalapeño slices", "long hot peppers", "long green peppers", "cubanelle peppers", "shishito peppers", "thai bird chilies", "dried thai chilies", "thai or serrano chilies", "thai or serrano chili", "scotch bonnet peppers", "red chilies"], category: "vegetable", ...NONE },
  { id: "fresh-herbs-2", keywords: ["fresh tarragon", "fresh sage", "fresh chives", "cup chopped chives or parsley", "mint-coriander", "mint", "shiso leaves", "lemongrass stalks", "galangal", "epazote leaves", "epazote", "dried rosemary"], category: "spice_herb_aromatic", ...NONE },
  { id: "fennel-cabbage-radish", keywords: ["watermelon radish", "brussels sprouts", "red cabbage", "shredded cabbage", "baby bok choy", "jicama sticks", "jicama"], category: "vegetable", ...NONE },
  { id: "artichoke-marinated", keywords: ["marinated artichoke hearts, drained", "marinated artichoke hearts"], category: "vegetable", ...NONE },
  { id: "nori-seaweed", keywords: ["nori sheets", "nori"], category: "vegetable", ...NONE },
  { id: "fruit-2", keywords: ["ripe peaches", "peach nectar", "grapes", "raisins", "golden raisins", "dried apricots", "frozen blueberries", "fresh lemons", "lemons", "tomato"], category: "fruit", ...NONE },
  { id: "tamarind-concentrate", keywords: ["tamarind concentrate"], category: "other", ...NONE },
  { id: "yuzu-kosho", keywords: ["yuzu kosho"], category: "other", ...NONE },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Finds the best (longest keyword match) dietary profile for a free-text
 * ingredient name/notes string. Returns null if no profile matches — callers
 * MUST treat a null match as "unknown ingredient" (conservative: cannot
 * confirm any allergen-free claim) per the food-safety mandate of this system.
 */
function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Bare/unqualified words that are genuinely ambiguous about their animal-protein source
// (e.g. "stock"/"broth" could be chicken, beef, pork, fish, or vegetable). These are
// intentionally NOT included as standalone keywords on any profile above — but a compound
// ingredient phrase like "water or broth" or "2 cups stock, any kind" can still slip through
// if a DIFFERENT, unrelated keyword in the same string (e.g. "water") happens to win the
// longest-match race, silently discarding the ambiguous alternative. This guard re-scans the
// full text for a bare marker word; if one is present and the winning match isn't one of the
// specific profiles that legitimately accounts for it (e.g. "chicken stock" -> chicken-stock),
// the whole ingredient is forced to unknown rather than resolving via the unrelated match.
const AMBIGUOUS_SOURCE_MARKERS = ["stock", "broth", "bouillon"];
const MARKER_COVERING_PROFILE_IDS = new Set([
  "chicken-stock",
  "beef-stock",
  "pork-ham-stock",
  "fish-shellfish-stock",
  "vegetable-stock",
]);

const MERGEABLE_FLAG_KEYS = [
  "gluten",
  "dairy",
  "egg",
  "soy",
  "treeNuts",
  "peanuts",
  "shellfish",
  "fish",
  "sesame",
  "pork",
  "alcohol",
  "meat",
] as const;

function mergeSubstitutions(
  profiles: IngredientDietaryProfile[],
): IngredientDietaryProfile["substitutions"] {
  let merged: IngredientDietaryProfile["substitutions"];
  for (const p of profiles) {
    if (!p.substitutions) continue;
    for (const [key, note] of Object.entries(p.substitutions)) {
      if (!merged) merged = {};
      if (!(merged as Record<string, string>)[key]) {
        (merged as Record<string, string>)[key] = note as string;
      }
    }
  }
  return merged;
}

/**
 * Finds every matched dietary profile within a free-text ingredient name/notes string using a
 * greedy, longest-match-first, NON-OVERLAPPING segmentation (repeatedly consume the single
 * longest remaining keyword match, mask it out, and continue on what's left). Then returns a
 * single merged profile whose boolean allergen/meat flags are the UNION (logical OR) of every
 * distinct component actually found.
 *
 * This matters because a single ingredient line frequently names more than one real food
 * component — e.g. "Jalapeño Cheddar Sausage Links" contains a produce garnish (jalapeño), a
 * dairy cheese (cheddar), AND pork meat (sausage). Picking only the single overall-longest
 * keyword (as a naive "best match wins" approach would) silently discards the other two,
 * which previously let a pork sausage ingredient resolve to the produce-only "jalapeno" profile
 * and incorrectly pass as vegetarian/vegan/pork-free/dairy-free.
 *
 * Consuming the longest match first (rather than unioning every substring hit independently)
 * is what keeps compound-but-singular phrases like "butter beans" correct: the longer, more
 * specific "butter beans" keyword swallows the entire phrase in one pass, so the shorter,
 * unrelated "butter" (dairy) keyword never gets a chance to match a now-masked span.
 *
 * Returns null if NO component of the ingredient resolves to a known profile — callers MUST
 * treat a null match as "unknown ingredient" (conservative: cannot confirm any allergen-free
 * claim) per the food-safety mandate of this system.
 */
export function findDietaryProfile(text: string): IngredientDietaryProfile | null {
  const normalized = stripDiacritics(text.toLowerCase()).replace(/[^a-z0-9\s,-]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  let working = normalized;
  const matches: Array<{ profile: IngredientDietaryProfile; keywordLength: number }> = [];

  // Bounded — a well-formed ingredient line has only a handful of distinct food components.
  for (let iteration = 0; iteration < 12; iteration++) {
    let bestProfile: IngredientDietaryProfile | null = null;
    let bestKeywordLength = 0;
    let bestIndex = -1;
    let bestSpanLength = 0;

    for (const profile of INGREDIENT_DIETARY_PROFILES) {
      for (const kw of profile.keywords) {
        const kwNormalized = stripDiacritics(kw.toLowerCase())
          .replace(/[^a-z0-9\s,-]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        // Allow a trailing "s"/"es" so a single keyword also matches its plural form
        // (e.g. "cedar plank" -> "cedar planks", "slider roll" -> "slider rolls")
        // without requiring every entry to manually enumerate both forms.
        const re = new RegExp(`\\b${escapeRegex(kwNormalized)}(?:es|s)?\\b`, "i");
        const match = re.exec(working);
        if (match && kw.length > bestKeywordLength) {
          bestProfile = profile;
          bestKeywordLength = kw.length;
          bestIndex = match.index;
          bestSpanLength = match[0].length;
        }
      }
    }

    if (!bestProfile || bestIndex < 0) break;
    matches.push({ profile: bestProfile, keywordLength: bestKeywordLength });
    // Mask out the matched span (preserve string length/indices) so a shorter keyword fully
    // contained in — or overlapping — an already-consumed span cannot re-match it.
    working = working.slice(0, bestIndex) + " ".repeat(bestSpanLength) + working.slice(bestIndex + bestSpanLength);
  }

  if (matches.length === 0) return null;

  for (const marker of AMBIGUOUS_SOURCE_MARKERS) {
    const markerRe = new RegExp(`\\b${marker}(?:es|s)?\\b`, "i");
    if (markerRe.test(normalized) && !matches.some((m) => MARKER_COVERING_PROFILE_IDS.has(m.profile.id))) {
      return null;
    }
  }

  // The single longest overall match is used for id/category/crossContaminationRisk — purely
  // informational/cosmetic fields — while the boolean safety flags below are the union of ALL
  // distinct matched components.
  let primary = matches[0];
  for (const m of matches) {
    if (m.keywordLength > primary.keywordLength) primary = m;
  }
  if (matches.length === 1) return primary.profile;

  const merged: IngredientDietaryProfile = { ...primary.profile };
  for (const key of MERGEABLE_FLAG_KEYS) {
    (merged as unknown as Record<string, boolean>)[key] = matches.some(
      (m) => (m.profile as unknown as Record<string, boolean>)[key],
    );
  }
  merged.substitutions = mergeSubstitutions(matches.map((m) => m.profile));

  return merged;
}
