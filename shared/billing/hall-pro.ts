import type { HallProFeature } from "./types.js";

/** User-facing labels for Hall Pro — crew collaboration only. */
export const HALL_PRO_FEATURE_LABELS: Record<HallProFeature, string> = {
  shared_shopping_lists: "Shared Shopping List",
  hall_history: "Hall Meal History",
  advanced_hall_vote: "Advanced Hall Vote",
  hall_grocery_planning: "Hall grocery planning",
  canteen_payment_tracker: "Canteen Payment Tracker",
  canteen_manager_pro: "Canteen Manager Pro",
};

export const HALL_PRO_TAGLINE =
  "Crew collaboration for shift night — one subscription covers the whole hall.";

export const HALL_PRO_EXCLUDES = [
  "Meal planning",
  "Saved meals",
  "Profiles",
  "Personal protein deals",
] as const;
