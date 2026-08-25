import { useAuth } from "../context/AuthContext";
import { isReadOnly } from "../config/roles";

/**
 * True when the signed-in role may look but not touch.
 *
 * Use it to hide write controls. It is presentation only — the server refuses
 * the write regardless, and client.ts refuses to send it — so a missed control
 * is a UX wart, never a security hole.
 */
export function useReadOnly(): boolean {
  const { role } = useAuth();
  return isReadOnly(role);
}
