import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";

import { Link, useRoute } from "wouter";

import { Clock, Users, ChefHat, Loader2 } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { RecipeBrandStrip } from "@/components/brand/recipe-brand-strip";
import { SiteFooter } from "@/components/site-footer";

import { Button } from "@/components/ui/button";

import { getSavedCount } from "@/lib/saved-meals";

import { fetchGoldenCatalogIndex, fetchGoldenRecipePage } from "@/lib/golden-recipe-api";
import { buildRecipeLinkClusters } from "@shared/golden-100/internal-link-clusters";
import { buildRecipeHeroAlt } from "@shared/seo/recipe-image-seo";
import { RecipeInternalLinks } from "@/components/seo/recipe-internal-links";

import { golden100HeroPath } from "@/lib/golden-100-hero";

import { cn } from "@/lib/utils";

import { app } from "@/lib/design-tokens";

import { FoodImage } from "@/components/mobile/food-image";

import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";

import { InternalLinkHub } from "@/components/seo/internal-link-hub";

import { usePageSeo } from "@/lib/seo/use-page-seo";

import { getSiteOrigin } from "@/lib/seo/site-origin";

import { buildRecipePageSeo } from "@shared/seo/metadata";

import {

  buildBreadcrumbListSchema,

  buildRecipeSchema,

  type BreadcrumbItem,

} from "@shared/seo/schema";

import type { GoldenRecipePage } from "@shared/golden-100/recipe-page-schema";
import { MealTrustBadges } from "@/components/trust/meal-trust-badges";
import { RecipeCrewRatingPanel } from "@/components/recipe-crew-rating/recipe-crew-rating-panel";
import { RecipeNutritionPanel } from "@/components/recipe-nutrition-panel";
import {
  adjustCookTimeForCrew,
  CREW_SIZE_OPTIONS,
  scaleGoldenIngredients,
} from "@shared/golden-100/recipe-quality/crew-scale";
import {
  formatIngredientAmount,
  formatTemperaturesInText,
} from "@shared/measurements";
import { useMeasurementSystem } from "@/components/measurement-unit-toggle";
import { RecipeMeasurementBar } from "@/components/recipe-measurement-bar";



function formatCategory(id: string): string {

  return id.replace(/_/g, " ");

}



function RelatedCard({ slug, title, thumb }: { slug: string; title: string; thumb: string }) {

  return (

    <li>

      <Link href={`/recipes/${slug}`} className="group block h-full">

        <article className="rounded-2xl overflow-hidden bg-card/40 ring-1 ring-border/20 hover:ring-primary/30 transition-all h-full">

          <div className="aspect-[4/5] bg-zinc-950 overflow-hidden">

            <FoodImage

              src={thumb}

              alt={buildRecipeHeroAlt(title)}

              layout="card-fill"

              fit="cover"

              focal="center"

              overlay="none"

              cinematicGrade

              rounded="none"

              debugId={{ context: "golden-related", slug, title }}

            />

          </div>

          <h3 className="p-3 text-sm font-medium line-clamp-2 leading-snug">{title}</h3>

        </article>

      </Link>

    </li>

  );

}



function RecipeHero({ page }: { page: GoldenRecipePage }) {

  const src = page.heroImage || golden100HeroPath(page.slug);



  return (

    <header className="relative -mx-page sm:mx-0 sm:rounded-3xl overflow-hidden bg-zinc-950">

      <div className="relative w-full aspect-[16/13] sm:aspect-[16/10] max-h-[min(56vh,520px)] sm:max-h-[min(70vh,560px)]">

        <FoodImage

          src={src}

          alt={buildRecipeHeroAlt(page.title)}

          layout="detail"

          fit="cover"

          focal="food"

          overlay="detail"

          priority

          cinematicGrade

          rounded="none"

          className="absolute inset-0"

          debugId={{ context: "golden-hero", slug: page.slug, title: page.title }}

        />

        <div

          className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"

          aria-hidden

        />

        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8">

          <p className={app.eyebrowMuted}>{formatCategory(page.category)}</p>

          <h1 className={cn(app.titlePage, "mt-2 text-white drop-shadow-lg max-w-2xl")}>

            {page.displayTitle || page.title}

          </h1>

          {page.subtitle && (

            <p className="mt-2 text-base sm:text-lg text-white/80 max-w-xl leading-relaxed">

              {page.subtitle}

            </p>

          )}

          <MealTrustBadges
            input={{
              category: page.category,
              tags: page.tags,
              cookTime: page.cookTime,
              difficulty: page.difficulty,
              cleanupDifficulty: page.cleanupDifficulty,
              protein: page.protein,
              popularityWeight: page.popularityWeight,
              cuisine: page.cuisine,
            }}
            max={4}
            size="md"
            className="mt-4"
          />

        </div>

      </div>

    </header>

  );

}



function RecipeSection({

  title,

  children,

  className,

  id,

}: {

  title: string;

  children: ReactNode;

  className?: string;

  id: string;

}) {

  return (

    <section className={cn("space-y-4", className)} aria-labelledby={id}>

      <h2 id={id} className={app.titleMeal}>

        {title}

      </h2>

      {children}

    </section>

  );

}



export default function GoldenRecipePageView() {

  const [, params] = useRoute("/recipes/:slug");

  const slug = params?.slug ?? "";

  const [favCount] = useState(() => getSavedCount());
  const [crewSize, setCrewSize] = useState<number>(8);



  const { data: page, isLoading, error } = useQuery({

    queryKey: ["golden-recipe", slug],

    queryFn: () => fetchGoldenRecipePage(slug),

    enabled: !!slug,

    staleTime: Infinity,

  });



  const origin = getSiteOrigin();



  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {

    if (!page) return [{ name: "Home", path: "/" }, { name: "Recipes", path: "/recipes" }];

    return [

      { name: "Home", path: "/" },

      { name: "Recipes", path: "/recipes" },

      { name: page.title, path: `/recipes/${page.slug}` },

    ];

  }, [page]);



  const seoConfig = useMemo(

    () => (page ? buildRecipePageSeo(page, origin) : null),

    [page, origin],

  );



  const seoJsonLd = useMemo(() => {

    if (!page) return undefined;

    return [

      buildRecipeSchema(origin, page),

      buildBreadcrumbListSchema(origin, breadcrumbs),

    ];

  }, [page, origin, breadcrumbs]);



  usePageSeo(seoConfig, seoJsonLd);

  const { data: catalog } = useQuery({
    queryKey: ["golden-catalog-index"],
    queryFn: fetchGoldenCatalogIndex,
    staleTime: Infinity,
  });

  const linkClusters = useMemo(() => {
    if (!page || !catalog?.recipes?.length) return [];
    const entry = catalog.recipes.find((r) => r.slug === page.slug);
    if (!entry) return [];
    return buildRecipeLinkClusters(entry, catalog.recipes, { equipment: page.equipment });
  }, [page, catalog?.recipes]);

  const relatedQueries = useQuery({

    queryKey: ["golden-recipe-related", slug, page?.relatedSlugs],

    queryFn: async () => {

      if (!page?.relatedSlugs?.length) return [];

      const results = await Promise.all(

        page.relatedSlugs.slice(0, 6).map(async (s) => {

          try {

            const p = await fetchGoldenRecipePage(s);

            return { slug: p.slug, title: p.title, thumb: p.thumbImage };

          } catch {

            return { slug: s, title: s.replace(/-/g, " "), thumb: golden100HeroPath(s) };

          }

        }),

      );

      return results;

    },

    enabled: !!page?.relatedSlugs?.length,

    staleTime: Infinity,

  });



  useEffect(() => {
    if (page) setCrewSize(page.baseServings ?? page.crewSize ?? 8);
  }, [page?.slug, page?.baseServings, page?.crewSize]);

  const baseServings = page?.baseServings ?? page?.crewSize ?? 8;
  const [measurementSystem] = useMeasurementSystem();

  const scaledIngredients = useMemo(() => {
    if (!page) return [];
    return scaleGoldenIngredients(page.ingredients, baseServings, crewSize);
  }, [page, baseServings, crewSize]);

  const displayCookTime = useMemo(() => {
    if (!page) return 0;
    return adjustCookTimeForCrew(page.cookTime, baseServings, crewSize);
  }, [page, baseServings, crewSize]);

  const ingredientGroups = useMemo(() => {
    const groups = new Map<string, typeof scaledIngredients>();
    for (const ing of scaledIngredients) {
      const key = ing.group || "Ingredients";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ing);
    }
    return [...groups.entries()];
  }, [scaledIngredients]);

  const metaRow = useMemo(() => {
    if (!page) return [];
    return [
      { icon: Clock, label: `${displayCookTime} min`, datetime: `PT${displayCookTime}M` },
      { icon: Users, label: `${crewSize} crew` },
      { icon: ChefHat, label: page.difficulty },
    ];
  }, [page, crewSize, displayCookTime]);



  return (

    <div className={cn(app.page, "page-shell flex flex-col min-h-[100dvh] pb-safe-nav")}>

      <SiteHeader activePage="explore" favCount={favCount} />



      <main className={cn(app.mainDetail, "flex-1 py-4 sm:py-8")} id="main-content">

        <SeoBreadcrumbs items={breadcrumbs} className="mb-4" />



        {isLoading && (

          <div className="flex justify-center py-24" aria-busy="true" aria-live="polite">

            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />

            <span className="sr-only">Loading recipe</span>

          </div>

        )}



        {error && (

          <div className={cn(app.panel, "p-6 text-destructive text-sm")} role="alert">

            {(error as Error).message || "Recipe not found"}

          </div>

        )}



        {page && (

          <article className={app.sectionGap}>

            <RecipeHero page={page} />

            <RecipeBrandStrip className="mt-4" />

            <div className="flex flex-wrap gap-2 pt-2">

              {metaRow.map(({ icon: Icon, label, datetime }) => (

                <span key={label} className={app.pill}>

                  <Icon className="w-3.5 h-3.5 mr-1.5 inline opacity-70" aria-hidden />

                  {datetime ? <time dateTime={datetime}>{label}</time> : label}

                </span>

              ))}

              <span className={app.pill}>{page.cuisine}</span>

            </div>

            <RecipeMeasurementBar className="mt-4">
              <div className="space-y-2.5" role="group" aria-label="Crew size">
                <p className="text-sm font-medium text-foreground">Crew size</p>
                <div className="flex flex-wrap gap-2">
                  {CREW_SIZE_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCrewSize(n)}
                      className={cn(
                        app.pill,
                        "min-h-11 sm:min-h-9 cursor-pointer transition-colors touch-manipulation",
                        crewSize === n && "bg-primary/20 ring-1 ring-primary/40 text-foreground",
                      )}
                      aria-pressed={crewSize === n}
                    >
                      {n} firefighters
                    </button>
                  ))}
                </div>
              </div>
            </RecipeMeasurementBar>

            <p className={cn(app.lead, "max-w-2xl")}>{page.shortDescription || page.description}</p>

            <RecipeCrewRatingPanel slug={page.slug} category={page.category} className="max-w-2xl" />

            {page.whyCrewsLikeIt && (
              <p className="text-[15px] text-muted-foreground max-w-2xl leading-relaxed">
                <span className="text-foreground font-medium">Why crews like it: </span>
                {page.whyCrewsLikeIt}
              </p>
            )}

            <RecipeSection title="Ingredients" id="recipe-ingredients">
              <div className="space-y-6">
                {ingredientGroups.map(([group, items]) => (
                  <div key={group}>
                    {ingredientGroups.length > 1 && (
                      <h3 className="text-sm font-semibold text-foreground/90 mb-2">{group}</h3>
                    )}
                    <ul className="space-y-0 divide-y divide-border/30">
                      {items.map((ing, i) => (
                        <li
                          key={`${ing.name}-${i}`}
                          className="flex justify-between gap-4 py-3.5 text-[15px]"
                        >
                          <span className="font-medium">
                            {ing.name}
                            {ing.notes && (
                              <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                                {ing.notes}
                              </span>
                            )}
                          </span>
                          <span className="text-muted-foreground tabular-nums shrink-0">
                            {formatIngredientAmount(ing.quantity, ing.unit, measurementSystem) || "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </RecipeSection>



            <RecipeSection title="How to cook it" id="recipe-steps">

              <ol className="space-y-8">

                {page.steps.map((step) => (

                  <li

                    key={step.stepNumber}

                    className="flex gap-4 sm:gap-5"

                  >

                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/60 text-sm font-semibold tabular-nums">

                      {step.stepNumber}

                    </span>

                    <div className="flex-1 min-w-0 pt-0.5">

                      <p className="font-medium text-foreground">{step.title}</p>

                      <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">

                        {formatTemperaturesInText(step.instruction)}

                      </p>

                      {(step.minutes || step.heatLevel) && (

                        <p className="mt-2 text-xs text-muted-foreground/70">

                          {[step.heatLevel && `${step.heatLevel} heat`, step.minutes && `~${step.minutes} min`]

                            .filter(Boolean)

                            .join(" · ")}

                        </p>

                      )}

                    </div>

                  </li>

                ))}

              </ol>

            </RecipeSection>



            {page.tonightSpread.length > 0 && (

              <RecipeSection title="Tonight's spread" id="recipe-spread">

                <ul className="space-y-2 text-[15px] text-muted-foreground leading-relaxed">

                  {page.tonightSpread.map((line, i) => (

                    <li key={i}>{formatTemperaturesInText(line)}</li>

                  ))}

                </ul>

              </RecipeSection>

            )}



            {page.proTips.length > 0 && (

              <RecipeSection title="Hall tips" id="recipe-tips">

                <ul className="space-y-3 text-[15px] text-muted-foreground leading-relaxed">

                  {page.proTips.map((tip, i) => (

                    <li key={i}>{formatTemperaturesInText(tip)}</li>

                  ))}

                </ul>

              </RecipeSection>

            )}



            {page.substitutions && page.substitutions.length > 0 && (
              <RecipeSection title="Substitutions" id="recipe-substitutions">
                <ul className="space-y-2 text-[15px] text-muted-foreground leading-relaxed">
                  {page.substitutions.map((line, i) => (
                    <li key={i}>{formatTemperaturesInText(line)}</li>
                  ))}
                </ul>
              </RecipeSection>
            )}

            {page.mealPrepNotes && (
              <RecipeSection title="Meal prep" id="recipe-meal-prep">
                <p className="text-[15px] text-muted-foreground leading-relaxed">
                  {formatTemperaturesInText(page.mealPrepNotes)}
                </p>
              </RecipeSection>
            )}

            {page.leftovers.length > 0 && (
              <RecipeSection title="Leftovers" id="recipe-leftovers">

                <ul className="space-y-2 text-[15px] text-muted-foreground leading-relaxed">

                  {page.leftovers.map((line, i) => (

                    <li key={i}>{formatTemperaturesInText(line)}</li>

                  ))}

                </ul>

              </RecipeSection>

            )}



            <RecipeNutritionPanel
              calories={page.nutrition.calories}
              protein={page.nutrition.protein}
              carbs={page.nutrition.carbs}
              fat={page.nutrition.fats}
              className="max-w-2xl"
            />

            {page.equipment.length > 0 && (

              <div className="flex flex-wrap gap-2">

                {page.equipment.map((eq) => (

                  <span key={eq} className={app.pill}>

                    {eq}

                  </span>

                ))}

              </div>

            )}



            {relatedQueries.data && relatedQueries.data.length > 0 && (

              <RecipeSection title="Related firefighter meals" id="recipe-related">

                <nav aria-label="Related recipes">

                  <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">

                    {relatedQueries.data.map((r) => (

                      <RelatedCard key={r.slug} slug={r.slug} title={r.title} thumb={r.thumb} />

                    ))}

                  </ul>

                </nav>

              </RecipeSection>

            )}



            <RecipeInternalLinks clusters={linkClusters} className="mt-4" />



            {page.classicSlug && (

              <Link href={`/package/${page.classicSlug}`}>

                <Button className="btn-tonight w-full">Open crew package</Button>

              </Link>

            )}

          </article>

        )}

      </main>

      <SiteFooter variant="compact" pbSafe />
    </div>

  );

}

