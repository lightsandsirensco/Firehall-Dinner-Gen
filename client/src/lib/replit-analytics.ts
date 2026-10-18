type EventData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track(name: string, data?: EventData): void | Promise<unknown> };
  }
}

// Explicit allowlist: never mirror account identifiers, emails, notes, or titles.
const eventProperties: Record<string, readonly string[]> = {
  meal_generation_started: ["meal_category"],
  meal_generated: ["recipe_slug", "crew_size", "time_available", "meal_category", "cache_hit"],
  recipe_view: ["recipe_slug", "collection"],
  recipe_save: ["recipe_slug"],
  recipe_share: ["recipe_slug"],
  recipe_print: ["recipe_slug"],
  wheel_spin: [],
  wheel_recipe_open: ["recipe_slug"],
  meal_cooked: ["recipe_slug"],
  plan_viewed: [],
  plan_selected: ["plan_id"],
};

/** Replit supplies the tracker on published websites; never install a second script. */
export function trackReplitEvent(name: string, data?: EventData): void {
  if (typeof window === "undefined") return;
  if (!Object.prototype.hasOwnProperty.call(eventProperties, name)) return;
  const properties: EventData = {};
  for (const key of eventProperties[name]) {
    const value = data?.[key];
    if (
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value)) ||
      (typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value))
    ) {
      properties[key] = value;
    }
  }
  try {
    const result = window.umami?.track(name, properties);
    if (result && typeof result.catch === "function") {
      void result.catch(() => {});
    }
  } catch {
    // Analytics failure must never interrupt the action being measured.
  }
}
