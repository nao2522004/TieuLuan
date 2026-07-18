import { apiClient } from "@/lib/api-client";
import type { ApiSuccessResponse } from "@/types/api";
import type { Return, CreateReturnPayload } from "../types";

export interface GetReturnsParams {
  page?: number;
  limit?: number;
  order_id?: number;
  created_by?: number;
}

export const returnsApi = {
  createReturn: async (payload: CreateReturnPayload): Promise<Return> => {
    const res = await apiClient.post<ApiSuccessResponse<Return>>("/returns", payload);
    return (res as unknown as ApiSuccessResponse<Return>).data;
  },

  getReturns: async (params?: GetReturnsParams): Promise<ApiSuccessResponse<Return[]>> => {
    const res = await apiClient.get<ApiSuccessResponse<Return[]>>("/returns", { params });
    return res as unknown as ApiSuccessResponse<Return[]>;
  },
};
