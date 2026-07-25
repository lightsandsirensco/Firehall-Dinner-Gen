/** Hall Event Engine — append-only facts + sync reactions (Board / Logbook). */

export type HallEventActorKind = "member" | "system" | "automation" | "integration";

export interface HallEventInput {
  hall_id: string;
  event_type: string;
  actor_kind?: HallEventActorKind;
  actor_user_id?: string | null;
  correlation_id?: string | null;
  causation_id?: string | null;
  aggregate_type?: string | null;
  aggregate_id?: string | null;
  payload?: Record<string, unknown>;
  visibility?: "hall" | "role_restricted";
  idempotency_key?: string | null;
  occurred_at?: string;
  version?: number;
}

export interface HallEventRecord extends HallEventInput {
  event_id: string;
  version: number;
  occurred_at: string;
  recorded_at: string;
  actor_kind: HallEventActorKind;
  payload: Record<string, unknown>;
  visibility: "hall" | "role_restricted";
}

export const HallEventTypes = {
  INVENTORY_MARKED_LOW: "inventory.item_marked_low",
  INVENTORY_EMPTIED: "inventory.item_emptied",
  INVENTORY_RESTOCKED: "inventory.item_restocked",
  INVENTORY_RECEIVE: "inventory.receive_recorded",
  PAYMENT_RECEIVED: "payment.received",
  PAYMENT_OVERDUE: "payment.overdue",
  SHOPPING_RUN_COMPLETED: "shopping.run_completed",
  MEAL_LOCKED: "meal.locked",
  MEAL_HELD: "meal.held",
  MEAL_FED: "meal.completed",
  VOTE_OPENED: "vote.opened",
  VOTE_CLOSED: "vote.closed",
  BOARD_NOTE_POSTED: "notice.posted",
  BOARD_NOTE_FIXED: "notice.archived",
  LOGBOOK_ENTRY: "logbook.entry_created",
} as const;
