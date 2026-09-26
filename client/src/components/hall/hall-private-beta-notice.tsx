import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HallPrivateBetaNoticeProps {
  /** Tighter spacing/type scale for embedding inside another card (e.g. the Account page). */
  compact?: boolean;
  onSecondaryAction?: () => void;
  secondaryLabel?: string;
  className?: string;
}

/**
 * The single source of truth for "Hall Operations" messaging everywhere in the
 * app — deliberately reveals nothing about what the feature does beyond the
 * name, so it can be reused on the dedicated page and inline inside the
 * Account page without ever leaking roadmap details.
 *
 * Status-only, no signup — Hall Operations is on hold and is not currently
 * offered for signup/waitlist anywhere in the product (see
 * FIREHALL MEALS — REMOVE HALL OPERATIONS / HALL SIGNUP SURFACES cleanup).
 */
export function HallPrivateBetaNotice({
  compact,
  onSecondaryAction,
  secondaryLabel,
  className,
}: HallPrivateBetaNoticeProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/40 bg-muted/20 text-center",
        compact ? "p-5 space-y-4" : "p-6 sm:p-8 space-y-5",
        className,
      )}
      data-testid="hall-private-beta-notice"
    >
      <div className="space-y-2">
        <p className={cn("font-heading tracking-wide flex items-center justify-center gap-2", compact ? "text-lg" : "text-2xl sm:text-3xl")}>
          <Flame className={cn("text-primary shrink-0", compact ? "h-4 w-4" : "h-6 w-6 sm:h-7 sm:w-7")} aria-hidden />
          Hall Operations
        </p>
        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          Private Beta
        </span>
      </div>

      <p
        className={cn(
          "mx-auto text-muted-foreground leading-relaxed",
          compact ? "text-sm max-w-sm" : "text-sm sm:text-base max-w-md",
        )}
      >
        Hall Operations is on hold — not currently open for signup. Everything you need for
        picking, planning, and cooking tonight's meal is available right now in Firehall Meals.
      </p>

      <div className="mx-auto max-w-sm space-y-3">
        {onSecondaryAction ? (
          <Button
            type="button"
            variant="outline"
            className="w-full min-h-11 touch-manipulation"
            onClick={onSecondaryAction}
          >
            {secondaryLabel ?? "Back to Meal Planning"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
