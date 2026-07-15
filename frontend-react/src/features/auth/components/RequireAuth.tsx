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
  if (roles && (!user || !roles.includes(user.role))) {
    return <Navigate to="/403" replace />;
  }
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
