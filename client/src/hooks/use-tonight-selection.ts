import { useEffect, useState } from "react";
import {
  getTonightSelection,
  TONIGHT_SELECTION_CHANGED_EVENT,
  type TonightSelection,
} from "@/lib/tonight-selection-store";

function sameSelection(a: TonightSelection | null, b: TonightSelection | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useTonightSelection(): TonightSelection | null {
  const [selection, setSelection] = useState(() => getTonightSelection());

  useEffect(() => {
    const refresh = () => {
      const next = getTonightSelection();
      setSelection((prev) => (sameSelection(prev, next) ? prev : next));
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener(TONIGHT_SELECTION_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    document.addEventListener("visibilitychange", onVisible);
    // Re-check periodically so an open tab rolls over to an empty state at the shift boundary.
    const tick = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener(TONIGHT_SELECTION_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(tick);
    };
  }, []);

  return selection;
}
