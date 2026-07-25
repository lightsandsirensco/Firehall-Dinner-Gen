import { Link } from "wouter";
import { Check, Circle, ShoppingCart, UtensilsCrossed, Vote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RitualCheck } from "@/lib/home/shift-ritual";

function CheckIcon({ done, active }: { done: boolean; active: boolean }) {
  if (done) return <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />;
  if (active) return <Circle className="h-4 w-4 shrink-0 fill-primary/30 text-primary" aria-hidden />;
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />;
}

function rowIcon(id: RitualCheck["id"]) {
  if (id === "vote") return Vote;
  if (id === "shop") return ShoppingCart;
  return UtensilsCrossed;
}

/**
 * Alive checklist for the evening ritual — dinner → vote → shop.
 * Not a Hall feature directory.
 */
export function HomeRitualStatus({
  checks,
  className,
}: {
  checks: RitualCheck[];
  className?: string;
}) {
  if (checks.length === 0) return null;

  return (
    <section
      className={cn("space-y-2", className)}
      aria-labelledby="home-ritual-status"
      data-testid="home-ritual-status"
    >
      <h2
        id="home-ritual-status"
        className="px-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Tonight's run
      </h2>
      <ul className="overflow-hidden rounded-2xl border border-border/45 bg-card/40 divide-y divide-border/30">
        {checks.map((check) => {
          const Icon = rowIcon(check.id);
          const body = (
            <div
              className={cn(
                "flex min-h-[52px] items-center gap-3 px-4 py-3",
                check.active && "bg-primary/8",
                check.done && "opacity-80",
              )}
            >
              <CheckIcon done={check.done} active={check.active} />
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  check.active ? "text-primary" : "text-muted-foreground",
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-semibold leading-snug",
                    check.done && "text-muted-foreground line-through decoration-border",
                  )}
                >
                  {check.label}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-1">{check.detail}</p>
              </div>
            </div>
          );

          return (
            <li key={check.id} data-testid={`ritual-check-${check.id}`}>
              {check.href && !check.done ? (
                <Link href={check.href} className="block touch-manipulation hover:bg-muted/25">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
