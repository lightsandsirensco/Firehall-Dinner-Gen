import crypto from "crypto";
import { log, logError, clip, maskEmail, isProductionEnv } from "./logger";
import { isPgConfigured } from "./db/pg-client.js";
import {
  cancelKlaviyoSubscription,
  claimDueKlaviyoSubscriptions,
  enqueueKlaviyoSubscription,
  hasActiveMarketingConsent,
  markKlaviyoSubscriptionSent,
  recordKlaviyoRetryFailure,
} from "./marketing-consent/klaviyo-queue.js";

export const KLAVIYO_BASE = "https://a.klaviyo.com/api";
const REVISION = "2025-01-15";
export const LIST_NAME = "Firehall Dinner Generator Leads";

let cachedListId: string | null = null;

function getApiKey(): string {
  const key = process.env.KLAVIYO_API_KEY || "";
  if (!key) {
    throw new Error("KLAVIYO_API_KEY is not set. Add it in the Secrets tab.");
  }
  return key;
}

function headers() {
  return {
    Authorization: `Klaviyo-API-Key ${getApiKey()}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    revision: REVISION,
  };
}

export function validateKlaviyoConfig(): { ok: boolean; error?: string } {
  const key = process.env.KLAVIYO_API_KEY || "";
  if (!key) {
    return { ok: false, error: "KLAVIYO_API_KEY is not set" };
  }
  if (key.length < 6) {
    return { ok: false, error: "KLAVIYO_API_KEY looks invalid (too short)" };
  }
  return { ok: true };
}

async function klaviyoFetch(
  method: string,
  url: string,
  body?: object,
  label?: string,
): Promise<{ ok: boolean; status: number; data: any; raw: string }> {
  const tag = label || url;
  const startMs = Date.now();

  log(`[${method}] ${tag}`, "klaviyo");

  try {
    const res = await fetch(url, {
      method,
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
    });

    const raw = await res.text();
    const elapsed = Date.now() - startMs;
    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }

    if (!res.ok) {
      const errDetail = data?.errors
        ? data.errors.map((e: any) => `${e.title}: ${e.detail}`).join("; ")
        : raw.substring(0, 300);
      const detail = isProductionEnv() ? clip(errDetail, 120) : errDetail;
      log(`[klaviyo] FAIL status=${res.status} duration=${elapsed}ms tag=${tag} detail="${detail}"`, "klaviyo");
      return { ok: false, status: res.status, data, raw };
    }

    log(`[klaviyo] OK status=${res.status} duration=${elapsed}ms tag=${tag}`, "klaviyo");
    return { ok: true, status: res.status, data, raw };
  } catch (err: any) {
    const elapsed = Date.now() - startMs;
    log(`NETWORK ERROR (${elapsed}ms) ${tag} — ${err.message}`, "klaviyo");
    throw new Error(`Klaviyo network error: ${err.message}`);
  }
}

/** Read-only GET against the Klaviyo API; throws on a non-2xx response. */
export async function klaviyoGetJson(url: string, label: string): Promise<any> {
  const res = await klaviyoFetch("GET", url, undefined, label);
  if (!res.ok) throw new Error(`Klaviyo GET ${label} failed (${res.status})`);
  return res.data;
}

async function getOrCreateList(): Promise<string> {
  if (cachedListId) return cachedListId;

  const filterParam = `equals(name,"${LIST_NAME}")`;
  const url = new URL(`${KLAVIYO_BASE}/lists/`);
  url.searchParams.set("filter", filterParam);

  const listRes = await klaviyoFetch("GET", url.toString(), undefined, "getList");

  if (listRes.ok && listRes.data?.data?.length > 0) {
    cachedListId = listRes.data.data[0].id;
    log(`Found list: ${cachedListId}`, "klaviyo");
    return cachedListId!;
  }

  const createRes = await klaviyoFetch(
    "POST",
    `${KLAVIYO_BASE}/lists/`,
    {
      data: {
        type: "list",
        attributes: { name: LIST_NAME },
      },
    },
    "createList",
  );

  if (!createRes.ok) {
    throw new Error(`Failed to create Klaviyo list (${createRes.status}): ${createRes.raw.substring(0, 200)}`);
  }

  cachedListId = createRes.data.data.id;
  log(`Created list: ${cachedListId}`, "klaviyo");
  return cachedListId!;
}

const LIST_COUNT_TTL_MS = 10 * 60 * 1000;
let listCountCache: { at: number; value: number | null } | null = null;

/**
 * Read-only member count of the leads list for the admin dashboard. Never
 * creates the list; null when Klaviyo is unconfigured or unreachable.
 */
export async function getKlaviyoListMemberCount(): Promise<number | null> {
  if (!validateKlaviyoConfig().ok) return null;
  if (listCountCache && Date.now() - listCountCache.at < LIST_COUNT_TTL_MS) return listCountCache.value;
  let value: number | null = null;
  try {
    let listId = cachedListId;
    if (!listId) {
      const url = new URL(`${KLAVIYO_BASE}/lists/`);
      url.searchParams.set("filter", `equals(name,"${LIST_NAME}")`);
      const listRes = await klaviyoFetch("GET", url.toString(), undefined, "getList(readonly)");
      listId = listRes.ok ? (listRes.data?.data?.[0]?.id ?? null) : null;
      if (listRes.ok && !listId) value = 0;
    }
    if (listId) {
      const res = await klaviyoFetch(
        "GET",
        `${KLAVIYO_BASE}/lists/${listId}/?additional-fields[list]=profile_count`,
        undefined,
        "listProfileCount",
      );
      const count = res.ok ? res.data?.data?.attributes?.profile_count : null;
      value = typeof count === "number" ? count : null;
    }
  } catch {
    value = null;
  }
  listCountCache = { at: Date.now(), value };
  return value;
}

class KlaviyoSubscribeError extends Error {
  constructor(message: string, readonly permanent: boolean) {
    super(message);
  }
}

/**
 * Grants email marketing consent (SUBSCRIBED) and adds the profile to the
 * leads list in one call. List membership alone (relationships/profiles)
 * leaves consent at NEVER_SUBSCRIBED, so Klaviyo will not email the person.
 * Klaviyo processes the job asynchronously and answers 202.
 */
async function sendMarketingSubscription(email: string): Promise<void> {
  const listId = await getOrCreateList();
  const res = await klaviyoFetch(
    "POST",
    `${KLAVIYO_BASE}/profile-subscription-bulk-create-jobs/`,
    {
      data: {
        type: "profile-subscription-bulk-create-job",
        attributes: {
          custom_source: "Firehall Meals website",
          profiles: {
            data: [
              {
                type: "profile",
                attributes: { email, subscriptions: { email: { marketing: { consent: "SUBSCRIBED" } } } },
              },
            ],
          },
        },
        relationships: { list: { data: { type: "list", id: listId } } },
      },
    },
    `subscribe(${maskEmail(email)})`,
  );
  if (!res.ok) {
    const detail = res.data?.errors?.[0]?.detail || res.raw.substring(0, 200);
    // 401/403 (key or scope) and 429/5xx can succeed later; other 4xx are bad input.
    const permanent = res.status >= 400 && res.status < 500 && ![401, 403, 408, 429].includes(res.status);
    throw new KlaviyoSubscribeError(`Subscribe failed (${res.status}): ${detail}`, permanent);
  }
}

const INLINE_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isPermanent = (err: unknown) => err instanceof KlaviyoSubscribeError && err.permanent;
const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Subscribes an opted-in email to marketing. Retries transient failures
 * inline; if all fail, the email goes to the Postgres retry queue (picked up
 * by startKlaviyoRetryWorker) and the error is still thrown to the caller.
 */
export async function subscribeToList(email: string): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= INLINE_ATTEMPTS; attempt++) {
    try {
      await sendMarketingSubscription(email);
      log(`[klaviyo] subscribed (marketing consent) email=${maskEmail(email)}`, "klaviyo");
      await markKlaviyoSubscriptionSent(email).catch((err) => {
        if ((err as { code?: string })?.code !== "42P01") logError("klaviyo", "queue update failed", err);
      });
      return;
    } catch (err) {
      lastErr = err;
      if (isPermanent(err) || attempt === INLINE_ATTEMPTS) break;
      await sleep(400 * 2 ** (attempt - 1));
    }
  }
  logError("klaviyo", `marketing subscribe failed email=${maskEmail(email)}; queued for retry`, lastErr);
  await enqueueKlaviyoSubscription(email, errorText(lastErr), isPermanent(lastErr)).catch((err) =>
    logError("klaviyo", `could not queue subscribe retry email=${maskEmail(email)}`, err),
  );
  throw lastErr;
}

/** Processes due queue rows once; exported for tests. */
export async function processKlaviyoRetryQueue(): Promise<{ sent: number; failed: number; cancelled: number }> {
  const out = { sent: 0, failed: 0, cancelled: 0 };
  if (!validateKlaviyoConfig().ok || !isPgConfigured()) return out;
  for (const row of await claimDueKlaviyoSubscriptions()) {
    if (!(await hasActiveMarketingConsent(row.email))) {
      await cancelKlaviyoSubscription(row.email, "no active marketing consent in Postgres");
      out.cancelled += 1;
      continue;
    }
    try {
      await sendMarketingSubscription(row.email);
      await markKlaviyoSubscriptionSent(row.email);
      log(`[klaviyo] retry subscribed email=${maskEmail(row.email)} attempt=${row.attempts + 1}`, "klaviyo");
      out.sent += 1;
    } catch (err) {
      await recordKlaviyoRetryFailure(row, errorText(err), isPermanent(err));
      logError("klaviyo", `retry subscribe failed email=${maskEmail(row.email)} attempt=${row.attempts + 1}`, err);
      out.failed += 1;
    }
  }
  return out;
}

let retryTimer: NodeJS.Timeout | null = null;

export function startKlaviyoRetryWorker(intervalMs = 5 * 60 * 1000): void {
  if (retryTimer || !isPgConfigured()) return;
  const tick = () =>
    void processKlaviyoRetryQueue().catch((err) => {
      if ((err as { code?: string })?.code === "42P01") return; // migration 0020 not applied yet
      logError("klaviyo", "retry worker failed", err);
    });
  retryTimer = setInterval(tick, intervalMs);
  retryTimer.unref();
  setTimeout(tick, 30_000).unref();
}

export async function trackRecipeEvent(
  email: string,
  properties: {
    recipe_title: string;
    primary_protein: string;
    healthiness_level: string;
    crew_size: number;
    ingredients: string[];
    steps: string[];
    pro_tips: string[];
    macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
    generated_at: string;
  }
): Promise<void> {
  const result = await klaviyoFetch(
    "POST",
    `${KLAVIYO_BASE}/events/`,
    {
      data: {
        type: "event",
        attributes: {
          properties: {
            recipe_title: properties.recipe_title,
            primary_protein: properties.primary_protein,
            healthiness_level: properties.healthiness_level,
            crew_size: properties.crew_size,
            ingredients: properties.ingredients,
            steps: properties.steps,
            pro_tips: properties.pro_tips,
            macros_calories: properties.macros.calories,
            macros_protein_g: properties.macros.protein_g,
            macros_carbs_g: properties.macros.carbs_g,
            macros_fat_g: properties.macros.fat_g,
            generated_at: properties.generated_at,
          },
          metric: {
            data: {
              type: "metric",
              attributes: {
                name: "Recipe Generated",
              },
            },
          },
          profile: {
            data: {
              type: "profile",
              attributes: {
                email,
              },
            },
          },
        },
      },
    },
    `trackEvent(Recipe Generated, ${email})`,
  );

  if (!result.ok) {
    const detail = result.data?.errors?.[0]?.detail || result.raw.substring(0, 200);
    throw new Error(`Track recipe event failed (${result.status}): ${detail}`);
  }

  log(
    `[klaviyo] event=RecipeGenerated email=${maskEmail(email)} title="${clip(properties.recipe_title, 50)}" crew=${properties.crew_size}`,
    "klaviyo",
  );
}

export async function trackShoppingListEvent(
  email: string,
  properties: {
    recipe_title: string;
    shopping_list_sections: { title: string; items: string[] }[];
    generator_type: string;
    timestamp: string;
  }
): Promise<void> {
  const result = await klaviyoFetch(
    "POST",
    `${KLAVIYO_BASE}/events/`,
    {
      data: {
        type: "event",
        attributes: {
          properties: {
            recipe_title: properties.recipe_title,
            shopping_list_sections: properties.shopping_list_sections,
            generator_type: properties.generator_type,
            requested_at: properties.timestamp,
          },
          metric: {
            data: {
              type: "metric",
              attributes: {
                name: "Shopping List Requested",
              },
            },
          },
          profile: {
            data: {
              type: "profile",
              attributes: {
                email,
              },
            },
          },
        },
      },
    },
    `trackEvent(Shopping List Requested, ${email})`,
  );

  if (!result.ok) {
    const detail = result.data?.errors?.[0]?.detail || result.raw.substring(0, 200);
    throw new Error(`Track shopping list event failed (${result.status}): ${detail}`);
  }

  const sectionCount = properties.shopping_list_sections?.length ?? 0;
  log(
    `[klaviyo] event=ShoppingListRequested email=${maskEmail(email)} title="${clip(properties.recipe_title, 50)}" sections=${sectionCount}`,
    "klaviyo",
  );
}

export async function trackLeadMagnetDownloaded(
  email: string,
  properties: {
    source: string;
    lead_magnet: string;
  },
): Promise<void> {
  const result = await klaviyoFetch(
    "POST",
    `${KLAVIYO_BASE}/events/`,
    {
      data: {
        type: "event",
        attributes: {
          properties: {
            source: properties.source,
            lead_magnet: properties.lead_magnet,
          },
          metric: {
            data: {
              type: "metric",
              attributes: {
                name: "Lead Magnet Downloaded",
              },
            },
          },
          profile: {
            data: {
              type: "profile",
              attributes: {
                email,
              },
            },
          },
        },
      },
    },
    `trackEvent(Lead Magnet Downloaded, ${email})`,
  );

  if (!result.ok) {
    const detail = result.data?.errors?.[0]?.detail || result.raw.substring(0, 200);
    throw new Error(`Track lead magnet event failed (${result.status}): ${detail}`);
  }

  log(
    `[klaviyo] event=LeadMagnetDownloaded email=${maskEmail(email)} source="${clip(properties.source, 40)}" magnet="${clip(properties.lead_magnet, 40)}"`,
    "klaviyo",
  );
}

/**
 * Creates/updates a Klaviyo PROFILE with safe, non-sensitive properties
 * only. Deliberately does NOT touch list membership — profile sync and
 * marketing-list subscription are separate operations on purpose, so a
 * profile sync (e.g. on Pro plan change or shop purchase) can never
 * re-subscribe someone who previously unsubscribed. Call subscribeToList()
 * separately, and only when local Postgres consent is true.
 */
export async function upsertKlaviyoProfile(
  email: string,
  properties: {
    account_status?: string;
    plan?: string;
    signup_date?: string;
    city?: string | null;
    province_state?: string | null;
    country?: string | null;
    crew_size?: number | null;
  },
): Promise<void> {
  const safeProps: Record<string, unknown> = {};
  if (properties.account_status) safeProps.account_status = properties.account_status;
  if (properties.plan) safeProps.plan = properties.plan;
  if (properties.signup_date) safeProps.signup_date = properties.signup_date;
  if (properties.city) safeProps.city = properties.city;
  if (properties.province_state) safeProps.province_state = properties.province_state;
  if (properties.country) safeProps.country = properties.country;
  if (properties.crew_size != null) safeProps.crew_size = properties.crew_size;

  const attributes: Record<string, unknown> = { email };
  if (Object.keys(safeProps).length > 0) attributes.properties = safeProps;

  const result = await klaviyoFetch(
    "POST",
    `${KLAVIYO_BASE}/profile-import/`,
    { data: { type: "profile", attributes } },
    `upsertProfile(${email})`,
  );

  if (!result.ok) {
    const detail = result.data?.errors?.[0]?.detail || result.raw.substring(0, 200);
    throw new Error(`Profile upsert failed (${result.status}): ${detail}`);
  }

  log(`[klaviyo] profile upserted email=${maskEmail(email)} props=${Object.keys(safeProps).join(",")}`, "klaviyo");
}

/**
 * Resolves a Klaviyo profile id -> email. Needed because the unsubscribe/
 * suppression webhook event payload only includes relationships.profile.id
 * (Klaviyo's internal profile id), not the email address itself.
 */
export async function getKlaviyoProfileEmail(profileId: string): Promise<string | null> {
  const url = `${KLAVIYO_BASE}/profiles/${encodeURIComponent(profileId)}/?fields[profile]=email`;
  const result = await klaviyoFetch("GET", url, undefined, `getProfileEmail(${profileId})`);
  if (!result.ok) return null;
  const email = result.data?.data?.attributes?.email;
  return typeof email === "string" && email ? email : null;
}

/**
 * HMAC-SHA256 signature verification for inbound Klaviyo system webhooks —
 * see developers.klaviyo.com/en/docs/working_with_system_webhooks.
 * Klaviyo computes: HMAC-SHA256(secret_key, raw_body_bytes + timestamp_string)
 * and sends the hex digest in the Klaviyo-Signature header.
 */
export function verifyKlaviyoWebhookSignature(rawBody: Buffer, timestamp: string, signature: string): boolean {
  const secret = process.env.KLAVIYO_WEBHOOK_SECRET;
  if (!secret || !timestamp || !signature) return false;
  try {
    const computed = crypto.createHmac("sha256", secret).update(rawBody).update(timestamp).digest("hex");
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function trackHomepageSubscriber(
  email: string,
  properties: {
    source: string;
  },
): Promise<void> {
  const result = await klaviyoFetch(
    "POST",
    `${KLAVIYO_BASE}/events/`,
    {
      data: {
        type: "event",
        attributes: {
          properties: {
            source: properties.source,
          },
          metric: {
            data: {
              type: "metric",
              attributes: {
                name: "Homepage Subscriber",
              },
            },
          },
          profile: {
            data: {
              type: "profile",
              attributes: {
                email,
              },
            },
          },
        },
      },
    },
    `trackEvent(Homepage Subscriber, ${email})`,
  );

  if (!result.ok) {
    const detail = result.data?.errors?.[0]?.detail || result.raw.substring(0, 200);
    throw new Error(`Track homepage subscriber event failed (${result.status}): ${detail}`);
  }

  log(
    `[klaviyo] event=HomepageSubscriber email=${maskEmail(email)} source="${clip(properties.source, 40)}"`,
    "klaviyo",
  );
}
