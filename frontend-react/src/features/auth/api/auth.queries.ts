import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { authApi } from "./auth.api";
import { useAuthStore } from "../stores/auth.store";
import type { LoginPayload } from "../types";
import { useShiftStore } from "@/features/shifts/stores/shift.store";

export function useLoginMutation() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      useShiftStore.getState().setActiveShift(null);
      setSession(data.user, data.access_token, data.refresh_token);
    },
  });
}

export function useLogoutMutation() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  return useMutation({
    mutationFn: () => authApi.logout(refreshToken ?? ""),
    onSettled: () => {
      clearSession();
      useShiftStore.getState().setActiveShift(null);
      queryClient.clear();
    },
  });
}
