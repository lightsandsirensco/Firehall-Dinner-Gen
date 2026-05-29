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
import {
  fetchExploreRecipeDetail,
  normalizeExploreRecipeId,
  type ExploreRecipeDetail,
} from "@/lib/explore-api";
import { stripHtml } from "@/lib/text";
import {
  type ExploreRecipeCard,
  ExploreRecipeCardRegistry,
  mergeDetailWithCardPreview,
} from "@/lib/explore-recipe";
import { ExploreRecipeImage } from "@/components/explore-recipe-image";
import { HERO_CONTENT_FADE } from "@/lib/hero-image";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";
import { FoodImageSkeleton } from "@/components/mobile/loading-skeletons";
import type { ClientRecipeResponse, ClientIngredient } from "@shared/schema";

const DEFAULT_CREW_SIZE = 6;

function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (/chicken|beef|pork|turkey|fish|shrimp|salmon|tuna|sausage|bacon|lamb|steak/.test(n)) return "Proteins";
  if (/milk|cream|cheese|butter|yogurt|sour cream/.test(n)) return "Dairy";
  if (/onion|garlic|pepper|tomato|lettuce|spinach|broccoli|carrot|celery|potato|mushroom|zucchini|corn|bean|pea|avocado|cilantro|basil|parsley|lime|lemon/.test(n)) return "Produce";
  if (/oil|vinegar|sauce|salt|pepper|cumin|paprika|oregano|thyme|chili|sugar|honey|flour|stock|broth/.test(n)) return "Pantry";
  if (/rice|pasta|noodle|bread|tortilla|bun/.test(n)) return "Grains";
  return "Other";
}

function spoonacularToClientRecipe(detail: ExploreRecipeDetail, crewSize: number): ClientRecipeResponse {
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
    meal_format: detail.dishTypes?.[0] || "plated_main",
    servings: crewSize,
    tags: [...detail.cuisines, ...detail.diets],
    timing: {
      prep_min: Math.max(5, Math.round(detail.readyInMinutes * 0.3)),
      cook_min: Math.max(10, Math.round(detail.readyInMinutes * 0.7)),
      total_min: detail.readyInMinutes || 30,
    },
    protein_safety: {
      protein: chosenProtein,
      internal_temp_f: 165,
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
  } = useQuery<ExploreRecipeDetail>({
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
    );
    return (
      <div className={app.page}>
        <SiteHeader activePage="explore" favCount={favCount} />
        <main className={cn(app.mainDetail, "pb-safe-cta sm:pb-8")}>
          <RecipeDetailView
            recipe={displayDetail}
            crewSize={DEFAULT_CREW_SIZE}
            onBack={closeRecipeDetail}
          />
        </main>
        <ExploreDetailFooter className="hidden sm:block" />
      </div>
    );
  }

  if (selectedRecipeId && detailLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background overflow-x-hidden">
        <SiteHeader activePage="explore" favCount={favCount} />
        <main className="max-w-[900px] mx-auto">
          <div className="relative">
            {detailPreview ? (
              <ExploreRecipeImage recipe={detailPreview} variant="detail" priority />
            ) : (
              <FoodImageSkeleton layout="detail" />
            )}
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-3 left-3 z-20 gap-1.5 bg-black/50 backdrop-blur-md border-white/10 text-white min-h-10"
              onClick={closeRecipeDetail}
            >
              <ChevronLeft className="w-4 h-4" />
              Explore
            </Button>
          </div>
          <div className="px-4 py-6 space-y-4" data-testid="explore-detail-skeleton">
            <div className="h-9 skeleton-shimmer rounded-lg w-[85%]" />
            <div className="flex gap-2">
              <div className="h-8 w-24 skeleton-shimmer rounded-full" />
              <div className="h-8 w-20 skeleton-shimmer rounded-full" />
            </div>
            <div className="h-4 skeleton-shimmer rounded w-full" />
            <div className="h-4 skeleton-shimmer rounded w-2/3" />
          </div>
        </main>
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

function RecipeDetailView({
  recipe,
  crewSize,
  onBack,
}: {
  recipe: ExploreRecipeDetail;
  crewSize: number;
  onBack: () => void;
}) {
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
    imageryStatus: recipe.imageryStatus,
    heldImageryLabel: recipe.heldImageryLabel,
  };

  const prepMin = Math.max(5, Math.round(recipe.readyInMinutes * 0.3));
  const cookMin = Math.max(10, recipe.readyInMinutes - prepMin);

  return (
    <div className={cn("fade-up", app.mealReveal)} data-testid="explore-recipe-detail">
      <div className="relative sm:rounded-2xl sm:overflow-hidden sm:ring-1 sm:ring-border/40 sm:shadow-xl sm:shadow-black/20 sm:mt-3 sm:mx-0">
        <ExploreRecipeImage recipe={heroRecipe} variant="detail" priority bleed />
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-[4]",
            HERO_CONTENT_FADE,
          )}
          aria-hidden
        />
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-3 left-3 z-20 gap-1.5 bg-black/50 backdrop-blur-md border-white/10 text-white hover:bg-black/70 min-h-10 touch-manipulation"
          onClick={onBack}
          data-testid="button-back-to-results"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-xs font-semibold">Explore</span>
        </Button>
      </div>

      <div className="px-4 sm:px-6 pt-5 sm:pt-6 space-y-6">
        <div>
          <h1
            className={cn(app.titleMeal, "mb-3")}
            data-testid="text-detail-title"
          >
            {recipe.title}
          </h1>

          <div className="flex flex-wrap gap-2 mb-4">
            {recipe.readyInMinutes > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/25 px-3 py-1.5 text-xs font-semibold text-primary tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                {recipe.readyInMinutes} min total
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/80 border border-border/50 px-3 py-1.5 text-xs font-medium text-foreground">
              <Users className="w-3.5 h-3.5 text-primary/70" />
              {crewSize} servings
            </span>
            {prepMin > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted/60 border border-border/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Prep ~{prepMin}m
              </span>
            )}
            {cookMin > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted/60 border border-border/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Cook ~{cookMin}m
              </span>
            )}
          </div>

          <div className="flex gap-1.5 flex-wrap mb-4">
            {recipe.cuisines.slice(0, 3).map((c) => (
              <Badge key={c} variant="outline" className="text-[10px] uppercase tracking-wide">
                {c}
              </Badge>
            ))}
            {recipe.diets.slice(0, 2).map((d) => (
              <Badge key={d} variant="secondary" className="text-[10px]">
                {d}
              </Badge>
            ))}
          </div>

          {recipe.summary && (
            <p className="text-[15px] sm:text-sm text-muted-foreground leading-relaxed" data-testid="text-detail-summary">
              {stripHtml(recipe.summary)}
            </p>
          )}
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary mt-4 min-h-11 touch-manipulation"
              data-testid="link-detail-source"
            >
              View full recipe on source site →
            </a>
          )}
        </div>

        {/* Desktop action row */}
        <Card className="hidden sm:block">
          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={saved}
                className={`justify-start gap-2 min-h-11 ${saved ? "bg-primary/20 text-primary border-primary/30" : ""}`}
                data-testid="button-explore-save"
              >
                {saved ? <Heart className="w-4 h-4 fill-current" /> : <BookmarkPlus className="w-4 h-4" />}
                {saved ? "Saved" : "Save"}
              </Button>
              <Button variant="outline" onClick={handlePrint} className="justify-start gap-2 min-h-11" data-testid="button-explore-print">
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button variant="outline" onClick={() => setEmailOpen(true)} className="justify-start gap-2 min-h-11" data-testid="button-explore-email">
                <Mail className="w-4 h-4" />
                Email
              </Button>
              <Button onClick={() => setShoppingOpen(true)} className="justify-start gap-2 min-h-11" data-testid="button-explore-shopping">
                <List className="w-4 h-4" />
                Shopping List
              </Button>
            </div>
          </CardContent>
        </Card>

        {recipe.macros.calories > 0 && (
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-4 sm:p-5">
              <h3 className="font-heading text-xs sm:text-sm tracking-widest uppercase text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary/60" />
                Nutrition per serving
              </h3>
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {[
                  { label: "Cal", value: recipe.macros.calories, id: "calories" },
                  { label: "Protein", value: `${recipe.macros.protein_g}g`, id: "protein" },
                  { label: "Carbs", value: `${recipe.macros.carbs_g}g`, id: "carbs" },
                  { label: "Fat", value: `${recipe.macros.fat_g}g`, id: "fat" },
                ].map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl bg-muted/40 border border-border/30 py-3 px-1 text-center"
                  >
                    <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums" data-testid={`text-detail-${m.id}`}>
                      {m.value}
                    </p>
                    <p className="text-[9px] sm:text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">
                      {m.label}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="section-divider" />

        <Card className="border-border/50">
          <CardContent className="p-4 sm:p-5">
            <h3 className="font-heading text-xs sm:text-sm tracking-widest uppercase text-foreground mb-4 flex items-center gap-2">
              <ChefHat className="w-3.5 h-3.5 text-primary/60" />
              Ingredients
            </h3>
            <ul className="space-y-3" data-testid="section-detail-ingredients">
              {recipe.ingredients.map((ing, i) => (
                <li
                  key={i}
                  className="text-[15px] sm:text-sm text-foreground flex items-start gap-3 py-2 border-b border-border/20 last:border-0"
                >
                  <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span className="leading-relaxed">{ing.original}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {recipe.steps.length > 0 && (
          <Card className="border-border/50">
            <CardContent className="p-4 sm:p-5">
              <h3 className="font-heading text-xs sm:text-sm tracking-widest uppercase text-foreground mb-5 flex items-center gap-2">
                <Utensils className="w-3.5 h-3.5 text-primary/60" />
                Step-by-step
              </h3>
              <ol className="space-y-6" data-testid="section-detail-steps">
                {recipe.steps.map((step) => (
                  <li key={step.number} className="flex gap-3.5">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-md shadow-primary/25">
                      {step.number}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                      {step.heading && step.heading !== `Step ${step.number}` && (
                        <p className="text-[15px] font-semibold text-foreground leading-snug">{step.heading}</p>
                      )}
                      <p className="text-[15px] sm:text-sm text-foreground/90 leading-[1.65]">{step.step}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile sticky CTAs */}
      <div
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-lg shadow-[0_-8px_32px_rgba(0,0,0,0.45)] pb-safe"
        data-testid="explore-detail-mobile-cta"
      >
        <div className="grid grid-cols-2 gap-2 p-3 max-w-[900px] mx-auto">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={saved}
            className={`min-h-12 gap-2 touch-manipulation ${saved ? "bg-primary/15 border-primary/30 text-primary" : ""}`}
            data-testid="button-explore-save-mobile"
          >
            {saved ? <Heart className="w-4 h-4 fill-current" /> : <BookmarkPlus className="w-4 h-4" />}
            {saved ? "Saved" : "Save"}
          </Button>
          <Button
            onClick={() => setShoppingOpen(true)}
            className="min-h-12 gap-2 touch-manipulation font-semibold"
            data-testid="button-explore-shopping-mobile"
          >
            <List className="w-4 h-4" />
            Shopping list
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 px-3 pb-2 max-w-[900px] mx-auto">
          <Button variant="ghost" size="sm" onClick={handlePrint} className="min-h-10 text-xs touch-manipulation">
            <Printer className="w-3.5 h-3.5 mr-1" />
            Print
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEmailOpen(true)} className="min-h-10 text-xs touch-manipulation">
            <Mail className="w-3.5 h-3.5 mr-1" />
            Email crew
          </Button>
        </div>
      </div>

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

function ExploreDetailFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`text-center py-6 mt-8 border-t border-border/20 ${className}`}>
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
