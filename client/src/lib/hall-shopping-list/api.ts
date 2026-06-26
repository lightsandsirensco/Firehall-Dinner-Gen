import { apiRequest } from "@/lib/queryClient";
import type { HallShoppingListPayload } from "@shared/hall-shopping-list/types";
import type { ShoppingListResult } from "@/lib/shopping-list";

export async function fetchHallShoppingList(hallId: string): Promise<HallShoppingListPayload> {
  const res = await fetch(`/api/halls/${encodeURIComponent(hallId)}/shopping-list`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load hall shopping list");
  return res.json();
}

export async function addHallShoppingListItem(
  hallId: string,
  item: { name: string; quantity?: string; section?: string },
): Promise<HallShoppingListPayload> {
  const res = await apiRequest("POST", `/api/halls/${encodeURIComponent(hallId)}/shopping-list/items`, item);
  return res.json();
}

export async function addRecipeToHallShoppingList(
  hallId: string,
  input: {
    recipe_title: string;
    recipe_slug?: string;
    sections: ShoppingListResult["sections"];
  },
): Promise<HallShoppingListPayload> {
  const res = await apiRequest(
    "POST",
    `/api/halls/${encodeURIComponent(hallId)}/shopping-list/items/from-recipe`,
    {
      recipe_title: input.recipe_title,
      recipe_slug: input.recipe_slug,
      sections: input.sections.map((s) => ({
        title: s.title,
        items: s.items.map((i) => ({ name: i.name, amount: i.amount, notes: i.notes })),
      })),
    },
  );
  return res.json();
}

export async function updateHallShoppingListItem(
  hallId: string,
  itemId: string,
  patch: { name?: string; quantity?: string; purchased?: boolean },
): Promise<HallShoppingListPayload> {
  const res = await apiRequest(
    "PATCH",
    `/api/halls/${encodeURIComponent(hallId)}/shopping-list/items/${encodeURIComponent(itemId)}`,
    patch,
  );
  return res.json();
}

export async function deleteHallShoppingListItem(
  hallId: string,
  itemId: string,
): Promise<HallShoppingListPayload> {
  const res = await apiRequest(
    "DELETE",
    `/api/halls/${encodeURIComponent(hallId)}/shopping-list/items/${encodeURIComponent(itemId)}`,
  );
  return res.json();
}

export async function updateHallShoppingListMeta(
  hallId: string,
  patch: { title?: string; runner_user_id?: string | null; runner_name?: string | null },
): Promise<HallShoppingListPayload> {
  const res = await apiRequest(
    "PATCH",
    `/api/halls/${encodeURIComponent(hallId)}/shopping-list`,
    patch,
  );
  return res.json();
}

export async function completeHallShoppingList(hallId: string): Promise<HallShoppingListPayload> {
  const res = await apiRequest(
    "POST",
    `/api/halls/${encodeURIComponent(hallId)}/shopping-list/complete`,
    {},
  );
  return res.json();
}

export async function startNewHallShoppingList(
  hallId: string,
  title?: string,
): Promise<HallShoppingListPayload> {
  const res = await apiRequest(
    "POST",
    `/api/halls/${encodeURIComponent(hallId)}/shopping-list/new`,
    title ? { title } : {},
  );
  return res.json();
}

export async function trackHallShoppingListExport(
  hallId: string,
  format: "pdf" | "text",
): Promise<void> {
  await apiRequest("POST", `/api/halls/${encodeURIComponent(hallId)}/shopping-list/export`, {
    format,
  });
}
