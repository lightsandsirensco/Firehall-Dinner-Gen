import { useLocation } from "wouter";
import { HallFeedbackFab } from "./hall-feedback-fab";
import { HallFeedbackModal } from "./hall-feedback-modal";
import { useHallFeedback } from "@/lib/hall-feedback/context";

const HIDDEN_PREFIXES = ["/admin"];

export function HallFeedbackShell() {
  const [location] = useLocation();
  const { open, setOpen, source, openFeedback } = useHallFeedback();

  const hidden = HIDDEN_PREFIXES.some((p) => location === p || location.startsWith(`${p}/`));
  if (hidden) return null;

  return (
    <>
      <HallFeedbackFab onClick={() => openFeedback("floating_button")} />
      <HallFeedbackModal open={open} onOpenChange={setOpen} source={source} />
    </>
  );
}
