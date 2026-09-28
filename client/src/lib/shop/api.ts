import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  ShopOrderConfirmation,
  ShopProductSummary,
  ShopProductWithVariants,
} from "@shared/shop/types";
import { apiRequest } from "@/lib/queryClient";

export function useShopProducts() {
  return useQuery<{ products: ShopProductSummary[] }>({
    queryKey: ["/api/shop/products"],
  });
}

/**
 * `previewKey` (the admin key, forwarded only from the admin's own "Preview
 * Product" link — see admin-shop-product-editor.tsx) lets a draft/archived
 * product's own storefront page load for the admin before it's published.
 * Omitted entirely for normal shopper traffic.
 */
export function useShopProduct(slug: string | undefined, previewKey?: string) {
  const url = slug
    ? previewKey
      ? `/api/shop/products/${slug}?key=${encodeURIComponent(previewKey)}`
      : `/api/shop/products/${slug}`
    : undefined;
  return useQuery<{ product: ShopProductWithVariants }>({
    queryKey: url ? [url] : ["shop-product-disabled"],
    enabled: Boolean(slug),
  });
}

export function useShopOrderConfirmation(sessionId: string | undefined) {
  return useQuery<{ order: ShopOrderConfirmation }>({
    queryKey: sessionId ? [`/api/shop/orders/by-session/${sessionId}`] : ["shop-order-disabled"],
    enabled: Boolean(sessionId),
    retry: 2,
  });
}

/** Starts Stripe-hosted Checkout for a single product/variant/quantity and redirects. Guest checkout is allowed. */
export function useStartShopCheckout() {
  return useCallback(
    async (input: { productId: string; variantId: string; quantity: number }) => {
      try {
        const res = await apiRequest("POST", "/api/shop/checkout", {
          product_id: input.productId,
          variant_id: input.variantId,
          quantity: input.quantity,
        });
        const body = (await res.json()) as { ok?: boolean; url?: string; message?: string };
        if (!res.ok || !body.url) {
          return { ok: false as const, message: body.message || "Checkout failed" };
        }
        window.location.href = body.url;
        return { ok: true as const };
      } catch (err) {
        return { ok: false as const, message: err instanceof Error ? err.message : "Checkout failed" };
      }
    },
    [],
  );
}
