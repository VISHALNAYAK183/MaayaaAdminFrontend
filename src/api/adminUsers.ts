import { ADMIN_BASE, apiClient } from "./client";
import type { Role } from "../config/roles";

const URL = `${ADMIN_BASE}/admins`;

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: Role | string;
  status: "ACTIVE" | "INACTIVE" | string;
  mfaEnabled: boolean;
  mfaVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CreateAdminPayload {
  username: string;
  email: string;
  password: string;
  role: Role;
}

export interface ChangePasswordPayload {
  /** Required only when changing your own password. */
  currentPassword?: string;
  newPassword: string;
}

export const getAdminUsers = () => apiClient.get<AdminUser[]>(URL);

/**
 * The signed-in admin's own account, read from the database.
 *
 * Sits outside /admins (which is ADMIN-only) so every role can call it. Used to
 * refresh the role after sign-in, since the JWT's role claim is fixed at issue
 * time and would go stale the moment someone is promoted or demoted.
 */
export const getCurrentAdmin = () => apiClient.get<AdminUser>(`${ADMIN_BASE}/me`);

export const createAdminUser = (data: CreateAdminPayload) =>
  apiClient.post<AdminUser>(URL, data);

export const changeAdminPassword = (id: number, data: ChangePasswordPayload) =>
  apiClient.put(`${URL}/${id}/password`, data);

export const updateAdminStatus = (id: number, status: "ACTIVE" | "INACTIVE") =>
  apiClient.put<AdminUser>(`${URL}/${id}/status`, { status });

export const deleteAdminUser = (id: number) => apiClient.delete(`${URL}/${id}`);

export const updateAdminRole = (id: number, role: Role) =>
  apiClient.put<AdminUser>(`${URL}/${id}/role`, { role });

/** Clears the TOTP secret so the admin enrols again at next sign-in. */
export const resetAdminMfa = (id: number) => apiClient.post(`${URL}/${id}/mfa/reset`);

/**
 * Pulls the server's message out of an axios failure. The backend answers with
 * ApiResponse {status, message}, and these endpoints return a real 400 for
 * caller mistakes, so the message is worth showing verbatim.
 */
export function adminUserError(err: unknown, fallback = "Something went wrong"): string {
  const res = (err as { response?: { data?: { message?: string } } })?.response;
  return res?.data?.message || fallback;
}
