import { useState } from "react";
import { Pencil } from "lucide-react";
import { EditCrewFoodProfileSheet } from "@/components/auth/edit-crew-food-profile-sheet";
import { useAuth } from "@/lib/auth/context";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import {
  PROFILE_COOK_TIME_LABELS,
  PROFILE_NUTRITION_GOAL_LABELS,
} from "@shared/auth/constants";
import {
  PROFILE_NUTRITION_GOAL_KEY_LABELS,
  sanitizeProfileNutritionGoals,
} from "@shared/nutrition/profile-goals";

function SummaryChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border/50 bg-muted/20 px-2.5 py-1 text-[11px] font-medium capitalize text-foreground/90">
      {label.replace(/_/g, " ")}
    </span>
  );
}

export function CrewFoodProfileCard() {
  const { preferences } = useAuth();
  const [editing, setEditing] = useState(false);

  const dietary = preferences?.dietary_restrictions ?? [];
  const allergies = preferences?.allergies ?? [];
  const avoid = preferences?.excluded_ingredients ?? [];
  const cuisines = preferences?.favorite_cuisines ?? [];
  const appliances = preferences?.appliance_preferences ?? [];
  const spice = preferences?.spice_level;
  const difficulty = preferences?.meal_difficulty;
  const cookTime = preferences?.cook_time_preference;
  const nutritionGoal = preferences?.nutrition_goal;
  const nutritionGoals = sanitizeProfileNutritionGoals(preferences?.nutrition_goals ?? []).map(
    (g) => PROFILE_NUTRITION_GOAL_KEY_LABELS[g],
  );

  const singleSelects = [
    spice && `${spice} spice`,
    difficulty && `${difficulty} difficulty`,
    cookTime && (PROFILE_COOK_TIME_LABELS as Record<string, string>)[cookTime],
    nutritionGoal && (PROFILE_NUTRITION_GOAL_LABELS as Record<string, string>)[nutritionGoal],
  ].filter(Boolean) as string[];

  const chipGroups = [dietary, allergies, avoid, cuisines, appliances, nutritionGoals];
  const hasAnyData = chipGroups.some((g) => g.length > 0) || singleSelects.length > 0;

  return (
    <>
      <section className={cn(app.cardSurface, "p-5")}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className={app.titleCard}>Crew Food Profile</h2>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-muted/20 hover-elevate active-elevate-2 touch-manipulation shrink-0"
            aria-label="Edit crew food profile"
            data-testid="button-edit-crew-food-profile"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        {hasAnyData ? (
          <div className="flex flex-wrap gap-1.5">
            {singleSelects.map((s) => (
              <SummaryChip key={s} label={s} />
            ))}
            {nutritionGoals.map((g) => (
              <SummaryChip key={`n-${g}`} label={g} />
            ))}
            {dietary.map((d) => (
              <SummaryChip key={`d-${d}`} label={d} />
            ))}
            {allergies.map((a) => (
              <SummaryChip key={`a-${a}`} label={`no ${a}`} />
            ))}
            {cuisines.map((c) => (
              <SummaryChip key={`c-${c}`} label={c} />
            ))}
            {appliances.map((a) => (
              <SummaryChip key={`e-${a}`} label={a} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Tell us how your crew eats so recommendations get better.
          </p>
        )}
      </section>

      <EditCrewFoodProfileSheet open={editing} onOpenChange={setEditing} />
    </>
  );
}
