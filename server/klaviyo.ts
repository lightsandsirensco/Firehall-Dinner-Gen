import { log } from "./index";

const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY || "";
const KLAVIYO_BASE = "https://a.klaviyo.com/api";
const REVISION = "2025-01-15";
const LIST_NAME = "Firehall Dinner Generator Leads";

let cachedListId: string | null = null;

function headers() {
  if (!KLAVIYO_API_KEY) {
    throw new Error("KLAVIYO_API_KEY is not configured");
  }
  return {
    Authorization: `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    revision: REVISION,
  };
}

async function getOrCreateList(): Promise<string> {
  if (cachedListId) return cachedListId;

  const filterParam = `equals(name,"${LIST_NAME}")`;
  const url = new URL(`${KLAVIYO_BASE}/lists/`);
  url.searchParams.set("filter", filterParam);

  const listsRes = await fetch(url.toString(), {
    method: "GET",
    headers: headers(),
  });

  if (listsRes.ok) {
    const data = await listsRes.json();
    if (data.data && data.data.length > 0) {
      cachedListId = data.data[0].id;
      log(`Found Klaviyo list: ${cachedListId}`, "klaviyo");
      return cachedListId!;
    }
  }

  const createRes = await fetch(`${KLAVIYO_BASE}/lists/`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      data: {
        type: "list",
        attributes: { name: LIST_NAME },
      },
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    log(`Failed to create Klaviyo list: ${createRes.status} ${errText}`, "klaviyo");
    throw new Error("Failed to create Klaviyo list");
  }

  const created = await createRes.json();
  cachedListId = created.data.id;
  log(`Created Klaviyo list: ${cachedListId}`, "klaviyo");
  return cachedListId!;
}

export async function subscribeToList(email: string): Promise<void> {
  const listId = await getOrCreateList();

  const res = await fetch(`${KLAVIYO_BASE}/profile-subscription-bulk-create-jobs/`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      data: {
        type: "profile-subscription-bulk-create-job",
        attributes: {
          profiles: {
            data: [
              {
                type: "profile",
                attributes: {
                  email,
                  subscriptions: {
                    email: {
                      marketing: {
                        consent: "SUBSCRIBED",
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        relationships: {
          list: {
            data: {
              type: "list",
              id: listId,
            },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    log(`Klaviyo subscribe error: ${res.status} ${errText}`, "klaviyo");
    throw new Error(`Klaviyo subscribe failed: ${res.status}`);
  }

  log(`Subscribed ${email} to list ${listId}`, "klaviyo");
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
    macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
    generated_at: string;
  }
): Promise<void> {
  const res = await fetch(`${KLAVIYO_BASE}/events/`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
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
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    log(`Klaviyo event error: ${res.status} ${errText}`, "klaviyo");
    throw new Error(`Klaviyo event failed: ${res.status}`);
  }

  log(`Tracked "Recipe Generated" event for ${email}: ${properties.recipe_title}`, "klaviyo");
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
  const res = await fetch(`${KLAVIYO_BASE}/events/`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
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
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    log(`Klaviyo shopping list event error: ${res.status} ${errText}`, "klaviyo");
    throw new Error(`Klaviyo event failed: ${res.status}`);
  }

  log(`Tracked "Shopping List Requested" event for ${email}: ${properties.recipe_title}`, "klaviyo");
}
