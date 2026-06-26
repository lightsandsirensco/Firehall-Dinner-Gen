import { Loader2 } from "lucide-react";

import type { HallCanteenItem, HallCanteenStatus } from "@shared/hall-canteen/types";

import {
  formatBuyingDayLabel,
  HALL_CANTEEN_CATEGORY_EMOJI,
  HALL_CANTEEN_STATUS_LABELS,
  isBeingPickedUpStatus,
  pickingUpMessage,
} from "@shared/hall-canteen/types";

import { Button } from "@/components/ui/button";
import { HALL_CANTEEN } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

const STATUS_BUTTONS: Array<{
  status: HallCanteenStatus;
  label: string;
  emoji: string;
  active: string;
  idle: string;
}> = [
  {
    status: "good",
    label: "Good",
    emoji: "✅",
    active: "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300",
    idle: "border-border/50 text-muted-foreground hover:bg-muted/40",
  },
  {
    status: "running_low",
    label: "Running Low",
    emoji: "⚠️",
    active: "bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300",
    idle: "border-border/50 text-muted-foreground hover:bg-muted/40",
  },
  {
    status: "out",
    label: "Out",
    emoji: "❌",
    active: "bg-red-500/15 border-red-500/40 text-red-800 dark:text-red-300",
    idle: "border-border/50 text-muted-foreground hover:bg-muted/40",
  },
];

interface HallStapleRowProps {
  item: HallCanteenItem;
  busy?: boolean;
  readOnly?: boolean;
  canManage?: boolean;
  onStatus: (status: HallCanteenStatus) => void;
  onClaim?: () => void;
  onPurchased?: () => void;
  onRelease?: () => void;
  onRemove?: () => void;
}

export function HallStapleRow({
  item,
  busy,
  readOnly,
  canManage,
  onStatus,
  onClaim,
  onPurchased,
  onRelease,
  onRemove,
}: HallStapleRowProps) {
  const emoji = HALL_CANTEEN_CATEGORY_EMOJI[item.category] ?? "➕";
  const claimed = isBeingPickedUpStatus(item.status);
  const displayName = item.picked_up_by_display_name ?? "Crew member";

  return (
    <li
      className="rounded-2xl border border-border/45 bg-card/40 px-3 py-3 space-y-3"
      data-testid={`canteen-item-${item.item_id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-base leading-snug">
          <span className="mr-1.5" aria-hidden>
            {emoji}
          </span>
          {item.name}
        </p>
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wide shrink-0",
            claimed ? "text-sky-700 dark:text-sky-300" : "text-muted-foreground",
          )}
        >
          {HALL_CANTEEN_STATUS_LABELS[item.status]}
        </span>
      </div>

      {claimed ? (
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-3 py-3 space-y-2">
          <div className="text-sm">
            <p className="font-semibold">
              <span className="mr-1.5" aria-hidden>
                👤
              </span>
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {item.picked_up_at ? formatBuyingDayLabel(item.picked_up_at) : HALL_CANTEEN.buyingToday}
              {item.picked_up_at
                ? ` · ${new Date(item.picked_up_at).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}`
                : null}
            </p>
            <p className="text-xs text-sky-700 dark:text-sky-300 mt-1">{pickingUpMessage(displayName)}</p>
          </div>
          {!readOnly ? (
            <div className="flex flex-wrap gap-2">
              {onPurchased ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="min-h-[44px]"
                  disabled={busy}
                  onClick={onPurchased}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" aria-hidden /> : null}
                  {HALL_CANTEEN.purchased}
                </Button>
              ) : null}
              {canManage && onRelease ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-[44px]"
                  disabled={busy}
                  onClick={onRelease}
                >
                  {HALL_CANTEEN.releasePickup}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {!readOnly && !claimed ? (
        <div className="grid grid-cols-3 gap-2">
          {STATUS_BUTTONS.map((button) => {
            const selected = item.status === button.status;
            return (
              <button
                key={button.status}
                type="button"
                disabled={busy}
                onClick={() => onStatus(button.status)}
                className={cn(
                  "min-h-[44px] rounded-xl border text-sm font-semibold transition-colors touch-manipulation",
                  "inline-flex items-center justify-center gap-1",
                  selected ? button.active : button.idle,
                )}
                aria-pressed={selected}
              >
                {busy && selected ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <span aria-hidden>{button.emoji}</span>
                )}
                <span>{button.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {!readOnly && !claimed && onClaim && (item.status === "running_low" || item.status === "out") ? (
        <Button
          type="button"
          variant="outline"
          className="w-full min-h-[44px]"
          disabled={busy}
          onClick={onClaim}
        >
          {HALL_CANTEEN.imBuyingThis}
        </Button>
      ) : null}

      {!readOnly && onRemove ? (
        <button
          type="button"
          disabled={busy}
          onClick={onRemove}
          className="text-sm text-muted-foreground hover:text-destructive min-h-11 px-2 touch-manipulation"
        >
          Archive item
        </button>
      ) : null}
    </li>
  );
}
