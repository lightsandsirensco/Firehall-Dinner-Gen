let mealsGeneratedThisSession = 0;

export function trackEvent(name: string, params?: Record<string, string | number>) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", name, params);
  }
}

export function trackMealGenerated() {
  mealsGeneratedThisSession++;
  trackEvent("meal_generation_success", {
    meals_generated_this_session: mealsGeneratedThisSession,
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
