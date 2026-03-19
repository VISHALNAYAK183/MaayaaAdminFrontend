const BASE_URL = "http://localhost:8081/api/sizes";

export interface Size {
  sizeId?: number;
  label: string;
}

export const getSizes = async () => {
  const response = await fetch(BASE_URL);
  if (!response.ok) throw new Error(`Failed to fetch sizes: ${response.status}`);
  return { data: await response.json() };
};

export const getSizeById = async (sizeId: number) => {
  const response = await fetch(`${BASE_URL}/${sizeId}`);
  if (!response.ok) throw new Error(`Failed to fetch size: ${response.status}`);
  return { data: await response.json() };
};

export const addSize = async (data: { label: string }) => {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to create size: ${response.status}`);
  return { data: await response.json() };
};

export const updateSize = async (sizeId: number, data: { label: string }) => {
  const response = await fetch(`${BASE_URL}/${sizeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to update size: ${response.status}`);
  return { data: await response.json() };
};

export const deleteSize = async (sizeId: number) => {
  const response = await fetch(`${BASE_URL}/${sizeId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`Failed to delete size: ${response.status}`);
  return true;
};