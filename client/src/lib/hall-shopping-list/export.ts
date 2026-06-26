import type { HallShoppingListItem, HallShoppingList } from "@shared/hall-shopping-list/types";
import { escapeHtml } from "@/lib/escape-html";

function groupBySection(items: HallShoppingListItem[]): Map<string, HallShoppingListItem[]> {
  const map = new Map<string, HallShoppingListItem[]>();
  for (const item of items) {
    const sec = item.section || "Other";
    const batch = map.get(sec) ?? [];
    batch.push(item);
    map.set(sec, batch);
  }
  return map;
}

export function hallShoppingListToText(
  list: HallShoppingList,
  items: HallShoppingListItem[],
  hallName?: string,
): string {
  const lines: string[] = [];
  lines.push(`🛒 ${list.title}${hallName ? ` — ${hallName}` : ""}`);
  if (list.runner_name) {
    lines.push(`Runner: ${list.runner_name}`);
  }
  lines.push("");

  const pending = items.filter((i) => !i.purchased);
  const purchased = items.filter((i) => i.purchased);

  if (pending.length === 0 && purchased.length === 0) {
    lines.push("(empty list)");
    return lines.join("\n");
  }

  for (const [section, sectionItems] of groupBySection(pending)) {
    lines.push(section.toUpperCase());
    for (const item of sectionItems) {
      let line = `□ ${item.name}`;
      if (item.quantity) line += ` — ${item.quantity}`;
      lines.push(line);
    }
    lines.push("");
  }

  if (purchased.length > 0) {
    lines.push("GOT IT");
    for (const item of purchased) {
      lines.push(`✓ ${item.name}${item.quantity ? ` — ${item.quantity}` : ""}`);
    }
  }

  lines.push("");
  lines.push("Firehall Meals");
  return lines.join("\n").trim();
}

export function hallShoppingListToSmsBody(
  list: HallShoppingList,
  items: HallShoppingListItem[],
): string {
  const pending = items.filter((i) => !i.purchased);
  const head = list.runner_name
    ? `${list.title} (${list.runner_name}):`
    : `${list.title}:`;
  const body = pending
    .slice(0, 24)
    .map((i) => `${i.name}${i.quantity ? ` ${i.quantity}` : ""}`)
    .join(", ");
  return body ? `${head} ${body}` : `${head} (all done!)`;
}

export function openHallShoppingListPdf(
  list: HallShoppingList,
  items: HallShoppingListItem[],
  hallName?: string,
): void {
  const e = escapeHtml;
  const sections = groupBySection(items.filter((i) => !i.purchased));
  let sectionsHtml = "";
  for (const [title, sectionItems] of sections) {
    sectionsHtml += `<div class="section"><h2>${e(title)}</h2><table><tbody>`;
    for (const item of sectionItems) {
      sectionsHtml += `<tr>
        <td class="checkbox">&#9744;</td>
        <td class="item-name">${e(item.name)}</td>
        <td class="item-amount">${item.quantity ? `— ${e(item.quantity)}` : ""}</td>
      </tr>`;
    }
    sectionsHtml += `</tbody></table></div>`;
  }

  const purchased = items.filter((i) => i.purchased);
  let purchasedHtml = "";
  if (purchased.length > 0) {
    purchasedHtml = `<div class="section"><h2>Purchased</h2><ul>`;
    for (const item of purchased) {
      purchasedHtml += `<li>✓ ${e(item.name)}${item.quantity ? ` — ${e(item.quantity)}` : ""}</li>`;
    }
    purchasedHtml += `</ul></div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${e(list.title)}</title>
<style>
  @page { margin: 0.75in; }
  body { font-family: -apple-system, sans-serif; font-size: 14px; color: #111; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #666; margin-bottom: 16px; }
  h2 { font-size: 14px; text-transform: uppercase; border-bottom: 2px solid #222; margin: 16px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 4px 8px 4px 0; border-bottom: 1px solid #eee; vertical-align: top; }
  .checkbox { width: 24px; }
  .item-name { font-weight: 600; }
</style></head><body>
  <h1>${e(list.title)}</h1>
  <p class="meta">${hallName ? `${e(hallName)} · ` : ""}${list.runner_name ? `Runner: ${e(list.runner_name)}` : "Hall grocery run"}</p>
  ${sectionsHtml || "<p>No items yet.</p>"}
  ${purchasedHtml}
  <p class="meta" style="margin-top:24px;text-align:center">Firehall Meals</p>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
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
