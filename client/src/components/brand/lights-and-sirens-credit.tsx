import { cn } from "@/lib/utils";
import { LightsAndSirensLink } from "./lights-and-sirens-link";

type LightsAndSirensCreditProps = {
  className?: string;
  variant?: "hero" | "compact" | "block";
  showFirefighterOwned?: boolean;
};

/** “Built by Lights & Sirens Co.” — clickable parent brand credit */
export function LightsAndSirensCredit({
  className,
  variant = "compact",
  showFirefighterOwned = false,
}: LightsAndSirensCreditProps) {
  if (variant === "hero") {
    return (
      <div className={cn("space-y-1.5", className)} data-testid="lights-credit-hero">
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-foreground/70">
          Built by{" "}
          <LightsAndSirensLink variant="hero" className="tracking-[0.18em]">
            Lights & Sirens Co.
          </LightsAndSirensLink>
        </p>
        {showFirefighterOwned && (
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            Firefighter-owned · Crew life first
          </p>
        )}
      </div>
    );
  }

  if (variant === "block") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-primary/20 bg-primary/[0.06] px-4 py-3.5 sm:px-5 sm:py-4",
          className,
        )}
        data-testid="lights-credit-block"
      >
        <p className="text-sm text-foreground/90">
          <span className="text-muted-foreground">Built by </span>
          <LightsAndSirensLink variant="inline">Lights & Sirens Co.</LightsAndSirensLink>
        </p>
        {showFirefighterOwned && (
          <p className="mt-1 text-xs text-muted-foreground">Firefighter-owned lifestyle brand</p>
        )}
      </div>
    );
  }

  return (
    <p className={cn("text-sm text-muted-foreground", className)} data-testid="lights-credit-compact">
      Built by <LightsAndSirensLink variant="inline">Lights & Sirens Co.</LightsAndSirensLink>
    </p>
  );
}
