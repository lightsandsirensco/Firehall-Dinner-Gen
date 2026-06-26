import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { useHomeSeo } from "@/lib/seo/use-home-seo";
import { fetchGoldenCatalogIndex } from "@/lib/golden-recipe-api";
import { HomeHero } from "@/components/home/home-hero";
import { HomeSeoIntro } from "@/components/home/home-seo-intro";
import { HomeHowItWorks } from "@/components/home/home-how-it-works";
import { HomeWhyCrews } from "@/components/home/home-why-crews";
import { HomeHallVote } from "@/components/home/home-hall-vote";
import { HomeFeaturedMeals } from "@/components/home/home-featured-meals";
import { HomeSocialProof } from "@/components/home/home-social-proof";
import { HomeSeoEditorial } from "@/components/home/home-seo-editorial";
import { HomeCtaBand } from "@/components/home/home-cta-band";
import { HomeEmailCapture } from "@/components/home/home-email-capture";
import { HomeFaqSection } from "@/components/home/home-faq-section";
import { HomeFooter } from "@/components/home/home-footer";
import { HomeLightsAuthenticity } from "@/components/brand/home-lights-authenticity";

export default function Home() {
  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ["golden-catalog-home"],
    queryFn: fetchGoldenCatalogIndex,
    staleTime: 120_000,
  });

  useHomeSeo(300);

  const catalogMeals = useMemo(() => catalog?.recipes ?? [], [catalog]);

  return (
    <div className="home-page page-shell min-h-screen min-h-[100dvh] bg-background overflow-x-hidden">
      <SiteHeader activePage="home" />

      <HomeHero />

      <main>
        <HomeHowItWorks />
        <HomeWhyCrews />
        <HomeSocialProof />
        <HomeFeaturedMeals meals={catalogMeals} loading={catalogLoading} />
        <HomeHallVote />
        <HomeCtaBand />

        <div className="hidden md:block border-t border-border/20">
          <HomeSeoIntro />
          <HomeLightsAuthenticity />
          <HomeSeoEditorial />
        </div>

        <HomeEmailCapture />
        <HomeFaqSection />
      </main>

      <HomeFooter />
    </div>
  );
}
