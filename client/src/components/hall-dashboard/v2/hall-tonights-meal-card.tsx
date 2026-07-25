import { Link } from "wouter";
import type { HallHistoryEntry } from "@shared/hall-profile/types";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import { formatLastCookedMessage } from "@shared/hall-profile/history-format";
import { ChefHat, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HALL_DASHBOARD, CTA } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

interface HallTonightsMealCardProps {
  entry?: HallHistoryEntry;
  className?: string;
}

function entryHref(entry: HallHistoryEntry): string | undefined {
  return (
    entry.recipePath ??
    (entry.recipeSlug ? approvedCatalogRecipePath(entry.recipeSlug) : undefined)
  );
}

function pickSourceLabel(entry: HallHistoryEntry): string | null {
  if (entry.type === "wheel_result") return "From the Classics Wheel";
  if (entry.type === "meal_generated") return "From Hall Match";
  if (entry.type === "meal_cooked") return formatLastCookedMessage(entry);
  return null;
}

export function HallTonightsMealCard({ entry, className }: HallTonightsMealCardProps) {
  const href = entry ? entryHref(entry) : undefined;
  const meta = entry ? pickSourceLabel(entry) : null;

  return (
    <article
      className={cn(
        "rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/8 to-card/40 overflow-hidden",
        className,
      )}
      data-testid="hall-tonights-meal-card"
    >
      <div className="px-4 py-3 border-b border-border/25 bg-primary/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-primary shrink-0" aria-hidden />
          <h2 className="font-heading text-base tracking-wide">{HALL_DASHBOARD.tonight}</h2>
        </div>
        <Link
          href="/hall#hall-tonight"
          className="text-xs font-semibold text-primary inline-flex items-center gap-0.5 shrink-0 min-h-11 px-2 touch-manipulation"
        >
          Open hub
          <ChevronRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      </div>
      <div className="p-4 space-y-3">
        {entry ? (
          <>
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2 shrink-0">
                <ChefHat className="w-5 h-5 text-primary" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                {href ? (
                  <Link href={href} className="font-medium text-lg leading-snug hover:text-primary line-clamp-2 break-words">
                    {entry.title}
                  </Link>
                ) : (
                  <p className="font-medium text-lg leading-snug line-clamp-2 break-words">{entry.title}</p>
                )}
                {meta ? <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{meta}</p> : null}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild className="min-h-11 touch-manipulation flex-1 sm:flex-none">
                <Link href="/generator">{CTA.pickTonight}</Link>
              </Button>
              {href ? (
                <Button asChild variant="outline" className="min-h-11 touch-manipulation flex-1 sm:flex-none">
                  <Link href={href}>Open recipe</Link>
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">{HALL_DASHBOARD.emptyTonight}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild className="min-h-11 touch-manipulation flex-1 sm:flex-none">
                <Link href="/generator">{CTA.pickTonight}</Link>
              </Button>
              <Button asChild variant="outline" className="min-h-11 touch-manipulation flex-1 sm:flex-none">
                <Link href="/wheel">{CTA.spinWheel}</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
