import { Flame } from "lucide-react";

/** Route chunk placeholder — matches loading-state tone */
export function RouteLoadingFallback() {
  return (
    <div
      className="page-shell min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 px-page"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="relative w-14 h-14 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center">
        <Flame className="w-7 h-7 text-primary/80 animate-pulse motion-reduce:animate-none" />
      </div>
      <div className="w-44 h-2 rounded-full premium-skeleton" />
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70 font-medium">
        Rolling out…
      </p>
    </div>
  );
}
