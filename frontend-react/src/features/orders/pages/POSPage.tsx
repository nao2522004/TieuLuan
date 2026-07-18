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
import { ReceiptPrintView } from "../components/ReceiptPrintView";
import { useBranchDetailQuery } from "@/features/branches/api/branches.queries";

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

  const updateQty = (pid: number, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product_id !== pid));
    } else {
      setCart((prev) =>
        prev.map((i) => (i.product_id === pid ? { ...i, quantity: qty } : i)),
      );
    }
  };

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const total = Math.max(0, subtotal - discount);

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
    setCompletedOrder(order);
    setCart([]);
    setDiscount(0);
    setPromotionCode("");
    setPromotionMode("none");
  };

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
              <div className="flex-row-between" style={{ marginBottom: "8px" }}>
                <span style={{ color: "var(--text-secondary)" }}>
                  Tạm tính:
                </span>
                <span>{subtotal.toLocaleString("vi-VN")} đ</span>
              </div>
              <div className="flex-row-between" style={{ marginBottom: "8px" }}>
                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "0.9rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Áp dụng giảm giá
                  </label>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginBottom: "10px",
                    }}
                  >
                    <button
                      type="button"
                      className={`btn ${promotionMode === "none" ? "btn-primary" : "btn-secondary"}`}
                      style={{ flex: 1, fontSize: "0.82rem" }}
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
                      style={{ flex: 1, fontSize: "0.82rem" }}
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
                      style={{ flex: 1, fontSize: "0.82rem" }}
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
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: TET2026"
                      value={promotionCode}
                      onChange={(e) =>
                        setPromotionCode(e.target.value.toUpperCase())
                      }
                      style={{ textTransform: "uppercase" }}
                    />
                  )}
                </div>
                <input
                  type="number"
                  className="form-control"
                  style={{
                    width: "120px",
                    padding: "4px 8px",
                    fontSize: "0.9rem",
                    textAlign: "right",
                  }}
                  value={discount}
                  onChange={(e) =>
                    setDiscount(Math.max(0, Number(e.target.value)))
                  }
                />
              </div>
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
                <p>
                  <strong>Mã đơn hàng:</strong> #{completedOrder.id}
                </p>
                <p>
                  <strong>Tổng tiền:</strong>{" "}
                  {completedOrder.total_amount.toLocaleString("vi-VN")} đ
                </p>
                <p>
                  <strong>Phương thức:</strong>{" "}
                  {completedOrder.payment_method === "cash"
                    ? "Tiền mặt"
                    : completedOrder.payment_method === "card"
                      ? "Thẻ"
                      : "ZaloPay QR"}
                </p>
              </div>
              {completedOrder.qr_code &&
                completedOrder.payment_status === "pending" && (
                  <div style={{ marginBottom: "16px" }}>
                    <p
                      style={{
                        marginBottom: "8px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Quét mã QR bằng ứng dụng ZaloPay hoặc Ngân hàng:
                    </p>
                    <div
                      style={{
                        display: "inline-block",
                        background: "white",
                        padding: "8px",
                        borderRadius: "12px",
                        border: "1px solid var(--border-color)",
                        margin: "8px 0",
                      }}
                    >
                      <img
                        src={completedOrder.qr_code}
                        alt="ZaloPay QR Code"
                        style={{
                          width: "220px",
                          height: "220px",
                          display: "block",
                        }}
                      />
                    </div>
                    {completedOrder.qr_content && (
                      <div style={{ marginTop: "16px" }}>
                        <a
                          href={completedOrder.qr_content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            textDecoration: "none",
                          }}
                        >
                          <span className="material-symbols-outlined">
                            open_in_new
                          </span>{" "}
                          Mở cổng thanh toán ZaloPay
                        </a>
                      </div>
                    )}
                  </div>
                )}
              {completedOrder.payment_status === "paid" && (
                <div style={{ padding: "20px 0", color: "var(--success)" }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "4rem", marginBottom: "8px" }}
                  >
                    check_circle
                  </span>
                  <p style={{ fontWeight: "600", fontSize: "1.1rem" }}>
                    Đã nhận được thanh toán từ ZaloPay!
                  </p>
                </div>
              )}
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
