import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { GenerateResponse } from "@shared/schema";
import { Flame, Droplets, Wheat, Beef, Sparkles, Trash2 } from "lucide-react";

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

      <Card>
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

      <Card>
        <CardContent className="p-4">
          <h3 className="font-heading text-lg tracking-wider uppercase text-foreground mb-3">
            Ingredients
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5" data-testid="section-ingredients">
            {recipe.ingredients.map((ing, i) => (
              <div key={i} className="flex items-baseline gap-2 py-1 border-b border-border/30 last:border-0">
                <span className="text-primary font-medium text-sm whitespace-nowrap">{ing.amount}</span>
                <span className="text-sm text-foreground">{ing.item}</span>
                {ing.notes && (
                  <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">({ing.notes})</span>
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
