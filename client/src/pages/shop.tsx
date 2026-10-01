import { Link } from "wouter";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useShopProducts } from "@/lib/shop/api";
import { formatShopPrice } from "@/lib/shop/format";

export default function ShopPage() {
  const { data, isLoading, isError } = useShopProducts();
  const products = data?.products ?? [];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activePage="shop" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center gap-2 mb-2">
          <BrandLogo className="h-6 w-6" />
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Firehall Meals
          </span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl tracking-wide text-foreground mb-2">Shop</h1>
        <p className="text-muted-foreground max-w-xl mb-8">
          Crew gear made for the hall — hats, tees, aprons, and stickers.
        </p>

        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-muted-foreground">
            Couldn&apos;t load the shop right now. Try again in a moment.
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && !isError && products.length === 0 && (
          <p className="text-muted-foreground">No merch is live yet — check back soon.</p>
        )}

        {products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
            {products.map((product) => (
              <Link key={product.id} href={`/shop/${product.slug}`} data-testid={`shop-card-${product.slug}`}>
                <Card className="overflow-hidden h-full hover:border-primary/40 transition-colors touch-manipulation">
                  <div className="relative aspect-square bg-muted/40 overflow-hidden">
                    <img
                      src={product.primary_image_url}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    {!product.in_stock && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <Badge variant="secondary" className="uppercase tracking-wider text-[10px]">
                          Sold out
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3 sm:p-4">
                    {product.category && (
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                        {product.category}
                      </p>
                    )}
                    <h2 className="font-heading text-sm sm:text-base leading-snug text-foreground truncate">
                      {product.name}
                    </h2>
                    <p className="text-sm text-primary font-medium mt-1">
                      {formatShopPrice(product.price_cents, product.currency)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
