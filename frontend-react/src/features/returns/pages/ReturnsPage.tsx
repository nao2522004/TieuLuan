import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useOrderDetailQuery } from "@/features/orders/api/orders.queries";
import { useProductBarcodeQuery } from "@/features/products/api/products.queries";
import {
  useCreateReturnMutation,
  useReturnsQuery,
} from "../api/returns.queries";
import { useShiftStore } from "@/features/shifts/stores/shift.store";
import type { OrderItem } from "@/features/orders/types";

const returnSchema = z.object({
  order_item_id: z.coerce.number().min(1, "Chọn dòng sản phẩm cần trả"),
  quantity: z.coerce.number().min(1, "Số lượng trả phải >= 1"),
  reason: z.string().max(255).optional().or(z.literal("")),
});
type ReturnFormValues = z.infer<typeof returnSchema>;

function fmt(n: number) {
  return n.toLocaleString("vi-VN");
}
function fmtDate(s: string) {
  return new Date(s).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReturnsPage() {
  const { activeShift } = useShiftStore();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [activeBarcode, setActiveBarcode] = useState("");
  const [orderIdInput, setOrderIdInput] = useState("");
  const [searchOrderId, setSearchOrderId] = useState<number | undefined>();
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const [successResult, setSuccessResult] = useState<{
    refund_amount: number;
    item_name: string | null;
  } | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  // --- queries ---
  const productQuery = useProductBarcodeQuery(
    activeBarcode,
    undefined,
    !!activeBarcode,
  );
  const orderQuery = useOrderDetailQuery(searchOrderId);
  const returnsQuery = useReturnsQuery({ limit: 20 });
  const createMutation = useCreateReturnMutation();

  const matchedItems: OrderItem[] = (() => {
    if (!orderQuery.data?.items) return [];
    if (!productQuery.data) return orderQuery.data.items;
    return orderQuery.data.items.filter(
      (i) => i.product_id === productQuery.data!.id,
    );
  })();

  // --- form ---
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ReturnFormValues>({
    resolver: zodResolver(returnSchema),
    defaultValues: { order_item_id: undefined, quantity: 1, reason: "" },
  });

  const watchedItemId = watch("order_item_id");
  const watchedQty = watch("quantity");
  const rawRefund = selectedItem
    ? selectedItem.unit_price * Math.max(0, Number(watchedQty))
    : 0;
  const isCashOrder = orderQuery.data?.payment_method === "cash";
  const estimatedRefund = isCashOrder
    ? Math.ceil(rawRefund / 1000) * 1000
    : rawRefund;

  // sync selectedItem when order_item_id changes
  useEffect(() => {
    if (!watchedItemId || !orderQuery.data?.items) {
      setSelectedItem(null);
      return;
    }
    const found = orderQuery.data.items.find(
      (i) => i.id === Number(watchedItemId),
    );
    setSelectedItem(found ?? null);
  }, [watchedItemId, orderQuery.data]);

  const handleBarcodeSearch = () => {
    const code = barcodeInput.trim();
    if (!code) return;

    const orderMatch = code.match(/^(?:\(400\)|400)\d{6}\d{3}(\d{6})$/i);
    if (orderMatch) {
      const id = parseInt(orderMatch[1], 10);
      if (!isNaN(id)) {
        setSearchOrderId(id);
        setOrderIdInput(String(id));
        setActiveBarcode("");
        setBarcodeInput("");
        setSelectedItem(null);
        setValue("order_item_id", undefined as unknown as number);
        return;
      }
    }

    setActiveBarcode(code);
    setSelectedItem(null);
    setValue("order_item_id", undefined as unknown as number);
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBarcodeSearch();
    }
  };

  const handleOrderSearch = () => {
    const id = parseInt(orderIdInput);
    if (!isNaN(id) && id > 0) {
      setSearchOrderId(id);
      setSelectedItem(null);
      setValue("order_item_id", undefined as unknown as number);
    }
  };

  const handleSelectItem = (item: OrderItem) => {
    setSelectedItem(item);
    setValue("order_item_id", item.id, { shouldValidate: true });
    setValue("quantity", 1, { shouldValidate: false });
  };

  const onSubmit = async (values: ReturnFormValues) => {
    if (!selectedItem) return;
    try {
      const result = await createMutation.mutateAsync({
        order_item_id: values.order_item_id,
        quantity: values.quantity,
        reason: values.reason || undefined,
      });
      setSuccessResult({
        refund_amount: result.refund_amount,
        item_name: selectedItem.product_name,
      });
      // reset form but keep barcode context
      reset();
      setSelectedItem(null);
      setValue("order_item_id", undefined as unknown as number);
    } catch {
      // lỗi đã được toast bởi api-client interceptor
    }
  };

  const handleFullReset = () => {
    setBarcodeInput("");
    setActiveBarcode("");
    setOrderIdInput("");
    setSearchOrderId(undefined);
    setSelectedItem(null);
    setSuccessResult(null);
    reset();
    barcodeRef.current?.focus();
  };

  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
    >
      {/* ── Header ── */}
      <div className="card-header">
        <div>
          <h2>↩️ Xử lý Trả hàng</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
            Quét mã vạch trên hóa đơn hoặc quét mã vạch sản phẩm để tra cứu
            nhanh thông tin trả hàng
          </p>
        </div>
      </div>

      {!activeShift && (
        <div
          className="alert alert-warning"
          style={{
            borderColor: "rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.05)",
          }}
        >
          ⚠️ <strong>Bạn chưa mở ca làm việc!</strong> Vui lòng vào trang{" "}
          <a href="/shifts">Quản lý Ca</a> để mở ca trước khi xử lý trả hàng.
        </div>
      )}

      {/* ── Main: 2 columns ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* LEFT: Unified Lookup Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="card" style={{ padding: "20px" }}>
            <h3
              style={{
                marginBottom: "12px",
                fontSize: "0.95rem",
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              🔍 Tra cứu đơn hàng & Sản phẩm trả
            </h3>

            {/* Unified search bar */}
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  ref={barcodeRef}
                  type="text"
                  className="form-control"
                  placeholder="Quét mã vạch HĐ / SP hoặc nhập Mã đơn hàng (VD: 42)..."
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value);
                    setOrderIdInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleBarcodeSearch();
                    }
                  }}
                  autoFocus
                  style={{
                    fontFamily: "monospace",
                    letterSpacing: "0.03em",
                    paddingRight: barcodeInput ? "36px" : "12px",
                  }}
                />
                {barcodeInput && (
                  <button
                    type="button"
                    onClick={handleFullReset}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                    title="Xóa tìm kiếm"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                className="btn btn-primary"
                onClick={handleBarcodeSearch}
                style={{ flexShrink: 0, gap: "6px" }}
              >
                🔍 Tra cứu
              </button>
            </div>

            <p
              style={{
                margin: "8px 0 0",
                fontSize: "0.78rem",
                color: "var(--text-muted)",
              }}
            >
              💡 Nhập <strong>Mã đơn hàng</strong> (VD: 42), quét <strong>Mã vạch hóa đơn</strong> hoặc <strong>Mã vạch sản phẩm</strong>.
            </p>

            {/* Loading & Error States */}
            {(productQuery.isLoading || orderQuery.isLoading) && (
              <div
                style={{
                  marginTop: 14,
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                ⏳ Đang tra cứu thông tin dữ liệu...
              </div>
            )}
            {productQuery.isError && (
              <div
                style={{
                  marginTop: 12,
                  color: "var(--danger)",
                  fontSize: "0.85rem",
                }}
              >
                ❌ Không tìm thấy sản phẩm với mã vạch này.
              </div>
            )}
            {orderQuery.isError && (
              <div
                style={{
                  marginTop: 12,
                  color: "var(--danger)",
                  fontSize: "0.85rem",
                }}
              >
                ❌ Không tìm thấy đơn hàng tương ứng.
              </div>
            )}

            {/* Product scan summary tag */}
            {productQuery.data && (
              <div
                style={{
                  marginTop: 14,
                  padding: "10px 14px",
                  background: "rgba(99,102,241,0.08)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>
                    📦 {productQuery.data.name}
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-secondary)",
                      marginTop: 2,
                    }}
                  >
                    ĐVT: {productQuery.data.unit} · Mã vạch: {productQuery.data.barcode}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: "var(--primary)" }}>
                  {fmt(productQuery.data.sale_price)} đ
                </div>
              </div>
            )}

            {/* Order Detail & Items List */}
            {orderQuery.data && (
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop: "1px dashed var(--border-color)",
                }}
              >
                {/* Order Meta Card Header */}
                <div
                  style={{
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-color)",
                    marginBottom: 14,
                  }}
                >
                  <div className="flex-row-between" style={{ marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--primary)" }}>
                      🧾 Đơn hàng #{orderQuery.data.id}
                    </span>
                    <span
                      className={`badge ${
                        orderQuery.data.payment_method === "cash"
                          ? "badge-success"
                          : orderQuery.data.payment_method === "transfer"
                            ? "badge-info"
                            : "badge-primary"
                      }`}
                      style={{ fontSize: "0.78rem" }}
                    >
                      {orderQuery.data.payment_method === "cash"
                        ? "💵 Tiền mặt"
                        : orderQuery.data.payment_method === "transfer"
                          ? "🏦 Chuyển khoản"
                          : "💳 Thẻ POS"}
                    </span>
                  </div>
                  <div className="flex-row-between" style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    <span>Thời gian: {fmtDate(orderQuery.data.created_at)}</span>
                    <span>
                      Tổng tiền:{" "}
                      <strong>
                        {orderQuery.data.payment_method === "cash" &&
                        (orderQuery.data.rounding_amount ?? 0) > 0 ? (
                          <span>
                            <span
                              style={{
                                textDecoration: "line-through",
                                color: "var(--text-muted)",
                                marginRight: 4,
                              }}
                            >
                              {fmt(orderQuery.data.total_amount)}đ
                            </span>
                            {fmt(
                              orderQuery.data.rounded_total ??
                                Math.ceil(orderQuery.data.total_amount / 1000) * 1000,
                            )} đ
                          </span>
                        ) : (
                          `${fmt(orderQuery.data.total_amount)} đ`
                        )}
                      </strong>
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    marginBottom: 8,
                    color: "var(--text-secondary)",
                  }}
                >
                  Danh sách sản phẩm trong đơn ({matchedItems.length}):
                </div>

                {matchedItems.length === 0 ? (
                  <div style={{ color: "var(--warning)", fontSize: "0.85rem", padding: "10px 0" }}>
                    ⚠️ Đơn hàng này không chứa sản phẩm vừa quét mã vạch.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {matchedItems.map((item) => {
                      const isSelected = selectedItem?.id === item.id;
                      const returnedQty = item.returned_quantity ?? 0;
                      const remainingQty = Math.max(0, item.quantity - returnedQty);
                      const isFullyReturned = remainingQty === 0;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={isFullyReturned}
                          onClick={() => !isFullyReturned && handleSelectItem(item)}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px 14px",
                            borderRadius: "var(--radius-sm)",
                            cursor: isFullyReturned ? "not-allowed" : "pointer",
                            opacity: isFullyReturned ? 0.6 : 1,
                            border: isSelected
                              ? "1.5px solid var(--primary)"
                              : "1px solid var(--border-color)",
                            background: isSelected
                              ? "rgba(99,102,241,0.12)"
                              : isFullyReturned
                                ? "rgba(255,255,255,0.01)"
                                : "rgba(255,255,255,0.03)",
                            color: "var(--text-primary)",
                            width: "100%",
                            textAlign: "left",
                            transition: "all var(--transition-fast)",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                              {item.product_name ?? `SP #${item.product_id}`}
                            </div>
                            <div
                              style={{
                                fontSize: "0.78rem",
                                color: "var(--text-muted)",
                                marginTop: 3,
                              }}
                            >
                              Item #{item.id} · SL mua: <strong>{item.quantity}</strong>
                              {returnedQty > 0 && (
                                <span>
                                  {" "}· Đã trả:{" "}
                                  <strong style={{ color: "var(--danger)" }}>
                                    {returnedQty}
                                  </strong>
                                </span>
                              )}
                              {remainingQty > 0 && (
                                <span>
                                  {" "}· Có thể trả:{" "}
                                  <strong style={{ color: "var(--success)" }}>
                                    {remainingQty}
                                  </strong>
                                </span>
                              )}
                              <span> · {fmt(item.unit_price)} đ/sp</span>
                            </div>
                            {item.batches && item.batches.length > 0 && (
                              <div
                                style={{
                                  fontSize: "0.76rem",
                                  color: "var(--primary)",
                                  marginTop: 4,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <span
                                  className="material-symbols-outlined"
                                  style={{ fontSize: "0.85rem" }}
                                >
                                  inventory_2
                                </span>
                                <span>
                                  Lô hàng:{" "}
                                  <strong>
                                    {item.batches
                                      .map(
                                        (b) =>
                                          `${b.batch_code}${b.expiry_date ? ` (HSD: ${b.expiry_date})` : ""}`,
                                      )
                                      .join(", ")}
                                  </strong>
                                </span>
                              </div>
                            )}
                          </div>
                          {isFullyReturned ? (
                            <span
                              className="badge badge-secondary"
                              style={{ fontSize: "0.72rem" }}
                            >
                              Đã trả đủ
                            </span>
                          ) : isSelected ? (
                            <span
                              style={{
                                color: "var(--primary)",
                                fontWeight: 700,
                                fontSize: "1.1rem",
                              }}
                            >
                              ✓
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Return form */}
        <div className="card">
          <h3
            style={{
              marginBottom: "20px",
              fontSize: "0.95rem",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            ↩️ Thông tin & Xác nhận trả hàng
          </h3>

          {/* Selected item summary */}
          {selectedItem ? (
            <div
              style={{
                padding: "12px 14px",
                marginBottom: 20,
                background: "rgba(16,185,129,0.08)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid rgba(16,185,129,0.2)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {selectedItem.product_name ??
                  `Sản phẩm #${selectedItem.product_id}`}
              </div>
              <div
                style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}
              >
                Item #{selectedItem.id} · Đã mua:{" "}
                <strong>{selectedItem.quantity}</strong> sp
                {(selectedItem.returned_quantity ?? 0) > 0 && (
                  <span>
                    {" "}
                    · Đã trả:{" "}
                    <strong style={{ color: "var(--danger)" }}>
                      {selectedItem.returned_quantity}
                    </strong>{" "}
                    sp
                  </span>
                )}
                {" · "}Có thể trả:{" "}
                <strong style={{ color: "var(--success)" }}>
                  {Math.max(
                    0,
                    selectedItem.quantity -
                      (selectedItem.returned_quantity ?? 0),
                  )}
                </strong>{" "}
                sp
                {" · "}Đơn giá:{" "}
                <strong>{fmt(selectedItem.unit_price)} đ</strong>
              </div>
              {selectedItem.batches && selectedItem.batches.length > 0 && (
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--primary)",
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: "1px dashed rgba(16,185,129,0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "0.9rem" }}
                  >
                    inventory_2
                  </span>
                  <span>
                    Lô hàng áp dụng:{" "}
                    <strong>
                      {selectedItem.batches
                        .map(
                          (b) =>
                            `${b.batch_code}${b.expiry_date ? ` (HSD: ${b.expiry_date})` : ""}`,
                        )
                        .join(", ")}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: "12px 14px",
                marginBottom: 20,
                background: "rgba(255,255,255,0.03)",
                borderRadius: "var(--radius-sm)",
                border: "1px dashed var(--border-color)",
                color: "var(--text-muted)",
                fontSize: "0.85rem",
                textAlign: "center",
              }}
            >
              ← Chọn dòng sản phẩm từ đơn hàng bên trái
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            {/* hidden field – set via handleSelectItem */}
            <input type="hidden" {...register("order_item_id")} />
            {errors.order_item_id && (
              <p className="form-error">⚠️ {errors.order_item_id.message}</p>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="return_qty">Số lượng trả *</label>
              <input
                id="return_qty"
                type="number"
                className="form-control"
                min={1}
                max={
                  selectedItem
                    ? Math.max(
                        1,
                        selectedItem.quantity -
                          (selectedItem.returned_quantity ?? 0),
                      )
                    : 1
                }
                {...register("quantity")}
              />
              {selectedItem && (
                <p
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    marginTop: 4,
                  }}
                >
                  Tối đa có thể trả:{" "}
                  <strong>
                    {Math.max(
                      0,
                      selectedItem.quantity -
                        (selectedItem.returned_quantity ?? 0),
                    )}
                  </strong>{" "}
                  sp
                </p>
              )}
              {errors.quantity && (
                <p className="form-error">{errors.quantity.message}</p>
              )}
            </div>

            {/* Estimated refund preview */}
            {estimatedRefund > 0 && (
              <div
                style={{
                  padding: "12px 14px",
                  background: "rgba(16,185,129,0.08)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid rgba(16,185,129,0.2)",
                }}
              >
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  💰 Ước tính hoàn tiền:{" "}
                  <strong
                    style={{ color: "var(--success)", fontSize: "1.1rem" }}
                  >
                    {fmt(estimatedRefund)} đ
                  </strong>
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Số tiền thực tế do backend tính từ giá snapshot
                </p>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="return_reason">Lý do trả hàng</label>
              <textarea
                id="return_reason"
                className="form-control"
                rows={3}
                placeholder="VD: Sản phẩm bị lỗi, hết hạn sử dụng..."
                style={{ resize: "vertical", fontFamily: "var(--font-sans)" }}
                {...register("reason")}
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                type="submit"
                className="btn btn-warning"
                style={{ flex: 1, padding: "12px" }}
                disabled={
                  createMutation.isPending || !selectedItem || !activeShift
                }
                title={
                  !activeShift
                    ? "Vui lòng mở ca làm việc trước khi xử lý trả hàng"
                    : undefined
                }
              >
                {createMutation.isPending
                  ? "⏳ Đang xử lý..."
                  : "↩️ Xác nhận trả hàng"}
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-secondary)",
                }}
                onClick={handleFullReset}
                title="Làm mới"
              >
                🔄
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Return History ── */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3
            style={{
              fontSize: "0.95rem",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            📋 Lịch sử trả hàng gần đây
          </h3>
          <button
            className="btn"
            style={{
              fontSize: "0.8rem",
              padding: "6px 12px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border-color)",
              color: "var(--text-muted)",
            }}
            onClick={() => returnsQuery.refetch()}
            disabled={returnsQuery.isFetching}
          >
            {returnsQuery.isFetching ? "⏳" : "↺"} Làm mới
          </button>
        </div>

        {returnsQuery.isLoading && (
          <div
            style={{
              textAlign: "center",
              padding: "24px",
              color: "var(--text-muted)",
            }}
          >
            Đang tải lịch sử...
          </div>
        )}
        {returnsQuery.isError && (
          <div style={{ color: "var(--danger)", fontSize: "0.85rem" }}>
            ❌ Không thể tải lịch sử trả hàng.
          </div>
        )}
        {returnsQuery.data &&
          (returnsQuery.data.data.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "24px",
                color: "var(--text-muted)",
                fontSize: "0.9rem",
              }}
            >
              Chưa có giao dịch trả hàng nào.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Item ID</th>
                    <th>SL trả</th>
                    <th>Hoàn tiền</th>
                    <th>Lý do</th>
                    <th>Nhân viên</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {returnsQuery.data.data.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700, color: "var(--primary)" }}>
                        #{r.id}
                      </td>
                      <td>Item #{r.order_item_id}</td>
                      <td>{r.quantity}</td>
                      <td style={{ fontWeight: 600, color: "var(--success)" }}>
                        {fmt(r.refund_amount)} đ
                      </td>
                      <td
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.85rem",
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.reason ?? "—"}
                      </td>
                      <td>{r.created_by_name ?? `NV #${r.created_by}`}</td>
                      <td
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {fmtDate(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {returnsQuery.data.meta && (
                <p
                  style={{
                    marginTop: 10,
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    textAlign: "right",
                  }}
                >
                  Hiển thị {returnsQuery.data.data.length} /{" "}
                  {returnsQuery.data.meta.total_items} giao dịch
                </p>
              )}
            </div>
          ))}
      </div>

      {/* ── Success modal ── */}
      {successResult && (
        <div className="modal-overlay">
          <div
            className="modal-box animate-slide-in"
            style={{ maxWidth: 400, textAlign: "center" }}
          >
            <div className="modal-content">
              <div style={{ fontSize: "3.5rem", marginBottom: 12 }}>✅</div>
              <h3 style={{ marginBottom: 8 }}>Trả hàng thành công!</h3>
              {successResult.item_name && (
                <p
                  style={{
                    color: "var(--text-secondary)",
                    marginBottom: 8,
                    fontSize: "0.9rem",
                  }}
                >
                  {successResult.item_name}
                </p>
              )}
              <p style={{ color: "var(--text-muted)", marginBottom: 4 }}>
                Số tiền hoàn trả:
              </p>
              <h2
                style={{
                  fontSize: "2rem",
                  color: "var(--success)",
                  margin: "6px 0 20px",
                }}
              >
                {fmt(successResult.refund_amount)} đ
              </h2>
            </div>
            <div
              className="modal-footer"
              style={{ justifyContent: "center", gap: 10 }}
            >
              <button
                className="btn btn-primary"
                onClick={() => setSuccessResult(null)}
              >
                Đóng
              </button>
              <button
                className="btn"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-secondary)",
                }}
                onClick={handleFullReset}
              >
                Trả hàng tiếp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
