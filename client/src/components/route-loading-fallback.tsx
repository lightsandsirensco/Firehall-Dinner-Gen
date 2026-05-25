/** Minimal route chunk placeholder — avoids blank screen during lazy load */
export function RouteLoadingFallback() {
  return (
    <div
      className="page-shell min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 px-page"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="w-12 h-12 rounded-full premium-skeleton" />
      <div className="w-40 h-2 rounded-full premium-skeleton" />
    </div>
  );
}
