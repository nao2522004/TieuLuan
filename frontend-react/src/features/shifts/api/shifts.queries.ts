import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shiftsApi, type GetShiftsParams } from "./shifts.api";
import { useShiftStore } from "../stores/shift.store";
import type { OpenShiftPayload, CloseShiftPayload } from "../types";
import { notify } from "@/lib/notify";

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
      if (activeShift?.id === data.id) {
        setActiveShift(null);
      }
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({
        queryKey: ["shifts", "detail", data.id],
      });
      notify.success("Đóng ca làm việc thành công!");
    },
  });
}
