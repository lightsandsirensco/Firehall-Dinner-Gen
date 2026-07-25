import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ShiftPrimaryAction = {
  href: string;
  label: string;
  reason: string;
};

/**
 * One obvious next action for the shift — not a menu of equals.
 */
export function HomePrimaryAction({
  action,
  className,
}: {
  action: ShiftPrimaryAction;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-primary/30 bg-primary/8 px-4 py-4 space-y-3",
        className,
      )}
      data-testid="home-primary-action"
      aria-labelledby="home-primary-heading"
    >
      <div className="space-y-1">
        <p
          id="home-primary-heading"
          className="text-xs font-semibold uppercase tracking-wide text-primary"
        >
          Next up
        </p>
        <p className="text-sm text-muted-foreground leading-snug">{action.reason}</p>
      </div>
      <Button asChild className="w-full min-h-12 text-base" data-testid="home-primary-cta">
        <Link href={action.href}>{action.label}</Link>
      </Button>
    </section>
  );
}
