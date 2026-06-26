import { useMemo, useRef } from "react";
import { Link } from "wouter";
import { HallVoteFlow } from "@/components/hall-vote-flow";
import { buildDefaultHallVoteRecipes } from "@/lib/hall-vote-recipes";
import { HALL_LINKED, HOME } from "@/lib/brand-copy";

export function HomeHallVote() {
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const voteRecipes = useMemo(() => buildDefaultHallVoteRecipes(), []);

  return (
    <section
      className="max-w-[1400px] mx-auto px-page py-8 sm:py-12"
      aria-labelledby="home-hall-connect-heading"
      data-testid="home-hall-vote"
    >
      <div className="mb-6 max-w-lg">
        <h2
          id="home-hall-connect-heading"
          className="font-heading text-xl sm:text-2xl tracking-tight text-foreground"
        >
          {HOME.hallConnectTitle}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{HOME.hallConnectLead}</p>
        <Link href="/hall/join" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
          {HALL_LINKED.connect} →
        </Link>
      </div>

      <HallVoteFlow
        recipes={voteRecipes}
        source="homepage"
        variant="banner"
        bannerRef={bannerRef}
      />
    </section>
  );
}
