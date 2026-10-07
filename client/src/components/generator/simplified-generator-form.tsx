import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CREW_BUCKET_LABELS,
  CREW_SIZE_BUCKETS,
  NUTRITION_GOAL_LABELS,
  NUTRITION_GOAL_MICROCOPY,
  NUTRITION_GOAL_QUICK_PICKS,
  SIMPLIFIED_ALLERGEN_LABELS,
  SIMPLIFIED_ALLERGENS,
  SIMPLIFIED_APPLIANCE_IDS,
  SIMPLIFIED_APPLIANCE_LABELS,
  SIMPLIFIED_DIET_LABELS,
  SIMPLIFIED_DIETS,
  SIMPLIFIED_PROTEIN_LABELS,
  SIMPLIFIED_PROTEINS,
  TONIGHT_MEAL_STYLES,
  TONIGHT_MEAL_STYLE_LABELS,
  TONIGHT_TIME_WINDOWS,
  TONIGHT_TIME_WINDOW_LABELS,
  formatGeneratorSummary,
  formatApplianceSummary,
  nutritionGoalToHealthiness,
  type CrewSizeBucketUi,
  type NutritionGoal,
  type SimplifiedAllergen,
  type SimplifiedApplianceId,
  type SimplifiedDiet,
  type SimplifiedGeneratorFilters,
  type SimplifiedProtein,
} from "@shared/generator-simplified";
import { FOOD_PREFERENCE_DEFINITIONS } from "@shared/ingredient-preferences/definitions";
import { useFeature, useRecordPaywallView } from "@/lib/billing/hooks";
import {
  trackProFeatureClicked,
  trackNutritionGoalSelected,
  trackNutritionGoalOverride,
  trackHistoryPersonalizationDisabled,
} from "@/lib/analytics";
import { useAuth } from "@/lib/auth/context";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  RefreshCw,
  Shuffle,
} from "lucide-react";
import { CTA, GENERATOR } from "@/lib/brand-copy";
import {
  DIFFERENT_MEAL_LOADING,
  INITIAL_MEAL_LOADING,
} from "@/lib/meal-outcome-copy";

interface SimplifiedGeneratorFormProps {
  filters: SimplifiedGeneratorFilters;
  onChange: (filters: SimplifiedGeneratorFilters) => void;
  onGenerate: () => void;
  onGenerateAnother: () => void;
  isLoading: boolean;
  hasRecipe: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  compact?: boolean;
  /** Returning user — protein-first, collapsed secondary filters */
  returningMode?: boolean;
  hallName?: string | null;
  filtersExpanded?: boolean;
  onToggleFiltersExpanded?: () => void;
  /** When true, appliances come from hall settings — not editable */
  hallLinked?: boolean;
}

function Chip({
  active,
  onClick,
  children,
  testId,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <Badge
      variant={active ? "default" : "outline"}
      className={cn(
        "cursor-pointer select-none text-xs sm:text-sm font-medium px-3 py-2 min-h-10 toggle-elevate touch-manipulation",
        active ? "toggle-elevated bg-primary text-primary-foreground ring-2 ring-primary/30" : "",
        className,
      )}
      onClick={onClick}
      data-testid={testId}
    >
      {children}
    </Badge>
  );
}

export function SimplifiedGeneratorForm({
  filters,
  onChange,
  onGenerate,
  onGenerateAnother,
  isLoading,
  hasRecipe,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  compact = false,
  returningMode = false,
  hallName,
  filtersExpanded = false,
  onToggleFiltersExpanded,
  hallLinked = false,
}: SimplifiedGeneratorFormProps) {
  const patch = (partial: Partial<SimplifiedGeneratorFilters>) =>
    onChange({ ...filters, ...partial });

  const toggleAppliance = (id: SimplifiedApplianceId) => {
    const next = filters.appliances.includes(id)
      ? filters.appliances.filter((a) => a !== id)
      : [...filters.appliances, id];
    patch({ appliances: next });
  };

  const toggleAllergen = (id: SimplifiedAllergen) => {
    const next = filters.allergens.includes(id)
      ? filters.allergens.filter((a) => a !== id)
      : [...filters.allergens, id];
    patch({ allergens: next });
  };

  const toggleDiet = (id: SimplifiedDiet) => {
    const next = filters.diets.includes(id)
      ? filters.diets.filter((d) => d !== id)
      : [...filters.diets, id];
    patch({ diets: next });
  };

  const hasFoodPreferences = useFeature("ingredient_preferences");
  const hasMealMemory = useFeature("meal_memory");
  const { authenticated, preferences } = useAuth();
  const recordPaywall = useRecordPaywallView();
  const [, setLocation] = useLocation();

  const savedNutritionGoal = (preferences?.nutrition_goal as NutritionGoal | null) ?? null;

  const onNutritionGoalChange = (goal: NutritionGoal) => {
    patch({ nutrition_goal: goal, healthiness: nutritionGoalToHealthiness(goal) });
    trackNutritionGoalSelected({ goal, source: "generator" });
    if (authenticated && savedNutritionGoal && goal !== savedNutritionGoal) {
      trackNutritionGoalOverride({ goal, saved_default: savedNutritionGoal });
    }
  };

  const togglePersonalizeWithHistory = () => {
    const next = !filters.personalizeWithHistory;
    patch({ personalizeWithHistory: next });
    if (!next) {
      trackHistoryPersonalizationDisabled({ source: "generator_filter" });
    }
  };

  const toggleFoodToAvoid = (key: string) => {
    const next = filters.foodsToAvoid.includes(key)
      ? filters.foodsToAvoid.filter((k) => k !== key)
      : [...filters.foodsToAvoid, key];
    patch({ foodsToAvoid: next });
  };

  const requestFoodPreferences = () => {
    trackProFeatureClicked({ feature: "foods_to_avoid", page: "/generator", logged_in: authenticated });
    void recordPaywall("ingredient_preferences", "generator_filter");
    setLocation(`/me/subscription?feature=foods_to_avoid`);
  };

  const summaryLines = formatGeneratorSummary(filters).split("\n");
  const showCompactReturning =
    returningMode && !hasRecipe && !filtersExpanded && !compact;

  const generatePrimaryButton = (
    <Button
      size="lg"
      className="btn-tonight btn-generate w-full active:scale-[0.98] transition-transform touch-manipulation min-h-12"
      onClick={onGenerate}
      disabled={isLoading}
      data-testid="button-generate"
    >
      {isLoading ? (
        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
      ) : (
        <Flame className="w-5 h-5 mr-2" />
      )}
      {isLoading ? INITIAL_MEAL_LOADING : CTA.pickDinner}
    </Button>
  );

  if (showCompactReturning) {
    return (
      <div className="space-y-3 lg:premium-card lg:rounded-xl lg:border lg:border-border/30 lg:bg-card/40 lg:backdrop-blur-sm lg:p-5" id="filters-panel">
        {hallName && (
          <p className="text-xs font-medium text-primary/90" data-testid="generator-hall-context">
            {hallName} · tonight&apos;s pick
          </p>
        )}
        <div
          className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-0.5"
          data-testid="generator-summary"
        >
          {summaryLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Protein tonight</Label>
          <div className="flex flex-wrap gap-1.5">
            {SIMPLIFIED_PROTEINS.map((p) => (
              <Chip
                key={p}
                active={filters.protein === p}
                onClick={() => patch({ protein: p as SimplifiedProtein })}
                testId={`protein-${p}`}
              >
                {SIMPLIFIED_PROTEIN_LABELS[p]}
              </Chip>
            ))}
          </div>
        </div>
        {generatePrimaryButton}
        {onToggleFiltersExpanded && (
          <button
            type="button"
            className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline py-1"
            onClick={onToggleFiltersExpanded}
            data-testid="generator-expand-filters"
          >
            Adjust crew, time, style &amp; more
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-3 lg:premium-card lg:rounded-xl lg:border lg:border-border/30 lg:bg-card/40 lg:backdrop-blur-sm lg:p-5",
        compact && "space-y-2",
      )}
      id="filters-panel"
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs text-muted-foreground">Crew size</Label>
          <div className="grid grid-cols-5 gap-1.5">
            {CREW_SIZE_BUCKETS.map((bucket) => (
              <Chip
                key={bucket}
                active={filters.crew_bucket === bucket}
                onClick={() => patch({ crew_bucket: bucket as CrewSizeBucketUi })}
                testId={`crew-${bucket}`}
                className="w-full justify-center"
              >
                {CREW_BUCKET_LABELS[bucket]}
              </Chip>
            ))}
          </div>
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-xs text-muted-foreground">Time</Label>
          <div className="flex flex-wrap gap-1.5">
            {TONIGHT_TIME_WINDOWS.map((t) => (
              <Chip
                key={t}
                active={filters.time_window === t}
                onClick={() => patch({ time_window: t })}
                testId={`time-${t}`}
              >
                {TONIGHT_TIME_WINDOW_LABELS[t]}
              </Chip>
            ))}
          </div>
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-xs text-muted-foreground">Protein</Label>
          <div className="flex flex-wrap gap-1.5">
            {SIMPLIFIED_PROTEINS.map((p) => (
              <Chip
                key={p}
                active={filters.protein === p}
                onClick={() => patch({ protein: p as SimplifiedProtein })}
                testId={`protein-${p}`}
              >
                {SIMPLIFIED_PROTEIN_LABELS[p]}
              </Chip>
            ))}
          </div>
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-xs text-muted-foreground">Style</Label>
          <div className="flex flex-wrap gap-1.5">
            {TONIGHT_MEAL_STYLES.map((s) => (
              <Chip
                key={s}
                active={filters.meal_style === s}
                onClick={() => patch({ meal_style: s })}
                testId={`style-${s}`}
              >
                {TONIGHT_MEAL_STYLE_LABELS[s]}
              </Chip>
            ))}
          </div>
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-xs text-muted-foreground">
            {hallLinked ? "Hall appliances" : "Appliances (optional)"}
          </Label>
          {hallLinked ? (
            <p className="text-xs text-muted-foreground px-1 py-2">
              {formatApplianceSummary(filters.appliances)}
              <span className="block text-[10px] mt-0.5 opacity-80">From hall settings</span>
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {SIMPLIFIED_APPLIANCE_IDS.map((id) => (
                <Chip
                  key={id}
                  active={filters.appliances.includes(id)}
                  onClick={() => toggleAppliance(id)}
                  testId={`appliance-${id}`}
                >
                  {SIMPLIFIED_APPLIANCE_LABELS[id]}
                </Chip>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-xs text-muted-foreground">Nutrition goal</Label>
          <div className="flex flex-wrap gap-1.5" data-testid="nutrition-goal-selector">
            <Chip
              active={filters.nutrition_goal === "no_preference"}
              onClick={() => onNutritionGoalChange("no_preference")}
              testId="nutrition-goal-no_preference"
            >
              {NUTRITION_GOAL_LABELS.no_preference}
            </Chip>
            {NUTRITION_GOAL_QUICK_PICKS.map((goal) => (
              <Chip
                key={goal}
                active={filters.nutrition_goal === goal}
                onClick={() => onNutritionGoalChange(goal)}
                testId={`nutrition-goal-${goal}`}
              >
                {NUTRITION_GOAL_LABELS[goal]}
              </Chip>
            ))}
          </div>
          <p
            className="text-[11px] leading-snug text-muted-foreground/80 px-0.5 pt-0.5"
            data-testid="text-nutrition-goal-microcopy"
          >
            {NUTRITION_GOAL_MICROCOPY[filters.nutrition_goal]}
          </p>
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-xs text-muted-foreground">Avoid allergies</Label>
          <div className="flex flex-wrap gap-1.5">
            {SIMPLIFIED_ALLERGENS.map((a) => (
              <Chip
                key={a}
                active={filters.allergens.includes(a)}
                onClick={() => toggleAllergen(a)}
                testId={`allergen-${a}`}
              >
                {SIMPLIFIED_ALLERGEN_LABELS[a]}
              </Chip>
            ))}
          </div>
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-xs text-muted-foreground">Diet</Label>
          <div className="flex flex-wrap gap-1.5">
            {SIMPLIFIED_DIETS.map((d) => (
              <Chip
                key={d}
                active={filters.diets.includes(d)}
                onClick={() => toggleDiet(d)}
                testId={`diet-${d}`}
              >
                {SIMPLIFIED_DIET_LABELS[d]}
              </Chip>
            ))}
          </div>
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-xs text-muted-foreground">
            Foods to avoid
            {!hasFoodPreferences && (
              <span className="ml-1 inline-flex items-center gap-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-primary">
                <Lock className="h-2.5 w-2.5" aria-hidden />
                Pro
              </span>
            )}
          </Label>
          {hasFoodPreferences ? (
            <div className="flex flex-wrap gap-1.5" data-testid="generator-foods-to-avoid">
              {FOOD_PREFERENCE_DEFINITIONS.map((def) => (
                <Chip
                  key={def.key}
                  active={filters.foodsToAvoid.includes(def.key)}
                  onClick={() => toggleFoodToAvoid(def.key)}
                  testId={`avoid-${def.key}`}
                >
                  {def.label}
                </Chip>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={requestFoodPreferences}
              className="w-full rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-left text-xs text-muted-foreground touch-manipulation"
              data-testid="generator-foods-to-avoid-locked"
            >
              Tell us what you'd rather not see in your meals (Pro)
            </button>
          )}
          {filters.foodsToAvoid.length > 0 && (
            <p className="text-[10px] text-muted-foreground/80">
              Preference only — not for allergies. Use "Avoid allergies" above for food-safety needs.
            </p>
          )}
        </div>
      </div>

      {hasMealMemory && (
        <label
          className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground touch-manipulation cursor-pointer"
          data-testid="generator-personalize-toggle"
        >
          <Checkbox
            checked={filters.personalizeWithHistory}
            onCheckedChange={togglePersonalizeWithHistory}
            data-testid="checkbox-personalize-for-crew"
          />
          Personalize for my crew — uses your hall's meal history to fine-tune tonight's pick
        </label>
      )}

      {!hasRecipe && !compact && (
        <div
          className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-0.5"
          data-testid="generator-summary"
        >
          {summaryLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 pt-1">
        {!hasRecipe ? (
          generatePrimaryButton
        ) : (
          <>
            <Button
              size="lg"
              className="btn-tonight btn-generate w-full active:scale-[0.98] transition-transform touch-manipulation min-h-12"
              onClick={onGenerateAnother}
              disabled={isLoading}
              data-testid="button-generate-another"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Shuffle className="w-5 h-5 mr-2" />
              )}
              {isLoading ? DIFFERENT_MEAL_LOADING : CTA.tryAnother}
            </Button>
            {(canGoBack || canGoForward) && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 min-h-11"
                  onClick={onBack}
                  disabled={!canGoBack || isLoading}
                  data-testid="button-back"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Back
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 min-h-11"
                  onClick={onForward}
                  disabled={!canGoForward || isLoading}
                  data-testid="button-forward"
                >
                  Forward
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Mobile sticky bar — pick first; after a result, shuffle is secondary (cook is on the card). */
export function SimplifiedStickyGenerate({
  hasRecipe,
  isLoading,
  onGenerate,
  onGenerateAnother,
}: Pick<SimplifiedGeneratorFormProps, "hasRecipe" | "isLoading" | "onGenerate" | "onGenerateAnother">) {
  return (
    <div className="px-page pt-2.5 pb-1 lg:hidden" data-testid="mobile-sticky-cta">
      {!hasRecipe ? (
        <Button
          size="lg"
          className="btn-tonight btn-generate w-full min-h-12 touch-manipulation"
          onClick={onGenerate}
          disabled={isLoading}
        >
          {isLoading ? GENERATOR.loading : CTA.pickDinner}
        </Button>
      ) : (
        <Button
          size="lg"
          variant="outline"
          className="w-full min-h-12 touch-manipulation"
          onClick={onGenerateAnother}
          disabled={isLoading}
        >
          {isLoading ? DIFFERENT_MEAL_LOADING : CTA.tryAnother}
        </Button>
      )}
    </div>
  );
}
