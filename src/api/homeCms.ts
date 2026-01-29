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

/* ================================
   API METHODS
================================ */

export const getAllSections = () => {
  return axios.get<HomeSection[]>(
    `${ADMIN_BASE}/home-cms/section`
  );
};

export const getSectionById = (id: number) => {
  return axios.get<HomeSection>(
    `${ADMIN_BASE}/home-cms/section/${id}`
  );
};

export const addHomeSection = (data: AddSectionPayload) => {
  return axios.post(
    `${ADMIN_BASE}/home-cms/section`,
    data
  );
};

export const updateHomeSection = (
  id: number,
  data: AddSectionPayload
) => {
  return axios.put(
    `${ADMIN_BASE}/home-cms/section/${id}`,
    data
  );
};

export const deleteHomeSection = (id: number) => {
  return axios.delete(
    `${ADMIN_BASE}/home-cms/section/${id}`
  );
};

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

export const getSectionItems = (sectionId: number) => {
  return axios.get<SectionItem[]>(
    `${ADMIN_BASE}/home-cms/section/${sectionId}/item`
  );
};