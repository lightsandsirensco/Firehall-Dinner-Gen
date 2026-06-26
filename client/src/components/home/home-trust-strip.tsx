import { HOME } from "@/lib/brand-copy";

export function HomeTrustStrip() {
  return (
    <section
      className="border-y border-border/25 bg-card/30 backdrop-blur-sm"
      aria-label="Why firefighters trust Firehall Meals"
      data-testid="home-trust-strip"
    >
      <div className="max-w-[1400px] mx-auto px-page py-4 sm:py-5">
        <p
          className="text-center text-sm font-medium text-foreground/80"
          data-testid="home-trust-mobile-line"
        >
          {HOME.trustStrip}
        </p>
      </div>
    </section>
  );
}
