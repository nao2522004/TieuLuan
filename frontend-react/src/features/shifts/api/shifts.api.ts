import { apiClient } from "@/lib/api-client";
import type { ApiSuccessResponse } from "@/types/api";
import type {
  Shift,
  ShiftDetail,
  OpenShiftPayload,
  CloseShiftPayload,
  UpdateClosingPayload,
} from "../types";

export interface GetShiftsParams {
  page?: number;
  limit?: number;
  branch_id?: number;
  user_id?: number;
  status?: "open" | "closed";
}

export const shiftsApi = {
  openShift: async (payload: OpenShiftPayload): Promise<Shift> => {
    const res = await apiClient.post<ApiSuccessResponse<Shift>>(
      "/shifts/open",
      payload,
    );
    return (res as unknown as ApiSuccessResponse<Shift>).data;
  },

  closeShift: async (
    id: number,
    payload: CloseShiftPayload,
  ): Promise<Shift> => {
    const res = await apiClient.patch<ApiSuccessResponse<Shift>>(
      `/shifts/${id}/close`,
      payload,
    );
    return (res as unknown as ApiSuccessResponse<Shift>).data;
  },

  correctClosed: async (
    id: number,
    payload: UpdateClosingPayload,
  ): Promise<Shift> => {
    const res = await apiClient.patch<ApiSuccessResponse<Shift>>(
      `/shifts/${id}/correction`,
      payload,
    );
    return (res as unknown as ApiSuccessResponse<Shift>).data;
  },

  getShifts: async (
    params?: GetShiftsParams,
  ): Promise<ApiSuccessResponse<Shift[]>> => {
    const res = await apiClient.get<ApiSuccessResponse<Shift[]>>("/shifts", {
      params,
    });
    return res as unknown as ApiSuccessResponse<Shift[]>;
  },

  getShiftById: async (id: number): Promise<ShiftDetail> => {
    const res = await apiClient.get<ApiSuccessResponse<ShiftDetail>>(
      `/shifts/${id}`,
    );
    return (res as unknown as ApiSuccessResponse<ShiftDetail>).data;
  },
};
