import { PUBLIC_API_BASE, http } from "./client";

const URL = `${PUBLIC_API_BASE}/colors`;

export interface Color {
  colorId?: number;
  name: string;
  hex: string;
}

export const getColors = async () => ({
  data: await http.get<Color[]>(URL, "fetch colors"),
});

export const addColor = async (body: { name: string; hex: string }) => ({
  data: await http.post<Color>(URL, body, "create color"),
});

export const updateColor = async (id: number, body: { name: string; hex: string }) => ({
  data: await http.put<Color>(`${URL}/${id}`, body, "update color"),
});

export const deleteColor = (id: number) => http.del(`${URL}/${id}`, "delete color");
