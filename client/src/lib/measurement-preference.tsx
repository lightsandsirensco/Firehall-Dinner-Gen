import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { MeasurementSystem } from "@shared/measurements";

export const MEASUREMENT_PREFERENCE_KEY = "firehall-measurement-system";
export const MEASUREMENT_SYSTEM_CHANGE_EVENT = "firehall-measurement-system-change";

function readStoredPreference(): MeasurementSystem {
  if (typeof window === "undefined") return "us";
  return localStorage.getItem(MEASUREMENT_PREFERENCE_KEY) === "metric" ? "metric" : "us";
}

type MeasurementSystemContextValue = {
  system: MeasurementSystem;
  setSystem: (system: MeasurementSystem) => void;
};

const MeasurementSystemContext = createContext<MeasurementSystemContextValue | null>(null);

export function MeasurementSystemProvider({ children }: { children: ReactNode }) {
  const [system, setSystemState] = useState<MeasurementSystem>(readStoredPreference);

  const setSystem = useCallback((next: MeasurementSystem) => {
    setSystemState(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(MEASUREMENT_PREFERENCE_KEY, next);
      window.dispatchEvent(
        new CustomEvent(MEASUREMENT_SYSTEM_CHANGE_EVENT, { detail: next }),
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onStorage = (event: StorageEvent) => {
      if (event.key !== MEASUREMENT_PREFERENCE_KEY || !event.newValue) return;
      const next = event.newValue === "metric" ? "metric" : "us";
      setSystemState(next);
    };

    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<MeasurementSystem>).detail;
      if (detail === "us" || detail === "metric") {
        setSystemState(detail);
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(MEASUREMENT_SYSTEM_CHANGE_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(MEASUREMENT_SYSTEM_CHANGE_EVENT, onCustom);
    };
  }, []);

  return (
    <MeasurementSystemContext.Provider value={{ system, setSystem }}>
      {children}
    </MeasurementSystemContext.Provider>
  );
}

export function useMeasurementSystem(): [MeasurementSystem, (system: MeasurementSystem) => void] {
  const ctx = useContext(MeasurementSystemContext);
  if (!ctx) {
    throw new Error("useMeasurementSystem must be used within MeasurementSystemProvider");
  }
  return [ctx.system, ctx.setSystem];
}
