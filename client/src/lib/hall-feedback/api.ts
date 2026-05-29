import { fetchWithCsrf } from "@/lib/csrf-fetch";
import type { HallFeedbackPayload, HallFeedbackSubmitResponse } from "@shared/hall-feedback/types";

export async function submitHallFeedback(
  payload: HallFeedbackPayload,
): Promise<HallFeedbackSubmitResponse> {
  const res = await fetchWithCsrf("/api/hall-feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: payload.message,
      email: payload.email,
      channel: "general",
      source: payload.source ?? "unknown",
      page_path: payload.page_path,
    }),
  });

  const data = (await res.json().catch(() => null)) as HallFeedbackSubmitResponse | null;
  if (!res.ok) {
    throw new Error(data?.message || "Could not send feedback. Try again.");
  }
  return data ?? { ok: true, message: "Thanks for shaping the hall." };
}
