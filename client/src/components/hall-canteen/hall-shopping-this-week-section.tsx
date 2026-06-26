import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HALL_CANTEEN } from "@/lib/brand-copy";
import type { HallCanteenItem } from "@shared/hall-canteen/types";
import {
  formatBuyingDayLabel,
  getShoppingThisWeekItems,
  isBeingPickedUpStatus,
  pickingUpMessage,
  type HallCanteenPayload,
} from "@shared/hall-canteen/types";
import { cn } from "@/lib/utils";

interface HallShoppingThisWeekSectionProps {
  data: HallCanteenPayload;
  busyId: string | null;
  onClaim: (itemId: string) => void;
  onPurchased: (itemId: string) => void;
  onRelease?: (itemId: string) => void;
}

export function HallShoppingThisWeekSection({
  data,
  busyId,
  onClaim,
  onPurchased,
  onRelease,
}: HallShoppingThisWeekSectionProps) {
  const items = getShoppingThisWeekItems(data);

  return (
    <section
      className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-4 space-y-3"
      data-testid="hall-shopping-this-week"
      aria-labelledby="shopping-this-week-heading"
    >
      <div className="space-y-1">
        <h2 id="shopping-this-week-heading" className="text-base font-semibold">
          {HALL_CANTEEN.shoppingThisWeek}
        </h2>
        <p className="text-xs text-muted-foreground">{HALL_CANTEEN.shoppingThisWeekSubtitle}</p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{HALL_CANTEEN.shoppingThisWeekEmpty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <ShoppingThisWeekRow
              key={item.item_id}
              item={item}
              busy={busyId === item.item_id}
              canUpdate={data.can_update}
              canManage={data.can_manage_list}
              onClaim={() => onClaim(item.item_id)}
              onPurchased={() => onPurchased(item.item_id)}
              onRelease={onRelease ? () => onRelease(item.item_id) : undefined}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ShoppingThisWeekRow({
  item,
  busy,
  canUpdate,
  canManage,
  onClaim,
  onPurchased,
  onRelease,
}: {
  item: HallCanteenItem;
  busy: boolean;
  canUpdate: boolean;
  canManage: boolean;
  onClaim: () => void;
  onPurchased: () => void;
  onRelease?: () => void;
}) {
  const claimed = isBeingPickedUpStatus(item.status);
  const displayName = item.picked_up_by_display_name ?? "Crew member";
  const pickedUpAt = item.picked_up_at
    ? new Date(item.picked_up_at).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <li
      className={cn(
        "rounded-xl border px-3 py-3 space-y-2",
        claimed ? "border-sky-500/30 bg-sky-500/5" : "border-border/45 bg-card/60",
      )}
      data-testid={`shopping-this-week-item-${item.item_id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-snug">
            <span className="mr-2 text-muted-foreground" aria-hidden>
              {claimed ? "👤" : "☐"}
            </span>
            {item.name}
          </p>
          {claimed ? (
            <div className="text-xs text-muted-foreground space-y-0.5 pl-6">
              <p className="font-semibold text-foreground">{displayName}</p>
              <p>
                {item.picked_up_at ? formatBuyingDayLabel(item.picked_up_at) : HALL_CANTEEN.buyingToday}
                {pickedUpAt ? ` · ${pickedUpAt}` : null}
              </p>
              <p className="text-sky-700 dark:text-sky-300">{pickingUpMessage(displayName)}</p>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          {claimed ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="min-h-[44px] gap-1.5"
              disabled={busy || !canUpdate}
              onClick={onPurchased}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : null}
              {HALL_CANTEEN.purchased}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="min-h-[44px] gap-1.5"
              disabled={busy || !canUpdate}
              onClick={onClaim}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : null}
              {HALL_CANTEEN.imBuyingThis}
            </Button>
          )}
          {claimed && canManage && onRelease ? (
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
      </div>
    </li>
  );
}
