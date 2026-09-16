import { ADMIN_BASE, apiClient, type PageResp } from "./client";

export type CouponState = "ACTIVE" | "SCHEDULED" | "EXPIRED" | "SWITCHED_OFF" | "DELETED";

/** EVERYONE: open to all customers. CHOSEN: only the customers assigned to it. */
export type CouponAudience = "EVERYONE" | "CHOSEN";

/** REMOVED: the coupon is for chosen customers, and this one no longer is. */
export type CouponAccess = "EVERYONE" | "ASSIGNED" | "REMOVED";

export type UsageFilter = "ALL" | "LEFT" | "USED_UP" | "NOT_USED";

export interface CouponUsageSummary {
  coupons: number;
  active: number;
  scheduled: number;
  expired: number;
  switchedOff: number;
  timesUsed: number;
  customers: number;
  discountGiven: number;
  /** Uses handed back because the order was cancelled or refunded in full. */
  usesGivenBack: number;
}

export interface CouponUsageRow {
  couponId: number;
  code: string;
  discountType: "P" | "F";
  value: number;
  maxDiscount: number | null;
  minPurchase: number | null;
  validFrom: string | null;
  validTill: string | null;
  state: CouponState;
  audience: CouponAudience;
  assignedCustomers: number;
  /** null for no limit, and also when chosen customers have different limits. */
  limitPerCustomer: number | null;
  limitVaries: boolean;
  timesUsed: number;
  customersUsed: number;
  customersUsedUp: number;
  discountGiven: number;
  lastUsedAt: string | null;
}

export interface CouponUsageOverview {
  summary: CouponUsageSummary;
  coupons: CouponUsageRow[];
}

export interface CustomerCouponRow {
  couponId: number;
  code: string;
  couponState: CouponState;
  userId: number;
  name: string;
  email: string | null;
  phone: string | null;
  access: CouponAccess;
  used: number;
  /** null when the customer has no limit. */
  limit: number | null;
  left: number | null;
  discountGiven: number;
  lastUsedAt: string | null;
  orderIds: number[];
}

export const getCouponUsage = () =>
  apiClient.get<CouponUsageOverview>(`${ADMIN_BASE}/coupons/usage`);

export const getCouponUsageCustomers = (params: {
  couponId?: number;
  q?: string;
  filter: UsageFilter;
  page: number;
  size: number;
}) =>
  apiClient.get<PageResp<CustomerCouponRow>>(`${ADMIN_BASE}/coupons/usage/customers`, { params });
