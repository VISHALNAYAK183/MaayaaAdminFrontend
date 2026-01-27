import axios from "axios";
import { HomeSection, HomeSectionItem } from "../types/homeCms";

const BASE = "http://localhost:8080/api/admin/home-cms";

// sections
export const getSections = () =>
  axios.get<HomeSection[]>(`${BASE}/section`);

export const createSection = (data: Partial<HomeSection>) =>
  axios.post(`${BASE}/section`, data);

export const updateSection = (id: number, data: Partial<HomeSection>) =>
  axios.put(`${BASE}/section/${id}`, data);

export const deleteSection = (id: number) =>
  axios.delete(`${BASE}/section/${id}`);

// items
export const getItems = (sectionId: number) =>
  axios.get<HomeSectionItem[]>(`${BASE}/section/${sectionId}/item`);

export const createItem = (
  sectionId: number,
  data: Partial<HomeSectionItem>
) =>
  axios.post(`${BASE}/section/${sectionId}/item`, data);

export const updateItem = (
  itemId: number,
  data: Partial<HomeSectionItem>
) =>
  axios.put(`${BASE}/item/${itemId}`, data);

export const deleteItem = (itemId: number) =>
  axios.delete(`${BASE}/item/${itemId}`);