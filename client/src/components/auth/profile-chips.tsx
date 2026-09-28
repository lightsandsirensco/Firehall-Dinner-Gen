import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Multi-select toggle chip — used for dietary/allergy/appliance/cuisine lists. */
export function ChipToggle({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors min-h-9",
        selected
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border/60 text-muted-foreground hover:border-border",
      )}
    >
      {label.replace(/_/g, " ")}
    </button>
  );
}

/** Single-select "pick one" chip row — spice level, difficulty, cook time, nutrition goal. */
export function SingleSelectChips<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(selected ? null : opt)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors min-h-9",
              selected
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border/60 text-muted-foreground hover:border-border",
            )}
          >
            {selected && <Check className="h-3 w-3 shrink-0" aria-hidden />}
            {(labels?.[opt] ?? opt.replace(/_/g, " ")) as string}
          </button>
        );
      })}
    </div>
  );
}
