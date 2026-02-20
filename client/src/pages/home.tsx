import { useState, useRef, useMemo, useCallback } from "react";
import { FilterPanel, type FilterState } from "@/components/filter-panel";
import { RecipeCard } from "@/components/recipe-card";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { EmailModal } from "@/components/email-modal";
import { ShoppingListModal } from "@/components/shopping-list-modal";
import { buildShoppingListFromMeal } from "@/lib/shopping-list";
import { apiRequest } from "@/lib/queryClient";
import { trackEvent, trackMealGenerated } from "@/lib/analytics";
import type { GenerateResponse } from "@shared/schema";
import { Flame } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const [recipe, setRecipe] = useState<GenerateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTemplateId, setLastTemplateId] = useState<number | undefined>();
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const genCountRef = useRef(0);
  const emailPromptedRef = useRef(false);
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

  const handleGenerate = async (currentFilters: FilterState, templateId?: number) => {
    setLoading(true);
    setError(null);
    trackEvent('meal_generation_started');
    try {
      const ingredients_on_hand = currentFilters.use_what_we_have
        ? currentFilters.ingredients_on_hand_text.split(",").map(s => s.trim()).filter(Boolean)
        : [];
      const res = await apiRequest("POST", "/api/generate", {
        crew_size: currentFilters.crew_size,
        busy_level: currentFilters.busy_level,
        time_available: currentFilters.time_available,
        appliances: currentFilters.appliances,
        proteins: currentFilters.use_what_we_have ? ["chicken"] : currentFilters.proteins,
        healthiness_preference: currentFilters.healthiness_preference,
        budget_level: currentFilters.budget_level,
        allergens_to_avoid: currentFilters.allergens_to_avoid,
        vegetarian_swap_needed: currentFilters.vegetarian_swap_needed,
        use_what_we_have: currentFilters.use_what_we_have,
        ingredients_on_hand,
        last_template_id: templateId,
      });
      const data: GenerateResponse = await res.json();
      setRecipe(data);
      setLastTemplateId(data.template_id);
      trackMealGenerated();
      genCountRef.current += 1;
      if (genCountRef.current === 2 && !emailPromptedRef.current) {
        emailPromptedRef.current = true;
        setTimeout(() => setEmailModalOpen(true), 800);
      }
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
  };

  const handleGenerateClick = () => {
    handleGenerate(filters);
  };

  const handleGenerateAnother = () => {
    handleGenerate(filters, lastTemplateId);
  };

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
              onFiltersChange={setFilters}
              onGenerate={handleGenerateClick}
              onGenerateAnother={handleGenerateAnother}
              isLoading={loading}
              hasRecipe={!!recipe}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="transition-opacity duration-300 ease-in-out" style={{ opacity: loading ? 0.6 : 1 }}>
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
                    onEmailClick={() => setEmailModalOpen(true)}
                    onShoppingListClick={() => setShoppingListOpen(true)}
                  />
                </div>
              )}
              {!loading && !error && !recipe && <EmptyState />}
            </div>
          </div>
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
