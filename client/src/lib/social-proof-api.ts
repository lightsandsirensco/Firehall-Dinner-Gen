import type { SocialProofPayload } from "@shared/social-proof/types";

export const socialProofQueryKey = ["social-proof"] as const;

export async function fetchSocialProof(): Promise<SocialProofPayload> {
  const res = await fetch("/api/social-proof", { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Social proof fetch ${res.status}`);
  return res.json();
}
