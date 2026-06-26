import { useEffect } from "react";
import { Link } from "wouter";
import { History, Smartphone } from "lucide-react";
import { HallShell } from "@/components/hall/hall-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HallHistoryTimeline } from "@/components/hall-history/hall-history-timeline";
import { useHallHistory } from "@/hooks/use-hall-history";
import { useHallProfile } from "@/hooks/use-hall-profile";
import { useHallMembership } from "@/lib/hall-membership/context";
import { useHallFeature } from "@/lib/billing/hooks";
import { HALL_HISTORY } from "@/lib/brand-copy";
import { trackHallHistoryViewed } from "@/lib/analytics";

const CREW_SIZES = [4, 6, 8, 10, 12, 14] as const;

export default function HallHistoryPage() {
  const { activeHallId } = useHallMembership();
  const hasCrewCloudHistory = useHallFeature("hall_history", activeHallId);
  const { profile, updateProfile } = useHallProfile();
  const { entries, recentlyCooked, wheelResults, hallVotes } = useHallHistory();

  useEffect(() => {
    trackHallHistoryViewed({ entry_count: entries.length });
  }, [entries.length]);

  const generated = entries.filter((e) => e.type === "meal_generated").slice(0, 8);

  return (
    <HallShell title={HALL_HISTORY.title} testId="hall-history-page">
      <div className="space-y-8">
        <div
        className="rounded-xl border border-border/40 bg-muted/25 px-4 py-3 flex gap-3"
        data-testid="hall-history-device-note"
      >
        <Smartphone className="w-5 h-5 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
        <p className="text-sm text-muted-foreground">{HALL_HISTORY.deviceNote}</p>
      </div>

        <section
          className="mb-8 rounded-xl border border-border/40 bg-card/20 p-4 sm:p-5"
          aria-labelledby="hall-profile-heading"
        >
          <h2 id="hall-profile-heading" className="text-sm font-semibold text-foreground mb-4">
            Hall profile
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hall-name">{HALL_HISTORY.profileHallName}</Label>
              <Input
                id="hall-name"
                value={profile.hallName ?? ""}
                placeholder="Station 12"
                onChange={(e) => updateProfile({ hallName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-label">{HALL_HISTORY.profileShift}</Label>
              <Input
                id="shift-label"
                value={profile.shiftLabel ?? ""}
                placeholder="A Shift"
                onChange={(e) => updateProfile({ shiftLabel: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">{HALL_HISTORY.profileHint}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label>{HALL_HISTORY.profileCrewSize}</Label>
            <div className="flex flex-wrap gap-2">
              {CREW_SIZES.map((size) => (
                <Button
                  key={size}
                  type="button"
                  size="sm"
                  variant={profile.defaultCrewSize === size ? "default" : "outline"}
                  onClick={() => updateProfile({ defaultCrewSize: size })}
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-8" aria-labelledby="recently-cooked-page-heading">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-primary" aria-hidden />
            <h2 id="recently-cooked-page-heading" className="font-heading text-lg">
              {HALL_HISTORY.recentlyCooked}
            </h2>
          </div>
          <HallHistoryTimeline
            entries={recentlyCooked}
            emptyMessage={HALL_HISTORY.empty}
          />
        </section>

        {wheelResults.length > 0 && (
          <section className="mb-8" aria-labelledby="wheel-results-heading">
            <h2 id="wheel-results-heading" className="font-heading text-lg mb-3">
              {HALL_HISTORY.wheelResults}
            </h2>
            <HallHistoryTimeline entries={wheelResults} />
          </section>
        )}

        {hallVotes.length > 0 && (
          <section className="mb-8" aria-labelledby="hall-votes-heading">
            <h2 id="hall-votes-heading" className="font-heading text-lg mb-3">
              {HALL_HISTORY.hallVotes}
            </h2>
            <HallHistoryTimeline entries={hallVotes} />
          </section>
        )}

        {generated.length > 0 && (
          <section className="mb-8" aria-labelledby="generated-heading">
            <h2 id="generated-heading" className="font-heading text-lg mb-3">
              {HALL_HISTORY.generatedMeals}
            </h2>
            <HallHistoryTimeline entries={generated} />
          </section>
        )}

        <p className="text-sm text-muted-foreground text-center">
          <Link href="/generator" className="text-primary hover:underline font-medium">
            Find a Meal
          </Link>
          {" · "}
          <Link href="/explore" className="text-primary hover:underline">
            Browse recipes
          </Link>
          {" · "}
          <Link href="/me/history" className="text-primary hover:underline">
            Personal meal history
          </Link>
        </p>

        {activeHallId && !hasCrewCloudHistory ? (
          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            Crew cloud meal log (shared across hall members) unlocks with Hall Pro.
          </p>
        ) : null}
      </div>
    </HallShell>
  );
}
