import { useLocation } from "wouter";
import { SiteHeader } from "@/components/site-header";
import { AppPageHeader } from "@/components/mobile/app-page-header";
import { SiteFooter } from "@/components/site-footer";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { PizzaNightCatalog } from "@/components/pizza-night-catalog";
import { getSavedCount } from "@/lib/saved-meals";
import { pizzaNightRecipePath } from "@/lib/pizza-night-api";
import { PIZZA_NIGHT_COUNT } from "@shared/pizza-night/manifest";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { buildBreadcrumbListSchema } from "@shared/seo/schema";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";
import { useMemo } from "react";

export default function PizzaNight() {
  const [, navigate] = useLocation();
  const favCount = getSavedCount();
  const origin = getSiteOrigin();

  const pizzaSeo = useMemo(
    () => ({
      title: "Pizza Night | Firehall Meals",
      description: `Browse ${PIZZA_NIGHT_COUNT} hall-tested pizza recipes — crew-sized pies with oven temps, topping order, and step-by-step instructions.`,
      canonicalPath: "/pizza",
      ogType: "website" as const,
    }),
    [],
  );

  const pizzaJsonLd = useMemo(
    () => [
      buildBreadcrumbListSchema(origin, [
        { name: "Home", path: "/" },
        { name: "Pizza Night", path: "/pizza" },
      ]),
    ],
    [origin],
  );

  usePageSeo(pizzaSeo, pizzaJsonLd);

  return (
    <div className={cn(app.page, "pb-safe-nav")}>
      <SiteHeader activePage="pizza" favCount={favCount} />

      <div className={cn(app.main, "pt-2")}>
        <SeoBreadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Pizza Night", path: "/pizza" },
          ]}
        />
      </div>

      <AppPageHeader
        variant="feed"
        title="Pizza Night"
        subtitle={`${PIZZA_NIGHT_COUNT} curated hall pies — stretch, top, bake, and feed the crew. No filters, just pizza.`}
      />

      <main className={cn(app.mainFeed, "pb-10 pt-2 sm:pb-14")}>
        <PizzaNightCatalog onRecipeClick={(slug) => navigate(pizzaNightRecipePath(slug))} />
      </main>

      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
