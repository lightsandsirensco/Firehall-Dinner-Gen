/**
 * One aisle-grouped checklist for every shopping list in the app (recipe
 * dialog, My List, shift list). Built for walking a store on a phone:
 * collapsible aisles in walking order, big tap targets, a progress bar, and
 * a per-item menu to move it to another aisle or mark it "already have".
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronsDownUp, ChevronsUpDown, MoreHorizontal, PackageCheck, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DEPARTMENT_ORDER, departmentSortIndex, type Department } from "@shared/shopping";

export interface AisleRow {
  id: string;
  name: string;
  amount?: string;
  notes?: string;
  /** "Chili, Tacos" — which meals need it, shown when more than one does. */
  sources?: string;
  section: string;
  checked: boolean;
}

interface AisleShoppingListProps {
  /** Stable id for remembering which aisles are collapsed on this device. */
  listId: string;
  rows: AisleRow[];
  /** Sections shown before the aisles (e.g. "Required for tonight's meal"). */
  leadingSections?: string[];
  onToggle: (row: AisleRow) => void;
  onMove?: (row: AisleRow, department: Department) => void;
  onHave?: (row: AisleRow) => void;
  onRemove?: (row: AisleRow) => void;
  canRemove?: (row: AisleRow) => boolean;
  onAdd?: (name: string) => void;
  addPlaceholder?: string;
  testIdPrefix?: string;
}

const COLLAPSED_KEY = "firehall_aisle_collapsed_v1";
const MAX_REMEMBERED_LISTS = 40;

function readCollapsed(listId: string): Set<string> {
  try {
    const all = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "{}") as Record<string, string[]>;
    return new Set(Array.isArray(all[listId]) ? all[listId] : []);
  } catch {
    return new Set();
  }
}

function writeCollapsed(listId: string, collapsed: Set<string>) {
  try {
    const all = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "{}") as Record<string, string[]>;
    delete all[listId];
    if (collapsed.size > 0) all[listId] = [...collapsed];
    const keys = Object.keys(all);
    for (const key of keys.slice(0, Math.max(0, keys.length - MAX_REMEMBERED_LISTS))) delete all[key];
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable — collapse state just won't persist */
  }
}

export function AisleShoppingList({
  listId,
  rows,
  leadingSections = [],
  onToggle,
  onMove,
  onHave,
  onRemove,
  canRemove,
  onAdd,
  addPlaceholder = "Add an item",
  testIdPrefix = "aisle",
}: AisleShoppingListProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => readCollapsed(listId));
  const [newItem, setNewItem] = useState("");

  useEffect(() => setCollapsed(readCollapsed(listId)), [listId]);

  const sections = useMemo(() => {
    const titles = [...new Set(rows.map((r) => r.section))];
    const leading = leadingSections.filter((t) => titles.includes(t));
    const rest = titles
      .filter((t) => !leading.includes(t))
      .sort((a, b) => departmentSortIndex(a) - departmentSortIndex(b));
    return [...leading, ...rest].map((title) => ({ title, rows: rows.filter((r) => r.section === title) }));
  }, [rows, leadingSections]);

  const total = rows.length;
  const done = rows.filter((r) => r.checked).length;

  const setAndSave = useCallback(
    (next: Set<string>) => {
      setCollapsed(next);
      writeCollapsed(listId, next);
    },
    [listId],
  );

  const toggleSection = (title: string) => {
    const next = new Set(collapsed);
    if (next.has(title)) next.delete(title);
    else next.add(title);
    setAndSave(next);
  };

  const submitNew = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItem.trim();
    if (!name || !onAdd) return;
    onAdd(name);
    setNewItem("");
  };

  return (
    <div className="space-y-3" data-testid={`${testIdPrefix}-list`}>
      {total > 0 ? (
        <div className="space-y-1.5" data-testid={`${testIdPrefix}-progress`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs tabular-nums text-muted-foreground">
              {done === total ? "Everything's in the cart" : `${done} of ${total} in the cart`}
            </p>
            {sections.length > 1 ? (
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2 text-xs text-muted-foreground"
                  onClick={() => setAndSave(new Set())}
                  data-testid={`${testIdPrefix}-expand-all`}
                >
                  <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden />
                  Expand all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2 text-xs text-muted-foreground"
                  onClick={() => setAndSave(new Set(sections.map((s) => s.title)))}
                  data-testid={`${testIdPrefix}-collapse-all`}
                >
                  <ChevronsDownUp className="h-3.5 w-3.5" aria-hidden />
                  Collapse all
                </Button>
              </div>
            ) : null}
          </div>
          <Progress value={(done / total) * 100} className="h-1.5" aria-label={`${done} of ${total} items checked`} />
        </div>
      ) : null}

      {onAdd ? (
        <form onSubmit={submitNew} className="flex gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={addPlaceholder}
            maxLength={80}
            className="min-h-11"
            aria-label="Add an item"
            data-testid={`${testIdPrefix}-add-input`}
          />
          <Button type="submit" disabled={!newItem.trim()} className="min-h-11 gap-1.5" data-testid={`${testIdPrefix}-add-button`}>
            <Plus className="h-4 w-4" aria-hidden />
            Add
          </Button>
        </form>
      ) : null}

      <div className="space-y-2">
        {sections.map(({ title, rows: sectionRows }) => {
          const isCollapsed = collapsed.has(title);
          const sectionDone = sectionRows.filter((r) => r.checked).length;
          const complete = sectionDone === sectionRows.length;
          const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          return (
            <section key={title} className="rounded-xl border border-border/45 bg-card/35" data-testid={`${testIdPrefix}-section-${slug}`}>
              <button
                type="button"
                onClick={() => toggleSection(title)}
                className="flex min-h-11 w-full items-center gap-2 px-3 text-left touch-manipulation"
                aria-expanded={!isCollapsed}
                data-testid={`${testIdPrefix}-section-toggle-${slug}`}
              >
                <span className={cn("flex-1 text-xs font-semibold uppercase tracking-wide", complete ? "text-muted-foreground" : "text-foreground/90")}>
                  {title}
                </span>
                <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                  {complete ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden /> : null}
                  {sectionDone}/{sectionRows.length}
                </span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")} aria-hidden />
              </button>
              {isCollapsed ? null : (
                <ul className="divide-y divide-border/40 border-t border-border/40">
                  {sectionRows.map((row) => (
                    <AisleItem
                      key={row.id}
                      row={row}
                      onToggle={onToggle}
                      onMove={onMove}
                      onHave={onHave}
                      onRemove={onRemove && (!canRemove || canRemove(row)) ? onRemove : undefined}
                      testIdPrefix={testIdPrefix}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function AisleItem({
  row,
  onToggle,
  onMove,
  onHave,
  onRemove,
  testIdPrefix,
}: {
  row: AisleRow;
  onToggle: (row: AisleRow) => void;
  onMove?: (row: AisleRow, department: Department) => void;
  onHave?: (row: AisleRow) => void;
  onRemove?: (row: AisleRow) => void;
  testIdPrefix: string;
}) {
  const hasMenu = Boolean(onMove || onHave || onRemove);
  return (
    <li className={cn("flex items-center gap-1 pl-3 pr-1", row.checked && "opacity-55")} data-testid={`${testIdPrefix}-item-${row.id}`}>
      <label className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 py-1.5 touch-manipulation">
        <Checkbox
          checked={row.checked}
          onCheckedChange={() => onToggle(row)}
          className="h-5 w-5"
          aria-label={`${row.name}${row.amount ? `, ${row.amount}` : ""}`}
          data-testid={`${testIdPrefix}-checkbox-${row.id}`}
        />
        <span className="min-w-0">
          <span className={cn("block text-sm font-medium leading-snug", row.checked && "line-through")}>
            {row.name}
            {row.amount ? <span className="font-normal text-muted-foreground"> — {row.amount}</span> : null}
          </span>
          {row.notes ? <span className="block text-[11px] leading-snug text-muted-foreground">{row.notes}</span> : null}
          {row.sources ? <span className="block truncate text-[11px] text-muted-foreground/80">{row.sources}</span> : null}
        </span>
      </label>
      {hasMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground hover-elevate touch-manipulation"
              aria-label={`More options for ${row.name}`}
              data-testid={`${testIdPrefix}-menu-${row.id}`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[70vh] w-56 overflow-y-auto">
            {onHave ? (
              <DropdownMenuItem onSelect={() => onHave(row)} data-testid={`${testIdPrefix}-have-${row.id}`}>
                <PackageCheck className="mr-2 h-4 w-4" aria-hidden />
                I already have this
              </DropdownMenuItem>
            ) : null}
            {onRemove ? (
              <DropdownMenuItem onSelect={() => onRemove(row)} data-testid={`${testIdPrefix}-remove-${row.id}`}>
                <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                Remove
              </DropdownMenuItem>
            ) : null}
            {onMove ? (
              <>
                {onHave || onRemove ? <DropdownMenuSeparator /> : null}
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Move to aisle</DropdownMenuLabel>
                {DEPARTMENT_ORDER.filter((d) => d !== row.section).map((department) => (
                  <DropdownMenuItem
                    key={department}
                    onSelect={() => onMove(row, department)}
                    data-testid={`${testIdPrefix}-move-${row.id}-${department.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  >
                    {department}
                  </DropdownMenuItem>
                ))}
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  );
}
