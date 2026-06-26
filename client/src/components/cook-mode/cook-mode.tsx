import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  List,
  PhoneCall,
  Sun,
  Moon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { COOK_MODE } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";
import { useScreenWakeLock } from "@/hooks/use-screen-wake-lock";
import type { CookModeRecipe } from "@/lib/cook-mode/types";

interface CookModeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: CookModeRecipe;
  onComplete?: () => void;
}

function groupIngredients(recipe: CookModeRecipe) {
  const groups = new Map<string, CookModeRecipe["ingredients"]>();
  for (const ing of recipe.ingredients) {
    const key = ing.group || "Ingredients";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ing);
  }
  return [...groups.entries()];
}

export function CookMode({ open, onOpenChange, recipe, onComplete }: CookModeProps) {
  const sortedSteps = useMemo(
    () => [...recipe.steps].sort((a, b) => a.stepNumber - b.stepNumber),
    [recipe.steps],
  );
  const totalSteps = sortedSteps.length;
  const [stepIndex, setStepIndex] = useState(0);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [holdingOpen, setHoldingOpen] = useState(false);
  const [wakeLockEnabled, setWakeLockEnabled] = useState(true);
  const wakeLock = useScreenWakeLock(open && wakeLockEnabled);

  const currentStep = sortedSteps[stepIndex];
  const ingredientGroups = useMemo(() => groupIngredients(recipe), [recipe]);
  const holdingNotes = recipe.holdingGuidance ?? [];

  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setIngredientsOpen(false);
      setHoldingOpen(false);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const goPrev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setStepIndex((i) => Math.min(totalSteps - 1, i + 1));
  }, [totalSteps]);

  const finishCooking = useCallback(() => {
    onComplete?.();
    onOpenChange(false);
  }, [onComplete, onOpenChange]);

  const onLastStep = stepIndex >= totalSteps - 1;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goPrev, goNext, onOpenChange]);

  if (!open || totalSteps === 0 || !currentStep) return null;

  const content = (
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-background text-foreground min-h-[100dvh] max-h-[100dvh] touch-manipulation"
      role="dialog"
      aria-modal="true"
      aria-label={`Cook mode — ${recipe.title}`}
      data-testid="cook-mode"
    >
      {/* Header */}
      <header className="shrink-0 border-b border-border/50 bg-background/95 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 min-h-11 min-w-11 touch-manipulation"
            onClick={() => onOpenChange(false)}
            aria-label={COOK_MODE.exitCooking}
            data-testid="button-cook-mode-exit"
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
              Cook mode
            </p>
            <h1 className="font-heading text-base sm:text-lg tracking-wide leading-snug line-clamp-2">
              {recipe.title}
            </h1>
            {recipe.crewSize ? (
              <p className="text-xs text-muted-foreground">{recipe.crewSize} crew</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant={holdingOpen ? "secondary" : "outline"}
            size="sm"
            className="shrink-0 min-h-11 px-2.5 sm:px-3 gap-1.5 touch-manipulation"
            onClick={() => {
              setHoldingOpen((v) => !v);
              setIngredientsOpen(false);
            }}
            data-testid="button-cook-mode-holding"
          >
            <PhoneCall className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline text-xs font-medium">Calls</span>
          </Button>
          {wakeLock.supported ? (
            <Button
              type="button"
              variant={wakeLockEnabled ? "secondary" : "outline"}
              size="icon"
              className="shrink-0 min-h-11 min-w-11 touch-manipulation"
              onClick={() => setWakeLockEnabled((v) => !v)}
              aria-label={wakeLockEnabled ? COOK_MODE.keepAwakeOn : COOK_MODE.keepAwake}
              aria-pressed={wakeLockEnabled}
              data-testid="button-cook-mode-wake-lock"
            >
              {wakeLockEnabled && wakeLock.active ? (
                <Sun className="w-4 h-4 text-primary" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          ) : null}
        </div>

        {/* Sticky step navigation */}
        <nav
          className="border-t border-border/30 px-3 py-2 sm:px-4"
          aria-label="Cook steps"
          data-testid="cook-mode-step-nav"
        >
          <ol className="flex gap-2 overflow-x-auto scroll-momentum pb-0.5">
            {sortedSteps.map((step, index) => {
              const active = index === stepIndex;
              return (
                <li key={step.stepNumber} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setStepIndex(index)}
                    className={cn(
                      "min-h-11 min-w-11 rounded-full text-sm font-semibold tabular-nums touch-manipulation transition-colors",
                      active
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted",
                    )}
                    aria-current={active ? "step" : undefined}
                    data-testid={`cook-mode-step-pill-${step.stepNumber}`}
                  >
                    {step.stepNumber}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
            {COOK_MODE.stepOf(stepIndex + 1, totalSteps)}
          </p>
        </nav>
      </header>

      {/* Step view */}
      <main className="flex-1 overflow-y-auto overscroll-contain scroll-momentum px-4 py-6 sm:px-6 sm:py-8">
        <div className="max-w-2xl mx-auto">
          <div
            className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-primary/15 text-primary font-heading text-4xl sm:text-5xl tabular-nums mb-5"
            aria-hidden
          >
            {currentStep.stepNumber}
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl tracking-wide text-foreground leading-tight mb-4">
            {currentStep.title}
          </h2>
          {(currentStep.heatLevel || currentStep.minutes) && (
            <p className="text-sm text-muted-foreground mb-4">
              {[currentStep.heatLevel && `${currentStep.heatLevel} heat`, currentStep.minutes && `~${currentStep.minutes} min`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <p
            className="text-lg sm:text-xl leading-relaxed text-foreground/90"
            data-testid="cook-mode-step-instruction"
          >
            {currentStep.instruction}
          </p>
        </div>
      </main>

      {/* Holding panel */}
      {holdingOpen && (
        <div
          className="shrink-0 border-t border-primary/30 bg-primary/5 max-h-[40dvh] overflow-y-auto scroll-momentum px-4 py-4 sm:px-6"
          data-testid="cook-mode-holding-panel"
        >
          <h3 className="font-heading text-sm tracking-widest uppercase text-primary mb-1">
            {COOK_MODE.holdingTitle}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">{COOK_MODE.holdingLead}</p>
          <ul className="space-y-2.5 text-[15px] leading-relaxed text-foreground/90">
            {holdingNotes.map((note, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary font-bold shrink-0">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ingredients sheet */}
      {ingredientsOpen && (
        <div
          className="shrink-0 border-t border-border/50 bg-card max-h-[45dvh] overflow-y-auto scroll-momentum px-4 py-4 sm:px-6 pb-safe"
          data-testid="cook-mode-ingredients-panel"
        >
          <h3 className="font-heading text-sm tracking-widest uppercase mb-3">{COOK_MODE.ingredients}</h3>
          <div className="space-y-4">
            {ingredientGroups.map(([group, items]) => (
              <div key={group}>
                {ingredientGroups.length > 1 && (
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {group}
                  </p>
                )}
                <ul className="space-y-0 divide-y divide-border/30">
                  {items.map((ing, i) => (
                    <li key={`${ing.name}-${i}`} className="flex justify-between gap-4 py-3 text-[15px]">
                      <span className="font-medium">
                        {ing.name}
                        {ing.notes ? (
                          <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                            {ing.notes}
                          </span>
                        ) : null}
                      </span>
                      {ing.amount ? (
                        <span className="text-muted-foreground tabular-nums shrink-0">{ing.amount}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <footer className="shrink-0 border-t border-border/50 bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]">
        <div className="grid grid-cols-3 gap-2 p-3 sm:p-4 max-w-2xl mx-auto w-full">
          <Button
            type="button"
            variant="outline"
            className="min-h-12 sm:min-h-14 text-base touch-manipulation gap-1"
            onClick={goPrev}
            disabled={stepIndex === 0}
            data-testid="button-cook-mode-prev"
          >
            <ChevronLeft className="w-5 h-5 shrink-0" />
            <span>{COOK_MODE.previous}</span>
          </Button>
          <Button
            type="button"
            variant={ingredientsOpen ? "secondary" : "outline"}
            className="min-h-12 sm:min-h-14 text-base touch-manipulation gap-1.5"
            onClick={() => {
              setIngredientsOpen((v) => !v);
              setHoldingOpen(false);
            }}
            data-testid="button-cook-mode-ingredients"
          >
            <List className="w-5 h-5 shrink-0" />
            <span className="truncate">{COOK_MODE.ingredients}</span>
          </Button>
          <Button
            type="button"
            className="min-h-12 sm:min-h-14 text-base touch-manipulation gap-1"
            onClick={onLastStep ? finishCooking : goNext}
            disabled={!onLastStep && stepIndex >= totalSteps - 1}
            data-testid={onLastStep ? "button-cook-mode-done" : "button-cook-mode-next"}
          >
            <span className="truncate">{onLastStep ? COOK_MODE.doneCooking : COOK_MODE.next}</span>
            {!onLastStep ? <ChevronRight className="w-5 h-5 shrink-0" /> : null}
          </Button>
        </div>
      </footer>
    </div>
  );

  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
}
