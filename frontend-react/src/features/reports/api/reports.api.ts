import { apiClient } from "@/lib/api-client";
import type { ApiSuccessResponse } from "@/types/api";

export interface RevenueReport {
  from_date: string;
  to_date: string;
  branch_id: number | null;
  total_orders: number;
  gross_revenue: number;
  total_refund: number;
  net_revenue: number;
}

export interface GetRevenueParams {
  from_date?: string;
  to_date?: string;
  branch_id?: number;
}

export const reportsApi = {
  getRevenue: async (params?: GetRevenueParams): Promise<RevenueReport> => {
    const res = await apiClient.get<ApiSuccessResponse<RevenueReport>>("/reports/revenue", { params });
    return (res as unknown as ApiSuccessResponse<RevenueReport>).data;
  },
};
