import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Lock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChipToggle, SingleSelectChips } from "@/components/auth/profile-chips";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth/context";
import { useFeature, useRecordPaywallView } from "@/lib/billing/hooks";
import { useToast } from "@/hooks/use-toast";
import { trackProfileUpdated, trackProFeatureClicked } from "@/lib/analytics";
import {
  PROFILE_APPLIANCE_OPTIONS,
  PROFILE_DIETARY_OPTIONS,
  PROFILE_ALLERGY_OPTIONS,
  PROFILE_CUISINE_OPTIONS,
  PROFILE_SPICE_OPTIONS,
  PROFILE_DIFFICULTY_OPTIONS,
  PROFILE_COOK_TIME_OPTIONS,
  PROFILE_COOK_TIME_LABELS,
  PROFILE_NUTRITION_GOAL_OPTIONS,
  PROFILE_NUTRITION_GOAL_LABELS,
} from "@shared/auth/constants";
import { FOOD_PREFERENCE_DEFINITIONS } from "@shared/ingredient-preferences/definitions";

type SpiceLevel = (typeof PROFILE_SPICE_OPTIONS)[number];
type Difficulty = (typeof PROFILE_DIFFICULTY_OPTIONS)[number];
type CookTime = (typeof PROFILE_COOK_TIME_OPTIONS)[number];
type NutritionGoal = (typeof PROFILE_NUTRITION_GOAL_OPTIONS)[number];

interface EditCrewFoodProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCrewFoodProfileSheet({ open, onOpenChange }: EditCrewFoodProfileSheetProps) {
  const { preferences, refresh, authenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const hasFoodPreferences = useFeature("ingredient_preferences");
  const recordPaywall = useRecordPaywallView();
  const [saving, setSaving] = useState(false);

  const [dietary, setDietary] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [foodsToAvoid, setFoodsToAvoid] = useState<string[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [appliances, setAppliances] = useState<string[]>([]);
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [cookTime, setCookTime] = useState<CookTime | null>(null);
  const [nutritionGoal, setNutritionGoal] = useState<NutritionGoal | null>(null);

  useEffect(() => {
    if (!open) return;
    setDietary(preferences?.dietary_restrictions ?? []);
    setAllergies(preferences?.allergies ?? []);
    setFoodsToAvoid(preferences?.excluded_ingredients ?? []);
    setCuisines(preferences?.favorite_cuisines ?? []);
    setAppliances(preferences?.appliance_preferences ?? []);
    setSpiceLevel((preferences?.spice_level as SpiceLevel | null) ?? null);
    setDifficulty((preferences?.meal_difficulty as Difficulty | null) ?? null);
    setCookTime((preferences?.cook_time_preference as CookTime | null) ?? null);
    setNutritionGoal((preferences?.nutrition_goal as NutritionGoal | null) ?? null);
  }, [open, preferences]);

  const toggleItem = (list: string[], value: string, setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest("PATCH", "/api/auth/profile", {
        dietary_restrictions: dietary,
        allergies,
        // Server re-checks Pro entitlement independently and forces this back
        // to [] for a non-Pro account regardless of what's sent — see
        // server/auth/auth-store.ts.
        excluded_ingredients: foodsToAvoid,
        favorite_cuisines: cuisines,
        appliance_preferences: appliances,
        spice_level: spiceLevel,
        meal_difficulty: difficulty,
        cook_time_preference: cookTime,
        nutrition_goal: nutritionGoal,
      });
      await refresh();
      trackProfileUpdated();
      toast({ title: "Crew food profile updated", variant: "success" });
      onOpenChange(false);
    } catch {
      toast({ title: "Could not save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:mx-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit crew food profile</SheetTitle>
          <SheetDescription>Set this once — recommendations use it every time.</SheetDescription>
        </SheetHeader>

        <form
          className="space-y-6 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <div className="space-y-2">
            <Label>Dietary restrictions</Label>
            <div className="flex flex-wrap gap-2">
              {PROFILE_DIETARY_OPTIONS.map((d) => (
                <ChipToggle key={d} label={d} selected={dietary.includes(d)} onToggle={() => toggleItem(dietary, d, setDietary)} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Allergies</Label>
            <p className="text-xs text-muted-foreground">Safety-critical — always double-check ingredient labels.</p>
            <div className="flex flex-wrap gap-2">
              {PROFILE_ALLERGY_OPTIONS.map((a) => (
                <ChipToggle key={a} label={a} selected={allergies.includes(a)} onToggle={() => toggleItem(allergies, a, setAllergies)} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>Ingredients to avoid / dislikes</Label>
              {!hasFoodPreferences && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                  <Lock className="h-2.5 w-2.5" aria-hidden />
                  Pro
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              A personal preference, not allergy protection — use Allergies above for safety.
            </p>
            {hasFoodPreferences ? (
              <div className="flex flex-wrap gap-2">
                {FOOD_PREFERENCE_DEFINITIONS.map((def) => (
                  <ChipToggle
                    key={def.key}
                    label={def.label}
                    selected={foodsToAvoid.includes(def.key)}
                    onToggle={() => toggleItem(foodsToAvoid, def.key, setFoodsToAvoid)}
                  />
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  trackProFeatureClicked({ feature: "foods_to_avoid", page: "/account", logged_in: authenticated });
                  void recordPaywall("ingredient_preferences", "account_preferences");
                  onOpenChange(false);
                  setLocation("/me/subscription?feature=foods_to_avoid");
                }}
                className="w-full rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-left text-xs text-muted-foreground"
                data-testid="account-foods-to-avoid-locked"
              >
                Upgrade to Firehall Meals Pro to save foods you'd rather avoid.
              </button>
            )}
          </div>

          <div className="space-y-2 border-t border-border/30 pt-4">
            <Label>Favourite cuisines</Label>
            <div className="flex flex-wrap gap-2">
              {PROFILE_CUISINE_OPTIONS.map((c) => (
                <ChipToggle key={c} label={c} selected={cuisines.includes(c)} onToggle={() => toggleItem(cuisines, c, setCuisines)} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preferred spice level</Label>
            <SingleSelectChips options={PROFILE_SPICE_OPTIONS} value={spiceLevel} onChange={setSpiceLevel} />
          </div>

          <div className="space-y-2">
            <Label>Preferred meal difficulty</Label>
            <SingleSelectChips options={PROFILE_DIFFICULTY_OPTIONS} value={difficulty} onChange={setDifficulty} />
          </div>

          <div className="space-y-2">
            <Label>Preferred cooking time</Label>
            <SingleSelectChips
              options={PROFILE_COOK_TIME_OPTIONS}
              value={cookTime}
              onChange={setCookTime}
              labels={PROFILE_COOK_TIME_LABELS}
            />
          </div>

          <div className="space-y-2">
            <Label>Default nutrition goal</Label>
            <SingleSelectChips
              options={PROFILE_NUTRITION_GOAL_OPTIONS}
              value={nutritionGoal}
              onChange={setNutritionGoal}
              labels={PROFILE_NUTRITION_GOAL_LABELS}
            />
          </div>

          <div className="space-y-2 border-t border-border/30 pt-4">
            <Label>Cooking equipment</Label>
            <div className="flex flex-wrap gap-2">
              {PROFILE_APPLIANCE_OPTIONS.map((a) => (
                <ChipToggle key={a} label={a} selected={appliances.includes(a)} onToggle={() => toggleItem(appliances, a, setAppliances)} />
              ))}
            </div>
          </div>

          <SheetFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="min-h-11">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="min-h-11">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
