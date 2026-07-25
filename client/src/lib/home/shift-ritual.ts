/**
 * Evening dinner ritual — ~4pm through cook.
 * Pure helpers for Home habit formation (no new Hall features).
 */

export type RitualPhase =
  | "decide"
  | "vote"
  | "shop"
  | "cook"
  | "continue"
  | "settled";

export type RitualNextAction = {
  href: string;
  label: string;
  reason: string;
  phase: RitualPhase;
};

export type RitualSnapshot = {
  dinnerTitle: string | null;
  voteOpen: boolean;
  voteHref?: string;
  voteStatusText?: string;
  voteLoading?: boolean;
  pendingItems: number;
  shoppingHref: string;
  shoppingLoading?: boolean;
  runnerName?: string | null;
  cookHref?: string;
  recipeCookHref?: string;
  /** Last cooked meal matches tonight — resume cook mode */
  cookingInProgress?: boolean;
  hasHall: boolean;
};

export function getLocalHour(now = new Date()): number {
  return now.getHours();
}

export function isDinnerWindow(hour = getLocalHour()): boolean {
  return hour >= 15 && hour < 20;
}

export function ritualEyebrow(hour = getLocalHour()): string {
  if (hour >= 15 && hour < 17) return "Dinner window";
  if (hour >= 17 && hour < 20) return "Tonight's shift";
  if (hour >= 20) return "Evening";
  return "Tonight's dinner";
}

export function ritualGreeting(options: {
  dinnerTitle: string | null;
  hour?: number;
}): string {
  const hour = options.hour ?? getLocalHour();
  if (options.dinnerTitle) return options.dinnerTitle;
  if (hour >= 15 && hour < 17) return "Time to lock dinner";
  if (hour >= 17 && hour < 20) return "What's for dinner?";
  if (hour >= 20) return "Still need a meal?";
  return "What's for dinner?";
}

export function resolveRitualPhase(snap: RitualSnapshot): RitualPhase {
  if (!snap.dinnerTitle) return "decide";
  if (snap.hasHall && snap.voteOpen && snap.voteHref) return "vote";
  if (snap.hasHall && snap.pendingItems > 0) return "shop";
  if (snap.cookingInProgress && (snap.cookHref || snap.recipeCookHref)) {
    return "continue";
  }
  if (snap.recipeCookHref || snap.cookHref) return "cook";
  return "settled";
}

export function resolveRitualNextAction(snap: RitualSnapshot): RitualNextAction {
  const phase = resolveRitualPhase(snap);

  if (phase === "decide") {
    return {
      phase,
      href: "/generator",
      label: "Pick Tonight's Meal",
      reason: "Nothing locked yet — decide before the crew starts debating.",
    };
  }

  if (phase === "vote" && snap.voteHref) {
    return {
      phase,
      href: snap.voteHref,
      label: "Cast your vote",
      reason: "Vote is open — dinner isn't locked until the crew picks.",
    };
  }

  if (phase === "shop") {
    return {
      phase,
      href: snap.shoppingHref,
      label:
        snap.pendingItems === 1
          ? "Grab 1 thing for dinner"
          : `Grab ${snap.pendingItems} things for dinner`,
      reason: snap.runnerName
        ? `List ready · runner: ${snap.runnerName}`
        : "Someone needs to shop before you can cook.",
    };
  }

  if (phase === "continue" && (snap.cookHref || snap.recipeCookHref)) {
    return {
      phase: "continue",
      href: (snap.cookHref || snap.recipeCookHref) as string,
      label: "Continue cooking",
      reason: snap.dinnerTitle
        ? `Resume ${snap.dinnerTitle}`
        : "Pick up where you left off.",
    };
  }

  if (phase === "cook" && (snap.recipeCookHref || snap.cookHref)) {
    return {
      phase: "cook",
      href: (snap.recipeCookHref || snap.cookHref) as string,
      label: "Start cooking",
      reason: snap.dinnerTitle
        ? `Tonight: ${snap.dinnerTitle}`
        : "Dinner is set — open cook mode.",
    };
  }

  return {
    phase: "settled",
    href: snap.recipeCookHref || snap.cookHref || "/tonight",
    label: snap.dinnerTitle ? "Open tonight's recipe" : "Pick Tonight's Meal",
    reason: snap.dinnerTitle
      ? "Dinner's locked — open the recipe anytime tonight."
      : "Nothing locked yet.",
  };
}

export type RitualCheck = {
  id: "dinner" | "vote" | "shop";
  label: string;
  detail: string;
  done: boolean;
  active: boolean;
  href?: string;
};
