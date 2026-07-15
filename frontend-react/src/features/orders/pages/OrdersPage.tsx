import { useState } from "react";
import { useAuth } from "@/features/auth";
import { useOrdersQuery, useCancelOrderMutation, useConfirmPaymentMutation } from "../api/orders.queries";

export default function OrdersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: response, isLoading } = useOrdersQuery({ page, limit });
  const orders = response?.data || [];
  const meta = response?.meta;

  const cancelMutation = useCancelOrderMutation();
  const confirmMutation = useConfirmPaymentMutation();

  const statusLabel = (s: string) =>
    s === "completed" ? <span className="badge badge-success">Hoàn thành</span> :
    <span className="badge badge-danger">Đã hủy</span>;

  const paymentStatusLabel = (s: string) =>
    s === "paid" ? <span className="badge badge-success">Đã thanh toán</span> :
    <span className="badge badge-warning">Chờ xác nhận</span>;

  const methodLabel = (m: string) =>
    m === "cash" ? "💵 Tiền mặt" : m === "card" ? "💳 Thẻ" : "📱 Chuyển khoản";

  return (
    <div className="animate-fade-in">
      <div className="card-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2>📋 Lịch sử Đơn hàng</h2>
          <p>Xem và quản lý các đơn hàng đã tạo</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>Đang tải...</div>
      ) : orders.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
          Chưa có đơn hàng nào.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã ĐH</th>
                  <th>Thời gian</th>
                  <th>Phương thức</th>
                  <th>Trạng thái</th>
                  <th>Thanh toán</th>
                  <th>Giảm giá</th>
                  <th>Tổng tiền</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: "700", color: "var(--primary)" }}>#{order.id}</td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {new Date(order.created_at).toLocaleString("vi-VN")}
                    </td>
                    <td style={{ fontSize: "0.9rem" }}>{methodLabel(order.payment_method)}</td>
                    <td>{statusLabel(order.status)}</td>
                    <td>{paymentStatusLabel(order.payment_status)}</td>
                    <td>{order.discount_amount > 0 ? `${order.discount_amount.toLocaleString("vi-VN")} đ` : "—"}</td>
                    <td style={{ fontWeight: "700" }}>{order.total_amount.toLocaleString("vi-VN")} đ</td>
                    <td style={{ textAlign: "right" }}>
                      <div className="flex-row-end" style={{ gap: "6px" }}>
                        {order.payment_status === "pending" && order.status !== "cancelled" && (
                          <button
                            className="btn btn-success"
                            style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                            onClick={() => confirmMutation.mutate(order.id)}
                          >
                            Xác nhận TT
                          </button>
                        )}
                        {order.status !== "cancelled" && (isAdmin || order.created_by === user?.id) && (
                          <button
                            className="btn btn-danger"
                            style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                            onClick={() => {
                              if (window.confirm("Bạn có chắc muốn hủy đơn hàng này?")) {
                                cancelMutation.mutate(order.id);
                              }
                            }}
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.total_pages > 1 && (
            <div className="flex-row-between" style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Trang {page} / {meta.total_pages} ({meta.total_items} đơn hàng)
              </span>
              <div className="flex-row-end" style={{ gap: "8px" }}>
                <button className="btn btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "6px 12px", fontSize: "0.85rem" }}>Trước</button>
                <button className="btn btn-secondary" onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))} disabled={page === meta.total_pages} style={{ padding: "6px 12px", fontSize: "0.85rem" }}>Sau</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
