import axios from "axios";
import {
  getAccessToken,
  notifyUnauthorized,
} from "./authToken";

export const API_BASE: string = import.meta.env.VITE_API_BASE ?? "http://localhost:8081";
export const CLIENT_API_BASE: string =
  import.meta.env.VITE_CLIENT_API_BASE ?? "http://localhost:8080";

export const ADMIN_BASE = `${API_BASE}/api/admin`;
export const PUBLIC_API_BASE = `${API_BASE}/api`;
export const CLIENT_BASE = `${CLIENT_API_BASE}/api`;

export const apiClient = axios.create({
  baseURL: API_BASE,
});

/**
 * Spring Data Page response shape. Used wherever an admin list endpoint
 * supports server-side pagination (expenses, stock, returns, exchanges,
 * products). Always prefer this over fetching a full list and filtering
 * on the client — see hooks/useDebouncedValue and components/ui/Pagination
 * for the matching UI building blocks.
 */
export interface PageResp<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/**
 * Storefront backend. Note it does NOT get the admin ACCESS token: that token
 * is issued by admin-api and this is a different host, so attaching it would
 * hand our session credential to a service that never asked for it. If the
 * storefront backend turns out to validate admin JWTs, add the interceptor
 * here deliberately rather than by accident.
 */
export const clientApi = axios.create({
  baseURL: CLIENT_API_BASE,
});

/**
 * Error carrying the HTTP status, so callers can tell "bad request" from
 * "session died" instead of string-matching a generic Error.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * True when a response on a *protected* endpoint means the session is gone.
 *
 * 403 counts. The admin backend maps unauthenticated requests to Spring
 * Security's default Http403ForbiddenEntryPoint rather than 401, and there is
 * exactly one role (ROLE_ADMIN) with no method-level security, so a genuine
 * "authenticated but not permitted" 403 cannot currently occur.
 */
export function isSessionDead(status: number): boolean {
  return status === 401 || status === 403;
}

/** Authorization header for the ACCESS token, or {} when signed out. */
export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ── axios wiring ────────────────────────────────────────────────────────── */

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    // The auth endpoints handle their own failures — a bad password must not
    // look like an expired session.
    const url: string = error?.config?.url ?? "";
    const isAuthCall = url.includes("/api/admin/auth/");
    if (!isAuthCall && typeof status === "number" && isSessionDead(status)) {
      notifyUnauthorized();
    }
    return Promise.reject(error);
  }
);

/* ── fetch helpers ───────────────────────────────────────────────────────── */

async function unwrap<T>(res: Response, action: string): Promise<T> {
  if (!res.ok) {
    if (isSessionDead(res.status)) notifyUnauthorized();
    const err = await res.json().catch(() => null);
    throw new ApiError(
      err?.message || `Failed to ${action}: ${res.status}`,
      res.status,
      err
    );
  }
  const json = await res.json();
  return (json?.data ?? json) as T;
}

const jsonHeaders = () => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  ...authHeaders(),
});

export const http = {
  get: <T>(url: string, action = "fetch") =>
    fetch(url, { headers: authHeaders() }).then((r) => unwrap<T>(r, action)),
  post: <T>(url: string, body: unknown, action = "create") =>
    fetch(url, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(body),
    }).then((r) => unwrap<T>(r, action)),
  put: <T>(url: string, body: unknown, action = "update") =>
    fetch(url, {
      method: "PUT",
      headers: jsonHeaders(),
      body: JSON.stringify(body),
    }).then((r) => unwrap<T>(r, action)),
  del: (url: string, action = "delete") =>
    fetch(url, { method: "DELETE", headers: authHeaders() }).then(async (r) => {
      if (!r.ok) {
        if (isSessionDead(r.status)) notifyUnauthorized();
        throw new ApiError(`Failed to ${action}: ${r.status}`, r.status);
      }
      return true;
    }),
  /**
   * Multipart upload. Never sets Content-Type — the browser has to generate it
   * so the multipart boundary matches the body, and setting it by hand breaks
   * the upload.
   */
  upload: <T>(url: string, form: FormData, action = "upload") =>
    fetch(url, { method: "POST", headers: authHeaders(), body: form }).then((r) =>
      unwrap<T>(r, action)
    ),
};
