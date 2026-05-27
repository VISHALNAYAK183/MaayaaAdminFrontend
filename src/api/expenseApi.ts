import { apiClient, ADMIN_BASE } from "./client";

export type ExpenseCategory = "MARKETING" | "GATEWAY_FEE" | "OTHER";

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
