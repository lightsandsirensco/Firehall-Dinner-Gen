import { useEffect, useState } from "react";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const LOADING_MESSAGES = [
  "On the line…",
  "Scaling for the crew…",
  "Pulling sides…",
  "Almost there…",
];

const ALT_LOADING_MESSAGES = [
  "Trying another plate…",
  "One more option…",
  "Shuffling…",
];

function ShimmerBlock({ className }: { className?: string }) {
  return <div className={cn("premium-skeleton rounded-lg", className)} />;
}

function LoadingProgressBar() {
  return (
    <div
      className="h-0.5 w-full overflow-hidden rounded-full bg-border/40"
      role="progressbar"
      aria-label="Loading recipe"
    >
      <div className="h-full w-2/5 rounded-full bg-primary/80 animate-[loading-bar_1.4s_ease-in-out_infinite] motion-reduce:animate-none" />
    </div>
  );
}

function LoadingStatus({
  variant,
  mode = "initial",
}: {
  variant: "full" | "compact";
  mode?: "initial" | "alternate";
}) {
  const messages = mode === "alternate" ? ALT_LOADING_MESSAGES : LOADING_MESSAGES;
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    setMessageIndex(0);
    const id = window.setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, [messages.length, mode]);

  return (
    <p
      className={cn(
        app.subtitle,
        "text-center animate-in fade-in duration-300",
        variant === "compact" ? "text-sm" : "mt-1",
      )}
      data-testid="text-loading-message"
    >
      {messages[messageIndex]}
    </p>
  );
}

export function LoadingState({
  variant = "full",
  mode = "initial",
}: {
  variant?: "full" | "compact";
  mode?: "initial" | "alternate";
}) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          app.panel,
          "px-4 py-3 space-y-2.5 animate-in fade-in duration-300",
        )}
        data-testid="loading-state-compact"
        data-loading-mode={mode}
      >
        <LoadingProgressBar />
        <LoadingStatus variant="compact" mode={mode} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500" data-testid="loading-state">
      <LoadingProgressBar />

      <div
        className="w-full aspect-[5/4] max-h-[min(42vh,340px)] sm:aspect-[16/9] sm:max-h-[min(380px,50vh)] rounded-2xl sm:rounded-3xl overflow-hidden ring-1 ring-border/25 premium-skeleton"
        aria-hidden
      />

      <div className="space-y-3">
        <ShimmerBlock className="h-9 w-4/5 max-w-md" />
        <ShimmerBlock className="h-4 w-2/5 max-w-[12rem]" />
      </div>

      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <ShimmerBlock key={i} className="h-9 flex-1 max-w-[7rem] rounded-full" />
        ))}
      </div>

      <div className="space-y-3 pt-2 border-t border-border/20">
        <ShimmerBlock className="h-5 w-28" />
        {[1, 2, 3, 4].map((i) => (
          <ShimmerBlock key={i} className="h-4 w-full" />
        ))}
      </div>

      <div className="space-y-3 pt-2 border-t border-border/20">
        <ShimmerBlock className="h-5 w-24" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <ShimmerBlock className="h-8 w-8 rounded-full shrink-0" />
            <ShimmerBlock className="h-4 flex-1 mt-1.5" />
          </div>
        ))}
      </div>

      <LoadingStatus variant="full" mode={mode} />
    </div>
  );
}
