import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";
import { CREW_SIZE_OPTIONS } from "@shared/golden-100/recipe-quality/crew-scale";

type CrewSizePickerProps = {
  crewSize: number;
  onChange: (size: number) => void;
  className?: string;
  /** Show prominent banner style at top of recipe */
  prominent?: boolean;
};

export function CrewSizePicker({
  crewSize,
  onChange,
  className,
  prominent = false,
}: CrewSizePickerProps) {
  if (prominent) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3.5 sm:px-5",
          className,
        )}
        role="group"
        aria-label="Crew size"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" aria-hidden />
            <p className="text-sm font-semibold text-foreground">
              Feeding <span className="text-primary">{crewSize} firefighters</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Ingredients scale automatically</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {CREW_SIZE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                app.pill,
                "min-h-11 sm:min-h-9 cursor-pointer transition-colors hover-elevate active-elevate-2 tap-scale touch-manipulation",
                crewSize === n && "bg-primary/20 ring-1 ring-primary/40 text-foreground font-medium",
              )}
              aria-pressed={crewSize === n}
              aria-label={`Scale recipe for ${n} firefighters`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2.5", className)} role="group" aria-label="Crew size">
      <p className="text-sm font-medium text-foreground">Crew size</p>
      <div className="flex flex-wrap gap-2">
        {CREW_SIZE_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              app.pill,
              "min-h-11 sm:min-h-9 cursor-pointer transition-colors hover-elevate active-elevate-2 tap-scale touch-manipulation",
              crewSize === n && "bg-primary/20 ring-1 ring-primary/40 text-foreground",
            )}
            aria-pressed={crewSize === n}
          >
            {n} firefighters
          </button>
        ))}
      </div>
    </div>
  );
}
