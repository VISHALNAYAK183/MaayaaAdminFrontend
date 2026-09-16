import { apiClient, ADMIN_BASE } from "./client";

// Payment-gateway fees are no longer a per-product cost — see Expense module.
// Legacy 'PAYMENT_GATEWAY' rows are migrated to 'OTHER' by the PR 1 SQL.
export type CostType =
  | "RAW_MATERIAL"
  | "PRINTING"
  | "PACKAGING"
  | "TAG"
  | "SHIPPING"
  | "OTHER";

/**
 * What a new cost line can be. Not SHIPPING: it differs by pin code and
 * courier, so it is taken from each order's shipment. Lines saved as SHIPPING
 * before that stay on file and are shown, but no total counts them.
 */
export const COST_TYPES: CostType[] = [
  "RAW_MATERIAL",
  "PRINTING",
  "PACKAGING",
  "TAG",
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
  /** What a piece costs to make: every live line except shipping. */
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

export const addProductCost = (productId: number, items: CostItemInput[]) =>
  apiClient.post(`${ADMIN_BASE}/product-cost/add`, { productId, items });

export const updateCostItem = (id: number, amount: number) =>
  apiClient.put(`${ADMIN_BASE}/product-cost/update/${id}?amount=${amount}`);

export const deleteCostItem = (id: number) =>
  apiClient.delete(`${ADMIN_BASE}/product-cost/delete/${id}`);
