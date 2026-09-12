import { ADMIN_BASE, apiClient } from "./client";

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
  /**
   * ACTIVE | INACTIVE | DRAFT. Not optional, and not omitted: the backend
   * reads a missing status as 'Y', so a section saved without one goes live
   * on the storefront the moment it is created.
   */
  status: string;
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
  apiClient.get<HomeSection[]>(`${ADMIN_BASE}/home-cms/section`);

export const getSectionById = (id: number) =>
  apiClient.get<HomeSection>(`${ADMIN_BASE}/home-cms/section/${id}`);

export const addHomeSection = (data: AddSectionPayload) =>
  apiClient.post<HomeSection>(`${ADMIN_BASE}/home-cms/section`, data);

/**
 * Status is optional here and required on create, and the asymmetry is the
 * backend's: an update leaves the column untouched when the field is absent,
 * while a create reads its absence as "make it live".
 */
export type UpdateSectionPayload = Omit<AddSectionPayload, "status"> & {
  status?: string;
};

export const updateHomeSection = (id: number, data: UpdateSectionPayload) =>
  apiClient.put(`${ADMIN_BASE}/home-cms/section/${id}`, data);

export const deleteHomeSection = (id: number) =>
  apiClient.delete(`${ADMIN_BASE}/home-cms/section/${id}`);

/* ================================
   ITEM API METHODS
================================ */

export const getSectionItems = (sectionId: number) =>
  apiClient.get<SectionItem[]>(`${ADMIN_BASE}/home-cms/section/${sectionId}/item`);

export const addSectionItem = (sectionId: number, data: AddItemPayload) =>
  apiClient.post<SectionItem>(`${ADMIN_BASE}/home-cms/section/${sectionId}/item`, data);

export const updateSectionItem = (itemId: number, data: AddItemPayload) =>
  apiClient.put(`${ADMIN_BASE}/home-cms/item/${itemId}`, data);

export const deleteSectionItem = (itemId: number) =>
  apiClient.delete(`${ADMIN_BASE}/home-cms/item/${itemId}`);