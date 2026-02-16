import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Flame, RefreshCw, Users, Clock, ShieldAlert, Leaf, CircleDot, ThermometerSun } from "lucide-react";

export interface PizzaFilterState {
  crew_size: number;
  time_available: string;
  dough_option: string;
  style_preference: string;
  heat_level: string;
  allergens_to_avoid: string[];
  vegetarian_swap_needed: boolean;
  oven_available: boolean;
}

interface PizzaFilterPanelProps {
  filters: PizzaFilterState;
  onFiltersChange: (filters: PizzaFilterState) => void;
  onGenerate: () => void;
  onGenerateAnother: () => void;
  isLoading: boolean;
  hasRecipe: boolean;
}

const ALLERGEN_OPTIONS = ["dairy", "gluten", "soy", "eggs", "nuts"];

const TIME_RANGES = [
  { value: "30-45", label: "30-45 min" },
  { value: "45-60", label: "45-60 min" },
  { value: "60-90", label: "60-90 min" },
  { value: "90-150", label: "90-150 min" },
];

const DOUGH_OPTIONS = [
  { value: "premade", label: "Premade Dough" },
  { value: "from_scratch", label: "From Scratch" },
  { value: "surprise_me", label: "Surprise Me" },
];

const STYLE_OPTIONS = [
  { value: "classic", label: "Classic" },
  { value: "creative", label: "Creative / Viral" },
  { value: "comfort", label: "Comfort / Heavy" },
  { value: "healthier", label: "Healthier" },
];

const HEAT_OPTIONS = [
  { value: "mild", label: "Mild" },
  { value: "medium", label: "Medium" },
  { value: "spicy", label: "Spicy" },
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

export function PizzaFilterPanel({ filters, onFiltersChange, onGenerate, onGenerateAnother, isLoading, hasRecipe }: PizzaFilterPanelProps) {
  const update = (key: keyof PizzaFilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="pizza-oven-available"
                checked={filters.oven_available}
                onCheckedChange={(checked) => update("oven_available", !!checked)}
                data-testid="pizza-checkbox-oven"
              />
              <Label
                htmlFor="pizza-oven-available"
                className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium cursor-pointer select-none"
              >
                <ThermometerSun className="w-3.5 h-3.5 text-orange-500" />
                Oven Available
              </Label>
            </div>
            {!filters.oven_available && (
              <p className="text-xs text-amber-500 mt-1" data-testid="pizza-text-no-oven">
                Pizza Night requires an oven. Make sure yours is available before firing up.
              </p>
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
                data-testid="pizza-slider-crew-size"
              />
              <span className="font-heading text-2xl w-8 text-center text-foreground" data-testid="pizza-text-crew-size">
                {filters.crew_size}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
              <Clock className="w-3.5 h-3.5" />
              Time Available
            </Label>
            <Select value={filters.time_available} onValueChange={(val) => update("time_available", val)}>
              <SelectTrigger data-testid="pizza-select-time">
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
              <CircleDot className="w-3.5 h-3.5" />
              Dough Option
            </Label>
            <Select value={filters.dough_option} onValueChange={(val) => update("dough_option", val)}>
              <SelectTrigger data-testid="pizza-select-dough">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOUGH_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
              <Flame className="w-3.5 h-3.5" />
              Style Preference
            </Label>
            <Select value={filters.style_preference} onValueChange={(val) => update("style_preference", val)}>
              <SelectTrigger data-testid="pizza-select-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
              <Flame className="w-3.5 h-3.5" />
              Heat Level
            </Label>
            <Select value={filters.heat_level} onValueChange={(val) => update("heat_level", val)}>
              <SelectTrigger data-testid="pizza-select-heat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HEAT_OPTIONS.map((h) => (
                  <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="pizza-veg-swap"
                checked={filters.vegetarian_swap_needed}
                onCheckedChange={(checked) => update("vegetarian_swap_needed", !!checked)}
                data-testid="pizza-checkbox-veg-swap"
              />
              <Label
                htmlFor="pizza-veg-swap"
                className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium cursor-pointer select-none"
              >
                <Leaf className="w-3.5 h-3.5 text-green-500" />
                One crew member is vegetarian (add veg option)
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
              testIdPrefix="pizza-toggle-allergen"
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
            disabled={isLoading || !filters.oven_available}
            data-testid="pizza-button-generate"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Flame className="w-4 h-4 mr-2" />
            )}
            {isLoading ? "GENERATING..." : "FIRE UP PIZZA NIGHT"}
          </Button>
        ) : (
          <>
            <Button
              size="lg"
              className="w-full font-heading text-lg tracking-wider"
              onClick={onGenerateAnother}
              disabled={isLoading || !filters.oven_available}
              data-testid="pizza-button-generate-another"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {isLoading ? "GENERATING..." : "DIFFERENT PIZZA"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full font-heading text-lg tracking-wider"
              onClick={onGenerate}
              disabled={isLoading || !filters.oven_available}
              data-testid="pizza-button-new-generate"
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
