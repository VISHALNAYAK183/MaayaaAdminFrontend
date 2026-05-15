import { apiClient, clientApi, ADMIN_BASE, CLIENT_BASE } from "./client";
import { AdminOrder } from "../types/order";

// Re-exported for any caller that still references these names
export { ADMIN_BASE, CLIENT_BASE };

export const getOrders = (status?: string, page = 0, size = 20) =>
  apiClient.get(`${ADMIN_BASE}/orders`, {
    params: { ...(status ? { status } : {}), page, size },
  });

export const getOrderDetails = (orderId: number) =>
  clientApi.get(`${CLIENT_BASE}/orders/details/${orderId}`);

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
