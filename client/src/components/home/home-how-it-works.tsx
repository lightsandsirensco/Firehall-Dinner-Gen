import { ListChecks, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";
import { HOME } from "@/lib/brand-copy";

const STEP_ICONS = [Sparkles, Users, ListChecks] as const;

export function HomeHowItWorks() {
  return (
    <section
      className={cn(app.main, app.sectionY)}
      aria-labelledby="how-it-works-heading"
    >
      <div className="max-w-lg fade-up motion-reduce:animate-none">
        <h2 id="how-it-works-heading" className={app.titleSection}>
          {HOME.howTitle}
        </h2>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">{HOME.howLead}</p>
      </div>

      <ol className={cn("mt-8 grid gap-4 sm:grid-cols-3 sm:gap-5", app.stagger)}>
        {HOME.howSteps.map(({ step, title, body }, index) => {
          const Icon = STEP_ICONS[index] ?? Sparkles;
          return (
            <li
              key={step}
              className={cn(
                "rounded-2xl border border-border/30 bg-card/20 p-6 sm:p-8",
                "transition-[border-color,transform,box-shadow] duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-black/20",
              )}
            >
              <span className={app.eyebrowAccent}>
                {step}
              </span>
              <div className="mt-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
                <Icon className="w-5 h-5 text-primary" aria-hidden />
              </div>
              <h3 className={cn(app.titleCard, "mt-5")}>{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
