import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { returnsApi, type GetReturnsParams } from "./returns.api";
import type { CreateReturnPayload } from "../types";
import { notify } from "@/lib/notify";

export function useReturnsQuery(params?: GetReturnsParams) {
  return useQuery({
    queryKey: ["returns", params],
    queryFn: () => returnsApi.getReturns(params),
  });
}

export function useCreateReturnMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReturnPayload) =>
      returnsApi.createReturn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      notify.success("Xử lý trả hàng thành công!");
    },
    onError: (err: unknown) => {
      // ApiError
      console.error("[useCreateReturnMutation] onError:", err);
    },
  });
}
