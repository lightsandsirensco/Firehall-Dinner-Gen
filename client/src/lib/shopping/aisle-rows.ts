import type { AisleRow } from "@/components/shopping/aisle-shopping-list";
import { formatShoppingItemQuantity, type ShoppingListItem, type ShoppingUnitSystem } from "@shared/shopping";

/** Engine list items -> rows for AisleShoppingList. */
export function shoppingItemsToAisleRows(items: ShoppingListItem[], system?: ShoppingUnitSystem): AisleRow[] {
  return items.map((item) => {
    const titles = [...new Set(item.contributions.map((c) => c.recipeTitle).filter(Boolean))];
    return {
      id: item.id,
      name: item.displayName,
      amount: item.quantityLabel ? formatShoppingItemQuantity(item, system) : "",
      notes: item.notes,
      sources: titles.length > 1 ? `For ${titles.join(", ")}` : undefined,
      section: item.department,
      checked: item.checked,
    };
  });
}
