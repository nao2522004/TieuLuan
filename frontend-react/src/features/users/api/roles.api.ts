import { apiClient } from "@/lib/api-client";
import type { ApiSuccessResponse } from "@/types/api";

export interface Role {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

export const rolesApi = {
  getRoles: async (): Promise<Role[]> => {
    const res = await apiClient.get<ApiSuccessResponse<Role[]>>("/roles");
    return (res as unknown as ApiSuccessResponse<Role[]>).data;
  },
};
