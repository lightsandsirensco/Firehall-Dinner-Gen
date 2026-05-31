import fs from "node:fs";
import path from "node:path";
import { normalizeTitleKey } from "../ingestion/dedupe.js";
import { inferMealArchetypes } from "./meal-archetypes.js";
import type { CatalogRecipeAuditRecord } from "./types.js";

const CATALOG_ROOT = path.join(process.cwd(), "client", "public", "catalog");

const COLLECTION_DIRS: Array<{ collection: string; pagesDir: string }> = [
  { collection: "golden_100", pagesDir: "golden-100/pages" },
  { collection: "performance_meals", pagesDir: "performance-meals/pages" },
  { collection: "hall_expansion", pagesDir: "hall-expansion/pages" },
  { collection: "breakfast", pagesDir: "breakfast/pages" },
  { collection: "bbq", pagesDir: "bbq/pages" },
  { collection: "smoothies", pagesDir: "smoothies/pages" },
  { collection: "pizza_night", pagesDir: "pizza-night/pages" },
];

interface RawPage {
  slug?: string;
  title?: string;
  displayTitle?: string;
  category?: string;
  cuisine?: string;
  tags?: string[];
  equipment?: string[];
  ingredients?: Array<{ name?: string; group?: string }>;
  steps?: Array<{ heading?: string; body?: string; title?: string }>;
  mealFormat?: string;
  protein?: string;
  cookingMethod?: string;
  sideDishes?: string[];
  filters?: string[];
}

function extractProtein(raw: RawPage): string {
  const tagProtein = (raw.tags || []).find((t) => t.startsWith("protein:"));
  if (tagProtein) return tagProtein.replace("protein:", "");
  if (raw.protein) return String(raw.protein).toLowerCase();
  const title = `${raw.title || ""} ${raw.slug || ""}`.toLowerCase();
  if (/\bbeef\b/.test(title)) return "beef";
  if (/\bpork\b/.test(title)) return "pork";
  if (/\bchicken\b/.test(title)) return "chicken";
  if (/\bsalmon|fish|shrimp|seafood\b/.test(title)) return "seafood";
  if (/\beggs?\b/.test(title)) return "eggs";
  if (/\bturkey\b/.test(title)) return "turkey";
  if (/\blamb\b/.test(title)) return "lamb";
  if (/\bsausage\b/.test(title)) return "sausage";
  return "mixed";
}

function extractMealFormat(raw: RawPage): string {
  const tagFormat = (raw.tags || []).find((t) => t.startsWith("format:"));
  if (tagFormat) return tagFormat.replace("format:", "");
  if (raw.mealFormat) return String(raw.mealFormat).toLowerCase();
  const title = `${raw.title || ""} ${raw.slug || ""}`.toLowerCase();
  if (/\bbowl/.test(title)) return "bowl";
  if (/\bsandwich|burger|sub\b/.test(title)) return "sandwich";
  if (/\bpasta|spaghetti|penne\b/.test(title)) return "pasta";
  if (/\btaco|burrito|enchilada\b/.test(title)) return "taco";
  if (/\bsoup|chili|stew|gumbo\b/.test(title)) return "soup";
  if (/\bcasserole|bake\b/.test(title)) return "bake";
  if (/\bsmoothie\b/.test(title)) return "smoothie";
  if (/\bpizza\b/.test(title)) return "pizza";
  if (/\bplatter|board\b/.test(title)) return "platter";
  if (/\bskillet|hash\b/.test(title)) return "skillet";
  if (/\bsheet pan\b/.test(title)) return "sheet_pan";
  return "plate";
}

function extractCuisine(raw: RawPage): string {
  if (raw.cuisine) return String(raw.cuisine).toLowerCase();
  const title = `${raw.title || ""} ${raw.slug || ""}`.toLowerCase();
  if (/\bgreek\b/.test(title)) return "greek";
  if (/\bmexican|taco|burrito|enchilada\b/.test(title)) return "mexican";
  if (/\bitalian|parm|carbonara\b/.test(title)) return "italian";
  if (/\basian|korean|thai|vietnamese|ramen|pho\b/.test(title)) return "asian";
  if (/\bindian|curry|tikka\b/.test(title)) return "indian";
  if (/\bcajun|gumbo|jambalaya\b/.test(title)) return "cajun";
  if (/\bbbq|smoked|brisket\b/.test(title)) return "american_bbq";
  if (raw.category?.includes("breakfast")) return "breakfast";
  return "american";
}

function extractCookingMethod(raw: RawPage): string {
  if (raw.cookingMethod) return String(raw.cookingMethod).toLowerCase();
  const eq = (raw.equipment || []).join(" ").toLowerCase();
  const title = `${raw.title || ""} ${raw.slug || ""}`.toLowerCase();
  if (/\bsmok/.test(eq) || /\bsmok/.test(title)) return "smoke";
  if (/\bgrill/.test(eq) || /\bgrill/.test(title)) return "grill";
  if (/\bsheet pan|tray\b/.test(title)) return "sheet_pan";
  if (/\bskillet|cast iron\b/.test(eq)) return "skillet";
  if (/\boven|bake\b/.test(title)) return "bake";
  if (/\bslow|crock|braise\b/.test(title)) return "braise";
  if (/\bfry|fried\b/.test(title)) return "fry";
  if (/\bpressure|instant pot\b/.test(eq)) return "pressure";
  if (/\bair fryer\b/.test(eq)) return "air_fryer";
  return "stovetop";
}

function extractSideDishes(raw: RawPage): string[] {
  const sides: string[] = [];
  if (raw.sideDishes?.length) {
    sides.push(...raw.sideDishes.map((s) => s.toLowerCase()));
  }
  for (const ing of raw.ingredients || []) {
    const group = (ing.group || "").toLowerCase();
    if (/side|vegetable|salad|grain|base|topping|garnish/.test(group)) {
      if (ing.name) sides.push(ing.name.toLowerCase());
    }
  }
  const title = `${raw.title || ""}`.toLowerCase();
  for (const side of ["rice", "potato", "salad", "coleslaw", "beans", "corn", "quinoa", "naan", "tortilla"]) {
    if (title.includes(side) || (raw.ingredients || []).some((i) => i.name?.toLowerCase().includes(side))) {
      sides.push(side);
    }
  }
  return [...new Set(sides)];
}

function normalizePage(raw: RawPage, collection: string): CatalogRecipeAuditRecord | null {
  const slug = raw.slug?.trim();
  const title = (raw.displayTitle || raw.title || "").trim();
  if (!slug || !title) return null;

  const ingredientNames = (raw.ingredients || [])
    .map((i) => i.name?.trim().toLowerCase())
    .filter((n): n is string => Boolean(n));

  const base = {
    slug,
    title,
    collection,
    category: (raw.category || collection).toLowerCase(),
    cuisine: extractCuisine(raw),
    protein: extractProtein(raw),
    mealFormat: extractMealFormat(raw),
    cookingMethod: extractCookingMethod(raw),
    sideDishes: extractSideDishes(raw),
    ingredientNames,
    equipment: (raw.equipment || []).map((e) => e.toLowerCase()),
    tags: (raw.tags || raw.filters || []).map((t) => t.toLowerCase()),
  };

  return {
    ...base,
    archetypes: inferMealArchetypes(base),
  };
}

export function loadCatalogRecipes(): CatalogRecipeAuditRecord[] {
  const bySlug = new Map<string, CatalogRecipeAuditRecord>();

  for (const { collection, pagesDir } of COLLECTION_DIRS) {
    const dir = path.join(CATALOG_ROOT, pagesDir);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".json")) continue;
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as RawPage;
      const record = normalizePage(raw, collection);
      if (!record) continue;
      if (!bySlug.has(record.slug)) {
        bySlug.set(record.slug, record);
      }
    }
  }

  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

export function titleKey(title: string): string {
  return normalizeTitleKey(title);
}

export function slugStem(slug: string): string {
  return slug
    .replace(/-(crew|hall|for-the-crew|batch|style|platter|tray|sandwiches?)$/g, "")
    .replace(/-/g, "");
}
