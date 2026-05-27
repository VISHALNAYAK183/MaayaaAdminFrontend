import { apiClient, clientApi, ADMIN_BASE, CLIENT_BASE, API_BASE } from "./client";
import { AdminOrder } from "../types/order";

// Re-exported for any caller that still references these names
export { ADMIN_BASE, CLIENT_BASE };

export const getOrders = (
  status?: string,
  page = 0,
  size = 20,
  sortBy?: "newest" | "price",
  direction: "asc" | "desc" = "desc"
) =>
  apiClient.get(`${ADMIN_BASE}/orders`, {
    params: {
      ...(status ? { status } : {}),
      page,
      size,
      ...(sortBy ? { sortBy, direction } : {}),
    },
  });

export const getMostOrderedProducts = () =>
  apiClient.get<Array<{ product_id: number; product_name: string; total_ordered: number }>>(
    `${ADMIN_BASE}/orders/most-ordered-products`
  );

/**
 * Look up the invoice for an order (created at approval time).
 * Returns at minimum { invoiceId, invoiceNumber, total }.
 */
export const getInvoiceByOrder = (orderId: number) =>
  apiClient.get<{ invoiceId: number; invoiceNumber: string; total: number }>(
    `${API_BASE}/invoice/by-order/${orderId}`,
  );

export const downloadInvoicePdf = (invoiceId: number) =>
  apiClient.get<Blob>(`${API_BASE}/invoice/download/${invoiceId}`, {
    responseType: "blob",
  });

export const getOrderDetails = (orderId: number) =>
  clientApi.get(`${CLIENT_BASE}/orders/admin/${orderId}`);

export const shipOrder = (
  orderId: number,
  data: {
    carrier: string;
    trackingNumber: string;
    trackingUrl?: string;
    estimatedDeliveryDate: string;
  }
) => apiClient.post(`${ADMIN_BASE}/orders/${orderId}/ship`, data);

export const updateOrderStatus = (
  orderId: number,
  data: {
    status: string;
    description?: string;
    location?: string;
  }
) => apiClient.put(`${ADMIN_BASE}/orders/${orderId}/status`, data);

export const approveOrder = (orderId: number) =>
  apiClient.put(`${ADMIN_BASE}/orders/${orderId}/approve`);

export const rejectOrder = (orderId: number) =>
  apiClient.put(`${ADMIN_BASE}/orders/${orderId}/reject`);
