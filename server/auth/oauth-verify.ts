import { createPublicKey, createVerify } from "crypto";

export interface OAuthIdentity {
  subject: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

/**
 * Verifies a Google ID token via Google's tokeninfo endpoint. This endpoint
 * performs full signature verification against Google's own signing keys
 * server-side and is Google's own documented low-volume verification
 * approach (see developers.google.com/identity/sign-in/web/backend-auth) —
 * kept as-is rather than replaced with a JWKS/library-based approach, since
 * it already returns every claim needed to close the gaps below and a
 * client-provided token is never trusted without this round-trip.
 *
 * Hardening beyond the original implementation (GOOGLE SIGN-IN SAFETY):
 * - issuer (`iss`) must be Google's own issuer
 * - audience (`aud`) must be THIS app's client id (already existed)
 * - expiry (`exp`) must not have passed (defense in depth — tokeninfo
 *   already rejects expired tokens with a non-200 response, but a token's
 *   own claims are never trusted on faith)
 * - `email_verified` must be true before the email claim is trusted for
 *   anything (account matching, prefill, collision detection); an
 *   unverified email is treated as absent, never as identity
 * - a valid `sub` is required (already existed)
 */
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
    email_verified?: string | boolean;
    aud?: string;
    iss?: string;
    exp?: string | number;
    given_name?: string;
    family_name?: string;
  };

  // Subject is the permanent identity key — never proceed without one.
  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Invalid Google token: missing subject");
  }

  // Audience — must be issued specifically for THIS app's Google OAuth
  // client id; never trust a token minted for a different client.
  if (payload.aud !== clientId) {
    throw new Error("Google token audience mismatch");
  }

  // Issuer — Google issues tokens with either form depending on token type.
  if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") {
    throw new Error("Google token issuer mismatch");
  }

  // Expiry — belt-and-suspenders even though tokeninfo already enforces this.
  const exp = typeof payload.exp === "string" ? Number(payload.exp) : payload.exp;
  if (!exp || !Number.isFinite(exp) || exp * 1000 < Date.now()) {
    throw new Error("Google token expired");
  }

  // email_verified — Google can return an email Google itself has not
  // verified. An unverified email must never be used to match an existing
  // account, prefill account email, or feed collision detection — treated
  // as if no email were provided at all.
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  const email = emailVerified ? payload.email ?? null : null;

  return {
    subject: payload.sub,
    email,
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
