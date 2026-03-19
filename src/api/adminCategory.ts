const BASE_URL = "http://localhost:8081/api/admin/categories";

export interface Category {
  categoryId?: number;
  name: string;
  description?: string;
}

export const getCategories = async () => {
  const response = await fetch(BASE_URL);
  if (!response.ok) throw new Error(`Failed to fetch categories: ${response.status}`);
  return { data: await response.json() };
};

export const getCategoryById = async (categoryId: number) => {
  const response = await fetch(`${BASE_URL}/${categoryId}`);
  if (!response.ok) throw new Error(`Failed to fetch category: ${response.status}`);
  return { data: await response.json() };
};

export const addCategory = async (data: { name: string; description?: string }) => {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to create category: ${response.status}`);
  return { data: await response.json() };
};

export const updateCategory = async (categoryId: number, data: { name: string; description?: string }) => {
  const response = await fetch(`${BASE_URL}/${categoryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to update category: ${response.status}`);
  return { data: await response.json() };
};

export const deleteCategory = async (categoryId: number) => {
  const response = await fetch(`${BASE_URL}/${categoryId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`Failed to delete category: ${response.status}`);
  return true;
};