import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesApi, type GetCategoriesParams } from "./categories.api";
import type { CreateCategoryPayload, UpdateCategoryPayload } from "../types";
import { notify } from "@/lib/notify";

export function useCategoriesQuery(params?: GetCategoriesParams) {
  return useQuery({
    queryKey: ["categories", params],
    queryFn: () => categoriesApi.getCategories(params),
  });
}

export function useCategoryDetailQuery(id?: number) {
  return useQuery({
    queryKey: ["categories", "detail", id],
    queryFn: () => categoriesApi.getCategoryById(id!),
    enabled: !!id,
  });
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) => categoriesApi.createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      notify.success("Tạo danh mục thành công!");
    },
  });
}

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCategoryPayload }) =>
      categoriesApi.updateCategory(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories", "detail", data.id] });
      notify.success("Cập nhật danh mục thành công!");
    },
  });
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => categoriesApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      notify.success("Xóa danh mục thành công!");
    },
  });
}
