import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { GenerateResponse } from "@shared/schema";
import { Flame, Droplets, Wheat, Beef, Sparkles, Trash2, Clock, Timer, ShieldCheck, Thermometer } from "lucide-react";

interface RecipeCardProps {
  recipe: GenerateResponse;
  crewSize: number;
}

function MacroBar({ label, value, unit, icon, color }: { label: string; value: number; unit: string; icon: any; color: string }) {
  const Icon = icon;
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="font-heading text-xl leading-none">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{unit}</span>
    </div>
  );
}

export function RecipeCard({ recipe, crewSize }: RecipeCardProps) {
  const hasTiming = recipe.timing && (recipe.timing.prep_minutes || recipe.timing.cook_minutes || recipe.timing.total_minutes);
  const hasSafety = recipe.protein_safety && recipe.protein_safety.length > 0;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1">
        <h2 className="font-heading text-4xl md:text-5xl tracking-wide text-foreground leading-none" data-testid="text-recipe-title">
          {recipe.title}
        </h2>
        <p className="text-sm text-muted-foreground" data-testid="text-recipe-why">
          {recipe.why_it_fits_tonight}
        </p>
      </div>

      <div className="flex flex-wrap gap-3" data-testid="section-timing-macros">
        {hasTiming && (
          <Card className="flex-1 min-w-[200px]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="font-heading text-lg tracking-wider uppercase text-foreground">Timing</h3>
              </div>
              <div className="flex gap-2" data-testid="section-timing">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <Timer className="w-4 h-4 text-blue-400" />
                  <span className="font-heading text-xl leading-none">{recipe.timing.prep_minutes}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">prep</span>
                </div>
                <Separator orientation="vertical" className="h-14 self-center" />
                <div className="flex flex-col items-center gap-1 flex-1">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="font-heading text-xl leading-none">{recipe.timing.cook_minutes}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">cook</span>
                </div>
                <Separator orientation="vertical" className="h-14 self-center" />
                <div className="flex flex-col items-center gap-1 flex-1">
                  <Clock className="w-4 h-4 text-green-400" />
                  <span className="font-heading text-xl leading-none">{recipe.timing.total_minutes}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">total</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="flex-1 min-w-[200px]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-heading text-lg tracking-wider uppercase text-foreground">Macros Per Serving</h3>
              <Badge variant="outline" className="ml-auto text-xs">
                {crewSize} servings
              </Badge>
            </div>
            <div className="flex gap-2" data-testid="section-macros">
              <MacroBar label="Calories" value={recipe.macros_per_serving.calories} unit="cal" icon={Flame} color="text-orange-400" />
              <Separator orientation="vertical" className="h-14 self-center" />
              <MacroBar label="Protein" value={recipe.macros_per_serving.protein_g} unit="protein" icon={Beef} color="text-red-400" />
              <Separator orientation="vertical" className="h-14 self-center" />
              <MacroBar label="Carbs" value={recipe.macros_per_serving.carbs_g} unit="carbs" icon={Wheat} color="text-amber-400" />
              <Separator orientation="vertical" className="h-14 self-center" />
              <MacroBar label="Fat" value={recipe.macros_per_serving.fat_g} unit="fat" icon={Droplets} color="text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {hasSafety && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h3 className="font-heading text-lg tracking-wider uppercase text-foreground">Protein Safety</h3>
            </div>
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
              data-testid="section-protein-safety"
            >
              {recipe.protein_safety.map((ps, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border/40 p-3 space-y-2"
                  data-testid={`protein-safety-${i}`}
                >
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-bold text-sm text-foreground">{ps.protein}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-muted-foreground">Target:</span>
                      <span className="text-sm font-heading text-primary">{ps.target_temp_f}°F</span>
                      <span className="text-xs text-muted-foreground">/ {ps.target_temp_c}°C</span>
                    </div>
                    {ps.rest_minutes > 0 && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-muted-foreground">Rest:</span>
                        <span className="text-sm font-medium text-foreground">{ps.rest_minutes} min</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground/80">Probe:</span> {ps.probe_where}
                  </p>
                  {ps.notes && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {ps.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <h3 className="font-heading text-lg tracking-wider uppercase text-foreground mb-3">
            Ingredients
          </h3>
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
            data-testid="section-ingredients"
          >
            {recipe.ingredients.map((ing, i) => (
              <div
                key={i}
                className="flex flex-col gap-1 rounded-md border border-border/40 p-3 leading-relaxed"
                style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                data-testid={`ingredient-row-${i}`}
              >
                <p className="text-sm whitespace-normal break-words">
                  <span className="font-bold text-foreground">{ing.item}</span>
                  {ing.amount && (
                    <span className="text-primary font-medium"> — {ing.amount}</span>
                  )}
                </p>
                {ing.notes && (
                  <p className="text-xs text-muted-foreground whitespace-normal break-words">
                    {ing.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-heading text-lg tracking-wider uppercase text-foreground mb-3">
            Steps
          </h3>
          <ol className="space-y-3" data-testid="section-steps">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-heading text-xl text-primary flex-shrink-0 w-6 text-right leading-6">
                  {i + 1}
                </span>
                <p className="text-sm text-foreground/90 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Trash2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-heading text-sm tracking-wider uppercase text-muted-foreground mb-1">
                Cleanup Tip
              </h3>
              <p className="text-sm text-foreground/80" data-testid="text-cleanup-tip">{recipe.cleanup_tip}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
