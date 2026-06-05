import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CrewSizePicker } from "@/components/crew-size-picker";
import { ShoppingListModal } from "@/components/shopping-list-modal";
import { useCrewScaling } from "@/hooks/use-crew-scaling";
import { buildShoppingListFromCatalogIngredients } from "@/lib/shopping-list";
import { SiteHeader } from "@/components/site-header";
import { getSavedCount } from "@/lib/saved-meals";
import { fetchSmoothieCatalogIndex, fetchSmoothieRecipePage } from "@/lib/fuel-recipe-api";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { buildSmoothieRecipeSeo, buildFuelRecipeSchema } from "@shared/seo/fuel-metadata";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { buildBreadcrumbListSchema } from "@shared/seo/schema";
import { smoothieRecipePath, smoothiesIndexPath } from "@shared/fuel-catalog/paths";
import { cn } from "@/lib/utils";
import {
  formatIngredientAmount,
  formatRecipeIngredientName,
  formatTemperaturesInText,
} from "@shared/measurements";
import { RecipeCrewRatingPanel } from "@/components/recipe-crew-rating/recipe-crew-rating-panel";
import { RecipeNutritionPanel } from "@/components/recipe-nutrition-panel";
import { useMeasurementSystem } from "@/components/measurement-unit-toggle";
import { RecipeMeasurementBar } from "@/components/recipe-measurement-bar";

export default function SmoothieRecipePage() {
  const [, smoothieParams] = useRoute("/smoothies/:slug");
  const [, recipeParams] = useRoute("/recipes/:slug");
  const slug = smoothieParams?.slug ?? recipeParams?.slug ?? "";
  const recipePath = slug ? `/recipes/${slug}` : smoothiesIndexPath();
  const favCount = useMemo(() => getSavedCount(), []);
  const origin = getSiteOrigin();
  const [measurementSystem] = useMeasurementSystem();
  const [shoppingOpen, setShoppingOpen] = useState(false);

  const { data: page, isLoading, isError } = useQuery({
    queryKey: ["smoothie-page", slug],
    queryFn: () => fetchSmoothieRecipePage(slug),
    enabled: Boolean(slug),
  });

  const { data: index } = useQuery({
    queryKey: ["smoothie-catalog-index"],
    queryFn: fetchSmoothieCatalogIndex,
    staleTime: Infinity,
  });

  const seoConfig = useMemo(
    () => (page ? buildSmoothieRecipeSeo(page) : null),
    [page],
  );
  usePageSeo(
    seoConfig ?? {
      title: "Smoothie",
      description: "Firefighter smoothie recipe",
      canonicalPath: recipePath,
    },
    useMemo(
      () =>
        page
          ? [
              buildFuelRecipeSchema(origin, page, recipePath),
              buildBreadcrumbListSchema(origin, [
                { name: "Home", path: "/" },
                { name: "Explore", path: "/explore" },
                { name: page.title, path: recipePath },
              ]),
            ]
          : [],
      [origin, page, recipePath],
    ),
  );

  const scalingPage = page
    ? {
        slug: page.slug,
        ingredients: page.ingredients,
        baseServings: (page as { baseServings?: number }).baseServings,
        crewSize: (page as { crewSize?: number }).crewSize,
      }
    : undefined;
  const { crewSize, setCrewSize, scaledIngredients } = useCrewScaling(scalingPage);
  const shoppingList = useMemo(
    () =>
      scaledIngredients.length
        ? buildShoppingListFromCatalogIngredients(scaledIngredients, {
            recipeTitle: page?.title,
            measurementSystem,
          })
        : null,
    [scaledIngredients, page?.title, measurementSystem],
  );

  if (!slug || isError) {
    return (
      <div className="page-shell min-h-screen bg-background">
        <SiteHeader activePage="smoothies" favCount={favCount} />
        <main className="max-w-lg mx-auto px-page py-16 text-center">
          <p className="text-muted-foreground">Smoothie not found.</p>
          <Link href={smoothiesIndexPath()} className="mt-4 inline-block text-primary hover:underline">
            Back to smoothies
          </Link>
        </main>
      </div>
    );
  }

  if (isLoading || !page) {
    return (
      <div className="page-shell min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  const related = (page.relatedSlugs ?? [])
    .map((s) => index?.recipes.find((r) => r.slug === s))
    .filter(Boolean);

  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background">
      <SiteHeader activePage="smoothies" favCount={favCount} />
      <main className="max-w-[720px] mx-auto px-page py-8 sm:py-12" id="main-content">
        <SeoBreadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Explore", path: "/explore" },
            { name: page.title, path: recipePath },
          ]}
          className="mb-4"
        />

        <p className="text-xs uppercase tracking-widest text-emerald-400/90">{page.taxonomyLabel}</p>
        <h1 className="mt-2 font-heading tracking-tight text-3xl sm:text-4xl">{page.title}</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">{page.intro}</p>

        <RecipeCrewRatingPanel slug={page.slug} category="smoothies" className="mt-6" />

        <RecipeNutritionPanel
          calories={page.nutrition.calories}
          protein={page.nutrition.protein}
          carbs={page.nutrition.carbs}
          fat={page.nutrition.fats}
          estimateAvailable={
            page.nutrition.estimateAvailable !== false &&
            page.nutrition.source !== "unavailable"
          }
          className="mt-6"
        />

        <div className="mt-6 aspect-[16/10] rounded-2xl overflow-hidden border border-border/20 bg-gradient-to-br from-emerald-950/40 to-muted/20">
          {page.heroImage ? (
            <img
              src={page.heroImage}
              alt={page.title}
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>

        <p className="mt-4 text-sm text-muted-foreground rounded-xl bg-muted/20 border border-border/20 p-4 print:hidden">
          {page.nutrition.highlights}
        </p>

        <CrewSizePicker
          crewSize={crewSize}
          onChange={setCrewSize}
          prominent
          className="mt-6"
        />

        <RecipeMeasurementBar className="mt-4">
          <Button
            variant="outline"
            className="min-h-11 gap-2"
            onClick={() => setShoppingOpen(true)}
            disabled={!shoppingList}
          >
            <List className="w-4 h-4" aria-hidden />
            Shopping list ({crewSize} crew)
          </Button>
        </RecipeMeasurementBar>

        <section className="mt-8" aria-labelledby="ingredients-heading">
          <h2 id="ingredients-heading" className="font-heading text-xl">
            Ingredients
          </h2>
          <ul className="mt-3 space-y-2 text-[15px]">
            {scaledIngredients.map((ing, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary shrink-0">·</span>
                <span>
                  {formatIngredientAmount(ing.quantity, ing.unit, measurementSystem)}{" "}
                  {formatRecipeIngredientName(ing.name)}
                  {ing.notes ? (
                    <span className="text-muted-foreground"> ({ing.notes})</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8" aria-labelledby="steps-heading">
          <h2 id="steps-heading" className="font-heading text-xl">
            Blend it
          </h2>
          <ol className="mt-3 space-y-4 list-decimal list-inside text-[15px] leading-relaxed">
            {page.steps.map((s) => (
              <li key={s.stepNumber} className="pl-1">
                {formatTemperaturesInText(s.instruction, measurementSystem)}
              </li>
            ))}
          </ol>
        </section>

        {page.substitutions?.length ? (
          <section className="mt-8">
            <h2 className="font-heading text-lg">Substitutions</h2>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {page.substitutions.map((s, i) => (
                <li key={i}>· {s}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <aside
          className={cn(
            "mt-8 rounded-2xl border border-amber-500/15 bg-amber-950/20 p-5",
            "text-sm leading-relaxed",
          )}
        >
          <strong className="text-foreground font-medium">On shift:</strong>{" "}
          <span className="text-muted-foreground">{page.shiftNote}</span>
        </aside>

        {related.length > 0 ? (
          <section className="mt-12" aria-labelledby="related-heading">
            <h2 id="related-heading" className="font-heading text-lg">
              More blends
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((r) =>
                r ? (
                  <li key={r.slug}>
                    <Link
                      href={smoothieRecipePath(r.slug)}
                      className="block rounded-xl border border-border/25 p-3 hover:border-primary/30 transition-colors text-sm font-medium"
                    >
                      {r.title}
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          </section>
        ) : null}

        <p className="mt-10 text-sm text-muted-foreground">
          Need a real meal?{" "}
          <Link href="/generator" className="text-primary hover:underline">
            Find dinner
          </Link>{" "}
          — smoothies are fuel, not crew dinner.
        </p>
      </main>
      {shoppingList && page && (
        <ShoppingListModal
          open={shoppingOpen}
          onOpenChange={setShoppingOpen}
          shoppingList={shoppingList}
          recipeTitle={page.title}
          generatorType="meal"
        />
      )}
    </div>
  );
}
