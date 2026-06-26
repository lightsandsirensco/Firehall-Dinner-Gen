import { useMemo, useState } from "react";

import { Link } from "wouter";

import { ChefHat, Coffee, RotateCw, Vote } from "lucide-react";

import { HallVoteModal } from "@/components/hall-vote-modal";

import { buildDefaultHallVoteRecipes } from "@/lib/hall-vote-recipes";

import { trackShiftVoteCreated } from "@/lib/analytics";

import { SHIFT_DASHBOARD } from "@/lib/brand-copy";

import { cn } from "@/lib/utils";



interface ShiftDashboardActionsProps {

  hallId: string;

  shiftId: string;

  className?: string;

}



function ActionTile({

  href,

  onClick,

  icon: Icon,

  label,

  testId,

}: {

  href?: string;

  onClick?: () => void;

  icon: typeof ChefHat;

  label: string;

  testId: string;

}) {

  const className = cn(

    "flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/45 bg-card/50",

    "px-3 py-4 min-h-[88px] text-center transition-colors active:scale-[0.98]",

    "hover:border-primary/30 hover:bg-primary/5 touch-manipulation",

  );



  if (href) {

    return (

      <Link href={href} className={className} data-testid={testId}>

        <Icon className="w-6 h-6 text-primary" aria-hidden />

        <span className="text-xs font-semibold leading-tight">{label}</span>

      </Link>

    );

  }



  return (

    <button type="button" onClick={onClick} className={className} data-testid={testId}>

      <Icon className="w-6 h-6 text-primary" aria-hidden />

      <span className="text-xs font-semibold leading-tight">{label}</span>

    </button>

  );

}



export function ShiftDashboardActions({ hallId, shiftId, className }: ShiftDashboardActionsProps) {

  const [voteOpen, setVoteOpen] = useState(false);

  const voteRecipes = useMemo(() => buildDefaultHallVoteRecipes(), []);



  return (

    <>

      <section

        className={cn("space-y-2", className)}

        aria-label={SHIFT_DASHBOARD.quickActions}

        data-testid="shift-dashboard-actions"

      >

        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-0.5">

          {SHIFT_DASHBOARD.quickActions}

        </p>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">

          <ActionTile

            icon={Vote}

            label={SHIFT_DASHBOARD.actions.createVote}

            testId="shift-action-create-vote"

            onClick={() => setVoteOpen(true)}

          />

          <ActionTile

            href="/generator"

            icon={ChefHat}

            label={SHIFT_DASHBOARD.actions.pickMeal}

            testId="shift-action-pick-meal"

          />

          <ActionTile

            href="/wheel"

            icon={RotateCw}

            label={SHIFT_DASHBOARD.actions.spinWheel}

            testId="shift-action-spin-wheel"

          />

          <ActionTile

            href="/hall/canteen"

            icon={Coffee}

            label={SHIFT_DASHBOARD.actions.reportCanteen}

            testId="shift-action-report-canteen"

          />

        </div>

      </section>

      <HallVoteModal

        open={voteOpen}

        onOpenChange={setVoteOpen}

        recipes={voteRecipes}

        source="shift_dashboard"

        onVoteCreated={({ voteId, optionCount }) => {

          trackShiftVoteCreated({

            hall_id: hallId,

            shift_id: shiftId,

            vote_id: voteId,

            option_count: optionCount,

          });

        }}

      />

    </>

  );

}


