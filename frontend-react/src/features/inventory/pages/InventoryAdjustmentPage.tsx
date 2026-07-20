import { useState } from "react";
import { Modal, ModalTitleBar } from "@/components/Modal";
import {
  useInventoryTransactionsQuery,
  useCreateAdjustmentMutation,
} from "../api/inventory.queries";
import { InventoryAdjustmentForm } from "../components/InventoryAdjustmentForm";
import type { CreateAdjustmentPayload } from "../types";

export default function InventoryAdjustmentPage() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: response, isLoading } = useInventoryTransactionsQuery({
    page,
    limit,
    source: "ADJUSTMENT",
  });
  const transactions = response?.data || [];
  const meta = response?.meta;

  const createMutation = useCreateAdjustmentMutation();

  const handleSubmit = async (payload: CreateAdjustmentPayload) => {
    await createMutation.mutateAsync(payload);
    setIsModalOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="card-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2>🗑️ Hao hụt / Hủy hàng</h2>
          <p>
            Ghi nhận hàng hỏng, hết hạn, thất thoát — luôn kèm lý do rõ ràng
          </p>
        </div>
        <button className="btn btn-danger" onClick={() => setIsModalOpen(true)}>
          + Ghi nhận hao hụt
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          Đang tải lịch sử...
        </div>
      ) : transactions.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "40px",
            color: "var(--text-secondary)",
          }}
        >
          Chưa có phiếu hao hụt/hủy hàng nào.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Sản phẩm (ID)</th>
                  <th>Số lượng</th>
                  <th>Lý do</th>
                  <th>Ghi chú</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>#{tx.id}</td>
                    <td>#{tx.product_id}</td>
                    <td style={{ fontWeight: 700, color: "var(--danger)" }}>
                      −{tx.quantity}
                    </td>
                    <td>
                      <span className="badge badge-warning">
                        {tx.reason || "—"}
                      </span>
                    </td>
                    <td>{tx.note || "—"}</td>
                    <td
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {new Date(tx.created_at).toLocaleString("vi-VN")}
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
                Trang {page} / {meta.total_pages} ({meta.total_items} phiếu)
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

      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)} maxWidth={560}>
          <ModalTitleBar
            title="🗑️ Ghi nhận hao hụt/hủy hàng"
            onClose={() => setIsModalOpen(false)}
          />
          <div className="modal-content">
            <InventoryAdjustmentForm
              onSubmit={handleSubmit}
              onCancel={() => setIsModalOpen(false)}
              isLoading={createMutation.isPending}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
