import { Link } from "wouter";
import { ChefHat, Heart, ShoppingCart, Sparkles, Vote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReturnReason } from "@/lib/home/return-reasons";

const ICONS = {
  dinner_unset: Sparkles,
  vote_open: Vote,
  shopping: ShoppingCart,
  continue_cook: ChefHat,
  start_cook: ChefHat,
  favorites: Heart,
  suggested: Sparkles,
} as const;

/**
 * Open loops that justify opening the app before dinner.
 * Only renders real reasons — empty if there's nothing pending.
 */
export function HomeReturnReasons({
  reasons,
  className,
}: {
  reasons: ReturnReason[];
  className?: string;
}) {
  const secondary = reasons.filter((r) => !r.primary);
  if (secondary.length === 0) return null;

  return (
    <section
      className={cn("space-y-2", className)}
      aria-labelledby="home-return-reasons"
      data-testid="home-return-reasons"
    >
      <h2
        id="home-return-reasons"
        className="px-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Also open tonight
      </h2>
      <ul className="space-y-1.5">
        {secondary.map((reason) => {
          const Icon = ICONS[reason.id];
          return (
            <li key={reason.id}>
              <Link
                href={reason.href}
                className="flex min-h-[48px] items-center gap-3 rounded-xl border border-border/40 bg-muted/15 px-3.5 py-2.5 touch-manipulation hover:bg-muted/30"
                data-testid={`return-reason-${reason.id}`}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug">{reason.label}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{reason.detail}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
