import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { InternalLinkHub } from "@/components/seo/internal-link-hub";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { fetchApprovedCatalogGrid } from "@/lib/approved-catalog-api";
import {
  buildBreadcrumbListSchema,
  buildFaqPageSchema,
  buildOrganizationSchema,
  buildWebSiteSchema,
} from "@shared/seo/schema";
import { buildSeoLandingPageSeo } from "@shared/seo/metadata";
import { getSeoLandingPage, seoLandingPagePath, type SeoLandingPageSlug } from "@shared/seo/landing-pages-data";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import { buildRecipeCardAlt } from "@shared/seo/recipe-image-seo";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { BRAND_TAGLINE, CTA } from "@/lib/brand-copy";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SeoLandingPageProps {
  slug: SeoLandingPageSlug;
}

export default function SeoLandingPage({ slug }: SeoLandingPageProps) {
  const page = getSeoLandingPage(slug);

  // Full approved catalog (breakfast/BBQ/pizza/performance included, not just
  // golden-100) so categorized recipe sections — e.g. the "Breakfast at the
  // Firehall" grid on /firefighter-meals — can resolve real titles/cook times
  // for every collection, not only the golden-100/performance subset.
  const { data: catalog } = useQuery({
    queryKey: ["approved-catalog-grid-seo-landing"],
    queryFn: fetchApprovedCatalogGrid,
    staleTime: 120_000,
    enabled: Boolean(page),
  });

  const origin = getSiteOrigin();
  const seoConfig = useMemo(() => (page ? buildSeoLandingPageSeo(page) : null), [page]);

  const catalogBySlug = useMemo(() => {
    if (!catalog?.recipes?.length) return null;
    return new Map(catalog.recipes.map((r) => [r.slug, r]));
  }, [catalog?.recipes]);

  const recipes = useMemo(() => {
    if (!page || !catalogBySlug) return [];
    return page.recipeSlugs
      .map((s) => catalogBySlug.get(s))
      .filter((r): r is NonNullable<typeof r> => Boolean(r));
  }, [page, catalogBySlug]);

  const recipeSections = useMemo(() => {
    if (!page?.recipeSections || !catalogBySlug) return [];
    return page.recipeSections.map((section) => ({
      ...section,
      recipes: section.recipeSlugs
        .map((s) => catalogBySlug.get(s))
        .filter((r): r is NonNullable<typeof r> => Boolean(r)),
    }));
  }, [page, catalogBySlug]);

  const jsonLd = useMemo(() => {
    if (!page) return undefined;
    return [
      buildOrganizationSchema(origin),
      buildWebSiteSchema(origin),
      buildBreadcrumbListSchema(origin, [
        { name: "Home", path: "/" },
        { name: page.h1, path: page.path },
      ]),
      buildFaqPageSchema(page.faqs),
    ];
  }, [origin, page]);

  usePageSeo(seoConfig, jsonLd);

  if (!page) {
    return null;
  }

  return (
    <div className={cn(app.page, "flex flex-col pb-safe-nav")}>
      <SiteHeader activePage="explore" />

      <main className={cn(app.main, "py-8 sm:py-12")}>
        <SeoBreadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: page.h1, path: page.path },
          ]}
        />

        <p className={cn(app.eyebrowMuted, "mt-6")}>{BRAND_TAGLINE}</p>
        <h1 className={cn(app.titlePage, "mt-3")}>{page.h1}</h1>
        <p className={cn(app.lead, "mt-4 max-w-3xl")}>{page.intro}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild className="font-heading uppercase tracking-wide text-xs">
            <Link href="/explore">{CTA.viewRecipes}</Link>
          </Button>
          <Button asChild variant="outline" className="font-heading uppercase tracking-wide text-xs">
            <Link href="/explore">{CTA.exploreMeals}</Link>
          </Button>
        </div>

        <div className="mt-12 lg:grid lg:grid-cols-[1fr_320px] lg:gap-10">
          <article className="min-w-0">
            {page.sections.map((section) => (
              <section key={section.heading} className="mt-10 first:mt-0">
                <h2 className="font-heading text-xl sm:text-2xl text-foreground">{section.heading}</h2>
                <div className="mt-4 space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 48)}>{p}</p>
                  ))}
                </div>
              </section>
            ))}

            {recipeSections.length > 0 ? (
              recipeSections.map((section) => (
                <section key={section.heading} className="mt-12" aria-labelledby={`rs-${section.heading}`}>
                  <h2 id={`rs-${section.heading}`} className="font-heading text-xl sm:text-2xl text-foreground">
                    {section.heading}
                  </h2>
                  {section.intro && (
                    <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                      {section.intro}
                    </p>
                  )}
                  {!catalog ? (
                    <div className="mt-6 flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Loading recipes…
                    </div>
                  ) : (
                    <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                      {section.recipes.map((r) => (
                        <li key={r.slug}>
                          <Link
                            href={approvedCatalogRecipePath(r.slug)}
                            className="block rounded-xl border border-border/30 bg-card/20 px-4 py-3 hover:bg-muted/30 transition-colors"
                          >
                            <span className="font-medium text-primary">{r.title}</span>
                            {r.cookTime && (
                              <span className="block text-xs text-muted-foreground mt-1">
                                ~{r.cookTime} min · crew-sized
                              </span>
                            )}
                            <span className="sr-only">{buildRecipeCardAlt(r.title)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.viewAllPath && (
                    <Link
                      href={section.viewAllPath}
                      className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
                    >
                      {section.viewAllLabel ?? "View all"} →
                    </Link>
                  )}
                </section>
              ))
            ) : (
              <>
                <section className="mt-10">
                  <h2 className="font-heading text-xl sm:text-2xl text-foreground">
                    Browse on Firehall Meals
                  </h2>
                  <div className="mt-4 space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                    <p>
                      Firehall Meals is built by firefighters and tested in real halls — not a generic recipe
                      blog repackaged for SEO. Every firefighter meal in the catalog includes crew scaling,
                      shopping lists, and steps written for station kitchens where the tones drop mid-prep and
                      the rookie is on their first crew dinner.
                    </p>
                    <p>
                      Get rid of the &ldquo;What&apos;s for Dinner?&rdquo; debate every shift. Browse the full
                      recipe catalog, explore by category, spin the Classics Wheel when the crew cannot decide,
                      or use Find a Meal for a fast pick based on protein, time, and head count. Built by
                      Firefighters. Tested in the Firehall.
                    </p>
                  </div>
                </section>

                <section className="mt-12" aria-labelledby="landing-recipes-heading">
                  <h2 id="landing-recipes-heading" className="font-heading text-xl sm:text-2xl text-foreground">
                    Hall-tested recipes
                  </h2>
                  {!catalog ? (
                    <div className="mt-6 flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Loading recipes…
                    </div>
                  ) : (
                    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                      {recipes.map((r) => (
                        <li key={r.slug}>
                          <Link
                            href={approvedCatalogRecipePath(r.slug)}
                            className="block rounded-xl border border-border/30 bg-card/20 px-4 py-3 hover:bg-muted/30 transition-colors"
                          >
                            <span className="font-medium text-primary">{r.title}</span>
                            {r.cookTime && (
                              <span className="block text-xs text-muted-foreground mt-1">
                                ~{r.cookTime} min · crew-sized
                              </span>
                            )}
                            <span className="sr-only">{buildRecipeCardAlt(r.title)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}

            {page.secondarySections?.map((section) => (
              <section key={section.heading} className="mt-12">
                <h2 className="font-heading text-xl sm:text-2xl text-foreground">{section.heading}</h2>
                <div className="mt-4 space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 48)}>{p}</p>
                  ))}
                </div>
              </section>
            ))}

            {page.generatorCta && (
              <section className="mt-12 rounded-2xl border border-border/25 bg-card/15 p-6 sm:p-8">
                <h2 className="font-heading text-xl sm:text-2xl text-foreground">
                  {page.generatorCta.heading}
                </h2>
                <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                  {page.generatorCta.body}
                </p>
                <Button asChild className="mt-5 font-heading uppercase tracking-wide text-xs">
                  <Link href={page.generatorCta.ctaPath}>{page.generatorCta.ctaLabel}</Link>
                </Button>
              </section>
            )}

            <section className="mt-12" aria-labelledby="landing-faq-heading">
              <h2 id="landing-faq-heading" className="font-heading text-xl sm:text-2xl text-foreground">
                Questions
              </h2>
              <dl className="mt-6 space-y-6">
                {page.faqs.map((item) => (
                  <div key={item.question}>
                    <dt className="font-medium text-foreground">{item.question}</dt>
                    <dd className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2" aria-label="Related topics">
              {page.relatedPages.map((rel) => (
                <Link
                  key={rel.slug}
                  href={seoLandingPagePath(rel.slug)}
                  className="text-sm font-medium text-primary hover:text-primary/85"
                >
                  {rel.label}
                </Link>
              ))}
            </nav>
          </article>

          <div className="mt-10 lg:mt-0">
            <InternalLinkHub title="Explore Firehall Meals" />
          </div>
        </div>
      </main>
    </div>
  );
}
