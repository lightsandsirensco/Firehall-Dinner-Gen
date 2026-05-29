import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { HallFeedbackSource } from "@shared/hall-feedback/types";

type HallFeedbackContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  source: HallFeedbackSource;
  openFeedback: (source?: HallFeedbackSource) => void;
};

const HallFeedbackContext = createContext<HallFeedbackContextValue | null>(null);

export function HallFeedbackProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<HallFeedbackSource>("unknown");

  const openFeedback = useCallback((nextSource: HallFeedbackSource = "floating_button") => {
    setSource(nextSource);
    setOpen(true);
  }, []);

  const value = useMemo(
    () => ({ open, setOpen, source, openFeedback }),
    [open, source, openFeedback],
  );

  return <HallFeedbackContext.Provider value={value}>{children}</HallFeedbackContext.Provider>;
}

export function useHallFeedback(): HallFeedbackContextValue {
  const ctx = useContext(HallFeedbackContext);
  if (!ctx) {
    throw new Error("useHallFeedback must be used within HallFeedbackProvider");
  }
  return ctx;
}

/** Safe when provider is absent (e.g. tests). */
export function useHallFeedbackOptional(): HallFeedbackContextValue | null {
  return useContext(HallFeedbackContext);
}
