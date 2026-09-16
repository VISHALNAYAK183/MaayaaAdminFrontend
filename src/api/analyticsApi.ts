import { apiClient, ADMIN_BASE } from "./client";

export interface CategoryExpense {
  category: string;
  amount: number;
}

export interface ProductAnalytics {
  productId: number;
  productName: string;
  unitsSold: number;
  revenue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  averageRating: number | null;
  totalReviews: number;
  stockLeft: number;
  averageSellingPrice: number | null;
}

export type AnalyticsRange = "DAY" | "WEEK" | "MONTH" | "ALL";

/**
 * Shipping inside a panel. forwardMissing: shipped with no cost recorded.
 * rtoEstimated: RTOs priced at the forward charge until the real figure is
 * entered. reverseMissing: collections with no cost recorded.
 */
export interface ShippingTotals {
  forward: number;
  rto: number;
  reverse: number;
  total: number;
  forwardMissing: number;
  rtoEstimated: number;
  reverseMissing: number;
}

export interface ProfitPanel {
  sales: number;
  refunds: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  shipping: ShippingTotals;
  operatingExpenses: number;
  netProfit: number;
  /** null when there is no revenue to divide by. */
  netMargin: number | null;
  orders: number;
  units: number;
  averageOrderValue: number;
  returnsRefunded: number;
  shipped: number;
  rtoCount: number;
  rtoRate: number | null;
  reversePickups: number;
  /** Settled panel: delivered in the period, not final yet. */
  awaitingOrders: number;
  awaitingSales: number;
}

export interface ProfitReport {
  range: AnalyticsRange;
  from: string;
  to: string;
  returnWindowDays: number;
  asOfToday: ProfitPanel;
  settled: ProfitPanel;
  expenseBreakdown: CategoryExpense[];
  /** As of today: sold less returned, revenue after coupons. */
  sold: { productId: number; name: string; units: number; revenue: number; stockLeft: number | null }[];
  /** Every order placed in the period that was not cancelled, delivered or not. */
  ordered: { productId: number; name: string; units: number; orders: number }[];
}

export const getProductAnalytics = (productId: number) =>
  apiClient.get<ProductAnalytics>(`${ADMIN_BASE}/analytics/product/${productId}`);

export const getProfitReport = (range: AnalyticsRange) =>
  apiClient.get<ProfitReport>(`${ADMIN_BASE}/analytics/report`, { params: { range } });
