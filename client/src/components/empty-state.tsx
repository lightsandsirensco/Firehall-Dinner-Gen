import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onGenerate?: () => void;
  generateDisabled?: boolean;
}

export function EmptyState({ onGenerate, generateDisabled }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[360px] sm:min-h-[400px] text-center fade-up px-4"
      data-testid="empty-state"
    >
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative">
        <div
          className="absolute inset-0 rounded-full bg-primary/5 animate-ping"
          style={{ animationDuration: "2.5s" }}
        />
        <Flame className="w-10 h-10 text-primary/60" />
      </div>
      <h2
        className="font-heading text-2xl sm:text-3xl tracking-wide text-foreground mb-2"
        data-testid="text-empty-title"
      >
        The table's waiting
      </h2>
      <p
        className="text-muted-foreground text-sm max-w-sm mb-4"
        data-testid="text-empty-description"
      >
        Tell us who's eating and how much time you've got — we'll put a full hall dinner on the board.
      </p>
      {onGenerate && (
        <Button
          size="lg"
          className="btn-generate font-heading text-base tracking-wider min-h-11 px-8 lg:hidden"
          onClick={onGenerate}
          disabled={generateDisabled}
          data-testid="button-empty-generate"
        >
          <Flame className="w-4 h-4 mr-2" />
          Put dinner on the board
        </Button>
      )}
      <p className="text-muted-foreground/60 text-xs max-w-xs mt-4" data-testid="text-empty-hint">
        Real portions. Real sides. No meal-prep nonsense.
      </p>
    </div>
  );
}
