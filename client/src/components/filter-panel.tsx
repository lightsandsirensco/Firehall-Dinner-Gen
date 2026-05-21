import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Flame,
  RefreshCw,
  Users,
  Clock,
  Dumbbell,
  ShieldAlert,
  ChefHat,
  Leaf,
  Package,
  DollarSign,
  Globe,
  UtensilsCrossed,
  Settings2,
  Heart,
  Utensils,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { trackEvent } from "@/lib/analytics";
import {
  type TonightVibe,
  TONIGHT_VIBE_OPTIONS,
  CREW_CHIPS,
  TIME_CHIPS,
  PROTEIN_CHIPS,
  applyTonightVibe,
  formatGenerateSummary,
  isAdvancedCustomized,
} from "@/lib/tonight-vibes";
import { memo, useState } from "react";

export type { TonightVibe };

export interface FilterState {
  crew_size: number;
  busy_level: string;
  time_available: string;
  appliances: string[];
  protein: string;
  healthiness_preference: string;
  budget_level: string;
  cuisine_style: string;
  meal_format: string;
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
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (val: T) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <Badge
            key={String(opt.value)}
            variant={isActive ? "default" : "outline"}
            className={`cursor-pointer select-none text-xs px-3 py-2 min-h-9 toggle-elevate ${
              isActive ? "toggle-elevated bg-primary text-primary-foreground" : ""
            }`}
            onClick={() => onChange(opt.value)}
            data-testid={`${testIdPrefix}-${opt.value}`}
          >
            {opt.label}
          </Badge>
        );
      })}
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
}: {
  filters: FilterState;
  update: (key: keyof FilterState, value: unknown) => void;
}) {
  return (
    <>
      <div className="section-divider" />

      <div className="space-y-3">
        <FieldLabel icon={Package}>Cook from the fridge</FieldLabel>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Uses pantry mode — slower, more flexible</p>
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={filters.use_what_we_have}
            onChange={(e) => update("use_what_we_have", e.target.checked)}
            data-testid="switch-use-what-we-have"
          />
        </div>
        {filters.use_what_we_have && (
          <Input
            placeholder="What's on hand? (comma separated)"
            value={filters.ingredients_on_hand_text}
            onChange={(e) => update("ingredients_on_hand_text", e.target.value)}
            data-testid="input-ingredients-on-hand"
          />
        )}
      </div>

      <div className="section-divider" />

      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diet & allergies</p>

        {!filters.use_what_we_have && (
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
        )}

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
          <FieldLabel icon={ShieldAlert}>Avoid allergies</FieldLabel>
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
            <SelectContent>
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
          <FieldLabel icon={Globe}>Cuisine</FieldLabel>
          <Select value={filters.cuisine_style} onValueChange={(val) => update("cuisine_style", val)}>
            <SelectTrigger data-testid="select-cuisine-style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="mediterranean">Mediterranean</SelectItem>
              <SelectItem value="mexican">Mexican</SelectItem>
              <SelectItem value="italian">Italian</SelectItem>
              <SelectItem value="asian">Asian</SelectItem>
              <SelectItem value="korean">Korean</SelectItem>
              <SelectItem value="thai">Thai</SelectItem>
              <SelectItem value="indian">Indian</SelectItem>
              <SelectItem value="middle_eastern">Middle Eastern</SelectItem>
              <SelectItem value="bbq">BBQ</SelectItem>
              <SelectItem value="cajun">Cajun</SelectItem>
              <SelectItem value="canadian">Canadian</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <FieldLabel icon={UtensilsCrossed}>Meal style (advanced)</FieldLabel>
          <Select value={filters.meal_format} onValueChange={(val) => update("meal_format", val)}>
            <SelectTrigger data-testid="select-meal-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="random">Random</SelectItem>
              <SelectItem value="bowl">Bowl</SelectItem>
              <SelectItem value="pasta">Pasta</SelectItem>
              <SelectItem value="skillet">Skillet</SelectItem>
              <SelectItem value="sheet_pan">Sheet pan</SelectItem>
              <SelectItem value="burger">Burger</SelectItem>
              <SelectItem value="tacos">Tacos</SelectItem>
              <SelectItem value="stew">Stew</SelectItem>
              <SelectItem value="soup_chili">Soup / chili</SelectItem>
              <SelectItem value="grill">Grill</SelectItem>
              <SelectItem value="one_pot">One-pot</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <FieldLabel icon={Dumbbell}>Healthiness</FieldLabel>
          <Select
            value={filters.healthiness_preference}
            onValueChange={(val) => update("healthiness_preference", val)}
          >
            <SelectTrigger data-testid="select-healthiness">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lean">Lighter plate</SelectItem>
              <SelectItem value="balanced">Hall standard</SelectItem>
              <SelectItem value="comfort">Full comfort</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
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
}) {
  const disabled =
    isLoading ||
    filters.appliances.length === 0 ||
    (filters.use_what_we_have && filters.ingredients_on_hand_text.trim().length === 0);
  const summary = formatGenerateSummary(filters);

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      {!hasRecipe ? (
        <>
          <Button
            size="lg"
            className="btn-generate w-full font-heading text-lg tracking-wider min-h-12"
            onClick={onGenerate}
            disabled={disabled}
            data-testid="button-generate"
          >
            {isLoading ? (
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Flame className="w-5 h-5 mr-2" />
            )}
            {isLoading ? "Working the line…" : "Put dinner on the board"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{summary}</p>
        </>
      ) : (
        <>
          <Button
            size="lg"
            className="btn-generate w-full font-heading text-lg tracking-wider min-h-12"
            onClick={onGenerateAnother}
            disabled={isLoading}
            data-testid="button-generate-another"
          >
            {isLoading ? (
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5 mr-2" />
            )}
            {isLoading ? "Working another option…" : "Different meal"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Same crew · new plate for the table</p>
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
            <Flame className="w-4 h-4 mr-2" />
            New filters
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
}: FilterPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const update = (key: keyof FilterState, value: unknown) => {
    if (key === "allergens_to_avoid") trackEvent("allergy_filter_used");
    onFiltersChange({ ...filters, [key]: value } as FilterState);
  };

  const setVibe = (vibe: TonightVibe) => {
    onFiltersChange(applyTonightVibe(filters, vibe));
  };

  const customized = isAdvancedCustomized(filters);

  return (
    <div className="space-y-4" id="filters-panel">
      <Card className="premium-card">
        <CardContent className="p-4 sm:p-5 space-y-5">
          <div>
            <h2 className="font-heading text-xl tracking-wide text-foreground">What's for dinner at the hall?</h2>
            <p className="text-xs text-muted-foreground mt-1">Crew, time, protein — we'll build a full table meal.</p>
          </div>

          <div className="space-y-2">
            <FieldLabel icon={Users}>How many eating?</FieldLabel>
            <ChipRow
              options={CREW_CHIPS}
              value={
                CREW_CHIPS.some((c) => c.value === filters.crew_size)
                  ? filters.crew_size
                  : 6
              }
              onChange={(val) => update("crew_size", val)}
              testIdPrefix="chip-crew"
            />
          </div>

          <div className="space-y-2">
            <FieldLabel icon={Clock}>How much time?</FieldLabel>
            <ChipRow
              options={TIME_CHIPS}
              value={
                TIME_CHIPS.some((t) => t.value === filters.time_available)
                  ? (filters.time_available as (typeof TIME_CHIPS)[number]["value"])
                  : "25-40"
              }
              onChange={(val) => update("time_available", val)}
              testIdPrefix="chip-time"
            />
          </div>

          {!filters.use_what_we_have && (
            <div className="space-y-2">
              <FieldLabel icon={Dumbbell}>Protein</FieldLabel>
              <ChipRow
                options={PROTEIN_CHIPS}
                value={
                  PROTEIN_CHIPS.some((p) => p.value === filters.protein)
                    ? (filters.protein as (typeof PROTEIN_CHIPS)[number]["value"])
                    : "chicken"
                }
                onChange={(val) => update("protein", val)}
                testIdPrefix="chip-protein"
              />
            </div>
          )}

          <div className="space-y-2">
            <FieldLabel icon={Utensils}>Tonight's vibe</FieldLabel>
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
                    onClick={() => setVibe(v.value)}
                    data-testid={`chip-vibe-${v.value}`}
                    title={v.hint}
                  >
                    {v.label}
                  </Badge>
                );
              })}
            </div>
          </div>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between font-medium text-sm min-h-11"
                data-testid="button-toggle-advanced-filters"
              >
                <span className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />
                  Advanced
                  {customized && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      customized
                    </Badge>
                  )}
                </span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    advancedOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <AdvancedFilterSections filters={filters} update={update} />
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

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
    </div>
  );
});

export { formatGenerateSummary, GenerateButtons };
