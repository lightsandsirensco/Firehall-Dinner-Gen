import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Horizontal pill strip — native-style quick filters on mobile. */
export function FilterChipScroller({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <p className="text-[11px] font-medium text-muted-foreground px-0.5">{label}</p>
      ) : null}
      <div
        className="flex gap-2 overflow-x-auto scrollbar-hide -mx-0.5 px-0.5 pb-1 snap-x snap-mandatory touch-pan-x"
        role="list"
      >
        {children}
      </div>
    </div>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role="listitem"
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "snap-start shrink-0 rounded-full px-4 py-2.5 min-h-11 text-sm font-medium transition-all duration-200 touch-manipulation",
        active
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-2 ring-primary/30"
          : "bg-muted/50 text-foreground/90 border border-border/40 active:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
