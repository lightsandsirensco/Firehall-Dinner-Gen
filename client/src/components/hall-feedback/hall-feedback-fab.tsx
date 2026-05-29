import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { HALL_FEEDBACK_COPY } from "@shared/hall-feedback/copy";

type HallFeedbackFabProps = {
  onClick: () => void;
  className?: string;
};

export function HallFeedbackFab({ onClick, className }: HallFeedbackFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "hall-feedback-fab group inline-flex items-center gap-2 rounded-full",
        "border border-primary/25 bg-[hsl(0_0%_8%)]/95 text-foreground/90",
        "px-3.5 py-2.5 text-xs font-heading uppercase tracking-[0.14em]",
        "shadow-[0_0_24px_hsl(var(--primary)/0.12),0_8px_32px_rgba(0,0,0,0.45)]",
        "backdrop-blur-md transition-all duration-300",
        "hover:border-primary/45 hover:text-foreground hover:shadow-[0_0_28px_hsl(var(--primary)/0.22),0_10px_36px_rgba(0,0,0,0.5)]",
        "active:scale-[0.98] touch-manipulation",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      data-testid="button-hall-feedback-fab"
      aria-label={HALL_FEEDBACK_COPY.fabLabel}
    >
      <Radio
        className="w-3.5 h-3.5 text-primary/80 transition-transform duration-300 group-hover:scale-110"
        aria-hidden
      />
      <span>{HALL_FEEDBACK_COPY.fabLabel}</span>
    </button>
  );
}
