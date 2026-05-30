import { useCallback, useState } from "react";
import type { MeasurementSystem } from "@shared/measurements";

export const MEASUREMENT_PREFERENCE_KEY = "firehall-measurement-system";

function readStoredPreference(): MeasurementSystem {
  if (typeof window === "undefined") return "us";
  return localStorage.getItem(MEASUREMENT_PREFERENCE_KEY) === "metric" ? "metric" : "us";
}

export function useMeasurementSystem(): [MeasurementSystem, (system: MeasurementSystem) => void] {
  const [system, setSystemState] = useState<MeasurementSystem>(readStoredPreference);

  const setSystem = useCallback((next: MeasurementSystem) => {
    setSystemState(next);
    localStorage.setItem(MEASUREMENT_PREFERENCE_KEY, next);
  }, []);

  return [system, setSystem];
}
