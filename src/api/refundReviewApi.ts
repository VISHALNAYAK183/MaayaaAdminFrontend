import { ADMIN_BASE, apiClient } from "./client";

export type RefundKind = "CANCELLATION" | "RETURN";

export interface RefundQueueItem {
  kind: RefundKind;
  orderId: number | null;
  returnId: number | null;
  customer: string | null;
  amount: number;
  since: string | null;
  orderStatus: string | null;
}

export interface ReviewItemLine {
  orderItemId: number;
  product: string | null;
  size: string | null;
  colour: string | null;
  /** Today's MRP: the order does not keep the one it was bought at. */
  mrp: number | null;
  sellingPrice: number | null;
  quantity: number;
  /** KEPT, CANCELLED, RETURNED or RETURNED_REFUNDED. */
  status: string;
  beingRefunded: boolean;
}

export interface RefundCheck {
  label: string;
  ok: boolean;
  /** false: a warning to read, not a reason to refuse. */
  blocking: boolean;
  detail: string | null;
}

export interface RefundReview {
  kind: RefundKind;
  orderId: number;
  returnId: number | null;
  customer: string | null;
  email: string | null;
  phone: string | null;
  orderStatus: string | null;
  orderDate: string | null;
  items: ReviewItemLine[];
  pricing: {
    itemsTotal: number;
    couponCode: string | null;
    couponDiscount: number;
    codFee: number;
    orderTotalNow: number;
    paidAtCheckout: number;
  };
  paid: {
    method: string | null;
    total: number;
    byCard: number;
    byCredit: number;
    inCash: number;
    razorpayPaymentId: string | null;
    razorpayKnown: boolean;
    razorpayCaptured: number;
    razorpayRefunded: number;
    razorpayNote: string | null;
  };
  refundsSoFar: { refundId: number; at: string | null; amount: number; method: string | null; status: string | null; returnId: number | null }[];
  refundedSoFar: number;
  waitingElsewhere: number;
  thisRefund: { kind: RefundKind; total: number; toCredit: number; toCard: number; toBank: number; notes: string[] };
  leftAfter: number;
  checks: RefundCheck[];
  approvable: boolean;
}

const base = `${ADMIN_BASE}/refunds/review`;

export const getRefundQueue = () => apiClient.get<RefundQueueItem[]>(base);

export const getCancellationReview = (orderId: number) => apiClient.get<RefundReview>(`${base}/orders/${orderId}`);

export const getReturnReview = (returnId: number) => apiClient.get<RefundReview>(`${base}/returns/${returnId}`);

export const approveCancellationRefund = (orderId: number) => apiClient.post(`${base}/orders/${orderId}/approve`);

export const declineCancellationRefund = (orderId: number, reason: string) =>
  apiClient.post(`${base}/orders/${orderId}/decline`, { reason });
