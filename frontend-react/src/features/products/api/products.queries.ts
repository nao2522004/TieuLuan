import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsApi, type GetProductsParams } from "./products.api";
import type { CreateProductPayload, UpdateProductPayload } from "../types";
import { notify } from "@/lib/notify";

export function useProductsQuery(params?: GetProductsParams) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => productsApi.getProducts(params),
  });
}

export function useProductDetailQuery(id?: number) {
  return useQuery({
    queryKey: ["products", "detail", id],
    queryFn: () => productsApi.getProductById(id!),
    enabled: !!id,
  });
}

export function useProductBarcodeQuery(code: string, branchId?: number, enabled = false) {
  return useQuery({
    queryKey: ["products", "barcode", code, branchId],
    queryFn: () => productsApi.getProductByBarcode(code, branchId),
    enabled: enabled && !!code,
    retry: false,
  });
}

export function useProductAlertsQuery(branchId?: number) {
  return useQuery({
    queryKey: ["products", "alerts", branchId],
    queryFn: () => productsApi.getProductAlerts(branchId),
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => productsApi.createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", "alerts"] });
      notify.success("Tạo sản phẩm thành công!");
    },
  });
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateProductPayload }) =>
      productsApi.updateProduct(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", "alerts"] });
      queryClient.invalidateQueries({ queryKey: ["products", "detail", data.id] });
      notify.success("Cập nhật sản phẩm thành công!");
    },
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productsApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", "alerts"] });
      notify.success("Xóa sản phẩm thành công!");
    },
  });
}
