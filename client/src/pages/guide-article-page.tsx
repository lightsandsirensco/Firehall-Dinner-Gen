import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { getSavedCount } from "@/lib/saved-meals";
import { fetchEditorialArticle, fetchEditorialIndex } from "@/lib/editorial-content-api";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { buildGuideArticleSeo } from "@shared/seo/metadata";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import {
  buildArticleSchema,
  buildFaqPageSchema,
  buildBreadcrumbListSchema,
  buildGuideArticleBreadcrumbs,
} from "@shared/seo/schema";
import { guidePath } from "@shared/editorial/content-schema";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import { PILLAR_LABELS, type EditorialPillar } from "@shared/editorial/content-pillar";
import { Loader2, Clock, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";
import { GuideEmbeddedRecipes } from "@/components/guide-embedded-recipes";
import { FoodImage } from "@/components/mobile/food-image";

export default function GuideArticlePage() {
  const [, guideParams] = useRoute("/guides/:slug");
  const [, blogParams] = useRoute("/blog/:slug");
  const slug = guideParams?.slug ?? blogParams?.slug ?? "";
  const favCount = useMemo(() => getSavedCount(), []);
  const origin = getSiteOrigin();

  const { data: article, isLoading, error } = useQuery({
    queryKey: ["editorial-article", slug],
    queryFn: () => fetchEditorialArticle(slug),
    enabled: !!slug,
    staleTime: Infinity,
  });

  const { data: index } = useQuery({
    queryKey: ["editorial-index"],
    queryFn: fetchEditorialIndex,
    staleTime: Infinity,
  });

  const seoConfig = useMemo(() => (article ? buildGuideArticleSeo(article) : null), [article]);
  const seoJsonLd = useMemo(() => {
    if (!article) return undefined;
    return [
      buildArticleSchema(origin, article),
      buildFaqPageSchema(article.faqs),
      buildBreadcrumbListSchema(origin, buildGuideArticleBreadcrumbs(origin, article)),
    ];
  }, [article, origin]);
  usePageSeo(seoConfig, seoJsonLd);

  const relatedArticles = useMemo(() => {
    if (!article?.relatedArticleSlugs?.length || !index?.articles) return [];
    return article.relatedArticleSlugs
      .map((s) => index.articles.find((a) => a.slug === s))
      .filter(Boolean);
  }, [article, index?.articles]);

  return (
    <div className={cn(app.page, "flex flex-col pb-safe-nav")}>
      <SiteHeader activePage="guides" favCount={favCount} />

      <main
        className={cn(
          app.mainDetail,
          "flex-1 py-6 sm:py-10",
          article?.embeddedRecipes?.length ? "max-w-[880px]" : "max-w-[760px]",
        )}
        id="main-content"
      >
        <SeoBreadcrumbs
          items={
            article
              ? buildGuideArticleBreadcrumbs(origin, article)
              : [
                  { name: "Home", path: "/" },
                  { name: "Guides", path: "/guides" },
                ]
          }
          className="mb-6"
        />

        {isLoading && (
          <div className="flex justify-center py-24" aria-busy="true">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div
            className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6"
            role="alert"
          >
            <p className="text-destructive text-sm font-medium">
              {(error as Error).message || "Could not load this guide."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Check your connection or try again in a moment.
            </p>
            <Link href="/guides" className="mt-4 inline-block text-sm text-primary hover:underline">
              ← All guides
            </Link>
          </div>
        )}

        {!isLoading && !error && slug && !article && (
          <div
            className="rounded-2xl border border-border/30 bg-muted/10 p-6 sm:p-8"
            role="status"
            data-testid="guide-not-found"
          >
            <h1 className="font-heading text-2xl tracking-tight">Guide not found</h1>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              That article may have moved or the link is out of date. Try the classics list or browse all guides.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/guides/10-classic-firehall-meals"
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                10 classic firehall meals
              </Link>
              <Link
                href="/guides"
                className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted/50"
              >
                All guides
              </Link>
              <Link href="/" className="inline-flex items-center text-sm text-primary hover:underline">
                Home
              </Link>
            </div>
          </div>
        )}

        {article && (
          <article>
            {article.heroImage && (
              <div className="relative -mx-page sm:mx-0 mb-7 sm:mb-10 rounded-none sm:rounded-2xl overflow-hidden border border-border/20">
                <FoodImage
                  src={article.heroImage}
                  alt={article.heroImageAlt ?? article.title}
                  layout="card-fill"
                  fit="cover"
                  focal="banner"
                  overlay="none"
                  priority
                  cinematicGrade
                  rounded="none"
                  className="aspect-[16/10] sm:aspect-[2.4/1]"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent"
                  aria-hidden
                />
              </div>
            )}

            <header className="border-b border-border/20 pb-8">
              <h1 className="font-heading tracking-tight text-3xl sm:text-4xl leading-tight">
                {article.title}
              </h1>
              <p className="mt-3 text-[17px] sm:text-lg text-muted-foreground leading-relaxed">
                {article.subtitle}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4" aria-hidden />
                  <time dateTime={`PT${article.readMinutes}M`}>{article.readMinutes} min read</time>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ChefHat className="w-4 h-4" aria-hidden />
                  Hall-tested perspective
                </span>
              </div>
            </header>

            <p className="mt-8 sm:mt-10 text-[16px] sm:text-lg leading-[1.75] text-foreground/90 max-w-prose">
              {article.intro}
            </p>

            <aside
              className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6"
              aria-labelledby="practical-advice-heading"
            >
              <h2 id="practical-advice-heading" className="font-heading text-lg">
                Practical advice for the shift
              </h2>
              <ul className="mt-4 space-y-2.5 text-[15px] text-foreground/85 leading-relaxed list-disc pl-5">
                {(article.practicalAdvice ?? []).map((tip) => (
                  <li key={tip.slice(0, 40)}>{tip}</li>
                ))}
              </ul>
            </aside>

            {(article.sections ?? []).map((section) => (
              <section
                key={section.id}
                className="mt-11 sm:mt-14"
                aria-labelledby={`section-${section.id}`}
              >
                <h2
                  id={`section-${section.id}`}
                  className="font-heading text-xl sm:text-2xl tracking-tight"
                >
                  {section.heading}
                </h2>
                <div className="mt-5 space-y-4 text-[15px] sm:text-[1.0625rem] text-muted-foreground leading-[1.7] max-w-prose">
                  {section.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                {section.tips && section.tips.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground list-disc pl-5">
                    {section.tips.map((t) => (
                      <li key={t.slice(0, 36)}>{t}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            {article.embeddedRecipes && article.embeddedRecipes.length > 0 && (
              <GuideEmbeddedRecipes recipes={article.embeddedRecipes} />
            )}

            <section className="mt-12" aria-labelledby="meal-picks-heading">
              <h2 id="meal-picks-heading" className="font-heading text-xl sm:text-2xl">
                Recipes for this kind of night
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Crew-sized portions and station-realistic timing — same recipes as the rest of the site.
              </p>
              <ul className="mt-6 space-y-4">
                {(article.mealRecommendations ?? []).map((meal) => {
                  const href = approvedCatalogRecipePath(meal.slug);
                  return (
                    <li
                      key={meal.slug}
                      className="rounded-xl border border-border/25 bg-muted/10 p-4 sm:p-5"
                    >
                      <h3 className="font-semibold text-foreground">
                        <Link href={href} className="text-primary hover:underline">
                          {meal.title}
                        </Link>
                      </h3>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                        {meal.blurb}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>

            <aside
              className="mt-12 rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6"
              aria-labelledby="firehall-cta-heading"
            >
              <h2 id="firehall-cta-heading" className="font-heading text-lg sm:text-xl">
                Get rid of the &ldquo;What&apos;s for Dinner?&rdquo; debate
              </h2>
              <p className="mt-3 text-[15px] text-foreground/85 leading-relaxed">
                Built by Firefighters. Tested in the Firehall. Browse crew-sized recipes or use Find a Meal when
                the whiteboard goes quiet.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/recipes"
                  className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Browse recipes
                </Link>
                <Link
                  href="/explore"
                  className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/50"
                >
                  Explore meals
                </Link>
              </div>
            </aside>

            <section className="mt-12" aria-labelledby="faq-heading">
              <h2 id="faq-heading" className="font-heading text-xl sm:text-2xl">
                FAQ
              </h2>
              <dl className="mt-6 space-y-6">
                {(article.faqs ?? []).map((f) => (
                  <div key={f.question} className="border-t border-border/20 pt-6 first:border-t-0 first:pt-0">
                    <dt className="font-semibold text-foreground">{f.question}</dt>
                    <dd className="mt-2 text-muted-foreground leading-relaxed">{f.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {relatedArticles.length > 0 && (
              <section className="mt-12 pt-8 border-t border-border/20" aria-labelledby="related-guides">
                <h2 id="related-guides" className="font-heading text-lg">
                  Related guides
                </h2>
                <ul className="mt-4 space-y-2">
                  {relatedArticles.map((a) => (
                    <li key={a!.slug}>
                      <Link
                        href={guidePath(a!.slug)}
                        className="text-sm text-primary hover:underline"
                      >
                        {a!.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p className="mt-10 text-sm text-muted-foreground">
              <Link href="/guides" className="text-primary hover:underline">
                ← All guides
              </Link>
              {" · "}
              <Link href="/recipes" className="text-primary hover:underline">
                All recipes
              </Link>
            </p>
          </article>
        )}
      </main>
    </div>
  );
}
