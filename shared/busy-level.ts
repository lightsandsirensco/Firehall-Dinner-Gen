/** Internal generation value — not shown in the product UI (S2). */
export type BusyLevel = "quiet" | "average" | "busy" | "slammed";

/**
 * Derive template-fit busy_level from cooking time chips.
 * Short windows → busier shift templates; longer windows → slower/more involved templates.
 */
export function inferBusyLevelFromTime(timeAvailable: string): BusyLevel {
  switch (timeAvailable) {
    case "15-25":
      return "slammed";
    case "20-30":
      return "busy";
    case "25-40":
    case "30-45":
      return "average";
    case "45-60":
    case "60-90":
      return "quiet";
    default:
      return "average";
  }
}

/** True when the crew selected a short cooking window (~25 min or less). */
export function isQuickTimeWindow(timeAvailable: string): boolean {
  return timeAvailable === "15-25" || timeAvailable === "20-30";
}
