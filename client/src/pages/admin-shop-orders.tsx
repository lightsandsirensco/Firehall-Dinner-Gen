import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminFetch, describeAdminError } from "@/lib/admin-api";
import { formatShopPrice } from "@/lib/shop/format";
import type { ShopFulfillmentStatus, ShopOrderWithItems } from "@shared/shop/types";

const STATUSES: ShopFulfillmentStatus[] = ["NEW", "PROCESSING", "SHIPPED", "CANCELLED"];

export default function AdminShopOrdersPage() {
  const [orders, setOrders] = useState<ShopOrderWithItems[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Record<string, { number: string; carrier: string }>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/shop/orders");
      if (!res.ok) throw new Error(await describeAdminError(res, "Failed to load orders"));
      const body = await res.json();
      setOrders(body.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateOrder = async (
    orderId: string,
    patch: Partial<{
      fulfillment_status: ShopFulfillmentStatus;
      tracking_number: string | null;
      tracking_carrier: string | null;
    }>,
  ) => {
    try {
      const res = await adminFetch(`/api/admin/shop/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await describeAdminError(res, "Failed to update order"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const statusBadgeVariant = (status: ShopFulfillmentStatus) => {
    if (status === "SHIPPED") return "default" as const;
    if (status === "CANCELLED") return "destructive" as const;
    return "secondary" as const;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/admin/shop">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Shop
            </Button>
          </Link>
          <ShoppingBag className="w-6 h-6 text-primary" />
          <h1 className="font-heading text-2xl tracking-wide">Shop Orders</h1>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => void load()}>
            Refresh
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">{error}</div>
        )}

        {loading && <p className="text-muted-foreground">Loading…</p>}

        {orders?.length === 0 && !loading && <p className="text-muted-foreground">No orders yet.</p>}

        {orders?.map((order) => {
          const t = tracking[order.id] ?? {
            number: order.tracking_number ?? "",
            carrier: order.tracking_carrier ?? "",
          };
          return (
            <Card key={order.id} data-testid={`admin-order-${order.order_number}`}>
              <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base">{order.order_number}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {order.customer_email} · {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>
                    {order.payment_status}
                  </Badge>
                  <Badge variant={statusBadgeVariant(order.fulfillment_status)}>
                    {order.fulfillment_status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-sm space-y-1">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-2">
                      <span>
                        {item.product_name}
                        {item.variant_label ? ` — ${item.variant_label}` : ""} ×{item.quantity}
                      </span>
                      <span className="text-muted-foreground">
                        {formatShopPrice(item.unit_price_cents * item.quantity, order.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between text-sm font-medium pt-2 border-t border-border/30">
                  <span>Total</span>
                  <span>{formatShopPrice(order.total_cents, order.currency)}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Select
                    value={order.fulfillment_status}
                    onValueChange={(value) =>
                      void updateOrder(order.id, { fulfillment_status: value as ShopFulfillmentStatus })
                    }
                  >
                    <SelectTrigger className="w-40 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Tracking number"
                    className="w-40 h-9"
                    value={t.number}
                    onChange={(e) =>
                      setTracking({ ...tracking, [order.id]: { ...t, number: e.target.value } })
                    }
                    onBlur={() => void updateOrder(order.id, { tracking_number: t.number || null })}
                  />
                  <Input
                    placeholder="Carrier"
                    className="w-32 h-9"
                    value={t.carrier}
                    onChange={(e) =>
                      setTracking({ ...tracking, [order.id]: { ...t, carrier: e.target.value } })
                    }
                    onBlur={() => void updateOrder(order.id, { tracking_carrier: t.carrier || null })}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
