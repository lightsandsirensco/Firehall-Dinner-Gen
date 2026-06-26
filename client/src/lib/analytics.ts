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

export function trackMealGenerationStarted(meta?: { meal_category?: string }): void {
  const params = {
    ...(meta?.meal_category ? { meal_category: meta.meal_category } : {}),
  };
  trackEvent("meal_generation_started", params);
  trackProductEvent("meal_generation_started", params);
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
  recipe_slug?: string;
  protein?: string;
  crew_size?: number;
  time_available?: number;
  meal_category?: string;
  matched_category?: string;
  category_broadened?: boolean;
  meal_format?: string;
  cache_hit?: boolean;
}

export function trackMealGenerated(meta?: MealGeneratedMetadata) {
  mealsGeneratedThisSession++;
  const params: Record<string, string | number> = {
    meals_generated_this_session: mealsGeneratedThisSession,
    ...(meta?.recipe_title ? { recipe_title: meta.recipe_title } : {}),
    ...(meta?.recipe_slug ? { recipe_slug: meta.recipe_slug } : {}),
    ...(meta?.protein ? { protein: meta.protein } : {}),
    ...(meta?.crew_size != null ? { crew_size: meta.crew_size } : {}),
    ...(meta?.time_available != null ? { time_available: meta.time_available } : {}),
    ...(meta?.meal_category ? { meal_category: meta.meal_category } : {}),
    ...(meta?.matched_category ? { matched_category: meta.matched_category } : {}),
    ...(meta?.category_broadened != null
      ? { category_broadened: meta.category_broadened ? 1 : 0 }
      : {}),
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

export function trackSearch(term: string, resultCount?: number, source?: string): void {
  trackProductEvent("search", {
    search_term: term.slice(0, 120),
    ...(resultCount != null ? { result_count: resultCount } : {}),
    ...(source ? { source } : {}),
  });
}

export function trackHallVoteStarted(input: {
  voteId: string;
  optionCount: number;
  source?: string;
}): void {
  const params = {
    vote_id: input.voteId,
    option_count: input.optionCount,
    ...(input.source ? { source: input.source } : {}),
  };
  trackEvent("hall_vote_started", params);
  trackProductEvent("hall_vote_started", params);
}

export function trackHallVoteShared(input: {
  voteId: string;
  action: "copy" | "native" | "qr";
}): void {
  const params = {
    vote_id: input.voteId,
    action: input.action,
  };
  trackEvent("hall_vote_shared", params);
  trackProductEvent("hall_vote_shared", params);
}

export function trackHallVoteSubmitted(input: {
  voteId: string;
  optionId: number;
  optionName: string;
}): void {
  const params = {
    vote_id: input.voteId,
    option_id: input.optionId,
    option_name: input.optionName.slice(0, 120),
  };
  trackEvent("hall_vote_submitted", params);
  trackProductEvent("hall_vote_submitted", params);
}

export function trackHallHistoryViewed(input?: { entry_count?: number }): void {
  const params = {
    ...(input?.entry_count != null ? { entry_count: input.entry_count } : {}),
  };
  trackEvent("hall_history_viewed", params);
  trackProductEvent("hall_history_viewed", params);
}

export function trackHallMealRepeated(input: {
  recipe_slug?: string;
  recipe_title: string;
  source: string;
}): void {
  const params = {
    recipe_title: input.recipe_title.slice(0, 120),
    source: input.source,
    ...(input.recipe_slug ? { recipe_slug: input.recipe_slug } : {}),
  };
  trackEvent("hall_meal_repeated", params);
  trackProductEvent("hall_meal_repeated", params);
}

export function trackMealCooked(input: {
  recipe_slug?: string;
  recipe_title: string;
  source: string;
  crew_size?: number;
}): void {
  const params = {
    recipe_title: input.recipe_title.slice(0, 120),
    source: input.source.slice(0, 64),
    ...(input.recipe_slug ? { recipe_slug: input.recipe_slug } : {}),
    ...(input.crew_size != null ? { crew_size: input.crew_size } : {}),
  };
  trackEvent("meal_cooked", params);
  trackProductEvent("meal_cooked", params);
}

export function trackHallRecentMealClicked(input: {
  recipe_slug?: string;
  recipe_title: string;
  days_since_cooked?: number;
  source: string;
}): void {
  const params = {
    recipe_title: input.recipe_title.slice(0, 120),
    source: input.source,
    ...(input.recipe_slug ? { recipe_slug: input.recipe_slug } : {}),
    ...(input.days_since_cooked != null ? { days_since_cooked: input.days_since_cooked } : {}),
  };
  trackEvent("hall_recent_meal_clicked", params);
  trackProductEvent("hall_recent_meal_clicked", params);
}

export function trackHallFavoriteAdded(input: {
  recipe_slug: string;
  recipe_title: string;
  source?: string;
  favorite_count?: number;
}): void {
  const params = {
    recipe_slug: input.recipe_slug,
    recipe_title: input.recipe_title.slice(0, 120),
    ...(input.source ? { source: input.source } : {}),
    ...(input.favorite_count != null ? { favorite_count: input.favorite_count } : {}),
  };
  trackEvent("hall_favorite_added", params);
  trackProductEvent("hall_favorite_added", params);
}

export function trackHallFavoriteRemoved(input: {
  recipe_slug: string;
  recipe_title: string;
  source?: string;
  favorite_count?: number;
}): void {
  const params = {
    recipe_slug: input.recipe_slug,
    recipe_title: input.recipe_title.slice(0, 120),
    ...(input.source ? { source: input.source } : {}),
    ...(input.favorite_count != null ? { favorite_count: input.favorite_count } : {}),
  };
  trackEvent("hall_favorite_removed", params);
  trackProductEvent("hall_favorite_removed", params);
}

export function trackHallFavoritesViewed(input?: { favorite_count?: number }): void {
  const params = {
    ...(input?.favorite_count != null ? { favorite_count: input.favorite_count } : {}),
  };
  trackEvent("hall_favorites_viewed", params);
  trackProductEvent("hall_favorites_viewed", params);
}

export function trackHallDashboardViewed(input?: {
  version?: number;
  entry_count?: number;
  favorite_count?: number;
  hall_name_set?: boolean;
  meals_cooked?: number;
  votes_created?: number;
  wheel_spins?: number;
  member_count?: number;
}): void {
  const params = {
    ...(input?.version != null ? { version: input.version } : {}),
    ...(input?.entry_count != null ? { entry_count: input.entry_count } : {}),
    ...(input?.favorite_count != null ? { favorite_count: input.favorite_count } : {}),
    ...(input?.hall_name_set != null ? { hall_name_set: input.hall_name_set ? 1 : 0 } : {}),
    ...(input?.meals_cooked != null ? { meals_cooked: input.meals_cooked } : {}),
    ...(input?.votes_created != null ? { votes_created: input.votes_created } : {}),
    ...(input?.wheel_spins != null ? { wheel_spins: input.wheel_spins } : {}),
    ...(input?.member_count != null ? { member_count: input.member_count } : {}),
  };
  trackEvent("hall_dashboard_viewed", params);
  trackProductEvent("hall_dashboard_viewed", params);
}

export function trackShiftDashboardViewed(input?: {
  hall_id?: string;
  shift_id?: string;
  shift_name?: string;
  member_count?: number;
  meals_this_month?: number;
  votes_this_month?: number;
  longest_meal_streak?: number;
}): void {
  const params = {
    ...(input?.hall_id ? { hall_id: input.hall_id } : {}),
    ...(input?.shift_id ? { shift_id: input.shift_id } : {}),
    ...(input?.shift_name ? { shift_name: input.shift_name } : {}),
    ...(input?.member_count != null ? { member_count: input.member_count } : {}),
    ...(input?.meals_this_month != null ? { meals_this_month: input.meals_this_month } : {}),
    ...(input?.votes_this_month != null ? { votes_this_month: input.votes_this_month } : {}),
    ...(input?.longest_meal_streak != null ? { longest_meal_streak: input.longest_meal_streak } : {}),
  };
  trackEvent("shift_dashboard_viewed", params);
  trackProductEvent("shift_dashboard_viewed", params);
}

export function trackShiftMealSelected(input: {
  hall_id: string;
  shift_id: string;
  recipe_slug?: string;
  recipe_title: string;
  source?: string;
}): void {
  const params = {
    hall_id: input.hall_id,
    shift_id: input.shift_id,
    recipe_title: input.recipe_title,
    ...(input.recipe_slug ? { recipe_slug: input.recipe_slug } : {}),
    ...(input.source ? { source: input.source } : {}),
  };
  trackEvent("shift_meal_selected", params);
  trackProductEvent("shift_meal_selected", params);
}

export function trackShiftVoteCreated(input: {
  hall_id: string;
  shift_id: string;
  vote_id: string;
  option_count: number;
}): void {
  const params = {
    hall_id: input.hall_id,
    shift_id: input.shift_id,
    vote_id: input.vote_id,
    option_count: input.option_count,
  };
  trackEvent("shift_vote_created", params);
  trackProductEvent("shift_vote_created", params);
}

export function trackWheelStreakUpdated(input: {
  total_spins: number;
  current_streak: number;
  longest_streak: number;
  weekly_spins: number;
  wednesday_streak: number;
  is_new_shift_day?: number;
  streak_broken?: number;
}): void {
  const params = {
    total_spins: input.total_spins,
    current_streak: input.current_streak,
    longest_streak: input.longest_streak,
    weekly_spins: input.weekly_spins,
    wednesday_streak: input.wednesday_streak,
    ...(input.is_new_shift_day != null ? { is_new_shift_day: input.is_new_shift_day } : {}),
    ...(input.streak_broken != null ? { streak_broken: input.streak_broken } : {}),
  };
  trackEvent("wheel_streak_updated", params);
  trackProductEvent("wheel_streak_updated", params);
}

export function trackWheelStreakBroken(input: {
  previous_streak: number;
  days_since_last_spin: number;
}): void {
  const params = {
    previous_streak: input.previous_streak,
    days_since_last_spin: input.days_since_last_spin,
  };
  trackEvent("wheel_streak_broken", params);
  trackProductEvent("wheel_streak_broken", params);
}

export function trackHallOfFameViewed(input?: {
  period?: string;
  cooked_count?: number;
  voted_count?: number;
  wheel_count?: number;
}): void {
  const params = {
    ...(input?.period ? { period: input.period } : {}),
    ...(input?.cooked_count != null ? { cooked_count: input.cooked_count } : {}),
    ...(input?.voted_count != null ? { voted_count: input.voted_count } : {}),
    ...(input?.wheel_count != null ? { wheel_count: input.wheel_count } : {}),
  };
  trackEvent("hall_of_fame_viewed", params);
  trackProductEvent("hall_of_fame_viewed", params);
}

export function trackPwaPromptShown(input?: { visit_count?: number }): void {
  const params = {
    ...(input?.visit_count != null ? { visit_count: input.visit_count } : {}),
  };
  trackEvent("pwa_prompt_shown", params);
  trackProductEvent("pwa_prompt_shown", params);
}

export function trackPwaInstalled(input?: { method?: string }): void {
  const params = {
    ...(input?.method ? { method: input.method.slice(0, 32) } : {}),
  };
  trackEvent("pwa_installed", params);
  trackProductEvent("pwa_installed", params);
}

/** @deprecated Use trackHallVoteStarted */
export function trackHallVoteCreate(input: { voteId: string; optionCount: number }): void {
  trackHallVoteStarted(input);
}

/** @deprecated Use trackHallVoteShared */
export function trackHallVoteShare(input: { voteId: string; action: "copy" | "qr" }): void {
  trackHallVoteShared({ voteId: input.voteId, action: input.action });
}

/** @deprecated Use trackHallVoteSubmitted */
export function trackHallVoteCast(input: {
  voteId: string;
  optionId: number;
  optionName: string;
}): void {
  trackHallVoteSubmitted(input);
}

export function trackShoppingListOpen(input: { recipeTitle: string; generatorType: string }): void {
  trackProductEvent("shopping_list_open", {
    recipe_title: input.recipeTitle.slice(0, 120),
    generator_type: input.generatorType,
  });
}

export function trackShoppingListAction(input: {
  recipeTitle: string;
  generatorType: string;
  action: "copy" | "print" | "email";
  status?: "success" | "error";
}): void {
  trackProductEvent("shopping_list_action", {
    recipe_title: input.recipeTitle.slice(0, 120),
    generator_type: input.generatorType,
    action: input.action,
    ...(input.status ? { status: input.status } : {}),
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

export function trackAccountCreated(provider: string): void {
  trackEvent("account_created", { provider });
  trackProductEvent("account_created", { provider });
}

export function trackLogin(provider: string): void {
  trackEvent("login", { provider });
  trackProductEvent("login", { provider });
}

export function trackMagicLinkRequested(returnTo?: string): void {
  const params = returnTo ? { return_to: returnTo } : undefined;
  trackEvent("magic_link_requested", params);
  trackProductEvent("magic_link_requested", params);
}

export function trackProfileUpdated(): void {
  trackEvent("profile_updated");
  trackProductEvent("profile_updated");
}

export function trackHallCreated(hallId: string): void {
  trackEvent("hall_created", { hall_id: hallId });
  trackProductEvent("hall_created", { hall_id: hallId });
}

export function trackHallUpdated(hallId: string, fields?: string): void {
  const params = { hall_id: hallId, ...(fields ? { fields } : {}) };
  trackEvent("hall_updated", params);
  trackProductEvent("hall_updated", params);
}

export function trackShiftCreated(hallId: string, shiftId: string, shiftKey: string): void {
  const params = { hall_id: hallId, shift_id: shiftId, shift_key: shiftKey };
  trackEvent("shift_created", params);
  trackProductEvent("shift_created", params);
}

export function trackHallJoined(hallId: string, via: string): void {
  trackEvent("hall_joined", { hall_id: hallId, via });
  trackProductEvent("hall_joined", { hall_id: hallId, via });
}

export function trackHallInviteSent(hallId: string, method: string): void {
  trackEvent("hall_invite_sent", { hall_id: hallId, method });
  trackProductEvent("hall_invite_sent", { hall_id: hallId, method });
}

export function trackHallInviteAccepted(hallId: string): void {
  trackEvent("hall_invite_accepted", { hall_id: hallId });
  trackProductEvent("hall_invite_accepted", { hall_id: hallId });
}

export function trackHallActivationStarted(hallId?: string): void {
  if (hallId) {
    trackEvent("hall_activation_started", { hall_id: hallId });
    trackProductEvent("hall_activation_started", { hall_id: hallId });
  } else {
    trackEvent("hall_activation_started");
    trackProductEvent("hall_activation_started");
  }
}

export function trackHallOnboardingStarted(): void {
  trackEvent("hall_onboarding_started", { surface: "post_sign_in" });
  trackProductEvent("hall_onboarding_started", { surface: "post_sign_in" });
}

export function trackPersonalOnboardingStarted(): void {
  trackEvent("personal_onboarding_started", { surface: "post_sign_in" });
  trackProductEvent("personal_onboarding_started", { surface: "post_sign_in" });
}

export function trackPersonalOnboardingStepCompleted(step: string): void {
  trackEvent("personal_onboarding_step_completed", { step });
  trackProductEvent("personal_onboarding_step_completed", { step });
}

export function trackPersonalOnboardingCompleted(mode: "personal" | "hall"): void {
  trackEvent("personal_onboarding_completed", { mode });
  trackProductEvent("personal_onboarding_completed", { mode });
}

export function trackPersonalOnboardingHallChoice(worksAtFirehall: boolean): void {
  trackEvent("personal_onboarding_hall_choice", { works_at_firehall: worksAtFirehall ? 1 : 0 });
  trackProductEvent("personal_onboarding_hall_choice", { works_at_firehall: worksAtFirehall ? 1 : 0 });
}

export function trackHallActivationCompleted(hallId: string): void {
  trackEvent("hall_activation_completed", { hall_id: hallId });
  trackProductEvent("hall_activation_completed", { hall_id: hallId });
}

export function trackHallFirstInviteSent(hallId: string, method: string): void {
  trackEvent("hall_first_invite_sent", { hall_id: hallId, method });
  trackProductEvent("hall_first_invite_sent", { hall_id: hallId, method });
}

export function trackHallFirstVoteCreated(hallId: string, voteId: string): void {
  trackEvent("hall_first_vote_created", { hall_id: hallId, vote_id: voteId });
  trackProductEvent("hall_first_vote_created", { hall_id: hallId, vote_id: voteId });
}

export function trackSharedShoppingListCreated(hallId: string, listId: string): void {
  trackEvent("shared_shopping_list_created", { hall_id: hallId, list_id: listId });
  trackProductEvent("shared_shopping_list_created", { hall_id: hallId, list_id: listId });
}

export function trackSharedShoppingListUpdated(
  hallId: string,
  listId: string,
  action: string,
): void {
  const params = { hall_id: hallId, list_id: listId, action };
  trackEvent("shared_shopping_list_updated", params);
  trackProductEvent("shared_shopping_list_updated", params);
}

export function trackSharedShoppingListExported(
  hallId: string,
  listId: string,
  format: "pdf" | "text",
): void {
  const params = { hall_id: hallId, list_id: listId, format };
  trackEvent("shared_shopping_list_exported", params);
  trackProductEvent("shared_shopping_list_exported", params);
}

export function trackSharedShoppingListCompleted(hallId: string, listId: string): void {
  trackEvent("shared_shopping_list_completed", { hall_id: hallId, list_id: listId });
  trackProductEvent("shared_shopping_list_completed", { hall_id: hallId, list_id: listId });
}

export function trackHallSupplyViewed(hallId: string, shortageCount?: number): void {
  const params = {
    hall_id: hallId,
    ...(shortageCount != null ? { shortage_count: shortageCount } : {}),
  };
  trackEvent("hall_supply_viewed", params);
  trackProductEvent("hall_supply_viewed", params);
}

export function trackHallSupplyUpdated(
  hallId: string,
  supplyId: string,
  status: string,
): void {
  const params = { hall_id: hallId, supply_id: supplyId, status };
  trackEvent("hall_supply_updated", params);
  trackProductEvent("hall_supply_updated", params);
}

export function trackHallSupplyRestocked(hallId: string, supplyId: string): void {
  const params = { hall_id: hallId, supply_id: supplyId };
  trackEvent("hall_supply_restocked", params);
  trackProductEvent("hall_supply_restocked", params);
}

type CanteenTrackMeta = {
  hall_id: string;
  shift_id?: string;
  user_id?: string;
  item_name?: string;
  status?: string;
};

export function trackCanteenViewed(meta: CanteenTrackMeta): void {
  trackEvent("canteen_viewed", meta);
  trackProductEvent("canteen_viewed", meta);
}

export function trackCanteenItemReported(meta: CanteenTrackMeta): void {
  trackEvent("canteen_item_reported", meta);
  trackProductEvent("canteen_item_reported", meta);
}

export function trackCanteenItemLow(meta: CanteenTrackMeta): void {
  trackEvent("canteen_item_low", meta);
  trackProductEvent("canteen_item_low", meta);
}

export function trackCanteenItemOut(meta: CanteenTrackMeta): void {
  trackEvent("canteen_item_out", meta);
  trackProductEvent("canteen_item_out", meta);
}

export function trackCanteenItemRequested(meta: CanteenTrackMeta): void {
  trackEvent("canteen_item_requested", meta);
  trackProductEvent("canteen_item_requested", meta);
}

export function trackCanteenItemPurchased(meta: CanteenTrackMeta): void {
  trackEvent("canteen_item_purchased", meta);
  trackProductEvent("canteen_item_purchased", meta);
}

export function trackCanteenItemRestocked(meta: CanteenTrackMeta): void {
  trackEvent("canteen_item_restocked", meta);
  trackProductEvent("canteen_item_restocked", meta);
}

export function trackCanteenManagerAssigned(meta: CanteenTrackMeta): void {
  trackEvent("canteen_manager_assigned", meta);
  trackProductEvent("canteen_manager_assigned", meta);
}

export function trackShiftReminderSent(userId: string, sendId: string, shiftDate: string): void {
  const params = { user_id: userId, send_id: sendId, shift_date: shiftDate };
  trackEvent("shift_reminder_sent", params);
  trackProductEvent("shift_reminder_sent", params);
}

export function trackShiftReminderOpened(sendId: string, action?: string): void {
  const params = {
    send_id: sendId,
    ...(action ? { action } : {}),
  };
  trackEvent("shift_reminder_opened", params);
  trackProductEvent("shift_reminder_opened", params);
}

export function trackShiftReminderClicked(sendId: string, action: string): void {
  const params = { send_id: sendId, action };
  trackEvent("shift_reminder_clicked", params);
  trackProductEvent("shift_reminder_clicked", params);
}

export function trackHallAnalyticsViewed(hallId: string): void {
  const params = { hall_id: hallId };
  trackEvent("hall_analytics_viewed", params);
  trackProductEvent("hall_analytics_viewed", params);
}

export function trackGrowthDashboardViewed(): void {
  trackEvent("growth_dashboard_viewed", { surface: "admin" });
  trackProductEvent("growth_dashboard_viewed", { surface: "admin" });
}

export function trackPlanViewed(): void {
  trackEvent("plan_viewed");
  trackProductEvent("plan_viewed");
}

export function trackPlanSelected(planId: string): void {
  trackEvent("plan_selected", { plan_id: planId });
  trackProductEvent("plan_selected", { plan_id: planId });
}

export function trackPaywallViewed(feature?: string, surface?: string): void {
  trackEvent("paywall_viewed", {
    ...(feature ? { feature } : {}),
    ...(surface ? { surface } : {}),
  });
  trackProductEvent("paywall_viewed", {
    ...(feature ? { feature } : {}),
    ...(surface ? { surface } : {}),
  });
}

export function trackHallProEnabled(hallId: string): void {
  trackEvent("hall_pro_enabled", { hall_id: hallId });
  trackProductEvent("hall_pro_enabled", { hall_id: hallId });
}

export function trackHallProTrialStarted(hallId: string): void {
  trackEvent("hall_pro_trial_started", { hall_id: hallId });
  trackProductEvent("hall_pro_trial_started", { hall_id: hallId });
}

export function trackHallProConverted(hallId: string): void {
  trackEvent("hall_pro_converted", { hall_id: hallId });
  trackProductEvent("hall_pro_converted", { hall_id: hallId });
}

export function trackHallProgramViewed(): void {
  trackEvent("hall_program_viewed", { surface: "hall_program" });
  trackProductEvent("hall_program_viewed", { surface: "hall_program" });
}

export function trackHallProgramStarted(action: "start_free" | "create_hall"): void {
  trackEvent("hall_program_started", { action, surface: "hall_program" });
  trackProductEvent("hall_program_started", { action, surface: "hall_program" });
}

export function trackSyncCompleted(metadata: {
  trigger: string;
  duration_ms: number;
  domains: string;
}): void {
  trackEvent("sync_completed", metadata);
  trackProductEvent("sync_completed", metadata);
}

export function trackSyncFailed(metadata: { trigger: string; reason: string }): void {
  trackEvent("sync_failed", metadata);
  trackProductEvent("sync_failed", metadata);
}

export { flushProductAnalytics, getAnalyticsVisitorId };
