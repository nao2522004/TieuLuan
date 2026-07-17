import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { shiftsApi } from "../api/shifts.api";
import { useShiftStore } from "../stores/shift.store";
import { useAuthStore } from "@/features/auth/stores/auth.store";

export function useSyncActiveShift() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const activeShift = useShiftStore((s) => s.activeShift);
  const setActiveShift = useShiftStore((s) => s.setActiveShift);

  const { data } = useQuery({
    queryKey: ["shifts", "active-sync"],
    queryFn: () => shiftsApi.getShifts({ status: "open", limit: 1 }),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!data) return;
    const serverShift = data.data[0] ?? null;
    if (serverShift?.id !== activeShift?.id) {
      setActiveShift(serverShift);
    }
  }, [data, activeShift, setActiveShift]);
}
