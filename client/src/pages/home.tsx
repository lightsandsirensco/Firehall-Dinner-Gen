import { useState, useRef, useEffect, useCallback, memo } from "react";
import { FilterPanel, type FilterState } from "@/components/filter-panel";
import { RecipeCard } from "@/components/recipe-card";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { EmailModal } from "@/components/email-modal";
import { ShoppingListModal } from "@/components/shopping-list-modal";
import { HallVoteModal } from "@/components/hall-vote-modal";
import { buildShoppingListFromClientMeal } from "@/lib/shopping-list";
import { getSavedCount } from "@/lib/saved-meals";
import { apiRequest } from "@/lib/queryClient";
import { buildFilterKey, putCached, addRecentSignature, getRecentSignatures } from "@/lib/recipe-cache";
import { prefetchMeals, consumePrefetched } from "@/lib/prefetch";
import { trackEvent, trackMealGenerated, trackEmailModalOpened } from "@/lib/analytics";
import type { ClientRecipeResponse } from "@shared/schema";
import { Flame, Vote, Heart } from "lucide-react";
import { Link } from "wouter";
import heroTruckImg from "@assets/truck1_1773178049785.jpg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

function getRecentMealStyles(): string[] {
  try {
    const raw = localStorage.getItem("recentMealStyles");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function trackMealStyle(style: string) {
  try {
    const recent = getRecentMealStyles().filter(s => s !== style);
    recent.unshift(style);
    localStorage.setItem("recentMealStyles", JSON.stringify(recent.slice(0, 5)));
  } catch {}
}

function buildRequestPayload(filters: FilterState, templateId?: number, preferDifferentStyle = false) {
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
    cuisine_style: filters.cuisine_style,
    meal_format: filters.meal_format,
    allergens_to_avoid: filters.allergens_to_avoid,
    vegetarian_swap_needed: filters.vegetarian_swap_needed,
    use_what_we_have: filters.use_what_we_have,
    ingredients_on_hand,
    last_template_id: templateId,
    recent_meal_styles: getRecentMealStyles(),
    prefer_different_style: preferDifferentStyle,
  };
}

function makeRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function hashIngredients(recipe: ClientRecipeResponse): string {
  return (recipe.ingredients || []).map(i => `${i.name}|${i.qty}|${i.unit}`).join(";;");
}

function hashSteps(recipe: ClientRecipeResponse): string {
  return (recipe.steps || []).map(s => `${s.title}|${s.instructions}`).join(";;");
}

function isRecipeCoherent(newRecipe: ClientRecipeResponse, oldRecipe: ClientRecipeResponse | null): boolean {
  if (!oldRecipe) return true;

  const newSig = (newRecipe as any)._signature || "";
  const oldSig = (oldRecipe as any)._signature || "";
  const sigChanged = newSig !== oldSig;
  const titleChanged = newRecipe.title !== oldRecipe.title;
  const newIngHash = hashIngredients(newRecipe);
  const oldIngHash = hashIngredients(oldRecipe);
  const newStepHash = hashSteps(newRecipe);
  const oldStepHash = hashSteps(oldRecipe);
  const ingsChanged = newIngHash !== oldIngHash;
  const stepsChanged = newStepHash !== oldStepHash;

  console.log(`[mismatchGuard] titleChanged=${titleChanged} signatureChanged=${sigChanged} ingredientsHashChanged=${ingsChanged} stepsHashChanged=${stepsChanged}`);

  if (titleChanged && !ingsChanged && !stepsChanged) {
    console.warn("[mismatchGuard] Title changed but ingredients and steps are identical — possible partial update");
    return false;
  }

  if (sigChanged && !ingsChanged && !stepsChanged && titleChanged) {
    console.warn("[mismatchGuard] Signature changed with new title but same content — discarding");
    return false;
  }

  return true;
}

let recipeKeyCounter = 0;
function recipeKey(recipe: ClientRecipeResponse): string {
  return (recipe as any)._signature || `${recipe.title}-${recipe.template_id}-${++recipeKeyCounter}`;
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
  recipe: ClientRecipeResponse | null;
  recentRecipes: ClientRecipeResponse[];
  filters: FilterState;
  onEmailClick: () => void;
  onShoppingListClick: () => void;
  onHallVoteClick: () => void;
}) {
  const showRecipe = !error && recipe;
  const showEmpty = !loading && !error && !recipe;

  return (
    <div className="flex-1 min-w-0 overflow-x-hidden">
      {loading && !recipe && <LoadingState />}
      {loading && recipe && (
        <div className="relative">
          <div className="absolute inset-x-0 top-0 z-10 pointer-events-none">
            <LoadingState />
          </div>
          <div className="opacity-30 pointer-events-none select-none">
            <RecipeCard
              recipe={recipe}
              crewSize={filters.crew_size}
            />
          </div>
        </div>
      )}
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
      {!loading && showRecipe && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
          <RecipeCard
            key={recipeKey(recipe)}
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
      {showEmpty && <EmptyState />}
    </div>
  );
});

export default function Home() {
  const [recipe, setRecipe] = useState<ClientRecipeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTemplateId, setLastTemplateId] = useState<number | undefined>();
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const [hallVoteOpen, setHallVoteOpen] = useState(false);
  const [recentRecipes, setRecentRecipes] = useState<ClientRecipeResponse[]>([]);
  const [favCount, setFavCount] = useState(() => getSavedCount());
  const latestRequestRef = useRef(0);
  const genCountRef = useRef(0);
  const emailPromptedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recipeRef = useRef<HTMLDivElement>(null);
  const recipeStateRef = useRef<ClientRecipeResponse | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handler = () => setFavCount(getSavedCount());
    window.addEventListener("favorites-changed", handler);
    return () => window.removeEventListener("favorites-changed", handler);
  }, []);

  const [filters, setFilters] = useState<FilterState>(() => {
    const defaults: FilterState = {
      crew_size: 6,
      busy_level: "average",
      time_available: "25-40",
      appliances: ["stove", "oven"],
      proteins: ["chicken", "beef"],
      healthiness_preference: "balanced",
      budget_level: "standard",
      cuisine_style: "any",
      meal_format: "random",
      allergens_to_avoid: [],
      vegetarian_swap_needed: false,
      use_what_we_have: false,
      ingredients_on_hand_text: "",
    };
    try {
      const saved = localStorage.getItem("firehall_filters");
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaults, ...parsed };
      }
    } catch {}
    return defaults;
  });

  useEffect(() => {
    try {
      localStorage.setItem("firehall_filters", JSON.stringify(filters));
    } catch {}
  }, [filters]);

  useEffect(() => {
    recipeStateRef.current = recipe;
  }, [recipe]);

  useEffect(() => {
    const warmupPayload = buildRequestPayload(filters);
    fetch("/api/warm")
      .then(() => prefetchMeals(warmupPayload))
      .catch(() => prefetchMeals(warmupPayload));
  }, []);

  const applyRecipe = useCallback((data: ClientRecipeResponse, seq: number) => {
    if (seq !== latestRequestRef.current) {
      console.log("[Generate] Ignoring stale response", { seq, latest: latestRequestRef.current });
      return;
    }

    const prev = recipeStateRef.current;
    const coherent = isRecipeCoherent(data, prev);
    if (!coherent) {
      console.warn("[mismatchGuard] Incoherent recipe detected — accepting anyway (server _id differs)");
    }

    setRecipe(data);
    setLoading(false);
    setError(null);
    isGeneratingRef.current = false;
    abortControllerRef.current = null;
    addRecentSignature(data);
    if (data.meal_style) trackMealStyle(data.meal_style);
    setRecentRecipes(prev => {
      const deduped = prev.filter(r => r.title !== data.title);
      return [data, ...deduped].slice(0, 5);
    });
    setLastTemplateId(data.template_id);
    trackMealGenerated();
    genCountRef.current += 1;
    console.log("[Generate] Recipe applied:", data.title, "| style:", data.meal_style, "| id:", (data as any)._id, "| seq:", seq);

    requestAnimationFrame(() => {
      recipeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    if (genCountRef.current === 2 && !emailPromptedRef.current) {
      emailPromptedRef.current = true;
      setTimeout(() => setEmailModalOpen(true), 800);
    }
  }, []);

  const isGeneratingRef = useRef(false);
  const lastClickTimeRef = useRef(0);
  const CLICK_DEBOUNCE_MS = 2000;

  const handleGenerate = useCallback(async (currentFilters: FilterState, templateId?: number, preferDifferentStyle = false) => {
    const now = Date.now();
    if (now - lastClickTimeRef.current < CLICK_DEBOUNCE_MS) {
      console.log("[Generate] Blocked — debounce (clicked too fast)");
      return;
    }
    if (isGeneratingRef.current) {
      console.log("[Generate] Blocked — already generating");
      return;
    }
    lastClickTimeRef.current = now;
    isGeneratingRef.current = true;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const seq = ++latestRequestRef.current;
    const requestId = makeRequestId();
    console.log("[Generate] Clicked", { seq, requestId, templateId, preferDifferentStyle });

    setError(null);
    setLoading(true);
    trackEvent('meal_generation_started');

    const payload = buildRequestPayload(currentFilters, templateId, preferDifferentStyle);
    const filterKey = buildFilterKey(payload);

    if (!preferDifferentStyle) {
      const cached = consumePrefetched(payload, templateId);
      if (cached) {
        console.log("[Generate] Using prefetched:", cached.title, { seq, filterKey });
        applyRecipe(cached, seq);
        setTimeout(() => prefetchMeals(payload), 100);
        return;
      }
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const recentSigs = getRecentSignatures();
      const currentSig = recipeStateRef.current ? (recipeStateRef.current as any)._signature || "" : "";
      const debugParam = new URLSearchParams(window.location.search).get("debug") === "1" ? "?debug=1" : "";
      const res = await apiRequest("POST", `/api/generate${debugParam}`, {
        ...payload,
        request_id: requestId,
        exclude_signatures: recentSigs,
        recentSignatures: recentSigs,
        currentRecipeSignature: currentSig,
      }, 45_000, controller.signal);
      clearTimeout(timeout);

      if (seq !== latestRequestRef.current) {
        console.log("[Generate] Ignoring stale response", { seq, latest: latestRequestRef.current });
        isGeneratingRef.current = false;
        return;
      }

      const data: ClientRecipeResponse = await res.json();

      console.log("[Generate] API returned:", data.title, { seq, filterKey });
      applyRecipe(data, seq);
      if (!preferDifferentStyle) {
        putCached(filterKey, data);
        setTimeout(() => prefetchMeals(payload), 100);
      }
    } catch (err: any) {
      clearTimeout(timeout);
      if (seq !== latestRequestRef.current) {
        console.log("[Generate] Ignoring stale error", { seq });
        isGeneratingRef.current = false;
        return;
      }

      if (controller.signal.aborted && err?.name === "AbortError") {
        isGeneratingRef.current = false;
        return;
      }

      const msg = err?.message || "Something went wrong";
      const status = msg.match(/^(\d+)/)?.[1] || "unknown";
      console.error("[Generate] Failed", { seq, status, message: msg });

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
      } else if (msg.includes("timed out") || msg.includes("AbortError")) {
        setError("Still warming up — tap Generate again to retry.");
      } else {
        setError("Generation failed. Please try again.");
      }

      setLoading(false);
      isGeneratingRef.current = false;
      toast({
        title: "Generation failed",
        description: "Tap Generate to try again.",
        variant: "destructive",
      });
    }
  }, [applyRecipe, toast]);

  const handleGenerateClick = useCallback(() => {
    handleGenerate(filters);
  }, [filters, handleGenerate]);

  const handleGenerateAnother = useCallback(() => {
    handleGenerate(filters, lastTemplateId, true);
  }, [filters, lastTemplateId, handleGenerate]);

  const onFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const onEmailClick = useCallback(() => {
    trackEmailModalOpened();
    setEmailModalOpen(true);
  }, []);
  const onShoppingListClick = useCallback(() => setShoppingListOpen(true), []);
  const onHallVoteClick = useCallback(() => setHallVoteOpen(true), []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/30">
        <div className="max-w-[1400px] mx-auto px-4">
          <nav className="flex items-center justify-between gap-3 py-3" data-testid="nav-links">
            <div className="flex items-center gap-2.5">
              <Flame className="w-7 h-7" style={{ color: "#C62828" }} />
              <span className="font-heading text-lg leading-none tracking-wide text-foreground hidden sm:inline">FIREHALL MEALS</span>
            </div>
            <div className="flex items-center gap-0.5 flex-wrap">
              <span
                className="text-xs uppercase tracking-wider text-foreground font-semibold px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20"
                data-testid="nav-link-meals-active"
              >
                Meal Generator
              </span>
              <Link href="/pizza" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium px-3 py-1.5 rounded-md hover-elevate" data-testid="nav-link-pizza">
                Pizza Night
              </Link>
              <Link href="/explore" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium px-3 py-1.5 rounded-md hover-elevate" data-testid="nav-link-explore">
                Explore
              </Link>
              <Link href="/favorites" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium px-3 py-1.5 rounded-md hover-elevate flex items-center gap-1.5" data-testid="nav-link-favorites">
                <Heart className="w-3 h-3" />
                <span className="hidden sm:inline">Favorites</span>
                {favCount > 0 && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 min-w-[16px] leading-none" data-testid="badge-fav-count">
                    {favCount}
                  </Badge>
                )}
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <section
        className="relative w-full h-[240px] sm:h-[360px] flex items-center justify-center overflow-hidden"
        style={{ backgroundImage: `url(${heroTruckImg})`, backgroundSize: "cover", backgroundPosition: "center" }}
        data-testid="hero-header"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/70" />
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-5 gap-3">
          <h1
            className="font-heading text-4xl sm:text-5xl md:text-6xl leading-none tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
            data-testid="text-app-title"
          >
            Firehall Meals
          </h1>
          <p
            className="text-white/70 text-xs sm:text-sm uppercase tracking-[0.2em] font-medium"
            data-testid="text-app-tagline"
          >
            Firefighter Built. Firehall Tested.
          </p>
          <p
            className="text-[#d4d4d4] text-base sm:text-lg max-w-md mt-1"
            data-testid="text-app-subtitle"
          >
            Generate real meals for your crew in seconds
          </p>
          <p className="text-[10px] text-white/35 mt-2 font-normal">
            Powered by{" "}
            <a
              href="https://lightsandsirensco.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/55 transition-colors duration-200"
              data-testid="link-header-attribution"
            >
              Lights &amp; Sirens Co.
            </a>
          </p>
        </div>
      </section>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
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

          <div ref={recipeRef}>
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
            shoppingList={buildShoppingListFromClientMeal(recipe, {
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
      <footer className="border-t border-border/20 mt-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 flex items-center justify-center gap-2">
          <Flame className="w-3.5 h-3.5 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground/50">
            Powered by{" "}
            <a
              href="https://www.lightsandsirensco.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-muted-foreground transition-colors duration-200"
              data-testid="link-attribution"
            >
              Lights &amp; Sirens Co.
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
