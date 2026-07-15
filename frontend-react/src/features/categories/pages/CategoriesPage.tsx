import { useState } from "react";
import { useAuth } from "@/features/auth";
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from "../api/categories.queries";
import { CategoryForm } from "../components/CategoryForm";
import type { Category, CreateCategoryPayload } from "../types";

export default function CategoriesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: response, isLoading } = useCategoriesQuery({ page, limit, search });
  const categories = response?.data || [];
  const meta = response?.meta;

  const createMutation = useCreateCategoryMutation();
  const updateMutation = useUpdateCategoryMutation();
  const deleteMutation = useDeleteCategoryMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);

  const handleOpenCreateModal = () => {
    setSelectedCategory(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (category: Category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(undefined);
  };

  const handleFormSubmit = async (payload: CreateCategoryPayload) => {
    if (selectedCategory) {
      await updateMutation.mutateAsync({ id: selectedCategory.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    handleCloseModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa danh mục này không?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="categories-page-wrapper">
      <div className="card-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2>Quản lý Danh mục</h2>
          <p>Phân loại sản phẩm trong hệ thống</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Thêm danh mục
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="flex-row-between" style={{ flexWrap: "wrap", gap: "16px" }}>
          <div className="search-box-container" style={{ position: "relative", flex: "1", minWidth: "260px" }}>
            <input
              type="text"
              className="form-control"
              placeholder="Tìm kiếm theo tên danh mục..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ paddingLeft: "40px" }}
            />
            <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>Đang tải danh sách...</div>
      ) : categories.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
          Không tìm thấy danh mục nào.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên danh mục</th>
                  <th>Mô tả</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  {isAdmin && <th style={{ textAlign: "right" }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.id}</td>
                    <td style={{ fontWeight: "600" }}>{category.name}</td>
                    <td>{category.description || "—"}</td>
                    <td>
                      <span className={`badge ${category.is_active ? "badge-success" : "badge-danger"}`}>
                        {category.is_active ? "Hoạt động" : "Khóa"}
                      </span>
                    </td>
                    <td>
                      {new Date(category.created_at).toLocaleDateString("vi-VN")}
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: "right" }}>
                        <div className="flex-row-end" style={{ gap: "8px" }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleOpenEditModal(category)}
                            style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                          >
                            Sửa
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleDelete(category.id)}
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
            <div className="flex-row-between" style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Hiển thị trang {page} / {meta.total_pages} ({meta.total_items} danh mục)
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
                  onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
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
          <div className="modal-box animate-slide-in" style={{ maxWidth: "500px" }}>
            <div className="modal-title-bar">
              <h3>{selectedCategory ? "Cập nhật danh mục" : "Thêm danh mục mới"}</h3>
              <button
                className="toggle-sidebar-btn"
                onClick={handleCloseModal}
                style={{ padding: "4px" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-content">
              <CategoryForm
                initialValues={selectedCategory}
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
