import type { RitualCheck, RitualPhase, RitualSnapshot } from "./shift-ritual";
import { resolveRitualPhase } from "./shift-ritual";

export function buildRitualChecks(
  snap: RitualSnapshot,
  phase: RitualPhase = resolveRitualPhase(snap),
): RitualCheck[] {
  const dinnerDone = Boolean(snap.dinnerTitle);
  const voteDone = !snap.hasHall || !snap.voteOpen;
  const shopDone = !snap.hasHall || snap.pendingItems === 0;

  const checks: RitualCheck[] = [
    {
      id: "dinner",
      label: "What's for dinner?",
      detail: dinnerDone
        ? snap.dinnerTitle!
        : "Not locked yet — pick a meal",
      done: dinnerDone && phase !== "decide",
      active: phase === "decide",
      href: dinnerDone ? snap.recipeCookHref || snap.cookHref || "/generator" : "/generator",
    },
  ];

  if (snap.hasHall) {
    checks.push({
      id: "vote",
      label: "Has the crew voted?",
      detail: snap.voteLoading
        ? "Checking vote…"
        : snap.voteOpen
          ? snap.voteStatusText || "Vote is open"
          : snap.voteStatusText && snap.voteStatusText !== "No vote started"
            ? snap.voteStatusText
            : dinnerDone
              ? "No open vote — dinner can proceed"
              : "Vote after you have options",
      done: voteDone && dinnerDone,
      active: phase === "vote",
      href: snap.voteOpen && snap.voteHref ? snap.voteHref : undefined,
    });

    checks.push({
      id: "shop",
      label: "Does anyone need to shop?",
      detail: snap.shoppingLoading
        ? "Checking list…"
        : snap.pendingItems > 0
          ? `${snap.pendingItems} item${snap.pendingItems === 1 ? "" : "s"} still to grab`
          : dinnerDone
            ? "List is clear for tonight"
            : "Lock dinner first — then shop",
      done: shopDone && dinnerDone,
      active: phase === "shop",
      href: snap.pendingItems > 0 ? snap.shoppingHref : undefined,
    });
  }

  return checks;
}
