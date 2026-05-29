import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FilterState } from "@/components/filter-panel";
import { useQuery } from "@tanstack/react-query";
import type { GoldenCatalogIndexEntry } from "@shared/golden-100/recipe-page-schema";
import { fetchGoldenCatalogIndex } from "@/lib/golden-recipe-api";
import { DinnerWheel, DINNER_WHEEL_LAYOUT, type DinnerWheelResult } from "@/components/generator/dinner-wheel";
import { DinnerWheelReveal } from "@/components/generator/dinner-wheel-reveal";
import { CREW_CHIPS } from "@/lib/tonight-vibes";
import { CLASSICS_WHEEL, CTA, GENERATOR } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";
import { hapticSuccess } from "@/lib/haptics";
import { app } from "@/lib/design-tokens";

type Phase = "ready" | "spinning" | "reveal";

interface GeneratorWheelHubProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onGenerate: () => void;
  isLoading: boolean;
  generateDisabled: boolean;
  compact?: boolean;
}

export function GeneratorWheelHub({
  filters,
  onFiltersChange,
  onGenerate,
  isLoading,
  generateDisabled,
  compact = false,
}: GeneratorWheelHubProps) {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("ready");
  const [winner, setWinner] = useState<DinnerWheelResult | null>(null);
  const [wheelSession, setWheelSession] = useState(0);

  const { data: catalog } = useQuery({
    queryKey: ["hall-catalog-index-wheel"],
    queryFn: fetchGoldenCatalogIndex,
    staleTime: 5 * 60 * 1000,
  });

  const recipes: GoldenCatalogIndexEntry[] = catalog?.recipes ?? [];
  const wheelLocked = phase === "spinning" || phase === "reveal" || isLoading;

  const handleSpinStart = useCallback(() => {
    setPhase("spinning");
    setWinner(null);
  }, []);

  const handleLanded = useCallback(
    (result: DinnerWheelResult) => {
      hapticSuccess();
      setWinner(result);
      setPhase("reveal");
    },
    [],
  );

  const handleSpinAgain = useCallback(() => {
    setWinner(null);
    setPhase("ready");
    setWheelSession((n) => n + 1);
  }, []);

  const crewValue = CREW_CHIPS.some((c) => c.value === filters.crew_size)
    ? filters.crew_size
    : 6;

  return (
    <section
      className={cn(
        "w-full flex flex-col items-center",
        compact ? "py-2" : "py-2 sm:py-4",
      )}
      aria-label="Dinner wheel"
      data-testid="generator-wheel-hub"
    >
      {!compact && (
        <header className="text-center mb-7 sm:mb-9 max-w-xl">
          <p className={cn(app.eyebrowMuted, "justify-center inline-flex items-center gap-2")}>
            <Sparkles className="w-3.5 h-3.5 opacity-80" aria-hidden />
            Hall-tested · 150 meals
          </p>
          <h1 className={cn(app.display, "mt-3")}>
            {GENERATOR.headline}
          </h1>
          <p className={cn(app.lead, "mt-3 max-w-[52ch] mx-auto")}>
            {GENERATOR.subline}
          </p>
        </header>
      )}

      <div
        className="wheel-stage shrink-0 grow-0 flex w-full justify-center items-center relative"
        style={{
          width: `min(100%, ${DINNER_WHEEL_LAYOUT.widthSm})`,
          minHeight: compact
            ? `min(86vw, 420px)`
            : `min(92vw, 420px)`,
        }}
      >
        {/* Cinematic glow (never affects layout) */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.55]"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 62% 55% at 50% 46%, rgba(198,40,40,0.22), transparent 62%)",
          }}
        />
        <DinnerWheel
          key={wheelSession}
          disabled={phase === "spinning" || phase === "reveal"}
          onSpinStart={handleSpinStart}
          onLanded={handleLanded}
          catalog={recipes}
        />
      </div>

      <AnimatePresence mode="sync">
        {phase === "spinning" && (
          <motion.p
            key="suspense"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-sm font-medium text-primary/90 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 animate-pulse" aria-hidden />
            {CLASSICS_WHEEL.suspense}
          </motion.p>
        )}
      </AnimatePresence>

      {phase === "reveal" && winner && (
        <div className="mt-8 w-full max-w-xl animate-in fade-in duration-300">
          <DinnerWheelReveal
            recipe={winner.recipe}
            sliceLabel={winner.slice.label}
            onOpenRecipe={() => navigate(`/recipes/${encodeURIComponent(winner.recipe.slug)}`)}
            onSpinAgain={handleSpinAgain}
          />
        </div>
      )}

      <div className={cn("w-full max-w-md mt-8 space-y-4", phase === "reveal" && "mt-6")}>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" aria-hidden />
            Crew size
          </p>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            {CREW_CHIPS.map((chip) => (
              <Badge
                key={chip.value}
                variant={crewValue === chip.value ? "default" : "outline"}
                className={cn(
                  "cursor-pointer min-h-10 px-3.5 py-2 text-sm touch-manipulation",
                  crewValue === chip.value && "bg-primary text-primary-foreground",
                  wheelLocked && "opacity-70 pointer-events-none",
                )}
                onClick={() => onFiltersChange({ ...filters, crew_size: chip.value })}
                data-testid={`generator-crew-${chip.value}`}
              >
                {chip.label}
              </Badge>
            ))}
          </div>
        </div>

        <Button
          size="lg"
          className={cn(
            "btn-tonight w-full font-heading uppercase tracking-[0.14em] text-sm",
            "transition-[transform,box-shadow,filter] duration-300",
            !wheelLocked && "hover:scale-[1.01]",
          )}
          onClick={onGenerate}
          disabled={generateDisabled || isLoading}
          data-testid="button-generator-spin-dinner"
        >
          {isLoading ? GENERATOR.loading : CTA.pickDinner}
        </Button>
        {winner && phase === "reveal" && (
          <p className="text-center text-xs text-muted-foreground">
            Landed on {winner.recipe.title}. Hit {CTA.pickDinner} when ready.
          </p>
        )}
      </div>
    </section>
  );
}
