import { Link } from "wouter";
import { CheckCircle2, Home, Link2, ListChecks, History } from "lucide-react";
import { cn } from "@/lib/utils";
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
      <div className="max-w-[1400px] mx-auto px-page py-10 sm:py-14">
        <div className="max-w-lg mb-8">
          <h2
            id="why-firefighters-heading"
            className="font-heading text-2xl sm:text-3xl leading-tight tracking-tight text-foreground"
          >
            {HOME.whyTitle}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
            {HOME.whyLead}
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HOME.whyBenefits.map(({ title, body }, index) => {
            const Icon = BENEFIT_ICONS[index] ?? CheckCircle2;
            const isLast = index === HOME.whyBenefits.length - 1;
            return (
              <li
                key={title}
                className={cn(
                  "rounded-2xl border border-border/30 bg-background/40 p-5 sm:p-6",
                  "transition-[border-color] duration-300 hover:border-primary/20",
                  isLast && "sm:col-span-2 lg:col-span-1",
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
                  <Icon className="w-5 h-5 text-primary" aria-hidden />
                </div>
                <h3 className="mt-4 font-heading text-lg text-foreground">{title}</h3>
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
