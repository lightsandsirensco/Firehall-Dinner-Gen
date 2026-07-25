import { ExternalLink, Copy } from "lucide-react";
import type { HallCanteenOrderItem, HallCanteenWeeklyOrder } from "@shared/hall-canteen/types";
import {
  CANTEEN_ORDER_ITEM_STATUS_LABELS,
  CANTEEN_RECEIVE_STATUS_LABELS,
  COSTCO_SAME_DAY_URL,
} from "@shared/hall-canteen/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface WeeklyOrderSectionProps {
  order: HallCanteenWeeklyOrder | null;
  canManage: boolean;
  canExportCsv: boolean;
  canUseProductUrls: boolean;
  currentUserId?: string | null;
  busyId: string | null;
  onClaim: (orderItemId: string) => void;
  onRelease: (orderItemId: string) => void;
  onMarkAddedToCostco: (orderItemId: string) => void;
  onMarkUnavailable: (orderItemId: string) => void;
  onReceive: (
    orderItemId: string,
    status: "received_full" | "partial" | "missing" | "damaged" | "substituted",
  ) => void;
  onBuildCostco: () => void;
  onCompleteDelivery: () => void;
  receivingMode?: boolean;
}

function OrderItemCard({
  item,
  canManage,
  canUseProductUrls,
  currentUserId,
  busy,
  receivingMode,
  onClaim,
  onRelease,
  onMarkAddedToCostco,
  onMarkUnavailable,
  onReceive,
}: {
  item: HallCanteenOrderItem;
  canManage: boolean;
  canUseProductUrls: boolean;
  currentUserId?: string | null;
  busy: boolean;
  receivingMode: boolean;
  onClaim: () => void;
  onRelease: () => void;
  onMarkAddedToCostco: () => void;
  onMarkUnavailable: () => void;
  onReceive: (status: "received_full" | "partial" | "missing" | "damaged" | "substituted") => void;
}) {
  const { toast } = useToast();
  const mine = item.assigned_buyer_user_id && item.assigned_buyer_user_id === currentUserId;
  const claimed = item.status === "buying_this" || Boolean(item.assigned_buyer_user_id);

  const copySearch = async () => {
    const term = item.costco_search_term || item.name;
    try {
      await navigator.clipboard.writeText(term);
      toast({ title: "Search term copied" });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  return (
    <li className="rounded-2xl border border-border/45 bg-card/50 px-3 py-3 space-y-2">
      <div>
        <p className="font-semibold text-base leading-snug">{item.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Qty {item.requested_qty}
          {item.package_size ? ` · ${item.package_size}` : ""}
          {item.preferred_brand ? ` · ${item.preferred_brand}` : ""}
          {" · "}
          {CANTEEN_ORDER_ITEM_STATUS_LABELS[item.status]}
          {item.assigned_buyer_display_name
            ? ` · ${item.assigned_buyer_display_name}`
            : ""}
        </p>
        {item.notes ? <p className="text-sm text-muted-foreground italic mt-1">“{item.notes}”</p> : null}
        {item.receive_status && item.receive_status !== "pending" ? (
          <p className="text-xs font-medium mt-1">
            Receive: {CANTEEN_RECEIVE_STATUS_LABELS[item.receive_status]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" className="min-h-11" onClick={() => void copySearch()}>
          <Copy className="w-3.5 h-3.5 mr-1" aria-hidden />
          Copy Search Term
        </Button>
        {canUseProductUrls && item.product_url ? (
          <Button type="button" size="sm" variant="outline" className="min-h-11" asChild>
            <a href={item.product_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5 mr-1" aria-hidden />
              Open Product Link
            </a>
          </Button>
        ) : null}

        {!claimed ? (
          <Button type="button" size="sm" className="min-h-11" disabled={busy} onClick={onClaim}>
            Buying This
          </Button>
        ) : mine || canManage ? (
          <Button type="button" size="sm" variant="outline" className="min-h-11" disabled={busy} onClick={onRelease}>
            Release
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground self-center px-1">Reserved</span>
        )}

        {canManage ? (
          <>
            <Button type="button" size="sm" variant="outline" className="min-h-11" disabled={busy} onClick={onMarkAddedToCostco}>
              Mark Added to Costco
            </Button>
            <Button type="button" size="sm" variant="outline" className="min-h-11" disabled={busy} onClick={onMarkUnavailable}>
              Mark Unavailable
            </Button>
          </>
        ) : null}
      </div>

      {receivingMode && canManage ? (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-border/30">
          {(
            [
              ["received_full", "Received in Full"],
              ["partial", "Partial"],
              ["missing", "Missing"],
              ["damaged", "Damaged"],
              ["substituted", "Substituted"],
            ] as const
          ).map(([status, label]) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant="secondary"
              className="min-h-11"
              disabled={busy}
              onClick={() => onReceive(status)}
            >
              {label}
            </Button>
          ))}
        </div>
      ) : null}
    </li>
  );
}

export function CanteenWeeklyOrderSection({
  order,
  canManage,
  canExportCsv,
  canUseProductUrls,
  currentUserId,
  busyId,
  onClaim,
  onRelease,
  onMarkAddedToCostco,
  onMarkUnavailable,
  onReceive,
  onBuildCostco,
  onCompleteDelivery,
  receivingMode = false,
}: WeeklyOrderSectionProps) {
  if (!order) {
    return (
      <section id="this-weeks-order" className="rounded-2xl border border-border/40 bg-muted/15 px-4 py-5">
        <h2 className="font-heading text-lg tracking-wide">This Week’s Order</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No active order yet. Add items from Needs Attention to start the week.
        </p>
      </section>
    );
  }

  return (
    <section id="this-weeks-order" className="space-y-3" data-testid="canteen-weekly-order">
      <div className="flex items-end justify-between gap-2 px-0.5">
        <div>
          <h2 className="font-heading text-lg tracking-wide">This Week’s Order</h2>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{order.status.replace(/_/g, " ")}</p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2 justify-end">
            <Button type="button" size="sm" className="min-h-11" onClick={onBuildCostco}>
              Build Costco Order
            </Button>
            <Button type="button" size="sm" variant="outline" className="min-h-11" asChild>
              <a href={COSTCO_SAME_DAY_URL} target="_blank" rel="noopener noreferrer">
                Open Costco Same-Day
              </a>
            </Button>
          </div>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground px-0.5">
        Costco shopping happens on Costco’s site. Firehall Meals does not sync carts, passwords, or payment cards.
        {canExportCsv ? "" : " CSV export is a Hall Pro feature."}
      </p>

      {order.items.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1">Order is empty.</p>
      ) : (
        <ul className="space-y-2">
          {order.items.map((item) => (
            <OrderItemCard
              key={item.order_item_id}
              item={item}
              canManage={canManage}
              canUseProductUrls={canUseProductUrls}
              currentUserId={currentUserId}
              busy={busyId === item.order_item_id}
              receivingMode={receivingMode}
              onClaim={() => onClaim(item.order_item_id)}
              onRelease={() => onRelease(item.order_item_id)}
              onMarkAddedToCostco={() => onMarkAddedToCostco(item.order_item_id)}
              onMarkUnavailable={() => onMarkUnavailable(item.order_item_id)}
              onReceive={(status) => onReceive(item.order_item_id, status)}
            />
          ))}
        </ul>
      )}

      {canManage && receivingMode ? (
        <Button type="button" className="w-full min-h-12 btn-tonight" onClick={onCompleteDelivery}>
          Complete Delivery
        </Button>
      ) : null}
    </section>
  );
}
