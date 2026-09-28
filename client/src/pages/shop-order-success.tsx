import { useEffect } from "react";
import { Link } from "wouter";
import { CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useShopOrderConfirmation } from "@/lib/shop/api";
import { formatShopPrice } from "@/lib/shop/format";

function useSessionIdFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("session_id") ?? undefined;
}

export default function ShopOrderSuccessPage() {
  const sessionId = useSessionIdFromUrl();
  const { data, isLoading, isError } = useShopOrderConfirmation(sessionId);
  const order = data?.order;

  useEffect(() => {
    document.title = "Order confirmed — Firehall Meals";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activePage="shop" />

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-7 h-7 text-primary" />
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl tracking-wide text-foreground mb-2">
          Order confirmed
        </h1>
        <p className="text-muted-foreground mb-8">Thanks — we&apos;ve got it.</p>

        {!sessionId && (
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t find that order. Check your email for a confirmation.
          </p>
        )}

        {sessionId && isLoading && (
          <div className="space-y-3 text-left rounded-2xl border border-border/40 p-5">
            <Skeleton className="h-5 w-1/2 mx-auto" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
          </div>
        )}

        {sessionId && isError && (
          <p className="text-sm text-muted-foreground">
            Payment received — your order is being processed. A confirmation email is on its way.
          </p>
        )}

        {order && (
          <div className="text-left rounded-2xl border border-border/40 p-5 space-y-3" data-testid="order-summary">
            <p className="font-heading text-lg text-foreground">Order {order.order_number}</p>
            <ul className="space-y-1">
              {order.items.map((item, i) => (
                <li key={i} className="text-sm text-foreground flex justify-between gap-2">
                  <span>
                    {item.product_name}
                    {item.variant_label ? ` — ${item.variant_label}` : ""} ×{item.quantity}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between text-sm font-medium pt-2 border-t border-border/30">
              <span>Total</span>
              <span>{formatShopPrice(order.total_cents, order.currency)}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              A confirmation has been sent to {order.customer_email}.
            </p>
          </div>
        )}

        <Link href="/shop">
          <Button variant="outline" className="mt-8">
            Continue shopping
          </Button>
        </Link>
      </main>
    </div>
  );
}
