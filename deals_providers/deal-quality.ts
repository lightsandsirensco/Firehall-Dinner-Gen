/**
 * Exclude clutter items from meal deals — candy, snacks, toiletries, etc.
 */

const EXCLUDED_KEYWORDS = [
  "candy", "chocolate bar", "gummy", "lollipop", "cookie", "chip", "chips", "doritos",
  "pringles", "pop ", "soda", "cola", "pepsi", "coke", "soft drink", "energy drink",
  "toilet paper", "paper towel", "detergent", "shampoo", "soap", "toothpaste",
  "deodorant", "cleaning", "bleach", "diaper", "pet food", "dog food", "cat food",
  "ice cream", "frozen pizza", "frozen meal", "microwave dinner", "granola bar",
  "protein bar", "snack", "jerky", "cracker", "popcorn", "gum", "mint",
  "vitamin", "supplement", "medicine", "tylenol", "advil", "lotion",
];

const MEAL_BUILDING_PANTRY = [
  "rice", "pasta", "noodle", "spaghetti", "penne", "macaroni", "tortilla", "wrap",
  "bread", "bun", "pita", "bean", "lentil", "chickpea", "tomato sauce", "pasta sauce",
  "broth", "stock", "flour", "oil", "olive oil", "spice", "seasoning", "salsa",
  "cheddar", "mozzarella", "parmesan", "onion", "garlic", "pepper", "tomato",
];

export function isExcludedDealItem(itemName: string): boolean {
  const hay = itemName.toLowerCase();
  return EXCLUDED_KEYWORDS.some((kw) => hay.includes(kw));
}

export function isMealBuildingDeal(category: string, itemName: string): boolean {
  if (category === "protein") return true;
  const hay = itemName.toLowerCase();
  if (category === "pantry" || category === "produce" || category === "dairy") {
    return MEAL_BUILDING_PANTRY.some((kw) => hay.includes(kw));
  }
  return false;
}

export function dealDisplayPriority(category: string, itemName: string): number {
  if (category === "protein") return 0;
  if (isMealBuildingDeal(category, itemName)) return 1;
  if (category === "pantry") return 2;
  if (category === "produce") return 3;
  if (category === "dairy") return 4;
  return 9;
}
