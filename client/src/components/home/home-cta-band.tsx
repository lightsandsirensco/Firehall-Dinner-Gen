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
        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-sm mx-auto">
          {HOME.ctaBandBody}
        </p>
        <Button
          asChild
          size="lg"
          className="mt-7 h-12 px-8 font-heading uppercase tracking-[0.1em] text-xs shadow-lg shadow-primary/20"
        >
          <Link href="/generator" data-testid="home-cta-band-generator">
            {CTA.findDinner}
          </Link>
        </Button>
      </div>
    </section>
  );
}
