import { Flame } from "lucide-react";
import { LIGHTS_COPY } from "@/lib/lights-and-sirens";
import { LightsAndSirensLink } from "./lights-and-sirens-link";
import { LightsAndSirensCtaRow } from "./lights-and-sirens-cta-row";

export function HomeLightsAuthenticity() {
  return (
    <section
      className="border-y border-border/25 bg-[hsl(0_0%_7%)]"
      aria-labelledby="lights-authenticity-heading"
      data-testid="home-lights-authenticity"
    >
      <div className="max-w-[1400px] mx-auto px-page py-14 sm:py-20">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-primary/90">
            <Flame className="w-4 h-4" aria-hidden />
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em]">
              Firefighter-owned
            </span>
          </div>
          <h2
            id="lights-authenticity-heading"
            className="mt-4 font-heading text-2xl sm:text-3xl md:text-4xl leading-[1.08] tracking-tight text-foreground"
          >
            Built by <LightsAndSirensLink variant="inline">Lights & Sirens Co.</LightsAndSirensLink>
          </h2>
          <p className="mt-5 text-[15px] sm:text-base text-muted-foreground leading-[1.75] max-w-prose">
            {LIGHTS_COPY.authenticityBody}
          </p>
          <LightsAndSirensCtaRow className="mt-8" />
        </div>
      </div>
    </section>
  );
}
