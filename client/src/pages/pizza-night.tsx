import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PizzaFilterPanel,
  PizzaGenerateButtons,
  type PizzaFilterState,
  type PizzaGenerationMode,
} from "@/components/pizza-filter-panel";
import { PizzaCard } from "@/components/pizza-card";
import { PizzaHero } from "@/components/pizza-hero";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { EmailModal } from "@/components/email-modal";
import { ShoppingListModal } from "@/components/shopping-list-modal";
import { buildShoppingListFromPizza } from "@/lib/shopping-list";
import { getSavedCount } from "@/lib/saved-meals";
import { getRecentPizzaStyleIds, recordPizzaStyleId } from "@/lib/pizza-session";
import { apiRequest } from "@/lib/queryClient";
import { parseApiError } from "@/lib/parse-api-error";
import type { PizzaResponse, ClientRecipeResponse, ClientIngredient } from "@shared/schema";
import { usePizzaHeroPoll } from "@/lib/recipe-hero";
import { getPizzaConceptMeta } from "@shared/pizza-concepts";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";
import { hapticLight, hapticSuccess } from "@/lib/haptics";

interface PizzaMenuResponse {
  featured: string[];
  concepts: { id: string; title: string; emoji: string; gradient: string; badges: string[] }[];
  total: number;
}

const DEFAULT_FILTERS: PizzaFilterState = {
  crew_size: 6,
  time_available: "45-60",
  dough_option: "premade",
  style_preference: "classic",
  heat_level: "medium",
  allergens_to_avoid: [],
  vegetarian_swap_needed: false,
  oven_available: true,
  crust_preference: "surprise",
  sauce_preference: "surprise",
  generation_mode: "standard",
};

export default function PizzaNight() {
  const [recipe, setRecipe] = useState<PizzaResponse | null>(null);
  const recipeWithHero = usePizzaHeroPoll(recipe);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPizzaStyleId, setLastPizzaStyleId] = useState<string | undefined>();
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const [favCount, setFavCount] = useState(() => getSavedCount());
  const [filters, setFilters] = useState<PizzaFilterState>(DEFAULT_FILTERS);
  const [wheelHighlight, setWheelHighlight] = useState<string | null>(null);

  const { data: menu } = useQuery<PizzaMenuResponse>({
    queryKey: ["/api/pizza/menu"],
    staleTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    const handler = () => setFavCount(getSavedCount());
    window.addEventListener("favorites-changed", handler);
    return () => window.removeEventListener("favorites-changed", handler);
  }, []);

  const featuredCards = useMemo(() => {
    if (!menu?.concepts?.length) return [];
    const ids = menu.featured?.length ? menu.featured : menu.concepts.slice(0, 6).map((c) => c.id);
    return ids
      .map((id) => {
        const fromMenu = menu.concepts.find((c) => c.id === id);
        if (fromMenu) return fromMenu;
        const meta = getPizzaConceptMeta(id);
        if (!meta) return null;
        return {
          id: meta.id,
          title: meta.title,
          emoji: meta.heroEmoji,
          gradient: meta.heroGradient,
          badges: meta.badges.slice(0, 2),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }, [menu]);

  const handleGenerate = useCallback(
    async (currentFilters: PizzaFilterState, mode?: PizzaGenerationMode) => {
      hapticLight();
      setLoading(true);
      setError(null);
      const genMode = mode ?? currentFilters.generation_mode ?? "standard";
      const effectiveMode = genMode === "spin_again" ? "spin_again" : genMode;

      try {
        const res = await apiRequest("POST", "/api/generate-pizza", {
          crew_size: currentFilters.crew_size,
          time_available: currentFilters.time_available,
          dough_option: currentFilters.dough_option,
          style_preference: currentFilters.style_preference,
          heat_level: currentFilters.heat_level,
          allergens_to_avoid: currentFilters.allergens_to_avoid,
          vegetarian_swap_needed: currentFilters.vegetarian_swap_needed,
          last_pizza_style_id: lastPizzaStyleId,
          last_pizza_style_ids: getRecentPizzaStyleIds(),
          generation_mode: effectiveMode,
          crust_preference: currentFilters.crust_preference,
          sauce_preference: currentFilters.sauce_preference,
        });
        const data: PizzaResponse = await res.json();
        setRecipe(data);
        hapticSuccess();
        setLastPizzaStyleId(data.pizza_style_id);
        recordPizzaStyleId(data.pizza_style_id);
        setFilters((f) => ({ ...f, generation_mode: effectiveMode }));
      } catch (err: unknown) {
        const parsed = parseApiError(err);
        setError(parsed.message);
      } finally {
        setLoading(false);
        setWheelHighlight(null);
      }
    },
    [lastPizzaStyleId],
  );

  const handleGenerateAnother = () => {
    handleGenerate({ ...filters, generation_mode: "spin_again" }, "spin_again");
  };

  const recipeMeta = recipe ? getPizzaConceptMeta(recipe.pizza_style_id) : undefined;

  const emailRecipe: ClientRecipeResponse | null = recipe
    ? {
        title: recipe.title,
        meal_format: "pizza",
        servings: filters.crew_size,
        tags: recipe.badges ?? [],
        timing: {
          prep_min: recipe.timing.prep_minutes,
          cook_min: recipe.timing.bake_minutes,
          total_min: recipe.timing.total_minutes,
        },
        protein_safety: {
          protein: recipe.protein_safety?.[0]?.protein || "",
          internal_temp_f: recipe.protein_safety?.[0]?.target_temp_f || 0,
          rest_min: recipe.protein_safety?.[0]?.rest_minutes || 0,
          notes: recipe.protein_safety?.[0]?.probe_where || "",
        },
        ingredients: [
          ...(recipe.ingredients.dough || []),
          ...recipe.ingredients.sauce,
          ...recipe.ingredients.cheese,
          ...recipe.ingredients.toppings,
          ...recipe.ingredients.drizzles,
        ].map((ing): ClientIngredient => ({
          name: ing.item,
          qty: 0,
          unit: ing.amount,
          category: "other",
        })),
        steps: recipe.build_steps.map((s, i) => ({
          n: i + 1,
          title: typeof s === "string" ? "" : s.heading,
          heat: "",
          minutes: 0,
          instructions: typeof s === "string" ? s : s.body,
        })),
        plating: { serve_style: "pizza", assembly_instructions: "", optional_toppings: [] },
        cleanup_tip: recipe.cleanup_tip,
        macros_per_serving: recipe.macros_per_serving,
        chosen_protein: "",
        primary_protein_source: "",
        why_it_fits_tonight: recipe.why_this_works,
      }
    : null;

  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background">
      <SiteHeader activePage="pizza" favCount={favCount} />

      <PizzaHero
        title="Pizza Night"
        subtitle={`${menu?.total ?? "40+"} hall-tested pies · crew-sized · step-by-step for beginners`}
        emoji={recipeWithHero?.hero_emoji ?? recipeMeta?.heroEmoji ?? "🍕"}
        gradient={recipeMeta?.heroGradient ?? "from-orange-950 via-red-950 to-zinc-950"}
        heroImage={recipeWithHero?.hero_image}
        heroImageAlt={recipeWithHero?.hero_image_alt}
      />

      {!recipe && featuredCards.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-page py-6 border-b border-border/40">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-semibold mb-3">
            Tonight&apos;s rotation
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin">
            {featuredCards.map((card) => (
              <button
                key={card.id}
                type="button"
                disabled={loading || !filters.oven_available}
                onClick={() => {
                  setWheelHighlight(card.id);
                  handleGenerate({ ...filters, generation_mode: "specialty_slice" }, "specialty_slice");
                }}
                className={cn(
                  "snap-start shrink-0 w-[140px] sm:w-[160px] rounded-xl overflow-hidden ring-1 ring-white/10",
                  "transition-transform active:scale-95 text-left",
                  wheelHighlight === card.id && "ring-2 ring-primary",
                )}
                data-testid={`pizza-featured-${card.id}`}
              >
                <div className={cn("h-20 bg-gradient-to-br relative", card.gradient)}>
                  <span className="absolute bottom-2 right-2 text-3xl">{card.emoji}</span>
                </div>
                <div className="p-2.5 bg-card">
                  <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
                    {card.title}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <main className="max-w-[1400px] mx-auto px-page py-6 pb-safe-sticky lg:pb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-[400px] flex-shrink-0 lg:sticky lg:top-20 lg:self-start">
            <PizzaFilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              onGenerate={(mode) => handleGenerate(filters, mode)}
              onGenerateAnother={handleGenerateAnother}
              isLoading={loading}
              hasRecipe={!!recipeWithHero}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div
              className="transition-opacity duration-300"
              style={{ opacity: loading ? 0.65 : 1 }}
            >
              {loading && <LoadingState />}
              {!loading && error && (
                <div className="animate-in fade-in duration-300">
                  <ErrorState type="error" message={error} />
                </div>
              )}
              {!loading && !error && recipeWithHero && (
                <div
                  key={recipeWithHero.pizza_style_id + recipeWithHero.title}
                  className="meal-reveal motion-reduce:animate-none"
                >
                  <PizzaCard
                    recipe={recipeWithHero}
                    crewSize={filters.crew_size}
                    onEmailClick={() => setEmailModalOpen(true)}
                    onShoppingListClick={() => setShoppingListOpen(true)}
                  />
                </div>
              )}
              {!loading && !error && !recipe && (
                <div className="flex flex-col items-center justify-center min-h-[360px] text-center rounded-2xl border border-dashed border-border/50 bg-card/30 px-6">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 ring-2 ring-primary/20">
                    <Flame className="w-12 h-12 text-primary/70" />
                  </div>
                  <h2
                    className="font-heading text-3xl tracking-wide text-foreground mb-2"
                    data-testid="pizza-text-empty-title"
                  >
                    READY FOR PIZZA NIGHT
                  </h2>
                  <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
                    Pick a mode — wheel spin, specialty slice, fridge raid, or classic generate.
                    Every recipe includes temps, timing cues, and hall-scale portions.
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
      <div className="mobile-sticky-bar lg:hidden" data-testid="pizza-mobile-generate-bar">
        <div className="px-page pt-3">
          <PizzaGenerateButtons
            hasRecipe={!!recipeWithHero}
            isLoading={loading}
            ovenAvailable={filters.oven_available}
            onGenerate={(mode) => handleGenerate(filters, mode)}
            onGenerateAnother={handleGenerateAnother}
          />
        </div>
      </div>

      {recipe && (
        <ShoppingListModal
          open={shoppingListOpen}
          onOpenChange={setShoppingListOpen}
          shoppingList={buildShoppingListFromPizza(recipe)}
          recipeTitle={recipe.title}
          generatorType="pizza"
        />
      )}
      <footer className="text-center py-4 mt-6 pb-20 lg:pb-8">
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
