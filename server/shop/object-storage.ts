/**
 * Replit Object Storage adapter for shop product photos — the ONLY file in
 * this codebase that talks to the storage provider's SDK. Everything else
 * (server/shop/uploads.ts, server/shop/routes.ts, the admin UI) goes through
 * the provider-agnostic functions in uploads.ts and never imports this file
 * directly except from there.
 *
 * All shop image objects live under the `shop/` prefix in the bucket — this
 * namespace is what makes deleteShopObject() safe: it can never touch any
 * object outside the shop upload namespace, even if called with an
 * unexpected key.
 *
 * Requires Replit's "Object Storage" feature to be enabled for this Repl
 * (Tools > Object Storage in the workspace, or the equivalent Deployments
 * setting). Once enabled, Replit provisions a default bucket and injects the
 * credentials this SDK needs automatically — no manual access keys. Locally
 * (outside Replit's infra), this client cannot authenticate; that's expected
 * — see SHOP_IMAGE_STORAGE=local for the dev fallback in uploads.ts.
 */
import { Client } from "@replit/object-storage";

const SHOP_PREFIX = "shop/";

let client: Client | null = null;

function getClient(): Client {
  if (!client) client = new Client();
  return client;
}

export async function objectStoragePut(key: string, buffer: Buffer): Promise<void> {
  const result = await getClient().uploadFromBytes(SHOP_PREFIX + key, buffer);
  if (!result.ok) {
    throw new Error(`Object storage upload failed for ${key}: ${result.error.message}`);
  }
}

export async function objectStorageGet(key: string): Promise<Buffer | null> {
  const result = await getClient().downloadAsBytes(SHOP_PREFIX + key);
  if (!result.ok) return null;
  return result.value[0] ?? null;
}

export async function objectStorageDelete(key: string): Promise<boolean> {
  try {
    const result = await getClient().delete(SHOP_PREFIX + key, { ignoreNotFound: true });
    return result.ok;
  } catch {
    return false;
  }
}
