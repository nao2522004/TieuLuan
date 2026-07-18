import { apiClient } from "@/lib/api-client";
import type { ApiSuccessResponse } from "@/types/api";
import type {
  ExpiryDiscountRule,
  CreateExpiryDiscountRulePayload,
  UpdateExpiryDiscountRulePayload,
} from "../types";

export const expiryPricingApi = {
  getRules: async (): Promise<ExpiryDiscountRule[]> => {
    const res = await apiClient.get<ApiSuccessResponse<ExpiryDiscountRule[]>>(
      "/expiry-discount-rules",
    );
    return (res as unknown as ApiSuccessResponse<ExpiryDiscountRule[]>).data;
  },

  createRule: async (
    payload: CreateExpiryDiscountRulePayload,
  ): Promise<ExpiryDiscountRule> => {
    const res = await apiClient.post<ApiSuccessResponse<ExpiryDiscountRule>>(
      "/expiry-discount-rules",
      payload,
    );
    return (res as unknown as ApiSuccessResponse<ExpiryDiscountRule>).data;
  },

  updateRule: async (
    id: number,
    payload: UpdateExpiryDiscountRulePayload,
  ): Promise<ExpiryDiscountRule> => {
    const res = await apiClient.patch<ApiSuccessResponse<ExpiryDiscountRule>>(
      `/expiry-discount-rules/${id}`,
      payload,
    );
    return (res as unknown as ApiSuccessResponse<ExpiryDiscountRule>).data;
  },

  deleteRule: async (id: number): Promise<void> => {
    await apiClient.delete(`/expiry-discount-rules/${id}`);
  },
};
