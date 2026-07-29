import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { MeSubpageShell } from "@/components/app-shell/me-subpage-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";
import { useShoppingSession } from "@/hooks/use-shopping-session";
import {
  COMMON_STAPLES,
  canonicalizeIngredientName,
  commonStapleLabel,
  getStockLevel,
  listPantryEntries,
  type PantryProfile,
  type StockLevel,
} from "@shared/shopping";

interface PantryRow {
  key: string;
  label: string;
  level: StockLevel;
  isCommonStaple: boolean;
}

function buildRows(profile: PantryProfile): PantryRow[] {
  const commonRows: PantryRow[] = COMMON_STAPLES.map((staple) => ({
    key: staple.key,
    label: staple.label,
    level: getStockLevel(profile, staple.key),
    isCommonStaple: true,
  }));
  const commonKeys = new Set(commonRows.map((r) => r.key));
  const customRows: PantryRow[] = listPantryEntries(profile)
    .filter((e) => !commonKeys.has(e.key))
    .map((e) => ({
      key: e.key,
      label: commonStapleLabel(e.key) ?? e.key.replace(/\b\w/g, (c) => c.toUpperCase()),
      level: e.level,
      isCommonStaple: false,
    }));
  return [...commonRows, ...customRows];
}

const LEVEL_OPTIONS: { level: StockLevel; label: string }[] = [
  { level: "always", label: "Always" },
  { level: "usually", label: "Usually" },
  { level: "never", label: "Never" },
];

function PantrySection({
  title,
  description,
  profile,
  onSetLevel,
  onClear,
  onReset,
}: {
  title: string;
  description: string;
  profile: PantryProfile;
  onSetLevel: (key: string, level: StockLevel) => void;
  onClear: (key: string) => void;
  onReset: () => void;
}) {
  const [addName, setAddName] = useState("");
  const rows = useMemo(() => buildRows(profile), [profile]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = addName.trim();
    if (!name) return;
    onSetLevel(canonicalizeIngredientName(name) || name.toLowerCase(), "always");
    setAddName("");
  };

  const handleReset = () => {
    if (window.confirm(`Reset ${title} to the default staples list? This clears any custom edits.`)) {
      onReset();
    }
  };

  return (
    <section className={cn(app.panel, "space-y-4 p-4 sm:p-5")}>
      <div className="space-y-1 px-0.5">
        <h2 className={app.titleCard}>{title}</h2>
        <p className={app.subtitle}>{description}</p>
      </div>

      <ul className={cn("space-y-1.5", app.stagger)}>
        {rows.map((row) => (
          <li
            key={row.key}
            className={cn(app.cardSurface, "flex items-center justify-between gap-2 px-3 py-2")}
            data-testid={`pantry-row-${row.key}`}
          >
            <span className="min-w-0 truncate text-sm font-medium text-foreground">{row.label}</span>
            <div className="flex flex-shrink-0 items-center gap-1">
              <div className="flex overflow-hidden rounded-full border border-border">
                {LEVEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.level}
                    type="button"
                    onClick={() => onSetLevel(row.key, opt.level)}
                    className={cn(
                      "px-2.5 py-1.5 text-[11px] font-medium transition-colors duration-150 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      row.level === opt.level
                        ? "bg-primary text-primary-foreground"
                        : "bg-transparent text-muted-foreground hover-elevate hover:text-foreground",
                    )}
                    aria-pressed={row.level === opt.level}
                    data-testid={`button-pantry-${row.key}-${opt.level}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {!row.isCommonStaple && (
                <button
                  type="button"
                  onClick={() => onClear(row.key)}
                  className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full text-muted-foreground hover-elevate active-elevate-2 tap-scale hover:text-destructive touch-manipulation"
                  aria-label={`Remove ${row.label} from pantry`}
                  data-testid={`button-pantry-remove-${row.key}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          placeholder="Track another item (e.g. canned tomatoes)"
          className="min-h-11"
          data-testid={`input-pantry-add-${title.toLowerCase().replace(/\s+/g, "-")}`}
        />
        <Button type="submit" disabled={!addName.trim()} className="min-h-11" data-testid={`button-pantry-add-${title.toLowerCase().replace(/\s+/g, "-")}`}>
          Add
        </Button>
      </form>

      <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground -mb-1">
        Reset to defaults
      </Button>
    </section>
  );
}

export default function MePantryPage() {
  const {
    pantryProfile,
    hallPantry,
    setPersonalStockLevel,
    setHallStockLevel,
    clearPersonalStockLevel,
    clearHallStockLevel,
    resetPersonalPantry,
    resetHallPantry,
  } = useShoppingSession();

  return (
    <MeSubpageShell
      title="Pantry"
      subtitle="Tell us what's always on hand and we'll quietly skip it on every shopping list — no inventory counts, no upkeep."
      testId="me-pantry-page"
    >
      <PantrySection
        title="Your Pantry"
        description="Staples you personally always keep stocked. We've pre-filled the obvious ones."
        profile={pantryProfile}
        onSetLevel={setPersonalStockLevel}
        onClear={clearPersonalStockLevel}
        onReset={resetPersonalPantry}
      />

      <PantrySection
        title="Hall Pantry"
        description="Staples this hall's canteen always keeps on hand — shared with anyone shopping from this device."
        profile={hallPantry}
        onSetLevel={setHallStockLevel}
        onClear={clearHallStockLevel}
        onReset={resetHallPantry}
      />

      <p className={cn(app.caption, "text-center px-2")}>
        "Always" and "Usually" stocked items skip your shopping list automatically. Mark something "Never" to make sure it always shows up.
      </p>
    </MeSubpageShell>
  );
}
