import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { useBranchesQuery } from "@/features/branches/api/branches.queries";
import { useCategoriesQuery } from "@/features/categories/api/categories.queries";
import {
  useProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from "../api/products.queries";
import { ProductForm } from "../components/ProductForm";
import type { Product, CreateProductPayload } from "../types";

export default function ProductsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<number | undefined>(user?.branch_id || undefined);
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Option lists
  const { data: branchesRes } = useBranchesQuery({ limit: 100 });
  const { data: categoriesRes } = useCategoriesQuery({ limit: 100 });
  const branches = branchesRes?.data || [];
  const categories = categoriesRes?.data || [];

  // Query products
  const { data: response, isLoading } = useProductsQuery({
    page,
    limit,
    search,
    branch_id: branchFilter,
    category_id: categoryFilter,
  });

  const products = response?.data || [];
  const meta = response?.meta;

  const createMutation = useCreateProductMutation();
  const updateMutation = useUpdateProductMutation();
  const deleteMutation = useDeleteProductMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);

  const handleOpenCreateModal = () => {
    setSelectedProduct(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(undefined);
  };

  const handleFormSubmit = async (payload: CreateProductPayload) => {
    if (selectedProduct) {
      await updateMutation.mutateAsync({ id: selectedProduct.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    handleCloseModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này không?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="products-page-wrapper">
      <div className="card-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2>Quản lý Sản phẩm</h2>
          <p>Danh sách và quản lý các mặt hàng sản phẩm</p>
        </div>
        <div className="flex-row-end" style={{ gap: "12px" }}>
          <Link to="/products/alerts" className="btn btn-warning" style={{ textDecoration: "none" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            Cảnh báo sản phẩm
          </Link>
          {isAdmin && (
            <button className="btn btn-primary" onClick={handleOpenCreateModal}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Thêm sản phẩm
            </button>
          )}
        </div>
      </div>

      {/* Filter Options */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="grid-cols-3" style={{ gap: "16px" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ marginBottom: "4px" }}>Tìm kiếm</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Tìm tên hoặc barcode..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{ paddingLeft: "36px" }}
              />
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </span>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ marginBottom: "4px" }}>Lọc theo chi nhánh</label>
            <select
              className="form-control"
              value={branchFilter || ""}
              onChange={(e) => {
                setBranchFilter(e.target.value ? Number(e.target.value) : undefined);
                setPage(1);
              }}
              disabled={!!user?.branch_id} // If cashier is bound to branch, lock it
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
            <label style={{ marginBottom: "4px" }}>Lọc theo danh mục</label>
            <select
              className="form-control"
              value={categoryFilter || ""}
              onChange={(e) => {
                setCategoryFilter(e.target.value ? Number(e.target.value) : undefined);
                setPage(1);
              }}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>Đang tải danh sách...</div>
      ) : products.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
          Không tìm thấy sản phẩm nào phù hợp.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã vạch</th>
                  <th>Tên sản phẩm</th>
                  <th>Đơn vị</th>
                  <th>Giá vốn</th>
                  <th>Giá bán</th>
                  <th>Tồn kho</th>
                  <th>Ngưỡng cảnh báo</th>
                  <th>Hạn sử dụng</th>
                  {isAdmin && <th style={{ textAlign: "right" }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const isLowStock = product.stock_quantity <= product.reorder_level;
                  const isExpiring = product.expiry_date
                    ? new Date(product.expiry_date).getTime() < new Date().getTime() + 7 * 24 * 60 * 60 * 1000
                    : false;

                  return (
                    <tr key={product.id}>
                      <td style={{ fontFamily: "monospace", color: "var(--text-secondary)" }}>{product.barcode}</td>
                      <td>
                        <div style={{ fontWeight: "600" }}>{product.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Chi nhánh ID: {product.branch_id} | Danh mục ID: {product.category_id}
                        </div>
                      </td>
                      <td>{product.unit}</td>
                      <td>{product.cost_price.toLocaleString("vi-VN")} đ</td>
                      <td style={{ fontWeight: "600", color: "var(--primary)" }}>{product.sale_price.toLocaleString("vi-VN")} đ</td>
                      <td>
                        <span style={{
                          fontWeight: "bold",
                          color: isLowStock ? "var(--danger)" : "var(--success)"
                        }}>
                          {product.stock_quantity}
                        </span>
                      </td>
                      <td>{product.reorder_level}</td>
                      <td>
                        {product.expiry_date ? (
                          <span style={{
                            color: isExpiring ? "var(--danger)" : "var(--text-secondary)"
                          }}>
                            {new Date(product.expiry_date).toLocaleDateString("vi-VN")}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: "right" }}>
                          <div className="flex-row-end" style={{ gap: "8px" }}>
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleOpenEditModal(product)}
                              style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                            >
                              Sửa
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => handleDelete(product.id)}
                              style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta && meta.total_pages > 1 && (
            <div className="flex-row-between" style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Hiển thị trang {page} / {meta.total_pages} ({meta.total_items} sản phẩm)
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
          <div className="modal-box animate-slide-in" style={{ maxWidth: "680px" }}>
            <div className="modal-title-bar">
              <h3>{selectedProduct ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}</h3>
              <button
                className="toggle-sidebar-btn"
                onClick={handleCloseModal}
                style={{ padding: "4px" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-content">
              <ProductForm
                initialValues={selectedProduct}
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
