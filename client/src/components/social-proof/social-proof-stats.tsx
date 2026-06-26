import { ChefHat, Heart, Vote } from "lucide-react";
import type { SocialProofStats } from "@shared/social-proof/types";
import { formatSocialProofCount } from "@shared/social-proof/format";
import { cn } from "@/lib/utils";

const STAT_ITEMS = [
  {
    key: "meals_generated" as const,
    label: "Meals generated",
    icon: ChefHat,
  },
  {
    key: "hall_votes" as const,
    label: "Hall votes",
    icon: Vote,
  },
  {
    key: "recipes_saved" as const,
    label: "Recipes saved",
    icon: Heart,
  },
];

interface SocialProofStatsRowProps {
  stats: SocialProofStats;
  className?: string;
}

export function SocialProofStatsRow({ stats, className }: SocialProofStatsRowProps) {
  return (
    <ul
      className={cn("grid grid-cols-3 gap-2 sm:gap-4", className)}
      data-testid="social-proof-stats"
    >
      {STAT_ITEMS.map(({ key, label, icon: Icon }) => (
        <li
          key={key}
          className="rounded-xl border border-border/30 bg-card/35 px-2 py-3 text-center sm:rounded-2xl sm:px-4 sm:py-4"
        >
          <Icon className="mx-auto h-4 w-4 text-primary sm:h-5 sm:w-5" aria-hidden />
          <p className="mt-2 font-heading text-lg leading-none tabular-nums text-foreground sm:text-2xl">
            {formatSocialProofCount(stats[key])}
          </p>
          <p className="mt-1.5 text-[10px] font-medium leading-tight text-muted-foreground sm:text-xs">
            {label}
          </p>
        </li>
      ))}
    </ul>
  );
}
