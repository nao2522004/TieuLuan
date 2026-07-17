import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shiftsApi, type GetShiftsParams } from "./shifts.api";
import { useShiftStore } from "../stores/shift.store";
import type { OpenShiftPayload, CloseShiftPayload } from "../types";
import { notify } from "@/lib/notify";
import { apiClient } from "@/lib/api-client";
import type { ApiSuccessResponse } from "@/types/api";
import { ApiError } from "@/lib/api-client";

export function useShiftsQuery(params?: GetShiftsParams) {
  return useQuery({
    queryKey: ["shifts", params],
    queryFn: () => shiftsApi.getShifts(params),
  });
}

export function useShiftDetailQuery(id?: number) {
  return useQuery({
    queryKey: ["shifts", "detail", id],
    queryFn: () => shiftsApi.getShiftById(id!),
    enabled: !!id,
  });
}

export function useOpenShiftMutation() {
  const queryClient = useQueryClient();
  const setActiveShift = useShiftStore((s) => s.setActiveShift);

  return useMutation({
    mutationFn: (payload: OpenShiftPayload) => shiftsApi.openShift(payload),
    onSuccess: (data) => {
      setActiveShift(data);
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      notify.success("Mở ca làm việc thành công!");
    },
  });
}

export function useCloseShiftMutation() {
  const queryClient = useQueryClient();
  const activeShift = useShiftStore((s) => s.activeShift);
  const setActiveShift = useShiftStore((s) => s.setActiveShift);

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CloseShiftPayload }) =>
      shiftsApi.closeShift(id, payload),
    onSuccess: (data) => {
      if (activeShift?.id === data.id) setActiveShift(null);
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({
        queryKey: ["shifts", "detail", data.id],
      });
      notify.success("Đóng ca làm việc thành công!");
    },
    onError: (error) => {
      if (
        error instanceof ApiError &&
        activeShift &&
        (error.code === "SHIFT_NOT_FOUND" ||
          error.code === "SHIFT_ALREADY_CLOSED")
      ) {
        setActiveShift(null);
      }
    },
  });
}

export function useCashiersQuery(branchId?: number) {
  return useQuery({
    queryKey: ["users", "cashiers", branchId],
    queryFn: async () => {
      const res = await apiClient.get<
        ApiSuccessResponse<{ id: number; full_name: string }[]>
      >("/users", {
        params: { branch_id: branchId, role_code: "cashier", limit: 100 },
      });
      return (
        res as unknown as ApiSuccessResponse<
          { id: number; full_name: string }[]
        >
      ).data;
    },
    enabled: !!branchId,
  });
}
