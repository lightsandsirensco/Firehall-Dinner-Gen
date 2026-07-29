/**
 * Batch B — hand-written golden packs (Tier 1–inspired, Firehall-original instructions).
 */
import type { GoldenRecipeDefinition } from "../types.js";
import type { MealSpecificPack } from "./golden-p0-classic-packs.js";

type Ing = MealSpecificPack["ingredients"][number];
type Step = MealSpecificPack["steps"][number];

function m(
  name: string,
  quantity: number,
  unit: string,
  group?: string,
  notes?: string,
): Ing {
  return { name, quantity: String(quantity), unit, group, notes };
}

function mult(n: number, scale: number): number {
  return Math.round(n * scale * 10) / 10;
}

function step(
  n: number,
  title: string,
  instruction: string,
  minutes: number,
  heatLevel: Step["heatLevel"] = "",
): Step {
  return { stepNumber: n, title, instruction, minutes, heatLevel };
}

type PackBuilder = (scale: number, def: GoldenRecipeDefinition) => MealSpecificPack;

export const BATCH_B_SOURCE_URLS: Record<string, string> = {
  "30-minute-pasta-e-fagioli-for-the-hall":
    "https://www.seriouseats.com/30-minute-pasta-and-kidney-bean-soup-pasta-e-fagioli-recipe",
  "red-beans-and-rice-for-the-hall":
    "https://www.seriouseats.com/new-orleans-style-red-beans-rice-recipe",
  "french-onion-soup-for-the-hall":
    "https://www.americastestkitchen.com/recipes/12325-french-onion-soup",
  "chicken-tortilla-soup-for-the-hall": "https://www.seriouseats.com/real-deal-tortilla-soup-recipe",
  "pasta-e-ceci-for-the-hall":
    "https://www.seriouseats.com/pasta-e-ceci-roman-pasta-and-chickpeas-recipe",
};

export const BATCH_B_GOLDEN_PACKS: Record<string, PackBuilder> = {
  "30-minute-pasta-e-fagioli-for-the-hall": (scale) => ({
    prepMinutes: 12,
    cookMinutes: 28,
    ingredients: [
      m("Ditalini or small shells", mult(1.25, scale), "lb", "Pasta"),
      m("Olive oil", mult(0.25, scale), "cup", "Base"),
      m("Yellow onion", mult(1, scale), "count", "Base", "diced"),
      m("Garlic cloves", mult(6, scale), "count", "Base", "minced"),
      m("Tomato paste", mult(3, scale), "tbsp", "Base"),
      m("Canned kidney beans", mult(3, scale), "cans", "Beans", "15 oz, drained and rinsed"),
      m("Low-sodium chicken broth", mult(8, scale), "cups", "Broth"),
      m("Dried oregano", mult(2, scale), "tsp", "Seasoning"),
      m("Bay leaves", mult(2, scale), "count", "Seasoning"),
      m("Parmesan cheese", mult(1, scale), "cup", "Finish", "finely grated, plus rind if you have it"),
      m("Fresh parsley", mult(0.5, scale), "cup", "Garnish", "chopped — serve separately"),
      m("Crusty bread", mult(1, scale), "loaf", "Sides", "for the line"),
    ],
    steps: [
      step(
        1,
        "Bloom aromatics in olive oil",
        "Heat olive oil in a large Dutch oven or stockpot over medium. Cook onion with a pinch of salt until softened and lightly golden at the edges, 6–8 minutes. Stir in garlic and tomato paste; cook until the paste darkens and smells sweet, about 2 minutes.",
        10,
        "medium",
      ),
      step(
        2,
        "Simmer broth and beans",
        "Add kidney beans, broth, oregano, bay leaves, and Parmesan rind if using. Bring to a steady simmer — the soup should look brothy, not stew-thick yet. Simmer 10 minutes so flavors meld and beans heat through.",
        12,
        "medium-low",
      ),
      step(
        3,
        "Cook pasta in the soup",
        "Stir in ditalini and simmer until pasta is tender with a little bite, 10–12 minutes, stirring occasionally so pasta does not stick. The consistency should coat a spoon lightly — add a splash of water if it tightens too much before service.",
        12,
        "medium-low",
      ),
      step(
        4,
        "Finish and season the pot",
        "Fish out bay leaves and rind. Stir in half the grated Parmesan off heat until melted. Taste and adjust salt and pepper — the soup should be savory and tomato-forward, not bland brothy.",
        5,
        "low",
      ),
      step(
        5,
        "Ladle and garnish at the line",
        "Ladle into bowls. Pass parsley and remaining Parmesan separately so greens stay bright. Serve bread on the side. Hold the pot on the lowest simmer up to 45 minutes; add broth if pasta swells — stir before each ladle.",
        5,
        "low",
      ),
    ],
  }),

  "red-beans-and-rice-for-the-hall": (scale) => ({
    prepMinutes: 20,
    cookMinutes: 150,
    ingredients: [
      m("Dried red kidney beans", mult(2, scale), "lb", "Beans", "picked over and rinsed"),
      m("Andouille sausage", mult(2, scale), "lb", "Protein", "sliced ¼ inch"),
      m("Yellow onion", mult(2, scale), "count", "Trinity", "diced"),
      m("Green bell pepper", mult(2, scale), "count", "Trinity", "diced"),
      m("Celery stalks", mult(4, scale), "count", "Trinity", "diced"),
      m("Garlic cloves", mult(8, scale), "count", "Trinity", "minced"),
      m("Low-sodium chicken stock", mult(6, scale), "cups", "Liquid", "plus water as needed"),
      m("Dried thyme", mult(2, scale), "tsp", "Seasoning"),
      m("Smoked paprika", mult(1, scale), "tsp", "Seasoning"),
      m("Cayenne pepper", mult(0.5, scale), "tsp", "Seasoning", "adjust to crew heat tolerance"),
      m("Bay leaves", mult(3, scale), "count", "Seasoning"),
      m("Long-grain white rice", mult(3, scale), "lb", "Rice", "cooked separately for service"),
      m("Green onions", mult(1, scale), "bunch", "Garnish", "sliced — serve separately"),
      m("Hot sauce", mult(1, scale), "bottle", "Garnish", "for the line"),
    ],
    steps: [
      step(
        1,
        "Soak or quick-soak the beans",
        "Cover beans with 2 inches cold water and soak overnight, or quick-soak: boil 2 minutes, cover, and rest 1 hour. Drain before cooking — soaked beans cook evenly and split less at the hall.",
        15,
      ),
      step(
        2,
        "Brown sausage and build the trinity",
        "Brown andouille in a large Dutch oven over medium-high until fat renders and edges crisp, 6–8 minutes. Transfer sausage with a slotted spoon. In the same pot, cook onion, pepper, and celery with salt until softened, 8–10 minutes. Add garlic, thyme, paprika, and cayenne; stir 45 seconds.",
        15,
        "medium-high",
      ),
      step(
        3,
        "Simmer beans until creamy",
        "Return sausage, add drained beans, stock, and bay leaves. Simmer gently, partially covered, stirring occasionally and adding water to keep beans submerged, until beans break down and the pot looks thick and creamy, 1½–2 hours. Consistency should mound on a spoon, not run like soup.",
        120,
        "low",
      ),
      step(
        4,
        "Cook rice and hold components",
        "While beans finish, cook rice in salted water per package directions — fluffy separate grains hold up on the line better than sticky rice. Keep beans on the lowest heat. For late crews, hold beans and rice in separate covered baking dishes at 165°F up to 90 minutes.",
        25,
        "low",
      ),
      step(
        5,
        "Plate rice and beans for the crew",
        "Spoon rice into bowls or trays, ladle red beans over the top. Pass green onions and hot sauce at the line. Suggested sides: cornbread or simple green salad. Beans tighten when held — splash stock when reheating.",
        10,
        "low",
      ),
    ],
  }),

  "french-onion-soup-for-the-hall": (scale) => ({
    prepMinutes: 25,
    cookMinutes: 75,
    ingredients: [
      m("Yellow onions", mult(5, scale), "lb", "Base", "halved pole to pole, sliced ¼ inch"),
      m("Unsalted butter", mult(6, scale), "tbsp", "Base"),
      m("Dry sherry", mult(0.5, scale), "cup", "Base", "or dry white wine"),
      m("Beef broth", mult(10, scale), "cups", "Broth", "low-sodium"),
      m("Chicken broth", mult(4, scale), "cups", "Broth", "low-sodium"),
      m("Fresh thyme", mult(6, scale), "sprigs", "Seasoning"),
      m("Bay leaves", mult(2, scale), "count", "Seasoning"),
      m("Gruyère cheese", mult(2, scale), "lb", "Cheese", "grated"),
      m("Baguette", mult(2, scale), "count", "Crouton", "day-old, sliced ½ inch"),
      m("Black pepper", mult(1, scale), "tsp", "Seasoning", "freshly ground"),
      m("Kosher salt", mult(1, scale), "batch", "Seasoning"),
    ],
    steps: [
      step(
        1,
        "Caramelize onions low and slow",
        "Melt butter in a large Dutch oven over medium-low. Add onions with salt and cook, stirring every few minutes, until deeply golden brown and jammy, 45–60 minutes — do not rush over high heat or they burn before sweetening. The pot should smell sweet, not acrid.",
        55,
        "low",
      ),
      step(
        2,
        "Deglaze and add stock",
        "Stir in sherry, scraping browned bits. Simmer until almost dry, 2–3 minutes. Add beef broth, chicken broth, thyme, bay leaves, and pepper. Bring to a simmer and cook 20 minutes. Broth should taste rich and onion-sweet; consistency is thin soup, not gravy.",
        25,
        "medium-low",
      ),
      step(
        3,
        "Toast baguette rounds",
        "Arrange baguette slices on sheet pans. Toast at 400°F until dry and lightly golden, 8–10 minutes — dry bread floats and soaks broth without turning mushy. Hold at room temp up to 4 hours.",
        12,
        "high",
      ),
      step(
        4,
        "Fill crocks and top with cheese",
        "Heat broiler with rack 6 inches from element. Ladle hot soup into oven-safe bowls or crocks, leaving ½ inch headspace. Float 2–3 baguette crouton rounds per bowl and blanket with Gruyère — cheese should cover croutons to the rim so it melts into a solid cap.",
        10,
      ),
      step(
        5,
        "Broil the cheese cap and serve",
        "Broil until cheese bubbles and browns in spots, 3–5 minutes — watch constantly, no distracted tones during this step. Serve immediately with extra pepper at the line. Hold finished crocks in a warm box up to 20 minutes; re-broil 1 minute if cheese sets.",
        8,
        "high",
      ),
    ],
  }),

  "chicken-tortilla-soup-for-the-hall": (scale) => ({
    prepMinutes: 20,
    cookMinutes: 40,
    ingredients: [
      m("Boneless, skinless chicken thighs", mult(4, scale), "lb", "Protein", "cut into 1-inch pieces"),
      m("Yellow onion", mult(2, scale), "count", "Base", "diced"),
      m("Jalapeño peppers", mult(2, scale), "count", "Base", "stemmed, half minced, half sliced for garnish"),
      m("Garlic cloves", mult(6, scale), "count", "Base", "minced"),
      m("Ground cumin", mult(2, scale), "tsp", "Spice"),
      m("Ancho chile powder", mult(1, scale), "tbsp", "Spice", "mild; not chili-con carne seasoning"),
      m("Canned fire-roasted tomatoes", mult(2, scale), "cans", "Base", "14.5 oz"),
      m("Low-sodium chicken stock", mult(10, scale), "cups", "Broth"),
      m("Corn tortillas", mult(10, scale), "count", "Garnish", "6-inch, cut into thin strips for frying"),
      m("Vegetable oil", mult(0.5, scale), "cup", "Garnish", "for shallow frying strips"),
      m("Avocados", mult(4, scale), "count", "Garnish", "diced — hold separately"),
      m("Fresh cilantro", mult(1, scale), "bunch", "Garnish", "chopped — serve separately"),
      m("Limes", mult(6, scale), "count", "Garnish", "cut into wedges"),
      m("Shredded Monterey Jack", mult(1, scale), "lb", "Garnish", "optional at the line"),
    ],
    steps: [
      step(
        1,
        "Sear chicken and soften aromatics",
        "Heat 2 tablespoons oil in a large pot over medium-high. Brown chicken in batches until golden but not cooked through, 4–5 minutes per batch; transfer to a plate. Lower heat to medium, cook onion and minced jalapeño with salt until soft, 6–8 minutes. Add garlic, cumin, and ancho chile powder; stir 45 seconds until fragrant.",
        15,
        "medium-high",
      ),
      step(
        2,
        "Simmer the broth",
        "Add tomatoes with juice and chicken stock. Return chicken and any juices. Simmer until chicken registers 165°F and shreds easily, 18–22 minutes. Soup should be brothy and deep red-orange — thin with stock if it reduces too far.",
        22,
        "medium-low",
      ),
      step(
        3,
        "Shred chicken and adjust seasoning",
        "Transfer chicken to a board, shred with forks, and return to the pot. Taste and adjust salt — the broth should be savory, cumin-forward, and lightly smoky from the tomatoes, not watery.",
        8,
        "low",
      ),
      step(
        4,
        "Fry tortilla strips",
        "Heat vegetable oil to 350°F in a skillet. Fry corn tortilla strips in batches until crisp and lightly golden, 1–2 minutes per batch. Drain on paper towels and season lightly with salt. Hold strips uncovered at room temp up to 2 hours so they stay crisp.",
        12,
        "high",
      ),
      step(
        5,
        "Ladle soup and finish at the line",
        "Ladle hot soup into bowls. Garnish at the line with tortilla strips, avocado, cilantro, cheese, and lime wedges — garnishes stay separate so late crews get crisp strips. Hold soup at 165°F on the back burner up to 60 minutes; refresh strips if they soften.",
        8,
        "low",
      ),
    ],
  }),

  "pasta-e-ceci-for-the-hall": (scale) => ({
    prepMinutes: 15,
    cookMinutes: 35,
    ingredients: [
      m("Ditalini or small shells", mult(1, scale), "lb", "Pasta"),
      m("Canned chickpeas", mult(4, scale), "cans", "Main", "15 oz, drained — reserve 1 cup liquid"),
      m("Extra-virgin olive oil", mult(0.5, scale), "cup", "Base", "divided"),
      m("Garlic cloves", mult(8, scale), "count", "Base", "thinly sliced"),
      m("Tomato paste", mult(2, scale), "tbsp", "Base"),
      m("Low-sodium chicken broth", mult(4, scale), "cups", "Liquid"),
      m("Fresh rosemary", mult(2, scale), "tsp", "Herbs", "chopped, or 1 tsp dried"),
      m("Red pepper flakes", mult(0.5, scale), "tsp", "Seasoning", "optional"),
      m("Parmesan cheese", mult(1, scale), "cup", "Finish", "grated"),
      m("Lemon", mult(2, scale), "count", "Finish", "zested and cut into wedges"),
      m("Fresh parsley", mult(0.25, scale), "cup", "Garnish", "chopped — serve separately"),
    ],
    steps: [
      step(
        1,
        "Bloom garlic and tomato paste",
        "Heat 3 tablespoons olive oil in a large Dutch oven over medium. Cook garlic until golden at the edges, not brown, about 2 minutes. Stir in tomato paste and rosemary (and pepper flakes if using); cook until paste darkens, about 1 minute.",
        5,
        "medium",
      ),
      step(
        2,
        "Build the chickpea broth",
        "Add chickpeas, broth, and reserved chickpea liquid. Simmer 10 minutes, then mash about one-third of the chickpeas against the pot side with a spoon — the soup body should turn creamy while whole chickpeas remain for texture.",
        12,
        "medium-low",
      ),
      step(
        3,
        "Cook pasta in the pot",
        "Stir in pasta and simmer until tender, 10–12 minutes, stirring often. Consistency should be thick and stew-like, coating a spoon — add splashes of broth if pasta absorbs too much liquid before it is done.",
        12,
        "medium-low",
      ),
      step(
        4,
        "Finish with olive oil and Parmesan",
        "Off heat, stir in remaining olive oil and half the Parmesan until glossy. Taste and adjust salt. The dish should read as savory, lemon-ready pasta and chickpeas — not loose soup, not dry pasta.",
        5,
        "low",
      ),
      step(
        5,
        "Plate with lemon and parsley",
        "Serve in shallow bowls with lemon zest, wedges, remaining Parmesan, and parsley passed separately. Suggested sides: simple arugula salad. Hold covered at 165°F up to 30 minutes; loosen with hot broth when reheating.",
        5,
        "low",
      ),
    ],
  }),
};
