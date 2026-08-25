/**
 * ACCESS-token store.
 *
 * Deliberately free of React imports so `client.ts` can read the token from an
 * axios interceptor without a circular dependency on AuthContext, which is the
 * module that writes to it.
 *
 * Only the ACCESS token is persisted. The SETUP and MFA tokens minted during
 * login are short-lived, are rejected by every protected endpoint, and live in
 * AuthContext state only — persisting them would widen the blast radius of an
 * XSS for no benefit.
 */

const STORAGE_KEY = "maayaa.admin.accessToken";

let accessToken: string | null = null;
let hydrated = false;

export interface JwtPayload {
  sub?: string;
  role?: string;
  tokenType?: "ACCESS" | "MFA" | "SETUP";
  iat?: number;
  exp?: number;
}

/** Decode a JWT payload. Returns null for anything unparseable. */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Seconds remaining before `exp`, or null when the token carries no `exp`.
 * JwtService sets one on every token, but a token minted by an older build may
 * not have it — treat "no exp" as "cannot verify locally", never as "valid
 * forever".
 */
export function secondsUntilExpiry(token: string): number | null {
  const exp = decodeJwt(token)?.exp;
  return typeof exp === "number" ? exp - Math.floor(Date.now() / 1000) : null;
}

export function isExpired(token: string): boolean {
  const left = secondsUntilExpiry(token);
  if (left === null) return false; // unverifiable — let the server decide
  return left <= 0;
}

export function getAccessToken(): string | null {
  if (!hydrated) {
    hydrated = true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Drop an already-dead token on boot so the app renders the login screen
      // instead of firing a round of doomed requests first.
      accessToken = stored && !isExpired(stored) ? stored : null;
      if (stored && !accessToken) localStorage.removeItem(STORAGE_KEY);
    } catch {
      accessToken = null; // storage disabled (private mode, blocked cookies)
    }
  }
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
  hydrated = true;
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* session stays in memory for this tab only */
  }
}

export function clearAccessToken(): void {
  accessToken = null;
  hydrated = true;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}

/* ── Unauthorized broadcast ──────────────────────────────────────────────────
 * The transport layer detects a dead session; AuthContext decides what to do
 * about it. Kept as a subscription so `client.ts` never imports React.
 */

type UnauthorizedListener = () => void;
const listeners = new Set<UnauthorizedListener>();

export function onUnauthorized(fn: UnauthorizedListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Clears the stored token and notifies subscribers. Safe to call repeatedly. */
export function notifyUnauthorized(): void {
  const had = accessToken !== null;
  clearAccessToken();
  if (had) listeners.forEach((fn) => fn());
}
