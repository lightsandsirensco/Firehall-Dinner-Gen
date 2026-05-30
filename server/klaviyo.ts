import { log, clip, maskEmail, isProductionEnv } from "./logger";

const KLAVIYO_BASE = "https://a.klaviyo.com/api";
const REVISION = "2025-01-15";
const LIST_NAME = "Firehall Dinner Generator Leads";

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

export async function subscribeToList(email: string): Promise<void> {
  const listId = await getOrCreateList();

  const profileRes = await klaviyoFetch(
    "POST",
    `${KLAVIYO_BASE}/profile-import/`,
    {
      data: {
        type: "profile",
        attributes: { email },
      },
    },
    `importProfile(${email})`,
  );

  if (!profileRes.ok) {
    const detail = profileRes.data?.errors?.[0]?.detail || profileRes.raw.substring(0, 200);
    throw new Error(`Profile import failed (${profileRes.status}): ${detail}`);
  }

  const profileId = profileRes.data?.data?.id;
  if (!profileId) {
    throw new Error("Profile import succeeded but no profile ID returned");
  }

  const addRes = await klaviyoFetch(
    "POST",
    `${KLAVIYO_BASE}/lists/${listId}/relationships/profiles/`,
    {
      data: [
        {
          type: "profile",
          id: profileId,
        },
      ],
    },
    `addToList(${email})`,
  );

  if (!addRes.ok) {
    const detail = addRes.data?.errors?.[0]?.detail || addRes.raw.substring(0, 200);
    throw new Error(`Add to list failed (${addRes.status}): ${detail}`);
  }

  log(`[klaviyo] subscribed email=${maskEmail(email)} listId=${listId}`, "klaviyo");
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
