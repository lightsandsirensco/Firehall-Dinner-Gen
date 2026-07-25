import { HallPrivateBetaNotice } from "@/components/hall/hall-private-beta-notice";

export function HomeHallVote() {
  return (
    <section
      className="max-w-[1400px] mx-auto px-page py-10 sm:py-14"
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
