import { useMemo } from "react";
import { Link } from "wouter";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { InternalLinkHub } from "@/components/seo/internal-link-hub";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { buildHowWeTestRecipesSeo } from "@shared/seo/metadata";
import {
  buildBreadcrumbListSchema,
  buildFaqPageSchema,
  buildOrganizationSchema,
  buildWebSiteSchema,
  type FaqItem,
} from "@shared/seo/schema";
import { getSavedCount } from "@/lib/saved-meals";
import { CTA } from "@/lib/brand-copy";
import { Button } from "@/components/ui/button";

const FAQS: FaqItem[] = [
  {
    question: "Are Firehall Meals recipes kitchen-tested?",
    answer:
      "Every recipe is checked automatically for safe cooking temperatures, ingredients that match the steps, and nutrition calculated from the ingredients, and we are working through a human culinary review of the full library, starting with the most-cooked dishes. Kitchen testing — cooking the recipe in a station kitchen and confirming yield and timing — is a separate step, and we only describe a recipe as kitchen-tested once that has actually happened. Feedback from crews using the catalog shapes updates.",
  },
  {
    question: "Are the recipe photos real?",
    answer:
      "Recipe images are illustrations of the finished dish as written. Many are AI-generated, so treat them as a guide to what you are aiming for rather than a photo of a specific test batch.",
  },
  {
    question: "Are these meals beginner-friendly?",
    answer:
      "Yes. Instructions emphasize pans, timing, visual cues, and common mistakes so a firefighter with little cooking experience can still get dinner on the table for the crew.",
  },
  {
    question: "How is this different from a food blog?",
    answer:
      "Food blogs optimize for home plating and single households. Firehall Meals optimizes for station workflow: crew scaling, hold quality after calls, grocery-store ingredients, and clear steps for a shared kitchen.",
  },
];

export default function HowWeTestRecipesPage() {
  const favCount = useMemo(() => getSavedCount(), []);
  const origin = getSiteOrigin();
  const seoConfig = useMemo(() => buildHowWeTestRecipesSeo(), []);
  const jsonLd = useMemo(
    () => [
      buildOrganizationSchema(origin),
      buildWebSiteSchema(origin),
      buildBreadcrumbListSchema(origin, [
        { name: "Home", path: "/" },
        { name: "How we write and review recipes", path: "/how-we-test-recipes" },
      ]),
      buildFaqPageSchema(FAQS),
    ],
    [origin],
  );

  usePageSeo(seoConfig, jsonLd);

  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background flex flex-col">
      <SiteHeader activePage="explore" favCount={favCount} />

      <main className="max-w-[1100px] mx-auto px-page py-10 sm:py-14 flex-1" id="main-content">
        <SeoBreadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "How we write and review recipes", path: "/how-we-test-recipes" },
          ]}
          className="mb-4"
        />

        <p className="text-xs uppercase tracking-widest text-muted-foreground">EEAT · Recipe standards</p>
        <h1 className="mt-3 font-heading tracking-tight text-3xl sm:text-4xl">
          How we write and review recipes
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
          Firehall Meals is built by firefighters for firehouse kitchens. Every recipe is designed for
          real shift cooking — not a quiet home kitchen and a single plate.
        </p>

        <section className="mt-10 rounded-2xl border border-border/30 bg-card p-6 sm:p-8 space-y-4">
          <h2 className="font-heading text-xl sm:text-2xl">Built for real firehouses</h2>
          <p className="text-muted-foreground leading-relaxed">
            Station kitchens are shared, interrupted, and opinionated. Recipes have to survive tones
            mid-sear, late returns from a run, and cooks who may not cook much outside the firehouse.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            We write for that environment: crew portions, hold notes, grocery-store ingredients, and
            steps a rookie can follow without guessing what “cook until done” means.
          </p>
        </section>

        <section className="mt-8 rounded-2xl border border-border/30 bg-card p-6 sm:p-8 space-y-4">
          <h2 className="font-heading text-xl sm:text-2xl">What we check before a recipe ships</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground leading-relaxed">
            <li>
              <strong className="text-foreground">Food safety:</strong> chicken, turkey, ground meat,
              pork and fish carry USDA safe internal temperatures (165°F for poultry, 160°F for ground
              beef and pork, 145°F for whole cuts and fish), plus hot-holding and leftover guidance.
            </li>
            <li>
              <strong className="text-foreground">Ingredients match the steps:</strong> everything the
              steps use is on the list, quantities are realistic, and servings add up.
            </li>
            <li>
              <strong className="text-foreground">Nutrition from the ingredients:</strong> calories and
              macros are calculated from the ingredient list. Nutrition filters and badges like High
              Protein only appear when that calculation checks out.
            </li>
            <li>
              <strong className="text-foreground">Human culinary review:</strong> a person reviews recipes
              for technique, seasoning, timing, and whether a crew would actually want to eat them —
              starting with the dishes crews cook most.
            </li>
            <li>
              <strong className="text-foreground">Crew sizing (2–20):</strong> portions and shopping
              lists adjust with head count instead of mental math on a four-person blog recipe.
            </li>
            <li>
              <strong className="text-foreground">Beginner clarity:</strong> pans, approximate times,
              visual cues (golden brown, fork-tender, internal temperature), and when to add each
              ingredient.
            </li>
            <li>
              <strong className="text-foreground">Interruption resilience:</strong> meals that hold,
              reheat, or rebuild after a call without becoming takeout night.
            </li>
            <li>
              <strong className="text-foreground">Station realism:</strong> equipment and ingredients
              that match what firehouses actually own and restock.
            </li>
            <li>
              <strong className="text-foreground">Crew feedback:</strong> what crews save, cook again, and
              tell us helps surface favorites — and flags recipes that need clearer steps.
            </li>
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-border/30 bg-card p-6 sm:p-8 space-y-4">
          <h2 className="font-heading text-xl sm:text-2xl">Shift cooking, not food-blog cooking</h2>
          <p className="text-muted-foreground leading-relaxed">
            A successful firehall dinner feeds the table, cleans up without a disaster, and still
            tastes good when someone gets back late. That is the bar — not plating for photos.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Learn more about the people behind the project on{" "}
            <Link href="/about" className="text-primary hover:underline">
              About Firehall Meals
            </Link>
            , or jump straight into{" "}
            <Link href="/firefighter-meals" className="text-primary hover:underline">
              firefighter meals
            </Link>{" "}
            and{" "}
            <Link href="/crew-meals" className="text-primary hover:underline">
              crew meals
            </Link>
            .
          </p>
          <Button asChild className="btn-tonight mt-2">
            <Link href="/generator">{CTA.findDinner}</Link>
          </Button>
        </section>

        <section className="mt-10 rounded-2xl border border-border/30 bg-card p-6 sm:p-8" aria-labelledby="test-faq">
          <h2 id="test-faq" className="font-heading text-xl sm:text-2xl">
            FAQ
          </h2>
          <dl className="mt-4 space-y-5">
            {FAQS.map((f) => (
              <div key={f.question} className="border-t border-border/30 pt-4 first:border-t-0 first:pt-0">
                <dt className="font-semibold text-foreground">{f.question}</dt>
                <dd className="mt-1 text-muted-foreground leading-relaxed">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <InternalLinkHub title="Explore the catalog" className="mt-10" />
      </main>

      <SiteFooter />
    </div>
  );
}
