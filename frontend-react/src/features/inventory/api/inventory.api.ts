import { apiClient } from "@/lib/api-client";
import type { ApiSuccessResponse } from "@/types/api";
import type {
  InventoryTransaction,
  CreateInboundPayload,
  CreateAdjustmentPayload,
} from "../types";

export interface GetInventoryTransactionsParams {
  page?: number;
  limit?: number;
  product_id?: number;
  type?: "IN" | "OUT";
  source?: "ORDER" | "INBOUND" | "ADJUSTMENT" | "STOCKTAKE";
  start_date?: string;
  end_date?: string;
}

export const inventoryApi = {
  createInbound: async (
    payload: CreateInboundPayload,
  ): Promise<InventoryTransaction> => {
    const res = await apiClient.post<ApiSuccessResponse<InventoryTransaction>>(
      "/inventory/inbound",
      payload,
    );
    return (res as unknown as ApiSuccessResponse<InventoryTransaction>).data;
  },

  createAdjustment: async (
    payload: CreateAdjustmentPayload,
  ): Promise<InventoryTransaction> => {
    const res = await apiClient.post<ApiSuccessResponse<InventoryTransaction>>(
      "/inventory/adjustments",
      payload,
    );
    return (res as unknown as ApiSuccessResponse<InventoryTransaction>).data;
  },

  getTransactions: async (
    params?: GetInventoryTransactionsParams,
  ): Promise<ApiSuccessResponse<InventoryTransaction[]>> => {
    const res = await apiClient.get<ApiSuccessResponse<InventoryTransaction[]>>(
      "/inventory/transactions",
      { params },
    );
    return res as unknown as ApiSuccessResponse<InventoryTransaction[]>;
  },
};
