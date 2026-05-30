import { cn } from "@/lib/utils";
import { useMeasurementSystem } from "@/lib/measurement-preference";
import type { MeasurementSystem } from "@shared/measurements";

type MeasurementUnitToggleProps = {
  className?: string;
};

function ToggleButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-9 px-3.5 rounded-md text-sm font-medium transition-colors touch-manipulation",
        active
          ? "bg-primary/20 text-foreground ring-1 ring-primary/40"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

export function MeasurementUnitToggle({ className }: MeasurementUnitToggleProps) {
  const [system, setSystem] = useMeasurementSystem();

  const select = (next: MeasurementSystem) => {
    if (next !== system) setSystem(next);
  };

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2 sm:gap-3", className)}
      role="group"
      aria-label="Measurement units"
    >
      <span className="text-sm text-muted-foreground shrink-0">Measurements:</span>
      <div className="inline-flex items-center rounded-lg border border-border/40 bg-muted/25 p-0.5">
        <ToggleButton label="US" active={system === "us"} onClick={() => select("us")} />
        <ToggleButton label="Metric" active={system === "metric"} onClick={() => select("metric")} />
      </div>
    </div>
  );
}

export { useMeasurementSystem };
