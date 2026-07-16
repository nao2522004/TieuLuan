import { useShiftDetailQuery } from "../api/shifts.queries";
import { Modal, ModalTitleBar } from "@/components/Modal";

interface ShiftDetailModalProps {
  shiftId: number;
  onClose: () => void;
}

const methodLabel: Record<string, string> = {
  cash: "Tiền mặt",
  card: "Thẻ",
  transfer: "Chuyển khoản (ZaloPay)",
};

export function ShiftDetailModal({ shiftId, onClose }: ShiftDetailModalProps) {
  const { data: shift, isLoading } = useShiftDetailQuery(shiftId);

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
              <table className="table">
                <thead>
                  <tr>
                    <th>Đơn</th>
                    <th>PT thanh toán</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: "right" }}>Tổng tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {shift.orders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          textAlign: "center",
                          color: "var(--text-muted)",
                        }}
                      >
                        Chưa có đơn hàng nào trong ca
                      </td>
                    </tr>
                  ) : (
                    shift.orders.map((o) => (
                      <tr key={o.id}>
                        <td>#{o.id}</td>
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
          </>
        )}
      </div>
    </Modal>
  );
}
