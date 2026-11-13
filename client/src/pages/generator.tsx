import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { SimplifiedStickyGenerate } from "@/components/generator/simplified-generator-form";
import {
  FilterChangeNotice,
  GeneratorFiltersPanel,
  compareFiltersToMeal,
  type FilterChange,
} from "@/components/generator/generator-filters-panel";
import {
  simplifiedFiltersToGenerateRequest,
  CREW_BUCKET_TO_SIZE,
  type SimplifiedGeneratorFilters,
} from "@shared/generator-simplified";
import { ONE_TAP_MEAL_LABEL } from "@/lib/meal-outcome-copy";
import { buildGenerateRequestInput } from "@shared/generate-request-defaults";
import { getWheelClassicBySlug, buildPackageUrl } from "@/lib/firehall-classics-wheel";
import { RecipeCard } from "@/components/recipe-card";
import { TonightPickCard } from "@/components/generator/tonight-pick-card";
import { clearSessionFeedback, loadSessionFeedback, saveSessionFeedback } from "@/lib/tonight-session-feedback";
import {
  applyNotFeelingIt,
  describeSessionFeedback,
  hasSessionFeedback,
  type NotFeelingItReason,
} from "@shared/tonight-filters";
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
import { setTonightSelection } from "@/lib/tonight-selection-store";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import { isApprovedCatalogSlug } from "@shared/hall-catalog/gate";
import { syncHallProfileCrewSizeFromFilters } from "@/lib/hall-profile-store";
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
import { trackEvent, trackMealGenerationStarted, trackMealGenerated, trackMealGenerationFailed, trackEmailModalOpened, trackRecipeGeneratedWithNutritionGoal, trackHistoryPersonalizationUsed, trackPersonalizedRecipeSelected } from "@/lib/analytics";
import {
  getPersistedGenerationCount,
  recordSuccessfulGeneration,
} from "@/lib/email-capture";
import type { ClientRecipeResponse } from "@shared/schema";
import { useMealHeroPoll } from "@/lib/recipe-hero";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GENERATOR, CTA } from "@/lib/brand-copy";
import { SiteFooter } from "@/components/site-footer";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { FirstShiftTip } from "@/components/first-shift-tip";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { hideRecipeFromPicks, unhideRecipe } from "@/lib/recipe-dislikes";
import { hapticLight, hapticSuccess, hapticWarning } from "@/lib/haptics";
import { shouldShowFirstShiftTip } from "@/lib/app-session";
import { useGeneratorSeo } from "@/lib/seo/use-generator-seo";
import { useAuth } from "@/lib/auth/context";
import { useHallMembership } from "@/lib/hall-membership/context";
import {
  loadInitialGeneratorFilters,
  mergeAuthAndHallIntoFilters,
  persistGeneratorSelections,
  persistGeneratorSession,
  savePersonalGeneratorPrefs,
} from "@/lib/generator-personalization";
import { OnboardingBanner } from "@/components/onboarding/onboarding-banner";
import {
  isOnboardingMode,
  markFirstMealGenerated,
  onboardingSignalsFromAuth,
} from "@/lib/onboarding/state";
import { trackPersonalOnboardingStepCompleted } from "@/lib/analytics";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TONIGHT_RECIPE_ANCHOR_ID = "tonight-recipe";
/** Current pick for this tab, so Back from the recipe page returns to the same meal. */
const CURRENT_PICK_SESSION_KEY = "firehall:pick-tonight:current";

function readSessionPick(): ClientRecipeResponse | null {
  try {
    const raw = sessionStorage.getItem(CURRENT_PICK_SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as ClientRecipeResponse) : null;
    return parsed && typeof parsed.title === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function writeSessionPick(recipe: ClientRecipeResponse | null): void {
  try {
    if (recipe) sessionStorage.setItem(CURRENT_PICK_SESSION_KEY, JSON.stringify(recipe));
    else sessionStorage.removeItem(CURRENT_PICK_SESSION_KEY);
  } catch {
    /* storage full or disabled — Back just shows the empty state */
  }
}

function signatureOf(recipe: ClientRecipeResponse | null): string {
  return (recipe as (ClientRecipeResponse & { _signature?: string }) | null)?._signature || "";
}

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

function buildRequestPayload(
  filters: SimplifiedGeneratorFilters,
  templateId?: number,
  preferDifferentStyle = false,
) {
  const feedback = loadSessionFeedback();
  return buildGenerateRequestInput(
    simplifiedFiltersToGenerateRequest(filters, {
      last_template_id: templateId,
      prefer_different_style: preferDifferentStyle,
      recent_meal_styles: getRecentMealStyles(),
      ...(hasSessionFeedback(feedback) ? { session_feedback: feedback } : {}),
    }),
  );
}

function crewSizeFromFilters(filters: SimplifiedGeneratorFilters): number {
  return CREW_BUCKET_TO_SIZE[filters.crew_bucket];
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
  onPickAgain,
  onNotFeelingIt,
  onNotForUs,
  adjustingSummary,
  onResetAdjustments,
  generateDisabled,
  showHallVotePrompt = false,
  hallVoteBannerRef,
  voteOptionCount = 0,
  hideInitialEmpty = false,
  relaxationNoteInHeader = false,
  onBack,
  onForward,
  filterChange,
  onApplyFilters,
}: {
  onBack: () => void;
  onForward: () => void;
  filterChange: FilterChange | null;
  onApplyFilters: () => void;
  loading: boolean;
  error: string | null;
  errorSmoked?: boolean;
  errorTitle?: string;
  onSendFeedback?: () => void;
  recipe: ClientRecipeResponse | null;
  recentRecipes: ClientRecipeResponse[];
  filters: SimplifiedGeneratorFilters;
  onEmailClick: () => void;
  onShoppingListClick: () => void;
  onHallVoteClick: () => void;
  historyNav: { index: number; total: number };
  onGenerate: () => void;
  onPickAgain: () => void;
  onNotFeelingIt: (reason: NotFeelingItReason, proteinLabel: string | null) => void;
  /** Signed-in only. */
  onNotForUs?: () => void;
  adjustingSummary?: string;
  onResetAdjustments: () => void;
  generateDisabled: boolean;
  /** True after first successful generation this session. */
  showHallVotePrompt?: boolean;
  hallVoteBannerRef?: React.RefObject<HTMLDivElement | null>;
  voteOptionCount?: number;
  hideInitialEmpty?: boolean;
  /** The page header already shows the fallback note in place of its subline. */
  relaxationNoteInHeader?: boolean;
}) {
  const recipeWithHero = useMealHeroPoll(recipe);
  // A failed re-pick keeps the meal the crew already has; full error screens are only for "no meal yet".
  const showRecipe = recipeWithHero;
  const showEmpty = !loading && !error && !recipeWithHero;
  const showFullError = !loading && Boolean(error) && !recipeWithHero;
  const pickedCrewSize = recipeWithHero?.servings && recipeWithHero.servings > 0 ? recipeWithHero.servings : crewSizeFromFilters(filters);

  return (
    <div className="flex-1 min-w-0 overflow-x-hidden">
      {loading && !recipe && <LoadingState />}
      {loading && recipeWithHero && (
        <div className="relative">
          <div className="absolute inset-x-0 top-0 z-10 pointer-events-none px-1">
            <LoadingState variant="compact" mode="alternate" />
          </div>
          <div className="opacity-35 pointer-events-none select-none transition-opacity duration-300 blur-[0.5px]">
            <TonightPickCard recipe={recipeWithHero} crewSize={pickedCrewSize} />
          </div>
        </div>
      )}
      {showFullError && error === "no_match" && (
        <div className="animate-in fade-in duration-300">
          <ErrorState type="no_match" />
        </div>
      )}
      {showFullError && error !== "no_match" && errorSmoked && (
        <div className="animate-in fade-in duration-300">
          <ErrorState type="generator_smoked" onSendFeedback={onSendFeedback} />
        </div>
      )}
      {showFullError && error !== "no_match" && !errorSmoked && (
        <div className="animate-in fade-in duration-300">
          <ErrorState type="error" message={error ?? undefined} title={errorTitle} />
        </div>
      )}
      {!loading && error && recipeWithHero && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm"
          data-testid="repick-error-note"
        >
          Couldn&apos;t get a new pick just now — your current meal is still here. Try again in a moment.
        </p>
      )}
      {!loading && showRecipe && recipeWithHero && (
        <div className="meal-reveal motion-reduce:animate-none" key={stableRecipeKey(recipeWithHero)}>
          {filterChange && (
            <FilterChangeNotice change={filterChange} onApply={onApplyFilters} isLoading={loading} />
          )}
          {historyNav.total > 1 && (
            <nav aria-label="Earlier picks" className="mb-3 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="min-h-10"
                onClick={onBack}
                disabled={historyNav.index <= 0}
                data-testid="button-back"
              >
                <ChevronLeft className="w-4 h-4 mr-1" aria-hidden />
                Previous
              </Button>
              <span
                className="text-xs text-muted-foreground/70 font-mono tracking-widest uppercase"
                data-testid="history-position-indicator"
              >
                Pick {historyNav.index + 1} of {historyNav.total}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-10"
                onClick={onForward}
                disabled={historyNav.index >= historyNav.total - 1}
                data-testid="button-forward"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" aria-hidden />
              </Button>
            </nav>
          )}
          {!relaxationNoteInHeader &&
            (recipeWithHero as ClientRecipeResponse & { _relaxation_note?: string })._relaxation_note && (
            <p
              className="mb-3 text-sm text-muted-foreground rounded-lg border border-border/40 bg-muted/30 px-3 py-2"
              data-testid="relaxation-note"
            >
              {(recipeWithHero as ClientRecipeResponse & { _relaxation_note?: string })._relaxation_note}
            </p>
          )}
          <div className="mb-6">
            <TonightPickCard
              recipe={recipeWithHero}
              crewSize={pickedCrewSize}
              onPickAgain={onPickAgain}
              pickAgainDisabled={generateDisabled}
              recipeAnchorId={TONIGHT_RECIPE_ANCHOR_ID}
              onNotFeelingIt={onNotFeelingIt}
              onNotForUs={onNotForUs}
              adjustingSummary={adjustingSummary}
              onResetAdjustments={onResetAdjustments}
            />
          </div>
          {(recipeWithHero._personalization_reasons?.length || recipeWithHero._personalization_note) && (
            <div
              className="mb-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground"
              data-testid="personalization-note"
            >
              {recipeWithHero._picked_for_you && (
                <p className="mb-0.5 font-semibold uppercase tracking-wider text-[11px] text-primary" data-testid="picked-for-you">
                  Picked for you
                </p>
              )}
              <ul className="space-y-0.5">
                {(recipeWithHero._personalization_reasons?.length
                  ? recipeWithHero._personalization_reasons
                  : [recipeWithHero._personalization_note!]
                )
                  .slice(0, 2)
                  .map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
              </ul>
            </div>
          )}
          <GeneratorMealRepeatWarning recipe={recipeWithHero} />
          <div id={TONIGHT_RECIPE_ANCHOR_ID} className="scroll-mt-20">
            <RecipeCard
              key={stableRecipeKey(recipeWithHero)}
              recipe={recipeWithHero}
              crewSize={pickedCrewSize}
              onEmailClick={onEmailClick}
              onShoppingListClick={onShoppingListClick}
              onHallVoteClick={onHallVoteClick}
              nutritionGoal={filters.nutrition_goal}
              hideIntro
            />
          </div>
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
        />
      )}
    </div>
  );
});

// ─── Generator Page ───────────────────────────────────────────────────────────

export default function Generator() {
  useGeneratorSeo();
  const { user, profile, preferences, halls } = useAuth();
  const { detail, activeHall } = useHallMembership();
  const hallLinked = Boolean(activeHall && detail?.hall);
  const onboardingMode = isOnboardingMode();
  // ── Core recipe state ─────────────────────────────────────────────────────
  // recipe is ALWAYS replaced atomically — never partially updated.
  // Title, ingredients, steps, timing, tags, macros all come from the same object.
  const [restoredPick] = useState(readSessionPick);
  const [recipe, setRecipe] = useState<ClientRecipeResponse | null>(restoredPick);
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
  const mealHistoryRef = useRef<ClientRecipeResponse[]>(restoredPick ? [restoredPick] : []);
  const historyIndexRef = useRef<number>(restoredPick ? 0 : -1);
  const [historyNav, setHistoryNav] = useState(restoredPick ? { index: 0, total: 1 } : { index: -1, total: 0 });

  // ── Supporting state ──────────────────────────────────────────────────────
  const [lastTemplateId, setLastTemplateId] = useState<number | undefined>();
  const [emailModalOpen, setEmailModalOpen] = useState(false);
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
  const currentSignatureRef = useRef(signatureOf(restoredPick));

  const generationFiltersRef = useRef<SimplifiedGeneratorFilters | null>(null);
  /** Filters the on-screen meal was picked with; a failed re-pick keeps it only if they still match. */
  const shownMealFiltersRef = useRef<string | null>(null);
  const [mealFilters, setMealFilters] = useState<SimplifiedGeneratorFilters | null>(null);
  const pickFiltersRef = useRef(new WeakMap<ClientRecipeResponse, SimplifiedGeneratorFilters>());
  const markShownMealFilters = useCallback(
    (next: SimplifiedGeneratorFilters | null, pickedRecipe?: ClientRecipeResponse) => {
      if (next && pickedRecipe) pickFiltersRef.current.set(pickedRecipe, next);
      shownMealFiltersRef.current = next ? JSON.stringify(next) : null;
      setMealFilters(next);
    },
    [],
  );
  const generationCacheHitRef = useRef(false);

  // recipeRef: scroll target for the results panel.
  const recipeRef = useRef<HTMLDivElement>(null);
  const hallVoteBannerRef = useRef<HTMLDivElement>(null);

  // Generation counter — only incremented by successful, non-duplicate recipe delivery.
  const lastAppliedSignatureRef = useRef<string | null>(signatureOf(restoredPick) || null);

  useEffect(() => {
    writeSessionPick(recipe);
  }, [recipe]);
  const [userGenCount, setUserGenCount] = useState(() => getPersistedGenerationCount());
  const [mealHistoryVersion, setMealHistoryVersion] = useState(0);

  const { toast } = useToast();

  // ── Favourites counter ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setFavCount(getSavedCount());
    window.addEventListener("favorites-changed", handler);
    return () => window.removeEventListener("favorites-changed", handler);
  }, []);

  // ── Filters (personalized: hall + account + last session) ───────────────
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [filters, setFilters] = useState<SimplifiedGeneratorFilters>(() => loadInitialGeneratorFilters());
  const filtersPersistInitRef = useRef(true);

  /** Meal-first layout: recipe above filters on mobile after first successful gen. */
  const mealFocusMode = !!recipe && userGenCount >= 1;
  const relaxationNote =
    !loading && !error
      ? (recipe as (ClientRecipeResponse & { _relaxation_note?: string }) | null)?._relaxation_note
      : undefined;

  useEffect(() => {
    persistGeneratorSession(filters);
    if (filtersPersistInitRef.current) {
      filtersPersistInitRef.current = false;
      return;
    }
    syncHallProfileCrewSizeFromFilters(crewSizeFromFilters(filters));
    savePersonalGeneratorPrefs(filters);
  }, [filters]);

  const personalizationMergedRef = useRef("");
  useEffect(() => {
    const mergeKey = `${detail?.hall?.hall_id ?? "none"}:${preferences ? "prefs" : "none"}`;
    if (personalizationMergedRef.current === mergeKey) return;
    if (!preferences && !detail?.hall) return;
    personalizationMergedRef.current = mergeKey;
    setFilters((current) =>
      mergeAuthAndHallIntoFilters(current, {
        preferences,
        hall: detail?.hall ?? null,
        hallLinked,
        profile,
      }),
    );
  }, [preferences, profile, detail?.hall, hallLinked]);

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
    if (genFilters) persistGeneratorSelections(genFilters);
    trackMealGenerated({
      recipe_title: data.title,
      recipe_slug: slug,
      protein: genFilters?.protein,
      crew_size: genFilters ? crewSizeFromFilters(genFilters) : undefined,
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
    if (genFilters?.nutrition_goal) {
      trackRecipeGeneratedWithNutritionGoal({ goal: genFilters.nutrition_goal, recipe_slug: slug });
    }
    const personalization = data as ClientRecipeResponse & {
      _personalization_used?: boolean;
      _personalization_note?: string;
      _personalization_signal_types?: string;
      _personalization_sample_bucket?: string;
    };
    if (personalization._personalization_used) {
      trackHistoryPersonalizationUsed({
        sample_size_bucket: personalization._personalization_sample_bucket || "none",
      });
    }
    if (personalization._personalization_signal_types) {
      trackPersonalizedRecipeSelected({
        signal_types_used: personalization._personalization_signal_types || "",
        sample_size_bucket: personalization._personalization_sample_bucket || "none",
      });
    }
    recordMealGenerated({
      title: data.title,
      recipeSlug: slug,
      crewSize: genFilters ? crewSizeFromFilters(genFilters) : undefined,
      source: "generator",
    });
    const catalogRecipePath =
      slug && isApprovedCatalogSlug(slug) ? approvedCatalogRecipePath(slug) : undefined;
    setTonightSelection({
      source: "generator",
      title: data.title,
      recipeSlug: slug,
      recipePath: catalogRecipePath,
      imageUrl: data.hero_image,
      description: data.why_it_fits_tonight,
      crewSize: genFilters ? crewSizeFromFilters(genFilters) : data.servings,
      prepMinutes: data.timing?.prep_min,
      cookMinutes: data.timing?.cook_min,
      // Only /recipes/ pages honor `?cook=1`; keep the result so Tonight can open Cook Mode itself.
      generatedRecipe: catalogRecipePath?.startsWith("/recipes/") ? undefined : data,
    });
    hapticSuccess();
    const totalGens = recordSuccessfulGeneration();
    setUserGenCount(totalGens);

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
  }, [halls, profile, user?.user_id]);

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
    currentFilters: SimplifiedGeneratorFilters,
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
    trackMealGenerationStarted({});
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
        markShownMealFilters(currentFilters, cached);
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
      markShownMealFilters(currentFilters, data);

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
      const isGameDay = false;
      // The on-screen meal may not satisfy changed filters (e.g. a newly added allergen).
      if (shownMealFiltersRef.current !== JSON.stringify(currentFilters)) {
        setRecipe(null);
        markShownMealFilters(null);
      }
      if (parsed.code === "no_match" || parsed.status === 404) {
        errorMsg = "no_match";
        setRecipe(null);
        markShownMealFilters(null);
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
      // When the current meal stays on screen, its inline note already explains the failure.
      if (shownMealFiltersRef.current === null) {
        toast({
          title: parsed.code === "rate_limited" ? "Give the line a breath" : "Generation failed",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } finally {
      clearTimeout(timeout);
      if (seq === latestRequestSeq.current) {
        setLoading(false);
        isGenerating.current = false;
        abortControllerRef.current = null;
      }
    }
  }, [applyRecipe, toast, markShownMealFilters]);

  // ── Button handlers ───────────────────────────────────────────────────────
  const handleGenerateClick = useCallback(() => {
    if (showFirstShiftTip) setShowFirstShiftTip(false);
    handleGenerate(filters);
  }, [filters, handleGenerate, showFirstShiftTip]);

  const handleGenerateAnother = useCallback(() => {
    handleGenerate(filters, lastTemplateId, true);
  }, [filters, lastTemplateId, handleGenerate]);

  const [adjustingSummary, setAdjustingSummary] = useState(() => describeSessionFeedback(loadSessionFeedback()));

  const handleNotFeelingIt = useCallback(
    (reason: NotFeelingItReason, proteinLabel: string | null) => {
      const slug = (recipe as (ClientRecipeResponse & { _slug?: string }) | null)?._slug;
      const next = applyNotFeelingIt(loadSessionFeedback(), reason, { slug, proteinLabel });
      saveSessionFeedback(next);
      setAdjustingSummary(describeSessionFeedback(next));
      trackEvent("tonight_not_feeling_it", { reason });
      // Rejecting the protein the crew explicitly chose means "anything else" — open the filter up.
      let nextFilters = filters;
      if (reason === "protein" && filters.protein !== "surprise") {
        nextFilters = { ...filters, protein: "surprise" };
        setFilters(nextFilters);
      }
      handleGenerate(nextFilters, lastTemplateId, true);
    },
    [recipe, filters, lastTemplateId, handleGenerate],
  );

  const handleNotForUs = useCallback(async () => {
    const slug = (recipe as (ClientRecipeResponse & { _slug?: string }) | null)?._slug;
    if (!slug) return;
    try {
      await hideRecipeFromPicks(slug);
    } catch {
      toast({ title: "Couldn't hide that meal", description: "Try again in a moment.", variant: "destructive" });
      return;
    }
    trackEvent("meal_not_for_us", { slug });
    toast({
      title: "We won't suggest that one again",
      description: "Still in Explore. Undo any time in Profile → Hidden meals.",
      action: (
        <ToastAction
          altText="Undo"
          onClick={() => {
            void unhideRecipe(slug).catch(() => undefined);
          }}
        >
          Undo
        </ToastAction>
      ),
    });
    handleGenerate(filters, lastTemplateId, true);
  }, [recipe, filters, lastTemplateId, handleGenerate, toast]);

  const handleResetAdjustments = useCallback(() => {
    clearSessionFeedback();
    setAdjustingSummary("");
  }, []);

  // ── History navigation — NO API calls, instant ────────────────────────────
  const handleBack = useCallback(() => {
    const newIdx = historyIndexRef.current - 1;
    if (newIdx < 0) return;
    historyIndexRef.current = newIdx;
    setHistoryNav(prev => ({ ...prev, index: newIdx }));
    setRecipe(mealHistoryRef.current[newIdx]);
    markShownMealFilters(pickFiltersRef.current.get(mealHistoryRef.current[newIdx]) ?? null);
    setError(null);
    setErrorSmoked(false);
    setMealHistoryVersion((v) => v + 1);
    requestAnimationFrame(() => {
      recipeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [markShownMealFilters]);

  const handleForward = useCallback(() => {
    const newIdx = historyIndexRef.current + 1;
    if (newIdx >= mealHistoryRef.current.length) return;
    historyIndexRef.current = newIdx;
    setHistoryNav(prev => ({ ...prev, index: newIdx }));
    setRecipe(mealHistoryRef.current[newIdx]);
    markShownMealFilters(pickFiltersRef.current.get(mealHistoryRef.current[newIdx]) ?? null);
    setError(null);
    setErrorSmoked(false);
    setMealHistoryVersion((v) => v + 1);
    requestAnimationFrame(() => {
      recipeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [markShownMealFilters]);

  const onFiltersChange = useCallback(
    (newFilters: SimplifiedGeneratorFilters) => {
      // A restored or history meal has no recorded filters; treat the settings in place
      // before this first edit as the ones it was picked with.
      if (recipe && !mealFilters) markShownMealFilters(filters);
      if (hallLinked && detail?.hall) {
        setFilters(
          mergeAuthAndHallIntoFilters(newFilters, {
            preferences,
            hall: detail.hall,
            hallLinked: true,
            profile,
          }),
        );
        return;
      }
      setFilters(newFilters);
    },
    [hallLinked, detail?.hall, preferences, profile, recipe, mealFilters, filters, markShownMealFilters],
  );

  const filterChange = useMemo(
    () => (recipe ? compareFiltersToMeal(mealFilters, filters) : null),
    [recipe, mealFilters, filters],
  );

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

  const generateDisabled = loading;

  const voteRecipes = useMemo(() => {
    const hist = mealHistoryRef.current;
    if (hist.length >= 2) return hist.slice(-5);
    if (recipe) return [recipe];
    return recentRecipes;
  }, [recentRecipes, mealHistoryVersion, recipe]);

  // Demote crew vote until dinner is decided at least once — don't hijack first pick
  const showHallVotePrompt = !!recipe && !loading && userGenCount >= 2;
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background">
      <SiteHeader activePage="generator" favCount={favCount} />

      <main
        className={cn(
          app.main,
          "max-w-5xl pb-safe-tabs-cta lg:pb-12 transition-[padding] duration-500 ease-out scroll-momentum",
          mealFocusMode ? "py-4 lg:py-6" : "py-6 sm:py-8",
        )}
      >
        {onboardingMode && <OnboardingBanner className="mb-6 max-w-2xl" />}

        {showFirstShiftTip && !mealFocusMode && !onboardingMode && (
          <FirstShiftTip onDismiss={() => setShowFirstShiftTip(false)} />
        )}

        {!mealFocusMode && (
          <header className="mb-6 lg:mb-8 max-w-2xl">
            <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl tracking-tight">
              {GENERATOR.headline}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-prose">
              {GENERATOR.subline}
            </p>
            <a
              href="/shift"
              className="mt-2 inline-block text-sm text-primary hover:underline"
              data-testid="link-shift-planner"
            >
              Planning more than one meal? Plan your whole shift →
            </a>
          </header>
        )}

        {mealFocusMode && (
          <header className="mb-4 lg:mb-6">
            <h1 className="font-heading text-2xl sm:text-3xl tracking-tight">{GENERATOR.headlineWithMeal}</h1>
            {relaxationNote ? (
              <p className="mt-1 text-sm text-foreground/85" data-testid="relaxation-note">
                {relaxationNote}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{GENERATOR.sublineFocus}</p>
            )}
          </header>
        )}

        <div className={cn("flex flex-col", mealFocusMode ? "gap-3" : "gap-5")}>
          <GeneratorFiltersPanel
            filters={filters}
            onChange={onFiltersChange}
            expanded={filtersExpanded}
            onExpandedChange={setFiltersExpanded}
            hallName={hallLinked ? activeHall?.hall_name ?? detail?.hall.hall_name : null}
            hallLinked={hallLinked}
            hasRecipe={!!recipe}
            isLoading={loading}
            pendingChange={filterChange}
            onApply={handleGenerateClick}
          />

          <div ref={recipeRef} className="scroll-section scroll-mt-20 min-w-0 w-full">
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
              onPickAgain={handleGenerateAnother}
              onNotFeelingIt={handleNotFeelingIt}
              onNotForUs={user ? handleNotForUs : undefined}
              adjustingSummary={adjustingSummary || undefined}
              onResetAdjustments={handleResetAdjustments}
              generateDisabled={generateDisabled}
              showHallVotePrompt={showHallVotePrompt}
              hallVoteBannerRef={hallVoteBannerRef}
              voteOptionCount={voteRecipes.length}
              hideInitialEmpty={false}
              relaxationNoteInHeader={mealFocusMode}
              onBack={handleBack}
              onForward={handleForward}
              filterChange={filterChange}
              onApplyFilters={handleGenerateClick}
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
            crewSize={recipe.servings > 0 ? recipe.servings : crewSizeFromFilters(filters)}
            healthinessLevel={filters.healthiness}
          />
          <ShoppingListModal
            open={shoppingListOpen}
            onOpenChange={setShoppingListOpen}
            shoppingList={buildShoppingListFromClientMeal(recipe, {
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

      <div className={app.stickyBarAboveTabs}>
        <SimplifiedStickyGenerate
          hasRecipe={!!recipe}
          isLoading={loading}
          onGenerate={handleGenerateClick}
          onGenerateAnother={handleGenerateAnother}
        />
      </div>

      <SiteFooter variant="compact" className="mt-10" pbSafe />
    </div>
  );
}
