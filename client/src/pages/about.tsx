import { useMemo } from "react";

import { Link } from "wouter";

import { SiteHeader } from "@/components/site-header";

import { getSavedCount } from "@/lib/saved-meals";

import { Flame } from "lucide-react";

import { usePageSeo } from "@/lib/seo/use-page-seo";

import { buildAboutSeo } from "@shared/seo/metadata";

import { getSiteOrigin } from "@/lib/seo/site-origin";

import {

  buildBreadcrumbListSchema,

  buildFaqPageSchema,

  buildOrganizationSchema,

  buildWebSiteSchema,

  type FaqItem,

} from "@shared/seo/schema";

import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";

import { InternalLinkHub } from "@/components/seo/internal-link-hub";

import { HOME_FAQ_ITEMS } from "@/lib/seo/home-faq";

import { LightsAndSirensCredit } from "@/components/brand/lights-and-sirens-credit";

import { LightsAndSirensCtaRow } from "@/components/brand/lights-and-sirens-cta-row";

import { LightsAndSirensLink } from "@/components/brand/lights-and-sirens-link";

import { LIGHTS_COPY } from "@/lib/lights-and-sirens";

import { SiteFooter } from "@/components/site-footer";



const ABOUT_FAQ_EXTRA: FaqItem[] = [

  {

    question: "Are recipes made for large crews?",

    answer:

      "Many recipes are designed around crew-sized portions and can be scaled. The goal is fire station meals that feel realistic for a table at the hall, not just a single plate.",

  },

];



export default function AboutPage() {

  const favCount = useMemo(() => getSavedCount(), []);

  const origin = getSiteOrigin();

  const faqs = useMemo(() => [...HOME_FAQ_ITEMS, ...ABOUT_FAQ_EXTRA], []);



  const seoConfig = useMemo(() => buildAboutSeo(), []);

  const seoJsonLd = useMemo(

    () => [

      buildOrganizationSchema(origin),

      buildWebSiteSchema(origin),

      buildFaqPageSchema(faqs),

      buildBreadcrumbListSchema(origin, [

        { name: "Home", path: "/" },

        { name: "About", path: "/about" },

      ]),

    ],

    [origin, faqs],

  );

  usePageSeo(seoConfig, seoJsonLd);



  return (

    <div className="page-shell min-h-screen min-h-[100dvh] bg-background flex flex-col">

      <SiteHeader activePage="explore" favCount={favCount} />



      <main className="max-w-[1100px] mx-auto px-page py-10 sm:py-14 flex-1" id="main-content">

        <SeoBreadcrumbs

          items={[

            { name: "Home", path: "/" },

            { name: "About", path: "/about" },

          ]}

          className="mb-4"

        />



        <div className="flex items-center gap-2 text-muted-foreground">

          <Flame className="w-4 h-4 text-primary" aria-hidden />

          <span className="text-xs uppercase tracking-widest">About</span>

        </div>



        <h1 className="mt-3 font-heading tracking-tight text-3xl sm:text-4xl">

          About Firehall Meals

        </h1>

        <p className="mt-2 text-lg text-muted-foreground">
          Built by firefighters, for firefighters
        </p>



        <LightsAndSirensCredit variant="block" className="mt-6" showFirefighterOwned />



        <p className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
          {LIGHTS_COPY.authenticityBody}
        </p>



        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr,0.8fr] items-start">

          <section className="rounded-2xl border border-border/30 bg-card p-6 sm:p-8 space-y-4">

            <h2 className="font-heading text-xl sm:text-2xl">Why we built this</h2>

            <p className="text-muted-foreground leading-relaxed">
              Generic recipe sites assume a calm kitchen and single-plate portions. That’s not
              station life.
            </p>

            <p className="text-muted-foreground leading-relaxed">
              We wrote these meals for real firehouse kitchens: realistic prep, food that holds when
              you get interrupted, and dinners a rookie can run without embarrassing the hall.
            </p>

            <LightsAndSirensCtaRow size="sm" />

          </section>



          <InternalLinkHub title="Where to go next" />

        </div>



        <section className="mt-10 rounded-2xl border border-border/30 bg-card p-6 sm:p-8">

          <h2 className="font-heading text-xl sm:text-2xl">Meals that work on shift</h2>

          <p className="mt-3 text-muted-foreground leading-relaxed">

            BBQ, oven bakes, skillets, slow cookers, and air-fryer nights when time is tight. Every

            recipe is scaled for crews, written with honest timing, and tested against what halls

            actually cook — not what looks good on a food blog.

          </p>

          <p className="mt-4 text-muted-foreground leading-relaxed">
            Recipes are designed for roughly 2–20 firefighters, beginner cooks, and real shift
            interruptions. Read{" "}
            <Link href="/how-we-test-recipes" className="text-primary hover:underline">
              how we test recipes
            </Link>{" "}
            for the full standard.
          </p>

        </section>



        <section className="mt-10 rounded-2xl border border-border/30 bg-card p-6 sm:p-8" aria-labelledby="about-faq">

          <h2 id="about-faq" className="font-heading text-xl sm:text-2xl">

            FAQ — Firefighter &amp; Firehall Meal Questions

          </h2>

          <dl className="mt-4 space-y-5">

            {faqs.map((f) => (

              <div key={f.question} className="border-t border-border/30 pt-4 first:border-t-0 first:pt-0">

                <dt className="font-semibold text-foreground">{f.question}</dt>

                <dd className="mt-1 text-muted-foreground leading-relaxed">{f.answer}</dd>

              </div>

            ))}

          </dl>

          <p className="mt-6 text-sm text-muted-foreground">

            <Link href="/explore" className="text-primary hover:underline font-medium">

              Browse all firefighter meals →

            </Link>

          </p>

        </section>

      </main>



      <SiteFooter variant="full" />

    </div>

  );

}


