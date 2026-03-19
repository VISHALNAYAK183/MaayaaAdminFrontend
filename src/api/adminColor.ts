const BASE_URL = "http://localhost:8081/api/colors";

export interface Color {
  colorId?: number;
  name: string;
  hex: string;
}

export const getColors = async () => {
  const response = await fetch(BASE_URL);
  if (!response.ok) throw new Error(`Failed to fetch colors: ${response.status}`);
  return { data: await response.json() };
};

export const getColorById = async (colorId: number) => {
  const response = await fetch(`${BASE_URL}/${colorId}`);
  if (!response.ok) throw new Error(`Failed to fetch color: ${response.status}`);
  return { data: await response.json() };
};

export const addColor = async (data: { name: string; hex: string }) => {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to create color: ${response.status}`);
  return { data: await response.json() };
};

export const updateColor = async (colorId: number, data: { name: string; hex: string }) => {
  const response = await fetch(`${BASE_URL}/${colorId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to update color: ${response.status}`);
  return { data: await response.json() };
};

export const deleteColor = async (colorId: number) => {
  const response = await fetch(`${BASE_URL}/${colorId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`Failed to delete color: ${response.status}`);
  return true;
};