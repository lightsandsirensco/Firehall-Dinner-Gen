import { useEffect, useState } from "react";
import { Link } from "wouter";
import { HallDashboardSection } from "./hall-dashboard-section";
import { Button } from "@/components/ui/button";
import { fetchHallCanteen, setCanteenItemStatus } from "@/lib/hall-canteen/api";
import { HALL_CANTEEN, HALL_DASHBOARD, HALL_LINKED } from "@/lib/brand-copy";
import {
  HALL_CANTEEN_CATEGORY_EMOJI,
  HALL_CANTEEN_STATUS_LABELS,
  type HallCanteenItem,
} from "@shared/hall-canteen/types";
import { cn } from "@/lib/utils";

interface HallNeedAnythingCardProps {
  activeHallId: string | null;
  className?: string;
}

function itemEmoji(item: HallCanteenItem): string {
  return HALL_CANTEEN_CATEGORY_EMOJI[item.category] ?? "➕";
}

export function HallNeedAnythingCard({ activeHallId, className }: HallNeedAnythingCardProps) {
  const [needsAttention, setNeedsAttention] = useState<HallCanteenItem[]>([]);
  const [attentionCount, setAttentionCount] = useState(0);
  const [canUpdate, setCanUpdate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async (hallId: string) => {
    setLoading(true);
    try {
      const payload = await fetchHallCanteen(hallId);
      setNeedsAttention(payload.needs_attention);
      setAttentionCount(payload.needs_attention_count);
      setCanUpdate(payload.can_update);
    } catch {
      setNeedsAttention([]);
      setAttentionCount(0);
      setCanUpdate(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeHallId) {
      setNeedsAttention([]);
      setAttentionCount(0);
      return;
    }
    void load(activeHallId);
  }, [activeHallId]);

  const handleRestock = async (itemId: string) => {
    if (!activeHallId || !canUpdate) return;
    const previous = needsAttention;
    const prevCount = attentionCount;
    setBusyId(itemId);
    setNeedsAttention((items) => items.filter((item) => item.item_id !== itemId));
    setAttentionCount((count) => Math.max(0, count - 1));
    try {
      const payload = await setCanteenItemStatus(activeHallId, itemId, "good");
      setNeedsAttention(payload.needs_attention);
      setAttentionCount(payload.needs_attention_count);
    } catch {
      setNeedsAttention(previous);
      setAttentionCount(prevCount);
    } finally {
      setBusyId(null);
    }
  };

  const listHref = "/hall/canteen";
  const title =
    attentionCount > 0 ? `Is anything urgent? (${attentionCount})` : "Is anything urgent?";

  return (
    <HallDashboardSection
      id="hall-need-anything"
      title={title}
      className={className}
      testId="hall-need-anything-section"
    >
      {!activeHallId ? (
        <p className="text-sm text-muted-foreground">{HALL_LINKED.connect} to track Hall Staples.</p>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : needsAttention.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{HALL_DASHBOARD.needAnythingEmpty}</p>
          <Button asChild variant="outline" className="w-full min-h-[44px]">
            <Link href={listHref}>{HALL_CANTEEN.viewCanteen}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-2">
            {needsAttention.map((item) => (
              <li
                key={item.item_id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/45 bg-card/40 px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium break-words leading-snug">
                    <span className="mr-1" aria-hidden>
                      {itemEmoji(item)}
                    </span>
                    {item.name}
                  </p>
                  <p
                    className={cn(
                      "text-xs font-semibold mt-0.5",
                      item.status === "out"
                        ? "text-red-600 dark:text-red-400"
                        : "text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {item.status === "out" ? "❌" : "⚠️"} {HALL_CANTEEN_STATUS_LABELS[item.status]}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 min-h-[44px]"
                  disabled={busyId === item.item_id || !canUpdate}
                  onClick={() => void handleRestock(item.item_id)}
                >
                  {HALL_CANTEEN.markRestocked}
                </Button>
              </li>
            ))}
          </ul>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild className="min-h-[44px]">
              <Link href={listHref}>{HALL_CANTEEN.viewCanteen}</Link>
            </Button>
          </div>
        </div>
      )}
    </HallDashboardSection>
  );
}

/** @deprecated Use HallNeedAnythingCard */
export const HallSupplyShortagesCard = HallNeedAnythingCard;
