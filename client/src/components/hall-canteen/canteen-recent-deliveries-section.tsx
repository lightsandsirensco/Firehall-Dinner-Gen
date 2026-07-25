import type { HallCanteenWeeklyOrder } from "@shared/hall-canteen/types";
import { CANTEEN_ORDER_STATUS_LABELS } from "@shared/hall-canteen/types";

export function CanteenRecentDeliveriesSection({
  deliveries,
  isHallPro,
}: {
  deliveries: HallCanteenWeeklyOrder[];
  isHallPro: boolean;
}) {
  return (
    <section className="space-y-3" data-testid="canteen-recent-deliveries">
      <h2 className="font-heading text-lg tracking-wide px-0.5">Recent Deliveries</h2>
      {!isHallPro ? (
        <p className="text-sm text-muted-foreground px-0.5">
          Full order history is included with Hall Pro. Completed deliveries still update staples when you receive them.
        </p>
      ) : null}
      {deliveries.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1 rounded-2xl border border-border/40 bg-muted/15 px-4 py-4">
          No completed deliveries yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {deliveries.map((order) => (
            <li key={order.order_id} className="rounded-2xl border border-border/40 bg-card/40 px-3 py-3">
              <p className="font-semibold text-sm">{order.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {CANTEEN_ORDER_STATUS_LABELS[order.status]}
                {order.completed_at
                  ? ` · ${new Date(order.completed_at).toLocaleDateString()}`
                  : ""}
                {order.external_order_number ? ` · #${order.external_order_number}` : ""}
                {order.total_cents != null ? ` · $${(order.total_cents / 100).toFixed(2)}` : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {order.items.length} item{order.items.length === 1 ? "" : "s"}
                {order.purchaser_display_name ? ` · ${order.purchaser_display_name}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
