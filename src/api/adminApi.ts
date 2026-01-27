import axios from "axios";
import { AdminOrder } from "../types/order";

export const ADMIN_BASE = "http://localhost:8081/api/admin";
export const CLIENT_BASE = "http://localhost:8080/api";


export const getOrders = (status?: string) => {
  return axios.get<AdminOrder[]>(`${ADMIN_BASE}/orders`, {
    params: status ? { status } : {},
  });
};


export const getOrderDetails = (orderId: number) => {
  return axios.get(`${CLIENT_BASE}/orders/details/${orderId}`);
};


export const shipOrder = (
  orderId: number,
  data: {
    carrier: string;
    trackingNumber: string;
    trackingUrl?: string;
    estimatedDeliveryDate: string;
  }
) => {
  return axios.post(`${ADMIN_BASE}/orders/${orderId}/ship`, data);
};


export const updateOrderStatus = (
  orderId: number,
  data: {
    status: string;
    description?: string;
    location?: string;
  }
) => {
  return axios.put(`${ADMIN_BASE}/orders/${orderId}/status`, data);
};

export const approveOrder = (orderId: number) => {
  return axios.put(`${ADMIN_BASE}/orders/${orderId}/approve`);
};

export const rejectOrder = (orderId: number) => {
  return axios.put(`${ADMIN_BASE}/orders/${orderId}/reject`);
};