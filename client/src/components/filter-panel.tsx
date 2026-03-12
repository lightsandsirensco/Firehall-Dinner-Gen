import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Flame, RefreshCw, Users, Clock, Zap, Dumbbell, ShieldAlert, ChefHat, Leaf, Package, DollarSign, Globe, UtensilsCrossed, Settings2, Heart, Utensils } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { memo } from "react";

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
}

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onGenerate: () => void;
  onGenerateAnother: () => void;
  isLoading: boolean;
  hasRecipe: boolean;
}

const APPLIANCE_OPTIONS = [
  "stove", "oven", "grill", "slow cooker", "rice cooker", "air fryer", "microwave", "instant pot"
];

const PROTEIN_OPTIONS: { value: string; label: string }[] = [
  { value: "chicken",    label: "Chicken" },
  { value: "beef",       label: "Beef" },
  { value: "pork",       label: "Pork" },
  { value: "turkey",     label: "Turkey" },
  { value: "seafood",    label: "Seafood" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "any",        label: "Any Protein" },
];

const ALLERGEN_OPTIONS = [
  "dairy", "gluten", "soy", "eggs", "nuts", "shellfish"
];

const BUSY_LEVELS = [
  { value: "quiet", label: "Quiet" },
  { value: "average", label: "Average" },
  { value: "busy", label: "Busy" },
  { value: "slammed", label: "Slammed" },
];

const TIME_RANGES = [
  { value: "15-25", label: "15-25 min" },
  { value: "20-30", label: "20-30 min" },
  { value: "25-40", label: "25-40 min" },
  { value: "30-45", label: "30-45 min" },
  { value: "45-60", label: "45-60 min" },
  { value: "60-90", label: "60-90 min" },
];

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 pb-1">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-sm font-semibold tracking-wide text-foreground uppercase">{label}</span>
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
            className={`cursor-pointer select-none capitalize text-xs px-3 py-1.5 toggle-elevate ${isActive ? "toggle-elevated bg-primary text-primary-foreground" : ""}`}
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

function SingleProteinSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROTEIN_OPTIONS.map(({ value: optValue, label }) => {
        const isActive = value === optValue;
        const isAny = optValue === "any";
        return (
          <Badge
            key={optValue}
            variant={isActive ? "default" : "outline"}
            className={`cursor-pointer select-none text-xs px-3 py-1.5 toggle-elevate transition-all ${
              isActive
                ? isAny
                  ? "toggle-elevated bg-amber-500/90 text-white border-amber-500"
                  : "toggle-elevated bg-primary text-primary-foreground"
                : isAny
                  ? "border-amber-500/40 text-amber-400 hover:border-amber-500/70"
                  : ""
            }`}
            onClick={() => onChange(optValue)}
            data-testid={`toggle-protein-${optValue}`}
          >
            {label}
          </Badge>
        );
      })}
    </div>
  );
}

export const FilterPanel = memo(function FilterPanel({ filters, onFiltersChange, onGenerate, onGenerateAnother, isLoading, hasRecipe }: FilterPanelProps) {
  const update = (key: keyof FilterState, value: any) => {
    if (key === "allergens_to_avoid") trackEvent("allergy_filter_used");
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-4">
      <Card className="premium-card">
        <CardContent className="p-5 space-y-6">

          <div className="space-y-4">
            <SectionHeader icon={Settings2} label="Basics" />

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label
                  htmlFor="use-what-we-have"
                  className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium cursor-pointer select-none"
                >
                  <Package className="w-3.5 h-3.5" />
                  Use What's in the Fridge
                </Label>
                <Switch
                  id="use-what-we-have"
                  checked={filters.use_what_we_have}
                  onCheckedChange={(checked) => update("use_what_we_have", !!checked)}
                  data-testid="switch-use-what-we-have"
                />
              </div>
              {filters.use_what_we_have && (
                <Input
                  placeholder="Enter what's in the fridge (comma separated)"
                  value={filters.ingredients_on_hand_text}
                  onChange={(e) => update("ingredients_on_hand_text", e.target.value)}
                  data-testid="input-ingredients-on-hand"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                <Users className="w-3.5 h-3.5" />
                Crew Size
              </Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[filters.crew_size]}
                  onValueChange={([val]) => update("crew_size", val)}
                  min={2}
                  max={20}
                  step={1}
                  className="flex-1"
                  data-testid="slider-crew-size"
                />
                <span className="font-heading text-2xl w-8 text-center text-foreground" data-testid="text-crew-size">
                  {filters.crew_size}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                <Zap className="w-3.5 h-3.5" />
                Shift Status
              </Label>
              <Select value={filters.busy_level} onValueChange={(val) => update("busy_level", val)}>
                <SelectTrigger data-testid="select-busy-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUSY_LEVELS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                <Clock className="w-3.5 h-3.5" />
                Time Available
              </Label>
              <Select value={filters.time_available} onValueChange={(val) => update("time_available", val)}>
                <SelectTrigger data-testid="select-time-available">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="section-divider" />

          <div className="space-y-4">
            <SectionHeader icon={Heart} label="Diet & Restrictions" />

            {!filters.use_what_we_have && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  <Dumbbell className="w-3.5 h-3.5" />
                  Protein
                </Label>
                <SingleProteinSelect
                  value={filters.protein}
                  onChange={(val) => update("protein", val)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                <Dumbbell className="w-3.5 h-3.5" />
                Healthiness
              </Label>
              <Select value={filters.healthiness_preference} onValueChange={(val) => update("healthiness_preference", val)}>
                <SelectTrigger data-testid="select-healthiness">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lean">Lean</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="comfort">Comfort</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="veg-swap"
                  checked={filters.vegetarian_swap_needed}
                  onCheckedChange={(checked) => update("vegetarian_swap_needed", !!checked)}
                  data-testid="checkbox-veg-swap"
                />
                <Label
                  htmlFor="veg-swap"
                  className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium cursor-pointer select-none"
                >
                  <Leaf className="w-3.5 h-3.5 text-green-500" />
                  One crew member is vegetarian (add a veg option)
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                <ShieldAlert className="w-3.5 h-3.5" />
                Avoid (Allergies)
              </Label>
              <MultiToggle
                options={ALLERGEN_OPTIONS}
                selected={filters.allergens_to_avoid}
                onChange={(val) => update("allergens_to_avoid", val)}
                testIdPrefix="toggle-allergen"
              />
              {filters.allergens_to_avoid.length === 0 && (
                <p className="text-xs text-muted-foreground">No restrictions selected</p>
              )}
            </div>
          </div>

          <div className="section-divider" />

          <div className="space-y-4">
            <SectionHeader icon={Utensils} label="Kitchen & Budget" />

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                <ChefHat className="w-3.5 h-3.5" />
                Appliances Available
              </Label>
              <MultiToggle
                options={APPLIANCE_OPTIONS}
                selected={filters.appliances}
                onChange={(val) => update("appliances", val)}
                testIdPrefix="toggle-appliance"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                <DollarSign className="w-3.5 h-3.5" />
                Budget
              </Label>
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
            <SectionHeader icon={Globe} label="Meal Preferences" />

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                <Globe className="w-3.5 h-3.5" />
                Cuisine Style
              </Label>
              <Select value={filters.cuisine_style} onValueChange={(val) => update("cuisine_style", val)}>
                <SelectTrigger data-testid="select-cuisine-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any (Random)</SelectItem>
                  <SelectItem value="mediterranean">Mediterranean</SelectItem>
                  <SelectItem value="mexican">Mexican / Tex-Mex</SelectItem>
                  <SelectItem value="italian">Italian-Inspired</SelectItem>
                  <SelectItem value="asian">Asian-Inspired</SelectItem>
                  <SelectItem value="korean">Korean-Inspired</SelectItem>
                  <SelectItem value="thai">Thai-Inspired</SelectItem>
                  <SelectItem value="indian">Indian-Inspired</SelectItem>
                  <SelectItem value="middle_eastern">Middle Eastern</SelectItem>
                  <SelectItem value="bbq">BBQ / Smoky</SelectItem>
                  <SelectItem value="cajun">Cajun / Southern</SelectItem>
                  <SelectItem value="canadian">Canadian Classics</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                <UtensilsCrossed className="w-3.5 h-3.5" />
                Meal Format
              </Label>
              <Select value={filters.meal_format} onValueChange={(val) => update("meal_format", val)}>
                <SelectTrigger data-testid="select-meal-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">Random</SelectItem>
                  <SelectItem value="bowl">Bowl</SelectItem>
                  <SelectItem value="pasta">Pasta</SelectItem>
                  <SelectItem value="sandwich">Sandwich</SelectItem>
                  <SelectItem value="tacos">Tacos</SelectItem>
                  <SelectItem value="skillet">Skillet</SelectItem>
                  <SelectItem value="sheet_pan">Sheet Pan</SelectItem>
                  <SelectItem value="burger">Burger</SelectItem>
                  <SelectItem value="wrap">Wrap</SelectItem>
                  <SelectItem value="casserole">Casserole</SelectItem>
                  <SelectItem value="stir_fry">Stir Fry</SelectItem>
                  <SelectItem value="plated_main">Plated Main</SelectItem>
                  <SelectItem value="salad">Salad</SelectItem>
                  <SelectItem value="soup_chili">Soup / Chili</SelectItem>
                  <SelectItem value="stew">Stew</SelectItem>
                  <SelectItem value="grill">Grill</SelectItem>
                  <SelectItem value="one_pot">One-Pot</SelectItem>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="loaded_fries">Loaded Fries</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {!hasRecipe ? (
          <Button
            size="lg"
            className="btn-generate w-full font-heading text-lg tracking-wider min-h-12"
            onClick={onGenerate}
            disabled={isLoading || filters.appliances.length === 0 || (filters.use_what_we_have && filters.ingredients_on_hand_text.trim().length === 0)}
            data-testid="button-generate"
          >
            {isLoading ? (
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Flame className="w-5 h-5 mr-2" />
            )}
            {isLoading ? "GENERATING..." : "GENERATE MEAL"}
          </Button>
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
              {isLoading ? "GENERATING..." : "GENERATE ANOTHER"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full font-heading text-lg tracking-wider min-h-12"
              onClick={onGenerate}
              disabled={isLoading}
              data-testid="button-new-generate"
            >
              <Flame className="w-5 h-5 mr-2" />
              NEW SEARCH
            </Button>
          </>
        )}
      </div>
    </div>
  );
});
