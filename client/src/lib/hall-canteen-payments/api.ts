import { apiRequest } from "@/lib/queryClient";
import type { CanteenPaymentFrequency } from "@shared/hall-canteen-payments/types";
import type { CanteenPaymentsPayload } from "@shared/hall-canteen-payments/types";

export async function fetchCanteenPayments(hallId: string): Promise<CanteenPaymentsPayload> {
  const res = await fetch(`/api/halls/${encodeURIComponent(hallId)}/canteen-payments`, {
    credentials: "include",
  });
  if (res.status === 402) {
    const body = (await res.json().catch(() => ({}))) as { feature?: string };
    const err = new Error("Hall Pro required") as Error & { status?: number; feature?: string };
    err.status = 402;
    err.feature = body.feature;
    throw err;
  }
  if (!res.ok) throw new Error("Failed to load canteen payment tracker");
  return res.json() as Promise<CanteenPaymentsPayload>;
}

export async function enrollAllCanteenPayments(hallId: string): Promise<CanteenPaymentsPayload> {
  const res = await apiRequest(
    "POST",
    `/api/halls/${encodeURIComponent(hallId)}/canteen-payments/enroll-all`,
    {},
  );
  if (!res.ok) throw new Error("Failed to enroll members");
  return res.json() as Promise<CanteenPaymentsPayload>;
}

export async function updateCanteenPaymentFrequency(
  hallId: string,
  userId: string,
  frequency: CanteenPaymentFrequency,
): Promise<CanteenPaymentsPayload> {
  const res = await apiRequest(
    "PATCH",
    `/api/halls/${encodeURIComponent(hallId)}/canteen-payments/${encodeURIComponent(userId)}`,
    { frequency },
  );
  if (!res.ok) throw new Error("Failed to update payment frequency");
  return res.json() as Promise<CanteenPaymentsPayload>;
}

export async function markCanteenPaymentPaid(
  hallId: string,
  userId: string,
): Promise<CanteenPaymentsPayload> {
  const res = await apiRequest(
    "POST",
    `/api/halls/${encodeURIComponent(hallId)}/canteen-payments/${encodeURIComponent(userId)}/mark-paid`,
    {},
  );
  if (!res.ok) throw new Error("Failed to mark payment");
  return res.json() as Promise<CanteenPaymentsPayload>;
}
