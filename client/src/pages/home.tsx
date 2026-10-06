import { Suspense, useMemo, type ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";

import { SiteHeader } from "@/components/site-header";

import { useHomeSeo } from "@/lib/seo/use-home-seo";

import { fetchGoldenCatalogIndex } from "@/lib/golden-recipe-api";

import { HomeHero } from "@/components/home/home-hero";

import { HomeHowItWorks } from "@/components/home/home-how-it-works";

import { SectionErrorBoundary } from "@/components/section-error-boundary";

import { lazyWithRetry } from "@/lib/lazy-with-retry";

// Below-the-fold homepage sections are not needed for first paint or LCP
// (the hero image is the LCP element — see client/index.html preload).
// Lazy-loading them keeps the eager "/" bundle lean for first-time visitors
// on station Wi-Fi, without changing what renders once the page settles.
const HomeWhyCrews = lazyWithRetry(() =>
  import("@/components/home/home-why-crews").then((m) => ({ default: m.HomeWhyCrews })),
);
const HomeSocialProof = lazyWithRetry(() =>
  import("@/components/home/home-social-proof").then((m) => ({ default: m.HomeSocialProof })),
);
const HomeFeaturedMeals = lazyWithRetry(() =>
  import("@/components/home/home-featured-meals").then((m) => ({ default: m.HomeFeaturedMeals })),
);
const HomeCtaBand = lazyWithRetry(() =>
  import("@/components/home/home-cta-band").then((m) => ({ default: m.HomeCtaBand })),
);
const HomeProCallout = lazyWithRetry(() =>
  import("@/components/home/home-pro-callout").then((m) => ({ default: m.HomeProCallout })),
);
const HomeSeoIntro = lazyWithRetry(() =>
  import("@/components/home/home-seo-intro").then((m) => ({ default: m.HomeSeoIntro })),
);
const HomeLightsAuthenticity = lazyWithRetry(() =>
  import("@/components/brand/home-lights-authenticity").then((m) => ({
    default: m.HomeLightsAuthenticity,
  })),
);
const HomeSeoEditorial = lazyWithRetry(() =>
  import("@/components/home/home-seo-editorial").then((m) => ({ default: m.HomeSeoEditorial })),
);
const HomeEmailCapture = lazyWithRetry(() =>
  import("@/components/home/home-email-capture").then((m) => ({ default: m.HomeEmailCapture })),
);
const HomeFaqSection = lazyWithRetry(() =>
  import("@/components/home/home-faq-section").then((m) => ({ default: m.HomeFaqSection })),
);
const HomeFooter = lazyWithRetry(() =>
  import("@/components/home/home-footer").then((m) => ({ default: m.HomeFooter })),
);

/** Below-fold placeholder — sized close to each section's real content height, so settling in causes minimal reflow. */
function SectionFallback({ minHeight = 192 }: { minHeight?: number }) {
  return (
    <div
      className="max-w-[1400px] mx-auto px-page py-10 sm:py-14 w-full"
      aria-hidden="true"
    >
      <div className="rounded-2xl skeleton-shimmer" style={{ height: minHeight }} />
    </div>
  );
}

/** A lazy section that drops out on its own if its chunk fails, instead of taking the whole homepage down. */
function LazySection({
  name,
  fallback,
  children,
}: {
  name: string;
  fallback: ReactNode;
  children: ReactNode;
}) {
  return (
    <SectionErrorBoundary name={name}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </SectionErrorBoundary>
  );
}

export default function Home() {

  const { data: catalog, isLoading: catalogLoading } = useQuery({

    queryKey: ["golden-catalog-home"],

    queryFn: fetchGoldenCatalogIndex,

    staleTime: 120_000,

  });



  useHomeSeo();



  const catalogMeals = useMemo(() => catalog?.recipes ?? [], [catalog]);



  return (

    <div className="home-page page-shell min-h-screen min-h-[100dvh] bg-background overflow-x-hidden">

      <SiteHeader activePage="home" />



      <HomeHero />



      <main id="main-content">

        <HomeHowItWorks />
        <LazySection name="home-why-crews" fallback={<SectionFallback minHeight={480} />}>
          <HomeWhyCrews />
        </LazySection>
        <LazySection name="home-social-proof" fallback={<SectionFallback minHeight={320} />}>
          <HomeSocialProof />
        </LazySection>
        <LazySection name="home-featured-meals" fallback={<SectionFallback minHeight={360} />}>
          <HomeFeaturedMeals meals={catalogMeals} loading={catalogLoading} />
        </LazySection>
        <LazySection name="home-cta-band" fallback={<SectionFallback minHeight={220} />}>
          <HomeCtaBand />
        </LazySection>
        <LazySection name="home-pro-callout" fallback={<SectionFallback minHeight={220} />}>
          <HomeProCallout />
        </LazySection>



        <div className="border-t border-border/20">

          <LazySection name="home-seo-intro" fallback={null}>
            <HomeSeoIntro />
          </LazySection>
          <LazySection name="home-lights-authenticity" fallback={null}>
            <HomeLightsAuthenticity />
          </LazySection>
          <LazySection name="home-seo-editorial" fallback={null}>
            <HomeSeoEditorial />
          </LazySection>

        </div>



        <LazySection name="home-email-capture" fallback={<SectionFallback minHeight={340} />}>
          <HomeEmailCapture />
        </LazySection>
        <LazySection name="home-faq-section" fallback={<SectionFallback minHeight={420} />}>
          <HomeFaqSection />
        </LazySection>

      </main>



      <LazySection name="home-footer" fallback={null}>
        <HomeFooter />
      </LazySection>

    </div>

  );

}
