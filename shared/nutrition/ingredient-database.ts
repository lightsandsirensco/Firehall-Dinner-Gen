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
  { keywords: ["ground beef", "beef chuck", "stew beef", "beef sirloin", "beef brisket", "beef short rib", "beef short ribs", "beef ribs", "plate style ribs", "brisket point", "packer brisket", "brisket", "chuck", "burnt ends", "beef shank", "beef eye round", "beef round"], calories: 250, protein: 26, carbs: 0, fat: 17, unitGrams: { lb: 454, oz: 28, count: 113 } },
  { keywords: ["ground turkey", "turkey breast", "turkey thigh", "turkey sausage", "turkey leg", "turkey legs", "whole turkey"], calories: 170, protein: 22, carbs: 0, fat: 8, unitGrams: { lb: 454, oz: 28, leg: 454 } },
  { keywords: ["ground chicken"], calories: 172, protein: 21, carbs: 0, fat: 9, unitGrams: { lb: 454, oz: 28 } },
  {
    keywords: ["boneless skinless chicken thighs", "boneless chicken thighs", "chicken thighs raw"],
    calories: 177,
    protein: 19.7,
    carbs: 0,
    fat: 10,
    unitGrams: { lb: 454, oz: 28, pieces: 113 },
  },
  { keywords: ["chicken breast", "chicken breasts", "boneless skinless chicken breasts", "chicken thigh", "chicken thighs", "bone-in chicken thighs", "chicken drumstick", "chicken quarters", "chicken leg quarters", "split chicken", "rotisserie chicken", "shredded chicken", "cooked shredded chicken", "whole chicken", "bone-in thighs", "bone-in chicken"], calories: 165, protein: 31, carbs: 0, fat: 3.6, unitGrams: { lb: 454, oz: 28, pieces: 113 } },
  { keywords: ["breakfast sausage", "italian sausage", "pork sausage", "kielbasa", "smoked kielbasa", "sausage"], calories: 325, protein: 18, carbs: 2, fat: 27, unitGrams: { lb: 454, oz: 28, link: 68, patty: 45 } },
  { keywords: ["chorizo"], calories: 455, protein: 24, carbs: 4, fat: 38, unitGrams: { lb: 454, oz: 28, link: 60 } },
  { keywords: ["ground pork"], calories: 297, protein: 26, carbs: 0, fat: 22, unitGrams: { lb: 454, oz: 28 } },
  { keywords: ["pork belly", "skinless pork belly"], calories: 518, protein: 9.3, carbs: 0, fat: 53, unitGrams: { lb: 454, oz: 28 } },
  { keywords: ["bacon"], calories: 541, protein: 37, carbs: 1.4, fat: 42, unitGrams: { lb: 454, oz: 28, slice: 8 } },
  { keywords: ["pork shoulder", "pork butt", "pulled pork", "pork chop", "pork chops", "pork tenderloin", "pork loin"], calories: 242, protein: 27, carbs: 0, fat: 14, unitGrams: { lb: 454, oz: 28, slice: 8 } },
  { keywords: ["salmon fillet", "salmon", "cod", "tilapia", "trout", "rainbow trout", "whole rainbow trout", "whole trout", "shrimp", "white fish"], calories: 206, protein: 22, carbs: 0, fat: 12, unitGrams: { lb: 454, oz: 28, pieces: 170, count: 170 } },
  { keywords: ["egg", "eggs", "large eggs"], calories: 143, protein: 13, carbs: 0.7, fat: 10, unitGrams: { count: 50, large: 50, medium: 44, egg: 50, eggs: 50 } },
  { keywords: ["flour tortilla", "flour tortillas", "tortilla", "tortillas", "wrap"], calories: 312, protein: 8, carbs: 52, fat: 8, unitGrams: { count: 45, tortilla: 45 } },
  { keywords: ["corn tortilla"], calories: 218, protein: 5, carbs: 45, fat: 2.8, unitGrams: { count: 30 } },
  { keywords: ["brioche bun", "hamburger bun", "burger bun", "hot dog bun", "bun", "buns", "slider bun"], calories: 280, protein: 9, carbs: 49, fat: 5, unitGrams: { count: 55, bun: 55 } },
  { keywords: ["jasmine rice", "white rice", "long grain rice", "basmati rice", "rice uncooked", "rice, uncooked"], calories: 360, protein: 7, carbs: 80, fat: 0.6, unitGrams: { cup: 185, lb: 454 } },
  { keywords: ["brown rice", "wild rice"], calories: 360, protein: 8, carbs: 76, fat: 2.7, unitGrams: { cup: 190 } },
  { keywords: ["dry elbow macaroni", "dry macaroni", "elbow macaroni dry", "pasta", "spaghetti", "penne", "macaroni", "egg noodles"], calories: 371, protein: 13, carbs: 75, fat: 1.5, unitGrams: { lb: 454, oz: 28, cup: 100 } },
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
  { keywords: ["broccoli", "broccolini", "cauliflower", "green bean", "asparagus", "zucchini", "carrot", "carrots"], calories: 35, protein: 2.4, carbs: 7, fat: 0.4, unitGrams: { cup: 90, lb: 454, count: 60, bunch: 200 } },
  { keywords: ["corn", "corn kernel", "frozen corn"], calories: 86, protein: 3.3, carbs: 19, fat: 1.2, unitGrams: { cup: 165, can: 250 } },
  { keywords: ["avocado"], calories: 160, protein: 2, carbs: 9, fat: 15, unitGrams: { count: 150, medium: 150 } },
  { keywords: ["peanut butter", "almond butter"], calories: 588, protein: 25, carbs: 20, fat: 50, unitGrams: { tbsp: 16, cup: 258 } },
  { keywords: ["oats", "rolled oats", "oatmeal"], calories: 389, protein: 17, carbs: 66, fat: 7, unitGrams: { cup: 80, lb: 454 } },
  { keywords: ["pancake mix", "bisquick", "waffle mix"], calories: 350, protein: 8, carbs: 70, fat: 4, unitGrams: { cup: 120 } },
  { keywords: ["bread", "sourdough", "ciabatta", "baguette", "english muffin", "brioche", "challah", "brioche bread", "brioche loaf"], calories: 265, protein: 9, carbs: 49, fat: 3.2, unitGrams: { slice: 30, count: 30, loaf: 450, loaves: 450 } },
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
  { keywords: ["cinnamon", "chili powder", "cumin", "paprika", "oregano", "seasoning", "spice blend", "taco seasoning", "turmeric", "garam masala", "ras el hanout"], calories: 250, protein: 10, carbs: 50, fat: 5, unitGrams: { tbsp: 8, tsp: 3, packet: 25 } },
  { keywords: ["salt", "pepper", "black pepper"], calories: 0, protein: 0, carbs: 0, fat: 0, unitGrams: { tsp: 5, tbsp: 15 } },
  { keywords: ["mayonnaise", "mayo", "aioli"], calories: 680, protein: 1, carbs: 0.6, fat: 75, unitGrams: { cup: 220, tbsp: 14 } },
  { keywords: ["mustard", "ketchup"], calories: 60, protein: 3, carbs: 5, fat: 3, unitGrams: { tbsp: 15, cup: 240 } },
  { keywords: ["prepared mac and cheese", "boxed mac and cheese", "mac and cheese cup"], calories: 350, protein: 12, carbs: 48, fat: 12, unitGrams: { cup: 200, lb: 454 } },
  { keywords: ["steak", "ny strip", "ribeye", "sirloin", "flank steak", "skirt steak", "tri-tip", "tri tip", "tri tip roast"], calories: 271, protein: 26, carbs: 0, fat: 18, unitGrams: { lb: 454, oz: 28 } },
  { keywords: ["trout", "rainbow trout", "grilled trout"], calories: 190, protein: 22, carbs: 0, fat: 10, unitGrams: { lb: 454, oz: 28 } },
  { keywords: ["tilapia", "ancho-tilapia"], calories: 128, protein: 26, carbs: 0, fat: 3, unitGrams: { lb: 454, oz: 28 } },
  { keywords: ["zucchini", "zucchini noodles", "zoodles"], calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3, unitGrams: { cup: 120, lb: 454 } },
  { keywords: ["tabbouleh", "bulgur wheat", "bulgur"], calories: 342, protein: 12, carbs: 76, fat: 1.3, unitGrams: { cup: 140, lb: 454 } },
  { keywords: ["tofu", "tempeh"], calories: 144, protein: 17, carbs: 3, fat: 9, unitGrams: { lb: 454, block: 350, oz: 28 } },
  { keywords: ["cottage cheese"], calories: 98, protein: 11, carbs: 3.4, fat: 4.3, unitGrams: { cup: 225 } },
  { keywords: ["almond milk", "oat milk"], calories: 30, protein: 1, carbs: 3, fat: 2.5, unitGrams: { cup: 240 } },
  { keywords: ["pearl barley", "barley"], calories: 354, protein: 12.5, carbs: 73.5, fat: 2.3, unitGrams: { cup: 200, lb: 454 } },
  { keywords: ["beef stew meat", "stew meat", "beef chuck", "chuck roast"], calories: 250, protein: 26, carbs: 0, fat: 17, unitGrams: { lb: 454, oz: 28 } },
  { keywords: ["ground lamb"], calories: 243, protein: 25, carbs: 0, fat: 16, unitGrams: { lb: 454, oz: 28 } },
  { keywords: ["spare ribs", "baby back ribs", "pork ribs", "st louis ribs", "rib racks", "pork spare ribs"], calories: 290, protein: 24, carbs: 0, fat: 21, unitGrams: { rack: 900, lb: 454, oz: 28 } },
  { keywords: ["baking powder"], calories: 53, protein: 0, carbs: 28, fat: 0, unitGrams: { tbsp: 14, tsp: 4 } },
  { keywords: ["feta cheese", "feta", "kalamata olives", "olives"], calories: 264, protein: 14, carbs: 4, fat: 21, unitGrams: { cup: 150, oz: 28 } },
  { keywords: ["cherry tomatoes", "grape tomatoes"], calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, unitGrams: { pint: 280, cup: 150 } },
  { keywords: ["ice", "water", "beer can"], calories: 0, protein: 0, carbs: 0, fat: 0, unitGrams: { cup: 240 } },
  { keywords: ["buttermilk biscuit", "biscuit"], calories: 320, protein: 7, carbs: 49, fat: 11, unitGrams: { large: 85, count: 70, lb: 454, oz: 28 } },
  { keywords: ["buttermilk"], calories: 40, protein: 3.3, carbs: 4.8, fat: 1, unitGrams: { cup: 245, oz: 28 } },
  { keywords: ["hoagie roll", "sub roll", "hero roll", "torpedo roll"], calories: 270, protein: 9, carbs: 50, fat: 3.5, unitGrams: { count: 140, roll: 140 } },
  { keywords: ["provolone"], calories: 351, protein: 26, carbs: 2, fat: 27, unitGrams: { cup: 113, oz: 28, slice: 28, lb: 454 } },
  { keywords: ["queso fresco", "cotija"], calories: 300, protein: 22, carbs: 2, fat: 22, unitGrams: { cup: 113, oz: 28, lb: 454 } },
  { keywords: ["cornstarch"], calories: 381, protein: 0.3, carbs: 91, fat: 0.1, unitGrams: { tbsp: 8, tsp: 3, cup: 128 } },
  { keywords: ["shallot", "shallots"], calories: 72, protein: 2.5, carbs: 17, fat: 0.1, unitGrams: { count: 25, tbsp: 10, lb: 454 } },
  { keywords: ["scallion", "green onion"], calories: 32, protein: 1.8, carbs: 7.3, fat: 0.2, unitGrams: { count: 15, cup: 100, bunch: 90 } },
  { keywords: ["ranch dressing", "ranch dip"], calories: 430, protein: 1, carbs: 5, fat: 45, unitGrams: { tbsp: 15, cup: 245 } },
  { keywords: ["tahini"], calories: 595, protein: 17, carbs: 21, fat: 53, unitGrams: { tbsp: 15, cup: 225 } },
  { keywords: ["oyster sauce", "hoisin sauce", "hoisin"], calories: 51, protein: 1.4, carbs: 11, fat: 0.3, unitGrams: { tbsp: 18, tsp: 6, cup: 255 } },
  { keywords: ["frozen peas", "green peas", "peas"], calories: 84, protein: 5.4, carbs: 15, fat: 0.4, unitGrams: { cup: 145, lb: 454 } },
  { keywords: ["english cucumber", "cucumber", "cucumbers"], calories: 15, protein: 0.65, carbs: 3.6, fat: 0.1, unitGrams: { cup: 120, count: 300, lb: 454 } },
  { keywords: ["guacamole"], calories: 150, protein: 2, carbs: 8.5, fat: 13, unitGrams: { cup: 230, tbsp: 15 } },
  { keywords: ["sesame seed", "sesame seeds", "toasted sesame seeds"], calories: 573, protein: 17.7, carbs: 23, fat: 49.7, unitGrams: { tbsp: 9, tsp: 3, cup: 144 } },
  { keywords: ["rice vinegar", "red wine vinegar", "white vinegar", "apple cider vinegar", "balsamic vinegar", "vinegar"], calories: 19, protein: 0, carbs: 0.4, fat: 0, unitGrams: { tbsp: 15, tsp: 5, cup: 240 } },
  { keywords: ["green cabbage", "red cabbage", "cabbage"], calories: 25, protein: 1.3, carbs: 5.8, fat: 0.1, unitGrams: { cup: 70, lb: 454, head: 900 } },
  { keywords: ["tzatziki"], calories: 90, protein: 4, carbs: 4, fat: 6, unitGrams: { cup: 245, tbsp: 15 } },
  { keywords: ["cherry tomatoes", "grape tomatoes", "roma tomato", "roma tomatoes", "tomato", "tomatoes"], calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, unitGrams: { count: 123, cup: 180, lb: 454 } },
  { keywords: ["rice noodles"], calories: 109, protein: 0.9, carbs: 25, fat: 0.2, unitGrams: { cup: 175, oz: 28, lb: 454 } },
  { keywords: ["rice"], calories: 360, protein: 7, carbs: 80, fat: 0.6, unitGrams: { cup: 185, lb: 454 } },
  { keywords: ["american cheese"], calories: 375, protein: 18, carbs: 9, fat: 31, unitGrams: { slice: 21, oz: 28, cup: 113 } },
  { keywords: ["caesar dressing"], calories: 480, protein: 2, carbs: 3, fat: 51, unitGrams: { tbsp: 15, cup: 235 } },
  { keywords: ["hummus"], calories: 166, protein: 8, carbs: 14, fat: 10, unitGrams: { cup: 246, tbsp: 15 } },
  { keywords: ["blue cheese", "crumbled blue cheese", "gorgonzola"], calories: 353, protein: 21, carbs: 2.3, fat: 29, unitGrams: { cup: 135, oz: 28 } },
  { keywords: ["smoked gouda", "gouda"], calories: 356, protein: 25, carbs: 2.2, fat: 27, unitGrams: { cup: 113, oz: 28, slice: 28 } },
  { keywords: ["cheese curds"], calories: 348, protein: 25, carbs: 2.5, fat: 27, unitGrams: { cup: 130, oz: 28 } },
  { keywords: ["molasses"], calories: 290, protein: 0, carbs: 75, fat: 0, unitGrams: { tbsp: 20, cup: 328 } },
  { keywords: ["teriyaki sauce", "teriyaki"], calories: 89, protein: 2.8, carbs: 18, fat: 0, unitGrams: { tbsp: 18, cup: 288 } },
  { keywords: ["gochujang"], calories: 220, protein: 5, carbs: 44, fat: 2, unitGrams: { tbsp: 20, cup: 320 } },
  { keywords: ["farro"], calories: 340, protein: 13, carbs: 68, fat: 2.5, unitGrams: { cup: 175, lb: 454 } },
  { keywords: ["orzo", "whole wheat orzo"], calories: 371, protein: 13, carbs: 77, fat: 1.5, unitGrams: { cup: 180, lb: 454 } },
  { keywords: ["chicken wing", "chicken wings"], calories: 203, protein: 30.5, carbs: 0, fat: 8.1, unitGrams: { lb: 454, oz: 28, count: 90 } },
  { keywords: ["beef hot dog", "beef hot dogs", "hot dog", "hot dogs", "frankfurter"], calories: 290, protein: 10, carbs: 4, fat: 26, unitGrams: { count: 45, lb: 454, oz: 28 } },
  { keywords: ["ramen noodles"], calories: 188, protein: 5, carbs: 25, fat: 7, unitGrams: { cup: 170, oz: 28, lb: 454 } },
  { keywords: ["crushed roasted peanuts", "roasted peanuts", "peanuts"], calories: 567, protein: 25, carbs: 16, fat: 49, unitGrams: { tbsp: 9, cup: 146, oz: 28 } },

  // --- Protein cuts missing from the base list (root-caused near-zero protein/calories) ---
  { keywords: ["linguica", "portuguese sausage"], calories: 307, protein: 16, carbs: 2, fat: 25, unitGrams: { lb: 454, oz: 28, link: 100 } },
  { keywords: ["picanha", "picanha roast", "sirloin cap", "rump cap"], calories: 271, protein: 25, carbs: 0, fat: 18, unitGrams: { lb: 454, oz: 28 } },
  { keywords: ["lamb chop", "lamb chops", "lamb loin chop", "lamb loin chops", "lamb rib chop", "lamb rib chops", "lamb shoulder chop", "lamb shoulder chops", "rack of lamb", "lamb leg", "leg of lamb"], calories: 258, protein: 25, carbs: 0, fat: 17, unitGrams: { lb: 454, oz: 28, piece: 130, pieces: 130, count: 130 } },
  { keywords: ["short rib", "short ribs", "boneless short rib", "boneless short ribs", "bone-in short rib", "bone-in short ribs"], calories: 295, protein: 22, carbs: 0, fat: 23, unitGrams: { lb: 454, oz: 28 } },
  { keywords: ["corned beef"], calories: 251, protein: 18, carbs: 0.4, fat: 19, unitGrams: { lb: 454, oz: 28, slice: 28 } },
  { keywords: ["bratwurst"], calories: 283, protein: 13, carbs: 2, fat: 25, unitGrams: { lb: 454, oz: 28, link: 85, links: 85 } },
  { keywords: ["scrapple"], calories: 218, protein: 9, carbs: 10, fat: 16, unitGrams: { lb: 454, oz: 28, slice: 28 } },
  { keywords: ["deli turkey", "sliced deli turkey", "sliced turkey breast", "turkey breast deli"], calories: 104, protein: 17, carbs: 3, fat: 2, unitGrams: { lb: 454, oz: 28, slice: 28 } },
  { keywords: ["roast beef", "deli roast beef", "sliced roast beef", "cooked roast beef", "pulled beef"], calories: 143, protein: 22, carbs: 0, fat: 6, unitGrams: { lb: 454, oz: 28, slice: 28 } },
  { keywords: ["canned tuna", "tuna packed in water", "tuna in water"], calories: 116, protein: 26, carbs: 0, fat: 1, unitGrams: { can: 142, cans: 142, oz: 28, lb: 454 } },
  { keywords: ["black pudding", "blood sausage"], calories: 297, protein: 14, carbs: 15, fat: 22, unitGrams: { lb: 454, oz: 28, slice: 28 } },
  { keywords: ["chicken cutlet", "chicken cutlets", "chicken cutlets pounded thin", "thin-sliced chicken breast"], calories: 165, protein: 31, carbs: 0, fat: 3.6, unitGrams: { lb: 454, oz: 28, count: 140 } },
  { keywords: ["chicken legs and thighs", "chicken legs", "chicken leg", "bone-in chicken legs"], calories: 172, protein: 24, carbs: 0, fat: 8, unitGrams: { lb: 454, oz: 28, count: 200 } },
  { keywords: ["cooked chicken shredded", "shredded cooked chicken", "cooked chicken"], calories: 190, protein: 29, carbs: 0, fat: 7.4, unitGrams: { lb: 454, oz: 28, cup: 140 } },
  { keywords: ["pancetta"], calories: 458, protein: 27, carbs: 0.3, fat: 38, unitGrams: { lb: 454, oz: 28, slice: 10 } },
  { keywords: ["prosciutto"], calories: 271, protein: 27, carbs: 1, fat: 18, unitGrams: { lb: 454, oz: 28, slice: 15 } },
  { keywords: ["mortadella"], calories: 311, protein: 15, carbs: 3, fat: 26, unitGrams: { lb: 454, oz: 28, slice: 25 } },
  { keywords: ["chicken liver", "chicken livers"], calories: 172, protein: 24, carbs: 1, fat: 6, unitGrams: { lb: 454, oz: 28 } },

  // --- Starches / breads missing from the base list (root-caused false-positive "under 250 cal" flags) ---
  { keywords: ["lasagna noodle", "lasagna noodles", "ziti", "rigatoni"], calories: 371, protein: 13, carbs: 75, fat: 1.5, unitGrams: { lb: 454, oz: 28, cup: 100, noodle: 20, noodles: 20 } },
  { keywords: ["pie crust", "puff pastry", "pie dough"], calories: 400, protein: 5, carbs: 40, fat: 24, unitGrams: { count: 180, sheet: 250, oz: 28, lb: 454 } },
  { keywords: ["pretzel dough", "soft pretzel", "soft pretzel bites", "pretzel bites", "pretzel bun", "pretzel roll"], calories: 340, protein: 9, carbs: 68, fat: 3, unitGrams: { lb: 454, oz: 28, count: 90, piece: 20, pieces: 20 } },
  { keywords: ["tater tot", "tater tots", "frozen tater tots"], calories: 170, protein: 2, carbs: 22, fat: 8, unitGrams: { lb: 454, oz: 28, cup: 130 } },
  { keywords: ["frozen fries", "frozen straight-cut fries", "frozen diner fries", "frozen crinkle fries", "french fries", "diner fries"], calories: 165, protein: 2.6, carbs: 24, fat: 6.5, unitGrams: { lb: 454, oz: 28, cup: 130 } },
  { keywords: ["bagel", "bagels"], calories: 250, protein: 10, carbs: 49, fat: 1.5, unitGrams: { count: 105, bagel: 105 } },
  { keywords: ["hawaiian sweet roll", "hawaiian sweet rolls", "slider roll", "slider rolls", "sweet roll", "sweet rolls"], calories: 290, protein: 8, carbs: 51, fat: 6, unitGrams: { count: 43, roll: 43 } },
  { keywords: ["focaccia"], calories: 275, protein: 7, carbs: 42, fat: 8, unitGrams: { lb: 454, oz: 28, loaf: 400 } },
  { keywords: ["couscous"], calories: 376, protein: 13, carbs: 77, fat: 0.6, unitGrams: { cup: 173, lb: 454 } },
  { keywords: ["polenta", "cornmeal"], calories: 370, protein: 8, carbs: 79, fat: 3.5, unitGrams: { cup: 138, lb: 454 } },
  { keywords: ["grits", "stone-ground grits"], calories: 371, protein: 9, carbs: 79, fat: 1.6, unitGrams: { cup: 156, lb: 454 } },
  { keywords: ["cornbread"], calories: 265, protein: 6, carbs: 40, fat: 9, unitGrams: { cup: 120, slice: 60, count: 60 } },
  { keywords: ["white bean", "white beans", "navy bean", "navy beans", "great northern bean", "great northern beans"], calories: 139, protein: 9.7, carbs: 25, fat: 0.4, unitGrams: { can: 250, cans: 250, cup: 170, lb: 454 } },
  { keywords: ["wonton wrapper", "wonton wrappers"], calories: 283, protein: 9, carbs: 58, fat: 1, unitGrams: { count: 5, oz: 28, lb: 454 } },
  { keywords: ["gruyere"], calories: 413, protein: 30, carbs: 0.4, fat: 32, unitGrams: { cup: 113, oz: 28, slice: 28, lb: 454 } },
  { keywords: ["walnut", "walnuts", "chopped walnuts", "pecan", "pecans", "chopped pecans"], calories: 654, protein: 15, carbs: 14, fat: 65, unitGrams: { cup: 100, oz: 28, tbsp: 7 } },
  { keywords: ["pine nut", "pine nuts", "pistachio", "pistachios"], calories: 606, protein: 18, carbs: 19, fat: 51, unitGrams: { cup: 120, oz: 28, tbsp: 8 } },
  { keywords: ["granola"], calories: 471, protein: 10, carbs: 64, fat: 20, unitGrams: { cup: 122, oz: 28, lb: 454 } },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Strips accents (é, è, ñ, etc.) so "Gruyère"/"jalapeño" match plain-ASCII keywords. */
function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Builds a regex fragment that matches a keyword AND its plural form, so a singular
 * database keyword (e.g. "black bean") still matches plural recipe text (e.g. "black beans").
 * Word-boundary-only matching previously required an exact singular/plural match, which
 * silently zeroed out common ingredients (tomatoes, onions, beans, avocados, limes, etc.)
 * whenever the recipe author used the plural form.
 */
function pluralAwarePattern(keyword: string): string {
  const escaped = escapeRegex(keyword);
  // Consonant + "y" pluralizes as "-ies" (berry -> berries), not a simple trailing "s".
  if (/[^aeiou]y$/i.test(keyword)) {
    const stem = escapeRegex(keyword.slice(0, -1));
    return `(?:${escaped}|${stem}ies)`;
  }
  // Covers regular "-s" plurals (bean -> beans, onion -> onions) and "-es" plurals
  // for words ending in o/consonant clusters (tomato -> tomatoes).
  return `${escaped}(?:e?s)?`;
}

export function findIngredientProfile(name: string): IngredientNutritionProfile | null {
  const normalized = stripDiacritics(name.toLowerCase()).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  let best: IngredientNutritionProfile | null = null;
  let bestLen = 0;
  for (const profile of INGREDIENT_NUTRITION_PROFILES) {
    for (const kw of profile.keywords) {
      const re = new RegExp(`\\b${pluralAwarePattern(kw)}\\b`, "i");
      if (re.test(normalized) && kw.length > bestLen) {
        best = profile;
        bestLen = kw.length;
      }
    }
  }
  return best;
}
