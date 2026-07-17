import { useQuery } from "@tanstack/react-query";
import { rolesApi } from "./roles.api";

export function useRolesQuery() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesApi.getRoles(),
    staleTime: 5 * 60_000, // roles hầu như không đổi trong 1 phiên làm việc
  });
}
