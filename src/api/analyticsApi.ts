import { apiClient, ADMIN_BASE } from "./client";

export interface AnalyticsDashboard {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  totalOrders: number;
  deliveredOrders: number;
  totalProductsSold: number;
  averageOrderValue: number;
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
}

export type AnalyticsRange = "DAY" | "WEEK" | "MONTH" | "ALL";

export interface AnalyticsProfit {
  range: AnalyticsRange;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  totalOrders: number;
  totalProductsSold: number;
  averageOrderValue: number;
}

export interface TopSellingProduct {
  productId: number;
  productName: string;
  unitsSold: number;
  revenue: number;
  stockLeft: number;
  averageSellingPrice: number;
}

export const getAnalyticsDashboard = () =>
  apiClient.get<AnalyticsDashboard>(`${ADMIN_BASE}/analytics/dashboard`);

export const getProductAnalytics = (productId: number) =>
  apiClient.get<ProductAnalytics>(`${ADMIN_BASE}/analytics/product/${productId}`);

export const getAnalyticsProfit = (range: AnalyticsRange) =>
  apiClient.get<AnalyticsProfit>(`${ADMIN_BASE}/analytics/profit`, { params: { range } });

export const getTopSellingProducts = () =>
  apiClient.get<TopSellingProduct[]>(`${ADMIN_BASE}/analytics/top-products`);
