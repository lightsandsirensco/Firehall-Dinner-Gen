import { useState, useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Users,
  ChevronLeft,
  ChefHat,
  Heart,
  Printer,
  Mail,
  List,
  BookmarkPlus,
  Sparkles,
  Utensils,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getSavedCount, saveMeal, isMealSaved } from "@/lib/saved-meals";
import { buildShoppingListFromClientMeal } from "@/lib/shopping-list";
import { EmailModal } from "@/components/email-modal";
import { ShoppingListModal } from "@/components/shopping-list-modal";
import { buildPrintHtml } from "@/components/recipe-card";
import { fetchExploreRecipeDetail, normalizeExploreRecipeId } from "@/lib/explore-api";
import { stripHtml } from "@/lib/text";
import {
  type ExploreRecipeCard,
  ExploreRecipeCardRegistry,
  mergeDetailWithCardPreview,
} from "@/lib/explore-recipe";
import { ExploreRecipeImage } from "@/components/explore-recipe-image";
import type { ClientRecipeResponse, ClientIngredient } from "@shared/schema";

const DEFAULT_CREW_SIZE = 6;

interface RecipeDetail {
  id: number;
  title: string;
  image: string;
  imageAlt?: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  summary: string;
  cuisines: string[];
  diets: string[];
  dishTypes: string[];
  ingredients: { name: string; amount: number; unit: string; original: string }[];
  steps: { number: number; heading?: string; step: string }[];
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

  const ingredients: ClientIngredient[] = detail.ingredients.map((ing) => ({
    name: ing.name,
    qty: roundQty(ing.amount),
    unit: ing.unit,
    category: inferCategory(ing.name),
  }));

  const proteinIng = ingredients.find((i) => i.category === "Proteins");
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
    steps: detail.steps.map((s) => {
      const heading = s.heading?.trim() || `Step ${s.number}`;
      let heat = "";
      let minutes = 0;
      const parenMatch = heading.match(/\(([^)]+)\)\s*$/);
      if (parenMatch) {
        const parts = parenMatch[1].split(",").map((p) => p.trim());
        if (parts.length >= 2) {
          heat = parts[0];
          const timeMatch = parts[1].match(/(\d+)[–\-](\d+)|(\d+)/);
          if (timeMatch) {
            const lo = parseInt(timeMatch[1] || timeMatch[3] || "0", 10);
            const hi = timeMatch[2] ? parseInt(timeMatch[2], 10) : lo;
            minutes = Math.round((lo + hi) / 2);
          }
        } else if (parts.length === 1) {
          heat = parts[0];
        }
      }
      return {
        n: s.number,
        title: heading,
        heat,
        minutes,
        instructions: s.step,
      };
    }),
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
      key_ingredients: detail.ingredients.slice(0, 5).map((i) => i.name),
      high_protein: detail.macros.protein_g >= 25,
      high_fiber: false,
      quick_cleanup: detail.readyInMinutes <= 30,
    },
    _id: `spoonacular-${detail.id}`,
    _signature: `spoonacular-${detail.id}`,
  };
}

export interface ExploreRecipeDetailPageProps {
  registryRef: RefObject<ExploreRecipeCardRegistry>;
}

export function ExploreRecipeDetailPage({ registryRef }: ExploreRecipeDetailPageProps) {
  const [, navigate] = useLocation();
  const [recipeRouteMatch, recipeRouteParams] = useRoute("/explore/recipe/:id");
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [selectedRecipePreview, setSelectedRecipePreview] = useState<ExploreRecipeCard | null>(null);
  const lastSourceUrlRef = useRef<string | null>(null);
  const favCount = getSavedCount();

  const closeRecipeDetail = useCallback(() => {
    setSelectedRecipeId(null);
    setSelectedRecipePreview(null);
    navigate("/explore");
  }, [navigate]);

  const lookupHints = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      slug: params.get("slug") || undefined,
      curatedRecipeId: params.get("cid") || undefined,
    };
  }, [recipeRouteParams?.id]);

  useEffect(() => {
    if (!recipeRouteMatch || !recipeRouteParams?.id) return;
    const id = normalizeExploreRecipeId(recipeRouteParams.id);
    if (id === null) {
      console.warn("[explore] Invalid route id:", recipeRouteParams.id);
      return;
    }
    if (selectedRecipeId === id) return;

    if (import.meta.env.DEV) {
      console.debug("[explore] detail route", {
        routeId: recipeRouteParams.id,
        parsedId: id,
        lookupHints,
      });
    }

    const cached = registryRef.current?.get(id);
    if (cached) {
      setSelectedRecipePreview(cached);
      lastSourceUrlRef.current = cached.sourceUrl || null;
    }
    setSelectedRecipeId(id);
  }, [recipeRouteMatch, recipeRouteParams?.id, selectedRecipeId, registryRef, lookupHints]);

  const detailQueryKey = selectedRecipeId
    ? [
        `/api/explore/recipe/${selectedRecipeId}?nutrition=true`,
        lookupHints.slug ?? "",
        lookupHints.curatedRecipeId ?? "",
      ]
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
      return fetchExploreRecipeDetail(id, lookupHints);
    },
    enabled: selectedRecipeId !== null && selectedRecipeId > 0,
    staleTime: 10 * 60 * 1000,
  });

  const matchedDetail =
    recipeDetail && selectedRecipeId !== null ? recipeDetail : undefined;

  const detailPreview =
    selectedRecipePreview?.id === selectedRecipeId
      ? selectedRecipePreview
      : registryRef.current?.get(selectedRecipeId ?? -1) ?? null;

  const detailLoading = detailPending && !matchedDetail;

  if (selectedRecipeId && matchedDetail) {
    const displayDetail = mergeDetailWithCardPreview(
      { ...matchedDetail, imageAlt: matchedDetail.imageAlt || matchedDetail.title },
      detailPreview,
    ) as RecipeDetail;
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader activePage="explore" favCount={favCount} />
        <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">
          <Button
            variant="ghost"
            className="mb-6 gap-1.5"
            onClick={closeRecipeDetail}
            data-testid="button-back-to-results"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Explore
          </Button>
          <RecipeDetailView recipe={displayDetail} crewSize={DEFAULT_CREW_SIZE} />
        </main>
        <ExploreDetailFooter />
      </div>
    );
  }

  if (selectedRecipeId && detailLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader activePage="explore" favCount={favCount} />
        <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">
          <Button
            variant="ghost"
            className="mb-6 gap-1.5"
            onClick={closeRecipeDetail}
            data-testid="button-back-to-results"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Explore
          </Button>
          <div className="space-y-6" data-testid="explore-detail-skeleton">
            {detailPreview ? (
              <>
                <div className="rounded-2xl overflow-hidden ring-1 ring-border/40">
                  <ExploreRecipeImage recipe={detailPreview} variant="detail" />
                </div>
                <h1 className="font-heading text-2xl tracking-wide text-foreground">{detailPreview.title}</h1>
              </>
            ) : (
              <div className="aspect-[16/9] rounded-xl bg-muted animate-pulse" />
            )}
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
          </div>
        </main>
        <ExploreDetailFooter />
      </div>
    );
  }

  if (selectedRecipeId && detailError && !matchedDetail) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader activePage="explore" favCount={favCount} />
        <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">
          <Button
            variant="ghost"
            className="mb-6 gap-1.5"
            onClick={closeRecipeDetail}
            data-testid="button-back-to-results"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Explore
          </Button>
          <div className="text-center py-16" data-testid="explore-detail-error">
            <p className="text-destructive font-medium">
              {(detailError as Error).message || "Could not load this recipe."}
            </p>
            <p className="text-sm text-muted-foreground mt-2 mb-5">
              {detailPreview?.title
                ? `We couldn't load full details for "${detailPreview.title}".`
                : "Could not load recipe details."}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center flex-wrap">
              <Button variant="default" onClick={() => refetchDetail()} data-testid="button-retry-detail">
                Try again
              </Button>
              {lastSourceUrlRef.current && (
                <Button variant="secondary" asChild data-testid="button-external-recipe">
                  <a href={lastSourceUrlRef.current} target="_blank" rel="noopener noreferrer">
                    View original recipe
                  </a>
                </Button>
              )}
              <Button variant="outline" onClick={closeRecipeDetail} data-testid="button-back-after-error">
                Back to Explore
              </Button>
            </div>
          </div>
        </main>
        <ExploreDetailFooter />
      </div>
    );
  }

  return null;
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
    () =>
      buildShoppingListFromClientMeal(clientRecipe, {
        useWhatWeHave: false,
        budgetLevel: "standard",
      }),
    [clientRecipe],
  );

  const handleSave = () => {
    const result = saveMeal(clientRecipe);
    if (result.saved || result.duplicate) setSaved(true);
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

  const heroRecipe: ExploreRecipeCard = {
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
    imageAlt: recipe.imageAlt || recipe.title,
    readyInMinutes: recipe.readyInMinutes,
    servings: recipe.servings,
    summary: recipe.summary,
    sourceUrl: recipe.sourceUrl,
    cuisines: recipe.cuisines,
    diets: recipe.diets,
  };

  return (
    <div className="space-y-6" data-testid="explore-recipe-detail">
      <div className="rounded-2xl overflow-hidden ring-1 ring-border/40 shadow-xl shadow-black/20 max-h-[min(420px,55vh)]">
        <ExploreRecipeImage recipe={heroRecipe} variant="detail" />
      </div>

      <div>
        <h1
          className="font-heading text-2xl sm:text-3xl tracking-wide text-foreground mb-3"
          data-testid="text-detail-title"
        >
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
          {recipe.cuisines.map((c) => (
            <Badge key={c} variant="outline" className="text-xs">
              {c}
            </Badge>
          ))}
          {recipe.diets.map((d) => (
            <Badge key={d} variant="secondary" className="text-xs">
              {d}
            </Badge>
          ))}
          {recipe.dishTypes.slice(0, 3).map((t) => (
            <Badge key={t} variant="outline" className="text-xs">
              {t}
            </Badge>
          ))}
        </div>
        {recipe.summary && (
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-detail-summary">
            {stripHtml(recipe.summary)}
          </p>
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
              {saved ? (
                <Heart className="w-4 h-4 fill-current flex-shrink-0" />
              ) : (
                <BookmarkPlus className="w-4 h-4 flex-shrink-0" />
              )}
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
                <p className="text-xl font-bold text-foreground" data-testid="text-detail-calories">
                  {recipe.macros.calories}
                </p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">Calories</p>
              </div>
              <div>
                <p className="text-xl font-bold text-foreground" data-testid="text-detail-protein">
                  {recipe.macros.protein_g}g
                </p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">Protein</p>
              </div>
              <div>
                <p className="text-xl font-bold text-foreground" data-testid="text-detail-carbs">
                  {recipe.macros.carbs_g}g
                </p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">Carbs</p>
              </div>
              <div>
                <p className="text-xl font-bold text-foreground" data-testid="text-detail-fat">
                  {recipe.macros.fat_g}g
                </p>
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
            <ol className="space-y-5" data-testid="section-detail-steps">
              {recipe.steps.map((step) => (
                <li key={step.number} className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                    {step.number}
                  </span>
                  <div className="min-w-0 pt-0.5 space-y-1.5">
                    {step.heading && step.heading !== `Step ${step.number}` && (
                      <p className="text-sm font-semibold text-foreground leading-snug">{step.heading}</p>
                    )}
                    <p className="text-sm text-foreground/90 leading-relaxed">{step.step}</p>
                  </div>
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

function ExploreDetailFooter() {
  return (
    <footer className="text-center py-6 mt-8 border-t border-border/20">
      <p className="text-xs text-muted-foreground/50">
        Powered by{" "}
        <a
          href="https://www.lightsandsirensco.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-muted-foreground transition-colors"
          data-testid="link-attribution"
        >
          Lights &amp; Sirens Co.
        </a>
      </p>
    </footer>
  );
}
