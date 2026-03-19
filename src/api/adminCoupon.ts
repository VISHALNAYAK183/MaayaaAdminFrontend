import axios from "axios";
import { ApiResponse } from "../types/api";

export interface Coupon {
  couponId?: number;
  code: string;
  discountType: "P" | "F";
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  validFrom: string;
  validTill: string;
  userIds?: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  userId: number;
  name: string;
  email: string;
  phone: string;
}

export const ADMIN_BASE = "http://localhost:8081/api/admin";

// Get all coupons
export const getCoupons = () => {
  return axios.get<Coupon[]>(`${ADMIN_BASE}/coupons`);
};

// Get single coupon by ID
export const getCoupon = (id: number) => {
  return axios.get<Coupon>(`${ADMIN_BASE}/coupons/${id}`);
};

// Create new coupon
export const addCoupon = (data: Coupon) => {
  return axios.post<ApiResponse<Coupon>>(`${ADMIN_BASE}/coupons`, data);
};

// Update coupon
export const updateCoupon = (id: number, data: Coupon) => {
  return axios.put<ApiResponse<Coupon>>(`${ADMIN_BASE}/coupons/${id}`, data);
};

// Delete coupon
export const deleteCoupon = (id: number) => {
  return axios.delete<ApiResponse<null>>(`${ADMIN_BASE}/coupons/${id}`);
};

// Remove a specific user from a coupon
// PUT /api/admin/coupons/{couponId}/users/{userId}/remove
export const removeUserFromCoupon = (couponId: number, userId: number) => {
  return axios.put<ApiResponse<null>>(
    `${ADMIN_BASE}/coupons/${couponId}/users/${userId}/remove`
  );
};

// Get all users
export const getUsers = () => {
  return axios.get<User[]>(`${ADMIN_BASE}/users`);
};
