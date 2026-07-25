import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APP_HOME } from "@/lib/brand-copy";

/**
 * Tonight's dinner — one primary commit, one secondary escape.
 */
export function HomeTonightCard({
  dinnerTitle,
  voteStatus,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  className,
}: {
  dinnerTitle: string | null;
  voteStatus?: string | null;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-primary/25 bg-primary/5 px-4 py-4 space-y-3",
        className,
      )}
      aria-labelledby="home-tonight"
      data-testid="home-tonight-card"
    >
      <div className="space-y-1">
        <h2
          id="home-tonight"
          className="text-xs font-semibold uppercase tracking-wide text-primary"
        >
          What's for dinner?
        </h2>
        {dinnerTitle ? (
          <p className="font-heading text-xl tracking-wide leading-snug">{dinnerTitle}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{APP_HOME.undecidedHint}</p>
        )}
        {voteStatus ? (
          <p className="text-sm text-muted-foreground">{voteStatus}</p>
        ) : null}
      </div>

      <Button asChild className="w-full min-h-12 text-base" data-testid="home-tonight-primary">
        <Link href={primaryHref}>{primaryLabel}</Link>
      </Button>
      {secondaryHref && secondaryLabel ? (
        <Link
          href={secondaryHref}
          className="block text-center text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline min-h-8"
          data-testid="home-tonight-secondary"
        >
          {secondaryLabel}
        </Link>
      ) : null}
    </section>
  );
}
