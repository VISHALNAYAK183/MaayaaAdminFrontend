import { apiClient, ADMIN_BASE } from "./client";

export interface StockRow {
  variantId: number;
  productId: number;
  productName: string;
  sizeId: number | null;
  colorId: number | null;
  quantity: number;
  lowStock: boolean;
}

type StockEnvelope = { status: string; message: string; data: StockRow[] };

export const getStockManagement = () =>
  apiClient.get<StockEnvelope>(`${ADMIN_BASE}/stock`);

export const updateStock = (variantId: number, quantity: number) =>
  apiClient.put(`${ADMIN_BASE}/stock/${variantId}`, { quantity });
