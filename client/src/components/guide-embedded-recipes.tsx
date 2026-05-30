import { useState } from "react";
import { Link } from "wouter";
import type { EditorialEmbeddedRecipe } from "@shared/editorial/content-schema";
import { smoothieRecipePath } from "@shared/fuel-catalog/paths";
import { formatTemperaturesInText } from "@shared/measurements";
import { cn } from "@/lib/utils";

function formatIngredient(ing: EditorialEmbeddedRecipe["ingredients"][number]): string {
  const qty = [ing.quantity, ing.unit].filter(Boolean).join(" ");
  const base = qty ? `${qty} ${ing.name}` : ing.name;
  return ing.notes ? `${base} (${ing.notes})` : base;
}

function RecipeImage({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={cn(
          "bg-gradient-to-br from-emerald-900/40 via-muted/30 to-amber-900/20",
          className,
        )}
        aria-hidden
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={cn("object-cover w-full h-full", className)}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export function GuideEmbeddedRecipes({ recipes }: { recipes: EditorialEmbeddedRecipe[] }) {
  return (
    <section className="mt-12 sm:mt-14" aria-labelledby="embedded-recipes-heading">
      <h2 id="embedded-recipes-heading" className="font-heading text-xl sm:text-2xl tracking-tight">
        The ten blends
      </h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-prose">
        Crew-sized quantities below assume one pass in a large blender — scale up by blending in
        batches, not by overfilling the jar.
      </p>
      <ol className="mt-8 space-y-10 sm:space-y-12 list-none p-0 m-0">
        {recipes.map((recipe, index) => (
          <li
            key={recipe.id}
            className="rounded-2xl border border-border/25 bg-card/30 overflow-hidden shadow-sm"
          >
            <div className="grid sm:grid-cols-[minmax(0,1fr)_200px] lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="p-5 sm:p-7 order-2 sm:order-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary/80">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {recipe.category && (
                    <span className="text-xs text-muted-foreground">{recipe.category}</span>
                  )}
                </div>
                <h3 className="mt-2 font-heading text-lg sm:text-xl tracking-tight text-foreground">
                  <Link
                    href={smoothieRecipePath(recipe.id)}
                    className="hover:text-primary transition-colors"
                  >
                    {recipe.name}
                  </Link>
                </h3>
                <p className="mt-2">
                  <Link
                    href={smoothieRecipePath(recipe.id)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Full recipe page →
                  </Link>
                </p>
                <p className="mt-3 text-[15px] text-muted-foreground leading-relaxed">{recipe.intro}</p>

                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Ingredients</h4>
                    <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground leading-relaxed list-disc pl-4">
                      {recipe.ingredients.map((ing) => (
                        <li key={`${recipe.id}-${ing.name}`}>{formatIngredient(ing)}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Steps</h4>
                    <ol className="mt-2 space-y-2 text-sm text-muted-foreground leading-relaxed list-decimal pl-4">
                      {recipe.instructions.map((step, i) => (
                        <li key={`${recipe.id}-step-${i}`}>{formatTemperaturesInText(step)}</li>
                      ))}
                    </ol>
                  </div>
                </div>

                <p className="mt-5 text-sm text-foreground/80 border-l-2 border-primary/40 pl-3">
                  <span className="font-medium text-foreground">Nutrition: </span>
                  {recipe.nutritionHighlights}
                </p>

                {recipe.substitutions && recipe.substitutions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-foreground">Substitutions</h4>
                    <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground list-disc pl-4">
                      {recipe.substitutions.map((s) => (
                        <li key={s.slice(0, 48)}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="mt-4 text-sm text-foreground/85 bg-muted/20 rounded-lg px-3 py-2.5 leading-relaxed">
                  <span className="font-medium text-foreground">On shift: </span>
                  {recipe.shiftNote}
                </p>
              </div>

              <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-[220px] order-1 sm:order-2 border-b sm:border-b-0 sm:border-l border-border/20">
                <RecipeImage
                  src={recipe.imagePath}
                  alt={recipe.imageAlt ?? recipe.name}
                  className="absolute inset-0"
                />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
