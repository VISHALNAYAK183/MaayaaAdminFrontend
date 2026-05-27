import { apiClient, ADMIN_BASE, type PageResp } from "./client";

export interface StockRow {
  variantId: number;
  productId: number;
  productName: string;
  sizeId: number | null;
  colorId: number | null;
  quantity: number;
  lowStock: boolean;
}

export interface StockSummary {
  total: number;
  low: number;
  out: number;
}

export type StockFilter = "ALL" | "LOW" | "OUT";

// Mirrors StockManagementService.LOW_STOCK_THRESHOLD on the backend.
// Used by the inline lowStock pill after the user edits a quantity, so
// the UI doesn't have to refetch the whole page just to recolour one row.
export const LOW_STOCK_THRESHOLD = 5;

export const getStockManagement = (
  page = 0,
  size = 20,
  search?: string,
  filter: StockFilter = "ALL",
) =>
  apiClient.get<PageResp<StockRow>>(`${ADMIN_BASE}/stock`, {
    params: {
      page,
      size,
      ...(search ? { search } : {}),
      ...(filter !== "ALL" ? { filter } : {}),
    },
  });

export const getStockSummary = () =>
  apiClient.get<StockSummary>(`${ADMIN_BASE}/stock/summary`);

export const updateStock = (variantId: number, quantity: number) =>
  apiClient.put(`${ADMIN_BASE}/stock/${variantId}`, { quantity });
