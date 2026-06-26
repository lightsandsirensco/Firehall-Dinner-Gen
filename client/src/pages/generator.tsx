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
import { useHallFeedback } from "@/lib/hall-feedback/context";
import { shouldShowGeneratorSmokedError } from "@/lib/hall-feedback/generator-error";
import { EmailModal } from "@/components/email-modal";
import { ShoppingListModal } from "@/components/shopping-list-modal";
import { HallVoteModal } from "@/components/hall-vote-modal";
import { HallVotePromoBanner } from "@/components/hall-vote-promo-banner";
import { buildShoppingListFromClientMeal } from "@/lib/shopping-list";
import { useMeasurementSystem } from "@/components/measurement-unit-toggle";
import { getSavedCount } from "@/lib/saved-meals";
import { apiRequest } from "@/lib/queryClient";
import { parseApiError } from "@/lib/parse-api-error";
import {
  GENERATION_GAME_DAY_MESSAGE,
  GENERATION_USER_FAILURE_MESSAGE,
  GENERATION_USER_RETRY_MESSAGE,
} from "@shared/generation-reliability";
import { buildFilterKey, putCached, addRecentSignature, getRecentSignatures } from "@/lib/recipe-cache";
import { getRecentMealSlugs, recordMealSlug } from "@/lib/meal-rotation-memory";
import { recordMealGenerated } from "@/lib/hall-history-store";
import { syncHallProfileCrewSizeFromFilters } from "@/lib/hall-profile-store";
import { RecentlyCookedStrip } from "@/components/hall-history/recently-cooked-strip";
import { RepeatWarning } from "@/components/hall-history/repeat-warning";
import { useHallHistory } from "@/hooks/use-hall-history";
import {
  schedulePrefetchAfterGeneration,
  cancelActivePrefetches,
  consumePrefetched,
  markUserHasGenerated,
  hasUserGeneratedBefore,
} from "@/lib/prefetch";
import { GENERATION_INTENT_USER } from "@shared/generation-intent";
import { trackEvent, trackMealGenerationStarted, trackMealGenerated, trackMealGenerationFailed, trackEmailModalOpened } from "@/lib/analytics";
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
import { useMealHeroPoll } from "@/lib/recipe-hero";
import { Flame } from "lucide-react";
import { GENERATOR, CTA } from "@/lib/brand-copy";
import { Link } from "wouter";
import { SiteFooter } from "@/components/site-footer";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { StickyCTA } from "@/components/mobile/sticky-cta";
import { FirstShiftTip } from "@/components/first-shift-tip";
import { useToast } from "@/hooks/use-toast";
import { hapticLight, hapticSuccess, hapticWarning } from "@/lib/haptics";
import { shouldShowFirstShiftTip } from "@/lib/app-session";
import { useGeneratorSeo } from "@/lib/seo/use-generator-seo";
import { useAuth } from "@/lib/auth/context";
import { OnboardingBanner } from "@/components/onboarding/onboarding-banner";
import {
  isOnboardingMode,
  markFirstMealGenerated,
  onboardingSignalsFromAuth,
} from "@/lib/onboarding/state";
import { trackPersonalOnboardingStepCompleted } from "@/lib/analytics";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function GeneratorMealRepeatWarning({ recipe }: { recipe: ClientRecipeResponse }) {
  const { shouldAvoidRepeat } = useHallHistory();
  const slug = (recipe as ClientRecipeResponse & { _slug?: string })._slug;
  const repeat = shouldAvoidRepeat(slug);
  return <RepeatWarning entry={repeat.entry} avoid={repeat.avoid} className="mb-4" />;
}

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
    firehall_category: filters.firehall_category,
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
  errorSmoked,
  errorTitle,
  onSendFeedback,
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
  hideInitialEmpty = false,
}: {
  loading: boolean;
  error: string | null;
  errorSmoked?: boolean;
  errorTitle?: string;
  onSendFeedback?: () => void;
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
  hideInitialEmpty?: boolean;
}) {
  const recipeWithHero = useMealHeroPoll(recipe);
  const showRecipe = !error && recipeWithHero;
  const showEmpty = !loading && !error && !recipeWithHero;

  return (
    <div className="flex-1 min-w-0 overflow-x-hidden">
      {loading && !recipe && <LoadingState />}
      {loading && recipeWithHero && (
        <div className="relative">
          <div className="absolute inset-x-0 top-0 z-10 pointer-events-none px-1">
            <LoadingState variant="compact" mode="alternate" />
          </div>
          <div className="opacity-35 pointer-events-none select-none transition-opacity duration-300 blur-[0.5px]">
            <RecipeCard
              recipe={recipeWithHero}
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
      {!loading && error && error !== "no_match" && errorSmoked && (
        <div className="animate-in fade-in duration-300">
          <ErrorState type="generator_smoked" onSendFeedback={onSendFeedback} />
        </div>
      )}
      {!loading && error && error !== "no_match" && !errorSmoked && (
        <div className="animate-in fade-in duration-300">
          <ErrorState type="error" message={error} title={errorTitle} />
        </div>
      )}
      {!loading && showRecipe && recipeWithHero && (
        <div className="meal-reveal motion-reduce:animate-none" key={stableRecipeKey(recipeWithHero)}>
          <GeneratorMealRepeatWarning recipe={recipeWithHero} />
          {historyNav.total > 1 && historyNav.index < historyNav.total - 1 && (
            <div className="flex items-center justify-center mb-3" data-testid="history-position-indicator">
              <span className="text-xs text-muted-foreground/60 font-mono tracking-widest uppercase">
                Earlier pick · {historyNav.index + 1} of {historyNav.total}
              </span>
            </div>
          )}
          <RecipeCard
            key={stableRecipeKey(recipeWithHero)}
            recipe={recipeWithHero}
            crewSize={filters.crew_size}
            onEmailClick={onEmailClick}
            onShoppingListClick={onShoppingListClick}
            onHallVoteClick={onHallVoteClick}
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
      {showEmpty && !hideInitialEmpty && (
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

// ─── Generator Page ───────────────────────────────────────────────────────────

export default function Generator() {
  useGeneratorSeo();
  const { user, profile, halls } = useAuth();
  const onboardingMode = isOnboardingMode();
  // ── Core recipe state ─────────────────────────────────────────────────────
  // recipe is ALWAYS replaced atomically — never partially updated.
  // Title, ingredients, steps, timing, tags, macros all come from the same object.
  const [recipe, setRecipe] = useState<ClientRecipeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorSmoked, setErrorSmoked] = useState(false);
  const [errorTitle, setErrorTitle] = useState<string | undefined>();
  const { openFeedback } = useHallFeedback();

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
  const [measurementSystem] = useMeasurementSystem();
  const [hallVoteOpen, setHallVoteOpen] = useState(false);
  const [recentRecipes, setRecentRecipes] = useState<ClientRecipeResponse[]>([]);
  const [favCount, setFavCount] = useState(() => getSavedCount());
  const [showFirstShiftTip, setShowFirstShiftTip] = useState(
    () => shouldShowFirstShiftTip() && !hasUserGeneratedBefore(),
  );

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

  const generationFiltersRef = useRef<FilterState | null>(null);
  const generationCacheHitRef = useRef(false);

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

  /** Meal-first layout: recipe above filters on mobile after first successful gen. */
  const mealFocusMode = !!recipe && userGenCount >= 1;

  useEffect(() => {
    try { localStorage.setItem("firehall_filters", JSON.stringify(filters)); } catch {}
    syncHallProfileCrewSizeFromFilters(filters.crew_size);
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

  // ── Warmup only — no background /api/generate on mount (burned rate limits) ─
  useEffect(() => {
    fetch("/api/warm").catch(() => {});
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
      setErrorSmoked(false);
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
    const slug = (data as ClientRecipeResponse & { _slug?: string })._slug;
    if (slug) recordMealSlug(slug);

    // Atomic state replacement — all three fire in the same React commit.
    setRecipe(data);
    setLoading(false);
    setError(null);
    setErrorSmoked(false);

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
    if (user?.user_id) {
      const signals = onboardingSignalsFromAuth(halls, profile);
      markFirstMealGenerated(user.user_id, signals);
      trackPersonalOnboardingStepCompleted("generate_meal");
    }
    const genFilters = generationFiltersRef.current;
    trackMealGenerated({
      recipe_title: data.title,
      recipe_slug: slug,
      protein: genFilters?.protein,
      crew_size: genFilters?.crew_size,
      time_available:
        genFilters?.time_available != null ? Number(genFilters.time_available) : undefined,
      meal_category: genFilters?.firehall_category,
      matched_category:
        typeof (data as { _matched_firehall_category?: string })._matched_firehall_category ===
        "string"
          ? (data as { _matched_firehall_category?: string })._matched_firehall_category
          : undefined,
      category_broadened: Boolean(
        (data as { _category_broadened?: boolean })._category_broadened,
      ),
      meal_format: data.meal_style,
      cache_hit: generationCacheHitRef.current,
    });
    recordMealGenerated({
      title: data.title,
      recipeSlug: slug,
      crewSize: genFilters?.crew_size,
      source: "generator",
    });
    hapticSuccess();
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
  }, [halls, openEarnedEmailCapture, profile, user?.user_id]);

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
    hapticLight();
    isGenerating.current = true;
    cancelActivePrefetches();

    // Cancel any in-flight request (e.g. if the lock somehow wasn't set).
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const seq = ++latestRequestSeq.current;
    const requestId = makeRequestId();
    console.log(`[Generate] Starting seq=${seq} rid=${requestId} preferDiff=${preferDifferentStyle}`);

    setError(null);
    setErrorSmoked(false);
    setErrorTitle(undefined);
    setLoading(true);
    trackMealGenerationStarted({
      meal_category: currentFilters.firehall_category,
    });
    generationFiltersRef.current = currentFilters;
    generationCacheHitRef.current = false;

    const payload = buildRequestPayload(currentFilters, templateId, preferDifferentStyle);
    const filterKey = buildFilterKey(payload);

    // Try prefetch cache first (skipped when "Different Meal" is active).
    if (!preferDifferentStyle) {
      const cached = consumePrefetched(payload, templateId);
      if (cached) {
        console.log(`[Generate] Prefetch hit: "${cached.title}" seq=${seq}`);
        generationCacheHitRef.current = true;
        applyRecipe(cached, seq);
        schedulePrefetchAfterGeneration(payload);
        return;
      }
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 50_000);

    try {
      const recentSigs = getRecentSignatures();
      const recentSlugs = getRecentMealSlugs();
      const debugParam = new URLSearchParams(window.location.search).get("debug") === "1" ? "?debug=1" : "";

      const res = await apiRequest("POST", `/api/generate${debugParam}`, {
        ...payload,
        request_id: requestId,
        generation_intent: GENERATION_INTENT_USER,
        exclude_signatures: recentSigs,
        recentSignatures: recentSigs,
        recentSlugs,
        currentRecipeSignature: currentSignatureRef.current,
      }, 50_000, controller.signal);

      if (seq !== latestRequestSeq.current) {
        console.log(`[Generate] Stale after fetch — discarding seq=${seq}`);
        return;
      }

      const data: ClientRecipeResponse = await res.json();
      if (!data?.title || !Array.isArray(data.steps) || data.steps.length === 0) {
        throw new Error("500: {\"code\":\"generation_failed\",\"message\":\"Server returned an incomplete recipe.\"}");
      }

      console.log(`[Generate] Received: "${data.title}" seq=${seq}`);
      applyRecipe(data, seq);

      if (!preferDifferentStyle) {
        putCached(filterKey, data);
        schedulePrefetchAfterGeneration(payload);
      }
    } catch (err: unknown) {
      if (seq !== latestRequestSeq.current) {
        console.log(`[Generate] Stale error — discarding seq=${seq}`);
        return;
      }

      const parsed = parseApiError(err);
      console.error(`[Generate] Error seq=${seq}:`, parsed);

      let errorMsg: string;
      let title: string | undefined;
      const isGameDay = currentFilters.firehall_category === "game_day";
      if (parsed.code === "no_match" || parsed.status === 404) {
        errorMsg = "no_match";
        setRecipe(null);
        hapticWarning();
      } else if (
        parsed.code === "category_thinned" ||
        (isGameDay && (parsed.status === 503 || parsed.code === "generation_failed"))
      ) {
        errorMsg = parsed.message || GENERATION_GAME_DAY_MESSAGE;
        title = "Game Day picks";
      } else if (parsed.code === "rate_limited" || parsed.status === 429) {
        errorMsg = parsed.message;
      } else if (parsed.code === "in_flight" || parsed.code === "duplicate_request" || parsed.status === 409) {
        errorMsg = parsed.message;
      } else if (parsed.code === "upstream_timeout" || parsed.status === 504) {
        errorMsg = parsed.message;
      } else if (parsed.code === "validation_error" || parsed.status === 400) {
        errorMsg = parsed.message || GENERATION_USER_RETRY_MESSAGE;
      } else if (parsed.status === 503 || parsed.message.includes("budget")) {
        errorMsg = GENERATION_USER_FAILURE_MESSAGE;
      } else if (parsed.status === 403) {
        errorMsg = "Security check failed. Refresh the page and try again.";
      } else {
        errorMsg = parsed.message || GENERATION_USER_FAILURE_MESSAGE;
      }

      setErrorSmoked(
        shouldShowGeneratorSmokedError({
          errorMsg,
          title,
          parsed,
          isGameDay,
        }),
      );
      setError(errorMsg);
      setErrorTitle(title);
      trackMealGenerationFailed(parsed.code || String(parsed.status ?? "unknown"));
      toast({
        title: parsed.code === "rate_limited" ? "Give the line a breath" : "Generation failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      clearTimeout(timeout);
      if (seq === latestRequestSeq.current) {
        setLoading(false);
        isGenerating.current = false;
        abortControllerRef.current = null;
      }
    }
  }, [applyRecipe, toast]);

  // ── Button handlers ───────────────────────────────────────────────────────
  const handleGenerateClick = useCallback(() => {
    if (showFirstShiftTip) setShowFirstShiftTip(false);
    handleGenerate(filters);
  }, [filters, handleGenerate, showFirstShiftTip]);

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
    setErrorSmoked(false);
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
    setErrorSmoked(false);
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
    if (recipe) return [recipe];
    return recentRecipes;
  }, [recentRecipes, mealHistoryVersion, recipe]);

  const showHallVotePrompt = !!recipe && !loading;
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background">
      <SiteHeader activePage="generator" favCount={favCount} />

      <main
        className={cn(
          app.main,
          "pb-safe-tabs-cta lg:pb-12 transition-[padding] duration-500 ease-out scroll-momentum",
          mealFocusMode ? "py-4 lg:py-6" : "py-6 sm:py-8",
        )}
      >
        {onboardingMode && <OnboardingBanner className="mb-6 max-w-2xl" />}

        {showFirstShiftTip && !mealFocusMode && !onboardingMode && (
          <FirstShiftTip onDismiss={() => setShowFirstShiftTip(false)} />
        )}

        {!mealFocusMode && (
          <RecentlyCookedStrip className="mb-6 max-w-2xl" source="generator" />
        )}

        {!mealFocusMode && (
          <header className="mb-6 lg:mb-8 max-w-2xl">
            <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl tracking-tight">
              {GENERATOR.headline}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-prose">
              {GENERATOR.subline}
            </p>
            <p className="mt-3 text-sm">
              <Link href="/wheel" className="text-primary font-medium hover:underline">
                {GENERATOR.wheelLink}
              </Link>
            </p>
          </header>
        )}

        {mealFocusMode && (
          <header className="mb-4 lg:mb-6">
            <h1 className="font-heading text-2xl sm:text-3xl tracking-tight">{GENERATOR.headlineWithMeal}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{GENERATOR.sublineFocus}</p>
          </header>
        )}

        <div
          className={cn(
            "flex flex-col transition-[gap] duration-500",
            mealFocusMode
              ? "gap-3 flex-col-reverse lg:grid lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] lg:gap-10 lg:items-start"
              : "gap-6 lg:grid lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] lg:gap-10 lg:items-start",
          )}
        >
          <aside
            className={cn(
              "w-full flex-shrink-0 lg:sticky lg:top-[calc(3.5rem+env(safe-area-inset-top,0px))] lg:self-start",
              mealFocusMode && "lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto lg:overscroll-contain",
            )}
          >
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
              minimalSurface={false}
              hideGenerateButtons={false}
            />
          </aside>

          <div ref={recipeRef} className="scroll-section min-w-0 w-full">
            <ResultsPanel
              loading={loading}
              error={error}
              errorSmoked={errorSmoked}
              errorTitle={errorTitle}
              onSendFeedback={() => openFeedback("generator_error")}
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
              hideInitialEmpty={false}
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
              measurementSystem,
            })}
            recipeTitle={recipe.title}
            generatorType="meal"
          />
        </>
      )}
      {recipe && (
        <HallVoteModal
          open={hallVoteOpen}
          onOpenChange={setHallVoteOpen}
          recipes={voteRecipes}
          source="generator"
          onGenerateAnother={handleGenerateAnother}
          isGenerating={loading}
        />
      )}

      <StickyCTA
        filters={filters}
        hasRecipe={!!recipe}
        isLoading={loading}
        compact
        canGoBack={historyNav.index > 0}
        canGoForward={historyNav.index < historyNav.total - 1}
        onGenerate={handleGenerateClick}
        onGenerateAnother={handleGenerateAnother}
        onBack={handleBack}
        onForward={handleForward}
        onScrollToFilters={scrollToFilters}
      />

      <SiteFooter variant="compact" className="mt-10" pbSafe />
    </div>
  );
}
