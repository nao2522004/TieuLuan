import { apiClient } from "@/lib/api-client";
import type { ApiSuccessResponse } from "@/types/api";
import type {
  Stocktake,
  StocktakeItem,
  CreateStocktakePayload,
  CreateStocktakeItemPayload,
  StocktakeStatus,
} from "../types";

export interface GetStocktakesParams {
  page?: number;
  limit?: number;
  branch_id?: number;
  status?: StocktakeStatus;
}

export const stocktakesApi = {
  createStocktake: async (
    payload: CreateStocktakePayload,
  ): Promise<Stocktake> => {
    const res = await apiClient.post<ApiSuccessResponse<Stocktake>>(
      "/stocktakes",
      payload,
    );
    return (res as unknown as ApiSuccessResponse<Stocktake>).data;
  },

  recordItem: async (
    stocktakeId: number,
    payload: CreateStocktakeItemPayload,
  ): Promise<StocktakeItem> => {
    const res = await apiClient.post<ApiSuccessResponse<StocktakeItem>>(
      `/stocktakes/${stocktakeId}/items`,
      payload,
    );
    return (res as unknown as ApiSuccessResponse<StocktakeItem>).data;
  },

  closeStocktake: async (id: number): Promise<Stocktake> => {
    const res = await apiClient.patch<ApiSuccessResponse<Stocktake>>(
      `/stocktakes/${id}/close`,
    );
    return (res as unknown as ApiSuccessResponse<Stocktake>).data;
  },

  getStocktakeById: async (id: number): Promise<Stocktake> => {
    const res = await apiClient.get<ApiSuccessResponse<Stocktake>>(
      `/stocktakes/${id}`,
    );
    return (res as unknown as ApiSuccessResponse<Stocktake>).data;
  },

  getStocktakes: async (
    params?: GetStocktakesParams,
  ): Promise<ApiSuccessResponse<Stocktake[]>> => {
    const res = await apiClient.get<ApiSuccessResponse<Stocktake[]>>(
      "/stocktakes",
      { params },
    );
    return res as unknown as ApiSuccessResponse<Stocktake[]>;
  },

  removeItem: async (stocktakeId: number, itemId: number): Promise<void> => {
    await apiClient.delete(`/stocktakes/${stocktakeId}/items/${itemId}`);
  },
};
