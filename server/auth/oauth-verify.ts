import { createPublicKey, createVerify } from "crypto";

export interface OAuthIdentity {
  subject: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export async function verifyGoogleIdToken(idToken: string): Promise<OAuthIdentity> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("Google Sign In is not configured");
  }

  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!res.ok) {
    throw new Error("Invalid Google token");
  }

  const payload = (await res.json()) as {
    sub?: string;
    email?: string;
    aud?: string;
    given_name?: string;
    family_name?: string;
  };

  if (!payload.sub) throw new Error("Invalid Google token");
  if (payload.aud !== clientId) throw new Error("Google token audience mismatch");

  return {
    subject: payload.sub,
    email: payload.email ?? null,
    firstName: payload.given_name ?? null,
    lastName: payload.family_name ?? null,
  };
}

interface AppleJwk {
  kty: string;
  kid: string;
  use?: string;
  alg?: string;
  n: string;
  e: string;
}

async function verifyAppleSignature(idToken: string, jwk: AppleJwk): Promise<boolean> {
  const parts = idToken.split(".");
  if (parts.length !== 3) return false;

  const key = createPublicKey({ key: jwk as unknown as import("crypto").JsonWebKey, format: "jwk" });
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${parts[0]}.${parts[1]}`);
  verifier.end();
  return verifier.verify(key, parts[2], "base64url");
}

export async function verifyAppleIdToken(idToken: string): Promise<OAuthIdentity> {
  const clientId = process.env.APPLE_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("Apple Sign In is not configured");
  }

  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Invalid Apple token");

  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as { kid?: string; alg?: string };
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
    sub?: string;
    email?: string;
    iss?: string;
    aud?: string | string[];
    exp?: number;
  };

  if (payload.iss !== "https://appleid.apple.com") throw new Error("Invalid Apple issuer");
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(clientId)) throw new Error("Apple token audience mismatch");
  if (!payload.sub) throw new Error("Invalid Apple token");
  if (!payload.exp || payload.exp * 1000 < Date.now()) throw new Error("Apple token expired");

  const keysRes = await fetch("https://appleid.apple.com/auth/keys");
  if (!keysRes.ok) throw new Error("Failed to load Apple keys");
  const { keys } = (await keysRes.json()) as { keys: AppleJwk[] };
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("Apple signing key not found");

  const valid = await verifyAppleSignature(idToken, jwk);
  if (!valid) throw new Error("Invalid Apple token signature");

  return {
    subject: payload.sub,
    email: payload.email ?? null,
  };
}
