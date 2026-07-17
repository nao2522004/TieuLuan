import type { ShiftDetail } from "../types";

interface ShiftPrintViewProps {
  shift: ShiftDetail;
}

const methodLabel: Record<string, string> = {
  cash: "Tiền mặt",
  card: "Thẻ",
  transfer: "Chuyển khoản",
};

export function ShiftPrintView({ shift }: ShiftPrintViewProps) {
  return (
    <div
      id="print-receipt"
      className="print-receipt-hidden"
      style={{
        fontFamily: "monospace",
        width: "300px",
        color: "#000",
        background: "#fff",
        padding: "12px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
          BIÊN BẢN ĐỐI SOÁT CA
        </div>
        <div style={{ fontSize: "0.85rem" }}>
          {shift.branch_name ?? `Chi nhánh #${shift.branch_id}`}
        </div>
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      <div style={{ fontSize: "0.85rem" }}>
        <div>Mã ca: #{shift.id}</div>
        <div>Trưởng ca: {shift.user_full_name ?? `#${shift.user_id}`}</div>
        <div>Mở ca: {new Date(shift.opened_at).toLocaleString("vi-VN")}</div>
        <div>
          Đóng ca:{" "}
          {shift.closed_at
            ? new Date(shift.closed_at).toLocaleString("vi-VN")
            : "Chưa đóng"}
        </div>
        {shift.cashiers && shift.cashiers.length > 0 && (
          <div>
            Thu ngân: {shift.cashiers.map((c) => c.full_name).join(", ")}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      <div style={{ fontSize: "0.85rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Quỹ đầu ca:</span>
          <span>{shift.opening_cash.toLocaleString("vi-VN")} đ</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Tiền mặt bán được:</span>
          <span>{shift.cash_orders_total.toLocaleString("vi-VN")} đ</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Thẻ:</span>
          <span>{shift.card_orders_total.toLocaleString("vi-VN")} đ</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Chuyển khoản:</span>
          <span>{shift.transfer_orders_total.toLocaleString("vi-VN")} đ</span>
        </div>
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      <div style={{ fontSize: "0.85rem" }}>
        {shift.expected_cash != null && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Quỹ dự kiến:</span>
            <span>{shift.expected_cash.toLocaleString("vi-VN")} đ</span>
          </div>
        )}
        {shift.closing_cash != null && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Quỹ đếm thực tế:</span>
            <span>{shift.closing_cash.toLocaleString("vi-VN")} đ</span>
          </div>
        )}
        {shift.cash_difference != null && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            <span>Chênh lệch:</span>
            <span>
              {shift.cash_difference > 0 ? "+" : ""}
              {shift.cash_difference.toLocaleString("vi-VN")} đ
            </span>
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      <div style={{ fontSize: "0.8rem" }}>
        <div style={{ marginBottom: 4 }}>
          Danh sách đơn ({shift.orders.length} đơn):
        </div>
        {shift.orders.map((o) => (
          <div
            key={o.id}
            style={{ display: "flex", justifyContent: "space-between" }}
          >
            <span>
              #{o.id} ({methodLabel[o.payment_method] ?? o.payment_method})
            </span>
            <span>{o.total_amount.toLocaleString("vi-VN")} đ</span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 24,
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.8rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div>Người bàn giao</div>
          <div style={{ marginTop: 32 }}>____________</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div>Người nhận</div>
          <div style={{ marginTop: 32 }}>____________</div>
        </div>
      </div>
    </div>
  );
}
