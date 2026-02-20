import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Flame, RefreshCw, Users, Clock, Zap, Dumbbell, ShieldAlert, ChefHat, Leaf, Package, DollarSign } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export interface FilterState {
  crew_size: number;
  busy_level: string;
  time_available: string;
  appliances: string[];
  proteins: string[];
  healthiness_preference: string;
  budget_level: string;
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

const PROTEIN_OPTIONS = [
  "chicken", "beef", "pork", "turkey", "fish", "vegetarian"
];

const ALLERGEN_OPTIONS = [
  "dairy", "gluten", "soy", "eggs", "nuts"
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
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const isActive = selected.includes(option);
        return (
          <Badge
            key={option}
            variant={isActive ? "default" : "outline"}
            className={`cursor-pointer select-none capitalize text-xs toggle-elevate ${isActive ? "toggle-elevated bg-primary text-primary-foreground" : ""}`}
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

export function FilterPanel({ filters, onFiltersChange, onGenerate, onGenerateAnother, isLoading, hasRecipe }: FilterPanelProps) {
  const update = (key: keyof FilterState, value: any) => {
    if (key === "allergens_to_avoid") trackEvent("allergy_filter_used");
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-5">
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

          {!filters.use_what_we_have && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                <Dumbbell className="w-3.5 h-3.5" />
                Proteins
              </Label>
              <MultiToggle
                options={PROTEIN_OPTIONS}
                selected={filters.proteins}
                onChange={(val) => update("proteins", val)}
                testIdPrefix="toggle-protein"
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
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {!hasRecipe ? (
          <Button
            size="lg"
            className="w-full font-heading text-lg tracking-wider"
            onClick={onGenerate}
            disabled={isLoading || filters.appliances.length === 0 || (!filters.use_what_we_have && filters.proteins.length === 0) || (filters.use_what_we_have && filters.ingredients_on_hand_text.trim().length === 0)}
            data-testid="button-generate"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Flame className="w-4 h-4 mr-2" />
            )}
            {isLoading ? "GENERATING..." : "GENERATE MEAL"}
          </Button>
        ) : (
          <>
            <Button
              size="lg"
              className="w-full font-heading text-lg tracking-wider"
              onClick={onGenerateAnother}
              disabled={isLoading}
              data-testid="button-generate-another"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {isLoading ? "GENERATING..." : "GENERATE ANOTHER"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full font-heading text-lg tracking-wider"
              onClick={onGenerate}
              disabled={isLoading}
              data-testid="button-new-generate"
            >
              <Flame className="w-4 h-4 mr-2" />
              NEW SEARCH
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
