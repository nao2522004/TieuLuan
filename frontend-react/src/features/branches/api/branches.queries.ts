import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { branchesApi, type GetBranchesParams } from "./branches.api";
import type { CreateBranchPayload, UpdateBranchPayload } from "../types";
import { notify } from "@/lib/notify";

export function useBranchesQuery(params?: GetBranchesParams) {
  return useQuery({
    queryKey: ["branches", params],
    queryFn: () => branchesApi.getBranches(params),
  });
}

export function useBranchDetailQuery(id?: number) {
  return useQuery({
    queryKey: ["branches", "detail", id],
    queryFn: () => branchesApi.getBranchById(id!),
    enabled: !!id,
  });
}

export function useCreateBranchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBranchPayload) => branchesApi.createBranch(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      notify.success("Tạo chi nhánh thành công!");
    },
  });
}

export function useUpdateBranchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateBranchPayload }) =>
      branchesApi.updateBranch(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["branches", "detail", data.id] });
      notify.success("Cập nhật chi nhánh thành công!");
    },
  });
}

export function useDeleteBranchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => branchesApi.deleteBranch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      notify.success("Xóa chi nhánh thành công!");
    },
  });
}
