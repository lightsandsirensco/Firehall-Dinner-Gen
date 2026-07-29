import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";

import { Link, useRoute } from "wouter";

import { Clock, Users, ChefHat, List, ShoppingCart, Check } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { RecipeBrandStrip } from "@/components/brand/recipe-brand-strip";
import { SiteFooter } from "@/components/site-footer";

import { Button } from "@/components/ui/button";

import {
  getHallFavoritesCount,
  HALL_FAVORITES_CHANGED_EVENT,
} from "@/lib/hall-favorites-store";
import { HallFavoriteButton } from "@/components/hall-favorites/hall-favorite-button";
import { catalogVoteOptions } from "@/lib/hall-vote-recipes";
import { HallVoteFlow } from "@/components/hall-vote-flow";
import { goldenPageToCookMode } from "@/lib/cook-mode/adapters";
import { StartCookingButton } from "@/components/cook-mode/start-cooking-button";
import { HallRecipeHistoryPanel } from "@/components/hall-history/hall-recipe-history-panel";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";

import { fetchGoldenCatalogIndex, fetchGoldenRecipePage } from "@/lib/golden-recipe-api";
import { buildRecipeLinkClusters } from "@shared/golden-100/internal-link-clusters";
import { buildRecipeHeroAlt } from "@shared/seo/recipe-image-seo";
import { RecipeInternalLinks } from "@/components/seo/recipe-internal-links";

import { golden100HeroPath } from "@/lib/golden-100-hero";
import { displayRecipeHeroSrc } from "@/lib/verified-recipe-hero";

import { cn } from "@/lib/utils";

import { app } from "@/lib/design-tokens";

import { FoodImage } from "@/components/mobile/food-image";
import { RecipePageHeroImage } from "@/components/recipe-page-hero-image";

import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";

import { InternalLinkHub } from "@/components/seo/internal-link-hub";

import { usePageSeo } from "@/lib/seo/use-page-seo";

import { getSiteOrigin } from "@/lib/seo/site-origin";

import { buildRecipePageSeo } from "@shared/seo/metadata";

import {
  approvalScoreToRatingValue,
  buildBreadcrumbListSchema,
  buildOrganizationSchema,
  buildRecipeSchema,
  buildWebSiteSchema,
  type BreadcrumbItem,
} from "@shared/seo/schema";
import { buildRecipeAuthorityLinks } from "@shared/seo/recipe-authority-links";
import { CREW_RATING_MIN_VOTES_TO_SHOW_COUNT } from "@shared/recipe-crew-ratings/constants";
import { crewRatingQueryKey, fetchRecipeCrewRating } from "@/lib/recipe-crew-ratings-api";

import type { GoldenRecipePage } from "@shared/golden-100/recipe-page-schema";
import { MealTrustBadges } from "@/components/trust/meal-trust-badges";
import { RecipeCrewRatingPanel } from "@/components/recipe-crew-rating/recipe-crew-rating-panel";
import { RecipeNutritionPanel } from "@/components/recipe-nutrition-panel";
import { DietaryBadges } from "@/components/trust/dietary-badges";
import { CrewSizePicker } from "@/components/crew-size-picker";
import { ShoppingListModal } from "@/components/shopping-list-modal";
import { useCrewScaling } from "@/hooks/use-crew-scaling";
import { buildShoppingListFromCatalogIngredients } from "@/lib/shopping-list";
import { useShoppingSession } from "@/hooks/use-shopping-session";
import { getRecipeBaseServings } from "@shared/recipe/crew-scaling-config";
import { useToast } from "@/hooks/use-toast";
import {
  formatIngredientAmount,
  formatRecipeIngredientName,
  formatTemperaturesInText,
} from "@shared/measurements";
import { useMeasurementSystem } from "@/components/measurement-unit-toggle";
import { RecipeMeasurementBar } from "@/components/recipe-measurement-bar";
import { trackRecipeView } from "@/lib/analytics";
import { dedupeAgainstShownCopy } from "@shared/text/dedupe-lead-sentence";



function formatCategory(id: string): string {

  return id.replace(/_/g, " ");

}



function RelatedCard({ slug, title, thumb }: { slug: string; title: string; thumb: string }) {

  return (

    <li>

      <Link href={`/recipes/${slug}`} className="group block h-full">

        <article className={cn(app.cardCinematic, "bg-card/40 group-hover:ring-primary/20 h-full")}>

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



function RecipeHero({ page }: { page: GoldenRecipePage & { heroVerified?: boolean } }) {
  const src = displayRecipeHeroSrc(
    page.slug,
    page.heroImage || golden100HeroPath(page.slug),
    page.heroVerified,
  );

  return (
    <header className="space-y-5 sm:space-y-6">
      <div className="relative -mx-page overflow-hidden bg-zinc-950 sm:mx-0 sm:rounded-3xl sm:ring-1 sm:ring-border/30">
        <RecipePageHeroImage
          src={src}
          alt={page.heroImageAlt?.trim() || buildRecipeHeroAlt(page.title)}
          title={page.title}
          debugId={{ context: "golden-hero", slug: page.slug, title: page.title }}
        />
      </div>

      <div className="px-0.5">
        <p className={app.eyebrowMuted}>{formatCategory(page.category)}</p>
        <h1 className={cn(app.titlePage, "mt-2 max-w-2xl")}>
          {page.displayTitle || page.title}
        </h1>
        {page.subtitle ? (
          <p className="mt-2 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
            {page.subtitle}
          </p>
        ) : null}
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



function RecipeCookStepNav({ steps }: { steps: GoldenRecipePage["steps"] }) {

  const [activeStep, setActiveStep] = useState(1);

  const [visible, setVisible] = useState(false);



  useEffect(() => {

    const section = document.getElementById("recipe-steps");

    if (!section || steps.length < 2) return;



    const sectionObserver = new IntersectionObserver(

      ([entry]) => setVisible(entry.isIntersecting),

      { rootMargin: "-35% 0px -35% 0px" },

    );

    sectionObserver.observe(section);



    const stepElements = steps

      .map((step) => document.getElementById(`recipe-step-${step.stepNumber}`))

      .filter((el): el is HTMLElement => Boolean(el));



    const stepObserver = new IntersectionObserver(

      (entries) => {

        const inView = entries

          .filter((entry) => entry.isIntersecting)

          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (!inView[0]) return;

        const stepNumber = Number.parseInt(inView[0].target.id.replace("recipe-step-", ""), 10);

        if (stepNumber > 0) setActiveStep(stepNumber);

      },

      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },

    );



    for (const element of stepElements) {

      stepObserver.observe(element);

    }



    return () => {

      sectionObserver.disconnect();

      stepObserver.disconnect();

    };

  }, [steps]);



  if (!visible || steps.length < 2) return null;



  return (

    <nav

      aria-label="Cook steps"

      className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-30 -mx-page px-page py-2 mb-2 bg-background/95 backdrop-blur-md border-b border-border/40"

      data-testid="recipe-cook-step-nav"

    >

      <ol className="flex gap-2 overflow-x-auto scroll-momentum pb-0.5">

        {steps.map((step) => (

          <li key={step.stepNumber}>

            <button

              type="button"

              onClick={() =>

                document.getElementById(`recipe-step-${step.stepNumber}`)?.scrollIntoView({

                  behavior: "smooth",

                  block: "start",

                })

              }

              className={cn(

                "shrink-0 min-w-11 min-h-11 rounded-full text-sm font-semibold tabular-nums touch-manipulation transition-colors",

                activeStep === step.stepNumber

                  ? "bg-primary text-primary-foreground"

                  : "bg-muted/60 text-muted-foreground hover:bg-muted",

              )}

              aria-current={activeStep === step.stepNumber ? "step" : undefined}

            >

              {step.stepNumber}

            </button>

          </li>

        ))}

      </ol>

    </nav>

  );

}



export default function GoldenRecipePageView() {

  const [, params] = useRoute("/recipes/:slug");

  const slug = params?.slug ?? "";

  const [favCount, setFavCount] = useState(() => getHallFavoritesCount());
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [addedToMyList, setAddedToMyList] = useState(false);
  const { addRecipe: addRecipeToMyShoppingList } = useShoppingSession();
  const { toast } = useToast();
  const autoCookMode = useMemo(
    () => new URLSearchParams(window.location.search).get("cook") === "1",
    [],
  );

  const { data: page, isLoading, error } = useQuery({

    queryKey: ["golden-recipe", slug],

    queryFn: () => fetchGoldenRecipePage(slug),

    enabled: !!slug,

    staleTime: Infinity,

  });

  useEffect(() => {
    const sync = () => setFavCount(getHallFavoritesCount());
    sync();
    window.addEventListener(HALL_FAVORITES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(HALL_FAVORITES_CHANGED_EVENT, sync);
  }, []);



  const origin = getSiteOrigin();



  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {

    if (!page) return [{ name: "Home", path: "/" }, { name: "Explore", path: "/explore" }];

    return [

      { name: "Home", path: "/" },

      { name: "Explore", path: "/explore" },

      { name: page.title, path: `/recipes/${page.slug}` },

    ];

  }, [page]);



  const seoConfig = useMemo(

    () => (page ? buildRecipePageSeo(page, origin) : null),

    [page, origin],

  );

  const { data: ratingView } = useQuery({
    queryKey: crewRatingQueryKey(slug || ""),
    queryFn: () => fetchRecipeCrewRating(slug!),
    enabled: Boolean(slug),
    staleTime: 60_000,
  });

  const seoJsonLd = useMemo(() => {

    if (!page) return undefined;

    const aggregate =
      ratingView &&
      ratingView.approvalScore != null &&
      ratingView.totalVotes >= CREW_RATING_MIN_VOTES_TO_SHOW_COUNT
        ? {
            ratingValue: approvalScoreToRatingValue(ratingView.approvalScore),
            ratingCount: ratingView.totalVotes,
          }
        : undefined;

    return [
      buildOrganizationSchema(origin),
      buildWebSiteSchema(origin),
      buildRecipeSchema(origin, page, aggregate ? { aggregateRating: aggregate } : undefined),
      buildBreadcrumbListSchema(origin, breadcrumbs),
    ];
  }, [page, origin, breadcrumbs, ratingView]);



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

  const authorityLinks = useMemo(
    () => (page ? buildRecipeAuthorityLinks(page) : null),
    [page],
  );

  // Related recipes are resolved from the catalog index we've already
  // fetched (below) instead of issuing up to 6 extra JSON requests per page
  // load. Only slugs missing from that index (e.g. a pizza-night recipe not
  // present in the merged hall index) fall back to an individual fetch.
  type RelatedRecipe = { slug: string; title: string; thumb: string };

  const relatedFromCatalog = useMemo<Array<RelatedRecipe | null>>(() => {
    if (!page?.relatedSlugs?.length) return [];
    const bySlug = new Map((catalog?.recipes ?? []).map((r) => [r.slug, r]));
    return page.relatedSlugs.slice(0, 6).map((s) => {
      const entry = bySlug.get(s);
      return entry ? { slug: entry.slug, title: entry.title, thumb: entry.thumbImage } : null;
    });
  }, [page, catalog?.recipes]);

  const missingRelatedSlugs = useMemo(
    () =>
      relatedFromCatalog
        .map((r, i) => (r === null ? page?.relatedSlugs?.[i] : null))
        .filter((s): s is string => Boolean(s)),
    [relatedFromCatalog, page?.relatedSlugs],
  );

  const missingRelatedQuery = useQuery({
    queryKey: ["golden-recipe-related-missing", slug, missingRelatedSlugs],
    queryFn: async () => {
      const results = await Promise.all(
        missingRelatedSlugs.map(async (s) => {
          try {
            const p = await fetchGoldenRecipePage(s);
            return { slug: p.slug, title: p.title, thumb: p.thumbImage };
          } catch {
            return null;
          }
        }),
      );
      return results.filter((r): r is RelatedRecipe => r !== null);
    },
    enabled: missingRelatedSlugs.length > 0,
    staleTime: Infinity,
  });

  const relatedRecipes = useMemo<RelatedRecipe[]>(() => {
    const resolved = relatedFromCatalog.filter((r): r is RelatedRecipe => r !== null);
    return [...resolved, ...(missingRelatedQuery.data ?? [])];
  }, [relatedFromCatalog, missingRelatedQuery.data]);



  useEffect(() => {
    if (!page) return;
    trackRecipeView({
      slug: page.slug,
      title: page.title,
      collection: "golden_100",
      source: "catalog",
    });
  }, [page?.slug, page?.title]);

  useEffect(() => {
    setAddedToMyList(false);
  }, [page?.slug]);

  const { crewSize, setCrewSize, scaledIngredients, displayCookTime } = useCrewScaling(page);

  const handleAddToMyShoppingList = () => {
    if (!page) return;
    addRecipeToMyShoppingList(
      {
        slug: page.slug,
        title: page.title,
        recipePath: approvedCatalogRecipePath(page.slug),
        baseServings: getRecipeBaseServings(page),
        ingredients: page.ingredients,
      },
      crewSize,
    );
    setAddedToMyList(true);
    toast({
      title: "Added to your shopping list",
      description: `${page.title} ingredients are grouped and combined at /me/shopping-list.`,
    });
  };
  const [measurementSystem] = useMeasurementSystem();

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

  const voteRecipes = useMemo(() => {
    if (!page) return [];
    return catalogVoteOptions(page, relatedRecipes);
  }, [page, relatedRecipes]);

  const cookModeRecipe = useMemo(() => {
    if (!page || scaledIngredients.length === 0) return null;
    return goldenPageToCookMode(page, scaledIngredients, measurementSystem, crewSize);
  }, [page, scaledIngredients, measurementSystem, crewSize]);

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

  // The catalog's `shortDescription` field is identical to `subtitle` for
  // every recipe (already shown in the hero, just above), so falling back to
  // it here would repeat the exact same sentence twice on every recipe page.
  // Prefer the longer, distinct `description` field for the lead paragraph.
  const leadParagraph = useMemo(() => {
    if (!page) return "";
    const short = page.shortDescription?.trim();
    const subtitle = page.subtitle?.trim().toLowerCase();
    if (short && short.toLowerCase() !== subtitle) return short;
    return page.description;
  }, [page]);

  // `whyCrewsLikeIt` frequently restates the subtitle/lead as a leading
  // phrase (e.g. "Double pot, triple appetite. Real toasted-chile depth…")
  // — show only the part that adds something new, or hide it entirely if
  // it's a full duplicate.
  const whyCrewsLikeIt = useMemo(
    () => (page ? dedupeAgainstShownCopy(page.whyCrewsLikeIt, page.subtitle, leadParagraph) : undefined),
    [page, leadParagraph],
  );



  return (

    <div className={cn(app.page, "page-shell flex flex-col min-h-[100dvh] pb-safe-nav")}>

      <SiteHeader activePage="explore" favCount={favCount} />



      <main className={cn(app.mainDetail, "flex-1 py-4 sm:py-8")} id="main-content">

        <SeoBreadcrumbs items={breadcrumbs} className="mb-4" />



        {isLoading && (
          <div className={app.sectionGap} aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading recipe</span>
            <div className="aspect-[4/3] sm:aspect-[16/9] rounded-2xl sm:rounded-3xl skeleton-shimmer" />
            <div className="space-y-3">
              <div className="h-8 sm:h-10 w-3/4 rounded-lg skeleton-shimmer" />
              <div className="h-4 w-1/2 rounded skeleton-shimmer" />
              <div className="flex gap-2 pt-1">
                <div className="h-7 w-20 rounded-full skeleton-shimmer" />
                <div className="h-7 w-24 rounded-full skeleton-shimmer" />
                <div className="h-7 w-16 rounded-full skeleton-shimmer" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-5 w-32 rounded skeleton-shimmer" />
              <div className="h-4 w-full rounded skeleton-shimmer" />
              <div className="h-4 w-full rounded skeleton-shimmer" />
              <div className="h-4 w-2/3 rounded skeleton-shimmer" />
            </div>
          </div>
        )}



        {error && (

          <div className="flex flex-col items-center text-center py-10 fade-up" role="alert" aria-live="assertive">

            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-full bg-destructive/5 animate-ping motion-reduce:animate-none" style={{ animationDuration: "3s" }} />
              <ChefHat className="w-10 h-10 text-destructive/60" aria-hidden />
            </div>

            <h2 className={cn(app.titleSection, "mb-2")}>We couldn't find that recipe</h2>

            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">

              It may have been renamed or retired. Browse the full catalog or grab a meal for tonight instead.

            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">

              <Link href="/explore">

                <Button variant="default" className="min-h-11" data-testid="button-recipe-not-found-explore">

                  Browse recipes

                </Button>

              </Link>

              <Link href="/generator">

                <Button variant="outline" className="min-h-11" data-testid="button-recipe-not-found-generator">

                  Get a meal for tonight

                </Button>

              </Link>

            </div>

          </div>

        )}



        {page && (

          <article className={cn(app.sectionGap, app.mealReveal)}>

            <RecipeHero page={page} />

            <RecipeBrandStrip className="mt-4" />

            <CrewSizePicker
              crewSize={crewSize}
              onChange={setCrewSize}
              prominent
              className="mt-4"
            />

            <div className="flex flex-wrap gap-2 pt-2">

              {metaRow.map(({ icon: Icon, label, datetime }) => (

                <span key={label} className={app.pill}>

                  <Icon className="w-3.5 h-3.5 mr-1.5 inline opacity-70" aria-hidden />

                  {datetime ? <time dateTime={datetime}>{label}</time> : label}

                </span>

              ))}

              <span className={app.pill}>{page.cuisine}</span>

            </div>

            <HallRecipeHistoryPanel
              recipeSlug={page.slug}
              title={page.title}
              recipePath={approvedCatalogRecipePath(page.slug)}
              className="mt-4 max-w-2xl"
              source="recipe_page"
            />

            <RecipeMeasurementBar className="mt-4">
              <HallFavoriteButton
                slug={page.slug}
                title={page.title}
                recipePath={approvedCatalogRecipePath(page.slug)}
                source="recipe_page"
              />
              <Button
                variant="outline"
                className="min-h-11 gap-2"
                onClick={() => setShoppingOpen(true)}
                disabled={!shoppingList}
                data-testid="button-recipe-shopping"
              >
                <List className="w-4 h-4" aria-hidden />
                Shopping list ({crewSize} crew)
              </Button>
              <Button
                variant="outline"
                className="min-h-11 gap-2"
                onClick={handleAddToMyShoppingList}
                data-testid="button-recipe-add-to-my-list"
              >
                {addedToMyList ? (
                  <Check className="w-4 h-4" aria-hidden />
                ) : (
                  <ShoppingCart className="w-4 h-4" aria-hidden />
                )}
                {addedToMyList ? "On my list" : "Add to my list"}
              </Button>
              <StartCookingButton
                recipe={cookModeRecipe}
                recipeSlug={page.slug}
                recipePath={approvedCatalogRecipePath(page.slug)}
                source="recipe_page"
                variant="default"
                autoOpen={autoCookMode}
              />
            </RecipeMeasurementBar>

            {voteRecipes.length > 0 && (
              <HallVoteFlow
                recipes={voteRecipes}
                source="recipe_page"
                variant="banner"
                className="mt-4"
              />
            )}

            <p className={cn(app.lead, "max-w-2xl")}>{leadParagraph}</p>

            <RecipeCrewRatingPanel slug={page.slug} category={page.category} className="max-w-2xl" />

            {whyCrewsLikeIt && (
              <p className="text-[15px] text-muted-foreground max-w-2xl leading-relaxed">
                <span className="text-foreground font-medium">Why crews like it: </span>
                {whyCrewsLikeIt}
              </p>
            )}

            <RecipeSection title="Ingredients" id="recipe-ingredients">
              <div className="space-y-6">
                {ingredientGroups.map(([group, items]) => (
                  <div key={group}>
                    {ingredientGroups.length > 1 && (
                      <h3 className="text-sm font-semibold text-foreground/90 mb-2">{group}</h3>
                    )}
                    <ul className="space-y-0 divide-y divide-border/25">
                      {items.map((ing, i) => (
                        <li
                          key={`${ing.name}-${i}`}
                          className="flex justify-between gap-4 py-3.5 text-[15px]"
                        >
                          <span className="font-medium">
                            {formatRecipeIngredientName(ing.name)}
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

              <RecipeCookStepNav steps={page.steps} />

              <ol className="space-y-8">

                {page.steps.map((step) => (

                  <li

                    key={step.stepNumber}

                    id={`recipe-step-${step.stepNumber}`}

                    className="flex gap-4 sm:gap-5 scroll-mt-[calc(3.5rem+env(safe-area-inset-top,0px)+3.5rem)]"

                  >

                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/60 text-sm font-semibold tabular-nums">

                      {step.stepNumber}

                    </span>

                    <div className="flex-1 min-w-0 pt-0.5">

                      <p className="font-medium text-foreground">{step.title}</p>

                      <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">

                        {formatTemperaturesInText(step.instruction, measurementSystem)}

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

                    <li key={i}>{formatTemperaturesInText(line, measurementSystem)}</li>

                  ))}

                </ul>

              </RecipeSection>

            )}



            {page.proTips.length > 0 && (

              <RecipeSection title="Hall tips" id="recipe-tips">

                <ul className="space-y-3 text-[15px] text-muted-foreground leading-relaxed">

                  {page.proTips.map((tip, i) => (

                    <li key={i}>{formatTemperaturesInText(tip, measurementSystem)}</li>

                  ))}

                </ul>

              </RecipeSection>

            )}



            {page.substitutions && page.substitutions.length > 0 && (
              <RecipeSection title="Substitutions" id="recipe-substitutions">
                <ul className="space-y-2 text-[15px] text-muted-foreground leading-relaxed">
                  {page.substitutions.map((line, i) => (
                    <li key={i}>{formatTemperaturesInText(line, measurementSystem)}</li>
                  ))}
                </ul>
              </RecipeSection>
            )}

            {page.mealPrepNotes && (
              <RecipeSection title="Meal prep" id="recipe-meal-prep">
                <p className="text-[15px] text-muted-foreground leading-relaxed">
                  {formatTemperaturesInText(page.mealPrepNotes, measurementSystem)}
                </p>
              </RecipeSection>
            )}

            {page.leftovers.length > 0 && (
              <RecipeSection title="Leftovers" id="recipe-leftovers">

                <ul className="space-y-2 text-[15px] text-muted-foreground leading-relaxed">

                  {page.leftovers.map((line, i) => (

                    <li key={i}>{formatTemperaturesInText(line, measurementSystem)}</li>

                  ))}

                </ul>

              </RecipeSection>

            )}



            <RecipeNutritionPanel
              calories={page.nutrition.calories}
              protein={page.nutrition.protein}
              carbs={page.nutrition.carbs}
              fat={page.nutrition.fats}
              estimateAvailable={
                page.nutrition.estimateAvailable !== false &&
                page.nutrition.source !== "unavailable"
              }
              className="max-w-2xl"
            />

            <DietaryBadges dietary={page.dietary} className="max-w-2xl" />

            {page.equipment.length > 0 && (

              <div className="flex flex-wrap gap-2">

                {page.equipment.map((eq) => (

                  <span key={eq} className={app.pill}>

                    {eq}

                  </span>

                ))}

              </div>

            )}



            {relatedRecipes.length > 0 && (

              <RecipeSection title="Related firefighter meals" id="recipe-related">

                <nav aria-label="Related recipes">

                  <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">

                    {relatedRecipes.map((r) => (

                      <RelatedCard key={r.slug} slug={r.slug} title={r.title} thumb={r.thumb} />

                    ))}

                  </ul>

                </nav>

              </RecipeSection>

            )}



            <RecipeInternalLinks
              clusters={linkClusters}
              pillar={authorityLinks?.pillar}
              guide={authorityLinks?.guide}
              className="mt-4"
            />

            <InternalLinkHub title="More firefighter meal hubs" className="mt-8" />

            {page.classicSlug && (

              <Link href={`/package/${page.classicSlug}`}>

                <Button className="btn-tonight btn-generate active:scale-[0.98] transition-transform touch-manipulation w-full">Open crew package</Button>

              </Link>

            )}

          </article>

        )}

        {page && shoppingList && (
          <ShoppingListModal
            open={shoppingOpen}
            onOpenChange={setShoppingOpen}
            shoppingList={shoppingList}
            recipeTitle={page.title}
            generatorType="meal"
          />
        )}
      </main>

      <SiteFooter variant="compact" pbSafe />
    </div>

  );

}

