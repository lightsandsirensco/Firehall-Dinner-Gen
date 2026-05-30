let mealsGeneratedThisSession = 0;

export function trackEvent(name: string, params?: Record<string, string | number>) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", name, params);
  }
}

export function trackMealGenerated() {
  mealsGeneratedThisSession++;
  trackEvent("recipe_generated", {
    meals_generated_this_session: mealsGeneratedThisSession,
  });
}

export function trackEmailModalOpened() {
  trackEvent("email_modal_opened");
}

export function trackEmailSubmitted(recipeTitle: string) {
  trackEvent("email_submitted", { recipe_title: recipeTitle });
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
}

export function trackRedLeadCaptureSubmit() {
  trackEvent("red_lead_capture_submit");
}

export function trackRedLeadPdfDownload() {
  trackEvent("red_lead_pdf_download");
}

export function trackHomepageCaptureView() {
  trackEvent("homepage_capture_view");
}

export function trackHomepageCaptureSubmit() {
  trackEvent("homepage_capture_submit");
}

export function trackRecipeUpvote(recipeSlug: string) {
  trackEvent("recipe_upvote", { recipe_slug: recipeSlug });
}

export function trackRecipeDownvote(recipeSlug: string) {
  trackEvent("recipe_downvote", { recipe_slug: recipeSlug });
}
