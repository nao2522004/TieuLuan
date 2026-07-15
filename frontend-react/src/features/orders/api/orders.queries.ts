import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi, type GetOrdersParams } from "./orders.api";
import type { CreateOrderPayload } from "../types";
import { notify } from "@/lib/notify";

export function useOrdersQuery(params?: GetOrdersParams) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: () => ordersApi.getOrders(params),
  });
}

export function useOrderDetailQuery(id?: number) {
  return useQuery({
    queryKey: ["orders", "detail", id],
    queryFn: () => ordersApi.getOrderById(id!),
    enabled: !!id,
  });
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => ordersApi.createOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useConfirmPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ordersApi.confirmPayment(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "detail", data.id] });
      notify.success("Xác nhận thanh toán thành công!");
    },
  });
}

export function useCancelOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ordersApi.cancelOrder(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "detail", data.id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notify.success("Hủy đơn hàng thành công!");
    },
  });
}
