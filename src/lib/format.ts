/** Numbers the way an Indian shop reads them: ₹1,52,640 and ₹1.5L. */

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export const rupees = (value: number | null | undefined) =>
  value == null ? "—" : `₹${inr.format(Math.round(value))}`;

export const count = (value: number | null | undefined) => (value == null ? "—" : inr.format(value));

/** Axis and tile shorthand: ₹950, ₹48K, ₹1.5L, ₹2.3Cr. */
export const compactRupees = (value: number) => {
  const sign = value < 0 ? "-" : "";
  const v = Math.abs(value);
  const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ""));
  if (v >= 1e7) return `${sign}₹${trim(v / 1e7)}Cr`;
  if (v >= 1e5) return `${sign}₹${trim(v / 1e5)}L`;
  if (v >= 1e3) return `${sign}₹${trim(v / 1e3)}K`;
  return `${sign}₹${Math.round(v)}`;
};

/** Change against the previous period, or null when there is nothing to compare with. */
export const percentChange = (current: number, previous: number): number | null =>
  previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-09" → "Sep". */
export const monthShort = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym;

/** "2026-09" → "September 2026". */
export const monthLong = (ym: string) => `${MONTHS_LONG[Number(ym.slice(5, 7)) - 1] ?? ym} ${ym.slice(0, 4)}`;

/** "just now", "3 hours ago", "2 days ago". */
export const ago = (iso: string | null | undefined, now = Date.now()) => {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const minutes = Math.max(0, Math.round((now - then) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};
