import { useState } from "react";
import { Link } from "wouter";
import {
  Ban,
  Clock,
  Lock,
  LockOpen,
  MoreHorizontal,
  Search,
  Shuffle,
  ShoppingBag,
  Sparkles,
  Undo2,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { PlannedMealSlot } from "@shared/shift-plan/types";
import type { ShiftPlanSlotPatch } from "@shared/shift-plan/plan";

export interface ShiftMealCardActions {
  onPick: (slot: PlannedMealSlot) => void;
  onSwap: (slot: PlannedMealSlot) => void;
  onBrowse: (slot: PlannedMealSlot) => void;
  onCrew: (slot: PlannedMealSlot) => void;
  onPatch: (slot: PlannedMealSlot, patch: ShiftPlanSlotPatch) => void;
}

function RecipeThumb({ src, title }: { src: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/40">
      {src && !failed ? (
        <img
          src={src}
          alt={title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <UtensilsCrossed className="h-5 w-5 text-muted-foreground" aria-hidden />
      )}
    </span>
  );
}

export function ShiftMealCard({
  slot,
  showDay,
  busy,
  disabled,
  actions,
}: {
  slot: PlannedMealSlot;
  /** Name the weekday — only useful when the shift spans several meal days. */
  showDay: boolean;
  busy: boolean;
  disabled: boolean;
  actions: ShiftMealCardActions;
}) {
  const time = slot.plannedLocal.slice(11, 16);
  const weekday = showDay
    ? new Date(`${slot.mealDate}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
    : null;
  const parked = slot.skipped || slot.byo;
  const recipe = slot.recipe;
  const testId = slot.type === "custom" ? `custom-${slot.customMealId}-${slot.dayIndex}` : `${slot.type}-${slot.dayIndex}`;

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 -mr-2 text-muted-foreground"
          disabled={disabled}
          aria-label={`More options for ${slot.label}`}
          data-testid={`button-meal-menu-${testId}`}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {!parked && (
          <DropdownMenuItem onSelect={() => actions.onBrowse(slot)} data-testid={`menu-browse-${testId}`}>
            <Search className="mr-2 h-4 w-4" aria-hidden />
            Browse recipes
          </DropdownMenuItem>
        )}
        {!parked && recipe && (
          <DropdownMenuItem
            onSelect={() => actions.onPatch(slot, { locked: !slot.locked })}
            data-testid={`menu-lock-${testId}`}
          >
            {slot.locked ? <LockOpen className="mr-2 h-4 w-4" aria-hidden /> : <Lock className="mr-2 h-4 w-4" aria-hidden />}
            {slot.locked ? "Unlock meal" : "Lock meal"}
          </DropdownMenuItem>
        )}
        {!parked && (
          <DropdownMenuItem onSelect={() => actions.onCrew(slot)} data-testid={`menu-crew-${testId}`}>
            <Users className="mr-2 h-4 w-4" aria-hidden />
            Crew size for this meal
          </DropdownMenuItem>
        )}
        {!parked && <DropdownMenuSeparator />}
        {slot.skipped ? (
          <DropdownMenuItem onSelect={() => actions.onPatch(slot, { skipped: false })} data-testid={`menu-unskip-${testId}`}>
            <Undo2 className="mr-2 h-4 w-4" aria-hidden />
            Don't skip
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => actions.onPatch(slot, { skipped: true })} data-testid={`menu-skip-${testId}`}>
            <Ban className="mr-2 h-4 w-4" aria-hidden />
            Skip this meal
          </DropdownMenuItem>
        )}
        {slot.byo ? (
          <DropdownMenuItem onSelect={() => actions.onPatch(slot, { byo: false })} data-testid={`menu-unbyo-${testId}`}>
            <Undo2 className="mr-2 h-4 w-4" aria-hidden />
            Cancel bring your own
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => actions.onPatch(slot, { byo: true })} data-testid={`menu-byo-${testId}`}>
            <ShoppingBag className="mr-2 h-4 w-4" aria-hidden />
            Bring your own
          </DropdownMenuItem>
        )}
        {!parked && recipe && (
          <DropdownMenuItem onSelect={() => actions.onPatch(slot, { recipeSlug: null })} data-testid={`menu-clear-${testId}`}>
            <X className="mr-2 h-4 w-4" aria-hidden />
            Clear meal
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const heading = (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-foreground/90">{slot.label}</span>
      <span className="text-xs tabular-nums text-muted-foreground">
        {weekday ? `${weekday} ` : ""}
        {time}
      </span>
      {slot.optional && !parked && !recipe ? (
        <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">Optional</span>
      ) : null}
      {slot.locked ? <Lock className="h-3 w-3 text-primary" aria-label="Locked" /> : null}
    </div>
  );

  if (parked) {
    return (
      <section
        className={cn(app.cardSurface, "flex items-center justify-between gap-2 px-4 py-3 opacity-80")}
        data-testid={`shift-meal-${testId}`}
        data-state={slot.skipped ? "skipped" : "byo"}
      >
        <div className="min-w-0 space-y-0.5">
          {heading}
          <p className="text-sm text-muted-foreground">{slot.skipped ? "Skipped" : "Bring your own"}</p>
        </div>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="min-h-10 touch-manipulation"
            disabled={disabled}
            onClick={() => actions.onPatch(slot, slot.skipped ? { skipped: false } : { byo: false })}
            data-testid={`button-undo-${testId}`}
          >
            Undo
          </Button>
          {menu}
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(app.cardSurface, "px-4 pb-4 pt-2.5")}
      data-testid={`shift-meal-${testId}`}
      data-state={recipe ? "filled" : "empty"}
      aria-busy={busy}
    >
      <div className="flex items-center justify-between gap-2">
        {heading}
        {menu}
      </div>

      <div className="mt-1 flex items-center gap-3">
        {busy ? (
          <>
            <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </>
        ) : recipe ? (
          <>
            <RecipeThumb src={recipe.imageUrl} title={recipe.title} />
            <div className="min-w-0 flex-1">
              <Link
                href={recipe.path}
                className="line-clamp-2 font-heading text-base leading-snug tracking-tight text-foreground hover:underline"
                data-testid={`link-recipe-${testId}`}
              >
                {recipe.title}
              </Link>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {recipe.totalMinutes ? (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    {recipe.totalMinutes} min
                  </span>
                ) : null}
                <span
                  className={cn("flex items-center gap-1", slot.crewSizeOverride != null && "text-primary")}
                  data-testid={`text-serves-${testId}`}
                >
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  Serves {slot.crewSize}
                </span>
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 py-1">
            <p className="text-sm text-muted-foreground">Nothing planned yet</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground" data-testid={`text-serves-${testId}`}>
              <Users className="h-3.5 w-3.5" aria-hidden />
              <span className={cn(slot.crewSizeOverride != null && "text-primary")}>Serves {slot.crewSize}</span>
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        {recipe ? (
          <Button
            size="sm"
            variant="outline"
            className="min-h-10 flex-1 touch-manipulation sm:flex-none"
            disabled={disabled || busy}
            onClick={() => actions.onSwap(slot)}
            data-testid={`button-swap-${testId}`}
          >
            <Shuffle className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Swap
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              className="min-h-10 flex-1 touch-manipulation sm:flex-none"
              disabled={disabled || busy}
              onClick={() => actions.onPick(slot)}
              data-testid={`button-pick-${testId}`}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Pick
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="min-h-10 touch-manipulation"
              disabled={disabled || busy}
              onClick={() => actions.onBrowse(slot)}
              data-testid={`button-browse-${testId}`}
            >
              Browse
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
