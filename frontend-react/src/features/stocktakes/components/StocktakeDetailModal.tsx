import { useEffect, useState } from "react";
import { Modal, ModalTitleBar } from "@/components/Modal";
import { ProductPicker } from "@/components/ProductPicker";
import { useProductDetailQuery, useProductBatchesQuery } from "@/features/products/api/products.queries";
import type { Product } from "@/features/products/types";
import {
  useStocktakeDetailQuery,
  useRecordStocktakeItemMutation,
  useRecordStocktakeItemsBulkMutation,
  useCloseStocktakeMutation,
  useRemoveStocktakeItemMutation,
} from "../api/stocktakes.queries";
import type { StocktakeItem } from "../types";
import { StocktakePrintView } from "./StocktakePrintView";

interface StocktakeDetailModalProps {
  stocktakeId: number;
  onClose: () => void;
}

function ItemRow({
  item,
  onLoaded,
  onEdit,
  onDelete,
  isOpen,
  isDeleting,
}: {
  item: StocktakeItem;
  onLoaded: (p: Product) => void;
  onEdit: (p: Product, item: StocktakeItem) => void;
  onDelete: (itemId: number) => void;
  isOpen: boolean;
  isDeleting: boolean;
}) {
  const { data: product } = useProductDetailQuery(item.product_id);

  useEffect(() => {
    if (product) onLoaded(product);
  }, [product, onLoaded]);

  const productName = item.product_name ?? product?.name ?? `Sản phẩm #${item.product_id}`;
  const barcode = item.product_barcode ?? product?.barcode;

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{productName}</div>
        {barcode && (
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Barcode: {barcode}
          </div>
        )}
        {item.batch_adjustments && item.batch_adjustments.length > 0 ? (
          <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
            {item.batch_adjustments.map((adj, aIdx) => (
              <div
                key={aIdx}
                style={{
                  fontSize: "0.74rem",
                  padding: "3px 7px",
                  borderRadius: 4,
                  background: adj.type === "OUT" ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
                  color: adj.type === "OUT" ? "#f87171" : "#34d399",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  width: "fit-content",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>
                  {adj.type === "OUT" ? "trending_down" : "trending_up"}
                </span>
                <span>
                  {adj.type === "OUT" ? "Lô bị giảm (xuất bớt):" : "Lô được cộng (nhập thêm):"}{" "}
                  <strong>{adj.batch_code}</strong> ({adj.type === "OUT" ? "-" : "+"}{adj.quantity} sp)
                  {adj.expiry_date && <span> · HSD: {adj.expiry_date}</span>}
                </span>
              </div>
            ))}
          </div>
        ) : item.batches && item.batches.length > 0 ? (
          <div style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>inventory_2</span>
            <span>
              Lô hiện có: <strong>{item.batches.map((b) => `${b.batch_code}${b.expiry_date ? ` (HSD: ${b.expiry_date})` : ""}`).join(", ")}</strong>
            </span>
          </div>
        ) : null}
      </td>
      <td>{item.system_quantity}</td>
      <td style={{ fontWeight: 700 }}>{item.counted_quantity}</td>
      <td
        style={{
          fontWeight: 700,
          color:
            item.difference === 0
              ? "var(--text-secondary)"
              : item.difference > 0
                ? "var(--success)"
                : "var(--danger)",
        }}
      >
        {item.difference > 0 ? "+" : ""}
        {item.difference}
      </td>
      {isOpen && (
        <td style={{ textAlign: "right" }}>
          <div className="flex-row-end" style={{ gap: 6 }}>
            {product && (
              <button
                className="btn btn-secondary"
                style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                onClick={() => onEdit(product, item)}
              >
                Sửa số đếm
              </button>
            )}
            <button
              className="btn btn-danger"
              style={{ padding: "4px 10px", fontSize: "0.78rem" }}
              disabled={isDeleting}
              onClick={() => {
                if (window.confirm("Xóa dòng đếm này khỏi phiên kiểm kê?")) {
                  onDelete(item.id);
                }
              }}
            >
              Xóa
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}

export function StocktakeDetailModal({
  stocktakeId,
  onClose,
}: StocktakeDetailModalProps) {
  const { data: stocktake, isLoading } = useStocktakeDetailQuery(stocktakeId);
  const recordMutation = useRecordStocktakeItemMutation(stocktakeId);
  const closeMutation = useCloseStocktakeMutation();

  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [countedQty, setCountedQty] = useState<number>(0);
  const [productCache, setProductCache] = useState<Record<number, Product>>({});

  const isOpen = stocktake?.status === "open";
  const items = stocktake?.items ?? [];

  const cacheProduct = (p: Product) =>
    setProductCache((prev) => (prev[p.id] ? prev : { ...prev, [p.id]: p }));

  const handleEditRow = (product: Product, item: StocktakeItem) => {
    setSelectedProduct(product);
    setCountedQty(item.counted_quantity);
  };

  const handleAddOrUpdate = async () => {
    if (!selectedProduct) return;
    await recordMutation.mutateAsync({
      product_id: selectedProduct.id,
      counted_quantity: countedQty,
    });
    setSelectedProduct(undefined);
    setCountedQty(0);
  };

  const handleClose = async () => {
    if (
      window.confirm(
        `Chốt phiên kiểm kê #${stocktakeId}? Tồn kho sẽ được cập nhật theo số đếm thực tế, không thể hoàn tác.`,
      )
    ) {
      await closeMutation.mutateAsync(stocktakeId);
    }
  };

  const removeItemMutation = useRemoveStocktakeItemMutation(stocktakeId);

  return (
    <Modal onClose={onClose} maxWidth={700}>
      <ModalTitleBar
        title={`📋 Phiên kiểm kê #${stocktakeId}`}
        onClose={onClose}
      />
      <div className="modal-content">
        {isLoading || !stocktake ? (
          <div
            style={{
              textAlign: "center",
              padding: 32,
              color: "var(--text-muted)",
            }}
          >
            Đang tải...
          </div>
        ) : (
          <>
            <div
              className="grid-cols-2"
              style={{ gap: 12, marginBottom: 16, fontSize: "0.9rem" }}
            >
              <div>
                <span style={{ color: "var(--text-secondary)" }}>
                  Chi nhánh
                </span>
                <div style={{ fontWeight: 700 }}>
                  {stocktake.branch_name ?? `#${stocktake.branch_id}`}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>
                  Trạng thái
                </span>
                <div>
                  {isOpen ? (
                    <span className="badge badge-success">Đang mở</span>
                  ) : (
                    <span className="badge badge-info">Đã chốt</span>
                  )}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>Người lập</span>
                <div style={{ fontWeight: 600 }}>
                  {stocktake.creator_name ?? `User #${stocktake.created_by}`}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>Mở lúc</span>
                <div>
                  {new Date(stocktake.created_at).toLocaleString("vi-VN")}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>Chốt lúc</span>
                <div>
                  {stocktake.closed_at
                    ? new Date(stocktake.closed_at).toLocaleString("vi-VN")
                    : "—"}
                </div>
              </div>
              {stocktake.note && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--text-secondary)" }}>
                    Ghi chú
                  </span>
                  <div>{stocktake.note}</div>
                </div>
              )}
            </div>

            {isOpen && (
              <div
                style={{
                  padding: 14,
                  marginBottom: 16,
                  background: "rgba(99,102,241,0.05)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <h4
                  style={{
                    fontSize: "0.85rem",
                    marginBottom: 10,
                    color: "var(--text-secondary)",
                  }}
                >
                  Thêm / sửa số đếm sản phẩm
                </h4>
                <div style={{ marginBottom: 10 }}>
                  <ProductPicker
                    branchId={stocktake.branch_id}
                    value={selectedProduct}
                    onChange={(p) => {
                      setSelectedProduct(p);
                      setCountedQty(p.stock_quantity);
                    }}
                    onClear={() => setSelectedProduct(undefined)}
                  />
                </div>
                {selectedProduct && (
                  <>
                    <BatchInspectorPanel
                      productId={selectedProduct.id}
                      onTotalCountedChange={(total) => setCountedQty(total)}
                    />
                    <div
                      style={{ display: "flex", gap: 10, alignItems: "flex-end", marginTop: 12 }}
                    >
                      <div style={{ flex: 1 }}>
                        <label
                          style={{
                            fontSize: "0.8rem",
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          Tổng số lượng đếm thực tế (Tồn kho sản phẩm) *
                        </label>
                        <input
                          type="number"
                          min={0}
                          className="form-control"
                          value={countedQty}
                          onChange={(e) =>
                            setCountedQty(Math.max(0, Number(e.target.value)))
                          }
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleAddOrUpdate}
                        disabled={recordMutation.isPending}
                      >
                        {recordMutation.isPending ? "Đang lưu..." : "Lưu số đếm"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {items.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 24,
                  color: "var(--text-muted)",
                  fontSize: "0.9rem",
                }}
              >
                Chưa có sản phẩm nào được đếm trong phiên này.
              </div>
            ) : (
              <div
                className="table-container"
                style={{ maxHeight: 320, overflowY: "auto" }}
              >
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Tồn hệ thống</th>
                      <th>Đếm thực tế</th>
                      <th>Chênh lệch</th>
                      {isOpen && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        onLoaded={cacheProduct}
                        onEdit={handleEditRow}
                        onDelete={(itemId) => removeItemMutation.mutate(itemId)}
                        isOpen={isOpen}
                        isDeleting={removeItemMutation.isPending}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {stocktake.skipped_items && stocktake.skipped_items.length > 0 && (
              <div
                style={{
                  padding: 12,
                  marginBottom: 16,
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.82rem",
                }}
              >
                <strong>
                  ⚠️ {stocktake.skipped_items.length} sản phẩm bị bỏ qua khi
                  chốt phiên
                </strong>
                <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                  {stocktake.skipped_items.map((s) => (
                    <li key={s.product_id}>
                      Sản phẩm #{s.product_id}: {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex-row-between" style={{ marginTop: 20, gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => window.print()}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>
                  print
                </span>
                In biên bản kiểm kê
              </button>

              <div className="flex-row-end" style={{ gap: 10 }}>
                {isOpen ? (
                  <>
                    <button className="btn btn-secondary" onClick={onClose}>
                      Đóng cửa sổ (giữ phiên mở)
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={handleClose}
                      disabled={closeMutation.isPending || items.length === 0}
                      title={
                        items.length === 0
                          ? "Cần đếm ít nhất 1 sản phẩm trước khi chốt"
                          : undefined
                      }
                    >
                      {closeMutation.isPending
                        ? "Đang chốt..."
                        : "🔒 Chốt phiên kiểm kê"}
                    </button>
                  </>
                ) : (
                  <button className="btn btn-secondary" onClick={onClose}>
                    Đóng
                  </button>
                )}
              </div>
            </div>

            {/* Hidden printable report component */}
            <StocktakePrintView stocktake={stocktake} />
          </>
        )}
      </div>
    </Modal>
  );
}

function BatchInspectorPanel({
  productId,
  onTotalCountedChange,
}: {
  productId: number;
  onTotalCountedChange: (total: number) => void;
}) {
  const { data: batches, isLoading } = useProductBatchesQuery(productId);
  const [batchCounts, setBatchCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    if (batches && batches.length > 0) {
      const initial: Record<number, number> = {};
      batches.forEach((b) => {
        initial[b.id] = b.quantity_remaining;
      });
      setBatchCounts(initial);
      const total = batches.reduce((sum, b) => sum + b.quantity_remaining, 0);
      onTotalCountedChange(total);
    }
  }, [batches]);

  const handleBatchChange = (batchId: number, val: number) => {
    const next = { ...batchCounts, [batchId]: val };
    setBatchCounts(next);
    const total = Object.values(next).reduce((a, b) => a + b, 0);
    onTotalCountedChange(total);
  };

  if (isLoading) {
    return (
      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 6 }}>
        ⏳ Đang tải thông tin lô hàng...
      </div>
    );
  }

  if (!batches || batches.length === 0) {
    return (
      <div
        style={{
          fontSize: "0.8rem",
          color: "var(--text-muted)",
          marginTop: 6,
          fontStyle: "italic",
        }}
      >
        Sản phẩm chưa ghi nhận lô hàng riêng lẻ, nhập tổng số đếm ở ô bên dưới.
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 10,
        padding: "10px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 6,
        border: "1px dashed var(--border-color)",
      }}
    >
      <div
        style={{
          fontSize: "0.8rem",
          fontWeight: 700,
          marginBottom: 6,
          color: "var(--primary)",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: "0.95rem" }}
        >
          inventory_2
        </span>
        Chi tiết các lô hàng hiện có ({batches.length} lô) - nhập số đếm từng lô:
      </div>
      <div
        className="table-container"
        style={{ maxHeight: 180, overflowY: "auto" }}
      >
        <table className="table" style={{ margin: 0, fontSize: "0.78rem" }}>
          <thead>
            <tr>
              <th>Mã lô</th>
              <th>HSD</th>
              <th style={{ textAlign: "right" }}>Tồn hệ thống</th>
              <th style={{ textAlign: "right", width: 130 }}>Số đếm thực tế</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id}>
                <td style={{ fontWeight: 600 }}>{b.batch_code}</td>
                <td>
                  {b.expiry_date
                    ? new Date(b.expiry_date).toLocaleDateString("vi-VN")
                    : "—"}
                </td>
                <td style={{ textAlign: "right" }}>{b.quantity_remaining}</td>
                <td style={{ textAlign: "right" }}>
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    style={{
                      padding: "2px 6px",
                      fontSize: "0.78rem",
                      textAlign: "right",
                    }}
                    value={batchCounts[b.id] ?? b.quantity_remaining}
                    onChange={(e) =>
                      handleBatchChange(b.id, Math.max(0, Number(e.target.value)))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
