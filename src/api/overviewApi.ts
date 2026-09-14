import { apiClient, ADMIN_BASE, PUBLIC_API_BASE } from "./client";

/*
 * The landing page, the bell and the top bar's search. Each overview lives
 * under its department's path, so the server refuses a section the role cannot
 * read and the page simply leaves that section out.
 */

// ---- bell -------------------------------------------------------------------

export type InboxKind = "WORK" | "ALERT";

export interface InboxItem {
  key: string;
  kind: InboxKind;
  severity: "WARN" | "CRIT" | null;
  section: "sales" | "catalog" | "content";
  count: number;
  amount: number | null;
  oldestAt: string | null;
  samples: string[];
  fingerprint: string | null;
}

export interface Inbox {
  items: InboxItem[];
  generatedAt: string;
}

export async function getInbox(signal?: AbortSignal): Promise<Inbox> {
  const res = await apiClient.get<Inbox>(`${ADMIN_BASE}/inbox`, { signal });
  return res.data;
}

export async function markAlertsRead(alerts: { key: string; fingerprint: string }[]): Promise<void> {
  await apiClient.post(`${ADMIN_BASE}/inbox/read`, { alerts });
}

// ---- search -----------------------------------------------------------------

export interface OrderHit {
  orderId: number;
  customerName: string | null;
  amount: number | null;
  status: string | null;
  orderDate: string | null;
}

export interface CustomerHit {
  userId: number;
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface ProductHit {
  productId: number;
  name: string;
  price: number | null;
  live: boolean;
}

export interface SearchResults {
  orders: OrderHit[];
  customers: CustomerHit[];
  products: ProductHit[];
}

export async function searchAdmin(q: string, signal?: AbortSignal): Promise<SearchResults> {
  const res = await apiClient.get<SearchResults>(`${ADMIN_BASE}/search`, { params: { q }, signal });
  return res.data;
}

// ---- landing page -----------------------------------------------------------

export interface MoneyWindow {
  revenue: number;
  cogs: number;
  expenses: number;
  netProfit: number;
  netMargin: number | null;
  orders: number;
  units: number;
  averageOrderValue: number | null;
}

export interface FinanceTrends {
  months: string[];
  revenue: number[];
  cogs: number[];
  expenses: number[];
  netProfit: number[];
  orders: number[];
  averageOrderValue: (number | null)[];
  last30: MoneyWindow;
  previous30: MoneyWindow;
  expensesLast30: { name: string; amount: number }[];
}

export interface SalesOverview {
  months: string[];
  orders: number[];
  returns: number[];
  returnRate: (number | null)[];
  newCustomers: number[];
  ordersLast30: number;
  ordersPrevious30: number;
  customersLast30: number;
  customersPrevious30: number;
}

export interface CatalogOverview {
  months: string[];
  units: number[];
  unitsLast30: number;
  unitsPrevious30: number;
  liveProducts: number;
  variants: number;
  low: number;
  out: number;
  unitsByCategoryLast30: { name: string; count: number }[];
  topSellersLast30: { productId: number; name: string; units: number; revenue: number | null }[];
  stockWatch: { variantId: number; productId: number; productName: string; color: string | null; size: string | null; quantity: number }[];
}

export interface ContentOverview {
  months: string[];
  reviews: number[];
  averageRating: (number | null)[];
  reviewsLast30: number;
  reviewsPrevious30: number;
  pending: number;
  publishedAverage: number | null;
  publishedCount: number;
  stars: Record<string, number>;
}

export async function getFinanceTrends(signal?: AbortSignal): Promise<FinanceTrends> {
  return (await apiClient.get<FinanceTrends>(`${ADMIN_BASE}/analytics/trends`, { signal })).data;
}

export async function getSalesOverview(signal?: AbortSignal): Promise<SalesOverview> {
  return (await apiClient.get<SalesOverview>(`${ADMIN_BASE}/orders/overview`, { signal })).data;
}

export async function getCatalogOverview(signal?: AbortSignal): Promise<CatalogOverview> {
  return (await apiClient.get<CatalogOverview>(`${ADMIN_BASE}/stock/overview`, { signal })).data;
}

export async function getContentOverview(signal?: AbortSignal): Promise<ContentOverview> {
  return (await apiClient.get<ContentOverview>(`${PUBLIC_API_BASE}/reviews/overview`, { signal })).data;
}
