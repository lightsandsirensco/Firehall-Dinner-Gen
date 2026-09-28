import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Loader2, Minus, Plus } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useShopProduct } from "@/lib/shop/api";
import { useStartShopCheckout } from "@/lib/shop/api";
import { formatShopPrice } from "@/lib/shop/format";
import type { ShopProductVariant } from "@shared/shop/types";

export default function ShopProductPage() {
  const [, params] = useRoute("/shop/:slug");
  const slug = params?.slug;
  const previewKey = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return new URLSearchParams(window.location.search).get("key") ?? undefined;
  }, []);
  const { data, isLoading, isError } = useShopProduct(slug, previewKey);
  const startCheckout = useStartShopCheckout();
  const product = data?.product;
  const isPreview = Boolean(previewKey) && product?.status !== "active";

  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const activeVariants = useMemo(
    () => (product?.variants ?? []).filter((v) => v.active),
    [product],
  );

  const selectedVariant: ShopProductVariant | undefined =
    activeVariants.find((v) => v.id === variantId) ?? activeVariants[0];

  const isSingleVariant = activeVariants.length === 1 && activeVariants[0]?.option_label === "One Size";
  const unitPrice = selectedVariant
    ? selectedVariant.price_override_cents ?? product?.base_price_cents ?? 0
    : product?.base_price_cents ?? 0;
  const maxQty = Math.min(selectedVariant?.inventory_qty ?? 0, 20);
  const soldOut = !selectedVariant || selectedVariant.inventory_qty <= 0;

  const handleBuy = async () => {
    if (!product || !selectedVariant || soldOut) return;
    setSubmitting(true);
    setError(null);
    const result = await startCheckout({
      productId: product.id,
      variantId: selectedVariant.id,
      quantity,
    });
    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
    }
    // On success the browser is redirected to Stripe Checkout — no need to reset state.
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader activePage="shop" />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">
          <Skeleton className="aspect-square rounded-2xl" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
        </main>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader activePage="shop" />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
          <p className="text-muted-foreground mb-4">This product isn&apos;t available.</p>
          <Link href="/shop">
            <Button variant="outline">Back to Shop</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activePage="shop" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 min-h-11"
          data-testid="link-back-to-shop"
        >
          <ArrowLeft className="w-4 h-4" />
          Shop
        </Link>

        {isPreview && (
          <div className="mb-4 rounded-xl border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
            Preview mode — this product is <strong>{product?.status}</strong> and not visible in the Shop yet.
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
          <div className="rounded-2xl overflow-hidden bg-muted/40 aspect-square">
            <img
              src={product.primary_image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col gap-4">
            {product.category && (
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{product.category}</p>
            )}
            <h1 className="font-heading text-2xl sm:text-3xl tracking-wide text-foreground">{product.name}</h1>
            <p className="text-xl text-primary font-semibold">
              {formatShopPrice(unitPrice, product.currency)}
            </p>
            {product.short_description && (
              <p className="text-muted-foreground text-sm sm:text-base">{product.short_description}</p>
            )}

            {!isSingleVariant && activeVariants.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Options
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeVariants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariantId(v.id)}
                      disabled={v.inventory_qty <= 0}
                      className={`min-h-11 px-4 rounded-xl border text-sm font-medium touch-manipulation transition-colors ${
                        (selectedVariant?.id ?? activeVariants[0]?.id) === v.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-foreground/40"
                      } ${v.inventory_qty <= 0 ? "opacity-40 line-through" : ""}`}
                      data-testid={`variant-${v.id}`}
                    >
                      {v.option_label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.size_guide && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowSizeGuide((s) => !s)}
                  className="text-sm text-muted-foreground underline underline-offset-2 min-h-11"
                  data-testid="button-size-guide"
                >
                  {showSizeGuide ? "Hide size guide" : "Size guide"}
                </button>
                {showSizeGuide && (
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
                    {product.size_guide}
                  </pre>
                )}
              </div>
            )}

            {isPreview ? (
              <Badge variant="secondary" className="w-fit uppercase tracking-wider text-xs">
                Not live yet — {product.status}
              </Badge>
            ) : soldOut ? (
              <Badge variant="secondary" className="w-fit uppercase tracking-wider text-xs">
                Sold out
              </Badge>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border rounded-xl">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-11 w-11 flex items-center justify-center touch-manipulation"
                    aria-label="Decrease quantity"
                    data-testid="button-quantity-decrease"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium" data-testid="text-quantity">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    className="h-11 w-11 flex items-center justify-center touch-manipulation"
                    aria-label="Increase quantity"
                    data-testid="button-quantity-increase"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {maxQty <= 5 && maxQty > 0 && (
                  <span className="text-xs text-muted-foreground">Only {maxQty} left</span>
                )}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              size="lg"
              variant="cta"
              disabled={soldOut || submitting || isPreview}
              onClick={() => void handleBuy()}
              className="min-h-12 mt-1"
              data-testid="button-buy"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {isPreview ? "Preview only" : soldOut ? "Sold out" : "Buy now"}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Secure checkout via Stripe. Ships to Canada.
            </p>

            {product.full_description && (
              <div
                className="pt-4 border-t border-border/40 mt-2 text-sm text-muted-foreground [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1 [&_strong]:text-foreground [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: product.full_description }}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
