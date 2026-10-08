import type { ScheduleBlock } from "@shared/schedule/types";
import { cn } from "@/lib/utils";

/** One repeat of the rotation as a proportional on/off bar. Decorative. */
export function CycleStrip({ blocks, className }: { blocks: readonly ScheduleBlock[]; className?: string }) {
  return (
    <span className={cn("flex h-2 w-full gap-0.5 overflow-hidden rounded-full", className)} aria-hidden>
      {blocks.map((b, i) => (
        <span
          key={i}
          className={cn("block h-full rounded-full", b.kind === "on" ? "bg-primary" : "bg-muted-foreground/20")}
          style={{ flexGrow: b.minutes, flexBasis: 0 }}
        />
      ))}
    </span>
  );
}
