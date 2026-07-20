import { useState, useRef, useEffect } from "react";
import { useShiftStore } from "@/features/shifts/stores/shift.store";
import { useProductBarcodeQuery } from "@/features/products/api/products.queries";
import {
  useCreateOrderMutation,
  useConfirmPaymentMutation,
} from "../api/orders.queries";
import type { CartItem, Order } from "../types";
import { notify } from "@/lib/notify";
import { ordersApi } from "../api/orders.api";
import { productsApi } from "@/features/products/api/products.api";
import { ReceiptPrintView } from "../components/ReceiptPrintView";
import { useBranchDetailQuery } from "@/features/branches/api/branches.queries";
import { useValidatePromotionMutation } from "@/features/promotions";
import { ApiError } from "@/lib/api-client";

export default function POSPage() {
  const { activeShift } = useShiftStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [fetchBarcode, setFetchBarcode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [promotionCode, setPromotionCode] = useState("");
  const [promotionMode, setPromotionMode] = useState<
    "none" | "manual" | "code"
  >("none");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "transfer"
  >("cash");
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [previewDiscount, setPreviewDiscount] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const validatePromoMutation = useValidatePromotionMutation();
  const [discountedItemsCount, setDiscountedItemsCount] = useState(0);

  const { data: branchDetail } = useBranchDetailQuery(
    completedOrder?.branch_id,
  );

  const handlePrint = () => {
    window.print();
  };

  const {
    data: scannedProduct,
    isFetching: isScanLoading,
    isError: isScanError,
  } = useProductBarcodeQuery(
    fetchBarcode,
    activeShift?.branch_id,
    !!fetchBarcode,
  );

  // When barcode query returns, add product to cart automatically
  useEffect(() => {
    if (!scannedProduct || !fetchBarcode) return;
    setCart((prev) => {
      const exists = prev.find((i) => i.product_id === scannedProduct.id);
      if (exists) {
        return prev.map((i) =>
          i.product_id === scannedProduct.id
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [
        ...prev,
        {
          product_id: scannedProduct.id,
          product_name: scannedProduct.name,
          barcode: scannedProduct.barcode || "",
          unit: scannedProduct.unit,
          unit_price: scannedProduct.effective_price,
          original_price: scannedProduct.sale_price,
          discount_percent: scannedProduct.discount_percent,
          quantity: 1,
        },
      ];
    });
    setFetchBarcode("");
    setPreviewDiscount(0);
    setPreviewError(null);
  }, [scannedProduct, fetchBarcode]);

  useEffect(() => {
    if (isScanError && fetchBarcode) {
      notify.error(`Không tìm thấy sản phẩm với barcode: ${fetchBarcode}`);
      setFetchBarcode("");
    }
  }, [isScanError, fetchBarcode]);

  const handleBarcodeSearch = () => {
    if (!barcodeInput.trim()) return;
    setFetchBarcode(barcodeInput.trim());
    setBarcodeInput("");
    setTimeout(() => barcodeRef.current?.focus(), 50);
  };

  const createOrderMutation = useCreateOrderMutation();
  const confirmPaymentMutation = useConfirmPaymentMutation();

  const updateQty = async (pid: number, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product_id !== pid));
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.product_id === pid ? { ...i, quantity: qty } : i)),
    );

    try {
      const quote = await productsApi.getProductQuote(pid, qty);
      setCart((prev) =>
        prev.map((i) =>
          i.product_id === pid
            ? {
                ...i,
                unit_price: quote.unit_price,
                original_price: quote.original_unit_price ?? i.original_price,
                discount_percent: quote.discount_percent ?? 0,
              }
            : i,
        ),
      );
    } catch {
      notify.error("Không lấy được báo giá mới nhất, vui lòng thử lại.");
    }
  };

  const effectiveDiscount =
    promotionMode === "manual"
      ? discount
      : promotionMode === "code"
        ? previewDiscount
        : 0;
  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const grossOriginal = cart.reduce(
    (s, i) => s + (i.original_price ?? i.unit_price) * i.quantity,
    0,
  );
  const expiryDiscountTotal = Math.max(0, grossOriginal - subtotal);
  const total = Math.max(0, subtotal - effectiveDiscount);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      notify.error("Giỏ hàng trống!");
      return;
    }
    if (!activeShift) {
      notify.error("Bạn cần mở ca làm việc trước!");
      return;
    }
    const order = await createOrderMutation.mutateAsync({
      payment_method: paymentMethod,
      discount_amount:
        promotionMode === "manual" ? discount || undefined : undefined,
      promotion_code:
        promotionMode === "code" ? promotionCode.trim() : undefined,
      items: cart.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
      })),
    });

    const countBeforeReset = cart.filter(
      (i) => (i.discount_percent ?? 0) > 0,
    ).length;

    setDiscountedItemsCount(countBeforeReset);
    setCompletedOrder(order);
    setCart([]);
    setDiscount(0);
    setPromotionCode("");
    setPromotionMode("none");
  };

  const handleCheckPromotionCode = async () => {
    if (!promotionCode.trim()) return;
    setPreviewError(null);
    try {
      const result = await validatePromoMutation.mutateAsync({
        code: promotionCode.trim(),
        amount: subtotal,
      });
      if (result.valid) {
        setPreviewDiscount(result.discount_amount);
      } else {
        setPreviewDiscount(0);
        setPreviewError(result.reason);
      }
    } catch (err) {
      console.error("[handleCheckPromotionCode] lỗi khi kiểm tra mã:", err);
      setPreviewDiscount(0);
      setPreviewError(
        err instanceof ApiError
          ? err.message
          : "Không kiểm tra được mã khuyến mãi. Vui lòng thử lại.",
      );
    }
  };

  useEffect(() => {
    setPreviewDiscount(0);
    setPreviewError(null);
  }, [promotionMode, subtotal]);

  const handleConfirmPayment = async (orderId: number) => {
    await confirmPaymentMutation.mutateAsync(orderId);
    setCompletedOrder(null);
  };

  // Polling order status if it's transfer (ZaloPay) and pending
  useEffect(() => {
    if (
      !completedOrder ||
      completedOrder.payment_status !== "pending" ||
      completedOrder.payment_method !== "transfer"
    ) {
      return;
    }

    let isSubscribed = true;
    const intervalId = setInterval(async () => {
      try {
        const freshOrder = await ordersApi.getOrderById(completedOrder.id);
        if (
          isSubscribed &&
          freshOrder &&
          freshOrder.payment_status === "paid"
        ) {
          setCompletedOrder(freshOrder);
          notify.success("Thanh toán ZaloPay thành công!");
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error("Lỗi khi polling trạng thái đơn hàng:", error);
      }
    }, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, [completedOrder]);

  return (
    <div className="pos-layout">
      {!activeShift && (
        <div
          className="card"
          style={{
            marginBottom: "16px",
            borderColor: "rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.05)",
          }}
        >
          ⚠️ <strong>Bạn chưa mở ca làm việc!</strong> Vui lòng vào trang{" "}
          <a href="/shifts">Quản lý Ca</a> để mở ca trước khi bán hàng.
        </div>
      )}

      <div className="pos-grid">
        {/* Left: Product Search & Cart */}
        <div className="pos-left">
          <div className="card" style={{ marginBottom: "16px" }}>
            <h3 style={{ marginBottom: "12px", fontSize: "1rem" }}>
              🔍 Tìm sản phẩm theo mã vạch
            </h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                ref={barcodeRef}
                type="text"
                className="form-control"
                placeholder="Nhập hoặc quét barcode, nhấn Enter..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBarcodeSearch()}
                disabled={!activeShift}
              />
              <button
                className="btn btn-primary"
                onClick={handleBarcodeSearch}
                disabled={!activeShift || isScanLoading}
                style={{ flexShrink: 0 }}
              >
                {isScanLoading ? "⏳" : "Tìm"}
              </button>
            </div>
          </div>

          {/* Cart */}
          <div
            className="card"
            style={{ flex: 1, padding: 0, overflow: "hidden" }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <h3 style={{ fontSize: "1rem" }}>
                🛒 Giỏ hàng ({cart.length} sản phẩm)
              </h3>
            </div>
            {cart.length === 0 ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                Quét barcode để thêm sản phẩm vào giỏ hàng
              </div>
            ) : (
              <div style={{ overflow: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Đơn giá</th>
                      <th>SL</th>
                      <th>Thành tiền</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => (
                      <tr key={item.product_id}>
                        <td>
                          <div
                            style={{ fontWeight: "600", fontSize: "0.9rem" }}
                          >
                            {item.product_name}
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            Mã vạch: {item.barcode}
                          </div>
                        </td>
                        <td>
                          {item.discount_percent &&
                          item.discount_percent > 0 ? (
                            <div>
                              <span
                                style={{
                                  textDecoration: "line-through",
                                  color: "var(--text-muted)",
                                  fontSize: "0.78rem",
                                }}
                              >
                                {item.original_price?.toLocaleString("vi-VN")} đ
                              </span>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: "var(--danger)",
                                }}
                              >
                                {item.unit_price.toLocaleString("vi-VN")} đ/
                                {item.unit}
                                <span
                                  className="badge badge-danger"
                                  style={{ marginLeft: 6, fontSize: "0.7rem" }}
                                >
                                  −{item.discount_percent}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span>
                              {item.unit_price.toLocaleString("vi-VN")} đ/
                              {item.unit}
                            </span>
                          )}
                        </td>

                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <button
                              className="btn btn-secondary"
                              style={{ padding: "2px 8px", fontSize: "1rem" }}
                              onClick={() =>
                                updateQty(item.product_id, item.quantity - 1)
                              }
                            >
                              −
                            </button>
                            <span
                              style={{
                                minWidth: "24px",
                                textAlign: "center",
                                fontWeight: "600",
                              }}
                            >
                              {item.quantity}
                            </span>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: "2px 8px", fontSize: "1rem" }}
                              onClick={() =>
                                updateQty(item.product_id, item.quantity + 1)
                              }
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td
                          style={{ fontWeight: "600", color: "var(--primary)" }}
                        >
                          {(item.unit_price * item.quantity).toLocaleString(
                            "vi-VN",
                          )}{" "}
                          đ
                        </td>
                        <td>
                          <button
                            className="btn btn-danger"
                            style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                            onClick={() => updateQty(item.product_id, 0)}
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {cart.some((i) => (i.discount_percent ?? 0) > 0) && (
            <div
              style={{
                marginBottom: 8,
                fontSize: "0.8rem",
                color: "var(--warning)",
              }}
            >
              🏷️ Đơn có{" "}
              {cart.filter((i) => (i.discount_percent ?? 0) > 0).length} sản
              phẩm đang áp giảm giá cận hạn/sự kiện (đã tính trong đơn giá bên
              dưới).
            </div>
          )}
        </div>

        {/* Right: Payment Panel */}
        <div className="pos-right">
          <div className="card">
            <h3 style={{ marginBottom: "20px" }}>💰 Thanh toán</h3>

            <div
              style={{
                marginBottom: "16px",
                padding: "16px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
              }}
            >
              {/* Giá gốc */}
              <div className="flex-row-between" style={{ marginBottom: "8px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Giá gốc:</span>
                <span>{grossOriginal.toLocaleString("vi-VN")} đ</span>
              </div>

              {/* Giảm giá cận hạn/sự kiện */}
              {expiryDiscountTotal > 0 && (
                <div style={{ marginBottom: "8px" }}>
                  <div style={{ color: "var(--danger)", fontSize: "0.9rem" }}>
                    Giảm giá cận hạn/sự kiện:
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      color: "var(--danger)",
                      fontWeight: 600,
                    }}
                  >
                    − {expiryDiscountTotal.toLocaleString("vi-VN")} đ
                  </div>
                </div>
              )}
              {/* Chọn cách giảm giá cả đơn — nhập tay hoặc theo mã khuyến mãi */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Giảm giá cho cả đơn (chọn 1 trong 2 cách)
                </label>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginBottom: "10px",
                  }}
                >
                  <button
                    type="button"
                    className={`btn ${promotionMode === "none" ? "btn-primary" : "btn-secondary"}`}
                    style={{
                      flex: "1 1 calc(33.33% - 6px)",
                      minWidth: "90px",
                      fontSize: "0.78rem",
                      padding: "8px 6px",
                    }}
                    onClick={() => {
                      setPromotionMode("none");
                      setDiscount(0);
                      setPromotionCode("");
                    }}
                  >
                    Không giảm
                  </button>
                  <button
                    type="button"
                    className={`btn ${promotionMode === "manual" ? "btn-primary" : "btn-secondary"}`}
                    style={{
                      flex: "1 1 calc(33.33% - 6px)",
                      minWidth: "90px",
                      fontSize: "0.78rem",
                      padding: "8px 6px",
                    }}
                    onClick={() => {
                      setPromotionMode("manual");
                      setPromotionCode("");
                    }}
                  >
                    Nhập tay
                  </button>
                  <button
                    type="button"
                    className={`btn ${promotionMode === "code" ? "btn-primary" : "btn-secondary"}`}
                    style={{
                      flex: "1 1 100%",
                      fontSize: "0.78rem",
                      padding: "8px 6px",
                    }}
                    onClick={() => {
                      setPromotionMode("code");
                      setDiscount(0);
                    }}
                  >
                    Mã khuyến mãi
                  </button>
                </div>

                {promotionMode === "manual" && (
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Số tiền giảm (VND)"
                    value={discount}
                    onChange={(e) =>
                      setDiscount(Math.max(0, Number(e.target.value)))
                    }
                  />
                )}

                {promotionMode === "code" && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: TET2026"
                      value={promotionCode}
                      onChange={(e) => {
                        setPromotionCode(e.target.value.toUpperCase());
                        setPreviewDiscount(0);
                        setPreviewError(null);
                      }}
                      style={{ textTransform: "uppercase" }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flexShrink: 0 }}
                      onClick={handleCheckPromotionCode}
                      disabled={
                        validatePromoMutation.isPending || !promotionCode.trim()
                      }
                    >
                      {validatePromoMutation.isPending ? "..." : "Kiểm tra"}
                    </button>
                  </div>
                )}

                {promotionMode === "code" && previewDiscount > 0 && (
                  <p
                    style={{
                      marginTop: 6,
                      fontSize: "0.8rem",
                      color: "var(--success)",
                    }}
                  >
                    Áp dụng được — giảm{" "}
                    {previewDiscount.toLocaleString("vi-VN")} đ
                  </p>
                )}
                {promotionMode === "code" && previewError && (
                  <p className="form-error" style={{ marginTop: 6 }}>
                    ❌ {previewError}
                  </p>
                )}
              </div>

              {/* Giảm giá cả đơn (kết quả áp dụng)*/}
              {effectiveDiscount > 0 && (
                <div style={{ marginBottom: "8px" }}>
                  <div style={{ color: "var(--danger)", fontSize: "0.9rem" }}>
                    Giảm giá cả đơn
                    {promotionMode === "code" && promotionCode
                      ? ` (${promotionCode})`
                      : ""}
                    :
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      color: "var(--danger)",
                      fontWeight: 600,
                    }}
                  >
                    − {effectiveDiscount.toLocaleString("vi-VN")} đ
                  </div>
                </div>
              )}

              {/* 4. Giá cuối */}
              <div
                className="flex-row-between"
                style={{
                  paddingTop: "12px",
                  borderTop: "1px solid var(--border-color)",
                }}
              >
                <span style={{ fontWeight: "700", fontSize: "1.1rem" }}>
                  Tổng thanh toán:
                </span>
                <span
                  style={{
                    fontWeight: "800",
                    fontSize: "1.4rem",
                    color: "var(--primary)",
                  }}
                >
                  {total.toLocaleString("vi-VN")} đ
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>Phương thức thanh toán</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {(["cash", "card", "transfer"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`btn ${paymentMethod === m ? "btn-primary" : "btn-secondary"}`}
                    style={{
                      flex: 1,
                      fontSize: "0.85rem",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                    }}
                    onClick={() => setPaymentMethod(m)}
                  >
                    {m === "cash" ? (
                      <>
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "1.1rem" }}
                        >
                          payments
                        </span>{" "}
                        Tiền mặt
                      </>
                    ) : m === "card" ? (
                      <>
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "1.1rem" }}
                        >
                          credit_card
                        </span>{" "}
                        Thẻ
                      </>
                    ) : (
                      <>
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "1.1rem" }}
                        >
                          qr_code_2
                        </span>{" "}
                        ZaloPay
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-success"
              style={{
                width: "100%",
                padding: "14px",
                fontSize: "1rem",
                marginTop: "8px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
              onClick={handleCheckout}
              disabled={
                cart.length === 0 ||
                createOrderMutation.isPending ||
                !activeShift
              }
            >
              {createOrderMutation.isPending ? (
                <>
                  <span className="material-symbols-outlined">
                    hourglass_empty
                  </span>{" "}
                  Đang xử lý...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">
                    check_circle
                  </span>{" "}
                  Xác nhận Thanh toán
                </>
              )}
            </button>

            <button
              className="btn btn-secondary"
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "0.9rem",
                marginTop: "8px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
              onClick={() => {
                setCart([]);
                setDiscount(0);
              }}
              disabled={cart.length === 0}
            >
              <span className="material-symbols-outlined">delete</span> Hủy giỏ
              hàng
            </button>
          </div>
        </div>
      </div>

      {/* Payment Result Modal */}
      {completedOrder && (
        <div className="modal-overlay">
          <div
            className="modal-box animate-slide-in"
            style={{ maxWidth: "480px" }}
          >
            <div
              className="modal-title-bar"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  color:
                    completedOrder.payment_status === "paid"
                      ? "var(--success)"
                      : "var(--warning)",
                }}
              >
                {completedOrder.payment_status === "paid"
                  ? "check_circle"
                  : "hourglass_top"}
              </span>
              <h3>
                {completedOrder.payment_status === "paid"
                  ? "Thanh toán thành công!"
                  : "Chờ thanh toán ZaloPay"}
              </h3>
            </div>
            <div className="modal-content" style={{ textAlign: "center" }}>
              <div
                style={{
                  marginBottom: "16px",
                  padding: "16px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "8px",
                  textAlign: "left",
                }}
              >
                <p style={{ marginBottom: 12 }}>
                  <strong>Mã đơn hàng:</strong> #{completedOrder.id}
                </p>

                {(() => {
                  const grossOriginal = completedOrder.items.reduce(
                    (sum, it) =>
                      sum +
                      (it.original_unit_price ?? it.unit_price) * it.quantity,
                    0,
                  );
                  const expiryDiscountTotal = completedOrder.items.reduce(
                    (sum, it) => {
                      if (!it.original_unit_price) return sum;
                      return (
                        sum +
                        (it.original_unit_price - it.unit_price) * it.quantity
                      );
                    },
                    0,
                  );

                  return (
                    <>
                      {/* 1. Giá gốc */}
                      <div
                        className="flex-row-between"
                        style={{ marginBottom: "8px" }}
                      >
                        <span style={{ color: "var(--text-secondary)" }}>
                          Giá gốc:
                        </span>
                        <span>{grossOriginal.toLocaleString("vi-VN")} đ</span>
                      </div>

                      {/* 2. Giảm giá cận hạn/sự kiện */}
                      {expiryDiscountTotal > 0 && (
                        <div style={{ marginBottom: "8px" }}>
                          <div
                            style={{
                              color: "var(--danger)",
                              fontSize: "0.9rem",
                            }}
                          >
                            Giảm giá cận hạn/sự kiện:
                          </div>
                          <div
                            style={{
                              textAlign: "right",
                              color: "var(--danger)",
                              fontWeight: 600,
                            }}
                          >
                            − {expiryDiscountTotal.toLocaleString("vi-VN")} đ
                          </div>
                        </div>
                      )}

                      {/* 3. Giảm giá cả đơn */}
                      {completedOrder.discount_amount > 0 && (
                        <div style={{ marginBottom: "8px" }}>
                          <div
                            style={{
                              color: "var(--danger)",
                              fontSize: "0.9rem",
                            }}
                          >
                            Giảm giá cả đơn
                            {completedOrder.promotion_code
                              ? ` (${completedOrder.promotion_code})`
                              : ""}
                            :
                          </div>
                          <div
                            style={{
                              textAlign: "right",
                              color: "var(--danger)",
                              fontWeight: 600,
                            }}
                          >
                            −{" "}
                            {completedOrder.discount_amount.toLocaleString(
                              "vi-VN",
                            )}{" "}
                            đ
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* 4. Giá cuối */}
                <div
                  className="flex-row-between"
                  style={{
                    paddingTop: "12px",
                    borderTop: "1px solid var(--border-color)",
                  }}
                >
                  <span style={{ fontWeight: 700 }}>Tổng tiền:</span>
                  <span style={{ fontWeight: 700, color: "var(--primary)" }}>
                    {completedOrder.total_amount.toLocaleString("vi-VN")} đ
                  </span>
                </div>

                <p style={{ marginTop: 12 }}>
                  <strong>Phương thức:</strong>{" "}
                  {completedOrder.payment_method === "cash"
                    ? "Tiền mặt"
                    : completedOrder.payment_method === "card"
                      ? "Thẻ"
                      : "ZaloPay QR"}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              {completedOrder.payment_status === "pending" && (
                <button
                  className="btn btn-success"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  onClick={() => handleConfirmPayment(completedOrder.id)}
                  disabled={confirmPaymentMutation.isPending}
                >
                  <span className="material-symbols-outlined">payments</span>
                  {confirmPaymentMutation.isPending
                    ? "Đang xác nhận..."
                    : "Xác nhận nhận tiền mặt"}
                </button>
              )}
              <button
                className="btn btn-secondary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                onClick={() => setCompletedOrder(null)}
              >
                <span className="material-symbols-outlined">close</span> Đóng
              </button>
              <button
                className="btn btn-secondary no-print"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={handlePrint}
              >
                <span className="material-symbols-outlined">print</span> In hóa
                đơn
              </button>
            </div>
            {completedOrder && (
              <ReceiptPrintView
                order={completedOrder}
                branchName={branchDetail?.name}
                branchAddress={branchDetail?.address}
                branchPhone={branchDetail?.phone}
                discountedItemsCount={discountedItemsCount}
              />
            )}
          </div>
        </div>
      )}

      <style>{`
        .pos-layout { display: flex; flex-direction: column; height: 100%; }
        .pos-grid { display: grid; grid-template-columns: 1fr 340px; gap: 16px; align-items: start; flex: 1; }
        .pos-left { display: flex; flex-direction: column; gap: 16px; }
        .pos-right { position: sticky; top: 86px; }
        @media (max-width: 900px) {
          .pos-grid { grid-template-columns: 1fr; }
          .pos-right { position: static; }
        }
      `}</style>
    </div>
  );
}
