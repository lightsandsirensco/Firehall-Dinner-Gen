import { AlertTriangle, SlidersHorizontal, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  type: "no_match" | "error";
  message?: string;
}

export function ErrorState({ type, message }: ErrorStateProps) {
  if (type === "no_match") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center fade-up" data-testid="error-state-no-match">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6 relative">
          <div className="absolute inset-0 rounded-full bg-amber-500/5 animate-ping" style={{ animationDuration: "3s" }} />
          <SlidersHorizontal className="w-10 h-10 text-amber-500/60" />
        </div>
        <h2 className="font-heading text-3xl tracking-wide text-foreground mb-2" data-testid="text-no-match-title">
          NO MATCHES FOUND
        </h2>
        <p className="text-muted-foreground text-sm max-w-sm mb-1" data-testid="text-no-match-description">
          Your current filters are too restrictive. Try adding more appliances, proteins, or loosening your allergy restrictions to find a match.
        </p>
        <p className="text-muted-foreground/60 text-xs max-w-xs" data-testid="text-no-match-hint">
          Tip: Start broad, then narrow down to find your crew's perfect meal.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center fade-up" data-testid="error-state-error">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6 relative">
        <div className="absolute inset-0 rounded-full bg-destructive/5 animate-ping" style={{ animationDuration: "3s" }} />
        <AlertTriangle className="w-10 h-10 text-destructive/60" />
      </div>
      <h2 className="font-heading text-3xl tracking-wide text-foreground mb-2" data-testid="text-error-title">
        SOMETHING WENT WRONG
      </h2>
      <p className="text-muted-foreground text-sm max-w-sm mb-1" data-testid="text-error-description">
        {message || "An unexpected error occurred. Please try again."}
      </p>
      <div className="flex items-center gap-1.5 text-muted-foreground/60 text-xs mt-1" data-testid="text-error-hint">
        <RefreshCw className="w-3 h-3" />
        <span>Hit Generate Meal to try again</span>
      </div>
    </div>
  );
}
