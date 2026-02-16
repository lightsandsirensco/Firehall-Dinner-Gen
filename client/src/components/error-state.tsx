import { AlertTriangle, SlidersHorizontal } from "lucide-react";

interface ErrorStateProps {
  type: "no_match" | "error";
  message?: string;
}

export function ErrorState({ type, message }: ErrorStateProps) {
  if (type === "no_match") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
          <SlidersHorizontal className="w-10 h-10 text-amber-500/60" />
        </div>
        <h2 className="font-heading text-3xl tracking-wide text-foreground mb-2" data-testid="text-no-match-title">
          NO MATCHES FOUND
        </h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Your current filters are too restrictive. Try adding more appliances, proteins, or loosening your allergy restrictions to find a match.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-destructive/60" />
      </div>
      <h2 className="font-heading text-3xl tracking-wide text-foreground mb-2" data-testid="text-error-title">
        SOMETHING WENT WRONG
      </h2>
      <p className="text-muted-foreground text-sm max-w-sm">
        {message || "An unexpected error occurred. Please try again."}
      </p>
    </div>
  );
}
