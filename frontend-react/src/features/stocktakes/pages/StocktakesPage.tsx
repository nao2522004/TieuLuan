import { useState } from "react";
import { Modal, ModalTitleBar } from "@/components/Modal";
import { useBranchesQuery } from "@/features/branches/api/branches.queries";
import {
  useStocktakesQuery,
  useCreateStocktakeMutation,
} from "../api/stocktakes.queries";
import { CreateStocktakeForm } from "../components/CreateStocktakeForm";
import { StocktakeDetailModal } from "../components/StocktakeDetailModal";
import type { CreateStocktakePayload, StocktakeStatus } from "../types";

export default function StocktakesPage() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const [branchFilter, setBranchFilter] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<StocktakeStatus | "">("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data: branchesRes } = useBranchesQuery({ limit: 100 });
  const branches = branchesRes?.data || [];

  const { data: response, isLoading } = useStocktakesQuery({
    page,
    limit,
    branch_id: branchFilter,
    status: statusFilter || undefined,
  });
  const stocktakes = response?.data || [];
  const meta = response?.meta;

  const createMutation = useCreateStocktakeMutation();

  const handleCreate = async (payload: CreateStocktakePayload) => {
    const created = await createMutation.mutateAsync(payload);
    setIsCreateOpen(false);
    setDetailId(created.id);
  };

  return (
    <div className="animate-fade-in">
      <div className="card-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2>📋 Kiểm kê kho</h2>
          <p>Đối chiếu tồn kho hệ thống với số đếm thực tế theo định kỳ</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setIsCreateOpen(true)}
        >
          + Mở phiên mới
        </button>
      </div>

      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="grid-cols-2" style={{ gap: "16px" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ marginBottom: 4 }}>Chi nhánh</label>
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
            <label style={{ marginBottom: 4 }}>Trạng thái</label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StocktakeStatus | "");
                setPage(1);
              }}
            >
              <option value="">Tất cả</option>
              <option value="open">Đang mở</option>
              <option value="closed">Đã chốt</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>Đang tải...</div>
      ) : stocktakes.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "40px",
            color: "var(--text-secondary)",
          }}
        >
          Chưa có phiên kiểm kê nào.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Chi nhánh</th>
                  <th>Người mở</th>
                  <th>Ghi chú</th>
                  <th>Trạng thái</th>
                  <th>Mở lúc</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {stocktakes.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700, color: "var(--primary)" }}>
                      #{s.id}
                    </td>
                    <td>#{s.branch_id}</td>
                    <td>#{s.created_by}</td>
                    <td>{s.note || "—"}</td>
                    <td>
                      {s.status === "open" ? (
                        <span className="badge badge-success">Đang mở</span>
                      ) : (
                        <span className="badge badge-info">Đã chốt</span>
                      )}
                    </td>
                    <td
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {new Date(s.created_at).toLocaleString("vi-VN")}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                        onClick={() => setDetailId(s.id)}
                      >
                        Xem chi tiết
                      </button>
                    </td>
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
                Trang {page} / {meta.total_pages} ({meta.total_items} phiên)
              </span>
              <div className="flex-row-end" style={{ gap: 8 }}>
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

      {isCreateOpen && (
        <Modal onClose={() => setIsCreateOpen(false)} maxWidth={480}>
          <ModalTitleBar
            title="📋 Mở phiên kiểm kê mới"
            onClose={() => setIsCreateOpen(false)}
          />
          <div className="modal-content">
            <CreateStocktakeForm
              onSubmit={handleCreate}
              onCancel={() => setIsCreateOpen(false)}
              isLoading={createMutation.isPending}
            />
          </div>
        </Modal>
      )}

      {detailId && (
        <StocktakeDetailModal
          stocktakeId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}
