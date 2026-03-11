import axios from "axios";

const ADMIN_BASE = "http://localhost:8081/api/admin";

/* ================================
   INTERFACES
================================ */

export interface SectionItem {
  itemId: number;
  image: string;
  heading: string;
  subheading: string | null;
  ctaText: string | null;
  link: string;
  productId: number | null;
  categoryId: number | null;
  reviewId: number | null;
  position: number;
  isDeleted: boolean;
}

export interface HomeSection {
  sectionId: number;
  type: string;
  title: string;
  subtitle: string;
  position: number;
  status: string;
  gender: string;
  items: SectionItem[];
}

export interface AddSectionPayload {
  type: string;
  title: string;
  subtitle: string;
  position: number;
  gender: string;
}

export interface AddItemPayload {
  image: string | null;
  heading: string | null;
  subheading: string | null;
  ctaText: string | null;
  link: string | null;
  productId: string | number | null;
  categoryId: string | number | null;
  reviewId: string | number | null;
  position: string | number;
}

/* ================================
   SECTION API METHODS
================================ */

export const getAllSections = () =>
  axios.get<HomeSection[]>(`${ADMIN_BASE}/home-cms/section`);

export const getSectionById = (id: number) =>
  axios.get<HomeSection>(`${ADMIN_BASE}/home-cms/section/${id}`);

export const addHomeSection = (data: AddSectionPayload) =>
  axios.post(`${ADMIN_BASE}/home-cms/section`, data);

export const updateHomeSection = (id: number, data: AddSectionPayload) =>
  axios.put(`${ADMIN_BASE}/home-cms/section/${id}`, data);

export const deleteHomeSection = (id: number) =>
  axios.delete(`${ADMIN_BASE}/home-cms/section/${id}`);

/* ================================
   ITEM API METHODS
================================ */

export const getSectionItems = (sectionId: number) =>
  axios.get<SectionItem[]>(`${ADMIN_BASE}/home-cms/section/${sectionId}/item`);

export const addSectionItem = (sectionId: number, data: AddItemPayload) =>
  axios.post(`${ADMIN_BASE}/home-cms/section/${sectionId}/item`, data);

export const updateSectionItem = (itemId: number, data: AddItemPayload) =>
  axios.put(`${ADMIN_BASE}/home-cms/item/${itemId}`, data);

export const deleteSectionItem = (itemId: number) =>
  axios.delete(`${ADMIN_BASE}/home-cms/item/${itemId}`);