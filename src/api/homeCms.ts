import axios from "axios";

const ADMIN_BASE = "http://localhost:8081/api/admin";

export interface AddSectionPayload {
  type: string;
  title: string;
  subtitle: string;
  position: number;
  gender: string;
}

export const addHomeSection = (data: AddSectionPayload) => {
  return axios.post(`${ADMIN_BASE}/home-cms/section`, data);
};