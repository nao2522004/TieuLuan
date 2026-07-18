import { useState } from "react";
import { useAuth } from "@/features/auth";
import {
  usePromotionsQuery,
  useCreatePromotionMutation,
  useUpdatePromotionMutation,
  useDeletePromotionMutation,
  useValidatePromotionMutation,
} from "../api/promotions.queries";
import { PromotionForm } from "../components/PromotionForm";
import type { Promotion, CreatePromotionPayload } from "../types";

function fmtMoney(n: number) {
  return n.toLocaleString("vi-VN") + " đ";
}

function fmtDate(s: string | null) {
  if (!s) return "Vô thời hạn";
  return new Date(s).toLocaleString("vi-VN");
}

function isExpired(p: Promotion) {
  return !!p.ends_at && new Date(p.ends_at) < new Date();
}
function isUpcoming(p: Promotion) {
  return new Date(p.starts_at) > new Date();
}

function StatusBadge({ p }: { p: Promotion }) {
  if (!p.is_active) return <span className="badge badge-danger">Tạm tắt</span>;
  if (isExpired(p)) return <span className="badge badge-danger">Đã hết hạn</span>;
  if (isUpcoming(p)) return <span className="badge badge-warning">Chưa bắt đầu</span>;
  return <span className="badge badge-success">Đang áp dụng</span>;
}

export default function PromotionsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [statusFilter, setStatusFilter] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: response, isLoading } = usePromotionsQuery({
    page,
    limit,
    is_active: statusFilter === "" ? undefined : statusFilter === "true",
  });
  const promotions = response?.data || [];
  const meta = response?.meta;

  const createMutation = useCreatePromotionMutation();
  const updateMutation = useUpdatePromotionMutation();
  const deleteMutation = useDeletePromotionMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | undefined>(
    undefined,
  );

  const handleOpenCreateModal = () => {
    setSelectedPromotion(undefined);
    setIsModalOpen(true);
  };
  const handleOpenEditModal = (p: Promotion) => {
    setSelectedPromotion(p);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPromotion(undefined);
  };

  const handleFormSubmit = async (payload: CreatePromotionPayload) => {
    if (selectedPromotion) {
      await updateMutation.mutateAsync({ id: selectedPromotion.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    handleCloseModal();
  };

  const handleDelete = async (p: Promotion) => {
    if (window.confirm(`Xóa mã khuyến mãi "${p.code}"?`)) {
      await deleteMutation.mutateAsync(p.id);
    }
  };

  // --- Kiểm tra thử mã (dùng lại đúng API POS đang gọi, không tự tính lại) ---
  const [testCode, setTestCode] = useState("");
  const [testAmount, setTestAmount] = useState<number>(100000);
  const validateMutation = useValidatePromotionMutation();

  const handleTestCode = () => {
    if (!testCode.trim()) return;
    validateMutation.mutate({ code: testCode.trim(), amount: testAmount });
  };

  return (
    <div className="animate-fade-in">
      <div className="card-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2>🏷️ Quản lý Mã khuyến mãi</h2>
          <p>
            Tạo và quản lý các chương trình giảm giá áp dụng tại POS.{" "}
            {!isAdmin && "Bạn đang xem ở chế độ chỉ đọc (Trưởng ca)."}
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Thêm mã khuyến mãi
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="grid-cols-3" style={{ gap: "16px" }}>
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
              <option value="true">Đang bật</option>
              <option value="false">Đang tắt</option>
            </select>
          </div>
        </div>
      </div>

      {/* Test code widget */}
      <div
        className="card"
        style={{
          marginBottom: "24px",
          borderColor: "rgba(99,102,241,0.2)",
          background: "rgba(99,102,241,0.04)",
        }}
      >
        <h3 style={{ fontSize: "0.95rem", marginBottom: "12px", color: "var(--text-secondary)" }}>
          🔍 Kiểm tra thử mã (dùng đúng API validate của POS)
        </h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="form-group" style={{ margin: 0, minWidth: "160px" }}>
            <label style={{ marginBottom: "4px" }}>Mã</label>
            <input
              type="text"
              className="form-control"
              placeholder="VD: TET2026"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value.toUpperCase())}
              style={{ textTransform: "uppercase" }}
            />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: "160px" }}>
            <label style={{ marginBottom: "4px" }}>Giá trị đơn hàng (VND)</label>
            <input
              type="number"
              className="form-control"
              min={0}
              value={testAmount}
              onChange={(e) => setTestAmount(Number(e.target.value))}
            />
          </div>
          <button
            className="btn btn-secondary"
            onClick={handleTestCode}
            disabled={validateMutation.isPending || !testCode.trim()}
          >
            {validateMutation.isPending ? "Đang kiểm tra..." : "Kiểm tra"}
          </button>
        </div>
        {validateMutation.data && (
          <p
            style={{
              marginTop: "12px",
              fontSize: "0.9rem",
              color: validateMutation.data.valid ? "var(--success)" : "var(--danger)",
            }}
          >
            {validateMutation.data.valid
              ? `✅ Hợp lệ — giảm ${fmtMoney(validateMutation.data.discount_amount)}`
              : `❌ ${validateMutation.data.reason}`}
          </p>
        )}
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>Đang tải danh sách...</div>
      ) : promotions.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
          Chưa có mã khuyến mãi nào.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên chương trình</th>
                  <th>Mức giảm</th>
                  <th>Điều kiện</th>
                  <th>Hiệu lực</th>
                  <th>Trạng thái</th>
                  {isAdmin && <th style={{ textAlign: "right" }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)" }}>
                      {p.code}
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: "var(--danger)" }}>
                        {p.type === "percent" ? `− ${p.value}%` : `− ${fmtMoney(p.value)}`}
                      </span>
                      {p.type === "percent" && p.max_discount_amount != null && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Tối đa {fmtMoney(p.max_discount_amount)}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {p.min_order_amount != null
                        ? `Đơn từ ${fmtMoney(p.min_order_amount)}`
                        : "Không điều kiện"}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {fmtDate(p.starts_at)} → {fmtDate(p.ends_at)}
                    </td>
                    <td>
                      <StatusBadge p={p} />
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: "right" }}>
                        <div className="flex-row-end" style={{ gap: "8px" }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleOpenEditModal(p)}
                            style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                          >
                            Sửa
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleDelete(p)}
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
                Hiển thị trang {page} / {meta.total_pages} ({meta.total_items} mã)
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
      {isModalOpen && isAdmin && (
        <div className="modal-overlay">
          <div className="modal-box animate-slide-in" style={{ maxWidth: "620px" }}>
            <div className="modal-title-bar">
              <h3>{selectedPromotion ? "Cập nhật mã khuyến mãi" : "Thêm mã khuyến mãi"}</h3>
              <button className="toggle-sidebar-btn" onClick={handleCloseModal} style={{ padding: "4px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-content">
              <PromotionForm
                initialValues={selectedPromotion}
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
