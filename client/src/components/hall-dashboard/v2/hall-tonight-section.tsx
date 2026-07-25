import { useMemo, useState } from "react";
import { Link } from "wouter";
import { HallDashboardSection } from "@/components/hall-dashboard/v2/hall-dashboard-section";
import { HallVoteModal } from "@/components/hall-vote-modal";
import { Button } from "@/components/ui/button";
import { useTonightHub } from "@/hooks/use-tonight-hub";
import { buildDefaultHallVoteRecipes } from "@/lib/hall-vote-recipes";
import { TONIGHT_HUB } from "@/lib/brand-copy";

type DinnerPrimary =
  | { kind: "cook"; href: string; label: string }
  | { kind: "vote"; href: string; label: string }
  | { kind: "open-recipe"; href: string; label: string }
  | { kind: "pick"; href: string; label: string };

/**
 * "What's for dinner?" — one primary next action, not three equal CTAs.
 */
export function HallTonightSection({ className }: { className?: string }) {
  const hub = useTonightHub();
  const [voteOpen, setVoteOpen] = useState(false);
  const voteRecipes = useMemo(() => buildDefaultHallVoteRecipes(), []);

  const dinnerLine =
    hub.tonightPick?.title ?? hub.cookTitle ?? hub.lastGenerated?.title ?? null;

  const primary: DinnerPrimary = useMemo(() => {
    if (hub.cookHref) {
      return {
        kind: "cook",
        href: `${hub.cookHref}?cook=1`,
        label: TONIGHT_HUB.actions.continueCooking,
      };
    }
    if (hub.voteOpen && hub.voteHref) {
      return {
        kind: "vote",
        href: hub.voteHref,
        label: TONIGHT_HUB.actions.viewVote,
      };
    }
    if (hub.tonightRecipeHref) {
      return {
        kind: "open-recipe",
        href: `${hub.tonightRecipeHref}?cook=1`,
        label: TONIGHT_HUB.actions.continueCooking,
      };
    }
    return {
      kind: "pick",
      href: "/generator",
      label: TONIGHT_HUB.actions.pickMeal,
    };
  }, [hub.cookHref, hub.voteOpen, hub.voteHref, hub.tonightRecipeHref]);

  const showPickSecondary = primary.kind !== "pick";
  const showVoteSecondary = primary.kind !== "vote";
  const showCookSecondary =
    primary.kind !== "cook" &&
    primary.kind !== "open-recipe" &&
    Boolean(hub.cookHref || hub.tonightRecipeHref);

  return (
    <HallDashboardSection
      id="hall-tonight"
      title="What's for dinner?"
      className={className}
      testId="hall-tonight-section"
    >
      {dinnerLine ? (
        <p className="mb-1 text-base font-semibold leading-snug text-foreground">{dinnerLine}</p>
      ) : (
        <p className="mb-3 text-sm text-muted-foreground">
          No dinner set yet — pick a meal for the crew.
        </p>
      )}

      {hub.voteStatusText && primary.kind !== "vote" ? (
        <p className="mb-3 text-sm text-muted-foreground">{hub.voteStatusText}</p>
      ) : null}

      <div className="grid gap-2">
        <Button asChild className="min-h-11 w-full" data-testid="hall-dinner-primary">
          <Link href={primary.href}>{primary.label}</Link>
        </Button>

        {(showPickSecondary || showVoteSecondary || showCookSecondary) && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-1 pt-0.5">
            {showPickSecondary ? (
              <Link
                href="/generator"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline touch-manipulation min-h-8 inline-flex items-center"
              >
                {TONIGHT_HUB.actions.pickMeal}
              </Link>
            ) : null}
            {showVoteSecondary ? (
              <button
                type="button"
                onClick={() => setVoteOpen(true)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline touch-manipulation min-h-8"
                data-testid="hall-home-start-vote"
              >
                {TONIGHT_HUB.actions.startVote}
              </button>
            ) : null}
            {showCookSecondary && (hub.cookHref || hub.tonightRecipeHref) ? (
              <Link
                href={`${hub.cookHref ?? hub.tonightRecipeHref}?cook=1`}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline touch-manipulation min-h-8 inline-flex items-center"
              >
                {TONIGHT_HUB.actions.continueCooking}
              </Link>
            ) : null}
          </div>
        )}
      </div>

      <HallVoteModal
        open={voteOpen}
        onOpenChange={setVoteOpen}
        recipes={voteRecipes}
        source="tonight_hub"
      />
    </HallDashboardSection>
  );
}
