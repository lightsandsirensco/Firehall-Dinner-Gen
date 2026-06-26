import { Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HALL_VOTE } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

export type HallVoteCtaLabel = "start" | "crew" | "send";

const LABELS: Record<HallVoteCtaLabel, string> = {
  start: HALL_VOTE.startVote,
  crew: HALL_VOTE.letCrewVote,
  send: HALL_VOTE.sendToCrew,
};

interface HallVoteCtaProps {
  onClick: () => void;
  label?: HallVoteCtaLabel;
  variant?: "default" | "outline" | "compact";
  className?: string;
  disabled?: boolean;
}

export function HallVoteCta({
  onClick,
  label = "crew",
  variant = "outline",
  className,
  disabled,
}: HallVoteCtaProps) {
  const isCompact = variant === "compact";

  return (
    <Button
      type="button"
      size={isCompact ? "sm" : "default"}
      variant={variant === "default" ? "default" : "outline"}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-h-10 touch-manipulation font-heading tracking-wide",
        isCompact && "h-9 px-3 text-xs",
        className,
      )}
      data-testid="button-hall-vote-cta"
    >
      <Vote className={cn("shrink-0", isCompact ? "w-3.5 h-3.5 mr-1.5" : "w-4 h-4 mr-2")} />
      {LABELS[label]}
    </Button>
  );
}
