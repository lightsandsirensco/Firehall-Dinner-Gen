import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowLeft, Copy, Eye, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminFetch, describeAdminError } from "@/lib/admin-api";
import { ShopImageUploader } from "@/components/shop/image-uploader";
import { SimpleRichTextEditor } from "@/components/shop/simple-rich-text-editor";
import { toast } from "@/hooks/use-toast";
import type { ShopProductStatus, ShopProductWithVariants } from "@shared/shop/types";

interface VariantRow {
  id?: string;
  option_label: string;
  sku: string;
  inventory_qty: string;
  price_override_dollars: string;
  active: boolean;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function dollarsToCents(v: string): number {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0;
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function emptyVariantRow(): VariantRow {
  return { option_label: "", sku: "", inventory_qty: "0", price_override_dollars: "", active: true };
}

function adminKeyForPreviewLink(): string {
  try {
    return sessionStorage.getItem("fh_admin_key") || "";
  } catch {
    return "";
  }
}

export default function AdminShopProductEditorPage() {
  const [isEdit, editParams] = useRoute("/admin/shop/products/:id/edit");
  const productId = isEdit ? editParams?.id : undefined;
  const [, navigate] = useLocation();

  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priceDollars, setPriceDollars] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [optionName, setOptionName] = useState("");
  const [sizeGuide, setSizeGuide] = useState("");
  const [status, setStatus] = useState<ShopProductStatus>("draft");
  const [variants, setVariants] = useState<VariantRow[]>([emptyVariantRow()]);

  const hasVariantOptions = optionName.trim().length > 0;

  const hasFetchedOnce = useRef(false);
  // Skips the dirty-effect's first run (mount, with either blank "new
  // product" defaults or values about to be overwritten by the load fetch
  // below) so opening the editor never immediately shows "unsaved changes".
  const skipNextDirtyCheck = useRef(true);

  useEffect(() => {
    if (!productId) return;
    (async () => {
      if (!hasFetchedOnce.current) setLoading(true);
      setError(null);
      try {
        const res = await adminFetch(`/api/admin/shop/products/${productId}`);
        if (!res.ok) throw new Error(await describeAdminError(res, "Failed to load product"));
        const body = (await res.json()) as { product: ShopProductWithVariants };
        const p = body.product;
        skipNextDirtyCheck.current = true;
        setSlug(p.slug);
        setName(p.name);
        setShortDescription(p.short_description);
        setFullDescription(p.full_description);
        setCategory(p.category);
        setPriceDollars(centsToDollars(p.base_price_cents));
        setImageUrls(p.image_urls);
        setOptionName(p.option_name ?? "");
        setSizeGuide(p.size_guide ?? "");
        setStatus(p.status);
        setSlugTouched(true);
        setVariants(
          p.variants.length > 0
            ? p.variants.map((v) => ({
                id: v.id,
                option_label: v.option_label,
                sku: v.sku,
                inventory_qty: String(v.inventory_qty),
                price_override_dollars: v.price_override_cents != null ? centsToDollars(v.price_override_cents) : "",
                active: v.active,
              }))
            : [emptyVariantRow()],
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      } finally {
        hasFetchedOnce.current = true;
        setLoading(false);
        setDirty(false);
      }
    })();
  }, [productId]);

  // Auto-slug from name until the admin edits the slug directly.
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  useEffect(() => {
    if (skipNextDirtyCheck.current) {
      skipNextDirtyCheck.current = false;
      return;
    }
    if (!loading) setDirty(true);
  }, [
    slug,
    name,
    shortDescription,
    fullDescription,
    category,
    priceDollars,
    imageUrls,
    optionName,
    sizeGuide,
    status,
    variants,
  ]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const stockSummary = useMemo(() => {
    const total = variants
      .filter((v) => v.active)
      .reduce((sum, v) => sum + (Number.parseInt(v.inventory_qty, 10) || 0), 0);
    return total;
  }, [variants]);

  const addVariantRow = () => setVariants((rows) => [...rows, emptyVariantRow()]);
  const removeVariantRow = (index: number) => setVariants((rows) => rows.filter((_, i) => i !== index));
  const updateVariantRow = (index: number, patch: Partial<VariantRow>) =>
    setVariants((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const validate = (targetStatus: ShopProductStatus): string | null => {
    if (!name.trim()) return "Product name is required.";
    if (!slug.trim()) return "Product URL (slug) is required.";
    if (!category.trim()) return "Category is required.";
    if (targetStatus === "active") {
      if (dollarsToCents(priceDollars) <= 0) return "Set a price before publishing.";
      if (imageUrls.length === 0) return "Add at least one photo before publishing.";
      const activeRows = variants.filter((v) => hasVariantOptions ? v.option_label.trim() : true);
      if (hasVariantOptions && activeRows.length === 0) return `Add at least one ${optionName || "option"} value.`;
    }
    return null;
  };

  const save = async (targetStatus: ShopProductStatus) => {
    const validationError = validate(targetStatus);
    if (validationError) {
      setError(validationError);
      toast({ title: "Can't save yet", description: validationError, variant: "destructive" });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        slug,
        name,
        short_description: shortDescription,
        full_description: fullDescription,
        category,
        base_price_cents: dollarsToCents(priceDollars),
        currency: "cad",
        image_urls: imageUrls,
        option_name: hasVariantOptions ? optionName.trim() : null,
        size_guide: sizeGuide || null,
        status: targetStatus,
      };

      let currentProductId = productId;
      if (currentProductId) {
        const res = await adminFetch(`/api/admin/shop/products/${currentProductId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await describeAdminError(res, "Failed to save product"));
      } else {
        const res = await adminFetch("/api/admin/shop/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await describeAdminError(res, "Failed to create product"));
        const body = (await res.json()) as { product: { id: string } };
        currentProductId = body.product.id;
      }

      // Reconcile variant rows: rows without an id (or the placeholder empty
      // "One Size" row) get created, rows with an id get updated, and any
      // originally-loaded id no longer present gets deleted.
      const rowsToSave = hasVariantOptions
        ? variants.filter((v) => v.option_label.trim())
        : [{ ...variants[0], option_label: "One Size" }];

      const keptIds = new Set<string>();
      for (const row of rowsToSave) {
        const variantPayload = {
          option_label: row.option_label.trim() || "One Size",
          sku: row.sku.trim() || `${slug}-${slugify(row.option_label) || "default"}`,
          inventory_qty: Number.parseInt(row.inventory_qty, 10) || 0,
          price_override_cents: row.price_override_dollars.trim() ? dollarsToCents(row.price_override_dollars) : null,
          active: row.active,
        };
        if (row.id) {
          keptIds.add(row.id);
          const res = await adminFetch(`/api/admin/shop/variants/${row.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(variantPayload),
          });
          if (!res.ok) throw new Error(await describeAdminError(res, "Failed to save a variant"));
        } else {
          const res = await adminFetch(`/api/admin/shop/products/${currentProductId}/variants`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...variantPayload, sort_order: 0 }),
          });
          if (!res.ok) throw new Error(await describeAdminError(res, "Failed to save a variant"));
        }
      }
      for (const original of variants) {
        if (original.id && !keptIds.has(original.id)) {
          await adminFetch(`/api/admin/shop/variants/${original.id}`, { method: "DELETE" }).catch(() => {});
        }
      }

      setDirty(false);
      toast({
        title: targetStatus === "active" ? "Published" : targetStatus === "draft" ? "Saved as draft" : "Saved",
        description: name,
      });
      const wasNew = !productId;
      setStatus(targetStatus);
      // Reload the canonical variant state (real ids/generated SKUs) so a
      // second save PATCHes instead of re-creating rows.
      if (currentProductId) {
        const res = await adminFetch(`/api/admin/shop/products/${currentProductId}`);
        if (res.ok) {
          const body = (await res.json()) as { product: ShopProductWithVariants };
          skipNextDirtyCheck.current = true;
          setVariants(
            body.product.variants.map((v) => ({
              id: v.id,
              option_label: v.option_label,
              sku: v.sku,
              inventory_qty: String(v.inventory_qty),
              price_override_dollars: v.price_override_cents != null ? centsToDollars(v.price_override_cents) : "",
              active: v.active,
            })),
          );
        }
      }
      if (wasNew && currentProductId) {
        navigate(`/admin/shop/products/${currentProductId}/edit`, { replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setError(message);
      toast({ title: "Save failed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async () => {
    if (!productId) return;
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/shop/products/${productId}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error(await describeAdminError(res, "Failed to duplicate product"));
      const body = (await res.json()) as { product: { id: string; name: string } };
      toast({ title: "Draft copy created", description: body.product.name });
      navigate(`/admin/shop/products/${body.product.id}/edit`);
    } catch (err) {
      toast({
        title: "Duplicate failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = useMemo(() => {
    if (!slug) return null;
    const key = adminKeyForPreviewLink();
    return key ? `/shop/${slug}?key=${encodeURIComponent(key)}` : `/shop/${slug}`;
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/admin/shop">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Products
            </Button>
          </Link>
          <h1 className="font-heading text-xl tracking-wide flex-1 min-w-0 truncate">
            {productId ? "Edit Product" : "New Product"}
          </h1>
          {productId && previewUrl && (
            <a href={previewUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" data-testid="button-preview-product">
                <Eye className="w-4 h-4 mr-1.5" />
                Preview
              </Button>
            </a>
          )}
          {productId && (
            <Button variant="outline" size="sm" onClick={() => void duplicate()} data-testid="button-duplicate-product">
              <Copy className="w-4 h-4 mr-1.5" />
              Duplicate
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Product name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Firehall Tee — Black" />
            </div>
            <div>
              <Label>Shop URL</Label>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground shrink-0">/shop/</span>
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                  className="h-9"
                />
              </div>
            </div>
            <div>
              <Label>Short description</Label>
              <Input
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="One line shown on the product card"
                maxLength={280}
              />
            </div>
            <div>
              <Label>Full description</Label>
              <SimpleRichTextEditor value={fullDescription} onChange={setFullDescription} placeholder="Tell customers about this product…" />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Apparel" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <Label>Price</Label>
            <div className="flex items-center gap-1.5">
              <span className="text-lg text-muted-foreground">$</span>
              <Input
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
                inputMode="decimal"
                placeholder="34.99"
                className="w-32"
                data-testid="input-price"
              />
              <span className="text-sm text-muted-foreground">CAD</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Shown to customers as {formatDollarsPreview(priceDollars)}.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <ShopImageUploader value={imageUrls} onChange={setImageUrls} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Option name (optional — e.g. Size)</Label>
              <Input
                value={optionName}
                onChange={(e) => setOptionName(e.target.value)}
                placeholder="Leave blank for a single product with no options"
                data-testid="input-option-name"
              />
            </div>

            {!hasVariantOptions ? (
              <div>
                <Label>Stock quantity</Label>
                <Input
                  type="number"
                  min={0}
                  className="w-28"
                  value={variants[0]?.inventory_qty ?? "0"}
                  onChange={(e) => updateVariantRow(0, { inventory_qty: e.target.value })}
                  data-testid="input-stock-single"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {variants.map((row, index) => (
                  <div key={row.id ?? `new-${index}`} className="rounded-lg border border-border/60 p-3 space-y-2" data-testid={`variant-row-${index}`}>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder={`${optionName || "Value"} (e.g. Medium)`}
                        value={row.option_label}
                        onChange={(e) => updateVariantRow(index, { option_label: e.target.value })}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive shrink-0"
                        onClick={() => removeVariantRow(index)}
                        aria-label="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Stock</Label>
                        <Input
                          type="number"
                          min={0}
                          value={row.inventory_qty}
                          onChange={(e) => updateVariantRow(index, { inventory_qty: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Price override (optional)</Label>
                        <Input
                          inputMode="decimal"
                          placeholder={priceDollars || "0.00"}
                          value={row.price_override_dollars}
                          onChange={(e) => updateVariantRow(index, { price_override_dollars: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-2">
                        <Label className="text-xs text-muted-foreground">SKU (optional)</Label>
                        <Input
                          value={row.sku}
                          onChange={(e) => updateVariantRow(index, { sku: e.target.value })}
                          placeholder="Auto-generated if left blank"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={row.active ? "outline" : "secondary"}
                        onClick={() => updateVariantRow(index, { active: !row.active })}
                      >
                        {row.active ? "Active" : "Inactive"}
                      </Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addVariantRow} data-testid="button-add-variant">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add {optionName || "value"}
                </Button>
                <p className="text-xs text-muted-foreground">Total stock across all values: {stockSummary}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {(["draft", "active", "archived"] as ShopProductStatus[]).map((s) => (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={status === s ? "default" : "outline"}
                  onClick={() => setStatus(s)}
                  data-testid={`button-status-${s}`}
                >
                  {s === "draft" ? "Draft" : s === "active" ? "Active" : "Archived"}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Draft is only visible to you. Active shows up in the Shop. Archived hides it from the Shop but keeps
              past orders intact.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur p-3 sm:p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          {dirty && <span className="text-xs text-muted-foreground hidden sm:inline">Unsaved changes</span>}
          <div className="flex-1" />
          <Button variant="outline" disabled={saving} onClick={() => void save("draft")} data-testid="button-save-draft">
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
            Save as Draft
          </Button>
          <Button disabled={saving} onClick={() => void save("active")} data-testid="button-publish">
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
            Publish
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatDollarsPreview(v: string): string {
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n) || n < 0) return "$0.00";
  return `$${n.toFixed(2)}`;
}
