import { cn } from "@/lib/utils";
import { useMeasurementSystem } from "@/lib/measurement-preference";
import type { MeasurementSystem } from "@shared/measurements";

type MeasurementUnitToggleProps = {
  className?: string;
  /** Hide the "Measurements:" label when the parent already provides context. */
  hideLabel?: boolean;
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
        "min-h-11 sm:min-h-10 px-4 sm:px-3.5 rounded-md text-sm font-semibold transition-all touch-manipulation",
        active
          ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/50"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

export function MeasurementUnitToggle({ className, hideLabel = false }: MeasurementUnitToggleProps) {
  const [system, setSystem] = useMeasurementSystem();

  const select = (next: MeasurementSystem) => {
    if (next !== system) setSystem(next);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3",
        className,
      )}
      role="group"
      aria-label="Measurement units"
    >
      {!hideLabel && (
        <span className="text-sm font-medium text-foreground shrink-0">Measurements</span>
      )}
      <div
        className="inline-flex w-full sm:w-auto items-center rounded-xl border border-border/40 bg-muted/30 p-1 gap-0.5"
        data-testid="measurement-unit-toggle"
      >
        <ToggleButton label="US" active={system === "us"} onClick={() => select("us")} />
        <ToggleButton label="Metric" active={system === "metric"} onClick={() => select("metric")} />
      </div>
    </div>
  );
}

export { useMeasurementSystem };
