import { useMemo, useState } from "react";
import {
  ChefHat,
  Coffee,
  ListChecks,
  Sparkles,
  Vote,
} from "lucide-react";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { HallOnboardingSteps } from "@/components/hall-activation/hall-onboarding-steps";
import { HallVoteModal } from "@/components/hall-vote-modal";
import { SiteFooter } from "@/components/site-footer";
import { TonightActionRow } from "@/components/tonight/tonight-action-row";
import { TonightSectionCard } from "@/components/tonight/tonight-section-card";
import { Button } from "@/components/ui/button";
import { useTonightHub } from "@/hooks/use-tonight-hub";
import { buildDefaultHallVoteRecipes } from "@/lib/hall-vote-recipes";
import { HALL_CANTEEN, TONIGHT_HUB } from "@/lib/brand-copy";
import { HALL_CANTEEN_STATUS_LABELS } from "@shared/hall-canteen/types";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export default function TonightPage() {
  const [voteOpen, setVoteOpen] = useState(false);
  const voteRecipes = useMemo(() => buildDefaultHallVoteRecipes(), []);
  const hub = useTonightHub();
  const showOnboarding = useMemo(
    () => new URLSearchParams(window.location.search).get("onboarding") === "1",
    [],
  );

  const sessionHint = hub.lastGenerated?.title
    ? hub.lastGenerated.title
    : TONIGHT_HUB.hints.continueSession;

  const cookContinueHint = hub.cookTitle ? hub.cookTitle : TONIGHT_HUB.hints.noRecipe;
  const recipeHint = hub.tonightPick?.title ?? TONIGHT_HUB.hints.noRecipe;

  const listHint = hub.shoppingLoading
    ? "Loading list…"
    : TONIGHT_HUB.hints.listItems(hub.pendingItems);

  const runnerHint = hub.runnerName
    ? TONIGHT_HUB.hints.runnerAssigned(hub.runnerName)
    : TONIGHT_HUB.hints.runnerUnassigned;

  return (
    <div className={cn(app.page, "bg-background")} data-testid="tonight-page">
      <AppTopBar title={TONIGHT_HUB.title} />

      <main className={cn(app.mobileScreen, app.main)}>
        {showOnboarding ? <HallOnboardingSteps current={3} /> : null}
        <header className="space-y-1 px-0.5 pb-1">
          <p className={cn(app.subtitle, "text-foreground/80")}>{TONIGHT_HUB.tagline}</p>
        </header>

        <TonightSectionCard
          title={TONIGHT_HUB.sections.meal}
          icon={Sparkles}
          testId="tonight-section-meal"
        >
          <TonightActionRow
            href="/generator"
            label={TONIGHT_HUB.actions.pickMeal}
            hint="Hall Match for your crew"
            testId="tonight-pick-meal"
          />
          <TonightActionRow
            href="/wheel"
            label={TONIGHT_HUB.actions.spinWheel}
            hint="Let the wheel decide"
            testId="tonight-spin-wheel"
          />
          <TonightActionRow
            href={hub.lastGeneratedHref ?? "/generator"}
            label={TONIGHT_HUB.actions.continueSession}
            hint={sessionHint}
            testId="tonight-continue-session"
          />
        </TonightSectionCard>

        <TonightSectionCard title={TONIGHT_HUB.sections.vote} icon={Vote} testId="tonight-section-vote">
          <TonightActionRow
            label={TONIGHT_HUB.actions.startVote}
            hint="Let the crew pick dinner together"
            onClick={() => setVoteOpen(true)}
            testId="tonight-start-vote"
          />
          {hub.voteLoading ? (
            <TonightActionRow label="Checking vote…" status testId="tonight-vote-loading" />
          ) : (
            <TonightActionRow
              href={hub.voteHref}
              label={hub.voteHref ? TONIGHT_HUB.actions.viewVote : TONIGHT_HUB.actions.voteStatus}
              hint={hub.voteStatusText}
              onClick={!hub.voteHref ? () => setVoteOpen(true) : undefined}
              testId="tonight-view-vote"
            />
          )}
        </TonightSectionCard>

        <TonightSectionCard
          title={TONIGHT_HUB.sections.shopping}
          icon={ListChecks}
          testId="tonight-section-shopping"
        >
          {hub.hallId && !hub.canUseShoppingList ? (
            <TonightActionRow
              href="/plans"
              label="Shared shopping list"
              hint="Hall Pro — ask your captain or upgrade"
              testId="tonight-shopping-pro"
            />
          ) : (
            <>
          <TonightActionRow
            href={hub.shoppingHref}
            label={TONIGHT_HUB.actions.viewList}
            hint={hub.hallId ? listHint : TONIGHT_HUB.hints.noHall}
            testId="tonight-view-list"
          />
          <TonightActionRow
            href={hub.runnerHref}
            label={TONIGHT_HUB.actions.assignRunner}
            hint={hub.hallId ? runnerHint : TONIGHT_HUB.hints.noHall}
            disabled={!hub.hallId}
            testId="tonight-assign-runner"
          />
            </>
          )}
        </TonightSectionCard>

        <TonightSectionCard title={TONIGHT_HUB.sections.cook} icon={ChefHat} testId="tonight-section-cook">
          <TonightActionRow
            href={hub.cookHref ? `${hub.cookHref}?cook=1` : "/generator"}
            label={TONIGHT_HUB.actions.continueCooking}
            hint={cookContinueHint}
            testId="tonight-continue-cooking"
          />
          <TonightActionRow
            href={hub.tonightRecipeHref ?? "/generator"}
            label={TONIGHT_HUB.actions.openRecipe}
            hint={recipeHint}
            testId="tonight-open-recipe"
          />
        </TonightSectionCard>

        <TonightSectionCard
          title={TONIGHT_HUB.sections.needAnything}
          icon={Coffee}
          testId="tonight-section-need-anything"
        >
          {!hub.hallId ? (
            <TonightActionRow
              href="/hall/join"
              label={HALL_CANTEEN.viewCanteen}
              hint={TONIGHT_HUB.hints.noHall}
              testId="tonight-need-anything-join"
            />
          ) : hub.canteenLoading ? (
            <TonightActionRow label="Loading staples…" status testId="tonight-need-anything-loading" />
          ) : hub.needsAttention.length === 0 ? (
            <TonightActionRow
              href="/hall/canteen"
              label={TONIGHT_HUB.hints.allStocked}
              hint="Tap to update Hall Staples"
              testId="tonight-need-anything-empty"
            />
          ) : (
            <>
              {hub.needsAttention.slice(0, 3).map((item) => (
                <div
                  key={item.item_id}
                  className="flex items-center gap-2 px-4 py-3 min-h-[52px]"
                  data-testid={`tonight-staple-${item.item_id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug break-words">{item.name}</p>
                    <p
                      className={cn(
                        "text-sm mt-0.5",
                        item.status === "out"
                          ? "text-red-600 dark:text-red-400"
                          : "text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {HALL_CANTEEN_STATUS_LABELS[item.status]}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 min-h-[44px]"
                    disabled={hub.restockingId === item.item_id || !hub.canManageCanteen}
                    title={!hub.canManageCanteen ? "Captains and canteen managers only" : undefined}
                    onClick={() => void hub.markRestocked(item.item_id)}
                  >
                    {HALL_CANTEEN.markRestocked}
                  </Button>
                </div>
              ))}
              {hub.needsAttention.length > 3 ? (
                <TonightActionRow
                  href="/hall/canteen"
                  label={`${hub.needsAttention.length - 3} more staple${hub.needsAttention.length - 3 === 1 ? "" : "s"}`}
                  hint="View full canteen list"
                  testId="tonight-need-anything-more"
                />
              ) : (
                <TonightActionRow
                  href="/hall/canteen"
                  label={HALL_CANTEEN.viewCanteen}
                  testId="tonight-need-anything-canteen"
                />
              )}
            </>
          )}
        </TonightSectionCard>
      </main>

      <HallVoteModal
        open={voteOpen}
        onOpenChange={setVoteOpen}
        recipes={voteRecipes}
        source="tonight_hub"
      />

      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
