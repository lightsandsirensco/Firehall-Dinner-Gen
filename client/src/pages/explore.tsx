import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame, Search, Clock, Users, ChevronLeft, X, Loader2, Heart, ShieldAlert, Globe, UtensilsCrossed, ChefHat, Package, Leaf, Printer, Mail, List, BookmarkPlus, Sparkles, SlidersHorizontal, Utensils } from "lucide-react";
import { Link } from "wouter";
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
import { buildShoppingListFromClientMeal } from "@/lib/shopping-list";
import { EmailModal } from "@/components/email-modal";
import { ShoppingListModal } from "@/components/shopping-list-modal";
import type { ClientRecipeResponse, ClientIngredient } from "@shared/schema";

interface SearchResult {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  summary: string;
  cuisines?: string[];
  diets?: string[];
  _firehallFallback?: boolean;
}

interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  _source?: "spoonacular" | "firehall" | "none";
  _relaxed?: string;
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
  const ingredients: ClientIngredient[] = detail.ingredients.map(ing => ({
    name: ing.name,
    qty: ing.amount,
    unit: ing.unit,
    category: inferCategory(ing.name),
  }));

  const proteinIng = ingredients.find(i => i.category === "Proteins");
  const chosenProtein = proteinIng?.name || "mixed";

  return {
    title: detail.title,
    meal_format: detail.dishTypes?.[0] || "dinner",
    servings: detail.servings || crewSize,
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
    <p class="meta">${recipe.readyInMinutes} min · ${recipe.servings} servings · Crew of ${crewSize}</p>
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
  stir_fry: "stir fry",
  soup_chili: "soup stew chili",
  breakfast: "breakfast",
  loaded_fries: "loaded fries",
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

  params.set("number", "5");
  params.set("_crewSize", String(crew));

  return params;
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
  const [favCount] = useState(() => getSavedCount());

  useEffect(() => {
    try {
      localStorage.setItem("explore_filters", JSON.stringify(filters));
    } catch {}
  }, [filters]);

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

  const { data: searchData, isLoading: searchLoading, error: searchError } = useQuery<SearchResponse>({
    queryKey: ["/api/explore/search", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/explore/search?${queryString}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Search failed");
      }
      return res.json();
    },
    enabled: submitted && !!queryString,
    staleTime: 5 * 60 * 1000,
  });

  const { data: recipeDetail, isLoading: detailLoading, error: detailError } = useQuery<RecipeDetail>({
    queryKey: ["/api/explore/recipe", selectedRecipeId],
    queryFn: async () => {
      const res = await fetch(`/api/explore/recipe/${selectedRecipeId}?nutrition=true`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load recipe");
      }
      return res.json();
    },
    enabled: !!selectedRecipeId,
    staleTime: 10 * 60 * 1000,
  });

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
        <ExploreNav favCount={favCount} />
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

  if (selectedRecipeId && (detailLoading || detailError)) {
    return (
      <div className="min-h-screen bg-background">
        <ExploreNav favCount={favCount} />
        <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">
          <Button variant="ghost" className="mb-6 gap-1.5" onClick={() => setSelectedRecipeId(null)} data-testid="button-back-to-results">
            <ChevronLeft className="w-4 h-4" />
            Back to results
          </Button>
          {detailLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="text-center py-16" data-testid="explore-detail-error">
              <p className="text-destructive font-medium">{(detailError as Error).message}</p>
              <p className="text-sm text-muted-foreground mt-2 mb-5">Could not load recipe details.</p>
              <Button variant="outline" onClick={() => setSelectedRecipeId(null)} data-testid="button-back-after-error">
                Back to results
              </Button>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ExploreNav favCount={favCount} />

      <header className="relative overflow-visible border-b border-border/30">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] to-transparent pointer-events-none" />
        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center">
          <div className="inline-flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary/60" />
            <span className="text-[11px] uppercase tracking-widest text-primary/70 font-semibold">Recipe Discovery</span>
            <Sparkles className="w-5 h-5 text-primary/60" />
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl leading-none tracking-wide text-foreground" data-testid="text-explore-title">
            EXPLORE RECIPES
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-3 max-w-xl mx-auto leading-relaxed">
            Search thousands of recipes using your crew's filters. Match by cuisine, format, allergies, time, and what's in the fridge.
          </p>
        </div>
      </header>

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
                      <SelectItem value="burger">Burger</SelectItem>
                      <SelectItem value="tacos">Tacos</SelectItem>
                      <SelectItem value="wrap">Wrap</SelectItem>
                      <SelectItem value="bowl">Bowl</SelectItem>
                      <SelectItem value="pasta">Pasta</SelectItem>
                      <SelectItem value="salad">Salad</SelectItem>
                      <SelectItem value="sheet_pan">Sheet Pan</SelectItem>
                      <SelectItem value="stir_fry">Stir Fry</SelectItem>
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

        {searchLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3" data-testid="explore-loading">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Searching recipes...</p>
          </div>
        )}

        {searchError && (
          <div className="text-center py-16" data-testid="explore-error">
            <p className="text-destructive font-medium">{(searchError as Error).message}</p>
            <p className="text-sm text-muted-foreground mt-2">Please try again or adjust your filters.</p>
          </div>
        )}

        {!searchLoading && searchData && submitted && (
          <>
            <div className="flex items-center justify-between gap-3 mb-5">
              <p className="text-sm text-muted-foreground" data-testid="text-result-count">
                {searchData.totalResults > 0 ? `${searchData.totalResults.toLocaleString()} recipes found` : "No recipes found"}
              </p>
              {searchData._source && searchData._source !== "none" && (
                <Badge variant="outline" className="text-[10px]">
                  {searchData._source === "firehall" ? "Firehall AI" : "Spoonacular"}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="explore-results-grid">
              {searchData.results.map((result) => (
                <Card
                  key={result._firehallFallback ? `fb-${result.title}` : result.id}
                  className="overflow-visible cursor-pointer hover-elevate transition-all duration-200"
                  onClick={() => {
                    if (result._firehallFallback) {
                      window.location.href = "/";
                    } else {
                      setSelectedRecipeId(result.id);
                    }
                  }}
                  data-testid={`card-explore-result-${result.id}`}
                >
                  {result.image && (
                    <div className="aspect-[16/10] overflow-hidden rounded-t-md">
                      <img src={result.image} alt={result.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <CardContent className="p-4 sm:p-5">
                    {result._firehallFallback && (
                      <Badge variant="secondary" className="text-[10px] mb-2.5">
                        <Flame className="w-3 h-3 mr-1" />
                        Firehall AI Recipe
                      </Badge>
                    )}
                    <h3 className="font-heading text-base tracking-wide text-foreground line-clamp-2 mb-2" data-testid={`text-result-title-${result.id}`}>
                      {result.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      {result.readyInMinutes > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {result.readyInMinutes} min
                        </span>
                      )}
                      {result.servings > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {result.servings} servings
                        </span>
                      )}
                    </div>
                    {result.summary && (
                      <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-3 leading-relaxed">{result.summary}</p>
                    )}
                    <div className="flex gap-1.5 flex-wrap">
                      {(result.cuisines || []).slice(0, 2).map(c => (
                        <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                      ))}
                      {(result.diets || []).slice(0, 2).map(d => (
                        <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
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

        {!submitted && (
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

function ExploreNav({ favCount }: { favCount: number }) {
  return (
    <div className="bg-background/95 backdrop-blur-sm border-b border-border/30 sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <nav className="flex items-center justify-between gap-3 py-3" data-testid="nav-links">
          <div className="flex items-center gap-2.5">
            <Flame className="w-7 h-7 flex-shrink-0" style={{ color: "#C62828" }} />
            <span className="font-heading text-lg leading-none tracking-wide text-foreground hidden sm:inline">FIREHALL MEALS</span>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap">
            <Link href="/" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors font-medium px-2 sm:px-3 py-1.5" data-testid="nav-link-meals">
              Generator
            </Link>
            <span className="text-muted-foreground/20 text-xs">|</span>
            <Link href="/pizza" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors font-medium px-2 sm:px-3 py-1.5" data-testid="nav-link-pizza">
              Pizza
            </Link>
            <span className="text-muted-foreground/20 text-xs">|</span>
            <span className="text-xs uppercase tracking-wider text-primary font-semibold px-2 sm:px-3 py-1.5" data-testid="nav-link-explore-active">
              Explore
            </span>
            <span className="text-muted-foreground/20 text-xs">|</span>
            <Link href="/favorites" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors font-medium px-2 sm:px-3 py-1.5 flex items-center gap-1" data-testid="nav-link-favorites">
              <Heart className="w-3 h-3" />
              Favorites
              {favCount > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 min-w-[16px] leading-none">{favCount}</Badge>
              )}
            </Link>
          </div>
        </nav>
      </div>
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
  const shoppingList = useMemo(() => buildShoppingListFromClientMeal(clientRecipe), [clientRecipe]);

  const handleSave = () => {
    const result = saveMeal(clientRecipe);
    if (result.saved || result.duplicate) {
      setSaved(true);
    }
  };

  const handlePrint = () => {
    const html = buildExplorePrintHtml(recipe, crewSize);
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
            {recipe.servings} servings
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap mb-5">
          {recipe.cuisines.map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
          {recipe.diets.map(d => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}
          {recipe.dishTypes.slice(0, 3).map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
        </div>
        {recipe.summary && (
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-detail-summary">{recipe.summary}</p>
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
            <div className="grid grid-cols-4 gap-3 text-center">
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
