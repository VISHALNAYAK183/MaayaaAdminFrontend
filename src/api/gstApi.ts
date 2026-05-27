import { apiClient, ADMIN_BASE } from "./client";

export interface RateBucket {
  rate: number;
  taxableValue: number;
  gstAmount: number;
}

export interface OutwardSummary {
  totalTaxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalGstCollected: number;
  byRate: RateBucket[];
}

export interface InwardSummary {
  totalTaxableValue: number;
  itcCgst: number;
  itcSgst: number;
  itcIgst: number;
  totalItc: number;
}

export interface GstReport {
  period: string;
  windowFrom: string;
  windowTo: string;
  outward: OutwardSummary;
  inward: InwardSummary;
  netGstPayable: number;
}

const BASE = `${ADMIN_BASE}/analytics/gst`;

export const getGstReport = (month: string) =>
  apiClient.get<GstReport>(BASE, { params: { month } });

export const downloadGstr1Csv = (month: string) =>
  apiClient.get<Blob>(`${BASE}/gstr1`, {
    params: { month },
    responseType: "blob",
  });
