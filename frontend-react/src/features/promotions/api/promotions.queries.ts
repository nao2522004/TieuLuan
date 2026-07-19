import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  promotionsApi,
  type GetPromotionsParams,
  type ValidatePromotionResult,
} from "./promotions.api";
import type { CreatePromotionPayload, UpdatePromotionPayload } from "../types";

import { notify } from "@/lib/notify";

export function usePromotionsQuery(params?: GetPromotionsParams) {
  return useQuery({
    queryKey: ["promotions", params],
    queryFn: () => promotionsApi.getPromotions(params),
  });
}

export function usePromotionDetailQuery(id?: number) {
  return useQuery({
    queryKey: ["promotions", "detail", id],
    queryFn: () => promotionsApi.getPromotionById(id!),
    enabled: !!id,
  });
}

export function useCreatePromotionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePromotionPayload) =>
      promotionsApi.createPromotion(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      notify.success("Tạo chương trình khuyến mãi thành công!");
    },
  });
}

export function useUpdatePromotionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdatePromotionPayload;
    }) => promotionsApi.updatePromotion(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      queryClient.invalidateQueries({
        queryKey: ["promotions", "detail", data.id],
      });
      notify.success("Cập nhật chương trình khuyến mãi thành công!");
    },
  });
}

export function useDeletePromotionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => promotionsApi.deletePromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      notify.success("Xóa chương trình khuyến mãi thành công!");
    },
  });
}

export function useValidatePromotionMutation() {
  return useMutation<
    ValidatePromotionResult,
    unknown,
    { code: string; amount: number }
  >({
    mutationFn: ({ code, amount }) =>
      promotionsApi.validatePromotion(code, amount),
    onError: (err) => console.error("[validatePromotion] error:", err),
  });
}
