import { useCallback, useMemo, useState } from "react";
import { Check, ChevronDown, Clock, RotateCcw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/loading-state";
import { RecipeCard } from "@/components/recipe-card";
import { apiRequest } from "@/lib/queryClient";
import { parseApiError } from "@/lib/parse-api-error";
import {
  simplifiedFiltersToGenerateRequest,
  CREW_BUCKET_TO_SIZE,
  CREW_BUCKET_LABELS,
  formatGeneratorSummary,
  type SimplifiedGeneratorFilters,
} from "@shared/generator-simplified";
import { buildGenerateRequestInput } from "@shared/generate-request-defaults";
import {
  MEAL_OCCASIONS,
  MEAL_OCCASION_LABELS,
  MEAL_OCCASION_REQUEST_OVERRIDES,
  type MealOccasion,
} from "@shared/shift-planner/occasions";
import { useMealHeroPoll } from "@/lib/recipe-hero";
import type { ClientRecipeResponse } from "@shared/schema";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { ShiftGroceryList } from "@/components/shift-planner/shift-grocery-list";
import type { LocationQuery } from "@shared/pricing";

type SlotStatus = "loading" | "ready" | "error";

interface MealSlot {
  occasion: MealOccasion;
  status: SlotStatus;
  recipe: ClientRecipeResponse | null;
  error?: string;
  templateId?: number;
  seq: number;
}

function makeRequestId(): string {
  return `shift-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function crewSizeFromFilters(filters: SimplifiedGeneratorFilters): number {
  return CREW_BUCKET_TO_SIZE[filters.crew_bucket];
}

/** Builds one occasion's GenerateRequest — same schema/defaults the main generator uses. */
function buildOccasionPayload(
  filters: SimplifiedGeneratorFilters,
  occasion: MealOccasion,
  requestId: string,
  templateId?: number,
  preferDifferentStyle = false,
) {
  const overrides = MEAL_OCCASION_REQUEST_OVERRIDES[occasion];
  return buildGenerateRequestInput(
    simplifiedFiltersToGenerateRequest(filters, {
      ...overrides,
      request_id: requestId,
      last_template_id: templateId,
      prefer_different_style: preferDifferentStyle,
    }),
  );
}

// ─── One meal occasion card ───────────────────────────────────────────────

function MealOccasionCard({
  slot,
  crewSize,
  nutritionGoal,
  hallId,
  onReplace,
  replacing,
}: {
  slot: MealSlot;
  crewSize: number;
  nutritionGoal: SimplifiedGeneratorFilters["nutrition_goal"];
  hallId?: string;
  onReplace: (occasion: MealOccasion) => void;
  replacing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const recipeWithHero = useMealHeroPoll(slot.recipe);
  const label = MEAL_OCCASION_LABELS[slot.occasion];

  return (
    <section className={cn(app.cardSurface, "p-4 sm:p-5")} data-testid={`meal-slot-${slot.occasion}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className={cn(app.pill)} data-testid={`badge-occasion-${slot.occasion}`}>
          {label}
        </span>
        {slot.status === "ready" && recipeWithHero?.timing?.total_min ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" aria-hidden />
            {recipeWithHero.timing.total_min} min
          </span>
        ) : null}
      </div>

      {slot.status === "loading" && <LoadingState variant="compact" />}

      {slot.status === "error" && (
        <div className="py-6 text-center space-y-3" data-testid={`error-slot-${slot.occasion}`}>
          <p className="text-sm text-muted-foreground">{slot.error || "Couldn't find a meal for this one."}</p>
          <Button size="sm" variant="outline" onClick={() => onReplace(slot.occasion)} disabled={replacing}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Try again
          </Button>
        </div>
      )}

      {slot.status === "ready" && recipeWithHero && !expanded && (
        <div className="space-y-3">
          <h3 className="font-heading text-lg tracking-tight" data-testid={`title-slot-${slot.occasion}`}>
            {recipeWithHero.title}
          </h3>
          {recipeWithHero.why_it_fits_tonight && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {recipeWithHero.why_it_fits_tonight}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => setExpanded(true)}
              className="min-h-10 touch-manipulation"
              data-testid={`button-view-recipe-${slot.occasion}`}
            >
              View recipe
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReplace(slot.occasion)}
              disabled={replacing}
              className="min-h-10 touch-manipulation"
              data-testid={`button-replace-meal-${slot.occasion}`}
            >
              <RotateCcw className={cn("w-3.5 h-3.5 mr-1.5", replacing && "animate-spin")} aria-hidden />
              Replace this meal
            </Button>
          </div>
        </div>
      )}

      {slot.status === "ready" && recipeWithHero && expanded && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid={`button-collapse-recipe-${slot.occasion}`}
          >
            <ChevronDown className="w-3.5 h-3.5 rotate-180" aria-hidden />
            Hide recipe
          </button>
          <RecipeCard
            recipe={recipeWithHero}
            crewSize={crewSize}
            hideSave={false}
            nutritionGoal={nutritionGoal}
            mealOccasion={slot.occasion}
            hallId={hallId}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReplace(slot.occasion)}
            disabled={replacing}
            className="min-h-10 touch-manipulation w-full"
            data-testid={`button-replace-meal-expanded-${slot.occasion}`}
          >
            <RotateCcw className={cn("w-3.5 h-3.5 mr-1.5", replacing && "animate-spin")} aria-hidden />
            Replace this meal
          </Button>
        </div>
      )}
    </section>
  );
}

/**
 * Ad-hoc occasion planner (Shift Planner v1) — pick occasions, get one meal
 * each, nothing saved. Still offered when the user has no schedule.
 */
export function QuickOccasionPlanner({
  filters,
  hallId,
  costLocation,
}: {
  filters: SimplifiedGeneratorFilters;
  hallId?: string;
  costLocation: LocationQuery;
}) {
  const crewSize = crewSizeFromFilters(filters);
  const [selected, setSelected] = useState<MealOccasion[]>([]);
  const [slots, setSlots] = useState<Record<MealOccasion, MealSlot> | null>(null);
  const [planning, setPlanning] = useState(false);
  const [replacingOccasion, setReplacingOccasion] = useState<MealOccasion | null>(null);

  const toggleOccasion = useCallback((occasion: MealOccasion) => {
    hapticLight();
    setSelected((prev) =>
      prev.includes(occasion) ? prev.filter((o) => o !== occasion) : [...prev, occasion],
    );
  }, []);

  const fetchOneMeal = useCallback(
    async (
      occasion: MealOccasion,
      opts: { templateId?: number; preferDifferentStyle?: boolean } = {},
    ): Promise<MealSlot> => {
      const requestId = makeRequestId();
      const payload = buildOccasionPayload(
        filters,
        occasion,
        requestId,
        opts.templateId,
        opts.preferDifferentStyle,
      );
      try {
        const res = await apiRequest("POST", "/api/generate", payload, 50_000);
        const data: ClientRecipeResponse = await res.json();
        if (!data?.title || !Array.isArray(data.steps) || data.steps.length === 0) {
          throw new Error("Server returned an incomplete recipe.");
        }
        return {
          occasion,
          status: "ready",
          recipe: data,
          templateId: data.template_id,
          seq: 0,
        };
      } catch (err) {
        const parsed = parseApiError(err);
        return {
          occasion,
          status: "error",
          recipe: null,
          error: parsed.message || "Couldn't plan this meal — try again.",
          seq: 0,
        };
      }
    },
    [filters],
  );

  const handlePlanShift = useCallback(async () => {
    if (selected.length === 0 || planning) return;
    hapticLight();
    setPlanning(true);

    const loadingSlots = Object.fromEntries(
      selected.map((occasion) => [occasion, { occasion, status: "loading", recipe: null, seq: 0 }]),
    ) as Record<MealOccasion, MealSlot>;
    setSlots(loadingSlots);

    const results = await Promise.all(selected.map((occasion) => fetchOneMeal(occasion)));
    setSlots((prev) => {
      const next = { ...(prev ?? {}) } as Record<MealOccasion, MealSlot>;
      for (const result of results) next[result.occasion] = result;
      return next;
    });
    setPlanning(false);
    hapticSuccess();
  }, [selected, planning, fetchOneMeal]);

  const handleReplace = useCallback(
    async (occasion: MealOccasion) => {
      if (replacingOccasion) return;
      setReplacingOccasion(occasion);
      const current = slots?.[occasion];
      setSlots((prev) =>
        prev ? { ...prev, [occasion]: { ...prev[occasion], status: "loading" } } : prev,
      );
      const result = await fetchOneMeal(occasion, {
        templateId: current?.templateId,
        preferDifferentStyle: true,
      });
      // Replacing ONE meal only ever writes that meal's slot — every other
      // occasion's slot object is untouched, so it never re-renders/refetches.
      setSlots((prev) => (prev ? { ...prev, [occasion]: result } : prev));
      setReplacingOccasion(null);
      hapticSuccess();
    },
    [slots, replacingOccasion, fetchOneMeal],
  );

  const summaryLine = formatGeneratorSummary(filters).replace(/\n/g, " · ");
  const plannedOccasions = slots ? (Object.keys(slots) as MealOccasion[]) : [];
  const readyRecipes = useMemo(
    () =>
      plannedOccasions
        .map((occasion) => ({ occasion, slot: slots![occasion] }))
        .filter((s): s is { occasion: MealOccasion; slot: MealSlot & { recipe: ClientRecipeResponse } } =>
          Boolean(s.slot.status === "ready" && s.slot.recipe),
        )
        .map(({ occasion, slot }) => ({ occasion, recipe: slot.recipe })),
    [plannedOccasions, slots],
  );

  return (
    <>
      <div
        className="flex flex-wrap gap-2 mb-4"
        role="group"
        aria-label="Meal occasions"
        data-testid="occasion-picker"
      >
        {MEAL_OCCASIONS.map((occasion) => {
          const isSelected = selected.includes(occasion);
          return (
            <button
              key={occasion}
              type="button"
              onClick={() => toggleOccasion(occasion)}
              aria-pressed={isSelected}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors touch-manipulation flex items-center gap-1.5",
                isSelected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/50 text-muted-foreground hover:border-border",
              )}
              data-testid={`occasion-chip-${occasion}`}
            >
              {isSelected && <Check className="w-3.5 h-3.5" aria-hidden />}
              {MEAL_OCCASION_LABELS[occasion]}
            </button>
          );
        })}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6" data-testid="text-planner-summary">
        <Users className="w-3.5 h-3.5" aria-hidden />
        Crew {CREW_BUCKET_LABELS[filters.crew_bucket]} · {summaryLine}
      </p>

      <Button
        size="lg"
        onClick={handlePlanShift}
        disabled={selected.length === 0 || planning}
        className="w-full sm:w-auto min-h-12 touch-manipulation mb-8"
        data-testid="button-plan-shift"
      >
        {planning
          ? "Planning your shift…"
          : `Plan ${selected.length || ""} meal${selected.length === 1 ? "" : "s"}`.trim()}
      </Button>

      {plannedOccasions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2" data-testid="meal-slots">
          {plannedOccasions.map((occasion) => (
            <MealOccasionCard
              key={occasion}
              slot={slots![occasion]}
              crewSize={crewSize}
              nutritionGoal={filters.nutrition_goal}
              hallId={hallId}
              onReplace={handleReplace}
              replacing={replacingOccasion === occasion}
            />
          ))}
        </div>
      )}

      <ShiftGroceryList recipes={readyRecipes} crewSize={crewSize} location={costLocation} />
    </>
  );
}
