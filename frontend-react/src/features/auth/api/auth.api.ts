import { apiClient, withSilentError } from "@/lib/api-client";
import type { ApiSuccessResponse } from "@/types/api";
import type { LoginPayload, LoginResponseData } from "../types";

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponseData> => {
    const res = await apiClient.post<ApiSuccessResponse<LoginResponseData>>(
      "/auth/login",
      payload,
      withSilentError({}),
    );
    return (res as unknown as ApiSuccessResponse<LoginResponseData>).data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post(
      "/auth/logout",
      { refresh_token: refreshToken },
      withSilentError({}),
    );
  },
};
