import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Clock, Users, ChevronLeft, X, Loader2, Heart, ShieldAlert, Globe, UtensilsCrossed, ChefHat, Package, Leaf, Printer, Mail, List, BookmarkPlus, Sparkles, SlidersHorizontal, Utensils, TrendingUp, Flame } from "lucide-react";
import { HeroHeader } from "@/components/hero-header";
import { SiteHeader } from "@/components/site-header";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { getSavedCount, saveMeal, isMealSaved } from "@/lib/saved-meals";
import { ExploreRecipeCard, ExploreRecipeCardSkeleton } from "@/components/explore-recipe-card";
import { buildShoppingListFromClientMeal } from "@/lib/shopping-list";
import { EmailModal } from "@/components/email-modal";
import { ShoppingListModal } from "@/components/shopping-list-modal";
import { buildPrintHtml } from "@/components/recipe-card";
import { fetchExploreRecipeDetail, normalizeExploreRecipeId } from "@/lib/explore-api";
import { stripHtml } from "@/lib/text";
import {
  getWheelClassicBySlug,
  resolveCuratedSlugFromTitle,
  buildPackageUrl,
} from "@/lib/firehall-classics-wheel";
import type { ClientRecipeResponse, ClientIngredient } from "@shared/schema";

interface SearchResult {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  summary: string;
  sourceUrl?: string;
  cuisines?: string[];
  diets?: string[];
  _firehallFallback?: boolean;
  _pool?: string;
}

interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  _source?: "spoonacular" | "firehall" | "none";
  _relaxed?: string;
}

function inferRecipeTags(r: SearchResult): string[] {
  const tags: string[] = [];
  const addTag = (tag: string) => { if (!tags.includes(tag)) tags.push(tag); };
  const t = r.title.toLowerCase();
  const s = (r.summary || "").toLowerCase();
  const combined = t + " " + s;
  const pool = r._pool || "";

  if (r.readyInMinutes > 0 && r.readyInMinutes <= 20) addTag("Quick & Easy");
  else if (r.readyInMinutes > 0 && r.readyInMinutes <= 30) addTag("30-Minute Meal");

  const styleChecks: [RegExp, string][] = [
    [/sheet\s*pan/i, "Sheet Pan"],
    [/one[- ]pot|one[- ]pan/i, "One-Pot"],
    [/slow\s*cook|crock\s*pot|instant\s*pot/i, "Slow Cooker"],
    [/stir[- ]?fry/i, "Stir Fry"],
    [/grill/i, "Grilled"],
    [/skillet/i, "Skillet"],
    [/bowl/i, "Bowl"],
    [/burger/i, "Burger"],
    [/wrap|sandwich/i, "Wrap"],
    [/salad/i, "Salad"],
    [/roast/i, "Roasted"],
    [/bake/i, "Baked"],
  ];
  for (const [pattern, tag] of styleChecks) {
    if (pattern.test(t)) { addTag(tag); break; }
  }

  const foodChecks: [RegExp, string][] = [
    [/taco|burrito|enchilada|fajita|quesadilla|salsa|tortilla/i, "Mexican"],
    [/pasta|spaghetti|penne|rigatoni|lasagna|gnocchi|ravioli|linguine|fettuccine/i, "Pasta"],
    [/curry|tikka|masala|tandoori|korma/i, "Curry"],
    [/stew|chili|chowder|soup|bisque|gumbo/i, "Hearty"],
    [/casserole|mac.*cheese|meatloaf|pot\s*pie|comfort/i, "Comfort Food"],
    [/bbq|barbecue|pulled\s*pork|smoked/i, "BBQ"],
    [/teriyaki|soy\s*sauce|sesame|asian/i, "Asian"],
    [/pizza|flatbread/i, "Pizza"],
    [/pie|cobbler|crumble/i, "Baked"],
  ];
  for (const [pattern, tag] of foodChecks) {
    if (pattern.test(t) && !tags.includes(tag)) { addTag(tag); break; }
  }

  const cuisineMap: Record<string, string> = {
    mediterranean: "Mediterranean", greek: "Mediterranean", italian: "Italian",
    mexican: "Mexican", cajun: "Cajun", korean: "Korean", japanese: "Japanese",
    chinese: "Chinese", thai: "Thai", indian: "Indian", vietnamese: "Vietnamese",
    french: "French", american: "American",
  };
  for (const c of (r.cuisines || [])) {
    const mapped = cuisineMap[c.toLowerCase()];
    if (mapped) { addTag(mapped); break; }
  }

  const dietTags: Record<string, string> = {
    "gluten free": "Gluten Free", vegan: "Vegan", vegetarian: "Vegetarian",
    "dairy free": "Dairy Free", "whole30": "Whole30", paleo: "Paleo",
    ketogenic: "Keto",
  };
  for (const d of (r.diets || [])) {
    const mapped = dietTags[d.toLowerCase()];
    if (mapped) { addTag(mapped); break; }
  }

  if (pool) {
    const poolTags: Record<string, string> = {
      healthy: "High Protein", comfort: "Comfort Food", vegetarian: "Vegetarian",
      international: "World Cuisine",
    };
    const pt = poolTags[pool];
    if (pt) addTag(pt);
  }

  if (tags.length < 2) {
    if (/high[- ]?protein|lean|grilled\s+(chicken|salmon|fish|steak)/i.test(combined)) addTag("High Protein");
    else if (/healthy|nutritious|light|low[- ]?cal/i.test(combined)) addTag("Healthy");
  }

  const proteinChecks: [RegExp, string][] = [
    [/chicken/i, "Chicken"], [/beef|steak|goulash/i, "Beef"], [/pork|sausage/i, "Pork"],
    [/salmon|fish|shrimp|seafood|scallop|cod|tuna/i, "Seafood"],
    [/turkey/i, "Turkey"], [/lamb|mutton/i, "Lamb"],
    [/tofu|tempeh|lentil|chickpea|bean/i, "Plant-Based"],
  ];
  if (tags.length < 3) {
    for (const [pattern, tag] of proteinChecks) {
      if (pattern.test(t)) { addTag(tag); break; }
    }
  }

  if (tags.length === 0) {
    if (r.readyInMinutes > 60) addTag("Slow-Cooked");
    else addTag("Dinner");
  }

  return tags.slice(0, 3);
}

interface RecipeDetail {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  summary: string;
  cuisines: string[];
  diets: string[];
  dishTypes: string[];
  ingredients: { name: string; amount: number; unit: string; original: string }[];
  steps: { number: number; step: string }[];
  macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (/chicken|beef|pork|turkey|fish|shrimp|salmon|tuna|sausage|bacon|lamb|steak/.test(n)) return "Proteins";
  if (/milk|cream|cheese|butter|yogurt|sour cream/.test(n)) return "Dairy";
  if (/onion|garlic|pepper|tomato|lettuce|spinach|broccoli|carrot|celery|potato|mushroom|zucchini|corn|bean|pea|avocado|cilantro|basil|parsley|lime|lemon/.test(n)) return "Produce";
  if (/oil|vinegar|sauce|salt|pepper|cumin|paprika|oregano|thyme|chili|sugar|honey|flour|stock|broth/.test(n)) return "Pantry";
  if (/rice|pasta|noodle|bread|tortilla|bun/.test(n)) return "Grains";
  return "Other";
}

function spoonacularToClientRecipe(detail: RecipeDetail, crewSize: number): ClientRecipeResponse {
  const baseServings = detail.servings > 0 ? detail.servings : 4;
  const scale = crewSize / baseServings;
  const roundQty = (n: number) => Math.round(n * scale * 100) / 100;

  const ingredients: ClientIngredient[] = detail.ingredients.map(ing => ({
    name: ing.name,
    qty: roundQty(ing.amount),
    unit: ing.unit,
    category: inferCategory(ing.name),
  }));

  const proteinIng = ingredients.find(i => i.category === "Proteins");
  const chosenProtein = proteinIng?.name || "mixed";

  return {
    title: detail.title,
    meal_format: detail.dishTypes?.[0] || "dinner",
    servings: crewSize,
    tags: [...detail.cuisines, ...detail.diets],
    timing: {
      prep_min: Math.max(5, Math.round(detail.readyInMinutes * 0.3)),
      cook_min: Math.max(10, Math.round(detail.readyInMinutes * 0.7)),
      total_min: detail.readyInMinutes || 30,
    },
    protein_safety: {
      protein: chosenProtein,
      internal_temp_f: 0,
      rest_min: 0,
      notes: "",
    },
    ingredients,
    steps: detail.steps.map(s => ({
      n: s.number,
      title: `Step ${s.number}`,
      heat: "",
      minutes: 0,
      instructions: s.step,
    })),
    plating: {
      serve_style: "plated",
      assembly_instructions: "",
      optional_toppings: [],
    },
    macros_per_serving: {
      calories: detail.macros.calories,
      protein_g: detail.macros.protein_g,
      carbs_g: detail.macros.carbs_g,
      fat_g: detail.macros.fat_g,
    },
    chosen_protein: chosenProtein,
    primary_protein_source: chosenProtein,
    why_it_fits_tonight: `Discovered via Explore — ${detail.cuisines.join(", ") || "versatile"} recipe`,
    cleanup_tip: "",
    pro_tips: [],
    recipe_tags: {
      cuisine: detail.cuisines[0] || "",
      cooking_method: "",
      base_carb: "",
      key_ingredients: detail.ingredients.slice(0, 5).map(i => i.name),
      high_protein: detail.macros.protein_g >= 25,
      high_fiber: false,
      quick_cleanup: detail.readyInMinutes <= 30,
    },
    _id: `spoonacular-${detail.id}`,
    _signature: `spoonacular-${detail.id}`,
  };
}

function buildExplorePrintHtml(recipe: RecipeDetail, crewSize: number): string {
  const ingredientsHtml = recipe.ingredients
    .map(i => `<li style="padding:3px 0;border-bottom:1px solid #eee">${i.original}</li>`)
    .join("");
  const stepsHtml = recipe.steps
    .map(s => `<li style="padding:6px 0;border-bottom:1px solid #eee"><strong>Step ${s.number}:</strong> ${s.step}</li>`)
    .join("");
  const macroHtml = recipe.macros.calories > 0
    ? `<div style="display:flex;gap:24px;padding:12px 0;border-top:1px solid #ddd;margin-top:12px">
        <div><strong>${recipe.macros.calories}</strong> cal</div>
        <div><strong>${recipe.macros.protein_g}g</strong> protein</div>
        <div><strong>${recipe.macros.carbs_g}g</strong> carbs</div>
        <div><strong>${recipe.macros.fat_g}g</strong> fat</div>
      </div>`
    : "";

  return `<!DOCTYPE html><html><head><title>${recipe.title}</title>
    <style>@page{margin:0.75in}body{font-family:system-ui,sans-serif;max-width:700px;margin:0 auto;color:#111}
    h1{font-size:22px;margin-bottom:4px}h2{font-size:16px;margin-top:20px;text-transform:uppercase;letter-spacing:1px;color:#333}
    ul,ol{padding-left:20px}li{font-size:14px}
    .meta{font-size:13px;color:#666;margin-bottom:16px}</style></head>
    <body>
    <h1>${recipe.title}</h1>
    <p class="meta">${recipe.readyInMinutes} min · ${crewSize} servings</p>
    ${macroHtml}
    <h2>Ingredients</h2><ul style="list-style:none;padding:0">${ingredientsHtml}</ul>
    <h2>Instructions</h2><ol style="list-style:none;padding:0">${stepsHtml}</ol>
    <p style="text-align:center;margin-top:24px;font-size:11px;color:#999">Powered by Lights & Sirens Co.</p>
    </body></html>`;
}

const CUISINE_MAP: Record<string, string> = {
  any: "",
  mediterranean: "mediterranean",
  mexican: "mexican",
  italian: "italian",
  asian: "chinese,japanese,korean,thai,vietnamese",
  korean: "korean",
  thai: "thai",
  indian: "indian",
  middle_eastern: "middle eastern",
  bbq: "american",
  cajun: "cajun",
  canadian: "american",
};

const FORMAT_QUERY_MAP: Record<string, string> = {
  random: "",
  burger: "burger",
  tacos: "tacos",
  wrap: "wrap pita",
  bowl: "bowl",
  pasta: "pasta",
  salad: "salad",
  sheet_pan: "sheet pan",
  skillet: "skillet one pan",
  stir_fry: "stir fry",
  soup_chili: "soup stew chili",
  breakfast: "breakfast",
  loaded_fries: "loaded fries",
  sandwich: "sandwich sub hoagie",
  casserole: "casserole bake",
  plated_main: "dinner entree main course",
};

const ALLERGEN_TO_INTOLERANCE: Record<string, string> = {
  dairy: "dairy",
  gluten: "gluten",
  soy: "soy",
  eggs: "egg",
  nuts: "tree nut,peanut",
  shellfish: "shellfish",
};

const ALLERGEN_EXCLUDE_MAP: Record<string, string[]> = {
  dairy: ["milk", "cheese", "butter", "cream", "yogurt"],
  gluten: ["wheat", "flour", "bread", "breadcrumbs"],
  soy: ["soy sauce", "tofu", "edamame", "soybean"],
  eggs: ["egg", "eggs", "mayonnaise"],
  nuts: ["peanut", "almond", "walnut", "cashew", "pecan"],
  shellfish: ["shrimp", "crab", "lobster", "clam", "mussel", "oyster"],
};

const PROTEIN_OPTIONS = ["chicken", "beef", "pork", "turkey", "seafood", "vegetarian"];

const ALLERGEN_OPTIONS = ["dairy", "gluten", "soy", "eggs", "nuts", "shellfish"];

const APPLIANCE_OPTIONS = ["stove", "oven", "grill", "slow cooker", "air fryer", "instant pot"];

const APPLIANCE_EQUIPMENT_MAP: Record<string, string> = {
  stove: "stove",
  oven: "oven",
  grill: "grill",
  "slow cooker": "slow cooker",
  "air fryer": "air fryer",
  "instant pot": "pressure cooker",
};

const TIME_OPTIONS = [
  { value: "any", label: "Any Time" },
  { value: "15", label: "15 min" },
  { value: "25", label: "25 min" },
  { value: "40", label: "40 min" },
  { value: "60", label: "60 min" },
  { value: "90", label: "90 min" },
];

interface ExploreFilters {
  freeText: string;
  cuisine: string;
  mealFormat: string;
  proteins: string[];
  allergens: string[];
  appliances: string[];
  timeAvailable: string;
  crewSize: number;
  pantryMode: boolean;
  pantryIngredients: string;
  vegetarian: boolean;
}

function buildSearchParams(filters: ExploreFilters): URLSearchParams {
  const params = new URLSearchParams();

  const queryParts: string[] = [];

  if (filters.freeText.trim()) {
    queryParts.push(filters.freeText.trim());
  }

  const formatKeyword = FORMAT_QUERY_MAP[filters.mealFormat] || "";
  if (formatKeyword) {
    queryParts.push(formatKeyword);
  }

  const isVegetarian = filters.vegetarian || filters.proteins.includes("vegetarian");
  if (isVegetarian) {
    params.set("diet", "vegetarian");
  } else if (filters.proteins.length > 0) {
    const proteinKeywords = filters.proteins
      .filter(p => p !== "seafood")
      .concat(filters.proteins.includes("seafood") ? ["fish", "shrimp"] : []);
    if (proteinKeywords.length > 0) {
      queryParts.push(proteinKeywords.join(" "));
    }
  }

  if (queryParts.length === 0) {
    queryParts.push("dinner");
  }
  params.set("q", queryParts.join(" "));

  const baseQueryParts: string[] = [];
  if (filters.freeText.trim()) baseQueryParts.push(filters.freeText.trim());
  const isVeg = filters.vegetarian || filters.proteins.includes("vegetarian");
  if (!isVeg && filters.proteins.length > 0) {
    const bp = filters.proteins
      .filter(p => p !== "seafood")
      .concat(filters.proteins.includes("seafood") ? ["fish", "shrimp"] : []);
    if (bp.length > 0) baseQueryParts.push(bp.join(" "));
  }
  if (baseQueryParts.length > 0) {
    params.set("_baseQuery", baseQueryParts.join(" "));
  }

  const spoonCuisine = CUISINE_MAP[filters.cuisine] || "";
  if (spoonCuisine) {
    params.set("cuisine", spoonCuisine);
  }

  if (filters.allergens.length > 0) {
    const intolerances = filters.allergens
      .map(a => ALLERGEN_TO_INTOLERANCE[a])
      .filter(Boolean)
      .join(",");
    if (intolerances) params.set("intolerances", intolerances);

    const excludeItems = filters.allergens
      .flatMap(a => ALLERGEN_EXCLUDE_MAP[a] || []);
    if (excludeItems.length > 0) {
      params.set("excludeIngredients", excludeItems.join(","));
    }
  }

  if (filters.timeAvailable !== "any") {
    params.set("maxReadyTime", filters.timeAvailable);
  }

  if (filters.appliances.length > 0) {
    const equipment = filters.appliances
      .map(a => APPLIANCE_EQUIPMENT_MAP[a])
      .filter(Boolean)
      .join(",");
    if (equipment) params.set("equipment", equipment);
  }

  if (filters.pantryMode && filters.pantryIngredients.trim()) {
    const ingredients = filters.pantryIngredients
      .split(/[,\n]+/)
      .map(i => i.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10)
      .join(",");
    if (ingredients) params.set("includeIngredients", ingredients);
  }

  const crew = filters.crewSize;
  const minS = Math.max(1, crew - 2);
  const maxS = crew + 4;
  params.set("minServings", String(minS));
  params.set("maxServings", String(maxS));

  params.set("number", "15");
  params.set("_crewSize", String(crew));

  return params;
}

interface ClassicGeneratorFilters {
  meal_format: string;
  proteins: string[];
  cuisine_style: string;
}

interface FirehallClassic {
  title: string;
  searchQuery: string;
  protein: string;
  style: string;
  emoji: string;
  generatorFilters: ClassicGeneratorFilters;
}

const ALL_FIREHALL_CLASSICS: FirehallClassic[] = [
  { title: "Firehall Chili", searchQuery: "beef chili", protein: "Beef", style: "One-Pot", emoji: "🌶️", generatorFilters: { meal_format: "soup_chili", proteins: ["beef"], cuisine_style: "mexican" } },
  { title: "Smash Burgers + Fries", searchQuery: "smash burgers with fries", protein: "Beef", style: "Grill", emoji: "🍔", generatorFilters: { meal_format: "burger", proteins: ["beef"], cuisine_style: "any" } },
  { title: "Taco Night", searchQuery: "ground beef tacos", protein: "Beef", style: "Tacos", emoji: "🌮", generatorFilters: { meal_format: "tacos", proteins: ["beef"], cuisine_style: "mexican" } },
  { title: "BBQ Chicken", searchQuery: "bbq chicken", protein: "Chicken", style: "BBQ", emoji: "🍗", generatorFilters: { meal_format: "plated_main", proteins: ["chicken"], cuisine_style: "bbq" } },
  { title: "Cajun Chicken Pasta", searchQuery: "cajun chicken pasta", protein: "Chicken", style: "Pasta", emoji: "🍝", generatorFilters: { meal_format: "pasta", proteins: ["chicken"], cuisine_style: "cajun" } },
  { title: "Pulled Pork Sandwiches", searchQuery: "pulled pork sandwich", protein: "Pork", style: "Sandwich", emoji: "🥪", generatorFilters: { meal_format: "sandwich", proteins: ["pork"], cuisine_style: "bbq" } },
  { title: "Meatball Subs", searchQuery: "meatball sub sandwich", protein: "Beef", style: "Sandwich", emoji: "🥖", generatorFilters: { meal_format: "sandwich", proteins: ["beef"], cuisine_style: "italian" } },
  { title: "Breakfast for Dinner", searchQuery: "breakfast for dinner eggs bacon", protein: "Mixed", style: "Breakfast", emoji: "🍳", generatorFilters: { meal_format: "breakfast", proteins: ["chicken", "pork"], cuisine_style: "any" } },
  { title: "Loaded Nachos", searchQuery: "loaded nachos with ground beef", protein: "Beef", style: "Snack", emoji: "🧀", generatorFilters: { meal_format: "loaded_fries", proteins: ["beef"], cuisine_style: "mexican" } },
  { title: "Sheet Pan Sausage & Veg", searchQuery: "sheet pan sausage vegetables", protein: "Pork", style: "Sheet Pan", emoji: "🥘", generatorFilters: { meal_format: "sheet_pan", proteins: ["pork"], cuisine_style: "any" } },
  { title: "Mac & Cheese with Protein", searchQuery: "mac and cheese with chicken", protein: "Chicken", style: "Comfort", emoji: "🧈", generatorFilters: { meal_format: "casserole", proteins: ["chicken"], cuisine_style: "any" } },
  { title: "Chicken Parm Pasta", searchQuery: "chicken parmesan pasta", protein: "Chicken", style: "Pasta", emoji: "🍝", generatorFilters: { meal_format: "pasta", proteins: ["chicken"], cuisine_style: "italian" } },
];

function getRotatedClassics(count: number = 8): FirehallClassic[] {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const seed = dayOfYear;
  const shuffled = [...ALL_FIREHALL_CLASSICS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = ((seed * (i + 7)) % (i + 1) + i + 1) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selected: FirehallClassic[] = [];
  const proteinCounts = new Map<string, number>();
  const usedStyles = new Set<string>();
  const MAX_PER_PROTEIN = 2;
  for (const c of shuffled) {
    if (selected.length >= count) break;
    const pCount = proteinCounts.get(c.protein) || 0;
    if (pCount >= MAX_PER_PROTEIN) continue;
    if (usedStyles.has(c.style)) continue;
    selected.push(c);
    proteinCounts.set(c.protein, pCount + 1);
    usedStyles.add(c.style);
  }
  for (const c of shuffled) {
    if (selected.length >= count) break;
    if (selected.includes(c)) continue;
    const pCount = proteinCounts.get(c.protein) || 0;
    if (pCount >= MAX_PER_PROTEIN + 1) continue;
    selected.push(c);
    proteinCounts.set(c.protein, pCount + 1);
  }
  return selected;
}

function MultiToggle({ options, selected, onChange, testIdPrefix }: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  testIdPrefix: string;
}) {
  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(option => {
        const isActive = selected.includes(option);
        return (
          <Badge
            key={option}
            variant={isActive ? "default" : "outline"}
            className={`cursor-pointer select-none capitalize text-xs toggle-elevate ${isActive ? "toggle-elevated bg-primary text-primary-foreground" : ""}`}
            onClick={() => toggle(option)}
            data-testid={`${testIdPrefix}-${option}`}
          >
            {option}
          </Badge>
        );
      })}
    </div>
  );
}

function FilterSection({ icon: Icon, title, children }: { icon: typeof Globe; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <Label className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
        <Icon className="w-3.5 h-3.5 text-primary/70" />
        {title}
      </Label>
      {children}
    </div>
  );
}

export default function ExplorePage() {
  const [, navigate] = useLocation();
  const [filters, setFilters] = useState<ExploreFilters>(() => {
    const defaults: ExploreFilters = {
      freeText: "",
      cuisine: "any",
      mealFormat: "random",
      proteins: ["chicken", "beef"],
      allergens: [],
      appliances: ["stove", "oven"],
      timeAvailable: "any",
      crewSize: 6,
      pantryMode: false,
      pantryIngredients: "",
      vegetarian: false,
    };
    try {
      const saved = localStorage.getItem("explore_filters");
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch {}
    return defaults;
  });

  const [submitted, setSubmitted] = useState(false);
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);

  const lastSourceUrlRef = useRef<string | null>(null);

  const openExploreRecipe = useCallback((rawId: unknown, sourceUrl?: string) => {
    const id = normalizeExploreRecipeId(rawId);
    console.debug("[explore] Recipe card clicked:", { rawId, normalizedId: id, sourceUrl });
    if (id === null) {
      console.warn("[explore] Cannot open recipe — invalid id:", rawId);
      return;
    }
    lastSourceUrlRef.current = sourceUrl || null;
    setSelectedRecipeId(id);
  }, []);
  const [classicLoading, setClassicLoading] = useState<string | null>(null);
  const [favCount] = useState(() => getSavedCount());
  const seenIdsRef = useRef<number[]>((() => {
    try {
      const saved = localStorage.getItem("explore_seen_ids");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(-30);
      }
    } catch {}
    return [];
  })());
  const [discoverRecipes, setDiscoverRecipes] = useState<SearchResult[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [discoverExhausted, setDiscoverExhausted] = useState(false);
  const discoverLoadedIdsRef = useRef<Set<number>>(new Set());

  const addSeenIds = useCallback((ids: number[]) => {
    const prev = seenIdsRef.current;
    const combined = [...prev, ...ids.filter(id => !prev.includes(id))];
    const trimmed = combined.slice(-60);
    seenIdsRef.current = trimmed;
    try { localStorage.setItem("explore_seen_ids", JSON.stringify(trimmed)); } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("explore_filters", JSON.stringify(filters));
    } catch {}
  }, [filters]);

  const wheelClassicTriggered = useRef(false);
  useEffect(() => {
    if (wheelClassicTriggered.current) return;
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("classic");
    if (!slug) return;
    const classic = getWheelClassicBySlug(slug);
    if (!classic) return;
    wheelClassicTriggered.current = true;
    window.history.replaceState({}, "", "/explore");
    navigate(buildPackageUrl(classic));
  }, [navigate]);

  const classicsToShow = useMemo(() => getRotatedClassics(8), []);

  const update = useCallback(<K extends keyof ExploreFilters>(key: K, value: ExploreFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const params = buildSearchParams(filters);
    setSearchParams(params);
    setSubmitted(true);
    setSelectedRecipeId(null);
  }, [filters]);

  const queryString = searchParams?.toString() || "";

  const buildDiscoverUrl = useCallback((batchLimit: number) => {
    const params = new URLSearchParams();
    params.set("limit", String(batchLimit));
    if (filters.vegetarian) params.set("diet", "vegetarian");
    if (filters.allergens.length > 0) {
      const intolerances = filters.allergens
        .map(a => ALLERGEN_TO_INTOLERANCE[a])
        .filter(Boolean)
        .join(",");
      if (intolerances) params.set("intolerances", intolerances);
      const excludeItems = filters.allergens
        .flatMap(a => ALLERGEN_EXCLUDE_MAP[a] || []);
      if (excludeItems.length > 0) params.set("excludeIngredients", excludeItems.join(","));
    }
    const allSeen = [...seenIdsRef.current, ...Array.from(discoverLoadedIdsRef.current)];
    const uniqueSeen = Array.from(new Set(allSeen));
    if (uniqueSeen.length > 0) params.set("seen", uniqueSeen.join(","));
    return params.toString();
  }, [filters.vegetarian, filters.allergens]);

  const [discoverError, setDiscoverError] = useState<string | null>(null);

  const fetchDiscoverBatch = useCallback(async (batchLimit: number, isLoadMore: boolean) => {
    if (isLoadMore) {
      setLoadMoreLoading(true);
    } else {
      setDiscoverLoading(true);
      setDiscoverError(null);
    }
    try {
      const qs = buildDiscoverUrl(batchLimit);
      const res = await fetch(`/api/explore/discover?${qs}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Discovery failed");
      }
      const data = await res.json();
      const newResults: SearchResult[] = (data.results || []).filter(
        (r: SearchResult) =>
          normalizeExploreRecipeId(r.id) !== null &&
          !discoverLoadedIdsRef.current.has(r.id),
      );
      if (newResults.length > 0) {
        addSeenIds(newResults.map(r => r.id));
        for (const r of newResults) discoverLoadedIdsRef.current.add(r.id);
      }
      if (isLoadMore) {
        if (newResults.length > 0) {
          setDiscoverRecipes(prev => [...prev, ...newResults]);
        }
      } else {
        setDiscoverRecipes(newResults);
      }
      if (newResults.length < Math.floor(batchLimit * 0.5)) {
        setDiscoverExhausted(true);
      }
    } catch (err: any) {
      setDiscoverError(err.message || "Failed to load recipes");
    } finally {
      if (isLoadMore) {
        setLoadMoreLoading(false);
      } else {
        setDiscoverLoading(false);
      }
    }
  }, [buildDiscoverUrl, addSeenIds]);

  const initialLoadDone = useRef(false);
  const prevFilterKeyRef = useRef(`${filters.vegetarian}-${filters.allergens.join(",")}`);
  useEffect(() => {
    if (submitted) return;
    const filterKey = `${filters.vegetarian}-${filters.allergens.join(",")}`;
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchDiscoverBatch(12, false);
    } else if (filterKey !== prevFilterKeyRef.current) {
      prevFilterKeyRef.current = filterKey;
      discoverLoadedIdsRef.current.clear();
      setDiscoverExhausted(false);
      fetchDiscoverBatch(12, false);
    }
  }, [submitted, filters.vegetarian, filters.allergens, fetchDiscoverBatch]);

  interface TrendingItem {
    title: string;
    protein: string;
    score: number;
    source: string;
    hit_count: number;
    curatedSlug?: string | null;
    image?: string;
    emoji?: string;
  }
  const { data: trendingData } = useQuery<{ trending: TrendingItem[] }>({
    queryKey: ["/api/explore/trending"],
    queryFn: async () => {
      const res = await fetch("/api/explore/trending");
      if (!res.ok) return { trending: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: searchData, isLoading: searchLoading, error: searchError, refetch: refetchSearch } = useQuery<SearchResponse>({
    queryKey: ["/api/explore/search", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/explore/search?${queryString}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Search failed");
      }
      const data = await res.json();
      if (data.results?.length > 0) {
        addSeenIds(data.results.map((r: SearchResult) => r.id));
      }
      return data;
    },
    enabled: submitted && !!queryString,
    staleTime: 5 * 60 * 1000,
  });

  const detailQueryKey = selectedRecipeId
    ? [`/api/explore/recipe/${selectedRecipeId}?nutrition=true`]
    : ["/api/explore/recipe/_none"];

  const {
    data: recipeDetail,
    isPending: detailPending,
    error: detailError,
    refetch: refetchDetail,
  } = useQuery<RecipeDetail>({
    queryKey: detailQueryKey,
    queryFn: async ({ queryKey }) => {
      const url = String(queryKey[0]);
      const match = url.match(/\/api\/explore\/recipe\/(\d+)/);
      const id = match ? parseInt(match[1], 10) : selectedRecipeId;
      if (!id || id <= 0) {
        throw new Error("Invalid recipe ID. Please pick another recipe from the list.");
      }
      return fetchExploreRecipeDetail(id);
    },
    enabled: selectedRecipeId !== null && selectedRecipeId > 0,
    staleTime: 10 * 60 * 1000,
  });

  const detailLoading = detailPending && !recipeDetail;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.cuisine !== "any") count++;
    if (filters.mealFormat !== "random") count++;
    if (filters.proteins.length > 0) count++;
    if (filters.allergens.length > 0) count++;
    if (filters.appliances.length > 0) count++;
    if (filters.timeAvailable !== "any") count++;
    if (filters.pantryMode) count++;
    if (filters.vegetarian) count++;
    if (filters.crewSize !== 6) count++;
    return count;
  }, [filters]);

  if (selectedRecipeId && recipeDetail) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader activePage="explore" favCount={favCount} />
        <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">
          <Button variant="ghost" className="mb-6 gap-1.5" onClick={() => setSelectedRecipeId(null)} data-testid="button-back-to-results">
            <ChevronLeft className="w-4 h-4" />
            Back to results
          </Button>
          <RecipeDetailView recipe={recipeDetail} crewSize={filters.crewSize} />
        </main>
        <Footer />
      </div>
    );
  }

  if (selectedRecipeId && detailLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader activePage="explore" favCount={favCount} />
        <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">
          <Button variant="ghost" className="mb-6 gap-1.5" onClick={() => setSelectedRecipeId(null)} data-testid="button-back-to-results">
            <ChevronLeft className="w-4 h-4" />
            Back to results
          </Button>
          <div className="space-y-6 animate-pulse" data-testid="explore-detail-skeleton">
            <div className="aspect-[16/9] rounded-xl bg-muted" />
            <div className="h-8 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (selectedRecipeId && detailError && !recipeDetail) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader activePage="explore" favCount={favCount} />
        <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">
          <Button variant="ghost" className="mb-6 gap-1.5" onClick={() => setSelectedRecipeId(null)} data-testid="button-back-to-results">
            <ChevronLeft className="w-4 h-4" />
            Back to results
          </Button>
            <div className="text-center py-16" data-testid="explore-detail-error">
              <p className="text-destructive font-medium">{(detailError as Error).message}</p>
              <p className="text-sm text-muted-foreground mt-2 mb-5">Could not load recipe details.</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center flex-wrap">
                <Button
                  variant="default"
                  onClick={() => refetchDetail()}
                  data-testid="button-retry-detail"
                >
                  Try again
                </Button>
                {lastSourceUrlRef.current && (
                  <Button variant="secondary" asChild data-testid="button-external-recipe">
                    <a href={lastSourceUrlRef.current} target="_blank" rel="noopener noreferrer">
                      View original recipe
                    </a>
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedRecipeId(null)} data-testid="button-back-after-error">
                  Back to results
                </Button>
              </div>
            </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activePage="explore" favCount={favCount} />

      <HeroHeader title="Explore Recipes" subtitle="Search thousands of recipes using your crew's filters" compact />

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSearch} data-testid="form-explore-search">
          <Card className="mb-8">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <SlidersHorizontal className="w-4 h-4 text-primary/70" />
                <h2 className="font-heading text-sm tracking-widest uppercase text-foreground">Search & Filters</h2>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="text-[10px]">{activeFilterCount} active</Badge>
                )}
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={filters.freeText}
                  onChange={(e) => update("freeText", e.target.value)}
                  placeholder="Search keywords (optional — filters below do the heavy lifting)"
                  className="pl-9"
                  data-testid="input-explore-search"
                />
                {filters.freeText && (
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => update("freeText", "")}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <FilterSection icon={Globe} title="Cuisine Style">
                  <Select value={filters.cuisine} onValueChange={(val) => update("cuisine", val)}>
                    <SelectTrigger data-testid="select-explore-cuisine">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any (Random)</SelectItem>
                      <SelectItem value="mediterranean">Mediterranean</SelectItem>
                      <SelectItem value="mexican">Mexican / Tex-Mex</SelectItem>
                      <SelectItem value="italian">Italian-Inspired</SelectItem>
                      <SelectItem value="asian">Asian-Inspired</SelectItem>
                      <SelectItem value="korean">Korean-Inspired</SelectItem>
                      <SelectItem value="thai">Thai-Inspired</SelectItem>
                      <SelectItem value="indian">Indian-Inspired</SelectItem>
                      <SelectItem value="middle_eastern">Middle Eastern</SelectItem>
                      <SelectItem value="bbq">BBQ / Smoky</SelectItem>
                      <SelectItem value="cajun">Cajun / Southern</SelectItem>
                      <SelectItem value="canadian">Canadian Classics</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterSection>

                <FilterSection icon={UtensilsCrossed} title="Meal Format">
                  <Select value={filters.mealFormat} onValueChange={(val) => update("mealFormat", val)}>
                    <SelectTrigger data-testid="select-explore-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">Any Format</SelectItem>
                      <SelectItem value="bowl">Bowl</SelectItem>
                      <SelectItem value="pasta">Pasta</SelectItem>
                      <SelectItem value="sandwich">Sandwich</SelectItem>
                      <SelectItem value="tacos">Tacos</SelectItem>
                      <SelectItem value="skillet">Skillet</SelectItem>
                      <SelectItem value="sheet_pan">Sheet Pan</SelectItem>
                      <SelectItem value="burger">Burger</SelectItem>
                      <SelectItem value="wrap">Wrap</SelectItem>
                      <SelectItem value="casserole">Casserole</SelectItem>
                      <SelectItem value="stir_fry">Stir Fry</SelectItem>
                      <SelectItem value="plated_main">Plated Main</SelectItem>
                      <SelectItem value="salad">Salad</SelectItem>
                      <SelectItem value="soup_chili">Soup / Chili</SelectItem>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="loaded_fries">Loaded Fries</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterSection>

                <FilterSection icon={Clock} title="Time Available">
                  <Select value={filters.timeAvailable} onValueChange={(val) => update("timeAvailable", val)}>
                    <SelectTrigger data-testid="select-explore-time">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterSection>
              </div>

              <div className="border-t border-border/30 mt-6 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FilterSection icon={ChefHat} title="Protein">
                    <MultiToggle
                      options={PROTEIN_OPTIONS}
                      selected={filters.proteins}
                      onChange={(val) => {
                        const wasVeg = filters.proteins.includes("vegetarian");
                        const isNowVeg = val.includes("vegetarian");
                        if (isNowVeg && !wasVeg) {
                          update("proteins", ["vegetarian"]);
                          update("vegetarian", true);
                        } else if (!isNowVeg && wasVeg) {
                          update("proteins", val.filter(p => p !== "vegetarian"));
                          update("vegetarian", false);
                        } else if (isNowVeg) {
                          update("proteins", ["vegetarian"]);
                        } else {
                          update("proteins", val);
                          update("vegetarian", false);
                        }
                      }}
                      testIdPrefix="toggle-explore-protein"
                    />
                  </FilterSection>

                  <FilterSection icon={ShieldAlert} title="Avoid (Allergies)">
                    <MultiToggle
                      options={ALLERGEN_OPTIONS}
                      selected={filters.allergens}
                      onChange={(val) => update("allergens", val)}
                      testIdPrefix="toggle-explore-allergen"
                    />
                    {filters.allergens.length === 0 && (
                      <p className="text-xs text-muted-foreground/60">No restrictions</p>
                    )}
                  </FilterSection>
                </div>
              </div>

              <div className="border-t border-border/30 mt-6 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FilterSection icon={Flame} title="Appliances">
                    <MultiToggle
                      options={APPLIANCE_OPTIONS}
                      selected={filters.appliances}
                      onChange={(val) => update("appliances", val)}
                      testIdPrefix="toggle-explore-appliance"
                    />
                  </FilterSection>

                  <FilterSection icon={Users} title={`Crew Size: ${filters.crewSize}`}>
                    <Slider
                      value={[filters.crewSize]}
                      onValueChange={([val]) => update("crewSize", val)}
                      min={2}
                      max={20}
                      step={1}
                      data-testid="slider-explore-crew"
                    />
                    <p className="text-xs text-muted-foreground/60">Prefer recipes serving ~{filters.crewSize} people</p>
                  </FilterSection>
                </div>
              </div>

              <div className="border-t border-border/30 mt-6 pt-5">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="explore-pantry"
                    checked={filters.pantryMode}
                    onCheckedChange={(checked) => update("pantryMode", !!checked)}
                    data-testid="checkbox-explore-pantry"
                  />
                  <Label htmlFor="explore-pantry" className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground font-semibold cursor-pointer select-none">
                    <Package className="w-3.5 h-3.5 text-primary/70" />
                    Use what's in the fridge
                  </Label>
                </div>
                {filters.pantryMode && (
                  <Textarea
                    value={filters.pantryIngredients}
                    onChange={(e) => update("pantryIngredients", e.target.value)}
                    placeholder="List ingredients you have (comma or newline separated)&#10;e.g. chicken thighs, bell peppers, onions, garlic"
                    rows={3}
                    className="text-sm mt-3"
                    data-testid="textarea-explore-pantry"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3 mb-8">
            <Button type="submit" className="font-heading tracking-wider flex-1 sm:flex-none gap-2" data-testid="button-explore-search">
              <Search className="w-4 h-4" />
              SEARCH RECIPES
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{activeFilterCount} filters</Badge>
              )}
            </Button>
            {submitted && (
              <Button
                type="button"
                variant="outline"
                className="font-heading tracking-wider gap-2"
                onClick={() => { setSubmitted(false); setSearchParams(null); }}
                data-testid="button-explore-clear"
              >
                <X className="w-4 h-4" />
                CLEAR
              </Button>
            )}
          </div>
        </form>

        {!submitted && (
          <div className="mb-10" data-testid="section-firehall-classics">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl" role="img" aria-label="fire">🔥</span>
              <h2 className="font-heading text-lg tracking-wider uppercase">Firehall Classics</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Crowd favourites built for the hall.</p>
            <div className="flex flex-nowrap gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-thin md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
              {classicsToShow.map((classic, i) => {
                const isThisLoading = classicLoading === classic.title;
                return (
                  <button
                    key={classic.title}
                    data-testid={`classic-item-${i}`}
                    disabled={classicLoading !== null}
                    onClick={() => {
                      const slug = resolveCuratedSlugFromTitle(classic.title);
                      if (slug) {
                        navigate(buildPackageUrl({ slug }));
                        return;
                      }
                      setClassicLoading(classic.title);
                      const updated = { ...filters, freeText: classic.searchQuery };
                      setFilters(updated);
                      setSearchParams(buildSearchParams(updated));
                      setSubmitted(true);
                      setClassicLoading(null);
                    }}
                    className="snap-start shrink-0 w-[160px] min-w-[160px] md:w-auto md:min-w-0 md:shrink group relative overflow-hidden rounded-xl border border-border/30 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm p-4 text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 active:translate-y-0 disabled:opacity-60 disabled:cursor-wait"
                  >
                    {isThisLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mb-2 text-primary" />
                    ) : (
                      <span className="text-2xl block mb-2">{classic.emoji}</span>
                    )}
                    <span className="text-sm font-semibold leading-tight block mb-1.5 group-hover:text-primary transition-colors">{classic.title}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground bg-primary/10 px-1.5 py-0.5 rounded-full font-medium">{classic.protein}</span>
                      <span className="text-[10px] text-muted-foreground">{classic.style}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!submitted && trendingData && trendingData.trending.length > 0 && (
          <div className="mb-10" data-testid="section-trending">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-heading text-lg tracking-wider uppercase">Trending in Firehalls</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {trendingData.trending.map((item, i) => (
                <ExploreRecipeCard
                  key={item.curatedSlug || `trend-${i}`}
                  id={100000 + i}
                  title={item.title}
                  image={item.image || ""}
                  readyInMinutes={45}
                  servings={filters.crewSize}
                  summary={item.hit_count > 0 ? `Made ${item.hit_count}× in halls near you` : "Crew favourite this week"}
                  tags={item.protein ? [item.protein, "Trending"] : ["Trending"]}
                  isCurated={!!item.curatedSlug}
                  onClick={() => {
                    if (item.curatedSlug) {
                      navigate(buildPackageUrl({ slug: item.curatedSlug }));
                      return;
                    }
                    const updated = { ...filters, freeText: item.title };
                    setFilters(updated);
                    setSearchParams(buildSearchParams(updated));
                    setSubmitted(true);
                    setSelectedRecipeId(null);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {(searchLoading || (!submitted && discoverLoading && discoverRecipes.length === 0)) && (
          <div data-testid="explore-loading">
            <p className="text-sm text-muted-foreground mb-5">{submitted ? "Searching recipes..." : "Loading discover feed..."}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <ExploreRecipeCardSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {!submitted && discoverError && !discoverLoading && (
          <div className="text-center py-16" data-testid="explore-discover-error">
            <p className="text-destructive font-medium">{discoverError}</p>
            <p className="text-sm text-muted-foreground mt-2">
              <button
                className="underline hover:text-foreground transition-colors"
                onClick={() => fetchDiscoverBatch(12, false)}
                data-testid="button-retry-discover"
              >
                Try again
              </button>
            </p>
          </div>
        )}

        {submitted && queryString && searchError && !selectedRecipeId && (
          <div className="text-center py-16" data-testid="explore-error">
            <p className="text-destructive font-medium">{(searchError as Error).message}</p>
            <p className="text-sm text-muted-foreground mt-2 mb-4">Please try again or adjust your filters.</p>
            <Button variant="outline" size="sm" onClick={() => refetchSearch()} data-testid="button-retry-search">
              Try again
            </Button>
          </div>
        )}

        {!submitted && !discoverLoading && !discoverError && discoverRecipes.length === 0 && (
          <div className="text-center py-16" data-testid="explore-discover-empty">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/25 mb-4" />
            <p className="text-foreground font-heading tracking-wide">No recipes in the feed right now</p>
            <p className="text-sm text-muted-foreground mt-2 mb-5">The API may be busy — refresh to load a new batch.</p>
            <Button variant="outline" onClick={() => fetchDiscoverBatch(12, false)} data-testid="button-refresh-discover-empty">
              Refresh feed
            </Button>
          </div>
        )}

        {!submitted && !discoverLoading && discoverRecipes.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary/60" />
                <p className="text-sm text-muted-foreground" data-testid="text-discover-label">
                  {discoverRecipes.length} recipes to explore
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => {
                  discoverLoadedIdsRef.current.clear();
                  setDiscoverExhausted(false);
                  fetchDiscoverBatch(12, false);
                }}
                data-testid="button-refresh-discover"
              >
                <Sparkles className="w-3 h-3" />
                Refresh
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="explore-discover-grid">
              {discoverRecipes
                .filter((r) => normalizeExploreRecipeId(r.id) !== null)
                .map((result) => (
                <ExploreRecipeCard
                  key={result.id}
                  id={result.id}
                  title={result.title}
                  image={result.image}
                  readyInMinutes={result.readyInMinutes}
                  servings={filters.crewSize}
                  summary={stripHtml(result.summary || "")}
                  tags={inferRecipeTags(result)}
                  onClick={() => openExploreRecipe(result.id, result.sourceUrl)}
                />
              ))}
            </div>
            {!discoverExhausted && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 px-8"
                  onClick={() => fetchDiscoverBatch(10, true)}
                  disabled={loadMoreLoading}
                  data-testid="button-load-more"
                >
                  {loadMoreLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ChefHat className="w-4 h-4" />
                      Load More Recipes
                    </>
                  )}
                </Button>
              </div>
            )}
            {discoverExhausted && discoverRecipes.length > 12 && (
              <p className="text-center text-xs text-muted-foreground/60 mt-6" data-testid="text-discover-exhausted">
                You've explored all available recipes. Hit Refresh for a new set!
              </p>
            )}
          </>
        )}

        {!searchLoading && searchData && submitted && (
          <>
            <div className="mb-5">
              <p className="text-sm text-muted-foreground" data-testid="text-result-count">
                {searchData.totalResults > 0 ? `${searchData.results.length} recipes found` : "No recipes found"}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="explore-results-grid">
              {searchData.results.map((result) => (
                <ExploreRecipeCard
                  key={result._firehallFallback ? `fb-${result.title}` : result.id}
                  id={result.id}
                  title={result.title}
                  image={result.image}
                  readyInMinutes={result.readyInMinutes}
                  servings={filters.crewSize}
                  summary={stripHtml(result.summary || "")}
                  tags={inferRecipeTags(result)}
                  isFirehallFallback={result._firehallFallback}
                  onClick={() => {
                    if (result._firehallFallback) {
                      window.location.href = "/";
                    } else {
                      const slug = resolveCuratedSlugFromTitle(result.title);
                      if (slug) {
                        navigate(buildPackageUrl({ slug }));
                      } else {
                        openExploreRecipe(result.id, result.sourceUrl);
                      }
                    }
                  }}
                />
              ))}
            </div>
            {searchData.results.length === 0 && (
              <div className="text-center py-16">
                <Search className="w-14 h-14 mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground text-lg font-heading tracking-wide">NO RECIPES FOUND</p>
                <p className="text-sm text-muted-foreground/60 mt-2">Try loosening your filters or removing restrictions.</p>
              </div>
            )}
          </>
        )}

        {!submitted && discoverRecipes.length === 0 && !discoverLoading && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/[0.07] mb-5">
              <Utensils className="w-9 h-9 text-primary/40" />
            </div>
            <p className="text-foreground text-lg font-heading tracking-wide">SET YOUR FILTERS AND HIT SEARCH</p>
            <p className="text-sm text-muted-foreground/60 mt-2 max-w-sm mx-auto">Your crew's filters map to real recipe results from thousands of options</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}


function RecipeDetailView({ recipe, crewSize }: { recipe: RecipeDetail; crewSize: number }) {
  const [saved, setSaved] = useState(() => {
    const client = spoonacularToClientRecipe(recipe, crewSize);
    return isMealSaved(client);
  });
  const [emailOpen, setEmailOpen] = useState(false);
  const [shoppingOpen, setShoppingOpen] = useState(false);

  const clientRecipe = useMemo(() => spoonacularToClientRecipe(recipe, crewSize), [recipe, crewSize]);
  const shoppingList = useMemo(
    () => buildShoppingListFromClientMeal(clientRecipe, {
      useWhatWeHave: false,
      budgetLevel: "standard",
    }),
    [clientRecipe],
  );

  const handleSave = () => {
    const result = saveMeal(clientRecipe);
    if (result.saved || result.duplicate) {
      setSaved(true);
    }
  };

  const handlePrint = () => {
    const html = buildPrintHtml(clientRecipe, crewSize);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 300);
    }
  };

  return (
    <div className="space-y-6" data-testid="explore-recipe-detail">
      {recipe.image && (
        <div className="rounded-md overflow-hidden max-h-[400px]">
          <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div>
        <h1 className="font-heading text-2xl sm:text-3xl tracking-wide text-foreground mb-3" data-testid="text-detail-title">
          {recipe.title}
        </h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          {recipe.readyInMinutes > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary/60" />
              {recipe.readyInMinutes} min
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary/60" />
            {crewSize} servings
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap mb-5">
          {recipe.cuisines.map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
          {recipe.diets.map(d => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}
          {recipe.dishTypes.slice(0, 3).map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
        </div>
        {recipe.summary && (
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-detail-summary">{stripHtml(recipe.summary)}</p>
        )}
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary mt-3 hover:underline"
            data-testid="link-detail-source"
          >
            View full recipe on source site →
          </a>
        )}
      </div>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saved}
              className={`justify-start gap-2 ${saved ? "bg-primary/20 text-primary border-primary/30" : ""}`}
              data-testid="button-explore-save"
            >
              {saved ? <Heart className="w-4 h-4 fill-current flex-shrink-0" /> : <BookmarkPlus className="w-4 h-4 flex-shrink-0" />}
              <span className="truncate">{saved ? "Saved" : "Save"}</span>
            </Button>
            <Button variant="outline" onClick={handlePrint} className="justify-start gap-2" data-testid="button-explore-print">
              <Printer className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Print</span>
            </Button>
            <Button variant="outline" onClick={() => setEmailOpen(true)} className="justify-start gap-2" data-testid="button-explore-email">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Email</span>
            </Button>
            <Button onClick={() => setShoppingOpen(true)} className="justify-start gap-2" data-testid="button-explore-shopping">
              <List className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Shopping List</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {recipe.macros.calories > 0 && (
        <Card>
          <CardContent className="p-4 sm:p-5">
            <h3 className="font-heading text-sm tracking-widest uppercase text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary/60" />
              Nutrition per Serving
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-xl font-bold text-foreground" data-testid="text-detail-calories">{recipe.macros.calories}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">Calories</p>
              </div>
              <div>
                <p className="text-xl font-bold text-foreground" data-testid="text-detail-protein">{recipe.macros.protein_g}g</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">Protein</p>
              </div>
              <div>
                <p className="text-xl font-bold text-foreground" data-testid="text-detail-carbs">{recipe.macros.carbs_g}g</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">Carbs</p>
              </div>
              <div>
                <p className="text-xl font-bold text-foreground" data-testid="text-detail-fat">{recipe.macros.fat_g}g</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">Fat</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 sm:p-5">
          <h3 className="font-heading text-sm tracking-widest uppercase text-foreground mb-4 flex items-center gap-2">
            <ChefHat className="w-3.5 h-3.5 text-primary/60" />
            Ingredients
          </h3>
          <ul className="space-y-2" data-testid="section-detail-ingredients">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5 flex-shrink-0" />
                {ing.original}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {recipe.steps.length > 0 && (
        <Card>
          <CardContent className="p-4 sm:p-5">
            <h3 className="font-heading text-sm tracking-widest uppercase text-foreground mb-4 flex items-center gap-2">
              <Utensils className="w-3.5 h-3.5 text-primary/60" />
              Instructions
            </h3>
            <ol className="space-y-4" data-testid="section-detail-steps">
              {recipe.steps.map((step) => (
                <li key={step.number} className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                    {step.number}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed pt-1">{step.step}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <EmailModal
        open={emailOpen}
        onOpenChange={setEmailOpen}
        recipe={clientRecipe}
        crewSize={crewSize}
        healthinessLevel="balanced"
      />
      <ShoppingListModal
        open={shoppingOpen}
        onOpenChange={setShoppingOpen}
        shoppingList={shoppingList}
        recipeTitle={recipe.title}
        generatorType="meal"
      />
    </div>
  );
}

function Footer() {
  return (
    <footer className="text-center py-6 mt-8 border-t border-border/20">
      <p className="text-xs text-muted-foreground/50">
        Powered by{" "}
        <a href="https://www.lightsandsirensco.com" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors" data-testid="link-attribution">
          Lights &amp; Sirens Co.
        </a>
      </p>
    </footer>
  );
}
