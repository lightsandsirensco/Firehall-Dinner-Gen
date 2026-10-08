import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronUp, PackageCheck, Plus, ShoppingCart, Trash2, Undo2, X } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LoadingState } from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/context";
import { useToast } from "@/hooks/use-toast";
import { trackShiftPlanEvent } from "@/lib/analytics";
import { hapticLight } from "@/lib/haptics";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useMeasurementSystem } from "@/lib/measurement-preference";
import { formatLocalDay } from "@/lib/schedule-format";
import { scheduleErrorMessage } from "@/lib/schedule-api";
import { fetchShiftPlan, shiftPlanQueryKey } from "@/lib/shift-plan-api";
import { fetchShiftList, openShiftList, sendShiftListOp, shiftListQueryKey } from "@/lib/shift-list-api";
import { getPantryProfile, savePantryProfile } from "@/lib/shopping/shopping-store";
import {
  formatShoppingItemQuantity,
  groupByDepartment,
  setStockLevel,
  splitPantryItems,
  type ShoppingListItem,
} from "@shared/shopping";
import type { ShiftListOp } from "@shared/shift-plan/shopping";
import type { ShiftShoppingListResponse, ShiftShoppingListView } from "@shared/shift-plan/types";

const REFRESH_MS = 20_000;

function BackToPlanner() {
  return (
    <Link
      href="/shift-planner"
      className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground touch-manipulation"
      data-testid="link-back-to-planner"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Shift plan
    </Link>
  );
}

function ShiftListBody({ shiftKey, shiftStartLocal }: { shiftKey: string; shiftStartLocal: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [measurementSystem] = useMeasurementSystem();
  const [opened, setOpened] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [showPantry, setShowPantry] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const pendingOps = useRef(0);

  const open = useCallback(
    async (initial: boolean) => {
      try {
        const res = await openShiftList(shiftKey);
        queryClient.setQueryData(shiftListQueryKey, res);
        setOpenError(null);
        setOpened(true);
        if (initial && res.list) {
          const params = {
            shift_key: shiftKey,
            meal_count: res.list.meals.length,
            item_count: res.list.list.items.length,
          };
          if (res.created) trackShiftPlanEvent("shift_list_generated", params);
          trackShiftPlanEvent("shift_list_opened", params);
        }
      } catch (err) {
        setOpenError(scheduleErrorMessage(err, "Couldn't build your shopping list"));
      }
    },
    [queryClient, shiftKey],
  );

  useEffect(() => {
    void open(true);
  }, [open]);

  const listQuery = useQuery({
    queryKey: shiftListQueryKey,
    queryFn: fetchShiftList,
    enabled: opened,
    staleTime: 5_000,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  });
  const view = listQuery.data?.list ?? null;

  const runOp = async (op: ShiftListOp, optimistic?: (v: ShiftShoppingListView) => ShiftShoppingListView) => {
    await queryClient.cancelQueries({ queryKey: shiftListQueryKey });
    const previous = queryClient.getQueryData<ShiftShoppingListResponse>(shiftListQueryKey);
    if (optimistic && previous?.list) {
      queryClient.setQueryData(shiftListQueryKey, { ...previous, list: optimistic(previous.list) });
    }
    pendingOps.current += 1;
    try {
      const res = await sendShiftListOp(shiftKey, op);
      pendingOps.current -= 1;
      if (pendingOps.current === 0) queryClient.setQueryData(shiftListQueryKey, res);
      return true;
    } catch (err) {
      pendingOps.current -= 1;
      toast({ title: scheduleErrorMessage(err, "Couldn't update your list"), variant: "destructive" });
      void queryClient.invalidateQueries({ queryKey: shiftListQueryKey });
      if (err instanceof Error && err.message.startsWith("409")) {
        void queryClient.invalidateQueries({ queryKey: shiftPlanQueryKey });
      }
      return false;
    }
  };

  const toggle = (item: ShoppingListItem) => {
    const checked = !item.checked;
    if (checked) hapticLight();
    void runOp({ type: "check", itemId: item.id, checked }, (v) => ({
      ...v,
      list: { ...v.list, items: v.list.items.map((i) => (i.id === item.id ? { ...i, checked } : i)) },
    })).then((ok) => {
      if (ok && checked) {
        trackShiftPlanEvent("shift_list_item_checked", { shift_key: shiftKey, manual: item.isManual ? 1 : 0 });
      }
    });
  };

  const addManual = (e: React.FormEvent) => {
    e.preventDefault();
    const name = manualName.trim();
    if (!name) return;
    setManualName("");
    void runOp({ type: "add_manual", name }).then((ok) => {
      if (ok) trackShiftPlanEvent("shift_list_manual_item_added", { shift_key: shiftKey });
      else setManualName(name);
    });
  };

  const needThis = (item: ShoppingListItem) => {
    savePantryProfile(setStockLevel(getPantryProfile(), item.canonicalKey, "never"));
    void open(false);
  };

  const items = view?.list.items ?? [];
  const { active, skipped } = useMemo(() => splitPantryItems(items), [items]);
  const grouped = useMemo(() => groupByDepartment(active), [active]);
  const checkedCount = active.filter((i) => i.checked).length;
  const optional = view?.list.excludedOptional ?? [];
  const multiDay = new Set(view?.meals.map((m) => m.dayIndex)).size > 1;

  if (openError && !view) {
    return (
      <section className={cn(app.cardSurface, "space-y-3 p-5 text-sm")} data-testid="shift-list-error">
        <p className="text-muted-foreground">{openError}</p>
        <Button asChild className="min-h-11 w-full">
          <Link href="/shift-planner">Back to the shift plan</Link>
        </Button>
      </section>
    );
  }
  if (!view) return <LoadingState variant="compact" />;

  return (
    <div className="space-y-5" data-testid="shift-list">
      <header className="space-y-1">
        <p className={app.eyebrowAccent}>Shop for this shift</p>
        <h1 className="font-heading text-2xl tracking-tight sm:text-3xl">{formatLocalDay(shiftStartLocal)}</h1>
        <ul className="pt-1 text-sm text-muted-foreground" data-testid="shift-list-meals">
          {view.meals.map((m) => (
            <li key={m.slotKey} className="flex gap-1.5">
              <span className="shrink-0 font-medium text-foreground/90">
                {multiDay ? `Day ${m.dayIndex} ` : ""}
                {m.label}
              </span>
              <span className="min-w-0 truncate">{m.recipeTitle}</span>
              <span className="shrink-0 tabular-nums">· {m.crewSize}</span>
            </li>
          ))}
        </ul>
        {view.unavailable.length > 0 ? (
          <p className="text-xs text-muted-foreground" data-testid="shift-list-unavailable">
            {view.unavailable.length === 1 ? "One planned meal has" : `${view.unavailable.length} planned meals have`} no
            shopping data yet.
          </p>
        ) : null}
      </header>

      <div className="flex min-h-9 items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground tabular-nums" data-testid="shift-list-progress">
          {active.length > 0 ? `${checkedCount} of ${active.length} in the cart` : "Nothing to buy"}
        </p>
        {view.canUndo ? (
          <Button
            variant="ghost"
            size="sm"
            className="min-h-9 gap-1.5"
            onClick={() => void runOp({ type: "undo" })}
            data-testid="button-shift-list-undo"
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden />
            Undo
          </Button>
        ) : null}
      </div>

      <form onSubmit={addManual} className="flex gap-2">
        <Input
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          placeholder="Add an item (e.g. coffee filters)"
          maxLength={80}
          className="min-h-11"
          aria-label="Add an item"
          data-testid="input-shift-list-manual"
        />
        <Button type="submit" disabled={!manualName.trim()} className="min-h-11 gap-1.5" data-testid="button-shift-list-add">
          <Plus className="h-4 w-4" aria-hidden />
          Add
        </Button>
      </form>

      {grouped.length > 0 ? (
        <div className="space-y-5">
          {grouped.map(({ department, items: deptItems }) => (
            <section key={department} className="space-y-1.5">
              <h2 className="px-0.5 text-xs font-medium text-muted-foreground/80">{department}</h2>
              <ul className="space-y-1">
                {deptItems.map((item) => {
                  const quantity = item.quantityLabel ? formatShoppingItemQuantity(item, measurementSystem) : "";
                  return (
                    <li
                      key={item.id}
                      className={cn(app.cardSurface, "flex items-center gap-3 px-3 py-2", item.checked && "opacity-50")}
                      data-testid={`shift-list-item-${item.canonicalKey}`}
                    >
                      <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 touch-manipulation">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={() => toggle(item)}
                          aria-label={`${item.displayName}${quantity ? `, ${quantity}` : ""}`}
                          data-testid={`checkbox-shift-list-${item.id}`}
                        />
                        <span className="min-w-0">
                          <span className={cn("block text-sm font-medium", item.checked && "line-through")}>
                            {item.displayName}
                            {quantity ? <span className="font-normal text-muted-foreground"> — {quantity}</span> : null}
                          </span>
                          {item.contributions.length > 1 ? (
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {[...new Set(item.contributions.map((c) => c.recipeTitle))].join(", ")}
                            </span>
                          ) : null}
                        </span>
                      </label>
                      {item.isManual ? (
                        <button
                          type="button"
                          onClick={() => void runOp({ type: "remove", itemId: item.id })}
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground hover-elevate touch-manipulation"
                          aria-label={`Remove ${item.displayName}`}
                          data-testid={`button-shift-list-remove-${item.id}`}
                        >
                          <X className="h-4 w-4" aria-hidden />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {checkedCount > 0 ? (
            <Button
              variant="outline"
              className="min-h-11 w-full gap-1.5"
              onClick={() => void runOp({ type: "clear_checked" })}
              data-testid="button-shift-list-clear-checked"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Clear {checkedCount} checked
            </Button>
          ) : null}
        </div>
      ) : (
        <section className={cn(app.panel, "space-y-2 px-6 py-10 text-center")} data-testid="shift-list-empty">
          <ShoppingCart className="mx-auto h-6 w-6 text-primary/90" aria-hidden />
          <p className={app.titleCard}>{skipped.length > 0 ? "Nothing left to buy" : "Your list is empty"}</p>
          <p className={cn(app.subtitle, "mx-auto max-w-xs")}>
            {skipped.length > 0 ? "Your pantry covers the rest." : "Add anything else the shift needs above."}
          </p>
        </section>
      )}

      {skipped.length > 0 ? (
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setShowPantry((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between gap-2 text-left touch-manipulation"
            aria-expanded={showPantry}
            data-testid="button-shift-list-toggle-pantry"
          >
            <h2 className={app.eyebrowMuted}>Already in your pantry ({skipped.length})</h2>
            {showPantry ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
          </button>
          {showPantry ? (
            <ul className="space-y-1">
              {skipped.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2"
                  data-testid={`shift-list-pantry-${item.canonicalKey}`}
                >
                  <PackageCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                    {item.displayName}
                    {item.quantityLabel ? ` — ${formatShoppingItemQuantity(item, measurementSystem)}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => needThis(item)}
                    className="min-h-10 shrink-0 rounded-md px-2 text-xs font-medium text-primary hover-elevate touch-manipulation"
                    data-testid={`button-shift-list-need-${item.id}`}
                  >
                    I need this
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {optional.length > 0 ? (
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between gap-2 text-left touch-manipulation"
            aria-expanded={showOptional}
            data-testid="button-shift-list-toggle-optional"
          >
            <h2 className={app.eyebrowMuted}>Optional extras left off ({optional.length})</h2>
            {showOptional ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
          </button>
          {showOptional ? (
            <ul className="space-y-0.5 px-0.5 text-sm text-muted-foreground" data-testid="shift-list-optional">
              {optional.map((o, i) => (
                <li key={`${o.recipeSlug}-${i}`}>
                  {o.name} <span className="text-xs">· {o.recipeTitle}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <p className={cn(app.caption, "px-2 text-center")}>
        Saved to your account — open it on any device.{" "}
        <Link href="/me/pantry" className="font-medium text-primary hover:underline">
          Edit your pantry
        </Link>
      </p>
    </div>
  );
}

/** /shift-planner/shop — one shopping list for every planned meal of the current/next shift. */
export default function ShiftListPage() {
  const { authenticated, openSignIn } = useAuth();
  const planQuery = useQuery({
    queryKey: shiftPlanQueryKey,
    queryFn: fetchShiftPlan,
    enabled: authenticated,
    staleTime: 30_000,
  });
  const shift = planQuery.data?.shift ?? null;

  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background">
      <SiteHeader activePage="generator" />
      <main className={cn(app.main, "py-4 sm:py-8 pb-24")}>
        <div className="mx-auto max-w-xl space-y-3">
          <BackToPlanner />
          {!authenticated ? (
            <section className={cn(app.cardSurface, "space-y-3 p-6 text-center")}>
              <p className="text-sm text-muted-foreground">Sign in to build one shopping list for your whole shift.</p>
              <Button onClick={() => openSignIn("/shift-planner/shop")} data-testid="button-shift-list-sign-in">
                Sign in
              </Button>
            </section>
          ) : planQuery.isLoading ? (
            <LoadingState variant="compact" />
          ) : !shift ? (
            <section className={cn(app.cardSurface, "space-y-3 p-5 text-sm")} data-testid="shift-list-no-shift">
              <p className="text-muted-foreground">
                {planQuery.isError ? "Couldn't load your shift plan." : "No upcoming shift to shop for."}
              </p>
              <Button asChild className="min-h-11 w-full">
                <Link href="/shift-planner">Open the Shift Planner</Link>
              </Button>
            </section>
          ) : (
            <ShiftListBody key={shift.key} shiftKey={shift.key} shiftStartLocal={shift.startLocal} />
          )}
        </div>
      </main>
      <SiteFooter variant="compact" className="mt-10" pbSafe />
    </div>
  );
}
