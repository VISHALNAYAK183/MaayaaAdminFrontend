import { apiClient, ADMIN_BASE, type PageResp } from "./client";

export type ExchangeStatus =
  | "REQUESTED"
  | "ONLINE_QC_APPROVED"
  | "ONLINE_QC_REJECTED"
  | "STOCK_RESERVED"
  | "NO_STOCK"
  | "PICKUP_PENDING"
  | "PICKED_UP"
  | "WAREHOUSE_QC_PENDING"
  | "WAREHOUSE_QC_PASSED"
  | "WAREHOUSE_QC_FAILED"
  | "REPLACEMENT_SHIPPED"
  | "COMPLETED"
  | "REFUND_INITIATED"
  | "REJECTED";

// Shape returned by GET /api/admin/exchanges — matches AdminExchangeResponseDTO.
// Every key is a strict superset of the legacy map: original keys are still
// present, plus product / customer / variant size+colour / timestamps.
export type AdminExchange = {
  exchangeId: number;
  reason: string | null;
  comments: string | null;
  exchangeStatus: ExchangeStatus;
  onlineQcStatus: string | null;
  onlineQcComment: string | null;
  warehouseQcStatus: string | null;
  warehouseQcComment: string | null;
  requestedAt: string | null;
  orderId: number | null;
  orderItemId: number | null;
  oldVariantId: number | null;
  newVariantId: number | null;

  // Enrichment added by AdminExchangeResponseDTO
  approvedAt: string | null;
  rejectedAt: string | null;
  completedAt: string | null;

  productId: number | null;
  productName: string | null;
  productImage: string | null;

  oldVariantSize: string | null;
  oldVariantColor: string | null;
  oldVariantHex: string | null;

  newVariantSize: string | null;
  newVariantColor: string | null;
  newVariantHex: string | null;

  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  userPhone: string | null;

  /** When the courier collected the original item. */
  pickedUpAt: string | null;

  // The replacement parcel, once it has gone out.
  replacementCarrier: string | null;
  replacementTrackingNumber: string | null;
  replacementTrackingUrl: string | null;
  replacementEstimatedDeliveryDate: string | null;
  replacementShippedAt: string | null;
  replacementDeliveredAt: string | null;

  // Where a failed item goes, and the deadline the customer is on.
  dispositionStatus: string | null;
  dispositionDeadline: string | null;
  dispositionNote: string | null;
};

export type ShipReplacementPayload = {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: string;
};

/**
 * Server-paged Exchanges list. `statuses` is a list because tabs are
 * composite (e.g. "Pickup" matches 4 statuses) — the backend takes a
 * CSV which Spring binds to List&lt;ExchangeStatus&gt;.
 *
 * Pass an empty array (or omit) for the "All" tab.
 */
export const getAdminExchanges = (
  page = 0,
  size = 20,
  statuses?: ExchangeStatus[],
) =>
  apiClient.get<PageResp<AdminExchange>>(`${ADMIN_BASE}/exchanges`, {
    params: {
      page,
      size,
      ...(statuses && statuses.length > 0 ? { statuses: statuses.join(",") } : {}),
    },
  });

export const approveOnlineQc = (id: number, comment: string) =>
  apiClient.put(`${ADMIN_BASE}/exchanges/${id}/online-qc/approve`, { comment });

export const rejectOnlineQc = (id: number, comment: string) =>
  apiClient.put(`${ADMIN_BASE}/exchanges/${id}/online-qc/reject`, { comment });

export const warehouseQcPass = (id: number, comment: string) =>
  apiClient.put(`${ADMIN_BASE}/exchanges/${id}/warehouse-qc/pass`, { comment });

export const warehouseQcFail = (id: number, comment: string) =>
  apiClient.put(`${ADMIN_BASE}/exchanges/${id}/warehouse-qc/fail`, { comment });

/** The courier has collected the original item from the customer. */
export const markExchangePickedUp = (id: number) =>
  apiClient.put(`${ADMIN_BASE}/exchanges/${id}/picked-up`);

/**
 * Send the replacement, with what the customer needs to follow it. This used
 * to take no body at all and only flipped a status.
 */
export const shipReplacement = (id: number, payload: ShipReplacementPayload) =>
  apiClient.put(`${ADMIN_BASE}/exchanges/${id}/ship-replacement`, payload);

export const completeExchange = (id: number) =>
  apiClient.put(`${ADMIN_BASE}/exchanges/${id}/complete`);
