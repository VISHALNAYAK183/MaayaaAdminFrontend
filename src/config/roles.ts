/**
 * Role definitions, mirroring the backend's Role enum and SecurityConfig.
 *
 * This is a UX layer, not a security boundary: it hides what a role cannot use
 * so nobody clicks into a dead end. The real enforcement is SecurityConfig plus
 * JwtFilter, which resolves the authority from the database on every request.
 * Never treat a check here as protection — anyone can edit their own bundle.
 */

export const ROLES = ["ADMIN", "CATALOG", "SALES", "FINANCE", "CONTENT", "VIEWER"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  CATALOG: "Catalog",
  SALES: "Sales",
  FINANCE: "Finance",
  CONTENT: "Content",
  VIEWER: "Viewer (read-only)",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Full access, including managing admin users",
  CATALOG: "Products, categories, collections, sizes, colors, stock",
  SALES: "Orders, returns, exchanges, coupons",
  FINANCE: "Expenses, GST, analytics, product costs",
  CONTENT: "Home CMS and reviews",
  VIEWER: "Can view every section but change nothing",
};

/** Everyone signed in can see the dashboard. */
const EVERYONE: Role[] = [...ROLES];

/**
 * Longest-prefix wins, so "/coupons/add" resolves through "/coupons".
 * VIEWER appears everywhere except user management — it reads, never writes,
 * and write attempts are refused by the server.
 */
const PATH_ROLES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/admin-users", roles: ["ADMIN"] },

  { prefix: "/products", roles: ["ADMIN", "CATALOG", "VIEWER"] },
  { prefix: "/categories", roles: ["ADMIN", "CATALOG", "VIEWER"] },
  { prefix: "/collections", roles: ["ADMIN", "CATALOG", "VIEWER"] },
  { prefix: "/sizes", roles: ["ADMIN", "CATALOG", "VIEWER"] },
  { prefix: "/colors", roles: ["ADMIN", "CATALOG", "VIEWER"] },
  { prefix: "/stock", roles: ["ADMIN", "CATALOG", "VIEWER"] },

  { prefix: "/orders", roles: ["ADMIN", "SALES", "VIEWER"] },
  { prefix: "/returns", roles: ["ADMIN", "SALES", "VIEWER"] },
  { prefix: "/exchanges", roles: ["ADMIN", "SALES", "VIEWER"] },
  { prefix: "/coupons", roles: ["ADMIN", "SALES", "VIEWER"] },

  // Product costs are margin data, so they sit with Finance rather than Catalog.
  { prefix: "/costs", roles: ["ADMIN", "FINANCE", "VIEWER"] },
  { prefix: "/expenses", roles: ["ADMIN", "FINANCE", "VIEWER"] },
  { prefix: "/gst-report", roles: ["ADMIN", "FINANCE", "VIEWER"] },
  { prefix: "/analytics", roles: ["ADMIN", "FINANCE", "VIEWER"] },

  { prefix: "/home-cms", roles: ["ADMIN", "CONTENT", "VIEWER"] },
  { prefix: "/reviews", roles: ["ADMIN", "CONTENT", "VIEWER"] },

  { prefix: "/", roles: EVERYONE },
];

export function isRole(value: string | null | undefined): value is Role {
  return !!value && (ROLES as readonly string[]).includes(value);
}

/** Which roles may open this path. Unknown paths are treated as open. */
export function rolesForPath(pathname: string): Role[] {
  const match = PATH_ROLES.filter(
    (entry) => pathname === entry.prefix || pathname.startsWith(entry.prefix)
  ).sort((a, b) => b.prefix.length - a.prefix.length)[0];

  return match ? match.roles : EVERYONE;
}

export function canAccess(role: string | null | undefined, pathname: string): boolean {
  if (!isRole(role)) return false;
  return rolesForPath(pathname).includes(role);
}

/** VIEWER sees everything and changes nothing. */
export function isReadOnly(role: string | null | undefined): boolean {
  return role === "VIEWER";
}
