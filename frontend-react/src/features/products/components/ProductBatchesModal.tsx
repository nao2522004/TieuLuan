import { useState } from "react";
import { Modal, ModalTitleBar } from "@/components/Modal";
import {
  useProductBatchesQuery,
  useUpdateProductBatchMutation,
} from "../api/products.queries";
import type { ProductBatchDetail, UpdateProductBatchPayload } from "../types";

interface ProductBatchesModalProps {
  productId: number;
  productName: string;
  onClose: () => void;
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("vi-VN");
}

interface EditRowFormProps {
  batch: ProductBatchDetail;
  onCancel: () => void;
  onSave: (payload: UpdateProductBatchPayload) => Promise<void>;
  isLoading?: boolean;
}

function EditRowForm({ batch, onCancel, onSave, isLoading }: EditRowFormProps) {
  const [batchCode, setBatchCode] = useState(batch.batch_code);
  const [expiryDate, setExpiryDate] = useState(batch.expiry_date ?? "");
  const [unitCost, setUnitCost] = useState<string>(
    batch.unit_cost != null ? String(batch.unit_cost) : "",
  );

  const handleSave = async () => {
    await onSave({
      batch_code: batchCode.trim() || undefined,
      expiry_date: expiryDate || null,
      unit_cost: unitCost === "" ? null : Number(unitCost),
    });
  };

  return (
    <tr style={{ background: "rgba(99,102,241,0.06)" }}>
      <td colSpan={5}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr auto auto",
            gap: 10,
            alignItems: "flex-end",
            padding: "8px 0",
          }}
        >
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "0.78rem", marginBottom: 4 }}>
              Mã lô
            </label>
            <input
              type="text"
              className="form-control"
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "0.78rem", marginBottom: 4 }}>
              Hạn sử dụng
            </label>
            <input
              type="date"
              className="form-control"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "0.78rem", marginBottom: 4 }}>
              Giá vốn (VND)
            </label>
            <input
              type="number"
              min={0}
              className="form-control"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
            />
          </div>
          <button
            className="btn btn-secondary"
            style={{ padding: "8px 12px", fontSize: "0.82rem" }}
            onClick={onCancel}
            disabled={isLoading}
          >
            Hủy
          </button>
          <button
            className="btn btn-primary"
            style={{ padding: "8px 12px", fontSize: "0.82rem" }}
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function ProductBatchesModal({
  productId,
  productName,
  onClose,
}: ProductBatchesModalProps) {
  const { data: batches, isLoading } = useProductBatchesQuery(productId);
  const updateMutation = useUpdateProductBatchMutation();
  const [editingBatchId, setEditingBatchId] = useState<number | null>(null);

  const handleSave = async (
    batchId: number,
    payload: UpdateProductBatchPayload,
  ) => {
    await updateMutation.mutateAsync({ batchId, payload });
    setEditingBatchId(null);
  };

  return (
    <Modal onClose={onClose} maxWidth={720}>
      <ModalTitleBar title={`📦 Lô hàng — ${productName}`} onClose={onClose} />
      <div className="modal-content">
        <p
          style={{
            fontSize: "0.82rem",
            color: "var(--text-muted)",
            marginBottom: 16,
          }}
        >
          Sắp xếp theo nguyên tắc FEFO (hạn sử dụng sớm nhất lên đầu). Chỉ sửa
          được mã lô, hạn sử dụng và giá vốn — không thể xóa lô đã có biến động.
        </p>

        {isLoading ? (
          <div
            style={{
              textAlign: "center",
              padding: 32,
              color: "var(--text-muted)",
            }}
          >
            Đang tải danh sách lô...
          </div>
        ) : !batches || batches.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 32,
              color: "var(--text-muted)",
            }}
          >
            Sản phẩm này chưa có lô hàng nào.
          </div>
        ) : (
          <div
            className="table-container"
            style={{ maxHeight: 420, overflowY: "auto" }}
          >
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Mã lô</th>
                  <th>Hạn sử dụng</th>
                  <th>Đã nhập</th>
                  <th>Còn lại</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) =>
                  editingBatchId === b.id ? (
                    <EditRowForm
                      key={b.id}
                      batch={b}
                      onCancel={() => setEditingBatchId(null)}
                      onSave={(payload) => handleSave(b.id, payload)}
                      isLoading={updateMutation.isPending}
                    />
                  ) : (
                    <tr key={b.id}>
                      <td
                        style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                      >
                        {b.batch_code}
                      </td>
                      <td>{fmtDate(b.expiry_date)}</td>
                      <td>{b.quantity_received}</td>
                      <td style={{ fontWeight: 700 }}>
                        {b.quantity_remaining}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                          onClick={() => setEditingBatchId(b.id)}
                        >
                          Sửa
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
