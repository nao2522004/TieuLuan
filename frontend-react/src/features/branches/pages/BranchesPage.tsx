import { useState } from "react";
import { useAuth } from "@/features/auth";
import {
  useBranchesQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
} from "../api/branches.queries";
import { BranchForm } from "../components/BranchForm";
import type { Branch, CreateBranchPayload } from "../types";

export default function BranchesPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("admin");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: response, isLoading } = useBranchesQuery({
    page,
    limit,
    search,
  });
  const branches = response?.data || [];
  const meta = response?.meta;

  const createMutation = useCreateBranchMutation();
  const updateMutation = useUpdateBranchMutation();
  const deleteMutation = useDeleteBranchMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | undefined>(
    undefined,
  );

  const handleOpenCreateModal = () => {
    setSelectedBranch(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBranch(undefined);
  };

  const handleFormSubmit = async (payload: CreateBranchPayload) => {
    if (selectedBranch) {
      await updateMutation.mutateAsync({ id: selectedBranch.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    handleCloseModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa chi nhánh này không?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="branches-page-wrapper">
      <div className="card-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2>Quản lý Chi nhánh</h2>
          <p>Danh sách các chi nhánh của hệ thống cửa hàng</p>
        </div>
        {isAdmin && (
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
            Thêm chi nhánh
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: "24px" }}>
        <div
          className="flex-row-between"
          style={{ flexWrap: "wrap", gap: "16px" }}
        >
          <div
            className="search-box-container"
            style={{ position: "relative", flex: "1", minWidth: "260px" }}
          >
            <input
              type="text"
              className="form-control"
              placeholder="Tìm kiếm theo tên chi nhánh..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ paddingLeft: "40px" }}
            />
            <span
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          Đang tải danh sách...
        </div>
      ) : branches.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "40px",
            color: "var(--text-secondary)",
          }}
        >
          Không tìm thấy chi nhánh nào.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên chi nhánh</th>
                  <th>Địa chỉ</th>
                  <th>Số điện thoại</th>
                  <th>Trạng thái</th>
                  <th>Ngân hàng chuyển khoản</th>
                  {isAdmin && <th style={{ textAlign: "right" }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch.id}>
                    <td>{branch.id}</td>
                    <td style={{ fontWeight: "600" }}>{branch.name}</td>
                    <td>{branch.address || "—"}</td>
                    <td>{branch.phone || "—"}</td>
                    <td>
                      <span
                        className={`badge ${branch.is_active ? "badge-success" : "badge-danger"}`}
                      >
                        {branch.is_active ? "Hoạt động" : "Khóa"}
                      </span>
                    </td>
                    <td>
                      {branch.bank_account_no ? (
                        <div style={{ fontSize: "0.85rem" }}>
                          <div>
                            BIN:{" "}
                            <span style={{ fontWeight: "600" }}>
                              {branch.bank_bin}
                            </span>
                          </div>
                          <div>
                            STK:{" "}
                            <span style={{ fontWeight: "600" }}>
                              {branch.bank_account_no}
                            </span>
                          </div>
                          <div
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.75rem",
                            }}
                          >
                            {branch.bank_account_name}
                          </div>
                        </div>
                      ) : (
                        <span
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.85rem",
                          }}
                        >
                          Chưa thiết lập
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: "right" }}>
                        <div className="flex-row-end" style={{ gap: "8px" }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleOpenEditModal(branch)}
                            style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                          >
                            Sửa
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleDelete(branch.id)}
                            style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
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
                chi nhánh)
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

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-box animate-slide-in"
            style={{ maxWidth: "540px" }}
          >
            <div className="modal-title-bar">
              <h3>
                {selectedBranch ? "Cập nhật chi nhánh" : "Thêm chi nhánh mới"}
              </h3>
              <button
                className="toggle-sidebar-btn"
                onClick={handleCloseModal}
                style={{ padding: "4px" }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-content">
              <BranchForm
                initialValues={selectedBranch}
                onSubmit={handleFormSubmit}
                onCancel={handleCloseModal}
                isLoading={createMutation.isPending || updateMutation.isPending}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
