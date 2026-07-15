import { apiClient } from "@/lib/api-client";
import type { ApiSuccessResponse } from "@/types/api";
import type { Branch, CreateBranchPayload, UpdateBranchPayload } from "../types";

export interface GetBranchesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const branchesApi = {
  getBranches: async (params?: GetBranchesParams): Promise<ApiSuccessResponse<Branch[]>> => {
    const res = await apiClient.get<ApiSuccessResponse<Branch[]>>("/branches", { params });
    return res as unknown as ApiSuccessResponse<Branch[]>;
  },

  getBranchById: async (id: number): Promise<Branch> => {
    const res = await apiClient.get<ApiSuccessResponse<Branch>>(`/branches/${id}`);
    return (res as unknown as ApiSuccessResponse<Branch>).data;
  },

  createBranch: async (payload: CreateBranchPayload): Promise<Branch> => {
    const res = await apiClient.post<ApiSuccessResponse<Branch>>("/branches", payload);
    return (res as unknown as ApiSuccessResponse<Branch>).data;
  },

  updateBranch: async (id: number, payload: UpdateBranchPayload): Promise<Branch> => {
    const res = await apiClient.patch<ApiSuccessResponse<Branch>>(`/branches/${id}`, payload);
    return (res as unknown as ApiSuccessResponse<Branch>).data;
  },

  deleteBranch: async (id: number): Promise<void> => {
    await apiClient.delete(`/branches/${id}`);
  },
};
