import type { HallShoppingListItem, HallShoppingList } from "@shared/hall-shopping-list/types";
import {
  aisleForStoredSection,
  buildAislePrintHtml,
  formatAisleListText,
  sortSectionsByAisle,
  type AisleExportDocument,
  type AisleExportSection,
} from "@shared/shopping";

function aisleSections(items: HallShoppingListItem[]): AisleExportSection[] {
  const map = new Map<string, AisleExportSection>();
  for (const item of items) {
    const title = aisleForStoredSection(item.section, item.name);
    const section = map.get(title) ?? { title, lines: [] };
    section.lines.push({ name: item.name, amount: item.quantity || undefined });
    map.set(title, section);
  }
  return sortSectionsByAisle([...map.values()]);
}

function hallExportDocument(
  list: HallShoppingList,
  items: HallShoppingListItem[],
  hallName?: string,
): AisleExportDocument {
  const purchased = items.filter((i) => i.purchased);
  const meta = [hallName, list.runner_name ? `Runner: ${list.runner_name}` : "Firehouse grocery run"].filter(Boolean);
  return {
    title: list.title,
    subtitle: meta.join(" · "),
    sections: aisleSections(items.filter((i) => !i.purchased)),
    extras:
      purchased.length > 0
        ? [{ title: "Got it", lines: purchased.map((i) => `${i.name}${i.quantity ? ` — ${i.quantity}` : ""}`) }]
        : undefined,
    footer: "Firehall Meals",
  };
}

export function hallShoppingListToText(
  list: HallShoppingList,
  items: HallShoppingListItem[],
  hallName?: string,
): string {
  if (items.length === 0) return `${list.title}\n(empty list)`;
  return formatAisleListText(hallExportDocument(list, items, hallName));
}

export function hallShoppingListToSmsBody(
  list: HallShoppingList,
  items: HallShoppingListItem[],
): string {
  const head = list.runner_name
    ? `${list.title} (${list.runner_name}):`
    : `${list.title}:`;
  const body = aisleSections(items.filter((i) => !i.purchased))
    .flatMap((s) => s.lines)
    .slice(0, 24)
    .map((l) => `${l.name}${l.amount ? ` ${l.amount}` : ""}`)
    .join(", ");
  return body ? `${head} ${body}` : `${head} (all done!)`;
}

export function openHallShoppingListPdf(
  list: HallShoppingList,
  items: HallShoppingListItem[],
  hallName?: string,
): void {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(buildAislePrintHtml(hallExportDocument(list, items, hallName)));
  win.document.close();
  win.focus();
}

export async function shareHallShoppingListText(
  list: HallShoppingList,
  items: HallShoppingListItem[],
  hallName?: string,
): Promise<boolean> {
  const text = hallShoppingListToText(list, items, hallName);
  if (navigator.share) {
    try {
      await navigator.share({ title: list.title, text });
      return true;
    } catch {
      /* fall through */
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function openHallShoppingListSms(
  list: HallShoppingList,
  items: HallShoppingListItem[],
): void {
  const body = encodeURIComponent(hallShoppingListToSmsBody(list, items));
  window.location.href = `sms:?&body=${body}`;
}
