import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";
import { HallPrivateBetaNotice } from "@/components/hall/hall-private-beta-notice";

export function HomeHallVote() {
  return (
    <section
      className={cn(app.main, app.sectionY)}
      aria-labelledby="home-hall-section-heading"
      data-testid="home-hall-section"
    >
      <h2 id="home-hall-section-heading" className="sr-only">
        Hall Operations
      </h2>
      <HallPrivateBetaNotice className="mx-auto max-w-xl" />
    </section>
  );
}
