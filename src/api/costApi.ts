import { apiClient, ADMIN_BASE } from "./client";

export type CostType =
  | "RAW_MATERIAL"
  | "PRINTING"
  | "PACKAGING"
  | "TAG"
  | "SHIPPING"
  | "PAYMENT_GATEWAY"
  | "OTHER";

export const COST_TYPES: CostType[] = [
  "RAW_MATERIAL",
  "PRINTING",
  "PACKAGING",
  "TAG",
  "SHIPPING",
  "PAYMENT_GATEWAY",
  "OTHER",
];

export interface CostBreakdown {
  id: number;
  productCostId: number;
  costType: CostType;
  amount: number;
  description: string | null;
  status: string;        // "1" active / "0" deleted
}

export interface ProductCostSummary {
  productId: number;
  productName: string | null;
  totalCost: number;
  profit: number;
  breakdown: CostBreakdown[];
}

export interface CostItemInput {
  costType: CostType;
  amount: number;
  description?: string;
}

export const getAllProductCosts = () =>
  apiClient.get<ProductCostSummary[]>(`${ADMIN_BASE}/product-cost/all`);

export const getProductCost = (productId: number) =>
  apiClient.get<ProductCostSummary>(`${ADMIN_BASE}/product-cost/${productId}`);

export const addProductCost = (productId: number, items: CostItemInput[]) =>
  apiClient.post(`${ADMIN_BASE}/product-cost/add`, { productId, items });

export const updateCostItem = (id: number, amount: number) =>
  apiClient.put(`${ADMIN_BASE}/product-cost/update/${id}?amount=${amount}`);

export const deleteCostItem = (id: number) =>
  apiClient.delete(`${ADMIN_BASE}/product-cost/delete/${id}`);
