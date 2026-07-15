import { useAuthStore } from "../stores/auth.store";
import { useLoginMutation, useLogoutMutation } from "../api/auth.queries";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();

  return {
    user,
    isAuthenticated,
    isAdmin: user?.role === "admin",
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    logout: logoutMutation.mutate,
  };
}
