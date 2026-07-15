import { useQuery } from "@tanstack/react-query";
import { reportsApi, type GetRevenueParams } from "./reports.api";

export function useRevenueQuery(params?: GetRevenueParams) {
  return useQuery({
    queryKey: ["reports", "revenue", params],
    queryFn: () => reportsApi.getRevenue(params),
  });
}
