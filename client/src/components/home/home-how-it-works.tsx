import { ChefHat, SlidersHorizontal, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { HOME } from "@/lib/brand-copy";

const STEPS = [
  {
    step: "01",
    title: "Pick your crew size",
    body: "Two on duty or twelve at the table — portions follow.",
    icon: Users,
  },
  {
    step: "02",
    title: "Choose your shift needs",
    body: "Time, protein, gear. Keep it simple or open More options.",
    icon: SlidersHorizontal,
  },
  {
    step: "03",
    title: "Get dinner on the table",
    body: "Find a Meal, browse Explore, or spin the Classics Wheel when nobody agrees.",
    icon: ChefHat,
  },
] as const;

export function HomeHowItWorks() {
  return (
    <section
      className="max-w-[1400px] mx-auto px-page py-16 sm:py-24"
      aria-labelledby="how-it-works-heading"
    >
      <div className="max-w-md">
        <h2
          id="how-it-works-heading"
          className="font-heading text-2xl sm:text-4xl leading-[1.05] tracking-tight text-foreground"
        >
          {HOME.howTitle}
        </h2>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">{HOME.howLead}</p>
      </div>

      <ol className="mt-12 grid gap-5 sm:grid-cols-3 sm:gap-6">
        {STEPS.map(({ step, title, body, icon: Icon }) => (
          <li
            key={step}
            className={cn(
              "rounded-2xl border border-border/30 bg-card/20 p-6 sm:p-8",
              "transition-[border-color,transform] duration-300 hover:border-primary/20",
            )}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/90">
              {step}
            </span>
            <div className="mt-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <Icon className="w-5 h-5 text-primary" aria-hidden />
            </div>
            <h3 className="mt-5 font-heading text-xl leading-tight text-foreground">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
