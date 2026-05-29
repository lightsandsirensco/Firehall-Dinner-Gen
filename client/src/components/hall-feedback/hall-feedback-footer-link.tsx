import { HALL_FEEDBACK_COPY } from "@shared/hall-feedback/copy";
import { useHallFeedbackOptional } from "@/lib/hall-feedback/context";

export function HallFeedbackFooterLink({ className }: { className?: string }) {
  const ctx = useHallFeedbackOptional();

  return (
    <button
      type="button"
      onClick={() => ctx?.openFeedback("footer")}
      className={className}
      data-testid="link-hall-feedback-footer"
    >
      {HALL_FEEDBACK_COPY.footerLink}
    </button>
  );
}
