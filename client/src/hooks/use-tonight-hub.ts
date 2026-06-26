import { useEffect, useMemo, useState } from "react";
import type { HallHistoryEntry } from "@shared/hall-profile/types";
import type { HallCanteenItem } from "@shared/hall-canteen/types";
import type { HallShoppingListPayload } from "@shared/hall-shopping-list/types";
import type { HallVoteResponse } from "@shared/schema";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import { fetchHallCanteen, setCanteenItemStatus } from "@/lib/hall-canteen/api";
import { fetchHallShoppingList } from "@/lib/hall-shopping-list/api";
import { useHallDashboard } from "@/hooks/use-hall-dashboard";
import { useHallHistory } from "@/hooks/use-hall-history";
import { useHallMembership } from "@/lib/hall-membership/context";
import { useHallFeature } from "@/lib/billing/hooks";
import { useToast } from "@/hooks/use-toast";

function entryRecipeHref(entry?: HallHistoryEntry): string | undefined {
  if (!entry) return undefined;
  if (entry.recipePath) return entry.recipePath;
  if (entry.recipeSlug) return approvedCatalogRecipePath(entry.recipeSlug);
  return undefined;
}

export function useTonightHub() {
  const dashboard = useHallDashboard();
  const history = useHallHistory();
  const { detail } = useHallMembership();
  const hallId = dashboard.activeHallId;
  const canManageCanteen = Boolean(hallId);
  const canUseShoppingList = useHallFeature("shared_shopping_lists", hallId);
  const { toast } = useToast();

  const [vote, setVote] = useState<HallVoteResponse | null>(null);
  const [voteLoading, setVoteLoading] = useState(false);
  const [shopping, setShopping] = useState<HallShoppingListPayload | null>(null);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [needsAttention, setNeedsAttention] = useState<HallCanteenItem[]>([]);
  const [canteenLoading, setCanteenLoading] = useState(false);
  const [restockingId, setRestockingId] = useState<string | null>(null);

  const voteId = dashboard.lastVote?.meta?.voteId;

  useEffect(() => {
    if (!voteId) {
      setVote(null);
      return;
    }
    let cancelled = false;
    setVoteLoading(true);
    void fetch(`/api/hall-vote/${voteId}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HallVoteResponse | null) => {
        if (!cancelled) setVote(data);
      })
      .finally(() => {
        if (!cancelled) setVoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [voteId]);

  useEffect(() => {
    if (!hallId) {
      setShopping(null);
      return;
    }
    let cancelled = false;
    setShoppingLoading(true);
    void fetchHallShoppingList(hallId)
      .then((payload) => {
        if (!cancelled) setShopping(payload);
      })
      .catch(() => {
        if (!cancelled) setShopping(null);
      })
      .finally(() => {
        if (!cancelled) setShoppingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hallId]);

  useEffect(() => {
    if (!hallId) {
      setNeedsAttention([]);
      return;
    }
    let cancelled = false;
    setCanteenLoading(true);
    void fetchHallCanteen(hallId)
      .then((payload) => {
        if (!cancelled) setNeedsAttention(payload.needs_attention);
      })
      .catch(() => {
        if (!cancelled) setNeedsAttention([]);
      })
      .finally(() => {
        if (!cancelled) setCanteenLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hallId]);

  const lastGenerated = useMemo(
    () => history.entries.find((entry) => entry.type === "meal_generated"),
    [history.entries],
  );
  const lastWheel = history.wheelResults[0];
  const lastMealCooked = history.lastMealCooked;
  const tonightPick = lastMealCooked ?? lastWheel ?? lastGenerated;

  const shoppingHref = hallId
    ? `/halls/${hallId}#hall-shared-shopping-list`
    : "/hall/join";
  const runnerHref = hallId ? `/halls/${hallId}#hall-list-runner` : "/hall/join";
  const voteHref = voteId ? `/vote/${voteId}` : undefined;
  const pendingItems = shopping?.items.filter((item) => !item.purchased).length ?? 0;
  const runnerName = shopping?.list.runner_name?.trim();

  const voteStatusText = useMemo(() => {
    if (voteLoading) return "Checking vote…";
    if (vote) {
      if (vote.status === "open") {
        return `${vote.total_votes} vote${vote.total_votes === 1 ? "" : "s"} · Open`;
      }
      const winner = vote.winner != null ? vote.options.find((o) => o.option_id === vote.winner)?.name : undefined;
      return winner ? `Closed · ${winner} won` : "Closed";
    }
    if (dashboard.lastVote) return "Last vote unavailable";
    return "No vote started";
  }, [vote, voteLoading, dashboard.lastVote]);

  const markRestocked = async (itemId: string) => {
    if (!hallId) return;
    const previous = needsAttention;
    setRestockingId(itemId);
    setNeedsAttention((items) => items.filter((item) => item.item_id !== itemId));
    try {
      const payload = await setCanteenItemStatus(hallId, itemId, "good");
      setNeedsAttention(payload.needs_attention);
    } catch {
      setNeedsAttention(previous);
      toast({ title: "Could not update staple", variant: "destructive" });
    } finally {
      setRestockingId(null);
    }
  };

  return {
    hallId,
    hallName: dashboard.hallName,
    members: detail?.members ?? dashboard.members,
    lastGenerated,
    lastGeneratedHref: entryRecipeHref(lastGenerated),
    tonightPick,
    tonightRecipeHref: entryRecipeHref(tonightPick),
    cookHref: entryRecipeHref(lastMealCooked),
    cookTitle: lastMealCooked?.title ?? tonightPick?.title,
    shoppingHref,
    runnerHref,
    shoppingLoading,
    pendingItems,
    runnerName,
    voteHref,
    voteStatusText,
    voteLoading,
    voteOpen: vote?.status === "open",
    needsAttention,
    canteenLoading,
    restockingId,
    markRestocked,
    canManageCanteen,
    canUseShoppingList,
  };
}
