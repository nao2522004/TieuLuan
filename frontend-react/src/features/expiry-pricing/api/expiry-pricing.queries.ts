import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { expiryPricingApi } from "./expiry-pricing.api";
import type {
  CreateExpiryDiscountRulePayload,
  UpdateExpiryDiscountRulePayload,
} from "../types";
import { notify } from "@/lib/notify";

const QUERY_KEY = ["expiry-discount-rules"];

export function useExpiryRulesQuery() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => expiryPricingApi.getRules(),
  });
}

export function useCreateExpiryRuleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExpiryDiscountRulePayload) =>
      expiryPricingApi.createRule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notify.success("Tạo quy tắc giảm giá thành công!");
    },
  });
}

export function useUpdateExpiryRuleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateExpiryDiscountRulePayload;
    }) => expiryPricingApi.updateRule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notify.success("Cập nhật quy tắc thành công!");
    },
  });
}

export function useDeleteExpiryRuleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => expiryPricingApi.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notify.success("Xóa quy tắc thành công!");
    },
  });
}
