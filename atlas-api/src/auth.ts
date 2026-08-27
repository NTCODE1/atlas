/**
 * Passkey (WebAuthn) auth for the Apex API.
 *
 * The PWA proves possession of a device passkey (Face ID / fingerprint /
 * screen-lock) to the Worker, which then issues a short-lived HMAC session
 * token. All read + AI routes require that token (see `requireSession`), so the
 * `ATLAS_API_KEY` baked into the public bundle is no longer sufficient on its
 * own — an attacker also needs a passkey enrolled on a trusted device.
 *
 * Enrollment is gated by a one-time `SETUP_CODE` secret (typed once per device);
 * it doubles as the recovery path. Multiple credentials are supported.
 *
 * The Relying Party ID / origin is derived from the request's `Origin` header,
 * validated against `ALLOWED_ORIGINS`. That way localhost dev and the deployed
 * Netlify origin both work with no extra config.
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import type { Env } from "./index.ts";

/** A stored passkey. Binary fields are base64url so the record is JSON-safe. */
interface StoredCredential {
  /** Credential ID (base64url) — the passkey's stable identifier. */
  id: string;
  /** COSE public key (base64url). */
  publicKey: string;
  /** Signature counter, updated on each successful assertion. */
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  /** Human label, e.g. "iPhone" — set at enrollment time. */
  label?: string;
}

const CREDS_KEY = "webauthn:credentials";
/** Pending challenges live this long (seconds) before they expire in KV. */
const CHALLENGE_TTL = 300;
/** Session token lifetime — 7 days, so a phone stays unlocked for a week. */
const SESSION_TTL = 7 * 24 * 60 * 60;
/** Stable WebAuthn user handle — this is a single-user app. */
const USER_ID: Uint8Array<ArrayBuffer> = new Uint8Array(
  new TextEncoder().encode("atlas-user"),
);

const enc = new TextEncoder();
const dec = new TextDecoder();

// ── base64url helpers ──────────────────────────────────────────────────────

function bytesToB64url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ── session tokens (HMAC-SHA256, "<payload>.<sig>") ────────────────────────

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signSession(secret: string): Promise<string> {
  const payload = bytesToB64url(
    enc.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_TTL })),
  );
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(payload));
  return `${payload}.${bytesToB64url(new Uint8Array(sig))}`;
}

async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const ok = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    b64urlToBytes(sig),
    enc.encode(payload),
  );
  if (!ok) return false;
  try {
    const { exp } = JSON.parse(dec.decode(b64urlToBytes(payload)));
    return typeof exp === "number" && exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

/**
 * True when the request carries a valid, unexpired session token. Missing
 * `SESSION_SECRET` (auth not configured) fails closed → callers keep their
 * existing `ATLAS_API_KEY` check as the only gate.
 */
export async function requireSession(request: Request, env: Env): Promise<boolean> {
  if (!env.SESSION_SECRET) return false;
  const m = (request.headers.get("Authorization") ?? "").match(/^Bearer (.+)$/);
  return m ? verifySessionToken(m[1], env.SESSION_SECRET) : false;
}

// ── credential store ───────────────────────────────────────────────────────

async function loadCreds(env: Env): Promise<StoredCredential[]> {
  const raw = await env.HEALTH_KV.get(CREDS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCreds(env: Env, creds: StoredCredential[]): Promise<void> {
  return env.HEALTH_KV.put(CREDS_KEY, JSON.stringify(creds));
}

// ── route handler ──────────────────────────────────────────────────────────

/**
 * Handle `POST /api/auth/*`. Returns a Response for those paths, or `null` when
 * the request isn't an auth route (so the caller falls through to its own
 * routing). `json` is the caller's CORS-aware JSON responder.
 */
export async function handleAuthRoutes(
  request: Request,
  env: Env,
  json: (raw: string, status: number) => Response,
): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith("/api/auth/")) return null;
  if (request.method !== "POST") {
    return json(JSON.stringify({ error: "method not allowed" }), 405);
  }
  if (!env.SESSION_SECRET) {
    return json(JSON.stringify({ error: "auth not configured" }), 503);
  }

  // Derive + validate the Relying Party from the request Origin.
  const origin = request.headers.get("Origin") ?? "";
  const allowed = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (!origin || !allowed.includes(origin)) {
    return json(JSON.stringify({ error: "origin not allowed" }), 403);
  }
  const rpID = new URL(origin).hostname;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json(JSON.stringify({ error: "invalid JSON body" }), 400);
  }

  // POST /api/auth/register/options — begin enrollment (guarded by SETUP_CODE).
  if (pathname === "/api/auth/register/options") {
    if (!env.SETUP_CODE || String(body.setupCode ?? "") !== env.SETUP_CODE) {
      return json(JSON.stringify({ error: "forbidden" }), 403);
    }
    const label = body.label ? String(body.label).slice(0, 40) : undefined;
    const creds = await loadCreds(env);
    const options = await generateRegistrationOptions({
      rpName: "Apex",
      rpID,
      userName: "apex",
      userID: USER_ID,
      attestationType: "none",
      excludeCredentials: creds.map((c) => ({ id: c.id, transports: c.transports })),
      authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
    });
    const challengeId = crypto.randomUUID();
    await env.HEALTH_KV.put(
      `webauthn:challenge:${challengeId}`,
      JSON.stringify({ challenge: options.challenge, label }),
      { expirationTtl: CHALLENGE_TTL },
    );
    return json(JSON.stringify({ options, challengeId }), 200);
  }

  // POST /api/auth/register/verify — finish enrollment, store the credential.
  if (pathname === "/api/auth/register/verify") {
    const challengeId = String(body.challengeId ?? "");
    const stored = await env.HEALTH_KV.get(`webauthn:challenge:${challengeId}`);
    if (!stored) return json(JSON.stringify({ error: "challenge expired" }), 400);
    await env.HEALTH_KV.delete(`webauthn:challenge:${challengeId}`);
    const { challenge, label } = JSON.parse(stored) as { challenge: string; label?: string };

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body.response as never,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: false,
      });
    } catch {
      return json(JSON.stringify({ error: "verification failed" }), 400);
    }
    if (!verification.verified || !verification.registrationInfo) {
      return json(JSON.stringify({ error: "not verified" }), 400);
    }

    const { credential } = verification.registrationInfo;
    const creds = await loadCreds(env);
    if (!creds.some((c) => c.id === credential.id)) {
      creds.push({
        id: credential.id,
        publicKey: bytesToB64url(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports,
        label,
      });
      await saveCreds(env, creds);
    }
    return json(JSON.stringify({ verified: true }), 200);
  }

  // POST /api/auth/login/options — begin an unlock (possession is the proof).
  if (pathname === "/api/auth/login/options") {
    const creds = await loadCreds(env);
    if (creds.length === 0) {
      return json(JSON.stringify({ error: "no credentials enrolled" }), 400);
    }
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: creds.map((c) => ({ id: c.id, transports: c.transports })),
      userVerification: "preferred",
    });
    const challengeId = crypto.randomUUID();
    await env.HEALTH_KV.put(
      `webauthn:challenge:${challengeId}`,
      JSON.stringify({ challenge: options.challenge }),
      { expirationTtl: CHALLENGE_TTL },
    );
    return json(JSON.stringify({ options, challengeId }), 200);
  }

  // POST /api/auth/login/verify — verify the assertion, mint a session token.
  if (pathname === "/api/auth/login/verify") {
    const challengeId = String(body.challengeId ?? "");
    const stored = await env.HEALTH_KV.get(`webauthn:challenge:${challengeId}`);
    if (!stored) return json(JSON.stringify({ error: "challenge expired" }), 400);
    await env.HEALTH_KV.delete(`webauthn:challenge:${challengeId}`);
    const { challenge } = JSON.parse(stored) as { challenge: string };

    const response = body.response as { id?: string };
    const creds = await loadCreds(env);
    const cred = creds.find((c) => c.id === response?.id);
    if (!cred) return json(JSON.stringify({ error: "unknown credential" }), 400);

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body.response as never,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: cred.id,
          publicKey: b64urlToBytes(cred.publicKey),
          counter: cred.counter,
          transports: cred.transports,
        },
        requireUserVerification: false,
      });
    } catch {
      return json(JSON.stringify({ error: "verification failed" }), 401);
    }
    if (!verification.verified) {
      return json(JSON.stringify({ error: "not verified" }), 401);
    }

    cred.counter = verification.authenticationInfo.newCounter;
    await saveCreds(env, creds);
    return json(JSON.stringify({ token: await signSession(env.SESSION_SECRET) }), 200);
  }

  return json(JSON.stringify({ error: "not found" }), 404);
}
