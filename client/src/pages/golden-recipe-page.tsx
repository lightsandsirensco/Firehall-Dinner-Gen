import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import {
  ChevronLeft,
  Clock,
  Users,
  ChefHat,
  Flame,
  Lightbulb,
  UtensilsCrossed,
  Recycle,
  Loader2,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSavedCount } from "@/lib/saved-meals";
import { fetchGoldenRecipePage } from "@/lib/golden-recipe-api";
import { golden100HeroPath } from "@/lib/golden-100-hero";
import { cn } from "@/lib/utils";
import { HERO_CONTENT_FADE } from "@/lib/hero-image";
import type { GoldenRecipePage } from "@shared/golden-100/recipe-page-schema";

function formatCategory(id: string): string {
  return id.replace(/_/g, " ");
}

function RelatedCard({ slug, title, thumb }: { slug: string; title: string; thumb: string }) {
  return (
    <Link href={`/recipes/${slug}`}>
      <div className="group rounded-lg border overflow-hidden bg-card hover:border-primary/40 transition-colors">
        <div className="aspect-square bg-muted overflow-hidden">
          <img
            src={thumb}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = golden100HeroPath(slug);
            }}
          />
        </div>
        <p className="p-2 text-xs font-semibold line-clamp-2 leading-tight">{title}</p>
      </div>
    </Link>
  );
}

function RecipeHero({ page }: { page: GoldenRecipePage }) {
  const [loaded, setLoaded] = useState(false);
  const src = page.heroImage || golden100HeroPath(page.slug);

  return (
    <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] max-h-[min(52vh,480px)] rounded-2xl overflow-hidden bg-muted">
      {!loaded && <div className="absolute inset-0 skeleton-shimmer" />}
      <img
        src={src}
        alt={page.title}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
        )}
        fetchPriority="high"
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          (e.target as HTMLImageElement).src = golden100HeroPath(page.slug);
          setLoaded(true);
        }}
      />
      <div className={cn("absolute inset-0", HERO_CONTENT_FADE)} />
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
        <Badge className="mb-2 bg-white/15 text-white border-white/20 capitalize">
          {formatCategory(page.category)}
        </Badge>
        <h1 className="font-heading text-2xl sm:text-4xl tracking-wide leading-tight drop-shadow-md">
          {page.title}
        </h1>
        <p className="mt-1 text-sm sm:text-base text-white/85 max-w-2xl">{page.subtitle}</p>
      </div>
    </div>
  );
}

export default function GoldenRecipePageView() {
  const [, params] = useRoute("/recipes/:slug");
  const slug = params?.slug ?? "";
  const [favCount] = useState(() => getSavedCount());

  const { data: page, isLoading, error } = useQuery({
    queryKey: ["golden-recipe", slug],
    queryFn: () => fetchGoldenRecipePage(slug),
    enabled: !!slug,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (page?.title) {
      document.title = `${page.title} | Firehall Meals`;
    }
    return () => {
      document.title = "Firehall Meals";
    };
  }, [page?.title]);

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

  const metaRow = useMemo(() => {
    if (!page) return [];
    return [
      { icon: Clock, label: `${page.cookTime} min` },
      { icon: Users, label: `${page.crewSize} crew` },
      { icon: ChefHat, label: page.difficulty },
      { icon: Flame, label: `${page.firefighterScore} hall score` },
    ];
  }, [page]);

  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background flex flex-col">
      <SiteHeader activePage="explore" favCount={favCount} />

      <main className="flex-1 max-w-[900px] mx-auto w-full px-page py-6 sm:py-10 pb-safe-nav">
        <Link href="/explore">
          <Button variant="ghost" className="gap-1.5 mb-4 min-h-11">
            <ChevronLeft className="w-4 h-4" />
            Explore catalog
          </Button>
        </Link>

        {isLoading && (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-destructive text-sm">
              {(error as Error).message || "Recipe not found"}
            </CardContent>
          </Card>
        )}

        {page && (
          <article className="space-y-8">
            <RecipeHero page={page} />

            <div className="flex flex-wrap gap-3">
              {metaRow.map(({ icon: Icon, label }) => (
                <Badge key={label} variant="secondary" className="gap-1.5 py-1.5 px-3 capitalize">
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Badge>
              ))}
              <Badge variant="outline" className="capitalize">
                {page.cuisine}
              </Badge>
            </div>

            <p className="text-muted-foreground leading-relaxed">{page.description}</p>

            <section>
              <h2 className="font-heading text-lg tracking-wide mb-3 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-primary" />
                Ingredients
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {page.ingredients.map((ing, i) => (
                  <li
                    key={`${ing.name}-${i}`}
                    className="flex gap-2 text-sm py-2 px-3 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <span className="text-muted-foreground shrink-0">
                      {[ing.quantity, ing.unit].filter(Boolean).join(" ") || "—"}
                    </span>
                    <span className="font-medium">{ing.name}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg tracking-wide mb-4">Instructions</h2>
              <ol className="space-y-4">
                {page.steps.map((step) => (
                  <li key={step.stepNumber} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {step.stepNumber}
                    </span>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="font-semibold text-sm">{step.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {step.instruction}
                      </p>
                      {(step.minutes || step.heatLevel) && (
                        <p className="mt-1.5 text-xs text-muted-foreground/80">
                          {[step.heatLevel && `${step.heatLevel} heat`, step.minutes && `~${step.minutes} min`]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading tracking-wide flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-primary" />
                  Tonight&apos;s spread
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {page.tonightSpread.map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">•</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading tracking-wide flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Pro tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {page.proTips.map((tip, i) => (
                    <li key={i} className="text-muted-foreground leading-relaxed">
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading tracking-wide flex items-center gap-2">
                  <Recycle className="w-4 h-4" />
                  Leftovers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {page.leftovers.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">Calories</p>
                <p className="font-semibold">{page.nutrition.calories}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">Protein</p>
                <p className="font-semibold">{page.nutrition.protein}g</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">Carbs</p>
                <p className="font-semibold">{page.nutrition.carbs}g</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">Fat</p>
                <p className="font-semibold">{page.nutrition.fats}g</p>
              </div>
            </section>

            {page.equipment.length > 0 && (
              <section>
                <h2 className="font-heading text-sm tracking-wide mb-2 text-muted-foreground uppercase">
                  Equipment
                </h2>
                <div className="flex flex-wrap gap-2">
                  {page.equipment.map((eq) => (
                    <Badge key={eq} variant="outline" className="text-xs">
                      {eq}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {relatedQueries.data && relatedQueries.data.length > 0 && (
              <section>
                <h2 className="font-heading text-lg tracking-wide mb-4">Related meals</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {relatedQueries.data.map((r) => (
                    <RelatedCard key={r.slug} slug={r.slug} title={r.title} thumb={r.thumb} />
                  ))}
                </div>
              </section>
            )}

            {page.classicSlug && (
              <Link href={`/package/${page.classicSlug}`}>
                <Button variant="outline" className="w-full">
                  Open hall crew package
                </Button>
              </Link>
            )}
          </article>
        )}
      </main>
    </div>
  );
}
