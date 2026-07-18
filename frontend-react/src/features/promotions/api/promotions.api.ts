import { apiClient } from "@/lib/api-client";
import type { ApiSuccessResponse } from "@/types/api";
import type {
  Promotion,
  CreatePromotionPayload,
  UpdatePromotionPayload,
} from "../types";

export interface GetPromotionsParams {
  page?: number;
  limit?: number;
  is_active?: boolean;
}

export const promotionsApi = {
  getPromotions: async (
    params?: GetPromotionsParams,
  ): Promise<ApiSuccessResponse<Promotion[]>> => {
    const res = await apiClient.get<ApiSuccessResponse<Promotion[]>>(
      "/promotions",
      { params },
    );
    return res as unknown as ApiSuccessResponse<Promotion[]>;
  },

  getPromotionById: async (id: number): Promise<Promotion> => {
    const res = await apiClient.get<ApiSuccessResponse<Promotion>>(
      `/promotions/${id}`,
    );
    return (res as unknown as ApiSuccessResponse<Promotion>).data;
  },

  createPromotion: async (
    payload: CreatePromotionPayload,
  ): Promise<Promotion> => {
    const res = await apiClient.post<ApiSuccessResponse<Promotion>>(
      "/promotions",
      payload,
    );
    return (res as unknown as ApiSuccessResponse<Promotion>).data;
  },

  updatePromotion: async (
    id: number,
    payload: UpdatePromotionPayload,
  ): Promise<Promotion> => {
    const res = await apiClient.patch<ApiSuccessResponse<Promotion>>(
      `/promotions/${id}`,
      payload,
    );
    return (res as unknown as ApiSuccessResponse<Promotion>).data;
  },

  deletePromotion: async (id: number): Promise<void> => {
    await apiClient.delete(`/promotions/${id}`);
  },
};
