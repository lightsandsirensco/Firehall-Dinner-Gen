/**
 * Firehall Meals Shop — server-side Stripe Checkout session creation.
 *
 * The client submits only { product_id, variant_id, quantity }. Every price,
 * stock check, and line item here is resolved from the database — nothing
 * from the client is ever trusted for money. mode: "payment" (one-time),
 * never "subscription". Stripe-hosted Checkout only — no custom card form.
 */
import { getStripeClient } from "../billing/stripe-client.js";
import { resolveProductVariantForCheckout } from "./store.js";

/** CAD flat-rate shipping — Canada only for MVP (see FINAL RESPONSE for setup notes). */
function flatShippingCentsCad(): number {
  const raw = process.env.SHOP_SHIPPING_FLAT_CENTS_CAD?.trim();
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 999; // default $9.99
}

/**
 * Stripe Tax requires a business address + tax registrations configured in
 * the Stripe Dashboard before `automatic_tax.enabled: true` will work — see
 * TAX SETUP REQUIRED in the final report. Stays off until explicitly
 * flipped on so a misconfigured account can't hard-fail every checkout.
 */
function stripeTaxEnabled(): boolean {
  return process.env.SHOP_STRIPE_TAX_ENABLED?.trim().toLowerCase() === "true";
}

export type CreateShopCheckoutResult =
  | { ok: true; url: string; category: string }
  | { ok: false; status: number; message: string };

export async function createShopCheckoutSession(input: {
  productId: string;
  variantId: string;
  quantity: number;
  userId: string | null;
  userEmail: string | null;
  origin: string;
}): Promise<CreateShopCheckoutResult> {
  const resolved = await resolveProductVariantForCheckout(input.productId, input.variantId);
  if (!resolved) {
    return { ok: false, status: 404, message: "Product is not available" };
  }
  const { product, variant, unit_price_cents } = resolved;

  if (variant.inventory_qty <= 0) {
    return { ok: false, status: 409, message: "Sold out" };
  }
  if (variant.inventory_qty < input.quantity) {
    return { ok: false, status: 409, message: `Only ${variant.inventory_qty} left in stock` };
  }

  const stripe = getStripeClient();
  const currency = product.currency || "cad";
  const itemName = variant.option_label && variant.option_label !== "One Size"
    ? `${product.name} — ${variant.option_label}`
    : product.name;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      client_reference_id: input.userId ?? undefined,
      customer_email: input.userId ? input.userEmail ?? undefined : undefined,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: unit_price_cents,
            product_data: {
              name: itemName,
              images: product.image_urls[0] ? [product.image_urls[0]] : undefined,
              metadata: { product_id: product.id, variant_id: variant.id },
            },
          },
          quantity: input.quantity,
        },
      ],
      shipping_address_collection: { allowed_countries: ["CA"] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: flatShippingCentsCad(), currency: "cad" },
            display_name: "Standard shipping (Canada)",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 4 },
              maximum: { unit: "business_day", value: 10 },
            },
          },
        },
      ],
      ...(stripeTaxEnabled() ? { automatic_tax: { enabled: true } } : {}),
      metadata: {
        order_type: "shop",
        product_id: product.id,
        variant_id: variant.id,
        quantity: String(input.quantity),
        user_id: input.userId ?? "",
      },
      success_url: `${input.origin}/shop/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.origin}/shop/${product.slug}?checkout=cancelled`,
    });

    if (!session.url) {
      return { ok: false, status: 500, message: "Failed to create checkout session" };
    }
    return { ok: true, url: session.url, category: product.category };
  } catch {
    return { ok: false, status: 500, message: "Failed to start checkout" };
  }
}
