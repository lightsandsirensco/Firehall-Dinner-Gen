import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ImageOff, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminFetch, describeAdminError } from "@/lib/admin-api";
import { formatShopPrice } from "@/lib/shop/format";
import type { ShopProductStatus, ShopProductSummary } from "@shared/shop/types";

const STATUS_LABEL: Record<ShopProductStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

const STATUS_BADGE_VARIANT: Record<ShopProductStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "secondary",
  archived: "outline",
};

function stockLabel(product: ShopProductSummary): string {
  if (product.stock_status === "sold_out") return "Sold out";
  if (product.stock_status === "low_stock") return `Low stock — ${product.total_stock}`;
  return `${product.total_stock} in stock`;
}

export default function AdminShopPage() {
  const [products, setProducts] = useState<ShopProductSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminFetch("/api/admin/shop/products");
        if (!res.ok) throw new Error(await describeAdminError(res, "Failed to load products"));
        const body = await res.json();
        setProducts(body.products);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Admin
            </Button>
          </Link>
          <Package className="w-6 h-6 text-primary" />
          <h1 className="font-heading text-2xl tracking-wide">Shop</h1>
        </div>

        <div className="flex items-center gap-2 border-b border-border/60">
          <span className="px-3 py-2 text-sm font-medium border-b-2 border-primary text-foreground">
            Products
          </span>
          <Link
            href="/admin/shop/orders"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Orders
          </Link>
        </div>

        <Link href="/admin/shop/products/new">
          <Button size="lg" className="w-full sm:w-auto" data-testid="button-add-product">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Product
          </Button>
        </Link>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">{error}</div>
        )}

        {loading && <p className="text-muted-foreground text-sm">Loading…</p>}

        {products?.length === 0 && !loading && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground text-sm">No products yet. Add your first one above.</p>
          </div>
        )}

        <div className="space-y-2">
          {products?.map((product) => (
            <Link
              key={product.id}
              href={`/admin/shop/products/${product.id}/edit`}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-foreground/30 transition-colors min-h-16"
              data-testid={`admin-product-${product.slug}`}
            >
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                {product.primary_image_url ? (
                  <img src={product.primary_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageOff className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {product.category} · {formatShopPrice(product.price_cents, product.currency)} ·{" "}
                  {stockLabel(product)}
                </p>
              </div>
              <Badge variant={STATUS_BADGE_VARIANT[product.status]} className="shrink-0">
                {STATUS_LABEL[product.status]}
              </Badge>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
