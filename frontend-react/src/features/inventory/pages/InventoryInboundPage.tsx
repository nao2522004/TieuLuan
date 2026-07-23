import { useState } from "react";
import { Modal, ModalTitleBar } from "@/components/Modal";
import {
  useInventoryTransactionsQuery,
  useCreateInboundMutation,
} from "../api/inventory.queries";
import { InventoryInboundForm } from "../components/InventoryInboundForm";
import type { CreateInboundPayload } from "../types";

export default function InventoryInboundPage() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: response, isLoading } = useInventoryTransactionsQuery({
    page,
    limit,
    source: "INBOUND",
  });
  const transactions = response?.data || [];
  const meta = response?.meta;

  const createMutation = useCreateInboundMutation();

  const handleSubmit = async (payload: CreateInboundPayload) => {
    await createMutation.mutateAsync(payload);
    setIsModalOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="card-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2>📥 Nhập kho</h2>
          <p>Ghi nhận hàng nhập từ nhà cung cấp, cộng thẳng vào tồn kho</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setIsModalOpen(true)}
        >
          + Nhập kho mới
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
          Chưa có phiếu nhập kho nào.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Sản phẩm</th>
                  <th>Số lượng</th>
                  <th>Giá vốn tham khảo</th>
                  <th>Ghi chú</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>#{tx.id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {tx.product_name || `Sản phẩm #${tx.product_id}`}
                      </div>
                      {tx.product_barcode && (
                        <div
                          style={{
                            fontSize: "0.78rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {tx.product_barcode}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--success)" }}>
                      +{tx.quantity}
                    </td>
                    <td>
                      {tx.unit_cost != null
                        ? `${tx.unit_cost.toLocaleString("vi-VN")} đ`
                        : "—"}
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
            title="📥 Nhập kho mới"
            onClose={() => setIsModalOpen(false)}
          />
          <div className="modal-content">
            <InventoryInboundForm
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
