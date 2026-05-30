/**
 * Pizza Night hero imagery — dish-accurate visual focus for generation/audit.
 */
export const PIZZA_NIGHT_IMAGE_FOCUS: Record<string, string> = {
  "margherita-pizza":
    "Neapolitan round pie with fresh basil leaves, white mozzarella rounds, simple red tomato sauce, blistered leopard-spot crust",
  "hawaiian-pizza":
    "round pizza with visible pineapple chunks and ham or Canadian bacon on mozzarella, tomato sauce base",
  "pesto-chicken-pizza":
    "green basil pesto base, sliced grilled chicken, sun-dried tomato pieces, mozzarella — no red sauce",
  "honey-soppressata-pizza":
    "soppressata salami rounds, hot honey drizzle gloss, charred pepperoni-style edges, red sauce and mozzarella",
  "nashville-hot-chicken-pizza":
    "spicy red Nashville hot chicken pieces, pickle chips, ranch drizzle, cayenne-red oil sheen on cheese",
  "philly-cheesesteak-pizza":
    "thin-sliced steak, sautéed green peppers and onions, melted provolone on pizza dough — cheesesteak toppings visible",
  "detroit-style-pizza":
    "rectangular Detroit pan pizza with thick focaccia crust, crispy caramelized cheese edges, pepperoni cups",
  "breakfast-sausage-pizza":
    "breakfast pizza with crumbled sausage, creamy white sausage gravy, visible egg or brunch toppings, morning light",
  "bbq-chicken-pizza":
    "BBQ sauce base, shredded chicken, red onion, cilantro, smoked gouda and mozzarella",
  "buffalo-chicken-pizza":
    "orange buffalo sauce, crispy chicken, blue cheese crumbles, ranch drizzle",
  "pepperoni-pizza-night":
    "classic round pepperoni pizza, cupped pepperoni, bubbling mozzarella, tomato sauce",
  "firehall-supreme-pizza":
    "loaded supreme pizza with pepperoni, sausage, bell peppers, mushrooms, olives on one pie",
  "four-cheese-white-pizza":
    "white four-cheese pizza, no red sauce, melted mozzarella provolone parmesan ricotta",
  "jalapeno-popper-pizza":
    "jalapeño popper pizza with cream cheese, bacon bits, pickled jalapeño rings",
  "meat-lovers-sheet-pizza":
    "large rectangular sheet pan meat lovers pizza, pepperoni sausage bacon on one tray",
  "sicilian-sheet-pizza":
    "thick Sicilian square sheet pan pizza, focaccia-style crust, tomato sauce on top",
  "smoked-brisket-bbq-pizza":
    "smoked brisket slices, tangy BBQ sauce, red onion, cheddar-mozzarella blend",
  "taco-pizza":
    "taco pizza with seasoned ground beef, lettuce, tomato, shredded cheese, tortilla chip garnish",
  "veggie-supreme-pizza":
    "vegetarian supreme pizza with roasted peppers, mushrooms, black olives, red onion, no meat",
  "white-garlic-chicken-pizza":
    "white garlic cream sauce, roasted garlic cloves, sliced chicken, spinach, ricotta dollops",
};

export function pizzaVisualFocus(slug: string, title: string, hookLine?: string): string {
  return (
    PIZZA_NIGHT_IMAGE_FOCUS[slug] ||
    `${title} — ${hookLine || "hall pizza night"} — whole pie, natural cheese bubble, editorial food photo`
  );
}
