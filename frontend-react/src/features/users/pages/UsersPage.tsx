import { useState } from "react";
import { useAuth } from "@/features/auth";
import { useBranchesQuery } from "@/features/branches/api/branches.queries";
import {
  useUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from "../api/users.queries";
import { UserForm } from "../components/UserForm";
import { ResetPasswordModal } from "../components/ResetPasswordModal";
import { Modal, ModalTitleBar } from "@/components/Modal";
import type { User, CreateUserPayload, UpdateUserPayload } from "../types";

const roleLabel: Record<string, string> = {
  admin: "Quản trị viên",
  leader: "Trưởng ca",
  cashier: "Thu ngân",
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();

  const [branchFilter, setBranchFilter] = useState<number | undefined>(
    undefined,
  );
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: branchesRes } = useBranchesQuery({ limit: 100 });
  const branches = branchesRes?.data || [];

  const { data: response, isLoading } = useUsersQuery({
    page,
    limit,
    branch_id: branchFilter,
    role_code: roleFilter || undefined,
    is_active: statusFilter === "" ? undefined : statusFilter === "true",
  });
  const users = response?.data || [];
  const meta = response?.meta;

  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const deleteMutation = useDeleteUserMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | undefined>(
    undefined,
  );

  const handleOpenCreateModal = () => {
    setSelectedUser(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: User) => {
    setSelectedUser(u);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(undefined);
  };

  const handleCreateSubmit = async (payload: CreateUserPayload) => {
    await createMutation.mutateAsync(payload);
    handleCloseModal();
  };

  const handleEditSubmit = async (payload: UpdateUserPayload) => {
    if (!selectedUser) return;
    await updateMutation.mutateAsync({ id: selectedUser.id, payload });
    handleCloseModal();
  };

  const handleDelete = async (u: User) => {
    if (u.id === currentUser?.id) return;
    if (
      window.confirm(
        `Xóa nhân viên "${u.full_name}"? Hành động này không thể hoàn tác.`,
      )
    ) {
      await deleteMutation.mutateAsync(u.id);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="card-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2>👥 Quản lý Nhân viên</h2>
          <p>Tạo, phân quyền và quản lý tài khoản nhân viên trong hệ thống</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Thêm nhân viên
        </button>
      </div>

      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="grid-cols-3" style={{ gap: "16px" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ marginBottom: "4px" }}>Chi nhánh</label>
            <select
              className="form-control"
              value={branchFilter || ""}
              onChange={(e) => {
                setBranchFilter(
                  e.target.value ? Number(e.target.value) : undefined,
                );
                setPage(1);
              }}
            >
              <option value="">Tất cả chi nhánh</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ marginBottom: "4px" }}>Vai trò</label>
            <select
              className="form-control"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả vai trò</option>
              <option value="admin">Quản trị viên</option>
              <option value="leader">Trưởng ca</option>
              <option value="cashier">Thu ngân</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ marginBottom: "4px" }}>Trạng thái</label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "" | "true" | "false");
                setPage(1);
              }}
            >
              <option value="">Tất cả</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Đã khóa</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          Đang tải danh sách...
        </div>
      ) : users.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "40px",
            color: "var(--text-secondary)",
          }}
        >
          Không tìm thấy nhân viên nào.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Chi nhánh</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td style={{ fontWeight: "600" }}>
                        {u.full_name}
                        {isSelf && (
                          <span
                            className="badge badge-info"
                            style={{ marginLeft: "8px", fontSize: "0.7rem" }}
                          >
                            Bạn
                          </span>
                        )}
                      </td>
                      <td>{u.email}</td>
                      <td>{roleLabel[u.role] ?? u.role}</td>
                      <td>{u.branch_id ? `ID: ${u.branch_id}` : "—"}</td>
                      <td>
                        <span
                          className={`badge ${u.is_active ? "badge-success" : "badge-danger"}`}
                        >
                          {u.is_active ? "Hoạt động" : "Đã khóa"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="flex-row-end" style={{ gap: "8px" }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleOpenEditModal(u)}
                            style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                          >
                            Sửa
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => setResetPasswordUser(u)}
                            style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                          >
                            Reset MK
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleDelete(u)}
                            disabled={isSelf}
                            title={
                              isSelf ? "Không thể tự xóa chính mình" : undefined
                            }
                            style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta && meta.total_pages > 1 && (
            <div
              className="flex-row-between"
              style={{
                padding: "16px 24px",
                borderTop: "1px solid var(--border-color)",
              }}
            >
              <span
                style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}
              >
                Hiển thị trang {page} / {meta.total_pages} ({meta.total_items}{" "}
                nhân viên)
              </span>
              <div className="flex-row-end" style={{ gap: "8px" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                >
                  Trước
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    setPage((p) => Math.min(meta.total_pages, p + 1))
                  }
                  disabled={page === meta.total_pages}
                  style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <Modal onClose={handleCloseModal} maxWidth={560}>
          <ModalTitleBar
            title={selectedUser ? "Cập nhật nhân viên" : "Thêm nhân viên mới"}
            onClose={handleCloseModal}
          />
          <div className="modal-content">
            <UserForm
              initialValues={selectedUser}
              currentUserId={currentUser?.id}
              onSubmitCreate={handleCreateSubmit}
              onSubmitEdit={handleEditSubmit}
              onCancel={handleCloseModal}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </Modal>
      )}

      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(undefined)}
        />
      )}
    </div>
  );
}
