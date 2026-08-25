import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AuthError,
  login as loginRequest,
  mfaSetup as mfaSetupRequest,
  mfaVerify as mfaVerifyRequest,
  verifyMfa as verifyMfaRequest,
  type MfaSetupResponse,
} from "../api/authApi";
import {
  clearAccessToken,
  decodeJwt,
  getAccessToken,
  onUnauthorized,
  setAccessToken,
} from "../api/authToken";

/**
 * "loading"          — deciding whether a stored token is still usable
 * "signedOut"        — show the sign-in form
 * "mfaRequired"      — password accepted, waiting on a TOTP code
 * "mfaSetupRequired" — password accepted, but no authenticator is enrolled yet
 * "signedIn"         — ACCESS token held; protected routes may render
 */
export type AuthStatus =
  | "loading"
  | "signedOut"
  | "mfaRequired"
  | "mfaSetupRequired"
  | "signedIn";

type AuthContextType = {
  status: AuthStatus;
  username: string | null;
  role: string | null;
  /** One-shot message for the sign-in screen, e.g. after a session expires. */
  notice: string | null;
  signIn: (identifier: string, password: string) => Promise<AuthStatus>;
  completeMfa: (code: string) => Promise<void>;
  beginMfaSetup: () => Promise<MfaSetupResponse>;
  completeMfaSetup: (code: string) => Promise<void>;
  signOut: () => void;
  /** Abandons a half-finished MFA step and returns to the password form. */
  restart: (notice?: string) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * The SETUP or MFA token for the login attempt in flight. Held in a ref, not
   * state and not storage: it is useless to protected endpoints, short-lived,
   * and there is no reason for it to outlive the tab or trigger a re-render.
   */
  const pendingToken = useRef<string | null>(null);

  // Restore a previous session. getAccessToken() drops an expired token itself,
  // so reaching here with a value means it still had time left when the app
  // booted.
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setStatus("signedOut");
      return;
    }
    const payload = decodeJwt(token);
    setUsername(payload?.sub ?? null);
    setRole(payload?.role ?? null);
    setStatus("signedIn");
  }, []);

  // The transport layer saw a dead session on a protected call.
  useEffect(
    () =>
      onUnauthorized(() => {
        pendingToken.current = null;
        setUsername(null);
        setRole(null);
        setNotice("Your session expired. Please sign in again.");
        setStatus("signedOut");
      }),
    []
  );

  const signIn = useCallback(async (identifier: string, password: string) => {
    setNotice(null);
    const res = await loginRequest(identifier, password);

    // login() never returns an ACCESS token — only SETUP or MFA.
    pendingToken.current = res.token;
    setUsername(res.username);
    setRole(res.role);

    const next: AuthStatus =
      res.message === "MFA_SETUP_REQUIRED" ? "mfaSetupRequired" : "mfaRequired";
    setStatus(next);
    return next;
  }, []);

  const completeMfa = useCallback(async (code: string) => {
    const token = pendingToken.current;
    if (!token) {
      throw new AuthError(
        "MFA_TOKEN_INVALID",
        "Your sign-in attempt expired. Please start again.",
        0
      );
    }
    const res = await verifyMfaRequest(token, code);
    pendingToken.current = null;
    setAccessToken(res.token);
    setUsername(res.username);
    setRole(res.role);
    setStatus("signedIn");
  }, []);

  /**
   * Destructive on the backend: every call mints a new TOTP secret and turns
   * MFA off until /mfa/verify succeeds. Callers must invoke this once, on an
   * explicit user action — never from an effect that can re-run.
   */
  const beginMfaSetup = useCallback(async () => {
    const token = pendingToken.current;
    if (!token) {
      throw new AuthError(
        "MFA_TOKEN_INVALID",
        "Your sign-in attempt expired. Please start again.",
        0
      );
    }
    return mfaSetupRequest(token);
  }, []);

  /**
   * Enrolment only enables MFA — the backend issues no ACCESS token here, so
   * the admin has to sign in again with their new authenticator.
   */
  const completeMfaSetup = useCallback(async (code: string) => {
    const token = pendingToken.current;
    if (!token) {
      throw new AuthError(
        "MFA_TOKEN_INVALID",
        "Your sign-in attempt expired. Please start again.",
        0
      );
    }
    await mfaVerifyRequest(token, code);
    pendingToken.current = null;
    setUsername(null);
    setRole(null);
    setNotice("Two-factor authentication is on. Sign in to continue.");
    setStatus("signedOut");
  }, []);

  const signOut = useCallback(() => {
    // Local-only. The backend has no logout endpoint and no revocation, so the
    // token stays valid until it expires — clearing it here just ends this
    // browser's session.
    pendingToken.current = null;
    clearAccessToken();
    setUsername(null);
    setRole(null);
    setNotice(null);
    setStatus("signedOut");
  }, []);

  const restart = useCallback((message?: string) => {
    pendingToken.current = null;
    setUsername(null);
    setRole(null);
    setNotice(message ?? null);
    setStatus("signedOut");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        status,
        username,
        role,
        notice,
        signIn,
        completeMfa,
        beginMfaSetup,
        completeMfaSetup,
        signOut,
        restart,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
