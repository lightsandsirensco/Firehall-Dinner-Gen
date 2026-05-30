/**
 * Ingredient nutrition profiles for hall-scale recipes.
 * Values are per 100g edible portion unless unitGrams overrides a unit.
 */
export interface IngredientNutritionProfile {
  keywords: string[];
  /** Calories per 100g */
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Grams per named unit (lb, oz, cup, tbsp, tsp, count, can, clove, large, etc.) */
  unitGrams?: Record<string, number>;
}

/** Sorted longest-keyword-first at lookup time. */
export const INGREDIENT_NUTRITION_PROFILES: IngredientNutritionProfile[] = [
  { keywords: ["ground beef", "beef chuck", "stew beef", "beef sirloin", "beef brisket", "beef short rib", "brisket point", "packer brisket", "brisket", "chuck", "burnt ends"], calories: 250, protein: 26, carbs: 0, fat: 17, unitGrams: { lb: 454, oz: 28, count: 113 } },
  { keywords: ["ground turkey", "turkey breast", "turkey thigh", "turkey sausage"], calories: 170, protein: 22, carbs: 0, fat: 8, unitGrams: { lb: 454, oz: 28 } },
  { keywords: ["chicken breast", "chicken thigh", "chicken drumstick", "rotisserie chicken", "shredded chicken", "whole chicken", "bone-in thighs", "bone-in chicken"], calories: 165, protein: 31, carbs: 0, fat: 3.6, unitGrams: { lb: 454, oz: 28 } },
  { keywords: ["breakfast sausage", "italian sausage", "pork sausage", "chorizo", "sausage"], calories: 301, protein: 12, carbs: 2, fat: 27, unitGrams: { lb: 454, oz: 28 } },
  { keywords: ["bacon"], calories: 541, protein: 37, carbs: 1.4, fat: 42, unitGrams: { lb: 454, oz: 28, slice: 8 } },
  { keywords: ["pork shoulder", "pork butt", "pulled pork", "pork chop", "pork tenderloin", "pork loin"], calories: 242, protein: 27, carbs: 0, fat: 14, unitGrams: { lb: 454, oz: 28, slice: 8 } },
  { keywords: ["salmon fillet", "salmon", "cod", "tilapia", "shrimp", "white fish"], calories: 206, protein: 22, carbs: 0, fat: 12, unitGrams: { lb: 454, oz: 28 } },
  { keywords: ["egg", "eggs", "large eggs"], calories: 143, protein: 13, carbs: 0.7, fat: 10, unitGrams: { count: 50, large: 50, medium: 44, egg: 50, eggs: 50 } },
  { keywords: ["flour tortilla", "flour tortillas", "tortilla", "tortillas", "wrap"], calories: 312, protein: 8, carbs: 52, fat: 8, unitGrams: { count: 45, tortilla: 45 } },
  { keywords: ["corn tortilla"], calories: 218, protein: 5, carbs: 45, fat: 2.8, unitGrams: { count: 30 } },
  { keywords: ["brioche bun", "hamburger bun", "burger bun", "hot dog bun", "bun", "buns", "slider bun"], calories: 280, protein: 9, carbs: 49, fat: 5, unitGrams: { count: 55, bun: 55 } },
  { keywords: ["jasmine rice", "white rice", "long grain rice", "basmati rice", "rice uncooked", "rice, uncooked"], calories: 360, protein: 7, carbs: 80, fat: 0.6, unitGrams: { cup: 185, lb: 454 } },
  { keywords: ["brown rice", "wild rice"], calories: 360, protein: 8, carbs: 76, fat: 2.7, unitGrams: { cup: 190 } },
  { keywords: ["pasta", "spaghetti", "penne", "macaroni", "egg noodles"], calories: 371, protein: 13, carbs: 75, fat: 1.5, unitGrams: { lb: 454, oz: 28, cup: 100 } },
  { keywords: ["potato", "potatoes", "russet potato", "yukon potato", "hash brown", "hash browns", "frozen hash browns"], calories: 77, protein: 2, carbs: 17, fat: 0.1, unitGrams: { lb: 454, oz: 28, count: 170, medium: 170, large: 280 } },
  { keywords: ["sweet potato"], calories: 86, protein: 1.6, carbs: 20, fat: 0.1, unitGrams: { lb: 454, count: 130 } },
  { keywords: ["onion", "yellow onion", "red onion", "white onion"], calories: 40, protein: 1.1, carbs: 9, fat: 0.1, unitGrams: { count: 150, large: 150, medium: 110, lb: 454, cup: 160 } },
  { keywords: ["bell pepper", "bell peppers", "pepper diced"], calories: 31, protein: 1, carbs: 6, fat: 0.3, unitGrams: { count: 120, cup: 150, lb: 454 } },
  { keywords: ["garlic", "garlic clove", "garlic cloves"], calories: 149, protein: 6.4, carbs: 33, fat: 0.5, unitGrams: { clove: 3, cloves: 3, tbsp: 9, tsp: 3 } },
  { keywords: ["kidney bean", "black bean", "pinto bean", "cannellini", "chickpea", "garbanzo", "beans drained", "beans, drained"], calories: 127, protein: 8.7, carbs: 23, fat: 0.5, unitGrams: { can: 250, cans: 250, cup: 170, lb: 454 } },
  { keywords: ["crushed tomato", "diced tomato", "tomato sauce", "marinara", "tomatoes canned", "san marzano"], calories: 32, protein: 1.4, carbs: 7, fat: 0.2, unitGrams: { can: 400, cans: 400, cup: 240, oz: 28 } },
  { keywords: ["tomato paste"], calories: 82, protein: 4.3, carbs: 19, fat: 0.5, unitGrams: { tbsp: 16, oz: 28, can: 170 } },
  { keywords: ["cheddar", "mozzarella", "pepper jack", "shredded cheese", "cheese shredded", "parmesan", "monterey jack", "swiss cheese"], calories: 403, protein: 25, carbs: 1.3, fat: 33, unitGrams: { cup: 113, oz: 28, lb: 454 } },
  { keywords: ["cream cheese", "sour cream"], calories: 342, protein: 6, carbs: 4, fat: 34, unitGrams: { cup: 230, oz: 28, block: 225 } },
  { keywords: ["butter", "unsalted butter"], calories: 717, protein: 0.9, carbs: 0.1, fat: 81, unitGrams: { tbsp: 14, tsp: 5, stick: 113, lb: 454, oz: 28, cup: 227 } },
  { keywords: ["olive oil", "vegetable oil", "canola oil", "cooking oil", "oil"], calories: 884, protein: 0, carbs: 0, fat: 100, unitGrams: { tbsp: 14, tsp: 5, cup: 218, oz: 28 } },
  { keywords: ["all-purpose flour", "flour"], calories: 364, protein: 10, carbs: 76, fat: 1, unitGrams: { cup: 125, lb: 454 } },
  { keywords: ["bread crumb", "breadcrumbs", "panko"], calories: 395, protein: 13, carbs: 72, fat: 5, unitGrams: { cup: 108 } },
  { keywords: ["sugar", "brown sugar"], calories: 387, protein: 0, carbs: 100, fat: 0, unitGrams: { cup: 200, tbsp: 12, tsp: 4 } },
  { keywords: ["honey", "maple syrup"], calories: 304, protein: 0.3, carbs: 82, fat: 0, unitGrams: { tbsp: 21, cup: 340 } },
  { keywords: ["milk", "whole milk", "2% milk"], calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, unitGrams: { cup: 244, oz: 28 } },
  { keywords: ["heavy cream", "whipping cream"], calories: 340, protein: 2, carbs: 3, fat: 36, unitGrams: { cup: 238, oz: 28 } },
  { keywords: ["greek yogurt", "plain yogurt", "yogurt"], calories: 97, protein: 9, carbs: 4, fat: 5, unitGrams: { cup: 245, oz: 28 } },
  { keywords: ["protein powder", "whey protein"], calories: 400, protein: 80, carbs: 8, fat: 5, unitGrams: { scoop: 30, tbsp: 15 } },
  { keywords: ["banana", "bananas"], calories: 89, protein: 1.1, carbs: 23, fat: 0.3, unitGrams: { count: 120, medium: 118, large: 136 } },
  { keywords: ["berry", "berries", "mixed berries", "strawberry", "blueberry", "raspberry", "frozen berries"], calories: 57, protein: 0.7, carbs: 14, fat: 0.3, unitGrams: { cup: 150, lb: 454 } },
  { keywords: ["spinach", "kale", "mixed greens", "romaine", "lettuce", "arugula"], calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, unitGrams: { cup: 30, oz: 28, lb: 454, bunch: 200 } },
  { keywords: ["broccoli", "cauliflower", "green bean", "asparagus", "zucchini", "carrot", "carrots"], calories: 35, protein: 2.4, carbs: 7, fat: 0.4, unitGrams: { cup: 90, lb: 454, count: 60 } },
  { keywords: ["corn", "corn kernel", "frozen corn"], calories: 86, protein: 3.3, carbs: 19, fat: 1.2, unitGrams: { cup: 165, can: 250 } },
  { keywords: ["avocado"], calories: 160, protein: 2, carbs: 9, fat: 15, unitGrams: { count: 150, medium: 150 } },
  { keywords: ["peanut butter", "almond butter"], calories: 588, protein: 25, carbs: 20, fat: 50, unitGrams: { tbsp: 16, cup: 258 } },
  { keywords: ["oats", "rolled oats", "oatmeal"], calories: 389, protein: 17, carbs: 66, fat: 7, unitGrams: { cup: 80, lb: 454 } },
  { keywords: ["pancake mix", "bisquick", "waffle mix"], calories: 350, protein: 8, carbs: 70, fat: 4, unitGrams: { cup: 120 } },
  { keywords: ["bread", "sourdough", "ciabatta", "baguette", "english muffin"], calories: 265, protein: 9, carbs: 49, fat: 3.2, unitGrams: { slice: 30, count: 30, loaf: 450 } },
  { keywords: ["ham", "deli ham", "canadian bacon"], calories: 145, protein: 21, carbs: 1.5, fat: 6, unitGrams: { lb: 454, oz: 28, slice: 28 } },
  { keywords: ["pepperoni", "salami"], calories: 494, protein: 22, carbs: 1, fat: 44, unitGrams: { oz: 28, slice: 2, cup: 110 } },
  { keywords: ["pizza dough", "pizza crust"], calories: 266, protein: 8, carbs: 50, fat: 2.5, unitGrams: { lb: 454, ball: 280, oz: 28 } },
  { keywords: ["pizza sauce"], calories: 40, protein: 1.5, carbs: 8, fat: 0.2, unitGrams: { cup: 240, oz: 28 } },
  { keywords: ["bbq sauce", "barbecue sauce"], calories: 172, protein: 0.8, carbs: 41, fat: 0.6, unitGrams: { cup: 280, tbsp: 17, oz: 28 } },
  { keywords: ["hot sauce", "salsa", "pico de gallo"], calories: 36, protein: 1.5, carbs: 7, fat: 0.2, unitGrams: { cup: 240, tbsp: 15, oz: 28 } },
  { keywords: ["soy sauce", "fish sauce", "worcestershire"], calories: 53, protein: 8, carbs: 4.9, fat: 0.1, unitGrams: { tbsp: 18, tsp: 6, cup: 255 } },
  { keywords: ["chicken stock", "beef stock", "broth", "stock"], calories: 15, protein: 1.2, carbs: 1, fat: 0.5, unitGrams: { cup: 240, quart: 960, oz: 28 } },
  { keywords: ["orange", "navel orange", "oranges", "navel oranges"], calories: 47, protein: 0.9, carbs: 12, fat: 0.1, unitGrams: { count: 140, large: 180, medium: 130 } },
  { keywords: ["ginger", "fresh ginger"], calories: 80, protein: 1.8, carbs: 18, fat: 0.8, unitGrams: { tbsp: 6, tsp: 2, oz: 28 } },
  { keywords: ["coconut water"], calories: 19, protein: 0.7, carbs: 4, fat: 0.2, unitGrams: { cup: 240 } },
  { keywords: ["lentil", "lentils"], calories: 116, protein: 9, carbs: 20, fat: 0.4, unitGrams: { cup: 200, lb: 454 } },
  { keywords: ["quinoa"], calories: 368, protein: 14, carbs: 64, fat: 6, unitGrams: { cup: 170, lb: 454 } },
  { keywords: ["mushroom", "mushrooms"], calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, unitGrams: { cup: 70, lb: 454, oz: 28 } },
  { keywords: ["celery"], calories: 16, protein: 0.7, carbs: 3, fat: 0.2, unitGrams: { stalk: 40, cup: 100 } },
  { keywords: ["lime juice", "lemon juice"], calories: 25, protein: 0.4, carbs: 8, fat: 0.1, unitGrams: { tbsp: 15, cup: 240 } },
  { keywords: ["lime", "lemon"], calories: 30, protein: 0.7, carbs: 10, fat: 0.2, unitGrams: { count: 60, tbsp: 15 } },
  { keywords: ["pineapple", "mango", "frozen pineapple"], calories: 50, protein: 0.5, carbs: 13, fat: 0.1, unitGrams: { cup: 165, lb: 454 } },
  { keywords: ["apple", "apples"], calories: 52, protein: 0.3, carbs: 14, fat: 0.2, unitGrams: { count: 180, cup: 125 } },
  { keywords: ["cinnamon", "chili powder", "cumin", "paprika", "oregano", "seasoning", "spice blend", "taco seasoning"], calories: 250, protein: 10, carbs: 50, fat: 5, unitGrams: { tbsp: 8, tsp: 3, packet: 25 } },
  { keywords: ["salt", "pepper", "black pepper"], calories: 0, protein: 0, carbs: 0, fat: 0, unitGrams: { tsp: 5, tbsp: 15 } },
  { keywords: ["mayonnaise", "mayo", "aioli"], calories: 680, protein: 1, carbs: 0.6, fat: 75, unitGrams: { cup: 220, tbsp: 14 } },
  { keywords: ["mustard", "ketchup"], calories: 60, protein: 3, carbs: 5, fat: 3, unitGrams: { tbsp: 15, cup: 240 } },
  { keywords: ["mac and cheese", "elbow macaroni"], calories: 350, protein: 12, carbs: 48, fat: 12, unitGrams: { cup: 200, lb: 454 } },
  { keywords: ["steak", "ny strip", "ribeye", "sirloin", "flank steak", "skirt steak"], calories: 271, protein: 26, carbs: 0, fat: 18, unitGrams: { lb: 454, oz: 28 } },
  { keywords: ["tofu", "tempeh"], calories: 144, protein: 17, carbs: 3, fat: 9, unitGrams: { lb: 454, block: 350, oz: 28 } },
  { keywords: ["cottage cheese"], calories: 98, protein: 11, carbs: 3.4, fat: 4.3, unitGrams: { cup: 225 } },
  { keywords: ["almond milk", "oat milk"], calories: 30, protein: 1, carbs: 3, fat: 2.5, unitGrams: { cup: 240 } },
  { keywords: ["ice", "water", "beer can"], calories: 0, protein: 0, carbs: 0, fat: 0, unitGrams: { cup: 240 } },
];

export function findIngredientProfile(name: string): IngredientNutritionProfile | null {
  const normalized = name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  let best: IngredientNutritionProfile | null = null;
  let bestLen = 0;
  for (const profile of INGREDIENT_NUTRITION_PROFILES) {
    for (const kw of profile.keywords) {
      if (normalized.includes(kw) && kw.length > bestLen) {
        best = profile;
        bestLen = kw.length;
      }
    }
  }
  return best;
}
