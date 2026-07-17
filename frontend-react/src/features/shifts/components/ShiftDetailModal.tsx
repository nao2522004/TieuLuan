import { useState } from "react";
import { useShiftDetailQuery } from "../api/shifts.queries";
import { Modal, ModalTitleBar } from "@/components/Modal";
import { useAuth } from "@/features/auth";
import { CloseShiftModal } from "./ShiftModals";
import { ShiftPrintView } from "./ShiftPrintView";

interface ShiftDetailModalProps {
  shiftId: number;
  onClose: () => void;
}

const methodLabel: Record<string, string> = {
  cash: "Tiền mặt",
  card: "Thẻ",
  transfer: "Chuyển khoản (ZaloPay)",
};

const ORDERS_PER_PAGE = 10;

export function ShiftDetailModal({ shiftId, onClose }: ShiftDetailModalProps) {
  const { data: shift, isLoading } = useShiftDetailQuery(shiftId);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);

  const canClose =
    !!shift && !shift.closed_at && (isAdmin || shift.user_id === user?.id);

  const handlePrint = () => {
    window.print();
  };

  const totalOrders = shift?.orders.length ?? 0;
  const totalOrdersPages = Math.max(
    1,
    Math.ceil(totalOrders / ORDERS_PER_PAGE),
  );
  const pagedOrders =
    shift?.orders.slice(
      (ordersPage - 1) * ORDERS_PER_PAGE,
      ordersPage * ORDERS_PER_PAGE,
    ) ?? [];

  return (
    <Modal onClose={onClose} maxWidth={640}>
      <ModalTitleBar
        title={`📋 Chi tiết ca làm việc #${shiftId}`}
        onClose={onClose}
      />
      <div className="modal-content">
        {isLoading || !shift ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px",
              color: "var(--text-muted)",
            }}
          >
            Đang tải...
          </div>
        ) : (
          <>
            <div
              className="grid-cols-2"
              style={{ gap: "12px", marginBottom: 16 }}
            >
              <div>
                <span style={{ color: "var(--text-secondary)" }}>
                  Chi nhánh
                </span>
                <div style={{ fontWeight: 700 }}>
                  {shift.branch_name ?? `#${shift.branch_id}`}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>
                  Nhân viên
                </span>
                <div style={{ fontWeight: 700 }}>
                  {shift.user_full_name ?? `#${shift.user_id}`}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>Mở ca</span>
                <div>{new Date(shift.opened_at).toLocaleString("vi-VN")}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>Đóng ca</span>
                <div>
                  {shift.closed_at
                    ? new Date(shift.closed_at).toLocaleString("vi-VN")
                    : "Đang mở"}
                </div>
              </div>
            </div>

            <div
              className="grid-cols-2"
              style={{ gap: "12px", marginBottom: 16 }}
            >
              <div>
                <span style={{ color: "var(--text-secondary)" }}>
                  Chi nhánh
                </span>
                <div style={{ fontWeight: 700 }}>
                  {shift.branch_name ?? `#${shift.branch_id}`}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>
                  Nhân viên
                </span>
                <div style={{ fontWeight: 700 }}>
                  {shift.user_full_name ?? `#${shift.user_id}`}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>Mở ca</span>
                <div>{new Date(shift.opened_at).toLocaleString("vi-VN")}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>Đóng ca</span>
                <div>
                  {shift.closed_at
                    ? new Date(shift.closed_at).toLocaleString("vi-VN")
                    : "Đang mở"}
                </div>
              </div>
            </div>

            {shift.cashiers && shift.cashiers.length > 0 && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(99,102,241,0.05)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                    marginBottom: 8,
                  }}
                >
                  👥 Thu ngân làm việc trong ca ({shift.cashiers.length} người)
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {shift.cashiers.map((c) => (
                    <span
                      key={c.id}
                      style={{
                        padding: "2px 10px",
                        borderRadius: 9999,
                        fontSize: "0.8rem",
                        background: "rgba(99,102,241,0.15)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {c.full_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                padding: 14,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 8,
                border: "1px solid var(--border-color)",
                marginBottom: 16,
              }}
            >
              <div className="flex-row-between">
                <span>Quỹ đầu ca</span>
                <strong>{shift.opening_cash.toLocaleString("vi-VN")} đ</strong>
              </div>
              {shift.closing_cash != null && (
                <div className="flex-row-between" style={{ marginTop: 8 }}>
                  <span>Quỹ đếm thực tế</span>
                  <strong>
                    {shift.closing_cash.toLocaleString("vi-VN")} đ
                  </strong>
                </div>
              )}
              {shift.expected_cash != null && (
                <div className="flex-row-between" style={{ marginTop: 8 }}>
                  <span>Quỹ dự kiến (đầu ca + tiền mặt bán được)</span>
                  <strong>
                    {shift.expected_cash.toLocaleString("vi-VN")} đ
                  </strong>
                </div>
              )}
              {shift.cash_difference != null && (
                <div className="flex-row-between" style={{ marginTop: 8 }}>
                  <span>Chênh lệch</span>
                  <strong
                    style={{
                      color:
                        shift.cash_difference === 0
                          ? "var(--success)"
                          : shift.cash_difference > 0
                            ? "var(--primary)"
                            : "var(--danger)",
                    }}
                  >
                    {shift.cash_difference > 0 ? "+" : ""}
                    {shift.cash_difference.toLocaleString("vi-VN")} đ
                  </strong>
                </div>
              )}
            </div>

            <h4
              style={{
                margin: "0 0 8px",
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
              }}
            >
              Doanh thu theo phương thức thanh toán ({shift.orders_count} đơn
              hoàn thành)
            </h4>
            <div className="grid-cols-3" style={{ gap: 10, marginBottom: 16 }}>
              <div className="card" style={{ padding: 12 }}>
                <div
                  style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                >
                  Tiền mặt
                </div>
                <div style={{ fontWeight: 700 }}>
                  {shift.cash_orders_total.toLocaleString("vi-VN")} đ
                </div>
              </div>
              <div className="card" style={{ padding: 12 }}>
                <div
                  style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                >
                  Thẻ
                </div>
                <div style={{ fontWeight: 700 }}>
                  {shift.card_orders_total.toLocaleString("vi-VN")} đ
                </div>
              </div>
              <div className="card" style={{ padding: 12 }}>
                <div
                  style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                >
                  Chuyển khoản
                </div>
                <div style={{ fontWeight: 700 }}>
                  {shift.transfer_orders_total.toLocaleString("vi-VN")} đ
                </div>
              </div>
            </div>

            <div
              className="table-container"
              style={{ maxHeight: 280, overflowY: "auto" }}
            >
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Đơn</th>
                    <th>Nhân viên bán</th>
                    <th>PT thanh toán</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: "right" }}>Tổng tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {totalOrders === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          textAlign: "center",
                          color: "var(--text-muted)",
                        }}
                      >
                        Chưa có đơn hàng nào trong ca
                      </td>
                    </tr>
                  ) : (
                    pagedOrders.map((o) => (
                      <tr key={o.id}>
                        <td>#{o.id}</td>
                        <td>
                          <span style={{ fontSize: "0.85rem" }}>
                            {o.created_by_name ?? `#${o.created_by}`}
                          </span>
                        </td>
                        <td>
                          {methodLabel[o.payment_method] ?? o.payment_method}
                        </td>
                        <td>
                          <span
                            className={`badge ${o.status === "completed" ? "badge-success" : "badge-danger"}`}
                          >
                            {o.status === "completed" ? "Hoàn thành" : "Đã hủy"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {o.total_amount.toLocaleString("vi-VN")} đ
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalOrders > ORDERS_PER_PAGE && (
              <div
                className="flex-row-between"
                style={{ marginTop: 10, padding: "0 4px" }}
              >
                <span
                  style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
                >
                  Trang {ordersPage} / {totalOrdersPages} ({totalOrders} đơn)
                </span>
                <div className="flex-row-end" style={{ gap: 6 }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                    onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                    disabled={ordersPage === 1}
                  >
                    ‹ Trước
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                    onClick={() =>
                      setOrdersPage((p) => Math.min(totalOrdersPages, p + 1))
                    }
                    disabled={ordersPage === totalOrdersPages}
                  >
                    Sau ›
                  </button>
                </div>
              </div>
            )}

            {canClose && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 16,
                }}
              >
                <button
                  className="btn btn-secondary no-print"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onClick={handlePrint}
                >
                  <span className="material-symbols-outlined">print</span> In
                  biên bản ca
                </button>
                {canClose && (
                  <button
                    className="btn btn-danger"
                    onClick={() => setShowCloseModal(true)}
                  >
                    🔒 Đóng ca này
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {shift && <ShiftPrintView shift={shift} />}
      {showCloseModal && shift && (
        <CloseShiftModal
          shift={shift}
          onClose={() => {
            setShowCloseModal(false);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}
