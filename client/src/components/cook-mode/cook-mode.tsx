import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
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

/** Horizontal swipe distance (px) that turns the page — forgiving for wet/gloved hands. */
const SWIPE_MIN_PX = 60;

function groupIngredients(recipe: CookModeRecipe) {
  const groups = new Map<string, CookModeRecipe["ingredients"]>();
  for (const ing of recipe.ingredients) {
    const key = ing.group || "Ingredients";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ing);
  }
  return [...groups.entries()];
}

/**
 * Split Cook Mode: a short photo band on top, then a solid instruction panel.
 * Instruction text never sits on the photo.
 */
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
  const [imageFailed, setImageFailed] = useState(false);
  const wakeLock = useScreenWakeLock(open && wakeLockEnabled);
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const currentStep = sortedSteps[stepIndex];
  const ingredientGroups = useMemo(() => groupIngredients(recipe), [recipe]);
  const holdingNotes = recipe.holdingGuidance ?? [];
  const showImage = Boolean(recipe.imageUrl) && !imageFailed;
  const sheetOpen = ingredientsOpen || holdingOpen;

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

  useEffect(() => {
    setImageFailed(false);
  }, [recipe.imageUrl]);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [stepIndex]);

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

  const meta = [
    currentStep.minutes ? { icon: Clock, label: `~${currentStep.minutes} min`, testId: "cook-mode-step-time" } : null,
    currentStep.heatLevel
      ? {
          icon: Flame,
          label: `${currentStep.heatLevel.charAt(0).toUpperCase()}${currentStep.heatLevel.slice(1)} heat`,
          testId: "cook-mode-step-heat",
        }
      : null,
  ].filter(Boolean) as Array<{ icon: typeof Clock; label: string; testId: string }>;

  const navButton =
    "h-auto min-h-14 sm:min-h-14 touch-manipulation flex-col gap-0.5 px-2 py-2 text-[13px] font-semibold sm:flex-row sm:gap-1.5 sm:text-base";

  const content = (
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-background text-foreground min-h-[100dvh] max-h-[100dvh] overflow-hidden touch-manipulation"
      role="dialog"
      aria-modal="true"
      aria-label={`Cook mode — ${recipe.title}`}
      data-testid="cook-mode"
    >
      {/* Header — solid, compact */}
      <header className="shrink-0 border-b border-border/50 bg-background pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
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
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">Cook mode</p>
            <h1 className="font-heading text-sm sm:text-lg tracking-wide leading-snug truncate">{recipe.title}</h1>
            {recipe.crewSize ? (
              <p className="text-[11px] text-muted-foreground leading-tight">{recipe.crewSize} crew</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant={holdingOpen ? "secondary" : "ghost"}
            size="sm"
            className="shrink-0 min-h-11 min-w-11 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground touch-manipulation aria-pressed:text-foreground"
            onClick={() => {
              setHoldingOpen((v) => !v);
              setIngredientsOpen(false);
            }}
            aria-pressed={holdingOpen}
            aria-label={holdingOpen ? "Close calls panel" : "Calls — pausing mid-cook"}
            data-testid="button-cook-mode-holding"
          >
            <PhoneCall className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline text-xs font-medium">Calls</span>
          </Button>
          {wakeLock.supported ? (
            <Button
              type="button"
              variant={wakeLockEnabled ? "secondary" : "ghost"}
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

        {totalSteps > 1 ? (
          <nav className="px-2 pb-2 sm:px-4" aria-label="Cook steps" data-testid="cook-mode-step-nav">
            <ol className="flex gap-1.5 overflow-x-auto scroll-momentum scrollbar-hide">
              {sortedSteps.map((step, index) => {
                const active = index === stepIndex;
                return (
                  <li key={step.stepNumber} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setStepIndex(index)}
                      className={cn(
                        "min-h-10 min-w-10 rounded-full text-sm font-semibold tabular-nums touch-manipulation transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : index < stepIndex
                            ? "bg-muted text-foreground/70 hover:bg-muted/80"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted",
                      )}
                      aria-current={active ? "step" : undefined}
                      aria-label={`Step ${step.stepNumber}`}
                      data-testid={`cook-mode-step-pill-${step.stepNumber}`}
                    >
                      {step.stepNumber}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}
      </header>

      {/* Body — photo band on top, solid instruction panel below */}
      <div className="flex flex-1 min-h-0 flex-col">
        {showImage ? (
          <div
            className={cn(
              "relative shrink-0 overflow-hidden bg-muted",
              "h-[clamp(6.5rem,20dvh,10rem)] sm:h-auto sm:basis-[38%] sm:max-h-[26rem]",
              "[@media(max-height:560px)]:hidden",
              sheetOpen && "max-sm:hidden",
            )}
            data-testid="cook-mode-image"
          >
            <img
              src={recipe.imageUrl}
              alt={recipe.imageAlt || recipe.title}
              className="h-full w-full object-cover"
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          </div>
        ) : null}

        <div
          ref={panelRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-momentum border-t border-border/60 bg-card text-card-foreground"
          data-testid="cook-mode-instruction-panel"
          onTouchStart={(e) => {
            const t = e.touches[0];
            touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
          }}
          onTouchEnd={(e) => {
            const start = touchStart.current;
            const t = e.changedTouches[0];
            touchStart.current = null;
            if (!start || !t) return;
            const dx = t.clientX - start.x;
            const dy = t.clientY - start.y;
            if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
            if (dx < 0) goNext();
            else goPrev();
          }}
        >
          <div className="mx-auto w-full max-w-2xl px-5 pt-5 pb-8 sm:px-8 sm:pt-7 sm:pb-10">
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-heading text-2xl tabular-nums sm:h-12 sm:w-12"
                aria-hidden
              >
                {currentStep.stepNumber}
              </span>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
                {COOK_MODE.stepOf(stepIndex + 1, totalSteps)}
              </p>
            </div>

            <h2 className="mt-4 font-heading text-[1.65rem] sm:text-3xl tracking-wide leading-tight text-foreground break-words">
              {currentStep.title}
            </h2>

            {meta.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Step details">
                {meta.map(({ icon: Icon, label, testId }) => (
                  <li
                    key={testId}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1 text-sm font-medium text-foreground/90"
                    data-testid={testId}
                  >
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            ) : null}

            <p
              className="mt-5 text-[1.3rem] leading-[1.6] sm:text-2xl sm:leading-[1.65] text-foreground break-words"
              data-testid="cook-mode-step-instruction"
            >
              {currentStep.instruction}
            </p>
          </div>
        </div>
      </div>

      {/* Calls — solid surface */}
      {holdingOpen && (
        <div
          className="shrink-0 border-t-2 border-primary/60 bg-card max-h-[45dvh] overflow-y-auto overscroll-contain scroll-momentum px-5 py-4 sm:px-8"
          data-testid="cook-mode-holding-panel"
        >
          <div className="mx-auto max-w-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-sm tracking-widest uppercase text-primary">
                  {COOK_MODE.holdingTitle}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{COOK_MODE.holdingLead}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="-mr-2 -mt-1 min-h-11 min-w-11 shrink-0"
                onClick={() => setHoldingOpen(false)}
                aria-label="Close calls panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ul className="mt-3 space-y-2.5 text-base leading-relaxed text-foreground">
              {holdingNotes.map((note, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary font-bold shrink-0">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Ingredients sheet */}
      {ingredientsOpen && (
        <div
          className="shrink-0 border-t-2 border-border bg-card max-h-[45dvh] overflow-y-auto overscroll-contain scroll-momentum px-5 py-4 sm:px-8"
          data-testid="cook-mode-ingredients-panel"
        >
          <div className="mx-auto max-w-2xl">
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
                      <li key={`${ing.name}-${i}`} className="flex justify-between gap-4 py-3 text-base">
                        <span className="font-medium min-w-0 break-words">
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
        </div>
      )}

      {/* Bottom controls — solid, always reachable */}
      <footer className="shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)]">
        <div className="mx-auto grid w-full max-w-2xl grid-cols-[1fr_1fr_1.35fr] gap-2 p-2.5 sm:gap-3 sm:p-4">
          <Button
            type="button"
            variant="outline"
            className={navButton}
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
            className={navButton}
            onClick={() => {
              setIngredientsOpen((v) => !v);
              setHoldingOpen(false);
            }}
            aria-pressed={ingredientsOpen}
            data-testid="button-cook-mode-ingredients"
          >
            <List className="w-5 h-5 shrink-0" />
            <span className="truncate max-w-full">{COOK_MODE.ingredients}</span>
          </Button>
          <Button
            type="button"
            className="h-auto min-h-14 touch-manipulation gap-1 px-3 text-lg font-semibold"
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
