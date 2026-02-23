import { useState, useRef, useEffect, useCallback, memo } from "react";
import { FilterPanel, type FilterState } from "@/components/filter-panel";
import { RecipeCard } from "@/components/recipe-card";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { EmailModal } from "@/components/email-modal";
import { ShoppingListModal } from "@/components/shopping-list-modal";
import { HallVoteModal } from "@/components/hall-vote-modal";
import { buildShoppingListFromMeal } from "@/lib/shopping-list";
import { getSavedCount } from "@/lib/saved-meals";
import { apiRequest } from "@/lib/queryClient";
import { buildFilterKey, getCached, putCached } from "@/lib/recipe-cache";
import { prefetchMeals, consumePrefetched } from "@/lib/prefetch";
import { trackEvent, trackMealGenerated } from "@/lib/analytics";
import type { GenerateResponse } from "@shared/schema";
import { Flame, Vote, Heart } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function buildRequestPayload(filters: FilterState, templateId?: number) {
  const ingredients_on_hand = filters.use_what_we_have
    ? filters.ingredients_on_hand_text.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  return {
    crew_size: filters.crew_size,
    busy_level: filters.busy_level,
    time_available: filters.time_available,
    appliances: filters.appliances,
    proteins: filters.use_what_we_have ? ["chicken"] : filters.proteins,
    healthiness_preference: filters.healthiness_preference,
    budget_level: filters.budget_level,
    allergens_to_avoid: filters.allergens_to_avoid,
    vegetarian_swap_needed: filters.vegetarian_swap_needed,
    use_what_we_have: filters.use_what_we_have,
    ingredients_on_hand,
    last_template_id: templateId,
  };
}

const ResultsPanel = memo(function ResultsPanel({
  loading,
  error,
  recipe,
  recentRecipes,
  filters,
  onEmailClick,
  onShoppingListClick,
  onHallVoteClick,
}: {
  loading: boolean;
  error: string | null;
  recipe: GenerateResponse | null;
  recentRecipes: GenerateResponse[];
  filters: FilterState;
  onEmailClick: () => void;
  onShoppingListClick: () => void;
  onHallVoteClick: () => void;
}) {
  return (
    <div className="flex-1 min-w-0">
      {loading && <LoadingState />}
      {!loading && error === "no_match" && (
        <div className="animate-in fade-in duration-300">
          <ErrorState type="no_match" />
        </div>
      )}
      {!loading && error && error !== "no_match" && (
        <div className="animate-in fade-in duration-300">
          <ErrorState type="error" message={error} />
        </div>
      )}
      {!loading && !error && recipe && (
        <div key={recipe.title} className="animate-in fade-in slide-in-from-bottom-2 duration-400">
          <RecipeCard
            recipe={recipe}
            crewSize={filters.crew_size}
            onEmailClick={onEmailClick}
            onShoppingListClick={onShoppingListClick}
          />
          {recentRecipes.length >= 2 && (
            <div className="mt-4 p-4 rounded-xl border border-border/50 bg-card/50 flex items-center justify-between gap-3 animate-in fade-in duration-500">
              <div className="flex items-center gap-2 min-w-0">
                <Vote className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-foreground">Can't decide? Let the crew vote.</p>
                  <p className="text-xs text-muted-foreground">
                    {recentRecipes.length} meals ready &middot; Share a link, crew picks the winner
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="font-heading tracking-wider flex-shrink-0"
                onClick={onHallVoteClick}
                data-testid="button-start-hall-vote"
              >
                <Vote className="w-4 h-4 mr-2" />
                HALL VOTE
              </Button>
            </div>
          )}
        </div>
      )}
      {!loading && !error && !recipe && <EmptyState />}
    </div>
  );
});

export default function Home() {
  const [recipe, setRecipe] = useState<GenerateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTemplateId, setLastTemplateId] = useState<number | undefined>();
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const [hallVoteOpen, setHallVoteOpen] = useState(false);
  const [recentRecipes, setRecentRecipes] = useState<GenerateResponse[]>([]);
  const [favCount, setFavCount] = useState(() => getSavedCount());
  const genCountRef = useRef(0);
  const emailPromptedRef = useRef(false);

  useEffect(() => {
    const handler = () => setFavCount(getSavedCount());
    window.addEventListener("favorites-changed", handler);
    return () => window.removeEventListener("favorites-changed", handler);
  }, []);

  const [filters, setFilters] = useState<FilterState>({
    crew_size: 6,
    busy_level: "average",
    time_available: "25-40",
    appliances: ["stove", "oven"],
    proteins: ["chicken", "beef"],
    healthiness_preference: "balanced",
    budget_level: "standard",
    allergens_to_avoid: [],
    vegetarian_swap_needed: false,
    use_what_we_have: false,
    ingredients_on_hand_text: "",
  });

  const handleGenerate = useCallback(async (currentFilters: FilterState, templateId?: number) => {
    setLoading(true);
    setError(null);
    trackEvent('meal_generation_started');

    const payload = buildRequestPayload(currentFilters, templateId);

    const prefetched = consumePrefetched(payload, templateId);
    if (prefetched) {
      setRecipe(prefetched);
      setRecentRecipes(prev => {
        const deduped = prev.filter(r => r.title !== prefetched.title);
        return [prefetched, ...deduped].slice(0, 5);
      });
      setLastTemplateId(prefetched.template_id);
      trackMealGenerated();
      genCountRef.current += 1;
      setLoading(false);
      if (genCountRef.current === 2 && !emailPromptedRef.current) {
        emailPromptedRef.current = true;
        setTimeout(() => setEmailModalOpen(true), 800);
      }
      setTimeout(() => prefetchMeals(payload), 100);
      return;
    }

    try {
      const res = await apiRequest("POST", "/api/generate", payload);
      const data: GenerateResponse = await res.json();
      setRecipe(data);
      setRecentRecipes(prev => {
        const deduped = prev.filter(r => r.title !== data.title);
        return [data, ...deduped].slice(0, 5);
      });
      setLastTemplateId(data.template_id);

      const filterKey = buildFilterKey(payload);
      putCached(filterKey, data);

      trackMealGenerated();
      genCountRef.current += 1;
      if (genCountRef.current === 2 && !emailPromptedRef.current) {
        emailPromptedRef.current = true;
        setTimeout(() => setEmailModalOpen(true), 800);
      }

      setTimeout(() => prefetchMeals(payload), 100);
    } catch (err: any) {
      const msg = err?.message || "Something went wrong";
      if (msg.includes("No matching templates") || msg.includes("404")) {
        setError("no_match");
        setRecipe(null);
      } else if (msg.includes("429")) {
        try {
          const parsed = JSON.parse(msg.replace(/^\d+:\s*/, ""));
          setError(parsed.message || "Rate limit reached. Please wait a moment.");
        } catch {
          setError("Too many requests. Please wait a moment before generating again.");
        }
      } else if (msg.includes("503") || msg.includes("budget")) {
        setError("Daily recipe limit reached. Please try again tomorrow.");
      } else if (msg.includes("403")) {
        setError("Security check failed. Please refresh the page and try again.");
      } else {
        setError("Generation failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerateClick = useCallback(() => {
    handleGenerate(filters);
  }, [filters, handleGenerate]);

  const handleGenerateAnother = useCallback(() => {
    handleGenerate(filters, lastTemplateId);
  }, [filters, lastTemplateId, handleGenerate]);

  const onFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const onEmailClick = useCallback(() => setEmailModalOpen(true), []);
  const onShoppingListClick = useCallback(() => setShoppingListOpen(true), []);
  const onHallVoteClick = useCallback(() => setHallVoteOpen(true), []);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border/40">
        <div className="max-w-[1400px] mx-auto px-4">
          <nav className="flex items-center justify-between py-2" data-testid="nav-links">
            <div className="flex items-center gap-2">
              <Flame className="w-7 h-7" style={{ color: "#C62828" }} />
              <span className="font-heading text-lg leading-none tracking-wide text-foreground">FIREHALL MEALS</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs uppercase tracking-wider text-foreground font-medium px-3 py-1.5" data-testid="nav-link-meals-active">
                Meal Generator
              </span>
              <span className="text-muted-foreground/30 text-xs">|</span>
              <Link href="/pizza" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors font-medium px-3 py-1.5" data-testid="nav-link-pizza">
                Pizza Night
              </Link>
              <span className="text-muted-foreground/30 text-xs">|</span>
              <Link href="/favorites" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors font-medium px-3 py-1.5 flex items-center gap-1" data-testid="nav-link-favorites">
                <Heart className="w-3 h-3" />
                Favorites
                {favCount > 0 && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 min-w-[16px] leading-none" data-testid="badge-fav-count">
                    {favCount}
                  </Badge>
                )}
              </Link>
            </div>
          </nav>
          <div className="text-center py-5 pb-6">
            <h1 className="font-heading text-5xl sm:text-6xl leading-none tracking-wide text-foreground" data-testid="text-app-title">
              FIREHALL MEALS
            </h1>
            <p className="font-heading text-xl sm:text-2xl tracking-wide text-primary mt-1.5" data-testid="text-app-subtitle">
              Firefighter Built. Firehall Tested.
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto leading-relaxed" data-testid="text-app-description">
              Crew meal ideas built for the fire service. Generate dinners, pizza nights, and crew meals based on time, crew size, and what's in the fridge.
            </p>
            <p className="text-[10px] text-muted-foreground/40 mt-2 font-normal">
              Powered by{" "}
              <a
                href="https://lightsandsirensco.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-muted-foreground/60 transition-colors"
                data-testid="link-header-attribution"
              >
                Lights &amp; Sirens Co.
              </a>
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-[380px] flex-shrink-0">
            <FilterPanel
              filters={filters}
              onFiltersChange={onFiltersChange}
              onGenerate={handleGenerateClick}
              onGenerateAnother={handleGenerateAnother}
              isLoading={loading}
              hasRecipe={!!recipe}
            />
          </div>

          <ResultsPanel
            loading={loading}
            error={error}
            recipe={recipe}
            recentRecipes={recentRecipes}
            filters={filters}
            onEmailClick={onEmailClick}
            onShoppingListClick={onShoppingListClick}
            onHallVoteClick={onHallVoteClick}
          />
        </div>
      </main>
      {recipe && (
        <>
          <EmailModal
            open={emailModalOpen}
            onOpenChange={setEmailModalOpen}
            recipe={recipe}
            crewSize={filters.crew_size}
            healthinessLevel={filters.healthiness_preference}
          />
          <ShoppingListModal
            open={shoppingListOpen}
            onOpenChange={setShoppingListOpen}
            shoppingList={buildShoppingListFromMeal(recipe, {
              useWhatWeHave: filters.use_what_we_have,
              budgetLevel: filters.budget_level,
            })}
            recipeTitle={recipe.title}
            generatorType="meal"
          />
        </>
      )}
      {recentRecipes.length >= 2 && (
        <HallVoteModal
          open={hallVoteOpen}
          onOpenChange={setHallVoteOpen}
          recipes={recentRecipes}
        />
      )}
      <footer className="text-center py-4 mt-6">
        <p className="text-xs text-muted-foreground/60">
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
    </div>
  );
}
