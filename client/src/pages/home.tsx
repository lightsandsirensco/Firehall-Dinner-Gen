import { useState, useRef, useEffect, useCallback, memo } from "react";
import { FilterPanel, GenerateButtons, type FilterState } from "@/components/filter-panel";
import { createDefaultFilters, normalizeLoadedFilters, apiProtein } from "@/lib/tonight-vibes";
import { getWheelClassicBySlug, buildPackageUrl } from "@/lib/firehall-classics-wheel";
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
import {
  prefetchMealsIfReturning,
  consumePrefetched,
  markUserHasGenerated,
  hasUserGeneratedBefore,
} from "@/lib/prefetch";
import { trackEvent, trackMealGenerated, trackEmailModalOpened } from "@/lib/analytics";
import type { ClientRecipeResponse } from "@shared/schema";
import { Vote, Flame } from "lucide-react";
import { HeroHeader } from "@/components/hero-header";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    busy_level: "average",
    time_available: filters.time_available,
    appliances: filters.appliances,
    protein: filters.use_what_we_have ? "chicken" : apiProtein(filters.protein),
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

// Stable key: every distinct recipe object gets a unique render identity.
// Uses server-assigned _id so React knows to unmount/remount RecipeCard on a new recipe,
// not on every intermediate re-render.
function stableRecipeKey(recipe: ClientRecipeResponse): string {
  return (recipe as any)._id || (recipe as any)._signature || recipe.title;
}

// ─── Results Panel ────────────────────────────────────────────────────────────

const ResultsPanel = memo(function ResultsPanel({
  loading,
  error,
  recipe,
  recentRecipes,
  filters,
  onEmailClick,
  onShoppingListClick,
  onHallVoteClick,
  historyNav,
  onGenerate,
  generateDisabled,
  showHallVotePrompt = false,
}: {
  loading: boolean;
  error: string | null;
  recipe: ClientRecipeResponse | null;
  recentRecipes: ClientRecipeResponse[];
  filters: FilterState;
  onEmailClick: () => void;
  onShoppingListClick: () => void;
  onHallVoteClick: () => void;
  historyNav: { index: number; total: number };
  onGenerate: () => void;
  generateDisabled: boolean;
  /** True after two distinct successful generations this session. */
  showHallVotePrompt?: boolean;
}) {
  const showRecipe = !error && recipe;
  const showEmpty = !loading && !error && !recipe;

  return (
    <div className="flex-1 min-w-0 overflow-x-hidden">
      {loading && !recipe && <LoadingState />}
      {loading && recipe && (
        <div className="relative">
          <div className="absolute inset-x-0 top-0 z-10 pointer-events-none px-1">
            <LoadingState variant="compact" />
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
          {historyNav.total > 1 && historyNav.index < historyNav.total - 1 && (
            <div className="flex items-center justify-center mb-3" data-testid="history-position-indicator">
              <span className="text-xs text-muted-foreground/60 font-mono tracking-widest uppercase">
                Earlier pick · {historyNav.index + 1} of {historyNav.total}
              </span>
            </div>
          )}
          <RecipeCard
            key={stableRecipeKey(recipe)}
            recipe={recipe}
            crewSize={filters.crew_size}
            onEmailClick={onEmailClick}
            onShoppingListClick={onShoppingListClick}
          />
          {showHallVotePrompt && (
            <div className="mt-4 p-4 rounded-xl border border-border/50 bg-card/50 flex items-center justify-between gap-3 animate-in fade-in duration-500">
              <div className="flex items-center gap-2 min-w-0">
                <Vote className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-foreground">Can't decide? Let the crew vote.</p>
                  <p className="text-xs text-muted-foreground">
                    {(recentRecipes?.length ?? 0)} meals ready &middot; Share a link, crew picks the winner
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
      {showEmpty && (
        <EmptyState onGenerate={onGenerate} generateDisabled={generateDisabled} />
      )}
    </div>
  );
});

// ─── Home Page ────────────────────────────────────────────────────────────────

export default function Home() {
  // ── Core recipe state ─────────────────────────────────────────────────────
  // recipe is ALWAYS replaced atomically — never partially updated.
  // Title, ingredients, steps, timing, tags, macros all come from the same object.
  const [recipe, setRecipe] = useState<ClientRecipeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Meal history (browser-style Back/Forward) ─────────────────────────────
  // mealHistoryRef holds every generated meal in order. historyIndexRef tracks
  // which one is currently displayed. Both are refs so they can be read inside
  // callbacks without stale-closure issues. historyNav is the React state that
  // drives button enabled/disabled state and the "Meal X of Y" indicator.
  const mealHistoryRef = useRef<ClientRecipeResponse[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [historyNav, setHistoryNav] = useState({ index: -1, total: 0 });

  // ── Supporting state ──────────────────────────────────────────────────────
  const [lastTemplateId, setLastTemplateId] = useState<number | undefined>();
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const [hallVoteOpen, setHallVoteOpen] = useState(false);
  const [recentRecipes, setRecentRecipes] = useState<ClientRecipeResponse[]>([]);
  const [favCount, setFavCount] = useState(() => getSavedCount());

  // ── Refs (never trigger re-renders) ──────────────────────────────────────
  // latestRequestSeq: incremented on every new request. Stale responses whose
  // seq doesn't match this value are silently discarded.
  const latestRequestSeq = useRef(0);

  // isGenerating: true from the moment a request fires until it resolves/fails.
  // Prevents double-submits. Buttons are also disabled via the `loading` state.
  const isGenerating = useRef(false);

  // lastClickTime: millisecond timestamp of the last generate click, for debouncing.
  const lastClickTime = useRef(0);
  const DEBOUNCE_MS = 1500;

  // abortController: cancel in-flight fetch when a new request supersedes it.
  const abortControllerRef = useRef<AbortController | null>(null);

  // currentSignature: the last served recipe's signature, sent to the server
  // to avoid returning the same recipe twice in a row.
  const currentSignatureRef = useRef("");

  // recipeRef: scroll target for the results panel.
  const recipeRef = useRef<HTMLDivElement>(null);

  // Generation counter — only incremented by successful, non-duplicate recipe delivery.
  const lastAppliedSignatureRef = useRef<string | null>(null);
  const [userGenCount, setUserGenCount] = useState(0);
  const emailPromptedRef = useRef(false);

  const { toast } = useToast();

  // ── Favourites counter ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setFavCount(getSavedCount());
    window.addEventListener("favorites-changed", handler);
    return () => window.removeEventListener("favorites-changed", handler);
  }, []);

  // ── Filters (persisted to localStorage) ──────────────────────────────────
  const [filters, setFilters] = useState<FilterState>(() => {
    try {
      const saved = localStorage.getItem("firehall_filters");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.protein && Array.isArray(parsed.proteins)) {
          parsed.protein = parsed.proteins[0] || "chicken";
          delete parsed.proteins;
        }
        return normalizeLoadedFilters(parsed);
      }
    } catch {}
    return createDefaultFilters();
  });

  const compactHero = hasUserGeneratedBefore();

  useEffect(() => {
    try { localStorage.setItem("firehall_filters", JSON.stringify(filters)); } catch {}
  }, [filters]);

  // ── Warmup (prefetch only for returning users — saves API on first visit) ─
  useEffect(() => {
    fetch("/api/warm").catch(() => {});
    const payload = buildRequestPayload(filters);
    prefetchMealsIfReturning(payload);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // applyRecipe — the ONLY function that may call setRecipe.
  //
  // It replaces the ENTIRE recipe object atomically in a single setState call.
  // React 18 batches the three setState calls (recipe, loading, error) into one
  // synchronous commit, so the UI always sees a fully-consistent recipe object.
  //
  // Called exclusively from handleGenerate (never from email/shopping/print/save).
  // ─────────────────────────────────────────────────────────────────────────
  const applyRecipe = useCallback((data: ClientRecipeResponse, seq: number) => {
    // Stale-response guard: discard any response that isn't from the most recent request.
    if (seq !== latestRequestSeq.current) {
      console.log(`[Generate] Discarding stale response seq=${seq} (latest=${latestRequestSeq.current})`);
      isGenerating.current = false;
      return;
    }

    const sig = (data as ClientRecipeResponse & { _signature?: string })._signature || "";
    const isDuplicate =
      sig && sig === lastAppliedSignatureRef.current && mealHistoryRef.current.length > 0;

    if (isDuplicate) {
      mealHistoryRef.current[historyIndexRef.current] = data;
      setRecipe(data);
      setLoading(false);
      setError(null);
      isGenerating.current = false;
      abortControllerRef.current = null;
      console.log(`[Generate] Deduped apply (same signature): "${data.title}" | seq=${seq}`);
      return;
    }

    const truncated = mealHistoryRef.current.slice(0, historyIndexRef.current + 1);
    const newHistory = [...truncated, data];
    mealHistoryRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setHistoryNav({ index: historyIndexRef.current, total: newHistory.length });
    lastAppliedSignatureRef.current = sig || null;

    // Atomic state replacement — all three fire in the same React commit.
    setRecipe(data);
    setLoading(false);
    setError(null);

    // Reset generation lock.
    isGenerating.current = false;
    abortControllerRef.current = null;

    // Track the served recipe's signature for server-side dedup on the next request.
    currentSignatureRef.current = (data as any)._signature || "";

    // Side-effects that do NOT cause re-renders (refs + localStorage).
    addRecentSignature(data);
    if (data.meal_style) trackMealStyle(data.meal_style);
    setLastTemplateId(data.template_id);

    // Update the recent-recipes list (for Hall Vote) — one successful generation only.
    setRecentRecipes(prev => {
      const deduped = prev.filter(r => (r as any)._id !== (data as any)._id);
      return [data, ...deduped].slice(0, 5);
    });

    markUserHasGenerated();
    trackMealGenerated();
    setUserGenCount((prev) => {
      const next = prev + 1;
      if (next === 2 && !emailPromptedRef.current) {
        emailPromptedRef.current = true;
        setTimeout(() => setEmailModalOpen(true), 800);
      }
      return next;
    });

    console.log(
      `[Generate] Applied: "${data.title}" | seq=${seq} | id=${(data as any)._id} | style=${data.meal_style}`
    );

    // Scroll results into view.
    requestAnimationFrame(() => {
      recipeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // handleGenerate — fires one request at a time.
  //
  // Guards:
  //   1. Debounce (1.5 s) — prevents double-taps.
  //   2. isGenerating lock — blocks new requests while one is in flight.
  //      The buttons are also disabled via the `loading` React state, so this
  //      is a belt-and-suspenders guard for programmatic calls.
  //   3. Sequence number — each request gets a unique seq. Any response that
  //      arrives after a newer request has been fired is discarded.
  // ─────────────────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async (
    currentFilters: FilterState,
    templateId?: number,
    preferDifferentStyle = false,
  ) => {
    const now = Date.now();
    if (now - lastClickTime.current < DEBOUNCE_MS) {
      console.log("[Generate] Debounced");
      return;
    }
    if (isGenerating.current) {
      console.log("[Generate] Blocked — request in flight");
      return;
    }

    lastClickTime.current = now;
    isGenerating.current = true;

    // Cancel any in-flight request (e.g. if the lock somehow wasn't set).
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const seq = ++latestRequestSeq.current;
    const requestId = makeRequestId();
    console.log(`[Generate] Starting seq=${seq} rid=${requestId} preferDiff=${preferDifferentStyle}`);

    setError(null);
    setLoading(true);
    trackEvent("meal_generation_started");

    const payload = buildRequestPayload(currentFilters, templateId, preferDifferentStyle);
    const filterKey = buildFilterKey(payload);

    // Try prefetch cache first (skipped when "Generate Another" is active).
    if (!preferDifferentStyle) {
      const cached = consumePrefetched(payload, templateId);
      if (cached) {
        console.log(`[Generate] Prefetch hit: "${cached.title}" seq=${seq}`);
        applyRecipe(cached, seq);
        setTimeout(() => prefetchMealsIfReturning(payload), 100);
        return;
      }
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
      const recentSigs = getRecentSignatures();
      const debugParam = new URLSearchParams(window.location.search).get("debug") === "1" ? "?debug=1" : "";

      const res = await apiRequest("POST", `/api/generate${debugParam}`, {
        ...payload,
        request_id: requestId,
        exclude_signatures: recentSigs,
        recentSignatures: recentSigs,
        currentRecipeSignature: currentSignatureRef.current,
      }, 45_000, controller.signal);

      clearTimeout(timeout);

      // Check again after the await — a newer request may have fired.
      if (seq !== latestRequestSeq.current) {
        console.log(`[Generate] Stale after fetch — discarding seq=${seq}`);
        isGenerating.current = false;
        return;
      }

      const data: ClientRecipeResponse = await res.json();
      console.log(`[Generate] Received: "${data.title}" seq=${seq}`);

      // applyRecipe performs the atomic state replacement.
      applyRecipe(data, seq);

      if (!preferDifferentStyle) {
        putCached(filterKey, data);
        setTimeout(() => prefetchMealsIfReturning(payload), 100);
      }
    } catch (err: any) {
      clearTimeout(timeout);

      // Discard errors from stale requests.
      if (seq !== latestRequestSeq.current) {
        console.log(`[Generate] Stale error — discarding seq=${seq}`);
        isGenerating.current = false;
        return;
      }

      // Ignore intentional cancellations.
      if (err?.name === "AbortError") {
        if (seq === latestRequestSeq.current) {
          isGenerating.current = false;
        }
        return;
      }

      const msg = err?.message || "Something went wrong";
      console.error(`[Generate] Error seq=${seq}:`, msg);

      let errorMsg: string;
      if (msg.includes("No matching templates") || msg.includes("404")) {
        errorMsg = "no_match";
        setRecipe(null);
      } else if (msg.includes("429")) {
        try {
          const parsed = JSON.parse(msg.replace(/^\d+:\s*/, ""));
          errorMsg = parsed.message || "Rate limit reached. Please wait a moment.";
        } catch {
          errorMsg = "Too many requests. Please wait a moment before generating again.";
        }
      } else if (msg.includes("503") || msg.includes("budget")) {
        errorMsg = "Daily recipe limit reached. Please try again tomorrow.";
      } else if (msg.includes("403")) {
        errorMsg = "Security check failed. Please refresh the page and try again.";
      } else if (msg.includes("timed out") || msg.includes("AbortError")) {
        errorMsg = "Still warming up — tap Generate again to retry.";
      } else {
        errorMsg = "Generation failed. Please try again.";
      }

      setError(errorMsg);
      setLoading(false);
      isGenerating.current = false;

      toast({
        title: "Generation failed",
        description: "Tap Generate to try again.",
        variant: "destructive",
      });
    }
  }, [applyRecipe, toast]);

  // ── Button handlers ───────────────────────────────────────────────────────
  const handleGenerateClick = useCallback(() => {
    handleGenerate(filters);
  }, [filters, handleGenerate]);

  const handleGenerateAnother = useCallback(() => {
    handleGenerate(filters, lastTemplateId, true);
  }, [filters, lastTemplateId, handleGenerate]);

  // ── History navigation — NO API calls, instant ────────────────────────────
  const handleBack = useCallback(() => {
    const newIdx = historyIndexRef.current - 1;
    if (newIdx < 0) return;
    historyIndexRef.current = newIdx;
    setHistoryNav(prev => ({ ...prev, index: newIdx }));
    setRecipe(mealHistoryRef.current[newIdx]);
    setError(null);
    requestAnimationFrame(() => {
      recipeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const handleForward = useCallback(() => {
    const newIdx = historyIndexRef.current + 1;
    if (newIdx >= mealHistoryRef.current.length) return;
    historyIndexRef.current = newIdx;
    setHistoryNav(prev => ({ ...prev, index: newIdx }));
    setRecipe(mealHistoryRef.current[newIdx]);
    setError(null);
    requestAnimationFrame(() => {
      recipeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const onFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  // ── Deep-link: ?classic=<slug> → curated dinner package ─────────────────
  const classicTriggered = useRef(false);
  useEffect(() => {
    if (classicTriggered.current) return;
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("classic");
    if (!slug) return;
    const wheelClassic = getWheelClassicBySlug(slug);
    if (!wheelClassic) return;
    classicTriggered.current = true;
    window.location.replace(buildPackageUrl(wheelClassic));
  }, []);

  // ── Modal openers — do NOT touch generation counters or recipe state ───────
  const onEmailClick = useCallback(() => {
    trackEmailModalOpened();
    setEmailModalOpen(true);
  }, []);
  const onShoppingListClick = useCallback(() => setShoppingListOpen(true), []);
  const onHallVoteClick = useCallback(() => setHallVoteOpen(true), []);

  const scrollToFilters = useCallback(() => {
    document.getElementById("filters-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const generateDisabled =
    loading ||
    filters.appliances.length === 0 ||
    (filters.use_what_we_have && filters.ingredients_on_hand_text.trim().length === 0);

  const showHallVotePrompt =
    userGenCount >= 2 && (recentRecipes?.length ?? 0) >= 2;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activePage="generator" favCount={favCount} />

      <HeroHeader
        title="Firehall Meals"
        headline={compactHero ? undefined : "What's for dinner at the hall?"}
        subtitle={
          compactHero
            ? "Full table meal — main, starch, sides."
            : "Tell us who's eating and how much time you've got. We'll put dinner on the board."
        }
        supportingText={compactHero ? undefined : "Built by firefighters. For hungry crews."}
        compact={compactHero}
        showCTAs={!compactHero}
      />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 pb-28 lg:pb-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-[380px] flex-shrink-0">
            <FilterPanel
              filters={filters}
              onFiltersChange={onFiltersChange}
              onGenerate={handleGenerateClick}
              onGenerateAnother={handleGenerateAnother}
              isLoading={loading}
              hasRecipe={!!recipe}
              canGoBack={historyNav.index > 0}
              canGoForward={historyNav.index < historyNav.total - 1}
              onBack={handleBack}
              onForward={handleForward}
              onScrollToFilters={scrollToFilters}
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
              historyNav={historyNav}
              onGenerate={handleGenerateClick}
              generateDisabled={generateDisabled}
              showHallVotePrompt={showHallVotePrompt}
            />
          </div>
        </div>
      </main>

      {/* Modals — rendered outside the results panel, driven by recipe state only.
          Opening these modals never touches generation state or counters. */}
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

      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/40 bg-background/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.35)]"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        data-testid="mobile-generate-bar"
      >
        <div className="px-4 pt-3">
          <GenerateButtons
            filters={filters}
            hasRecipe={!!recipe}
            isLoading={loading}
            canGoBack={historyNav.index > 0}
            canGoForward={historyNav.index < historyNav.total - 1}
            onGenerate={handleGenerateClick}
            onGenerateAnother={handleGenerateAnother}
            onBack={handleBack}
            onForward={handleForward}
            onScrollToFilters={scrollToFilters}
          />
        </div>
      </div>

      <footer className="border-t border-border/20 mt-10 pb-20 lg:pb-0">
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
