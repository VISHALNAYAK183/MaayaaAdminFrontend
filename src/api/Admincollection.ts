const BASE_URL = "http://localhost:8081/api/admin/collections";

export interface Collection {
  collectionId?: number;
  name: string;
  description?: string;
}

export const getCollections = async () => {
  const response = await fetch(BASE_URL);
  if (!response.ok) throw new Error(`Failed to fetch collections: ${response.status}`);
  return { data: await response.json() };
};

export const getCollectionById = async (collectionId: number) => {
  const response = await fetch(`${BASE_URL}/${collectionId}`);
  if (!response.ok) throw new Error(`Failed to fetch collection: ${response.status}`);
  return { data: await response.json() };
};

export const addCollection = async (data: { name: string; description?: string }) => {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to create collection: ${response.status}`);
  return { data: await response.json() };
};

export const updateCollection = async (collectionId: number, data: { name: string; description?: string }) => {
  const response = await fetch(`${BASE_URL}/${collectionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to update collection: ${response.status}`);
  return { data: await response.json() };
};

export const deleteCollection = async (collectionId: number) => {
  const response = await fetch(`${BASE_URL}/${collectionId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`Failed to delete collection: ${response.status}`);
  return true;
};