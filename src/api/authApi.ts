import { API_BASE } from "./client";

const AUTH_BASE = `${API_BASE}/api/admin/auth`;

/* ── Contract types ──────────────────────────────────────────────────────────
 * Mirrors AdminLoginResponse / MfaSetupResponse on the backend.
 */

export type LoginMessage = "MFA_REQUIRED" | "MFA_SETUP_REQUIRED" | "Login successful";

export interface AdminLoginResponse {
  message: LoginMessage;
  token: string;
  username: string;
  role: string;
}

export interface MfaSetupResponse {
  secret: string;
  otpauthUri: string;
}

/* ── Errors ──────────────────────────────────────────────────────────────────
 *
 * WORKAROUND, not a design choice. The backend's GlobalExceptionHandler maps
 * every auth failure through `@ExceptionHandler(Exception.class)` to HTTP 500
 * with `{status:"N", message:"..."}` — a wrong password, a bad TOTP code and an
 * expired MFA token are indistinguishable by status code. Until the backend
 * returns 401/400 with a stable error code, the message string is the only
 * signal available, so we classify on it here and nowhere else.
 *
 * When the backend is fixed: switch `classify` to read the status/error code
 * and delete the string table. Nothing outside this file should need to change.
 */

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "INVALID_CODE"
  | "MFA_TOKEN_INVALID"
  | "ACCOUNT_INACTIVE"
  | "MFA_NOT_CONFIGURED"
  | "NETWORK"
  | "UNKNOWN";

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly status: number;

  constructor(code: AuthErrorCode, message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
  }
}

const MESSAGE_CODES: ReadonlyArray<[RegExp, AuthErrorCode]> = [
  [/invalid credentials/i, "INVALID_CREDENTIALS"],
  [/invalid authentication code/i, "INVALID_CODE"],
  [/invalid or expired mfa token|invalid mfa token|mfa token is required/i, "MFA_TOKEN_INVALID"],
  [/account is not active/i, "ACCOUNT_INACTIVE"],
  [/mfa is not (enabled|configured)/i, "MFA_NOT_CONFIGURED"],
];

const FRIENDLY: Record<AuthErrorCode, string> = {
  INVALID_CREDENTIALS: "Incorrect username or password.",
  INVALID_CODE: "That code isn't right. Enter the current six digits from your authenticator.",
  MFA_TOKEN_INVALID: "Your sign-in attempt expired. Please start again.",
  ACCOUNT_INACTIVE: "This admin account is not active. Contact an administrator.",
  MFA_NOT_CONFIGURED: "Two-factor authentication isn't set up on this account yet.",
  NETWORK: "Couldn't reach the server. Check your connection and try again.",
  UNKNOWN: "Something went wrong. Please try again.",
};

function classify(rawMessage: string, status: number): AuthError {
  for (const [pattern, code] of MESSAGE_CODES) {
    if (pattern.test(rawMessage)) return new AuthError(code, FRIENDLY[code], status);
  }
  return new AuthError("UNKNOWN", FRIENDLY.UNKNOWN, status);
}

/** Reads the backend's error body, which is ApiResponse: {status, message, data}. */
async function toAuthError(res: Response): Promise<AuthError> {
  const body = await res.json().catch(() => null);
  const raw = typeof body?.message === "string" ? body.message : "";
  return classify(raw, res.status);
}

async function authFetch(
  path: string,
  init: RequestInit,
  token?: string
): Promise<Response> {
  try {
    return await fetch(`${AUTH_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    // fetch only rejects on transport failure — DNS, offline, CORS, TLS.
    throw new AuthError("NETWORK", FRIENDLY.NETWORK, 0);
  }
}

/* ── Endpoints ───────────────────────────────────────────────────────────── */

/**
 * Step 1. Password check. Never returns an ACCESS token: on success the
 * backend hands back either a SETUP or an MFA token, neither of which is
 * accepted by any protected endpoint.
 */
export async function login(
  identifier: string,
  password: string
): Promise<AdminLoginResponse> {
  const res = await authFetch("/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) throw await toAuthError(res);
  return (await res.json()) as AdminLoginResponse;
}

/**
 * Step 2a, first-time setup. Requires the SETUP token — JwtFilter accepts it
 * on this path specifically.
 *
 * Note this endpoint is destructive: each call mints a fresh TOTP secret and
 * sets mfa_enabled = false. Call it once when entering the setup screen, not
 * on every render, or the admin's authenticator will silently stop matching.
 */
export async function mfaSetup(setupToken: string): Promise<MfaSetupResponse> {
  const res = await authFetch("/mfa/setup", { method: "POST" }, setupToken);
  if (!res.ok) throw await toAuthError(res);
  return (await res.json()) as MfaSetupResponse;
}

/**
 * Step 2b, confirm first-time setup. Returns `text/plain`, not JSON — the
 * backend signature is ResponseEntity<String> — so this one cannot go through
 * res.json().
 */
export async function mfaVerify(setupToken: string, code: string): Promise<void> {
  const res = await authFetch(
    "/mfa/verify",
    { method: "POST", body: JSON.stringify({ code }) },
    setupToken
  );
  if (res.ok) return;

  // Failure here is a 400 carrying the bare string "Invalid authentication code".
  const text = await res.text().catch(() => "");
  throw classify(text, res.status);
}

/**
 * Step 3. Exchanges the MFA token plus a TOTP code for the ACCESS token.
 * Sends only { code } — the backend reads the username from the MFA JWT and
 * sending it in the body is explicitly outside the contract.
 */
export async function verifyMfa(
  mfaToken: string,
  code: string
): Promise<AdminLoginResponse> {
  const res = await authFetch(
    "/mfa/verify-mfa",
    { method: "POST", body: JSON.stringify({ code }) },
    mfaToken
  );
  if (!res.ok) throw await toAuthError(res);
  return (await res.json()) as AdminLoginResponse;
}
