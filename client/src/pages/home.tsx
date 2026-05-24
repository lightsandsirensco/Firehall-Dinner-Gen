import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { FilterPanel, GenerateButtons, type FilterState } from "@/components/filter-panel";
import { createFirstTapDefaults, normalizeLoadedFilters, apiProtein } from "@/lib/tonight-vibes";
import { formatDinnerOutcomeLine, ONE_TAP_MEAL_LABEL } from "@/lib/meal-outcome-copy";
import { inferBusyLevelFromTime } from "@shared/busy-level";
import { getWheelClassicBySlug, buildPackageUrl } from "@/lib/firehall-classics-wheel";
import { RecipeCard } from "@/components/recipe-card";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { EmailModal } from "@/components/email-modal";
import { ShoppingListModal } from "@/components/shopping-list-modal";
import { HallVoteModal } from "@/components/hall-vote-modal";
import { HallVotePromoBanner } from "@/components/hall-vote-promo-banner";
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
import {
  getPersistedGenerationCount,
  recordSuccessfulGeneration,
  scheduleEarnedEmailCapture,
  shouldTriggerEmailCaptureOnGeneration,
  cancelScheduledEmailCapture,
} from "@/lib/email-capture";
import type { EmailModalVariant } from "@/components/email-modal";
import type { EmailCaptureTrigger } from "@/lib/email-capture";
import type { ClientRecipeResponse } from "@shared/schema";
import { Flame } from "lucide-react";
import { HeroHeader, type HeroVariant } from "@/components/hero-header";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
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
    busy_level: inferBusyLevelFromTime(filters.time_available),
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
  hallVoteBannerRef,
  voteOptionCount = 0,
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
  /** True after first successful generation this session. */
  showHallVotePrompt?: boolean;
  hallVoteBannerRef?: React.RefObject<HTMLDivElement | null>;
  voteOptionCount?: number;
}) {
  const showRecipe = !error && recipe;
  const showEmpty = !loading && !error && !recipe;

  return (
    <div className="flex-1 min-w-0 overflow-x-hidden">
      {loading && !recipe && <LoadingState />}
      {loading && recipe && (
        <div className="relative">
          <div className="absolute inset-x-0 top-0 z-10 pointer-events-none px-1">
            <LoadingState variant="compact" mode="alternate" />
          </div>
          <div className="opacity-35 pointer-events-none select-none transition-opacity duration-300 blur-[0.5px]">
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
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500" key={stableRecipeKey(recipe)}>
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
            <HallVotePromoBanner
              onStartVote={onHallVoteClick}
              optionCount={voteOptionCount}
              bannerRef={hallVoteBannerRef}
            />
          )}
        </div>
      )}
      {showEmpty && (
        <EmptyState
          onGenerate={onGenerate}
          generateDisabled={generateDisabled}
          ctaLabel={ONE_TAP_MEAL_LABEL}
          summaryLine={formatDinnerOutcomeLine(filters, true)}
        />
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
  const [emailModalVariant, setEmailModalVariant] = useState<EmailModalVariant>("manual");
  const [emailCaptureTrigger, setEmailCaptureTrigger] = useState<EmailCaptureTrigger | undefined>();
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
  const hallVoteBannerRef = useRef<HTMLDivElement>(null);
  const hallVoteScrollDoneRef = useRef(false);

  // Generation counter — only incremented by successful, non-duplicate recipe delivery.
  const lastAppliedSignatureRef = useRef<string | null>(null);
  const [userGenCount, setUserGenCount] = useState(() => getPersistedGenerationCount());
  const [mealHistoryVersion, setMealHistoryVersion] = useState(0);

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
    return createFirstTapDefaults();
  });

  /** Meal-first layout: utility hero + recipe above filters on mobile after first successful gen. */
  const mealFocusMode = !!recipe && userGenCount >= 1;
  const heroVariant: HeroVariant = mealFocusMode
    ? "utility"
    : hasUserGeneratedBefore() || userGenCount > 0
      ? "compact"
      : "full";

  useEffect(() => {
    try { localStorage.setItem("firehall_filters", JSON.stringify(filters)); } catch {}
  }, [filters]);

  const openEarnedEmailCapture = useCallback((trigger: EmailCaptureTrigger) => {
    setEmailModalVariant("earned");
    setEmailCaptureTrigger(trigger);
    trackEmailModalOpened();
    trackEvent("email_capture_prompt_shown", { trigger });
    setEmailModalOpen(true);
  }, []);

  useEffect(() => {
    const onMealSaved = () => {
      scheduleEarnedEmailCapture("save", () => openEarnedEmailCapture("save"), 1100);
    };
    window.addEventListener("firehall-meal-saved", onMealSaved);
    return () => {
      window.removeEventListener("firehall-meal-saved", onMealSaved);
      cancelScheduledEmailCapture();
    };
  }, [openEarnedEmailCapture]);

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
    setMealHistoryVersion((v) => v + 1);
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
    const totalGens = recordSuccessfulGeneration();
    setUserGenCount(totalGens);

    if (totalGens === 1 && !hallVoteScrollDoneRef.current) {
      hallVoteScrollDoneRef.current = true;
      setTimeout(() => {
        hallVoteBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 700);
    }

    if (shouldTriggerEmailCaptureOnGeneration(totalGens)) {
      scheduleEarnedEmailCapture("generation", () => openEarnedEmailCapture("generation"), 1200);
    }

    console.log(
      `[Generate] Applied: "${data.title}" | seq=${seq} | id=${(data as any)._id} | style=${data.meal_style}`
    );

    // Scroll meal into view — mobile gets priority scroll to minimize filter chrome above fold.
    requestAnimationFrame(() => {
      const isMobile = window.matchMedia("(max-width: 1023px)").matches;
      recipeRef.current?.scrollIntoView({
        behavior: "smooth",
        block: isMobile ? "start" : "nearest",
      });
    });
  }, [openEarnedEmailCapture]);

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

    // Try prefetch cache first (skipped when "Different Meal" is active).
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
        errorMsg = "Still warming up — tap Put dinner on the board to try again.";
      } else {
        errorMsg = "Generation failed. Please try again.";
      }

      setError(errorMsg);
      setLoading(false);
      isGenerating.current = false;

      toast({
        title: "Generation failed",
        description: "Tap Put dinner on the board or Different Meal to try again.",
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
    setMealHistoryVersion((v) => v + 1);
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
    setMealHistoryVersion((v) => v + 1);
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
    setEmailModalVariant("manual");
    setEmailCaptureTrigger(undefined);
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

  const voteRecipes = useMemo(() => {
    const hist = mealHistoryRef.current;
    if (hist.length >= 2) return hist.slice(-5);
    return recentRecipes;
  }, [recentRecipes, mealHistoryVersion]);

  const showHallVotePrompt = userGenCount >= 1 && !!recipe && !loading;
  const oneTapMode = !recipe && !loading && userGenCount === 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activePage="generator" favCount={favCount} />

      <HeroHeader
        title="Firehall Meals"
        variant={heroVariant}
        headline={heroVariant === "full" ? "What's for dinner at the hall?" : undefined}
        subtitle={
          mealFocusMode
            ? "Dinner solved before the next call."
            : heroVariant === "compact"
              ? "Dinner solved before the next call."
              : "Settle it before tones drop — full crew dinners with ingredients, sides, and steps."
        }
        supportingText={heroVariant === "full" ? "Built by firefighters. For hungry crews." : undefined}
        showCTAs={heroVariant === "full"}
      />

      <main
        className={cn(
          "max-w-[1400px] mx-auto px-4 sm:px-6 pb-28 lg:pb-8 transition-[padding] duration-500 ease-out",
          mealFocusMode ? "py-2 sm:py-3 lg:py-4" : heroVariant === "compact" ? "py-4 sm:py-5" : "py-8",
        )}
      >
        <div
          className={cn(
            "flex flex-col lg:flex-row transition-[gap] duration-500",
            mealFocusMode
              ? "gap-4 flex-col-reverse lg:flex-row"
              : oneTapMode
                ? "gap-4 flex-col-reverse lg:flex-row lg:gap-8"
                : "gap-8",
          )}
        >
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

          <div ref={recipeRef} className="scroll-mt-[3.5rem] lg:scroll-mt-16 min-w-0 flex-1">
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
              hallVoteBannerRef={hallVoteBannerRef}
              voteOptionCount={voteRecipes.length}
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
            variant={emailModalVariant}
            captureTrigger={emailCaptureTrigger}
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
      {voteRecipes.length >= 1 && (
        <HallVoteModal
          open={hallVoteOpen}
          onOpenChange={setHallVoteOpen}
          recipes={voteRecipes}
          onGenerateAnother={handleGenerateAnother}
          isGenerating={loading}
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
