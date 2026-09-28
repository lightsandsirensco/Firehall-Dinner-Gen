/**
 * Shop product photo uploads — provider-agnostic orchestration.
 *
 * Storage backend is chosen by SHOP_IMAGE_STORAGE ("object" | "local") and
 * isolated entirely behind uploadShopImage()/deleteShopImage()/
 * readShopImage() below. Nothing outside this file (routes.ts, the admin
 * UI) knows or cares which provider actually stores the bytes:
 *
 *   - "object" (required in production): Replit Object Storage, via
 *     server/shop/object-storage.ts. Bucket is private, so images are
 *     served back through the app's own stable /api/shop/media/:key route
 *     (see readShopImage() + routes.ts) rather than a signed/expiring URL.
 *   - "local" (dev-only fallback): writes to disk under uploads/shop/,
 *     served by the existing /uploads/shop static mount. Never used in
 *     production — see shopImageStorageMode() below.
 *
 * Security preserved from the original local-disk implementation:
 * admin-only (enforced by requireAdmin in routes.ts), JPEG/PNG/WebP
 * allowlist, 8MB default max, generated object keys (browser filenames are
 * never used or trusted), no executables.
 */
import fs from "fs";
import path from "path";
import multer from "multer";
import { nanoid } from "nanoid";
import { objectStoragePut, objectStorageGet, objectStorageDelete } from "./object-storage.js";

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export type ShopImageStorageMode = "object" | "local";

/**
 * "object" is the only mode allowed in production — SHOP_IMAGE_STORAGE=local
 * is a deliberate, explicit dev-only opt-in and is never the production
 * default. If production is misconfigured, uploads fail loudly (500 with a
 * clear message) instead of silently writing to the deploy's ephemeral disk.
 */
export function shopImageStorageMode(): ShopImageStorageMode {
  const raw = process.env.SHOP_IMAGE_STORAGE?.trim().toLowerCase();
  if (raw === "local") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SHOP_IMAGE_STORAGE=local is not allowed in production — local disk does not survive redeploys. Set SHOP_IMAGE_STORAGE=object (or unset it) and enable Replit Object Storage.",
      );
    }
    return "local";
  }
  if (raw === "object") return "object";
  // Unset: default to durable object storage everywhere except explicit dev opt-out above.
  return "object";
}

function maxUploadBytes(): number {
  const raw = process.env.SHOP_UPLOAD_MAX_BYTES?.trim();
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8 * 1024 * 1024; // 8MB default
}

/** Local-disk fallback dir — only read/written when shopImageStorageMode() === "local". */
export function shopUploadDir(): string {
  const dir = process.env.SHOP_UPLOAD_DIR?.trim() || path.join(process.cwd(), "uploads", "shop");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Buffers the file in memory (never trusts/uses the browser's filename or
// writes straight to disk) so the same middleware works for either backend.
export const shopImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadBytes(), files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TO_EXT[file.mimetype]) {
      cb(new Error("Only JPEG, PNG, or WEBP images are allowed"));
      return;
    }
    cb(null, true);
  },
});

/** Stable, non-expiring URL for a generated key, regardless of backend. */
function shopImagePublicUrl(key: string, mode: ShopImageStorageMode): string {
  return mode === "object" ? `/api/shop/media/${key}` : `/uploads/shop/${key}`;
}

/**
 * Stores an uploaded image and returns its generated key + stable public
 * URL to save on the product record. Throws with a clear message if the
 * configured backend is unavailable (never silently falls back).
 */
export async function uploadShopImage(
  buffer: Buffer,
  mimeType: string,
): Promise<{ key: string; url: string }> {
  const ext = ALLOWED_MIME_TO_EXT[mimeType] ?? "";
  const key = `${nanoid(16)}${ext}`;
  const mode = shopImageStorageMode();

  if (mode === "object") {
    await objectStoragePut(key, buffer);
  } else {
    fs.writeFileSync(path.join(shopUploadDir(), key), buffer);
  }

  return { key, url: shopImagePublicUrl(key, mode) };
}

/** Path-traversal-safe: always operates on basename(key), never a caller-supplied path. */
export async function deleteShopImage(key: string): Promise<boolean> {
  const safeKey = path.basename(String(key ?? ""));
  if (!safeKey) return false;

  if (shopImageStorageMode() === "object") {
    return objectStorageDelete(safeKey);
  }

  const fullPath = path.join(shopUploadDir(), safeKey);
  if (!fullPath.startsWith(shopUploadDir())) return false;
  try {
    fs.unlinkSync(fullPath);
    return true;
  } catch {
    return false;
  }
}

/** Reads bytes + content-type for the /api/shop/media/:key route (object mode only). */
export async function readShopImage(
  key: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const safeKey = path.basename(String(key ?? ""));
  if (!safeKey) return null;
  const ext = path.extname(safeKey).toLowerCase();
  const contentType = CONTENT_TYPE_BY_EXT[ext];
  if (!contentType) return null;

  const buffer = await objectStorageGet(safeKey);
  if (!buffer) return null;
  return { buffer, contentType };
}
