import { Link } from "wouter";
import { ChevronRight, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { guidePath } from "@shared/editorial/content-schema";

/** Canonical hall classics guide — same ten as the Classics Wheel. */
export const CLASSIC_FIREHALL_MEALS_GUIDE_SLUG = "10-classic-firehall-meals";

export function HomeClassicFirehallMeals() {
  const href = guidePath(CLASSIC_FIREHALL_MEALS_GUIDE_SLUG);

  return (
    <section
      className="max-w-[1400px] mx-auto px-page py-8 sm:py-10"
      aria-labelledby="classic-firehall-meals-heading"
      data-testid="home-classic-firehall-meals"
    >
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6",
          "transition-[border-color,background] duration-200",
          "hover:border-primary/40 hover:bg-primary/10 active:scale-[0.99]",
          "touch-manipulation min-h-[4.5rem]",
        )}
        data-testid="home-classic-firehall-meals-link"
      >
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20"
          aria-hidden
        >
          <Flame className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <h2
            id="classic-firehall-meals-heading"
            className="font-heading text-lg sm:text-xl tracking-tight text-foreground"
          >
            10 Classic Fire Hall Meals
          </h2>
          <p className="mt-1 text-sm text-muted-foreground leading-snug">
            The same ten dinners on the Classics Wheel — jerk, parm, chili, smash burgers, and the rest.
          </p>
        </div>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </section>
  );
}
