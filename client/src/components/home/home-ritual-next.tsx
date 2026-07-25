import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RitualNextAction } from "@/lib/home/shift-ritual";

/**
 * Habit closer — every Home visit ends here.
 */
export function HomeRitualNext({
  action,
  className,
}: {
  action: RitualNextAction;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-primary/30 bg-primary/8 px-4 py-4 space-y-3",
        className,
      )}
      data-testid="home-ritual-next"
      aria-labelledby="home-ritual-next-heading"
    >
      <div className="space-y-1">
        <p
          id="home-ritual-next-heading"
          className="text-xs font-semibold uppercase tracking-wide text-primary"
        >
          Next action
        </p>
        <p className="text-sm text-muted-foreground leading-snug">{action.reason}</p>
      </div>
      <Button asChild className="w-full min-h-12 text-base" data-testid="home-ritual-cta">
        <Link href={action.href}>{action.label}</Link>
      </Button>
    </section>
  );
}
