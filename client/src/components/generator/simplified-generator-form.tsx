import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  CREW_BUCKET_LABELS,
  CREW_SIZE_BUCKETS,
  HEALTHINESS_OPTIONS,
  SIMPLIFIED_ALLERGEN_LABELS,
  SIMPLIFIED_ALLERGENS,
  SIMPLIFIED_APPLIANCE_IDS,
  SIMPLIFIED_APPLIANCE_LABELS,
  SIMPLIFIED_PROTEIN_LABELS,
  SIMPLIFIED_PROTEINS,
  formatGeneratorSummary,
  formatApplianceSummary,
  type CrewSizeBucketUi,
  type SimplifiedAllergen,
  type SimplifiedApplianceId,
  type SimplifiedGeneratorFilters,
  type SimplifiedProtein,
} from "@shared/generator-simplified";
import type { HealthinessPreference } from "@shared/generator-simplified";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  RefreshCw,
  Shuffle,
} from "lucide-react";
import { CTA, GENERATOR } from "@/lib/brand-copy";
import {
  DIFFERENT_MEAL_LABEL,
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
            Adjust crew, appliances &amp; more
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
          <div className="grid grid-cols-4 gap-1.5">
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
          <Label className="text-xs text-muted-foreground">Healthiness</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {HEALTHINESS_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                active={filters.healthiness === opt.value}
                onClick={() => patch({ healthiness: opt.value as HealthinessPreference })}
                testId={`health-${opt.value}`}
                className="w-full justify-center flex-col gap-0.5 py-2.5"
              >
                <span>{opt.emoji}</span>
                <span className="text-[10px] sm:text-xs leading-tight text-center">{opt.label}</span>
              </Chip>
            ))}
          </div>
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
      </div>

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
              {isLoading ? DIFFERENT_MEAL_LOADING : DIFFERENT_MEAL_LABEL}
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

/** Mobile sticky bar — primary CTA only */
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
          className="btn-tonight btn-generate w-full min-h-12 touch-manipulation"
          onClick={onGenerateAnother}
          disabled={isLoading}
        >
          {isLoading ? DIFFERENT_MEAL_LOADING : DIFFERENT_MEAL_LABEL}
        </Button>
      )}
    </div>
  );
}
