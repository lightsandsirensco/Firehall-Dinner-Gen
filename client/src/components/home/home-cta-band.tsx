import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";
import { CTA, HOME } from "@/lib/brand-copy";

export function HomeCtaBand() {
  return (
    <section className="relative overflow-hidden border-y border-border/25" aria-label="Get started">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 50% 100%, hsl(var(--primary) / 0.25), transparent)",
        }}
        aria-hidden
      />
      <div className={cn(app.main, app.sectionY, "relative text-center fade-up motion-reduce:animate-none")}>
        <h2 className={app.titleSection}>
          {HOME.ctaBandTitle}
        </h2>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
          {HOME.ctaBandBody}
        </p>
        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="h-12 px-8 font-heading font-semibold tracking-wide shadow-lg shadow-primary/20 w-full sm:w-auto"
          >
            <Link href="/generator" data-testid="home-cta-band-generator">
              {CTA.pickTonight}
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 px-8 font-medium w-full sm:w-auto"
          >
            <Link href="/wheel" data-testid="home-cta-band-wheel">
              {HOME.ctaBandSecondary}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
