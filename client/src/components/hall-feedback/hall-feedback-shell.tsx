import { useLocation } from "wouter";
import { HallFeedbackFab } from "./hall-feedback-fab";
import { HallFeedbackModal } from "./hall-feedback-modal";
import { useHallFeedback } from "@/lib/hall-feedback/context";

const HIDDEN_PREFIXES = ["/admin"];
/** Full-width decision CTAs sit under the FAB on phones; these pages keep the footer feedback link instead. */
const HIDDEN_ON_MOBILE = ["/tonight"];

export function HallFeedbackShell() {
  const [location] = useLocation();
  const { open, setOpen, source, openFeedback } = useHallFeedback();

  const hidden = HIDDEN_PREFIXES.some((p) => location === p || location.startsWith(`${p}/`));
  if (hidden) return null;
  const hiddenOnMobile = HIDDEN_ON_MOBILE.includes(location);

  return (
    <>
      <HallFeedbackFab
        onClick={() => openFeedback("floating_button")}
        className={hiddenOnMobile ? "max-lg:hidden" : undefined}
      />
      <HallFeedbackModal open={open} onOpenChange={setOpen} source={source} />
    </>
  );
}
