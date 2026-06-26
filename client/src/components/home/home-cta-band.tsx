import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CTA, HOME } from "@/lib/brand-copy";

export function HomeCtaBand() {
  return (
    <section className="relative overflow-hidden border-y border-border/25" aria-label="Get started">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 50% 100%, hsl(0 72% 28% / 0.25), transparent)",
        }}
        aria-hidden
      />
      <div className="relative max-w-[1400px] mx-auto px-page py-14 sm:py-16 text-center">
        <h2 className="font-heading text-2xl sm:text-3xl tracking-tight text-foreground">
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
