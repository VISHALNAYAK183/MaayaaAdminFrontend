import { apiClient, ADMIN_BASE } from "./client";

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
  refundStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | null;
  refundMethod: string | null;
  refundTransactionId: string | null;
  refundedAt: string | null;
};

export const getAdminReturns = () =>
  apiClient.get<AdminReturn[]>(`${ADMIN_BASE}/returns`);

export const approveReturn = (returnId: number) =>
  apiClient.put(`${ADMIN_BASE}/returns/${returnId}/approve`);

export const rejectReturn = (returnId: number) =>
  apiClient.put(`${ADMIN_BASE}/returns/${returnId}/reject`);

export const approveRefund = (returnId: number) =>
  apiClient.put(`${ADMIN_BASE}/returns/${returnId}/refund/approve`);

export const rejectRefund = (returnId: number) =>
  apiClient.put(`${ADMIN_BASE}/returns/${returnId}/refund/reject`);

export const completeRefund = (returnId: number) =>
  apiClient.put(`${ADMIN_BASE}/returns/${returnId}/refund/completed`);
