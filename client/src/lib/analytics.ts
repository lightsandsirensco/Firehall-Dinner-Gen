/**
 * Unified analytics — GA4 + internal product events.
 */

import {
  flushProductAnalytics,
  getAnalyticsVisitorId,
  resolveTrafficSource,
  inferPageName,
  trackProductEvent,
} from "@/lib/product-analytics";

let mealsGeneratedThisSession = 0;

/** GA4 custom event (traffic + product events mirrored in GA4). */
export function trackEvent(name: string, params?: Record<string, string | number>) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", name, params);
  }
}

export function trackMealGenerationStarted(): void {
  trackEvent("meal_generation_started");
  trackProductEvent("meal_generation_started");
}

export function trackAnalyticsPageViewInternal(path: string, title?: string): void {
  trackProductEvent(
    "page_view",
    {
      page_name: inferPageName(path),
      page_title: title ?? (typeof document !== "undefined" ? document.title : ""),
      traffic_source: resolveTrafficSource(),
    },
    path,
  );
}

export function trackRecipeView(input: {
  slug: string;
  title: string;
  collection?: string;
  source?: string;
}): void {
  const params = {
    recipe_slug: input.slug,
    recipe_title: input.title,
    collection: input.collection ?? "catalog",
    source: input.source ?? "direct",
  };
  trackEvent("recipe_view", params);
  trackProductEvent("recipe_view", params);
}

export interface MealGeneratedMetadata {
  recipe_title: string;
  protein?: string;
  crew_size?: number;
  time_available?: number;
  meal_category?: string;
  meal_format?: string;
  cache_hit?: boolean;
}

export function trackMealGenerated(meta?: MealGeneratedMetadata) {
  mealsGeneratedThisSession++;
  const params: Record<string, string | number> = {
    meals_generated_this_session: mealsGeneratedThisSession,
    ...(meta?.recipe_title ? { recipe_title: meta.recipe_title } : {}),
    ...(meta?.protein ? { protein: meta.protein } : {}),
    ...(meta?.crew_size != null ? { crew_size: meta.crew_size } : {}),
    ...(meta?.time_available != null ? { time_available: meta.time_available } : {}),
    ...(meta?.meal_category ? { meal_category: meta.meal_category } : {}),
    ...(meta?.meal_format ? { meal_format: meta.meal_format } : {}),
    ...(meta?.cache_hit != null ? { cache_hit: meta.cache_hit ? 1 : 0 } : {}),
  };
  trackEvent("meal_generated", params);
  trackProductEvent("meal_generated", params);
}

export function trackMealGenerationFailed(reason: string): void {
  trackProductEvent("meal_generation_failed", { reason: reason.slice(0, 120) });
}

export function trackWheelSpin(input: { slug: string; title: string; segment_index?: number }): void {
  const params = {
    recipe_slug: input.slug,
    recipe_title: input.title,
    segment_index: input.segment_index ?? -1,
  };
  trackEvent("wheel_spin", params);
  trackProductEvent("wheel_spin", params);
}

export function trackWheelRecipeOpen(input: {
  slug: string;
  title: string;
  action: "cook" | "explore" | "spin_again" | "share";
}): void {
  const params = {
    recipe_slug: input.slug,
    recipe_title: input.title,
    action: input.action,
  };
  trackEvent("wheel_recipe_open", params);
  trackProductEvent("wheel_recipe_open", params);
}

export function trackExploreFilter(input: {
  filter_key: string;
  filter_label: string;
  category?: string;
}): void {
  trackProductEvent("explore_filter", {
    filter_key: input.filter_key,
    filter_label: input.filter_label,
    ...(input.category ? { category: input.category } : {}),
  });
}

export function trackExploreRecipeClick(input: { slug: string; title: string }): void {
  trackProductEvent("explore_recipe_click", {
    recipe_slug: input.slug,
    recipe_title: input.title,
  });
}

export function trackSearch(term: string, resultCount?: number): void {
  trackProductEvent("search", {
    search_term: term.slice(0, 120),
    ...(resultCount != null ? { result_count: resultCount } : {}),
  });
}

export function trackRecipeSave(slug: string, title: string): void {
  trackEvent("recipe_save", { recipe_slug: slug, recipe_title: title });
  trackProductEvent("recipe_save", { recipe_slug: slug, recipe_title: title });
}

export function trackRecipeShare(slug: string, title: string, source?: string): void {
  trackEvent("recipe_share", { recipe_slug: slug, recipe_title: title, source: source ?? "unknown" });
  trackProductEvent("recipe_share", { recipe_slug: slug, recipe_title: title, source: source ?? "unknown" });
}

export function trackRecipePrint(slug: string, title: string): void {
  trackEvent("recipe_print", { recipe_slug: slug, recipe_title: title });
  trackProductEvent("recipe_print", { recipe_slug: slug, recipe_title: title });
}

export function trackEmailModalOpened() {
  trackEvent("email_modal_opened");
}

export function trackEmailSubmitted(recipeTitle: string, source = "generator") {
  trackEvent("email_submitted", { recipe_title: recipeTitle });
  trackProductEvent("email_capture", {
    recipe_title: recipeTitle,
    source,
    capture_type: "email_recipe",
  });
}

export async function setAnalyticsUserId(email: string) {
  if (typeof window === "undefined" || !window.gtag) return;
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(email.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    window.gtag("set", { user_id: hashHex });
  } catch {}
}

export function trackRedLeadPageView() {
  trackEvent("red_lead_page_view");
  trackProductEvent("page_view", { page_name: "red_lead", traffic_source: resolveTrafficSource() });
}

export function trackRedLeadCaptureSubmit() {
  trackEvent("red_lead_capture_submit");
  trackProductEvent("email_capture", { source: "red_lead", capture_type: "red_lead_pdf" });
}

export function trackRedLeadPdfDownload() {
  trackEvent("red_lead_pdf_download");
  trackProductEvent("email_capture", {
    source: "red_lead",
    capture_type: "red_lead_pdf_download",
  });
}

export function trackHomepageCaptureView() {
  trackEvent("homepage_capture_view");
}

export function trackHomepageCaptureSubmit() {
  trackEvent("homepage_capture_submit");
  trackProductEvent("email_capture", { source: "homepage", capture_type: "homepage_subscribe" });
}

export function trackRecipeUpvote(recipeSlug: string) {
  trackEvent("recipe_upvote", { recipe_slug: recipeSlug });
}

export function trackRecipeDownvote(recipeSlug: string) {
  trackEvent("recipe_downvote", { recipe_slug: recipeSlug });
}

export { flushProductAnalytics, getAnalyticsVisitorId };
