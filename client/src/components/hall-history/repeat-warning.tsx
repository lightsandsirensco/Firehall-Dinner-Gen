import type { HallHistoryEntry } from "@shared/hall-profile/types";
import { formatLastCookedMessage } from "@shared/hall-profile/history-format";
import { HALL_HISTORY } from "@/lib/brand-copy";
import { HALL_REPEAT_COOLDOWN_DAYS } from "@shared/hall-profile/types";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface RepeatWarningProps {
  entry: HallHistoryEntry | undefined;
  avoid: boolean;
  className?: string;
}

export function RepeatWarning({ entry, avoid, className }: RepeatWarningProps) {
  if (!avoid || !entry) return null;
  const detail = formatLastCookedMessage(entry);

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm",
        className,
      )}
      role="status"
      data-testid="repeat-warning"
    >
      <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden />
      <div>
        <p className="font-medium text-foreground">{HALL_HISTORY.repeatWarning}</p>
        {detail ? <p className="text-muted-foreground mt-1">{detail}</p> : null}
        <p className="text-xs text-muted-foreground mt-1">
          We usually rotate after {HALL_REPEAT_COOLDOWN_DAYS} days on shift.
        </p>
      </div>
    </div>
  );
}
