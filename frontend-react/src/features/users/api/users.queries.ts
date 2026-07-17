import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi, type GetUsersParams } from "./users.api";
import type {
  CreateUserPayload,
  UpdateUserPayload,
  ChangePasswordPayload,
  ResetPasswordPayload,
} from "../types";
import { notify } from "@/lib/notify";

export function useUsersQuery(params?: GetUsersParams) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => usersApi.getUsers(params),
  });
}

export function useUserDetailQuery(id?: number) {
  return useQuery({
    queryKey: ["users", "detail", id],
    queryFn: () => usersApi.getUserById(id!),
    enabled: !!id,
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      notify.success("Tạo tài khoản nhân viên thành công!");
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateUserPayload }) =>
      usersApi.updateUser(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", "detail", data.id] });
      notify.success("Cập nhật nhân viên thành công!");
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      notify.success("Xóa nhân viên thành công!");
    },
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: ResetPasswordPayload;
    }) => usersApi.resetPassword(id, payload),
    onSuccess: () => {
      notify.success("Reset mật khẩu thành công! Nhân viên cần đăng nhập lại.");
    },
  });
}

export function useChangeOwnPasswordMutation() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) =>
      usersApi.changeOwnPassword(payload),
    onSuccess: () => {
      notify.success("Đổi mật khẩu thành công!");
    },
  });
}
