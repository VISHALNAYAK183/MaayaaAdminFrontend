import { ADMIN_BASE, http } from "./client";

const URL = `${ADMIN_BASE}/collections`;

export interface Collection {
  collectionId?: number;
  name: string;
  description?: string;
}

export const getCollections = async () => ({
  data: await http.get<Collection[]>(URL, "fetch collections"),
});

export const addCollection = async (body: { name: string; description?: string }) => ({
  data: await http.post<Collection>(URL, body, "create collection"),
});

export const updateCollection = async (
  id: number,
  body: { name: string; description?: string }
) => ({
  data: await http.put<Collection>(`${URL}/${id}`, body, "update collection"),
});

export const deleteCollection = (id: number) =>
  http.del(`${URL}/${id}`, "delete collection");
