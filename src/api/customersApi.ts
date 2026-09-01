import { apiClient, ADMIN_BASE, type PageResp } from "./client";
export type { PageResp };

const BASE = `${ADMIN_BASE}/customers`;

/**
 * Storefront customers.
 *
 * Not to be confused with adminUsers.ts, which manages the people who run this
 * panel. The flat customer list in adminCoupon.ts (GET /admin/users) is a
 * different endpoint again — it feeds the coupon picker and stays as it is.
 */

export interface CustomerListItem {
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  lastLogin: string | null;
  createdAt: string | null;
  disabled: boolean;

  addressCount: number;
  orderCount: number;
  cancelledCount: number;
  lifetimeValue: number;
  cartCount: number;
  wishlistCount: number;
  activeCouponCount: number;
}

export interface CustomerAddress {
  addressId: number;
  name: string | null;
  phone: string | null;
  address1: string | null;
  address2: string | null;
  landmark: string | null;
  city: string | null;
  state: string | null;
  pinCode: string | null;
  type: string | null;
  default: boolean;
}

export interface CustomerOrder {
  orderId: number;
  orderDate: string | null;
  orderStatus: string | null;
  amount: number | null;
  couponCode: string | null;
}

export interface CustomerCoupon {
  couponUserId: number;
  couponId: number | null;
  code: string | null;
  discountType: string | null;
  value: number | null;
  maxUsage: number | null;
  usedCount: number | null;
  validFrom: string | null;
  validTill: string | null;
  assignedAt: string | null;
  active: boolean;
}

export interface CustomerRedemption {
  usedCouponId: number;
  code: string | null;
  orderId: number | null;
  usedAt: string | null;
}

export interface BasketLine {
  productId: number | null;
  variantId: number | null;
  productName: string;
  price: number | null;
  quantity: number | null;
  addedAt: string | null;
}

export interface CustomerDetail {
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  createdAt: string | null;
  lastLogin: string | null;
  disabled: boolean;

  lifetimeValue: number;
  orderCount: number;
  cancelledCount: number;

  addresses: CustomerAddress[];
  orders: CustomerOrder[];
  assignedCoupons: CustomerCoupon[];
  redeemedCoupons: CustomerRedemption[];
  cart: BasketLine[];
  wishlist: BasketLine[];
}

export interface AssignableCoupon {
  couponId: number;
  code: string;
  discountType: string;
  value: number;
  validFrom: string | null;
  validTill: string | null;
}

export const listCustomers = (page = 0, size = 25, q?: string) =>
  apiClient.get<PageResp<CustomerListItem>>(BASE, {
    params: { page, size, ...(q ? { q } : {}) },
  });

export const getCustomer = (userId: number) =>
  apiClient.get<CustomerDetail>(`${BASE}/${userId}`);

export const setCustomerDisabled = (userId: number, disabled: boolean) =>
  apiClient.put<{ status: string; message: string }>(
    `${BASE}/${userId}/status`,
    { disabled }
  );

export const getAssignableCoupons = (userId: number) =>
  apiClient.get<AssignableCoupon[]>(`${BASE}/${userId}/assignable-coupons`);

export const assignCoupon = (userId: number, couponId: number, maxUsage: number) =>
  apiClient.post<{ status: string; message: string }>(
    `${BASE}/${userId}/coupons`,
    { couponId, maxUsage }
  );

/**
 * Emails the customer a reset code. There is no "read the password" call and
 * there never can be — the column holds a bcrypt hash.
 */
export const sendPasswordReset = (userId: number) =>
  apiClient.post<{ status: string; message: string }>(
    `${BASE}/${userId}/password-reset`,
    {}
  );
