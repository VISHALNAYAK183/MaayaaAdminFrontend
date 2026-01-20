import axios from "axios";
import { ApiResponse } from "../types/api";

export interface AddCouponPayload {
  code: string;
  discountType: "P" | "F";
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  validFrom: string;
  validTill: string;
}

export const ADMIN_BASE = "http://localhost:8081/api/admin";

export const addCoupon = (data: AddCouponPayload) => {
  return axios.post<ApiResponse<null>>(
    `${ADMIN_BASE}/coupons`,
    data
  );
};
