import { ADMIN_BASE, apiClient } from "./client";

/** A Razorpay payment captured with no order behind it. */
export interface UnmatchedPayment {
  attemptId: number;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
  amount: number | null;
  capturedAt: string | null;
  userId: number | null;
  customer: string | null;
  email: string | null;
  phone: string | null;
  /** The notes attached at checkout: userId, couponCode, items as variant:qty. */
  notes: string | null;
  /** Set when the payment has since landed on an order. */
  matchedOrderId: number | null;
}

export interface UnmatchedPaymentReview {
  payment: UnmatchedPayment;
  razorpayKnown: boolean;
  razorpayCaptured: number;
  razorpayRefunded: number;
  refundable: number;
  razorpayNote: string | null;
}

const base = `${ADMIN_BASE}/refunds/unmatched-payments`;

export const getUnmatchedPayments = () => apiClient.get<UnmatchedPayment[]>(base);

export const getUnmatchedPaymentReview = (attemptId: number) =>
  apiClient.get<UnmatchedPaymentReview>(`${base}/${attemptId}`);

export const refundUnmatchedPayment = (attemptId: number) => apiClient.post(`${base}/${attemptId}/refund`);

export const resolveUnmatchedPayment = (attemptId: number, note: string) =>
  apiClient.post(`${base}/${attemptId}/resolve`, { note });
