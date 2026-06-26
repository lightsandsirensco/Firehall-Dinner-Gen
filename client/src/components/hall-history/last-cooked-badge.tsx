import type { HallHistoryEntry } from "@shared/hall-profile/types";
import { formatLastCookedMessage } from "@shared/hall-profile/history-format";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface LastCookedBadgeProps {
  entry: HallHistoryEntry | undefined;
  className?: string;
}

export function LastCookedBadge({ entry, className }: LastCookedBadgeProps) {
  if (!entry) return null;
  const message = formatLastCookedMessage(entry);
  if (!message) return null;

  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 text-sm text-muted-foreground rounded-lg border border-border/30 bg-muted/20 px-3 py-2",
        className,
      )}
      data-testid="last-cooked-badge"
    >
      <Clock className="w-4 h-4 shrink-0 text-primary/80" aria-hidden />
      <span>{message}</span>
    </p>
  );
}
