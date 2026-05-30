import {
  CREW_RATING_COMPLAINT_LABELS,
  type CrewRatingComplaintCategory,
} from "@shared/recipe-crew-ratings/types";
import { cn } from "@/lib/utils";

const COMPLAINT_OPTIONS: CrewRatingComplaintCategory[] = [
  "too_complicated",
  "too_expensive",
  "not_enough_food",
  "instructions_unclear",
  "didnt_taste_great",
  "image_mismatch",
  "other",
];

interface NegativeFeedbackSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (category: CrewRatingComplaintCategory) => void;
}

export function NegativeFeedbackSheet({ open, onClose, onSelect }: NegativeFeedbackSheetProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crew-rating-feedback-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/40 bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="crew-rating-feedback-title" className="font-heading text-lg tracking-wide">
          What was the issue?
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">Optional — helps us improve hall recipes.</p>
        <ul className="mt-4 space-y-2">
          {COMPLAINT_OPTIONS.map((key) => (
            <li key={key}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-xl border border-border/30 bg-muted/20 px-4 py-3 text-left text-sm",
                  "hover:bg-muted/40 active:scale-[0.99] transition-colors touch-manipulation min-h-11",
                )}
                onClick={() => onSelect(key)}
              >
                {CREW_RATING_COMPLAINT_LABELS[key]}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground py-2"
          onClick={onClose}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
