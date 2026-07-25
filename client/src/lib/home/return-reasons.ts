/**
 * Natural reasons to open Firehall Meals before dinner.
 * Only surfaces real open loops — no streaks, points, or fake urgency.
 */

import type { RitualPhase, RitualSnapshot } from "./shift-ritual";
import { resolveRitualPhase } from "./shift-ritual";

export type ReturnReasonId =
  | "dinner_unset"
  | "vote_open"
  | "shopping"
  | "continue_cook"
  | "start_cook"
  | "favorites"
  | "suggested";

export type ReturnReason = {
  id: ReturnReasonId;
  label: string;
  detail: string;
  href: string;
  /** True when this is the primary ritual next step */
  primary?: boolean;
};

export function buildReturnReasons(
  snap: RitualSnapshot,
  options: {
    savedCount: number;
    suggestCount: number;
    phase?: RitualPhase;
  },
): ReturnReason[] {
  const phase = options.phase ?? resolveRitualPhase(snap);
  const reasons: ReturnReason[] = [];

  if (phase === "decide" || !snap.dinnerTitle) {
    reasons.push({
      id: "dinner_unset",
      label: "Tonight's meal isn't locked",
      detail: "Open to decide before the crew starts arguing",
      href: "/generator",
      primary: phase === "decide",
    });
  }

  if (snap.hasHall && snap.voteOpen && snap.voteHref) {
    reasons.push({
      id: "vote_open",
      label: "Crew vote is open",
      detail: snap.voteStatusText || "Cast your vote so dinner can lock",
      href: snap.voteHref,
      primary: phase === "vote",
    });
  }

  if (snap.hasHall && snap.pendingItems > 0) {
    reasons.push({
      id: "shopping",
      label:
        snap.pendingItems === 1
          ? "1 thing still to buy"
          : `${snap.pendingItems} things still to buy`,
      detail: snap.runnerName
        ? `Shopping list · runner: ${snap.runnerName}`
        : "Finish the shop before cook time",
      href: snap.shoppingHref,
      primary: phase === "shop",
    });
  }

  if (phase === "continue" && (snap.cookHref || snap.recipeCookHref)) {
    reasons.push({
      id: "continue_cook",
      label: "Continue cooking",
      detail: snap.dinnerTitle ? `Resume ${snap.dinnerTitle}` : "Pick up cook mode",
      href: (snap.cookHref || snap.recipeCookHref) as string,
      primary: true,
    });
  } else if (
    (phase === "cook" || phase === "settled") &&
    (snap.recipeCookHref || snap.cookHref) &&
    snap.dinnerTitle
  ) {
    reasons.push({
      id: "start_cook",
      label: phase === "settled" ? "Tonight's recipe" : "Start cooking",
      detail: snap.dinnerTitle,
      href: (snap.recipeCookHref || snap.cookHref) as string,
      primary: phase === "cook",
    });
  }

  if (phase === "decide" && options.savedCount > 0) {
    reasons.push({
      id: "favorites",
      label:
        options.savedCount === 1
          ? "1 saved meal ready"
          : `${options.savedCount} saved meals ready`,
      detail: "Cook a favorite instead of debating",
      href: "/me/saved",
    });
  }

  if (phase === "decide" && options.suggestCount > 0) {
    reasons.push({
      id: "suggested",
      label: "Recent picks you can cook again",
      detail: "From meals you've already opened",
      href: "#home-suggest",
    });
  }

  // Primary first, then urgency order
  const order: ReturnReasonId[] = [
    "continue_cook",
    "vote_open",
    "shopping",
    "dinner_unset",
    "start_cook",
    "favorites",
    "suggested",
  ];
  reasons.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return reasons;
}
