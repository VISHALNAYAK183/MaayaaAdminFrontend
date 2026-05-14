import { ADMIN_BASE, http } from "./client";

const URL = `${ADMIN_BASE}/categories`;

export interface Category {
  categoryId?: number;
  name: string;
  description?: string;
}

export const getCategories = async () => ({
  data: await http.get<Category[]>(URL, "fetch categories"),
});

export const addCategory = async (body: { name: string; description?: string }) => ({
  data: await http.post<Category>(URL, body, "create category"),
});

export const updateCategory = async (
  id: number,
  body: { name: string; description?: string }
) => ({
  data: await http.put<Category>(`${URL}/${id}`, body, "update category"),
});

export const deleteCategory = (id: number) =>
  http.del(`${URL}/${id}`, "delete category");
