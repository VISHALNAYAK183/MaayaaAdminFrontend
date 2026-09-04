import { apiClient, ADMIN_BASE, CLIENT_BASE, API_BASE } from "./client";
import type { DeliveryRoute, ShipOptions } from "../types/order";

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

/**
 * Order detail. Served by admin-api, which checks the caller's role. The
 * storefront's copy of this read was open to anyone who could guess an order
 * id, so it is gone.
 */
export const getOrderDetails = (orderId: number) =>
  apiClient.get(`${ADMIN_BASE}/orders/${orderId}`);

/** Responses from the order write endpoints carry the order's new state. */
export interface OrderStateResponse {
  orderId: number;
  status: string;
  message: string;
}

export const getShipOptions = (orderId: number) =>
  apiClient.get<ShipOptions>(`${ADMIN_BASE}/orders/${orderId}/ship-options`);

/**
 * Carrier and tracking number are required only on the MANUAL route — a parcel
 * we are driving ourselves has neither, and asking for them was why local
 * orders used to be shipped under a made-up AWB.
 */
export const shipOrder = (
  orderId: number,
  data: {
    route?: DeliveryRoute;
    /** Courier route only. Omit for the cheapest that will take it. */
    courierId?: number;
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    estimatedDeliveryDate?: string;
  }
) => apiClient.post<OrderStateResponse>(`${ADMIN_BASE}/orders/${orderId}/ship`, data);

/**
 * A line on the parcel's timeline that does not move the order on — where it
 * has got to, that it is held up, that delivery was attempted. The customer
 * reads the description on their order page.
 */
export const addShipmentEvent = (
  orderId: number,
  data: {
    kind: "IN_TRANSIT" | "DELAYED" | "DELIVERY_ATTEMPTED";
    description?: string;
    location?: string;
  }
) => apiClient.post(`${ADMIN_BASE}/orders/${orderId}/shipment-events`, data);

export const updateOrderStatus = (
  orderId: number,
  data: {
    status: string;
    description?: string;
    location?: string;
  }
) => apiClient.put<OrderStateResponse>(`${ADMIN_BASE}/orders/${orderId}/status`, data);

export const approveOrder = (orderId: number) =>
  apiClient.put(`${ADMIN_BASE}/orders/${orderId}/approve`);

export const rejectOrder = (orderId: number) =>
  apiClient.put(`${ADMIN_BASE}/orders/${orderId}/reject`);

/**
 * Cancel an order: stock back, coupon released, prepaid money returned, and
 * the reason written onto the customer's timeline — so keep it readable.
 */
export const cancelOrder = (orderId: number, reason: string) =>
  apiClient.put<{
    orderId: number;
    status: string;
    refundAmount: number;
    reason: string;
    message: string;
  }>(`${ADMIN_BASE}/orders/${orderId}/cancel`, { reason });

/** Ask the gateway again for a refund it refused. */
export const retryRefund = (orderId: number, refundId: number) =>
  apiClient.post<{
    refundId: number;
    status: string;
    refundAmount: number;
    message: string;
  }>(`${ADMIN_BASE}/orders/${orderId}/refunds/${refundId}/retry`);
