import { apiClient } from "@/lib/api-client";
import type { ApiSuccessResponse } from "@/types/api";
import type { Order, CreateOrderPayload } from "../types";

export interface GetOrdersParams {
  page?: number;
  limit?: number;
  branch_id?: number;
  status?: "completed" | "cancelled";
  payment_status?: "paid" | "pending";
  from_date?: string;
  to_date?: string;
  created_by?: number;
}

export const ordersApi = {
  createOrder: async (payload: CreateOrderPayload): Promise<Order> => {
    const res = await apiClient.post<ApiSuccessResponse<Order>>("/orders", payload);
    return (res as unknown as ApiSuccessResponse<Order>).data;
  },

  getOrders: async (params?: GetOrdersParams): Promise<ApiSuccessResponse<Order[]>> => {
    const res = await apiClient.get<ApiSuccessResponse<Order[]>>("/orders", { params });
    return res as unknown as ApiSuccessResponse<Order[]>;
  },

  getOrderById: async (id: number): Promise<Order> => {
    const res = await apiClient.get<ApiSuccessResponse<Order>>(`/orders/${id}`);
    return (res as unknown as ApiSuccessResponse<Order>).data;
  },

  confirmPayment: async (id: number): Promise<Order> => {
    const res = await apiClient.patch<ApiSuccessResponse<Order>>(`/orders/${id}/confirm-payment`);
    return (res as unknown as ApiSuccessResponse<Order>).data;
  },

  cancelOrder: async (id: number): Promise<Order> => {
    const res = await apiClient.patch<ApiSuccessResponse<Order>>(`/orders/${id}/cancel`);
    return (res as unknown as ApiSuccessResponse<Order>).data;
  },
};
