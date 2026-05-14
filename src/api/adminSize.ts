import { PUBLIC_API_BASE, http } from "./client";

const URL = `${PUBLIC_API_BASE}/sizes`;

export interface Size {
  sizeId?: number;
  label: string;
}

export const getSizes = async () => ({
  data: await http.get<Size[]>(URL, "fetch sizes"),
});

export const addSize = async (body: { label: string }) => ({
  data: await http.post<Size>(URL, body, "create size"),
});

export const updateSize = async (id: number, body: { label: string }) => ({
  data: await http.put<Size>(`${URL}/${id}`, body, "update size"),
});

export const deleteSize = (id: number) => http.del(`${URL}/${id}`, "delete size");
