export const SUPPORT_EMAIL = "support@firehallmeals.com";

export function supportMailto(subject: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
