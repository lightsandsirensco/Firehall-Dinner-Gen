import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";
import { MeasurementUnitToggle } from "@/components/measurement-unit-toggle";

type RecipeMeasurementBarProps = {
  className?: string;
  /** Crew size, serving count, or other scaling controls shown above measurements. */
  children?: ReactNode;
};

/**
 * Groups serving/crew controls with the US/Metric toggle near the top of recipe pages.
 */
export function RecipeMeasurementBar({ className, children }: RecipeMeasurementBarProps) {
  return (
    <div
      className={cn(app.panel, "p-4 sm:p-5 space-y-4", className)}
      data-testid="recipe-measurement-bar"
    >
      {children}
      {children ? (
        <div className="border-t border-border/25 pt-4">
          <MeasurementUnitToggle />
        </div>
      ) : (
        <MeasurementUnitToggle />
      )}
    </div>
  );
}
