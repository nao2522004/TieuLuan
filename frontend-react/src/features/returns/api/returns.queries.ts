import { useMutation, useQueryClient } from "@tanstack/react-query";
import { returnsApi } from "./returns.api";
import type { CreateReturnPayload } from "../types";
import { notify } from "@/lib/notify";

export function useCreateReturnMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReturnPayload) => returnsApi.createReturn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      notify.success("Xử lý trả hàng thành công!");
    },
  });
}
