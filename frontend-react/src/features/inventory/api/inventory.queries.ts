import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inventoryApi,
  type GetInventoryTransactionsParams,
} from "./inventory.api";
import type { CreateInboundPayload, CreateAdjustmentPayload } from "../types";
import { notify } from "@/lib/notify";

export function useInventoryTransactionsQuery(
  params?: GetInventoryTransactionsParams,
) {
  return useQuery({
    queryKey: ["inventory", "transactions", params],
    queryFn: () => inventoryApi.getTransactions(params),
  });
}

export function useCreateInboundMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInboundPayload) =>
      inventoryApi.createInbound(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory", "transactions"],
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notify.success("Nhập kho thành công!");
    },
  });
}

export function useCreateAdjustmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAdjustmentPayload) =>
      inventoryApi.createAdjustment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory", "transactions"],
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", "alerts"] });
      notify.success("Ghi nhận hao hụt thành công!");
    },
  });
}
