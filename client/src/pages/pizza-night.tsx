import { useState, useRef } from "react";
import { PizzaFilterPanel, type PizzaFilterState } from "@/components/pizza-filter-panel";
import { PizzaCard } from "@/components/pizza-card";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { EmailModal } from "@/components/email-modal";
import { ShoppingListModal } from "@/components/shopping-list-modal";
import { buildShoppingListFromPizza } from "@/lib/shopping-list";
import { apiRequest } from "@/lib/queryClient";
import type { PizzaResponse, GenerateResponse } from "@shared/schema";
import { Flame } from "lucide-react";
import { Link } from "wouter";

export default function PizzaNight() {
  const [recipe, setRecipe] = useState<PizzaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPizzaStyleId, setLastPizzaStyleId] = useState<string | undefined>();
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const genCountRef = useRef(0);
  const emailPromptedRef = useRef(false);
  const [filters, setFilters] = useState<PizzaFilterState>({
    crew_size: 6,
    time_available: "45-60",
    dough_option: "premade",
    style_preference: "classic",
    heat_level: "medium",
    allergens_to_avoid: [],
    vegetarian_swap_needed: false,
    oven_available: true,
  });

  const handleGenerate = async (currentFilters: PizzaFilterState, lastStyleId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest("POST", "/api/generate-pizza", {
        crew_size: currentFilters.crew_size,
        time_available: currentFilters.time_available,
        dough_option: currentFilters.dough_option,
        style_preference: currentFilters.style_preference,
        heat_level: currentFilters.heat_level,
        allergens_to_avoid: currentFilters.allergens_to_avoid,
        vegetarian_swap_needed: currentFilters.vegetarian_swap_needed,
        last_pizza_style_id: lastStyleId,
      });
      const data: PizzaResponse = await res.json();
      setRecipe(data);
      setLastPizzaStyleId(data.pizza_style_id);
      genCountRef.current += 1;
      if (genCountRef.current === 2 && !emailPromptedRef.current) {
        emailPromptedRef.current = true;
        setTimeout(() => setEmailModalOpen(true), 800);
      }
    } catch (err: any) {
      const msg = err?.message || "Something went wrong";
      if (msg.includes("429")) {
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
    handleGenerate(filters, lastPizzaStyleId);
  };

  const emailRecipe: GenerateResponse | null = recipe
    ? {
        template_id: 0,
        chosen_protein: "",
        title: recipe.title,
        why_it_fits_tonight: recipe.why_this_works,
        timing: { prep_minutes: recipe.timing.prep_minutes, cook_minutes: recipe.timing.bake_minutes, total_minutes: recipe.timing.total_minutes },
        protein_safety: recipe.protein_safety,
        ingredients: [
          ...(recipe.ingredients.dough || []),
          ...recipe.ingredients.sauce,
          ...recipe.ingredients.cheese,
          ...recipe.ingredients.toppings,
          ...recipe.ingredients.drizzles,
        ],
        steps: recipe.build_steps,
        cleanup_tip: recipe.cleanup_tip,
        macros_per_serving: recipe.macros_per_serving,
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border/40">
        <div className="max-w-[1400px] mx-auto px-4">
          <nav className="flex items-center justify-between py-2" data-testid="nav-links">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Flame className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-heading text-lg leading-none tracking-wide text-foreground">FIREHALL MEALS</span>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors font-medium px-3 py-1.5" data-testid="nav-link-meals">
                Meal Generator
              </Link>
              <span className="text-muted-foreground/30 text-xs">|</span>
              <span className="text-xs uppercase tracking-wider text-foreground font-medium px-3 py-1.5" data-testid="nav-link-pizza-active">
                Pizza Night
              </span>
            </div>
          </nav>
          <div className="text-center py-5 pb-6">
            <h1 className="font-heading text-5xl sm:text-6xl leading-none tracking-wide text-foreground" data-testid="pizza-text-app-title">
              PIZZA NIGHT
            </h1>
            <p className="font-heading text-xl sm:text-2xl tracking-wide text-primary mt-1.5" data-testid="pizza-text-app-subtitle">
              Firefighter Built. Firehall Tested.
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto leading-relaxed" data-testid="pizza-text-app-description">
              Crew meal ideas built for the fire service. Generate dinners, pizza nights, and crew meals based on time, crew size, and what's in the fridge.
            </p>
            <p className="text-[10px] text-muted-foreground/40 mt-2 font-normal">
              Powered by{" "}
              <a
                href="https://lightsandsirensco.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-muted-foreground/60 transition-colors"
                data-testid="pizza-link-header-attribution"
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
            <PizzaFilterPanel
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
              {!loading && error && (
                <div className="animate-in fade-in duration-300">
                  <ErrorState type="error" message={error} />
                </div>
              )}
              {!loading && !error && recipe && (
                <div key={recipe.title} className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                  <PizzaCard
                    recipe={recipe}
                    crewSize={filters.crew_size}
                    onEmailClick={() => setEmailModalOpen(true)}
                    onShoppingListClick={() => setShoppingListOpen(true)}
                  />
                </div>
              )}
              {!loading && !error && !recipe && (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Flame className="w-10 h-10 text-primary/60" />
                  </div>
                  <h2 className="font-heading text-3xl tracking-wide text-foreground mb-2" data-testid="pizza-text-empty-title">
                    READY FOR PIZZA NIGHT
                  </h2>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    Set your crew's preferences and fire up a homemade pizza recipe. Oven required.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      {emailRecipe && (
        <EmailModal
          open={emailModalOpen}
          onOpenChange={setEmailModalOpen}
          recipe={emailRecipe}
          crewSize={filters.crew_size}
          healthinessLevel={filters.style_preference}
        />
      )}
      {recipe && (
        <ShoppingListModal
          open={shoppingListOpen}
          onOpenChange={setShoppingListOpen}
          shoppingList={buildShoppingListFromPizza(recipe)}
          recipeTitle={recipe.title}
          generatorType="pizza"
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
            data-testid="pizza-link-attribution"
          >
            Lights &amp; Sirens Co.
          </a>
        </p>
      </footer>
    </div>
  );
}
