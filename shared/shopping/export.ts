/**
 * Smart Shopping — copy / print / share formatting.
 *
 * One aisle-ordered layout for every list (recipe dialog, My List, shift
 * list, firehouse run) so a copied or printed list reads the same no matter
 * where it came from.
 */

import { classifyDepartment, DEPARTMENT_ORDER, departmentSortIndex, resolveStoredDepartment } from "./departments";
import { formatShoppingItemQuantity } from "./shopping-service";
import type { Department, ShoppingListItem } from "./types";
import type { ShoppingUnitSystem } from "./units";

/**
 * Aisle for an item stored with a free-form section (firehouse run rows):
 * current aisles pass through, legacy department names are migrated, and
 * "Other" / non-aisle headings ("Required for tonight's meal") are classified
 * from the item name.
 */
export function aisleForStoredSection(section: string | null | undefined, name: string, notes = ""): Department {
  const stored = (section ?? "").trim();
  if (stored && stored !== "Other") {
    const resolved = resolveStoredDepartment(stored, name, notes);
    if (resolved) return resolved;
  }
  return classifyDepartment(name, notes);
}

export interface AisleExportLine {
  name: string;
  amount?: string;
  notes?: string;
  checked?: boolean;
}

export interface AisleExportSection {
  title: string;
  lines: AisleExportLine[];
}

export interface AisleExportDocument {
  title: string;
  subtitle?: string;
  sections: AisleExportSection[];
  /** Plain bullet groups after the aisles (budget swaps, items already in the pantry). */
  extras?: { title: string; lines: string[] }[];
  footer?: string;
}

/** Group engine items into aisle sections in walking order, skipping empty aisles. */
export function aisleSectionsFromItems(items: ShoppingListItem[], system?: ShoppingUnitSystem): AisleExportSection[] {
  return DEPARTMENT_ORDER.map((department) => ({
    title: department,
    lines: items
      .filter((i) => i.department === department)
      .map((i) => ({
        name: i.displayName,
        amount: i.quantityLabel ? formatShoppingItemQuantity(i, system) : "",
        notes: i.notes,
        checked: i.checked,
      })),
  })).filter((s) => s.lines.length > 0);
}

/** Sections with free-form titles (stored lists), ordered by aisle; unknown titles after the aisles, "Other" last. */
export function sortSectionsByAisle<T extends { title: string }>(sections: T[]): T[] {
  return sections
    .map((s, i) => ({ s, i }))
    .sort((a, b) => departmentSortIndex(a.s.title) - departmentSortIndex(b.s.title) || a.i - b.i)
    .map(({ s }) => s);
}

function lineText(line: AisleExportLine): string {
  let text = `${line.checked ? "☑" : "☐"} ${line.name}`;
  if (line.amount) text += ` — ${line.amount}`;
  if (line.notes) text += ` (${line.notes})`;
  return text;
}

/** Plain text for clipboard / share sheet / SMS. */
export function formatAisleListText(doc: AisleExportDocument): string {
  const out: string[] = [doc.title];
  if (doc.subtitle) out.push(doc.subtitle);
  for (const section of doc.sections) {
    if (section.lines.length === 0) continue;
    out.push("", section.title.toUpperCase(), ...section.lines.map(lineText));
  }
  for (const extra of doc.extras ?? []) {
    if (extra.lines.length === 0) continue;
    out.push("", extra.title.toUpperCase(), ...extra.lines.map((l) => `• ${l}`));
  }
  if (doc.footer) out.push("", doc.footer);
  return out.join("\n");
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** A self-contained printable page (opens the print dialog on load). */
export function buildAislePrintHtml(doc: AisleExportDocument): string {
  const sections = doc.sections
    .filter((s) => s.lines.length > 0)
    .map(
      (s) => `<section><h2>${escape(s.title)}</h2><ul>${s.lines
        .map(
          (l) =>
            `<li${l.checked ? ' class="done"' : ""}><span class="box">${l.checked ? "&#9745;" : "&#9744;"}</span><span class="name">${escape(l.name)}</span>${
              l.amount ? `<span class="amt">${escape(l.amount)}</span>` : ""
            }${l.notes ? `<span class="notes">${escape(l.notes)}</span>` : ""}</li>`,
        )
        .join("")}</ul></section>`,
    )
    .join("");
  const extras = (doc.extras ?? [])
    .filter((x) => x.lines.length > 0)
    .map((x) => `<section class="extra"><h2>${escape(x.title)}</h2><ul>${x.lines.map((l) => `<li>${escape(l)}</li>`).join("")}</ul></section>`)
    .join("");
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>${escape(doc.title)}</title>
<style>
@page { margin: 0.6in; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; font-size: 13px; line-height: 1.4; }
h1 { font-size: 20px; font-weight: 800; }
.sub { color: #555; margin: 2px 0 12px; }
.cols { columns: 2; column-gap: 28px; }
section { break-inside: avoid; margin-bottom: 14px; }
h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; border-bottom: 2px solid #222; padding-bottom: 2px; margin-bottom: 4px; }
ul { list-style: none; }
li { display: flex; flex-wrap: wrap; gap: 0 6px; padding: 3px 0; border-bottom: 1px solid #eee; }
.box { width: 16px; }
.name { font-weight: 600; }
.amt { color: #333; }
.notes { color: #666; font-size: 12px; width: 100%; padding-left: 22px; }
.done .name, .done .amt { text-decoration: line-through; color: #888; }
.extra li { display: list-item; margin-left: 16px; list-style: disc; border: 0; }
footer { margin-top: 18px; color: #666; font-size: 11px; text-align: center; }
@media (max-width: 600px) { .cols { columns: 1; } }
</style></head><body>
<h1>${escape(doc.title)}</h1>${doc.subtitle ? `<p class="sub">${escape(doc.subtitle)}</p>` : ""}
<div class="cols">${sections}${extras}</div>
${doc.footer ? `<footer>${escape(doc.footer)}</footer>` : ""}
<script>window.onload = function () { window.print(); };</script>
</body></html>`;
}
