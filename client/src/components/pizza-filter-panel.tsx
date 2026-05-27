import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Flame,
  RefreshCw,
  Users,
  Clock,
  ShieldAlert,
  Leaf,
  CircleDot,
  ThermometerSun,
  Dices,
  Refrigerator,
  ChefHat,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";

export type PizzaGenerationMode =
  | "standard"
  | "spin_again"
  | "wheel"
  | "specialty_slice"
  | "build_your_own"
  | "fridge";

export interface PizzaFilterState {
  crew_size: number;
  time_available: string;
  dough_option: string;
  style_preference: string;
  heat_level: string;
  allergens_to_avoid: string[];
  vegetarian_swap_needed: boolean;
  oven_available: boolean;
  generation_mode?: PizzaGenerationMode;
  crust_preference?: string;
  sauce_preference?: string;
}

interface PizzaFilterPanelProps {
  filters: PizzaFilterState;
  onFiltersChange: (filters: PizzaFilterState) => void;
  onGenerate: (mode?: PizzaGenerationMode) => void;
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

const CRUST_OPTIONS = [
  { value: "surprise", label: "Surprise Me" },
  { value: "thin", label: "Thin & Crisp" },
  { value: "regular", label: "Regular" },
  { value: "thick", label: "Thick / Pan" },
  { value: "sheet_pan", label: "Sheet Pan Tray" },
];

const SAUCE_OPTIONS = [
  { value: "surprise", label: "Surprise Me" },
  { value: "tomato", label: "Tomato" },
  { value: "white", label: "White / Alfredo" },
  { value: "bbq", label: "BBQ" },
  { value: "buffalo", label: "Buffalo" },
  { value: "pesto", label: "Pesto" },
];

const MODE_BUTTONS: { mode: PizzaGenerationMode; label: string; icon: typeof Flame }[] = [
  { mode: "wheel", label: "Pizza Wheel", icon: Dices },
  { mode: "specialty_slice", label: "Specialty Pick", icon: Sparkles },
  { mode: "fridge", label: "Fridge Raid", icon: Refrigerator },
  { mode: "build_your_own", label: "Build Your Own", icon: ChefHat },
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
            className={cn(
              "cursor-pointer select-none capitalize text-xs toggle-elevate",
              isActive && "toggle-elevated bg-primary text-primary-foreground",
            )}
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

export function PizzaFilterPanel({
  filters,
  onFiltersChange,
  onGenerate,
  onGenerateAnother,
  isLoading,
  hasRecipe,
}: PizzaFilterPanelProps) {
  const update = <K extends keyof PizzaFilterState>(key: K, value: PizzaFilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-3 lg:space-y-4">
      <div className={cn(app.panel, "lg:border-primary/20 lg:shadow-lg lg:shadow-primary/5")}>
        <div className="p-0 lg:p-4 space-y-3.5 lg:space-y-4">
          <p className="lg:hidden text-[11px] font-medium text-muted-foreground">Pizza modes</p>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2 block">
              Pizza Night Modes
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {MODE_BUTTONS.map(({ mode, label, icon: Icon }) => (
                <Button
                  key={mode}
                  type="button"
                  variant={filters.generation_mode === mode ? "default" : "outline"}
                  size="sm"
                  className="h-auto py-2.5 flex flex-col gap-1 text-[10px] uppercase tracking-wide"
                  disabled={isLoading || !filters.oven_available}
                  onClick={() => {
                    update("generation_mode", mode);
                    onGenerate(mode);
                  }}
                  data-testid={`pizza-mode-${mode}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Button>
              ))}
            </div>
          </div>

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
              <p className="text-xs text-amber-500" data-testid="pizza-text-no-oven">
                Pizza Night requires an oven. Confirm yours is ready before firing up.
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
              <span className="font-heading text-2xl w-8 text-center" data-testid="pizza-text-crew-size">
                {filters.crew_size}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">Feeds ~{Math.max(2, Math.ceil(filters.crew_size / 2))} large hall pies</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Crust</Label>
              <Select
                value={filters.crust_preference ?? "surprise"}
                onValueChange={(val) => update("crust_preference", val)}
              >
                <SelectTrigger className="h-9 text-xs" data-testid="pizza-select-crust">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRUST_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Sauce</Label>
              <Select
                value={filters.sauce_preference ?? "surprise"}
                onValueChange={(val) => update("sauce_preference", val)}
              >
                <SelectTrigger className="h-9 text-xs" data-testid="pizza-select-sauce">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAUCE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
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
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
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
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
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
                  <SelectItem key={h.value} value={h.value}>
                    {h.label}
                  </SelectItem>
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
                One vegetarian crew member
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
          </div>
        </div>
      </div>

      <PizzaGenerateButtons
        className="max-lg:hidden"
        hasRecipe={hasRecipe}
        isLoading={isLoading}
        ovenAvailable={filters.oven_available}
        onGenerate={onGenerate}
        onGenerateAnother={onGenerateAnother}
      />
    </div>
  );
}

interface PizzaGenerateButtonsProps {
  hasRecipe: boolean;
  isLoading: boolean;
  ovenAvailable: boolean;
  onGenerate: (mode?: PizzaGenerationMode) => void;
  onGenerateAnother: () => void;
  className?: string;
}

export function PizzaGenerateButtons({
  hasRecipe,
  isLoading,
  ovenAvailable,
  onGenerate,
  onGenerateAnother,
  className,
}: PizzaGenerateButtonsProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {!hasRecipe ? (
        <Button
          size="lg"
          className="w-full font-heading text-lg tracking-wider min-h-[3.25rem] shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform touch-manipulation"
          onClick={() => onGenerate("standard")}
          disabled={isLoading || !ovenAvailable}
          data-testid="pizza-button-generate"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Flame className="w-4 h-4 mr-2" />
          )}
          {isLoading ? "FIRING UP..." : "FIRE UP PIZZA NIGHT"}
        </Button>
      ) : (
        <>
          <Button
            size="lg"
            className="w-full font-heading text-lg tracking-wider min-h-[3.25rem] active:scale-[0.98] transition-transform touch-manipulation"
            onClick={onGenerateAnother}
            disabled={isLoading || !ovenAvailable}
            data-testid="pizza-button-spin-again"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {isLoading ? "SPINNING..." : "SPIN AGAIN"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full font-heading tracking-wider min-h-11 touch-manipulation"
            onClick={() => onGenerate("standard")}
            disabled={isLoading || !ovenAvailable}
            data-testid="pizza-button-new-generate"
          >
            <Flame className="w-4 h-4 mr-2" />
            NEW SEARCH
          </Button>
        </>
      )}
    </div>
  );
}
