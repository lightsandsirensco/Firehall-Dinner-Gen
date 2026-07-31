import { lazy, Suspense, useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { SiteHeader } from "@/components/site-header";

import { useHomeSeo } from "@/lib/seo/use-home-seo";

import { fetchGoldenCatalogIndex } from "@/lib/golden-recipe-api";

import { HomeHero } from "@/components/home/home-hero";

import { HomeHowItWorks } from "@/components/home/home-how-it-works";

// Below-the-fold homepage sections are not needed for first paint or LCP
// (the hero image is the LCP element — see client/index.html preload).
// Lazy-loading them keeps the eager "/" bundle lean for first-time visitors
// on station Wi-Fi, without changing what renders once the page settles.
const HomeWhyCrews = lazy(() =>
  import("@/components/home/home-why-crews").then((m) => ({ default: m.HomeWhyCrews })),
);
const HomeSocialProof = lazy(() =>
  import("@/components/home/home-social-proof").then((m) => ({ default: m.HomeSocialProof })),
);
const HomeFeaturedMeals = lazy(() =>
  import("@/components/home/home-featured-meals").then((m) => ({ default: m.HomeFeaturedMeals })),
);
const HomeHallVote = lazy(() =>
  import("@/components/home/home-hall-vote").then((m) => ({ default: m.HomeHallVote })),
);
const HomeCtaBand = lazy(() =>
  import("@/components/home/home-cta-band").then((m) => ({ default: m.HomeCtaBand })),
);
const HomeSeoIntro = lazy(() =>
  import("@/components/home/home-seo-intro").then((m) => ({ default: m.HomeSeoIntro })),
);
const HomeLightsAuthenticity = lazy(() =>
  import("@/components/brand/home-lights-authenticity").then((m) => ({
    default: m.HomeLightsAuthenticity,
  })),
);
const HomeSeoEditorial = lazy(() =>
  import("@/components/home/home-seo-editorial").then((m) => ({ default: m.HomeSeoEditorial })),
);
const HomeEmailCapture = lazy(() =>
  import("@/components/home/home-email-capture").then((m) => ({ default: m.HomeEmailCapture })),
);
const HomeFaqSection = lazy(() =>
  import("@/components/home/home-faq-section").then((m) => ({ default: m.HomeFaqSection })),
);
const HomeFooter = lazy(() =>
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
        <Suspense fallback={<SectionFallback minHeight={480} />}>
          <HomeWhyCrews />
        </Suspense>
        <Suspense fallback={<SectionFallback minHeight={320} />}>
          <HomeSocialProof />
        </Suspense>
        <Suspense fallback={<SectionFallback minHeight={360} />}>
          <HomeFeaturedMeals meals={catalogMeals} loading={catalogLoading} />
        </Suspense>
        <Suspense fallback={<SectionFallback minHeight={240} />}>
          <HomeHallVote />
        </Suspense>
        <Suspense fallback={<SectionFallback minHeight={220} />}>
          <HomeCtaBand />
        </Suspense>



        <div className="border-t border-border/20">

          <Suspense fallback={null}>
            <HomeSeoIntro />
            <HomeLightsAuthenticity />
            <HomeSeoEditorial />
          </Suspense>

        </div>



        <Suspense fallback={<SectionFallback minHeight={340} />}>
          <HomeEmailCapture />
        </Suspense>
        <Suspense fallback={<SectionFallback minHeight={420} />}>
          <HomeFaqSection />
        </Suspense>

      </main>



      <Suspense fallback={null}>
        <HomeFooter />
      </Suspense>

    </div>

  );

}
