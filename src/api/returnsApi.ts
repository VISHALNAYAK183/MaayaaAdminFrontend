import { apiClient, ADMIN_BASE, type PageResp } from "./client";

export type AdminReturn = {
  returnId: number;
  orderId: number | null;
  orderItemId: number | null;
  quantity: number | null;
  itemPrice: number | null;
  productId: number | null;
  productName: string | null;
  productImage: string | null;
  variantId: number | null;
  variantSize: string | null;
  variantColor: string | null;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  userPhone: string | null;
  reason: string | null;
  comments: string | null;
  returnStatus:
    | "REQUESTED"
    | "APPROVED"
    | "PICKED_UP"
    | "INSPECTED"
    | "REFUND_APPROVED"
    | "REFUNDED"
    | "REJECTED";
  refundAmount: number | null;
  requestedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  completedAt: string | null;
  // How the customer asked to be paid back, and where to send it when that is
  // a manual payout.
  refundMode: "ORIGINAL" | "STORE_CREDIT" | "BANK" | null;
  refundUpi: string | null;
  refundAccountName: string | null;
  refundAccountNumber: string | null;
  refundIfsc: string | null;
  refundStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | null;
  refundMethod: string | null;
  refundTransactionId: string | null;
  refundedAt: string | null;
};

export type AdminReturnStatus = AdminReturn["returnStatus"];

/**
 * Server-paged Returns list.
 * Status is optional — omit for the "All" tab.
 */
export const getAdminReturns = (
  page = 0,
  size = 20,
  status?: AdminReturnStatus,
) =>
  apiClient.get<PageResp<AdminReturn>>(`${ADMIN_BASE}/returns`, {
    params: {
      page,
      size,
      ...(status ? { status } : {}),
    },
  });

export const approveReturn = (returnId: number) =>
  apiClient.put(`${ADMIN_BASE}/returns/${returnId}/approve`);

export const rejectReturn = (returnId: number) =>
  apiClient.put(`${ADMIN_BASE}/returns/${returnId}/reject`);

/**
 * The two steps between approving a return and refunding it. The endpoints
 * have always existed; the screen never called them, so an approved return
 * could not reach INSPECTED and approveRefund refused every time.
 */
export const markPickedUp = (returnId: number) =>
  apiClient.put(`${ADMIN_BASE}/returns/${returnId}/picked-up`);

export const markInspected = (returnId: number, pass: boolean, comment?: string) =>
  apiClient.put(`${ADMIN_BASE}/returns/${returnId}/inspect`, null, {
    params: { pass, ...(comment ? { comment } : {}) },
  });

export const approveRefund = (returnId: number) =>
  apiClient.put(`${ADMIN_BASE}/returns/${returnId}/refund/approve`);

export const rejectRefund = (returnId: number) =>
  apiClient.put(`${ADMIN_BASE}/returns/${returnId}/refund/reject`);

export const completeRefund = (returnId: number) =>
  apiClient.put(`${ADMIN_BASE}/returns/${returnId}/refund/completed`);
