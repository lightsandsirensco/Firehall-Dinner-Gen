import { BrandLogo } from "@/components/brand/brand-logo";
import { LightsAndSirensCredit } from "@/components/brand/lights-and-sirens-credit";

/** Route chunk placeholder — matches loading-state tone */
export function RouteLoadingFallback() {
  return (
    <div
      className="page-shell min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 px-page"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="relative w-14 h-14 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center">
        <BrandLogo className="h-7 w-7 animate-pulse motion-reduce:animate-none" />
      </div>
      <div className="w-44 h-2 rounded-full premium-skeleton" />
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70 font-medium">
        Loading…
      </p>
      <LightsAndSirensCredit variant="compact" className="text-center text-xs" />
    </div>
  );
}

