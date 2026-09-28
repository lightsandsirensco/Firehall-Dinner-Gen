/**
 * Firehall Meals Shop — Stripe webhook finalization.
 *
 * Called from server/billing/routes.ts's existing, already-signature-
 * verified and already-idempotent /api/billing/stripe-webhook handler (see
 * the `order_type === "shop"` branch there) — this module does NOT stand up
 * a second webhook endpoint.
 */
import type Stripe from "stripe";
import { logError } from "../logger.js";
import { insertAnalyticsEvents } from "../analytics/analytics-store.js";
import { finalizeShopOrder } from "./store.js";
import { sendOrderConfirmationEmail } from "./order-mail.js";
import { syncKlaviyoProfileForEmail, syncKlaviyoProfileForUser } from "../marketing-consent/klaviyo-sync.js";

function orderValueBucket(totalCents: number): string {
  const dollars = totalCents / 100;
  if (dollars < 25) return "under_25";
  if (dollars < 50) return "25_50";
  if (dollars < 100) return "50_100";
  return "over_100";
}

export async function handleShopCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  try {
    const metadata = session.metadata ?? {};
    const productId = metadata.product_id;
    const variantId = metadata.variant_id;
    const quantity = parseInt(metadata.quantity ?? "1", 10) || 1;
    const userId = metadata.user_id || null;
    const email = session.customer_details?.email ?? "";

    if (!productId || !variantId || !email) {
      logError(
        "shop",
        "checkout.session.completed missing shop metadata/email",
        new Error(`session ${session.id}`),
      );
      return;
    }

    const shippingDetails = session.collected_information?.shipping_details ?? null;
    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

    const order = await finalizeShopOrder({
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      userId,
      customerEmail: email,
      subtotalCents: session.amount_subtotal ?? 0,
      shippingCents: session.total_details?.amount_shipping ?? 0,
      taxCents: session.total_details?.amount_tax ?? 0,
      totalCents: session.amount_total ?? 0,
      currency: session.currency ?? "cad",
      shippingName: shippingDetails?.name ?? session.customer_details?.name ?? null,
      shippingAddress: shippingDetails?.address ? { ...shippingDetails.address } : null,
      items: [{ productId, variantId, quantity }],
    });

    if (!order) return;

    // Profile-only — never subscribes to marketing. A purchase is never
    // implicit marketing consent; see server/klaviyo.ts upsertKlaviyoProfile.
    if (userId) {
      void syncKlaviyoProfileForUser(userId);
    } else {
      void syncKlaviyoProfileForEmail(email);
    }

    try {
      insertAnalyticsEvents([
        {
          event_type: "shop_purchase_completed",
          metadata: {
            product_id: productId,
            quantity,
            order_value_bucket: orderValueBucket(order.total_cents),
          },
        },
      ]);
    } catch {
      /* analytics is best-effort */
    }

    await sendOrderConfirmationEmail(order);
  } catch (err) {
    logError("shop", "shop checkout finalization failed", err);
    throw err; // let the webhook 500 so Stripe retries (idempotent via unique session id)
  }
}
