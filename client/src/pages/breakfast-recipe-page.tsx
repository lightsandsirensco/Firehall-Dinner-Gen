import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Sunrise } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getSavedCount } from "@/lib/saved-meals";
import { fetchBreakfastRecipePage } from "@/lib/breakfast-api";
import { FoodImage } from "@/components/mobile/food-image";
import { cn } from "@/lib/utils";
import { RecipeBrandStrip } from "@/components/brand/recipe-brand-strip";
import { SiteFooter } from "@/components/site-footer";

export default function BreakfastRecipePage() {
  const [, params] = useRoute("/breakfast/:slug");
  const slug = String(params?.slug || "").trim();
  const favCount = useMemo(() => getSavedCount(), []);

  const { data: page, isLoading, error } = useQuery({
    queryKey: ["breakfast-page", slug],
    queryFn: () => fetchBreakfastRecipePage(slug),
    enabled: Boolean(slug),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background flex flex-col">
      <SiteHeader activePage="breakfast" favCount={favCount} />
      <main className="max-w-[980px] mx-auto px-page pt-8 pb-8 sm:pt-10 flex-1" id="main-content">
        <div className="flex items-center justify-between gap-3">
          <Link href="/breakfast" className="text-sm font-medium text-primary hover:underline">
            ← Breakfast
          </Link>
          <div className="flex items-center gap-2 text-amber-400/90">
            <Sunrise className="w-4 h-4" aria-hidden />
            <span className="text-[11px] uppercase tracking-widest">Station Breakfast</span>
          </div>
        </div>

        {isLoading && (
          <div className="mt-8 rounded-2xl border border-border/20 bg-card/20 p-5 text-sm text-muted-foreground">
            Loading breakfast recipe…
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-950/20 p-5 text-sm text-red-200">
            Couldn’t load this breakfast recipe.
          </div>
        )}

        {page && (
          <>
            <h1 className="mt-6 font-heading tracking-tight text-3xl sm:text-4xl leading-[1.08]">
              {page.title}
            </h1>
            <p className="mt-3 text-muted-foreground leading-relaxed max-w-2xl">{page.subtitle}</p>

            <div className="mt-7 relative -mx-page sm:mx-0 rounded-none sm:rounded-2xl overflow-hidden border border-border/20">
              <FoodImage
                src={page.heroImage}
                alt={page.imageAlt || page.title}
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

            <p className="mt-6 text-[15px] sm:text-[16px] leading-relaxed text-foreground/90 max-w-3xl">
              {page.description}
            </p>

            <section className="mt-9 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border/20 bg-card/25 p-4">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Time</p>
                <p className="mt-1 text-sm font-medium">{page.totalTime} min</p>
              </div>
              <div className="rounded-2xl border border-border/20 bg-card/25 p-4">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Crew size</p>
                <p className="mt-1 text-sm font-medium">{page.crewSize} firefighters</p>
              </div>
              <div className="rounded-2xl border border-border/20 bg-card/25 p-4">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Difficulty</p>
                <p className="mt-1 text-sm font-medium">{page.difficulty}</p>
              </div>
            </section>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8">
              <section aria-labelledby="ingredients">
                <h2 id="ingredients" className="font-heading text-xl">
                  Ingredients
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {page.ingredients.map((ing, idx) => (
                    <li
                      key={`${ing.name}-${idx}`}
                      className={cn(
                        "rounded-xl border border-border/20 bg-card/15 px-3.5 py-2.5 text-sm leading-snug",
                        ing.optional && "opacity-90",
                      )}
                    >
                      <span className="font-medium">
                        {[ing.quantity, ing.unit].filter(Boolean).join(" ")}
                      </span>{" "}
                      {ing.quantity || ing.unit ? "· " : ""}
                      {ing.name}
                      {ing.notes ? <span className="text-muted-foreground"> — {ing.notes}</span> : null}
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="steps">
                <h2 id="steps" className="font-heading text-xl">
                  Steps
                </h2>
                <ol className="mt-4 space-y-3.5">
                  {page.steps
                    .slice()
                    .sort((a, b) => a.stepNumber - b.stepNumber)
                    .map((s) => (
                      <li key={s.stepNumber} className="rounded-2xl border border-border/20 bg-card/15 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium">
                            <span className="text-muted-foreground mr-2">{s.stepNumber}.</span>
                            {s.title}
                          </p>
                          {(s.minutes || s.tempF) && (
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                              {s.tempF ? `${s.tempF}°F` : ""}
                              {s.tempF && s.minutes ? " · " : ""}
                              {s.minutes ? `${s.minutes} min` : ""}
                            </p>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-foreground/90">{s.instruction}</p>
                      </li>
                    ))}
                </ol>
              </section>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
              <section className="rounded-2xl border border-border/20 bg-card/15 p-4">
                <h3 className="font-heading text-base">Station workflow</h3>
                <ul className="mt-2 text-sm text-foreground/90 space-y-1.5">
                  {page.stationWorkflow.map((x, i) => (
                    <li key={i}>- {x}</li>
                  ))}
                </ul>
              </section>
              <section className="rounded-2xl border border-border/20 bg-card/15 p-4">
                <h3 className="font-heading text-base">Cleanup</h3>
                <ul className="mt-2 text-sm text-foreground/90 space-y-1.5">
                  {page.cleanupNotes.map((x, i) => (
                    <li key={i}>- {x}</li>
                  ))}
                </ul>
              </section>
              <section className="rounded-2xl border border-border/20 bg-card/15 p-4">
                <h3 className="font-heading text-base">Leftovers</h3>
                <ul className="mt-2 text-sm text-foreground/90 space-y-1.5">
                  {page.leftovers.map((x, i) => (
                    <li key={i}>- {x}</li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}
      </main>
      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}

