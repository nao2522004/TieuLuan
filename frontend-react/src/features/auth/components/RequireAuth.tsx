import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Props {
  roles?: UserRole[];
}

export function RequireAuth({ roles }: Props) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (roles && (!user || !user.roles.some((r) => roles.includes(r)))) {
    return <Navigate to="/403" replace />;
  }
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
