import axios from "axios";

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

export const clientApi = axios.create({
  baseURL: CLIENT_API_BASE,
});

async function unwrap<T>(res: Response, action: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || `Failed to ${action}: ${res.status}`);
  }
  const json = await res.json();
  return (json?.data ?? json) as T;
}

export const http = {
  get: <T>(url: string, action = "fetch") =>
    fetch(url).then((r) => unwrap<T>(r, action)),
  post: <T>(url: string, body: unknown, action = "create") =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    }).then((r) => unwrap<T>(r, action)),
  put: <T>(url: string, body: unknown, action = "update") =>
    fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    }).then((r) => unwrap<T>(r, action)),
  del: (url: string, action = "delete") =>
    fetch(url, { method: "DELETE" }).then(async (r) => {
      if (!r.ok) throw new Error(`Failed to ${action}: ${r.status}`);
      return true;
    }),
};
