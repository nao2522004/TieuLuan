import { apiClient } from "@/lib/api-client";
import type { ApiSuccessResponse } from "@/types/api";
import type {
  User,
  CreateUserPayload,
  UpdateUserPayload,
  ChangePasswordPayload,
  ResetPasswordPayload,
} from "../types";

export interface GetUsersParams {
  page?: number;
  limit?: number;
  branch_id?: number;
  role_code?: string;
  is_active?: boolean;
}

export const usersApi = {
  getUsers: async (
    params?: GetUsersParams,
  ): Promise<ApiSuccessResponse<User[]>> => {
    const res = await apiClient.get<ApiSuccessResponse<User[]>>("/users", {
      params,
    });
    return res as unknown as ApiSuccessResponse<User[]>;
  },

  getUserById: async (id: number): Promise<User> => {
    const res = await apiClient.get<ApiSuccessResponse<User>>(`/users/${id}`);
    return (res as unknown as ApiSuccessResponse<User>).data;
  },

  createUser: async (payload: CreateUserPayload): Promise<User> => {
    const res = await apiClient.post<ApiSuccessResponse<User>>(
      "/users",
      payload,
    );
    return (res as unknown as ApiSuccessResponse<User>).data;
  },

  updateUser: async (id: number, payload: UpdateUserPayload): Promise<User> => {
    const res = await apiClient.patch<ApiSuccessResponse<User>>(
      `/users/${id}`,
      payload,
    );
    return (res as unknown as ApiSuccessResponse<User>).data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  resetPassword: async (
    id: number,
    payload: ResetPasswordPayload,
  ): Promise<void> => {
    await apiClient.patch(`/users/${id}/reset-password`, payload);
  },

  changeOwnPassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await apiClient.patch("/users/me/password", payload);
  },
};
