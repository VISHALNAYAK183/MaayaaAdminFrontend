export interface Coupon {
  id: number;
  code: string;
  discountType: "P" | "F";
  value: number;
  minPurchase: number;
  maxDiscount: number;
  usageLimit: number;
  validFrom: string;
  validTill: string;
  status: "Y" | "N";
}
