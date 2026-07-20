import { apiClient } from "@/lib/api-client";
import type { ApiSuccessResponse } from "@/types/api";
import type {
  Product,
  ProductAlerts,
  ProductBatchDetail,
  CreateProductPayload,
  UpdateProductPayload,
  UpdateProductBatchPayload,
} from "../types";

export interface GetProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  branch_id?: number;
  category_id?: number;
}

export const productsApi = {
  getProducts: async (
    params?: GetProductsParams,
  ): Promise<ApiSuccessResponse<Product[]>> => {
    const res = await apiClient.get<ApiSuccessResponse<Product[]>>(
      "/products",
      { params },
    );
    return res as unknown as ApiSuccessResponse<Product[]>;
  },

  getProductById: async (id: number): Promise<Product> => {
    const res = await apiClient.get<ApiSuccessResponse<Product>>(
      `/products/${id}`,
    );
    return (res as unknown as ApiSuccessResponse<Product>).data;
  },

  getProductByBarcode: async (
    code: string,
    branchId?: number,
  ): Promise<Product> => {
    const res = await apiClient.get<ApiSuccessResponse<Product>>(
      `/products/barcode/${code}`,
      {
        params: { branch_id: branchId },
      },
    );
    return (res as unknown as ApiSuccessResponse<Product>).data;
  },

  getProductAlerts: async (branchId?: number): Promise<ProductAlerts> => {
    const res = await apiClient.get<ApiSuccessResponse<ProductAlerts>>(
      "/products/alerts",
      {
        params: { branch_id: branchId },
      },
    );
    return (res as unknown as ApiSuccessResponse<ProductAlerts>).data;
  },

  createProduct: async (payload: CreateProductPayload): Promise<Product> => {
    const res = await apiClient.post<ApiSuccessResponse<Product>>(
      "/products",
      payload,
    );
    return (res as unknown as ApiSuccessResponse<Product>).data;
  },

  updateProduct: async (
    id: number,
    payload: UpdateProductPayload,
  ): Promise<Product> => {
    const res = await apiClient.patch<ApiSuccessResponse<Product>>(
      `/products/${id}`,
      payload,
    );
    return (res as unknown as ApiSuccessResponse<Product>).data;
  },

  deleteProduct: async (id: number): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },

  getProductBatches: async (
    productId: number,
  ): Promise<ProductBatchDetail[]> => {
    const res = await apiClient.get<ApiSuccessResponse<ProductBatchDetail[]>>(
      `/products/${productId}/batches`,
    );
    return (res as unknown as ApiSuccessResponse<ProductBatchDetail[]>).data;
  },

  getProductQuote: async (productId: number, quantity: number) => {
    const res = await apiClient.get<
      ApiSuccessResponse<{
        unit_price: number;
        original_unit_price: number | null;
        discount_percent: number | null;
        line_total: number;
      }>
    >(`/products/${productId}/quote`, { params: { quantity } });
    return (res as unknown as ApiSuccessResponse<any>).data;
  },

  updateProductBatch: async (
    batchId: number,
    payload: UpdateProductBatchPayload,
  ): Promise<ProductBatchDetail> => {
    const res = await apiClient.patch<ApiSuccessResponse<ProductBatchDetail>>(
      `/product-batches/${batchId}`,
      payload,
    );
    return (res as unknown as ApiSuccessResponse<ProductBatchDetail>).data;
  },
};
