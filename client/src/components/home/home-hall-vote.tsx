import { Link } from "wouter";
import { History, Link2, ListChecks, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HALL_LINKED, HOME } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

const HALL_ICONS = [Link2, ListChecks, Package, History] as const;

export function HomeHallVote() {
  return (
    <section
      className="max-w-[1400px] mx-auto px-page py-10 sm:py-14"
      aria-labelledby="home-hall-section-heading"
      data-testid="home-hall-section"
    >
      <div className="max-w-lg mb-8">
        <h2
          id="home-hall-section-heading"
          className="font-heading text-2xl sm:text-3xl tracking-tight text-foreground"
        >
          {HOME.hallSectionTitle}
        </h2>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
          {HOME.hallSectionLead}
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {HOME.hallSectionFeatures.map(({ title, body }, index) => {
          const Icon = HALL_ICONS[index] ?? Link2;
          return (
            <li
              key={title}
              className={cn(
                "rounded-2xl border border-border/30 bg-card/20 p-5 sm:p-6",
                "transition-[border-color] duration-300 hover:border-primary/20",
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
          <Link href="/hall/join" data-testid="home-hall-connect-cta">
            {HALL_LINKED.connect}
          </Link>
        </Button>
        <Button asChild variant="outline" className="font-medium">
          <Link href="/hall/features">See hall features</Link>
        </Button>
      </div>
    </section>
  );
}
