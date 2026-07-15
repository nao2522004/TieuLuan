import { apiClient } from "@/lib/api-client";
import type { ApiSuccessResponse } from "@/types/api";
import type { Shift, OpenShiftPayload, CloseShiftPayload } from "../types";

export const shiftsApi = {
  openShift: async (payload: OpenShiftPayload): Promise<Shift> => {
    const res = await apiClient.post<ApiSuccessResponse<Shift>>("/shifts/open", payload);
    return (res as unknown as ApiSuccessResponse<Shift>).data;
  },

  closeShift: async (id: number, payload: CloseShiftPayload): Promise<Shift> => {
    const res = await apiClient.patch<ApiSuccessResponse<Shift>>(`/shifts/${id}/close`, payload);
    return (res as unknown as ApiSuccessResponse<Shift>).data;
  },
};
