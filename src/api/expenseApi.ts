import { apiClient, ADMIN_BASE } from "./client";

export type ExpenseCategory =
  // Operating — subtracted from gross profit
  | "MARKETING"
  | "ADS"
  | "GATEWAY_FEE"
  | "TRAVEL"
  | "OFFICE"
  | "SALARY"
  | "OTHER"
  // COGS-linked — recorded only for ITC; per-unit cost is in ProductCost
  | "RAW_MATERIAL"
  | "PACKAGING"
  | "COURIER";

export const OPERATING_CATEGORIES: ExpenseCategory[] = [
  "MARKETING",
  "ADS",
  "GATEWAY_FEE",
  "TRAVEL",
  "OFFICE",
  "SALARY",
  "OTHER",
];

export const COGS_LINKED_CATEGORIES: ExpenseCategory[] = [
  "RAW_MATERIAL",
  "PACKAGING",
  "COURIER",
];

export const isOperatingCategory = (c: ExpenseCategory): boolean =>
  OPERATING_CATEGORIES.includes(c);

export interface Expense {
  expenseId: number;
  category: ExpenseCategory;
  description: string | null;
  vendorName: string | null;
  vendorGstin: string | null;
  vendorState: string | null;
  invoiceNumber: string | null;
  taxableValue: number | null;
  gstRate: number | null;
  cgst: number | null;
  sgst: number | null;
  igst: number | null;
  amount: number;
  itcEligible: boolean;
  incurredAt: string; // ISO timestamp
}

export interface PageResp<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ExpenseRequest {
  category: ExpenseCategory;
  description?: string | null;
  vendorName?: string | null;
  vendorGstin?: string | null;
  invoiceNumber?: string | null;
  taxableValue?: number | null;
  gstRate?: number | null;
  amount: number;
  incurredAt: string; // ISO
}

const BASE = `${ADMIN_BASE}/expenses`;

export const listExpenses = (
  page = 0,
  size = 20,
  category?: ExpenseCategory,
) =>
  apiClient.get<PageResp<Expense>>(BASE, {
    params: { page, size, ...(category ? { category } : {}) },
  });

export const getExpense = (id: number) =>
  apiClient.get<Expense>(`${BASE}/${id}`);

export const createExpense = (body: ExpenseRequest) =>
  apiClient.post<Expense>(BASE, body);

export const updateExpense = (id: number, body: ExpenseRequest) =>
  apiClient.put<Expense>(`${BASE}/${id}`, body);

export const deleteExpense = (id: number) =>
  apiClient.delete<{ message: string }>(`${BASE}/${id}`);

export const listExpenseCategories = () =>
  apiClient.get<ExpenseCategory[]>(`${BASE}/categories`);
