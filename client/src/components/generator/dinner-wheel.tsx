import { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import type { GoldenCatalogIndexEntry } from "@shared/golden-100/recipe-page-schema";
import { isExcludedFromDinnerFeeds } from "@shared/fuel-catalog/isolation";

export type DinnerWheelSliceId =
  | "classics"
  | "comfort"
  | "bbq"
  | "burgers"
  | "tacos"
  | "chili"
  | "pasta"
  | "breakfast"
  | "quick"
  | "high_protein";

export interface DinnerWheelSlice {
  id: DinnerWheelSliceId;
  label: string;
  emoji: string;
  segmentColor: string;
}

export const DINNER_WHEEL_SLICES: DinnerWheelSlice[] = [
  { id: "classics", label: "Classics", emoji: "🔥", segmentColor: "#b91c1c" },
  { id: "comfort", label: "Comfort", emoji: "🍲", segmentColor: "#991b1b" },
  { id: "bbq", label: "BBQ", emoji: "🍖", segmentColor: "#7f1d1d" },
  { id: "burgers", label: "Burgers", emoji: "🍔", segmentColor: "#b45309" },
  { id: "tacos", label: "Tacos", emoji: "🌮", segmentColor: "#a16207" },
  { id: "chili", label: "Chili", emoji: "🥣", segmentColor: "#92400e" },
  { id: "pasta", label: "Pasta", emoji: "🍝", segmentColor: "#4d7c0f" },
  { id: "breakfast", label: "Breakfast", emoji: "🍳", segmentColor: "#15803d" },
  { id: "quick", label: "Quick", emoji: "⏱️", segmentColor: "#0f766e" },
  { id: "high_protein", label: "Protein", emoji: "💪", segmentColor: "#1d4ed8" },
];

const SEGMENT_COUNT = DINNER_WHEEL_SLICES.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

/** Stable layout footprint — never derive size from animation state. */
export const DINNER_WHEEL_LAYOUT = {
  width: "min(92vw, 420px)",
  widthSm: "440px",
  minWidth: "300px",
} as const;

function buildConicGradient(): string {
  const stops = DINNER_WHEEL_SLICES.map((c, i) => {
    const start = (i * 100) / SEGMENT_COUNT;
    const end = ((i + 1) * 100) / SEGMENT_COUNT;
    return `${c.segmentColor} ${start}% ${end}%`;
  });
  return `conic-gradient(from -90deg, ${stops.join(", ")})`;
}

function computeSpinRotation(winIndex: number, extraSpins: number): number {
  const centerOffset = winIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
  return extraSpins * 360 + (360 - centerOffset);
}

function matchesSlice(entry: GoldenCatalogIndexEntry, sliceId: DinnerWheelSliceId): boolean {
  const t = `${entry.title} ${entry.subtitle} ${entry.category} ${entry.cuisine} ${entry.mealFormat} ${entry.tags.join(" ")}`.toLowerCase();
  switch (sliceId) {
    case "classics":
      return entry.category === "firehall_classics" || t.includes("classic") || t.includes("hall");
    case "comfort":
      return entry.category === "comfort_food" || /chili|mac|stew|bake|pot pie|meatloaf|gravy/.test(t);
    case "bbq":
      return entry.category === "bbq_grill_nights" || /bbq|smok|brisket|rib|grill/.test(t);
    case "burgers":
      return entry.mealFormat === "burger" || /burger|smash/.test(t);
    case "tacos":
      return entry.mealFormat === "tacos" || /taco|carnitas|quesadilla/.test(t);
    case "chili":
      return /chili/.test(t);
    case "pasta":
      return entry.mealFormat === "pasta" || /pasta|ziti|lasagna|alfredo|bolognese/.test(t);
    case "breakfast":
      return entry.category === "breakfast_brunch" || /breakfast|skillet|egg|burrito|pancake/.test(t);
    case "quick":
      return entry.cookTime > 0 && entry.cookTime <= 40;
    case "high_protein":
      return entry.category === "healthy_performance" || entry.tags.some((x) => x.toLowerCase().includes("high_protein"));
    default:
      return true;
  }
}

function weightedPick<T>(items: T[], weightOf: (t: T) => number): T | null {
  let total = 0;
  const weights = items.map((it) => {
    const w = Math.max(0, weightOf(it) || 0);
    total += w;
    return w;
  });
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return items[i]!;
  }
  return items[items.length - 1] ?? null;
}

function recipeWeight(entry: GoldenCatalogIndexEntry, sliceId: DinnerWheelSliceId): number {
  let w = 1;
  // Keep a classic hall-first feel by default.
  if (entry.category === "firehall_classics") w += 3.5;
  if (entry.category === "comfort_food") w += 2.5;
  if (entry.category === "bbq_grill_nights") w += 2.0;
  if (entry.category === "pizza_night") w += 1.5;
  // Performance meals exist, but shouldn't dominate unless user asked for it.
  const isPerformance = entry.tags.includes("performance_meals_50");
  if (isPerformance && sliceId !== "high_protein") w *= 0.65;
  return w;
}

export interface DinnerWheelResult {
  slice: DinnerWheelSlice;
  recipe: GoldenCatalogIndexEntry;
}

interface DinnerWheelProps {
  disabled?: boolean;
  catalog: GoldenCatalogIndexEntry[];
  onSpinStart?: () => void;
  onLanded: (result: DinnerWheelResult) => void;
}

export function DinnerWheel({ disabled, catalog, onLanded, onSpinStart }: DinnerWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const rotationRef = useRef(0);
  const conic = useMemo(() => buildConicGradient(), []);

  const spin = useCallback(() => {
    if (spinning || disabled) return;
    onSpinStart?.();
    setSpinning(true);

    const winIndex = Math.floor(Math.random() * SEGMENT_COUNT);
    const slice = DINNER_WHEEL_SLICES[winIndex]!;

    const pool = (catalog || [])
      .filter((r) => !isExcludedFromDinnerFeeds(r))
      .filter((r) => matchesSlice(r, slice.id));

    // Fallback: if slice pool is empty, fall back to whole catalog (still dinner-only).
    const safePool = pool.length ? pool : (catalog || []).filter((r) => !isExcludedFromDinnerFeeds(r));
    const picked = weightedPick(safePool, (r) => recipeWeight(r, slice.id)) ?? safePool[0];

    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const target = rotationRef.current + computeSpinRotation(winIndex, extraSpins);
    rotationRef.current = target;
    setRotation(target);

    window.setTimeout(() => {
      setSpinning(false);
      if (picked) onLanded({ slice, recipe: picked });
    }, 5200);
  }, [spinning, disabled, onLanded, onSpinStart, catalog]);

  return (
    <div
      className="relative mx-auto shrink-0 grow-0 touch-manipulation w-[min(92vw,420px)] min-w-[300px] sm:w-[440px] aspect-square [contain:layout]"
      style={{ aspectRatio: "1 / 1" }}
      data-testid="dinner-wheel"
    >
      {/* Pointer */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -top-1 z-30 flex flex-col items-center"
        aria-hidden
      >
        <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-b-[22px] border-l-transparent border-r-transparent border-b-primary drop-shadow-[0_0_12px_rgba(198,40,40,0.8)]" />
      </div>

      {/* Outer glow ring */}
      <div
        className={`absolute inset-2 rounded-full transition-shadow duration-700 pointer-events-none ${
          spinning
            ? "shadow-[0_0_44px_rgba(198,40,40,0.5)] ring-2 ring-primary/50"
            : "shadow-[0_0_26px_rgba(198,40,40,0.22)] ring-1 ring-primary/25"
        }`}
      />

      {/* Spinning wheel — transform isolated; outer box size never changes */}
      <div className="absolute inset-3 rounded-full overflow-visible">
        <motion.div
          className="relative h-full w-full rounded-full overflow-hidden border-4 border-border/60 origin-center"
          animate={{ rotate: rotation }}
          transition={spinning ? { duration: 5.2, ease: [0.12, 0.8, 0.2, 1] } : { duration: 0 }}
          style={{
            transformOrigin: "50% 50%",
            willChange: spinning ? "transform" : undefined,
          }}
        >
          <div className="absolute inset-0 rounded-full" style={{ background: conic }} />

          {/* Segment dividers */}
          {DINNER_WHEEL_SLICES.map((_, i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full"
              style={{
                background: `linear-gradient(${i * SEGMENT_ANGLE - 90}deg, transparent 49.5%, rgba(0,0,0,0.35) 49.5%, rgba(0,0,0,0.35) 50.5%, transparent 50.5%)`,
              }}
            />
          ))}

          {/* Labels */}
          {DINNER_WHEEL_SLICES.map((slice, i) => {
            const angleDeg = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - 90;
            const angleRad = (angleDeg * Math.PI) / 180;
            const radius = 38;
            const x = 50 + radius * Math.cos(angleRad);
            const y = 50 + radius * Math.sin(angleRad);
            return (
              <div
                key={slice.id}
                className="absolute flex flex-col items-center justify-center text-center pointer-events-none"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: `translate(-50%, -50%) rotate(${angleDeg + 90}deg)`,
                  width: "28%",
                }}
              >
                <span className="text-lg leading-none mb-0.5">{slice.emoji}</span>
                <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide leading-tight drop-shadow-md text-white/95">
                  {slice.label}
                </span>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Center hub */}
      <button
        type="button"
        onClick={spin}
        disabled={spinning || disabled}
        className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 w-[30%] min-w-[92px] max-w-[124px] aspect-square rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-heading tracking-widest uppercase text-xs sm:text-sm shadow-lg shadow-primary/30 border-4 border-background/90 hover:brightness-110 active:brightness-95 transition-[filter,opacity] disabled:opacity-70 disabled:pointer-events-none touch-manipulation"
        data-testid="button-spin-wheel"
      >
        <span className="flex flex-col items-center gap-0.5">
          <Flame className={spinning ? "w-5 h-5 animate-pulse" : "w-5 h-5"} />
          <span>{spinning ? "..." : "Spin"}</span>
        </span>
      </button>
    </div>
  );
}

