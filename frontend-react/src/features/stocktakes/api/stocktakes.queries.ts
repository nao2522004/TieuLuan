import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { stocktakesApi, type GetStocktakesParams } from "./stocktakes.api";
import type {
  CreateStocktakePayload,
  CreateStocktakeItemPayload,
} from "../types";
import { notify } from "@/lib/notify";

export function useStocktakesQuery(params?: GetStocktakesParams) {
  return useQuery({
    queryKey: ["stocktakes", params],
    queryFn: () => stocktakesApi.getStocktakes(params),
  });
}

export function useStocktakeDetailQuery(id?: number) {
  return useQuery({
    queryKey: ["stocktakes", "detail", id],
    queryFn: () => stocktakesApi.getStocktakeById(id!),
    enabled: !!id,
  });
}

export function useCreateStocktakeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStocktakePayload) =>
      stocktakesApi.createStocktake(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stocktakes"] });
      notify.success("Mở phiên kiểm kê thành công!");
    },
  });
}

export function useRecordStocktakeItemMutation(stocktakeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStocktakeItemPayload) =>
      stocktakesApi.recordItem(stocktakeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stocktakes", "detail", stocktakeId],
      });
    },
  });
}

export function useRecordStocktakeItemsBulkMutation(stocktakeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: CreateStocktakeItemPayload[]) =>
      stocktakesApi.recordItemsBulk(stocktakeId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stocktakes", "detail", stocktakeId],
      });
      notify.success("Lưu kết quả đếm kiểm kê thành công!");
    },
  });
}

export function useCloseStocktakeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stocktakesApi.closeStocktake(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["stocktakes"] });
      queryClient.invalidateQueries({
        queryKey: ["stocktakes", "detail", data.id],
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", "alerts"] });
      queryClient.invalidateQueries({
        queryKey: ["inventory", "transactions"],
      });
      notify.success("Đã chốt phiên kiểm kê, tồn kho đã được cập nhật!");
    },
  });
}

export function useRemoveStocktakeItemMutation(stocktakeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      stocktakesApi.removeItem(stocktakeId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stocktakes", "detail", stocktakeId],
      });
      notify.success("Đã xóa dòng đếm.");
    },
  });
}
