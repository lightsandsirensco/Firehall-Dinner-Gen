import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { InternalLinkHub } from "@/components/seo/internal-link-hub";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { fetchGoldenCatalogIndex } from "@/lib/golden-recipe-api";
import {
  buildBreadcrumbListSchema,
  buildFaqPageSchema,
  buildOrganizationSchema,
  buildSoftwareApplicationSchema,
  buildWebSiteSchema,
} from "@shared/seo/schema";
import { buildProductSeoPageSeo } from "@shared/seo/metadata";
import {
  getProductSeoPage,
  productSeoPagePath,
  type ProductSeoPageSlug,
  type ProductSeoScreenshot,
} from "@shared/seo/product-pages-data";
import { recipePath } from "@shared/seo/urls";
import { guidePath } from "@shared/editorial/content-schema";
import { buildRecipeCardAlt } from "@shared/seo/recipe-image-seo";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { BRAND_TAGLINE } from "@/lib/brand-copy";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SeoProductPageProps {
  slug: ProductSeoPageSlug;
}

function ProductScreenshot({ shot }: { shot: ProductSeoScreenshot }) {
  if (shot.src) {
    return (
      <figure className="overflow-hidden rounded-xl border border-border/40 bg-card/30">
        <img src={shot.src} alt={shot.alt} className="w-full object-cover" loading="lazy" />
        <figcaption className="px-4 py-3 text-sm text-muted-foreground">{shot.caption}</figcaption>
      </figure>
    );
  }

  return (
    <figure className="overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-muted/40 via-background to-muted/20">
      <div
        className="border-b border-border/30 bg-muted/25 px-4 py-2.5"
        aria-hidden
      >
        <p className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
          Product preview · {shot.mockTitle}
        </p>
      </div>
      <div className="px-4 py-5 sm:px-5" role="img" aria-label={shot.alt}>
        <ul className="space-y-2.5">
          {shot.mockLines.map((line) => (
            <li
              key={line}
              className="rounded-lg border border-border/25 bg-background/70 px-3 py-2 text-sm text-foreground/90"
            >
              {line}
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="border-t border-border/30 px-4 py-3 text-sm text-muted-foreground">
        {shot.caption}
      </figcaption>
    </figure>
  );
}

export default function SeoProductPage({ slug }: SeoProductPageProps) {
  const page = getProductSeoPage(slug);

  const { data: catalog } = useQuery({
    queryKey: ["golden-catalog-seo-product"],
    queryFn: fetchGoldenCatalogIndex,
    staleTime: 120_000,
    enabled: Boolean(page),
  });

  const origin = getSiteOrigin();
  const seoConfig = useMemo(() => (page ? buildProductSeoPageSeo(page) : null), [page]);

  const recipes = useMemo(() => {
    if (!page || !catalog?.recipes?.length) return [];
    const bySlug = new Map(catalog.recipes.map((r) => [r.slug, r]));
    return page.recipeSlugs
      .map((s) => bySlug.get(s))
      .filter((r): r is NonNullable<typeof r> => Boolean(r));
  }, [page, catalog?.recipes]);

  const jsonLd = useMemo(() => {
    if (!page) return undefined;
    return [
      buildOrganizationSchema(origin),
      buildWebSiteSchema(origin),
      buildSoftwareApplicationSchema(origin, {
        name: page.appName,
        description: page.description,
        path: page.path,
      }),
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
          {page.ctas.map((cta) => (
            <Button
              key={cta.href + cta.label}
              asChild
              variant={cta.variant === "outline" ? "outline" : "default"}
              className="font-heading uppercase tracking-wide text-xs"
            >
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          ))}
        </div>

        <p className="mt-4 max-w-2xl text-xs text-muted-foreground leading-relaxed">
          Educational page only — private hall data (rosters, votes, pantry counts, budgets) is never
          indexed or shown here.
        </p>

        <div className="mt-12 lg:grid lg:grid-cols-[1fr_320px] lg:gap-10">
          <article className="min-w-0">
            <section className="mt-0">
              <h2 className="font-heading text-xl sm:text-2xl text-foreground">
                {page.problem.heading}
              </h2>
              <div className="mt-4 space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                {page.problem.paragraphs.map((p) => (
                  <p key={p.slice(0, 48)}>{p}</p>
                ))}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="font-heading text-xl sm:text-2xl text-foreground">
                {page.currentWorkaround.heading}
              </h2>
              <div className="mt-4 space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                {page.currentWorkaround.paragraphs.map((p) => (
                  <p key={p.slice(0, 48)}>{p}</p>
                ))}
              </div>
            </section>

            <section className="mt-10" aria-labelledby="product-screenshots-heading">
              <h2
                id="product-screenshots-heading"
                className="font-heading text-xl sm:text-2xl text-foreground"
              >
                What it looks like
              </h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {page.screenshots.map((shot) => (
                  <ProductScreenshot key={shot.mockTitle + shot.caption} shot={shot} />
                ))}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="font-heading text-xl sm:text-2xl text-foreground">
                {page.solution.heading}
              </h2>
              <div className="mt-4 space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                {page.solution.paragraphs.map((p) => (
                  <p key={p.slice(0, 48)}>{p}</p>
                ))}
              </div>
            </section>

            <div className="mt-8 flex flex-wrap gap-3">
              {page.ctas.map((cta) => (
                <Button
                  key={`mid-${cta.href}-${cta.label}`}
                  asChild
                  variant={cta.variant === "outline" ? "outline" : "default"}
                  className="font-heading uppercase tracking-wide text-xs"
                >
                  <Link href={cta.href}>{cta.label}</Link>
                </Button>
              ))}
            </div>

            <section className="mt-12" aria-labelledby="product-recipes-heading">
              <h2
                id="product-recipes-heading"
                className="font-heading text-xl sm:text-2xl text-foreground"
              >
                Recipes that pair with this tool
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
                        href={recipePath(r.slug)}
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

            <section className="mt-12" aria-labelledby="product-guides-heading">
              <h2
                id="product-guides-heading"
                className="font-heading text-xl sm:text-2xl text-foreground"
              >
                Related guides
              </h2>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {page.guideSlugs.map((g) => (
                  <li key={g.slug}>
                    <Link
                      href={guidePath(g.slug)}
                      className="block rounded-xl border border-border/30 bg-card/20 px-4 py-3 text-sm font-medium text-primary hover:bg-muted/30 transition-colors"
                    >
                      {g.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-12" aria-labelledby="product-faq-heading">
              <h2 id="product-faq-heading" className="font-heading text-xl sm:text-2xl text-foreground">
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

            <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2" aria-label="Related product pages">
              {page.relatedProducts.map((rel) => (
                <Link
                  key={rel.slug}
                  href={productSeoPagePath(rel.slug)}
                  className="text-sm font-medium text-primary hover:text-primary/85"
                >
                  {rel.label}
                </Link>
              ))}
            </nav>

            <div className="mt-12 flex flex-wrap gap-3 border-t border-border/30 pt-8">
              {page.ctas.map((cta) => (
                <Button
                  key={`bottom-${cta.href}-${cta.label}`}
                  asChild
                  variant={cta.variant === "outline" ? "outline" : "default"}
                  className="font-heading uppercase tracking-wide text-xs"
                >
                  <Link href={cta.href}>{cta.label}</Link>
                </Button>
              ))}
            </div>
          </article>

          <div className="mt-10 lg:mt-0">
            <InternalLinkHub title="Explore Firehall Meals" />
          </div>
        </div>
      </main>
    </div>
  );
}
