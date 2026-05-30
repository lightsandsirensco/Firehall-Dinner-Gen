import { useMemo } from "react";
import { Link } from "wouter";
import { Sunrise } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { InternalLinkHub } from "@/components/seo/internal-link-hub";
import { FoodImage } from "@/components/mobile/food-image";
import { RecipeBrandStrip } from "@/components/brand/recipe-brand-strip";
import { RecipeNutritionPanel } from "@/components/recipe-nutrition-panel";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { buildFirefighterRedLeadRecipeSeo } from "@shared/seo/metadata";
import {
  FIREFIGHTER_RED_LEAD_BREAKFAST_LINKS,
  FIREFIGHTER_RED_LEAD_CLASSIC_LINKS,
  FIREFIGHTER_RED_LEAD_FAQS,
  FIREFIGHTER_RED_LEAD_RECIPE,
  FIREFIGHTER_RED_LEAD_SERVING_SUGGESTIONS,
} from "@shared/seo/firefighter-red-lead-recipe-data";
import {
  buildBreadcrumbListSchema,
  buildFaqPageSchema,
  buildOrganizationSchema,
  buildStandaloneRecipeSchema,
  buildWebSiteSchema,
} from "@shared/seo/schema";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { BRAND_TAGLINE } from "@/lib/brand-copy";
import { useMeasurementSystem } from "@/components/measurement-unit-toggle";
import { RecipeMeasurementBar } from "@/components/recipe-measurement-bar";
import {
  formatIngredientAmount,
  formatStepTemperature,
  formatTemperaturesInText,
  type MeasurementSystem,
} from "@shared/measurements";
import { RedLeadPdfCapture } from "@/components/red-lead/red-lead-pdf-capture";

function formatIngredient(
  ing: (typeof FIREFIGHTER_RED_LEAD_RECIPE.ingredients)[number],
  system: MeasurementSystem,
) {
  const qty = formatIngredientAmount(ing.quantity, ing.unit, system);
  const base = qty ? `${qty} ${ing.name}` : ing.name;
  const notes = [ing.notes, ing.optional ? "optional" : undefined].filter(Boolean).join(", ");
  return notes ? `${base} (${notes})` : base;
}

export default function FirefighterRedLeadRecipePage() {
  const recipe = FIREFIGHTER_RED_LEAD_RECIPE;
  const origin = getSiteOrigin();
  const [measurementSystem] = useMeasurementSystem();
  const seoConfig = useMemo(() => buildFirefighterRedLeadRecipeSeo(), []);

  const jsonLd = useMemo(
    () => [
      buildOrganizationSchema(origin),
      buildWebSiteSchema(origin),
      buildBreadcrumbListSchema(origin, [
        { name: "Home", path: "/" },
        { name: "Breakfast", path: "/breakfast" },
        { name: "Firefighter Red Lead Recipe", path: recipe.path },
      ]),
      buildStandaloneRecipeSchema(origin, {
        path: recipe.path,
        title: recipe.h1,
        description: recipe.description,
        heroImage: recipe.heroImage,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        crewSize: recipe.crewSize,
        recipeCategory: recipe.recipeCategory,
        recipeCuisine: recipe.recipeCuisine,
        tags: [...recipe.tags],
        ingredients: [...recipe.ingredients],
        steps: [...recipe.steps],
        nutrition: recipe.nutrition,
        generatedAt: recipe.generatedAt,
      }),
      buildFaqPageSchema(FIREFIGHTER_RED_LEAD_FAQS),
    ],
    [origin, recipe],
  );

  usePageSeo(seoConfig, jsonLd);

  return (
    <div className={cn(app.page, "flex flex-col pb-safe-nav min-h-screen min-h-[100dvh]")}>
      <SiteHeader activePage="breakfast" />

      <main className={cn(app.main, "py-8 sm:py-12 flex-1")} id="main-content">
        <SeoBreadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Breakfast", path: "/breakfast" },
            { name: "Firefighter Red Lead Recipe", path: recipe.path },
          ]}
        />

        <div className="mt-6 flex items-center gap-2 text-amber-400/90">
          <Sunrise className="w-4 h-4" aria-hidden />
          <span className="text-[11px] uppercase tracking-widest">Firehall Breakfast Tradition</span>
        </div>

        <p className={cn(app.eyebrowMuted, "mt-4")}>{BRAND_TAGLINE}</p>
        <h1 className={cn(app.titlePage, "mt-3")}>{recipe.h1}</h1>
        <p className={cn(app.lead, "mt-4 max-w-3xl")}>{recipe.intro}</p>

        <div className="mt-8 relative -mx-page sm:mx-0 rounded-none sm:rounded-2xl overflow-hidden border border-border/20">
          <FoodImage
            src={recipe.heroImage}
            alt={recipe.heroImageAlt}
            layout="card-fill"
            fit="cover"
            focal="banner"
            overlay="cinematic"
            priority
            cinematicGrade
            rounded="none"
            className="aspect-[16/12] sm:aspect-[2.2/1] max-h-[min(52vh,520px)]"
          />
        </div>

        <RecipeBrandStrip className="mt-5" />

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-border/20 bg-card/25 p-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Prep</p>
            <p className="mt-1 text-sm font-medium">{recipe.prepTime} min</p>
          </div>
          <div className="rounded-2xl border border-border/20 bg-card/25 p-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Cook</p>
            <p className="mt-1 text-sm font-medium">{recipe.cookTime} min</p>
          </div>
          <div className="rounded-2xl border border-border/20 bg-card/25 p-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Crew size</p>
            <p className="mt-1 text-sm font-medium">{recipe.crewSize} firefighters</p>
          </div>
          <div className="rounded-2xl border border-border/20 bg-card/25 p-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Difficulty</p>
            <p className="mt-1 text-sm font-medium capitalize">{recipe.difficulty}</p>
          </div>
        </div>

        <RecipeMeasurementBar className="mt-6">
          <p className="text-sm text-muted-foreground">
            Crew size:{" "}
            <span className="font-medium text-foreground">{recipe.crewSize} firefighters</span>
          </p>
        </RecipeMeasurementBar>

        <RecipeNutritionPanel
          calories={recipe.nutrition.calories}
          protein={recipe.nutrition.protein}
          carbs={recipe.nutrition.carbs}
          fat={recipe.nutrition.fat}
          className="mt-6"
        />

        <div className="mt-12 lg:grid lg:grid-cols-[1fr_320px] lg:gap-10">
          <article className="min-w-0">
            {recipe.tradition.map((section) => (
              <section key={section.heading} className="mt-10 first:mt-0">
                <h2 className="font-heading text-xl sm:text-2xl text-foreground">{section.heading}</h2>
                <div className="mt-4 space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 48)}>{formatTemperaturesInText(p)}</p>
                  ))}
                </div>
              </section>
            ))}

            <section className="mt-12" aria-labelledby="red-lead-ingredients-heading">
              <h2
                id="red-lead-ingredients-heading"
                className="font-heading text-xl sm:text-2xl text-foreground"
              >
                Ingredients (tomato Red Lead sauce)
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-3xl">
                Scaled for a hall table of {recipe.crewSize}. Read through once before you start the rest
                of the breakfast — timing matters when the crew is actually sitting down.
              </p>
              <ul className="mt-5 space-y-2 text-sm sm:text-base">
                {recipe.ingredients.map((ing) => (
                  <li key={ing.name} className="flex gap-2">
                    <span className="text-primary shrink-0" aria-hidden>
                      •
                    </span>
                    <span>{formatIngredient(ing, measurementSystem)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-12" aria-labelledby="red-lead-steps-heading">
              <h2 id="red-lead-steps-heading" className="font-heading text-xl sm:text-2xl text-foreground">
                Step-by-step recipe (beginner-friendly)
              </h2>
              <ol className="mt-6 space-y-8">
                {recipe.steps.map((step) => (
                  <li key={step.stepNumber} className="flex gap-4">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary"
                      aria-hidden
                    >
                      {step.stepNumber}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground">{step.title}</h3>
                      <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
                        {formatTemperaturesInText(step.instruction)}
                      </p>
                      {(step.minutes || step.tempF) && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {step.minutes ? `~${step.minutes} min` : null}
                          {step.minutes && step.tempF ? " · " : null}
                          {step.tempF
                            ? `Target ${formatStepTemperature(step.tempF)} on whites`
                            : null}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <RedLeadPdfCapture className="mt-12" />

            <section className="mt-12" aria-labelledby="red-lead-serving-heading">
              <h2 id="red-lead-serving-heading" className="font-heading text-xl sm:text-2xl text-foreground">
                Serve as part of a full firehall breakfast
              </h2>
              <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-3xl">
                Red Lead is the tomato-and-egg cast iron at the center of the table — not the whole meal.
                Set out the sides below on their own platters and bowls so the crew serves themselves while
                coffee stays hot and nobody eats standing up.
              </p>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                {FIREFIGHTER_RED_LEAD_SERVING_SUGGESTIONS.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-border/25 bg-card/15 p-4"
                  >
                    <dt className="font-medium text-foreground">{item.title}</dt>
                    <dd className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {formatTemperaturesInText(item.body)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="mt-12" aria-labelledby="red-lead-breakfast-links-heading">
              <h2
                id="red-lead-breakfast-links-heading"
                className="font-heading text-xl sm:text-2xl text-foreground"
              >
                More firehall breakfast recipes
              </h2>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {FIREFIGHTER_RED_LEAD_BREAKFAST_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="block rounded-xl border border-border/30 bg-card/20 px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <span className="font-medium text-primary">{link.label}</span>
                      {link.description && (
                        <span className="block text-xs text-muted-foreground mt-1">{link.description}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-12" aria-labelledby="red-lead-classics-heading">
              <h2 id="red-lead-classics-heading" className="font-heading text-xl sm:text-2xl text-foreground">
                Firehall classics for dinner shift
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {FIREFIGHTER_RED_LEAD_CLASSIC_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex px-3 py-1.5 rounded-full text-xs font-medium bg-muted/50 text-foreground hover:bg-muted transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-12" aria-labelledby="red-lead-faq-heading">
              <h2 id="red-lead-faq-heading" className="font-heading text-xl sm:text-2xl text-foreground">
                Red Lead FAQ
              </h2>
              <dl className="mt-6 space-y-6">
                {FIREFIGHTER_RED_LEAD_FAQS.map((item) => (
                  <div key={item.question}>
                    <dt className="font-medium text-foreground">{item.question}</dt>
                    <dd className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </article>

          <div className="mt-10 lg:mt-0">
            <InternalLinkHub title="Explore Firehall Meals" />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
