import { apiClient } from "@/lib/api-client";
import type { ApiSuccessResponse } from "@/types/api";
import type { Return, CreateReturnPayload } from "../types";

export const returnsApi = {
  createReturn: async (payload: CreateReturnPayload): Promise<Return> => {
    const res = await apiClient.post<ApiSuccessResponse<Return>>("/returns", payload);
    return (res as unknown as ApiSuccessResponse<Return>).data;
  },
};
