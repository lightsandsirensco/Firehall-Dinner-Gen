/**
 * Shift shopping list orchestration: plan → canonical shopping session →
 * persisted list. Every read and write first brings the list in line with
 * the current plan, so swaps, skips and crew changes show up on any device.
 */
import { applyPantryContext, createShoppingSession, type PantryContext, type ShoppingRecipeInput } from "../../shared/shopping/index.js";
import {
  applyShiftListOp,
  reconcileShiftShoppingSession,
  shiftShoppingRecipeId,
  shiftShoppingTargets,
  type ShiftShoppingTarget,
} from "../../shared/shift-plan/shopping.js";
import type { ShiftListOpInput, ShiftListOpenInput } from "../../shared/shift-plan/schema.js";
import type { ShiftPlanView, ShiftShoppingListResponse, ShiftShoppingListView } from "../../shared/shift-plan/types.js";
import type { ShiftInstance } from "../../shared/schedule/types.js";
import { ShiftPlanError, getShiftPlan, type ShiftPlanDeps } from "./service.js";
import { restorePantryContext, type ShiftListRecord, type ShiftListRepo } from "./shopping-store.js";

const MAX_MANUAL_ITEMS = 100;

export interface ShiftListDeps {
  plan: ShiftPlanDeps;
  lists: ShiftListRepo;
  /** Canonical recipe page ingredients for a slug, or null when it has no shopping data. */
  resolveShoppingRecipe(slug: string): ShoppingRecipeInput | null;
}

type PlanWithShift = ShiftPlanView & { shift: ShiftInstance };

async function loadCurrentPlan(deps: ShiftListDeps, userId: string): Promise<PlanWithShift | null> {
  const plan = await getShiftPlan(deps.plan, userId);
  return plan.shift ? (plan as PlanWithShift) : null;
}

async function requirePlan(deps: ShiftListDeps, userId: string, shiftKey: string): Promise<PlanWithShift> {
  const plan = await getShiftPlan(deps.plan, userId);
  if (!plan.hasSchedule) throw new ShiftPlanError(404, "Set up your schedule first");
  if (!plan.shift) throw new ShiftPlanError(404, "No upcoming shift");
  if (plan.shift.key !== shiftKey) {
    throw new ShiftPlanError(409, "Your next shift changed — reload to plan the new one");
  }
  return plan as PlanWithShift;
}

interface Synced {
  record: ShiftListRecord;
  changed: boolean;
  unavailable: string[];
}

/** Apply plan changes and (when given) a newer device pantry. Plan changes reset undo. */
function syncRecord(
  deps: ShiftListDeps,
  record: ShiftListRecord,
  targets: readonly ShiftShoppingTarget[],
  devicePantry: PantryContext | null,
): Synced {
  const pantryChanged = devicePantry != null && JSON.stringify(devicePantry) !== JSON.stringify(record.pantry);
  const pantry = (pantryChanged ? devicePantry : record.pantry) ?? undefined;
  const plan = reconcileShiftShoppingSession(record.session, targets, deps.resolveShoppingRecipe, pantry);
  let session = plan.session;
  if (pantryChanged && pantry) session = applyPantryContext(session, pantry);
  return {
    record: {
      shiftKey: record.shiftKey,
      session,
      undo: plan.changed ? [] : record.undo,
      pantry: pantryChanged ? devicePantry : record.pantry,
    },
    changed: plan.changed || pantryChanged,
    unavailable: plan.unavailable,
  };
}

function toView(record: ShiftListRecord, plan: PlanWithShift, unavailable: string[]): ShiftShoppingListView {
  const included = new Set(record.session.recipes.map((r) => r.slug));
  const slots = new Map(plan.slots.map((s) => [s.key, s]));
  const meals = shiftShoppingTargets(plan.slots)
    .filter((t) => included.has(shiftShoppingRecipeId(t)))
    .map((t) => {
      const slot = slots.get(t.slotKey)!;
      return {
        slotKey: t.slotKey,
        label: slot.label,
        dayIndex: slot.dayIndex,
        recipeTitle: slot.recipe!.title,
        crewSize: t.crewSize,
      };
    });
  return {
    shiftKey: record.shiftKey,
    list: record.session.list,
    meals,
    canUndo: record.undo.length > 0,
    unavailable,
    updatedAt: record.session.updatedAt,
  };
}

/** Build the list for the current shift, or bring the existing one up to date. */
export async function openShiftList(
  deps: ShiftListDeps,
  userId: string,
  input: ShiftListOpenInput,
): Promise<ShiftShoppingListResponse> {
  const plan = await requirePlan(deps, userId, input.shiftKey);
  const targets = shiftShoppingTargets(plan.slots);
  const devicePantry = restorePantryContext(input.pantry);

  return deps.lists.update(userId, (current) => {
    const existing = current?.shiftKey === plan.shift.key ? current : null;
    if (!existing && targets.length === 0) throw new ShiftPlanError(409, "Plan at least one meal first");
    const base: ShiftListRecord = existing ?? {
      shiftKey: plan.shift.key,
      session: createShoppingSession(),
      undo: [],
      pantry: null,
    };
    const synced = syncRecord(deps, base, targets, devicePantry);
    return {
      save: synced.changed || !existing ? synced.record : null,
      result: { list: toView(synced.record, plan, synced.unavailable), created: !existing },
    };
  });
}

/** The current shift's list (null if not built yet). Used for cross-device refresh. */
export async function getShiftList(deps: ShiftListDeps, userId: string): Promise<ShiftShoppingListResponse> {
  const plan = await loadCurrentPlan(deps, userId);
  if (!plan) return { list: null };
  const targets = shiftShoppingTargets(plan.slots);
  return deps.lists.update<ShiftShoppingListResponse>(userId, (current) => {
    if (!current || current.shiftKey !== plan.shift.key) return { save: null, result: { list: null } };
    const synced = syncRecord(deps, current, targets, null);
    return {
      save: synced.changed ? synced.record : null,
      result: { list: toView(synced.record, plan, synced.unavailable) },
    };
  });
}

export async function applyShiftListAction(
  deps: ShiftListDeps,
  userId: string,
  input: ShiftListOpInput,
): Promise<ShiftShoppingListResponse> {
  const plan = await requirePlan(deps, userId, input.shiftKey);
  const targets = shiftShoppingTargets(plan.slots);

  return deps.lists.update(userId, (current) => {
    if (!current || current.shiftKey !== plan.shift.key) {
      throw new ShiftPlanError(409, "Open the shift's shopping list first");
    }
    const synced = syncRecord(deps, current, targets, null);
    if (
      input.op.type === "add_manual" &&
      synced.record.session.list.items.filter((i) => i.isManual).length >= MAX_MANUAL_ITEMS
    ) {
      throw new ShiftPlanError(400, "That list is full");
    }
    const pantry = synced.record.pantry ?? undefined;
    const applied = applyShiftListOp(
      { session: synced.record.session, undo: synced.record.undo },
      input.op,
      pantry,
    );
    const record: ShiftListRecord = { ...synced.record, session: applied.session, undo: applied.undo };
    return {
      save: synced.changed || applied.changed ? record : null,
      result: { list: toView(record, plan, synced.unavailable) },
    };
  });
}
