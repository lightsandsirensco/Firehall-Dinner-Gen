import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Clock, Loader2, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getSavedCount } from "@/lib/saved-meals";
import { fetchPerformanceRecipePage } from "@/lib/fuel-recipe-api";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { buildPerformanceFuelRecipeSeo } from "@shared/seo/fuel-metadata";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { buildBreadcrumbListSchema } from "@shared/seo/schema";
import { performanceFuelPath, performanceFuelRecipePath } from "@shared/fuel-catalog/paths";
import { FoodImage } from "@/components/mobile/food-image";

export default function PerformanceFuelRecipePage() {
  const [, params] = useRoute("/performance-fuel/:slug");
  const slug = params?.slug ?? "";
  const favCount = useMemo(() => getSavedCount(), []);
  const origin = getSiteOrigin();

  const { data: page, isLoading, isError } = useQuery({
    queryKey: ["performance-fuel-page", slug],
    queryFn: () => fetchPerformanceRecipePage(slug),
    enabled: Boolean(slug),
  });

  const seoConfig = useMemo(
    () =>
      page
        ? buildPerformanceFuelRecipeSeo(
            page.title,
            page.slug,
            page.shortDescription || page.description,
          )
        : null,
    [page],
  );
  usePageSeo(
    seoConfig ?? {
      title: "Performance meal",
      description: "Healthy firefighter meal",
      canonicalPath: performanceFuelPath(),
    },
    useMemo(
      () =>
        page
          ? [
              buildBreadcrumbListSchema(origin, [
                { name: "Home", path: "/" },
                { name: "Performance Fuel", path: performanceFuelPath() },
                { name: page.title, path: performanceFuelRecipePath(page.slug) },
              ]),
            ]
          : [],
      [origin, page],
    ),
  );

  if (!slug || isError) {
    return (
      <div className="page-shell min-h-screen bg-background">
        <SiteHeader activePage="performance" favCount={favCount} />
        <main className="max-w-lg mx-auto px-page py-16 text-center">
          <p className="text-muted-foreground">Meal not found.</p>
          <Link href={performanceFuelPath()} className="mt-4 inline-block text-primary hover:underline">
            Back to performance fuel
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

  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background">
      <SiteHeader activePage="performance" favCount={favCount} />
      <main className="max-w-[800px] mx-auto px-page py-8 sm:py-12" id="main-content">
        <SeoBreadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Performance Fuel", path: performanceFuelPath() },
            { name: page.title, path: performanceFuelRecipePath(page.slug) },
          ]}
          className="mb-4"
        />

        <p className="text-xs uppercase tracking-widest text-sky-400/90">Performance meal</p>
        <h1 className="mt-2 font-heading tracking-tight text-3xl sm:text-4xl">
          {page.displayTitle || page.title}
        </h1>
        <p className="mt-3 text-muted-foreground">{page.subtitle}</p>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4" aria-hidden />
            {page.cookTime} min
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-4 h-4" aria-hidden />
            Crew {page.crewSize}
          </span>
        </div>

        <div className="mt-6 aspect-[16/10] rounded-2xl overflow-hidden ring-1 ring-border/20">
          <FoodImage
            src={page.heroImage}
            alt={page.title}
            layout="card-fill"
            fit="cover"
            focal="center"
            overlay="card-cinematic"
            cinematicGrade
            rounded="lg"
            debugId={{ context: "performance-fuel", slug: page.slug, title: page.title }}
          />
        </div>

        <p className="mt-6 leading-relaxed text-[15px]">{page.description}</p>

        <section className="mt-8" aria-labelledby="ingredients-heading">
          <h2 id="ingredients-heading" className="font-heading text-xl">
            Ingredients
          </h2>
          <ul className="mt-3 space-y-2 text-[15px]">
            {page.ingredients.map((ing, i) => (
              <li key={i}>
                {ing.quantity} {ing.unit} {ing.name}
                {ing.notes ? <span className="text-muted-foreground"> — {ing.notes}</span> : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8" aria-labelledby="steps-heading">
          <h2 id="steps-heading" className="font-heading text-xl">
            Steps
          </h2>
          <ol className="mt-3 space-y-4 list-decimal list-inside text-[15px] leading-relaxed">
            {page.steps.map((s) => (
              <li key={s.stepNumber}>{s.instruction}</li>
            ))}
          </ol>
        </section>

        <p className="mt-10 text-sm text-muted-foreground">
          This meal lives in the performance lane — separate from Find a Meal and the Classics Wheel.{" "}
          <Link href="/recipes" className="text-primary hover:underline">
            Browse hall dinners
          </Link>
        </p>
      </main>
    </div>
  );
}
