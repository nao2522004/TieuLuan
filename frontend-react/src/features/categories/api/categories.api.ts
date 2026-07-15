import { apiClient } from "@/lib/api-client";
import type { ApiSuccessResponse } from "@/types/api";
import type { Category, CreateCategoryPayload, UpdateCategoryPayload } from "../types";

export interface GetCategoriesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const categoriesApi = {
  getCategories: async (params?: GetCategoriesParams): Promise<ApiSuccessResponse<Category[]>> => {
    const res = await apiClient.get<ApiSuccessResponse<Category[]>>("/categories", { params });
    return res as unknown as ApiSuccessResponse<Category[]>;
  },

  getCategoryById: async (id: number): Promise<Category> => {
    const res = await apiClient.get<ApiSuccessResponse<Category>>(`/categories/${id}`);
    return (res as unknown as ApiSuccessResponse<Category>).data;
  },

  createCategory: async (payload: CreateCategoryPayload): Promise<Category> => {
    const res = await apiClient.post<ApiSuccessResponse<Category>>("/categories", payload);
    return (res as unknown as ApiSuccessResponse<Category>).data;
  },

  updateCategory: async (id: number, payload: UpdateCategoryPayload): Promise<Category> => {
    const res = await apiClient.patch<ApiSuccessResponse<Category>>(`/categories/${id}`, payload);
    return (res as unknown as ApiSuccessResponse<Category>).data;
  },

  deleteCategory: async (id: number): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  },
};
