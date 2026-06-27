import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Flame,
  RefreshCw,
  Shuffle,
  Users,
  Clock,
  Dumbbell,
  CircleAlert,
  ChefHat,
  Leaf,
  Package,
  DollarSign,
  Globe,
  UtensilsCrossed,
  Settings2,
  Utensils,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { trackEvent } from "@/lib/analytics";
import {
  type TonightVibe,
  TONIGHT_VIBE_OPTIONS,
  CREW_CHIPS,
  TIME_CHIPS,
  PROTEIN_CHIPS,
  applyTonightVibe,
  applySimplifiedChipSelection,
  isAdvancedCustomized,
} from "@/lib/tonight-vibes";
import { FIREHALL_CATEGORY_IDS, FIREHALL_CATEGORY_LABEL } from "@shared/firehall-categories";
import {
  DIFFERENT_MEAL_LABEL,
  DIFFERENT_MEAL_LOADING,
  INITIAL_MEAL_LABEL,
  INITIAL_MEAL_LOADING,
  ONE_TAP_MEAL_LABEL,
  formatDinnerOutcomeLine,
  formatDifferentMealSubcopy,
  formatTonightAtHallLine,
} from "@/lib/meal-outcome-copy";
import { forwardRef, memo, useState, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { FilterChipScroller } from "@/components/mobile/filter-chips";
import { CTA } from "@/lib/brand-copy";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type { TonightVibe };

export interface FilterState {
  crew_size: number;
  time_available: string;
  appliances: string[];
  protein: string;
  healthiness_preference: string;
  budget_level: string;
  cuisine_style: string;
  meal_format: string;
  /** Practical Firehall category — primary navigation (optional) */
  firehall_category?: (typeof FIREHALL_CATEGORY_IDS)[number];
  /** User explicitly picked a category chip — vibes must not overwrite. */
  category_locked?: boolean;
  allergens_to_avoid: string[];
  vegetarian_swap_needed: boolean;
  use_what_we_have: boolean;
  ingredients_on_hand_text: string;
  tonight_vibe: TonightVibe;
}

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onGenerate: () => void;
  onGenerateAnother: () => void;
  isLoading: boolean;
  hasRecipe: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  onScrollToFilters?: () => void;
  minimalSurface?: boolean;
  hideGenerateButtons?: boolean;
}

const APPLIANCE_OPTIONS = [
  "stove", "oven", "grill", "slow cooker", "rice cooker", "air fryer", "microwave", "instant pot",
];

const PROTEIN_OPTIONS_ADVANCED: { value: string; label: string }[] = [
  { value: "chicken", label: "Chicken" },
  { value: "beef", label: "Beef" },
  { value: "pork", label: "Pork" },
  { value: "turkey", label: "Turkey" },
  { value: "seafood", label: "Seafood" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "any", label: "Surprise me" },
];

const ALLERGEN_OPTIONS = [
  "dairy", "gluten", "soy", "eggs", "nuts", "shellfish",
];

function ChipRow<T extends string | number>({
  options,
  value,
  onChange,
  testIdPrefix,
  layout = "wrap",
  scrollHorizontal = false,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (val: T) => void;
  testIdPrefix: string;
  layout?: "wrap" | "grid";
  scrollHorizontal?: boolean;
}) {
  const chips = options.map((opt) => {
    const isActive = value === opt.value;
    return (
      <Badge
        key={String(opt.value)}
        variant={isActive ? "default" : "outline"}
        className={cn(
          "cursor-pointer select-none text-sm font-medium px-3.5 py-2.5 min-h-11 toggle-elevate transition-colors touch-manipulation snap-start shrink-0",
          layout === "grid" && !scrollHorizontal ? "w-full justify-center" : "",
          scrollHorizontal && "rounded-full",
          isActive ? "toggle-elevated bg-primary text-primary-foreground ring-2 ring-primary/30" : "",
        )}
        onClick={() => onChange(opt.value)}
        data-testid={`${testIdPrefix}-${opt.value}`}
      >
        {opt.label}
      </Badge>
    );
  });

  if (scrollHorizontal) {
    return <FilterChipScroller>{chips}</FilterChipScroller>;
  }

  return (
    <div className={layout === "grid" ? "grid grid-cols-4 gap-2" : "flex flex-wrap gap-2"}>
      {chips}
    </div>
  );
}

function MultiToggle({
  options,
  selected,
  onChange,
  testIdPrefix,
}: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  testIdPrefix: string;
}) {
  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = selected.includes(option);
        return (
          <Badge
            key={option}
            variant={isActive ? "default" : "outline"}
            className={`cursor-pointer select-none capitalize text-xs px-3 py-1.5 toggle-elevate ${
              isActive ? "toggle-elevated bg-primary text-primary-foreground" : ""
            }`}
            onClick={() => toggle(option)}
            data-testid={`${testIdPrefix}-${option}`}
          >
            {option}
          </Badge>
        );
      })}
    </div>
  );
}

function FieldLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <Icon className="w-3.5 h-3.5 text-primary/80" />
      {children}
    </Label>
  );
}

function AdvancedFilterSections({
  filters,
  update,
  onVibeChange,
}: {
  filters: FilterState;
  update: (key: keyof FilterState, value: unknown) => void;
  onVibeChange: (vibe: TonightVibe) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <FieldLabel icon={Utensils}>Tonight&apos;s vibe</FieldLabel>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Optional — usually inferred from your picks above.
        </p>
        <div className="flex flex-wrap gap-2">
          {TONIGHT_VIBE_OPTIONS.map((v) => {
            const active = filters.tonight_vibe === v.value;
            return (
              <Badge
                key={v.value}
                variant={active ? "default" : "outline"}
                className={`cursor-pointer select-none text-xs px-3 py-2 min-h-9 ${
                  active ? "bg-primary text-primary-foreground" : ""
                }`}
                onClick={() => onVibeChange(v.value)}
                data-testid={`chip-vibe-${v.value}`}
                title={v.hint}
              >
                {v.label}
              </Badge>
            );
          })}
        </div>
      </div>

      <div className="section-divider" />

      {/* Curated-only platform: pantry/AI generation disabled */}

      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diet & allergies</p>

        <div className="space-y-2">
          <FieldLabel icon={Dumbbell}>More proteins</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {PROTEIN_OPTIONS_ADVANCED.map(({ value: optValue, label }) => {
              const isActive = filters.protein === optValue;
              return (
                <Badge
                  key={optValue}
                  variant={isActive ? "default" : "outline"}
                  className={`cursor-pointer select-none text-xs px-3 py-1.5 ${
                    isActive ? "bg-primary text-primary-foreground" : ""
                  }`}
                  onClick={() => update("protein", optValue)}
                  data-testid={`toggle-protein-adv-${optValue}`}
                >
                  {label}
                </Badge>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="veg-swap"
              checked={filters.vegetarian_swap_needed}
              onCheckedChange={(checked) => update("vegetarian_swap_needed", !!checked)}
              data-testid="checkbox-veg-swap"
            />
            <Label htmlFor="veg-swap" className="text-xs text-muted-foreground cursor-pointer">
              One vegetarian on the crew (add veg option)
            </Label>
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel icon={CircleAlert}>Avoid allergies</FieldLabel>
          <MultiToggle
            options={ALLERGEN_OPTIONS}
            selected={filters.allergens_to_avoid}
            onChange={(val) => update("allergens_to_avoid", val)}
            testIdPrefix="toggle-allergen"
          />
        </div>
      </div>

      <div className="section-divider" />

      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kitchen & budget</p>
        <div className="space-y-2">
          <FieldLabel icon={ChefHat}>Appliances</FieldLabel>
          <MultiToggle
            options={APPLIANCE_OPTIONS}
            selected={filters.appliances}
            onChange={(val) => update("appliances", val)}
            testIdPrefix="toggle-appliance"
          />
        </div>
        <div className="space-y-2">
          <FieldLabel icon={DollarSign}>Budget</FieldLabel>
          <Select value={filters.budget_level} onValueChange={(val) => update("budget_level", val)}>
            <SelectTrigger data-testid="select-budget-level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[120]">
              <SelectItem value="low">Low ($)</SelectItem>
              <SelectItem value="standard">Standard ($$)</SelectItem>
              <SelectItem value="splurge">Splurge ($$$)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="section-divider" />

      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fine-tune</p>
        <div className="space-y-2">
          <FieldLabel icon={Dumbbell}>Healthiness</FieldLabel>
          <Select
            value={filters.healthiness_preference}
            onValueChange={(val) => update("healthiness_preference", val)}
          >
            <SelectTrigger data-testid="select-healthiness">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[120]">
              <SelectItem value="lean">Lighter / healthy</SelectItem>
              <SelectItem value="balanced">Hall standard</SelectItem>
              <SelectItem value="comfort">Full comfort</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}

const MoreOptionsTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof Button> & {
    customized: boolean;
    open?: boolean;
  }
>(({ customized, open, className, ...props }, ref) => (
  <Button
    ref={ref}
    type="button"
    variant="outline"
    className={cn("w-full justify-between font-medium text-sm min-h-11", className)}
    data-testid="button-toggle-advanced-filters"
    {...props}
  >
    <span className="flex items-center gap-2">
      <Settings2 className="w-4 h-4 text-primary" />
      More options
      {customized && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          edited
        </Badge>
      )}
    </span>
    <ChevronDown
      className={cn("w-4 h-4 shrink-0 transition-transform duration-200", open && "rotate-180")}
    />
  </Button>
));
MoreOptionsTrigger.displayName = "MoreOptionsTrigger";

function getGenerateDisabledReason(filters: FilterState, isLoading: boolean): string | null {
  if (isLoading) return null;
  if (filters.appliances.length === 0) {
    return "Select at least one cooking appliance to pick a meal.";
  }
  if (filters.use_what_we_have && filters.ingredients_on_hand_text.trim().length === 0) {
    return "List what's in the fridge or turn off “Use what we have”.";
  }
  return null;
}

function GenerateButtons({
  filters,
  hasRecipe,
  isLoading,
  canGoBack,
  canGoForward,
  onGenerate,
  onGenerateAnother,
  onBack,
  onForward,
  onScrollToFilters,
  className,
  compact = false,
}: {
  filters: FilterState;
  hasRecipe: boolean;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onGenerate: () => void;
  onGenerateAnother: () => void;
  onBack?: () => void;
  onForward?: () => void;
  onScrollToFilters?: () => void;
  className?: string;
  compact?: boolean;
}) {
  const disabled =
    isLoading ||
    filters.appliances.length === 0 ||
    (filters.use_what_we_have && filters.ingredients_on_hand_text.trim().length === 0);
  const disabledReason = getGenerateDisabledReason(filters, isLoading);
  const outcomeLine = formatDinnerOutcomeLine(filters, true);

  const generateButton = (
    <Button
      size="lg"
      className="btn-tonight btn-generate w-full active:scale-[0.98] transition-transform touch-manipulation"
      onClick={onGenerate}
      disabled={disabled}
      data-testid="button-generate"
    >
      {isLoading ? (
        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
      ) : (
        <Flame className="w-5 h-5 mr-2" />
      )}
      {isLoading ? INITIAL_MEAL_LOADING : ONE_TAP_MEAL_LABEL}
    </Button>
  );

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {!hasRecipe ? (
        <>
          {disabled && disabledReason ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex w-full cursor-not-allowed">{generateButton}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-center">
                {disabledReason}
              </TooltipContent>
            </Tooltip>
          ) : (
            generateButton
          )}
          {!compact && (
            <p className="text-center text-xs text-muted-foreground leading-snug">{outcomeLine}</p>
          )}
        </>
      ) : (
        <>
          {!compact && (
            <p className="text-center text-xs font-medium text-primary/80">
              {formatTonightAtHallLine()}
            </p>
          )}
          <Button
            size="lg"
            className="btn-tonight btn-generate w-full active:scale-[0.98] transition-transform touch-manipulation"
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
          {!compact && (
            <p className="text-center text-xs text-muted-foreground leading-snug px-1">
              {formatDifferentMealSubcopy(filters)}
            </p>
          )}
          {(canGoBack || canGoForward) && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 font-heading tracking-wider min-h-11"
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
                className="flex-1 font-heading tracking-wider min-h-11"
                onClick={onForward}
                disabled={!canGoForward || isLoading}
                data-testid="button-forward"
              >
                Forward
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          )}
          <Button
            variant="outline"
            size="lg"
            className="w-full font-heading tracking-wider min-h-11"
            onClick={onScrollToFilters ?? onGenerate}
            disabled={isLoading}
            data-testid="button-new-generate"
          >
            <Settings2 className="w-4 h-4 mr-2" />
            {CTA.changePicks}
          </Button>
        </>
      )}
    </div>
  );
}

export const FilterPanel = memo(function FilterPanel({
  filters,
  onFiltersChange,
  onGenerate,
  onGenerateAnother,
  isLoading,
  hasRecipe,
  canGoBack = false,
  canGoForward = false,
  onBack,
  onForward,
  onScrollToFilters,
  minimalSurface = false,
  hideGenerateButtons = false,
}: FilterPanelProps) {
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const isMobile = useIsMobile();

  const update = (key: keyof FilterState, value: unknown) => {
    if (key === "allergens_to_avoid") trackEvent("allergy_filter_used");
    onFiltersChange({ ...filters, [key]: value } as FilterState);
  };

  const setVibe = (vibe: TonightVibe) => {
    onFiltersChange(applyTonightVibe(filters, vibe));
  };

  const applyChip = (change: Parameters<typeof applySimplifiedChipSelection>[1]) => {
    onFiltersChange(applySimplifiedChipSelection(filters, change));
  };

  const customized = isAdvancedCustomized(filters);
  const advancedSections = (
    <AdvancedFilterSections filters={filters} update={update} onVibeChange={setVibe} />
  );

  return (
    <div className="space-y-3 lg:space-y-4" id="filters-panel">
      <div className="lg:premium-card lg:rounded-xl lg:border lg:border-border/30 lg:bg-card/40 lg:backdrop-blur-sm">
        <div className="p-0 sm:p-0 lg:p-5 space-y-3.5 lg:space-y-4">
          {!minimalSurface && (
            <>
              <div className="hidden lg:block">
                <h2 className="font-heading text-xl tracking-wide text-foreground">Picks</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasRecipe ? "Adjust and spin again." : "Defaults are set."}
                </p>
              </div>
              <p className="lg:hidden text-[11px] font-medium text-muted-foreground">Picks</p>

              <div className="space-y-1.5 lg:space-y-2">
                <FieldLabel icon={Users}>Crew size</FieldLabel>
                <ChipRow
                  layout={isMobile ? "wrap" : "grid"}
                  scrollHorizontal={isMobile}
                  options={CREW_CHIPS}
                  value={
                    CREW_CHIPS.some((c) => c.value === filters.crew_size)
                      ? filters.crew_size
                      : 6
                  }
                  onChange={(val) => applyChip({ crew_size: val })}
                  testIdPrefix="chip-crew"
                />
              </div>

              <div className="space-y-1.5 lg:space-y-2">
                <FieldLabel icon={Clock}>Time</FieldLabel>
                <ChipRow
                  scrollHorizontal={isMobile}
                  options={TIME_CHIPS}
                  value={
                    TIME_CHIPS.some((t) => t.value === filters.time_available)
                      ? (filters.time_available as (typeof TIME_CHIPS)[number]["value"])
                      : "25-40"
                  }
                  onChange={(val) => applyChip({ time_available: val })}
                  testIdPrefix="chip-time"
                />
              </div>

              {!filters.use_what_we_have && (
                <div className="space-y-1.5 lg:space-y-2">
                  <FieldLabel icon={Dumbbell}>Protein</FieldLabel>
                  <ChipRow
                    scrollHorizontal={isMobile}
                    options={PROTEIN_CHIPS}
                    value={
                      PROTEIN_CHIPS.some((p) => p.value === filters.protein)
                        ? (filters.protein as (typeof PROTEIN_CHIPS)[number]["value"])
                        : "chicken"
                    }
                    onChange={(val) => applyChip({ protein: val })}
                    testIdPrefix="chip-protein"
                  />
                </div>
              )}

              <div className="space-y-1.5 lg:space-y-2">
                <FieldLabel icon={Utensils}>Category</FieldLabel>
                <ChipRow
                  scrollHorizontal={isMobile}
                  options={[
                    { value: "all" as const, label: "All" },
                    ...FIREHALL_CATEGORY_IDS.map((id) => ({
                      value: id,
                      label: FIREHALL_CATEGORY_LABEL[id],
                    })),
                  ]}
                  value={(filters.firehall_category ?? "all") as any}
                  onChange={(val) => {
                    if (val === "all") {
                      onFiltersChange({
                        ...filters,
                        firehall_category: undefined,
                        category_locked: false,
                      });
                    } else {
                      onFiltersChange({
                        ...filters,
                        firehall_category: val as (typeof FIREHALL_CATEGORY_IDS)[number],
                        category_locked: true,
                      });
                    }
                  }}
                  testIdPrefix="chip-firehall-category"
                />
              </div>
            </>
          )}

          {minimalSurface && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Time, protein, allergies, and gear — open More options.
            </p>
          )}

          {isMobile ? (
            <Sheet open={moreOptionsOpen} onOpenChange={setMoreOptionsOpen}>
              <SheetTrigger asChild>
                <MoreOptionsTrigger customized={customized} open={moreOptionsOpen} />
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="max-h-[90dvh] overflow-y-auto rounded-t-[1.25rem] pb-safe border-t border-border/50 bg-background/98 backdrop-blur-xl scroll-momentum"
              >
                <SheetHeader className="text-left pb-2">
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30 lg:hidden" aria-hidden />
                  <SheetTitle className="font-heading text-lg tracking-tight">More options</SheetTitle>
                </SheetHeader>
                {advancedSections}
              </SheetContent>
            </Sheet>
          ) : (
            <Collapsible open={moreOptionsOpen} onOpenChange={setMoreOptionsOpen}>
              <CollapsibleTrigger asChild>
                <MoreOptionsTrigger customized={customized} open={moreOptionsOpen} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">{advancedSections}</CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      {!hideGenerateButtons && (
        <GenerateButtons
          className="hidden lg:flex"
          filters={filters}
          hasRecipe={hasRecipe}
          isLoading={isLoading}
          canGoBack={canGoBack ?? false}
          canGoForward={canGoForward ?? false}
          onGenerate={onGenerate}
          onGenerateAnother={onGenerateAnother}
          onBack={onBack}
          onForward={onForward}
          onScrollToFilters={onScrollToFilters}
        />
      )}
    </div>
  );
});

export { formatDinnerOutcomeLine as formatGenerateSummary, GenerateButtons };
