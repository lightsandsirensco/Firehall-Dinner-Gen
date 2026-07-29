import { Link } from "wouter";
import { CheckCircle2, Home, Link2, ListChecks, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";
import { CTA, HALL_LINKED, HOME } from "@/lib/brand-copy";
import { Button } from "@/components/ui/button";

const BENEFIT_ICONS = [CheckCircle2, Home, ListChecks, Link2, History] as const;

export function HomeWhyCrews() {
  return (
    <section
      className="border-y border-border/20 bg-card/15"
      aria-labelledby="why-firefighters-heading"
      data-testid="home-why-firefighters"
    >
      <div className={cn(app.main, app.sectionY)}>
        <div className="max-w-lg mb-8 fade-up motion-reduce:animate-none">
          <h2 id="why-firefighters-heading" className={app.titleSection}>
            {HOME.whyTitle}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
            {HOME.whyLead}
          </p>
        </div>

        <ul className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", app.stagger)}>
          {HOME.whyBenefits.map(({ title, body }, index) => {
            const Icon = BENEFIT_ICONS[index] ?? CheckCircle2;
            const isLast = index === HOME.whyBenefits.length - 1;
            return (
              <li
                key={title}
                className={cn(
                  "rounded-2xl border border-border/30 bg-background/40 p-5 sm:p-6",
                  "transition-[border-color,box-shadow] duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-black/20",
                  isLast && "sm:col-span-2 lg:col-span-2",
                )}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
                  <Icon className="w-5 h-5 text-primary" aria-hidden />
                </div>
                <h3 className={cn(app.titleCard, "mt-4")}>{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button asChild className="font-heading font-semibold tracking-wide">
            <Link href="/generator">{CTA.pickTonight}</Link>
          </Button>
          <Button asChild variant="outline" className="font-medium">
            <Link href="/explore">{CTA.exploreMeals}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
