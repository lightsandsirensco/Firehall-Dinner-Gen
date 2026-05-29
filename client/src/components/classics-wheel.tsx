import { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";
import {
  WHEEL_CLASSICS,
  type WheelClassic,
  playWheelSound,
  pickWeightedWheelClassic,
  recordWheelClassicSlug,
} from "@/lib/firehall-classics-wheel";
import { pickWheelLandLine, pickWheelIntro, pickWheelSuspense } from "@/lib/wheel-personality";
import { MealTrustBadges } from "@/components/trust/meal-trust-badges";
import { MealShareCard, shareMealNative } from "@/components/share/meal-share-card";
import { Share2 } from "lucide-react";
import { MealHeroImage } from "@/components/meal-hero-image";
import { cn } from "@/lib/utils";

const SEGMENT_COUNT = WHEEL_CLASSICS.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

/** Stable layout footprint — never derive size from animation state. */
export const WHEEL_LAYOUT = {
  width: "min(92vw, 400px)",
  widthSm: "420px",
  minWidth: "280px",
} as const;

function buildConicGradient(): string {
  const stops = WHEEL_CLASSICS.map((c, i) => {
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

interface ClassicsWheelProps {
  disabled?: boolean;
  /** Highlight winning segment after land (wheel stays mounted). */
  winnerIndex?: number | null;
  onLanded: (classic: WheelClassic) => void;
  onSpinStart?: (suspenseLine: string) => void;
}

export function ClassicsWheel({ disabled, winnerIndex, onLanded, onSpinStart }: ClassicsWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const rotationRef = useRef(0);
  const conic = useMemo(() => buildConicGradient(), []);

  const highlightedIndex =
    winnerIndex != null && !spinning ? winnerIndex : activeIndex;

  const spin = useCallback(() => {
    if (spinning || disabled) return;
    setSpinning(true);
    setActiveIndex(null);
    onSpinStart?.(pickWheelSuspense(String(Date.now())));
    playWheelSound("tick");

    const seed = `${Date.now()}:${rotationRef.current}`;
    const { classic: winner, index: winIndex } = pickWeightedWheelClassic(seed);
    recordWheelClassicSlug(winner.slug);
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const target = rotationRef.current + computeSpinRotation(winIndex, extraSpins);
    rotationRef.current = target;
    setRotation(target);

    window.setTimeout(() => {
      setSpinning(false);
      setActiveIndex(winIndex);
      playWheelSound("land");
      onLanded(winner);
      window.setTimeout(() => playWheelSound("reveal"), 400);
    }, 5200);
  }, [spinning, disabled, onLanded, onSpinStart]);

  return (
    <div
      className="relative mx-auto shrink-0 grow-0 touch-manipulation w-[min(92vw,400px)] min-w-[280px] sm:w-[420px] aspect-square [contain:layout]"
      style={{ aspectRatio: "1 / 1" }}
      data-testid="classics-wheel"
    >
      {/* Pointer */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -top-1 z-30 flex flex-col items-center"
        aria-hidden
      >
        <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-b-[22px] border-l-transparent border-r-transparent border-b-primary drop-shadow-[0_0_12px_rgba(198,40,40,0.8)]" />
      </div>

      {/* Metallic outer ring */}
      <div
        className={`absolute inset-1 rounded-full pointer-events-none transition-all duration-700 ${
          highlightedIndex !== null && !spinning
            ? "shadow-[0_0_64px_rgba(198,40,40,0.7),inset_0_0_24px_rgba(255,255,255,0.08)] ring-2 ring-primary/80"
            : spinning
              ? "shadow-[0_0_48px_rgba(198,40,40,0.5)] ring-2 ring-primary/50 animate-pulse"
              : "shadow-[0_0_28px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
        }`}
        style={{
          background:
            "conic-gradient(from 0deg, hsl(0 0% 22%), hsl(0 0% 12%), hsl(0 55% 18%), hsl(0 0% 12%), hsl(0 0% 22%))",
        }}
      />

      {/* Spinning wheel — transform isolated; outer box size never changes */}
      <div className="absolute inset-3 rounded-full overflow-visible">
        <motion.div
          className="relative h-full w-full rounded-full overflow-hidden border-4 border-border/60 origin-center"
          animate={{ rotate: rotation }}
          transition={
            spinning
              ? { duration: 5.2, ease: [0.12, 0.8, 0.2, 1] }
              : { duration: 0 }
          }
          style={{
            transformOrigin: "50% 50%",
            willChange: spinning ? "transform" : undefined,
          }}
        >
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: conic }}
        />
        {/* Segment dividers */}
        {WHEEL_CLASSICS.map((_, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full"
            style={{
              background: `linear-gradient(${i * SEGMENT_ANGLE - 90}deg, transparent 49.5%, rgba(0,0,0,0.35) 49.5%, rgba(0,0,0,0.35) 50.5%, transparent 50.5%)`,
            }}
          />
        ))}
        {/* Labels */}
        {WHEEL_CLASSICS.map((classic, i) => {
          const angleDeg = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - 90;
          const angleRad = (angleDeg * Math.PI) / 180;
          const radius = 38;
          const x = 50 + radius * Math.cos(angleRad);
          const y = 50 + radius * Math.sin(angleRad);
          const isActive = highlightedIndex === i && !spinning;
          return (
            <div
              key={classic.slug}
              className="absolute flex flex-col items-center justify-center text-center pointer-events-none"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%, -50%) rotate(${angleDeg + 90}deg)`,
                width: "28%",
              }}
            >
              <span
                className={cn(
                  "mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/35 ring-1 ring-white/25 text-[10px] font-bold uppercase tracking-wide text-white/95",
                  isActive && "ring-primary/60 bg-primary/25",
                )}
                aria-hidden
              >
                {classic.shortLabel.slice(0, 2)}
              </span>
              <span
                className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide leading-tight drop-shadow-md ${
                  isActive ? "text-white font-bold brightness-110" : "text-white/95"
                }`}
              >
                {classic.shortLabel}
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
        className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 w-[30%] min-w-[92px] max-w-[124px] aspect-square rounded-full bg-gradient-to-br from-primary via-primary/90 to-[hsl(0_55%_22%)] text-primary-foreground font-heading tracking-widest uppercase text-xs sm:text-sm shadow-[0_8px_32px_rgba(198,40,40,0.45)] border-4 border-[hsl(0_0%_8%)] ring-2 ring-white/15 hover:brightness-110 active:scale-[0.97] transition-all disabled:opacity-70 disabled:pointer-events-none touch-manipulation"
        data-testid="button-spin-wheel"
      >
        {spinning ? (
          <span className="flex flex-col items-center gap-0.5">
            <Flame className="w-5 h-5 animate-pulse" />
            <span className="text-[10px]">...</span>
          </span>
        ) : (
          <span className="flex flex-col items-center gap-0.5">
            <Flame className="w-5 h-5" />
            <span>Spin</span>
          </span>
        )}
      </button>
    </div>
  );
}

interface WheelRevealProps {
  classic: WheelClassic;
  pinned: boolean;
  onCook: () => void;
  onSpinAgain: () => void;
  onTogglePin: () => void;
  onExplore: () => void;
}

export function WheelReveal({
  classic,
  pinned,
  onCook,
  onSpinAgain,
  onTogglePin,
  onExplore,
}: WheelRevealProps) {
  const landSeed = `${classic.slug}:${Date.now()}`;
  const intro = pickWheelIntro(landSeed);
  const landLine = pickWheelLandLine(landSeed, classic.tags.includes("rookie_friendly"));

  const handleShare = async () => {
    await shareMealNative({
      title: classic.title,
      text: `${intro} ${classic.title} — ${landLine}`,
      url: typeof window !== "undefined" ? `${window.location.origin}/classics-wheel` : undefined,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-xl mx-auto shrink-0 space-y-6"
        data-testid="wheel-reveal"
      >
        {/* Off-screen share surface for screenshots */}
        <div className="sr-only" aria-hidden>
          <MealShareCard
            title={classic.title}
            subtitle={landLine}
            heroImage={classic.heroImage}
            imageAlt={classic.imageAlt}
            heldLabel={classic.heldImageryLabel}
            eyebrow={intro}
            trustInput={{ tags: classic.tags, cuisine: classic.cuisine }}
          />
        </div>

        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-primary/40 bg-card shadow-2xl shadow-primary/20 ring-1 ring-primary/30">
          <MealHeroImage
            src={classic.heroImage}
            alt={classic.imageAlt}
            heldLabel={classic.heldImageryLabel}
            title={classic.title}
            variant="cinematic"
            className="w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent pointer-events-none" />
          <motion.div
            className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-primary/25 blur-3xl"
            animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
          <div className="relative p-6 sm:p-8 text-center -mt-2">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-xs uppercase tracking-[0.35em] text-primary font-semibold mb-3 drop-shadow-sm"
            >
              {intro}
            </motion.p>
            <h2
              className="font-heading text-2xl sm:text-3xl tracking-wide text-foreground mb-2"
              data-testid="text-wheel-winner"
            >
              {classic.title}
            </h2>
            <p className="text-sm font-medium text-primary/90 mb-1">{landLine}</p>
            <p className="text-sm text-muted-foreground mb-1">{classic.tagline}</p>
            <p className="text-sm text-foreground/80 leading-relaxed max-w-md mx-auto mb-4">
              {classic.crewLine}
            </p>
            <MealTrustBadges
              input={{ tags: classic.tags, cuisine: classic.cuisine }}
              max={3}
              className="justify-center mb-6"
            />
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <span className="text-[10px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                {classic.protein}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border/40">
                {classic.cuisine}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onCook}
                className="col-span-1 sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-heading tracking-wider uppercase text-sm py-3.5 px-4 min-h-[52px] hover:bg-primary/90 active:scale-[0.98] transition-all touch-manipulation"
                data-testid="button-wheel-cook"
              >
                <Flame className="w-4 h-4" />
                Cook this one
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 text-primary font-medium text-sm py-3 px-3 min-h-11 hover:bg-primary/20 transition-colors touch-manipulation active:scale-[0.98]"
                data-testid="button-wheel-share"
              >
                <Share2 className="w-4 h-4" />
                Share pick
              </button>
              <button
                type="button"
                onClick={onExplore}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/50 bg-muted/40 text-foreground font-medium text-sm py-3 px-3 min-h-11 hover:bg-muted/70 transition-colors touch-manipulation active:scale-[0.98]"
                data-testid="button-wheel-explore"
              >
                Similar meals
              </button>
              <button
                type="button"
                onClick={onSpinAgain}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/50 bg-transparent text-foreground font-medium text-sm py-3 px-3 min-h-11 hover:bg-white/[0.04] transition-colors touch-manipulation active:scale-[0.98]"
                data-testid="button-wheel-spin-again"
              >
                Spin again
              </button>
              <button
                type="button"
                onClick={onTogglePin}
                className={`inline-flex items-center justify-center gap-2 rounded-lg border text-sm py-3 px-3 min-h-11 transition-colors touch-manipulation sm:col-span-2 ${
                  pinned
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/50 bg-transparent text-muted-foreground hover:text-foreground"
                }`}
                data-testid="button-wheel-pin"
              >
                {pinned ? "Pinned to hall board" : "Pin this classic"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
