/**
 * Firehall Meals Shop — public storefront + admin API routes.
 *
 * Guest checkout is intentional: attachAuthUser (mounted globally in
 * server/auth/auth-routes.ts) populates req._authUserId for signed-in users
 * without requiring auth, so /api/shop/checkout works for both.
 */
import type { Express, Request, Response } from "express";
import express from "express";
import { requireCsrf } from "../csrf.js";
import { requireAdmin, isAdminRequest } from "../admin-auth.js";
import type { AuthedRequest } from "../auth/auth-middleware.js";
import { getUserById } from "../auth/auth-store.js";
import { logError } from "../logger.js";
import { insertAnalyticsEvents } from "../analytics/analytics-store.js";
import { resolvePublicSiteOrigin } from "../seo/sitemap.js";
import { getBillingPublicConfig } from "../billing/store.js";
import {
  adminCreateShopProductSchema,
  adminCreateShopVariantSchema,
  adminDuplicateShopProductSchema,
  adminUpdateShopOrderSchema,
  adminUpdateShopProductSchema,
  adminUpdateShopVariantSchema,
  createShopCheckoutSchema,
} from "../../shared/shop/schema.js";
import {
  adminCreateProduct,
  adminCreateVariant,
  adminDeleteVariant,
  adminDuplicateProduct,
  adminGetProductById,
  adminListOrders,
  adminListProductSummaries,
  adminUpdateOrderFulfillment,
  adminUpdateProduct,
  adminUpdateVariant,
  getProductBySlugForDetail,
  getOrderByCheckoutSessionId,
  listActiveProductSummaries,
  toOrderConfirmation,
} from "./store.js";
import { createShopCheckoutSession } from "./checkout.js";
import { sendOrderShippedEmail } from "./order-mail.js";
import { shopImageUpload, shopUploadDir, uploadShopImage, deleteShopImage, readShopImage } from "./uploads.js";

// Temporary launch gate: the Shop is fully built (admin + checkout) but not
// yet announced. Fails closed — missing/unset/anything-but-"true" keeps the
// public storefront + checkout hidden. Does NOT gate /api/admin/shop/* (key-
// protected separately by requireAdmin) or the admin preview bypass below.
// Flip SHOP_PUBLIC_ENABLED=true when ready to launch publicly.
function isShopPublicEnabled(): boolean {
  return process.env.SHOP_PUBLIC_ENABLED === "true";
}

function trackShopEvent(
  req: Request,
  eventType: "shop_viewed" | "shop_product_viewed" | "shop_checkout_started",
  metadata?: Record<string, string | number | boolean>,
): void {
  try {
    const sessionId = (req as AuthedRequest)._sessionId;
    insertAnalyticsEvents([{ event_type: eventType, route: req.path, metadata }], sessionId);
  } catch {
    /* analytics is best-effort */
  }
}

export function registerShopRoutes(app: Express): void {
  // ---------------------------------------------------------------------
  // Storefront (public)
  // ---------------------------------------------------------------------

  app.get("/api/shop/products", async (req: Request, res: Response) => {
    try {
      // Shop not launched yet — render as an empty storefront (existing
      // "No merch is live yet" empty state) rather than exposing the catalog.
      if (!isShopPublicEnabled()) {
        return res.json({ products: [] });
      }
      const products = await listActiveProductSummaries();
      trackShopEvent(req, "shop_viewed", { product_count: products.length });
      return res.json({ products });
    } catch (err) {
      logError("shop", "list products failed", err);
      return res.status(500).json({ message: "Failed to load shop" });
    }
  });

  // `allowUnpublished` only ever comes true via a real admin key (header OR
  // the `?key=` query param the admin's own "Preview Product" link sends) —
  // never trust status/preview flags from the request body/query alone.
  app.get("/api/shop/products/:slug", async (req: Request, res: Response) => {
    try {
      const isAdmin = isAdminRequest(req);
      // Shop not launched yet — only admins (Preview Product link, ?key=)
      // may still view product detail; everyone else gets the normal
      // "not found" response, same as a genuinely missing product.
      if (!isShopPublicEnabled() && !isAdmin) {
        return res.status(404).json({ message: "Product not found" });
      }
      const product = await getProductBySlugForDetail(String(req.params.slug ?? ""), isAdmin);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      trackShopEvent(req, "shop_product_viewed", {
        product_id: product.id,
        category: product.category,
      });
      return res.json({ product });
    } catch (err) {
      logError("shop", "get product failed", err);
      return res.status(500).json({ message: "Failed to load product" });
    }
  });

  app.post("/api/shop/checkout", requireCsrf, async (req: AuthedRequest, res: Response) => {
    try {
      // Independent launch gate — do NOT reuse the Firehall Pro
      // payments_enabled flag. Blocked for everyone (including admin) while
      // the Shop is unlaunched, so no caller can bypass the hidden frontend.
      if (!isShopPublicEnabled()) {
        return res.status(503).json({ message: "Shop checkout is not available yet" });
      }

      const config = await getBillingPublicConfig();
      if (!config.payments_enabled) {
        return res.status(503).json({ message: "Shop checkout is not available yet" });
      }

      const parsed = createShopCheckoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid checkout request" });
      }

      const userId = req._authUserId ?? null;
      const user = userId ? await getUserById(userId) : null;
      const origin = resolvePublicSiteOrigin(req.get("host"), req.protocol);

      const result = await createShopCheckoutSession({
        productId: parsed.data.product_id,
        variantId: parsed.data.variant_id,
        quantity: parsed.data.quantity,
        userId,
        userEmail: user?.email ?? null,
        origin,
      });

      if (!result.ok) {
        return res.status(result.status).json({ message: result.message });
      }

      trackShopEvent(req, "shop_checkout_started", {
        product_id: parsed.data.product_id,
        quantity: parsed.data.quantity,
        category: result.category,
      });

      return res.json({ ok: true, url: result.url });
    } catch (err) {
      logError("shop", "checkout failed", err);
      return res.status(500).json({ message: "Failed to start checkout" });
    }
  });

  // Public, safe-shape order lookup for the /shop/order-success confirmation
  // page. Stripe Checkout Session ids are long, unguessable tokens generated
  // server-side by Stripe — safe to use as the lookup key here, and the
  // response never includes Stripe ids, shipping address, or payment details.
  app.get("/api/shop/orders/by-session/:sessionId", async (req: Request, res: Response) => {
    try {
      const order = await getOrderByCheckoutSessionId(String(req.params.sessionId ?? ""));
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      return res.json({ order: toOrderConfirmation(order) });
    } catch (err) {
      logError("shop", "order lookup failed", err);
      return res.status(500).json({ message: "Failed to load order" });
    }
  });

  // ---------------------------------------------------------------------
  // Admin — products & variants
  // ---------------------------------------------------------------------

  // Static-serve LOCAL-DEV-ONLY uploaded product photos — mounted here (not
  // server/static.ts) so it works identically in dev (Vite middleware) and
  // prod. Only ever populated when SHOP_IMAGE_STORAGE=local; harmless no-op
  // empty dir otherwise.
  app.use("/uploads/shop", express.static(shopUploadDir(), { maxAge: "7d" }));

  // Stable, non-expiring media route for object-storage-backed product
  // photos (private bucket — no direct public URL exists, so this proxy is
  // the durable URL stored on the product record). Public: product photos
  // are meant to be publicly visible in the storefront.
  app.get("/api/shop/media/:key", async (req: Request, res: Response) => {
    try {
      const image = await readShopImage(String(req.params.key ?? ""));
      if (!image) return res.status(404).end();
      res.setHeader("Content-Type", image.contentType);
      res.setHeader("Cache-Control", "public, max-age=604800, immutable");
      return res.send(image.buffer);
    } catch (err) {
      logError("shop", "media read failed", err);
      return res.status(500).end();
    }
  });

  app.get("/api/admin/shop/products", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const products = await adminListProductSummaries();
      return res.json({ products });
    } catch (err) {
      logError("shop", "admin list products failed", err);
      return res.status(500).json({ message: "Failed to load products" });
    }
  });

  app.get("/api/admin/shop/products/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const product = await adminGetProductById(String(req.params.id ?? ""));
      if (!product) return res.status(404).json({ message: "Product not found" });
      return res.json({ product });
    } catch (err) {
      logError("shop", "admin get product failed", err);
      return res.status(500).json({ message: "Failed to load product" });
    }
  });

  // Single-file image upload → returns a stable `/uploads/shop/<file>` URL
  // the admin's Media gallery stores directly in image_urls. No Stripe/DB
  // ids ever appear in this response — just a URL and its position hint.
  app.post(
    "/api/admin/shop/uploads",
    requireAdmin,
    (req: Request, res: Response, next) => {
      shopImageUpload.single("file")(req, res, (err: unknown) => {
        if (err) {
          const message = err instanceof Error ? err.message : "Upload failed";
          return res.status(400).json({ message });
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      try {
        const { url } = await uploadShopImage(req.file.buffer, req.file.mimetype);
        return res.json({ url });
      } catch (err) {
        logError("shop", "image upload failed", err);
        return res.status(500).json({ message: "Failed to store uploaded image" });
      }
    },
  );

  app.delete("/api/admin/shop/uploads/:filename", requireAdmin, async (req: Request, res: Response) => {
    await deleteShopImage(String(req.params.filename ?? ""));
    return res.json({ ok: true });
  });

  app.post("/api/admin/shop/products/:id/duplicate", requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = adminDuplicateShopProductSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid duplicate request" });
      }
      const product = await adminDuplicateProduct(String(req.params.id ?? ""), parsed.data.new_slug);
      if (!product) return res.status(404).json({ message: "Product not found" });
      return res.json({ product });
    } catch (err) {
      logError("shop", "admin duplicate product failed", err);
      return res.status(500).json({ message: "Failed to duplicate product" });
    }
  });

  app.post("/api/admin/shop/products", requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = adminCreateShopProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid product", issues: parsed.error.issues });
      }
      const product = await adminCreateProduct(parsed.data);
      return res.json({ product });
    } catch (err) {
      logError("shop", "admin create product failed", err);
      return res.status(500).json({ message: "Failed to create product (slug/SKU may already exist)" });
    }
  });

  app.patch("/api/admin/shop/products/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = adminUpdateShopProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid product update", issues: parsed.error.issues });
      }
      const product = await adminUpdateProduct(String(req.params.id ?? ""), parsed.data);
      if (!product) return res.status(404).json({ message: "Product not found" });
      return res.json({ product });
    } catch (err) {
      logError("shop", "admin update product failed", err);
      return res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.post("/api/admin/shop/products/:id/variants", requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = adminCreateShopVariantSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid variant", issues: parsed.error.issues });
      }
      const variant = await adminCreateVariant(String(req.params.id ?? ""), {
        ...parsed.data,
        price_override_cents: parsed.data.price_override_cents ?? null,
      });
      if (!variant) return res.status(404).json({ message: "Product not found" });
      return res.json({ variant });
    } catch (err) {
      logError("shop", "admin create variant failed", err);
      return res.status(500).json({ message: "Failed to create variant (SKU may already exist)" });
    }
  });

  app.patch("/api/admin/shop/variants/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = adminUpdateShopVariantSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid variant update", issues: parsed.error.issues });
      }
      const variant = await adminUpdateVariant(String(req.params.id ?? ""), parsed.data);
      if (!variant) return res.status(404).json({ message: "Variant not found" });
      return res.json({ variant });
    } catch (err) {
      logError("shop", "admin update variant failed", err);
      return res.status(500).json({ message: "Failed to update variant" });
    }
  });

  app.delete("/api/admin/shop/variants/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const deleted = await adminDeleteVariant(String(req.params.id ?? ""));
      if (!deleted) return res.status(404).json({ message: "Variant not found" });
      return res.json({ ok: true });
    } catch (err) {
      logError("shop", "admin delete variant failed", err);
      return res.status(500).json({ message: "Failed to delete variant" });
    }
  });

  // ---------------------------------------------------------------------
  // Admin — orders
  // ---------------------------------------------------------------------

  app.get("/api/admin/shop/orders", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const orders = await adminListOrders();
      return res.json({ orders });
    } catch (err) {
      logError("shop", "admin list orders failed", err);
      return res.status(500).json({ message: "Failed to load orders" });
    }
  });

  app.patch("/api/admin/shop/orders/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = adminUpdateShopOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid order update", issues: parsed.error.issues });
      }
      const wasShipping = parsed.data.fulfillment_status === "SHIPPED";
      const order = await adminUpdateOrderFulfillment(String(req.params.id ?? ""), parsed.data);
      if (!order) return res.status(404).json({ message: "Order not found" });

      // Best-effort — email hooks/data only; never blocks the status update.
      if (wasShipping) {
        void sendOrderShippedEmail(order).catch(() => {});
      }

      return res.json({ order });
    } catch (err) {
      logError("shop", "admin update order failed", err);
      return res.status(500).json({ message: "Failed to update order" });
    }
  });
}
