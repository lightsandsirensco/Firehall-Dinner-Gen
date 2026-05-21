import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Flame } from "lucide-react";

const LOADING_MESSAGES = [
  "Checking what's on the truck...",
  "Sizing it up for the crew...",
  "Picking a main the hall will actually eat...",
  "Rounding out the sides for the table...",
];

function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`premium-skeleton rounded-md ${className ?? ""}`} />;
}

function LoadingProgressBar() {
  return (
    <div
      className="h-1 w-full overflow-hidden rounded-full bg-primary/10"
      role="progressbar"
      aria-label="Loading recipe"
    >
      <div className="h-full w-1/3 rounded-full bg-primary/70 animate-[loading-bar_1.8s_ease-in-out_infinite]" />
    </div>
  );
}

function LoadingStatus({ variant }: { variant: "full" | "compact" }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className={`flex items-center justify-center gap-2 ${variant === "compact" ? "pt-2" : "pt-1"}`}
    >
      <Flame className="w-4 h-4 text-primary/60 animate-pulse shrink-0" />
      <p
        className="text-sm text-muted-foreground tracking-wide text-center animate-in fade-in duration-300"
        data-testid="text-loading-message"
      >
        {LOADING_MESSAGES[messageIndex]}
      </p>
    </div>
  );
}

export function LoadingState({ variant = "full" }: { variant?: "full" | "compact" }) {
  if (variant === "compact") {
    return (
      <div
        className="rounded-lg border border-primary/20 bg-background/95 backdrop-blur-sm px-4 py-3 shadow-lg animate-in fade-in duration-300"
        data-testid="loading-state-compact"
      >
        <LoadingProgressBar />
        <LoadingStatus variant="compact" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500" data-testid="loading-state">
      <LoadingProgressBar />

      <div className="flex items-center gap-4 mb-1 fade-up">
        <div className="w-12 h-12 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
          <Flame className="w-6 h-6 text-primary animate-pulse" />
        </div>
        <div className="space-y-2.5 flex-1 min-w-0">
          <ShimmerBlock className="h-7 w-3/4 max-w-xs" />
          <ShimmerBlock className="h-4 w-1/2 max-w-[10rem]" />
        </div>
      </div>

      <Card className="premium-card">
        <CardContent className="p-5">
          <ShimmerBlock className="h-5 w-36 mb-4" />
          <div className="grid grid-cols-2 sm:flex sm:gap-5 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2.5 sm:flex-1"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <ShimmerBlock className="h-5 w-5 rounded-full" />
                <ShimmerBlock className="h-7 w-12" />
                <ShimmerBlock className="h-3.5 w-14" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="premium-card">
        <CardContent className="p-5">
          <ShimmerBlock className="h-5 w-32 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ShimmerBlock key={i} className="h-5" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="premium-card">
        <CardContent className="p-5">
          <ShimmerBlock className="h-5 w-28 mb-4" />
          <div className="space-y-3.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3.5">
                <ShimmerBlock className="h-5 w-7 flex-shrink-0 rounded-full" />
                <ShimmerBlock className="h-5 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <LoadingStatus variant="full" />
    </div>
  );
}
